/**
 * TechTrendTimelineService — 핸드 기술 시계열 트렌드 (수집 시작 이후 전체 기간)
 *
 * 핸드 논문(arXiv)·영상 전체를 extracted_metadata.handTopics(서브토픽 분류)로 월별 집계한다.
 *  - 스코프: 논문 = SQL ILIKE 용어 1차 필터 + JS matchesDomainSecondary 정밀 재판정,
 *            영상 = product_type='video' + matchesDomainVideo + domainFocus 'none' 제외(판정 전은 유지).
 *  - 월 기준: COALESCE(published_at, collected_at) 의 UTC YYYY-MM, 미래 날짜는 현재 월로 보정.
 *  - 모든 계산은 이 파일의 순수 함수에서 끝내고 프런트는 그리기만 한다.
 *
 * 캐시: view_cache 'tech-trend-timeline:v1:hand' (기본 10분). 무효화는 cachedAt을 epoch로 되돌린다.
 */

import { sql, and, eq, or, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, viewCache } from '../db/schema.js';
import { decodeHtmlEntities } from './event-video-brief.service.js';
import {
  matchesDomainSecondary,
  matchesDomainVideo,
  filterByDomainFocus,
  getDomainFocus,
  type ArticleRow,
} from './tech-trend-report.service.js';
import {
  HAND_TOPICS,
  HAND_TOPIC_VERSION,
  HAND_CORE_TOPIC_IDS,
  HAND_TOPIC_IDS_WITH_OTHER,
  OFF_TOPIC_ID,
  OTHER_TOPIC_ID,
  getHandTopics,
  getHandTopicsAttempts,
} from './hand-topics.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수 / 설정
// ─────────────────────────────────────────────────────────────────────────────

export const TIMELINE_SUPPORTED_DOMAINS = ['hand'] as const;
export const TIMELINE_CACHE_KEY = 'tech-trend-timeline:v1:hand';
export const TIMELINE_INSIGHT_CACHE_KEY = 'tech-trend-timeline-insight:v2:hand';

/** 소스별 조회 상한 — 넘으면 scope.truncated=true + 경고 로그 */
export const TIMELINE_ROW_LIMIT = 5000;
/** 수집 시작 월보다 이만큼 넘게 과거인 항목은 제외 (영상의 오래된 publishedAt 가드) */
export const MAX_BACKFILL_MONTHS = 12;
/** 이 개월 수를 넘으면 히트맵을 분기 단위로 */
export const MONTH_GRANULARITY_MAX = 12;
/** 분류 시도 한도 — 이 이상이면 "분류 실패" 집계 */
export const MAX_CLASSIFY_ATTEMPTS = 3;
export const COLOR_INDEX_LIMIT = 6;
export const TITLE_CUT = 90;
export const LOW_VOLUME_MONTHLY_AVG = 1;

const TIMELINE_TTL_MS = (() => {
  const n = Number(process.env.TECH_TREND_TIMELINE_TTL_MIN);
  return (Number.isFinite(n) && n > 0 ? n : 10) * 60_000;
})();

/**
 * 논문 SQL 1차 필터 용어 (ILIKE '%term%', 대소문자 무시).
 * DOMAIN_REPORT_CONFIGS.hand.paperRegex 가 매칭하는 모든 문자열을 포함하는 상위집합이어야 한다.
 * Postgres 정규식에서 \b 는 백스페이스이므로 JS 정규식을 SQL로 옮기지 않고, JS에서 정밀 재판정한다.
 */
export const PAPER_SQL_TERMS: readonly string[] = [
  'hand',
  'gripper',
  'finger',
  'tactile',
  'dexter',
  'grasp',
  'manipulat',
];

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type TimelineSource = 'paper' | 'video';
export type Granularity = 'month' | 'quarter';
export type TrendLabel = 'rising' | 'falling' | 'steady' | 'insufficient';
export type LeadLagRelation = 'paper_leads' | 'video_leads' | 'concurrent' | 'undetermined';

/** 집계 입력 1건 (스코프 행에서 변환) */
export interface TimelineItem {
  id: string;
  source: TimelineSource;
  /** UTC YYYY-MM */
  month: string;
  title: string;
  /** 정렬용 epoch ms (publishedAt ?? collectedAt) */
  time: number;
  /** null = 미분류(또는 구버전/비정상 저장값) */
  topics: string[] | null;
  primary: string | null;
  attempts: number;
  /** 대표 선정에만 쓰고 출력/프롬프트에는 쓰지 않는다 */
  views: number | null;
  focus: 'primary' | 'secondary' | null;
}

export interface TopicCount {
  any: number;
  primary: number;
}

export interface SourceBucket {
  total: number;
  unclassified: number;
  offTopic: number;
  byTopic: Record<string, TopicCount>;
}

export interface TimelineBucket {
  month: string;
  partial: boolean;
  beforeCollection: boolean;
  papers: SourceBucket;
  videos: SourceBucket;
}

export interface TrendStat {
  recent: number;
  prior: number;
  delta: number;
  rate: number | null;
  label: TrendLabel;
  emerging: boolean;
  firstMonth: string | null;
  peakMonth: string | null;
}

export interface LeadLag {
  relation: LeadLagRelation;
  lagMonths: number | null;
}

export interface TimelineTopic {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  colorIndex: number | null;
  totals: { papers: TopicCount; videos: TopicCount };
  monthlyAvg: number;
  lowVolume: boolean;
  trend: { papers: TrendStat; videos: TrendStat; combined: TrendStat };
  leadLag: LeadLag;
}

export interface HeatmapRow {
  topicId: string;
  papers: { any: number[]; primary: number[] };
  videos: { any: number[]; primary: number[] };
}

export interface Heatmap {
  granularity: Granularity;
  columns: { key: string; label: string; partial: boolean }[];
  rows: HeatmapRow[];
}

export interface ClassificationSummary {
  total: number;
  classified: number;
  offTopic: number;
  unclassified: number;
  failed: number;
  ratio: number;
  version: number;
  papers: { total: number; classified: number };
  videos: { total: number; classified: number };
}

export interface TimelinePeriod {
  startMonth: string;
  endMonth: string;
  monthCount: number;
  completeMonthCount: number;
  collectionStartedAt: string | null;
  granularity: Granularity;
}

export interface TimelineScope {
  videosExcludedByFocus: number;
  videosPendingJudgement: number;
  beforeRangeDropped: number;
  truncated: boolean;
}

export interface TimelineBody {
  domain: 'hand';
  generatedAt: string;
  period: TimelinePeriod | null;
  topics: TimelineTopic[];
  buckets: TimelineBucket[];
  heatmap: Heatmap;
  classification: ClassificationSummary;
  scope: TimelineScope;
}

export interface TimelineResponse extends TimelineBody {
  cached: boolean;
}

export interface TimelineRangeInfo {
  months: string[];
  completeMonths: number;
}

export interface Representative {
  id: string;
  title: string;
  month: string;
}

export interface TimelineSnapshot {
  body: TimelineBody;
  items: TimelineItem[];
  months: string[];
  completeMonths: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 월 계산
// ─────────────────────────────────────────────────────────────────────────────

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** UTC YYYY-MM — published 우선, 없으면 collected. 둘 다 없으면 null. 미래 날짜는 현재 월로 보정. */
export function monthKey(
  published: Date | string | null | undefined,
  collected: Date | string | null | undefined,
  now: Date
): string | null {
  const d = toDate(published) ?? toDate(collected);
  if (!d) return null;
  const key = fmtMonth(d);
  const nowKey = fmtMonth(now);
  return key > nowKey ? nowKey : key;
}

function parseMonth(m: string): { y: number; mo: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return null;
  const mo = Number(match[2]);
  if (mo < 1 || mo > 12) return null;
  return { y: Number(match[1]), mo };
}

export function addMonths(month: string, delta: number): string {
  const p = parseMonth(month);
  if (!p) return month;
  const idx = p.y * 12 + (p.mo - 1) + delta;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${y}-${String(mo).padStart(2, '0')}`;
}

/** 양끝 포함 월 목록. start > end 면 빈 배열. */
export function buildMonthRange(start: string, end: string): string[] {
  if (!parseMonth(start) || !parseMonth(end) || start > end) return [];
  const out: string[] = [];
  for (let m = start; m <= end; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function chooseGranularity(monthCount: number): Granularity {
  return monthCount <= MONTH_GRANULARITY_MAX ? 'month' : 'quarter';
}

/**
 * 시작월 = 스코프 항목의 최소 월. 단 수집 시작 월보다 maxBackfillMonths 넘게 앞선 항목은 제외하고 건수만 센다.
 * 종료월 = 현재 월. 항목이 없으면(전부 제외 포함) range=null.
 */
export function resolveRange(
  items: { month: string }[],
  now: Date,
  opts: { maxBackfillMonths: number; collectionStartMonth: string | null }
): { range: { startMonth: string; endMonth: string } | null; dropped: number } {
  const cutoff = opts.collectionStartMonth ? addMonths(opts.collectionStartMonth, -opts.maxBackfillMonths) : null;
  let dropped = 0;
  let min: string | null = null;
  for (const it of items) {
    if (cutoff && it.month < cutoff) {
      dropped++;
      continue;
    }
    if (min === null || it.month < min) min = it.month;
  }
  if (min === null) return { range: null, dropped };
  return { range: { startMonth: min, endMonth: fmtMonth(now) }, dropped };
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 집계
// ─────────────────────────────────────────────────────────────────────────────

function emptySourceBucket(): SourceBucket {
  const byTopic: Record<string, TopicCount> = {};
  for (const id of HAND_TOPIC_IDS_WITH_OTHER) byTopic[id] = { any: 0, primary: 0 };
  return { total: 0, unclassified: 0, offTopic: 0, byTopic };
}

/**
 * 월별 버킷 + 분류 진행률 집계.
 *  - total = off_topic 제외 스코프 건수(미분류 포함). 불변식: Σ primary(10개+other) + unclassified = total.
 *  - 복수 토픽은 any 에만 중복 집계되고 primary 는 1개 토픽에만 집계된다.
 */
export function aggregateTimeline(
  items: TimelineItem[],
  months: string[],
  now: Date,
  collectionStartMonth: string | null
): { buckets: TimelineBucket[]; classification: ClassificationSummary } {
  const nowMonth = fmtMonth(now);
  const buckets: TimelineBucket[] = months.map((month) => ({
    month,
    partial: month === nowMonth,
    beforeCollection: collectionStartMonth !== null && month < collectionStartMonth,
    papers: emptySourceBucket(),
    videos: emptySourceBucket(),
  }));
  const byMonth = new Map(buckets.map((b) => [b.month, b]));

  const cls = {
    total: 0,
    classified: 0,
    offTopic: 0,
    failed: 0,
    papers: { total: 0, classified: 0 },
    videos: { total: 0, classified: 0 },
  };

  for (const it of items) {
    const bucket = byMonth.get(it.month);
    if (!bucket) continue;
    const sb = it.source === 'paper' ? bucket.papers : bucket.videos;
    const cs = it.source === 'paper' ? cls.papers : cls.videos;
    cls.total++;
    cs.total++;

    if (it.topics === null || it.primary === null) {
      sb.total++;
      sb.unclassified++;
      if (it.attempts >= MAX_CLASSIFY_ATTEMPTS) cls.failed++;
      continue;
    }
    cls.classified++;
    cs.classified++;
    if (it.primary === OFF_TOPIC_ID) {
      sb.offTopic++;
      cls.offTopic++;
      continue;
    }
    sb.total++;
    for (const t of it.topics) {
      const c = sb.byTopic[t];
      if (c) c.any++;
    }
    const pc = sb.byTopic[it.primary];
    if (pc) pc.primary++;
  }

  const unclassified = cls.total - cls.classified;
  return {
    buckets,
    classification: {
      total: cls.total,
      classified: cls.classified,
      offTopic: cls.offTopic,
      unclassified,
      failed: cls.failed,
      ratio: cls.total > 0 ? cls.classified / cls.total : 0,
      version: HAND_TOPIC_VERSION,
      papers: cls.papers,
      videos: cls.videos,
    },
  };
}

/**
 * 토픽 순서/색 인덱스 — 10개 서브토픽은 합계 내림차순(동률은 분류 체계 순서), other 는 항상 마지막.
 * colorIndex: 합계가 있는 상위 6개 = 0~5, 나머지와 other = null.
 */
export function rankTopics(
  totals: Record<string, number>
): { id: string; order: number; colorIndex: number | null }[] {
  const core = HAND_CORE_TOPIC_IDS.map((id, idx) => ({ id, idx, total: totals[id] ?? 0 })).sort(
    (a, b) => b.total - a.total || a.idx - b.idx
  );
  const out = core.map((c, i) => ({
    id: c.id,
    order: i,
    colorIndex: i < COLOR_INDEX_LIMIT && c.total > 0 ? i : null,
  }));
  out.push({ id: OTHER_TOPIC_ID, order: core.length, colorIndex: null });
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 월 평균 = 합계 / 완료 월 수 (최소 1로 보호) */
export function monthlyAverage(total: number, completeMonths: number): number {
  return total / Math.max(1, completeMonths);
}

/** 월 평균 1 미만이면 저빈도(lowVolume) — 1.0 은 해당하지 않는다 */
export function isLowVolume(avg: number): boolean {
  return avg < LOW_VOLUME_MONTHLY_AVG;
}

export function trendWindowSize(completeMonths: number): number {
  return clamp(Math.floor(completeMonths / 2), 1, 3);
}

function peakIndex(series: number[]): number {
  let best = -1;
  let bestVal = 0;
  for (let i = 0; i < series.length; i++) {
    const v = series[i] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best; // 동률이면 가장 이른 월 (엄격한 > 비교)
}

/**
 * 추세 통계. series 는 월 순서의 건수(마지막이 진행 중인 월일 수 있음), completeMonths 는 앞에서부터 완료 월 수.
 * recent/prior 는 완료 월만 쓴다(진행 중인 월 제외). 건수가 적으면(recent+prior<3, 완료 월<2) insufficient.
 */
export function computeTrendStat(series: number[], completeMonths: number, months: string[] = []): TrendStat {
  const cm = clamp(completeMonths, 0, series.length);
  const w = trendWindowSize(cm);
  const complete = series.slice(0, cm);
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const recent = sum(complete.slice(Math.max(0, cm - w), cm));
  const prior = sum(complete.slice(Math.max(0, cm - 2 * w), Math.max(0, cm - w)));
  const delta = recent - prior;
  const rateRaw = delta / Math.max(prior, 1);

  let label: TrendLabel;
  if (cm < 2 || recent + prior < 3) label = 'insufficient';
  else if (delta >= 2 && rateRaw >= 0.5) label = 'rising';
  else if (delta <= -2 && rateRaw <= -0.4) label = 'falling';
  else label = 'steady';

  const first = series.findIndex((v) => v > 0);
  const peak = peakIndex(series);
  return {
    recent,
    prior,
    delta,
    rate: cm >= 2 ? rateRaw : null,
    label,
    emerging: cm >= 2 && prior === 0 && recent >= 3,
    firstMonth: first >= 0 ? (months[first] ?? null) : null,
    peakMonth: peak >= 0 ? (months[peak] ?? null) : null,
  };
}

/** 논문(연구) vs 영상(제품화) 선후행 — 피크 월 비교. 양쪽 합계 5 이상 + 완료 월 4 이상일 때만 판정. */
export function computeLeadLag(paperSeries: number[], videoSeries: number[], completeMonths: number): LeadLag {
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  if (sum(paperSeries) < 5 || sum(videoSeries) < 5 || completeMonths < 4) {
    return { relation: 'undetermined', lagMonths: null };
  }
  const diff = peakIndex(videoSeries) - peakIndex(paperSeries);
  if (diff >= 1) return { relation: 'paper_leads', lagMonths: diff };
  if (diff <= -1) return { relation: 'video_leads', lagMonths: -diff };
  return { relation: 'concurrent', lagMonths: 0 };
}

export function topicSeries(
  buckets: TimelineBucket[],
  source: 'papers' | 'videos',
  topicId: string,
  basis: 'any' | 'primary' = 'any'
): number[] {
  return buckets.map((b) => b[source].byTopic[topicId]?.[basis] ?? 0);
}

/** 월 → 분기 집계 히트맵. 현재 월이 속한 열은 partial. */
export function buildHeatmap(buckets: TimelineBucket[], topicOrder: readonly string[], granularity: Granularity): Heatmap {
  const colKey = (month: string): string => {
    if (granularity === 'month') return month;
    const p = parseMonth(month)!;
    return `${p.y}-Q${Math.ceil(p.mo / 3)}`;
  };
  const colLabel = (key: string, month: string): string => {
    if (granularity === 'month') return `${month.slice(2, 4)}.${month.slice(5, 7)}`;
    return key.replace('-', ' ');
  };

  const columns: { key: string; label: string; partial: boolean }[] = [];
  const colIdx = new Map<string, number>();
  for (const b of buckets) {
    const key = colKey(b.month);
    let idx = colIdx.get(key);
    if (idx === undefined) {
      idx = columns.length;
      colIdx.set(key, idx);
      columns.push({ key, label: colLabel(key, b.month), partial: false });
    }
    const col = columns[idx];
    if (b.partial && col) col.partial = true;
  }

  const rows: HeatmapRow[] = topicOrder.map((topicId) => {
    const zero = () => columns.map(() => 0);
    const row: HeatmapRow = {
      topicId,
      papers: { any: zero(), primary: zero() },
      videos: { any: zero(), primary: zero() },
    };
    for (const b of buckets) {
      const i = colIdx.get(colKey(b.month))!;
      for (const src of ['papers', 'videos'] as const) {
        const c = b[src].byTopic[topicId];
        if (!c) continue;
        row[src].any[i] = (row[src].any[i] ?? 0) + c.any;
        row[src].primary[i] = (row[src].primary[i] ?? 0) + c.primary;
      }
    }
    return row;
  });
  return { granularity, columns, rows };
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 대표 항목
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 토픽·소스별 대표 항목 — 최초 등장 월 1건, 피크 월 상위 2건, 최근 윈도 상위 2건을 중복 없이(최대 5건).
 * 우선순위: primary===topicId 먼저. 영상은 domainFocus primary → 조회수(선정에만 사용) 내림차순, 논문은 최신순.
 * 마지막 타이브레이크는 id 오름차순. off_topic·미분류는 제외, 제목은 90자로 자른다.
 */
export function selectRepresentatives(
  items: TimelineItem[],
  topicId: string,
  source: TimelineSource,
  range: TimelineRangeInfo
): Representative[] {
  const monthSet = new Set(range.months);
  const cand = items.filter(
    (it) =>
      it.source === source &&
      it.topics !== null &&
      it.primary !== OFF_TOPIC_ID &&
      !it.topics.includes(OFF_TOPIC_ID) &&
      it.topics.includes(topicId) &&
      monthSet.has(it.month)
  );
  if (cand.length === 0) return [];

  const cmp = (a: TimelineItem, b: TimelineItem): number => {
    const pa = a.primary === topicId ? 0 : 1;
    const pb = b.primary === topicId ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (source === 'video') {
      const fa = a.focus === 'primary' ? 0 : 1;
      const fb = b.focus === 'primary' ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const va = a.views ?? -1;
      const vb = b.views ?? -1;
      if (va !== vb) return vb - va;
    } else if (a.time !== b.time) {
      return b.time - a.time;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };

  const byMonth = new Map<string, TimelineItem[]>();
  for (const it of cand) {
    const arr = byMonth.get(it.month);
    if (arr) arr.push(it);
    else byMonth.set(it.month, [it]);
  }
  for (const arr of byMonth.values()) arr.sort(cmp);

  const monthsWithItems = range.months.filter((m) => byMonth.has(m));
  const firstMonth = monthsWithItems[0] ?? '';
  let peakMonth = firstMonth;
  for (const m of monthsWithItems) {
    if ((byMonth.get(m)?.length ?? 0) > (byMonth.get(peakMonth)?.length ?? 0)) peakMonth = m;
  }
  const w = trendWindowSize(range.completeMonths);
  const recentMonths = range.months.slice(Math.max(0, range.completeMonths - w), range.completeMonths);
  const recentPool = recentMonths.flatMap((m) => byMonth.get(m) ?? []).sort(cmp);

  const picked: TimelineItem[] = [];
  const has = (it: TimelineItem) => picked.some((p) => p.id === it.id);
  const take = (pool: TimelineItem[], n: number) => {
    let c = 0;
    for (const it of pool) {
      if (c >= n) break;
      if (has(it)) continue;
      picked.push(it);
      c++;
    }
  };
  take(byMonth.get(firstMonth) ?? [], 1);
  take(byMonth.get(peakMonth) ?? [], 2);
  take(recentPool, 2);

  return picked.map((it) => ({ id: it.id, title: it.title.slice(0, TITLE_CUT), month: it.month }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 순수 함수: 스코프 / 변환 / 전체 조립
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopeFilterResult {
  papers: ArticleRow[];
  videos: ArticleRow[];
  videosExcludedByFocus: number;
  videosPendingJudgement: number;
}

/** 후보 행 → 스코프 행. 논문은 paperRegex 재판정, 영상은 matchesDomainVideo + focus 'none' 제외(판정 전 유지). */
export function filterScopeRows(paperRows: ArticleRow[], videoRows: ArticleRow[]): ScopeFilterResult {
  const papers = paperRows.filter((r) => matchesDomainSecondary('hand', r));
  const { kept, excludedCount } = filterByDomainFocus(
    'hand',
    videoRows.filter((r) => matchesDomainVideo('hand', r))
  );
  return {
    papers,
    videos: kept,
    videosExcludedByFocus: excludedCount,
    videosPendingJudgement: kept.filter((r) => getDomainFocus('hand', r) === null).length,
  };
}

export function toTimelineItem(row: ArticleRow, source: TimelineSource, now: Date): TimelineItem | null {
  const month = monthKey(row.publishedAt, row.collectedAt, now);
  if (!month) return null;
  const stored = getHandTopics(row);
  const views = row.extractedMetadata?.views;
  const focus = source === 'video' ? getDomainFocus('hand', row) : null;
  const t = toDate(row.publishedAt) ?? toDate(row.collectedAt);
  return {
    id: row.id,
    source,
    month,
    title: decodeHtmlEntities(row.title ?? ''),
    time: t ? t.getTime() : 0,
    topics: stored ? stored.topics : null,
    primary: stored ? stored.primary : null,
    attempts: getHandTopicsAttempts(row),
    views: typeof views === 'number' && Number.isFinite(views) ? views : null,
    focus: focus === 'primary' || focus === 'secondary' ? focus : null,
  };
}

function emptyTrend(): TrendStat {
  return computeTrendStat([], 0, []);
}

/** 스코프 행 → 타임라인 본문 + 대표 선정/해설 입력용 items. now 를 주입받아 결정적이다. */
export function buildTimelineSnapshot(
  scope: ScopeFilterResult,
  now: Date,
  truncated = false
): TimelineSnapshot {
  const all: TimelineItem[] = [];
  for (const r of scope.papers) {
    const it = toTimelineItem(r, 'paper', now);
    if (it) all.push(it);
  }
  for (const r of scope.videos) {
    const it = toTimelineItem(r, 'video', now);
    if (it) all.push(it);
  }

  // 수집 시작 = 스코프 행의 MIN(collected_at)
  let minCollected: Date | null = null;
  for (const r of [...scope.papers, ...scope.videos]) {
    const c = toDate(r.collectedAt);
    if (c && (!minCollected || c < minCollected)) minCollected = c;
  }
  const collectionStartMonth = minCollected ? fmtMonth(minCollected) : null;

  const { range, dropped } = resolveRange(all, now, {
    maxBackfillMonths: MAX_BACKFILL_MONTHS,
    collectionStartMonth,
  });

  const scopeInfo: TimelineScope = {
    videosExcludedByFocus: scope.videosExcludedByFocus,
    videosPendingJudgement: scope.videosPendingJudgement,
    beforeRangeDropped: dropped,
    truncated,
  };

  const months = range ? buildMonthRange(range.startMonth, range.endMonth) : [];
  const completeMonths = Math.max(0, months.length - 1); // 마지막 = 진행 중인 현재 월
  const items = range ? all.filter((it) => it.month >= range.startMonth) : [];
  const granularity = chooseGranularity(months.length);

  const { buckets, classification } = aggregateTimeline(items, months, now, collectionStartMonth);

  // 토픽 합계/순위
  const sumSeries = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const totalsById: Record<string, { papers: TopicCount; videos: TopicCount }> = {};
  const combinedTotals: Record<string, number> = {};
  for (const id of HAND_TOPIC_IDS_WITH_OTHER) {
    const p = { any: sumSeries(topicSeries(buckets, 'papers', id, 'any')), primary: sumSeries(topicSeries(buckets, 'papers', id, 'primary')) };
    const v = { any: sumSeries(topicSeries(buckets, 'videos', id, 'any')), primary: sumSeries(topicSeries(buckets, 'videos', id, 'primary')) };
    totalsById[id] = { papers: p, videos: v };
    combinedTotals[id] = p.any + v.any;
  }
  const ranked = rankTopics(combinedTotals);

  const topics: TimelineTopic[] = ranked.map(({ id, order, colorIndex }) => {
    const def = HAND_TOPICS.find((t) => t.id === id)!;
    const ps = topicSeries(buckets, 'papers', id, 'any');
    const vs = topicSeries(buckets, 'videos', id, 'any');
    const cs = ps.map((v, i) => v + (vs[i] ?? 0));
    const rawAvg = monthlyAverage(combinedTotals[id] ?? 0, completeMonths);
    return {
      id,
      label: def.label,
      shortLabel: def.shortLabel,
      order,
      colorIndex,
      totals: totalsById[id] ?? { papers: { any: 0, primary: 0 }, videos: { any: 0, primary: 0 } },
      monthlyAvg: Math.round(rawAvg * 100) / 100,
      lowVolume: isLowVolume(rawAvg),
      trend: {
        papers: months.length ? computeTrendStat(ps, completeMonths, months) : emptyTrend(),
        videos: months.length ? computeTrendStat(vs, completeMonths, months) : emptyTrend(),
        combined: months.length ? computeTrendStat(cs, completeMonths, months) : emptyTrend(),
      },
      leadLag: computeLeadLag(ps, vs, completeMonths),
    };
  });

  const heatmap = buildHeatmap(
    buckets,
    topics.map((t) => t.id),
    granularity
  );

  const body: TimelineBody = {
    domain: 'hand',
    generatedAt: now.toISOString(),
    period: range
      ? {
          startMonth: range.startMonth,
          endMonth: range.endMonth,
          monthCount: months.length,
          completeMonthCount: completeMonths,
          collectionStartedAt: minCollected ? minCollected.toISOString() : null,
          granularity,
        }
      : null,
    topics,
    buckets,
    heatmap,
    classification,
    scope: scopeInfo,
  };
  return { body, items, months, completeMonths };
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopeRows extends ScopeFilterResult {
  truncated: boolean;
}

class TechTrendTimelineService {
  private inflight: Promise<TimelineBody> | null = null;

  /** 스코프 행 조회 — 논문 SQL 1차 필터 + JS 정밀 판정, 영상 + focus 제외. 분류 배치의 대상 선정에도 쓴다. */
  async getScopeRows(): Promise<ScopeRows> {
    const [paperRows, videoRows] = await Promise.all([this.fetchPaperRows(), this.fetchVideoRows()]);
    const truncated = paperRows.length > TIMELINE_ROW_LIMIT || videoRows.length > TIMELINE_ROW_LIMIT;
    if (truncated) {
      console.warn(
        `[TechTrendTimeline] row limit ${TIMELINE_ROW_LIMIT} exceeded (papers ${paperRows.length}, videos ${videoRows.length}) — oldest rows dropped`
      );
    }
    const scope = filterScopeRows(
      paperRows.slice(0, TIMELINE_ROW_LIMIT),
      videoRows.slice(0, TIMELINE_ROW_LIMIT)
    );
    return { ...scope, truncated };
  }

  /** 캐시 없이 새로 집계 (해설 생성 입력용 — items 포함) */
  async loadSnapshot(now: Date = new Date()): Promise<TimelineSnapshot> {
    const scope = await this.getScopeRows();
    return buildTimelineSnapshot(scope, now, scope.truncated);
  }

  async getTimeline(): Promise<TimelineResponse> {
    try {
      const [cached] = await db.select().from(viewCache).where(eq(viewCache.viewName, TIMELINE_CACHE_KEY)).limit(1);
      if (cached && Date.now() - cached.cachedAt.getTime() < TIMELINE_TTL_MS) {
        const data = cached.data as unknown as TimelineBody;
        if (data && Array.isArray(data.buckets) && data.classification && data.heatmap) {
          return { ...data, cached: true };
        }
      }
    } catch {
      // 캐시 조회 실패는 무시하고 재집계
    }

    if (!this.inflight) {
      this.inflight = this.compute().finally(() => {
        this.inflight = null;
      });
    }
    const body = await this.inflight;
    return { ...body, cached: false };
  }

  private async compute(): Promise<TimelineBody> {
    const snapshot = await this.loadSnapshot();
    try {
      await db
        .insert(viewCache)
        .values({ viewName: TIMELINE_CACHE_KEY, data: snapshot.body, ttlMs: TIMELINE_TTL_MS })
        .onConflictDoUpdate({
          target: viewCache.viewName,
          set: { data: snapshot.body, cachedAt: new Date(), ttlMs: TIMELINE_TTL_MS },
        });
    } catch {
      // 캐시 저장 실패는 치명적이지 않음
    }
    return snapshot.body;
  }

  /** 타임라인 + 해설 캐시 무효화 — cachedAt 을 epoch 로 되돌린다. 오류는 로그만. */
  async invalidate(): Promise<void> {
    try {
      await db
        .update(viewCache)
        .set({ cachedAt: new Date(0) })
        .where(inArray(viewCache.viewName, [TIMELINE_CACHE_KEY, TIMELINE_INSIGHT_CACHE_KEY]));
    } catch (err) {
      console.error('[TechTrendTimeline] cache invalidation failed:', (err as Error).message);
    }
  }

  // ── DB 조회 ──────────────────────────────────────────────────────────────

  private async fetchPaperRows(): Promise<ArticleRow[]> {
    const termConds = PAPER_SQL_TERMS.flatMap((t) => [
      sql`${articles.title} ILIKE ${`%${t}%`}`,
      sql`${articles.summary} ILIKE ${`%${t}%`}`,
    ]);
    return db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        collectedAt: articles.collectedAt,
        source: articles.source,
        productType: articles.productType,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(and(eq(articles.source, 'arxiv'), or(...termConds)))
      .orderBy(sql`COALESCE(${articles.publishedAt}, ${articles.collectedAt}) DESC`)
      .limit(TIMELINE_ROW_LIMIT + 1) as Promise<ArticleRow[]>;
  }

  private async fetchVideoRows(): Promise<ArticleRow[]> {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        collectedAt: articles.collectedAt,
        source: articles.source,
        productType: articles.productType,
        extractedMetadata: articles.extractedMetadata,
      })
      .from(articles)
      .where(eq(articles.productType, 'video'))
      .orderBy(sql`COALESCE(${articles.publishedAt}, ${articles.collectedAt}) DESC`)
      .limit(TIMELINE_ROW_LIMIT + 1) as Promise<ArticleRow[]>;
  }
}

export const techTrendTimelineService = new TechTrendTimelineService();
