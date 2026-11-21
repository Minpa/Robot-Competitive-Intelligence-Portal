/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-21
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-21.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-21)
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
    headline: 'Tesla, Humanoids Summit 2026(San Mateo, 12/1-2) 핵심 파트너로 참여 — Optimus Gen3(37관절, 신형 손) 라이브 데모 예정',
    summary:
      '2026년 12월 1-2일 캘리포니아 San Mateo에서 열리는 Humanoids Summit 2026에 Tesla가 핵심 파트너로 참여하며 3세대 Optimus Gen3 로봇의 라이브 데모를 실시할 예정. Gen3는 37개 관절과 새로운 고자유도 손(dexterous hands)을 탑재. Musk의 TomorrowX Summit(11/18-19) "1-2개월 내 데모" 발언과 연결되며, 이번 Humanoids Summit이 해당 데모 무대가 될 가능성 높음. 외부 고객 배송은 2027년 말 목표.',
    sourceName: 'Humanoids Summit / blog.mean.ceo',
    sourceUrl: 'https://blog.mean.ceo/optimus-news-november-2026/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, 미국 최초 순수 휴머노이드 상장사로 나스닥 데뷔 (AGLT, 11/5) — SPAC 합병으로 $465M 조달, 프리머니 밸류 $2.5B',
    summary:
      '2026년 11월 5일 Agility Robotics가 Churchill Capital Corp XI과 SPAC 합병을 완료하고 나스닥(AGLT)에 상장. 미국 최초의 순수 휴머노이드 로봇 상장사. 합병 및 관련 파이낸싱으로 약 $465M 조달 (Churchill 신탁 $164M + Foxconn 주도 PIPE $201M + 기존 에쿼티 $100M). 프리머니 에쿼티 밸류에이션 약 $2.5B(Bloomberg). 첫 거래일 종가 $11.51. NVIDIA 투자 기반. 전년 매출 $1.8M으로 아직 초기 상업화 단계.',
    sourceName: 'TechRepublic / Bloomberg / TechCrunch',
    sourceUrl: 'https://www.techrepublic.com/article/news-agility-robotics-nasdaq-debut-2-5-billion-valuation/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility, Digit 5 사전 주문 $300M+ 확보 — GXO 2개 추가 사이트(노스캐롤라이나 Statesville, 테네시 Lebanon) 상업 계약',
    summary:
      '상장과 함께 Agility Robotics는 차세대 Digit 5 휴머노이드에 대해 $300M 이상의 조건부 멀티이어 주문을 보유하고 있다고 발표. 2027년 상반기 납품 목표. GXO Logistics는 기존 조지아 사이트 외 노스캐롤라이나 Statesville, 테네시 Lebanon에 Digit을 추가 배치하는 신규 상업 계약 체결. GXO-Agility 2024년 6월 이후 누적 토트 이동 10만 개+ 달성. 30개+ 기업이 도입 검토 중이며 제조, 자동차, 물류 등 다양한 산업으로 파이프라인 확장.',
    sourceName: 'Robotics & Automation News / Yahoo Finance / The Gadgeteer',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/11/agility-robotics-completes-merger-and-secures-465-million-in-capital-ahead-of-nasdaq-listing/107039/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI, Helix 2.5 발표 — "휴머노이드 로봇 학습의 첫 스케일링 법칙(scaling laws)" 주장, 로봇 운영 야간 교대근무자 채용',
    summary:
      'Forbes(11/6) CEO Brett Adcock 올핸즈 미팅 취재에 따르면 Figure AI가 Helix 2.5 모델을 통해 "휴머노이드 로봇 학습의 첫 스케일링 법칙"을 달성했다고 주장. 더 많은 데이터와 컴퓨트를 투입할수록 로봇 행동의 성능이 예측 가능하게 향상됨을 입증했다는 것. 별도로 NewsNation(11월) 보도에 따르면 "Shift Coordinator, Humanoid Robot Operations" 직무 공고를 게시, 야간(22:30-07:00) 로봇 운영 감독 인력을 채용 중. Figure 03 로봇의 실배치 운영이 24시간 체제로 확장되고 있음을 시사.',
    sourceName: 'Forbes / NewsNation',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/11/06/figure-ceo-brett-adcock-every-major-announcement-from-company-meeting/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X, NEO용 25-DoF 텐돈 구동 손 양산 시작 — IP68 방수·식품 안전 등급, Hayward 공장에서 수백 대 생산',
    summary:
      '1X Technologies가 NEO 휴머노이드용 25자유도(DoF) 텐돈 구동(tendon-driven) 로봇 손 양산을 Hayward CA 공장에서 시작. 기존 22-DoF에서 손목 3-DoF를 추가한 업그레이드 버전. IP68 방수·식품 안전(food-safe) 등급 확보. eWeek, Gadget Review 등에 따르면 이미 수백 대의 손이 양산됨. 레고 조립, 공 잡기, 차 따르기, 재킷 지퍼 올리기 등 고난도 조작 시연. Hayward 공장(58,000sqft)은 연산 10,000대 생산 역량, 2027년까지 100,000대+ 목표. 현재 출하분은 R&D 및 내부 가정 테스트용.',
    sourceName: 'eWeek / Gadget Review / The Robot Report / 1X Official',
    sourceUrl: 'https://www.gadgetreview.com/neos-new-25-dof-robot-hands-can-build-lego-and-catch-balls',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, 호주·뉴질랜드 클라우드 노드 론칭 (11/20) — ANZ 시장 본격 진출, 로컬 로보틱스 디플로이먼트 가속',
    summary:
      '2026년 11월 20일 PR Newswire/Manila Times 보도. AgiBot(智元机器人)이 호주에 클라우드 노드를 배포하여 호주·뉴질랜드(ANZ) 시장에서의 로봇 운영을 로컬로 지원할 수 있게 되었다고 발표. 중국 본토·아시아 위주였던 시장 커버리지를 오세아니아로 확장. 현지 파트너십 및 로봇 디플로이먼트 가속화 목적. AgiBot은 IDC 데이터 기준 H1 2026 글로벌 휴머노이드 출하량 1위(8,600대+, 시장점유율 약 35%).',
    sourceName: 'PR Newswire / Manila Times / Robotics & Automation News',
    sourceUrl: 'https://manilatimes.net/2026/11/20/tmt-newswire/pr-newswire/agibot-launches-australian-cloud-node-to-accelerate-market-expansion-and-local-robotics-deployment-across-australia-and-new-zealand/2474931',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, Expedition A3 110대 동기화 군무로 기네스 세계 기록 달성 (10/24, Jinan) — 양산 모델로 검증',
    summary:
      '2026년 10월 24일 중국 지난(Jinan)에서 AgiBot Expedition A3 모델 110대가 동시 군무(synchronized dance)를 수행하여 "가장 많은 휴머노이드 로봇 동시 춤" 기네스 세계 기록을 수립. 기네스 심사위원이 현장에서 로봇 수를 확인하고 공식 인증서 수여. AgiBot은 110대 모두 이벤트용이 아닌 양산 표준 모델(standard production models)이라고 강조. TechRepublic(10/30) 등 다수 매체 보도. 11월 Web Summit 9대 군무에 이은 대규모 양산 역량 과시.',
    sourceName: 'TechRepublic / Interesting Engineering / VnExpress',
    sourceUrl: 'https://www.techrepublic.com/article/news-apac-china-110-humanoid-robots-guinness-world-record/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Nomura/Instinet, Unitree(688836) Buy 유지 목표가 CNY 970 상향 (11/17) — 기존 CNY 370 대비 162% 인상',
    summary:
      'Blockchain.News(11/18) 보도. 노무라/인스티넷이 2026년 11월 17일 Unitree Robotics(상하이 STAR Market 688836) 투자의견 Buy 유지하면서 목표주가를 CNY 370에서 CNY 970으로 162% 상향. 상장 후 R&D 투자 가속(전기 대비 250%↑)과 이족보행 로봇 누적 18,000대 생산 실적, 미국 휴머노이드 수입 규제에 따른 중국 내수 수혜 기대 등이 상향 근거로 추정. 단일 금융 출처(Blockchain.News)로 교차 확인 필요.',
    sourceName: 'Blockchain.News',
    sourceUrl: 'https://blockchain.news/news/20261118-price-prediction-unitree-mixed-trend-signals-keep-the-91',
    confidence: 'C',
    category: 'funding',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik, 누적 자금 약 $1B — Series A $520M 익스텐션(2026년 6월) 이후 양산 체제 전환 가속',
    summary:
      'Humanoids Daily 프로필에 따르면 Apptronik이 2026년 6월 Series A에 $520M 익스텐션을 완료하여 총 자본 약 $1B에 도달. Apollo 휴머노이드 양산 체제 전환에 자금 투입. GXO LOI 1,000대(11/12), Mercedes-Benz 라인 96% 성공률(11/10), Google DeepMind Gemini Robotics 2.5 통합 등 최근 성과와 결합하여 상업화 모멘텀 강화. 15개+ 이전 로봇 개발 경험 기반.',
    sourceName: 'Humanoids Daily / OpenPR',
    sourceUrl: 'https://www.humanoidsdaily.com/companies/apptronik',
    confidence: 'B',
    category: 'funding',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'GlobalFoundries, Atlas 테스트 범위 Spot과 함께 멀티 사이트 확대 — Malta NY, Burlington VT, Dresden 독일, 싱가포르',
    summary:
      'Digitimes, Manufacturing Dive(11/18) 보도. GlobalFoundries-Boston Dynamics 파트너십 확대 세부 사항: Spot 로봇은 이미 GlobalFoundries의 미국(Malta NY, Burlington VT), 독일(Dresden), 싱가포르 팹에서 운영 중이며, Atlas 휴머노이드 테스트는 2027년 초 주요 시설에서 시작. 반도체 팹의 클린룸 환경에서의 로봇 운용은 자동차 산업 외 첫 확장으로, 고정밀·고청정 환경 대응 역량을 검증하는 의미.',
    sourceName: 'Digitimes / Manufacturing Dive',
    sourceUrl: 'https://www.digitimes.com/news/a20261118VL219/boston-dynamics-globalfoundries-atlas-robot-testing-2027.html',
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

export async function insertCiUpdate20261121() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-21) ===\n');

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
        collectedAt: '2026-11-21',
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

insertCiUpdate20261121()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
