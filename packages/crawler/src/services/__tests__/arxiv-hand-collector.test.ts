import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetArxivRateLimiter } from '../arxiv-atom.js';
import { HAND_QUERIES, contentHashForArxivId, extractBaseArxivId } from '../arxiv-hand-query.js';
import {
  ArxivHandBusyError,
  ArxivHandCollector,
  buildHandArticleRow,
  parseRetryAfterMs,
  type HandArticleRow,
  type HandArticleStore,
  type HandMergeMeta,
} from '../arxiv-hand-collector.service.js';
import { parseArxivAtom } from '../arxiv-atom.js';

// ------------------------------------------------------------------
// 테스트 하네스
// ------------------------------------------------------------------

interface StoredRow {
  id: string;
  url: string;
  contentHash: string;
  meta: Record<string, unknown>;
  row?: HandArticleRow;
}

class MemStore implements HandArticleStore {
  rows: StoredRow[] = [];
  calls = { find: 0, insert: 0, merge: 0 };
  private seq = 0;

  seed(url: string, meta: Record<string, unknown> = {}) {
    this.rows.push({ id: `seed-${++this.seq}`, url, contentHash: contentHashForArxivId(url), meta });
  }

  async findExistingByBaseIds(baseIds: string[]) {
    this.calls.find++;
    const out = new Map<string, string[]>();
    for (const r of this.rows) {
      const base = extractBaseArxivId(r.url);
      if (base && baseIds.includes(base)) out.set(base, [...(out.get(base) ?? []), r.id]);
    }
    return out;
  }

  async insert(row: HandArticleRow) {
    this.calls.insert++;
    if (this.rows.some((r) => r.contentHash === row.contentHash)) return null;
    const id = `new-${++this.seq}`;
    this.rows.push({ id, url: row.url, contentHash: row.contentHash, meta: { ...row.extractedMetadata }, row });
    return id;
  }

  async mergeMeta(rowIds: string[], meta: HandMergeMeta) {
    this.calls.merge++;
    for (const r of this.rows) {
      if (!rowIds.includes(r.id)) continue;
      const topics = new Set<string>([...((r.meta.topics as string[]) ?? []), 'hand']);
      const qids = new Set<string>([...((r.meta.queryIds as string[]) ?? []), ...meta.queryIds]);
      r.meta = {
        ...r.meta,
        topicQuery: 'hand',
        topics: [...topics],
        queryIds: [...qids].sort(),
        handCollectedAt: meta.handCollectedAt,
      };
    }
  }
}

function entryXml(o: {
  id: string;
  title?: string;
  summary?: string;
  published?: string;
  cats?: string[];
}) {
  const cats = (o.cats ?? ['cs.RO']).map((c) => `<category term="${c}" scheme="x"/>`).join('');
  return `<entry><id>${o.id}</id><published>${o.published ?? '2026-03-02T10:00:00Z'}</published><title>${
    o.title ?? 'Dexterous robot hand control'
  }</title><summary>${o.summary ?? 'A study of dexterous hand grasping.'}</summary><author><name>A</name></author>${cats}</entry>`;
}

function feedXml(entries: string[], total = entries.length) {
  return `<?xml version="1.0"?><feed xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"><opensearch:totalResults>${total}</opensearch:totalResults>${entries.join('')}</feed>`;
}

const ok = (xml: string) => new Response(xml, { status: 200 });

function qidOf(url: string): string {
  const sq = new URL(url).searchParams.get('search_query')!;
  return HAND_QUERIES.find((q) => sq.startsWith(`(${q.query})`))!.id;
}

function rangeOf(url: string): { start: Date; end: Date } | null {
  const sq = new URL(url).searchParams.get('search_query')!;
  const m = sq.match(/submittedDate:\[(\d{12}) TO (\d{12})\]/);
  if (!m) return null;
  const p = (s: string) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12)));
  return { start: p(m[1]!), end: p(m[2]!) };
}

const FINAL_LINE = /^\[ArxivHand\] (backfill|daily): queries (\d+), fetched (\d+), relevant (\d+), inserted (\d+), skipped (\d+)$/;

let t: number;
let sleeps: number[];
let logs: string[];

function makeCollector(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, store: MemStore) {
  const fetchMock = vi.fn(fetchImpl);
  const collector = new ArxivHandCollector({
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
    now: () => t,
    store,
  });
  return { collector, fetchMock };
}

beforeEach(() => {
  resetArxivRateLimiter();
  t = Date.UTC(2026, 2, 20, 12, 0, 0); // 2026-03-20 12:00 UTC
  sleeps = [];
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const V1 = 'http://arxiv.org/abs/2503.00001v1';
const V2 = 'http://arxiv.org/abs/2503.00001v2';
const IRRELEVANT = entryXml({ id: 'http://arxiv.org/abs/2503.00002v1', title: 'Quadruped locomotion', summary: 'Legged gaits.' });

// ------------------------------------------------------------------

describe('row builder', () => {
  it('builds the stored row per spec', () => {
    const feed = parseArxivAtom(
      feedXml([
        entryXml({
          id: V2,
          title: 'Dexterous   hand',
          summary: 'y'.repeat(900),
          published: '2026-03-02T10:00:00Z',
        }).replace('<author><name>A</name></author>', ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => `<author><name>${n}</name></author>`).join('')),
      ])
    );
    const row = buildHandArticleRow(feed.entries[0]!, ['q1', 'q3'], '2026-03-20T12:00:00.000Z');
    expect(row.contentHash).toBe(contentHashForArxivId(V2));
    expect(row.contentHash).toMatch(/^[0-9a-f]{32}$/);
    expect(row.url).toBe(V2);
    expect(row.source).toBe('arxiv');
    expect(row.category).toBe('technology');
    expect(row.language).toBe('en');
    expect(row.productType).toBeNull();
    expect(row.publishedAt?.toISOString()).toBe('2026-03-02T10:00:00.000Z');
    expect(row.summary.length).toBeLessThanOrEqual(500);
    expect(row.title).toBe('Dexterous hand');
    expect(row.extractedMetadata).toEqual({
      domain: 'paper',
      topicQuery: 'hand',
      topics: ['hand'],
      arxivId: '2503.00001',
      arxivVersion: 'v2',
      primaryCategory: 'cs.RO',
      categories: ['cs.RO'],
      authors: ['A', 'B', 'C', 'D', 'E'],
      queryIds: ['q1', 'q3'],
      handCollectedAt: '2026-03-20T12:00:00.000Z',
      collector: 'arxiv-hand',
    });
  });

  it('sets publishedAt to null when published is unparsable', () => {
    const feed = parseArxivAtom(feedXml([entryXml({ id: V1, published: 'garbage' })]));
    expect(buildHandArticleRow(feed.entries[0]!, ['q1'], 'x').publishedAt).toBeNull();
  });
});

describe('parseRetryAfterMs', () => {
  it('parses seconds, caps at 60s, and rejects junk', () => {
    expect(parseRetryAfterMs('10', 0)).toBe(10_000);
    expect(parseRetryAfterMs('999', 0)).toBe(60_000);
    expect(parseRetryAfterMs(null, 0)).toBeNull();
    expect(parseRetryAfterMs('soon', 0)).toBeNull();
    expect(parseRetryAfterMs(new Date(5000).toUTCString(), 0)).toBe(5000);
  });
});

describe('idempotency', () => {
  it('daily: second run inserts nothing, and dedupes across queries while merging queryIds', async () => {
    const store = new MemStore();
    const xml = feedXml([entryXml({ id: V1 }), IRRELEVANT]);
    const { collector } = makeCollector(async () => ok(xml), store);

    const first = await collector.collectDaily();
    expect(first.ran).toBe(true);
    if (!first.ran) return;
    expect(first.queries).toBe(4);
    expect(first.fetched).toBe(2); // 4개 쿼리에 걸쳐 중복 제거
    expect(first.relevant).toBe(1);
    expect(first.inserted).toBe(1);
    expect(first.skipped).toBe(0);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]!.meta.queryIds).toEqual(['q1', 'q2', 'q3', 'q4']);

    const second = await collector.collectDaily();
    if (!second.ran) throw new Error('unexpected');
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.relevant).toBe(1);
    expect(store.rows).toHaveLength(1);
  });

  it('does not insert a v2 id when v1 is stored; merges meta and keeps aiSummaryKo', async () => {
    const store = new MemStore();
    store.seed(V1, { aiSummaryKo: '한국어 요약', aiSummaryKoGeneratedAt: '2026-03-01' });
    const { collector } = makeCollector(async () => ok(feedXml([entryXml({ id: V2 })])), store);

    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.relevant).toBe(1);
    expect(store.calls.insert).toBe(0);
    expect(store.rows).toHaveLength(1);
    const meta = store.rows[0]!.meta;
    expect(meta.aiSummaryKo).toBe('한국어 요약');
    expect(meta.aiSummaryKoGeneratedAt).toBe('2026-03-01');
    expect(meta.topicQuery).toBe('hand');
    expect(meta.topics).toEqual(['hand']);
    expect(meta.queryIds).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(meta.handCollectedAt).toBeTruthy();
  });

  it('also dedupes http vs https stored URLs', async () => {
    const store = new MemStore();
    store.seed('https://arxiv.org/abs/2503.00001v3');
    const { collector } = makeCollector(async () => ok(feedXml([entryXml({ id: V1 })])), store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe(1);
  });

  it('backfill: second run inserts nothing', async () => {
    const store = new MemStore();
    const { collector } = makeCollector(async () => ok(feedXml([entryXml({ id: V1 })])), store);
    const a = await collector.backfill({ months: 1, dryRun: false });
    expect(a.inserted).toBe(1);
    const b = await collector.backfill({ months: 1, dryRun: false });
    expect(b.inserted).toBe(0);
    expect(b.skipped).toBe(1);
  });

  it('inserts with the stored row shape and a Date publishedAt', async () => {
    const store = new MemStore();
    const { collector } = makeCollector(async () => ok(feedXml([entryXml({ id: V2, summary: 'z'.repeat(700) })])), store);
    await collector.collectDaily();
    const row = store.rows[0]!.row!;
    expect(row.contentHash).toBe(contentHashForArxivId(V2));
    expect(row.summary).toHaveLength(500);
    expect(row.extractedMetadata).toMatchObject({ domain: 'paper', topicQuery: 'hand', collector: 'arxiv-hand' });
  });
});

describe('dryRun', () => {
  it('performs requests, filtering and lookup but never writes', async () => {
    const store = new MemStore();
    store.seed(V1);
    const xml = feedXml([
      entryXml({ id: V1 }),
      entryXml({ id: 'http://arxiv.org/abs/2503.00009v1', title: 'Gripper design' }),
      IRRELEVANT,
    ]);
    const { collector, fetchMock } = makeCollector(async () => ok(xml), store);
    const r = await collector.backfill({ months: 1, dryRun: true });

    expect(fetchMock).toHaveBeenCalledTimes(2 * 4); // 2 windows x 4 queries
    expect(store.calls.insert).toBe(0);
    expect(store.calls.merge).toBe(0);
    expect(store.calls.find).toBeGreaterThan(0);
    expect(store.rows).toHaveLength(1);
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.wouldInsert).toBe(1);
    expect(r.relevant).toBe(2);
    expect(r.dryRun).toBe(true);
    expect(logs.some((l) => FINAL_LINE.test(l))).toBe(true);
    expect(logs.some((l) => l.includes('would-insert 1'))).toBe(true);
  });
});

describe('backoff and retries', () => {
  it('503, 503, 200 -> 3 attempts with 6s then 12s waits', async () => {
    const store = new MemStore();
    let call = 0;
    const { collector, fetchMock } = makeCollector(async () => {
      call++;
      return call <= 2 ? new Response('busy', { status: 503 }) : ok(feedXml([entryXml({ id: V1 })]));
    }, store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(fetchMock).toHaveBeenCalledTimes(2 + 4);
    expect(sleeps.slice(0, 2)).toEqual([6000, 12000]);
    expect(r.queries).toBe(4);
    expect(r.errors).toEqual([]);
    expect(logs.some((l) => l.includes('retry 1/2 in 6000ms (HTTP 503) daily q1'))).toBe(true);
    expect(logs.some((l) => l.includes('retry 2/2 in 12000ms (HTTP 503) daily q1'))).toBe(true);
  });

  it('three failures are recorded without throwing and the next query continues', async () => {
    const store = new MemStore();
    const { collector, fetchMock } = makeCollector(async (url) => {
      return qidOf(url) === 'q2' ? new Response('busy', { status: 503 }) : ok(feedXml([entryXml({ id: V1 })]));
    }, store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(fetchMock).toHaveBeenCalledTimes(3 + 3);
    expect(r.queries).toBe(3);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('daily q2');
    expect(r.errors[0]).toContain('HTTP 503');
    expect(store.rows).toHaveLength(1);
  });

  it('retries network errors', async () => {
    const store = new MemStore();
    let call = 0;
    const { collector } = makeCollector(async () => {
      call++;
      if (call === 1) throw new Error('ECONNRESET');
      return ok(feedXml([]));
    }, store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(sleeps[0]).toBe(6000);
    expect(r.queries).toBe(4);
    expect(r.errors).toEqual([]);
  });

  it('honors Retry-After on 429 (capped at 60s)', async () => {
    const store = new MemStore();
    let call = 0;
    const { collector } = makeCollector(async () => {
      call++;
      if (call === 1) return new Response('slow down', { status: 429, headers: { 'Retry-After': '10' } });
      if (call === 2) return new Response('slow down', { status: 429, headers: { 'Retry-After': '999' } });
      return ok(feedXml([]));
    }, store);
    await collector.collectDaily();
    expect(sleeps.slice(0, 2)).toEqual([10_000, 60_000]);
  });

  it('does not retry other 4xx', async () => {
    const store = new MemStore();
    const { collector, fetchMock } = makeCollector(async (url) => {
      return qidOf(url) === 'q1' ? new Response('bad', { status: 400 }) : ok(feedXml([]));
    }, store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(r.queries).toBe(3);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('HTTP 400');
    expect(sleeps.filter((s) => s === 6000)).toEqual([]);
  });

  it('treats a 200 response containing an error entry as a retryable failure', async () => {
    const store = new MemStore();
    const errXml = feedXml([
      '<entry><id>http://arxiv.org/api/errors#bad_query</id><title>Error</title><summary>bad query</summary></entry>',
    ]);
    let call = 0;
    const { collector } = makeCollector(async () => {
      call++;
      return call === 1 ? ok(errXml) : ok(feedXml([entryXml({ id: V1 })]));
    }, store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(sleeps[0]).toBe(6000);
    expect(r.queries).toBe(4);
    expect(store.rows).toHaveLength(1); // 에러 entry 는 저장되지 않는다
    expect(store.rows.every((x) => x.url.includes('/abs/'))).toBe(true);
  });
});

describe('rate limiting and serialization', () => {
  it('spaces requests by at least 3000ms and never has two in flight', async () => {
    const store = new MemStore();
    const times: number[] = [];
    let inflight = 0;
    let maxInflight = 0;
    const { collector } = makeCollector(async () => {
      times.push(t);
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setImmediate(r));
      inflight--;
      return ok(feedXml([]));
    }, store);
    await collector.collectDaily();
    await collector.backfill({ months: 1, dryRun: true });
    expect(times.length).toBe(4 + 8);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(3000);
    expect(maxInflight).toBe(1);
  });

  it('sends the User-Agent and only talks to export.arxiv.org over https', async () => {
    const store = new MemStore();
    const { collector, fetchMock } = makeCollector(async () => ok(feedXml([])), store);
    await collector.collectDaily();
    for (const call of fetchMock.mock.calls) {
      const u = new URL(call[0] as string);
      expect(u.protocol).toBe('https:');
      expect(u.hostname).toBe('export.arxiv.org');
      expect((call[1]!.headers as Record<string, string>)['User-Agent']).toBe('RCIPBot/1.0');
      expect(u.searchParams.get('sortOrder')).toBe('descending');
      expect(u.searchParams.get('max_results')).toBe('100');
      expect(u.searchParams.get('search_query')).not.toContain('submittedDate');
    }
    expect(fetchMock.mock.calls.map((c) => qidOf(c[0] as string))).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});

describe('backfill traversal', () => {
  it('goes newest month to oldest with ascending order and date ranges', async () => {
    const store = new MemStore();
    const { collector, fetchMock } = makeCollector(async () => ok(feedXml([])), store);
    await collector.backfill({ months: 1, dryRun: true });
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls).toHaveLength(8);
    const firstWindow = rangeOf(urls[0]!)!;
    const lastWindow = rangeOf(urls[7]!)!;
    expect(firstWindow.start.toISOString()).toBe('2026-03-01T00:00:00.000Z'); // 최신 월 먼저
    expect(lastWindow.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(urls.slice(0, 4).map(qidOf)).toEqual(['q1', 'q2', 'q3', 'q4']);
    for (const u of urls) expect(new URL(u).searchParams.get('sortOrder')).toBe('ascending');
  });

  it('pages through results 100 at a time', async () => {
    const store = new MemStore();
    const { collector, fetchMock } = makeCollector(async (url) => {
      const start = Number(new URL(url).searchParams.get('start'));
      const rng = rangeOf(url)!;
      if (qidOf(url) !== 'q1' || rng.start.getUTCMonth() !== 1) return ok(feedXml([]));
      return ok(feedXml([entryXml({ id: `http://arxiv.org/abs/2502.${String(10000 + start)}v1` })], 250));
    }, store);
    const r = await collector.backfill({ months: 1, dryRun: false });
    const q1Feb = fetchMock.mock.calls
      .map((c) => c[0] as string)
      .filter((u) => qidOf(u) === 'q1' && rangeOf(u)!.start.getUTCMonth() === 1);
    expect(q1Feb.map((u) => Number(new URL(u).searchParams.get('start')))).toEqual([0, 100, 200]);
    expect(r.inserted).toBe(3);
    expect(logs.some((l) => /backfill 2026-02 q1 page 2\/3: fetched 1, relevant 1, inserted 1, skipped 0/.test(l))).toBe(true);
  });

  it('bisects a window when totalResults > 1000 and flags truncation at 1 day', async () => {
    const store = new MemStore();
    const day = Date.UTC(2026, 2, 5);
    let seq = 0;
    const { collector, fetchMock } = makeCollector(async (url) => {
      const rng = rangeOf(url)!;
      const containsDay = rng.start.getTime() <= day && day < rng.end.getTime();
      if (qidOf(url) === 'q1' && containsDay) {
        return ok(feedXml([entryXml({ id: `http://arxiv.org/abs/2603.${String(20000 + seq++)}v1` })], 1500));
      }
      return ok(feedXml([], 5));
    }, store);
    const r = await collector.backfill({ months: 1, dryRun: false });

    expect(logs.some((l) => /window 2026-03 q1 totalResults 1500 > 1000, bisecting/.test(l))).toBe(true);
    expect(r.truncatedWindows).toBe(1);
    expect(r.errors.some((e) => e.startsWith('truncated:'))).toBe(true);
    const q1Urls = fetchMock.mock.calls.map((c) => c[0] as string).filter((u) => qidOf(u) === 'q1');
    // 쪼개진 하위 윈도우 요청이 존재한다
    expect(q1Urls.some((u) => rangeOf(u)!.end.getTime() - rangeOf(u)!.start.getTime() === 86_400_000)).toBe(true);
    // 상한 도달 시 start 는 900 까지만
    const starts = q1Urls.map((u) => Number(new URL(u).searchParams.get('start')));
    expect(Math.max(...starts)).toBe(900);
  });
});

describe('locking', () => {
  it('rejects a second backfill and skips daily while a backfill is running', async () => {
    const store = new MemStore();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { collector } = makeCollector(async () => {
      await gate;
      return ok(feedXml([]));
    }, store);

    const started = collector.startBackfill({ months: 12, dryRun: true });
    expect(started).toMatchObject({
      started: true,
      months: 12,
      dryRun: true,
      windows: 13,
      queries: 4,
      estimatedRequests: 130,
      estimatedMinutes: 13,
    });
    expect(collector.isRunning()).toBe(true);

    const second = collector.startBackfill({ months: 1, dryRun: false });
    expect(second.started).toBe(false);
    if (!second.started) {
      expect(second.startedAt).toBeTruthy();
      expect(second.progress.running).toBe(true);
    }
    await expect(collector.backfill({ months: 1, dryRun: false })).rejects.toBeInstanceOf(ArxivHandBusyError);

    const daily = await collector.collectDaily();
    expect(daily).toEqual({ ran: false, reason: 'backfill running' });
    expect(logs).toContain('[ArxivHand] daily skipped: backfill running');

    release();
    for (let i = 0; i < 500 && collector.isRunning(); i++) await new Promise((r) => setImmediate(r));
    expect(collector.isRunning()).toBe(false);
    const status = collector.getStatus();
    expect(status.running).toBe(false);
    expect(status.finishedAt).toBeTruthy();
    expect(status.requests).toBe(13 * 4);

    // 잠금 해제 후에는 다시 시작 가능
    expect(collector.startBackfill({ months: 1, dryRun: true }).started).toBe(true);
    for (let i = 0; i < 500 && collector.isRunning(); i++) await new Promise((r) => setImmediate(r));
  });

  it('releases the lock even when everything fails', async () => {
    const store = new MemStore();
    const { collector } = makeCollector(async () => new Response('x', { status: 400 }), store);
    const r = await collector.backfill({ months: 1, dryRun: true });
    expect(r.queries).toBe(0);
    expect(r.errors.length).toBe(8);
    expect(collector.isRunning()).toBe(false);
  });
});

describe('log format', () => {
  it('prints exactly one final line and inserted + skipped = relevant (backfill)', async () => {
    const store = new MemStore();
    store.seed('http://arxiv.org/abs/2503.00011v1');
    const { collector } = makeCollector(
      async (url) =>
        ok(
          feedXml([
            entryXml({ id: 'http://arxiv.org/abs/2503.00011v2' }),
            entryXml({ id: `http://arxiv.org/abs/2503.0002${qidOf(url).slice(1)}v1`, title: 'Gripper' }),
            entryXml({ id: 'http://arxiv.org/abs/2503.00030v1', title: 'Tactile finger sensor' }),
            IRRELEVANT,
          ])
        ),
      store
    );
    const r = await collector.backfill({ months: 1, dryRun: false });
    const finals = logs.filter((l) => FINAL_LINE.test(l));
    expect(finals).toHaveLength(1);
    const m = finals[0]!.match(FINAL_LINE)!;
    expect(m[1]).toBe('backfill');
    const [queries, fetched, relevant, inserted, skipped] = m.slice(2).map(Number) as [number, number, number, number, number];
    expect(inserted + skipped).toBe(relevant);
    expect(queries).toBe(8);
    expect(relevant).toBeLessThanOrEqual(fetched);
    expect({ queries, fetched, relevant, inserted, skipped }).toEqual({
      queries: r.queries,
      fetched: r.fetched,
      relevant: r.relevant,
      inserted: r.inserted,
      skipped: r.skipped,
    });
    expect(skipped).toBeGreaterThanOrEqual(1);
    expect(logs.some((l) => /^\[ArxivHand\] backfill: merged \d+ existing rows, errors \d+, truncatedWindows \d+, elapsed \d+s$/.test(l))).toBe(true);
  });

  it('uses the same fields with a daily: prefix', async () => {
    const store = new MemStore();
    const { collector } = makeCollector(async () => ok(feedXml([entryXml({ id: V1 })])), store);
    await collector.collectDaily();
    const finals = logs.filter((l) => FINAL_LINE.test(l));
    expect(finals).toHaveLength(1);
    expect(finals[0]).toBe('[ArxivHand] daily: queries 4, fetched 1, relevant 1, inserted 1, skipped 0');
  });

  it('keeps inserted + skipped = relevant when an insert throws', async () => {
    const store = new MemStore();
    const origInsert = store.insert.bind(store);
    let n = 0;
    store.insert = async (row) => {
      if (n++ === 0) throw new Error('db down');
      return origInsert(row);
    };
    const xml = feedXml([entryXml({ id: V1 }), entryXml({ id: 'http://arxiv.org/abs/2503.00040v1', title: 'Gripper' })]);
    const { collector } = makeCollector(async () => ok(xml), store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(r.errors.some((e) => e.includes('db down'))).toBe(true);
    expect(r.inserted + r.skipped).toBe(r.relevant);
  });
});
