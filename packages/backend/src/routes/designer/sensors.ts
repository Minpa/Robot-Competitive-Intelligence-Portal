import type { FastifyInstance } from 'fastify';
import { sensorService } from '../../services/designer/index.js';
import type { SensorType } from '../../services/designer/index.js';

export async function sensorRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { type?: SensorType; min_fov?: string } }>('/', async (request, reply) => {
    const { type, min_fov } = request.query;
    const minFovDeg = min_fov ? Number(min_fov) : undefined;
    const sensors = sensorService.list({ type, minFovDeg });
    return reply.send({ sensors, isMock: true });
  });
}
