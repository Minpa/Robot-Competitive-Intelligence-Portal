/**
 * 주간 브리프 라우트.
 *
 *  - weeklyBriefRoutes      (/api/weekly-brief)        : 조회 GET 3개 — 로그인(Bearer) 필요, 역할 무관
 *  - weeklyBriefAdminRoutes (/api/admin/weekly-brief)  : 수동 생성/상태 — adminOnly
 *
 * 공통 오류 형식은 `{ error: '<code>' }`. 응답에는 tokens, cost, error, stats 를 싣지 않는다
 * (서비스가 WeeklyBriefResponse 로만 돌려준다).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole } from './auth.js';
import {
  getBriefByWeek,
  getLatestBrief,
  getWeeklyBriefRunStatus,
  listBriefs,
  startWeeklyBriefGeneration,
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
  })
  .strict();

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
    const { weekStart, force } = parsed.data;
    if (weekStart !== undefined && !isValidWeekStart(weekStart)) {
      return reply.status(400).send({ error: 'invalid_week_start' });
    }

    const result = await startWeeklyBriefGeneration({ weekStart, force });
    if (result.started) {
      return reply.status(202).send({ started: true, weekStart: result.weekStart, force: result.force, startedAt: result.startedAt });
    }
    if (result.skipped === 'invalid') return reply.status(400).send({ error: result.error });
    if (result.skipped === 'exists') {
      return reply.status(200).send({ started: false, skipped: 'exists', weekStart: result.weekStart });
    }
    return reply.status(409).send({ error: 'already_running' });
  });

  fastify.get('/status', { preHandler: adminOnly }, async () => getWeeklyBriefRunStatus());
}
