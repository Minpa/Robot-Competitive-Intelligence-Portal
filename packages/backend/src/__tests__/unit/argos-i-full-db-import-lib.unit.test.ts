/**
 * 적재 스크립트의 순수 로직 (scripts/lib/argos-i-full-db-import-lib.mjs) — 백엔드 직렬화와의 라운드트립 포함.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
// @ts-expect-error 순수 ESM 스크립트 모듈 (타입 선언 없음)
import * as lib from '../../../../../scripts/lib/argos-i-full-db-import-lib.mjs';
import { dumpEncodingForUdt as tsEncoding, encodeJsonlLine, serializeRow, type DumpColumn } from '../../services/argos-i-full-db-rows.js';

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

// ── 라운드트립 ────────────────────────────────────────────────────────────────

const col = (name: string, udtName: string): DumpColumn => ({ name, udtName, dumpEncoding: tsEncoding(udtName) });

const COLUMNS: DumpColumn[] = [
  col('c_bool', 'bool'),
  col('c_int4', 'int4'),
  col('c_int8', 'int8'),
  col('c_numeric', 'numeric'),
  col('c_float', 'float8'),
  col('c_text', 'text'),
  col('c_uuid', 'uuid'),
  col('c_bpchar', 'bpchar'),
  col('c_date', 'date'),
  col('c_ts', 'timestamp'),
  col('c_tstz', 'timestamptz'),
  col('c_jsonb_obj', 'jsonb'),
  col('c_jsonb_arr', 'jsonb'),
  col('c_jsonb_str', 'jsonb'),
  col('c_jsonb_null', 'jsonb'),
  col('c_json_sql_null', 'jsonb'),
  col('c_bytea', 'bytea'),
  col('c_arr', '_text'),
  col('c_inet', 'inet'),
];

const BYTES = Buffer.from([0, 1, 2, 250, 255]);
const TRICKY = 'a\nb\u2028c "q" 😀 \\ end';
const RAW_ROW: unknown[] = [
  true,
  42,
  '9007199254740993',
  '1234.50',
  NaN,
  TRICKY,
  '0f8fad5b-d9cb-469f-a165-70867728950e',
  'ab ',
  '2026-10-29',
  '2026-10-29 03:12:45.123456',
  '2026-10-29 03:12:45.100000+00'.replace('.100000', '.1'),
  { a: { b: [1, 2, { c: null }] }, s: 'x' },
  [1, 'two', null],
  'a string',
  { $jsonNull: true },
  null,
  BYTES,
  ['a', null, 'c,d', '"q"', '{x}'],
  '10.0.0.1/32',
];

describe('round trip: serializeRow -> JSONL line -> decodeRow', () => {
  const { object } = serializeRow(COLUMNS, RAW_ROW);
  const line = encodeJsonlLine(object);
  const parsed = JSON.parse(line.trimEnd());
  const params = lib.decodeRow(COLUMNS, parsed) as unknown[];
  const byName = Object.fromEntries(COLUMNS.map((c, i) => [c.name, params[i]]));

  it('keeps scalars exactly', () => {
    expect(byName.c_bool).toBe(true);
    expect(byName.c_int4).toBe(42);
    expect(byName.c_int8).toBe('9007199254740993'); // 문자열 그대로 (정밀도)
    expect(byName.c_numeric).toBe('1234.50'); // scale 보존
    expect(byName.c_float).toBe('NaN');
    expect(byName.c_text).toBe(TRICKY);
    expect(byName.c_uuid).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
    expect(byName.c_bpchar).toBe('ab ');
    expect(byName.c_date).toBe('2026-10-29');
    expect(byName.c_inet).toBe('10.0.0.1/32');
  });

  it('timestamps pass through as strings and are the PG text form plus T/Z (wall-clock preserved, microseconds kept)', () => {
    expect(byName.c_ts).toBe('2026-10-29T03:12:45.123456Z');
    expect(String(byName.c_ts).replace('T', ' ').replace(/Z$/, '')).toBe(RAW_ROW[9]);
    expect(byName.c_tstz).toBe('2026-10-29T03:12:45.1Z');
  });

  it('json/jsonb parameters are JSON text (never JS arrays); JSON null scalar becomes the text null; SQL NULL stays null', () => {
    expect(typeof byName.c_jsonb_obj).toBe('string');
    expect(JSON.parse(byName.c_jsonb_obj as string)).toEqual(RAW_ROW[11]);
    expect(Array.isArray(byName.c_jsonb_arr)).toBe(false);
    expect(byName.c_jsonb_arr).toBe('[1,"two",null]');
    expect(byName.c_jsonb_str).toBe('"a string"');
    expect(byName.c_jsonb_null).toBe('null');
    expect(byName.c_json_sql_null).toBeNull();
  });

  it('bytea becomes an equal Buffer and arrays stay JS arrays', () => {
    expect(Buffer.isBuffer(byName.c_bytea)).toBe(true);
    expect((byName.c_bytea as Buffer).equals(BYTES)).toBe(true);
    expect(byName.c_arr).toEqual(['a', null, 'c,d', '"q"', '{x}']);
    expect(Array.isArray(byName.c_arr)).toBe(true);
  });

  it('NULL of every type decodes to null', () => {
    const nulls = lib.decodeRow(COLUMNS, Object.fromEntries(COLUMNS.map((c) => [c.name, null])));
    expect(nulls.every((v: unknown) => v === null)).toBe(true);
    const { object: allNull } = serializeRow(COLUMNS, COLUMNS.map(() => null));
    expect(lib.decodeRow(COLUMNS, JSON.parse(encodeJsonlLine(allNull))).every((v: unknown) => v === null)).toBe(true);
  });

  it('decodeValue(udtName, value) matches decodeRow per column', () => {
    COLUMNS.forEach((c, i) => expect(lib.decodeValue(c.udtName, parsed[c.name])).toEqual(params[i]));
  });

  it('float specials and infinite dates survive', () => {
    expect(lib.decodeValue('float8', 'Infinity')).toBe('Infinity');
    expect(lib.decodeValue('float8', 1.5)).toBe(1.5);
    expect(lib.decodeValue('date', 'infinity')).toBe('infinity');
    expect(lib.decodeValue('timestamp', 'infinity')).toBe('infinity');
  });

  it('rejects malformed bytea / array values', () => {
    expect(() => lib.decodeValue('bytea', 'not-an-object')).toThrow();
    expect(() => lib.decodeValue('_text', 'not-an-array')).toThrow();
  });
});

describe('dumpEncodingForUdt agrees with the backend', () => {
  it.each(['bool', 'int2', 'int4', 'int8', 'numeric', 'float4', 'float8', 'text', 'varchar', 'bpchar', 'uuid', 'name', 'date', 'timestamp', 'timestamptz', 'json', 'jsonb', 'bytea', '_text', '_int4', '_uuid', '_varchar', '_bool', '_jsonb', '_bytea', '_int8', '_numeric', '_float8', 'inet', 'interval', 'tsvector', 'my_enum'])(
    '%s',
    (udt) => {
      expect(lib.dumpEncodingForUdt(udt)).toBe(tsEncoding(udt));
    },
  );
});

// ── INSERT / TRUNCATE / setval ─────────────────────────────────────────────────

describe('buildInsertStatement', () => {
  const columns = [
    { name: 'id', formatType: 'uuid' },
    { name: 'name', formatType: 'character varying(500)' },
    { name: 'amount', formatType: 'numeric(15,2)' },
    { name: 'at', formatType: 'timestamp without time zone' },
    { name: 'meta', formatType: 'jsonb' },
    { name: 'tags', formatType: 'text[]' },
  ];

  it('orders columns, numbers parameters and casts each parameter to the target format_type', () => {
    const s = lib.buildInsertStatement({ table: 't', columns, conflictTarget: null, mode: 'truncate', rowCount: 2 });
    expect(s.text).toBe(
      'INSERT INTO "public"."t" ("id", "name", "amount", "at", "meta", "tags") VALUES ' +
        '($1::uuid, $2::character varying(500), $3::numeric(15,2), $4::timestamp without time zone, $5::jsonb, $6::text[]), ' +
        '($7::uuid, $8::character varying(500), $9::numeric(15,2), $10::timestamp without time zone, $11::jsonb, $12::text[])',
    );
    expect(s.paramCount).toBe(12);
    expect(s.paramsPerRow).toBe(6);
  });

  it('upsert: ON CONFLICT (key) DO UPDATE SET non-key columns = EXCLUDED', () => {
    const s = lib.buildInsertStatement({ table: 't', columns, conflictTarget: { columns: ['id'] }, mode: 'upsert', rowCount: 1 });
    expect(s.text).toContain('ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "amount" = EXCLUDED."amount", "at" = EXCLUDED."at", "meta" = EXCLUDED."meta", "tags" = EXCLUDED."tags"');
    expect(s.text).not.toContain('"id" = EXCLUDED');
  });

  it('upsert with a composite key and no other columns is DO NOTHING', () => {
    const s = lib.buildInsertStatement({
      table: 'article_keywords',
      columns: [{ name: 'article_id', formatType: 'uuid' }, { name: 'keyword_id', formatType: 'uuid' }],
      conflictTarget: { columns: ['article_id', 'keyword_id'] },
      mode: 'upsert',
      rowCount: 1,
    });
    expect(s.text).toMatch(/ON CONFLICT \("article_id", "keyword_id"\) DO NOTHING$/);
  });

  it('truncate mode and key-less tables use a plain INSERT', () => {
    expect(lib.buildInsertStatement({ table: 't', columns, conflictTarget: { columns: ['id'] }, mode: 'truncate', rowCount: 1 }).text).not.toContain('ON CONFLICT');
    expect(lib.buildInsertStatement({ table: 't', columns, conflictTarget: null, mode: 'upsert', rowCount: 1 }).text).not.toContain('ON CONFLICT');
  });

  it('quotes identifiers and refuses unsafe type names', () => {
    const s = lib.buildInsertStatement({ table: 'we"ird', columns: [{ name: 'a"b', formatType: 'text' }], conflictTarget: null, mode: 'truncate', rowCount: 1 });
    expect(s.text).toContain('"public"."we""ird" ("a""b")');
    expect(() => lib.buildInsertStatement({ table: 't', columns: [{ name: 'a', formatType: "text); DROP TABLE x; --" }], conflictTarget: null, mode: 'truncate', rowCount: 1 })).toThrow();
    expect(() => lib.buildInsertStatement({ table: 't', columns: [{ name: 'a', formatType: 'text' }], conflictTarget: null, mode: 'truncate', rowCount: 0 })).toThrow();
  });

  it('effectiveBatchRows lowers the row count so parameters stay under 60000', () => {
    expect(lib.effectiveBatchRows(500, 10)).toBe(500);
    expect(lib.effectiveBatchRows(500, 200)).toBe(300);
    expect(lib.effectiveBatchRows(500, 70000)).toBe(1);
    expect(lib.effectiveBatchRows(5, 3)).toBe(5);
    for (const cols of [1, 7, 33, 120, 999]) expect(lib.effectiveBatchRows(100000, cols) * cols).toBeLessThanOrEqual(60000);
  });
});

describe('buildTruncateStatement / buildSetvalStatement', () => {
  it('truncates one table with CASCADE', () => {
    expect(lib.buildTruncateStatement('articles')).toBe('TRUNCATE TABLE "public"."articles" CASCADE');
  });

  it('setval uses the target database sequence lookup and is_called=false for an empty table', () => {
    const s = lib.buildSetvalStatement({ table: 'pm_items', column: 'id' });
    expect(s.text).toBe('SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX("id"), 1), MAX("id") IS NOT NULL) AS value FROM "public"."pm_items"');
    expect(s.values).toEqual(['"public"."pm_items"', 'id']);
    // 덤프 파일의 시퀀스 이름은 SQL 에 쓰지 않는다
    expect(s.text).not.toContain('_id_seq');
  });
});

describe('chunkRows', () => {
  it('splits by rows and by bytes', () => {
    expect(lib.chunkRows([1, 2, 3, 4, 5], { maxRows: 2, sizeOf: () => 1 })).toEqual([[1, 2], [3, 4], [5]]);
    expect(lib.chunkRows(['aaaa', 'bbbb', 'cc'], { maxRows: 100, maxBytes: 8 })).toEqual([['aaaa', 'bbbb'], ['cc']]);
    expect(lib.chunkRows(['x'.repeat(20)], { maxRows: 100, maxBytes: 8 })).toEqual([['x'.repeat(20)]]); // 한 행이 상한보다 커도 단독 배치
    expect(lib.chunkRows([], { maxRows: 3 })).toEqual([]);
  });
});

// ── 계획 ───────────────────────────────────────────────────────────────────────

type TCol = { udtName: string; formatType: string; isNullable: boolean; hasDefault: boolean; isGenerated: boolean; isIdentity: boolean };
const tcol = (udtName: string, over: Partial<TCol> = {}): TCol => ({ udtName, formatType: udtName, isNullable: true, hasDefault: false, isGenerated: false, isIdentity: false, ...over });

const sch = (name: string, columns: [string, string][], over: Record<string, unknown> = {}) => ({
  name,
  columns: columns.map(([n, u]) => ({ name: n, udtName: u })),
  primaryKey: ['id'],
  conflictTarget: { kind: 'primary_key', name: `${name}_pkey`, columns: ['id'] },
  foreignKeys: [],
  sequences: [],
  loadByDefault: true,
  ...over,
});
const mtab = (name: string, rows = 1, over: Record<string, unknown> = {}) => ({ name, path: `tables/${name}.jsonl`, rows, jsonlBytes: 10, sha256: 'a'.repeat(64), loadByDefault: true, loadOrderIndex: 0, ...over });
const args = (extra: string[] = []) => lib.parseArgs(['/dump', ...extra]);

function fixture() {
  const schema = {
    dumpFormatVersion: 1,
    loadOrder: ['parents', 'kids', 'data_migrations', 'links'],
    cycles: [],
    tables: [
      sch('parents', [['id', 'uuid'], ['name', 'text']]),
      sch('kids', [['id', 'uuid'], ['parent_id', 'uuid']], { foreignKeys: [{ name: 'kids_parent_fk', columns: ['parent_id'], refTable: 'parents', refColumns: ['id'] }] }),
      sch('data_migrations', [['key', 'text']], { loadByDefault: false }),
      sch('links', [['a', 'uuid'], ['b', 'uuid']], { primaryKey: [], conflictTarget: { kind: null, name: null, columns: [] } }),
    ],
  };
  const manifest = {
    dumpFormatVersion: 1,
    tables: [mtab('parents', 3), mtab('kids', 2), mtab('data_migrations', 1, { loadByDefault: false }), mtab('links', 4)],
  };
  const target = {
    tables: new Map([
      ['parents', { columns: new Map([['id', tcol('uuid', { isNullable: false })], ['name', tcol('text')]]) }],
      ['kids', { columns: new Map([['id', tcol('uuid', { isNullable: false })], ['parent_id', tcol('uuid')]]) }],
      ['data_migrations', { columns: new Map([['key', tcol('text', { isNullable: false })]]) }],
      ['links', { columns: new Map([['a', tcol('uuid')], ['b', tcol('uuid')]]) }],
    ]),
  };
  return { schema, manifest, target };
}

describe('planTables', () => {
  it('loads compatible tables, never loads data_migrations by default, and uses the target format_type', () => {
    const f = fixture();
    f.target.tables.get('parents')!.columns.get('name')!.formatType = 'character varying(10)';
    const { tables } = lib.planTables({ ...f, args: args() });
    const by = Object.fromEntries(tables.map((t: any) => [t.name, t]));
    expect(by.parents.status).toBe('load');
    expect(by.parents.loadColumns.find((c: any) => c.name === 'name').formatType).toBe('character varying(10)');
    expect(by.data_migrations).toMatchObject({ status: 'skip_user', reason: 'not_loaded_by_default' });
    expect(by.links.conflictTarget).toBeNull();
  });

  it('data_migrations is loaded only when named in --tables', () => {
    const f = fixture();
    const { tables } = lib.planTables({ ...f, args: args(['--tables', 'data_migrations,parents']) });
    expect(tables.find((t: any) => t.name === 'data_migrations').status).toBe('load');
    expect(tables.find((t: any) => t.name === 'kids')).toMatchObject({ status: 'skip_user', reason: 'not_selected' });
  });

  it('--skip excludes tables silently and an unknown --tables name is an argument error', () => {
    const f = fixture();
    expect(lib.planTables({ ...f, args: args(['--skip', 'kids']) }).tables.find((t: any) => t.name === 'kids')).toMatchObject({ status: 'skip_user' });
    expect(() => lib.planTables({ ...f, args: args(['--tables', 'nope']) })).toThrow(/덤프에 없는 테이블/);
  });

  it('skips with table_missing', () => {
    const f = fixture();
    f.target.tables.delete('kids');
    expect(lib.planTables({ ...f, args: args() }).tables.find((t: any) => t.name === 'kids')).toMatchObject({ status: 'skip_incompatible', reason: 'table_missing' });
  });

  it('skips with columns_missing:[...] when the target lacks a dump column', () => {
    const f = fixture();
    f.target.tables.get('parents')!.columns.delete('name');
    expect(lib.planTables({ ...f, args: args() }).tables.find((t: any) => t.name === 'parents')).toMatchObject({ status: 'skip_incompatible', reason: 'columns_missing:[name]' });
  });

  it('skips with type_mismatch:[...] when udt_name differs', () => {
    const f = fixture();
    f.target.tables.get('parents')!.columns.get('name')!.udtName = 'int4';
    expect(lib.planTables({ ...f, args: args() }).tables.find((t: any) => t.name === 'parents')).toMatchObject({ status: 'skip_incompatible', reason: 'type_mismatch:[name]' });
  });

  it('skips with target_required_column_missing:[...] for a NOT NULL, no-default target column absent from the dump', () => {
    const f = fixture();
    f.target.tables.get('parents')!.columns.set('required_new', tcol('text', { isNullable: false }));
    f.target.tables.get('kids')!.columns.set('with_default', tcol('text', { isNullable: false, hasDefault: true }));
    const plan = lib.planTables({ ...f, args: args() }).tables;
    expect(plan.find((t: any) => t.name === 'parents')).toMatchObject({ status: 'skip_incompatible', reason: 'target_required_column_missing:[required_new]' });
    expect(plan.find((t: any) => t.name === 'kids').status).toBe('load');
  });

  it('key-less table in upsert mode: skipped when the target has rows (no_key_target_not_empty), plain insert when empty, and truncate always loads', () => {
    const f = fixture();
    expect(lib.planTables({ ...f, args: args(), targetCounts: new Map([['links', 5]]) }).tables.find((t: any) => t.name === 'links')).toMatchObject({ status: 'skip_incompatible', reason: 'no_key_target_not_empty' });
    expect(lib.planTables({ ...f, args: args(), targetCounts: new Map([['links', 0]]) }).tables.find((t: any) => t.name === 'links').status).toBe('load');
    expect(lib.planTables({ ...f, args: args(['--mode', 'truncate', '--yes']), targetCounts: new Map([['links', 5]]) }).tables.find((t: any) => t.name === 'links').status).toBe('load');
  });

  it('warns when a loaded table references a skipped table through a FK', () => {
    const f = fixture();
    f.target.tables.delete('parents');
    const { tables, warnings } = lib.planTables({ ...f, args: args() });
    expect(tables.find((t: any) => t.name === 'parents').reason).toBe('table_missing');
    expect(warnings.some((w: string) => w.includes('kids') && w.includes('parents'))).toBe(true);
  });
});

describe('computeCascadeCollateral', () => {
  const fks = [
    { table: 'kids', refTable: 'parents' },
    { table: 'grandkids', refTable: 'kids' },
    { table: 'audit_logs', refTable: 'parents' },
  ];
  it('lists tables outside the load set that TRUNCATE CASCADE would also empty (transitively)', () => {
    expect(lib.computeCascadeCollateral(fks, ['parents', 'kids'])).toEqual(['audit_logs', 'grandkids']);
    expect(lib.computeCascadeCollateral(fks, ['parents', 'kids', 'grandkids', 'audit_logs'])).toEqual([]);
    expect(lib.computeCascadeCollateral(fks, ['grandkids'])).toEqual([]);
  });
});

// ── 인자 ───────────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('defaults', () => {
    const a = lib.parseArgs(['/dump']);
    expect(a).toMatchObject({ dir: '/dump', mode: 'upsert', yes: false, tables: null, dryRun: false, batchRows: 500, deferFk: false, verifyOnly: false, analyze: true, continueOnError: false, help: false });
    expect(a.skip).toEqual(['data_migrations']);
  });

  it('rejects --mode truncate without --yes (exit code 1), but allows it for --dry-run', () => {
    expect(() => lib.parseArgs(['/dump', '--mode', 'truncate'])).toThrow(/--yes/);
    try {
      lib.parseArgs(['/dump', '--mode=truncate']);
    } catch (e: any) {
      expect(e.code).toBe(1);
    }
    expect(lib.parseArgs(['/dump', '--mode', 'truncate', '--yes']).yes).toBe(true);
    expect(lib.parseArgs(['/dump', '--mode', 'truncate', '--dry-run']).mode).toBe('truncate');
  });

  it('data_migrations is skipped by default and a --tables mention enables it with a warning', () => {
    const a = lib.parseArgs(['/dump', '--tables', 'data_migrations,articles']);
    expect(a.tables).toEqual(['data_migrations', 'articles']);
    expect(a.skip).not.toContain('data_migrations');
    expect(a.warnings.join(' ')).toContain('data_migrations');
    const b = lib.parseArgs(['/dump', '--tables', 'articles', '--skip', 'users2']);
    expect(b.skip).toEqual(['users2', 'data_migrations']);
    expect(b.warnings).toEqual([]);
  });

  it('parses the remaining options', () => {
    const a = lib.parseArgs(['/dump', '--batch-rows', '200', '--defer-fk', '--verify-only', '--no-analyze', '--continue-on-error', '--dry-run', '--skip=a,b']);
    expect(a).toMatchObject({ batchRows: 200, deferFk: true, verifyOnly: true, analyze: false, continueOnError: true, dryRun: true });
    expect(a.skip).toEqual(['a', 'b', 'data_migrations']);
    expect(lib.parseArgs(['--help']).help).toBe(true);
  });

  it.each([
    [[]],
    [['/dump', '--mode', 'merge']],
    [['/dump', '--batch-rows', '0']],
    [['/dump', '--batch-rows', 'abc']],
    [['/dump', '--tables', 'Bad-Name']],
    [['/dump', '--tables']],
    [['/dump', '--bogus']],
    [['/dump', '/other']],
  ])('rejects invalid input %j with exit code 1', (argv) => {
    try {
      lib.parseArgs(argv);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
    }
  });

  it('never accepts a database URL or password argument', () => {
    expect(() => lib.parseArgs(['/dump', '--database-url', 'postgres://u:p@h/db'])).toThrow();
    expect(() => lib.parseArgs(['/dump', '--password', 'x'])).toThrow();
  });

  it('usage mentions the first-load recommendation and every exit code', () => {
    const u = lib.usage();
    expect(u).toContain('--mode truncate --yes');
    for (const c of ['0 ', '1 ', '2 ', '3 ', '4 ', '5 ', '6 ']) expect(u).toContain(`  ${c}`);
  });
});

// ── 체크섬 · manifest ─────────────────────────────────────────────────────────

describe('verifyFileChecksum', () => {
  const data = Buffer.from('{"a":1}\n{"a":2}\n');
  it('passes for identical bytes and fails after a single byte flip', async () => {
    const expected = { sha256: sha(data), bytes: data.length };
    expect((await lib.verifyFileChecksum(Readable.from([data.subarray(0, 5), data.subarray(5)]), expected)).ok).toBe(true);
    const tampered = Buffer.from(data);
    tampered[3] = tampered[3]! ^ 0x01;
    const r = await lib.verifyFileChecksum(Readable.from([tampered]), expected);
    expect(r.ok).toBe(false);
    expect(r.bytes).toBe(data.length);
  });
  it('fails when only the size differs', async () => {
    expect((await lib.verifyFileChecksum(Readable.from([data]), { sha256: sha(data), bytes: data.length + 1 })).ok).toBe(false);
  });
});

describe('verifyDumpDirectory', () => {
  it('reports tampered, missing and passing files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'argos-i-fd-'));
    try {
      mkdirSync(join(dir, 'tables'));
      const readme = Buffer.from('# readme');
      const schema = Buffer.from('{}');
      const good = Buffer.from('{"id":1}\n');
      writeFileSync(join(dir, 'README.md'), readme);
      writeFileSync(join(dir, 'schema.json'), schema);
      writeFileSync(join(dir, 'tables', 'good.jsonl'), good);
      writeFileSync(join(dir, 'tables', 'bad.jsonl'), Buffer.from('{"id":9}\n'));
      const manifest = {
        files: { 'README.md': sha(readme), 'schema.json': sha(schema) },
        tables: [
          { name: 'good', path: 'tables/good.jsonl', sha256: sha(good), jsonlBytes: good.length },
          { name: 'bad', path: 'tables/bad.jsonl', sha256: sha('{"id":1}\n'), jsonlBytes: 9 },
          { name: 'gone', path: 'tables/gone.jsonl', sha256: sha(''), jsonlBytes: 0 },
        ],
      };
      const problems = await lib.verifyDumpDirectory(dir, manifest);
      expect(problems).toHaveLength(2);
      expect(problems.join('\n')).toContain('tables/bad.jsonl');
      expect(problems.join('\n')).toContain('tables/gone.jsonl');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('readJsonlLines', () => {
  it('splits on LF only, handles chunk boundaries inside multibyte characters and a missing trailing newline', async () => {
    const text = '{"s":"한글😀"}\n{"s":"b"}\n{"s":"last"}';
    const buf = Buffer.from(text);
    const cut = buf.indexOf(Buffer.from('😀')) + 2; // 이모지 중간에서 자른다
    const lines: string[] = [];
    for await (const l of lib.readJsonlLines(Readable.from([buf.subarray(0, cut), buf.subarray(cut)]))) lines.push(l);
    expect(lines).toEqual(['{"s":"한글😀"}', '{"s":"b"}', '{"s":"last"}']);
  });
  it('does not split on U+2028 or CR inside a value', async () => {
    const line = encodeJsonlLine({ s: 'a\u2028b\rc' });
    const out: string[] = [];
    for await (const l of lib.readJsonlLines(Readable.from([Buffer.from(line)]))) out.push(l);
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0]!).s).toBe('a\u2028b\rc');
  });
});

describe('validateManifest', () => {
  const ok = () => ({
    manifest: { dumpFormatVersion: 1, selection: 'all', files: { 'README.md': 'a'.repeat(64), 'schema.json': 'b'.repeat(64) }, tables: [mtab('parents')] },
    schema: { dumpFormatVersion: 1, loadOrder: ['parents'], cycles: [], tables: [sch('parents', [['id', 'uuid']])] },
  });
  it('accepts a well-formed dump', () => {
    const { manifest, schema } = ok();
    expect(lib.validateManifest(manifest, schema)).toEqual([]);
  });
  it('rejects an unsupported dumpFormatVersion with exit code 1', () => {
    const { manifest, schema } = ok();
    manifest.dumpFormatVersion = 2;
    try {
      lib.validateManifest(manifest, schema);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
      expect(e.message).toContain('dumpFormatVersion');
    }
  });
  it.each([
    ['path traversal', (m: any) => (m.tables[0].path = 'tables/../../etc/passwd')],
    ['bad sha', (m: any) => (m.tables[0].sha256 = 'zz')],
    ['bad table name', (m: any) => ((m.tables[0].name = 'Evil;DROP'), (m.tables[0].path = 'tables/Evil;DROP.jsonl'))],
    ['missing files hash', (m: any) => delete m.files['README.md']],
    ['negative rows', (m: any) => (m.tables[0].rows = -1)],
  ])('rejects a damaged manifest (%s) with exit code 3', (_label, mutate) => {
    const { manifest, schema } = ok();
    (mutate as (m: any) => void)(manifest);
    try {
      lib.validateManifest(manifest, schema);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(3);
    }
  });
  it('warns about subset dumps', () => {
    const { manifest, schema } = ok();
    manifest.selection = 'subset';
    expect(lib.validateManifest(manifest, schema)[0]).toContain('부분 덤프');
  });
});

// ── 출력 ───────────────────────────────────────────────────────────────────────

describe('describeDatabaseUrl / formatSummary / explainTableError / decideExitCode', () => {
  it('describeDatabaseUrl never includes user or password', () => {
    const d = lib.describeDatabaseUrl('postgres://argos_user:s3cr3t-pass@db.internal:5433/argos_i?sslmode=require');
    expect(d).toBe('db.internal:5433/argos_i');
    expect(d).not.toContain('s3cr3t');
    expect(d).not.toContain('argos_user');
    expect(lib.describeDatabaseUrl('not a url')).toBe('(unparseable DATABASE_URL)');
  });

  it('formatSummary lists tables, counts and warnings without secrets or row data', () => {
    const out = lib.formatSummary({
      target: lib.describeDatabaseUrl('postgres://u:s3cr3t@h:5432/db'),
      mode: 'truncate',
      dryRun: false,
      totalMs: 1234,
      warnings: ['소스 버전이 다릅니다'],
      results: [
        { name: 'articles', status: 'loaded', rowsExpected: 1200, rowsLoaded: 1200, count: 1200, ms: 900 },
        { name: 'kids', status: 'skipped', rowsExpected: 5, reason: 'columns_missing:[x]' },
        { name: 'broken', status: 'failed', rowsExpected: 3, reason: '[23505] duplicate key' },
        { name: 'data_migrations', status: 'excluded', rowsExpected: 2, reason: 'not_loaded_by_default' },
        { name: 'unselected_table', status: 'excluded', rowsExpected: 9, reason: 'not_selected' },
      ],
    });
    expect(out).not.toContain('unselected_table');
    expect(out).toContain('--tables 로 선택하지 않은 1개 테이블은 생략');
    expect(out).toContain('h:5432/db');
    expect(out).toContain('articles');
    expect(out).toContain('1,200');
    expect(out).toContain('columns_missing:[x]');
    expect(out).toContain('적재 1 / 건너뜀 1 / 실패 1 / 제외(옵션) 2');
    expect(out).toContain('경고: 소스 버전이 다릅니다');
    expect(out).not.toContain('s3cr3t');
  });

  it('a unique violation (23505) in upsert mode points at --mode truncate --yes and never prints row detail', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "ci_layers_slug_key"'), { code: '23505', constraint: 'ci_layers_slug_key', detail: 'Key (slug)=(secret-row-value) already exists.' });
    const msg = lib.explainTableError(err, 'upsert');
    expect(msg).toContain('23505');
    expect(msg).toContain('첫 적재라면 --mode truncate --yes 를 사용하세요');
    expect(msg).not.toContain('secret-row-value');
    expect(lib.explainTableError(err, 'truncate')).not.toContain('첫 적재라면');
    expect(lib.explainTableError(Object.assign(new Error('fk'), { code: '23503' }), 'truncate')).toContain('FK 위반');
  });

  it('decideExitCode prefers 5 over 6 over 4', () => {
    expect(lib.decideExitCode({ failed: true, countMismatch: true, skipped: true })).toBe(5);
    expect(lib.decideExitCode({ failed: false, countMismatch: true, skipped: true })).toBe(6);
    expect(lib.decideExitCode({ failed: false, countMismatch: false, skipped: true })).toBe(4);
    expect(lib.decideExitCode({ failed: false, countMismatch: false, skipped: false })).toBe(0);
  });
});

// ── 사용자 트리거 (upsert 의 updated_at 덮어쓰기 방지) ─────────────────────────────

describe('user trigger handling for upsert', () => {
  it('only toggles in upsert mode and only for tables that have user triggers', () => {
    const t = new Set(['coverage_field_events', 'humanoid_models']);
    expect(lib.shouldToggleUserTriggers('upsert', 'coverage_field_events', t)).toBe(true);
    expect(lib.shouldToggleUserTriggers('upsert', 'articles', t)).toBe(false);
    expect(lib.shouldToggleUserTriggers('truncate', 'coverage_field_events', t)).toBe(false);
    expect(lib.shouldToggleUserTriggers('upsert', 'coverage_field_events', undefined)).toBe(false);
  });

  it('builds quoted DISABLE/ENABLE TRIGGER USER statements wrapped in a savepoint', () => {
    const s = lib.buildTriggerToggleStatements('coverage_field_events');
    expect(s.disable).toBe('ALTER TABLE "public"."coverage_field_events" DISABLE TRIGGER USER');
    expect(s.enable).toBe('ALTER TABLE "public"."coverage_field_events" ENABLE TRIGGER USER');
    expect(s.savepoint).toMatch(/^SAVEPOINT \w+$/);
    expect(s.rollbackToSavepoint).toBe(s.savepoint.replace('SAVEPOINT', 'ROLLBACK TO SAVEPOINT'));
    expect(s.release).toBe(s.savepoint.replace('SAVEPOINT', 'RELEASE SAVEPOINT'));
    expect(lib.buildTriggerToggleStatements('we"ird').disable).toContain('"we""ird"');
  });

  it('looks up only non-internal, non-disabled triggers in the public schema', () => {
    expect(lib.SQL_TABLES_WITH_USER_TRIGGERS).toContain('NOT t.tgisinternal');
    expect(lib.SQL_TABLES_WITH_USER_TRIGGERS).toContain("n.nspname = 'public'");
  });

  it('the warning names the table and the updated_at risk', () => {
    const w = lib.triggerWarning('humanoid_models');
    expect(w).toContain('humanoid_models');
    expect(w).toContain('updated_at 트리거가 값을 덮어쓸 수 있음');
  });

  it('the import script runs DISABLE inside the table transaction before the first INSERT, and ENABLE before COMMIT; a failed DISABLE rolls back to the savepoint and continues', () => {
    const src = readFileSync(new URL('../../../../../scripts/argos-i-import-full-db.mjs', import.meta.url), 'utf-8');
    const body = src.slice(src.indexOf('async function loadTable'), src.indexOf('async function main'));
    const idx = (needle: string) => {
      const i = body.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    expect(idx("'BEGIN'")).toBeLessThan(idx('trg.savepoint'));
    expect(idx('trg.savepoint')).toBeLessThan(idx('trg.disable'));
    expect(idx('trg.disable')).toBeLessThan(idx('trg.rollbackToSavepoint'));
    expect(idx('trg.rollbackToSavepoint')).toBeLessThan(idx('readJsonlLines'));
    expect(idx('await flush();\n    if (triggersOff)')).toBeLessThan(idx('trg.enable'));
    expect(idx('trg.enable')).toBeLessThan(idx("'COMMIT'"));
    expect(body).toContain('triggerWarning(entry.name)');
  });

  it('--help documents the trigger behaviour', () => {
    expect(lib.usage()).toContain('사용자 트리거를 적재 중 비활성화');
    expect(lib.usage()).toContain('coverage_field_events, humanoid_models');
  });
});
