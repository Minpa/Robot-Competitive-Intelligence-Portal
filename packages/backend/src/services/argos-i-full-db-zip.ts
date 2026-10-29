/**
 * ARGOS_I 전체 DB 덤프 — 스트리밍 ZIP 조립.
 *
 * DB 와 무관하다: 행은 주입받은 FullDbSource 에서 가져온다. fflate 의 Zip 스트림에 엔트리를 하나씩 열어 쓰고
 * (한 번에 한 엔트리만 열림), 출력 청크는 소비자가 가져갈 때만 다음 배치를 진행하도록 async 제너레이터로 내보낸다(역압).
 * 파일시스템에 쓰지 않는다.
 *
 * 엔트리 순서: README.md, schema.json, tables/<table>.jsonl (loadOrder), manifest.json (마지막).
 * manifest.json 이 없는 ZIP 은 중단된 불완전 덤프다.
 *
 * fflate 는 ZIP64 를 쓰지 못한다 → 엔트리 하나가 4GiB-1MiB, 전체가 4GiB-16MiB 를 넘으면 스트림을 오류로 끝낸다(zip32_limit).
 */

import { createHash } from 'crypto';
import { Readable } from 'stream';
import { Zip, ZipDeflate, ZipPassThrough, type DeflateOptions } from 'fflate';
import {
  FULL_DB_BATCH_TARGET_BYTES,
  FULL_DB_DUMP_FORMAT_VERSION,
  FULL_DB_MIN_FETCH_ROWS,
  FULL_DB_STREAM_HWM,
  FULL_DB_ZIP_ROOT,
} from './argos-i-full-db-config.js';
import { buildFullDbReadme } from './argos-i-full-db-readme.js';
import { buildSchemaJson, computeSchemaFingerprint, type DumpPlan, type PlannedTable } from './argos-i-full-db-schema.js';
import { encodeJsonlLine, serializeRow } from './argos-i-full-db-rows.js';

export const ZIP32_ENTRY_LIMIT = 4 * 1024 ** 3 - 1024 ** 2;
export const ZIP32_TOTAL_LIMIT = 4 * 1024 ** 3 - 16 * 1024 ** 2;
const INITIAL_FETCH_ROWS = 100;

/** 테이블 하나를 읽는 커서. fetch 는 끝에서 null(또는 빈 배열)을 돌려준다 */
export interface FullDbTableReader {
  fetch(maxRows: number): Promise<unknown[][] | null>;
  close(): Promise<void>;
}

export interface FullDbSource {
  openTable(table: PlannedTable): Promise<FullDbTableReader>;
  /** 정상 종료·중단·오류 어느 경우에도 한 번 호출된다 */
  close(): Promise<void>;
}

export interface FullDbZipLimits {
  entryBytes?: number;
  totalBytes?: number;
}

export type FullDbProgressEvent =
  | { event: 'table'; table: string; rows: number; jsonlBytes: number; durationMs: number }
  | { event: 'done'; tables: number; rows: number; jsonlBytes: number; zipBytes: number; durationMs: number }
  | { event: 'aborted'; reason: 'zip32_limit' | 'error' | 'closed'; message?: string; table: string | null; rows: number; durationMs: number };

export interface FullDbZipContext {
  generatedAt: Date;
  /** 담을 테이블 이름 (plan.loadOrder 의 부분집합). 순서는 항상 plan.loadOrder 를 따른다 */
  selectedTables: readonly string[];
  commit: string | null;
  latestDrizzleSql: string | null;
}

export interface CreateFullDbZipOptions {
  source: FullDbSource;
  plan: DumpPlan;
  ctx: FullDbZipContext;
  /** deflate 레벨, 0 이면 무압축 */
  level: number;
  /** 커서 한 번에 가져오는 최대 행 수 */
  batchRows: number;
  limits?: FullDbZipLimits;
  onProgress?: (e: FullDbProgressEvent) => void;
}

export class ZipLimitError extends Error {
  readonly reason = 'zip32_limit';
  constructor(what: 'entry' | 'total') {
    super(`zip32_limit:${what}`);
  }
}

export function formatDumpTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function dumpFolder(generatedAt: Date): string {
  return `${FULL_DB_ZIP_ROOT}/${formatDumpTimestamp(generatedAt)}`;
}

const sha256Hex = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');

function oneLineMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/\s+/g, ' ').trim().slice(0, 500);
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

interface TableResult {
  name: string;
  path: string;
  rows: number;
  jsonlBytes: number;
  sha256: string;
  loadByDefault: boolean;
  loadOrderIndex: number;
}

export function createFullDbZipStream(opts: CreateFullDbZipOptions): Readable {
  const { source, plan, ctx, level, batchRows, onProgress } = opts;
  const entryLimit = opts.limits?.entryBytes ?? ZIP32_ENTRY_LIMIT;
  const totalLimit = opts.limits?.totalBytes ?? ZIP32_TOTAL_LIMIT;
  const folder = dumpFolder(ctx.generatedAt);
  const mtime = ctx.generatedAt.getTime();
  const startedAt = Date.now();
  const selected = new Set(ctx.selectedTables);
  const tables = plan.tables.filter((t) => selected.has(t.name));
  const subset = tables.length !== plan.tables.length;

  let sourceClosed: Promise<void> | null = null;
  const closeSourceOnce = (): Promise<void> => {
    if (!sourceClosed) sourceClosed = source.close().catch(() => undefined);
    return sourceClosed;
  };

  async function* generate(): AsyncGenerator<Buffer, void, void> {
    const queue: Uint8Array[] = [];
    let zipError: Error | null = null;
    let zipBytes = 0;
    let completed = false;
    let abortedReported = false;
    let currentTable: string | null = null;
    let totalRows = 0;
    let totalJsonlBytes = 0;
    let openReader: FullDbTableReader | null = null;

    const zip = new Zip((err, chunk) => {
      if (err) zipError = err;
      else queue.push(chunk);
    });

    async function* drain(): AsyncGenerator<Buffer, void, void> {
      while (queue.length > 0) {
        const c = queue.shift()!;
        zipBytes += c.length;
        if (zipBytes > totalLimit) throw new ZipLimitError('total');
        yield Buffer.from(c.buffer, c.byteOffset, c.byteLength);
      }
      if (zipError) throw zipError;
    }

    const openEntry = (name: string) => {
      const file = level === 0 ? new ZipPassThrough(name) : new ZipDeflate(name, { level: level as DeflateOptions['level'] });
      file.mtime = mtime;
      zip.add(file);
      return file;
    };

    async function* writeWhole(name: string, content: Buffer): AsyncGenerator<Buffer, void, void> {
      if (content.length > entryLimit) throw new ZipLimitError('entry');
      const file = openEntry(`${folder}/${name}`);
      file.push(content, true);
      yield* drain();
    }

    const scrubbedCounts = new Map<string, number>();
    const results: TableResult[] = [];

    try {
      const readme = Buffer.from(buildFullDbReadme({ generatedAt: ctx.generatedAt, selection: subset ? 'subset' : 'all', tableCount: tables.length }), 'utf-8');
      const schemaJson = Buffer.from(JSON.stringify(buildSchemaJson(plan, { generatedAt: ctx.generatedAt })), 'utf-8');
      yield* writeWhole('README.md', readme);
      yield* writeWhole('schema.json', schemaJson);

      for (const table of tables) {
        currentTable = table.name;
        const tableStart = Date.now();
        const hash = createHash('sha256');
        let rows = 0;
        let bytes = 0;
        const file = openEntry(`${folder}/tables/${table.name}.jsonl`);
        const reader = await source.openTable(table);
        openReader = reader;
        let fetchRows = Math.min(batchRows, INITIAL_FETCH_ROWS);
        for (;;) {
          const batch = await reader.fetch(fetchRows);
          if (!batch || batch.length === 0) break;
          const lines: string[] = new Array(batch.length);
          for (let i = 0; i < batch.length; i++) {
            const { object, scrubbed } = serializeRow(table.columns, batch[i]!);
            lines[i] = encodeJsonlLine(object);
            for (const [col, n] of Object.entries(scrubbed)) {
              const key = `${table.name}\0${col}`;
              scrubbedCounts.set(key, (scrubbedCounts.get(key) ?? 0) + n);
            }
          }
          const buf = Buffer.from(lines.join(''), 'utf-8');
          rows += batch.length;
          bytes += buf.length;
          if (bytes > entryLimit) throw new ZipLimitError('entry');
          hash.update(buf);
          file.push(buf, false);
          yield* drain();
          // 평균 행 크기로 다음 배치 크기를 맞춘다 (바이트 목표와 행 수 상한 중 작은 쪽, 최소 50행)
          const avg = Math.max(1, bytes / rows);
          fetchRows = Math.min(batchRows, Math.max(Math.min(FULL_DB_MIN_FETCH_ROWS, batchRows), Math.floor(FULL_DB_BATCH_TARGET_BYTES / avg)));
          await yieldToEventLoop();
        }
        file.push(new Uint8Array(0), true);
        yield* drain();
        await reader.close();
        openReader = null;
        totalRows += rows;
        totalJsonlBytes += bytes;
        results.push({
          name: table.name,
          path: `tables/${table.name}.jsonl`,
          rows,
          jsonlBytes: bytes,
          sha256: hash.digest('hex'),
          loadByDefault: table.loadByDefault,
          loadOrderIndex: plan.loadOrder.indexOf(table.name),
        });
        onProgress?.({ event: 'table', table: table.name, rows, jsonlBytes: bytes, durationMs: Date.now() - tableStart });
      }
      currentTable = null;

      const manifest = {
        dumpFormatVersion: FULL_DB_DUMP_FORMAT_VERSION,
        generatedAt: ctx.generatedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        snapshot: { isolation: 'repeatable read', note: '모든 테이블이 같은 스냅샷' },
        selection: subset ? 'subset' : 'all',
        selectedTables: tables.map((t) => t.name),
        generator: { name: 'argos', commit: ctx.commit },
        schemaHint: {
          schemaFingerprintSha256: computeSchemaFingerprint(plan),
          tableCount: plan.tables.length,
          columnCount: plan.tables.reduce((n, t) => n + t.columns.length, 0),
          latestDrizzleSql: ctx.latestDrizzleSql,
          gitCommit: ctx.commit,
        },
        tables: results.map((r) => ({ name: r.name, path: r.path, rows: r.rows, jsonlBytes: r.jsonlBytes, sha256: r.sha256, loadByDefault: r.loadByDefault, loadOrderIndex: r.loadOrderIndex })),
        excludedTables: plan.excludedTables,
        excludedColumns: plan.excludedColumns,
        allowlistedColumns: plan.allowlistedColumns,
        nullifiedFkColumns: plan.nullifiedFkColumns,
        scrubbedJsonKeys: plan.scrubbedColumns
          .filter((s) => selected.has(s.table))
          .map((s) => ({ table: s.table, column: s.column, removedKeyCount: scrubbedCounts.get(`${s.table}\0${s.column}`) ?? 0 })),
        textFallbackColumns: plan.textFallbackColumns,
        totals: { tableCount: results.length, rows: totalRows, jsonlBytes: totalJsonlBytes },
        files: { 'README.md': sha256Hex(readme), 'schema.json': sha256Hex(schemaJson) },
      };
      yield* writeWhole('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'));

      zip.end();
      yield* drain();
      completed = true;
      onProgress?.({ event: 'done', tables: results.length, rows: totalRows, jsonlBytes: totalJsonlBytes, zipBytes, durationMs: Date.now() - startedAt });
    } catch (err) {
      abortedReported = true;
      onProgress?.({
        event: 'aborted',
        reason: err instanceof ZipLimitError ? 'zip32_limit' : 'error',
        ...(err instanceof ZipLimitError ? {} : { message: oneLineMessage(err) }),
        table: currentTable,
        rows: totalRows,
        durationMs: Date.now() - startedAt,
      });
      throw err;
    } finally {
      if (!completed && !abortedReported) {
        // 소비자가 스트림을 닫았다 (클라이언트 중단 · 타임아웃 destroy)
        onProgress?.({ event: 'aborted', reason: 'closed', table: currentTable, rows: totalRows, durationMs: Date.now() - startedAt });
      }
      if (openReader) await (openReader as FullDbTableReader).close().catch(() => undefined);
      await closeSourceOnce();
    }
  }

  const stream = Readable.from(generate(), { objectMode: false, highWaterMark: FULL_DB_STREAM_HWM });
  // 제너레이터가 한 번도 시작하지 못한 채 destroy 되면 finally 가 실행되지 않으므로 여기서도 닫는다
  stream.once('close', () => void closeSourceOnce());
  return stream;
}
