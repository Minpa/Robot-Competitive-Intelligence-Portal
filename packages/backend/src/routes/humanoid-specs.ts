import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, humanoidModels } from '../db/index.js';

// JSONB 카테고리 키 (스키마와 정합)
const JSONB_CATEGORIES = [
  'basicInfo', 'physical', 'locomotion', 'manipulation',
  'perception', 'aiCompute', 'safety', 'commercial',
  'eeOptions', 'customFields',
] as const;
type JsonbCategoryKey = typeof JSONB_CATEGORIES[number];

const TOP_FIELDS = [
  'modelName', 'codeName', 'formFactor', 'isPotential',
  'releasePhase', 'releaseTargetDate', 'notes', 'createdBy',
] as const;
type TopFieldKey = typeof TOP_FIELDS[number];

const FORM_FACTOR_VALUES = ['Wheel', 'Biped', 'Quadruped', 'Other'] as const;
const RELEASE_PHASE_VALUES = ['시제품', 'Pilot', '양산 중', '조사 중', '미정'] as const;

function pickTopFields(body: Record<string, unknown>): Partial<Record<TopFieldKey, unknown>> {
  const out: Record<string, unknown> = {};
  for (const k of TOP_FIELDS) if (k in body) out[k] = body[k];
  return out;
}
function pickJsonbFields(body: Record<string, unknown>): Partial<Record<JsonbCategoryKey, Record<string, unknown>>> {
  const out: Record<string, unknown> = {};
  for (const k of JSONB_CATEGORIES) {
    if (k in body && body[k] && typeof body[k] === 'object') out[k] = body[k];
  }
  return out as Partial<Record<JsonbCategoryKey, Record<string, unknown>>>;
}

function validateCreate(body: Record<string, unknown>): string | null {
  if (!body.modelName || typeof body.modelName !== 'string') return 'modelName required';
  if (!body.formFactor || typeof body.formFactor !== 'string') return 'formFactor required';
  if (!FORM_FACTOR_VALUES.includes(body.formFactor as typeof FORM_FACTOR_VALUES[number])) {
    return `formFactor must be one of: ${FORM_FACTOR_VALUES.join(', ')}`;
  }
  if (body.releasePhase != null && typeof body.releasePhase === 'string'
      && !RELEASE_PHASE_VALUES.includes(body.releasePhase as typeof RELEASE_PHASE_VALUES[number])) {
    return `releasePhase must be one of: ${RELEASE_PHASE_VALUES.join(', ')}`;
  }
  return null;
}

export async function humanoidSpecRoutes(fastify: FastifyInstance) {
  // List — all rows. <50 expected, no pagination.
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rows = await db
        .select()
        .from(humanoidModels)
        .orderBy(humanoidModels.isPotential, humanoidModels.formFactor, humanoidModels.modelName);
      return rows;
    } catch (err) {
      console.error('Error listing humanoid_models:', err);
      reply.status(500).send({ error: 'Failed to list humanoid models' });
    }
  });

  // Detail — single by id
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const idNum = Number(id);
      if (!Number.isFinite(idNum)) return reply.status(400).send({ error: 'Invalid id' });

      const [row] = await db.select().from(humanoidModels).where(eq(humanoidModels.id, idNum));
      if (!row) return reply.status(404).send({ error: 'Model not found' });
      return row;
    } catch (err) {
      console.error('Error fetching humanoid_model:', err);
      reply.status(500).send({ error: 'Failed to fetch humanoid model' });
    }
  });

  // Create
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const err = validateCreate(body);
      if (err) return reply.status(400).send({ error: err });

      const top = pickTopFields(body);
      const jsonb = pickJsonbFields(body);
      try {
        const [row] = await db.insert(humanoidModels).values({
          modelName: top.modelName as string,
          formFactor: top.formFactor as string,
          codeName: top.codeName as string | undefined,
          isPotential: top.isPotential as boolean | undefined ?? false,
          releasePhase: top.releasePhase as string | undefined,
          releaseTargetDate: top.releaseTargetDate as string | undefined,
          notes: top.notes as string | undefined,
          createdBy: top.createdBy as string | undefined,
          ...(jsonb.basicInfo && { basicInfo: jsonb.basicInfo }),
          ...(jsonb.physical && { physical: jsonb.physical }),
          ...(jsonb.locomotion && { locomotion: jsonb.locomotion }),
          ...(jsonb.manipulation && { manipulation: jsonb.manipulation }),
          ...(jsonb.perception && { perception: jsonb.perception }),
          ...(jsonb.aiCompute && { aiCompute: jsonb.aiCompute }),
          ...(jsonb.safety && { safety: jsonb.safety }),
          ...(jsonb.commercial && { commercial: jsonb.commercial }),
          ...(jsonb.eeOptions && { eeOptions: jsonb.eeOptions }),
          ...(jsonb.customFields && { customFields: jsonb.customFields }),
        } as typeof humanoidModels.$inferInsert).returning();
        return reply.status(201).send(row);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('humanoid_models_model_name_unique')) {
          return reply.status(409).send({ error: 'modelName already exists' });
        }
        throw e;
      }
    } catch (err) {
      console.error('Error creating humanoid_model:', err);
      reply.status(500).send({ error: 'Failed to create humanoid model' });
    }
  });

  // Update — partial. JSONB columns get merged via `column || patch::jsonb`.
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const idNum = Number(id);
      if (!Number.isFinite(idNum)) return reply.status(400).send({ error: 'Invalid id' });

      const body = request.body as Record<string, unknown>;
      const top = pickTopFields(body);
      const jsonb = pickJsonbFields(body);

      // Build dynamic update set
      const setObj: Record<string, unknown> = {};
      if ('modelName' in top) setObj.modelName = top.modelName;
      if ('codeName' in top) setObj.codeName = top.codeName;
      if ('formFactor' in top) {
        if (!FORM_FACTOR_VALUES.includes(top.formFactor as typeof FORM_FACTOR_VALUES[number])) {
          return reply.status(400).send({ error: 'Invalid formFactor' });
        }
        setObj.formFactor = top.formFactor;
      }
      if ('isPotential' in top) setObj.isPotential = top.isPotential;
      if ('releasePhase' in top) {
        if (top.releasePhase != null && !RELEASE_PHASE_VALUES.includes(top.releasePhase as typeof RELEASE_PHASE_VALUES[number])) {
          return reply.status(400).send({ error: 'Invalid releasePhase' });
        }
        setObj.releasePhase = top.releasePhase;
      }
      if ('releaseTargetDate' in top) setObj.releaseTargetDate = top.releaseTargetDate;
      if ('notes' in top) setObj.notes = top.notes;

      // JSONB merge — keep existing keys and overlay incoming
      const jsonbToColumn: Record<JsonbCategoryKey, string> = {
        basicInfo: 'basic_info',
        physical: 'physical',
        locomotion: 'locomotion',
        manipulation: 'manipulation',
        perception: 'perception',
        aiCompute: 'ai_compute',
        safety: 'safety',
        commercial: 'commercial',
        eeOptions: 'ee_options',
        customFields: 'custom_fields',
      };
      for (const k of JSONB_CATEGORIES) {
        if (jsonb[k]) {
          const col = jsonbToColumn[k];
          setObj[k] = sql.raw(`"${col}" || '${JSON.stringify(jsonb[k]).replace(/'/g, "''")}'::jsonb`);
        }
      }

      if (Object.keys(setObj).length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      try {
        const [row] = await db
          .update(humanoidModels)
          .set(setObj as typeof humanoidModels.$inferInsert)
          .where(eq(humanoidModels.id, idNum))
          .returning();
        if (!row) return reply.status(404).send({ error: 'Model not found' });
        return row;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('humanoid_models_model_name_unique')) {
          return reply.status(409).send({ error: 'modelName already exists' });
        }
        throw e;
      }
    } catch (err) {
      console.error('Error updating humanoid_model:', err);
      reply.status(500).send({ error: 'Failed to update humanoid model' });
    }
  });

  // Delete
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const idNum = Number(id);
      if (!Number.isFinite(idNum)) return reply.status(400).send({ error: 'Invalid id' });

      const [row] = await db.delete(humanoidModels).where(eq(humanoidModels.id, idNum)).returning();
      if (!row) return reply.status(404).send({ error: 'Model not found' });
      return reply.status(204).send();
    } catch (err) {
      console.error('Error deleting humanoid_model:', err);
      reply.status(500).send({ error: 'Failed to delete humanoid model' });
    }
  });

  // Export — full JSON dump
  fastify.get('/export', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rows = await db.select().from(humanoidModels);
      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="humanoid_models_export.json"')
        .send(rows);
    } catch (err) {
      console.error('Error exporting humanoid_models:', err);
      reply.status(500).send({ error: 'Failed to export humanoid models' });
    }
  });
}
