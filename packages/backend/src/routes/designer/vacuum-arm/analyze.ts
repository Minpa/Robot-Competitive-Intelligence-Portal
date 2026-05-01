/**
 * Analyze route · vacuum-arm REQ-4 (REQ-5/REQ-7 to extend)
 *
 * Spec §5.1 — POST /api/designer/vacuum-arm/analyze
 *   Request: { product, room?, payloadKg }
 *   Response: AnalysisResult (workspace + statics; ZMP and reachability
 *             land in REQ-5/REQ-7 commits).
 */

import type { FastifyInstance } from 'fastify';
import {
  endEffectorService,
  kinematicsService,
} from '../../../services/designer/vacuum-arm/index.js';
import {
  staticsService,
  payloadReachCurve,
} from '../../../services/designer/vacuum-arm/statics.service.js';
import { computeStaticZmp } from '../../../services/designer/vacuum-arm/stability.service.js';
import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  ProductConfig,
} from '../../../services/designer/vacuum-arm/index.js';

interface AnalyzeBody {
  product: ProductConfig;
  payloadKg?: number;
}

export async function analyzeRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: AnalyzeBody }>('/', async (request, reply) => {
    const { product, payloadKg = 0 } = request.body ?? ({} as AnalyzeBody);
    if (!product || !product.base) {
      return reply.code(400).send({ error: 'product.base is required' });
    }

    const armResults = product.arms.map((arm, armIndex) => {
      const ee = endEffectorService.getBySku(arm.endEffectorSku);
      const eeMass = ee ? ee.weightG / 1000 : 0;
      const envelope = kinematicsService.computeEnvelope(arm, product.base);
      const statics = staticsService.evaluateArm(arm, payloadKg, eeMass, armIndex);
      const curve = payloadReachCurve(arm, eeMass);
      const ee_constraint_kg = ee ? ee.maxPayloadKg : Infinity;
      const overEEPayload = ee ? payloadKg > ee.maxPayloadKg : false;
      return {
        armIndex,
        envelope,
        statics,
        payloadCurve: curve,
        endEffector: ee
          ? {
              sku: ee.sku,
              name: ee.name,
              type: ee.type,
              maxPayloadKg: ee.maxPayloadKg,
              weightG: ee.weightG,
            }
          : null,
        endEffectorPayloadOverLimit: overEEPayload,
        endEffectorMaxPayloadKg: ee_constraint_kg,
      };
    });

    // REQ-5: ZMP at worst-case pose (arms fully extended horizontally)
    const stability = computeStaticZmp(product.base, product.arms, payloadKg);

    return reply.send({
      base: product.base,
      armCount: product.arms.length,
      payloadKg,
      arms: armResults,
      stability,
      isMock: true,
      generatedAt: new Date().toISOString(),
    });
  });
}
