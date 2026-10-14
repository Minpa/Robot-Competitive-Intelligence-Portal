import { describe, it, expect } from 'vitest';
import {
  TECH_TREND_DOMAINS,
  DOMAIN_REPORT_CONFIGS,
  matchesDomainVideo,
  matchesDomainSecondary,
  computeReportStats,
  shouldGenerateInsight,
  buildInsightPrompt,
  parseTrendInsight,
  toReportVideo,
  toReportPaper,
  getDomainFocus,
  filterByDomainFocus,
  prioritizeVideosForPrompt,
  VIDEO_LIST_CAP,
  PAPER_LIST_CAP,
  type ArticleRow,
  type ReportVideo,
  type ReportPaper,
} from '../../services/tech-trend-report.service.js';

function video(meta: Record<string, unknown>, extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: 'v1',
    title: 'Demo video',
    url: 'https://www.youtube.com/watch?v=abcdefghijk',
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-10-01T00:00:00.000Z',
    extractedMetadata: meta,
    ...extra,
  };
}

function paper(title: string, summary: string | null = null): ArticleRow {
  return {
    id: 'p1',
    title,
    summary,
    url: 'https://arxiv.org/abs/2610.01234v2',
    source: 'arxiv',
    productType: 'none',
    publishedAt: '2026-10-02T00:00:00.000Z',
  };
}

describe('domain configs', () => {
  it('exposes the five tech-trend domains with a config each', () => {
    expect(TECH_TREND_DOMAINS).toEqual(['hand', 'rfm', 'actuator', 'expo', 'production']);
    for (const d of TECH_TREND_DOMAINS) expect(DOMAIN_REPORT_CONFIGS[d]).toBeDefined();
    expect(DOMAIN_REPORT_CONFIGS.hand.second).toBe('papers');
    expect(DOMAIN_REPORT_CONFIGS.expo.second).toBe('news');
  });
});

describe('matchesDomainVideo — hand', () => {
  it('includes videos whose channel domain is hand', () => {
    expect(matchesDomainVideo('hand', video({ domain: 'hand', channel: 'Shadow Robot' }))).toBe(true);
  });

  it('includes topic-search videos (topic hand) even when channel domain is robot', () => {
    expect(matchesDomainVideo('hand', video({ topic: 'hand', domain: 'robot' }))).toBe(true);
  });

  it('includes videos whose multi-topic list contains hand even when topic (first value) is rfm', () => {
    expect(matchesDomainVideo('hand', video({ topic: 'rfm', topics: ['rfm', 'hand'], domain: 'robot' }))).toBe(true);
    // topics에 hand가 없으면 topic만으로는 포함되지 않는다
    expect(matchesDomainVideo('hand', video({ topic: 'rfm', topics: ['rfm'], domain: 'robot' }))).toBe(false);
  });

  it('includes robot-channel videos tagged with 파지/조작', () => {
    expect(
      matchesDomainVideo('hand', video({ domain: 'robot', aiTags: { taskTypes: ['보행', '파지/조작'] } }))
    ).toBe(true);
  });

  it('excludes robot-channel videos tagged only with 보행', () => {
    expect(matchesDomainVideo('hand', video({ domain: 'robot', aiTags: { taskTypes: ['보행'] } }))).toBe(false);
  });

  it('excludes actuator-channel videos', () => {
    expect(matchesDomainVideo('hand', video({ domain: 'actuator' }))).toBe(false);
  });
});

describe('matchesDomainVideo — production', () => {
  it('excludes keynotes even when the text matches mass production', () => {
    expect(
      matchesDomainVideo(
        'production',
        video({ domain: 'robot' }, { title: 'CEO keynote: mass production of humanoids starts' })
      )
    ).toBe(false);
  });

  it('restricts candidates to robot-channel videos (videoChannelDomains)', () => {
    const row = video({ domain: 'hand' }, { title: 'Factory tour of the new production line' });
    expect(matchesDomainVideo('production', row)).toBe(false);
    const robotRow = video({ domain: 'robot' }, { title: 'Factory tour of the new production line' });
    expect(matchesDomainVideo('production', robotRow)).toBe(true);
  });

  it('bypasses the channel-domain restriction when topic equals production', () => {
    expect(matchesDomainVideo('production', video({ topic: 'production', domain: 'hand' }))).toBe(true);
  });
});

describe('matchesDomainSecondary — hand papers', () => {
  it('matches tactile / in-hand manipulation titles', () => {
    expect(matchesDomainSecondary('hand', paper('Tactile sensing for in-hand manipulation'))).toBe(true);
  });

  it('does not match "Handheld" (word boundary on hand)', () => {
    expect(matchesDomainSecondary('hand', paper('Handheld device for surgeons'))).toBe(false);
  });

  it('does not match locomotion papers', () => {
    expect(matchesDomainSecondary('hand', paper('Legged locomotion on rough terrain'))).toBe(false);
  });

  it('matches when only the abstract mentions a gripper', () => {
    expect(
      matchesDomainSecondary('hand', paper('A learned policy for warehouse picking', 'We mount a soft gripper on a UR5.'))
    ).toBe(true);
  });

  it('news domains exclude videos and non-news sources', () => {
    const base: ArticleRow = { id: 'n1', title: 'Figure opens BotQ mass production facility', source: 'news' };
    expect(matchesDomainSecondary('production', base)).toBe(true);
    expect(matchesDomainSecondary('production', { ...base, productType: 'video' })).toBe(false);
    expect(matchesDomainSecondary('production', { ...base, source: 'arxiv' })).toBe(false);
  });
});

function rv(partial: Partial<ReportVideo>): ReportVideo {
  return {
    id: 'x',
    title: 't',
    channel: null,
    thirdParty: false,
    publishedAt: null,
    url: null,
    videoId: null,
    thumbnail: null,
    views: null,
    summaryKo: null,
    taskTypes: [],
    techTags: [],
    ...partial,
  };
}

function rp(partial: Partial<ReportPaper> = {}): ReportPaper {
  return { id: 'p', title: 't', publishedAt: null, url: null, arxivId: null, abstractSnippet: null, ...partial };
}

describe('computeReportStats', () => {
  it('counts videos, papers and distinct channels', () => {
    const stats = computeReportStats(
      [rv({ channel: 'A' }), rv({ channel: 'B' }), rv({ channel: 'A' }), rv({ channel: null })],
      [rp(), rp()]
    );
    expect(stats.videoCount).toBe(4);
    expect(stats.paperCount).toBe(2);
    expect(stats.channelCount).toBe(2);
    expect(stats.topChannels).toEqual([
      { name: 'A', count: 2 },
      { name: 'B', count: 1 },
    ]);
  });

  it('caps topChannels at 5 and topKeywords at 8, sorted by count desc', () => {
    const videos: ReportVideo[] = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) videos.push(rv({ channel: `ch${i}` }));
    }
    for (let k = 0; k < 10; k++) {
      for (let j = 0; j <= k; j++) videos.push(rv({ techTags: [`kw${k}`] }));
    }
    const stats = computeReportStats(videos, []);
    expect(stats.topChannels).toHaveLength(5);
    expect(stats.topChannels[0]).toEqual({ name: 'ch6', count: 7 });
    expect(stats.topKeywords).toHaveLength(8);
    expect(stats.topKeywords[0]).toEqual({ keyword: 'kw9', count: 10 });
    expect(stats.topKeywords[7]).toEqual({ keyword: 'kw2', count: 3 });
  });

  it('returns zeros and empty lists for empty input', () => {
    expect(computeReportStats([], [])).toEqual({
      videoCount: 0,
      paperCount: 0,
      channelCount: 0,
      topChannels: [],
      topKeywords: [],
    });
  });
});

describe('shouldGenerateInsight', () => {
  it('requires at least 3 items in total', () => {
    expect(shouldGenerateInsight(0, 0)).toBe(false);
    expect(shouldGenerateInsight(2, 0)).toBe(false);
    expect(shouldGenerateInsight(1, 1)).toBe(false);
    expect(shouldGenerateInsight(2, 1)).toBe(true);
    expect(shouldGenerateInsight(0, 3)).toBe(true);
    expect(shouldGenerateInsight(40, 40)).toBe(true);
  });
});

describe('buildInsightPrompt', () => {
  it('caps videos and papers at 40 each and includes the required rules', () => {
    const videos = Array.from({ length: 41 }, (_, i) =>
      rv({ title: `VID-${i}`, channel: 'C', publishedAt: '2026-10-01T12:00:00.000Z', summaryKo: 's'.repeat(300) })
    );
    const papers = Array.from({ length: 41 }, (_, i) =>
      rp({ title: `PAP-${i}`, publishedAt: '2026-10-02T12:00:00.000Z', abstractSnippet: 'a'.repeat(300) })
    );
    const prompt = buildInsightPrompt({ domainLabel: '핸드 트렌드', days: 30, videos, papers });
    expect(prompt).toContain('VID-39');
    expect(prompt).not.toContain('VID-40');
    expect(prompt).toContain('PAP-39');
    expect(prompt).not.toContain('PAP-40');
    expect(prompt).toContain('[영상 40건]');
    expect(prompt).toContain('[논문 40편]');
    expect(prompt).toContain('최근 30일간');
    expect(prompt).toContain('핸드 트렌드');
    expect(prompt).toContain('조회수·인기·마케팅 언급 금지');
    expect(prompt).toContain('추측·일반론·외부 지식 금지');
    expect(prompt).toContain('"headline"');
    expect(prompt).toContain('"keywords"');
    // 날짜는 YYYY-MM-DD로 축약, summaryKo는 200자 캡
    expect(prompt).toContain('"publishedAt":"2026-10-01"');
    expect(prompt).not.toContain('s'.repeat(201));
    expect(prompt).toContain('s'.repeat(200));
  });
});

describe('parseTrendInsight', () => {
  it('parses a clean JSON response', () => {
    const r = parseTrendInsight(
      JSON.stringify({ headline: '총평', points: ['a', 'b', 'c'], keywords: ['촉각', 'VLA'] })
    );
    expect(r).toEqual({ headline: '총평', points: ['a', 'b', 'c'], keywords: ['촉각', 'VLA'] });
  });

  it('recovers JSON wrapped in surrounding text', () => {
    const r = parseTrendInsight('다음은 결과입니다:\n{"headline":"h","points":["p1"],"keywords":[]}\n감사합니다.');
    expect(r).not.toBeNull();
    expect(r!.headline).toBe('h');
    expect(r!.points).toEqual(['p1']);
  });

  it('caps headline 120, points 5x220, keywords 8x24', () => {
    const r = parseTrendInsight(
      JSON.stringify({
        headline: 'h'.repeat(300),
        points: Array.from({ length: 7 }, () => 'p'.repeat(400)),
        keywords: Array.from({ length: 12 }, (_, i) => `k${i}-`.repeat(10)),
      })
    );
    expect(r).not.toBeNull();
    expect(r!.headline.length).toBe(120);
    expect(r!.points).toHaveLength(5);
    for (const p of r!.points) expect(p.length).toBe(220);
    expect(r!.keywords).toHaveLength(8);
    for (const k of r!.keywords) expect(k.length).toBeLessThanOrEqual(24);
  });

  it('dedupes keywords case-insensitively', () => {
    const r = parseTrendInsight(
      JSON.stringify({ headline: 'h', points: ['p'], keywords: ['VLA', 'vla', '촉각', '촉각', 'VLA'] })
    );
    expect(r!.keywords).toEqual(['VLA', '촉각']);
  });

  it('strips cite tags from headline, points and keywords', () => {
    const r = parseTrendInsight(
      JSON.stringify({
        headline: '<cite index="1-1">총평</cite> 문장',
        points: ['핵심 <cite index="2-3">근거</cite> 내용', '잘린 태그</ci'],
        keywords: ['<cite index="1">촉각</cite>'],
      })
    );
    expect(r!.headline).toBe('총평 문장');
    expect(r!.points).toEqual(['핵심 근거 내용', '잘린 태그']);
    expect(r!.keywords).toEqual(['촉각']);
  });

  it('returns null when points is empty or missing', () => {
    expect(parseTrendInsight(JSON.stringify({ headline: 'h', points: [], keywords: ['k'] }))).toBeNull();
    expect(parseTrendInsight(JSON.stringify({ headline: 'h', keywords: ['k'] }))).toBeNull();
    expect(parseTrendInsight(JSON.stringify({ headline: 'h', points: [1, null, ''] }))).toBeNull();
  });

  it('returns null for non-JSON text', () => {
    expect(parseTrendInsight('죄송하지만 데이터가 부족합니다.')).toBeNull();
    expect(parseTrendInsight('')).toBeNull();
  });
});

describe('toReportPaper', () => {
  it('extracts arxivId (with version) and builds a 220-char abstract snippet', () => {
    const p = toReportPaper(paper('Dexterous Hand', 'x'.repeat(500)));
    expect(p.arxivId).toBe('2610.01234v2');
    expect(p.abstractSnippet).toBe(`${'x'.repeat(220)}…`);
    expect(p.publishedAt).toBe('2026-10-02T00:00:00.000Z');
    expect(p.url).toBe('https://arxiv.org/abs/2610.01234v2');
  });

  it('keeps short abstracts without ellipsis, null when empty, and null arxivId for non-arXiv urls', () => {
    expect(toReportPaper(paper('T', 'short abstract')).abstractSnippet).toBe('short abstract');
    expect(toReportPaper(paper('T', '   ')).abstractSnippet).toBeNull();
    const news = toReportPaper({ id: 'n', title: 'News &amp; more', url: 'https://example.com/a', collectedAt: '2026-09-30T00:00:00.000Z' });
    expect(news.arxivId).toBeNull();
    expect(news.title).toBe('News & more');
    expect(news.publishedAt).toBe('2026-09-30T00:00:00.000Z');
  });
});

describe('toReportVideo', () => {
  it('builds the ytimg thumbnail from videoId when meta.thumbnail is absent', () => {
    const v = toReportVideo(video({ videoId: 'abcdefghijk', channel: 'Shadow' }));
    expect(v.thumbnail).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
    expect(v.videoId).toBe('abcdefghijk');
    expect(v.channel).toBe('Shadow');
  });

  it('derives videoId from the watch URL and prefers meta.thumbnail when present', () => {
    const v = toReportVideo(video({ thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' }));
    expect(v.videoId).toBe('abcdefghijk');
    expect(v.thumbnail).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  });

  it('decodes HTML entities in the title and keeps the original language', () => {
    const v = toReportVideo(video({ titleKo: '번역된 제목' }, { title: 'Here&#39;s the &quot;Hand&quot; &amp; more' }));
    expect(v.title).toBe(`Here's the "Hand" & more`);
  });

  it('caps summaryKo at 400 chars, null when no gemini analysis, caps tags at 4', () => {
    const v = toReportVideo(
      video({
        geminiAnalysis: { summaryKo: '요'.repeat(500) },
        aiTags: { taskTypes: ['a', 'b', 'c', 'd', 'e'], techTags: ['1', '2', '3', '4', '5', '6'] },
        thirdParty: true,
        views: 1234,
      })
    );
    expect(v.summaryKo!.length).toBe(400);
    expect(v.taskTypes).toEqual(['a', 'b', 'c', 'd']);
    expect(v.techTags).toEqual(['1', '2', '3', '4']);
    expect(v.thirdParty).toBe(true);
    expect(v.views).toBe(1234);
    expect(toReportVideo(video({})).summaryKo).toBeNull();
    expect(toReportVideo(video({})).thirdParty).toBe(false);
  });
});

describe('getDomainFocus / filterByDomainFocus / toReportVideo domainFocus', () => {
  const withFocus = (id: string, level: string | null, domain = 'hand') =>
    video(
      level ? { domainFocus: { [domain]: { level, reason: 'r', judgedAt: 'x', source: 'haiku' } } } : {},
      { id }
    );

  it('getDomainFocus reads valid levels and returns null for missing/invalid', () => {
    expect(getDomainFocus('hand', withFocus('a', 'primary'))).toBe('primary');
    expect(getDomainFocus('hand', withFocus('a', 'none'))).toBe('none');
    expect(getDomainFocus('hand', withFocus('a', null))).toBeNull();
    expect(getDomainFocus('hand', withFocus('a', 'bogus'))).toBeNull();
  });

  it("filterByDomainFocus('hand') drops only 'none' and counts them", () => {
    const rows = [
      withFocus('p', 'primary'),
      withFocus('s', 'secondary'),
      withFocus('n1', 'none'),
      withFocus('u', null),
      withFocus('n2', 'none'),
    ];
    const { kept, excludedCount } = filterByDomainFocus('hand', rows);
    expect(kept.map((r) => r.id)).toEqual(['p', 's', 'u']);
    expect(excludedCount).toBe(2);
  });

  it('filterByDomainFocus does not exclude for non-hand domains', () => {
    const rows = [withFocus('n', 'none', 'rfm'), withFocus('n2', 'none')];
    const { kept, excludedCount } = filterByDomainFocus('rfm', rows);
    expect(kept).toHaveLength(2);
    expect(excludedCount).toBe(0);
  });

  it('toReportVideo fills domainFocus when judged, null otherwise', () => {
    expect(toReportVideo(withFocus('a', 'primary')).domainFocus).toBe('primary');
    expect(toReportVideo(withFocus('a', 'secondary')).domainFocus).toBe('secondary');
    expect(toReportVideo(withFocus('a', null)).domainFocus).toBeNull();
    expect(toReportVideo(video({ geminiAnalysis: { summaryKo: '요약' } })).summaryKo).toBe('요약');
  });
});

describe('prioritizeVideosForPrompt / buildInsightPrompt ordering', () => {
  const mk = (title: string, domainFocus: ReportVideo['domainFocus']): ReportVideo => ({
    id: title,
    title,
    channel: null,
    thirdParty: false,
    publishedAt: '2026-10-01T00:00:00.000Z',
    url: null,
    videoId: null,
    thumbnail: null,
    views: null,
    summaryKo: null,
    taskTypes: [],
    techTags: [],
    domainFocus,
  });

  it('orders primary -> secondary -> unjudged, keeping input (recency) order within groups', () => {
    const out = prioritizeVideosForPrompt(
      [mk('u1', null), mk('s1', 'secondary'), mk('p1', 'primary'), mk('u2', null), mk('p2', 'primary'), mk('s2', 'secondary')],
      40
    );
    expect(out.map((v) => v.title)).toEqual(['p1', 'p2', 's1', 's2', 'u1', 'u2']);
  });

  it('caps at the prompt limit (40) after prioritizing', () => {
    const vids = [
      ...Array.from({ length: 45 }, (_, i) => mk(`u${i}`, null)),
      mk('late-primary', 'primary'),
    ];
    const out = prioritizeVideosForPrompt(vids, 40);
    expect(out).toHaveLength(40);
    expect(out[0].title).toBe('late-primary');
    const prompt = buildInsightPrompt({ domainLabel: '핸드', days: 30, videos: vids, papers: [] });
    expect(prompt).toContain('late-primary');
    expect(prompt).toContain('[영상 40건]');
  });

  it('exposes distinct list caps for videos (100) and papers (60)', () => {
    expect(VIDEO_LIST_CAP).toBe(100);
    expect(PAPER_LIST_CAP).toBe(60);
  });
});
