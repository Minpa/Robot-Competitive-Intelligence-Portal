import { FastifyInstance } from 'fastify';
import { videoDbSyncService } from '../services/video-db-sync.service.js';
import { authMiddleware, requireRole } from './auth.js';

const adminOrAnalyst = [authMiddleware, requireRole('admin', 'analyst')];
const adminOnly = [authMiddleware, requireRole('admin')];

export async function videoSyncRoutes(fastify: FastifyInstance) {
  // 로봇 후보큐 조회
  fastify.get('/robot-candidates', { preHandler: adminOrAnalyst }, async () => {
    return videoDbSyncService.listRobotCandidates();
  });

  // 연동 수동 실행
  fastify.post('/run', { preHandler: adminOnly }, async () => {
    return videoDbSyncService.run();
  });

  // 후보 승인 → 카탈로그 승격
  fastify.post<{
    Params: { id: string };
    Body: { announcementYear?: number; commercializationStage?: string; region?: string };
  }>('/robot-candidates/:id/approve', { preHandler: adminOnly }, async (request, reply) => {
    const result = await videoDbSyncService.approveRobotCandidate(request.params.id, request.body ?? {});
    if ('error' in result) {
      reply.status(400).send(result);
      return;
    }
    return result;
  });

  // 후보 반려
  fastify.post<{ Params: { id: string } }>(
    '/robot-candidates/:id/reject',
    { preHandler: adminOnly },
    async (request) => {
      return videoDbSyncService.rejectRobotCandidate(request.params.id);
    }
  );
}
