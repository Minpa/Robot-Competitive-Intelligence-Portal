/** 테스트 전용 픽스처 — suppliers.json / robots.json / sourcing-regrade.json 시드 형태를 ActuatorMapResponse 로 옮긴 것 */
import fs from 'node:fs';
import path from 'node:path';
import type {
  ActuatorAdoptionCase,
  ActuatorMapResponse,
  ActuatorMapRobot,
  ActuatorSupplierProduct,
  AdoptionSegment,
  MarketSegment,
  RobotActuator,
  RobotSourcing,
  SourcingKind,
  SourcingPosture,
  SourcingStats,
} from '@/types/actuator-map';
import { SEGMENT_ORDER } from './actuator-sourcing';

export function act(vendor: string | null, inHouse: boolean, over: Partial<RobotActuator> = {}): RobotActuator {
  return {
    name: 'actuator',
    vendor,
    inHouse,
    type: '미확인',
    torqueNm: null,
    weightKg: null,
    quantity: 1,
    usageLocation: null,
    source: 'components',
    confidence: 'B',
    ...over,
  };
}

const KIND_OF: Record<SourcingPosture, SourcingKind> = {
  in_house: 'in_house_confirmed',
  in_house_sells: 'in_house_confirmed',
  external: 'external',
  unknown: 'unknown',
};

/** 조달 태세별 기본 RobotSourcing (자체 확인 계열은 B 등급 regrade, unknown 은 derived) */
export function sourcing(posture: SourcingPosture, over: Partial<RobotSourcing> = {}): RobotSourcing {
  const confirmed = posture === 'in_house' || posture === 'in_house_sells';
  return {
    posture,
    kind: KIND_OF[posture],
    sellsExternally: posture === 'in_house_sells' ? true : posture === 'in_house' ? false : null,
    evidenceGrade: confirmed ? 'B' : posture === 'external' ? 'B' : null,
    evidence: [],
    externalVendors: [],
    noteKo: null,
    basis: posture === 'unknown' ? 'derived' : 'regrade',
    componentSourcing: false,
    ...over,
  };
}

/** robot() 의 over 인자에 펼쳐 쓰는 조달 태세 헬퍼: robot('a','A',[], posture('external', { kind: 'mixed' })) */
export function posture(p: SourcingPosture, over: Partial<RobotSourcing> = {}): Partial<ActuatorMapRobot> {
  return { sourcing: sourcing(p, over) };
}

export function robot(name: string, company: string, actuators: RobotActuator[], over: Partial<ActuatorMapRobot> = {}): ActuatorMapRobot {
  return {
    id: `${company}-${name}`,
    name,
    company,
    companyId: `c-${company}`,
    region: 'other',
    locomotion: 'bipedal',
    stage: null,
    year: null,
    forecast: false,
    isLG: false,
    height: null,
    weight: null,
    payload: null,
    dof: null,
    handDof: null,
    speed: null,
    incomplete: false,
    actuators,
    actuatorTypeLabel: '미확인',
    actuatorTypeNote: '',
    price: null,
    sources: ['humanoid_robots'],
    sourcing: sourcing('unknown'),
    ...over,
  };
}

export function sp(vendor: string, model: string, over: Partial<ActuatorSupplierProduct> = {}): ActuatorSupplierProduct {
  return {
    vendor,
    country: null,
    model,
    type: '미확인',
    peakTorqueNm: null,
    continuousTorqueNm: null,
    weightKg: null,
    diameterMm: null,
    priceUsd: null,
    status: 'available',
    targetMarket: null,
    source: 'products',
    diameterRangeMm: null,
    integrationLevel: null,
    isLG: false,
    segment: 'other',
    segments: ['other'],
    segmentBasis: 'none',
    adoptionIds: [],
    ...over,
  };
}

export function adoption(over: Partial<ActuatorAdoptionCase> = {}): ActuatorAdoptionCase {
  return {
    id: 'ad-1',
    robotName: 'Robo',
    company: 'Co',
    country: 'US',
    segment: 'humanoid_tier2',
    marketSegment: 'tier2_legged',
    level: 'module',
    robotClass: 'humanoid',
    actuatorVendor: 'RobStride Dynamics',
    vendorKey: 'robstride',
    actuatorModel: null,
    usage: 'legs',
    evidenceGrade: 'B',
    sources: [{ url: 'https://example.com/a', title: 'source' }],
    noteKo: null,
    year: 2025,
    ...over,
  };
}

const zeroStats = (robots: ActuatorMapRobot[]): SourcingStats => {
  const st: SourcingStats = { robots: 0, inHouse: 0, inHouseSells: 0, external: 0, externalMixed: 0, unknown: 0, unknownPresumed: 0, componentSourcing: 0, regraded: 0, derived: 0 };
  for (const r of robots) {
    if (r.forecast) continue;
    st.robots++;
    const p = r.sourcing?.posture ?? 'unknown';
    if (p === 'in_house') st.inHouse++;
    else if (p === 'in_house_sells') st.inHouseSells++;
    else if (p === 'external') {
      st.external++;
      if (r.sourcing?.kind === 'mixed') st.externalMixed++;
    } else {
      st.unknown++;
      if (r.sourcing?.kind === 'in_house_presumed') st.unknownPresumed++;
    }
    if (r.sourcing?.componentSourcing) st.componentSourcing++;
    if (r.sourcing?.basis === 'regrade') st.regraded++;
    else st.derived++;
  }
  return st;
};

export function response(
  robots: ActuatorMapRobot[],
  suppliers: ActuatorSupplierProduct[],
  over: Partial<ActuatorMapResponse> = {}
): ActuatorMapResponse {
  const adoptions = over.adoptions ?? [];
  return {
    generatedAt: '2026-10-25T03:04:00.000Z',
    cached: false,
    difficultyDefault: { L: 1, D: 1, H: 1, S: 1 },
    typeOrder: [],
    robots,
    suppliers,
    edges: [],
    stats: { robots: robots.length, complete: robots.length, incomplete: 0, suppliers: suppliers.length, edges: 0, adoptions: adoptions.length },
    schemaVersion: 2,
    adoptions,
    vendorMarkets: [],
    sourcingStats: zeroStats(robots),
    segmentOrder: [...SEGMENT_ORDER],
    ...over,
  };
}

// ── 시드 데이터 파일 (존재하는 쪽을 읽고, 둘 다 없으면 null) ─────────────────────

const BACKEND_SEED_DIR = path.resolve(__dirname, '../../../../../backend/src/db/seed-data/actuator-update');

/** 백엔드 시드 JSON(packages/backend/src/db/seed-data/actuator-update)만 읽는다. 없으면 null — 호출한 테스트는 skip. */
export function readSeedJson<T = unknown>(name: string): T | null {
  const f = path.join(BACKEND_SEED_DIR, name);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null;
}

// ── 세그먼트 분류 (명세 6.5 키워드 규칙의 테스트용 복제 — 실제 값은 API 가 결정) ───────────

const RULES: { seg: MarketSegment; res: RegExp[] }[] = [
  { seg: 'tier2_legged', res: [/humanoid|휴머노이드/, /legged|quadruped|biped|보행|사족|이족/] },
  { seg: 'research_edu', res: [/research|연구|academ|\blab\b/, /education|educational|교육|maker|메이커|student|formula student/] },
  {
    seg: 'industrial_cobot',
    res: [/industrial|산업|manufactur|제조/, /cobot|collaborative|협동|robot arm|로봇 ?암|arm joints|positioner|machine tool|공작|semiconductor|반도체/],
  },
  {
    seg: 'service',
    res: [/service|서비스|delivery|배송|home|household|가정|logistics|물류|warehouse|창고/, /agv|amr|medical|healthcare|의료|prosthetic|exoskeleton|외골격/],
  },
];

export function classifyForTest(p: ActuatorSupplierProduct): ActuatorSupplierProduct {
  let segments: MarketSegment[];
  let basis: ActuatorSupplierProduct['segmentBasis'] = 'keywords';
  const tm = p.targetMarket ?? '';
  if (/hyundai mobis/i.test(`${p.vendor} ${p.model}`)) {
    segments = ['captive'];
    basis = 'override';
  } else if (/\(in-house\)\s*$/i.test(tm)) segments = ['captive'];
  else {
    const low = tm.toLowerCase();
    const hits = RULES.map((r) => ({ seg: r.seg, n: r.res.filter((re) => re.test(low)).length })).filter((h) => h.n > 0);
    hits.sort((a, b) => b.n - a.n);
    segments = hits.length ? hits.map((h) => h.seg) : ['other'];
    if (!hits.length) basis = 'none';
  }
  return { ...p, segment: segments[0]!, segments, segmentBasis: basis };
}

/**
 * 백엔드 최종 세그먼트 확정값(시드 44건)의 테스트용 복제 — 실제 값은 API 가 결정한다.
 *  LG AXIUM = override service(+industrial_cobot) / Hyundai Mobis = tier1_oem / maxon·CubeMars AK80-9 = service /
 *  RS-04·RS-05·X6-40·GO-M8010-6·CyberGear = research_edu / 그 외 RobStride·MyActuator·CubeMars·AgiBot·Fourier·FAULHABER = tier2_legged /
 *  Harmonic Drive·Nabtesco = industrial_cobot / Tesla·Kepler·Unitree M107 = captive. 분포 21/7/5/5/5/1.
 */
export function finalSegmentsForTest(p: ActuatorSupplierProduct): ActuatorSupplierProduct {
  const v = p.vendor.toLowerCase();
  const m = p.model;
  const set = (segments: MarketSegment[], basis: ActuatorSupplierProduct['segmentBasis'] = 'keywords') => ({ ...p, segment: segments[0]!, segments, segmentBasis: basis });
  if (p.isLG || v.startsWith('lg')) return set(['service', 'industrial_cobot'], 'override');
  if (v.includes('mobis')) return set(['tier1_oem']);
  if (v === 'maxon') return set(['service']);
  if (v.startsWith('cubemars')) return set([/AK80-9\b/.test(m) ? 'service' : 'tier2_legged']);
  if (v.startsWith('robstride')) return set([/RS-0[45]\b/.test(m) ? 'research_edu' : 'tier2_legged']);
  if (v.startsWith('myactuator')) return set([/X6-40/.test(m) ? 'research_edu' : 'tier2_legged']);
  if (v.startsWith('unitree')) return set([/M107/.test(m) ? 'captive' : 'research_edu']);
  if (v.startsWith('xiaomi')) return set(['research_edu']);
  if (v.startsWith('agibot') || v.startsWith('fourier') || v.startsWith('faulhaber')) return set(['tier2_legged']);
  if (v.startsWith('harmonic') || v.startsWith('nabtesco')) return set(['industrial_cobot']);
  if (v.startsWith('tesla') || v.startsWith('kepler')) return set(['captive']);
  return classifyForTest(p);
}

const QDD = '직구동/QDD';
const CN = 'China';

/** 시드 반영 상태를 흉내 낸 응답 (AC-6 기대값: 가격 13개 · $110~$990 · 중앙값 $230) */
export function seedResponse(): ActuatorMapResponse {
  const robots = [
    robot('Go1', 'Unitree Robotics', [act('Unitree', true)], posture('in_house_sells', { evidenceGrade: 'A' })),
    robot('CyberDog 2', 'Xiaomi', [act('Xiaomi', true)], posture('in_house_sells')),
    robot('GR-2', 'Fourier Intelligence', [act('Fourier', true)], posture('in_house')),
    robot('X1', 'AgiBot', [act('AgiBot (Zhiyuan Robotics)', true)], posture('in_house')),
    robot(
      'Optimus Gen 2',
      'Tesla',
      [act('Tesla', true)],
      posture('external', {
        kind: 'mixed',
        externalVendors: [
          { vendor: 'Tuopu Group', role: '선형 액추에이터 조립', grade: 'C', url: null, level: 'module' },
          { vendor: 'Sanhua Intelligent Controls', role: '회전형 모듈', grade: 'C', url: null, level: 'module' },
        ],
      })
    ),
    robot('Forerunner K1', 'Kepler Robotics', [act('Kepler Robotics', true)], posture('in_house', { evidenceGrade: 'A' })),
    robot(
      'Atlas',
      'Boston Dynamics',
      [act('Boston Dynamics', true), act('Hyundai Mobis', false)],
      posture('external', {
        kind: 'mixed',
        externalVendors: [{ vendor: 'Hyundai Mobis', role: '양산 단계 액추에이터 공급', grade: 'B', url: null, level: 'module' }],
      })
    ),
    robot('CLOiD', 'LG Electronics', [], { isLG: true, ...posture('in_house_sells') }),
    robot(
      'HUBO 2',
      'Rainbow Robotics',
      [act('Rainbow Robotics', true)],
      posture('in_house', {
        kind: 'mixed',
        componentSourcing: true,
        externalVendors: [{ vendor: 'maxon', role: '모터', grade: 'B', url: null, level: 'component' }],
      })
    ),
    robot('Walker S', 'UBTech', [], posture('unknown', { kind: 'in_house_presumed', evidenceGrade: 'C' })),
  ];
  const suppliers = [
    sp('Harmonic Drive', 'CSD-20-100-2A-GR', { type: '하모닉(스트레인웨이브)', peakTorqueNm: 76, targetMarket: 'industrial robot joints, semiconductor, medical' }),
    sp('Harmonic Drive', 'SHA20A-50CG (200 VAC)', { type: '하모닉(스트레인웨이브)', peakTorqueNm: 73, targetMarket: 'industrial automation, robotics, hollow-shaft cabling' }),
    sp('maxon', 'IDX 56 L', { type: '미확인', targetMarket: 'AGV/AMR, industrial automation, robotics' }),
    sp('Nabtesco', 'RV-100C', { type: '사이클로이드·유성', peakTorqueNm: 2450, targetMarket: 'industrial robot base/shoulder axes, machine tools' }),
    sp('MyActuator (ex-Gyems)', 'RMD-X8 Pro V2', { type: QDD, country: CN, peakTorqueNm: 25, targetMarket: 'legged robots, robot arms, research' }),
    sp('CubeMars (T-Motor)', 'AK80-64 KV80', { type: QDD, country: CN, priceUsd: 989.9, targetMarket: 'exoskeletons, legged robots, robot arms' }),
    sp('CubeMars (T-Motor)', 'AK10-9 V3.0 KV60', { type: QDD, country: CN, priceUsd: 698.9, targetMarket: 'legged robots, robot arms' }),
    sp('CubeMars (T-Motor)', 'AK70-10 KV100', { type: QDD, country: CN, priceUsd: 398.9, targetMarket: 'legged robots, robot arms' }),
    sp('CubeMars (T-Motor)', 'AK80-9 V3.0 KV100', { type: QDD, country: CN, priceUsd: 479.9, targetMarket: 'legged robots, robot arms' }),
    sp('CubeMars (T-Motor)', 'AK60-6 V3.0 KV80', { type: QDD, country: CN, priceUsd: 229.9, targetMarket: 'small legged robots, grippers, research' }),
    sp('Fourier', 'FSA 2.0 (series, 7 variants)', { type: QDD, country: CN, targetMarket: 'humanoid robots (GR-2/GR-3), in-house and external' }),
    sp('RobStride Dynamics', 'RobStride 00 (RS-00)', { type: QDD, country: CN, priceUsd: 125, targetMarket: 'humanoid/legged robots, dexterous arms' }),
    sp('RobStride Dynamics', 'RobStride 01 (RS-01)', { type: QDD, country: CN, priceUsd: 130, targetMarket: 'humanoid/legged robots, robot arms' }),
    sp('RobStride Dynamics', 'RobStride 02 (RS-02)', { type: QDD, country: CN, priceUsd: 145, targetMarket: 'humanoid/legged robots, robot arms' }),
    sp('RobStride Dynamics', 'RobStride 03 (RS-03)', { type: QDD, country: CN, priceUsd: 225, targetMarket: 'humanoid/legged robots' }),
    sp('RobStride Dynamics', 'RobStride 04 (RS-04)', { type: QDD, country: CN, priceUsd: 255, targetMarket: 'humanoid hip/knee joints' }),
    sp('RobStride Dynamics', 'RobStride 05 (RS-05)', { type: QDD, country: CN, priceUsd: 110, targetMarket: 'small humanoid/arm joints, education' }),
    sp('RobStride Dynamics', 'RobStride 06 (RS-06)', { type: QDD, country: CN, priceUsd: 210, targetMarket: 'humanoid/legged robots' }),
    sp('Unitree', 'GO-M8010-6', { type: QDD, country: CN, priceUsd: 369, peakTorqueNm: 23.7, targetMarket: 'quadruped robots (Go1), research' }),
    sp('Unitree', 'M107 Joint Motor (H1)', { type: QDD, country: CN, targetMarket: 'Unitree H1 humanoid (in-house)' }),
    sp('Xiaomi', 'CyberGear Micro Motor', { type: QDD, country: CN, targetMarket: 'CyberDog 2 joints, makers, research' }),
    sp('AgiBot (Zhiyuan Robotics)', 'PowerFlow R86-3', { type: QDD, country: CN, targetMarket: 'AgiBot X1 / Lingxi humanoid legs (open-source platform)' }),
    sp('AgiBot (Zhiyuan Robotics)', 'PowerFlow R52', { type: QDD, country: CN, targetMarket: 'AgiBot X1 humanoid arms' }),
    sp('Tesla', 'Optimus rotary actuator (3 classes)', { status: 'announced', targetMarket: 'Tesla Optimus (in-house)' }),
    sp('Kepler Robotics', 'Forerunner rotary actuator', { targetMarket: 'Kepler Forerunner K1/K2 humanoid waist and joints (in-house)' }),
    sp('LG Electronics', 'AXIUM actuator platform (Φ40-Φ120, 9 product lines)', {
      status: 'announced',
      isLG: true,
      diameterRangeMm: { min: 40, max: 120 },
      integrationLevel: 'fully_integrated',
      targetMarket: 'LG CLOiD home robot (2026), external partners from 2027, industrial high-torque by 2030',
    }),
    sp('Hyundai Mobis', 'Humanoid body actuator (2 types shown at CES 2026)', {
      status: 'announced',
      targetMarket: 'Boston Dynamics next-gen Atlas (31 body actuators), mass production from 2027',
    }),
  ].map(finalSegmentsForTest);
  const adoptions = [
    adoption({
      id: 'ad-mobis',
      robotName: 'Atlas (Electric)',
      company: 'Boston Dynamics',
      segment: 'humanoid_tier1',
      marketSegment: 'tier1_oem',
      actuatorVendor: 'Hyundai Mobis',
      vendorKey: 'hyundaimobis',
      usage: '양산 단계 액추에이터 공급',
      evidenceGrade: 'A',
      year: 2026,
    }),
    adoption({
      id: 'ad-optimus',
      robotName: 'Optimus V3',
      company: 'Tesla',
      segment: 'humanoid_tier1',
      marketSegment: 'tier1_oem',
      actuatorVendor: 'Tuopu Group / Sanhua Intelligent Controls',
      vendorKey: 'tuopugroup',
      usage: '액추에이터 모듈 위탁제조',
      evidenceGrade: 'B',
      year: 2026,
    }),
    adoption({ id: 'ad-4ne1', robotName: '4NE1', company: 'NEURA Robotics', country: 'DE', actuatorVendor: 'Schaeffler', vendorKey: 'schaeffler', evidenceGrade: 'A', year: 2025 }),
    adoption({
      id: 'ad-kbot',
      robotName: 'K-Bot',
      company: 'K-Scale Labs',
      segment: 'research_platform',
      marketSegment: 'research_edu',
      evidenceGrade: 'C',
    }),
    adoption({
      id: 'ad-agiloped',
      robotName: 'AGILOped',
      company: 'AGILOped project',
      country: null,
      segment: 'research_platform',
      marketSegment: 'research_edu',
      actuatorVendor: 'MyActuator (ex-Gyems)',
      vendorKey: 'myactuator',
      actuatorModel: 'RMD-X6-40',
      evidenceGrade: 'A',
    }),
    adoption({
      id: 'ad-exo',
      robotName: 'OpenExo',
      company: 'Northern Arizona University',
      segment: 'exoskeleton',
      marketSegment: 'service',
      actuatorVendor: 'CubeMars (T-Motor)',
      vendorKey: 'cubemars',
      actuatorModel: 'AK series',
      evidenceGrade: 'B',
    }),
    adoption({
      id: 'ad-rex',
      robotName: 'Rex',
      company: 'Rex Bionics',
      country: 'NZ',
      segment: 'exoskeleton',
      marketSegment: 'service',
      level: 'component',
      actuatorVendor: 'maxon',
      vendorKey: 'maxon',
      evidenceGrade: 'A',
      year: 2016,
    }),
    adoption({
      id: 'ad-fanuc',
      robotName: '산업용 다관절 로봇',
      company: 'FANUC / Yaskawa',
      country: null,
      segment: 'industrial',
      marketSegment: 'industrial_cobot',
      level: 'component',
      actuatorVendor: 'Nabtesco',
      vendorKey: 'nabtesco',
      evidenceGrade: 'B',
    }),
  ];
  const edges: ActuatorMapResponse['edges'] = [
    { robotId: 'Boston Dynamics-Atlas', robotName: 'Atlas', company: 'Boston Dynamics', vendor: 'Hyundai Mobis', inHouse: false, type: '미확인', quantity: 1, confidence: 'B', basis: 'external', posture: 'external', role: '양산 단계 액추에이터 공급', level: 'module' },
    { robotId: 'Tesla-Optimus Gen 2', robotName: 'Optimus Gen 2', company: 'Tesla', vendor: 'Tuopu Group', inHouse: false, type: '미확인', quantity: 1, confidence: 'C', basis: 'external', posture: 'external', role: '선형 액추에이터 조립', level: 'module' },
    { robotId: 'Tesla-Optimus Gen 2', robotName: 'Optimus Gen 2', company: 'Tesla', vendor: 'Sanhua Intelligent Controls', inHouse: false, type: '미확인', quantity: 1, confidence: 'C', basis: 'external', posture: 'external', role: '회전형 모듈', level: 'module' },
    { robotId: 'Rainbow Robotics-HUBO 2', robotName: 'HUBO 2', company: 'Rainbow Robotics', vendor: 'maxon', inHouse: false, type: '미확인', quantity: 1, confidence: 'B', basis: 'external', posture: 'in_house', role: '모터', level: 'component' },
  ];
  return response(robots, suppliers, { adoptions, edges });
}

/** 실데이터 형태의 수요 사례 → ActuatorAdoptionCase (demand-cases.json 이 없으면 null) */
export function seedAdoptionCases(): ActuatorAdoptionCase[] | null {
  const raw = readSeedJson<{ cases: Record<string, unknown>[] }>('demand-cases.json');
  if (!raw) return null;
  const toMarket: Record<AdoptionSegment, MarketSegment> = {
    humanoid_tier1: 'tier1_oem',
    humanoid_tier2: 'tier2_legged',
    quadruped: 'tier2_legged',
    research_platform: 'research_edu',
    robot_arm: 'industrial_cobot',
    industrial: 'industrial_cobot',
    service_robot: 'service',
    exoskeleton: 'service',
  };
  return raw.cases.map((c, i) => {
    const segment = c.segment as AdoptionSegment;
    const vendor = String(c.actuatorVendor);
    return {
      id: `case-${i}`,
      robotName: String(c.robotName),
      company: String(c.company),
      country: (c.country as string | null) ?? null,
      segment,
      marketSegment: toMarket[segment],
      level: c.level === 'component' ? 'component' : 'module',
      robotClass: (c.robotClass as string | null) ?? null,
      actuatorVendor: vendor,
      vendorKey: vendor.toLowerCase(),
      actuatorModel: (c.actuatorModel as string | null) ?? null,
      usage: (c.usage as string | null) ?? null,
      evidenceGrade: (c.evidenceGrade as string | null) ?? null,
      sources: ((c.sources as { url: string; source?: string }[]) ?? []).map((s) => ({ url: s.url, title: s.source ?? null })),
      noteKo: (c.noteKo as string | null) ?? null,
      year: (c.year as number | null) ?? null,
    };
  });
}

/** suppliers.json(44개) → ActuatorSupplierProduct[] (§10.1 분류 기대값 재현용: 점 13 / 레인 23 / 토크 미공개 7 / LG 1) */
export function seedSuppliers44(): ActuatorSupplierProduct[] | null {
  const raw = readSeedJson<{ products: Record<string, unknown>[] }>('suppliers.json');
  if (!raw) return null;
  const n = (v: unknown) => (typeof v === 'number' ? v : null);
  return raw.products
    .map((p) => {
      const range = typeof p.diameterRangeMm === 'string' ? /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/.exec(p.diameterRangeMm) : null;
      const vendor = String(p.vendor);
      return sp(vendor, String(p.model), {
        country: (p.vendorCountry as string | null) ?? null,
        type: String(p.type),
        peakTorqueNm: n(p.peakTorqueNm),
        continuousTorqueNm: n(p.continuousTorqueNm),
        weightKg: n(p.weightKg),
        diameterMm: n(p.diameterMm),
        priceUsd: n(p.priceUsd),
        status: (p.status as string | null) ?? null,
        targetMarket: (p.targetMarket as string | null) ?? null,
        integrationLevel: (p.integrationLevel as string | null) ?? null,
        isLG: /^LG\b/i.test(vendor),
        diameterRangeMm: range ? { min: Number(range[1]), max: Number(range[2]) } : null,
      });
    })
    .map(finalSegmentsForTest);
}

interface RegradeRow {
  name: string;
  company: string;
  sourcing: SourcingKind;
  sellsExternally: boolean | null;
  evidenceGrade: string | null;
  evidence?: { claim: string; source: string; url: string | null; grade: string; date: string | null }[];
  externalVendors: { vendor: string; role: string | null; grade: string | null; url: string | null; level?: 'module' | 'component' }[];
  noteKo?: string | null;
}

/** 조달 태세 산출 규칙(명세 6.1 + 18.1)의 테스트용 복제: 서버가 결정하는 값이며 여기서는 시드 분포 검증에만 쓴다 */
export function postureFromRegrade(kind: SourcingKind, sells: boolean | null, vendors: { level?: 'module' | 'component' }[]): { posture: SourcingPosture; componentSourcing: boolean } {
  if (kind === 'in_house_confirmed') return { posture: sells === true ? 'in_house_sells' : 'in_house', componentSourcing: false };
  if (kind === 'external') return { posture: 'external', componentSourcing: false };
  if (kind === 'mixed') {
    const hasModule = vendors.some((v) => (v.level ?? 'module') === 'module');
    return hasModule ? { posture: 'external', componentSourcing: false } : { posture: 'in_house', componentSourcing: true };
  }
  return { posture: 'unknown', componentSourcing: false };
}

/** sourcing-regrade.json(46기) → ActuatorMapRobot[] (파일이 없으면 null) */
export function seedRobots46(): ActuatorMapRobot[] | null {
  const raw = readSeedJson<{ robots: RegradeRow[] }>('sourcing-regrade.json');
  if (!raw) return null;
  return raw.robots.map((r) => {
    const vendors = r.externalVendors.map((v) => ({ ...v, level: v.level ?? ('module' as const) }));
    const { posture: p, componentSourcing } = postureFromRegrade(r.sourcing, r.sellsExternally, vendors);
    return robot(r.name, r.company, [], {
      isLG: /^LG\b/i.test(r.company),
      sourcing: sourcing(p, {
        kind: r.sourcing,
        sellsExternally: r.sellsExternally,
        evidenceGrade: r.evidenceGrade,
        evidence: r.evidence ?? [],
        externalVendors: vendors,
        noteKo: r.noteKo ?? null,
        basis: 'regrade',
        componentSourcing,
      }),
    });
  });
}
