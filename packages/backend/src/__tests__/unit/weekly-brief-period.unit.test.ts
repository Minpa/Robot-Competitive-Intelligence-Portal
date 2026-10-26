/**
 * weekly-brief-period — KST 주 경계, ISO 주차, 완료 판정 (프로세스 TZ 무관)
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  addDaysYmd,
  getWeekRange,
  isMondayYmd,
  isValidYmd,
  isWeekComplete,
  isoWeekInfo,
  kstYmd,
  lastCompletedWeekStart,
  mondayOfYmd,
  thisWeekPublishAt,
} from '../../services/weekly-brief-period.js';

const originalTz = process.env.TZ;
afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe('getWeekRange', () => {
  it('2026-10-19 is Mon 00:00 KST .. Sun 23:59:59.999 KST', () => {
    const r = getWeekRange('2026-10-19');
    expect(r.startUtc.toISOString()).toBe('2026-10-18T15:00:00.000Z');
    expect(r.endUtcExclusive.toISOString()).toBe('2026-10-25T15:00:00.000Z');
    expect(r.periodEndInclusive.toISOString()).toBe('2026-10-25T14:59:59.999Z');
    expect(r.weekEnd).toBe('2026-10-25');
    expect(r.weekStart).toBe('2026-10-19');
  });

  it('rejects invalid dates', () => {
    expect(() => getWeekRange('2026-02-30')).toThrow();
    expect(() => getWeekRange('nope')).toThrow();
  });

  it('crosses month and year boundaries', () => {
    expect(getWeekRange('2026-10-26').weekEnd).toBe('2026-11-01');
    expect(getWeekRange('2026-12-28').weekEnd).toBe('2027-01-03');
  });

  it('is identical regardless of the process TZ', () => {
    const results = ['UTC', 'Asia/Seoul', 'America/Los_Angeles', 'Pacific/Auckland'].map((tz) => {
      process.env.TZ = tz;
      const r = getWeekRange('2026-10-19');
      return [r.startUtc.toISOString(), r.endUtcExclusive.toISOString(), r.periodEndInclusive.toISOString(), r.weekEnd, isoWeekInfo('2026-10-19').weekNumber, lastCompletedWeekStart(new Date('2026-10-25T23:00:00Z'))];
    });
    for (const r of results) expect(r).toEqual(results[0]);
  });
});

describe('date helpers', () => {
  it('kstYmd converts a UTC instant to the KST calendar date', () => {
    expect(kstYmd(new Date('2026-10-25T14:59:59Z'))).toBe('2026-10-25');
    expect(kstYmd(new Date('2026-10-25T15:00:00Z'))).toBe('2026-10-26');
  });
  it('addDaysYmd / isMondayYmd / mondayOfYmd / isValidYmd', () => {
    expect(addDaysYmd('2026-10-26', -7)).toBe('2026-10-19');
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysYmd('2024-02-28', 1)).toBe('2024-02-29');
    expect(isMondayYmd('2026-10-19')).toBe(true);
    expect(isMondayYmd('2026-10-20')).toBe(false);
    expect(isMondayYmd('garbage')).toBe(false);
    expect(mondayOfYmd('2026-10-25')).toBe('2026-10-19');
    expect(mondayOfYmd('2026-10-26')).toBe('2026-10-26');
    expect(isValidYmd('2026-13-01')).toBe(false);
    expect(isValidYmd('2026-10-19')).toBe(true);
  });
});

describe('isoWeekInfo', () => {
  it.each([
    ['2026-10-19', 2026, 43],
    ['2026-10-26', 2026, 44],
    ['2026-12-28', 2026, 53],
    ['2027-01-04', 2027, 1],
    ['2024-12-30', 2025, 1],
    ['2020-12-28', 2020, 53],
  ])('%s -> %i-W%i', (ymd, isoYear, weekNumber) => {
    expect(isoWeekInfo(ymd)).toEqual({ isoYear, weekNumber });
  });
});

describe('lastCompletedWeekStart / isWeekComplete', () => {
  it('Monday 08:00 KST -> previous Mon..Sun', () => {
    expect(lastCompletedWeekStart(new Date('2026-10-25T23:00:00Z'))).toBe('2026-10-19');
  });
  it('Sunday 23:59:59 KST is still inside the week -> the week before', () => {
    expect(lastCompletedWeekStart(new Date('2026-10-25T14:59:59Z'))).toBe('2026-10-12');
  });
  it('Monday 00:00:00 KST completes the previous week', () => {
    expect(lastCompletedWeekStart(new Date('2026-10-25T15:00:00Z'))).toBe('2026-10-19');
  });
  it('isWeekComplete boundary', () => {
    expect(isWeekComplete('2026-10-19', new Date('2026-10-25T14:59:59.999Z'))).toBe(false);
    expect(isWeekComplete('2026-10-19', new Date('2026-10-25T15:00:00.000Z'))).toBe(true);
    expect(isWeekComplete('2026-10-26', new Date('2026-10-26T01:00:00Z'))).toBe(false);
    expect(isWeekComplete('2026-10-12', new Date('2026-10-26T01:00:00Z'))).toBe(true);
  });
  it('thisWeekPublishAt is Monday 08:00 KST of the current KST week', () => {
    expect(thisWeekPublishAt(new Date('2026-10-28T03:00:00Z')).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    // 일요일 → 그 주 월요일 (6일 전)
    expect(thisWeekPublishAt(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe('2026-10-18T23:00:00.000Z');
  });
});
