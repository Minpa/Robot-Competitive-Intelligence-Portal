import { describe, it, expect } from 'vitest';
import {
  cacheAgeLabel,
  compareSummary,
  countFailed,
  defaultSectionOpen,
  describeDelta,
  formatByKind,
  formatCount,
  formatDenominator,
  formatHours,
  formatKst,
  formatMetricValue,
  formatRatio,
  formatRatioDetail,
  formatUsd,
  reasonLabel,
  retryMessage,
  rowLabel,
  sectionStatusTone,
  SECTION_STATUS_LABELS,
  tableNote,
} from './data-coverage-view';

describe('number formats', () => {
  it('counts use ko-KR thousands separators', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
    expect(formatCount(null)).toBe('-');
    expect(formatCount(Number.NaN)).toBe('-');
    expect(formatCount(12.5)).toBe('12.5');
  });
  it('ratios are 0..1 with one decimal percent', () => {
    expect(formatRatio(0.1234)).toBe('12.3%');
    expect(formatRatio(1)).toBe('100.0%');
    expect(formatRatio(0)).toBe('0.0%');
    expect(formatRatio(null)).toBe('-');
  });
  it('usd is $1,234.56', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(-3.456)).toBe('-$3.46');
    expect(formatUsd(null)).toBe('-');
  });
  it('hours', () => {
    expect(formatHours(37.25)).toBe('37.3시간');
    expect(formatHours(null)).toBe('-');
  });
});

describe('KST time', () => {
  it('converts UTC ISO to KST YYYY-MM-DD HH:mm regardless of the process TZ', () => {
    expect(formatKst('2026-11-05T15:30:00.000Z')).toBe('2026-11-06 00:30');
    expect(formatKst('2026-11-06T00:00:00Z')).toBe('2026-11-06 09:00');
    expect(formatKst('garbage')).toBe('-');
    expect(formatKst(null)).toBe('-');
  });
});

describe('failure and na never look like zero', () => {
  it('failed -> 측정 실패, na -> 해당 없음 / 미기록', () => {
    expect(formatMetricValue({ kind: 'count', value: null, status: 'failed', reason: 'timeout' })).toBe('측정 실패');
    expect(formatMetricValue({ kind: 'ratio', value: null, status: 'na', reason: 'no_data' })).toBe('해당 없음');
    expect(formatMetricValue({ kind: 'count', value: null, status: 'na', reason: 'not_logged' })).toBe('미기록');
    expect(formatMetricValue({ kind: 'count', value: 0, status: 'ok', reason: null })).toBe('0');
    expect(formatMetricValue({ kind: 'ratio', value: 0, status: 'ok', reason: null })).toBe('0.0%');
  });
  it('reason labels', () => {
    expect(reasonLabel('timeout')).toBe('시간 초과');
    expect(reasonLabel('query_failed')).toBe('조회 오류');
    expect(reasonLabel('dependency_failed')).toBe('의존 지표 실패');
    expect(reasonLabel(null)).toBe('');
  });
  it('by-kind value formatting', () => {
    expect(formatByKind(true, 'bool')).toBe('예');
    expect(formatByKind(false, 'bool')).toBe('아니오');
    expect(formatByKind('2026-11-06T00:00:00Z', 'datetime')).toBe('2026-11-06 09:00');
    expect(formatByKind(null, 'count')).toBe('-');
    expect(formatByKind('abc', 'text')).toBe('abc');
  });
  it('ratio detail and denominator helpers', () => {
    expect(formatRatioDetail({ kind: 'ratio', numerator: 5, denominator: 20, status: 'ok' })).toBe('5 / 20');
    expect(formatRatioDetail({ kind: 'ratio', numerator: 5, denominator: 20, status: 'failed' })).toBe('');
    expect(formatRatioDetail({ kind: 'count', numerator: null, denominator: null, status: 'ok' })).toBe('');
    expect(formatDenominator({ kind: 'count', denominator: 200, status: 'ok' })).toBe('전체 200');
    expect(formatDenominator({ kind: 'ratio', denominator: 200, status: 'ok' })).toBe('');
  });
});

describe('describeDelta', () => {
  it('no baseline -> "-"', () => {
    expect(describeDelta('count', null)).toMatchObject({ text: '-', tone: 'none' });
    expect(describeDelta('count', undefined, 'up')).toMatchObject({ text: '-', tone: 'none' });
  });
  it('zero -> 변화 없음 (neutral)', () => {
    expect(describeDelta('count', 0, 'up')).toMatchObject({ text: '변화 없음', tone: 'neutral' });
    expect(describeDelta('ratio', 0.004, 'up')).toMatchObject({ text: '변화 없음' });
  });
  it('arrows, signs and units per kind', () => {
    expect(describeDelta('count', 1200, 'up').text).toBe('▲ +1,200건');
    expect(describeDelta('count', -5, 'down').text).toBe('▼ -5건');
    expect(describeDelta('ratio', 1.26, 'up').text).toBe('▲ +1.3%p');
    expect(describeDelta('ratio', -0.5, 'up').text).toBe('▼ -0.5%p');
    expect(describeDelta('usd', 0.5, 'down').text).toBe('▲ +$0.50');
    expect(describeDelta('usd', -2, 'down').text).toBe('▼ -$2.00');
    expect(describeDelta('hours', 3, 'neutral').text).toBe('▲ +3시간');
  });
  it('tone follows goodDirection and always comes with a symbol and a label', () => {
    expect(describeDelta('count', 5, 'up')).toMatchObject({ tone: 'better', label: '개선', arrow: '▲' });
    expect(describeDelta('count', 5, 'down')).toMatchObject({ tone: 'worse', label: '악화' });
    expect(describeDelta('count', -5, 'down')).toMatchObject({ tone: 'better' });
    expect(describeDelta('count', -5, 'up')).toMatchObject({ tone: 'worse' });
    expect(describeDelta('count', -5, 'neutral')).toMatchObject({ tone: 'neutral', label: '감소' });
    expect(describeDelta('count', 5).tone).toBe('neutral');
  });
});

describe('status and header labels', () => {
  it('section status labels and tones', () => {
    expect(SECTION_STATUS_LABELS).toEqual({ ok: '정상', partial: '일부 실패', failed: '실패', na: '해당 없음' });
    expect(sectionStatusTone('ok')).toBe('ok');
    expect(sectionStatusTone('partial')).toBe('warn');
    expect(sectionStatusTone('failed')).toBe('error');
    expect(sectionStatusTone('na')).toBe('none');
  });
  it('counts failed metrics and tables', () => {
    const s = { metrics: [{ status: 'failed' }, { status: 'ok' }, { status: 'failed' }], tables: [{ status: 'failed' }, { status: 'ok' }] } as never;
    expect(countFailed(s)).toBe(3);
  });
  it('cache age label', () => {
    expect(cacheAgeLabel({ hit: false, stale: false, ageSec: 0, ttlSec: 600 })).toBe('방금 계산');
    expect(cacheAgeLabel({ hit: true, stale: false, ageSec: 42, ttlSec: 600 })).toBe('42초 전 계산');
    expect(cacheAgeLabel({ hit: true, stale: false, ageSec: 185, ttlSec: 600 })).toBe('3분 전 계산');
  });
  it('429 retry message', () => {
    expect(retryMessage(17)).toBe('17초 후 다시 시도하세요');
    expect(retryMessage(16.2)).toBe('17초 후 다시 시도하세요');
    expect(retryMessage(undefined)).toBe('30초 후 다시 시도하세요');
  });
  it('compare summary covers the three reasons', () => {
    const base = { requestedDate: null, baselineDate: '2026-11-05', baselineTakenAt: null, availableDates: [] };
    expect(compareSummary({ ...base, reason: 'ok' })).toBe('2026-11-05 스냅샷 대비');
    expect(compareSummary({ ...base, baselineDate: null, reason: 'no_snapshot' })).toBe('비교할 스냅샷이 아직 없습니다');
    expect(compareSummary({ ...base, requestedDate: '2026-10-01', reason: 'requested_not_found' })).toContain('2026-10-01');
  });
  it('table notes: truncation, failure, na', () => {
    expect(tableNote({ truncated: true, totalRows: 120, rows: new Array(50), status: 'ok', reason: null })).toBe('상위 50행만 표시 (전체 120행)');
    expect(tableNote({ truncated: false, totalRows: 3, rows: [], status: 'ok', reason: null })).toBe('');
    expect(tableNote({ truncated: false, totalRows: 0, rows: [], status: 'failed', reason: 'timeout' })).toBe('측정 실패 (시간 초과)');
    expect(tableNote({ truncated: false, totalRows: 0, rows: [], status: 'na', reason: 'no_data' })).toBe('데이터 없음');
  });
  it('row labels fall back to the key', () => {
    expect(rowLabel('sec_edgar')).toBe('SEC EDGAR');
    expect(rowLabel('custom-key')).toBe('custom-key');
  });
  it('only the first section is open on narrow screens', () => {
    expect(defaultSectionOpen(0, false)).toBe(true);
    expect(defaultSectionOpen(1, false)).toBe(false);
    expect(defaultSectionOpen(3, true)).toBe(true);
  });
});
