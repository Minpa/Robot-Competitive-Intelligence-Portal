/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-27
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-27.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-27)
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
    headline: 'Musk, TomorrowX Summit에서 Optimus 가정용 가사 "12-18개월 내" 가능 전망 — 렌탈 모델 유력, 공개 데모 1-2개월 내 예고 (11/26)',
    summary:
      '2026년 11월 26일 Benzinga, WiseVoter 보도. Elon Musk가 TomorrowX Summit에서 Optimus가 설거지·쓰레기 처리 등 가정 가사를 12-18개월 내 수행할 수 있을 것이라고 발언. "거의 모든 사람이 하나, 아니 둘을 원하게 될 것"이라며 소비자 시장 비전 강조. 11/6 별도 인터뷰에서는 판매보다 렌탈 모델이 유력하다고 언급. Gen 3 공개 데모는 1-2개월 내 예정이라 했으나 정확한 날짜·장소 미공개. 가격·렌탈 요금 미확정.',
    sourceName: 'Benzinga / WiseVoter / Not a Tesla App',
    sourceUrl: 'https://www.benzinga.com/news/26/11/63663113/elon-musk-says-pretty-much-everyones-going-to-want-one-if-not-two-tesla-robots-once-they-can-wash-dirty-dishes-and-take-out-trash-within-18-months',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Hyundai Mobis, Atlas 전기 휴머노이드 부품 양산 개시 — 2026년 전체 Atlas 생산분 Hyundai·DeepMind 배정 완료 보도 (11월)',
    summary:
      '2026년 11월 Evertiq, The Robot Report 등 보도. Hyundai Mobis가 Boston Dynamics Atlas 전기 휴머노이드 로봇용 핵심 부품 양산을 시작한 것으로 보도됨. 별도 출처에서 2026년 전체 Atlas 생산분이 Hyundai 자동차 공장과 Google DeepMind 연구용으로 이미 배정 완료되었다고 언급. 부품 종류(액추에이터·관절·전자장치 등) 및 생산 규모·납품 단가는 미공개. Boston Dynamics·Hyundai Mobis 공식 확인 없음.',
    sourceName: 'Evertiq / The Robot Report',
    sourceUrl: 'https://evertiq.com/design/2026-11-25-globalfoundries-to-test-atlas-humanoid-robots-in-its-fabs',
    confidence: 'C',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI CEO, Figure 03 자율 사과 집기 영상 공개 — Musk "대부분 휴머노이드 데모는 연출" 주장에 반박 (11/23)',
    summary:
      '2026년 11월 23일 Notebookcheck, mezha.net 보도. Figure AI CEO Brett Adcock가 X에 Figure 03가 테이블 위 사과를 자율적으로 집는 영상을 게시. 테이블을 옮겨도 로봇이 적응하여 태스크를 완수하는 모습을 보여주며, 특정 훈련 없이(zero-shot) 동작했다고 주장. Elon Musk의 "대부분 휴머노이드 데모는 연출"이라는 발언에 대한 직접 반박. 커뮤니티에서는 시도 횟수·자율성 수준에 대한 의문 제기. Figure의 비전-언어-행동(VLA) 모델 Helix 계열의 성능 시연으로 해석됨.',
    sourceName: 'Notebookcheck / mezha.net / Brett Adcock (X post)',
    sourceUrl: 'https://www.notebookcheck.net/Figure-AI-Tesla-rival-counters-Elon-Musk-s-robot-criticism-with-an-apple.1460812.0.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI, Figure 04 설계 확정(design lock) 완료 및 Helix 3 AI 모델 테스트 돌입 — 가정용 자율성 "수개월 내" 목표 (11/6-19)',
    summary:
      '2026년 11월 6일 Forbes, 11/19 HumanoidMegaHub 보도. Figure AI가 4세대 휴머노이드 Figure 04의 설계 확정(full design lock)을 달성했다고 발표. 동시에 차기 AI 모델 Helix 3가 테스트 단계에 진입. CEO Adcock는 11/19 인터뷰에서 "6개월 이내에 처음 보는 가정에 로봇을 배치하고 음성 지시만으로 유용한 작업을 수행하게 할 수 있을 것"이라고 발언. Figure 04의 구체적 스펙(크기·무게·자유도)·출시 시기·Helix 3의 아키텍처 세부는 미공개.',
    sourceName: 'Forbes / HumanoidMegaHub',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/11/06/figure-ceo-brett-adcock-every-major-announcement-from-company-meeting/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI BotQ 공장, Figure 03 누적 1,000대 생산 돌파 — 시간당 1대 이상 지속 생산율 달성 (11/6 Forbes 확인)',
    summary:
      '2026년 11월 6일 Forbes, eWeek 보도. Figure AI의 BotQ 제조 시설이 Figure 03 누적 1,000대 생산 마일스톤을 달성. CEO Adcock가 금색 도장의 1,000번째 유닛을 공개. 4월 350대 → 7월 1,000대로 약 12주간 650대 추가 생산. 시간당 1대 이상의 지속 생산율을 기록했으나, BotQ 1호 라인의 연간 최대 용량 12,000대 대비 실제 가동률은 한참 미달 추정(The Gadgeteer 분석). 고객 인도 현황·재고 대수 미공개.',
    sourceName: 'Forbes / eWeek / The Gadgeteer',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Agility Robotics, Digit 5에 NVIDIA Halos 안전 플랫폼 최초 통합 — 케이지 없는 인간-로봇 협업 산업 최초 사례, $300M+ 수주 (11월)',
    summary:
      '2026년 11월 Thomasnet, Forbes 보도. Agility Robotics가 NVIDIA의 신규 Halos 로봇 안전 플랫폼을 Digit 5 휴머노이드에 최초로 통합. Digit 5는 안전 케이지 없이 인간과 같은 공간에서 작업할 수 있는 최초의 휴머노이드로, 50파운드(약 23kg) 적재능력에 9분 충전 지원. 다년간 Digit 5 주문이 $300M 이상이라고 보도됐으나 계약 마일스톤 조건부. 30개 이상 잠재 고객사가 제조·자동차·물류 분야에서 평가 중. Toyota Canada 상용 RaaS 계약 체결 완료(2월).',
    sourceName: 'Thomasnet / Forbes / Robotics & Automation News',
    sourceUrl: 'https://www.thomasnet.com/insights/agility-robotics-digit-5/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'SoftBank, 1X Technologies 지분 과반 인수 $6B 밸류에이션 협상 보도 — 초기 $10B 요구 대비 할인, 양측 미확인 (Aug-Nov 지속)',
    summary:
      '2026년 8월 The Information 최초 보도, 11월 현재 Dealroom·crypto.news·Mitrade 등 복수 매체 후속 보도. SoftBank가 OpenAI 투자 기업 1X Technologies의 지분 과반 인수를 $6B 밸류에이션으로 협상 중. 1X 측 초기 요구 $10B 대비 상당폭 할인. SoftBank는 별도로 ABB 로보틱스 $5.375B 인수도 진행 중(2025년 10월 합의). 2026년 11월 25일 기준 양측 모두 공식 확인·부인 없음. 거래 구조(전체 인수 vs 지분 투자)·OpenAI 지분 처리 방안 미공개.',
    sourceName: 'The Information / Dealroom / Mitrade',
    sourceUrl: 'https://dealroom.co/news/147325-softbank-in-talks-to-buy-majority-of-humanoid-maker-1x-at-6b-valuation/',
    confidence: 'C',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 주가 11/23 20% 상한가 급등 — 中정부 휴머노이드 정책 지원·JPMorgan 비중 확대 평가 배경; Q3 매출 +70%·순이익 -17% (11/23)',
    summary:
      '2026년 11월 23일 Global Times, Digital Today, Decrypt 보도. Unitree Robotics(688836.SH) 주가가 11/23 20% 상한가를 기록. 중국 정부의 휴머노이드 로봇 산업 지원 정책 발표와 10/26 JPMorgan의 비중 확대(overweight) 업그레이드(목표가 ¥995)가 배경. 8/6 IPO 이후 약 375% 상승(IPO가 ¥150.80 → 약 ¥716). Q3 2026 매출은 전년 대비 70% 증가했으나 R&D 비용 3배 증가로 순이익은 17% 감소. 경영진은 밸류에이션 과열 리스크를 투자자에 경고한 바 있음.',
    sourceName: 'Global Times / Digital Today / Decrypt / RobotToday',
    sourceUrl: 'https://www.globaltimes.cn/page/202611/1374872.shtml',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'GXO-Apptronik LOI 세부 공개: 2027년 창고 시범 → 최대 1,000대 Apollo 4년간 글로벌 RaaS 배치, $15/hr 타겟 (11/16)',
    summary:
      '2026년 11월 16일 The Gadgeteer, HumanoidMegaHub 세부 보도. GXO Logistics가 Apptronik Apollo 휴머노이드 최대 1,000대를 4년간 배치하는 의향서(LOI)의 구체 조건이 공개됨. 2027년 창고 시범 운영 후 KPI 충족 시 글로벌 확대. RaaS 프레임워크 하에 시간당 $15 목표 비용(미국 창고 노동자 평균 시급과 유사). 시범 사이트 위치·KPI 기준·로봇당 렌탈 단가는 미공개. 비구속적(non-binding) LOI로, 실제 배치 규모는 시범 결과에 따라 변동 가능.',
    sourceName: 'The Gadgeteer / HumanoidMegaHub',
    sourceUrl: 'https://the-gadgeteer.com/2026/11/16/gxo-apptronik-apollo-1000-humanoids-2027-trials/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, 2026 World Humanoid Robot Games 메달 46개 1위 석권 — 중공업용 G2 Max 출시, "Worken" 로봇 생산성 단위 도입 (8-10월 종합)',
    summary:
      '2026년 8월 Humanoids Daily, 10/30 Forbes 종합. Agibot이 제2회 World Humanoid Robot Games에서 46개 메달을 획득하여 1위를 차지. 10/30 Innovation Day에서는 바퀴 기반·다리 없는 상반신 형태의 중공업용 G2 Max 신모델을 공개하고, 로봇 생산성 측정 단위 "Worken"을 도입. 누적 범용 로봇 20,000대 생산 돌파(3/30 10,000대 → 10월 20,000대). 2025년 글로벌 휴머노이드 출하량 1위(업계 분석). G2 Max 가격·납기·첫 고객사 미공개.',
    sourceName: 'Humanoids Daily / Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/10/30/worlds-biggest-humanoid-robot-maker-wants-to-change-how-we-measure-robot-work/',
    confidence: 'A',
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

export async function insertCiUpdate20261127() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-27) ===\n');

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
        collectedAt: '2026-11-27',
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

insertCiUpdate20261127()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
