/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-08-12
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-08-12.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-08-12)
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
    headline: 'Tesla Optimus V3 Fremont 생산 개시 — Model S/X 라인 46일만에 전환 완료',
    summary: 'Tesla가 Fremont 공장의 Model S/X 조립 라인을 46일 만에 해체하고 Optimus V3 생산 라인으로 전환 완료. 2026년 5월 초 마지막 Model S 출고 후 7~8월 Optimus 생산 개시. 초기 생산 속도는 "quite slow"하며 10,000개 고유 부품의 신규 공급망이 병목. 장기 목표는 Fremont에서 연간 100만대 생산율.',
    sourceName: 'Electrek / Yahoo Finance',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus V3 사양 확정: AI5 칩(메모리 대역 5배 향상), 22 DOF 핸드, xAI Grok 음성',
    summary: 'Optimus V3 사양: 173cm/57kg, 손 22 DOF, 액추에이터 50개, Tesla AI5 칩(기존 대비 메모리 대역폭 5배 향상), xAI Grok 기반 음성 인터페이스 탑재. 현재 제조 원가 $50K~$100K+, 장기 목표 가격 $20,000~$30,000. 소비자 판매는 2027년 말 이후 예상.',
    sourceName: 'optimusk.blog / beginnersinai.org',
    sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-gen-3/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Giga Texas Optimus 작업 배치 현황: 배터리 셀 분류, 부품 키팅, 재고 관리',
    summary: 'Tesla가 Gigafactory Texas에 소규모 Optimus 플릿을 생산 환경에 배치. 현재 수행 작업: 배터리 셀 분류, 컴포넌트 키팅, 재고 관리. 자체 공장에서의 실전 검증 후 외부 B2B 배포는 2026년 말 프리미엄 가격으로 시작 예정.',
    sourceName: 'Technology.org / optimusk.blog',
    sourceUrl: 'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 5세대 공개: 복잡도 "거의 한 자릿수" 감소, 부품 수 대폭 축소',
    summary: '2026.7.2 Boston Dynamics 5세대 Atlas 공개. Director Alberto Rodriguez: "거의 한 자릿수(order of magnitude) 복잡도 감소." 부품 수 및 고유 부품 수 모두 대폭 축소. 모든 컴포넌트 모듈형 현장 교체 설계. 제조 속도·신뢰성·비용 모두 개선. 사양: 56 DOF, 완전회전 관절, 리치 7.5ft, 페이로드 110lbs(50kg).',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026년 전량 예약 완료 — Hyundai RMAC·Google DeepMind 초기 배치',
    summary: '2026년 Atlas 생산분 전량 예약(fully committed). 초기 플릿은 Hyundai Robotics Metaplant Application Center(RMAC)와 Google DeepMind에 배치. 2027년 추가 고객 확대 예정. Hyundai 자동차 공장 투입은 2028년(부품 시퀀싱), 2030년 컴포넌트 조립까지 확대 계획.',
    sourceName: 'Forbes / Engadget',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BotQ 공장 1,000대 돌파 — 시간당 1대 생산, 연 12,000대 설계 용량',
    summary: '2026.7.23 BotQ 공장에서 Figure 03 1,000번째 유닛 생산. 1월 일 1대에서 4월 시간당 1대로 120일 만에 24배 처리량 증가. 배터리 라인 수율 99.3%(500+팩). 연간 12,000대 초기 설계 용량, 50,000대 확장 후 4년 내 100,000대 목표.',
    sourceName: 'Humanoids Daily / Figure AI',
    sourceUrl: 'https://www.humanoidsdaily.com/news/figure-claims-production-milestone-as-botq-ramps-up-figure-03-manufacturing',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BMW 실전 배치 확대 — 40대 Spartanburg 공장 추가 투입',
    summary: 'Figure 02의 BMW Spartanburg 11개월 실전 성과(90,000+ 부품, 30,000대 X3 기여) 이후 Figure 03 40대를 동일 시설에 추가 배치. 패키지 분류, 라벨 부착, 컨베이어 벨트 전달 등 물류 작업 수행 중. 350+대 누적 출하.',
    sourceName: 'ThomasNet / Fortune',
    sourceUrl: 'https://www.thomasnet.com/insights/figure-ai-overview/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 상해 STAR Market IPO: 기업가치 ¥610억(~$90억), 8/10 청약 2,600배 초과',
    summary: 'Unitree가 상해 STAR Market에 IPO 추진. 주당 ¥150.80, 총 조달 ~¥61억. 기업가치 ¥610억(~US$90억). 8/5 예비 조사, 8/10 청약. 기관 수요 2,600배 초과 청약. DeepSeek에 전략 배정(933,399주, 3년 보호예수). 매출 ¥17.1억(YoY 4배↑), 순이익 ¥2.876억(2배↑). 중국 본토 첫 휴머노이드 로봇 상장사.',
    sourceName: 'Caixin Global / Global Times',
    sourceUrl: 'https://www.caixinglobal.com/2026-08-07/unitree-robotics-prices-shanghai-ipo-at-61-billion-yuan-valuation-102472090.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2026년 20,000대 출하 목표 — 2025년 6,500대(G1 5,500대) 대비 3배 확대',
    summary: 'Unitree 2026년 출하 목표 20,000대(생산 용량 4배 확대). 2025년 총 6,500대+(G1 5,500대) 출하로 글로벌 1위 실적. 단, 2026 H1 기준 Agibot이 8,400대 출하로 Unitree를 추월해 글로벌 1위 등극.',
    sourceName: 'eWeek / Interesting Engineering',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Hugging Face LeRobot v0.5.0 Unitree G1 공식 지원 — ACT/Diffusion/Pi0/GR00T 모델 호환',
    summary: '2026.3 Hugging Face LeRobot v0.5.0에서 Unitree G1 전체 지원 추가. ACT, Diffusion, Pi0, GR00T 모델 호환. G1이 오픈소스 로봇 학습 에코시스템의 핵심 레퍼런스 플랫폼으로 자리매김.',
    sourceName: 'Hugging Face / ZMProbots',
    sourceUrl: 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit v5 12월 출시 예정 — 안전 펜스 없이 인간과 협업, 20시간 연속 가동',
    summary: '2026.8.10 Forbes 보도: Digit v5 12월 출시. 핵심 차별점: 안전 펜스(cage) 없이 인간과 나란히 협업 가능한 최초의 휴머노이드. 20시간 연속 가동, 표준화된 자체 교환 가능 엔드이펙터, 벌크 자재 취급 특화.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $25억 SPAC 합병으로 나스닥 상장 추진 — 예약 매출 $3억',
    summary: 'Agility Robotics(사명 변경: Agility)가 $25억 규모 SPAC 합병을 통해 나스닥 상장 추진. 티커: AGLT. 2026년 말 거래 완료 예상. 예약 매출 $3억. 65,000+ 시간 실전 가동, 9개 고객 시설(Schaeffler, GXO, Toyota Canada, Mercado Libre 등) 배치 중.',
    sourceName: 'GeekWire / Interesting Engineering',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apollo 2 공개(2026.6): 훈련·데이터 수집 플랫폼, 바이페달/휠 베이스 구성 가능',
    summary: '2026.6 Apollo 2 공개. 훈련 및 실세계 데이터 수집 전용 플랫폼으로 포지셔닝. 바이페달(bipedal) 또는 휠 베이스 구성 선택 가능. 여러 Robot Park 및 고객 시설에서 Google DeepMind와 협업하여 차세대 AI 모델용 데이터 수집 진행 중.',
    sourceName: 'Automate.org / RoboZaps',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik-Jabil 양산 파트너십: Apollo 상업 생산 스케일업 착수',
    summary: 'Apptronik이 글로벌 제조업체 Jabil과 Apollo 양산 파트너십 체결. 2026년 생산 램프업 진행 중. Apollo 3를 2027년 최초 상용 제품으로 목표. Mercedes-Benz, GXO Logistics 시설에서 Apollo 테스트 진행.',
    sourceName: 'SiliconANGLE / Apptronik',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO Factory(Hayward, CA) 가동 — 미국 최초 수직통합 휴머노이드 양산시설',
    summary: '1X Technologies가 캘리포니아 Hayward에 58,000sqft NEO Factory 가동 개시. 미국 최초 수직통합 고볼륨 휴머노이드 양산 시설. 200+명 고용. 첫해 10,000대 생산분 5일 완판. 2027년 100,000대 목표로 San Carlos 제2공장 건설 예정.',
    sourceName: 'eWeek / Forbes / The Robot Report',
    sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: 'NEO 소음 22dB — 가정용 설계: 냉장고 수준 저소음으로 주거 환경 최적화',
    summary: 'NEO 작동 소음 22dB(냉장고 수준). 167cm(5ft6), 가격 $20,000(Early Access) 또는 월 $499 구독. 가정 환경 전용 설계로 저소음 특화. 2026년 내 미국 고객 배송 시작 예정이나, 7/16 기준 실제 고객 인도 확인 건 없음.',
    sourceName: 'eWeek / heise online',
    sourceUrl: 'https://www.heise.de/en/news/1X-to-deliver-humanoid-household-robot-Neo-to-US-customers-in-2026-11287205.html',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 2026 H1 글로벌 휴머노이드 출하 1위 — 8,400대(점유율 44%)',
    summary: 'Agibot이 2026년 상반기 약 8,400대 휴머노이드 로봇 출하로 글로벌 1위 등극. 시장 점유율 44%. Unitree를 추월. 6월 단월 15,000대 누적 출하(전 제품군). 홍콩 IPO와 맞물려 공격적 양산·출하 확대.',
    sourceName: 'South China Morning Post',
    sourceUrl: 'https://www.scmp.com/tech/tech-trends/article/3363544/agibot-overtakes-unitree-top-global-humanoid-robot-vendor-first-half-amid-ipo-push',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 Ultra WAIC 2026 공개: NVIDIA Thor 탑재, 51 DOF, 8시간 구동',
    summary: 'WAIC 2026에서 A3 Ultra, X2 Edu, G2 Max, OmniHand 3 Ultra-M 4종 동시 공개. A3 Ultra: 174cm/60kg, 51 DOF, 양팔 각 5kg 페이로드, 8시간 배터리(스왑/직접/자율 충전), NVIDIA Thor SoC, 3D LiDAR+RGB-D+어안+쌍안 카메라, GPS/RTK/UWB 포지셔닝. "Three Intelligences in One"(보행·상호작용·조작) 통합 아키텍처.',
    sourceName: 'Interesting Engineering / eWeek',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 공식 착수(7/24): 목표 기업가치 HK$400~500억($51~64억)',
    summary: '2026.7.24 Agibot 홍콩 IPO 프로세스 공식 시작. 목표 기업가치 HK$400~500억(US$51~64억). 8월 중 상장 가능성. 누적 자금 $3.14억, 누적 생산 15,000대. Unitree 상해 IPO와 함께 중국 휴머노이드 로봇 동시 IPO 러시.',
    sourceName: 'TechNode / CryptoBriefing',
    sourceUrl: 'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
    confidence: 'A',
    category: 'funding',
  },

  // ── 규제/인증 동향 (전체 산업 영향) ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'US 제재 2일 후 Unitree IPO 확정 — 미중 로봇 기술 규제 긴장 고조',
    summary: '2026.8.1 미국의 대중국 기술 제재 조치 발표 2일 후 Unitree가 IPO를 공식 확정. 미중 기술 갈등이 로봇 산업으로 확대되는 양상. Unitree·Agibot 등 중국 휴머노이드 기업의 글로벌 확장에 규제 리스크 상존.',
    sourceName: 'Seoul Economic Daily',
    sourceUrl: 'https://en.sedaily.com/international/2026/08/01/two-days-after-us-curbs-chinas-unitree-confirms-ipo-next',
    confidence: 'A',
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

export async function insertCiUpdate20260812() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-08-12) ===\n');

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
        collectedAt: '2026-08-12',
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

insertCiUpdate20260812()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
