/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-21
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-21.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-21)
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
    headline: 'Tesla 2026 연차 주주보고서에서 Optimus V3 양산 준비 완료 선언 — 첫 생산라인 건설 중, 중국 A주 로봇 공급망주 상한가',
    summary: 'Tesla가 10/19 SEC 제출 2026 연차 주주보고서(annual shareholder report)에서 3세대 Optimus 휴머노이드 로봇의 양산 준비가 완료되었으며 첫 생산라인이 건설 중이라고 공식 발표. 이 공시 직후 10/20 중국 A주 시장에서 로봇 공급망 관련 종목들이 일제히 상한가(limit-up)를 기록하며 급등. The Information 보도에 따르면 현재 Fremont에서 주간 수백 대 생산 중이나, 연차보고서의 공식 표현은 이전 비공식 보도와 차이가 있어 실제 생산 규모와 타임라인에 대한 해석이 분분한 상태.',
    sourceName: 'BigGo Finance / SEC Filing / The Information',
    sourceUrl: 'https://finance.biggo.com/news/10127d79-8a19-4a31-a82b-80fd13c826b8',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics 신임 CEO Rohit Prasad 취임 (10/7) — 前 Amazon Alexa/AGI SVP, Physical AI 전략 가속화',
    summary: 'Boston Dynamics가 10/7 Rohit Prasad를 신임 CEO로 임명. Prasad는 Amazon에서 Alexa 및 AGI(인공일반지능) 부문 SVP/수석 과학자를 역임하며 Amazon Nova 파운데이션 모델 개발을 주도한 AI 전문가. 전임 CEO Robert Playter가 2월 사임한 후 Amanda McMaster가 임시 CEO를 수행. Hyundai 모회사는 이번 인사를 "Physical AI 전략 가속화"로 포지셔닝. Prasad는 이사회 합류도 예정. 세계 최고 수준의 로봇 하드웨어(Atlas)와 최전선 AI 역량의 결합을 목표로 하는 전략적 CEO 교체.',
    sourceName: 'Reuters / Robotics 24/7 / The Star / CXO Digital Pulse',
    sourceUrl: 'https://www.robotics247.com/article/boston-dynamics-names-rohit-prasad-as-new-ceo',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Nvidia, Figure AI에 추가 ~$10억 투자 논의 중 — The Information 보도, 밸류에이션 ~$380억',
    summary: 'The Information이 10/7 보도한 바에 따르면 Nvidia가 Figure AI에 약 $10억 규모의 추가 투자를 논의 중. Figure AI는 동시에 프리머니 밸류에이션 약 $380억 수준에서 새로운 자금 조달을 추진. Nvidia는 이미 2025년 9월 Series C($10억+ 조달, 포스트머니 $390억)에 참여한 기존 투자자이자 Figure Helix AI 모델 및 로봇 배치의 핵심 하드웨어·기술 파트너. 확정 시 Figure AI의 자본 조달 총액이 대폭 확대되며 휴머노이드 산업 내 Nvidia-Figure 수직통합 연대가 강화.',
    sourceName: 'The Information / CryptoBriefing / Placera (Sweden)',
    sourceUrl: 'https://cryptobriefing.com/nvidia-discusses-1-billion-figure-ai-investment/',
    confidence: 'C',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI–Catalyst Brands 상업 계약 체결 — Figure 03 Reno NV 물류센터 배치, JCPenney+SPARC 1,800+ 매장 네트워크',
    summary: 'Figure AI가 5/26 Catalyst Brands(JCPenney와 SPARC Group 합병으로 탄생, JCPenney·Aéropostale·Brooks Brothers 등 1,800+ 매장 운영)와 Figure 03 휴머노이드 로봇 배치 상업 계약을 체결. 네바다 Reno 물류센터(Distribution Logistics Center)를 첫 배치 사이트로, 반복적·육체적 부담이 큰 분류·포장 작업 자동화 목표. Joey Pouch 소팅 시스템과 연동. BMW Spartanburg 공장에 이어 두 번째 주요 상업 배치 고객 확보로 리테일 물류 섹터 확장.',
    sourceName: 'IndustrialSage / Retail Tech Innovation Hub / PingWest',
    sourceUrl: 'https://www.industrialsage.com/figure-ai-humanoid-robots-catalyst-brands-warehouse/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot X2 100대 ASD 리테일 스토어 배치 — 고객 맞이·제품 질의 응대, 리테일 서비스 로봇 섹터 확장',
    summary: 'Agibot이 소형 휴머노이드 X2를 ASD 리테일 스토어에 100대 배치하여 매장 내 고객 맞이(greeting) 및 제품 관련 질의 응대 서비스를 제공. Chimelong Spaceship Park 300대+ 배치(엔터테인먼트·관광)에 이어 리테일 서비스 섹터로 확장. IDC 데이터 기준 2026 H1 글로벌 출하량 8,600대+(글로벌 35%), 9월 누적 20,000대 생산 돌파, 분기당 5,000대 생산 템포 유지 속에서 배치 다변화 가속.',
    sourceName: 'Robotics & Automation News / Humanoids Daily / IDC',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'B',
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

export async function insertCiUpdate20261021() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-21) ===\n');

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
        collectedAt: '2026-10-21',
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

insertCiUpdate20261021()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
