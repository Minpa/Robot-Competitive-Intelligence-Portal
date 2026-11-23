/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-23
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-23.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-23)
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
    headline: 'Musk, AI5 칩을 Optimus 전용으로 확정 (11/22) — 자동차는 AI4 유지, Samsung Taylor TX 팹에서 시험생산 중',
    summary:
      '2026년 11월 22일 Musk가 Tesla의 차세대 AI5 칩을 Optimus 로봇과 AI 슈퍼컴퓨터 전용으로 배정하고 자율주행차는 AI4를 유지한다고 확인. Samsung Austin Semiconductor Taylor, TX 팹에서 AI5 시험생산(trial production) 진행 중이며 2026년 말 수율 검증 완료, 2027년 양산 목표. 자동차용으로는 AI4.5 업그레이드가 내년 도입 예정(Sawyer Merritt 보도). CryptoBriefing, Igor\'s Lab, NotATeslaApp, Basenor 등 복수 매체 보도.',
    sourceName: 'CryptoBriefing / Igor\'s Lab / NotATeslaApp',
    sourceUrl: 'https://cryptobriefing.com/tesla-ai5-chip-optimus-robot-ai4-cars/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla, Giga Texas에 Optimus 전용 생산공장 건설 중 — 520만 sqft 확장 허가, 2027년 대량생산 목표',
    summary:
      'Tesla가 Giga Texas 북쪽 캠퍼스에 Optimus 전용 생산공장을 건설 중. Teslarati 보도에 따르면 520만+ sqft 규모의 건축 허가를 신청했으며, Longbridge는 공장 조립률 약 65%로 초기 생산은 2026년 말, 대량 생산(high-volume)은 2027년 여름 목표라고 보도. Musk는 이전에 Optimus를 판매보다 렌탈 모델로 제공할 가능성이 높다고 언급한 바 있음.',
    sourceName: 'Teslarati / Longbridge',
    sourceUrl: 'https://teslarati.com/tesla-prepares-expand-giga-texas-new-optimus-production-plant',
    confidence: 'C',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, 미국 최초 순수 휴머노이드 상장사로 Nasdaq 데뷔 (AGLT, 11/5) — $2.5B 밸류에이션, $465M 자금 확보',
    summary:
      '2026년 11월 5일 Agility Robotics가 Churchill Capital Corp XI와 SPAC 합병을 완료하고 Nasdaq에 AGLT 티커로 상장. 미국 최초의 순수 휴머노이드 로봇 상장사(pure-play). 합병 기업가치 약 $2.5B, 총 $465M 자금 조달. 첫 거래일 종가 $11.51. Amazon, Toyota, GXO, Schaeffler 등 9개 고객사에 Digit 배치 중. 30개+ 기업과 추가 도입 논의 진행. TechCrunch, TechRepublic, Bloomberg, Yahoo Finance 등 주요 매체 보도.',
    sourceName: 'TechCrunch / TechRepublic / Bloomberg / Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/markets/stocks/articles/agility-becomes-first-u-publicly-120000250.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility, Digit 5 사전주문 $300M+ 확보 — 단일 고객 1,000대 3년 계약 포함, 2027 H1 납품 목표',
    summary:
      'Agility Robotics가 Nasdaq 상장과 함께 차세대 Digit 5에 대해 $300M 이상의 조건부 다년 주문(committed multi-year orders)을 확보했다고 공시. 주요 단일 고객과 1,000대 규모 3년 사용 계약이 포함. 계약 이행은 성능·기능·사양 마일스톤 달성 조건부. Digit 5 배송은 2027년 상반기 목표. 전년도 매출 $1.8M 대비 대규모 수주 파이프라인. AIWeekly, Dataconomy, Supply Chain 247 보도.',
    sourceName: 'AIWeekly / Dataconomy / Supply Chain 247',
    sourceUrl: 'https://aiweekly.co/alerts/agility-robotics-debuts-on-nasdaq-as-first-pure-play-humanoid-ipo-with-300m-in',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'GXO, Agility Digit 추가 배치 확정 — 노스캐롤라이나·테네시 2개 사이트 확장, Digit 4→5 전환 계획',
    summary:
      'GXO Logistics가 Agility Robotics와 추가 계약을 체결하여 노스캐롤라이나와 테네시에 Digit 배치를 확장. 2027년 초 Digit 4로 운영을 시작한 후 최근 공개된 Digit 5로 전환 예정. GXO는 조지아 사이트에서 10만+ 토트 이동 실적을 바탕으로 추가 사이트를 확대 중. Apptronik Apollo, Agility Digit 양쪽에 대규모 LOI/계약을 체결한 GXO의 휴머노이드 멀티벤더 전략이 주목됨. The Gadgeteer, Robotics & Automation News 보도.',
    sourceName: 'The Gadgeteer / Robotics & Automation News',
    sourceUrl: 'https://the-gadgeteer.com/2026/11/07/agility-digit-humanoid-goes-public/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X CEO Børnich, Runtime 2026에서 NEO 12월 개발자·소비자 출하 확인 (11/20) — $20K 사전주문 10,000대 매진 후 첫 배송',
    summary:
      '2026년 11월 20일 Humanoids Daily 보도. 1X Technologies CEO Bernt Børnich가 Runtime 2026 행사에서 NEO 휴머노이드를 12월부터 개발자 및 일부 소비자에게 출하한다고 발표. $20,000 사전주문 10,000대(5일 매진) 이후 첫 배송. 초기 배송은 "Turing" 원격 오퍼레이터 지원 하에 운영(텔레오퍼레이션 공개 후에도 주문 취소 미발생). $499/월 구독 모델도 별도 운영. Technology.org(11/21)는 아직 독립 검증된 고객 수령 사례는 없다고 보도.',
    sourceName: 'Humanoids Daily / Technology.org / Startup Fortune',
    sourceUrl: 'https://www.humanoidsdaily.com/news/1x-neo-developers-december-runtime-2026-bornich',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X, 1XWM(World Model) 공개 — 14B 파라미터 비디오-투-액션 생성 모델로 NEO 자율 학습 구현',
    summary:
      '1X Technologies가 1XWM(1X World Model)을 공개. 14B 파라미터 규모의 생성형 비디오 모델 기반으로, 텍스트 프롬프트와 현재 프레임으로부터 미래 비디오를 생성한 뒤 역역학(inverse dynamics) 모델로 로봇 동작 궤적을 추출·실행하는 방식. 기존 VLA(Vision-Language-Action) 방식과 달리 비디오 사전학습을 통한 세계 모델 접근. 5초 실시간 롤아웃에 약 11초 멀티GPU 연산 소요. 세밀한 조작(예: 붓기, 그리기)은 아직 한계. 일부 사용자 대상 사전 시험(trial) 진행 중. eWeek, GlobeNewsWire, 1X 공식 블로그 보도.',
    sourceName: 'eWeek / GlobeNewsWire / 1X Official Blog',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-robot-self-learning/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 02 공식 퇴역 완료 (9/30), Figure 03 시간당 1대 양산 — BotQ 누적 1,000대+, Catalyst Brands 배치 확대',
    summary:
      '2026년 9월 30일부로 Figure 02 대부분 퇴역 완료. BotQ(Figure 전용 공장)에서 Figure 03가 시간당 1대 생산률로 양산 중이며 누적 1,000대+ 돌파. 11월 초 Figure 03가 공장 밖으로 걸어나오는 영상 공개. 현재 BMW Spartanburg(부품 시퀀싱), Catalyst Brands(JCPenney 모회사, Reno DC 물류)에 배치. Figure 04 디자인 완료 상태이나 조립·시연은 미공개. Interesting Engineering, The Gadgeteer, Forbes 보도.',
    sourceName: 'Interesting Engineering / The Gadgeteer / Forbes',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-03-humanoids-take-campus-walk',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics, 바퀴형 Atlas 후속 영상 공개 (11/22) — 강화학습 기반 전신 제어 연구 성과 상세 공개',
    summary:
      '2026년 11월 22일 Robotics & Automation News, Unite.AI 보도. Boston Dynamics가 바퀴형 Atlas 연구 플랫폼의 후속 영상을 공개하며 강화학습(reinforcement learning) 기반 전신 제어(whole-body control) 연구 성과를 상세 설명. 기존 발목 액추에이터에 기성품 스쿠터 림을 연결하는 커스텀 어댑터만 추가. 상용화 계획 없는 순수 연구 플랫폼이며, 연구 결과가 표준 Atlas 설계에 반영 중. Korea JoongAng Daily, Interesting Engineering 등도 보도.',
    sourceName: 'Robotics & Automation News / Unite.AI / Korea JoongAng Daily',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/22/boston-dynamics-gives-atlas-wheels-to-test-new-reinforcement-learning-capabilities/107438/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree, 미 국방부 1260H 목록 및 FCC Covered List 등재 — 미국 시장 접근 제약 심화, 서방 대안 플랫폼 수요 증가',
    summary:
      '2026년 6월 미 국방부 Section 1260H "중국 군사기업" 목록에 Hangzhou Yushu Technology(Unitree Robotics)가 등재. 6월 30일부터 DoD 계약 체결 불가. 7월 28일 FCC Covered List에도 추가되어 신규 모델 장비 인증에 제약. 직접적 수출입 금지는 아니나 미국 연구기관·기업의 Unitree 도입이 사실상 제한됨. 이에 따라 1X NEO 등 비중국 대안 플랫폼에 대한 연구기관 수요가 증가 추세. Holland & Knight, Dentons, BotInfo 등 법률 분석.',
    sourceName: 'Holland & Knight / Dentons / BotInfo',
    sourceUrl: 'https://botinfo.ai/articles/unitree-1260h-list-what-it-means-for-us-buyers',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik, Apollo 3 차세대 휴머노이드 2027년 공개 예고 — Robot Park(9만 sqft) 데이터 팩토리 가동 중',
    summary:
      '2026년 6월 Forbes 보도. Apptronik CEO Jeff Cardenas가 차세대 Apollo 3를 "significant jump up in hardware"로 예고하며 내년 공개 예정. 동시에 90,000 sqft 규모의 Robot Park(데이터 팩토리)를 오스틴에 개장하여 텔레오퍼레이션·자율 실행을 통한 대규모 훈련 데이터 수집 가동 중. Apollo 2 데이터가 Google DeepMind Gemini Robotics 모델 훈련에 활용되는 선순환 구조. 총 ~$1B 조달(2026년 2월 $520M 포함). Forbes, eWeek 보도.',
    sourceName: 'Forbes / eWeek / Robotics 247',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot G2 편의점 24시간 시험: 6대 로봇 1,730개 과업 완수 — 커피 147건, 진열 277건, 4대 합격 2대 보류',
    summary:
      '2026년 11월 2-3일 상하이 쉬후이구 편의점에서 AgiBot G2 로봇 6대가 24시간 라이브스트림 "로봇은 퇴근하지 않는다" 시험 진행. 공식 발표 기준 총 1,730개 과업(고객 응대, 커피 주문 147건, 진열·재고 점검 277건, 청소 등) 수행. 단, Gasgoo 분석에 따르면 성과 평가에서 4대 합격, 2대 보류. 감사된 과업 로그나 성과 데이터는 미공개. 24시간 연속 무인 운영이 아니라 충전·인간 개입이 있었을 가능성 지적. Yahoo Finance, Interesting Engineering, Gadget Review 등 보도.',
    sourceName: 'Yahoo Finance / Interesting Engineering / Gasgoo',
    sourceUrl: 'https://finance.yahoo.com/technology/ai/articles/six-agibot-g2-robots-complete-160000821.html',
    confidence: 'B',
    category: 'tech_spec',
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

export async function insertCiUpdate20261123() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-23) ===\n');

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
        collectedAt: '2026-11-23',
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

insertCiUpdate20261123()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
