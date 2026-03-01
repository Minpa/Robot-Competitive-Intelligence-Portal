import { FastifyInstance } from 'fastify';
import { executiveDashboardService } from '../services/executive-dashboard.service.js';
import { insightCardsGenerator } from '../services/insight-cards.service.js';
import { viewCacheService, VIEW_CACHE_CONFIGS } from '../services/view-cache.service.js';
import type { GlobalFilterParams } from '../services/executive-dashboard.service.js';

/**
 * Parse GlobalFilterParams from query string.
 * Supports: ?startDate=&endDate=&region=a,b&segment=c,d
 */
function parseFilters(query: Record<string, string | undefined>): GlobalFilterParams | undefined {
  const filters: GlobalFilterParams = {};
  if (query.startDate) filters.startDate = query.startDate;
  if (query.endDate) filters.endDate = query.endDate;
  if (query.region) filters.region = query.region.split(',').filter(Boolean);
  if (query.segment) filters.segment = query.segment.split(',').filter(Boolean);

  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Wrap response data with cache metadata from ViewCacheService result.
 */
function withCacheMeta<T>(data: T, isStale = false, cachedAt: Date | null = null): { data: T; isStale: boolean; cachedAt: string | null } {
  return {
    data,
    isStale,
    cachedAt: cachedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Helper: run a compute function through ViewCacheService and return with cache metadata.
 */
async function cachedResponse<T>(viewName: string, computeFn: () => Promise<T>) {
  const config = VIEW_CACHE_CONFIGS[viewName];
  if (!config) {
    // No cache config — compute directly
    const data = await computeFn();
    return withCacheMeta(data);
  }

  try {
    const result = await viewCacheService.getOrCompute(viewName, computeFn);
    return withCacheMeta(result.data, result.isStale, result.cachedAt);
  } catch {
    // ViewCacheService threw (non-cache fallback type + compute failed)
    // Re-throw so Fastify returns an error
    throw new Error(`Failed to load data for view "${viewName}"`);
  }
}

type FilterQuery = { Querystring: Record<string, string | undefined> };

export async function executiveRoutes(fastify: FastifyInstance) {
  // ── New endpoints ──────────────────────────────────────────────

  // GET /api/executive/overview — KPI cards + insights
  fastify.get<FilterQuery>('/overview', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('kpi-overview', async () => {
      const [heatmap, commercialization, regionalCompetition, topEvents, insightCards] =
        await Promise.all([
          executiveDashboardService.getSegmentHeatmap(filters),
          executiveDashboardService.getCommercializationAnalysis(filters),
          executiveDashboardService.getRegionalCompetition(filters),
          executiveDashboardService.getTopEvents('month', filters),
          insightCardsGenerator.generateCards(),
        ]);

      const totalRobots = heatmap.matrix.reduce((sum, cell) => sum + cell.robotCount, 0);

      return {
        kpiCards: {
          totalRobots,
          totalCompanies: commercialization.conversionRates.length,
          totalArticles: topEvents.events.length,
          regionalBreakdown: regionalCompetition,
        },
        insights: insightCards,
      };
    });
  });

  // GET /api/executive/segment-heatmap/:env/:locomotion/robots — cell drill-down (no cache)
  fastify.get<{
    Params: { env: string; locomotion: string };
    Querystring: Record<string, string | undefined>;
  }>('/segment-heatmap/:env/:locomotion/robots', async (req) => {
    const { env, locomotion } = req.params;
    const filters = parseFilters(req.query);
    const taskType = req.query.taskType;
    const data = await executiveDashboardService.getSegmentDrawerRobots(
      env,
      locomotion,
      taskType,
      filters,
    );
    return withCacheMeta(data);
  });

  // GET /api/executive/timeline-trend
  fastify.get<FilterQuery>('/timeline-trend', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('timeline-trend', () => executiveDashboardService.getTimelineTrend(filters));
  });

  // GET /api/executive/talent-product-scatter
  fastify.get<FilterQuery>('/talent-product-scatter', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('talent-product-scatter', () => executiveDashboardService.getTalentProductScatter(filters));
  });

  // GET /api/executive/market-forecast — alias for price-performance trend
  fastify.get<FilterQuery>('/market-forecast', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('market-forecast', () => executiveDashboardService.getPricePerformanceTrend(filters));
  });

  // GET /api/executive/regional-share — alias for regional competition
  fastify.get<FilterQuery>('/regional-share', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('regional-share', () => executiveDashboardService.getRegionalCompetition(filters));
  });

  // GET /api/executive/workforce-comparison — alias for player expansion
  fastify.get<FilterQuery>('/workforce-comparison', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('workforce-comparison', () => executiveDashboardService.getPlayerExpansion(undefined, filters));
  });

  // GET /api/executive/investment-flow — component trend
  fastify.get<FilterQuery>('/investment-flow', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('investment-flow', () => executiveDashboardService.getComponentTrend(filters));
  });

  // GET /api/executive/insight-hub — keyword position map
  fastify.get<FilterQuery>('/insight-hub', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('insight-hub', () => executiveDashboardService.getKeywordPositionMap(filters));
  });

  // ── Existing endpoints (updated with GlobalFilterParams + ViewCacheService) ───────

  fastify.get<FilterQuery>('/segment-heatmap', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('segment-heatmap', () => executiveDashboardService.getSegmentHeatmap(filters));
  });

  fastify.get<FilterQuery>('/commercialization', async (req) => {
    const filters = parseFilters(req.query);
    return withCacheMeta(await executiveDashboardService.getCommercializationAnalysis(filters));
  });

  fastify.get<{ Querystring: Record<string, string | undefined> }>('/player-expansion', async (req) => {
    const filters = parseFilters(req.query);
    const ids = req.query.companyIds?.split(',').filter(Boolean);
    return cachedResponse('player-expansion', () => executiveDashboardService.getPlayerExpansion(ids, filters));
  });

  fastify.get<FilterQuery>('/price-performance', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('market-forecast', () => executiveDashboardService.getPricePerformanceTrend(filters));
  });

  fastify.get<FilterQuery>('/component-trend', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('technology-radar', () => executiveDashboardService.getComponentTrend(filters));
  });

  fastify.get<FilterQuery>('/keyword-position', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('insight-hub', () => executiveDashboardService.getKeywordPositionMap(filters));
  });

  fastify.get<FilterQuery>('/industry-adoption', async (req) => {
    const filters = parseFilters(req.query);
    return withCacheMeta(await executiveDashboardService.getIndustryAdoption(filters));
  });

  fastify.get<FilterQuery>('/regional-competition', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('regional-share', () => executiveDashboardService.getRegionalCompetition(filters));
  });

  fastify.get<FilterQuery>('/tech-axis', async (req) => {
    const filters = parseFilters(req.query);
    return cachedResponse('technology-radar', () => executiveDashboardService.getTechAxis(filters));
  });

  fastify.get<{ Querystring: Record<string, string | undefined> }>('/top-events', async (req) => {
    const filters = parseFilters(req.query);
    const period = (req.query.period || 'month') as 'month' | 'quarter' | '6months';
    return cachedResponse('top-events', () => executiveDashboardService.getTopEvents(period, filters));
  });
}
