/**
 * ARGOS 경쟁사 데이터 자동 업데이트 - 2026-04-06
 *
 * 실행: npx tsx scripts/ci-update-2026-04-06.ts
 *
 * 수집일: 2026-04-06
 * 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI, Unitree,
 *           Agility Robotics Digit, Apptronik Apollo, 1X NEO, AGIBOT
 */

import { db, ciCompetitors, ciValues, ciItems, ciCategories, ciLayers, ciFreshness, ciMonitorAlerts, ciStaging } from '../packages/backend/src/db/index.js';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================
// 수집된 인텔리전스 데이터 (신뢰도 포함)
// ============================================================

interface IntelItem {
  competitorSlug: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  category: 'partnership' | 'tech_spec' | 'funding' | 'production' | 'regulation';
}

const collectedIntel: IntelItem[] = [
  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    headline: 'Tesla Optimus Gen 3 양산 시작 - Fremont 공장 2026년 5만~10만대 목표',
    summary: '2026년 1월 Fremont 공장에서 양산 시작. Model S/X 생산라인을 Optimus로 전환. 2027년 Gigafactory Texas에서 연 1,000만대 목표.',
    sourceName: 'Tesla IR / Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-job-listings/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    headline: 'Tesla-xAI "Digital Optimus" 프로젝트 발표 - $2B 투자',
    summary: 'xAI와 합작 Digital Optimus(코드명: Macrohard) 프로젝트. Tesla의 $2B xAI 투자의 첫 성과물. 2026년 9월 출시 목표.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    headline: 'Boston Dynamics Atlas 상용 버전 CES 2026 공개 - 2026년 전량 예약 완료',
    summary: '7.5ft 도달거리, 110lbs 리프트, 듀얼 스왑 배터리 4시간 운용. Hyundai RMAC & Google DeepMind 배치 확정.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    headline: 'Hyundai $26B 미국 투자 - 연 30,000대 로봇 생산 공장 계획',
    summary: 'Hyundai(BD 모회사) $26B 미국 투자 발표. 로봇 전용 공장(연 3만대) 포함. Google DeepMind와 embodied AI 공동 개발.',
    sourceName: 'IMechE / The Register',
    sourceUrl: 'https://www.imeche.org/news/news-article/boston-dynamics-reveals-commercial-version-of-its-atlas-humanoid-and-sends-it-to-work-in-hyundai-factories',
    confidence: 'A',
    category: 'funding',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    headline: 'Figure AI Series C $1B+ 달성 - 밸류에이션 $39B',
    summary: 'Parkway VC 주도. NVIDIA, Intel Capital, LG Technology Ventures, Qualcomm, Salesforce, T-Mobile 참여. BMW/UPS 납품.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    headline: 'Figure 03 가정용 로봇 출시 - 백악관 시연',
    summary: 'Figure 03 하드웨어/소프트웨어 완전 재설계. 인간 관찰 학습 기능. 세탁기 로딩, 택배 분류, 빨래 접기 시연. OpenAI 종료→자체 Helix VLA.',
    sourceName: 'Robozaps / Wikipedia',
    sourceUrl: 'https://blog.robozaps.com/b/figure-03-review',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    headline: 'Unitree Robotics 상하이 STAR Market IPO 신청 - $610M 조달 목표',
    summary: '2026.3.20 STAR Market IPO 접수. CNY 4.2B($610M). 밸류 $7B~$14.5B. 2025 매출 CNY 1.71B(전년비 4.3배↑), 순이익 CNY 600M(최초 흑자).',
    sourceName: 'Bloomberg',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    headline: 'Unitree H2 공개 - 7DOF 손, 비행 킥/백플립 시연',
    summary: 'CES 2026 H2 시연. 7DOF 손(인간 수준 조작). G1 40개국 판매($13,500). 2026년 1~2만대 출하 목표. B2-W 하이브리드 이동 로봇.',
    sourceName: 'Thomas Net / Drones Plus Robotics',
    sourceUrl: 'https://www.thomasnet.com/insights/unitree-h2-robot-kick-strike-backflip/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agility Robotics Digit ──
  {
    competitorSlug: 'digit',
    headline: 'Agility Digit 10만+ 토트 처리 - Toyota Canada, Mercado Libre 신규 계약',
    summary: 'GXO에서 10만+ 토트 처리 달성. Toyota Canada Woodstock 공장 RaaS 배치. Mercado Libre 텍사스 물류센터 계약. Fortune 500 다수 고객.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    headline: 'Apptronik $520M 추가 펀딩 - 총 $935M, $5B 밸류에이션',
    summary: '$520M Series A 확장(총 $935M). Google 투자, DeepMind Gemini Robotics 적용. Mercedes-Benz, GXO, Jabil 파트너십. 2026년 신규 로봇 발표 예정.',
    sourceName: 'CNBC / TechCrunch',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies NEO ──
  {
    competitorSlug: 'neo',
    headline: '1X NEO 10,000대 산업배치 계약 - EQT 300개 포트폴리오사',
    summary: 'EQT와 2026~2030 최대 10,000대 계약. 사전주문 $20K, 구독 $499/월. 1X World Model(비디오→물리 행동). CES 2026 가정용 시연.',
    sourceName: '1X Technologies / TechCrunch',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── AGIBOT ──
  {
    competitorSlug: 'agibot-x1',
    headline: 'AGIBOT 10,000대 생산 달성 - 세계 최초 대규모 휴머노이드 양산',
    summary: '2026.3.30 상하이 10,000번째 생산. 5,000→10,000 단 3개월. 물류/리테일/호텔/교육/제조 다분야. 유럽/북미/일본/한국 글로벌 진출.',
    sourceName: 'Interesting Engineering / Gizmochina',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
    confidence: 'A',
    category: 'production',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: '',
    headline: '휴머노이드 로봇 글로벌 안전 표준 진전 - ISO 25785-1, IEEE 프레임워크',
    summary: 'ISO 25785-1 동적 안정성 로봇 표준 워킹 드래프트. IEEE 프레임워크 최종본. 중국 독자 표준 제정. EU Machinery Regulation 사이버보안 의무화.',
    sourceName: 'IEEE / Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/03/31/why-chinas-new-humanoid-robot-standards-could-change-the-industry/100263/',
    confidence: 'B',
    category: 'regulation',
  },
];

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('=== ARGOS 경쟁사 데이터 업데이트 시작 (2026-04-06) ===\n');

  // 1. 신규 경쟁사 추가
  console.log('1. 신규 경쟁사 확인/추가...');
  const newCompetitors = [
    { slug: 'unitree-g1', name: 'G1/H2', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
    { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
    { slug: 'agibot-x1', name: 'X1/A2', manufacturer: 'AGIBOT', country: '🇨🇳', stage: 'commercial', sortOrder: 9 },
  ];

  for (const comp of newCompetitors) {
    const existing = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, comp.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(ciCompetitors).values(comp);
      console.log(`  ✅ 추가: ${comp.name} (${comp.manufacturer})`);

      // 빈 ci_values 생성
      const compRow = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, comp.slug)).limit(1);
      const allItems = await db.select().from(ciItems);
      if (allItems.length > 0 && compRow.length > 0) {
        await db.insert(ciValues).values(
          allItems.map(item => ({ competitorId: compRow[0]!.id, itemId: item.id, value: null, confidence: 'F' }))
        );
      }
      // ci_freshness 생성
      const allLayers = await db.select().from(ciLayers);
      if (allLayers.length > 0 && compRow.length > 0) {
        await db.insert(ciFreshness).values(
          allLayers.map(layer => ({ layerId: layer.id, competitorId: compRow[0]!.id, tier: 2 }))
        );
      }
    } else {
      console.log(`  ⏭️  이미 존재: ${comp.name}`);
    }
  }

  // 2. 기존 경쟁사 상태 업데이트
  console.log('\n2. 기존 경쟁사 상태 업데이트...');
  const stageUpdates = [
    { slug: 'optimus', stage: 'commercial', name: 'Optimus Gen 3' },
    { slug: 'atlas', stage: 'commercial', name: 'Atlas (Production)' },
    { slug: 'figure', stage: 'commercial', name: 'Figure 02/03' },
    { slug: 'neo', stage: 'pilot', name: undefined },
  ];
  for (const u of stageUpdates) {
    const updateData: Record<string, unknown> = { stage: u.stage, updatedAt: new Date() };
    if (u.name) updateData.name = u.name;
    await db.update(ciCompetitors).set(updateData).where(eq(ciCompetitors.slug, u.slug));
    console.log(`  ✅ ${u.slug} → ${u.stage}${u.name ? ` (${u.name})` : ''}`);
  }

  // 3. Monitor Alerts 삽입
  console.log('\n3. Monitor Alerts 삽입...');
  let alertCount = 0;
  for (const intel of collectedIntel) {
    // 중복 확인
    const existing = await db.select().from(ciMonitorAlerts)
      .where(eq(ciMonitorAlerts.headline, intel.headline)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭️  중복: ${intel.headline.substring(0, 50)}...`);
      continue;
    }

    let competitorId: string | null = null;
    if (intel.competitorSlug) {
      const comp = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, intel.competitorSlug)).limit(1);
      if (comp.length > 0) competitorId = comp[0]!.id;
    }

    await db.insert(ciMonitorAlerts).values({
      sourceName: intel.sourceName,
      sourceUrl: intel.sourceUrl,
      headline: intel.headline,
      summary: `[${intel.confidence}] ${intel.summary}`,
      competitorId,
      status: 'pending',
    });
    alertCount++;
    console.log(`  ✅ [${intel.confidence}] ${intel.headline.substring(0, 60)}...`);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`신규 경쟁사: ${newCompetitors.length}개 확인`);
  console.log(`상태 업데이트: ${stageUpdates.length}건`);
  console.log(`Monitor Alerts: ${alertCount}건 삽입`);
  console.log(`총 수집 건수: ${collectedIntel.length}건`);

  process.exit(0);
}

main().catch(err => {
  console.error('업데이트 실패:', err);
  process.exit(1);
});
