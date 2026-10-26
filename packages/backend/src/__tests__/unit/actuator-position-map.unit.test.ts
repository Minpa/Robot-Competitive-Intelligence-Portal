import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAdoptionsFile } from '../../db/actuator-update.util.js';
import {
  ACTUATOR_TYPE_LABELS,
  DIFFICULTY_DEFAULT,
  MARKET_SEGMENT_ORDER,
  SEGMENT_OVERRIDES,
  adoptionRowToCase,
  assembleRobot,
  buildEdges,
  classifyActuatorText,
  classifyMarketSegments,
  computeDifficulty,
  computeSourcingStats,
  dedupeLooseComponents,
  enrichSupplierProduct,
  findVendorMarket,
  marketSegmentOfAdoption,
  matchAdoptionIds,
  isVendorLevelModel,
  type AdoptionSegmentVote,
  modelMatches,
  parseDiameterRange,
  postureOf,
  resolveSourcing,
  sameVendor,
  vendorKey,
  vendorMarketRowToModel,
  type ActuatorMapRobot,
  type RobotActuator,
  type SourcingRow,
  inferSupplierType,
  isLGCompany,
  isSameCompany,
  lookupVendorType,
  matchCiToRobot,
  normalizeRegion,
  parseDescriptionPrice,
  parseInHouse,
  parseLeadingNumber,
  parsePriceRange,
  parseVendorList,
  vendorTypeMap,
} from '../../services/actuator-position-map.service.js';

describe('classifyActuatorText (actuator type label normalization)', () => {
  it('maps component actuatorType codes', () => {
    expect(classifyActuatorText('harmonic')).toBe('하모닉(스트레인웨이브)');
    expect(classifyActuatorText('direct_drive')).toBe('직구동/QDD');
    expect(classifyActuatorText('cycloidal')).toBe('사이클로이드·유성');
    expect(classifyActuatorText('planetary')).toBe('사이클로이드·유성');
    expect(classifyActuatorText('linear screw')).toBe('리니어·스크류');
  });
  it('maps CI 구동 방식 text', () => {
    expect(classifyActuatorText('전기 모터 + 하모닉 감속기')).toBe('하모닉(스트레인웨이브)');
    expect(classifyActuatorText('소프트 액추에이터 (독자 기술)')).toBe('소프트·텐던');
    expect(classifyActuatorText('커스텀 전기 액추에이터')).toBe('커스텀 전기(상세 미공개)');
    expect(classifyActuatorText('커스텀 액추에이터')).toBe('커스텀 전기(상세 미공개)');
    expect(classifyActuatorText('유압 → 전기 액추에이터 전환')).toBe('유압→전기 전환');
    expect(classifyActuatorText('hydraulic')).toBe('유압→전기 전환');
    expect(classifyActuatorText('QDD proprioceptive')).toBe('직구동/QDD');
    expect(classifyActuatorText('텐던 구동 손')).toBe('소프트·텐던');
  });
  it('returns null when nothing matches', () => {
    expect(classifyActuatorText(null)).toBeNull();
    expect(classifyActuatorText('')).toBeNull();
    expect(classifyActuatorText('비공개')).toBeNull();
  });
  it('only emits labels from the fixed set', () => {
    for (const t of ['harmonic', 'direct_drive', '유압 전기', '리니어', 'soft', 'custom', 'RV 감속기']) {
      const label = classifyActuatorText(t);
      expect(label === null || (ACTUATOR_TYPE_LABELS as readonly string[]).includes(label)).toBe(true);
    }
  });
});

describe('normalizeRegion', () => {
  it('uses humanoid_robots.region first', () => {
    expect(normalizeRegion('north_america', 'China')).toBe('na');
    expect(normalizeRegion('china', 'USA')).toBe('cn');
    expect(normalizeRegion('europe', null)).toBe('eu');
    expect(normalizeRegion('korea', null)).toBe('kr');
    expect(normalizeRegion('KR', null)).toBe('kr');
    expect(normalizeRegion('japan', null)).toBe('jp');
  });
  it('falls back to company country', () => {
    expect(normalizeRegion(null, 'USA')).toBe('na');
    expect(normalizeRegion('asia', 'China')).toBe('cn');
    expect(normalizeRegion(null, 'Norway')).toBe('eu');
    expect(normalizeRegion(null, 'Korea')).toBe('kr');
    expect(normalizeRegion(null, 'Japan')).toBe('jp');
    expect(normalizeRegion(null, 'Canada')).toBe('na');
  });
  it('is other when neither is known', () => {
    expect(normalizeRegion(null, null)).toBe('other');
    expect(normalizeRegion('asia', 'Singapore')).toBe('other');
    expect(normalizeRegion(null, 'Israel')).toBe('other');
  });
});

describe('parsePriceRange', () => {
  it('parses "$20K-$30K (목표)" → {20000, 30000}', () => {
    expect(parsePriceRange('$20K-$30K (목표)')).toEqual({ min: 20_000, max: 30_000 });
  });
  it('parses ranges wrapped in text and comma numbers', () => {
    expect(parsePriceRange('비공개 (추정 $150K-$200K)')).toEqual({ min: 150_000, max: 200_000 });
    expect(parsePriceRange('$250K-$300K (추정)')).toEqual({ min: 250_000, max: 300_000 });
    expect(parsePriceRange('$16,000 가격대')).toEqual({ min: 16_000, max: 16_000 });
    expect(parsePriceRange('$1.5M')).toEqual({ min: 1_500_000, max: 1_500_000 });
  });
  it('ignores monthly subscription amounts', () => {
    expect(parsePriceRange('$20,000 또는 $499/월')).toEqual({ min: 20_000, max: 20_000 });
    expect(parsePriceRange('$499/월')).toBeNull();
  });
  it('returns null without a dollar amount', () => {
    expect(parsePriceRange('비공개 (가정용 목표)')).toBeNull();
    expect(parsePriceRange(null)).toBeNull();
    expect(parsePriceRange('')).toBeNull();
  });
});

describe('parseDescriptionPrice (robot description fallback)', () => {
  it('requires a price keyword and ignores order-backlog / funding amounts', () => {
    expect(parseDescriptionPrice('H1 후속 모델. 3D 비전 + LiDAR 통합, $90K 가격대.')).toEqual({ min: 90_000, max: 90_000 });
    expect(parseDescriptionPrice('수주잔고 8억 위안(~$112M). 연 5,000대 생산 목표.')).toBeNull();
    expect(parseDescriptionPrice('가격 미정. 투자 유치 $112M')).toBeNull();
    expect(parseDescriptionPrice('168cm, 30kg. $20,000 또는 $499/월 구독.')).toEqual({ min: 20_000, max: 20_000 });
    expect(parseDescriptionPrice('Tesla humanoid. 173cm.')).toBeNull();
  });
});

describe('vendorTypeMap / lookupVendorType', () => {
  it('maps component vendors to type labels and matches partial company names', () => {
    const map = vendorTypeMap([
      { vendor: 'Fourier', specifications: { actuatorType: 'harmonic' } },
      { vendor: 'Unitree', specifications: { actuatorType: 'direct_drive' } },
      { vendor: 'NoSpec', specifications: null },
    ]);
    expect(lookupVendorType(map, 'Fourier Intelligence')).toBe('하모닉(스트레인웨이브)');
    expect(lookupVendorType(map, 'Unitree Robotics')).toBe('직구동/QDD');
    expect(lookupVendorType(map, 'Harmonic Drive')).toBeNull();
  });
});

describe('computeDifficulty (default formula)', () => {
  it('is 0 for wheeled, ≤10 DOF, no hand, no speed', () => {
    expect(computeDifficulty({ locomotion: 'wheeled', dof: 10, handDof: 0, speed: 0 })).toBe(0);
  });
  it('is 10 for bipedal, 50 DOF, 24 hand DOF, 5 m/s', () => {
    expect(computeDifficulty({ locomotion: 'bipedal', dof: 50, handDof: 24, speed: 5 })).toBeCloseTo(10, 6);
  });
  it('matches the prototype value for Optimus Gen 2 (bipedal, 28 DOF, 11 hand, 2.5 m/s) ≈ 6.8', () => {
    const v = computeDifficulty({ locomotion: 'bipedal', dof: 28, handDof: 11, speed: 2.5 });
    expect(v).toBeCloseTo(6.79, 1);
  });
  it('matches the prototype value for CLOiD (wheeled, 14 DOF, 14 hand, 1.1 m/s) ≈ 1.7', () => {
    const v = computeDifficulty({ locomotion: 'wheeled', dof: 14, handDof: 14, speed: 1.1 });
    expect(v).toBeCloseTo(1.75, 1);
  });
  it('clamps inputs and treats hybrid as 0.5', () => {
    const hybrid = computeDifficulty({ locomotion: 'hybrid', dof: 0, handDof: 0, speed: 0 });
    expect(hybrid).toBeCloseTo(10 * (DIFFICULTY_DEFAULT.L * 0.5) / 100, 6);
    expect(computeDifficulty({ locomotion: 'bipedal', dof: 999, handDof: 999, speed: 999 })).toBeCloseTo(10, 6);
  });
  it('normalizes by weight sum and survives all-zero weights', () => {
    const r = { locomotion: 'bipedal', dof: 30, handDof: 12, speed: 2 };
    expect(computeDifficulty(r, { L: 80, D: 50, H: 40, S: 30 })).toBeCloseTo(computeDifficulty(r), 6);
    expect(Number.isFinite(computeDifficulty(r, { L: 0, D: 0, H: 0, S: 0 }))).toBe(true);
  });
});

describe('small parsers', () => {
  it('isLGCompany', () => {
    expect(isLGCompany('LG Electronics')).toBe(true);
    expect(isLGCompany('LG전자')).toBe(true);
    expect(isLGCompany('Agility Robotics')).toBe(false);
    expect(isLGCompany('Flagship')).toBe(false);
    expect(isLGCompany(null)).toBe(false);
  });
  it('isSameCompany', () => {
    expect(isSameCompany('Unitree', 'Unitree Robotics')).toBe(true);
    expect(isSameCompany('Fourier', 'Fourier Intelligence')).toBe(true);
    expect(isSameCompany('Tesla', 'Tesla')).toBe(true);
    expect(isSameCompany('Hyundai Mobis', 'Boston Dynamics')).toBe(false);
    expect(isSameCompany(null, 'Tesla')).toBe(false);
  });
  it('parseInHouse', () => {
    expect(parseInHouse('자체 생산 (AXIUM)')).toBe(true);
    expect(parseInHouse('외부 공급')).toBe(false);
    expect(parseInHouse('비공개')).toBeNull();
    expect(parseInHouse(null)).toBeNull();
  });
  it('parseVendorList', () => {
    expect(parseVendorList('Hyundai Mobis, Harmonic Drive (감속기)')).toEqual(['Hyundai Mobis', 'Harmonic Drive']);
    expect(parseVendorList('비공개')).toEqual([]);
    expect(parseVendorList(null)).toEqual([]);
  });
  it('parseLeadingNumber', () => {
    expect(parseLeadingNumber('최대 160 Nm')).toBe(160);
    expect(parseLeadingNumber('비공개')).toBeNull();
  });
  it('inferSupplierType', () => {
    expect(inferSupplierType('Harmonic Drive CSD-2A Precision gear and actuator')).toBe('하모닉(스트레인웨이브)');
    expect(inferSupplierType('Nabtesco RV-100C RV Industrial robot joints')).toBe('사이클로이드·유성');
    expect(inferSupplierType('Maxon EC-i 52 High-precision DC motors')).toBe('모터·기어박스(BLDC)');
    expect(inferSupplierType('Gyems RMD-X8 Pro Robot joint motors and actuators')).toBe('모터·기어박스(BLDC)');
    expect(inferSupplierType('XYZ-1')).toBe('미확인');
  });
});

describe('matchCiToRobot', () => {
  const robots = [
    { id: 'a', name: 'Optimus Gen 2', company: 'Tesla' },
    { id: 'b', name: 'Optimus Gen 3', company: 'Tesla' },
    { id: 'c', name: 'Digit', company: 'Agility Robotics' },
    { id: 'd', name: 'CLOiD', company: 'LG Electronics' },
  ];
  it('matches by exact name (case-insensitive)', () => {
    expect(matchCiToRobot({ competitorName: 'digit', manufacturer: 'Agility Robotics' }, robots)).toBe('c');
  });
  it('falls back to the single robot of the manufacturer', () => {
    expect(matchCiToRobot({ competitorName: 'LG Humanoid', manufacturer: 'LG Electronics' }, robots)).toBe('d');
  });
  it('does not guess when ambiguous', () => {
    expect(matchCiToRobot({ competitorName: 'Optimus', manufacturer: 'Tesla' }, robots)).toBeNull();
  });
});

describe('assembleRobot + buildEdges', () => {
  const baseRow = {
    id: 'r1',
    name: 'Optimus Gen 2',
    companyId: 'c1',
    companyName: 'Tesla',
    companyCountry: 'USA',
    region: 'north_america',
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    announcementYear: 2023,
    dataType: 'confirmed',
    description: 'Tesla humanoid. $20,000 target.',
    heightCm: '173.00',
    weightKg: '57.00',
    payloadKg: '20.00',
    dofCount: 28,
    maxSpeedMps: '2.50',
    handDof: 11,
  };

  it('prefers components evidence for the type label and marks in-house vendors', () => {
    const robot = assembleRobot(
      baseRow,
      [
        {
          robotId: 'r1',
          name: 'Tesla Rotary Actuator',
          vendor: 'Tesla',
          specifications: { actuatorType: 'direct_drive', maxTorqueNm: 100, weightKg: 1.2 },
          quantity: 6,
          usageLocation: 'leg',
        },
      ],
      {
        competitorName: 'Optimus Gen 2',
        manufacturer: 'Tesla',
        values: {
          '구동 방식': { value: '커스텀 액추에이터', confidence: 'B', source: 'Tesla AI Day' },
          '가격대': { value: '$20K-$30K (목표, 대량생산 시)', confidence: 'C', source: 'Elon Musk 발언' },
        },
      }
    );
    expect(robot.actuatorTypeLabel).toBe('직구동/QDD');
    expect(robot.incomplete).toBe(false);
    expect(robot.region).toBe('na');
    expect(robot.isLG).toBe(false);
    expect(robot.weight).toBe(57);
    expect(robot.speed).toBe(2.5);
    expect(robot.price).toMatchObject({ min: 20_000, max: 30_000, conf: 'C' });
    expect(robot.actuators[0]).toMatchObject({ inHouse: true, torqueNm: 100, quantity: 6, source: 'components' });
    expect(robot.sources).toContain('ci_values');

    const edges = buildEdges([robot]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ robotId: 'r1', vendor: 'Tesla', inHouse: true, quantity: 6 });
  });

  it('falls back to CI drive text and description-derived price; adds CI vendors as edges', () => {
    const robot = assembleRobot(
      { ...baseRow, id: 'r2', name: 'Atlas (Electric)', companyName: 'Boston Dynamics', description: '유압에서 전기로 전환한 신형 Atlas' },
      [],
      {
        competitorName: 'Atlas (Electric)',
        manufacturer: 'Boston Dynamics',
        values: {
          '구동 방식': { value: '전기 액추에이터 (신형)', confidence: 'B', source: 'BD' },
          '액추에이터 공급사': { value: 'Hyundai Mobis', confidence: 'C', source: 'CI 2026-07' },
        },
      }
    );
    expect(robot.actuatorTypeLabel).toBe('유압→전기 전환');
    expect(robot.price).toBeNull();
    const edges = buildEdges([robot]);
    expect(edges).toEqual([
      expect.objectContaining({ vendor: 'Hyundai Mobis', inHouse: false, confidence: 'C', quantity: 1 }),
    ]);
  });

  it('marks robots without body_specs as incomplete and 미확인 without evidence', () => {
    const robot = assembleRobot(
      { ...baseRow, id: 'r3', name: 'Apollo', heightCm: null, weightKg: null, payloadKg: null, dofCount: null, maxSpeedMps: null, handDof: null, description: null },
      [],
      null
    );
    expect(robot.incomplete).toBe(true);
    expect(robot.actuatorTypeLabel).toBe('미확인');
    expect(robot.price).toBeNull();
    expect(buildEdges([robot])).toEqual([]);
  });

  it('CI vendor token "자체" is the manufacturer itself, not an external vendor', () => {
    const robot = assembleRobot(
      { ...baseRow, id: 'r5', name: 'Digit', companyName: 'Agility Robotics' },
      [],
      {
        competitorName: 'Digit',
        manufacturer: 'Agility Robotics',
        values: { '액추에이터 공급사': { value: '자체 (Agility Robotics)', confidence: 'A', source: 'CI' } },
      }
    );
    expect(robot.actuators).toEqual([expect.objectContaining({ vendor: 'Agility Robotics', inHouse: true })]);
    expect(robot.sourcing).toMatchObject({ posture: 'unknown', basis: 'derived' }); // 자체 표기만으로는 자체 개발 확정 아님
    expect(buildEdges([robot])).toEqual([expect.objectContaining({ vendor: 'Agility Robotics', inHouse: true, basis: 'unverified' })]);
  });

  it('adds a self edge when CI says in-house and no component vendor exists', () => {
    const robot = assembleRobot(
      { ...baseRow, id: 'r4', name: 'CLOiD', companyName: 'LG Electronics', companyCountry: 'Korea', region: 'KR', locomotionType: 'wheeled', description: null },
      [],
      {
        competitorName: 'CLOiD',
        manufacturer: 'LG Electronics',
        values: { '자체 생산 여부': { value: '자체 생산 (AXIUM)', confidence: 'B', source: 'CI' } },
      }
    );
    expect(robot.isLG).toBe(true);
    expect(robot.region).toBe('kr');
    expect(robot.locomotion).toBe('wheeled');
    const edges = buildEdges([robot]);
    expect(edges).toEqual([expect.objectContaining({ vendor: 'LG Electronics', inHouse: true })]);
  });
});


// ============================================================
// 조달 태세 · 세그먼트 · 수요 사례
// ============================================================

const act = (over: Partial<RobotActuator> = {}): RobotActuator => ({
  name: 'a', vendor: 'Tesla', inHouse: true, type: '미확인', torqueNm: null, weightKg: null, quantity: 1,
  usageLocation: null, source: 'components', confidence: 'B', ...over,
});

const srow = (over: Partial<SourcingRow> = {}): SourcingRow => ({
  robotId: 'r1', sourcing: 'in_house_confirmed', sellsExternally: false, evidenceGrade: 'A', evidence: [], externalVendors: [], noteKo: null, ...over,
});

describe('postureOf', () => {
  const kinds = ['in_house_confirmed', 'in_house_presumed', 'external', 'mixed', 'unknown'] as const;
  it('covers every kind x sellsExternally combination', () => {
    const expected: Record<string, [string, string, string]> = {
      // [true, false, null]
      in_house_confirmed: ['in_house_sells', 'in_house', 'in_house'],
      in_house_presumed: ['unknown', 'unknown', 'unknown'],
      external: ['external', 'external', 'external'],
      mixed: ['external', 'external', 'external'],
      unknown: ['unknown', 'unknown', 'unknown'],
    };
    for (const k of kinds) {
      expect([postureOf(k, true), postureOf(k, false), postureOf(k, null)]).toEqual(expected[k]);
    }
    expect(postureOf('in_house_confirmed', undefined)).toBe('in_house');
  });

  it('in_house_presumed + sells=true is still unknown', () => {
    expect(postureOf('in_house_presumed', true)).toBe('unknown');
  });

  it('mixed: module-level vendor => external, all component-level => in_house, no vendors => external', () => {
    expect(postureOf('mixed', false, [{ level: 'module' }])).toBe('external');
    expect(postureOf('mixed', false, [{ level: 'component' }, { level: 'module' }])).toBe('external');
    expect(postureOf('mixed', false, [{ level: 'component' }, { level: 'component' }])).toBe('in_house');
    expect(postureOf('mixed', false, [])).toBe('external');
    expect(postureOf('mixed', false, [{}])).toBe('external'); // level 없음 = module
    expect(postureOf('external', false, [{ level: 'component' }])).toBe('external'); // external 은 그대로
  });
});

describe('resolveSourcing', () => {
  it('uses the regrade row (basis regrade) with posture rules and sanitized evidence', () => {
    const s = resolveSourcing(
      srow({
        sourcing: 'mixed',
        evidence: [{ claim: 'c', source: 'src', url: 'https://x', grade: 'A', date: '2026' }, { nope: 1 }],
        externalVendors: [{ vendor: 'Hyundai Mobis', role: 'supply', grade: 'A', url: null, level: 'module' }],
        noteKo: 'n',
      }),
      [],
      'Boston Dynamics'
    );
    expect(s).toMatchObject({ posture: 'external', kind: 'mixed', basis: 'regrade', componentSourcing: false, noteKo: 'n', evidenceGrade: 'A' });
    expect(s.evidence).toEqual([{ claim: 'c', source: 'src', url: 'https://x', grade: 'A', date: '2026' }]);
    expect(s.externalVendors[0]).toMatchObject({ vendor: 'Hyundai Mobis', level: 'module' });
  });

  it('mixed with only component-level vendors is in_house + componentSourcing', () => {
    const s = resolveSourcing(srow({ sourcing: 'mixed', externalVendors: [{ vendor: 'maxon', level: 'component' }] }), [], 'Rainbow Robotics');
    expect(s).toMatchObject({ posture: 'in_house', kind: 'mixed', componentSourcing: true });
  });

  it('unknown kind strings degrade to unknown', () => {
    expect(resolveSourcing(srow({ sourcing: 'weird' }), [], 'X')).toMatchObject({ kind: 'unknown', posture: 'unknown' });
  });

  it('fallback (no row): explicit external vendor => external/derived', () => {
    const s = resolveSourcing(null, [act({ inHouse: false, vendor: 'Hyundai Mobis', confidence: 'C', source: 'ci' })], 'Boston Dynamics');
    expect(s).toMatchObject({ posture: 'external', kind: 'external', basis: 'derived', sellsExternally: null, evidence: [] });
    expect(s.externalVendors).toEqual([{ vendor: 'Hyundai Mobis', role: null, grade: 'C', url: null, level: 'module' }]);
  });

  it('fallback: only in-house actuators, no actuators, or unknown vendor => unknown (never in_house)', () => {
    expect(resolveSourcing(null, [act()], 'Tesla')).toMatchObject({ posture: 'unknown', kind: 'unknown', basis: 'derived' });
    expect(resolveSourcing(null, [], 'Tesla')).toMatchObject({ posture: 'unknown', basis: 'derived' });
    expect(resolveSourcing(null, [act({ inHouse: false, vendor: null })], 'Tesla').posture).toBe('unknown');
    expect(resolveSourcing(null, [act({ inHouse: false, vendor: '(공급사 미상)' })], 'Tesla').posture).toBe('unknown');
  });
});

describe('assembleRobot with sourcing', () => {
  const row = {
    id: 'r1', name: 'Atlas (Electric)', companyId: 'c1', companyName: 'Boston Dynamics', companyCountry: 'USA', region: 'north_america',
    locomotionType: 'bipedal', commercializationStage: 'pilot', announcementYear: 2024, dataType: 'confirmed', description: null,
    heightCm: '150', weightKg: '90', payloadKg: null, dofCount: 28, maxSpeedMps: '2', handDof: 11,
  };
  it('4th argument is optional (derived fallback) and applied when given', () => {
    const a = assembleRobot(row, [], null);
    expect(a.sourcing).toMatchObject({ posture: 'unknown', basis: 'derived' });
    const b = assembleRobot(row, [], null, srow({ sourcing: 'mixed', externalVendors: [{ vendor: 'Hyundai Mobis', level: 'module' }] }));
    expect(b.sourcing).toMatchObject({ posture: 'external', basis: 'regrade' });
    expect(b.sources).toContain('actuator_sourcing');
    expect(a.sources).not.toContain('actuator_sourcing');
  });
});

describe('buildEdges (basis / externalVendors)', () => {
  const mk = (id: string, company: string, sourcing: ReturnType<typeof resolveSourcing>, actuators: RobotActuator[]): ActuatorMapRobot =>
    ({ id, name: `${company} bot`, company, actuators, sourcing, forecast: false } as unknown as ActuatorMapRobot);

  it('self edge is self for regraded in-house robots and unverified when posture is unknown', () => {
    const known = mk('r1', 'Tesla', resolveSourcing(srow(), [], 'Tesla'), [act()]);
    const unknown = mk('r2', 'Tesla', resolveSourcing(null, [act()], 'Tesla'), [act()]);
    expect(buildEdges([known])[0]).toMatchObject({ basis: 'self', posture: 'in_house', inHouse: true, role: null, level: 'module' });
    expect(buildEdges([unknown])[0]).toMatchObject({ basis: 'unverified', posture: 'unknown', inHouse: true });
  });

  it('external actuator edge is external', () => {
    const r = mk('r1', 'Boston Dynamics', resolveSourcing(null, [act({ inHouse: false, vendor: 'Hyundai Mobis' })], 'Boston Dynamics'), [act({ inHouse: false, vendor: 'Hyundai Mobis' })]);
    expect(buildEdges([r])).toEqual([expect.objectContaining({ vendor: 'Hyundai Mobis', basis: 'external', posture: 'external', inHouse: false })]);
  });

  it('adds sourcing.externalVendors missing from the edges (quantity 1, grade fallback B, type from same-vendor product)', () => {
    const s = resolveSourcing(
      srow({ sourcing: 'mixed', externalVendors: [{ vendor: 'Hyundai Mobis', role: 'mass-production supply', grade: null, url: null, level: 'module' }] }),
      [], 'Boston Dynamics'
    );
    const r = mk('r1', 'Boston Dynamics', s, []);
    const withType = buildEdges([r], [{ vendor: 'Hyundai Mobis', type: '직구동/QDD' }]);
    expect(withType).toEqual([
      expect.objectContaining({ vendor: 'Hyundai Mobis', quantity: 1, confidence: 'B', type: '직구동/QDD', role: 'mass-production supply', basis: 'external', level: 'module', inHouse: false }),
    ]);
    expect(buildEdges([r])[0]!.type).toBe('미확인');
    expect(buildEdges([r], [{ vendor: 'Hyundai Mobis', type: '모터·기어박스(BLDC)' }])[0]!.type).toBe('미확인'); // 라벨 집합 밖 타입은 쓰지 않음
  });

  it('does not duplicate a vendor already present as an edge (sameVendor) and fills role/level', () => {
    const actuators = [act({ inHouse: false, vendor: 'Mobis', quantity: 3, confidence: 'C' })];
    const s = resolveSourcing(
      srow({ sourcing: 'mixed', externalVendors: [{ vendor: 'Hyundai Mobis', role: 'supply', grade: 'A', url: null, level: 'module' }] }),
      actuators, 'Boston Dynamics'
    );
    const edges = buildEdges([mk('r1', 'Boston Dynamics', s, actuators)]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ vendor: 'Mobis', quantity: 3, role: 'supply', confidence: 'C' });
  });

  it('component-level vendor edges carry level component while the robot posture stays in_house', () => {
    const s = resolveSourcing(srow({ sourcing: 'mixed', externalVendors: [{ vendor: 'maxon', role: 'component supply', grade: 'A', url: null, level: 'component' }] }), [], 'Rainbow Robotics');
    const edges = buildEdges([mk('r1', 'Rainbow Robotics', s, [])]);
    expect(edges[0]).toMatchObject({ vendor: 'maxon', level: 'component', posture: 'in_house', basis: 'external' });
  });
});

describe('computeSourcingStats', () => {
  const r = (over: Partial<ReturnType<typeof resolveSourcing>>, forecast = false) =>
    ({ forecast, sourcing: { ...resolveSourcing(null, [], 'X'), ...over } }) as Pick<ActuatorMapRobot, 'forecast' | 'sourcing'>;
  it('counts postures, subsets, bases and excludes forecast robots', () => {
    const robots = [
      r({ posture: 'in_house', kind: 'in_house_confirmed', basis: 'regrade' }),
      r({ posture: 'in_house_sells', kind: 'in_house_confirmed', basis: 'regrade' }),
      r({ posture: 'in_house', kind: 'mixed', basis: 'regrade', componentSourcing: true }),
      r({ posture: 'external', kind: 'mixed', basis: 'regrade' }),
      r({ posture: 'external', kind: 'external', basis: 'regrade' }),
      r({ posture: 'unknown', kind: 'in_house_presumed', basis: 'regrade' }),
      r({ posture: 'unknown', kind: 'unknown', basis: 'derived' }),
      r({ posture: 'external', kind: 'external', basis: 'derived' }, true),
    ];
    expect(computeSourcingStats(robots)).toEqual({
      robots: 7, inHouse: 2, inHouseSells: 1, external: 2, externalMixed: 1, unknown: 2, unknownPresumed: 1,
      regraded: 6, derived: 1, componentSourcing: 1,
    });
  });
  it('4 buckets sum to robots', () => {
    const s = computeSourcingStats([r({ posture: 'in_house' }), r({}), r({ posture: 'external' })]);
    expect(s.inHouse + s.inHouseSells + s.external + s.unknown).toBe(s.robots);
    expect(computeSourcingStats([])).toMatchObject({ robots: 0, componentSourcing: 0 });
  });
});

describe('classifyMarketSegments', () => {
  const FIXTURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/seed-data/actuator-update');
  const suppliers = (JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'suppliers.json'), 'utf-8')) as { products: { vendor: string; model: string; targetMarket: string | null }[] }).products;
  const vendorMarkets = validateAdoptionsFile(JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'demand-cases.json'), 'utf-8'))).file!.vendorTargetMarkets.map((v) => ({
    ...v, vendorKey: vendorKey(v.vendor),
  }));
  const adoptionList = validateAdoptionsFile(JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'demand-cases.json'), 'utf-8'))).file!.cases.map((c, i) => ({
    id: `case-${i}`, actuatorVendor: c.actuatorVendor, actuatorModel: c.actuatorModel, marketSegment: marketSegmentOfAdoption(c.segment),
  }));
  const classifyProduct = (p: { vendor: string; model: string; targetMarket: string | null }) => {
    const ids = matchAdoptionIds(p, adoptionList);
    const votes: AdoptionSegmentVote[] = adoptionList
      .filter((c) => ids.includes(c.id))
      .map((c) => ({ marketSegment: c.marketSegment, modelSpecific: !isVendorLevelModel(c.actuatorModel) }));
    return classifyMarketSegments(p, findVendorMarket(vendorMarkets, p.vendor), votes);
  };
  const classify = (vendor: string, modelPart: string) => {
    const p = suppliers.find((s) => s.vendor === vendor && s.model.includes(modelPart))!;
    expect(p).toBeTruthy();
    return classifyProduct(p);
  };

  it('classifies the representative seed products', () => {
    expect(classify('Harmonic Drive', 'CSD-20-100').segment).toBe('industrial_cobot');
    expect(classify('Harmonic Drive', 'SHA20A-50CG').segment).toBe('industrial_cobot');
    expect(classify('Nabtesco', 'RV-100C').segment).toBe('industrial_cobot');
    expect(classify('Xiaomi', 'CyberGear').segment).toBe('research_edu');
    expect(classify('Tesla', 'rotary').segment).toBe('captive');
    expect(classify('Unitree', 'M107').segment).toBe('captive');
    expect(classify('Kepler Robotics', 'rotary').segment).toBe('captive');
    // 키워드(mass production) 적중 + 벤더 수준 사례(모델 미상)가 동점 타이브레이커
    expect(classify('Hyundai Mobis', 'Humanoid body')).toMatchObject({ segment: 'tier1_oem', basis: 'keywords' });
    // 키워드 4자 동점 → 벤더 수준 사례(EXO PRO, 모델 미상 외골격)로 service
    expect(classify('maxon', 'IDX 56').segment).toBe('service');
    // 모델 특정 사례
    expect(classify('CubeMars (T-Motor)', 'AK80-9')).toMatchObject({ segment: 'service', basis: 'adoptions' });
    expect(classify('MyActuator (ex-Gyems)', 'RMD-X6-40')).toMatchObject({ segment: 'research_edu', basis: 'adoptions' });
    expect(classify('CubeMars (T-Motor)', 'AK10-9').basis).toBe('keywords'); // 모델 특정 사례 없음
    // RobStride: 모델 특정 사례 없음 → 키워드. 키워드 우세(humanoid/legged 2건)면 tier2_legged, 4자 동점(RS-04)이면 벤더 수준 사례 최빈값(research_edu)
    expect(classify('RobStride Dynamics', 'RS-00')).toMatchObject({ segment: 'tier2_legged', basis: 'keywords' });
    expect(classify('RobStride Dynamics', 'RS-04')).toMatchObject({ segment: 'research_edu', basis: 'keywords' });
    expect(classify('RobStride Dynamics', 'RS-05').segment).toBe('research_edu');
    expect(classify('LG Electronics', 'AXIUM')).toEqual({ segment: 'service', segments: ['service', 'industrial_cobot'], basis: 'override' });
  });

  it('every one of the 44 seed products gets a representative segment that is in its segments', () => {
    expect(suppliers).toHaveLength(44);
    for (const p of suppliers) {
      const c = classifyProduct(p);
      expect(MARKET_SEGMENT_ORDER).toContain(c.segment);
      expect(c.segments[0], `${p.vendor} ${p.model}`).toBe(c.segment);
      expect(new Set(c.segments).size).toBe(c.segments.length);
    }
  });

  it('override (when configured) wins over vendor segments, adoptions and keywords', () => {
    expect(SEGMENT_OVERRIDES.map((o) => o.pattern.source)).toEqual(['lg electronics.*axium']); // 초기값
    SEGMENT_OVERRIDES.push({ pattern: /acme corp/i, segments: ['captive', 'service'] });
    try {
      const c = classifyMarketSegments({ vendor: 'Acme Corp', model: 'X', targetMarket: 'research humanoid' }, { segments: ['research_edu'], targetMarketsKo: ['연구'] }, ['tier1_oem']);
      expect(c).toEqual({ segment: 'captive', segments: ['captive', 'service'], basis: 'override' });
    } finally {
      SEGMENT_OVERRIDES.pop();
    }
  });

  it('vendorMarket.segments wins over keywords and the (in-house) rule', () => {
    const c = classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'research (in-house)' }, { segments: ['tier2_legged', 'service'], targetMarketsKo: [] });
    expect(c).toEqual({ segment: 'tier2_legged', segments: ['tier2_legged', 'service'], basis: 'vendor_segments' });
  });

  const spec = (marketSegment: AdoptionSegmentVote['marketSegment']): AdoptionSegmentVote => ({ marketSegment, modelSpecific: true });
  const vend = (marketSegment: AdoptionSegmentVote['marketSegment']): AdoptionSegmentVote => ({ marketSegment, modelSpecific: false });

  it('model-specific adoptions: most frequent market segment is the representative (basis adoptions)', () => {
    const p = { vendor: 'V', model: 'M', targetMarket: 'humanoid' };
    expect(classifyMarketSegments(p, null, [spec('service'), spec('service'), spec('research_edu')])).toMatchObject({ segment: 'service', basis: 'adoptions' });
    // 동점이면 우선순위: tier1_oem > tier2_legged > research_edu > industrial_cobot > service
    expect(classifyMarketSegments(p, null, [spec('service'), spec('research_edu')]).segment).toBe('research_edu');
    expect(classifyMarketSegments(p, null, [spec('industrial_cobot'), spec('tier2_legged')]).segment).toBe('tier2_legged');
    expect(classifyMarketSegments(p, null, [spec('service'), spec('tier1_oem')]).segment).toBe('tier1_oem');
  });

  it('vendor-level adoptions never decide the representative on their own; they only break keyword ties', () => {
    const noHit = { vendor: 'V', model: 'M', targetMarket: 'humanoid' };
    expect(classifyMarketSegments(noHit, null, [vend('service'), vend('service')])).toMatchObject({ segment: 'tier2_legged', basis: 'keywords' });
    // 키워드 동점(research 1, service 1) → 벤더 수준 최빈값
    const tie = { vendor: 'V', model: 'M', targetMarket: 'research, home' };
    expect(classifyMarketSegments(tie, null, [])).toMatchObject({ segment: 'research_edu' });
    expect(classifyMarketSegments(tie, null, [vend('service')])).toMatchObject({ segment: 'service', segments: ['service', 'research_edu'], basis: 'keywords' });
    // 벤더 수준 사례도 동점이면 §6.5 우선순위
    expect(classifyMarketSegments(tie, null, [vend('service'), vend('research_edu')]).segment).toBe('research_edu');
    // 동점 후보에 없는 세그먼트의 벤더 수준 사례는 무시
    expect(classifyMarketSegments(tie, null, [vend('tier1_oem'), vend('tier1_oem')]).segment).toBe('research_edu');
    // 키워드 우세(2건)는 벤더 수준 사례로 뒤집히지 않는다
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'humanoid legged, home' }, null, [vend('service'), vend('service')]).segment).toBe('tier2_legged');
  });

  it('model-specific adoptions beat vendor-level ones and keywords; representative first, rest in priority order', () => {
    const c = classifyMarketSegments(
      { vendor: 'V', model: 'M', targetMarket: 'research, industrial, medical' }, null,
      [spec('service'), spec('service'), spec('research_edu'), vend('industrial_cobot'), vend('industrial_cobot'), vend('industrial_cobot')]
    );
    expect(c).toMatchObject({ segment: 'service', basis: 'adoptions' });
    expect(c.segments).toEqual(['service', 'research_edu', 'industrial_cobot']);
  });

  it('priority: vendor segments > (in-house) captive > model-specific adoptions > keywords', () => {
    const adopt = [spec('service')];
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'x (in-house)' }, { segments: ['research_edu'] }, adopt).basis).toBe('vendor_segments');
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'x humanoid (in-house)' }, null, adopt)).toEqual({ segment: 'captive', segments: ['captive'], basis: 'keywords' });
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'x humanoid' }, null, adopt).basis).toBe('adoptions');
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'x humanoid' }, null, []).basis).toBe('keywords');
  });

  it('tier1_oem keywords: tier-1 / 1군 / mass production / contract manufacturing / 위탁 제조 (bare 양산·위탁 do not match)', () => {
    for (const tm of ['tier-1 oem', '1군 세트사', 'mass production from 2027', 'contract manufacturing', '위탁 제조']) {
      expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: tm }, null).segment, tm).toBe('tier1_oem');
    }
    for (const tm of ['2026 양산', '위탁 생산', '양산 공급']) {
      expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: tm }, null).segment, tm).toBe('other');
    }
  });

  it('LG AXIUM override is service-first and matches the exact vendor/model text only', () => {
    expect(classifyMarketSegments({ vendor: 'LG Electronics', model: 'AXIUM actuator platform', targetMarket: 'home' }, null)).toMatchObject({ segment: 'service', basis: 'override' });
    expect(classifyMarketSegments({ vendor: 'LG Electronics', model: 'Other actuator', targetMarket: 'industrial' }, null).basis).toBe('keywords');
  });

  it('isVendorLevelModel: null/blank and series/시리즈/세트/등 are vendor-level; concrete models are not', () => {
    for (const m of [null, undefined, '', 'RobStride series (1.5~120N·m)', 'AK series', '모터 시리즈', 'RobStride 02/04 등 세트', 'DC 모터 등']) expect(isVendorLevelModel(m), String(m)).toBe(true);
    for (const m of ['AK80-9', 'RMD-X6-40', 'RS-04', 'EC-4pole brushless ×33']) expect(isVendorLevelModel(m), m).toBe(false);
  });

  it('(in-house) suffix => captive; not at the end => keywords', () => {
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'Foo humanoid (In-House) ' }, null).segment).toBe('captive');
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: 'Foo (in-house) humanoid' }, null).segment).toBe('tier2_legged');
  });

  it('highest hit count wins, ties go to tier1_oem > tier2_legged > research_edu > industrial_cobot > service; none => other', () => {
    const base = { vendor: 'V', model: 'M' };
    expect(classifyMarketSegments({ ...base, targetMarket: 'industrial cobot arm' }, null).segment).toBe('industrial_cobot');
    expect(classifyMarketSegments({ ...base, targetMarket: 'research, home' }, null)).toMatchObject({ segment: 'research_edu', segments: ['research_edu', 'service'] });
    expect(classifyMarketSegments({ ...base, targetMarket: 'home delivery, medical, research' }, null).segment).toBe('service'); // service 2 > research 1
    expect(classifyMarketSegments({ ...base, targetMarket: 'tier-1 oem, industrial' }, null).segment).toBe('tier1_oem');
    expect(classifyMarketSegments({ ...base, targetMarket: 'warehouse' }, null)).toMatchObject({ segment: 'service' });
    expect(classifyMarketSegments({ ...base, targetMarket: 'general purpose' }, null)).toEqual({ segment: 'other', segments: ['other'], basis: 'none' });
    expect(classifyMarketSegments({ ...base, targetMarket: null }, null).segment).toBe('other');
  });

  it('uses vendor targetMarketsKo text too', () => {
    expect(classifyMarketSegments({ vendor: 'V', model: 'M', targetMarket: null }, { targetMarketsKo: ['휴머노이드 관절', '사족 로봇'] }).segment).toBe('tier2_legged');
  });

  it('segmentOrder constant matches the spec order', () => {
    expect(MARKET_SEGMENT_ORDER).toEqual(['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other']);
  });
});

describe('demand case mapping and linking', () => {
  it('maps adoption segments to market segments', () => {
    expect(marketSegmentOfAdoption('humanoid_tier1')).toBe('tier1_oem');
    expect(marketSegmentOfAdoption('humanoid_tier2')).toBe('tier2_legged');
    expect(marketSegmentOfAdoption('quadruped')).toBe('tier2_legged');
    expect(marketSegmentOfAdoption('research_platform')).toBe('research_edu');
    expect(marketSegmentOfAdoption('robot_arm')).toBe('industrial_cobot');
    expect(marketSegmentOfAdoption('industrial')).toBe('industrial_cobot');
    expect(marketSegmentOfAdoption('service_robot')).toBe('service');
    expect(marketSegmentOfAdoption('exoskeleton')).toBe('service');
  });

  it('adoptionRowToCase assembles level, marketSegment, vendorKey and source titles', () => {
    const c = adoptionRowToCase({
      id: 'id1', caseKey: 'k', robotName: 'Atlas', company: 'Boston Dynamics', country: 'US', segment: 'humanoid_tier1', level: 'component',
      robotClass: null, actuatorVendor: 'Hyundai Mobis', actuatorModel: null, usageText: 'all', evidenceGrade: 'A',
      sources: [{ url: 'https://a', title: 'T', date: '2026' }], noteKo: null, adoptedYear: 2026, updatedAt: new Date(),
    });
    expect(c).toMatchObject({
      id: 'id1', marketSegment: 'tier1_oem', level: 'component', vendorKey: vendorKey('Hyundai Mobis'), usage: 'all', year: 2026,
      sources: [{ url: 'https://a', title: 'T' }],
    });
  });

  it('vendorMarketRowToModel keeps valid segments only', () => {
    const m = vendorMarketRowToModel({ vendorKey: 'k', vendor: 'V', targetMarketsKo: ['a'], segments: ['captive', 'moon'], grade: 'B', url: null, updatedAt: new Date() });
    expect(m.segments).toEqual(['captive']);
    expect(vendorMarketRowToModel({ vendorKey: 'k', vendor: 'V', targetMarketsKo: [], segments: null, grade: null, url: null, updatedAt: new Date() }).segments).toBeNull();
  });

  it('matchAdoptionIds: same vendor and (model unknown or matching); unknown model attaches to every product', () => {
    const cases = [
      { id: 'a', actuatorVendor: 'RobStride Dynamics', actuatorModel: null },
      { id: 'b', actuatorVendor: 'RobStride', actuatorModel: 'RS-04' },
      { id: 'c', actuatorVendor: 'Hyundai Mobis', actuatorModel: 'humanoid actuators (CES 2026)' },
      { id: 'd', actuatorVendor: 'CubeMars (T-Motor)', actuatorModel: 'AK80-9' },
    ];
    expect(matchAdoptionIds({ vendor: 'RobStride Dynamics', model: 'RobStride 04 (RS-04)' }, cases)).toEqual(['a', 'b']);
    expect(matchAdoptionIds({ vendor: 'RobStride Dynamics', model: 'RobStride 05 (RS-05)' }, cases)).toEqual(['a']);
    expect(matchAdoptionIds({ vendor: 'Hyundai Mobis', model: 'Humanoid body actuator' }, cases)).toEqual([]);
    expect(matchAdoptionIds({ vendor: 'CubeMars (T-Motor)', model: 'AK80-9 V3.0 KV100' }, cases)).toEqual(['d']);
    expect(matchAdoptionIds({ vendor: 'CubeMars (T-Motor)', model: 'AK80-64 KV80' }, cases)).toEqual([]);
    expect(matchAdoptionIds({ vendor: 'maxon', model: 'x' }, cases)).toEqual([]);
    // series/시리즈/세트/등 같은 벤더 수준 모델 문자열도 그 공급사 모든 제품에 붙는다
    const withSeries = [...cases, { id: 'e', actuatorVendor: 'CubeMars', actuatorModel: 'AK series' }, { id: 'f', actuatorVendor: 'RobStride', actuatorModel: 'RobStride 02/04 등 세트' }];
    expect(matchAdoptionIds({ vendor: 'CubeMars (T-Motor)', model: 'AK10-9' }, withSeries)).toEqual(['e']);
    expect(matchAdoptionIds({ vendor: 'RobStride Dynamics', model: 'RobStride 05 (RS-05)' }, withSeries)).toEqual(['a', 'f']);
  });

  it('enrichSupplierProduct attaches segment info and adoption ids', () => {
    const base = {
      vendor: 'Unitree', country: 'China', model: 'GO-M8010-6', type: '직구동/QDD', peakTorqueNm: 23.7, continuousTorqueNm: null, weightKg: null,
      diameterMm: 96.5, priceUsd: 369, status: 'available', targetMarket: 'quadruped robots (Go1), research', source: 'products' as const,
      diameterRangeMm: null, integrationLevel: 'fully_integrated', isLG: false,
    };
    const p = enrichSupplierProduct(base, [], [{ id: 'x', actuatorVendor: 'Unitree Robotics', actuatorModel: 'GO-M8010-6', marketSegment: 'service' }]);
    expect(p).toMatchObject({ segment: 'service', segmentBasis: 'adoptions', adoptionIds: ['x'], isLG: false });
    expect(p.segments).toEqual(['service', 'tier2_legged', 'research_edu']);
    // 모델 미상 사례: adoptionIds 에는 들어가지만 대표는 키워드(타이브레이커로만 사용)
    const vendorLevel = enrichSupplierProduct(base, [], [{ id: 'y', actuatorVendor: 'Unitree', actuatorModel: null, marketSegment: 'service' }]);
    expect(vendorLevel).toMatchObject({ segmentBasis: 'keywords', adoptionIds: ['y'] });
    const none = enrichSupplierProduct(base, [], []);
    expect(none).toMatchObject({ segment: 'tier2_legged', segmentBasis: 'keywords', adoptionIds: [] });
    expect(none.segments[0]).toBe(none.segment);
  });
});

describe('parseDiameterRange', () => {
  it('parses ranges in several notations', () => {
    expect(parseDiameterRange('40-120')).toEqual({ min: 40, max: 120 });
    expect(parseDiameterRange('Φ40–Φ120')).toEqual({ min: 40, max: 120 });
    expect(parseDiameterRange('120~40')).toEqual({ min: 40, max: 120 });
    expect(parseDiameterRange('52')).toEqual({ min: 52, max: 52 });
    expect(parseDiameterRange('96.5 - 98')).toEqual({ min: 96.5, max: 98 });
  });
  it('returns null for missing or non-numeric input', () => {
    expect(parseDiameterRange(null)).toBeNull();
    expect(parseDiameterRange(undefined)).toBeNull();
    expect(parseDiameterRange('n/a')).toBeNull();
    expect(parseDiameterRange(40)).toBeNull();
    expect(parseDiameterRange('')).toBeNull();
  });
});

describe('vendor helpers re-exported from the service', () => {
  it('are the same functions the apply script uses', () => {
    expect(sameVendor('Mobis', 'Hyundai Mobis')).toBe(true);
    expect(sameVendor('maxon', 'Mobis')).toBe(false);
    expect(modelMatches('RS-04', 'RobStride 04 (RS-04)')).toBe(true);
  });
});

describe('dedupeLooseComponents', () => {
  const products = [
    { vendor: 'Harmonic Drive', model: 'CSD-20-100-2A-GR' },
    { vendor: 'RobStride Dynamics', model: 'RobStride 04 (RS-04)' },
    { vendor: 'AgiBot (Zhiyuan Robotics)', model: 'PowerFlow R52' },
  ];
  it('drops components that duplicate a supplier product and keeps unrelated ones', () => {
    const loose = [
      { vendor: 'Harmonic Drive', model: 'Harmonic Drive CSD-20-100-2A-GR' },
      { vendor: 'RobStride Dynamics', model: 'RobStride 04 (RS-04)' },
      { vendor: 'AgiBot', model: 'AgiBot PowerFlow R52' },
      { vendor: 'Harmonic Drive', model: 'FHA-17C' }, // 다른 제품
      { vendor: 'maxon', model: 'CSD-20-100-2A-GR' }, // 다른 공급사
    ];
    expect(dedupeLooseComponents(products, loose).map((c) => c.model)).toEqual(['FHA-17C', 'CSD-20-100-2A-GR']);
    expect(dedupeLooseComponents([], loose)).toHaveLength(5);
  });
});
