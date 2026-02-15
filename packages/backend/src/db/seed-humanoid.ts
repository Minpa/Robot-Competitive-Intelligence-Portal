import {
  db,
  companies,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
  workforceData,
  talentTrends,
  components,
  robotComponents,
  applicationCases,
} from './index.js';
import { eq } from 'drizzle-orm';

async function seedHumanoid() {
  console.log('Seeding humanoid robot data...');

  // 1. 회사 데이터 추가/업데이트
  const companiesData = [
    { name: 'Tesla', country: 'USA', category: 'automotive', city: 'Austin', foundingYear: 2003, mainBusiness: '전기차, 에너지, AI 로봇' },
    { name: 'Boston Dynamics', country: 'USA', category: 'robotics', city: 'Waltham', foundingYear: 1992, mainBusiness: '이동 로봇' },
    { name: 'Agility Robotics', country: 'USA', category: 'robotics', city: 'Corvallis', foundingYear: 2015, mainBusiness: '휴머노이드 로봇' },
    { name: 'Figure AI', country: 'USA', category: 'robotics', city: 'Sunnyvale', foundingYear: 2022, mainBusiness: '범용 휴머노이드' },
    { name: '1X Technologies', country: 'Norway', category: 'robotics', city: 'Moss', foundingYear: 2014, mainBusiness: '안드로이드 로봇' },
    { name: 'Unitree Robotics', country: 'China', category: 'robotics', city: 'Hangzhou', foundingYear: 2016, mainBusiness: '4족/휴머노이드 로봇' },
    { name: 'UBTECH', country: 'China', category: 'robotics', city: 'Shenzhen', foundingYear: 2012, mainBusiness: '서비스 로봇' },
    { name: 'Xiaomi', country: 'China', category: 'electronics', city: 'Beijing', foundingYear: 2010, mainBusiness: '전자제품, 로봇' },
    { name: 'Fourier Intelligence', country: 'China', category: 'robotics', city: 'Shanghai', foundingYear: 2015, mainBusiness: '재활/휴머노이드 로봇' },
    { name: 'Sanctuary AI', country: 'Canada', category: 'robotics', city: 'Vancouver', foundingYear: 2018, mainBusiness: '범용 AI 로봇' },
  ];

  const companyMap: Record<string, string> = {};
  for (const c of companiesData) {
    const existing = await db.select().from(companies).where(eq(companies.name, c.name)).limit(1);
    if (existing.length > 0) {
      companyMap[c.name] = existing[0]!.id;
    } else {
      const [inserted] = await db.insert(companies).values(c).returning();
      companyMap[c.name] = inserted!.id;
    }
  }
  console.log('Companies seeded:', Object.keys(companyMap).length);


  // 2. 휴머노이드 로봇 데이터
  const robotsData = [
    {
      companyName: 'Tesla',
      name: 'Optimus Gen 2',
      announcementYear: 2023,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'north_america',
      description: 'Tesla의 2세대 휴머노이드 로봇. 개선된 손과 보행 능력.',
    },
    {
      companyName: 'Boston Dynamics',
      name: 'Atlas (Electric)',
      announcementYear: 2024,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'north_america',
      description: '전기 구동 방식의 새로운 Atlas. 자동차 제조 환경 최적화.',
    },
    {
      companyName: 'Agility Robotics',
      name: 'Digit',
      announcementYear: 2023,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'biped',
      handType: 'gripper',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: '물류 창고용 휴머노이드. Amazon과 협력 중.',
    },
    {
      companyName: 'Figure AI',
      name: 'Figure 01',
      announcementYear: 2024,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: 'OpenAI와 협력한 범용 휴머노이드 로봇.',
    },
    {
      companyName: '1X Technologies',
      name: 'NEO',
      announcementYear: 2024,
      status: 'development',
      purpose: 'home',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'europe',
      description: '가정용 안드로이드 로봇. OpenAI 투자.',
    },
    {
      companyName: 'Unitree Robotics',
      name: 'H1',
      announcementYear: 2023,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'biped',
      handType: 'gripper',
      commercializationStage: 'commercial',
      region: 'china',
      description: '저가형 휴머노이드. 연구/교육용.',
    },
    {
      companyName: 'Unitree Robotics',
      name: 'G1',
      announcementYear: 2024,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'china',
      description: '소형 휴머노이드. $16,000 가격대.',
    },
    {
      companyName: 'UBTECH',
      name: 'Walker X',
      announcementYear: 2021,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: '서비스 휴머노이드. 전시/안내용.',
    },
    {
      companyName: 'Xiaomi',
      name: 'CyberOne',
      announcementYear: 2022,
      status: 'development',
      purpose: 'home',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'concept',
      region: 'china',
      description: '샤오미의 휴머노이드 로봇 컨셉.',
    },
    {
      companyName: 'Fourier Intelligence',
      name: 'GR-1',
      announcementYear: 2023,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: '범용 휴머노이드. 재활 기술 기반.',
    },
    {
      companyName: 'Sanctuary AI',
      name: 'Phoenix',
      announcementYear: 2023,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'biped',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: '범용 AI 휴머노이드. 인지 AI 탑재.',
    },
  ];

  const robotMap: Record<string, string> = {};
  for (const r of robotsData) {
    const companyId = companyMap[r.companyName];
    if (!companyId) continue;
    const existing = await db.select().from(humanoidRobots).where(eq(humanoidRobots.name, r.name)).limit(1);
    if (existing.length > 0) {
      robotMap[r.name] = existing[0]!.id;
    } else {
      const [inserted] = await db.insert(humanoidRobots).values({
        companyId,
        name: r.name,
        announcementYear: r.announcementYear,
        status: r.status,
        purpose: r.purpose,
        locomotionType: r.locomotionType,
        handType: r.handType,
        commercializationStage: r.commercializationStage,
        region: r.region,
        description: r.description,
      }).returning();
      robotMap[r.name] = inserted!.id;
    }
  }
  console.log('Robots seeded:', Object.keys(robotMap).length);


  // 3. Body 스펙 데이터
  const bodySpecsData: Record<string, any> = {
    'Optimus Gen 2': { heightCm: 173, weightKg: 57, payloadKg: 20, dofCount: 28, maxSpeedMps: 2.5, operationTimeHours: 4 },
    'Atlas (Electric)': { heightCm: 150, weightKg: 89, payloadKg: 25, dofCount: 28, maxSpeedMps: 2.5, operationTimeHours: 2 },
    'Digit': { heightCm: 175, weightKg: 65, payloadKg: 16, dofCount: 30, maxSpeedMps: 1.5, operationTimeHours: 8 },
    'Figure 01': { heightCm: 168, weightKg: 60, payloadKg: 20, dofCount: 40, maxSpeedMps: 1.2, operationTimeHours: 5 },
    'NEO': { heightCm: 165, weightKg: 30, payloadKg: 20, dofCount: 37, maxSpeedMps: 4.0, operationTimeHours: 4 },
    'H1': { heightCm: 180, weightKg: 47, payloadKg: 10, dofCount: 19, maxSpeedMps: 3.3, operationTimeHours: 2 },
    'G1': { heightCm: 127, weightKg: 35, payloadKg: 3, dofCount: 23, maxSpeedMps: 2.0, operationTimeHours: 2 },
    'Walker X': { heightCm: 145, weightKg: 63, payloadKg: 5, dofCount: 41, maxSpeedMps: 1.0, operationTimeHours: 2 },
    'CyberOne': { heightCm: 177, weightKg: 52, payloadKg: 1.5, dofCount: 21, maxSpeedMps: 0.8, operationTimeHours: 1 },
    'GR-1': { heightCm: 165, weightKg: 55, payloadKg: 50, dofCount: 40, maxSpeedMps: 1.5, operationTimeHours: 2 },
    'Phoenix': { heightCm: 170, weightKg: 70, payloadKg: 25, dofCount: 20, maxSpeedMps: 1.4, operationTimeHours: 4 },
  };

  for (const [robotName, spec] of Object.entries(bodySpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(bodySpecs).where(eq(bodySpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(bodySpecs).values({ robotId, ...spec });
    }
  }
  console.log('Body specs seeded');

  // 4. Hand 스펙 데이터
  const handSpecsData: Record<string, any> = {
    'Optimus Gen 2': { handType: 'multi_finger', fingerCount: 5, handDof: 11, gripForceN: 100, isInterchangeable: false },
    'Atlas (Electric)': { handType: 'multi_finger', fingerCount: 5, handDof: 12, gripForceN: 150, isInterchangeable: true },
    'Digit': { handType: 'gripper', fingerCount: 2, handDof: 2, gripForceN: 200, isInterchangeable: true },
    'Figure 01': { handType: 'multi_finger', fingerCount: 5, handDof: 16, gripForceN: 100, isInterchangeable: false },
    'NEO': { handType: 'multi_finger', fingerCount: 5, handDof: 12, gripForceN: 80, isInterchangeable: false },
    'H1': { handType: 'gripper', fingerCount: 2, handDof: 2, gripForceN: 50, isInterchangeable: true },
    'G1': { handType: 'multi_finger', fingerCount: 5, handDof: 6, gripForceN: 30, isInterchangeable: false },
    'Walker X': { handType: 'multi_finger', fingerCount: 5, handDof: 12, gripForceN: 50, isInterchangeable: false },
    'CyberOne': { handType: 'multi_finger', fingerCount: 5, handDof: 6, gripForceN: 20, isInterchangeable: false },
    'GR-1': { handType: 'multi_finger', fingerCount: 5, handDof: 12, gripForceN: 100, isInterchangeable: true },
    'Phoenix': { handType: 'multi_finger', fingerCount: 5, handDof: 20, gripForceN: 100, isInterchangeable: false },
  };

  for (const [robotName, spec] of Object.entries(handSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(handSpecs).where(eq(handSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(handSpecs).values({ robotId, ...spec });
    }
  }
  console.log('Hand specs seeded');


  // 5. Computing 스펙 데이터
  const computingSpecsData: Record<string, any> = {
    'Optimus Gen 2': { mainSoc: 'Tesla FSD Chip', topsMin: 72, topsMax: 144, architectureType: 'onboard' },
    'Atlas (Electric)': { mainSoc: 'Custom NVIDIA', topsMin: 100, topsMax: 200, architectureType: 'onboard' },
    'Digit': { mainSoc: 'NVIDIA Jetson AGX', topsMin: 32, topsMax: 275, architectureType: 'onboard' },
    'Figure 01': { mainSoc: 'Custom AI Chip', topsMin: 100, topsMax: 200, architectureType: 'hybrid' },
    'NEO': { mainSoc: 'NVIDIA Jetson', topsMin: 32, topsMax: 100, architectureType: 'onboard' },
    'H1': { mainSoc: 'NVIDIA Jetson Orin', topsMin: 40, topsMax: 275, architectureType: 'onboard' },
    'G1': { mainSoc: 'NVIDIA Jetson Orin', topsMin: 40, topsMax: 100, architectureType: 'onboard' },
    'Walker X': { mainSoc: 'Intel Core i7', topsMin: 10, topsMax: 20, architectureType: 'onboard' },
    'CyberOne': { mainSoc: 'Qualcomm Snapdragon', topsMin: 15, topsMax: 26, architectureType: 'onboard' },
    'GR-1': { mainSoc: 'NVIDIA Jetson AGX', topsMin: 32, topsMax: 275, architectureType: 'onboard' },
    'Phoenix': { mainSoc: 'Custom AI Chip', topsMin: 50, topsMax: 150, architectureType: 'hybrid' },
  };

  for (const [robotName, spec] of Object.entries(computingSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(computingSpecs).where(eq(computingSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(computingSpecs).values({ robotId, ...spec });
    }
  }
  console.log('Computing specs seeded');

  // 6. Power 스펙 데이터
  const powerSpecsData: Record<string, any> = {
    'Optimus Gen 2': { batteryType: 'Li-ion', capacityWh: 2300, operationTimeHours: 4, chargingMethod: 'fixed' },
    'Atlas (Electric)': { batteryType: 'Li-ion', capacityWh: 3000, operationTimeHours: 2, chargingMethod: 'swappable' },
    'Digit': { batteryType: 'Li-ion', capacityWh: 4000, operationTimeHours: 8, chargingMethod: 'swappable' },
    'Figure 01': { batteryType: 'Li-ion', capacityWh: 2500, operationTimeHours: 5, chargingMethod: 'fixed' },
    'NEO': { batteryType: 'Li-ion', capacityWh: 1500, operationTimeHours: 4, chargingMethod: 'fixed' },
    'H1': { batteryType: 'Li-ion', capacityWh: 864, operationTimeHours: 2, chargingMethod: 'fixed' },
    'G1': { batteryType: 'Li-ion', capacityWh: 800, operationTimeHours: 2, chargingMethod: 'fixed' },
    'Walker X': { batteryType: 'Li-ion', capacityWh: 1200, operationTimeHours: 2, chargingMethod: 'fixed' },
    'CyberOne': { batteryType: 'Li-ion', capacityWh: 600, operationTimeHours: 1, chargingMethod: 'fixed' },
    'GR-1': { batteryType: 'Li-ion', capacityWh: 1500, operationTimeHours: 2, chargingMethod: 'swappable' },
    'Phoenix': { batteryType: 'Li-ion', capacityWh: 2000, operationTimeHours: 4, chargingMethod: 'both' },
  };

  for (const [robotName, spec] of Object.entries(powerSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(powerSpecs).where(eq(powerSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(powerSpecs).values({ robotId, ...spec });
    }
  }
  console.log('Power specs seeded');


  // 7. 인력 데이터
  const workforceDataList = [
    { companyName: 'Tesla', totalHeadcountMin: 120000, totalHeadcountMax: 140000, humanoidTeamSize: 500, jobDistribution: { rd: 30, software: 25, controlAi: 20, mechatronics: 15, operations: 5, business: 5 } },
    { companyName: 'Boston Dynamics', totalHeadcountMin: 800, totalHeadcountMax: 1000, humanoidTeamSize: 200, jobDistribution: { rd: 40, software: 20, controlAi: 20, mechatronics: 15, operations: 3, business: 2 } },
    { companyName: 'Agility Robotics', totalHeadcountMin: 200, totalHeadcountMax: 300, humanoidTeamSize: 150, jobDistribution: { rd: 35, software: 25, controlAi: 15, mechatronics: 15, operations: 5, business: 5 } },
    { companyName: 'Figure AI', totalHeadcountMin: 100, totalHeadcountMax: 200, humanoidTeamSize: 100, jobDistribution: { rd: 40, software: 30, controlAi: 15, mechatronics: 10, operations: 3, business: 2 } },
    { companyName: '1X Technologies', totalHeadcountMin: 50, totalHeadcountMax: 100, humanoidTeamSize: 50, jobDistribution: { rd: 45, software: 25, controlAi: 15, mechatronics: 10, operations: 3, business: 2 } },
    { companyName: 'Unitree Robotics', totalHeadcountMin: 300, totalHeadcountMax: 500, humanoidTeamSize: 100, jobDistribution: { rd: 35, software: 20, controlAi: 15, mechatronics: 20, operations: 5, business: 5 } },
    { companyName: 'UBTECH', totalHeadcountMin: 1000, totalHeadcountMax: 1500, humanoidTeamSize: 200, jobDistribution: { rd: 30, software: 25, controlAi: 15, mechatronics: 15, operations: 8, business: 7 } },
    { companyName: 'Fourier Intelligence', totalHeadcountMin: 200, totalHeadcountMax: 400, humanoidTeamSize: 80, jobDistribution: { rd: 40, software: 20, controlAi: 15, mechatronics: 15, operations: 5, business: 5 } },
    { companyName: 'Sanctuary AI', totalHeadcountMin: 100, totalHeadcountMax: 150, humanoidTeamSize: 80, jobDistribution: { rd: 45, software: 25, controlAi: 15, mechatronics: 10, operations: 3, business: 2 } },
  ];

  for (const w of workforceDataList) {
    const companyId = companyMap[w.companyName];
    if (!companyId) continue;
    const existing = await db.select().from(workforceData).where(eq(workforceData.companyId, companyId)).limit(1);
    if (existing.length === 0) {
      await db.insert(workforceData).values({
        companyId,
        totalHeadcountMin: w.totalHeadcountMin,
        totalHeadcountMax: w.totalHeadcountMax,
        humanoidTeamSize: w.humanoidTeamSize,
        jobDistribution: w.jobDistribution,
        recordedAt: new Date(),
        source: 'Estimated',
      });
    }
  }
  console.log('Workforce data seeded');

  // 8. 탤런트 트렌드 데이터
  const trendYears = [2021, 2022, 2023, 2024, 2025];
  for (const w of workforceDataList) {
    const companyId = companyMap[w.companyName];
    if (!companyId) continue;
    for (const year of trendYears) {
      const existing = await db.select().from(talentTrends)
        .where(eq(talentTrends.companyId, companyId))
        .limit(1);
      if (existing.length === 0) {
        const growthFactor = 1 + (year - 2021) * 0.15;
        await db.insert(talentTrends).values({
          companyId,
          year,
          totalHeadcount: Math.round(w.totalHeadcountMin * growthFactor),
          humanoidTeamSize: Math.round(w.humanoidTeamSize * growthFactor),
          jobPostingCount: Math.round(w.humanoidTeamSize * 0.1 * growthFactor),
          recordedAt: new Date(),
          source: 'Estimated',
        });
      }
    }
  }
  console.log('Talent trends seeded');


  // 9. 부품 데이터
  const componentsData = [
    { type: 'actuator', name: 'Tesla Rotary Actuator', vendor: 'Tesla', specifications: { actuatorType: 'direct_drive', ratedTorqueNm: 50, maxTorqueNm: 100, speedRpm: 100, weightKg: 1.2, integrationLevel: 'fully_integrated' } },
    { type: 'actuator', name: 'Unitree A1 Motor', vendor: 'Unitree', specifications: { actuatorType: 'direct_drive', ratedTorqueNm: 33, maxTorqueNm: 66, speedRpm: 21, weightKg: 0.5, integrationLevel: 'motor_gear_driver' } },
    { type: 'actuator', name: 'Fourier FSA Actuator', vendor: 'Fourier', specifications: { actuatorType: 'harmonic', ratedTorqueNm: 80, maxTorqueNm: 160, speedRpm: 50, weightKg: 1.5, integrationLevel: 'fully_integrated' } },
    { type: 'soc', name: 'NVIDIA Jetson AGX Orin', vendor: 'NVIDIA', specifications: { processNode: '8nm', topsMin: 200, topsMax: 275, location: 'onboard' } },
    { type: 'soc', name: 'NVIDIA Jetson Orin NX', vendor: 'NVIDIA', specifications: { processNode: '8nm', topsMin: 70, topsMax: 100, location: 'onboard' } },
    { type: 'soc', name: 'Tesla FSD Chip', vendor: 'Tesla', specifications: { processNode: '14nm', topsMin: 72, topsMax: 144, location: 'onboard' } },
    { type: 'soc', name: 'Qualcomm Snapdragon 8 Gen 2', vendor: 'Qualcomm', specifications: { processNode: '4nm', topsMin: 15, topsMax: 26, location: 'onboard' } },
    { type: 'sensor', name: 'Intel RealSense D435', vendor: 'Intel', specifications: { sensorType: 'depth_camera', resolution: '1280x720', range: '0.2-10m' } },
    { type: 'sensor', name: 'Velodyne VLP-16', vendor: 'Velodyne', specifications: { sensorType: 'lidar', resolution: '16 channels', range: '100m' } },
    { type: 'sensor', name: 'Force/Torque Sensor ATI Mini45', vendor: 'ATI', specifications: { sensorType: 'force_torque', resolution: '6-axis', range: '145N/5Nm' } },
    { type: 'power', name: 'Samsung SDI 21700', vendor: 'Samsung SDI', specifications: { batteryType: 'Li-ion', capacityWh: 5000, weightKg: 0.07 } },
    { type: 'power', name: 'CATL Cell Module', vendor: 'CATL', specifications: { batteryType: 'LFP', capacityWh: 10000, weightKg: 0.15 } },
  ];

  const componentMap: Record<string, string> = {};
  for (const c of componentsData) {
    const existing = await db.select().from(components).where(eq(components.name, c.name)).limit(1);
    if (existing.length > 0) {
      componentMap[c.name] = existing[0]!.id;
    } else {
      const [inserted] = await db.insert(components).values(c).returning();
      componentMap[c.name] = inserted!.id;
    }
  }
  console.log('Components seeded:', Object.keys(componentMap).length);

  // 10. 로봇-부품 연결
  const robotComponentLinks = [
    { robotName: 'Optimus Gen 2', componentName: 'Tesla Rotary Actuator', usageLocation: 'leg', quantity: 6 },
    { robotName: 'Optimus Gen 2', componentName: 'Tesla FSD Chip', usageLocation: 'head', quantity: 1 },
    { robotName: 'H1', componentName: 'Unitree A1 Motor', usageLocation: 'leg', quantity: 10 },
    { robotName: 'H1', componentName: 'NVIDIA Jetson AGX Orin', usageLocation: 'torso', quantity: 1 },
    { robotName: 'G1', componentName: 'Unitree A1 Motor', usageLocation: 'leg', quantity: 8 },
    { robotName: 'G1', componentName: 'NVIDIA Jetson Orin NX', usageLocation: 'torso', quantity: 1 },
    { robotName: 'GR-1', componentName: 'Fourier FSA Actuator', usageLocation: 'leg', quantity: 6 },
    { robotName: 'GR-1', componentName: 'NVIDIA Jetson AGX Orin', usageLocation: 'torso', quantity: 1 },
    { robotName: 'Digit', componentName: 'NVIDIA Jetson AGX Orin', usageLocation: 'torso', quantity: 1 },
    { robotName: 'Digit', componentName: 'Intel RealSense D435', usageLocation: 'head', quantity: 2 },
    { robotName: 'Figure 01', componentName: 'Intel RealSense D435', usageLocation: 'head', quantity: 2 },
    { robotName: 'CyberOne', componentName: 'Qualcomm Snapdragon 8 Gen 2', usageLocation: 'head', quantity: 1 },
  ];

  for (const link of robotComponentLinks) {
    const robotId = robotMap[link.robotName];
    const componentId = componentMap[link.componentName];
    if (!robotId || !componentId) continue;
    const existing = await db.select().from(robotComponents)
      .where(eq(robotComponents.robotId, robotId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(robotComponents).values({
        robotId,
        componentId,
        usageLocation: link.usageLocation,
        quantity: link.quantity,
      }).onConflictDoNothing();
    }
  }
  console.log('Robot-component links seeded');


  // 11. 적용 사례 데이터
  const applicationCasesData = [
    { robotName: 'Digit', environmentType: 'warehouse', taskType: 'picking', taskDescription: 'Amazon 물류센터에서 박스 이동 작업', deploymentStatus: 'pilot', demoEvent: 'Amazon Robotics Demo', demoDate: '2024-01-15' },
    { robotName: 'Digit', environmentType: 'warehouse', taskType: 'packing', taskDescription: 'GXO 물류센터 파일럿 배치', deploymentStatus: 'pilot', demoEvent: 'GXO Logistics Pilot', demoDate: '2024-03-01' },
    { robotName: 'Optimus Gen 2', environmentType: 'factory', taskType: 'assembly', taskDescription: 'Tesla 공장 내 배터리 셀 분류 작업', deploymentStatus: 'pilot', demoEvent: 'Tesla AI Day 2024', demoDate: '2024-10-10' },
    { robotName: 'Atlas (Electric)', environmentType: 'factory', taskType: 'assembly', taskDescription: 'Hyundai 자동차 공장 부품 운반', deploymentStatus: 'concept', demoEvent: 'Boston Dynamics Reveal', demoDate: '2024-04-17' },
    { robotName: 'Figure 01', environmentType: 'factory', taskType: 'assembly', taskDescription: 'BMW 공장 파일럿 프로그램', deploymentStatus: 'poc', demoEvent: 'BMW Partnership Announcement', demoDate: '2024-01-18' },
    { robotName: 'H1', environmentType: 'research_lab', taskType: 'other', taskDescription: '대학 연구실 보행 연구', deploymentStatus: 'production', demoEvent: 'Unitree Product Launch', demoDate: '2023-08-01' },
    { robotName: 'G1', environmentType: 'research_lab', taskType: 'other', taskDescription: '교육용 휴머노이드 플랫폼', deploymentStatus: 'production', demoEvent: 'Unitree G1 Launch', demoDate: '2024-05-13' },
    { robotName: 'Walker X', environmentType: 'retail', taskType: 'assistance', taskDescription: '전시장 안내 로봇', deploymentStatus: 'pilot', demoEvent: 'CES 2024', demoDate: '2024-01-09' },
    { robotName: 'GR-1', environmentType: 'healthcare', taskType: 'assistance', taskDescription: '재활 보조 로봇 시연', deploymentStatus: 'poc', demoEvent: 'World Robot Conference 2023', demoDate: '2023-08-16' },
    { robotName: 'Phoenix', environmentType: 'retail', taskType: 'picking', taskDescription: '소매점 재고 관리 시연', deploymentStatus: 'poc', demoEvent: 'Sanctuary AI Demo', demoDate: '2024-02-20' },
    { robotName: 'NEO', environmentType: 'home', taskType: 'assistance', taskDescription: '가정용 도우미 로봇 컨셉', deploymentStatus: 'concept', demoEvent: '1X NEO Reveal', demoDate: '2024-08-01' },
  ];

  for (const ac of applicationCasesData) {
    const robotId = robotMap[ac.robotName];
    if (!robotId) continue;
    const existing = await db.select().from(applicationCases)
      .where(eq(applicationCases.robotId, robotId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(applicationCases).values({
        robotId,
        environmentType: ac.environmentType,
        taskType: ac.taskType,
        taskDescription: ac.taskDescription,
        deploymentStatus: ac.deploymentStatus,
        demoEvent: ac.demoEvent,
        demoDate: ac.demoDate,
      });
    }
  }
  console.log('Application cases seeded');

  console.log('\n✅ Humanoid robot seed completed successfully!');
  process.exit(0);
}

seedHumanoid().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
