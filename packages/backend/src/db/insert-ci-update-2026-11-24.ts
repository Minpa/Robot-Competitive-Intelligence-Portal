/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-24
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-24.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-24)
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
    headline: 'Tesla, Fremont Model S/X 라인 46일 만에 해체 — Optimus 생산 공간 확보, Musk "Optimus는 Tesla 최고 제품" 반복 강조 (11/22)',
    summary:
      '2026년 11월 22일 Teslanorth, Electrek, Stocktwits 보도. Tesla가 Fremont 공장의 기존 Model S/X 생산 라인을 46일 만에 해체하고 Optimus 로봇 생산을 위한 공간으로 전환 중. Musk는 같은 날 X(트위터)에서 AI 생성 Optimus 영상을 공유하며 "역대 최고의 제품(biggest product of all time)"이라고 발언, 스마트폰 시장을 넘어설 것이라고 주장. 현재 Fremont에서 초기 생산(early production) 단계이며, 주당 20,000대 목표는 2027년 말 이후로 전망. Giga Texas Optimus 전용 시설은 건설 중.',
    sourceName: 'Teslanorth / Electrek / Stocktwits',
    sourceUrl: 'https://teslanorth.com/2026/11/22/tesla-optimus-musk-best-product/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla, Optimus 하드웨어 대규모 채용 개시 — 모터·전자장치·액추에이터 TPM 포지션 (11/20-21)',
    summary:
      '2026년 11월 20-21일 Teslanorth 보도. Tesla가 X를 통해 Optimus 하드웨어 팀 채용을 공개 모집. 모터, 전자장치(electronics), 액추에이터 분야 Technical Program Manager 포지션이 포함됨. 이전 채용 공고(9월 Fremont 제조직, 2025년 12월 대규모 채용)에 이은 연속적인 인력 확충으로, Optimus Gen 3 양산 준비를 위한 하드웨어 엔지니어링 역량 강화 의도. 별도 보도에서 Driveteslacanada는 Fremont에서 Manufacturing Equipment Engineer, Quality Engineer 등 제조 관련 역할도 모집 중이라고 확인.',
    sourceName: 'Teslanorth / Driveteslacanada',
    sourceUrl: 'https://teslanorth.com/2026/11/21/tesla-optimus-hardware-hiring/',
    confidence: 'C',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Boston Dynamics, 바퀴형 Atlas에 강화학습(RL) 로코모션 정책 적용 연구 결과 발표 — 표준 Atlas 액추에이터 고장 대응에 활용 (11/22)',
    summary:
      '2026년 11월 22일 Robotics & Automation News, Unite.AI 보도. Boston Dynamics가 바퀴형 Atlas 연구 플랫폼에서 강화학습(Reinforcement Learning) 기반 로코모션 정책을 테스트한 결과를 상세 공개. 기존 앵클 액추에이터에 커스텀 어댑터로 스쿠터 바퀴를 장착하여 360도 스핀 점프, 고속 주행 등 고난도 동작을 RL로 학습. Boston Dynamics는 이 연구 결과를 표준(이족보행) Atlas의 액추에이터 고장 대응 및 전신 제어(whole-body control) 개선에 직접 적용 중이라고 밝힘. 상용화 계획은 없는 순수 연구 프로젝트.',
    sourceName: 'Robotics & Automation News / Unite.AI',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/22/boston-dynamics-gives-atlas-wheels-to-test-new-reinforcement-learning-capabilities/107438/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'GXO, Agility Digit 배치를 Statesville NC·Lebanon TN 2개 사이트 추가 확대 — 2027년 초 Digit 4로 시작, Digit 5로 전환 예정 (10/26)',
    summary:
      '2026년 10월 26일 GXO 공식 보도, Supply Chain Digital·DC Velocity·The Robot Report 등 복수 매체 확인. GXO Logistics가 Agility Robotics와 새로운 상업 계약을 체결하여 미국 노스캐롤라이나 Statesville 및 테네시 Lebanon의 e-커머스 풀필먼트 시설 2곳에 Digit을 추가 배치한다고 발표. 2027년 초 Digit 4 시리즈로 운영을 시작한 뒤 Digit 5로 전환 예정. 기존 조지아 사이트에서 10만 개 이상 토트 이동 실적이 확대의 근거. 투입 대수 및 계약 금액은 미공개. Agility는 별도로 피츠버그에 50,000 sqft 신규 시설도 계획 중.',
    sourceName: 'GXO Official / Supply Chain Digital / DC Velocity / The Robot Report',
    sourceUrl: 'https://supplychaindigital.com/news/gxo-to-deploy-agility-robotics-in-two-e-commerce-fulfilment',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X CEO Børnich, 12월 개발자·일부 소비자 NEO 출하 시작 확인 — 인지 코어(cognitive core) 소프트웨어로 셔츠 다림질·TV 조작 등 신규 태스크 시연',
    summary:
      'Humanoids Daily(11/20), Technology.org(11/21) 보도. 1X Technologies CEO Bernt Børnich가 12월부터 NEO를 개발자 및 일부 소비자에게 출하하겠다고 확인. 최근 공개된 "인지 코어(cognitive core)" 소프트웨어를 통해 NEO가 셔츠 스팀 다림질, TV에서 반지의 제왕 선택·재생 등 사전 학습하지 않은 가정 내 태스크를 수행하는 영상 시연. 텔레오퍼레이터 상시 개입 방식에 대한 프라이버시 우려는 지속. Hayward 공장 연 10,000대 생산 용량, 2027년 50,000대 확대 목표 유지. 독립적인 소비자 인도 완료 사례는 아직 미확인.',
    sourceName: 'Humanoids Daily / Technology.org',
    sourceUrl: 'https://www.humanoidsdaily.com/news/1x-neo-developers-december-runtime-2026-bornich',
    confidence: 'C',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'data',
    headline: 'Unitree, G1 Dex3 정밀 조작 데이터셋 3종 Hugging Face 공개 — 의자 조립·옷 접기·샌드위치 만들기 (11/21경)',
    summary:
      'Hugging Face unitreerobotics 계정 확인, Unitree 공식. Unitree Robotics가 G1 휴머노이드의 Dex3 3-핑거 핸드를 활용한 정밀 조작(fine-grained manipulation) 데이터셋 3종을 Hugging Face에 공개. 스툴 조립(stool assembly), 옷 접기(clothes folding), 샌드위치 만들기(sandwich making) 태스크로 구성. LeRobot v3.0 포맷으로 관절 상태·행동·카메라 뷰·태스크 설명을 포함. 기존 물 따르기(pouring), 물체 배치(object placement) 데이터셋에 추가. Unitree의 오픈소스 로보틱스 데이터 생태계 확장 전략의 일환.',
    sourceName: 'Hugging Face (unitreerobotics) / Unitree Official',
    sourceUrl: 'https://huggingface.co/lewislf',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, 호주·뉴질랜드 클라우드 노드 구축 및 APC 2026 파트너 생태계 확대 — RaaS 모델로 아태 시장 본격 진출 (11/20)',
    summary:
      '2026년 11월 20일 PR Newswire, Yahoo Finance, Manila Times 등 공식 보도. AgiBot(智元机器人)이 호주에 클라우드 노드를 구축하고, 호주·뉴질랜드 대상 APC(AGIBOT Partner Conference) 2026을 개최하여 현지 파트너 생태계를 확대한다고 발표. William Zhang이 오클랜드 엑스포에서 뉴질랜드 로봇 배치 접근법을 공유. Robot-as-a-Service(RaaS) 모델을 중심으로 현지 서비스 네트워크 확장 및 공동 혁신 프로젝트를 추진. 중국 외 아태 지역(호주·뉴질랜드)으로의 본격적인 시장 확장 사례.',
    sourceName: 'PR Newswire / Yahoo Finance / Manila Times',
    sourceUrl: 'https://www.prnewswire.com/apac/news-releases/agibot-launches-australian-cloud-node-to-accelerate-market-expansion-and-local-robotics-deployment-across-australia-and-new-zealand-302946872.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'Siemens × Agibot, 텍스트 프롬프트 기반 휴머노이드 그리퍼 형상 자동설계 AI 워크플로우 시연 — 적층제조 준비까지 자동화 (11/21)',
    summary:
      '2026년 11월 21일 Humanoid.guide, Robotics & Automation News 보도. Siemens와 AgiBot이 텍스트 프롬프트에서 휴머노이드 로봇 그리퍼 형상(geometry)을 자동 생성하는 AI 워크플로우를 시연. 생성된 그리퍼 디자인을 가상 환경에서 핸들링 검증한 뒤 적층제조(additive manufacturing)용으로 준비하는 전체 파이프라인을 포함. Siemens의 산업 디지털화 역량과 AgiBot의 체화지능(embodied AI) 기술이 결합된 사례. Siemens는 별도로 UBTech·Humanoid(UK) 등 여러 휴머노이드 업체와도 제조 파트너십을 추진 중.',
    sourceName: 'Humanoid.guide / Robotics & Automation News',
    sourceUrl: 'https://humanoid.guide/',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Fortune 분석: Figure 포함 주요 휴머노이드 업체 "System 1 → System 2" 전환 과제 직면 — 비정형 환경 대응이 핵심 병목 (11/23)',
    summary:
      '2026년 11월 23일 Fortune "The jagged frontier gets a body" 분석 기사. Figure AI를 포함한 주요 휴머노이드 로봇 업체들이 반복 작업(System 1)에서 비정형 환경 대응(System 2)으로의 전환에서 공통 과제에 직면해 있다고 분석. AgiBot의 Longcheer 태블릿 공장 6일간 64,828건 태스크 99.99% 성공률, Figure의 BMW 제로샷 배치 사례 등을 인용하면서도, 로봇들이 여전히 장벽에 충돌하거나 낯선 물체를 떨어뜨리는 한계를 지적. 2027년 휴머노이드 산업의 핵심 관전 포인트로 "일반화(generalization)" 능력을 꼽음.',
    sourceName: 'Fortune',
    sourceUrl: 'https://fortune.com/2026/11/23/physical-ai-humanoid-robots-jagged-frontier-china-candelon-asseo',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Nvidia GTC Berlin에서 Isaac 로보틱스 플랫폼 확장 발표 — Apptronik Apollo 포함 휴머노이드 생태계 도구 업데이트 (11/22)',
    summary:
      '2026년 11월 22일 Robotics & Automation News 보도. Nvidia가 GTC Berlin에서 Isaac 로보틱스 플랫폼을 확장하면서 휴머노이드 로봇용 새로운 개발 도구와 레퍼런스 디자인을 공개. Apptronik Apollo를 포함한 주요 휴머노이드 플랫폼과의 통합이 강조됨. Agile Robots의 Agile ONE SN 레퍼런스 휴머노이드도 공개(2027년 초 출시 예정). Nvidia의 물리적 AI 생태계 투자 확대가 Apptronik-DeepMind 기술 파트너십과 함께 Apollo의 AI 역량 강화를 뒷받침할 전망.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/11/22/nvidia-expands-isaac-robotics-platform-with-new-humanoid-and-ai-development-tools/107472',
    confidence: 'B',
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

export async function insertCiUpdate20261124() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-24) ===\n');

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
        collectedAt: '2026-11-24',
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

insertCiUpdate20261124()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
