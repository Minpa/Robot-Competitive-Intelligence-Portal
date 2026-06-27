/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-06-27
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-06-27.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-06-27)
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
    headline: 'Tesla Fremont S/X 라인 → Optimus 전환, 연간 100만대 생산 목표',
    summary: 'Model S/X 생산 종료 후 Fremont 라인을 Optimus 생산으로 전환. 2026년말까지 100만대/년 가동률 목표. 2026 생산 목표 5~10만대.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-factory-site-texas/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Gigafactory Texas 520만 sqft Optimus 공장 확장 — 연간 1,000만대 목표',
    summary: 'Q1 2026 실적 발표에서 Gigafactory Texas 520만 sqft Optimus 전용 공장 확장 확인. 궁극적 연간 1,000만대 생산 목표. 2026 CapEx $200~250억.',
    sourceName: 'Yahoo Finance / Tesla IR',
    sourceUrl: 'https://finance.yahoo.com/sectors/technology/articles/tesla-robotaxis-optimus-shift-focus-110440767.html',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Optimus 소비자 판매 2027년말 목표 — 가격 $20,000~$30,000',
    summary: '2026년 6월 기준 Optimus 미판매 상태. 사전주문/웨이트리스트 없음. Elon Musk 2027년말 소비자 판매 목표 $20K~$30K 가격대 제시.',
    sourceName: 'Optimusk Blog / eWeek',
    sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-release-date/',
    confidence: 'C',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 상용 확정 스펙: 56 DOF, 2.3m 리치, 자동 배터리 교환',
    summary: '상용 Atlas 56 DOF, 완전 회전 조인트, 2.3m 리치, 50kg 리프팅. 자동 배터리 교환으로 무중단 운전 지원.',
    sourceName: 'Boston Dynamics 공식 / Robozaps',
    sourceUrl: 'https://bostondynamics.com/products/atlas/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai Mobis 액추에이터 공급 파트너십 — Atlas 부품 공급망 구축',
    summary: 'Hyundai Mobis가 Atlas 액추에이터 공급. 고신뢰 부품 공급망 구축 및 액추에이터 개발/생산 가속화 협력.',
    sourceName: 'Robot Report / Boston Dynamics',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure BotQ 공장 1시간 1대 생산 달성 — 120일만에 24배 처리량 증가',
    summary: 'BotQ 공장에서 Figure 03 생산 속도 1일 1대 → 1시간 1대로 120일 만에 24배 증가. 150개 이상 네트워크 워크스테이션 운영. 연간 12,000대 생산 라인 구축. 초기 수율 80%+.',
    sourceName: 'Figure AI 공식 / Robotics & Automation News',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 350대+ 산업 고객 납품, BMW 배치 F.02 퇴역 후 F.03 전환',
    summary: '350대+ 산업 고객 납품 완료. BMW Spartanburg에서 약 1년간 F.02 운영 후 퇴역 (30,000대 BMW X3 생산 기여, 90,000개 판금 부품 적재). Figure 03로 전환.',
    sourceName: 'Figure AI 공식 / Interesting Engineering',
    sourceUrl: 'https://www.figure.ai/news/botq',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 라이브 스트리밍: 204,000개+ 패키지 분류, 163시간+ 연속 작동',
    summary: '2026.5 라이브 스트리밍 시연. Figure 03가 204,000개+ 패키지 라벨 면 아래로 분류 → 컨베이어 배달. 163시간+ 연속 가동.',
    sourceName: 'Figure AI 공식 / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Helix System S0 업그레이드 — 인지 기반 전신 제어(Perception-conditioned WBC)',
    summary: 'Helix System 0 (S0) 메이저 업그레이드. 인지 조건부 전신 제어(whole-body control) 도입. F.03 전체 자율 패키지 분류 지원.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'data',
    headline: 'Brookfield 파트너십 — 100,000개 주거시설 기반 데이터 수집 (2027까지)',
    summary: 'Brookfield Asset Management와 데이터 플라이휠 파트너십. 100,000개 주거시설에서 일상작업 1인칭 비디오 수집 → Helix 학습 데이터. 2027년까지 자금 지원.',
    sourceName: 'Forge Global / PitchBook',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 승인 — 목표 시총 $62억, 73일만에 심사 통과',
    summary: 'STAR Market 상장 승인 (2026.6.1 심사, 3.20 접수 후 73일). 목표 시총 RMB 420억 ($62억). 순수 로봇 기업 최초 IPO. 2025 매출 17.08억위안.',
    sourceName: 'Caixin Global / KraneShares',
    sourceUrl: 'https://www.caixinglobal.com/2026-05-26/unitree-fast-tracks-shanghai-ipo-with-target-valuation-of-62-billion-102447449.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Unitree UnifoLM-VLA-0 오픈소스 공개 — 자연어 지시 기반 가사 자율 수행',
    summary: '2026.3 UnifoLM-VLA-0 (Vision-Language-Action 모델) 오픈소스 공개. 자연어 명령으로 가정용 자율 작업 수행 가능.',
    sourceName: 'Unitree 공식 / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Unitree_Robotics',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 도쿄 하네다 공항 배치 — 세계 최초 공항 휴머노이드 상용 배치',
    summary: 'Japan Airlines + GMO Internet Group과 제휴. 하네다 공항에서 G1 수하물/화물 핸들링 상용 배치. 세계 최초 공항 휴머노이드 배치. 2028년까지 시범 운영.',
    sourceName: 'Robotics 24/7 / Japan Airlines',
    sourceUrl: 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'G1-D 변형 모델 출시 — 차동 구동 휠 베이스, 데이터 수집용',
    summary: 'G1-D 변형 모델: 이족보행 대신 차동 구동 휠 베이스 탑재, 상체/팔/매니퓰레이션은 동일. 데이터 수집 및 AI 학습 특화.',
    sourceName: 'ZMProbots / Bot Info',
    sourceUrl: 'https://botinfo.ai/articles/unitree-g1',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $25억 SPAC 합병 — Churchill Capital Corp XI, 티커 AGLT',
    summary: '2026.6.24 발표. Churchill Capital Corp XI와 합병, 기업가치 $25억. 티커 AGLT. 최초 순수 휴머노이드 상장기업. 예상 수익 $6.2억+ (신규 기관투자자 $2억 포함).',
    sourceName: 'BusinessWire / GeekWire',
    sourceUrl: 'https://www.businesswire.com/news/home/20260624555633/en/Agility-Robotics-to-Go-Public-Through-$2.5-Billion-Merger-with-Churchill-Capital-Corp-XI',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit v5 $3억+ 다년 계약 수주, 30개+ 잠재 고객 대규모 배치 평가 중',
    summary: 'Digit v5 차세대 모델 $3억+ 다년 주문 확보. 30개+ 잠재 고객 대규모 배치 평가 중. 현재 고객: GXO, Amazon, Schaeffler, Toyota Canada, Mercado Libre.',
    sourceName: 'Agility Robotics 공식 / GeekWire',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit 상용 가동 65,000시간+ 달성 — GXO, Amazon, Schaeffler, Toyota, Mercado Libre',
    summary: '실제 상용 환경에서 65,000시간+ 가동 달성. 고객: GXO, Schaeffler, Toyota Motor Manufacturing Canada, Mercado Libre. 토트 핸들링, 부품 공급 작업.',
    sourceName: 'TechFundingNews / Agility Robotics',
    sourceUrl: 'https://techfundingnews.com/agility-robotics-goes-public-at-a-2-5b-valuation-and-its-humanoid-robots-are-already-working-in-warehouses/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Toyota Motor Manufacturing Canada 상용 파트너십 체결 (2026.6.22)',
    summary: '2026.6.22 Toyota Motor Manufacturing Canada Division과 상용 파트너십 공식 발표. 기존 파일럿에서 상용 계약으로 전환.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Digit v5 NVIDIA Halos 안전 시스템 최초 채택 — AI 기반 협업 안전 휴머노이드',
    summary: 'Digit v5: 세계 최초 AI 기반 협동 안전(cooperatively safe) 휴머노이드 로봇. NVIDIA 신규 발표 Halos 안전 시스템 최초 채택 기업.',
    sourceName: 'Agility Robotics 공식 / Rolling Out',
    sourceUrl: 'https://rollingout.com/2026/06/24/agility-robotics-25-billion-spac/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 차세대 Apollo 1년 이상 테스트 중 — 2026 공개 예정',
    summary: '차세대 Apollo 로봇 1년 이상 내부 테스트 진행 중. 2026년 공개 예정. 리테일/제조/물류 고객 대상 상용 배치 확대 계획.',
    sourceName: 'Automate.org / Apptronik',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 신규 투자자 AT&T Ventures, John Deere, QIA 참여 확정',
    summary: 'Series A-X $5.2억 라운드 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority(QIA). 기존 B Capital, Google, Mercedes-Benz, PEAK6 재참여.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X 미국 공장 개소 — Hayward, CA 58K sqft, 연간 10K대 생산 역량',
    summary: 'Hayward, CA에 58,000 sqft 공장 개소. 미국 최초 수직통합 휴머노이드 제조 시설. 연간 10,000대 생산 역량. 2027년까지 100,000대 목표.',
    sourceName: 'TechFundingNews / eWeek',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'NEO 1차 연도 생산분 사전주문 5일만에 매진',
    summary: '2025.10.28 사전주문 시작 후 5일만에 1차 연도 생산분 전량 매진. 본체 $20,000, 구독 모델 $499/월(6개월 최소).',
    sourceName: '1X Technologies 공식 / Contrary Research',
    sourceUrl: 'https://research.contrary.com/company/1x',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X $10억 신규 펀딩 라운드 추진 중 (2025.9 보도)',
    summary: '가정용 휴머노이드 개발 지원 위해 $10억 신규 펀딩 라운드 추진 중 (2025.9 보도). 기존 누적 $1.3억+ 투자. 투자자: EQT Ventures, Tiger Global, OpenAI Startup Fund.',
    sourceName: 'Sacra / TechCrunch',
    sourceUrl: 'https://sacra.com/c/1x-technologies/',
    confidence: 'C',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot 신규 라인업: A3 풀사이즈, X3 소형, G2 Air+Max 휠, D2 사족',
    summary: 'CES 2026 이후 4종 신규 제품 발표: A3 풀사이즈 휴머노이드, X3 소형 휴머노이드, G2 Air+Max 휠 타입, D2 사족 로봇. 기존 A2/X2/G2 대비 성능 향상.',
    sourceName: 'TechTimes / Agibot 공식',
    sourceUrl: 'https://www.techtimes.com/articles/315988/20260419/agibots-new-robots-show-how-fast-chinas-humanoid-race-moving.htm',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 뮌헨 론칭 — 독일 시장 진출, Minth Group과 유럽 확장 파트너십',
    summary: '2026.2 뮌헨에서 공식 독일 시장 진출 발표. Minth Group과 전략적 파트너십 체결, 유럽 공동 확장. 물류/쇼룸/소매/교육 분야 배치.',
    sourceName: 'Interesting Engineering / Agibot',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-enters-us-with-humanoids-robot-dog',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Unitree+Agibot 중국 시장 점유율 ~80% 전망 (TrendForce)',
    summary: 'TrendForce 분석: 2026년 중국 휴머노이드 출하량 전년 대비 94% 증가 전망. Unitree+Agibot 합산 시장 점유율 약 80%.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    confidence: 'B',
    category: 'production',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 표준 개발 진행 중 — 동적 안정 로봇 전용 안전 규격',
    summary: 'ISO 25785-1: 동적 안정 로봇(dynamic stability) 전용 안전 표준 개발 중. Agility Robotics가 업계 최초 NVIDIA Halos 채택으로 안전 표준화 주도.',
    sourceName: 'LinkedIn / IEEE Spectrum',
    sourceUrl: 'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards',
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

export async function insertCiUpdate20260627() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-06-27) ===\n');

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
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        collectedAt: '2026-06-27',
      },
      sourceChannel: 'auto_scan',
      status: 'pending',
    });

    console.log(`  ✅ [${item.confidence}] ${item.competitorSlug}: ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`총 ${collectedData.length}건 중 ${inserted}건 삽입, ${skipped}건 중복 건너뜀`);
  console.log(`ci_monitor_alerts: ${inserted}건, ci_staging: ${inserted}건`);
}

// 직접 실행 시 (npx tsx ...)
const isDirectRun = process.argv[1]?.includes('insert-ci-update-2026-06-27');
if (isDirectRun) {
  insertCiUpdate20260627()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ CI 업데이트 실패:', err);
      process.exit(1);
    });
}
