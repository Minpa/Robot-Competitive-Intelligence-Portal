import { describe, expect, it } from 'vitest';
import {
  CATEGORY_OTHER,
  CATEGORY_PALETTE,
  CHART_HUE_MUTED,
} from '@/app/events/wrc2026/components/chartColors';
import {
  INK,
  POSTURE_COLOR,
  POSTURE_HOLLOW,
  POSTURE_LABEL,
  POSTURE_ORDER,
  SEGMENT_COLOR,
  SEGMENT_HOLLOW,
  SEGMENT_LABEL,
  SEGMENT_ORDER,
  adoptionBySegment,
  adoptionByVendor,
  adoptionTotals,
  companyPosture,
  componentSourcingText,
  postureDetailLabel,
  resolveSegmentOrder,
  roleKo,
  sameVendorName,
  segmentLabelList,
  splitVendors,
  summarizeSourcing,
  vendorKeys,
} from './actuator-sourcing';
import { adoption, posture, robot, seedAdoptionCases, seedRobots46, sourcing } from './actuator-strategy.fixtures';

describe('상수·라벨·색', () => {
  it('조달 태세 순서·라벨·색 토큰', () => {
    expect(POSTURE_ORDER).toEqual(['in_house', 'in_house_sells', 'external', 'unknown']);
    expect(POSTURE_ORDER.map((p) => POSTURE_LABEL[p])).toEqual(['자체 개발(확인)', '자체 개발+외판', '외부 조달·혼합', '확인 불가']);
    expect(POSTURE_COLOR.in_house).toBe(CATEGORY_PALETTE[0]);
    expect(POSTURE_COLOR.in_house_sells).toBe(CATEGORY_PALETTE[1]);
    expect(POSTURE_COLOR.external).toBe(CATEGORY_PALETTE[2]);
    expect(POSTURE_COLOR.unknown).toBe(CHART_HUE_MUTED);
    expect(POSTURE_HOLLOW).toEqual({ in_house: false, in_house_sells: false, external: false, unknown: true });
  });

  it('세그먼트 7종 순서·라벨·색 토큰 (새 hex 없음)', () => {
    expect(SEGMENT_ORDER).toEqual(['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other']);
    expect(SEGMENT_LABEL.service).toBe('서비스·웨어러블(외골격·의료)');
    expect(SEGMENT_LABEL.tier1_oem).toBe('1군 세트사 양산 공급·위탁제조');
    expect(SEGMENT_COLOR.tier1_oem).toBe(CATEGORY_PALETTE[1]);
    expect(SEGMENT_COLOR.tier2_legged).toBe(CATEGORY_PALETTE[3]);
    expect(SEGMENT_COLOR.research_edu).toBe(CATEGORY_PALETTE[4]);
    expect(SEGMENT_COLOR.industrial_cobot).toBe(CATEGORY_PALETTE[5]);
    expect(SEGMENT_COLOR.service).toBe(CATEGORY_PALETTE[2]);
    expect(SEGMENT_COLOR.other).toBe(CATEGORY_OTHER);
    expect(SEGMENT_COLOR.captive).toBe(INK[600]);
    expect(SEGMENT_HOLLOW.captive).toBe(true);
    const allowed = new Set([...CATEGORY_PALETTE, CATEGORY_OTHER, CHART_HUE_MUTED, ...Object.values(INK)].map((c) => c.toLowerCase()));
    for (const c of [...Object.values(POSTURE_COLOR), ...Object.values(SEGMENT_COLOR)]) expect(allowed.has(c.toLowerCase())).toBe(true);
  });

  it('resolveSegmentOrder: 서버 순서를 따르고 모르는 값은 버리며 빠진 값은 뒤에 붙인다', () => {
    expect(resolveSegmentOrder(undefined)).toEqual(SEGMENT_ORDER);
    expect(resolveSegmentOrder(['service', 'bogus', 'tier1_oem'])).toEqual(['service', 'tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'captive', 'other']);
  });
});

describe('summarizeSourcing / companyPosture', () => {
  it('forecast 제외, 4단계 합 = 로봇 수, 혼합·추정·부품 층 부분집합', () => {
    const robots = [
      robot('a', 'A', [], posture('in_house', { evidenceGrade: 'A' })),
      robot('b', 'A', [], posture('in_house_sells', { evidenceGrade: 'B' })),
      robot('c', 'B', [], posture('external', { kind: 'mixed' })),
      robot('d', 'C', [], posture('unknown', { kind: 'in_house_presumed' })),
      robot('e', 'D', [], posture('unknown')),
      robot('f', 'E', [], posture('in_house', { componentSourcing: true, evidenceGrade: 'B' })),
      robot('x', 'F', [], { forecast: true, ...posture('in_house') }),
    ];
    const s = summarizeSourcing(robots);
    expect(s).toMatchObject({ robots: 6, inHouse: 2, inHouseSells: 1, external: 1, externalMixed: 1, unknown: 2, unknownPresumed: 1, componentSourcing: 1, confirmedGradeA: 1, confirmedGradeB: 2 });
    expect(s.inHouse + s.inHouseSells + s.external + s.unknown).toBe(s.robots);
  });

  it('companyPosture 우선순위: 자체+외판 > 자체 > 외부 > 확인 불가 (대소문자·공백 무시)', () => {
    const m = companyPosture([
      robot('1', 'Co', [], posture('unknown')),
      robot('2', 'co ', [], posture('external')),
      robot('3', 'Co', [], posture('in_house')),
      robot('4', 'Co', [], posture('in_house_sells')),
      robot('5', 'Other', [], posture('external')),
      robot('6', 'Other', [], posture('unknown')),
    ]);
    expect(m.get('co')!.posture).toBe('in_house_sells');
    expect(m.get('other')!.posture).toBe('external');
    expect(m.size).toBe(2);
  });

  it('상세 라벨: 등급·혼합·추정·근거 없음', () => {
    expect(postureDetailLabel(sourcing('in_house', { evidenceGrade: 'B' }))).toBe('자체 개발(확인·B)');
    expect(postureDetailLabel(sourcing('in_house_sells', { evidenceGrade: 'A' }))).toBe('자체 개발+외판(확인·A)');
    expect(postureDetailLabel(sourcing('external', { kind: 'mixed', evidenceGrade: 'B' }))).toBe('외부 조달·혼합(혼합·B)');
    expect(postureDetailLabel(sourcing('unknown', { kind: 'in_house_presumed', evidenceGrade: 'C' }))).toBe('확인 불가(자체 개발 추정·C)');
    expect(postureDetailLabel(sourcing('unknown'))).toBe('확인 불가(근거 없음)');
  });

  it('부품 층 외부 조달 문구', () => {
    const s = sourcing('in_house', { componentSourcing: true, externalVendors: [{ vendor: 'maxon', role: null, grade: 'A', url: null, level: 'component' }] });
    expect(componentSourcingText(s)).toBe('부품(모터·감속기) 외부 조달: maxon');
    expect(componentSourcingText(sourcing('in_house'))).toBeNull();
  });

  const seed = seedRobots46();
  (seed ? it : it.skip)('시드 46기 분포: 자체 26 / 자체+외판 7 / 외부 5 / 확인 불가 8, 합 46 (부품 층 HUBO·TALOS 는 자체)', () => {
    const s = summarizeSourcing(seed!);
    expect(s).toMatchObject({ robots: 46, inHouse: 26, inHouseSells: 7, external: 5, unknown: 8, unknownPresumed: 5, componentSourcing: 2, externalMixed: 4 });
    expect(s.inHouse + s.inHouseSells).toBe(33);
    expect(seed!.filter((r) => r.sourcing.posture === 'external').map((r) => r.name).sort()).toEqual(['4NE1', 'Atlas (Electric)', 'Moxi', 'Optimus Gen 2', 'Optimus V3']);
    expect(seed!.filter((r) => r.sourcing.componentSourcing).map((r) => r.name).sort()).toEqual(['HUBO 2 / DRC-HUBO', 'TALOS']);
  });
});

describe('공급사 이름 정규화', () => {
  it('splitVendors / vendorKeys', () => {
    expect(splitVendors('Tuopu Group / Sanhua Intelligent Controls')).toEqual(['Tuopu Group', 'Sanhua Intelligent Controls']);
    expect(splitVendors(null)).toEqual([]);
    expect(vendorKeys('CubeMars (T-Motor)')).toEqual(['cubemars', 'tmotor']);
    expect(vendorKeys('Quanzhibo (泉智博)')).toEqual(['quanzhibo', '泉智博']);
  });
  it('sameVendorName 긍정·부정', () => {
    expect(sameVendorName('CubeMars (T-Motor)', 'CubeMars')).toBe(true);
    expect(sameVendorName('CubeMars (T-Motor)', 'T-Motor')).toBe(true);
    expect(sameVendorName('RobStride Dynamics', 'RobStride')).toBe(true);
    expect(sameVendorName('Unitree', 'Unitree Robotics')).toBe(true);
    expect(sameVendorName('Mobis', 'Hyundai Mobis')).toBe(true);
    expect(sameVendorName('maxon', 'Mobis')).toBe(false);
    expect(sameVendorName('Harmonic Drive', 'Nabtesco')).toBe(false);
    expect(sameVendorName('', 'x')).toBe(false);
  });
  it('roleKo', () => {
    expect(roleKo('contract manufacturing')).toBe('위탁제조');
    expect(roleKo('mass-production supply')).toBe('양산 공급');
    expect(roleKo('component supply')).toBe('부품 공급');
    expect(roleKo('양산 단계 공급')).toBe('양산 단계 공급');
    expect(roleKo(null)).toBeNull();
  });
});

describe('수요 사례 집계', () => {
  const list = [
    adoption({ id: '1', marketSegment: 'tier1_oem', actuatorVendor: 'Hyundai Mobis' }),
    adoption({ id: '2', marketSegment: 'tier1_oem', actuatorVendor: 'Tuopu Group / Sanhua Intelligent Controls' }),
    adoption({ id: '3', marketSegment: 'service', actuatorVendor: 'CubeMars (T-Motor)' }),
    adoption({ id: '4', marketSegment: 'service', actuatorVendor: 'CubeMars' }),
    adoption({ id: '5', marketSegment: 'service', level: 'component', actuatorVendor: 'maxon' }),
    adoption({ id: '6', marketSegment: 'industrial_cobot', level: 'component', actuatorVendor: 'Nabtesco' }),
  ];
  it('adoptionBySegment: 모듈 층을 1차로, 부품 층은 별도, 순서는 segmentOrder', () => {
    const rows = adoptionBySegment(list);
    expect(rows).toEqual([
      { segment: 'tier1_oem', count: 2, componentCount: 0 },
      { segment: 'industrial_cobot', count: 0, componentCount: 1 },
      { segment: 'service', count: 2, componentCount: 1 },
    ]);
    expect(segmentLabelList(rows, '건')).toBe('1군 세트사 양산 공급·위탁제조 2건, 서비스·웨어러블(외골격·의료) 2건');
  });
  it('adoptionByVendor: 내림차순, 같은 공급사 병합, 복수 공급사 사례는 각각', () => {
    const rows = adoptionByVendor(list);
    expect(rows[0]).toEqual({ vendor: 'CubeMars (T-Motor)', count: 2 });
    expect(rows.map((r) => r.vendor)).toEqual(['CubeMars (T-Motor)', 'Hyundai Mobis', 'Sanhua Intelligent Controls', 'Tuopu Group']);
    expect(adoptionByVendor(list, 'component').map((r) => r.vendor)).toEqual(['maxon', 'Nabtesco']);
  });
  it('adoptionTotals', () => {
    expect(adoptionTotals(list)).toEqual({ total: 6, module: 4, component: 2 });
    expect(adoptionTotals([])).toEqual({ total: 0, module: 0, component: 0 });
  });
  it('실데이터 38건: 모듈 30 / 부품 8, 세그먼트 매핑', () => {
    const cases = seedAdoptionCases();
    if (!cases) return;
    expect(adoptionTotals(cases)).toEqual({ total: 38, module: 30, component: 8 });
    const seg = Object.fromEntries(adoptionBySegment(cases).map((r) => [r.segment, r.count]));
    expect(seg.tier1_oem).toBe(8);
  });
});
