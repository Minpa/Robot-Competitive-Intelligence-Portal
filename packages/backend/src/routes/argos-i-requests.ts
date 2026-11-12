/**
 * ARGOS_I → ARGOS 요청 라우트 (prefix /api/argos-i/requests).
 *
 *  POST   /          요청 생성 (Idempotency-Key 선택)  → 201 {id,status}, 재생 200, 400/401/409/413/429/503
 *  GET    /:id       단건 조회 (note 제외)
 *  GET    /          목록 (status, since)  — 최대 100, 최신순, result 제외
 *  DELETE /:id       queued·needs_approval 만 취소
 *
 * 인증은 요청 전용 토큰(ARGOS_I_REQUEST_TOKEN)이며 pull 토큰(argosIRoutes)과 별개의 캡슐화 컨텍스트다.
 * 인증 훅은 onRequest 라 본문 파싱보다 먼저 실행된다. 이 플러그인의 오류 처리기는 입력 값·zod 메시지·파서 오류 문구를
 * 응답이나 로그에 에코하지 않는다. 요청 본문·note·값은 어디에도 로그하지 않는다 (formatLogLine 의 코드·hash8 만).
 * ARGOS 는 사내로 push·콜백하지 않는다 — 결과는 폴링 또는 일일 번들 requests 영역으로만 전달된다.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireArgosIRequestToken } from './argos-i-request-auth.js';
import { createGuardContext, guardRequest } from '../services/argos-i-inbound-guard.js';
import { REQUEST_BODY_MAX_BYTES } from '../services/argos-i-requests-config.js';
import { IDEMPOTENCY_KEY_RE, UUID_RE, idempotencyHashOf } from '../services/argos-i-requests-schema.js';
import { allowedHosts, runInlineQuery } from '../services/argos-i-requests-runtime.js';
import { REQUEST_STATUSES, type RequestRow, type RequestStatus } from '../services/argos-i-requests-store.js';
import {
  cancelRequest,
  createRequest,
  getRequest,
  getSuspendState,
  listRequests,
  recordRejection,
  toListItem,
  toPublicView,
} from '../services/argos-i-requests.service.js';

const firstValue = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** 생성·재생 응답 본문 — query 가 끝났으면 result 를 함께 준다 */
function creationBody(row: RequestRow) {
  return {
    id: row.id,
    status: row.status,
    ...(row.type === 'query' && row.status === 'done' ? { result: row.result } : {}),
    ...(row.status === 'failed' && row.errorCode ? { errorCode: row.errorCode } : {}),
  };
}

export async function argosIRequestsRoutes(fastify: FastifyInstance) {
  // 인증이 가장 먼저 — 본문 파싱·검증·대상 존재 확인보다 앞선다
  fastify.addHook('onRequest', requireArgosIRequestToken);

  fastify.addHook('onSend', async (_request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    return payload;
  });

  // JSON 파싱·길이·미디어 타입 오류가 입력 값을 응답이나 로그에 에코하지 않게 한다 (기본 오류 처리기는 파서 메시지를 싣고 로그한다)
  fastify.setErrorHandler((error, _request, reply) => {
    // 앱 전역 JSON 파서가 던진 SyntaxError 는 statusCode 가 없다 — 본문 오류이므로 400 으로 본다 (메시지는 입력 일부를 담고 있어 버린다)
    const status = (error as { statusCode?: number }).statusCode ?? (error instanceof SyntaxError ? 400 : 500);
    const code = (error as { code?: string }).code;
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE' || status === 413) return reply.status(413).send({ error: 'payload_too_large' });
    if (status >= 400 && status < 500) return reply.status(400).send({ error: 'invalid_request', reasons: ['invalid_type_or_shape'] });
    return reply.status(500).send({ error: 'internal_error' });
  });

  fastify.post('/', { bodyLimit: REQUEST_BODY_MAX_BYTES }, async (request, reply) => {
    if ((await getSuspendState()).suspended) return reply.status(503).send({ error: 'requests_suspended' });

    const idemRaw = firstValue(request.headers['idempotency-key']);
    if (idemRaw !== undefined && !IDEMPOTENCY_KEY_RE.test(idemRaw)) {
      return reply.status(400).send({ error: 'invalid_request', reasons: ['invalid_type_or_shape'] });
    }

    const guard = guardRequest(request.body, createGuardContext(process.env, await allowedHosts()));
    if (!guard.ok) {
      const rej = await recordRejection({ kind: guard.kind, reasons: guard.reasons, hash8: guard.hash8 });
      if (rej.rateLimited) return reply.status(429).header('Retry-After', String(rej.retryAfterSec)).send({ error: 'rate_limited' });
      if (guard.kind === 'unsupported') return reply.status(400).send({ error: 'unsupported_type' });
      // 값·키 이름·zod 메시지는 싣지 않는다 — 사유 코드만
      return reply.status(400).send({ error: guard.kind === 'rejected' ? 'internal_data_rejected' : 'invalid_request', reasons: guard.reasons });
    }

    const out = await createRequest({
      request: guard.request,
      payloadHash: guard.payloadHash,
      hash8: guard.hash8,
      idempotencyHash: idemRaw !== undefined ? idempotencyHashOf(idemRaw) : null,
    });
    switch (out.kind) {
      case 'conflict':
        return reply.status(409).send({ error: 'idempotency_conflict' });
      case 'rate_limited':
        return reply.status(429).header('Retry-After', String(out.retryAfterSec)).send({ error: 'rate_limited' });
      case 'queue_full':
        return reply.status(429).header('Retry-After', '60').send({ error: 'queue_full' });
      case 'replay':
        return reply.status(200).send(creationBody(out.row));
      case 'created': {
        let row = out.row;
        // query 는 AI 비용이 없고 읽기 전용이라 수신 즉시 처리한다 (2초 안에 못 끝나면 queued 로 남긴다)
        if (row.type === 'query' && row.status === 'queued') row = await runInlineQuery(row).catch(() => row);
        return reply.status(201).send(creationBody(row));
      }
    }
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!UUID_RE.test(request.params.id)) return reply.status(400).send({ error: 'invalid_id' });
    const row = await getRequest(request.params.id);
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return reply.send(toPublicView(row));
  });

  fastify.get<{ Querystring: { status?: string; since?: string } }>('/', async (request, reply) => {
    const { status, since } = request.query;
    let statuses: RequestStatus[] | undefined;
    if (status !== undefined && status !== '') {
      const parts = status.split(',').map((s) => s.trim());
      if (parts.some((p) => !(REQUEST_STATUSES as readonly string[]).includes(p))) return reply.status(400).send({ error: 'invalid_status' });
      statuses = parts as RequestStatus[];
    }
    let sinceDate: Date | undefined;
    if (since !== undefined && since !== '') {
      const d = new Date(since);
      if (!/^\d{4}-\d{2}-\d{2}/.test(since) || Number.isNaN(d.getTime())) return reply.status(400).send({ error: 'invalid_since' });
      sinceDate = d;
    }
    const rows = await listRequests({ status: statuses, since: sinceDate, limit: 100 });
    return reply.send({ items: rows.map(toListItem), count: rows.length });
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!UUID_RE.test(request.params.id)) return reply.status(400).send({ error: 'invalid_id' });
    const out = await cancelRequest(request.params.id);
    if (out.kind === 'not_found') return reply.status(404).send({ error: 'not_found' });
    if (out.kind === 'not_cancellable') return reply.status(409).send({ error: 'not_cancellable' });
    return reply.send({ id: out.row.id, status: 'cancelled' });
  });
}
