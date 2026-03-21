import type { FastifyInstance } from 'fastify';
import { ciUpdateService } from '../services/ci-update.service.js';
import { forceReseedCiData } from '../db/seed-ci.js';

export async function ciUpdateRoutes(fastify: FastifyInstance) {
  // === Matrix Data ===

  // GET /matrix — full CI matrix
  fastify.get('/matrix', async () => {
    return ciUpdateService.getFullMatrix();
  });

  // GET /competitors — all competitors
  fastify.get('/competitors', async () => {
    return ciUpdateService.getCompetitors();
  });

  // POST /competitors — add new competitor
  fastify.post('/competitors', async (request) => {
    const body = request.body as { slug: string; name: string; manufacturer: string; country?: string; stage?: string };
    return ciUpdateService.addCompetitor(body);
  });

  // === Value CRUD ===

  // PATCH /values/:valueId — inline edit
  fastify.patch('/values/:valueId', async (request) => {
    const { valueId } = request.params as { valueId: string };
    const body = request.body as { value?: string; confidence?: string; source?: string; sourceUrl?: string; sourceDate?: string; changedBy?: string };
    const { changedBy = 'admin', ...data } = body;
    await ciUpdateService.updateValue(valueId, data, changedBy);
    return { success: true };
  });

  // PUT /values/upsert — create or update value
  fastify.put('/values/upsert', async (request) => {
    const body = request.body as { competitorId: string; itemId: string; value: string; confidence: string; source?: string; sourceUrl?: string; sourceDate?: string; changedBy?: string };
    const { competitorId, itemId, changedBy = 'admin', ...data } = body;
    await ciUpdateService.upsertValue(competitorId, itemId, data, changedBy);
    return { success: true };
  });

  // GET /values/:valueId/history — value change history
  fastify.get('/values/:valueId/history', async (request) => {
    const { valueId } = request.params as { valueId: string };
    return ciUpdateService.getValueHistory(valueId);
  });

  // === Freshness ===

  // GET /freshness — freshness summary
  fastify.get('/freshness', async () => {
    return ciUpdateService.getFreshnessSummary();
  });

  // POST /freshness/verify — mark as verified
  fastify.post('/freshness/verify', async (request) => {
    const { layerId, competitorId } = request.body as { layerId: string; competitorId: string };
    await ciUpdateService.markVerified(layerId, competitorId);
    return { success: true };
  });

  // === Staging ===

  // GET /staging — pending staged updates
  fastify.get('/staging', async () => {
    return ciUpdateService.getPendingStagedUpdates();
  });

  // POST /staging — create staged update
  fastify.post('/staging', async (request) => {
    const body = request.body as { updateType: string; payload: any; sourceChannel: string };
    await ciUpdateService.createStagedUpdate(body);
    return { success: true };
  });

  // POST /staging/:stagingId/approve — approve staged update
  fastify.post('/staging/:stagingId/approve', async (request) => {
    const { stagingId } = request.params as { stagingId: string };
    const { reviewedBy = 'admin' } = request.body as { reviewedBy?: string };
    await ciUpdateService.approveStagedUpdate(stagingId, reviewedBy);
    return { success: true };
  });

  // POST /staging/:stagingId/dismiss — dismiss staged update
  fastify.post('/staging/:stagingId/dismiss', async (request) => {
    const { stagingId } = request.params as { stagingId: string };
    const { reviewedBy = 'admin' } = request.body as { reviewedBy?: string };
    await ciUpdateService.dismissStagedUpdate(stagingId, reviewedBy);
    return { success: true };
  });

  // === Monitor Alerts ===

  // GET /monitor-alerts — alerts with optional status filter
  fastify.get('/monitor-alerts', async (request) => {
    const { status } = request.query as { status?: string };
    return ciUpdateService.getMonitorAlerts(status);
  });

  // POST /monitor-alerts — create alert
  fastify.post('/monitor-alerts', async (request) => {
    const body = request.body as { sourceName: string; sourceUrl: string; headline: string; summary?: string; competitorId?: string; layerId?: string };
    await ciUpdateService.createMonitorAlert(body);
    return { success: true };
  });

  // PATCH /monitor-alerts/:alertId — review/update alert status
  fastify.patch('/monitor-alerts/:alertId', async (request) => {
    const { alertId } = request.params as { alertId: string };
    const { status, reviewedBy = 'admin' } = request.body as { status: string; reviewedBy?: string };
    await ciUpdateService.reviewAlert(alertId, status, reviewedBy);
    return { success: true };
  });

  // POST /force-reseed — 전체 CI 데이터 삭제 후 재시드
  fastify.post('/force-reseed', async () => {
    await forceReseedCiData();
    return { success: true, message: 'CI data reseeded successfully' };
  });
}
