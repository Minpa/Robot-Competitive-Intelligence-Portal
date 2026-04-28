import type { FastifyInstance } from 'fastify';
import { actuatorService, evaluationService } from '../../services/designer/index.js';
import type { ActuatorSpec, EvaluationRequest } from '../../services/designer/index.js';

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
      return reply.send({ actuators, isMock: true });
    }
  );

  fastify.post<{ Body: EvaluationRequest & { topN?: number; safetyFactor?: number } }>(
    '/recommend',
    async (request, reply) => {
      const body = request.body;
      if (!body || !body.formFactorId) {
        return reply.code(400).send({ error: 'formFactorId required' });
      }
      try {
        const evaluation = evaluationService.evaluate(body);
        const recommendations = actuatorService.recommendForJoints(evaluation.jointTorques, {
          topN: body.topN,
          safetyFactor: body.safetyFactor,
        });
        return reply.send({ recommendations, evaluation, isMock: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'recommendation failed';
        return reply.code(400).send({ error: msg });
      }
    }
  );
}
