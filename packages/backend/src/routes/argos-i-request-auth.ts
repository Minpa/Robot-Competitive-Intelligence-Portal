import { createHash, timingSafeEqual } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getRequestTokens, isRequestApiActive } from '../services/argos-i-requests-config.js';
import { formatLogLine } from '../services/ops-log.util.js';

/**
 * ARGOS_I 요청 API 토큰 인증 (pull 토큰 ARGOS_I_EXPORT_TOKEN 과 완전히 별개).
 *
 * - 'ok'           — Authorization: Bearer <토큰> 이 ARGOS_I_REQUEST_TOKEN(또는 NEXT)과 일치
 * - 'unauthorized' — 헤더 없음 / 스킴 불일치 / 토큰 불일치 (pull 토큰도 여기서는 불일치다)
 * - 'disabled'     — ARGOS_I_REQUESTS_ENABLED 가 true 가 아니거나, 요청 토큰이 미설정·32자 미만이거나, pull 토큰과 같은 값
 *
 * `Authorization: Bearer` 만 받는다. 토큰 값·Authorization 헤더 값은 어떤 로그·응답에도 남기지 않는다.
 * 인증 실패 카운터는 pull API 의 것과 분리한다 (프로세스 내 고정 윈도, 전역 카운터, 분당 30회 초과 시 429).
 */
export type RequestTokenCheckResult = 'ok' | 'unauthorized' | 'disabled';

type HeaderValue = string | string[] | undefined;
export type RequestHeaders = Record<string, HeaderValue>;

const firstValue = (v: HeaderValue): string | undefined => (Array.isArray(v) ? v[0] : v);
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest();
const safeCompare = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

function extractBearer(headers: RequestHeaders): string | null {
  const h = firstValue(headers['authorization']);
  if (!h) return null;
  const m = /^Bearer[ \t]+(.+)$/i.exec(h.trim());
  const token = m?.[1]?.trim();
  return token ? token : null;
}

/** 순수 판정 함수 — I/O 없음 (단위 테스트 대상) */
export function checkArgosIRequestToken(headers: RequestHeaders, env: Record<string, string | undefined>): RequestTokenCheckResult {
  if (!isRequestApiActive(env)) return 'disabled';
  const provided = extractBearer(headers);
  if (!provided) return 'unauthorized';
  let ok = false;
  for (const t of getRequestTokens(env)) ok = safeCompare(provided, t) || ok;
  return ok ? 'ok' : 'unauthorized';
}

export const REQUEST_AUTH_FAIL_WINDOW_MS = 60_000;
export const REQUEST_AUTH_FAIL_LIMIT = 30;

let failWindowStart = 0;
let failCount = 0;
let clock: () => number = () => Date.now();

export function __resetArgosIRequestAuthStateForTests(nowFn?: () => number): void {
  failWindowStart = 0;
  failCount = 0;
  clock = nowFn ?? (() => Date.now());
}

export function recordRequestAuthFailure(): { count: number; limited: boolean; retryAfterSec: number } {
  const now = clock();
  if (failWindowStart === 0 || now - failWindowStart >= REQUEST_AUTH_FAIL_WINDOW_MS) {
    failWindowStart = now;
    failCount = 0;
  }
  failCount += 1;
  const retryAfterSec = Math.max(1, Math.ceil((failWindowStart + REQUEST_AUTH_FAIL_WINDOW_MS - now) / 1000));
  return { count: failCount, limited: failCount > REQUEST_AUTH_FAIL_LIMIT, retryAfterSec };
}

const shouldLogFailure = (count: number) => count === 1 || count === 10 || count === REQUEST_AUTH_FAIL_LIMIT || count === REQUEST_AUTH_FAIL_LIMIT + 1;

/**
 * Fastify onRequest 훅 — 본문 파싱보다 먼저 실행해, 비인증 요청의 본문이 파싱·검증·에코되지 않게 한다.
 * 비인증 요청은 대상 id 존재 여부와 무관하게 401 이다 (정보 노출 방지).
 */
export async function requireArgosIRequestToken(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> {
  const result = checkArgosIRequestToken(request.headers as RequestHeaders, process.env);

  if (result === 'disabled') {
    return reply.status(503).send({ error: 'argos_i_requests_disabled' });
  }

  if (result === 'unauthorized') {
    const f = recordRequestAuthFailure();
    if (shouldLogFailure(f.count)) {
      console.warn(formatLogLine('ArgosIRequest', { auth: 'failed', count: f.count, windowSec: REQUEST_AUTH_FAIL_WINDOW_MS / 1000 }));
    }
    if (f.limited) {
      return reply.status(429).header('Retry-After', String(f.retryAfterSec)).send({ error: 'too_many_requests' });
    }
    return reply.status(401).header('WWW-Authenticate', 'Bearer').send({ error: 'Unauthorized' });
  }
}
