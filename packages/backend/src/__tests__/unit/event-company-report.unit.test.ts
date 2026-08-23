import { describe, it, expect } from 'vitest';
import {
  aggregateCompanies,
  selectReportCompanies,
  normalizeCompanyKey,
  parseCompanyEnrichment,
  groupCompaniesForSlides,
  buildSlideTitle,
  type AggregateVideoInput,
  type CompanyAggregate,
} from '../../services/event-company-report.service.js';

function video(overrides: Partial<AggregateVideoInput> & { id: string }): AggregateVideoInput {
  return {
    title: 't',
    url: `https://www.youtube.com/watch?v=${overrides.id}`,
    ...overrides,
  } as AggregateVideoInput;
}

describe('aggregateCompanies', () => {
  it('excludes videos without a brief or with empty companies', () => {
    const videos: AggregateVideoInput[] = [
      video({ id: 'v1', brief: null }),
      video({ id: 'v2', brief: { companies: [] } }),
      video({ id: 'v3', brief: { companies: ['Acme'] } }),
    ];
    const result = aggregateCompanies(videos);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Acme');
    expect(result[0].videoIds).toEqual(['v3']);
  });

  it('merges companies by case/whitespace-insensitive key and keeps the first-seen display form', () => {
    const videos: AggregateVideoInput[] = [
      video({ id: 'v1', publishedAt: '2026-08-01', brief: { companies: ['Boston Dynamics'] } }),
      video({ id: 'v2', publishedAt: '2026-08-02', brief: { companies: ['boston   dynamics'] } }),
      video({ id: 'v3', publishedAt: '2026-08-03', brief: { companies: ['BOSTON DYNAMICS'] } }),
    ];
    const result = aggregateCompanies(videos);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Boston Dynamics');
    expect(result[0].videoIds).toEqual(['v1', 'v2', 'v3']);
  });

  it('picks the most frequent taskTypes[0] as category, breaking ties by TASK_TYPE_ORDER order', () => {
    const videos: AggregateVideoInput[] = [
      video({ id: 'v1', taskTypes: ['파지/조작'], brief: { companies: ['Acme'] } }),
      video({ id: 'v2', taskTypes: ['보행/이동'], brief: { companies: ['Acme'] } }),
    ];
    // 1:1 tie between 파지/조작 and 보행/이동 — 보행/이동 comes first in TASK_TYPE_ORDER
    const result = aggregateCompanies(videos);
    expect(result[0].category).toBe('보행/이동');
  });

  it('uses the strict majority category when not tied', () => {
    const videos: AggregateVideoInput[] = [
      video({ id: 'v1', taskTypes: ['파지/조작'], brief: { companies: ['Acme'] } }),
      video({ id: 'v2', taskTypes: ['파지/조작'], brief: { companies: ['Acme'] } }),
      video({ id: 'v3', taskTypes: ['보행/이동'], brief: { companies: ['Acme'] } }),
    ];
    const result = aggregateCompanies(videos);
    expect(result[0].category).toBe('파지/조작');
  });

  it('defaults category to 미분류 when taskTypes is missing/empty', () => {
    const videos: AggregateVideoInput[] = [video({ id: 'v1', brief: { companies: ['Acme'] } })];
    expect(aggregateCompanies(videos)[0].category).toBe('미분류');
  });

  it('caps thumbnails at 2, most recently published first', () => {
    const videos: AggregateVideoInput[] = [
      video({ id: 'v1', publishedAt: '2026-08-01', thumbnail: 'https://img/v1.jpg', brief: { companies: ['Acme'] } }),
      video({ id: 'v2', publishedAt: '2026-08-05', thumbnail: 'https://img/v2.jpg', brief: { companies: ['Acme'] } }),
      video({ id: 'v3', publishedAt: '2026-08-03', thumbnail: 'https://img/v3.jpg', brief: { companies: ['Acme'] } }),
    ];
    const result = aggregateCompanies(videos);
    expect(result[0].thumbnails).toHaveLength(2);
    expect(result[0].thumbnails.map((t) => t.videoId)).toEqual(['v2', 'v3']);
  });

  it('caps raw fields (highlights/mainProducts/demoContents/insights ≤6, techKeywords ≤10 deduped) and sampleVideoUrls ≤3', () => {
    const videos: AggregateVideoInput[] = Array.from({ length: 8 }, (_, i) =>
      video({
        id: `v${i}`,
        brief: {
          highlight: `highlight-${i}`,
          mainProducts: [`product-${i}`],
          demoContents: [`demo-${i}`],
          insights: [`insight-${i}`],
          techKeywords: ['VLA', 'vla', ' VLA ', `kw-${i}`],
          companies: ['Acme'],
        },
      })
    );
    const result = aggregateCompanies(videos)[0];
    expect(result.raw.highlights).toHaveLength(6);
    expect(result.raw.mainProducts).toHaveLength(6);
    expect(result.raw.demoContents).toHaveLength(6);
    expect(result.raw.insights).toHaveLength(6);
    expect(result.raw.techKeywords.length).toBeLessThanOrEqual(10);
    // VLA/vla/' VLA ' should collapse to a single entry (case-insensitive dedup)
    expect(result.raw.techKeywords.filter((k) => k.trim().toLowerCase() === 'vla')).toHaveLength(1);
    expect(result.sampleVideoUrls).toHaveLength(3);
  });
});

describe('selectReportCompanies', () => {
  const make = (name: string, videoCount: number): CompanyAggregate => ({
    name,
    category: '미분류',
    videoIds: Array.from({ length: videoCount }, (_, i) => `${name}-${i}`),
    raw: { highlights: [], mainProducts: [], demoContents: [], insights: [], techKeywords: [] },
    thumbnails: [],
    sampleVideoUrls: [],
  });

  it('sorts by videoIds.length desc, ties broken by name asc', () => {
    const companies = [make('Charlie', 1), make('Alpha', 3), make('Bravo', 3)];
    const result = selectReportCompanies(companies, 10);
    expect(result.map((c) => c.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('respects the limit parameter', () => {
    const companies = [make('A', 5), make('B', 4), make('C', 3)];
    const result = selectReportCompanies(companies, 2);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('defaults to 12 when no limit is provided (EVENT_REPORT_COMPANY_LIMIT unset)', () => {
    const companies = Array.from({ length: 20 }, (_, i) => make(`C${String(i).padStart(2, '0')}`, 20 - i));
    const result = selectReportCompanies(companies);
    expect(result).toHaveLength(12);
    expect(result[0].name).toBe('C00');
  });
});

describe('normalizeCompanyKey', () => {
  it('lowercases, trims, collapses whitespace, and strips non-alnum/한글 chars', () => {
    expect(normalizeCompanyKey('  Boston   Dynamics  ')).toBe('bostondynamics');
    expect(normalizeCompanyKey('Figure AI, Inc.')).toBe('figureaiinc');
    expect(normalizeCompanyKey('유니트리 로보틱스')).toBe('유니트리로보틱스');
  });

  it('caps the result at 50 chars', () => {
    const long = 'a'.repeat(80);
    expect(normalizeCompanyKey(long).length).toBe(50);
  });

  it('produces the same key for case/whitespace variants', () => {
    expect(normalizeCompanyKey('UNITREE')).toBe(normalizeCompanyKey('unitree'));
    expect(normalizeCompanyKey('Boston  Dynamics')).toBe(normalizeCompanyKey('boston dynamics'));
  });
});

describe('parseCompanyEnrichment', () => {
  it('parses valid JSON and enforces caps (topline≤120, products/techInsights≤2×180, demoNotes≤2×160, sources≤3)', () => {
    const text = JSON.stringify({
      topline: 't'.repeat(200),
      products: ['p'.repeat(200), 'q'.repeat(200), 'extra'],
      techInsights: ['i'.repeat(200), 'j'.repeat(200), 'extra'],
      demoNotes: ['d'.repeat(200), 'e'.repeat(200), 'extra'],
      sources: ['a.com', 'b.com', 'c.com', 'd.com'],
    });
    const parsed = parseCompanyEnrichment(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.topline.length).toBe(120);
    expect(parsed!.products).toHaveLength(2);
    expect(parsed!.products[0].length).toBe(180);
    expect(parsed!.techInsights).toHaveLength(2);
    expect(parsed!.techInsights[0].length).toBe(180);
    expect(parsed!.demoNotes).toHaveLength(2);
    expect(parsed!.demoNotes[0].length).toBe(160);
    expect(parsed!.sources).toHaveLength(3);
    expect(parsed!.enrichedVia).toBe('web-search');
  });

  it('returns null for unparseable text', () => {
    expect(parseCompanyEnrichment('not json at all')).toBeNull();
  });

  it('returns null when topline is missing/empty', () => {
    expect(parseCompanyEnrichment(JSON.stringify({ products: ['p'] }))).toBeNull();
    expect(parseCompanyEnrichment(JSON.stringify({ topline: '   ' }))).toBeNull();
  });

  it('recovers a JSON object embedded in surrounding text', () => {
    const text = '검색 결과를 종합하면 다음과 같습니다.\n{"topline":"핵심 요약","products":["제품 A"]}\n이상입니다.';
    const parsed = parseCompanyEnrichment(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.topline).toBe('핵심 요약');
    expect(parsed!.products).toEqual(['제품 A']);
  });

  it('returns null when a corrupted/truncated JSON object cannot be recovered', () => {
    const text = '{"topline": "잘린 JSON", "products": ["a"';
    expect(parseCompanyEnrichment(text)).toBeNull();
  });
});

describe('groupCompaniesForSlides / buildSlideTitle', () => {
  const make = (name: string, category: string): CompanyAggregate => ({
    name,
    category,
    videoIds: [],
    raw: { highlights: [], mainProducts: [], demoContents: [], insights: [], techKeywords: [] },
    thumbnails: [],
    sampleVideoUrls: [],
  });

  it('groups by TASK_TYPE_ORDER order and chunks each category into pairs of 2', () => {
    const companies = [
      make('제품공개A', '제품 공개'),
      make('보행A', '보행/이동'),
      make('보행B', '보행/이동'),
      make('보행C', '보행/이동'),
    ];
    const groups = groupCompaniesForSlides(companies);
    // 보행/이동 (TASK_TYPE_ORDER 앞순) 먼저, 3개 → [A,B] [C] 로 chunk. 제품 공개는 뒤.
    expect(groups).toHaveLength(3);
    expect(groups[0].category).toBe('보행/이동');
    expect(groups[0].companies.map((c) => c.name)).toEqual(['보행A', '보행B']);
    expect(groups[1].category).toBe('보행/이동');
    expect(groups[1].companies.map((c) => c.name)).toEqual(['보행C']);
    expect(groups[2].category).toBe('제품 공개');
    expect(groups[2].companies.map((c) => c.name)).toEqual(['제품공개A']);
  });

  it('builds a title with two companies joined by " / "', () => {
    const group = { category: '보행/이동', companies: [make('A', '보행/이동'), make('B', '보행/이동')] };
    expect(buildSlideTitle(group)).toBe('주요 참관 업체 (보행/이동) – A / B');
  });

  it('builds a title with a single company (no trailing slash)', () => {
    const group = { category: '보행/이동', companies: [make('A', '보행/이동')] };
    expect(buildSlideTitle(group)).toBe('주요 참관 업체 (보행/이동) – A');
  });
});
