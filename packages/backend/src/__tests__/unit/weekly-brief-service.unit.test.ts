/**
 * weekly-brief.service — 오케스트레이션/락/영속화 규칙/상태/캐치업 판정 (DB·AI 는 주입한 가짜)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { get: vi.fn(async () => null), upsert: vi.fn(async () => undefined) } }));
vi.mock('../../services/ai-usage.service.js', () => ({
  aiUsageService: { getClaudeCreditInfo: vi.fn(), logUsage: vi.fn() },
  resolveClaudeMonthlyLimitUsd: () => 50,
  estimateCost: () => 0,
}));

import {
  __resetWeeklyBriefStateForTests,
  checkGenerableWeek,
  getRunningSnapshot,
  lastAttemptFromSummary,
  runStartupWeeklyBriefIfDue,
  runWeeklyBrief,
  setWeeklyBriefSuccessHook,
  shouldRunStartupWeeklyBrief,
  startWeeklyBriefGeneration,
  type StoredBriefRow,
  type WeeklyBriefDeps,
} from '../../services/weekly-brief.service.js';
import type { BriefRow, CollectedWeek } from '../../services/weekly-brief-compose.js';
import type { SummarizeInput, SummarizeResult } from '../../services/weekly-brief-summarize.js';
import { getWeekRange } from '../../services/weekly-brief-period.js';

// 2026-10-26 08:00 KST — 직전 완료 주는 2026-10-19
const NOW = new Date('2026-10-25T23:00:00Z');
const WEEK = '2026-10-19';

let seq = 0;
function videoRow(domain?: string): BriefRow {
  const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  return {
    id, title: `v ${seq}`, url: `https://www.youtube.com/watch?v=abcdefghi${String(seq % 100).padStart(2, '0')}`, summary: null, source: 'youtube', productType: 'video',
    publishedAt: '2026-10-21T00:00:00.000Z', collectedAt: '2026-10-21T00:00:00.000Z', companyId: null, ts: '2026-10-21T00:00:00.000Z',
    extractedMetadata: { views: 100 + seq, channel: `c${seq}`, ...(domain ? { domain } : {}) },
  };
}

function collected(weekStart = WEEK): CollectedWeek {
  const rows = Array.from({ length: 30 }, (_, i) => videoRow(i < 10 ? 'actuator' : undefined));
  return {
    range: getWeekRange(weekStart), prevRange: getWeekRange('2026-10-12'),
    rows, prevRows: [], truncated: false, videosAnalyzed: 0, prevVideosAnalyzed: 0, alerts: 0, prevAlerts: 0, newRobots: null,
    ciChanges: [], ciUpdates: 0, prevCiUpdates: 0, keywords: [], keywordEvidence: {}, companies: [], warnings: [],
  };
}

type Store = Map<string, StoredBriefRow>;

function makeDeps(over: Partial<WeeklyBriefDeps> = {}, store: Store = new Map()) {
  const saved: Record<string, unknown>[] = [];
  const calls = { collect: 0, summarize: 0, lock: 0, write: 0 };
  const deps: WeeklyBriefDeps = {
    now: () => NOW,
    env: {},
    timeoutMs: 5_000,
    getExistingStatus: async (w) => store.get(w)?.status ?? null,
    withLock: async (fn) => {
      calls.lock++;
      return { locked: true, value: await fn({}) };
    },
    collect: async () => {
      calls.collect++;
      return collected();
    },
    summarize: async (input: SummarizeInput): Promise<SummarizeResult> => {
      calls.summarize++;
      const first = input.candidates[0]!;
      return {
        ok: true,
        selections: [{ candidateId: first.id, headline: '액추에이터 비중이 33%였습니다', caption: '10건 / 30건', note: null }],
        model: 'test-model', inputTokens: 1000, outputTokens: 200, costUsd: 0.04, rawTruncated: false,
      };
    },
    writeRow: async (_ex, row) => {
      calls.write++;
      store.set(row.weekStart, row);
    },
    saveLast: async (s) => {
      saved.push(s);
    },
    log: () => {},
    ...over,
  };
  return { deps, store, saved, calls };
}

beforeEach(() => {
  __resetWeeklyBriefStateForTests();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('week validation', () => {
  it('rejects bad formats, non-Mondays, impossible dates, and weeks that are not complete', () => {
    expect(checkGenerableWeek('2026-10-19', NOW)).toEqual({ ok: true, weekStart: '2026-10-19' });
    expect(checkGenerableWeek('2026-10-20', NOW)).toEqual({ ok: false, error: 'invalid_week_start' });
    expect(checkGenerableWeek('20261019', NOW)).toEqual({ ok: false, error: 'invalid_week_start' });
    expect(checkGenerableWeek('2026-02-30', NOW)).toEqual({ ok: false, error: 'invalid_week_start' });
    expect(checkGenerableWeek('2026-10-26', NOW)).toEqual({ ok: false, error: 'week_not_complete' }); // 진행 중인 주
    expect(checkGenerableWeek('2026-11-02', NOW)).toEqual({ ok: false, error: 'week_not_complete' }); // 미래
    expect(checkGenerableWeek('2026-10-12', NOW).ok).toBe(true);
  });

  it('runWeeklyBrief reports invalid input without touching anything', async () => {
    const { deps, calls } = makeDeps();
    expect(await runWeeklyBrief({ weekStart: '2026-10-26', reason: 'manual' }, deps)).toMatchObject({ outcome: 'invalid', error: 'week_not_complete' });
    expect(await runWeeklyBrief({ weekStart: '2026-10-21', reason: 'manual' }, deps)).toMatchObject({ outcome: 'invalid', error: 'invalid_week_start' });
    expect(calls.lock).toBe(0);
  });
});

describe('generation', () => {
  it('defaults to the last completed week; AI success -> ok, stored with tokens and cost', async () => {
    const { deps, store, saved } = makeDeps();
    const r = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(r).toMatchObject({ outcome: 'created', weekStart: WEEK, status: 'ok' });
    const row = store.get(WEEK)!;
    expect(row.status).toBe('ok');
    expect(row.model).toBe('test-model');
    expect(row.inputTokens).toBe(1000);
    expect(row.outputTokens).toBe(200);
    expect(row.costUsd).toBeCloseTo(0.04);
    expect(row.periodStart.toISOString()).toBe('2026-10-18T15:00:00.000Z');
    expect(row.periodEnd.toISOString()).toBe('2026-10-25T14:59:59.999Z');
    expect((row.payload as any).header.weekStart).toBe(WEEK);
    expect((row.payload as any).keyMessages[0].generatedBy).toBe('ai');
    expect(row.stats).toHaveProperty('timingMs');
    expect(saved[0]).toMatchObject({ reason: 'cron', weekStart: WEEK, outcome: 'created', status: 'ok' });
    expect(typeof saved[0]!.finishedAt).toBe('string');
    expect(getRunningSnapshot().running).toBe(false);
  });

  it.each([
    ['budget_exceeded', 'ai_budget_exceeded'],
    ['not_configured', 'ai_not_configured'],
    ['disabled', 'ai_disabled'],
    ['api_error', 'ai_api_error'],
    ['parse_error', 'ai_parse_error'],
    ['refusal', 'ai_refusal'],
  ] as const)('AI failure (%s) -> partial with rule sentences and a warning', async (reason, warning) => {
    const { deps, store } = makeDeps({ summarize: async () => ({ ok: false, reason }) });
    const r = await runWeeklyBrief({ reason: 'manual' }, deps);
    expect(r).toMatchObject({ outcome: 'created', status: 'partial' });
    const payload = store.get(WEEK)!.payload as any;
    expect(payload.keyMessages.length).toBeGreaterThan(0);
    expect(payload.keyMessages.every((m: any) => m.generatedBy === 'rule')).toBe(true);
    expect(payload.meta.warnings).toContain(warning);
    expect(payload.meta.aiUsed).toBe(false);
  });

  it('an AI number outside the candidate facts is replaced by the rule sentence', async () => {
    const { deps, store } = makeDeps({
      summarize: async (input) => ({
        ok: true, selections: [{ candidateId: input.candidates[0]!.id, headline: '비중이 99%였습니다', caption: '캡션', note: null }],
        model: 'm', inputTokens: 10, outputTokens: 10, costUsd: 0.001, rawTruncated: false,
      }),
    });
    const r = await runWeeklyBrief({ reason: 'manual' }, deps);
    expect(r.status).toBe('partial');
    expect((store.get(WEEK)!.payload as any).keyMessages[0].headline).not.toContain('99');
  });

  it('records the cost even when the AI result was unusable', async () => {
    const { deps, store } = makeDeps({ summarize: async () => ({ ok: false, reason: 'parse_error', model: 'm', inputTokens: 500, outputTokens: 50, costUsd: 0.02 }) });
    await runWeeklyBrief({ reason: 'manual' }, deps);
    expect(store.get(WEEK)).toMatchObject({ costUsd: 0.02, inputTokens: 500, model: 'm' });
  });

  it('existing ok/partial row without force -> skipped_exists, no collect, no AI, no lock', async () => {
    const store: Store = new Map([[WEEK, { status: 'partial' } as StoredBriefRow]]);
    const { deps, calls, saved } = makeDeps({}, store);
    const r = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(r.outcome).toBe('skipped_exists');
    expect(calls).toMatchObject({ collect: 0, summarize: 0, lock: 0, write: 0 });
    expect(saved[0]).toMatchObject({ outcome: 'skipped_exists' });
  });

  it('force overwrites an existing row (AI called once)', async () => {
    const store: Store = new Map([[WEEK, { weekStart: WEEK, status: 'ok', payload: { old: true } } as unknown as StoredBriefRow]]);
    const { deps, calls } = makeDeps({}, store);
    const r = await runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, deps);
    expect(r.outcome).toBe('created');
    expect(calls.summarize).toBe(1);
    expect((store.get(WEEK)!.payload as any).old).toBeUndefined();
    expect((store.get(WEEK)!.payload as any).schemaVersion).toBe(1);
  });

  it('a failed forced run keeps the existing ok/partial row and only records the error in the status', async () => {
    const original = { weekStart: WEEK, status: 'ok', payload: { keep: true } } as unknown as StoredBriefRow;
    const store: Store = new Map([[WEEK, original]]);
    const { deps, calls, saved } = makeDeps({ collect: async () => { throw new Error('db exploded'); } }, store);
    const r = await runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, deps);
    expect(r).toMatchObject({ outcome: 'failed', status: 'failed', error: 'db exploded' });
    expect(calls.write).toBe(0);
    expect(store.get(WEEK)).toBe(original);
    expect(saved[0]).toMatchObject({ outcome: 'failed', error: 'db exploded' });
  });

  it('a failed first run stores a failed row; the next scheduled run (no force) retries and replaces it', async () => {
    const store: Store = new Map();
    const failing = makeDeps({ collect: async () => { throw new Error('boom'); } }, store);
    const r1 = await runWeeklyBrief({ reason: 'cron' }, failing.deps);
    expect(r1.outcome).toBe('failed');
    expect(store.get(WEEK)).toMatchObject({ status: 'failed', error: 'boom', payload: {} });

    const healthy = makeDeps({}, store);
    const r2 = await runWeeklyBrief({ reason: 'cron' }, healthy.deps);
    expect(r2.outcome).toBe('created');
    expect(healthy.calls.collect).toBe(1);
    expect(store.get(WEEK)!.status).toBe('ok');
  });

  it('lock not acquired -> skipped_locked, nothing collected', async () => {
    const { deps, calls, saved } = makeDeps({ withLock: async () => ({ locked: false }) });
    const r = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(r.outcome).toBe('skipped_locked');
    expect(calls.collect).toBe(0);
    expect(saved[0]).toMatchObject({ outcome: 'skipped_locked' });
    expect(getRunningSnapshot().running).toBe(false);
  });

  it('a row created by someone else while waiting for the lock is respected (re-check inside the lock)', async () => {
    const store: Store = new Map();
    const { deps, calls } = makeDeps({
      withLock: async (fn) => {
        store.set(WEEK, { status: 'ok' } as StoredBriefRow); // 다른 인스턴스가 먼저 만들었다
        return { locked: true, value: await fn({}) };
      },
    }, store);
    const r = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(r.outcome).toBe('skipped_exists');
    expect(calls.collect).toBe(0);
  });

  it('a second call while running is already_running; only one collect/AI happens', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { deps, calls } = makeDeps({ collect: async () => { calls.collect++; await gate; return collected(); } });
    const first = runWeeklyBrief({ reason: 'cron' }, deps);
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(true));
    const second = await runWeeklyBrief({ reason: 'manual', force: true }, deps);
    expect(second.outcome).toBe('already_running');
    release();
    expect((await first).outcome).toBe('created');
    expect(calls.collect).toBe(1);
    expect(calls.summarize).toBe(1);
    expect(getRunningSnapshot().running).toBe(false);
  });

  it('phase moves collecting -> summarizing -> persisting -> idle', async () => {
    const phases: string[] = [];
    const base = makeDeps();
    const deps: WeeklyBriefDeps = {
      ...base.deps,
      collect: async () => { phases.push(getRunningSnapshot().phase); return collected(); },
      summarize: async (input) => { phases.push(getRunningSnapshot().phase); return base.deps.summarize(input); },
      writeRow: async (ex, row) => { phases.push(getRunningSnapshot().phase); await base.deps.writeRow(ex, row); },
    };
    await runWeeklyBrief({ reason: 'manual' }, deps);
    phases.push(getRunningSnapshot().phase);
    expect(phases).toEqual(['collecting', 'summarizing', 'persisting', 'idle']);
  });

  it('times out after the configured limit -> failed(timeout) and a failed row', async () => {
    const { deps, store } = makeDeps({ timeoutMs: 20, collect: () => new Promise<CollectedWeek>(() => {}) });
    const r = await runWeeklyBrief({ reason: 'manual' }, deps);
    expect(r).toMatchObject({ outcome: 'failed', error: 'timeout' });
    expect(store.get(WEEK)).toMatchObject({ status: 'failed', error: 'timeout' });
    expect(getRunningSnapshot().running).toBe(false);
  });

  it('never throws even when the lock itself fails', async () => {
    const { deps, saved } = makeDeps({ withLock: async () => { throw new Error('connection lost'); } });
    const r = await runWeeklyBrief({ reason: 'cron' }, deps);
    expect(r).toMatchObject({ outcome: 'failed', error: 'connection lost' });
    expect(saved[0]).toMatchObject({ outcome: 'failed' });
  });

  it('log lines carry no titles or secrets', async () => {
    const lines: string[] = [];
    const { deps } = makeDeps({ log: (_l, line) => lines.push(line), summarize: async () => ({ ok: false, reason: 'api_error' }) });
    await runWeeklyBrief({ reason: 'cron' }, deps);
    const text = lines.join('\n');
    expect(text).toContain('[WeeklyBrief]');
    expect(text).toContain('outcome=created');
    expect(text).not.toMatch(/v \d+/);
  });
});

describe('startWeeklyBriefGeneration (manual, background)', () => {
  it('returns started immediately and runs in the background with reason manual', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const base = makeDeps();
    const deps = { ...base.deps, collect: async () => { await gate; return collected(); } };
    const r = await startWeeklyBriefGeneration({}, deps);
    expect(r).toMatchObject({ started: true, weekStart: WEEK, force: false });
    const snap = getRunningSnapshot();
    expect(snap).toMatchObject({ running: true, current: { weekStart: WEEK, reason: 'manual', force: false } });
    // 실행 중 재요청 -> already_running
    expect(await startWeeklyBriefGeneration({ force: true }, deps)).toMatchObject({ started: false, skipped: 'already_running' });
    release();
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(false));
    expect(base.store.get(WEEK)?.status).toBe('ok');
    expect(base.saved[0]).toMatchObject({ reason: 'manual', outcome: 'created' });
  });

  it('existing + no force -> skipped exists (200 path); with force it starts', async () => {
    const store: Store = new Map([[WEEK, { status: 'ok' } as StoredBriefRow]]);
    const { deps } = makeDeps({}, store);
    expect(await startWeeklyBriefGeneration({ weekStart: WEEK }, deps)).toEqual({ started: false, skipped: 'exists', weekStart: WEEK });
    const forced = await startWeeklyBriefGeneration({ weekStart: WEEK, force: true }, deps);
    expect(forced).toMatchObject({ started: true, force: true });
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(false));
  });

  it('validates the week', async () => {
    const { deps } = makeDeps();
    expect(await startWeeklyBriefGeneration({ weekStart: '2026-10-21' }, deps)).toMatchObject({ started: false, skipped: 'invalid', error: 'invalid_week_start' });
    expect(await startWeeklyBriefGeneration({ weekStart: '2026-10-26' }, deps)).toMatchObject({ started: false, skipped: 'invalid', error: 'week_not_complete' });
  });

  it('does not depend on the scheduler: it works with DISABLE_SCHEDULER=true', async () => {
    const { deps } = makeDeps({ env: { DISABLE_SCHEDULER: 'true' } });
    const r = await startWeeklyBriefGeneration({}, deps);
    expect(r.started).toBe(true);
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(false));
  });
});

describe('startup catch-up decision', () => {
  const base = { minGapHours: 12 };
  it('skips when last week already exists', () => {
    expect(shouldRunStartupWeeklyBrief({ ...base, now: new Date('2026-10-27T03:00:00Z'), lastWeekExists: true, lastAttemptAt: null })).toBe(false);
  });
  it('skips before Monday 08:00 KST of this week (the cron handles it), runs right after', () => {
    // 월요일 07:59:59 KST = 일요일(UTC) 22:59:59
    expect(shouldRunStartupWeeklyBrief({ ...base, now: new Date('2026-10-25T22:59:59Z'), lastWeekExists: false, lastAttemptAt: null })).toBe(false);
    // 월요일 08:00:00 KST
    expect(shouldRunStartupWeeklyBrief({ ...base, now: new Date('2026-10-25T23:00:00Z'), lastWeekExists: false, lastAttemptAt: null })).toBe(true);
    // 화요일
    expect(shouldRunStartupWeeklyBrief({ ...base, now: new Date('2026-10-27T03:00:00Z'), lastWeekExists: false, lastAttemptAt: null })).toBe(true);
    // 일요일 저녁(KST)은 이번 주 월요일 08:00 이후이므로 실행 대상 (지난주 = 그 전 주)
    expect(shouldRunStartupWeeklyBrief({ ...base, now: new Date('2026-10-25T10:00:00Z'), lastWeekExists: false, lastAttemptAt: null })).toBe(true);
  });
  it('skips when the last attempt is within the gap, runs at exactly the gap', () => {
    const now = new Date('2026-10-27T03:00:00Z');
    expect(shouldRunStartupWeeklyBrief({ ...base, now, lastWeekExists: false, lastAttemptAt: new Date(now.getTime() - 11.9 * 3_600_000) })).toBe(false);
    expect(shouldRunStartupWeeklyBrief({ ...base, now, lastWeekExists: false, lastAttemptAt: new Date(now.getTime() - 12 * 3_600_000) })).toBe(true);
  });
  it('lastAttemptFromSummary reads finishedAt', () => {
    expect(lastAttemptFromSummary({ finishedAt: '2026-10-26T00:00:00.000Z' })?.toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(lastAttemptFromSummary({})).toBeNull();
    expect(lastAttemptFromSummary(null)).toBeNull();
    expect(lastAttemptFromSummary({ finishedAt: 'garbage' })).toBeNull();
  });
});

describe('runStartupWeeklyBriefIfDue', () => {
  const okTrigger = () => vi.fn(async () => ({ success: true, message: 'ok' }));
  const common = (over: Record<string, unknown> = {}) => ({
    now: () => new Date('2026-10-27T03:00:00Z'),
    lastWeekExists: async () => false,
    getLastSummary: async () => null,
    isChainRunning: () => false,
    sleep: async () => undefined,
    log: () => {},
    env: {},
    ...over,
  });

  it('triggers when due', async () => {
    const trigger = okTrigger();
    expect(await runStartupWeeklyBriefIfDue(trigger, common())).toBe('triggered');
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('skips when last week exists or the 12h guard applies', async () => {
    const t1 = okTrigger();
    expect(await runStartupWeeklyBriefIfDue(t1, common({ lastWeekExists: async () => true }))).toBe('skipped');
    const t2 = okTrigger();
    expect(await runStartupWeeklyBriefIfDue(t2, common({ getLastSummary: async () => ({ finishedAt: '2026-10-27T01:00:00.000Z' }) }))).toBe('skipped');
    const t3 = okTrigger();
    expect(await runStartupWeeklyBriefIfDue(t3, common({ env: { WEEKLY_BRIEF_MIN_GAP_HOURS: '1' }, getLastSummary: async () => ({ finishedAt: '2026-10-27T01:00:00.000Z' }) }))).toBe('triggered');
    expect(t1).not.toHaveBeenCalled();
    expect(t2).not.toHaveBeenCalled();
  });

  it('waits (60s polls, up to 30 min) while the startup tagging chain is running, then triggers', async () => {
    let busyPolls = 3;
    const sleeps: number[] = [];
    const trigger = okTrigger();
    const r = await runStartupWeeklyBriefIfDue(trigger, common({
      isChainRunning: () => (busyPolls-- > 0),
      sleep: async (ms: number) => { sleeps.push(ms); },
    }));
    expect(r).toBe('triggered');
    expect(sleeps.length).toBeGreaterThan(0);
    expect(sleeps.every((ms) => ms === 60_000)).toBe(true);
  });

  it('gives up waiting after 30 minutes but still runs', async () => {
    const sleeps: number[] = [];
    const trigger = okTrigger();
    const r = await runStartupWeeklyBriefIfDue(trigger, common({ isChainRunning: () => true, sleep: async (ms: number) => { sleeps.push(ms); } }));
    expect(r).toBe('triggered');
    expect(sleeps).toHaveLength(30);
  });

  it('re-checks after the wait (the cron may have produced the brief meanwhile)', async () => {
    let exists = false;
    let busy = 2;
    const trigger = okTrigger();
    const r = await runStartupWeeklyBriefIfDue(trigger, common({
      lastWeekExists: async () => exists,
      isChainRunning: () => busy-- > 0,
      sleep: async () => { exists = true; },
    }));
    expect(r).toBe('skipped');
    expect(trigger).not.toHaveBeenCalled();
  });

  it('reports skipped when the trigger refuses, and never throws', async () => {
    expect(await runStartupWeeklyBriefIfDue(async () => ({ success: false, message: 'already running' }), common())).toBe('skipped');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await runStartupWeeklyBriefIfDue(okTrigger(), common({ lastWeekExists: async () => { throw new Error('db'); } }))).toBe('skipped');
  });
});

describe('success hook (ARGOS_I 일일 스냅샷 재생성 연결)', () => {
  it('fires once after a newly created ok/partial brief and its failure does not affect the result', async () => {
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    try {
      const { deps } = makeDeps();
      const r = await runWeeklyBrief({ reason: 'cron' }, deps);
      expect(r.outcome).toBe('created');
      expect(hook).toHaveBeenCalledTimes(1);
      expect(hook).toHaveBeenCalledWith({ weekStart: WEEK, status: expect.stringMatching(/^(ok|partial)$/) });

      setWeeklyBriefSuccessHook(() => {
        throw new Error('hook boom');
      });
      __resetWeeklyBriefStateForTests();
      const again = makeDeps();
      expect((await runWeeklyBrief({ reason: 'cron', force: true }, again.deps)).outcome).toBe('created');
    } finally {
      setWeeklyBriefSuccessHook(null);
    }
  });

  it('does not fire for skipped_exists, failed or locked runs', async () => {
    const hook = vi.fn();
    setWeeklyBriefSuccessHook(hook);
    try {
      const store: Store = new Map();
      const first = makeDeps({}, store);
      await runWeeklyBrief({ reason: 'cron' }, first.deps);
      hook.mockClear();
      const exists = makeDeps({}, store);
      expect((await runWeeklyBrief({ reason: 'cron' }, exists.deps)).outcome).toBe('skipped_exists');
      const locked = makeDeps({ withLock: async () => ({ locked: false }) });
      expect((await runWeeklyBrief({ reason: 'cron', force: true }, locked.deps)).outcome).toBe('skipped_locked');
      const failed = makeDeps({ collect: async () => { throw new Error('db down'); } });
      expect((await runWeeklyBrief({ reason: 'cron', force: true }, failed.deps)).outcome).toBe('failed');
      expect(hook).not.toHaveBeenCalled();
    } finally {
      setWeeklyBriefSuccessHook(null);
    }
  });
});

