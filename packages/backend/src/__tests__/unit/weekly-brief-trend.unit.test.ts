/**
 * 8주 추세 — 분류 임계값, 표본 부족, 1주 급증, 지속성, 도메인당 상한, 쿼리 형태(KST 월요일, 0 채우기), 실패 경고
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import {
  PROCUREMENT_MIN_DIFF,
  TREND_ABS_PP,
  TREND_MAX_PER_DOMAIN,
  TREND_MAX_SIGNALS,
  TREND_MIN_BASE,
  TREND_PERSIST_WEEKS,
  TREND_REL_PCT,
  WATCH_THEMES,
  classifyCountSeries,
  classifyShareSeries,
  collectTrend,
  fetchProcurementSeries,
  fetchThemeSeries,
  fetchWeeklyBases,
  isExternalShift,
  procurementState,
  selectTrendSignals,
  themePattern,
  trendRange,
  trendWeekStarts,
  type TrendSeriesInput,
} from '../../services/weekly-brief-trend.js';
import type { CollectDeps } from '../../services/weekly-brief-collect.js';

const bases = (n: number) => Array(8).fill(n) as number[];

describe('trend constants are pinned', () => {
  it('has the documented thresholds', () => {
    expect({ TREND_MIN_BASE, TREND_REL_PCT, TREND_ABS_PP, TREND_PERSIST_WEEKS }).toEqual({ TREND_MIN_BASE: 20, TREND_REL_PCT: 30, TREND_ABS_PP: 2, TREND_PERSIST_WEEKS: 3 });
    expect(TREND_MAX_SIGNALS).toBe(6);
    expect(TREND_MAX_PER_DOMAIN).toBe(3);
  });
});

describe('classifyShareSeries', () => {
  it('rising: +30% relative, +2pp absolute, 3+ recent weeks with counts', () => {
    // prior 4 weeks: 5/50 each => 10%; recent: 8/50 => 16%  (+60%, +6pp)
    const r = classifyShareSeries([5, 5, 5, 5, 8, 8, 8, 8], bases(50));
    expect(r.cls).toBe('rising');
    expect(r.recent).toBe(16);
    expect(r.prior).toBe(10);
    expect(r.relChangePct).toBe(60);
  });

  it('falling: symmetric and needs 3+ prior weeks with counts', () => {
    expect(classifyShareSeries([8, 8, 8, 8, 5, 5, 5, 5], bases(50)).cls).toBe('falling');
    expect(classifyShareSeries([0, 0, 0, 40, 5, 5, 5, 5], bases(50)).cls).toBe('steady'); // only 1 prior week had counts
  });

  it('boundary: exactly +30% relative but only +1.5pp is steady (absolute threshold)', () => {
    // prior 5% (10/200), recent 6.5% (13/200) => +30%, +1.5pp
    const r = classifyShareSeries([2, 3, 2, 3, 3, 3, 3, 4], bases(50));
    expect(r.cls).toBe('steady');
  });

  it('boundary: exactly +30% and +2pp passes', () => {
    // prior 20/200=10%, recent 26/200=13% => +30%, +3pp
    expect(classifyShareSeries([5, 5, 5, 5, 6, 6, 7, 7], bases(50)).cls).toBe('rising');
  });

  it('a one-week spike is not a trend', () => {
    // recent: 0,0,0,40 => only 1 week with counts
    expect(classifyShareSeries([5, 5, 5, 5, 0, 0, 0, 40], bases(50)).cls).toBe('steady');
  });

  it('insufficient sample when either 4-week base is under 20', () => {
    expect(classifyShareSeries([1, 1, 1, 1, 3, 3, 3, 3], bases(4)).cls).toBe('insufficient'); // 16 < 20
    expect(classifyShareSeries([1, 1, 1, 1, 3, 3, 3, 3], bases(5)).cls).toBe('rising'); // 20 >= 20
    expect(classifyShareSeries([1, 1], [10, 10]).cls).toBe('insufficient'); // too few weeks
  });

  it('zero prior share with persistent recent counts is rising and relChangePct is null', () => {
    const r = classifyShareSeries([0, 0, 0, 0, 3, 3, 3, 3], bases(50));
    expect(r.cls).toBe('rising');
    expect(r.relChangePct).toBeNull();
  });

  it('series is weekly share in percent with one decimal and 0 for empty bases', () => {
    const r = classifyShareSeries([1, 0, 0, 0, 0, 0, 0, 3], [3, 0, 0, 0, 0, 0, 0, 7]);
    expect(r.series[0]).toBe(33.3);
    expect(r.series[1]).toBe(0);
    expect(r.series[7]).toBe(42.9);
  });
});

describe('selectTrendSignals', () => {
  const mk = (id: string, domain: TrendSeriesInput['domain'], recent: number): TrendSeriesInput => ({
    id,
    kind: 'subtopic',
    domain,
    label: id,
    counts: [5, 5, 5, 5, recent, recent, recent, recent],
    bases: bases(50),
    ref: {},
  });

  it('drops steady and insufficient, orders by |relative change|, caps at 6 and 3 per domain', () => {
    const inputs = [
      mk('a1', 'hand', 12),
      mk('a2', 'hand', 11),
      mk('a3', 'hand', 10),
      mk('a4', 'hand', 9),
      mk('b1', 'actuator', 8),
      mk('b2', 'actuator', 9),
      mk('c1', 'rfm', 20),
      mk('d1', 'expo', 10),
      mk('flat', 'expo', 5),
    ];
    const out = selectTrendSignals(inputs);
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out.filter((s) => s.domain === 'hand').length).toBeLessThanOrEqual(3);
    expect(out.map((s) => s.id)).not.toContain('flat');
    expect(out[0]!.id).toBe('c1');
    expect(out.map((s) => s.id)).not.toContain('a4'); // 4th hand signal is cut
  });

  it('rising and falling both survive with a direction', () => {
    const fall: TrendSeriesInput = { ...mk('f', 'rfm', 0), counts: [10, 10, 10, 10, 4, 4, 4, 4] };
    const out = selectTrendSignals([fall]);
    expect(out[0]!.direction).toBe('falling');
  });
});

describe('procurement', () => {
  it('count series direction uses the minimum difference', () => {
    expect(PROCUREMENT_MIN_DIFF).toBe(2);
    expect(classifyCountSeries([0, 0, 0, 0, 1, 1, 1, 0]).direction).toBe('rising');
    expect(classifyCountSeries([1, 1, 0, 0, 0, 0, 0, 1]).direction).toBe('steady');
    expect(classifyCountSeries([2, 1, 1, 0, 0, 0, 0, 0]).direction).toBe('falling');
  });

  it('snapshot comparison says "accumulating" below 2 snapshots and never invents a value', () => {
    const snap = { asOf: 'x', robots: 1, inHouse: 1, inHouseSells: 0, external: 0, unknown: 0 };
    expect(procurementState([])).toEqual({ state: 'accumulating', snapshots: 0 });
    expect(procurementState([snap])).toEqual({ state: 'accumulating', snapshots: 1 });
    expect(procurementState([snap, snap])).toEqual({ state: 'observed', snapshots: 2 });
  });

  it('isExternalShift reads direction with parseInHouse', () => {
    expect(isExternalShift('자체 생산 여부', '자체 생산', '아니오 (외부 공급사)')).toBe(true);
    expect(isExternalShift('자체 생산 여부', '아니오', '자체 생산')).toBe(false);
    expect(isExternalShift('액추에이터 공급사', 'A사', 'B사')).toBe(true);
    expect(isExternalShift('액추에이터 공급사', 'A사', 'A사')).toBe(false);
    expect(isExternalShift('가격대', 'a', 'b')).toBe(false);
  });
});

describe('week ranges (KST Monday boundaries)', () => {
  it('lists 8 Mondays ending at the target week', () => {
    const w = trendWeekStarts('2026-10-26');
    expect(w).toHaveLength(8);
    expect(w[7]).toBe('2026-10-26');
    expect(w[0]).toBe('2026-09-07');
  });

  it('range starts at the first Monday 00:00 KST (15:00Z of the previous day) and ends exclusive after the week', () => {
    const { from, to } = trendRange('2026-10-26');
    expect(from.toISOString()).toBe('2026-09-06T15:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-31T15:00:00.000Z'.replace('10-31', '11-01'));
  });
});

describe('queries', () => {
  const fake = (rows: unknown, record: unknown[] = []): CollectDeps => ({
    query: async (q) => {
      record.push(q);
      return rows;
    },
  });

  it('fetchWeeklyBases fills empty weeks with 0 and keeps order', async () => {
    const out = await fetchWeeklyBases(fake([{ wk: '2026-10-26', n: 30 }, { wk: '2026-09-07', n: '12' }]), '2026-10-26');
    expect(out).toEqual([12, 0, 0, 0, 0, 0, 0, 30]);
  });

  it('fetchThemeSeries builds one series per theme with zero-filled weeks', async () => {
    const rows = [{ wk: '2026-10-26', t0: 4, t1: 0, t2: 0, t3: 0, t4: 0, t5: 1 }];
    const out = await fetchThemeSeries(fake(rows), '2026-10-26', bases(40));
    expect(out).toHaveLength(WATCH_THEMES.length);
    expect(out[0]!.id).toBe('theme:tactile_integration');
    expect(out[0]!.counts).toEqual([0, 0, 0, 0, 0, 0, 0, 4]);
    expect(out[5]!.counts[7]).toBe(1);
  });

  it('themePattern escapes regex metacharacters', () => {
    expect(themePattern(['a+b', 'π0', 'e-skin'])).toBe('a\\+b|π0|e-skin');
  });

  it('fetchProcurementSeries counts only external shifts per week', async () => {
    const rows = [
      { wk: '2026-10-26', item: '자체 생산 여부', old_value: '자체', new_value: '외부 공급' },
      { wk: '2026-10-26', item: '액추에이터 공급사', old_value: 'A', new_value: 'B' },
      { wk: '2026-10-19', item: '자체 생산 여부', old_value: '아니오', new_value: '자체' },
    ];
    const out = await fetchProcurementSeries(fake(rows), '2026-10-26');
    expect(out.counts[7]).toBe(2);
    expect(out.counts[6]).toBe(0);
    expect(out.total).toBe(2);
  });

  it('collectTrend records a warning per failing aggregate and keeps the others', async () => {
    let calls = 0;
    const deps: CollectDeps = {
      query: async () => {
        calls++;
        if (calls === 2) throw new Error('boom'); // the first Promise.all member (hand subtopics)
        return [];
      },
    };
    const t = await collectTrend(deps, '2026-10-26');
    expect(t.warnings.length).toBe(1);
    expect(t.warnings[0]).toMatch(/^trend_.*_failed$/);
    expect(t.weeks).toHaveLength(8);
  });

  it('a failed base query disables the share-based aggregates but not the others', async () => {
    const deps: CollectDeps = {
      query: async (q) => {
        const text = JSON.stringify((q as { queryChunks?: unknown }).queryChunks ?? '');
        if (text.includes('CLASSIFIED') || true) {
          // first call is the bases query
        }
        return [];
      },
    };
    let first = true;
    const t = await collectTrend(
      {
        query: async () => {
          if (first) {
            first = false;
            throw new Error('x');
          }
          return [];
        },
      },
      '2026-10-26',
    );
    expect(t.warnings).toContain('trend_bases_failed');
    expect(t.series.every((s) => s.kind === 'subtopic')).toBe(true);
    void deps;
  });
});
