/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-01
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-01.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-01)
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
  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree Q3 2026 실적 발표 — 매출 RMB 665M(+70% YoY), 순이익 RMB 113M(-17.37%), 재고 RMB 1.02B로 급증',
    summary: 'Unitree Robotics가 STAR Market 상장 후 첫 분기 실적을 10/28-29에 발표. Q3 2026 매출 약 RMB 6.65억(전년 대비 +70%), 순이익 약 RMB 1.13억(-17.37%). R&D 비용 RMB 1.27억(매출 대비 19.1%)으로 AI·제품 개발 투자 확대가 수익성을 압박. 재고가 2025년 말 RMB 3.67억에서 9월 말 RMB 10.2억으로 급증하여 과잉재고 우려 제기. 9개월 누적 매출 RMB 18.17억(+55.71%), 순이익 RMB 3.87억(+270.54%, 단 전년 주식보상비용 효과 제외 시 -18.78%). Caixin은 "매출 급성장에 비용·재고 동반 급증" 구조로 분석.',
    sourceName: 'Caixin Global / TechNode / TechFlow',
    sourceUrl: 'https://www.caixinglobal.com/2026-10-29/unitrees-robot-boom-comes-with-rising-costs-inventory-102498559.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 총 조달 $465M으로 하향 조정 — 신탁 잔액 $164M(리뎀션 후), PIPE $201M, 기수령 에퀴티 $100M',
    summary: 'TheAIInsider 10/30 보도. Agility Robotics의 Churchill Capital XI 합병을 통한 SPAC 거래의 총 예상 조달금이 당초 $620M+에서 약 $465M으로 하향 조정. 리뎀션으로 CCXI 신탁 잔액이 약 $420M에서 $164M으로 감소한 것이 주요 원인. Foxconn 주도 PIPE $201M과 기수령 에퀴티 $100M은 유지. 주주 특별총회 11/2 예정, 승인 시 Nasdaq에 "AGLT" 티커로 11월 초 거래 개시 전망. 리뎀션 비율이 60%를 초과하여 상장 후 유동성·운영자금 확보에 대한 시장 우려 존재.',
    sourceName: 'TheAIInsider / Unite.AI',
    sourceUrl: 'https://theaiinsider.tech/2026/10/30/agility-robotics-expects-about-465m-from-spac-deal-ahead-of-nov-5-nasdaq-debut/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'AGIBOT Innovation Day 2026 — AHA3(3세대 하드웨어 아키텍처) 공개, GO-3 파운데이션 모델 프리뷰, 로봇 OS 연내 완전 오픈소스화 선언',
    summary: 'Forbes 10/30 보도. AGIBOT Innovation Day 2026(10/29 상하이)에서 Worken 프레임워크 외 추가 핵심 발표: (1) AHA3 — 3세대 하드웨어 아키텍처 공개. 이전 세대 대비 생산성·내구성 개선, G2 Max 산업용 대형 로봇에 적용. (2) GO-3 — 자체 개발 세계 추론 행동(World Reasoning Action) 파운데이션 모델 프리뷰. Q3 2026 출시 예정이었으나 현재 공식 출시 미확인. (3) 로봇 운영체제를 연말까지 완전 오픈소스로 공개 계획 발표. Agibot이 하드웨어·소프트웨어·생태계 3축 전략을 동시 추진.',
    sourceName: 'Forbes',
    sourceUrl: 'https://forbes.com/sites/johnkoetsier/2026/10/30/worlds-biggest-humanoid-robot-maker-wants-to-change-how-we-measure-robot-work',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus, 로보택시(Cybercab) 충전 플러그인 용도로 배치 예정 — 무선 충전 개발 완료까지 과도기 솔루션',
    summary: 'NotATeslaApp 보도. Tesla 경영진이 Optimus 로봇을 Supercharger에서 Cybercab(로보택시)에 충전 플러그를 꽂는 과도기 역할로 활용할 계획임을 밝힘. 자율 무선 충전 기술이 완성될 때까지의 브릿지 솔루션. 이는 Optimus의 첫 상업적 활용 사례(use case)가 Tesla 내부 운영(로보택시 충전 인프라)이 될 수 있음을 시사. 외부 고객 납품(2027년 목표)에 앞서 Robotaxi 네트워크의 운영 효율화에 먼저 투입되는 전략적 선택.',
    sourceName: 'NotATeslaApp',
    sourceUrl: 'https://www.notateslaapp.com/news/4904/teslas-optimus-robot-will-soon-plug-in-robotaxis-to-charge',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI 올핸즈(10/23) — AI 학습 데이터 주당 $8.1M 투자 공개, Helix 2.5 출하 중, Index 데이터 엔진 구축',
    summary: 'HumanoidsDailyNews 보도. Figure AI CEO Brett Adcock가 10/23 올핸즈 미팅에서 공개한 추가 정보: (1) AI 학습 데이터에 주당 $810만(연 $420M+ 환산) 투자 중. (2) Helix 2.5가 9/17 발표 후 현재 Figure 03에 탑재되어 출하 중. 패키지 소팅 등 실제 상업 워크플로에 적용. (3) "Index" 데이터 엔진 구축 중 — 자체 데이터 수집·큐레이션·학습 파이프라인. (4) Figure 04 디자인 락 상태에서 부품 생산·조립 테스트 진행 중. 연간 $400M 이상 데이터 투자 규모는 휴머노이드 스타트업 중 최대 수준.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/figure-all-hands-figure-04-index-data-helix-3',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas, Hyundai RMAC(Robotics Metaplant Application Center) 조지아에서 공장 훈련 시작 — 2027년 10배 규모 시설로 확대 예정',
    summary: 'Infomediaire·TechRepublic 종합. Boston Dynamics의 차세대 Atlas가 Hyundai Motor Group Metaplant America(조지아주 사바나 인근)에 위치한 RMAC(Robotics Metaplant Application Center)에서 산업 현장 훈련을 시작한 것으로 확인. 실제 자동차 조립 라인 환경에서의 작업 학습·최적화 프로그램. 2027년에는 현재 대비 약 10배 규모의 확장 시설에서 본격적인 산업 배치를 진행할 계획. 산업 롤아웃 시기에 대해서는 출처마다 차이(일부 2028년, 일부 2027년)가 있어 정확한 타임라인은 미확정. Atlas 2026년 생산분 전량이 Hyundai RMAC 및 Google DeepMind에 할당된 상태.',
    sourceName: 'Infomediaire / TechRepublic',
    sourceUrl: 'https://www.infomediaire.net/atlas-robot-humanoide-boston-dynamics-hyundai-usine/',
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

export async function insertCiUpdate20261101() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-01) ===\n');

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
        collectedAt: '2026-11-01',
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

insertCiUpdate20261101()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
