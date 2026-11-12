/**
 * ARGOS_I 요청 인터페이스 런타임 배선 — 실제 서비스(영상 분석·스펙 보강·기술 트렌드·액추에이터 맵·번들 수집기)와 DB 를
 * 처리기·폴러의 주입점에 연결한다. 스케줄러(태스크 `argos-i-requests`)와 요청 라우트(query 인라인)가 이 모듈을 쓴다.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, pool, articles, bodySpecs, companies, crawlTargets, humanoidRobots } from '../db/index.js';
import { actuatorPositionMapService } from './actuator-position-map.service.js';
import { aiUsageService } from './ai-usage.service.js';
import { createCollector } from './argos-i-export-collect.js';
import { createGuardContext, guardIngestFields } from './argos-i-inbound-guard.js';
import { createArxivClient } from './argos-i-requests-arxiv.js';
import { fetchArticleMeta, httpGetLimited } from './argos-i-requests-article-meta.js';
import { getAllowedHosts, internalDomainsInAllowList } from './argos-i-requests-allowed-hosts.js';
import { ARGOS_I_REQUESTS_LOCK_KEY, isArgosIRequestsEnabled, resolveCostEstimates, type Env } from './argos-i-requests-config.js';
import { createAddSourceHandler, type SaveArticleItem } from './argos-i-requests-handlers/add-source.js';
import { createAnalyzeHandler, type ArticleLite } from './argos-i-requests-handlers/analyze.js';
import { createQueryHandler } from './argos-i-requests-handlers/query.js';
import { runArgosIRequestsTick, runInline, type ProcessorDeps, type TickSummary } from './argos-i-requests-processor.js';
import { matchBySlug, slugify } from './argos-i-requests-slug.js';
import { getStore } from './argos-i-requests.service.js';
import { createYoutubeClient } from './argos-i-requests-youtube.js';
import { specEnrichmentService } from './spec-enrichment.service.js';
import { techTrendReportService, type TechTrendDomain } from './tech-trend-report.service.js';
import { videoContentAnalysisService } from './video-content-analysis.service.js';
import type { RequestRow } from './argos-i-requests-store.js';
import type { RequestHandler } from './argos-i-requests-handlers/types.js';

type Row = Record<string, unknown>;
const rowsOf = (r: unknown): Row[] => (Array.isArray(r) ? (r as Row[]) : ((r as { rows?: Row[] } | null)?.rows ?? []));

async function loadCrawlDomains(): Promise<string[]> {
  const rows = await db.select({ domain: crawlTargets.domain }).from(crawlTargets).where(eq(crawlTargets.enabled, true));
  return rows.map((r) => r.domain);
}

export const allowedHosts = (env: Env = process.env) => getAllowedHosts({ loadCrawlDomains }, env);

/** 기동 시 한 번 — 허용 호스트에 내부 도메인이 들어 있으면 경고하고(항상 제외된다) 설정 오류를 알린다 */
export async function warnAllowedHostsAtStartup(env: Env = process.env): Promise<void> {
  const bad = internalDomainsInAllowList(await loadCrawlDomains().catch(() => []), env);
  if (bad.length > 0) console.warn(`[ArgosIRequest] warn=internal_domain_in_allowlist count=${bad.length} action=excluded`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 카탈로그 (slug 는 이름에서 파생한다)
// ─────────────────────────────────────────────────────────────────────────────

const catalog = {
  async findCompanyBySlug(slug: string) {
    const rows = await db.select({ id: companies.id, name: companies.name }).from(companies);
    return matchBySlug(rows, slug, (r) => [slugify(r.name)]);
  },
  async findRobotBySlug(slug: string) {
    const rows = await db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name, company: companies.name })
      .from(humanoidRobots)
      .innerJoin(companies, eq(companies.id, humanoidRobots.companyId));
    const hit = matchBySlug(rows, slug, (r) => [slugify(r.name), slugify(`${r.company} ${r.name}`)]);
    return hit ? { id: hit.id, name: hit.name } : null;
  },
  async robotsMissingSpecs(companyId: string, limit: number) {
    return db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name })
      .from(humanoidRobots)
      .leftJoin(bodySpecs, eq(bodySpecs.robotId, humanoidRobots.id))
      .where(and(eq(humanoidRobots.companyId, companyId), isNull(bodySpecs.robotId)))
      .orderBy(humanoidRobots.name)
      .limit(limit);
  },
  slugOfRobot: (name: string) => slugify(name),
};

async function videoArticle(where: ReturnType<typeof sql>): Promise<ArticleLite | null> {
  const rows = rowsOf(
    await db.execute(sql`SELECT id::text AS id, title, url, extracted_metadata->'geminiAnalysis' AS ga FROM articles WHERE product_type = 'video' AND ${where} LIMIT 1`),
  );
  const r = rows[0];
  if (!r) return null;
  const ga = r.ga && typeof r.ga === 'object' ? (r.ga as Record<string, unknown>) : null;
  return { id: String(r.id), title: String(r.title ?? ''), url: String(r.url ?? ''), geminiAnalysis: ga };
}

// ─────────────────────────────────────────────────────────────────────────────
// 처리기
// ─────────────────────────────────────────────────────────────────────────────

async function saveArticle(item: SaveArticleItem): Promise<'inserted' | 'skipped'> {
  let companyId: string | null = null;
  if (item.companyHint) {
    const [c] = await db.select({ id: companies.id }).from(companies).where(sql`lower(${companies.name}) = lower(${item.companyHint})`).limit(1);
    companyId = c?.id ?? null;
  }
  const [row] = await db
    .insert(articles)
    .values({
      companyId,
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      summary: item.summary,
      language: item.language,
      category: item.category,
      productType: item.productType,
      contentHash: item.contentHash,
      extractedMetadata: item.extractedMetadata,
    })
    .onConflictDoNothing({ target: articles.contentHash })
    .returning({ id: articles.id });
  return row ? 'inserted' : 'skipped';
}

export function buildHandlers(env: Env = process.env): Record<string, RequestHandler> {
  const guardCtx = createGuardContext(env);
  const collector = createCollector();
  const estimates = resolveCostEstimates(env);
  return {
    add_source: createAddSourceHandler({
      youtube: createYoutubeClient(env),
      arxiv: createArxivClient(),
      fetchArticleMeta: (url) => fetchArticleMeta(url, { allowedHosts: () => allowedHosts(env), httpGet: httpGetLimited }),
      saveArticle,
      guardFields: (fields) => guardIngestFields(fields, guardCtx),
      allowedHosts: () => allowedHosts(env),
    }),
    analyze: createAnalyzeHandler({
      estimates,
      allowedHosts: () => allowedHosts(env),
      video: {
        isConfigured: () => videoContentAnalysisService.isConfigured(),
        analyzeSingle: async (id) => {
          const r = await videoContentAnalysisService.analyzeSingle(id);
          return r.ok ? { ok: true, analysis: r.analysis as unknown as Record<string, unknown> } : r;
        },
        findArticleById: (id) => videoArticle(sql`id = ${id}::uuid`),
        findArticleByVideoId: (vid) => videoArticle(sql`extracted_metadata->>'videoId' = ${vid}`),
      },
      specs: { isConfigured: () => specEnrichmentService.isConfigured(), enrichRobot: (id) => specEnrichmentService.enrichRobot(id) },
      catalog,
      topic: {
        isCacheFresh: (domain, days) => techTrendReportService.isInsightCacheFresh(domain as TechTrendDomain, days),
        getReport: async (domain, days) => {
          const r = await techTrendReportService.getReport(domain as TechTrendDomain, days);
          return {
            domain: r.domain,
            days: r.days,
            stats: r.stats,
            insight: r.insight ? { points: r.insight.points, cached: r.insight.cached } : null,
            videos: r.videos.map((v) => ({ title: v.title, url: v.url })),
            papers: r.papers.map((p) => ({ title: p.title, url: p.url })),
          };
        },
      },
    }),
    query: createQueryHandler({
      now: () => new Date(),
      collect: (areaId) => collector.collect(areaId),
      getActuatorMap: async () => {
        const m = await actuatorPositionMapService.getMap();
        return { robots: m.robots, suppliers: m.suppliers };
      },
      catalog: { findCompanyBySlug: catalog.findCompanyBySlug },
      recentArticles: async (companyId, since, limit) => {
        const rows = rowsOf(
          await db.execute(sql`
            SELECT title, url, source, product_type, to_char(COALESCE(published_at, collected_at), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS d
            FROM articles WHERE company_id = ${companyId}::uuid AND COALESCE(published_at, collected_at) >= ${since}
            ORDER BY COALESCE(published_at, collected_at) DESC LIMIT ${limit}`),
        );
        return rows.map((r) => ({
          kind: r.product_type === 'video' ? ('video' as const) : ('news' as const),
          title: String(r.title ?? ''),
          url: typeof r.url === 'string' ? r.url : null,
          source: typeof r.source === 'string' ? r.source : null,
          publishedAt: typeof r.d === 'string' ? r.d : null,
        }));
      },
      allowedHosts: () => allowedHosts(env),
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 락 · 폴러 · 인라인
// ─────────────────────────────────────────────────────────────────────────────

/** 세션 advisory lock — 잠금을 못 얻으면 null (다른 인스턴스가 처리 중) */
export async function withAdvisoryLock<T>(key: number, fn: () => Promise<T>): Promise<T | null> {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [key]);
    if (!r.rows[0]?.ok) return null;
    try {
      return await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [key]).catch(() => undefined);
    }
  } finally {
    client.release();
  }
}

let cachedDeps: ProcessorDeps | null = null;

export function getProcessorDeps(): ProcessorDeps {
  if (!cachedDeps) {
    cachedDeps = {
      store: getStore(),
      now: () => new Date(),
      env: process.env,
      handlers: buildHandlers(process.env),
      getClaudeMonth: async () => {
        const c = await aiUsageService.getClaudeCreditInfo();
        return { limitUsd: c.monthlyLimitUsd, usedUsd: c.currentMonthUsageUsd };
      },
      lock: (fn) => withAdvisoryLock(ARGOS_I_REQUESTS_LOCK_KEY, fn),
      log: (line) => console.log(line),
    };
  }
  return cachedDeps;
}

/** 스케줄러 태스크 본체 — ARGOS_I_REQUESTS_ENABLED 가 true 가 아니면 아무것도 하지 않는다 */
export async function runArgosIRequestsTask(): Promise<TickSummary> {
  if (!isArgosIRequestsEnabled()) return { outcome: 'disabled', processed: 0 };
  return runArgosIRequestsTick(getProcessorDeps());
}

/** query 요청 인라인 처리 (2초, 초과 시 queued 로 폴백) */
export async function runInlineQuery(row: RequestRow): Promise<RequestRow> {
  return runInline(row, getProcessorDeps());
}
