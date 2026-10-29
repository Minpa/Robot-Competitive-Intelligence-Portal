/**
 * ARGOS_I 전체 DB 덤프 통합 테스트 (임시 PostgreSQL)
 *
 * 환경변수가 없으면 해당 describe 는 전체 생략된다.
 *   TEST_DATABASE_URL         원본 DB — 마이그레이션 + ensure* 로 스키마가 만들어진 임시 DB
 *   TEST_DATABASE_URL_TARGET  적재 대상 DB — 같은 스키마의 "빈" DB (예: pg_dump --schema-only <원본> | psql <대상>)
 *
 * 준비 예
 *   createdb argos_it && createdb argos_it_target
 *   DATABASE_URL=postgres://…/argos_it npm run migrate -w packages/backend      (+ 백엔드를 DISABLE_SCHEDULER=true 로 한 번 기동해 ensure* 테이블 생성)
 *   pg_dump --schema-only argos_it | psql argos_it_target
 *   TEST_DATABASE_URL=postgres://…/argos_it TEST_DATABASE_URL_TARGET=postgres://…/argos_it_target \
 *     npx vitest run src/__tests__/integration/argos-i-full-db.integration.test.ts
 *
 * ⚠ 두 DB 모두 users 에 'fd-it-' 행, articles 에 'fd-it-' 접두 행, fd_it_* 임시 테이블을 만들고 지운다. 운영 DB 로 실행하지 말 것.
 *   적재 테스트는 대상 DB 의 포함 테이블을 TRUNCATE 한다.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { unzipSync } from 'fflate';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const SRC_URL = process.env.TEST_DATABASE_URL;
const DST_URL = process.env.TEST_DATABASE_URL_TARGET;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const IMPORT = join(ROOT, 'scripts', 'argos-i-import-full-db.mjs');
const TOKEN = 'test-token-integration-0123456789abcdef0123456789abcdef';
const USER_ID = 'fd1f1f1f-0000-4000-8000-000000000001';
const SENTINEL_USER = 'FD_IT_EXCLUDED_SENTINEL_HASH';

const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const text = (u: Uint8Array) => Buffer.from(u).toString('utf-8');

const DDL = `
CREATE TYPE fd_it_mood AS ENUM ('happy','sad');
CREATE TABLE fd_it_types (
  id serial PRIMARY KEY, c_bool boolean, c_int8 bigint, c_num numeric(15,2), c_f8 double precision, c_text text, c_date date,
  c_ts timestamp, c_tstz timestamptz, c_jsonb jsonb, c_bytea bytea, c_arr text[], c_enum fd_it_mood, c_inet inet, c_secret_note text
);
CREATE TABLE fd_it_parent (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, extra text);
CREATE TABLE fd_it_child (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_id uuid NOT NULL REFERENCES fd_it_parent(id) ON DELETE CASCADE, label text);
CREATE TABLE fd_it_link (a uuid NOT NULL, b uuid NOT NULL, note text);
CREATE UNIQUE INDEX fd_it_link_ab ON fd_it_link (a, b);
CREATE TABLE fd_it_slug (id uuid PRIMARY KEY, slug varchar(50) NOT NULL UNIQUE, name text);
`;
const DROP = `DROP TABLE IF EXISTS fd_it_link, fd_it_child, fd_it_parent, fd_it_types, fd_it_slug CASCADE; DROP TYPE IF EXISTS fd_it_mood;`;

const SEED = `
INSERT INTO users (id, email, password_hash, role) VALUES ('${USER_ID}','fd-it@example.invalid','${SENTINEL_USER}','viewer') ON CONFLICT DO NOTHING;
DELETE FROM articles WHERE content_hash LIKE 'fd-it-%';
INSERT INTO articles (id, title, source, url, published_at, summary, content, language, content_hash, collected_at, category, product_type, submitted_by, extracted_metadata) VALUES
 ('fd1f1f1f-0000-4000-8000-0000000000a1','FD IT 1','youtube','https://example.invalid/fdit1','2026-10-29 03:12:45.123456','s','body'||chr(10)||'한글 😀','en','fd-it-1','2026-10-28 00:00:00.000001','technology','video','${USER_ID}','{"a":{"b":[1,2,null]},"s":"x"}'),
 ('fd1f1f1f-0000-4000-8000-0000000000a2','FD IT 2','news','https://example.invalid/fdit2',NULL,NULL,NULL,'en','fd-it-2','2026-10-28 12:00:00','product','robot',NULL,'null'::jsonb);
INSERT INTO fd_it_types (c_bool,c_int8,c_num,c_f8,c_text,c_date,c_ts,c_tstz,c_jsonb,c_bytea,c_arr,c_enum,c_inet,c_secret_note) VALUES
 (true, 9007199254740993, 1234.50, 1.5, 'a'||chr(10)||'b "q" 😀', '2026-10-29', '2026-10-29 03:12:45.123456', '2026-10-29 03:12:45.123456+09', '{"k":[1,{"z":null}],"n":1.5}', '\\x0001feff', '{a,NULL,"c,d"}', 'sad', '10.0.0.1/32', 'FD_IT_SECRET_SENTINEL'),
 (false, NULL, 0.00, 'NaN', '', 'infinity', 'infinity', '-infinity', 'null'::jsonb, ''::bytea, '{}', 'happy', NULL, NULL),
 (NULL, -9223372036854775808, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO fd_it_parent (id, name, extra) VALUES ('fd1f1f1f-0000-4000-8000-0000000000b1','p1','e'),('fd1f1f1f-0000-4000-8000-0000000000b2','p2',NULL);
INSERT INTO fd_it_child (parent_id, label) VALUES ('fd1f1f1f-0000-4000-8000-0000000000b1','c1'),('fd1f1f1f-0000-4000-8000-0000000000b2','c2');
INSERT INTO fd_it_link (a, b, note) VALUES ('fd1f1f1f-0000-4000-8000-0000000000b1','fd1f1f1f-0000-4000-8000-0000000000b2','n');
INSERT INTO fd_it_slug (id, slug, name) VALUES ('fd1f1f1f-0000-4000-8000-0000000000c1','fd-it-slug','from source');
`;

type Svc = typeof import('../../services/argos-i-full-db.service.js');
type SchemaMod = typeof import('../../services/argos-i-full-db-schema.js');

async function collect(stream: AsyncIterable<unknown>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

/** 슬롯은 스트림 종료 뒤 ROLLBACK·unlock 이 끝나야 반환된다 */
async function waitSlotFree(svc: Svc): Promise<void> {
  for (let i = 0; i < 100 && svc.isFullDbSlotBusy(); i++) await new Promise((r) => setTimeout(r, 20));
  if (svc.isFullDbSlotBusy()) throw new Error('slot was not released');
}

async function dumpToFiles(svc: Svc, tables?: string[]): Promise<{ files: Record<string, Uint8Array>; root: string }> {
  const r = await svc.openFullDbDump({ tables });
  if (!r.ok) throw new Error(`dump rejected: ${r.reason}`);
  const zip = await collect(r.stream);
  await waitSlotFree(svc);
  const files = unzipSync(new Uint8Array(zip));
  const root = Object.keys(files)[0]!.split('/').slice(0, 2).join('/');
  return { files, root };
}

function writeDump(files: Record<string, Uint8Array>, rootName: string): string {
  const base = mkdtempSync(join(tmpdir(), 'argos-i-fd-it-'));
  for (const [name, content] of Object.entries(files)) {
    const full = join(base, name);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return join(base, rootName);
}

const runImport = (dir: string, args: string[], url = DST_URL!) =>
  spawnSync('node', [IMPORT, dir, ...args], { encoding: 'utf-8', env: { ...process.env, DATABASE_URL: url }, cwd: ROOT });

describe.skipIf(!SRC_URL)('ARGOS_I full DB dump (temp PostgreSQL)', () => {
  let svc: Svc;
  let schemaMod: SchemaMod;
  let src: pg.Client;
  const prevEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'ARGOS_I_EXPORT_TOKEN', 'ARGOS_I_FULL_DB_ENABLED', 'ARGOS_I_FULL_DB_ZIP_LEVEL']) prevEnv[k] = process.env[k];
    process.env.DATABASE_URL = SRC_URL;
    process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
    process.env.ARGOS_I_FULL_DB_ENABLED = 'true';
    process.env.ARGOS_I_FULL_DB_ZIP_LEVEL = '1';
    svc = await import('../../services/argos-i-full-db.service.js');
    schemaMod = await import('../../services/argos-i-full-db-schema.js');
    src = new pg.Client({ connectionString: SRC_URL });
    await src.connect();
    await src.query(DROP);
    await src.query(DDL);
    await src.query(SEED);
  });

  afterAll(async () => {
    await src?.query(`DELETE FROM articles WHERE content_hash LIKE 'fd-it-%'`).catch(() => undefined);
    await src?.query(`DELETE FROM users WHERE id = '${USER_ID}'`).catch(() => undefined);
    await src?.query(DROP).catch(() => undefined);
    await src?.end().catch(() => undefined);
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe('dump contents', () => {
    let files: Record<string, Uint8Array>;
    let root: string;
    let manifest: any;
    beforeAll(async () => {
      ({ files, root } = await dumpToFiles(svc));
      manifest = JSON.parse(text(files[`${root}/manifest.json`]!));
    });

    it('is a valid ZIP layout: README, schema, tables, manifest last', () => {
      const names = Object.keys(files);
      expect(names[0]).toBe(`${root}/README.md`);
      expect(names[1]).toBe(`${root}/schema.json`);
      expect(names[names.length - 1]).toBe(`${root}/manifest.json`);
      expect(names.filter((n) => n.includes('/tables/')).every((n) => n.endsWith('.jsonl'))).toBe(true);
    });

    it('excluded tables and columns are nowhere in the ZIP; submitted_by is null', () => {
      const tableNames = manifest.tables.map((t: any) => t.name);
      for (const t of ['users', 'allowed_emails', 'audit_logs', 'ai_usage_logs', 'argos_i_exports', 'argos_i_export_files']) {
        expect(tableNames).not.toContain(t);
        expect(manifest.excludedTables.map((e: any) => e.name)).toContain(t);
      }
      const all = Object.values(files).map(text).join('\n');
      expect(all).not.toContain(SENTINEL_USER);
      expect(all).not.toContain('FD_IT_SECRET_SENTINEL');
      expect(manifest.excludedColumns).toContainEqual({ table: 'fd_it_types', column: 'c_secret_note', pattern: 'secret', reason: 'name_rule:secret' });
      const articles = text(files[`${root}/tables/articles.jsonl`]!).trimEnd().split('\n').map((l) => JSON.parse(l));
      expect(articles.length).toBeGreaterThanOrEqual(2);
      expect(articles.every((a) => a.submitted_by === null)).toBe(true);
      expect(manifest.nullifiedFkColumns).toContainEqual({ table: 'articles', column: 'submitted_by', refTable: 'users' });
      expect(manifest.allowlistedColumns.map((a: any) => `${a.table}.${a.column}`)).toContain('weekly_briefs.input_tokens');
    });

    it('manifest rows equal count(*) and sha256 / bytes match the extracted files', async () => {
      for (const t of manifest.tables) {
        const content = files[`${root}/${t.path}`]!;
        expect(sha(content), t.name).toBe(t.sha256);
        expect(content.length, t.name).toBe(t.jsonlBytes);
        const { rows } = await src.query(`SELECT count(*)::int AS n FROM public."${t.name}"`);
        expect(t.rows, t.name).toBe(rows[0].n);
      }
      expect(manifest.files['README.md']).toBe(sha(files[`${root}/README.md`]!));
      expect(manifest.files['schema.json']).toBe(sha(files[`${root}/schema.json`]!));
    });

    it('typed values are encoded per the contract', () => {
      const rows = text(files[`${root}/tables/fd_it_types.jsonl`]!).trimEnd().split('\n').map((l) => JSON.parse(l));
      const r = rows.find((x) => x.c_int8 === '9007199254740993')!;
      expect(r.c_num).toBe('1234.50');
      expect(r.c_ts).toBe('2026-10-29T03:12:45.123456Z');
      expect(r.c_tstz).toBe('2026-10-28T18:12:45.123456Z');
      expect(r.c_jsonb).toEqual({ k: [1, { z: null }], n: 1.5 });
      expect(r.c_bytea).toEqual({ $bytea: 'AAH+/w==' });
      expect(r.c_arr).toEqual(['a', null, 'c,d']);
      expect(r.c_enum).toBe('sad');
      expect(r.c_inet).toBe('10.0.0.1/32');
      expect(rows.some((x) => x.c_jsonb && x.c_jsonb.$jsonNull === true)).toBe(true);
      expect(rows.some((x) => x.c_f8 === 'NaN')).toBe(true);
      expect(rows.some((x) => x.c_date === 'infinity')).toBe(true);
      expect(Object.keys(r)).not.toContain('c_secret_note');
    });

    it('the real schema has no FK cycles and a deterministic parent-first order', () => {
      const schema = JSON.parse(text(files[`${root}/schema.json`]!));
      expect(schema.cycles).toEqual([]);
      const idx = (n: string) => schema.loadOrder.indexOf(n);
      expect(idx('fd_it_parent')).toBeLessThan(idx('fd_it_child'));
      expect(idx('articles')).toBeGreaterThan(idx('companies'));
    });

    it('a subset dump only contains the requested tables in loadOrder', async () => {
      const sub = await dumpToFiles(svc, ['fd_it_child', 'fd_it_parent']);
      const m = JSON.parse(text(sub.files[`${sub.root}/manifest.json`]!));
      expect(m.selection).toBe('subset');
      expect(m.tables.map((t: any) => t.name)).toEqual(['fd_it_parent', 'fd_it_child']);
    });
  });

  describe('snapshot consistency (REPEATABLE READ)', () => {
    it('rows committed after the snapshot never appear, and no orphan child rows are produced', async () => {
      const r = await svc.openFullDbDump({ tables: ['fd_it_parent', 'fd_it_child'] });
      if (!r.ok) throw new Error('rejected');
      // 스트림을 소비하기 전에 다른 연결이 부모+자식을 커밋한다
      const other = new pg.Client({ connectionString: SRC_URL });
      await other.connect();
      await other.query(`INSERT INTO fd_it_parent (id, name) VALUES ('fd1f1f1f-0000-4000-8000-0000000000b9','late')`);
      await other.query(`INSERT INTO fd_it_child (parent_id, label) VALUES ('fd1f1f1f-0000-4000-8000-0000000000b9','late-child')`);
      await other.end();
      const files = unzipSync(new Uint8Array(await collect(r.stream)));
      await waitSlotFree(svc);
      const root = Object.keys(files)[0]!.split('/').slice(0, 2).join('/');
      const parents = text(files[`${root}/tables/fd_it_parent.jsonl`]!).trimEnd().split('\n').map((l) => JSON.parse(l));
      const children = text(files[`${root}/tables/fd_it_child.jsonl`]!).trimEnd().split('\n').map((l) => JSON.parse(l));
      const parentIds = new Set(parents.map((p) => p.id));
      expect(parentIds.has('fd1f1f1f-0000-4000-8000-0000000000b9')).toBe(false);
      expect(children.some((c) => c.label === 'late-child')).toBe(false);
      expect(children.every((c) => parentIds.has(c.parent_id))).toBe(true);
      await src.query(`DELETE FROM fd_it_parent WHERE name = 'late'`);
    });

    it('while a dump is open it holds exactly one snapshot transaction session and the advisory lock', async () => {
      const r = await svc.openFullDbDump({ tables: ['fd_it_parent'] });
      if (!r.ok) throw new Error('rejected');
      const { rows } = await src.query(
        `SELECT query FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%' AND pid <> pg_backend_pid()`,
      );
      expect(rows.length).toBe(1);
      const ro = await src.query(`SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND objid = 724305 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`);
      expect(ro.rowCount).toBe(1);
      r.abort();
      await waitSlotFree(svc);
    });
  });

  describe('single dump at a time', () => {
    it('a second request is rejected while one is open, and a client abort leaves no advisory lock or idle-in-transaction session', async () => {
      const first = await svc.openFullDbDump();
      if (!first.ok) throw new Error('rejected');
      const second = await svc.openFullDbDump();
      expect(second).toEqual({ ok: false, reason: 'in_progress' });
      const it = first.stream[Symbol.asyncIterator]();
      await it.next();
      first.abort();
      await waitSlotFree(svc);
      await new Promise((r) => setTimeout(r, 100));
      const locks = await src.query(`SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND objid = 724305 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`);
      expect(locks.rowCount).toBe(0);
      const idle = await src.query(`SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%' AND pid <> pg_backend_pid()`);
      expect(idle.rowCount).toBe(0);
      const third = await svc.openFullDbDump({ tables: ['fd_it_parent'] });
      expect(third.ok).toBe(true);
      if (third.ok) await collect(third.stream);
      await waitSlotFree(svc);
    });

    it('an unknown table name is rejected after the snapshot and leaves nothing behind', async () => {
      const r = await svc.openFullDbDump({ tables: ['definitely_not_a_table'] });
      expect(r).toEqual({ ok: false, reason: 'invalid_tables', unknown: ['definitely_not_a_table'] });
      const idle = await src.query(`SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%' AND pid <> pg_backend_pid()`);
      expect(idle.rowCount).toBe(0);
    });
  });

  describe('plan on the real catalog', () => {
    it('introspection works on a plain pool client and finds no cycles', async () => {
      const raw = await schemaMod.introspectSchema(async (q, p) => (await src.query(q, p)).rows);
      const plan = schemaMod.planDump(raw);
      expect(plan.cycles).toEqual([]);
      expect(plan.tables.length).toBeGreaterThan(50);
      expect(plan.excludedTables.map((t) => t.name)).toEqual(expect.arrayContaining(['users', 'audit_logs']));
    });
  });
});

describe.skipIf(!SRC_URL || !DST_URL)('ARGOS_I full DB import (temp PostgreSQL, empty target)', () => {
  let svc: Svc;
  let src: pg.Client;
  let dst: pg.Client;
  let files: Record<string, Uint8Array>;
  let root: string;
  let dir: string;
  let manifest: any;
  let schema: any;
  const prevEnv: Record<string, string | undefined> = {};

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  async function tableHash(c: pg.Client, table: string, cols: { name: string; udtName: string }[]) {
    const expr = cols.map((x) => (x.udtName === 'json' ? `${q(x.name)}::jsonb` : q(x.name))).join(', ');
    const sql = `SELECT count(*)::int AS n, md5(coalesce(string_agg(r, E'\\n' ORDER BY r), '')) AS h FROM (SELECT ROW(${expr})::text AS r FROM public.${q(table)}) s`;
    return (await c.query(sql)).rows[0] as { n: number; h: string };
  }
  async function compareAll() {
    const nullified = new Set(manifest.nullifiedFkColumns.map((n: any) => `${n.table}.${n.column}`));
    const mismatches: string[] = [];
    for (const t of manifest.tables) {
      if (!t.loadByDefault) continue;
      const cols = schema.tables.find((x: any) => x.name === t.name).columns.filter((c: any) => !nullified.has(`${t.name}.${c.name}`));
      const a = await tableHash(src, t.name, cols);
      const b = await tableHash(dst, t.name, cols);
      if (a.n !== b.n || a.h !== b.h) mismatches.push(`${t.name} src=${a.n}/${a.h} dst=${b.n}/${b.h}`);
    }
    return mismatches;
  }
  const counts = async () => {
    const out: Record<string, number> = {};
    for (const t of manifest.tables) out[t.name] = (await dst.query(`SELECT count(*)::int AS n FROM public.${q(t.name)}`)).rows[0].n;
    return out;
  };

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'ARGOS_I_EXPORT_TOKEN', 'ARGOS_I_FULL_DB_ENABLED', 'ARGOS_I_FULL_DB_ZIP_LEVEL']) prevEnv[k] = process.env[k];
    process.env.DATABASE_URL = SRC_URL;
    process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
    process.env.ARGOS_I_FULL_DB_ENABLED = 'true';
    process.env.ARGOS_I_FULL_DB_ZIP_LEVEL = '1';
    svc = await import('../../services/argos-i-full-db.service.js');
    src = new pg.Client({ connectionString: SRC_URL });
    dst = new pg.Client({ connectionString: DST_URL });
    await src.connect();
    await dst.connect();
    for (const c of [src, dst]) {
      await c.query(DROP);
      await c.query(DDL);
    }
    await src.query(SEED);
    ({ files, root } = await dumpToFiles(svc));
    dir = writeDump(files, root);
    manifest = JSON.parse(text(files[`${root}/manifest.json`]!));
    schema = JSON.parse(text(files[`${root}/schema.json`]!));
  });

  afterAll(async () => {
    await src?.query(`DELETE FROM articles WHERE content_hash LIKE 'fd-it-%'`).catch(() => undefined);
    await src?.query(`DELETE FROM users WHERE id = '${USER_ID}'`).catch(() => undefined);
    for (const c of [src, dst]) await c?.query(DROP).catch(() => undefined);
    await src?.end().catch(() => undefined);
    await dst?.end().catch(() => undefined);
    if (dir) rmSync(dirname(dirname(dir)), { recursive: true, force: true });
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('--verify-only passes, and a one-byte tamper makes every mode exit 3 without writing', async () => {
    expect(runImport(dir, ['--verify-only']).status).toBe(0);
    const victim = join(dir, 'tables', 'fd_it_parent.jsonl');
    const original = readFileSync(victim);
    const tampered = Buffer.from(original);
    tampered[tampered.length - 3] = tampered[tampered.length - 3]! ^ 0x01;
    writeFileSync(victim, tampered);
    try {
      const before = await counts();
      expect(runImport(dir, ['--mode', 'truncate', '--yes']).status).toBe(3);
      expect(runImport(dir, ['--verify-only']).status).toBe(3);
      expect(await counts()).toEqual(before);
    } finally {
      writeFileSync(victim, original);
    }
  });

  it('--dry-run writes nothing', async () => {
    const before = await counts();
    const r = runImport(dir, ['--dry-run']);
    expect([0, 4]).toContain(r.status);
    expect(r.stdout).toContain('dry-run');
    expect(await counts()).toEqual(before);
  });

  it('truncate load into an empty schema: exit 0, row counts and row hashes equal the source', async () => {
    const dmBefore = (await dst.query(`SELECT count(*)::int AS n FROM data_migrations`)).rows[0].n;
    const r = runImport(dir, ['--mode', 'truncate', '--yes']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const c = await counts();
    for (const t of manifest.tables) if (t.loadByDefault) expect(c[t.name], t.name).toBe(t.rows);
    expect(c.data_migrations).toBe(dmBefore); // data_migrations 는 기본으로 적재하지 않는다 (대상 기동 시 마커 그대로)
    expect(await compareAll()).toEqual([]);
    expect(r.stdout + r.stderr).not.toMatch(/password/i);
  });

  it('upsert re-run keeps counts and hashes, and serial sequences were reset so a new row inserts without a PK collision', async () => {
    const before = await counts();
    const r = runImport(dir, []);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(await counts()).toEqual(before);
    expect(await compareAll()).toEqual([]);
    const ins = await dst.query(`INSERT INTO fd_it_types (c_text) VALUES ('after-load') RETURNING id`);
    expect(ins.rows[0].id).toBeGreaterThan(3);
    const max = await dst.query(`SELECT max(id) AS m FROM fd_it_types`);
    expect(max.rows[0].m).toBe(ins.rows[0].id);
    await dst.query(`DELETE FROM fd_it_types WHERE c_text = 'after-load'`);
  });

  it('upsert disables user triggers during the load so updated_at values survive (owner), and the triggers are enabled again afterwards', async () => {
    // 표준 환경(마이그레이션 + 기동 시드)이면 coverage_field_events / humanoid_models 에 BEFORE UPDATE 트리거가 있다
    const trg = await dst.query(
      `SELECT c.relname, t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname IN ('coverage_field_events', 'humanoid_models') ORDER BY 1`,
    );
    const r = runImport(dir, ['--tables', 'coverage_field_events,humanoid_models']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout + r.stderr).not.toContain('updated_at 트리거가 값을 덮어쓸 수 있음');
    expect(await compareAll()).toEqual([]);
    const after = await dst.query(
      `SELECT c.relname, t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname IN ('coverage_field_events', 'humanoid_models') ORDER BY 1`,
    );
    expect(after.rows).toEqual(trg.rows); // 원복됨
    expect(after.rows.every((x: any) => x.tgenabled === 'O')).toBe(true);
  });

  it('without table ownership the trigger toggle is skipped with one warning per table and the load still completes', async () => {
    const role = 'fd_it_limited';
    await dst.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} LOGIN PASSWORD 'fd-it-not-a-secret' NOSUPERUSER; END IF; END $$`);
    await dst.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO ${role}; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    try {
      const u = new URL(DST_URL!);
      u.username = role;
      u.password = 'fd-it-not-a-secret';
      const r = runImport(dir, ['--tables', 'coverage_field_events'], u.toString());
      expect(r.status, r.stdout + r.stderr).toBe(0);
      const warns = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('updated_at 트리거가 값을 덮어쓸 수 있음'));
      expect(warns).toHaveLength(1);
      expect(warns[0]).toContain('coverage_field_events');
      expect(r.stdout + r.stderr).not.toContain('fd-it-not-a-secret');
    } finally {
      await dst.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    }
  });

  it('seed-like key conflict: upsert fails that table (exit 5, hint printed, rolled back); truncate succeeds', async () => {
    await dst.query(`DELETE FROM fd_it_slug`);
    await dst.query(`INSERT INTO fd_it_slug (id, slug, name) VALUES ('fd1f1f1f-0000-4000-8000-0000000000d1','fd-it-slug','seeded on target')`);
    const bad = runImport(dir, ['--tables', 'fd_it_slug']);
    expect(bad.status, bad.stdout + bad.stderr).toBe(5);
    expect(bad.stdout + bad.stderr).toContain('첫 적재라면 --mode truncate --yes 를 사용하세요');
    const still = await dst.query(`SELECT id, name FROM fd_it_slug`);
    expect(still.rows).toEqual([{ id: 'fd1f1f1f-0000-4000-8000-0000000000d1', name: 'seeded on target' }]); // 롤백됨
    const ok = runImport(dir, ['--tables', 'fd_it_slug', '--mode', 'truncate', '--yes']);
    expect(ok.status, ok.stdout + ok.stderr).toBe(0);
    expect((await dst.query(`SELECT name FROM fd_it_slug`)).rows).toEqual([{ name: 'from source' }]);
  });

  it('truncate refuses to cascade into tables outside the load set (nothing is written)', async () => {
    const before = await counts();
    const r = runImport(dir, ['--tables', 'fd_it_parent', '--mode', 'truncate', '--yes']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('fd_it_child');
    expect(await counts()).toEqual(before);
  });

  it('a column missing in the target skips only that table (exit 4)', async () => {
    await dst.query(`ALTER TABLE fd_it_parent DROP COLUMN extra`);
    try {
      const r = runImport(dir, ['--mode', 'truncate', '--yes', '--tables', 'fd_it_parent,fd_it_child,fd_it_types']);
      // fd_it_parent 를 건너뛰면 그것을 참조하는 fd_it_child 의 TRUNCATE CASCADE 범위 검사는 통과해야 하고 FK 경고가 나온다
      expect(r.stdout + r.stderr).toContain('columns_missing:[extra]');
      expect(r.status, r.stdout + r.stderr).toBe(4);
      expect((await dst.query(`SELECT count(*)::int AS n FROM fd_it_types`)).rows[0].n).toBe(3);
    } finally {
      await dst.query(`ALTER TABLE fd_it_parent ADD COLUMN extra text`);
    }
  });
});
