import { describe, expect, it } from 'vitest';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { normalizeActuatorMap, normalizeSourcing } from './actuator-map-normalize';
import { SEGMENT_ORDER } from './actuator-sourcing';
import { buildDiagnosisLines, computeStrategyStats } from './actuator-strategy';
import { seedResponse } from './actuator-strategy.fixtures';

/** 구 응답: 조달 태세·수요 사례 필드가 전혀 없는 형태 */
function legacy(): ActuatorMapResponse {
  const d = JSON.parse(JSON.stringify(seedResponse())) as Record<string, unknown>;
  for (const k of ['schemaVersion', 'adoptions', 'vendorMarkets', 'sourcingStats', 'segmentOrder']) delete d[k];
  delete (d.stats as Record<string, unknown>).adoptions;
  for (const r of d.robots as Record<string, unknown>[]) delete r.sourcing;
  for (const s of d.suppliers as Record<string, unknown>[]) for (const k of ['diameterRangeMm', 'integrationLevel', 'isLG', 'segment', 'segments', 'segmentBasis', 'adoptionIds']) delete s[k];
  d.edges = [
    { robotId: 'r1', robotName: 'Go1', company: 'Unitree', vendor: 'Unitree', inHouse: true, type: '미확인', quantity: 1, confidence: 'B' },
    { robotId: 'r2', robotName: 'Atlas', company: 'BD', vendor: 'Hyundai Mobis', inHouse: false, type: '미확인', quantity: 1, confidence: 'B' },
  ];
  return d as unknown as ActuatorMapResponse;
}

describe('normalizeActuatorMap', () => {
  it('구 응답: 로봇 sourcing=unknown/derived, 공급사 segment=other, 배열 [], 통계 계산', () => {
    const n = normalizeActuatorMap(legacy());
    for (const r of n.robots) {
      expect(r.sourcing).toMatchObject({ posture: 'unknown', kind: 'unknown', basis: 'derived', sellsExternally: null, evidence: [], externalVendors: [], componentSourcing: false });
    }
    for (const s of n.suppliers) {
      expect(s).toMatchObject({ isLG: false, segment: 'other', segments: ['other'], segmentBasis: 'none', adoptionIds: [], diameterRangeMm: null, integrationLevel: null });
    }
    expect(n.adoptions).toEqual([]);
    expect(n.vendorMarkets).toEqual([]);
    expect(n.segmentOrder).toEqual(SEGMENT_ORDER);
    expect(n.schemaVersion).toBe(1);
    expect(n.stats.adoptions).toBe(0);
    expect(n.sourcingStats).toMatchObject({ robots: 10, unknown: 10, inHouse: 0, derived: 10, regraded: 0 });
  });

  it('구 응답 엣지: inHouse → self/unverified, 외부 → external, level=module', () => {
    const n = normalizeActuatorMap(legacy());
    expect(n.edges[0]).toMatchObject({ basis: 'unverified', level: 'module', role: null });
    expect(n.edges[1]).toMatchObject({ basis: 'external', level: 'module' });
  });

  it('구 응답으로도 전략 통계·문장이 예외 없이 계산된다 (자체 개발로 단정하지 않음)', () => {
    const n = normalizeActuatorMap(legacy());
    const lines = buildDiagnosisLines(computeStrategyStats(n));
    expect(lines).toHaveLength(8);
    expect(lines[0]).toContain('자체 개발 확인 0기');
    expect(lines[7]).toBe('공개 채택 사례는 아직 수집되지 않았습니다.');
  });

  it('새 응답은 값이 그대로 통과한다 (참조는 새 객체여도 내용 동일)', () => {
    const raw = seedResponse();
    const n = normalizeActuatorMap(raw);
    expect(n.robots.map((r) => r.sourcing)).toEqual(raw.robots.map((r) => r.sourcing));
    expect(n.suppliers.map((s) => [s.segment, s.segments, s.isLG])).toEqual(raw.suppliers.map((s) => [s.segment, s.segments, s.isLG]));
    expect(n.adoptions).toEqual(raw.adoptions);
    expect(n.segmentOrder).toEqual(raw.segmentOrder);
    expect(n.schemaVersion).toBe(2);
    expect(n.edges).toEqual(raw.edges);
  });

  it('입력을 변경하지 않는다', () => {
    const raw = legacy();
    const before = JSON.stringify(raw);
    normalizeActuatorMap(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('엣지에 level 이 없으면 로봇의 externalVendors level 을 따른다', () => {
    const raw = seedResponse();
    const hubo = raw.edges.find((e) => e.vendor === 'maxon')!;
    delete (hubo as Partial<typeof hubo>).level;
    expect(normalizeActuatorMap(raw).edges.find((e) => e.vendor === 'maxon')!.level).toBe('component');
  });

  it('잘못된 값은 안전한 기본값으로: 모르는 posture/level/segment', () => {
    const s = normalizeSourcing({ posture: 'bogus' as never, kind: 'x' as never, externalVendors: [{ vendor: 'V', role: null, grade: null, url: null, level: 'weird' as never }] });
    expect(s.posture).toBe('unknown');
    expect(s.kind).toBe('unknown');
    expect(s.externalVendors[0]!.level).toBe('module');
    const raw = seedResponse();
    (raw.suppliers[0] as { segment: string }).segment = 'bogus';
    expect(normalizeActuatorMap(raw).suppliers[0]!.segment).toBe(raw.suppliers[0]!.segments[0]);
  });

  it('adoption 의 marketSegment/level 이 빠진 응답은 세그먼트 매핑으로 보완', () => {
    const raw = seedResponse();
    raw.adoptions = [{ ...raw.adoptions[0]!, marketSegment: undefined as never, level: undefined as never, segment: 'humanoid_tier1' }];
    const a = normalizeActuatorMap(raw).adoptions[0]!;
    expect(a.marketSegment).toBe('tier1_oem');
    expect(a.level).toBe('module');
  });

  it('빈 응답은 예외', () => {
    expect(() => normalizeActuatorMap(null)).toThrow();
  });
});
