/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-11
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-11.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-11)
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
    headline: 'Tesla 서플라이어에 Optimus 15,000대 부품 발주 — 9월 1,000대/주, 연말 2,500대/주 목표',
    summary: 'Tesla가 서플라이어에게 2026년 말까지 총 15,000대의 Optimus Gen 3 부품을 발주한 것으로 보도. 9월까지 주당 1,000대, 연말까지 주당 2,500대로 생산 확대 목표. 현재 Giga Texas에서 배터리 셀 분류, 부품 키팅, 재고 관리 등 내부 배치 운영 중. 소비자/기업 외부 판매는 2027년 말 이후.',
    sourceName: 'NextBigFuture / TrendForce',
    sourceUrl: 'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus AI5 추론칩 2026.4 테이프아웃, Gen 3 핸드 50 액추에이터/22 DOF, Grok 음성 통합',
    summary: 'Optimus 전용 AI5 추론칩이 2026년 4월 테이프아웃 완료. Gen 3 핸드는 50개 액추에이터, 22 DOF를 탑재하여 인간급 손 조작 구현. 2.3 kWh 배터리 탑재. xAI의 Grok이 음성 인터랙션을 담당. Fremont Model S/X 라인을 46일 만에 해체하고 Optimus 전용 생산 라인으로 전환 중.',
    sourceName: 'Yahoo Finance / optimusk.blog',
    sourceUrl: 'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas Gen 5 공개 — 부품 수 "거의 한 자릿수 배" 감소, 양산 설계 최적화 (2026.7)',
    summary: 'Boston Dynamics가 2026년 7월 Atlas 5세대를 공개. 이전 대비 부품 복잡도를 "거의 한 자릿수(order of magnitude)" 줄여 제조 속도 향상, 신뢰성 개선, 비용 절감 달성. 양산 지향 설계로 Hyundai 제조 역량을 활용한 연 30,000대 생산 체제의 기반. 2026년 배치분 완판, 추가 고객 2027년부터.',
    sourceName: 'Forbes / Boston Dynamics Blog',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 1,000번째 유닛 생산 달성 (7/23) — BotQ 시간당 1대, BMW 30,000+ X3 기여',
    summary: 'Figure AI가 2026년 7월 23일 BotQ에서 1,000번째 Figure 03 생산 마일스톤 달성. 시간당 1대 생산 속도 유지. Figure 02는 BMW Spartanburg 공장에서 11개월 배치, 30,000대 이상 X3 차량 생산에 기여하며 1,250+ 가동시간 기록. Figure 03이 BMW 물류 시퀀싱에 투입 중. BotQ 연간 생산능력 12,000대.',
    sourceName: 'Figure AI / iiot-world / RoboZaps',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 첫날 460% 급등, 8,000배 청약 초과 — 밸류에이션 $9B, 시총 $53B 기록',
    summary: 'Unitree Robotics(688836.SH) 8월 19일 상하이 STAR Market 상장. IPO 가격 ¥150.80, 첫날 종가 ¥845(+460%), 장중 최고 1,100위안(+629%). 소매 투자자 8,000배 청약 초과. $9억 규모 IPO. 시총 한때 $53B 도달. 중국 최초 순수 휴머노이드 로봇 상장사. 이후 9월 초까지 고점 대비 50%+ 조정.',
    sourceName: 'CNBC / Yahoo Finance / Bloomberg',
    sourceUrl: 'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree H2 20,000대 연간 생산 목표, 생산능력 4배 확대 계획',
    summary: 'Unitree Robotics가 생산능력을 4배로 확대하여 연간 20,000대의 휴머노이드 로봇 생산을 목표. H1 모델은 H2로 대체 진행 중(H1-2 단종). H2 가격 $29,900, G1 가격 $13,500(미국 $21,600). 2025년 5,500대+ 출하, 2026년 글로벌 시장점유율 ~32% 유지.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics S-4 공시: 2025 매출 $1.8M, 영업손실 $140M — $300M+ Digit V5 수주 확보',
    summary: 'Agility Robotics SPAC S-4 공시에 따르면 2025년 순매출 $1.8M, 영업손실 $140M(전년 $71M→$111M 지출 증가). $300M+ 멀티이어 Digit V5 수주 확보. 30+ 잠재고객 대규모 배치 평가 중. 현재 9개 고객 사이트 배치(GXO, Schaeffler, Toyota Canada, Mercado Libre, Amazon). SPAC 합병 총 수익 $620M+(트러스트 $420M + Foxconn PIPE $200M).',
    sourceName: 'The Robot Report / SEC Filing',
    sourceUrl: 'https://www.therobotreport.com/agility-robotics-reports-18m-revenue-ahead-of-humanoid-spac/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'NVIDIA Halos 로봇 안전 플랫폼 출시 — Agility Digit 최초 통합 파트너',
    summary: 'NVIDIA가 로봇 산업 최초의 풀스택 안전 시스템 "Halos for Robotics"를 발표. Agility Robotics가 Digit V5에 Halos를 최초로 통합하는 런치 파트너로 선정. Halos는 물리적 AI 안전 프레임워크로 인증/준수를 지원. Digit V5의 "케이지 밖" 작업(안전 펜싱 없이 인간 공존)을 가능케 하는 핵심 기술.',
    sourceName: 'NVIDIA Newsroom / NVIDIA IR',
    sourceUrl: 'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Apollo 3을 최초 상용 제품으로 예고 (2027), Jabil 3번째 엔터프라이즈 고객 확보',
    summary: 'Apptronik이 Apollo 2를 훈련/데이터 수집 플랫폼으로 정의하고, Apollo 3을 "최초의 진정한 상용 제품"으로 2027년 출시 예고. Jabil이 Mercedes-Benz, GXO에 이은 3번째 엔터프라이즈 파일럿 고객으로 추가. Elevate Robotics Inc.(2025.6 설립) 자회사가 "초인간적(superhuman)" 산업 자동화에 집중. Google DeepMind와 Robot Park에서 데이터 수집 협력 지속.',
    sourceName: 'New Market Pitch / Apptronik Blog / Reuters',
    sourceUrl: 'https://newmarketpitch.com/blogs/news/humanoid-robotics-apptronik-upate',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 사전주문 5일 만에 초년 10,000대 완판, EQT 10,000대 배치 딜 체결',
    summary: '1X Technologies의 NEO 가정용 휴머노이드 로봇이 사전주문 개시 5일 만에 초년 생산분 10,000대 완판. EQT(부동산 투자사)와 10,000대 배치 딜 체결. 가격 $20,000(Early Access) 또는 월 $499 구독. 자체 개발 Tendo Drives 모터(고토크 밀도, 텐던 구동). 작동 소음 ~22 dB(냉장고 수준). San Carlos 추가 시설 2026 하반기 가동 예정. 고객 인도 시점은 아직 미확인.',
    sourceName: 'Forbes / eWeek / TNW',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 원정 — 세계 휴머노이드 로봇 게임 우슈(태극권) 금메달, G2 태블릿 생산라인 실전 배치',
    summary: '2026년 8월 24일 제2회 World Humanoid Robot Games에서 Agibot Expedition A3가 우슈(태극권) 종목 금메달 획득. Agibot의 휠 베이스 G2 로봇이 세계 최초로 태블릿 컴퓨터 양산 라인에 인간과 함께 실전 배치되어 작업 수행. Forbes가 "세계 최초 산업 규모 전자제품 생산 라인 휴머노이드 투입"으로 보도.',
    sourceName: 'Forbes / Interesting Engineering / PR Newswire',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/15/world-first-humanoid-robot-on-live-industrial-scale-electronics-production-line/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 준비 — 목표 HK$40B~50B, LG전자·Mirae Asset 전략 투자자',
    summary: 'Agibot이 홍콩 증시 IPO를 준비 중이며 목표 밸류에이션 HK$40B~50B($5.1B~$6.4B). 전략 투자자에 LG전자, Mirae Asset, BYD, Hillhouse Investment 포함. 2026 상반기 8,400대 출하(글로벌 44%), 누적 15,000대+. 2025년 5,168대로 글로벌 1위. 라인업: A2/A3 시리즈(풀사이즈), X2(교육), G2(산업용).',
    sourceName: 'Tracxn / PitchBook / SCMP',
    sourceUrl: 'https://pitchbook.com/profiles/company/528463-99',
    confidence: 'B',
    category: 'funding',
  },

  // ── 산업 이벤트 ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'HRS Europe 2026 슈투트가르트 (9/9~11) — BD, Google DeepMind, Unitree, BMW 등 37명 연사',
    summary: '2026년 9월 9~11일 독일 슈투트가르트에서 Humanoid Robots Summit (HRS Europe) 개최. 1,000+ 참석자, 37명 연사(Robert Bosch, Boston Dynamics, Google DeepMind, Unitree, PAL Robotics, BMW), 40+ 전시업체. 산업계 주요 플레이어가 한자리에 모인 유럽 최대 휴머노이드 로봇 행사.',
    sourceName: 'Humanoid Robots Summit',
    sourceUrl: 'https://humanoidrobotssummit.com/',
    confidence: 'A',
    category: 'partnership',
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

export async function insertCiUpdate20260911() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-11) ===\n');

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
        collectedAt: '2026-09-11',
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

insertCiUpdate20260911()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
