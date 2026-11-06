/**
 * VideoTaggingService — 데모 영상 AI 태깅 및 트렌드 요약
 *
 * 합법 수집된 영상 메타데이터(제목·설명 텍스트)만 분석한다.
 * 영상 파일 다운로드/프레임 분석은 하지 않는다 (유튜브 약관 준수).
 *
 * - 태깅: 작업 유형 / 기술 키워드 / 로봇 모델을 extracted_metadata.aiTags에 저장
 * - ANTHROPIC_API_KEY 없으면 키워드 휴리스틱으로 폴백
 * - 트렌드 요약: 최근 60일 태깅 결과를 집계해 한국어 요약 생성 (6시간 캐시)
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, eq, and, desc, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, viewCache } from '../db/schema.js';
import {
  LLM_INPUT_LIMITS,
  buildUserMessage,
  fitItemsToBudget,
  sanitizeExternalText,
  type SanitizeResult,
} from './llm-input-guard.js';
import { applyRule, parseJsonStrict, sanitizeTagList } from './llm-output-guard.js';
import { composeSystemPrompt, JSON_ONLY_NOTICE, NO_URL_NOTICE } from './llm-guard-prompts.js';
import { createRejectCollector, recordInputGuard, recordOutputReject } from './llm-guard-metrics.js';
import { aiUsageService } from './ai-usage.service.js';

// 저비용 반복 태깅 작업이므로 소형 모델을 기본값으로 사용
const TAGGING_MODEL = process.env.VIDEO_TAGGING_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 20;
/** 일일 태깅 처리 상한 (스케줄러 기본 호출 한도). 데이터 커버리지 백로그 소진 예상이 같은 값을 쓴다. */
export const VIDEO_TAGGING_DAILY_LIMIT = 300;
const TAG_POINT = 'video_tagging';
const SUMMARY_POINT = 'video_trend_summary';
/** 한 요청에 들어가는 데이터 블록 직렬화 길이 상한 (초과하면 뒤쪽 항목부터 줄인다) */
const TAG_PROMPT_BUDGET = 30_000;
const SUMMARY_PROMPT_BUDGET = 30_000;
/** 트렌드 요약(전체) 캐시 키 — v5 → v6: 정제 도입 전 캐시(모델 원문 폴백 포함 가능)를 폐기한다 */
const TREND_SUMMARY_CACHE_KEY = 'video-trend-summary:v6';

// 트렌드 요약 갱신 주기 — 기본 72시간(3일). 매 방문·매일 생성할 필요가 없는 저변동 콘텐츠.
const SUMMARY_TTL_MS =
  Math.max(1, parseInt(process.env.VIDEO_SUMMARY_TTL_HOURS || '72', 10)) * 3_600_000;

export const VIDEO_TASK_TYPES = [
  '보행/이동',
  '파지/조작',
  '전신 작업',
  '공장/산업 작업',
  '가사/서비스',
  '상호작용/데모쇼',
  '제품 공개',
  '기타',
] as const;

export interface VideoAiTags {
  taskTypes: string[];
  techTags: string[];
  robots: string[];
  taggedAt: string;
  method: 'llm' | 'heuristic';
}

interface TrendingVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  views: number;
  growthRate: number;
  publishedAt: string | null;
  channel?: string;
}

interface PendingVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
}

// 휴리스틱 폴백용 키워드 매핑 (영문 제목 기준)
const HEURISTIC_RULES: { pattern: RegExp; taskType: (typeof VIDEO_TASK_TYPES)[number] }[] = [
  { pattern: /walk|run|jump|parkour|terrain|stairs|locomotion|backflip|gait/i, taskType: '보행/이동' },
  { pattern: /grasp|pick|manipulat|hand|finger|dexter|sort|grip/i, taskType: '파지/조작' },
  { pattern: /whole.?body|full.?body|loco.?manipulation/i, taskType: '전신 작업' },
  { pattern: /factory|warehouse|logistics|industrial|production|assembly|bmw|plant/i, taskType: '공장/산업 작업' },
  { pattern: /home|household|kitchen|laundry|clean|domestic|chore/i, taskType: '가사/서비스' },
  { pattern: /dance|show|expo|booth|demo day|interview|q&a|unboxing/i, taskType: '상호작용/데모쇼' },
  { pattern: /introduc|unveil|reveal|announc|launch|meet |all.?new|generation/i, taskType: '제품 공개' },
];

export interface SummaryPoint {
  title: string;
  body: string;
}

interface CachedSummary {
  text: string;
  headline?: string;
  points?: SummaryPoint[];
  generatedAt: number;
}

export class VideoTaggingService {
  private client: Anthropic | null = null;
  private summaryCache: CachedSummary | null = null;

  /** 응답을 받은 호출마다 사용량 1행을 기록한다 (실패해도 본 흐름에 영향 없음) */
  private logLlmUsage(response: { usage?: { input_tokens?: number; output_tokens?: number } }, query: string): void {
    aiUsageService
      .logUsage({
        provider: 'claude',
        model: TAGGING_MODEL,
        webSearch: false,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        query,
      })
      .catch(() => {});
  }

  /**
   * LLM으로 구조화 요약 생성 — {headline, points[]} JSON 강제, 잘린 응답도 복원.
   * 지시문은 system, 외부 텍스트는 user 의 데이터 블록에만 둔다. 모든 필드는 저장 전 정제하며,
   * 파싱 실패 시 모델 원문을 돌려주지 않고 null(템플릿 폴백)을 돌려준다.
   */
  private async generateStructured(
    system: string,
    task: string,
    payload: unknown
  ): Promise<{ text: string; headline?: string; points?: SummaryPoint[] } | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.messages.create({
        model: TAGGING_MODEL,
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: buildUserMessage(task, payload) }],
      });
      this.logLlmUsage(response, '[video-tagging] trend-summary');
      const raw = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      // 코드펜스 제거
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

      const collector = createRejectCollector(SUMMARY_POINT);
      const ctx = { systemText: system, onReject: collector.onReject };
      const cleanPoint = (title: unknown, body: unknown): SummaryPoint | null => {
        const t = applyRule(title, { type: 'text', max: 60 }, ctx, 'point.title');
        const b = applyRule(body, { type: 'text', max: 300 }, ctx, 'point.body');
        return t.ok && b.ok ? { title: t.value as string, body: b.value as string } : null;
      };
      const build = (headline: unknown, points: SummaryPoint[]) => {
        const capped = points.slice(0, 6);
        const h = headline === undefined ? null : applyRule(headline, { type: 'text', max: 200 }, ctx, 'headline');
        const headlineText = h && h.ok ? (h.value as string) : undefined;
        const text = [headlineText, ...capped.map((p) => `${p.title}: ${p.body}`)].filter(Boolean).join(' ');
        collector.flush();
        return { text, headline: headlineText, points: capped };
      };

      // 1차: 정상 JSON 파싱
      const parsed = parseJsonStrict(cleaned, 'object') as { headline?: unknown; points?: unknown } | null;
      if (parsed && Array.isArray(parsed.points)) {
        const points: SummaryPoint[] = [];
        for (const p of parsed.points as Array<{ title?: unknown; body?: unknown } | null>) {
          const cp = p && typeof p === 'object' ? cleanPoint(p.title, p.body) : null;
          if (cp) points.push(cp);
        }
        if (points.length > 0) return build(parsed.headline, points);
      }

      // 2차: 응답이 잘렸더라도 완성된 title/body 쌍만 정규식으로 복원 (복원된 항목도 같은 정제를 거친다)
      const unesc = (s: string) => {
        try { return JSON.parse(`"${s}"`) as string; } catch { return s; }
      };
      const headlineMatch = cleaned.match(/"headline"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const points: SummaryPoint[] = [];
      const pointRe = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"body"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let pm;
      while ((pm = pointRe.exec(cleaned)) !== null) {
        const cp = cleanPoint(unesc(pm[1] ?? ''), unesc(pm[2] ?? ''));
        if (cp) points.push(cp);
      }
      if (points.length >= 2) {
        return build(headlineMatch ? unesc(headlineMatch[1] ?? '') : undefined, points);
      }

      // 3차: 모델 원문은 어떤 경우에도 요약으로 쓰지 않는다 → 템플릿 폴백 유도
      collector.flush();
      recordOutputReject(SUMMARY_POINT, 'schema');
      return null;
    } catch {
      return null;
    }
  }

  // ── 요약 영속 캐시 (view_cache) — 서버 재시작에도 유지 ──

  private async loadPersistedSummary(key: string): Promise<CachedSummary | null> {
    try {
      const [row] = await db.select().from(viewCache).where(eq(viewCache.viewName, key)).limit(1);
      const data = row?.data as { text?: string; headline?: string; points?: SummaryPoint[] } | undefined;
      if (!row || typeof data?.text !== 'string') return null;
      return {
        text: data.text,
        headline: data.headline,
        points: Array.isArray(data.points) ? data.points : undefined,
        generatedAt: row.cachedAt.getTime(),
      };
    } catch {
      return null;
    }
  }

  private async persistSummary(key: string, entry: { text: string; headline?: string; points?: SummaryPoint[] }): Promise<void> {
    try {
      await db
        .insert(viewCache)
        .values({ viewName: key, data: entry, ttlMs: SUMMARY_TTL_MS })
        .onConflictDoUpdate({
          target: viewCache.viewName,
          set: { data: entry, cachedAt: new Date(), ttlMs: SUMMARY_TTL_MS },
        });
    } catch {
      // 캐시 저장 실패는 치명적이지 않음
    }
  }

  /** deps.client: 테스트용 선택 주입. 생략하면 현재 동작(환경 설정 기반 생성) */
  constructor(deps: { client?: Anthropic | null } = {}) {
    if (deps.client !== undefined) {
      this.client = deps.client;
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /** aiTags가 없는 영상 조회 */
  private async getPending(limit: number): Promise<PendingVideo[]> {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(and(eq(articles.productType, 'video'), sql`(extracted_metadata->'aiTags') IS NULL`))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return rows.map((r) => {
      const meta = (r.extractedMetadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        title: r.title,
        description: typeof meta.description === 'string' ? meta.description.slice(0, 500) : '',
        channel: typeof meta.channel === 'string' ? meta.channel : '',
      };
    });
  }

  private heuristicTags(video: PendingVideo): VideoAiTags {
    const text = `${video.title} ${video.description}`;
    const taskTypes = HEURISTIC_RULES.filter((r) => r.pattern.test(text)).map((r) => r.taskType);
    return {
      taskTypes: taskTypes.length > 0 ? [...new Set(taskTypes)].slice(0, 3) : ['기타'],
      techTags: [],
      robots: [],
      taggedAt: new Date().toISOString(),
      method: 'heuristic',
    };
  }

  private async llmTagBatch(videos: PendingVideo[]): Promise<Map<string, VideoAiTags>> {
    const result = new Map<string, VideoAiTags>();
    if (!this.client) return result;

    // 외부 텍스트(제목·채널·설명)는 정제한 사본만 데이터 블록에 넣는다. DB 원본은 바꾸지 않는다
    const guardResults: SanitizeResult[] = [];
    const items = videos.map((v) => {
      const title = sanitizeExternalText(v.title, { maxChars: LLM_INPUT_LIMITS.title });
      const channel = sanitizeExternalText(v.channel, { maxChars: LLM_INPUT_LIMITS.channel });
      const description = sanitizeExternalText(v.description, { maxChars: LLM_INPUT_LIMITS.description });
      guardResults.push(title, channel, description);
      return { id: v.id, channel: channel.text, title: title.text, description: description.text };
    });
    recordInputGuard(TAG_POINT, guardResults);
    const fitted = fitItemsToBudget(items, TAG_PROMPT_BUDGET);
    const sentIds = new Set(fitted.items.map((v) => v.id));

    const system = composeSystemPrompt(
      `휴머노이드 로봇 기업들의 유튜브 데모 영상을 태깅한다. 사용자 메시지의 데이터 블록에 영상 목록(id, channel, title, description)이 있다. 각 영상의 제목/설명을 보고 태깅하라.

작업 유형(taskTypes)은 반드시 다음 중에서만 선택 (1~3개): ${VIDEO_TASK_TYPES.join(', ')}
기술 태그(techTags): 영상에서 드러나는 기술 키워드 0~4개 (예: 강화학습, 원격조작, End-to-End, 촉각센서, 자율주행, VLA, 파운데이션모델)
로봇 모델(robots): 언급된 로봇 모델명 0~3개 (예: Atlas, Optimus, Figure 03)
techTags 와 robots 는 짧은 이름(40자 이내)만 쓴다.

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON 배열로만 응답하라. 다른 텍스트 없이:
[{"id":"...","taskTypes":["..."],"techTags":["..."],"robots":["..."]}]`
    );

    try {
      const response = await this.client.messages.create({
        model: TAGGING_MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: buildUserMessage('video_tagging', fitted.items) }],
      });
      this.logLlmUsage(response, '[video-tagging] tag-batch');
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = parseJsonStrict(text, 'array') as Array<Record<string, unknown> | null> | null;
      if (!parsed) {
        recordOutputReject(TAG_POINT, 'schema');
        return result;
      }
      const collector = createRejectCollector(TAG_POINT);
      const now = new Date().toISOString();
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !sentIds.has(item.id)) {
          collector.onReject('schema', 'id');
          continue;
        }
        const rawTypes = Array.isArray(item.taskTypes) ? item.taskTypes : [];
        const taskTypes = rawTypes.filter((t): t is string => typeof t === 'string' && (VIDEO_TASK_TYPES as readonly string[]).includes(t));
        if (rawTypes.length > taskTypes.length) collector.onReject('enum', 'taskTypes');
        const techTags = sanitizeTagList(item.techTags, 4, LLM_INPUT_LIMITS.tag);
        const robots = sanitizeTagList(item.robots, 3, LLM_INPUT_LIMITS.tag);
        const rawTagCount = (Array.isArray(item.techTags) ? Math.min(item.techTags.length, 4) : 0) + (Array.isArray(item.robots) ? Math.min(item.robots.length, 3) : 0);
        if (rawTagCount > techTags.length + robots.length) collector.onReject('schema', 'tags');
        result.set(item.id, {
          taskTypes: taskTypes.length > 0 ? taskTypes.slice(0, 3) : ['기타'],
          techTags,
          robots,
          taggedAt: now,
          method: 'llm',
        });
      }
      collector.flush();
    } catch (err) {
      console.error('[VideoTagging] LLM batch failed:', (err as Error).message);
    }
    return result;
  }

  /** 미태깅 영상 태깅 실행 */
  async run(limit = VIDEO_TAGGING_DAILY_LIMIT): Promise<{ tagged: number; method: string }> {
    const pending = await this.getPending(limit);
    if (pending.length === 0) return { tagged: 0, method: 'none' };

    let tagged = 0;
    const method = this.client ? 'llm' : 'heuristic';

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const llmResults = this.client ? await this.llmTagBatch(batch) : new Map<string, VideoAiTags>();

      for (const video of batch) {
        const tags = llmResults.get(video.id) ?? this.heuristicTags(video);
        await db.execute(sql`
          UPDATE articles
          SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb) || ${JSON.stringify({ aiTags: tags })}::jsonb
          WHERE id = ${video.id}
        `);
        tagged++;
      }
    }

    console.log(`[VideoTagging] Tagged ${tagged} video(s) via ${method}`);
    return { tagged, method };
  }

  /** 요약 입력용: 영상 제목·채널을 정제한 사본으로 바꾸고 직렬화 예산 안으로 줄인다 */
  private sanitizeSummaryVideos<T extends { title: string; channel: unknown }>(videos: T[]): Array<Omit<T, 'title' | 'channel'> & { title: string; channel: string }> {
    const guardResults: SanitizeResult[] = [];
    const cleaned = videos.map((v) => {
      const title = sanitizeExternalText(v.title, { maxChars: LLM_INPUT_LIMITS.title });
      const channel = sanitizeExternalText(v.channel, { maxChars: LLM_INPUT_LIMITS.channel });
      guardResults.push(title, channel);
      return { ...v, title: title.text, channel: channel.text };
    });
    recordInputGuard(SUMMARY_POINT, guardResults);
    return fitItemsToBudget(cleaned, SUMMARY_PROMPT_BUDGET).items;
  }

  /** 최근 60일 영상 트렌드 한국어 요약 (기본 3일 캐시, 재시작에도 유지) */
  async getTrendSummary(): Promise<{
    summary: string;
    headline?: string;
    points?: SummaryPoint[];
    generatedAt: string;
    source: 'llm' | 'template' | 'cache';
  }> {
    const CACHE_KEY = TREND_SUMMARY_CACHE_KEY;
    if (!this.summaryCache) {
      this.summaryCache = await this.loadPersistedSummary(CACHE_KEY);
    }
    if (this.summaryCache && Date.now() - this.summaryCache.generatedAt < SUMMARY_TTL_MS) {
      return {
        summary: this.summaryCache.text,
        headline: this.summaryCache.headline,
        points: this.summaryCache.points,
        generatedAt: new Date(this.summaryCache.generatedAt).toISOString(),
        source: 'cache',
      };
    }

    const rows = await db
      .select({
        title: articles.title,
        publishedAt: articles.publishedAt,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(
        and(
          eq(articles.productType, 'video'),
          sql`published_at > now() - interval '60 days'`
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(120);

    const videos = rows.map((r) => {
      const meta = (r.extractedMetadata ?? {}) as Record<string, any>;
      return {
        title: r.title,
        channel: meta.channel ?? '',
        // 2차 입력: 저장된 태그도 enum 으로 다시 걸러서 쓴다
        taskTypes: (Array.isArray(meta.aiTags?.taskTypes) ? meta.aiTags.taskTypes : []).filter(
          (t: unknown): t is string => typeof t === 'string' && (VIDEO_TASK_TYPES as readonly string[]).includes(t)
        ),
        publishedAt: r.publishedAt?.toISOString().slice(0, 10) ?? '',
      };
    });

    if (videos.length === 0) {
      return { summary: '최근 60일 내 수집된 데모 영상이 없습니다.', generatedAt: new Date().toISOString(), source: 'template' };
    }

    const summaryInput = this.sanitizeSummaryVideos(videos);
    const generated = await this.generateStructured(
      composeSystemPrompt(
        `최근 60일간 휴머노이드 로봇 경쟁사들이 유튜브에 공개한 데모 영상 데이터(데이터 블록의 videos 배열)를 받는다. LG 로봇 전략팀 엔지니어를 위해 시연 트렌드를 한국어로 요약하라. 포인트는 오직 (1) 기술 역량의 변화(새로 가능해진 작업, 자율성·조작 수준의 진전)와 (2) 산업 적용(현장 투입, 실증, 상용 배치) 트렌드만 다뤄라. 조회수·인기·마케팅·엔터테인먼트 관련 내용은 절대 포함하지 말라. 과장 없이 데이터에 근거해서만.

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON으로만 응답하라. 다른 텍스트 없이:
{"headline":"한 문장 총평","points":[{"title":"2~6단어 소제목","body":"1~2문장 설명"}]}
points는 4~6개. 마크다운 기호(#, **) 사용 금지.`
      ),
      'video_trend_summary',
      { videos: summaryInput }
    );

    const entry = generated ?? { text: this.templateSummary(videos) };
    const source: 'llm' | 'template' = generated ? 'llm' : 'template';

    this.summaryCache = { ...entry, generatedAt: Date.now() };
    await this.persistSummary(CACHE_KEY, entry);
    return {
      summary: entry.text,
      headline: entry.headline,
      points: entry.points,
      generatedAt: new Date().toISOString(),
      source,
    };
  }

  async getTopTrendingVideos(): Promise<TrendingVideo[]> {
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        publishedAt: articles.publishedAt,
        extractedMetadata: articles.extractedMetadata,
        views: sql<number>`COALESCE((articles.extracted_metadata->>'views')::int, 0)`,
        growthScore: sql<number>`COALESCE(
          ((articles.extracted_metadata->>'views')::numeric)
          / GREATEST(EXTRACT(EPOCH FROM (now() - articles.published_at)) / 86400, 1),
        0)`,
      })
      .from(articles)
      .where(
        and(
          eq(articles.productType, 'video'),
          isNotNull(articles.publishedAt),
          sql`articles.extracted_metadata ? 'views'`,
          sql`articles.published_at > now() - interval '7 days'`
        )
      )
      .orderBy(desc(
        sql`COALESCE(
          ((articles.extracted_metadata->>'views')::numeric)
          / GREATEST(EXTRACT(EPOCH FROM (now() - articles.published_at)) / 86400, 1),
        0)`
      ))
      .limit(10);

    return rows.map((row) => {
      const meta = (row.extractedMetadata ?? {}) as Record<string, any>;
      const thumbnail =
        typeof meta.thumbnail === 'string'
          ? meta.thumbnail
          : typeof meta.videoId === 'string'
            ? `https://i.ytimg.com/vi/${meta.videoId}/mqdefault.jpg`
            : null;
      return {
        id: row.id,
        title: row.title,
        url: row.url,
        thumbnail,
        views: Number(row.views ?? 0),
        growthRate: Number(row.growthScore ?? 0),
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        channel: typeof meta.channel === 'string' ? meta.channel : undefined,
      };
    });
  }

  // ── 단위기술 축 트렌드 요약 (핸드/RFM/액추에이터) ──

  private techSummaryCache = new Map<string, CachedSummary>();

  /** 단위기술/주제 축별 트렌드 요약 — 영상 + 논문(기술 축) 또는 기사(주제 축) 취합 (6시간 캐시) */
  async getTechTrendSummary(
    domain: 'hand' | 'rfm' | 'actuator' | 'expo' | 'production'
  ): Promise<{
    summary: string;
    headline?: string;
    points?: SummaryPoint[];
    generatedAt: string;
    source: 'llm' | 'template' | 'cache';
  }> {
    const cacheKey = `video-trend-summary:v6:${domain}`;
    let cached = this.techSummaryCache.get(domain);
    if (!cached) {
      const persisted = await this.loadPersistedSummary(cacheKey);
      if (persisted) {
        this.techSummaryCache.set(domain, persisted);
        cached = persisted;
      }
    }
    if (cached && Date.now() - cached.generatedAt < SUMMARY_TTL_MS) {
      return {
        summary: cached.text,
        headline: cached.headline,
        points: cached.points,
        generatedAt: new Date(cached.generatedAt).toISOString(),
        source: 'cache',
      };
    }

    const DOMAIN_LABEL: Record<string, string> = {
      hand: '로봇 핸드',
      rfm: '로봇 파운데이션 모델',
      actuator: '액추에이터/구동계',
      expo: '전시회 로봇 시연',
      production: '양산·현장 적용',
    };
    const PAPER_REGEX: Record<string, string> = {
      hand: 'hand|gripper|finger|tactile|dexter|grasp|manipulat',
      rfm: 'foundation model|vision.language.action|vla|imitation learning|reinforcement learning|diffusion policy|world model|embodied',
      actuator: 'actuator|motor|gearbox|harmonic drive|transmission|joint torque|quasi.direct|series elastic',
    };
    const TOPIC_REGEX: Record<string, string> = {
      expo: 'ces|expo|exhibition|booth|iros|icra|hannover|world robot conference|trade show|robocup|automatica|전시회|박람회',
      // production = 로봇 "제품"의 양산 (생산라인·생산능력·출하) — 로봇의 공장 "투입"(도입)과 구분
      production:
        'mass produc|production (line|ramp|capacity|target|start)|units (per|a) (week|month|year)|annual capacity|manufacturing (facility|capacity|plant)|robofab|botq|robot factory|deliver|shipment|양산|생산능력|생산라인|출하|납품',
    };
    const isTopic = domain === 'expo' || domain === 'production';

    // 영상 조건: 기술 축은 채널 도메인, 주제 축은 완제품사 채널 한정 + 제목/설명 키워드
    let videoCond;
    if (isTopic) {
      const re = TOPIC_REGEX[domain]!;
      videoCond = sql`((extracted_metadata->>'domain' = 'robot' AND (title ~* ${re} OR COALESCE(extracted_metadata->>'description','') ~* ${re})) OR (extracted_metadata->>'topic' = ${domain} OR extracted_metadata->'topics' ? ${domain}))`;
    } else {
      const extraVideoCond =
        domain === 'hand'
          ? sql` OR extracted_metadata->'aiTags'->'taskTypes' ? '파지/조작'`
          : domain === 'rfm'
            ? sql` OR extracted_metadata->'aiTags'->'techTags' ?| array['VLA','파운데이션모델','강화학습','End-to-End']`
            : sql``;
      videoCond = sql`(extracted_metadata->>'domain' = ${domain}${extraVideoCond} OR (extracted_metadata->>'topic' = ${domain} OR extracted_metadata->'topics' ? ${domain}))`;
    }

    const videoRows = await db
      .select({ title: articles.title, extractedMetadata: articles.extractedMetadata, publishedAt: articles.publishedAt })
      .from(articles)
      .where(
        and(
          eq(articles.productType, 'video'),
          sql`published_at > now() - interval '60 days'`,
          videoCond
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(60);

    // 보조 자료: 기술 축은 arXiv 논문, 주제 축은 뉴스 기사
    const paperRows = isTopic
      ? await db
          .select({ title: articles.title, publishedAt: articles.publishedAt, collectedAt: articles.collectedAt })
          .from(articles)
          .where(
            and(
              sql`COALESCE(product_type,'') <> 'video'`,
              sql`source NOT IN ('arxiv','github','sec_edgar','patent')`,
              sql`COALESCE(published_at, collected_at) > now() - interval '60 days'`,
              sql`(title ~* ${TOPIC_REGEX[domain]} OR COALESCE(summary,'') ~* ${TOPIC_REGEX[domain]})`
            )
          )
          .orderBy(desc(articles.publishedAt))
          .limit(60)
      : await db
          .select({ title: articles.title, publishedAt: articles.publishedAt, collectedAt: articles.collectedAt })
          .from(articles)
          .where(
            and(
              eq(articles.source, 'arxiv'),
              sql`COALESCE(published_at, collected_at) > now() - interval '60 days'`,
              sql`(title ~* ${PAPER_REGEX[domain]} OR COALESCE(summary,'') ~* ${PAPER_REGEX[domain]})`
            )
          )
          .orderBy(desc(articles.collectedAt))
          .limit(60);

    const videos = videoRows.map((r) => {
      const meta = (r.extractedMetadata ?? {}) as Record<string, any>;
      return { title: r.title, channel: meta.channel ?? '' };
    });
    const papers = paperRows.map((r) => r.title);

    const secondLabel = isTopic ? '기사' : '논문';

    if (videos.length === 0 && papers.length === 0) {
      return {
        summary: `최근 60일 내 수집된 ${DOMAIN_LABEL[domain]} 관련 영상·${secondLabel}가 없습니다. 수집이 쌓이면 요약이 생성됩니다.`,
        generatedAt: new Date().toISOString(),
        source: 'template',
      };
    }

    const techVideos = this.sanitizeSummaryVideos(videos);
    const paperGuard: SanitizeResult[] = papers.slice(0, 40).map((p) => sanitizeExternalText(p, { maxChars: LLM_INPUT_LIMITS.title }));
    recordInputGuard(SUMMARY_POINT, paperGuard);
    const generated = await this.generateStructured(
      composeSystemPrompt(
        `최근 60일간 수집된 ${DOMAIN_LABEL[domain]} 분야의 영상(데이터 블록의 videos)과 ${secondLabel} 제목(데이터 블록의 titles) 데이터를 받는다. LG 로봇 전략팀을 위해 현재 트렌드를 한국어로 요약하라. ${
          domain === 'production'
            ? '경쟁사 로봇 제품의 양산 현황 중심으로: 어느 회사가 생산라인을 구축/가동 중인지, 생산능력·램프업 목표, 출하/납품량, 가격 동향. 로봇이 남의 공장에 투입되는 것(도입 사례)은 양산이 아니므로 제외하라.'
            : domain === 'expo'
              ? '어떤 전시회/학회에서 어느 회사가 무엇을 시연했는지 중심으로.'
              : '어떤 업체/랩이 활발한지, 기술적으로 어떤 방향이 부상하는지 중심으로.'
        } 포인트는 기술 역량 변화와 산업 적용 트렌드만 다루고, 조회수·인기·마케팅 관련 내용은 절대 포함하지 말라. 과장 없이 데이터에 근거해서만.

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON으로만 응답하라. 다른 텍스트 없이:
{"headline":"한 문장 총평","points":[{"title":"2~6단어 소제목","body":"1~2문장 설명"}]}
points는 4~6개. 마크다운 기호(#, **) 사용 금지.`
      ),
      'tech_trend_summary',
      {
        videoCount: videos.length,
        videos: techVideos,
        titleCount: papers.length,
        titles: paperGuard.map((r) => r.text),
      }
    );

    const entry = generated ?? { text: this.techTemplateSummary(DOMAIN_LABEL[domain]!, videos, papers.length) };
    const source: 'llm' | 'template' = generated ? 'llm' : 'template';

    this.techSummaryCache.set(domain, { ...entry, generatedAt: Date.now() });
    await this.persistSummary(cacheKey, entry);
    return {
      summary: entry.text,
      headline: entry.headline,
      points: entry.points,
      generatedAt: new Date().toISOString(),
      source,
    };
  }

  private techTemplateSummary(label: string, videos: { channel: string }[], paperCount: number): string {
    const byChannel = new Map<string, number>();
    for (const v of videos) if (v.channel) byChannel.set(v.channel, (byChannel.get(v.channel) ?? 0) + 1);
    const top = [...byChannel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return (
      `최근 60일간 ${label} 분야에서 데모 영상 ${videos.length}건, 관련 논문 ${paperCount}편이 수집되었습니다.` +
      (top.length > 0 ? ` 활발한 채널: ${top.map(([c, n]) => `${c}(${n}건)`).join(', ')}.` : '')
    );
  }

  private templateSummary(videos: { channel: string; taskTypes: string[] }[]): string {
    const byChannel = new Map<string, number>();
    const byTask = new Map<string, number>();
    for (const v of videos) {
      if (v.channel) byChannel.set(v.channel, (byChannel.get(v.channel) ?? 0) + 1);
      for (const t of v.taskTypes) byTask.set(t, (byTask.get(t) ?? 0) + 1);
    }
    const topChannels = [...byChannel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topTasks = [...byTask.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return (
      `최근 60일간 ${videos.length}건의 데모 영상이 수집되었습니다. ` +
      `가장 활발한 채널은 ${topChannels.map(([c, n]) => `${c}(${n}건)`).join(', ')}입니다.` +
      (topTasks.length > 0
        ? ` 시연 작업 유형은 ${topTasks.map(([t, n]) => `${t}(${n}건)`).join(', ')} 순으로 많았습니다.`
        : ' (AI 태깅이 완료되면 작업 유형 분석이 추가됩니다.)')
    );
  }
}

export const videoTaggingService = new VideoTaggingService();
