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
  buildInsightPromptWithRefs,
  toPromptAbstract,
  insightCacheKey,
  insightCachePattern,
  insightProfileFor,
  INSIGHT_PROFILES,
  isUsableCachedInsight,
  VIDEO_LIST_CAP,
  PAPER_LIST_CAP,
  type ArticleRow,
  type ReportVideo,
  type ReportPaper,
  type PromptPaper,
  type EvidenceRef,
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
    const prompt = buildInsightPrompt({ domain: 'rfm', domainLabel: '핸드 트렌드', days: 30, videos, papers });
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
    const prompt = buildInsightPrompt({ domain: 'rfm', domainLabel: '핸드', days: 30, videos: vids, papers: [] });
    expect(prompt).toContain('late-primary');
    expect(prompt).toContain('[영상 40건]');
  });

  it('exposes distinct list caps for videos (100) and papers (60)', () => {
    expect(VIDEO_LIST_CAP).toBe(100);
    expect(PAPER_LIST_CAP).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hand(RICH) 프로필 / 근거 ref / 캐시 키
// ─────────────────────────────────────────────────────────────────────────────

/** 변경 전 비-hand 프롬프트 원문 (한 글자도 바뀌지 않아야 한다) */
function originalLegacyPrompt(
  days: number,
  domainLabel: string,
  videos: object[],
  papers: object[]
): string {
  return `다음은 최근 ${days}일간 수집된 ${domainLabel} 분야 영상 메타데이터와 arXiv 논문 목록이다. LG 로봇 전략팀 공유용 리포트의 '주요 시사점'을 한국어로 작성하라.

규칙:
- 주어진 데이터에 명시된 내용만 근거로 삼는다. 추측·일반론·외부 지식 금지.
- 시사점은 3~5개, 각 220자 이내.
- 영상과 논문을 교차해 어떤 업체/랩이 무엇을 보였고 기술적으로 어떤 방향이 부상하는지에 집중한다.
- 조회수·인기·마케팅 언급 금지.
- 핵심 기술 키워드는 최대 8개, 각 24자 이내.
- 마크다운 기호(#, **, -)와 인용 태그(<cite>) 사용 금지.

[영상 ${videos.length}건]
${JSON.stringify(videos)}

[논문 ${papers.length}편]
${JSON.stringify(papers)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"headline":"한 문장 총평","points":["시사점1","시사점2","시사점3"],"keywords":["키워드1","키워드2"]}`;
}

function richVideos(n: number, summaryLen = 400): ReportVideo[] {
  return Array.from({ length: n }, (_, i) =>
    rv({
      id: `rid${i}`,
      title: `RV-${i}`,
      channel: `Chan${i}`,
      url: `https://www.youtube.com/watch?v=vid${String(i).padStart(8, '0')}`,
      publishedAt: '2026-10-01T12:00:00.000Z',
      summaryKo: 's'.repeat(summaryLen),
      techTags: ['촉각'],
    })
  );
}

function richPapers(n: number): PromptPaper[] {
  return Array.from({ length: n }, (_, i) => ({
    ...rp({
      id: `pid${i}`,
      title: `RP-${i}`,
      publishedAt: '2026-10-02T12:00:00.000Z',
      url: `https://arxiv.org/abs/2610.${String(10000 + i)}`,
      arxivId: `2610.${String(10000 + i)}`,
      abstractSnippet: `${'a'.repeat(220)}…`,
    }),
    promptAbstract: 'p'.repeat(500),
  }));
}

describe('insight profiles', () => {
  it('applies the RICH profile only to hand', () => {
    expect(insightProfileFor('hand').kind).toBe('rich');
    for (const d of ['rfm', 'actuator', 'expo', 'production'] as const) {
      expect(insightProfileFor(d).kind).toBe('legacy');
    }
    expect(INSIGHT_PROFILES.rich).toMatchObject({
      maxTokens: 16000,
      effort: 'high',
      promptVideoCap: 60,
      promptPaperCap: 60,
      promptSummaryCap: 300,
      promptAbstractCap: 500,
      headlineMax: 200,
      pointsMax: 7,
      pointMax: 300,
      cacheVersion: 'v2',
    });
    expect(INSIGHT_PROFILES.legacy).toMatchObject({
      maxTokens: 1500,
      effort: null,
      promptVideoCap: 40,
      promptPaperCap: 40,
      promptSummaryCap: 200,
      headlineMax: 120,
      pointsMax: 5,
      pointMax: 220,
      cacheVersion: 'v1',
    });
  });
});

describe('buildInsightPrompt — non-hand domains are unchanged', () => {
  it('matches the pre-change prompt text exactly for all four other domains', () => {
    const videos = richVideos(3, 250);
    const papers = richPapers(2);
    for (const domain of ['rfm', 'actuator', 'expo', 'production'] as const) {
      const label = DOMAIN_REPORT_CONFIGS[domain].label;
      const expected = originalLegacyPrompt(
        30,
        label,
        prioritizeVideosForPrompt(videos, 40).map((v) => ({
          title: v.title,
          channel: v.channel ?? '',
          publishedAt: '2026-10-01',
          summaryKo: v.summaryKo!.slice(0, 200),
          techTags: v.techTags,
        })),
        papers.map((p) => ({
          title: p.title,
          publishedAt: '2026-10-02',
          abstract: p.abstractSnippet!.slice(0, 300),
        }))
      );
      const built = buildInsightPromptWithRefs({ domain, domainLabel: label, days: 30, videos, papers });
      expect(built.prompt).toBe(expected);
      expect(built.refs.size).toBe(0);
      // 프롬프트 전용 초록은 비-hand 프롬프트에 영향을 주지 않는다
      expect(built.prompt).not.toContain('p'.repeat(100));
    }
  });
});

describe('buildInsightPrompt — hand (RICH)', () => {
  const label = '핸드 트렌드';
  const build = (videos: ReportVideo[], papers: PromptPaper[]) =>
    buildInsightPromptWithRefs({ domain: 'hand', domainLabel: label, days: 30, videos, papers });

  it('caps at 60/60, summary 300 and prompt abstract 500, with the preserved phrases', () => {
    const { prompt } = build(richVideos(61), richPapers(61));
    expect(prompt).toContain('RV-59');
    expect(prompt).not.toContain('RV-60');
    expect(prompt).toContain('RP-59');
    expect(prompt).not.toContain('RP-60');
    expect(prompt).toContain('[영상 60건]');
    expect(prompt).toContain('[논문 60편]');
    expect(prompt).toContain('s'.repeat(300));
    expect(prompt).not.toContain('s'.repeat(301));
    expect(prompt).toContain('p'.repeat(500));
    expect(prompt).not.toContain('p'.repeat(501));
    // 보존 문구
    expect(prompt).toContain('최근 30일간');
    expect(prompt).toContain(label);
    expect(prompt).toContain('조회수·인기·마케팅 언급 금지');
    expect(prompt).toContain('추측·일반론·외부 지식 금지');
    expect(prompt).toContain('"headline"');
    expect(prompt).toContain('"keywords"');
    expect(prompt).toContain('"publishedAt":"2026-10-01"');
    // 새 규칙
    expect(prompt).toContain('시사점은 5~7개, 각 300자 이내');
    expect(prompt).toContain('총평(headline)은 1~2문장, 200자 이내');
    expect(prompt).toContain('refs에 근거가 된 항목의 ref 코드를 1~4개 적는다');
    expect(prompt).toContain('입력에 없는 코드를 만들지 않는다');
    expect(prompt).toContain('"refs":["V3","P12"]');
    expect(prompt).toContain('해석 문장은 "~로 보인다"처럼 해석임을 드러낸다');
  });

  it('falls back to the 220-char snippet when no prompt abstract is supplied', () => {
    const papers = richPapers(1).map(({ promptAbstract: _p, ...rest }) => rest);
    const { prompt } = build(richVideos(3), papers);
    expect(prompt).toContain(`${'a'.repeat(220)}…`);
  });

  it('assigns ref codes V1..Vn / P1..Pm in prompt order with a 1:1 map to input items', () => {
    const videos = [
      rv({ id: 'u', title: 'unjudged', channel: 'CU', url: 'https://youtu.be/u', domainFocus: null }),
      rv({ id: 'p', title: 'primary', channel: 'CP', url: 'https://youtu.be/p', domainFocus: 'primary' }),
      rv({ id: 's', title: 'secondary', channel: null, url: null, domainFocus: 'secondary' }),
    ];
    const papers = richPapers(2);
    const { prompt, refs } = build(videos, papers);
    // 영상 순서는 prioritizeVideosForPrompt(primary -> secondary -> 미판정)
    expect(refs.get('V1')).toEqual({ kind: 'video', title: 'primary', url: 'https://youtu.be/p', label: 'CP' });
    expect(refs.get('V2')).toEqual({ kind: 'video', title: 'secondary', url: null, label: null });
    expect(refs.get('V3')).toEqual({ kind: 'video', title: 'unjudged', url: 'https://youtu.be/u', label: 'CU' });
    expect(refs.get('P1')).toEqual({
      kind: 'paper',
      title: 'RP-0',
      url: 'https://arxiv.org/abs/2610.10000',
      label: 'arXiv:2610.10000',
    });
    expect(refs.get('P2')!.title).toBe('RP-1');
    expect(refs.size).toBe(5);
    expect(prompt).toContain('"ref":"V1","title":"primary"');
    expect(prompt).toContain('"ref":"P2","title":"RP-1"');
  });
});

describe('toPromptAbstract / promptAbstract exposure', () => {
  it('normalises whitespace and caps at 500 chars', () => {
    const row = paper('T', `${'word  \n\t'.repeat(200)}`);
    const abs = toPromptAbstract(row)!;
    expect(abs.length).toBe(500);
    expect(abs).not.toMatch(/\s{2,}/);
    expect(abs).not.toMatch(/[\n\t]/);
    expect(toPromptAbstract(paper('T', null))).toBeNull();
    expect(toPromptAbstract(paper('T', '   '))).toBeNull();
  });

  it('toReportPaper output (the response papers[] item) never contains promptAbstract and keeps the 220-char snippet', () => {
    const p = toReportPaper(paper('Dexterous Hand', 'x'.repeat(500)));
    expect(Object.keys(p)).not.toContain('promptAbstract');
    expect(p.abstractSnippet).toBe(`${'x'.repeat(220)}…`);
    expect(JSON.stringify(p)).not.toContain('promptAbstract');
  });
});

describe('parseTrendInsight — RICH (evidence mode)', () => {
  const refs = new Map<string, EvidenceRef>([
    ['V1', { kind: 'video', title: 'Vid One', url: 'https://youtu.be/1', label: 'ChanA' }],
    ['V2', { kind: 'video', title: 'Vid Two', url: null, label: null }],
    ['V3', { kind: 'video', title: 'Vid Three', url: 'https://youtu.be/3', label: 'ChanC' }],
    ['P1', { kind: 'paper', title: 'Paper One', url: 'https://arxiv.org/abs/2610.00001', label: 'arXiv:2610.00001' }],
    ['P2', { kind: 'paper', title: 'Paper Two', url: null, label: null }],
    ['P3', { kind: 'paper', title: 'Paper Three', url: null, label: null }],
  ]);
  const opts = { headlineMax: 200, pointsMax: 7, pointMax: 300, refs };
  const parse = (payload: unknown) => parseTrendInsight(JSON.stringify(payload), opts);

  it('parses {text, refs[]} points and aligns pointEvidence by index', () => {
    const r = parse({
      headline: '총평',
      points: [
        { text: '첫째', refs: ['V1', 'P1'] },
        { text: '둘째', refs: [] },
        { text: '셋째', refs: ['P2'] },
      ],
      keywords: ['촉각'],
    })!;
    expect(r.points).toEqual(['첫째', '둘째', '셋째']);
    expect(r.pointEvidence).toHaveLength(r.points.length);
    expect(r.pointEvidence![0]).toEqual([refs.get('V1'), refs.get('P1')]);
    expect(r.pointEvidence![1]).toEqual([]);
    expect(r.pointEvidence![2]).toEqual([refs.get('P2')]);
  });

  it('drops invalid / unknown refs, dedupes, and keeps at most 4 per point (keeping the item itself)', () => {
    const r = parse({
      headline: 'h',
      points: [
        { text: '무효만', refs: ['V99', 'X1', 'p', '', 3, null, 'V1000'] },
        { text: '중복', refs: ['V1', 'v1', 'V1', 'P1'] },
        { text: '다섯개', refs: ['V1', 'V2', 'V3', 'P1', 'P2', 'P3'] },
        { text: '배열아님', refs: 'V1' },
      ],
    })!;
    expect(r.points).toHaveLength(4);
    expect(r.pointEvidence![0]).toEqual([]);
    expect(r.pointEvidence![1]!.map((e) => e.title)).toEqual(['Vid One', 'Paper One']);
    expect(r.pointEvidence![2]!.map((e) => e.title)).toEqual(['Vid One', 'Vid Two', 'Vid Three', 'Paper One']);
    expect(r.pointEvidence![3]).toEqual([]);
  });

  it('removes [V3] / (P12) markers from the text but keeps ordinary words like V2', () => {
    const r = parse({
      headline: '총평 [V1]',
      points: [{ text: '그리퍼 V2 모델이 공개되었다 [V3]. 촉각 센서(P1)도 함께 [V1, P2] 소개된다.', refs: ['V3'] }],
    })!;
    expect(r.points[0]).toBe('그리퍼 V2 모델이 공개되었다. 촉각 센서도 함께 소개된다.');
    expect(r.points[0]).toContain('V2');
    expect(r.points[0]).not.toMatch(/\[V\d|\(P\d/);
    expect(r.headline).toBe('총평');
  });

  it('accepts plain string points (empty refs)', () => {
    const r = parse({ headline: 'h', points: ['문자열 시사점', { text: '객체', refs: ['V1'] }] })!;
    expect(r.points).toEqual(['문자열 시사점', '객체']);
    expect(r.pointEvidence).toEqual([[], [refs.get('V1')]]);
  });

  it('caps headline 200, points 7x300 and keywords 8x24; strips cite tags and markdown', () => {
    const r = parse({
      headline: 'h'.repeat(300),
      points: Array.from({ length: 9 }, () => ({ text: 'p'.repeat(400), refs: ['V1'] })),
      keywords: Array.from({ length: 12 }, (_, i) => `k${i}-`.repeat(10)),
    })!;
    expect(r.headline.length).toBe(200);
    expect(r.points).toHaveLength(7);
    for (const p of r.points) expect(p.length).toBe(300);
    expect(r.pointEvidence).toHaveLength(7);
    expect(r.keywords).toHaveLength(8);
    for (const k of r.keywords) expect(k.length).toBeLessThanOrEqual(24);

    const dirty = parse({
      headline: '\u003ccite index="1-1">총평\u003c/cite> **굵게**',
      points: [{ text: '핵심 \u003ccite index="2-3">근거\u003c/cite> ## 내용 `코드`', refs: [] }],
    })!;
    expect(dirty.headline).toBe('총평 굵게');
    expect(dirty.points[0]).toBe('핵심 근거 내용 코드');
  });

  it('skips empty items and keeps points/pointEvidence the same length', () => {
    const r = parse({
      headline: 'h',
      points: [{ text: '', refs: ['V1'] }, { refs: ['V1'] }, 5, null, { text: '유효', refs: ['V2'] }, '[V1]'],
    })!;
    expect(r.points).toEqual(['유효']);
    expect(r.pointEvidence).toEqual([[refs.get('V2')]]);
  });

  it('returns null for empty / non-JSON / no usable point', () => {
    expect(parse({ headline: 'h', points: [] })).toBeNull();
    expect(parse({ headline: 'h' })).toBeNull();
    expect(parse({ headline: 'h', points: [{ text: '  ' }, '[V1]'] })).toBeNull();
    expect(parseTrendInsight('죄송합니다.', opts)).toBeNull();
    expect(parseTrendInsight('', opts)).toBeNull();
  });

  it('does not add pointEvidence without options, and ignores object points in legacy mode', () => {
    const legacy = parseTrendInsight(JSON.stringify({ headline: 'h', points: ['a', { text: 'b', refs: ['V1'] }] }))!;
    expect(legacy).toEqual({ headline: 'h', points: ['a'], keywords: [] });
    expect('pointEvidence' in legacy).toBe(false);
  });

  it('parses a thinking-block-free text assembled from mixed blocks (text only)', () => {
    const text = '{"headline":"h","points":[{"text":"t","refs":["V1"]}],"keywords":[]}';
    expect(parseTrendInsight(`\n${text}\n`, opts)!.points).toEqual(['t']);
  });
});

describe('insight cache keys', () => {
  it('uses v2 for hand and v1 for the other domains', () => {
    expect(insightCacheKey('hand', 30)).toBe('tech-trend-report:v2:hand:30');
    expect(insightCacheKey('hand', 7)).toBe('tech-trend-report:v2:hand:7');
    expect(insightCacheKey('rfm', 30)).toBe('tech-trend-report:v1:rfm:30');
    expect(insightCacheKey('production', 14)).toBe('tech-trend-report:v1:production:14');
  });
  it('invalidation patterns use the same scheme', () => {
    expect(insightCachePattern('hand')).toBe('tech-trend-report:v2:hand:%');
    expect(insightCachePattern('expo')).toBe('tech-trend-report:v1:expo:%');
    // 같은 도메인의 모든 days 키를 포함하는 접두 패턴
    expect(insightCacheKey('hand', 30).startsWith(insightCachePattern('hand').replace('%', ''))).toBe(true);
    expect(insightCacheKey('rfm', 30).startsWith(insightCachePattern('rfm').replace('%', ''))).toBe(true);
  });
});

describe('isUsableCachedInsight', () => {
  it('requires a non-empty points array; pointEvidence is optional (legacy shape)', () => {
    expect(isUsableCachedInsight({ points: ['a'] })).toBe(true);
    expect(isUsableCachedInsight({ points: ['a'], pointEvidence: [[]] })).toBe(true);
    expect(isUsableCachedInsight({ points: [] })).toBe(false);
    expect(isUsableCachedInsight({})).toBe(false);
    expect(isUsableCachedInsight(null)).toBe(false);
    expect(isUsableCachedInsight('x')).toBe(false);
  });
});
