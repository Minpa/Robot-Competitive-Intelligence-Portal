/**
 * weekly-brief-compose — 후보/점수/선별/규칙 문장/AI 응답 검증/상태 판정 (순수 함수)
 */
import { describe, it, expect } from 'vitest';
import {
  WEEKLY_BRIEF_SCORING,
  buildCandidates,
  classifyRow,
  composePayload,
  decideStatus,
  domainShareCandidate,
  extractNumberTokens,
  firstSentence,
  keywordDirection,
  keywordSurgeCandidate,
  pctChange,
  resolveThumbnail,
  resolveVideoUrl,
  ruleSentence,
  safeHttpsUrl,
  selectArticles,
  selectCiChanges,
  selectKeyMessages,
  selectKeywords,
  selectTopVideo,
  selectVideos,
  topCompanyCandidate,
  validateAiSelection,
  volumeChangeCandidate,
  ciChangeCandidates,
  type BriefRow,
  type CiChangeRow,
  type CollectedWeek,
  type KeywordCount,
} from '../../services/weekly-brief-compose.js';
import { getWeekRange } from '../../services/weekly-brief-period.js';

const range = getWeekRange('2026-10-19');
const prevRange = getWeekRange('2026-10-12');
const NOW = new Date('2026-10-25T23:00:00Z');

let seq = 0;
const uid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function video(meta: Record<string, unknown> = {}, extra: Partial<BriefRow> = {}): BriefRow {
  const id = extra.id ?? uid();
  return {
    id,
    title: `video ${id.slice(-4)}`,
    url: `https://www.youtube.com/watch?v=${'abcdefghi'}${id.slice(-2)}`,
    summary: null,
    source: 'youtube',
    productType: 'video',
    publishedAt: '2026-10-21T00:00:00.000Z',
    collectedAt: '2026-10-21T01:00:00.000Z',
    companyId: null,
    ts: '2026-10-21T00:00:00.000Z',
    extractedMetadata: { views: 1000, channel: `ch-${id.slice(-3)}`, ...meta },
    ...extra,
  };
}

function news(extra: Partial<BriefRow> = {}, source = 'news-a'): BriefRow {
  const id = extra.id ?? uid();
  return {
    id,
    title: `article ${id.slice(-4)}`,
    url: `https://example.com/a/${id.slice(-6)}`,
    summary: 'Short summary. Second sentence.',
    source,
    productType: 'none',
    publishedAt: '2026-10-21T00:00:00.000Z',
    collectedAt: '2026-10-21T01:00:00.000Z',
    companyId: null,
    ts: '2026-10-21T00:00:00.000Z',
    extractedMetadata: {},
    ...extra,
  };
}

function paper(extra: Partial<BriefRow> = {}): BriefRow {
  return news({ source: 'arxiv', productType: 'none', ...extra }, 'arxiv');
}

function emptyWeek(over: Partial<CollectedWeek> = {}): CollectedWeek {
  return {
    range,
    prevRange,
    rows: [],
    prevRows: [],
    truncated: false,
    videosAnalyzed: 0,
    prevVideosAnalyzed: 0,
    alerts: 0,
    prevAlerts: 0,
    newRobots: null,
    ciChanges: [],
    ciUpdates: 0,
    prevCiUpdates: 0,
    keywords: [],
    keywordEvidence: {},
    companies: [],
    warnings: [],
    ...over,
  };
}

/** n 개의 영상 중 k 개가 액추에이터, 나머지는 도메인 없음 + 뉴스 m 개 */
function domainRows(k: number, total: number, tag = 'actuator'): BriefRow[] {
  const rows: BriefRow[] = [];
  for (let i = 0; i < total; i++) rows.push(video(i < k ? { domain: tag } : {}));
  return rows;
}

const ciRow = (over: Partial<CiChangeRow> = {}): CiChangeRow => ({
  valueId: uid(),
  company: 'Acme',
  robot: 'A1',
  layer: 'HW',
  item: 'DoF',
  before: '10',
  after: '12',
  confidence: 'B',
  sourceName: 'spec',
  sourceUrl: 'https://example.com/spec',
  changedAt: '2026-10-22T00:00:00.000Z',
  valueChanged: true,
  ...over,
});

const kw = (term: string, count: number, prevCount: number): KeywordCount => ({ keywordId: `kw-${term}`, term, count, prevCount });

describe('basic helpers', () => {
  it('pctChange rounds to 1 decimal and is null when prev is 0', () => {
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(10, 3)).toBe(233.3);
    expect(pctChange(3, 10)).toBe(-70);
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });

  it('classifyRow: video / paper / news and excluded sources', () => {
    expect(classifyRow({ productType: 'video', source: 'youtube' })).toBe('video');
    expect(classifyRow({ productType: 'none', source: 'arxiv' })).toBe('paper');
    expect(classifyRow({ productType: 'none', source: 'techcrunch' })).toBe('news');
    for (const s of ['github', 'sec_edgar', 'patent']) expect(classifyRow({ productType: 'none', source: s })).toBeNull();
  });

  it('firstSentence takes the first sentence and caps at 90 chars including the ellipsis', () => {
    expect(firstSentence('First one. Second one.')).toBe('First one.');
    expect(firstSentence('Version 3.5 shipped. More.')).toBe('Version 3.5 shipped.');
    const long = 'a'.repeat(200);
    const out = firstSentence(long)!;
    expect(Array.from(out).length).toBe(90);
    expect(out.endsWith('…')).toBe(true);
    expect(firstSentence('   ')).toBeNull();
    expect(firstSentence(null)).toBeNull();
  });

  it('safeHttpsUrl accepts only plain https', () => {
    expect(safeHttpsUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(safeHttpsUrl('http://example.com/x')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('https://user:pw@example.com/')).toBeNull();
    expect(safeHttpsUrl(`https://example.com/${'a'.repeat(2001)}`)).toBeNull();
    expect(safeHttpsUrl(null)).toBeNull();
  });

  it('extractNumberTokens strips trailing punctuation', () => {
    expect(extractNumberTokens('24%가 증가, 1,234건. 3.5배 7.')).toEqual(['24', '1,234', '3.5', '7']);
  });
});

describe('thumbnails and video links', () => {
  it('keeps an i.ytimg.com https thumbnail', () => {
    expect(resolveThumbnail({ thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' }, null)).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  });
  it('replaces other hosts / schemes with a videoId based URL', () => {
    expect(resolveThumbnail({ thumbnail: 'https://evil.example.com/x.jpg', videoId: 'abcdefghijk' }, null)).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
    expect(resolveThumbnail({ thumbnail: 'http://i.ytimg.com/vi/x/a.jpg', videoId: 'abcdefghijk' }, null)).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
  });
  it('ignores a malformed videoId and extracts from the URL (?v= and youtu.be/)', () => {
    expect(resolveThumbnail({ videoId: 'short' }, 'https://www.youtube.com/watch?v=zzzzzzzzzzz')).toBe('https://i.ytimg.com/vi/zzzzzzzzzzz/mqdefault.jpg');
    expect(resolveThumbnail({}, 'https://youtu.be/yyyyyyyyyyy')).toBe('https://i.ytimg.com/vi/yyyyyyyyyyy/mqdefault.jpg');
  });
  it('returns null when nothing is usable', () => {
    expect(resolveThumbnail({ videoId: 'bad id!' }, 'https://example.com/v')).toBeNull();
    expect(resolveThumbnail(null, null)).toBeNull();
  });
  it('resolveVideoUrl allows only youtube hosts over https, else builds from videoId', () => {
    expect(resolveVideoUrl('https://www.youtube.com/watch?v=abcdefghijk', null)).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(resolveVideoUrl('https://youtu.be/abcdefghijk', null)).toBe('https://youtu.be/abcdefghijk');
    expect(resolveVideoUrl('https://evil.example.com/watch?v=abcdefghijk', 'abcdefghijk')).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(resolveVideoUrl('http://www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk')).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(resolveVideoUrl('https://evil.example.com/', 'bad')).toBeNull();
    expect(resolveVideoUrl(null, null)).toBeNull();
  });
});

describe('domain_share candidate', () => {
  it('requires numerator >= 5 and denominator >= 20', () => {
    expect(domainShareCandidate({ rows: domainRows(5, 20), prevRows: [] })).not.toBeNull();
    expect(domainShareCandidate({ rows: domainRows(4, 20), prevRows: [] })).toBeNull();
    expect(domainShareCandidate({ rows: domainRows(5, 19), prevRows: [] })).toBeNull();
  });

  it('numerator excludes videos the AI judged domainFocus=none; denominator is videos + news + papers', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => video({ domain: 'actuator' })),
      video({ domain: 'actuator', domainFocus: { actuator: { level: 'none' } } }),
      ...Array.from({ length: 14 }, () => video({})),
    ];
    const c = domainShareCandidate({ rows, prevRows: [] })!;
    expect(c.id).toBe('domain_share:actuator');
    expect(c.extra.numerator).toBe(5);
    expect(c.extra.denominator).toBe(20);
    expect(c.bigNumber).toMatchObject({ value: '25', unit: '%' });
    expect(c.bigNumber.caption).toBe('액추에이터 관련 5건 / 전체 20건');
    // 행 하나가 none 이라도 분모에는 포함된다
    expect(c.basis).toBe('근거: 도메인 태그 집계 (영상 5 · 기사·논문 0)');
  });

  it('paper domains count arxiv rows, news domains count news rows', () => {
    const rows = [
      ...Array.from({ length: 6 }, () => paper({ title: 'A new actuator with harmonic drive', summary: null })),
      // 뉴스 행은 actuator(논문 축) 분자에 들어가지 않는다
      ...Array.from({ length: 4 }, () => news({ title: 'actuator news', summary: null })),
      ...Array.from({ length: 14 }, () => video({})),
    ];
    const c = domainShareCandidate({ rows, prevRows: [] })!;
    expect(c.extra.domain).toBe('actuator');
    expect(c.extra.numerator).toBe(6);

    const prodRows = [
      ...Array.from({ length: 6 }, () => news({ title: 'Mass production begins', summary: null })),
      ...Array.from({ length: 6 }, () => paper({ title: 'mass production line', summary: null })),
      ...Array.from({ length: 10 }, () => video({})),
    ];
    const p = domainShareCandidate({ rows: prodRows, prevRows: [] })!;
    expect(p.extra.domain).toBe('production');
    expect(p.extra.numerator).toBe(6);
  });

  it('delta is the percentage-point difference to last week and null when last week denominator < 20', () => {
    const cur = domainRows(10, 40); // 25%
    const prev = domainRows(5, 25); // 20%
    const c = domainShareCandidate({ rows: cur, prevRows: prev })!;
    expect(c.delta).toEqual({ value: '+5.0', unit: '%p', label: '지난주 대비' });
    const small = domainShareCandidate({ rows: cur, prevRows: domainRows(5, 19) })!;
    expect(small.delta).toBeNull();
    const down = domainShareCandidate({ rows: domainRows(10, 40), prevRows: domainRows(15, 25) })!;
    expect(down.delta?.value).toBe('-35.0');
  });

  it('picks only the highest-scoring domain', () => {
    const rows = [
      ...Array.from({ length: 8 }, () => video({ domain: 'hand' })),
      ...Array.from({ length: 12 }, () => video({ domain: 'rfm' })),
      ...Array.from({ length: 10 }, () => video({})),
    ];
    const cands = buildCandidates(emptyWeek({ rows })).filter((c) => c.type === 'domain_share');
    expect(cands).toHaveLength(1);
    expect(cands[0]!.id).toBe('domain_share:rfm');
  });
});

describe('keywords', () => {
  it('direction rules', () => {
    expect(keywordDirection(5, 0)).toBe('new');
    expect(keywordDirection(10, 10)).toBe('flat');
    expect(keywordDirection(104, 100)).toBe('flat');
    expect(keywordDirection(106, 100)).toBe('up');
    expect(keywordDirection(90, 100)).toBe('down');
  });

  it('representative is the biggest deltaPct among prevCount >= 3; the rest follow by count (max 7)', () => {
    const all = [kw('big', 100, 90), kw('surge', 20, 10), kw('newish', 500, 0), kw('tiny', 4, 1), kw('small-prev', 50, 2), ...Array.from({ length: 10 }, (_, i) => kw(`k${i}`, 100 + i, 100))];
    const { keywords, representative } = selectKeywords(all);
    expect(representative?.term).toBe('surge');
    expect(keywords[0]).toMatchObject({ term: 'surge', deltaPct: 100, direction: 'up' });
    expect(keywords).toHaveLength(8);
    expect(keywords.slice(1).map((k) => k.count)).toEqual([...keywords.slice(1).map((k) => k.count)].sort((a, b) => b - a));
    expect(keywords.find((k) => k.term === 'tiny')).toBeUndefined(); // count < 5
    const newish = keywords.find((k) => k.term === 'newish')!;
    expect(newish).toMatchObject({ deltaPct: null, direction: 'new' });
  });

  it('without a representative the first keyword is the one with the highest count and no surge candidate exists', () => {
    const all = [kw('a', 40, 0), kw('b', 12, 1), kw('c', 6, 2)];
    const { keywords, representative } = selectKeywords(all);
    expect(representative).toBeNull();
    expect(keywords[0]!.term).toBe('a');
    expect(keywordSurgeCandidate({ keywords: all, keywordEvidence: {} })).toBeNull();
  });

  it('keyword_surge boundary: exactly +20% qualifies, +19% does not; needs cur >= 5 and prev >= 3', () => {
    expect(keywordSurgeCandidate({ keywords: [kw('x', 12, 10)], keywordEvidence: {} })).not.toBeNull();
    expect(keywordSurgeCandidate({ keywords: [kw('x', 119, 100)], keywordEvidence: {} })).toBeNull();
    expect(keywordSurgeCandidate({ keywords: [kw('x', 4, 3)], keywordEvidence: {} })).toBeNull(); // cur < 5
    expect(keywordSurgeCandidate({ keywords: [kw('x', 20, 2)], keywordEvidence: {} })).toBeNull(); // prev < 3 -> 대표 후보 아님
  });

  it('keyword_surge builds sign, caption and evidence (keyword + 2 articles)', () => {
    const c = keywordSurgeCandidate({
      keywords: [kw('tactile', 41, 29)],
      keywordEvidence: {
        'kw-tactile': [
          { articleId: 'a1', title: 'T1', url: 'https://example.com/1', source: 's' },
          { articleId: 'a2', title: 'T2', url: 'http://example.com/2', source: 's' },
          { articleId: 'a3', title: 'T3', url: 'https://example.com/3', source: 's' },
        ],
      },
    })!;
    expect(c.bigNumber).toEqual({ value: '+41', unit: '%', caption: '29회 → 41회' });
    expect(c.rule.headline).toBe('"tactile" 언급이 지난주 대비 41% 증가했습니다');
    expect(c.evidence.map((e) => e.type)).toEqual(['keyword', 'article', 'article']);
    expect(c.evidence[0]!.url).toBeNull();
    expect(c.evidence[2]!.url).toBeNull(); // http 는 서버에서 null
    const down = keywordSurgeCandidate({ keywords: [kw('old', 10, 20)], keywordEvidence: {} })!;
    expect(down.bigNumber.value).toBe('-50');
    expect(down.rule.headline).toBe('"old" 언급이 지난주 대비 50% 감소했습니다');
  });
});

describe('top_company / volume_change candidates', () => {
  it('top_company needs count >= 8, delta null when prev is 0', () => {
    const rows = [video({}, { companyId: 'c1' }), news({ companyId: 'c1' })];
    const mk = (count: number, prevCount: number) => topCompanyCandidate({ rows, companies: [{ companyId: 'c1', name: 'Acme', count, prevCount }] });
    expect(mk(7, 3)).toBeNull();
    const c = mk(8, 4)!;
    expect(c.bigNumber).toMatchObject({ value: '8', unit: '건' });
    expect(c.delta).toEqual({ value: '+100.0', unit: '%', label: '지난주 대비' });
    expect(c.rule.headline).toBe('Acme 관련 기사·영상이 8건으로 가장 많았습니다');
    expect(c.rule.caption).toBe('지난주 4건');
    expect(mk(8, 0)!.delta).toBeNull();
    expect(c.evidence.length).toBeLessThanOrEqual(3);
  });

  it('volume_change needs cur >= 20, prev >= 20 and |delta| >= 10%', () => {
    const mk = (cur: number, prev: number) => volumeChangeCandidate({ rows: domainRows(0, cur), prevRows: domainRows(0, prev) });
    expect(mk(19, 20)).toBeNull();
    expect(mk(20, 19)).toBeNull();
    expect(mk(21, 20)).toBeNull(); // +5%
    const up = mk(22, 20)!;
    expect(up.bigNumber).toMatchObject({ value: '+10', unit: '%' });
    expect(up.rule.headline).toBe('이번 주 수집량이 지난주 대비 10% 증가했습니다');
    expect(up.rule.caption).toBe('20건 → 22건');
    const down = mk(20, 30)!;
    expect(down.bigNumber.value).toBe('-33');
    expect(down.rule.headline).toContain('감소');
  });
});

describe('ci changes', () => {
  it('sorts by confidence, then value change, then valid source, then recency; max 2 per company', () => {
    const rows = [
      ciRow({ company: 'A', confidence: 'B', changedAt: '2026-10-20T00:00:00.000Z' }),
      ciRow({ company: 'A', confidence: 'A', changedAt: '2026-10-19T00:00:00.000Z' }),
      ciRow({ company: 'A', confidence: 'A', changedAt: '2026-10-21T00:00:00.000Z' }),
      ciRow({ company: 'B', confidence: 'C', valueChanged: false }),
      ciRow({ company: 'B', confidence: 'C', valueChanged: true, sourceUrl: null }),
      ciRow({ company: 'C', confidence: 'C', valueChanged: true, sourceUrl: 'https://example.com/s' }),
    ];
    const { ciChanges, companies } = selectCiChanges(rows);
    expect(ciChanges).toHaveLength(4);
    expect(ciChanges.map((c) => c.company)).toEqual(['A', 'A', 'C', 'B']);
    expect(ciChanges.filter((c) => c.company === 'A')).toHaveLength(2);
    expect(ciChanges[0]!.changedAt > ciChanges[1]!.changedAt).toBe(true);
    expect(ciChanges.every((c) => c.confidence !== 'B')).toBe(true); // A 회사 3번째(B)는 회사 상한으로 제외
    expect(companies).toBe(3);
  });

  it('D/F are used only to fill up to 2 when fewer than 2 rows are A..C', () => {
    const none = selectCiChanges([ciRow({ company: 'A', confidence: 'D' }), ciRow({ company: 'B', confidence: 'F' }), ciRow({ company: 'C', confidence: 'D' })]);
    expect(none.ciChanges).toHaveLength(2);
    const one = selectCiChanges([ciRow({ company: 'A', confidence: 'A' }), ciRow({ company: 'B', confidence: 'D' }), ciRow({ company: 'C', confidence: 'D' })]);
    expect(one.ciChanges.map((c) => c.confidence)).toEqual(['A', 'D']);
    const two = selectCiChanges([ciRow({ company: 'A', confidence: 'A' }), ciRow({ company: 'B', confidence: 'C' }), ciRow({ company: 'C', confidence: 'D' })]);
    expect(two.ciChanges.map((c) => c.confidence)).toEqual(['A', 'C']);
  });

  it('truncates before/after to 120 chars, drops non-https sources, defaults an unknown grade to D', () => {
    const r = selectCiChanges([ciRow({ before: 'b'.repeat(300), after: 'a'.repeat(300), sourceUrl: 'http://example.com', confidence: null })]).ciChanges[0]!;
    expect(Array.from(r.before!).length).toBe(120);
    expect(Array.from(r.after).length).toBe(120);
    expect(r.sourceUrl).toBeNull();
    expect(r.confidence).toBe('D');
  });

  it('ci_change candidates: at most 2, score = base + grade + value change + valid source', () => {
    const rows = [
      ciRow({ company: 'A', confidence: 'A', valueChanged: true }),
      ciRow({ company: 'B', confidence: 'B', valueChanged: false, sourceUrl: null }),
      ciRow({ company: 'C', confidence: 'C', valueChanged: true }),
    ];
    const cands = ciChangeCandidates({ ciChanges: rows });
    expect(cands).toHaveLength(2);
    expect(cands[0]!.score).toBe(40 + 20 + 10 + 5);
    expect(cands[1]!.score).toBe(40 + 8 + 10 + 5);
    expect(cands[0]!.kind).toBe('cause_effect');
    expect(cands[0]!.rule.headline).toBe('A의 DoF 정보가 갱신되었습니다');
    expect(cands[0]!.rule.caption).toBe('10 → 12 · 신뢰도 A');
    expect(cands[0]!.bigNumber.value).toBe('12');
  });

  it('long after values are cut to 24 chars for the big number', () => {
    const c = ciChangeCandidates({ ciChanges: [ciRow({ after: 'x'.repeat(100) })] })[0]!;
    expect(Array.from(c.bigNumber.value).length).toBe(24);
    expect(Array.from(c.bigNumber.caption).length).toBeLessThanOrEqual(50);
  });
});

describe('score ordering', () => {
  it('uses the documented formulas (domain_share > keyword_surge > ci_change(A) > top_company > volume_change for typical values)', () => {
    const S = WEEKLY_BRIEF_SCORING;
    const domain = S.domainShare.base + Math.min(S.domainShare.deltaCap, 5 * S.domainShare.deltaWeight) + Math.min(S.domainShare.shareCap, 25 / S.domainShare.shareDivisor);
    expect(domain).toBe(50 + 15 + 5);
    const surge = S.keywordSurge.base + Math.min(S.keywordSurge.cap, 41.4 / S.keywordSurge.divisor);
    expect(surge).toBeCloseTo(55.35, 5);
    const ciA = S.ciChange.base + S.ciChange.confidence.A! + S.ciChange.valueChanged + S.ciChange.validSource;
    expect(ciA).toBe(75);
    // 실제 후보로 확인
    const rows = domainRows(10, 40);
    const week = emptyWeek({
      rows,
      prevRows: domainRows(5, 25),
      keywords: [kw('tactile', 41, 29)],
      ciChanges: [ciRow({ confidence: 'A' })],
    });
    const cands = buildCandidates(week);
    const byType = Object.fromEntries(cands.map((c) => [c.type, c.score]));
    expect(byType.domain_share).toBeCloseTo(domain, 5);
    expect(byType.keyword_surge).toBeCloseTo(surge, 5);
    expect(byType.ci_change).toBe(75);
    expect(cands.map((c) => c.score)).toEqual([...cands.map((c) => c.score)].sort((a, b) => b - a));
  });
});

describe('selectTopVideo', () => {
  it('picks the highest views, then newest ts, then id ascending', () => {
    const a = video({ views: 500 }, { id: 'b-id', ts: '2026-10-20T00:00:00.000Z' });
    const b = video({ views: 900 }, { id: 'z-id', ts: '2026-10-19T00:00:00.000Z' });
    const c = video({ views: 900 }, { id: 'a-id', ts: '2026-10-19T00:00:00.000Z' });
    const d = video({ views: 900 }, { id: 'y-id', ts: '2026-10-22T00:00:00.000Z' });
    expect(selectTopVideo([a, b, c, d])!.id).toBe('y-id');
    expect(selectTopVideo([a, b, c])!.id).toBe('a-id');
  });

  it('skips videos the AI judged not relevant in every judged domain', () => {
    const none = video({ views: 99999, domainFocus: { hand: { level: 'none' }, actuator: { level: 'none' } } });
    const ok = video({ views: 10 });
    expect(selectTopVideo([none, ok])!.id).toBe(ok.id);
    const partial = video({ views: 5000, domainFocus: { hand: { level: 'none' }, actuator: { level: 'secondary' } } });
    expect(selectTopVideo([partial, ok])!.id).toBe(partial.id);
  });

  it('falls back to the newest analyzed video when no views, then null', () => {
    const analyzed = video({ views: undefined, geminiAnalyzedAt: '2026-10-22T00:00:00.000Z', geminiAnalysis: { summaryKo: '첫 문장입니다. 둘째 문장.', durationSec: 123 } }, { ts: '2026-10-22T00:00:00.000Z' });
    const plain = video({ views: undefined }, { ts: '2026-10-23T00:00:00.000Z' });
    const top = selectTopVideo([plain, analyzed])!;
    expect(top.id).toBe(analyzed.id);
    expect(top.analysisLine).toBe('첫 문장입니다.');
    expect(top.durationSec).toBe(123);
    expect(top.analyzed).toBe(true);
    expect(selectTopVideo([plain])).toBeNull();
    expect(selectTopVideo([])).toBeNull();
    expect(selectTopVideo([news()])).toBeNull();
  });
});

describe('selectVideos', () => {
  const v = (i: number, meta: Record<string, unknown> = {}) => video({ views: 100_000 - i * 1000, ...meta }, { id: `vid-${String(i).padStart(3, '0')}` });

  it('returns at most 8 and never more than 3 per domain bucket when others are available', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => v(i, { domain: 'actuator', channel: `a${i}` })),
      ...Array.from({ length: 10 }, (_, i) => v(10 + i, { domain: 'hand', channel: `h${i}` })),
      ...Array.from({ length: 10 }, (_, i) => v(20 + i, { channel: `o${i}` })),
    ];
    const out = selectVideos(rows);
    expect(out).toHaveLength(8);
    const counts = new Map<string, number>();
    for (const o of out) counts.set(o.domain ?? 'other', (counts.get(o.domain ?? 'other') ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('allows at most 2 per channel while enough distinct channels exist', () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => v(i, { channel: 'same' })),
      ...Array.from({ length: 6 }, (_, i) => v(10 + i, { channel: `c${i}`, domain: i % 2 ? 'hand' : 'rfm' })),
    ];
    const out = selectVideos(rows);
    expect(out.filter((o) => o.channel === 'same')).toHaveLength(2);
    expect(out).toHaveLength(8);
  });

  it('relaxes the bucket cap first, then the channel cap, when fewer than 8 qualify', () => {
    const sameBucket = Array.from({ length: 6 }, (_, i) => v(i, { domain: 'actuator', channel: `c${i}` }));
    expect(selectVideos(sameBucket)).toHaveLength(6); // 버킷 상한 완화
    const sameChannel = Array.from({ length: 5 }, (_, i) => v(i, { domain: 'actuator', channel: 'one' }));
    expect(selectVideos(sameChannel)).toHaveLength(5); // 채널 상한도 완화
  });

  it('excludes the top video and videos judged irrelevant everywhere', () => {
    const top = v(0);
    const none = v(1, { domainFocus: { hand: { level: 'none' } } });
    const ok = v(2);
    const out = selectVideos([top, none, ok], top.id);
    expect(out.map((o) => o.id)).toEqual([ok.id]);
  });

  it('ties on score are broken by newest ts then id', () => {
    const a = video({ views: 1000, channel: 'x1' }, { id: 'id-b', ts: '2026-10-20T00:00:00.000Z' });
    const b = video({ views: 1000, channel: 'x2' }, { id: 'id-a', ts: '2026-10-20T00:00:00.000Z' });
    const c = video({ views: 1000, channel: 'x3' }, { id: 'id-c', ts: '2026-10-22T00:00:00.000Z' });
    expect(selectVideos([a, b, c]).map((o) => o.id)).toEqual(['id-c', 'id-a', 'id-b']);
  });

  it('score prefers views, an analysis, and a thumbnail', () => {
    const lowViewsAnalyzed = video({ views: 1000, geminiAnalyzedAt: '2026-10-21T00:00:00.000Z', channel: 'p' }, { id: 'p' });
    const highViews = video({ views: 100_000, channel: 'q' }, { id: 'q' });
    const out = selectVideos([lowViewsAnalyzed, highViews]);
    expect(out[0]!.id).toBe('q');
  });
});

describe('selectArticles', () => {
  it('takes at most 3 per source (hard cap, never relaxed) and at most 12 overall', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => news({}, 'a')),
      ...Array.from({ length: 10 }, () => news({}, 'b')),
    ];
    const out = selectArticles(rows);
    expect(out).toHaveLength(6);
    const per = new Map<string, number>();
    for (const o of out) per.set(o.source, (per.get(o.source) ?? 0) + 1);
    expect([...per.values()].every((n) => n <= 3)).toBe(true);

    const many = Array.from({ length: 30 }, (_, i) => news({}, `s${i % 10}`));
    expect(selectArticles(many)).toHaveLength(12);
  });

  it('ignores videos, papers and excluded sources and drops non-https URLs', () => {
    const rows = [video({}), paper(), news({}, 'github'), news({ url: 'http://example.com/x' }), news({ url: 'javascript:alert(1)' }), news({ url: 'https://example.com/ok' })];
    const out = selectArticles(rows);
    expect(out.map((o) => o.url)).toEqual(['https://example.com/ok']);
  });

  it('domain matches rank above plain rows; summary line is cut to 90 chars and can be switched off', () => {
    const plain = news({ title: 'plain news', summary: null, ts: '2026-10-22T00:00:00.000Z' }, 'x');
    const domain = news({ title: 'Mass production starts', summary: 'x'.repeat(200), ts: '2026-10-20T00:00:00.000Z' }, 'y');
    const out = selectArticles([plain, domain]);
    expect(out[0]!.id).toBe(domain.id);
    expect(out[0]!.domain).toBe('production');
    expect(Array.from(out[0]!.summaryLine!).length).toBe(90);
    expect(selectArticles([plain, domain], false).every((o) => o.summaryLine === null)).toBe(true);
  });
});

describe('rule sentences', () => {
  it('domain_share template', () => {
    const c = domainShareCandidate({ rows: domainRows(10, 40), prevRows: [] })!;
    expect(ruleSentence(c)).toEqual({ headline: '이번 주 수집된 영상·기사 중 25%가 액추에이터 주제였습니다', caption: '액추에이터 관련 10건 / 전체 40건' });
    expect(Array.from(c.rule.headline).length).toBeLessThanOrEqual(60);
    expect(Array.from(c.rule.caption).length).toBeLessThanOrEqual(50);
  });
});

describe('validateAiSelection', () => {
  const week = emptyWeek({
    rows: domainRows(10, 40),
    prevRows: domainRows(5, 25),
    keywords: [kw('tactile', 41, 29)],
    ciChanges: [ciRow({ company: 'A', confidence: 'A' }), ciRow({ company: 'B', confidence: 'B' }), ciRow({ company: 'C', confidence: 'C' })],
  });
  const cands = buildCandidates(week);
  const domainId = 'domain_share:actuator';
  const kwId = 'keyword_surge:kw-tactile';
  const ciIds = cands.filter((c) => c.type === 'ci_change').map((c) => c.id);
  const sel = (candidateId: string, headline = '액추에이터 비중이 25%였습니다', caption = '10건 / 40건', note: unknown = null) => ({ candidateId, headline, caption, note });

  it('accepts a valid selection and keeps the order', () => {
    const v = validateAiSelection({ selections: [sel(kwId, '"tactile" 언급이 41% 늘었습니다', '29회에서 41회'), sel(domainId)] }, cands);
    expect(v.accepted.map((a) => a.candidateId)).toEqual([kwId, domainId]);
    expect(v.order).toEqual([kwId, domainId]);
    expect(v.rejected).toEqual([]);
  });

  it('accepts a bare array too', () => {
    expect(validateAiSelection([sel(domainId)], cands).accepted).toHaveLength(1);
  });

  it('rejects unknown ids, duplicate ids and over-limit types (ci_change allows 2)', () => {
    const v = validateAiSelection({ selections: [sel('nope:1'), sel(domainId), sel(domainId), sel(ciIds[0]!, 'A 정보가 갱신되었습니다', '10 → 12'), sel(ciIds[1]!, 'B 정보가 갱신되었습니다', '10 → 12'), sel(kwId, '"tactile" 41%', '29회')] }, cands);
    expect(v.rejected.map((r) => r.reason)).toEqual(['unknown_candidate', 'duplicate_id', 'too_many']);
    expect(v.order).toEqual([domainId, ciIds[0], ciIds[1]]);
    // 세 번째 ci_change 는 유형 한도(2) 초과 -> type_limit (후보 생성기는 2개까지만 만들므로 복제본으로 확인)
    const ci0 = cands.find((c) => c.id === ciIds[0])!;
    const clones = [1, 2, 3].map((n) => ({ ...ci0, id: `ci_change:clone${n}` }));
    const kw0 = cands.find((c) => c.id === kwId)!;
    const withClones = [...cands, ...clones, { ...kw0, id: 'keyword_surge:other' }];
    const t = validateAiSelection({ selections: [sel(clones[0]!.id, 'A', '1'), sel(clones[1]!.id, 'B', '1'), sel(clones[2]!.id, 'C', '1')] }, withClones);
    expect(t.rejected).toContainEqual({ id: clones[2]!.id, reason: 'type_limit' });
    expect(t.order).toEqual([clones[0]!.id, clones[1]!.id]);
    const k = validateAiSelection({ selections: [sel(kwId, '"tactile" 41%', '29회'), sel('keyword_surge:other', '"tactile" 41%', '29회')] }, withClones);
    expect(k.rejected).toEqual([{ id: 'keyword_surge:other', reason: 'type_limit' }]);
  });

  it('keeps the candidate but drops the text when it is too long (headline 60 / caption 50 / note 80)', () => {
    const long = (n: number) => '가'.repeat(n);
    const h = validateAiSelection({ selections: [sel(domainId, long(61))] }, cands);
    expect(h.rejected).toEqual([{ id: domainId, reason: 'too_long' }]);
    expect(h.accepted).toEqual([]);
    expect(h.order).toEqual([domainId]);
    expect(validateAiSelection({ selections: [sel(domainId, long(60))] }, cands).accepted).toHaveLength(1);
    expect(validateAiSelection({ selections: [sel(domainId, '문장', long(51))] }, cands).rejected[0]!.reason).toBe('too_long');
    expect(validateAiSelection({ selections: [sel(domainId, '문장', '캡션', long(81))] }, cands).rejected[0]!.reason).toBe('too_long');
    expect(validateAiSelection({ selections: [sel(domainId, '문장', '캡션', long(80))] }, cands).accepted[0]!.note).toBe(long(80));
  });

  it('rejects text with "<", "http" or line breaks', () => {
    for (const bad of ['a <b> c', 'see http://x', 'see HTTPS://x', '줄\n바꿈']) {
      expect(validateAiSelection({ selections: [sel(domainId, bad)] }, cands).rejected[0]!.reason).toBe('forbidden_text');
    }
    expect(validateAiSelection({ selections: [sel(domainId, '문장', '캡션', '노트 <i>')] }, cands).rejected[0]!.reason).toBe('forbidden_text');
  });

  it('number guard: numbers outside the candidate facts are rejected, allowed ones pass', () => {
    const c = cands.find((x) => x.id === domainId)!;
    expect(c.allowedNumbers).toEqual(expect.arrayContaining(['25', '10', '40', '5.0']));
    const bad = validateAiSelection({ selections: [sel(domainId, '비중이 99%였습니다')] }, cands);
    expect(bad.rejected).toEqual([{ id: domainId, reason: 'number_not_allowed' }]);
    expect(bad.order).toEqual([domainId]); // 규칙 문장으로 대체될 후보로 남는다
    const inCaption = validateAiSelection({ selections: [sel(domainId, '문장', '건수 123건')] }, cands);
    expect(inCaption.rejected[0]!.reason).toBe('number_not_allowed');
    const inNote = validateAiSelection({ selections: [sel(domainId, '문장', '캡션', '2026년 기준')] }, cands);
    expect(inNote.rejected[0]!.reason).toBe('number_not_allowed');
    // 문장 끝 마침표가 붙은 허용 숫자는 통과
    expect(validateAiSelection({ selections: [sel(domainId, '전체 40건 중 10건.', '25%')] }, cands).accepted).toHaveLength(1);
  });

  it('rejects empty text and a malformed top-level shape', () => {
    expect(validateAiSelection({ selections: [sel(domainId, '', '캡션')] }, cands).rejected[0]!.reason).toBe('empty_text');
    expect(validateAiSelection('nope', cands).rejected).toEqual([{ id: '*', reason: 'invalid_shape' }]);
    expect(validateAiSelection({ selections: 'x' }, cands).accepted).toEqual([]);
  });
});

describe('selectKeyMessages / composePayload', () => {
  const baseWeek = () =>
    emptyWeek({
      rows: [...domainRows(10, 30), ...Array.from({ length: 10 }, () => news({}, 'a'))],
      prevRows: domainRows(5, 25),
      keywords: [kw('tactile', 41, 29)],
      ciChanges: [ciRow({ confidence: 'A' })],
    });

  it('without AI: top 3 by score using rule sentences, stat messages first, status partial', () => {
    const r = composePayload(baseWeek(), null, NOW);
    expect(r.payload.keyMessages).toHaveLength(3);
    expect(r.payload.keyMessages.every((m) => m.generatedBy === 'rule')).toBe(true);
    expect(r.payload.keyMessages[0]!.kind).toBe('stat');
    expect(r.payload.keyMessages.map((m) => m.kind)).toEqual(['stat', 'stat', 'cause_effect']);
    expect(r.status).toBe('partial');
    expect(r.payload.meta).toMatchObject({ aiUsed: false, ruleBasedMessages: 3 });
  });

  it('with a fully valid AI selection: ai sentences, order respected, status ok', () => {
    const week = baseWeek();
    const cands = buildCandidates(week);
    const domain = cands.find((c) => c.type === 'domain_share')!;
    const ci = cands.find((c) => c.type === 'ci_change')!;
    const ai = {
      selections: [
        { candidateId: ci.id, headline: 'Acme의 DoF 정보가 갱신되었습니다', caption: '10 → 12', note: null },
        { candidateId: domain.id, headline: '액추에이터 비중이 25%로 집계되었습니다', caption: '10건 / 40건', note: '전체 40건 기준입니다.' },
      ],
    };
    const r = composePayload(week, ai, NOW);
    expect(r.payload.keyMessages.map((m) => m.id)).toEqual([domain.id, ci.id]); // stat 이 앞으로
    expect(r.payload.keyMessages.every((m) => m.generatedBy === 'ai')).toBe(true);
    expect(r.payload.keyMessages[0]!.headline).toBe('액추에이터 비중이 25%로 집계되었습니다');
    expect(r.payload.keyMessages[0]!.note).toBe('전체 40건 기준입니다.');
    // 큰 숫자와 증감은 서버 값
    expect(r.payload.keyMessages[0]!.bigNumber.value).toBe(domain.bigNumber.value);
    expect(r.payload.keyMessages[0]!.delta).toEqual(domain.delta);
    expect(r.status).toBe('ok');
    expect(r.payload.meta).toMatchObject({ aiUsed: true, ruleBasedMessages: 0 });
  });

  it('an AI sentence with an invented number is replaced by the rule sentence for that candidate (partial)', () => {
    const week = baseWeek();
    const domainId = 'domain_share:actuator';
    const r = composePayload(week, { selections: [{ candidateId: domainId, headline: '비중이 77%였습니다', caption: '10건 / 40건', note: null }, { candidateId: 'keyword_surge:kw-tactile', headline: '"tactile" 언급이 41% 늘었습니다', caption: '29회 → 41회', note: null }] }, NOW);
    const d = r.payload.keyMessages.find((m) => m.id === domainId)!;
    expect(d.generatedBy).toBe('rule');
    expect(d.headline).toBe('이번 주 수집된 영상·기사 중 25%가 액추에이터 주제였습니다');
    expect(d.bigNumber.value).toBe('25');
    const k = r.payload.keyMessages.find((m) => m.id === 'keyword_surge:kw-tactile')!;
    expect(k.generatedBy).toBe('ai');
    expect(r.status).toBe('partial');
    expect(r.payload.meta).toMatchObject({ aiUsed: true, ruleBasedMessages: 1 });
    expect(r.stats.aiRejected).toEqual([{ id: domainId, reason: 'number_not_allowed' }]);
  });

  it('when AI selections are all unusable the rule path fills in and the reason is recorded', () => {
    const r = composePayload(baseWeek(), { selections: [{ candidateId: 'bogus' }] }, NOW);
    expect(r.payload.keyMessages).toHaveLength(3);
    expect(r.payload.meta.warnings).toContain('ai_no_valid_selection');
    expect(r.payload.meta.aiUsed).toBe(false);
  });

  it('keyMessages is empty and the status stays ok when there are no candidates but data exists', () => {
    const rows = [...Array.from({ length: 3 }, () => video({})), ...Array.from({ length: 3 }, () => news({}, 'a'))];
    const r = composePayload(emptyWeek({ rows }), null, NOW);
    expect(r.payload.keyMessages).toEqual([]);
    expect(r.status).toBe('ok');
  });

  it('empty data hides every section: empty arrays/null, partial + no_data', () => {
    const r = composePayload(emptyWeek(), null, NOW);
    const p = r.payload;
    expect(p.keyMessages).toEqual([]);
    expect(p.topVideo).toBeNull();
    expect(p.ciChanges).toEqual([]);
    expect(p.keywords).toEqual([]);
    expect(p.videos).toEqual([]);
    expect(p.articles).toEqual([]);
    expect(p.ciSummary).toEqual({ updates: 0, companies: 0 });
    expect(p.meta.warnings).toContain('no_data');
    expect(r.status).toBe('partial');
  });

  it('header: ISO week, UTC period, counts and deltas', () => {
    const rows = [...Array.from({ length: 4 }, () => video({})), ...Array.from({ length: 6 }, () => news({}, 'a'))];
    const prevRows = [...Array.from({ length: 2 }, () => video({})), ...Array.from({ length: 5 }, () => news({}, 'a'))];
    const r = composePayload(emptyWeek({ rows, prevRows, videosAnalyzed: 3, prevVideosAnalyzed: 0, alerts: 2, prevAlerts: 4, ciUpdates: 6, prevCiUpdates: 3, newRobots: 1 }), null, NOW);
    expect(r.payload.header).toMatchObject({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      isoYear: 2026,
      weekNumber: 43,
      periodStartAt: '2026-10-18T15:00:00.000Z',
      periodEndAt: '2026-10-25T14:59:59.999Z',
      generatedAt: NOW.toISOString(),
      counts: { articles: 6, videosNew: 4, videosAnalyzed: 3, ciUpdates: 6, alerts: 2, newRobots: 1 },
      deltas: { articles: 20, videosNew: 100, videosAnalyzed: null, ciUpdates: 100, alerts: -50 },
    });
    expect(composePayload(emptyWeek({ rows }), null, NOW).payload.header.counts).not.toHaveProperty('newRobots');
  });

  it('respects section limits', () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => video({ views: 1000 + i, channel: `c${i}`, domain: i % 2 ? 'hand' : 'rfm' })),
      ...Array.from({ length: 30 }, (_, i) => news({}, `s${i % 9}`)),
    ];
    const r = composePayload(
      emptyWeek({
        rows,
        ciChanges: Array.from({ length: 8 }, (_, i) => ciRow({ company: `co${i}` })),
        keywords: Array.from({ length: 12 }, (_, i) => kw(`k${i}`, 10 + i, 8)),
      }),
      null,
      NOW,
    );
    const p = r.payload;
    expect(p.videos.length).toBeLessThanOrEqual(8);
    expect(p.videos.some((v) => v.id === p.topVideo!.id)).toBe(false);
    expect(p.articles.length).toBeLessThanOrEqual(12);
    expect(p.ciChanges.length).toBeLessThanOrEqual(4);
    expect(p.keywords.length).toBeLessThanOrEqual(8);
    expect(p.keyMessages.length).toBeLessThanOrEqual(3);
    expect(p.ciSummary.companies).toBe(8);
  });

  it('truncation adds a warning and the flag', () => {
    const r = composePayload(emptyWeek({ truncated: true }), null, NOW);
    expect(r.payload.meta.truncated).toBe(true);
    expect(r.payload.meta.warnings).toContain('rows_truncated');
  });

  it('selectKeyMessages fills by score up to 3 when the AI order is shorter than 2', () => {
    const cands = buildCandidates(baseWeek());
    const domain = cands.find((c) => c.type === 'domain_share')!;
    const msgs = selectKeyMessages(cands, { accepted: [], rejected: [], order: [domain.id] });
    expect(msgs).toHaveLength(3);
    expect(new Set(msgs.map((m) => m.id)).size).toBe(3);
  });
});

describe('decideStatus', () => {
  const ai = { generatedBy: 'ai' as const };
  const rule = { generatedBy: 'rule' as const };
  it.each([
    ['all ai', [ai, ai], [], false, 'ok'],
    ['a rule sentence', [ai, rule], [], false, 'partial'],
    ['collector failure', [ai], ['ci_failed'], false, 'partial'],
    ['optional collector failure code', [], ['keywords_failed'], false, 'partial'],
    ['no data', [], [], true, 'partial'],
    ['ai disabled with no candidates', [], ['ai_disabled'], false, 'partial'],
    ['harmless warnings', [ai], ['rows_truncated', 'ai_truncated'], false, 'ok'],
    ['no candidates but data', [], [], false, 'ok'],
  ] as const)('%s -> %s', (_name, keyMessages, warnings, noData, expected) => {
    expect(decideStatus({ keyMessages: [...keyMessages], warnings: [...warnings], noData })).toBe(expected);
  });
});
