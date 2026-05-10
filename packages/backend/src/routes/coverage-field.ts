// CLOiD 커버리지 sub-cell 현장 확인 / PoC / 배포 진행 이벤트 라우트.
//
// GET  /api/coverage/field/events           — 모든 이벤트 (newest first)
// GET  /api/coverage/field/status           — sub-cell 별 현재 status (latest event 기준)
// POST /api/coverage/field/events           — 새 이벤트 추가 (admin용 — auth는 추후)

import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { coverageFieldEvents } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';

interface CreateEventBody {
  subcellKey: string;
  cellId: string;
  lv: number;
  eventDate: string; // YYYY-MM-DD
  kind: 'visit' | 'poc-planned' | 'poc-active' | 'poc-milestone' | 'deployed' | 'note';
  status: 'observed' | 'poc-planned' | 'poc-active' | 'deployed';
  site?: string;
  source?: string;
  note?: string;
  nextStep?: string;
  priorityRank?: number | null;
  createdBy?: string;
}

const STATUS_RANK: Record<string, number> = {
  observed: 1,
  'poc-planned': 2,
  'poc-active': 3,
  deployed: 4,
};

export async function coverageFieldRoutes(fastify: FastifyInstance) {
  // 모든 이벤트 — newest first
  fastify.get('/events', async (_request, reply) => {
    try {
      const rows = await db
        .select()
        .from(coverageFieldEvents)
        .orderBy(desc(coverageFieldEvents.eventDate), desc(coverageFieldEvents.id));
      return reply.send({ events: rows });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'list failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // sub-cell 별 현재 status (가장 최근 event 기준).
  // 동일 subcellKey 에 여러 event 가 있을 때, 가장 진척된 status (deployed > poc-active > poc-planned > observed)
  // 또는 가장 최신 event 의 status 중 어느 쪽을 쓸지는 product 결정 — 일단 "최신 event 의 status".
  fastify.get('/status', async (_request, reply) => {
    try {
      const rows = await db
        .select()
        .from(coverageFieldEvents)
        .orderBy(desc(coverageFieldEvents.eventDate), desc(coverageFieldEvents.id));

      const byKey = new Map<string, typeof rows[number]>();
      const eventsByKey = new Map<string, typeof rows>();
      for (const r of rows) {
        if (!byKey.has(r.subcellKey)) byKey.set(r.subcellKey, r);
        const list = eventsByKey.get(r.subcellKey) ?? [];
        list.push(r);
        eventsByKey.set(r.subcellKey, list);
      }

      const status = Array.from(byKey.entries()).map(([key, latest]) => ({
        subcellKey: key,
        cellId: latest.cellId,
        lv: latest.lv,
        currentStatus: latest.status,
        statusRank: STATUS_RANK[latest.status] ?? 0,
        latestEventDate: latest.eventDate,
        latestKind: latest.kind,
        latestSite: latest.site,
        latestSource: latest.source,
        latestNote: latest.note,
        nextStep: latest.nextStep,
        priorityRank: latest.priorityRank,
        eventCount: eventsByKey.get(key)?.length ?? 1,
      }));

      return reply.send({ status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'status failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // 특정 sub-cell 의 전체 이력
  fastify.get<{ Params: { subcellKey: string } }>('/events/:subcellKey', async (request, reply) => {
    try {
      const rows = await db
        .select()
        .from(coverageFieldEvents)
        .where(eq(coverageFieldEvents.subcellKey, request.params.subcellKey))
        .orderBy(desc(coverageFieldEvents.eventDate), desc(coverageFieldEvents.id));
      return reply.send({ events: rows });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'list failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // 새 이벤트 추가 (admin — auth 미적용, 추후 보호)
  fastify.post<{ Body: CreateEventBody }>('/events', async (request, reply) => {
    try {
      const b = request.body;
      if (!b.subcellKey || !b.cellId || !b.lv || !b.eventDate || !b.kind || !b.status) {
        return reply.code(400).send({
          error: 'subcellKey, cellId, lv, eventDate, kind, status are required',
        });
      }
      const inserted = await db
        .insert(coverageFieldEvents)
        .values({
          subcellKey: b.subcellKey,
          cellId: b.cellId,
          lv: b.lv,
          eventDate: b.eventDate,
          kind: b.kind,
          status: b.status,
          site: b.site ?? null,
          source: b.source ?? null,
          note: b.note ?? null,
          nextStep: b.nextStep ?? null,
          priorityRank: b.priorityRank ?? null,
          createdBy: b.createdBy ?? null,
        })
        .returning();
      return reply.code(201).send({ event: inserted[0] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'create failed';
      return reply.code(500).send({ error: msg });
    }
  });

  // 카운트 요약 — header 배지에서 빠르게 쓰기 위함
  fastify.get('/summary', async (_request, reply) => {
    try {
      const [r] = await db
        .select({
          totalEvents: sql<number>`COUNT(*)::int`,
          uniqueSubcells: sql<number>`COUNT(DISTINCT ${coverageFieldEvents.subcellKey})::int`,
          uniqueCells: sql<number>`COUNT(DISTINCT ${coverageFieldEvents.cellId})::int`,
          latestEventDate: sql<string | null>`MAX(${coverageFieldEvents.eventDate})`,
        })
        .from(coverageFieldEvents);
      return reply.send({
        totalEvents: r?.totalEvents ?? 0,
        uniqueSubcells: r?.uniqueSubcells ?? 0,
        uniqueCells: r?.uniqueCells ?? 0,
        latestEventDate: r?.latestEventDate ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'summary failed';
      return reply.code(500).send({ error: msg });
    }
  });
}
