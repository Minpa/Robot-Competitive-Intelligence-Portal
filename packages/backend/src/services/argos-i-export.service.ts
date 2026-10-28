/**
 * ARGOS_I 일일 스냅샷 내보내기 서비스 — 오케스트레이션, 락, 영속화, 보존, 상태, 캐치업 판정, 조회.
 *
 * 실행 순서: 프로세스 내 중복 가드 → (상류 작업 대기) → advisory lock(트랜잭션) → 수집·빌드(영역 순차) → 렌더 → 크기 검사
 *   → 단일 트랜잭션으로 번들 덮어쓰기(DELETE files → UPSERT exports → INSERT files) → 보존 삭제 → data_migrations 'argos-i-export:last' upsert.
 *
 *  - cron / startup / manual / weekly-brief 가 모두 같은 프로세스 내 가드(running)를 공유한다. 락은 pg_try_advisory_xact_lock(724304).
 *  - 읽기 쿼리는 `db`(별도 커넥션), 쓰기만 `tx` 로 수행한다 (트랜잭션이 커넥션 1개를 점유하므로).
 *  - 핵심(P0) 영역 실패 → 이번 실행은 failed, 기존 번들은 덮어쓰지 않는다. 선택(P1/P2) 영역 실패 → partial + area_failed:<id>.
 *  - 내보내기는 DB 읽기 전용이다: LLM·외부 HTTP·크롤링을 호출하지 않는다. 파일시스템에도 쓰지 않는다(메모리 조립).
 *  - 로그에는 토큰·데이터 본문을 남기지 않는다.
 */

import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { argosIExportFiles, argosIExports, db } from '../db/index.js';
import {
  ARGOS_I_EXPORT_LOCK_KEY,
  ARGOS_I_EXPORT_MARKER_KEY,
  BUSY_POLL_MS,
  MANIFEST_LIST_LIMIT,
  STARTUP_CHAIN_POLL_MS,
  STARTUP_CHAIN_WAIT_MAX_MS,
  computeRetentionCutoff,
  isArgosITokenConfigured,
  isStartupArgosIExportEnabled,
  lastAttemptFromSummary,
  redactTokens,
  resolveArgosIBusyWaitMs,
  resolveArgosIMaxBundleBytes,
  resolveArgosIMinGapHours,
  resolveArgosIRetentionDays,
  resolveArgosITimeoutMs,
  resolveBundleDate,
  resolveArgosIExportCron,
  shouldRunStartupArgosIExport,
  resolveArgosIStartupDelayMs,
} from './argos-i-export-config.js';
import { AREA_DEFS, OVERVIEW_AREA_ID } from './argos-i-export-areas.js';
import type { AreaResultSummary, BuildCtx } from './argos-i-export-areas-types.js';
import {
  assembleBundle,
  buildAreaContent,
  contentRecordCount,
  renderAreaContent,
  type AreaOutcome,
  type Bundle,
} from './argos-i-export-build.js';
import { createCollector, type Collector } from './argos-i-export-collect.js';
import { dataMigrationService } from './data-migration.service.js';
import { formatLogLine } from './ops-log.util.js';
import { isStartupChainRunning } from './tech-trend-pipeline.service.js';
import { kstYmd } from './weekly-brief-period.js';
import {
  ARGOS_I_EXPORT_SCHEMA_VERSION,
  type ArgosIBundleStatus,
  type ArgosIBundleSummary,
  type ArgosIExportLastRun,
  type ArgosIExportOutcome,
  type ArgosIExportPhase,
  type ArgosIExportReason,
  type ArgosIExportRunStatus,
} from '../types/argos-i-export.js';

const TAG = 'ArgosIExport';

export type Env = Record<string, string | undefined>;
export type LockResult<T> = { locked: false } | { locked: true; value: T };

export interface RunOptions {
  reason: ArgosIExportReason;
}

export interface RunOutcome {
  outcome: ArgosIExportOutcome | 'already_running';
  date: string;
  status: ArgosIBundleStatus | null;
  error?: string;
  lastRun?: ArgosIExportLastRun;
}

/** 번들 영속화 입력 (서비스가 조립해 persist 에 넘긴다) */
export interface PersistInput {
  date: string;
  reason: ArgosIExportReason;
  asOf: string;
  generatedAt: string;
  durationMs: number;
  bundle: Bundle;
}

export interface ArgosIExportDeps {
  now(): Date;
  env: Env;
  isUpstreamBusy(): boolean;
  sleep(ms: number): Promise<void>;
  withLock<T>(fn: (executor: unknown) => Promise<T>): Promise<LockResult<T>>;
  createCollector(): Collector;
  persist(executor: unknown, input: PersistInput): Promise<void>;
  /** 보존 기준일 미만 번들 삭제 → 삭제한 날짜 수 */
  applyRetention(cutoff: string): Promise<number>;
  saveLast(summary: Record<string, unknown>): Promise<void>;
  log(level: 'log' | 'warn' | 'error', line: string): void;
}

type DbLike = typeof db;

// ─────────────────────────────────────────────────────────────────────────────
// 기본 의존성
// ─────────────────────────────────────────────────────────────────────────────

async function dbWithLock<T>(fn: (executor: unknown) => Promise<T>): Promise<LockResult<T>> {
  return db.transaction(async (tx) => {
    const res = (await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${ARGOS_I_EXPORT_LOCK_KEY}) AS locked`)) as unknown;
    const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] } | null)?.rows ?? []);
    const locked = (rows[0] as { locked?: unknown } | undefined)?.locked === true;
    if (!locked) return { locked: false } as const;
    return { locked: true, value: await fn(tx) } as const;
  });
}

/** 같은 날짜 번들을 한 트랜잭션에서 덮어쓴다: DELETE files → UPSERT exports → INSERT files (조회자는 커밋 전 부분 번들을 볼 수 없다) */
async function dbPersist(executor: unknown, input: PersistInput): Promise<void> {
  const tx = executor as DbLike;
  const { bundle } = input;
  // drizzle 의 timestamptz(Date) 직렬화는 밀리초를 잃으므로 ISO 문자열을 ::timestamptz 로 직접 캐스트한다
  const tstz = (iso: string) => sql`${iso}::timestamptz`;
  await tx.delete(argosIExportFiles).where(eq(argosIExportFiles.exportDate, input.date));
  const values = {
    exportDate: input.date,
    status: bundle.status,
    schemaVersion: ARGOS_I_EXPORT_SCHEMA_VERSION,
    generatedAt: tstz(input.generatedAt),
    asOf: tstz(input.asOf),
    reason: input.reason,
    fileCount: bundle.fileCount,
    totalBytes: bundle.totalBytes,
    bundleSha256: bundle.bundleSha256,
    durationMs: input.durationMs,
    warnings: bundle.warnings,
  };
  const { exportDate: _d, ...set } = values;
  await tx.insert(argosIExports).values(values).onConflictDoUpdate({ target: argosIExports.exportDate, set });
  for (const f of bundle.files) {
    await tx.insert(argosIExportFiles).values({
      exportDate: input.date,
      path: f.path,
      area: f.area,
      format: f.format,
      content: f.content,
      sha256: f.sha256,
      byteSize: f.byteSize,
      recordCount: f.recordCount,
    });
  }
}

async function dbApplyRetention(cutoff: string): Promise<number> {
  const deleted = await db.delete(argosIExports).where(lt(argosIExports.exportDate, cutoff)).returning({ d: argosIExports.exportDate });
  return deleted.length;
}

let upstreamBusyProvider: () => boolean = () => isStartupChainRunning();

/** 스케줄러가 init() 에서 호출한다 — 태깅 체인·기술 트렌드 파이프라인 진행 여부를 알려준다 (스케줄러 → 서비스 단방향 의존 유지) */
export function setUpstreamBusyProvider(fn: () => boolean): void {
  upstreamBusyProvider = fn;
}

export const defaultDeps: ArgosIExportDeps = {
  now: () => new Date(),
  get env() {
    return process.env as Env;
  },
  isUpstreamBusy: () => upstreamBusyProvider(),
  sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
  withLock: dbWithLock,
  createCollector: () => createCollector(),
  persist: dbPersist,
  applyRetention: dbApplyRetention,
  saveLast: (summary) => dataMigrationService.upsert(ARGOS_I_EXPORT_MARKER_KEY, summary),
  log: (level, line) => console[level](line),
};

// ─────────────────────────────────────────────────────────────────────────────
// 프로세스 내 실행 상태
// ─────────────────────────────────────────────────────────────────────────────

interface RunningState {
  date: string;
  reason: ArgosIExportReason;
  startedAt: string;
  phase: Exclude<ArgosIExportPhase, 'idle'>;
}

let running: RunningState | null = null;
let lastRunMemory: ArgosIExportLastRun | null = null;

/** 테스트용 — 프로세스 내 상태 초기화 */
export function __resetArgosIExportStateForTests(): void {
  running = null;
  lastRunMemory = null;
  upstreamBusyProvider = () => isStartupChainRunning();
}

function claim(date: string, reason: ArgosIExportReason, now: Date): RunningState | null {
  if (running) return null;
  running = { date, reason, startedAt: now.toISOString(), phase: 'collecting' };
  return running;
}

/** 타임아웃으로 버려진 이전 실행이 새 실행의 phase 를 건드리지 못하도록 state 동일성을 확인한다 */
function setPhase(state: RunningState, phase: Exclude<ArgosIExportPhase, 'idle'>): void {
  if (running === state) running.phase = phase;
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────

function shortError(err: unknown, env: Env): string {
  const msg = err instanceof Error ? err.message : String(err);
  return redactTokens(msg.replace(/\s+/g, ' '), env).slice(0, 500);
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

/** 핵심(P0) 영역 실패 / 타임아웃 / 크기 초과 등 — 이번 실행 전체를 failed 로 만드는 오류 */
class RunFailure extends Error {
  constructor(
    message: string,
    readonly phase: 'wait' | 'collect' | 'build' | 'size' | 'persist' | 'lock',
    readonly area?: string,
  ) {
    super(message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 번들 생성 (락 안에서 실행)
// ─────────────────────────────────────────────────────────────────────────────

interface BuiltBundle {
  bundle: Bundle;
  asOf: string;
  generatedAt: string;
}

async function buildBundle(state: RunningState, deps: ArgosIExportDeps, warnings: string[], isCancelled: () => boolean): Promise<BuiltBundle> {
  const asOf = deps.now().toISOString();
  const baseCtx: BuildCtx = {
    bundleDate: state.date,
    asOf,
    generatedAt: asOf, // 수집·내용 빌드 단계에서는 사용하지 않는다 (렌더 직전에 다시 정한다)
    reason: state.reason,
    commit: deps.env.RAILWAY_GIT_COMMIT_SHA ? deps.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7) : null,
  };
  const collector = deps.createCollector();
  const order = [...AREA_DEFS.filter((d) => d.id !== OVERVIEW_AREA_ID), ...AREA_DEFS.filter((d) => d.id === OVERVIEW_AREA_ID)];
  const contents = new Map<string, ReturnType<typeof buildAreaContent>>();
  const failedAreas = new Map<string, string>();
  const summaries: AreaResultSummary[] = [];

  // 1) 수집 + 내용 빌드 (영역 순차, overview 는 마지막)
  for (const def of order) {
    if (isCancelled()) throw new RunFailure('cancelled', 'collect');
    setPhase(state, 'collecting');
    try {
      let raw = await collector.collect(def.id);
      if (def.id === OVERVIEW_AREA_ID) raw = { ...(raw as object), areas: summaries };
      setPhase(state, 'building');
      const content = buildAreaContent(def, raw, baseCtx);
      contents.set(def.id, content);
      const recordCount = contentRecordCount(content);
      summaries.push({ id: def.id, titleKo: def.titleKo, priority: def.priority, status: recordCount === 0 ? 'empty' : 'ok', recordCount });
    } catch (err) {
      const msg = shortError(err, deps.env);
      if (def.priority === 'P0') throw new RunFailure(msg, 'collect', def.id);
      failedAreas.set(def.id, msg);
      summaries.push({ id: def.id, titleKo: def.titleKo, priority: def.priority, status: 'failed', recordCount: 0 });
      deps.log('warn', formatLogLine(TAG, { reason: state.reason, date: state.date, phase: 'collect', area: def.id, warn: 'area_failed', error: msg }));
    }
  }

  // 2) 렌더 (generatedAt 은 모든 수집이 끝난 뒤의 시각)
  if (isCancelled()) throw new RunFailure('cancelled', 'build');
  setPhase(state, 'building');
  const generatedAt = deps.now().toISOString();
  const ctx: BuildCtx = { ...baseCtx, generatedAt };
  const outcomes: AreaOutcome[] = [];
  for (const def of AREA_DEFS) {
    const content = contents.get(def.id);
    if (!content) {
      outcomes.push({ def, error: failedAreas.get(def.id) ?? 'not_built' });
      continue;
    }
    try {
      outcomes.push({ def, rendered: renderAreaContent(def, content, ctx) });
    } catch (err) {
      const msg = shortError(err, deps.env);
      if (def.priority === 'P0') throw new RunFailure(msg, 'build', def.id);
      outcomes.push({ def, error: msg });
      deps.log('warn', formatLogLine(TAG, { reason: state.reason, date: state.date, phase: 'build', area: def.id, warn: 'area_failed', error: msg }));
    }
  }
  const bundle = assembleBundle(ctx, outcomes, warnings);

  const max = resolveArgosIMaxBundleBytes(deps.env);
  if (bundle.totalBytes > max) throw new RunFailure('bundle_too_large', 'size');
  return { bundle, asOf, generatedAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────────────

async function finish(
  deps: ArgosIExportDeps,
  state: RunningState,
  startedMs: number,
  outcome: ArgosIExportOutcome,
  info: { status: ArgosIBundleStatus | null; fileCount: number; totalBytes: number; warnings: string[]; error: string | null; phase?: string; area?: string },
): Promise<ArgosIExportLastRun> {
  const finishedAt = deps.now();
  const lastRun: ArgosIExportLastRun = {
    date: state.date,
    reason: state.reason,
    outcome,
    status: info.status,
    startedAt: state.startedAt,
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedMs),
    fileCount: info.fileCount,
    totalBytes: info.totalBytes,
    warnings: info.warnings,
    error: info.error,
  };
  lastRunMemory = lastRun;
  try {
    await deps.saveLast(lastRun as unknown as Record<string, unknown>);
  } catch (err) {
    deps.log('warn', formatLogLine(TAG, { phase: 'finish', warn: 'marker_save_failed', error: shortError(err, deps.env) }));
  }
  if (outcome === 'failed') {
    deps.log(
      'error',
      formatLogLine(TAG, { reason: state.reason, date: state.date, outcome, phase: info.phase, area: info.area, durationMs: lastRun.durationMs, error: info.error ?? undefined }),
    );
  } else if (outcome === 'skipped_locked') {
    deps.log('log', formatLogLine(TAG, { reason: state.reason, date: state.date, outcome }));
  } else {
    deps.log(
      'log',
      formatLogLine(TAG, {
        reason: state.reason, date: state.date, outcome, status: info.status, files: info.fileCount, bytes: info.totalBytes,
        durationMs: lastRun.durationMs, warnings: info.warnings.length,
      }),
    );
  }
  return lastRun;
}

/** 이미 claim 된 실행을 끝까지 수행한다 (running 해제 포함). throw 하지 않는다. */
async function executeClaimed(state: RunningState, deps: ArgosIExportDeps): Promise<RunOutcome> {
  const startedMs = deps.now().getTime();
  const warnings: string[] = [];
  const EMPTY = { status: null, fileCount: 0, totalBytes: 0, warnings, error: null };
  try {
    // 상류 작업(태깅 체인·기술 트렌드 파이프라인)이 돌면 60초 간격으로 최대 BUSY_WAIT 만큼 기다린다
    if (deps.isUpstreamBusy()) {
      setPhase(state, 'waiting_upstream');
      deps.log('log', formatLogLine(TAG, { reason: state.reason, date: state.date, status: 'waiting', detail: 'upstream busy' }));
      const maxWait = resolveArgosIBusyWaitMs(deps.env);
      let waited = 0;
      while (deps.isUpstreamBusy() && waited < maxWait) {
        const step = Math.min(BUSY_POLL_MS, maxWait - waited);
        await deps.sleep(step);
        waited += step;
      }
      if (deps.isUpstreamBusy()) warnings.push('upstream_busy_timeout');
    }
    setPhase(state, 'collecting');

    let cancelled = false;
    const timeoutMs = resolveArgosITimeoutMs(deps.env);
    const locked = await deps.withLock(async (executor) => {
      let built: BuiltBundle;
      try {
        built = await withTimeout(buildBundle(state, deps, warnings, () => cancelled), timeoutMs);
      } catch (err) {
        cancelled = true; // 타임아웃으로 버려진 수집이 이후 단계를 진행하지 않도록
        if (err instanceof RunFailure) throw err;
        throw new RunFailure(shortError(err, deps.env), 'collect');
      }
      setPhase(state, 'persisting');
      const durationMs = Math.max(0, deps.now().getTime() - startedMs);
      try {
        await deps.persist(executor, { date: state.date, reason: state.reason, asOf: built.asOf, generatedAt: built.generatedAt, durationMs, bundle: built.bundle });
      } catch (err) {
        throw new RunFailure(shortError(err, deps.env), 'persist');
      }
      return built.bundle;
    });

    if (!locked.locked) {
      const lastRun = await finish(deps, state, startedMs, 'skipped_locked', EMPTY);
      return { outcome: 'skipped_locked', date: state.date, status: null, lastRun };
    }
    const bundle = locked.value;
    const lastRun = await finish(deps, state, startedMs, 'created', {
      status: bundle.status, fileCount: bundle.fileCount, totalBytes: bundle.totalBytes, warnings: bundle.warnings, error: null,
    });

    // 보존: 커밋 이후, 실패해도 실행 결과를 바꾸지 않는다
    try {
      const days = resolveArgosIRetentionDays(deps.env);
      const cutoff = computeRetentionCutoff(state.date, days);
      const deleted = await deps.applyRetention(cutoff);
      if (deleted > 0) deps.log('log', formatLogLine(TAG, { phase: 'retention', deleted, keepFrom: cutoff }));
    } catch (err) {
      deps.log('warn', formatLogLine(TAG, { phase: 'retention', warn: 'delete_failed', error: shortError(err, deps.env) }));
    }
    return { outcome: 'created', date: state.date, status: bundle.status, lastRun };
  } catch (err) {
    const failure = err instanceof RunFailure ? err : new RunFailure(shortError(err, deps.env), 'lock');
    const lastRun = await finish(deps, state, startedMs, 'failed', {
      ...EMPTY, error: failure.message, phase: failure.phase, area: failure.area,
    });
    return { outcome: 'failed', date: state.date, status: null, error: failure.message, lastRun };
  } finally {
    if (running === state) running = null;
  }
}

/**
 * 번들 1회 생성 (cron / startup / manual / weekly-brief 공통). throw 하지 않는다.
 * 날짜는 항상 "오늘(KST, 생성 시작 시각 기준)" 이고 같은 날짜 번들은 덮어쓴다.
 */
export async function runArgosIExport(opts: RunOptions, depsOverride: Partial<ArgosIExportDeps> = {}): Promise<RunOutcome> {
  const deps: ArgosIExportDeps = { ...defaultDeps, ...depsOverride };
  const now = deps.now();
  const date = resolveBundleDate(now);
  const state = claim(date, opts.reason, now);
  if (!state) {
    deps.log('log', formatLogLine(TAG, { reason: opts.reason, date, outcome: 'already_running' }));
    return { outcome: 'already_running', date, status: null };
  }
  return executeClaimed(state, deps);
}

export type StartResult = { started: true; date: string; startedAt: string } | { started: false; skipped: 'already_running'; date: string };

/**
 * 관리자 수동 생성 — 백그라운드 실행을 시작하고 즉시 돌아온다 (진행은 getArgosIExportRunStatus 로 폴링).
 * 스케줄러(DISABLE_SCHEDULER)와 무관하게 동작한다.
 */
export async function startArgosIExportGeneration(
  opts: { reason?: ArgosIExportReason } = {},
  depsOverride: Partial<ArgosIExportDeps> = {},
): Promise<StartResult> {
  const deps: ArgosIExportDeps = { ...defaultDeps, ...depsOverride };
  const now = deps.now();
  const date = resolveBundleDate(now);
  if (running) return { started: false, skipped: 'already_running', date };
  const state = claim(date, opts.reason ?? 'manual', now);
  if (!state) return { started: false, skipped: 'already_running', date };
  void executeClaimed(state, deps).catch(() => undefined);
  return { started: true, date, startedAt: state.startedAt };
}

/**
 * 주간 브리프 성공 직후 당일 번들 재생성 (reason='weekly-brief', PM 결정 §14-2).
 * 수동 생성과 같은 가드를 거친다. 다른 내보내기가 실행 중이면 60초 간격으로 최대 5회 재시도한다.
 */
export async function regenerateAfterWeeklyBrief(
  depsOverride: Partial<ArgosIExportDeps> = {},
  retry: { attempts?: number; intervalMs?: number } = {},
): Promise<'started' | 'skipped'> {
  const deps: ArgosIExportDeps = { ...defaultDeps, ...depsOverride };
  const attempts = retry.attempts ?? 5;
  const intervalMs = retry.intervalMs ?? 60_000;
  for (let i = 0; i < attempts; i++) {
    const r = await startArgosIExportGeneration({ reason: 'weekly-brief' }, depsOverride);
    if (r.started) return 'started';
    if (i < attempts - 1) await deps.sleep(intervalMs);
  }
  deps.log('log', formatLogLine(TAG, { reason: 'weekly-brief', outcome: 'skipped', detail: 'already_running' }));
  return 'skipped';
}

// ─────────────────────────────────────────────────────────────────────────────
// 기동 캐치업
// ─────────────────────────────────────────────────────────────────────────────

export interface StartupDeps {
  env?: Env;
  now?: () => Date;
  todayExists?: (date: string) => Promise<boolean>;
  getLastSummary?: () => Promise<Record<string, unknown> | null>;
  isChainRunning?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

/**
 * 기동 시 1회 실행 판정·예약 본체 (index.ts 의 setTimeout 콜백에서 호출).
 * trigger 는 scheduler.trigger('argos-i-export', 'startup') — 스케줄러의 isRunning 가드를 재사용한다.
 * 기동 태깅 체인이 돌고 있으면 60초 간격으로 최대 30분 기다린 뒤 다시 판정한다.
 */
export async function runStartupArgosIExportIfDue(
  trigger: () => Promise<{ success: boolean; message: string }>,
  deps: StartupDeps = {},
): Promise<'triggered' | 'skipped'> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((l: string) => console.log(l));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const isChainRunning = deps.isChainRunning ?? (() => upstreamBusyProvider());
  const todayExists =
    deps.todayExists ??
    (async (date: string) => {
      const rows = await db.select({ s: argosIExports.status }).from(argosIExports).where(eq(argosIExports.exportDate, date)).limit(1);
      return rows[0]?.s === 'ok' || rows[0]?.s === 'partial';
    });
  const getLastSummary = deps.getLastSummary ?? (async () => (await dataMigrationService.get(ARGOS_I_EXPORT_MARKER_KEY))?.summary ?? null);
  const minGap = resolveArgosIMinGapHours(env);

  const decide = async (): Promise<{ run: boolean; detail: Record<string, unknown> }> => {
    const at = now();
    const date = kstYmd(at);
    const exists = await todayExists(date);
    const lastAttemptAt = lastAttemptFromSummary(await getLastSummary());
    const run = shouldRunStartupArgosIExport({ now: at, todayExists: exists, lastAttemptAt, minGapHours: minGap });
    return { run, detail: { date, exists, minGapHours: minGap, lastAttemptAt: lastAttemptAt?.toISOString() ?? null } };
  };

  try {
    let d = await decide();
    if (!d.run) {
      log(formatLogLine(TAG, { reason: 'startup', status: 'skipped', detail: d.detail }));
      return 'skipped';
    }
    if (isChainRunning()) {
      log(formatLogLine(TAG, { reason: 'startup', status: 'waiting', detail: 'upstream busy' }));
      let waited = 0;
      while (isChainRunning() && waited < STARTUP_CHAIN_WAIT_MAX_MS) {
        await sleep(STARTUP_CHAIN_POLL_MS);
        waited += STARTUP_CHAIN_POLL_MS;
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
    console.error(formatLogLine(TAG, { reason: 'startup', status: 'error', error: shortError(err, env) }));
    return 'skipped';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 조회 (토큰 인증된 다운로드 API 와 관리자 상태가 사용)
// ─────────────────────────────────────────────────────────────────────────────

const PUBLISHED = ['ok', 'partial'] as const;

export interface BundleMeta {
  date: string;
  status: ArgosIBundleStatus;
  schemaVersion: number;
  generatedAt: string;
  asOf: string;
  reason: ArgosIExportReason;
  fileCount: number;
  totalBytes: number;
  bundleSha256: string;
  durationMs: number;
  warnings: string[];
}

export interface StoredFile {
  path: string;
  area: string | null;
  format: 'md' | 'json';
  content: Buffer;
  sha256: string;
  byteSize: number;
  recordCount: number | null;
}

function toMeta(r: typeof argosIExports.$inferSelect): BundleMeta {
  return {
    date: r.exportDate,
    status: r.status === 'partial' ? 'partial' : 'ok',
    schemaVersion: r.schemaVersion,
    generatedAt: new Date(r.generatedAt).toISOString(),
    asOf: new Date(r.asOf).toISOString(),
    reason: (r.reason as ArgosIExportReason) ?? 'manual',
    fileCount: r.fileCount,
    totalBytes: Number(r.totalBytes),
    bundleSha256: r.bundleSha256.trim(),
    durationMs: r.durationMs,
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
  };
}

export function toBundleSummary(m: BundleMeta): ArgosIBundleSummary {
  return {
    date: m.date,
    generatedAt: m.generatedAt,
    asOf: m.asOf,
    status: m.status,
    reason: m.reason,
    fileCount: m.fileCount,
    totalBytes: m.totalBytes,
    bundleSha256: m.bundleSha256,
    manifestUrl: `/api/argos-i/export/${m.date}/manifest.json`,
    zipUrl: `/api/argos-i/export/${m.date}.zip`,
  };
}

/** 날짜 내림차순, 최대 limit 개 (기본 30) */
export async function listBundles(limit: number = MANIFEST_LIST_LIMIT): Promise<BundleMeta[]> {
  const n = Math.min(MANIFEST_LIST_LIMIT, Math.max(1, Math.trunc(limit) || MANIFEST_LIST_LIMIT));
  const rows = await db
    .select()
    .from(argosIExports)
    .where(inArray(argosIExports.status, [...PUBLISHED]))
    .orderBy(desc(argosIExports.exportDate))
    .limit(n);
  return rows.map(toMeta);
}

export async function getBundleMeta(date: string): Promise<BundleMeta | null> {
  const [row] = await db.select().from(argosIExports).where(and(eq(argosIExports.exportDate, date), inArray(argosIExports.status, [...PUBLISHED]))).limit(1);
  return row ? toMeta(row) : null;
}

export async function getBundleFile(date: string, path: string): Promise<StoredFile | null> {
  const [row] = await db
    .select()
    .from(argosIExportFiles)
    .where(and(eq(argosIExportFiles.exportDate, date), eq(argosIExportFiles.path, path)))
    .limit(1);
  return row ? toStoredFile(row) : null;
}

/** README.md, manifest.json, 그 외 경로 오름차순 (ZIP 항목 순서) */
export async function getBundleFiles(date: string): Promise<StoredFile[]> {
  const rows = await db.select().from(argosIExportFiles).where(eq(argosIExportFiles.exportDate, date));
  const rank = (p: string) => (p === 'README.md' ? 0 : p === 'manifest.json' ? 1 : 2);
  return rows
    .map(toStoredFile)
    .sort((a, b) => rank(a.path) - rank(b.path) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function toStoredFile(r: typeof argosIExportFiles.$inferSelect): StoredFile {
  return {
    path: r.path,
    area: r.area ?? null,
    format: r.format === 'json' ? 'json' : 'md',
    content: Buffer.isBuffer(r.content) ? r.content : Buffer.from(r.content as unknown as Uint8Array),
    sha256: r.sha256.trim(),
    byteSize: r.byteSize,
    recordCount: r.recordCount ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────────────────────────────────────

function parseLastRun(summary: Record<string, unknown> | null | undefined): ArgosIExportLastRun | null {
  if (!summary || typeof summary.date !== 'string' || typeof summary.outcome !== 'string') return null;
  const reasons: ArgosIExportReason[] = ['cron', 'startup', 'manual', 'weekly-brief'];
  const reason = reasons.find((r) => r === summary.reason) ?? 'manual';
  const outcome: ArgosIExportOutcome = summary.outcome === 'created' || summary.outcome === 'skipped_locked' ? summary.outcome : 'failed';
  const status = summary.status === 'ok' || summary.status === 'partial' ? summary.status : null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    date: summary.date,
    reason,
    outcome,
    status,
    startedAt: typeof summary.startedAt === 'string' ? summary.startedAt : String(summary.finishedAt ?? ''),
    finishedAt: typeof summary.finishedAt === 'string' ? summary.finishedAt : '',
    durationMs: num(summary.durationMs),
    fileCount: num(summary.fileCount),
    totalBytes: num(summary.totalBytes),
    warnings: Array.isArray(summary.warnings) ? summary.warnings.filter((w): w is string => typeof w === 'string') : [],
    error: typeof summary.error === 'string' ? summary.error : null,
  };
}

/** 마지막 실행 — 메모리 → 없으면 data_migrations 'argos-i-export:last' */
async function loadLastRun(): Promise<ArgosIExportLastRun | null> {
  if (lastRunMemory) return lastRunMemory;
  try {
    return parseLastRun((await dataMigrationService.get(ARGOS_I_EXPORT_MARKER_KEY))?.summary);
  } catch {
    return null;
  }
}

export function getRunningSnapshot(): { running: boolean; phase: ArgosIExportPhase; current: ArgosIExportRunStatus['current'] } {
  if (!running) return { running: false, phase: 'idle', current: null };
  return { running: true, phase: running.phase, current: { date: running.date, reason: running.reason, startedAt: running.startedAt } };
}

/** GET /api/admin/argos-i/export/status — 토큰 값·길이·해시는 포함하지 않는다 */
export async function getArgosIExportRunStatus(env: Env = process.env): Promise<ArgosIExportRunStatus> {
  const snapshot = getRunningSnapshot();
  let bundles: BundleMeta[] = [];
  try {
    bundles = await listBundles(MANIFEST_LIST_LIMIT);
  } catch {
    bundles = [];
  }
  const latest = bundles[0] ?? null;
  return {
    ...snapshot,
    lastRun: await loadLastRun(),
    latest: latest
      ? { date: latest.date, generatedAt: latest.generatedAt, status: latest.status, fileCount: latest.fileCount, totalBytes: latest.totalBytes, bundleSha256: latest.bundleSha256 }
      : null,
    bundles: bundles.map((b) => ({ date: b.date, generatedAt: b.generatedAt, status: b.status, reason: b.reason, fileCount: b.fileCount, totalBytes: b.totalBytes })),
    config: {
      cron: resolveArgosIExportCron(env),
      schedulerEnabled: env.DISABLE_SCHEDULER !== 'true',
      startupCatchup: isStartupArgosIExportEnabled(env),
      tokenConfigured: isArgosITokenConfigured(env),
      retentionDays: resolveArgosIRetentionDays(env),
      areas: AREA_DEFS.map((a) => ({ id: a.id, priority: a.priority })),
    },
  };
}

/** GET /api/admin/ops/status 용 요약 — 비밀값 없음 */
export async function getArgosIExportOpsSummary(env: Env = process.env) {
  let latestDate: string | null = null;
  try {
    latestDate = (await listBundles(1))[0]?.date ?? null;
  } catch {
    latestDate = null;
  }
  return {
    cron: resolveArgosIExportCron(env),
    schedulerEnabled: env.DISABLE_SCHEDULER !== 'true',
    startupCatchup: isStartupArgosIExportEnabled(env),
    running: running !== null,
    last: await loadLastRun(),
    latestBundleDate: latestDate,
  };
}

export { isStartupArgosIExportEnabled, resolveArgosIStartupDelayMs, shouldRunStartupArgosIExport };
