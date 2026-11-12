/**
 * ARGOS_I 요청 저장소의 메모리 구현 (테스트 전용). PostgreSQL 구현과 같은 의미(조건부 전이, FIFO 선점, 멱등 유니크)를 가진다.
 */
import {
  OPEN_STATUSES,
  TERMINAL_STATUSES,
  type NewRequestRow,
  type RequestRow,
  type RequestStatus,
  type RequestsStore,
  type TransitionPatch,
} from '../../services/argos-i-requests-store.js';

export interface MemoryStore extends RequestsStore {
  rows: Map<string, RequestRow>;
  markers: Map<string, Record<string, unknown>>;
  rejects: Map<string, number>;
  /** insert 호출 횟수 (거부 시 0 이어야 한다) */
  insertCalls: number;
  clock: { now: Date };
}

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const KST_OFFSET_MS = 9 * 3_600_000;
const kstDay = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

export function createMemoryStore(initialNow: Date = new Date('2026-11-12T03:00:00.000Z')): MemoryStore {
  const clock = { now: initialNow };
  const s: MemoryStore = {
    rows: new Map(),
    markers: new Map(),
    rejects: new Map(),
    insertCalls: 0,
    clock,
    async insert(row: NewRequestRow) {
      s.insertCalls += 1;
      if (row.idempotencyHash && [...s.rows.values()].some((r) => r.idempotencyHash === row.idempotencyHash)) return null;
      const r: RequestRow = {
        id: uuid(),
        type: row.type,
        params: row.params,
        note: row.note,
        status: row.status,
        approvalRequired: row.approvalRequired,
        approvalReason: row.approvalReason,
        approvedBy: null,
        approvedAt: null,
        result: null,
        errorCode: null,
        attempts: 0,
        costUsd: 0,
        costProvider: null,
        payloadHash: row.payloadHash,
        idempotencyHash: row.idempotencyHash,
        requestedBy: 'argos-i',
        createdAt: new Date(clock.now),
        startedAt: null,
        finishedAt: null,
      };
      s.rows.set(r.id, r);
      return { ...r };
    },
    async get(id) {
      const r = s.rows.get(id);
      return r ? { ...r } : null;
    },
    async list(opts) {
      return [...s.rows.values()]
        .filter((r) => (!opts.status || opts.status.length === 0 || opts.status.includes(r.status)) && (!opts.since || r.createdAt >= opts.since))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
        .slice(0, opts.limit)
        .map((r) => ({ ...r }));
    },
    async findByIdempotency(hash) {
      const r = [...s.rows.values()].find((x) => x.idempotencyHash === hash);
      return r ? { ...r } : null;
    },
    async expireIdempotency(hash, olderThan) {
      for (const r of s.rows.values()) if (r.idempotencyHash === hash && r.createdAt < olderThan) r.idempotencyHash = null;
    },
    async rateWindow(since) {
      const inWin = [...s.rows.values()].filter((r) => r.createdAt >= since);
      const oldest = inWin.map((r) => r.createdAt.getTime()).sort((a, b) => a - b)[0];
      return { count: inWin.length, oldest: oldest === undefined ? null : new Date(oldest) };
    },
    async countOpen() {
      return [...s.rows.values()].filter((r) => OPEN_STATUSES.includes(r.status)).length;
    },
    async statusCounts() {
      const out: Record<string, number> = {};
      for (const r of s.rows.values()) out[r.status] = (out[r.status] ?? 0) + 1;
      return out;
    },
    async transition(id, from, patch: TransitionPatch) {
      const r = s.rows.get(id);
      if (!r || !from.includes(r.status)) return null;
      Object.assign(r, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      return { ...r };
    },
    async claimQueued(limit, now) {
      const picked = [...s.rows.values()]
        .filter((r) => r.status === 'queued')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
        .slice(0, limit);
      for (const r of picked) {
        r.status = 'running';
        r.startedAt = now;
      }
      return picked.map((r) => ({ ...r }));
    },
    async recoverStale(cutoff, now) {
      let n = 0;
      for (const r of s.rows.values()) {
        if (r.status === 'running' && r.startedAt && r.startedAt < cutoff) {
          r.status = 'failed';
          r.errorCode = 'timeout';
          r.finishedAt = now;
          n += 1;
        }
      }
      return n;
    },
    async expireApprovals(cutoff, now) {
      let n = 0;
      for (const r of s.rows.values()) {
        if (r.status === 'needs_approval' && r.createdAt < cutoff) {
          r.status = 'rejected';
          r.errorCode = 'approval_expired';
          r.finishedAt = now;
          n += 1;
        }
      }
      return n;
    },
    async dailyUsage(since, excludeId) {
      const rows = [...s.rows.values()].filter((r) => r.startedAt && r.startedAt >= since && ['running', 'done', 'failed'].includes(r.status) && r.id !== excludeId);
      return { costUsd: rows.reduce((a, r) => a + r.costUsd, 0), analyzeCount: rows.filter((r) => r.type === 'analyze').length };
    },
    async incrementRejects(day, codes) {
      for (const c of codes) s.rejects.set(`${day}|${c}`, (s.rejects.get(`${day}|${c}`) ?? 0) + 1);
    },
    async rejectStats(sinceDay) {
      const agg = new Map<string, number>();
      for (const [k, n] of s.rejects) {
        const [day, code] = k.split('|') as [string, string];
        if (day >= sinceDay) agg.set(code, (agg.get(code) ?? 0) + n);
      }
      return [...agg.entries()].map(([reasonCode, count]) => ({ reasonCode, count })).sort((a, b) => b.count - a.count || a.reasonCode.localeCompare(b.reasonCode));
    },
    async retention(now) {
      const noteCut = new Date(now.getTime() - 7 * 86_400_000);
      const delCut = new Date(now.getTime() - 90 * 86_400_000);
      const idemCut = new Date(now.getTime() - 24 * 3_600_000);
      let notesCleared = 0;
      let idempotencyCleared = 0;
      let requestsDeleted = 0;
      for (const r of [...s.rows.values()]) {
        if (r.note !== null && (TERMINAL_STATUSES as readonly RequestStatus[]).includes(r.status) && r.finishedAt && r.finishedAt < noteCut) {
          r.note = null;
          notesCleared += 1;
        }
        if (r.idempotencyHash && r.createdAt < idemCut) {
          r.idempotencyHash = null;
          idempotencyCleared += 1;
        }
        if (r.createdAt < delCut) {
          s.rows.delete(r.id);
          requestsDeleted += 1;
        }
      }
      let rejectsDeleted = 0;
      for (const k of [...s.rejects.keys()]) {
        if (k.split('|')[0]! < kstDay(delCut)) {
          s.rejects.delete(k);
          rejectsDeleted += 1;
        }
      }
      return { notesCleared, requestsDeleted, rejectsDeleted, idempotencyCleared };
    },
    async getMarker(key) {
      return s.markers.get(key) ?? null;
    },
    async setMarker(key, value) {
      s.markers.set(key, value);
    },
  };
  return s;
}
