import type { FastifyInstance } from 'fastify';
import { evaluationService } from '../../services/designer/index.js';
import type { EvaluationRequest } from '../../services/designer/index.js';

export async function evaluationRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: EvaluationRequest }>('/', async (request, reply) => {
    const body = request.body;
    if (!body || !body.formFactorId) {
      return reply.code(400).send({ error: 'formFactorId required' });
    }
    try {
      const result = evaluationService.evaluate(body);
      return reply.send(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'evaluation failed';
      return reply.code(400).send({ error: msg });
    }
  });
}
