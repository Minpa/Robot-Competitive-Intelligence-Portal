/**
 * ARGOS_I 일일 스냅샷 통합 테스트 (임시 PostgreSQL)
 *
 * TEST_DATABASE_URL 이 없으면 전체 생략된다.
 *   1) 마이그레이션 + 시드가 적용된 DB 를 준비
 *      DATABASE_URL=postgres://… npm run migrate -w packages/backend  (그 외 시드 스크립트는 package.json 참고)
 *   2) TEST_DATABASE_URL=postgres://… npx vitest run src/__tests__/integration/argos-i-export.integration.test.ts
 * ⚠ 이 DB 의 argos_i_exports / argos_i_export_files 를 비우고 articles 에 'argos-i-it-' 접두 행을 추가/삭제하므로 운영 DB 로 실행하지 말 것.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { unzipSync } from 'fflate';
import pg from 'pg';

const TEST_URL = process.env.TEST_DATABASE_URL;
const SENTINEL = 'SENTINEL_FULLTEXT_DO_NOT_EXPORT';
const TOKEN = 'test-token-integration-0123456789abcdef0123456789abcdef';

type Mods = {
  sql: typeof import('drizzle-orm').sql;
  db: typeof import('../../db/index.js').db;
  svc: typeof import('../../services/argos-i-export.service.js');
  cfg: typeof import('../../services/argos-i-export-config.js');
  collect: typeof import('../../services/argos-i-export-collect.js');
  ddl: typeof import('../../db/argos-i-export.ddl.js');
  routes: typeof import('../../routes/argos-i.js');
  dm: typeof import('../../services/data-migration.service.js');
  period: typeof import('../../services/weekly-brief-period.js');
};

const sha = (b: Buffer | Uint8Array | string) => createHash('sha256').update(b).digest('hex');

describe.skipIf(!TEST_URL)('ARGOS_I export (temp PostgreSQL)', () => {
  let m: Mods;
  const prevEnv: Record<string, string | undefined> = {};
  const q = async <T = Record<string, any>>(text: string): Promise<T[]> => ((await m.db.execute(m.sql.raw(text))) as unknown as { rows: T[] }).rows;
  const today = () => m.cfg.resolveBundleDate(new Date());

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'ARGOS_I_EXPORT_TOKEN', 'ARGOS_I_EXPORT_RETENTION_DAYS', 'ARGOS_I_EXPORT_MAX_BUNDLE_MB']) prevEnv[k] = process.env[k];
    process.env.DATABASE_URL = TEST_URL;
    process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
    const drizzle = await import('drizzle-orm');
    const dbMod = await import('../../db/index.js');
    m = {
      sql: drizzle.sql,
      db: dbMod.db,
      svc: await import('../../services/argos-i-export.service.js'),
      cfg: await import('../../services/argos-i-export-config.js'),
      collect: await import('../../services/argos-i-export-collect.js'),
      ddl: await import('../../db/argos-i-export.ddl.js'),
      routes: await import('../../routes/argos-i.js'),
      dm: await import('../../services/data-migration.service.js'),
      period: await import('../../services/weekly-brief-period.js'),
    };
    await m.dm.dataMigrationService.ensureTable();
    await q(`DELETE FROM articles WHERE content_hash LIKE 'argos-i-it-%'`);
    // 원문 전재 금지 검증용 행 (content / description / 초록에 센티넬)
    await q(`INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at) VALUES
      ('ARGOS-I-IT video', 'youtube', 'https://www.youtube.com/watch?v=itvideo0001', now() at time zone 'utc', null, '${SENTINEL}', 'en', 'technology', 'video', 'argos-i-it-v1',
       '{"videoId":"itvideo0001","channel":"IT","views":10,"description":"${SENTINEL} hand finger grasp"}'::jsonb, now() at time zone 'utc'),
      ('ARGOS-I-IT paper', 'arxiv', 'https://arxiv.org/abs/2610.77777', now() at time zone 'utc', '${SENTINEL} abstract gripper tactile', '${SENTINEL}', 'en', 'technology', 'none', 'argos-i-it-p1',
       '{"arxivId":"2610.77777","authors":["A","B"],"aiSummaryKo":"요약"}'::jsonb, now() at time zone 'utc'),
      ('ARGOS-I-IT news', 'ITNews', 'https://news.example.com/it', now() at time zone 'utc', 'short summary', '${SENTINEL}', 'en', 'product', 'robot', 'argos-i-it-n1', '{}'::jsonb, now() at time zone 'utc')`);
  });

  afterAll(async () => {
    await q(`DELETE FROM articles WHERE content_hash LIKE 'argos-i-it-%'`).catch(() => undefined);
    await q(`DELETE FROM argos_i_exports`).catch(() => undefined);
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('ensureArgosIExportTables creates both tables on an empty DB (idempotent) with the contract columns and constraints', async () => {
    await q('DROP TABLE IF EXISTS argos_i_export_files');
    await q('DROP TABLE IF EXISTS argos_i_exports');
    await m.ddl.ensureArgosIExportTables();
    await m.ddl.ensureArgosIExportTables();
    const cols = await q<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('argos_i_exports','argos_i_export_files') ORDER BY table_name, ordinal_position`,
    );
    expect(cols.filter((c) => c.table_name === 'argos_i_exports').map((c) => c.column_name)).toEqual([
      'export_date', 'status', 'schema_version', 'generated_at', 'as_of', 'reason', 'file_count', 'total_bytes', 'bundle_sha256', 'duration_ms', 'warnings',
    ]);
    expect(cols.find((c) => c.column_name === 'content')!.data_type).toBe('bytea');
    expect(cols.find((c) => c.column_name === 'export_date' && c.table_name === 'argos_i_exports')!.data_type).toBe('date');
    await expect(q(`INSERT INTO argos_i_exports VALUES ('2026-01-01','bogus',1,now(),now(),'cron',0,0,repeat('a',64),1,'[]')`)).rejects.toThrow();
  });

  describe('generation end-to-end', () => {
    let aiLogsBefore = 0;
    it('creates today\'s bundle: one row, all files present, stored sha256/byte_size match the bytes, no AI usage logged', async () => {
      aiLogsBefore = Number((await q(`SELECT count(*)::int AS n FROM ai_usage_logs`).catch(() => [{ n: 0 }]))[0]!.n);
      m.svc.__resetArgosIExportStateForTests();
      const r = await m.svc.runArgosIExport({ reason: 'manual' });
      expect(r).toMatchObject({ outcome: 'created', date: today() });
      const rows = await q<any>(`SELECT export_date::text AS d, status, schema_version, file_count, total_bytes::float AS total, bundle_sha256, reason FROM argos_i_exports`);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ d: today(), schema_version: 1, reason: 'manual' });
      const files = await q<any>(`SELECT path, area, format, content, sha256, byte_size FROM argos_i_export_files WHERE export_date = '${today()}' ORDER BY path`);
      expect(files).toHaveLength(rows[0].file_count);
      expect(files.map((f: any) => f.path)).toEqual(expect.arrayContaining(['README.md', 'manifest.json', 'videos.md', 'videos.json', 'robots.json', 'overview.md']));
      expect(files.length).toBeGreaterThanOrEqual(2 + 15 * 2);
      for (const f of files) {
        const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content);
        expect(f.sha256.trim(), f.path).toBe(sha(buf));
        expect(f.byte_size, f.path).toBe(buf.length);
      }
      expect(rows[0].total).toBe(files.reduce((n: number, f: any) => n + f.byte_size, 0));
      expect(rows[0].bundle_sha256.trim()).toBe(sha(Buffer.from(files.find((f: any) => f.path === 'manifest.json').content)));
      const manifest = JSON.parse(Buffer.from(files.find((f: any) => f.path === 'manifest.json').content).toString('utf-8'));
      expect(manifest.files).toHaveLength(files.length - 1); // manifest 자신 제외, 저장 파일과 1:1
      expect(manifest.files.map((f: any) => f.path)).toEqual(files.map((f: any) => f.path).filter((p: string) => p !== 'manifest.json'));
      const aiLogsAfter = Number((await q(`SELECT count(*)::int AS n FROM ai_usage_logs`).catch(() => [{ n: 0 }]))[0]!.n);
      expect(aiLogsAfter).toBe(aiLogsBefore);
    });

    it('record counts equal the DB (no period limit), and no original text or sentinel leaks into any file', async () => {
      const files = await q<any>(`SELECT path, content FROM argos_i_export_files WHERE export_date = '${today()}'`);
      const json = (area: string) => JSON.parse(Buffer.from(files.find((f: any) => f.path === `${area}.json`).content).toString('utf-8'));
      const count = async (where: string, from = 'articles a') => Number((await q(`SELECT count(*)::int AS n FROM ${from} WHERE ${where}`))[0]!.n);
      expect(json('videos').recordCount).toBe(await count(`a.product_type = 'video'`));
      expect(json('papers').recordCount).toBe(await count(`a.product_type IS DISTINCT FROM 'video' AND a.source = 'arxiv'`));
      expect(json('news').recordCount).toBe(await count(`a.product_type IS DISTINCT FROM 'video' AND COALESCE(a.source,'') NOT IN ('arxiv','github','sec_edgar','patent')`));
      expect(json('robots').recordCount).toBe(await count('true', 'humanoid_robots'));
      expect(json('companies').recordCount).toBe(await count('true', 'companies'));
      for (const f of files) {
        const text = Buffer.from(f.content).toString('utf-8');
        expect(text.includes(SENTINEL), f.path).toBe(false);
        for (const bad of ['<script', '<iframe', 'javascript:', 'onerror=']) expect(text.toLowerCase().includes(bad), `${f.path} ${bad}`).toBe(false);
      }
      for (const area of ['videos', 'papers', 'news']) {
        const text = JSON.stringify(json(area));
        for (const key of ['"content":', '"description":', '"originalText":', '"abstract":']) expect(text.includes(key), `${area} ${key}`).toBe(false);
      }
      expect(json('videos').data.items.some((v: any) => v.title === 'ARGOS-I-IT video')).toBe(true);
    });

    it('regenerating the same day overwrites in place: one row, same file_count, new bundle_sha256', async () => {
      const before = (await q<any>(`SELECT file_count, bundle_sha256 FROM argos_i_exports`))[0];
      await new Promise((r) => setTimeout(r, 15));
      const r = await m.svc.runArgosIExport({ reason: 'weekly-brief' });
      expect(r.outcome).toBe('created');
      const after = await q<any>(`SELECT file_count, bundle_sha256, reason FROM argos_i_exports`);
      expect(after).toHaveLength(1);
      expect(after[0].file_count).toBe(before.file_count);
      expect(after[0].bundle_sha256).not.toBe(before.bundle_sha256);
      expect(after[0].reason).toBe('weekly-brief');
      expect(Number((await q(`SELECT count(*)::int AS n FROM argos_i_export_files WHERE export_date='${today()}'`))[0]!.n)).toBe(after[0].file_count);
    });

    it('a failing core area leaves the existing bundle untouched', async () => {
      const before = (await q<any>(`SELECT bundle_sha256 FROM argos_i_exports`))[0].bundle_sha256;
      const failing = { createCollector: () => ({ collect: async (id: string) => { if (id === 'papers') throw new Error('boom'); return m.collect.createCollector().collect(id); } }) };
      const r = await m.svc.runArgosIExport({ reason: 'manual' }, failing);
      expect(r).toMatchObject({ outcome: 'failed', error: 'boom' });
      expect((await q<any>(`SELECT bundle_sha256 FROM argos_i_exports`))[0].bundle_sha256).toBe(before);
    });

    it('an optional area failure yields a partial bundle (area omitted, area_failed warning)', async () => {
      const partial = { createCollector: () => ({ collect: async (id: string) => { if (id === 'keywords') throw new Error('kw down'); return m.collect.createCollector().collect(id); } }) };
      const r = await m.svc.runArgosIExport({ reason: 'manual' }, partial);
      expect(r).toMatchObject({ outcome: 'created', status: 'partial' });
      const row = (await q<any>(`SELECT status, warnings FROM argos_i_exports`))[0];
      expect(row.status).toBe('partial');
      expect(row.warnings).toContain('area_failed:keywords'); // 환경에 따라 다른 선택 영역 실패(area_failed:regulations 등)가 섞일 수 있다
      expect(Number((await q(`SELECT count(*)::int AS n FROM argos_i_export_files WHERE path LIKE 'keywords.%'`))[0]!.n)).toBe(0);
    });
  });

  describe('concurrency (advisory lock 724304)', () => {
    it('a held lock makes the run skipped_locked and leaves the bundle as is', async () => {
      const before = (await q<any>(`SELECT bundle_sha256 FROM argos_i_exports`))[0].bundle_sha256;
      const client = new pg.Client({ connectionString: TEST_URL });
      await client.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT pg_advisory_xact_lock(${m.cfg.ARGOS_I_EXPORT_LOCK_KEY})`);
        m.svc.__resetArgosIExportStateForTests();
        const r = await m.svc.runArgosIExport({ reason: 'cron' });
        expect(r.outcome).toBe('skipped_locked');
        expect((await q<any>(`SELECT bundle_sha256 FROM argos_i_exports`))[0].bundle_sha256).toBe(before);
      } finally {
        await client.query('ROLLBACK');
        await client.end();
      }
    });

    it('two simultaneous triggers: exactly one runs (the other is already_running)', async () => {
      m.svc.__resetArgosIExportStateForTests();
      const [a, b] = await Promise.all([m.svc.runArgosIExport({ reason: 'manual' }), m.svc.runArgosIExport({ reason: 'manual' })]);
      expect([a.outcome, b.outcome].sort()).toEqual(['already_running', 'created']);
    });
  });

  describe('retention (30 days)', () => {
    it('keeps today and the previous 29 days; older bundles and their files are deleted (cascade); today is never deleted', async () => {
      const t = today();
      for (let i = 1; i <= 35; i++) {
        const d = m.period.addDaysYmd(t, -i);
        await q(`INSERT INTO argos_i_exports VALUES ('${d}','ok',1,now(),now(),'cron',1,3,repeat('b',64),1,'[]') ON CONFLICT DO NOTHING`);
        await q(`INSERT INTO argos_i_export_files VALUES ('${d}','README.md',null,'md','\\x68'::bytea,repeat('c',64),1,null) ON CONFLICT DO NOTHING`);
      }
      process.env.ARGOS_I_EXPORT_RETENTION_DAYS = '30';
      m.svc.__resetArgosIExportStateForTests();
      expect((await m.svc.runArgosIExport({ reason: 'manual' })).outcome).toBe('created');
      const dates = (await q<{ d: string }>(`SELECT export_date::text AS d FROM argos_i_exports ORDER BY 1`)).map((r) => r.d);
      expect(dates).toHaveLength(30);
      expect(dates[0]).toBe(m.period.addDaysYmd(t, -29));
      expect(dates[dates.length - 1]).toBe(t);
      const orphan = Number((await q(`SELECT count(*)::int AS n FROM argos_i_export_files WHERE export_date < '${m.period.addDaysYmd(t, -29)}'`))[0]!.n);
      expect(orphan).toBe(0);
      expect(Number((await q(`SELECT count(*)::int AS n FROM argos_i_export_files WHERE export_date = '${t}'`))[0]!.n)).toBeGreaterThan(30);
    });
  });

  describe('download API against the real store', () => {
    it('latest.zip unzips to argos-i/<date>/… and every entry matches the manifest sha256; single files serve ETag + 304', async () => {
      const Fastify = (await import('fastify')).default;
      const app = Fastify();
      await app.register(m.routes.argosIRoutes, { prefix: '/api/argos-i' });
      await app.ready();
      try {
        const auth = { authorization: `Bearer ${TOKEN}` };
        expect((await app.inject({ method: 'GET', url: '/api/argos-i/manifest' })).statusCode).toBe(401);
        const list = (await app.inject({ method: 'GET', url: '/api/argos-i/manifest', headers: auth })).json();
        expect(list.latest.date).toBe(today());
        expect(list.bundles.length).toBeLessThanOrEqual(30);
        expect(list.bundles.map((b: any) => b.date)).toEqual([...list.bundles.map((b: any) => b.date)].sort().reverse());

        const zipRes = await app.inject({ method: 'GET', url: list.latest.zipUrl, headers: auth });
        expect(zipRes.statusCode).toBe(200);
        const entries = unzipSync(new Uint8Array(zipRes.rawPayload));
        const prefix = `argos-i/${today()}/`;
        const manifest = JSON.parse(Buffer.from(entries[`${prefix}manifest.json`]!).toString('utf-8'));
        expect(sha(entries[`${prefix}manifest.json`]!)).toBe(list.latest.bundleSha256);
        for (const f of manifest.files) {
          expect(sha(entries[`${prefix}${f.path}`]!), f.path).toBe(f.sha256);
          expect(entries[`${prefix}${f.path}`]!.length).toBe(f.byteSize);
        }
        expect(Object.keys(entries)).toHaveLength(manifest.files.length + 1);

        const file = await app.inject({ method: 'GET', url: `/api/argos-i/export/${today()}/videos.json`, headers: auth });
        expect(file.statusCode).toBe(200);
        expect(file.headers.etag).toBe(`"${manifest.files.find((f: any) => f.path === 'videos.json').sha256}"`);
        expect((await app.inject({ method: 'GET', url: `/api/argos-i/export/${today()}/videos.json`, headers: { ...auth, 'if-none-match': file.headers.etag as string } })).statusCode).toBe(304);
        expect((await app.inject({ method: 'GET', url: `/api/argos-i/export/${today()}/nope.json`, headers: auth })).statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });
});
