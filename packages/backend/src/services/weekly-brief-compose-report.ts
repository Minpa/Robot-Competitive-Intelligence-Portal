/**
 * 주간 브리프 v2(장문 리포트) 구성 — 순수 함수 모음 (DB·AI 접근 없음).
 *
 * 흐름
 *   buildReportPlan(수집 결과)  : 서버가 집계한 숫자·근거·링크·목록·규칙 문장과, AI 호출에 필요한 짧은 id(h1, e1, d1, c1, i1, k1, p1, w1, t1) 색인을 만든다.
 *   (summarize-report 가 plan 으로 프롬프트를 만들고 AI 를 호출한다)
 *   finalizeReport(plan, ai)    : AI 응답을 구조 → 텍스트 정책 → 길이 → 문장 단위 숫자 가드로 검증하고,
 *                                 탈락한 요소는 규칙 폴백 문장으로 대체해 payload 와 상태를 확정한다.
 *
 * 원칙
 *   - 숫자·링크·근거 카드는 전부 서버 값이다. AI 는 서술(headline/body/narrative/blurb/meaning/why/note)과 제목 번역만 쓴다.
 *   - 원문 전재 금지: articles.summary 는 payload 의 첫 문장(≤90자, 스위치 존중)으로만 쓰이고 AI 입력에는 들어가지 않는다.
 *     논문 요약은 aiSummaryKo 만, 영상 요약은 geminiAnalysis.summaryKo(문장 단위), 기사 요약은 keyPoints 우선.
 *   - 모든 payload 문자열은 400자 이하이고 빈 문자열을 쓰지 않는다(ARGOS_I 정제에서 null 로 바뀐다).
 */

import type { TechTrendDomain } from './tech-trend-report.service.js';
import {
  BADGE_DOMAIN_ORDER,
  CONFIDENCE_RANK,
  WEEKLY_BRIEF_SCORING,
  allowedFrom,
  channelOf,
  ciChangeCandidates,
  classifyRow,
  computeCounts,
  domainStat,
  isAllNoneJudged,
  isAnalyzed,
  keywordSurgeCandidate,
  meta,
  newestFirst,
  normalizeConfidence,
  normalizeSpaces,
  pctChange,
  pickRepresentativeKeyword,
  resolveThumbnail,
  resolveVideoUrl,
  round1,
  safeHttpsUrl,
  selectArticles,
  selectCiChanges,
  selectPapers,
  selectTopVideo,
  signed,
  splitRows,
  toIso,
  toKeyword,
  tsMs,
  videoDomainBadge,
  videoScore,
  viewsOf,
  volumeChangeCandidate,
  type BriefRow,
  type Candidate,
  type CiChangeRow,
  type CollectedWeek,
  type DomainShareStat,
  type KeywordCount,
  type RowKind,
} from './weekly-brief-compose.js';
import {
  TITLE_KO_MAX,
  buildAllowed,
  charLength,
  dateNumbers,
  guardNarrative,
  guardTitleTranslation,
  hangulRatio,
  resolveEntityGuardMode,
  smallIntegers,
  splitSentences,
  type EntityGuardMode,
  type GuardStats,
} from './weekly-brief-text-guard.js';
import { isoWeekInfo } from './weekly-brief-period.js';
import type {
  BriefDomainKey,
  WeeklyBriefDeltas,
  WeeklyBriefHeader,
  WeeklyBriefStatusCode,
  WeeklyCompany,
  WeeklyCompanyCi,
  WeeklyDomainBlock,
  WeeklyDomainFigures,
  WeeklyEvidenceCard,
  WeeklyGeneratedBy,
  WeeklyHighlight,
  WeeklyKeyword,
  WeeklyReportArticle,
  WeeklyReportCandidateType,
  WeeklyReportEvidence,
  WeeklyReportPaper,
  WeeklyReportPayload,
  WeeklyReportSectionSourceKey,
  WeeklyReportTrends,
  WeeklyReportVideo,
  WeeklySectionSource,
  WeeklyVolumeWeek,
  WeeklyWatchPoint,
} from '../types/weekly-brief.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** 표시 순서 고정 */
export const REPORT_DOMAIN_ORDER: readonly BriefDomainKey[] = ['hand', 'actuator', 'rfm', 'expo', 'production'];

/** 리포트 도메인 라벨 (PM-11: 분류는 그대로, 라벨만 PM 용어) — 각 16자 이하 */
export const REPORT_DOMAIN_LABELS: Record<BriefDomainKey, string> = {
  hand: '핸드',
  actuator: '액추에이터',
  rfm: '파운데이션 모델·RFM',
  expo: '전시·데모',
  production: '양산·사업화',
};

/** 튜닝하기 쉽게 한곳에 둔 상수 */
export const REPORT_LIMITS = {
  /** 수집 건수 합이 이 값 미만이면 quiet */
  quietBelow: 3,
  /** 규칙 문장으로 대체된 요소 비율이 이 값을 넘으면 partial */
  partialRuleRatio: 0.25,
  highlights: { min: 3, max: 5 },
  domain: { cardsMax: 5, videoCards: 3, secondCards: 3, tags: 5, tagMax: 20, titleMax: 120, sourceMax: 60, lineMax: 120 },
  companies: { max: 8, ciFirst: 3, minMentions: 2, items: 3, ciPerCompany: 2 },
  videos: { max: 12, bucketCap: 3, channelCap: 2, noSummaryCap: 4, lines: 3, lineMax: 110, linesTotalMax: 300, tags: 4, tagMax: 20, titleMax: 200 },
  papers: { lines: 2, lineMax: 120, titleMax: 200 },
  articles: { lines: 2, lineMax: 100, firstSentenceMax: 90, titleMax: 200 },
  keywords: { max: 12 },
  watch: { min: 3, max: 5 },
  url: { max: 400 },
  /** 텍스트 길이: 상한 / AI 서술 채택 최소 */
  text: {
    highlightHeadline: { max: 40, min: 6 },
    highlightBody: { max: 260, min: 60 },
    highlightBodyRule: { max: 200 },
    domainNarrative: { max: 400, min: 200 },
    companyBlurb: { max: 200, min: 40 },
    ciMeaning: { max: 80, min: 8 },
    keywordNote: { max: 240, min: 30 },
    watchTitle: { max: 40, min: 4 },
    watchBody: { max: 180, min: 40 },
    paperWhy: { max: 90, min: 8 },
    figureValue: 24,
    figureUnit: 4,
    figureCaption: 50,
    basis: 120,
    companyName: 60,
    evidenceTitle: 120,
  },
  scoring: { topVideo: 32, volumeSummary: 28 },
} as const;

const SECTION_KEYS: readonly WeeklyReportSectionSourceKey[] = ['highlights', 'domains', 'companies', 'papers', 'trends', 'watch'];

// ─────────────────────────────────────────────────────────────────────────────
// 작은 유틸
// ─────────────────────────────────────────────────────────────────────────────

function clip(s: string, max: number): string {
  const t = normalizeSpaces(s);
  const chars = Array.from(t);
  return chars.length <= max ? t : chars.slice(0, Math.max(0, max - 1)).join('') + '…';
}

function isStrippableCode(code: number): boolean {
  return code < 32 || (code >= 0x7f && code <= 0x9f) || (code >= 0x200b && code <= 0x200f) || code === 0x2028 || code === 0x2029 || code === 0xfeff;
}

/** 제어문자·보이지 않는 문자를 공백으로 */
function stripControl(s: string): string {
  return Array.from(s)
    .map((ch) => (isStrippableCode(ch.codePointAt(0) ?? 0) ? ' ' : ch))
    .join('');
}

/** 파생 요약 한 줄 정제 — 태그·URL·제어문자·꺾쇠 제거, 공백 정규화 */
function cleanLine(v: unknown): string {
  if (typeof v !== 'string') return '';
  return normalizeSpaces(
    stripControl(v)
      .replace(/<[^>]*>?/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/[<>]/g, ' '),
  );
}

/** https + 400자 이하 URL 만 (payload 문자열 상한). 아니면 null */
function url400(url: string | null | undefined): string | null {
  const u = safeHttpsUrl(url);
  return u && u.length <= REPORT_LIMITS.url.max ? u : null;
}

function uniqueBy<T>(list: readonly T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of list) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function stringArray(v: unknown, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const t = cleanLine(x);
    if (t) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

function rowKindOf(row: BriefRow): RowKind | null {
  return classifyRow(row);
}

// ─────────────────────────────────────────────────────────────────────────────
// 파생 요약 (원문 전재 없음)
// ─────────────────────────────────────────────────────────────────────────────

/** 영상: geminiAnalysis.summaryKo 를 문장 경계로 최대 3문장(각 110자, 합계 300자). 없으면 task 한 줄 */
export function videoSummaryLines(row: BriefRow): string[] {
  const L = REPORT_LIMITS.videos;
  const m = meta(row);
  const sentences = splitSentences(cleanLine(m.geminiAnalysis?.summaryKo)).map((s) => clip(s, L.lineMax)).filter((s) => s.length > 0);
  const out: string[] = [];
  let total = 0;
  for (const s of sentences) {
    if (out.length >= L.lines) break;
    if (total + charLength(s) > L.linesTotalMax) break;
    out.push(s);
    total += charLength(s);
  }
  if (out.length === 0) {
    const task = cleanLine(m.geminiAnalysis?.task);
    if (task) out.push(clip(task, L.lineMax));
  }
  return out;
}

/** 논문: aiSummaryKo 에서만 최대 2문장(각 120자). 초록 발췌는 쓰지 않는다 */
export function paperSummaryLines(row: BriefRow): string[] {
  const L = REPORT_LIMITS.papers;
  const raw = cleanLine(meta(row).aiSummaryKo);
  return splitSentences(raw)
    .map((s) => clip(s, L.lineMax))
    .filter((s) => s.length > 0)
    .slice(0, L.lines);
}

/** 기사 keyPoints (AI 파생 요약) — 최대 2개, 각 100자 */
export function articleKeyPointLines(row: BriefRow): string[] {
  const L = REPORT_LIMITS.articles;
  return uniqueBy(stringArray(meta(row).keyPoints, L.lines + 2), (s) => s)
    .map((s) => clip(s, L.lineMax))
    .slice(0, L.lines);
}

/** 기사 payload 요약: keyPoints 우선, 없으면 articles.summary 의 첫 문장(≤90자, 스위치 존중), 없으면 빈 배열 */
export function articleSummaryLines(row: BriefRow, showSummary: boolean): string[] {
  const kp = articleKeyPointLines(row);
  if (kp.length > 0) return kp;
  if (!showSummary) return [];
  const first = splitSentences(cleanLine(row.summary))[0];
  return first ? [clip(first, REPORT_LIMITS.articles.firstSentenceMax)] : [];
}

/** AI 입력용 요약 한 줄(≤120자) — 파생 요약만. 기사는 keyPoints 만(articles.summary 금지) */
export function aiSummaryLine(row: BriefRow): string | null {
  const kind = rowKindOf(row);
  let parts: string[] = [];
  if (kind === 'video') parts = splitSentences(cleanLine(meta(row).geminiAnalysis?.summaryKo)).slice(0, 2);
  else if (kind === 'paper') parts = splitSentences(cleanLine(meta(row).aiSummaryKo)).slice(0, 2);
  else if (kind === 'news') parts = articleKeyPointLines(row);
  const line = parts.join(' ').trim();
  return line ? clip(line, 120) : null;
}

function videoTags(row: BriefRow): string[] {
  const L = REPORT_LIMITS.videos;
  const m = meta(row);
  const all = [...stringArray(m.aiTags?.taskTypes, L.tags), ...stringArray(m.aiTags?.techTags, L.tags)].map((t) => clip(t, L.tagMax));
  return uniqueBy(all, (t) => t.toLowerCase()).slice(0, L.tags);
}

// ─────────────────────────────────────────────────────────────────────────────
// 플랜 타입
// ─────────────────────────────────────────────────────────────────────────────

/** 요소 하나의 검증 기준 — 허용 숫자 집합과 입력 텍스트 */
export interface ElementGuard {
  allowed: Set<string>;
  inputText: string;
}

/** AI 입력용 근거 카드 (payload 카드 + 짧은 id + 파생 요약 한 줄 + 조회수) */
export interface PlanCard {
  ref: string;
  card: WeeklyEvidenceCard;
  /** AI 입력용 파생 요약 한 줄(기사는 keyPoints 만) */
  aiLine: string | null;
  views: number | null;
}

export interface HighlightCandidate {
  /** AI 입력용 짧은 id (h1, h2 …) */
  ref: string;
  /** 서버 후보 id 예: 'domain_share:actuator' */
  id: string;
  type: WeeklyReportCandidateType;
  score: number;
  label: string;
  figure: { value: string; unit: string | null; caption: string; delta: { value: string; unit: string; label: string } | null } | null;
  basis: string;
  evidence: WeeklyReportEvidence[];
  /** evidence 와 같은 순서의 AI 입력용 id (e1, e2 …) */
  evidenceRefs: string[];
  rule: { headline: string; body: string };
  facts: Record<string, string | number | null>;
  guard: ElementGuard;
}

export interface DomainPlan {
  key: BriefDomainKey;
  label: string;
  status: 'active' | 'quiet';
  figures: WeeklyDomainFigures;
  topTags: { tag: string; count: number }[];
  cards: PlanCard[];
  guard: ElementGuard;
  ruleNarrative: string | null;
}

export interface CiPlan {
  /** AI 입력용 id (k1 …) */
  ref: string;
  change: Omit<WeeklyCompanyCi, 'meaning'>;
  company: string;
  ruleMeaning: string;
  guard: ElementGuard;
}

export interface CompanyPlan {
  /** AI 입력용 id (c1 …) */
  ref: string;
  id: string;
  name: string;
  counts: WeeklyCompany['counts'];
  items: PlanCard[];
  ci: CiPlan[];
  ruleBlurb: string;
  guard: ElementGuard;
}

export interface PaperPlan {
  /** AI 입력용 id (p1 …) */
  ref: string;
  paper: WeeklyReportPaper;
  aiLine: string | null;
  guard: ElementGuard;
}

export interface WatchEntry {
  /** AI 입력용 id (w1 …) */
  ref: string;
  id: string;
  kind: 'keyword' | 'ci' | 'company' | 'domain';
  ruleTitle: string;
  ruleBody: string;
  evidence: WeeklyReportEvidence[];
  /** AI 입력용 사실 한 줄 */
  fact: string;
  guard: ElementGuard;
}

export interface TitleTarget {
  /** AI 입력용 id (t1 …) */
  ref: string;
  kind: 'video' | 'paper' | 'article';
  id: string;
  title: string;
}

export interface ReportOptions {
  showArticleSummary?: boolean;
  entityMode?: EntityGuardMode;
  /** 서비스가 덧붙이는 경고 */
  extraWarnings?: string[];
}

export interface ReportPlan {
  weekStart: string;
  weekEnd: string;
  period: string;
  isoYear: number;
  weekNumber: number;
  counts: WeeklyBriefHeader['counts'];
  deltas: WeeklyBriefDeltas;
  periodStartAt: string;
  periodEndAt: string;
  noData: boolean;
  truncated: boolean;
  inputWarnings: string[];
  highlights: HighlightCandidate[];
  domains: DomainPlan[];
  companies: CompanyPlan[];
  videos: WeeklyReportVideo[];
  papers: PaperPlan[];
  articles: WeeklyReportArticle[];
  ciSummary: { updates: number; companies: number };
  keywords: WeeklyKeyword[];
  volumeWeeks: WeeklyVolumeWeek[];
  keywordNoteRule: string | null;
  keywordNoteGuard: ElementGuard;
  watch: WatchEntry[];
  titles: TitleTarget[];
  /** 호출 공통 허용 숫자 (주간 총량·기간·작은 정수) */
  common: Set<string>;
  options: Required<Pick<ReportOptions, 'showArticleSummary' | 'entityMode'>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 근거 카드
// ─────────────────────────────────────────────────────────────────────────────

function cardOf(row: BriefRow, kind: 'video' | 'paper' | 'article', showSummary: boolean): WeeklyEvidenceCard {
  const D = REPORT_LIMITS.domain;
  const m = meta(row);
  let source = '';
  let lines: string[] = [];
  let url: string | null = null;
  if (kind === 'video') {
    source = channelOf(row) ?? 'YouTube';
    lines = videoSummaryLines(row);
    url = url400(resolveVideoUrl(row.url, typeof m.videoId === 'string' ? m.videoId : null));
  } else if (kind === 'paper') {
    source = 'arXiv';
    lines = paperSummaryLines(row);
    url = url400(row.url);
  } else {
    source = row.source ? row.source : '기사';
    lines = articleSummaryLines(row, showSummary);
    url = url400(row.url);
  }
  return {
    type: kind,
    id: row.id,
    title: clip(row.title, D.titleMax),
    titleKo: null,
    source: clip(source, D.sourceMax) || '출처 미상',
    publishedAt: toIso(row.publishedAt),
    line: lines[0] ? clip(lines[0], D.lineMax) : null,
    url,
  };
}

function kindOfCard(kind: RowKind): 'video' | 'paper' | 'article' {
  return kind === 'news' ? 'article' : kind;
}

function planCard(ref: string, row: BriefRow, showSummary: boolean): PlanCard {
  const kind = rowKindOf(row) ?? 'news';
  return { ref, card: cardOf(row, kindOfCard(kind), showSummary), aiLine: aiSummaryLine(row), views: kind === 'video' ? viewsOf(row) : null };
}

function cardEvidence(c: WeeklyEvidenceCard): WeeklyReportEvidence {
  return { type: c.type, id: c.id, title: clip(c.title, REPORT_LIMITS.text.evidenceTitle), url: c.url, label: c.source };
}

function cardsText(cards: readonly PlanCard[]): string[] {
  return cards.flatMap((c) => [c.card.title, c.aiLine ?? '', c.card.source, c.card.line ?? '']);
}

function cardNumbers(cards: readonly PlanCard[]): { numbers: number[]; texts: string[] } {
  return {
    numbers: cards.map((c) => c.views).filter((v): v is number => typeof v === 'number'),
    texts: [...cardsText(cards), ...cards.map((c) => (c.card.publishedAt ? monthDay(c.card.publishedAt) : ''))],
  };
}

function monthDay(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const k = new Date(t + 9 * 3_600_000).toISOString();
  return `${k.slice(5, 7)}-${k.slice(8, 10)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 영상 / 논문 / 기사 목록
// ─────────────────────────────────────────────────────────────────────────────

function reportVideo(row: BriefRow, isTop: boolean): WeeklyReportVideo {
  const m = meta(row);
  const dur = m.geminiAnalysis?.durationSec;
  return {
    id: row.id,
    title: clip(row.title, REPORT_LIMITS.videos.titleMax),
    titleKo: null,
    channel: channelOf(row),
    publishedAt: toIso(row.publishedAt),
    views: viewsOf(row),
    url: url400(resolveVideoUrl(row.url, typeof m.videoId === 'string' ? m.videoId : null)),
    thumbnail: resolveThumbnail(m, row.url),
    analyzed: isAnalyzed(row),
    domain: videoDomainBadge(row),
    durationSec: typeof dur === 'number' && Number.isFinite(dur) && dur > 0 ? dur : null,
    isTop,
    summaryLines: videoSummaryLines(row),
    tags: videoTags(row),
  };
}

/**
 * 영상 상위 12건 — 도메인 버킷당 3, 채널당 2 (모자라면 버킷 → 채널 순으로 완화), 요약이 없는 영상은 최대 4건.
 * 조회수 1위(selectTopVideo)는 항상 첫 번째이고 isTop 은 그 한 개만 true.
 */
export function selectReportVideos(rows: readonly BriefRow[]): WeeklyReportVideo[] {
  const L = REPORT_LIMITS.videos;
  const topItem = selectTopVideo(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const topRow = topItem ? byId.get(topItem.id) : undefined;

  const scored = rows
    .filter((r) => classifyRow(r) === 'video' && !isAllNoneJudged(r))
    .map((r) => ({ row: r, score: videoScore(r), bucket: videoDomainBadge(r) ?? 'other', channel: channelOf(r), hasSummary: videoSummaryLines(r).length > 0 }))
    .sort((a, b) => b.score - a.score || tsMs(b.row) - tsMs(a.row) || a.row.id.localeCompare(b.row.id));

  const picked = new Set<string>();
  const bucketCount = new Map<string, number>();
  const channelCount = new Map<string, number>();
  const chosen: typeof scored = [];
  let noSummary = 0;

  const take = (c: (typeof scored)[number]) => {
    picked.add(c.row.id);
    bucketCount.set(c.bucket, (bucketCount.get(c.bucket) ?? 0) + 1);
    if (c.channel) channelCount.set(c.channel, (channelCount.get(c.channel) ?? 0) + 1);
    if (!c.hasSummary) noSummary++;
    chosen.push(c);
  };

  if (topRow) {
    const top = scored.find((c) => c.row.id === topRow.id);
    if (top) take(top);
  }
  const phase = (bucketLimit: boolean, channelLimit: boolean) => {
    for (const c of scored) {
      if (chosen.length >= L.max) return;
      if (picked.has(c.row.id)) continue;
      if (!c.hasSummary && noSummary >= L.noSummaryCap) continue;
      if (bucketLimit && (bucketCount.get(c.bucket) ?? 0) >= L.bucketCap) continue;
      if (channelLimit && c.channel && (channelCount.get(c.channel) ?? 0) >= L.channelCap) continue;
      take(c);
    }
  };
  phase(true, true);
  if (chosen.length < L.max) phase(false, true);
  if (chosen.length < L.max) phase(false, false);

  const topId = topRow?.id ?? null;
  const rest = chosen.filter((c) => c.row.id !== topId);
  const head = chosen.filter((c) => c.row.id === topId);
  return [...head, ...rest].map((c) => reportVideo(c.row, topId !== null && c.row.id === topId));
}

function selectReportPapers(rows: readonly BriefRow[]): { paper: WeeklyReportPaper; row: BriefRow }[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return selectPapers(rows.filter((r) => !r.url || r.url.length <= REPORT_LIMITS.url.max), false)
    .map((p) => {
      const row = byId.get(p.id);
      if (!row) return null;
      const paper: WeeklyReportPaper = {
        id: p.id,
        title: clip(p.title, REPORT_LIMITS.papers.titleMax),
        titleKo: null,
        authors: p.authors,
        publishedAt: p.publishedAt,
        url: p.url,
        arxivId: p.arxivId,
        domain: p.domain,
        summaryLines: paperSummaryLines(row),
        whyItMatters: null,
      };
      return { paper, row };
    })
    .filter((x): x is { paper: WeeklyReportPaper; row: BriefRow } => x !== null);
}

function selectReportArticles(rows: readonly BriefRow[], showSummary: boolean): WeeklyReportArticle[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return selectArticles(rows.filter((r) => !r.url || r.url.length <= REPORT_LIMITS.url.max), false)
    .map((a) => {
      const row = byId.get(a.id);
      if (!row) return null;
      const art: WeeklyReportArticle = {
        id: a.id,
        title: clip(a.title, REPORT_LIMITS.articles.titleMax),
        titleKo: null,
        source: clip(a.source || '출처 미상', REPORT_LIMITS.domain.sourceMax),
        publishedAt: a.publishedAt,
        url: a.url,
        domain: a.domain,
        summaryLines: articleSummaryLines(row, showSummary),
      };
      return art;
    })
    .filter((x): x is WeeklyReportArticle => x !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// 도메인
// ─────────────────────────────────────────────────────────────────────────────

function sortByVideoScore(rows: readonly BriefRow[]): BriefRow[] {
  return [...rows].sort((a, b) => videoScore(b) - videoScore(a) || tsMs(b) - tsMs(a) || a.id.localeCompare(b.id));
}

/** 보조 자료: 파생 요약(aiSummaryKo / keyPoints)이 있는 것 우선, 그다음 최신 */
function sortSecond(rows: readonly BriefRow[], paperKind: boolean): BriefRow[] {
  const has = (r: BriefRow) => (paperKind ? paperSummaryLines(r).length > 0 : articleKeyPointLines(r).length > 0);
  return [...rows].sort((a, b) => Number(has(b)) - Number(has(a)) || newestFirst(a, b));
}

function topTagsOf(videoRows: readonly BriefRow[]): { tag: string; count: number }[] {
  const D = REPORT_LIMITS.domain;
  const counts = new Map<string, { tag: string; count: number }>();
  for (const r of videoRows) {
    const m = meta(r);
    const tags = new Set([...stringArray(m.aiTags?.taskTypes, 8), ...stringArray(m.aiTags?.techTags, 8)].map((t) => clip(t, D.tagMax)));
    for (const tag of tags) {
      const key = tag.toLowerCase();
      const cur = counts.get(key);
      if (cur) cur.count++;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, D.tags);
}

function domainRuleNarrative(label: string, f: WeeklyDomainFigures, cards: readonly PlanCard[], tags: readonly { tag: string; count: number }[]): string {
  const second = f.secondKind === 'paper' ? '논문' : '기사';
  const prev = f.prevSharePct !== null ? `, 지난주 ${f.prevSharePct}%` : '';
  const out: string[] = [`${label} 축에서 이번 주 영상 ${f.videos}건과 ${second} ${f.second}건이 수집되었습니다(전체의 ${f.sharePct}%${prev}).`];
  const topVideo = cards.find((c) => c.card.type === 'video');
  if (topVideo) out.push(`조회수가 가장 높은 영상은 '${clip(topVideo.card.title, 50)}'(${clip(topVideo.card.source, 20)})입니다.`);
  const topSecond = cards.find((c) => c.card.type !== 'video');
  if (topSecond) out.push(`${second} 중에서는 '${clip(topSecond.card.title, 50)}'이(가) 수집되었습니다.`);
  if (tags.length > 0) out.push(`영상에서 자주 나타난 태그는 ${tags.slice(0, 3).map((t) => t.tag).join(', ')}입니다.`);
  return clip(out.join(' '), REPORT_LIMITS.text.domainNarrative.max);
}

// ─────────────────────────────────────────────────────────────────────────────
// 회사 연결 (정규화 완전 일치만)
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_SUFFIXES = new Set(['inc', 'ltd', 'co', 'corp']);

/** 소문자화 → 구두점 제거 → 끝의 법인 접미사(inc, ltd, co, corp) 제거 → 공백 제거. 퍼지 매칭은 하지 않는다 */
export function normalizeCompanyName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  while (words.length > 1 && COMPANY_SUFFIXES.has(words[words.length - 1]!)) words.pop();
  return words.join('');
}

interface CompanyEntry {
  id: string;
  name: string;
}

function companyPool(input: CollectedWeek): { byNorm: Map<string, CompanyEntry>; byId: Map<string, CompanyEntry> } {
  const all: CompanyEntry[] = [
    ...input.companies.map((c) => ({ id: c.companyId, name: c.name })),
    ...(input.companyDirectory ?? []).map((c) => ({ id: c.companyId, name: c.name })),
  ].filter((c) => c.name && c.id);
  const sorted = uniqueBy(all, (c) => c.id).sort((a, b) => a.id.localeCompare(b.id));
  const byNorm = new Map<string, CompanyEntry>();
  const byId = new Map<string, CompanyEntry>();
  for (const c of sorted) {
    byId.set(c.id, c);
    const n = normalizeCompanyName(c.name);
    if (n && !byNorm.has(n)) byNorm.set(n, c);
  }
  return { byNorm, byId };
}

const STRONG_CONFIDENCE = new Set(['A', 'B', 'C']);

function ciSortKey(r: CiChangeRow): [number, number, number, number, string] {
  const conf = normalizeConfidence(r.confidence);
  return [CONFIDENCE_RANK[conf] ?? 9, r.valueChanged ? 0 : 1, safeHttpsUrl(r.sourceUrl) ? 0 : 1, -new Date(r.changedAt).getTime(), r.valueId];
}

function compareCi(a: CiChangeRow, b: CiChangeRow): number {
  const ka = ciSortKey(a);
  const kb = ciSortKey(b);
  for (let i = 0; i < 4; i++) {
    const d = (ka[i] as number) - (kb[i] as number);
    if (d !== 0) return d;
  }
  return ka[4].localeCompare(kb[4]);
}

function ciRuleMeaning(c: Omit<WeeklyCompanyCi, 'meaning'>): string {
  const item = clip(c.item, 14);
  const after = clip(c.after, 14);
  const before = c.before ? clip(c.before, 14) : null;
  const text = before
    ? `${item} 값이 '${before}'에서 '${after}'로 갱신되었습니다(신뢰도 ${c.confidence}).`
    : `${item} 값이 '${after}'로 갱신되었습니다(신뢰도 ${c.confidence}).`;
  return clip(text, REPORT_LIMITS.text.ciMeaning.max);
}

function companyRuleBlurb(name: string, counts: WeeklyCompany['counts'], items: readonly PlanCard[], ciCount: number): string {
  if (counts.total === 0) return clip(`${name}의 CI 항목 ${ciCount}건이 이번 주 갱신되었습니다.`, REPORT_LIMITS.text.companyBlurb.max);
  const parts = [`${name} 관련 영상 ${counts.videos}건, 기사 ${counts.articles}건이 수집되었습니다(지난주 ${counts.prevTotal}건).`];
  const first = items[0];
  if (first) parts.push(`대표 항목은 '${clip(first.card.title, 50)}'입니다.`);
  if (ciCount > 0) parts.push(`CI 항목 ${ciCount}건이 갱신되었습니다.`);
  return clip(parts.join(' '), REPORT_LIMITS.text.companyBlurb.max);
}

// ─────────────────────────────────────────────────────────────────────────────
// 하이라이트 후보
// ─────────────────────────────────────────────────────────────────────────────

type RawCandidate = Omit<Candidate, 'type' | 'evidence'> & { type: WeeklyReportCandidateType; evidence: WeeklyReportEvidence[] };

function retypeEvidence(ev: Candidate['evidence'], kindById: Map<string, RowKind | null>): WeeklyReportEvidence[] {
  return ev.map((e) => ({
    type: e.type === 'article' && kindById.get(e.id) === 'paper' ? 'paper' : e.type,
    id: e.id,
    title: clip(e.title, REPORT_LIMITS.text.evidenceTitle),
    url: e.url,
    label: e.label ?? null,
  }));
}

function toRaw(c: Candidate, kindById: Map<string, RowKind | null>): RawCandidate {
  return { ...c, evidence: retypeEvidence(c.evidence, kindById) };
}

function domainShareCandidates(input: Pick<CollectedWeek, 'rows' | 'prevRows'>, kindById: Map<string, RowKind | null>): RawCandidate[] {
  const s = WEEKLY_BRIEF_SCORING.domainShare;
  const out: { stat: DomainShareStat; score: number }[] = [];
  for (const d of BADGE_DOMAIN_ORDER) {
    const cur = domainStat(d as TechTrendDomain, input.rows);
    if (cur.num < s.minNumerator || cur.den < s.minDenominator) continue;
    const prev = domainStat(d as TechTrendDomain, input.prevRows);
    const prevShare = prev.den >= s.prevDenominatorMin ? prev.share : null;
    const deltaPp = prevShare === null ? null : round1(cur.share - prevShare);
    const score = s.base + Math.min(s.deltaCap, Math.abs(deltaPp ?? 0) * s.deltaWeight) + Math.min(s.shareCap, cur.share / s.shareDivisor);
    out.push({ stat: { domain: d, ...cur, prevShare, deltaPp }, score });
  }
  out.sort((a, b) => b.score - a.score || a.stat.domain.localeCompare(b.stat.domain));
  return out.slice(0, 2).map(({ stat: st, score }) => {
    const label = REPORT_DOMAIN_LABELS[st.domain];
    const share = Math.round(st.share);
    const caption = `${label} 관련 ${st.num}건 / 전체 ${st.den}건`;
    const topVideos = sortByVideoScore(st.videoRows).slice(0, 2);
    const topSecond = [...st.secondRows].sort(newestFirst).slice(0, 1);
    const evidence = [...topVideos, ...topSecond].slice(0, 3).map((r) => cardEvidence(cardOf(r, kindOfCard(rowKindOf(r) ?? 'news'), false)));
    return {
      id: `domain_share:${st.domain}`,
      type: 'domain_share' as const,
      kind: 'stat' as const,
      score,
      label,
      bigNumber: { value: String(share), unit: '%', caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
      delta: st.deltaPp === null ? null : { value: signed(st.deltaPp, 1), unit: '%p', label: '지난주 대비' },
      basis: `근거: 도메인 태그 집계 (영상 ${st.videoNum} · ${st.secondKind} ${st.secondNum} / 전체 영상 ${st.denVideos} · 기사 ${st.denNews} · 논문 ${st.denPapers})`,
      evidence: evidence.map((e) => ({ ...e, type: e.type })),
      rule: { headline: `이번 주 수집된 자료 중 ${share}%가 ${label} 주제였습니다`, caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
      allowedNumbers: allowedFrom(
        [share, st.share, st.num, st.den, st.videoNum, st.secondNum, st.denVideos, st.denNews, st.denPapers, ...(st.deltaPp !== null ? [st.deltaPp] : []), ...(st.prevShare !== null ? [st.prevShare] : [])],
        [label],
      ),
      extra: { domain: st.domain, numerator: st.num, denominator: st.den, previousSharePct: st.prevShare === null ? null : round1(st.prevShare) },
    } satisfies RawCandidate;
  }).map((c) => ({ ...c, evidence: c.evidence.map((e) => ({ ...e, type: kindById.get(e.id) === 'paper' ? ('paper' as const) : e.type })) }));
}

function topCompanyCandidates(input: Pick<CollectedWeek, 'rows' | 'companies'>, kindById: Map<string, RowKind | null>): RawCandidate[] {
  const s = WEEKLY_BRIEF_SCORING.topCompany;
  const top = [...input.companies]
    .filter((c) => c.name && c.count > 0 && c.count >= s.minCount)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 2);
  const { videos, news } = splitRows(input.rows);
  return top.map((c) => {
    const deltaPct = pctChange(c.count, c.prevCount);
    const cv = videos.filter((r) => r.companyId === c.companyId);
    const cn = news.filter((r) => r.companyId === c.companyId);
    const rows = [...sortByVideoScore(cv).slice(0, 2), ...[...cn].sort(newestFirst).slice(0, 1)].slice(0, 3);
    const caption = `지난주 ${c.prevCount}건`;
    return toRaw(
      {
        id: `top_company:${c.companyId}`,
        type: 'top_company',
        kind: 'stat',
        score: s.base + Math.min(s.cap, Math.max(0, deltaPct ?? 0) / s.divisor),
        label: c.name,
        bigNumber: { value: String(c.count), unit: '건', caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
        delta: deltaPct === null ? null : { value: signed(deltaPct, 1), unit: '%', label: '지난주 대비' },
        basis: `근거: 회사 태그 집계 (영상 ${cv.length} · 기사 ${cn.length})`,
        evidence: rows.map((r) => {
          const e = cardEvidence(cardOf(r, kindOfCard(rowKindOf(r) ?? 'news'), false));
          return { type: e.type === 'paper' ? 'article' : e.type, id: e.id, title: e.title, url: e.url, label: e.label ?? null } as Candidate['evidence'][number];
        }),
        rule: { headline: `${c.name} 관련 기사·영상이 ${c.count}건으로 많았습니다`, caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
        allowedNumbers: allowedFrom([c.count, c.prevCount, ...(deltaPct !== null ? [deltaPct] : [])], [c.name]),
        extra: { company: c.name, count: c.count, previousCount: c.prevCount, changePct: deltaPct },
      },
      kindById,
    );
  });
}

function topVideoCandidate(input: Pick<CollectedWeek, 'rows'>): RawCandidate | null {
  const top = selectTopVideo(input.rows);
  if (!top) return null;
  const row = input.rows.find((r) => r.id === top.id);
  const line = row ? videoSummaryLines(row)[0] ?? null : null;
  const hasViews = top.views !== null;
  const caption = hasViews ? '수집 시점 조회수' : '분석 완료 영상';
  const ev: WeeklyReportEvidence = { type: 'video', id: top.id, title: clip(top.title, REPORT_LIMITS.text.evidenceTitle), url: url400(top.url), label: top.channel };
  return {
    id: `top_video:${top.id}`,
    type: 'top_video',
    kind: 'stat',
    score: REPORT_LIMITS.scoring.topVideo,
    label: top.title,
    bigNumber: {
      value: hasViews ? (top.views as number).toLocaleString('en-US') : '분석',
      unit: hasViews ? '회' : '',
      caption,
    },
    delta: null,
    basis: hasViews ? '근거: 영상 조회수 집계 (수집 시점 값)' : '근거: 영상 분석 이력',
    evidence: [ev],
    rule: { headline: `조회수 최고 영상: ${clip(top.title, 28)}`, caption },
    allowedNumbers: allowedFrom(hasViews ? [top.views as number] : [], [top.title, line ?? '', top.channel ?? '']),
    extra: { title: clip(top.title, 80), channel: top.channel, views: top.views, analysis: line ? clip(line, 120) : null },
  };
}

function volumeSummaryCandidate(input: Pick<CollectedWeek, 'rows' | 'prevRows'>): RawCandidate | null {
  const cur = splitRows(input.rows);
  const prev = splitRows(input.prevRows);
  const total = cur.videos.length + cur.news.length + cur.papers.length;
  const prevTotal = prev.videos.length + prev.news.length + prev.papers.length;
  if (total <= 0) return null;
  const pct = pctChange(total, prevTotal);
  const caption = `영상 ${cur.videos.length} · 기사 ${cur.news.length} · 논문 ${cur.papers.length}`;
  const evidence = [...sortByVideoScore(cur.videos).slice(0, 2), ...[...cur.news].sort(newestFirst).slice(0, 1)].slice(0, 3).map((r) => {
    const e = cardEvidence(cardOf(r, kindOfCard(rowKindOf(r) ?? 'news'), false));
    return { type: e.type, id: e.id, title: e.title, url: e.url, label: e.label ?? null } as WeeklyReportEvidence;
  });
  return {
    id: 'volume_summary:total',
    type: 'volume_summary',
    kind: 'stat',
    score: REPORT_LIMITS.scoring.volumeSummary,
    label: '수집 현황',
    bigNumber: { value: String(total), unit: '건', caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
    delta: pct === null ? null : { value: signed(pct, 1), unit: '%', label: '지난주 대비' },
    basis: `근거: 수집 건수 집계 (영상 ${cur.videos.length} · 기사 ${cur.news.length} · 논문 ${cur.papers.length})`,
    evidence,
    rule: { headline: `이번 주 총 ${total}건이 수집되었습니다`, caption: clip(caption, REPORT_LIMITS.text.figureCaption) },
    allowedNumbers: allowedFrom([total, prevTotal, cur.videos.length, cur.news.length, cur.papers.length, ...(pct !== null ? [pct] : [])], []),
    extra: { total, previousTotal: prevTotal, videos: cur.videos.length, articles: cur.news.length, papers: cur.papers.length, changePct: pct },
  };
}

const TYPE_LIMIT: Record<WeeklyReportCandidateType, number> = {
  domain_share: 2,
  ci_change: 2,
  top_company: 2,
  keyword_surge: 1,
  volume_change: 1,
  top_video: 1,
  volume_summary: 1,
};

/** 모든 적격 후보 (점수 내림차순, 동률은 id 오름차순) */
export function buildReportCandidates(input: CollectedWeek): RawCandidate[] {
  const kindById = new Map(input.rows.map((r) => [r.id, rowKindOf(r)] as const));
  const out: RawCandidate[] = [];
  out.push(...domainShareCandidates(input, kindById));
  const kw = keywordSurgeCandidate(input);
  if (kw) out.push(toRaw(kw, kindById));
  out.push(...ciChangeCandidates(input).map((c) => toRaw(c, kindById)));
  out.push(...topCompanyCandidates(input, kindById));
  const vc = volumeChangeCandidate(input);
  if (vc) out.push(toRaw(vc, kindById));
  const tv = topVideoCandidate(input);
  if (tv) out.push(tv);
  const vs = volumeSummaryCandidate(input);
  if (vs) out.push(vs);
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// 플랜
// ─────────────────────────────────────────────────────────────────────────────

function selectReportKeywords(all: readonly KeywordCount[]): WeeklyKeyword[] {
  const K = WEEKLY_BRIEF_SCORING.keyword;
  const eligible = all.filter((k) => k.count >= K.minCount);
  if (eligible.length === 0) return [];
  const byCount = (a: KeywordCount, b: KeywordCount) => b.count - a.count || a.term.localeCompare(b.term);
  const rep = pickRepresentativeKeyword(eligible);
  const head = rep ?? [...eligible].sort(byCount)[0]!;
  const rest = eligible.filter((k) => k.keywordId !== head.keywordId).sort(byCount).slice(0, REPORT_LIMITS.keywords.max - 1);
  return [head, ...rest].map(toKeyword);
}

function keywordRuleNote(keywords: readonly WeeklyKeyword[]): string | null {
  if (keywords.length < 2) return null;
  const describe = (k: WeeklyKeyword): string => {
    if (k.direction === 'new') return `'${k.term}'은(는) 이번 주 새로 ${k.count}회 언급되었습니다.`;
    const move = k.direction === 'up' ? '늘었습니다' : k.direction === 'down' ? '줄었습니다' : '비슷했습니다';
    return `'${k.term}' 언급은 지난주 ${k.prevCount}회에서 이번 주 ${k.count}회로 ${move}.`;
  };
  const parts = [describe(keywords[0]!), describe(keywords[1]!)];
  if (keywords.length >= 3) parts.push(`언급 횟수 상위 키워드는 ${keywords.slice(0, 3).map((k) => k.term).join(', ')} 순입니다.`);
  return clip(parts.join(' '), REPORT_LIMITS.text.keywordNote.max);
}

function volumeWeeksOf(input: CollectedWeek, counts: WeeklyBriefHeader['counts']): WeeklyVolumeWeek[] {
  const weeks = (input.volume ?? []).map((w) => ({ ...w }));
  if (weeks.length === 0) return [];
  const last = weeks[weeks.length - 1]!;
  if (last.weekStart === input.range.weekStart) {
    // 이번 주 값은 header.counts 와 같아야 한다 (행 상한으로 잘린 경우에도 화면 안의 숫자가 서로 어긋나지 않게)
    last.videos = counts.videosNew;
    last.articles = counts.articles;
    last.papers = counts.papers;
  }
  return weeks;
}

function commonAllowed(input: CollectedWeek, counts: WeeklyBriefHeader['counts'], deltas: WeeklyBriefDeltas, week: { isoYear: number; weekNumber: number }): Set<string> {
  const cur = splitRows(input.rows);
  const prev = splitRows(input.prevRows);
  const total = cur.videos.length + cur.news.length + cur.papers.length;
  const prevTotal = prev.videos.length + prev.news.length + prev.papers.length;
  const numbers: number[] = [
    counts.articles, counts.videosNew, counts.videosAnalyzed, counts.papers, counts.ciUpdates, counts.alerts, counts.newRobots ?? 0,
    prev.news.length, prev.videos.length, prev.papers.length, total, prevTotal, input.prevCiUpdates, input.prevAlerts, input.prevVideosAnalyzed,
    week.isoYear, week.weekNumber,
    ...dateNumbers(input.range.weekStart), ...dateNumbers(input.range.weekEnd),
    ...smallIntegers(12),
  ];
  for (const d of Object.values(deltas)) if (typeof d === 'number') numbers.push(Math.abs(d));
  const pct = pctChange(total, prevTotal);
  if (pct !== null) numbers.push(Math.abs(pct));
  return buildAllowed({ numbers });
}

function union(...sets: ReadonlyArray<ReadonlySet<string>>): Set<string> {
  const out = new Set<string>();
  for (const s of sets) for (const v of s) out.add(v);
  return out;
}

function factLine(parts: ReadonlyArray<string | number | null | undefined>): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== '').join(' · ');
}

/** 수집 결과 → 플랜 (순수, 결정적) */
export function buildReportPlan(input: CollectedWeek, options: ReportOptions = {}): ReportPlan {
  const showSummary = options.showArticleSummary ?? true;
  const entityMode = options.entityMode ?? 'warn';
  const week = isoWeekInfo(input.range.weekStart);
  const { counts, deltas } = computeCounts(input);
  const cur = splitRows(input.rows);
  const totalItems = cur.videos.length + cur.news.length + cur.papers.length;
  const noData = totalItems === 0;
  const common = commonAllowed(input, counts, deltas, week);
  const kindById = new Map(input.rows.map((r) => [r.id, rowKindOf(r)] as const));

  // ── 목록 (영상 / 논문 / 기사)
  const videos = selectReportVideos(input.rows);
  const paperPicks = selectReportPapers(input.rows);
  const articles = selectReportArticles(input.rows, showSummary);

  // ── 도메인
  let dn = 0;
  const domains: DomainPlan[] = REPORT_DOMAIN_ORDER.map((key) => {
    const curStat = domainStat(key as TechTrendDomain, input.rows);
    const prevStat = domainStat(key as TechTrendDomain, input.prevRows);
    const prevShare = prevStat.den >= WEEKLY_BRIEF_SCORING.domainShare.prevDenominatorMin ? prevStat.share : null;
    const deltaPp = prevShare === null ? null : round1(curStat.share - prevShare);
    const total = curStat.videoNum + curStat.secondNum;
    const secondKind: 'paper' | 'article' = curStat.secondKind === '논문' ? 'paper' : 'article';
    const figures: WeeklyDomainFigures = {
      videos: curStat.videoNum,
      second: curStat.secondNum,
      secondKind,
      total,
      sharePct: round1(curStat.share),
      prevSharePct: prevShare === null ? null : round1(prevShare),
      deltaPp,
    };
    const status: 'active' | 'quiet' = total >= REPORT_LIMITS.quietBelow ? 'active' : 'quiet';
    const label = REPORT_DOMAIN_LABELS[key];
    const topTags = topTagsOf(curStat.videoRows);
    let cards: PlanCard[] = [];
    if (status === 'active') {
      const D = REPORT_LIMITS.domain;
      const vids = sortByVideoScore(curStat.videoRows).slice(0, D.videoCards);
      const room = Math.min(D.secondCards, D.cardsMax - vids.length);
      const seconds = sortSecond(curStat.secondRows, secondKind === 'paper').slice(0, Math.max(0, room));
      cards = [...vids, ...seconds].map((r) => planCard(`d${++dn}`, r, showSummary));
    }
    const nums = cardNumbers(cards);
    const guard: ElementGuard = {
      allowed: union(
        common,
        buildAllowed({
          numbers: [figures.videos, figures.second, figures.total, figures.sharePct, ...(figures.prevSharePct !== null ? [figures.prevSharePct] : []), ...(deltaPp !== null ? [Math.abs(deltaPp)] : []), ...topTags.map((t) => t.count), ...nums.numbers],
          texts: [label, ...topTags.map((t) => t.tag), ...nums.texts],
        }),
      ),
      inputText: [label, ...topTags.map((t) => t.tag), ...cardsText(cards)].join(' '),
    };
    return { key, label, status, figures, topTags, cards, guard, ruleNarrative: status === 'active' ? domainRuleNarrative(label, figures, cards, topTags) : null };
  });

  // ── 회사
  const pool = companyPool(input);
  const ciRows = input.ciChanges.filter((r) => r.after && r.after.trim());
  const ciByCompany = new Map<string, CiChangeRow[]>();
  for (const r of ciRows) {
    const entry = pool.byNorm.get(normalizeCompanyName(r.company));
    if (!entry) continue;
    const list = ciByCompany.get(entry.id) ?? [];
    list.push(r);
    ciByCompany.set(entry.id, list);
  }
  const prevRowsSplit = splitRows(input.prevRows);
  const countOf = (companyId: string) => {
    const videosN = cur.videos.filter((r) => r.companyId === companyId).length;
    const articlesN = cur.news.filter((r) => r.companyId === companyId).length;
    const prevTotal = prevRowsSplit.videos.filter((r) => r.companyId === companyId).length + prevRowsSplit.news.filter((r) => r.companyId === companyId).length;
    return { videos: videosN, articles: articlesN, total: videosN + articlesN, prevTotal };
  };
  const strong = [...ciByCompany.entries()]
    .map(([id, list]) => ({ id, strong: list.filter((r) => STRONG_CONFIDENCE.has(normalizeConfidence(r.confidence)) && r.valueChanged).sort(compareCi), all: list }))
    .filter((c) => c.strong.length > 0)
    .sort((a, b) => compareCi(a.strong[0]!, b.strong[0]!) || b.strong.length - a.strong.length || (pool.byId.get(a.id)?.name ?? '').localeCompare(pool.byId.get(b.id)?.name ?? ''))
    .slice(0, REPORT_LIMITS.companies.ciFirst);
  const chosen = new Set(strong.map((c) => c.id));
  const mentionIds = new Set<string>();
  for (const r of [...cur.videos, ...cur.news]) if (r.companyId && pool.byId.has(r.companyId)) mentionIds.add(r.companyId);
  const byMentions = [...mentionIds]
    .map((id) => ({ id, ...countOf(id) }))
    .filter((c) => c.total >= REPORT_LIMITS.companies.minMentions)
    .sort((a, b) => b.total - a.total || (pool.byId.get(a.id)?.name ?? '').localeCompare(pool.byId.get(b.id)?.name ?? '') || a.id.localeCompare(b.id));
  for (const c of byMentions) {
    if (chosen.size >= REPORT_LIMITS.companies.max) break;
    chosen.add(c.id);
  }
  const ordered = [...chosen]
    .map((id) => ({ id, name: pool.byId.get(id)!.name, ...countOf(id) }))
    .sort((a, b) => Number(a.total < REPORT_LIMITS.companies.minMentions) - Number(b.total < REPORT_LIMITS.companies.minMentions) || b.total - a.total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  let cn = 0;
  let itemN = 0;
  let ciN = 0;
  const companies: CompanyPlan[] = ordered.map((c) => {
    const ref = `c${++cn}`;
    const rows = [...cur.videos, ...cur.news].filter((r) => r.companyId === c.id);
    const vids = sortByVideoScore(rows.filter((r) => rowKindOf(r) === 'video'));
    const news = [...rows.filter((r) => rowKindOf(r) === 'news')].sort((a, b) => Number(articleKeyPointLines(b).length > 0) - Number(articleKeyPointLines(a).length > 0) || newestFirst(a, b));
    const picked: BriefRow[] = [];
    let vi = 0;
    let ni = 0;
    while (picked.length < REPORT_LIMITS.companies.items && (vi < vids.length || ni < news.length)) {
      if (vi < vids.length && (picked.length % 2 === 0 || ni >= news.length)) picked.push(vids[vi++]!);
      else if (ni < news.length) picked.push(news[ni++]!);
      else picked.push(vids[vi++]!);
    }
    const items = picked.map((r) => planCard(`i${++itemN}`, r, showSummary));
    const ciList = [...(ciByCompany.get(c.id) ?? [])].sort(compareCi).slice(0, REPORT_LIMITS.companies.ciPerCompany);
    const ci: CiPlan[] = ciList.map((r) => {
      const conf = normalizeConfidence(r.confidence);
      const change: Omit<WeeklyCompanyCi, 'meaning'> = {
        id: r.valueId,
        item: clip(r.item, 60),
        layer: r.layer ? clip(r.layer, 40) : null,
        before: r.before ? clip(r.before, 120) : null,
        after: clip(r.after, 120),
        confidence: conf,
        sourceName: r.sourceName ? clip(r.sourceName, 120) : null,
        sourceUrl: url400(r.sourceUrl),
        changedAt: toIso(r.changedAt) ?? r.changedAt,
      };
      return {
        ref: `k${++ciN}`,
        change,
        company: c.name,
        ruleMeaning: ciRuleMeaning(change),
        guard: { allowed: union(common, buildAllowed({ texts: [change.item, change.before, change.after, c.name] })), inputText: [change.item, change.before ?? '', change.after, c.name].join(' ') },
      };
    });
    const counts2: WeeklyCompany['counts'] = { total: c.total, videos: c.videos, articles: c.articles, prevTotal: c.prevTotal, deltaPct: pctChange(c.total, c.prevTotal) };
    const nums = cardNumbers(items);
    const ciTexts = ci.flatMap((k) => [k.change.item, k.change.before ?? '', k.change.after]);
    return {
      ref,
      id: c.id,
      name: clip(c.name, REPORT_LIMITS.text.companyName),
      counts: counts2,
      items,
      ci,
      ruleBlurb: companyRuleBlurb(clip(c.name, REPORT_LIMITS.text.companyName), counts2, items, ci.length),
      guard: {
        allowed: union(common, buildAllowed({ numbers: [counts2.total, counts2.videos, counts2.articles, counts2.prevTotal, ...(counts2.deltaPct !== null ? [Math.abs(counts2.deltaPct)] : []), ci.length, ...nums.numbers], texts: [c.name, ...nums.texts, ...ciTexts] })),
        inputText: [c.name, ...cardsText(items), ...ciTexts].join(' '),
      },
    };
  });

  // ── CI 요약
  const ciSel = selectCiChanges(input.ciChanges);
  const ciSummary = { updates: input.ciUpdates, companies: ciSel.companies };

  // ── 논문
  const papers: PaperPlan[] = paperPicks.map((p, i) => {
    const aiLine = aiSummaryLine(p.row);
    return {
      ref: `p${i + 1}`,
      paper: p.paper,
      aiLine,
      guard: { allowed: union(common, buildAllowed({ texts: [p.paper.title, aiLine ?? ''] })), inputText: [p.paper.title, aiLine ?? ''].join(' ') },
    };
  });

  // ── 추이
  const keywords = selectReportKeywords(input.keywords);
  const volumeWeeks = volumeWeeksOf(input, counts);
  const keywordNoteRule = keywordRuleNote(keywords);
  const keywordNoteGuard: ElementGuard = {
    allowed: union(
      common,
      buildAllowed({
        numbers: [...keywords.flatMap((k) => [k.count, k.prevCount, ...(k.deltaPct !== null ? [Math.abs(k.deltaPct)] : [])]), ...volumeWeeks.flatMap((w) => [w.videos, w.articles, w.papers, w.videos + w.articles + w.papers])],
        texts: [...keywords.map((k) => k.term), ...volumeWeeks.map((w) => w.weekStart)],
      }),
    ),
    inputText: keywords.map((k) => k.term).join(' '),
  };

  // ── 하이라이트 후보
  let en = 0;
  const highlights: HighlightCandidate[] = buildReportCandidates(input).map((c, i) => {
    const evidenceRefs = c.evidence.map(() => `e${++en}`);
    const texts = [c.label, c.bigNumber.value, c.bigNumber.caption, ...c.evidence.map((e) => e.title), ...Object.values(c.extra).map((v) => (v === null ? '' : String(v)))];
    const allowed = union(common, buildAllowed({ strings: c.allowedNumbers, texts }));
    const facts = Object.fromEntries(Object.entries(c.extra).map(([k, v]) => [k, typeof v === 'string' ? clip(v, 80) : v])) as Record<string, string | number | null>;
    const unit = c.bigNumber.unit ? clip(c.bigNumber.unit, REPORT_LIMITS.text.figureUnit) : null;
    return {
      ref: `h${i + 1}`,
      id: c.id,
      type: c.type,
      score: c.score,
      label: clip(c.label, 80),
      figure: { value: clip(c.bigNumber.value, REPORT_LIMITS.text.figureValue), unit, caption: clip(c.bigNumber.caption, REPORT_LIMITS.text.figureCaption), delta: c.delta },
      basis: clip(c.basis, REPORT_LIMITS.text.basis),
      evidence: c.evidence.slice(0, 3),
      evidenceRefs: evidenceRefs.slice(0, 3),
      rule: {
        headline: clip(c.rule.headline, REPORT_LIMITS.text.highlightHeadline.max),
        body: clip(`${c.rule.caption}. ${c.basis}`, REPORT_LIMITS.text.highlightBodyRule.max),
      },
      facts,
      guard: { allowed, inputText: texts.join(' ') },
    };
  });

  // ── 관찰 포인트 후보
  const watch = buildWatchEntries(input, { keywords, companies, domains, common, kindById });

  // ── 제목 번역 대상 (한글이 이미 많은 제목은 제외)
  let tn = 0;
  const titles: TitleTarget[] = [
    ...videos.map((v) => ({ kind: 'video' as const, id: v.id, title: v.title })),
    ...papers.map((p) => ({ kind: 'paper' as const, id: p.paper.id, title: p.paper.title })),
    ...articles.map((a) => ({ kind: 'article' as const, id: a.id, title: a.title })),
  ]
    .filter((t) => hangulRatio(t.title) < 0.3)
    .map((t) => ({ ref: `t${++tn}`, kind: t.kind, id: t.id, title: t.title }));

  // 행 상한 도달 경고는 collect 가 이미 inputs.warnings 에 넣는다
  return {
    weekStart: input.range.weekStart,
    weekEnd: input.range.weekEnd,
    period: `${input.range.weekStart} ~ ${input.range.weekEnd}`,
    isoYear: week.isoYear,
    weekNumber: week.weekNumber,
    counts,
    deltas,
    periodStartAt: input.range.startUtc.toISOString(),
    periodEndAt: input.range.periodEndInclusive.toISOString(),
    noData,
    truncated: input.truncated,
    inputWarnings: [...input.warnings],
    highlights,
    domains,
    companies,
    videos,
    papers,
    articles,
    ciSummary,
    keywords,
    volumeWeeks,
    keywordNoteRule,
    keywordNoteGuard,
    watch,
    titles,
    common,
    options: { showArticleSummary: showSummary, entityMode },
  };
}

function buildWatchEntries(
  input: CollectedWeek,
  ctx: { keywords: readonly WeeklyKeyword[]; companies: readonly CompanyPlan[]; domains: readonly DomainPlan[]; common: Set<string>; kindById: Map<string, RowKind | null> },
): WatchEntry[] {
  const entries: Omit<WatchEntry, 'ref'>[] = [];
  const W = REPORT_LIMITS.text;

  // 1) 증가·신규 키워드 최대 2
  const rising = ctx.keywords
    .filter((k) => (k.direction === 'up' || k.direction === 'new') && k.count >= WEEKLY_BRIEF_SCORING.keyword.minCount)
    .sort((a, b) => (b.deltaPct ?? Number.POSITIVE_INFINITY) - (a.deltaPct ?? Number.POSITIVE_INFINITY) || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 2);
  for (const k of rising) {
    const articles = (input.keywordEvidence[k.keywordId] ?? []).slice(0, 1).map<WeeklyReportEvidence>((a) => ({ type: 'article', id: a.articleId, title: clip(a.title, W.evidenceTitle), url: url400(a.url), label: a.source }));
    const evidence: WeeklyReportEvidence[] = [{ type: 'keyword', id: k.keywordId, title: clip(k.term, W.evidenceTitle), url: null, label: `${k.count}회` }, ...articles];
    const change = k.direction === 'new' ? `이번 주 새로 ${k.count}회 언급되었습니다.` : `이번 주 ${k.count}회로 지난주 ${k.prevCount}회 대비 ${Math.abs(k.deltaPct ?? 0)}% 늘었습니다.`;
    entries.push({
      id: `watch:kw:${k.keywordId}`,
      kind: 'keyword',
      ruleTitle: clip(`'${k.term}' 언급 추이 확인`, W.watchTitle.max),
      ruleBody: clip(`'${k.term}' 언급 증가가 다음 주 집계에서도 이어지는지 확인합니다. ${change}`, W.watchBody.max),
      evidence,
      fact: factLine([`키워드 ${k.term}`, `이번 주 ${k.count}회`, `지난주 ${k.prevCount}회`, k.deltaPct !== null ? `증감 ${k.deltaPct}%` : '신규']),
      guard: { allowed: union(ctx.common, buildAllowed({ numbers: [k.count, k.prevCount, Math.abs(k.deltaPct ?? 0)], texts: [k.term] })), inputText: k.term },
    });
  }

  // 2) 신뢰도 C·D·F 인 CI 변경 최대 2
  const lowConf = input.ciChanges
    .filter((r) => r.after && r.after.trim() && ['C', 'D', 'F'].includes(normalizeConfidence(r.confidence)))
    .sort((a, b) => Number(b.valueChanged) - Number(a.valueChanged) || new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime() || a.valueId.localeCompare(b.valueId))
    .slice(0, 2);
  for (const r of lowConf) {
    const conf = normalizeConfidence(r.confidence);
    const after = clip(r.after, 30);
    entries.push({
      id: `watch:ci:${r.valueId}`,
      kind: 'ci',
      ruleTitle: clip(`${clip(r.item, 20)} 추가 출처 확인`, W.watchTitle.max),
      ruleBody: clip(`${clip(r.company, 30)}의 ${clip(r.item, 20)} 값이 '${after}'로 갱신되었으나 신뢰도가 ${conf}입니다. 추가 출처 확인이 필요합니다.`, W.watchBody.max),
      evidence: [{ type: 'ci', id: r.valueId, title: clip(`${r.company} · ${r.item}`, W.evidenceTitle), url: url400(r.sourceUrl), label: clip(r.company, 60) }],
      fact: factLine([`CI ${r.company} ${r.item}`, `현재 ${clip(r.after, 40)}`, `신뢰도 ${conf}`]),
      guard: { allowed: union(ctx.common, buildAllowed({ texts: [r.company, r.item, r.before, r.after] })), inputText: [r.company, r.item, r.before ?? '', r.after].join(' ') },
    });
  }

  // 3) 전주 대비 증가율이 가장 큰 회사 1
  const grow = [...ctx.companies]
    .filter((c) => c.counts.deltaPct !== null && c.counts.deltaPct > 0 && c.counts.total >= 3 && c.items.length > 0)
    .sort((a, b) => (b.counts.deltaPct ?? 0) - (a.counts.deltaPct ?? 0) || b.counts.total - a.counts.total || a.name.localeCompare(b.name))[0];
  if (grow) {
    entries.push({
      id: `watch:co:${grow.id}`,
      kind: 'company',
      ruleTitle: clip(`${clip(grow.name, 24)} 수집 증가 확인`, W.watchTitle.max),
      ruleBody: clip(`${grow.name} 관련 수집 건수가 지난주 ${grow.counts.prevTotal}건에서 이번 주 ${grow.counts.total}건으로 늘었습니다. 다음 주에도 이어지는지 확인합니다.`, W.watchBody.max),
      evidence: grow.items.slice(0, 2).map((c) => cardEvidence(c.card)),
      fact: factLine([`회사 ${grow.name}`, `이번 주 ${grow.counts.total}건`, `지난주 ${grow.counts.prevTotal}건`]),
      guard: { allowed: union(ctx.common, buildAllowed({ numbers: [grow.counts.total, grow.counts.prevTotal, grow.counts.deltaPct], texts: [grow.name] })), inputText: grow.name },
    });
  }

  // 4) 점유율 변동이 가장 큰 도메인 1
  const shift = [...ctx.domains]
    .filter((d) => d.status === 'active' && d.figures.deltaPp !== null && d.figures.prevSharePct !== null && d.cards.length > 0)
    .sort((a, b) => Math.abs(b.figures.deltaPp ?? 0) - Math.abs(a.figures.deltaPp ?? 0) || a.key.localeCompare(b.key))[0];
  if (shift) {
    entries.push({
      id: `watch:dom:${shift.key}`,
      kind: 'domain',
      ruleTitle: clip(`${clip(shift.label, 20)} 점유율 변동 확인`, W.watchTitle.max),
      ruleBody: clip(`${shift.label} 축의 점유율이 지난주 ${shift.figures.prevSharePct}%에서 이번 주 ${shift.figures.sharePct}%로 바뀌었습니다. 변동이 이어지는지 확인합니다.`, W.watchBody.max),
      evidence: shift.cards.slice(0, 2).map((c) => cardEvidence(c.card)),
      fact: factLine([`도메인 ${shift.label}`, `점유율 ${shift.figures.sharePct}%`, `지난주 ${shift.figures.prevSharePct}%`]),
      guard: { allowed: union(ctx.common, buildAllowed({ numbers: [shift.figures.sharePct, shift.figures.prevSharePct, Math.abs(shift.figures.deltaPp ?? 0)], texts: [shift.label] })), inputText: shift.label },
    });
  }

  return entries.slice(0, REPORT_LIMITS.watch.max + 1).map((e, i) => ({ ...e, ref: `w${i + 1}` }));
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 응답 → payload
// ─────────────────────────────────────────────────────────────────────────────

export type ReportAiCall = 'A' | 'B' | 'C' | 'D';

/** summarize-report 가 finalize 에 넘기는 AI 결과 (파싱된 JSON 루트, 검증 전) */
export interface ReportAiInput {
  /** A: { highlights, keywordNote, watchPoints } */
  A: unknown | null;
  /** B: { domains } */
  B: unknown | null;
  /** C: { companies, papers } */
  C: unknown | null;
  /** D: { titles } 또는 [{id, titleKo}] */
  D: unknown | null;
  /** 호출이 실패한 사유(api_error 등) — 해당 섹션 경고 코드가 된다 */
  failed: Partial<Record<ReportAiCall, string>>;
  /** 예산·설정 등으로 AI 전체를 건너뛴 경고 코드 (ai_disabled, ai_not_configured, ai_budget_exceeded, ai_run_cap) */
  batchWarnings: string[];
  /** max_tokens 로 잘려 구제 파싱한 호출 */
  truncated: ReportAiCall[];
}

export const EMPTY_AI_INPUT: ReportAiInput = { A: null, B: null, C: null, D: null, failed: {}, batchWarnings: [], truncated: [] };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function refList(v: unknown): string[] {
  return asArray(v).filter((x): x is string => typeof x === 'string');
}

interface GuardTally {
  sentences: number;
  dropped: { policy: number; banned: number; number: number; entity: number };
  trimmed: number;
  entityWarnings: number;
  elements: number;
  elementsFallback: number;
}

function newTally(): GuardTally {
  return { sentences: 0, dropped: { policy: 0, banned: 0, number: 0, entity: 0 }, trimmed: 0, entityWarnings: 0, elements: 0, elementsFallback: 0 };
}

function addStats(t: GuardTally, s: GuardStats): void {
  t.sentences += s.sentences;
  t.dropped.policy += s.dropped.policy;
  t.dropped.banned += s.dropped.banned;
  t.dropped.number += s.dropped.number;
  t.dropped.entity += s.dropped.entity;
  t.trimmed += s.trimmed;
  t.entityWarnings += s.entityWarnings;
}

function sourceOf(flags: readonly boolean[]): WeeklySectionSource {
  if (flags.length === 0) return 'none';
  const ai = flags.filter(Boolean).length;
  return ai === flags.length ? 'ai' : ai === 0 ? 'rule' : 'mixed';
}

export interface ReportStatusInput {
  noData: boolean;
  warnings: readonly string[];
  sectionSources: Record<WeeklyReportSectionSourceKey, WeeklySectionSource>;
  ruleElements: number;
  totalElements: number;
}

/** 상태 판정표 (failed 는 예외 경로에서만 서비스가 결정) */
export function decideReportStatus(input: ReportStatusInput): Exclude<WeeklyBriefStatusCode, 'failed'> {
  if (input.noData) return 'partial';
  if (input.warnings.some((w) => w.endsWith('_failed') || w === 'ai_disabled')) return 'partial';
  if (SECTION_KEYS.some((k) => input.sectionSources[k] === 'rule')) return 'partial';
  if (input.totalElements > 0 && input.ruleElements / input.totalElements > REPORT_LIMITS.partialRuleRatio) return 'partial';
  return 'ok';
}

export interface ReportResult {
  payload: WeeklyReportPayload;
  status: Exclude<WeeklyBriefStatusCode, 'failed'>;
  stats: Record<string, unknown>;
  plan: ReportPlan;
}

/** 하이라이트 선택: AI 순서를 존중하고 부족하면 점수순으로 채운다. 규칙 전용이면 점수순 최대 5개 */
function pickHighlights(plan: ReportPlan, aiOrder: HighlightCandidate[] | null): HighlightCandidate[] {
  const H = REPORT_LIMITS.highlights;
  const picked: HighlightCandidate[] = [];
  const typeCount = new Map<WeeklyReportCandidateType, number>();
  const push = (c: HighlightCandidate): boolean => {
    if (picked.some((p) => p.id === c.id)) return false;
    if ((typeCount.get(c.type) ?? 0) >= TYPE_LIMIT[c.type]) return false;
    picked.push(c);
    typeCount.set(c.type, (typeCount.get(c.type) ?? 0) + 1);
    return true;
  };
  for (const c of aiOrder ?? []) if (picked.length < H.max) push(c);
  const target = aiOrder ? H.min : H.max;
  for (const c of plan.highlights) {
    if (picked.length >= Math.min(target, H.max)) break;
    push(c);
  }
  return picked;
}

/** 플랜 + AI 결과(없으면 전부 규칙 문장) → payload */
export function finalizeReport(plan: ReportPlan, aiIn: ReportAiInput | null, now: Date, options: ReportOptions = {}): ReportResult {
  const ai = aiIn ?? EMPTY_AI_INPUT;
  const entityMode = options.entityMode ?? plan.options.entityMode;
  const tally = newTally();
  const aiDiag: Record<string, unknown> = {};
  const T = REPORT_LIMITS.text;

  const guarded = (raw: unknown, spec: { max: number; min: number }, g: ElementGuard): string | null => {
    tally.elements++;
    const r = guardNarrative(raw, { max: spec.max, min: spec.min, allowed: g.allowed, inputText: g.inputText, entityMode });
    addStats(tally, r.stats);
    if (!r.ok) {
      tally.elementsFallback++;
      return null;
    }
    return r.text;
  };

  // ── A: 하이라이트 / 키워드 해설 / 관찰 포인트
  const A = asRecord(ai.A);
  const aiDiscarded: { section: string; id: string; reason: string }[] = [];

  const candByRef = new Map(plan.highlights.map((c) => [c.ref, c]));
  const aiHighlights = new Map<string, { headline: unknown; body: unknown }>();
  const aiOrder: HighlightCandidate[] = [];
  {
    const seen = new Set<string>();
    const typeCount = new Map<WeeklyReportCandidateType, number>();
    for (const item of asArray(A?.highlights)) {
      const o = asRecord(item);
      const ref = typeof o?.candidateId === 'string' ? o.candidateId : '';
      const cand = candByRef.get(ref);
      if (!o || !cand) {
        aiDiscarded.push({ section: 'highlights', id: ref || '*', reason: 'unknown_candidate' });
        continue;
      }
      if (seen.has(ref)) {
        aiDiscarded.push({ section: 'highlights', id: ref, reason: 'duplicate_id' });
        continue;
      }
      if (aiOrder.length >= REPORT_LIMITS.highlights.max) {
        aiDiscarded.push({ section: 'highlights', id: ref, reason: 'too_many' });
        continue;
      }
      if ((typeCount.get(cand.type) ?? 0) >= TYPE_LIMIT[cand.type]) {
        aiDiscarded.push({ section: 'highlights', id: ref, reason: 'type_limit' });
        continue;
      }
      const refs = refList(o.refs);
      if (refs.length === 0 || !refs.some((r) => cand.evidenceRefs.includes(r))) {
        aiDiscarded.push({ section: 'highlights', id: ref, reason: 'invalid_refs' });
        continue;
      }
      seen.add(ref);
      typeCount.set(cand.type, (typeCount.get(cand.type) ?? 0) + 1);
      aiOrder.push(cand);
      aiHighlights.set(ref, { headline: o.headline, body: o.body });
    }
  }
  const pickedHighlights = pickHighlights(plan, A ? aiOrder : null);
  const highlights: WeeklyHighlight[] = pickedHighlights.map((c) => {
    const raw = aiHighlights.get(c.ref);
    let headline: string | null = null;
    let body: string | null = null;
    if (raw) {
      body = guarded(raw.body, T.highlightBody, c.guard);
      headline = guarded(raw.headline, T.highlightHeadline, c.guard);
      if (body === null) headline = null; // 본문이 규칙 문장이면 제목도 규칙 문장으로 맞춘다
    }
    const byAi = raw !== undefined && body !== null;
    return {
      id: c.id,
      candidateType: c.type,
      headline: byAi ? (headline ?? c.rule.headline) : c.rule.headline,
      body: byAi ? (body as string) : c.rule.body,
      figure: c.figure,
      basis: c.basis,
      evidence: c.evidence,
      generatedBy: byAi ? 'ai' : 'rule',
    };
  });

  // 키워드 해설
  let keywordNote: string | null = null;
  let keywordNoteBy: WeeklyGeneratedBy | null = null;
  if (plan.keywordNoteRule !== null) {
    const aiNote = A ? guarded(A.keywordNote, T.keywordNote, plan.keywordNoteGuard) : null;
    if (aiNote !== null) {
      keywordNote = aiNote;
      keywordNoteBy = 'ai';
    } else {
      if (!A || A.keywordNote === undefined) tally.elements++;
      if (!A || A.keywordNote === undefined) tally.elementsFallback++;
      keywordNote = plan.keywordNoteRule;
      keywordNoteBy = 'rule';
    }
  }

  // 관찰 포인트
  const watchPoints: WeeklyWatchPoint[] = [];
  {
    const used = new Set<string>();
    const byRef = new Map(plan.watch.map((w) => [w.ref, w]));
    for (const item of asArray(A?.watchPoints)) {
      if (watchPoints.length >= REPORT_LIMITS.watch.max) break;
      const o = asRecord(item);
      const refs = o ? refList(o.refs).filter((r) => byRef.has(r)) : [];
      if (!o || refs.length === 0) {
        aiDiscarded.push({ section: 'watch', id: '*', reason: 'invalid_refs' });
        continue;
      }
      const entries = uniqueBy(refs.map((r) => byRef.get(r)!), (w) => w.ref).slice(0, 2);
      if (entries.some((e) => used.has(e.ref))) {
        aiDiscarded.push({ section: 'watch', id: entries[0]!.ref, reason: 'duplicate_ref' });
        continue;
      }
      const g: ElementGuard = { allowed: union(...entries.map((e) => e.guard.allowed)), inputText: entries.map((e) => e.guard.inputText).join(' ') };
      const title = guarded(o.title, T.watchTitle, g);
      const body = guarded(o.body, T.watchBody, g);
      if (title === null || body === null) continue; // 요소 전체를 규칙 후보로 대체(아래 보충)
      const evidence = uniqueBy(entries.flatMap((e) => e.evidence), (e) => `${e.type}:${e.id}`).slice(0, 2);
      if (evidence.length === 0) continue;
      for (const e of entries) used.add(e.ref);
      watchPoints.push({ id: entries.map((e) => e.id).join('+'), title, body, evidence, generatedBy: 'ai' });
    }
    const minWatch = REPORT_LIMITS.watch.min;
    for (const e of plan.watch) {
      if (watchPoints.length >= Math.min(minWatch, plan.watch.length) && (A || watchPoints.length >= REPORT_LIMITS.watch.max)) break;
      if (watchPoints.length >= REPORT_LIMITS.watch.max) break;
      if (used.has(e.ref)) continue;
      if (e.evidence.length === 0) continue;
      used.add(e.ref);
      tally.elements++;
      tally.elementsFallback++;
      watchPoints.push({ id: e.id, title: e.ruleTitle, body: e.ruleBody, evidence: e.evidence.slice(0, 2), generatedBy: 'rule' });
    }
  }

  // ── B: 도메인
  const B = asRecord(ai.B);
  const aiNarr = new Map<string, unknown>();
  {
    const activeByKey = new Map(plan.domains.filter((d) => d.status === 'active').map((d) => [d.key as string, d]));
    for (const item of asArray(B?.domains)) {
      const o = asRecord(item);
      const key = typeof o?.key === 'string' ? o.key : '';
      const dom = activeByKey.get(key);
      if (!o || !dom) {
        aiDiscarded.push({ section: 'domains', id: key || '*', reason: 'unknown_domain' });
        continue;
      }
      if (aiNarr.has(key)) {
        aiDiscarded.push({ section: 'domains', id: key, reason: 'duplicate_id' });
        continue;
      }
      const refs = refList(o.refs);
      if (refs.length === 0 || !refs.some((r) => dom.cards.some((c) => c.ref === r))) {
        aiDiscarded.push({ section: 'domains', id: key, reason: 'invalid_refs' });
        continue;
      }
      aiNarr.set(key, o.narrative);
    }
  }
  const domains: WeeklyDomainBlock[] = plan.domains.map((d) => {
    let narrative: string | null = null;
    let by: WeeklyGeneratedBy = 'rule';
    if (d.status === 'active') {
      const raw = aiNarr.get(d.key);
      const text = raw !== undefined ? guarded(raw, T.domainNarrative, d.guard) : null;
      if (raw === undefined) {
        tally.elements++;
        tally.elementsFallback++;
      }
      if (text !== null) {
        narrative = text;
        by = 'ai';
      } else {
        narrative = d.ruleNarrative;
      }
    }
    return {
      key: d.key,
      label: d.label,
      status: d.status,
      figures: d.figures,
      topTags: d.topTags,
      narrative,
      evidence: d.cards.map((c) => c.card),
      generatedBy: by,
    };
  });

  // ── C: 회사 / 논문
  const C = asRecord(ai.C);
  const aiCompanies = new Map<string, Record<string, unknown>>();
  for (const item of asArray(C?.companies)) {
    const o = asRecord(item);
    const ref = typeof o?.ref === 'string' ? o.ref : '';
    const co = plan.companies.find((c) => c.ref === ref);
    if (!o || !co) {
      aiDiscarded.push({ section: 'companies', id: ref || '*', reason: 'unknown_company' });
      continue;
    }
    if (aiCompanies.has(ref)) {
      aiDiscarded.push({ section: 'companies', id: ref, reason: 'duplicate_id' });
      continue;
    }
    const refs = refList(o.refs);
    if (refs.length > 0 && !refs.some((r) => co.items.some((i) => i.ref === r) || co.ci.some((k) => k.ref === r))) {
      aiDiscarded.push({ section: 'companies', id: ref, reason: 'invalid_refs' });
      continue;
    }
    aiCompanies.set(ref, o);
  }
  const companies: WeeklyCompany[] = plan.companies.map((co) => {
    const o = aiCompanies.get(co.ref);
    const text = o ? guarded(o.blurb, T.companyBlurb, co.guard) : null;
    if (!o) {
      tally.elements++;
      tally.elementsFallback++;
    }
    const meanings = new Map<string, unknown>();
    for (const m of asArray(o?.ciMeanings)) {
      const mo = asRecord(m);
      if (mo && typeof mo.ref === 'string' && co.ci.some((k) => k.ref === mo.ref) && !meanings.has(mo.ref)) meanings.set(mo.ref, mo.meaning);
    }
    const ciChanges: WeeklyCompanyCi[] = co.ci.map((k) => {
      const raw = meanings.get(k.ref);
      const t = raw !== undefined ? guarded(raw, T.ciMeaning, k.guard) : null;
      return { ...k.change, meaning: t ?? k.ruleMeaning };
    });
    return {
      id: co.id,
      name: co.name,
      counts: co.counts,
      blurb: text ?? co.ruleBlurb,
      items: co.items.map((c) => c.card),
      ciChanges,
      generatedBy: text !== null ? 'ai' : 'rule',
    };
  });

  const aiWhy = new Map<string, unknown>();
  for (const item of asArray(C?.papers)) {
    const o = asRecord(item);
    if (o && typeof o.ref === 'string' && plan.papers.some((p) => p.ref === o.ref) && !aiWhy.has(o.ref)) aiWhy.set(o.ref, o.why);
    else aiDiscarded.push({ section: 'papers', id: typeof o?.ref === 'string' ? o.ref : '*', reason: 'unknown_paper' });
  }
  const papers: WeeklyReportPaper[] = plan.papers.map((p) => {
    const raw = aiWhy.get(p.ref);
    const why = raw !== undefined ? guardNarrative(raw, { max: T.paperWhy.max, min: T.paperWhy.min, allowed: p.guard.allowed, inputText: p.guard.inputText, entityMode }) : null;
    if (why) addStats(tally, why.stats);
    return { ...p.paper, whyItMatters: why && why.ok ? why.text : null };
  });

  // ── D: 제목 번역
  const translations = new Map<string, string>();
  {
    const byRef = new Map(plan.titles.map((t) => [t.ref, t]));
    const list = Array.isArray(ai.D) ? ai.D : asArray(asRecord(ai.D)?.titles);
    let rejected = 0;
    for (const item of list) {
      const o = asRecord(item);
      const ref = typeof o?.ref === 'string' ? o.ref : typeof o?.id === 'string' ? o.id : '';
      const target = byRef.get(ref);
      if (!o || !target || translations.has(`${target.kind}:${target.id}`)) {
        rejected++;
        continue;
      }
      const r = guardTitleTranslation(o.titleKo, target.title, TITLE_KO_MAX);
      if (r.ok) translations.set(`${target.kind}:${target.id}`, r.text);
      else rejected++;
    }
    aiDiag.titles = { requested: plan.titles.length, accepted: translations.size, rejected };
  }
  const ko = (kind: 'video' | 'paper' | 'article', id: string): string | null => translations.get(`${kind}:${id}`) ?? null;
  const videos: WeeklyReportVideo[] = plan.videos.map((v) => ({ ...v, titleKo: ko('video', v.id) }));
  const papersKo = papers.map((p) => ({ ...p, titleKo: ko('paper', p.id) }));
  const articles: WeeklyReportArticle[] = plan.articles.map((a) => ({ ...a, titleKo: ko('article', a.id) }));
  const withKo = (c: WeeklyEvidenceCard): WeeklyEvidenceCard => ({ ...c, titleKo: ko(c.type, c.id) });
  const domainsKo = domains.map((d) => ({ ...d, evidence: d.evidence.map(withKo) }));
  const companiesKo = companies.map((c) => ({ ...c, items: c.items.map(withKo) }));

  // ── 추이
  const trends: WeeklyReportTrends = { volume: { weeks: plan.volumeWeeks }, keywords: plan.keywords, keywordNote };

  // ── 메타
  const warnings: string[] = [...plan.inputWarnings];
  if (plan.truncated && !warnings.includes('rows_truncated')) warnings.push('rows_truncated');
  const addWarn = (w: string) => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  for (const w of options.extraWarnings ?? []) addWarn(w);
  for (const w of ai.batchWarnings) addWarn(w);
  const batchSkipped = ai.batchWarnings.length > 0;
  if (!batchSkipped) {
    if (ai.failed.A) addWarn('ai_highlights_failed');
    if (ai.failed.B) addWarn('ai_domains_failed');
    if (ai.failed.C) addWarn('ai_companies_failed');
    if (ai.failed.D) addWarn('ai_titles_unavailable');
  }
  for (const c of ai.truncated) {
    addWarn('ai_truncated');
    aiDiag[`truncated${c}`] = true;
  }
  if (plan.noData) addWarn('no_data');

  const hlFlags = highlights.map((h) => h.generatedBy === 'ai');
  const domFlags = domainsKo.filter((d) => d.status === 'active').map((d) => d.generatedBy === 'ai');
  const coFlags = companiesKo.map((c) => c.generatedBy === 'ai');
  const watchFlags = watchPoints.map((w) => w.generatedBy === 'ai');
  const sectionSources: Record<WeeklyReportSectionSourceKey, WeeklySectionSource> = {
    highlights: sourceOf(hlFlags),
    domains: sourceOf(domFlags),
    companies: sourceOf(coFlags),
    papers: papersKo.some((p) => p.whyItMatters !== null) ? 'ai' : 'none',
    trends: keywordNoteBy === null ? 'none' : keywordNoteBy === 'ai' ? 'ai' : 'rule',
    watch: sourceOf(watchFlags),
  };
  const ruleElements =
    hlFlags.filter((f) => !f).length +
    domFlags.filter((f) => !f).length +
    coFlags.filter((f) => !f).length +
    watchFlags.filter((f) => !f).length +
    (keywordNoteBy === 'rule' ? 1 : 0);
  const totalElements = hlFlags.length + domFlags.length + coFlags.length + watchFlags.length + (keywordNoteBy === null ? 0 : 1);

  const status = decideReportStatus({ noData: plan.noData, warnings, sectionSources, ruleElements, totalElements });
  const aiUsed = highlights.some((h) => h.generatedBy === 'ai') || domFlags.some(Boolean) || coFlags.some(Boolean) || watchFlags.some(Boolean) || keywordNoteBy === 'ai' || papersKo.some((p) => p.whyItMatters !== null) || translations.size > 0;
  const ruleBasedSections = SECTION_KEYS.filter((k) => sectionSources[k] === 'rule').length;

  const payload: WeeklyReportPayload = {
    schemaVersion: 2,
    header: {
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      isoYear: plan.isoYear,
      weekNumber: plan.weekNumber,
      periodStartAt: plan.periodStartAt,
      periodEndAt: plan.periodEndAt,
      generatedAt: now.toISOString(),
      counts: plan.counts,
      deltas: plan.deltas,
    },
    highlights,
    domains: domainsKo,
    companies: companiesKo,
    videos,
    papers: papersKo,
    articles,
    ciSummary: plan.ciSummary,
    trends,
    watchPoints,
    meta: { aiUsed, ruleBasedSections, sectionSources, warnings, truncated: plan.truncated },
  };

  const stats: Record<string, unknown> = {
    format: 'report',
    candidates: plan.highlights.map((c) => ({ id: c.id, type: c.type, score: Math.round(c.score * 100) / 100 })),
    selected: highlights.map((h) => ({ id: h.id, by: h.generatedBy })),
    guard: tally,
    aiDiscarded,
    sectionSources,
    ruleElements,
    totalElements,
    ai: aiDiag,
    truncated: plan.truncated,
  };

  return { payload: clampPayloadStrings(payload), status, stats, plan };
}

// ─────────────────────────────────────────────────────────────────────────────
// 안전망: 모든 문자열 400자 이하
// ─────────────────────────────────────────────────────────────────────────────

/** payload 의 모든 문자열을 400자로 줄인다(말줄임). 정상 경로에서는 아무것도 바뀌지 않는 마지막 안전망 */
export function clampPayloadStrings<T>(value: T, max: number = 400): T {
  if (typeof value === 'string') {
    const chars = Array.from(value);
    return (chars.length <= max ? value : chars.slice(0, max - 1).join('') + '…') as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => clampPayloadStrings(v, max)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clampPayloadStrings(v, max);
    return out as T;
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// 편의: 수집 → payload 한 번에
// ─────────────────────────────────────────────────────────────────────────────

export function isArticleSummaryEnabledEnv(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.WEEKLY_BRIEF_SHOW_ARTICLE_SUMMARY?.trim().toLowerCase() !== 'false';
}

/** 수집 결과 + (선택) AI 결과 → payload. ai 가 null 이면 전부 규칙 문장이다 */
export function composeReport(input: CollectedWeek, ai: ReportAiInput | null, now: Date, options: ReportOptions = {}): ReportResult {
  const plan = buildReportPlan(input, {
    showArticleSummary: options.showArticleSummary ?? isArticleSummaryEnabledEnv(),
    entityMode: options.entityMode ?? resolveEntityGuardMode(),
  });
  return finalizeReport(plan, ai, now, options);
}

/** 서술 필드 합계 글자 수 (AC-V2-04: 하이라이트 headline·body, 도메인 narrative, 회사 blurb, 관찰 포인트 body, 키워드 해설) */
export function narrativeCharCount(p: WeeklyReportPayload): number {
  const len = (s: string | null | undefined) => (s ? charLength(s) : 0);
  return (
    p.highlights.reduce((n, h) => n + len(h.headline) + len(h.body), 0) +
    p.domains.reduce((n, d) => n + len(d.narrative), 0) +
    p.companies.reduce((n, c) => n + len(c.blurb), 0) +
    p.watchPoints.reduce((n, w) => n + len(w.body), 0) +
    len(p.trends.keywordNote)
  );
}

/**
 * 파생 요약 보유율 (PM-1: 기사 keyPoints 보유율 측정) — 수집된 행 전체 기준.
 * 예: { news: { total: 187, withKeyPoints: 41 }, ... } — stats 에만 남기고 payload 에는 싣지 않는다.
 */
export function computeSummaryCoverage(rows: readonly BriefRow[]): { videos: { total: number; withSummary: number }; papers: { total: number; withAiSummary: number }; news: { total: number; withKeyPoints: number } } {
  const { videos, papers, news } = splitRows(rows);
  return {
    videos: { total: videos.length, withSummary: videos.filter((r) => videoSummaryLines(r).length > 0).length },
    papers: { total: papers.length, withAiSummary: papers.filter((r) => paperSummaryLines(r).length > 0).length },
    news: { total: news.length, withKeyPoints: news.filter((r) => articleKeyPointLines(r).length > 0).length },
  };
}
