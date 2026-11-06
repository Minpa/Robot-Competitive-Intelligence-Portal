/**
 * data-coverage.service — 쿼리 계층을 mock 해서 격리/타임아웃/단일 실행/캐시/부분 실패 재시도/스로틀/스냅샷/비교 기준을 검증
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataCoverageService, createDefaultDeps, resolveQueryTimeoutMs, type DataCoverageDeps } from '../../services/data-coverage.service.js';
import { SnapshotStore, kstDate, snapshotKey, type MigrationStoreLike } from '../../services/data-coverage-snapshot.js';
import { VIEW_CACHE_CONFIGS } from '../../services/view-cache.service.js';
import type { CoverageQueryMap } from '../../services/data-coverage-queries.js';
import { okBundles } from '../fixtures/data-coverage.fixture.js';
import { parseCollectLast } from '../../services/data-coverage-sections.js';
import type { DataCoverageResponse } from '../../types/data-coverage.js';

const START = new Date('2026-11-06T03:00:00.000Z');

/** view-cache 의 인메모리 의미(TTL, stale 폴백)를 흉내 낸다 */
class FakeCache {
  entry: { data: unknown; cachedAt: Date } | null = null;
  async getOrCompute<T>(_v: string, fn: () => Promise<T>) {
    const e = this.entry;
    if (e && Date.now() - e.cachedAt.getTime() < 600_000) return { data: e.data as T, isStale: false, cachedAt: e.cachedAt };
    try {
      const data = await fn();
      this.entry = { data, cachedAt: new Date() };
      return { data, isStale: false, cachedAt: this.entry.cachedAt };
    } catch (err) {
      if (e) return { data: e.data as T, isStale: true, cachedAt: e.cachedAt };
      throw err;
    }
  }
  async invalidate() {
    this.entry = null;
  }
}

class FakeMigrations implements MigrationStoreLike {
  rows = new Map<string, { key: string; appliedAt: Date; summary: Record<string, unknown> }>();
  upserts: string[] = [];
  async get(key: string) {
    return this.rows.get(key) ?? null;
  }
  async upsert(key: string, summary: Record<string, unknown>) {
    this.upserts.push(key);
    this.rows.set(key, { key, appliedAt: new Date(), summary });
  }
  async listRecent(prefix: string | null, limit: number) {
    return [...this.rows.values()].filter((r) => !prefix || r.key.startsWith(prefix)).sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()).slice(0, limit);
  }
}

function makeQueries(over: Partial<Record<keyof CoverageQueryMap, (...a: never[]) => Promise<unknown>>> = {}) {
  const b = okBundles();
  const calls: Record<string, number> = {};
  let active = 0;
  let maxActive = 0;
  const wrap = (name: keyof CoverageQueryMap, data: unknown) =>
    (async () => {
      calls[name] = (calls[name] ?? 0) + 1;
      active++;
      maxActive = Math.max(maxActive, active);
      try {
        await new Promise((r) => setTimeout(r, 5));
        const o = over[name];
        return o ? await o() : data;
      } finally {
        active--;
      }
    });
  const data = (r: { ok: boolean; data?: unknown }) => (r as { data: unknown }).data;
  const queries = {
    qa1: wrap('qa1', data(b.qa1)), qa2: wrap('qa2', data(b.qa2)), qa6: wrap('qa6', data(b.qa6)), robots: wrap('robots', data(b.robots)),
    bodyFields: wrap('bodyFields', data(b.bodyFields)), handFields: wrap('handFields', data(b.handFields)), powerFields: wrap('powerFields', data(b.powerFields)),
    components: wrap('components', data(b.components)), supplier: wrap('supplier', data(b.supplier)), sourcing: wrap('sourcing', data(b.sourcing)),
    ci: wrap('ci', data(b.ci)), ciByLayer: wrap('ciByLayer', data(b.ciByLayer)), ciStaging: wrap('ciStaging', data(b.ciStaging)), handBenchmark: wrap('handBenchmark', data(b.handBenchmark)),
    aiProvider: wrap('aiProvider', data(b.aiProvider)), aiTag: wrap('aiTag', data(b.aiTag)), aiLoggedTags: wrap('aiLoggedTags', data(b.aiLoggedTags)),
    autoCompanies: wrap('autoCompanies', data(b.autoCompanies)), crawl: wrap('crawl', data(b.crawl)), crawlErrors: wrap('crawlErrors', data(b.crawlErrors)),
  } as unknown as CoverageQueryMap;
  return { queries, calls, get maxActive() { return maxActive; } };
}

interface Ctx {
  svc: DataCoverageService;
  q: ReturnType<typeof makeQueries>;
  cache: FakeCache;
  mig: FakeMigrations;
  deps: DataCoverageDeps;
}

function setup(over: Parameters<typeof makeQueries>[0] = {}, depOver: Partial<DataCoverageDeps> = {}): Ctx {
  const q = makeQueries(over);
  const cache = new FakeCache();
  const mig = new FakeMigrations();
  const deps = createDefaultDeps({
    queries: q.queries,
    snapshots: new SnapshotStore(mig, () => Date.now()),
    cache,
    readCollect: async () => (okBundles().collect as { data: never }).data,
    readAudit: async () => (okBundles().audit as { data: never }).data,
    queryTimeoutMs: () => 4000,
    snapshotDisabled: () => false,
    log: () => {},
    ...depOver,
  });
  return { svc: new DataCoverageService(deps), q, cache, mig, deps };
}

const metric = (r: DataCoverageResponse, id: string) => r.sections.flatMap((s) => s.metrics).find((m) => m.id === id)!;
const flush = () => new Promise((r) => setTimeout(r, 30));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
});
afterEach(() => vi.useRealTimers());

describe('registration', () => {
  it('view cache config: TTL 600000, cache fallback', () => {
    expect(VIEW_CACHE_CONFIGS['data-coverage']).toEqual({ ttlMs: 600_000, staleBadge: true, fallbackType: 'cache' });
  });
  it('query timeout defaults to 4000ms and is adjustable via DATA_COVERAGE_QUERY_TIMEOUT_MS', () => {
    expect(resolveQueryTimeoutMs({})).toBe(4000);
    expect(resolveQueryTimeoutMs({ DATA_COVERAGE_QUERY_TIMEOUT_MS: '1500' })).toBe(1500);
    expect(resolveQueryTimeoutMs({ DATA_COVERAGE_QUERY_TIMEOUT_MS: 'abc' })).toBe(4000);
    expect(resolveQueryTimeoutMs({ DATA_COVERAGE_QUERY_TIMEOUT_MS: '5' })).toBe(4000);
  });
  it('the default deadline is 5 seconds', () => {
    expect(createDefaultDeps().deadlineMs).toBe(5000);
  });
  it('parseCollectLast only keeps booleans in config and whitelisted fields', () => {
    const c = parseCollectLast({ updatedAt: 'x', config: { youtubeApiKeyConfigured: 'AIzaSECRET', githubTokenConfigured: true, extra: 'k' }, collectors: { youtube: { finishedAt: 'a', secret: 'zzz', channelsSkipped: 2 } } })!;
    expect(c.config['youtubeApiKeyConfigured']).toBeNull();
    expect(c.config['githubTokenConfigured']).toBe(true);
    expect(Object.keys(c.config).sort()).toEqual(['collectOnStartup', 'githubTokenConfigured', 'htmlCrawlerEnabled', 'legalCollectDisabled', 'youtubeApiKeyConfigured']);
    expect(JSON.stringify(c)).not.toMatch(/zzz|AIzaSECRET/);
    expect(parseCollectLast('nope')).toBeNull();
  });
});

describe('compute + cache', () => {
  it('returns 7 sections, full response, then serves the cache for 10 minutes without any query (AC-11)', async () => {
    const { svc, q } = setup();
    const r1 = await svc.getCoverage();
    expect(r1.sections).toHaveLength(7);
    expect(r1.partial).toBe(false);
    expect(r1.cache).toMatchObject({ hit: false, stale: false, ageSec: 0, ttlSec: 600 });
    const total = Object.values(q.calls).reduce((a, b) => a + b, 0);
    expect(total).toBe(20);
    vi.setSystemTime(new Date(START.getTime() + 9 * 60_000));
    const r2 = await svc.getCoverage();
    expect(r2.cache.hit).toBe(true);
    expect(r2.cache.ageSec).toBe(540);
    expect(Object.values(q.calls).reduce((a, b) => a + b, 0)).toBe(total);
    vi.setSystemTime(new Date(START.getTime() + 11 * 60_000));
    const r3 = await svc.getCoverage();
    expect(r3.cache.hit).toBe(false);
    expect(Object.values(q.calls).reduce((a, b) => a + b, 0)).toBe(total * 2);
  });

  it('single-flight: concurrent requests compute once', async () => {
    const { svc, q } = setup();
    await Promise.all([svc.getCoverage(), svc.getCoverage(), svc.getCoverage()]);
    expect(q.calls['qa1']).toBe(1);
    expect(q.calls['qa6']).toBe(1);
  });

  it('never runs more than 3 queries at the same time', async () => {
    const { svc, q } = setup();
    await svc.getCoverage();
    expect(q.maxActive).toBeLessThanOrEqual(3);
    expect(q.maxActive).toBeGreaterThan(1);
  });

  it('articles scans are limited to three queries per computation (AC-10)', async () => {
    const { svc, q } = setup();
    await svc.getCoverage();
    expect((q.calls['qa1'] ?? 0) + (q.calls['qa2'] ?? 0) + (q.calls['qa6'] ?? 0)).toBe(3);
  });

  it('uses the claude limit helper and the exported daily limits (no copied literals)', async () => {
    process.env.CLAUDE_MONTHLY_LIMIT_USD = '80';
    const { svc } = setup();
    const r = await svc.getCoverage();
    expect(metric(r, 'cost.claude.limit').value).toBe(80);
    const eta = r.sections.find((s) => s.id === 'aiCost')!.tables.find((t) => t.id === 'cost.backlogEta')!;
    const { VIDEO_TAGGING_DAILY_LIMIT } = await import('../../services/video-tagging.service.js');
    const { PAPER_SUMMARY_DAILY_LIMIT } = await import('../../services/paper-summary.service.js');
    expect(eta.rows.find((x) => x.key === 'videoTagging')!.cells['dailyLimit']).toBe(VIDEO_TAGGING_DAILY_LIMIT);
    expect(eta.rows.find((x) => x.key === 'paperSummary')!.cells['dailyLimit']).toBe(PAPER_SUMMARY_DAILY_LIMIT);
    delete process.env.CLAUDE_MONTHLY_LIMIT_USD;
  });
});

describe('failure isolation (AC-07, AC-08)', () => {
  it('a throwing query fails only its metrics; the response still resolves with partial=true and masked messages', async () => {
    const { svc } = setup({ qa2: async () => { throw new Error('relation x failed https://h/db?password=hunter2 token=abcd'); } });
    const r = await svc.getCoverage();
    expect(r.partial).toBe(true);
    const m = metric(r, 'analysis.video.tagRate');
    expect(m.status).toBe('failed');
    expect(m.reason).toBe('query_failed');
    expect(m.value).toBeNull();
    expect(m.errorMessage).not.toMatch(/hunter2|abcd|password/);
    expect((m.errorMessage ?? '').length).toBeLessThanOrEqual(120);
    expect(metric(r, 'analysis.paper.rate').status).toBe('ok');
    expect(metric(r, 'ingest.total').status).toBe('ok');
    expect(r.sections.find((s) => s.id === 'ingest')!.status).toBe('ok');
    expect(r.sections.find((s) => s.id === 'analysis')!.status).toBe('partial');
    // 의존: backlogEta 는 분석 쿼리에 의존한다
    expect(r.sections.find((s) => s.id === 'aiCost')!.tables.find((t) => t.id === 'cost.backlogEta')!.status).toBe('failed');
    expect(metric(r, 'quality.robotTagGap')).toMatchObject({ status: 'failed', reason: 'dependency_failed' });
  });

  it('statement timeout (57014) is reported as reason=timeout', async () => {
    const { svc } = setup({ qa1: async () => { throw Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }); } });
    const r = await svc.getCoverage();
    expect(metric(r, 'ingest.total')).toMatchObject({ status: 'failed', reason: 'timeout' });
    expect(metric(r, 'cost.claude.usedMonth').status).toBe('ok');
  });

  it('a hung query is cut off at the query timeout; too_large maps to its own reason', async () => {
    const { svc } = setup(
      { qa6: () => new Promise(() => {}) },
      { queryTimeoutMs: () => 60 },
    );
    const t0 = Date.now();
    const r = await svc.getCoverage();
    expect(metric(r, 'quality.dup.urlNorm')).toMatchObject({ status: 'failed', reason: 'timeout' });
    expect(metric(r, 'ingest.total').status).toBe('ok');
    expect(Date.now() - t0).toBeLessThan(2000);

    const { TooLargeError } = await import('../../services/data-coverage-queries.js');
    const s2 = setup({ qa6: async () => { throw new TooLargeError(); } });
    expect(metric(await s2.svc.getCoverage(), 'quality.dup.urlNorm')).toMatchObject({ status: 'failed', reason: 'too_large' });
  });

  it('once the overall deadline is spent, queries that have not started fail with timeout', async () => {
    const { svc } = setup({ qa1: () => new Promise((r) => setTimeout(r, 600)), qa2: () => new Promise((r) => setTimeout(r, 600)), qa6: () => new Promise((r) => setTimeout(r, 600)) }, { deadlineMs: 60, queryTimeoutMs: () => 4000 });
    const r = await svc.getCoverage();
    const reasons = r.sections.flatMap((s) => s.metrics).filter((m) => m.status === 'failed').map((m) => m.reason);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons).toContain('timeout');
    expect(reasons.every((x) => x === 'timeout' || x === 'dependency_failed')).toBe(true);
  });

  it('when every query fails the response is still produced (all sections failed) instead of throwing', async () => {
    const boom = async () => { throw new Error('db down'); };
    const all: Record<string, () => Promise<never>> = Object.fromEntries(['qa1', 'qa2', 'qa6', 'robots', 'bodyFields', 'handFields', 'powerFields', 'components', 'supplier', 'sourcing', 'ci', 'ciByLayer', 'ciStaging', 'handBenchmark', 'aiProvider', 'aiTag', 'aiLoggedTags', 'autoCompanies', 'crawl', 'crawlErrors'].map((k) => [k, boom]));
    const { svc } = setup(all, { readCollect: boom, readAudit: boom });
    const r = await svc.getCoverage();
    expect(r.sections.every((s) => s.status === 'failed')).toBe(true);
    expect(r.partial).toBe(true);
  });

  it('a total failure after a good result returns the previous data as stale', async () => {
    let fail = false;
    const flaky = (data: unknown) => async () => { if (fail) throw new Error('down'); return data; };
    const b = okBundles();
    const names = ['qa1', 'qa2', 'qa6', 'robots', 'bodyFields', 'handFields', 'powerFields', 'components', 'supplier', 'sourcing', 'ci', 'ciByLayer', 'ciStaging', 'handBenchmark', 'aiProvider', 'aiTag', 'aiLoggedTags', 'autoCompanies', 'crawl', 'crawlErrors'] as const;
    const over = Object.fromEntries(names.map((n) => [n, flaky((b[n] as { data: unknown }).data)]));
    const { svc } = setup(over, { readCollect: async () => { if (fail) throw new Error('down'); return null; }, readAudit: async () => { if (fail) throw new Error('down'); return null; } });
    const first = await svc.getCoverage();
    expect(first.cache.stale).toBe(false);
    fail = true;
    const r = await svc.refresh().catch(() => null);
    expect(r).toMatchObject({ ok: false }); // 30초 스로틀
    vi.setSystemTime(new Date(START.getTime() + 11 * 60_000));
    const second = await svc.getCoverage();
    expect(second.cache.stale).toBe(true);
    expect(metric(second, 'ingest.total').status).toBe('ok');
  });

  it('does not touch ops status', async () => {
    const mod = await import('node:fs');
    const src = mod.readFileSync(new URL('../../services/data-coverage.service.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/ops-status|getOpsStatus/);
  });
});

describe('partial retry (AC-12)', () => {
  it('a partial result is recomputed on the next request after 60 seconds, not before', async () => {
    let failQa2 = true;
    const { svc, q } = setup({ qa2: async () => { if (failQa2) throw new Error('x'); return []; } });
    const r1 = await svc.getCoverage();
    expect(r1.partial).toBe(true);
    vi.setSystemTime(new Date(START.getTime() + 59_000));
    expect((await svc.getCoverage()).cache.hit).toBe(true);
    expect(q.calls['qa2']).toBe(1);
    failQa2 = false;
    vi.setSystemTime(new Date(START.getTime() + 61_000));
    const r3 = await svc.getCoverage();
    expect(q.calls['qa2']).toBe(2);
    expect(r3.cache.hit).toBe(false);
    expect(r3.partial).toBe(false);
  });
});

describe('refresh (AC-13)', () => {
  it('ignores the TTL but is throttled for 30 seconds after the last computation', async () => {
    const { svc, q } = setup();
    await svc.getCoverage();
    vi.setSystemTime(new Date(START.getTime() + 10_000));
    const t = await svc.refresh();
    expect(t).toEqual({ ok: false, retryAfterSec: 20 });
    expect(q.calls['qa1']).toBe(1);
    vi.setSystemTime(new Date(START.getTime() + 31_000));
    const r = await svc.refresh();
    expect(r.ok).toBe(true);
    expect(q.calls['qa1']).toBe(2);
    if (r.ok) expect(r.response.cache.hit).toBe(false);
  });

  it('shares an in-flight computation instead of starting another', async () => {
    const { svc, q } = setup({ qa1: () => new Promise((r) => setTimeout(() => r([]), 60)) });
    const first = svc.getCoverage();
    await new Promise((r) => setTimeout(r, 10));
    const refreshed = await svc.refresh();
    await first;
    expect(refreshed.ok).toBe(true);
    expect(q.calls['qa1']).toBe(1);
  });
});

describe('snapshot (AC-14)', () => {
  it('keys use the KST date', () => {
    expect(kstDate(new Date('2026-11-05T14:59:59Z'))).toBe('2026-11-05');
    expect(kstDate(new Date('2026-11-05T15:00:00Z'))).toBe('2026-11-06');
    expect(snapshotKey('2026-11-06')).toBe('coverage:2026-11-06');
  });

  it('saves the first value of the day; keeps it afterwards; no table or schema work is involved', async () => {
    const { svc, mig } = setup();
    await svc.getCoverage();
    await flush();
    expect(mig.upserts).toEqual(['coverage:2026-11-06']);
    const summary = mig.rows.get('coverage:2026-11-06')!.summary as { metrics: Record<string, number | null>; cells: Record<string, number | null>; partial: boolean };
    expect(summary.partial).toBe(false);
    expect(Buffer.byteLength(JSON.stringify(summary))).toBeLessThan(25_000);
    expect(summary.metrics['ingest.total']).toBe(metric(await svc.getCoverage(), 'ingest.total').value);
    // 같은 날 재계산해도 첫 값을 유지한다
    vi.setSystemTime(new Date(START.getTime() + 11 * 60_000));
    await svc.getCoverage();
    await flush();
    expect(mig.upserts).toEqual(['coverage:2026-11-06']);
  });

  it('a full computation overwrites a partial snapshot of the same day', async () => {
    let failQa2 = true;
    const { svc, mig } = setup({ qa2: async () => { if (failQa2) throw new Error('x'); return []; } });
    await svc.getCoverage();
    await flush();
    expect((mig.rows.get('coverage:2026-11-06')!.summary as { partial: boolean }).partial).toBe(true);
    failQa2 = false;
    vi.setSystemTime(new Date(START.getTime() + 61_000));
    await svc.getCoverage();
    await flush();
    expect(mig.upserts).toEqual(['coverage:2026-11-06', 'coverage:2026-11-06']);
    expect((mig.rows.get('coverage:2026-11-06')!.summary as { partial: boolean }).partial).toBe(false);
  });

  it('a partial computation does not overwrite a full snapshot', async () => {
    let failQa2 = false;
    const { svc, mig } = setup({ qa2: async () => { if (failQa2) throw new Error('x'); return []; } });
    await svc.getCoverage();
    await flush();
    failQa2 = true;
    vi.setSystemTime(new Date(START.getTime() + 11 * 60_000));
    await svc.getCoverage();
    await flush();
    expect(mig.upserts).toHaveLength(1);
  });

  it('a failing snapshot store never breaks the response', async () => {
    const { svc, mig } = setup();
    mig.upsert = async () => { throw new Error('disk full'); };
    mig.listRecent = async () => { throw new Error('db down'); };
    const r = await svc.getCoverage();
    expect(r.sections).toHaveLength(7);
    expect(r.compare.reason).toBe('no_snapshot');
  });

  it('DISABLE_DATA_COVERAGE_SNAPSHOT: nothing is written, the task is skipped', async () => {
    const { svc, mig } = setup({}, { snapshotDisabled: () => true });
    await svc.getCoverage();
    await flush();
    expect(mig.upserts).toEqual([]);
    expect(await svc.runSnapshotTask()).toEqual({ outcome: 'skipped' });
  });

  it('the scheduler task recomputes (ignores the cache) and saves', async () => {
    const { svc, mig, q } = setup();
    await svc.getCoverage();
    await flush();
    mig.rows.clear();
    mig.upserts.length = 0;
    const r = await svc.runSnapshotTask();
    expect(r.outcome).toBe('saved');
    expect(q.calls['qa1']).toBe(2);
    expect(mig.upserts).toEqual(['coverage:2026-11-06']);
  });
});

describe('compare baseline (AC-15)', () => {
  const seed = (mig: FakeMigrations, date: string, total: number, partial = false) =>
    mig.rows.set(snapshotKey(date), { key: snapshotKey(date), appliedAt: new Date(`${date}T01:00:00Z`), summary: { schemaVersion: 1, takenAt: `${date}T01:00:00.000Z`, partial, metrics: { 'ingest.total': total, 'analysis.video.tagRate': 0.5 }, cells: { 'ingest.byGroup:arxiv:total': 100 } } });

  it('no snapshot: reason=no_snapshot and every baseline/delta is null', async () => {
    const { svc } = setup({}, { snapshotDisabled: () => true });
    const r = await svc.getCoverage();
    expect(r.compare).toMatchObject({ reason: 'no_snapshot', baselineDate: null, availableDates: [] });
    expect(r.sections.flatMap((s) => s.metrics).every((m) => m.baseline === null && m.delta === null)).toBe(true);
  });

  it('defaults to the latest snapshot before today (KST) and fills baseline/delta (count diff, ratio %p)', async () => {
    const { svc, mig } = setup({}, { snapshotDisabled: () => true });
    seed(mig, '2026-11-03', 500);
    seed(mig, '2026-11-05', 700);
    seed(mig, '2026-11-06', 999);
    const r = await svc.getCoverage();
    expect(r.compare).toMatchObject({ reason: 'ok', baselineDate: '2026-11-05', requestedDate: null });
    expect(r.compare.availableDates).toEqual(['2026-11-06', '2026-11-05', '2026-11-03']);
    const total = metric(r, 'ingest.total');
    expect(total.baseline).toBe(700);
    expect(total.delta).toBe((total.value as number) - 700);
    const rate = metric(r, 'analysis.video.tagRate');
    expect(rate.delta).toBeCloseTo(((rate.value as number) - 0.5) * 100, 4);
  });

  it('honours compareTo when present, otherwise falls back with reason=requested_not_found', async () => {
    const { svc, mig, q } = setup({}, { snapshotDisabled: () => true });
    seed(mig, '2026-11-03', 500);
    seed(mig, '2026-11-05', 700);
    const a = await svc.getCoverage('2026-11-03');
    expect(a.compare).toMatchObject({ reason: 'ok', baselineDate: '2026-11-03', requestedDate: '2026-11-03' });
    expect(metric(a, 'ingest.total').baseline).toBe(500);
    const b = await svc.getCoverage('2026-10-01');
    expect(b.compare).toMatchObject({ reason: 'requested_not_found', baselineDate: '2026-11-05', requestedDate: '2026-10-01' });
    // 비교 기준을 바꿔도 재집계 쿼리는 없다
    expect(q.calls['qa1']).toBe(1);
  });

  it('table cells get a delta as well (diffable tables only)', async () => {
    const { svc, mig } = setup({}, { snapshotDisabled: () => true });
    seed(mig, '2026-11-05', 700);
    const r = await svc.getCoverage();
    const arxiv = r.sections[0]!.tables.find((t) => t.id === 'ingest.byGroup')!.rows.find((x) => x.key === 'arxiv')!;
    expect(arxiv.delta?.['total']).toBe((arxiv.cells['total'] as number) - 100);
  });
});
