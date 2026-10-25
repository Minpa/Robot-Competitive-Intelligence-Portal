/** 테스트 전용 픽스처 — suppliers.json / robots.json 시드 형태를 ActuatorMapResponse 로 옮긴 것 */
import type {
  ActuatorMapResponse,
  ActuatorMapRobot,
  ActuatorSupplierProduct,
  RobotActuator,
} from '@/types/actuator-map';

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
    ...over,
  };
}

export function response(robots: ActuatorMapRobot[], suppliers: ActuatorSupplierProduct[], over: Partial<ActuatorMapResponse> = {}): ActuatorMapResponse {
  return {
    generatedAt: '2026-10-25T03:04:00.000Z',
    cached: false,
    difficultyDefault: { L: 1, D: 1, H: 1, S: 1 },
    typeOrder: [],
    robots,
    suppliers,
    edges: [],
    stats: { robots: robots.length, complete: robots.length, incomplete: 0, suppliers: suppliers.length, edges: 0 },
    ...over,
  };
}

const QDD = '직구동/QDD';
const CN = 'China';

/** 시드 반영 상태를 흉내 낸 응답 (AC-6 기대값: 가격 13개 · $110~$990 · 중앙값 $230) */
export function seedResponse(): ActuatorMapResponse {
  const robots = [
    robot('Go1', 'Unitree Robotics', [act('Unitree', true)]),
    robot('CyberDog 2', 'Xiaomi', [act('Xiaomi', true)]),
    robot('GR-2', 'Fourier Intelligence', [act('Fourier', true)]),
    robot('X1', 'AgiBot', [act('AgiBot (Zhiyuan Robotics)', true)]),
    robot('Optimus', 'Tesla', [act('Tesla', true)]),
    robot('Forerunner K1', 'Kepler Robotics', [act('Kepler Robotics', true)]),
    robot('Atlas', 'Boston Dynamics', [act('Boston Dynamics', true), act('Hyundai Mobis', false)]),
    robot('CLOiD', 'LG Electronics', [], { isLG: true }),
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
      targetMarket: 'LG CLOiD home robot (2026), external partners from 2027, industrial high-torque by 2030',
    }),
    sp('Hyundai Mobis', 'Humanoid body actuator (2 types shown at CES 2026)', {
      status: 'announced',
      targetMarket: 'Boston Dynamics next-gen Atlas (31 body actuators), mass production from 2027',
    }),
  ];
  return response(robots, suppliers);
}
