/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-02
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-02.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-02)
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
    headline: 'Tesla Q2 2026 실적 발표: TSMC·Samsung·Micron을 Optimus 핵심 공급파트너로 공식 지명',
    summary: '2026.7.22 Q2 실적 발표에서 머스크가 TSMC, Samsung, Micron을 Optimus 로봇 양산 핵심 공급파트너로 공식 지명. Samsung은 Texas fab에서 AI5 칩 생산 중이며 AI6 개발도 진행. Micron은 장기 메모리 할당 확보. 현재 "insane" 수준인 메모리 가격에도 합리적 조건으로 계약.',
    sourceName: 'DIGITIMES / TrendForce',
    sourceUrl: 'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla-Samsung $165억 반도체 장기 계약: AI5·AI6 칩 Texas fab 생산, 1.6nm 시대 개막',
    summary: 'Tesla가 Samsung과 $165억 규모 장기 반도체 공급 계약 체결. AI5 칩을 Samsung Texas fab에서 생산 중이며, 차세대 AI6는 1.6nm 공정 적용 예정. Optimus 로봇과 자율주행 양쪽 AI 컴퓨트 수요 충당. AI5 양산은 2027년 중반 고볼륨 생산 예상.',
    sourceName: 'CNBC / EVANNEX / Carbon Credits',
    sourceUrl: 'https://carboncredits.com/teslas-game-changing-16-5bn-samsung-deal-for-ai-chips-is-this-a-turning-point-for-tesla-stock/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Optimus 외부 상용 판매 2026년 말 개시 — B2B 프리미엄 가격, 소비자 판매는 2027년 말',
    summary: 'Tesla 자체 공장(Gigafactory Texas)에서 Optimus 소규모 플릿 실전 검증 후, 2026년 말 B2B 프리미엄 가격으로 외부 상용 판매 개시 예정. 소비자 대상 판매는 2027년 말 이후. 장기 목표 가격 $20,000~$30,000이나 현재 제조 원가 $50K~$100K+.',
    sourceName: 'Technology.org / Teslarati',
    sourceUrl: 'https://www.teslarati.com/elon-musk-outlines-tesla-optimus-production-expectations/',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 5세대 — 부품 복잡도 "한 자릿수" 감소, 모든 컴포넌트 현장 모듈 교체 설계',
    summary: '2026.7.2 Forbes: BD Director Alberto Rodriguez "거의 order of magnitude 복잡도 감소." 총 부품 수·고유 부품 수 모두 대폭 축소. 모든 컴포넌트를 모듈형 현장 교체 가능하게 재설계. 제조 속도·신뢰성·비용 동시 개선. 양산 준비 완료 설계.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai 로봇 공장 연 30,000대 생산 설계 — Atlas 2028년 자동차 공장 부품 시퀀싱 투입',
    summary: 'Hyundai Motor Group이 연 30,000대 로봇 생산 가능한 전용 공장 건설 계획. Atlas는 2028년 Hyundai 자동차 공장에 부품 시퀀싱 작업 투입, 2030년까지 컴포넌트 조립 단계로 확대. Google DeepMind에도 초기 플릿 배치 중.',
    sourceName: 'Forbes / TechRadar',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 기업가치 $390억 — Series C $10억+ 조달, NVIDIA·Intel Capital·Qualcomm 참여',
    summary: 'Figure AI가 Parkway Venture Capital 리드 Series C에서 $10억+ 조달, 포스트머니 $390억 가치평가. 참여사: Brookfield, NVIDIA, Macquarie, Intel Capital, Salesforce, T-Mobile Ventures, Qualcomm Ventures. 2024년 2월 $26억 대비 15배 상승.',
    sourceName: 'Sacra / TSG Invest',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI 자체 Helix 모델 전환 — OpenAI 파트너십 종료 후 인하우스 AI 전략',
    summary: '2025년 2월 OpenAI 모델 파트너십을 종료하고 자체 Helix 모델로 전환. Brookfield "Project Go-Big"을 통해 100,000개 주거 유닛에서 1인칭 시점(egocentric) 비디오 데이터 수집 중. 가정 환경 실세계 데이터 확보 전략.',
    sourceName: 'TechCrunch / Sacra',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 첫날 460% 급등, 시가총액 $500억 — 중국 본토 첫 휴머노이드 상장사 벤치마크',
    summary: '2026.8.19 Unitree 상해 STAR Market 상장 첫날 종가 ¥845(+460%), 장중 최고 ¥1,100(+629%). IPO 가격 ¥150.80($22), 시가총액 ~$500억 도달. 휴머노이드 로봇 산업 최초의 공개시장 가격 벤치마크 형성. 기관 2,600배 초과 청약, DeepSeek 전략 배정(933,399주, 3년 보호예수).',
    sourceName: 'TechTimes / KraneShares / Value Add VC',
    sourceUrl: 'https://www.techtimes.com/articles/325193/20260821/unitree-ipo-closes-460-valued-50-billion-first-real-price-humanoid-robotics.htm',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree-Siemens Digital Industries 전략 협력: 연 10,000대 양산 디지털 트윈 체계 구축',
    summary: '2026.3.16 Unitree와 Siemens Digital Industries Software 전략 협력 계약 체결. 연 10,000대 휴머노이드 양산 목표로 Siemens의 산업 디지털화 전문성과 Unitree의 풀스택 로봇 역량 통합. 디지털 트윈 기반 생산 최적화.',
    sourceName: 'RoboZaps / Unitree',
    sourceUrl: 'https://blog.robozaps.com/b/humanoid-robot-news-week-march-16-22-2026',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2 "Destiny Awakening" 신모델 공개: 180cm/70kg, 차세대 플래그십',
    summary: 'Unitree가 H2 "Destiny Awakening" 차세대 플래그십 휴머노이드 공개. 180cm(5ft11), 70kg(154lbs). H1 후속 모델로 IPO와 함께 제품 라인업 고도화. 기존 G1(교육/연구용)·H1(범용)에 H2(산업/서비스 고급형) 추가.',
    sourceName: 'Yahoo Tech / Unitree',
    sourceUrl: 'https://tech.yahoo.com/science/articles/unitrees-h2-robot-poses-pirouettes-170147250.html',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Agility × NVIDIA Halos: 업계 최초 풀스택 안전 시스템 탑재 휴머노이드, IEC 61508 인증 추진',
    summary: '2026.6.23 Agility가 NVIDIA Halos for Robotics 최초 도입 기업으로 선정. IGX Thor + Halos Core를 Digit에 통합하여 안전 펜스 없는(cage-free) 인간-로봇 협업 실현. NVIDIA Halos AI Systems Inspection Lab에서 IEC 61508, ISO 13849, ISO/IEC TR 5469 인증 프로세스 진행 중.',
    sourceName: 'NVIDIA Newsroom / Engineering.com',
    sourceUrl: 'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility 예약 매출 $3억+, 고객 파이프라인 30사+ — 누적 실전 가동 65,000시간',
    summary: 'Agility(구 Agility Robotics) $25억 SPAC 상장 준비 과정에서 공개: 다년간 계약 기반 예약 매출 $3억+. 30개사+ 잠재 고객 파이프라인. 현재 Schaeffler, GXO, Toyota Motor Manufacturing Canada, Mercado Libre 등 9개 시설에서 65,000시간+ 실전 가동.',
    sourceName: 'GeekWire / TechFundingNews',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik $520M Series A-X: AT&T·John Deere·카타르투자청 신규 참여, 누적 ~$10억',
    summary: '2026.2.11 Apptronik $520M Series A-X 라운드 마감. 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority. 기존: B Capital, Google, Mercedes-Benz, PEAK6. Series A 총 $935M+, 전체 누적 ~$10억. 기업가치 $50억.',
    sourceName: 'CNBC / The Robot Report / SiliconANGLE',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik-Google DeepMind Gemini Robotics 전략 파트너십: 차세대 AI 모델 공동 개발',
    summary: 'Apptronik이 Google DeepMind와 Gemini Robotics 기반 전략 파트너십 유지. 복수의 Robot Park 및 고객 시설에서 차세대 AI 모델용 실세계 데이터 수집 협업 진행. Apollo 2를 훈련·데이터 수집 전용 플랫폼으로 활용.',
    sourceName: 'Apptronik / Automate.org',
    sourceUrl: 'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X-EQT 전략 딜: 2026~2030년 10,000대 NEO 로봇 EQT 포트폴리오 300사+ 배치',
    summary: '1X Technologies와 EQT가 전략적 배치 계약 체결. 2026~2030년간 최대 10,000대 NEO 로봇을 EQT 포트폴리오 300개사+에 배치. 제조·물류·창고 등 산업 유스케이스 중심. 가정용으로 설계된 NEO의 산업 영역 확장 시그널.',
    sourceName: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 고객 인도 지연 우려 — 7월 중순 기준 실제 배송 확인 건 0',
    summary: '1X NEO Factory(Hayward) 가동 및 10,000대 사전 주문 완판에도 불구, 2026.7.16 기준 실제 고객 인도 확인 건이 없음. 미국 내 배송은 2026년 내 시작 예정이나 구체적 일정 미발표. 양산 역량과 실제 인도 사이 갭 모니터링 필요.',
    sourceName: 'RoboZaps / heise online',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'C',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'Agibot GO-2 ViLLA 모델 + AGIBOT WORLD 2026: 오픈소스 산업급 체화지능 데이터셋 공개',
    summary: '2026.4 Agibot Partner Conference에서 GO-2(ViLLA Embodied Foundation Model) 공개. Action Chain-of-Thought으로 장기 작업 일관성 구현, 주요 벤치마크 SOTA 달성. AGIBOT WORLD 2026: 산업·물류·가정·호텔·상업 시나리오의 실세계 데이터 오픈소스 공개.',
    sourceName: 'PR Newswire / Robotics & Automation News',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 8월 상장 임박 — 목표 HK$400~500억($51~64억), Unitree와 동시 IPO 러시',
    summary: '2026.7.24 Agibot 홍콩 IPO 프로세스 공식 시작. 목표 기업가치 HK$400~500억(US$51~64억). 8월 중 상장 가능성. 누적 자금 $3.14억, 누적 생산 15,000대. Unitree STAR Market IPO(8/19)와 맞물려 중국 휴머노이드 동시 IPO 러시 형성.',
    sourceName: 'TechNode / CryptoBriefing',
    sourceUrl: 'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
    confidence: 'A',
    category: 'funding',
  },

  // ── 산업 전반 규제/안전 동향 ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'NVIDIA Halos for Robotics 발표 — 업계 최초 풀스택 Physical AI 안전 시스템',
    summary: '2026.6.23 NVIDIA가 Halos for Robotics 발표. AI 컴퓨트와 안전 기능을 통합한 업계 최초 풀스택 안전 시스템. IEC 61508, ISO 13849, ISO/IEC TR 5469 인증 대응. Agility가 최초 도입. 휴머노이드 로봇 산업 안전 인증 표준화 가속화 신호.',
    sourceName: 'NVIDIA Investor Relations',
    sourceUrl: 'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Halos-for-Robotics-the-Industrys-First-Full-Stack-Safety-System-for-Physical-AI/default.aspx',
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

export async function insertCiUpdate20260902() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-02) ===\n');

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
        collectedAt: '2026-09-02',
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

insertCiUpdate20260902()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
