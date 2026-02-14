import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { workforceService } from '../services/index.js';

export async function workforceRoutes(fastify: FastifyInstance) {
  // Get workforce data for a company
  fastify.get('/company/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const data = await workforceService.getWorkforceData(companyId);
      return data;
    } catch (error) {
      console.error('Error getting workforce data:', error);
      reply.status(500).send({ error: 'Failed to get workforce data' });
    }
  });

  // Upsert workforce data
  fastify.put('/company/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const data = await workforceService.upsertWorkforceData(companyId, {
        companyId,
        ...(request.body as any),
      });
      return data;
    } catch (error) {
      console.error('Error updating workforce data:', error);
      reply.status(500).send({ error: 'Failed to update workforce data' });
    }
  });

  // Get talent trend for a company
  fastify.get('/company/:companyId/trend', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const query = request.query as Record<string, string>;
      const years = Number(query.years) || 5;
      const trend = await workforceService.getTalentTrend(companyId, years);
      return trend;
    } catch (error) {
      console.error('Error getting talent trend:', error);
      reply.status(500).send({ error: 'Failed to get talent trend' });
    }
  });

  // Add talent trend entry
  fastify.post('/company/:companyId/trend', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const entry = await workforceService.addTalentTrendEntry(companyId, request.body as any);
      reply.status(201).send(entry);
    } catch (error) {
      console.error('Error adding talent trend entry:', error);
      reply.status(500).send({ error: 'Failed to add talent trend entry' });
    }
  });

  // Get job distribution for a company
  fastify.get('/company/:companyId/job-distribution', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const distribution = await workforceService.getJobDistribution(companyId);
      return distribution;
    } catch (error) {
      console.error('Error getting job distribution:', error);
      reply.status(500).send({ error: 'Failed to get job distribution' });
    }
  });

  // Compare workforce across companies
  fastify.post('/compare', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyIds } = request.body as { companyIds: string[] };
      if (!companyIds || !Array.isArray(companyIds)) {
        return reply.status(400).send({ error: 'companyIds array is required' });
      }
      const comparison = await workforceService.compareWorkforce(companyIds);
      return comparison;
    } catch (error) {
      console.error('Error comparing workforce:', error);
      reply.status(500).send({ error: 'Failed to compare workforce' });
    }
  });

  // Get top N companies by workforce
  fastify.get('/top', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Number(query.limit) || 10;
      const top = await workforceService.getTopNByWorkforce(limit);
      return top;
    } catch (error) {
      console.error('Error getting top workforce:', error);
      reply.status(500).send({ error: 'Failed to get top workforce' });
    }
  });

  // Get workforce by segment
  fastify.get('/by-segment', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bySegment = await workforceService.getWorkforceBySegment();
      return bySegment;
    } catch (error) {
      console.error('Error getting workforce by segment:', error);
      reply.status(500).send({ error: 'Failed to get workforce by segment' });
    }
  });

  // Get aggregated job distribution
  fastify.get('/job-distribution/aggregated', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const distribution = await workforceService.getAggregatedJobDistribution();
      return distribution;
    } catch (error) {
      console.error('Error getting aggregated job distribution:', error);
      reply.status(500).send({ error: 'Failed to get aggregated job distribution' });
    }
  });
}
