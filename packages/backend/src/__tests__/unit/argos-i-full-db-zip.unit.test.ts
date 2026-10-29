import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { unzipSync } from 'fflate';
import type { Readable } from 'stream';
import {
  ZIP32_ENTRY_LIMIT,
  ZIP32_TOTAL_LIMIT,
  createFullDbZipStream,
  dumpFolder,
  formatDumpTimestamp,
  type FullDbProgressEvent,
  type FullDbSource,
} from '../../services/argos-i-full-db-zip.js';
import { planDump, type RawColumn, type RawSchema } from '../../services/argos-i-full-db-schema.js';

// ── 계획: parents(2열) <- items(FK), empty_t, regulatory_sources(스크러빙), users(제외) ─────

function col(table: string, name: string, i: number, udt: string, nullable = true): RawColumn {
  return { table, name, ordinalPosition: i, dataType: udt, udtName: udt, formatType: udt, isNullable: nullable, default: null, isGenerated: false, isIdentity: false, identityGeneration: null };
}

const RAW: RawSchema = {
  tables: ['empty_t', 'items', 'parents', 'regulatory_sources', 'users'],
  columns: [
    col('parents', 'id', 1, 'int4', false),
    col('parents', 'name', 2, 'text'),
    col('items', 'id', 1, 'int4', false),
    col('items', 'parent_id', 2, 'int4', false),
    col('items', 'created_by', 3, 'uuid'),
    col('items', 'amount', 4, 'numeric'),
    col('items', 'at', 5, 'timestamp'),
    col('empty_t', 'id', 1, 'int4', false),
    col('regulatory_sources', 'id', 1, 'int4', false),
    col('regulatory_sources', 'config', 2, 'jsonb'),
    col('users', 'id', 1, 'uuid', false),
  ],
  foreignKeys: [
    { name: 'items_parent_fk', table: 'items', columns: ['parent_id'], refSchema: 'public', refTable: 'parents', refColumns: ['id'], onDeleteCode: 'c' },
    { name: 'items_user_fk', table: 'items', columns: ['created_by'], refSchema: 'public', refTable: 'users', refColumns: ['id'], onDeleteCode: 'n' },
  ],
  uniqueIndexes: ['parents', 'items', 'empty_t', 'regulatory_sources'].map((t) => ({ table: t, name: `${t}_pkey`, isPrimary: true, isPartial: false, hasExpression: false, columns: ['id'] })),
  sequences: [],
};

const plan = planDump(RAW);
const GENERATED_AT = new Date('2026-10-29T03:12:45.000Z');

type RowSet = Record<string, unknown[][]>;

const DATA: RowSet = {
  parents: [
    [1, 'one'],
    [2, 'two\nlines "quoted" 😀'],
  ],
  // items: id, parent_id, created_by(nullified -> value ignored), amount, at
  items: [
    [10, 1, 'user-uuid-ignored', '10.50', '2026-10-29 01:02:03.123456'],
    [11, 2, null, null, null],
    [12, 2, null, '0.00', '2026-01-01 00:00:00'],
  ],
  empty_t: [],
  regulatory_sources: [[1, { selector: '#a', apiKey: 'NOT-A-REAL-KEY', nested: { Authorization: 'x', keep: 1 } }]],
};

interface FakeStats {
  fetchCalls: number;
  opened: string[];
  readersClosed: string[];
  sourceClosed: number;
}

function fakeSource(data: RowSet, stats: FakeStats = { fetchCalls: 0, opened: [], readersClosed: [], sourceClosed: 0 }, perFetchDelayMs = 0): FullDbSource & { stats: FakeStats } {
  return {
    stats,
    async openTable(table) {
      stats.opened.push(table.name);
      const rows = data[table.name] ?? [];
      let pos = 0;
      return {
        async fetch(maxRows) {
          stats.fetchCalls += 1;
          if (perFetchDelayMs) await new Promise((r) => setTimeout(r, perFetchDelayMs));
          if (pos >= rows.length) return null;
          const out = rows.slice(pos, pos + maxRows);
          pos += out.length;
          return out;
        },
        async close() {
          stats.readersClosed.push(table.name);
        },
      };
    },
    async close() {
      stats.sourceClosed += 1;
    },
  };
}

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const text = (u: Uint8Array) => Buffer.from(u).toString('utf-8');

function build(overrides: Partial<Parameters<typeof createFullDbZipStream>[0]> = {}, source = fakeSource(DATA)) {
  const events: FullDbProgressEvent[] = [];
  const stream = createFullDbZipStream({
    source,
    plan,
    ctx: { generatedAt: GENERATED_AT, selectedTables: plan.loadOrder, commit: 'abc1234', latestDrizzleSql: '0030_add_argos_i_exports.sql' },
    level: 6,
    batchRows: 100,
    onProgress: (e) => events.push(e),
    ...overrides,
  });
  return { stream, events, source };
}

describe('plan used by the tests', () => {
  it('orders parents before items and drops users', () => {
    expect(plan.loadOrder).toEqual(['empty_t', 'parents', 'regulatory_sources', 'items']);
  });
  it('folder name is a UTC timestamp', () => {
    expect(formatDumpTimestamp(GENERATED_AT)).toBe('20261029T031245Z');
    expect(dumpFolder(GENERATED_AT)).toBe('argos-i-full-db/20261029T031245Z');
  });
});

describe('createFullDbZipStream', () => {
  for (const level of [0, 6]) {
    it(`level ${level}: assembles a valid ZIP with ordered entries, matching JSONL and an accurate manifest`, async () => {
      const { stream, events } = build({ level });
      const zip = await collect(stream);
      const files = unzipSync(new Uint8Array(zip));
      const names = Object.keys(files);
      const root = 'argos-i-full-db/20261029T031245Z';
      expect(names).toEqual([
        `${root}/README.md`,
        `${root}/schema.json`,
        `${root}/tables/empty_t.jsonl`,
        `${root}/tables/parents.jsonl`,
        `${root}/tables/regulatory_sources.jsonl`,
        `${root}/tables/items.jsonl`,
        `${root}/manifest.json`,
      ]);
      expect(names[names.length - 1]).toBe(`${root}/manifest.json`);

      const parents = text(files[`${root}/tables/parents.jsonl`]!).split('\n');
      expect(parents).toHaveLength(3); // 2 lines + trailing newline
      expect(JSON.parse(parents[1]!)).toEqual({ id: 2, name: 'two\nlines "quoted" 😀' });
      expect(parents[2]).toBe('');

      const items = text(files[`${root}/tables/items.jsonl`]!).trimEnd().split('\n').map((l) => JSON.parse(l));
      expect(items).toEqual([
        { id: 10, parent_id: 1, created_by: null, amount: '10.50', at: '2026-10-29T01:02:03.123456Z' },
        { id: 11, parent_id: 2, created_by: null, amount: null, at: null },
        { id: 12, parent_id: 2, created_by: null, amount: '0.00', at: '2026-01-01T00:00:00Z' },
      ]);
      expect(Object.keys(items[0])).toEqual(['id', 'parent_id', 'created_by', 'amount', 'at']);
      expect(text(files[`${root}/tables/empty_t.jsonl`]!)).toBe('');

      const reg = JSON.parse(text(files[`${root}/tables/regulatory_sources.jsonl`]!));
      expect(reg.config).toEqual({ selector: '#a', nested: { keep: 1 } });
      expect(JSON.stringify(reg)).not.toContain('NOT-A-REAL-KEY');

      const manifest = JSON.parse(text(files[`${root}/manifest.json`]!));
      expect(manifest.dumpFormatVersion).toBe(1);
      expect(manifest.generatedAt).toBe('2026-10-29T03:12:45.000Z');
      expect(manifest.selection).toBe('all');
      expect(manifest.generator).toEqual({ name: 'argos', commit: 'abc1234' });
      expect(manifest.schemaHint).toMatchObject({ tableCount: 4, latestDrizzleSql: '0030_add_argos_i_exports.sql', gitCommit: 'abc1234' });
      expect(manifest.schemaHint.schemaFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(manifest.tables.map((t: any) => t.name)).toEqual(plan.loadOrder);
      for (const t of manifest.tables) {
        const content = files[`${root}/${t.path}`]!;
        expect(t.jsonlBytes, t.name).toBe(content.length);
        expect(t.sha256, t.name).toBe(sha(content));
        expect(t.rows, t.name).toBe(text(content).split('\n').filter(Boolean).length);
        expect(t.loadByDefault).toBe(true);
      }
      expect(manifest.tables.find((t: any) => t.name === 'empty_t')).toMatchObject({ rows: 0, jsonlBytes: 0 });
      expect(manifest.totals).toEqual({ tableCount: 4, rows: 6, jsonlBytes: manifest.tables.reduce((n: number, t: any) => n + t.jsonlBytes, 0) });
      expect(manifest.files['README.md']).toBe(sha(files[`${root}/README.md`]!));
      expect(manifest.files['schema.json']).toBe(sha(files[`${root}/schema.json`]!));
      expect(manifest.excludedTables).toEqual([{ name: 'users', reason: 'accounts_and_password_hash' }]);
      expect(manifest.nullifiedFkColumns).toEqual([{ table: 'items', column: 'created_by', refTable: 'users' }]);
      expect(manifest.scrubbedJsonKeys).toEqual([{ table: 'regulatory_sources', column: 'config', removedKeyCount: 2 }]);
      expect(manifest.allowlistedColumns).toEqual([]);

      const schema = JSON.parse(text(files[`${root}/schema.json`]!));
      expect(schema.loadOrder).toEqual(plan.loadOrder);
      expect(text(files[`${root}/README.md`]!)).toContain('외부 재배포 금지');

      expect(events.filter((e) => e.event === 'table').map((e) => (e as any).table)).toEqual(plan.loadOrder);
      const done = events.find((e) => e.event === 'done') as Extract<FullDbProgressEvent, { event: 'done' }>;
      expect(done).toMatchObject({ tables: 4, rows: 6 });
      expect(done.zipBytes).toBe(zip.length);
    });
  }

  it('level 0 stores the JSONL uncompressed', async () => {
    const zip = await collect(build({ level: 0 }).stream);
    expect(zip.includes(Buffer.from('"name":"one"'))).toBe(true);
    const zip6 = await collect(build({ level: 6 }).stream);
    expect(zip6.includes(Buffer.from('"name":"one"'))).toBe(false);
  });

  it('subset selection keeps loadOrder, marks selection=subset and still carries the full schema', async () => {
    const { stream } = build({ ctx: { generatedAt: GENERATED_AT, selectedTables: ['items', 'parents'], commit: null, latestDrizzleSql: null } });
    const files = unzipSync(new Uint8Array(await collect(stream)));
    const root = 'argos-i-full-db/20261029T031245Z';
    expect(Object.keys(files)).toEqual([`${root}/README.md`, `${root}/schema.json`, `${root}/tables/parents.jsonl`, `${root}/tables/items.jsonl`, `${root}/manifest.json`]);
    const manifest = JSON.parse(text(files[`${root}/manifest.json`]!));
    expect(manifest.selection).toBe('subset');
    expect(manifest.selectedTables).toEqual(['parents', 'items']);
    expect(manifest.generator.commit).toBeNull();
    expect(JSON.parse(text(files[`${root}/schema.json`]!)).tables).toHaveLength(4);
    expect(manifest.scrubbedJsonKeys).toEqual([]);
  });

  it('closes the source once on success', async () => {
    const { stream, source } = build();
    await collect(stream);
    expect(source.stats.sourceClosed).toBe(1);
    expect([...source.stats.readersClosed].sort()).toEqual(['empty_t', 'items', 'parents', 'regulatory_sources']);
  });

  it('adapts the fetch size: never above batchRows, never below 50 rows for tiny rows', async () => {
    const sizes: number[] = [];
    const rows = Array.from({ length: 1000 }, (_, i) => [i, 'x']);
    const source: FullDbSource = {
      async openTable(table) {
        let pos = 0;
        const data = table.name === 'parents' ? rows : [];
        return {
          async fetch(n) {
            sizes.push(n);
            if (pos >= data.length) return null;
            const out = data.slice(pos, pos + n);
            pos += out.length;
            return out;
          },
          async close() {},
        };
      },
      async close() {},
    };
    await collect(build({ batchRows: 300 }, source).stream);
    const parentSizes = sizes.slice(sizes.length > 0 ? 1 : 0); // empty_t 첫 호출 제외
    expect(Math.max(...sizes)).toBeLessThanOrEqual(300);
    expect(sizes[1]).toBe(100); // 첫 배치는 100행
    expect(parentSizes.some((s) => s === 300)).toBe(true); // 작은 행이므로 상한까지 커진다
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(50);
  });
});

describe('backpressure and cleanup', () => {
  it('does not run ahead of a slow consumer: source fetches track consumption', async () => {
    const bigRows = Array.from({ length: 60000 }, (_, i) => [i, 'a fairly long text value to give each row some weight '.repeat(2)]);
    const stats: FakeStats = { fetchCalls: 0, opened: [], readersClosed: [], sourceClosed: 0 };
    const source = fakeSource({ ...DATA, parents: bigRows }, stats);
    const { stream } = build({ level: 0, batchRows: 100 }, source);
    const it = stream[Symbol.asyncIterator]();
    await it.next();
    await new Promise((r) => setTimeout(r, 150)); // 소비자가 멈춘 동안
    const afterPause = stats.fetchCalls;
    await new Promise((r) => setTimeout(r, 150));
    expect(stats.fetchCalls).toBe(afterPause); // 소비하지 않으면 진행하지 않는다
    // 전체 600 배치 중 일부만 미리 읽었다 (HWM 256KiB)
    expect(afterPause).toBeLessThan(60);
    for (let i = 0; i < 20; i++) await it.next();
    expect(stats.fetchCalls).toBeGreaterThan(afterPause);
    await it.return?.();
  });

  it('destroying the stream mid-way closes the table reader and the source and reports closed', async () => {
    const bigRows = Array.from({ length: 20000 }, (_, i) => [i, 'x'.repeat(200)]);
    const stats: FakeStats = { fetchCalls: 0, opened: [], readersClosed: [], sourceClosed: 0 };
    const { stream, events } = build({ level: 0 }, fakeSource({ ...DATA, parents: bigRows }, stats));
    const it = stream[Symbol.asyncIterator]();
    await it.next();
    await new Promise((r) => setTimeout(r, 20));
    const closed = new Promise<void>((resolve) => stream.once('close', () => resolve()));
    stream.destroy();
    await closed;
    await new Promise((r) => setTimeout(r, 20));
    expect(stats.sourceClosed).toBe(1);
    expect(stats.readersClosed).toContain('parents');
    const aborted = events.find((e) => e.event === 'aborted') as any;
    expect(aborted).toMatchObject({ reason: 'closed', table: 'parents' });
    expect(events.some((e) => e.event === 'done')).toBe(false);
  });

  it('destroying a stream that was never read still closes the source', async () => {
    const { stream, source } = build();
    const closed = new Promise<void>((resolve) => stream.once('close', () => resolve()));
    stream.destroy();
    await closed;
    await new Promise((r) => setTimeout(r, 10));
    expect((source as any).stats.sourceClosed).toBe(1);
  });

  it('a source error aborts the stream (no manifest), reports a one-line message and still closes everything', async () => {
    const stats: FakeStats = { fetchCalls: 0, opened: [], readersClosed: [], sourceClosed: 0 };
    const source = fakeSource(DATA, stats);
    const original = source.openTable.bind(source);
    source.openTable = async (table) => {
      if (table.name === 'items') throw new Error('boom\n  with   newline');
      return original(table);
    };
    const { stream, events } = build({}, source);
    const chunks: Buffer[] = [];
    await expect(
      (async () => {
        for await (const c of stream) chunks.push(c as Buffer);
      })(),
    ).rejects.toThrow('boom');
    expect(Buffer.concat(chunks).includes(Buffer.from('manifest.json'))).toBe(false);
    const aborted = events.find((e) => e.event === 'aborted') as any;
    expect(aborted).toMatchObject({ reason: 'error', message: 'boom with newline', table: 'items' });
    expect(stats.sourceClosed).toBe(1);
  });
});

describe('ZIP32 guard', () => {
  it('constants sit just below 4 GiB', () => {
    expect(ZIP32_ENTRY_LIMIT).toBeLessThan(4 * 1024 ** 3);
    expect(ZIP32_TOTAL_LIMIT).toBeLessThan(ZIP32_ENTRY_LIMIT);
  });

  it('an entry above the limit ends the stream with an error and no manifest (zip32_limit)', async () => {
    const { stream, events } = build({ level: 0, limits: { entryBytes: 120 } });
    const chunks: Buffer[] = [];
    await expect(
      (async () => {
        for await (const c of stream) chunks.push(c as Buffer);
      })(),
    ).rejects.toThrow('zip32_limit');
    expect(Buffer.concat(chunks).includes(Buffer.from('manifest.json'))).toBe(false);
    expect(events.find((e) => e.event === 'aborted')).toMatchObject({ reason: 'zip32_limit' });
    expect(events.some((e) => e.event === 'done')).toBe(false);
  });

  it('a total above the limit ends the stream with zip32_limit', async () => {
    const { stream, events } = build({ level: 0, limits: { totalBytes: 2000 } });
    await expect(collect(stream)).rejects.toThrow('zip32_limit');
    expect(events.find((e) => e.event === 'aborted')).toMatchObject({ reason: 'zip32_limit' });
  });
});
