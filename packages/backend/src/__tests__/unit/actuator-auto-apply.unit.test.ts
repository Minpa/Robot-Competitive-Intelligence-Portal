/**
 * actuator-auto-apply.service / data-migration.service / ops-log.util 단위 테스트 (DB·파일 모킹)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  hasMock: vi.fn(),
  applyMock: vi.fn(),
  keyMock: vi.fn(),
  inserted: [] as unknown[],
  locked: [] as unknown[],
  markerExists: { value: false },
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/data-migration.service.js', () => ({
  dataMigrationService: { has: h.hasMock },
}));
vi.mock('../../db/apply-actuator-data-update.js', () => ({
  applyActuatorDataUpdate: h.applyMock,
  computeActuatorDataKey: h.keyMock,
  resolveDefaultDataDir: () => '/data/dir',
}));

import { parseMode, autoApplyActuatorData, buildMarkerSummary, ADVISORY_LOCK_KEY } from '../../services/actuator-auto-apply.service.js';
import { formatLogLine } from '../../services/ops-log.util.js';

const KEY = 'actuator-update:0123456789ab';

/** applyActuatorDataUpdate 가짜 — 실제 구현처럼 hooks 를 가짜 tx 위에서 호출한다 */
function fakeApply(result: Record<string, unknown> = {}) {
  return async (opts: any) => {
    const tx = {
      execute: async (q: unknown) => { h.locked.push(q); },
      select: () => ({ from: () => ({ where: () => ({ limit: async () => (h.markerExists.value ? [{ key: KEY }] : []) }) }) }),
      insert: () => ({ values: (v: unknown) => ({ onConflictDoNothing: async () => { h.inserted.push(v); } }) }),
    };
    const base = {
      counters: { robots: { insert: 1, update: 0, skip: 0 } }, warnings: ['w'], createdCompanies: [], createdRobots: [],
      sectionsRun: ['suppliers', 'robots', 'ci'], dryRun: opts.dryRun, files: { robotsGeneratedAt: 'r', suppliersGeneratedAt: 's' }, ...result,
    };
    if (opts.txHooks) {
      if ((await opts.txHooks.beforeWrite(tx)) === 'skip') return { ...base, skipped: true, sectionsRun: [] };
      if (!opts.dryRun) await opts.txHooks.afterWrite(tx, base);
    }
    return base;
  };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.hasMock.mockReset().mockResolvedValue(false);
  h.applyMock.mockReset().mockImplementation(fakeApply());
  h.keyMock.mockReset().mockReturnValue(KEY);
  h.inserted.length = 0;
  h.locked.length = 0;
  h.markerExists.value = false;
  delete process.env.ACTUATOR_DATA_AUTO_APPLY;
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ACTUATOR_DATA_AUTO_APPLY;
});

describe('parseMode', () => {
  it('maps true/false/dry-run, default true', () => {
    expect(parseMode('true')).toBe('true');
    expect(parseMode('false')).toBe('false');
    expect(parseMode('dry-run')).toBe('dry-run');
    expect(parseMode(undefined)).toBe('true');
    expect(parseMode('')).toBe('true');
    expect(parseMode(' DRY-RUN ')).toBe('dry-run');
  });
  it('treats odd values as true and reports them', () => {
    const onInvalid = vi.fn();
    expect(parseMode('maybe', onInvalid)).toBe('true');
    expect(onInvalid).toHaveBeenCalledWith('maybe');
    parseMode('yes');
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('formatLogLine', () => {
  it('keeps field order, serializes objects as one-line JSON, quotes unsafe strings, skips undefined', () => {
    const line = formatLogLine('ActuatorAutoApply', {
      key: KEY, status: 'applied', durationMs: 12, counts: { a: { insert: 1 } }, error: 'boom: x y', skip: undefined, ok: true,
    });
    expect(line).toBe(`[ActuatorAutoApply] key=${KEY} status=applied durationMs=12 counts={"a":{"insert":1}} error="boom: x y" ok=true`);
  });
});

describe('autoApplyActuatorData', () => {
  it('false: touches neither files nor DB', async () => {
    process.env.ACTUATOR_DATA_AUTO_APPLY = 'false';
    const r = await autoApplyActuatorData();
    expect(r.status).toBe('disabled');
    expect(h.keyMock).not.toHaveBeenCalled();
    expect(h.hasMock).not.toHaveBeenCalled();
    expect(h.applyMock).not.toHaveBeenCalled();
    expect(logSpy.mock.calls[0]![0]).toContain('status=disabled');
  });

  it('key already applied: no apply call, status=skipped reason=already-applied', async () => {
    h.hasMock.mockResolvedValue(true);
    const r = await autoApplyActuatorData();
    expect(r).toMatchObject({ status: 'skipped', key: KEY, reason: 'already-applied' });
    expect(h.applyMock).not.toHaveBeenCalled();
    expect(logSpy.mock.calls[0]![0]).toContain('status=skipped reason=already-applied');
  });

  it('new key: applies with advisory lock and writes the marker in the same transaction', async () => {
    const r = await autoApplyActuatorData();
    expect(r.status).toBe('applied');
    expect(h.applyMock).toHaveBeenCalledTimes(1);
    const opts = h.applyMock.mock.calls[0]![0];
    expect(opts.dryRun).toBe(false);
    expect(opts.dataDir).toBe('/data/dir');
    expect(opts.createRobotCompanies).toBe(false);
    expect(h.locked).toHaveLength(1);
    expect(h.inserted).toHaveLength(1);
    const marker = h.inserted[0] as { key: string; summary: Record<string, any> };
    expect(marker.key).toBe(KEY);
    expect(marker.summary.counters.robots.insert).toBe(1);
    expect(marker.summary.files).toMatchObject({ robotsGeneratedAt: 'r', suppliersGeneratedAt: 's', sha: '0123456789ab' });
    expect(marker.summary.warningCount).toBe(1);
    expect(logSpy.mock.calls[0]![0]).toMatch(/^\[ActuatorAutoApply\] key=actuator-update:0123456789ab status=applied durationMs=\d+ counts=\{/);
    expect(ADVISORY_LOCK_KEY).toBeTypeOf('number');
  });

  it('ACTUATOR_DATA_CREATE_COMPANIES=true is passed through', async () => {
    process.env.ACTUATOR_DATA_CREATE_COMPANIES = 'true';
    await autoApplyActuatorData();
    expect(h.applyMock.mock.calls[0]![0].createRobotCompanies).toBe(true);
    delete process.env.ACTUATOR_DATA_CREATE_COMPANIES;
  });

  it('apply throws: does not throw, no marker, status=failed', async () => {
    h.applyMock.mockRejectedValue(new Error('db down'));
    const r = await autoApplyActuatorData();
    expect(r).toMatchObject({ status: 'failed', error: 'db down' });
    expect(h.inserted).toHaveLength(0);
    expect(errSpy.mock.calls[0]![0]).toContain('status=failed');
    expect(errSpy.mock.calls[0]![0]).toContain('error="db down"');
  });

  it('missing data files: fails before any DB access', async () => {
    h.keyMock.mockImplementation(() => { throw new Error('ENOENT robots.json'); });
    const r = await autoApplyActuatorData();
    expect(r.status).toBe('failed');
    expect(h.hasMock).not.toHaveBeenCalled();
    expect(h.applyMock).not.toHaveBeenCalled();
  });

  it('dry-run: no marker, no has() check, no hooks', async () => {
    process.env.ACTUATOR_DATA_AUTO_APPLY = 'dry-run';
    h.hasMock.mockResolvedValue(true); // 키가 있어도 dry-run 은 계속 진행
    const r = await autoApplyActuatorData();
    expect(r.status).toBe('dry-run');
    expect(h.hasMock).not.toHaveBeenCalled();
    expect(h.applyMock.mock.calls[0]![0]).toMatchObject({ dryRun: true, txHooks: undefined });
    expect(h.inserted).toHaveLength(0);
  });

  it('two concurrent calls: only one applies (lock + in-transaction recheck)', async () => {
    // 직렬화된 advisory lock 을 흉내: 첫 트랜잭션이 마커를 쓰면 두 번째 beforeWrite 가 skip 한다
    let chain: Promise<unknown> = Promise.resolve();
    h.applyMock.mockImplementation((opts: any) => {
      const run = chain.then(async () => {
        const tx = {
          execute: async () => {},
          select: () => ({ from: () => ({ where: () => ({ limit: async () => (h.markerExists.value ? [{ key: KEY }] : []) }) }) }),
          insert: () => ({ values: (v: unknown) => ({ onConflictDoNothing: async () => { h.inserted.push(v); h.markerExists.value = true; } }) }),
        };
        if ((await opts.txHooks.beforeWrite(tx)) === 'skip') return { skipped: true, sectionsRun: [], counters: {}, warnings: [], createdCompanies: [], createdRobots: [], dryRun: false, files: {} };
        const res = { counters: {}, warnings: [], createdCompanies: [], createdRobots: [], sectionsRun: ['ci'], dryRun: false, files: {} };
        await opts.txHooks.afterWrite(tx, res);
        return res;
      });
      chain = run;
      return run;
    });
    const [a, b] = await Promise.all([autoApplyActuatorData(), autoApplyActuatorData()]);
    expect([a.status, b.status].sort()).toEqual(['applied', 'skipped']);
    expect(h.inserted).toHaveLength(1);
  });
});

describe('buildMarkerSummary', () => {
  it('caps warnings at 50 and keeps the full count', () => {
    const warnings = Array.from({ length: 80 }, (_, i) => `w${i}`);
    const s = buildMarkerSummary(
      { counters: {}, warnings, createdCompanies: [], createdRobots: [], sectionsRun: ['ci'], dryRun: false, files: { robotsGeneratedAt: null, suppliersGeneratedAt: null } },
      KEY, 5,
    ) as any;
    expect(s.warnings).toHaveLength(50);
    expect(s.warningCount).toBe(80);
    expect(s.durationMs).toBe(5);
  });
});
