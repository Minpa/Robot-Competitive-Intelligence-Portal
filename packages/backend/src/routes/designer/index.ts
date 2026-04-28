import type { FastifyInstance } from 'fastify';
import { formFactorRoutes } from './form-factors.js';
import { sensorRoutes } from './sensors.js';
import { evaluationRoutes } from './evaluations.js';
import { actuatorRoutes } from './actuators.js';
import { coachingRoutes } from './coaching.js';

/**
 * ARGOS-Designer routes — registered under /api/designer in routes/index.ts.
 * Sub-routes are mounted as plugins so each REQ owns its own path.
 */
export async function designerRoutes(fastify: FastifyInstance) {
  fastify.register(formFactorRoutes, { prefix: '/form-factors' });
  fastify.register(sensorRoutes, { prefix: '/sensors' });
  fastify.register(evaluationRoutes, { prefix: '/evaluate' });
  fastify.register(actuatorRoutes, { prefix: '/actuators' });
  fastify.register(coachingRoutes, { prefix: '/coach' });
}
