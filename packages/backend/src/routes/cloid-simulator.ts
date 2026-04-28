import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { cloidScenarios } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

interface SaveScenarioBody {
  name: string;
  description?: string;
  category?: string;
  data: {
    booth: { widthFt: number; depthFt: number };
    duration?: number;
    furniture: unknown[];
    robots: unknown[];
  };
  createdBy?: string;
}

export async function cloidSimulatorRoutes(fastify: FastifyInstance) {
  // List all scenarios — newest first, optionally filtered by category
  fastify.get<{ Querystring: { category?: string } }>('/scenarios', async (request, reply) => {
    try {
      const cat = request.query.category;
      const rows = cat
        ? await db.select().from(cloidScenarios).where(eq(cloidScenarios.category, cat)).orderBy(desc(cloidScenarios.updatedAt))
        : await db.select().from(cloidScenarios).orderBy(desc(cloidScenarios.updatedAt));
      // Don't ship the full data blob in the list view (could be heavy); send summary only.
      return reply.send({
        scenarios: rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          thumbnailUrl: r.thumbnailUrl,
          createdBy: r.createdBy,
          furnitureCount: Array.isArray(r.data?.furniture) ? r.data.furniture.length : 0,
          robotCount: Array.isArray(r.data?.robots) ? r.data.robots.length : 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'list failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // Load full scenario by id
  fastify.get<{ Params: { id: string } }>('/scenarios/:id', async (request, reply) => {
    try {
      const rows = await db.select().from(cloidScenarios).where(eq(cloidScenarios.id, request.params.id)).limit(1);
      if (!rows.length) return reply.code(404).send({ error: 'not found' });
      return reply.send({ scenario: rows[0] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'load failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // Save new scenario
  fastify.post<{ Body: SaveScenarioBody }>('/scenarios', async (request, reply) => {
    const body = request.body;
    if (!body || !body.name || !body.data) {
      return reply.code(400).send({ error: 'name and data required' });
    }
    try {
      const [row] = await db.insert(cloidScenarios).values({
        name: body.name.slice(0, 200),
        description: body.description ?? null,
        category: body.category ?? 'user',
        data: body.data,
        createdBy: body.createdBy ?? 'anonymous',
      }).returning();
      return reply.send({ scenario: row });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'save failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // Update existing scenario (overwrites name/description/data)
  fastify.put<{ Params: { id: string }; Body: SaveScenarioBody }>('/scenarios/:id', async (request, reply) => {
    const body = request.body;
    if (!body || !body.name || !body.data) {
      return reply.code(400).send({ error: 'name and data required' });
    }
    try {
      const [row] = await db.update(cloidScenarios)
        .set({
          name: body.name.slice(0, 200),
          description: body.description ?? null,
          data: body.data,
          updatedAt: new Date(),
        })
        .where(eq(cloidScenarios.id, request.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: 'not found' });
      return reply.send({ scenario: row });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'update failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // Delete scenario
  fastify.delete<{ Params: { id: string } }>('/scenarios/:id', async (request, reply) => {
    try {
      const [row] = await db.delete(cloidScenarios)
        .where(eq(cloidScenarios.id, request.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: 'not found' });
      return reply.send({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'delete failed';
      return reply.code(500).send({ error: msg });
    }
  });
}
