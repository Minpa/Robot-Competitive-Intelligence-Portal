/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-29
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-29.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-29)
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
    headline: 'Tesla Q3 2026 실적 발표 — Optimus "최초 양산급(production-quality)" 로봇 생산 공식 확인, 이익 43% 감소 속 투자 지속',
    summary: 'TechCrunch·ManufacturingDive 10/21 보도. Tesla가 Q3 2026 실적 발표에서 Fremont 고용량 라인에서 Optimus "최초 양산급 로봇(first production-quality bots)" 생산을 공식 확인. 주주서한에서 "we have manufactured" 표현 사용. 순이익 43% 감소에도 Optimus 투자는 유지. Musk는 "풀 캐패시티까지 약 1년" 소요 전망, 외부 고객 납품은 2027년 목표. ManufacturingDive는 2027년 출하 시작 예정이라고 보도. Q3 실적 콜에서 공식 언급된 첫 사례로, 기존 2차 매체 보도(DriveTeslaCanada 등)를 Tesla 자체가 확인한 것.',
    sourceName: 'TechCrunch / ManufacturingDive',
    sourceUrl: 'https://techcrunch.com/2026/10/21/tesla-stars-optimus-robot-production-in-california-as-profit-falls-43/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'Boston Dynamics 직원 300+명, ICE Spot "Cerberus" 계약 반대 서명 (10/27) — $1.3M 규모 4대 계약',
    summary: 'Cybernews 10/27 보도. Boston Dynamics 직원 300명 이상이 미국 이민세관집행국(ICE) 대상 Spot 로봇 계약 반대 청원서에 서명. 해당 계약은 $1.3M 규모로 "Cerberus"라 명명된 수정 Spot 로봇 4대 납품 건. 직원들은 "회사의 로봇 윤리 원칙에 위배된다"고 주장. Atlas와 직접 관련은 아니나, BD의 로봇 윤리·규제 논란이 Atlas 상용화 이미지에도 영향 가능. 내부 거버넌스 이슈로 분류.',
    sourceName: 'Cybernews',
    sourceUrl: 'https://cybernews.com/news/boston-dynamics-ice-robot-dogs-deal',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Bloomberg: Unitree(宇树) 주가 10월 +60% 급등, 10/28 장중 +15% — Q3 실적 발표(10/29) 앞두고 랠리 지속',
    summary: 'Bloomberg 10/28 보도. Unitree Robotics(宇树科技) 주가가 10월 한 달간 약 60% 상승, 10/28 장중에만 15% 추가 급등. JPMorgan의 2단계 업그레이드(UW→OW, 목표가 CNY 995)와 10/29 예정된 Q3 실적 발표가 상승 촉매. 중국 로봇 섹터 전체 랠리 동반. 다만 주가는 IPO 후 피크 대비 여전히 55% 하락 상태이며, FCC 금지로 미국 시장 진입 차단 상황은 리스크 요인으로 잔존.',
    sourceName: 'Bloomberg',
    sourceUrl: 'https://bloomberg.com/news/articles/2026-10-28/china-robot-stocks-extend-rally-with-unitree-earnings-in-focus',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'GXO, Digit 배치 NC·TN 2개 시설 추가 확대 — 100,000 토트(tote) 핸들링 마일스톤 달성 후 (10/27)',
    summary: 'TechTimes 10/27·Supply Chain Digital 종합. GXO Logistics가 Agility Robotics Digit을 North Carolina(Statesville)와 Tennessee(Lebanon) 2개 추가 시설에 배치하는 상업 계약 체결. 2027년 초 운영 개시 예정. 기존 시설에서 100,000+ 토트 핸들링 달성 및 약 98% on-task 가동률 기록 후 확대. 초기 Digit 4 배치 후 Digit 5 GA 출시 시 전환 계획. GXO는 기존 Agility의 최대 고객 중 하나로, Amazon·AGCO에 이어 물류·e커머스 시장 확대 가속.',
    sourceName: 'TechTimes / Supply Chain Digital',
    sourceUrl: 'https://www.techtimes.com/articles/329537/20261027/gxo-extends-digit-humanoid-robot-north-carolina-tennessee-after-100000-tote-milestone.htm',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Agility Robotics, Digit 5 온보드 컴퓨트를 NVIDIA IGX Thor로 표준화 (10/23) — 2027 GA 롤아웃 앞두고 확정',
    summary: 'The AI Insider 10/23 보도. Agility Robotics가 차세대 Digit 5의 온보드 컴퓨팅 플랫폼을 NVIDIA IGX Thor로 표준화한다고 발표. NVIDIA가 Digit 5 GA 버전의 독점(exclusive) 온보드 컴퓨트 공급자가 됨. Digit 5는 2027년 상반기 얼리 액세스, 이후 6~9개월에 걸쳐 GA 확대 예정. Salem, Oregon 공장에서 연간 최대 10,000대 생산 용량 확보. $300M+ 다년 주문 확보(계약 마일스톤 조건부).',
    sourceName: 'The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/10/23/agility-robotics-standardizes-digit-5-on-nvidia-igx-thor-ahead-of-2027-rollout/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind, Gemini 4 Argon으로 Apollo에 "Video-to-Sim-to-Real" 학습 시연 (10/22) — 영상 관찰→시뮬레이션→실로봇 전이, 콘홀 7연속 성공',
    summary: 'Robotics & Automation News·Interesting Engineering 10/22 보도. Google DeepMind가 최신 Gemini 4 Argon 모델을 사용하여 Apptronik Apollo 휴머노이드에 새로운 "Video-to-Sim-to-Real" 파이프라인으로 물리적 기술을 전이하는 시연 공개. 사람이 콘홀(cornhole)을 하는 영상을 Argon이 분석→공간 좌표 매핑→전신 관절 동작 계산→시뮬레이션 코드 자율 생성 후 실로봇에 전이. Apollo가 실제 환경에서 7연속 성공. DeepMind는 이 방식이 "기존 수 주 소요 시뮬레이션 작업을 수 시간으로 단축"한다고 설명. Embodied Reasoning(ERQA) 벤치마크 87% 달성. 10/13 Argon 글로벌 출시의 로보틱스 응용 데모.',
    sourceName: 'Robotics & Automation News / Interesting Engineering',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/22/google-deepmind-uses-gemini-4-argon-to-teach-apptroniks-apollo-humanoid-new-skills-from-video/106227/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 미국 얼리 액세스 가정 배송 시작 (10월) — 단, 원격 "Turing" 텔레오퍼레이터 의존 모델 공개돼 논란',
    summary: 'Startup Fortune 10/22·TravTeks 종합. 1X Technologies가 $20,000 NEO 가정용 휴머노이드를 미국 얼리 액세스 고객에게 배송 시작. 그러나 Startup Fortune 보도에 따르면 로봇이 완전 자율이 아닌 원격 "Turing" 오퍼레이터가 카메라를 통해 모든 작업을 제어하는 모델임이 공개됨. 독립적 고객 확인 보도는 아직 없으며(1X 자체 얼리 액세스 프로그램 외), 실제 가정 배치 규모는 불확실. Hayward 공장은 4월부터 풀 생산(연 10,000대 용량). 가격 $20,000(일시불) 또는 $499/월 구독.',
    sourceName: 'Startup Fortune / TravTeks',
    sourceUrl: 'https://startupfortune.com/1x-starts-delivering-its-20000-neo-home-robot-teleoperator-and-all/',
    confidence: 'C',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'IDC: Agibot, H1 2026 글로벌 휴머노이드 출하량 1위 — 8,600+ 대, 시장 점유율 ~35%',
    summary: 'Robotics & Automation News 10/2·Humanoid Guide 종합(IDC 데이터 인용). IDC 데이터에 따르면 Agibot이 2026년 상반기 글로벌 휴머노이드 출하량에서 1위를 기록, 8,600대 이상 출하로 약 35% 시장 점유율. 글로벌 시장 총 출하량은 약 25,000대 수준. Counterpoint는 ~9,700대, SAG는 ~8,400대로 추정하여 조사기관마다 수치 차이 있으나, Agibot 1위는 공통. 누적 생산은 2026년 9월 기준 20,000대 돌파(3월 10,000대, 6월 15,000대). 제품 라인업에 A3 Ultra(174cm, 60kg, 51DOF), X2 Edu, G2 Max 등 다양화.',
    sourceName: 'Robotics & Automation News (IDC) / Humanoid Guide',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 110대 휴머노이드 동시 군무(群舞)로 기네스 세계기록 수립 — 중국 지난(济南)에서 달성 (10/28)',
    summary: 'ColombiaOne 10/28 보도. Agibot의 휴머노이드 로봇 110대가 중국 지난(Jinan)에서 동시 군무를 선보여 "가장 많은 휴머노이드 로봇이 동시에 춤을 춘 기록(most humanoid robots dancing simultaneously)"으로 기네스 세계기록 공식 인증. 이전 기록을 대폭 갱신. Agibot의 대량 생산·배치 역량을 과시하는 마케팅 이벤트 성격이나, 동시 제어 및 동기화 기술력 입증 측면도 있음. 중국 내 휴머노이드 산업 육성 정책과 맞물려 미디어 주목도 높음.',
    sourceName: 'ColombiaOne / Guinness World Records',
    sourceUrl: 'https://colombiaone.com/2026/10/28/chinas-110-dancing-humanoid-robots-set-guinness-record/',
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

export async function insertCiUpdate20261029() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-29) ===\n');

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
        collectedAt: '2026-10-29',
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

insertCiUpdate20261029()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
