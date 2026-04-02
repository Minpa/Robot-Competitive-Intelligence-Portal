import type { FastifyInstance } from 'fastify';
import { complianceService } from '../services/compliance.service.js';

export async function complianceRoutes(fastify: FastifyInstance) {
  // ==================== Dashboard ====================

  fastify.get('/dashboard', async () => {
    return complianceService.getDashboardData();
  });

  // ==================== Regulations ====================

  fastify.get('/regulations', async (request) => {
    const query = request.query as {
      category?: string;
      region?: string;
      status?: string;
      lgImpact?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
    return complianceService.getRegulations({
      ...query,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  fastify.get('/regulations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await complianceService.getRegulationById(id);
    if (!result) {
      reply.status(404).send({ error: 'Regulation not found' });
      return;
    }
    return result;
  });

  fastify.post('/regulations', async (request) => {
    const body = request.body as any;
    return complianceService.createRegulation(body);
  });

  fastify.put('/regulations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return complianceService.updateRegulation(id, body);
  });

  fastify.delete('/regulations/:id', async (request) => {
    const { id } = request.params as { id: string };
    await complianceService.deleteRegulation(id);
    return { success: true };
  });

  // ==================== Updates Feed ====================

  fastify.get('/updates', async (request) => {
    const query = request.query as {
      category?: string;
      region?: string;
      lgImpact?: string;
      isRead?: string;
      updateType?: string;
      limit?: string;
      offset?: string;
    };
    return complianceService.getUpdates({
      ...query,
      isRead: query.isRead !== undefined ? query.isRead === 'true' : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  fastify.post('/updates', async (request) => {
    const body = request.body as any;
    return complianceService.createUpdate(body);
  });

  fastify.post('/updates/mark-read', async (request) => {
    const { ids } = request.body as { ids: string[] };
    await complianceService.markUpdatesRead(ids);
    return { success: true };
  });

  fastify.post('/updates/mark-all-read', async () => {
    await complianceService.markAllUpdatesRead();
    return { success: true };
  });

  // ==================== Checklist ====================

  fastify.get('/checklist', async (request) => {
    const query = request.query as {
      category?: string;
      region?: string;
      status?: string;
      priority?: string;
    };
    return complianceService.getChecklist(query);
  });

  fastify.get('/checklist/stats', async () => {
    return complianceService.getChecklistStats();
  });

  fastify.post('/checklist', async (request) => {
    const body = request.body as any;
    return complianceService.createChecklistItem(body);
  });

  fastify.put('/checklist/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return complianceService.updateChecklistItem(id, body);
  });

  fastify.delete('/checklist/:id', async (request) => {
    const { id } = request.params as { id: string };
    await complianceService.deleteChecklistItem(id);
    return { success: true };
  });

  // ==================== Sources ====================

  fastify.get('/sources', async () => {
    return complianceService.getSources();
  });

  fastify.post('/sources', async (request) => {
    const body = request.body as any;
    return complianceService.createSource(body);
  });

  fastify.put('/sources/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return complianceService.updateSource(id, body);
  });

  fastify.delete('/sources/:id', async (request) => {
    const { id } = request.params as { id: string };
    await complianceService.deleteSource(id);
    return { success: true };
  });
}
