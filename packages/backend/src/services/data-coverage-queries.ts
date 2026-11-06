/**
 * 데이터 커버리지 — SQL 실행기. 읽기 전용 트랜잭션 + SET LOCAL statement_timeout 으로만 실행한다.
 * 이 모듈은 쓰기 SQL, DDL, AI SDK, 사용량 기록을 사용하지 않는다(정적 검사 대상).
 * articles 전체 스캔 쿼리는 QA1_SQL / QA2_SQL / QA6_SQL 세 개뿐이다.
 */

import type { Pool, PoolClient } from 'pg';
import {
  createDuplicateDetector,
  DUP_MAX_ROWS_DEFAULT,
  type DupResult,
  type FocusCounts,
  type Qa1Row,
} from './data-coverage-aggregate.js';

export type FailReason = 'timeout' | 'query_failed' | 'too_large';
export type Res<T> = { ok: true; data: T } | { ok: false; reason: FailReason; message: string };

export interface QueryCtx {
  /** 이 쿼리에 허용된 최대 시간(ms) = min(쿼리 타임아웃, 전체 데드라인 잔여) */
  timeoutMs: number;
}

/** Gemini 범위 설정 — video-content-analysis.service 의 getter 값을 그대로 받는다(복사 금지) */
export interface GeminiScope {
  sinceDays: number;
  requireDemoSignal: boolean;
  maxAttempts: number;
}

export class TooLargeError extends Error {
  constructor(message = 'too_large') {
    super(message);
    this.name = 'TooLargeError';
  }
}

export class QueryTimeoutError extends Error {
  constructor(message = 'timeout') {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

export function classifyQueryError(err: unknown): FailReason {
  if (err instanceof TooLargeError) return 'too_large';
  if (err instanceof QueryTimeoutError) return 'timeout';
  const e = err as { code?: string; message?: string } | null;
  if (e?.code === '57014' || /statement timeout|canceling statement/i.test(e?.message ?? '')) return 'timeout';
  return 'query_failed';
}

// ── 결과 형상 ──

export interface Qa2Row {
  domain: string | null;
  total: number;
  tagged: number;
  taggedLlm: number;
  taggedHeuristic: number;
  geminiAnalyzed: number;
  geminiSummaryKo: number;
  scopeTotal: number;
  scopeAnalyzed: number;
  scopePending: number;
  scopeExhausted: number;
  noTags: number;
  tooOld: number;
  focusHand: FocusCounts;
  focusActuator: FocusCounts;
  focusRecent90: number;
  handTopics: number;
  actuatorTopics: number;
  robotsNonempty: number;
  robotsUntagged: number;
}

export interface RobotCounts {
  total: number;
  confirmed: number;
  forecast: number;
  noBodySpecs: number;
}

export interface FieldNulls {
  total: number;
  nulls: Record<string, number>;
}

export interface ComponentsData {
  byType: { type: string; count: number; emptySpecs: number }[];
  specKeys: { type: string; key: string; count: number }[];
}

export interface SupplierData {
  total: number;
  missing: { torque: number; weight: number; diameter: number; price: number };
}

export interface SourcingData {
  rows: { sourcing: string; count: number }[];
  unsourced: number;
}

export interface CiData {
  competitors: number;
  items: number;
  byConfidence: { confidence: string | null; count: number }[];
}

export interface CiLayerRow {
  slug: string;
  name: string;
  expected: number;
  filled: number;
  low: number;
}

export interface CiStagingData {
  pending: number;
  byType: { updateType: string; count: number }[];
  oldestCreatedAt: string | null;
}

export interface HandBenchmarkData {
  competitors: number;
  axes: number;
  scores: number;
}

export interface AiProviderRow {
  provider: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiTagRow {
  tag: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  totalCostUsd: number;
}

export interface AutoCompaniesData {
  count: number;
  total: number;
  samples: { name: string; articles: number; robots: number }[];
}

export interface CrawlData {
  targets: { total: number; enabled: number; disabled: number; neverCrawled: number; lastCrawledMax: string | null };
  jobsByStatus: { status: string; total: number; last7d: number }[];
  stuckRunning: number;
  last30d: { jobs: number; success: number; failure: number; duplicate: number };
}

export interface CrawlErrorRow {
  errorType: string;
  message: string;
  count: number;
}

/** 쿼리 묶음 이름 → 실행 함수. 서비스는 이 인터페이스만 의존한다(테스트에서 mock). */
export interface CoverageQueryMap {
  qa1(ctx: QueryCtx): Promise<Qa1Row[]>;
  qa2(ctx: QueryCtx, scope: GeminiScope): Promise<Qa2Row[]>;
  qa6(ctx: QueryCtx, maxRows: number): Promise<DupResult>;
  robots(ctx: QueryCtx): Promise<RobotCounts>;
  bodyFields(ctx: QueryCtx): Promise<FieldNulls>;
  handFields(ctx: QueryCtx): Promise<FieldNulls>;
  powerFields(ctx: QueryCtx): Promise<FieldNulls>;
  components(ctx: QueryCtx): Promise<ComponentsData>;
  supplier(ctx: QueryCtx): Promise<SupplierData>;
  sourcing(ctx: QueryCtx): Promise<SourcingData>;
  ci(ctx: QueryCtx): Promise<CiData>;
  ciByLayer(ctx: QueryCtx): Promise<CiLayerRow[]>;
  ciStaging(ctx: QueryCtx): Promise<CiStagingData>;
  handBenchmark(ctx: QueryCtx): Promise<HandBenchmarkData>;
  aiProvider(ctx: QueryCtx, monthStart: Date): Promise<AiProviderRow[]>;
  aiTag(ctx: QueryCtx, monthStart: Date): Promise<AiTagRow[]>;
  aiLoggedTags(ctx: QueryCtx): Promise<{ tag: string; calls: number }[]>;
  autoCompanies(ctx: QueryCtx): Promise<AutoCompaniesData>;
  crawl(ctx: QueryCtx): Promise<CrawlData>;
  crawlErrors(ctx: QueryCtx): Promise<CrawlErrorRow[]>;
}

// ── 공통 SQL 조각 ──

const M = 'a.extracted_metadata';
const nonEmptyArray = (path: string) =>
  `(CASE WHEN jsonb_typeof(${path}) = 'array' THEN jsonb_array_length(${path}) > 0 ELSE false END)`;
const ENTITY_TITLE = String.raw`a.title ~ '&(amp|#39|quot|lt|gt);'`;
const KO_TITLE = `a.title ~ '[가-힣]'`;
const CJK_TITLE = `a.title ~ '[぀-ヿ㐀-䶿一-鿿]'`;
const IS_ARXIV = `a.source = 'arxiv'`;
const IS_NEWS = `(COALESCE(a.product_type, '') <> 'video' AND a.source NOT IN ('arxiv','github','sec_edgar','patent') AND a.source NOT LIKE 'YouTube%')`;
const focusFilters = (domain: 'hand' | 'actuator', extra: string) =>
  `count(*) FILTER (WHERE ${extra}${M}->'domainFocus'->'${domain}' IS NOT NULL)::int AS focus_${domain}_judged,
   count(*) FILTER (WHERE ${extra}${M}#>>'{domainFocus,${domain},level}' = 'primary')::int AS focus_${domain}_primary,
   count(*) FILTER (WHERE ${extra}${M}#>>'{domainFocus,${domain},level}' = 'secondary')::int AS focus_${domain}_secondary,
   count(*) FILTER (WHERE ${extra}${M}#>>'{domainFocus,${domain},level}' = 'none')::int AS focus_${domain}_none`;

/** Q-A1: articles 1회 스캔 */
export const QA1_SQL = `
SELECT a.source, a.product_type, a.language, ${M}->>'channel' AS channel, ${M}->>'thirdParty' AS third_party,
  count(*)::int AS total,
  count(*) FILTER (WHERE a.collected_at >= now() - interval '7 days')::int AS c7,
  count(*) FILTER (WHERE a.collected_at >= now() - interval '30 days')::int AS c30,
  count(*) FILTER (WHERE a.collected_at >= now() - interval '90 days')::int AS c90,
  max(a.collected_at) AS last_collected_at,
  count(*) FILTER (WHERE a.company_id IS NULL)::int AS company_null,
  count(*) FILTER (WHERE a.published_at IS NULL)::int AS published_null,
  count(*) FILTER (WHERE ${ENTITY_TITLE})::int AS entity_title,
  count(*) FILTER (WHERE ${KO_TITLE})::int AS ko_title,
  count(*) FILTER (WHERE ${CJK_TITLE})::int AS cjk_title,
  count(*) FILTER (WHERE ${IS_ARXIV} AND ${M}->>'aiSummaryKo' IS NOT NULL)::int AS arxiv_summary,
  count(*) FILTER (WHERE ${IS_ARXIV} AND ${M}->>'aiSummaryKo' IS NOT NULL AND a.collected_at >= now() - interval '30 days')::int AS arxiv_summary30,
  count(*) FILTER (WHERE ${IS_NEWS})::int AS news_total,
  count(*) FILTER (WHERE ${IS_NEWS} AND ${nonEmptyArray(`${M}->'keyPoints'`)})::int AS news_key_points,
  count(*) FILTER (WHERE ${IS_NEWS} AND a.published_at >= now() - interval '30 days')::int AS news30_total,
  count(*) FILTER (WHERE ${IS_NEWS} AND a.published_at >= now() - interval '30 days' AND ${nonEmptyArray(`${M}->'keyPoints'`)})::int AS news30_key_points,
  ${focusFilters('hand', `${IS_ARXIV} AND `)},
  ${focusFilters('actuator', `${IS_ARXIV} AND `)},
  count(*) FILTER (WHERE ${IS_ARXIV} AND ${M}->'handTopics' IS NOT NULL)::int AS hand_topics,
  count(*) FILTER (WHERE ${IS_ARXIV} AND ${M}->'domainTopics'->'actuator' IS NOT NULL)::int AS actuator_topics
FROM articles a
GROUP BY a.source, a.product_type, a.language, ${M}->>'channel', ${M}->>'thirdParty'`;

/** Q-A2: articles(영상) 1회 스캔. $1 = SINCE_DAYS, $2 = MAX_ATTEMPTS. requireDemoSignal 에 따라 tagsCond 가 달라진다. */
export function buildQa2Sql(requireDemoSignal: boolean): string {
  const tagsCond = requireDemoSignal ? `${M}->'aiTags' IS NOT NULL` : 'TRUE';
  const recent = `a.published_at >= now() - make_interval(days => $1::int)`;
  const scope = `(${tagsCond}) AND ${recent}`;
  const attempts = `COALESCE((${M}->>'geminiAnalysisAttempts')::int, 0)`;
  const robotsNonEmpty = nonEmptyArray(`${M}->'aiTags'->'robots'`);
  return `
SELECT ${M}->>'domain' AS domain,
  count(*)::int AS total,
  count(*) FILTER (WHERE ${M}->'aiTags' IS NOT NULL)::int AS tagged,
  count(*) FILTER (WHERE ${M}->'aiTags'->>'method' = 'llm')::int AS tagged_llm,
  count(*) FILTER (WHERE ${M}->'aiTags'->>'method' = 'heuristic')::int AS tagged_heuristic,
  count(*) FILTER (WHERE ${M}->>'geminiAnalyzedAt' IS NOT NULL)::int AS gemini_analyzed,
  count(*) FILTER (WHERE btrim(${M}->'geminiAnalysis'->>'summaryKo') <> '')::int AS gemini_summary_ko,
  count(*) FILTER (WHERE ${scope})::int AS scope_total,
  count(*) FILTER (WHERE ${scope} AND ${M}->>'geminiAnalyzedAt' IS NOT NULL)::int AS scope_analyzed,
  count(*) FILTER (WHERE ${scope} AND ${M}->>'geminiAnalyzedAt' IS NULL AND ${attempts} < $2::int)::int AS scope_pending,
  count(*) FILTER (WHERE ${scope} AND ${M}->>'geminiAnalyzedAt' IS NULL AND ${attempts} >= $2::int)::int AS scope_exhausted,
  count(*) FILTER (WHERE NOT (${tagsCond}))::int AS no_tags,
  count(*) FILTER (WHERE (${tagsCond}) AND (a.published_at IS NULL OR NOT (${recent})))::int AS too_old,
  ${focusFilters('hand', '')},
  ${focusFilters('actuator', '')},
  count(*) FILTER (WHERE a.published_at >= now() - interval '90 days')::int AS focus_recent90,
  count(*) FILTER (WHERE ${M}->'handTopics' IS NOT NULL)::int AS hand_topics,
  count(*) FILTER (WHERE ${M}->'domainTopics'->'actuator' IS NOT NULL)::int AS actuator_topics,
  count(*) FILTER (WHERE ${robotsNonEmpty})::int AS robots_nonempty,
  count(*) FILTER (WHERE ${robotsNonEmpty} AND NOT EXISTS (SELECT 1 FROM article_robot_tags t WHERE t.article_id = a.id))::int AS robots_untagged
FROM articles a
WHERE a.product_type = 'video'
GROUP BY ${M}->>'domain'`;
}

export const QA2_SQL = buildQa2Sql(true);
export const QA2_SQL_NO_DEMO_SIGNAL = buildQa2Sql(false);

/** Q-A6: articles keyset 페이지 읽기(중복 탐지용). $1 = 마지막 id(없으면 NULL), $2 = 페이지 크기 */
export const QA6_SQL = `
SELECT a.id::text AS id, a.source, a.url, ${M}->>'arxivId' AS arxiv_id, ${M}->>'videoId' AS video_id
FROM articles a
WHERE ($1::uuid IS NULL OR a.id > $1::uuid)
ORDER BY a.id
LIMIT $2::int`;
export const QA6_PAGE_SIZE = 5000;

/** 자동 생성 회사 → 연결 건수(인덱스 조회: articles.company_id) */
export const AUTO_COMPANY_SAMPLES_SQL = `
SELECT c.name,
  (SELECT count(*)::int FROM articles a WHERE a.company_id = c.id) AS articles,
  (SELECT count(*)::int FROM humanoid_robots r WHERE r.company_id = c.id) AS robots
FROM companies c
WHERE c.main_business LIKE 'Robotics (auto-linked%'
ORDER BY c.name
LIMIT 20`;

/** articles 전체 스캔 쿼리 목록(계산 1회당 3회 이하 — 정적 검사 대상) */
export const ARTICLES_FULL_SCAN_QUERIES: readonly string[] = [QA1_SQL, QA2_SQL, QA6_SQL];

const n = (v: unknown): number => (v == null ? 0 : Number(v));
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v == null ? null : new Date(String(v)).toISOString());

export const BODY_FIELDS = ['height_cm', 'weight_kg', 'payload_kg', 'dof_count', 'max_speed_mps', 'operation_time_hours'] as const;
export const HAND_FIELDS = ['hand_type', 'finger_count', 'hand_dof', 'grip_force_n'] as const;
export const POWER_FIELDS = ['battery_type', 'capacity_wh', 'operation_time_hours', 'charging_method'] as const;

function fieldNullsSql(table: string, fields: readonly string[]): string {
  const cols = fields
    .map((f) => `count(*) FILTER (WHERE s.${f} IS NULL OR btrim(s.${f}::text) = '')::int AS ${f}`)
    .join(',\n  ');
  return `SELECT count(*)::int AS total,\n  ${cols}\nFROM humanoid_robots r LEFT JOIN ${table} s ON s.robot_id = r.id\nWHERE r.data_type = 'confirmed'`;
}

const dynMissing = (key: string) => `(ps.dynamic_specs->>'${key}' IS NULL OR btrim(ps.dynamic_specs->>'${key}') = '')`;

/** 공급사 제품 추적 필드 키 — 공급사 제품 변환 유틸(supplierToDynamicSpecs)이 만드는 키(peakTorqueNm/torqueNm/maxTorqueNm, weightKg, diameterMm, priceUsd) */
export const SUPPLIER_TORQUE_KEYS = ['peakTorqueNm', 'torqueNm', 'maxTorqueNm'] as const;
export const SUPPLIER_WEIGHT_KEY = 'weightKg';
export const SUPPLIER_DIAMETER_KEY = 'diameterMm';
export const SUPPLIER_PRICE_KEY = 'priceUsd';

const SUPPLIER_SQL = `
SELECT count(*)::int AS total,
  count(*) FILTER (WHERE ${SUPPLIER_TORQUE_KEYS.map(dynMissing).join(' AND ')})::int AS m_torque,
  count(*) FILTER (WHERE ${dynMissing(SUPPLIER_WEIGHT_KEY)})::int AS m_weight,
  count(*) FILTER (WHERE ${dynMissing(SUPPLIER_DIAMETER_KEY)})::int AS m_diameter,
  count(*) FILTER (WHERE ps.price_min IS NULL AND ps.price_max IS NULL AND ${dynMissing(SUPPLIER_PRICE_KEY)})::int AS m_price
FROM products p LEFT JOIN product_specs ps ON ps.product_id = p.id
WHERE p.type = 'actuator'`;

const COMPONENTS_BY_TYPE_SQL = `
SELECT type, count(*)::int AS cnt,
  count(*) FILTER (WHERE specifications IS NULL OR jsonb_typeof(specifications) <> 'object' OR specifications = '{}'::jsonb)::int AS empty_specs
FROM components GROUP BY type ORDER BY type`;

const COMPONENT_KEYS_SQL = `
SELECT c.type, kv.key, count(*)::int AS cnt
FROM components c
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(c.specifications) = 'object' THEN c.specifications ELSE '{}'::jsonb END) kv
WHERE kv.value <> 'null'::jsonb AND NOT (jsonb_typeof(kv.value) = 'string' AND btrim(kv.value #>> '{}') = '')
GROUP BY c.type, kv.key
ORDER BY cnt DESC, c.type, kv.key
LIMIT 500`;

const CI_FILLED = `v.value IS NOT NULL AND btrim(v.value) <> ''`;

const CI_BY_LAYER_SQL = `
WITH comp AS (SELECT count(*)::int AS n FROM ci_competitors WHERE is_active),
items AS (
  SELECT l.id AS lid, count(i.id)::int AS n
  FROM ci_layers l LEFT JOIN ci_categories cat ON cat.layer_id = l.id LEFT JOIN ci_items i ON i.category_id = cat.id
  GROUP BY l.id
),
filled AS (
  SELECT cat.layer_id AS lid, count(*)::int AS filled, count(*) FILTER (WHERE v.confidence IN ('D','F'))::int AS low
  FROM ci_values v
  JOIN ci_competitors c ON c.id = v.competitor_id AND c.is_active
  JOIN ci_items i ON i.id = v.item_id
  JOIN ci_categories cat ON cat.id = i.category_id
  WHERE ${CI_FILLED}
  GROUP BY cat.layer_id
)
SELECT l.slug, l.name, (items.n * comp.n)::int AS expected, COALESCE(filled.filled, 0)::int AS filled, COALESCE(filled.low, 0)::int AS low
FROM ci_layers l
JOIN items ON items.lid = l.id
CROSS JOIN comp
LEFT JOIN filled ON filled.lid = l.id
ORDER BY l.sort_order, l.slug`;

const TAG_RE = String.raw`^\[([^\]]+)\]`;

// ── 읽기 전용 트랜잭션 실행기 ──

export async function withReadOnlyTx<T>(pool: Pool, timeoutMs: number, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const ms = Math.max(1, Math.floor(timeoutMs));
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN READ ONLY');
    began = true;
    await client.query(`SET LOCAL statement_timeout = ${ms}`);
    return await fn(client);
  } finally {
    try {
      if (began) await client.query('ROLLBACK');
    } catch {
      /* 연결이 이미 깨졌으면 release 에서 폐기된다 */
    }
    client.release();
  }
}

export function createCoverageQueries(pool: Pool): CoverageQueryMap {
  const ro = <T>(ctx: QueryCtx, fn: (c: PoolClient) => Promise<T>) => withReadOnlyTx(pool, ctx.timeoutMs, fn);
  const focusOf = (r: Record<string, unknown>, d: 'hand' | 'actuator'): FocusCounts => ({
    judged: n(r[`focus_${d}_judged`]),
    primary: n(r[`focus_${d}_primary`]),
    secondary: n(r[`focus_${d}_secondary`]),
    none: n(r[`focus_${d}_none`]),
  });
  const fieldNulls = (table: string, fields: readonly string[]) => (ctx: QueryCtx) =>
    ro(ctx, async (c) => {
      const r = (await c.query(fieldNullsSql(table, fields))).rows[0] ?? {};
      return { total: n(r.total), nulls: Object.fromEntries(fields.map((f) => [f, n(r[f])])) } as FieldNulls;
    });

  return {
    qa1: (ctx) =>
      ro(ctx, async (c) => {
        const { rows } = await c.query(QA1_SQL);
        return rows.map(
          (r): Qa1Row => ({
            source: String(r.source),
            productType: r.product_type ?? null,
            language: r.language ?? null,
            channel: r.channel ?? null,
            thirdParty: r.third_party ?? null,
            total: n(r.total),
            c7: n(r.c7),
            c30: n(r.c30),
            c90: n(r.c90),
            lastCollectedAt: iso(r.last_collected_at),
            companyNull: n(r.company_null),
            publishedNull: n(r.published_null),
            entityTitle: n(r.entity_title),
            koTitle: n(r.ko_title),
            cjkTitle: n(r.cjk_title),
            arxivSummary: n(r.arxiv_summary),
            arxivSummary30: n(r.arxiv_summary30),
            newsTotal: n(r.news_total),
            newsKeyPoints: n(r.news_key_points),
            news30Total: n(r.news30_total),
            news30KeyPoints: n(r.news30_key_points),
            focusHand: focusOf(r, 'hand'),
            focusActuator: focusOf(r, 'actuator'),
            handTopics: n(r.hand_topics),
            actuatorTopics: n(r.actuator_topics),
          }),
        );
      }),

    qa2: (ctx, scope) =>
      ro(ctx, async (c) => {
        const sql = scope.requireDemoSignal ? QA2_SQL : QA2_SQL_NO_DEMO_SIGNAL;
        const { rows } = await c.query(sql, [scope.sinceDays, scope.maxAttempts]);
        return rows.map(
          (r): Qa2Row => ({
            domain: r.domain ?? null,
            total: n(r.total),
            tagged: n(r.tagged),
            taggedLlm: n(r.tagged_llm),
            taggedHeuristic: n(r.tagged_heuristic),
            geminiAnalyzed: n(r.gemini_analyzed),
            geminiSummaryKo: n(r.gemini_summary_ko),
            scopeTotal: n(r.scope_total),
            scopeAnalyzed: n(r.scope_analyzed),
            scopePending: n(r.scope_pending),
            scopeExhausted: n(r.scope_exhausted),
            noTags: n(r.no_tags),
            tooOld: n(r.too_old),
            focusHand: focusOf(r, 'hand'),
            focusActuator: focusOf(r, 'actuator'),
            focusRecent90: n(r.focus_recent90),
            handTopics: n(r.hand_topics),
            actuatorTopics: n(r.actuator_topics),
            robotsNonempty: n(r.robots_nonempty),
            robotsUntagged: n(r.robots_untagged),
          }),
        );
      }),

    qa6: (ctx, maxRows = DUP_MAX_ROWS_DEFAULT) =>
      ro(ctx, async (c) => {
        const det = createDuplicateDetector({ maxRows });
        let last: string | null = null;
        for (;;) {
          const { rows } = await c.query(QA6_SQL, [last, QA6_PAGE_SIZE]);
          for (const r of rows) {
            if (!det.add({ id: r.id, source: r.source, url: r.url, arxivId: r.arxiv_id ?? null, videoId: r.video_id ?? null })) {
              throw new TooLargeError(`articles rows exceed ${maxRows}`);
            }
          }
          if (rows.length < QA6_PAGE_SIZE) break;
          last = rows[rows.length - 1].id as string;
        }
        return det.finish();
      }),

    robots: (ctx) =>
      ro(ctx, async (c) => {
        const r = (
          await c.query(`SELECT count(*)::int AS total,
            count(*) FILTER (WHERE data_type = 'confirmed')::int AS confirmed,
            count(*) FILTER (WHERE data_type = 'forecast')::int AS forecast,
            count(*) FILTER (WHERE data_type = 'confirmed' AND NOT EXISTS (SELECT 1 FROM body_specs b WHERE b.robot_id = humanoid_robots.id))::int AS no_body
            FROM humanoid_robots`)
        ).rows[0] ?? {};
        return { total: n(r.total), confirmed: n(r.confirmed), forecast: n(r.forecast), noBodySpecs: n(r.no_body) };
      }),

    bodyFields: fieldNulls('body_specs', BODY_FIELDS),
    handFields: fieldNulls('hand_specs', HAND_FIELDS),
    powerFields: fieldNulls('power_specs', POWER_FIELDS),

    components: (ctx) =>
      ro(ctx, async (c) => {
        const byType = (await c.query(COMPONENTS_BY_TYPE_SQL)).rows.map((r) => ({ type: String(r.type), count: n(r.cnt), emptySpecs: n(r.empty_specs) }));
        const specKeys = (await c.query(COMPONENT_KEYS_SQL)).rows.map((r) => ({ type: String(r.type), key: String(r.key), count: n(r.cnt) }));
        return { byType, specKeys };
      }),

    supplier: (ctx) =>
      ro(ctx, async (c) => {
        const r = (await c.query(SUPPLIER_SQL)).rows[0] ?? {};
        return { total: n(r.total), missing: { torque: n(r.m_torque), weight: n(r.m_weight), diameter: n(r.m_diameter), price: n(r.m_price) } };
      }),

    sourcing: (ctx) =>
      ro(ctx, async (c) => {
        const rows = (await c.query(`SELECT sourcing, count(*)::int AS cnt FROM actuator_sourcing GROUP BY sourcing ORDER BY sourcing`)).rows;
        const un = (
          await c.query(`SELECT count(*)::int AS cnt FROM humanoid_robots r LEFT JOIN actuator_sourcing s ON s.robot_id = r.id WHERE s.robot_id IS NULL AND r.data_type = 'confirmed'`)
        ).rows[0];
        return { rows: rows.map((r) => ({ sourcing: String(r.sourcing), count: n(r.cnt) })), unsourced: n(un?.cnt) };
      }),

    ci: (ctx) =>
      ro(ctx, async (c) => {
        const head = (await c.query(`SELECT (SELECT count(*) FROM ci_competitors WHERE is_active)::int AS competitors, (SELECT count(*) FROM ci_items)::int AS items`)).rows[0] ?? {};
        const conf = (
          await c.query(`SELECT v.confidence, count(*)::int AS cnt FROM ci_values v JOIN ci_competitors c ON c.id = v.competitor_id AND c.is_active WHERE ${CI_FILLED} GROUP BY v.confidence`)
        ).rows;
        return {
          competitors: n(head.competitors),
          items: n(head.items),
          byConfidence: conf.map((r) => ({ confidence: r.confidence ?? null, count: n(r.cnt) })),
        };
      }),

    ciByLayer: (ctx) =>
      ro(ctx, async (c) =>
        (await c.query(CI_BY_LAYER_SQL)).rows.map((r) => ({ slug: String(r.slug), name: String(r.name), expected: n(r.expected), filled: n(r.filled), low: n(r.low) })),
      ),

    ciStaging: (ctx) =>
      ro(ctx, async (c) => {
        const rows = (await c.query(`SELECT update_type, count(*)::int AS cnt, min(created_at) AS oldest FROM ci_staging WHERE status = 'pending' GROUP BY update_type ORDER BY update_type`)).rows;
        let oldest: string | null = null;
        for (const r of rows) {
          const t = iso(r.oldest);
          if (t && (!oldest || Date.parse(t) < Date.parse(oldest))) oldest = t;
        }
        return {
          pending: rows.reduce((s, r) => s + n(r.cnt), 0),
          byType: rows.map((r) => ({ updateType: String(r.update_type), count: n(r.cnt) })),
          oldestCreatedAt: oldest,
        };
      }),

    handBenchmark: (ctx) =>
      ro(ctx, async (c) => {
        const r = (
          await c.query(`SELECT (SELECT count(*) FROM hand_competitors WHERE is_active)::int AS competitors,
            (SELECT count(*) FROM hand_benchmark_axes)::int AS axes,
            (SELECT count(*) FROM hand_benchmark_scores s JOIN hand_competitors hc ON hc.id = s.competitor_id AND hc.is_active)::int AS scores`)
        ).rows[0] ?? {};
        return { competitors: n(r.competitors), axes: n(r.axes), scores: n(r.scores) };
      }),

    aiProvider: (ctx, monthStart) =>
      ro(ctx, async (c) =>
        (
          await c.query(
            `SELECT provider, count(*)::int AS calls, COALESCE(sum(input_tokens), 0)::float8 AS in_tok, COALESCE(sum(output_tokens), 0)::float8 AS out_tok, COALESCE(sum(estimated_cost_usd), 0)::float8 AS cost
             FROM ai_usage_logs WHERE created_at >= $1 GROUP BY provider ORDER BY provider`,
            [monthStart],
          )
        ).rows.map((r) => ({ provider: String(r.provider), calls: n(r.calls), inputTokens: n(r.in_tok), outputTokens: n(r.out_tok), costUsd: n(r.cost) })),
      ),

    aiTag: (ctx, monthStart) =>
      ro(ctx, async (c) =>
        (
          await c.query(
            `SELECT COALESCE(substring(query from '${TAG_RE}'), '(untagged)') AS tag, count(*)::int AS calls,
               COALESCE(sum(input_tokens), 0)::float8 AS in_tok, COALESCE(sum(output_tokens), 0)::float8 AS out_tok,
               COALESCE(sum(estimated_cost_usd), 0)::float8 AS cost,
               COALESCE(sum(sum(estimated_cost_usd)) OVER (), 0)::float8 AS total_cost
             FROM ai_usage_logs WHERE created_at >= $1 GROUP BY 1 ORDER BY cost DESC, tag LIMIT 20`,
            [monthStart],
          )
        ).rows.map((r) => ({ tag: String(r.tag), calls: n(r.calls), inputTokens: n(r.in_tok), outputTokens: n(r.out_tok), costUsd: n(r.cost), totalCostUsd: n(r.total_cost) })),
      ),

    aiLoggedTags: (ctx) =>
      ro(ctx, async (c) =>
        (
          await c.query(
            `SELECT substring(query from '${TAG_RE}') AS tag, count(*)::int AS calls
             FROM ai_usage_logs
             WHERE created_at >= now() - interval '30 days' AND query ~ '^\\[(video-tagging|paper-summary|spec-enrichment)\\]'
             GROUP BY 1`,
          )
        ).rows.map((r) => ({ tag: String(r.tag), calls: n(r.calls) })),
      ),

    autoCompanies: (ctx) =>
      ro(ctx, async (c) => {
        const head = (
          await c.query(`SELECT count(*) FILTER (WHERE main_business LIKE 'Robotics (auto-linked%')::int AS auto_cnt, count(*)::int AS total FROM companies`)
        ).rows[0] ?? {};
        const samples = (await c.query(AUTO_COMPANY_SAMPLES_SQL)).rows.map((r) => ({ name: String(r.name), articles: n(r.articles), robots: n(r.robots) }));
        return { count: n(head.auto_cnt), total: n(head.total), samples };
      }),

    crawl: (ctx) =>
      ro(ctx, async (c) => {
        const t =
          (
            await c.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE COALESCE(enabled, true))::int AS enabled,
              count(*) FILTER (WHERE enabled = false)::int AS disabled, count(*) FILTER (WHERE last_crawled IS NULL)::int AS never,
              max(last_crawled) AS last_max FROM crawl_targets`)
          ).rows[0] ?? {};
        const jobs = (
          await c.query(`SELECT COALESCE(status, '(null)') AS status, count(*)::int AS total,
            count(*) FILTER (WHERE started_at >= now() - interval '7 days')::int AS last7
            FROM crawl_jobs GROUP BY 1 ORDER BY 1`)
        ).rows;
        const agg =
          (
            await c.query(`SELECT count(*) FILTER (WHERE status = 'running' AND started_at < now() - interval '6 hours')::int AS stuck,
              count(*) FILTER (WHERE started_at >= now() - interval '30 days')::int AS jobs30,
              COALESCE(sum(success_count) FILTER (WHERE started_at >= now() - interval '30 days'), 0)::float8 AS ok30,
              COALESCE(sum(failure_count) FILTER (WHERE started_at >= now() - interval '30 days'), 0)::float8 AS fail30,
              COALESCE(sum(duplicate_count) FILTER (WHERE started_at >= now() - interval '30 days'), 0)::float8 AS dup30
              FROM crawl_jobs`)
          ).rows[0] ?? {};
        return {
          targets: { total: n(t.total), enabled: n(t.enabled), disabled: n(t.disabled), neverCrawled: n(t.never), lastCrawledMax: iso(t.last_max) },
          jobsByStatus: jobs.map((r) => ({ status: String(r.status), total: n(r.total), last7d: n(r.last7) })),
          stuckRunning: n(agg.stuck),
          last30d: { jobs: n(agg.jobs30), success: n(agg.ok30), failure: n(agg.fail30), duplicate: n(agg.dup30) },
        };
      }),

    crawlErrors: (ctx) =>
      ro(ctx, async (c) =>
        (
          await c.query(
            `SELECT error_type, regexp_replace(left(message, 100), '[?][^[:space:]]*', '', 'g') AS msg, count(*)::int AS cnt
             FROM crawl_errors WHERE occurred_at >= now() - interval '30 days'
             GROUP BY 1, 2 ORDER BY cnt DESC, 1, 2 LIMIT 5`,
          )
        ).rows.map((r) => ({ errorType: String(r.error_type), message: String(r.msg), count: n(r.cnt) })),
      ),
  };
}
