/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-28
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-28.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-28)
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
    headline: 'Tesla Optimus Gigafactory Texas 생산 추가 개시 계획 — Fremont 주 수백 대에서 연말 1,000대/주 목표, 텍사스는 2026년 말 가동 예정',
    summary: 'DriveTeslaCanada 등 복수 매체 보도. Tesla가 Fremont에서 현재 주 수백 대(several hundred/week) Optimus를 생산 중이며, 2026년 말까지 주 1,000대 이상 연속 자동화 생산라인 가동을 내부 목표로 설정. 별도로 Gigafactory Texas에서도 2026년 말 Optimus 생산을 시작할 계획. Musk는 풀 캐패시티(주 20,000대) 도달까지 약 1년 소요 전망. 다만 1,000대/주 목표는 The Information 발 비공식 보도이며 Tesla가 공식 확인한 수치는 아님. 대부분 유닛이 여전히 테스트 모드 상태.',
    sourceName: 'DriveTeslaCanada / Interesting Engineering / NewsBytesApp',
    sourceUrl: 'https://driveteslacanada.ca/?p=126159',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics Atlas 신형 4핑거 핸드 공개 (10/2) — 13 DOF, 4-DOF 대향 엄지, 손가락·손바닥 전면 촉각 센서',
    summary: 'Robotics & Automation News 10/2 보도. Boston Dynamics가 Atlas용 신형 4핑거(four-finger) 핸드를 공개. 총 13 자유도(DOF), 4-DOF 대향 엄지(opposable thumb) 포함. 손끝과 손바닥 전면에 촉각 센서 탑재로 정밀 그립 및 힘 피드백 가능. CES 2026에서 공개된 프로덕션 Atlas의 조립·시퀀싱 작업 능력을 크게 확장하는 업그레이드. 기존 2핑거 그리퍼 대비 인간 수준의 조작성에 근접.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai-BD Atlas 공급망 구축 — Hyundai Mobis 액추에이터, 화신정공 알루미늄 구조체, 2028년 연 30,000대 생산 목표',
    summary: 'Korea Herald·KED Global·The Investor 종합. BD 엔지니어들이 한국에서 약 1개월간 10+ 자동차 부품 공장을 평가. Hyundai Mobis가 Atlas 관절 액추에이터 및 그리퍼 핵심 공급사로 확정, 2028년 미국 액추에이터 공장(연 35만 개 용량) 가동 예정. 화신정공(Hwashin Precision)은 경량 알루미늄 다리·몸체 모듈, SOS Lab은 라이다 시스템 검토 중. Hyundai는 2028년 연 30,000대 Atlas 생산 능력 확보 목표, 2028년 HMGMA 배치 시작→2029년 기아 조지아 공장 확대. 현재 단가 $130K~$140K, 5만 대 규모 시 $30K 수준으로 하락 전망(Goldman Sachs).',
    sourceName: 'Korea Herald / KED Global / The Investor',
    sourceUrl: 'https://www.koreaherald.com/article/10791707',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, Figure 02 전체 플릿 핀란드 제철소에서 파괴 처리 — IP 보호 목적, 배터리 문제로 미국·멕시코 처리 불가',
    summary: 'Gizmodo·The AI Insider 보도. Figure AI가 Figure 02 플릿 대부분을 핀란드 제철소의 용융 강철(molten steel)에 투입하여 완전 파괴. 회사 블로그에서 "더 이상 유지보수 불가능한 유닛의 하드웨어 IP를 완전 보호하기 위한 조치"라고 설명. 리튬이온 배터리 포함 유닛 처리를 미국·멕시코 시설이 거부하여 핀란드로 운송. Figure 02는 BMW Spartanburg에서 약 1년간 30,000+ BMW X3 생산에 기여한 후 Figure 03로 교체 진행 중.',
    sourceName: 'Gizmodo / The AI Insider',
    sourceUrl: 'https://gizmodo.com/figure-ai-trains-retired-robots-to-dive-into-molten-steel-2000820643',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 04 "풀 디자인 락(Full Design Lock)" 진입 — 10월 올핸즈 미팅에서 확인, Helix 3.0 AI 모델 티저 공개',
    summary: '복수 2차 매체 종합. Figure AI가 10월 올핸즈 미팅에서 차세대 Figure 04가 "풀 디자인 락(full design lock)" 단계에 진입했다고 확인. 동시에 새로운 AI 모델 Helix 3.0 티저도 공개. 정식 공개 일정은 미발표. Figure 03의 BotQ 생산(시간당 1대, 연 12,000대)과 병행하여 04 개발 진행. Brett Adcock CEO가 Figure 03 트레드밀 스트레스 테스트에서 348마일(~560km) 주행 달성을 별도 공개하며 내구성 검증 진행 중.',
    sourceName: 'eWeek / Humanoids Daily (aggregated)',
    sourceUrl: 'https://eweek.com/news/humanoid-robots-2027-real-world-deployment',
    confidence: 'C',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2-X 공개 데모 중 다리 탈락 사고 (10/26) — 무술 시연 중 하반신 관절 분리, 공식 대응 없음',
    summary: 'TechNode 10/26·Global Times 보도. Unitree가 새로 출시한 H2-X "가디언" 로봇이 공개 무술 시연 중 하반신 다리가 관절부에서 탈락하는 사고 발생. 영상이 중국 소셜미디어에서 확산되며 엇갈린 반응. TechNode 보도 시점까지 Unitree의 공식 대응은 없음. 10/21 프로모션 영상에서 차량 리프팅·무술 시연 등을 과시했으나, 실제 공개 데모에서 내구성 문제 노출. 보안·경호 시장 진출 전략에 타격 가능성.',
    sourceName: 'TechNode / Global Times',
    sourceUrl: 'https://technode.com/2026/10/26/unitrees-newly-launched-h2-x-robot-loses-a-leg-in-public-demonstration',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'JPMorgan, Unitree 투자 의견 2단계 상향 (Underweight→Overweight) — 목표가 CNY 995, Physical AI 돌파 전망 근거',
    summary: 'BigGo Finance 보도. JPMorgan이 Unitree 투자 의견을 Underweight에서 Overweight로 2단계 상향 조정하고 목표주가를 CNY 995로 대폭 인상. 근거로 Wang Xingxing CEO의 "Physical AI가 돌파(breakthrough) 조짐을 보이고 있다"는 발언과 G1 누적 10,000~20,000대 생산 실적, 그리고 1~2년 내 범용 로봇 능력 도달 전망을 제시. 다만 Unitree 주가는 IPO 이후 피크 대비 55% 하락 상태이며, FCC 금지로 미국 시장 신규 진입 차단 상황.',
    sourceName: 'BigGo Finance / JPMorgan',
    sourceUrl: 'https://finance.biggo.com/news/3e8534af-fdaf-4e73-868b-21a64761ae99',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics 상업 모멘텀 가속 — Toyota Canada·Schaeffler·Mercado Libre 등 3개 신규 제조 고객, 30+ 파이프라인 확보',
    summary: 'Agility Robotics 10/26 공식 보도자료. 자동차·물류·e커머스·농기계·국방 5개 분야에서 30+ 잠재 고객 파이프라인 확보. Toyota Motor Manufacturing Canada, Schaeffler, Mercado Libre 등 3개 신규 제조 고객 발표. Digit이 상업·고객 프로그램에서 65,000시간 이상 운영 시간 기록. 기존 GXO, Amazon, AGCO에 이어 글로벌 제조업 진출 가속화. Digit 5(2027 GA)를 중심으로 상업 규모 확대 전략. SPAC 합병(11/2 주주투표) 앞두고 상업 실적 강조.',
    sourceName: 'Agility Robotics (Official) / GlobeNewsWire',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-highlights-commercial-momentum-and-growing-enterprise-demand-for-digit-humanoid-robot',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 10,000번째 휴머노이드 출하 달성 (3/30) — Omdia 2025 출하량 세계 1위, Unitree와 1위 경쟁',
    summary: 'Humanoid Guide 종합. Agibot이 2026년 3월 30일 누적 10,000번째 휴머노이드 로봇을 출하. Omdia는 Agibot을 2025년 휴머노이드 출하량 세계 1위로 평가(Unitree는 이에 이의 제기). Expedition A3·A2 등 다양한 모델 라인업으로 제조업·물류·PR 이벤트 배치 중. X1 개발자 킷은 $19,499부터, 완전 오픈소스(AimRT 프레임워크). 중국 내 휴머노이드 산업 정책(Made in China 2025 후속)의 수혜주로 평가.',
    sourceName: 'Humanoid Guide / Omdia',
    sourceUrl: 'https://blog.robozaps.com/b/best-humanoid-robots',
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

export async function insertCiUpdate20261028() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-28) ===\n');

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
        collectedAt: '2026-10-28',
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

insertCiUpdate20261028()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
