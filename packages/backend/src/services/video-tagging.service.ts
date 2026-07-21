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
import { sql, eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';

// 저비용 반복 태깅 작업이므로 소형 모델을 기본값으로 사용
const TAGGING_MODEL = process.env.VIDEO_TAGGING_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 20;

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

class VideoTaggingService {
  private client: Anthropic | null = null;
  private summaryCache: { text: string; generatedAt: number } | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
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

    const prompt = `다음은 휴머노이드 로봇 기업들의 유튜브 데모 영상 목록이다. 각 영상의 제목/설명을 보고 태깅하라.

작업 유형(taskTypes)은 반드시 다음 중에서만 선택 (1~3개): ${VIDEO_TASK_TYPES.join(', ')}
기술 태그(techTags): 영상에서 드러나는 기술 키워드 0~4개 (예: 강화학습, 원격조작, End-to-End, 촉각센서, 자율주행, VLA, 파운데이션모델)
로봇 모델(robots): 언급된 로봇 모델명 0~3개 (예: Atlas, Optimus, Figure 03)

영상 목록:
${JSON.stringify(videos.map((v) => ({ id: v.id, channel: v.channel, title: v.title, description: v.description })))}

JSON 배열로만 응답하라. 다른 텍스트 없이:
[{"id":"...","taskTypes":["..."],"techTags":["..."],"robots":["..."]}]`;

    try {
      const response = await this.client.messages.create({
        model: TAGGING_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return result;
      const parsed = JSON.parse(jsonMatch[0]) as {
        id: string;
        taskTypes?: string[];
        techTags?: string[];
        robots?: string[];
      }[];
      const now = new Date().toISOString();
      for (const item of parsed) {
        if (!item.id) continue;
        const taskTypes = (item.taskTypes ?? []).filter((t) =>
          (VIDEO_TASK_TYPES as readonly string[]).includes(t)
        );
        result.set(item.id, {
          taskTypes: taskTypes.length > 0 ? taskTypes.slice(0, 3) : ['기타'],
          techTags: (item.techTags ?? []).slice(0, 4),
          robots: (item.robots ?? []).slice(0, 3),
          taggedAt: now,
          method: 'llm',
        });
      }
    } catch (err) {
      console.error('[VideoTagging] LLM batch failed:', (err as Error).message);
    }
    return result;
  }

  /** 미태깅 영상 태깅 실행 */
  async run(limit = 300): Promise<{ tagged: number; method: string }> {
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

  /** 최근 60일 영상 트렌드 한국어 요약 (6시간 캐시) */
  async getTrendSummary(): Promise<{ summary: string; generatedAt: string; source: 'llm' | 'template' | 'cache' }> {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (this.summaryCache && Date.now() - this.summaryCache.generatedAt < SIX_HOURS) {
      return {
        summary: this.summaryCache.text,
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
        taskTypes: meta.aiTags?.taskTypes ?? [],
        views: meta.views ?? null,
        publishedAt: r.publishedAt?.toISOString().slice(0, 10) ?? '',
      };
    });

    if (videos.length === 0) {
      return { summary: '최근 60일 내 수집된 데모 영상이 없습니다.', generatedAt: new Date().toISOString(), source: 'template' };
    }

    let summary: string;
    let source: 'llm' | 'template' = 'template';

    if (this.client) {
      try {
        const response = await this.client.messages.create({
          model: TAGGING_MODEL,
          max_tokens: 800,
          messages: [
            {
              role: 'user',
              content: `다음은 최근 60일간 휴머노이드 로봇 경쟁사들이 유튜브에 공개한 데모 영상 데이터다. LG 로봇 전략팀 엔지니어를 위해 시연 트렌드를 한국어 4~6문장으로 요약하라. 어떤 회사가 어떤 작업 유형의 시연에 집중하는지, 눈에 띄는 변화나 시사점이 무엇인지 중심으로. 과장 없이 데이터에 근거해서만.

${JSON.stringify(videos)}`,
            },
          ],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
          .trim();
        if (text) {
          summary = text;
          source = 'llm';
        } else {
          summary = this.templateSummary(videos);
        }
      } catch {
        summary = this.templateSummary(videos);
      }
    } else {
      summary = this.templateSummary(videos);
    }

    this.summaryCache = { text: summary, generatedAt: Date.now() };
    return { summary, generatedAt: new Date().toISOString(), source };
  }

  // ── 단위기술 축 트렌드 요약 (핸드/RFM/액추에이터) ──

  private techSummaryCache = new Map<string, { text: string; generatedAt: number }>();

  /** 단위기술/주제 축별 트렌드 요약 — 영상 + 논문(기술 축) 또는 기사(주제 축) 취합 (6시간 캐시) */
  async getTechTrendSummary(
    domain: 'hand' | 'rfm' | 'actuator' | 'expo' | 'production'
  ): Promise<{ summary: string; generatedAt: string; source: 'llm' | 'template' | 'cache' }> {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const cached = this.techSummaryCache.get(domain);
    if (cached && Date.now() - cached.generatedAt < SIX_HOURS) {
      return { summary: cached.text, generatedAt: new Date(cached.generatedAt).toISOString(), source: 'cache' };
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
      videoCond = sql`(extracted_metadata->>'domain' = 'robot' AND (title ~* ${re} OR COALESCE(extracted_metadata->>'description','') ~* ${re}))`;
    } else {
      const extraVideoCond =
        domain === 'hand'
          ? sql` OR extracted_metadata->'aiTags'->'taskTypes' ? '파지/조작'`
          : domain === 'rfm'
            ? sql` OR extracted_metadata->'aiTags'->'techTags' ?| array['VLA','파운데이션모델','강화학습','End-to-End']`
            : sql``;
      videoCond = sql`(extracted_metadata->>'domain' = ${domain}${extraVideoCond})`;
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
      return { title: r.title, channel: meta.channel ?? '', views: meta.views ?? null };
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

    let summary: string;
    let source: 'llm' | 'template' = 'template';

    if (this.client) {
      try {
        const response = await this.client.messages.create({
          model: TAGGING_MODEL,
          max_tokens: 800,
          messages: [
            {
              role: 'user',
              content: `다음은 최근 60일간 수집된 ${DOMAIN_LABEL[domain]} 분야의 영상과 ${secondLabel} 데이터다. LG 로봇 전략팀을 위해 현재 트렌드를 한국어 4~6문장으로 요약하라. ${
                domain === 'production'
                  ? '경쟁사 로봇 제품의 양산 현황 중심으로: 어느 회사가 생산라인을 구축/가동 중인지, 생산능력·램프업 목표, 출하/납품량, 가격 동향. 로봇이 남의 공장에 투입되는 것(도입 사례)은 양산이 아니므로 제외하라.'
                  : domain === 'expo'
                    ? '어떤 전시회/학회에서 어느 회사가 무엇을 시연했는지 중심으로.'
                    : '어떤 업체/랩이 활발한지, 기술적으로 어떤 방향이 부상하는지 중심으로.'
              } 과장 없이 데이터에 근거해서만.

영상 (${videos.length}건): ${JSON.stringify(videos)}
${secondLabel} 제목 (${papers.length}건): ${JSON.stringify(papers.slice(0, 40))}`,
            },
          ],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
          .trim();
        if (text) {
          summary = text;
          source = 'llm';
        } else {
          summary = this.techTemplateSummary(DOMAIN_LABEL[domain]!, videos, papers.length);
        }
      } catch {
        summary = this.techTemplateSummary(DOMAIN_LABEL[domain]!, videos, papers.length);
      }
    } else {
      summary = this.techTemplateSummary(DOMAIN_LABEL[domain]!, videos, papers.length);
    }

    this.techSummaryCache.set(domain, { text: summary, generatedAt: Date.now() });
    return { summary, generatedAt: new Date().toISOString(), source };
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
