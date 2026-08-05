import { FastifyInstance } from 'fastify';
import { videoDbSyncService } from '../services/video-db-sync.service.js';
import { specEnrichmentService } from '../services/spec-enrichment.service.js';
import { applicationCaseExtractionService } from '../services/application-case-extraction.service.js';
import { videoContentAnalysisService } from '../services/video-content-analysis.service.js';
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

  // 스펙 자동 보강 수동 실행
  fastify.post('/enrich-specs', { preHandler: adminOnly }, async () => {
    return specEnrichmentService.run();
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

  // ── 적용 사례 후보큐 ──
  fastify.get('/app-case-candidates', { preHandler: adminOrAnalyst }, async () => {
    return applicationCaseExtractionService.listCandidates();
  });
  fastify.post('/extract-app-cases', { preHandler: adminOnly }, async () => {
    return applicationCaseExtractionService.run();
  });
  fastify.post<{ Params: { id: string } }>(
    '/app-case-candidates/:id/approve',
    { preHandler: adminOnly },
    async (request, reply) => {
      const r = await applicationCaseExtractionService.approve(request.params.id);
      if ('error' in r) {
        reply.status(400).send(r);
        return;
      }
      return r;
    }
  );
  fastify.post<{ Params: { id: string } }>(
    '/app-case-candidates/:id/reject',
    { preHandler: adminOnly },
    async (request) => {
      return applicationCaseExtractionService.reject(request.params.id);
    }
  );

  // ── 영상 내용 상세 분석 (Gemini) ──
  fastify.post<{ Params: { id: string } }>(
    '/analyze-video/:id',
    { preHandler: adminOnly },
    async (request, reply) => {
      const result = await videoContentAnalysisService.analyzeSingle(request.params.id);
      if (!result.ok) {
        reply.status(400).send(result);
        return;
      }
      return result;
    }
  );
  fastify.post<{ Body: { limit?: number } }>(
    '/analyze-videos',
    { preHandler: adminOnly },
    async (request) => {
      return videoContentAnalysisService.run(request.body?.limit);
    }
  );
}
