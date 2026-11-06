/**
 * 주간 브리프 v3 — 8주 추세 집계(SQL GROUP BY)와 방향 분류(순수 함수).
 *
 *  - 구간은 [이번 주 시작 − 49일, 이번 주 끝) 이고 주 경계는 KST 월요일 00:00. 기준 시각은 COALESCE(published_at, collected_at).
 *  - 모든 집계는 SQL 집계라 행 상한(4000)과 무관하다. 데이터가 없는 주는 0 으로 채운다.
 *  - 각 집계(T-1 서브토픽, T-2 관심 테마, T-3 키워드, T-4a 조달 CI 이력)는 선택 수집기다. 실패하면 호출자가 `trend_*_failed` 경고를 남긴다.
 *  - 방향 분류: 최근 4주 대 이전 4주 점유율. 표본 부족·1주 급증은 신호로 채택하지 않는다(임계값은 상수).
 */

import { sql, type SQL } from 'drizzle-orm';
import { DOMAIN_TAXONOMIES, type TimelineDomain } from './domain-topics.js';
import { OFF_TOPIC_ID, OTHER_TOPIC_ID } from './hand-topics.js';
import { parseInHouse } from './actuator-position-map.service.js';
import { addDaysYmd, getWeekRange } from './weekly-brief-period.js';
import type { CollectDeps } from './weekly-brief-collect.js';
import type { BriefDomainKey, ExecPositionSnapshot, TechDirection, TechSignalKind } from '../types/weekly-brief.js';

// ─────────────────────────────────────────────────────────────────────────────
// 상수 (단위 테스트로 고정)
// ─────────────────────────────────────────────────────────────────────────────

export const TREND_WEEKS = 8;
export const TREND_RECENT_WEEKS = 4;
/** 최근/이전 4주 각각의 분모(같은 주 분류 항목 수 합) 하한 — 미만이면 insufficient */
export const TREND_MIN_BASE = 20;
/** 상대 변화 임계값(%) */
export const TREND_REL_PCT = 30;
/** 절대 변화 임계값(%p) */
export const TREND_ABS_PP = 2;
/** 방향이 인정되려면 건수가 0보다 커야 하는 주 수 (rising 은 최근 4주, falling 은 이전 4주) */
export const TREND_PERSIST_WEEKS = 3;
export const TREND_MAX_SIGNALS = 6;
export const TREND_MAX_PER_DOMAIN = 3;
/** 조달 CI 이력 신호: 최근 4주와 이전 4주의 건수 차이가 이 값 이상이면 방향이 있다 */
export const PROCUREMENT_MIN_DIFF = 2;
/** 키워드 시리즈 대상 상위 용어 수 */
export const TREND_KEYWORD_TOP = 20;

export interface WatchTheme {
  id: string;
  /** 최대 40자 */
  label: string;
  domain: BriefDomainKey;
  /** 영문·한글 용어. SQL 정규식(대소문자 무시)과 JS 근거 매칭에 같이 쓴다 */
  terms: readonly string[];
}

/** 관심 테마 초기 목록 (PM-7: 제안 목록으로 시작, 용어는 개발자 초안 → PM 검수) */
export const WATCH_THEMES: readonly WatchTheme[] = [
  { id: 'tactile_integration', label: '촉각 센서 통합', domain: 'hand', terms: ['tactile', 'touch sensing', 'e-skin', 'electronic skin', 'force sensor', 'fingertip sensor', '촉각', '촉각 센서', '힘 센서'] },
  { id: 'vla_manipulation', label: 'VLA·조작 모델 쏠림', domain: 'rfm', terms: ['vla', 'vision-language-action', 'action model', 'diffusion policy', 'manipulation foundation', 'robot foundation model', '비전-언어-행동', '조작 모델', '파운데이션 모델'] },
  { id: 'joint_module_sourcing', label: '관절 모듈 외부 조달', domain: 'actuator', terms: ['joint module', 'actuator module', 'modular actuator', 'actuator supplier', 'sourcing', 'supply agreement', '관절 모듈', '액추에이터 공급', '외부 조달', '공급사'] },
  { id: 'harmonic_alternative', label: '하모닉 감속기 대체', domain: 'actuator', terms: ['harmonic drive', 'strain wave', 'cycloidal', 'planetary roller', 'roller screw', 'harmonic reducer', '하모닉', '사이클로이드', '유성 롤러', '감속기'] },
  { id: 'hydraulic_to_electric', label: '유압→전기 전환', domain: 'actuator', terms: ['hydraulic', 'all-electric', 'electric actuator', 'electric atlas', '유압', '전기 구동', '전동 구동'] },
  { id: 'mass_price', label: '양산·가격 하락', domain: 'production', terms: ['mass production', 'volume production', 'price cut', 'price drop', 'cost reduction', 'unit cost', '양산', '가격 인하', '가격 하락', '원가 절감'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 방향 분류 (순수)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrendSeriesInput {
  id: string;
  kind: TechSignalKind;
  domain: BriefDomainKey | null;
  label: string;
  /** 주별 해당 건수 (오래된 주부터, 길이 8) */
  counts: number[];
  /** 주별 분모(같은 주 분류 항목 수) (길이 8) */
  bases: number[];
  /** 서브토픽/테마/키워드 식별(근거 매칭용) */
  ref: { topicDomain?: TimelineDomain; topicId?: string; themeId?: string; term?: string };
}

export type TrendClass = 'rising' | 'falling' | 'steady' | 'insufficient';

export interface TrendResult {
  cls: TrendClass;
  /** 주별 점유율(%) 소수 1자리 */
  series: number[];
  /** 최근 4주 점유율(%) = 건수 합 ÷ 분모 합 */
  recent: number | null;
  prior: number | null;
  /** (recent − prior) ÷ prior × 100, prior=0 이면 null */
  relChangePct: number | null;
  recentBase: number;
  priorBase: number;
}

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** 점유율 시리즈를 분류한다. 표본이 부족하면 insufficient */
export function classifyShareSeries(counts: readonly number[], bases: readonly number[]): TrendResult {
  const n = TREND_RECENT_WEEKS;
  const series = counts.map((c, i) => ((bases[i] ?? 0) > 0 ? r1((c / bases[i]!) * 100) : 0));
  const cRecent = counts.slice(-n);
  const cPrior = counts.slice(-2 * n, -n);
  const recentBase = sum(bases.slice(-n));
  const priorBase = sum(bases.slice(-2 * n, -n));
  if (counts.length < 2 * n || recentBase < TREND_MIN_BASE || priorBase < TREND_MIN_BASE) {
    return { cls: 'insufficient', series, recent: null, prior: null, relChangePct: null, recentBase, priorBase };
  }
  const recent = (sum(cRecent) / recentBase) * 100;
  const prior = (sum(cPrior) / priorBase) * 100;
  const absPp = recent - prior;
  const rel = prior > 0 ? (absPp / prior) * 100 : null;
  const relOk = (dir: 1 | -1) => (rel === null ? dir === 1 && recent > 0 : dir === 1 ? rel >= TREND_REL_PCT : rel <= -TREND_REL_PCT);
  const recentWeeks = cRecent.filter((c) => c > 0).length;
  const priorWeeks = cPrior.filter((c) => c > 0).length;
  let cls: TrendClass = 'steady';
  if (relOk(1) && absPp >= TREND_ABS_PP && recentWeeks >= TREND_PERSIST_WEEKS) cls = 'rising';
  else if (relOk(-1) && absPp <= -TREND_ABS_PP && priorWeeks >= TREND_PERSIST_WEEKS) cls = 'falling';
  return { cls, series, recent: r1(recent), prior: r1(prior), relChangePct: rel === null ? null : r1(rel), recentBase, priorBase };
}

/** 조달 CI 이력 건수 시리즈(건수 자체가 신호)의 방향 */
export function classifyCountSeries(counts: readonly number[]): { direction: TechDirection; recent: number; prior: number } {
  const n = TREND_RECENT_WEEKS;
  const recent = sum(counts.slice(-n));
  const prior = sum(counts.slice(-2 * n, -n));
  const diff = recent - prior;
  const direction: TechDirection = diff >= PROCUREMENT_MIN_DIFF ? 'rising' : diff <= -PROCUREMENT_MIN_DIFF ? 'falling' : 'steady';
  return { direction, recent, prior };
}

export interface TechSignalDraft {
  id: string;
  kind: TechSignalKind;
  domain: BriefDomainKey | null;
  label: string;
  direction: TechDirection;
  series: number[];
  recent: number | null;
  prior: number | null;
  relChangePct: number | null;
  ref: TrendSeriesInput['ref'];
}

/** 시리즈들을 분류해 steady·insufficient 를 버리고, |변화율| 순으로 최대 6개(도메인당 3개)를 고른다 */
export function selectTrendSignals(inputs: readonly TrendSeriesInput[]): TechSignalDraft[] {
  const drafts: (TechSignalDraft & { rank: number })[] = [];
  for (const s of inputs) {
    const r = classifyShareSeries(s.counts, s.bases);
    if (r.cls !== 'rising' && r.cls !== 'falling') continue;
    drafts.push({
      id: s.id,
      kind: s.kind,
      domain: s.domain,
      label: s.label.slice(0, 40),
      direction: r.cls,
      series: r.series,
      recent: r.recent,
      prior: r.prior,
      relChangePct: r.relChangePct,
      ref: s.ref,
      rank: r.relChangePct === null ? Number.MAX_SAFE_INTEGER : Math.abs(r.relChangePct),
    });
  }
  drafts.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
  const perDomain = new Map<string, number>();
  const out: TechSignalDraft[] = [];
  for (const d of drafts) {
    if (out.length >= TREND_MAX_SIGNALS) break;
    const key = d.domain ?? 'none';
    if ((perDomain.get(key) ?? 0) >= TREND_MAX_PER_DOMAIN) continue;
    perDomain.set(key, (perDomain.get(key) ?? 0) + 1);
    const { rank: _rank, ...rest } = d;
    out.push(rest);
  }
  return out;
}

/** 조달 스냅샷 비교 — 스냅샷이 2개 미만이면 "누적 중"(추정값을 만들지 않는다) */
export function procurementState(snapshots: readonly ExecPositionSnapshot[]): { state: 'accumulating' | 'observed'; snapshots: number } {
  return { state: snapshots.length >= 2 ? 'observed' : 'accumulating', snapshots: snapshots.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 쿼리 (SQL 집계)
// ─────────────────────────────────────────────────────────────────────────────

const TS = sql`COALESCE(a.published_at, a.collected_at)`;
const WEEK_KEY = sql`to_char(date_trunc('week', (${TS} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD')`;
/** 영상·논문·뉴스 분류와 같은 분모 조건 (github·sec_edgar·patent 제외) */
const CLASSIFIED = sql`(a.product_type = 'video' OR COALESCE(a.source, '') NOT IN ('github', 'sec_edgar', 'patent'))`;

function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function boundSql(d: Date): SQL {
  return sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 8주(오래된 주부터)의 KST 월요일 목록 */
export function trendWeekStarts(weekStart: string): string[] {
  const first = addDaysYmd(weekStart, -7 * (TREND_WEEKS - 1));
  return Array.from({ length: TREND_WEEKS }, (_, i) => addDaysYmd(first, 7 * i));
}

export function trendRange(weekStart: string): { from: Date; to: Date } {
  return { from: getWeekRange(trendWeekStarts(weekStart)[0]!).startUtc, to: getWeekRange(weekStart).endUtcExclusive };
}

function fillWeeks(weeks: readonly string[], byWeek: Map<string, number>): number[] {
  return weeks.map((w) => byWeek.get(w) ?? 0);
}

/** 주별 분류 대상 전체 항목 수 (테마·키워드의 분모) */
export async function fetchWeeklyBases(deps: CollectDeps, weekStart: string): Promise<number[]> {
  const { from, to } = trendRange(weekStart);
  const result = await deps.query(sql`
    SELECT ${WEEK_KEY} AS wk, count(*)::int AS n
    FROM articles a
    WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)} AND ${CLASSIFIED}
    GROUP BY 1
  `);
  return fillWeeks(trendWeekStarts(weekStart), new Map(rowsOf<{ wk: string; n: unknown }>(result).map((r) => [String(r.wk), num(r.n)])));
}

/** SQL 정규식 패턴 (POSIX ERE, 대소문자 무시) — 용어의 특수문자를 이스케이프한다 */
export function themePattern(terms: readonly string[]): string {
  return terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
}

/** T-2: 관심 테마 8주 건수 — title 과 aiTags 텍스트에 용어가 있는 항목을 센다 */
export async function fetchThemeSeries(deps: CollectDeps, weekStart: string, bases: number[], themes: readonly WatchTheme[] = WATCH_THEMES): Promise<TrendSeriesInput[]> {
  const { from, to } = trendRange(weekStart);
  const weeks = trendWeekStarts(weekStart);
  const hay = sql`lower(coalesce(a.title, '') || ' ' || coalesce((a.extracted_metadata->'aiTags')::text, ''))`;
  const cols = themes.map((t, i) => sql`count(*) FILTER (WHERE ${hay} ~* ${themePattern(t.terms)})::int AS ${sql.raw(`t${i}`)}`);
  const result = await deps.query(sql`
    SELECT ${WEEK_KEY} AS wk, ${sql.join(cols, sql`, `)}
    FROM articles a
    WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)} AND ${CLASSIFIED}
    GROUP BY 1
  `);
  const rows = rowsOf<Record<string, unknown>>(result);
  return themes.map((t, i) => {
    const m = new Map(rows.map((r) => [String(r.wk), num(r[`t${i}`])]));
    return { id: `theme:${t.id}`, kind: 'theme', domain: t.domain, label: t.label, counts: fillWeeks(weeks, m), bases, ref: { themeId: t.id } } satisfies TrendSeriesInput;
  });
}

/** T-1: 서브토픽 8주 건수 (hand: handTopics, actuator: domainTopics.actuator). 분모는 같은 주 분류가 끝난 항목(off_topic 제외) 수 */
export async function fetchSubtopicSeries(deps: CollectDeps, weekStart: string, domain: TimelineDomain): Promise<TrendSeriesInput[]> {
  const { from, to } = trendRange(weekStart);
  const weeks = trendWeekStarts(weekStart);
  const tax = DOMAIN_TAXONOMIES[domain];
  const path = domain === 'hand' ? sql`x.m->'handTopics'` : sql`x.m#>'{domainTopics,actuator}'`;
  const result = await deps.query(sql`
    WITH base AS (
      SELECT ${WEEK_KEY} AS wk, ${path} AS tp
      FROM articles a
      CROSS JOIN LATERAL (SELECT COALESCE(a.extracted_metadata, '{}'::jsonb) AS m) x
      WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)} AND ${CLASSIFIED}
    ), ok AS (
      SELECT wk, tp FROM base
      WHERE jsonb_typeof(tp) = 'object'
        AND jsonb_typeof(tp->'version') = 'number' AND (tp->>'version')::int = ${tax.version}
        AND jsonb_typeof(tp->'topics') = 'array'
        AND NOT (tp->'topics') ? ${OFF_TOPIC_ID}
    )
    SELECT ok.wk AS wk, t.topic AS topic, count(*)::int AS n FROM ok, jsonb_array_elements_text(ok.tp->'topics') AS t(topic) GROUP BY 1, 2
    UNION ALL
    SELECT ok.wk AS wk, '__total__' AS topic, count(*)::int AS n FROM ok GROUP BY 1
  `);
  const rows = rowsOf<{ wk: string; topic: string; n: unknown }>(result);
  const bases = fillWeeks(weeks, new Map(rows.filter((r) => r.topic === '__total__').map((r) => [String(r.wk), num(r.n)])));
  return tax.coreIds
    .filter((id) => id !== OTHER_TOPIC_ID)
    .map((id) => {
      const def = tax.topics.find((t) => t.id === id);
      const m = new Map(rows.filter((r) => r.topic === id).map((r) => [String(r.wk), num(r.n)]));
      return { id: `subtopic:${domain}:${id}`, kind: 'subtopic', domain, label: (def?.shortLabel ?? def?.label ?? id).slice(0, 40), counts: fillWeeks(weeks, m), bases, ref: { topicDomain: domain, topicId: id } } satisfies TrendSeriesInput;
    });
}

/** T-3: 상위 20개 키워드의 8주 건수 (키워드가 붙은 고유 항목 수) */
export async function fetchKeywordSeries(deps: CollectDeps, weekStart: string, bases: number[]): Promise<TrendSeriesInput[]> {
  const { from, to } = trendRange(weekStart);
  const weeks = trendWeekStarts(weekStart);
  const result = await deps.query(sql`
    WITH top AS (
      SELECT ak.keyword_id
      FROM article_keywords ak
      JOIN articles a ON a.id = ak.article_id
      WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)} AND ${CLASSIFIED}
      GROUP BY ak.keyword_id
      ORDER BY count(DISTINCT a.id) DESC, ak.keyword_id ASC
      LIMIT ${TREND_KEYWORD_TOP}
    )
    SELECT k.id::text AS kid, k.term AS term, ${WEEK_KEY} AS wk, count(DISTINCT a.id)::int AS n
    FROM article_keywords ak
    JOIN top ON top.keyword_id = ak.keyword_id
    JOIN keywords k ON k.id = ak.keyword_id
    JOIN articles a ON a.id = ak.article_id
    WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)} AND ${CLASSIFIED}
    GROUP BY k.id, k.term, 3
  `);
  const rows = rowsOf<{ kid: string; term: string; wk: string; n: unknown }>(result);
  const byKid = new Map<string, { term: string; m: Map<string, number> }>();
  for (const r of rows) {
    const cur = byKid.get(String(r.kid)) ?? { term: r.term, m: new Map<string, number>() };
    cur.m.set(String(r.wk), num(r.n));
    byKid.set(String(r.kid), cur);
  }
  return [...byKid.entries()].map(([kid, v]) => ({ id: `keyword:${kid.replace(/[^a-z0-9-]/gi, '')}`, kind: 'keyword', domain: null, label: v.term.slice(0, 40), counts: fillWeeks(weeks, v.m), bases, ref: { term: v.term } }) satisfies TrendSeriesInput);
}

export interface ProcurementSeries {
  /** 주별 "외부 조달 쪽으로 이동" 건수 (자체 생산 여부 자체→외부, 액추에이터 공급사 변경) */
  counts: number[];
  total: number;
}

/** T-4a: CI 이력의 '자체 생산 여부'·'액추에이터 공급사' 변경 주별 집계. 이동 방향은 parseInHouse 로 판정 */
export async function fetchProcurementSeries(deps: CollectDeps, weekStart: string): Promise<ProcurementSeries> {
  const { from, to } = trendRange(weekStart);
  const weeks = trendWeekStarts(weekStart);
  const result = await deps.query(sql`
    SELECT to_char(date_trunc('week', (h.changed_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS wk,
           i.name AS item, h.old_value AS old_value, h.new_value AS new_value
    FROM ci_value_history h
    JOIN ci_values v ON v.id = h.value_id
    JOIN ci_items i ON i.id = v.item_id
    WHERE i.name IN ('자체 생산 여부', '액추에이터 공급사')
      AND h.changed_at >= ${boundSql(from)} AND h.changed_at < ${boundSql(to)}
    ORDER BY h.changed_at ASC
    LIMIT 2000
  `);
  const m = new Map<string, number>();
  for (const r of rowsOf<{ wk: string; item: string; old_value: string | null; new_value: string | null }>(result)) {
    if (!isExternalShift(r.item, r.old_value, r.new_value)) continue;
    m.set(String(r.wk), (m.get(String(r.wk)) ?? 0) + 1);
  }
  const counts = fillWeeks(weeks, m);
  return { counts, total: sum(counts) };
}

/** CI 이력 한 건이 "외부 조달 쪽으로의 이동"인가 (순수) */
export function isExternalShift(item: string, oldValue: string | null, newValue: string | null): boolean {
  if (item === '자체 생산 여부') {
    const before = parseInHouse(oldValue);
    const after = parseInHouse(newValue);
    return before === true && after === false;
  }
  if (item === '액추에이터 공급사') return (oldValue ?? '').trim() !== (newValue ?? '').trim() && (newValue ?? '').trim().length > 0;
  return false;
}

export interface TrendData {
  weeks: string[];
  series: TrendSeriesInput[];
  procurement: ProcurementSeries | null;
  warnings: string[];
}

/** 집계를 실행한다. 각 집계는 개별 try/catch — 실패하면 비우고 `trend_*_failed` 경고 */
export async function collectTrend(deps: CollectDeps, weekStart: string): Promise<TrendData> {
  const warnings: string[] = [];
  const optional = async <T>(code: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      warnings.push(`trend_${code}_failed`);
      return fallback;
    }
  };
  const bases = await optional('bases', () => fetchWeeklyBases(deps, weekStart), null as number[] | null);
  const [hand, actuator, themes, keywords, procurement] = await Promise.all([
    optional('t1', () => fetchSubtopicSeries(deps, weekStart, 'hand'), [] as TrendSeriesInput[]),
    optional('t1', () => fetchSubtopicSeries(deps, weekStart, 'actuator'), [] as TrendSeriesInput[]),
    bases ? optional('t2', () => fetchThemeSeries(deps, weekStart, bases), [] as TrendSeriesInput[]) : Promise.resolve([] as TrendSeriesInput[]),
    bases ? optional('t3', () => fetchKeywordSeries(deps, weekStart, bases), [] as TrendSeriesInput[]) : Promise.resolve([] as TrendSeriesInput[]),
    optional('t4', () => fetchProcurementSeries(deps, weekStart), null as ProcurementSeries | null),
  ]);
  return { weeks: trendWeekStarts(weekStart), series: [...hand, ...actuator, ...themes, ...keywords], procurement, warnings: [...new Set(warnings)] };
}
