import { describe, it, expect, vi } from 'vitest';
import {
  COLLECT_LAST_KEY,
  buildCollectorEntry,
  buildConfigFlags,
  buildFailureEntry,
  sanitizeError,
  trackCollector,
  writeCollectorSummary,
  type CollectorEntry,
  type SummaryWriter,
} from '../collect-run-summary.service.js';

const ctx = { trigger: 'cron' as const, durationMs: 1234.6, finishedAt: '2026-11-06T00:00:00.000Z' };

/** 실제 SQL 의 항목 단위 병합 의미를 메모리로 재현하는 가짜 저장소 */
function memoryWriter() {
  const store: { summary: Record<string, any> | null; calls: number } = { summary: null, calls: 0 };
  const writer: SummaryWriter = {
    ensureTable: async () => {},
    upsert: async (patch) => {
      store.calls++;
      const prev = store.summary ?? {};
      store.summary = { ...prev, schemaVersion: 1, updatedAt: patch.updatedAt, config: patch.config, collectors: { ...(prev.collectors ?? {}), ...patch.collectors } };
    },
  };
  return { store, writer };
}

describe('sanitizeError', () => {
  it('removes key=, token=, Bearer, URL query strings and caps at 200 chars', () => {
    const e = sanitizeError(new Error('GET https://www.googleapis.com/youtube/v3/search?part=snippet&key=AIzaSyDUMMYDUMMYDUMMY1234 failed'));
    expect(e).not.toMatch(/key=|AIza|part=snippet|\?/);
    expect(e).toContain('https://www.googleapis.com/youtube/v3/search');
    expect(sanitizeError('token=abc123 and access_token=zzz')).not.toMatch(/abc123|zzz/);
    expect(sanitizeError('Authorization: Bearer ghp_abcdefghijklmnop1234')).not.toMatch(/ghp_|abcdefgh/);
    expect(sanitizeError('postgres://user:pw@host/db down')).not.toMatch(/user:pw|postgres:\/\//);
    expect(sanitizeError('x'.repeat(1000)).length).toBeLessThanOrEqual(200);
    expect(sanitizeError('line1\n    at foo (a.ts:1:1)\nline3')).toBe('line1');
    expect(sanitizeError(undefined)).toBe('');
    expect(sanitizeError('see https://x.test/a#frag?z=1')).not.toMatch(/frag|z=1/);
  });
});

describe('buildConfigFlags', () => {
  it('contains booleans only, never values or lengths', () => {
    const f = buildConfigFlags({ YOUTUBE_API_KEY: 'AIzaSECRET', GITHUB_TOKEN: 'ghp_secret', ENABLE_HTML_CRAWLER: 'true', DISABLE_LEGAL_COLLECT: 'true', COLLECT_ON_STARTUP: 'false' });
    expect(f).toEqual({ youtubeApiKeyConfigured: true, githubTokenConfigured: true, htmlCrawlerEnabled: true, legalCollectDisabled: true, collectOnStartup: false });
    expect(Object.values(f).every((v) => typeof v === 'boolean')).toBe(true);
    expect(JSON.stringify(f)).not.toMatch(/SECRET|secret/);
    expect(buildConfigFlags({})).toEqual({ youtubeApiKeyConfigured: false, githubTokenConfigured: false, htmlCrawlerEnabled: false, legalCollectDisabled: false, collectOnStartup: true });
  });
});

describe('buildCollectorEntry', () => {
  it('legal: per-source results, saved count, masked errors', () => {
    const e = buildCollectorEntry('legal', {
      savedCount: 7, totalCount: 9,
      results: [
        { source: 'arxiv', success: true, count: 5, items: [{ title: 'x' }] },
        { source: 'github', success: false, count: 0, items: [], error: 'Error: 403 https://api.github.com/search?q=robot&token=abc' },
      ],
    }, ctx);
    expect(e).toMatchObject({ finishedAt: ctx.finishedAt, trigger: 'cron', ok: false, durationMs: 1235, saved: 7, errorCount: 1 });
    expect(e.bySource).toEqual([
      { source: 'arxiv', success: true, count: 5, error: null },
      { source: 'github', success: false, count: 0, error: expect.not.stringMatching(/token=|\?/) },
    ]);
    expect(JSON.stringify(e)).not.toContain('items');
  });

  it('arxiv hand/actuator: RunResult and the skipped case', () => {
    expect(buildCollectorEntry('arxivHand', { ran: true, inserted: 3, errors: [], elapsedMs: 10 }, ctx)).toMatchObject({ ok: true, saved: 3, errorCount: 0 });
    expect(buildCollectorEntry('arxivActuator', { ran: true, inserted: 0, errors: ['a', 'b'] }, ctx)).toMatchObject({ ok: false, errorCount: 2 });
    const skipped = buildCollectorEntry('arxivHand', { ran: false, reason: 'backfill running' }, ctx);
    expect(skipped).toMatchObject({ ok: null, saved: 0, skippedReason: 'backfill running' });
  });

  it('youtube: channel statuses, skipped channels, quota fields, at most 5 errors of 200 chars', () => {
    const errors = Array.from({ length: 9 }, (_, i) => `e${i} ${'x'.repeat(300)}`);
    const e = buildCollectorEntry('youtube', {
      channelsProcessed: 2, channelsSkipped: 1, skippedChannels: ['Ghost (@ghost)'], videosInserted: 4, errors, searchCalls: 2, quotaExhausted: true,
      channels: [{ name: 'A', official: true, status: 'ok', fetched: 10, inserted: 2 }, { name: 'Ghost', official: true, status: 'skipped', fetched: 0, inserted: 0 }],
    }, ctx);
    expect(e.errors).toHaveLength(5);
    expect(e.errors.every((x) => x.length <= 200)).toBe(true);
    expect(e.errorCount).toBe(9);
    expect(e).toMatchObject({ channelsProcessed: 2, channelsSkipped: 1, saved: 4, searchCalls: 2, quotaExhausted: true, skippedChannels: [{ name: 'Ghost (@ghost)' }] });
    expect(e.channels).toEqual([
      { name: 'A', official: true, status: 'ok', fetched: 10, inserted: 2 },
      { name: 'Ghost', official: true, status: 'skipped', fetched: 0, inserted: 0 },
    ]);
  });

  it('event/topic search: quota fields, estimate falls back to 100 units per call', () => {
    expect(buildCollectorEntry('eventSearch', { queriesRun: 3, videosInserted: 1, errors: [], searchCalls: 3, quotaExhausted: false, estimatedQuotaUnits: 300 }, ctx)).toMatchObject({ searchCalls: 3, estimatedQuotaUnits: 300, quotaExhausted: false, saved: 1 });
    expect(buildCollectorEntry('topicSearch', { searchCalls: 4, errors: ['q'], quotaExhausted: true }, ctx)).toMatchObject({ estimatedQuotaUnits: 400, quotaExhausted: true, ok: false });
  });

  it('is defensive about unknown shapes', () => {
    for (const key of ['legal', 'arxivHand', 'arxivActuator', 'youtube', 'eventSearch', 'topicSearch'] as const) {
      for (const bad of [null, undefined, 5, 'x', [], {}]) {
        const e = buildCollectorEntry(key, bad, ctx);
        expect(e.finishedAt).toBe(ctx.finishedAt);
        expect(typeof e.saved).toBe('number');
        expect(Array.isArray(e.errors)).toBe(true);
      }
    }
  });

  it('failure entry masks the message', () => {
    const e = buildFailureEntry(new Error('boom https://x.test/a?key=SECRET'), ctx);
    expect(e).toMatchObject({ ok: false, errorCount: 1, saved: 0 });
    expect(JSON.stringify(e)).not.toContain('SECRET');
  });
});

describe('writeCollectorSummary', () => {
  it('uses the collect:last key constant', () => {
    expect(COLLECT_LAST_KEY).toBe('collect:last');
  });

  it('updating one collector keeps the others (merge per collector)', async () => {
    const { store, writer } = memoryWriter();
    const legal = buildCollectorEntry('legal', { savedCount: 1, results: [] }, { ...ctx, trigger: 'cron' });
    const yt = buildCollectorEntry('youtube', { channelsProcessed: 1, errors: [] }, { ...ctx, trigger: 'startup' });
    await writeCollectorSummary('legal', legal, { writer, env: { DATABASE_URL: 'x' } });
    await writeCollectorSummary('youtube', yt, { writer, env: { DATABASE_URL: 'x', YOUTUBE_API_KEY: 'k' } });
    expect(Object.keys(store.summary!.collectors).sort()).toEqual(['legal', 'youtube']);
    expect(store.summary!.collectors.legal.trigger).toBe('cron');
    expect(store.summary!.collectors.youtube.trigger).toBe('startup');
    expect(store.summary!.schemaVersion).toBe(1);
    expect(store.summary!.config.youtubeApiKeyConfigured).toBe(true);
    // 같은 수집기를 다시 쓰면 그 항목만 교체된다
    await writeCollectorSummary('legal', { ...legal, saved: 99 }, { writer, env: { DATABASE_URL: 'x' } });
    expect(store.summary!.collectors.legal.saved).toBe(99);
    expect(store.summary!.collectors.youtube.trigger).toBe('startup');
    expect(JSON.stringify(store.summary)).not.toMatch(/"k"/);
  });

  it('never throws when the write or table creation fails, and logs a masked warning', async () => {
    const warn = vi.fn();
    const failing: SummaryWriter = { ensureTable: async () => { throw new Error('connect postgres://u:pw@h/db refused'); }, upsert: async () => {} };
    await expect(writeCollectorSummary('legal', {} as CollectorEntry, { writer: failing, env: { DATABASE_URL: 'x' }, warn })).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).not.toMatch(/pw|postgres:\/\//);
    const failing2: SummaryWriter = { ensureTable: async () => {}, upsert: async () => { throw new Error('disk'); } };
    await expect(writeCollectorSummary('legal', {} as CollectorEntry, { writer: failing2, env: { DATABASE_URL: 'x' }, warn: () => { throw new Error('logger down'); } })).resolves.toBe(false);
  });

  it('without DATABASE_URL and no injected writer it writes nothing and does not throw', async () => {
    await expect(writeCollectorSummary('legal', {} as CollectorEntry, { env: {} })).resolves.toBe(false);
  });
});

describe('trackCollector', () => {
  it('returns the collector result unchanged and records it', async () => {
    const { store, writer } = memoryWriter();
    const result = { channelsProcessed: 1, errors: [] as string[] };
    const out = await trackCollector('youtube', 'cron', async () => result, { writer, env: { DATABASE_URL: 'x' } });
    expect(out).toBe(result);
    expect(store.summary!.collectors.youtube.ok).toBe(true);
  });

  it('records a failure entry and rethrows the original error', async () => {
    const { store, writer } = memoryWriter();
    const err = new Error('collector down key=ABC');
    await expect(trackCollector('topicSearch', 'startup', async () => { throw err; }, { writer, env: { DATABASE_URL: 'x' } })).rejects.toBe(err);
    expect(store.summary!.collectors.topicSearch).toMatchObject({ ok: false, trigger: 'startup' });
    expect(JSON.stringify(store.summary)).not.toContain('ABC');
  });

  it('a failing summary write does not change the collector result or its error', async () => {
    const writer: SummaryWriter = { ensureTable: async () => { throw new Error('db down'); }, upsert: async () => {} };
    const opts = { writer, env: { DATABASE_URL: 'x' }, warn: () => {} };
    await expect(trackCollector('legal', 'cron', async () => ({ savedCount: 2, results: [] }), opts)).resolves.toEqual({ savedCount: 2, results: [] });
    const err = new Error('orig');
    await expect(trackCollector('legal', 'cron', async () => { throw err; }, opts)).rejects.toBe(err);
  });
});
