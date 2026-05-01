import type { FastifyInstance } from 'fastify';
import { actuatorRoutes } from './actuators.js';
import { endEffectorRoutes } from './end-effectors.js';
import { analyzeRoutes } from './analyze.js';
import { environmentRoutes } from './environment.js';
import { reviewRoutes } from './review.js';
import { specSheetRoutes } from './spec-sheet.js';

/**
 * ARGOS-Designer · vacuum-arm routes (Phase 1 PoC v1.2).
 * Mounted under /api/designer/vacuum-arm in routes/designer/index.ts.
 */
export async function vacuumArmRoutes(fastify: FastifyInstance) {
  fastify.register(actuatorRoutes, { prefix: '/actuators' });
  fastify.register(endEffectorRoutes, { prefix: '/end-effectors' });
  fastify.register(analyzeRoutes, { prefix: '/analyze' });
  fastify.register(reviewRoutes, { prefix: '/review' });
  fastify.register(specSheetRoutes, { prefix: '/spec-sheet' });
  fastify.register(environmentRoutes); // /furniture, /obstacles, /target-objects, /room-presets, /scenarios
}
