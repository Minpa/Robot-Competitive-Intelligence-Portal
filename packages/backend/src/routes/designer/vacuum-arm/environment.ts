/**
 * Environment catalog routes · REQ-6
 * /furniture /obstacles /target-objects /room-presets /scenarios
 */

import type { FastifyInstance } from 'fastify';
import { environmentService } from '../../../services/designer/vacuum-arm/index.js';

export async function environmentRoutes(fastify: FastifyInstance) {
  fastify.get('/furniture', async (_req, reply) => {
    return reply.send({
      furniture: environmentService.listFurniture(),
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
  fastify.get('/obstacles', async (_req, reply) => {
    return reply.send({
      obstacles: environmentService.listObstacles(),
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
  fastify.get('/target-objects', async (_req, reply) => {
    return reply.send({
      targetObjects: environmentService.listTargetObjects(),
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
  fastify.get('/room-presets', async (_req, reply) => {
    return reply.send({
      roomPresets: environmentService.listRoomPresets(),
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
  fastify.get('/scenarios', async (_req, reply) => {
    return reply.send({
      scenarios: environmentService.listScenarios(),
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
}
