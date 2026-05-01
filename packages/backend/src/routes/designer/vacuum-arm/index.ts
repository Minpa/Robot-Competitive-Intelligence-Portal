import type { FastifyInstance } from 'fastify';
import { actuatorRoutes } from './actuators.js';
import { endEffectorRoutes } from './end-effectors.js';
import { analyzeRoutes } from './analyze.js';
import { environmentRoutes } from './environment.js';

/**
 * ARGOS-Designer · vacuum-arm routes (Phase 1 PoC v1.2).
 * Mounted under /api/designer/vacuum-arm in routes/designer/index.ts.
 *
 * REQ-1 ships: actuator catalog (reused from v1.0) + end-effector catalog.
 * Future REQs add: furniture, obstacles, target-objects, room-presets, scenarios,
 * analyze, review, projects, candidates, compare, revisions, spec-sheet.
 */
export async function vacuumArmRoutes(fastify: FastifyInstance) {
  fastify.register(actuatorRoutes, { prefix: '/actuators' });
  fastify.register(endEffectorRoutes, { prefix: '/end-effectors' });
  fastify.register(analyzeRoutes, { prefix: '/analyze' });
  fastify.register(environmentRoutes); // /furniture, /obstacles, /target-objects, /room-presets, /scenarios
}
