/**
 * 경쟁사 데이터 자동 업데이트 스크립트 — 2026-04-08
 * 
 * 1) ci_competitors에 누락된 경쟁사 추가 (Unitree, Apptronik, Agibot)
 * 2) ci_monitor_alerts에 수집된 인텔리전스 삽입
 * 3) competitive_alerts (War Room)에 주요 알림 삽입
 * 4) ci_values 업데이트 (biz 레이어 항목)
 * 5) ci_staging에 검증 대기 항목 생성
 */
import { eq, and, sql } from 'drizzle-orm';
import {
  db,
  ciCompetitors,
  ciMonitorAlerts,
  ciLayers,
  ciValues,
  ciItems,
  ciCategories,
  ciStaging,
  competitiveAlerts,
  humanoidRobots,
  companies,
} from '../packages/backend/src/db/index.js';

// ============================================================
// 수집 데이터 (2026-04-08 웹 검색 기반)
// ============================================================

interface IntelItem {
  competitorSlug: string;
  headline: string;
  summary: string;
  category: 'partnership' | 'tech_spec' | 'funding' | 'production' | 'regulation';
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  sourceName: string;
  sourceUrl: string;
  severity: 'info' | 'warning' | 'critical';
  alertType: string;
}

const collectedData: IntelItem[] = [
  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    headline: 'Tesla Optimus 3 생산 2026년 여름 시작 — Fremont 공장 Model S/X 라인 전환',
    summary: 'Tesla가 Fremont 공장의 Model S/X 생산 라인을 Optimus 휴머노이드 로봇 생산으로 전환. 2026년 여름 소량 생산(수백 대) 시작, 2027년부터 본격 양산 목표. Musk는 아직 R&D 단계이며 첫 외부 상용 고객은 2026년 말 예상이라고 언급.',
    category: 'production',
    confidence: 'A',
    sourceName: 'Teslarati / Hoodline / TeslaNorth',
    sourceUrl: 'https://www.greendrive-accessories.com/blog/language/en/tesla-optimus-3-robot-humanoide-2026-2/',
    severity: 'critical',
    alertType: 'mass_production',
  },
  {
    competitorSlug: 'optimus',
    headline: 'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표',
    summary: 'Musk가 FSD 아키텍처 기반 AI 에이전트 "Digital Optimus"(코드네임 Macrohard)를 xAI와 공동 개발 중 발표. 2026년 9월경 출시 목표. 물리적 Optimus 로봇과 디지털 AI 에이전트의 통합 전략.',
    category: 'partnership',
    confidence: 'B',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
    severity: 'warning',
    alertType: 'partnership',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    headline: 'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 전량 사전 판매 완료',
    summary: 'CES 2026에서 상용 버전 Atlas 공개. 2026년 배치분 전량 사전 판매 완료. Hyundai RMAC 및 Google DeepMind에 배치 예정. 리치 7.5ft, 110lb 가반하중, 듀얼 스왑 배터리로 4시간 연속 가동.',
    category: 'production',
    confidence: 'A',
    sourceName: 'Engadget / The Register / Boston Dynamics 공식',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    severity: 'critical',
    alertType: 'mass_production',
  },
  {
    competitorSlug: 'atlas',
    headline: 'Hyundai $26B 미국 투자 — 연 30,000대 로봇 생산 공장 신설 계획',
    summary: 'Hyundai Motor Group이 미국 사업에 $26B 투자 발표. 여기에 연간 30,000대 로봇 생산 가능한 신규 로보틱스 공장 건설 계획 포함. Boston Dynamics 로봇의 자체 제조시설 배치도 수만 대 규모로 계획.',
    category: 'production',
    confidence: 'A',
    sourceName: 'IMechE / Automate.org',
    sourceUrl: 'https://www.imeche.org/news/news-article/boston-dynamics-reveals-commercial-version-of-its-atlas-humanoid-and-sends-it-to-work-in-hyundai-factories',
    severity: 'critical',
    alertType: 'mass_production',
  },
  {
    competitorSlug: 'atlas',
    headline: 'Boston Dynamics-Google DeepMind Gemini Robotics 통합 파트너십',
    summary: 'Google DeepMind의 Gemini Robotics 모델을 Atlas에 통합. 환경 인식, 자율 작업 수행, 작업 계획 능력 대폭 향상 목표. Atlas의 AI 자율성 수준을 한 단계 끌어올리는 전략적 파트너십.',
    category: 'partnership',
    confidence: 'A',
    sourceName: 'Boston Dynamics 공식 / Multiple outlets',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    severity: 'warning',
    alertType: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    headline: 'Figure AI Series C $1B+ 완료 — 기업가치 $39B, 총 누적 $1.9B',
    summary: 'Figure AI가 Series C에서 $1B 이상 모금, 기업가치 $39B. Nvidia, Intel Capital, Qualcomm 등 참여. 총 누적 펀딩 $1.9B 이상으로 순수 휴머노이드 로보틱스 기업 중 최대 규모.',
    category: 'funding',
    confidence: 'A',
    sourceName: 'Figure AI 공식 / TechCrunch / CNBC',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    severity: 'critical',
    alertType: 'funding',
  },
  {
    competitorSlug: 'figure',
    headline: 'Figure 03 공개 — BMW/UPS 상용 배치, BotQ 공장 10만대 생산 목표',
    summary: 'Figure 03(5ft8, 61kg, 20kg 페이로드, 5시간 가동)이 백악관 행사에 등장. Figure 02는 BMW와 UPS에 상용 배치 진행 중. BotQ 제조시설에서 4년간 100,000대 생산 목표.',
    category: 'production',
    confidence: 'A',
    sourceName: 'CNBC / Figure AI 공식',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    severity: 'critical',
    alertType: 'mass_production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree',
    headline: 'Unitree H2 공개 — 7-DOF 핸드, 4m/s 주행, 공중 백플립 시연',
    summary: '2026년 1월 CES에서 H2 모델 공개. 약 6피트 키, 7자유도 새 핸드, 플라잉 킥/백플립/샌드백 타격 시연. H2 $29,900, G1 $13,500, H1 $90,000 가격대.',
    category: 'tech_spec',
    confidence: 'B',
    sourceName: 'Thomas Net / Drones Plus Robotics',
    sourceUrl: 'https://www.thomasnet.com/insights/unitree-h2-robot-kick-strike-backflip/',
    severity: 'warning',
    alertType: 'score_spike',
  },
  {
    competitorSlug: 'unitree',
    headline: 'Unitree 2026년 G1 20,000대 출하 목표 — Morgan Stanley 중국 전망 2배 상향',
    summary: 'Unitree 경영진이 2026년 G1 20,000대 글로벌 출하 목표 공개. Morgan Stanley는 2026년 중국 판매 전망을 28,000대로 2배 상향 조정. 연구 모델에서 산업 규모 배치로 급격한 전환 시그널.',
    category: 'production',
    confidence: 'B',
    sourceName: 'eWeek / Morgan Stanley',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    severity: 'critical',
    alertType: 'mass_production',
  },

  // ── Agility Robotics Digit ──
  {
    competitorSlug: 'digit',
    headline: 'Toyota Canada, Digit 상용 RaaS 계약 체결 — 시범에서 정식 배치로 전환',
    summary: 'Toyota Motor Manufacturing Canada가 1년간 파일럿 후 Agility Robotics와 상용 RaaS(Robots-as-a-Service) 계약 체결(2026.02.19). Digit 3대→10대로 확대. GXO에서 100,000 토트 이상 처리 달성.',
    category: 'partnership',
    confidence: 'A',
    sourceName: 'Yahoo Finance / Robot Report / Robotics & Automation News',
    sourceUrl: 'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
    severity: 'warning',
    alertType: 'partnership',
  },
  {
    competitorSlug: 'digit',
    headline: 'Agility Robotics 차세대 Digit 개발 — 50lb 페이로드, ISO 안전 인증 목표',
    summary: 'Agility Robotics가 차세대 Digit 개발 중. 페이로드 50lb로 향상, 배터리 수명 개선, ISO 기능 안전 인증 2026년 중후반 목표. RoboFab 공장 연 10,000대 생산 가능.',
    category: 'tech_spec',
    confidence: 'B',
    sourceName: 'Robozaps / Agility Robotics',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    severity: 'info',
    alertType: 'score_spike',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    headline: 'Apptronik $520M 추가 투자유치 — 기업가치 $5B, 총 $935M Series A',
    summary: 'Apptronik이 $520M 추가 투자 유치(기업가치 $5B). B Capital-Google 공동 리드. 신규 투자자: AT&T Ventures, John Deere, 카타르 투자청(QIA). Series A 총 $935M. 생산 확대 및 캘리포니아 오피스 개설 계획.',
    category: 'funding',
    confidence: 'A',
    sourceName: 'CNBC / TechCrunch / Crunchbase News',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    severity: 'critical',
    alertType: 'funding',
  },
  {
    competitorSlug: 'apollo',
    headline: 'Apptronik-Google DeepMind Gemini Robotics 파트너십 및 신규 로봇 2026 발표 예정',
    summary: 'Apptronik이 Google DeepMind와 Gemini Robotics AI 모델 통합 파트너십 체결. Mercedes-Benz, GXO Logistics, Jabil과 테스트 진행 중. 2026년 신규 로봇 모델 발표 예정.',
    category: 'partnership',
    confidence: 'A',
    sourceName: 'SiliconANGLE / Interesting Engineering',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    severity: 'warning',
    alertType: 'partnership',
  },

  // ── 1X Technologies NEO ──
  {
    competitorSlug: 'neo',
    headline: '1X Technologies, CES 2026에서 NEO 가정용 로봇 공개 — $20K 얼리액세스',
    summary: 'OpenAI 투자를 받은 1X Technologies가 CES 2026에서 NEO 가정용 휴머노이드 로봇 공개. 얼리 액세스 $20,000, 구독 모델 $499/월. 2026년 미국 우선 배송, 2027년 글로벌 확대.',
    category: 'production',
    confidence: 'A',
    sourceName: 'AI Base / 1X 공식',
    sourceUrl: 'https://news.aibase.com/news/24272',
    severity: 'warning',
    alertType: 'mass_production',
  },
  {
    competitorSlug: 'neo',
    headline: '1X-EQT 파트너십: 2026~2030년 최대 10,000대 NEO 산업 배치 계약',
    summary: 'EQT 포트폴리오 기업 300+개사에 2026~2030년간 최대 10,000대 NEO 로봇 배치 계약. 제조, 창고, 물류 등 산업 용도. 1X의 World Model AI로 비디오 관찰 학습 가능.',
    category: 'partnership',
    confidence: 'A',
    sourceName: 'TechCrunch / eWeek',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    severity: 'warning',
    alertType: 'partnership',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    headline: 'Agibot 10,000대 생산 돌파 — 글로벌 시장점유율 39%, 연 5,100대 출하 1위',
    summary: '2026년 3월 30일 Agibot이 10,000번째 휴머노이드 로봇 생산. 5,000→10,000대 3개월만에 2배 증가. 2025년 5,100대 출하로 글로벌 1위(39% 점유율). 물류, 소매, 교육, 호스피탈리티 분야 배치.',
    category: 'production',
    confidence: 'A',
    sourceName: 'The AI Insider / Robotics & Automation News / Gizmochina',
    sourceUrl: 'https://theaiinsider.tech/2026/03/30/chinas-agibot-reaches-10000-units-citing-real-world-demand-for-humanoid-robots/',
    severity: 'critical',
    alertType: 'mass_production',
  },
  {
    competitorSlug: 'agibot',
    headline: 'Agibot 홍콩 IPO 추진 — 밸류에이션 HK$40~50B($5.1~6.4B), $142M 매출 목표',
    summary: 'Agibot이 2026년 홍콩 IPO를 추진 중. 밸류에이션 HK$40~50B($5.1~6.4B USD) 목표. Tencent, BYD, LG Electronics, Baidu 등 투자. CES 2026에서 미국 시장 정식 진출. A2/X2/G2 풀 포트폴리오 공개.',
    category: 'funding',
    confidence: 'B',
    sourceName: 'SCMP / PR Newswire / BigGo Finance',
    sourceUrl: 'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
    severity: 'warning',
    alertType: 'funding',
  },
];

// ============================================================
// 누락된 경쟁사 (ci_competitors에 추가 필요)
// ============================================================
const missingCompetitors = [
  { slug: 'unitree', name: 'Unitree H2/G1', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
  { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
  { slug: 'agibot', name: 'Agibot A2/G2', manufacturer: 'AGIBOT', country: '🇨🇳', stage: 'commercial', sortOrder: 9 },
];

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== 경쟁사 데이터 자동 업데이트 (2026-04-08) ===\n');

  // ── Step 1: 현재 DB 상태 확인 ──
  console.log('[1] 현재 DB 상태 확인...');
  const existingCompetitors = await db.select().from(ciCompetitors);
  console.log(`  ci_competitors: ${existingCompetitors.length}건`);
  existingCompetitors.forEach(c => console.log(`    - ${c.slug}: ${c.name} (${c.manufacturer})`));

  const existingAlerts = await db.select().from(ciMonitorAlerts);
  console.log(`  ci_monitor_alerts: ${existingAlerts.length}건`);

  const existingWarAlerts = await db.select().from(competitiveAlerts);
  console.log(`  competitive_alerts: ${existingWarAlerts.length}건`);

  // ── Step 2: 누락 경쟁사 추가 ──
  console.log('\n[2] 누락 경쟁사 추가...');
  let competitorsAdded = 0;
  for (const mc of missingCompetitors) {
    const exists = existingCompetitors.find(c => c.slug === mc.slug);
    if (exists) {
      console.log(`  이미 존재: ${mc.slug}`);
      continue;
    }
    await db.insert(ciCompetitors).values(mc);
    console.log(`  추가됨: ${mc.slug} (${mc.name})`);
    competitorsAdded++;
  }

  // 기존 경쟁사 stage 업데이트 (최신 정보 반영)
  const stageUpdates: Record<string, string> = {
    optimus: 'pilot',
    atlas: 'commercial',
    figure: 'commercial',
    digit: 'commercial',
    neo: 'pilot',
  };
  for (const [slug, newStage] of Object.entries(stageUpdates)) {
    const comp = existingCompetitors.find(c => c.slug === slug);
    if (comp && comp.stage !== newStage) {
      await db.update(ciCompetitors).set({ stage: newStage, updatedAt: new Date() }).where(eq(ciCompetitors.slug, slug));
      console.log(`  스테이지 업데이트: ${slug} ${comp.stage} → ${newStage}`);
    }
  }

  // 최신 경쟁사 목록 리로드
  const allCompetitors = await db.select().from(ciCompetitors);
  const competitorMap = new Map(allCompetitors.map(c => [c.slug, c.id]));

  // 레이어 맵 조회
  const allLayers = await db.select().from(ciLayers);
  const layerMap = new Map(allLayers.map(l => [l.slug, l.id]));

  // ── Step 3: ci_monitor_alerts 삽입 (중복 검사: headline 기반) ──
  console.log('\n[3] ci_monitor_alerts 삽입...');
  let alertsInserted = 0;
  let alertsSkipped = 0;

  for (const item of collectedData) {
    // 중복 검사: 같은 headline이 이미 있으면 skip
    const existing = existingAlerts.find(a => a.headline === item.headline);
    if (existing) {
      console.log(`  중복 스킵: ${item.headline.substring(0, 50)}...`);
      alertsSkipped++;
      continue;
    }

    const competitorId = competitorMap.get(item.competitorSlug) || null;
    // category → layer 매핑
    let layerId: string | null = null;
    if (item.category === 'tech_spec') layerId = layerMap.get('hw') || null;
    else if (item.category === 'funding' || item.category === 'production' || item.category === 'partnership') layerId = layerMap.get('biz') || null;
    else if (item.category === 'regulation') layerId = layerMap.get('safety') || null;

    await db.insert(ciMonitorAlerts).values({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      headline: item.headline,
      summary: item.summary,
      competitorId,
      layerId,
      status: 'pending',
    });
    console.log(`  삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    alertsInserted++;
  }

  // ── Step 4: competitive_alerts (War Room) 삽입 ──
  console.log('\n[4] competitive_alerts (War Room) 삽입...');
  let warAlertsInserted = 0;

  // humanoid_robots 테이블에서 로봇 ID 조회 (War Room 알림에 필요)
  const robots = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name })
    .from(humanoidRobots)
    .innerJoin(companies, eq(humanoidRobots.companyId, companies.id));

  // severity가 critical 또는 warning인 항목만 War Room 알림으로
  const criticalItems = collectedData.filter(d => d.severity === 'critical' || d.severity === 'warning');

  for (const item of criticalItems) {
    // 같은 제목의 알림이 이미 있는지 확인
    const dup = existingWarAlerts.find(a => a.title === item.headline);
    if (dup) {
      console.log(`  중복 스킵: ${item.headline.substring(0, 50)}...`);
      continue;
    }

    await db.insert(competitiveAlerts).values({
      robotId: null, // 경쟁사 알림이므로 LG 로봇 ID가 아닌 null
      type: item.alertType,
      severity: item.severity,
      title: item.headline,
      summary: item.summary,
      triggerData: {
        competitorSlug: item.competitorSlug,
        category: item.category,
        confidence: item.confidence,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        collectedAt: '2026-04-08',
      },
    });
    warAlertsInserted++;
  }
  console.log(`  삽입: ${warAlertsInserted}건`);

  // ── Step 5: ci_staging (검증 대기) 생성 ──
  console.log('\n[5] ci_staging 검증 대기 항목 생성...');
  let stagingCreated = 0;

  // 신뢰도 A/B인 주요 데이터 변경을 staging에 추가
  const highConfItems = collectedData.filter(d => d.confidence === 'A' || d.confidence === 'B');
  for (const item of highConfItems) {
    await db.insert(ciStaging).values({
      updateType: 'value_update',
      payload: {
        competitorSlug: item.competitorSlug,
        headline: item.headline,
        summary: item.summary,
        category: item.category,
        confidence: item.confidence,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
      },
      sourceChannel: 'auto',
      status: 'pending',
    });
    stagingCreated++;
  }
  console.log(`  생성: ${stagingCreated}건`);

  // ── Summary ──
  console.log('\n=== 업데이트 완료 ===');
  console.log(`신규 경쟁사 추가: ${competitorsAdded}건`);
  console.log(`ci_monitor_alerts 삽입: ${alertsInserted}건 (스킵: ${alertsSkipped}건)`);
  console.log(`competitive_alerts 삽입: ${warAlertsInserted}건`);
  console.log(`ci_staging 생성: ${stagingCreated}건`);
  console.log(`총 수집 항목: ${collectedData.length}건`);

  process.exit(0);
}

main().catch(err => {
  console.error('업데이트 실패:', err);
  process.exit(1);
});
