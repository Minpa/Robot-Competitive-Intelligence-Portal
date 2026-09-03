/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-03
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-03.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-03)
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
    headline: 'Tesla, TSMC·Samsung·Micron을 Optimus 핵심 공급망 파트너로 공식 지목',
    summary: '2026.7.22 Q2 실적 발표에서 Elon Musk이 TSMC, Samsung, Micron을 Optimus 스케일업 핵심 파트너로 공식 지명. AI5 칩 생산(TSMC), 메모리(Micron), 반도체(Samsung) 공급 체계 구축. 10,000개 고유 부품의 신규 공급망 구축 중이며, 초기 생산은 "quite slow".',
    sourceName: 'DigiTimes Asia',
    sourceUrl: 'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 외부 상용 배치 2026년 말 시작 — 시간당 임대 모델 채택',
    summary: 'Tesla가 Optimus 외부 B2B 배포를 2026년 말 시작 예정. 초기 비즈니스 모델은 시간당 임대(per-hour leasing) 방식으로, 제조·물류 분야 우선 타겟. Tesla가 하드웨어·소프트웨어 유지보수를 담당하며 법적 리스크를 최소화. 소비자 직판($20K-$30K)은 2027년 이후 목표.',
    sourceName: 'Technology.org / optimusk.blog',
    sourceUrl: 'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai, 미국 로봇 인프라에 $260억 투자 — Atlas 연 30,000대 공장 2028 목표',
    summary: 'Hyundai Motor Group이 미국 로봇 인프라에 $260억 투자 계획 발표. Atlas 연간 30,000대 생산 공장을 2028년 목표로 건설. 2026년 전량 Hyundai RMAC 및 Google DeepMind에 배치 완료. 2027년 추가 고객 확대 예정.',
    sourceName: 'Forbes / Travteks',
    sourceUrl: 'https://travteks.com/blog/boston-dynamics-atlas-production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Atlas-Google DeepMind AI 연구 파트너십 본격화 — 체화 AI 모델 훈련용 배치',
    summary: '2026년 생산분 Atlas 유닛이 Google DeepMind에 배치되어 체화 AI(embodied AI) 모델 연구·훈련에 활용 중. 로봇 하드웨어와 최첨단 AI 연구의 결합으로 차세대 범용 로봇 AI 개발 가속. Hyundai 자동차 공장 투입은 2028년(부품 시퀀싱) 이후 단계적 확대.',
    sourceName: 'AI2Work / Engadget',
    sourceUrl: 'https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 월간 출하량 2배 증가 — BotQ 공장 연 12,000대 달성 궤도',
    summary: 'Figure AI가 BotQ 공장에서 Figure 03 월간 출하량을 전월 대비 2배로 증가시키며 생산 확대 중. 350+대 누적 출하. 연간 12,000대 초기 설계 용량 달성 궤도에 진입. 50,000대 확장 후 4년 내 100,000대 목표.',
    sourceName: 'Humanoids Daily / Figure AI',
    sourceUrl: 'https://www.humanoidsdaily.com/news/figure-claims-production-milestone-as-botq-ramps-up-figure-03-manufacturing',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Helix 02 가정용 AI: 세탁물 정리, 식기세척기 로딩(4분, 무인), 거실 정리 시연',
    summary: 'Figure 03의 가정용 AI 모델 Helix 02가 세탁물 접기, 4분 내 식기세척기 완전 무인 로딩, 개방형 거실 정리 등 다양한 가정 작업 시연. 모든 작업을 온보드 센서만으로 수행. Robot-as-a-Service(월 ~$1,000) 모델로 가정 시장 진출 계획.',
    sourceName: 'Forge Global / RoboZaps',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 상해 STAR Market 상장 완료(8/19) — 첫날 +487%, 시가총액 $530억',
    summary: '2026.8.19 Unitree가 상해 STAR Market에 688836 티커로 상장. IPO 가격 ¥150.80, 첫날 종가 기준 +487% 폭등으로 시가총액 약 $530억 달성. CSRC 역대 최단 승인(104일). A-Share 시장 최초 휴머노이드 로봇 상장사. DeepSeek 전략 배정(933,399주, 3년 보호예수).',
    sourceName: 'Value Add VC / KraneShares',
    sourceUrl: 'https://valueaddvc.com/unitree-ipo-tracker',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2026 H1 실적: 매출 ¥17.1억(YoY 4배↑), 순이익 ¥2.876억(YoY 2배↑)',
    summary: 'IPO 공시 기준 Unitree 2026년 상반기 매출 ¥17.1억(전년 대비 4배 증가), 순이익 ¥2.876억(2배 증가). 휴머노이드 로봇(G1)이 전체 매출의 51% 이상 차지. 2026년 연간 20,000대 출하 목표(2025년 6,500대 대비 3배).',
    sourceName: 'Caixin Global / Global Times',
    sourceUrl: 'https://www.caixinglobal.com/2026-08-07/unitree-robotics-prices-shanghai-ipo-at-61-billion-yuan-valuation-102472090.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2 Plus 발표 — NVIDIA Isaac GR00T 레퍼런스 휴머노이드',
    summary: '2026년 6월 Unitree H2 Plus 발표. NVIDIA Isaac GR00T 레퍼런스 휴머노이드 로봇으로 포지셔닝. 학술 연구용 특화. 기존 G1의 오픈소스 에코시스템(LeRobot v0.5.0 지원)에 더해 고급 연구 플랫폼 라인업 확장.',
    sourceName: 'Yahoo Tech / Unitree',
    sourceUrl: 'https://tech.yahoo.com/science/articles/unitrees-h2-robot-poses-pirouettes-170147250.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $25억 SPAC 합병 SEC 심사 중 — 미국 최초 순수 휴머노이드 상장사',
    summary: 'Agility Robotics(신규 사명: Agility)의 Churchill Capital XI과의 $25억 SPAC 합병이 SEC 심사 진행 중. S-4 초안 7/14 비공개 제출. 8/21 기준 주가 $14.57. 총 조달 $620M+(신탁 $420M + Foxconn 주도 PIPE $200M). 2026년 말 나스닥 AGLT 상장 목표.',
    sourceName: 'GeekWire / TSG Invest',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit 누적 65,000+시간 실전 가동 — $3억 예약 매출, 30+ 파이프라인 고객',
    summary: 'Digit가 9개 고객 시설(Schaeffler, GXO, Toyota Canada, Mercado Libre 등)에서 65,000+시간 실전 가동 달성. 예약 매출 $3억 이상. 30개+ 파이프라인 고객 확보. Digit v5(12월 출시)는 20시간 연속 가동, 안전 펜스 불필요, 교체 가능 엔드이펙터 탑재.',
    sourceName: 'Forbes / Interesting Engineering',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $9.35억 달성 — $5.2억 추가 조달로 Apollo 양산 가속',
    summary: 'Apptronik이 $5.2억 추가 조달로 Series A 총액 $9.35억 달성. Apollo 양산 스케일업 및 차세대 로봇 개발에 투입. Jabil과 양산 파트너십 체결, Mercedes-Benz·GXO Logistics 시설 테스트 진행 중.',
    sourceName: 'SiliconANGLE / The Robot Report',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apollo 2 — Google DeepMind 협업: Robot Park에서 차세대 AI 모델용 실세계 데이터 수집',
    summary: 'Apollo 2가 여러 Robot Park 및 고객 시설에서 Google DeepMind와 협업하여 차세대 AI 모델용 실세계 데이터 수집 진행 중. 바이페달/휠 베이스 구성 선택 가능한 훈련·데이터 수집 전용 플랫폼. Apollo 3를 2027년 최초 상용 제품으로 목표.',
    sourceName: 'Automate.org / RoboZaps',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Elevate Robotics 자회사 설립 — 초인적 산업 자동화 전문',
    summary: 'Apptronik이 Elevate Robotics 자회사를 신설, "superhuman industrial automation" 분야 전문화. 기존 Apollo 플랫폼 기반으로 산업 현장 특화 로봇 솔루션 제공. 2027년 Apollo 3 상용 출시와 맞물려 사업 구조 확대.',
    sourceName: 'Reuters / TradingView',
    sourceUrl: 'https://de.tradingview.com/news/reuters.com,2025-06-24:newsml_GNX5JQm5k:0-apptronik-announces-creation-of-elevate-robotics-a-new-subsidiary-focused-on-superhuman-industrial-automation',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: 'NEO 핸드 업그레이드(7/9): 25 DOF 건동식, 촉각 핑거팁, 슬립 감지, IP68',
    summary: '2026.7.9 NEO 핸드 대폭 업그레이드. 25 자유도 건동식(tendon-driven) 핸드, 촉각 핑거팁(슬립 감지 포함), IP68 방수. "사람 손이 할 수 있는 거의 모든 작업 수행 가능" 목표. 첫 고객 배송 유닛부터 적용.',
    sourceName: 'Dezeen / 1X Technologies',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'NEO 10,000대 사전주문 5일 완판 — 2026 미국 가정 배송 시작 예정, 배송 실적 미확인',
    summary: '1X NEO 10,000대 사전주문이 5일 만에 완판. Early Access $20,000 또는 월 $499 구독. 2026년 내 미국 고객 배송 시작 예정이나, 8월 기준 실제 고객 인도 확인 건 없음. 2027년 San Carlos 제2공장(100,000대 규모) 건설 예정.',
    sourceName: 'eWeek / Forbes',
    sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Fulin Precision 수십억원 규모 파트너십: 100대 Yuanzheng 로봇 공장 배치',
    summary: '2026년 8월 Agibot이 자동차 부품업체 Fulin Precision Engineering과 수십억원 규모 파트너십 체결. 약 100대 Yuanzheng(원정) 로봇을 Fulin 공장에 배치. 중국 제조업 분야 최대 규모 상업 휴머노이드 배치 사례 중 하나.',
    sourceName: 'South China Morning Post',
    sourceUrl: 'https://www.scmp.com/tech/tech-trends/article/3363544/agibot-overtakes-unitree-top-global-humanoid-robot-vendor-first-half-amid-ipo-push',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 프로세스 진행 중 — CICC·CITIC·Morgan Stanley 공동 주관',
    summary: '2026.7.24 Agibot 홍콩 IPO 공식 착수. 목표 기업가치 HK$400~500억(US$51~64억). CICC, CITIC Securities, Morgan Stanley 공동 주관. 누적 생산 15,000대, 누적 자금 $3.14억. Unitree STAR Market 상장과 함께 중국 휴머노이드 동시 IPO 러시.',
    sourceName: 'TechNode / Capital.com',
    sourceUrl: 'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 Ultra: NVIDIA Thor SoC, 51 DOF, 3D LiDAR+RGB-D, GPS/RTK/UWB',
    summary: 'WAIC 2026에서 A3 Ultra 공개. 174cm/60kg, 51 DOF, 양팔 각 5kg 페이로드, 8시간 배터리(스왑/직접/자율 충전 3종), NVIDIA Thor SoC, 3D LiDAR+RGB-D+어안+쌍안 카메라, GPS/RTK/UWB 포지셔닝. "Three Intelligences in One" 통합 아키텍처.',
    sourceName: 'Interesting Engineering / eWeek',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 규제/인증 동향 (전체 산업 영향) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 휴머노이드 전용 안전 표준 2026~2027 발행 예정 — 동적 안정성 로봇 대상',
    summary: '기존 산업용 ISO 10218:2025를 보완하는 ISO 25785-1(동적 안정성 로봇 전용 안전 표준)이 2026~2027년 발행 예정. 바이페달 보행 등 능동적 밸런스 의존 로봇에 특화. 현재 상용 휴머노이드의 15% 미만만 완전한 산업용 CE 인증 보유. EU Machinery Regulation 2023/1230이 2027.1.20부터 적용되어 AI Act와 결합 규제 체계 형성.',
    sourceName: 'SRES.ai / theresarobotforthat.com',
    sourceUrl: 'https://sres.ai/robotics-and-physical-ai/safety-standards-for-humanoid-and-general-purpose-robots-a-practical-guide/',
    confidence: 'B',
    category: 'regulation',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'safety',
    headline: 'ISO 10218:2025 패러다임 전환: 로봇이 아닌 "배치(deployment)" 단위 인증으로 변경',
    summary: '개정 ISO 10218:2025 및 ANSI R15.06-2025에서 인증 단위가 로봇 자체가 아닌 배치(deployment) 기반으로 전환. 동일 로봇도 환경에 따라 다른 인증 필요. 휴머노이드 로봇의 다양한 사용 환경(공장/가정/소매) 고려 시 인증 복잡도 대폭 증가.',
    sourceName: 'EVSINT / theresarobotforthat.com',
    sourceUrl: 'https://www.evsint.com/industrial-robot-safety-standards-iso-10218-ce-marking-2026/',
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

export async function insertCiUpdate20260903() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-03) ===\n');

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
        collectedAt: '2026-09-03',
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

insertCiUpdate20260903()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
