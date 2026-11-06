/**
 * 데이터 커버리지 라우트 (/api/admin/data-coverage) — 모든 엔드포인트 adminOnly.
 *
 *  - GET  /          : 현재 커버리지 + 비교 기준 병합 (쿼리 compareTo=YYYY-MM-DD 선택)
 *  - POST /refresh   : TTL 을 무시하고 재계산 (마지막 계산 후 30초 스로틀, 진행 중이면 결과 공유)
 *
 * 공통 오류 형식은 `{ error: '<code>' }`. 응답에는 비밀값·스택이 없다(서비스가 마스킹한 값만 싣는다).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole } from './auth.js';
import { getDataCoverageService } from '../services/data-coverage.service.js';
import { isValidCompareTo } from '../services/data-coverage-snapshot.js';
import { sanitizeErrorMessage } from '../services/data-coverage-aggregate.js';

const adminOnly = [authMiddleware, requireRole('admin')];

const RefreshBodySchema = z.object({}).strict();

export async function dataCoverageAdminRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { compareTo?: unknown } }>('/', { preHandler: adminOnly }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const raw = request.query?.compareTo;
    let compareTo: string | null = null;
    if (raw !== undefined) {
      if (!isValidCompareTo(raw, new Date())) return reply.status(400).send({ error: 'invalid_compare_to' });
      compareTo = raw;
    }
    try {
      return await getDataCoverageService().getCoverage(compareTo);
    } catch (err) {
      request.log.error({ msg: sanitizeErrorMessage(err) }, 'data-coverage failed');
      return reply.status(500).send({ error: 'internal_error' });
    }
  });

  fastify.post('/refresh', { preHandler: adminOnly }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const parsed = RefreshBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_body' });
    try {
      const r = await getDataCoverageService().refresh();
      if (!r.ok) {
        reply.header('Retry-After', String(r.retryAfterSec));
        return reply.status(429).send({ error: 'refresh_throttled', retryAfterSec: r.retryAfterSec });
      }
      return r.response;
    } catch (err) {
      request.log.error({ msg: sanitizeErrorMessage(err) }, 'data-coverage refresh failed');
      return reply.status(500).send({ error: 'internal_error' });
    }
  });
}
