import { describe, expect, it } from 'vitest';
import type { WeeklyReportPayload, WeeklyVolumeWeek } from '@/types/weekly-brief';
import {
  DOMAIN_BLOCK_IDS,
  READING_CHARS_PER_MIN,
  REPORT_CONTRAST_PAIRS,
  REPORT_SECTION_DEFS,
  REPORT_TOC_ID,
  REPORT_TOP_ID,
  barWidth,
  buildCoverStats,
  buildToc,
  companyCountLine,
  compareRows,
  contrastRatio,
  domainFigureLine,
  estimateReadingMinutes,
  formatCount,
  formatDeltaPp,
  formatNumber,
  formatReadingTime,
  hasKeywordTable,
  hasTrendChart,
  isReportEmpty,
  keywordRows,
  otherCiUpdates,
  planReportSections,
  quietCountLine,
  reportAnchorIds,
  reportContrastTable,
  reportTextChars,
  sparklineModel,
  titlePair,
  versionKindOf,
  volumeBarRows,
  weekLabel,
} from './weekly-brief-report';
import { makeEmptyReport, makeFullReport, makePartialReport, makeSparseReport } from './weekly-brief-test-fixtures';

const week = (weekStart: string, videos: number, articles = 0, papers = 0): WeeklyVolumeWeek => ({ weekStart, videos, articles, papers });

describe('versionKindOf', () => {
  it('missing or 1 -> v1, 2 -> v2, newer -> unknown', () => {
    expect(versionKindOf({})).toBe('v1');
    expect(versionKindOf({ schemaVersion: 1 })).toBe('v1');
    expect(versionKindOf({ schemaVersion: 2 })).toBe('v2');
    expect(versionKindOf({ schemaVersion: 3 })).toBe('unknown');
    expect(versionKindOf(null)).toBe('v1');
    expect(versionKindOf({ schemaVersion: 'x' })).toBe('v1');
  });
});

describe('planReportSections', () => {
  it('full report: all 8 sections in the fixed order with sequential numbers and the fixed anchor ids', () => {
    const s = planReportSections(makeFullReport().payload);
    expect(s.map((x) => x.id)).toEqual(['sec-glance', 'sec-domains', 'sec-companies', 'sec-videos', 'sec-papers', 'sec-news', 'sec-trends', 'sec-watch']);
    expect(s.map((x) => x.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
    expect(s.map((x) => x.title)).toEqual(['이번 주 한눈에', '도메인별 동향', '회사별 움직임', '영상', '논문', '뉴스·기사', '수치와 키워드 추이', '다음 주 관찰 포인트']);
    expect(REPORT_SECTION_DEFS.map((d) => d.id)).toEqual(s.map((x) => x.id));
    expect(s[0]!.countLabel).toBe('5개');
    expect(s[1]!.countLabel).toBe('활성 5/5');
    expect(s[3]!.countLabel).toBe('12건');
    expect(s.every((x) => x.notice === null)).toBe(true);
  });

  it('empty sections drop out of the numbering and the table of contents (no dead anchors)', () => {
    const p = makeFullReport().payload;
    p.companies = [];
    p.papers = [];
    p.watchPoints = [];
    const s = planReportSections(p);
    expect(s.map((x) => x.key)).toEqual(['glance', 'domains', 'videos', 'news', 'trends']);
    expect(s.map((x) => x.number)).toEqual(['01', '02', '03', '04', '05']);
    const toc = buildToc(s);
    expect(toc.map((i) => i.id)).toEqual(s.map((x) => x.id));
    expect(toc[2]).toEqual({ id: 'sec-videos', label: '03 영상' });
    const ids = reportAnchorIds(p);
    for (const i of toc) expect(ids).toContain(i.id);
    expect(ids).not.toContain('sec-papers');
  });

  it('sparse and empty weeks', () => {
    const sp = makeSparseReport().payload;
    expect(planReportSections(sp).map((x) => x.key)).toEqual(['glance', 'domains', 'videos', 'papers', 'news', 'trends']);
    const videos = planReportSections(sp).find((x) => x.key === 'videos')!;
    expect(videos.subtitle).toContain('이번 주 수집 영상이 적어 3건만 표시합니다');
    const e = makeEmptyReport().payload;
    expect(isReportEmpty(e)).toBe(true);
    expect(planReportSections(e)).toEqual([]);
    expect(reportAnchorIds(e)).toEqual([REPORT_TOP_ID]);
    expect(estimateReadingMinutes(e)).toBe(0);
  });

  it('rule-only sections carry the notice', () => {
    const s = planReportSections(makePartialReport().payload);
    expect(s.find((x) => x.key === 'domains')!.notice).toBe('이 섹션은 자동 집계 문장입니다');
    expect(s.find((x) => x.key === 'glance')!.notice).toBeNull();
  });

  it('reportAnchorIds lists top, toc, sections and the 5 domain blocks', () => {
    const ids = reportAnchorIds(makeFullReport().payload);
    expect(ids).toEqual(expect.arrayContaining([REPORT_TOP_ID, REPORT_TOC_ID, 'sec-glance', ...Object.values(DOMAIN_BLOCK_IDS)]));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('reading time', () => {
  it('is the total text length / 600 chars per minute, rounded up (deterministic)', () => {
    const p = makeFullReport().payload;
    const chars = reportTextChars(p);
    expect(READING_CHARS_PER_MIN).toBe(600);
    expect(estimateReadingMinutes(p)).toBe(Math.ceil(chars / 600));
    expect(estimateReadingMinutes(p)).toBe(estimateReadingMinutes(makeFullReport().payload));
    expect(estimateReadingMinutes(p)).toBeGreaterThanOrEqual(8);
    expect(estimateReadingMinutes(p)).toBeLessThanOrEqual(18);
    expect(formatReadingTime(12)).toBe('읽는 시간 약 12분');
    expect(formatReadingTime(0)).toBe('');
  });

  it('counts exactly the shown prose and exact boundaries round up', () => {
    const p = makeSparseReport().payload;
    const base = reportTextChars(p);
    p.watchPoints = [{ id: 'w', title: '가'.repeat(10), body: '나'.repeat(20), evidence: [{ type: 'keyword', id: 'k', title: 'x', url: null }], generatedBy: 'rule' }];
    expect(reportTextChars(p)).toBe(base + 30);
    // 600자 → 1분, 601자 → 2분
    const q = makeSparseReport().payload;
    q.highlights = [];
    q.domains = q.domains.map((d) => ({ ...d, status: 'quiet' as const }));
    q.videos = [];
    q.papers = [];
    q.articles = [];
    q.companies = [];
    q.trends.keywordNote = null;
    q.header.counts.videosNew = 1;
    q.watchPoints = [{ id: 'w', title: '가'.repeat(40), body: '나'.repeat(500), evidence: [{ type: 'keyword', id: 'k', title: 'x', url: null }], generatedBy: 'rule' }];
    const quiet = 5 * Array.from('이번 주 특이사항 없음').length;
    q.watchPoints[0]!.body = '나'.repeat(600 - 40 - quiet);
    expect(reportTextChars(q)).toBe(600);
    expect(estimateReadingMinutes(q)).toBe(1);
    q.watchPoints[0]!.body += '나';
    expect(estimateReadingMinutes(q)).toBe(2);
  });
});

describe('number formatting', () => {
  it('formatNumber / formatCount / formatDeltaPp never print NaN, null or undefined', () => {
    expect(formatNumber(14.4)).toBe('14.4');
    expect(formatNumber(14)).toBe('14');
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(Number.NaN)).toBe('');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(undefined)).toBe('');
    expect(formatDeltaPp(4.2)).toBe('▲4.2%p');
    expect(formatDeltaPp(-1.3)).toBe('▼1.3%p');
    expect(formatDeltaPp(0)).toBe('±0%p');
    expect(formatDeltaPp(null)).toBe('');
    expect(formatDeltaPp(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('titlePair puts the Korean title first and keeps the original below; without it only the original', () => {
    expect(titlePair('Humanoid hand', '휴머노이드 손')).toEqual({ main: '휴머노이드 손', sub: 'Humanoid hand' });
    expect(titlePair('Humanoid hand', null)).toEqual({ main: 'Humanoid hand', sub: '' });
    expect(titlePair('Humanoid hand', '  ')).toEqual({ main: 'Humanoid hand', sub: '' });
  });

  it('cover stats pair a count with the previous-week delta in words and symbols', () => {
    const p = makeFullReport().payload;
    const stats = buildCoverStats(p.header.counts, p.header.deltas);
    expect(stats.map((s) => s.label)).toEqual(['영상', '기사', '논문', '분석 영상', 'CI 변경', '알림']);
    for (const s of stats) {
      expect(s.deltaPhrase).toMatch(/^전주 대비 (▲|▼|±|없음)/);
      expect(s.value).not.toMatch(/NaN|null|undefined/);
    }
    expect(stats[0]!.value).toBe(String(p.header.counts.videosNew));
  });
});

describe('chart models', () => {
  it('barWidth clamps to 0-100 with one decimal and never divides by zero', () => {
    expect(barWidth(50, 200)).toBe(25);
    expect(barWidth(1, 3)).toBe(33.3);
    expect(barWidth(5, 3)).toBe(100);
    expect(barWidth(-1, 3)).toBe(0);
    expect(barWidth(5, 0)).toBe(0);
    expect(barWidth(0, 0)).toBe(0);
    expect(barWidth(Number.NaN, 5)).toBe(0);
    expect(barWidth(null, 5)).toBe(0);
  });

  it('sparkline: needs 2+ weeks with data; coordinates have one decimal; the max is the top, a zero is the bottom', () => {
    const weeks = [week('2026-09-07', 0), week('2026-09-14', 10), week('2026-09-21', 20, 10), week('2026-09-28', 5)];
    const m = sparklineModel(weeks, { width: 100, height: 50, pad: 5 })!;
    expect(m.points).toHaveLength(4);
    expect(m.max).toBe(30);
    expect(m.points[0]).toMatchObject({ x: 5, y: 45, total: 0 });
    expect(m.points[2]).toMatchObject({ x: 65, y: 5, total: 30 });
    expect(m.polyline).toBe('5,45 35,31.7 65,5 95,38.3');
    for (const p of m.points) {
      expect(Number.isInteger(p.x * 10)).toBe(true);
      expect(Number.isInteger(p.y * 10)).toBe(true);
    }
    expect(m.last).toBe(m.points[3]);
  });

  it('sparkline edge cases: no data, a single week with data, all zeros -> hidden; two weeks with data -> shown', () => {
    expect(sparklineModel([])).toBeNull();
    expect(sparklineModel([week('2026-10-19', 5)])).toBeNull();
    expect(sparklineModel([week('2026-10-12', 0), week('2026-10-19', 0)])).toBeNull();
    expect(sparklineModel([week('2026-10-12', 0), week('2026-10-19', 5)])).toBeNull(); // 데이터가 있는 주가 1주
    expect(hasTrendChart([week('2026-10-12', 1), week('2026-10-19', 5)])).toBe(true);
    expect(sparklineModel([week('2026-10-12', 1), week('2026-10-19', 5)])).not.toBeNull();
  });

  it('volume bars and the this-week vs last-week comparison', () => {
    const weeks = [week('2026-10-05', 10, 20, 10), week('2026-10-12', 20, 40, 20), week('2026-10-19', 10, 80, 0)];
    const rows = volumeBarRows(weeks, '2026-10-19');
    expect(rows.map((r) => r.label)).toEqual(['10-05', '10-12', '10-19']);
    expect(rows.map((r) => r.pct)).toEqual([44.4, 88.9, 100]);
    expect(rows[2]!.current).toBe(true);
    expect(rows[2]!.note).toBe('영상 10 · 기사 80 · 논문 0');
    const cmp = compareRows(weeks, '2026-10-19');
    expect(cmp.map((r) => r.label)).toEqual(['영상', '기사', '논문']);
    expect(cmp[0]).toMatchObject({ cur: 10, prev: 20, curPct: 50, prevPct: 100, delta: '▼50%' });
    expect(cmp[1]).toMatchObject({ delta: '▲100%' });
    expect(cmp[2]).toMatchObject({ cur: 0, prev: 20, curPct: 0, prevPct: 100, delta: '▼100%' });
    expect(compareRows([week('2026-10-19', 5)], '2026-10-19')).toEqual([]);
    expect(compareRows(weeks, '2026-10-26')).toEqual([]);
    expect(compareRows([week('2026-10-12', 0), week('2026-10-19', 3)], '2026-10-19')[0]).toMatchObject({ delta: 'NEW', prevPct: 0, curPct: 100 });
    expect(weekLabel('bad')).toBe('');
    expect(volumeBarRows([week('2026-10-12', 0), week('2026-10-19', 0)], '2026-10-19').every((r) => r.pct === 0)).toBe(true);
  });

  it('keyword rows: counts, delta text, direction symbol and bar width relative to the largest', () => {
    const p = makeFullReport().payload;
    const rows = keywordRows(p.trends.keywords);
    expect(rows).toHaveLength(p.trends.keywords.length);
    expect(Math.max(...rows.map((r) => r.pct))).toBe(100);
    expect(rows.find((r) => r.direction === 'new')!.symbol).toBe('NEW');
    expect(rows.find((r) => r.direction === 'up')!.symbol).toBe('▲');
    expect(rows.find((r) => r.direction === 'down')!.symbol).toBe('▼');
    expect(rows.find((r) => r.direction === 'flat')!.symbol).toBe('―');
    for (const r of rows) expect(JSON.stringify(r)).not.toMatch(/NaN|null|undefined/);
    expect(keywordRows([])).toEqual([]);
    expect(hasKeywordTable(p)).toBe(true);
    expect(hasKeywordTable({ trends: { ...p.trends, keywords: p.trends.keywords.slice(0, 2) } })).toBe(false);
  });
});

describe('domain and company lines', () => {
  it('domain figure line and quiet line', () => {
    const p = makeFullReport().payload;
    const hand = p.domains.find((d) => d.key === 'hand')!;
    expect(domainFigureLine(hand)).toMatch(/^영상 \d+건 · 논문 \d+건 · 점유율 [\d.]+%( · 지난주 [\d.]+% \(.+%p\))?$/);
    const quiet = makeSparseReport().payload.domains[0]!;
    expect(quietCountLine(quiet)).toMatch(/^수집 \d+건 \(영상 \d+ · (논문|기사) \d+\)$/);
    expect(domainFigureLine({ ...hand, figures: { ...hand.figures, prevSharePct: null, deltaPp: null } })).not.toContain('지난주');
  });

  it('company count line and the "other CI updates" remainder', () => {
    const p = makeFullReport().payload;
    const c = p.companies[0]!;
    expect(companyCountLine(c)).toMatch(/^이번 주 \d+건 \(영상 \d+ · 기사 \d+\) · 지난주 \d+건/);
    expect(companyCountLine({ counts: { total: 0, videos: 0, articles: 0, prevTotal: 3, deltaPct: null } })).toBe('이번 주 수집 없음 · 지난주 3건');
    expect(companyCountLine({ counts: { total: 4, videos: 1, articles: 3, prevTotal: 8, deltaPct: -50 } })).toContain('(▼50%)');
    const shown = p.companies.reduce((n, x) => n + x.ciChanges.length, 0);
    expect(otherCiUpdates(p)).toBe(p.ciSummary.updates - shown);
    expect(otherCiUpdates({ ciSummary: { updates: 1, companies: 1 }, companies: p.companies })).toBe(0);
  });
});

describe('contrast', () => {
  it('contrastRatio matches known values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('every text color x background pair used by the report is at least 4.5:1', () => {
    const table = reportContrastTable();
    expect(table).toHaveLength(REPORT_CONTRAST_PAIRS.length);
    for (const row of table) expect(row.ratio, `${row.use} ${row.fg} on ${row.bg}`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('payload hygiene of the report fixtures', () => {
  it('no output of the planners contains NaN / null / undefined text', () => {
    for (const p of [makeFullReport().payload, makeSparseReport().payload, makeEmptyReport().payload, makePartialReport().payload] as WeeklyReportPayload[]) {
      const out = JSON.stringify([planReportSections(p), buildToc(planReportSections(p)), buildCoverStats(p.header.counts, p.header.deltas), keywordRows(p.trends.keywords), volumeBarRows(p.trends.volume.weeks, p.header.weekStart), p.domains.map(domainFigureLine), p.companies.map(companyCountLine)]);
      expect(out).not.toMatch(/NaN|undefined|"null"/);
    }
  });
});
