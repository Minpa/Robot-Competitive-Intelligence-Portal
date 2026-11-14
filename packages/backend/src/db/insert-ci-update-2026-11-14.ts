/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-14
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-14.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-14)
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
    layerSlug: 'hw',
    headline: 'Tesla Optimus Fremont 라인 주 수백 대 생산 도달 — 핸드 조립 병목, 외부 출하 2027년 말 목표',
    summary:
      'The Information 보도(2026 Q3)에 따르면 Tesla는 Fremont에서 Optimus 생산량을 Q2 수십 대에서 8월 주 수백 대로 증대. 그러나 핸드·전완부에 100개 이상 나사 수동 조립이 필요해 병목 지속. Musk는 Q3 실적발표에서 주 20,000대 목표까지 "1년, 어쩌면 더" 소요 전망. Giga Texas 2세대 라인(연 1,000만대 규모) 건설 중이나 가동 시점 미확정. 외부 고객 출하는 2027년 말로 예정.',
    sourceName: 'The Information / Tesla Q3 Earnings Call / Technology.org',
    sourceUrl: 'https://www.technology.org/2026/10/22/tesla-optimus-production-fremont-20000-per-week-2027/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    headline: 'Electrek: Tesla Optimus AI 범용화(generalization) 문제 지속 — 생산 로봇이 일반 작업 수행 못해',
    summary:
      'Electrek(9/25) 보도에 따르면 Tesla가 Optimus 생산 램프업을 진행 중이나, 라인에서 나온 로봇들이 여전히 범용 작업(generalized tasks) 수행 불가. Tesla 내부에서 Optimus 1,000대 이상이 공장에서 가동 중이라는 주장이 있으나 독립 검증 부재. AI 모델의 다양한 환경 적응력이 핵심 과제로 남아 있음.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics Atlas 상용 버전 CES 2026 공개 — Hyundai·Google DeepMind 초기 배치 2026년 시작',
    summary:
      'Boston Dynamics가 CES 2026(1/5)에서 Product Atlas를 공개하고 Boston 본사에서 즉시 생산 시작. Hyundai(과반 지분 보유)가 첫 고객으로 조지아 공장에서 Atlas를 활용한 루프랙 분류 작업 수행 중. Google DeepMind도 2026년 배치 예정. Orbit 소프트웨어로 산업 시스템 연동. 분석가들은 ROI 2년 이내 달성 가능하다고 평가하나 대규모 배치는 아직 초기 단계.',
    sourceName: 'Boston Dynamics Official / IMechE / NBC News',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics Atlas 바퀴 장착 변형 테스트 — 중량물 이동·고속 이동 실험, 판매 계획 없음',
    summary:
      'Heise(2026년) 보도에 따르면 Boston Dynamics가 Atlas에 바퀴를 장착한 변형 버전을 테스트 중. 중량물 운반(heavy loads)과 고속 이동 시나리오 검증 목적이며, 바퀴 버전의 상용 판매 계획은 없다고 밝힘. 이족 보행과 바퀴 이동의 하이브리드 접근으로 물류 환경 적응력 확대 가능성 탐색.',
    sourceName: 'Heise',
    sourceUrl: 'https://www.heise.de/en/news/Boston-Dynamics-puts-humanoid-Atlas-robot-on-wheels-11518845.html',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, NVIDIA $1B 추가 투자 협상 중 — $3.5B Nscale 컴퓨트 계약으로 최대 100K GPU 확보',
    summary:
      'eWeek(10월) 보도에 따르면 NVIDIA가 Figure AI에 $1B 추가 투자를 검토 중. Figure는 Nscale과 $3.5B 컴퓨트 계약을 체결, 최대 100,000 NVIDIA GPU를 확보할 예정. BotQ 공장에서 Figure 03 생산 속도가 24배 증가하여 시간당 1대 목표에 근접. 2025년 9월 Series C($1B+, $39B 밸류에이션)에 이은 추가 자금 확보로 Helix AI 모델 개발 가속화.',
    sourceName: 'eWeek / Forbes / SiliconANGLE',
    sourceUrl: 'https://www.eweek.com/news/nvidia-figure-ai-1-billion-investment-humanoid-robots/',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI-Brookfield 전략적 파트너십 — 세계 최대 휴머노이드 사전학습 데이터셋 구축',
    summary:
      'PRNewswire(2025/9) 공식 발표. Brookfield가 Figure AI의 Series C에 참여하면서 동시에 AI 인프라 확장 및 세계 최대 실세계 휴머노이드 사전학습 데이터셋 구축을 위한 전략적 파트너십 체결. Brookfield의 실물자산 포트폴리오(물류센터, 데이터센터 등)를 활용한 대규모 학습 데이터 수집이 핵심. Helix AI 모델의 학습 데이터 확보 전략의 핵심 축.',
    sourceName: 'PRNewswire (공식)',
    sourceUrl: 'https://www.prnewswire.com/news-releases/figure-announces-strategic-partnership-with-brookfield-to-scale-ai-infrastructure-and-build-worlds-largest-humanoid-pretraining-dataset-302558414.html',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Unitree (G1) ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree G1 누적 생산 18,000대 돌파 — 글로벌 휴머노이드 시장점유율 31%, 세계 최다 판매',
    summary:
      'Gasgoo(2026/8) 보도에 따르면 Unitree의 이족보행 휴머노이드 누적 생산이 약 18,000대에 도달, 해당 기간 5,900대 출하로 글로벌 시장점유율 31% 기록. G1은 $16,000 기본가에 양산 시작(2024/8) 이후 2025년 전체 6,500대에서 2026년 상반기에만 11,000대를 넘어섬. Digitimes는 10,000~20,000대로 추정하며 Omdia는 4,200대로 보수적 집계, 출처 간 수치 차이 존재.',
    sourceName: 'Gasgoo / Digitimes / Gagadget',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/unitree-robotics-rolls-out-around-18000-humanoid-robots-to-date-2088141639058214913',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree 신공장 계획 — 연 190,000대 생산 용량 (휴머노이드 75K + 4족 115K), 2년 건설 일정',
    summary:
      'Digitimes(2026/10) 보도에 따르면 Unitree가 연 190,000대 규모의 신규 공장을 계획 중이며, 휴머노이드 75,000대와 4족 로봇 115,000대로 배분. 건설 기간 약 2년 예상. 다만 생산 용량 확대와 함께 AI 소프트웨어 성숙도가 여전히 과제로 지적됨.',
    sourceName: 'Digitimes',
    sourceUrl: 'https://www.digitimes.com/news/a20261022PD252/production-robot-2026-development-production-capacity.html',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 합병 통해 Nasdaq 상장 — 미국 최초 순수 휴머노이드 상장사, ~$465M 조달',
    summary:
      'TechCrunch(11/5) 보도. Agility Robotics가 Churchill Capital Corp XI와 SPAC 합병을 통해 Nasdaq에 AGLT 티커로 상장. 미국 최초의 순수 휴머노이드 로봇 상장사. Foxconn 주도 PIPE $201M 포함 총 ~$465M 조달. 다만 2026년 상반기 매출 $174K에 불과, 손실 $362M으로 수익성 미달. 30개 이상 기업 고객 파이프라인과 $300M+ 다년 계약이 성장 근거.',
    sourceName: 'TechCrunch / SiliconANGLE / Robotics & Automation News',
    sourceUrl: 'https://techcrunch.com/2026/11/05/agility-is-the-first-pure-humanoid-robot-company-on-the-stock-market-are-you-buying/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Agility Digit 5 공개 — 50파운드 적재, 90분 배터리/9분 충전, 안전 배리어 없이 인간 협업 가능',
    summary:
      'GeekWire(9/17) 보도. Agility가 Digit 5를 공개하며 주요 스펙 업그레이드 발표. 적재량 50파운드(전작 대비 40% 증가), 신규 배터리 90분 연속 작동·9분 충전, 물리적 안전 배리어 없이 작업자 인근에서 협업 가능한 안전 설계. GXO 조지아 사업장에서 Digit 4로 100,000+ 토트 처리 실적, 2027년 초 노스캐롤라이나·테네시 확장 예정. EU·UK 시장 진출도 계획.',
    sourceName: 'GeekWire / Agility Robotics Official / The Robot Report',
    sourceUrl: 'https://www.geekwire.com/2026/agilitys-new-digit-5-robot-lifts-50-pounds-works-20-hours-a-day-and-operates-alongside-people/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $935M 조달 ($520M 추가) — $5B 밸류에이션, Google·Mercedes·John Deere·QIA 참여',
    summary:
      'CNBC(2/11) 보도. Apptronik이 Series A-X $520M 추가 조달로 Series A 누적 ~$935M 달성, $5B 밸류에이션. B Capital, Google, Mercedes-Benz 기존 투자자 외 AT&T Ventures, John Deere, QIA(카타르투자청)가 신규 참여. Jabil과 전략적 제조 협력으로 Apollo 생산·배치 확대 계획. Google DeepMind Gemini Robotics 모델 탑재(2024/12 파트너십).',
    sourceName: 'CNBC / Forbes / The Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'GXO-Apptronik LOI 체결 — 4년간 최대 1,000대 Apollo RaaS 배치 계획, 2027년 말 북미 시작',
    summary:
      'Investing.com 보도. GXO와 Apptronik이 LOI(Letter of Intent)를 체결하여 RaaS(Robot-as-a-Service) 프레임워크 구축 및 Apollo 시범 운영 확대 합의. 4년간 최대 1,000대 Apollo 배치 목표, 2027년 말 북미 초기 배치 예정(성능 벤치마크 충족 조건). Mercedes-Benz 베를린 파일럿은 자재 이동에 한정, Apollo 3가 2027년 "첫 상용 출하 로봇"으로 예정.',
    sourceName: 'Investing.com / Forbes / The Robot Report',
    sourceUrl: 'https://www.investing.com/news/company-news/gxo-expands-humanoid-robot-trials-with-apptronik-93CH-5021315',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 풀스케일 생산 시작 — Hayward 공장 연 10K대 용량, 사전주문 10K대(5일 매진)',
    summary:
      'Forbes(4/30) 보도. 1X Technologies가 캘리포니아 Hayward 공장에서 NEO 풀스케일 생산을 시작, 200명 이상 직원 운영. 연간 10,000대 생산 용량이며 2027년 100,000대로 확대 목표. 2025/10 사전주문 개시 5일 만에 10,000대 매진($20,000/대 또는 $499/월 구독, $200 보증금). 다만 2026년 7월 기준 독립 검증된 소비자 인도 사례 없음. 텔레오퍼레이터 상시 개입 방식에 대한 프라이버시 우려 보도.',
    sourceName: 'Forbes / eWeek / NotebookCheck',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 최종 핸드 공개 — 25 DoF 건 구동, 촉각 센서 탑재, "인간 수준 능가" 목표',
    summary:
      'Dezeen(7/13) 보도. 1X Technologies가 NEO용 최종 텐돈 구동 핸드를 공개. 25자유도(DoF)에 촉각 센서 탑재, "인간 손의 능력을 맞추거나 초월하는 것"을 목표로 설계. 비디오 기반 월드 모델을 통한 자연어 명령 수행 지원. EQT와의 파트너십(2025/12)으로 2026~2030년 포트폴리오 기업에 최대 10,000대 배치 계획.',
    sourceName: 'Dezeen / 1X Technologies',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot (X1) ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot RMB 50B 밸류에이션 신규 라운드 추진 — 2025년 매출 RMB 1.05B, 홍콩 IPO 준비 중',
    summary:
      'TechNode(10/14) 보도(Caijing 인용). Agibot가 RMB 1~1.5B 규모 신규 라운드를 RMB 50B(약 $7B) 밸류에이션으로 추진 중. 2025년 매출 RMB 1.05B 보고. 2026년 7월부터 홍콩 상장 준비 착수했으나 신규 라운드로 인한 120일 쿨링 기간으로 IPO가 2026년 이후로 지연 가능. 기존 10차례 이상 라운드에서 Tencent, BYD, JD.com, SAIC Motor 등 참여.',
    sourceName: 'TechNode / Caijing',
    sourceUrl: 'https://technode.com/2026/10/14/robot-maker-agibot-nears-new-funding-round-at-rmb-50-billion-valuation/',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'LG Electronics·미래에셋, Agibot 전략적 투자 — 한국 기업의 중국 휴머노이드 진입 신호',
    summary:
      'Robotics & Automation News(2025/8) 보도. LG Electronics와 미래에셋이 Agibot에 전략적 투자 참여. 금액·밸류에이션 미공개. Agibot는 Lingxi X1을 2024년 10월 오픈소스 공개(하드웨어 청사진 + 코드)하여 글로벌 개발자 커뮤니티 구축. G2 Max(바퀴 기반 세미-휴머노이드)는 광저우 지하철·침롱 관광단지 등에 실배치 중.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2025/08/04/agibot-secures-strategic-investment-from-lg-electronics-and-mirae-asset/93485/',
    confidence: 'B',
    category: 'funding',
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

export async function insertCiUpdate20261114() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-14) ===\n');

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
        collectedAt: '2026-11-14',
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

insertCiUpdate20261114()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
