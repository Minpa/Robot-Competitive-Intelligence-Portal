import { FastifyInstance } from 'fastify';
import { videoDbSyncService } from '../services/video-db-sync.service.js';
import { specEnrichmentService } from '../services/spec-enrichment.service.js';
import { applicationCaseExtractionService } from '../services/application-case-extraction.service.js';
import { videoContentAnalysisService } from '../services/video-content-analysis.service.js';
import { eventVideoBriefService } from '../services/event-video-brief.service.js';
import { eventVideoPptService } from '../services/event-video-ppt.service.js';
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

  // Gemini 상세 분석 완료된 영상 목록 (트렌드 페이지 노출용) — 읽기 전용이라 로그인 사용자 전체 허용
  fastify.get('/analyzed-videos', { preHandler: authMiddleware }, async () => {
    return videoContentAnalysisService.listAnalyzed(30);
  });

  // ── 이벤트 특집 영상 브리프 (예: WRC 2026) ──
  fastify.get<{ Params: { eventKey: string } }>(
    '/event-videos/:eventKey',
    { preHandler: authMiddleware },
    async (request) => {
      return eventVideoBriefService.listEventVideos(request.params.eventKey);
    }
  );
  fastify.post<{ Body: { eventKey?: string; limit?: number } }>(
    '/brief-event-videos',
    { preHandler: adminOnly },
    async (request) => {
      return eventVideoBriefService.run(request.body?.eventKey, request.body?.limit);
    }
  );
  fastify.post<{ Params: { id: string }; Body: { eventKey?: string } }>(
    '/event-videos/:id/brief',
    { preHandler: adminOnly },
    async (request, reply) => {
      const r = await eventVideoBriefService.briefSingle(request.params.id, request.body?.eventKey);
      if (!r.ok) {
        reply.status(400).send(r);
        return;
      }
      return r;
    }
  );
  fastify.get<{ Params: { eventKey: string } }>(
    '/event-videos/:eventKey/trend-summary',
    { preHandler: authMiddleware },
    async (request) => {
      const summary = await eventVideoBriefService.getTrendSummary(request.params.eventKey);
      return { summary };
    }
  );

  // 이벤트 영상 리스트 PPT 다운로드 (Analyst + Admin only)
  fastify.post<{ Params: { eventKey: string } }>(
    '/event-videos/:eventKey/export-ppt',
    { preHandler: adminOrAnalyst },
    async (request, reply) => {
      const buffer = await eventVideoPptService.generate(request.params.eventKey);
      if (!buffer) {
        reply.status(404).send({ error: 'Unknown event' });
        return;
      }
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      reply.header('Content-Disposition', 'attachment; filename="wrc2026-videos.pptx"');
      return reply.send(buffer);
    }
  );
}
