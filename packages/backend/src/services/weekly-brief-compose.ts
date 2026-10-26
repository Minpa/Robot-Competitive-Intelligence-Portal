/**
 * 주간 브리프 구성 — 순수 함수 모음 (DB·AI 접근 없음).
 *
 * 수집 결과(CollectedWeek)와 AI 선택(선택 사항)을 받아 WeeklyBriefPayload 를 조립한다.
 * 큰 숫자·증감·근거는 전부 서버 집계값이고, AI 는 후보 선택과 문장만 쓴다(숫자 가드로 검증).
 * 도메인 비중은 새 분류기를 만들지 않고 tech-trend-report.service 의 matchesDomain* 를 재사용한다.
 *
 * 입력 행의 제목은 수집 단계에서 이미 HTML 엔티티가 복원되어 있다(이 모듈은 event-video-brief 를 import 하지 않는다).
 */

import {
  getDomainFocus,
  matchesDomainSecondary,
  matchesDomainVideo,
  type ArticleRow,
  type TechTrendDomain,
} from './tech-trend-report.service.js';
import type { WeekRange } from './weekly-brief-period.js';
import { isoWeekInfo } from './weekly-brief-period.js';
import type {
  BriefDomainKey,
  WeeklyArticleItem,
  WeeklyBriefCounts,
  WeeklyBriefDeltas,
  WeeklyBriefPayload,
  WeeklyBriefStatusCode,
  WeeklyCiChange,
  WeeklyEvidence,
  WeeklyKeyMessage,
  WeeklyKeyword,
  WeeklyPaperItem,
  WeeklyTopVideo,
  WeeklyVideoItem,
} from '../types/weekly-brief.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 점수·임계값 상수 — 튜닝하기 쉽게 한곳에 둔다. */
export const WEEKLY_BRIEF_SCORING = {
  domainShare: { minNumerator: 5, minDenominator: 20, base: 50, deltaWeight: 3, deltaCap: 30, shareDivisor: 5, shareCap: 10, prevDenominatorMin: 20 },
  keywordSurge: { minCount: 5, minPrevCount: 3, minAbsDeltaPct: 20, base: 45, divisor: 4, cap: 35 },
  ciChange: { base: 40, confidence: { A: 20, B: 15, C: 8, D: 2, F: 0 } as Record<string, number>, valueChanged: 10, validSource: 5, maxCandidates: 2 },
  topCompany: { minCount: 8, base: 35, divisor: 4, cap: 25 },
  volumeChange: { minCur: 20, minPrev: 20, minAbsDeltaPct: 10, base: 30, divisor: 3, cap: 20 },
  video: { viewsWeight: 10, analyzedBonus: 5, thumbnailBonus: 2, bucketCap: 3, channelCap: 2, max: 8 },
  article: { domainMatch: 3, summary: 1, company: 1, sourceCap: 3, max: 12 },
  paper: { domainMatch: 3, summary: 1, bucketCap: 3, max: 8, authorsShown: 3, authorsText: 120 },
  ci: { max: 4, perCompany: 2, lowConfidenceFillTo: 2 },
  keyword: { minCount: 5, repMinPrevCount: 3, max: 8, flatBelowPct: 5 },
  messages: { max: 3, min: 2, ciChangeMax: 2 },
  text: { headline: 60, caption: 50, note: 80, line: 90, ciValue: 120, bigValue: 24, evidenceTitle: 120 },
} as const;

/** 도메인 배지 우선순위 */
export const BADGE_DOMAIN_ORDER: readonly BriefDomainKey[] = ['actuator', 'hand', 'rfm', 'production', 'expo'];
const ALL_DOMAINS: readonly TechTrendDomain[] = ['hand', 'rfm', 'actuator', 'expo', 'production'];

export const DOMAIN_SHORT_LABELS: Record<BriefDomainKey, string> = {
  hand: '핸드',
  rfm: 'RFM',
  actuator: '액추에이터',
  expo: '전시',
  production: '양산',
};

const NON_NEWS_SOURCES = ['arxiv', 'github', 'sec_edgar', 'patent'];
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be'];
const VIDEO_ID_RE = /^[\w-]{11}$/;

// ─────────────────────────────────────────────────────────────────────────────
// 입력 타입 (collect 가 만든다)
// ─────────────────────────────────────────────────────────────────────────────

/** 수집된 기사/영상 행 — ArticleRow 에 회사 id 와 기준 시각을 더한 것 */
export interface BriefRow extends ArticleRow {
  companyId: string | null;
  /** COALESCE(published_at, collected_at) 의 ISO */
  ts: string;
}

export interface KeywordCount {
  keywordId: string;
  term: string;
  count: number;
  prevCount: number;
}

export interface CompanyCount {
  companyId: string;
  name: string;
  count: number;
  prevCount: number;
}

export interface CiChangeRow {
  valueId: string;
  company: string;
  robot: string | null;
  layer: string | null;
  item: string;
  before: string | null;
  after: string;
  confidence: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  changedAt: string;
  /** 이력상 값이 실제로 바뀐 건이면 true, updated_at 만 갱신된 건이면 false */
  valueChanged: boolean;
}

export interface KeywordEvidenceRow {
  articleId: string;
  title: string;
  url: string | null;
  source: string | null;
}

export interface CollectedWeek {
  range: WeekRange;
  prevRange: WeekRange;
  rows: BriefRow[];
  prevRows: BriefRow[];
  truncated: boolean;
  videosAnalyzed: number;
  prevVideosAnalyzed: number;
  alerts: number;
  prevAlerts: number;
  newRobots: number | null;
  ciChanges: CiChangeRow[];
  ciUpdates: number;
  prevCiUpdates: number;
  keywords: KeywordCount[];
  keywordEvidence: Record<string, KeywordEvidenceRow[]>;
  companies: CompanyCount[];
  /** 선택 수집기 오류 코드(`*_failed`)와 `rows_truncated` 등 */
  warnings: string[];
}

export interface RawAiSelection {
  candidateId?: unknown;
  headline?: unknown;
  caption?: unknown;
  note?: unknown;
}

export interface AiSelection {
  /** AI 가 돌려준 JSON 의 selections (검증 전) */
  selections: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// 작은 유틸
// ─────────────────────────────────────────────────────────────────────────────

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 전주 대비 증감률(%) — 소수 1자리, 전주 값이 0 이하이면 null */
export function pctChange(cur: number, prev: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  return round1(((cur - prev) / prev) * 100);
}

function truncateText(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : chars.slice(0, Math.max(0, max - 1)).join('') + '…';
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** 첫 문장을 max 자(말줄임 포함)로 자른다. 비어 있으면 null. */
export function firstSentence(text: string | null | undefined, max: number = WEEKLY_BRIEF_SCORING.text.line): string | null {
  if (typeof text !== 'string') return null;
  const t = normalizeSpaces(text);
  if (!t) return null;
  const m = /^(.+?[.!?。！？])(?:\s|$)/.exec(t);
  return truncateText(m?.[1] ?? t, max);
}

function toIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function tsMs(row: BriefRow): number {
  const t = new Date(row.ts).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function meta(row: ArticleRow): Record<string, any> {
  return (row.extractedMetadata ?? {}) as Record<string, any>;
}

/** https 만 허용, 자격증명(user:pass@) 거부, 길이 2000 초과 거부 */
export function safeHttpsUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2000) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    return url;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 분류
// ─────────────────────────────────────────────────────────────────────────────

export type RowKind = 'video' | 'paper' | 'news';

/** 영상(product_type='video') → 논문(source='arxiv') → 뉴스(그 외, github·sec_edgar·patent 제외). 나머지는 null. */
export function classifyRow(row: Pick<ArticleRow, 'productType' | 'source'>): RowKind | null {
  if (row.productType === 'video') return 'video';
  const source = row.source ?? '';
  if (source === 'arxiv') return 'paper';
  if (NON_NEWS_SOURCES.includes(source)) return null;
  return 'news';
}

export function splitRows(rows: readonly BriefRow[]): { videos: BriefRow[]; papers: BriefRow[]; news: BriefRow[] } {
  const videos: BriefRow[] = [];
  const papers: BriefRow[] = [];
  const news: BriefRow[] = [];
  for (const r of rows) {
    const k = classifyRow(r);
    if (k === 'video') videos.push(r);
    else if (k === 'paper') papers.push(r);
    else if (k === 'news') news.push(r);
  }
  return { videos, papers, news };
}

/** 영상 도메인 배지 — actuator → hand → rfm → production → expo 중 처음 맞는 키 (AI 가 'none' 으로 판정한 축은 건너뜀) */
export function videoDomainBadge(row: ArticleRow): BriefDomainKey | null {
  for (const d of BADGE_DOMAIN_ORDER) {
    if (matchesDomainVideo(d, row) && getDomainFocus(d, row) !== 'none') return d;
  }
  return null;
}

/** 기사 도메인 배지 — matchesDomainSecondary 로 같은 우선순위 */
export function articleDomainBadge(row: ArticleRow): BriefDomainKey | null {
  for (const d of BADGE_DOMAIN_ORDER) {
    if (matchesDomainSecondary(d, row)) return d;
  }
  return null;
}

/** AI 판정(domainFocus)이 하나 이상 있고 전부 none 이면 true */
export function isAllNoneJudged(row: ArticleRow): boolean {
  const levels = ALL_DOMAINS.map((d) => getDomainFocus(d, row)).filter((l) => l !== null);
  return levels.length > 0 && levels.every((l) => l === 'none');
}

// ─────────────────────────────────────────────────────────────────────────────
// 영상 URL / 썸네일
// ─────────────────────────────────────────────────────────────────────────────

function extractVideoIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]{11})/) ?? url.match(/youtu\.be\/([\w-]{11})/);
  return m?.[1] ?? null;
}

/** ytimg 썸네일만 허용 → videoId → URL 에서 추출 → null */
export function resolveThumbnail(metaObj: { thumbnail?: unknown; videoId?: unknown } | null | undefined, url: string | null | undefined): string | null {
  const thumb = metaObj?.thumbnail;
  if (typeof thumb === 'string' && thumb) {
    try {
      const u = new URL(thumb);
      if (u.protocol === 'https:' && u.hostname === 'i.ytimg.com' && !u.username && !u.password) return thumb;
    } catch {
      /* 아래 폴백 */
    }
  }
  const vid = metaObj?.videoId;
  if (typeof vid === 'string' && VIDEO_ID_RE.test(vid)) return `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
  const fromUrl = extractVideoIdFromUrl(url);
  if (fromUrl) return `https://i.ytimg.com/vi/${fromUrl}/mqdefault.jpg`;
  return null;
}

/** 유튜브 호스트의 https 링크만 허용, 아니면 videoId 로 생성, 그것도 안 되면 null */
export function resolveVideoUrl(url: string | null | undefined, videoId: string | null | undefined): string | null {
  if (typeof url === 'string' && url) {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && YOUTUBE_HOSTS.includes(u.hostname) && !u.username && !u.password && url.length <= 2000) return url;
    } catch {
      /* 아래 폴백 */
    }
  }
  if (typeof videoId === 'string' && VIDEO_ID_RE.test(videoId)) return `https://www.youtube.com/watch?v=${videoId}`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 영상 / 기사 / CI / 키워드 선별
// ─────────────────────────────────────────────────────────────────────────────

function viewsOf(row: ArticleRow): number | null {
  const v = meta(row).views;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

function channelOf(row: ArticleRow): string | null {
  const c = meta(row).channel;
  return typeof c === 'string' && c.trim() ? c.trim() : null;
}

function isAnalyzed(row: ArticleRow): boolean {
  const a = meta(row).geminiAnalyzedAt;
  return typeof a === 'string' && a.length > 0;
}

function toVideoItem(row: BriefRow): WeeklyVideoItem {
  const m = meta(row);
  return {
    id: row.id,
    title: row.title,
    channel: channelOf(row),
    publishedAt: toIso(row.publishedAt),
    views: viewsOf(row),
    url: resolveVideoUrl(row.url, typeof m.videoId === 'string' ? m.videoId : null),
    thumbnail: resolveThumbnail(m, row.url),
    analyzed: isAnalyzed(row),
    domain: videoDomainBadge(row),
  };
}

function byViewsThenRecent(a: BriefRow, b: BriefRow): number {
  return (viewsOf(b) ?? -1) - (viewsOf(a) ?? -1) || tsMs(b) - tsMs(a) || a.id.localeCompare(b.id);
}

/** 가장 많이 본 영상 1건 — 조회수 큰 순(동률 최신, id 오름차순). 조회수 있는 영상이 없으면 분석된 최신 1건, 그것도 없으면 null */
export function selectTopVideo(rows: readonly BriefRow[]): WeeklyTopVideo | null {
  const candidates = rows.filter((r) => classifyRow(r) === 'video' && !isAllNoneJudged(r));
  const withViews = candidates.filter((r) => viewsOf(r) !== null).sort(byViewsThenRecent);
  let pick: BriefRow | undefined = withViews[0];
  if (!pick) {
    pick = candidates.filter(isAnalyzed).sort((a, b) => tsMs(b) - tsMs(a) || a.id.localeCompare(b.id))[0];
  }
  if (!pick) return null;
  const m = meta(pick);
  const dur = m.geminiAnalysis?.durationSec;
  return {
    ...toVideoItem(pick),
    durationSec: typeof dur === 'number' && Number.isFinite(dur) ? dur : null,
    analysisLine: firstSentence(m.geminiAnalysis?.summaryKo),
  };
}

export function videoScore(row: ArticleRow): number {
  const s = WEEKLY_BRIEF_SCORING.video;
  const views = viewsOf(row) ?? 0;
  const thumb = resolveThumbnail(meta(row), row.url) ? s.thumbnailBonus : 0;
  return Math.log10(views + 1) * s.viewsWeight + (isAnalyzed(row) ? s.analyzedBonus : 0) + thumb;
}

/** 영상 상위 8건 — 도메인 버킷당 3건, 채널당 2건. 부족하면 버킷 상한 → 채널 상한 순으로 완화 */
export function selectVideos(rows: readonly BriefRow[], excludeId: string | null = null): WeeklyVideoItem[] {
  const s = WEEKLY_BRIEF_SCORING.video;
  const scored = rows
    .filter((r) => classifyRow(r) === 'video' && r.id !== excludeId && !isAllNoneJudged(r))
    .map((r) => ({ row: r, score: videoScore(r), bucket: videoDomainBadge(r) ?? 'other', channel: channelOf(r) }))
    .sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));

  const picked = new Set<string>();
  const bucketCount = new Map<string, number>();
  const channelCount = new Map<string, number>();
  const chosen: typeof scored = [];

  const phase = (bucketLimit: boolean, channelLimit: boolean) => {
    for (const c of scored) {
      if (chosen.length >= s.max) return;
      if (picked.has(c.row.id)) continue;
      if (bucketLimit && (bucketCount.get(c.bucket) ?? 0) >= s.bucketCap) continue;
      if (channelLimit && c.channel && (channelCount.get(c.channel) ?? 0) >= s.channelCap) continue;
      picked.add(c.row.id);
      bucketCount.set(c.bucket, (bucketCount.get(c.bucket) ?? 0) + 1);
      if (c.channel) channelCount.set(c.channel, (channelCount.get(c.channel) ?? 0) + 1);
      chosen.push(c);
    }
  };
  phase(true, true);
  if (chosen.length < s.max) phase(false, true);
  if (chosen.length < s.max) phase(false, false);

  chosen.sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));
  return chosen.map((c) => toVideoItem(c.row));
}

/** 기사 상위 12건 — 출처당 최대 3건 하드 상한(못 채워도 풀지 않음). https 가 아닌 URL 은 제외 */
export function selectArticles(rows: readonly BriefRow[], showSummary: boolean = true): WeeklyArticleItem[] {
  const s = WEEKLY_BRIEF_SCORING.article;
  const news = rows.filter((r) => classifyRow(r) === 'news' && safeHttpsUrl(r.url) !== null);
  if (news.length === 0) return [];
  const times = news.map(tsMs);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const recency = (r: BriefRow) => (maxT > minT ? (tsMs(r) - minT) / (maxT - minT) : 1);
  const scored = news
    .map((r) => {
      const domain = articleDomainBadge(r);
      const score =
        (domain ? s.domainMatch : 0) + (r.summary && r.summary.trim() ? s.summary : 0) + (r.companyId ? s.company : 0) + recency(r);
      return { row: r, domain, score };
    })
    .sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));

  const perSource = new Map<string, number>();
  const out: WeeklyArticleItem[] = [];
  for (const c of scored) {
    if (out.length >= s.max) break;
    const source = c.row.source ?? '';
    if ((perSource.get(source) ?? 0) >= s.sourceCap) continue;
    perSource.set(source, (perSource.get(source) ?? 0) + 1);
    out.push({
      id: c.row.id,
      title: c.row.title,
      source,
      publishedAt: toIso(c.row.publishedAt),
      url: c.row.url as string,
      summaryLine: showSummary ? firstSentence(c.row.summary) : null,
      domain: c.domain,
    });
  }
  return out;
}

const ARXIV_ABS_RE = /\/abs\/((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?)/;
const ARXIV_ID_ONLY_RE = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/;

/** https + 호스트 arxiv.org 만 허용 (www. 등 다른 호스트 거부) */
export function safeArxivUrl(url: string | null | undefined): string | null {
  const safe = safeHttpsUrl(url);
  if (!safe) return null;
  try {
    return new URL(safe).hostname === 'arxiv.org' ? safe : null;
  } catch {
    return null;
  }
}

/** url `arxiv.org/abs/{id}` 에서 먼저, 없으면 metadata.arxivId 에서 (형식이 맞을 때만) */
export function resolveArxivId(url: string | null | undefined, metaObj: { arxivId?: unknown } | null | undefined): string | null {
  if (typeof url === 'string') {
    const m = ARXIV_ABS_RE.exec(url);
    if (m) return m[1]!;
  }
  const id = metaObj?.arxivId;
  return typeof id === 'string' && ARXIV_ID_ONLY_RE.test(id.trim()) ? id.trim() : null;
}

/** extracted_metadata.authors → 배열이면 앞 3명 + "외 n명", 문자열이면 그대로(120자). 없으면 null */
export function formatAuthors(authors: unknown): string | null {
  const t = WEEKLY_BRIEF_SCORING.paper;
  if (typeof authors === 'string') {
    const text = normalizeSpaces(authors);
    return text ? truncateText(text, t.authorsText) : null;
  }
  if (!Array.isArray(authors)) return null;
  const names = authors.filter((a): a is string => typeof a === 'string').map(normalizeSpaces).filter((a) => a.length > 0);
  if (names.length === 0) return null;
  const shown = names.slice(0, t.authorsShown).join(', ');
  const rest = names.length - t.authorsShown;
  return truncateText(rest > 0 ? `${shown} 외 ${rest}명` : shown, t.authorsText);
}

/**
 * 논문 상위 8건 — 점수 (도메인 일치 3) + (summary 1) + 최신성(0~1).
 * 도메인 버킷(hand/actuator/rfm/production/expo/other)당 최대 3건, 8건이 안 차면 상한 해제.
 * url 은 https + 호스트 arxiv.org 만(아니면 제외). 동률은 ts 최신, id 오름차순.
 */
export function selectPapers(rows: readonly BriefRow[], showSummary: boolean = true): WeeklyPaperItem[] {
  const s = WEEKLY_BRIEF_SCORING.paper;
  const papers = rows.filter((r) => classifyRow(r) === 'paper' && safeArxivUrl(r.url) !== null);
  if (papers.length === 0) return [];
  const times = papers.map(tsMs);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const recency = (r: BriefRow) => (maxT > minT ? (tsMs(r) - minT) / (maxT - minT) : 1);
  const scored = papers
    .map((r) => {
      const domain = articleDomainBadge(r);
      const score = (domain ? s.domainMatch : 0) + (r.summary && r.summary.trim() ? s.summary : 0) + recency(r);
      return { row: r, domain, score };
    })
    .sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));

  const picked = new Set<string>();
  const bucketCount = new Map<string, number>();
  const chosen: typeof scored = [];
  const phase = (bucketLimit: boolean) => {
    for (const c of scored) {
      if (chosen.length >= s.max) return;
      if (picked.has(c.row.id)) continue;
      const bucket = c.domain ?? 'other';
      if (bucketLimit && (bucketCount.get(bucket) ?? 0) >= s.bucketCap) continue;
      picked.add(c.row.id);
      bucketCount.set(bucket, (bucketCount.get(bucket) ?? 0) + 1);
      chosen.push(c);
    }
  };
  phase(true);
  if (chosen.length < s.max) phase(false);

  chosen.sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));
  return chosen.map((c) => {
    const m = meta(c.row);
    return {
      id: c.row.id,
      title: c.row.title,
      authors: formatAuthors(m.authors),
      publishedAt: toIso(c.row.publishedAt),
      url: c.row.url as string,
      arxivId: resolveArxivId(c.row.url, m),
      domain: c.domain,
      summaryLine: showSummary ? firstSentence(c.row.summary) : null,
    };
  });
}

const CONFIDENCE_RANK: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };

function normalizeConfidence(c: string | null | undefined): WeeklyCiChange['confidence'] {
  return c === 'A' || c === 'B' || c === 'C' || c === 'D' || c === 'F' ? c : 'D';
}

/**
 * CI 변경 상위 4건 — 신뢰도 > 값 변경 여부 > 출처 URL 유효 > 최신 순, 회사당 최대 2건.
 * D/F 는 A~C 로 채운 개수가 2건 미만일 때만 2건이 될 때까지 채운다.
 */
export function selectCiChanges(rows: readonly CiChangeRow[]): { ciChanges: WeeklyCiChange[]; companies: number } {
  const s = WEEKLY_BRIEF_SCORING.ci;
  const sorted = rows
    .filter((r) => r.after && r.after.trim())
    .map((r) => ({ r, conf: normalizeConfidence(r.confidence), src: safeHttpsUrl(r.sourceUrl) }))
    .sort(
      (a, b) =>
        (CONFIDENCE_RANK[a.conf] ?? 9) - (CONFIDENCE_RANK[b.conf] ?? 9) ||
        Number(b.r.valueChanged) - Number(a.r.valueChanged) ||
        Number(b.src !== null) - Number(a.src !== null) ||
        new Date(b.r.changedAt).getTime() - new Date(a.r.changedAt).getTime() ||
        a.r.valueId.localeCompare(b.r.valueId),
    );
  const perCompany = new Map<string, number>();
  const chosen: typeof sorted = [];
  const take = (c: (typeof sorted)[number]): boolean => {
    if ((perCompany.get(c.r.company) ?? 0) >= s.perCompany) return false;
    perCompany.set(c.r.company, (perCompany.get(c.r.company) ?? 0) + 1);
    chosen.push(c);
    return true;
  };
  for (const c of sorted) {
    if (chosen.length >= s.max) break;
    if (c.conf === 'D' || c.conf === 'F') continue;
    take(c);
  }
  if (chosen.length < s.lowConfidenceFillTo) {
    for (const c of sorted) {
      if (chosen.length >= s.lowConfidenceFillTo) break;
      if (c.conf === 'D' || c.conf === 'F') take(c);
    }
  }
  // 신뢰도 우선 정렬 유지
  chosen.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
  const ciChanges: WeeklyCiChange[] = chosen.map(({ r, conf, src }) => ({
    id: r.valueId,
    company: r.company,
    robot: r.robot,
    layer: r.layer,
    item: r.item,
    before: r.before ? truncateText(r.before, WEEKLY_BRIEF_SCORING.text.ciValue) : null,
    after: truncateText(r.after, WEEKLY_BRIEF_SCORING.text.ciValue),
    confidence: conf,
    sourceName: r.sourceName ? truncateText(normalizeSpaces(r.sourceName), 120) : null,
    sourceUrl: src,
    changedAt: toIso(r.changedAt) ?? r.changedAt,
  }));
  return { ciChanges, companies: new Set(rows.map((r) => r.company)).size };
}

export function keywordDirection(count: number, prevCount: number): WeeklyKeyword['direction'] {
  if (prevCount === 0) return 'new';
  const pct = ((count - prevCount) / prevCount) * 100;
  if (Math.abs(pct) < WEEKLY_BRIEF_SCORING.keyword.flatBelowPct) return 'flat';
  return pct > 0 ? 'up' : 'down';
}

function toKeyword(k: KeywordCount): WeeklyKeyword {
  return {
    keywordId: k.keywordId,
    term: k.term,
    count: k.count,
    prevCount: k.prevCount,
    deltaPct: pctChange(k.count, k.prevCount),
    direction: keywordDirection(k.count, k.prevCount),
  };
}

/** 대표 키워드: 이번 주 count≥5 이고 prevCount≥3 인 것 중 deltaPct 가 가장 큰 것. 없으면 null. */
export function pickRepresentativeKeyword(all: readonly KeywordCount[]): KeywordCount | null {
  const s = WEEKLY_BRIEF_SCORING.keyword;
  const eligible = all.filter((k) => k.count >= s.minCount && k.prevCount >= s.repMinPrevCount);
  if (eligible.length === 0) return null;
  return [...eligible].sort(
    (a, b) =>
      (pctChange(b.count, b.prevCount) ?? -Infinity) - (pctChange(a.count, a.prevCount) ?? -Infinity) ||
      b.count - a.count ||
      a.term.localeCompare(b.term),
  )[0]!;
}

/** keywords[0]=대표(없으면 count 최대), 나머지는 count 내림차순 최대 7건 */
export function selectKeywords(all: readonly KeywordCount[]): { keywords: WeeklyKeyword[]; representative: KeywordCount | null } {
  const s = WEEKLY_BRIEF_SCORING.keyword;
  const eligible = all.filter((k) => k.count >= s.minCount);
  if (eligible.length === 0) return { keywords: [], representative: null };
  const byCount = (a: KeywordCount, b: KeywordCount) => b.count - a.count || a.term.localeCompare(b.term);
  const rep = pickRepresentativeKeyword(eligible);
  const head = rep ?? [...eligible].sort(byCount)[0]!;
  const rest = eligible.filter((k) => k.keywordId !== head.keywordId).sort(byCount).slice(0, s.max - 1);
  return { keywords: [head, ...rest].map(toKeyword), representative: rep };
}

// ─────────────────────────────────────────────────────────────────────────────
// 후보
// ─────────────────────────────────────────────────────────────────────────────

export type CandidateType = WeeklyKeyMessage['candidateType'];

export interface Candidate {
  id: string;
  type: CandidateType;
  kind: WeeklyKeyMessage['kind'];
  score: number;
  /** 프롬프트용 대상 이름 (도메인 라벨, 키워드, 회사 등) */
  label: string;
  bigNumber: { value: string; unit: string; caption: string };
  delta: { value: string; unit: string; label: string } | null;
  basis: string;
  evidence: WeeklyEvidence[];
  rule: { headline: string; caption: string };
  /** AI 문장에 쓸 수 있는 숫자(포맷된 문자열, 부호 제외) */
  allowedNumbers: string[];
  /** 프롬프트에 사실값으로 전달하는 추가 정보 */
  extra: Record<string, string | number | null>;
}

function signed(n: number, digits: number): string {
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}` : v;
}

/** 숫자 하나가 문장에 나올 수 있는 표기들 (부호 제외) */
export function numberForms(n: number): string[] {
  const abs = Math.abs(n);
  const out = new Set<string>();
  out.add(String(abs));
  out.add(abs.toFixed(1));
  out.add(String(Math.round(abs)));
  out.add(Math.round(abs).toLocaleString('en-US'));
  if (!Number.isInteger(abs)) out.add(abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  return [...out];
}

/** 문자열 안의 숫자 토큰(\d[\d,.]*)을 정규화해서 뽑는다 (끝의 . , 는 문장부호로 보고 제거) */
export function extractNumberTokens(text: string): string[] {
  return (text.match(/\d[\d,.]*/g) ?? []).map((t) => t.replace(/[.,]+$/, '')).filter((t) => t.length > 0);
}

function allowedFrom(numbers: number[], texts: string[]): string[] {
  const set = new Set<string>();
  for (const n of numbers) for (const f of numberForms(n)) set.add(f);
  for (const t of texts) for (const tok of extractNumberTokens(t)) set.add(tok);
  return [...set];
}

function clampHeadline(s: string): string {
  return truncateText(s, WEEKLY_BRIEF_SCORING.text.headline);
}
function clampCaption(s: string): string {
  return truncateText(s, WEEKLY_BRIEF_SCORING.text.caption);
}

function evTitle(s: string): string {
  return truncateText(normalizeSpaces(s), WEEKLY_BRIEF_SCORING.text.evidenceTitle);
}

function videoEvidence(row: BriefRow): WeeklyEvidence {
  const m = meta(row);
  return {
    type: 'video',
    id: row.id,
    title: evTitle(row.title),
    url: resolveVideoUrl(row.url, typeof m.videoId === 'string' ? m.videoId : null),
    label: channelOf(row),
  };
}

function articleEvidence(row: BriefRow): WeeklyEvidence {
  return { type: 'article', id: row.id, title: evTitle(row.title), url: safeHttpsUrl(row.url), label: row.source ?? null };
}

function newestFirst(a: BriefRow, b: BriefRow): number {
  return tsMs(b) - tsMs(a) || a.id.localeCompare(b.id);
}

function topVideosByViews(rows: readonly BriefRow[], n: number): BriefRow[] {
  return rows.filter((r) => !isAllNoneJudged(r)).sort(byViewsThenRecent).slice(0, n);
}

interface DomainShareStat {
  domain: BriefDomainKey;
  num: number;
  den: number;
  videoNum: number;
  secondNum: number;
  /** 분자의 두 번째 항목 이름 — 핸드·RFM·액추에이터는 논문, 전시·양산은 기사 */
  secondKind: '논문' | '기사';
  denVideos: number;
  denNews: number;
  denPapers: number;
  share: number;
  prevShare: number | null;
  deltaPp: number | null;
  videoRows: BriefRow[];
  secondRows: BriefRow[];
}

function domainStat(domain: TechTrendDomain, rows: readonly BriefRow[]): Omit<DomainShareStat, 'prevShare' | 'deltaPp' | 'domain'> {
  const { videos, papers, news } = splitRows(rows);
  const videoRows = videos.filter((r) => matchesDomainVideo(domain, r) && getDomainFocus(domain, r) !== 'none');
  const secondPool = domain === 'hand' || domain === 'rfm' || domain === 'actuator' ? papers : news;
  const secondRows = secondPool.filter((r) => matchesDomainSecondary(domain, r));
  const den = videos.length + papers.length + news.length;
  const num = videoRows.length + secondRows.length;
  return {
    num,
    den,
    videoNum: videoRows.length,
    secondNum: secondRows.length,
    secondKind: secondPool === papers ? '논문' : '기사',
    denVideos: videos.length,
    denNews: news.length,
    denPapers: papers.length,
    share: den > 0 ? (num / den) * 100 : 0,
    videoRows,
    secondRows,
  };
}

export function domainShareCandidate(input: Pick<CollectedWeek, 'rows' | 'prevRows'>): Candidate | null {
  const s = WEEKLY_BRIEF_SCORING.domainShare;
  let best: { stat: DomainShareStat; score: number } | null = null;
  for (const d of BADGE_DOMAIN_ORDER) {
    const cur = domainStat(d, input.rows);
    if (cur.num < s.minNumerator || cur.den < s.minDenominator) continue;
    const prev = domainStat(d, input.prevRows);
    const prevShare = prev.den >= s.prevDenominatorMin ? prev.share : null;
    const deltaPp = prevShare === null ? null : round1(cur.share - prevShare);
    const score = s.base + Math.min(s.deltaCap, Math.abs(deltaPp ?? 0) * s.deltaWeight) + Math.min(s.shareCap, cur.share / s.shareDivisor);
    if (!best || score > best.score) best = { stat: { domain: d, ...cur, prevShare, deltaPp }, score };
  }
  if (!best) return null;
  const st = best.stat;
  const label = DOMAIN_SHORT_LABELS[st.domain];
  const share = Math.round(st.share);
  const caption = `${label} 관련 ${st.num}건 / 전체 ${st.den}건`;
  const evidence: WeeklyEvidence[] = [
    ...topVideosByViews(st.videoRows, 2).map(videoEvidence),
    ...[...st.secondRows].sort(newestFirst).slice(0, 1).map(articleEvidence),
  ].slice(0, 3);
  return {
    id: `domain_share:${st.domain}`,
    type: 'domain_share',
    kind: 'stat',
    score: best.score,
    label,
    bigNumber: { value: String(share), unit: '%', caption: clampCaption(caption) },
    delta: st.deltaPp === null ? null : { value: signed(st.deltaPp, 1), unit: '%p', label: '지난주 대비' },
    basis: `근거: 도메인 태그 집계 (영상 ${st.videoNum} · ${st.secondKind} ${st.secondNum} / 전체 영상 ${st.denVideos} · 기사 ${st.denNews} · 논문 ${st.denPapers})`,
    evidence,
    rule: { headline: clampHeadline(`이번 주 수집된 영상·기사 중 ${share}%가 ${label} 주제였습니다`), caption: clampCaption(caption) },
    allowedNumbers: allowedFrom(
      [share, st.share, st.num, st.den, st.videoNum, st.secondNum, st.denVideos, st.denNews, st.denPapers, ...(st.deltaPp !== null ? [st.deltaPp] : []), ...(st.prevShare !== null ? [st.prevShare] : [])],
      [label],
    ),
    extra: { domain: st.domain, numerator: st.num, denominator: st.den, previousSharePct: st.prevShare === null ? null : round1(st.prevShare) },
  };
}

export function keywordSurgeCandidate(input: Pick<CollectedWeek, 'keywords' | 'keywordEvidence'>): Candidate | null {
  const s = WEEKLY_BRIEF_SCORING.keywordSurge;
  const rep = pickRepresentativeKeyword(input.keywords);
  if (!rep) return null;
  const deltaPct = pctChange(rep.count, rep.prevCount);
  if (rep.count < s.minCount || rep.prevCount < s.minPrevCount || deltaPct === null || Math.abs(deltaPct) < s.minAbsDeltaPct) return null;
  const pct = Math.round(deltaPct);
  const caption = `${rep.prevCount}회 → ${rep.count}회`;
  const articles = (input.keywordEvidence[rep.keywordId] ?? []).slice(0, 2).map<WeeklyEvidence>((a) => ({
    type: 'article',
    id: a.articleId,
    title: evTitle(a.title),
    url: safeHttpsUrl(a.url),
    label: a.source,
  }));
  return {
    id: `keyword_surge:${rep.keywordId}`,
    type: 'keyword_surge',
    kind: 'stat',
    score: s.base + Math.min(s.cap, Math.abs(deltaPct) / s.divisor),
    label: rep.term,
    bigNumber: { value: signed(pct, 0), unit: '%', caption },
    delta: null,
    basis: `근거: 키워드 빈도 집계 (기사 키워드 합산, 이번 주 ${rep.count}회 · 지난주 ${rep.prevCount}회)`,
    evidence: [
      { type: 'keyword', id: rep.keywordId, title: evTitle(rep.term), url: null, label: `${rep.count}회` } satisfies WeeklyEvidence,
      ...articles,
    ].slice(0, 3),
    rule: {
      headline: clampHeadline(`"${rep.term}" 언급이 지난주 대비 ${Math.abs(pct)}% ${deltaPct >= 0 ? '증가' : '감소'}했습니다`),
      caption: clampCaption(caption),
    },
    allowedNumbers: allowedFrom([pct, deltaPct, rep.count, rep.prevCount], [rep.term]),
    extra: { term: rep.term, count: rep.count, previousCount: rep.prevCount, changePct: deltaPct },
  };
}

export function ciChangeScore(c: WeeklyCiChange, valueChanged: boolean): number {
  const s = WEEKLY_BRIEF_SCORING.ciChange;
  return s.base + (s.confidence[c.confidence] ?? 0) + (valueChanged ? s.valueChanged : 0) + (safeHttpsUrl(c.sourceUrl) ? s.validSource : 0);
}

export function ciChangeCandidates(input: Pick<CollectedWeek, 'ciChanges'>): Candidate[] {
  const s = WEEKLY_BRIEF_SCORING.ciChange;
  const { ciChanges } = selectCiChanges(input.ciChanges);
  const changedById = new Map(input.ciChanges.map((r) => [r.valueId, r.valueChanged]));
  return ciChanges
    .map((c) => {
      const score = ciChangeScore(c, changedById.get(c.id) ?? false);
      const afterShort = truncateText(c.after, WEEKLY_BRIEF_SCORING.text.bigValue);
      const suffix = ` · 신뢰도 ${c.confidence}`;
      const main = c.before ? `${truncateText(c.before, 14)} → ${truncateText(c.after, 18)}` : truncateText(c.after, 30);
      const caption = clampCaption(`${truncateText(main, WEEKLY_BRIEF_SCORING.text.caption - Array.from(suffix).length)}${suffix}`);
      const evidence: WeeklyEvidence = {
        type: 'ci',
        id: c.id,
        title: evTitle(`${c.company} · ${c.item}`),
        url: safeHttpsUrl(c.sourceUrl),
        label: c.company,
      };
      return {
        id: `ci_change:${c.id}`,
        type: 'ci_change' as const,
        kind: 'cause_effect' as const,
        score,
        label: `${c.company} ${c.item}`,
        bigNumber: { value: afterShort, unit: '', caption },
        delta: null,
        basis: `근거: CI 값 ${changedById.get(c.id) ? '변경 이력' : '갱신'} (신뢰도 ${c.confidence}${c.sourceName ? ` · 출처 ${truncateText(c.sourceName, 30)}` : ''})`,
        evidence: [evidence],
        rule: { headline: clampHeadline(`${c.company}의 ${c.item} 정보가 갱신되었습니다`), caption },
        allowedNumbers: allowedFrom([], [c.company, c.item, c.before ?? '', c.after, c.sourceName ?? '']),
        extra: { company: c.company, item: c.item, before: c.before, after: c.after, confidence: c.confidence },
      } satisfies Candidate;
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, s.maxCandidates);
}

export function topCompanyCandidate(input: Pick<CollectedWeek, 'rows' | 'companies'>): Candidate | null {
  const s = WEEKLY_BRIEF_SCORING.topCompany;
  const top = [...input.companies]
    .filter((c) => c.name && c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
  if (!top || top.count < s.minCount) return null;
  const deltaPct = pctChange(top.count, top.prevCount);
  const { videos, news } = splitRows(input.rows);
  const cv = videos.filter((r) => r.companyId === top.companyId);
  const cn = news.filter((r) => r.companyId === top.companyId);
  const caption = `지난주 ${top.prevCount}건`;
  return {
    id: `top_company:${top.companyId}`,
    type: 'top_company',
    kind: 'stat',
    score: s.base + Math.min(s.cap, Math.max(0, deltaPct ?? 0) / s.divisor),
    label: top.name,
    bigNumber: { value: String(top.count), unit: '건', caption: clampCaption(caption) },
    delta: deltaPct === null ? null : { value: signed(deltaPct, 1), unit: '%', label: '지난주 대비' },
    basis: `근거: 회사 태그 집계 (영상 ${cv.length} · 기사 ${cn.length})`,
    evidence: [...topVideosByViews(cv, 2).map(videoEvidence), ...[...cn].sort(newestFirst).slice(0, 1).map(articleEvidence)].slice(0, 3),
    rule: { headline: clampHeadline(`${top.name} 관련 기사·영상이 ${top.count}건으로 가장 많았습니다`), caption: clampCaption(caption) },
    allowedNumbers: allowedFrom([top.count, top.prevCount, ...(deltaPct !== null ? [deltaPct] : [])], [top.name]),
    extra: { company: top.name, count: top.count, previousCount: top.prevCount, changePct: deltaPct },
  };
}

export function volumeChangeCandidate(input: Pick<CollectedWeek, 'rows' | 'prevRows'>): Candidate | null {
  const s = WEEKLY_BRIEF_SCORING.volumeChange;
  const cur = splitRows(input.rows);
  const prev = splitRows(input.prevRows);
  const curTotal = cur.videos.length + cur.papers.length + cur.news.length;
  const prevTotal = prev.videos.length + prev.papers.length + prev.news.length;
  const pct = pctChange(curTotal, prevTotal);
  if (curTotal < s.minCur || prevTotal < s.minPrev || pct === null || Math.abs(pct) < s.minAbsDeltaPct) return null;
  const rounded = Math.round(pct);
  const caption = `${prevTotal}건 → ${curTotal}건`;
  return {
    id: 'volume_change:total',
    type: 'volume_change',
    kind: 'stat',
    score: s.base + Math.min(s.cap, Math.abs(pct) / s.divisor),
    label: '수집량',
    bigNumber: { value: signed(rounded, 0), unit: '%', caption: clampCaption(caption) },
    delta: null,
    basis: `근거: 수집 건수 집계 (영상 ${cur.videos.length} · 기사 ${cur.news.length} · 논문 ${cur.papers.length})`,
    evidence: [...topVideosByViews(cur.videos, 2).map(videoEvidence), ...[...cur.news].sort(newestFirst).slice(0, 1).map(articleEvidence)].slice(0, 3),
    rule: { headline: clampHeadline(`이번 주 수집량이 지난주 대비 ${Math.abs(rounded)}% ${pct >= 0 ? '증가' : '감소'}했습니다`), caption: clampCaption(caption) },
    allowedNumbers: allowedFrom([rounded, pct, curTotal, prevTotal, cur.videos.length, cur.news.length, cur.papers.length], []),
    extra: { total: curTotal, previousTotal: prevTotal, changePct: pct },
  };
}

/** 모든 적격 후보 (점수 내림차순, 동률은 id 오름차순) */
export function buildCandidates(input: CollectedWeek): Candidate[] {
  const out: Candidate[] = [];
  const push = (c: Candidate | null) => {
    if (c) out.push(c);
  };
  push(domainShareCandidate(input));
  push(keywordSurgeCandidate(input));
  out.push(...ciChangeCandidates(input));
  push(topCompanyCandidate(input));
  push(volumeChangeCandidate(input));
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function ruleSentence(candidate: Candidate): { headline: string; caption: string } {
  return { headline: candidate.rule.headline, caption: candidate.rule.caption };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 응답 검증
// ─────────────────────────────────────────────────────────────────────────────

export interface AcceptedAiSelection {
  candidateId: string;
  headline: string;
  caption: string;
  note: string | null;
}

export interface ValidatedAiSelection {
  /** 문장까지 유효한 AI 선택 */
  accepted: AcceptedAiSelection[];
  rejected: { id: string; reason: string }[];
  /** 유지할 후보 id 순서 — 문장이 폐기된 후보(규칙 문장으로 대체)도 포함 */
  order: string[];
}

function typeLimit(type: CandidateType): number {
  return type === 'ci_change' ? WEEKLY_BRIEF_SCORING.messages.ciChangeMax : 1;
}

/** 문장 하나 검사 — 문제가 있으면 사유, 없으면 null */
function checkSentence(text: string, max: number, allowed: ReadonlySet<string>): string | null {
  if (Array.from(text).length > max) return 'too_long';
  if (/[\r\n]/.test(text) || text.includes('<') || /http/i.test(text)) return 'forbidden_text';
  for (const tok of extractNumberTokens(text)) {
    if (!allowed.has(tok)) return 'number_not_allowed';
  }
  return null;
}

/**
 * AI 응답 검증.
 *  - 허용되지 않은 id, 중복 id, 유형 한도 초과, 3건 초과 선택 → 선택 자체를 폐기(order 에도 없음)
 *  - 길이 초과, `<`/`http`/줄바꿈, 후보 외 숫자 → 문장만 폐기(order 에는 남아 규칙 문장으로 대체)
 */
export function validateAiSelection(raw: unknown, candidates: readonly Candidate[]): ValidatedAiSelection {
  const result: ValidatedAiSelection = { accepted: [], rejected: [], order: [] };
  const list: unknown = Array.isArray(raw) ? raw : (raw as { selections?: unknown } | null)?.selections;
  if (!Array.isArray(list)) {
    result.rejected.push({ id: '*', reason: 'invalid_shape' });
    return result;
  }
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const typeCount = new Map<CandidateType, number>();
  for (const item of list) {
    const sel = (item ?? {}) as RawAiSelection;
    const id = typeof sel.candidateId === 'string' ? sel.candidateId : '';
    const cand = byId.get(id);
    if (!cand) {
      result.rejected.push({ id: id || '*', reason: 'unknown_candidate' });
      continue;
    }
    if (seen.has(id)) {
      result.rejected.push({ id, reason: 'duplicate_id' });
      continue;
    }
    if (result.order.length >= WEEKLY_BRIEF_SCORING.messages.max) {
      result.rejected.push({ id, reason: 'too_many' });
      continue;
    }
    if ((typeCount.get(cand.type) ?? 0) >= typeLimit(cand.type)) {
      result.rejected.push({ id, reason: 'type_limit' });
      continue;
    }
    seen.add(id);
    typeCount.set(cand.type, (typeCount.get(cand.type) ?? 0) + 1);
    result.order.push(id);

    const headline = typeof sel.headline === 'string' ? sel.headline.trim() : '';
    const caption = typeof sel.caption === 'string' ? sel.caption.trim() : '';
    const noteRaw = sel.note;
    const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;
    if (!headline || !caption) {
      result.rejected.push({ id, reason: 'empty_text' });
      continue;
    }
    if (noteRaw !== undefined && noteRaw !== null && typeof noteRaw !== 'string') {
      result.rejected.push({ id, reason: 'invalid_note' });
      continue;
    }
    const allowed = new Set(cand.allowedNumbers);
    const t = WEEKLY_BRIEF_SCORING.text;
    const problem =
      checkSentence(headline, t.headline, allowed) ??
      checkSentence(caption, t.caption, allowed) ??
      (note ? checkSentence(note, t.note, allowed) : null);
    if (problem) {
      result.rejected.push({ id, reason: problem });
      continue;
    }
    result.accepted.push({ candidateId: id, headline, caption, note });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 키 메시지 최종 선택 / 상태 판정 / payload 조립
// ─────────────────────────────────────────────────────────────────────────────

/** 후보를 점수순으로 훑으며 유형 한도를 지키고 최대 n개를 고른다 */
function fillByScore(candidates: readonly Candidate[], picked: Candidate[], target: number): void {
  const typeCount = new Map<CandidateType, number>();
  for (const p of picked) typeCount.set(p.type, (typeCount.get(p.type) ?? 0) + 1);
  for (const c of candidates) {
    if (picked.length >= target) break;
    if (picked.some((p) => p.id === c.id)) continue;
    if ((typeCount.get(c.type) ?? 0) >= typeLimit(c.type)) continue;
    picked.push(c);
    typeCount.set(c.type, (typeCount.get(c.type) ?? 0) + 1);
  }
}

export function toKeyMessage(c: Candidate, ai: AcceptedAiSelection | null): WeeklyKeyMessage {
  const rule = ruleSentence(c);
  return {
    id: c.id,
    candidateType: c.type,
    kind: c.kind,
    headline: ai ? ai.headline : rule.headline,
    bigNumber: { value: c.bigNumber.value, unit: c.bigNumber.unit, caption: ai ? ai.caption : rule.caption },
    delta: c.delta,
    basis: c.basis,
    evidence: c.evidence.slice(0, 3),
    note: ai ? ai.note : null,
    generatedBy: ai ? 'ai' : 'rule',
  };
}

/** 최종 키 메시지 0~3건 — AI 선택의 순서를 존중하고 부족하면 점수순 규칙 문장으로 채운다. stat 을 앞으로 안정 정렬. */
export function selectKeyMessages(candidates: readonly Candidate[], validated: ValidatedAiSelection | null): WeeklyKeyMessage[] {
  const max = WEEKLY_BRIEF_SCORING.messages.max;
  const min = WEEKLY_BRIEF_SCORING.messages.min;
  const picked: Candidate[] = [];
  const aiById = new Map<string, AcceptedAiSelection>();
  if (validated) {
    for (const a of validated.accepted) aiById.set(a.candidateId, a);
    for (const id of validated.order) {
      const c = candidates.find((x) => x.id === id);
      if (c && picked.length < max) picked.push(c);
    }
  }
  if (picked.length < min) fillByScore(candidates, picked, max);
  const messages = picked.map((c) => toKeyMessage(c, aiById.get(c.id) ?? null));
  // kind='stat' 을 앞으로 (안정 정렬)
  return [...messages.filter((m) => m.kind === 'stat'), ...messages.filter((m) => m.kind !== 'stat')];
}

export interface StatusInput {
  keyMessages: readonly Pick<WeeklyKeyMessage, 'generatedBy'>[];
  warnings: readonly string[];
  noData: boolean;
}

/** 상태 판정표 (failed 는 예외 경로에서만 서비스가 결정) */
export function decideStatus(input: StatusInput): Exclude<WeeklyBriefStatusCode, 'failed'> {
  if (input.noData) return 'partial';
  if (input.keyMessages.some((m) => m.generatedBy === 'rule')) return 'partial';
  if (input.warnings.some((w) => w.endsWith('_failed') || w === 'ai_disabled')) return 'partial';
  return 'ok';
}

export interface ComposeOptions {
  showArticleSummary?: boolean;
  /** 서비스가 덧붙이는 경고 (예: ai_disabled, ai_budget_exceeded) */
  extraWarnings?: string[];
}

export function isArticleSummaryEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.WEEKLY_BRIEF_SHOW_ARTICLE_SUMMARY?.trim().toLowerCase() !== 'false';
}

export function computeCounts(input: CollectedWeek): { counts: WeeklyBriefCounts; deltas: WeeklyBriefDeltas } {
  const cur = splitRows(input.rows);
  const prev = splitRows(input.prevRows);
  const counts: WeeklyBriefCounts = {
    articles: cur.news.length,
    videosNew: cur.videos.length,
    videosAnalyzed: input.videosAnalyzed,
    papers: cur.papers.length,
    ciUpdates: input.ciUpdates,
    alerts: input.alerts,
    ...(input.newRobots !== null ? { newRobots: input.newRobots } : {}),
  };
  const deltas: WeeklyBriefDeltas = {
    articles: pctChange(cur.news.length, prev.news.length),
    videosNew: pctChange(cur.videos.length, prev.videos.length),
    videosAnalyzed: pctChange(input.videosAnalyzed, input.prevVideosAnalyzed),
    papers: pctChange(cur.papers.length, prev.papers.length),
    ciUpdates: pctChange(input.ciUpdates, input.prevCiUpdates),
    alerts: pctChange(input.alerts, input.prevAlerts),
  };
  return { counts, deltas };
}

export interface ComposeResult {
  payload: WeeklyBriefPayload;
  status: Exclude<WeeklyBriefStatusCode, 'failed'>;
  stats: Record<string, unknown>;
  candidates: Candidate[];
}

/**
 * 수집 결과 + (선택) AI 선택 → payload.
 * ai 가 null 이면 전부 규칙 문장이다. 어떤 경우에도 숫자는 후보(서버 집계)의 값만 쓴다.
 */
export function composePayload(input: CollectedWeek, ai: AiSelection | null, now: Date, options: ComposeOptions = {}): ComposeResult {
  const candidates = buildCandidates(input);
  const validated = ai ? validateAiSelection(ai.selections, candidates) : null;
  const keyMessages = selectKeyMessages(candidates, validated);

  const topVideo = selectTopVideo(input.rows);
  const videos = selectVideos(input.rows, topVideo?.id ?? null);
  const showSummary = options.showArticleSummary ?? isArticleSummaryEnabled();
  const articles = selectArticles(input.rows, showSummary);
  const papers = selectPapers(input.rows, showSummary);
  const { ciChanges, companies } = selectCiChanges(input.ciChanges);
  const { keywords } = selectKeywords(input.keywords);
  const { counts, deltas } = computeCounts(input);

  const noData = counts.videosNew + counts.articles === 0;
  const warnings: string[] = [...input.warnings];
  if (input.truncated && !warnings.includes('rows_truncated')) warnings.push('rows_truncated');
  for (const w of options.extraWarnings ?? []) if (!warnings.includes(w)) warnings.push(w);
  if (validated && candidates.length > 0 && validated.accepted.length === 0 && !warnings.includes('ai_no_valid_selection')) {
    warnings.push('ai_no_valid_selection');
  }
  if (noData) warnings.push('no_data');

  const status = decideStatus({ keyMessages, warnings, noData });
  const ruleBasedMessages = keyMessages.filter((m) => m.generatedBy === 'rule').length;
  const week = isoWeekInfo(input.range.weekStart);

  const payload: WeeklyBriefPayload = {
    schemaVersion: 1,
    header: {
      weekStart: input.range.weekStart,
      weekEnd: input.range.weekEnd,
      isoYear: week.isoYear,
      weekNumber: week.weekNumber,
      periodStartAt: input.range.startUtc.toISOString(),
      periodEndAt: input.range.periodEndInclusive.toISOString(),
      generatedAt: now.toISOString(),
      counts,
      deltas,
    },
    keyMessages,
    topVideo,
    ciChanges,
    ciSummary: { updates: input.ciUpdates, companies },
    keywords,
    videos,
    articles,
    papers,
    meta: {
      aiUsed: keyMessages.some((m) => m.generatedBy === 'ai'),
      ruleBasedMessages,
      warnings,
      truncated: input.truncated,
    },
  };

  const stats: Record<string, unknown> = {
    candidates: candidates.map((c) => ({ id: c.id, type: c.type, score: Math.round(c.score * 100) / 100 })),
    selected: keyMessages.map((m) => ({ id: m.id, by: m.generatedBy })),
    aiRejected: validated?.rejected ?? [],
    rows: { current: input.rows.length, previous: input.prevRows.length },
    truncated: input.truncated,
  };

  return { payload, status, stats, candidates };
}

/**
 * 저장된 payload 를 읽을 때의 호환 처리 — 논문 섹션이 생기기 전 payload 에는 papers / counts.papers / deltas.papers 가 없다.
 * 원본을 바꾸지 않고 누락된 필드만 채운 복사본을 돌려준다.
 */
export function normalizeStoredPayload(raw: WeeklyBriefPayload): WeeklyBriefPayload {
  const header = raw.header;
  const needsHeader = !header || typeof header.counts?.papers !== 'number' || header.deltas?.papers === undefined;
  if (Array.isArray(raw.papers) && !needsHeader) return raw;
  return {
    ...raw,
    header: needsHeader && header
      ? {
          ...header,
          counts: { ...header.counts, papers: typeof header.counts?.papers === 'number' ? header.counts.papers : 0 },
          deltas: { ...header.deltas, papers: header.deltas?.papers ?? null },
        }
      : header,
    papers: Array.isArray(raw.papers) ? raw.papers : [],
  };
}
