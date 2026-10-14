import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  ARXIV_MIN_INTERVAL_MS,
  decodeXmlEntities,
  markArxivRequestDone,
  parseArxivAtom,
  parseRawArxivEntries,
  resetArxivRateLimiter,
  splitArxivId,
  waitArxivTurn,
} from '../arxiv-atom.js';
import { ArxivCollector } from '../legal-data-collector.js';

const HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <title type="html">ArXiv Query</title>
  <id>http://arxiv.org/api/abc</id>
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">%TOTAL%</opensearch:totalResults>
  <opensearch:startIndex xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:startIndex>
`;

const E1 = `  <entry>
    <id>http://arxiv.org/abs/2503.01234v2</id>
    <updated>2026-03-05T10:00:00Z</updated>
    <published>2026-03-01T12:30:00Z</published>
    <title>Dexterous   Hand
      Control &amp; Learning</title>
    <summary>  We study a robot hand &lt;5 fingers&gt;.
      It uses &quot;tactile&quot; sensing &#39;well&#39;.
    </summary>
    <author><name>Alice Kim</name></author>
    <author><name>Bob Lee</name></author>
    <author><name>Carol  Park</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.RO" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.RO" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
`;

const E2 = `  <entry>
    <id>http://arxiv.org/abs/cs/0501001v1</id>
    <published>2005-01-02T00:00:00Z</published>
    <title>Old style paper</title>
    <summary>${'x'.repeat(800)}</summary>
    <author><name>Dan Old</name></author>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
`;

const ERR = `  <entry>
    <id>http://arxiv.org/api/errors#incorrect_id_format_for_1234</id>
    <title>Error</title>
    <summary>incorrect id format for 1234</summary>
    <updated>2026-03-01T00:00:00Z</updated>
    <author><name>arXiv api core</name></author>
  </entry>
`;

const feed = (entries: string[], total = entries.length) =>
  HEADER.replace('%TOTAL%', String(total)) + entries.join('') + '</feed>';

describe('splitArxivId', () => {
  it('splits version off new and old style IDs', () => {
    expect(splitArxivId('http://arxiv.org/abs/2503.01234v2')).toEqual({ arxivId: '2503.01234', version: 'v2' });
    expect(splitArxivId('https://arxiv.org/abs/2503.01234')).toEqual({ arxivId: '2503.01234', version: null });
    expect(splitArxivId('http://arxiv.org/abs/cs/0501001v1')).toEqual({ arxivId: 'cs/0501001', version: 'v1' });
    expect(splitArxivId('http://arxiv.org/api/errors#x')).toBeNull();
  });
});

describe('decodeXmlEntities', () => {
  it('decodes basic entities without double-decoding', () => {
    expect(decodeXmlEntities('a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;')).toBe(`a & b < c > d "e" 'f'`);
    expect(decodeXmlEntities('&amp;lt;')).toBe('&lt;');
  });
});

describe('parseArxivAtom', () => {
  it('parses two normal entries with all fields', () => {
    const r = parseArxivAtom(feed([E1, E2], 1240));
    expect(r.hasError).toBe(false);
    expect(r.totalResults).toBe(1240);
    expect(r.entries).toHaveLength(2);

    const a = r.entries[0]!;
    expect(a.id).toBe('http://arxiv.org/abs/2503.01234v2');
    expect(a.arxivId).toBe('2503.01234');
    expect(a.arxivVersion).toBe('v2');
    expect(a.published).toBe('2026-03-01T12:30:00Z');
    expect(a.authors).toEqual(['Alice Kim', 'Bob Lee', 'Carol Park']);
    expect(a.categories).toEqual(['cs.RO', 'cs.LG']);
    expect(a.primaryCategory).toBe('cs.RO');

    const b = r.entries[1]!;
    expect(b.arxivId).toBe('cs/0501001');
    expect(b.arxivVersion).toBe('v1');
    expect(b.primaryCategory).toBe('cs.AI'); // primary_category 태그 없으면 첫 카테고리
  });

  it('normalizes whitespace/newlines in title and summary and decodes entities', () => {
    const a = parseArxivAtom(feed([E1])).entries[0]!;
    expect(a.title).toBe('Dexterous Hand Control & Learning');
    expect(a.summary).toBe(`We study a robot hand <5 fingers>. It uses "tactile" sensing 'well'.`);
  });

  it('cuts the summary at 500 characters', () => {
    const b = parseArxivAtom(feed([E2])).entries[0]!;
    expect(b.summary).toHaveLength(500);
  });

  it('returns zero entries and totalResults 0 for an empty feed', () => {
    const r = parseArxivAtom(feed([], 0));
    expect(r.entries).toEqual([]);
    expect(r.totalResults).toBe(0);
    expect(r.hasError).toBe(false);
  });

  it('flags error entries, excludes them, and keeps the real ones', () => {
    const only = parseArxivAtom(feed([ERR], 1));
    expect(only.hasError).toBe(true);
    expect(only.entries).toEqual([]);
    expect(only.errorMessage).toContain('incorrect id format');

    const mixed = parseArxivAtom(feed([ERR, E1]));
    expect(mixed.hasError).toBe(true);
    expect(mixed.entries).toHaveLength(1);
  });

  it('returns null totalResults when the header is missing', () => {
    expect(parseArxivAtom('<feed></feed>').totalResults).toBeNull();
  });
});

describe('ArxivCollector output equivalence (refactor invariance)', () => {
  const xml = feed([E1, E2]);

  /** 리팩터링 전 ArxivCollector.parse 의 로직 그대로 (기준 구현) */
  function legacyParse(src: string) {
    const tag = (x: string, name: string): string | null => {
      const m = x.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
      return m && m[1] ? m[1] : null;
    };
    const items: Array<Record<string, unknown>> = [];
    const regex = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while ((m = regex.exec(src)) !== null) {
      const entry = m[1] ?? '';
      const id = tag(entry, 'id');
      const title = tag(entry, 'title');
      if (id && title) {
        items.push({
          id: createHash('md5').update(id).digest('hex'),
          source: 'arxiv',
          type: 'research_paper',
          title: title.replace(/\s+/g, ' ').trim(),
          url: id,
          metadata: {
            abstract: (tag(entry, 'summary') ?? '').substring(0, 500),
            published: tag(entry, 'published') ?? undefined,
          },
        });
      }
    }
    return items;
  }

  beforeEach(() => {
    resetArxivRateLimiter();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(xml, { status: 200 }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps id/source/type/title/url/metadata identical to the previous implementation', async () => {
    const result = await new ArxivCollector().fetchRoboticsResearch(30);
    expect(result.success).toBe(true);
    expect(result.source).toBe('arxiv');
    expect(result.count).toBe(2);
    const stripped = result.items.map(({ collectedAt, ...rest }) => {
      expect(collectedAt).toBeInstanceOf(Date);
      return rest;
    });
    expect(stripped).toEqual(legacyParse(xml));
  });

  it('keeps concrete legacy values (raw 500-char abstract, md5 of <id>, un-decoded title)', async () => {
    const [first, second] = (await new ArxivCollector().fetchRoboticsResearch(30)).items;
    expect(first!.id).toBe(createHash('md5').update('http://arxiv.org/abs/2503.01234v2').digest('hex'));
    expect(first!.url).toBe('http://arxiv.org/abs/2503.01234v2');
    expect(first!.title).toBe('Dexterous Hand Control &amp; Learning'); // 레거시는 엔티티를 디코드하지 않는다
    expect(first!.metadata).toEqual({
      abstract: expect.stringContaining('&lt;5 fingers&gt;'),
      published: '2026-03-01T12:30:00Z',
    });
    expect((second!.metadata.abstract as string).length).toBe(500);
  });

  it('still queries the legacy http endpoint with the legacy query', async () => {
    await new ArxivCollector().fetchRoboticsResearch(30);
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toBe(
      'http://export.arxiv.org/api/query?search_query=cat%3Acs.RO%20OR%20cat%3Acs.AI&start=0&max_results=30&sortBy=submittedDate&sortOrder=descending'
    );
  });

  it('returns the legacy failure shape on HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503 })));
    const r = await new ArxivCollector().fetchRoboticsResearch(5);
    expect(r).toEqual({ source: 'arxiv', success: false, count: 0, items: [], error: 'Error: arXiv API error: 503' });
  });

  it('parseRawArxivEntries keeps legacy behavior of including error entries', () => {
    const raw = parseRawArxivEntries(feed([ERR]));
    expect(raw).toHaveLength(1);
    expect(raw[0]!.id).toContain('/api/errors');
  });
});

describe('shared rate limiter', () => {
  beforeEach(() => resetArxivRateLimiter());

  it('waits the remaining interval after the previous request', async () => {
    let t = 1_000_000;
    const sleeps: number[] = [];
    const deps = {
      now: () => t,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        t += ms;
      },
    };
    await waitArxivTurn(deps);
    expect(sleeps).toEqual([]);
    t += 1000;
    await waitArxivTurn(deps);
    expect(sleeps).toEqual([ARXIV_MIN_INTERVAL_MS - 1000]);
    markArxivRequestDone(deps.now);
    await waitArxivTurn(deps);
    expect(sleeps).toEqual([2000, ARXIV_MIN_INTERVAL_MS]);
  });

  it('serializes concurrent callers', async () => {
    let t = 5_000_000;
    const grants: number[] = [];
    const deps = {
      now: () => t,
      sleep: async (ms: number) => {
        t += ms;
      },
    };
    await Promise.all([0, 1, 2].map(() => waitArxivTurn(deps).then(() => grants.push(t))));
    expect(grants[1]! - grants[0]!).toBeGreaterThanOrEqual(ARXIV_MIN_INTERVAL_MS);
    expect(grants[2]! - grants[1]!).toBeGreaterThanOrEqual(ARXIV_MIN_INTERVAL_MS);
  });
});
