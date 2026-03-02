import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, requireRole } from './auth.js';
import { humanoidTrendService, ServiceError } from '../services/humanoid-trend.service.js';

function mapServiceErrorToStatus(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_REFERENCE':
      return 400;
    case 'NOT_FOUND':
      return 404;
    default:
      return 500;
  }
}

function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof ServiceError) {
    reply.status(mapServiceErrorToStatus(error.code)).send({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }
  console.error('Humanoid trend route error:', error);
  reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
  });
}

export async function humanoidTrendRoutes(fastify: FastifyInstance) {
  // GET /poc-scores — authenticated users, returns all PoC scores
  fastify.get('/poc-scores', { preHandler: authMiddleware }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await humanoidTrendService.getPocScores();
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  // GET /rfm-scores — authenticated users, returns all RFM scores
  fastify.get('/rfm-scores', { preHandler: authMiddleware }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await humanoidTrendService.getRfmScores();
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  // GET /positioning/:chartType — authenticated users, positioning data by chart type
  fastify.get('/positioning/:chartType', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { chartType } = request.params as { chartType: string };
      const result = await humanoidTrendService.getPositioningData(chartType);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  // GET /bar-specs — authenticated users, bar chart aggregated data
  fastify.get('/bar-specs', { preHandler: authMiddleware }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await humanoidTrendService.getBarSpecs();
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  // ── Admin CRUD: PoC Scores ──

  fastify.post('/poc-scores', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as {
        robotId: string;
        payloadScore: number;
        operationTimeScore: number;
        fingerDofScore: number;
        formFactorScore: number;
        pocDeploymentScore: number;
        costEfficiencyScore: number;
      };
      const result = await humanoidTrendService.createPocScore(data);
      reply.status(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.put('/poc-scores/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as Partial<{
        robotId: string;
        payloadScore: number;
        operationTimeScore: number;
        fingerDofScore: number;
        formFactorScore: number;
        pocDeploymentScore: number;
        costEfficiencyScore: number;
      }>;
      const result = await humanoidTrendService.updatePocScore(id, data);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.delete('/poc-scores/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await humanoidTrendService.deletePocScore(id);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // ── Admin CRUD: RFM Scores ──

  fastify.post('/rfm-scores', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as {
        robotId: string;
        rfmModelName: string;
        generalityScore: number;
        realWorldDataScore: number;
        edgeInferenceScore: number;
        multiRobotCollabScore: number;
        openSourceScore: number;
        commercialMaturityScore: number;
      };
      const result = await humanoidTrendService.createRfmScore(data);
      reply.status(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.put('/rfm-scores/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as Partial<{
        robotId: string;
        rfmModelName: string;
        generalityScore: number;
        realWorldDataScore: number;
        edgeInferenceScore: number;
        multiRobotCollabScore: number;
        openSourceScore: number;
        commercialMaturityScore: number;
      }>;
      const result = await humanoidTrendService.updateRfmScore(id, data);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.delete('/rfm-scores/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await humanoidTrendService.deleteRfmScore(id);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // ── Admin CRUD: Positioning Data ──

  fastify.post('/positioning', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as {
        chartType: string;
        robotId?: string;
        label: string;
        xValue: number;
        yValue: number;
        bubbleSize: number;
        colorGroup?: string;
        metadata?: Record<string, unknown>;
      };
      const result = await humanoidTrendService.createPositioningData(data);
      reply.status(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.put('/positioning/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as Partial<{
        chartType: string;
        robotId?: string;
        label: string;
        xValue: number;
        yValue: number;
        bubbleSize: number;
        colorGroup?: string;
        metadata?: Record<string, unknown>;
      }>;
      const result = await humanoidTrendService.updatePositioningData(id, data);
      return result;
    } catch (error) {
      handleError(error, reply);
    }
  });

  fastify.delete('/positioning/:id', { preHandler: requireRole('admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await humanoidTrendService.deletePositioningData(id);
      reply.status(204).send();
    } catch (error) {
      handleError(error, reply);
    }
  });

  // ── PPT Export (Analyst + Admin only) ──

  fastify.post('/export-ppt', { preHandler: requireRole('analyst', 'admin') }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        theme?: 'dark' | 'light';
        chartImages?: string[]; // base64 encoded chart images
      };

      const { pptGeneratorService } = await import('../services/ppt-generator.service.js');

      const result = await pptGeneratorService.generatePptx({
        template: 'humanoid_trend' as any,
        theme: body.theme || 'dark',
        title: '휴머노이드 동향 리포트',
        chartImages: body.chartImages,
      } as any);

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      reply.header('Content-Disposition', `attachment; filename="${result.metadata.filename}"`);
      reply.header('X-Slide-Count', String(result.metadata.slideCount));
      return reply.send(result.buffer);
    } catch (error) {
      console.error('PPT generation error:', error);
      reply.status(500).send({
        error: {
          code: 'PPT_GENERATION_ERROR',
          message: 'PPT 생성에 실패했습니다. 다시 시도해주세요.',
          details: { timestamp: new Date().toISOString(), email: (request as any).user?.email },
        },
      });
    }
  });
}

