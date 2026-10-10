/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-10
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-10.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-10)
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
  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics 신임 CEO Rohit Prasad 취임 (10/7) — 전 Amazon Alexa/AGI SVP, Physical AI 상용화·IPO 추진',
    summary: 'Boston Dynamics가 10월 7일 Rohit Prasad를 신임 CEO로 선임. Prasad는 Amazon에서 12년간 Alexa 및 AGI 총괄 SVP를 역임하고 Amazon Nova 파운데이션 모델 개발을 주도한 인물. 2월 사임한 Robert Playter 후임으로, CFO Amanda McMaster가 중간 대행. Hyundai Motor Group이 "Physical AI" 상용화를 핵심 과제로 제시하며 Atlas·Spot·Stretch의 산업·상업용 배치 가속을 위임. 복수 매체에서 Boston Dynamics의 내년 IPO 추진 가능성도 보도. Hyundai는 2028년까지 Kia 글로벌 공장에 25,000대 Atlas 배치 계획을 유지.',
    sourceName: 'Korea Herald / The Star Malaysia / Manufacturing Dive / Robotics 24/7',
    sourceUrl: 'https://www.koreaherald.com/article/10895825',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics RMAC(Robotics Metaplant Application Center) 개소 — Hyundai 조지아 공장 내 Atlas 훈련·통합 거점',
    summary: 'Boston Dynamics가 9월 21일 Hyundai 조지아 Metaplant America 내에 RMAC를 개소. Atlas 휴머노이드 로봇이 자동차 부품 시퀀싱·물류 작업을 학습 중. 2027년 10배 규모 확장 시설 계획. Hyundai는 글로벌 공장 네트워크에 25,000대 Atlas 배치 목표, 미국 내 연간 30,000대 생산 시설도 구상. 2030년까지 부품 조립, 중량물 핸들링 등으로 적용 범위 확대 예정. Atlas의 산업용 실환경 배치 첫 대규모 거점.',
    sourceName: 'The Robot Report / Axios / CBT News / Just Auto',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-opens-metaplant-application-center-train-atlas-humanoid-robots/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus V3 핸드 양산 난항 — 수작업 조립 의존, AI 일반화 능력 미달, 외부 판매 2027년 하반기로 후퇴',
    summary: 'The Information(Electrek 인용) 보도에 따르면 Optimus V3 생산이 Q2 주당 수십 대에서 8월 수백 대로 증가했으나, 핸드·전완부의 자동화 조립 스테이션 정밀도 부족으로 상당 부분 수작업 조립 필요. JPMorgan 미팅 후 외부 판매 시점이 2027년 하반기로 후퇴(Musk의 기존 2026년 목표 대비 지연). 핸드 정교함(dexterity) 확보가 스케일링의 핵심 병목. 연말 주당 1,000대 연속 자동 라인 가동이 목표이나 달성 불확실. 또 다른 Optimus 프로그램 리더 이탈도 보도.',
    sourceName: 'Electrek / The Information / BGR / Nasdaq (Zacks)',
    sourceUrl: 'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility 투자자 데이 개최 (10/6) — Digit 5 12월 얼리 액세스 배치, $300M+ 멀티연도 주문, SPAC 연내 마감 예정',
    summary: 'Agility가 10월 6일 뉴욕에서 애널리스트·투자자 데이를 개최, Schaeffler·Foxconn·AUVSI 참여. Digit 5의 12월 얼리 액세스 고객 배치를 확인. $300M+ 멀티연도 주문 파이프라인(1,000대 3년 RaaS 계약 기반, 2026년 5월 기준)을 공시. Churchill Capital XI(CCXI)과의 SPAC 합병을 연내 마감하여 Nasdaq "AGLT" 티커로 상장 목표. 50 lb 페이로드, 9분 급속 충전, 사이클로이드 액추에이터 레그, NVIDIA Halos 협력안전 시스템 탑재 등 Digit 5 핵심 스펙 확인.',
    sourceName: 'Agility Robotics / BusinessWire / GeekWire / SEC Filing',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-livestream-analyst-investor-day-today',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot CEO, 말레이시아 PM Anwar와 회담 — 2035년까지 RM10억(약 $2.3억) 투자·5,000개 일자리 창출 서약 (10/5)',
    summary: 'Agibot 창업자 겸 CEO Deng Taihua가 9월 말 항저우에서 말레이시아 총리 Anwar Ibrahim과 회담. 2035년까지 말레이시아에 최대 RM10억(약 $2.3억) 투자와 5,000개 일자리 창출을 서약. 휴머노이드 로봇, 디지털 인프라, AI, EV 기술, 전자상거래 분야의 전략 협력을 논의. 1월 i-City(Selangor) AI World Experience Centre 개소에 이은 APAC 확장 가속. 잠재적 커미트먼트(potential pledge)로 구속력 있는 계약은 아직 아님에 유의.',
    sourceName: 'The Star Malaysia / The Edge / MetaIntro / Bernama',
    sourceUrl: 'https://www.thestar.com.my/news/nation/2026/10/05/agibot-pledges-potential-rm1bil-investment-after-pm-anwar-meeting',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'IDC: Agibot H1 2026 글로벌 휴머노이드 출하량 1위 확정 — 8,600대, 35% 점유율, 글로벌 시장 25,000대 규모',
    summary: 'IDC 데이터(10/2 발표) 기준 Agibot이 2026년 상반기 글로벌 휴머노이드 로봇 출하량 1위를 확정. 8,600대 이상 출하하여 약 35% 글로벌 시장 점유율 달성. 전체 글로벌 시장은 약 25,000대 규모로 성장. Unitree는 약 5,900대(31%)로 2위. 누적 생산 15,000대(9월) → 20,000대(9/24) 마일스톤을 연속 달성. Omdia의 2025년 1위(5,168대, 39%) 지위를 IDC 데이터로도 재확인.',
    sourceName: 'Robotics & Automation News / IDC',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 코즈웨이 베이 오피스 개소 (10/9) — APAC 비즈니스 허브 구축',
    summary: 'Agibot이 10월 9일 홍콩 코즈웨이 베이(Causeway Bay)에 신규 오피스를 개소. 말레이시아·베트남 이후 APAC 3번째 해외 거점. 글로벌 영업·파트너십·기술 지원을 위한 비즈니스 허브로 운영. 9월 누적 20,000대 생산, IDC 기준 H1 2026 글로벌 1위 등 성장세를 기반으로 APAC 시장 공략을 가속화.',
    sourceName: 'Agibot 공식 뉴스룸',
    sourceUrl: 'https://www.agibot.com/article/231/detail/82.html',
    confidence: 'B',
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

export async function insertCiUpdate20261010() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-10) ===\n');

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
        collectedAt: '2026-10-10',
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

insertCiUpdate20261010()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
