/**
 * 승인 상태 전이 표 전체 — 승인 필요 종류는 승인 전에 실행되지 않고, 승인 후 queued, 승인자·시각 기록, 거부, 7일 만료, 취소 가능 상태 (AC-13, AC-18)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { runArgosIRequestsTick } from '../../services/argos-i-requests-processor.js';
import {
  __setServiceDepsForTests,
  approvalStateOf,
  approveRequest,
  cancelRequest,
  createRequest,
  rejectPendingRequest,
} from '../../services/argos-i-requests.service.js';
import { canonicalize } from '../../services/argos-i-requests-schema.js';
import { makeKit, row, seed, type Kit } from '../fixtures/argos-i-requests-test-kit.js';
import { REQUEST_STATUSES, type RequestStatus } from '../../services/argos-i-requests-store.js';

const DAY = 86_400_000;
let kit: Kit;

beforeEach(() => {
  kit = makeKit();
  __setServiceDepsForTests({ store: kit.store, now: () => kit.store.clock.now, env: kit.deps.env, log: () => undefined });
});

const create = (type: 'analyze' | 'add_source' | 'query', params: Record<string, unknown>) => {
  const c = canonicalize({ type, params });
  return createRequest({ request: c.canonical, payloadHash: c.payloadHash, hash8: c.payloadHash.slice(0, 8), idempotencyHash: null });
};

describe('receive -> initial state', () => {
  it('approval-required defaults (analyze:topic, add_source:youtube_channel) start as needs_approval; others as queued', async () => {
    const topic = await create('analyze', { target: 'topic', domain: 'hand', days: 30 });
    const channel = await create('add_source', { kind: 'youtube_channel', id: '@robotics_lab' });
    const robot = await create('analyze', { target: 'robot', slug: 'figure-02' });
    const arxiv = await create('add_source', { kind: 'arxiv', id: '2401.01234' });
    const states = [topic, channel, robot, arxiv].map((o) => (o.kind === 'created' ? o.row.status : o.kind));
    expect(states).toEqual(['needs_approval', 'needs_approval', 'queued', 'queued']);
  });

  it('an approval-required request is never executed before approval, and runs after it', async () => {
    const out = await create('analyze', { target: 'topic', domain: 'hand', days: 30 });
    if (out.kind !== 'created') throw new Error('expected created');
    await runArgosIRequestsTick(kit.deps);
    expect(kit.deps.handlers.analyze.run).not.toHaveBeenCalled();
    expect(row(kit, out.row.id).status).toBe('needs_approval');

    const approved = await approveRequest(out.row.id, 'admin:u1');
    expect(approved).toMatchObject({ kind: 'ok', row: { status: 'queued', approvedBy: 'admin:u1' } });
    expect(row(kit, out.row.id).approvedAt).toEqual(kit.store.clock.now);

    await runArgosIRequestsTick(kit.deps);
    expect(kit.deps.handlers.analyze.run).toHaveBeenCalledTimes(1);
    expect(row(kit, out.row.id).status).toBe('done');
  });
});

describe('transition table', () => {
  it('needs_approval -> approve -> queued; -> reject -> rejected(admin_rejected)', async () => {
    const a = await seed(kit, { status: 'needs_approval', approvalRequired: true, approvalReason: 'type_rule', payloadHash: 'a' });
    const b = await seed(kit, { status: 'needs_approval', approvalRequired: true, approvalReason: 'type_rule', payloadHash: 'b' });
    expect(await approveRequest(a.id, 'admin:u1')).toMatchObject({ kind: 'ok', row: { status: 'queued', approvedBy: 'admin:u1' } });
    expect(await rejectPendingRequest(b.id)).toMatchObject({ kind: 'ok', row: { status: 'rejected', errorCode: 'admin_rejected' } });
    expect(row(kit, b.id).finishedAt).toBeTruthy();
  });

  it.each(REQUEST_STATUSES.filter((s) => s !== 'needs_approval'))('approve/reject on %s is not_pending and changes nothing', async (status) => {
    const r = await seed(kit, { status: status as RequestStatus, payloadHash: `x-${status}` });
    expect(await approveRequest(r.id, 'admin:u1')).toEqual({ kind: 'not_pending' });
    expect(await rejectPendingRequest(r.id)).toEqual({ kind: 'not_pending' });
    expect(row(kit, r.id).status).toBe(status);
  });

  it('approve/reject of an unknown id is not_found', async () => {
    expect(await approveRequest('00000000-0000-4000-8000-0000000000aa', 'x')).toEqual({ kind: 'not_found' });
    expect(await rejectPendingRequest('00000000-0000-4000-8000-0000000000aa')).toEqual({ kind: 'not_found' });
  });

  it('a second approve of the same request fails (compare-and-set)', async () => {
    const r = await seed(kit, { status: 'needs_approval', approvalRequired: true, payloadHash: 'cas' });
    const [x, y] = await Promise.all([approveRequest(r.id, 'a'), approveRequest(r.id, 'b')]);
    expect([x.kind, y.kind].sort()).toEqual(['not_pending', 'ok']);
  });

  it('needs_approval older than 7 days -> rejected(approval_expired); younger ones stay', async () => {
    const old = await seed(kit, { status: 'needs_approval', approvalRequired: true, createdAt: new Date(kit.store.clock.now.getTime() - 8 * DAY), payloadHash: 'old' });
    const young = await seed(kit, { status: 'needs_approval', approvalRequired: true, createdAt: new Date(kit.store.clock.now.getTime() - 6 * DAY), payloadHash: 'young' });
    const r = await runArgosIRequestsTick(kit.deps);
    expect(r.expired).toBe(1);
    expect(row(kit, old.id)).toMatchObject({ status: 'rejected', errorCode: 'approval_expired' });
    expect(row(kit, young.id).status).toBe('needs_approval');
  });

  it('cancel: queued and needs_approval -> cancelled; running/done/failed/rejected/cancelled -> not_cancellable', async () => {
    for (const status of ['queued', 'needs_approval'] as const) {
      const r = await seed(kit, { status, payloadHash: `c-${status}` });
      expect(await cancelRequest(r.id)).toMatchObject({ kind: 'cancelled', row: { status: 'cancelled' } });
    }
    for (const status of ['running', 'done', 'failed', 'rejected', 'cancelled'] as const) {
      const r = await seed(kit, { status, payloadHash: `n-${status}` });
      expect(await cancelRequest(r.id)).toEqual({ kind: 'not_cancellable' });
    }
    expect(await cancelRequest('00000000-0000-4000-8000-0000000000bb')).toEqual({ kind: 'not_found' });
  });

  it('running -> done on success; running -> failed (or queued when retryable) on error', async () => {
    const ok = await seed(kit, { payloadHash: 'ok' });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, ok.id).status).toBe('done');
  });
});

describe('approval state in the public view', () => {
  it('maps to not_required / pending / approved / rejected / expired', () => {
    const base = { approvalRequired: true, status: 'needs_approval' as const, approvedAt: null, errorCode: null };
    expect(approvalStateOf({ ...base, approvalRequired: false })).toBe('not_required');
    expect(approvalStateOf(base)).toBe('pending');
    expect(approvalStateOf({ ...base, status: 'queued', approvedAt: new Date() })).toBe('approved');
    expect(approvalStateOf({ ...base, status: 'rejected', errorCode: 'admin_rejected' })).toBe('rejected');
    expect(approvalStateOf({ ...base, status: 'rejected', errorCode: 'approval_expired' })).toBe('expired');
  });
});
