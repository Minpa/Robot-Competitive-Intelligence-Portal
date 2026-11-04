/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-04
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-04.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-04)
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
    headline: 'Musk, 12월 Optimus 소비자 예약 개시 루머 직접 부인 — X에서 "No" 답변 (10/30)',
    summary:
      'SF Standard가 12월 Humanoids Summit 전후 Optimus 소비자 예약 개시를 보도한 직후, Musk가 X에서 "No"라고 직접 답변(10/30 3:08PM PT). Tesla는 공식 주문 페이지·예약 보증금·소비자 가격을 공개하지 않은 상태. 외부 고객 인도는 2027년 말 전망 유지. 애널리스트들은 초기 물량 대부분이 기업용이며, 가정용 실제 인도는 2028~2029년으로 전망.',
    sourceName: 'Tesla North / SF Standard / AI Weekly',
    sourceUrl: 'https://teslanorth.com/2026/10/30/elon-optimus-orders-december/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Giga Texas Optimus 전용 공장 건설 착공 확인 — 11/2 항공 촬영서 철골 구조물 확인, 연 1,000만대 설계 용량',
    summary:
      'Giga Texas 부지에 Optimus 전용 생산 공장 건설이 진행 중. 11월 2일 항공 촬영에서 철골 프레임이 올라가는 모습이 포착됨. 2차 라인은 연간 1,000만대 규모로 설계 중. Fremont의 기존 라인(연 100만대 설계 용량)과 별도로, 장기적으로 대규모 양산 체제를 구축하려는 전략. 현재 Fremont에서 주당 수백대 수준의 초기 생산 중이며, 2026년 말까지 주 1,000대 목표.',
    sourceName: 'Basenor / Tech-Insider / Shattered.io',
    sourceUrl: 'https://basenor.com/blogs/news/giga-texas-optimus-factory-6-details-that-matter',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics, Atlas용 신규 13-DOF 4핑거 손 공개 — 직접 구동 방식, 도구 사용·물체 내 재방향 지원',
    summary:
      'Boston Dynamics가 10월 초 Atlas 휴머노이드용 신형 4핑거 손을 공개. 기존 7-DOF에서 13-DOF로 자유도 대폭 증가. 직접 구동(direct-actuated) 방식으로 양산 설계 최적화. 물체 내 재방향(in-hand reorientation), 핀치·삼지 그립, 미끄러짐 복원, 드릴 등 도구 사용 시연. 5번째 손가락(새끼)을 제거하고 4핑거로 최적화. sim2real 전이학습 및 강화학습용으로 설계됨. 기존 손과 유사한 파지력 유지.',
    sourceName: 'The Robot Report / Robotics 24/7 / Interesting Engineering',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics, Hyundai RMAC(조지아)에서 Atlas 훈련 프로그램 가동 — 향후 25,000대 Hyundai/Kia 글로벌 배치 계획',
    summary:
      'Boston Dynamics가 Hyundai Motor Group의 Metaplant America(조지아 Savannah 인근) 내 Robotics Metaplant Application Center(RMAC)에서 전기식 Atlas 로봇 훈련 프로그램을 시작. 향후 Hyundai 및 Kia 글로벌 사업장에 25,000대 Atlas 배치 계획. 2027년에는 현 시설 대비 10배 규모의 새 훈련 빌딩으로 이전 예정. 현재 Hyundai와 Google DeepMind가 첫 배치 대상이며, 연 30,000대 생산 체제 구축 목표.',
    sourceName: 'IMechE / TechRadar / Forbes',
    sourceUrl: 'https://www.techradar.com/ai-platforms-assistants/boston-dynamics-atlas-humanoid-robot-is-now-a-product-and-heading-to-factories-in-2028',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 신규 생산 로봇 BotQ 공장에서 보행 퇴장 영상 공개 (11/3) — 생산율 시간당 1대, 누적 1,000대 돌파',
    summary:
      'Figure AI가 11/3 BotQ 공장에서 새로 제조된 Figure 03 로봇들이 보행으로 퇴장하는 영상을 공개. 창업자 Brett Adcock이 "신규 제조 Figure 03"라고 설명. BotQ는 350대+ 생산 후 시간당 1대 생산 사이클 달성(120일 내 일 1대→시간 1대, 24배 개선). 7월 기준 누적 1,000대 돌파 마일스톤 달성. 다만 현재 외부 고객 배치 규모와 실가동 수치는 미공개.',
    sourceName: 'eWeek / Interesting Engineering / Figure AI Blog',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure, Helix System 0 AI 업그레이드 — 온보드 스테레오 카메라 기반 3D 공간 인식 통합',
    summary:
      'Figure AI가 Helix System 0 모델을 업그레이드하여 온보드 스테레오 카메라에서 RGB 이미지를 입력받아 주변 환경의 3D 공간 표현으로 변환하는 시각 입력 통합 기능 추가. 5월에는 24시간 연속 자율 창고 패키지 분류 테스트를 완료한 바 있음. Figure 04(차세대) 개발도 진행 중.',
    sourceName: 'eWeek / Fox News / Figure AI',
    sourceUrl: 'https://www.figure.ai/news/introducing-figure-03',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility, Digit 5 출시 후 $300M+ 다년 계약 확보 — GXO 확장(NC·TN 2개 창고), 30+ 기업 고객 파이프라인',
    summary:
      'Agility가 Digit 5(9/15 출시) 기반 $300M 이상의 확정 다년 계약을 공개. GXO와의 협력이 North Carolina Statesville·Tennessee Lebanon 2개 미국 창고로 확장되며, Digit 4에서 시작해 Digit 5로 전환 예정. 30개 이상 기업이 도입을 검토 중. AGCO는 2027년 Kansas Hesston 공장에서 Digit 파일럿 예정, Toyota Motor Manufacturing Canada는 파일럿 후 정식 계약 체결. Digit 5는 배터리 런투차지 비율 10:1(Digit 4의 2:1 대비 5배 개선). FORT Robotics와 안전 아키텍처 MOU 체결(10월).',
    sourceName: 'Robotics & Automation News / Forbes / Agility Press',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/02/agility-robotics-says-more-than-30-companies-considering-digit-humanoid-robot/106595/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik, Apollo 2 공개 및 Robot Park 훈련 시설 오픈 — 이족·바퀴형 듀얼 버전, Google DeepMind Gemini Robotics 데이터 연동',
    summary:
      'Apptronik이 7월 1일 Austin에 90,000 sqft Robot Park(데이터 수집·훈련 시설)을 오픈하고 Apollo 2를 이족 보행형 및 바퀴형 두 가지 버전으로 공개. Apollo 2에서 수집된 데이터는 Google DeepMind의 Gemini Robotics 기초 모델 학습에 활용. 차기 상용 제품 Apollo 3 개발에 반영. Jabil이 글로벌 양산 파트너로서 생산·테스트 담당. Mercedes-Benz 공장 배치가 최초 상용 배치 사례. Series A 누적 $935M+ 조달.',
    sourceName: 'eWeek / The Robot Report / Robotics & Automation News',
    sourceUrl: 'https://www.eweek.com/news/apptronik-robot-park-apollo-2-humanoid-robot/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 사전주문 5일 만에 10,000대 매진 ($20,000/대) — 텔레오퍼레이션 공개에도 불구, EQT 파트너십 10,000대 계약 별도',
    summary:
      '1X Technologies가 NEO 사전주문을 개시한 후 5일 만에 약 10,000대가 매진(대당 $20,000). 원격 VR 오퍼레이터가 상당 부분 작업을 수행한다는 텔레오퍼레이션 의존 사실이 공개된 이후에도 주문이 유지됨. 별도로 EQT와 전략적 파트너십을 체결하여 2026~2030년간 EQT 글로벌 포트폴리오 기업에 최대 10,000대 배치 계약. 4월 풀스케일 생산 개시. 2027년까지 100,000대 생산 목표. 미국 우선 배송 후 2027년부터 해외 시장 확대 계획.',
    sourceName: 'Startup Fortune / BusinessWire / Forbes',
    sourceUrl: 'https://startupfortune.com/1x-neo-robot-sells-out-preorders-even-after-teleoperation-reveal/',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2-X 보안·긴급대응 휴머노이드 출시 — 다리 관절 360 N·m, 8시간 연속 운용, G1 가격 $13,500으로 인하',
    summary:
      'Unitree가 보안 및 긴급대응 특화 휴머노이드 H2-X를 공개. 다리 관절 토크 360 N·m, 8시간 연속 가동 성능. 동시에 G1 세전 가격을 $16,000에서 $13,500으로 인하. 창업자 Wang Xingxing에 따르면 G1 누적 생산량 10,000~20,000대. 한편 H1은 공식 라인업에서 $90,000 문의가로만 유지되며, H1-2 리스팅은 사실상 제거. 2025년 보안 취약점(Go2/B2/G1/H1 대상) 이후 H1 관련 공식 패치 발표는 미확인.',
    sourceName: 'Eyoubot / Time / RoboZaps',
    sourceUrl: 'https://eyoubot.com/en/industry-news/unitree-h2x-launch-g1-production-milestone',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'IDC: AGIBOT, 2026 H1 글로벌 휴머노이드 출하량 1위 — 8,600대 출하, 시장점유율 약 35%, 글로벌 총 출하 약 25,000대',
    summary:
      'IDC 데이터에 따르면 AGIBOT가 2026년 상반기 글로벌 휴머노이드 로봇 출하량 1위를 기록. 약 8,600대를 출하하여 약 35% 시장점유율 확보. 글로벌 총 출하량은 약 25,000대 수준으로 접근. 2026년 9월 기준 누적 생산량 20,000대 돌파 후, 10/29 Innovation Day에서 15,000대로 재확인(집계 기준 차이 가능). 6일간 Longcheer Technology 태블릿 공장 라이브스트림에서 17,625대 태블릿 생산 시연(6월).',
    sourceName: 'Robotics & Automation News / IDC / PR Newswire',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'AGIBOT Innovation Day: Worken 생산성 프레임워크·Link-U OS 1.0 발표 — 업계 최초 체화지능 전용 OS, 연말까지 완전 오픈소스화',
    summary:
      'AGIBOT Innovation Day 2026(10/29)에서 Worken 생산성 프레임워크를 공개. 로봇의 실효 작업량을 정량화하여 ROI 평가·산출량 기반 가격 책정 지원. 동시에 업계 최초 체화지능 전용 운영체제 Link-U OS 1.0 발표. OpenAtom Foundation과 협력하여 2026년 말까지 완전 오픈소스화 계획. 신규 모델 GO-3 Preview, WITA-OMNI, OmniHand 3 Ultra와 3세대 AHA3 플랫폼도 함께 공개.',
    sourceName: 'Counterpoint Research / The Robot Report / AGIBOT Press',
    sourceUrl: 'https://counterpointresearch.com/en/insights/agibot-unveils-worken-productivity-framework-and-new-robot-platforms',
    confidence: 'A',
    category: 'tech_spec',
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

export async function insertCiUpdate20261104() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-04) ===\n');

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
        collectedAt: '2026-11-04',
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

insertCiUpdate20261104()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
