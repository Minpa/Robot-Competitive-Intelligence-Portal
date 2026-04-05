/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-04-05
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-04-05.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-04-05)
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
    headline: 'Tesla Optimus V3 양산 의향 프로토타입 준비, 100만대 생산라인 구축 목표',
    summary: 'Optimus Gen 3 양산 의향 프로토타입 2026 초 준비 완료. Fremont S/X 라인을 Optimus 전환, 2026 CapEx $200억. 양산 2026년말 목표.',
    sourceName: 'NextBigFuture / Teslarati',
    sourceUrl: 'https://www.nextbigfuture.com/2026/04/tesla-optimus-v3-ready-for-mass-production.html',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    headline: 'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표',
    summary: 'FSD 아키텍처 기반 AI 에이전트 "Digital Optimus(Macrohard)". xAI와 협업, 2026년 9월 출시 목표.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus Gen 3 손 22 DoF — 정밀 작업 시연 (빨래 개기, 물건 잡기)',
    summary: 'Gen 3 양손 22 자유도. 주방 타올 뜯기, 찬장 열기, 빨래 개기, 던진 물건 받기 시연. AWE 2026 상하이에서 공개.',
    sourceName: 'Tesla 공식 / Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-awe-2026-shanghai/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics CES 2026 상용 Atlas 공개 — 2026 배치 전량 예약 완료',
    summary: 'CES 2026에서 상용 버전 공개. 즉시 보스턴 본사에서 생산 개시. 2026년 배치분 전량 Hyundai RMAC + Google DeepMind에 예약.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai $260억 미국 투자 — 로봇 공장 연간 3만대 생산 계획',
    summary: 'Hyundai Motor Group $260억 미국 투자, 로봇 공장 신설 (연 3만대 생산). 자체 시설에 수만대 Atlas 배치 예정. Google DeepMind와 Embodied AI 파트너십.',
    sourceName: 'Boston Dynamics / The Register',
    sourceUrl: 'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 상용 스펙: 리치 7.5ft, 리프팅 110lb, 4시간 배터리(교환식)',
    summary: '리치 7.5ft(228cm), 110lb(50kg) 리프팅, 작동온도 -4~104°F(-20~40°C), 배터리 4시간, 듀얼 교환식, 자동 충전 복귀.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI Series C $10억+ 유치, 밸류에이션 $390억',
    summary: 'Series C $10억+ (Nvidia, Intel Capital, Qualcomm Ventures, Salesforce 참여). Post-money 밸류에이션 $390억. Goldman Sachs 2035년 시장 $380억 전망.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 02 BMW/UPS 납품, Figure 03 백악관 방문',
    summary: 'Figure 02 BMW 스파르탄버그+UPS 납품. Figure 03 백악관 "Fostering the Future" 서밋 참석. BotQ 공장 4년 10만대 생산 목표.',
    sourceName: 'CNBC / Figure AI',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 스펙: 5\'8", 61kg, 20kg 페이로드, 5시간 배터리(무선충전)',
    summary: 'Figure 03: 5\'8"(173cm), 61kg, 20kg 페이로드, 1.2m/s 보행, 2.3kWh 교환식 배터리(5시간), 바닥 무선 충전 패드.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2025년 G1 5,500대 출하, 2026년 1~2만대 목표',
    summary: '2025년 G1 5,500대 출하. 2026년 1~2만대 목표. Morgan Stanley 중국 2.8만대 전망. G1 $13,500 (2024년 대비 90% 저렴).',
    sourceName: 'SCMP / eWeek',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 신청 — RMB 42억 모집, 2025 매출 17억위안(+335%)',
    summary: 'STAR Market IPO 신청(2026.3.20). 목표 RMB 42.02억. 2025 매출 RMB 17.08억(YoY 335%), 비GAAP 순이익 6억위안 초과. 시총 RMB 420억+.',
    sourceName: 'Caixin / SCMP',
    sourceUrl: 'https://www.caixinglobal.com/2026-03-21/unitree-robotics-files-for-608-million-star-market-ipo-102425491.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2: 6ft, 31 DoF, 360Nm 토크 — 날기차기/백플립 시연',
    summary: 'CES 2026 공개. H2: 약 6ft, 31 DoF, 360Nm 토크. 날기차기, 백플립, 샌드백 타격 시연. 고급 알고리즘 기반 고충격 안정성.',
    sourceName: 'ThomasNet / DronesPlus',
    sourceUrl: 'https://www.thomasnet.com/insights/unitree-h2-robot-kick-strike-backflip/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Toyota Canada RAV4 공장 Digit 7대 상용 배치 계약 (2026.2)',
    summary: '2026.2.19 발표. Toyota Woodstock RAV4 공장에 Digit 7대 상용 배치. 1년 파일럿 성공 후 계약. 토트 로딩/언로딩, 부품 공급 작업.',
    sourceName: 'TechCrunch / Toyota',
    sourceUrl: 'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit GXO 물류센터 10만+ 토트 이동 달성',
    summary: 'GXO Flowery Branch 시설에서 10만+ 토트 이동. 고객: GXO, Amazon, Schaeffler, Mercado Libre. 상용 수익 창출 단계.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Digit 차세대 — 50lb 페이로드, ISO 기능안전 인증 2026 중후반 목표',
    summary: '차세대 Digit: 페이로드 50lb으로 향상, 배터리 수명 개선. ISO 기능안전 인증 2026 중~후반 목표, 약 18개월 내 인간 협업 가능.',
    sourceName: 'Robot Report',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    confidence: 'C',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 확장 $5.2억 — 누적 $9.35억, 밸류에이션 $50억',
    summary: 'Series A 확장 $5.2억 (누적 $9.35억). 밸류에이션 $50억. 투자자: Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. Austin 확장+CA 오피스 오픈.',
    sourceName: 'CNBC / TechCrunch',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik-Google DeepMind Gemini Robotics 통합',
    summary: 'Google DeepMind Gemini Robotics AI 모델 통합. Mercedes-Benz, GXO, Jabil과 공장/물류 테스트 중. 2026년 신규 로봇 발표 예정.',
    sourceName: 'SiliconAngle / Apptronik',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apollo 스펙: 5\'8", 160lbs, 55lbs 페이로드, 4시간 배터리',
    summary: 'Apollo: 5\'8"(173cm), 160lbs(73kg), 55lbs(25kg) 페이로드, 4시간 배터리. Mercedes-Benz, GXO에서 실증 중.',
    sourceName: 'Robozaps / CNBC',
    sourceUrl: 'https://blog.robozaps.com/b/apptronik-apollo-review',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X-EQT 최대 1만대 공급 계약 (2026-2030, 포트폴리오사 300+곳)',
    summary: 'EQT 포트폴리오사 300+곳에 2026-2030 최대 1만대 공급. 제조/물류/창고 중심. 2026 미국 파일럿 시작, 유럽/아시아 확대.',
    sourceName: 'TechCrunch / Interesting Engineering',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X World Model 발표 — 비디오 기반 물리 기반 AI, 미경험 작업 자율 수행',
    summary: '2026.1 발표. 비디오 모델 기반 물리 기반 AI. 프롬프트만으로 미경험 객체/작업 자율 수행. NEO 로봇에 적용.',
    sourceName: '1X Technologies 공식 / Robot Report',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'NEO 사전주문 $20,000, 구독 $499/월 — 2026년 우선 배송',
    summary: 'NEO Home Robot 사전주문 $20,000 (우선배송 2026). 구독 모델 $499/월도 제공. 가정용 설계, 산업 파일럿도 병행.',
    sourceName: '1X Technologies 공식',
    sourceUrl: 'https://www.1x.tech/discover',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 1만대 생산 돌파 — 5,000→10,000 3개월만에 달성',
    summary: '2026.3 누적 1만대 생산. 5,000→10,000 단 3개월. 물류, 쇼룸, 소매, 교육 등 배치. 유럽/북미/일본/한국/동남아/중동 글로벌 수요.',
    sourceName: 'Robot Report / Agibot 공식',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot CES 2026 미국 데뷔 — Best of CES 다수 수상, A2/X2/G2 풀 라인업',
    summary: 'CES 2026 미국 데뷔. Best of CES 2026 다수 수상. A2(풀사이즈 안내), X2(컴팩트 교육/연구), G2(산업용 정밀조작) 풀 라인업 전시.',
    sourceName: 'PR Newswire / Agibot 공식',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'LG전자 Agibot 지분 투자 + CEO 상하이 방문 (양산/데이터/부품 협력)',
    summary: 'LG전자 Agibot 지분 투자(2025.8). CEO 류재철 상하이 방문(2026.3), 양산체계·로봇데이터학습팜·액추에이터 공급망 협력 논의.',
    sourceName: 'Korea Herald / Seoul Economic Daily',
    sourceUrl: 'https://www.koreaherald.com/article/10694574',
    confidence: 'A',
    category: 'partnership',
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

export async function insertCiUpdate20260405() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-04-05) ===\n');

  // Ensure 'agibot' and 'unitree-g1' and 'apollo' slugs exist
  const missingCompetitors = [
    { slug: 'agibot', name: 'Agibot A2/G2', manufacturer: 'Agibot (Shanghai)', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
    { slug: 'unitree-g1', name: 'Unitree G1/H2', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 8 },
    { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 9 },
  ];

  for (const comp of missingCompetitors) {
    const existing = await lookupCompetitor(comp.slug);
    if (!existing) {
      await db.insert(ciCompetitors).values(comp);
      console.log(`  ✅ 신규 경쟁사 추가: ${comp.name} (${comp.slug})`);
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const item of collectedData) {
    // Check duplicate
    const dup = await isDuplicateAlert(item.headline);
    if (dup) {
      console.log(`  ⏭️  중복 건너뜀: ${item.headline.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    const competitorId = await lookupCompetitor(item.competitorSlug);
    const layerId = await lookupLayer(item.layerSlug);

    // Insert into ci_monitor_alerts
    await db.insert(ciMonitorAlerts).values({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      headline: item.headline,
      summary: item.summary,
      competitorId,
      layerId,
      status: 'pending',
    });

    // Also stage structured update
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
        collectedAt: '2026-04-05',
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
const isDirectRun = process.argv[1]?.includes('insert-ci-update-2026-04-05');
if (isDirectRun) {
  insertCiUpdate20260405()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ CI 업데이트 실패:', err);
      process.exit(1);
    });
}
