/**
 * ARGOS_I 요청 저장소 — argos_i_requests / argos_i_request_rejects 접근 계층.
 *
 * 서비스·폴러는 `RequestsStore` 인터페이스만 쓴다. 운영은 PostgreSQL 구현(createPgStore), 단위 테스트는 메모리 구현을 주입한다.
 * 상태 전이는 모두 `status IN (허용 이전 상태)` 조건부 UPDATE(compare-and-set)라 동시 호출에서도 한 번만 성공한다.
 * 거부된 본문·값은 이 계층에 오지 않는다 (거부 통계는 사유 코드별 카운트만).
 */

import { sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dataMigrationService } from './data-migration.service.js';

export const REQUEST_STATUSES = ['queued', 'needs_approval', 'running', 'done', 'failed', 'rejected', 'cancelled', 'unsupported'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const TERMINAL_STATUSES: readonly RequestStatus[] = ['done', 'failed', 'rejected', 'cancelled', 'unsupported'];
/** 대기열 길이에 세는 상태 */
export const OPEN_STATUSES: readonly RequestStatus[] = ['queued', 'needs_approval', 'running'];

export interface RequestRow {
  id: string;
  type: string;
  params: Record<string, unknown>;
  /** 관리자 목록 전용. 어떤 AI 입력·번들·GET 응답에도 쓰지 않는다 */
  note: string | null;
  status: RequestStatus;
  approvalRequired: boolean;
  approvalReason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  result: unknown | null;
  errorCode: string | null;
  attempts: number;
  costUsd: number;
  costProvider: string | null;
  payloadHash: string;
  idempotencyHash: string | null;
  requestedBy: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface NewRequestRow {
  type: string;
  params: Record<string, unknown>;
  note: string | null;
  status: RequestStatus;
  approvalRequired: boolean;
  approvalReason: string | null;
  payloadHash: string;
  idempotencyHash: string | null;
}

export interface TransitionPatch {
  status?: RequestStatus;
  approvalRequired?: boolean;
  approvalReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  result?: unknown | null;
  errorCode?: string | null;
  attempts?: number;
  costUsd?: number;
  costProvider?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

export interface ListOptions {
  status?: readonly RequestStatus[];
  since?: Date;
  limit: number;
}

export interface RetentionResult {
  notesCleared: number;
  requestsDeleted: number;
  rejectsDeleted: number;
  idempotencyCleared: number;
}

export interface RequestsStore {
  /** 멱등 해시 유니크 충돌이면 null */
  insert(row: NewRequestRow): Promise<RequestRow | null>;
  get(id: string): Promise<RequestRow | null>;
  list(opts: ListOptions): Promise<RequestRow[]>;
  findByIdempotency(hash: string): Promise<RequestRow | null>;
  /** createdAt 이 olderThan 보다 오래된 행의 멱등 해시를 비운다 (24시간 후 재사용) */
  expireIdempotency(hash: string, olderThan: Date): Promise<void>;
  rateWindow(since: Date): Promise<{ count: number; oldest: Date | null }>;
  countOpen(): Promise<number>;
  statusCounts(): Promise<Record<string, number>>;
  transition(id: string, from: readonly RequestStatus[], patch: TransitionPatch): Promise<RequestRow | null>;
  /** FIFO 로 queued 를 선점해 running 으로 바꾼다 (FOR UPDATE SKIP LOCKED) */
  claimQueued(limit: number, now: Date): Promise<RequestRow[]>;
  /** running 이고 startedAt < cutoff 인 행을 failed(timeout) 로 */
  recoverStale(cutoff: Date, now: Date): Promise<number>;
  /** needs_approval 이고 createdAt < cutoff 인 행을 rejected(approval_expired) 로 */
  expireApprovals(cutoff: Date, now: Date): Promise<number>;
  /** since 이후 시작된(running/done/failed) 요청의 비용 합과 analyze 건수. excludeId 는 제외 */
  dailyUsage(since: Date, excludeId?: string): Promise<{ costUsd: number; analyzeCount: number }>;
  incrementRejects(day: string, codes: readonly string[]): Promise<void>;
  rejectStats(sinceDay: string): Promise<Array<{ reasonCode: string; count: number }>>;
  retention(now: Date): Promise<RetentionResult>;
  getMarker(key: string): Promise<Record<string, unknown> | null>;
  setMarker(key: string, value: Record<string, unknown>): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL 구현
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

const asDate = (v: unknown): Date | null => (v instanceof Date ? v : typeof v === 'string' ? new Date(v) : null);

export function mapRow(r: Row): RequestRow {
  return {
    id: String(r.id),
    type: String(r.type),
    params: (r.params ?? {}) as Record<string, unknown>,
    note: typeof r.note === 'string' ? r.note : null,
    status: String(r.status) as RequestStatus,
    approvalRequired: r.approval_required === true,
    approvalReason: typeof r.approval_reason === 'string' ? r.approval_reason : null,
    approvedBy: typeof r.approved_by === 'string' ? r.approved_by : null,
    approvedAt: asDate(r.approved_at),
    result: r.result ?? null,
    errorCode: typeof r.error_code === 'string' ? r.error_code : null,
    attempts: Number(r.attempts ?? 0),
    costUsd: Number(r.cost_usd ?? 0),
    costProvider: typeof r.cost_provider === 'string' ? r.cost_provider : null,
    payloadHash: String(r.payload_hash ?? '').trim(),
    idempotencyHash: typeof r.idempotency_hash === 'string' ? r.idempotency_hash.trim() : null,
    requestedBy: String(r.requested_by ?? 'argos-i'),
    createdAt: asDate(r.created_at) ?? new Date(0),
    startedAt: asDate(r.started_at),
    finishedAt: asDate(r.finished_at),
  };
}

const list = (items: readonly string[]): SQL => sql.join(items.map((s) => sql`${s}`), sql`, `);
const KST_OFFSET_MS = 9 * 3_600_000;
const kstDay = (d: Date): string => new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/** 패치 필드 → SET 절 조각 */
function setClauses(patch: TransitionPatch): SQL[] {
  const out: SQL[] = [];
  const add = (col: string, v: unknown, cast = '') => out.push(sql`${sql.raw(col)} = ${v}${sql.raw(cast)}`);
  if (patch.status !== undefined) add('status', patch.status);
  if (patch.approvalRequired !== undefined) add('approval_required', patch.approvalRequired);
  if (patch.approvalReason !== undefined) add('approval_reason', patch.approvalReason);
  if (patch.approvedBy !== undefined) add('approved_by', patch.approvedBy);
  if (patch.approvedAt !== undefined) add('approved_at', patch.approvedAt);
  if (patch.result !== undefined) add('result', patch.result === null ? null : JSON.stringify(patch.result), '::jsonb');
  if (patch.errorCode !== undefined) add('error_code', patch.errorCode);
  if (patch.attempts !== undefined) add('attempts', patch.attempts);
  if (patch.costUsd !== undefined) add('cost_usd', patch.costUsd);
  if (patch.costProvider !== undefined) add('cost_provider', patch.costProvider);
  if (patch.startedAt !== undefined) add('started_at', patch.startedAt);
  if (patch.finishedAt !== undefined) add('finished_at', patch.finishedAt);
  return out;
}

export function createPgStore(): RequestsStore {
  const run = async (q: SQL): Promise<Row[]> => rowsOf(await db.execute(q));
  return {
    async insert(row) {
      try {
        const rows = await run(sql`
          INSERT INTO argos_i_requests (type, params, note, status, approval_required, approval_reason, payload_hash, idempotency_hash)
          VALUES (${row.type}, ${JSON.stringify(row.params)}::jsonb, ${row.note}, ${row.status}, ${row.approvalRequired}, ${row.approvalReason}, ${row.payloadHash}, ${row.idempotencyHash})
          RETURNING *`);
        return rows[0] ? mapRow(rows[0]) : null;
      } catch (err) {
        if (isUniqueViolation(err)) return null;
        throw err;
      }
    },
    async get(id) {
      const rows = await run(sql`SELECT * FROM argos_i_requests WHERE id = ${id}::uuid`);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async list(opts) {
      const conds: SQL[] = [];
      if (opts.status && opts.status.length > 0) conds.push(sql`status IN (${list(opts.status)})`);
      if (opts.since) conds.push(sql`created_at >= ${opts.since}`);
      const where = conds.length > 0 ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
      const rows = await run(sql`SELECT * FROM argos_i_requests ${where} ORDER BY created_at DESC, id DESC LIMIT ${opts.limit}`);
      return rows.map(mapRow);
    },
    async findByIdempotency(hash) {
      const rows = await run(sql`SELECT * FROM argos_i_requests WHERE idempotency_hash = ${hash} LIMIT 1`);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async expireIdempotency(hash, olderThan) {
      await run(sql`UPDATE argos_i_requests SET idempotency_hash = NULL WHERE idempotency_hash = ${hash} AND created_at < ${olderThan}`);
    },
    async rateWindow(since) {
      const rows = await run(sql`SELECT COUNT(*)::int AS n, MIN(created_at) AS oldest FROM argos_i_requests WHERE created_at >= ${since}`);
      return { count: Number(rows[0]?.n ?? 0), oldest: asDate(rows[0]?.oldest) };
    },
    async countOpen() {
      const rows = await run(sql`SELECT COUNT(*)::int AS n FROM argos_i_requests WHERE status IN (${list(OPEN_STATUSES)})`);
      return Number(rows[0]?.n ?? 0);
    },
    async statusCounts() {
      const rows = await run(sql`SELECT status, COUNT(*)::int AS n FROM argos_i_requests GROUP BY status`);
      return Object.fromEntries(rows.map((r) => [String(r.status), Number(r.n)]));
    },
    async transition(id, from, patch) {
      const sets = setClauses(patch);
      if (sets.length === 0) return null;
      const rows = await run(sql`UPDATE argos_i_requests SET ${sql.join(sets, sql`, `)} WHERE id = ${id}::uuid AND status IN (${list(from)}) RETURNING *`);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async claimQueued(limit, now) {
      const rows = await run(sql`
        WITH picked AS (
          SELECT id FROM argos_i_requests WHERE status = 'queued' ORDER BY created_at, id LIMIT ${limit} FOR UPDATE SKIP LOCKED
        )
        UPDATE argos_i_requests r SET status = 'running', started_at = ${now}
        FROM picked WHERE r.id = picked.id
        RETURNING r.*`);
      return rows.map(mapRow).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    },
    async recoverStale(cutoff, now) {
      const rows = await run(sql`UPDATE argos_i_requests SET status = 'failed', error_code = 'timeout', finished_at = ${now} WHERE status = 'running' AND started_at < ${cutoff} RETURNING id`);
      return rows.length;
    },
    async expireApprovals(cutoff, now) {
      const rows = await run(sql`UPDATE argos_i_requests SET status = 'rejected', error_code = 'approval_expired', finished_at = ${now} WHERE status = 'needs_approval' AND created_at < ${cutoff} RETURNING id`);
      return rows.length;
    },
    async dailyUsage(since, excludeId) {
      const excl = excludeId ? sql`AND id <> ${excludeId}::uuid` : sql``;
      const rows = await run(sql`
        SELECT COALESCE(SUM(cost_usd), 0)::float8 AS cost, (COUNT(*) FILTER (WHERE type = 'analyze'))::int AS n
        FROM argos_i_requests WHERE started_at >= ${since} AND status IN ('running','done','failed') ${excl}`);
      return { costUsd: Number(rows[0]?.cost ?? 0), analyzeCount: Number(rows[0]?.n ?? 0) };
    },
    async incrementRejects(day, codes) {
      for (const code of codes) {
        await run(sql`
          INSERT INTO argos_i_request_rejects (day, reason_code, count) VALUES (${day}::date, ${code}, 1)
          ON CONFLICT (day, reason_code) DO UPDATE SET count = argos_i_request_rejects.count + 1`);
      }
    },
    async rejectStats(sinceDay) {
      const rows = await run(sql`SELECT reason_code, SUM(count)::int AS n FROM argos_i_request_rejects WHERE day >= ${sinceDay}::date GROUP BY reason_code ORDER BY n DESC, reason_code`);
      return rows.map((r) => ({ reasonCode: String(r.reason_code), count: Number(r.n) }));
    },
    async retention(now) {
      const terminal = list(TERMINAL_STATUSES);
      const noteCut = new Date(now.getTime() - 7 * 86_400_000);
      const delCut = new Date(now.getTime() - 90 * 86_400_000);
      const idemCut = new Date(now.getTime() - 24 * 3_600_000);
      const notes = await run(sql`UPDATE argos_i_requests SET note = NULL WHERE note IS NOT NULL AND status IN (${terminal}) AND finished_at < ${noteCut} RETURNING id`);
      const idem = await run(sql`UPDATE argos_i_requests SET idempotency_hash = NULL WHERE idempotency_hash IS NOT NULL AND created_at < ${idemCut} RETURNING id`);
      const del = await run(sql`DELETE FROM argos_i_requests WHERE created_at < ${delCut} RETURNING id`);
      const rej = await run(sql`DELETE FROM argos_i_request_rejects WHERE day < ${kstDay(delCut)}::date RETURNING day`);
      return { notesCleared: notes.length, requestsDeleted: del.length, rejectsDeleted: rej.length, idempotencyCleared: idem.length };
    },
    async getMarker(key) {
      return (await dataMigrationService.get(key))?.summary ?? null;
    },
    async setMarker(key, value) {
      await dataMigrationService.upsert(key, value);
    },
  };
}
