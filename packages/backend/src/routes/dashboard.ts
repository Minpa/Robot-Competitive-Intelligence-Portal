import type { FastifyInstance } from 'fastify';
import { dashboardService } from '../services/dashboard.service.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard summary
  fastify.get('/summary', async () => {
    return dashboardService.getSummary();
  });

  // Get weekly highlights
  fastify.get('/highlights', async (request) => {
    const { limit } = request.query as { limit?: string };
    return dashboardService.getWeeklyHighlights(limit ? parseInt(limit) : 5);
  });

  // Get timeline
  fastify.get('/timeline', async (request) => {
    const query = request.query as Record<string, string>;
    return dashboardService.getTimeline({
      startDate: query.startDate,
      endDate: query.endDate,
      companyId: query.companyId,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  });

  // Get article chart data
  fastify.get('/charts/articles', async (request) => {
    const query = request.query as Record<string, string>;
    return dashboardService.getArticleChartData({
      period: (query.period as 'week' | 'month') || 'week',
      weeks: query.weeks ? parseInt(query.weeks) : 12,
    });
  });

  // Get product type chart data
  fastify.get('/charts/product-types', async () => {
    return dashboardService.getProductTypeChartData();
  });

  // Get company country chart data
  fastify.get('/charts/company-countries', async () => {
    return dashboardService.getCompanyCountryChartData();
  });
}
