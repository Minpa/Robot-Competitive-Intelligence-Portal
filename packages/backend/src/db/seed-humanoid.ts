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
    {
      companyName: 'Unitree Robotics',
      name: 'G1 Pro',
      announcementYear: 2025, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'service',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'china',
      description: 'G1 업그레이드 모델. 향상된 손 조작 능력과 AI 추론.',
      imageUrl: '/robots/unitree-g1.jpg',
    },
    // 2026 robots
    {
      companyName: 'Tesla',
      name: 'Optimus Production',
      announcementYear: 2026, announcementQuarter: 2,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: 'Tesla Optimus 양산 모델. 외부 고객 판매 시작.',
      imageUrl: '/robots/optimus.jpg',
    },
    {
      companyName: 'Boston Dynamics',
      name: 'Atlas Pro',
      announcementYear: 2026, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'pilot',
      region: 'north_america',
      description: 'Atlas 상용화 모델. Hyundai 공장 파일럿 배치.',
      imageUrl: '/robots/atlas.jpg',
    },
    {
      companyName: 'Agility Robotics',
      name: 'Digit v3',
      announcementYear: 2026, announcementQuarter: 1,
      status: 'commercial',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'commercial',
      region: 'north_america',
      description: 'Digit 3세대. 다관절 손과 향상된 자율 내비게이션.',
      imageUrl: '/robots/digit.webp',
    },
    {
      companyName: 'Sanctuary AI',
      name: 'Phoenix Gen 8',
      announcementYear: 2026, announcementQuarter: 1,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'poc',
      region: 'north_america',
      description: 'Phoenix 최신 모델. Carbon 인지 AI 엔진 통합.',
      imageUrl: '/robots/phoenix.webp',
    },
    {
      companyName: 'Rainbow Robotics',
      name: 'HUBO 2',
      announcementYear: 2026, announcementQuarter: 2,
      status: 'development',
      purpose: 'industrial',
      locomotionType: 'bipedal',
      handType: 'multi_finger',
      commercializationStage: 'prototype',
      region: 'asia',
      description: 'Rainbow Robotics 차세대 HUBO. 산업 현장 최적화 설계.',
      imageUrl: '/robots/hubo.jpg',
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
  ];

  const robotMap: Record<string, string> = {};
  for (const r of robotsData) {
    const companyId = companyMap[r.companyName];
    if (!companyId) continue;
    const existing = await db.select().from(humanoidRobots).where(eq(humanoidRobots.name, r.name)).limit(1);
    if (existing.length > 0) {
      robotMap[r.name] = existing[0]!.id;
      // Update imageUrl and announcementQuarter for existing robots
      await db.update(humanoidRobots).set({
        ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        announcementQuarter: r.announcementQuarter || 1,
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
    'G1 Pro': { heightCm: 130, weightKg: 37, payloadKg: 5, dofCount: 30, maxSpeedMps: 2.5, operationTimeHours: 3 },
    'Optimus Production': { heightCm: 173, weightKg: 52, payloadKg: 25, dofCount: 34, maxSpeedMps: 3.5, operationTimeHours: 8 },
    'Atlas Pro': { heightCm: 150, weightKg: 85, payloadKg: 30, dofCount: 30, maxSpeedMps: 2.5, operationTimeHours: 3 },
    'Digit v3': { heightCm: 175, weightKg: 62, payloadKg: 20, dofCount: 36, maxSpeedMps: 2.0, operationTimeHours: 10 },
    'Phoenix Gen 8': { heightCm: 170, weightKg: 65, payloadKg: 25, dofCount: 24, maxSpeedMps: 1.5, operationTimeHours: 5 },
    'HUBO 2': { heightCm: 160, weightKg: 55, payloadKg: 15, dofCount: 32, maxSpeedMps: 1.8, operationTimeHours: 4 },
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
    'Optimus Gen 3': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 120, isInterchangeable: false },
    'Figure 02': { handType: 'multi_finger', fingerCount: 5, handDof: 18, gripForceN: 120, isInterchangeable: false },
    'NEO Beta': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 90, isInterchangeable: false },
    'G1 Pro': { handType: 'multi_finger', fingerCount: 5, handDof: 10, gripForceN: 40, isInterchangeable: false },
    'Optimus Production': { handType: 'multi_finger', fingerCount: 5, handDof: 16, gripForceN: 130, isInterchangeable: false },
    'Atlas Pro': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 160, isInterchangeable: true },
    'Digit v3': { handType: 'multi_finger', fingerCount: 5, handDof: 12, gripForceN: 150, isInterchangeable: true },
    'Phoenix Gen 8': { handType: 'multi_finger', fingerCount: 5, handDof: 22, gripForceN: 110, isInterchangeable: false },
    'HUBO 2': { handType: 'multi_finger', fingerCount: 5, handDof: 14, gripForceN: 90, isInterchangeable: false },
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
    'Optimus Gen 3': { mainSoc: 'Tesla AI5 Chip', topsMin: 200, topsMax: 400, architectureType: 'onboard' },
    'Figure 02': { mainSoc: 'NVIDIA Thor', topsMin: 200, topsMax: 500, architectureType: 'hybrid' },
    'NEO Beta': { mainSoc: 'NVIDIA Jetson Orin', topsMin: 40, topsMax: 275, architectureType: 'onboard' },
    'G1 Pro': { mainSoc: 'NVIDIA Jetson Orin NX', topsMin: 70, topsMax: 100, architectureType: 'onboard' },
    'Optimus Production': { mainSoc: 'Tesla AI5 Chip', topsMin: 200, topsMax: 400, architectureType: 'onboard' },
    'Atlas Pro': { mainSoc: 'Custom NVIDIA', topsMin: 200, topsMax: 400, architectureType: 'onboard' },
    'Digit v3': { mainSoc: 'NVIDIA Jetson Thor', topsMin: 200, topsMax: 500, architectureType: 'onboard' },
    'Phoenix Gen 8': { mainSoc: 'Custom AI Chip v2', topsMin: 100, topsMax: 300, architectureType: 'hybrid' },
    'HUBO 2': { mainSoc: 'NVIDIA Jetson AGX Orin', topsMin: 200, topsMax: 275, architectureType: 'onboard' },
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
    'Optimus Gen 3': { batteryType: 'Li-ion', capacityWh: 3000, operationTimeHours: 6, chargingMethod: 'fixed' },
    'Figure 02': { batteryType: 'Li-ion', capacityWh: 3000, operationTimeHours: 6, chargingMethod: 'fixed' },
    'NEO Beta': { batteryType: 'Li-ion', capacityWh: 2000, operationTimeHours: 6, chargingMethod: 'fixed' },
    'G1 Pro': { batteryType: 'Li-ion', capacityWh: 1000, operationTimeHours: 3, chargingMethod: 'fixed' },
    'Optimus Production': { batteryType: 'Li-ion', capacityWh: 4000, operationTimeHours: 8, chargingMethod: 'swappable' },
    'Atlas Pro': { batteryType: 'Li-ion', capacityWh: 3500, operationTimeHours: 3, chargingMethod: 'swappable' },
    'Digit v3': { batteryType: 'Li-ion', capacityWh: 5000, operationTimeHours: 10, chargingMethod: 'swappable' },
    'Phoenix Gen 8': { batteryType: 'Li-ion', capacityWh: 2500, operationTimeHours: 5, chargingMethod: 'both' },
    'HUBO 2': { batteryType: 'Li-ion', capacityWh: 2000, operationTimeHours: 4, chargingMethod: 'fixed' },
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
    { robotName: 'G1 Pro', environmentType: 'research_lab', taskType: 'other', taskDescription: '연구소 조작 벤치마크 테스트', deploymentStatus: 'production', demoEvent: 'Unitree G1 Pro Launch', demoDate: '2025-04-10' },
    { robotName: 'Optimus Production', environmentType: 'factory', taskType: 'assembly', taskDescription: 'Tesla Gigafactory 양산 라인 배치', deploymentStatus: 'production', demoEvent: 'Tesla Investor Day 2026', demoDate: '2026-01-20' },
    { robotName: 'Atlas Pro', environmentType: 'factory', taskType: 'assembly', taskDescription: 'Hyundai 울산 공장 파일럿', deploymentStatus: 'pilot', demoEvent: 'Hyundai Robotics Summit', demoDate: '2026-02-15' },
    { robotName: 'Digit v3', environmentType: 'warehouse', taskType: 'picking', taskDescription: 'Amazon 물류센터 본격 배치', deploymentStatus: 'production', demoEvent: 'Agility Scale-up Event', demoDate: '2026-01-10' },
    { robotName: 'Phoenix Gen 8', environmentType: 'retail', taskType: 'picking', taskDescription: '대형 유통점 재고 관리 PoC', deploymentStatus: 'poc', demoEvent: 'Sanctuary AI Demo 2026', demoDate: '2026-03-01' },
    { robotName: 'HUBO 2', environmentType: 'factory', taskType: 'assembly', taskDescription: '스마트 공장 조립 보조 테스트', deploymentStatus: 'concept', demoEvent: 'Rainbow Robotics Showcase', demoDate: '2026-02-28' },
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
