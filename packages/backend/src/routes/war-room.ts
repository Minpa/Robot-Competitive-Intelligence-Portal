import type { FastifyInstance } from 'fastify';
import { warRoomDashboardService } from '../services/war-room-dashboard.service.js';
import { warRoomCompetitiveService } from '../services/war-room-competitive.service.js';
import { warRoomScoreHistoryService } from '../services/war-room-score-history.service.js';
import { warRoomAlertService } from '../services/war-room-alert.service.js';
import { warRoomLgRobotService } from '../services/war-room-lg-robot.service.js';
import { warRoomPartnerService } from '../services/war-room-partner.service.js';
import { warRoomDomainService } from '../services/war-room-domain.service.js';
import { warRoomScenarioService } from '../services/war-room-scenario.service.js';
import { warRoomGoalService } from '../services/war-room-goal.service.js';

export async function warRoomRoutes(fastify: FastifyInstance) {
  // TODO: Add role-based access control middleware (Task 22)
  // All /api/war-room/* endpoints should block Viewer role (403)
  // Admin: full CRUD, Analyst: read + scenario creation

  // ── Dashboard (8.3) ──────────────────────────────────────────────

  fastify.get<{ Querystring: { lgRobotId?: string } }>('/dashboard', async (request, reply) => {
    try {
      const { lgRobotId } = request.query;
      if (!lgRobotId) {
        return reply.status(400).send({ error: 'lgRobotId query parameter is required' });
      }
      return await warRoomDashboardService.getDashboardSummary(lgRobotId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/lg-robots', async (_request, reply) => {
    try {
      return await warRoomDashboardService.getLgRobots();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Competitive Analysis (8.4) ───────────────────────────────────

  fastify.get<{ Params: { robotId: string } }>('/competitive/:robotId', async (request, reply) => {
    try {
      return await warRoomCompetitiveService.getGapAnalysis(request.params.robotId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/competitive/:robotId/overlay', async (request, reply) => {
    try {
      return await warRoomCompetitiveService.getCompetitiveOverlay(request.params.robotId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/competitive/:robotId/ranking', async (request, reply) => {
    try {
      const analysis = await warRoomCompetitiveService.getGapAnalysis(request.params.robotId);
      return analysis.lgRanking;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Score History (8.5) ──────────────────────────────────────────

  fastify.get<{ Querystring: { robot_ids?: string; months?: string } }>('/score-history', async (request, reply) => {
    try {
      const { robot_ids, months } = request.query;
      const robotIds = robot_ids ? robot_ids.split(',') : [];
      const monthCount = months ? parseInt(months, 10) : 24;
      if (robotIds.length === 0) {
        return reply.status(400).send({ error: 'robot_ids query parameter is required' });
      }
      return await warRoomScoreHistoryService.getTimeSeries(robotIds, monthCount);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Alerts (8.6) ─────────────────────────────────────────────────

  fastify.get<{ Querystring: { type?: string; is_read?: string } }>('/alerts', async (request, reply) => {
    try {
      const { type, is_read } = request.query;
      const filters: { type?: string; isRead?: boolean } = {};
      if (type) {
        filters.type = type;
      }
      if (is_read !== undefined && is_read !== '') {
        filters.isRead = is_read === 'true';
      }
      return await warRoomAlertService.getAlerts(filters as any);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.put<{ Params: { id: string } }>('/alerts/:id/read', async (request, reply) => {
    try {
      // TODO: Extract userId from auth middleware once implemented (Task 22)
      const body = request.body as { userId?: string } | undefined;
      const query = request.query as { userId?: string } | undefined;
      const userId = body?.userId || query?.userId || 'anonymous';
      await warRoomAlertService.markAsRead(request.params.id, userId);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/alerts', async (request, reply) => {
    try {
      const body = request.body as any;
      await warRoomAlertService.createAlert({
        robotId: body.robotId,
        type: body.type ?? 'info',
        severity: body.severity ?? 'info',
        title: body.title,
        summary: body.summary ?? '',
        triggerData: body.triggerData ?? {},
      });
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Timeline (competitive_alerts as timeline events) ─────────────

  fastify.get('/timeline', async (_request, reply) => {
    try {
      return await warRoomAlertService.getAlerts({ limit: 50 });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/timeline', async (request, reply) => {
    try {
      const body = request.body as any;
      await warRoomAlertService.createAlert({
        robotId: body.robotId ?? undefined,
        type: body.type ?? 'timeline',
        severity: body.severity ?? 'info',
        title: body.title,
        summary: body.summary ?? '',
        triggerData: body.triggerData ?? {},
      });
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── CLOiD Management (8.7) ───────────────────────────────────────

  fastify.get('/lg-robots/management', async (_request, reply) => {
    try {
      return await warRoomLgRobotService.getLgRobots();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.post('/lg-robots', async (request, reply) => {
    try {
      // TODO: Extract userId from auth middleware (Task 22)
      const body = request.body as any;
      const userId = body.userId || 'admin';
      return await warRoomLgRobotService.createLgRobot(body, userId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.put<{ Params: { id: string } }>('/lg-robots/:id/specs', async (request, reply) => {
    try {
      // TODO: Extract userId from auth middleware (Task 22)
      const body = request.body as any;
      const userId = body.userId || 'admin';
      await warRoomLgRobotService.updateSpecs(request.params.id, body.specs || body, userId);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/lg-robots/:id/history', async (request, reply) => {
    try {
      return await warRoomLgRobotService.getChangeHistory(request.params.id);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Partners (17.1) ──────────────────────────────────────────────

  fastify.get<{ Querystring: { category?: string; sub_category?: string; country?: string } }>('/partners', async (request, reply) => {
    try {
      const { category, sub_category, country } = request.query;
      return await warRoomPartnerService.list({
        category,
        subCategory: sub_category,
        country,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/partners/:id', async (request, reply) => {
    try {
      const result = await warRoomPartnerService.getById(request.params.id);
      if (!result) {
        return reply.status(404).send({ error: 'Partner not found' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.post('/partners', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.create(body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.put<{ Params: { id: string } }>('/partners/:id', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin + Analyst role check middleware (Task 22)
  fastify.post('/partner-evaluations', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.submitEvaluation({
        partnerId: body.partnerId,
        evaluatedBy: body.userId || body.evaluatedBy || 'anonymous',
        techScore: body.techScore ?? body.techCapability,
        qualityScore: body.qualityScore ?? body.marketShare,
        costScore: body.costScore ?? body.costCompetitiveness,
        deliveryScore: body.deliveryScore ?? body.supplyStability,
        supportScore: body.supportScore ?? body.lgCompatibility,
        comments: body.comments,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/partner-adoptions', async (_request, reply) => {
    try {
      return await warRoomPartnerService.getAdoptionMatrix();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/partner-adoptions', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.createAdoption({
        partnerId: body.partnerId,
        robotId: body.robotId,
        adoptionStatus: body.adoptionStatus,
        adoptedAt: body.adoptedAt,
        notes: body.notes,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Domains (17.2) ───────────────────────────────────────────────

  fastify.get('/domains', async (_request, reply) => {
    try {
      return await warRoomDomainService.list();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/domains/:id', async (request, reply) => {
    try {
      const result = await warRoomDomainService.getById(request.params.id);
      if (!result) {
        return reply.status(404).send({ error: 'Domain not found' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.put<{ Params: { id: string } }>('/domains/:id', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomDomainService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/domain-robot-fit', async (_request, reply) => {
    try {
      return await warRoomDomainService.getFitMatrix();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/domain-robot-fit', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomDomainService.createFitEntry({
        domainId: body.domainId,
        robotId: body.robotId,
        fitScore: body.fitScore,
        fitDetails: body.fitDetails,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Scenarios (17.3) ─────────────────────────────────────────────

  fastify.get<{ Querystring: { userId?: string } }>('/scenarios', async (request, reply) => {
    try {
      const userId = request.query.userId || null;
      return await warRoomScenarioService.list(userId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin + Analyst role check middleware (Task 22)
  fastify.post('/scenarios', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomScenarioService.create({
        name: body.name,
        description: body.description,
        baseRobotId: body.baseRobotId,
        parameterOverrides: body.parameterOverrides,
        calculatedScores: body.calculatedScores,
        createdBy: body.userId || body.createdBy || null,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Creator or Admin role check middleware (Task 22)
  fastify.delete<{ Params: { id: string }; Querystring: { userId?: string; userRole?: string } }>('/scenarios/:id', async (request, reply) => {
    try {
      const userId = request.query.userId || (request.body as any)?.userId || null;
      const userRole = request.query.userRole || (request.body as any)?.userRole || 'admin';
      await warRoomScenarioService.delete(request.params.id, userId, userRole);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Strategic Goals (17.4) ───────────────────────────────────────

  fastify.get('/goals', async (_request, reply) => {
    try {
      return await warRoomGoalService.list();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.post('/goals', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomGoalService.create({
        title: body.title,
        description: body.description,
        metricType: body.metricType,
        targetValue: body.targetValue,
        currentValue: body.currentValue,
        deadline: body.deadline,
        status: body.status,
        requiredActions: body.requiredActions,
      });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // TODO: Add Admin role check middleware (Task 22)
  fastify.put<{ Params: { id: string } }>('/goals/:id', async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomGoalService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Investment Priority (17.5) ───────────────────────────────────

  fastify.get('/investment-priority', async (_request, reply) => {
    try {
      const domains = await warRoomDomainService.list();
      const ranked = domains
        .map((d) => ({
          id: d.id,
          name: d.name,
          lgReadiness: parseFloat(String(d.lgReadiness || '0')),
          somBillionUsd: parseFloat(String(d.somBillionUsd || '0')),
          score: parseFloat(String(d.lgReadiness || '0')) * parseFloat(String(d.somBillionUsd || '0')),
          marketSizeBillionUsd: d.marketSizeBillionUsd,
          cagrPercent: d.cagrPercent,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return ranked;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });
}
