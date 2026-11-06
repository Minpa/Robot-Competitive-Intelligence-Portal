/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-06
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-06.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-06)
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
  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility AGLT 첫 거래일 $11.26 시가 — 블룸버그 "Nvidia-Backed Humanoid Maker Goes Public in First for the US" 헤드라인, 장중 $10.30 하락',
    summary:
      '2026년 11월 5일 Agility Robotics가 Nasdaq에서 AGLT 티커로 첫 거래를 개시. SiliconANGLE에 따르면 시가 $11.26(SPAC 가격 $10 대비 12.6% 프리미엄)으로 출발했으나 장중 $10.30까지 하락. Bloomberg은 "Nvidia-Backed Humanoid Maker Agility Goes Public in First for the US"로 보도. 공식 GlobeNewsWire 릴리스에서 Agility는 "미국 최초의 순수 휴머노이드 로봇 상장사(first U.S. publicly listed pure-play humanoid robotics company with proven, active commercial deployments)"라고 포지셔닝. Digit 5 선주문 $300M+ 다년 계약이 시장 근거. Foxconn 주도 PIPE $201M 포함 총 조달 ~$465M.',
    sourceName: 'Bloomberg / SiliconANGLE / GlobeNewsWire',
    sourceUrl: 'https://siliconangle.com/2026/11/05/humanoid-robot-maker-agility-robotics-debuts-on-the-nasdaq-after-spac-merger/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Unitree (G1) ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree G1 태산 등반 대회 중 과열 리타이어 — CMG 월드 로봇 태산 클라이밍 경진대회(11/2), 들것으로 하산',
    summary:
      '2026년 11월 2일 산둥성 타이안에서 열린 CMG World Robot Mount Taishan Climbing Competition에서 Unitree G1 개발 버전이 등반 도중 과열(overheating)으로 작동 중단, 직원들이 들것에 실어 하산. Interesting Engineering·Root-Nation·Gadget Review 등 다수 매체 보도. Unitree 측은 해당 로봇이 "대회용 튜닝 없이 투입된 실험 버전"이라고 해명. 정확한 고장 부위(배터리·모터·제어보드 등)는 미공개. 이 사건은 휴머노이드 로봇의 극한 환경 내구성 한계를 드러내는 사례로, 6월 G1 기반 Pemba 로봇의 에콰도르 침보라소 등정 성공(6,268m, 일부 구간 인력 운반)과 대비됨.',
    sourceName: 'Interesting Engineering / Root-Nation / Gadget Review',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-humanoid-overheats-during-mountain-race',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus 생산 스케일업 난항 — TipRanks "높은 비용과 병목" 분석, 현재까지 수백 대 수준 생산 추정',
    summary:
      'TipRanks(11월 초) 분석에 따르면 Tesla는 Fremont 고속 라인에서 Optimus "조기 생산(early production)"을 시작했으나 실제 생산량은 수백 대 수준에 불과. 주당 20,000대 목표까지 "최소 1년, 어쩌면 더 오래"(Musk Q3 실적발표 발언) 소요 전망. 10,000개 이상 고유 부품으로 구성된 신규 생산 라인의 초기 단계에서 비용 압박과 공급망 병목이 주요 장애. 별도 TipRanks 기사는 "production and leadership setbacks"로 딜레이를 지적. Giga Texas 2세대 라인(연 1,000만대)은 건설 중이나 가동 시점 미확정.',
    sourceName: 'TipRanks / NotATeslaApp / Technology.org',
    sourceUrl: 'https://www.tipranks.com/news/tesla-tsla-struggles-to-scale-optimus-robot-production-amid-high-costs-and-bottlenecks',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: '휴머노이드 공급망 분석(11/5) — Atlas 포함 주요 업체 "제조 스케일업이 최대 과제", 액추에이터·감속기 병목 심화',
    summary:
      'Maintenance World(11/5) 발행 휴머노이드 로봇 공급망 심층 분석. Boston Dynamics Atlas를 포함한 주요 업체들이 프로토타입에서 대량 생산으로의 전환에서 공통적으로 액추에이터·감속기·정밀 부품 공급 병목에 직면. McKinsey 분석 인용, 파일럿 규모 조립 비용 $30K~$150K/대. Citi는 로봇 1대당 리드스크루 30~40개 필요, 부품당 가치 RMB 20,000까지 추산. Atlas는 현재 Hyundai RMAC(조지아) 훈련과 Waltham 프로토타입 생산(1대/일)에 집중 중이며, 연 30,000대 생산 목표 신공장은 건설 계획 단계.',
    sourceName: 'Maintenance World / McKinsey / Citi',
    sourceUrl: 'https://maintenanceworld.com/2026/11/05/the-humanoid-robot-supply-chain-can-manufacturing-keep-up-with-physical-ai',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, BMW Spartanburg Figure 03 배치 확대 — 차체 공장 부품 적재에서 물류 시퀀싱으로 작업 범위 확장',
    summary:
      'Analytics Insight(11월 초) 보도에 따르면 BMW가 Spartanburg 공장에서 Figure 03 배치를 확대하고 있으며, 초기 차체 공장(body shop) 부품 적재 작업에서 물류 시퀀싱(logistics sequencing)으로 작업 범위를 넓히고 있음. Figure 02의 11개월간 배치 기간 동안 30,000대 이상 BMW X3 생산을 지원한 선행 실적 기반. 다만 BMW는 Figure 03 배치 대수와 상업 조건을 공개하지 않음. WebProNews는 독일 공장으로의 확대 가능성도 보도했으나 1차 출처 미확인. Figure 04 디자인 락(10월 올핸즈)에 이어 Figure 03의 상용 배치 확대가 단기 수익원.',
    sourceName: 'Analytics Insight / WebProNews / RuntimeWire',
    sourceUrl: 'https://www.analyticsinsight.net/amp/story/news/bmw-expands-figure-03-humanoid-robot-deployment-at-spartanburg-plant',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot G2 Max 실배치 현황 — 광저우 지하철·침롱 관광단지 등 교통·서비스 분야 배치, 생산라인·이커머스 물류에도 투입',
    summary:
      'Yicai(第一财经, 11월 초)에 따르면 Agibot G2 Max가 다수 생산 라인과 이커머스 물류 창고 시나리오에 이미 배치 운영 중. Agibot 공식 발표에서는 광저우 지하철(Guangzhou Metro)과 침롱(Chimelong) 관광·엔터테인먼트 단지에서의 교통·방문객 서비스 환경 배치도 언급. G2 Max는 바퀴 기반 세미-휴머노이드로 단일 암 20kg, 듀얼 암 피크 50kg 페이로드(Yicai 기준). Forbes는 듀얼 암 40kg으로 보도하여 스펙 수치에 출처 간 차이 존재. Innovation Day 이후 파트너 물류·생산 시설에서의 현장 검증(field validation) 단계에 진입.',
    sourceName: 'Yicai / Agibot Official / Forbes',
    sourceUrl: 'https://x.com/yicaichina/status/2114908860204921220',
    confidence: 'B',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik, Apollo 3 "첫 상용 출하 로봇" 2027년 공개 예정 — Apollo 2는 데이터 수집 전용, 상업 제품 아님',
    summary:
      'Forbes(6월)·The Robot Report(10월) 종합. Apptronik CEO Jeff Cardenas가 Apollo 3를 "실제 작업을 수행하는 첫 출하 로봇(the shipping robot that will actually do real work)"으로 지목, 2027년 공개 예정. Apollo 2(6월 공개)는 Robot Park(90K sqft)에서의 데이터 수집·훈련 플랫폼이며 상업 판매 대상이 아님을 명시. Mercedes-Benz 베를린 파일럿은 자재 이동 작업에 한정, GXO는 초기 PoC 단계. Startup Fortune(7월)은 원래 "Apollo가 Mercedes에서 팩토리 시프트 수행 중"으로 보도했으나 이후 과장이었음을 정정. 현재까지 대규모 상업 배치는 미확인.',
    sourceName: 'Forbes / The Robot Report / Startup Fortune (정정 보도)',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 소비자 인도 현황 불투명 — grabarobot "베타 유닛 배송 시작" 보도 vs 복수 리뷰어 "독립 검증 사례 없음"',
    summary:
      'grabarobot(날짜 미명시)이 "1X Technologies has shipped its first NEO Beta units to consumer customers"로 보도했으나, robozaps(7/16)·The Gadgeteer 등 복수 리뷰어는 "2026년 7월 기준 확인된 고객 인도 사례 없음"으로 상충. Startup Fortune(10월)은 "텔레오퍼레이터 상시 개입 필수" 방식에 대한 프라이버시 우려 보도. 1X 공식 타임라인은 "2026년 내 미국 소비자 배송 시작"이나 독립 검증된 완료 사례 부재. Hayward 캘리포니아 공장 연 10,000대 생산 용량, 2027년 100,000대 확대 목표는 유지. 사전 주문 10,000대(5일 만에 매진, $20,000/대) 이행 상황이 핵심 관전 포인트.',
    sourceName: 'grabarobot / robozaps / Startup Fortune',
    sourceUrl: 'https://grabarobot.com/news/1x-neo-consumer-humanoid-first-deliveries-2026/',
    confidence: 'C',
    category: 'production',
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

export async function insertCiUpdate20261106() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-06) ===\n');

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
        collectedAt: '2026-11-06',
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

insertCiUpdate20261106()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
