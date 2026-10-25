import type { FastifyInstance } from 'fastify';
import { actuatorPositionMapService } from '../services/actuator-position-map.service.js';

/**
 * GET /api/actuator-map — 액추에이터 관점 경쟁사 포지션·공급망 맵 데이터 (읽기 전용, 인증 불필요).
 * 쿼리 파라미터 없음. 서버 캐시 10분.
 */
export async function actuatorMapRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    try {
      return await actuatorPositionMapService.getMap();
    } catch (err) {
      console.error('[actuator-map] failed:', err);
      return reply.status(500).send({ error: 'Failed to build actuator position map' });
    }
  });
}
