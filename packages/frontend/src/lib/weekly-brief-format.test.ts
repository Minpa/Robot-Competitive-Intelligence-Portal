import { afterEach, describe, expect, it } from 'vitest';
import {
  buildStatItems,
  clipText,
  formatCostUsd,
  formatCountsSummary,
  formatDeltaPct,
  formatDuration,
  formatDurationMs,
  formatKstDate,
  formatKstDateTime,
  formatKstMonthDay,
  formatPeriod,
  formatSignedPct,
  formatViews,
  formatWeekTitle,
  isPosterEmpty,
  isValidWeekStart,
  keywordDeltaText,
  keywordHero,
  planKeyMessages,
  safeArticleHref,
  safeEvidenceHref,
  safeThumbSrc,
  safeVideoHref,
  weeklyBriefFileNameOf,
  weeklyBriefPermalink,
} from './weekly-brief-format';
import { makeEmptyBrief, makeFullBrief, makeKeyword } from './weekly-brief-test-fixtures';

describe('formatPeriod / formatWeekTitle', () => {
  it('같은 달', () => {
    expect(formatPeriod('2026-10-19', '2026-10-25')).toBe('2026-10-19 ~ 10-25');
  });
  it('월 경계', () => {
    expect(formatPeriod('2026-10-26', '2026-11-01')).toBe('2026-10-26 ~ 11-01');
  });
  it('연 경계', () => {
    expect(formatPeriod('2026-12-28', '2027-01-03')).toBe('2026-12-28 ~ 2027-01-03');
  });
  it('중립 타이틀', () => {
    expect(formatWeekTitle('2026-10-19', '2026-10-25', 43)).toBe('2026-10-19 ~ 10-25 · Week 43');
  });
});

describe('isValidWeekStart', () => {
  it('월요일만 통과', () => {
    expect(isValidWeekStart('2026-10-19')).toBe(true);
    expect(isValidWeekStart('2026-12-28')).toBe(true);
    expect(isValidWeekStart('2026-10-20')).toBe(false);
    expect(isValidWeekStart('2026-10-25')).toBe(false);
  });
  it('형식 오류·존재하지 않는 날짜', () => {
    for (const s of ['', '2026-1-19', '2026-02-30', 'abc', '2026-10-19T00:00', '../x', undefined, null]) {
      expect(isValidWeekStart(s as string | null | undefined)).toBe(false);
    }
  });
});

describe('KST 변환은 실행 TZ와 무관', () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });
  const iso = '2026-10-25T23:05:00.000Z'; // KST 2026-10-26 08:05
  for (const tz of ['UTC', 'Asia/Seoul', 'America/Los_Angeles', 'Pacific/Auckland']) {
    it(`TZ=${tz}`, () => {
      process.env.TZ = tz;
      expect(formatKstDateTime(iso)).toBe('2026-10-26 08:05');
      expect(formatKstDate(iso)).toBe('2026-10-26');
      expect(formatKstMonthDay(iso)).toBe('10-26');
      expect(isValidWeekStart('2026-10-19')).toBe(true);
    });
  }
  it('경계: KST 자정 직전/직후', () => {
    expect(formatKstDate('2026-10-25T14:59:59.999Z')).toBe('2026-10-25');
    expect(formatKstDate('2026-10-25T15:00:00.000Z')).toBe('2026-10-26');
  });
  it('잘못된 값은 빈 문자열', () => {
    expect(formatKstDateTime('nope')).toBe('');
    expect(formatKstDate(null)).toBe('');
  });
});

describe('숫자 포맷', () => {
  it('formatViews', () => {
    expect(formatViews(950)).toBe('950');
    expect(formatViews(1200)).toBe('1.2K');
    expect(formatViews(1000)).toBe('1K');
    expect(formatViews(95_000)).toBe('95K');
    expect(formatViews(480_000)).toBe('480K');
    expect(formatViews(999_999)).toBe('1M');
    expect(formatViews(1_200_000)).toBe('1.2M');
    expect(formatViews(0)).toBe('0');
    expect(formatViews(null)).toBe('');
    expect(formatViews(-1)).toBe('');
    expect(formatViews(Number.NaN)).toBe('');
  });
  it('formatDeltaPct', () => {
    expect(formatDeltaPct(12)).toBe('▲12%');
    expect(formatDeltaPct(12.34)).toBe('▲12.3%');
    expect(formatDeltaPct(-3.5)).toBe('▼3.5%');
    expect(formatDeltaPct(0)).toBe('±0%');
    expect(formatDeltaPct(0.01)).toBe('±0%');
    expect(formatDeltaPct(null)).toBe('');
  });
  it('formatSignedPct / keywordDeltaText', () => {
    expect(formatSignedPct(41)).toBe('+41%');
    expect(formatSignedPct(-12)).toBe('-12%');
    expect(formatSignedPct(null)).toBe('');
    expect(keywordDeltaText({ direction: 'new', deltaPct: null, count: 9 })).toBe('NEW');
    expect(keywordDeltaText({ direction: 'up', deltaPct: 18, count: 9 })).toBe('+18%');
    expect(keywordDeltaText({ direction: 'flat', deltaPct: null, count: 9 })).toBe('9회');
  });
  it('keywordHero: 비교 가능하면 증감률, 아니면 횟수', () => {
    expect(keywordHero(makeKeyword(0))).toMatchObject({ value: '+41.2', unit: '%' });
    expect(keywordHero(makeKeyword(0, { prevCount: 1, deltaPct: 300 }))).toMatchObject({ value: '40', unit: '회' });
    expect(keywordHero(makeKeyword(0, { prevCount: 0, deltaPct: null, direction: 'new' }))).toMatchObject({ value: '40', unit: '회' });
  });
  it('formatDuration / formatCostUsd / formatDurationMs', () => {
    expect(formatDuration(760)).toBe('12:40');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(null)).toBe('');
    expect(formatCostUsd(0.0412)).toBe('$0.04');
    expect(formatCostUsd(0)).toBe('$0.00');
    expect(formatCostUsd(0.001)).toBe('<$0.01');
    expect(formatDurationMs(12_300)).toBe('12.3초');
    expect(formatDurationMs(125_000)).toBe('2분 5초');
  });
  it('clipText', () => {
    expect(clipText('abcdef', 6)).toBe('abcdef');
    expect(clipText('abcdefg', 6)).toBe('abcde…');
  });
});

describe('통계 띠', () => {
  it('증감은 값이 있을 때만 부호·화살표로 병기하고 newRobots 는 값이 있을 때만 추가한다', () => {
    const b = makeFullBrief().payload.header;
    const items = buildStatItems(b.counts, b.deltas);
    expect(items.map((i) => `${i.label} ${i.value}${i.delta ? ` (${i.delta})` : ''}`)).toEqual([
      '기사 187 (▲12%)',
      '영상 41 (▼3.5%)',
      '분석 29',
      'CI 변경 6 (±0%)',
      '알림 3 (▲50%)',
      '신규 로봇 2',
    ]);
    const { newRobots: _n, ...counts } = b.counts;
    expect(buildStatItems(counts, b.deltas)).toHaveLength(5);
    expect(formatCountsSummary(b.counts)).toBe('기사 187 · 영상 41 · 분석 29 · CI 변경 6 · 알림 3 · 신규 로봇 2');
  });
});

describe('안전 링크 헬퍼', () => {
  it('safeVideoHref: 유튜브 호스트 https 만', () => {
    expect(safeVideoHref('https://www.youtube.com/watch?v=abc')).toBe('https://www.youtube.com/watch?v=abc');
    expect(safeVideoHref('https://youtu.be/abc')).toBe('https://youtu.be/abc');
    expect(safeVideoHref('https://youtube.com/watch?v=abc')).not.toBe('');
    expect(safeVideoHref('http://www.youtube.com/watch?v=abc')).toBe('');
    expect(safeVideoHref('https://evil.com/watch?v=abc')).toBe('');
    expect(safeVideoHref('https://www.youtube.com.evil.com/x')).toBe('');
    expect(safeVideoHref('https://m.youtube.com/watch?v=abc')).toBe('');
    expect(safeVideoHref('https://user:pw@www.youtube.com/x')).toBe('');
    expect(safeVideoHref('https://www.youtube.com:8443/x')).toBe('');
    expect(safeVideoHref('javascript:alert(1)')).toBe('');
    expect(safeVideoHref(null)).toBe('');
    expect(safeVideoHref('')).toBe('');
  });
  it('safeThumbSrc: i.ytimg.com https 만', () => {
    expect(safeThumbSrc('https://i.ytimg.com/vi/abc/mqdefault.jpg')).toBe('https://i.ytimg.com/vi/abc/mqdefault.jpg');
    expect(safeThumbSrc('http://i.ytimg.com/vi/abc/mqdefault.jpg')).toBe('');
    expect(safeThumbSrc('https://img.youtube.com/vi/abc/mqdefault.jpg')).toBe('');
    expect(safeThumbSrc('https://i.ytimg.com.evil.com/x.jpg')).toBe('');
    expect(safeThumbSrc('https://user@i.ytimg.com/x.jpg')).toBe('');
    expect(safeThumbSrc('data:image/png;base64,AAA')).toBe('');
  });
  it('safeArticleHref: https 만, 자격증명·길이 초과 거부', () => {
    expect(safeArticleHref('https://news.example.com/a?b=1')).toBe('https://news.example.com/a?b=1');
    expect(safeArticleHref('http://news.example.com/a')).toBe('');
    expect(safeArticleHref('javascript:alert(1)')).toBe('');
    expect(safeArticleHref('//news.example.com/a')).toBe('');
    expect(safeArticleHref('https://user:pass@news.example.com/a')).toBe('');
    expect(safeArticleHref('https://user@news.example.com/a')).toBe('');
    expect(safeArticleHref(`https://example.com/${'a'.repeat(2000)}`)).toBe('');
    expect(safeArticleHref(`https://example.com/${'a'.repeat(1900)}`)).not.toBe('');
    expect(safeArticleHref('not a url')).toBe('');
    expect(safeArticleHref(undefined)).toBe('');
  });
  it('safeEvidenceHref: keyword 는 항상 빈 문자열', () => {
    expect(safeEvidenceHref('keyword', 'https://example.com')).toBe('');
    expect(safeEvidenceHref('video', 'https://example.com')).toBe('');
    expect(safeEvidenceHref('article', 'https://example.com')).not.toBe('');
    expect(safeEvidenceHref('ci', 'http://example.com')).toBe('');
  });
});

describe('기타', () => {
  it('영구 링크·파일명', () => {
    expect(weeklyBriefPermalink('https://argos.example.com', '2026-10-19')).toBe('https://argos.example.com/share/weekly/2026-10-19');
    expect(weeklyBriefPermalink('https://argos.example.com/', '2026-10-19')).toBe('https://argos.example.com/share/weekly/2026-10-19');
    expect(weeklyBriefFileNameOf('2026-10-19', 43)).toBe('ARGOS_WeeklyBrief_2026-10-19_W43.html');
  });
  it('planKeyMessages: 첫 메시지가 stat 일 때만 lead', () => {
    const msgs = makeFullBrief().payload.keyMessages;
    const p = planKeyMessages(msgs);
    expect(p.lead?.id).toBe('domain_share:actuator');
    expect(p.rest.map((m) => m.kind)).toEqual(['cause_effect', 'stat']);
    const q = planKeyMessages([msgs[1], msgs[0]]);
    expect(q.lead).toBeNull();
    expect(q.rest).toHaveLength(2);
    expect(planKeyMessages([])).toEqual({ lead: null, rest: [] });
  });
  it('isPosterEmpty', () => {
    expect(isPosterEmpty(makeEmptyBrief().payload)).toBe(true);
    expect(isPosterEmpty(makeFullBrief().payload)).toBe(false);
  });
});
