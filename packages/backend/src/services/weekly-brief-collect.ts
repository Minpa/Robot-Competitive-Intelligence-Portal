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
  type KeywordCount,
  type KeywordEvidenceRow,
} from './weekly-brief-compose.js';
import type { WeekRange } from './weekly-brief-period.js';
import { formatLogLine } from './ops-log.util.js';

const TAG = 'WeeklyBrief';

export const ROW_LIMIT = 4000;
const KEYWORD_LIMIT = 300;
const COMPANY_LIMIT = 50;
const CI_LIMIT = 1000;

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
             'description', left(x.m->>'description', 400),
             'geminiAnalyzedAt', x.m->>'geminiAnalyzedAt',
             'geminiAnalysis', jsonb_build_object(
               'summaryKo', left(x.m#>>'{geminiAnalysis,summaryKo}', 400),
               'durationSec', x.m#>'{geminiAnalysis,durationSec}'
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

// ─────────────────────────────────────────────────────────────────────────────
// 전체
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 한 주 + 직전 주를 같은 규칙으로 수집한다.
 * 핵심(행 조회)이 실패하면 예외를 던진다. 선택 수집기 실패는 기본값과 `<이름>_failed` 경고로 남긴다.
 */
export async function collectWeek(range: WeekRange, prevRange: WeekRange, deps: CollectDeps = defaultDeps): Promise<CollectedWeek> {
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
  };
}
