/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-28
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-28.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-28)
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
    headline: 'Tesla, Giga Texas 북쪽 캠퍼스에 Optimus 전용 공장 Giga Press 기초 공사 착수 — 약 65만㎡ 규모, 2027년 초기 생산 목표 (11/27)',
    summary:
      '2026년 11월 27일 Tesla Oracle 보도. Tesla가 Giga Texas 북쪽 캠퍼스에서 Optimus 휴머노이드 전용 공장의 Giga Press 기초 공사를 시작한 것이 항공 사진으로 확인됨. 전체 공장은 약 65만㎡(700만 sqft) 규모로 계획되며, 북쪽 캠퍼스 확장 비용은 $50~100억으로 추정. 2027년 초기 생산을 목표로 하며, 궁극적으로 연간 천만 대 Optimus 생산 능력을 구축하겠다는 장기 비전. 현재 Fremont 공장에서 소규모 초기 생산이 진행 중이며, Giga Texas는 Gen 3 대량 생산용 2세대 라인으로 위치할 전망.',
    sourceName: 'Tesla Oracle / Basenor',
    sourceUrl: 'https://www.teslaoracle.com/2026/11/27/tesla-tsla-lays-giga-press-foundations-for-optimus-production-at-giga-texas/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Musk, Baron Investment Conference에서 Optimus 판매 대신 렌탈 모델 시사 — 2027년 말 외부 기업 대상 임대 개시 계획 (11월)',
    summary:
      '2026년 11월 Not A Tesla App 보도. Elon Musk가 Baron Investment Conference 인터뷰에서 Optimus 로봇을 외부에 판매하는 대신 임대(rent)하는 모델을 추진할 것이라고 밝힘. "아마 렌탈할 것(probably rent them)"이라고 발언. 2027년 말경 외부 기업 대상 첫 배치를 목표로 하며, 현재 Tesla 내부 공장에서의 테스트를 거쳐 외부 고객에게 RaaS(Robot-as-a-Service) 형태로 제공할 계획. 판매가 대비 렌탈 단가, 계약 조건 등 구체 사항은 미공개.',
    sourceName: 'Not A Tesla App / Bloomberg',
    sourceUrl: 'https://www.notateslaapp.com/news/4959/musk-tesla-will-rent-optimus-robots-instead-of-selling-them',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure AI BotQ 공장, 누적 1,000대 이상 Figure 03 생산 달성 — 완성된 로봇 캠퍼스 외부 보행 영상 공개 (11월)',
    summary:
      '2026년 11월 Interesting Engineering 보도. Figure AI의 BotQ 공장이 누적 1,000대 이상의 Figure 03 휴머노이드를 생산했다고 보도. 공장에서 나온 새 로봇들이 캠퍼스 밖을 자율 보행하는 영상이 공개됨. Figure의 생산 역량이 프로토타입 단계에서 양산 체제로 전환되었음을 시사하는 마일스톤. 다만 고객 인도 대수, 생산 라인 가동률, 월간 생산량 등 세부 지표는 미공개. BMW 등 기존 파트너 사이트에 실제 배치된 로봇 대수도 불명.',
    sourceName: 'Interesting Engineering / Figure AI Official',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-03-humanoids-take-campus-walk',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI CEO Adcock, Musk의 휴머노이드 데모 연출 비판에 Figure 03 완전 자율 사과 집기 영상으로 반박 — 사전 훈련 없는 제로샷 조작 시연 (11/23)',
    summary:
      '2026년 11월 23일 Notebookcheck 보도. Elon Musk가 경쟁사 휴머노이드 데모가 연출(staged)이라고 비판한 직후, Figure AI CEO Brett Adcock가 Figure 03 로봇이 테이블 위 사과를 완전 자율로 집어 올리는 영상을 공개. Adcock는 해당 시나리오에 대한 사전 훈련 없이(zero-shot) 완전 자율(fully autonomous)로 수행되었다고 주장. 비전-언어-행동(VLA) 모델 기반 일반화 능력을 시연한 것으로 해석되나, 단일 물체 집기라는 태스크 난이도 한계 지적도 있음.',
    sourceName: 'Notebookcheck / Figure AI Official (X/Twitter)',
    sourceUrl: 'https://www.notebookcheck.net/Figure-AI-Tesla-rival-counters-Elon-Musk-s-robot-criticism-with-an-apple.1460812.0.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure AI CEO Adcock, 가정용 로봇 자율성 "수개월 내" 달성 가능 전망 — 처음 보는 가정에서 자율 작동 목표 (11/19)',
    summary:
      '2026년 11월 19일 Humanoid Mega Hub 보도. Figure AI CEO Brett Adcock가 인터뷰에서 6개월 내에 로봇이 처음 보는 가정(home it\'s never seen before)에 투입되어 자율적으로 작동할 수 있을 것이라는 전망을 밝힘. 현재 Figure 03의 가정용 배치는 없으며, 판매가·사전주문·대기명단도 없는 상태(11/25 기준). CEO의 낙관적 전망과 실제 상용화 사이의 간극이 존재하며, 가정 환경의 비정형성(unstructured environment) 대응이 핵심 과제.',
    sourceName: 'Humanoid Mega Hub / Humanoids Daily',
    sourceUrl: 'https://www.humanoidmegahub.com/news/humanoid-daily-november-19-2026',
    confidence: 'C',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, 30개 이상 기업 Digit 도입 검토 중 — Digit 5 다년 주문 $300M+ 파이프라인, AGCO 2027년 캔자스 파일럿 확정 (11/2)',
    summary:
      '2026년 11월 2일 Robotics & Automation News 보도. Agility Robotics가 현재 30개 이상 기업이 Digit 휴머노이드 도입을 검토 중이라고 밝힘. 9월 출시된 Digit 5의 다년 주문 파이프라인이 $300M 이상(계약 마일스톤 조건부)으로 집계. 주요 고객으로 GXO(조지아 사이트 10만+ 토트 이동 실적), Toyota Motor Manufacturing Canada(파일럿 후 상업 계약), AGCO(2027년 캔자스 파일럿 확정), Schaeffler, Mercado Libre 등이 포함. Digit 5는 50파운드 반복 리프팅(Digit 4 대비 40% 증가), 안전 케이지 없이 인간과 협업 가능한 것이 차별점.',
    sourceName: 'Robotics & Automation News / Forbes',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/02/agility-robotics-says-more-than-30-companies-considering-digit-humanoid-robot/106595/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'sw',
    headline: 'Apple, HALO 연구 발표 — 시뮬레이션 생성 데이터만으로 Unitree G1에 미지 환경 자율 내비게이션 훈련 성공 (11/5)',
    summary:
      '2026년 11월 5일 Humanoids Daily 보도. Apple이 HALO(Hallucinated Action-Language-Observation) 연구를 발표하여, 순수 시뮬레이션 생성 데이터로 Unitree G1 휴머노이드 로봇이 한 번도 본 적 없는 실제 환경에서 자율 내비게이션하도록 훈련에 성공. 실제 환경 데이터 없이 sim-to-real 전이를 달성한 것이 핵심 기여. Unitree G1이 Apple 로보틱스 연구의 하드웨어 플랫폼으로 선택된 것은 G1의 연구용 접근성과 오픈 생태계를 반영. Apple의 로보틱스 진출 의도에 대한 추측이 있으나 상용 제품 계획은 미발표.',
    sourceName: 'Humanoids Daily / Apple Research',
    sourceUrl: 'https://www.humanoidsdaily.com/companies/unitree-robotics/news',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree, Go2/B2/G1/H1 Bluetooth 보안 취약점 공식 대응 — 대부분 수정 완료, 소프트웨어 업데이트 임박 (11월)',
    summary:
      '2026년 11월 Pandaily 보도. Unitree Robotics가 Go2, B2, G1, H1 로봇의 Bluetooth 보안 취약점에 대해 공식 대응 발표. 대부분의 보안 문제를 수정 완료했으며 소프트웨어 업데이트가 임박한 상태. 2026년 8월 공개된 "UniBLEed" 취약점(BLE 경유 무인증 루트 실행, 인접 로봇 전파)에 대한 후속 조치. 다만 패치 배포 일정, 영향받은 펌웨어 버전 범위, 기존 고객 대상 업데이트 적용 방법 등 세부 사항은 미공개.',
    sourceName: 'Pandaily',
    sourceUrl: 'https://pandaily.com/unitree-robotics-addresses-robot-security-flaw-update-imminent',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'GXO Logistics × Apptronik, Apollo 운용 시험 확대 및 RaaS 상용 배치 프레임워크 LOI 공식 체결 — 최대 1,000대, 2027년부터 (11/12)',
    summary:
      '2026년 11월 12일 GlobeNewswire 공식 발표. GXO Logistics와 Apptronik이 Apollo 휴머노이드 로봇의 운용 시험 확대 및 RaaS(Robotics-as-a-Service) 모델 기반 상용 배치 프레임워크에 대한 LOI(Letter of Intent)를 체결. 최대 4년간 1,000대 규모의 Apollo 배치가 목표이며, 2027년부터 시작 예정. Mercedes-Benz 키팅 작업 96% 성공률 실증에 이은 대규모 물류 분야 확장. Apollo 2의 바이페달·휠 듀얼 구성이 다양한 창고 환경 적응에 활용될 전망. 계약 금액은 미공개.',
    sourceName: 'GlobeNewswire / GXO Official',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/11/12/3401413/0/en/gxo-and-apptronik-expand-partnership-to-scale-humanoid-deployment.html',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'SoftBank, 1X Technologies 과반 지분 인수 협상 보도 — $6B 밸류에이션, 작년 $10B 대비 40% 하락 (8/27 보도, 11월 현재 미종결)',
    summary:
      '2026년 8월 27일 The Information 최초 보도, Reuters·Humanoids Daily·DealStreetAsia 등 복수 매체 확인. SoftBank가 1X Technologies의 과반 지분(majority stake) 인수를 $6B 밸류에이션으로 협상 중. 작년 $10B 밸류에이션 대비 40% 하락된 수준. 1X는 OpenAI Startup Fund, Tiger Global 등이 투자한 노르웨이 기반 휴머노이드 스타트업으로, NEO 가정용 로봇 $20,000에 10,000대 사전주문 매진 실적. 2026년 8월 보도 이후 거래 종결 발표는 없으며, 조건이 여전히 미확정 상태. SoftBank의 ABB Robotics $5.4B 인수(2025년)에 이은 로보틱스 투자 확대 전략의 일환.',
    sourceName: 'The Information / Reuters / Humanoids Daily / DealStreetAsia',
    sourceUrl: 'https://www.humanoidsdaily.com/news/softbank-in-talks-for-majority-stake-in-1x-at-6-billion-below-the-10-billion-it-sought-last-year',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot × Minth Group, 세르비아 Šabac에 유럽 최초 휴머노이드 양산 공장 가동 개시 — 연 5,000대 목표, 초기 1,000~2,000대 생산 (8/29 개소, 11월 양산 진행 중)',
    summary:
      '2026년 8월 29일 EqualOcean, IntelliNews, RFE/RL 보도. AgiBot과 Minth Group이 세르비아 Šabac에 유럽 최초 중국 설계 휴머노이드 양산 공장을 개소. 세르비아 Vučić 대통령이 참석하여 연간 5,000대 이상 생산 목표를 제시. 초기에는 1,000~2,000대 조립 생산으로 시작하며, 중국에서 설계된 로봇을 현지 최종 조립하는 방식. 미국의 대중 기술 제재를 우회하는 유럽 거점 확보 전략으로도 해석됨. 11월 현재 공장 가동 중이나, 실제 출하 대수 및 유럽 고객 확보 현황은 미공개.',
    sourceName: 'EqualOcean / IntelliNews / RFE/RL',
    sourceUrl: 'https://equalocean.com/news/2026083122153-agibot-minth-begin-robot-production-serbia',
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

export async function insertCiUpdate20261128() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-28) ===\n');

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
        collectedAt: '2026-11-28',
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

insertCiUpdate20261128()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
