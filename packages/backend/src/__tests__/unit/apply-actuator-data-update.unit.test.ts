/**
 * apply-actuator-data-update.ts (라이브러리) / update-actuator-data.ts (CLI 래퍼) 분리 회귀.
 * DB 는 가짜 — 실제 DB 검증은 별도(임시 PostgreSQL)에서 수행한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

/** 어떤 체이닝 호출이든 빈 배열로 resolve 되는 가짜 쿼리 빌더 */
function emptyChain(): unknown {
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown[]) => void) => resolve([]);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const txFake = {
  select: () => emptyChain(),
  execute: vi.fn(async () => ({ rows: [] })),
};

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: { transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(txFake)) },
  };
});

import {
  applyActuatorDataUpdate,
  computeActuatorDataKey,
  resolveDefaultDataDir,
  LOGIC_VERSION,
  type ApplyLogger,
} from '../../db/apply-actuator-data-update.js';
import { db } from '../../db/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '../../db');
const realDir = path.join(dbDir, 'seed-data', 'actuator-update');

const logger = (): ApplyLogger & { lines: string[]; warns: string[] } => {
  const lines: string[] = [];
  const warns: string[] = [];
  return { lines, warns, detail: (m) => lines.push(m), info: (m) => lines.push(m), warn: (m) => warns.push(m) };
};

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'actuator-key-'));
  fs.writeFileSync(path.join(tmp, 'robots.json'), '{"robots":[]}');
  fs.writeFileSync(path.join(tmp, 'suppliers.json'), '{"products":[]}');
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('computeActuatorDataKey', () => {
  it('has the actuator-update:<12 hex> format', () => {
    expect(computeActuatorDataKey(tmp)).toMatch(/^actuator-update:[0-9a-f]{12}$/);
  });
  it('is stable for identical bytes and changes with a single character', () => {
    const k1 = computeActuatorDataKey(tmp);
    expect(computeActuatorDataKey(tmp)).toBe(k1);
    fs.writeFileSync(path.join(tmp, 'robots.json'), '{"robots": []}');
    expect(computeActuatorDataKey(tmp)).not.toBe(k1);
  });
  it('changes when suppliers.json changes by one byte', () => {
    const k1 = computeActuatorDataKey(tmp);
    fs.writeFileSync(path.join(tmp, 'suppliers.json'), '{"products":[] }');
    expect(computeActuatorDataKey(tmp)).not.toBe(k1);
  });
  it('changes with LOGIC_VERSION', () => {
    expect(computeActuatorDataKey(tmp, LOGIC_VERSION)).not.toBe(computeActuatorDataKey(tmp, LOGIC_VERSION + 1));
  });
  it('never reads *.sample.json and throws when a real file is missing', () => {
    fs.rmSync(path.join(tmp, 'suppliers.json'));
    fs.writeFileSync(path.join(tmp, 'suppliers.sample.json'), '{"products":[]}');
    expect(() => computeActuatorDataKey(tmp)).toThrow();
  });
  it('resolves the bundled data files', () => {
    expect(computeActuatorDataKey(realDir)).toMatch(/^actuator-update:[0-9a-f]{12}$/);
  });
});

describe('resolveDefaultDataDir', () => {
  it('points at seed-data/actuator-update next to the library module', () => {
    const dir = resolveDefaultDataDir();
    expect(dir.endsWith(path.join('seed-data', 'actuator-update'))).toBe(true);
    expect(path.dirname(path.dirname(dir))).toBe(dbDir);
  });
  it('library source is side-effect free and does not use __dirname', () => {
    const src = fs.readFileSync(path.join(dbDir, 'apply-actuator-data-update.ts'), 'utf-8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/process\.exit/);
    expect(code).not.toMatch(/process\.argv/);
    expect(code).not.toMatch(/__dirname/);
    expect(code).not.toMatch(/^main\(/m);
    expect(code).toMatch(/import\.meta\.url/);
  });
});

describe('applyActuatorDataUpdate', () => {
  it('importing the library does not call process.exit', () => {
    // 모듈은 이미 정적 import 되었다 — exit 가 호출됐다면 vitest 워커가 이미 종료되었을 것이다
    const spy = vi.spyOn(process, 'exit');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('fails before touching the DB when an input file is missing / invalid', async () => {
    fs.writeFileSync(path.join(tmp, 'robots.json'), '{not json');
    await expect(applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, logger: logger() })).rejects.toThrow(/robots\.json/);
    expect(db.transaction).not.toHaveBeenCalled();
    fs.rmSync(path.join(tmp, 'suppliers.json'));
    await expect(applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['suppliers'], logger: logger() })).rejects.toThrow(/suppliers\.json/);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('beforeWrite skip: no section runs and afterWrite is not called', async () => {
    const afterWrite = vi.fn();
    const r = await applyActuatorDataUpdate({
      dryRun: false, dataDir: realDir, logger: logger(),
      txHooks: { beforeWrite: async () => 'skip', afterWrite },
    });
    expect(r.skipped).toBe(true);
    expect(r.sectionsRun).toEqual([]);
    expect(afterWrite).not.toHaveBeenCalled();
    expect(txFake.execute).not.toHaveBeenCalled();
  });

  it('proceed runs sections then afterWrite inside the same transaction', async () => {
    const order: string[] = [];
    const log = logger();
    const r = await applyActuatorDataUpdate({
      dryRun: false, dataDir: realDir, sections: ['ci'], logger: log,
      txHooks: {
        beforeWrite: async () => { order.push('before'); return 'proceed'; },
        afterWrite: async (_tx, res) => { order.push('after'); expect(res.sectionsRun).toEqual(['ci']); },
      },
    });
    expect(order).toEqual(['before', 'after']);
    expect(r.sectionsRun).toEqual(['ci']);
    expect(r.warnings.length).toBe(1); // ci_layers 없음 → 경고 후 건너뜀
    expect(log.warns[0]).toContain("ci_layers");
    expect(r.files.robotsGeneratedAt === null || typeof r.files.robotsGeneratedAt === 'string').toBe(true);
  });

  it('dry-run always rolls back: afterWrite never called, rollback error swallowed', async () => {
    const afterWrite = vi.fn();
    const r = await applyActuatorDataUpdate({
      dryRun: true, dataDir: realDir, sections: ['ci'], logger: logger(),
      txHooks: { beforeWrite: async () => 'proceed', afterWrite },
    });
    expect(r.dryRun).toBe(true);
    expect(afterWrite).not.toHaveBeenCalled();
    expect(txFake.execute).toHaveBeenCalled(); // SELECT 1 안전장치
  });

  it('propagates an error thrown inside the transaction', async () => {
    await expect(
      applyActuatorDataUpdate({
        dryRun: false, dataDir: realDir, logger: logger(),
        txHooks: { beforeWrite: async () => { throw new Error('lock failed'); }, afterWrite: async () => {} },
      }),
    ).rejects.toThrow('lock failed');
  });

  it('routes detail/info/warn through the injected logger only (no console output)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = logger();
    await applyActuatorDataUpdate({ dryRun: true, dataDir: realDir, sections: ['ci'], logger: log });
    expect(spy).not.toHaveBeenCalled();
    expect(log.lines.some((l) => l.includes('DRY-RUN'))).toBe(true);
    expect(log.lines.some((l) => l.includes('[ci]'))).toBe(true);
    spy.mockRestore();
  });
});

describe('CLI wrapper (update-actuator-data.ts)', () => {
  it('parses --dry-run/--only/--data-dir/--create-companies and prints the original result block', async () => {
    vi.resetModules();
    const apply = vi.fn(async () => ({
      counters: { robots: { insert: 1, update: 0, skip: 2 } }, warnings: ['w1'], createdCompanies: [], createdRobots: ['A / B'],
      sectionsRun: ['robots'], dryRun: true, files: { robotsGeneratedAt: null, suppliersGeneratedAt: null },
    }));
    vi.doMock('../../db/apply-actuator-data-update.js', async (orig) => ({
      ...(await orig<typeof import('../../db/apply-actuator-data-update.js')>()),
      applyActuatorDataUpdate: apply,
    }));
    const argvBefore = process.argv;
    process.argv = ['node', 'update-actuator-data.ts', '--dry-run', '--only', 'robots', '--data-dir', '/x/dir', '--create-companies'];
    const out: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a) => { out.push(a.join(' ')); });
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    try {
      await import('../../db/update-actuator-data.js');
      await vi.waitFor(() => expect(exit).toHaveBeenCalled());
    } finally {
      process.argv = argvBefore;
    }
    expect(exit).toHaveBeenCalledWith(0);
    const call = (apply.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(call.dryRun).toBe(true);
    expect(call.dataDir).toBe(path.resolve('/x/dir'));
    expect(call.createRobotCompanies).toBe(true);
    expect([...(call.sections as Set<string>)]).toEqual(['robots']);
    const text = out.join('\n');
    expect(text).toContain('=== 결과 (dry-run — 실제 쓰기 0) ===');
    expect(text).toContain('신규 생성 로봇 1건:\n  - A / B');
    expect(text).toContain('경고 1건:');
    vi.doUnmock('../../db/apply-actuator-data-update.js');
  });
});
