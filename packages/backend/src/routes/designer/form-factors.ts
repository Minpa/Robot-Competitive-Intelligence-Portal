import type { FastifyInstance } from 'fastify';
import { formFactorService } from '../../services/designer/index.js';

/**
 * REQ-1: GET /api/designer/form-factors
 *
 * Returns all 5 form factors with their skeleton primitives. Response time
 * SLO: < 200 ms (spec acceptance criteria). Source: in-memory mock catalog.
 */
export async function formFactorRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const payload = formFactorService.list();
    return reply.send(payload);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    if (!formFactorService.hasId(id)) {
      return reply.code(404).send({ error: 'form_factor_not_found', id });
    }
    const formFactor = formFactorService.getById(id);
    return reply.send({ formFactor, isMock: true });
  });
}
