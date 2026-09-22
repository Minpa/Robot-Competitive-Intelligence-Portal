/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-22
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-22.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-22)
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
    headline: 'Tesla 중국 공급업체 양산 감사 착수 — 닝보 9/16 도착, Tuopu·Sanhua·Joyson 인증, 연 50,000대 목표',
    summary: 'Tesla 로보틱스 팀이 9월 16일 닝보에 도착하여 17일부터 Optimus Gen 3 양산 감사 개시. Tuopu Group(액추에이터·섀시), Ningbo Joyson Electronic(센서), Zhejiang Sanhua Intelligent Controls(열관리) 3사 인증. 닝보·항저우·상하이 일대 기존 자동차 공급망 기업 대상. 단가 $20,000 목표로 per-unit 원가 정밀 검토. 2026년 연간 50,000대 목표로 Gigafactory 전세계 배치용. Solactive China Humanoid Robotics Index 1.4% 상승, Tuopu 2.8% 상승.',
    sourceName: 'CnEVPost / TrendForce / Bloomberg / SCMP',
    sourceUrl: 'https://cnevpost.com/2026/09/21/tesla-audits-china-suppliers-optimus-mass-production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus 전용 Gigafactory 철골 완성 단계 — Giga Texas 700만sqft, 드론 영상 공개',
    summary: 'Teslarati가 공개한 최신 드론 영상에서 Giga Texas 내 Optimus 전용 공장 철골 구조가 완성에 근접한 것이 확인됨. 약 700만 sqft 규모로 중국 경쟁사들의 양산 확대에 대응하기 위한 fast-track 건설. Fremont에서는 이미 1,000대 이상 Gen 3가 배터리 조립·EV 팩 로딩·케이블 라우팅 등 수행 중. Elon Musk는 연말까지 주당 2,500대 생산 램프 목표.',
    sourceName: 'Teslarati / NextBigFuture / Seoul Economic Daily',
    sourceUrl: 'https://www.teslarati.com/new-drone-video-shows-teslas-optimus-factory-reaching-a-turning-point/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit 5 공개 (9/15) — 50lb 반복 리프트, 7.2ft 리치, 9분 충전, 20시간+ 가동, AI 인체감지 안전시스템',
    summary: 'Agility Robotics가 9월 15일 차세대 Digit 5를 공식 발표. 핵심 스펙: 반복 리프트 50lb(22.7kg), 선반 리치 7.2ft(219cm), 급속충전 9분, 일일 가동 20시간 이상. AI 기반 인체감지 센서로 충돌 위험 시 정지/착석 안전 프로토콜 구현, 물리적 배리어 의존도를 획기적 감소. 이동 전 시각·청각 경고 발신. Digit 4 대비 페이로드 25% 향상, 충전시간 90% 단축. 2027년 EU/UK 최초 해외 상용 출시 계획.',
    sourceName: 'GeekWire / Bloomberg / Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit 4 누적 운용시간 65,000시간 돌파 — GXO·Schaeffler·Amazon·Toyota 등 북미 다수 고객사',
    summary: 'Digit 5 발표 시점 기준으로 선행 모델 Digit 4가 북미 다수 고객사(GXO, Schaeffler, Amazon, Toyota Motor Manufacturing Canada 등)에서 누적 65,000시간 이상 운용됨을 공개. Agility Robotics의 양산 로봇이 실제 산업 환경에서 장기 안정성을 입증한 유의미한 마일스톤. SPAC 합병을 앞두고 투자자 대상 운용 실적 데이터의 핵심 근거.',
    sourceName: 'Agility Robotics / GeekWire',
    sourceUrl: 'https://www.geekwire.com/2026/agilitys-new-digit-5-robot-lifts-50-pounds-works-20-hours-a-day-and-operates-alongside-people/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI BotQ 공장 — 120일 만에 일 1대→시간 1대 생산, 350대+ 생산·1,000번째 EVT 로봇 달성',
    summary: 'Figure AI의 BotQ 공장이 Figure 03 생산량을 120일 이내에 하루 1대에서 시간당 1대로 확대. 현재까지 350대 이상 생산, first-pass yield 80% 이상 달성. Brett Adcock CEO가 1,000번째 EVT(Engineering Validation Test) 로봇 생산 마일스톤을 발표. BMW Spartanburg에서 Figure 03 물류 시퀀싱 배치 진행 중, Figure 02 조립라인 파일럿 후속.',
    sourceName: 'Forge Global / Figure AI / Time',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, Catalyst Brands 리노 DC 배치 계약 체결 — Joey Pouch 분류 자동화',
    summary: 'Figure AI가 Catalyst Brands와 상용 계약 체결, 네바다주 리노(Reno) 물류센터에 Figure 03 휴머노이드 로봇 배치. Joey Pouch 분류 자동화 업무를 수행. BMW 외 두 번째 주요 기업 고객으로, Figure의 다각적 산업 진출을 보여주는 사례. 10시간 연속 라이브스트림에서 인간 대비 98.5% 성능을 시현하며 지속적 작업 능력을 증명.',
    sourceName: 'Figure AI / Time',
    sourceUrl: 'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A $935M 돌파 — $520M 추가 유치, AT&T·John Deere·QIA 신규 참여, 밸류에이션 $5B',
    summary: 'Apptronik이 2026년 2월 Series A 확장 라운드로 $520M 추가 유치, 총 $935M 달성. 밸류에이션 $5B. 신규 투자자로 AT&T Ventures, John Deere, Qatar Investment Authority(QIA) 참여. 기존 투자자 B Capital, Google, Mercedes-Benz, PEAK6 추가 참여. 자금은 2026년 신규 Apollo 버전 공개 및 양산 램프에 사용 예정. Apollo는 6ft, 55lb 리프트, 22시간/일 가동 가능. Mercedes-Benz 및 Jabil에서 이미 배치 운영 중.',
    sourceName: 'CNBC / The Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik 차세대 Apollo "significant jump" — 2026년 내 공개 예정, Robot Park 9만sqft 학습시설',
    summary: 'Apptronik 경영진이 차세대 Apollo 로봇이 현행 모델 대비 "significant jump"이 될 것이라 언급. 2026년 내 공개 예정이나 구체적 일정은 미정. Austin 소재 Robot Park(90,000sqft)에서 텔레오퍼레이션 및 자율 실행 병행 방식으로 대규모 학습 데이터 수집 진행 중. 이 데이터가 Google DeepMind Gemini Robotics 파운데이션 모델 학습에 활용됨.',
    sourceName: 'Automate.org / Apptronik',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 핸드 업그레이드 — 25 DoF 텐던구동, 촉각 핑거팁, 슬립감지, 첫 고객 유닛부터 탑재 (7/9)',
    summary: '1X Technologies가 7월 9일 NEO 로봇의 핸드 업그레이드를 공개. 25 DoF(Degrees of Freedom) 텐던구동(tendon-driven) 방식, 촉각 핑거팁(tactile fingertips), 슬립감지(slip detection) 기능 탑재. 첫 고객 배송 유닛부터 업그레이드 버전 적용. 가격 $20,000(Early Access) 유지, 월 $499 구독 모델 병행. 10,000대 사전주문 완판 상태이나 실 배송은 아직 미확인.',
    sourceName: 'RoboZaps / eWeek / 1X Technologies',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 상하이 STAR Market IPO 최종 확정 — RMB 42억(~$618M) 조달, 밸류에이션 $5.9B',
    summary: 'Unitree Robotics(688836.SH) IPO 등록이 7월 3일 승인되어 상하이 STAR Market 상장 최종 확정. 약 RMB 4.2B(~$618M) 조달, 추정 밸류에이션 $5.9B. 2025년 연간 5,500대+ 휴머노이드 출하, 매출 RMB 1.69B 기록(흑자 달성, 업계 드문 사례). 다만 DOD Section 1260H 등재에 따른 미국 투자자 리스크 지속. G1 가격 $13,500, H2 $29,900 (H1은 레거시화).',
    sourceName: 'Forbes / Unitree 투자설명서 / CNBC',
    sourceUrl: 'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 15,000번째 로봇 출하 (6/28) — G2 산업용, H1 2026 글로벌 점유율 43%·1위 확정',
    summary: 'Agibot이 6월 28일 누적 15,000번째 로봇 출하를 달성. 마일스톤 유닛은 AGIBOT G2 산업용 embodied task 로봇. 10,000→15,000대까지의 빠른 달성으로 양산 역량 입증. H1 2026 글로벌 점유율: Counterpoint 기준 43%(~9,700대), Smart Analytics 기준 44%(~8,400대). 제품 포트폴리오: A3 풀사이즈 바이페달, G2 산업용, X시리즈 소형, 쿼드러페드, 상업청소 로봇. 제2회 World Humanoid Robot Games에서 총 46개 메달(금 18개) 1위.',
    sourceName: 'PR Newswire / The Robot Report / Digitimes',
    sourceUrl: 'https://www.therobotreport.com/agibot-produces-15000th-robot-marking-milestone-embodied-ai-deployment/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026 상용 가격 공개 — 대당 약 $420,000, 2026년 물량 전량 사전배정 완료 (Hyundai·DeepMind)',
    summary: 'Boston Dynamics가 Atlas 2026 상용 가격을 약 $420,000/대로 공개. 2026년 생산분은 Hyundai RMAC(Robotics Metaplant Application Center) 및 Google DeepMind에 전량 사전배정 완료. 스펙: 높이 1,900mm(6.2ft), 무게 90kg(198lb), 56 DoF, 리치 7.5ft, 리프트 110lb(50kg), 동작온도 -20~40°C. 엔터프라이즈 최종 버전으로 일관성·신뢰성에 중점. Boston 본사에서 즉시 생산 개시.',
    sourceName: 'Engadget / Robotics 24/7 / Boston Dynamics 공식',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'production',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 "동적 안정 산업용 이동로봇" 안전표준 개발 중 — 기존 ISO 10218 AI 로봇 한계 노출',
    summary: '2026년 현재 휴머노이드 로봇 안전 표준은 ISO 10218:2025와 ANSI/A3 R15.06-2025가 핵심. 그러나 이들 표준은 예측 가능·반복적 로봇 동작을 전제하여 LLM/강화학습 기반 실시간 의사결정 AI 로봇에 부적합. ISO 25785-1이 동적 안정 산업용 이동로봇(dynamically stable robots) 전용으로 개발 중이나 아직 미발행. EU 기계류 규정 2023/1230은 2027년 1월 14일부터 전면 적용 예정으로, 사이버보안 의무조항 및 고위험 기계 제3자 인증 확대 포함. Digit 5가 AI 인체감지 안전시스템을 도입한 것은 이러한 규제 흐름에 대한 선제 대응으로 해석.',
    sourceName: 'ISO / RoboticsBiz / KiteCompliance / RoboSelect360',
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

export async function insertCiUpdate20260922() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-22) ===\n');

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
        collectedAt: '2026-09-22',
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

insertCiUpdate20260922()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
