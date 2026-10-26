/**
 * actuator_sourcing / actuator_adoptions / actuator_vendor_markets 적용 통합 테스트
 *
 * 임시 PostgreSQL 이 필요하다. TEST_DATABASE_URL 이 없으면 전체 생략된다.
 *   1) 마이그레이션이 적용된 빈 DB 를 준비 (예: DATABASE_URL=… npx tsx src/db/migrate.ts)
 *   2) TEST_DATABASE_URL=postgres://… npx vitest run src/__tests__/integration/actuator-sourcing-apply.integration.test.ts
 * 테스트는 시작할 때 새 세 테이블을 DROP 해서 "사전 테이블 없음" 상태에서 첫 적용이 테이블을 만드는지 검증한다.
 * ⚠ 이 DB 의 companies / humanoid_robots / components 등에 시드 데이터를 쓰므로 운영 DB 로 실행하지 말 것.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const TEST_URL = process.env.TEST_DATABASE_URL;

type Mods = {
  sql: typeof import('drizzle-orm').sql;
  db: typeof import('../../db/index.js').db;
  apply: typeof import('../../db/apply-actuator-data-update.js');
  auto: typeof import('../../services/actuator-auto-apply.service.js');
  svc: typeof import('../../services/actuator-position-map.service.js');
  migrations: typeof import('../../services/data-migration.service.js').dataMigrationService;
  ensure: typeof import('../../db/actuator-sourcing.ddl.js').ensureActuatorSourcingTables;
};

const silent = { detail: () => {}, info: () => {}, warn: () => {} };

describe.skipIf(!TEST_URL)('actuator sourcing / adoptions apply (temp PostgreSQL)', () => {
  let m: Mods;
  const prevEnv: Record<string, string | undefined> = {};

  const count = async (table: string): Promise<number> => {
    const r = await m.db.execute(m.sql.raw(`SELECT count(*)::int AS n FROM ${table}`));
    return (r.rows[0] as { n: number }).n;
  };
  const runApply = (over: Record<string, unknown> = {}) =>
    m.apply.applyActuatorDataUpdate({
      dryRun: false,
      createRobotCompanies: true,
      sections: ['suppliers', 'robots', 'sourcing', 'adoptions'],
      logger: silent,
      ...over,
    });

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'ACTUATOR_DATA_AUTO_APPLY', 'ACTUATOR_DATA_CREATE_COMPANIES']) prevEnv[k] = process.env[k];
    process.env.DATABASE_URL = TEST_URL;
    process.env.ACTUATOR_DATA_AUTO_APPLY = 'true';
    process.env.ACTUATOR_DATA_CREATE_COMPANIES = 'true';
    const drizzle = await import('drizzle-orm');
    const dbMod = await import('../../db/index.js');
    m = {
      sql: drizzle.sql,
      db: dbMod.db,
      apply: await import('../../db/apply-actuator-data-update.js'),
      auto: await import('../../services/actuator-auto-apply.service.js'),
      svc: await import('../../services/actuator-position-map.service.js'),
      migrations: (await import('../../services/data-migration.service.js')).dataMigrationService,
      ensure: (await import('../../db/actuator-sourcing.ddl.js')).ensureActuatorSourcingTables,
    };
    await m.migrations.ensureTable();
    await m.db.execute(m.sql.raw('DROP TABLE IF EXISTS actuator_sourcing, actuator_adoptions, actuator_vendor_markets CASCADE'));
    await m.db.execute(m.sql.raw(`DELETE FROM data_migrations WHERE key LIKE 'actuator-update:%'`));
  });

  afterAll(async () => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('first apply creates the tables itself and inserts rows (no pre-existing tables)', async () => {
    const robotsBefore = await count('humanoid_robots');
    const r = await runApply();
    expect(r.counters.actuator_sourcing!.insert).toBeGreaterThan(0);
    expect(r.counters.actuator_adoptions!.insert).toBe(30);
    expect(r.counters.actuator_vendor_markets!.insert).toBe(18);
    expect(await count('actuator_sourcing')).toBe(r.counters.actuator_sourcing!.insert);
    expect(await count('actuator_adoptions')).toBe(30);
    expect(await count('actuator_vendor_markets')).toBe(18);
    // sourcing/adoptions 는 로봇을 만들지 않는다: 늘어난 로봇 수 = robots 섹션이 만든 수
    expect((await count('humanoid_robots')) - robotsBefore).toBe(r.createdRobots.length);
    expect(r.warnings.filter((w) => w.startsWith('sourcing 대상 로봇 없음'))).toEqual([]);
  });

  it('second apply: new tables insert 0 / update 0', async () => {
    const robotsBefore = await count('humanoid_robots');
    const r = await runApply();
    for (const t of ['actuator_sourcing', 'actuator_adoptions', 'actuator_vendor_markets']) {
      expect(r.counters[t]!.insert, t).toBe(0);
      expect(r.counters[t]!.update, t).toBe(0);
      expect(r.counters[t]!.skip, t).toBeGreaterThan(0);
    }
    expect(await count('humanoid_robots')).toBe(robotsBefore);
  });

  it('dry-run writes nothing and rolls back', async () => {
    await m.db.execute(m.sql.raw(`UPDATE actuator_sourcing SET note_ko = 'tampered' WHERE robot_id IN (SELECT robot_id FROM actuator_sourcing LIMIT 1)`));
    const r = await runApply({ dryRun: true });
    expect(r.counters.actuator_sourcing!.update).toBe(1);
    const still = await m.db.execute(m.sql.raw(`SELECT count(*)::int AS n FROM actuator_sourcing WHERE note_ko = 'tampered'`));
    expect((still.rows[0] as { n: number }).n).toBe(1); // dry-run 이 되돌리지 않았다
    const real = await runApply();
    expect(real.counters.actuator_sourcing!.update).toBe(1); // 실제 적용이 파일 값으로 덮어쓴다
    const fixed = await m.db.execute(m.sql.raw(`SELECT count(*)::int AS n FROM actuator_sourcing WHERE note_ko = 'tampered'`));
    expect((fixed.rows[0] as { n: number }).n).toBe(0);
  });

  it('--only sourcing,adoptions works on its own', async () => {
    const r = await runApply({ sections: ['sourcing', 'adoptions'], createRobotCompanies: false });
    expect(r.sectionsRun).toEqual(['sourcing', 'adoptions']);
    expect(r.counters.actuator_sourcing!.insert + r.counters.actuator_sourcing!.update).toBe(0);
  });

  it('the position map service reflects the applied sourcing posture', async () => {
    await m.svc.actuatorPositionMapService.invalidate();
    const map = await m.svc.actuatorPositionMapService.getMap();
    expect(map.schemaVersion).toBe(2);
    expect(map.adoptions).toHaveLength(30);
    expect(map.vendorMarkets).toHaveLength(18);
    expect(map.segmentOrder).toEqual(['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other']);
    expect(map.stats.adoptions).toBe(30);

    const byName = (n: string) => map.robots.find((r) => r.name === n)!;
    expect(byName('Atlas (Electric)').sourcing).toMatchObject({ posture: 'external', kind: 'mixed', basis: 'regrade' });
    expect(byName('HUBO 2 / DRC-HUBO').sourcing).toMatchObject({ posture: 'in_house', componentSourcing: true });
    expect(byName('TALOS').sourcing).toMatchObject({ posture: 'in_house', componentSourcing: true });
    expect(byName('Moxi').sourcing.posture).toBe('external');
    expect(byName('G1').sourcing.posture).toBe('in_house_sells');
    expect(byName('Ameca').sourcing.posture).toBe('unknown');
    expect(byName('CLOiD').sourcing).toMatchObject({ posture: 'in_house_sells', sellsExternally: true });

    for (const r of map.robots) expect(r.sourcing, r.name).toBeTruthy();
    const s = map.sourcingStats;
    expect(s.inHouse + s.inHouseSells + s.external + s.unknown).toBe(s.robots);
    expect(s.robots).toBe(map.robots.filter((r) => !r.forecast).length);
    expect(s.componentSourcing).toBe(2);
    expect(s.regraded + s.derived).toBe(s.robots);

    const axium = map.suppliers.find((p) => p.isLG)!;
    expect(axium.diameterRangeMm).toEqual({ min: 40, max: 120 });
    expect(axium).toMatchObject({ segment: 'service', segments: ['service', 'industrial_cobot'], segmentBasis: 'override' });
    for (const p of map.suppliers) {
      expect(MARKET.has(p.segment), p.model).toBe(true);
      expect(Array.isArray(p.adoptionIds)).toBe(true);
    }
    expect(map.suppliers.find((p) => p.vendor === 'Hyundai Mobis')!).toMatchObject({ segment: 'tier1_oem', segmentBasis: 'keywords' });
    for (const p of map.suppliers) expect(p.segments[0], p.model).toBe(p.segment);
    const edgeKinds = new Set(map.edges.map((e) => e.basis));
    expect([...edgeKinds].every((b) => ['self', 'external', 'unverified'].includes(b))).toBe(true);
    expect(map.edges.some((e) => e.vendor.includes('Mobis') && e.basis === 'external')).toBe(true);
  });

  it('autoApplyActuatorData: first run applied (cache invalidated), second run skipped already-applied', async () => {
    await m.db.execute(m.sql.raw(`DELETE FROM data_migrations WHERE key LIKE 'actuator-update:%'`));
    await m.svc.actuatorPositionMapService.getMap(); // 캐시를 채운다
    const first = await m.auto.autoApplyActuatorData();
    expect(first.status).toBe('applied');
    const cache = await m.db.execute(m.sql.raw(`SELECT cached_at FROM view_cache WHERE view_name = 'actuator-position-map'`));
    expect(new Date((cache.rows[0] as { cached_at: string }).cached_at).getTime()).toBe(0);
    const second = await m.auto.autoApplyActuatorData();
    expect(second).toMatchObject({ status: 'skipped', reason: 'already-applied' });
    const marker = await m.db.execute(m.sql.raw(`SELECT summary FROM data_migrations WHERE key LIKE 'actuator-update:%' LIMIT 1`));
    const files = (marker.rows[0] as { summary: { files: Record<string, unknown> } }).summary.files;
    expect(files.sourcingGeneratedAt).toBeTruthy();
    expect(files.adoptionsGeneratedAt).toBeTruthy();
  });

  it('missing new tables: getMap still returns with empty adoptions / vendorMarkets and derived sourcing', async () => {
    await m.db.execute(m.sql.raw('DROP TABLE IF EXISTS actuator_sourcing, actuator_adoptions, actuator_vendor_markets CASCADE'));
    await m.svc.actuatorPositionMapService.invalidate();
    const map = await m.svc.actuatorPositionMapService.getMap();
    expect(map.adoptions).toEqual([]);
    expect(map.vendorMarkets).toEqual([]);
    expect(map.robots.every((r) => r.sourcing.basis === 'derived')).toBe(true);
    expect(map.robots.every((r) => r.sourcing.posture !== 'in_house' && r.sourcing.posture !== 'in_house_sells')).toBe(true);
    await m.ensure(); // ensure 는 멱등
    await m.ensure();
    expect(await count('actuator_sourcing')).toBe(0);
  });
});

const MARKET = new Set(['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other']);
