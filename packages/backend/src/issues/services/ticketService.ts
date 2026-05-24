// ARGOS Issue Tracking — ticket service. CRUD + state machine + activity.
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  issueTickets, issueComments, issueActivity, issueTicketLinks, issueNotifications, users,
} from '../../db/schema.js';
import type { TicketCreate, TicketPatch } from '../schemas.js';

const STATUS_GRAPH: Record<string, string[]> = {
  draft: ['triaged', 'cancelled'],
  triaged: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'done', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: ['in_progress'], // reopen
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (STATUS_GRAPH[from] ?? []).includes(to);
}

export async function nextTicketCode(): Promise<string> {
  const r = await db.execute(sql`SELECT nextval('issue_ticket_seq') as next`);
  const n = Number((r as any).rows?.[0]?.next ?? (r as any)[0]?.next ?? 0);
  return `ARG-${String(n).padStart(3, '0')}`;
}

async function ticketIdByCode(code: string): Promise<string | null> {
  const r = await db.select({ id: issueTickets.id }).from(issueTickets).where(eq(issueTickets.code, code)).limit(1);
  return r[0]?.id ?? null;
}

async function logActivity(ticketId: string, actorId: string | null, actionType: string, payload: any = {}) {
  try { await db.insert(issueActivity).values({ ticketId, actorId, actionType, payload }); }
  catch { /* silent */ }
}

export async function createTicket(reporterId: string, b: TicketCreate) {
  const code = await nextTicketCode();
  let parentTicketId: string | null = null;
  if (b.parentTicketCode) {
    const pid = await ticketIdByCode(b.parentTicketCode);
    if (!pid) throw new Error(`parent ${b.parentTicketCode} not found`);
    // depth-2: parent itself must not have a parent
    const [parent] = await db.select().from(issueTickets).where(eq(issueTickets.id, pid)).limit(1);
    if (!parent) throw new Error('parent missing');
    if (parent.parentTicketId) throw new Error('depth-2: 부모가 이미 자식임 (sub-sub-task 금지)');
    parentTicketId = pid;
  }
  const [t] = await db.insert(issueTickets).values({
    code, title: b.title, description: b.description ?? '',
    priority: b.priority ?? 'M', type: b.type ?? 'task',
    parentTicketId, reporterId,
    ownerId: b.ownerId ?? null,
    dueAt: b.dueAt ? new Date(b.dueAt) : null,
    linkedCompetitorIds: b.linkedCompetitorIds ?? [],
    linkedStrategyDocIds: b.linkedStrategyDocIds ?? [],
    linkedKeywordIds: b.linkedKeywordIds ?? [],
  }).returning();
  await logActivity(t!.id, reporterId, 'created', {});
  if (t!.ownerId) await logActivity(t!.id, reporterId, 'assigned', { from: null, to: t!.ownerId });
  return t!;
}

export async function getTicketByIdOrCode(idOrCode: string) {
  const isUuid = /^[0-9a-f]{8}-/i.test(idOrCode);
  const where = isUuid ? eq(issueTickets.id, idOrCode) : eq(issueTickets.code, idOrCode);
  const [t] = await db.select().from(issueTickets).where(where).limit(1);
  return t ?? null;
}

export async function patchTicket(id: string, actorId: string, b: TicketPatch) {
  const [cur] = await db.select().from(issueTickets).where(eq(issueTickets.id, id)).limit(1);
  if (!cur) throw new Error('ticket not found');

  const updates: any = { updatedAt: new Date() };
  const activities: Array<{ type: string; payload: any }> = [];

  if (b.title != null && b.title !== cur.title) updates.title = b.title;
  if (b.description != null && b.description !== cur.description) updates.description = b.description;
  if (b.priority && b.priority !== cur.priority) {
    updates.priority = b.priority;
    activities.push({ type: 'priority_changed', payload: { from: cur.priority, to: b.priority } });
  }
  if (b.type && b.type !== cur.type) {
    updates.type = b.type;
    activities.push({ type: 'type_changed', payload: { from: cur.type, to: b.type } });
  }
  if (b.status && b.status !== cur.status) {
    if (!canTransition(cur.status, b.status)) {
      const e: any = new Error(`invalid transition ${cur.status}→${b.status}`); e.statusCode = 409; throw e;
    }
    // auto-rules
    if (b.status === 'triaged' && !cur.ownerId && !b.ownerId) {
      const e: any = new Error('triaged: ownerId required'); e.statusCode = 400; throw e;
    }
    if (b.status === 'done') updates.closedAt = new Date();
    if (cur.status === 'done' && b.status === 'in_progress') updates.closedAt = null;
    updates.status = b.status;
    activities.push({ type: 'status_changed', payload: { from: cur.status, to: b.status } });
    if (b.status === 'done') activities.push({ type: 'closed', payload: {} });
    if (cur.status === 'done' && b.status === 'in_progress') activities.push({ type: 'reopened', payload: {} });
  }
  if (b.ownerId !== undefined && b.ownerId !== cur.ownerId) {
    updates.ownerId = b.ownerId;
    activities.push({ type: 'assigned', payload: { from: cur.ownerId, to: b.ownerId } });
  }
  if (b.dueAt !== undefined) {
    const d = b.dueAt ? new Date(b.dueAt) : null;
    if ((cur.dueAt?.toISOString() ?? null) !== (d?.toISOString() ?? null)) {
      updates.dueAt = d;
      activities.push({ type: 'due_changed', payload: { from: cur.dueAt, to: d } });
    }
  }
  if (b.parentTicketCode !== undefined) {
    let parentTicketId: string | null = null;
    if (b.parentTicketCode) {
      const pid = await ticketIdByCode(b.parentTicketCode);
      if (!pid) throw new Error(`parent ${b.parentTicketCode} not found`);
      const [parent] = await db.select().from(issueTickets).where(eq(issueTickets.id, pid)).limit(1);
      if (parent?.parentTicketId) throw new Error('depth-2 violation');
      parentTicketId = pid;
    }
    if (parentTicketId !== cur.parentTicketId) {
      updates.parentTicketId = parentTicketId;
      activities.push({ type: 'parent_changed', payload: { from: cur.parentTicketId, to: parentTicketId } });
    }
  }
  if (b.linkedCompetitorIds) updates.linkedCompetitorIds = b.linkedCompetitorIds;
  if (b.linkedStrategyDocIds) updates.linkedStrategyDocIds = b.linkedStrategyDocIds;
  if (b.linkedKeywordIds) updates.linkedKeywordIds = b.linkedKeywordIds;

  const [upd] = await db.update(issueTickets).set(updates).where(eq(issueTickets.id, id)).returning();
  for (const a of activities) await logActivity(id, actorId, a.type, a.payload);
  // 알림 — assigned (변경된 owner 가 actor 아닐 때)
  if (updates.ownerId && updates.ownerId !== actorId) {
    try { await db.insert(issueNotifications).values({
      recipientId: updates.ownerId, ticketId: id, type: 'assigned',
      payload: { code: cur.code, by: actorId },
    }); } catch {}
  }
  return upd!;
}

// 자식 (Epic 의 하위 또는 일반 부모의 직계 자식)
export async function listChildren(parentId: string) {
  return db.select().from(issueTickets)
    .where(eq(issueTickets.parentTicketId, parentId))
    .orderBy(asc(issueTickets.createdAt));
}

// 티켓 링크 — 양방향 조회, 역방향 라벨은 프론트가 direction 으로 처리.
export async function listLinks(ticketId: string) {
  const out = await db.select().from(issueTicketLinks).where(eq(issueTicketLinks.fromTicketId, ticketId));
  const inn = await db.select().from(issueTicketLinks).where(eq(issueTicketLinks.toTicketId, ticketId));
  const otherIds = Array.from(new Set([...out.map(l => l.toTicketId), ...inn.map(l => l.fromTicketId)]));
  const others = otherIds.length
    ? await db.select({ id: issueTickets.id, code: issueTickets.code, title: issueTickets.title, status: issueTickets.status })
        .from(issueTickets).where(inArray(issueTickets.id, otherIds))
    : [];
  const om = new Map(others.map(o => [o.id, o]));
  return [
    ...out.map(l => ({ id: l.id, direction: 'outgoing' as const, relation: l.relation, createdBy: l.createdBy, createdAt: l.createdAt,
      otherTicket: om.get(l.toTicketId) })),
    ...inn.map(l => ({ id: l.id, direction: 'incoming' as const, relation: l.relation, createdBy: l.createdBy, createdAt: l.createdAt,
      otherTicket: om.get(l.fromTicketId) })),
  ];
}

export async function createLink(fromTicketId: string, toCode: string, relation: string, actorId: string) {
  const toId = await ticketIdByCode(toCode);
  if (!toId) throw new Error(`대상 ${toCode} 없음`);
  if (toId === fromTicketId) throw new Error('자기 자신과 링크 불가');
  // blocks 사이클 차단 (간단: 직접 reverse blocks 가 있으면 reject)
  if (relation === 'blocks') {
    const reverse = await db.select().from(issueTicketLinks).where(and(
      eq(issueTicketLinks.fromTicketId, toId),
      eq(issueTicketLinks.toTicketId, fromTicketId),
      eq(issueTicketLinks.relation, 'blocks'),
    )!).limit(1);
    if (reverse.length) throw new Error('blocks 사이클 — 역방향 blocks 가 이미 있음');
  }
  const [link] = await db.insert(issueTicketLinks).values({
    fromTicketId, toTicketId: toId, relation, createdBy: actorId,
  }).onConflictDoNothing().returning();
  if (link) await logActivity(fromTicketId, actorId, 'ticket_linked', { linkId: link.id, toCode, relation });
  return link;
}

export async function deleteLink(linkId: string, actorId: string) {
  const [link] = await db.select().from(issueTicketLinks).where(eq(issueTicketLinks.id, linkId)).limit(1);
  if (!link) return;
  await db.delete(issueTicketLinks).where(eq(issueTicketLinks.id, linkId));
  await logActivity(link.fromTicketId, actorId, 'ticket_unlinked', { linkId, relation: link.relation });
}

// 상세 — 코멘트·활동·링크·자식 한 번에
export async function getTicketDetail(idOrCode: string) {
  const t = await getTicketByIdOrCode(idOrCode);
  if (!t) return null;
  const [comments, activity, links, children, reporter, owner, parent] = await Promise.all([
    db.select({
      id: issueComments.id, body: issueComments.body, isAiGenerated: issueComments.isAiGenerated,
      mentionedUserIds: issueComments.mentionedUserIds, createdAt: issueComments.createdAt,
      editedAt: issueComments.editedAt, authorId: issueComments.authorId, authorEmail: users.email,
    }).from(issueComments).leftJoin(users, eq(users.id, issueComments.authorId))
      .where(eq(issueComments.ticketId, t.id)).orderBy(asc(issueComments.createdAt)),
    db.select().from(issueActivity).where(eq(issueActivity.ticketId, t.id)).orderBy(desc(issueActivity.at)).limit(50),
    listLinks(t.id),
    t.type === 'epic' ? listChildren(t.id) : Promise.resolve([] as any[]),
    db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, t.reporterId)).limit(1),
    t.ownerId ? db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, t.ownerId)).limit(1) : Promise.resolve([]),
    t.parentTicketId
      ? db.select({ code: issueTickets.code, title: issueTickets.title }).from(issueTickets).where(eq(issueTickets.id, t.parentTicketId)).limit(1)
      : Promise.resolve([]),
  ]);
  return {
    ...t,
    reporter: reporter[0] ?? null,
    owner: owner[0] ?? null,
    parent: parent[0] ?? null,
    comments, activity, links, children,
  };
}

// 목록 (필터 + cursor 페이지네이션)
export async function listTickets(params: {
  status?: string[]; priority?: string[]; type?: string[];
  reporterId?: string; ownerId?: string; parentTicketId?: string;
  competitorId?: string; hasOverdue?: boolean; createdAfter?: string;
  cursor?: string; limit?: number;
}) {
  const lim = Math.min(params.limit ?? 20, 100);
  const conds: any[] = [];
  if (params.status?.length) conds.push(inArray(issueTickets.status, params.status));
  if (params.priority?.length) conds.push(inArray(issueTickets.priority, params.priority));
  if (params.type?.length) conds.push(inArray(issueTickets.type, params.type));
  if (params.reporterId) conds.push(eq(issueTickets.reporterId, params.reporterId));
  if (params.ownerId) conds.push(eq(issueTickets.ownerId, params.ownerId));
  if (params.parentTicketId) conds.push(eq(issueTickets.parentTicketId, params.parentTicketId));
  if (params.competitorId) conds.push(sql`${issueTickets.linkedCompetitorIds} @> ${JSON.stringify([params.competitorId])}::jsonb`);
  if (params.hasOverdue) conds.push(sql`${issueTickets.dueAt} < NOW() AND ${issueTickets.status} NOT IN ('done','cancelled')`);
  if (params.createdAfter) conds.push(sql`${issueTickets.createdAt} > ${params.createdAfter}`);
  if (params.cursor) {
    try { const c = JSON.parse(Buffer.from(params.cursor, 'base64').toString()); conds.push(sql`${issueTickets.createdAt} < ${c.t}`); } catch {}
  }
  const where = conds.length ? and(...conds) : undefined;
  const items = await db.select().from(issueTickets).where(where!).orderBy(desc(issueTickets.createdAt)).limit(lim + 1);
  let nextCursor: string | null = null;
  if (items.length > lim) {
    items.pop();
    const last = items[items.length - 1];
    nextCursor = Buffer.from(JSON.stringify({ t: last!.createdAt.toISOString() })).toString('base64');
  }
  return { items, nextCursor };
}

export async function searchTickets(q: string, limit = 10) {
  const like = `%${q}%`;
  return db.select().from(issueTickets)
    .where(sql`${issueTickets.title} ILIKE ${like} OR ${issueTickets.code} ILIKE ${like}`)
    .orderBy(desc(issueTickets.createdAt)).limit(limit);
}

export { logActivity };
