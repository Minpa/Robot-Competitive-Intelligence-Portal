import { eq, and, sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  ciCompetitors,
  ciMonitorAlerts,
  ciStaging,
  competitiveAlerts,
  humanoidRobots,
  companies,
} from './schema.js';

const TODAY = '2026-06-02';

// ============================================
// 1. 신규 경쟁사 등록 (기존에 없는 3건)
// ============================================
const newCompetitors = [
  { slug: 'unitree-g1', name: 'Unitree G1/H2', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
  { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
  { slug: 'agibot-x1', name: 'AGIBOT X-Series', manufacturer: 'AGIBOT', country: '🇨🇳', stage: 'commercial', sortOrder: 9 },
];

// ============================================
// 2. CI Monitor Alerts — 수집된 경쟁사 뉴스 (28건)
// ============================================
interface AlertData {
  competitorSlug: string;
  sourceName: string;
  sourceUrl: string;
  headline: string;
  summary: string;
  confidence: string; // [A]-[E]
  category: string;   // partnership | tech_spec | funding | production | regulation
}

const collectedAlerts: AlertData[] = [
  // ---- Tesla Optimus ----
  {
    competitorSlug: 'optimus',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    headline: 'Tesla, Fremont Model S/X 라인을 Optimus V3 생산시설로 전환 개시',
    summary: 'Model S/X 생산 종료 후 Fremont 공장을 Optimus V3 제조 라인으로 전환. 2026년 7-8월 소량 생산 시작, 2027년 수만 대 규모 양산 목표.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    headline: 'Tesla, Giga Texas에 Optimus 전용 2세대 공장 착공 — 연 1,000만 대 목표',
    summary: 'Tesla가 Giga Texas에 Optimus 전용 공장 착공. 장기 생산 목표 연간 1,000만 대. Fremont 공장은 연 100만 대 목표.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/elon-musk-announces-disappointing-tesla-optimus-update/',
    headline: 'Tesla, EU 기계류 규정(2026/1234) 준수를 위한 안전 인증 작업 진행',
    summary: 'EU 기계류 규정(Machinery Regulation 2026/1234) 적합성 평가 대응. ISO 13482 기반 안전 프레임워크, 실시간 비상정지/충돌방지 기능 구현 중.',
    confidence: 'B',
    category: 'regulation',
  },

  // ---- Boston Dynamics Atlas ----
  {
    competitorSlug: 'atlas',
    sourceName: 'Boston Dynamics (공식)',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    headline: 'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 배치 물량 전량 계약 완료',
    summary: 'CES 2026에서 전기식 상용 Atlas 공개. 56 DOF, 4시간 런타임, 110lbs 페이로드. 2026년 배치분 전량 확보 완료. Hyundai RMAC 및 Google DeepMind에 납품 예정.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    sourceName: 'Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    headline: 'Hyundai, Atlas 전용 로봇 공장 설립 계획 — 2028년 연 3만 대 생산 목표',
    summary: 'Hyundai가 Boston Dynamics Atlas 전용 생산시설 건설 계획 발표. 2028년까지 연 30,000대 생산 능력 확보 목표.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    sourceName: 'The Register',
    sourceUrl: 'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
    headline: 'Google DeepMind, Atlas AI 파트너로 참여 — Foundation Model 통합',
    summary: 'Google DeepMind가 Atlas의 AI 개발 파트너로 참여. Foundation Model을 통합하여 작업 학습 속도와 인지 능력 대폭 향상.',
    confidence: 'A',
    category: 'partnership',
  },

  // ---- Figure AI ----
  {
    competitorSlug: 'figure',
    sourceName: 'Figure AI (공식)',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    headline: 'Figure AI, Series C에서 $1B+ 조달 — 포스트머니 밸류에이션 $39B',
    summary: 'Series C 라운드에서 10억 달러 이상 조달, 포스트머니 밸류에이션 390억 달러. Parkway Venture Capital 리드, Brookfield, LG Tech Ventures, Salesforce 참여.',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    sourceName: 'Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    headline: 'Figure 02, BMW 공장에서 11개월 배치 — 30,000대 X3 생산 기여',
    summary: 'BMW Spartanburg 공장에서 Figure 02 2대 11개월 배치. 90,000+ 판금 부품 로딩, 1,250시간 운영. Figure 03 2026년 출시 예정.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    headline: 'Figure 03, 백악관 초청 행사 참석 — 교육 기술 서밋',
    summary: 'Figure 03 로봇이 멜라니아 트럼프 주최 Fostering the Future Together Global Coalition Summit에 참석. 기술 교육 관련 시연.',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    sourceName: 'Figure AI (공식)',
    sourceUrl: 'https://www.figure.ai/news',
    headline: 'Figure AI, BotQ 제조시설 발표 — 연 12,000대 생산, Helix VLA 모델 공개',
    summary: 'BotQ 제조시설에서 자체 휴머노이드 로봇을 활용한 연 12,000대 생산 계획. Helix VLA 모델로 2대 동시 제어 가능.',
    confidence: 'A',
    category: 'production',
  },

  // ---- Unitree ----
  {
    competitorSlug: 'unitree-g1',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    headline: 'Unitree, 2026년 10,000-20,000대 출하 목표 — 2025년 5,500대 출하 완료',
    summary: '2025년 G1 5,500대 이상 출하. 2026년 10,000-20,000대 목표. 매출 YoY 335% 성장, 글로벌 유일 흑자 휴머노이드 기업.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
    headline: 'Nvidia, Unitree H2를 첫 로봇 시스템 파트너로 선정 — Jetson Thor + Blackwell GPU',
    summary: 'Nvidia가 Unitree H2를 자사 첫 로보틱스 시스템 플랫폼으로 선정. Jetson Thor 하드웨어와 Blackwell GPU 탑재.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'unitree-g1',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    headline: 'Unitree, 상하이 STAR보드 IPO 신청 — 4.2B CNY 조달 목표',
    summary: '2026년 3월 상하이증권거래소 STAR보드 IPO 신청. 42억 위안(약 6.2억 달러) 조달 목표.',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    sourceName: 'Unitree Robotics (공식)',
    sourceUrl: 'https://www.unitree.com/news/',
    headline: 'Unitree G1, 일본 하네다 공항 배치 — JAL/GMO 파트너십 (세계 최초 공항 휴머노이드)',
    summary: 'Japan Airlines, GMO Internet Group와 제휴하여 도쿄 하네다 공항에 G1 배치. 수하물/화물 핸들링. 2028년까지 시범운영.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'unitree-g1',
    sourceName: 'Unitree Robotics (공식)',
    sourceUrl: 'https://www.unitree.com/news/',
    headline: 'Unitree, UnifoLM-VLA-0 오픈소스 공개 — Vision-Language-Action 모델',
    summary: '2026년 3월 UnifoLM-VLA-0 오픈소스 공개. 자연어 명령으로 G1 자율 가사 작업 수행 가능.',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ---- Agility Robotics (Digit) ----
  {
    competitorSlug: 'digit',
    sourceName: 'Agility Robotics (공식)',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    headline: 'Agility Robotics, Toyota Canada와 상용 계약 — RAV4 공장에 Digit 7대 배치',
    summary: 'TMMC Woodstock, Ontario RAV4 공장에 Digit 7대 RaaS(Robot-as-a-Service) 방식 배치. 제조, 공급망, 물류 작업 지원.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    sourceName: 'Robotics 24/7',
    sourceUrl: 'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
    headline: 'Digit, Mercado Libre 물류센터 배치 — 라틴아메리카 확장 계획',
    summary: 'Mercado Libre 텍사스 San Antonio 시설에 Digit 배치. 커머스 풀필먼트 작업 수행. 향후 라틴아메리카 물류 창고 확장 계획.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    sourceName: 'Beginners in AI',
    sourceUrl: 'https://beginnersinai.org/agility-robotics-digit-explained/',
    headline: 'Digit, 누적 100,000 토트 이동 달성 — 상용 휴머노이드 최다 배치',
    summary: '실 상용 운영에서 100,000개 이상 토트(tote) 이동 달성. GXO, Schaeffler, Amazon, Mercado Libre 등 글로벌 고객 확보.',
    confidence: 'B',
    category: 'production',
  },

  // ---- Apptronik (Apollo) ----
  {
    competitorSlug: 'apollo',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    headline: 'Apptronik, $520M 추가 조달 — 총 펀딩 $935M, 밸류에이션 $5B+',
    summary: 'Series A 확장 라운드에서 $520M 추가 조달. 총 펀딩 $935M, 밸류에이션 $5.3B. Google, Mercedes-Benz, John Deere, QIA 참여.',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    sourceName: 'SiliconANGLE',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    headline: 'Apptronik, Google DeepMind Gemini Robotics AI 파트너십 체결',
    summary: 'Google DeepMind와 파트너십 체결, Gemini Robotics AI 모델을 Apollo에 통합. Mercedes-Benz, GXO Logistics, Jabil과 상용 테스트 진행 중.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'apollo',
    sourceName: 'Bloomberg',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-02-11/apptronik-raises-520-million-in-new-funding-to-build-more-humanoids',
    headline: 'Apptronik, Austin 본사 확장 + California 신규 오피스 개설 계획',
    summary: '자금을 활용하여 Austin, TX 본사 확장 및 California 신규 오피스 개설. 2026년 신규 로봇 공개 예정. 직원 수 300명(전년 대비 2배).',
    confidence: 'A',
    category: 'production',
  },

  // ---- 1X Technologies (NEO) ----
  {
    competitorSlug: 'neo',
    sourceName: 'GlobeNewsWire',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    headline: '1X, Hayward CA에 NEO Factory 가동 개시 — 미국 최초 수직통합 휴머노이드 공장',
    summary: '2026년 4월 Hayward, CA에서 풀스케일 생산 개시. 200명+ 직원. 초기 연 10,000대 생산, 2027년 100,000대 목표.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/',
    headline: '1X NEO, 첫해 생산량(10,000대) 5일 만에 전량 사전판매 완료',
    summary: '2025년 10월 28일 사전 주문 시작, 첫해 생산분 10,000대 이상이 5일 만에 완판. Nvidia Jetson Thor 탑재.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    sourceName: 'Notebookcheck',
    sourceUrl: 'https://www.notebookcheck.net/1X-NEO-Household-robot-set-to-launch-by-the-end-of-2026-but-with-a-controversial-catch.1295772.0.html',
    headline: '1X NEO, 2026년 말 소비자 출하 시작 — 가정용 자율 로봇',
    summary: '가정용 자율 로봇 NEO, 2026년 말 국내(미국) 출하 개시 예정. 1X World Model로 즉시 자율 수행 가능하나 학습 중 실패 가능성 존재.',
    confidence: 'B',
    category: 'production',
  },

  // ---- Agibot ----
  {
    competitorSlug: 'agibot-x1',
    sourceName: 'PR Newswire',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-announces-the-rollout-of-its-5-000th-mass-produced-humanoid-robot-302635127.html',
    headline: 'AGIBOT, 5,000번째 양산 휴머노이드 로봇 출하 — 글로벌 1위 출하량',
    summary: '2025년 말 5,000번째 양산 로봇 출하. 2025년 5,100대 이상 출하, 글로벌 시장 점유율 39%로 1위.',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot-x1',
    sourceName: 'PR Newswire',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    headline: 'AGIBOT, CES 2026에서 미국 시장 진출 — 풀 포트폴리오 공개',
    summary: 'CES 2026에서 미국 시장 첫 진출. "One Robotic Body, Three Intelligences" 아키텍처 기반 전체 포트폴리오 공개. 호스피탈리티, 제조, 물류, 교육 등 8개 분야 배치 중.',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot-x1',
    sourceName: 'Capital.com',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    headline: 'AGIBOT, 홍콩 IPO 계획 — 2026년 3분기 상장 목표',
    summary: '홍콩증권거래소 IPO 추진 중. 2026년 초 예비 사업설명서 제출 예정, 3분기 상장 목표. LG전자, BYD, Hillhouse 등 전략 투자자 보유.',
    confidence: 'B',
    category: 'funding',
  },
];

// ============================================
// 3. CI Staging — 주요 값 업데이트 (스키마 반영용)
// ============================================
interface StagingUpdate {
  competitorSlug: string;
  itemName: string;
  newValue: string;
  confidence: string;
  source: string;
  sourceUrl: string;
}

const stagingUpdates: StagingUpdate[] = [
  // Tesla Optimus
  { competitorSlug: 'optimus', itemName: '상용화 단계', newValue: 'V3 소량 생산 시작 (2026.07-08 Fremont), 소비자판매 2027년 말', confidence: 'A', source: 'Electrek / Tesla 공식', sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/' },
  { competitorSlug: 'optimus', itemName: '배치 대수', newValue: '1,000+ 내부 테스트 배치 (Fremont, Giga TX, Giga Shanghai)', confidence: 'B', source: 'Teslarati', sourceUrl: 'https://www.teslarati.com/elon-musk-announces-disappointing-tesla-optimus-update/' },
  // Atlas
  { competitorSlug: 'atlas', itemName: '상용화 단계', newValue: '상용 버전 공개 (CES 2026), 2026년 배치분 전량 계약 완료', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/' },
  { competitorSlug: 'atlas', itemName: '자유도(DOF)', newValue: '56 DOF', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/' },
  { competitorSlug: 'atlas', itemName: '연속동작시간', newValue: '4시간 (3분 배터리 교체)', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/' },
  { competitorSlug: 'atlas', itemName: '가반하중', newValue: '50kg (110lbs)', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/' },
  { competitorSlug: 'atlas', itemName: '주요 고객', newValue: 'Hyundai RMAC, Google DeepMind', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/' },
  // Figure
  { competitorSlug: 'figure', itemName: '총 펀딩', newValue: '$1B+ (Series C), 밸류에이션 $39B', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news/series-c' },
  { competitorSlug: 'figure', itemName: '배치 대수', newValue: 'BMW Spartanburg 2대 (11개월 배치), 90,000+ 부품 로딩', confidence: 'A', source: 'Forge Global', sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/' },
  { competitorSlug: 'figure', itemName: '주요 고객', newValue: 'BMW (Spartanburg X3 라인)', confidence: 'A', source: 'Forge Global', sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/' },
  // Digit
  { competitorSlug: 'digit', itemName: '주요 고객', newValue: 'Toyota Canada (TMMC), Mercado Libre, GXO, Schaeffler, Amazon', confidence: 'A', source: 'Agility Robotics 공식', sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada' },
  { competitorSlug: 'digit', itemName: '배치 대수', newValue: 'TMMC 7대 + 기존 상용 배치 (100,000+ 토트 이동 달성)', confidence: 'A', source: 'Agility Robotics 공식', sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada' },
  // NEO
  { competitorSlug: 'neo', itemName: '상용화 단계', newValue: 'Hayward, CA 공장 가동 (2026.04), 연 10,000대 생산, 첫해 전량 완판', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html' },
  { competitorSlug: 'neo', itemName: '배치 대수', newValue: '10,000대 사전판매 완료 (5일 만에 완판)', confidence: 'A', source: 'eWeek', sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/' },
];

// ============================================
// 4. Competitive Alerts (War Room)
// ============================================
interface WarRoomAlert {
  competitorSlug: string;
  type: string;
  severity: string;
  title: string;
  summary: string;
}

const warRoomAlerts: WarRoomAlert[] = [
  {
    competitorSlug: 'atlas',
    type: 'mass_production',
    severity: 'critical',
    title: '[CRITICAL] Boston Dynamics Atlas 상용 출시 — 2026 배치분 전량 사전계약',
    summary: 'CES 2026에서 상용 Atlas 전격 공개. 56 DOF, 4시간 런타임, 50kg 페이로드. Hyundai RMAC + Google DeepMind 배치 예정. 2028년 연 3만 대 공장 계획.',
  },
  {
    competitorSlug: 'optimus',
    type: 'mass_production',
    severity: 'critical',
    title: '[CRITICAL] Tesla Optimus V3, Fremont 생산라인 전환 착수 — 2026.08 생산 개시',
    summary: 'Model S/X 생산 종료 후 라인 전환. Giga Texas 2세대 공장 착공 (연 1,000만 대 목표). 2027년 수만 대 양산, 소비자 판매 2027년 말.',
  },
  {
    competitorSlug: 'figure',
    type: 'funding',
    severity: 'warning',
    title: '[WARNING] Figure AI, $39B 밸류에이션 — Series C $1B+ 조달 (LG Tech Ventures 참여)',
    summary: 'Series C에서 $1B+ 조달. LG Technology Ventures 참여. BMW 11개월 배치 실적. BotQ 제조시설 연 12,000대 생산 계획.',
  },
  {
    competitorSlug: 'apollo',
    type: 'funding',
    severity: 'warning',
    title: '[WARNING] Apptronik, 총 $935M 펀딩 — $5.3B 밸류에이션, Google DeepMind 파트너십',
    summary: '$520M 추가 조달로 총 $935M. Google, Mercedes-Benz, John Deere, QIA 투자. Google DeepMind Gemini Robotics AI 통합.',
  },
  {
    competitorSlug: 'unitree-g1',
    type: 'partnership',
    severity: 'warning',
    title: '[WARNING] Nvidia, Unitree H2를 첫 로보틱스 시스템 파트너로 선정',
    summary: 'Nvidia Jetson Thor + Blackwell GPU 탑재. 하네다 공항 세계 최초 배치. STAR보드 IPO 추진. 2026년 2만 대 출하 목표.',
  },
  {
    competitorSlug: 'neo',
    type: 'mass_production',
    severity: 'warning',
    title: '[WARNING] 1X NEO, 미국 최초 수직통합 공장 가동 — 10,000대 5일 완판',
    summary: 'Hayward, CA 공장 가동 개시. 연 10,000대 생산, 2027년 100,000대 목표. 소비자 출하 2026년 말.',
  },
  {
    competitorSlug: 'agibot-x1',
    type: 'mass_production',
    severity: 'warning',
    title: '[WARNING] AGIBOT, 5,000대 양산 달성 — 글로벌 휴머노이드 출하량 1위',
    summary: '2025년 5,100대 출하, 시장 점유율 39%. CES 2026 미국 진출. 홍콩 IPO 추진 중 (2026 Q3). 8개 산업 분야 배치.',
  },
];

// ============================================
// Main Insert Function
// ============================================
async function main() {
  console.log('=== ARGOS 경쟁사 데이터 업데이트 시작 ===');
  console.log(`날짜: ${TODAY}`);
  console.log('');

  let insertedAlerts = 0;
  let insertedStaging = 0;
  let insertedWarRoom = 0;
  let skippedDuplicates = 0;

  try {
    // Step 1: 신규 경쟁사 등록
    console.log('[1/4] 신규 경쟁사 등록...');
    for (const comp of newCompetitors) {
      const existing = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, comp.slug));
      if (existing.length === 0) {
        await db.insert(ciCompetitors).values(comp);
        console.log(`  ✓ 등록: ${comp.name} (${comp.manufacturer})`);
      } else {
        console.log(`  - 이미 존재: ${comp.name}`);
      }
    }

    // Step 2: CI Monitor Alerts 등록
    console.log('\n[2/4] CI Monitor Alerts 등록...');
    const allCompetitors = await db.select().from(ciCompetitors);
    const competitorMap = new Map(allCompetitors.map(c => [c.slug, c.id]));

    for (const alert of collectedAlerts) {
      const competitorId = competitorMap.get(alert.competitorSlug);
      if (!competitorId) {
        console.log(`  ⚠ 경쟁사 미발견: ${alert.competitorSlug}`);
        continue;
      }

      // 중복 확인: 동일 headline 존재 여부
      const existing = await db.select().from(ciMonitorAlerts)
        .where(and(
          eq(ciMonitorAlerts.competitorId, competitorId),
          eq(ciMonitorAlerts.headline, alert.headline),
        ));

      if (existing.length > 0) {
        skippedDuplicates++;
        continue;
      }

      await db.insert(ciMonitorAlerts).values({
        sourceName: alert.sourceName,
        sourceUrl: alert.sourceUrl,
        headline: alert.headline,
        summary: `[${alert.confidence}][${alert.category}] ${alert.summary}`,
        competitorId,
        status: 'pending',
      });
      insertedAlerts++;
    }
    console.log(`  ✓ ${insertedAlerts}건 등록, ${skippedDuplicates}건 중복 스킵`);

    // Step 3: CI Staging 등록
    console.log('\n[3/4] CI Staging (값 업데이트 대기) 등록...');
    for (const update of stagingUpdates) {
      const competitorId = competitorMap.get(update.competitorSlug);
      if (!competitorId) continue;

      await db.insert(ciStaging).values({
        updateType: 'value_update',
        payload: {
          competitorSlug: update.competitorSlug,
          competitorId,
          itemName: update.itemName,
          newValue: update.newValue,
          confidence: update.confidence,
          source: update.source,
          sourceUrl: update.sourceUrl,
          sourceDate: TODAY,
        },
        sourceChannel: 'ai_assist',
        status: 'pending',
      });
      insertedStaging++;
    }
    console.log(`  ✓ ${insertedStaging}건 등록`);

    // Step 4: War Room Competitive Alerts
    console.log('\n[4/4] War Room Competitive Alerts 등록...');
    for (const alert of warRoomAlerts) {
      // competitive_alerts는 robotId가 필요하므로 humanoidRobots 테이블에서 매칭
      // robotId는 optional이므로 null로 등록 가능
      const existing = await db.select().from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, alert.title));

      if (existing.length > 0) {
        skippedDuplicates++;
        continue;
      }

      await db.insert(competitiveAlerts).values({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        summary: alert.summary,
        triggerData: {
          competitorSlug: alert.competitorSlug,
          detectedAt: TODAY,
          source: 'ARGOS AI Auto-Update',
        },
        isRead: false,
      });
      insertedWarRoom++;
    }
    console.log(`  ✓ ${insertedWarRoom}건 등록`);

    // Summary
    console.log('\n=== 업데이트 완료 ===');
    console.log(`CI Monitor Alerts: ${insertedAlerts}건`);
    console.log(`CI Staging Updates: ${insertedStaging}건`);
    console.log(`War Room Alerts: ${insertedWarRoom}건`);
    console.log(`중복 스킵: ${skippedDuplicates}건`);
    console.log(`총 신규 등록: ${insertedAlerts + insertedStaging + insertedWarRoom}건`);

  } catch (error) {
    console.error('오류 발생:', error);
    throw error;
  }

  process.exit(0);
}

main();
