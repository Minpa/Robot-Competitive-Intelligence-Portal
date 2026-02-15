import type { FastifyInstance } from 'fastify';
import { dashboardService } from '../services/dashboard.service.js';
import { insightGeneratorService } from '../services/insight-generator.service.js';

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

  // Get enhanced weekly highlights (Task 10.7)
  fastify.get('/weekly-highlights', async (request) => {
    const { limit } = request.query as { limit?: string };
    return dashboardService.getEnhancedWeeklyHighlights(limit ? parseInt(limit) : 5);
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

  // Get product release timeline
  fastify.get('/product-timeline', async (request) => {
    const query = request.query as Record<string, string>;
    return dashboardService.getProductReleaseTimeline({
      months: query.months ? parseInt(query.months) : 12,
      type: query.type,
    });
  });

  // Get RFM timeline
  fastify.get('/rfm-timeline', async () => {
    return dashboardService.getRfmTimeline();
  });

  // Get Actuator timeline
  fastify.get('/actuator-timeline', async () => {
    return dashboardService.getActuatorTimeline();
  });

  // Get SoC timeline
  fastify.get('/soc-timeline', async () => {
    return dashboardService.getSocTimeline();
  });

  // ============================================
  // Segment Analysis (Task 10.1)
  // ============================================

  // Get segment matrix (locomotion x purpose)
  fastify.get('/segment-matrix', async () => {
    return dashboardService.getSegmentMatrix();
  });

  // Get hand type distribution
  fastify.get('/hand-distribution', async () => {
    return dashboardService.getHandTypeDistribution();
  });

  // Get robot summary
  fastify.get('/robot-summary', async () => {
    return dashboardService.getRobotSummary();
  });

  // ============================================
  // Workforce Analysis (Task 10.3)
  // ============================================

  // Get workforce by segment
  fastify.get('/workforce-by-segment', async () => {
    return dashboardService.getWorkforceBySegment();
  });

  // Get top N players by workforce
  fastify.get('/top-players-workforce', async (request) => {
    const { limit } = request.query as { limit?: string };
    return dashboardService.getTopNPlayersWorkforce(limit ? parseInt(limit) : 10);
  });

  // Get job distribution
  fastify.get('/job-distribution', async () => {
    return dashboardService.getJobDistribution();
  });

  // ============================================
  // Application Case Analysis (Task 10.5)
  // ============================================

  // Get environment-task matrix
  fastify.get('/environment-task-matrix', async () => {
    return dashboardService.getEnvironmentTaskMatrix();
  });

  // Get deployment status distribution
  fastify.get('/deployment-status', async () => {
    return dashboardService.getDeploymentStatusDistribution();
  });

  // Get demo timeline
  fastify.get('/demo-timeline', async (request) => {
    const query = request.query as Record<string, string>;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    return dashboardService.getDemoTimeline(startDate, endDate);
  });

  // ============================================
  // Executive Insight & Advanced Analytics
  // ============================================

  // Generate LLM-based executive insight
  fastify.get('/executive-insight', async (request) => {
    const query = request.query as Record<string, string>;
    const days = query.days ? parseInt(query.days) : 7;
    const model = (query.model as 'gpt-4o' | 'claude') || 'gpt-4o';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return insightGeneratorService.generateWeeklyInsight(startDate, endDate, model);
  });

  // Get timeline trend data (monthly events/products)
  fastify.get('/timeline-trend', async (request) => {
    const query = request.query as Record<string, string>;
    const months = query.months ? parseInt(query.months) : 12;
    const segment = query.segment || undefined;

    return insightGeneratorService.getTimelineTrendData(months, segment);
  });

  // Get company scatter data (talent vs products)
  fastify.get('/company-scatter', async () => {
    return insightGeneratorService.getCompanyScatterData();
  });

  // Get segment detail (for drawer)
  fastify.get('/segment-detail', async (request) => {
    const query = request.query as Record<string, string>;
    const { locomotion, purpose } = query;

    if (!locomotion || !purpose) {
      throw new Error('locomotion and purpose are required');
    }

    return insightGeneratorService.getSegmentDetail(locomotion, purpose);
  });
}
