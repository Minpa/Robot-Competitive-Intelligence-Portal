/**
 * ARGOS_I 초기 적재용 전체 DB 덤프 — 오케스트레이션.
 *
 * 한 번에 한 덤프만: 프로세스 내 슬롯 + 세션 advisory lock(724305).
 * 전용 pg 커넥션 1개에서 REPEATABLE READ READ ONLY 트랜잭션(단일 스냅샷)을 열고, 서버 커서(DECLARE/FETCH)로 테이블을 읽어
 * argos-i-full-db-zip 의 스트림에 공급한다. 덤프는 어디에도 저장하지 않는다(파일시스템·DB 모두).
 *
 * 정리(finally 상당): 커서 CLOSE, ROLLBACK, advisory unlock, client.release (오류 시 release(true)로 풀에서 폐기), 슬롯 반환, 로그.
 * 로그에는 토큰·헤더·행 데이터를 남기지 않는다.
 */

import type { Readable } from 'stream';
import pg from 'pg';
import { pool as appPool } from '../db/index.js';
import {
  FULL_DB_DUMP_FORMAT_VERSION,
  FULL_DB_LOCK_KEY,
  isFullDbEnabled,
  resolveFullDbBatchRows,
  resolveFullDbTimeoutMs,
  resolveFullDbZipLevel,
} from './argos-i-full-db-config.js';
import { buildSelectList, quoteIdent, RAW_TEXT_TYPE_PARSERS } from './argos-i-full-db-rows.js';
import { findLatestDrizzleSql, introspectSchema, planDump, type DumpPlan, type SqlExecutor } from './argos-i-full-db-schema.js';
import { createFullDbZipStream, type FullDbProgressEvent, type FullDbSource } from './argos-i-full-db-zip.js';
import { formatLogLine, type LogFieldValue } from './ops-log.util.js';

const LOG_TAG = 'ArgosIFullDb';
const CURSOR_NAME = 'argos_i_full_db_cur';
/** 3GiB 초과 추정이면 ZIP32(4GiB) 위험으로 표시한다 */
export const ZIP32_RISK_BYTES = 3 * 1024 ** 3;
const EXACT_COUNT_TIMEOUT_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// pg 추상화 (테스트에서 가짜로 교체)
// ─────────────────────────────────────────────────────────────────────────────

export interface PgQueryResult {
  rows: any[];
}
export interface PgQueryConfig {
  text: string;
  values?: unknown[];
  rowMode?: 'array';
  types?: unknown;
}
export interface PgClientLike {
  query(q: string | PgQueryConfig, values?: unknown[]): Promise<PgQueryResult>;
  release(destroy?: boolean | Error): void;
  on?(event: 'error', listener: (err: Error) => void): unknown;
  off?(event: 'error', listener: (err: Error) => void): unknown;
}
export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

let poolProvider: () => PgPoolLike = () => appPool as unknown as PgPoolLike;

/** 테스트 전용 — 풀을 가짜로 교체한다 (인자 없이 부르면 원복) */
export function __setFullDbPoolForTests(p?: PgPoolLike): void {
  poolProvider = p ? () => p : () => appPool as unknown as PgPoolLike;
}

const rawTextTypes = {
  getTypeParser: (oid: number, format?: 'text' | 'binary') => RAW_TEXT_TYPE_PARSERS[oid] ?? pg.types.getTypeParser(oid, format as 'text'),
};

// ─────────────────────────────────────────────────────────────────────────────
// 상태 · 로그
// ─────────────────────────────────────────────────────────────────────────────

let slotBusy = false;

export function isFullDbSlotBusy(): boolean {
  return slotBusy;
}

export function __resetFullDbStateForTests(): void {
  slotBusy = false;
  lastRun = null;
}

export interface FullDbLastRun {
  at: string;
  outcome: 'done' | 'aborted' | 'rejected' | 'failed';
  reason: string | null;
  tables: number;
  rows: number;
  zipBytes: number;
}

let lastRun: FullDbLastRun | null = null;

export function getFullDbLastRun(): FullDbLastRun | null {
  return lastRun;
}

function log(level: 'log' | 'warn' | 'error', fields: Record<string, LogFieldValue>): void {
  console[level](formatLogLine(LOG_TAG, fields));
}

export function logFullDbRejected(reason: 'in_progress' | 'disabled' | 'invalid_tables'): void {
  log('warn', { event: 'rejected', reason });
  lastRun = { at: new Date().toISOString(), outcome: 'rejected', reason, tables: 0, rows: 0, zipBytes: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 커서 소스
// ─────────────────────────────────────────────────────────────────────────────

/** 트랜잭션 안의 한 커넥션에서 DECLARE/FETCH/CLOSE 로 테이블을 읽는다. 트랜잭션 종료는 호출자 몫 */
export function createPgFullDbSource(client: PgClientLike): FullDbSource {
  return {
    async openTable(table) {
      const select = buildSelectList(table.columns);
      await client.query(`DECLARE ${CURSOR_NAME} NO SCROLL CURSOR FOR SELECT ${select} FROM ${quoteIdent('public')}.${quoteIdent(table.name)}`);
      let closed = false;
      return {
        async fetch(maxRows) {
          const n = Math.max(1, Math.trunc(maxRows));
          const res = await client.query({ text: `FETCH FORWARD ${n} FROM ${CURSOR_NAME}`, rowMode: 'array', types: rawTextTypes });
          return res.rows.length > 0 ? (res.rows as unknown[][]) : null;
        },
        async close() {
          if (closed) return;
          closed = true;
          await client.query(`CLOSE ${CURSOR_NAME}`);
        },
      };
    },
    async close() {
      // 트랜잭션·락·커넥션 정리는 openFullDbDump 의 finish 가 한다
    },
  };
}

const execOn =
  (client: PgClientLike): SqlExecutor =>
  async (text, params) =>
    (await client.query(text, params)).rows as Record<string, unknown>[];

// ─────────────────────────────────────────────────────────────────────────────
// 덤프 열기
// ─────────────────────────────────────────────────────────────────────────────

export type OpenDumpResult =
  | { ok: true; stream: Readable; generatedAt: Date; abort: () => void }
  | { ok: false; reason: 'in_progress' }
  | { ok: false; reason: 'invalid_tables'; unknown: string[] };

export interface OpenDumpOptions {
  tables?: string[];
}

function oneLine(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').trim().slice(0, 500);
}

/**
 * 슬롯·락·스냅샷을 잡고 ZIP 스트림을 돌려준다. 스트림이 끝나거나 닫히면(정상·중단·오류) 모든 자원을 정리한다.
 * 스트림 시작 전 실패는 throw 한다(라우트가 500 full_db_failed 로 응답). 정리는 이미 끝난 상태다.
 */
export async function openFullDbDump(options: OpenDumpOptions = {}): Promise<OpenDumpResult> {
  if (slotBusy) {
    logFullDbRejected('in_progress');
    return { ok: false, reason: 'in_progress' };
  }
  slotBusy = true;

  let client: PgClientLike | null = null;
  let lockHeld = false;
  let txOpen = false;
  let cleaned: Promise<void> | null = null;
  let destroyClient = false;
  let timer: NodeJS.Timeout | null = null;
  // 대여 중인 커넥션의 'error' 는 풀이 처리하지 않는다 — 처리하지 않으면 프로세스가 죽는다. 이후 쿼리 실패로 드러난다
  const onClientError = (err: Error) => log('warn', { event: 'client_error', message: oneLine(err) });

  const cleanup = (failed: boolean): Promise<void> => {
    if (cleaned) return cleaned;
    cleaned = (async () => {
      if (timer) clearTimeout(timer);
      if (client) {
        if (txOpen) {
          try {
            await client.query('ROLLBACK');
          } catch {
            destroyClient = true;
          }
        }
        if (lockHeld) {
          try {
            await client.query('SELECT pg_advisory_unlock($1)', [FULL_DB_LOCK_KEY]);
          } catch {
            destroyClient = true;
          }
        }
        client.off?.('error', onClientError);
        // 오류로 끝난 커넥션은 풀에서 폐기한다 (연결 종료 시 락·트랜잭션도 사라진다)
        client.release(failed || destroyClient ? true : undefined);
      }
      slotBusy = false;
    })();
    return cleaned;
  };

  try {
    client = await poolProvider().connect();
    client.on?.('error', onClientError);
    const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [FULL_DB_LOCK_KEY]);
    if (lockRes.rows[0]?.locked !== true) {
      await cleanup(false);
      logFullDbRejected('in_progress');
      return { ok: false, reason: 'in_progress' };
    }
    lockHeld = true;

    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    txOpen = true;
    await client.query('SET LOCAL statement_timeout = 0');
    await client.query('SET LOCAL idle_in_transaction_session_timeout = 0');
    await client.query("SET LOCAL TimeZone = 'UTC'");

    const snap = await client.query('SELECT (extract(epoch FROM now()) * 1000)::bigint::text AS ms');
    const generatedAt = new Date(Number(snap.rows[0]?.ms ?? Date.now()));
    const plan: DumpPlan = planDump(await introspectSchema(execOn(client)));

    let selected = plan.loadOrder;
    if (options.tables && options.tables.length > 0) {
      const known = new Set(plan.loadOrder);
      const unknown = [...new Set(options.tables)].filter((t) => !known.has(t));
      if (unknown.length > 0) {
        await cleanup(false);
        logFullDbRejected('invalid_tables');
        return { ok: false, reason: 'invalid_tables', unknown };
      }
      const wanted = new Set(options.tables);
      selected = plan.loadOrder.filter((t) => wanted.has(t));
    }

    const batchRows = resolveFullDbBatchRows();
    const level = resolveFullDbZipLevel();
    const timeoutMs = resolveFullDbTimeoutMs();
    const subset = selected.length !== plan.loadOrder.length;
    const commit = (process.env.RAILWAY_GIT_COMMIT_SHA ?? '').slice(0, 7) || null;

    let timedOut = false;
    let finalEvent = null as FullDbProgressEvent | null;
    const startedAt = Date.now();
    // 타임아웃은 destroy(err) 로 끝내므로 제너레이터에는 오류(throw)로 보인다 → 중단 사유는 타임아웃 플래그로 바로잡는다
    const abortReason = (r: 'zip32_limit' | 'error' | 'closed'): string => (timedOut ? 'timeout' : r === 'closed' ? 'client_closed' : r);

    const stream = createFullDbZipStream({
      source: createPgFullDbSource(client),
      plan,
      ctx: { generatedAt, selectedTables: selected, commit, latestDrizzleSql: findLatestDrizzleSql() },
      level,
      batchRows,
      onProgress: (e) => {
        if (e.event === 'table') {
          log('log', { event: 'table', table: e.table, rows: e.rows, jsonlBytes: e.jsonlBytes, durationMs: e.durationMs });
        } else if (e.event === 'done') {
          finalEvent = e;
          log('log', {
            event: 'done',
            tables: e.tables,
            rows: e.rows,
            jsonlBytes: e.jsonlBytes,
            zipBytes: e.zipBytes,
            durationMs: e.durationMs,
            excludedTables: plan.excludedTables.length,
            excludedColumns: plan.excludedColumns.length,
            nullifiedFk: plan.nullifiedFkColumns.length,
          });
        } else {
          finalEvent = e;
          const reason = abortReason(e.reason);
          log('warn', { event: 'aborted', reason, table: e.table, rows: e.rows, durationMs: e.durationMs, message: reason === 'error' ? e.message : undefined });
        }
      },
    });

    // destroy(err) 가 처리되지 않은 'error' 이벤트로 프로세스를 죽이지 않게 한다 (Fastify 도 별도로 처리한다)
    stream.on('error', () => undefined);
    stream.once('close', () => {
      const ev = finalEvent;
      const hadError = !!ev && ev.event === 'aborted' && ev.reason !== 'closed' && !timedOut;
      if (!ev) {
        // 제너레이터가 시작도 하기 전에 닫힌 경우
        log('warn', { event: 'aborted', reason: timedOut ? 'timeout' : 'client_closed', table: null, rows: 0, durationMs: Date.now() - startedAt });
      }
      lastRun =
        ev && ev.event === 'done'
          ? { at: new Date().toISOString(), outcome: 'done', reason: null, tables: ev.tables, rows: ev.rows, zipBytes: ev.zipBytes }
          : {
              at: new Date().toISOString(),
              outcome: 'aborted',
              reason: abortReason(ev && ev.event === 'aborted' ? ev.reason : 'closed'),
              tables: 0,
              rows: ev && ev.event === 'aborted' ? ev.rows : 0,
              zipBytes: 0,
            };
      void cleanup(hadError);
    });

    timer = setTimeout(() => {
      timedOut = true;
      stream.destroy(new Error('full_db_timeout'));
    }, timeoutMs);
    timer.unref?.();

    log('log', { event: 'start', selection: subset ? 'subset' : 'all', tables: selected.length, batchRows, level });
    return { ok: true, stream, generatedAt, abort: () => stream.destroy() };
  } catch (err) {
    log('error', { event: 'failed', stage: 'open', message: oneLine(err) });
    lastRun = { at: new Date().toISOString(), outcome: 'failed', reason: 'open_failed', tables: 0, rows: 0, zipBytes: 0 };
    await cleanup(true);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 미리보기 (full-db/manifest)
// ─────────────────────────────────────────────────────────────────────────────

export interface FullDbPreview {
  enabled: boolean;
  dumpFormatVersion: number;
  serverTime: string;
  selection: { supported: true; param: 'tables'; note: string };
  hint: string;
  tables: { name: string; estimatedRows: number | null; rowCountKind: 'estimate' | 'exact'; estimatedBytes: number | null; loadByDefault: boolean }[];
  excludedTables: DumpPlan['excludedTables'];
  excludedColumns: DumpPlan['excludedColumns'];
  allowlistedColumns: DumpPlan['allowlistedColumns'];
  nullifiedFkColumns: DumpPlan['nullifiedFkColumns'];
  scrubbedJsonColumns: DumpPlan['scrubbedColumns'];
  totals: { estimatedRows: number; estimatedBytes: number };
  zip32Risk: boolean;
  inProgress: boolean;
}

const SQL_TABLE_STATS = `
SELECT c.relname AS table_name, c.reltuples::float8 AS est_rows, pg_catalog.pg_table_size(c.oid)::float8 AS bytes
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`;

const SQL_LOCK_HELD = `
SELECT EXISTS (
  SELECT 1 FROM pg_catalog.pg_locks
  WHERE locktype = 'advisory' AND classid = 0 AND objid = $1::oid AND objsubid = 1 AND granted
    AND database = (SELECT oid FROM pg_catalog.pg_database WHERE datname = current_database())
) AS held`;

/**
 * 덤프를 만들지 않는다. 슬롯·advisory lock 을 쓰지 않고 읽기 전용 카탈로그 조회만 한다.
 * 기본은 reltuples 추정 + pg_table_size(heap+TOAST). exact 이면 테이블당 count(*) (statement_timeout 10초, 실패 시 추정값).
 */
export async function getFullDbPreview(opts: { exact?: boolean } = {}): Promise<FullDbPreview> {
  const client = await poolProvider().connect();
  let destroy = false;
  const onClientError = (err: Error) => log('warn', { event: 'client_error', message: oneLine(err) });
  client.on?.('error', onClientError);
  try {
    const exec = execOn(client);
    const plan = planDump(await introspectSchema(exec));
    const stats = new Map<string, { rows: number | null; bytes: number | null }>();
    for (const r of await exec(SQL_TABLE_STATS)) {
      const est = Number(r.est_rows);
      stats.set(String(r.table_name), { rows: Number.isFinite(est) && est >= 0 ? Math.round(est) : null, bytes: Number.isFinite(Number(r.bytes)) ? Number(r.bytes) : null });
    }

    const kinds = new Map<string, 'estimate' | 'exact'>();
    if (opts.exact) {
      for (const t of plan.tables) {
        try {
          await client.query('BEGIN READ ONLY');
          await client.query(`SET LOCAL statement_timeout = ${EXACT_COUNT_TIMEOUT_MS}`);
          const res = await client.query(`SELECT count(*)::text AS n FROM ${quoteIdent('public')}.${quoteIdent(t.name)}`);
          await client.query('COMMIT');
          const s = stats.get(t.name) ?? { rows: null, bytes: null };
          stats.set(t.name, { ...s, rows: Number(res.rows[0]?.n) });
          kinds.set(t.name, 'exact');
        } catch {
          await client.query('ROLLBACK').catch(() => {
            destroy = true;
          });
        }
      }
    }

    let heldElsewhere = false;
    try {
      heldElsewhere = (await client.query(SQL_LOCK_HELD, [FULL_DB_LOCK_KEY])).rows[0]?.held === true;
    } catch {
      heldElsewhere = false;
    }

    const tables = plan.tables.map((t) => {
      const s = stats.get(t.name) ?? { rows: null, bytes: null };
      return { name: t.name, estimatedRows: s.rows, rowCountKind: kinds.get(t.name) ?? ('estimate' as const), estimatedBytes: s.bytes, loadByDefault: t.loadByDefault };
    });
    const totals = {
      estimatedRows: tables.reduce((n, t) => n + (t.estimatedRows ?? 0), 0),
      estimatedBytes: tables.reduce((n, t) => n + (t.estimatedBytes ?? 0), 0),
    };
    return {
      enabled: isFullDbEnabled(),
      dumpFormatVersion: FULL_DB_DUMP_FORMAT_VERSION,
      serverTime: new Date().toISOString(),
      selection: { supported: true, param: 'tables', note: '`full-db.zip?tables=a,b` 로 일부 테이블만 받을 수 있다 (순서는 항상 loadOrder)' },
      hint: '덤프는 GET /api/argos-i/export/full-db.zip 이며 1회성 초기 적재용이다. 크기는 추정치이고 압축 전 기준이다.',
      tables,
      excludedTables: plan.excludedTables,
      excludedColumns: plan.excludedColumns,
      allowlistedColumns: plan.allowlistedColumns,
      nullifiedFkColumns: plan.nullifiedFkColumns,
      scrubbedJsonColumns: plan.scrubbedColumns,
      totals,
      zip32Risk: totals.estimatedBytes > ZIP32_RISK_BYTES,
      inProgress: slotBusy || heldElsewhere,
    };
  } finally {
    client.off?.('error', onClientError);
    client.release(destroy ? true : undefined);
  }
}
