import { describe, it, expect } from 'vitest';
import {
  ACTUATOR_TYPE_LABELS,
  DIFFICULTY_DEFAULT,
  assembleRobot,
  buildEdges,
  classifyActuatorText,
  computeDifficulty,
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
