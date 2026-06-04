/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-06-04
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-06-04.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-06-04)
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
    headline: 'Tesla Fremont Optimus 생산라인 7~8월 가동 개시, Model S/X 5월 단종 확정',
    summary: 'Fremont Model S/X 라인 5월 초 단종 후 Optimus 전환 완료. 7~8월 생산 시작 예정. 초기 생산속도 "예측 불가" (1만개 고유 부품). Fremont 라인 연간 100만대 설계 용량.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Texas Gigafactory 2세대 Optimus 라인 착공 — 장기 연산 1,000만대 목표',
    summary: 'Gigafactory Texas에 2세대 생산라인 부지 정리 착수. 장기 목표 연간 1,000만대 생산 용량. Fremont(1세대)와 병행 운영.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus V3 reveal 연기 — 양산 설계 버전, 2026년 하반기 공개 예정',
    summary: 'Optimus V3(양산 설계 최초 버전) 공개 일정 2026 하반기로 재연기. Q1 2026 목표였으나 양산 최적화 작업 연장.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 상용 스펙 확정: 56 DoF, 완전 회전 관절, 자동 배터리 교환',
    summary: '56 자유도, 완전 회전 관절, 2.3m 리치, 50kg 리프팅. 자율 배터리 교환(충전소 이동→교환→복귀) 무인 연속 가동. 듀얼 배터리 시스템.',
    sourceName: 'Boston Dynamics 공식 / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026 생산분 전량 예약 완료 — 추가 고객 2027 초 수용',
    summary: 'CES 2026 후 즉시 보스턴 본사 생산 개시. 2026년 생산 물량 전량 Hyundai RMAC + Google DeepMind에 배정 완료. 추가 고객은 2027 초부터 수용 예정.',
    sourceName: 'The Register / Boston Dynamics',
    sourceUrl: 'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Google DeepMind Foundation Model Atlas 통합 — 인지 능력 및 학습 속도 향상',
    summary: 'Google DeepMind 개발 파트너로 참여. Foundation Model 통합으로 인지 능력 강화, 작업 학습 속도 대폭 향상 목표.',
    sourceName: 'Boston Dynamics / Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 5월 라이브스트림 — 로봇 vs 인간 패키지 처리 대결 (98.5% 달성)',
    summary: '2026.5 Figure 02 그룹이 약 1주간 무중단 패키지 처리 라이브스트림 후, 10시간 인간 대 로봇 대결 실시. 로봇 처리량 인간의 98.5% 달성.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI Series C $10억+ 마감 — LG Technology Ventures, NVIDIA, Qualcomm 참여',
    summary: 'Series C $10억+ 조달, $390억 post-money. 투자자: Parkway VC(리드), Brookfield, NVIDIA, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile, Qualcomm.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Helix 02 AI 플랫폼 출시 — 전신 자율 조작 (2026.1)',
    summary: '2026.1 Helix 02 출시. AI 모델을 전신으로 확장, 기능적 자율성(functional autonomy) 실현. 모션캡처+시뮬레이션 기반 ML로 세탁기/식기세척기 로딩 시연.',
    sourceName: 'Figure AI / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Nvidia-Unitree 파트너십: H2 + Jetson Thor 연구자 패키지 최초 판매',
    summary: 'Nvidia가 Unitree H2 휴머노이드를 Jetson Thor(Blackwell GPU) 연구 시스템 최초 상용 조합으로 선정. 연구자 대상 판매. H2 Plus 10월 출시 예정.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Unitree UnifoLM-VLA-0 오픈소스 공개 — 12개 작업 카테고리 VLA 베이스라인',
    summary: '2026.3 UnifoLM-VLA-0(Vision-Language-Action 모델) 오픈소스 공개. 12개 조작 작업 카테고리 배포 가능한 베이스라인 제공. G1 플랫폼 기반.',
    sourceName: 'Unitree Robotics / RoboCloud',
    sourceUrl: 'https://www.unitree.com/news/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 심사 통과 — STAR Market 상장, 생산 4배 확대 계획',
    summary: 'STAR Market IPO 심사 통과(2026.6). 4.2B위안($620M) 모집 목표. 생산능력 4배 확대하여 연 20,000대 목표. 2025 매출 RMB 17.08억(YoY 335%).',
    sourceName: 'TechTimes / Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit Mercado Libre 산안토니오 시설 배치 — 이커머스 풀필먼트 확대',
    summary: 'Mercado Libre 산안토니오(TX) 시설에 Digit 배치. 이커머스 풀필먼트 지원 작업 수행. GXO, Amazon, Toyota, Schaeffler에 이어 5번째 상용 고객.',
    sourceName: 'Robotics 24/7',
    sourceUrl: 'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Digit NRTL 안전 인증 획득 — 휴머노이드 최초 산업안전 인증',
    summary: 'Digit NRTL(Nationally Recognized Testing Laboratory) 인증 획득. 휴머노이드 로봇 최초 산업 안전 기준 준수. 이커머스 풀필먼트 확대 적용 가능.',
    sourceName: 'Agility Robotics 공식 / Beginners in AI',
    sourceUrl: 'https://beginnersinai.org/agility-robotics-digit-explained/',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'GXO 다년 Robots-as-a-Service 계약 체결 — 업계 최초 RaaS 모델',
    summary: 'GXO와 업계 최초 다년 RaaS(Robots-as-a-Service) 계약 체결. Flowery Branch 시설 10만+ 토트 실적 기반. 상용 수익 모델 확립.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/about/press',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority',
    summary: 'Series A 확장 라운드($520M)에 AT&T Ventures, John Deere & Co., Qatar Investment Authority 신규 참여. Austin 확장 + California 오피스 신설.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 2026년 신규 로봇 발표 예정 — Apollo 후속 모델',
    summary: '2026년 내 신규 로봇 발표 예정. Apollo 후속으로 생산 확대에 최적화된 설계. Google DeepMind Gemini Robotics AI 기반.',
    sourceName: 'SiliconAngle / Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/02/12/apptronik-nears-1-billion-in-funding-with-520-million-extension-to-series-a-round/98897/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apollo Mercedes-Benz, GXO, Jabil 공장/물류 실증 진행 중',
    summary: 'Mercedes-Benz 공장, GXO 물류센터, Jabil 제조시설에서 Apollo 로봇 테스트 진행 중. 상용 배치 전 단계 실증.',
    sourceName: 'CNBC / Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X Hayward(CA) 공장 가동 개시 — 미국 최초 수직통합 휴머노이드 공장',
    summary: '58,000 sq ft Hayward(CA) 공장 가동. 미국 최초 수직통합 휴머노이드 제조시설. 연 10,000대 생산 용량. 소비자 배송 2026년 내 시작 예정.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/1x-begins-production-neo-humanoid-robots-at-hayward-california-facility/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'NEO 사전주문 5일만에 첫해 생산분 전량 매진 (10,000대)',
    summary: '2025.10 사전주문 개시 5일만에 첫해 생산량(10,000대) 전량 매진. 가격 $20,000(우선배송) / 구독 $499/월. Tech Funding News 보도.',
    sourceName: 'Tech Funding News',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X World Model 업데이트 — 비디오 기반 물리 추론으로 미학습 작업 즉시 수행',
    summary: '1X World Model 최신 업데이트. 실세계 물리 기반 비디오 모델로 어떤 요청이든 AI 기능으로 즉시 변환. 사전 학습 없는 작업도 자율 수행.',
    sourceName: 'The Robot Report / 1X 공식',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Minth Group 파트너십 — 유럽 자동차 부품 생산라인 배치',
    summary: '독일 Minth Group과 파트너십. 유럽 자동차 부품 생산라인에 Agibot 휴머노이드 배치. 글로벌 제조업 진출 확대.',
    sourceName: 'TechTimes / Capital.com',
    sourceUrl: 'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Singtel Enterprise 파트너십 — 싱가포르 시장 진출',
    summary: 'Singtel Enterprise와 협력 계약. 싱가포르 거점으로 동남아 시장 진출. 물류/소매/서비스 분야 배치 목표.',
    sourceName: 'Capital.com / KR-Asia',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 상장 추진 — 상장사 지배지분 인수 방식, 2026 Q3 목표',
    summary: '직접 IPO 대신 상장사 지배지분 인수 방식(백도어 상장) 추진. 2026년 Q3 목표. 홍콩 시장 상장 예정. 총 $83.8M 자금 조달 완료.',
    sourceName: 'Medium / PitchBook',
    sourceUrl: 'https://medium.com/@creed_1732/agibot-hong-kong-ipo-2026-a-bold-bet-in-the-booming-industrial-ai-market-dd6a192d255a',
    confidence: 'C',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Unitree-Agibot 중국 듀오폴리: Unitree IPO 승인 + Agibot 10,000대 돌파',
    summary: 'Unitree IPO 승인과 Agibot 10,000대 생산 돌파가 동시 보도. 중국 휴머노이드 시장 양강 구도 형성. 미국/유럽 경쟁사 합산 생산량 초과.',
    sourceName: 'TechTimes',
    sourceUrl: 'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
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

export async function insertCiUpdate20260604() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-06-04) ===\n');

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
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        collectedAt: '2026-06-04',
      },
      sourceChannel: 'auto_scan',
      status: 'pending',
    });

    console.log(`  ✅ [${item.confidence}] ${item.competitorSlug}: ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`총 ${collectedData.length}건 중 ${inserted}건 삽입, ${skipped}건 중복 건너뜀`);
  console.log(`ci_monitor_alerts: ${inserted}건, ci_staging: ${inserted}건`);
}

// 직접 실행 시 (npx tsx ...)
const isDirectRun = process.argv[1]?.includes('insert-ci-update-2026-06-04');
if (isDirectRun) {
  insertCiUpdate20260604()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ CI 업데이트 실패:', err);
      process.exit(1);
    });
}
