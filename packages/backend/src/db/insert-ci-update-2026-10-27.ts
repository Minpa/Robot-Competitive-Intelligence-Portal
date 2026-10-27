/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-27
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-27.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-27)
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
    layerSlug: 'sw',
    headline: 'Tesla Optimus Academy 도입 — 실제 작업 수행 기반 자기학습 프로그램, 10,000~20,000대 훈련 전용 투입 계획',
    summary: 'Tesla가 Optimus Academy를 공개. 휴머노이드 로봇이 실제 작업(real-world tasks)을 수행하며 스스로 학습하는 훈련 프로그램. Musk는 이 프로그램을 위해 10,000~20,000대의 Optimus를 전용 투입할 계획이라고 밝힘. 시뮬레이션이 아닌 실제 물리 환경에서의 반복 학습을 통해 범용 AI 능력을 가속화하는 전략. Q3 2026 실적 발표(10/21)와 함께 공개.',
    sourceName: 'CryptoBriefing',
    sourceUrl: 'https://cryptobriefing.com/tesla-optimus-academy-self-teaching-robots/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 고객 배송 2027년 말로 연기 — 핸드 내구성·AI 일반화 미해결, Electrek 보도 (10/22)',
    summary: 'Electrek 10/22 보도. Tesla가 Optimus의 외부 고객 배송 일정을 2027년 말로 연기. Musk는 "핸드(hands)가 여전히 문제"라고 인정하며, AI 일반화 능력과 내구성이 상용 배송 수준에 미달한다고 설명. 당초 2026년 내 제한적 외부 판매를 시사했으나 양산 품질·안정성 확보에 시간이 더 필요. Fremont에서 생산은 진행 중이나 현재는 내부 Tesla 공장 배치 및 Optimus Academy 훈련용에 한정.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/10/22/tesla-optimus-delivery-late-2027-hands-ai-problems/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics ICE Spot 로봇 판매 논란 — 직원 수백 명 청원 반대, 경영진 판매 강행',
    summary: 'Boston Dynamics 직원 수백 명이 ICE(이민세관집행국) 산하 HSI에 Spot 로봇 판매를 반대하는 청원서를 제출. 로봇이 이민 단속에 활용될 수 있다는 윤리적 우려 제기. 그러나 경영진은 판매를 강행. 개조된 Spot 4대가 HSI에 납품 예정으로 보도. 2024년 BD의 자체 윤리 가이드라인과 충돌한다는 내부 비판도 존재. HumanoidDaily와 Mondo News 등 복수 매체 보도.',
    sourceName: 'HumanoidDaily / Mondo News',
    sourceUrl: 'https://humanoidsdaily.com/news/boston-dynamics-ice-spot-employee-petition-robot-ethics',
    confidence: 'B',
    category: 'regulation',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026년 전체 배치 물량 Hyundai RMAC·Google DeepMind에 완전 할당 — 추가 고객은 2027년부터',
    summary: 'CES 2026에서 공개된 프로덕션 Atlas의 2026년 생산분이 전량 Hyundai RMAC(조지아) 및 Google DeepMind에 사전 할당 완료. 신규 고객 배치는 2027년 초부터 가능. CBS 60 Minutes 방영 및 다수 매체 교차 확인. Atlas가 Hyundai 공장에서 루프랙 부품 시퀀싱을 AI 기반으로 자율 훈련 중이며, 2028년 풀 배치, 2030년 부품 조립 확장 로드맵 유지.',
    sourceName: 'CBS News / The Decoder / Engadget',
    sourceUrl: 'https://www.cbsnews.com/news/boston-dynamics-training-ai-humanoids-to-perform-human-jobs-60-minutes/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BMW Spartanburg 40대 배치 운영 중 — 부품 시퀀싱 작업, 추가 워크스테이션 확대 예정 (2026~2027)',
    summary: 'BMW가 미국 사우스캐롤라이나 Spartanburg 공장에 Figure 03 40대를 배치하여 부품 시퀀싱(parts sequencing) 작업에 투입 중. 2026~2027년에 걸쳐 추가 워크스테이션으로 단계적 확대 계획. Figure AI의 첫 대규모 자동차 제조업 상용 배치 사례로, BotQ 공장의 시간당 1대 생산 체제와 연계하여 산업 고객 납품을 가속화.',
    sourceName: 'Forge Global / Figure AI',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI IPO 전망 — 밸류에이션 $39B, 2026년 매출 $200M 추정, BotQ 12,000대/년 생산 체제 기반',
    summary: 'TechMarketBriefs가 Figure AI의 IPO 전망을 분석. 밸류에이션 $39B(약 $390억), 2026년 매출 약 $200M 추정. BotQ 캘리포니아 공장 연간 12,000대 생산 용량, 시간당 1대 생산 체제. BMW·Catalyst Brands 등 상용 배치 확대 및 Nvidia 추가 투자($10억) 논의가 밸류에이션을 지지. 다만 상장 시점은 미확정이며, 사전 매출 대비 높은 밸류에이션 리스크 존재.',
    sourceName: 'TechMarketBriefs',
    sourceUrl: 'https://techmarketbriefs.com/pre-ipo/figure-ai/',
    confidence: 'C',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree G1+ 업그레이드 모델 출시 — 95,000위안(세금 포함), 기존 G1 대비 기능 강화',
    summary: 'Unitree가 G1의 업그레이드 버전 G1+를 공식 출시. 가격 95,000위안(세금 포함), 기존 G1은 85,000위안부터 시작. G1+ 상세 스펙 변경 사항은 공식 발표에서 구체적으로 언급되지 않았으나, 제품 라인업 강화의 일환. The Standard(홍콩) 보도.',
    sourceName: 'The Standard (HK)',
    sourceUrl: 'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Unitree Rehearsal 자기개선 소프트웨어 공개 — 학습 데이터 중국 서버 전송 논란, 미국 보안 우려 심화 (10/26)',
    summary: 'TechTimes 10/26 보도. Unitree가 2026 World Physical AI Conference에서 "Rehearsal"이라는 자기개선 로봇 소프트웨어 루프를 공개. 로봇이 자율적으로 학습 데이터를 생성하고 개선하는 구조. 그러나 학습 데이터가 중국 서버로 전송되는 점이 보도되어 미국 내 보안 우려가 심화. 기존 IFA 2026 BLE 취약점 논란에 이어 데이터 주권 이슈 부각. American Security Robotics Act, Blocking CCP Spy Tech Act 등 미국 의회 법안과도 연결.',
    sourceName: 'TechTimes',
    sourceUrl: 'https://techtimes.com/articles/329477/20261026/unitree-builds-self-improving-robots-rehearsal-sends-learning-data-china.htm',
    confidence: 'B',
    category: 'regulation',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 미국 소매가 $17,990·G1 Pro $28,950 (10월 기준) — FCC 금지 불구 기존 인가 모델 판매 지속',
    summary: 'Unitree G1의 미국 소매가가 2026년 10월 기준 $17,990, G1 Pro가 $28,950으로 확인. FCC의 7월 외국산 로봇 장비 인가 금지에도 불구하고 기존에 인가받은 모델은 판매 지속 가능. 다만 신규 모델의 미국 시장 진입은 사실상 차단. GlobalDroneHQ 등 유통 채널 가격 정보 기반.',
    sourceName: 'GlobalDroneHQ',
    sourceUrl: 'https://globaldronehq.com/blogs/guides/unitree-robot-price-guide-2026',
    confidence: 'C',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'GXO Logistics, Digit 배치 미국 2개 창고 추가 확대 (10/26) — Statesville NC·Lebanon TN, 2027년 초 운영 개시',
    summary: 'GXO Logistics가 10/26 Digit 휴머노이드 로봇 배치를 미국 2개 추가 창고(Statesville, NC / Lebanon, TN)로 확대한다고 발표. 2027년 초 운영 개시 예정. 초기 Digit 4로 시작하여 이후 Digit 5로 전환. 기존 Flowery Branch, GA 사이트에서 Digit이 100,000개 이상 토트를 이동하며, 전체 프로그램에서 65,000시간 이상의 상업·고객 운영 시간을 기록.',
    sourceName: 'The AI Insider / Automotive World',
    sourceUrl: 'https://theaiinsider.tech/2026/10/26/gxo-agility-robotics-expand-digit-humanoid-deployments-to-two-more-u-s-warehouses/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik Apollo 2 바이페달+휠 듀얼 옵션 제공 — Robot Park 데이터 수집 플릿 지속 운영 중',
    summary: 'The Robot Report에 따르면 Apptronik이 Apollo 2에 바이페달(이족보행)과 휠(바퀴) 두 가지 이동 옵션을 제공. 2026년 6월 론칭한 Robot Park 네트워크에서 Apollo 2 플릿이 지속적으로 실세계 인터랙션 데이터를 수집하며, Google DeepMind의 Gemini Robotics 모델 훈련에 활용. CEO Jeff Cardenas는 "상당한 도약(significant jump up)"이 될 차세대 모델을 2027년에 공개할 예정이라 시사.',
    sourceName: 'The Robot Report / HumanoidDaily',
    sourceUrl: 'https://humanoidsdaily.com/features/tesla-optimus-gen-3-figure-04-next-apollo-reveal-timeline',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 얼리 액세스 배송 시작 보도 (10/22) — 가사 자율 완수 불가, 텔레오퍼레이터 상시 개입 필수',
    summary: 'Substack 및 Startup Fortune이 10/22 NEO의 얼리 액세스 배송 시작을 보도. 그러나 핸즈온 테스터들은 NEO가 인간 오퍼레이터 원격 조종 없이는 단일 가사 작업도 완수하지 못했다고 보고. 1X는 "로봇이 막힐 때 원격 오퍼레이터가 개입한다"고 설명하며 라이트링으로 개입 상태를 표시. 독립 검증된 실 고객 인도 사례는 미확인. EQT 포트폴리오 커밋먼트: 300+ 기업에 최대 10,000대(2026~2030).',
    sourceName: 'Substack (MyAIPsychosis) / Startup Fortune',
    sourceUrl: 'https://startupfortune.com/1x-starts-delivering-its-20000-neo-home-robot-teleoperator-and-all/',
    confidence: 'C',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot Expedition A3 110대 기네스 세계기록 — 동시 동기화 댄스 최다 휴머노이드 기록 수립 (10/24 지난)',
    summary: 'Agibot Expedition A3 휴머노이드 110대가 10/24 중국 지난(Jinan)에서 동시 동기화 댄스를 수행하여 기네스 세계기록(가장 많은 휴머노이드 로봇 동시 댄스)을 수립. LinkBots 클러스터 제어 플랫폼과 초광대역(UWB) 포지셔닝 기술을 활용하여 센티미터 수준 정밀도로 제어. 대규모 멀티로봇 제어 능력을 대외적으로 시연한 PR 이벤트이자 기술 데모.',
    sourceName: 'Global Times / Humanoid Guide',
    sourceUrl: 'https://www.globaltimes.cn/page/202610/1372888.shtml',
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

export async function insertCiUpdate20261027() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-27) ===\n');

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
        collectedAt: '2026-10-27',
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

insertCiUpdate20261027()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
