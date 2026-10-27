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
  loadActuatorDataFiles,
  resolveDefaultDataDir,
  LOGIC_VERSION,
  type ApplyLogger,
} from '../../db/apply-actuator-data-update.js';
import { ACTUATOR_SOURCING_DDL_STATEMENTS } from '../../db/actuator-sourcing.ddl.js';
import { ALL_SECTIONS } from '../../db/actuator-update.util.js';
import { db, companies, humanoidRobots, actuatorSourcing, actuatorAdoptions, actuatorVendorMarkets } from '../../db/index.js';

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


// ============================================================
// sourcing / adoptions 섹션
// ============================================================

describe('LOGIC_VERSION / key with the new files', () => {
  it('LOGIC_VERSION is 2 and there are five sections', () => {
    expect(LOGIC_VERSION).toBe(2);
    expect(ALL_SECTIONS).toHaveLength(5);
  });

  it('missing new files hash like zero-byte files (never throws)', () => {
    const k0 = computeActuatorDataKey(tmp);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), '');
    fs.writeFileSync(path.join(tmp, 'demand-cases.json'), '');
    expect(computeActuatorDataKey(tmp)).toBe(k0);
  });

  it('reacts to a one-byte change in either new file and to adding one', () => {
    const k0 = computeActuatorDataKey(tmp);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), '{"robots":[]}');
    const k1 = computeActuatorDataKey(tmp);
    expect(k1).not.toBe(k0);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), '{"robots": []}');
    expect(computeActuatorDataKey(tmp)).not.toBe(k1);
    const k2 = computeActuatorDataKey(tmp);
    fs.writeFileSync(path.join(tmp, 'demand-cases.json'), '{"cases":[]}');
    const k3 = computeActuatorDataKey(tmp);
    expect(k3).not.toBe(k2);
    fs.writeFileSync(path.join(tmp, 'demand-cases.json'), '{"cases":[] }');
    expect(computeActuatorDataKey(tmp)).not.toBe(k3);
  });

  it('does not read sample files for the new inputs either', () => {
    const k0 = computeActuatorDataKey(tmp);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.sample.json'), '{"robots":[]}');
    fs.writeFileSync(path.join(tmp, 'demand-cases.sample.json'), '{"cases":[]}');
    expect(computeActuatorDataKey(tmp)).toBe(k0);
  });
});

describe('loadActuatorDataFiles (new sections)', () => {
  it('missing sourcing/adoptions files => null + one warning each, no throw', () => {
    const r = loadActuatorDataFiles(tmp, ['sourcing', 'adoptions']);
    expect(r.sourcingFile).toBeNull();
    expect(r.adoptionsFile).toBeNull();
    expect(r.warnings).toHaveLength(2);
    expect(r.robotsFile).toBeNull();
  });

  it('only reads the files of the requested sections', () => {
    expect(loadActuatorDataFiles(tmp, ['robots']).warnings).toEqual([]);
  });

  it('broken JSON and broken top-level structure throw; element violations only warn', () => {
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), '{broken');
    expect(() => loadActuatorDataFiles(tmp, ['sourcing'])).toThrow(/sourcing-regrade\.json/);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), '{"nope":1}');
    expect(() => loadActuatorDataFiles(tmp, ['sourcing'])).toThrow(/"robots" 배열/);
    fs.writeFileSync(path.join(tmp, 'sourcing-regrade.json'), JSON.stringify({ robots: [{ name: 'A', company: 'B', sourcing: 'bad' }, { name: 'A', company: 'B', sourcing: 'unknown' }] }));
    const r = loadActuatorDataFiles(tmp, ['sourcing']);
    expect(r.sourcingFile!.robots).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
    fs.writeFileSync(path.join(tmp, 'demand-cases.json'), '{"cases": 3}');
    expect(() => loadActuatorDataFiles(tmp, ['adoptions'])).toThrow(/"cases" 배열/);
  });
});

/** sourcing/adoptions 섹션용 가짜 트랜잭션: 테이블별 행 저장소 + 쓰기 기록. upsert 후 다음 select 에서 보이도록 영속 흉내 */
function makeStore(initial: Map<unknown, Record<string, unknown>[]>) {
  const tables = initial;
  const writes: { table: unknown; values: Record<string, unknown> }[] = [];
  const selects: unknown[] = [];
  let seq = 0;
  const keyOf = (table: unknown): string => (table === actuatorSourcing ? 'robotId' : table === actuatorAdoptions ? 'caseKey' : 'vendorKey');
  const tx = {
    execute: vi.fn(async () => ({})),
    select: () => ({
      from: (table: unknown) => {
        selects.push(table);
        const rows = tables.get(table) ?? [];
        return { then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(rows).then(res, rej) };
      },
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async () => {
          writes.push({ table, values });
          const rows = tables.get(table) ?? [];
          const k = keyOf(table);
          const row = { id: `gen-${++seq}`, ...values, updatedAt: new Date() };
          const i = rows.findIndex((r) => r[k] === values[k]);
          if (i >= 0) rows[i] = { ...rows[i], ...row, id: rows[i]!.id }; else rows.push(row);
          tables.set(table, rows);
        },
      }),
    }),
  };
  return { tx, writes, selects, tables };
}

const baseTables = (): Map<unknown, Record<string, unknown>[]> =>
  new Map<unknown, Record<string, unknown>[]>([
    [companies, [
      { id: 'c1', name: 'Boston Dynamics', category: 'robot', country: 'USA' },
      { id: 'c2', name: 'Tesla', category: 'robot', country: 'USA' },
    ]],
    [humanoidRobots, [
      { id: 'r1', companyId: 'c1', name: 'Atlas (Electric)' },
      { id: 'r2', companyId: 'c2', name: 'Optimus Gen 2' },
    ]],
  ]);

const sourcingJson = (over: Record<string, unknown> = {}) => ({
  generatedAt: '2026-10-26T00:00:00+00:00',
  robots: [
    { name: 'Atlas (Electric)', company: 'Boston Dynamics', sourcing: 'mixed', sellsExternally: false, evidenceGrade: 'A', evidence: [{ claim: 'c', source: 's', url: 'https://x.test', grade: 'A', date: '2026-01' }], externalVendors: [{ vendor: 'Hyundai Mobis', role: 'supply', grade: 'A', url: 'https://x.test', level: 'module' }], noteKo: 'n' },
    { name: 'Optimus Gen 2', company: 'Tesla', sourcing: 'in_house_confirmed', sellsExternally: null, evidenceGrade: 'B', evidence: [], externalVendors: [], noteKo: null },
    { name: 'Ghost', company: 'Tesla', sourcing: 'unknown', sellsExternally: null, evidence: [], externalVendors: [] },
  ],
  ...over,
});
const adoptionsJson = () => ({
  generatedAt: '2026-10-26T00:00:00+00:00',
  cases: [
    { robotName: 'K-Bot', company: 'K-Scale Labs', country: 'US', segment: 'research_platform', robotClass: 'humanoid', actuatorVendor: 'RobStride Dynamics', actuatorModel: null, usage: 'legs', evidenceGrade: 'C', sources: [{ source: 'AI Wiki', url: 'https://aiwiki.test/x', date: null }], noteKo: null, year: 2025, level: 'module' },
    { robotName: 'Rex', company: 'Rex Bionics', country: 'NZ', segment: 'exoskeleton', robotClass: null, actuatorVendor: 'maxon', actuatorModel: 'RE 40', usage: 'legs', evidenceGrade: 'A', sources: [], noteKo: null, year: 2016, level: 'component' },
  ],
  vendorTargetMarkets: [{ vendor: 'maxon', targetMarketsKo: ['외골격'], grade: 'A', url: 'https://maxon.test' }],
});

function writeData(dir: string, s: unknown = sourcingJson(), a: unknown = adoptionsJson()) {
  fs.writeFileSync(path.join(dir, 'sourcing-regrade.json'), JSON.stringify(s));
  fs.writeFileSync(path.join(dir, 'demand-cases.json'), JSON.stringify(a));
}

function useTx(store: ReturnType<typeof makeStore>) {
  (db.transaction as unknown as { mockImplementationOnce: (f: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>) => void }).mockImplementationOnce(
    async (fn) => fn(store.tx),
  );
}

describe('applyActuatorDataUpdate: sourcing + adoptions (mock transaction)', () => {
  it('first run inserts rows, warns on unmatched/duplicate robots, creates no robots/companies, runs DDL first', async () => {
    writeData(tmp, sourcingJson({ robots: [...(sourcingJson().robots as unknown[]), { name: 'Atlas (Electric)', company: 'Boston Dynamics', sourcing: 'external', evidence: [], externalVendors: [] }] }));
    const store = makeStore(baseTables());
    useTx(store);
    const log = logger();
    const r = await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: log });
    expect(r.sectionsRun).toEqual(['sourcing', 'adoptions']);
    expect(r.counters.actuator_sourcing).toEqual({ insert: 2, update: 0, skip: 0 });
    expect(r.counters.actuator_adoptions).toEqual({ insert: 2, update: 0, skip: 0 });
    expect(r.counters.actuator_vendor_markets).toEqual({ insert: 1, update: 0, skip: 0 });
    expect(r.counters.humanoid_robots).toBeUndefined();
    expect(r.counters.companies).toBeUndefined();
    expect(r.warnings.some((w) => w.startsWith('sourcing 대상 로봇 없음') && w.includes('Ghost'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('sourcing 중복 로봇'))).toBe(true);
    expect(r.files.sourcingGeneratedAt).toBe('2026-10-26T00:00:00+00:00');
    expect(r.files.adoptionsGeneratedAt).toBe('2026-10-26T00:00:00+00:00');
    // 마지막 중복 항목이 사용됨
    const atlas = store.writes.find((w) => w.table === actuatorSourcing && w.values.robotId === 'r1')!;
    expect(atlas.values.sourcing).toBe('external');
    // DDL 4문장이 쓰기보다 먼저 실행
    expect(store.tx.execute).toHaveBeenCalledTimes(ACTUATOR_SOURCING_DDL_STATEMENTS.length);
    // 쓰기는 새 세 테이블에만
    expect(new Set(store.writes.map((w) => w.table))).toEqual(new Set([actuatorSourcing, actuatorAdoptions, actuatorVendorMarkets]));
    const adoption = store.writes.find((w) => w.table === actuatorAdoptions && w.values.robotName === 'Rex')!;
    expect(adoption.values).toMatchObject({ level: 'component', segment: 'exoskeleton', adoptedYear: 2016, sources: [] });
    expect(adoption.values.caseKey).toBe('rexbionics|rex|maxon|re40');
    const kbot = store.writes.find((w) => w.table === actuatorAdoptions && w.values.robotName === 'K-Bot')!;
    expect(kbot.values.sources).toEqual([{ url: 'https://aiwiki.test/x', title: 'AI Wiki', date: null }]);
  });

  it('re-running identical data gives insert 0 / update 0 and writes nothing', async () => {
    writeData(tmp);
    const store = makeStore(baseTables());
    useTx(store);
    await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: logger() });
    const writesAfterFirst = store.writes.length;
    useTx(store);
    const r2 = await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: logger() });
    expect(store.writes.length).toBe(writesAfterFirst);
    for (const t of ['actuator_sourcing', 'actuator_adoptions', 'actuator_vendor_markets']) {
      expect(r2.counters[t]!.insert).toBe(0);
      expect(r2.counters[t]!.update).toBe(0);
      expect(r2.counters[t]!.skip).toBeGreaterThan(0);
    }
  });

  it('a changed element is overwritten (update 1), others skip; rows missing from the file are kept', async () => {
    writeData(tmp);
    const store = makeStore(baseTables());
    useTx(store);
    await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: logger() });
    const s2 = sourcingJson();
    (s2.robots as { noteKo: string | null }[])[1]!.noteKo = '새 메모';
    const a2 = adoptionsJson();
    a2.cases.pop();
    writeData(tmp, s2, a2);
    useTx(store);
    const log = logger();
    const r = await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: log });
    expect(r.counters.actuator_sourcing).toMatchObject({ insert: 0, update: 1, skip: 1 });
    expect(r.counters.actuator_adoptions).toMatchObject({ insert: 0, update: 0, skip: 1 });
    expect(store.tables.get(actuatorAdoptions)).toHaveLength(2); // 삭제하지 않음
    expect(log.lines.some((l) => l.includes('파일에 없는 기존 행 1건 유지'))).toBe(true);
  });

  it('dry-run writes nothing but still counts, and rolls back', async () => {
    writeData(tmp);
    const store = makeStore(baseTables());
    useTx(store);
    const afterWrite = vi.fn();
    const r = await applyActuatorDataUpdate({
      dryRun: true, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: logger(),
      txHooks: { beforeWrite: async () => 'proceed', afterWrite },
    });
    expect(store.writes).toHaveLength(0);
    expect(r.counters.actuator_sourcing!.insert).toBe(2);
    expect(r.counters.actuator_adoptions!.insert).toBe(2);
    expect(afterWrite).not.toHaveBeenCalled();
  });

  it('a robot with a dry-run placeholder id is counted without any DB lookup or write', async () => {
    writeData(tmp, sourcingJson({ robots: [{ name: 'Atlas (Electric)', company: 'Boston Dynamics', sourcing: 'unknown', evidence: [], externalVendors: [] }] }));
    const tables = baseTables();
    tables.set(humanoidRobots, [{ id: 'dry:1:robot:Atlas', companyId: 'c1', name: 'Atlas (Electric)' }]);
    const store = makeStore(tables);
    useTx(store);
    const r = await applyActuatorDataUpdate({ dryRun: true, dataDir: tmp, sections: ['sourcing'], logger: logger() });
    expect(r.counters.actuator_sourcing!.insert).toBe(1);
    expect(store.selects).not.toContain(actuatorSourcing);
    expect(store.writes).toHaveLength(0);
  });

  it('missing new files: sections are skipped with one warning each, no DDL', async () => {
    const store = makeStore(baseTables());
    useTx(store);
    const r = await applyActuatorDataUpdate({ dryRun: false, dataDir: tmp, sections: ['sourcing', 'adoptions'], logger: logger() });
    expect(r.sectionsRun).toEqual([]);
    expect(r.warnings).toHaveLength(2);
    expect(store.tx.execute).not.toHaveBeenCalled();
    expect(store.writes).toHaveLength(0);
  });

  it('runs after robots/suppliers/ci in the requested order and the bundled files load without warnings', async () => {
    const store = makeStore(baseTables());
    useTx(store);
    const r = await applyActuatorDataUpdate({ dryRun: true, dataDir: realDir, sections: ['adoptions', 'sourcing'], logger: logger() });
    expect(r.sectionsRun).toEqual(['sourcing', 'adoptions']); // 입력 순서와 무관하게 고정 순서
    expect(r.counters.actuator_adoptions!.insert).toBe(38);
    expect(r.counters.actuator_vendor_markets!.insert).toBe(18);
    expect(r.warnings.filter((w) => !w.startsWith('sourcing 대상 로봇 없음'))).toEqual([]);
  });
});
