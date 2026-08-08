/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-08-08
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-08-08.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-08-08)
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
    headline: 'Tesla Q2 실적: TSMC·Samsung·Micron Optimus 핵심 공급 파트너로 공식 지명',
    summary: '2026.7.23 Q2 실적 콜에서 Musk이 TSMC, Samsung, Micron을 Optimus 스케일업 핵심 파트너로 공식 지명. Samsung·TSMC는 반도체 공장에 수백억 달러 투자 중이며 Optimus 지원 가능, Micron은 Tesla에 "매우 중요한" 메모리 할당 제공.',
    sourceName: 'Digitimes',
    sourceUrl: 'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Musk, Optimus 초기 생산 "long and flat" 경고 — 10,000개 고유 부품 공급망 병목',
    summary: '2026.7.25 업데이트: Musk은 Optimus 생산 램프가 "long and flat"할 것으로 경고. 10,000개 고유 부품 전량 신규 설계로 공급망 전체를 처음부터 구축하거나 자체 생산 필요. "Tesla가 지금까지 만든 것 중 제조 스케일업이 가장 어려운 제품".',
    sourceName: 'The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/07/25/musk-updates-progress-of-teslas-optimus-humanoid-robot-warns-of-long-and-flat-production-ramp/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Giga Texas 2세대 로봇 공장 착공 — 장기 연산 1,000만대/년 목표',
    summary: 'Fremont 1세대 공장(연 100만대 용량) 외에 Giga Texas에 2세대 로봇 전용 공장 착공. 장기적으로 연간 1,000만대 Optimus 생산 목표. EV에서 로봇으로 사업 축 전환 가속.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 양산 버전 상세 사양 확정: 56 DOF, 50kg 페이로드, IP67, 4시간 자체교환 배터리',
    summary: 'Atlas 양산 사양 확정: 1,900mm/90kg, 56 DOF, 순간 페이로드 50kg(지속 30kg), 리치 2.3m(최대 7.5ft), IP67 방진방수, 영하 20°C~40°C 작동, 4시간 자체교환 배터리. 2026 생산분 전량 예약 완료.',
    sourceName: 'Engadget / Forbes',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai 미국 로봇 전용 공장 30,000대/년 규모 확정 — 2028 가동 목표',
    summary: 'Hyundai Motor Group이 미국 내 Atlas 전용 로봇 공장 계획 확정. 연간 30,000대 생산 용량, 2028년 가동 목표. 초기 배포는 Hyundai 시설 및 Google DeepMind에 집중, 2027년 추가 고객 확대 예정.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 총 자금 $19억+, 기업가치 $390억 — Series C $10억+ (2025.9)',
    summary: 'Figure AI 누적 자금 $19억 이상, 기업가치 $390억. 2025.9 Series C에서 Parkway Venture Capital 주도로 $10억+ 조달. Nvidia, Intel Capital, Salesforce, Brookfield 참여. 순수 휴머노이드 스타트업 중 최다 자본.',
    sourceName: 'Sacra / TechFundingNews',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 02 BMW 실전 배치 성과: 11개월간 90,000+ 부품 적재, 30,000대 X3 생산 기여',
    summary: 'Figure 02가 BMW Spartanburg 공장에서 11개월간 일일 10시간 교대 근무. 90,000개 이상 부품 적재, 30,000대 이상 X3 차량 생산에 기여. Figure 03 40대도 동일 시설 배치 완료.',
    sourceName: 'ThomasNet / Fortune',
    sourceUrl: 'https://www.thomasnet.com/insights/figure-ai-overview/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'data',
    headline: 'Brookfield "Project Go-Big": 100,000 주거 유닛에서 가정용 AI 학습 영상 대규모 수집',
    summary: 'Figure AI가 Brookfield와 "Project Go-Big" 파트너십 체결. 100,000개 주거 유닛에서 자아 시점(egocentric) 인간 활동 영상을 수집하여 가정용 로봇 AI 학습 데이터로 활용. 가정 환경 기반 학습 데이터 확보 경쟁에서 차별화.',
    sourceName: 'RoboZaps / Figure AI',
    sourceUrl: 'https://blog.robozaps.com/b/figure-03-review',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2 발표로 H1 계열 레거시 전환 — H2 가격 $29,900',
    summary: 'H1-2 모델 판매 종료(delisted/sold out), 후속 H2가 $29,900에 출시. H1은 Stanford HumanPlus, CMU H2O 등 학술 연구의 기반 플랫폼으로서 역할 완료 후 레거시 전환. H2 Plus(NVIDIA GR00T 레퍼런스)가 연구용 최신 플랫폼.',
    sourceName: 'Yahoo Tech / RoboZaps',
    sourceUrl: 'https://tech.yahoo.com/science/articles/unitrees-h2-robot-poses-pirouettes-170147250.html',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree 전 제품 BLE 보안 취약점 UniPwn 공개 — 단일 하드코딩 AES 키 문제',
    summary: '보안 연구진이 UniPwn 취약점 공개: Unitree Go2, B2, G1, H1 전 플랫폼에서 단일 하드코딩 AES 키가 공유되어 웜형(wormable) BLE 공격 가능. 2025.9 공개. 대규모 배포 시 보안 리스크 우려.',
    sourceName: 'Security Researchers / ZMProbots',
    sourceUrl: 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Toyota Motor Manufacturing Canada (TMMC) Digit 상업 계약 체결 — 제조·물류 배치',
    summary: '2026.2.19 TMMC가 Agility Robotics와 상업 계약 체결. Digit을 TMMC 시설에 배치하여 제조, 공급망, 물류 업무 수행 지원. Schaeffler, GXO, Mercado Libre에 이은 추가 고객 확보.',
    sourceName: 'Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Humanoid Global 실리콘밸리 AI Hub 개소 — Digit 배포 확대 거점',
    summary: '2026.7.28 Humanoid Global이 실리콘밸리에 AI Hub를 개소하여 Digit 배포 스케일업 거점으로 활용. Agility 상장 프로세스 업데이트와 함께 발표. 누적 65,000+ 가동시간, 9개 고객 시설 배포.',
    sourceName: 'GlobeNewsWire',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
    confidence: 'A',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A-X $5.2억 추가 조달: 총 $9.35억, 기업가치 ~$53억',
    summary: '2026.2 Series A-X $5.2억 추가 조달. 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority. 기존: B Capital, Google, Mercedes-Benz, PEAK6. 시리즈 A 누적 $9.35억, 총 자본 ~$10억, 기업가치 ~$53억(3배 상승).',
    sourceName: 'CNBC / TechFundingNews',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 2026년 내 신규 로봇 공개 예정 — Apollo 3 차기 상용 모델 목표',
    summary: 'Series A-X 자금으로 Apollo 생산 확대 및 글로벌 배포 네트워크 확장. 2026년 내 "highly anticipated new robot" 공개 예정. Apollo 3가 최초 상용 제품으로 2027년 목표. John Deere 투자 참여로 농업·건설 분야 확장 가능성.',
    sourceName: 'SiliconANGLE / Apptronik',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 첫해 생산분 10,000대+ 5일만에 완판 — $20,000 또는 월 $499 구독',
    summary: '2026.10.28(예정) NEO 공개 후 첫해 생산 용량 10,000대+ 가 5일 만에 전량 판매. 가격: Early Access $20,000(2026 배송), 구독 월 $499. 167cm(5ft6), OpenAI 투자. 2026년 내 배송 시작, 2027년 말 연 100,000대 목표.',
    sourceName: 'Forbes / eWeek',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X NEO 원격 전문가 지원 모델: 자율 불가 작업 시 1X 전문가 스케줄 연결',
    summary: 'NEO는 완전 자율 불가 작업 시 1X 전문가가 스케줄된 시간에 원격 지원하는 하이브리드 모델 도입. 가정용 범용 로봇의 자율성 한계를 원격 지원으로 보완. "creepy factor" 감소 노력도 병행.',
    sourceName: 'eWeek / Notebookcheck',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 추진: HK$400~500억(US$51~64억) 기업가치 목표',
    summary: 'Agibot이 2026년 홍콩 IPO 신청 예정. 목표 기업가치 HK$400~500억(US$51~64억). 대규모 양산 및 국제 확장 자금 조달 목적. 누적 자금 $3.14억, 누적 생산 15,000대.',
    sourceName: 'Capital.com / PitchBook',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'LG전자 CEO Agibot 방중: 양산·데이터 인프라·액추에이터 공급망 협의',
    summary: 'LG전자 CEO가 Agibot 상하이 본사 방문. 양산 시스템, 데이터 학습 인프라, 액추에이터 등 핵심 부품 공급망 구조 집중 논의. LG전자의 Agibot 전략 투자(2025.8) 이후 기술 협력 심화. LG가 Nvidia, Agibot 등과 외부 RFM 최적화 협력 중.',
    sourceName: 'Korea Herald / Seoul Economic Daily',
    sourceUrl: 'https://www.koreaherald.com/article/10694574',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: '중국 MIIT 휴머노이드 로봇 최초 국가 표준 체계 발표 — 안전·자율성·시스템 설계 포함',
    summary: '2026.2 후반 중국 공업정보화부(MIIT)가 휴머노이드 로봇 및 구현 지능 최초 국가 표준 체계 발표. 안전, 자율성, 시스템 설계 영역 포함. 중국 내 양산 및 배포 확대에 맞춘 선제적 규제 프레임워크.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/03/31/why-chinas-new-humanoid-robot-standards-could-change-the-industry/100263/',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'EU 기계규정 2023/1230 2027.1.20 시행 확정 — 휴머노이드 로봇 AI 컴포넌트 명시 포함',
    summary: 'EU Machinery Regulation 2023/1230이 2027.1.20부터 기존 기계지침 대체 시행. 디지털 및 AI 컴포넌트를 포함한 로봇에 명시적 적용. 휴머노이드 로봇은 "완전 기계(complete machine)"로 분류되어 새로운 적합성 선언(Declaration of Conformity) 필요.',
    sourceName: 'RoboSelect360',
    sourceUrl: 'https://roboselect360.com/en/ressources/humanoid-robot-regulation-eu.html',
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

export async function insertCiUpdate20260808() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-08-08) ===\n');

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
        collectedAt: '2026-08-08',
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
insertCiUpdate20260808()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
