/**
 * EventCompanyReportService — 이벤트 특집(예: WRC 2026) 참관 업체 임원 보고서 PPT
 *
 * listEventVideos()의 브리프(companies/mainProducts/demoContents/insights/techKeywords)를
 * 업체 단위로 집계하고, 상위 업체는 Claude 웹 검색으로 공개 정보를 보강(enrich)해
 * 임원 보고용 PPT를 생성한다.
 *
 * 안전 원칙:
 *  - 웹 검색 결과는 파생 요약만 캡 강제로 저장한다(원문 장문 복사 금지).
 *  - 웹 검색 실패/키 없음이어도 원자료 슬라이스로 로컬 요약을 만들어 리포트 생성은 항상 성공시킨다.
 *  - event-video-brief.service.ts / event-video-ppt.service.ts는 수정하지 않고, 필요한 것만
 *    import(listEventVideos/getTrendSummary/getEventConfig) 또는 상수·헬퍼를 복제해 사용한다.
 */

import PptxGenJS from 'pptxgenjs';
import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { viewCache } from '../db/schema.js';
import { aiUsageService } from './ai-usage.service.js';
import { eventVideoBriefService, getEventConfig, type EventTrendPoint } from './event-video-brief.service.js';

// ── PPT 상수 (event-video-ppt.service.ts에서 복제 — 원본 파일은 수정하지 않는다) ──
const TASK_TYPE_ORDER = [
  '보행/이동',
  '파지/조작',
  '전신 작업',
  '공장/산업 작업',
  '가사/서비스',
  '상호작용/데모쇼',
  '제품 공개',
  '기타',
  '미분류',
];

const THUMBNAIL_TIMEOUT_MS = 5000;
const BG = 'FFFFFF';
const TITLE_COLOR = '1E293B';
const TEXT_COLOR = '334155';
const SUBTLE_COLOR = '64748B';
const ACCENT_COLOR = '7C3AED';
const TOPLINE_COLOR = 'DC2626';
const THUMB_BADGE_COLOR = 'FFD400';

const MODEL = process.env.EVENT_TREND_MODEL || 'claude-haiku-4-5-20251001';
const ENRICH_TTL_MS = 7 * 24 * 3_600_000; // 7일
const ENRICH_CONCURRENCY = 3;
const DEFAULT_REPORT_COMPANY_LIMIT = Math.max(1, parseInt(process.env.EVENT_REPORT_COMPANY_LIMIT || '12', 10));

const SECTION_H = 2.85;
const SECTION_Y0 = 1.5;
const SLIDE_X = 0.6;
const SLIDE_W = 12.1;
const SOURCES_PER_SLIDE = 18;

type EventTrendSummary = Awaited<ReturnType<typeof eventVideoBriefService.getTrendSummary>>;

// ── 썸네일 임베드 (event-video-ppt.service.ts fetchThumbnailDataUri 복제) ──

async function fetchOnce(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), THUMBNAIL_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function fetchThumbnailDataUri(url: string): Promise<string | null> {
  const candidates = [url];
  if (url.includes('hqdefault')) {
    candidates.push(url.replace('hqdefault', 'mqdefault'), url.replace('hqdefault', 'default'));
  }
  for (const candidate of candidates) {
    const data = await fetchOnce(candidate);
    if (data) return data;
  }
  return null;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** trend.points 원소(문자열 또는 v2 {text, videoIds} 객체)에서 표시용 텍스트만 추출(160자 캡) */
function trendPointText(p: string | EventTrendPoint): string {
  return (typeof p === 'string' ? p : p.text).slice(0, 160);
}

function capList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().slice(0, maxLen))
    .slice(0, maxItems);
}

/** 웹 검색 응답 텍스트에 섞여 나오는 인용 마크업(<cite index="...">...</cite>)과 길이 캡으로 잘린 태그 조각 제거 */
export function stripCiteTags(s: string): string {
  return s
    .replace(/<\/?cite\b[^>]*>?/g, '') // 완전한 태그 + 끝에서 '>' 없이 잘린 태그
    .replace(/<\/?c(?:i(?:t(?:e)?)?)?$/, '') // 캡 절단으로 남은 짧은 조각 (예: "</ci")
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripCiteList(raw: unknown): unknown {
  return Array.isArray(raw) ? raw.map((v) => (typeof v === 'string' ? stripCiteTags(v) : v)) : raw;
}

/** 저장/캐시된 보강 결과에도 태그가 남아있을 수 있어 읽기 경로에서 한 번 더 정리 */
export function sanitizeEnrichment(e: CompanyEnrichment): CompanyEnrichment {
  return {
    ...e,
    topline: stripCiteTags(e.topline ?? '').slice(0, 120),
    products: (e.products ?? []).map((s) => stripCiteTags(s).slice(0, 180)),
    techInsights: (e.techInsights ?? []).map((s) => stripCiteTags(s).slice(0, 180)),
    demoNotes: (e.demoNotes ?? []).map((s) => stripCiteTags(s).slice(0, 160)),
    sources: (e.sources ?? []).map((s) => stripCiteTags(s).slice(0, 200)),
  };
}

// ── 타입 ──

export interface CompanyThumbnail {
  videoId: string;
  url: string;
  title: string;
}

export interface CompanyAggregate {
  /** 최초 등장 영상에서의 원문 표기 */
  name: string;
  category: string;
  videoIds: string[];
  raw: {
    highlights: string[]; // ≤6
    mainProducts: string[]; // ≤6
    demoContents: string[]; // ≤6
    insights: string[]; // ≤6
    techKeywords: string[]; // ≤10, 중복 제거
  };
  thumbnails: CompanyThumbnail[]; // ≤2, 최근 게시 우선
  sampleVideoUrls: string[]; // ≤3
}

export interface CompanyEnrichment {
  topline: string; // ≤120
  products: string[]; // ≤2, 각 180자
  techInsights: string[]; // ≤2, 각 180자
  demoNotes: string[]; // ≤2, 각 160자
  sources: string[]; // ≤3
  enrichedVia: 'web-search' | 'local-only';
}

export interface SlideCompanyGroup {
  category: string;
  companies: CompanyAggregate[]; // 1~2개
}

export type GenerateReportResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; reason: 'unknown-event' | 'no-companies' };

/** aggregateCompanies 입력 — listEventVideos() 결과의 부분 집합(필드 서브셋)이면 충분하다 */
export interface AggregateVideoInput {
  id: string;
  title: string;
  titleKo?: string | null;
  url: string;
  thumbnail?: string | null;
  publishedAt?: unknown;
  taskTypes?: string[] | null;
  brief?: {
    highlight?: string | null;
    mainProducts?: string[] | null;
    demoContents?: string[] | null;
    insights?: string[] | null;
    companies?: string[] | null;
    techKeywords?: string[] | null;
  } | null;
}

// ── 순수 함수 ──

/** 회사명 정규화 키: lowercase/trim/공백압축/영숫자·한글 외 제거/50자 캡 */
export function normalizeCompanyKey(name: string): string {
  const compact = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const stripped = compact.replace(/[^a-z0-9가-힣]/g, '');
  return stripped.slice(0, 50);
}

/**
 * 영상 목록에서 업체 단위로 집계한다.
 * 브리프가 없거나 companies가 빈 영상은 제외하고, 회사명은 정규화 키(대소문자 무시)로 병합한다.
 */
export function aggregateCompanies(videos: AggregateVideoInput[]): CompanyAggregate[] {
  interface Entry {
    name: string;
    videoIds: string[];
    categoryCounts: Map<string, number>;
    highlights: string[];
    mainProducts: string[];
    demoContents: string[];
    insights: string[];
    techKeywords: string[];
    thumbCandidates: { videoId: string; url: string; title: string; publishedAt: unknown }[];
    sampleVideoUrls: string[];
  }

  const map = new Map<string, Entry>();

  for (const v of videos) {
    if (!v.brief) continue;
    const companies = v.brief.companies ?? [];
    if (companies.length === 0) continue;

    const cat = v.taskTypes && v.taskTypes[0] ? v.taskTypes[0] : '미분류';
    const seenInThisVideo = new Set<string>();

    for (const rawName of companies) {
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      if (!name) continue;
      const key = normalizeCompanyKey(name);
      if (!key) continue;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          name,
          videoIds: [],
          categoryCounts: new Map(),
          highlights: [],
          mainProducts: [],
          demoContents: [],
          insights: [],
          techKeywords: [],
          thumbCandidates: [],
          sampleVideoUrls: [],
        };
        map.set(key, entry);
      }

      entry.categoryCounts.set(cat, (entry.categoryCounts.get(cat) ?? 0) + 1);

      // 동일 영상 내 중복 표기(예: "Unitree", "UNITREE")는 videoId·원자료를 한 번만 반영
      if (seenInThisVideo.has(key)) continue;
      seenInThisVideo.add(key);

      entry.videoIds.push(v.id);
      if (v.brief.highlight) entry.highlights.push(v.brief.highlight);
      entry.mainProducts.push(...(v.brief.mainProducts ?? []));
      entry.demoContents.push(...(v.brief.demoContents ?? []));
      entry.insights.push(...(v.brief.insights ?? []));
      entry.techKeywords.push(...(v.brief.techKeywords ?? []));
      if (v.thumbnail) {
        entry.thumbCandidates.push({
          videoId: v.id,
          url: v.thumbnail,
          title: (v.titleKo ?? v.title) || '',
          publishedAt: v.publishedAt,
        });
      }
      entry.sampleVideoUrls.push(v.url);
    }
  }

  const result: CompanyAggregate[] = [];
  for (const entry of map.values()) {
    // 카테고리: taskTypes[0] 최빈값, 동률이면 TASK_TYPE_ORDER 앞순
    let bestCat = '미분류';
    let bestCount = -1;
    for (const cat of TASK_TYPE_ORDER) {
      const count = entry.categoryCounts.get(cat) ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestCat = cat;
      }
    }

    const seenThumbVideo = new Set<string>();
    const thumbnails: CompanyThumbnail[] = entry.thumbCandidates
      .filter((t) => {
        if (seenThumbVideo.has(t.videoId)) return false;
        seenThumbVideo.add(t.videoId);
        return true;
      })
      .sort((a, b) => {
        const ta = a.publishedAt ? new Date(String(a.publishedAt)).getTime() : 0;
        const tb = b.publishedAt ? new Date(String(b.publishedAt)).getTime() : 0;
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      })
      .slice(0, 2)
      .map(({ videoId, url, title }) => ({ videoId, url, title }));

    const seenKw = new Set<string>();
    const techKeywords: string[] = [];
    for (const kw of entry.techKeywords) {
      const kwKey = kw.trim().toLowerCase();
      if (seenKw.has(kwKey)) continue;
      seenKw.add(kwKey);
      techKeywords.push(kw);
      if (techKeywords.length >= 10) break;
    }

    result.push({
      name: entry.name,
      category: bestCat,
      videoIds: Array.from(new Set(entry.videoIds)),
      raw: {
        highlights: entry.highlights.slice(0, 6),
        mainProducts: entry.mainProducts.slice(0, 6),
        demoContents: entry.demoContents.slice(0, 6),
        insights: entry.insights.slice(0, 6),
        techKeywords,
      },
      thumbnails,
      sampleVideoUrls: Array.from(new Set(entry.sampleVideoUrls)).slice(0, 3),
    });
  }

  return result;
}

/** 리포트에 실을 업체 선정 — 등장 영상 수 desc, 동률이면 이름 asc. limit 미지정 시 EVENT_REPORT_COMPANY_LIMIT(기본 12) */
export function selectReportCompanies(
  companies: CompanyAggregate[],
  limit: number = DEFAULT_REPORT_COMPANY_LIMIT
): CompanyAggregate[] {
  return [...companies]
    .sort((a, b) => b.videoIds.length - a.videoIds.length || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit));
}

/** Anthropic 웹 검색 응답에서 업체 보강 JSON 파싱 (주변 텍스트 포함 응답도 복원). 실패 시 null */
export function parseCompanyEnrichment(text: string): CompanyEnrichment | null {
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

  const topline = typeof parsed.topline === 'string' ? stripCiteTags(parsed.topline).slice(0, 120) : '';
  if (!topline) return null;

  return {
    topline,
    products: capList(stripCiteList(parsed.products), 2, 180),
    techInsights: capList(stripCiteList(parsed.techInsights), 2, 180),
    demoNotes: capList(stripCiteList(parsed.demoNotes), 2, 160),
    sources: capList(stripCiteList(parsed.sources), 3, 200),
    enrichedVia: 'web-search',
  };
}

/** 원자료 슬라이스만으로 만든 로컬 폴백 보강(웹 검색 미사용/실패 시) */
function buildLocalOnlyEnrichment(company: CompanyAggregate): CompanyEnrichment {
  const topline = (
    company.raw.highlights[0] ??
    company.raw.insights[0] ??
    company.raw.mainProducts[0] ??
    `${company.name} 관련 수집 영상 기반 요약`
  ).slice(0, 120);

  return {
    topline,
    products: company.raw.mainProducts.slice(0, 2).map((s) => s.slice(0, 180)),
    techInsights: company.raw.insights.slice(0, 2).map((s) => s.slice(0, 180)),
    demoNotes: company.raw.demoContents.slice(0, 2).map((s) => s.slice(0, 160)),
    sources: [],
    enrichedVia: 'local-only',
  };
}

function buildCompanyEnrichPrompt(company: CompanyAggregate, eventLabel: string): string {
  return `당신은 로봇 산업 리서치 분석가입니다. 아래는 '${eventLabel}' 전시회에서 수집한 영상들을 AI로 분석해 얻은 '${company.name}' 관련 원자료입니다. 이 원자료와 웹 검색으로 확인 가능한 공개 정보를 종합해, 임원 보고서에 실을 업체 요약을 작성하세요.

**영상 원자료(JSON):**
${JSON.stringify(company.raw)}

**작성 규칙:**
- 공개 정보의 파생 요약만 작성한다. 원문 장문 복사 금지.
- 확인되지 않는 내용은 추측하지 않는다.
- 인용 태그(<cite> 등)나 각주·출처 마크업을 본문 텍스트에 포함하지 않는다. 출처는 sources 배열에만 적는다.
- JSON 객체만 응답하고 다른 텍스트는 포함하지 않는다.

**응답 JSON 스키마:**
{
  "topline": "회사 한 줄 요약 (120자 이내, 한국어)",
  "products": ["주요 제품/부스 요약, 최대 2개, 각 180자 이내"],
  "techInsights": ["기술 관점 시사점, 최대 2개, 각 180자 이내"],
  "demoNotes": ["시연 내용 요약, 최대 2개, 각 160자 이내"],
  "sources": ["웹 검색으로 확인한 출처 도메인, 최대 3개"]
}`;
}

/** 선정된 업체를 카테고리(TASK_TYPE_ORDER 순)별로 묶고, 슬라이드 단위(2개씩)로 chunk한다 */
export function groupCompaniesForSlides(companies: CompanyAggregate[]): SlideCompanyGroup[] {
  const byCat = new Map<string, CompanyAggregate[]>();
  for (const c of companies) {
    const arr = byCat.get(c.category) ?? [];
    arr.push(c);
    byCat.set(c.category, arr);
  }

  const groups: SlideCompanyGroup[] = [];
  for (const cat of TASK_TYPE_ORDER) {
    const list = byCat.get(cat);
    if (!list || list.length === 0) continue;
    for (let i = 0; i < list.length; i += 2) {
      groups.push({ category: cat, companies: list.slice(i, i + 2) });
    }
  }
  return groups;
}

/** 업체 슬라이드 타이틀: "주요 참관 업체 (카테고리) – A / B" (1개면 "– A") */
export function buildSlideTitle(group: SlideCompanyGroup): string {
  const names = group.companies.map((c) => c.name).join(' / ');
  return `주요 참관 업체 (${group.category}) – ${names}`;
}

/** 배열을 concurrency 개씩 동시에 처리하는 간단한 세마포어 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx] as T, idx);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── 서비스 ──

class EventCompanyReportService {
  private anthropicClient: Anthropic | null = null;
  /** 이벤트별 리포트 생성 in-flight 가드 — 라우트에서 이미 진행 중이면 409 처리 */
  private generatingReports = new Set<string>();

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  isGenerating(eventKey: string): boolean {
    return this.generatingReports.has(eventKey);
  }

  /** 임원 보고서 PPT 생성. 알 수 없는 이벤트/기업 태그 브리프 부족 시 실패 사유를 반환한다 */
  async generate(eventKey: string): Promise<GenerateReportResult> {
    const event = getEventConfig(eventKey);
    if (!event) return { ok: false, reason: 'unknown-event' };

    this.generatingReports.add(eventKey);
    try {
      const videos = await eventVideoBriefService.listEventVideos(eventKey).catch(() => []);
      const allCompanies = aggregateCompanies(videos);
      const companies = selectReportCompanies(allCompanies);
      if (companies.length === 0) return { ok: false, reason: 'no-companies' };

      const enrichments = new Map<string, CompanyEnrichment>();
      await mapWithConcurrency(companies, ENRICH_CONCURRENCY, async (company) => {
        const enrichment = await this.enrichCompany(eventKey, event.label, company);
        enrichments.set(normalizeCompanyKey(company.name), enrichment);
      });

      // 썸네일 서버측 임베드(업체당 최대 2장, 전체 병렬, videoId 기준 중복 제거)
      const uniqueThumbs = new Map<string, string>();
      for (const c of companies) {
        for (const t of c.thumbnails) uniqueThumbs.set(t.videoId, t.url);
      }
      const thumbMap = new Map<string, string>();
      await Promise.all(
        [...uniqueThumbs.entries()].map(async ([videoId, url]) => {
          const data = await fetchThumbnailDataUri(url);
          if (data) thumbMap.set(videoId, data);
        })
      );

      const trend = await eventVideoBriefService.getTrendSummary(eventKey).catch(() => null);

      const pptx = new PptxGenJS();
      (pptx as any).layout = 'LAYOUT_WIDE';

      this.addCoverSlide(pptx, companies.length, videos.length);
      this.addExecutiveSummarySlide(pptx, trend);

      const groups = groupCompaniesForSlides(companies);
      for (const group of groups) {
        this.addCompanySlide(pptx, group, enrichments, thumbMap);
      }

      this.addSourcesSlides(pptx, companies, enrichments);

      const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
      return { ok: true, buffer };
    } finally {
      this.generatingReports.delete(eventKey);
    }
  }

  /** 업체 보강(웹 검색). 캐시 hit 또는 실패/키 없음 시 원자료 기반 로컬 요약으로 폴백 */
  private async enrichCompany(
    eventKey: string,
    eventLabel: string,
    company: CompanyAggregate
  ): Promise<CompanyEnrichment> {
    const cacheKey = `event-company-enrich-${eventKey}-${normalizeCompanyKey(company.name)}`;
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, cacheKey)).limit(1);
      if (cached && Date.now() - cached.cachedAt.getTime() < ENRICH_TTL_MS) {
        // 이전 버전에서 캐시된 결과에 인용 태그가 남아있을 수 있어 읽기 시 정리
        return sanitizeEnrichment(cached.data as unknown as CompanyEnrichment);
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재생성 진행
    }

    const fallback = buildLocalOnlyEnrichment(company);
    if (!this.anthropicClient) return fallback;

    try {
      const response = await this.anthropicClient.messages.create({
        model: MODEL,
        max_tokens: 1200,
        tools: [
          {
            type: 'web_search_20250305' as any,
            name: 'web_search',
            max_uses: 3,
          } as any,
        ],
        messages: [{ role: 'user', content: buildCompanyEnrichPrompt(company, eventLabel) }],
      });

      let combined = '';
      for (const block of response.content) {
        if (block.type === 'text') combined += block.text + '\n';
      }
      const parsed = parseCompanyEnrichment(combined);
      if (!parsed) return fallback;

      aiUsageService
        .logUsage({
          provider: 'claude',
          model: MODEL,
          webSearch: true,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          query: `[company-enrich] ${company.name}`,
        })
        .catch(() => {});

      try {
        await db
          .insert(viewCache)
          .values({ viewName: cacheKey, data: parsed, ttlMs: ENRICH_TTL_MS })
          .onConflictDoUpdate({
            target: viewCache.viewName,
            set: { data: parsed, cachedAt: new Date(), ttlMs: ENRICH_TTL_MS },
          });
      } catch {
        // 캐시 저장 실패는 치명적이지 않음
      }

      return parsed;
    } catch (err) {
      console.error(`[EventCompanyReport] enrichCompany failed for ${company.name}:`, (err as Error).message);
      return fallback;
    }
  }

  // ── 슬라이드 렌더링 ──

  private addCoverSlide(pptx: PptxGenJS, companyCount: number, videoCount: number) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    slide.addText('WRC 2026 참관 보고 — 임원 요약', {
      x: 0.8, y: 1.5, w: '85%', h: 1.5,
      fontSize: 32, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
    });

    slide.addText(`World Robot Conference 2026 · 업체 ${companyCount} · 영상 ${videoCount}`, {
      x: 0.8, y: 3.2, w: '85%', h: 0.6,
      fontSize: 16, fontFace: 'Arial', color: SUBTLE_COLOR,
    });

    slide.addShape('rect' as any, {
      x: 0.8, y: 4.2, w: 3, h: 0.04, fill: { color: ACCENT_COLOR },
    });

    slide.addText(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, {
      x: 0.8, y: 4.5, w: '85%', h: 0.5,
      fontSize: 12, fontFace: 'Arial', color: ACCENT_COLOR,
    });
  }

  /** Executive Summary — 기존 addTrendSlide(event-video-ppt.service.ts) 레이아웃 복제 */
  private addExecutiveSummarySlide(pptx: PptxGenJS, trend: EventTrendSummary) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    slide.addText('Executive Summary — WRC 2026 영상 기반 트렌드 (AI 분석)', {
      x: 0.8, y: 0.35, w: 11.7, h: 0.5,
      fontSize: 14, fontFace: 'Arial', color: ACCENT_COLOR, bold: true,
    });

    slide.addShape('rect' as any, {
      x: 0.8, y: 0.85, w: 2.4, h: 0.035, fill: { color: ACCENT_COLOR },
    });

    if (!trend) {
      slide.addText(
        '트렌드 요약이 아직 생성되지 않았습니다.\n영상 브리프가 3건 이상 생성되면 AI 트렌드 요약이 자동으로 제공됩니다.',
        {
          x: 0.8, y: 2.5, w: 11.7, h: 1.5,
          fontSize: 16, fontFace: 'Arial', color: SUBTLE_COLOR,
          valign: 'top', lineSpacingMultiple: 1.4,
        }
      );
      return;
    }

    slide.addText(trend.headline.slice(0, 120), {
      x: 0.8, y: 1.05, w: 11.7, h: 1.0,
      fontSize: 22, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      valign: 'top', wrap: true, fit: 'shrink',
    });

    const hasTechPoints = Array.isArray(trend.techPoints) && trend.techPoints.length > 0;

    if (hasTechPoints) {
      this.addTrendColumn(slide, '종합 트렌드', trend.points, 0.8, 2.1, 5.6);
      this.addTrendColumn(slide, '기술 트렌드', trend.techPoints!, 6.9, 2.1, 5.6);
    } else {
      const bulletParas = trend.points.slice(0, 6).map((p) => ({
        text: trendPointText(p),
        options: { bullet: true, breakLine: true, paraSpaceAfter: 8 },
      }));

      slide.addText(bulletParas as any, {
        x: 0.8, y: 2.15, w: 11.7, h: 4.4,
        fontSize: 14, fontFace: 'Arial', color: TEXT_COLOR,
        valign: 'top', lineSpacingMultiple: 1.3,
      });
    }

    const generatedDate = formatDate(trend.generatedAt);
    const caption = [`브리프 ${trend.basedOn}건 기반`, generatedDate ? `생성일 ${generatedDate}` : null]
      .filter((p): p is string => !!p)
      .join(' · ');
    slide.addText(caption, {
      x: 0.8, y: 6.85, w: 11.7, h: 0.35,
      fontSize: 10, fontFace: 'Arial', color: SUBTLE_COLOR,
    });
  }

  private addTrendColumn(
    slide: any,
    label: string,
    points: (string | EventTrendPoint)[],
    x: number,
    y: number,
    w: number
  ) {
    slide.addText(label, {
      x, y, w, h: 0.35,
      fontSize: 12, fontFace: 'Arial', color: ACCENT_COLOR, bold: true,
    });

    const bulletParas = points.slice(0, 5).map((p) => ({
      text: trendPointText(p),
      options: { bullet: true, breakLine: true, paraSpaceAfter: 8 },
    }));

    slide.addText(bulletParas as any, {
      x, y: y + 0.45, w, h: 4.1,
      fontSize: 12, fontFace: 'Arial', color: TEXT_COLOR,
      valign: 'top', lineSpacingMultiple: 1.3,
    });
  }

  /** 업체 슬라이드: 타이틀 + 상단 topline 불릿 + 업체 섹션 최대 2개 */
  private addCompanySlide(
    pptx: PptxGenJS,
    group: SlideCompanyGroup,
    enrichments: Map<string, CompanyEnrichment>,
    thumbMap: Map<string, string>
  ) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    slide.addText(buildSlideTitle(group), {
      x: SLIDE_X, y: 0.3, w: SLIDE_W, h: 0.6,
      fontSize: 20, fontFace: 'Arial', color: TITLE_COLOR, bold: true, fit: 'shrink',
    });

    const toplineTexts = group.companies
      .map((c) => enrichments.get(normalizeCompanyKey(c.name)))
      .filter((e): e is CompanyEnrichment => !!e && !!e.topline)
      .map((e) => e.topline)
      .slice(0, 2);

    if (toplineTexts.length > 0) {
      const bulletParas = toplineTexts.map((t) => ({
        text: t,
        options: { bullet: true, breakLine: true, paraSpaceAfter: 4 },
      }));
      slide.addText(bulletParas as any, {
        x: SLIDE_X, y: 0.95, w: SLIDE_W, h: 0.5,
        fontSize: 13, fontFace: 'Arial', color: TOPLINE_COLOR, bold: true,
        valign: 'top', lineSpacingMultiple: 1.15, fit: 'shrink',
      });
    }

    let usedWebSearch = false;
    group.companies.forEach((company, idx) => {
      const y0 = SECTION_Y0 + idx * SECTION_H;
      const enrichment = enrichments.get(normalizeCompanyKey(company.name));
      if (enrichment?.enrichedVia === 'web-search') usedWebSearch = true;
      this.addCompanySection(slide, company, enrichment, thumbMap, y0);
    });

    if (group.companies.length === 2) {
      slide.addShape('line' as any, {
        x: SLIDE_X, y: SECTION_Y0 + SECTION_H - 0.05, w: SLIDE_W, h: 0,
        line: { color: 'E2E8F0', width: 1 },
      });
    }

    if (usedWebSearch) {
      slide.addText('※ 기술 시사점 일부는 공개 웹 정보로 보완되었으며 부정확할 수 있습니다.', {
        x: SLIDE_X, y: 7.15, w: SLIDE_W, h: 0.3,
        fontSize: 7, fontFace: 'Arial', color: SUBTLE_COLOR,
      });
    }
  }

  /** 업체 1개 섹션: 회사명 서브헤더 → [주요 제품] → [기술 관점 시사점] → [시연 내용](썸네일+demoNotes) */
  private addCompanySection(
    slide: any,
    company: CompanyAggregate,
    enrichment: CompanyEnrichment | undefined,
    thumbMap: Map<string, string>,
    y0: number
  ) {
    slide.addText(company.name, {
      x: SLIDE_X, y: y0, w: SLIDE_W, h: 0.35,
      fontSize: 14, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
    });

    const products = enrichment?.products.length ? enrichment.products : company.raw.mainProducts.slice(0, 2);
    const techInsights = enrichment?.techInsights.length ? enrichment.techInsights : company.raw.insights.slice(0, 2);
    const demoNotes = enrichment?.demoNotes.length ? enrichment.demoNotes : company.raw.demoContents.slice(0, 2);

    this.addLabeledRow(slide, '주요 제품', products, SLIDE_X, y0 + 0.4, 0.65);
    this.addLabeledRow(slide, '기술 관점 시사점', techInsights, SLIDE_X, y0 + 1.05, 0.65);

    // [시연 내용]: 라벨박스 + 썸네일 1~2개 + demoNotes 불릿
    const rowY3 = y0 + 1.75;
    const rowH3 = 1.0;
    const labelW = 1.5;
    slide.addShape('rect' as any, {
      x: SLIDE_X, y: rowY3, w: labelW, h: rowH3,
      line: { color: ACCENT_COLOR, width: 1 }, fill: { color: BG },
    });
    slide.addText('시연 내용', {
      x: SLIDE_X, y: rowY3, w: labelW, h: rowH3,
      fontSize: 9, fontFace: 'Arial', color: ACCENT_COLOR, bold: true,
      align: 'center', valign: 'middle',
    });

    const thumbW = 1.6;
    const thumbH = 0.9;
    const thumbGap = 0.15;
    let cursorX = SLIDE_X + labelW + 0.15;
    for (const t of company.thumbnails.slice(0, 2)) {
      const data = thumbMap.get(t.videoId);
      if (!data) continue;
      slide.addImage({
        data, x: cursorX, y: rowY3, w: thumbW, h: thumbH,
        sizing: { type: 'cover', w: thumbW, h: thumbH },
      });
      slide.addShape('rect' as any, {
        x: cursorX, y: rowY3, w: 0.55, h: 0.22, fill: { color: THUMB_BADGE_COLOR },
      });
      slide.addText('이미지', {
        x: cursorX, y: rowY3, w: 0.55, h: 0.22,
        fontSize: 6, fontFace: 'Arial', color: TITLE_COLOR, align: 'center', valign: 'middle',
      });
      cursorX += thumbW + thumbGap;
    }

    const demoTextX = cursorX;
    const demoTextW = Math.max(1, SLIDE_X + SLIDE_W - demoTextX);
    if (demoNotes.length > 0) {
      const bulletParas = demoNotes.map((t) => ({
        text: t,
        options: { bullet: true, breakLine: true, paraSpaceAfter: 2 },
      }));
      slide.addText(bulletParas as any, {
        x: demoTextX, y: rowY3, w: demoTextW, h: rowH3,
        fontSize: 9, fontFace: 'Arial', color: TEXT_COLOR,
        valign: 'top', fit: 'shrink',
      });
    }
  }

  /** [라벨] 박스 + 우측 불릿 텍스트 한 줄(주요 제품 / 기술 관점 시사점 공통 레이아웃) */
  private addLabeledRow(slide: any, label: string, items: string[], x: number, y: number, h: number) {
    const labelW = 1.5;
    slide.addShape('rect' as any, {
      x, y, w: labelW, h,
      line: { color: ACCENT_COLOR, width: 1 }, fill: { color: BG },
    });
    slide.addText(label, {
      x, y, w: labelW, h,
      fontSize: 9, fontFace: 'Arial', color: ACCENT_COLOR, bold: true,
      align: 'center', valign: 'middle', fit: 'shrink',
    });

    if (items.length === 0) return;
    const bulletParas = items.map((t) => ({
      text: t,
      options: { bullet: true, breakLine: true, paraSpaceAfter: 2 },
    }));
    slide.addText(bulletParas as any, {
      x: x + labelW + 0.15, y, w: SLIDE_W - labelW - 0.15, h,
      fontSize: 9, fontFace: 'Arial', color: TEXT_COLOR,
      valign: 'top', fit: 'shrink',
    });
  }

  /** 마지막 출처 슬라이드(들): 회사명 — 대표 영상 URL(하이퍼링크) · 웹 출처 도메인. 18개 초과 시 분할 */
  private addSourcesSlides(
    pptx: PptxGenJS,
    companies: CompanyAggregate[],
    enrichments: Map<string, CompanyEnrichment>
  ) {
    const totalPages = Math.max(1, Math.ceil(companies.length / SOURCES_PER_SLIDE));
    for (let page = 0; page < totalPages; page++) {
      const chunk = companies.slice(page * SOURCES_PER_SLIDE, (page + 1) * SOURCES_PER_SLIDE);
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      slide.addText(`출처${totalPages > 1 ? ` (${page + 1}/${totalPages})` : ''}`, {
        x: SLIDE_X, y: 0.3, w: SLIDE_W, h: 0.5,
        fontSize: 18, fontFace: 'Arial', color: TITLE_COLOR, bold: true,
      });

      const runs: any[] = [];
      chunk.forEach((c) => {
        const enrichment = enrichments.get(normalizeCompanyKey(c.name));
        const url = c.sampleVideoUrls[0];
        const domains = (enrichment?.sources ?? []).join(', ');

        runs.push({ text: `${c.name} — `, options: { color: TEXT_COLOR } });
        if (url) {
          runs.push({ text: url, options: { hyperlink: { url }, color: ACCENT_COLOR, underline: true } });
        } else {
          runs.push({ text: '(대표 영상 없음)', options: { color: SUBTLE_COLOR } });
        }
        runs.push({
          text: domains ? ` · ${domains}` : '',
          options: { color: SUBTLE_COLOR, breakLine: true, paraSpaceAfter: 6 },
        });
      });

      slide.addText(runs, {
        x: SLIDE_X, y: 1.0, w: SLIDE_W, h: 5.8,
        fontSize: 11, fontFace: 'Arial', color: TEXT_COLOR,
        valign: 'top', lineSpacingMultiple: 1.3, fit: 'shrink',
      });
    }
  }
}

export const eventCompanyReportService = new EventCompanyReportService();
