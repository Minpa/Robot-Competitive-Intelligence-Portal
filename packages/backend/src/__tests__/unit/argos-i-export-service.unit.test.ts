/**
 * argos-i-export.service — outcomes / 부분 성공 / 덮어쓰기 트랜잭션 / 상류 대기 / 캐치업 판정 / 보존 / 로그 / 정적 검사
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const h = vi.hoisted(() => ({ upsert: vi.fn(), get: vi.fn() }));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { upsert: h.upsert, get: h.get } }));

import {
  __resetArgosIExportStateForTests,
  defaultDeps,
  getRunningSnapshot,
  regenerateAfterWeeklyBrief,
  runArgosIExport,
  runStartupArgosIExportIfDue,
  startArgosIExportGeneration,
  type ArgosIExportDeps,
  type PersistInput,
} from '../../services/argos-i-export.service.js';
import {
  ARGOS_I_EXPORT_LOCK_KEY,
  computeRetentionCutoff,
  resolveBundleDate,
  shouldRunStartupArgosIExport,
  todayExportInstant,
} from '../../services/argos-i-export-config.js';
import { AREA_DEFS } from '../../services/argos-i-export-areas.js';
import { sha256Hex } from '../../services/argos-i-export-util.js';
import { COLLECTABLE_AREA_IDS } from '../../services/argos-i-export-collect.js';
import { argosIExportFiles, argosIExports } from '../../db/schema.js';
import { rawByArea } from '../fixtures/argos-i-export.fixture.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = 'test-token-0123456789abcdef0123456789abcdef';

interface Harness {
  deps: Partial<ArgosIExportDeps>;
  logs: { level: string; line: string }[];
  persisted: PersistInput[];
  saved: Record<string, unknown>[];
  retention: string[];
  setNow(iso: string): void;
}

function harness(opts: {
  now?: string;
  env?: Record<string, string | undefined>;
  failAreas?: Record<string, string>;
  locked?: boolean;
  busy?: () => boolean;
  collector?: (id: string) => Promise<unknown>;
  persistError?: Error;
  retentionError?: Error;
} = {}): Harness {
  let t = Date.parse(opts.now ?? '2026-10-28T22:00:00.000Z'); // = 2026-10-29 07:00 KST
  const logs: Harness['logs'] = [];
  const persisted: PersistInput[] = [];
  const saved: Record<string, unknown>[] = [];
  const retention: string[] = [];
  const raw = rawByArea();
  const deps: Partial<ArgosIExportDeps> = {
    now: () => new Date((t += 5)),
    env: { ARGOS_I_EXPORT_TOKEN: TOKEN, ...(opts.env ?? {}) },
    isUpstreamBusy: opts.busy ?? (() => false),
    sleep: async (ms) => {
      t += ms;
    },
    withLock: async (fn) => (opts.locked === false ? { locked: false } : { locked: true, value: await fn({ tx: true }) }),
    createCollector: () => ({
      collect: async (id) => {
        if (opts.collector) return opts.collector(id);
        if (opts.failAreas?.[id]) throw new Error(opts.failAreas[id]);
        return raw[id];
      },
    }),
    persist: async (_ex, input) => {
      if (opts.persistError) throw opts.persistError;
      persisted.push(input);
    },
    applyRetention: async (cutoff) => {
      retention.push(cutoff);
      if (opts.retentionError) throw opts.retentionError;
      return 1;
    },
    saveLast: async (s) => {
      saved.push(s);
    },
    log: (level, line) => {
      logs.push({ level, line });
    },
  };
  return { deps, logs, persisted, saved, retention, setNow: (iso) => (t = Date.parse(iso)) };
}

beforeEach(() => {
  __resetArgosIExportStateForTests();
  h.upsert.mockReset().mockResolvedValue(undefined);
  h.get.mockReset().mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

describe('collector coverage', () => {
  it('every registry area has a collector and vice versa', () => {
    expect([...COLLECTABLE_AREA_IDS].sort()).toEqual(AREA_DEFS.map((a) => a.id).sort());
  });
});

describe('runArgosIExport outcomes', () => {
  it('created: builds all 29 areas, persists once under the lock, saves the marker, applies retention', async () => {
    const x = harness();
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r).toMatchObject({ outcome: 'created', date: '2026-10-29', status: 'ok' });
    expect(x.persisted).toHaveLength(1);
    const p = x.persisted[0]!;
    expect(p.date).toBe('2026-10-29');
    expect(p.reason).toBe('cron');
    expect(p.bundle.fileCount).toBe(2 + 29 * 2);
    expect(p.bundle.files.map((f) => f.path).slice(0, 2)).toEqual(['README.md', 'manifest.json']);
    for (const f of p.bundle.files) expect(f.sha256).toBe(sha256Hex(f.content));
    expect(p.asOf < p.generatedAt).toBe(true);
    expect(x.saved).toHaveLength(1);
    expect(x.saved[0]).toMatchObject({ date: '2026-10-29', reason: 'cron', outcome: 'created', status: 'ok', fileCount: 60, error: null });
    expect(x.retention).toEqual(['2026-09-30']);
    expect(getRunningSnapshot().running).toBe(false);
  });

  it('the bundle manifest carries the commit (first 7 chars) and the weekly-brief reason', async () => {
    const x = harness({ env: { RAILWAY_GIT_COMMIT_SHA: 'abcdef0123456789' } });
    await runArgosIExport({ reason: 'weekly-brief' }, x.deps);
    const manifest = JSON.parse(x.persisted[0]!.bundle.files[1]!.content.toString('utf-8'));
    expect(manifest.generator).toEqual({ name: 'argos', commit: 'abcdef0' });
    expect(manifest.reason).toBe('weekly-brief');
  });

  it('skipped_locked when the advisory lock is held elsewhere (nothing persisted)', async () => {
    const x = harness({ locked: false });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r.outcome).toBe('skipped_locked');
    expect(x.persisted).toHaveLength(0);
    expect(x.logs.some((l) => l.line.includes('outcome=skipped_locked'))).toBe(true);
  });

  it('failed when a core (P0) area fails: nothing persisted, phase/area logged, existing bundle untouched', async () => {
    const x = harness({ failAreas: { papers: 'relation "articles" does not exist' } });
    const r = await runArgosIExport({ reason: 'manual' }, x.deps);
    expect(r).toMatchObject({ outcome: 'failed', status: null });
    expect(x.persisted).toHaveLength(0);
    const err = x.logs.find((l) => l.level === 'error')!;
    expect(err.line).toMatch(/^\[ArgosIExport\] reason=manual date=2026-10-29 outcome=failed phase=collect area=papers durationMs=\d+ error=/);
    expect(x.saved[0]).toMatchObject({ outcome: 'failed' });
    expect(x.retention).toHaveLength(0);
  });

  it('partial when only optional areas fail: file omitted, status failed in the manifest, area_failed:<id> warning', async () => {
    const x = harness({ failAreas: { keywords: 'boom', 'data-quality': 'boom2' } });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r).toMatchObject({ outcome: 'created', status: 'partial' });
    const b = x.persisted[0]!.bundle;
    expect(b.warnings).toEqual(['area_failed:data-quality', 'area_failed:keywords']);
    expect(b.files.some((f) => f.path.startsWith('keywords.'))).toBe(false);
    expect(b.manifest.areas.find((a) => a.id === 'keywords')).toMatchObject({ status: 'failed', files: [] });
    expect(b.fileCount).toBe(2 + 27 * 2);
    // overview 는 실패한 영역도 failed 로 요약한다
    const overview = JSON.parse(b.files.find((f) => f.path === 'overview.json')!.content.toString('utf-8'));
    expect(overview.data.areas.find((a: any) => a.id === 'keywords').status).toBe('failed');
  });

  it('failed with bundle_too_large when the bundle exceeds ARGOS_I_EXPORT_MAX_BUNDLE_MB (nothing persisted)', async () => {
    const big = rawByArea();
    const rows = Array.from({ length: 5000 }, (_v, i) => ({ ...big.news.rows[0], id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, title: `News ${i} ${'x'.repeat(200)}` }));
    const x = harness({ env: { ARGOS_I_EXPORT_MAX_BUNDLE_MB: '1' }, collector: async (id) => (id === 'news' ? { rows } : big[id]) });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r).toMatchObject({ outcome: 'failed', error: 'bundle_too_large' });
    expect(x.persisted).toHaveLength(0);
    expect(x.logs.find((l) => l.level === 'error')!.line).toContain('phase=size');
  });

  it('a persist (DB write) failure is a failed run and keeps the old bundle (the transaction rolls back)', async () => {
    const x = harness({ persistError: new Error('connection terminated') });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r).toMatchObject({ outcome: 'failed', error: 'connection terminated' });
    expect(x.logs.find((l) => l.level === 'error')!.line).toContain('phase=persist');
    expect(x.retention).toHaveLength(0);
  });

  it('already_running: a second concurrent trigger does not run (in-process guard)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const raw = rawByArea();
    const x = harness({ collector: async (id) => { await gate; return raw[id]; } });
    const first = runArgosIExport({ reason: 'cron' }, x.deps);
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(true));
    const second = await runArgosIExport({ reason: 'manual' }, x.deps);
    expect(second.outcome).toBe('already_running');
    const started = await startArgosIExportGeneration({}, x.deps);
    expect(started).toEqual({ started: false, skipped: 'already_running', date: '2026-10-29' });
    release();
    expect((await first).outcome).toBe('created');
    expect(x.persisted).toHaveLength(1);
  });

  it('phases are reported while running (collecting -> building -> persisting) and reset afterwards', async () => {
    const phases: string[] = [];
    const raw = rawByArea();
    const x = harness({ collector: async (id) => { phases.push(getRunningSnapshot().phase); return raw[id]; } });
    x.deps.persist = async () => { phases.push(getRunningSnapshot().phase); };
    await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(new Set(phases)).toEqual(new Set(['collecting', 'persisting']));
    expect(getRunningSnapshot()).toEqual({ running: false, phase: 'idle', current: null });
  });

  it('startArgosIExportGeneration returns immediately with 202 data and finishes in the background', async () => {
    const x = harness();
    const r = await startArgosIExportGeneration({}, x.deps);
    expect(r).toMatchObject({ started: true, date: '2026-10-29' });
    await vi.waitFor(() => expect(x.persisted).toHaveLength(1));
    expect(x.persisted[0]!.reason).toBe('manual');
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(false));
  });

  it('a hung collection is abandoned at the timeout and the run fails without persisting', async () => {
    vi.useFakeTimers();
    const x = harness({ env: { ARGOS_I_EXPORT_TIMEOUT_MIN: '1' }, collector: () => new Promise(() => undefined) });
    const p = runArgosIExport({ reason: 'cron' }, x.deps);
    await vi.advanceTimersByTimeAsync(61_000);
    const r = await p;
    expect(r).toMatchObject({ outcome: 'failed', error: 'timeout' });
    expect(x.persisted).toHaveLength(0);
  });

  it('the bundle date is the KST date of the start time', () => {
    expect(resolveBundleDate(new Date('2026-10-28T15:30:00Z'))).toBe('2026-10-29');
    expect(resolveBundleDate(new Date('2026-10-28T14:59:59Z'))).toBe('2026-10-28');
  });

  it('the advisory lock key is 724304 (distinct from 724301~724303)', () => {
    expect(ARGOS_I_EXPORT_LOCK_KEY).toBe(724304);
  });
});

describe('upstream wait', () => {
  it('waits in 60s steps while upstream is busy, then proceeds without a warning', async () => {
    let busy = 3;
    const sleeps: number[] = [];
    const x = harness({ busy: () => busy-- > 0 });
    const origSleep = x.deps.sleep!;
    x.deps.sleep = async (ms) => { sleeps.push(ms); await origSleep(ms); };
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r.outcome).toBe('created');
    expect(sleeps.length).toBeGreaterThanOrEqual(1);
    expect(sleeps.every((s) => s === 60_000)).toBe(true);
    expect(x.persisted[0]!.bundle.warnings).not.toContain('upstream_busy_timeout');
  });

  it('after ARGOS_I_EXPORT_BUSY_WAIT_MIN it proceeds anyway and records upstream_busy_timeout', async () => {
    const sleeps: number[] = [];
    const x = harness({ busy: () => true, env: { ARGOS_I_EXPORT_BUSY_WAIT_MIN: '3' } });
    const origSleep = x.deps.sleep!;
    x.deps.sleep = async (ms) => { sleeps.push(ms); await origSleep(ms); };
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r).toMatchObject({ outcome: 'created', status: 'ok' });
    expect(sleeps).toEqual([60_000, 60_000, 60_000]);
    expect(x.persisted[0]!.bundle.warnings).toEqual(['upstream_busy_timeout']);
    expect(x.persisted[0]!.bundle.manifest.warnings).toEqual(['upstream_busy_timeout']);
  });
});

describe('weekly-brief regeneration hook', () => {
  it('starts a run with reason weekly-brief', async () => {
    const x = harness();
    expect(await regenerateAfterWeeklyBrief(x.deps, { intervalMs: 1 })).toBe('started');
    await vi.waitFor(() => expect(x.persisted).toHaveLength(1));
    expect(x.persisted[0]!.reason).toBe('weekly-brief');
  });

  it('retries while another export is running, then gives up quietly', async () => {
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const raw = rawByArea();
    const x = harness({ collector: async (id) => { await gate; return raw[id]; } });
    const first = runArgosIExport({ reason: 'cron' }, x.deps);
    await vi.waitFor(() => expect(getRunningSnapshot().running).toBe(true));
    const sleeps: number[] = [];
    x.deps.sleep = async (ms) => { sleeps.push(ms); };
    expect(await regenerateAfterWeeklyBrief(x.deps, { attempts: 3, intervalMs: 7 })).toBe('skipped');
    expect(sleeps).toEqual([7, 7]);
    release();
    await first;
  });
});

describe('startup catch-up decision', () => {
  const at = (iso: string) => new Date(iso);
  it('todayExportInstant is 07:00 KST of the KST date', () => {
    expect(todayExportInstant(at('2026-10-29T03:00:00Z')).toISOString()).toBe('2026-10-28T22:00:00.000Z');
    expect(todayExportInstant(at('2026-10-28T22:30:00Z')).toISOString()).toBe('2026-10-28T22:00:00.000Z');
  });
  it.each([
    ['before 07:00 KST -> skip (cron handles it)', '2026-10-28T21:59:00Z', false, null, 3, false],
    ['after 07:00 and no bundle today -> run', '2026-10-28T22:01:00Z', false, null, 3, true],
    ['a bundle exists today -> skip', '2026-10-29T03:00:00Z', true, null, 3, false],
    ['last attempt within minGap -> skip', '2026-10-29T03:00:00Z', false, '2026-10-29T01:30:00Z', 3, false],
    ['last attempt older than minGap -> run', '2026-10-29T05:00:00Z', false, '2026-10-29T01:30:00Z', 3, true],
    ['minGap 0 allows an immediate retry', '2026-10-29T03:00:00Z', false, '2026-10-29T02:59:59Z', 0, true],
  ])('%s', (_n, now, todayExists, last, minGap, expected) => {
    expect(shouldRunStartupArgosIExport({ now: at(now), todayExists, lastAttemptAt: last ? at(last) : null, minGapHours: minGap })).toBe(expected);
  });

  it('runStartupArgosIExportIfDue triggers when due, skips otherwise, and waits for the upstream chain (max 30 min)', async () => {
    const trigger = vi.fn(async () => ({ success: true, message: 'ok' }));
    const logs: string[] = [];
    const base = { now: () => at('2026-10-29T03:00:00Z'), todayExists: async () => false, getLastSummary: async () => null, isChainRunning: () => false, log: (l: string) => logs.push(l), env: {} };
    expect(await runStartupArgosIExportIfDue(trigger, base)).toBe('triggered');
    expect(trigger).toHaveBeenCalledTimes(1);

    trigger.mockClear();
    expect(await runStartupArgosIExportIfDue(trigger, { ...base, todayExists: async () => true })).toBe('skipped');
    expect(trigger).not.toHaveBeenCalled();
    expect(logs.some((l) => l.startsWith('[ArgosIExport] reason=startup status=skipped detail='))).toBe(true);

    let polls = 0;
    const sleeps: number[] = [];
    expect(await runStartupArgosIExportIfDue(trigger, { ...base, isChainRunning: () => polls++ < 3, sleep: async (ms) => { sleeps.push(ms); } })).toBe('triggered');
    expect(sleeps).toEqual([60_000, 60_000]);

    sleeps.length = 0;
    await runStartupArgosIExportIfDue(trigger, { ...base, isChainRunning: () => true, sleep: async (ms) => { sleeps.push(ms); } });
    expect(sleeps.reduce((a, b) => a + b, 0)).toBe(30 * 60_000);
  });

  it('a scheduler refusal (task already running) is reported as skipped', async () => {
    const r = await runStartupArgosIExportIfDue(async () => ({ success: false, message: 'already running' }), {
      now: () => at('2026-10-29T03:00:00Z'), todayExists: async () => false, getLastSummary: async () => null, isChainRunning: () => false, log: () => undefined, env: {},
    });
    expect(r).toBe('skipped');
  });
});

describe('retention', () => {
  it('keeps today and the previous N-1 days: 30 days -> cutoff today-29; clamps to 7..90', () => {
    expect(computeRetentionCutoff('2026-10-29', 30)).toBe('2026-09-30');
    expect(computeRetentionCutoff('2026-10-29', 7)).toBe('2026-10-23');
    expect(computeRetentionCutoff('2026-10-29', 1)).toBe('2026-10-23'); // clamp up to 7
    expect(computeRetentionCutoff('2026-10-29', 500)).toBe('2026-08-01'); // clamp down to 90
    expect(computeRetentionCutoff('2026-03-01', 30)).toBe('2026-01-31');
    // 오늘 날짜는 어떤 N 에서도 cutoff 이후(유지) 이다
    for (const n of [1, 7, 30, 90, 1000]) expect(computeRetentionCutoff('2026-10-29', n) <= '2026-10-29').toBe(true);
  });

  it('ARGOS_I_EXPORT_RETENTION_DAYS drives the cutoff passed to the store', async () => {
    const x = harness({ env: { ARGOS_I_EXPORT_RETENTION_DAYS: '7' } });
    await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(x.retention).toEqual(['2026-10-23']);
    expect(x.logs.some((l) => l.line === '[ArgosIExport] phase=retention deleted=1 keepFrom=2026-10-23')).toBe(true);
  });

  it('a retention failure only logs a warning and does not turn the run into failed', async () => {
    const x = harness({ retentionError: new Error('lock timeout') });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r.outcome).toBe('created');
    expect(x.logs.some((l) => l.level === 'warn' && l.line.startsWith('[ArgosIExport] phase=retention warn=delete_failed'))).toBe(true);
  });
});

describe('persistence (single transaction, overwrite)', () => {
  it('deletes the day files, upserts the bundle row, then inserts every file — all on the same executor', async () => {
    const calls: string[] = [];
    const chain = (label: string) => {
      const o: any = {
        where: () => { calls.push(`${label}.where`); return Promise.resolve(); },
        values: (v: any) => { calls.push(`${label}.values:${v.path ?? v.exportDate}`); return o; },
        onConflictDoUpdate: (a: any) => { calls.push(`${label}.onConflictDoUpdate:${Object.keys(a.set).includes('exportDate')}`); return Promise.resolve(); },
        then: (res: any) => res(undefined),
      };
      return o;
    };
    const tx = {
      delete: (t: unknown) => chain(t === argosIExportFiles ? 'deleteFiles' : 'deleteOther'),
      insert: (t: unknown) => chain(t === argosIExports ? 'insertExport' : t === argosIExportFiles ? 'insertFile' : 'insertOther'),
    };
    const x = harness();
    delete x.deps.persist; // 실제 defaultDeps.persist 를 사용한다
    const r = await runArgosIExport({ reason: 'cron' }, { ...x.deps, withLock: async (fn) => ({ locked: true, value: await fn(tx) }) });
    expect(r.outcome).toBe('created');
    expect(calls[0]).toBe('deleteFiles.where');
    expect(calls[1]).toBe('insertExport.values:2026-10-29');
    expect(calls[2]).toBe('insertExport.onConflictDoUpdate:false');
    const fileInserts = calls.filter((c) => c.startsWith('insertFile.values:'));
    expect(fileInserts).toHaveLength(60);
    expect(fileInserts[0]).toBe('insertFile.values:README.md');
    expect(fileInserts[1]).toBe('insertFile.values:manifest.json');
    expect(calls.filter((c) => c.startsWith('delete') && c !== 'deleteFiles.where')).toHaveLength(0);
  });

  it('re-running the same day overwrites in place (same executor, delete before insert, no second exports row)', async () => {
    const seen: string[] = [];
    const tx = {
      delete: () => ({ where: async () => { seen.push('delete'); } }),
      insert: (t: unknown) => ({
        values: () => {
          const label = t === argosIExports ? 'exports' : 'file';
          seen.push(`insert:${label}`);
          return { onConflictDoUpdate: async () => { seen.push('upsert'); }, then: (res: any) => res(undefined) };
        },
      }),
    };
    for (let i = 0; i < 2; i++) {
      const x = harness();
      delete x.deps.persist;
      await runArgosIExport({ reason: 'manual' }, { ...x.deps, withLock: async (fn) => ({ locked: true, value: await fn(tx) }) });
    }
    expect(seen.filter((s) => s === 'delete')).toHaveLength(2);
    expect(seen.filter((s) => s === 'upsert')).toHaveLength(2); // ON CONFLICT DO UPDATE → 행 수는 늘지 않는다
    expect(seen.indexOf('delete')).toBeLessThan(seen.indexOf('upsert'));
  });
});

describe('logging', () => {
  it('success log is `[ArgosIExport] key=value ...` and neither tokens nor data bodies appear anywhere', async () => {
    const x = harness({ failAreas: { keywords: `leaked ${TOKEN} and SENTINEL_FULLTEXT_DO_NOT_EXPORT` } });
    await runArgosIExport({ reason: 'cron' }, x.deps);
    const ok = x.logs.find((l) => l.line.includes('outcome=created'))!;
    expect(ok.line).toMatch(/^\[ArgosIExport\] reason=cron date=2026-10-29 outcome=created status=partial files=\d+ bytes=\d+ durationMs=\d+ warnings=1$/);
    for (const l of x.logs) {
      expect(l.line.startsWith('[ArgosIExport]')).toBe(true);
      expect(l.line).not.toContain(TOKEN);
    }
    expect(JSON.stringify(x.saved)).not.toContain(TOKEN);
  });

  it('error messages are whitespace-normalized, redacted and capped at 500 chars', async () => {
    const x = harness({ failAreas: { papers: `line1\nline2 ${TOKEN} ${'z'.repeat(900)}` } });
    const r = await runArgosIExport({ reason: 'cron' }, x.deps);
    expect(r.error!.length).toBeLessThanOrEqual(500);
    expect(r.error).not.toContain(TOKEN);
    expect(r.error).not.toContain('\n');
    expect(r.error).toContain('[redacted]');
  });

  it('the default saveLast writes the argos-i-export:last marker', async () => {
    await defaultDeps.saveLast({ a: 1 });
    expect(h.upsert).toHaveBeenCalledWith('argos-i-export:last', { a: 1 });
  });
});

describe('static checks: read-only, no LLM / external calls, no filesystem writes', () => {
  const dir = path.resolve(here, '../../services');
  const routesDir = path.resolve(here, '../../routes');
  const files = [
    ...fs.readdirSync(dir).filter((f) => /^argos-i-export.*\.ts$/.test(f)).map((f) => path.join(dir, f)),
    ...fs.readdirSync(routesDir).filter((f) => /^argos-i.*\.ts$/.test(f)).map((f) => path.join(routesDir, f)),
  ];
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('finds the export sources', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });
  it('never imports an LLM SDK', () => {
    for (const f of files) {
      const src = strip(fs.readFileSync(f, 'utf-8'));
      expect(src, f).not.toMatch(/from ['"](@anthropic-ai\/sdk|openai|@google\/genai)['"]/);
      expect(src, f).not.toMatch(/ai-analyzer|insight-generator|external-ai-agent|strategic-ai-agent/);
    }
  });
  it('never calls the forbidden generation functions', () => {
    for (const f of files) {
      const src = strip(fs.readFileSync(f, 'utf-8'));
      for (const bad of ['getReport(', 'getTrendSummary(', 'getTechTrendSummary(', 'generateCards(', 'getInsight(']) {
        expect(src.includes(bad), `${f} calls ${bad}`).toBe(false);
      }
    }
  });
  it('makes no external HTTP calls and writes no files', () => {
    for (const f of files) {
      const src = strip(fs.readFileSync(f, 'utf-8'));
      expect(src, f).not.toMatch(/\bfetch\(|axios|https?\.request|node:https|from ['"]https?['"]/);
      expect(src, f).not.toMatch(/writeFile|appendFile|createWriteStream|mkdir|tmpdir/);
    }
  });
  it('the collector only issues SELECT statements', () => {
    const src = fs.readFileSync(path.join(dir, 'argos-i-export-collect.ts'), 'utf-8');
    expect(src).not.toMatch(/\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+TABLE|TRUNCATE|ALTER\s+TABLE)\b/i);
  });
});
