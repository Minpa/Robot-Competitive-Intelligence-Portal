import { FastifyInstance } from 'fastify';
import { executiveDashboardService } from '../services/executive-dashboard.service.js';

export async function executiveRoutes(fastify: FastifyInstance) {
  fastify.get('/segment-heatmap', async () => executiveDashboardService.getSegmentHeatmap());
  fastify.get('/commercialization', async () => executiveDashboardService.getCommercializationAnalysis());
  fastify.get<{ Querystring: { companyIds?: string } }>('/player-expansion', async (req) => {
    const ids = req.query.companyIds?.split(',').filter(Boolean);
    return executiveDashboardService.getPlayerExpansion(ids);
  });
  fastify.get('/price-performance', async () => executiveDashboardService.getPricePerformanceTrend());
  fastify.get('/component-trend', async () => executiveDashboardService.getComponentTrend());
  fastify.get('/keyword-position', async () => executiveDashboardService.getKeywordPositionMap());
  fastify.get('/industry-adoption', async () => executiveDashboardService.getIndustryAdoption());
  fastify.get('/regional-competition', async () => executiveDashboardService.getRegionalCompetition());
  fastify.get('/tech-axis', async () => executiveDashboardService.getTechAxis());
  fastify.get<{ Querystring: { period?: string } }>('/top-events', async (req) => {
    const period = (req.query.period || 'month') as 'month' | 'quarter' | '6months';
    return executiveDashboardService.getTopEvents(period);
  });
}
