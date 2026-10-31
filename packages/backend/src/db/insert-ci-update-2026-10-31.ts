/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-31
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-31.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-31)
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
    headline: 'Tesla Optimus 고객 예약(reservations) 12월 초 개시 가능성 보도 — Humanoids Summit(12/1~2) 전후, Tesla 공식 확인 없음 (10/30)',
    summary: 'San Francisco Standard 10/30 보도. Tesla가 12월 초(Humanoids Summit 12/1~2 전후)에 Optimus 고객 예약(reservations)을 개시할 수 있다는 보도. 다만 Tesla는 해당 매체의 코멘트 요청에 응답하지 않았으며, 10/31 현재 공식 예약 페이지·대기자 목록은 존재하지 않음. Q3 실적 콜에서 Musk가 밝힌 외부 고객 납품 시점(2027년 말)과의 간극도 존재. 단일 매체 보도로 신뢰도 제한적.',
    sourceName: 'San Francisco Standard',
    sourceUrl: 'https://www.notateslaapp.com/news/4866/tesla-officially-begins-optimus-robot-production',
    confidence: 'C',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree Q3 2026 실적 발표 (10/28) — 매출 CNY 6.65억(+70% YoY), 순이익 CNY 1.13억(-17.4%), R&D 250% 증가, 첫 상장 후 분기 실적',
    summary: 'Reuters·SCMP·Bloomberg 10/28 종합. Unitree(宇树科技)가 상장 후 첫 분기 실적을 발표. Q3 매출 CNY 6.65억(약 $99.7M, +70% YoY), 순이익 CNY 1.127억(-17.4% YoY, 애널리스트 예상 CNY 2.24억의 절반 수준). R&D 비용 CNY 1.27억(+250%), 매출 대비 19.1%. 체화지능(embodied intelligence) 모델·컴퓨팅 인프라·R&D 인력 확충에 집중 투자. 1~9월 누적: 매출 CNY 18.2억(+55.7%), 순이익 CNY 3.867억(+270.5%). IPO 조달금 CNY 60억의 구체적 사용 계획은 미공개. 주가는 실적 발표 전 2주간 65%+ 급등했으나, 이익 미달로 향후 조정 가능성.',
    sourceName: 'Reuters / SCMP / Bloomberg',
    sourceUrl: 'https://scmp.com/tech/article/3372474/unitree-reports-70-surge-quarterly-revenue-though-ai-investment-weighs-net-profit',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 조달 규모 $465M으로 하향 (기존 $620M) — 트러스트 상환으로 $256M 이탈, 11/2 투표·11/4 마감·11/5 AGLT 거래 개시 예정',
    summary: '10/30 SEC 8-K 파일링 및 Agility Robotics 보도자료. Churchill Capital XI(CCXI) SPAC 합병의 총 조달 규모가 약 $465M으로 하향 조정됨(기존 $620M+ 전망 대비). 상환 마감 후 트러스트 기여분이 $420M→$164M으로 감소(약 $256M 상환). 조달 내역: 트러스트 $164M + Foxconn 주도 PIPE $201M + 기수령 에쿼티 $100M. 기업가치 $2.5B 유지. 11/2 주주 임시총회(EGM) 투표, 승인 시 11/4 거래 마감, 11/5 Nasdaq "AGLT" 티커로 거래 개시 예정. 별도로 Robot Report는 Agility의 상장 전 매출이 $18M이라고 보도, 현 밸류에이션 대비 얇은 매출 기반 지적.',
    sourceName: 'SEC Filing (8-K) / Agility Robotics / Robot Report',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026114063/ea031030301ex99-1.htm',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'SoftBank, 1X Technologies 과반 지분 인수 협상 중 — $6B 밸류에이션, 작년 목표($10B) 대비 40% 할인 (The Information 8/26)',
    summary: 'The Information 8/26 보도, Reuters·DealStreetAsia·Dealroom 등 복수 매체 전재. SoftBank가 1X Technologies의 과반(majority) 지분을 약 $6B 밸류에이션으로 인수 협상 중. 1X는 작년 가을 $10B 밸류에이션에서 $1B 조달을 시도했으나 절반 미만을 확보한 경위가 있음. SoftBank의 로보틱스 전략(ABB 로보틱스 $5.4B 인수 등)과 맞물린 투자. 10/31 현재 양측 공식 확인 없이 협상 진행 중. 합의 시 1X의 NEO 가정용 로봇 대량 배치에 필요한 자금 확보가 가능해질 전망. 1X FY25 추정 ARR $222.5M(Venture Atlas).',
    sourceName: 'The Information / Reuters / DealStreetAsia',
    sourceUrl: 'https://www.thestar.com.my/tech/tech-news/2026/08/27/softbank-in-talks-to-buy-stake-in-1x-at-6-billion-valuation-the-information-reports',
    confidence: 'C',
    category: 'funding',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, "로봇이 직원 수를 초과" 마일스톤 달성 — BotQ 공장 Figure 03 누적 1,000대+ 생산 추정 (복수 2차 매체)',
    summary: 'ExplainX AI·eWeek·Forge Global 종합. Figure AI가 회사 내 로봇 수가 인간 직원 수를 초과하는 마일스톤을 달성. BotQ 공장에서 시간당 1대(연 12,000대) 생산 체제로 누적 1,000대 이상의 Figure 03가 제조된 것으로 추정되나, Figure AI가 공식 확인한 수치는 아님. Brett Adcock CEO가 Figure 03 내구성 테스트에서 트레드밀 348마일(~560km) 연속 주행을 공개(10/19 기준, 테스트 진행 중). Figure 04 디자인 락 완료·Helix 3.0 AI 모델 개발과 병행하여 03 양산 가속 중. 다만 BMW Spartanburg 실제 운영 현황은 매체 간 상충(40대 배치 vs 운영 없음).',
    sourceName: 'ExplainX AI / eWeek / Forge Global',
    sourceUrl: 'https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026',
    confidence: 'C',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Apollo 3를 "최초 진정한 상용 제품"으로 포지셔닝 — 2027년 상업 물량 목표, Robot Park 데이터 수집 가속 중',
    summary: 'New Market Pitch·RoboZaps 종합. Apptronik이 차세대 Apollo 3를 "최초의 진정한 상용 제품(first true commercial product)"으로 포지셔닝. mid-2026 기준 약 1년 내 데뷔 예고, 2027년 상업 물량 목표. 현재 Apollo 2는 바이페달+휠 듀얼 이동 옵션을 제공하며, Robot Park 네트워크에서 실세계 인터랙션 데이터를 지속 수집 중. 이 데이터는 Google DeepMind Gemini Robotics 모델 훈련에 활용. Jeff Cardenas CEO는 Apollo 3가 "상당한 도약(significant jump up)"이 될 것이라 시사. 현재 고객: Mercedes-Benz, GXO, Jabil. 공식 가격 미공개.',
    sourceName: 'New Market Pitch / RoboZaps / The Robot Report',
    sourceUrl: 'https://blog.robozaps.com/b/apptronik-apollo-review',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'BD Atlas 프로덕션 모델, 3가지 제어 모드(자율/텔레오퍼/태블릿) 확인 — CES 2026 데뷔 후 Hyundai RMAC 배치 진행 중 (종합)',
    summary: 'Digital Trends·CBS 60 Minutes·The Decoder 종합. BD의 프로덕션 Atlas가 자율(autonomous), 텔레오퍼레이션(teleoperated), 태블릿 조작(tablet steering) 3가지 제어 모드를 지원함이 재확인. CES 2026 데뷔 이후 첫 플릿이 Hyundai RMAC(조지아)에 배치되어 루프랙 부품 시퀀싱을 AI 기반으로 자율 훈련 중. CBS 60 Minutes 취재팀이 로봇이 "동일 작업을 기존 인간 10배 반복 훈련"하는 모습을 촬영. BD·Hyundai는 25,000대 산업 배치·연 30,000대 생산 능력 확보를 목표하나, 현재는 2026년 전량이 Hyundai RMAC·Google DeepMind에 사전 할당된 상태. 신규 고객 접수는 2027년부터.',
    sourceName: 'Digital Trends / CBS News 60 Minutes / The Decoder',
    sourceUrl: 'https://www.digitaltrends.com/computing/boston-dynamics-atlas-is-done-doing-backflips-and-is-finally-ready-to-clock-in/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot H1 2026 출하량 교차 검증 — Counterpoint ~9,700대 vs IDC 8,600+대, 글로벌 시장 ~25,000대 중 35% 점유 확인',
    summary: 'Humanoid Guide·Robotics & Automation News 종합(IDC·Counterpoint·SAG 데이터 교차 비교). Agibot의 H1 2026 글로벌 휴머노이드 출하량이 조사기관마다 차이: Counterpoint ~9,700대, IDC 8,600+대, SAG ~8,400대. 다만 모든 기관이 Agibot 1위(~35% 시장 점유율)를 확인. 글로벌 시장 총 출하량 ~25,000대. 누적 생산은 9월 기준 20,000대 돌파. Innovation Day(10/29)에서 공동창업자 펑즈후이가 H1 매출 20억 위안(~$300M) 근접을 재확인하며, Worken 생산성 프레임워크와 함께 로봇 ROI 정량화 전략을 강조.',
    sourceName: 'Humanoid Guide / Robotics & Automation News (IDC, Counterpoint, SAG)',
    sourceUrl: 'https://humanoid.guide/agibot-leads-h1-2026-humanoid-shipments-with-8600-units/',
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

export async function insertCiUpdate20261031() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-31) ===\n');

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
        collectedAt: '2026-10-31',
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

insertCiUpdate20261031()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
