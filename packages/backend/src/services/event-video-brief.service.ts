/**
 * EventVideoBriefService — 전시회/이벤트 특집 영상 브리프 (Gemini)
 *
 * 수집된 영상 중 특정 이벤트(예: WRC 2026) 관련 영상을 키워드로 선별하고,
 * Gemini 비디오 이해로 "주요 제품 / 시연 내용 / 기술 관점 시사점" 브리프를 생성해
 * extracted_metadata.eventBrief_<key>에 저장한다.
 *
 * 안전 원칙 (video-content-analysis와 동일):
 *  - 영상 파일/프레임 다운로드·저장 금지. 공개 YouTube watch URL만 전달.
 *  - 자막 전문·장문 전사 저장 금지. 파생 요약만 길이 캡 강제.
 *  - GEMINI_API_KEY 없으면 no-op. 429 쿼터는 재시도 카운트 미증가 + 배치 조기 중단.
 */

import { GoogleGenAI } from '@google/genai';
import { sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';

const MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-flash-latest';
const BATCH_LIMIT = Math.max(1, parseInt(process.env.GEMINI_EVENT_BRIEF_BATCH_LIMIT || '10', 10));
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_MAX_ATTEMPTS || '2', 10));

const YOUTUBE_WATCH_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i;

export interface EventConfig {
  key: string;        // 저장 키 (extracted_metadata.eventBrief_<key>)
  label: string;      // 표시명
  pattern: string;    // Postgres ~* 정규식 (제목/설명 매칭)
  since: string;      // 이 날짜 이후 게시 영상만 (YYYY-MM-DD)
}

export const EVENTS: EventConfig[] = [
  {
    key: 'wrc2026',
    label: 'WRC 2026 (World Robot Conference)',
    pattern: '\\mwrc\\M|world robot conference|世界机器人大会|세계 ?로봇 ?(대회|콘퍼런스)',
    since: '2026-07-01',
  },
];

export function getEventConfig(key: string): EventConfig | null {
  return EVENTS.find((e) => e.key === key) ?? null;
}

export interface EventVideoBrief {
  mainProducts: string[];  // 주요 제품 ≤3개, 각 ≤120자
  demoContents: string[];  // 시연 내용 ≤3개, 각 ≤120자
  insights: string[];      // 기술 관점 시사점 ≤3개, 각 ≤120자
  briefedAt: string;
  model: string;
}

function capList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.slice(0, maxLen))
    .slice(0, maxItems);
}

export function parseEventBrief(text: string, model: string): EventVideoBrief | null {
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

  const brief: EventVideoBrief = {
    mainProducts: capList(parsed.mainProducts, 3, 120),
    demoContents: capList(parsed.demoContents, 3, 120),
    insights: capList(parsed.insights, 3, 120),
    briefedAt: new Date().toISOString(),
    model,
  };
  // 세 섹션 모두 비어 있으면 실패로 간주 (재시도 대상)
  if (brief.mainProducts.length + brief.demoContents.length + brief.insights.length === 0) return null;
  return brief;
}

function buildPrompt(event: EventConfig): string {
  return `이 영상은 로봇 전시회 '${event.label}' 관련 영상이다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
경쟁사 분석 보고서에 들어갈 요약이므로, 영상에서 실제로 보이거나 들리는 것에만 근거하고 추측·과장은 금지한다.

스키마:
{
  "mainProducts": ["주요 제품 — 영상에 등장하는 회사·로봇 제품과 부스/시연 운영 방식, 최대 3개, 각 120자 이내 한국어"],
  "demoContents": ["시연 내용 — 영상에서 실제 시연된 작업·데모 장면, 최대 3개, 각 120자 이내 한국어"],
  "insights": ["기술 관점 시사점 — 기술 전략적 의미와 가전·로봇 사업 관점에서 참고할 포인트, 최대 3개, 각 120자 이내 한국어"]
}
확인할 수 없는 항목은 빈 배열로 응답하라. 자막 전문이나 장문 전사를 포함하지 말라. JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;
}

interface PendingVideo {
  id: string;
  title: string;
  url: string;
}

class EventVideoBriefService {
  private client: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  /** 이벤트 관련 영상 전체 목록 (브리프 유무 무관) — 특집 페이지용 */
  async listEventVideos(eventKey: string) {
    const event = getEventConfig(eventKey);
    if (!event) return [];

    const briefKey = `eventBrief_${event.key}`;
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        publishedAt: articles.publishedAt,
        meta: articles.extractedMetadata,
      })
      .from(articles)
      .where(
        and(
          sql`product_type = 'video'`,
          sql`published_at >= ${event.since}::date`,
          sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern})`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(100);

    return rows.map((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const videoId = typeof meta.videoId === 'string' ? meta.videoId : null;
      const rawBrief = meta[briefKey];
      const brief =
        rawBrief && typeof rawBrief === 'object'
          ? {
              mainProducts: capList((rawBrief as any).mainProducts, 3, 120),
              demoContents: capList((rawBrief as any).demoContents, 3, 120),
              insights: capList((rawBrief as any).insights, 3, 120),
              briefedAt: typeof (rawBrief as any).briefedAt === 'string' ? (rawBrief as any).briefedAt : null,
            }
          : null;
      return {
        id: r.id,
        title: r.title,
        url: r.url,
        thumbnail:
          typeof meta.thumbnail === 'string'
            ? meta.thumbnail
            : videoId
              ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              : null,
        channel: typeof meta.channel === 'string' ? meta.channel : null,
        publishedAt: r.publishedAt,
        brief,
      };
    });
  }

  /** 브리프 미생성 이벤트 영상 조회 */
  private async getPending(event: EventConfig, limit: number): Promise<PendingVideo[]> {
    const briefKey = `eventBrief_${event.key}`;
    const attemptsKey = `eventBriefAttempts_${event.key}`;
    const rows = await db
      .select({ id: articles.id, title: articles.title, url: articles.url })
      .from(articles)
      .where(
        and(
          sql`product_type = 'video'`,
          sql`published_at >= ${event.since}::date`,
          sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern})`,
          sql`(extracted_metadata->${briefKey}) IS NULL`,
          sql`COALESCE((extracted_metadata->>${attemptsKey})::int, 0) < ${MAX_ATTEMPTS}`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(limit);
    return rows.filter((r) => YOUTUBE_WATCH_URL_RE.test(r.url));
  }

  /** 단일 영상 브리프 생성 — 실패 null, 쿼터 소진 'quota' */
  private async briefOne(event: EventConfig, video: PendingVideo): Promise<EventVideoBrief | 'quota' | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { fileData: { fileUri: video.url, mimeType: 'video/*' } },
              { text: buildPrompt(event) },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text;
      if (!text) return null;
      return parseEventBrief(text, MODEL);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`[EventBrief] quota exhausted (429) — batch will stop early`);
        return 'quota';
      }
      console.error(`[EventBrief] briefOne failed for ${video.id}:`, msg);
      return null;
    }
  }

  private async saveBrief(eventKey: string, articleId: string, brief: EventVideoBrief): Promise<void> {
    const briefKey = `eventBrief_${eventKey}`;
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
        || jsonb_build_object(${briefKey}::text, ${JSON.stringify(brief)}::jsonb)
      WHERE id = ${articleId}
    `);
  }

  /** 배치 실행 */
  async run(eventKey = 'wrc2026', limit = BATCH_LIMIT): Promise<{ briefed: number; failed: number; skipped: number }> {
    const res = { briefed: 0, failed: 0, skipped: 0 };
    if (!this.client) return res;
    const event = getEventConfig(eventKey);
    if (!event) return res;

    const pending = await this.getPending(event, limit);
    if (pending.length === 0) return res;

    const attemptsKey = `eventBriefAttempts_${event.key}`;
    let quotaHit = false;
    for (const video of pending) {
      if (quotaHit) break;
      const brief = await this.briefOne(event, video);
      if (brief === 'quota') {
        quotaHit = true;
        res.skipped++;
        continue;
      }
      if (brief) {
        await this.saveBrief(event.key, video.id, brief);
        res.briefed++;
      } else {
        await db.execute(sql`
          UPDATE articles
          SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
            || jsonb_build_object(
              ${attemptsKey}::text,
              COALESCE((extracted_metadata->>${attemptsKey})::int, 0) + 1
            )
          WHERE id = ${video.id}
        `);
        res.failed++;
      }
    }

    console.log(`[EventBrief] ${event.key}: briefed ${res.briefed}, failed ${res.failed}, skipped ${res.skipped}`);
    return res;
  }

  /** 관리자 온디맨드 단건 (기존 브리프 덮어씀) */
  async briefSingle(
    articleId: string,
    eventKey = 'wrc2026'
  ): Promise<{ ok: true; brief: EventVideoBrief } | { ok: false; error: string }> {
    if (!this.client) return { ok: false, error: 'GEMINI_API_KEY not configured' };
    const event = getEventConfig(eventKey);
    if (!event) return { ok: false, error: `Unknown event: ${eventKey}` };

    const [row] = await db
      .select({ id: articles.id, title: articles.title, url: articles.url, productType: articles.productType })
      .from(articles)
      .where(sql`id = ${articleId}`)
      .limit(1);
    if (!row) return { ok: false, error: 'Article not found' };
    if (row.productType !== 'video' || !YOUTUBE_WATCH_URL_RE.test(row.url)) {
      return { ok: false, error: 'not a public YouTube video' };
    }

    const brief = await this.briefOne(event, { id: row.id, title: row.title, url: row.url });
    if (brief === 'quota') {
      return { ok: false, error: 'Gemini 일일 쿼터 소진 — 잠시 후(또는 내일) 다시 시도하거나 유료 티어(billing)를 활성화하세요.' };
    }
    if (!brief) return { ok: false, error: 'Gemini brief generation failed' };

    await this.saveBrief(event.key, row.id, brief);
    return { ok: true, brief };
  }
}

export const eventVideoBriefService = new EventVideoBriefService();
