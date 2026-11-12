/**
 * 폴러 — 비활성 no-op, 선점(SKIP LOCKED 시뮬레이션·FIFO), 틱당 5건·55초 상한, running 10분 복구, 재시도 2회, 결과 크기 상한,
 * 하루 1회 보존 정리(note 7일, 요청·거부 통계 90일), 마커, 인라인 query 처리 (AC-14, AC-15, AC-24)
 */
import { describe, it, expect } from 'vitest';
import { executeClaimed, runArgosIRequestsTick, runInline } from '../../services/argos-i-requests-processor.js';
import { failOutcome } from '../../services/argos-i-requests-handlers/types.js';
import { fakeHandler, makeKit, row, seed } from '../fixtures/argos-i-requests-test-kit.js';

const MIN = 60_000;
const DAY = 86_400_000;

describe('tick gating', () => {
  it('is a no-op unless ARGOS_I_REQUESTS_ENABLED is true (and DISABLE_ARGOS_I_REQUESTS is not)', async () => {
    for (const env of [{ ARGOS_I_REQUESTS_ENABLED: 'false' }, { ARGOS_I_REQUESTS_ENABLED: undefined }, { ARGOS_I_REQUESTS_ENABLED: 'true', DISABLE_ARGOS_I_REQUESTS: 'true' }]) {
      const kit = makeKit({ env });
      const r = await seed(kit);
      expect(await runArgosIRequestsTick(kit.deps)).toEqual({ outcome: 'disabled', processed: 0 });
      expect(row(kit, r.id).status).toBe('queued');
      expect(kit.handlers.analyze.run).not.toHaveBeenCalled();
      expect(kit.store.markers.size).toBe(0);
    }
  });

  it('returns locked when another instance holds the advisory lock', async () => {
    const kit = makeKit();
    await seed(kit);
    kit.deps.lock = async () => null;
    expect(await runArgosIRequestsTick(kit.deps)).toEqual({ outcome: 'locked', processed: 0 });
    expect(kit.handlers.analyze.run).not.toHaveBeenCalled();
  });
});

describe('claiming', () => {
  it('processes queued requests FIFO and marks them done with the sanitized result', async () => {
    const kit = makeKit();
    const order: string[] = [];
    kit.deps.handlers.analyze = fakeHandler({ outcome: () => (order.push('a'), { ok: true, result: { n: order.length }, costUsd: 0.05, provider: 'gemini' }) });
    const a = await seed(kit, { createdAt: new Date('2026-11-12T01:00:00Z'), payloadHash: 'a' });
    const b = await seed(kit, { createdAt: new Date('2026-11-12T02:00:00Z'), payloadHash: 'b' });
    const r = await runArgosIRequestsTick(kit.deps);
    expect(r).toMatchObject({ outcome: 'ok', processed: 2 });
    expect(row(kit, a.id)).toMatchObject({ status: 'done', result: { n: 1 }, costUsd: 0.05, costProvider: 'gemini', errorCode: null });
    expect(row(kit, b.id)).toMatchObject({ status: 'done', result: { n: 2 } });
    expect(row(kit, a.id).finishedAt).toEqual(kit.store.clock.now);
  });

  it('does not pick needs_approval, running, or terminal rows', async () => {
    const kit = makeKit();
    for (const status of ['needs_approval', 'running', 'done', 'failed', 'rejected', 'cancelled'] as const) await seed(kit, { status, payloadHash: status, startedAt: status === 'running' ? kit.store.clock.now : null });
    expect(await runArgosIRequestsTick(kit.deps)).toMatchObject({ processed: 0 });
    expect(kit.handlers.analyze.run).not.toHaveBeenCalled();
  });

  it('SKIP LOCKED simulation: two concurrent ticks never run the same request twice', async () => {
    const kit = makeKit();
    const seen: string[] = [];
    kit.deps.handlers.analyze = {
      run: async (p) => {
        seen.push(String(p.slug));
        await new Promise((r) => setTimeout(r, 5));
        return { ok: true, result: {}, costUsd: 0 };
      },
    };
    for (let i = 0; i < 6; i++) await seed(kit, { params: { target: 'robot', slug: `r${i}` }, payloadHash: `p${i}` });
    const [x, y] = await Promise.all([runArgosIRequestsTick(kit.deps), runArgosIRequestsTick(kit.deps)]);
    expect(x.processed + y.processed).toBe(6);
    expect(new Set(seen).size).toBe(6);
    expect(seen).toHaveLength(6);
  });

  it('claimQueued picks each row once even when called concurrently', async () => {
    const kit = makeKit();
    for (let i = 0; i < 4; i++) await seed(kit, { payloadHash: `c${i}` });
    const [a, b] = await Promise.all([kit.store.claimQueued(3, kit.store.clock.now), kit.store.claimQueued(3, kit.store.clock.now)]);
    expect(new Set([...a, ...b].map((r) => r.id)).size).toBe(a.length + b.length);
    expect(a.length + b.length).toBe(4);
  });
});

describe('per-tick limits (AC-15)', () => {
  it('handles at most 5 requests per tick', async () => {
    const kit = makeKit();
    for (let i = 0; i < 8; i++) await seed(kit, { payloadHash: `m${i}` });
    expect(await runArgosIRequestsTick(kit.deps)).toMatchObject({ processed: 5 });
    expect([...kit.store.rows.values()].filter((r) => r.status === 'queued')).toHaveLength(3);
    expect(await runArgosIRequestsTick(kit.deps)).toMatchObject({ processed: 3 });
  });

  it('stops starting new requests once 55 seconds have elapsed', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ outcome: () => (kit.advance(20_000), { ok: true, result: {}, costUsd: 0 }) });
    for (let i = 0; i < 5; i++) await seed(kit, { payloadHash: `t${i}` });
    expect(await runArgosIRequestsTick(kit.deps)).toMatchObject({ processed: 3 });
    expect([...kit.store.rows.values()].filter((r) => r.status === 'queued')).toHaveLength(2);
  });
});

describe('crash recovery (AC-15)', () => {
  it('running longer than 10 minutes becomes failed/timeout; younger running rows are left alone', async () => {
    const kit = makeKit();
    const stale = await seed(kit, { status: 'running', startedAt: new Date(kit.store.clock.now.getTime() - 11 * MIN), payloadHash: 's1' });
    const fresh = await seed(kit, { status: 'running', startedAt: new Date(kit.store.clock.now.getTime() - 9 * MIN), payloadHash: 's2' });
    const r = await runArgosIRequestsTick(kit.deps);
    expect(r.recovered).toBe(1);
    expect(row(kit, stale.id)).toMatchObject({ status: 'failed', errorCode: 'timeout' });
    expect(row(kit, stale.id).finishedAt).toBeTruthy();
    expect(row(kit, fresh.id).status).toBe('running');
  });
});

describe('failure handling', () => {
  it('a transient error is retried on the next tick (queued, attempts+1) and fails for good on the second attempt', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ outcome: failOutcome('upstream_error', true) });
    const r = await seed(kit);
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'queued', attempts: 1, startedAt: null, errorCode: null });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', attempts: 2, errorCode: 'upstream_error' });
    expect(kit.deps.handlers.analyze.run).toHaveBeenCalledTimes(2);
  });

  it('quota_exceeded is transient too; not_found/invalid_target/provider_not_configured are final immediately', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ outcome: failOutcome('quota_exceeded', true) });
    const q = await seed(kit, { payloadHash: 'q' });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, q.id).status).toBe('queued');
    for (const code of ['not_found', 'invalid_target', 'provider_not_configured'] as const) {
      const k = makeKit();
      k.deps.handlers.analyze = fakeHandler({ outcome: failOutcome(code) });
      const x = await seed(k);
      await runArgosIRequestsTick(k.deps);
      expect(row(k, x.id)).toMatchObject({ status: 'failed', errorCode: code, attempts: 1 });
    }
  });

  it('a thrown handler error is treated as a transient upstream_error (message never stored)', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = { run: async () => { throw new Error('secret detail https://x.test?key=abc'); } };
    const r = await seed(kit);
    await runArgosIRequestsTick(kit.deps);
    await runArgosIRequestsTick(kit.deps);
    const final = row(kit, r.id);
    expect(final).toMatchObject({ status: 'failed', errorCode: 'upstream_error' });
    expect(JSON.stringify(final)).not.toContain('secret detail');
    expect(kit.logs.join('\n')).not.toContain('secret detail');
  });

  it('a handler that never returns fails with timeout', async () => {
    const kit = makeKit();
    kit.deps.handlerTimeoutMs = 20;
    kit.deps.handlers.analyze = { run: () => new Promise(() => undefined) };
    const r = await seed(kit);
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', errorCode: 'timeout' });
  });

  it('a result over 64KB fails with result_too_large and stores nothing', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ outcome: { ok: true, result: { big: 'x'.repeat(70_000) }, costUsd: 0 } });
    const r = await seed(kit);
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', errorCode: 'result_too_large', result: null });
  });

  it('an unknown type fails with invalid_target', async () => {
    const kit = makeKit();
    const r = await seed(kit, { type: 'watch_register', params: {} });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', errorCode: 'invalid_target' });
  });
});

describe('marker and retention (AC-24)', () => {
  it('writes argos-i-requests:last with the last run summary', async () => {
    const kit = makeKit();
    await seed(kit);
    await runArgosIRequestsTick(kit.deps);
    expect(kit.store.markers.get('argos-i-requests:last')).toMatchObject({ outcome: 'ok', processed: 1, finishedAt: kit.store.clock.now.toISOString() });
  });

  it('retention runs once a day, only after 03:00 KST; clears notes after 7 days and deletes requests/stats after 90 days', async () => {
    // 2026-11-11 17:00Z = 11-12 02:00 KST → 아직 이르다
    const kit = makeKit({ now: new Date('2026-11-11T17:00:00Z') });
    const day = (n: number) => new Date(Date.parse('2026-11-12T00:00:00Z') - n * DAY);
    const noteOld = await seed(kit, { status: 'done', note: 'old note', createdAt: day(10), finishedAt: day(8), payloadHash: 'n1' });
    const noteRecent = await seed(kit, { status: 'done', note: 'recent note', createdAt: day(3), finishedAt: day(2), payloadHash: 'n2' });
    const pending = await seed(kit, { status: 'needs_approval', note: 'pending note', createdAt: day(6), payloadHash: 'n3' });
    const ancient = await seed(kit, { status: 'done', createdAt: day(91), finishedAt: day(91), payloadHash: 'n4' });
    kit.store.rejects.set('2026-08-01|email_detected', 3);
    kit.store.rejects.set('2026-11-01|email_detected', 2);

    expect((await runArgosIRequestsTick(kit.deps)).retention).toBeNull();
    expect(row(kit, noteOld.id).note).toBe('old note');

    kit.advance(2 * 3_600_000); // 04:00 KST
    const r = await runArgosIRequestsTick(kit.deps);
    expect(r.retention).toMatchObject({ notesCleared: 1, requestsDeleted: 1, rejectsDeleted: 1 });
    expect(row(kit, noteOld.id).note).toBeNull();
    expect(row(kit, noteRecent.id).note).toBe('recent note');
    expect(row(kit, pending.id).note).toBe('pending note');
    expect(kit.store.rows.has(ancient.id)).toBe(false);
    expect([...kit.store.rejects.keys()]).toEqual(['2026-11-01|email_detected']);

    // 같은 날 두 번째 틱은 다시 하지 않는다
    expect((await runArgosIRequestsTick(kit.deps)).retention).toBeNull();
    // 다음 날 03:00 KST 이후에는 다시 한다
    kit.advance(DAY);
    expect((await runArgosIRequestsTick(kit.deps)).retention).not.toBeNull();
  });
});

describe('inline processing (query)', () => {
  it('finishes within the inline timeout: returns the finished row', async () => {
    const kit = makeKit();
    kit.deps.handlers.query = fakeHandler({ outcome: { ok: true, result: { area: 'x' }, costUsd: 0 } });
    const r = await seed(kit, { type: 'query', params: { query: 'hand_benchmark_top', limit: 10 } });
    const out = await runInline(r, kit.deps);
    expect(out).toMatchObject({ status: 'done', result: { area: 'x' } });
  });

  it('falls back to queued when it does not finish in time and discards the late result', async () => {
    const kit = makeKit();
    let release!: () => void;
    kit.deps.handlers.query = { run: () => new Promise((res) => (release = () => res({ ok: true, result: { late: true }, costUsd: 0 }))) };
    const r = await seed(kit, { type: 'query', params: { query: 'hand_benchmark_top', limit: 10 } });
    const out = await runInline(r, kit.deps);
    expect(out.status).toBe('queued');
    expect(row(kit, r.id)).toMatchObject({ status: 'queued', startedAt: null });
    release();
    await new Promise((res) => setTimeout(res, 10));
    expect(row(kit, r.id)).toMatchObject({ status: 'queued', result: null });
  });

  it('a failed inline query is returned as failed with its error code', async () => {
    const kit = makeKit();
    kit.deps.handlers.query = fakeHandler({ outcome: failOutcome('not_found') });
    const r = await seed(kit, { type: 'query', params: { query: 'robot_actuators', robot: 'nope' } });
    expect(await runInline(r, kit.deps)).toMatchObject({ status: 'failed', errorCode: 'not_found' });
  });
});

describe('executeClaimed does not clobber a row that is no longer running', () => {
  it('a finalize after the row was cancelled/changed is ignored', async () => {
    const kit = makeKit();
    const r = await seed(kit, { status: 'running', startedAt: kit.store.clock.now });
    kit.deps.handlers.analyze = fakeHandler({ outcome: () => { kit.store.rows.get(r.id)!.status = 'cancelled'; return { ok: true, result: {}, costUsd: 0 }; } });
    expect(await executeClaimed(r, kit.deps)).toBeNull();
    expect(row(kit, r.id).status).toBe('cancelled');
  });
});
