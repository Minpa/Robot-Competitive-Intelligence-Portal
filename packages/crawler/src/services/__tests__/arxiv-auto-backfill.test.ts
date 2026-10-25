import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BACKFILL_MARKER_KEY,
  CHAIN_GRACE_MS,
  CHAIN_MAX_WAIT_MS,
  blackoutDelayMs,
  buildMarkerSummary,
  disabledReason,
  formatLogLine,
  isInKstBlackout,
  minStartDelayMs,
  runActuatorBackfillOnce,
  scheduleActuatorAutoBackfill,
  shouldRunBackfill,
  type BackfillDeps,
} from '../arxiv-auto-backfill.service.js';
import { ArxivTopicBusyError, type RunResult } from '../arxiv-hand-collector.service.js';

const ENV = { DATABASE_URL: 'postgres://x' };

/** KST 시각 → Date (KST = UTC+9) */
const kst = (iso: string) => new Date(`${iso}+09:00`);

describe('shouldRunBackfill (marker based)', () => {
  it('runs when no marker, skips when marker exists', () => {
    expect(shouldRunBackfill({ env: ENV, markerExists: false })).toEqual({ run: true });
    expect(shouldRunBackfill({ env: ENV, markerExists: true })).toEqual({ run: false, reason: 'marker-exists' });
  });
  it('env gates', () => {
    expect(shouldRunBackfill({ env: {}, markerExists: false }).reason).toBe('no-database-url');
    expect(shouldRunBackfill({ env: { ...ENV, ARXIV_ACTUATOR_AUTO_BACKFILL: 'false' }, markerExists: false }).run).toBe(false);
    expect(shouldRunBackfill({ env: { ...ENV, DISABLE_ARXIV_ACTUATOR: 'true' }, markerExists: false }).run).toBe(false);
    expect(shouldRunBackfill({ env: { ...ENV, DISABLE_LEGAL_COLLECT: 'true' }, markerExists: false }).run).toBe(false);
    expect(disabledReason({ ...ENV, ARXIV_ACTUATOR_AUTO_BACKFILL: 'true' })).toBeNull();
  });
});

describe('KST blackout 02:50~03:30', () => {
  it('02:49 allowed, 02:50 delayed to 03:31, 03:30 delayed, 03:31 allowed', () => {
    expect(isInKstBlackout(kst('2026-10-25T02:49:59'))).toBe(false);
    expect(blackoutDelayMs(kst('2026-10-25T02:49:59'))).toBe(0);
    expect(isInKstBlackout(kst('2026-10-25T02:50:00'))).toBe(true);
    expect(blackoutDelayMs(kst('2026-10-25T02:50:00'))).toBe(41 * 60_000);
    expect(isInKstBlackout(kst('2026-10-25T03:30:00'))).toBe(true);
    expect(blackoutDelayMs(kst('2026-10-25T03:30:30'))).toBe(30_000);
    expect(isInKstBlackout(kst('2026-10-25T03:31:00'))).toBe(false);
    expect(blackoutDelayMs(kst('2026-10-25T03:31:00'))).toBe(0);
  });
  it('midnight boundaries are outside the window', () => {
    expect(isInKstBlackout(kst('2026-10-25T00:00:00'))).toBe(false);
    expect(isInKstBlackout(kst('2026-10-24T23:59:59'))).toBe(false);
  });
  it('converts from UTC correctly (KST 03:00 = UTC 18:00 previous day)', () => {
    expect(isInKstBlackout(new Date('2026-10-24T18:00:00Z'))).toBe(true);
    expect(isInKstBlackout(new Date('2026-10-24T17:49:00Z'))).toBe(false); // KST 02:49
    expect(isInKstBlackout(new Date('2026-10-24T17:50:00Z'))).toBe(true);
    expect(isInKstBlackout(new Date('2026-10-24T18:31:00Z'))).toBe(false); // KST 03:31
    expect(isInKstBlackout(new Date('2026-10-25T03:00:00Z'))).toBe(false); // KST 12:00
  });
});

describe('minStartDelayMs / formatLogLine / buildMarkerSummary', () => {
  it('defaults to 90s and honours the env', () => {
    expect(minStartDelayMs({})).toBe(90_000);
    expect(minStartDelayMs({ ARXIV_ACTUATOR_BACKFILL_DELAY_SEC: '5' })).toBe(5_000);
    expect(minStartDelayMs({ ARXIV_ACTUATOR_BACKFILL_DELAY_SEC: 'x' })).toBe(90_000);
  });
  it('log line keeps key order and quotes unsafe values', () => {
    expect(formatLogLine({ domain: 'actuator', status: 'skipped', reason: 'lock-busy' })).toBe('[ArxivAutoBackfill] domain=actuator status=skipped reason=lock-busy');
    expect(formatLogLine({ domain: 'actuator', status: 'failed', error: 'a b', x: undefined })).toBe('[ArxivAutoBackfill] domain=actuator status=failed error="a b"');
  });
  it('marker summary: status by errors, errors capped at 20', () => {
    const res = (errors: string[]): RunResult => ({
      ran: true, queries: 1, fetched: 5, relevant: 4, inserted: 3, skipped: 1, wouldInsert: 0, merged: 0, truncatedWindows: 2, errors, elapsedMs: 99, dryRun: false,
    });
    expect(buildMarkerSummary(res([]), 's', 'f')).toMatchObject({
      status: 'ok', months: 12, inserted: 3, skipped: 1, relevant: 4, errors: [], errorCount: 0, truncatedWindows: 2, elapsedMs: 99, startedAt: 's', finishedAt: 'f',
    });
    const many = buildMarkerSummary(res(Array.from({ length: 30 }, (_, i) => `e${i}`)), 's', 'f') as { status: string; errors: string[]; errorCount: number };
    expect(many.status).toBe('partial');
    expect(many.errors).toHaveLength(20);
    expect(many.errorCount).toBe(30);
  });
});

// ── 실행기 ──

const runResult = (errors: string[] = []): RunResult => ({
  ran: true, queries: 4, fetched: 100, relevant: 50, inserted: 40, skipped: 10, wouldInsert: 0, merged: 0, truncatedWindows: 0, errors, elapsedMs: 1234, dryRun: false,
});

function makeDeps(over: Partial<BackfillDeps> = {}) {
  const logs: string[] = [];
  const markers: Record<string, unknown>[] = [];
  const deps: BackfillDeps = {
    env: { ...ENV },
    now: () => new Date(),
    ensureTable: vi.fn(async () => {}),
    hasMarker: vi.fn(async () => false),
    writeMarker: vi.fn(async (s) => { markers.push(s); }),
    backfill: vi.fn(async () => runResult()),
    log: { info: (l) => logs.push(l), warn: (l) => logs.push(l), error: (l) => logs.push(l) },
    ...over,
  };
  return { deps, logs, markers };
}

describe('runActuatorBackfillOnce', () => {
  it('calls backfill({months:12, dryRun:false}) and writes an ok marker', async () => {
    const { deps, markers, logs } = makeDeps();
    expect(await runActuatorBackfillOnce(deps)).toBe('ok');
    expect(deps.backfill).toHaveBeenCalledWith({ months: 12, dryRun: false });
    expect(deps.ensureTable).toHaveBeenCalled();
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ status: 'ok', months: 12, inserted: 40 });
    expect(logs.some((l) => l.includes('status=starting') && l.includes('months=12'))).toBe(true);
    expect(logs.some((l) => l.includes('status=done') && l.includes('inserted=40'))).toBe(true);
  });
  it('errors -> partial marker (counts as completed)', async () => {
    const { deps, markers } = makeDeps({ backfill: vi.fn(async () => runResult(['w1', 'w2'])) });
    expect(await runActuatorBackfillOnce(deps)).toBe('partial');
    expect(markers[0]).toMatchObject({ status: 'partial', errorCount: 2 });
  });
  it('marker exists -> skipped without running', async () => {
    const { deps, markers, logs } = makeDeps({ hasMarker: vi.fn(async () => true) });
    expect(await runActuatorBackfillOnce(deps)).toBe('skipped');
    expect(deps.backfill).not.toHaveBeenCalled();
    expect(markers).toHaveLength(0);
    expect(logs[0]).toContain('reason=marker-exists');
  });
  it('ArxivTopicBusyError -> skipped lock-busy, no marker', async () => {
    const { deps, markers, logs } = makeDeps({ backfill: vi.fn(async () => { throw new ArxivTopicBusyError(); }) });
    expect(await runActuatorBackfillOnce(deps)).toBe('skipped');
    expect(markers).toHaveLength(0);
    expect(logs.some((l) => l.includes('status=skipped reason=lock-busy'))).toBe(true);
  });
  it('other exceptions -> failed, no marker, no throw', async () => {
    const { deps, markers, logs } = makeDeps({ backfill: vi.fn(async () => { throw new Error('network'); }) });
    expect(await runActuatorBackfillOnce(deps)).toBe('failed');
    expect(markers).toHaveLength(0);
    expect(logs.some((l) => l.includes('status=failed') && l.includes('error=network'))).toBe(true);
  });
  it('DB errors before running (hasMarker) -> failed, backfill not called', async () => {
    const { deps } = makeDeps({ hasMarker: vi.fn(async () => { throw new Error('db down'); }) });
    expect(await runActuatorBackfillOnce(deps)).toBe('failed');
    expect(deps.backfill).not.toHaveBeenCalled();
  });
  it('marker write failure does not throw', async () => {
    const { deps } = makeDeps({ writeMarker: vi.fn(async () => { throw new Error('write fail'); }) });
    expect(await runActuatorBackfillOnce(deps)).toBe('ok');
  });
  it('env disabled -> skipped, no DB access', async () => {
    const { deps } = makeDeps({ env: { ...ENV, ARXIV_ACTUATOR_AUTO_BACKFILL: 'false' } });
    expect(await runActuatorBackfillOnce(deps)).toBe('skipped');
    expect(deps.ensureTable).not.toHaveBeenCalled();
  });
  it('marker key constant', () => {
    expect(BACKFILL_MARKER_KEY).toBe('arxiv-backfill:actuator:12m');
  });
});

// ── 스케줄링 (가짜 타이머) ──

describe('scheduleActuatorAutoBackfill', () => {
  // 기준 시각: KST 12:00 (블랙아웃 아님)
  const T0 = kst('2026-10-25T12:00:00');
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T0); });
  afterEach(() => { vi.useRealTimers(); });

  it('disabled by env: nothing scheduled', async () => {
    const { deps, logs } = makeDeps({ env: { ...ENV, ARXIV_ACTUATOR_AUTO_BACKFILL: 'false' } });
    expect(await scheduleActuatorAutoBackfill(null, deps)).toBe('disabled');
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    expect(logs[0]).toContain('status=disabled');
  });

  it('without a startup chain starts at the 90s minimum, not before', async () => {
    const { deps } = makeDeps({ now: () => new Date() });
    const p = scheduleActuatorAutoBackfill(null, deps);
    await vi.advanceTimersByTimeAsync(89_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(deps.backfill).toHaveBeenCalledTimes(1);
    expect(await p).toBe('ok');
  });

  it('starts 30s after the startup chain settles (chain ends after the 90s minimum)', async () => {
    let endChain!: () => void;
    const chain = new Promise<void>((r) => { endChain = r; });
    const { deps } = makeDeps({ now: () => new Date() });
    void scheduleActuatorAutoBackfill(chain, deps);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    endChain();
    await vi.advanceTimersByTimeAsync(CHAIN_GRACE_MS - 1);
    expect(deps.backfill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.backfill).toHaveBeenCalledTimes(1);
  });

  it('a chain that already finished well before 90s does not delay beyond 90s', async () => {
    const { deps } = makeDeps({ now: () => new Date() });
    void scheduleActuatorAutoBackfill(Promise.resolve(), deps);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(deps.backfill).toHaveBeenCalledTimes(1);
  });

  it('a rejected chain also releases the wait', async () => {
    let failChain!: () => void;
    const chain = new Promise<void>((_r, rej) => { failChain = () => rej(new Error('boom')); });
    const { deps } = makeDeps({ now: () => new Date() });
    void scheduleActuatorAutoBackfill(chain, deps);
    await vi.advanceTimersByTimeAsync(100_000);
    failChain();
    await vi.advanceTimersByTimeAsync(CHAIN_GRACE_MS);
    expect(deps.backfill).toHaveBeenCalledTimes(1);
  });

  it('proceeds when the chain exceeds the 20 minute cap', async () => {
    const chain = new Promise<void>(() => {});
    const { deps } = makeDeps({ now: () => new Date() });
    void scheduleActuatorAutoBackfill(chain, deps);
    await vi.advanceTimersByTimeAsync(90_000 + CHAIN_MAX_WAIT_MS - 1_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(deps.backfill).toHaveBeenCalledTimes(1);
  });

  it('inside the KST blackout the start is deferred to 03:31 and re-judged', async () => {
    vi.setSystemTime(kst('2026-10-25T02:50:00')); // 90초 뒤 = 02:51:30 (블랙아웃)
    const { deps, logs } = makeDeps({ now: () => new Date() });
    void scheduleActuatorAutoBackfill(null, deps);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes('reason=kst-blackout'))).toBe(true);
    // 03:30:59 까지는 시작하지 않음
    await vi.advanceTimersByTimeAsync(39 * 60_000 + 29_000);
    expect(deps.backfill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(31_000); // 03:31:00 도달
    expect(deps.backfill).toHaveBeenCalledTimes(1);
    expect(isInKstBlackout(new Date())).toBe(false);
  });

  it('marker present at start time: skipped, backfill never runs', async () => {
    const { deps } = makeDeps({ hasMarker: vi.fn(async () => true), now: () => new Date() });
    const p = scheduleActuatorAutoBackfill(null, deps);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(await p).toBe('skipped');
    expect(deps.backfill).not.toHaveBeenCalled();
  });

  it('a throwing backfill keeps the process alive and leaves no marker', async () => {
    const { deps, markers } = makeDeps({ backfill: vi.fn(async () => { throw new Error('x'); }), now: () => new Date() });
    const p = scheduleActuatorAutoBackfill(null, deps);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(await p).toBe('failed');
    expect(markers).toHaveLength(0);
  });
});
