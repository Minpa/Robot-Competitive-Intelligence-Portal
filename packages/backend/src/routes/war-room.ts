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
import { dataAuditService } from '../services/data-audit.service.js';
import { strategicAIAgentService } from '../services/strategic-ai-agent.service.js';
import { schedulerService } from '../services/scheduler.service.js';
import { aiUsageService } from '../services/ai-usage.service.js';
import { authMiddleware, requireRole } from './auth.js';

// Pre-built role guards
const adminOnly = [authMiddleware, requireRole('admin')];
const adminOrAnalyst = [authMiddleware, requireRole('admin', 'analyst')];
const noViewer = [authMiddleware, requireRole('admin', 'analyst')];

export async function warRoomRoutes(fastify: FastifyInstance) {
  // RBAC: All /api/war-room/* endpoints block Viewer role (403)
  // Admin: full CRUD, Analyst: read + scenario creation
  // Read-only GETs use noViewer (admin + analyst), mutations use adminOnly or adminOrAnalyst

  // ── Dashboard (8.3) ──────────────────────────────────────────────

  fastify.get<{ Querystring: { lgRobotId?: string } }>('/dashboard', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.get('/lg-robots', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomDashboardService.getLgRobots();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Competitive Analysis (8.4) ───────────────────────────────────

  fastify.get<{ Params: { robotId: string }; Querystring: { competitor_ids?: string } }>('/competitive/:robotId', { preHandler: noViewer }, async (request, reply) => {
    try {
      const competitorIds = request.query.competitor_ids
        ? request.query.competitor_ids.split(',').filter(Boolean)
        : undefined;
      return await warRoomCompetitiveService.getGapAnalysis(request.params.robotId, competitorIds);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string }; Querystring: { competitor_ids?: string } }>('/competitive/:robotId/overlay', { preHandler: noViewer }, async (request, reply) => {
    try {
      const competitorIds = request.query.competitor_ids
        ? request.query.competitor_ids.split(',').filter(Boolean)
        : undefined;
      return await warRoomCompetitiveService.getCompetitiveOverlay(request.params.robotId, competitorIds);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/competitive/:robotId/available-competitors', { preHandler: noViewer }, async (request, reply) => {
    try {
      return await warRoomCompetitiveService.getAvailableCompetitors(request.params.robotId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/competitive/:robotId/ranking', { preHandler: noViewer }, async (request, reply) => {
    try {
      const analysis = await warRoomCompetitiveService.getGapAnalysis(request.params.robotId);
      return analysis.lgRanking;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Competitive Scores Update (8.4) ──────────────────────────────
  fastify.patch<{ Params: { robotId: string } }>('/competitive-scores/:robotId', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await warRoomCompetitiveService.updateCompetitiveScores(request.params.robotId, {
        pocScores: body.pocScores,
        rfmScores: body.rfmScores,
      });
      if (!result.pocScore && !result.rfmScore) {
        return reply.status(404).send({ error: 'Robot not found or no valid scores to update' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Score History (8.5) ──────────────────────────────────────────

  fastify.get<{ Querystring: { robot_ids?: string; months?: string } }>('/score-history', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.get<{ Querystring: { type?: string; is_read?: string } }>('/alerts', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.put<{ Params: { id: string } }>('/alerts/:id/read', { preHandler: noViewer }, async (request, reply) => {
    try {
      const userId = request.user?.userId || 'anonymous';
      await warRoomAlertService.markAsRead(request.params.id, userId);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/alerts', { preHandler: adminOnly }, async (request, reply) => {
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

  fastify.delete<{ Params: { id: string } }>('/alerts/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      await warRoomAlertService.deleteAlert(request.params.id);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Timeline (competitive_alerts as timeline events) ─────────────

  fastify.get('/timeline', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomAlertService.getAlerts({ limit: 50 });
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/timeline', { preHandler: adminOnly }, async (request, reply) => {
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

  fastify.get('/lg-robots/management', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomLgRobotService.getLgRobots();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/lg-robots', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      const userId = request.user?.userId || 'admin';
      return await warRoomLgRobotService.createLgRobot(body, userId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.put<{ Params: { id: string } }>('/lg-robots/:id/specs', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      const userId = request.user?.userId || 'admin';
      await warRoomLgRobotService.updateSpecs(request.params.id, body.specs || body, userId);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/lg-robots/:id/history', { preHandler: noViewer }, async (request, reply) => {
    try {
      return await warRoomLgRobotService.getChangeHistory(request.params.id);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Partners (17.1) ──────────────────────────────────────────────

  fastify.get<{ Querystring: { category?: string; sub_category?: string; country?: string } }>('/partners', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.get<{ Params: { id: string } }>('/partners/:id', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.post('/partners', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.create(body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.put<{ Params: { id: string } }>('/partners/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomPartnerService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/partner-evaluations', { preHandler: adminOrAnalyst }, async (request, reply) => {
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

  fastify.get('/partner-adoptions', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomPartnerService.getAdoptionMatrix();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/partner-adoptions', { preHandler: adminOnly }, async (request, reply) => {
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

  fastify.get('/domains', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomDomainService.list();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/domains/:id', { preHandler: noViewer }, async (request, reply) => {
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

  fastify.put<{ Params: { id: string } }>('/domains/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomDomainService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/domain-robot-fit', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomDomainService.getFitMatrix();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/domain-robot-fit', { preHandler: adminOnly }, async (request, reply) => {
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

  fastify.patch<{ Params: { id: string } }>('/domain-robot-fit/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await warRoomDomainService.updateFitEntry(request.params.id, {
        fitScore: body.fitScore,
        fitDetails: body.fitDetails,
      });
      if (!result) {
        return reply.status(404).send({ error: 'Fit entry not found' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Scenarios (17.3) ─────────────────────────────────────────────

  fastify.get<{ Querystring: { userId?: string } }>('/scenarios', { preHandler: noViewer }, async (request, reply) => {
    try {
      const userId = request.query.userId || null;
      return await warRoomScenarioService.list(userId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/scenarios', { preHandler: adminOrAnalyst }, async (request, reply) => {
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

  fastify.delete<{ Params: { id: string }; Querystring: { userId?: string; userRole?: string } }>('/scenarios/:id', { preHandler: adminOrAnalyst }, async (request, reply) => {
    try {
      const userId = request.user?.userId || 'anonymous';
      const userRole = request.user?.role || 'admin';
      await warRoomScenarioService.delete(request.params.id, userId, userRole);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Strategic Goals (17.4) ───────────────────────────────────────

  fastify.get('/goals', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await warRoomGoalService.list();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/goals', { preHandler: adminOnly }, async (request, reply) => {
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

  fastify.put<{ Params: { id: string } }>('/goals/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      return await warRoomGoalService.update(request.params.id, body);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/goals/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      await warRoomGoalService.delete(request.params.id);
      return { success: true };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Investment Priority (17.5) ───────────────────────────────────

  fastify.get('/investment-priority', { preHandler: noViewer }, async (_request, reply) => {
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

  fastify.patch<{ Params: { id: string } }>('/investment-priority/:id', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await warRoomDomainService.update(request.params.id, {
        lgReadiness: body.lgReadiness != null ? String(body.lgReadiness) : undefined,
        somBillionUsd: body.somBillionUsd != null ? String(body.somBillionUsd) : undefined,
        cagrPercent: body.cagrPercent != null ? String(body.cagrPercent) : undefined,
      });
      if (!result) {
        return reply.status(404).send({ error: 'Domain not found' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Data Audit (Strategic Intelligence) ──────────────────────────

  fastify.get('/data-audit', { preHandler: noViewer }, async (_request, reply) => {
    try {
      const report = await dataAuditService.getLatestReport();
      if (!report) {
        return { message: 'No audit report found. Run an audit first.' };
      }
      return report;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post('/data-audit/run', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const userId = request.user?.userId;
      const report = await dataAuditService.runFullAudit(userId);
      return report;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/data-audit/robot/:robotId', { preHandler: noViewer }, async (request, reply) => {
    try {
      const result = await dataAuditService.auditRobot(request.params.robotId);
      if (!result) {
        return reply.status(404).send({ error: 'Robot not found' });
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Strategic AI Briefing ────────────────────────────────────────

  fastify.get<{ Params: { robotId: string } }>('/strategic-briefing/:robotId', { preHandler: noViewer }, async (request, reply) => {
    try {
      const result = await strategicAIAgentService.getLatestBriefing(request.params.robotId);
      if (!result) {
        return { message: 'No briefing found. Generate one first.' };
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post<{ Params: { robotId: string } }>('/strategic-briefing/:robotId/generate', { preHandler: adminOrAnalyst }, async (request, reply) => {
    try {
      const result = await strategicAIAgentService.generateBriefing(request.params.robotId, 'manual');
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: { robotId: string } }>('/strategic-briefing/:robotId/history', { preHandler: noViewer }, async (request, reply) => {
    try {
      return await strategicAIAgentService.getBriefingHistory(request.params.robotId);
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  // ── Scheduler & Pipeline History ────────────────────────────────

  fastify.get('/scheduler/status', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return schedulerService.getStatus();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.post<{ Params: { taskName: string } }>('/scheduler/:taskName/trigger', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const result = await schedulerService.trigger(request.params.taskName);
      if (!result.success) {
        return reply.status(400).send(result);
      }
      return result;
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/pipeline-history', { preHandler: noViewer }, async (_request, reply) => {
    try {
      return await schedulerService.getPipelineHistory();
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/ai-budget', { preHandler: noViewer }, async (_request, reply) => {
    try {
      const currentCost = await aiUsageService.getCurrentMonthCostUsd();
      return { currentCostUsd: currentCost, limitUsd: 7.0 };
    } catch (error) {
      reply.status(500).send({ error: (error as Error).message });
    }
  });
}
