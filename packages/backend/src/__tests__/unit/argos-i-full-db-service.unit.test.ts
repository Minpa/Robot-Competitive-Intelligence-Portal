import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {}, pool: {} };
});

import {
  __resetFullDbStateForTests,
  __setFullDbPoolForTests,
  createPgFullDbSource,
  getFullDbLastRun,
  getFullDbPreview,
  isFullDbSlotBusy,
  openFullDbDump,
  type PgClientLike,
  type PgQueryConfig,
} from '../../services/argos-i-full-db.service.js';
import { FULL_DB_LOCK_KEY } from '../../services/argos-i-full-db-config.js';

const TOKEN = 'test-token-0123456789abcdef0123456789abcdef';
const SENTINEL_ROW = 'ROWDATA-SENTINEL-VALUE-12345';

interface FakeOpts {
  lockAvailable?: boolean;
  rows?: unknown[][];
  failFetch?: boolean;
  failCountOn?: string;
  tableStats?: { table_name: string; est_rows: number; bytes: number }[];
  lockHeldElsewhere?: boolean;
  failRollback?: boolean;
}

function makeFake(opts: FakeOpts = {}) {
  const queries: string[] = [];
  const state = { released: [] as (boolean | Error | undefined)[], rows: [...(opts.rows ?? [[1, 'a'], [2, SENTINEL_ROW]])] };
  const client: PgClientLike = {
    async query(q: string | PgQueryConfig, values?: unknown[]) {
      const text = typeof q === 'string' ? q : q.text;
      queries.push(values ? `${text} -- ${JSON.stringify(values)}` : text);
      if (text.includes('pg_try_advisory_lock')) return { rows: [{ locked: opts.lockAvailable !== false }] };
      if (text.includes('pg_advisory_unlock')) return { rows: [{ pg_advisory_unlock: true }] };
      if (text.includes('extract(epoch FROM now())')) return { rows: [{ ms: String(Date.UTC(2026, 9, 29, 3, 12, 45)) }] };
      if (text.includes('FROM information_schema.tables')) return { rows: [{ table_name: 'a' }, { table_name: 'b' }, { table_name: 'users' }] };
      if (text.includes('FROM information_schema.columns c\nJOIN')) {
        const mk = (table_name: string, column_name: string, ordinal_position: number, udt_name: string, is_nullable = 'YES') => ({
          table_name, column_name, ordinal_position, data_type: udt_name, udt_name, format_type: udt_name, is_nullable, column_default: null, is_generated: 'NEVER', is_identity: 'NO', identity_generation: null,
        });
        return { rows: [mk('a', 'id', 1, 'int4', 'NO'), mk('a', 'name', 2, 'text'), mk('b', 'id', 3, 'int4', 'NO'), mk('users', 'id', 1, 'uuid', 'NO')] };
      }
      if (text.includes('pg_constraint')) return { rows: [] };
      if (text.includes('pg_index')) return { rows: ['a', 'b'].map((t) => ({ table_name: t, index_name: `${t}_pkey`, is_primary: true, is_partial: false, has_expression: false, columns: ['id'] })) };
      if (text.includes('pg_get_serial_sequence')) return { rows: [] };
      if (text.startsWith('FETCH')) {
        if (opts.failFetch) throw new Error('boom: connection\nterminated');
        const n = Number(/FETCH FORWARD (\d+)/.exec(text)![1]);
        return { rows: state.rows.splice(0, n) };
      }
      if (text.includes('FROM pg_catalog.pg_class c')) return { rows: opts.tableStats ?? [] };
      if (text.includes('pg_catalog.pg_locks')) return { rows: [{ held: opts.lockHeldElsewhere === true }] };
      if (text.startsWith('SELECT count(*)')) {
        if (opts.failCountOn && text.includes(`"${opts.failCountOn}"`)) throw new Error('canceling statement due to statement timeout');
        return { rows: [{ n: '7' }] };
      }
      if (text === 'ROLLBACK' && opts.failRollback) throw new Error('rollback failed');
      return { rows: [] };
    },
    release(destroy) {
      state.released.push(destroy);
    },
  };
  const connect = vi.fn(async () => client);
  __setFullDbPoolForTests({ connect });
  return { queries, state, connect };
}

async function drain(stream: NodeJS.ReadableStream): Promise<number> {
  let n = 0;
  for await (const c of stream) n += (c as Buffer).length;
  return n;
}

const closed = (s: NodeJS.ReadableStream) =>
  new Promise<void>((r) => {
    if ((s as any).closed) setTimeout(r, 10);
    else (s as any).once('close', () => setTimeout(r, 10));
  });

let logs: string[] = [];
const saved = { ...process.env };
beforeEach(() => {
  __resetFullDbStateForTests();
  logs = [];
  for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
  process.env.ARGOS_I_FULL_DB_ZIP_LEVEL = '0';
});
afterEach(() => {
  process.env = { ...saved };
  __setFullDbPoolForTests();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('openFullDbDump: transaction and SQL order', () => {
  it('locks, opens a REPEATABLE READ READ ONLY snapshot, reads through a cursor and tears everything down', async () => {
    const f = makeFake();
    const r = await openFullDbDump();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(isFullDbSlotBusy()).toBe(true);
    expect(r.generatedAt.toISOString()).toBe('2026-10-29T03:12:45.000Z');
    expect(await drain(r.stream)).toBeGreaterThan(0);
    await closed(r.stream);

    const q = f.queries;
    const idx = (needle: string) => q.findIndex((x) => x.includes(needle));
    expect(q[0]).toContain(`pg_try_advisory_lock($1) AS locked -- [${FULL_DB_LOCK_KEY}]`);
    expect(q[1]).toBe('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    expect(q[2]).toBe('SET LOCAL statement_timeout = 0');
    expect(q[3]).toBe('SET LOCAL idle_in_transaction_session_timeout = 0');
    expect(q[4]).toBe("SET LOCAL TimeZone = 'UTC'");
    expect(idx('information_schema.tables')).toBeGreaterThan(4);
    const declareA = idx('DECLARE argos_i_full_db_cur NO SCROLL CURSOR FOR SELECT "id" AS "id", "name" AS "name" FROM "public"."a"');
    expect(declareA).toBeGreaterThan(idx('pg_get_serial_sequence'));
    expect(q[declareA + 1]).toMatch(/^FETCH FORWARD \d+ FROM argos_i_full_db_cur$/);
    expect(q.filter((x) => x === 'CLOSE argos_i_full_db_cur')).toHaveLength(2); // a, b
    expect(q.some((x) => x.includes('"users"'))).toBe(false); // 제외 테이블은 읽지 않는다
    const rollback = q.lastIndexOf('ROLLBACK');
    const unlock = idx('pg_advisory_unlock');
    expect(rollback).toBeGreaterThan(q.lastIndexOf('CLOSE argos_i_full_db_cur'));
    expect(unlock).toBeGreaterThan(rollback);
    expect(q.some((x) => /^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|COMMIT)\b/i.test(x))).toBe(false);
    expect(f.state.released).toEqual([undefined]);
    expect(isFullDbSlotBusy()).toBe(false);
    expect(getFullDbLastRun()).toMatchObject({ outcome: 'done', tables: 2, rows: 2 });
  });

  it('FETCH asks for raw-text types in array row mode', async () => {
    const seen: PgQueryConfig[] = [];
    const src = createPgFullDbSource({
      async query(q) {
        if (typeof q !== 'string') seen.push(q);
        return { rows: [] };
      },
      release() {},
    });
    const reader = await src.openTable({ name: 't', columns: [{ name: 'c', udtName: 'int4', dumpEncoding: 'integer', ordinalPosition: 1, dataType: 'integer', formatType: 'integer', isNullable: true, default: null, isGenerated: false, isIdentity: false, identityGeneration: null }], primaryKey: [], conflictTarget: null, foreignKeys: [], sequences: [], loadByDefault: true, loadByDefaultReason: null });
    expect(await reader.fetch(10)).toBeNull();
    expect(seen[0]).toMatchObject({ text: 'FETCH FORWARD 10 FROM argos_i_full_db_cur', rowMode: 'array' });
    const parsers = (seen[0]!.types as any).getTypeParser;
    expect(parsers(1114, 'text')('2026-10-29 03:12:45.123456')).toBe('2026-10-29 03:12:45.123456'); // timestamp 원문
    expect(parsers(1700, 'text')('1234.50')).toBe('1234.50'); // numeric 원문
    expect(parsers(20, 'text')('9007199254740993')).toBe('9007199254740993'); // int8 원문
    expect(parsers(23, 'text')('42')).toBe(42); // int4 는 기본 파서
  });
});

describe('openFullDbDump: slot and advisory lock', () => {
  it('a second concurrent request is rejected without touching the pool; the slot is free again after completion', async () => {
    const f = makeFake();
    const first = await openFullDbDump();
    expect(first.ok).toBe(true);
    const second = await openFullDbDump();
    expect(second).toEqual({ ok: false, reason: 'in_progress' });
    expect(f.connect).toHaveBeenCalledTimes(1);
    if (first.ok) {
      await drain(first.stream);
      await closed(first.stream);
    }
    expect(isFullDbSlotBusy()).toBe(false);
    makeFake();
    const third = await openFullDbDump();
    expect(third.ok).toBe(true);
    if (third.ok) {
      third.abort();
      await closed(third.stream);
    }
    expect(logs.some((l) => l.includes('event=rejected reason=in_progress'))).toBe(true);
  });

  it('is rejected when the advisory lock is held elsewhere, and releases the connection and slot', async () => {
    const f = makeFake({ lockAvailable: false });
    const r = await openFullDbDump();
    expect(r).toEqual({ ok: false, reason: 'in_progress' });
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.state.released).toEqual([undefined]);
    expect(f.queries.some((x) => x.startsWith('BEGIN'))).toBe(false);
    expect(f.queries.some((x) => x.includes('pg_advisory_unlock'))).toBe(false); // 얻지 못한 락은 풀지 않는다
  });

  it('an unknown or excluded table name yields invalid_tables and rolls everything back', async () => {
    const f = makeFake();
    const r = await openFullDbDump({ tables: ['a', 'users', 'nope'] });
    expect(r).toEqual({ ok: false, reason: 'invalid_tables', unknown: ['users', 'nope'] });
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.queries).toContain('ROLLBACK');
    expect(f.queries.some((x) => x.includes('pg_advisory_unlock'))).toBe(true);
    expect(f.state.released).toEqual([undefined]);
    expect(logs.some((l) => l.includes('event=rejected reason=invalid_tables'))).toBe(true);
  });

  it('a subset only reads the selected tables', async () => {
    const f = makeFake();
    const r = await openFullDbDump({ tables: ['b'] });
    if (!r.ok) throw new Error('expected ok');
    await drain(r.stream);
    await closed(r.stream);
    expect(f.queries.filter((x) => x.startsWith('DECLARE'))).toHaveLength(1);
    expect(f.queries.find((x) => x.startsWith('DECLARE'))).toContain('"public"."b"');
    expect(logs.some((l) => l.includes('event=start selection=subset tables=1'))).toBe(true);
  });
});

describe('openFullDbDump: failure and abort handling', () => {
  it('a failure before the stream starts throws, tears down and discards the connection', async () => {
    const f = makeFake();
    const orig = f.connect.getMockImplementation()!;
    f.connect.mockImplementation(async () => {
      const c = await orig();
      const q = c.query.bind(c);
      c.query = async (text: any, v?: any) => {
        if (typeof text === 'string' && text.includes('information_schema.tables')) throw new Error('catalog exploded');
        return q(text, v);
      };
      return c;
    });
    await expect(openFullDbDump()).rejects.toThrow('catalog exploded');
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.state.released).toEqual([true]);
    expect(f.queries).toContain('ROLLBACK');
    expect(f.queries.some((x) => x.includes('pg_advisory_unlock'))).toBe(true);
  });

  it('a mid-stream database error aborts the stream, logs reason=error without row data, discards the connection and frees the slot', async () => {
    const f = makeFake({ failFetch: true });
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    await expect(drain(r.stream)).rejects.toThrow('boom');
    await closed(r.stream);
    expect(f.state.released).toEqual([true]);
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.queries).toContain('ROLLBACK');
    expect(f.queries.some((x) => x.includes('pg_advisory_unlock'))).toBe(true);
    const line = logs.find((l) => l.includes('event=aborted'))!;
    expect(line).toContain('reason=error');
    expect(line).toContain('table=a');
    expect(line).not.toContain('\n');
    expect(getFullDbLastRun()).toMatchObject({ outcome: 'aborted', reason: 'error' });
  });

  it('a client abort mid-stream closes the cursor, rolls back, unlocks, keeps the connection and logs client_closed', async () => {
    const rows = Array.from({ length: 5000 }, (_, i) => [i, 'x'.repeat(100)]);
    const f = makeFake({ rows });
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    const it = r.stream[Symbol.asyncIterator]();
    await it.next();
    r.abort();
    await closed(r.stream);
    expect(f.queries.filter((x) => x === 'CLOSE argos_i_full_db_cur').length).toBeGreaterThanOrEqual(1);
    expect(f.queries).toContain('ROLLBACK');
    expect(f.queries.some((x) => x.includes('pg_advisory_unlock'))).toBe(true);
    expect(f.state.released).toEqual([undefined]);
    expect(isFullDbSlotBusy()).toBe(false);
    expect(logs.find((l) => l.includes('event=aborted'))).toContain('reason=client_closed');
    expect(logs.some((l) => l.includes('event=done'))).toBe(false);
  });

  it('a stream that is never read is ended by the timeout (reason=timeout) and frees everything', async () => {
    process.env.ARGOS_I_FULL_DB_TIMEOUT_MIN = '5';
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const f = makeFake();
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    const done = closed(r.stream);
    r.stream.on('error', () => undefined);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10);
    vi.useRealTimers();
    await done;
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.queries).toContain('ROLLBACK');
    expect(logs.find((l) => l.includes('event=aborted'))).toContain('reason=timeout');
    expect(getFullDbLastRun()).toMatchObject({ outcome: 'aborted', reason: 'timeout' });
  });

  it('a timeout while the stream is mid-way is reported as reason=timeout (not error), closes the cursor and keeps the connection', async () => {
    process.env.ARGOS_I_FULL_DB_TIMEOUT_MIN = '5';
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const rows = Array.from({ length: 5000 }, (_, i) => [i, 'x'.repeat(100)]);
    const f = makeFake({ rows });
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    r.stream.on('error', () => undefined);
    const it = r.stream[Symbol.asyncIterator]();
    await it.next(); // 제너레이터가 시작되어 첫 테이블을 읽는 중
    const done = closed(r.stream);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10);
    vi.useRealTimers();
    await done;
    expect(isFullDbSlotBusy()).toBe(false);
    const line = logs.find((l) => l.includes('event=aborted'))!;
    expect(line).toContain('reason=timeout');
    expect(line).not.toContain('message=');
    expect(f.queries).toContain('ROLLBACK');
    expect(f.queries.filter((x) => x === 'CLOSE argos_i_full_db_cur').length).toBeGreaterThanOrEqual(1);
    expect(f.state.released).toEqual([undefined]);
    expect(getFullDbLastRun()).toMatchObject({ outcome: 'aborted', reason: 'timeout' });
  });

  it('if ROLLBACK itself fails the connection is discarded', async () => {
    const f = makeFake({ failRollback: true });
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    await drain(r.stream);
    await closed(r.stream);
    expect(f.state.released).toEqual([true]);
  });
});

describe('logs', () => {
  it('use the [ArgosIFullDb] key=value format and never contain the token or row data', async () => {
    makeFake();
    const r = await openFullDbDump();
    if (!r.ok) throw new Error('expected ok');
    await drain(r.stream);
    await closed(r.stream);
    const lines = logs.filter((l) => l.startsWith('[ArgosIFullDb]'));
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const l of lines) expect(l).toMatch(/^\[ArgosIFullDb\] event=\w+/);
    expect(lines[0]).toMatch(/^\[ArgosIFullDb\] event=start selection=all tables=2 batchRows=1000 level=0$/);
    expect(lines.some((l) => /event=table table=a rows=2 jsonlBytes=\d+ durationMs=\d+/.test(l))).toBe(true);
    expect(lines.some((l) => /event=done tables=2 rows=2 jsonlBytes=\d+ zipBytes=\d+ durationMs=\d+ excludedTables=1 excludedColumns=0 nullifiedFk=0/.test(l))).toBe(true);
    const all = logs.join('\n');
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain(SENTINEL_ROW);
    expect(all).not.toMatch(/authorization/i);
  });
});

describe('getFullDbPreview', () => {
  it('uses catalog estimates only, takes no advisory lock or slot, and reports sizes, exclusions and flags', async () => {
    const f = makeFake({ tableStats: [{ table_name: 'a', est_rows: 1000, bytes: 4096 }, { table_name: 'b', est_rows: -1, bytes: 8192 }] });
    const p = await getFullDbPreview();
    expect(p.tables).toEqual([
      { name: 'a', estimatedRows: 1000, rowCountKind: 'estimate', estimatedBytes: 4096, loadByDefault: true },
      { name: 'b', estimatedRows: null, rowCountKind: 'estimate', estimatedBytes: 8192, loadByDefault: true },
    ]);
    expect(p.totals).toEqual({ estimatedRows: 1000, estimatedBytes: 12288 });
    expect(p.excludedTables.map((t) => t.name)).toEqual(['users']);
    expect(p.zip32Risk).toBe(false);
    expect(p.inProgress).toBe(false);
    expect(p.dumpFormatVersion).toBe(1);
    expect(f.queries.some((x) => x.includes('pg_try_advisory_lock'))).toBe(false);
    expect(f.queries.some((x) => x.startsWith('SELECT count(*)'))).toBe(false); // 기본 모드는 count(*) 금지
    expect(f.queries.some((x) => x.startsWith('DECLARE'))).toBe(false);
    expect(isFullDbSlotBusy()).toBe(false);
    expect(f.state.released).toEqual([undefined]);
  });

  it('flags zip32Risk above 3 GiB and inProgress when another process holds the lock', async () => {
    makeFake({ tableStats: [{ table_name: 'a', est_rows: 5, bytes: 3.5 * 1024 ** 3 }], lockHeldElsewhere: true });
    const p = await getFullDbPreview();
    expect(p.zip32Risk).toBe(true);
    expect(p.inProgress).toBe(true);
  });

  it('inProgress is true while a dump holds the slot', async () => {
    makeFake();
    const r = await openFullDbDump();
    makeFake();
    expect((await getFullDbPreview()).inProgress).toBe(true);
    if (r.ok) {
      r.abort();
      await closed(r.stream);
    }
  });

  it('exact=true counts per table with a 10s statement timeout and falls back to the estimate for a failing table', async () => {
    const f = makeFake({ tableStats: [{ table_name: 'a', est_rows: 1, bytes: 1 }, { table_name: 'b', est_rows: 2, bytes: 1 }], failCountOn: 'b' });
    const p = await getFullDbPreview({ exact: true });
    expect(p.tables).toEqual([
      expect.objectContaining({ name: 'a', estimatedRows: 7, rowCountKind: 'exact' }),
      expect.objectContaining({ name: 'b', estimatedRows: 2, rowCountKind: 'estimate' }),
    ]);
    expect(f.queries.filter((x) => x === 'SET LOCAL statement_timeout = 10000')).toHaveLength(2);
    expect(f.queries.filter((x) => x === 'ROLLBACK')).toHaveLength(1);
    expect(f.state.released).toEqual([undefined]);
  });
});
