/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-20
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-20.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-20)
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
    headline: 'Musk, TomorrowX Summit(11/18-19)에서 Optimus 인터랙티브 데모 "1-2개월 내" 공개 예고 — 텔레오퍼레이션 아닌 "자율성 진정성" 강조',
    summary:
      '2026년 11월 18-19일 텍사스 오스틴 TomorrowX Summit에서 Musk가 Optimus 로봇의 인터랙티브 데모를 1-2개월 내 공개하겠다고 발표. "백엔드 텔레오퍼레이션에 의존하지 않는 진정한 자율성(authenticity)"을 보여주겠다고 강조. GuruFocus, Basenor, Longbridge 등 복수 매체 보도. 데모 정확한 일정·장소는 미확정.',
    sourceName: 'GuruFocus / Basenor / Longbridge',
    sourceUrl: 'https://www.gurufocus.com/news/9210756/elon-musk-unveils-teslas-upcoming-optimus-robot-demonstration',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla, Optimus 판매 대신 렌탈 모델 채택 전망 — Baron Investment Conference에서 Musk "초기 $30K, 향후 $20K까지 하락" 언급',
    summary:
      'Baron Investment Conference에서 Musk가 Tesla Optimus를 소비자에게 판매 대신 렌탈로 제공할 가능성이 높다고 언급. 로봇 1대당 비용은 초기 약 $30,000에서 $20,000까지 하락할 것으로 전망. 렌탈 가격은 미공개. 광산·제련 등 극한 환경이 Optimus 초기 유망 시장이라고 별도 인터뷰에서 언급. NotATeslaApp, BlackScarab.ai 보도.',
    sourceName: 'NotATeslaApp / BlackScarab.ai',
    sourceUrl: 'https://www.notateslaapp.com/news/4959/musk-tesla-will-rent-optimus-robots-instead-of-selling-them',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics, GlobalFoundries와 반도체 팹 Atlas 테스트 계약 체결 (11/18) — 2027년 초 주요 팹 현장 투입 예정',
    summary:
      '2026년 11월 18일 UPI, TechTimes, Kantan News 등 보도. Hyundai 산하 Boston Dynamics가 GlobalFoundries 반도체 팹에서 Atlas 휴머노이드 로봇 테스트를 시작한다고 발표. 현장 테스트는 2027년 초 주요 GlobalFoundries 시설에서 진행 예정. 구체적 작업 내용, 투입 팹 위치, 로봇 대수는 미공개. Atlas의 자동차(Hyundai) 외 산업으로의 첫 공식 확장 사례.',
    sourceName: 'UPI / TechTimes / Kantan News',
    sourceUrl: 'https://www.upi.com/Top_News/World-News/2026/11/18/boston-dynamics-atlas-robot-spot-globalfoundries/9031795035990/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 바퀴형 변형 360도 스핀 점프 영상 공개 (11/9-10) — 전신 제어(whole-body control) 연구 플랫폼, 상용화 비계획',
    summary:
      '2026년 11월 9-10일 Boston Dynamics가 Atlas 휴머노이드에 바퀴를 장착한 연구 플랫폼 영상 공개. Korea Times, The Robot Report 보도. 로봇이 바퀴 주행 중 360도 스핀 점프를 수행하는 고난도 전신 제어 시연. Boston Dynamics는 "실험적 연구 플랫폼이며 상용화 계획 없음"을 명시. Atlas의 이족/바퀴 하이브리드 로코모션 R&D 역량을 보여주는 사례.',
    sourceName: 'Korea Times / The Robot Report',
    sourceUrl: 'https://www.koreatimes.co.kr/business/tech-science/20261110/boston-dynamics-atlas-robot-pulls-off-360-degree-spinning-jump-on-wheels-instead-of-feet',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure CEO Brett Adcock: "6개월 내 모든 가정에서 Figure 로봇 작동 가능" 목표 (11/17 팟캐스트) — Figure 04 디자인 완료',
    summary:
      '2026년 11월 17일 Humanoids Daily 보도. Figure AI CEO Brett Adcock이 팟캐스트에서 "향후 6개월 내, 어쩌면 더 빠르게" Figure 로봇이 모든 가정에서 수시간 연속 가사를 수행할 수 있기를 희망한다고 발언. Forbes(11/6) 올핸즈 미팅 취재에 따르면 차세대 Figure 04 디자인이 완료됨. Figure 02→03 비용 90%+ 절감 달성. BotQ 공장 누적 1,000대+ 생산, 현재 시간당 1대 생산률. Catalyst Brands 리테일 그룹에도 Figure 03 배치 중.',
    sourceName: 'Humanoids Daily / Forbes',
    sourceUrl: 'https://humanoidsdaily.com/news/brett-adcock-moonshots-helix-3-homes-six-months',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, AGCO 농기계 공장(캔자스 Hesston) Digit 파일럿 계약 체결 — 2027년부터 부품 핸들링 작업 투입',
    summary:
      'Robotics & Automation News(11/2) 보도. 미국 농기계 대기업 AGCO가 캔자스주 Hesston 공장에서 Digit 로봇 파일럿을 계약. 2027년부터 농기계 생산 라인의 부품 핸들링 작업에 Digit을 투입할 예정. Agility는 현재 30개 이상 기업과 Digit 도입 논의 중. GXO 조지아 사이트에서 10만 개+ 토트 이동 실적이 신규 고객 확보의 근거가 되고 있음. 물류 외 제조 분야로의 확장 사례.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/02/agility-robotics-says-more-than-30-companies-considering-digit-humanoid-robot/106595/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'GXO Logistics, Apptronik Apollo 최대 1,000대 도입 LOI 체결 (11/12) — 4년간 RaaS 모델, 2027년 말 북미 배치 시작',
    summary:
      '2026년 11월 12일 GlobeNewsWire 공식 보도. GXO Logistics와 Apptronik이 최대 1,000대 Apollo 휴머노이드 도입을 위한 LOI(Letter of Intent) 체결. 4년간 RaaS(Robotics-as-a-Service) 모델로 운영하며 2027년 말 북미 창고부터 배치 시작 예정. 도입 규모는 생산성·안전·운영 목표 달성 여부에 따라 결정. Robotics & Automation News, Humanoids Daily, Supply Chain Digital 등 복수 매체 보도.',
    sourceName: 'GlobeNewsWire / Robotics & Automation News / Humanoids Daily',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/11/12/3401413/0/en/gxo-and-apptronik-expand-partnership-to-scale-humanoid-deployment.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind Gemini Robotics 2.5 발표(11/10): Apollo 2 Mercedes-Benz 라인 자동차 키팅 작업 96% 성공률 시연',
    summary:
      '2026년 11월 10일 Robotics & Automation News 보도. Google DeepMind가 Gemini Robotics 2.5를 발표하면서 Apptronik Apollo 2가 Mercedes-Benz 독일·헝가리 공장에서 자동차 부품 키팅(kitting) 작업을 수행하는 영상 공개. 보고된 성공률 96%. DeepMind의 최신 로보틱스 AI가 Apollo 2 하드웨어와 통합되어 산업 환경에서의 정밀 조작 능력을 입증. Apptronik-DeepMind 기술 파트너십 심화의 증거.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/15/google-deepmind-launches-gemini-robotics-2-5-with-improved-dexterity-and-industrial-capabilities/107186',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'SoftBank, 1X Technologies 과반 지분 인수 $6B 밸류에이션 협상 중 — 작년 $10B 목표 대비 대폭 할인',
    summary:
      'Startup Fortune(11/18) 보도. SoftBank가 1X Technologies의 과반 지분(majority stake)을 $6B 밸류에이션으로 인수하는 협상을 진행 중. 1X가 작년 목표로 했던 $10B 대비 40% 할인. OpenAI가 초기 투자자였으며 NEO 소비자 로봇 사업이 핵심 자산. 사전주문 10,000대($20K/대)가 5일 만에 매진된 실적이 협상 근거로 작용. 단일 출처 보도로 교차 확인 필요.',
    sourceName: 'Startup Fortune',
    sourceUrl: 'https://startupfortune.com/1x-neo-robot-sells-out-preorders-even-after-teleoperation-reveal/',
    confidence: 'C',
    category: 'funding',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X, NEO 개발자 플랫폼 가속 출시 — 미국 중국 휴머노이드 제재 맞물려 대안 연구 플랫폼 포지셔닝',
    summary:
      'Humanoids Daily 보도. 1X Technologies가 NEO 개발자 플랫폼을 가속화하여 연구자·개발자에게 NEO를 대안 연구 플랫폼으로 제공할 계획 발표. 미국의 중국 휴머노이드 로봇 관련 조치(Unitree DoD 1260H 목록 등)가 배경으로, 서방 연구기관에 중국산 아닌 대안 플랫폼 필요성 대두. 신규 CFO Bill Nash, VP Engineering Tom Sanocki 영입으로 소프트웨어·재무 역량 강화. 2026년 말 미국 소비자 배송 타임라인은 유지.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/companies/1x-technologies/news',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 상장 후 첫 실적: R&D 비용 250% 급증 — STAR Market(688836) 상장사로서 휴머노이드 AI 투자 가속',
    summary:
      'Seoul Economic Daily(11/5) 보도. Unitree Robotics가 2026년 8월 19일 상하이 STAR Market(코드 688836)에 상장한 후 첫 실적 발표에서 R&D 비용이 250% 증가한 것으로 확인. 중국 A주 최초의 순수 휴머노이드 로봇 상장사. 2026년 7월 기준 약 18,000대 이족보행 로봇(G1, H1, H2, R1) 누적 생산. SemiAnalysis 추정 G1 BOM $8,976. 태산 등반 과열 사건(11/2)과 함께 기술적 한계와 공격적 투자 사이의 균형이 과제.',
    sourceName: 'Seoul Economic Daily / SemiAnalysis',
    sourceUrl: 'https://en.sedaily.com/international/2026/11/05/unitree-robot-overheats-on-mount-tai-climb-carried-down-on',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, Web Summit 2026 리스본에서 9대 로봇 군무 시연 — 글로벌 테크 컨퍼런스 휴머노이드 최대 규모 퍼포먼스',
    summary:
      'Foro3D/Web Summit 보도. 2026년 11월 Web Summit(리스본) MEO Arena에서 AgiBot(智元机器人)과 Galbot이 휴머노이드 로봇 쇼케이스 진행. AgiBot은 9대 로봇으로 동기화 군무(synchronized choreography)를 선보이며 유럽 시장 진출 의지 표명. 글로벌 주요 테크 컨퍼런스에서 휴머노이드 로봇이 중심 프로그램으로 등장한 사례. AgiBot 누적 범용 체화지능 로봇 20,000대 생산 돌파도 별도 확인.',
    sourceName: 'Foro3D / Web Summit / AgiBot Official',
    sourceUrl: 'https://foro3d.com/en/2026/noviembre/agibot-y-galbot-llevan-la-robotica-humanoide-al-centro-del-web-summit.html',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot G2 로봇 6대, 24시간 편의점 무인 운영 라이브 데모 (11/2-3) — 상품 진열·재고 관리·고객 응대 시나리오 실증',
    summary:
      'Retail Customer Experience 보도. AgiBot이 2026년 11월 2-3일 24시간 편의점 운영 라이브스트림 데모를 실시. G2 로봇 6대가 상품 진열, 재고 관리, 고객 응대 등 리테일 운영 시나리오를 실시간 시연. 제조·물류 중심이던 AgiBot의 서비스업 확장 시도. APEC China 2026(선전) 직전 타이밍으로 글로벌 시장 어필 의도.',
    sourceName: 'Retail Customer Experience',
    sourceUrl: 'https://www.retailcustomerexperience.com/news/agibot-testing-6-g2-robots-in-a-24-hour-c-store-demo/',
    confidence: 'B',
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

export async function insertCiUpdate20261120() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-20) ===\n');

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
        collectedAt: '2026-11-20',
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

insertCiUpdate20261120()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
