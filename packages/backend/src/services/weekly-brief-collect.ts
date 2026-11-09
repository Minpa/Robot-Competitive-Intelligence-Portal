/**
 * 주간 브리프 수집 — DB 집계(읽기 전용).
 *
 * 공통 규칙
 *  - 기준 시각 ts = COALESCE(published_at, collected_at), 구간은 [startUtc, endUtcExclusive).
 *    `timestamp`(tz 없음) 컬럼은 UTC 로 저장되므로 파라미터를 `::timestamptz AT TIME ZONE 'UTC'` 로 바꿔 비교한다
 *    (node-pg 가 JS Date 를 로컬 시각 문자열로 보내는 함정과 프로세스 TZ 의존을 피한다).
 *  - 시각 출력은 SQL 에서 ISO 문자열로 변환해 받는다(드라이버 파서 차이 무관).
 *  - 핵심 수집(기사·영상 행 조회) 실패는 예외 → 서비스가 failed 로 처리.
 *    선택 수집기(CI, 키워드, 알림, 신규 로봇, 회사, 분석 영상 수)는 개별 try/catch 로 기본값 + `*_failed` 경고.
 *  - 큰 JSON 을 통째로 조회하지 않는다(슬림 메타 projection, LIMIT 4000).
 */

import { sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { decodeHtmlEntities } from './event-video-brief.service.js';
import {
  pickRepresentativeKeyword,
  type BriefRow,
  type CiChangeRow,
  type CollectedWeek,
  type CompanyCount,
  type CompanyDirectoryEntry,
  type KeywordCount,
  type VolumeWeekCount,
  type KeywordEvidenceRow,
} from './weekly-brief-compose.js';
import { addDaysYmd, getWeekRange, type WeekRange } from './weekly-brief-period.js';
import { formatLogLine } from './ops-log.util.js';
import { fetchPositionSnapshot, type PositionDeps, type PositionSnapshot } from './weekly-brief-position.js';
import { WATCH_THEMES, collectTrend, selectTrendSignals, themePattern, type TechSignalDraft, type TrendData } from './weekly-brief-trend.js';
import type { ExecPositionSnapshot } from '../types/weekly-brief.js';

const TAG = 'WeeklyBrief';

export const ROW_LIMIT = 4000;
const KEYWORD_LIMIT = 300;
const COMPANY_LIMIT = 50;
const CI_LIMIT = 1000;
const DIRECTORY_LIMIT = 5000;
/** 수집량 추이 주 수 (이번 주 포함) */
export const VOLUME_WEEKS = 8;

/** 쿼리 실행기 — 기본은 drizzle db.execute, 테스트에서는 가짜를 주입한다. */
export interface CollectDeps {
  query(q: SQL): Promise<unknown>;
  log?(line: string): void;
}

const defaultDeps: CollectDeps = { query: (q) => db.execute(q) };

function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** 'YYYY-MM-DDTHH:MI:SS.MSZ' 문자열로 변환하는 SQL 조각 (입력은 UTC 로 저장된 timestamp) */
function isoSql(expr: SQL): SQL {
  return sql`to_char(${expr} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/** 구간 경계를 timestamp(UTC) 값으로 */
function boundSql(d: Date): SQL {
  return sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

const TS = sql`COALESCE(a.published_at, a.collected_at)`;

function numberOf(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 핵심: 기사·영상 행
// ─────────────────────────────────────────────────────────────────────────────

interface RawArticleRow {
  id: string;
  title: string | null;
  url: string | null;
  summary: string | null;
  source: string | null;
  product_type: string | null;
  company_id: string | null;
  published_at: string | null;
  collected_at: string | null;
  ts: string;
  meta: Record<string, unknown> | null;
}

/** 구간 내 기사·영상 행(슬림 메타) — 최신순, 상한 초과 여부를 함께 돌려준다 */
export async function fetchRows(deps: CollectDeps, range: WeekRange): Promise<{ rows: BriefRow[]; truncated: boolean }> {
  const result = await deps.query(sql`
    SELECT a.id::text AS id,
           a.title,
           a.url,
           left(a.summary, 300) AS summary,
           a.source,
           a.product_type,
           a.company_id::text AS company_id,
           ${isoSql(sql`a.published_at`)} AS published_at,
           ${isoSql(sql`a.collected_at`)} AS collected_at,
           ${isoSql(TS)} AS ts,
           jsonb_strip_nulls(jsonb_build_object(
             'domain', x.m->'domain',
             'topic', x.m->'topic',
             'topics', x.m->'topics',
             'aiTags', x.m->'aiTags',
             'domainFocus', x.m->'domainFocus',
             'views', x.m->'views',
             'channel', x.m->'channel',
             'thirdParty', x.m->'thirdParty',
             'thumbnail', x.m->'thumbnail',
             'videoId', x.m->'videoId',
             'authors', CASE jsonb_typeof(x.m->'authors')
               WHEN 'array' THEN (SELECT jsonb_agg(left(e.v, 80) ORDER BY e.o) FROM (SELECT t.v, t.o FROM jsonb_array_elements_text(x.m->'authors') WITH ORDINALITY AS t(v, o) ORDER BY t.o LIMIT 20) e)
               WHEN 'string' THEN to_jsonb(left(x.m->>'authors', 120))
               ELSE NULL END,
             'arxivId', left(x.m->>'arxivId', 40),
             'description', left(x.m->>'description', 400),
             'aiSummaryKo', left(x.m->>'aiSummaryKo', 200),
             'keyPoints', CASE jsonb_typeof(x.m->'keyPoints')
               WHEN 'array' THEN (SELECT jsonb_agg(left(e.v, 120) ORDER BY e.o) FROM (SELECT t.v, t.o FROM jsonb_array_elements_text(x.m->'keyPoints') WITH ORDINALITY AS t(v, o) ORDER BY t.o LIMIT 3) e)
               ELSE NULL END,
             'geminiAnalyzedAt', x.m->>'geminiAnalyzedAt',
             'geminiAnalysis', jsonb_build_object(
               'summaryKo', left(x.m#>>'{geminiAnalysis,summaryKo}', 400),
               'durationSec', x.m#>'{geminiAnalysis,durationSec}',
               'task', left(x.m#>>'{geminiAnalysis,task}', 120),
               'capabilities', CASE jsonb_typeof(x.m#>'{geminiAnalysis,capabilities}')
                 WHEN 'array' THEN (SELECT jsonb_agg(left(e.v, 60) ORDER BY e.o) FROM (SELECT t.v, t.o FROM jsonb_array_elements_text(x.m#>'{geminiAnalysis,capabilities}') WITH ORDINALITY AS t(v, o) ORDER BY t.o LIMIT 4) e)
                 ELSE NULL END
             )
           )) AS meta
    FROM articles a
    CROSS JOIN LATERAL (SELECT COALESCE(a.extracted_metadata, '{}'::jsonb) AS m) x
    WHERE ${TS} >= ${boundSql(range.startUtc)} AND ${TS} < ${boundSql(range.endUtcExclusive)}
    ORDER BY ${TS} DESC, a.id ASC
    LIMIT ${ROW_LIMIT + 1}
  `);
  const raw = rowsOf<RawArticleRow>(result);
  const truncated = raw.length > ROW_LIMIT;
  const rows: BriefRow[] = raw.slice(0, ROW_LIMIT).map((r) => ({
    id: String(r.id),
    title: decodeHtmlEntities(r.title ?? ''),
    url: r.url ?? null,
    summary: r.summary ?? null,
    source: r.source ?? null,
    productType: r.product_type ?? null,
    publishedAt: strOrNull(r.published_at),
    collectedAt: strOrNull(r.collected_at),
    companyId: strOrNull(r.company_id),
    ts: r.ts,
    extractedMetadata: (r.meta ?? {}) as Record<string, any>,
  }));
  return { rows, truncated };
}

// ─────────────────────────────────────────────────────────────────────────────
// 선택 수집기
// ─────────────────────────────────────────────────────────────────────────────

/** geminiAnalyzedAt(ISO 문자열) 이 구간 내인 영상 수 — 발행일 무관 */
export async function countAnalyzedVideos(deps: CollectDeps, range: WeekRange): Promise<number> {
  const result = await deps.query(sql`
    SELECT count(*)::int AS n
    FROM articles a
    WHERE a.product_type = 'video'
      AND (a.extracted_metadata->>'geminiAnalyzedAt') >= ${range.startUtc.toISOString()}::text
      AND (a.extracted_metadata->>'geminiAnalyzedAt') < ${range.endUtcExclusive.toISOString()}::text
  `);
  return numberOf(rowsOf<{ n: unknown }>(result)[0]?.n);
}

export async function countAlerts(deps: CollectDeps, range: WeekRange): Promise<number> {
  const result = await deps.query(sql`
    SELECT count(*)::int AS n FROM competitive_alerts
    WHERE created_at >= ${boundSql(range.startUtc)} AND created_at < ${boundSql(range.endUtcExclusive)}
  `);
  return numberOf(rowsOf<{ n: unknown }>(result)[0]?.n);
}

export async function countNewRobots(deps: CollectDeps, range: WeekRange): Promise<number> {
  const result = await deps.query(sql`
    SELECT count(*)::int AS n FROM humanoid_robots
    WHERE data_type = 'confirmed'
      AND created_at >= ${boundSql(range.startUtc)} AND created_at < ${boundSql(range.endUtcExclusive)}
  `);
  return numberOf(rowsOf<{ n: unknown }>(result)[0]?.n);
}

interface RawCiRow {
  value_id: string;
  manufacturer: string | null;
  robot: string | null;
  layer: string | null;
  item: string | null;
  old_val: string | null;
  new_val: string | null;
  confidence: string | null;
  source: string | null;
  source_url: string | null;
  changed_at: string;
  value_changed: boolean;
}

/**
 * 구간 내 CI 변경.
 *  - 이력이 있는 값: 구간 내 가장 이른 old_value → 가장 늦은 new_value. old=new 로 되돌아간 건은 제외.
 *  - 이력 없이 ci_values.updated_at 만 구간 내인 값: before=null 로 포함.
 */
export async function fetchCiChanges(deps: CollectDeps, range: WeekRange): Promise<CiChangeRow[]> {
  const s = boundSql(range.startUtc);
  const e = boundSql(range.endUtcExclusive);
  const result = await deps.query(sql`
    WITH h AS (
      SELECT h.value_id,
             (array_agg(h.old_value ORDER BY h.changed_at ASC, h.id ASC))[1] AS old_val,
             (array_agg(h.new_value ORDER BY h.changed_at DESC, h.id DESC))[1] AS new_val,
             max(h.changed_at) AS changed_at
      FROM ci_value_history h
      WHERE h.changed_at >= ${s} AND h.changed_at < ${e}
      GROUP BY h.value_id
    )
    SELECT * FROM (
      SELECT v.id::text AS value_id, c.manufacturer, c.name AS robot, l.name AS layer, i.name AS item,
             h.old_val, h.new_val, v.confidence, v.source, v.source_url,
             ${isoSql(sql`h.changed_at`)} AS changed_at, true AS value_changed
      FROM h
      JOIN ci_values v ON v.id = h.value_id
      JOIN ci_competitors c ON c.id = v.competitor_id
      JOIN ci_items i ON i.id = v.item_id
      JOIN ci_categories cat ON cat.id = i.category_id
      JOIN ci_layers l ON l.id = cat.layer_id
      WHERE h.old_val IS DISTINCT FROM h.new_val
      UNION ALL
      SELECT v.id::text AS value_id, c.manufacturer, c.name AS robot, l.name AS layer, i.name AS item,
             NULL::text AS old_val, v.value AS new_val, v.confidence, v.source, v.source_url,
             ${isoSql(sql`v.updated_at`)} AS changed_at, false AS value_changed
      FROM ci_values v
      JOIN ci_competitors c ON c.id = v.competitor_id
      JOIN ci_items i ON i.id = v.item_id
      JOIN ci_categories cat ON cat.id = i.category_id
      JOIN ci_layers l ON l.id = cat.layer_id
      WHERE v.updated_at >= ${s} AND v.updated_at < ${e}
        AND NOT EXISTS (
          SELECT 1 FROM ci_value_history h2
          WHERE h2.value_id = v.id AND h2.changed_at >= ${s} AND h2.changed_at < ${e}
        )
    ) u
    ORDER BY u.changed_at DESC, u.value_id ASC
    LIMIT ${CI_LIMIT}
  `);
  return rowsOf<RawCiRow>(result)
    .filter((r) => typeof r.new_val === 'string' && r.new_val.trim().length > 0)
    .map<CiChangeRow>((r) => ({
      valueId: String(r.value_id),
      company: r.manufacturer ?? r.robot ?? '',
      robot: r.robot ?? null,
      layer: r.layer ?? null,
      item: r.item ?? '',
      before: typeof r.old_val === 'string' && r.old_val.trim() ? r.old_val.trim() : null,
      after: (r.new_val as string).trim(),
      confidence: r.confidence ?? null,
      sourceName: strOrNull(r.source),
      sourceUrl: strOrNull(r.source_url),
      changedAt: r.changed_at,
      valueChanged: r.value_changed === true,
    }))
    .filter((r) => r.company !== '');
}

/** 이번 주와 직전 주의 키워드 빈도 합 — article_keywords ⋈ keywords ⋈ articles (저장하지 않는다) */
export async function fetchKeywordCounts(deps: CollectDeps, range: WeekRange, prevRange: WeekRange): Promise<KeywordCount[]> {
  const cs = boundSql(range.startUtc);
  const ce = boundSql(range.endUtcExclusive);
  const ps = boundSql(prevRange.startUtc);
  const result = await deps.query(sql`
    SELECT k.id::text AS keyword_id, k.term,
           COALESCE(SUM(COALESCE(ak.frequency, 1)) FILTER (WHERE ${TS} >= ${cs} AND ${TS} < ${ce}), 0)::int AS cnt,
           COALESCE(SUM(COALESCE(ak.frequency, 1)) FILTER (WHERE ${TS} >= ${ps} AND ${TS} < ${cs}), 0)::int AS prev_cnt
    FROM article_keywords ak
    JOIN keywords k ON k.id = ak.keyword_id
    JOIN articles a ON a.id = ak.article_id
    WHERE ${TS} >= ${ps} AND ${TS} < ${ce}
    GROUP BY k.id, k.term
    HAVING COALESCE(SUM(COALESCE(ak.frequency, 1)) FILTER (WHERE ${TS} >= ${cs} AND ${TS} < ${ce}), 0) > 0
    ORDER BY cnt DESC, k.term ASC
    LIMIT ${KEYWORD_LIMIT}
  `);
  return rowsOf<{ keyword_id: string; term: string; cnt: unknown; prev_cnt: unknown }>(result).map((r) => ({
    keywordId: String(r.keyword_id),
    term: r.term,
    count: numberOf(r.cnt),
    prevCount: numberOf(r.prev_cnt),
  }));
}

/** 대표 키워드의 근거 기사 — 빈도 상위 2건 */
export async function fetchKeywordEvidence(deps: CollectDeps, range: WeekRange, keywordId: string): Promise<KeywordEvidenceRow[]> {
  const result = await deps.query(sql`
    SELECT a.id::text AS id, a.title, a.url, a.source
    FROM article_keywords ak
    JOIN articles a ON a.id = ak.article_id
    WHERE ak.keyword_id = ${keywordId}::uuid
      AND ${TS} >= ${boundSql(range.startUtc)} AND ${TS} < ${boundSql(range.endUtcExclusive)}
      AND a.product_type IS DISTINCT FROM 'video'
    ORDER BY COALESCE(ak.frequency, 1) DESC, ${TS} DESC, a.id ASC
    LIMIT 2
  `);
  return rowsOf<{ id: string; title: string | null; url: string | null; source: string | null }>(result).map((r) => ({
    articleId: String(r.id),
    title: decodeHtmlEntities(r.title ?? ''),
    url: r.url ?? null,
    source: r.source ?? null,
  }));
}

/** 회사별 영상·뉴스 건수 (이번 주 / 직전 주) */
export async function fetchCompanyCounts(deps: CollectDeps, range: WeekRange, prevRange: WeekRange): Promise<CompanyCount[]> {
  const cs = boundSql(range.startUtc);
  const ce = boundSql(range.endUtcExclusive);
  const ps = boundSql(prevRange.startUtc);
  const result = await deps.query(sql`
    SELECT a.company_id::text AS company_id, c.name,
           count(*) FILTER (WHERE ${TS} >= ${cs} AND ${TS} < ${ce})::int AS cnt,
           count(*) FILTER (WHERE ${TS} >= ${ps} AND ${TS} < ${cs})::int AS prev_cnt
    FROM articles a
    JOIN companies c ON c.id = a.company_id
    WHERE ${TS} >= ${ps} AND ${TS} < ${ce}
      AND (a.product_type = 'video' OR COALESCE(a.source, '') NOT IN ('arxiv', 'github', 'sec_edgar', 'patent'))
    GROUP BY a.company_id, c.name
    HAVING count(*) FILTER (WHERE ${TS} >= ${cs} AND ${TS} < ${ce}) > 0
    ORDER BY cnt DESC, c.name ASC
    LIMIT ${COMPANY_LIMIT}
  `);
  return rowsOf<{ company_id: string; name: string; cnt: unknown; prev_cnt: unknown }>(result).map((r) => ({
    companyId: String(r.company_id),
    name: r.name,
    count: numberOf(r.cnt),
    prevCount: numberOf(r.prev_cnt),
  }));
}

/**
 * 최근 VOLUME_WEEKS 주(이번 주 포함)의 주별 영상·뉴스·논문 건수 — 집계 쿼리(행 상한과 무관).
 * 주 경계는 KST 월요일 00:00 (timestamp(UTC) → timestamptz → Asia/Seoul 로컬 시각 → date_trunc('week')).
 * 분류는 compose 의 classifyRow 와 같다: 영상 → product_type='video', 논문 → source='arxiv', 뉴스 → github·sec_edgar·patent 제외.
 * 데이터가 없는 주는 0 으로 채워 오래된 주부터 돌려준다.
 */
export async function fetchVolumeWeeks(deps: CollectDeps, weekStart: string): Promise<VolumeWeekCount[]> {
  const firstWeek = addDaysYmd(weekStart, -7 * (VOLUME_WEEKS - 1));
  const from = getWeekRange(firstWeek).startUtc;
  const to = getWeekRange(weekStart).endUtcExclusive;
  const result = await deps.query(sql`
    SELECT to_char(date_trunc('week', (${TS} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS week_start,
           count(*) FILTER (WHERE a.product_type = 'video') AS videos,
           count(*) FILTER (WHERE a.product_type IS DISTINCT FROM 'video' AND a.source = 'arxiv') AS papers,
           count(*) FILTER (WHERE a.product_type IS DISTINCT FROM 'video' AND COALESCE(a.source, '') NOT IN ('arxiv', 'github', 'sec_edgar', 'patent')) AS articles
    FROM articles a
    WHERE ${TS} >= ${boundSql(from)} AND ${TS} < ${boundSql(to)}
    GROUP BY 1
    ORDER BY 1
  `);
  const byWeek = new Map(rowsOf<{ week_start: string; videos: unknown; papers: unknown; articles: unknown }>(result).map((r) => [String(r.week_start), r]));
  return Array.from({ length: VOLUME_WEEKS }, (_, i) => {
    const ws = addDaysYmd(firstWeek, 7 * i);
    const r = byWeek.get(ws);
    return { weekStart: ws, videos: numberOf(r?.videos), articles: numberOf(r?.articles), papers: numberOf(r?.papers) };
  });
}

/** 회사 id·이름 목록 — CI 변경과 회사를 이름(정규화 완전 일치)으로 연결할 때만 쓴다 */
export async function fetchCompanyDirectory(deps: CollectDeps): Promise<CompanyDirectoryEntry[]> {
  const result = await deps.query(sql`
    SELECT c.id::text AS company_id, c.name
    FROM companies c
    WHERE c.name IS NOT NULL AND c.name <> ''
    ORDER BY c.name ASC, c.id ASC
    LIMIT ${DIRECTORY_LIMIT}
  `);
  return rowsOf<{ company_id: string; name: string }>(result).map((r) => ({ companyId: String(r.company_id), name: r.name }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 전체
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 한 주 + 직전 주를 같은 규칙으로 수집한다.
 * 핵심(행 조회)이 실패하면 예외를 던진다. 선택 수집기 실패는 기본값과 `<이름>_failed` 경고로 남긴다.
 */
export interface CollectOptions {
  /** 장문 리포트(v2)용 추가 수집(8주 추이, 회사 목록)을 함께 한다. 포스터(v1)는 false */
  report?: boolean;
}

export async function collectWeek(
  range: WeekRange,
  prevRange: WeekRange,
  deps: CollectDeps = defaultDeps,
  options: CollectOptions = {},
): Promise<CollectedWeek> {
  const log = deps.log ?? ((l: string) => console.warn(l));
  const [cur, prev] = await Promise.all([fetchRows(deps, range), fetchRows(deps, prevRange)]);

  const warnings: string[] = [];
  const optional = async <T>(code: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      warnings.push(`${code}_failed`);
      // 원문(쿼리·제목)은 남기지 않고 오류 메시지만 남긴다
      log(formatLogLine(TAG, { phase: 'collect', collector: code, status: 'failed', error: err instanceof Error ? err.message : String(err) }));
      return fallback;
    }
  };

  const [videosAnalyzed, prevVideosAnalyzed, alerts, prevAlerts, newRobots, ci, prevCi, keywords, companies] = await Promise.all([
    optional('analyzed', () => countAnalyzedVideos(deps, range), 0),
    optional('analyzed_prev', () => countAnalyzedVideos(deps, prevRange), 0),
    optional('alerts', () => countAlerts(deps, range), 0),
    optional('alerts_prev', () => countAlerts(deps, prevRange), 0),
    optional('robots', () => countNewRobots(deps, range), null as number | null),
    optional('ci', () => fetchCiChanges(deps, range), [] as CiChangeRow[]),
    optional('ci_prev', () => fetchCiChanges(deps, prevRange), [] as CiChangeRow[]),
    optional('keywords', () => fetchKeywordCounts(deps, range, prevRange), [] as KeywordCount[]),
    optional('companies', () => fetchCompanyCounts(deps, range, prevRange), [] as CompanyCount[]),
  ]);

  let volume: VolumeWeekCount[] | undefined;
  let companyDirectory: CompanyDirectoryEntry[] | undefined;
  if (options.report) {
    [volume, companyDirectory] = await Promise.all([
      optional('volume', () => fetchVolumeWeeks(deps, range.weekStart), [] as VolumeWeekCount[]),
      optional('company_directory', () => fetchCompanyDirectory(deps), [] as CompanyDirectoryEntry[]),
    ]);
  }

  const keywordEvidence: Record<string, KeywordEvidenceRow[]> = {};
  const rep = pickRepresentativeKeyword(keywords);
  if (rep) {
    keywordEvidence[rep.keywordId] = await optional('keyword_evidence', () => fetchKeywordEvidence(deps, range, rep.keywordId), [] as KeywordEvidenceRow[]);
  }

  const truncated = cur.truncated || prev.truncated;
  if (truncated) warnings.push('rows_truncated');

  return {
    range,
    prevRange,
    rows: cur.rows,
    prevRows: prev.rows,
    truncated,
    videosAnalyzed,
    prevVideosAnalyzed,
    alerts,
    prevAlerts,
    newRobots,
    ciChanges: ci,
    ciUpdates: ci.length,
    prevCiUpdates: prevCi.length,
    keywords,
    keywordEvidence,
    companies,
    warnings,
    ...(options.report ? { volume, companyDirectory } : {}),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// v3(임원판) 수집 확장 — 위 v2 함수는 변경하지 않는다
// ─────────────────────────────────────────────────────────────────────────────

/** 추세 신호 근거 행 (이번 주 항목, 최대 3) */
export interface SignalEvidenceRow {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  kind: 'video' | 'paper' | 'article';
  /** 영상 근거용 — 메타데이터의 썸네일 URL(검증 전)과 videoId, 채널, 게시·수집 시각 ISO */
  thumbnail?: string | null;
  videoId?: string | null;
  channel?: string | null;
  publishedAt?: string | null;
}

export interface PrevExecContext {
  /** 직전 v3 브리프들의 격차 행 경쟁사값 — 가장 최근 값이 우선 (id → 값) */
  gapValues: Record<string, number>;
  /** 직전 v3 브리프들의 조달 통계 스냅샷 (오래된 순) */
  snapshots: ExecPositionSnapshot[];
}

export interface ExecCollected {
  base: CollectedWeek;
  position: PositionSnapshot;
  /** 이번 주 스펙(humanoid_robots/body_specs/hand_specs)이 갱신된 로봇 id */
  specUpdatedRobotIds: string[];
  trend: TrendData;
  /** 선정된 추세 신호의 근거 (신호 id → 행) */
  signalEvidence: Record<string, SignalEvidenceRow[]>;
  prev: PrevExecContext;
  warnings: string[];
}

export interface ExecCollectOptions {
  position?: PositionDeps;
}

/** 이번 주 스펙이 갱신된 로봇 id (재시드 오탐은 compose 에서 회사 언급과의 이중 조건으로 거른다) */
export async function fetchSpecUpdatedRobots(deps: CollectDeps, range: WeekRange): Promise<string[]> {
  const s = boundSql(range.startUtc);
  const e = boundSql(range.endUtcExclusive);
  const result = await deps.query(sql`
    SELECT id::text AS rid FROM humanoid_robots WHERE updated_at >= ${s} AND updated_at < ${e}
    UNION SELECT robot_id::text FROM body_specs WHERE updated_at >= ${s} AND updated_at < ${e}
    UNION SELECT robot_id::text FROM hand_specs WHERE updated_at >= ${s} AND updated_at < ${e}
    LIMIT 2000
  `);
  return rowsOf<{ rid: string }>(result).map((r) => String(r.rid));
}

function evidenceKind(r: { product_type: string | null; source: string | null }): 'video' | 'paper' | 'article' {
  if (r.product_type === 'video') return 'video';
  return r.source === 'arxiv' ? 'paper' : 'article';
}

/** 추세 신호 하나의 이번 주 근거 항목 (최신순 3건) */
export async function fetchSignalEvidence(deps: CollectDeps, range: WeekRange, signal: TechSignalDraft): Promise<SignalEvidenceRow[]> {
  const inWeek = sql`${TS} >= ${boundSql(range.startUtc)} AND ${TS} < ${boundSql(range.endUtcExclusive)} AND (a.product_type = 'video' OR COALESCE(a.source, '') NOT IN ('github', 'sec_edgar', 'patent'))`;
  let cond: SQL | null = null;
  const ref = signal.ref;
  if (ref.topicDomain && ref.topicId) {
    const path = ref.topicDomain === 'hand' ? sql`a.extracted_metadata->'handTopics'` : sql`a.extracted_metadata#>'{domainTopics,actuator}'`;
    cond = sql`jsonb_typeof(${path}->'topics') = 'array' AND (${path}->'topics') ? ${ref.topicId}`;
  } else if (ref.themeId) {
    const theme = WATCH_THEMES.find((t) => t.id === ref.themeId);
    if (theme) cond = sql`lower(coalesce(a.title, '') || ' ' || coalesce((a.extracted_metadata->'aiTags')::text, '')) ~* ${themePattern(theme.terms)}`;
  } else if (ref.term) {
    cond = sql`EXISTS (SELECT 1 FROM article_keywords ak JOIN keywords k ON k.id = ak.keyword_id WHERE ak.article_id = a.id AND k.term = ${ref.term})`;
  }
  if (!cond) return [];
  const result = await deps.query(sql`
    SELECT a.id::text AS id, a.title, a.url, a.source, a.product_type,
           a.extracted_metadata->>'thumbnail' AS thumbnail, a.extracted_metadata->>'videoId' AS video_id, a.extracted_metadata->>'channel' AS channel,
           ${isoSql(TS)} AS ts
    FROM articles a
    WHERE ${inWeek} AND ${cond}
    ORDER BY ${TS} DESC, a.id ASC
    LIMIT 3
  `);
  return rowsOf<{ id: string; title: string | null; url: string | null; source: string | null; product_type: string | null; thumbnail: string | null; video_id: string | null; channel: string | null; ts: string | null }>(result).map((r) => ({
    id: String(r.id),
    title: decodeHtmlEntities(r.title ?? ''),
    url: r.url ?? null,
    source: r.source ?? null,
    kind: evidenceKind(r),
    thumbnail: r.thumbnail ?? null,
    videoId: r.video_id ?? null,
    channel: r.channel ?? null,
    publishedAt: r.ts ?? null,
  }));
}

/** 직전 v3 브리프(발행본 또는 초안의 AI 원문)에서 격차 행 값과 조달 스냅샷을 읽는다 — 최근 8건 */
export async function fetchPrevExecContext(deps: CollectDeps, weekStart: string): Promise<PrevExecContext> {
  const result = await deps.query(sql`
    SELECT week_start::text AS ws, p->'gaps'->'rows' AS rows, p->'meta'->'positionSnapshot' AS snap FROM (
      SELECT week_start, payload AS p FROM weekly_briefs WHERE status IN ('ok', 'partial') AND (payload->>'schemaVersion') = '3' AND week_start < ${weekStart}::date
      UNION ALL
      SELECT week_start, ai_payload AS p FROM weekly_brief_drafts WHERE (ai_payload->>'schemaVersion') = '3' AND week_start < ${weekStart}::date
    ) u
    ORDER BY week_start DESC
    LIMIT 16
  `);
  const seen = new Set<string>();
  const gapValues: Record<string, number> = {};
  const snaps: { ws: string; snap: ExecPositionSnapshot }[] = [];
  for (const r of rowsOf<{ ws: string; rows: unknown; snap: unknown }>(result)) {
    if (seen.has(r.ws)) continue;
    seen.add(r.ws);
    if (seen.size > 8) break;
    if (Array.isArray(r.rows)) {
      for (const g of r.rows as { id?: unknown; competitorValue?: { value?: unknown } }[]) {
        const id = typeof g?.id === 'string' ? g.id : null;
        const v = g?.competitorValue?.value;
        if (id && typeof v === 'number' && Number.isFinite(v) && !(id in gapValues)) gapValues[id] = v;
      }
    }
    const sn = r.snap as Partial<ExecPositionSnapshot> | null;
    if (sn && typeof sn === 'object' && typeof sn.asOf === 'string') snaps.push({ ws: r.ws, snap: sn as ExecPositionSnapshot });
  }
  snaps.sort((a, b) => a.ws.localeCompare(b.ws));
  return { gapValues, snapshots: snaps.map((s) => s.snap) };
}

/**
 * v3 수집 — v2 수집(collectWeek, report) 위에 우리 위치, 8주 추세, 추세 근거, 직전 브리프 문맥을 더한다.
 * 모든 추가 수집기는 선택이며 실패하면 기본값과 경고(`position_failed`, `trend_*_failed`, ...)를 남긴다.
 */
export async function collectExecutive(
  range: WeekRange,
  prevRange: WeekRange,
  deps: CollectDeps = defaultDeps,
  options: ExecCollectOptions = {},
): Promise<ExecCollected> {
  const log = deps.log ?? ((l: string) => console.warn(l));
  const base = await collectWeek(range, prevRange, deps, { report: true });
  const warnings: string[] = [];
  const optional = async <T>(code: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      warnings.push(`${code}_failed`);
      log(formatLogLine(TAG, { phase: 'collect', collector: code, status: 'failed', error: err instanceof Error ? err.message : String(err) }));
      return fallback;
    }
  };

  const [position, specUpdated, trend, prev] = await Promise.all([
    fetchPositionSnapshot(options.position),
    optional('spec_updates', () => fetchSpecUpdatedRobots(deps, range), [] as string[]),
    collectTrend(deps, range.weekStart),
    optional('prev_exec', () => fetchPrevExecContext(deps, range.weekStart), { gapValues: {}, snapshots: [] } as PrevExecContext),
  ]);
  if (position.failures.includes('position')) warnings.push('position_failed');
  if (position.failures.includes('bench')) warnings.push('bench_failed');
  if (position.failures.includes('hand_bench')) warnings.push('hand_bench_failed');
  warnings.push(...trend.warnings);

  // 선정될 추세 신호의 근거만 조회한다 (최대 6건)
  const picked = selectTrendSignals(trend.series);
  const evidenceEntries = await Promise.all(
    picked.map(async (s) => [s.id, await optional('signal_evidence', () => fetchSignalEvidence(deps, range, s), [] as SignalEvidenceRow[])] as const),
  );
  return {
    base,
    position,
    specUpdatedRobotIds: specUpdated,
    trend,
    signalEvidence: Object.fromEntries(evidenceEntries),
    prev,
    warnings: [...new Set(warnings)],
  };
}
