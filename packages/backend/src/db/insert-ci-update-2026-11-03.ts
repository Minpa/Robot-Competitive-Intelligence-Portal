/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-03
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-03.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-03)
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
    headline: 'Agility Robotics SPAC 합병 주주투표 승인 완료 (11/2) — 84%+ 찬성, 11/4 거래 종결·11/5 Nasdaq "AGLT" 거래 개시 예정',
    summary: 'Churchill Capital Corp XI 주주총회가 2026년 11월 2일 개최되어 Agility Robotics와의 합병 안건이 투표의 84% 이상 찬성으로 승인. 거래 종결(closing)은 11/4 예정이며, 합병 후 Agility Robotics, Inc.로서 Nasdaq에 "AGLT"(보통주) 및 "AGLTW"(워런트) 티커로 11/5 거래 개시 전망. 미국 최초 상장 순수 휴머노이드 로봇 기업이 될 예정. 총 조달금 약 $465M(CCXI 신탁 잔액 $164M + Foxconn 주도 PIPE $201M + 기수령 에퀴티 $100M). 리뎀션 비율이 높아 당초 $620M+ 대비 대폭 하향 조정되었으나, 상장 자체는 예정대로 진행.',
    sourceName: 'GlobeNewsWire / Manila Times / SEC 8-K Filing',
    sourceUrl: 'https://www.manilatimes.net/2026/11/03/tmt-newswire/globenewswire/churchill-capital-corp-xi-shareholders-approve-business-combination-with-agility-robotics/2460123',
    confidence: 'A',
    category: 'funding',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Q3 2026 실적 발표 — Optimus Fremont 고용량 생산 라인 "조기 생산(early production)" 진입 확인, 연 100만대 설계 용량',
    summary: 'Tesla Q3 2026 실적발표(10/21)에서 Musk가 Fremont 공장 내 구 Model S/X 생산 라인을 Optimus Gen 3 고용량 생산 라인으로 전환 완료하고 "early production"에 진입했다고 확인. 라인 설계 용량은 연간 약 100만대이며, 대부분의 장비가 이미 설치 완료. 주당 20,000대 목표 달성에는 "최소 1년 이상" 소요 예상. AI5 칩 Optimus 통합은 2027년 4월 목표. 외부 고객(산업용 우선) 첫 인도는 2027년 말 전망. Giga Texas에 연 1,000만대 규모의 2차 라인도 계획 중.',
    sourceName: 'Benzinga / NotATeslaApp / SEC 8-K / Gloom Transcript',
    sourceUrl: 'https://www.notateslaapp.com/news/4867/tesla-q3-2026-earnings-call-recap-everything-you-need-to-know',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 소비자 예약(reservation) 2026년 12월 Humanoids Summit 전후 개시 루머 — $20,000+ 가격대, 인도 2027년 말 이후',
    summary: 'SF Standard·AI Weekly 등 복수 매체 보도. 로보틱스 투자자 Modar Alaoui에 따르면 Tesla가 Humanoids Summit(12/1-2) 전후로 Optimus 소비자 예약을 개시할 계획이라고 전달. 예상 가격 $20,000 이상. 다만 Tesla는 공식 확인 거부. 실제 인도는 2027년 말 이후이며, 초기 물량 대부분은 기업용 배정. 애널리스트들은 가정용 실제 인도는 2028~2029년으로 전망. Newsquawk은 "수요 시그널을 위한 예약 큐이지 실제 인도 일정이 아님"이라고 분석.',
    sourceName: 'SF Standard / AI Weekly / Basenor',
    sourceUrl: 'https://sfstandard.com/2026/10/30/tesla-optimus-robot-waitlist/',
    confidence: 'C',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'AGIBOT G2 Max 산업용 대형 휴머노이드 공개 — 21 DOF, 듀얼암 40kg 페이로드, 작업 높이 0.1~2.5m, AHA3 아키텍처 적용',
    summary: 'AGIBOT Innovation Day 2026(10/29)에서 G2 Max 산업용 대형 로봇 상세 스펙 공개. 21 자유도(DOF), 듀얼암 최대 40kg 핸들링 용량, 작업 높이 0.1~2.5m 가변. 3세대 하드웨어 아키텍처(AHA3) 적용으로 생산성·내구성 개선. 제조·물류·소재 핸들링 작업에 최적화. 별도로 Link-U OS 1.0(업계 최초 체화지능 전용 운영체제) 발표. 현재 선별 파트너사 시험 운용 중이며, OpenAtom Foundation과 협력하여 2026년 말까지 완전 오픈소스화 계획. 누적 생산량 15,000대 돌파 마일스톤 달성(9월 기준 20,000대 이상으로 수정 — 10/29 Innovation Day에서 15,000대로 재확인).',
    sourceName: 'PR Newswire / The Robot Report / CCLeaks',
    sourceUrl: 'https://www.therobotreport.com/agibot-introduces-worken-measure-robot-productivity-innovation-day-2026/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 소비자 인도 시작 보도 vs 미확인 — TravTeks "가정 배송 시작" 보도, 복수 리뷰어 "확인된 고객 인도 사례 없음" 상충',
    summary: 'TravTeks가 1X NEO의 가정 배송이 시작되었다고 보도하나, RoboZaps(7/16 리뷰) 및 TheRobotForThat 등 복수 리뷰 사이트는 "확인된 고객 인도 사례를 찾을 수 없다"며 1X의 마케팅 자료도 여전히 미래 시제라고 지적. 1X 공식 페이지는 "일부 고객은 올해, 일부는 이후에 NEO를 받게 될 것"이라는 모호한 표현 유지. 텔레오퍼레이션(원격 조종) 의존 비율 미공개 지속. 프라이버시 우려 — 원격 오퍼레이터가 가정 내 카메라·마이크를 통해 "사실상 집 안에 존재"하는 구조. SoftBank $6B 밸류에이션 과반 지분 인수 협상(8월 The Information 보도)은 10월 현재 합의 여부 미확인.',
    sourceName: 'TravTeks / RoboZaps / TheRobotForThat / eWeek',
    sourceUrl: 'https://www.travteks.com/blog/1x-neo-home-delivery/',
    confidence: 'C',
    category: 'production',
  },

  // ── 규제/산업 동향 ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Reuters 분석 — 중국 로봇 업체 "몸은 완성, 두뇌가 과제": 미국 AI 리드 vs 중국 제조·데이터 강점, 칩 부족 리스크 부각',
    summary: 'Reuters/BusinessWorld 11/2 분석 기사. 중국 휴머노이드 로봇 업체들이 하드웨어 제조에서는 글로벌 경쟁력을 확보했으나, 고급 로봇 AI 시스템에서는 미국 기업(Google DeepMind, Figure AI 등)이 앞서고 있다고 평가. 중국 업체들은 제조 규모의 경제와 실환경 학습 데이터 접근성을 경쟁 무기로 활용 전략. 다만 미국의 대중국 반도체 수출 규제로 인한 칩 부족이 중국 체화지능(embodied AI) 부문의 구조적 리스크로 부각. Unitree·Agibot 등 중국 주요 업체에 직접적 영향 가능.',
    sourceName: 'Reuters / BusinessWorld Online',
    sourceUrl: 'https://bworldonline.com/technology/2026/11/02/790776/chinas-robot-makers-have-mastered-the-moves-now-comes-the-race-for-brains',
    confidence: 'B',
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

export async function insertCiUpdate20261103() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-03) ===\n');

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
        collectedAt: '2026-11-03',
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

insertCiUpdate20261103()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
