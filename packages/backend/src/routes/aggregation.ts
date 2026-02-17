import { FastifyInstance } from 'fastify';
import { aggregationService } from '../services/aggregation.service.js';

export async function aggregationRoutes(fastify: FastifyInstance) {
  fastify.get('/segment', async () => {
    return aggregationService.getSegmentAggregation();
  });

  fastify.get('/yearly', async () => {
    return aggregationService.getYearlyAggregation();
  });

  fastify.get('/component', async () => {
    return aggregationService.getComponentAggregation();
  });

  fastify.get<{ Querystring: { period?: string } }>('/keyword', async (request) => {
    const period = (request.query.period === 'week' ? 'week' : 'month') as 'week' | 'month';
    return aggregationService.getKeywordAggregation(period);
  });
}
