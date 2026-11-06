/**
 * 우리 위치 선택과 격차 계산 — 경계값, 가격 부호, 미등록, 이번 주 새 데이터 판정, 행 선정
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import {
  GAP_MOVE_PP,
  GAP_PARITY_PCT,
  buildGapDraft,
  buildOurPosition,
  competitorFactsFromCiBenchmark,
  competitorFactsFromHandBenchmark,
  competitorFactsFromMap,
  computeCoverage,
  computeGap,
  fetchPositionSnapshot,
  gapPct,
  gapPriority,
  gapRuleLines,
  movementOf,
  newDataReason,
  ourValueFor,
  parseCiPrevForAxis,
  positionOf,
  selectGapDrafts,
  selectOurRobot,
  snapshotOf,
  torqueDensityOf,
  type BenchTable,
  type CompetitorFact,
  type PositionSnapshot,
  type WeekSignals,
} from '../../services/weekly-brief-position.js';

const robot = (o: Record<string, unknown>) => ({ id: 'r', name: 'R', company: 'Co', companyId: 'c1', isLG: false, forecast: false, dof: null, handDof: null, payload: null, price: null, actuators: [], ...o }) as never;
const supplier = (o: Record<string, unknown>) => ({ vendor: 'V', model: 'M', isLG: false, peakTorqueNm: null, weightKg: null, priceUsd: null, ...o }) as never;
const mapOf = (robots: unknown[], suppliers: unknown[] = []) =>
  ({ generatedAt: '2026-11-02T00:00:00.000Z', robots, suppliers, sourcingStats: { robots: 10, inHouse: 4, inHouseSells: 1, external: 3, unknown: 2 } }) as never;

describe('gap boundaries (+-5% parity, +-2pp movement)', () => {
  it('uses constants 5 and 2', () => {
    expect(GAP_PARITY_PCT).toBe(5);
    expect(GAP_MOVE_PP).toBe(2);
  });

  it.each([
    [105, 'competitor_ahead'],
    [104.9, 'parity'],
    [100, 'parity'],
    [95.1, 'parity'],
    [95, 'we_ahead'],
    [80, 'we_ahead'],
  ])('competitor %s vs ours 100 => %s', (c, pos) => {
    expect(positionOf(gapPct(c, 100, true)!)).toBe(pos);
  });

  it('flips the sign for lower-is-better axes (price): cheaper competitor is ahead', () => {
    expect(gapPct(80, 100, false)).toBeCloseTo(20);
    expect(positionOf(gapPct(80, 100, false)!)).toBe('competitor_ahead');
    expect(positionOf(gapPct(120, 100, false)!)).toBe('we_ahead');
  });

  it('returns null when ours is zero or missing', () => {
    expect(gapPct(5, 0, true)).toBeNull();
    expect(computeGap({ competitor: 5, ours: null, prevCompetitor: null, higherIsBetter: true })).toBeNull();
  });

  it('movement: delta >= +2 closing, <= -2 receding, between steady, no prev first_seen', () => {
    const pct = gapPct(120, 100, true)!; // 20
    expect(movementOf(pct, 117, 100, true)).toBe('competitor_closing'); // before 17 => +3
    expect(movementOf(pct, 118, 100, true)).toBe('competitor_closing'); // before 18 => exactly +2
    expect(movementOf(pct, 119, 100, true)).toBe('steady'); // +1
    expect(movementOf(pct, 123, 100, true)).toBe('competitor_receding'); // before 23 => -3
    expect(movementOf(pct, null, 100, true)).toBe('first_seen');
  });

  it('computeGap rounds diff to one decimal and keeps absolute magnitudes', () => {
    const g = computeGap({ competitor: 133.33, ours: 100, prevCompetitor: null, higherIsBetter: true })!;
    expect(g.position).toBe('competitor_ahead');
    expect(g.diff).toEqual({ abs: 33.3, pct: 33.3 });
    expect(g.movement).toBe('first_seen');
  });
});

describe('our position selection', () => {
  it('prefers an LG robot named CLOiD, then the first non-forecast LG robot, then null', () => {
    const a = robot({ id: 'a', name: 'Other LG', isLG: true });
    const b = robot({ id: 'b', name: 'CLOiD', isLG: true });
    const c = robot({ id: 'c', name: 'Fcst', isLG: true, forecast: true });
    expect(selectOurRobot([a, b])?.id).toBe('b');
    expect(selectOurRobot([c, a])?.id).toBe('a');
    expect(selectOurRobot([c])).toBeNull();
    expect(selectOurRobot([robot({})])).toBeNull();
  });

  it('computes torque density only when both peak torque and weight exist (AXIUM null => missing)', () => {
    expect(torqueDensityOf(100, 4)).toBe(25);
    expect(torqueDensityOf(null, 4)).toBeNull();
    expect(torqueDensityOf(100, 0)).toBeNull();
    const snapshot: PositionSnapshot = { map: mapOf([], [supplier({ isLG: true, vendor: 'LG Electronics', peakTorqueNm: null, weightKg: null })]), ciBenchmark: null, handBenchmark: null, failures: [] };
    expect(ourValueFor('torque_density', buildOurPosition(snapshot))).toBeNull();
    const withData: PositionSnapshot = { ...snapshot, map: mapOf([], [supplier({ isLG: true, vendor: 'LG Electronics', peakTorqueNm: 90, weightKg: 3 })]) };
    expect(ourValueFor('torque_density', buildOurPosition(withData))?.value).toBe(30);
  });

  it('hand axes: without a hand-benchmark LG row only DoF (from the robot) is registered', () => {
    const hand: BenchTable = { axes: [], competitors: [{ id: 'h1', slug: 'shadow', name: 'Shadow', manufacturer: 'Shadow Robot', scores: { gripForce: { score: 7, raw: '100 N', updatedAt: null }, tactileChannels: { score: 5, raw: '50', updatedAt: null }, dof: { score: 8, raw: '20 DoF', updatedAt: null } } }] };
    const snap: PositionSnapshot = { map: mapOf([robot({ name: 'CLOiD', isLG: true, handDof: 12, dof: 30 })]), ciBenchmark: null, handBenchmark: hand, failures: [] };
    const our = buildOurPosition(snap);
    expect(our.handRow).toBeNull();
    expect(ourValueFor('hand_dof', our)?.value).toBe(12);
    expect(ourValueFor('grip_force', our)).toBeNull();
    expect(ourValueFor('tactile', our)).toBeNull();
    const cov = computeCoverage(our);
    expect(cov.registered).toContain('핸드 자유도');
    expect(cov.missing).toContain('핸드 그립력');
    expect(cov.missing).toContain('촉각 채널 수');
    expect(cov.asOf).toBe('2026-11-02');
  });

  it('uses an LG hand-benchmark row automatically when it exists', () => {
    const hand: BenchTable = { axes: [], competitors: [{ id: 'h2', slug: 'lg-hand', name: 'LG Hand', manufacturer: 'LG Electronics', scores: { gripForce: { score: 6, raw: '80 N', updatedAt: null } } }] };
    const our = buildOurPosition({ map: mapOf([]), ciBenchmark: null, handBenchmark: hand, failures: [] });
    expect(ourValueFor('grip_force', our)?.value).toBe(80);
  });

  it('price uses the midpoint of the robot price range', () => {
    const our = buildOurPosition({ map: mapOf([robot({ name: 'CLOiD', isLG: true, price: { min: 80000, max: 120000, conf: 'C', src: '' } })]), ciBenchmark: null, handBenchmark: null, failures: [] });
    expect(ourValueFor('price', our)?.value).toBe(100000);
  });

  it('cloid benchmark row supplies bench_* values', () => {
    const ci: BenchTable = { axes: [], competitors: [{ id: 'k', slug: 'cloid', name: 'CLOiD', manufacturer: 'LG Electronics', scores: { dexterity: { score: 6, raw: null, updatedAt: '2026-11-03T00:00:00.000Z' } } }] };
    const our = buildOurPosition({ map: null, ciBenchmark: ci, handBenchmark: null, failures: [] });
    expect(ourValueFor('bench_dexterity', our)?.value).toBe(6);
    expect(ourValueFor('bench_safety', our)).toBeNull();
  });
});

describe('gap drafts', () => {
  const our = buildOurPosition({ map: mapOf([robot({ name: 'CLOiD', isLG: true, handDof: 10, dof: 30, payload: 5, price: { min: 100000, max: 100000, conf: 'B', src: '' } })]), ciBenchmark: null, handBenchmark: null, failures: [] });
  const fact = (o: Partial<CompetitorFact>): CompetitorFact => ({ companyKey: 'fig', companyId: 'c9', companyName: 'Figure', robotName: 'Figure 03', axisKey: 'hand_dof', value: 16, grade: null, asOf: '2026-11-02', sourceUrl: null, source: 'map_robot', updatedAt: null, robotId: 'r9', ...o });

  it('builds a compared row with server-fixed Korean labels', () => {
    const d = buildGapDraft(fact({}), our, null, 'ci_change')!;
    expect(d.status).toBe('compared');
    expect(d.position).toBe('competitor_ahead');
    expect(d.movement).toBe('first_seen');
    expect(d.labelKo).toEqual({ position: '경쟁사 우위', movement: '첫 관측' });
    expect(d.diff).toEqual({ abs: 6, pct: 60 });
    expect(d.ourRef).toBe('CLOiD');
    expect(d.id).toBe('gap:fig:hand_dof');
  });

  it('marks ours_missing without any comparison numbers', () => {
    const d = buildGapDraft(fact({ axisKey: 'grip_force', value: 100 }), our, null, 'ci_change')!;
    expect(d.status).toBe('ours_missing');
    expect(d.ourValue).toBeNull();
    expect(d.diff).toBeNull();
    expect(d.position).toBeNull();
    expect(d.labelKo).toEqual({ position: null, movement: null });
    expect(gapRuleLines(d).join(' ')).toContain('우리 수치가 아직 등록되어 있지 않습니다');
  });

  it('price: cheaper competitor + previous value gives closing/receding by the flipped sign', () => {
    const d = buildGapDraft(fact({ axisKey: 'price', value: 70000 }), our, 90000, 'ci_change')!;
    expect(d.position).toBe('competitor_ahead');
    expect(d.movement).toBe('competitor_closing'); // the competitor got cheaper
    expect(d.prevCompetitorValue).toBe(90000);
  });

  it('priority order: ahead&closing < ahead&first_seen < parity&closing < others', () => {
    expect(gapPriority('competitor_ahead', 'competitor_closing')).toBeLessThan(gapPriority('competitor_ahead', 'first_seen'));
    expect(gapPriority('competitor_ahead', 'first_seen')).toBeLessThan(gapPriority('parity', 'competitor_closing'));
    expect(gapPriority('parity', 'competitor_closing')).toBeLessThan(gapPriority('we_ahead', 'steady'));
    expect(gapPriority(null, null)).toBe(5);
  });

  it('selects at most 6 rows, 2 per company and 2 ours_missing', () => {
    const drafts = [];
    for (const co of ['a', 'b', 'c', 'd']) {
      for (const ax of ['hand_dof', 'body_dof', 'payload']) {
        drafts.push(buildGapDraft(fact({ companyKey: co, companyName: co, axisKey: ax, value: 50 }), our, null, 'ci_change')!);
      }
    }
    for (const co of ['x', 'y', 'z']) drafts.push(buildGapDraft(fact({ companyKey: co, companyName: co, axisKey: 'grip_force', value: 9 }), our, null, 'ci_change')!);
    const picked = selectGapDrafts(drafts);
    expect(picked.length).toBeLessThanOrEqual(6);
    expect(picked.filter((d) => d.status === 'ours_missing').length).toBeLessThanOrEqual(2);
    const perCo = new Map<string, number>();
    for (const d of picked) perCo.set(d.id.split(':')[1]!, (perCo.get(d.id.split(':')[1]!) ?? 0) + 1);
    for (const n of perCo.values()) expect(n).toBeLessThanOrEqual(2);
    // compared rows come before ours_missing rows
    const firstMissing = picked.findIndex((d) => d.status === 'ours_missing');
    if (firstMissing >= 0) expect(picked.slice(0, firstMissing).every((d) => d.status === 'compared')).toBe(true);
  });
});

describe('competitor facts', () => {
  it('map robots exclude LG and forecast robots and drop null specs', () => {
    const facts = competitorFactsFromMap(
      mapOf([robot({ id: 'a', company: 'Figure', handDof: 16, dof: null, payload: 20 }), robot({ id: 'b', isLG: true, handDof: 12 }), robot({ id: 'c', forecast: true, handDof: 30 })], [supplier({ vendor: 'Maxon', peakTorqueNm: 60, weightKg: 2 }), supplier({ isLG: true, peakTorqueNm: 1, weightKg: 1 })]),
    );
    expect(facts.map((f) => `${f.companyKey}:${f.axisKey}:${f.value}`).sort()).toEqual(['figure:hand_dof:16', 'figure:payload:20', 'maxon:torque_density:30']);
  });

  it('benchmarks: hand rawValue is parsed, LG and cloid rows are skipped', () => {
    const hand: BenchTable = { axes: [], competitors: [{ id: '1', slug: 's', name: 'Shadow', manufacturer: 'Shadow Robot', scores: { gripForce: { score: 7, raw: '100 N', updatedAt: 't' }, dof: { score: 7, raw: 'n/a', updatedAt: 't' } } }] };
    expect(competitorFactsFromHandBenchmark(hand).map((f) => f.axisKey)).toEqual(['grip_force']);
    const ci: BenchTable = { axes: [], competitors: [{ id: '1', slug: 'cloid', name: 'CLOiD', manufacturer: 'LG Electronics', scores: { safety: { score: 5, raw: null, updatedAt: null } } }, { id: '2', slug: 'optimus', name: 'Optimus', manufacturer: 'Tesla', scores: { safety: { score: 6, raw: null, updatedAt: '2026-11-03T00:00:00.000Z' } } }] };
    const f = competitorFactsFromCiBenchmark(ci);
    expect(f).toHaveLength(1);
    expect(f[0]!.axisKey).toBe('bench_safety');
  });
});

describe('new-data rule (5.4)', () => {
  const start = Date.parse('2026-10-26T00:00:00+09:00');
  const w = (o: Partial<WeekSignals> = {}): WeekSignals => ({ ciAxes: new Map(), specUpdatedRobotIds: new Set(), mentionedCompanyIds: new Set(), rangeStartMs: start, rangeEndMs: start + 7 * 86_400_000, ...o });
  const f = (o: Partial<CompetitorFact> = {}): CompetitorFact => ({ companyKey: 'fig', companyId: 'c9', companyName: 'Figure', robotName: null, axisKey: 'hand_dof', value: 1, grade: null, asOf: null, sourceUrl: null, source: 'map_robot', updatedAt: null, robotId: 'r9', ...o });

  it('CI change for the same (company, axis)', () => {
    expect(newDataReason(f(), w({ ciAxes: new Map([['fig', new Set(['hand_dof'])]]) }))).toBe('ci_change');
    expect(newDataReason(f(), w({ ciAxes: new Map([['fig', new Set(['payload'])]]) }))).toBeNull();
  });

  it('benchmark updated_at inside the week', () => {
    expect(newDataReason(f({ source: 'ci_benchmark', updatedAt: new Date(start + 3_600_000).toISOString() }), w())).toBe('benchmark_updated');
    expect(newDataReason(f({ source: 'ci_benchmark', updatedAt: new Date(start - 3_600_000).toISOString() }), w())).toBeNull();
  });

  it('spec updated alone is NOT enough (reseed false positives); needs a company mention too', () => {
    expect(newDataReason(f(), w({ specUpdatedRobotIds: new Set(['r9']) }))).toBeNull();
    expect(newDataReason(f(), w({ mentionedCompanyIds: new Set(['c9']) }))).toBeNull();
    expect(newDataReason(f(), w({ specUpdatedRobotIds: new Set(['r9']), mentionedCompanyIds: new Set(['c9']) }))).toBe('spec_updated_with_mention');
  });
});

describe('misc', () => {
  it('parseCiPrevForAxis compares like with like', () => {
    expect(parseCiPrevForAxis('price', '$80,000 ~ $100,000')).toBe(90000);
    expect(parseCiPrevForAxis('hand_dof', '22 DoF')).toBe(22);
    expect(parseCiPrevForAxis('torque_density', '150 Nm')).toBeNull();
  });

  it('snapshotOf summarizes sourcing stats', () => {
    expect(snapshotOf(mapOf([]))).toMatchObject({ robots: 10, inHouse: 5, external: 3, unknown: 2 });
    expect(snapshotOf(null)).toBeNull();
  });

  it('fetchPositionSnapshot records failures per source and keeps the rest', async () => {
    const snap = await fetchPositionSnapshot({
      getMap: async () => {
        throw new Error('x');
      },
      getCiBenchmark: async () => ({ axes: [], competitors: [] }),
      getHandBenchmark: async () => ({ axes: [], competitors: [] }),
    });
    expect(snap.map).toBeNull();
    expect(snap.ciBenchmark).not.toBeNull();
    expect(snap.failures).toEqual(['position']);
  });
});
