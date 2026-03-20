import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, requireRole } from './auth.js';
import { visionCostService, VisionCostServiceError } from '../services/vision-cost.service.js';

function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof VisionCostServiceError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    reply.status(status).send({ error: { code: error.code, message: error.message } });
    return;
  }
  console.error('Vision cost route error:', error);
  reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' } });
}

export async function visionCostRoutes(fastify: FastifyInstance) {
  // GET /bom-parts — BOM 부품 단가 기준표
  fastify.get('/bom-parts', { preHandler: authMiddleware }, async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await visionCostService.getBomParts();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // GET /robot-costs — 로봇별 비전 원가 타임라인 전체
  fastify.get('/robot-costs', { preHandler: authMiddleware }, async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await visionCostService.getRobotCosts();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // GET /bubble-chart — 버블 차트용 요약 데이터
  fastify.get('/bubble-chart', { preHandler: authMiddleware }, async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await visionCostService.getBubbleChartData();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // POST /robot-costs — Admin: 레코드 추가
  fastify.post('/robot-costs', { preHandler: requireRole('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = req.body as any;
      const result = await visionCostService.createRobotCost(data);
      reply.status(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  // PUT /robot-costs/:id — Admin: 레코드 수정
  fastify.put('/robot-costs/:id', { preHandler: requireRole('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = req.params as { id: string };
      const data = req.body as any;
      return await visionCostService.updateRobotCost(id, data);
    } catch (error) {
      handleError(error, reply);
    }
  });

  // DELETE /robot-costs/:id — Admin: 레코드 삭제
  fastify.delete('/robot-costs/:id', { preHandler: requireRole('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = req.params as { id: string };
      await visionCostService.deleteRobotCost(id);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // POST /bom-parts — Admin: BOM 부품 추가
  fastify.post('/bom-parts', { preHandler: requireRole('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = req.body as any;
      const result = await visionCostService.createBomPart(data);
      reply.status(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
