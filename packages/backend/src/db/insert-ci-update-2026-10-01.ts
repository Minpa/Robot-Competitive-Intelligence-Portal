/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-01
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-01.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-01)
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
    headline: 'Tesla Fremont Model S/X 라인 46일 만에 철거 완료 — Optimus 전용 생산라인 전환, 연 100만대 설계 용량',
    summary: 'Tesla가 Fremont 공장의 Model S/X 생산라인을 46일 만에 철거 완료하고 Optimus 휴머노이드 로봇 전용 생산라인으로 전환. 장기 설계 용량 연간 100만대. Musk는 약 10,000개 고유 부품과 미확립 서플라이 체인으로 인해 초기 생산이 "상당히 느릴 것"이라 언급. 초기 유닛은 Tesla 내부 공장 활용 후 제한적 외부 배치 예정.',
    sourceName: 'Yahoo Finance / BeginnersinAI',
    sourceUrl: 'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla 텍사스 신규 공장 발표 — Optimus 1,000만대 생산 목표, 전기차→로봇 전환 가속',
    summary: 'Tesla가 텍사스에 Optimus 전용 신규 공장 건설을 발표, 장기 목표 1,000만대 생산. Fremont(100만대 용량)에 이어 두 번째 Optimus 생산거점. 2026년 9월 기준 주간 약 1,000대(연산 ~52,000대) 생산 중이며, 서플라이체인 보고서 기준 2026년 약 15,000대 빌드 예상. Optimus V3(Gen 3)은 50개 액추에이터, 22 DOF 핸드, ~2.3kWh 배터리, AI5 칩, Grok 음성 탑재.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI F.02 플릿 디커미션 (9/30) — 핀란드 제련소에서 용강 투입 방식 폐기, BMW 30,000대 생산 기여 후 퇴역',
    summary: 'Figure AI가 9월 30일 F.02 플릿을 공식 디커미션. BMW Spartanburg 공장에서 약 1년간 30,000대 BMW X3 생산에 기여하고 90,000개 이상 시트 메탈 부품을 적재(5mm 정밀도). 퇴역 F.02 유닛들은 핀란드 Imatra 파운드리의 75톤 전기 아크로에 자율적으로 도약하여 용강 투입 방식으로 폐기. Figure 03으로의 세대 전환 완료 상징.',
    sourceName: 'Interesting Engineering / Figure AI',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/humanoid-robot-decommissioned-molten-steel',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 생산율 24배 향상 — 시간당 1대, 120일 내 350대+ 납품, 1,000대 돌파 임박',
    summary: 'Figure AI가 Figure 03 생산율을 일 1대에서 시간당 1대로 24배 향상 달성, 120일 내 350대 이상 납품. BotQ 캘리포니아 공장 기준 2026년 5월부터 시간당 1대 생산 유지. Figure 03에는 NVIDIA Jetson 기반 커스텀 온보드 추론 칩이 탑재되어 12개 스테레오 깊이 카메라와 2개 LiDAR를 클라우드 없이 실시간 처리. 누적 1,000대 마일스톤 임박.',
    sourceName: 'Figure AI / NVIDIA / Axis Intelligence',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree G1+ 공식 출시 (9월) — 목 2 DOF 추가, 어깨·허리 토크 110% 향상, 발열 72% 감소',
    summary: 'Unitree가 9월 G1+ 출시. 6대 업그레이드: 유연한 목(2 DOF 추가), 어깨·허리 관절 피크 토크 110% 향상 및 발열 72% 감소, 모션 퍼포먼스·인지·인터랙션·지능 경험 전면 개선. 가격 95,000위안(HK$111,000 세금 포함). G1이 글로벌 저가 휴머노이드 시장의 기준점으로 자리매김한 가운데 G1+로 성능 격차 확대.',
    sourceName: 'The Standard HK / RoboZaps',
    sourceUrl: 'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: '글로벌 휴머노이드 로봇 출하량 432% 급증 (2026 H1) — Agibot 1위, Unitree 31% 점유율 유지',
    summary: '2026년 상반기 글로벌 휴머노이드 로봇 출하량이 전년 대비 432% 급증. Agibot이 Unitree를 제치고 출하량 기준 글로벌 1위로 부상. Unitree는 170% 성장(약 5,900대)으로 31% 글로벌 점유율 유지. Morgan Stanley 2026년 중국 판매 전망 28,000대 재확인. Unitree H2 Plus가 Toborlife AI를 통해 9월 24일부터 북미 시장 공급 개시.',
    sourceName: 'News Today World / EIN Presswire',
    sourceUrl: 'https://newstodayworld.org/breaking-news/2026/09/30/humanoid-robot-shipments-surge-432-in-six-months',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 합병으로 상장 — Churchill Capital XI과 $2.5B 기업가치, Foxconn 주도 $200M PIPE',
    summary: 'Agility Robotics가 Churchill Capital Corp XI(Nasdaq: CCXI)과의 SPAC 합병으로 상장 추진 발표. 기업가치 $2.5B, 약 $620M 자본 조달 예정. Foxconn 주도 $200M PIPE 추가 조달. Amazon, NVIDIA, SoftBank 등 기존 투자자 참여. Digit 5에 대한 $300M+ 멀티연도 주문(1,000대 RaaS 3년 계약 기반) 확보. 10월 6일 애널리스트·투자자 데이 개최 예정.',
    sourceName: 'GeekWire / Yahoo Finance / GCN',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Digit 5 협력안전(Cooperative Safety) 시스템 — 케이지 없이 인간 근접 작업, CE 마크 취득 후 EU/UK 확장',
    summary: 'Digit 5는 Agility의 최초 협력안전 설계 휴머노이드. 독자 AI 알고리즘과 다중 센서로 사람을 지속 모니터링하며 회피·정지·착석 자세로 대응. 물리적 안전 장벽(케이지) 없이 인간과 근접 작업 가능. CE 마크 및 추가 규제 인증 취득 후 EU·UK 시장 최초 상용 배치 예정. 제조·물류·창고 분야 타겟.',
    sourceName: 'Forbes / The Robot Report / GCN',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $935M 마감 — QIA·John Deere·AT&T Ventures 신규 참여, 밸류에이션 $5.3B',
    summary: 'Apptronik이 Series A 확장 라운드 $520M을 마감하여 총 Series A 규모 $935M 달성. B Capital, Google, Mercedes-Benz, PEAK6 기존 투자자 주도, QIA(카타르투자청), John Deere, AT&T Ventures 신규 참여. 포스트머니 밸류에이션 약 $5.3B(초기 Series A 대비 3배). 자금을 Apollo 양산 확대, 글로벌 파일럿 배치 네트워크 확장, 로봇 트레이닝 시설 구축에 투입.',
    sourceName: 'CNBC / Apptronik / MLQ.ai',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik Robot Park 90,000sqft 개소 + Google DeepMind Gemini Robotics 2 Apollo 2에서 시연',
    summary: 'Apptronik이 오스틴에 90,000sqft Robot Park를 개소, Apollo 2 플릿의 대규모 데이터 수집·훈련 시설로 운영. 글로벌 고객·파트너 사이트에 추가 Robot Park 확장 계획. Google DeepMind가 7월 30일 Gemini Robotics 2를 공개하며 전신 제어 데모를 Boston Dynamics Atlas 대신 Apollo 2에서 시연. Apollo 3를 첫 진정한 상용 제품으로 포지셔닝, 1년 내 출시 예정.',
    sourceName: 'Let\'s Data Science / BigGo Finance / Apptronik',
    sourceUrl: 'https://apptronik.com/news-collection/apptronik-and-jabil-collaborate-to-scale-production',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X–EQT 전략 파트너십 — 300+ 포트폴리오사에 10,000대 NEO 배치 (2026-2030), B2B 채널 확보',
    summary: '1X Technologies와 EQT(글로벌 PE, 1X 투자자)가 전략 파트너십을 발표. EQT 300+ 포트폴리오 기업에 최대 10,000대 NEO 로봇을 2026-2030년에 걸쳐 배치. 제조, 물류, 창고, 의료 등 실환경 타겟. 직접 소비자 판매(사전주문 10,000대 완판, $20,000/대 또는 $499/월)에 더해 B2B 엔터프라이즈 채널 확보로 월드 모델 학습 데이터 확대 기반 마련.',
    sourceName: 'Interesting Engineering / RoboHuman',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/1x-to-deploy-humanoid-robots-for-warehouses',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X World Model 공개 — 14B 파라미터, 비디오 프리트레인 + 역동역학 모델, 제로샷 태스크 일반화',
    summary: '1X Technologies가 1X World Model(WM)을 공개. 14B 파라미터 비디오 프리트레인 시스템으로, 텍스트+시작 프레임으로부터 미래 비디오 프레임을 예측한 뒤 약 400시간 로봇 데이터로 학습된 역동역학 모델(Inverse Dynamics Model)이 예측된 미래를 실행 가능한 액션 궤적으로 변환. 사전 학습 없는 새로운 작업에도 일반화 가능. NEO의 가정용 범용 로봇 비전을 뒷받침하는 핵심 AI 아키텍처.',
    sourceName: 'Sacra / TNW / eWeek',
    sourceUrl: 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 글로벌 출하량 1위 확정 — 2025년 5,168대(39% 점유율), 2026년 15,000대 마일스톤 달성',
    summary: 'Omdia 조사 기준 Agibot이 2025년 글로벌 휴머노이드 로봇 출하량 1위(5,168대, 39% 점유율)를 확정. 2026년 9월 15,000번째 로봇 생산 마일스톤 달성(이전 9/30 업데이트의 20,000번째는 9/24 Chimelong 배치와 동시). 출하 실적에서 지속 생산·신뢰 배송·실환경 배치 역량으로 리더십 확장. Unitree를 제치고 양적 선두 달성.',
    sourceName: 'Omdia / Pandaily / Wikipedia',
    sourceUrl: 'https://pandaily.com/agibot-20000th-robot-expedition-a3-ultra-chimelong-delivery',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot G2 Max 산업용 휴머노이드 및 A3 Ultra 공개 (WAIC 2026) — 고정밀 제조 특화',
    summary: 'Agibot이 WAIC 2026에서 G2 Max(산업용 고정밀 제조 특화 휴머노이드), A3 Ultra(174cm, 60kg, 51 DOF, 3D LiDAR·RGB-D·GPS/RTK/UWB), X2 Edu(교육용), OmniHand 3 Ultra-M(로봇 핸드)을 공개. G2 Max는 스마트 매뉴팩처링의 고정밀 조립·검사·QC 작업에 최적화. A3 Ultra의 360도 인지·융합 포지셔닝·20 DOF 옴니디렉셔널 촉각 핸드가 복합 환경 적응력을 대폭 향상.',
    sourceName: 'Interesting Engineering / Agibot',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robot-smart-manufacturing',
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

export async function insertCiUpdate20261001() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-01) ===\n');

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
        collectedAt: '2026-10-01',
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

insertCiUpdate20261001()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
