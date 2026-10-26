/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-26
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-26.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-26)
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
  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics Atlas 4-finger GR3 핸드 공개 (10/2) — 13 DOF, 촉각 센서 내장, 핀키 제거 설계',
    summary: 'Boston Dynamics가 10/2 Atlas 휴머노이드의 새로운 4-finger GR3 핸드를 공개. 기존 7 DOF에서 13 DOF로 증가 — 엄지 4 DOF, 나머지 3개 손가락 각 3 DOF. 손가락 끝과 손바닥에 압력 기반 촉각 센서 장착. 엔지니어링 팀은 5개 손가락, 2-엄지 레이아웃 등을 테스트한 결과 복잡성 대비 실용성에서 4-finger가 최적이라 결론. 드릴링, 너트 조이기 등 도구 사용 시연. 시뮬레이션 기반 강화학습(sim-to-real)으로 훈련. 양산(mass production) 타겟 설계.',
    sourceName: 'The Robot Report / Korea Herald / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-drops-pinkie-on-new-humanoid-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics Atlas 조립 시간 1일 — 내년 1시간 단축 목표, 프로토타입 운영팀 공개 (10/14)',
    summary: 'Humanoids Daily가 10/14 Boston Dynamics의 프로토타입 운영팀 영상을 보도. 현재 Atlas 1대 조립에 약 1일 소요. 내년(2027년)까지 약 1시간으로 단축 목표 제시. 양산 스케일 확장을 위한 제조 효율화 추진 중. 2026년 전체 배치 물량이 이미 Hyundai RMAC 및 Google DeepMind에 할당 완료된 상황에서 생산 속도 개선은 2027년 추가 고객 대응을 위한 핵심 과제.',
    sourceName: 'Humanoids Daily / Boston Dynamics',
    sourceUrl: 'https://www.humanoidsdaily.com/news/boston-dynamics-atlas-prototype-shop-build-time',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Agility Robotics, Nyobolt 초고속 충전 배터리 파트너십 발표 (10/15) — Digit 5 90분 가동 / 9분 충전, 24시간 20시간+ 운영',
    summary: 'Agility Robotics가 10/15 영국 Nyobolt를 Digit 5의 배터리 기술 파트너로 선정. 90분 런타임에 9분 충전(10:1 비율)으로 24시간 중 20시간+ 운영 가능. Digit 4의 2:1 비율 대비 대폭 개선. Nyobolt는 Symbotic에 이어 두 번째 로보틱스 고객. 배터리 용량 및 사이클 수명 수치는 미공개. 얼리 액세스 고객 배송은 2027 상반기 예정이며 실사용 환경 성능은 미검증.',
    sourceName: 'The Robot Report / Unite.AI / Robotics & Automation News',
    sourceUrl: 'https://www.therobotreport.com/agility-robotics-chooses-nyobolt-ultra-fast-charging-digit-5-humanoid/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC SEC S-4 유효 선언 (10/13) — Churchill Capital Corp XI 합병, 11/2 주주투표 예정, $2.5B 밸류에이션',
    summary: 'SEC가 10/13 Agility Robotics와 Churchill Capital Corp XI의 S-4 등록서류를 유효(effective)로 선언. 11/2 Churchill 주주투표 예정. 프리머니 $2.5B 밸류에이션, "AGLT" 티커로 상장 예정. 총 $620M+ 조달(PIPE $200M, Foxconn 주도). 기존 주주는 180일 락업. 주주 리딤션에 따라 실 조달액 변동 가능. 대만 재경신문(finance.technews.tw) 단일 출처 보도로 SEC 파일링 직접 확인 필요.',
    sourceName: 'Finance TechNews (Taiwan) / KuCoin News / Quartz',
    sourceUrl: 'https://finance.technews.tw/2026/10/14/humanoid-robot-agility-november-listing-sec-filing-effective/',
    confidence: 'B',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics 피츠버그 오피스 확장 발표 (10/21) — 고객 배치 지원 거점 확대',
    summary: 'Agility Robotics가 10/21 피츠버그 사무소 확장을 발표. 증가하는 고객 배치(deployment) 수요를 지원하기 위한 거점 확대. 이미 Toyota Canada, Amazon, AGCO 등 제조·물류 고객이 확보된 상태에서 미국 동부 운영 인프라 강화. Digit 5의 2027년 GA(General Availability) 출시를 앞두고 사전 고객 지원 체계 구축.',
    sourceName: 'Agility Robotics Press Release',
    sourceUrl: 'https://www.agilityrobotics.com/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, F.02 전체 플릿 핀란드 전기로에서 용해 폐기 (10/1) — IP 보호 목적, Arnold Schwarzenegger 제안',
    summary: 'Figure AI가 9/30~10/1 퇴역한 Figure 02 로봇 플릿을 핀란드 Imatra의 75톤 전기 아크로(electric arc furnace)에서 용해 폐기. 커스텀 액추에이터 등 독점 하드웨어 IP 유출 방지 목적. 미국·멕시코 파운드리는 리튬이온 배터리 포함으로 거부, 핀란드에서 진행. 로봇이 스스로 점프하여 투입("self-termination" 시연). 회수 금속으로 한정판 기념품 제작·판매 중. 본사에 소수 보존분 유지. Arnold Schwarzenegger가 영감 제공(Terminator 2 오마주).',
    sourceName: 'Gizmodo / Interesting Engineering / Dexerto',
    sourceUrl: 'https://gizmodo.com/figure-ai-trains-retired-robots-to-dive-into-molten-steel-2000820643',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI, Figure 04 핸드 개발 및 글로벌 기그워커 사전학습 데이터 수집 (10/25) — 인간 손 모방 설계, 머리장착 카메라 일상 촬영',
    summary: 'DigiTimes 10/23~25 칼럼에 따르면 Figure AI가 차세대 Figure 04의 핸드를 인간 손 움직임을 밀접하게 모방(closely mirror)하도록 설계 중. 스킬 트랜스퍼(skill transfer) 효율을 극대화하기 위한 접근. 동시에 전 세계 기그워커(gig worker)들이 머리 장착 카메라로 일상 가사 작업을 촬영하여 사전학습(pretraining) 데이터를 수집하는 파이프라인 운영. 가정 환경 AI 모델 훈련에 실세계 데이터를 대규모로 활용하는 전략.',
    sourceName: 'DigiTimes',
    sourceUrl: 'https://digitimes.com/news/a20261023PD210/physical-ai-robot-robotics-3d-2026.html',
    confidence: 'C',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Unitree 왕싱싱, 2028년까지 휴머노이드 음성 명령 80% 수행 목표 발표 — AI 자가 개선(self-improving) 시스템 개발 중',
    summary: 'The Next Web 보도에 따르면 Unitree 창업자 왕싱싱(Wang Xingxing)이 2026 World Physical AI Conference에서 2028년까지 휴머노이드가 음성 명령(spoken tasks)의 80%를 수행할 수 있을 것이라 전망. "Rehearsal"이라 불리는 AI 자가 개선 시스템을 개발 중 — 시뮬레이션에서 코드를 테스트한 후 실제 로봇에서 시행하는 파이프라인. 현재 Physical AI가 "돌파 징후(signs of being broken through)"를 보이고 있다고 평가.',
    sourceName: 'The Next Web / BigGo Finance',
    sourceUrl: 'https://thenextweb.com/news/unitree-rehearsal-self-improving-robots-2028-breakthrough',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 얼리 액세스 가정 배송 시작 확인 (10/22) — 텔레오퍼레이터 상시 운영, 프라이버시 블러+금지구역 설정',
    summary: 'Startup Fortune 10/22 보도에 따르면 1X가 NEO 얼리 액세스 프로그램을 통해 미국 가정에 배송을 시작. $20,000 또는 $499/월 구독. 텔레오퍼레이터("Turing")가 로봇 카메라를 통해 실시간 원격 제어하며 가사 작업 수행. 구매자는 원격 관찰 동의 필수, 얼굴 블러 및 금지구역(no-go zone) 설정 가능. 독립적으로 검증된 고객 인도 사례는 아직 미확인. Hayward 공장 연 10,000대 용량으로 생산 중, 2027년 말 100,000대/년 확장 목표.',
    sourceName: 'Startup Fortune',
    sourceUrl: 'https://startupfortune.com/1x-starts-delivering-its-20000-neo-home-robot-teleoperator-and-all/',
    confidence: 'C',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 정식 착수 (7/24) — CITIC Securities 스폰서, CICC·Morgan Stanley 공동, HK$40~50B 밸류에이션',
    summary: 'Securities Times 보도에 따르면 Agibot이 7/24 홍콩 IPO 프로세스를 정식 착수. CITIC Securities 스폰서, CICC 및 Morgan Stanley 공동 스폰서로 확정(SCMP 소스). 밸류에이션은 이전 보도에서 HK$40~50B(Reuters)와 $20B/HK$156B(The Standard) 사이에서 차이 존재. 발행 비율 15~25% 예상. IDC 기준 2026 H1 글로벌 출하량 8,600대+(35%), 9월 누적 20,000대 생산 돌파. 2026년 매출 RMB 40억(~$5.6B) 목표. 10/13 프리IPO 라운드(RMB 500억 밸류) 120일 간격 규정으로 2026 내 상장 불확실.',
    sourceName: 'Securities Times / SCMP / Reuters / The Standard (HK)',
    sourceUrl: 'https://www.thestandard.com.hk/finance/article/338188/Chinese-robot-maker-AgiBot-starts-Hong-Kong-IPO-process-Securities-Times-reports',
    confidence: 'B',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik Apollo 2 바이페달·휠 듀얼 구성 공개 + Robot Park 90,000sqft 시설 (6/30) — Apollo 3 2027년 출시 예고',
    summary: 'The Robot Report 보도에 따르면 Apptronik이 6/30 오스틴에서 Apollo 2를 바이페달(bipedal) 및 휠(wheeled) 이중 구성으로 공개. 90,000sqft "Robot Park" 데이터 수집·훈련 시설 동시 개관. Apollo 2는 아직 프리프로덕트(pre-product) 플랫폼 단계이며, 첫 번째 진정한 제품(true product)은 2027년 예정 Apollo 3로 예고. 2월 $520M 시리즈A 확장 라운드($5B 밸류)의 자금으로 시설·R&D 투자 집행 중. Mercedes-Benz, Jabil 기존 파일럿 운영 지속.',
    sourceName: 'The Robot Report / Apptronik',
    sourceUrl: 'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
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

export async function insertCiUpdate20261026() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-26) ===\n');

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
        collectedAt: '2026-10-26',
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

insertCiUpdate20261026()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
