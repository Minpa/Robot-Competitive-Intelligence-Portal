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
import Anthropic from '@anthropic-ai/sdk';
import { sql, and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, viewCache } from '../db/schema.js';
import { aiUsageService } from './ai-usage.service.js';

const MODEL = process.env.GEMINI_VIDEO_MODEL || 'gemini-flash-latest';
const BATCH_LIMIT = Math.max(1, parseInt(process.env.GEMINI_EVENT_BRIEF_BATCH_LIMIT || '10', 10));
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.GEMINI_VIDEO_MAX_ATTEMPTS || '2', 10));
const TREND_MODEL = process.env.EVENT_TREND_MODEL || 'claude-haiku-4-5-20251001';
const TREND_TTL_MS = 12 * 3_600_000; // 12시간

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
    pattern: '\\mwrc\\M|wrc[ _-]?2026|world robot conference|世界机器人大会|세계 ?로봇 ?(대회|콘퍼런스)',
    since: '2026-07-01',
  },
];

export function getEventConfig(key: string): EventConfig | null {
  return EVENTS.find((e) => e.key === key) ?? null;
}

export interface EventVideoBrief {
  mainProducts: string[];  // 주요 제품 ≤3개, 각 ≤160자
  demoContents: string[];  // 시연 내용 ≤3개, 각 ≤160자
  insights: string[];      // 기술 관점 시사점 ≤3개, 각 ≤160자
  briefedAt: string;
  model: string;
  highlight?: string;      // 한 줄 핵심 요약 ≤80자 (v2)
  companies?: string[];    // 등장 기업/브랜드 태그 ≤6개, 각 ≤30자 (v2)
  techKeywords?: string[]; // 기술 키워드 태그 ≤8개, 각 ≤24자 (v2)
  briefVersion?: 1 | 2;    // 없으면(레거시) 1로 취급
}

/** 유튜브 검색 API 등이 제목에 남기는 HTML 엔티티(&#39; &amp; 등)를 일반 문자로 복원 */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
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

  const highlight = typeof parsed.highlight === 'string' ? parsed.highlight.trim().slice(0, 80) : '';
  const companies = capList(parsed.companies, 6, 30);
  const techKeywords = capList(parsed.techKeywords, 8, 24);

  const brief: EventVideoBrief = {
    mainProducts: capList(parsed.mainProducts, 3, 160),
    demoContents: capList(parsed.demoContents, 3, 160),
    insights: capList(parsed.insights, 3, 160),
    briefedAt: new Date().toISOString(),
    model,
    briefVersion: 2,
  };
  if (highlight) brief.highlight = highlight;
  if (companies.length > 0) brief.companies = companies;
  if (techKeywords.length > 0) brief.techKeywords = techKeywords;

  // 세 섹션 모두 비어 있으면 실패로 간주 (재시도 대상). highlight 등 느슨한 필드는 실패 판정에 포함하지 않는다.
  if (brief.mainProducts.length + brief.demoContents.length + brief.insights.length === 0) return null;
  return brief;
}

/** 트렌드 포인트 v2 — 근거 영상 id를 함께 담는다 */
export interface EventTrendPoint {
  text: string;        // ≤160자
  videoIds: string[];  // 근거 영상 id, ≤4개
}

export interface EventTrendSummary {
  headline: string;
  points: (string | EventTrendPoint)[]; // 종합(제품·시장·서비스) 트렌드. 구형 캐시(string[]) 하위호환. v2 신규 저장분은 EventTrendPoint[]
  techPoints?: EventTrendPoint[]; // 기술 관점 트렌드(하드웨어/제어/AI 모델 등) — v2 신규 필드, 구형 캐시엔 없음
  basedOn: number;
  generatedAt: string;
  trendVersion?: 2;
}

/** points/techPoints 공통 정규화: 문자열(구형) 또는 {text, videoIds}(v2) → EventTrendPoint[]. validVideoIds 교집합·4개 캡·6개 캡 적용 */
function normalizeTrendPoints(raw: unknown, validVideoIds?: Set<string>): EventTrendPoint[] {
  const rawPoints = Array.isArray(raw) ? (raw as unknown[]) : [];
  return rawPoints
    .map((p): EventTrendPoint | null => {
      if (typeof p === 'string') {
        const t = p.trim();
        if (!t) return null;
        return { text: t.slice(0, 160), videoIds: [] };
      }
      if (p && typeof p === 'object' && typeof (p as any).text === 'string') {
        const t = (p as any).text.trim();
        if (!t) return null;
        const rawIds = Array.isArray((p as any).videoIds) ? (p as any).videoIds : [];
        let videoIds = (rawIds as unknown[]).filter((id): id is string => typeof id === 'string');
        if (validVideoIds) {
          videoIds = videoIds.filter((id) => validVideoIds.has(id));
        }
        return { text: t.slice(0, 160), videoIds: videoIds.slice(0, 4) };
      }
      return null;
    })
    .filter((p): p is EventTrendPoint => p !== null)
    .slice(0, 6);
}

/**
 * Anthropic 응답에서 {headline, points[], techPoints[]} 트렌드 요약 JSON 파싱 (주변 텍스트 포함 응답도 복원)
 * points/techPoints 원소는 문자열(구형) 또는 {text, videoIds}(v2) 모두 허용하며, 결과는 항상 EventTrendPoint[]로 정규화한다.
 * validVideoIds가 주어지면 videoIds를 그 집합과의 교집합으로만 남긴다(최대 4개).
 * techPoints는 느슨한 필드 — 없거나 비어도 실패 판정에 영향 없음(항상 배열로 반환, 없으면 []).
 */
export function parseEventTrendSummary(
  text: string,
  validVideoIds?: Set<string>
): { headline: string; points: EventTrendPoint[]; techPoints: EventTrendPoint[] } | null {
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

  const headline = typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 120) : '';
  const points = normalizeTrendPoints(parsed.points, validVideoIds);
  const techPoints = normalizeTrendPoints(parsed.techPoints, validVideoIds);

  if (!headline || points.length === 0) return null;
  return { headline, points, techPoints };
}

/** Anthropic 응답에서 [{id, titleKo}] 제목 번역 JSON 배열 파싱 (주변 텍스트 포함 응답도 복원) */
export function parseTitleTranslations(text: string): { id: string; titleKo: string }[] {
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(text.trim());
  if (!Array.isArray(parsed)) {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) parsed = tryParse(m[0]);
  }
  if (!Array.isArray(parsed)) {
    // 응답이 max_tokens에 잘려 배열이 안 닫힌 경우 — 완결된 객체만 개별 복구
    const objects = text.match(/\{\s*"id"\s*:\s*"[^"]+"\s*,\s*"titleKo"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g);
    if (objects) parsed = objects.map((o) => tryParse(o)).filter(Boolean);
  }
  if (!Array.isArray(parsed)) return [];

  return (parsed as unknown[])
    .filter(
      (item): item is { id: string; titleKo: string } =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as any).id === 'string' &&
        typeof (item as any).titleKo === 'string' &&
        (item as any).titleKo.trim().length > 0
    )
    .map((item) => ({ id: item.id, titleKo: item.titleKo.slice(0, 200) }));
}

function buildTrendPrompt(
  briefs: {
    id: string;
    title: string;
    channel: string | null;
    highlight: string | null;
    mainProducts: string[];
    demoContents: string[];
    insights: string[];
    techKeywords: string[];
  }[]
): string {
  return `다음은 WRC 2026(세계 로봇 대회) 관련 영상들의 분석 브리프다. 전시회 전체를 관통하는 트렌드를 두 축으로 요약하라 — (1) 종합 트렌드: 제품·시장·서비스 관점, (2) 기술 트렌드: 하드웨어(액추에이터·로봇 핸드·센서·구동계), 제어/알고리즘(전신 제어, 밸런싱, 모션 플래닝), AI 모델/학습 방법(VLA, 모방학습, 강화학습, 파운데이션 모델) 등 구체적 기술 요소 중심으로, 연구소 엔지니어가 참고할 수 있는 수준으로 작성하라. JSON만: {"headline": "한 문장 핵심 트렌드 (120자 이내)", "points": [{"text": "종합 트렌드 포인트(160자 이내, 한국어)", "videoIds": ["근거 영상 id, 최대 4개, 반드시 목록에 있는 id만"]}], "techPoints": [{"text": "기술 관점 트렌드 포인트(160자 이내, 한국어)", "videoIds": ["근거 영상 id, 최대 4개, 반드시 목록에 있는 id만"]}]} points·techPoints 각각 최대 6개, 브리프에 근거한 내용만 작성하고 추측은 금지한다. videoIds는 실제 그 포인트를 뒷받침하는 영상만 넣는다.

${JSON.stringify(briefs)}`;
}

function buildPrompt(event: EventConfig): string {
  return `이 영상은 로봇 전시회 '${event.label}' 관련 영상이다. 영상 내용을 분석해 아래 JSON 스키마로만 응답하라.
경쟁사 분석 보고서에 들어갈 요약이므로, 영상에서 실제로 보이거나 들리는 것에만 근거하고 추측·과장은 금지한다.

스키마:
{
  "highlight": "이 영상의 핵심을 한 문장으로 (80자 이내, 한국어)",
  "mainProducts": ["주요 제품 — 등장 회사·로봇 제품과 부스/시연 운영 방식, 최대 3개, 각 160자 이내 한국어. 가능하면 스펙/수치(자유도, 적재중량, 속도 등) 포함"],
  "demoContents": ["시연 내용 — 실제 시연된 작업·데모 장면을 구체적으로, 최대 3개, 각 160자 이내"],
  "insights": ["기술 관점 시사점 — 기술 전략적 의미, 가전·로봇 사업 관점 참고 포인트, 최대 3개, 각 160자 이내"],
  "companies": ["영상에 등장하는 회사/브랜드명, 최대 6개, 각 30자 이내, 로고·간판·자막 등으로 확인되는 것만"],
  "techKeywords": ["영상에서 확인되는 기술 키워드(예: 휴머노이드, 양팔 협조, VLA, 모방학습 등), 최대 8개, 각 24자 이내 한국어"]
}
확인할 수 없는 항목은 빈 배열/빈 문자열로 응답하라. 추측·과장은 금지한다. 자막 전문이나 장문 전사를 포함하지 말라. JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.`;
}

interface PendingVideo {
  id: string;
  title: string;
  url: string;
  /** true면 브리프는 이미 있으나 v1(구형)이라 v2로 업그레이드 대상인 영상 */
  isUpgrade?: boolean;
}

export interface EventStats {
  totalVideos: number;
  briefedVideos: number;
  categoryDistribution: { category: string; count: number }[]; // taskTypes[0] 기준(없으면 '미분류'), count desc
  topCompanies: { name: string; count: number }[];   // 상위 12, count desc
  topKeywords: { name: string; count: number }[];    // 상위 16, count desc
  uniqueCompanyCount: number;
  uniqueKeywordCount: number;
}

interface StatsVideoInput {
  taskTypes?: string[] | null;
  brief?: { companies?: string[] | null; techKeywords?: string[] | null } | null;
}

/** 이벤트 영상 목록(listEventVideos 결과)에서 카테고리·기업·기술 키워드 통계를 순수 계산한다 */
export function computeEventStats(videos: StatsVideoInput[]): EventStats {
  const totalVideos = videos.length;
  const briefedVideos = videos.filter((v) => !!v.brief).length;

  const catCounts = new Map<string, number>();
  for (const v of videos) {
    const cat = v.taskTypes && v.taskTypes[0] ? v.taskTypes[0] : '미분류';
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  const categoryDistribution = [...catCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // 소문자 키로 빈도 집계하되, 대표 표기는 첫 등장 형태를 보존. 브리프 없는 영상은 집계 제외.
  const companyMap = new Map<string, { display: string; count: number }>();
  const keywordMap = new Map<string, { display: string; count: number }>();
  for (const v of videos) {
    if (!v.brief) continue;
    for (const raw of v.brief.companies ?? []) {
      const name = typeof raw === 'string' ? raw.trim() : '';
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = companyMap.get(key);
      if (existing) existing.count += 1;
      else companyMap.set(key, { display: name, count: 1 });
    }
    for (const raw of v.brief.techKeywords ?? []) {
      const name = typeof raw === 'string' ? raw.trim() : '';
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = keywordMap.get(key);
      if (existing) existing.count += 1;
      else keywordMap.set(key, { display: name, count: 1 });
    }
  }

  const topCompanies = [...companyMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map(({ display, count }) => ({ name: display, count }));
  const topKeywords = [...keywordMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map(({ display, count }) => ({ name: display, count }));

  return {
    totalVideos,
    briefedVideos,
    categoryDistribution,
    topCompanies,
    topKeywords,
    uniqueCompanyCount: companyMap.size,
    uniqueKeywordCount: keywordMap.size,
  };
}

class EventVideoBriefService {
  private client: GoogleGenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  /** 이벤트별 제목 번역 in-flight 가드 (목록 조회 시 lazy 번역 중복 실행 방지) */
  private translatingEvents = new Set<string>();
  /** 이벤트별 브리프 배치 in-flight 가드 (버튼 연타·자동 실행 겹침 시 동일 영상 중복 분석 방지) */
  private runningBriefBatches = new Set<string>();

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
          sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern} OR extracted_metadata->>'event' = ${event.key})`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(100);

    // 미번역 제목이 있으면 백그라운드로 번역 실행 (버튼·스케줄 없이도 페이지 조회만으로 채워짐)
    const untranslated = rows.filter((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      return typeof meta.titleKo !== 'string';
    }).length;
    if (untranslated > 0 && this.anthropicClient && !this.translatingEvents.has(event.key)) {
      this.translatingEvents.add(event.key);
      void this.translateTitles(event.key)
        .catch(() => {})
        .finally(() => this.translatingEvents.delete(event.key));
    }

    return rows.map((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const videoId = typeof meta.videoId === 'string' ? meta.videoId : null;
      const rawBrief = meta[briefKey];
      const brief =
        rawBrief && typeof rawBrief === 'object'
          ? {
              mainProducts: capList((rawBrief as any).mainProducts, 3, 160),
              demoContents: capList((rawBrief as any).demoContents, 3, 160),
              insights: capList((rawBrief as any).insights, 3, 160),
              briefedAt: typeof (rawBrief as any).briefedAt === 'string' ? (rawBrief as any).briefedAt : null,
              highlight:
                typeof (rawBrief as any).highlight === 'string' ? (rawBrief as any).highlight.slice(0, 80) : null,
              companies: capList((rawBrief as any).companies, 6, 30),
              techKeywords: capList((rawBrief as any).techKeywords, 8, 24),
              briefVersion: (rawBrief as any).briefVersion === 2 ? (2 as const) : (1 as const),
            }
          : null;
      const rawTaskTypes = meta.aiTags?.taskTypes;
      const taskTypes = Array.isArray(rawTaskTypes)
        ? (rawTaskTypes as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 3)
        : [];
      return {
        id: r.id,
        title: decodeHtmlEntities(r.title),
        titleKo: typeof meta.titleKo === 'string' ? meta.titleKo : null,
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
        thirdParty: meta.thirdParty === true,
        taskTypes,
      };
    });
  }

  /** 이벤트 통계 집계(카테고리 분포·기업/키워드 태그 클라우드용). 알 수 없는 이벤트면 null */
  async getStats(eventKey: string): Promise<EventStats | null> {
    const event = getEventConfig(eventKey);
    if (!event) return null;
    const videos = await this.listEventVideos(eventKey);
    return computeEventStats(videos);
  }

  /** 이벤트 매칭 공통 조건 (제목/설명/이벤트 태그) */
  private matchConditions(event: EventConfig) {
    return [
      sql`product_type = 'video'`,
      sql`published_at >= ${event.since}::date`,
      sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern} OR extracted_metadata->>'event' = ${event.key})`,
    ];
  }

  /**
   * 브리프 대상 영상 조회 (점진 업그레이드).
   * 1차: 브리프 없는 영상(attempts < MAX_ATTEMPTS). 1차가 limit 미만이면
   * 2차: 브리프는 있으나 v2가 아닌(구형) 영상으로 잔여분을 채운다(isUpgrade: true).
   * 두 쿼리는 브리프 존재 유무로 분기되어 있어 결과 집합이 서로 겹치지 않는다.
   */
  private async getPending(event: EventConfig, limit: number): Promise<PendingVideo[]> {
    const briefKey = `eventBrief_${event.key}`;
    const attemptsKey = `eventBriefAttempts_${event.key}`;

    const rows1 = await db
      .select({ id: articles.id, title: articles.title, url: articles.url })
      .from(articles)
      .where(
        and(
          ...this.matchConditions(event),
          sql`(extracted_metadata->${briefKey}) IS NULL`,
          sql`COALESCE((extracted_metadata->>${attemptsKey})::int, 0) < ${MAX_ATTEMPTS}`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(limit);
    const stage1: PendingVideo[] = rows1.filter((r) => YOUTUBE_WATCH_URL_RE.test(r.url));

    if (stage1.length >= limit) return stage1;

    const rows2 = await db
      .select({ id: articles.id, title: articles.title, url: articles.url })
      .from(articles)
      .where(
        and(
          ...this.matchConditions(event),
          sql`(extracted_metadata->${briefKey}) IS NOT NULL`,
          sql`((extracted_metadata->${briefKey}->>'briefVersion')::int) IS DISTINCT FROM 2`
        )
      )
      .orderBy(sql`published_at DESC NULLS LAST`)
      .limit(limit - stage1.length);
    const stage2: PendingVideo[] = rows2
      .filter((r) => YOUTUBE_WATCH_URL_RE.test(r.url))
      .map((r) => ({ ...r, isUpgrade: true }));

    return [...stage1, ...stage2];
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
      const usage = response.usageMetadata;
      aiUsageService.logUsage({
        provider: 'gemini',
        model: MODEL,
        webSearch: false,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        query: `[wrc-brief] ${video.title.slice(0, 80)}`,
      }).catch(() => {});
      const text = response.text;
      if (!text) return null;
      return parseEventBrief(text, MODEL);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        // 어떤 쿼터(FreeTier/PaidTier 등)에 걸렸는지 원문 일부를 남겨 결제 적용 여부 진단
        console.warn(`[EventBrief] quota exhausted (429) — batch will stop early. detail: ${msg.slice(0, 500)}`);
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

  /** 이벤트 영상 제목을 한국어로 번역해 extracted_metadata.titleKo에 저장 */
  async translateTitles(eventKey = 'wrc2026', limit = 25): Promise<{ translated: number; skipped: number }> {
    const res = { translated: 0, skipped: 0 };
    if (!this.anthropicClient) return res;
    const event = getEventConfig(eventKey);
    if (!event) return res;

    try {
      const rows = await db
        .select({ id: articles.id, title: articles.title })
        .from(articles)
        .where(
          and(
            sql`product_type = 'video'`,
            sql`published_at >= ${event.since}::date`,
            sql`(title ~* ${event.pattern} OR COALESCE(extracted_metadata->>'description','') ~* ${event.pattern} OR extracted_metadata->>'event' = ${event.key})`,
            sql`(extracted_metadata->>'titleKo') IS NULL`
          )
        )
        .orderBy(sql`published_at DESC NULLS LAST`)
        .limit(limit);

      if (rows.length === 0) return res;

      const prompt =
        '다음 로봇 전시회 영상 제목들을 자연스러운 한국어로 번역하라. 회사명·로봇 모델명·고유명사는 원문 표기를 유지한다. JSON 배열만 응답: [{"id":"...","titleKo":"..."}] 각 titleKo는 150자 이내.' +
        JSON.stringify(rows.map((r) => ({ id: r.id, title: decodeHtmlEntities(r.title) })));

      const response = await this.anthropicClient.messages.create({
        model: TREND_MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });
      aiUsageService.logUsage({
        provider: 'claude',
        model: TREND_MODEL,
        webSearch: false,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        query: `[title-translate] ${rows.length}건`,
      }).catch(() => {});
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      const translations = parseTitleTranslations(text);
      const validIds = new Set(rows.map((r) => r.id));
      let saved = 0;
      for (const t of translations) {
        if (!validIds.has(t.id)) continue;
        await db.execute(sql`
          UPDATE articles
          SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
            || jsonb_build_object('titleKo', ${t.titleKo}::text)
          WHERE id = ${t.id}
        `);
        saved++;
      }
      res.translated = saved;
      res.skipped = rows.length - saved;
      console.log(`[EventBrief] titles translated ${event.key}: translated ${res.translated}, skipped ${res.skipped}`);
    } catch (err) {
      console.error('[EventBrief] translateTitles failed:', (err as Error).message);
    }
    return res;
  }

  /** 배치 실행 — 동일 이벤트 배치가 이미 진행 중이면 중복 실행하지 않는다 */
  async run(
    eventKey = 'wrc2026',
    limit = BATCH_LIMIT
  ): Promise<{ briefed: number; failed: number; skipped: number; alreadyRunning?: boolean }> {
    const res = { briefed: 0, failed: 0, skipped: 0 };

    if (this.runningBriefBatches.has(eventKey)) {
      console.warn(`[EventBrief] ${eventKey}: batch already running — duplicate request ignored`);
      return { ...res, alreadyRunning: true };
    }
    this.runningBriefBatches.add(eventKey);
    try {
      try {
        await this.translateTitles(eventKey);
      } catch (err) {
        console.error('[EventBrief] translateTitles (run) failed:', (err as Error).message);
      }

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
        } else if (video.isUpgrade) {
          // v1 → v2 업그레이드 시도 실패 — 기존 v1 브리프를 그대로 유지하고 attempts는 증가시키지 않는다.
          // (briefVersion이 2가 아니므로 다음 배치에서도 계속 후보가 되지만, 재시도 자체는 무해하다)
          res.failed++;
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
      if (res.briefed > 0) await this.invalidateTrendCache(eventKey);
      return res;
    } finally {
      this.runningBriefBatches.delete(eventKey);
    }
  }

  /** 새 브리프 반영 시 트렌드 요약 캐시 무효화 — 다음 조회 때 즉시 재생성 */
  private async invalidateTrendCache(eventKey: string) {
    try {
      await db.delete(viewCache).where(eq(viewCache.viewName, `event-trend-${eventKey}`));
    } catch (err) {
      console.error('[EventBrief] trend cache invalidation failed:', (err as Error).message);
    }
  }

  /** 이벤트 전체를 관통하는 AI 트렌드 요약 (브리프 완료 영상 기반, 12시간 캐시) */
  async getTrendSummary(eventKey: string): Promise<EventTrendSummary | null> {
    const event = getEventConfig(eventKey);
    if (!event) return null;

    const cacheKey = `event-trend-${eventKey}`;
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, cacheKey)).limit(1);
      if (cached && Date.now() - cached.cachedAt.getTime() < TREND_TTL_MS) {
        return cached.data as unknown as EventTrendSummary;
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재생성 진행
    }

    if (!this.anthropicClient) return null;

    const videos = await this.listEventVideos(eventKey);
    const briefed = videos.filter((v) => v.brief);
    if (briefed.length < 3) return null;

    const briefs = briefed.slice(0, 30).map((v) => ({
      id: v.id,
      title: v.title,
      channel: v.channel,
      highlight: v.brief!.highlight,
      mainProducts: v.brief!.mainProducts,
      demoContents: v.brief!.demoContents,
      insights: v.brief!.insights,
      techKeywords: v.brief!.techKeywords,
    }));
    const validVideoIds = new Set(briefed.map((v) => v.id));

    let parsed: { headline: string; points: EventTrendPoint[]; techPoints: EventTrendPoint[] } | null = null;
    try {
      const response = await this.anthropicClient.messages.create({
        model: TREND_MODEL,
        // points + techPoints 2축으로 출력량이 늘어나 여유 있게 상향(1500 → 2500)
        max_tokens: 2500,
        messages: [{ role: 'user', content: buildTrendPrompt(briefs) }],
      });
      aiUsageService.logUsage({
        provider: 'claude',
        model: TREND_MODEL,
        webSearch: false,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        query: `[event-trend] ${eventKey}`,
      }).catch(() => {});
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      parsed = parseEventTrendSummary(text, validVideoIds);
    } catch (err) {
      console.error('[EventBrief] getTrendSummary failed:', (err as Error).message);
      return null;
    }

    if (!parsed) return null;

    const summary: EventTrendSummary = {
      headline: parsed.headline,
      points: parsed.points,
      techPoints: parsed.techPoints,
      basedOn: briefed.length,
      generatedAt: new Date().toISOString(),
      trendVersion: 2,
    };

    try {
      await db
        .insert(viewCache)
        .values({ viewName: cacheKey, data: summary, ttlMs: TREND_TTL_MS })
        .onConflictDoUpdate({
          target: viewCache.viewName,
          set: { data: summary, cachedAt: new Date(), ttlMs: TREND_TTL_MS },
        });
    } catch {
      // 캐시 저장 실패는 치명적이지 않음
    }

    return summary;
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
    await this.invalidateTrendCache(eventKey);
    return { ok: true, brief };
  }
}

export const eventVideoBriefService = new EventVideoBriefService();
