// ARGOS Projects — /api/pm/* 라우터. 전 엔드포인트 인증 + 프로젝트 멤버십 RBAC.
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { authMiddleware } from './auth.js';
import {
  pmProjects, pmMemberships, pmBoards, pmGroups, pmColumns,
  pmItems, pmCells, pmUpdates, pmViews, pmActivityLog, pmDependencies, users,
} from '../db/schema.js';
import {
  getUserProjectRole, roleAtLeast, assembleBoardData, validateCellValue, logActivity,
  projectIdOfBoard, projectIdOfGroup, projectIdOfColumn, projectIdOfItem, projectIdOfView,
  type PmRole,
} from '../services/pm.service.js';
import { exportBoardPptx } from '../services/pm-export.service.js';

function uid(r: FastifyRequest) { return r.user!.userId as string; }
function grole(r: FastifyRequest) { return r.user!.role as string | undefined; }

// 멤버십 권한 검사 — 부족 시 403 응답 후 null 반환 (caller: if(!ok) return).
async function guard(
  request: FastifyRequest, reply: FastifyReply, projectId: number | null, min: PmRole,
): Promise<PmRole | null> {
  if (projectId == null) { reply.code(404).send({ error: 'project not found' }); return null; }
  const role = await getUserProjectRole(projectId, uid(request), grole(request));
  if (!roleAtLeast(role, min)) { reply.code(403).send({ error: 'insufficient project permission' }); return null; }
  return role;
}

export async function pmRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // ─────────────── Projects ───────────────
  fastify.get('/projects', async (request) => {
    const userId = uid(request);
    const isAdmin = grole(request) === 'admin';
    const rows = isAdmin
      ? await db.select().from(pmProjects).orderBy(desc(pmProjects.updatedAt))
      : await db.select({ p: pmProjects }).from(pmProjects)
          .innerJoin(pmMemberships, eq(pmMemberships.projectId, pmProjects.id))
          .where(eq(pmMemberships.userId, userId))
          .orderBy(desc(pmProjects.updatedAt))
          .then((r) => r.map((x) => x.p));
    return { projects: rows };
  });

  fastify.post('/projects', async (request, reply) => {
    const b = request.body as any;
    if (!b?.name) return reply.code(400).send({ error: 'name required' });
    const [proj] = await db.insert(pmProjects).values({
      name: b.name, code: b.code ?? null, description: b.description ?? null,
      color: b.color ?? null, ownerUserId: uid(request),
    }).returning();
    await db.insert(pmMemberships).values({ projectId: proj!.id, userId: uid(request), role: 'owner' });
    await logActivity({ projectId: proj!.id, userId: uid(request), action: 'create', entityType: 'project', diff: { name: proj!.name } });
    return { project: proj };
  });

  fastify.get('/projects/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'viewer'))) return;
    const [proj] = await db.select().from(pmProjects).where(eq(pmProjects.id, id)).limit(1);
    if (!proj) return reply.code(404).send({ error: 'not found' });
    const boards = await db.select().from(pmBoards).where(eq(pmBoards.projectId, id)).orderBy(asc(pmBoards.orderIndex));
    return { project: proj, boards };
  });

  fastify.put('/projects/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'owner'))) return;
    const b = request.body as any;
    const [proj] = await db.update(pmProjects).set({
      name: b.name, code: b.code, description: b.description,
      status: b.status, color: b.color, updatedAt: new Date(),
    }).where(eq(pmProjects.id, id)).returning();
    await logActivity({ projectId: id, userId: uid(request), action: 'update', entityType: 'project' });
    return { project: proj };
  });

  fastify.delete('/projects/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'owner'))) return;
    await db.delete(pmProjects).where(eq(pmProjects.id, id));
    await logActivity({ projectId: id, userId: uid(request), action: 'delete', entityType: 'project' });
    return { ok: true };
  });

  // ─────────────── Members ───────────────
  fastify.get('/projects/:id/members', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'viewer'))) return;
    const rows = await db.select().from(pmMemberships).where(eq(pmMemberships.projectId, id));
    return { members: rows };
  });

  fastify.post('/projects/:id/members', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'owner'))) return;
    const b = request.body as any;
    if (!b?.userId || !b?.role) return reply.code(400).send({ error: 'userId, role required' });
    const [m] = await db.insert(pmMemberships).values({
      projectId: id, userId: b.userId, role: b.role,
    }).onConflictDoUpdate({
      target: [pmMemberships.projectId, pmMemberships.userId], set: { role: b.role },
    }).returning();
    await logActivity({ projectId: id, userId: uid(request), action: 'add_member', entityType: 'membership', diff: { userId: b.userId, role: b.role } });
    return { member: m };
  });

  fastify.put('/members/:id', async (request, reply) => {
    const mid = Number((request.params as any).id);
    const [m] = await db.select().from(pmMemberships).where(eq(pmMemberships.id, mid)).limit(1);
    if (!m) return reply.code(404).send({ error: 'not found' });
    if (!(await guard(request, reply, m.projectId, 'owner'))) return;
    const [upd] = await db.update(pmMemberships).set({ role: (request.body as any).role })
      .where(eq(pmMemberships.id, mid)).returning();
    return { member: upd };
  });

  fastify.delete('/members/:id', async (request, reply) => {
    const mid = Number((request.params as any).id);
    const [m] = await db.select().from(pmMemberships).where(eq(pmMemberships.id, mid)).limit(1);
    if (!m) return reply.code(404).send({ error: 'not found' });
    if (!(await guard(request, reply, m.projectId, 'owner'))) return;
    await db.delete(pmMemberships).where(eq(pmMemberships.id, mid));
    return { ok: true };
  });

  // ─────────────── Boards ───────────────
  fastify.get('/projects/:id/boards', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'viewer'))) return;
    const rows = await db.select().from(pmBoards).where(eq(pmBoards.projectId, id)).orderBy(asc(pmBoards.orderIndex));
    return { boards: rows };
  });

  fastify.post('/projects/:id/boards', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'editor'))) return;
    const b = request.body as any;
    const cnt = await db.select({ c: sql<number>`count(*)` }).from(pmBoards).where(eq(pmBoards.projectId, id));
    const [board] = await db.insert(pmBoards).values({
      projectId: id, name: b.name || '새 보드', description: b.description ?? null,
      reportCycle: b.reportCycle ?? 'none', orderIndex: Number(cnt[0]?.c ?? 0),
    }).returning();

    // 첫 진입 UX: 기본 그룹 1개 + 핵심 컬럼 4종 자동 세팅 (seed:false 명시 시 skip)
    if (b?.seed !== false) {
      await db.insert(pmGroups).values({
        boardId: board!.id, name: '전체', color: '#3C6FA5', orderIndex: 0,
      });
      const STATUS_LABELS = [
        { id: 1, name: '예정', color: '#888780' },
        { id: 2, name: '진행중', color: '#3C6FA5' },
        { id: 3, name: '완료', color: '#3F8C6E' },
      ];
      const PRIORITY_LABELS = [
        { id: 1, name: 'High', color: '#C8366E' },
        { id: 2, name: 'Mid', color: '#D4A22F' },
        { id: 3, name: 'Low', color: '#3F8C6E' },
      ];
      await db.insert(pmColumns).values([
        { boardId: board!.id, name: '기간', type: 'timeline', settings: {}, orderIndex: 0, width: 180 },
        { boardId: board!.id, name: '상태', type: 'status', settings: { labels: STATUS_LABELS }, orderIndex: 1, width: 120 },
        { boardId: board!.id, name: '우선순위', type: 'priority', settings: { labels: PRIORITY_LABELS }, orderIndex: 2, width: 110 },
        { boardId: board!.id, name: '담당자', type: 'person', settings: {}, orderIndex: 3, width: 140 },
      ]);
    }
    await logActivity({ projectId: id, boardId: board!.id, userId: uid(request), action: 'create', entityType: 'board' });
    return { board };
  });

  fastify.get('/boards/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(id), 'viewer'))) return;
    const [board] = await db.select().from(pmBoards).where(eq(pmBoards.id, id)).limit(1);
    return { board };
  });

  fastify.get('/boards/:id/data', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(id), 'viewer'))) return;
    const data = await assembleBoardData(id);
    if (!data) return reply.code(404).send({ error: 'board not found' });
    return data;
  });

  fastify.put('/boards/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(id), 'editor'))) return;
    const b = request.body as any;
    const [board] = await db.update(pmBoards).set({
      name: b.name, description: b.description, reportCycle: b.reportCycle, orderIndex: b.orderIndex,
    }).where(eq(pmBoards.id, id)).returning();
    return { board };
  });

  fastify.delete('/boards/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const pid = await projectIdOfBoard(id);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    await db.delete(pmBoards).where(eq(pmBoards.id, id));
    await logActivity({ projectId: pid, boardId: id, userId: uid(request), action: 'delete', entityType: 'board' });
    return { ok: true };
  });

  // ─────────────── Groups ───────────────
  fastify.post('/boards/:id/groups', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const b = request.body as any;
    const cnt = await db.select({ c: sql<number>`count(*)` }).from(pmGroups).where(eq(pmGroups.boardId, bid));
    const [g] = await db.insert(pmGroups).values({
      boardId: bid, name: b.name || '새 그룹', color: b.color ?? null, orderIndex: Number(cnt[0]?.c ?? 0),
    }).returning();
    return { group: g };
  });

  fastify.put('/groups/:id', async (request, reply) => {
    const gid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfGroup(gid), 'editor'))) return;
    const b = request.body as any;
    const [g] = await db.update(pmGroups).set({
      name: b.name, color: b.color, orderIndex: b.orderIndex, collapsed: b.collapsed,
    }).where(eq(pmGroups.id, gid)).returning();
    return { group: g };
  });

  fastify.delete('/groups/:id', async (request, reply) => {
    const gid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfGroup(gid), 'editor'))) return;
    await db.delete(pmGroups).where(eq(pmGroups.id, gid));
    return { ok: true };
  });

  // ─────────────── Columns ───────────────
  fastify.post('/boards/:id/columns', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const b = request.body as any;
    if (!b?.type) return reply.code(400).send({ error: 'type required' });
    const cnt = await db.select({ c: sql<number>`count(*)` }).from(pmColumns).where(eq(pmColumns.boardId, bid));
    const [c] = await db.insert(pmColumns).values({
      boardId: bid, name: b.name || '새 컬럼', type: b.type,
      settings: b.settings ?? {}, orderIndex: Number(cnt[0]?.c ?? 0), width: b.width ?? 160,
    }).returning();
    return { column: c };
  });

  fastify.put('/columns/:id', async (request, reply) => {
    const cid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfColumn(cid), 'editor'))) return;
    const b = request.body as any;
    const [c] = await db.update(pmColumns).set({
      name: b.name, settings: b.settings, orderIndex: b.orderIndex, width: b.width,
    }).where(eq(pmColumns.id, cid)).returning();
    return { column: c };
  });

  fastify.delete('/columns/:id', async (request, reply) => {
    const cid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfColumn(cid), 'editor'))) return;
    await db.delete(pmColumns).where(eq(pmColumns.id, cid));
    return { ok: true };
  });

  // ─────────────── Items ───────────────
  fastify.post('/groups/:id/items', async (request, reply) => {
    const gid = Number((request.params as any).id);
    const pid = await projectIdOfGroup(gid);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    const [g] = await db.select().from(pmGroups).where(eq(pmGroups.id, gid)).limit(1);
    if (!g) return reply.code(404).send({ error: 'group not found' });
    const b = request.body as any;
    const cnt = await db.select({ c: sql<number>`count(*)` }).from(pmItems).where(eq(pmItems.groupId, gid));
    const [it] = await db.insert(pmItems).values({
      boardId: g.boardId, groupId: gid, parentItemId: b?.parentItemId ?? null,
      name: b?.name || '새 아이템', orderIndex: Number(cnt[0]?.c ?? 0), createdBy: uid(request),
    }).returning();
    await logActivity({ projectId: pid, boardId: g.boardId, itemId: it!.id, userId: uid(request), action: 'create', entityType: 'item', diff: { name: it!.name } });
    return { item: it };
  });

  fastify.get('/items/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfItem(id), 'viewer'))) return;
    const [it] = await db.select().from(pmItems).where(eq(pmItems.id, id)).limit(1);
    if (!it) return reply.code(404).send({ error: 'not found' });
    const cells = await db.select().from(pmCells).where(eq(pmCells.itemId, id));
    const subitems = await db.select().from(pmItems).where(eq(pmItems.parentItemId, id)).orderBy(asc(pmItems.orderIndex));
    return { item: it, cells, subitems };
  });

  fastify.put('/items/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const pid = await projectIdOfItem(id);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    const b = request.body as any;
    const [it] = await db.update(pmItems).set({
      name: b.name, groupId: b.groupId, orderIndex: b.orderIndex, updatedAt: new Date(),
    }).where(eq(pmItems.id, id)).returning();
    await logActivity({ projectId: pid, itemId: id, userId: uid(request), action: 'update', entityType: 'item' });
    return { item: it };
  });

  fastify.delete('/items/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const pid = await projectIdOfItem(id);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    await db.delete(pmItems).where(eq(pmItems.id, id));
    await logActivity({ projectId: pid, itemId: id, userId: uid(request), action: 'delete', entityType: 'item' });
    return { ok: true };
  });

  // ─────────────── Cells ───────────────
  fastify.put('/items/:id/cells/:columnId', async (request, reply) => {
    const itemId = Number((request.params as any).id);
    const columnId = Number((request.params as any).columnId);
    const pid = await projectIdOfItem(itemId);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    const [col] = await db.select().from(pmColumns).where(eq(pmColumns.id, columnId)).limit(1);
    if (!col) return reply.code(404).send({ error: 'column not found' });
    const value = (request.body as any)?.value ?? {};
    const err = validateCellValue(col.type, value);
    if (err) return reply.code(400).send({ error: err });
    await db.insert(pmCells).values({ itemId, columnId, value })
      .onConflictDoUpdate({ target: [pmCells.itemId, pmCells.columnId], set: { value, updatedAt: new Date() } });
    await logActivity({ projectId: pid, itemId, userId: uid(request), action: 'set_cell', entityType: 'cell', diff: { columnId, value } });
    return { ok: true };
  });

  fastify.post('/items/:id/cells/bulk', async (request, reply) => {
    const itemId0 = Number((request.params as any).id);
    const pid = await projectIdOfItem(itemId0);
    if (!(await guard(request, reply, pid, 'editor'))) return;
    const cells = ((request.body as any)?.cells ?? []) as Array<{ itemId: number; columnId: number; value: any }>;
    const colCache = new Map<number, string>();
    for (const c of cells) {
      let t = colCache.get(c.columnId);
      if (!t) {
        const [col] = await db.select().from(pmColumns).where(eq(pmColumns.id, c.columnId)).limit(1);
        if (!col) continue;
        t = col.type; colCache.set(c.columnId, t);
      }
      if (validateCellValue(t, c.value)) continue;
      await db.insert(pmCells).values({ itemId: c.itemId, columnId: c.columnId, value: c.value })
        .onConflictDoUpdate({ target: [pmCells.itemId, pmCells.columnId], set: { value: c.value, updatedAt: new Date() } });
    }
    await logActivity({ projectId: pid, itemId: itemId0, userId: uid(request), action: 'set_cells_bulk', entityType: 'cell', diff: { count: cells.length } });
    return { ok: true, count: cells.length };
  });

  // ─────────────── Reorder ───────────────
  fastify.put('/boards/:id/items/reorder', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const ord = ((request.body as any)?.order ?? []) as Array<{ id: number; groupId: number; orderIndex: number }>;
    for (const o of ord) {
      await db.update(pmItems).set({ groupId: o.groupId, orderIndex: o.orderIndex }).where(eq(pmItems.id, o.id));
    }
    return { ok: true };
  });

  fastify.put('/boards/:id/columns/reorder', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const ord = ((request.body as any)?.order ?? []) as Array<{ id: number; orderIndex: number }>;
    for (const o of ord) {
      await db.update(pmColumns).set({ orderIndex: o.orderIndex }).where(eq(pmColumns.id, o.id));
    }
    return { ok: true };
  });

  // ─────────────── Updates (comments) ───────────────
  fastify.get('/items/:id/updates', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfItem(id), 'viewer'))) return;
    const rows = await db
      .select({
        id: pmUpdates.id,
        itemId: pmUpdates.itemId,
        userId: pmUpdates.userId,
        body: pmUpdates.body,
        createdAt: pmUpdates.createdAt,
        authorEmail: users.email,
      })
      .from(pmUpdates)
      .leftJoin(users, eq(pmUpdates.userId, users.id))
      .where(eq(pmUpdates.itemId, id))
      .orderBy(desc(pmUpdates.createdAt));
    return { updates: rows };
  });

  fastify.post('/items/:id/updates', async (request, reply) => {
    const id = Number((request.params as any).id);
    // viewer 도 코멘트 가능 (스펙 7장)
    if (!(await guard(request, reply, await projectIdOfItem(id), 'viewer'))) return;
    const body = (request.body as any)?.body;
    if (!body) return reply.code(400).send({ error: 'body required' });
    const [u] = await db.insert(pmUpdates).values({ itemId: id, userId: uid(request), body }).returning();
    return { update: u };
  });

  // ─────────────── Dependencies (Gantt 의존선, REQ-15) ───────────────
  fastify.post('/boards/:id/dependencies', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const b = request.body as any;
    const predecessorItemId = Number(b?.predecessorItemId);
    const successorItemId = Number(b?.successorItemId);
    const type = ['FS', 'SS', 'FF', 'SF'].includes(b?.type) ? b.type : 'FS';
    const lagDays = Number.isFinite(Number(b?.lagDays)) ? Number(b.lagDays) : 0;
    if (!predecessorItemId || !successorItemId) return reply.code(400).send({ error: 'predecessorItemId, successorItemId required' });
    if (predecessorItemId === successorItemId) return reply.code(400).send({ error: 'self dependency not allowed' });
    // 두 작업이 모두 이 보드 소속인지 검증
    const items = await db.select({ id: pmItems.id }).from(pmItems)
      .where(and(eq(pmItems.boardId, bid), inArray(pmItems.id, [predecessorItemId, successorItemId])));
    if (items.length !== 2) return reply.code(400).send({ error: 'items must belong to this board' });
    const [dep] = await db.insert(pmDependencies)
      .values({ boardId: bid, predecessorItemId, successorItemId, type, lagDays })
      .onConflictDoUpdate({
        target: [pmDependencies.predecessorItemId, pmDependencies.successorItemId],
        set: { type, lagDays },
      })
      .returning();
    return { dependency: dep };
  });

  fastify.delete('/dependencies/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const [dep] = await db.select().from(pmDependencies).where(eq(pmDependencies.id, id)).limit(1);
    if (!dep) return reply.code(404).send({ error: 'not found' });
    if (!(await guard(request, reply, await projectIdOfBoard(dep.boardId), 'editor'))) return;
    await db.delete(pmDependencies).where(eq(pmDependencies.id, id));
    return { ok: true };
  });

  // ─────────────── Views ───────────────
  fastify.get('/boards/:id/views', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'viewer'))) return;
    const rows = await db.select().from(pmViews).where(
      and(eq(pmViews.boardId, bid), or(eq(pmViews.scope, 'shared'), eq(pmViews.ownerUserId, uid(request)))!),
    );
    return { views: rows };
  });

  fastify.post('/boards/:id/views', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'editor'))) return;
    const b = request.body as any;
    const [v] = await db.insert(pmViews).values({
      boardId: bid, name: b.name || '새 뷰', type: b.type || 'table',
      config: b.config ?? {}, isDefault: !!b.isDefault,
      scope: b.scope === 'personal' ? 'personal' : 'shared',
      ownerUserId: b.scope === 'personal' ? uid(request) : null,
    }).returning();
    return { view: v };
  });

  fastify.put('/views/:id', async (request, reply) => {
    const vid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfView(vid), 'editor'))) return;
    const b = request.body as any;
    const [v] = await db.update(pmViews).set({
      name: b.name, config: b.config, isDefault: b.isDefault,
    }).where(eq(pmViews.id, vid)).returning();
    return { view: v };
  });

  fastify.delete('/views/:id', async (request, reply) => {
    const vid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfView(vid), 'editor'))) return;
    await db.delete(pmViews).where(eq(pmViews.id, vid));
    return { ok: true };
  });

  // ─────────────── Activity log ───────────────
  fastify.get('/projects/:id/activity', async (request, reply) => {
    const id = Number((request.params as any).id);
    if (!(await guard(request, reply, id, 'viewer'))) return;
    const rows = await db.select().from(pmActivityLog)
      .where(eq(pmActivityLog.projectId, id)).orderBy(desc(pmActivityLog.createdAt)).limit(200);
    return { activity: rows };
  });

  // ─────────────── Search ───────────────
  fastify.get('/search', async (request) => {
    const q = String((request.query as any)?.q || '').trim();
    if (!q) return { projects: [], boards: [], items: [] };
    const userId = uid(request);
    const isAdmin = grole(request) === 'admin';
    const myProjIds = isAdmin
      ? (await db.select({ id: pmProjects.id }).from(pmProjects)).map((r) => r.id)
      : (await db.select({ id: pmMemberships.projectId }).from(pmMemberships)
          .where(eq(pmMemberships.userId, userId))).map((r) => r.id);
    if (myProjIds.length === 0) return { projects: [], boards: [], items: [] };
    const like = `%${q}%`;
    const projects = await db.select().from(pmProjects)
      .where(and(inArray(pmProjects.id, myProjIds), ilike(pmProjects.name, like))!).limit(20);
    const boards = await db.select().from(pmBoards)
      .where(and(inArray(pmBoards.projectId, myProjIds), ilike(pmBoards.name, like))!).limit(20);
    const items = await db.select({ i: pmItems, projectId: pmBoards.projectId }).from(pmItems)
      .innerJoin(pmBoards, eq(pmBoards.id, pmItems.boardId))
      .where(and(inArray(pmBoards.projectId, myProjIds), ilike(pmItems.name, like))!).limit(40)
      .then((r) => r.map((x) => ({ ...x.i, projectId: x.projectId })));
    return { projects, boards, items };
  });

  // ─────────────── Export (단일 슬라이드 PPTX) ───────────────
  fastify.post('/boards/:id/export', async (request, reply) => {
    const bid = Number((request.params as any).id);
    if (!(await guard(request, reply, await projectIdOfBoard(bid), 'viewer'))) return;
    const data = await assembleBoardData(bid);
    if (!data) return reply.code(404).send({ error: 'board not found' });
    const opts = (request.body as any) ?? {};
    const [proj] = await db.select().from(pmProjects).where(eq(pmProjects.id, data.board.projectId)).limit(1);
    const { buffer, filename, meta } = await exportBoardPptx(data, proj?.name ?? 'Project', opts);
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      .header('X-PM-Export-Meta', JSON.stringify(meta));
    return reply.send(buffer);
  });
}
