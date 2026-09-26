/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-26
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-26.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-26)
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
    headline: 'Tesla Optimus Gen 3 양산 난관 — 핸드/전완 22 DOF·50 액추에이터 제조 복잡성이 최대 병목',
    summary: '9월 25일 보도에 따르면 Tesla Optimus 생산량이 최근 수개월간 10배 증가했으나, 안정적 대량생산에 어려움을 겪고 있음. Goldman Sachs에 따르면 핸드와 전완부가 "가장 큰 기술적 과제"로, Gen 3 핸드는 22 자유도·50개 액추에이터로 구성되어 제조 복잡성이 급증. 2025년 목표 미달의 3대 원인: (1) 중국 희토류 자석 수출 제한, (2) Gen 3 핸드 재설계, (3) 신규 Tier 1 공급사 인증 지연.',
    sourceName: 'GuruFocus / Yahoo Finance / StoneX',
    sourceUrl: 'https://www.gurufocus.com/news/9097629/teslas-optimus-robot-faces-production-challenges-amid-scaling-efforts',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla 앱에서 Optimus Gen 3 디자인 유출 — 양산형 외관 최초 공개',
    summary: 'Tesla Android 앱 업데이트에서 Optimus Gen 3 양산 디자인 디지털 에셋이 발견. @WholeMars가 최초 발굴. Gen 3 핸드 22 자유도로 인간에 근접한 조작 기능 구현. 내부 Tesla 공장에서 학습·데이터 수집용으로 물리적 배치 중이나, 아직 경제적 생산 작업 수행 단계는 아님.',
    sourceName: 'NotATeslaApp / Electrek',
    sourceUrl: 'https://www.notateslaapp.com/news/4725/tesla-app-leaks-new-optimus-gen-3-robot-design',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics RMAC 공식 개소 (9/22) — Hyundai Georgia Metaplant에서 Atlas 풀스케일 운영 시작',
    summary: '9월 22일 Boston Dynamics가 Hyundai Motor Group Metaplant America(조지아 사바나) 내 RMAC(Robotics Metaplant Application Center) 공식 개소. 6월 파일럿 후 풀스케일 운영 전환. Atlas가 부품 물류·시퀀싱 학습 중이며, 2030년까지 부품 조립으로 확장 예정. Hyundai/Kia 글로벌 공장에 25,000대 배치 계획. 2027년 같은 캠퍼스 내 10배 규모 신규 시설로 이전 예정. 항공우주·반도체·물류 등 타 산업 확장도 논의 중.',
    sourceName: 'Korea Times / Automotive World / TheAIInsider',
    sourceUrl: 'https://theaiinsider.tech/2026/09/22/boston-dynamics-opens-atlas-training-center-at-hyundais-georgia-metaplant/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 누적 생산 1,000대 돌파, 시간당 1대 생산 — 택배 처리 라이브스트림서 인간 대비 98.5% 성능',
    summary: 'Figure 03가 시간당 1대 생산율로 누적 1,000대 이상 생산 달성. BMW Spartanburg 공장에서 Figure 02가 11개월간 X3 30,000대 이상 생산에 기여(1,250시간+ 가동). Figure 03는 거의 1주일간 패키지 처리 라이브스트림에서 인간 대비 98.5% 성능 달성. 가정용 Figure 03 월 $600 리스 프로그램 발표(5월).',
    sourceName: 'Forge Global / RoboZaps / Figure AI',
    sourceUrl: 'https://blog.robozaps.com/b/figure-03-review',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 04 디자인 락 완료, 프리프로덕션 진입 — 창업자 "역대 최대 세대 간 도약"',
    summary: 'Figure AI 창업자 Brett Adcock이 차세대 F.04 휴머노이드 디자인 락(설계 확정)을 발표, 부품 납품·프리프로덕션 단계 진입. Adcock은 F.04가 "회사 역사상 로봇 세대 간 최대 도약"이라 언급, 시스템 엔지니어링 기술이 새로운 수준에 도달. Figure 02→03 → 04로 이어지는 급속 반복 개발 사이클 유지.',
    sourceName: 'AIBase / TrendForce / Figure AI',
    sourceUrl: 'https://news.aibase.com/news/27947',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 신규 배치 확대 — Japan Airlines 하네다 공항·YY Group·美 보안관서 도입',
    summary: 'Unitree G1의 실 배치 사례 확대. Japan Airlines가 하네다 공항에서 수하물 처리 파일럿 진행. YY Group이 시설 청소에 G1 활용. 2026년 7월 미국 보안관서(sheriff\'s department)가 G1 도입. G1 Enterprise 공식 가격 $13,500 (2026년 9월 기준). EDU 에디션은 별도 견적(sales_global@unitree.cc).',
    sourceName: 'TechStoriess / ZMProbots / RoboZaps',
    sourceUrl: 'https://www.techstoriess.com/unitree-g1-enterprise-review-2026-real-price-verdict/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics Digit 5 CEO "고객 3년 피드백 기반 설계" — 안전 장벽 없이 사람 옆에서 작업 가능',
    summary: 'CEO Peggy Johnson이 Digit 5를 "Digit 4의 3년간 고객 현장 피드백을 그대로 반영한 설계"라 발표. 물리적 안전 장벽(울타리) 없이 사람 인근에서 안전하게 작업 가능한 최초의 범용 휴머노이드 목표. 복잡한 작업(장비 적재, 부품 분류, 시퀀싱, 검사) 수행. 더 많은 시설에 자율 로봇 배치를 확대하기 위한 업계 전환점으로 평가.',
    sourceName: 'Bloomberg / Claims Journal / Agility Robotics',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-09-15/agility-robotics-unveils-humanoid-designed-to-work-safely-alongside-humans',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik Apollo 2 공개 — 바이페달+휠 듀얼 구성, LED 표현 얼굴, 음성 대화 기능',
    summary: 'Apptronik이 6월 30일 Austin Robot Park 확장과 함께 Apollo 2를 공식 공개. 바이페달(이족보행)과 휠 베이스 두 가지 구성으로 제공. LED 표현형 입 + 조명·음성·청취 기능으로 자연스러운 인간 상호작용 실현. 데이터 수집·학습 플랫폼으로 설계, 배치를 통한 지속적 학습. Apollo 3(첫 상용 제품)는 2027년 목표, CEO Jeff Cardenas가 "볼륨 주문은 Apollo 3부터"라 명시. 시리즈 A 누적 $935M+.',
    sourceName: 'The Robot Report / Apptronik / RoboZaps',
    sourceUrl: 'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 25 DoF 텐던 구동 핸드 공개 — IP68, ±0.2mm 정밀도, 촉각 슬립 감지, 식품 안전 소재',
    summary: '7월 9일 1X Technologies가 NEO용 25 자유도 텐던 구동 핸드 공개. 22개 완전 액추에이트 관절(손가락+손바닥) + 손목 3축. 독자 준직접 텐던 드라이브(5:1~15:1 기어비), 전 손끝+접촉면 고해상도 촉각 스킨, ±0.2mm 위치 정확도, IP68 방수방진, 식품접촉 안전 소재. 레고 조립, 나사/동전 집기, 전구 교체, USB-C 연결 등 가능. 연간 10,000개 전용 생산 라인 가동 중. 첫 고객 유닛에 탑재 출하.',
    sourceName: 'Robotics & Automation News / Interesting Engineering / 1X',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/17/1x-unveils-25-degree-of-freedom-humanoid-robot-hands-for-neo/103405/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A2 Ultra 기네스 세계 기록 — 휴머노이드 최장 거리 보행 106.286km (쑤저우→상하이 와이탄)',
    summary: 'Agibot A2 Ultra가 "인간형 로봇 최장 거리 보행" 기네스 세계 기록 달성. 쑤저우에서 상하이 와이탄까지 106.286km를 4일간 56시간(17시간 휴식 포함)에 걸쳐 보행. 15회 배터리 핫스왑으로 연속 보행 유지. 이족보행 내구성과 실외 지형 대응력을 실증.',
    sourceName: 'Wikipedia / Facebook TechInnovation / RoboZaps',
    sourceUrl: 'https://en.wikipedia.org/wiki/AgiBot',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 세계 휴머노이드 로봇 게임 메달 1위 — 금 18·은 16·동 12 총 46개, 실전 작업 카테고리 석권',
    summary: '2026년 8월 세계 휴머노이드 로봇 게임(World Humanoid Robot Games)에서 Agibot이 금 18, 은 16, 동 12개 총 46개 메달로 금메달·종합 메달 1위 달성. 소방, 도서관, 물건 집기 등 실전 작업 카테고리에서 양산 모델로 참가해 우승. 6월 기준 누적 15,000번째 로봇 생산 라인 완성. IPO 서류 상반기 제출, Q3 상장 목표.',
    sourceName: 'Robotics & Automation News / RobotTesters',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/08/27/agibot-wins-46-medals-to-top-world-humanoid-robot-games-on-debut/104508/',
    confidence: 'A',
    category: 'production',
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

export async function insertCiUpdate20260926() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-26) ===\n');

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
        collectedAt: '2026-09-26',
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

insertCiUpdate20260926()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
