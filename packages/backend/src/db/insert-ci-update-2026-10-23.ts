/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-23
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-23.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-23)
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
    headline: 'Tesla Q3 2026 실적 발표 — 순이익 43% 하락, Optimus 공식 양산 시작 확인, Fremont 라인 전환',
    summary: 'Tesla가 10/21 Q3 2026 실적을 발표. 순이익 전년 대비 43% 하락. 주주서한에서 Optimus 양산 개시를 공식 확인하며 "첫 생산 품질 로봇(first production-quality bots)"이라 표현. Fremont 공장의 기존 Model S/X 라인을 Optimus 생산으로 전환 완료. Musk는 "고물량 라인에서의 초기 생산(early production on a high-volume line)"이라 설명하며, 풀 캐패시티 도달 및 외부 고객 출하까지 약 1년 소요 전망. 2027년 말까지 주 20,000대 생산 목표 제시.',
    sourceName: 'TechCrunch / Quartz',
    sourceUrl: 'https://techcrunch.com/2026/10/21/tesla-stars-optimus-robot-production-in-california-as-profit-falls-43/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics-AGCO 상업 계약 체결 (10/20) — Digit 캔자스 공장 파일럿 2027년 개시, 부품 분류·적재 자동화',
    summary: 'Agility Robotics와 AGCO가 10/20 Digit 휴머노이드 로봇 파일럿 상업 계약을 체결. 2027년 AGCO 캔자스 주 Hesston 생산시설에서 파일럿 시작 예정. 초기 작업은 부품 분류(sorting), 적재(stacking), 토트 배치(tote placement). AGCO 제조기술 디렉터 Thomas Enghof는 "휴머노이드 로봇과 AI를 유연하고 지능적인 공장 구축의 필수 팀메이트로 본다"고 발언. Agility의 기존 Toyota Canada, Amazon 파일럿에 이은 농기계 제조업 진출.',
    sourceName: 'GlobeNewsWire / Unite.AI',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/20/3384385/0/en/agco-and-agility-robotics-advance-smart-manufacturing-with-humanoid-robot-pilot-in-hesston-kansas-facility.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit 5 온보드 컴퓨트 NVIDIA IGX Thor 독점 표준화 (10/22) — GA 버전 NVIDIA 단독 공급, Halos 안전 시스템 통합',
    summary: 'Agility Robotics가 10/22 Digit 5의 온보드 컴퓨트를 NVIDIA IGX Thor 모듈로 독점 표준화한다고 발표. NVIDIA가 GA(General Availability) 버전의 유일한 온보드 컴퓨트 공급업체로 확정. NVIDIA Halos for Robotics 플랫폼이 Digit 5의 안전 시스템에 내장되어 공장·물류센터 배치 시 협력안전(cooperative safety) 아키텍처 강화. Digit 5가 NVIDIA Halos의 첫 휴머노이드 론칭 파트너. 2027 상반기 얼리 액세스, 2027년 말 GA 예정.',
    sourceName: 'GlobeNewsWire / Manila Times',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/22/3386184/0/en/agility-robotics-expands-nvidia-collaboration-as-it-prepares-digit-5-for-commercial-scale.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind, Apollo에서 영상 기반 스킬 학습 데모 (10/22) — Gemini Robotics 최신 모델로 비디오→로봇 행동 전이',
    summary: 'Robotics & Automation News가 10/22 Google DeepMind가 Apptronik Apollo 플랫폼에서 최신 Gemini Robotics 모델을 활용해 비디오에서 직접 물리적 스킬을 학습하는 데모를 보도. 기존 Gemini Robotics 2 기반 전신 제어에서 진화하여, 영상 시청→행동 전이(video-to-behavior transfer) 방식 시연. Apollo 2가 Google DeepMind의 로보틱스 AI 훈련 핵심 플랫폼으로 자리매김. Robot Park 데이터셋을 활용한 지속적 모델 개선 파이프라인 운영 중.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/22/google-deepmind-uses-gemini-4-argon-to-teach-apptroniks-apollo-humanoid-new-skills-from-video/106227/',
    confidence: 'C',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2-X 가디언 로봇 공개 (10/21) — H2 기반 보안·경호 특화 모델, 무술 시연·8시간 배터리 주장',
    summary: 'TechRadar가 10/21 Unitree의 H2-X 가디언(보디가드) 로봇 프로모션 영상을 보도. H2 플랫폼 기반으로 칼 공격자 제압, 차량 리프팅, 보행자 구출 등 시나리오 시연. 약 8시간 가동 시간 주장(조건 미명시). 보안·경호 특화 모델로 포지셔닝. 다만 프로모션 영상 기반이며 실제 성능 독립 검증 없음. Unitree IPO 후 주가 피크 대비 55% 하락 중에도 신규 모델 라인업 확장 지속.',
    sourceName: 'TechRadar / Interesting Engineering',
    sourceUrl: 'https://www.techradar.com/ai-platforms-assistants/unitree-reveals-its-h2-x-bodyguard-robot-a-kung-fu-humanoid-with-an-8-hour-battery-life-and-some-serious-martial-arts-skills',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 누적 생산 10,000~20,000대 — 글로벌 최다 판매 휴머노이드, 주가 17% 급등 (10/19)',
    summary: 'KuCoin News 10/22 보도에 따르면 Unitree 창업자 Wang Xingxing이 2026 World Physical AI Conference에서 G1 누적 생산 약 10,000~20,000대를 발표, 글로벌 최다 판매 휴머노이드로 확인. 발표 전 10/19 주가 17%+ 급등. G1 가격 $13,500으로 저가 시장 장악 지속. 2024년 5월 출시 이후 약 2.5년 만의 마일스톤. 다만 정확한 수치 범위(10,000~20,000)가 넓어 실 생산량 불확실.',
    sourceName: 'KuCoin News / BigGo Finance',
    sourceUrl: 'https://www.kucoin.com/news/flash/unitree-g1-humanoid-robot-production-reaches-10-000-to-20-000-units',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 10월 28일 공식 출시 예정 — 첫 가정 배송 개시, 텔레오퍼레이터 병행 운영 확인',
    summary: 'Humanoid Guide가 1X NEO의 10/28 공식 출시(launch)를 보도. $20,000 또는 $499/월 구독 모델. Startup Fortune은 초기 배송이 시작되었다고 보도하나 독립 검증된 고객 인도 사례는 미확인. 1X의 "Turing" 원격 오퍼레이터가 NEO 카메라를 통해 가사 작업을 제어하며, 실제 가정 데이터를 수집하여 자율 AI 훈련에 활용. Hayward 캘리포니아 공장에서 연 10,000대 용량으로 생산 중.',
    sourceName: 'Humanoid Guide / Startup Fortune',
    sourceUrl: 'https://humanoid.guide/1x-neo-launching-october-28th-humanoids-are-coming-home/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO HK$1,560억($200억) 밸류에이션 추진 — CITIC Securities 스폰서, 2026 내 상장은 불확실',
    summary: 'The Standard(홍콩) 보도에 따르면 Agibot이 HK$1,560억(약 $200억) 밸류에이션으로 홍콩 IPO를 추진 중. CITIC Securities가 스폰서로 확정. 그러나 Caijing 10/13 보도의 RMB 10~15억 신규 펀딩 라운드(밸류에이션 RMB 500억/$70억)로 인해 120일 간격 규정상 2026년 내 상장은 어려울 전망. 텐센트, 세쿼이아 캐피탈 등이 코너스톤 투자자로 참여. 2026년 매출 RMB 40억(약 $5.6억) 목표. 밸류에이션 차이(HK$1,560억 vs RMB 500억)는 IPO 시점과 프리IPO 라운드 차이로 추정.',
    sourceName: 'The Standard (HK) / Caijing / TechNode',
    sourceUrl: 'https://www.thestandard.com.hk/finance/article/337821/AgiBot-eyes-156b-Hong-Kong-IPO',
    confidence: 'B',
    category: 'funding',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Boston Dynamics Atlas CBS 60 Minutes 출연 — Hyundai 조지아 공장에서 AI 기반 자율 루프랙 분류 훈련 공개',
    summary: 'CBS 60 Minutes가 Boston Dynamics Atlas의 Hyundai 조지아 공장 훈련 과정을 방영. Atlas가 AI 기반으로 자율적으로 루프랙(roof rack) 부품을 분류하는 작업을 훈련 중인 모습 공개. 2028년 부품 시퀀싱 배치, 2030년 부품 조립 확장 계획의 중간 단계. 전체 Atlas 2026년 배치 물량이 이미 Hyundai RMAC 및 Google DeepMind에 할당 완료, 추가 고객은 2027년 초 예정.',
    sourceName: 'CBS News / 60 Minutes',
    sourceUrl: 'https://www.cbsnews.com/news/boston-dynamics-training-ai-humanoids-to-perform-human-jobs-60-minutes/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI Helix 2.5 AI 업데이트 — 사전학습 파운데이션 모델의 가정 환경 적응, 장난감 정리·수건 접기·침대 정리 시연',
    summary: 'Figure AI가 Helix 2.5 AI 업데이트를 발표(9월 17일). 사전학습된 파운데이션 모델을 처음 접하는 가정 환경에 적응시키는 데모 공개. 장난감 정리, 수건 접기, 침대 정리 3개 행동을 시연. Figure 03 기반으로 가정용 시장 진출 가능성 탐색. CEO Brett Adcock는 여전히 "자기 아이들 주변에서 자유롭게 작동시키기엔 준비되지 않았다"고 언급하며 안전성 과제를 솔직히 인정. BotQ 공장 연간 12,000대 용량에서 생산 지속.',
    sourceName: 'eWeek / Figure AI',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
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

export async function insertCiUpdate20261023() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-23) ===\n');

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
        collectedAt: '2026-10-23',
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

insertCiUpdate20261023()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
