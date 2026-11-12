/**
 * 예산 게이트 — 일 예산(비용·건수) 초과는 needs_approval(budget_daily), 월 예산(Claude, topic 캐시 미적중)은 failed budget_monthly 이고
 * 관리자 승인으로 우회할 수 없다. 관리자 승인은 일 예산만 우회한다 (AC-16, AC-17, Q13)
 */
import { describe, it, expect } from 'vitest';
import { runArgosIRequestsTick } from '../../services/argos-i-requests-processor.js';
import { fakeHandler, makeKit, row, seed } from '../fixtures/argos-i-requests-test-kit.js';

const VIDEO = { target: 'video', id: 'dQw4w9WgXcQ', force: false };
const TOPIC = { target: 'topic', domain: 'hand', days: 30 };
const est = (costUsd: number, provider: 'claude' | 'gemini' | null = 'gemini', claude = false) => ({ costUsd, provider, claude });

describe('daily budget', () => {
  it('moves an analyze request to needs_approval(budget_daily) when today cost + estimate exceeds the budget, without running it', async () => {
    const kit = makeKit(); // 기본 일 예산 2 USD
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1) });
    await seed(kit, { status: 'done', startedAt: new Date(), costUsd: 1.95, payloadHash: 'spent' });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'needs_approval', approvalRequired: true, approvalReason: 'budget_daily', startedAt: null });
    expect(kit.deps.handlers.analyze.run).not.toHaveBeenCalled();
  });

  it('runs when it fits exactly in the budget (cost + estimate <= budget)', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1), outcome: { ok: true, result: {}, costUsd: 0.1, provider: 'gemini' } });
    await seed(kit, { status: 'done', startedAt: new Date(), costUsd: 1.9, payloadHash: 'spent' });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'done', costUsd: 0.1, costProvider: 'gemini' });
  });

  it('ARGOS_I_REQUESTS_DAILY_BUDGET_USD is configurable', async () => {
    const kit = makeKit({ env: { ARGOS_I_REQUESTS_DAILY_BUDGET_USD: '0.05' } });
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1) });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('needs_approval');
  });

  it('only counts today (KST): yesterday spending does not count', async () => {
    const kit = makeKit(); // 2026-11-12 12:00 KST
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1), outcome: { ok: true, result: {}, costUsd: 0.1 } });
    await seed(kit, { status: 'done', startedAt: new Date('2026-11-11T14:59:00Z'), costUsd: 1.99, payloadHash: 'yesterday' }); // 11-11 23:59 KST
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('done');
  });

  it('daily analyze count cap (default 30) also needs approval, even for free (cached) requests', async () => {
    const kit = makeKit({ env: { ARGOS_I_REQUESTS_DAILY_MAX_ANALYZE: '3' } });
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0, null) });
    for (let i = 0; i < 3; i++) await seed(kit, { status: 'done', startedAt: new Date(), payloadHash: `d${i}` });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'needs_approval', approvalReason: 'budget_daily' });
  });

  it('a free (cache hit) request is not blocked by the cost budget even when the day is already over budget', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0, null), outcome: { ok: true, result: { cached: true }, costUsd: 0 } });
    await seed(kit, { status: 'done', startedAt: new Date(), costUsd: 5, payloadHash: 'over' });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'done', costUsd: 0, costProvider: null });
  });

  it('records the running estimate so concurrent requests see it, and replaces it with the actual cost', async () => {
    const kit = makeKit();
    let during = -1;
    const r = await seed(kit, { params: VIDEO });
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1), outcome: () => { during = row(kit, r.id).costUsd; return { ok: true, result: {}, costUsd: 0.07, provider: 'gemini' }; } });
    await runArgosIRequestsTick(kit.deps);
    expect(during).toBe(0.1);
    expect(row(kit, r.id).costUsd).toBe(0.07);
  });

  it('does not gate add_source or query requests', async () => {
    const kit = makeKit({ env: { ARGOS_I_REQUESTS_DAILY_BUDGET_USD: '0', ARGOS_I_REQUESTS_DAILY_MAX_ANALYZE: '0' } });
    const a = await seed(kit, { type: 'add_source', params: { kind: 'arxiv', id: '2401.01234' }, payloadHash: 'a' });
    const q = await seed(kit, { type: 'query', params: { query: 'hand_benchmark_top', limit: 10 }, payloadHash: 'q' });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, a.id).status).toBe('done');
    expect(row(kit, q.id).status).toBe('done');
  });
});

describe('admin approval bypasses the daily budget only', () => {
  it('an approved request runs even when the daily budget and count are exhausted', async () => {
    const kit = makeKit({ env: { ARGOS_I_REQUESTS_DAILY_MAX_ANALYZE: '1' } });
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1), outcome: { ok: true, result: {}, costUsd: 0.1, provider: 'gemini' } });
    await seed(kit, { status: 'done', startedAt: new Date(), costUsd: 2.5, payloadHash: 'spent' });
    const r = await seed(kit, { params: VIDEO, approvalRequired: true, approvalReason: 'budget_daily', approvedAt: new Date() });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('done');
  });

  it('flow: budget exceeded -> needs_approval -> (admin approve) -> queued -> done', async () => {
    const kit = makeKit();
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.1), outcome: { ok: true, result: {}, costUsd: 0.1, provider: 'gemini' } });
    await seed(kit, { status: 'done', startedAt: new Date(), costUsd: 2, payloadHash: 'spent' });
    const r = await seed(kit, { params: VIDEO });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('needs_approval');
    const live = kit.store.rows.get(r.id)!;
    Object.assign(live, { status: 'queued', approvedBy: 'admin:u1', approvedAt: kit.store.clock.now });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'done', approvedBy: 'admin:u1' });
  });
});

describe('monthly budget (Claude) — cannot be bypassed', () => {
  it('fails with budget_monthly when used + estimate exceeds the monthly limit (topic cache miss)', async () => {
    const kit = makeKit();
    kit.claude.limitUsd = 50;
    kit.claude.usedUsd = 49.9;
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.3, 'claude', true) });
    const r = await seed(kit, { params: TOPIC });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', errorCode: 'budget_monthly' });
    expect(kit.deps.handlers.analyze.run).not.toHaveBeenCalled();
  });

  it('admin approval does not bypass it', async () => {
    const kit = makeKit();
    kit.claude.usedUsd = 50;
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.3, 'claude', true) });
    const r = await seed(kit, { params: TOPIC, approvalRequired: true, approvalReason: 'type_rule', approvedAt: new Date(), approvedBy: 'admin:u1' });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'failed', errorCode: 'budget_monthly' });
    expect(kit.deps.handlers.analyze.run).not.toHaveBeenCalled();
  });

  it('is not charged for cache hits (estimate 0) — runs even when the month is over the limit', async () => {
    const kit = makeKit();
    kit.claude.usedUsd = 60;
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0, null, false), outcome: { ok: true, result: { cached: true }, costUsd: 0 } });
    const r = await seed(kit, { params: TOPIC });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('done');
  });

  it('applies to topic only (other analyze targets are not month-gated)', async () => {
    const kit = makeKit();
    kit.claude.usedUsd = 60;
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.01, 'claude', true), outcome: { ok: true, result: {}, costUsd: 0.01, provider: 'claude' } });
    const r = await seed(kit, { params: { target: 'robot', slug: 'figure-02' } });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id).status).toBe('done');
  });

  it('a monthly-usage lookup failure is a transient upstream_error (retried), never a silent pass', async () => {
    const kit = makeKit();
    kit.deps.getClaudeMonth = async () => { throw new Error('db down'); };
    kit.deps.handlers.analyze = fakeHandler({ estimate: est(0.3, 'claude', true) });
    const r = await seed(kit, { params: TOPIC });
    await runArgosIRequestsTick(kit.deps);
    expect(row(kit, r.id)).toMatchObject({ status: 'queued', attempts: 1 });
    expect(kit.deps.handlers.analyze.run).not.toHaveBeenCalled();
  });
});
