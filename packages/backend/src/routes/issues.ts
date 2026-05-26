// ARGOS Issue Tracking — Fastify route handlers (spec §4).
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from './auth.js';
import { db } from '../db/index.js';
import {
  issueTickets, issueComments, issueNotifications, users,
} from '../db/schema.js';
import {
  TicketCreateSchema, TicketPatchSchema, TicketLinkCreateSchema, CommentCreateSchema, AskSchema,
} from '../issues/schemas.js';
import {
  createTicket, getTicketByIdOrCode, getTicketDetail, patchTicket, listTickets,
  listChildren, listLinks, createLink, deleteLink, logActivity, searchTickets,
} from '../issues/services/ticketService.js';
import { askEntry, listAskHistory, deleteAskHistory, clearAskHistory } from '../issues/services/askService.js';

function uid(r: FastifyRequest) { return r.user!.userId as string; }

function badRequest(reply: FastifyReply, msg: string, code?: string) {
  return reply.code(400).send({ error: msg, code });
}

export async function issueRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // ─────────────── Tickets ───────────────
  fastify.post('/tickets', async (request, reply) => {
    const parsed = TicketCreateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.message, 'validation');
    try {
      const t = await createTicket(uid(request), parsed.data);
      return { ticket: t };
    } catch (e: any) {
      return reply.code(e.statusCode ?? 400).send({ error: e.message });
    }
  });

  fastify.get('/tickets', async (request) => {
    const q = request.query as any;
    const arr = (v: any) => (Array.isArray(v) ? v : v ? String(v).split(',') : undefined);
    const { items, nextCursor } = await listTickets({
      status: arr(q.status), priority: arr(q.priority), type: arr(q.type),
      reporterId: q.reporterId || undefined,
      ownerId: q.ownerId || undefined,
      parentTicketId: q.parentTicketId || undefined,
      competitorId: q.competitorId || undefined,
      hasOverdue: q.hasOverdue === 'true' || q.hasOverdue === true,
      createdAfter: q.createdAfter,
      cursor: q.cursor,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { items, nextCursor };
  });

  fastify.get('/tickets/:idOrCode', async (request, reply) => {
    const idOrCode = (request.params as any).idOrCode;
    const data = await getTicketDetail(idOrCode);
    if (!data) return reply.code(404).send({ error: 'not found' });
    return { ticket: data };
  });

  fastify.patch('/tickets/:id', async (request, reply) => {
    const parsed = TicketPatchSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.message, 'validation');
    const id = (request.params as any).id;
    try {
      const t = await patchTicket(id, uid(request), parsed.data);
      return { ticket: t };
    } catch (e: any) {
      return reply.code(e.statusCode ?? 400).send({ error: e.message });
    }
  });

  // ─────────────── Comments ───────────────
  fastify.post('/tickets/:id/comments', async (request, reply) => {
    const parsed = CommentCreateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.message, 'validation');
    const id = (request.params as any).id;
    const t = await getTicketByIdOrCode(id);
    if (!t) return reply.code(404).send({ error: 'ticket not found' });
    const [c] = await db.insert(issueComments).values({
      ticketId: t.id, authorId: uid(request),
      body: parsed.data.body,
      mentionedUserIds: parsed.data.mentionedUserIds ?? [],
    }).returning();
    await logActivity(t.id, uid(request), 'commented', { commentId: c!.id, preview: parsed.data.body.slice(0, 80) });
    // 멘션 알림
    for (const mid of parsed.data.mentionedUserIds ?? []) {
      if (mid === uid(request)) continue;
      try { await db.insert(issueNotifications).values({
        recipientId: mid, ticketId: t.id, type: 'mentioned',
        payload: { code: t.code, by: uid(request), commentId: c!.id },
      }); } catch {}
    }
    return { comment: c };
  });

  fastify.get('/tickets/:id/comments', async (request, reply) => {
    const t = await getTicketByIdOrCode((request.params as any).id);
    if (!t) return reply.code(404).send({ error: 'ticket not found' });
    const rows = await db.select({
      id: issueComments.id, body: issueComments.body,
      mentionedUserIds: issueComments.mentionedUserIds,
      isAiGenerated: issueComments.isAiGenerated,
      createdAt: issueComments.createdAt, editedAt: issueComments.editedAt,
      authorId: issueComments.authorId, authorEmail: users.email,
    }).from(issueComments).leftJoin(users, eq(users.id, issueComments.authorId))
      .where(eq(issueComments.ticketId, t.id))
      .orderBy(desc(issueComments.createdAt));
    return { comments: rows };
  });

  fastify.patch('/comments/:id', async (request, reply) => {
    const cid = (request.params as any).id;
    const body = (request.body as any)?.body as string | undefined;
    if (!body?.trim()) return badRequest(reply, 'body required');
    const [c] = await db.select().from(issueComments).where(eq(issueComments.id, cid)).limit(1);
    if (!c) return reply.code(404).send({ error: 'not found' });
    if (c.authorId !== uid(request)) return reply.code(403).send({ error: '본인 코멘트만 수정 가능' });
    const ageMin = (Date.now() - c.createdAt.getTime()) / 60000;
    if (ageMin > 15) return reply.code(403).send({ error: '15분 이내만 수정 가능' });
    const [upd] = await db.update(issueComments).set({ body: body.trim(), editedAt: new Date() })
      .where(eq(issueComments.id, cid)).returning();
    return { comment: upd };
  });

  // ─────────────── Links ───────────────
  fastify.post('/tickets/:id/links', async (request, reply) => {
    const parsed = TicketLinkCreateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.message, 'validation');
    const t = await getTicketByIdOrCode((request.params as any).id);
    if (!t) return reply.code(404).send({ error: 'ticket not found' });
    try {
      const link = await createLink(t.id, parsed.data.toCode, parsed.data.relation, uid(request));
      return { link };
    } catch (e: any) { return reply.code(400).send({ error: e.message }); }
  });

  fastify.get('/tickets/:id/links', async (request, reply) => {
    const t = await getTicketByIdOrCode((request.params as any).id);
    if (!t) return reply.code(404).send({ error: 'ticket not found' });
    return { links: await listLinks(t.id) };
  });

  fastify.delete('/links/:linkId', async (request) => {
    await deleteLink((request.params as any).linkId, uid(request));
    return { ok: true };
  });

  // ─────────────── Children ───────────────
  fastify.get('/tickets/:id/children', async (request, reply) => {
    const t = await getTicketByIdOrCode((request.params as any).id);
    if (!t) return reply.code(404).send({ error: 'ticket not found' });
    return { children: await listChildren(t.id) };
  });

  // ─────────────── Dashboard ───────────────
  fastify.get('/dashboard/overview', async () => {
    const allOpen = await db.select().from(issueTickets)
      .where(sql`${issueTickets.status} NOT IN ('done','cancelled')`)
      .orderBy(desc(issueTickets.priority), desc(issueTickets.createdAt))
      .limit(100);
    const counts = await db.select({
      open: sql<number>`count(*) FILTER (WHERE status NOT IN ('done','cancelled'))`,
      inProgress: sql<number>`count(*) FILTER (WHERE status = 'in_progress')`,
      blocked: sql<number>`count(*) FILTER (WHERE status = 'blocked')`,
      overdue: sql<number>`count(*) FILTER (WHERE due_at < NOW() AND status NOT IN ('done','cancelled'))`,
      doneThisWeek: sql<number>`count(*) FILTER (WHERE status = 'done' AND closed_at > NOW() - INTERVAL '7 days')`,
    }).from(issueTickets);
    return { summary: counts[0], cards: allOpen };
  });

  fastify.get('/dashboard/inbox', async (request) => {
    const me = uid(request);
    const rows = await db.select().from(issueTickets)
      .where(and(
        sql`${issueTickets.status} NOT IN ('done','cancelled')`,
        sql`(${issueTickets.ownerId} = ${me} OR EXISTS (SELECT 1 FROM issue_comments WHERE issue_comments.ticket_id = ${issueTickets.id} AND issue_comments.mentioned_user_ids @> ${JSON.stringify([me])}::jsonb))`,
      )!)
      .orderBy(desc(issueTickets.priority), desc(issueTickets.dueAt))
      .limit(100);
    return { items: rows };
  });

  // ─────────────── Notifications ───────────────
  fastify.get('/notifications', async (request) => {
    const me = uid(request);
    const rows = await db.select().from(issueNotifications)
      .where(eq(issueNotifications.recipientId, me))
      .orderBy(desc(issueNotifications.createdAt)).limit(50);
    return { notifications: rows };
  });

  fastify.post('/notifications/:id/read', async (request) => {
    const id = (request.params as any).id;
    const me = uid(request);
    await db.update(issueNotifications).set({ readAt: new Date() })
      .where(and(eq(issueNotifications.id, id), eq(issueNotifications.recipientId, me))!);
    return { ok: true };
  });

  fastify.post('/notifications/mark-all-read', async (request) => {
    const me = uid(request);
    await db.update(issueNotifications).set({ readAt: new Date() })
      .where(and(eq(issueNotifications.recipientId, me), sql`${issueNotifications.readAt} IS NULL`)!);
    return { ok: true };
  });

  // ─────────────── Search ───────────────
  fastify.get('/search', async (request) => {
    const q = String((request.query as any).q ?? '').trim();
    if (!q) return { items: [] };
    const items = await searchTickets(q, 20);
    return { items };
  });

  // ─────────────── Ask entry (§6.0, §7.2~7.4) ───────────────
  fastify.post('/ask', async (request, reply) => {
    const parsed = AskSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.message);
    try {
      const result = await askEntry(parsed.data.query, uid(request), parsed.data.skipClarification ?? false);
      return result;
    } catch (e: any) {
      return reply.code(500).send({ error: e?.message ?? 'ask failed' });
    }
  });

  // 사용자별 Ask 질의 이력
  fastify.get('/ask/history', async (request) => {
    const items = await listAskHistory(uid(request), 30);
    return { items };
  });

  fastify.delete<{ Params: { id: string } }>('/ask/history/:id', async (request) => {
    await deleteAskHistory(uid(request), request.params.id);
    return { ok: true };
  });

  fastify.delete('/ask/history', async (request) => {
    await clearAskHistory(uid(request));
    return { ok: true };
  });

  // 재 enrichment — MVP 는 동기 호출, 상세 페이지에서 트리거
  fastify.post<{ Params: { id: string } }>('/tickets/:id/enrich', async (request, reply) => {
    const t = await getTicketByIdOrCode((request.params as any).id);
    if (!t) return reply.code(404).send({ error: 'not found' });
    try {
      const { enrichTicket } = await import('../issues/services/askService.js');
      const ai = await enrichTicket(t, uid(request));
      const [upd] = await db.update(issueTickets).set({
        aiSummary: ai.summary, aiSuggestedActions: ai.actions, aiEnrichedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(issueTickets.id, t.id)).returning();
      await logActivity(t.id, uid(request), 'ai_enriched', { fieldsUpdated: ['aiSummary', 'aiSuggestedActions'] });
      return { ticket: upd };
    } catch (e: any) {
      return reply.code(500).send({ error: e?.message ?? 'enrich failed' });
    }
  });
}
