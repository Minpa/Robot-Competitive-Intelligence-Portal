/**
 * 핸드 벤치마크 시드 통합 테스트 (insert-only v1 + 마커 기반 업서트 BrainCo 파일)
 *
 * 임시 PostgreSQL 이 필요하다. TEST_DATABASE_URL 이 없으면 전체 생략된다.
 * ⚠ hand_* 테이블과 data_migrations 의 `hand-benchmark:%` 행을 비운다 — 운영 DB 로 실행하지 말 것.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TEST_URL = process.env.TEST_DATABASE_URL;
const SEED_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/seed-data');
const BRAINCO_SLUGS = ['brainco-revo3-u21t', 'brainco-revo2-tactile'];

type Mods = {
  sql: typeof import('drizzle-orm').sql;
  db: typeof import('../../db/index.js').db;
  svc: typeof import('../../services/hand-benchmark.service.js').handBenchmarkService;
  migrations: typeof import('../../services/data-migration.service.js').dataMigrationService;
};

const seedFiles = fs.readdirSync(SEED_DIR).filter((f) => /^hand-benchmark-.*\.json$/.test(f)).sort();
const seeds = seedFiles.map((f) => JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf-8')) as {
  mode?: string; axes?: unknown[]; competitors: Array<{ slug: string; scores: unknown[] }>;
});
const totalComps = seeds.reduce((n, s) => n + s.competitors.length, 0);
const totalScores = seeds.reduce((n, s) => n + s.competitors.reduce((m, c) => m + c.scores.length, 0), 0);
const totalAxes = seeds.reduce((n, s) => n + (s.axes?.length ?? 0), 0);

describe.skipIf(!TEST_URL)('hand benchmark seed (temp PostgreSQL)', () => {
  let m: Mods;
  let prevUrl: string | undefined;

  const rows = async (q: string) => (await m.db.execute(m.sql.raw(q))).rows as Array<Record<string, unknown>>;
  const count = async (table: string) => (await rows(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n as number;
  const inList = `(${BRAINCO_SLUGS.map((s) => `'${s}'`).join(',')})`;
  const baseSnapshot = async () => ({
    comps: await rows(`SELECT * FROM hand_competitors WHERE slug NOT IN ${inList} ORDER BY slug`),
    scores: await rows(
      `SELECT s.* FROM hand_benchmark_scores s JOIN hand_competitors c ON c.id = s.competitor_id WHERE c.slug NOT IN ${inList} ORDER BY c.slug, s.axis_key`,
    ),
  });

  beforeAll(async () => {
    prevUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = TEST_URL;
    const drizzle = await import('drizzle-orm');
    const dbMod = await import('../../db/index.js');
    m = {
      sql: drizzle.sql,
      db: dbMod.db,
      svc: (await import('../../services/hand-benchmark.service.js')).handBenchmarkService,
      migrations: (await import('../../services/data-migration.service.js')).dataMigrationService,
    };
    await m.migrations.ensureTable();
    await m.svc.ensureTables();
    await m.db.execute(m.sql.raw('DELETE FROM hand_benchmark_scores'));
    await m.db.execute(m.sql.raw('DELETE FROM hand_competitors'));
    await m.db.execute(m.sql.raw('DELETE FROM hand_benchmark_axes'));
    await m.db.execute(m.sql.raw(`DELETE FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`));
  });

  afterAll(async () => {
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
  });

  it('first seed on an empty DB inserts everything from all files', async () => {
    const r = await m.svc.seedFromFile();
    expect(r.files).toBe(seedFiles.length);
    expect(r).toMatchObject({ axes: totalAxes, competitors: totalComps, scores: totalScores });
    expect(await count('hand_competitors')).toBe(totalComps);
    expect(await count('hand_benchmark_scores')).toBe(totalScores);
    const markers = await rows(`SELECT key FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`);
    expect(markers).toHaveLength(1);
    expect(String(markers[0]!.key)).toMatch(/^hand-benchmark:hand-benchmark-v1_1-brainco\.json:[0-9a-f]{12}$/);
  });

  it('second seed changes nothing (marker + natural keys)', async () => {
    const r = await m.svc.seedFromFile();
    expect(r).toMatchObject({ axes: 0, competitors: 0, scores: 0 });
    expect(r.updated).toBeUndefined();
    expect(await count('hand_competitors')).toBe(totalComps);
  });

  it('deleting only the BrainCo rows and marker re-adds them; the other hands stay identical (values and updated_at)', async () => {
    const before = await baseSnapshot();
    expect(before.comps.length).toBe(totalComps - BRAINCO_SLUGS.length);
    await m.db.execute(m.sql.raw(`DELETE FROM hand_competitors WHERE slug IN ${inList}`)); // scores cascade
    await m.db.execute(m.sql.raw(`DELETE FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`));
    const r = await m.svc.seedFromFile();
    expect(r).toMatchObject({ axes: 0, competitors: BRAINCO_SLUGS.length, scores: BRAINCO_SLUGS.length * 6 });
    expect(await baseSnapshot()).toEqual(before);
    const api = await m.svc.getBenchmarkData();
    expect(api.competitors).toHaveLength(totalComps);
    for (const slug of BRAINCO_SLUGS) {
      const c = api.competitors.find((x) => x.slug === slug)!;
      expect(Object.keys(c.scores).sort()).toEqual(['dof', 'gripForce', 'payload', 'responseSpeed', 'tactileChannels', 'weightEfficiency']);
      expect(c.country).toBe('중국');
      expect(c.category).toBe('dexterous');
    }
    const orders = api.competitors.map((c) => c.sortOrder ?? 0);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('upsert mode: a changed file (new hash) corrects BrainCo rows only; v1 rows are never touched', async () => {
    // 파일이 바뀐 상황을 재현: DB 값을 틀어 놓고 마커를 지운다 (= 새 해시). 틀어진 v1 행은 되돌려지지 않아야 한다.
    await m.db.execute(m.sql.raw(`UPDATE hand_competitors SET name = 'stale', sort_order = 99 WHERE slug = 'brainco-revo2-tactile'`));
    await m.db.execute(m.sql.raw(
      `UPDATE hand_benchmark_scores SET current_score = 0, raw_value = 'stale' WHERE axis_key = 'dof' AND competitor_id IN (SELECT id FROM hand_competitors WHERE slug IN ('brainco-revo3-u21t','shadow-e3m5'))`,
    ));
    await m.db.execute(m.sql.raw(`DELETE FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`));
    // 이전 해시 마커(파일이 이전 내용이던 시절)가 남아 있어도 최신 1개만 유지되어야 한다
    await m.db.execute(m.sql.raw(`INSERT INTO data_migrations (key, summary) VALUES ('hand-benchmark:hand-benchmark-v1_1-brainco.json:000000000000', '{}'::jsonb)`));
    const r = await m.svc.seedFromFile();
    expect(r).toMatchObject({ competitors: 0, scores: 0 });
    expect(r.updated).toEqual({ competitors: 1, scores: 1 });
    const left = await rows(`SELECT key FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`);
    expect(left).toHaveLength(1);
    expect(String(left[0]!.key)).not.toContain(':000000000000');

    const bc = await rows(`SELECT name, sort_order FROM hand_competitors WHERE slug = 'brainco-revo2-tactile'`);
    expect(bc[0]).toEqual({ name: 'BrainCo Revo 2 Tactile', sort_order: 10 });
    const dof = await rows(
      `SELECT c.slug, s.current_score, s.raw_value FROM hand_benchmark_scores s JOIN hand_competitors c ON c.id = s.competitor_id WHERE s.axis_key = 'dof' AND c.slug IN ('brainco-revo3-u21t','shadow-e3m5') ORDER BY c.slug`,
    );
    expect(dof[0]).toMatchObject({ slug: 'brainco-revo3-u21t', current_score: 9 });
    expect(dof[1]).toMatchObject({ slug: 'shadow-e3m5', current_score: 0, raw_value: 'stale' }); // insert-only v1 은 그대로
    expect(await rows(`SELECT key FROM data_migrations WHERE key LIKE 'hand-benchmark:%'`)).toHaveLength(1);
  });

  it('a repeat run after the upsert is a no-op again', async () => {
    const r = await m.svc.seedFromFile();
    expect(r).toMatchObject({ axes: 0, competitors: 0, scores: 0 });
    expect(r.updated).toBeUndefined();
  });
});
