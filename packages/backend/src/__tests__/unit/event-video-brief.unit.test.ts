import { describe, it, expect } from 'vitest';
import {
  parseEventBrief,
  getEventConfig,
  parseEventTrendSummary,
  parseTitleTranslations,
  computeEventStats,
} from '../../services/event-video-brief.service.js';
import { trendPointText } from '../../services/event-video-ppt.service.js';

describe('parseEventBrief', () => {
  it('caps lists at 3 items and 160 chars each, and sets briefVersion 2', () => {
    const text = JSON.stringify({
      mainProducts: ['a'.repeat(200), 'b', 'c', 'd'],
      demoContents: ['x', 'y', 'z', 'w'],
      insights: ['i'.repeat(200)],
    });
    const brief = parseEventBrief(text, 'test-model');
    expect(brief).not.toBeNull();
    expect(brief!.mainProducts).toHaveLength(3);
    expect(brief!.mainProducts[0].length).toBe(160);
    expect(brief!.demoContents).toHaveLength(3);
    expect(brief!.insights[0].length).toBe(160);
    expect(brief!.model).toBe('test-model');
    expect(typeof brief!.briefedAt).toBe('string');
    expect(brief!.briefVersion).toBe(2);
  });

  it('caps v2 fields (highlight 80자, companies 6x30, techKeywords 8x24)', () => {
    const text = JSON.stringify({
      mainProducts: ['p'],
      demoContents: ['d'],
      insights: ['i'],
      highlight: 'h'.repeat(200),
      companies: Array.from({ length: 10 }, (_, i) => `company-${i}-`.repeat(5)),
      techKeywords: Array.from({ length: 12 }, (_, i) => `키워드-${i}-`.repeat(5)),
    });
    const brief = parseEventBrief(text, 'm');
    expect(brief).not.toBeNull();
    expect(brief!.highlight?.length).toBe(80);
    expect(brief!.companies).toHaveLength(6);
    for (const c of brief!.companies!) expect(c.length).toBeLessThanOrEqual(30);
    expect(brief!.techKeywords).toHaveLength(8);
    for (const k of brief!.techKeywords!) expect(k.length).toBeLessThanOrEqual(24);
  });

  it('succeeds with legacy v1-style response (only 3 core fields, no v2 fields)', () => {
    const text = JSON.stringify({
      mainProducts: ['p'],
      demoContents: ['d'],
      insights: ['i'],
    });
    const brief = parseEventBrief(text, 'm');
    expect(brief).not.toBeNull();
    expect(brief!.highlight).toBeUndefined();
    expect(brief!.companies).toBeUndefined();
    expect(brief!.techKeywords).toBeUndefined();
    expect(brief!.briefVersion).toBe(2);
  });

  it('leaves loose v2 fields undefined when empty/missing', () => {
    const text = JSON.stringify({
      mainProducts: ['p'],
      demoContents: [],
      insights: [],
      highlight: '',
      companies: [],
      techKeywords: [],
    });
    const brief = parseEventBrief(text, 'm');
    expect(brief).not.toBeNull();
    expect(brief!.highlight).toBeUndefined();
    expect(brief!.companies).toBeUndefined();
    expect(brief!.techKeywords).toBeUndefined();
  });

  it('filters non-string and empty entries', () => {
    const text = JSON.stringify({
      mainProducts: ['ok', 42, '', '   ', null],
      demoContents: [],
      insights: ['fine'],
    });
    const brief = parseEventBrief(text, 'm');
    expect(brief!.mainProducts).toEqual(['ok']);
    expect(brief!.demoContents).toEqual([]);
    expect(brief!.insights).toEqual(['fine']);
  });

  it('returns null when all three sections are empty (treated as failure)', () => {
    const text = JSON.stringify({ mainProducts: [], demoContents: [], insights: [] });
    expect(parseEventBrief(text, 'm')).toBeNull();
  });

  it('recovers JSON embedded in surrounding text', () => {
    const text = '설명입니다 {"mainProducts":["p"],"demoContents":[],"insights":[]} 끝';
    const brief = parseEventBrief(text, 'm');
    expect(brief!.mainProducts).toEqual(['p']);
  });

  it('returns null for unparseable text', () => {
    expect(parseEventBrief('not json at all', 'm')).toBeNull();
  });
});

describe('getEventConfig', () => {
  it('returns wrc2026 config and null for unknown keys', () => {
    expect(getEventConfig('wrc2026')?.label).toContain('WRC 2026');
    expect(getEventConfig('nope')).toBeNull();
  });
});

describe('parseEventTrendSummary', () => {
  it('truncates headline to 120 chars and caps points at 6 items x 160 chars (v1 string points, no validVideoIds)', () => {
    const text = JSON.stringify({
      headline: 'h'.repeat(200),
      points: Array.from({ length: 8 }, (_, i) => `p${i}-`.repeat(50)),
    });
    const parsed = parseEventTrendSummary(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline.length).toBe(120);
    expect(parsed!.points).toHaveLength(6);
    for (const p of parsed!.points) {
      expect(p.text.length).toBeLessThanOrEqual(160);
      expect(p.videoIds).toEqual([]);
    }
  });

  it('returns null when headline is missing and points is empty', () => {
    const text = JSON.stringify({ points: [] });
    expect(parseEventTrendSummary(text)).toBeNull();
  });

  it('normalizes legacy string[] points into EventTrendPoint[] with empty videoIds', () => {
    const text = '분석 결과입니다\n{"headline":"핵심 트렌드 요약","points":["포인트 1","포인트 2"]}\n끝.';
    const parsed = parseEventTrendSummary(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toBe('핵심 트렌드 요약');
    expect(parsed!.points).toEqual([
      { text: '포인트 1', videoIds: [] },
      { text: '포인트 2', videoIds: [] },
    ]);
  });

  it('filters videoIds by validVideoIds intersection and caps at 4', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [
        { text: '포인트 A', videoIds: ['v1', 'v2', 'v3', 'v4', 'v5', 'unknown'] },
      ],
    });
    const validVideoIds = new Set(['v1', 'v2', 'v3', 'v4', 'v5']);
    const parsed = parseEventTrendSummary(text, validVideoIds);
    expect(parsed).not.toBeNull();
    expect(parsed!.points[0].text).toBe('포인트 A');
    expect(parsed!.points[0].videoIds).toEqual(['v1', 'v2', 'v3', 'v4']);
  });

  it('keeps all string videoIds as-is when validVideoIds is not provided', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [{ text: '포인트 A', videoIds: ['v1', 'v2'] }],
    });
    const parsed = parseEventTrendSummary(text);
    expect(parsed!.points[0].videoIds).toEqual(['v1', 'v2']);
  });

  it('keeps text with empty videoIds when only unknown videoIds are present', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [{ text: '포인트 A', videoIds: ['ghost-1', 'ghost-2'] }],
    });
    const validVideoIds = new Set(['v1']);
    const parsed = parseEventTrendSummary(text, validVideoIds);
    expect(parsed).not.toBeNull();
    expect(parsed!.points[0].text).toBe('포인트 A');
    expect(parsed!.points[0].videoIds).toEqual([]);
  });

  it('parses techPoints alongside points — normalized, videoIds filtered/capped, 6-item capped', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [{ text: '종합 포인트', videoIds: ['v1'] }],
      techPoints: [
        ...Array.from({ length: 8 }, (_, i) => ({
          text: `기술 포인트 ${i}`,
          videoIds: ['v1', 'v2', 'v3', 'v4', 'v5', 'unknown'],
        })),
      ],
    });
    const validVideoIds = new Set(['v1', 'v2', 'v3', 'v4', 'v5']);
    const parsed = parseEventTrendSummary(text, validVideoIds);
    expect(parsed).not.toBeNull();
    expect(parsed!.techPoints).toHaveLength(6);
    expect(parsed!.techPoints[0].text).toBe('기술 포인트 0');
    expect(parsed!.techPoints[0].videoIds).toEqual(['v1', 'v2', 'v3', 'v4']);
  });

  it('returns techPoints: [] when the field is missing from the response (backward compatible)', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [{ text: '종합 포인트', videoIds: [] }],
    });
    const parsed = parseEventTrendSummary(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.techPoints).toEqual([]);
  });

  it('fails (null) when only techPoints is present and points is empty', () => {
    const text = JSON.stringify({
      headline: '헤드라인',
      points: [],
      techPoints: [{ text: '기술 포인트', videoIds: [] }],
    });
    expect(parseEventTrendSummary(text)).toBeNull();
  });
});

describe('computeEventStats', () => {
  const video = (overrides: any) => ({
    taskTypes: [],
    brief: null,
    publishedAt: null,
    ...overrides,
  });

  it('aggregates and sorts category distribution by count desc', () => {
    const videos = [
      video({ taskTypes: ['보행/이동'] }),
      video({ taskTypes: ['보행/이동'] }),
      video({ taskTypes: ['파지/조작'] }),
      video({ taskTypes: [] }), // → 미분류
    ];
    const stats = computeEventStats(videos);
    expect(stats.totalVideos).toBe(4);
    expect(stats.categoryDistribution).toEqual([
      { category: '보행/이동', count: 2 },
      { category: '파지/조작', count: 1 },
      { category: '미분류', count: 1 },
    ]);
  });

  it('aggregates companies/keywords frequency, sorts desc, and caps at top N', () => {
    const videos = [
      video({ brief: { companies: ['Boston Dynamics', 'unitree'], techKeywords: ['휴머노이드'] } }),
      video({ brief: { companies: ['boston dynamics'], techKeywords: ['휴머노이드', 'VLA'] } }),
      video({ brief: { companies: ['Unitree'], techKeywords: ['VLA'] } }),
    ];
    const stats = computeEventStats(videos);
    expect(stats.topCompanies[0]).toEqual({ name: 'Boston Dynamics', count: 2 });
    expect(stats.topCompanies.find((c) => c.name.toLowerCase() === 'unitree')?.count).toBe(2);
    expect(stats.uniqueCompanyCount).toBe(2);
    expect(stats.topKeywords[0]).toEqual({ name: '휴머노이드', count: 2 });
    expect(stats.uniqueKeywordCount).toBe(2);
  });

  it('excludes videos without a brief from companies/keywords aggregation', () => {
    const videos = [
      video({ brief: null }),
      video({ brief: { companies: ['A'], techKeywords: ['X'] } }),
    ];
    const stats = computeEventStats(videos);
    expect(stats.briefedVideos).toBe(1);
    expect(stats.topCompanies).toEqual([{ name: 'A', count: 1 }]);
    expect(stats.topKeywords).toEqual([{ name: 'X', count: 1 }]);
  });

  it('handles empty input array safely', () => {
    const stats = computeEventStats([]);
    expect(stats).toEqual({
      totalVideos: 0,
      briefedVideos: 0,
      categoryDistribution: [],
      topCompanies: [],
      topKeywords: [],
      uniqueCompanyCount: 0,
      uniqueKeywordCount: 0,
      weeklyUploads: [],
      techAxes: [],
    });
  });

  describe('weeklyUploads', () => {
    it('buckets a Wednesday publish into that week\'s Monday', () => {
      const videos = [video({ publishedAt: '2026-07-08T10:00:00Z' })]; // Wed
      const stats = computeEventStats(videos, '2026-07-08', '2026-07-08');
      expect(stats.weeklyUploads).toEqual([{ weekStart: '2026-07-06', count: 1 }]);
    });

    it('sums multiple publishes within the same week into one bucket', () => {
      const videos = [
        video({ publishedAt: '2026-07-08T10:00:00Z' }), // Wed
        video({ publishedAt: '2026-07-10T10:00:00Z' }), // Fri
      ];
      const stats = computeEventStats(videos, '2026-07-06', '2026-07-08');
      expect(stats.weeklyUploads).toEqual([{ weekStart: '2026-07-06', count: 2 }]);
    });

    it('buckets a Sunday publish into the Monday of the week it belongs to (not the following week)', () => {
      const videos = [video({ publishedAt: '2026-07-12T23:00:00Z' })]; // Sun
      const stats = computeEventStats(videos, '2026-07-06', '2026-07-12');
      expect(stats.weeklyUploads).toEqual([{ weekStart: '2026-07-06', count: 1 }]);
    });

    it('excludes videos with null publishedAt from the weekly bucket counts', () => {
      const videos = [
        video({ publishedAt: null }),
        video({ publishedAt: '2026-07-08T10:00:00Z' }),
      ];
      const stats = computeEventStats(videos, '2026-07-06', '2026-07-08');
      expect(stats.weeklyUploads).toEqual([{ weekStart: '2026-07-06', count: 1 }]);
    });

    it('fills gap weeks between publishes with count 0, staying contiguous', () => {
      const videos = [
        video({ publishedAt: '2026-07-06T10:00:00Z' }),
        video({ publishedAt: '2026-07-20T10:00:00Z' }),
      ];
      const stats = computeEventStats(videos, '2026-07-06', '2026-07-20');
      expect(stats.weeklyUploads).toEqual([
        { weekStart: '2026-07-06', count: 1 },
        { weekStart: '2026-07-13', count: 0 },
        { weekStart: '2026-07-20', count: 1 },
      ]);
    });

    it('returns an empty array for empty input', () => {
      const stats = computeEventStats([], '2026-07-01');
      expect(stats.weeklyUploads).toEqual([]);
    });
  });

  describe('techAxes', () => {
    it('classifies 이족보행 into 이동·보행 제어', () => {
      const videos = [video({ brief: { techKeywords: ['이족보행'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '이동·보행 제어', count: 1, keywords: [{ name: '이족보행', count: 1 }] },
      ]);
    });

    it('classifies 그리퍼 into 조작·핸드', () => {
      const videos = [video({ brief: { techKeywords: ['그리퍼'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '조작·핸드', count: 1, keywords: [{ name: '그리퍼', count: 1 }] },
      ]);
    });

    it('classifies VLA into AI·학습', () => {
      const videos = [video({ brief: { techKeywords: ['VLA'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: 'AI·학습', count: 1, keywords: [{ name: 'VLA', count: 1 }] },
      ]);
    });

    it('classifies 라이다 into 센싱·인지', () => {
      const videos = [video({ brief: { techKeywords: ['라이다'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '센싱·인지', count: 1, keywords: [{ name: '라이다', count: 1 }] },
      ]);
    });

    it('classifies 액추에이터 into 하드웨어·구동계', () => {
      const videos = [video({ brief: { techKeywords: ['액추에이터'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '하드웨어·구동계', count: 1, keywords: [{ name: '액추에이터', count: 1 }] },
      ]);
    });

    it('classifies an unmatched keyword into 기타', () => {
      const videos = [video({ brief: { techKeywords: ['미확인기술'] } })];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '기타', count: 1, keywords: [{ name: '미확인기술', count: 1 }] },
      ]);
    });

    it('returns axes in the fixed order regardless of keyword insertion order', () => {
      const videos = [
        video({ brief: { techKeywords: ['미확인기술'] } }), // 기타
        video({ brief: { techKeywords: ['액추에이터'] } }), // 하드웨어·구동계
        video({ brief: { techKeywords: ['이족보행'] } }), // 이동·보행 제어
        video({ brief: { techKeywords: ['VLA'] } }), // AI·학습
      ];
      const stats = computeEventStats(videos);
      expect(stats.techAxes.map((a) => a.axis)).toEqual([
        '이동·보행 제어',
        'AI·학습',
        '하드웨어·구동계',
        '기타',
      ]);
    });

    it('excludes axes with zero matched keywords', () => {
      const videos = [
        video({ brief: { techKeywords: ['이족보행'] } }),
        video({ brief: { techKeywords: ['그리퍼'] } }),
      ];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toHaveLength(2);
      expect(stats.techAxes.map((a) => a.axis)).toEqual(['이동·보행 제어', '조작·핸드']);
    });

    it('caps keywords per axis at the top 5 by count, sorted desc', () => {
      // 6개의 서로 다른 키워드(모두 이동·보행 제어 축), 각기 다른 빈도(6..1)로 등장시켜 top5 캡을 검증
      const videos = Array.from({ length: 6 }, (_, i) => {
        const count = 6 - i; // 이족보행-0: 6회, 이족보행-1: 5회, ..., 이족보행-5: 1회
        return Array.from({ length: count }, () => video({ brief: { techKeywords: [`이족보행-${i}`] } }));
      }).flat();
      const stats = computeEventStats(videos);
      const axis = stats.techAxes.find((a) => a.axis === '이동·보행 제어');
      expect(axis).toBeDefined();
      expect(axis!.keywords).toHaveLength(5);
      expect(axis!.keywords.map((k) => k.name)).toEqual([
        '이족보행-0',
        '이족보행-1',
        '이족보행-2',
        '이족보행-3',
        '이족보행-4',
      ]);
      for (let i = 1; i < axis!.keywords.length; i++) {
        expect(axis!.keywords[i - 1].count).toBeGreaterThanOrEqual(axis!.keywords[i].count);
      }
    });

    it('excludes videos without a brief from tech axis aggregation', () => {
      const videos = [
        video({ brief: null }),
        video({ brief: { techKeywords: ['그리퍼'] } }),
      ];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: '조작·핸드', count: 1, keywords: [{ name: '그리퍼', count: 1 }] },
      ]);
    });

    it('merges case-different variants of the same keyword and still matches its axis', () => {
      const videos = [
        video({ brief: { techKeywords: ['vla'] } }),
        video({ brief: { techKeywords: ['VLA'] } }),
      ];
      const stats = computeEventStats(videos);
      expect(stats.techAxes).toEqual([
        { axis: 'AI·학습', count: 2, keywords: [{ name: 'vla', count: 2 }] },
      ]);
    });
  });
});

describe('trendPointText (event-video-ppt.service)', () => {
  it('extracts text from a mixed array of string and EventTrendPoint objects, capped at 160 chars', () => {
    const points = ['legacy string point', { text: 'p'.repeat(200), videoIds: ['a'] }];
    const texts = points.map((p) => trendPointText(p as any));
    expect(texts[0]).toBe('legacy string point');
    expect(texts[1].length).toBe(160);
  });
});

describe('parseTitleTranslations', () => {
  it('parses a valid array and caps titleKo at 200 chars', () => {
    const text = JSON.stringify([
      { id: 'a1', titleKo: '제목 번역 1' },
      { id: 'a2', titleKo: '가'.repeat(250) },
    ]);
    const result = parseTitleTranslations(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'a1', titleKo: '제목 번역 1' });
    expect(result[1].id).toBe('a2');
    expect(result[1].titleKo.length).toBe(200);
  });

  it('filters out invalid entries (missing id / empty titleKo / non-string)', () => {
    const text = JSON.stringify([
      { id: 'ok', titleKo: '정상 번역' },
      { titleKo: 'id 없음' },
      { id: 'empty', titleKo: '   ' },
      { id: 'num', titleKo: 42 },
      { id: 123, titleKo: '숫자 id' },
      null,
      'not-an-object',
    ]);
    const result = parseTitleTranslations(text);
    expect(result).toEqual([{ id: 'ok', titleKo: '정상 번역' }]);
  });

  it('recovers a JSON array embedded in surrounding text', () => {
    const text = '번역 결과입니다\n[{"id":"x1","titleKo":"안녕하세요"}]\n끝.';
    const result = parseTitleTranslations(text);
    expect(result).toEqual([{ id: 'x1', titleKo: '안녕하세요' }]);
  });

  it('returns an empty array for unparseable text', () => {
    expect(parseTitleTranslations('not json at all')).toEqual([]);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes numeric and named entities', async () => {
    const { decodeHtmlEntities } = await import('../../services/event-video-brief.service.js');
    expect(decodeHtmlEntities("Here&#39;s Why &amp; More &quot;quoted&quot;")).toBe(`Here's Why & More "quoted"`);
    expect(decodeHtmlEntities('A &lt;B&gt; &nbsp;C')).toBe('A <B>  C');
    expect(decodeHtmlEntities('평범한 제목')).toBe('평범한 제목');
  });
});
