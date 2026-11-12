/**
 * ARGOS_I 요청 서비스 — 생성(멱등·레이트·대기열·승인 판정), 조회, 취소, 관리자 승인·거부, 거부 계상, 서킷 브레이커, 뷰 변환.
 *
 * 저장소는 `RequestsStore` 인터페이스로 주입한다 (운영: PostgreSQL, 테스트: 메모리).
 * 로그는 `formatLogLine` 한 줄만 쓰고 본문·note·값·키 이름·헤더·토큰은 남기지 않는다.
 */

import { GUARD_REASON_CODES, type GuardReasonCode } from './argos-i-guard-rules.js';
import {
  APPROVAL_EXPIRE_MS,
  ARGOS_I_REQUESTS_SUSPEND_KEY,
  CIRCUIT_THRESHOLD,
  CIRCUIT_WINDOW_MS,
  IDEMPOTENCY_TTL_MS,
  REJECT_RATE_PER_HOUR,
  REQUEST_QUEUE_MAX,
  REQUEST_RATE_PER_HOUR,
  ARGOS_I_REQUESTS_MARKER_KEY,
  isArgosIRequestsEnabled,
  isRequestTokenConfigured,
  kstDayStartUtc,
  resolveDailyBudgetUsd,
  resolveDailyMaxAnalyze,
  parseRequireApproval,
  requiresApproval,
  type Env,
} from './argos-i-requests-config.js';
import { subKeyOf, kstYmdOf, type ParsedRequest } from './argos-i-requests-schema.js';
import { createPgStore, type RequestRow, type RequestStatus, type RequestsStore } from './argos-i-requests-store.js';
import { formatLogLine } from './ops-log.util.js';

interface ServiceState {
  store: RequestsStore;
  now: () => Date;
  env: Env;
  /** 프로세스 내 윈도 카운터 (거부는 저장하지 않으므로 DB 집계를 쓸 수 없다) */
  rejectEvents: number[];
  circuitEvents: number[];
  suspendedCache: { at: number; value: SuspendState } | null;
  log: (line: string) => void;
}

export interface SuspendState {
  suspended: boolean;
  since: string | null;
}

const state: ServiceState = {
  store: createPgStore(),
  now: () => new Date(),
  env: process.env,
  rejectEvents: [],
  circuitEvents: [],
  suspendedCache: null,
  log: (line) => console.warn(line),
};

/** 테스트 전용 주입 */
export function __setServiceDepsForTests(deps: Partial<Pick<ServiceState, 'store' | 'now' | 'env' | 'log'>>): void {
  if (deps.store) state.store = deps.store;
  if (deps.now) state.now = deps.now;
  if (deps.env) state.env = deps.env;
  if (deps.log) state.log = deps.log;
  state.rejectEvents = [];
  state.circuitEvents = [];
  state.suspendedCache = null;
}

export function getStore(): RequestsStore {
  return state.store;
}

// ─────────────────────────────────────────────────────────────────────────────
// 서킷 브레이커 · 거부 계상
// ─────────────────────────────────────────────────────────────────────────────

const SUSPEND_CACHE_MS = 10_000;

function prune(list: number[], windowMs: number, nowMs: number): number[] {
  return list.filter((t) => nowMs - t < windowMs);
}

export async function getSuspendState(): Promise<SuspendState> {
  const nowMs = state.now().getTime();
  if (state.suspendedCache && nowMs - state.suspendedCache.at < SUSPEND_CACHE_MS) return state.suspendedCache.value;
  let value: SuspendState = { suspended: false, since: null };
  try {
    const m = await state.store.getMarker(ARGOS_I_REQUESTS_SUSPEND_KEY);
    if (m && m.suspended === true) value = { suspended: true, since: typeof m.since === 'string' ? m.since : null };
  } catch {
    // 마커 조회 실패 시 마지막으로 알려진 값을 유지한다
    if (state.suspendedCache) return state.suspendedCache.value;
  }
  state.suspendedCache = { at: nowMs, value };
  return value;
}

async function suspend(count: number): Promise<void> {
  const since = state.now().toISOString();
  state.suspendedCache = { at: state.now().getTime(), value: { suspended: true, since } };
  await state.store.setMarker(ARGOS_I_REQUESTS_SUSPEND_KEY, { suspended: true, since, rejectsInWindow: count });
  state.log(formatLogLine('ArgosIRequest', { circuit: 'suspended', rejectsInWindow: count, windowMin: CIRCUIT_WINDOW_MS / 60_000 }));
}

/** 관리자 수동 해제 */
export async function resumeRequests(by: string): Promise<SuspendState> {
  state.circuitEvents = [];
  state.suspendedCache = { at: state.now().getTime(), value: { suspended: false, since: null } };
  await state.store.setMarker(ARGOS_I_REQUESTS_SUSPEND_KEY, { suspended: false, resumedAt: state.now().toISOString(), resumedBy: by.slice(0, 100) });
  state.log(formatLogLine('ArgosIRequest', { circuit: 'resumed' }));
  return { suspended: false, since: null };
}

export interface RejectionOutcome {
  /** 거부 누적이 시간당 상한을 넘었으면 429 */
  rateLimited: boolean;
  retryAfterSec: number;
  suspended: boolean;
}

/**
 * 가드 거부(`internal_data_rejected`·`invalid_request`)를 계상한다. 저장하지 않는다.
 * 로그에는 outcome·사유 코드·hash8 만 남긴다. internal_data_rejected 만 통계·서킷 브레이커 대상이다.
 */
export async function recordRejection(args: { kind: 'rejected' | 'invalid' | 'unsupported'; reasons: readonly GuardReasonCode[]; hash8: string }): Promise<RejectionOutcome> {
  const nowMs = state.now().getTime();
  state.rejectEvents = prune(state.rejectEvents, 3_600_000, nowMs);
  state.rejectEvents.push(nowMs);
  const outcome = args.kind === 'rejected' ? 'rejected' : args.kind === 'unsupported' ? 'unsupported_type' : 'invalid';
  state.log(formatLogLine('ArgosIRequest', { outcome, reasons: [...args.reasons], hash8: args.hash8 }));

  let suspended = false;
  if (args.kind === 'rejected') {
    try {
      await state.store.incrementRejects(kstYmdOf(state.now()), args.reasons);
    } catch {
      // 통계 저장 실패는 거부 응답에 영향을 주지 않는다
    }
    state.circuitEvents = prune(state.circuitEvents, CIRCUIT_WINDOW_MS, nowMs);
    state.circuitEvents.push(nowMs);
    if (state.circuitEvents.length >= CIRCUIT_THRESHOLD) {
      suspended = true;
      try {
        await suspend(state.circuitEvents.length);
      } catch {
        // 마커 저장 실패 시에도 프로세스 내 캐시로 차단한다
      }
    }
  }
  const limited = state.rejectEvents.length > REJECT_RATE_PER_HOUR;
  const oldest = state.rejectEvents[0] ?? nowMs;
  return { rateLimited: limited, retryAfterSec: Math.max(1, Math.ceil((oldest + 3_600_000 - nowMs) / 1000)), suspended };
}

// ─────────────────────────────────────────────────────────────────────────────
// 생성
// ─────────────────────────────────────────────────────────────────────────────

export type CreateOutcome =
  | { kind: 'created'; row: RequestRow }
  | { kind: 'replay'; row: RequestRow }
  | { kind: 'conflict' }
  | { kind: 'rate_limited'; retryAfterSec: number }
  | { kind: 'queue_full' };

export interface CreateInput {
  request: ParsedRequest;
  payloadHash: string;
  hash8: string;
  idempotencyHash: string | null;
}

export async function createRequest(input: CreateInput): Promise<CreateOutcome> {
  const now = state.now();

  // 1) 멱등 — 같은 키·같은 본문은 원 응답 재생 (레이트·대기열 상한을 쓰지 않는다)
  if (input.idempotencyHash) {
    const existing = await state.store.findByIdempotency(input.idempotencyHash);
    if (existing) {
      if (now.getTime() - existing.createdAt.getTime() < IDEMPOTENCY_TTL_MS) {
        return existing.payloadHash === input.payloadHash ? { kind: 'replay', row: existing } : { kind: 'conflict' };
      }
      await state.store.expireIdempotency(input.idempotencyHash, new Date(now.getTime() - IDEMPOTENCY_TTL_MS));
    }
  }

  // 2) 레이트 (통과·저장 건 기준, DB 집계)
  const win = await state.store.rateWindow(new Date(now.getTime() - 3_600_000));
  if (win.count >= REQUEST_RATE_PER_HOUR) {
    const retry = win.oldest ? Math.ceil((win.oldest.getTime() + 3_600_000 - now.getTime()) / 1000) : 60;
    return { kind: 'rate_limited', retryAfterSec: Math.max(1, retry) };
  }
  // 3) 대기열 상한
  if ((await state.store.countOpen()) >= REQUEST_QUEUE_MAX) return { kind: 'queue_full' };

  // 4) 승인 필요 종류
  const rules = parseRequireApproval(state.env);
  const needsApproval = requiresApproval(input.request.type, subKeyOf(input.request.type, input.request.params), rules);
  const row = await state.store.insert({
    type: input.request.type,
    params: input.request.params,
    note: input.request.note ?? null,
    status: needsApproval ? 'needs_approval' : 'queued',
    approvalRequired: needsApproval,
    approvalReason: needsApproval ? 'type_rule' : null,
    payloadHash: input.payloadHash,
    idempotencyHash: input.idempotencyHash,
  });
  if (!row) {
    // 동시에 같은 키로 들어온 요청이 먼저 저장됐다 — 재생 또는 충돌로 처리
    const winner = input.idempotencyHash ? await state.store.findByIdempotency(input.idempotencyHash) : null;
    if (winner) return winner.payloadHash === input.payloadHash ? { kind: 'replay', row: winner } : { kind: 'conflict' };
    throw new Error('insert_failed');
  }
  state.log(formatLogLine('ArgosIRequest', { outcome: 'accepted', id: row.id, type: row.type, status: row.status, hash8: input.hash8 }));
  return { kind: 'created', row };
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회·취소
// ─────────────────────────────────────────────────────────────────────────────

export const getRequest = (id: string) => state.store.get(id);

export async function listRequests(opts: { status?: RequestStatus[]; since?: Date; limit?: number }): Promise<RequestRow[]> {
  return state.store.list({ status: opts.status, since: opts.since, limit: Math.min(100, Math.max(1, opts.limit ?? 100)) });
}

export type CancelOutcome = { kind: 'cancelled'; row: RequestRow } | { kind: 'not_found' } | { kind: 'not_cancellable' };

export async function cancelRequest(id: string): Promise<CancelOutcome> {
  const row = await state.store.transition(id, ['queued', 'needs_approval'], { status: 'cancelled', finishedAt: state.now() });
  if (row) return { kind: 'cancelled', row };
  return (await state.store.get(id)) ? { kind: 'not_cancellable' } : { kind: 'not_found' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 관리자 승인·거부
// ─────────────────────────────────────────────────────────────────────────────

export type DecideOutcome = { kind: 'ok'; row: RequestRow } | { kind: 'not_found' } | { kind: 'not_pending' };

export async function approveRequest(id: string, by: string): Promise<DecideOutcome> {
  const row = await state.store.transition(id, ['needs_approval'], { status: 'queued', approvedBy: by.slice(0, 100), approvedAt: state.now() });
  if (row) {
    state.log(formatLogLine('ArgosIRequest', { outcome: 'approved', id: row.id, type: row.type }));
    return { kind: 'ok', row };
  }
  return (await state.store.get(id)) ? { kind: 'not_pending' } : { kind: 'not_found' };
}

export async function rejectPendingRequest(id: string): Promise<DecideOutcome> {
  const row = await state.store.transition(id, ['needs_approval'], { status: 'rejected', errorCode: 'admin_rejected', finishedAt: state.now() });
  if (row) {
    state.log(formatLogLine('ArgosIRequest', { outcome: 'admin_rejected', id: row.id, type: row.type }));
    return { kind: 'ok', row };
  }
  return (await state.store.get(id)) ? { kind: 'not_pending' } : { kind: 'not_found' };
}

export const APPROVAL_EXPIRE_AFTER_MS = APPROVAL_EXPIRE_MS;

// ─────────────────────────────────────────────────────────────────────────────
// 뷰 (응답 직렬화) — payload_hash·idempotency_hash·승인자 라벨은 어느 뷰에도 없다. note 는 관리자 뷰에만 있다
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected' | 'expired';

export function approvalStateOf(row: Pick<RequestRow, 'approvalRequired' | 'status' | 'approvedAt' | 'errorCode'>): ApprovalState {
  if (!row.approvalRequired) return 'not_required';
  if (row.errorCode === 'approval_expired') return 'expired';
  if (row.errorCode === 'admin_rejected') return 'rejected';
  if (row.approvedAt) return 'approved';
  return 'pending';
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toPublicView(row: RequestRow) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    params: row.params,
    result: row.result,
    errorCode: row.errorCode,
    approval: { required: row.approvalRequired, state: approvalStateOf(row) },
    createdAt: iso(row.createdAt),
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
  };
}

/** 목록용: result 를 빼고 존재 여부만 */
export function toListItem(row: RequestRow) {
  const { result, ...rest } = toPublicView(row);
  return { ...rest, hasResult: result !== null && result !== undefined };
}

export function toAdminView(row: RequestRow) {
  return {
    ...toListItem(row),
    note: row.note,
    approvalReason: row.approvalReason,
    approvedBy: row.approvedBy,
    approvedAt: iso(row.approvedAt),
    attempts: row.attempts,
    costUsd: row.costUsd,
    costProvider: row.costProvider,
  };
}

export const REJECT_REASON_CODES: readonly string[] = GUARD_REASON_CODES;

// ─────────────────────────────────────────────────────────────────────────────
// 관리자 통계
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const now = state.now();
  const dayStart = kstDayStartUtc(now);
  const sinceDay = kstYmdOf(new Date(now.getTime() - 6 * 86_400_000));
  const [usage, counts, rejects, suspendState, last] = await Promise.all([
    state.store.dailyUsage(dayStart),
    state.store.statusCounts(),
    state.store.rejectStats(sinceDay),
    getSuspendState(),
    state.store.getMarker(ARGOS_I_REQUESTS_MARKER_KEY),
  ]);
  const queueLength = (counts.queued ?? 0) + (counts.needs_approval ?? 0) + (counts.running ?? 0);
  return {
    enabled: isArgosIRequestsEnabled(state.env),
    tokenConfigured: isRequestTokenConfigured(state.env),
    today: {
      date: kstYmdOf(now),
      costUsd: Number(usage.costUsd.toFixed(6)),
      analyzeCount: usage.analyzeCount,
      budgetUsd: resolveDailyBudgetUsd(state.env),
      maxAnalyze: resolveDailyMaxAnalyze(state.env),
    },
    statusCounts: counts,
    queueLength,
    rejects7d: rejects,
    rejectTotal7d: rejects.reduce((a, r) => a + r.count, 0),
    suspended: suspendState.suspended,
    suspendedSince: suspendState.since,
    lastRun: last
      ? {
          finishedAt: typeof last.finishedAt === 'string' ? last.finishedAt : null,
          outcome: typeof last.outcome === 'string' ? last.outcome : null,
          processed: typeof last.processed === 'number' ? last.processed : null,
        }
      : null,
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
