/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-19
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-19.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-19)
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
  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot H1 2026 글로벌 휴머노이드 출하 1위 — 9,700대(43%), Unitree 추월 (Counterpoint)',
    summary: 'Counterpoint Research에 따르면 Agibot이 2026년 상반기 글로벌 휴머노이드 로봇 출하 1위를 달성. 약 9,700대 출하(글로벌 점유율 43%), Unitree를 제치고 세계 최대 휴머노이드 로봇 벤더로 등극. 글로벌 H1 총 출하량은 22,000대 이상으로 전년 대비 약 300% 급증. Smart Analytics Global은 8,400대(44%)로 집계하여 분석기관별 수치 차이 존재하나 1위 순위는 동일.',
    sourceName: 'Counterpoint Research / Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/09/18/agibot-claims-top-spot-in-global-humanoid-robot-shipments-in-first-half-of-2026/104930/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'Agibot 공동창업자 "3~5년 내 embodied AI GPT-3.5 모멘트 올 것" — Fortune Leaders Forum (9/14)',
    summary: 'Agibot 공동창업자 야오 마오칭(Yao Maoqing)이 2026년 9월 14일 마카오 Fortune Leaders Forum에서 "향후 3~5년 내 embodied AI가 GPT-3.5 모멘트를 맞이할 것"이라 발언. 언어 AI가 GPT-3.5에서 도약한 것처럼, 로봇 범용 AI 모델이 임계점에 도달할 것으로 전망. Agibot의 GE-Act 2.0 모델 및 NVIDIA Thor 기반 자율 제어 전략과 연계.',
    sourceName: 'Fortune',
    sourceUrl: 'https://fortune.com/2026/09/14/humanoids-gpt-3-5-moment-agibot/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit 5 가격 공개 — RaaS $8,500/월 또는 $200K 구매, 5년 TCO $400K~$535K',
    summary: 'Agility Robotics가 Digit 5 가격 모델을 공개. RaaS(Robots-as-a-Service): 월 $8,500(연 $102K) + 배치비 $25K, 5년간 로봇당 수익 $535K. 직접 구매: $200K + 배치비 $20K + 연간 SW/유지보수 $36K, 5년 TCO 약 $400K. ROI 정당화를 위해 하루 약 2.5인 교대 대체 필요. SPAC 합병을 앞두고 투자자 대상 재무 모델 공개의 일환.',
    sourceName: 'TechRepublic / The Robot Report',
    sourceUrl: 'https://www.techrepublic.com/article/news-agility-digit-5-humanoid-robot-factory-workers/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai 25,000대 Atlas 배치 공식 발표 — 2028 부품 시퀀싱 시작, 2030 조립 확대',
    summary: 'Hyundai Motor Group이 자회사 Boston Dynamics의 Atlas 휴머노이드 로봇 25,000대 이상을 자동차 공장에 배치하는 계획을 공식 발표. 2028년 Hyundai Motor Group Metaplant America(조지아)에서 부품 시퀀싱 작업으로 시작, 2030년까지 컴포넌트 조립으로 확대. Atlas는 고유수용감각(proprioception) 기반으로 밸런스·저항·그립을 실시간 모니터링. 한국금속노동자연합이 노사 합의 없이 로봇 공장 투입 불가 입장 표명하여 노사 갈등 잠재.',
    sourceName: 'Korea Herald / Interesting Engineering / TechTimes',
    sourceUrl: 'https://www.koreaherald.com/article/10741955',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'BMW, Figure 휴머노이드 배치를 독일 라이프치히 공장으로 확대 — Physical AI CoE 출범',
    summary: 'BMW가 Figure 02 Spartanburg 배치 성과(10개월간 30,000대+ X3 생산 기여)에 이어, 2026년 여름부터 독일 라이프치히 공장에 휴머노이드 배치를 확대. "Center of Competence for Physical AI in Production" 조직을 출범하여 물리적 AI의 생산라인 통합을 체계화. Figure 03 후속 배치 및 유럽 거점 확대의 신호탄.',
    sourceName: 'BMW Group / iiot-world',
    sourceUrl: 'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 고객 인도 지연 — 2026년 7월 기준 실 배송 미확인, "올해 내" 약속 유지',
    summary: '1X Technologies가 사전주문 10,000대 완판 및 풀스케일 양산 개시를 발표했으나, 2026년 7월 16일 기준 검증된 고객 인도 사례가 확인되지 않음. 1X의 자체 자료에서도 "첫 고객 배송"을 미래 시제로 기술. 가격 $20,000(Early Access), 월 $499 구독 모델. San Carlos 추가 시설 2026 하반기 가동 예정. 2027년까지 연 100,000대 생산 목표.',
    sourceName: 'RoboZaps / Forbes / eWeek',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'B',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind Gemini Robotics 2 공개 — Apptronik Apollo 전신 AI 데모',
    summary: 'Google DeepMind가 2026년 7월 말 Gemini Robotics 2를 공개. Apptronik Apollo 로봇이 전신(whole-body) AI 제어를 시연하여 양사 파트너십의 구체적 성과를 증명. Robot Park(Austin, 90,000sqft)에서 텔레오퍼레이션 및 자율 실행 병행 방식으로 대규모 학습 데이터 수집 중. 이 데이터가 Gemini Robotics 파운데이션 모델 학습에 직접 활용.',
    sourceName: 'Robotics & Automation News / Google DeepMind',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 이후 주가 50%+ 조정 — 밸류에이션 거품 우려, 1260H 리스크 지속',
    summary: 'Unitree Robotics(688836.SH) IPO 첫날 460% 급등 이후 9월 초까지 고점 대비 50% 이상 조정. 시총 $53B 피크에서 대폭 하락. DOD Section 1260H "중국 군사 기업" 등재로 미국 투자자의 향후 NS-CMIC 지정 가능성 우려 지속. 다만 1260H 자체는 미 국방부 직접 계약만 금지하며 민간 투자는 허용. 2026 상반기 글로벌 점유율 1위를 Agibot에 내줌.',
    sourceName: 'CNBC / Morrison Foerster / China AI Dispatch',
    sourceUrl: 'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
    confidence: 'B',
    category: 'funding',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Fremont Gen 3 전용 생산라인 — 연간 100만대 목표, Giga Texas 1,000만대 계획',
    summary: 'Tesla가 Fremont Model S/X 라인을 46일 만에 해체한 후 Optimus Gen 3 전용 생산라인으로 전환 중. Fremont 초기 연간 생산 목표 약 100만대, Giga Texas는 최종적으로 연 1,000만대를 목표. 2026년 1월 기준 1,000대 이상 Gen 3가 Fremont 생산 현장에서 배터리 조립·EV 팩 로딩·케이블 라우팅·커넥터 시팅·부품 핸들링 수행 중.',
    sourceName: 'Yahoo Finance / Tesery / RobotNewsToday',
    sourceUrl: 'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
    confidence: 'B',
    category: 'production',
  },

  // ── 글로벌 산업 동향 ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: '제2회 World Humanoid Robot Games — 16개국 2,000+ 로봇, Tiangong Ultra 100m 8.64초',
    summary: '2026년 8월 22~26일 베이징에서 제2회 World Humanoid Robot Games 개최. 16개국 2,000대 이상 휴머노이드 로봇이 51개 종목에 참가. Tiangong Ultra가 100m 8.64초로 우사인 볼트 세계기록(9.58초) 돌파. 400m에서도 인간 기록 경신. 중국 제조 휴머노이드가 신체 성능에서 인간을 체계적으로 초월하기 시작했음을 상징하는 이벤트.',
    sourceName: 'DogOnNews / PressReader / KraneShares',
    sourceUrl: 'https://www.dogonews.com/2026/9/18/humanoid-robots-break-records-in-beijing',
    confidence: 'A',
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

export async function insertCiUpdate20260919() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-19) ===\n');

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
        collectedAt: '2026-09-19',
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

insertCiUpdate20260919()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
