import { createHash, timingSafeEqual } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getConfiguredTokens, isArgosITokenConfigured } from '../services/argos-i-export-config.js';
import { formatLogLine } from '../services/ops-log.util.js';

/**
 * ARGOS_I 내보내기 API 토큰 인증.
 *
 * - 'ok'           — Authorization: Bearer <토큰> 이 ARGOS_I_EXPORT_TOKEN(또는 NEXT)과 일치
 * - 'unauthorized' — 헤더 없음 / 스킴 불일치 / 토큰 불일치
 * - 'disabled'     — ARGOS_I_EXPORT_TOKEN 이 미설정이거나 32자 미만 (API 사용 불가)
 *
 * `Authorization: Bearer` 만 받는다: X-Ingest-Key / INGEST_API_KEY / 쿼리스트링 토큰은 무시한다.
 * 토큰 값·Authorization 헤더 값은 어떤 로그·응답에도 남기지 않는다.
 */
export type ArgosITokenCheckResult = 'ok' | 'unauthorized' | 'disabled';

type HeaderValue = string | string[] | undefined;
export type ArgosIHeaders = Record<string, HeaderValue>;

function firstValue(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** 양쪽을 sha256 으로 해시해 같은 길이로 만든 뒤 timingSafeEqual (길이 정보 누출 방지) */
function safeCompare(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

function extractBearer(headers: ArgosIHeaders): string | null {
  const authHeader = firstValue(headers['authorization']);
  if (!authHeader) return null;
  const m = /^Bearer[ \t]+(.+)$/i.exec(authHeader.trim());
  const token = m?.[1]?.trim();
  return token ? token : null;
}

/** 순수 판정 함수 — I/O 없음 (단위 테스트 대상). requireArgosIToken() 이 이 로직을 사용한다. */
export function checkArgosIExportToken(headers: ArgosIHeaders, env: Record<string, string | undefined>): ArgosITokenCheckResult {
  if (!isArgosITokenConfigured(env)) return 'disabled';
  const provided = extractBearer(headers);
  if (!provided) return 'unauthorized';
  // 모든 후보와 비교하고(조기 종료 없음) 결과를 합친다
  let ok = false;
  for (const t of getConfiguredTokens(env)) ok = safeCompare(provided, t) || ok;
  return ok ? 'ok' : 'unauthorized';
}

// ─────────────────────────────────────────────────────────────────────────────
// 인증 실패 레이트 리밋 (프로세스 내 고정 윈도, 전역 카운터)
// Railway 프록시 뒤에서는 request.ip 를 신뢰할 수 없으므로 IP 별 제한은 하지 않는다.
// 유효한 토큰의 요청은 영향받지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_FAIL_WINDOW_MS = 60_000;
export const AUTH_FAIL_LIMIT = 30;

let failWindowStart = 0;
let failCount = 0;
let clock: () => number = () => Date.now();

export function __resetArgosIAuthStateForTests(nowFn?: () => number): void {
  failWindowStart = 0;
  failCount = 0;
  clock = nowFn ?? (() => Date.now());
}

export interface AuthFailureState {
  count: number;
  limited: boolean;
  retryAfterSec: number;
}

/** 인증 실패 1건을 기록하고 윈도 안의 누적 횟수·제한 여부를 돌려준다 */
export function recordAuthFailure(): AuthFailureState {
  const now = clock();
  if (failWindowStart === 0 || now - failWindowStart >= AUTH_FAIL_WINDOW_MS) {
    failWindowStart = now;
    failCount = 0;
  }
  failCount += 1;
  const retryAfterSec = Math.max(1, Math.ceil((failWindowStart + AUTH_FAIL_WINDOW_MS - now) / 1000));
  return { count: failCount, limited: failCount > AUTH_FAIL_LIMIT, retryAfterSec };
}

/** 로그 폭주를 막으려고 1, 10, 30, 31번째 실패에서만 집계 로그를 남긴다 */
function shouldLogFailure(count: number): boolean {
  return count === 1 || count === 10 || count === AUTH_FAIL_LIMIT || count === AUTH_FAIL_LIMIT + 1;
}

/**
 * Fastify preHandler. 비인증 요청은 날짜·파일 존재 여부와 무관하게 401 이다 (정보 노출 방지) —
 * 그래서 라우트 핸들러보다 먼저 실행해야 한다. 토큰 값은 절대 로그에 남기지 않는다.
 */
export async function requireArgosIToken(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> {
  const result = checkArgosIExportToken(request.headers as ArgosIHeaders, process.env);

  if (result === 'disabled') {
    return reply.status(503).send({ error: 'argos_i_export_disabled' });
  }

  if (result === 'unauthorized') {
    const f = recordAuthFailure();
    if (shouldLogFailure(f.count)) {
      console.warn(formatLogLine('ArgosIExport', { auth: 'failed', count: f.count, windowSec: AUTH_FAIL_WINDOW_MS / 1000 }));
    }
    if (f.limited) {
      return reply.status(429).header('Retry-After', String(f.retryAfterSec)).send({ error: 'too_many_requests' });
    }
    return reply.status(401).header('WWW-Authenticate', 'Bearer').send({ error: 'Unauthorized' });
  }
}
