/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-17
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-17.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-17)
// ============================================

interface CollectedAlert {
  competitorSlug: string;
  layerSlug: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  confidence: string; // A-E
  category: 'partnership' | 'tech_spec' | 'funding' | 'production' | 'regulation';
}

const collectedData: CollectedAlert[] = [
  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 2026년 말 15,000대 생산 목표 — 9월 주 1,000대, 연말 주 2,500대 램프업',
    summary: 'Tesla가 서플라이어에 2026년 총 15,000대 분량의 Optimus Gen 3 부품을 발주. 9월 기준 주당 1,000대, 연말까지 주당 2,500대(연간 런레이트 100,000~125,000대)로 생산 확대 계획. Giga Texas에서 배터리 셀 분류, 부품 키팅, 재고 관리 등 내부 운영 중. 소비자/기업 외부 판매는 2027년 말 이후. 머스크는 다보스·Abundance Summit에서 2027년 공개 판매 재확인.',
    sourceName: 'NextBigFuture / TrendForce',
    sourceUrl: 'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla AI5 추론칩 테이프아웃 완료, xAI Grok 음성 통합 — Fremont 라인 Optimus 전용 전환',
    summary: 'Optimus 전용 AI5 추론칩이 2026년 4월 테이프아웃 완료, 기존 칩 대비 메모리 대역폭 5배 향상. xAI의 Grok이 음성 인터랙션 담당. Fremont Model S/X 라인을 46일 만에 해체하고 Optimus 전용 생산 라인으로 전환 진행 중. Gen 3 본체 스펙: 173cm, 57kg, 2.3kWh 배터리.',
    sourceName: 'Yahoo Finance / optimusk.blog',
    sourceUrl: 'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus Gen 3 핸드 50 액추에이터 / 22 DOF — 인간급 손 조작 구현',
    summary: 'Tesla Optimus Gen 3의 핸드가 50개 액추에이터와 22 DOF(자유도)를 탑재하여 인간급 손 조작을 구현. 이전 세대 대비 대폭 향상된 매니퓰레이션 능력으로 정밀 작업 수행 가능. 손가락 개별 제어와 힘 감지 기능이 포함된 것으로 알려짐.',
    sourceName: 'optimusk.blog / basenor.com',
    sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-gen-3/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026 상용화 배치 완판 — Hyundai·Google DeepMind 우선 배치, 추가 고객 2027년부터',
    summary: 'Boston Dynamics가 CES 2026에서 Atlas 최종 상용 버전 공개. 2026년 배치분 전량 완판, Hyundai Robotics Metaplant Application Center 및 Google DeepMind에 우선 배치 예정. 추가 고객 배치는 2027년부터. 가격 약 $420,000/대. Atlas는 자율·원격조종·태블릿 인터페이스 세 가지 운용 모드를 지원.',
    sourceName: 'Engadget / Boston Dynamics Blog',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 2026 최종 스펙: 190cm/90kg, 리치 7.5ft, 50kg 리프팅, -20~40°C 운용',
    summary: 'Atlas 2026 상용 버전 스펙 확정: 높이 1,900mm(6.2ft), 무게 90kg(198lbs), 리치 최대 7.5ft, 리프팅 110lbs(50kg), 운용 온도 -4~104°F(-20~40°C). 이전 대비 부품 복잡도를 "거의 한 자릿수(order of magnitude)" 줄여 제조 속도·신뢰성 향상, 비용 절감. Hyundai 제조 역량 활용 연 30,000대 생산 체제 기반 마련.',
    sourceName: 'Forbes / Aparobot',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Boston Dynamics–Google DeepMind 파트너십 — Atlas 기반 embodied AI 공동 개발',
    summary: 'Boston Dynamics가 Google DeepMind와 협력하여 Atlas 기반 embodied AI(체화 인공지능) 개선을 진행. Atlas 상용 버전을 플랫폼으로 활용하여 DeepMind의 AI 연구 역량과 Boston Dynamics의 로봇 제어 기술을 결합. 산업용 자율 작업 능력 향상이 목표.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BotQ 1,000번째 유닛 생산 달성 — 시간당 1대, 연간 생산능력 12,000대',
    summary: 'Figure AI가 2026년 7월 23일 BotQ(로봇 전용 공장)에서 Figure 03 1,000번째 유닛 생산 마일스톤 달성. 시간당 1대 생산 속도 유지, 연간 생산능력 12,000대. Figure 02가 BMW Spartanburg 공장에서 11개월 간 30,000대+ X3 차량 생산에 기여, 1,250+ 가동시간 기록. Figure 03이 BMW 물류 시퀀싱에 투입 중.',
    sourceName: 'Figure AI / iiot-world',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure Helix AI — 가정용 일반 목적 로봇 AI, 비정형 환경 자율 탐색',
    summary: 'Figure AI가 Helix AI를 공개, 가정 내 비정형·가변 환경에서 자율 탐색 및 일상 가사 수행 능력을 구현. Figure 03에 탑재되어 가정용 일반 목적 로봇으로의 확장을 목표. Figure AI CEO Brett Adcock은 4년 내 약 100,000대 제조·배치를 예상.',
    sourceName: 'Figure AI / Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: '글로벌 H1 2026 휴머노이드 출하량 272% YoY 급증 — 19,000~22,000대, 중국 93~97% 점유',
    summary: '2026년 상반기 글로벌 휴머노이드 출하량이 전년 대비 ~272% 급증하여 19,000~22,000대 기록. 중국 제조사가 93~97% 시장 점유. 산업/상업용 용도가 전체의 70% 이상. Barclays는 2026년 전체 60,000+ 신규 투입을 전망. Figure AI는 BMW·물류 파일럿으로 비중국 진영 선두.',
    sourceName: 'Barclays / Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO — 첫날 460% 급등, 시총 $53B, 8,000배 청약 초과',
    summary: 'Unitree Robotics(688836.SH) 8월 19일 상하이 STAR Market 상장. IPO 가격 ¥150.80, 첫날 종가 ¥845(+460%), 장중 최고 ¥1,100(+629%). 소매 투자자 8,000배 청약 초과. $9억 규모 IPO. 시총 한때 $53B. 중국 최초 순수 휴머노이드 로봇 상장사. 이후 9월 초까지 고점 대비 50%+ 조정. 2025년 매출 17억 위안, 순이익 5.9억 위안.',
    sourceName: 'CNBC / Yahoo Finance / Bloomberg',
    sourceUrl: 'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree H2 연간 20,000대 생산 목표 — 생산능력 4배 확대, H1 단종 진행',
    summary: 'Unitree가 생산능력을 4배로 확대하여 H2 연간 20,000대 생산 목표. H1 모델은 H2로 대체 진행(H1-2 단종). 현재 라인업: R1($4,900), G1($13,500/미국 $21,600), H2($29,900), H2 Plus($100,000), H1($90,000). 2025년 5,500대+ 출하, 2026년 글로벌 점유율 ~32% 유지.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree 미 국방부 Section 1260H "중국 군사 기업" 목록 등재 (2026.6)',
    summary: '미 국방부(DoD)가 2026년 6월 8일 업데이트에서 Unitree Robotics를 Section 1260H "Chinese military companies" 목록에 추가. 미국 시장 접근 및 파트너십에 영향 가능. IPO 직전 발표로 투자자 리스크 요인으로 부각.',
    sourceName: 'DoD / Bloomberg',
    sourceUrl: 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Agility Digit 5 공개 (9/15) — 페이로드 40% 증가(50lbs), 9분 충전, NVIDIA Halos 통합',
    summary: 'Agility Robotics가 9월 15일 Digit 5를 공개. "케이지 없는" 인간 공존 작업을 위한 최초의 산업용 휴머노이드. 50lbs 반복 리프팅(전작 대비 40% 증가), 90분 배터리·9분 충전(10:1 비율), ISO 표준 교환형 엔드이펙터, 높이 5ft 11in(180cm)/무게 284lbs(129kg), 리치 7.2ft. NVIDIA IGX Thor + Halos Core 안전 플랫폼 최초 통합. 사람 감지·모션 큐·독립 안전 컨트롤러 탑재.',
    sourceName: 'Forbes / Agility Robotics',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/09/15/agility-launches-digit-5-no-more-safety-cages-300-million-in-orders/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Digit 5 — $300M+ 수주 확보, 2027 H1 얼리 액세스·H2 GA, EU·UK 진출',
    summary: 'Agility Robotics가 2026년 5월 기준 $300M+ 멀티이어 Digit 5 수주를 확보. 2027 상반기 얼리 액세스, 하반기 일반 가용(GA) 계획. 북미 외 최초로 EU·UK 상용 배치 시작 예정. RoboFab(Oregon, 70,000sqft) 연간 10,000대 생산능력. SPAC 합병 총 수익 $620M+(트러스트 $420M + Foxconn PIPE $200M).',
    sourceName: 'Forbes / The Robot Report',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
    confidence: 'A',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 시리즈 A 총 $935M — $520M 확장 라운드, 밸류에이션 $5B',
    summary: 'Apptronik이 시리즈 A 확장 라운드로 $520M 추가 유치, 총 시리즈 A $935M(기존 $415M + 확장 $520M). 밸류에이션 $5B. Google DeepMind와 Gemini Robotics AI 모델 파트너십 체결 후 투자 유치. 직원 300명으로 확대, Austin 거점 확장 및 캘리포니아 오피스 연내 개설 예정.',
    sourceName: 'CNBC / The Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apollo 3 "최초 진정한 상용 제품"으로 2027 출시 예고 — Mercedes·Jabil·GXO 배치 중',
    summary: 'Apptronik이 Apollo 2를 훈련/데이터 수집 플랫폼으로 정의하고 Apollo 3을 2027년 출시 예정인 최초 상용 제품으로 예고. 현재 Mercedes-Benz, Jabil, GXO 3개 엔터프라이즈 고객에 배치 중. Apollo 스펙: 약 6ft, 55lbs 리프팅, 22시간/일 7일 운용. Elevate Robotics 자회사(2025.6 설립)가 "초인간적" 산업 자동화에 집중.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik–Google DeepMind 파트너십: Gemini Robotics AI 모델을 Apollo에 통합',
    summary: 'Apptronik이 Google DeepMind와 파트너십을 체결하여 Gemini Robotics AI 모델을 Apollo 로봇 플랫폼에 통합. Robot Park 프로젝트에서 학습 데이터 수집 협력 진행 중. 이 파트너십이 $520M 시리즈 A 확장 라운드의 핵심 촉매로 작용.',
    sourceName: 'CNBC / The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 25-DOF 텐던 구동 핸드 공개 — IP68, 촉각 핑거팁, ±0.2mm 정밀도',
    summary: '1X Technologies가 2026년 7월 NEO 핸드 업그레이드를 공개. 25 DOF(손가락 22 + 손목 3), 자체 개발 텐던 구동(5:1~15:1 기어비), 모든 핑거팁·접촉면 고해상도 촉각 스킨, ±0.2mm 위치 정밀도, IP68 방수방진, 식품접촉 안전 재료. 첫 고객 배송 유닛에 탑재 예정. 올해 자체 생산 10,000개 핸드 목표.',
    sourceName: 'Dezeen / embodiedglobal.com',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 양산 개시 — Hayward NEO Factory 58,000sqft, 사전주문 10,000대 5일 만에 완판',
    summary: '1X Technologies가 캘리포니아 Hayward의 NEO Factory(58,000sqft, 미국 최초 수직통합 휴머노이드 공장)에서 풀스케일 양산 개시. 직원 200+명. 사전주문 개시 5일 만에 초년 생산분 10,000대 완판. 가격 $20,000(Early Access) 또는 월 $499 구독. EQT와 10,000대 배치 딜 체결. 소음 ~22dB(냉장고 수준). 실제 고객 인도는 아직 진행 중.',
    sourceName: 'Forbes / eWeek',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 프로세스 개시 — 목표 HK$40B~50B($5.1B~$6.4B), CICC·Morgan Stanley 주관',
    summary: 'Agibot(智元机器人)이 2026년 7월 24일 홍콩 IPO 프로세스를 공식 개시. 목표 밸류에이션 HK$40B~50B($5.1B~$6.4B). CICC, CITIC Securities, Morgan Stanley가 공동주관사. 전략 투자자에 LG전자, Mirae Asset, BYD, Hillhouse Investment 포함. 2026 상반기 8,400대 출하(글로벌 44%), 누적 15,000대+.',
    sourceName: 'Caixin Global / Cryptopolitan',
    sourceUrl: 'https://www.caixinglobal.com/2026-07-24/agibot-begins-hong-kong-ipo-process-as-chinas-embodied-ai-startups-race-to-list-102467856.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 Ultra WAIC 2026 데뷔 — 173cm/55kg, 12kW 순간출력, NVIDIA Thor 탑재',
    summary: 'Agibot이 WAIC 2026에서 A3 Ultra를 공개. 173cm/55kg, 12kW 순간출력(파워투웨이트비 0.218kW/kg, 업계 최고). NVIDIA Thor 프로세서 탑재. "에어리얼 워킹" 등 고난도 동작 가능. IFA 2026(베를린, 9/4~8)에서 A3·X2 Ultra가 Innovation Awards 수상. TÜV Rheinland 인증 획득.',
    sourceName: 'gagadget / RobotTesters / TechTimes',
    sourceUrl: 'https://gagadget.com/en/719322-agibot-unveils-15000-robots-and-revolutionary-a3-ultra-humanoid-with-nvidia-thor-at-waic-2026/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot GE-Act 2.0 모델 출시 + Genting Malaysia MoU — 리조트·테마파크 로봇 배치 협력',
    summary: 'Agibot이 GE-Act 2.0(Generalist Embodied Action) 모델을 출시하여 로봇 자율 능력 향상. Genting Malaysia와 MoU 체결하여 Resorts World Genting 생태계(테마파크, 레저, 호스피탈리티, 엔터테인먼트)에 휴머노이드 에이전트 통합 추진. 누적 출하 15,000대+ 돌파(2026.6 기준).',
    sourceName: 'PR Newswire / RobotToday',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'safety',
    headline: 'Agibot A-Series TÜV Rheinland 인증 획득 + Tekpoint 유럽 리테일 유통 동맹',
    summary: 'Agibot A-Series가 TÜV Rheinland 인증을 획득하여 유럽 시장 진출 규제 요건 충족. IFA 2026에서 Tekpoint와 유럽 리테일 유통 동맹 체결 발표. A3가 IFA에서 서예·시설 매핑·힘 감지 핸드 시연 진행. 유럽 시장 본격 진출 가시화.',
    sourceName: 'Humanoids Daily / TechTimes',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agibot-deepens-european-push-at-ifa-2026-with-t-v-rheinland-certification-and-tekpoint-retail-alliance',
    confidence: 'A',
    category: 'regulation',
  },
];

// ============================================
// INSERT 로직
// ============================================

async function lookupCompetitor(slug: string): Promise<string | null> {
  const rows = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, slug)).limit(1);
  return rows[0]?.id ?? null;
}

async function lookupLayer(slug: string): Promise<string | null> {
  const rows = await db.select().from(ciLayers).where(eq(ciLayers.slug, slug)).limit(1);
  return rows[0]?.id ?? null;
}

async function isDuplicateAlert(headline: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(ciMonitorAlerts)
    .where(eq(ciMonitorAlerts.headline, headline))
    .limit(1);
  return rows.length > 0;
}

export async function insertCiUpdate20260917() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-17) ===\n');

  let inserted = 0;
  let skipped = 0;

  for (const item of collectedData) {
    const dup = await isDuplicateAlert(item.headline);
    if (dup) {
      console.log(`  ⏭️  중복 건너뜀: ${item.headline.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    const competitorId = await lookupCompetitor(item.competitorSlug);
    const layerId = await lookupLayer(item.layerSlug);

    await db.insert(ciMonitorAlerts).values({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      headline: item.headline,
      summary: item.summary,
      competitorId,
      layerId,
      status: 'pending',
    });

    await db.insert(ciStaging).values({
      updateType: item.category,
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        collectedAt: '2026-09-17',
      },
      sourceChannel: 'auto_crawl',
      status: 'pending',
    });

    console.log(`  ✅ 삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료: ${inserted}건 삽입, ${skipped}건 중복 스킵 ===`);
  return { inserted, skipped, total: collectedData.length };
}

insertCiUpdate20260917()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
