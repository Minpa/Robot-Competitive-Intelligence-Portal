import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseArxivAtom, resetArxivRateLimiter } from '../arxiv-atom.js';
import { ACTUATOR_QUERIES } from '../arxiv-domain-query.js';
import { HAND_QUERIES, contentHashForArxivId, extractBaseArxivId } from '../arxiv-hand-query.js';
import {
  ArxivHandCollector,
  ArxivTopicCollector,
  arxivTopicCollectors,
  buildDomainArticleRow,
  buildHandArticleRow,
  type DomainMergeMeta,
  type HandArticleRow,
  type HandArticleStore,
} from '../arxiv-hand-collector.service.js';

// ------------------------------------------------------------------
// 하네스 — 도메인 병합 메타(collectedAt / topicQuery 유지)를 그대로 기록하는 메모리 저장소
// ------------------------------------------------------------------

interface StoredRow {
  id: string;
  url: string;
  contentHash: string;
  meta: Record<string, unknown>;
}

class MemStore implements HandArticleStore {
  rows: StoredRow[] = [];
  merges: DomainMergeMeta[] = [];
  private seq = 0;

  seed(url: string, meta: Record<string, unknown> = {}) {
    this.rows.push({ id: `seed-${++this.seq}`, url, contentHash: contentHashForArxivId(url), meta });
  }

  async findExistingByBaseIds(baseIds: string[]) {
    const out = new Map<string, string[]>();
    for (const r of this.rows) {
      const base = extractBaseArxivId(r.url);
      if (base && baseIds.includes(base)) out.set(base, [...(out.get(base) ?? []), r.id]);
    }
    return out;
  }

  async insert(row: HandArticleRow) {
    if (this.rows.some((r) => r.contentHash === row.contentHash)) return null;
    const id = `new-${++this.seq}`;
    this.rows.push({ id, url: row.url, contentHash: row.contentHash, meta: { ...row.extractedMetadata } });
    return id;
  }

  /** Drizzle 저장소의 SQL 과 같은 규칙: topicQuery 는 기존 값 유지, topics/queryIds 합집합, {domain}CollectedAt 기록 */
  async mergeMeta(rowIds: string[], meta: DomainMergeMeta) {
    this.merges.push(meta);
    for (const r of this.rows) {
      if (!rowIds.includes(r.id)) continue;
      const topics = new Set<string>([...((r.meta.topics as string[]) ?? []), meta.domain]);
      const qids = new Set<string>([...((r.meta.queryIds as string[]) ?? []), ...meta.queryIds]);
      r.meta = {
        ...r.meta,
        topicQuery: (r.meta.topicQuery as string | undefined) ?? meta.domain,
        topics: [...topics],
        queryIds: [...qids].sort(),
        [`${meta.domain}CollectedAt`]: meta.collectedAt,
      };
    }
  }
}

function entryXml(o: { id: string; title?: string; summary?: string; cats?: string[] }) {
  const cats = (o.cats ?? ['cs.RO']).map((c) => `<category term="${c}" scheme="x"/>`).join('');
  return `<entry><id>${o.id}</id><published>2026-03-02T10:00:00Z</published><title>${
    o.title ?? 'Quasi-direct-drive actuator for humanoid joints'
  }</title><summary>${o.summary ?? 'A high torque density motor with a planetary gearbox.'}</summary><author><name>A</name></author>${cats}</entry>`;
}

function feedXml(entries: string[], total = entries.length) {
  return `<?xml version="1.0"?><feed xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"><opensearch:totalResults>${total}</opensearch:totalResults>${entries.join('')}</feed>`;
}

const ok = (xml: string) => new Response(xml, { status: 200 });

function queryOf(url: string): string {
  return new URL(url).searchParams.get('search_query')!;
}

let t: number;
let logs: string[];

function makeCollector(domain: 'hand' | 'actuator', fetchImpl: (url: string) => Promise<Response>, store: MemStore) {
  const fetchMock = vi.fn(fetchImpl);
  const collector = new ArxivTopicCollector({
    domain,
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async (ms) => {
      t += ms;
    },
    now: () => t,
    store,
  });
  return { collector, fetchMock };
}

beforeEach(() => {
  resetArxivRateLimiter();
  t = Date.UTC(2026, 2, 20, 12, 0, 0);
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const V1 = 'http://arxiv.org/abs/2503.00001v1';
const HAND_ENTRY = entryXml({ id: 'http://arxiv.org/abs/2503.00002v1', title: 'Dexterous robot hand', summary: 'Grasping.' });

describe('domain row builder', () => {
  it('builds the actuator row with domain-specific topic meta and the same shape as hand', () => {
    const feed = parseArxivAtom(feedXml([entryXml({ id: V1 })]));
    const row = buildDomainArticleRow('actuator', feed.entries[0]!, ['q1', 'q3'], '2026-03-20T12:00:00.000Z');
    expect(row.contentHash).toBe(contentHashForArxivId(V1));
    expect(row.source).toBe('arxiv');
    expect(row.category).toBe('technology');
    expect(row.productType).toBeNull();
    expect(row.extractedMetadata).toEqual({
      domain: 'paper',
      topicQuery: 'actuator',
      topics: ['actuator'],
      arxivId: '2503.00001',
      arxivVersion: 'v1',
      primaryCategory: 'cs.RO',
      categories: ['cs.RO'],
      authors: ['A'],
      queryIds: ['q1', 'q3'],
      actuatorCollectedAt: '2026-03-20T12:00:00.000Z',
      collector: 'arxiv-actuator',
    });
  });

  it("buildDomainArticleRow('hand') is identical to buildHandArticleRow", () => {
    const feed = parseArxivAtom(feedXml([entryXml({ id: V1, title: 'Robot hand' })]));
    expect(buildDomainArticleRow('hand', feed.entries[0]!, ['q2'], 'x')).toEqual(buildHandArticleRow(feed.entries[0]!, ['q2'], 'x'));
  });
});

describe('actuator collector', () => {
  it('defaults to hand (ArxivHandCollector alias) and exposes per-domain singletons', () => {
    expect(new ArxivHandCollector().domain).toBe('hand');
    expect(new ArxivTopicCollector().queries).toBe(HAND_QUERIES);
    expect(arxivTopicCollectors.hand.domain).toBe('hand');
    expect(arxivTopicCollectors.actuator.domain).toBe('actuator');
    expect(arxivTopicCollectors.actuator.queries).toBe(ACTUATOR_QUERIES);
    expect(arxivTopicCollectors.hand).not.toBe(arxivTopicCollectors.actuator);
  });

  it('daily: sends the four actuator queries, keeps only actuator-relevant papers, logs with the actuator tag', async () => {
    const store = new MemStore();
    const xml = feedXml([entryXml({ id: V1 }), HAND_ENTRY]);
    const { collector, fetchMock } = makeCollector('actuator', async () => ok(xml), store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');

    const queries = fetchMock.mock.calls.map((c) => queryOf(c[0] as string));
    expect(queries).toEqual(ACTUATOR_QUERIES.map((q) => `(${q.query})`));
    for (const c of fetchMock.mock.calls) {
      const u = new URL(c[0] as string);
      expect(u.protocol).toBe('https:');
      expect(u.hostname).toBe('export.arxiv.org');
    }
    expect(r.queries).toBe(4);
    expect(r.fetched).toBe(2);
    expect(r.relevant).toBe(1);
    expect(r.inserted).toBe(1);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]!.meta).toMatchObject({ topicQuery: 'actuator', topics: ['actuator'], collector: 'arxiv-actuator' });
    expect(store.rows[0]!.meta.queryIds).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(logs).toContain('[ArxivActuator] daily: queries 4, fetched 2, relevant 1, inserted 1, skipped 0');
    expect(logs.some((l) => l.startsWith('[ArxivHand]'))).toBe(false);
  });

  it('merges into a paper the hand collector stored first: topicQuery stays hand, topics gains actuator', async () => {
    const store = new MemStore();
    store.seed(V1, { topicQuery: 'hand', topics: ['hand'], queryIds: ['q1'], handCollectedAt: '2026-03-01', aiSummaryKo: '요약' });
    const { collector } = makeCollector('actuator', async () => ok(feedXml([entryXml({ id: 'http://arxiv.org/abs/2503.00001v2' })])), store);
    const r = await collector.collectDaily();
    if (!r.ran) throw new Error('unexpected');
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe(1);
    expect(store.rows).toHaveLength(1);
    const meta = store.rows[0]!.meta;
    expect(meta.topicQuery).toBe('hand');
    expect(meta.topics).toEqual(['hand', 'actuator']);
    expect(meta.aiSummaryKo).toBe('요약');
    expect(meta.handCollectedAt).toBe('2026-03-01');
    expect(meta.actuatorCollectedAt).toBeTruthy();
    expect(store.merges.every((m) => m.domain === 'actuator' && m.collectedAt === m.handCollectedAt)).toBe(true);
  });

  it('hand and actuator instances lock independently but share the 3s rate limiter', async () => {
    const store = new MemStore();
    const times: number[] = [];
    let inflight = 0;
    let maxInflight = 0;
    const impl = async () => {
      times.push(t);
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setImmediate(r));
      inflight--;
      return ok(feedXml([]));
    };
    const hand = makeCollector('hand', impl, store).collector;
    const act = makeCollector('actuator', impl, store).collector;
    const [h, a] = await Promise.all([hand.collectDaily(), act.collectDaily()]);
    expect(h.ran).toBe(true);
    expect(a.ran).toBe(true); // 도메인별 잠금이 독립 — 동시에 실행 가능
    expect(times).toHaveLength(8);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(3000);
    expect(maxInflight).toBe(1);
  });

  it('backfill plan reports the actuator query count', () => {
    const store = new MemStore();
    const { collector } = makeCollector('actuator', async () => ok(feedXml([])), store);
    const started = collector.startBackfill({ months: 1, dryRun: true });
    expect(started).toMatchObject({ started: true, queries: 4, windows: 2, estimatedRequests: 20 });
  });
});
