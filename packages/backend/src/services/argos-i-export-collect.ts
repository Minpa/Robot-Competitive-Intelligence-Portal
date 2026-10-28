/**
 * ARGOS_I 내보내기 수집 — DB 읽기 전용 (SELECT 만). AI·외부 HTTP·크롤링 호출은 없다.
 *
 * 규칙
 *  - 포맷팅은 하지 않고 영역별 "원자료" 를 돌려준다 (빌더가 정렬·정제·화이트리스트를 담당).
 *  - 작은 테이블은 `to_jsonb(row)` 로 읽는다: 시각은 문자열로 직렬화되어 JS Date 로컬 변환에 의존하지 않는다
 *    (`timestamp` 컬럼은 UTC 로 저장돼 있으므로 빌더가 오프셋이 없는 문자열을 UTC 로 해석한다).
 *  - articles 는 슬림 projection 만 읽는다 (content 는 읽지 않는다. description 과 arXiv summary 는 도메인 분류 판정용으로만 읽고 출력하지 않는다).
 *  - 영역 내부 쿼리 병렬은 최대 3 으로 제한한다 (advisory lock 트랜잭션이 커넥션 1개를 쥐고 있어 풀 고갈을 막는다).
 *  - actuatorPositionMapService.getMap() 은 view_cache 에 쓰기를 하는 기존 동작을 그대로 가진다 (허용). 결과의 generatedAt/cached 는 번들에 넣지 않는다.
 */

import { sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { actuatorPositionMapService } from './actuator-position-map.service.js';
import { dataMigrationService } from './data-migration.service.js';
import type { ActuatorMapRaw } from './argos-i-export-areas-catalog.js';
import type { CacheRow, RawArticle } from './argos-i-export-areas-content.js';

/** timestamp(UTC 저장, tz 없음) → 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"' (세션 TZ 와 무관) */
const ISO_FMT = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`;
const ISO_TS = (col: string) => `to_char(${col}, ${ISO_FMT})`;
/** timestamptz → UTC ISO */
const ISO_TSTZ = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', ${ISO_FMT})`;

export const COLLECT_CONCURRENCY = 3;

export interface CollectDeps {
  query(q: SQL): Promise<unknown>;
  getActuatorMap(): Promise<ActuatorMapRaw>;
  getMarker(key: string): Promise<Record<string, unknown> | null>;
}

export const defaultCollectDeps: CollectDeps = {
  query: (q) => db.execute(q),
  getActuatorMap: async () => {
    const { cached: _cached, generatedAt: _generatedAt, ...body } = await actuatorPositionMapService.getMap();
    return body as ActuatorMapRaw;
  },
  getMarker: async (key) => (await dataMigrationService.get(key))?.summary ?? null,
};

export interface Collector {
  collect(areaId: string): Promise<unknown>;
}

type Row = Record<string, any>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

/** 최대 n 개씩 병렬 실행하되 결과 순서는 입력 순서를 유지한다 */
export async function runLimited<T>(tasks: readonly (() => Promise<T>)[], n: number = COLLECT_CONCURRENCY): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// articles 슬림 projection
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_PROJECTION = `jsonb_build_object(
  'hand', jsonb_build_object('level', x.m#>'{domainFocus,hand,level}', 'source', x.m#>'{domainFocus,hand,source}'),
  'actuator', jsonb_build_object('level', x.m#>'{domainFocus,actuator,level}', 'source', x.m#>'{domainFocus,actuator,source}')
)`;

const AUTHORS_PROJECTION = `CASE jsonb_typeof(x.m->'authors')
  WHEN 'array' THEN (SELECT jsonb_agg(left(e.v, 80) ORDER BY e.o) FROM (SELECT t.v, t.o FROM jsonb_array_elements_text(x.m->'authors') WITH ORDINALITY AS t(v, o) ORDER BY t.o LIMIT 20) e)
  WHEN 'string' THEN to_jsonb(left(x.m->>'authors', 400))
  ELSE NULL END`;

const GEMINI_PROJECTION = `CASE WHEN x.m->'geminiAnalysis' IS NOT NULL AND jsonb_typeof(x.m->'geminiAnalysis') = 'object' THEN jsonb_build_object(
  'task', x.m#>'{geminiAnalysis,task}',
  'environment', x.m#>'{geminiAnalysis,environment}',
  'autonomy', x.m#>'{geminiAnalysis,autonomy}',
  'robotCount', x.m#>'{geminiAnalysis,robotCount}',
  'durationSec', x.m#>'{geminiAnalysis,durationSec}',
  'capabilities', x.m#>'{geminiAnalysis,capabilities}',
  'keyMoments', x.m#>'{geminiAnalysis,keyMoments}',
  'summaryKo', left(x.m#>>'{geminiAnalysis,summaryKo}', 400),
  'analyzedAt', x.m#>'{geminiAnalysis,analyzedAt}'
) END`;

type ArticleKind = 'videos' | 'papers' | 'news' | 'external';

const ARTICLE_WHERE: Record<ArticleKind, string> = {
  videos: `a.product_type = 'video'`,
  papers: `a.product_type IS DISTINCT FROM 'video' AND a.source = 'arxiv'`,
  news: `a.product_type IS DISTINCT FROM 'video' AND COALESCE(a.source, '') NOT IN ('arxiv', 'github', 'sec_edgar', 'patent')`,
  external: `a.product_type IS DISTINCT FROM 'video' AND a.source IN ('github', 'sec_edgar', 'patent')`,
};

const ARTICLE_META: Record<ArticleKind, string> = {
  videos: `jsonb_build_object(
    'videoId', x.m->'videoId', 'channel', x.m->'channel', 'thirdParty', x.m->'thirdParty', 'thumbnail', x.m->'thumbnail', 'views', x.m->'views',
    'domain', x.m->'domain', 'topic', x.m->'topic', 'topics', x.m->'topics',
    'description', left(x.m->>'description', 400),
    'aiTags', x.m->'aiTags', 'domainFocus', ${FOCUS_PROJECTION}, 'handTopics', x.m->'handTopics',
    'domainTopics', jsonb_build_object('actuator', x.m#>'{domainTopics,actuator}'),
    'geminiAnalyzedAt', x.m->'geminiAnalyzedAt', 'geminiAnalysis', ${GEMINI_PROJECTION}
  )`,
  papers: `jsonb_build_object(
    'arxivId', left(x.m->>'arxivId', 40), 'authors', ${AUTHORS_PROJECTION}, 'aiSummaryKo', left(x.m->>'aiSummaryKo', 400),
    'domainFocus', ${FOCUS_PROJECTION}, 'handTopics', x.m->'handTopics', 'domainTopics', jsonb_build_object('actuator', x.m#>'{domainTopics,actuator}')
  )`,
  news: `jsonb_build_object(
    'keyPoints', x.m->'keyPoints', 'marketInsights', x.m->'marketInsights', 'mentionedCompanies', x.m->'mentionedCompanies',
    'mentionedRobots', x.m->'mentionedRobots', 'technologies', x.m->'technologies'
  )`,
  external: `'{}'::jsonb`,
};

/** 논문은 도메인 분류 판정에만 쓰는 초록 앞부분, 뉴스는 앞 300자 요약. 영상·외부 출처는 요약을 읽지 않는다. */
const ARTICLE_SUMMARY: Record<ArticleKind, string> = {
  videos: 'NULL::text',
  papers: 'left(a.summary, 2000)',
  news: 'left(a.summary, 300)',
  external: 'NULL::text',
};

export function articleQuery(kind: ArticleKind): string {
  const robotIds =
    kind === 'news'
      ? `(SELECT array_agg(t.robot_id::text ORDER BY t.robot_id::text) FROM article_robot_tags t WHERE t.article_id = a.id)`
      : `NULL::text[]`;
  return `
    SELECT a.id::text AS id, a.title, a.url, ${ARTICLE_SUMMARY[kind]} AS summary, a.source, a.product_type, a.category, a.language,
           a.company_id::text AS company_id, c.name AS company_name,
           ${ISO_TS('a.published_at')} AS published_at, ${ISO_TS('a.collected_at')} AS collected_at,
           jsonb_strip_nulls(${ARTICLE_META[kind]}) AS meta,
           ${robotIds} AS robot_ids
    FROM articles a
    LEFT JOIN companies c ON c.id = a.company_id
    CROSS JOIN LATERAL (SELECT COALESCE(a.extracted_metadata, '{}'::jsonb) AS m) x
    WHERE ${ARTICLE_WHERE[kind]}
    ORDER BY a.id`;
}

function toRawArticle(r: Row): RawArticle {
  return {
    id: String(r.id),
    title: r.title ?? null,
    url: r.url ?? null,
    summary: r.summary ?? null,
    source: r.source ?? null,
    productType: r.product_type ?? null,
    category: r.category ?? null,
    language: r.language ?? null,
    companyId: r.company_id ?? null,
    companyName: r.company_name ?? null,
    publishedAt: r.published_at ?? null,
    collectedAt: r.collected_at ?? null,
    meta: (r.meta ?? {}) as Record<string, any>,
    robotIds: Array.isArray(r.robot_ids) ? r.robot_ids.map(String) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 수집기
// ─────────────────────────────────────────────────────────────────────────────

export function createCollector(deps: CollectDeps = defaultCollectDeps): Collector {
  const run = (text: string) => deps.query(sql.raw(text)).then(rowsOf);
  /** SELECT to_jsonb(...) AS r — 행을 jsonb 로 받는다 */
  const json = (text: string) => run(text).then((rows) => rows.map((x) => x.r as Row));
  /** 테이블 전체 (제외 컬럼은 jsonb `-` 연산자로 SQL 단계에서 제거) */
  const table = (name: string, drop: string[] = [], order = '1') =>
    json(`SELECT to_jsonb(t)${drop.map((c) => ` - '${c}'`).join('')} AS r FROM ${name} t ORDER BY ${order}`);

  // 같은 실행 안에서 영역 간 공유되는 원자료 (한 번만 읽는다)
  const memo = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    let p = memo.get(key) as Promise<T> | undefined;
    if (!p) {
      p = fn();
      memo.set(key, p);
    }
    return p;
  };
  const articles = (kind: ArticleKind) => once(`articles:${kind}`, async () => (await run(articleQuery(kind))).map(toRawArticle));
  const actuatorMap = () => once('actuator-map', () => deps.getActuatorMap());

  const collectors: Record<string, () => Promise<unknown>> = {
    overview: async () => {
      const [articleCounts, companyFreshness, ci, caches, pipeline, weeklyBrief] = await runLimited([
        () => run(`SELECT source, product_type, count(*)::int AS n, ${ISO_TS('max(collected_at)')} AS last_collected_at FROM articles GROUP BY source, product_type ORDER BY source, product_type`),
        () => run(`SELECT c.id::text AS id, c.name, count(a.id)::int AS article_count, ${ISO_TS('max(a.collected_at)')} AS last_collected_at FROM companies c LEFT JOIN articles a ON a.company_id = c.id GROUP BY c.id, c.name ORDER BY c.name, c.id`),
        () => run(`SELECT ${ISO_TS('max(last_verified)')} AS last_verified FROM ci_freshness`),
        () => run(`SELECT view_name, ${ISO_TS('cached_at')} AS cached_at FROM view_cache WHERE view_name LIKE 'tech-trend-report:%' OR view_name LIKE 'tech-trend-timeline:%' OR view_name LIKE 'tech-trend-timeline-insight:%' OR view_name LIKE 'video-trend-summary:%' ORDER BY view_name`),
        () => deps.getMarker('pipeline:last'),
        () => deps.getMarker('weekly-brief:last'),
      ] as (() => Promise<any>)[]);
      return {
        articleCounts,
        companyFreshness,
        markers: { pipeline, weeklyBrief },
        insightCaches: (caches as Row[]).map((c) => ({ viewName: String(c.view_name), cachedAt: String(c.cached_at) })),
        ciLastVerifiedAt: ((ci as Row[])[0]?.last_verified as string | null | undefined) ?? null,
        areas: [],
      };
    },

    companies: async () => {
      const [companies, workforce, talent] = await runLimited([
        () => table('companies', ['logo_url'], 't.name, t.id'),
        () => table('workforce_data', [], 't.company_id'),
        () => table('talent_trends', [], 't.company_id, t.year'),
      ]);
      return { companies, workforce, talent };
    },

    robots: async () => {
      const [robots, body, hand, computing, sensors, power, links] = await runLimited([
        () => json(`SELECT to_jsonb(r) - 'image_url' - 'description' || jsonb_build_object('company_name', c.name, 'company_country', c.country) AS r FROM humanoid_robots r LEFT JOIN companies c ON c.id = r.company_id ORDER BY r.name, r.id`),
        () => table('body_specs', [], 't.robot_id'),
        () => table('hand_specs', [], 't.robot_id'),
        () => table('computing_specs', [], 't.robot_id'),
        () => table('sensor_specs', [], 't.robot_id'),
        () => table('power_specs', [], 't.robot_id'),
        () => json(`SELECT jsonb_build_object('robot_id', rc.robot_id, 'component_id', rc.component_id, 'usage_location', rc.usage_location, 'quantity', rc.quantity, 'type', c.type, 'name', c.name, 'vendor', c.vendor) AS r FROM robot_components rc JOIN components c ON c.id = rc.component_id ORDER BY rc.robot_id, rc.component_id`),
      ]);
      return { robots, body, hand, computing, sensors, power, links };
    },

    components: async () => {
      const [components, links, robots] = await runLimited([
        () => table('components', [], 't.type, t.name, t.id'),
        () => table('robot_components', [], 't.component_id, t.robot_id'),
        () => json(`SELECT jsonb_build_object('id', id, 'announcement_year', announcement_year) AS r FROM humanoid_robots ORDER BY id`),
      ]);
      return { components, links, robots };
    },

    'actuator-map': () => actuatorMap(),
    'actuator-sourcing': () => actuatorMap(),

    'robot-benchmark': async () => {
      const [axes, competitors, scores] = await runLimited([
        () => table('ci_benchmark_axes', [], 't.sort_order, t.key'),
        () => table('ci_competitors', ['image_url'], 't.sort_order, t.slug'),
        () => table('ci_benchmark_scores', [], 't.competitor_id, t.axis_key'),
      ]);
      return { axes, competitors, scores };
    },

    'hand-benchmark': async () => {
      const [axes, competitors, scores] = await runLimited([
        () => table('hand_benchmark_axes', [], 't.sort_order, t.key'),
        () => table('hand_competitors', ['image_url'], 't.sort_order, t.slug'),
        () => table('hand_benchmark_scores', [], 't.competitor_id, t.axis_key'),
      ]);
      return { axes, competitors, scores };
    },

    'ci-matrix': async () => {
      const [competitors, layers, categories, items, values, freshness] = await runLimited([
        () => table('ci_competitors', ['image_url'], 't.sort_order, t.slug'),
        () => table('ci_layers', [], 't.sort_order, t.slug'),
        () => table('ci_categories', [], 't.layer_id, t.sort_order, t.id'),
        () => table('ci_items', [], 't.category_id, t.sort_order, t.id'),
        () => table('ci_values', [], 't.item_id, t.competitor_id'),
        () => table('ci_freshness', [], 't.layer_id, t.competitor_id'),
      ]);
      return { competitors, layers, categories, items, values, freshness };
    },

    'ci-changes': async () => {
      const [history, alerts] = await runLimited([
        () =>
          json(`SELECT jsonb_build_object('id', h.id, 'changed_at', h.changed_at, 'competitor', c.name, 'layer', l.name, 'category', cat.name, 'item', i.name,
                   'old_value', h.old_value, 'new_value', h.new_value, 'old_confidence', h.old_confidence, 'new_confidence', h.new_confidence,
                   'change_source', h.change_source, 'change_reason', h.change_reason) AS r
                FROM ci_value_history h
                JOIN ci_values v ON v.id = h.value_id
                JOIN ci_competitors c ON c.id = v.competitor_id
                JOIN ci_items i ON i.id = v.item_id
                JOIN ci_categories cat ON cat.id = i.category_id
                JOIN ci_layers l ON l.id = cat.layer_id
                ORDER BY h.changed_at DESC, h.id`),
        () =>
          json(`SELECT jsonb_build_object('id', a.id, 'detected_at', a.detected_at, 'competitor', c.name, 'layer', l.name, 'source_name', a.source_name,
                   'source_url', a.source_url, 'headline', a.headline, 'summary', a.summary, 'status', a.status) AS r
                FROM ci_monitor_alerts a
                LEFT JOIN ci_competitors c ON c.id = a.competitor_id
                LEFT JOIN ci_layers l ON l.id = a.layer_id
                ORDER BY a.detected_at DESC, a.id`),
      ]);
      return { history, alerts };
    },

    videos: async () => ({ rows: await articles('videos') }),
    papers: async () => ({ rows: await articles('papers') }),
    news: async () => ({ rows: await articles('news') }),
    'external-sources': async () => ({ rows: await articles('external') }),

    'tech-trends': async () => {
      const [caches, videos, papers, news] = await runLimited([
        () => run(`SELECT view_name, ${ISO_TS('cached_at')} AS cached_at, data FROM view_cache WHERE view_name LIKE 'tech-trend-report:%' OR view_name LIKE 'tech-trend-timeline:%' OR view_name LIKE 'tech-trend-timeline-insight:%' OR view_name LIKE 'video-trend-summary:%' ORDER BY view_name`),
        () => articles('videos'),
        () => articles('papers'),
        () => articles('news'),
      ] as (() => Promise<any>)[]);
      return {
        caches: (caches as Row[]).map<CacheRow>((c) => ({ viewName: String(c.view_name), cachedAt: String(c.cached_at), data: c.data })),
        videos,
        papers,
        news,
      };
    },

    'weekly-briefs': async () => ({
      rows: await run(`SELECT to_char(week_start, 'YYYY-MM-DD') AS week_start, ${ISO_TSTZ('generated_at')} AS generated_at, status, model, payload FROM weekly_briefs WHERE status IN ('ok', 'partial') ORDER BY week_start DESC`),
    }),

    keywords: async () => {
      const [keywords, stats] = await runLimited([
        () => table('keywords', [], 't.term, t.id'),
        () => table('keyword_stats', ['related_company_id', 'related_product_id', 'calculated_at'], 't.keyword_id, t.period_type, t.period_start DESC'),
      ]);
      return { keywords, stats };
    },

    'application-cases': async () => ({
      cases: await json(`SELECT to_jsonb(ac) || jsonb_build_object('robot_name', r.name, 'company_id', r.company_id, 'company_name', c.name) AS r FROM application_cases ac LEFT JOIN humanoid_robots r ON r.id = ac.robot_id LEFT JOIN companies c ON c.id = r.company_id ORDER BY ac.id`),
    }),

    scores: async () => {
      const withRobot = (tbl: string, drop: string[]) =>
        json(`SELECT to_jsonb(s)${drop.map((c) => ` - '${c}'`).join('')} || jsonb_build_object('robot_name', r.name) AS r FROM ${tbl} s LEFT JOIN humanoid_robots r ON r.id = s.robot_id ORDER BY s.id::text`);
      const [poc, rfm, positioning, history] = await runLimited([
        () => withRobot('poc_scores', ['metadata']),
        () => withRobot('rfm_scores', ['metadata']),
        () => withRobot('positioning_data', ['metadata']),
        () => withRobot('score_history', ['poc_scores', 'rfm_scores']),
      ]);
      return { poc, rfm, positioning, history };
    },

    'vision-cost': async () => {
      const [bomParts, robotCosts] = await runLimited([
        () => table('vision_sensor_bom_parts', ['source_basis', 'notes'], 't.part_type, t.part_name, t.id'),
        () => table('vision_sensor_robot_costs', ['metadata', 'camera_desc', 'lidar_depth_desc', 'compute_desc', 'performance_note'], 't.release_year, t.robot_label, t.id'),
      ]);
      return { bomParts, robotCosts };
    },

    products: async () => {
      const [products, specs] = await runLimited([
        () => json(`SELECT to_jsonb(p) || jsonb_build_object('company_name', c.name) AS r FROM products p LEFT JOIN companies c ON c.id = p.company_id ORDER BY p.id`),
        () => table('product_specs', ['sensors', 'control_architecture', 'os', 'sdk'], 't.product_id'),
      ]);
      return { products, specs };
    },

    'competitive-alerts': async () => ({
      rows: await json(`SELECT to_jsonb(a) - 'read_by' - 'read_at' - 'is_read' || jsonb_build_object('robot_name', r.name) AS r FROM competitive_alerts a LEFT JOIN humanoid_robots r ON r.id = a.robot_id ORDER BY a.created_at DESC, a.id`),
    }),

    aggregations: async () => {
      const [cases, robots, components, keywords] = await runLimited([
        () => json(`SELECT jsonb_build_object('robot_id', ac.robot_id, 'environment_type', ac.environment_type, 'task_type', ac.task_type, 'demo_date', to_char(ac.demo_date, 'YYYY-MM-DD'), 'locomotion_type', r.locomotion_type) AS r FROM application_cases ac JOIN humanoid_robots r ON r.id = ac.robot_id ORDER BY ac.id`),
        () => json(`SELECT jsonb_build_object('id', id, 'announcement_year', announcement_year) AS r FROM humanoid_robots ORDER BY id`),
        () => json(`SELECT jsonb_build_object('id', c.id, 'name', c.name, 'type', c.type, 'specifications', c.specifications, 'adoption_count', (SELECT count(*) FROM robot_components rc WHERE rc.component_id = c.id)) AS r FROM components c ORDER BY c.id`),
        () => json(`SELECT jsonb_build_object('id', q.id, 'term', q.term, 'article_count', q.article_count) AS r FROM (
                      SELECT k.id, k.term, (COALESCE((SELECT sum(ks.count) FROM keyword_stats ks WHERE ks.keyword_id = k.id), 0) + (SELECT count(*) FROM article_keywords ak WHERE ak.keyword_id = k.id))::int AS article_count
                      FROM keywords k) q ORDER BY q.article_count DESC, q.term, q.id LIMIT 500`),
      ]);
      return { cases, robots, components, keywords };
    },

    'strategy-warroom': async () => {
      const [partners, evaluations, domains, fits, goals, briefings] = await runLimited([
        () => table('partners', ['logo_url'], 't.name, t.id'),
        () => table('partner_evaluations', ['evaluated_by'], 't.partner_id, t.evaluated_at DESC'),
        () => table('application_domains', [], 't.name, t.id'),
        () => json(`SELECT to_jsonb(f) || jsonb_build_object('robot_name', r.name) AS r FROM domain_robot_fit f LEFT JOIN humanoid_robots r ON r.id = f.robot_id ORDER BY f.domain_id, f.robot_id`),
        () => table('strategic_goals', ['created_by'], 't.deadline, t.id'),
        () => json(`SELECT to_jsonb(b) - 'ai_cost_usd' || jsonb_build_object('robot_name', r.name) AS r FROM strategic_briefings b LEFT JOIN humanoid_robots r ON r.id = b.lg_robot_id ORDER BY b.created_at DESC, b.id`),
      ]);
      return { partners, evaluations, domains, fits, goals, briefings };
    },

    'lg-humanoid-models': async () => {
      const [models, eeCategories, cellRequirements] = await runLimited([
        () => table('humanoid_models', ['created_by'], 't.model_name, t.id'),
        () => table('ee_categories', [], 't.display_order'),
        () => table('cell_ee_requirements', [], 't.task_idx, t.industry_idx, t.lv'),
      ]);
      return { models, eeCategories, cellRequirements };
    },

    'coverage-field-events': async () => ({ rows: await table('coverage_field_events', ['created_by'], 't.event_date DESC, t.id') }),

    regulations: async () => {
      const [regulations, updates, checklist] = await runLimited([
        () => table('regulations', ['original_text', 'metadata', 'created_by'], 't.region, t.title, t.id'),
        () => table('regulatory_updates', ['is_read', 'detected_by', 'metadata'], 't.published_at DESC, t.id'),
        () => table('compliance_checklist', ['assignee', 'evidence'], 't.region, t.category, t.sort_order, t.id'),
      ]);
      return { regulations, updates, checklist };
    },

    'event-briefs': async () => ({
      rows: (await run(`SELECT view_name, ${ISO_TS('cached_at')} AS cached_at, data FROM view_cache WHERE view_name LIKE 'event-trend-%' OR view_name LIKE 'event-tech-insight-%' OR view_name LIKE 'event-ces-insight-%' ORDER BY view_name`)).map<CacheRow>(
        (c) => ({ viewName: String(c.view_name), cachedAt: String(c.cached_at), data: c.data }),
      ),
    }),

    'data-quality': async () => ({
      latest:
        (await run(`SELECT id::text AS id, total_robots, average_completeness::float8 AS average_completeness, critical_count, warning_count, ${ISO_TS('created_at')} AS created_at FROM data_audit_reports ORDER BY created_at DESC, id LIMIT 1`))[0] ?? null,
    }),
  };

  return {
    collect(areaId: string): Promise<unknown> {
      const fn = collectors[areaId];
      if (!fn) return Promise.reject(new Error(`unknown_area:${areaId}`));
      return fn();
    },
  };
}

/** 수집기가 다루는 영역 id (레지스트리와 일치해야 한다 — 테스트로 확인) */
export const COLLECTABLE_AREA_IDS: readonly string[] = [
  'overview', 'companies', 'robots', 'components', 'actuator-map', 'actuator-sourcing', 'robot-benchmark', 'hand-benchmark', 'ci-matrix', 'ci-changes',
  'videos', 'papers', 'news', 'tech-trends', 'weekly-briefs', 'keywords', 'application-cases', 'scores', 'vision-cost', 'products', 'competitive-alerts',
  'aggregations', 'strategy-warroom', 'lg-humanoid-models', 'coverage-field-events', 'regulations', 'event-briefs', 'external-sources', 'data-quality',
];
