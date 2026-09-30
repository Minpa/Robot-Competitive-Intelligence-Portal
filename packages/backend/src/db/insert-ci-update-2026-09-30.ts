/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-30
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-30.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-30)
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
    headline: 'Samsung Taylor 팹 AI5 2nm 시제품 생산 개시 (9/15) — Optimus·FSD·Cybercab 공용 칩, 2027년 양산',
    summary: 'Samsung이 9월 15일 텍사스 Taylor 팹에서 Tesla AI5 2nm 시제품 웨이퍼 생산을 개시, 당초 11월 예정보다 2개월 앞당겨 진행. AI5는 Optimus 휴머노이드·FSD·Cybercab 로보택시 공용 프로세서로 설계. 기존 AI4 대비 메모리 대역폭 5배 향상. 2026년 말 양산 검증 완료, 2027년 본격 공급 예정. Musk는 AI5와 AI6를 Samsung·TSMC 양사에서 생산할 것이라 확인.',
    sourceName: 'Electrek / Basenor / Tom\'s Hardware',
    sourceUrl: 'https://electrek.co/2026/07/13/samsung-taylor-fab-tesla-ai5-chip-2nm/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 생산 10배 증가 달성이나 핸드 부품 병목 — 주 수백대, Q4 램프업 우려',
    summary: 'Tesla가 9월 25일 Optimus 생산량이 수개월 내 약 10배 증가(Q2 주 수십대 → 현재 주 수백대)했다고 발표하나, 정밀 핸드 부품·자동화 장비·서플라이어 용량에서 심각한 병목 직면. 핸드의 50개 액추에이터와 22 DOF 구조가 양산 속도 제약 요인. 목표 주 1,000대(9월말)·2,500대(연말)는 핸드 양산 정상화에 달려있음.',
    sourceName: 'GuruFocus / Gizmodo',
    sourceUrl: 'https://www.gurufocus.com/news/9097629/teslas-optimus-robot-faces-production-challenges-amid-scaling-efforts',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics RMAC 시설 개소 (9/21) — Hyundai Metaplant America 내 Atlas 훈련 센터',
    summary: 'Boston Dynamics가 9월 21일 조지아주 서배너 인근 Hyundai Motor Group Metaplant America 캠퍼스 내에 Robotics Metaplant Application Center(RMAC)를 개소. Atlas 휴머노이드를 자동차 제조 업무(부품 물류, 조립 시퀀싱)에 투입하기 위한 실환경 훈련 시설. 2027년 10배 규모 확장 계획, 신규 미국 로봇 공장 건설 예정.',
    sourceName: 'Axios / Boston Dynamics / The Robot Report',
    sourceUrl: 'https://bostondynamics.com/news/boston-dynamics-opens-robotics-metaplant-application-center-to-train-humanoid-robots-for-manufacturing-tasks/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai, 글로벌 Atlas 25,000대 배치 로드맵 — Metaplant America 2028년 초도 배치',
    summary: 'Hyundai Motor Group이 Hyundai·Kia 글로벌 공장에 25,000대 Atlas 배치 로드맵을 공개. Metaplant America에서 2028년 부품 시퀀싱 업무로 초도 배치 예정. 안전성과 품질 효과 입증 후 점진 확대. Boston Dynamics는 연간 30,000대 생산 체제를 Hyundai 제조 역량으로 구축 중.',
    sourceName: 'Interesting Engineering / Automotive World',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/boston-dynamics-begins-robot-testing-metaplant',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'data',
    headline: 'Figure AI–Nscale $3.5B 컴퓨트 파트너십 — NVIDIA Vera Rubin GPU 최대 100,000기, Helix 모델 학습',
    summary: 'Figure AI와 Nscale이 9월 3일 전략적 파트너십을 발표. Nscale이 초기 $3.5B(최대 $6B+) 규모 컴퓨트를 제공, NVIDIA Vera Rubin GPU 최대 100,000기 배치. 2027년 하반기 텍사스 Barstow에 첫 하드웨어 배치 예정. Nscale은 Figure 주주가 되며, Helix 파운데이션 모델의 학습·추론 인프라를 담당. 수직 통합 구조: Nscale(클라우드)–NVIDIA(하드웨어)–Figure(모델·로봇).',
    sourceName: 'Compare the Cloud / Intelligent CIO / Unite.AI',
    sourceUrl: 'https://www.figure.ai/news/figure-and-nscale-sign-strategic-partnership',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure Helix 2.5 공개 — 제로샷 30개 가정 일반화, 가정용 로봇 AI 진전',
    summary: 'Figure AI가 9월 17일 Helix 2.5를 공개, 30개 이상 가정 환경에서 사전 학습 없이(zero-shot) 일반화된 가사 작업 수행 능력을 시연. 기존 Helix 모델 대비 다양한 비정형 환경 적응력 대폭 향상. Brookfield 파트너십(100,000 주거 단위 영상 데이터)과 Nscale 컴퓨트 파워가 뒷받침. Figure 03의 가정용 시장 투입을 가속화하는 핵심 AI 마일스톤.',
    sourceName: 'Figure AI',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 주가 IPO 후 조정 안정화 — 시총 $28~30B, 2026 H2 28,000대 판매 전망 유지',
    summary: 'Unitree(688836.SH) 주가가 IPO 첫날 460% 폭등 후 고점 대비 50%+ 조정을 거쳐 9월 중순 기준 ~$70~78 구간에서 안정화, 시총 $28~30B 수준 유지. Morgan Stanley가 2026년 중국 판매 전망 28,000대를 재확인. G1 세계 최다 판매 휴머노이드(글로벌 점유율 32%) 지위 유지. 다만 미 국방부 Section 1260H 목록 등재로 미국 시장 접근 제약 지속.',
    sourceName: 'CNBC / Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/markets/stocks/articles/unitree-robotics-stock-soars-460-111514463.html',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Agility, Digit 5 런칭 후 휠 기반 로봇 탐색 확인 — CEO "다양한 폼팩터 연구 중"',
    summary: 'Agility Robotics CEO Jonathan Hurst가 Digit 5 런칭 영상 말미에 등장한 휠 기반 휴머노이드에 대해 "다양한 로봇 설계·폼팩터(휠 포함)를 탐색하고 있다"고 확인. 다만 "아직 초기 단계로 폼팩터 미결정, 별도 제품 또는 Digit 파생형 여부도 미정"이라 밝힘. Digit의 이족보행 한계(속도·안정성)를 보완하는 새로운 이동성 옵션 검토로 해석됨.',
    sourceName: 'The Robot Report / Humanoid Guide',
    sourceUrl: 'https://www.therobotreport.com/agility-robotics-maker-of-digit-humanoid-exploring-wheeled-robots/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik–Jabil 자체 생산 확대 합의 — Apollo 상용 검증 후 Jabil 공장에서 로봇이 로봇 제조',
    summary: 'Apptronik과 Jabil의 전략적 제조 협력이 확대 단계에 진입. Apollo가 상용 검증(commercial viability)되면 Jabil 자체 공장에서 Apollo 로봇을 투입하여 Apollo를 생산하는 "자기복제 제조" 모델 추진. 현재 Mercedes-Benz, Jabil, GXO 3개사 파일럿 배치 중. Apollo 2 플릿이 Robot Park 및 고객 현장에서 실시간 데이터 수집, Gemini Robotics 모델 학습에 활용.',
    sourceName: 'TechCrunch / Apptronik',
    sourceUrl: 'https://apptronik.com/news-collection/apptronik-and-jabil-collaborate-to-scale-production',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO Factory 풀스케일 양산 가동 — San Carlos 추가 시설, 2027년 10만대/년 목표',
    summary: '1X Technologies의 Hayward NEO Factory(58,000sqft)가 풀스케일 양산 가동에 돌입. 직원 200+명. San Carlos에 추가 시설 가동 예정. 연간 10,000대 생산 용량에서 자동화 확대를 통해 2027년 말 100,000대+/년 목표. 미국 최초 수직통합 고볼륨 휴머노이드 공장. 사전주문 10,000대 전량 완판 상태 유지, 2026년 말 첫 고객 인도 예정.',
    sourceName: 'The Robot Report / Forbes',
    sourceUrl: 'https://www.therobotreport.com/1x-begins-production-neo-humanoid-robots-at-hayward-california-facility/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot–Chimelong 300대+ 로봇 대규모 테마파크 배치 (9/24) — 20,000번째 유닛 마일스톤',
    summary: 'Agibot과 Chimelong Group이 9월 24일 헝친 Chimelong Spaceship Park에서 300대+ 로봇 대규모 배치 1단계를 런칭. 7개 핵심 시나리오(라이브 엔터테인먼트, 과학교육, 가이드투어, 리테일, AI 컴패니언, 호텔서비스, 스포츠)에 투입. 무술·체조·탁구 시연, 다국어 안내·컨시어지 등 수행. 이 배치가 Agibot의 20,000번째 로봇 생산 마일스톤과 동시 달성. 관광 섹터 최대 규모 휴머노이드 배치 사례.',
    sourceName: 'TechRepublic / PR Newswire / Fast Company',
    sourceUrl: 'https://www.prnewswire.com/apac/news-releases/agibot-and-chimelong-launch-large-scale-embodied-ai-theme-park-with-more-than-300-robots-302888863.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'Agibot AGILE 2.0 발표 (9/14) — 인지 기반 보행 제어, 휴머노이드 로코모션 진전',
    summary: 'Agibot이 9월 14일 AGILE 2.0(인지 기반 보행 제어 시스템)을 발표. 기존 모델 대비 외부 환경 인식과 보행 제어를 통합하여 비정형 지형·장애물 환경에서의 적응적 보행 능력을 대폭 향상. A3 Ultra의 51 DOF와 다중 센서(3D LiDAR, RGB-D, GPS/RTK/UWB) 데이터를 활용한 실시간 보행 최적화.',
    sourceName: 'Agibot',
    sourceUrl: 'https://www.agibot.com/news',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'safety',
    headline: 'Agibot A3·X2 IFA 2026 Innovation Awards 수상 (9/8) — 유럽 시장 공략 가시화',
    summary: 'Agibot의 A3 및 X2 로봇이 2026년 9월 8일 베를린 IFA 2026에서 Innovation Awards를 수상. 이동성, 지능형 인터랙션, 다중 로봇 협업 분야에서의 기술 진보를 인정. 기존 TÜV Rheinland 인증 획득에 이어 IFA 수상으로 유럽 시장 진출 정당성 강화. Tekpoint와의 유럽 리테일 유통 동맹과 맞물려 본격 유럽 사업 전개 기반 마련.',
    sourceName: 'Agibot / IFA',
    sourceUrl: 'https://www.agibot.com/article/231/detail/98.html',
    confidence: 'A',
    category: 'regulation',
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

export async function insertCiUpdate20260930() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-30) ===\n');

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
        collectedAt: '2026-09-30',
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

insertCiUpdate20260930()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
