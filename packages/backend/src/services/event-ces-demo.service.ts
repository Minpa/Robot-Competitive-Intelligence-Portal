/**
 * EventCesDemoService — CES 부스 시연 전환 가능성 분석 (Gemini)
 *
 * 이벤트 특집 영상 브리프(eventBrief_<key>)가 이미 생성된 영상 중 시연·상호작용 성격이
 * 강한 영상을 후보로 골라, "이 영상 속 시연을 CES 부스에서 재현한다면"이라는 관점으로
 * Gemini 비디오 이해를 돌려 텔레오퍼레이션 여부/관람객 참여 가능성/난이도/재미 요소/
 * 데모 아이디어를 뽑아 extracted_metadata.cesDemo_<key>에 저장한다.
 *
 * 안전 원칙 (event-video-brief.service.ts와 동일):
 *  - 영상 파일/프레임 다운로드·저장 금지. 공개 YouTube watch URL만 전달.
 *  - 자막 전문·장문 전사 저장 금지. 파생 요약만 길이 캡 강제.
 *  - GEMINI_API_KEY 없으면 no-op. 429 쿼터는 재시도 카운트 미증가 + 배치 조기 중단.
 */

import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { sql, and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, viewCache } from '../db/schema.js';
import { aiUsageService } from './ai-usage.service.js';
import { getEventConfig, decodeHtmlEntities, parseTechInsight, type EventConfig } from './event-video-brief.service.js';

const MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-flash-latest';
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_MAX_ATTEMPTS || '2', 10));
const HAIKU_MODEL = process.env.EVENT_TREND_MODEL || 'claude-haiku-4-5-20251001';
const INSIGHT_TTL_MS = 12 * 3_600_000; // 12시간
const DEFAULT_BATCH_LIMIT = 20;

/** event-video-brief.service.ts와 동일 정규식 — 순환 의존 방지를 위해 복제 */
const YOUTUBE_WATCH_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i;

export interface CesDemoAnalysis {
  teleop: boolean; // 원격 조종(텔레오퍼레이션) 방식 시연 여부
  audience: boolean; // 관람객 직접 참여·체험 가능 여부
  difficulty: number; // CES 부스 재현 난이도 1~5 (5가 가장 어려움)
  publicFriendly: number; // 일반 관람객 이해도 1~5 (5가 가장 쉬움)
  funFactor: number; // 관람객 재미·임팩트 1~5 (5가 가장 재미있음)
  demoIdea: string; // CES 부스 시연 각색 제안, ≤160자
  analyzedAt: string;
  model: string;
}

/** CES 데모 인사이트 (Haiku 요약, 웹 검색 없음) */
export interface CesInsight {
  points: string[]; // ≤3개, 각 ≤220자
  generatedAt: string;
  model: string;
}

/** GET /event-videos/:eventKey/ces-demo 응답용 영상 DTO */
export interface CesDemoVideo {
  id: string;
  title: string;
  titleKo: string | null;
  url: string;
  thumbnail: string | null;
  cesDemo: CesDemoAnalysis;
}

interface CesDemoCandidateInput {
  brief: { techKeywords?: string[] | null; demoContents?: string[] | null } | null;
  taskTypes?: string[] | null;
}

/** 후보 판정 시 taskTypes[0]만으로 즉시 후보 처리하는 카테고리 */
const CANDIDATE_TASK_TYPES = new Set(['상호작용/데모쇼', '가사/서비스', '파지/조작', '전신 작업']);
/** taskType으로 판정 안 되면 브리프의 techKeywords+demoContents에서 이 키워드로 재판정 */
const CANDIDATE_KEYWORD_RE = /텔레오퍼|원격|조종|관람|체험|인터랙/;

/** CES 데모 분석 후보 여부 — 브리프 없으면 false, taskTypes[0]이 후보 카테고리면 true, 아니면 키워드 매칭 */
export function isCesDemoCandidate(video: CesDemoCandidateInput): boolean {
  if (!video.brief) return false;
  const taskType = video.taskTypes?.[0];
  if (taskType && CANDIDATE_TASK_TYPES.has(taskType)) return true;
  const text = [...(video.brief.techKeywords ?? []), ...(video.brief.demoContents ?? [])].join(' ');
  return CANDIDATE_KEYWORD_RE.test(text);
}

/** 1~5 정수로 반올림·클램프. 숫자로 해석 불가하면 null */
function clampScore(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** boolean 강제 변환. boolean/문자열("true"/"false") 모두 허용, 누락·해석불가는 false */
function coerceBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true';
  return false;
}

/**
 * Gemini 응답에서 {teleop, audience, difficulty, publicFriendly, funFactor, demoIdea} CES 데모 분석 JSON 파싱
 * (주변 텍스트 포함 응답도 복원). difficulty/publicFriendly/funFactor 중 하나라도 해석 불가하면 전체 null.
 */
export function parseCesDemo(text: string, model: string): CesDemoAnalysis | null {
  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  let parsed = tryParse(text.trim());
  if (!parsed) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParse(m[0]);
  }
  if (!parsed) return null;

  const difficulty = clampScore(parsed.difficulty);
  const publicFriendly = clampScore(parsed.publicFriendly);
  const funFactor = clampScore(parsed.funFactor);
  if (difficulty === null || publicFriendly === null || funFactor === null) return null;

  const demoIdea = typeof parsed.demoIdea === 'string' ? parsed.demoIdea.trim().slice(0, 160) : '';

  return {
    teleop: coerceBool(parsed.teleop),
    audience: coerceBool(parsed.audience),
    difficulty,
    publicFriendly,
    funFactor,
    demoIdea,
    analyzedAt: new Date().toISOString(),
    model,
  };
}

/** (publicFriendly+funFactor) 합 desc, 동률이면 difficulty asc(재현 쉬운 것 우선) */
export function sortCesDemoVideos<T extends { cesDemo: CesDemoAnalysis }>(videos: T[]): T[] {
  return [...videos].sort((a, b) => {
    const sumA = a.cesDemo.publicFriendly + a.cesDemo.funFactor;
    const sumB = b.cesDemo.publicFriendly + b.cesDemo.funFactor;
    if (sumB !== sumA) return sumB - sumA;
    return a.cesDemo.difficulty - b.cesDemo.difficulty;
  });
}

function capStrings(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.slice(0, maxLen))
    .slice(0, maxItems);
}

function buildCesDemoPrompt(): string {
  return `이 영상은 로봇 전시회 시연 영상이다. 이 영상 속 시연을 우리 회사의 CES 전시 부스에서 재현한다고 가정하고, 부스 시연 적합성 관점에서 아래 JSON 스키마로만 응답하라.
영상에서 실제로 보이거나 들리는 것에만 근거하고 추측·과장은 금지한다.

스키마:
{
  "teleop": true/false — 원격 조종(텔레오퍼레이션) 방식의 시연인지,
  "audience": true/false — 관람객이 직접 참여·체험할 수 있는 시연인지,
  "difficulty": 1~5 정수 — CES 부스에서 이 시연을 그대로 재현하는 난이도(운영 준비·리스크 포함, 5가 가장 어려움),
  "publicFriendly": 1~5 정수 — 일반 관람객이 보고 이해하기 쉬운 정도(5가 가장 쉬움),
  "funFactor": 1~5 정수 — 관람객에게 주는 재미·임팩트(5가 가장 재미있음),
  "demoIdea": "이 영상을 CES 부스 시연으로 각색한다면 어떤 형태가 좋을지 한 문장 제안 (160자 이내 한국어)"
}
teleop·audience·difficulty·publicFriendly·funFactor 다섯 값은 영상 내용에 근거해 최선의 판단으로 반드시 채운다. demoIdea에 적절한 제안이 없으면 빈 문자열로 응답하라. JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;
}

function buildCesInsightPrompt(event: EventConfig, videos: CesDemoVideo[]): string {
  const summary = videos.slice(0, 30).map((v) => ({
    title: v.title,
    teleop: v.cesDemo.teleop,
    audience: v.cesDemo.audience,
    difficulty: v.cesDemo.difficulty,
    publicFriendly: v.cesDemo.publicFriendly,
    funFactor: v.cesDemo.funFactor,
    demoIdea: v.cesDemo.demoIdea,
  }));
  return `다음은 '${event.label}' 전시 영상 중 CES 부스 시연 관점으로 분석한 ${videos.length}건의 결과다. 다음 세 가지를 종합해 인사이트를 작성하라.
① 텔레오퍼레이션(원격 조종) 방식 시연이 어떻게 구성되어 있는지.
② 관람객이 참여할 수 있는 체험형 시연 포맷은 어떤 형태인지.
③ 이 시연들을 CES 부스에서 재현할 때 난이도·운영 리스크 측면에서 유의할 점.

분석 데이터: ${JSON.stringify(summary)}

작성 규칙:
- 공개 정보의 파생 요약만 작성한다. 원문 장문 복사 금지.
- 확인되지 않는 내용은 추측하지 않는다.
- 임원 보고 톤의 한국어로 작성한다.
- JSON 객체만 응답하고 다른 텍스트는 포함하지 않는다.

응답 JSON 스키마:
{"points": ["인사이트 문장, 최대 3개, 각 220자 이내, 한국어"], "sources": []}`;
}

interface PendingCesDemoVideo {
  id: string;
  title: string;
  url: string;
}

class EventCesDemoService {
  private client: GoogleGenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  /** 이벤트별 CES 데모 배치 in-flight 가드 (버튼 연타 시 동일 영상 중복 분석 방지) */
  private runningCesDemoBatches = new Set<string>();

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /** event-video-brief.service.ts의 matchConditions와 동일 로직 — 무변경 원칙으로 인해 새 파일에 복제 */
  private matchConditions(event: EventConfig) {
    return [
      sql`product_type = 'video'`,
      sql`published_at >= ${event.since}::date`,
      sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern} OR extracted_metadata->>'event' = ${event.key})`,
    ];
  }

  /** CES 데모 분석 대상 영상 조회 — 브리프 존재 + 미분석 + 시도 횟수 미만인 영상 중 후보만 필터 */
  private async getPendingCesDemo(event: EventConfig): Promise<PendingCesDemoVideo[]> {
    const briefKey = `eventBrief_${event.key}`;
    const cesDemoKey = `cesDemo_${event.key}`;
    const attemptsKey = `cesDemoAttempts_${event.key}`;

    const rows = await db
      .select({ id: articles.id, title: articles.title, url: articles.url, meta: articles.extractedMetadata })
      .from(articles)
      .where(
        and(
          ...this.matchConditions(event),
          sql`(extracted_metadata->${briefKey}) IS NOT NULL`,
          sql`(extracted_metadata->${cesDemoKey}) IS NULL`,
          sql`COALESCE((extracted_metadata->>${attemptsKey})::int, 0) < ${MAX_ATTEMPTS}`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(100);

    const candidates: PendingCesDemoVideo[] = [];
    for (const r of rows) {
      if (!YOUTUBE_WATCH_URL_RE.test(r.url)) continue;
      // listEventVideos와 동일한 방식으로 extracted_metadata에서 taskTypes/brief 필드를 매핑해 후보 판정에 사용
      const meta = (r.meta ?? {}) as Record<string, any>;
      const rawBrief = meta[briefKey];
      const brief =
        rawBrief && typeof rawBrief === 'object'
          ? {
              techKeywords: capStrings((rawBrief as any).techKeywords, 8, 24),
              demoContents: capStrings((rawBrief as any).demoContents, 3, 160),
            }
          : null;
      const rawTaskTypes = meta.aiTags?.taskTypes;
      const taskTypes = Array.isArray(rawTaskTypes)
        ? (rawTaskTypes as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 3)
        : [];
      if (isCesDemoCandidate({ brief, taskTypes })) {
        candidates.push({ id: r.id, title: r.title, url: r.url });
      }
    }
    return candidates;
  }

  /** 단일 영상 CES 데모 분석 — 실패 null, 쿼터 소진 'quota' */
  private async analyzeOne(video: PendingCesDemoVideo): Promise<CesDemoAnalysis | 'quota' | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ fileData: { fileUri: video.url, mimeType: 'video/*' } }, { text: buildCesDemoPrompt() }],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      const usage = response.usageMetadata;
      aiUsageService
        .logUsage({
          provider: 'gemini',
          model: MODEL,
          webSearch: false,
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          query: `[ces-demo] ${video.title.slice(0, 80)}`,
        })
        .catch(() => {});
      const text = response.text;
      if (!text) return null;
      return parseCesDemo(text, MODEL);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        // 어떤 쿼터(FreeTier/PaidTier 등)에 걸렸는지 원문 일부를 남겨 결제 적용 여부 진단
        console.warn(`[CesDemo] quota exhausted (429) — batch will stop early. detail: ${msg.slice(0, 500)}`);
        return 'quota';
      }
      console.error(`[CesDemo] analyzeOne failed for ${video.id}:`, msg);
      return null;
    }
  }

  private async saveCesDemo(eventKey: string, articleId: string, analysis: CesDemoAnalysis): Promise<void> {
    const cesDemoKey = `cesDemo_${eventKey}`;
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(${cesDemoKey}::text, ${JSON.stringify(analysis)}::jsonb)
      WHERE id = ${articleId}
    `);
  }

  private async bumpAttempts(eventKey: string, articleId: string): Promise<void> {
    const attemptsKey = `cesDemoAttempts_${eventKey}`;
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(
          ${attemptsKey}::text,
          COALESCE((extracted_metadata->>${attemptsKey})::int, 0) + 1
        )
      WHERE id = ${articleId}
    `);
  }

  /** 배치 실행 — 동일 이벤트 배치가 이미 진행 중이면 중복 실행하지 않는다 */
  async run(
    eventKey = 'wrc2026',
    limit = DEFAULT_BATCH_LIMIT
  ): Promise<{ analyzed: number; failed: number; skipped: number; candidateTotal: number; alreadyRunning?: boolean }> {
    const res = { analyzed: 0, failed: 0, skipped: 0, candidateTotal: 0 };

    if (this.runningCesDemoBatches.has(eventKey)) {
      console.warn(`[CesDemo] ${eventKey}: batch already running — duplicate request ignored`);
      return { ...res, alreadyRunning: true };
    }
    this.runningCesDemoBatches.add(eventKey);
    try {
      if (!this.client) return res;
      const event = getEventConfig(eventKey);
      if (!event) return res;

      const pending = await this.getPendingCesDemo(event);
      res.candidateTotal = pending.length;
      if (pending.length === 0) return res;

      const targets = pending.slice(0, limit);
      let quotaHit = false;
      for (const video of targets) {
        if (quotaHit) break;
        const analysis = await this.analyzeOne(video);
        if (analysis === 'quota') {
          quotaHit = true;
          res.skipped++;
          continue;
        }
        if (analysis) {
          await this.saveCesDemo(event.key, video.id, analysis);
          res.analyzed++;
        } else {
          await this.bumpAttempts(event.key, video.id);
          res.failed++;
        }
      }

      console.log(`[CesDemo] ${event.key}: analyzed ${res.analyzed}, failed ${res.failed}, skipped ${res.skipped}`);
      if (res.analyzed > 0) await this.invalidateCesInsightCache(eventKey);
      return res;
    } finally {
      this.runningCesDemoBatches.delete(eventKey);
    }
  }

  /** 새 CES 데모 분석 반영 시 인사이트 캐시 무효화 — 다음 조회 때 즉시 재생성 */
  private async invalidateCesInsightCache(eventKey: string) {
    try {
      await db.delete(viewCache).where(eq(viewCache.viewName, `event-ces-insight-${eventKey}`));
    } catch (err) {
      console.error('[CesDemo] insight cache invalidation failed:', (err as Error).message);
    }
  }

  /** CES 데모 분석 완료된 영상 목록 (점수 desc 정렬) */
  private async listAnalyzedCesDemo(event: EventConfig): Promise<CesDemoVideo[]> {
    const cesDemoKey = `cesDemo_${event.key}`;
    const rows = await db
      .select({ id: articles.id, title: articles.title, url: articles.url, meta: articles.extractedMetadata })
      .from(articles)
      .where(and(...this.matchConditions(event), sql`(extracted_metadata->${cesDemoKey}) IS NOT NULL`))
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(100);

    const videos: CesDemoVideo[] = rows.map((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const videoId = typeof meta.videoId === 'string' ? meta.videoId : null;
      const raw = (meta[cesDemoKey] ?? {}) as Record<string, any>;
      const cesDemo: CesDemoAnalysis = {
        teleop: raw.teleop === true,
        audience: raw.audience === true,
        difficulty: typeof raw.difficulty === 'number' ? raw.difficulty : 1,
        publicFriendly: typeof raw.publicFriendly === 'number' ? raw.publicFriendly : 1,
        funFactor: typeof raw.funFactor === 'number' ? raw.funFactor : 1,
        demoIdea: typeof raw.demoIdea === 'string' ? raw.demoIdea.slice(0, 160) : '',
        analyzedAt: typeof raw.analyzedAt === 'string' ? raw.analyzedAt : new Date().toISOString(),
        model: typeof raw.model === 'string' ? raw.model : MODEL,
      };
      return {
        id: r.id,
        title: decodeHtmlEntities(r.title),
        titleKo: typeof meta.titleKo === 'string' ? meta.titleKo : null,
        url: r.url,
        // listEventVideos의 썸네일 폴백 로직과 동일 — 순환 의존 방지를 위해 복제
        thumbnail:
          typeof meta.thumbnail === 'string'
            ? meta.thumbnail
            : videoId
              ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              : null,
        cesDemo,
      };
    });

    return sortCesDemoVideos(videos);
  }

  /** CES 데모 분석 결과에 대한 인사이트 (텔레오퍼 구성/관람객 참여 포맷/난이도·운영 리스크, 웹 검색 없음, 12시간 캐시) */
  async getCesInsight(eventKey: string): Promise<CesInsight | null> {
    const event = getEventConfig(eventKey);
    if (!event) return null;

    const cacheKey = `event-ces-insight-${eventKey}`;
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, cacheKey)).limit(1);
      if (cached && Date.now() - cached.cachedAt.getTime() < INSIGHT_TTL_MS) {
        return cached.data as unknown as CesInsight;
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재생성 진행
    }

    if (!this.anthropicClient) return null;

    try {
      const videos = await this.listAnalyzedCesDemo(event);
      if (videos.length === 0) return null;

      const response = await this.anthropicClient.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: buildCesInsightPrompt(event, videos) }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      const parsed = parseTechInsight(text);
      if (!parsed) return null;

      aiUsageService
        .logUsage({
          provider: 'claude',
          model: HAIKU_MODEL,
          webSearch: false,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[ces-insight] ${eventKey}`,
        })
        .catch(() => {});

      const insight: CesInsight = {
        points: parsed.points,
        generatedAt: new Date().toISOString(),
        model: HAIKU_MODEL,
      };

      try {
        await db
          .insert(viewCache)
          .values({ viewName: cacheKey, data: insight, ttlMs: INSIGHT_TTL_MS })
          .onConflictDoUpdate({
            target: viewCache.viewName,
            set: { data: insight, cachedAt: new Date(), ttlMs: INSIGHT_TTL_MS },
          });
      } catch {
        // 캐시 저장 실패는 치명적이지 않음
      }

      return insight;
    } catch (err) {
      console.error('[CesDemo] getCesInsight failed:', (err as Error).message);
      return null;
    }
  }

  /** CES 데모 패널 조회용 종합 뷰 — 영상 목록 + 인사이트 + 분석 대상 후보 수 */
  async getCesDemoView(eventKey: string): Promise<{ videos: CesDemoVideo[]; insight: CesInsight | null; candidateTotal: number }> {
    const event = getEventConfig(eventKey);
    if (!event) return { videos: [], insight: null, candidateTotal: 0 };

    const [videos, insight, pending] = await Promise.all([
      this.listAnalyzedCesDemo(event),
      this.getCesInsight(eventKey),
      this.getPendingCesDemo(event),
    ]);

    return { videos, insight, candidateTotal: pending.length };
  }
}

export const eventCesDemoService = new EventCesDemoService();
