/**
 * Vacuum-arm actuator catalog · v1.2
 *
 * Reuses the v1.0 actuator catalog (services/designer/mock-data/actuators) — the
 * physical actuator specs are the same regardless of robot form factor. The
 * vacuum-arm namespace gets its own route so the API surface is self-contained
 * (consumers don't need to know about v1.0 at all).
 */

import type { FastifyInstance } from 'fastify';
import { actuatorService } from '../../../services/designer/index.js';
import type { ActuatorSpec } from '../../../services/designer/index.js';

export async function actuatorRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { type?: ActuatorSpec['type']; min_torque?: string; max_weight?: string } }>(
    '/',
    async (request, reply) => {
      const { type, min_torque, max_weight } = request.query;
      const actuators = actuatorService.list({
        type,
        minTorque: min_torque ? Number(min_torque) : undefined,
        maxWeight: max_weight ? Number(max_weight) : undefined,
      });
      return reply.send({
        actuators,
        isMock: true,
        generatedAt: new Date().toISOString(),
      });
    }
  );

  fastify.get<{ Params: { sku: string } }>('/:sku', async (request, reply) => {
    const actuator = actuatorService.getBySku(request.params.sku);
    if (!actuator) return reply.code(404).send({ error: 'actuator not found' });
    return reply.send({ actuator, isMock: true });
  });
}
