/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-20
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-20.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-20)
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
    headline: 'Tesla Optimus 주간 수백 대 생산 도달 — 연말 주 1,000대 목표, 핸드 공급망·일반화 AI 난제 지속',
    summary: 'The Information 보도에 따르면 Tesla가 Fremont에서 주간 수백 대(Q2 대비 수십 대에서 급증) Optimus를 생산 중이며, 연말까지 주 1,000대(연간 ~52,000대), 장기 20,000대 목표. 그러나 핸드 부품 공급업체가 생산 속도를 맞추지 못하고 있으며, 대부분의 유닛은 내부 테스트·데이터 수집용으로 활용 중. AI 일반화(generalization) 문제가 미해결 — 로봇이 새로운 작업에 적응하는 능력이 아직 부족. JPMorgan 미팅에서 외부 판매는 2027년 하반기 이후 가능할 것이라 시사.',
    sourceName: 'Electrek / The Information / Futurism',
    sourceUrl: 'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    headline: 'Tesla 독일 Grünheide 공장 백팩 카메라 데이터 수집 계획 — 작업자 조립 동작 캡처로 Optimus AI 훈련',
    summary: 'Tesla가 독일 Grünheide 기가팩토리에서 작업자들에게 백팩 카메라를 장착시켜 조립 동작을 캡처하고, 이 데이터를 Optimus 로봇 AI 훈련에 활용할 계획. 실제 공장 환경의 조립 작업 데이터를 대규모로 수집하여 시뮬레이션 대비 현실 격차(sim-to-real gap)를 줄이려는 전략. Optimus V3 이미지가 Tesla 스마트폰 앱에서 커뮤니티 멤버에 의해 유출, 공식 발표 전.',
    sourceName: 'Interesting Engineering / Basenor',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/tesla-optimus-humanoid-robot-gigafactory',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Q3 실적 발표 10/21 예정 — Musk "Optimus·Cybercab이 Tesla 가치 대부분 차지할 것" 발언',
    summary: 'Tesla Q3 실적이 10월 21일 발표 예정. Musk가 X에서 "Optimus와 Cybercab이 Tesla 가치의 대부분을 차지할 것"이라 발언하며 로봇 사업 비중 확대를 강조. 해당 주 Tesla 주가 7.3% 하락. Q3 실적에서 Optimus 생산량·배치 현황·2027 로드맵이 업데이트될 것으로 예상. 리테일 투자자 관심 상위 5개 종목에 Tesla 포함.',
    sourceName: 'FinanceFeeds / StockTwits',
    sourceUrl: 'https://financefeeds.com/tesla-stock-gains-3-6-ahead-of-q3-earnings-as-musk-touts-optimus-and-cybercab/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai, Atlas 2028년 조지아 공장 부품 시퀀싱 배치 계획 — 2030년 부품 조립, 연 30,000대 생산 목표',
    summary: 'Hyundai Motor Group이 Atlas 휴머노이드 로봇을 조지아 공장에 2028년 부품 시퀀싱(parts-sequencing) 작업으로 배치 시작하고, 2030년까지 부품 조립(component assembly)으로 확장할 계획을 공개. 연간 30,000대 로봇 생산 용량 목표. 현재 Atlas 프로토타입 빌드 시간은 약 1일이며, Boston Dynamics는 내년까지 약 1시간으로 단축 목표.',
    sourceName: 'Archynewsy / Humanoids Daily',
    sourceUrl: 'https://archynewsy.com/hyundai-backed-boston-dynamics-deploys-atlas-humanoid-to-factories',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics Atlas 빌드 타임 1일→1시간 단축 목표 — 프로토타입숍 공정 혁신 영상 공개',
    summary: 'Boston Dynamics가 10/14 Atlas 프로토타입숍 영상을 공개. 현재 Atlas 1대를 빌드하는 데 약 1일 소요되며, 내년까지 약 1시간으로 단축하는 것이 목표. CES 2026에서 공개된 양산형 Atlas는 7.5피트 리치, 110파운드 리프팅, -4~104°F 작동 온도를 보유. GR3 핸드(13 DOF, 4핑거, 직접구동+밀집촉각센서)와 결합 시 동적 매니퓰레이션 시연에서 sim-to-real 초기 성과 확인.',
    sourceName: 'Humanoids Daily / Boston Dynamics',
    sourceUrl: 'https://www.humanoidsdaily.com/news/boston-dynamics-atlas-prototype-shop-build-time',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 내구성 테스트 — 트레드밀 9일 연속 348마일·120만 보 주행, 하드웨어 약점 파악 목적',
    summary: 'Figure AI CEO Brett Adcock가 X에서 Figure 03의 트레드밀 내구성 테스트 결과 공개. 9일 연속 주행으로 348마일(560km), 120만 보를 기록. CEO는 이를 "사이드 프로젝트"로, 짧은 데모에서는 드러나지 않는 하드웨어 약점을 노출시키기 위한 극한 스트레스 테스트라고 설명. Figure 03의 기계적 내구성과 보행 안정성을 실증하는 업계 최장 연속 보행 기록.',
    sourceName: 'Interesting Engineering / Glenpac',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-03-humanoid-robot-treadmill-test',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree G1 보안 취약점 논란 — IFA 2026 전시 중 Bluetooth 취약점·중국 서버 데이터 전송 의혹 제기',
    summary: 'Unitree G1이 IFA 2026 베를린 전시 중 독립 보안 연구자들이 Bluetooth 펌웨어 취약점과 중국 서버로의 오디오·비디오·위치·센서 데이터 무단 전송 의혹을 제기. Alias Robotics가 G1이 운영자에게 알리지 않고 정기적으로 데이터를 중국 서버로 전송한다고 주장. Unitree는 이를 부인. 공개적으로 릴리즈된 펌웨어 패치가 확인되지 않은 상태. FCC 외국산 로봇 장비 인가 금지와 맞물려 미국 시장 리스크 확대.',
    sourceName: 'Humanoid Guide / Alias Robotics',
    sourceUrl: 'https://humanoid.guide/unitree-exhibits-g1-at-ifa-amid-unresolved-security-questions/',
    confidence: 'B',
    category: 'regulation',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 자사 공장 내 로봇 부품 조립 배치 — "로봇이 로봇을 만든다" 자체 생산 활용 시연',
    summary: 'Unitree가 G1 휴머노이드 로봇을 자사 생산라인에 배치하여 로봇 부품을 조립하는 영상 공개. "로봇이 로봇을 만든다" 콘셉트를 실현하며, 생산 자동화와 비용 절감 전략을 시연. 다만 공개 영상이 2배속으로 촬영되었다는 지적이 있어 실제 작업 속도는 확인 필요. IPO 후 주가 피크 대비 40% 하락($35B 시가총액 소실) 속에서도 생산 역량 과시.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/unitree-deploys-g1-humanoids-to-manufacture-robot-parts',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SEC 승인 통과 — 미국 최초 상장 휴머노이드 로봇 기업 확정, SPAC 합병 진행',
    summary: 'Agility Robotics가 10/16 SEC 규제 승인을 통과하여 Churchill Capital Corp XI과의 SPAC 합병을 통한 상장이 확정. 미국 최초의 상장 휴머노이드 로봇 기업이 될 예정. $2.5B 기업가치, $620M 자본 조달, Foxconn 주도 $200M PIPE. 10/6 투자자 데이에서 Digit 5 BOM 약 $150,000(Digit 4 대비 상승), $300M+ 멀티연도 1,000대 주문(RaaS 3년 계약) 확보 공개.',
    sourceName: 'WPXI / GeekWire / Agility Robotics',
    sourceUrl: 'https://www.wpxi.com/news/local/agility-robotics-clears-sec-hurdle-is-set-become-first-public-us-humanoid-robotics-firm/4HLBUQKLERHXXEULXU6ENLXSDE/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit 5 배터리 파트너 Nyobolt 확정 (10/15) — 90분 가동·9분 충전, 10:1 런투차지 비율 달성',
    summary: 'Agility Robotics가 10/15 Nyobolt을 Digit 5의 배터리 파트너로 발표. Nyobolt 배터리 시스템은 90분 가동 후 9분 초고속 충전으로 10:1 런투차지(run-to-charge) 비율을 달성. 이를 통해 Digit 5는 최대 20시간 연속 작업일(교대 충전 포함)을 지원 가능. 사이클로이드 액추에이터 레그, 교체 가능 그리퍼, NVIDIA Halos 기반 협력안전 아키텍처와 결합하여 산업용 24시간 운영 최적화.',
    sourceName: 'Interesting Engineering / Agility Robotics',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/humanoid-robot-digit-5-workdays',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Apollo 3 내년 출시 예고 — "최초의 진정한 상용 제품", Apollo 2 데이터 팩토리 기반 학습 가속',
    summary: 'Apptronik CEO Jeff Cardenas가 Apollo 3를 "최초의 진정한 상용 제품(first true product)"으로 포지셔닝하며 1년 내 출시를 예고. Apollo 2는 오스틴 90,000sqft Robot Park와 글로벌 고객·파트너 사이트에서 데이터 팩토리로 운영 중이며, Google DeepMind Gemini Robotics 2 모델의 전신 제어 데모 플랫폼으로 활용. Mercedes-Benz와 Jabil이 Apollo 2를 기존 생산라인에 배치 운영 중. Series A 총 $935M, $5.3B 밸류에이션.',
    sourceName: 'Forbes / Robotics & Automation News / Apptronik',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
    confidence: 'A',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 글로벌 출시 확정 ($20,000) — TIME 보도, 가사 자율 수행(세탁 접기·식기세척기·장보기), 2026년 내 첫 가정 배송',
    summary: 'TIME이 10/16 1X NEO의 글로벌 출시를 보도. $20,000 가격 또는 $499/월 구독 모델. CEO Bernt Børnich가 NEO의 자율 가사 수행(세탁물 접기, 식기세척기 비우기, 장보기 운반) 역량을 확인. Hayward 캘리포니아 NEO 팩토리(58,000sqft)에서 첫해 10,000대 용량으로 생산 중이며, 2027년 말까지 100,000대/년으로 확대 계획. 사전주문 10,000대 5일 완판 이후 첫 미국 가정 배송이 2026년 내 개시 예정.',
    sourceName: 'TIME / Humanoid Guide / The Robot Report',
    sourceUrl: 'https://humanoid.guide/1x-neo-home-humanoid-launches-globally-at-20000-time-says/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 2026 H1 글로벌 출하량 1위 확정 (IDC) — 8,600대+, 글로벌 점유율 약 35%, 누적 20,000대 돌파',
    summary: 'IDC 데이터 기준 Agibot이 2026년 상반기 글로벌 휴머노이드 로봇 출하량 8,600대+ 이상으로 1위를 확정. 글로벌 시장 약 25,000대 중 약 35% 점유. 9월 누적 20,000번째 로봇 생산 달성. Chimelong Spaceship Park 300대+ 배치 이후 관광·호텔 섹터로 확장. 전년 대비 출하량 432% 급증한 글로벌 시장에서 Unitree를 제치고 양적 선두 유지.',
    sourceName: 'Robotics & Automation News / IDC / Humanoid Guide',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 신규 라운드 RMB 10~15억(약 $1.4~2.1억) 추진 — 밸류에이션 RMB 500억($70억), 2026년 IPO 무산',
    summary: 'Caijing 10/13 보도에 따르면 Agibot이 RMB 10~15억(약 $1.4~2.1억) 규모의 신규 펀딩 라운드를 개시. 밸류에이션 약 RMB 500억($70억). 투자자에 따르면 이번 라운드로 인해 2026년 내 IPO 완료는 불가능. 생산 확대(분기당 5,000대 템포)와 G2 Max·A3 Ultra 등 신규 모델 상용화에 자금 투입 예상.',
    sourceName: 'Caijing / HelloChinaTech',
    sourceUrl: 'https://hellochinatech.com/p/weekly-recap-2026-10-18',
    confidence: 'B',
    category: 'funding',
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

export async function insertCiUpdate20261020() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-20) ===\n');

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
        collectedAt: '2026-10-20',
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

insertCiUpdate20261020()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
