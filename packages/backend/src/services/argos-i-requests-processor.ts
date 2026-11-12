/**
 * ARGOS_I 요청 폴러 — 큐 선점, 예산·승인 게이트, 타임아웃 복구, 종류별 디스패치, 재시도, 보존 정리.
 *
 * 의존성(저장소·처리기·시계·락·월 사용량)은 모두 주입받는다 — 단위 테스트는 메모리 저장소와 가짜 처리기를 쓴다.
 * 로그는 formatLogLine 한 줄(id·type·상태·코드)만 남기고 params·note·결과 본문은 남기지 않는다.
 *
 * 상태 전이: queued → running → done | failed | (일시 오류 && 시도<2) queued
 *            running → needs_approval (일 예산·건수 초과, 승인 전)   needs_approval → queued (관리자 승인) | rejected
 * 관리자 승인은 일 예산만 우회하고 월 예산(Claude)은 우회하지 못한다.
 */

import {
  APPROVAL_EXPIRE_MS,
  ARGOS_I_REQUESTS_MARKER_KEY,
  INLINE_QUERY_TIMEOUT_MS,
  MAX_ATTEMPTS,
  RETENTION_AFTER_HOUR_KST,
  RUNNING_TIMEOUT_MS,
  TICK_MAX_MS,
  TICK_MAX_REQUESTS,
  isArgosIRequestsEnabled,
  kstDayStartUtc,
  kstHour,
  resolveDailyBudgetUsd,
  resolveDailyMaxAnalyze,
  type Env,
} from './argos-i-requests-config.js';
import { finalizeResult } from './argos-i-requests-result.js';
import { kstYmdOf } from './argos-i-requests-schema.js';
import type { RequestRow, RequestsStore } from './argos-i-requests-store.js';
import { failOutcome, type HandlerErrorCode, type HandlerOutcome, type RequestHandler } from './argos-i-requests-handlers/types.js';
import { formatLogLine } from './ops-log.util.js';

/** 처리기 실행 상한 — running 복구(10분)보다 짧게 둔다 */
export const HANDLER_TIMEOUT_MS = 8 * 60_000;

export interface ProcessorDeps {
  store: RequestsStore;
  now(): Date;
  env: Env;
  /** type 별 처리기 (add_source / analyze / query) */
  handlers: Record<string, RequestHandler>;
  /** 이번 달 Claude 사용량 (월 예산 가드용) */
  getClaudeMonth(): Promise<{ limitUsd: number; usedUsd: number }>;
  /** 동시성 1 — advisory lock 안에서 실행. 잠금을 못 얻으면 null */
  lock<T>(fn: () => Promise<T>): Promise<T | null>;
  log(line: string): void;
  inlineTimeoutMs?: number;
  handlerTimeoutMs?: number;
}

export interface TickSummary {
  outcome: 'disabled' | 'locked' | 'ok';
  processed: number;
  recovered?: number;
  expired?: number;
  retention?: { notesCleared: number; requestsDeleted: number; rejectsDeleted: number; idempotencyCleared: number } | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const t = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

interface Abandon {
  abandoned: boolean;
}

/** 이미 running 으로 선점된 행 하나를 처리한다. 최종 행(또는 전이 실패 시 null)을 돌려준다 */
export async function executeClaimed(row: RequestRow, deps: ProcessorDeps, abandon: Abandon = { abandoned: false }): Promise<RequestRow | null> {
  const handler = deps.handlers[row.type];
  const finish = async (patch: Parameters<RequestsStore['transition']>[2]) => (abandon.abandoned ? null : deps.store.transition(row.id, ['running'], patch));

  const failWith = async (code: HandlerErrorCode, transient: boolean): Promise<RequestRow | null> => {
    const attempts = row.attempts + 1;
    if (transient && attempts < MAX_ATTEMPTS) {
      deps.log(formatLogLine('ArgosIRequest', { outcome: 'retry', id: row.id, type: row.type, code, attempts }));
      return finish({ status: 'queued', attempts, startedAt: null, costUsd: 0, costProvider: null, errorCode: null });
    }
    deps.log(formatLogLine('ArgosIRequest', { outcome: 'failed', id: row.id, type: row.type, code, attempts }));
    return finish({ status: 'failed', errorCode: code, attempts, finishedAt: deps.now() });
  };

  if (!handler) return failWith('invalid_target', false);

  // ── 예산 게이트 (analyze) ──
  let est: { costUsd: number; provider: 'claude' | 'gemini' | null; claude: boolean } = { costUsd: 0, provider: null, claude: false };
  try {
    if (handler.estimate) est = await handler.estimate(row.params);

    if (row.type === 'analyze') {
      // 월 예산: Claude 호출(topic 리포트, 캐시 미적중)만. 관리자 승인으로도 우회할 수 없다
      if (row.params.target === 'topic' && est.claude && est.costUsd > 0) {
        const m = await deps.getClaudeMonth();
        if (m.usedUsd + est.costUsd > m.limitUsd) return failWith('budget_monthly', false);
      }
      // 일 예산·건수: 승인된 요청은 우회
      if (!row.approvedAt) {
        const usage = await deps.store.dailyUsage(kstDayStartUtc(deps.now()), row.id);
        const overCount = usage.analyzeCount >= resolveDailyMaxAnalyze(deps.env);
        const overBudget = est.costUsd > 0 && usage.costUsd + est.costUsd > resolveDailyBudgetUsd(deps.env);
        if (overCount || overBudget) {
          deps.log(formatLogLine('ArgosIRequest', { outcome: 'needs_approval', id: row.id, type: row.type, reason: 'budget_daily' }));
          return finish({ status: 'needs_approval', approvalRequired: true, approvalReason: 'budget_daily', startedAt: null, costUsd: 0, costProvider: null });
        }
      }
      // 실행 중 추정치를 기록해 동시 일 합계에 반영한다
      if (est.costUsd > 0) await finish({ costUsd: est.costUsd, costProvider: est.provider });
    }
  } catch {
    return failWith('upstream_error', true);
  }

  // ── 실행 ──
  let outcome: HandlerOutcome;
  try {
    outcome = await withTimeout(handler.run(row.params), deps.handlerTimeoutMs ?? HANDLER_TIMEOUT_MS, () => failOutcome('timeout'));
  } catch {
    outcome = failOutcome('upstream_error', true);
  }

  if (!outcome.ok) return failWith(outcome.code, outcome.transient === true);

  const fin = finalizeResult(outcome.result);
  if (!fin.ok) return failWith('result_too_large', false);
  const cost = outcome.costUsd ?? est.costUsd;
  deps.log(formatLogLine('ArgosIRequest', { outcome: 'done', id: row.id, type: row.type, costUsd: cost }));
  return finish({
    status: 'done',
    result: fin.result,
    errorCode: null,
    costUsd: cost,
    costProvider: cost > 0 ? (outcome.provider ?? est.provider) : null,
    finishedAt: deps.now(),
  });
}

/**
 * query 인라인 처리 — 수신 즉시 선점해 2초 안에 끝나면 결과 행을, 넘기면 queued 로 되돌려 폴러에 맡긴다.
 * 늦게 끝난 결과는 버린다 (폴러가 다시 처리한다).
 */
export async function runInline(row: RequestRow, deps: ProcessorDeps): Promise<RequestRow> {
  const claimed = await deps.store.transition(row.id, ['queued'], { status: 'running', startedAt: deps.now() });
  if (!claimed) return (await deps.store.get(row.id)) ?? row;
  const abandon: Abandon = { abandoned: false };
  const TIMED_OUT = Symbol('timed_out');
  const result = await Promise.race([executeClaimed(claimed, deps, abandon), sleep(deps.inlineTimeoutMs ?? INLINE_QUERY_TIMEOUT_MS).then(() => TIMED_OUT)]);
  if (typeof result === 'symbol') {
    abandon.abandoned = true;
    const back = await deps.store.transition(row.id, ['running'], { status: 'queued', startedAt: null });
    return back ?? (await deps.store.get(row.id)) ?? row;
  }
  return result ?? (await deps.store.get(row.id)) ?? row;
}

async function tickBody(deps: ProcessorDeps): Promise<TickSummary> {
  const startMs = deps.now().getTime();
  const recovered = await deps.store.recoverStale(new Date(startMs - RUNNING_TIMEOUT_MS), deps.now());
  const expired = await deps.store.expireApprovals(new Date(startMs - APPROVAL_EXPIRE_MS), deps.now());

  // 한 번에 최대 5건을 FIFO 로 선점한다. 일시 오류로 되돌려진 요청은 이 틱에서 다시 잡지 않는다 (다음 틱에 재시도)
  const claimed = await deps.store.claimQueued(TICK_MAX_REQUESTS, deps.now());
  let processed = 0;
  for (const row of claimed) {
    if (deps.now().getTime() - startMs >= TICK_MAX_MS) {
      // 시간 상한 — 아직 시작하지 않은 선점분은 queued 로 돌려준다
      await deps.store.transition(row.id, ['running'], { status: 'queued', startedAt: null });
      continue;
    }
    await executeClaimed(row, deps);
    processed += 1;
  }

  // 보존 정리 — 하루 1회, 03:00 KST 이후 첫 틱
  const now = deps.now();
  const prev = await deps.store.getMarker(ARGOS_I_REQUESTS_MARKER_KEY).catch(() => null);
  const today = kstYmdOf(now);
  let retention: TickSummary['retention'] = null;
  let retentionDay = typeof prev?.retentionDay === 'string' ? prev.retentionDay : null;
  if (kstHour(now) >= RETENTION_AFTER_HOUR_KST && retentionDay !== today) {
    retention = await deps.store.retention(now);
    retentionDay = today;
  }

  await deps.store
    .setMarker(ARGOS_I_REQUESTS_MARKER_KEY, { finishedAt: now.toISOString(), outcome: 'ok', processed, recovered, expired, retentionDay })
    .catch(() => undefined);
  if (processed > 0 || recovered > 0 || expired > 0) {
    deps.log(formatLogLine('ArgosIRequest', { tick: 'done', processed, recovered, expired }));
  }
  return { outcome: 'ok', processed, recovered, expired, retention };
}

export async function runArgosIRequestsTick(deps: ProcessorDeps): Promise<TickSummary> {
  if (!isArgosIRequestsEnabled(deps.env)) return { outcome: 'disabled', processed: 0 };
  const r = await deps.lock(() => tickBody(deps));
  return r ?? { outcome: 'locked', processed: 0 };
}
