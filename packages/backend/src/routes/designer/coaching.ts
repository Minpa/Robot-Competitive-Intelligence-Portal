import type { FastifyInstance } from 'fastify';
import { coachingService, evaluationService } from '../../services/designer/index.js';
import type { EvaluationRequest } from '../../services/designer/index.js';

export async function coachingRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: EvaluationRequest & { language?: string } }>('/', async (request, reply) => {
    const body = request.body;
    if (!body || !body.formFactorId) {
      return reply.code(400).send({ error: 'formFactorId required' });
    }
    try {
      const evaluation = evaluationService.evaluate(body);
      const coaching = await coachingService.coach(evaluation, body.language ?? 'ko');
      return reply.send({ coaching, evaluation, isMock: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'coaching failed';
      return reply.code(400).send({ error: msg });
    }
  });
}
