/**
 * tech-trend-pipeline.service 단위 테스트 — 의존성 주입 + 가짜 타이머 (외부 API 호출 없음)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});

import {
  parseAutoDomains,
  resolveAutoDays,
  shouldRunStartupPipeline,
  lastCompletedAt,
  isStartupPipelineEnabled,
  runTechTrendPipeline,
  runStartupPipelineIfDue,
  setStartupChainRunning,
  summarizeStatus,
  defaultDeps,
  ANALYSIS_GRACE_MS,
  STATUS_POLL_MS,
  type PipelineDeps,
  type PipelineResult,
} from '../../services/tech-trend-pipeline.service.js';
import { initialRunState } from '../../services/tech-trend-analysis.service.js';
import { initialClassifyState } from '../../services/hand-topic-classification.service.js';

const H = 3_600_000;

describe('parseAutoDomains', () => {
  it('defaults to actuator,hand (PM decision)', () => {
    expect(parseAutoDomains(undefined)).toEqual(['actuator', 'hand']);
  });
  it('preserves order, dedupes, tolerates whitespace', () => {
    expect(parseAutoDomains('hand, actuator ,hand')).toEqual(['hand', 'actuator']);
    expect(parseAutoDomains(' actuator ')).toEqual(['actuator']);
  });
  it('drops unsupported domains with a warning', () => {
    const warn = vi.fn();
    expect(parseAutoDomains('actuator,rfm,bogus', warn)).toEqual(['actuator']);
    expect(warn).toHaveBeenCalledTimes(2);
  });
  it('empty value disables the pipeline', () => {
    expect(parseAutoDomains('')).toEqual([]);
    expect(parseAutoDomains('  , ')).toEqual([]);
  });
});

describe('config helpers', () => {
  it('resolveAutoDays clamps 7..90, default 90', () => {
    expect(resolveAutoDays(undefined)).toBe(90);
    expect(resolveAutoDays('30')).toBe(30);
    expect(resolveAutoDays('1')).toBe(7);
    expect(resolveAutoDays('999')).toBe(90);
    expect(resolveAutoDays('abc')).toBe(90);
  });
  it('shouldRunStartupPipeline honours the min gap', () => {
    const now = new Date('2026-10-25T12:00:00Z');
    expect(shouldRunStartupPipeline(null, now, 12)).toBe(true);
    expect(shouldRunStartupPipeline(new Date(now.getTime() - 11 * H), now, 12)).toBe(false);
    expect(shouldRunStartupPipeline(new Date(now.getTime() - 13 * H), now, 12)).toBe(true);
  });
  it('ON_STARTUP=false disables startup runs', () => {
    expect(isStartupPipelineEnabled({ TECH_TREND_PIPELINE_ON_STARTUP: 'false' })).toBe(false);
    expect(isStartupPipelineEnabled({})).toBe(true);
  });
  it('lastCompletedAt counts only ok/partial runs', () => {
    const t = '2026-10-25T00:00:00.000Z';
    expect(lastCompletedAt({ status: 'ok', finishedAt: t })?.toISOString()).toBe(t);
    expect(lastCompletedAt({ status: 'partial', finishedAt: t })?.toISOString()).toBe(t);
    expect(lastCompletedAt({ status: 'skipped', finishedAt: t })).toBeNull();
    expect(lastCompletedAt({ status: 'failed', finishedAt: t })).toBeNull();
    expect(lastCompletedAt(null)).toBeNull();
  });
});

describe('runStartupPipelineIfDue', () => {
  beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());
  const now = () => new Date('2026-10-25T12:00:00Z');
  const recent = (hours: number, status = 'ok') => async () => ({ status, finishedAt: new Date(now().getTime() - hours * H).toISOString() });

  it('skips within 12h of the last completed run, triggers after', async () => {
    const trigger = vi.fn(async () => ({ success: true, message: 'ok' }));
    expect(await runStartupPipelineIfDue(trigger, { env: {}, now, getLast: recent(11) })).toBe('skipped');
    expect(trigger).not.toHaveBeenCalled();
    expect(await runStartupPipelineIfDue(trigger, { env: {}, now, getLast: recent(13) })).toBe('triggered');
    expect(await runStartupPipelineIfDue(trigger, { env: {}, now, getLast: async () => null })).toBe('triggered');
    expect(trigger).toHaveBeenCalledTimes(2);
  });
  it('MIN_GAP_HOURS env is honoured; empty domains skip', async () => {
    const trigger = vi.fn(async () => ({ success: true, message: 'ok' }));
    expect(await runStartupPipelineIfDue(trigger, { env: { TECH_TREND_PIPELINE_MIN_GAP_HOURS: '1' }, now, getLast: recent(2) })).toBe('triggered');
    expect(await runStartupPipelineIfDue(trigger, { env: { TECH_TREND_AUTO_DOMAINS: '' }, now, getLast: recent(100) })).toBe('skipped');
  });
  it('a failed-run record does not suppress the next startup run', async () => {
    const trigger = vi.fn(async () => ({ success: true, message: 'ok' }));
    expect(await runStartupPipelineIfDue(trigger, { env: {}, now, getLast: recent(1, 'skipped') })).toBe('triggered');
  });
  it('already running (trigger refused) is skipped without throwing', async () => {
    const trigger = vi.fn(async () => ({ success: false, message: 'already running' }));
    expect(await runStartupPipelineIfDue(trigger, { env: {}, now, getLast: async () => null })).toBe('skipped');
  });
});

// ── runTechTrendPipeline ──

type Ev = string;

function makeDeps(over: Partial<PipelineDeps> & { env?: Record<string, string | undefined> } = {}) {
  const events: Ev[] = [];
  const saved: PipelineResult[] = [];
  const running = { analysis: new Map<string, boolean>(), classify: new Map<string, boolean>() };
  const analysisStatus = (d: string) => ({ ...initialRunState(), running: running.analysis.get(d) ?? false, total: 3, analyzed: 2, judged: 1 });
  const classifyStatus = (d: string) => ({ ...initialClassifyState(), running: running.classify.get(d) ?? false, total: 5, classified: 4, offTopic: 1 });
  const logs: string[] = [];
  const warns: string[] = [];
  const deps: PipelineDeps = {
    env: { TECH_TREND_AUTO_DOMAINS: 'actuator,hand', ...(over.env ?? {}) },
    now: () => new Date(),
    geminiConfigured: () => true,
    analysis: {
      start: vi.fn(async (d: string) => {
        events.push(`analysis.start:${d}`);
        running.analysis.set(d, true);
        // 1 폴링(5s) 뒤 종료
        setTimeout(() => { running.analysis.set(d, false); events.push(`analysis.finish:${d}`); }, STATUS_POLL_MS);
        return { ok: true as const, queued: 3, total: 3 };
      }),
      getStatus: ((d: string) => analysisStatus(d)) as PipelineDeps['analysis']['getStatus'],
    },
    classifier: (d) => ({
      isConfigured: () => true,
      start: vi.fn(async () => {
        events.push(`classify.start:${d}`);
        running.classify.set(d, true);
        setTimeout(() => { running.classify.set(d, false); events.push(`classify.finish:${d}`); }, STATUS_POLL_MS);
        return { ok: true as const, queued: 5, total: 5 };
      }),
      getStatus: () => classifyStatus(d),
    }),
    isTaskRunning: () => false,
    saveResult: async (r) => { saved.push(r); },
    log: { info: (l) => logs.push(l), warn: (l) => warns.push(l), error: (l) => warns.push(l) },
    ...over,
  };
  // env 병합 보정 (over.env 는 위에서 처리됨)
  deps.env = { TECH_TREND_AUTO_DOMAINS: 'actuator,hand', ...(over.env ?? {}) };
  return { deps, events, saved, logs, warns, running };
}

beforeEach(() => { vi.useFakeTimers(); setStartupChainRunning(false); });
afterEach(() => { vi.useRealTimers(); });

async function run(deps: PipelineDeps, reason: 'cron' | 'startup' | 'manual' = 'cron') {
  const p = runTechTrendPipeline({ reason }, deps);
  await vi.runAllTimersAsync();
  return p;
}

describe('runTechTrendPipeline', () => {
  it('runs analysis -> wait -> grace -> classify -> wait per domain, in configured order', async () => {
    const { deps, events, saved, logs } = makeDeps();
    const result = await run(deps);
    expect(events).toEqual([
      'analysis.start:actuator', 'analysis.finish:actuator', 'classify.start:actuator', 'classify.finish:actuator',
      'analysis.start:hand', 'analysis.finish:hand', 'classify.start:hand', 'classify.finish:hand',
    ]);
    expect(result?.status).toBe('ok');
    expect(result?.domains.map((d) => d.domain)).toEqual(['actuator', 'hand']);
    expect(saved).toHaveLength(1);
    expect(logs.some((l) => l.startsWith('[TechTrendPipeline] reason=cron domain=actuator step=analysis status=started'))).toBe(true);
    expect(logs.at(-1)).toMatch(/^\[TechTrendPipeline\] reason=cron status=ok durationMs=\d+ domains=actuator,hand$/);
  });

  it('waits the 10s cache-invalidation grace after analysis before starting classify', async () => {
    const { deps, events } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    const p = runTechTrendPipeline({ reason: 'cron' }, deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['analysis.start:actuator']);
    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS); // 분석 종료 감지
    expect(events).toContain('analysis.finish:actuator');
    await vi.advanceTimersByTimeAsync(ANALYSIS_GRACE_MS - 1);
    expect(events).not.toContain('classify.start:actuator');
    await vi.advanceTimersByTimeAsync(1);
    expect(events).toContain('classify.start:actuator');
    await vi.runAllTimersAsync();
    await p;
  });

  it('saves a pipeline:last payload in the documented format', async () => {
    const { deps, saved } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator', TECH_TREND_AUTO_DAYS: '45' } });
    await run(deps, 'manual');
    const r = saved[0]!;
    expect(Object.keys(r)).toEqual(expect.arrayContaining(['status', 'reason', 'startedAt', 'finishedAt', 'durationMs', 'domains', 'config']));
    expect(r.reason).toBe('manual');
    expect(r.config).toEqual({ domains: ['actuator'], days: 45 });
    expect(r.domains[0]!.analysis).toMatchObject({ queued: 3, total: 3, analyzed: 2, judged: 1 });
    expect(r.domains[0]!.classify).toMatchObject({ queued: 5, classified: 4, offTopic: 1 });
    expect(deps.analysis.start).toHaveBeenCalledWith('actuator', 45);
  });

  it('analysis alreadyRunning: skips that domain (classify skipped too) and continues', async () => {
    const { deps, events } = makeDeps();
    const orig = deps.analysis.start as ReturnType<typeof vi.fn>;
    deps.analysis.start = vi.fn(async (d: string, days: number) =>
      d === 'actuator' ? { ok: true as const, alreadyRunning: true as const, queued: 0, total: 0 } : orig(d, days));
    const r = await run(deps);
    expect(r?.domains[0]).toMatchObject({ domain: 'actuator', analysis: { skipped: 'already_running' }, classify: { skipped: 'analysis_running' } });
    expect(events).not.toContain('classify.start:actuator');
    expect(events).toContain('classify.start:hand');
    expect(r?.status).toBe('ok');
  });

  it('classify alreadyRunning is recorded as skipped', async () => {
    const { deps } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    deps.classifier = () => ({
      isConfigured: () => true,
      start: async () => ({ ok: true as const, alreadyRunning: true as const, queued: 0, total: 0 }),
      getStatus: () => initialClassifyState(),
    });
    const r = await run(deps);
    expect(r?.domains[0]!.classify).toEqual({ skipped: 'already_running' });
  });

  it('no Gemini key: analysis skipped with a warning, classify still runs', async () => {
    const { deps, events, warns } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' }, geminiConfigured: () => false });
    const r = await run(deps);
    expect(r?.domains[0]!.analysis).toEqual({ skipped: 'gemini_not_configured' });
    expect(events).not.toContain('analysis.start:actuator');
    expect(events).toContain('classify.start:actuator');
    expect(warns.some((w) => w.includes('GEMINI_API_KEY'))).toBe(true);
  });

  it('no Anthropic key: classify skipped with a warning, analysis still runs', async () => {
    const { deps, events, warns } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    deps.classifier = () => ({ isConfigured: () => false, start: vi.fn(), getStatus: () => initialClassifyState() });
    const r = await run(deps);
    expect(r?.domains[0]!.classify).toEqual({ skipped: 'anthropic_not_configured' });
    expect(events).toContain('analysis.start:actuator');
    expect(warns.some((w) => w.includes('ANTHROPIC_API_KEY'))).toBe(true);
  });

  it('queued=0 proceeds without waiting or grace', async () => {
    const { deps, events } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    deps.analysis.start = vi.fn(async () => { events.push('analysis.start:actuator'); return { ok: true as const, queued: 0, total: 0 }; });
    deps.classifier = () => ({
      isConfigured: () => true,
      start: async () => { events.push('classify.start:actuator'); return { ok: true as const, queued: 0, total: 0 }; },
      getStatus: () => initialClassifyState(),
    });
    const p = runTechTrendPipeline({ reason: 'cron' }, deps);
    await vi.advanceTimersByTimeAsync(0); // 타이머 진행 없이 끝나야 한다
    const r = await p;
    expect(events).toEqual(['analysis.start:actuator', 'classify.start:actuator']);
    expect(r?.status).toBe('ok');
  });

  it('step timeout: records timeout, skips classify for that domain, moves on', async () => {
    const { deps, events, running } = makeDeps({ env: { TECH_TREND_PIPELINE_STEP_TIMEOUT_MIN: '1' } });
    const orig = deps.analysis.start as ReturnType<typeof vi.fn>;
    deps.analysis.start = vi.fn(async (d: string, days: number) => {
      if (d === 'actuator') { events.push('analysis.start:actuator'); running.analysis.set(d, true); return { ok: true as const, queued: 3, total: 3 }; } // 끝나지 않음
      return orig(d, days);
    });
    deps.analysis.getStatus = ((d: string) => ({ ...initialRunState(), running: running.analysis.get(d) ?? false, total: 3 })) as PipelineDeps['analysis']['getStatus'];
    const r = await run(deps);
    expect(r?.domains[0]!.analysis).toMatchObject({ timeout: true });
    expect(r?.domains[0]!.classify).toEqual({ skipped: 'analysis_timeout' });
    expect(events).not.toContain('classify.start:actuator');
    expect(events).toContain('analysis.start:hand');
    expect(r?.status).toBe('partial');
  });

  it('an exception in one domain does not stop the next', async () => {
    const { deps, events } = makeDeps();
    const orig = deps.analysis.start as ReturnType<typeof vi.fn>;
    deps.analysis.start = vi.fn(async (d: string, days: number) => {
      if (d === 'actuator') throw new Error('db blew up');
      return orig(d, days);
    });
    const r = await run(deps);
    expect(r?.domains[0]).toMatchObject({ domain: 'actuator', error: 'db blew up' });
    expect(events).toContain('classify.start:hand');
    expect(r?.status).toBe('partial');
  });

  it('never throws even if saving the result fails', async () => {
    const { deps } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    deps.saveResult = async () => { throw new Error('save failed'); };
    await expect(run(deps)).resolves.toBeTruthy();
  });

  it('empty domain list does nothing', async () => {
    const { deps, events, saved } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: '' } });
    expect(await run(deps)).toBeNull();
    expect(events).toEqual([]);
    expect(saved).toEqual([]);
  });

  it('waits while video-tagging runs and then proceeds', async () => {
    let busy = true;
    const { deps, events } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' }, isTaskRunning: (n: string) => n === 'video-tagging' && busy });
    const p = runTechTrendPipeline({ reason: 'cron' }, deps);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(events).toEqual([]);
    busy = false;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(events).toContain('analysis.start:actuator');
    await vi.runAllTimersAsync();
    expect((await p)?.status).toBe('ok');
  });

  it('also waits for the startup tagging chain flag', async () => {
    const { deps, events } = makeDeps({ env: { TECH_TREND_AUTO_DOMAINS: 'actuator' } });
    setStartupChainRunning(true);
    const p = runTechTrendPipeline({ reason: 'startup' }, deps);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(events).toEqual([]);
    setStartupChainRunning(false);
    await vi.runAllTimersAsync();
    expect((await p)?.status).toBe('ok');
  });

  it('busy beyond the wait limit: skipped:busy recorded, nothing started', async () => {
    const { deps, events, saved } = makeDeps({ env: { TECH_TREND_PIPELINE_BUSY_WAIT_MIN: '2' }, isTaskRunning: () => true });
    const r = await run(deps);
    expect(r).toMatchObject({ status: 'skipped', skipped: 'busy', domains: [] });
    expect(events).toEqual([]);
    expect(saved[0]!.skipped).toBe('busy');
  });
});

describe('summarizeStatus', () => {
  it('ok / partial / skipped / failed', () => {
    const d = (analysis: any, classify: any) => ({ domain: 'actuator' as const, analysis, classify });
    expect(summarizeStatus([d({ total: 1 }, { total: 1 })])).toBe('ok');
    expect(summarizeStatus([d({ skipped: 'already_running' }, { skipped: 'analysis_running' })])).toBe('skipped');
    expect(summarizeStatus([d({ total: 1 }, { timeout: true })])).toBe('partial');
    expect(summarizeStatus([d({ error: 'x' }, null)])).toBe('failed');
  });
});

describe('defaultDeps', () => {
  it('reads env lazily from process.env', () => {
    process.env.TECH_TREND_AUTO_DOMAINS = 'hand';
    expect(defaultDeps.env.TECH_TREND_AUTO_DOMAINS).toBe('hand');
    delete process.env.TECH_TREND_AUTO_DOMAINS;
  });
});
