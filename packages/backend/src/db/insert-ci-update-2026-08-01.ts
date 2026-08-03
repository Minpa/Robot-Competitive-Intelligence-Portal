/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-08-01
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-08-01.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-08-01)
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
    headline: 'Tesla Q2 실적발표: TSMC·Samsung·Micron 핵심 파트너 지정 — Optimus 공급망 구축',
    summary: '2026.7.22 Q2 실적발표에서 Musk가 TSMC, Samsung, Micron을 Optimus 핵심 파트너로 명명. Samsung·TSMC는 수백억달러 반도체 팹 투자, Micron은 Tesla에 "매우 중요한" 메모리 할당 제공.',
    sourceName: 'DigiTimes',
    sourceUrl: 'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Giga Texas 제2 Optimus 공장 건설 착수 — 2027년 여름 생산 개시 목표',
    summary: 'Giga Texas 북쪽 캠퍼스 확장부지에 제2 Optimus 공장 건설 중. 2027년 여름 생산 개시 목표. 고볼륨 Gen 4 생산 예정. Fremont 공장은 Gen 3 생산에 집중.',
    sourceName: 'TechTimes / IFactoryApp',
    sourceUrl: 'https://ifactoryapp.com/industries/automotive-manufacturing/tesla-optimus-fremont-gen-3-humanoid-2026',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Musk: Optimus 생산 S-커브 초기 "상당히 평평하고 길 것" — 공급망 전무 상태',
    summary: '2026.7.25 Musk 인터뷰: Optimus는 기존 자동차와 달리 대부분 주요 부품의 기존 공급망이 없어 완전히 새로운 공급망을 처음부터 구축 중. S-커브 초기 구간이 평평하고 길 것으로 예상.',
    sourceName: 'The AI Insider / Inc.',
    sourceUrl: 'https://theaiinsider.tech/2026/07/25/musk-updates-progress-of-teslas-optimus-humanoid-robot-warns-of-long-and-flat-production-ramp/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 상용모델 사양 확정: IP67, -20~40°C, 4시간 배터리, 3분 자동 교체',
    summary: 'Atlas 상용 모델 사양 확정: IP67 방수방진, -20~40°C 운전 범위, 4시간 배터리 수명, 3분 자동 배터리 교체. 습윤 환경 작업 가능. 자율 배터리 교체로 연속 가동.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI Helix 학습 데이터 — Brookfield 10만 주거유닛 영상 데이터 2027년까지 수집',
    summary: 'Brookfield 파트너십으로 100,000 주거유닛에서 1인칭 가사 작업 영상 데이터(Project Go-Big) 수집. Helix 모델 학습 데이터 플라이휠 2027년까지 지속. 가정용 Figure 03 학습 핵심.',
    sourceName: 'Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 02 BMW 공장 초기 테스트런에서 30,000대 차량 생산 기여',
    summary: 'Figure 02를 BMW 사우스캐롤라이나 공장에 공급, 초기 테스트런에서 30,000대 차량 생산에 기여. Figure 03으로 시퀀싱 유스케이스 전환 후 BMW 협력 심화.',
    sourceName: 'Forge Global / Figure AI',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2 출시 — H1 후속, $29,900, H1-2 단종 및 매진',
    summary: 'H1 후속 모델 H2 출시, 가격 $29,900. 기존 H1-2 variant 단종/매진. H2가 사실상 H1 계보의 현행 모델. 신규 구매자는 H2로 안내.',
    sourceName: 'Yahoo Tech / RoboZaps',
    sourceUrl: 'https://tech.yahoo.com/science/articles/unitrees-h2-robot-poses-pirouettes-170147250.html',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2025년 매출 RMB 16.9억 (약 $2.3억), 5,500대 휴머노이드 출하 확인',
    summary: '2025년 매출 RMB 16.9억($2.3억), 5,500대 휴머노이드 출하. G1 EDU가 대학 연구용 풀바디 휴머노이드 시장에서 가장 널리 사용. STAR Market IPO 7월말 상장.',
    sourceName: 'Forbes / RobotShop',
    sourceUrl: 'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree UniPwn 보안 취약점 — Go2/G1/H1/B2 하드코딩 암호화키 패치 진행 중',
    summary: '2025.9 공개된 UniPwn 취약점: Go2, G1, H1, B2에 하드코딩된 암호화키 존재. Unitree 2025.9.29 "대부분 수정 완료" 발표. 2026.5 기준 펌웨어 업데이트 확인 필요.',
    sourceName: 'UniPwn Disclosure / RoboCloud Hub',
    sourceUrl: 'https://robocloud-dashboard.vercel.app/learn/blog/unitree-g1-h1-humanoid-robot',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics × Toyota Motor Manufacturing Canada 상업 계약 체결',
    summary: 'Toyota Motor Manufacturing Canada와 상업 계약 체결. 기존 고객(GXO, Schaeffler, Mercado Libre)에 추가. 9개 고객 시설에서 65,000시간+ 실운영 달성.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Humanoid Global: Agility SPAC 상장 진행 업데이트 + Silicon Valley AI Hub 개소',
    summary: '2026.7.28 Humanoid Global이 Agility SPAC 상장 진행 업데이트 발표 및 Silicon Valley AI Hub 개소. Digit 배포 확대를 위한 AI 훈련/테스트 인프라 구축.',
    sourceName: 'GlobeNewsWire',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 차세대 Apollo 모델 2026년 공개 예정 — 시장 확대용 신규 모델',
    summary: 'Apptronik이 $9.35억 Series A 자금으로 차세대 Apollo 로봇 개발 중, 2026년 공개 예정. 리테일·제조·물류 고객 유스케이스 해결 목적. 로봇 훈련·데이터 수집 시설 건설.',
    sourceName: 'The Robot Report / SiliconANGLE',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 첫해 생산분 10,000대+ 5일만에 전량 매진 — $20K 또는 $499/월 구독',
    summary: '2025.10.28 NEO 공개 후 5일만에 첫해 생산분 10,000대+ 전량 매진. Early Access $20,000 또는 월 $499 구독 모델. 2026년 소비자 배송 시작.',
    sourceName: 'Forbes / eWeek',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 핸드 최종 사양: 25 DOF, 인간 수준 그립력, IP68, 촉각 슬립 감지',
    summary: '2026.7.9 공개. 25 DOF 텐돈 구동, 촉각 핑거팁(슬립 감지), IP68 방수. 경쟁사 대비 약 3배 그립력. 캘리포니아 자체 제조, 첫 고객 출하분에 장착.',
    sourceName: 'TBPN Digest',
    sourceUrl: 'https://www.tbpndigest.com/story/2026-07-09/1x-technologies-reveals-neo-robot-hand-human-level-grip-strength-shipping-this-year',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X 2027년 연 100,000대 생산 목표 — San Carlos 2차 공장 증설 예정',
    summary: '2027년말까지 연 100,000대 이상 생산 목표. 추가 자동화 및 San Carlos 2차 공장 증설 예정. 현 Hayward 공장(58,000sqft) 외 추가 시설.',
    sourceName: 'GlobeNewsWire / Forbes',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot WAIC 2026 신제품 4종: A3 Ultra·X2 Edu·G2 Max·OmniHand 3 Ultra-M',
    summary: 'WAIC 2026에서 A3 Ultra 휴머노이드, X2 Edu 교육용, G2 Max 산업용, OmniHand 3 Ultra-M 로봇핸드 공개. "Deployment Year One" 선언, 5개 로봇 플랫폼+8개 AI 모델 동시 발표.',
    sourceName: 'Interesting Engineering / eWeek',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 글로벌 휴머노이드 시장 점유율 39% — Longcheer Technology 제조라인 배치',
    summary: 'Agibot 글로벌 휴머노이드 시장 점유율 39% 달성. Longcheer Technology 소비자 전자 정밀 제조 양산라인에 G2 로봇 배치. 인간 작업자와 나란히 실제 제조 환경 가동.',
    sourceName: 'TechTimes / The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/04/14/chinas-agibot-deploys-robots-in-a-consumer-electronics-manufacturing-production-line/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'neo',
    layerSlug: 'safety',
    headline: '가정용 휴머노이드 안전표준 전환기 — ISO 개인관리 로봇 표준 12년만에 개정 추진',
    summary: 'ISO 개인관리 로봇(personal care robot) 안전표준 12년만에 개정 추진. 위험 식별/평가/사용 시나리오 대응. 단, 테스트 방법·강제 제한·집행 메커니즘 미포함으로 한계 지적.',
    sourceName: 'IEEE Spectrum',
    sourceUrl: 'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 동적 안정 로봇 전용 표준 개발 진행 — ASTM 안정성 매트릭스 포함',
    summary: 'ISO 25785-1: 동적 안정(dynamically stable) 로봇 전용 안전표준 개발 중. ASTM 안정성 메트릭 포함. 기존 ISO 10218 하드웨어→애플리케이션 인증 전환과 병행.',
    sourceName: 'RoboticsBiz / GrabaRobot',
    sourceUrl: 'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
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

export async function insertCiUpdate20260801() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-08-01) ===\n');

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

    // ci_staging에도 구조화 데이터 저장
    await db.insert(ciStaging).values({
      updateType: item.category,
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        collectedAt: '2026-08-01',
      },
      sourceChannel: 'auto_crawl',
      status: 'pending',
    });

    console.log(`  ✅ 삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료: ${inserted}건 삽입, ${skipped}건 중복 스킵 ===`);
}

// 직접 실행 시
insertCiUpdate20260801()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
