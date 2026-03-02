/**
 * Scoring Pipeline Routes
 *
 * POST /run          — Admin: trigger full robot recalculation
 * POST /run/:robotId — Admin: trigger single robot recalculation
 * GET  /status       — Admin: last pipeline run status
 * GET  /rubric/poc   — Authenticated: PoC rubric definition
 * GET  /rubric/rfm   — Authenticated: RFM rubric definition
 * GET  /rubric/positioning — Authenticated: Positioning rubric definition
 *
 * Requirements: 4.20, 4.21, 6.33, 6.34, 6.35, 6.36
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, requireRole } from './auth.js';
import { scoringPipelineService } from '../services/scoring-pipeline.service.js';
import { getPocRubric, getRfmRubric, getPositioningRubric } from '../services/scoring/rubric-provider.js';

export async function scoringPipelineRoutes(fastify: FastifyInstance) {
  // POST /run — Authenticated: trigger full robot recalculation
  fastify.post('/run', { preHandler: authMiddleware }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await scoringPipelineService.runFullPipeline('admin_manual');
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'Scoring pipeline is already running') {
        reply.status(409).send({ error: 'Scoring pipeline is already running' });
        return;
      }
      console.error('Scoring pipeline run error:', error);
      reply.status(500).send({ error: 'Failed to run scoring pipeline' });
    }
  });

  // POST /run/:robotId — Authenticated: trigger single robot recalculation
  fastify.post('/run/:robotId', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { robotId } = request.params as { robotId: string };
      const result = await scoringPipelineService.runForRobot(robotId, 'admin_manual');
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'Scoring pipeline is already running') {
        reply.status(409).send({ error: 'Scoring pipeline is already running' });
        return;
      }
      console.error('Scoring pipeline run error:', error);
      reply.status(500).send({ error: 'Failed to run scoring pipeline' });
    }
  });

  // GET /status — Authenticated: last pipeline run status
  fastify.get('/status', { preHandler: authMiddleware }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await scoringPipelineService.getLastRunStatus();
      return status ?? { status: 'no_runs', message: 'No pipeline runs found' };
    } catch (error) {
      console.error('Scoring pipeline status error:', error);
      reply.status(500).send({ error: 'Failed to get pipeline status' });
    }
  });

  // GET /rubric/poc — Authenticated users, returns PoC rubric
  fastify.get('/rubric/poc', { preHandler: authMiddleware }, async () => {
    return getPocRubric();
  });

  // GET /rubric/rfm — Authenticated users, returns RFM rubric
  fastify.get('/rubric/rfm', { preHandler: authMiddleware }, async () => {
    return getRfmRubric();
  });

  // GET /rubric/positioning — Authenticated users, returns positioning rubric
  fastify.get('/rubric/positioning', { preHandler: authMiddleware }, async () => {
    return getPositioningRubric();
  });
}
