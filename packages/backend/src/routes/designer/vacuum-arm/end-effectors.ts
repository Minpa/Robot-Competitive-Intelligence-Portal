import type { FastifyInstance } from 'fastify';
import { endEffectorService } from '../../../services/designer/vacuum-arm/index.js';
import type { EndEffectorSpec } from '../../../services/designer/vacuum-arm/index.js';

export async function endEffectorRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { type?: EndEffectorSpec['type']; min_payload?: string } }>(
    '/',
    async (request, reply) => {
      const { type, min_payload } = request.query;
      const endEffectors = endEffectorService.list({
        type,
        minPayloadKg: min_payload ? Number(min_payload) : undefined,
      });
      return reply.send({
        endEffectors,
        isMock: true,
        generatedAt: new Date().toISOString(),
      });
    }
  );

  fastify.get<{ Params: { sku: string } }>('/:sku', async (request, reply) => {
    const ee = endEffectorService.getBySku(request.params.sku);
    if (!ee) return reply.code(404).send({ error: 'end-effector not found' });
    return reply.send({ endEffector: ee, isMock: true });
  });
}
