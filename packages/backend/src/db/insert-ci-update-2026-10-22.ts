/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-22
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-22.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-22)
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
    headline: 'Tesla Optimus Fremont 공장 초기 양산 개시 (10/21) — Model S/X 라인 전환, "첫 생산 품질 로봇" 선언',
    summary: 'Tesla가 10월 21일 Q3 실적 발표와 함께 Fremont 공장에서 Optimus 초기 양산(early production)을 시작했다고 발표. Model S/X 생산라인을 전환한 공간을 활용하며, "상용 제품에 적합한 첫 생산 품질 로봇"이라고 설명. Musk는 "초기 생산이며 램프업은 느리고 다소 험난할 것"이라 언급. 2027년 말 주 20,000대 목표를 제시했으나 최소 1년 이상 소요 전망. 현재 Fremont·Giga Texas에 1,000~1,200대 내부 배치 추정(Wolfe Research). 외부 판매 수익은 2027년 후반 이후 예상.',
    sourceName: 'TechCrunch / GuruFocus / TeslaNorth / Basenor',
    sourceUrl: 'https://techcrunch.com/2026/10/21/tesla-stars-optimus-robot-production-in-california-as-profit-falls-43/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Q3 2026 실적: 순이익 43% 급감 ($787M) — AI·Optimus·자율주행 투자 증가가 수익성 압박',
    summary: 'Tesla Q3 2026 실적에서 순이익이 전년 대비 43% 감소한 $787M 기록. 매출도 소폭 감소. AI, Optimus, 자율주행에 대한 투자 지출 증가가 수익성을 압박. Q2 기준 자본지출 $5.79B로 전년 대비 142% 급증. Q3 업데이트 테이블에서 Optimus는 캘리포니아 "Early Ramp", 텍사스 "Construction"으로 표기되었으나 생산 용량 수치는 미공개. 의미 있는 Optimus 매출은 2027년 후반 이후 가능할 것으로 분석.',
    sourceName: 'TechCrunch / Implicator.ai / Webull',
    sourceUrl: 'https://www.implicator.ai/tesla-kills-its-flagship-cars-to-build-robots-that-dont-work-yet/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas, Hyundai Metaplant America(조지아) 9월부터 현장 훈련 진행 중 — 2028 부품 시퀀싱, 2030 조립 목표',
    summary: 'TokenPost 10/19 보도에 따르면 Atlas 로봇이 9월부터 Hyundai Motor Group Metaplant America(조지아)에서 현장 훈련을 진행 중. 2028년 부품 시퀀싱(parts-sequencing) 작업 배치 시작, 2030년까지 부품 조립(component assembly)으로 확장 계획. 검증(validation) 통과가 전제 조건. Boston Dynamics는 연간 30,000대 로봇 생산 용량을 목표로 하나, 이는 주문 확정이 아닌 잠재 생산 능력 수준. 2월 CEO Robert Playter 퇴임, CFO Amanda McMaster 임시 CEO 체제.',
    sourceName: 'TokenPost / Digital Trends / Boston Dynamics',
    sourceUrl: 'https://tokenpost.com/news/business/34977',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, Figure 02 공식 퇴역(10월 초) — Figure 03로 완전 전환, BMW Spartanburg 40대 배치 확대 중',
    summary: 'Figure AI가 10월 초 Figure 02를 공식 퇴역(retirement)하고 Figure 03로 완전 전환. Figure 02의 BMW Spartanburg 11개월 시범 운영에서 30,000대+ BMW X3 생산에 기여한 성과를 기반으로, BMW가 Figure 03 40대를 배치하고 추가 워크스테이션으로 단계적 확장 계획(2026~2027). BotQ 공장에서 시간당 1대 생산 속도 달성, 연간 12,000대 용량. 2025년 9월 $1B 투자 유치($39B 밸류에이션) 후 IPO 준비 진행 중.',
    sourceName: 'Heise / Forge Global / TIME / OriginOfBots',
    sourceUrl: 'https://heise.de/en/news/It-keeps-going-and-going-Figure-03-robot-covers-560-km-11493464.html',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2-X "쿵푸 가디언" 공개 (10/21) — H2 기반 보안 특화 모델, 182cm/70kg, 31 DOF, 8시간 운용',
    summary: 'Unitree가 10월 21일 H2-X "Kung Fu Legend Guardian"을 공개. H2 플랫폼 기반 보안 특화 모델로, 182cm 신장, 70kg 중량, 31 DOF. 8시간 운용 가능(조건 미상). 판매 예정 없는 콘셉트/데모 모델. IPO 후 주가 피크 대비 55% 하락 — Reuters에 따르면 Unitree 주가 급락이 중국 휴머노이드 로봇 IPO 러시 둔화에 영향. G1 보안 취약점(UniPwn Bluetooth 30m 원격 루트 액세스) 인지 후 대응 중이나 공개 펌웨어 패치 미확인 상태.',
    sourceName: 'TechRadar / TheNews / Humanoid Guide / Wikipedia',
    sourceUrl: 'https://www.techradar.com/ai-platforms-assistants/unitree-reveals-its-h2-x-bodyguard-robot-a-kung-fu-humanoid-with-an-8-hour-battery-life-and-some-serious-martial-arts-skills',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 후 주가 55% 급락 — 중국 휴머노이드 IPO 러시 둔화 촉발, 시가총액 $35B+ 소실',
    summary: 'Unitree가 8월 19일 상하이 상장 첫날 629% 급등 후, 10월 기준 피크 대비 약 55% 하락. Reuters는 이 급락이 중국 정부의 휴머노이드 로봇 IPO 러시 속도 조절에 영향을 미쳤다고 보도. 시가총액 약 $35B 이상 소실. G1 미국 가격 $13,500~$17,990(딜러별 상이), H2 Plus는 Toborlife AI를 통해 북미 $29,900에 공급 중이나 FCC 외국산 로봇 인가 금지로 신규 모델 미국 진입 차단.',
    sourceName: 'TechRadar / GlobalDroneHQ / Wikipedia',
    sourceUrl: 'https://www.techradar.com/ai-platforms-assistants/unitree-reveals-its-h2-x-bodyguard-robot-a-kung-fu-humanoid-with-an-8-hour-battery-life-and-some-serious-martial-arts-skills',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility–AGCO 파일럿 MOU 체결 (10/20) — 2027년 캔자스 Hesston 공장 Digit 휴머노이드 배치, 농기계 제조 자동화',
    summary: 'Agility Robotics와 AGCO Corporation이 10월 20일 Digit 휴머노이드 로봇 파일럿 MOU를 발표. 2027년 캔자스 Hesston 생산시설에서 부품 분류(parts sorting), 적재(stacking), 토트 배치(tote placement) 작업에 Digit을 배치 예정. AGCO는 글로벌 농기계 제조사로, 휴머노이드 로봇의 농업 제조 분야 첫 대형 파일럿 사례. Agility의 고객 확대(자동차·소비재·농업 등 4개 신규 고객 추가)와 함께 Digit의 산업용 적용 범위를 넓히는 의미.',
    sourceName: 'GlobeNewswire / Unite.AI / Mobile World Live',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/20/3384385/0/en/agco-and-agility-robotics-advance-smart-manufacturing-with-humanoid-robot-pilot-in-hesston-kansas-facility.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics 피츠버그 50,000sqft 시설 확장 (10/21) — 배치·서비스·소프트웨어·AI 역량 강화',
    summary: 'Agility Robotics가 10월 21일 피츠버그에 50,000sqft 규모의 새 시설 확장을 발표. 고객 배치 지원, 서비스, 소프트웨어, AI 역량을 강화하기 위한 거점. 자동차, 소비재, 농업 분야에 걸쳐 4개 신규 고객을 확보했다고 공개. SPAC 합병($2.5B 기업가치) 후 미국 최초 상장 휴머노이드 로봇 기업으로서의 인프라 확대. Digit 5는 2027년 H1 얼리 액세스, 2027년 말 GA 예정.',
    sourceName: 'GlobeNewswire / Agility Robotics',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/21/3385373/0/en/agility-robotics-expands-pittsburgh-presence-to-support-growing-customer-deployments.html',
    confidence: 'A',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind, Apollo 플랫폼에 Gemini 4 Argon 모델 시연 — 비디오→시뮬레이션→실제 던지기 자율 학습 파이프라인',
    summary: '10월 21일 시장 뉴스레터에 따르면 Google DeepMind가 Gemini 4 Argon 모델을 Apptronik Apollo 플랫폼에서 시연. 인간 비디오→시뮬레이션→실제 로봇 던지기로 이어지는 자율 학습 파이프라인을 선보임. Apollo가 DeepMind의 에이전틱 Gemini 모델의 주요 하드웨어 플랫폼으로 활용되고 있음을 확인. Apollo 2는 오스틴 90,000sqft Robot Park와 글로벌 파트너 사이트에서 데이터 팩토리로 운영 중. Mercedes-Benz, GXO Logistics, Jabil이 자재 핸들링·창고 작업에 Apollo 배치.',
    sourceName: 'Hervé Cuviliez Substack / Humanoids Daily / GetCoAI',
    sourceUrl: 'https://hervecuviliez.substack.com/p/market-news-wednesday-21-october',
    confidence: 'C',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik, Apollo "Next" 복수 버전 병행 개발 중 — CEO "올해 공개 데뷔" 예고, 정확한 시기 미정',
    summary: 'Humanoids Daily 10월 보도에 따르면 Apptronik CEO Jeff Cardenas가 Apollo의 차기 버전 복수 모델을 병행 개발 중이라고 밝힘. 공개 데뷔가 올해로 밀렸으며 정확한 시기는 미정. Apollo 3를 "최초의 진정한 상용 제품"으로 포지셔닝. Series A 총 $935M, $5.3B 밸류에이션. 리니어 액추에이터 핵심 IP가 미국 부품 공급난 속 경쟁 우위로 부각.',
    sourceName: 'Humanoids Daily / Apptronik',
    sourceUrl: 'https://www.humanoidsdaily.com/news/substance-over-hype-inside-apptronik-s-measured-push-for-the-next-apollo',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 첫 미국 가정 배송 임박 — WSJ "아직 자율 수행 불가, 원격 조종 병행" 확인, $20,000 또는 $499/월',
    summary: '1X Technologies의 NEO 가정용 휴머노이드 로봇이 2026년 내 첫 미국 가정 배송을 앞두고 있으나, WSJ 테스트에서 "아직 자율적으로 가사를 수행하지 못하며, 원격 인간 오퍼레이터가 카메라를 통해 집 내부를 보며 로봇을 제어해야 한다"는 점이 확인됨. $20,000 얼리 액세스 또는 $499/월 구독 모델. Hayward, CA NEO 팩토리(58,000sqft) 첫해 10,000대 용량, 2027년 말 100,000대/년 확대 목표. 사전주문 10,000대 5일 완판.',
    sourceName: 'LetDataScience / NotebookCheck / TheRobotReport / WSJ',
    sourceUrl: 'https://letsdatascience.com/news/1x-ships-neo-humanoid-robots-to-us-homes-774b7a74',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, 신규 펀딩 RMB 10~15억($1.4~2.1억) 추진 중 — 밸류에이션 $70억, 2026년 IPO 무산 확정',
    summary: 'Caijing 10/13 및 HelloChinaTech 10/18 보도에 따르면 Agibot이 RMB 10~15억(약 $1.4~2.1억) 규모의 신규 펀딩 라운드를 추진 중. 밸류에이션 약 RMB 500억($70억). 투자자에 따르면 이번 라운드로 인해 2026년 내 IPO 완료는 불가능. IDC 기준 H1 2026 글로벌 출하 8,600대+로 1위(35% 점유), 9월 누적 20,000대 돌파. 분기당 5,000대(일 55대) 생산 템포 유지. G2 Max·A3 Ultra 신규 모델 상용화에 자금 투입 예상.',
    sourceName: 'Caijing / HelloChinaTech / Robotics & Automation News / IDC',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
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

export async function insertCiUpdate20261022() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-22) ===\n');

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
        collectedAt: '2026-10-22',
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

insertCiUpdate20261022()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
