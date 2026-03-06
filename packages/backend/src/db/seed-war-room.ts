import {
  db,
  partners,
  applicationDomains,
  companies,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
} from './index.js';
import { eq, and } from 'drizzle-orm';

// ============================================
// 1. 파트너 시드 데이터 (14건)
// ============================================
const partnersData = [
  // Component — Vision Sensor
  {
    name: 'Intel RealSense',
    category: 'component',
    subCategory: 'vision_sensor',
    country: 'US',
    description: '3D 깊이 카메라 및 비전 센서 전문. D400/L500 시리즈로 로봇 비전 시장 선도.',
    techCapability: 8,
    lgCompatibility: 7,
    marketShare: '0.3500',
  },
  {
    name: 'Orbbec',
    category: 'component',
    subCategory: 'vision_sensor',
    country: 'CN',
    description: '3D 비전 센서 및 구조광 카메라 전문. Femto/Astra 시리즈.',
    techCapability: 7,
    lgCompatibility: 6,
    marketShare: '0.1500',
  },
  // Component — Battery
  {
    name: 'Samsung SDI',
    category: 'component',
    subCategory: 'battery',
    country: 'KR',
    description: '리튬이온 배터리 셀 및 팩 제조. 전기차/로봇용 고에너지 밀도 배터리.',
    techCapability: 9,
    lgCompatibility: 9,
    marketShare: '0.2200',
  },
  {
    name: 'CATL',
    category: 'component',
    subCategory: 'battery',
    country: 'CN',
    description: '세계 최대 배터리 제조사. LFP/NMC 배터리 셀 및 팩.',
    techCapability: 9,
    lgCompatibility: 5,
    marketShare: '0.3700',
  },
  // Component — AI Chip
  {
    name: 'NVIDIA',
    category: 'component',
    subCategory: 'ai_chip',
    country: 'US',
    description: 'GPU 및 AI 가속기 시장 지배. Jetson 시리즈로 로봇 엣지 AI 표준.',
    techCapability: 10,
    lgCompatibility: 8,
    marketShare: '0.8000',
  },
  {
    name: 'Qualcomm',
    category: 'component',
    subCategory: 'ai_chip',
    country: 'US',
    description: '모바일/로봇용 SoC. Robotics RB 시리즈로 저전력 AI 처리.',
    techCapability: 8,
    lgCompatibility: 7,
    marketShare: '0.1200',
  },
  // Component — Reducer
  {
    name: 'Harmonic Drive',
    category: 'component',
    subCategory: 'reducer',
    country: 'JP',
    description: '하모닉 감속기 원천 기술 보유. 로봇 관절용 정밀 감속기 시장 선도.',
    techCapability: 9,
    lgCompatibility: 7,
    marketShare: '0.4500',
  },
  // Component — Motor
  {
    name: 'Maxon',
    category: 'component',
    subCategory: 'motor',
    country: 'CH',
    description: '고정밀 DC 모터 및 드라이브 시스템. 의료/로봇/항공우주 분야.',
    techCapability: 9,
    lgCompatibility: 7,
    marketShare: '0.2500',
  },
  // Component — Reducer (2nd)
  {
    name: 'Nabtesco',
    category: 'component',
    subCategory: 'reducer',
    country: 'JP',
    description: 'RV 감속기 세계 1위. 산업용 로봇 관절 감속기 시장 60% 점유.',
    techCapability: 9,
    lgCompatibility: 6,
    marketShare: '0.6000',
  },
  // Component — Force Sensor
  {
    name: 'ATI Industrial',
    category: 'component',
    subCategory: 'force_sensor',
    country: 'US',
    description: '6축 힘/토크 센서 세계 1위. 로봇 손목/그리퍼용 정밀 센서.',
    techCapability: 9,
    lgCompatibility: 7,
    marketShare: '0.5500',
  },
  // RFM
  {
    name: 'Google DeepMind',
    category: 'rfm',
    subCategory: null,
    country: 'US',
    description: 'AI 연구 선도. RT-2, Gemini 등 로봇 파운데이션 모델 개발.',
    techCapability: 10,
    lgCompatibility: 5,
    marketShare: '0.3000',
  },
  // Data
  {
    name: 'Scale AI',
    category: 'data',
    subCategory: null,
    country: 'US',
    description: 'AI 학습 데이터 라벨링 플랫폼. 자율주행/로봇 데이터 파이프라인.',
    techCapability: 8,
    lgCompatibility: 7,
    marketShare: '0.4000',
  },
  // Platform
  {
    name: 'ROS / Open Robotics',
    category: 'platform',
    subCategory: null,
    country: 'US',
    description: 'ROS/ROS2 오픈소스 로봇 미들웨어 플랫폼. 로봇 소프트웨어 표준.',
    techCapability: 8,
    lgCompatibility: 8,
    marketShare: '0.7000',
  },
  // Integration
  {
    name: 'Foxconn',
    category: 'integration',
    subCategory: null,
    country: 'TW',
    description: '세계 최대 EMS 기업. 전자제품/로봇 대량 생산 및 조립 역량.',
    techCapability: 7,
    lgCompatibility: 8,
    marketShare: '0.4500',
  },
];

// ============================================
// 2. 사업화 분야 시드 데이터 (8건)
// ============================================
const domainsData = [
  {
    name: 'manufacturing',
    description: '제조업 — 자동차, 전자, 반도체 등 공장 자동화 및 조립 라인 로봇 활용',
    marketSizeBillionUsd: '45.00',
    cagrPercent: '12.50',
    somBillionUsd: '2.50',
    keyTasks: ['assembly', 'quality_inspection', 'material_handling', 'welding', 'painting'],
    entryBarriers: ['safety_certification', 'precision_requirements', 'integration_complexity', 'existing_automation'],
    lgExistingBusiness: '0.80',
  },
  {
    name: 'logistics',
    description: '물류 — 창고 자동화, 라스트마일 배송, 물류센터 피킹/패킹',
    marketSizeBillionUsd: '38.00',
    cagrPercent: '15.00',
    somBillionUsd: '2.00',
    keyTasks: ['picking', 'packing', 'sorting', 'palletizing', 'last_mile_delivery'],
    entryBarriers: ['warehouse_integration', 'speed_requirements', 'cost_per_pick', 'fleet_management'],
    lgExistingBusiness: '0.60',
  },
  {
    name: 'retail',
    description: '유통/소매 — 매장 안내, 재고 관리, 고객 서비스, 무인 매장',
    marketSizeBillionUsd: '22.00',
    cagrPercent: '18.00',
    somBillionUsd: '1.20',
    keyTasks: ['customer_guidance', 'inventory_management', 'shelf_stocking', 'checkout_assistance'],
    entryBarriers: ['customer_acceptance', 'roi_justification', 'store_layout_adaptation', 'multilingual_support'],
    lgExistingBusiness: '0.70',
  },
  {
    name: 'healthcare',
    description: '의료/헬스케어 — 재활 보조, 간호 지원, 수술 보조, 약품 배송',
    marketSizeBillionUsd: '28.00',
    cagrPercent: '20.00',
    somBillionUsd: '1.50',
    keyTasks: ['rehabilitation_assist', 'patient_care', 'medication_delivery', 'surgical_assist', 'disinfection'],
    entryBarriers: ['medical_certification', 'safety_standards', 'liability_issues', 'clinical_validation', 'hipaa_compliance'],
    lgExistingBusiness: '0.40',
  },
  {
    name: 'hospitality',
    description: '호텔/서비스 — 호텔 컨시어지, 룸서비스 배송, 레스토랑 서빙',
    marketSizeBillionUsd: '15.00',
    cagrPercent: '14.00',
    somBillionUsd: '0.80',
    keyTasks: ['concierge', 'room_service_delivery', 'restaurant_serving', 'cleaning', 'guest_interaction'],
    entryBarriers: ['guest_experience_quality', 'noise_requirements', 'aesthetic_design', 'multilingual_support'],
    lgExistingBusiness: '0.30',
  },
  {
    name: 'home',
    description: '가정용 — 가사 도우미, 노인 돌봄, 교육 보조, 엔터테인먼트',
    marketSizeBillionUsd: '35.00',
    cagrPercent: '22.00',
    somBillionUsd: '3.00',
    keyTasks: ['housekeeping', 'elderly_care', 'child_education', 'entertainment', 'security_monitoring'],
    entryBarriers: ['price_sensitivity', 'safety_in_home', 'privacy_concerns', 'consumer_trust', 'after_service'],
    lgExistingBusiness: '0.90',
  },
  {
    name: 'agriculture',
    description: '농업 — 수확 자동화, 작물 모니터링, 농약 살포, 온실 관리',
    marketSizeBillionUsd: '12.00',
    cagrPercent: '16.00',
    somBillionUsd: '0.50',
    keyTasks: ['harvesting', 'crop_monitoring', 'spraying', 'greenhouse_management', 'livestock_care'],
    entryBarriers: ['outdoor_durability', 'terrain_adaptation', 'seasonal_demand', 'farmer_adoption', 'connectivity'],
    lgExistingBusiness: '0.10',
  },
  {
    name: 'construction',
    description: '건설 — 현장 검사, 자재 운반, 3D 프린팅, 위험 작업 대체',
    marketSizeBillionUsd: '18.00',
    cagrPercent: '10.00',
    somBillionUsd: '0.70',
    keyTasks: ['site_inspection', 'material_transport', '3d_printing', 'demolition', 'safety_monitoring'],
    entryBarriers: ['harsh_environment', 'heavy_payload', 'dust_water_resistance', 'construction_regulations'],
    lgExistingBusiness: '0.20',
  },
];

// ============================================
// 3. CLOiD 초기 데이터
// ============================================
const cloidData = {
  company: {
    name: 'LG Electronics',
    country: 'Korea',
    category: 'electronics',
    city: 'Seoul',
    foundingYear: 1958,
    mainBusiness: '가전, 전자, 로봇',
  },
  robot: {
    name: 'CLOiD',
    announcementYear: 2024,
    status: 'development',
    purpose: 'service',
    locomotionType: 'wheeled',
    handType: 'multi_finger',
    commercializationStage: 'prototype',
    region: 'KR',
    description: 'LG 휴머노이드 로봇. 틸팅 메커니즘으로 105-143cm 높이 조절 가능. 가정/서비스용.',
  },
  bodySpec: {
    heightCm: '143',
    weightKg: '70',
    payloadKg: '5',
    dofCount: 14, // 7 DoF × 2 arms
    maxSpeedMps: '1.10', // 4km/h ≈ 1.1 m/s
    operationTimeHours: '9', // 8-10 hours average
  },
  handSpec: {
    handType: 'multi_finger',
    fingerCount: 10, // 5 × 2 hands
    handDof: 14, // 7 DoF × 2 arms
    gripForceN: '50',
    isInterchangeable: false,
  },
  computingSpec: {
    mainSoc: 'LG DQ-C2',
    topsMin: '10',
    topsMax: '30',
    architectureType: 'onboard', // ARM-based onboard
  },
  sensorSpec: {
    cameras: [
      { type: 'rgb', count: 2, resolution: 'HD 1080p' },
    ],
    depthSensor: 'Depth Camera (Structured Light)',
    lidar: null,
    imu: '9-axis IMU',
    forceTorque: '6-axis Force/Torque Sensor',
    touchSensors: [
      { location: 'fingertip', type: 'capacitive' },
    ],
  },
  powerSpec: {
    batteryType: 'Li-ion',
    capacityWh: '2000',
    operationTimeHours: '9', // 8-10 hours
    chargingMethod: 'fixed',
  },
};

// ============================================
// Seed Functions
// ============================================

async function seedPartners() {
  console.log('Seeding war room partners (14 records)...');
  let inserted = 0;
  let skipped = 0;

  for (const p of partnersData) {
    const existing = await db
      .select()
      .from(partners)
      .where(eq(partners.name, p.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Partner already exists: ${p.name}`);
      skipped++;
      continue;
    }

    await db.insert(partners).values({
      name: p.name,
      category: p.category,
      subCategory: p.subCategory,
      country: p.country,
      description: p.description,
      techCapability: p.techCapability,
      lgCompatibility: p.lgCompatibility,
      marketShare: p.marketShare,
    });
    console.log(`  Added partner: ${p.name} (${p.category}/${p.subCategory ?? '-'})`);
    inserted++;
  }

  console.log(`Partners: ${inserted} inserted, ${skipped} skipped (already exist)`);
}

async function seedApplicationDomains() {
  console.log('Seeding application domains (8 records)...');
  let inserted = 0;
  let skipped = 0;

  for (const d of domainsData) {
    const existing = await db
      .select()
      .from(applicationDomains)
      .where(eq(applicationDomains.name, d.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Domain already exists: ${d.name}`);
      skipped++;
      continue;
    }

    await db.insert(applicationDomains).values({
      name: d.name,
      description: d.description,
      marketSizeBillionUsd: d.marketSizeBillionUsd,
      cagrPercent: d.cagrPercent,
      somBillionUsd: d.somBillionUsd,
      keyTasks: d.keyTasks,
      entryBarriers: d.entryBarriers,
      lgExistingBusiness: d.lgExistingBusiness,
    });
    console.log(`  Added domain: ${d.name}`);
    inserted++;
  }

  console.log(`Domains: ${inserted} inserted, ${skipped} skipped (already exist)`);
}

async function seedCloid() {
  console.log('Checking CLOiD data in humanoid_robots...');

  // Check if LG Electronics company exists
  let lgCompanyId: string;
  const existingCompany = await db
    .select()
    .from(companies)
    .where(eq(companies.name, cloidData.company.name))
    .limit(1);

  if (existingCompany.length > 0) {
    lgCompanyId = existingCompany[0]!.id;
    console.log(`  LG Electronics company found: ${lgCompanyId}`);
  } else {
    const [inserted] = await db
      .insert(companies)
      .values(cloidData.company)
      .returning();
    lgCompanyId = inserted!.id;
    console.log(`  Created LG Electronics company: ${lgCompanyId}`);
  }

  // Check if CLOiD robot exists
  const existingRobot = await db
    .select()
    .from(humanoidRobots)
    .where(
      and(
        eq(humanoidRobots.name, 'CLOiD'),
        eq(humanoidRobots.companyId, lgCompanyId)
      )
    )
    .limit(1);

  let cloidId: string;

  if (existingRobot.length > 0) {
    cloidId = existingRobot[0]!.id;
    console.log(`  CLOiD robot already exists: ${cloidId}`);
  } else {
    const [inserted] = await db
      .insert(humanoidRobots)
      .values({
        companyId: lgCompanyId,
        ...cloidData.robot,
      })
      .returning();
    cloidId = inserted!.id;
    console.log(`  Created CLOiD robot: ${cloidId}`);
  }

  // Seed body spec
  const existingBody = await db
    .select()
    .from(bodySpecs)
    .where(eq(bodySpecs.robotId, cloidId))
    .limit(1);
  if (existingBody.length === 0) {
    await db.insert(bodySpecs).values({ robotId: cloidId, ...cloidData.bodySpec });
    console.log('  Added CLOiD body spec');
  } else {
    console.log('  CLOiD body spec already exists');
  }

  // Seed hand spec
  const existingHand = await db
    .select()
    .from(handSpecs)
    .where(eq(handSpecs.robotId, cloidId))
    .limit(1);
  if (existingHand.length === 0) {
    await db.insert(handSpecs).values({ robotId: cloidId, ...cloidData.handSpec });
    console.log('  Added CLOiD hand spec');
  } else {
    console.log('  CLOiD hand spec already exists');
  }

  // Seed computing spec
  const existingComputing = await db
    .select()
    .from(computingSpecs)
    .where(eq(computingSpecs.robotId, cloidId))
    .limit(1);
  if (existingComputing.length === 0) {
    await db.insert(computingSpecs).values({ robotId: cloidId, ...cloidData.computingSpec });
    console.log('  Added CLOiD computing spec');
  } else {
    console.log('  CLOiD computing spec already exists');
  }

  // Seed sensor spec
  const existingSensor = await db
    .select()
    .from(sensorSpecs)
    .where(eq(sensorSpecs.robotId, cloidId))
    .limit(1);
  if (existingSensor.length === 0) {
    await db.insert(sensorSpecs).values({ robotId: cloidId, ...cloidData.sensorSpec });
    console.log('  Added CLOiD sensor spec');
  } else {
    console.log('  CLOiD sensor spec already exists');
  }

  // Seed power spec
  const existingPower = await db
    .select()
    .from(powerSpecs)
    .where(eq(powerSpecs.robotId, cloidId))
    .limit(1);
  if (existingPower.length === 0) {
    await db.insert(powerSpecs).values({ robotId: cloidId, ...cloidData.powerSpec });
    console.log('  Added CLOiD power spec');
  } else {
    console.log('  CLOiD power spec already exists');
  }

  console.log('CLOiD data verification complete');
}

// ============================================
// Main
// ============================================

async function seedWarRoom() {
  console.log('=== War Room Seed Data ===\n');

  await seedPartners();
  console.log('');

  await seedApplicationDomains();
  console.log('');

  await seedCloid();

  console.log('\n✅ War Room seed completed successfully!');
  process.exit(0);
}

seedWarRoom().catch((err) => {
  console.error('War Room seed failed:', err);
  process.exit(1);
});
