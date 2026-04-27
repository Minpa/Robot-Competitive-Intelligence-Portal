import {
  db,
  companies,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  powerSpecs,
  workforceData,
  talentTrends,
  components,
  robotComponents,
  applicationCases,
} from './index.js';
import { eq, sql } from 'drizzle-orm';

async function seedHumanoid() {
  console.log('Seeding humanoid robot data...');

  // Fix legacy locomotionType values: 'biped' → 'bipedal'
  await db.execute(
    sql`UPDATE humanoid_robots SET locomotion_type = 'bipedal' WHERE locomotion_type = 'biped'`
  );
  console.log('Fixed legacy locomotionType values (biped → bipedal)');

  // 데이터 신뢰도 복구: 확인되지 않은 미래 로봇 제거
  // (G1 Pro, Optimus Production, Atlas Pro, Digit v3, Phoenix Gen 8, HUBO 2는 공식 발표 근거 없음)
  const fabricatedNames = ['G1 Pro', 'Optimus Production', 'Atlas Pro', 'Digit v3', 'Phoenix Gen 8', 'HUBO 2'];
  const removed = await db.execute(
    sql`DELETE FROM humanoid_robots WHERE name = ANY(${fabricatedNames})`
  );
  console.log(`Removed unverified fabricated robots (affected rows reported by DB)`);
  void removed;

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
    { name: 'Toyota', country: 'Japan', category: 'automotive', city: 'Toyota City', foundingYear: 1937, mainBusiness: '자동차, 로봇' },
    { name: 'Honda', country: 'Japan', category: 'automotive', city: 'Tokyo', foundingYear: 1948, mainBusiness: '자동차, 로봇' },
    { name: 'SoftBank Robotics', country: 'Japan', category: 'robotics', city: 'Tokyo', foundingYear: 2014, mainBusiness: '서비스 로봇' },
    { name: 'Aeolus Robotics', country: 'Taiwan', category: 'robotics', city: 'Taipei', foundingYear: 2016, mainBusiness: '서비스 로봇' },
    { name: 'Diligent Robotics', country: 'USA', category: 'robotics', city: 'Austin', foundingYear: 2017, mainBusiness: '의료 서비스 로봇' },
    { name: 'PAL Robotics', country: 'Spain', category: 'robotics', city: 'Barcelona', foundingYear: 2004, mainBusiness: '서비스/연구 로봇' },
    { name: 'Savioke', country: 'USA', category: 'robotics', city: 'San Jose', foundingYear: 2013, mainBusiness: '호텔 배송 로봇' },
    { name: 'Rainbow Robotics', country: 'Korea', category: 'robotics', city: 'Daejeon', foundingYear: 2011, mainBusiness: '휴머노이드/협동 로봇' },
    { name: 'Apptronik', country: 'USA', category: 'robotics', city: 'Austin', foundingYear: 2016, mainBusiness: '범용 휴머노이드 로봇' },
    { name: 'Kepler Robot', country: 'China', category: 'robotics', city: 'Shanghai', foundingYear: 2023, mainBusiness: '범용 휴머노이드 로봇' },
    { name: 'Engineered Arts', country: 'UK', category: 'robotics', city: 'Penryn', foundingYear: 2004, mainBusiness: '엔터테인먼트/HRI 로봇' },
    { name: 'Mentee Robotics', country: 'Israel', category: 'robotics', city: 'Haifa', foundingYear: 2022, mainBusiness: 'AI 휴머노이드 로봇' },
    { name: 'LimX Dynamics', country: 'China', category: 'robotics', city: 'Shenzhen', foundingYear: 2022, mainBusiness: '이족 보행 로봇' },
    { name: 'Agibot', country: 'China', category: 'robotics', city: 'Shanghai', foundingYear: 2023, mainBusiness: 'AI 범용 로봇' },
    // CES 2027 forecast 추가 회사들
    { name: 'Samsung Electronics', country: 'Korea', category: 'electronics', city: 'Suwon', foundingYear: 1969, mainBusiness: '전자제품·반도체·로봇' },
    { name: 'Hyundai Motor Group', country: 'Korea', category: 'automotive', city: 'Seoul', foundingYear: 1967, mainBusiness: '자동차·로보틱스 (Boston Dynamics 보유)' },
    { name: 'Kia Corp', country: 'Korea', category: 'automotive', city: 'Seoul', foundingYear: 1944, mainBusiness: '자동차·HMG 로보틱스 ecosystem' },
    { name: 'Hyundai WIA', country: 'Korea', category: 'manufacturing', city: 'Changwon', foundingYear: 1976, mainBusiness: '공작기계·H-motion 로봇' },
    { name: 'HL Robotics', country: 'Korea', category: 'robotics', city: 'Pangyo', foundingYear: 2024, mainBusiness: '주차·보안 로봇 (HL Mando)' },
    { name: 'CJ Logistics', country: 'Korea', category: 'logistics', city: 'Seoul', foundingYear: 1930, mainBusiness: '물류·휴머노이드 deploy' },
    { name: 'BodyFriend', country: 'Korea', category: 'healthcare', city: 'Seoul', foundingYear: 2007, mainBusiness: '헬스케어 로봇·안마의자' },
    { name: 'Doosan Robotics', country: 'Korea', category: 'robotics', city: 'Suwon', foundingYear: 2015, mainBusiness: '협동·휴머노이드 로봇' },
    { name: 'TCL', country: 'China', category: 'electronics', city: 'Huizhou', foundingYear: 1981, mainBusiness: '가전·동반자 로봇' },
    { name: 'Hisense', country: 'China', category: 'electronics', city: 'Qingdao', foundingYear: 1969, mainBusiness: '가전·스마트홈 로봇' },
    { name: 'Sharpa Robotics', country: 'Singapore', category: 'robotics', city: 'Singapore', foundingYear: 2023, mainBusiness: '풀자율 휴머노이드·dexterous hand' },
    { name: 'NEURA Robotics', country: 'Germany', category: 'robotics', city: 'Metzingen', foundingYear: 2019, mainBusiness: '인지형 휴머노이드 (4NE1)' },
    { name: 'KEENON Robotics', country: 'China', category: 'robotics', city: 'Shanghai', foundingYear: 2010, mainBusiness: '호스피탈리티·서비스 로봇' },
    { name: 'SwitchBot', country: 'Japan', category: 'robotics', city: 'Tokyo', foundingYear: 2016, mainBusiness: '스마트홈·가정 휴머노이드' },
    { name: 'Roborock', country: 'China', category: 'robotics', city: 'Beijing', foundingYear: 2014, mainBusiness: '청소·휠-레그 로봇' },
    { name: 'Dreame Technology', country: 'China', category: 'robotics', city: 'Suzhou', foundingYear: 2017, mainBusiness: '청소·휴머노이드 로봇' },
    { name: 'NVIDIA', country: 'USA', category: 'semiconductor', city: 'Santa Clara', foundingYear: 1993, mainBusiness: 'GPU·Physical AI 플랫폼 (GR00T·Cosmos·Jetson)' },
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
      announcementYear: 2023, announcementQuarter: 4,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'north_america',
      description: 'Tesla의 2세대 휴머노이드 로봇. 개선된 손과 보행 능력.',
      imageUrl: '/robots/optimus.jpg',
    },
    {
      companyName: 'Boston Dynamics',
      name: 'Atlas (Electric)',
      announcementYear: 2024, announcementQuarter: 2,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'north_america',
      description: '전기 구동 방식의 새로운 Atlas. 자동차 제조 환경 최적화.',
      imageUrl: '/robots/atlas.jpg',
    },
    {
      companyName: 'Agility Robotics',
      name: 'Digit',
      announcementYear: 2023, announcementQuarter: 3,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'gripper',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: '물류 창고용 휴머노이드. Amazon과 협력 중.',
      imageUrl: '/robots/digit.webp',
    },
    {
      companyName: 'Figure AI',
      name: 'Figure 01',
      announcementYear: 2024, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: 'OpenAI와 협력한 범용 휴머노이드 로봇.',
      imageUrl: '/robots/figure01.jpg',
    },
    {
      companyName: '1X Technologies',
      name: 'NEO',
      announcementYear: 2024, announcementQuarter: 2,
      status: 'development',
      purpose: 'home',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'europe',
      description: '가정용 안드로이드 로봇. OpenAI 투자.',
      imageUrl: '/robots/neo.webp',
    },
    {
      companyName: 'Unitree Robotics',
      name: 'H1',
      announcementYear: 2023, announcementQuarter: 3,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'gripper',
      commercializationStage: 'commercial',
      region: 'china',
      description: '저가형 휴머노이드. 연구/교육용.',
      imageUrl: '/robots/unitree-h1.jpg',
    },
    {
      companyName: 'Unitree Robotics',
      name: 'G1',
      announcementYear: 2024, announcementQuarter: 2,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'china',
      description: '소형 휴머노이드. $16,000 가격대.',
      imageUrl: '/robots/unitree-g1.jpg',
    },
    {
      companyName: 'UBTECH',
      name: 'Walker X',
      announcementYear: 2021, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: '서비스 휴머노이드. 전시/안내용.',
      imageUrl: '/robots/walker-x.png',
    },
    {
      companyName: 'Xiaomi',
      name: 'CyberOne',
      announcementYear: 2022, announcementQuarter: 3,
      status: 'development',
      purpose: 'home',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'concept',
      region: 'china',
      description: '샤오미의 휴머노이드 로봇 컨셉.',
      imageUrl: '/robots/cyberone.jpg',
    },
    {
      companyName: 'Fourier Intelligence',
      name: 'GR-1',
      announcementYear: 2023, announcementQuarter: 3,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: '범용 휴머노이드. 재활 기술 기반.',
      imageUrl: '/robots/gr1.webp',
    },
    {
      companyName: 'Sanctuary AI',
      name: 'Phoenix',
      announcementYear: 2023, announcementQuarter: 2,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: '범용 AI 휴머노이드. 인지 AI 탑재.',
      imageUrl: '/robots/phoenix.webp',
    },
    // 휠베이스 로봇
    {
      companyName: 'Toyota',
      name: 'Toyota HSR',
      announcementYear: 2015, announcementQuarter: 2,
      status: 'commercial',
      purpose: 'home',
      locomotionType: 'wheeled',
      handType: 'gripper',
      commercializationStage: 'pilot',
      region: 'asia',
      description: 'Toyota의 가정용 서비스 로봇. 휠베이스에 단일 팔 장착.',
      imageUrl: null,
    },
    {
      companyName: 'SoftBank Robotics',
      name: 'Pepper',
      announcementYear: 2014, announcementQuarter: 2,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'wheeled',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'asia',
      description: 'SoftBank의 감정 인식 서비스 로봇. 소매/접객 분야 배치.',
      imageUrl: '/robots/pepper.jpg',
    },
    {
      companyName: 'Aeolus Robotics',
      name: 'Aeo',
      announcementYear: 2022, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'wheeled',
      handType: 'gripper',
      commercializationStage: 'pilot',
      region: 'asia',
      description: 'Aeolus의 자율 서비스 로봇. 호텔/병원 배송 및 순찰.',
      imageUrl: null,
    },
    {
      companyName: 'Diligent Robotics',
      name: 'Moxi',
      announcementYear: 2019, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'wheeled',
      handType: 'gripper',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: 'Diligent Robotics의 병원용 로봇. 물품 배송 및 간호 보조.',
      imageUrl: null,
    },
    {
      companyName: 'PAL Robotics',
      name: 'TIAGo',
      announcementYear: 2015, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'wheeled',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'europe',
      description: 'PAL Robotics의 연구/서비스용 모바일 매니퓰레이터.',
      imageUrl: '/robots/tiago.jpg',
    },
    {
      companyName: 'Savioke',
      name: 'Relay',
      announcementYear: 2014, announcementQuarter: 3,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'wheeled',
      handType: 'none',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: 'Savioke의 호텔 배송 로봇. 자율 주행 배달.',
      imageUrl: null,
    },
    // 2025 robots
    {
      companyName: 'Tesla',
      name: 'Optimus Gen 3',
      announcementYear: 2025, announcementQuarter: 4,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'north_america',
      description: 'Tesla의 3세대 Optimus. 향상된 자율 작업 능력과 공장 배치 시작.',
      imageUrl: '/robots/optimus.jpg',
    },
    {
      companyName: 'Figure AI',
      name: 'Figure 02',
      announcementYear: 2025, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: 'Figure AI 2세대 모델. BMW 공장 본격 배치 준비.',
      imageUrl: '/robots/figure02.png',
    },
    {
      companyName: '1X Technologies',
      name: 'NEO Beta',
      announcementYear: 2025, announcementQuarter: 2,
      status: 'development',
      purpose: 'home',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'europe',
      description: 'NEO 베타 버전. 가정 환경 실증 테스트 진행.',
      imageUrl: '/robots/neo.webp',
    },
    // 하이브리드 로봇
    {
      companyName: 'Honda',
      name: 'Honda Avatar Robot',
      announcementYear: 2024, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'hybrid',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'asia',
      description: 'Honda의 원격 조종 아바타 로봇. 다리+휠 하이브리드 이동.',
      imageUrl: '/robots/asimo.jpg',
    },
    {
      companyName: 'Rainbow Robotics',
      name: 'HUBO',
      announcementYear: 2004, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'hybrid',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'asia',
      description: 'Rainbow Robotics의 HUBO. 보행+무릎 휠 하이브리드. DARPA 챌린지 우승.',
      imageUrl: '/robots/hubo.jpg',
    },
    {
      companyName: 'PAL Robotics',
      name: 'TALOS',
      announcementYear: 2017, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'hybrid',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'europe',
      description: 'PAL Robotics의 전신 휴머노이드. 연구용 하이브리드 이동 플랫폼.',
      imageUrl: '/robots/tiago.jpg',
    },
    // ── 2025-2026 신규 로봇 (AWE2026 업데이트) ──────────────────
    {
      companyName: 'Apptronik',
      name: 'Apollo',
      announcementYear: 2024, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: '범용 휴머노이드. Mercedes-Benz 제조 라인 파일럿. NASA 협력.',
      imageUrl: null,
    },
    {
      companyName: 'Apptronik',
      name: 'Apollo 2',
      announcementYear: 2026, announcementQuarter: 2,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'north_america',
      description: 'Apollo 2세대. GE Aerospace 공장 배치. 73kg, 25kg 페이로드.',
      imageUrl: null,
    },
    {
      companyName: 'Kepler Robot',
      name: 'Kepler Forerunner K2',
      announcementYear: 2025, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: 'Kepler의 범용 휴머노이드. 40DOF, 자동차 조립 라인 실증.',
      imageUrl: null,
    },
    {
      companyName: 'Engineered Arts',
      name: 'Ameca',
      announcementYear: 2021, announcementQuarter: 4,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'europe',
      description: '세계 최고 수준의 표정/제스처 표현 로봇. HRI 연구 및 엔터테인먼트.',
      imageUrl: null,
    },
    {
      companyName: 'Mentee Robotics',
      name: 'MenteeBot',
      announcementYear: 2025, announcementQuarter: 3,
      status: 'development',
      purpose: 'home',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'europe',
      description: 'Amnon Shashua(Mobileye 창업자) 설립. 자연어 명령 기반 가정용 로봇.',
      imageUrl: null,
    },
    {
      companyName: 'LimX Dynamics',
      name: 'CL-1',
      announcementYear: 2025, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'china',
      description: '170cm 이족 보행 로봇. 험지 적응형 보행 제어. RL 기반 로코모션.',
      imageUrl: null,
    },
    {
      companyName: 'Agibot',
      name: 'Genie G1',
      announcementYear: 2025, announcementQuarter: 2,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'china',
      description: 'Agibot의 범용 AI 로봇. 대규모 데이터 기반 행동 학습. BYD 투자.',
      imageUrl: null,
    },
    {
      companyName: 'Unitree Robotics',
      name: 'H1-2',
      announcementYear: 2026, announcementQuarter: 3,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'china',
      description: 'H1 후속 모델. 3D 비전 + LiDAR 통합, $90K 가격대.',
      imageUrl: '/robots/unitree-h1.jpg',
    },
    {
      companyName: 'UBTECH',
      name: 'Walker S1',
      announcementYear: 2025, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'china',
      description: 'Walker 산업용 모델. NIO 전기차 공장 품질 검사 배치.',
      imageUrl: '/robots/walker-x.png',
    },
    {
      companyName: 'Xiaomi',
      name: 'CyberOne 2',
      announcementYear: 2026, announcementQuarter: 3,
      status: 'development',
      purpose: 'home',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'china',
      description: 'CyberOne 2세대. 향상된 AI 추론 및 가정 서비스 시나리오.',
      imageUrl: '/robots/cyberone.jpg',
    },
    {
      companyName: 'Fourier Intelligence',
      name: 'GR-2',
      announcementYear: 2026, announcementQuarter: 2,
      status: 'development',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'china',
      description: 'GR-1 후속 모델. NVIDIA Isaac 플랫폼 통합, 의료/물류 실증.',
      imageUrl: '/robots/gr1.webp',
    },

    // ============ CES 2027 FORECAST ROBOTS (예측 데이터) ============
    // 각 항목은 사용자 제공 분석표 (CES 2026 참가 → 2027 예측) 기반
    // 국내 ─────────────────────────────────────────────
    {
      companyName: 'Samsung Electronics',
      name: 'Samsung Humanoid (가칭)',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'service', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'concept', region: 'korea',
      description: 'CES 2027 출품 예상. 26년 1월 실적발표 컨콜에서 휴머노이드 로봇산업 실질 성과의 한해로 발표 예정.',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 미출품 후 27년 첫 출품 예상. 26년 1월 실적발표에서 휴머노이드를 핵심 사업으로 발표 → CES 2027에 데뷔 무대 가능성 高. Wynn 호텔 부스 임대 패턴.',
      forecastSources: 'CES 2026 미출품 (Wynn 호텔 부스 패턴); 26년 1월 실적발표 컨콜 가이던스; 삼성전자 미래사업기획단 휴머노이드 R&D 보도',
    },
    {
      companyName: 'Hyundai Motor Group',
      name: 'Atlas Production',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'korea',
      description: 'Atlas 양산형 + Gemini Robotics 통합. HMGMA 1년 deploy 데이터 + 첫 비-Hyundai 외부고객 발표 가능성 高.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 West Hall 단독 부스 → 27년 양산 외부 공급 시점에 맞춘 발표. 연 3만대 전용 공장 가동 실적 어필. Atlas 양산형 + 26년 Gemini Robotics 통합 로드맵.',
      forecastSources: 'CES 2026 West Hall 부스 (Hyundai); HMGMA 휴머노이드 deploy 보도; Boston Dynamics-Google DeepMind Gemini Robotics 협업 발표',
    },
    {
      companyName: 'Kia Corp',
      name: 'Kia PBV Robot',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'wheeled',
      handType: 'multi_finger', commercializationStage: 'concept', region: 'korea',
      description: '기아 첫 CES 참가 — HMG ecosystem 확장 메시지 (Mobis 액추에이터 + 글로비스 SCM 연계).',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: '기아社 CES 첫 참가 예정. Hyundai Motor Group 통합 ecosystem 메시지로 PBV(Purpose-Built Vehicle) 기반 로보틱스 차량 컨셉 발표 가능성.',
      forecastSources: 'CES 2027 기아 첫 참가 발표; HMG 그룹 전략 (Mobis·글로비스 통합); CES 2024 PBV 컨셉카 발표 패턴',
    },
    {
      companyName: 'CJ Logistics',
      name: 'CJ Mobile Manipulator',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'wheeled',
      handType: 'multi_finger', commercializationStage: 'poc', region: 'korea',
      description: 'Rainbow Robotics 협업 「이동형 양팔 로봇」 첫 출품 가능성. 군포FC deploy + TES연구소 RFM(로봇파운데이션모델).',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 Central Hall 부스. 26년 이재현·이선호 시찰 단계 → 27년 Rainbow Robotics 협업 양팔 로봇 데뷔 가능성. 군포FC 휴머노이드 양산 deploy 실적 어필.',
      forecastSources: 'CES 2026 Central Hall 부스; Rainbow Robotics 협업 MOU 보도; CJ대한통운 군포FC 자동화 보도; TES연구소 RFM 발표',
    },
    {
      companyName: 'BodyFriend',
      name: '733 Healthcare AI',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'home', locomotionType: 'wheeled',
      handType: 'gripper', commercializationStage: 'pilot', region: 'korea',
      description: '733 헬스케어 로봇 (전신 스트레칭) + Gemini LLM 탑재 양산. 메디컬팬텀로보 등 의료기기 라인업 확장.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026에 26.8월 출시 예정 발표 → CES 2027 양산형 + B2B/렌탈 전략 강화. "헬스케어 휴머노이드" 정체성 굳히기.',
      forecastSources: 'CES 2026 Central Hall 부스 (733 발표); BodyFriend Gemini 탑재 26.8월 출시 가이던스; 메디컬팬텀로보 자체 의료기기 인증 추진',
    },
    {
      companyName: 'HL Robotics',
      name: 'Parkie + Goalie Fleet',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'commercial', purpose: 'service', locomotionType: 'wheeled',
      handType: 'gripper', commercializationStage: 'commercial', region: 'korea',
      description: 'Parkie 글로벌 deploy 누적 사례 + RaaS 비즈모델 公개. SEA 액추에이터·자율주행 SW 부품화.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 West Hall 부스 + 현대건설·엘리베이터 MOU 후속. RaaS 비즈모델 공개 + 글로벌 누적 사례 어필 시점.',
      forecastSources: 'CES 2026 West Hall 부스 (HL Mando); 현대건설·엘리베이터 MOU 발표; HL Mando spin-off → HL Robotics 신설 보도',
    },

    // 해외 ─────────────────────────────────────────────
    {
      companyName: 'Agibot',
      name: 'Expedition A4',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'china',
      description: '누적 1만→3~5만대 + Genie Sim 4.0 + Las Vegas 호텔 컨시어지 deploy 라이브. X2 24대 군무 시연.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 풀라인업 데뷔 (X1·X2·A2·G2·D1, 5,100대 #1) → CES 2027 누적 출하 + Genie Sim 4.0 신규 + 호텔 deploy. Spring Festival Gala X2 24대 군무 자산 글로벌화.',
      forecastSources: 'CES 2026 North Hall 부스; Agibot 5,100대 출하 보도 (글로벌 #1); Spring Festival Gala 2025 X2 24대 군무 영상; Las Vegas 호텔 deploy MOU 추정',
    },
    {
      companyName: 'Unitree Robotics',
      name: 'G3',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'service', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'prototype', region: 'china',
      description: 'STAR Market IPO 후 첫 CES — G3 + R2 데뷔. G1 가격 $13.5K→$10K 추가 인하 + UnifoLM 차세대 모델.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 G1·H2·R1 + App Store 발표 (4,200~5,500대 #2) → IPO 후 첫 CES에서 차세대 G3·R2 데뷔. 인간 vs 로봇 마라톤·100m 라이브 가능성.',
      forecastSources: 'CES 2026 North Hall 부스; Unitree STAR Market IPO 신청 보도; G1 가격 인하 트렌드; UnifoLM 모델 발표',
    },
    {
      companyName: 'Sharpa Robotics',
      name: 'SharpaWave Production',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'other',
      description: 'SharpaWave 양산 가격 公개 + 산업 deploy 사례 (제조·실험실). 22 DOF 손 + 1,000+ 촉각센서/지문.',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 North 풀자율 휴머노이드 + SharpaWave 22 DOF 손 데뷔 → 27년 양산 가격 공개 + 산업 deploy. 韓·美 핸드 부품 직접 위협 (PaXini 경쟁).',
      forecastSources: 'CES 2026 North Hall 부스; Sharpa VLTA 모델 발표; SharpaWave 1,000+ 촉각센서 데모 영상',
    },
    {
      companyName: 'KEENON Robotics',
      name: 'XMAN-R2',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'service', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'china',
      description: 'XMAN-R1 (호스피탈리티) 美 첫 데뷔 후 R2 후속. 글로벌 호텔 chain 정식 사업 발표 (Marriott·Hilton 추정).',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 XMAN-R1 데뷔 + Shangri-La 모델 → 27년 R2 후속 + Marriott·Hilton 공식 발표. 누적 10만+대 출하 어필 + 가정 시장 진입.',
      forecastSources: 'CES 2026 North Hall 부스; KEENON Shangri-La 호텔 deploy 발표; KOM 2.0 VLA 모델 출시',
    },
    {
      companyName: 'Fourier Intelligence',
      name: 'Care-bot Production',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'service', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'china',
      description: 'Care-bot 풀사이즈 의료·재활 deploy 누적 사례. GR3/Care-bot 후속 + 양손 정밀 의료 작업 시연.',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 Care-bot 北美 데뷔 → CES 2027 의료·재활 deploy 누적 사례 + 노약자 케어 시장 진입 본격화.',
      forecastSources: 'CES 2026 North Hall 부스; Fourier 재활 로봇 의료기기 인증; Care-bot 노인 케어 시범 사업',
    },
    {
      companyName: 'SwitchBot',
      name: 'Onero H1 Global',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'home', locomotionType: 'wheeled',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'japan',
      description: '글로벌 정식 출시 + 가격 公개 ($15~20K 추정) + B2C 채널 (Best Buy·Amazon) 발표. 휠베이스+22 DOF+OmniSense VLA on-device.',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 Venetian Onero H1 데뷔 → CES 2027 정식 출시 + 가격 공개. 일본 가정 (좁은 공간) 시뮬 부스 + LG ThinQ 비교 메시지. ★ CLOiD form factor 정면 경쟁.',
      forecastSources: 'CES 2026 Venetian Expo 부스; Onero H1 OmniSense VLA on-device 발표; SwitchBot 글로벌 B2C 채널 확장 보도',
    },
    {
      companyName: 'Agility Robotics',
      name: 'Digit V5',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'commercial', region: 'north_america',
      description: 'Hall 이동 (Fontainebleau→North Hall) — 노출도 강화. RaaS 구독료 정식 公개 ($30~50/시간) + 신규 OEM 1~2社 + 양손 강화.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 Digit (Toyota Canada 7대·GXO·Spanx·Amazon) — RaaS 산업 첫 상용 → CES 2027 Hall 이동으로 中 진영(North Hall)과 동급 무대. RaaS 구독료 정식 공개 시점.',
      forecastSources: 'CES 2026 Fontainebleau 부스 (Agility); Toyota Canada 7대 deploy 발표; GXO·Spanx·Amazon RaaS 계약 보도',
    },
    {
      companyName: 'Dreame Technology',
      name: 'Dreame Humanoid',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'home', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'concept', region: 'china',
      description: '면적 확대 = 휴머노이드 풀데뷔 가능성 高. 「Bionic + Humanoid 융합」 — LG·Samsung 가정 가전 직접 위협.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 부스 3개 임대 (역대 최대) — Cyber10 Ultra·CyberX·Nebula Next 01 → CES 2027 면적 확대 = 가전+청소+가정 휴머노이드 통합 ecosystem. Bionic + Humanoid 융합 메시지.',
      forecastSources: 'CES 2026 Central Hall 부스 3개 (Dreame); Cyber10 Ultra 다관절 로봇팔 발표; Nebula Next 01 콘셉트카 공개',
    },
    {
      companyName: 'Roborock',
      name: 'G-Rover Humanoid',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'home', locomotionType: 'hybrid',
      handType: 'gripper', commercializationStage: 'concept', region: 'china',
      description: 'Hall 이동 (Venetian→Central) — 가전 ecosystem 입성. 휴머노이드 진입 가능성 高 (Dreame Cyber10 패턴 추종) + Saros 후속.',
      dataType: 'forecast', forecastConfidence: 'medium',
      forecastRationale: 'CES 2026 G-Rover 휠-레그 청소로봇 (계단 자율 등반) — 2D→3D 공간 첫 진입 → CES 2027 Central Hall 이동으로 LG·Samsung 정면 경쟁 위치.',
      forecastSources: 'CES 2026 Venetian Expo 부스; G-Rover 휠-레그 청소로봇 발표; Roborock Hall 이동 가이던스',
    },
    {
      companyName: 'NEURA Robotics',
      name: '4NE1 Gen 4',
      announcementYear: 2027, announcementQuarter: 2,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'europe',
      description: '4NE1 Gen 3 (Studio Porsche 디자인 + 인공피부 + Neuraverse fleet) 후속. CES 미확정 — Hannover Messe 2027 집중 가능성 高.',
      dataType: 'forecast', forecastConfidence: 'low',
      forecastRationale: 'CES 2026 4NE1 Gen 3 데뷔 → 27년 CES 참가 미확정. Schaeffler·BMW 동맹 우선시 Hannover Messe 2027 집중 추정. EU 主권 AI 메시지.',
      forecastSources: 'CES 2026 North Hall 부스 (NEURA); Studio Porsche 디자인 협업; Schaeffler·BMW NEURA 동맹 발표; Hannover Messe 2027 우선순위 추정',
    },
    {
      companyName: 'NVIDIA',
      name: 'GR00T N2.0',
      announcementYear: 2027, announcementQuarter: 1,
      status: 'development', purpose: 'industrial', locomotionType: 'bipedal',
      handType: 'multi_finger', commercializationStage: 'pilot', region: 'north_america',
      description: 'GR00T N2.0/3.0 + Cosmos 2.0 + 동반 출연 15~20社 확대. Physical AI ChatGPT moment → Production moment 메시지.',
      dataType: 'forecast', forecastConfidence: 'high',
      forecastRationale: 'CES 2026 Jensen Huang 키노트 — GR00T N1.6 + Cosmos + Jetson Thor + 휴머노이드 7社 동반 출연 → CES 2027 N2.0/3.0 + 동반 출연 15~20社 확대.',
      forecastSources: 'CES 2026 Fontainebleau 키노트 (Jensen Huang); GR00T N1.6 발표; Jetson Thor 4x 성능 발표; Industrial AI Cloud 누적 사례',
    },
  ];

  const robotMap: Record<string, string> = {};
  for (const r of robotsData) {
    const companyId = companyMap[r.companyName];
    if (!companyId) continue;
    const r2 = r as typeof r & {
      dataType?: 'confirmed' | 'forecast';
      forecastRationale?: string;
      forecastSources?: string;
      forecastConfidence?: 'high' | 'medium' | 'low';
    };
    const existing = await db.select().from(humanoidRobots).where(eq(humanoidRobots.name, r.name)).limit(1);
    if (existing.length > 0) {
      robotMap[r.name] = existing[0]!.id;
      // Update imageUrl, announcementQuarter, and forecast fields for existing robots
      await db.update(humanoidRobots).set({
        ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        announcementQuarter: r.announcementQuarter || 1,
        ...(r2.dataType ? { dataType: r2.dataType } : {}),
        ...(r2.forecastRationale !== undefined ? { forecastRationale: r2.forecastRationale } : {}),
        ...(r2.forecastSources !== undefined ? { forecastSources: r2.forecastSources } : {}),
        ...(r2.forecastConfidence !== undefined ? { forecastConfidence: r2.forecastConfidence } : {}),
      }).where(eq(humanoidRobots.id, existing[0]!.id));
    } else {
      const [inserted] = await db.insert(humanoidRobots).values({
        companyId,
        name: r.name,
        announcementYear: r.announcementYear,
        announcementQuarter: r.announcementQuarter || 1,
        status: r.status,
        purpose: r.purpose,
        locomotionType: r.locomotionType,
        handType: r.handType,
        commercializationStage: r.commercializationStage,
        region: r.region,
        description: r.description,
        imageUrl: r.imageUrl,
        dataType: r2.dataType || 'confirmed',
        forecastRationale: r2.forecastRationale,
        forecastSources: r2.forecastSources,
        forecastConfidence: r2.forecastConfidence,
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
    'Optimus Gen 3': { heightCm: 173, weightKg: 55, payloadKg: 25, dofCount: 32, maxSpeedMps: 3.0, operationTimeHours: 6 },
    'Figure 02': { heightCm: 170, weightKg: 58, payloadKg: 25, dofCount: 44, maxSpeedMps: 1.5, operationTimeHours: 6 },
    'NEO Beta': { heightCm: 165, weightKg: 29, payloadKg: 25, dofCount: 40, maxSpeedMps: 4.0, operationTimeHours: 6 },
  };

  for (const [robotName, spec] of Object.entries(bodySpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(bodySpecs).where(eq(bodySpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(bodySpecs).values({ robotId, ...spec });
    } else {
      await db.update(bodySpecs).set(spec).where(eq(bodySpecs.robotId, robotId));
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
    'Optimus Gen 3': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 120, isInterchangeable: false },
    'Figure 02': { handType: 'multi_finger', fingerCount: 5, handDof: 18, gripForceN: 120, isInterchangeable: false },
    'NEO Beta': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 90, isInterchangeable: false },
  };

  for (const [robotName, spec] of Object.entries(handSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(handSpecs).where(eq(handSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(handSpecs).values({ robotId, ...spec });
    } else {
      await db.update(handSpecs).set(spec).where(eq(handSpecs.robotId, robotId));
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
    'Optimus Gen 3': { mainSoc: 'Tesla AI5 Chip', topsMin: 200, topsMax: 400, architectureType: 'onboard' },
    'Figure 02': { mainSoc: 'NVIDIA Thor', topsMin: 1000, topsMax: 2000, architectureType: 'hybrid' },
    'NEO Beta': { mainSoc: 'NVIDIA Jetson Orin', topsMin: 40, topsMax: 275, architectureType: 'onboard' },
  };

  for (const [robotName, spec] of Object.entries(computingSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(computingSpecs).where(eq(computingSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(computingSpecs).values({ robotId, ...spec });
    } else {
      await db.update(computingSpecs).set(spec).where(eq(computingSpecs.robotId, robotId));
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
    'Optimus Gen 3': { batteryType: 'Li-ion', capacityWh: 3000, operationTimeHours: 6, chargingMethod: 'fixed' },
    'Figure 02': { batteryType: 'Li-ion', capacityWh: 3000, operationTimeHours: 6, chargingMethod: 'fixed' },
    'NEO Beta': { batteryType: 'Li-ion', capacityWh: 2000, operationTimeHours: 6, chargingMethod: 'fixed' },
  };

  for (const [robotName, spec] of Object.entries(powerSpecsData)) {
    const robotId = robotMap[robotName];
    if (!robotId) continue;
    const existing = await db.select().from(powerSpecs).where(eq(powerSpecs.robotId, robotId)).limit(1);
    if (existing.length === 0) {
      await db.insert(powerSpecs).values({ robotId, ...spec });
    } else {
      await db.update(powerSpecs).set(spec).where(eq(powerSpecs.robotId, robotId));
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
    { type: 'soc', name: 'NVIDIA Jetson AGX Orin', vendor: 'NVIDIA', specifications: { processNode: '8nm', topsMin: 200, topsMax: 275, location: 'onboard', powerConsumption: 60, topsPerWatt: 4.58, releaseYear: 2022 } },
    { type: 'soc', name: 'NVIDIA Jetson Orin NX', vendor: 'NVIDIA', specifications: { processNode: '8nm', topsMin: 70, topsMax: 100, location: 'onboard', powerConsumption: 25, topsPerWatt: 4, releaseYear: 2022 } },
    { type: 'soc', name: 'Tesla FSD Chip', vendor: 'Tesla', specifications: { processNode: '14nm', topsMin: 72, topsMax: 144, location: 'onboard', powerConsumption: 36, topsPerWatt: 4, releaseYear: 2019 } },
    { type: 'soc', name: 'Qualcomm Snapdragon 8 Gen 2', vendor: 'Qualcomm', specifications: { processNode: '4nm', topsMin: 15, topsMax: 26, location: 'onboard', powerConsumption: 10, topsPerWatt: 2.6, releaseYear: 2022 } },
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
      // Update specifications to ensure all fields are present
      await db.update(components)
        .set({ specifications: c.specifications, vendor: c.vendor, updatedAt: new Date() })
        .where(eq(components.name, c.name));
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
    { robotName: 'Optimus Gen 3', environmentType: 'factory', taskType: 'assembly', taskDescription: 'Tesla 공장 파일럿 라인 배치', deploymentStatus: 'pilot', demoEvent: 'Tesla AI Day 2025', demoDate: '2025-06-15' },
    { robotName: 'Figure 02', environmentType: 'factory', taskType: 'assembly', taskDescription: 'BMW Spartanburg 공장 PoC', deploymentStatus: 'poc', demoEvent: 'Figure BMW Demo', demoDate: '2025-03-20' },
    { robotName: 'NEO Beta', environmentType: 'home', taskType: 'assistance', taskDescription: '노르웨이 가정 환경 실증', deploymentStatus: 'pilot', demoEvent: '1X Home Trial', demoDate: '2025-09-01' },
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
