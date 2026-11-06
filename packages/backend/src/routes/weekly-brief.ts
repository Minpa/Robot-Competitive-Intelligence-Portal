/**
 * 주간 브리프 라우트.
 *
 *  - weeklyBriefRoutes      (/api/weekly-brief)        : 조회 GET 3개 — 로그인(Bearer) 필요, 역할 무관
 *  - weeklyBriefAdminRoutes (/api/admin/weekly-brief)  : 수동 생성/상태, v3 초안 목록·편집·발행·내리기 — adminOnly
 *
 * 사용자 조회 API 는 항상 발행본(weekly_briefs)만 돌려준다. 초안 존재 여부는 사용자에게 노출하지 않는다.
 *
 * 공통 오류 형식은 `{ error: '<code>' }`. 응답에는 tokens, cost, error, stats 를 싣지 않는다
 * (서비스가 WeeklyBriefResponse 로만 돌려준다).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole } from './auth.js';
import {
  getAdminEdits,
  getBriefByWeek,
  getLatestBrief,
  getWeeklyBriefRunStatus,
  listBriefs,
  listDrafts,
  publishDraft,
  saveEdits,
  startWeeklyBriefGeneration,
  unpublishDraft,
} from '../services/weekly-brief.service.js';
import { isMondayYmd, isValidYmd } from '../services/weekly-brief-period.js';

const adminOnly = [authMiddleware, requireRole('admin')];

const WEEK_START_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeekStart(v: string): boolean {
  return WEEK_START_RE.test(v) && isValidYmd(v) && isMondayYmd(v);
}

const GenerateBodySchema = z
  .object({
    weekStart: z.string().optional(),
    force: z.boolean().optional(),
    /** 편집이 있는 초안(또는 발행된 주)을 재생성할 때 기존 편집을 버린다 */
    discardEdits: z.boolean().optional(),
  })
  .strict();

/** PATCH edits 본문 — 경로 → 문자열(또는 null = AI 원문으로 되돌리기). 항목 수 상한 200 */
const EditBodySchema = z
  .object({
    rev: z.number().int().min(0),
    edits: z.record(z.string().min(1).max(300), z.union([z.string(), z.null()])).refine((o) => Object.keys(o).length <= 200, { message: 'too_many_edits' }),
  })
  .strict();

const RevBodySchema = z.object({ rev: z.number().int().min(0) }).strict();

/** 이력에 남기는 편집자 식별자 (이메일 또는 사용자 id — 비밀값 아님) */
function actorOf(request: { user?: { email?: string; userId?: string } | null }): string | null {
  const id = request.user?.email || request.user?.userId || null;
  return id ? String(id).slice(0, 100) : null;
}

export const DEFAULT_LIST_LIMIT = 26;

export function clampLimit(raw: unknown): number {
  const n = typeof raw === 'string' || typeof raw === 'number' ? Math.trunc(Number(raw)) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_LIST_LIMIT;
  return Math.min(52, Math.max(1, n));
}

export async function weeklyBriefRoutes(fastify: FastifyInstance) {
  // 정적 경로(/latest)는 파라미터 경로(/:weekStart)보다 우선한다
  fastify.get('/latest', { preHandler: authMiddleware }, async (_request, reply) => {
    const brief = await getLatestBrief();
    if (!brief) return reply.status(404).send({ error: 'not_found' });
    return brief;
  });

  fastify.get<{ Querystring: { limit?: string } }>('/', { preHandler: authMiddleware }, async (request) => {
    return { items: await listBriefs(clampLimit(request.query?.limit)) };
  });

  fastify.get<{ Params: { weekStart: string } }>('/:weekStart', { preHandler: authMiddleware }, async (request, reply) => {
    const { weekStart } = request.params;
    if (!isValidWeekStart(weekStart)) return reply.status(400).send({ error: 'invalid_week_start' });
    const brief = await getBriefByWeek(weekStart);
    if (!brief) return reply.status(404).send({ error: 'not_found' });
    return brief;
  });
}

export async function weeklyBriefAdminRoutes(fastify: FastifyInstance) {
  fastify.post('/generate', { preHandler: adminOnly }, async (request, reply) => {
    const parsed = GenerateBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const weekStartIssue = parsed.error.issues.some((i) => i.path[0] === 'weekStart');
      return reply.status(400).send({ error: weekStartIssue ? 'invalid_week_start' : 'invalid_body' });
    }
    const { weekStart, force, discardEdits } = parsed.data;
    if (weekStart !== undefined && !isValidWeekStart(weekStart)) {
      return reply.status(400).send({ error: 'invalid_week_start' });
    }

    const result = await startWeeklyBriefGeneration({ weekStart, force, discardEdits, actor: actorOf(request) });
    if (result.started) {
      return reply.status(202).send({ started: true, weekStart: result.weekStart, force: result.force, startedAt: result.startedAt });
    }
    if (result.skipped === 'invalid') return reply.status(400).send({ error: result.error });
    if (result.skipped === 'exists') {
      return reply.status(200).send({ started: false, skipped: 'exists', weekStart: result.weekStart });
    }
    if (result.skipped === 'has_edits') return reply.status(409).send({ error: 'has_edits' });
    return reply.status(409).send({ error: 'already_running' });
  });

  fastify.get('/status', { preHandler: adminOnly }, async () => getWeeklyBriefRunStatus());

  // ── v3 초안: 목록 · 편집 조회 · 편집 저장 · 발행 · 내리기
  fastify.get('/drafts', { preHandler: adminOnly }, async () => ({ items: await listDrafts() }));

  fastify.get<{ Params: { weekStart: string } }>('/:weekStart/edits', { preHandler: adminOnly }, async (request, reply) => {
    const { weekStart } = request.params;
    if (!isValidWeekStart(weekStart)) return reply.status(400).send({ error: 'invalid_week_start' });
    const r = await getAdminEdits(weekStart);
    if (!r.ok) return reply.status(404).send({ error: 'not_found' });
    return r.value;
  });

  fastify.patch<{ Params: { weekStart: string } }>('/:weekStart/edits', { preHandler: adminOnly }, async (request, reply) => {
    const { weekStart } = request.params;
    if (!isValidWeekStart(weekStart)) return reply.status(400).send({ error: 'invalid_week_start' });
    const parsed = EditBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_body' });
    const r = await saveEdits(weekStart, { rev: parsed.data.rev, edits: parsed.data.edits, by: actorOf(request) });
    if (r.ok) return { rev: r.rev, editedAt: r.editedAt, warnings: r.warnings };
    if (r.error === 'not_found') return reply.status(404).send({ error: 'not_found' });
    if (r.error === 'rev_conflict') return reply.status(409).send({ error: 'rev_conflict' });
    return reply.status(400).send({ error: 'invalid_edit', code: r.code, path: r.path });
  });

  fastify.post<{ Params: { weekStart: string } }>('/:weekStart/publish', { preHandler: adminOnly }, async (request, reply) => {
    const { weekStart } = request.params;
    if (!isValidWeekStart(weekStart)) return reply.status(400).send({ error: 'invalid_week_start' });
    const parsed = RevBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_body' });
    const r = await publishDraft(weekStart, { rev: parsed.data.rev, by: actorOf(request) });
    if (r.ok) return { publishState: r.publishState, publishedAt: r.publishedAt };
    if (r.error === 'not_found') return reply.status(404).send({ error: 'not_found' });
    if (r.error === 'rev_conflict') return reply.status(409).send({ error: 'rev_conflict' });
    return reply.status(422).send({ error: 'guard_failed', violations: r.violations ?? [] });
  });

  fastify.post<{ Params: { weekStart: string } }>('/:weekStart/unpublish', { preHandler: adminOnly }, async (request, reply) => {
    const { weekStart } = request.params;
    if (!isValidWeekStart(weekStart)) return reply.status(400).send({ error: 'invalid_week_start' });
    const r = await unpublishDraft(weekStart, { by: actorOf(request) });
    if (!r.ok) return reply.status(404).send({ error: 'not_found' });
    return { publishState: r.publishState };
  });
}
