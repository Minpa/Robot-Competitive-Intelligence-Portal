/**
 * 주간 브리프 서비스 — 오케스트레이션, 락, 영속화, 상태, 캐치업 판정, 조회.
 *
 * 실행 순서: 주 결정/검증 → (기존 ok/partial 이면 skip, AI 미호출) → 프로세스 내 중복 가드 → advisory lock(트랜잭션)
 *   → collecting → summarizing → persisting → data_migrations 'weekly-brief:last' upsert.
 *
 *  - cron / startup / manual 이 모두 같은 프로세스 내 가드(running)를 공유한다.
 *  - 락은 `db.transaction` 안의 pg_try_advisory_xact_lock(724302) — 수집부터 persist 까지 트랜잭션을 열어 둔다.
 *    읽기 쿼리는 `db`(별도 커넥션)로, 쓰기만 `tx` 로 수행한다.
 *  - 새 결과가 failed 이고 기존 행이 ok/partial 이면 덮어쓰지 않는다(오류는 상태에만 기록).
 *  - week_start 는 끝까지 문자열로 다룬다(Date 로 파싱하지 않는다).
 *  - 로그에는 프롬프트·키·제목 원문을 남기지 않는다.
 */

import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db, weeklyBriefs } from '../db/index.js';
import { aiUsageService, resolveClaudeMonthlyLimitUsd } from './ai-usage.service.js';
import { resolveWeeklyBriefModel } from './anthropic-models.js';
import { dataMigrationService } from './data-migration.service.js';
import { formatLogLine } from './ops-log.util.js';
import { isStartupChainRunning } from './tech-trend-pipeline.service.js';
import { collectWeek } from './weekly-brief-collect.js';
import { buildCandidates, composePayload, computeCounts, isArticleSummaryEnabled, normalizeStoredPayload, type CollectedWeek } from './weekly-brief-compose.js';
import {
  addDaysYmd,
  getWeekRange,
  isMondayYmd,
  isValidYmd,
  isWeekComplete,
  isoWeekInfo,
  lastCompletedWeekStart,
  thisWeekPublishAt,
} from './weekly-brief-period.js';
import {
  isAnthropicConfigured,
  isWeeklyBriefAiEnabled,
  summarizeCandidates,
  type SummarizeInput,
  type SummarizeResult,
} from './weekly-brief-summarize.js';
import type {
  WeeklyBriefCounts,
  WeeklyBriefListItem,
  WeeklyBriefPayload,
  WeeklyBriefResponse,
  WeeklyBriefRunReason,
  WeeklyBriefRunStatus,
  WeeklyBriefStatusCode,
} from '../types/weekly-brief.js';

const TAG = 'WeeklyBrief';

/** 액추에이터 자동 적용(724301)과 구분되는 advisory lock 키 */
export const WEEKLY_BRIEF_LOCK_KEY = 724302;
export const WEEKLY_BRIEF_TASK_NAME = 'weekly-brief';
export const WEEKLY_BRIEF_MARKER_KEY = 'weekly-brief:last';
export const DEFAULT_WEEKLY_BRIEF_CRON = '0 8 * * 1';
/** 한 번 실행의 전체 상한 */
export const RUN_TIMEOUT_MS = 5 * 60_000;
export const CHAIN_WAIT_POLL_MS = 60_000;
export const CHAIN_WAIT_MAX_MS = 30 * 60_000;

export type RunOutcomeKind = 'created' | 'skipped_exists' | 'skipped_locked' | 'failed';
export type RunPhase = WeeklyBriefRunStatus['phase'];
export type LastRun = NonNullable<WeeklyBriefRunStatus['lastRun']>;

export interface RunOptions {
  weekStart?: string;
  force?: boolean;
  reason: WeeklyBriefRunReason;
}

export interface RunOutcome {
  outcome: RunOutcomeKind | 'already_running' | 'invalid';
  weekStart: string | null;
  status: WeeklyBriefStatusCode | null;
  error?: string;
  lastRun?: LastRun;
}

// ─────────────────────────────────────────────────────────────────────────────
// 설정 (env)
// ─────────────────────────────────────────────────────────────────────────────

type Env = Record<string, string | undefined>;

function intEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function resolveWeeklyBriefCron(env: Env = process.env): string {
  return env.CRON_WEEKLY_BRIEF || DEFAULT_WEEKLY_BRIEF_CRON;
}

export function isStartupWeeklyBriefEnabled(env: Env = process.env): boolean {
  return env.WEEKLY_BRIEF_ON_STARTUP !== 'false';
}

export function resolveWeeklyBriefStartupDelayMs(env: Env = process.env): number {
  return intEnv(env.WEEKLY_BRIEF_STARTUP_DELAY_SEC, 900, 0, 86_400) * 1000;
}

export function resolveWeeklyBriefMinGapHours(env: Env = process.env): number {
  return intEnv(env.WEEKLY_BRIEF_MIN_GAP_HOURS, 12, 0, 24 * 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// 입력 검증
// ─────────────────────────────────────────────────────────────────────────────

export type WeekStartCheck = { ok: true; weekStart: string } | { ok: false; error: 'invalid_week_start' | 'week_not_complete' };

/** 형식·실존 날짜·월요일 여부, 그리고 완료된 주인지 검사 */
export function checkGenerableWeek(weekStart: string, now: Date): WeekStartCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !isValidYmd(weekStart) || !isMondayYmd(weekStart)) {
    return { ok: false, error: 'invalid_week_start' };
  }
  if (!isWeekComplete(weekStart, now)) return { ok: false, error: 'week_not_complete' };
  return { ok: true, weekStart };
}

// ─────────────────────────────────────────────────────────────────────────────
// 의존성 (테스트에서 주입)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredBriefRow {
  weekStart: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  status: WeeklyBriefStatusCode;
  payload: Record<string, unknown>;
  stats: Record<string, unknown>;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error: string | null;
}

export type LockResult<T> = { locked: false } | { locked: true; value: T };

export interface WeeklyBriefDeps {
  now(): Date;
  env: Env;
  timeoutMs: number;
  /** 실행 도중 phase 를 바꾸지 않는 읽기 — 기존 행의 status (없으면 null) */
  getExistingStatus(weekStart: string, executor?: unknown): Promise<WeeklyBriefStatusCode | null>;
  withLock<T>(fn: (executor: unknown) => Promise<T>): Promise<LockResult<T>>;
  collect(range: ReturnType<typeof getWeekRange>, prevRange: ReturnType<typeof getWeekRange>): Promise<CollectedWeek>;
  summarize(input: SummarizeInput): Promise<SummarizeResult>;
  writeRow(executor: unknown, row: StoredBriefRow): Promise<void>;
  saveLast(summary: Record<string, unknown>): Promise<void>;
  log(level: 'log' | 'warn' | 'error', line: string): void;
}

type DbLike = typeof db;

/**
 * 생성 성공(ok/partial, 새로 만든 경우) 직후 호출되는 훅. index.ts 가 ARGOS_I 일일 스냅샷 재생성을 연결한다
 * (이 서비스가 내보내기 서비스를 import 하면 순환 의존이 되므로 콜백 주입). 훅 오류는 브리프 결과에 영향을 주지 않는다.
 */
export type WeeklyBriefSuccessHook = (info: { weekStart: string; status: Exclude<WeeklyBriefStatusCode, 'failed'> }) => void;
let successHook: WeeklyBriefSuccessHook | null = null;

export function setWeeklyBriefSuccessHook(hook: WeeklyBriefSuccessHook | null): void {
  successHook = hook;
}

async function dbGetExistingStatus(weekStart: string, executor?: unknown): Promise<WeeklyBriefStatusCode | null> {
  const ex = (executor as DbLike | undefined) ?? db;
  const rows = await ex.select({ status: weeklyBriefs.status }).from(weeklyBriefs).where(eq(weeklyBriefs.weekStart, weekStart)).limit(1);
  const s = rows[0]?.status;
  return s === 'ok' || s === 'partial' || s === 'failed' ? s : null;
}

async function dbWithLock<T>(fn: (executor: unknown) => Promise<T>): Promise<LockResult<T>> {
  return db.transaction(async (tx) => {
    const res = (await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${WEEKLY_BRIEF_LOCK_KEY}) AS locked`)) as unknown;
    const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] } | null)?.rows ?? []);
    const locked = (rows[0] as { locked?: unknown } | undefined)?.locked === true;
    if (!locked) return { locked: false } as const;
    return { locked: true, value: await fn(tx) } as const;
  });
}

async function dbWriteRow(executor: unknown, row: StoredBriefRow): Promise<void> {
  const ex = executor as DbLike;
  // drizzle 의 timestamptz(Date) 직렬화는 toUTCString() 이라 밀리초가 사라진다(period_end 의 .999 가 .000 이 됨).
  // 그래서 ISO 문자열을 ::timestamptz 로 직접 캐스트한다.
  const tstz = (d: Date) => sql`${d.toISOString()}::timestamptz`;
  const values = {
    weekStart: row.weekStart,
    periodStart: tstz(row.periodStart),
    periodEnd: tstz(row.periodEnd),
    generatedAt: tstz(row.generatedAt),
    status: row.status,
    payload: row.payload,
    stats: row.stats,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costUsd: row.costUsd.toFixed(6),
    error: row.error,
  };
  const { weekStart: _ws, ...set } = values;
  await ex.insert(weeklyBriefs).values(values).onConflictDoUpdate({ target: weeklyBriefs.weekStart, set });
}

export const defaultDeps: WeeklyBriefDeps = {
  now: () => new Date(),
  get env() {
    return process.env as Env;
  },
  timeoutMs: RUN_TIMEOUT_MS,
  getExistingStatus: dbGetExistingStatus,
  withLock: dbWithLock,
  collect: (range, prevRange) => collectWeek(range, prevRange),
  summarize: (input) => summarizeCandidates(input),
  writeRow: dbWriteRow,
  saveLast: (summary) => dataMigrationService.upsert(WEEKLY_BRIEF_MARKER_KEY, summary),
  log: (level, line) => console[level](line),
};

// ─────────────────────────────────────────────────────────────────────────────
// 프로세스 내 실행 상태
// ─────────────────────────────────────────────────────────────────────────────

interface RunningState {
  weekStart: string;
  reason: WeeklyBriefRunReason;
  force: boolean;
  startedAt: string;
  phase: Exclude<RunPhase, 'idle'>;
}

let running: RunningState | null = null;
let lastRunMemory: LastRun | null = null;

/** 테스트용 — 프로세스 내 상태 초기화 */
export function __resetWeeklyBriefStateForTests(): void {
  running = null;
  lastRunMemory = null;
  usedUsdCache = null;
}

function claim(weekStart: string, reason: WeeklyBriefRunReason, force: boolean, now: Date): RunningState | null {
  if (running) return null;
  running = { weekStart, reason, force, startedAt: now.toISOString(), phase: 'collecting' };
  return running;
}

// ─────────────────────────────────────────────────────────────────────────────
// 파이프라인 (락 안에서 실행: 수집 → 요약 → 조립)
// ─────────────────────────────────────────────────────────────────────────────

interface BuiltBrief {
  status: WeeklyBriefStatusCode;
  payload: WeeklyBriefPayload | Record<string, never>;
  stats: Record<string, unknown>;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error: string | null;
  warnings: string[];
}

const AI_REASON_WARNING: Record<string, string | null> = {
  disabled: 'ai_disabled',
  not_configured: 'ai_not_configured',
  budget_exceeded: 'ai_budget_exceeded',
  api_error: 'ai_api_error',
  parse_error: 'ai_parse_error',
  refusal: 'ai_refusal',
  no_candidates: null,
};

function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/\s+/g, ' ').slice(0, 500);
}

async function buildBrief(
  state: RunningState,
  deps: WeeklyBriefDeps,
  progress: { usage: { model: string | null; inputTokens: number; outputTokens: number; costUsd: number } },
): Promise<BuiltBrief> {
  const { weekStart } = state;
  const t0 = Date.now();
  const range = getWeekRange(weekStart);
  const prevRange = getWeekRange(addDaysYmd(weekStart, -7));

  setPhase(state, 'collecting');
  const collected = await deps.collect(range, prevRange);
  const t1 = Date.now();

  setPhase(state, 'summarizing');
  const candidates = buildCandidates(collected);
  const { counts, deltas } = computeCounts(collected);
  const summaryInput: SummarizeInput = {
    weekStart,
    period: `${range.weekStart} ~ ${range.weekEnd}`,
    counts,
    deltas,
    candidates,
  };
  const ai = await deps.summarize(summaryInput);
  const t2 = Date.now();
  if (ai.model) progress.usage.model = ai.model;
  progress.usage.inputTokens = ai.inputTokens ?? 0;
  progress.usage.outputTokens = ai.outputTokens ?? 0;
  progress.usage.costUsd = ai.costUsd ?? 0;

  const extraWarnings: string[] = [];
  if (!ai.ok) {
    const w = AI_REASON_WARNING[ai.reason];
    if (w) extraWarnings.push(w);
  } else if (ai.rawTruncated) {
    extraWarnings.push('ai_truncated');
  }

  const composed = composePayload(collected, ai.ok ? { selections: ai.selections } : null, deps.now(), {
    showArticleSummary: isArticleSummaryEnabled(deps.env),
    extraWarnings,
  });
  const t3 = Date.now();

  const stats = {
    ...composed.stats,
    ai: { used: composed.payload.meta.aiUsed, result: ai.ok ? 'ok' : ai.reason, rawTruncated: ai.ok ? ai.rawTruncated : null },
    timingMs: { collect: t1 - t0, summarize: t2 - t1, compose: t3 - t2, total: t3 - t0 },
  };
  return {
    status: composed.status,
    payload: composed.payload,
    stats,
    model: ai.model ?? null,
    inputTokens: ai.inputTokens ?? 0,
    outputTokens: ai.outputTokens ?? 0,
    costUsd: ai.costUsd ?? 0,
    error: null,
    warnings: composed.payload.meta.warnings,
  };
}

/** 타임아웃으로 버려진 이전 실행이 새 실행의 phase 를 건드리지 못하도록 state 동일성을 확인한다 */
function setPhase(state: RunningState, phase: Exclude<RunPhase, 'idle'>): void {
  if (running === state) running.phase = phase;
}

function failedBrief(err: unknown, usage: { model: string | null; inputTokens: number; outputTokens: number; costUsd: number }): BuiltBrief {
  return {
    status: 'failed',
    payload: {},
    stats: { error: shortError(err) },
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
    error: shortError(err),
    warnings: [],
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────────────

async function finish(
  deps: WeeklyBriefDeps,
  state: RunningState,
  startedMs: number,
  outcome: RunOutcomeKind,
  info: { status: WeeklyBriefStatusCode | null; model: string | null; inputTokens: number; outputTokens: number; costUsd: number; warnings: string[]; error: string | null },
): Promise<LastRun> {
  const finishedAt = deps.now();
  const lastRun: LastRun = {
    weekStart: state.weekStart,
    reason: state.reason,
    outcome,
    status: info.status,
    startedAt: state.startedAt,
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, Date.now() - startedMs),
    model: info.model,
    inputTokens: info.inputTokens,
    outputTokens: info.outputTokens,
    costUsd: info.costUsd,
    warnings: info.warnings,
    error: info.error,
  };
  lastRunMemory = lastRun;
  try {
    await deps.saveLast(lastRun as unknown as Record<string, unknown>);
  } catch (err) {
    deps.log('warn', formatLogLine(TAG, { phase: 'finish', warn: 'marker_save_failed', error: shortError(err) }));
  }
  deps.log(
    outcome === 'failed' ? 'error' : 'log',
    formatLogLine(TAG, {
      reason: state.reason,
      weekStart: state.weekStart,
      outcome,
      status: info.status,
      durationMs: lastRun.durationMs,
      model: info.model,
      inputTokens: info.inputTokens,
      outputTokens: info.outputTokens,
      costUsd: info.costUsd,
      warnings: info.warnings.length,
      error: info.error ?? undefined,
    }),
  );
  return lastRun;
}

const EMPTY_INFO = { status: null, model: null, inputTokens: 0, outputTokens: 0, costUsd: 0, warnings: [] as string[], error: null };

/** 이미 claim 된 실행을 끝까지 수행한다 (running 해제 포함). throw 하지 않는다. */
async function executeClaimed(state: RunningState, deps: WeeklyBriefDeps): Promise<RunOutcome> {
  const startedMs = Date.now();
  const { weekStart } = state;
  try {
    const progress = { usage: { model: null as string | null, inputTokens: 0, outputTokens: 0, costUsd: 0 } };

    const locked = await deps.withLock(async (executor) => {
      // 락 획득 후 재확인 — 다른 인스턴스가 먼저 만들었을 수 있다
      const existing = await deps.getExistingStatus(weekStart, executor);
      if (!state.force && (existing === 'ok' || existing === 'partial')) return { kind: 'exists' as const };

      let built: BuiltBrief;
      try {
        built = await withTimeout(buildBrief(state, deps, progress), deps.timeoutMs);
      } catch (err) {
        built = failedBrief(err, progress.usage);
      }

      setPhase(state, 'persisting');
      if (built.status === 'failed' && (existing === 'ok' || existing === 'partial')) {
        // 새 결과가 failed 이면 기존 ok/partial 행은 보존한다 — 오류는 상태에만 기록
        return { kind: 'built' as const, built, wrote: false };
      }
      const range = getWeekRange(weekStart);
      await deps.writeRow(executor, {
        weekStart,
        periodStart: range.startUtc,
        periodEnd: range.periodEndInclusive,
        generatedAt: deps.now(),
        status: built.status,
        payload: built.payload as Record<string, unknown>,
        stats: built.stats,
        model: built.model,
        inputTokens: built.inputTokens,
        outputTokens: built.outputTokens,
        costUsd: built.costUsd,
        error: built.error,
      });
      return { kind: 'built' as const, built, wrote: true };
    });

    if (!locked.locked) {
      const lastRun = await finish(deps, state, startedMs, 'skipped_locked', EMPTY_INFO);
      return { outcome: 'skipped_locked', weekStart, status: null, lastRun };
    }
    if (locked.value.kind === 'exists') {
      const lastRun = await finish(deps, state, startedMs, 'skipped_exists', EMPTY_INFO);
      return { outcome: 'skipped_exists', weekStart, status: null, lastRun };
    }
    const { built } = locked.value;
    const outcome: RunOutcomeKind = built.status === 'failed' ? 'failed' : 'created';
    const lastRun = await finish(deps, state, startedMs, outcome, {
      status: built.status,
      model: built.model,
      inputTokens: built.inputTokens,
      outputTokens: built.outputTokens,
      costUsd: built.costUsd,
      warnings: built.warnings,
      error: built.error,
    });
    if (outcome === 'created' && (built.status === 'ok' || built.status === 'partial') && successHook) {
      try {
        successHook({ weekStart, status: built.status });
      } catch {
        // 훅 실패는 브리프 결과에 영향을 주지 않는다
      }
    }
    return { outcome, weekStart, status: built.status, error: built.error ?? undefined, lastRun };
  } catch (err) {
    // 락/DB 오류 등 — 상태에만 기록하고 throw 하지 않는다
    const lastRun = await finish(deps, state, startedMs, 'failed', { ...EMPTY_INFO, status: 'failed', error: shortError(err) });
    return { outcome: 'failed', weekStart, status: 'failed', error: shortError(err), lastRun };
  } finally {
    running = null;
  }
}

/**
 * 주간 브리프 1회 생성 (cron / startup / manual 공통). throw 하지 않는다.
 * 기본 대상은 직전 완료 주이며, 완료되지 않은 주는 거부한다.
 */
export async function runWeeklyBrief(opts: RunOptions, depsOverride: Partial<WeeklyBriefDeps> = {}): Promise<RunOutcome> {
  const deps: WeeklyBriefDeps = { ...defaultDeps, ...depsOverride };
  const now = deps.now();
  const target = opts.weekStart ?? lastCompletedWeekStart(now);
  const check = checkGenerableWeek(target, now);
  if (!check.ok) return { outcome: 'invalid', weekStart: opts.weekStart ?? null, status: null, error: check.error };
  const force = opts.force === true;

  try {
    if (!force) {
      const existing = await deps.getExistingStatus(check.weekStart);
      if (existing === 'ok' || existing === 'partial') {
        const state: RunningState = { weekStart: check.weekStart, reason: opts.reason, force, startedAt: now.toISOString(), phase: 'collecting' };
        const lastRun = await finish(deps, state, Date.now(), 'skipped_exists', EMPTY_INFO);
        return { outcome: 'skipped_exists', weekStart: check.weekStart, status: existing, lastRun };
      }
    }
  } catch (err) {
    // 존재 확인 실패는 실행 단계(락 안 재확인)에서 다시 다룬다
    deps.log('warn', formatLogLine(TAG, { reason: opts.reason, weekStart: check.weekStart, warn: 'exists_check_failed', error: shortError(err) }));
  }

  const state = claim(check.weekStart, opts.reason, force, now);
  if (!state) {
    deps.log('log', formatLogLine(TAG, { reason: opts.reason, weekStart: check.weekStart, outcome: 'already_running' }));
    return { outcome: 'already_running', weekStart: check.weekStart, status: null };
  }
  return executeClaimed(state, deps);
}

export type StartResult =
  | { started: true; weekStart: string; force: boolean; startedAt: string }
  | { started: false; skipped: 'exists' | 'already_running'; weekStart: string }
  | { started: false; skipped: 'invalid'; error: 'invalid_week_start' | 'week_not_complete'; weekStart: string | null };

/**
 * 관리자 수동 생성 — 백그라운드 실행을 시작하고 즉시 돌아온다 (진행은 getWeeklyBriefRunStatus 로 폴링).
 * 스케줄러(DISABLE_SCHEDULER)와 무관하게 동작한다.
 */
export async function startWeeklyBriefGeneration(
  opts: { weekStart?: string; force?: boolean },
  depsOverride: Partial<WeeklyBriefDeps> = {},
): Promise<StartResult> {
  const deps: WeeklyBriefDeps = { ...defaultDeps, ...depsOverride };
  const now = deps.now();
  const target = opts.weekStart ?? lastCompletedWeekStart(now);
  const check = checkGenerableWeek(target, now);
  if (!check.ok) return { started: false, skipped: 'invalid', error: check.error, weekStart: opts.weekStart ?? null };
  const force = opts.force === true;

  if (running) return { started: false, skipped: 'already_running', weekStart: check.weekStart };
  if (!force) {
    const existing = await deps.getExistingStatus(check.weekStart);
    if (existing === 'ok' || existing === 'partial') return { started: false, skipped: 'exists', weekStart: check.weekStart };
  }
  const state = claim(check.weekStart, 'manual', force, now);
  if (!state) return { started: false, skipped: 'already_running', weekStart: check.weekStart };

  void executeClaimed(state, deps).catch(() => undefined);
  return { started: true, weekStart: check.weekStart, force, startedAt: state.startedAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// 기동 캐치업
// ─────────────────────────────────────────────────────────────────────────────

export interface StartupDecisionArgs {
  now: Date;
  /** 직전 완료 주에 ok/partial 행이 있는지 */
  lastWeekExists: boolean;
  /** 마지막 시도 완료 시각 (weekly-brief:last) */
  lastAttemptAt: Date | null;
  minGapHours: number;
}

/**
 * 기동 캐치업 판정: 지난주 행이 있으면 건너뜀 / 이번 주 월요일 08:00 KST 이전이면 건너뜀(크론이 처리) /
 * 마지막 시도가 minGapHours 이내면 건너뜀.
 */
export function shouldRunStartupWeeklyBrief(args: StartupDecisionArgs): boolean {
  if (args.lastWeekExists) return false;
  if (args.now.getTime() < thisWeekPublishAt(args.now).getTime()) return false;
  if (args.lastAttemptAt && args.now.getTime() - args.lastAttemptAt.getTime() < args.minGapHours * 3_600_000) return false;
  return true;
}

/** weekly-brief:last 요약에서 마지막 시도 완료 시각 */
export function lastAttemptFromSummary(summary: Record<string, unknown> | null | undefined): Date | null {
  const t = summary && typeof summary.finishedAt === 'string' ? new Date(summary.finishedAt) : null;
  return t && !Number.isNaN(t.getTime()) ? t : null;
}

export interface StartupDeps {
  env?: Env;
  now?: () => Date;
  lastWeekExists?: (weekStart: string) => Promise<boolean>;
  getLastSummary?: () => Promise<Record<string, unknown> | null>;
  isChainRunning?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

/**
 * 기동 시 1회 실행 판정·예약 본체 (index.ts 의 setTimeout 콜백에서 호출).
 * trigger 는 scheduler.trigger('weekly-brief', 'startup') — 스케줄러의 isRunning 가드를 재사용한다.
 * 기동 태깅 체인이 돌고 있으면 60초 간격으로 최대 30분 기다린 뒤 다시 판정한다.
 */
export async function runStartupWeeklyBriefIfDue(
  trigger: () => Promise<{ success: boolean; message: string }>,
  deps: StartupDeps = {},
): Promise<'triggered' | 'skipped'> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((l: string) => console.log(l));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const isChainRunning = deps.isChainRunning ?? isStartupChainRunning;
  const lastWeekExists =
    deps.lastWeekExists ??
    (async (ws: string) => {
      const s = await dbGetExistingStatus(ws);
      return s === 'ok' || s === 'partial';
    });
  const getLastSummary = deps.getLastSummary ?? (async () => (await dataMigrationService.get(WEEKLY_BRIEF_MARKER_KEY))?.summary ?? null);
  const minGap = resolveWeeklyBriefMinGapHours(env);

  const decide = async (): Promise<{ run: boolean; detail: Record<string, unknown> }> => {
    const at = now();
    const weekStart = lastCompletedWeekStart(at);
    const exists = await lastWeekExists(weekStart);
    const lastAttemptAt = lastAttemptFromSummary(await getLastSummary());
    const run = shouldRunStartupWeeklyBrief({ now: at, lastWeekExists: exists, lastAttemptAt, minGapHours: minGap });
    return { run, detail: { weekStart, exists, minGapHours: minGap, lastAttemptAt: lastAttemptAt?.toISOString() ?? null } };
  };

  try {
    let d = await decide();
    if (!d.run) {
      log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: d.detail }));
      return 'skipped';
    }
    if (isChainRunning()) {
      log(formatLogLine(TAG, { reason: 'startup', status: 'waiting', detail: 'startup chain running' }));
      let waited = 0;
      while (isChainRunning() && waited < CHAIN_WAIT_MAX_MS) {
        await sleep(CHAIN_WAIT_POLL_MS);
        waited += CHAIN_WAIT_POLL_MS;
      }
      d = await decide();
      if (!d.run) {
        log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: d.detail }));
        return 'skipped';
      }
    }
    const r = await trigger();
    if (!r.success) {
      log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: r.message }));
      return 'skipped';
    }
    return 'triggered';
  } catch (err) {
    console.error(formatLogLine(TAG, { reason: 'startup', status: 'error', error: shortError(err) }));
    return 'skipped';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────────────────────────────────────

const PUBLISHED = ['ok', 'partial'] as const;

function isoOf(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

async function neighborWeeks(weekStart: string): Promise<{ prev: string | null; next: string | null }> {
  const [prev] = await db
    .select({ w: weeklyBriefs.weekStart })
    .from(weeklyBriefs)
    .where(and(lt(weeklyBriefs.weekStart, weekStart), inArray(weeklyBriefs.status, [...PUBLISHED])))
    .orderBy(desc(weeklyBriefs.weekStart))
    .limit(1);
  const [next] = await db
    .select({ w: weeklyBriefs.weekStart })
    .from(weeklyBriefs)
    .where(and(gt(weeklyBriefs.weekStart, weekStart), inArray(weeklyBriefs.status, [...PUBLISHED])))
    .orderBy(weeklyBriefs.weekStart)
    .limit(1);
  return { prev: prev?.w ?? null, next: next?.w ?? null };
}

async function toResponse(row: typeof weeklyBriefs.$inferSelect): Promise<WeeklyBriefResponse> {
  const { prev, next } = await neighborWeeks(row.weekStart);
  return {
    weekStart: row.weekStart,
    status: row.status === 'ok' ? 'ok' : 'partial',
    generatedAt: isoOf(row.generatedAt),
    model: row.model ?? null,
    prevWeekStart: prev,
    nextWeekStart: next,
    payload: normalizeStoredPayload(row.payload as unknown as WeeklyBriefPayload),
  };
}

/** status ∈ ok,partial 중 week_start 가 가장 큰 브리프 */
export async function getLatestBrief(): Promise<WeeklyBriefResponse | null> {
  const [row] = await db
    .select()
    .from(weeklyBriefs)
    .where(inArray(weeklyBriefs.status, [...PUBLISHED]))
    .orderBy(desc(weeklyBriefs.weekStart))
    .limit(1);
  return row ? toResponse(row) : null;
}

/** failed 행은 없는 것으로 본다 */
export async function getBriefByWeek(weekStart: string): Promise<WeeklyBriefResponse | null> {
  const [row] = await db
    .select()
    .from(weeklyBriefs)
    .where(and(eq(weeklyBriefs.weekStart, weekStart), inArray(weeklyBriefs.status, [...PUBLISHED])))
    .limit(1);
  return row ? toResponse(row) : null;
}

const ZERO_COUNTS: WeeklyBriefCounts = { articles: 0, videosNew: 0, videosAnalyzed: 0, papers: 0, ciUpdates: 0, alerts: 0 };

/** week_start 내림차순, failed 제외 */
export async function listBriefs(limit: number): Promise<WeeklyBriefListItem[]> {
  const n = Math.min(52, Math.max(1, Math.trunc(limit) || 26));
  const rows = await db
    .select({
      weekStart: weeklyBriefs.weekStart,
      status: weeklyBriefs.status,
      generatedAt: weeklyBriefs.generatedAt,
      counts: sql<WeeklyBriefCounts | null>`${weeklyBriefs.payload}->'header'->'counts'`,
    })
    .from(weeklyBriefs)
    .where(inArray(weeklyBriefs.status, [...PUBLISHED]))
    .orderBy(desc(weeklyBriefs.weekStart))
    .limit(n);
  return rows.map((r) => {
    const range = getWeekRange(r.weekStart);
    const iso = isoWeekInfo(r.weekStart);
    return {
      weekStart: r.weekStart,
      weekEnd: range.weekEnd,
      isoYear: iso.isoYear,
      weekNumber: iso.weekNumber,
      status: r.status === 'ok' ? 'ok' : 'partial',
      generatedAt: isoOf(r.generatedAt),
      counts: r.counts && typeof r.counts === 'object' ? { ...ZERO_COUNTS, ...r.counts } : { ...ZERO_COUNTS },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────────────────────────────────────

function parseLastRun(summary: Record<string, unknown> | null | undefined): LastRun | null {
  if (!summary || typeof summary.weekStart !== 'string' || typeof summary.outcome !== 'string') return null;
  const reason = summary.reason === 'cron' || summary.reason === 'startup' || summary.reason === 'manual' ? summary.reason : 'manual';
  const outcome =
    summary.outcome === 'created' || summary.outcome === 'skipped_exists' || summary.outcome === 'skipped_locked' || summary.outcome === 'failed'
      ? summary.outcome
      : 'failed';
  const status = summary.status === 'ok' || summary.status === 'partial' || summary.status === 'failed' ? summary.status : null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    weekStart: summary.weekStart,
    reason,
    outcome,
    status,
    startedAt: typeof summary.startedAt === 'string' ? summary.startedAt : String(summary.finishedAt ?? ''),
    finishedAt: typeof summary.finishedAt === 'string' ? summary.finishedAt : '',
    durationMs: num(summary.durationMs),
    model: typeof summary.model === 'string' ? summary.model : null,
    inputTokens: num(summary.inputTokens),
    outputTokens: num(summary.outputTokens),
    costUsd: num(summary.costUsd),
    warnings: Array.isArray(summary.warnings) ? summary.warnings.filter((w): w is string => typeof w === 'string') : [],
    error: typeof summary.error === 'string' ? summary.error : null,
  };
}

/** 마지막 실행 — 메모리 → 없으면 data_migrations 'weekly-brief:last' */
async function loadLastRun(): Promise<LastRun | null> {
  if (lastRunMemory) return lastRunMemory;
  try {
    return parseLastRun((await dataMigrationService.get(WEEKLY_BRIEF_MARKER_KEY))?.summary);
  } catch {
    return null;
  }
}

export function getRunningSnapshot(): { running: boolean; phase: RunPhase; current: WeeklyBriefRunStatus['current'] } {
  if (!running) return { running: false, phase: 'idle', current: null };
  return {
    running: true,
    phase: running.phase,
    current: { weekStart: running.weekStart, reason: running.reason, force: running.force, startedAt: running.startedAt },
  };
}

/** 이번 달 AI 공급자 사용액 — 상태 폴링(3초)마다 집계 쿼리가 돌지 않도록 30초 캐시한다 */
const USED_USD_TTL_MS = 30_000;
let usedUsdCache: { at: number; value: number | null } | null = null;

async function getMonthlyUsedUsd(): Promise<number | null> {
  const nowMs = Date.now();
  if (usedUsdCache && nowMs - usedUsdCache.at < USED_USD_TTL_MS) return usedUsdCache.value;
  let value: number | null = null;
  try {
    value = (await aiUsageService.getClaudeCreditInfo()).currentMonthUsageUsd;
  } catch {
    value = null;
  }
  usedUsdCache = { at: nowMs, value };
  return value;
}

export async function getWeeklyBriefRunStatus(env: Env = process.env): Promise<WeeklyBriefRunStatus> {
  const snapshot = getRunningSnapshot();
  const targetWeekStart = lastCompletedWeekStart(new Date());

  let stored: WeeklyBriefRunStatus['stored'] = null;
  try {
    const [row] = await db.select().from(weeklyBriefs).orderBy(desc(weeklyBriefs.generatedAt)).limit(1);
    if (row) {
      stored = {
        weekStart: row.weekStart,
        generatedAt: isoOf(row.generatedAt),
        status: row.status === 'ok' ? 'ok' : row.status === 'partial' ? 'partial' : 'failed',
        costUsd: Number(row.costUsd),
        error: row.error ?? null,
        stats: (row.stats ?? {}) as Record<string, unknown>,
      };
    }
  } catch {
    stored = null;
  }

  let targetExists = false;
  try {
    const s = await dbGetExistingStatus(targetWeekStart);
    targetExists = s === 'ok' || s === 'partial';
  } catch {
    targetExists = false;
  }

  const usedUsd = await getMonthlyUsedUsd();

  return {
    ...snapshot,
    lastRun: await loadLastRun(),
    stored,
    targetWeekStart,
    targetExists,
    config: {
      cron: resolveWeeklyBriefCron(env),
      schedulerEnabled: env.DISABLE_SCHEDULER !== 'true',
      startupCatchup: isStartupWeeklyBriefEnabled(env),
      aiConfigured: isAnthropicConfigured(env),
      aiEnabled: isWeeklyBriefAiEnabled(env),
      model: resolveWeeklyBriefModel(env),
      budget: { limitUsd: resolveClaudeMonthlyLimitUsd(env), usedUsd },
    },
  };
}

/** GET /api/admin/ops/status 용 요약 — 비밀값 없음 */
export async function getWeeklyBriefOpsSummary(env: Env = process.env) {
  return {
    cron: resolveWeeklyBriefCron(env),
    schedulerEnabled: env.DISABLE_SCHEDULER !== 'true',
    startupCatchup: isStartupWeeklyBriefEnabled(env),
    running: running !== null,
    last: await loadLastRun(),
  };
}
