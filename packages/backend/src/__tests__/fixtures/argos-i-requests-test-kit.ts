/**
 * 요청 폴러·예산·승인 테스트 공용 도구 (가짜 처리기, 메모리 저장소, 시계 제어)
 */
import { vi } from 'vitest';
import type { ProcessorDeps } from '../../services/argos-i-requests-processor.js';
import type { HandlerOutcome, RequestHandler } from '../../services/argos-i-requests-handlers/types.js';
import type { NewRequestRow, RequestRow, RequestStatus } from '../../services/argos-i-requests-store.js';
import { createMemoryStore, type MemoryStore } from './argos-i-requests-memory-store.js';

export interface Kit {
  store: MemoryStore;
  deps: ProcessorDeps;
  logs: string[];
  handlers: { analyze: ReturnType<typeof fakeHandler>; add_source: ReturnType<typeof fakeHandler>; query: ReturnType<typeof fakeHandler> };
  claude: { limitUsd: number; usedUsd: number };
  advance(ms: number): void;
}

export function fakeHandler(opts: { outcome?: HandlerOutcome | (() => HandlerOutcome | Promise<HandlerOutcome>); estimate?: { costUsd: number; provider: 'claude' | 'gemini' | null; claude: boolean } } = {}) {
  const run = vi.fn(async () => {
    const o = opts.outcome ?? { ok: true as const, result: { ok: 1 }, costUsd: 0, provider: null };
    return typeof o === 'function' ? o() : o;
  });
  const estimate = vi.fn(async () => opts.estimate ?? { costUsd: 0, provider: null, claude: false });
  return { run, estimate } satisfies RequestHandler;
}

export function makeKit(over: { env?: Record<string, string | undefined>; now?: Date } = {}): Kit {
  const store = createMemoryStore(over.now ?? new Date('2026-11-12T03:00:00.000Z'));
  const logs: string[] = [];
  const claude = { limitUsd: 50, usedUsd: 10 };
  const handlers = { analyze: fakeHandler(), add_source: fakeHandler(), query: fakeHandler() };
  const deps: ProcessorDeps = {
    store,
    now: () => store.clock.now,
    env: { ARGOS_I_REQUESTS_ENABLED: 'true', ...(over.env ?? {}) },
    handlers,
    getClaudeMonth: async () => ({ ...claude }),
    lock: async (fn) => fn(),
    log: (l) => logs.push(l),
    inlineTimeoutMs: 30,
  };
  return { store, deps, logs, handlers, claude, advance: (ms) => (store.clock.now = new Date(store.clock.now.getTime() + ms)) };
}

export async function seed(kit: Kit, over: Partial<NewRequestRow> & { startedAt?: Date | null; finishedAt?: Date | null; approvedAt?: Date | null; costUsd?: number; attempts?: number; errorCode?: string | null; createdAt?: Date } = {}): Promise<RequestRow> {
  const { startedAt, finishedAt, approvedAt, costUsd, attempts, errorCode, createdAt, ...row } = over;
  const saveNow = kit.store.clock.now;
  if (createdAt) kit.store.clock.now = createdAt;
  const r = (await kit.store.insert({
    type: 'analyze',
    params: { target: 'robot', slug: 'figure-02' },
    note: null,
    status: 'queued' as RequestStatus,
    approvalRequired: false,
    approvalReason: null,
    payloadHash: `hash-${Math.random()}`,
    idempotencyHash: null,
    ...row,
  }))!;
  kit.store.clock.now = saveNow;
  const live = kit.store.rows.get(r.id)!;
  Object.assign(live, {
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(finishedAt !== undefined ? { finishedAt } : {}),
    ...(approvedAt !== undefined ? { approvedAt } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(attempts !== undefined ? { attempts } : {}),
    ...(errorCode !== undefined ? { errorCode } : {}),
  });
  return { ...live };
}

export const row = (kit: Kit, id: string): RequestRow => kit.store.rows.get(id)!;
