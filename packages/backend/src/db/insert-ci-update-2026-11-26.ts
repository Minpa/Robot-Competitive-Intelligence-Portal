/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-26
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-26.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-26)
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
    headline: 'Tesla, 독일 공작기계 기업 EMAG 인수 추진 — Optimus 액추에이터용 정밀 기어 내재화 목적 (11/25)',
    summary:
      '2026년 11월 25일 Electrek, Drive Tesla Canada, Basenor 등 복수 매체 보도. Tesla가 독일 Salach 소재 공작기계 기업 EMAG에 대한 지분 인수를 추진 중. 독일 상업등기부에 "Tesla Machining Technologies Management SE"가 EMAG 본사 주소로 등록됨. EMAG는 스트레인 웨이브·유성 기어 등 로봇 액추에이터 핵심 부품용 선반·연삭·기어가공 장비 전문 업체로, 2024년 매출 €4.96억에 €4,200만 적자. 약 220명의 EMAG 직원이 Tesla로 이적할 가능성 보도. Tesla·EMAG 모두 공식 확인은 없으나, Optimus 양산을 위한 정밀 기어 가공 역량 내재화 전략으로 해석됨.',
    sourceName: 'Electrek / Drive Tesla Canada / Basenor / TeslAnt',
    sourceUrl: 'https://electrek.co/2026/11/25/tesla-emag-germany-machining-company-optimus/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla, Optimus 차기 AI5 칩 탑재 계획 — 차량은 AI4 유지, 로봇에 최신 실리콘 우선 배정 (11월)',
    summary:
      '2026년 11월 Basenor Optimus Tracker 보도. Tesla가 차기 AI5 칩을 Optimus 로봇에 우선 배정하고 차량용 FSD는 AI4를 유지할 계획. 로봇의 실시간 추론 요구가 차량보다 높아 최신 실리콘을 로봇에 먼저 투입하는 전략. AI5 칩의 구체적 스펙(TOPS, 공정 등)은 미공개. Optimus Gen 3 양산 하드웨어와의 통합이 목적으로 추정.',
    sourceName: 'Basenor Optimus Tracker',
    sourceUrl: 'https://www.basenor.com/pages/tesla-optimus-tracker',
    confidence: 'C',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics Atlas, GlobalFoundries 반도체 팹 테스트 계약 후속 — eWeek "2027년 초 주요 팹 현장 투입" 구체화 보도 (11/20)',
    summary:
      '2026년 11월 20일 eWeek 후속 보도. 11/18 발표된 Boston Dynamics-GlobalFoundries 계약의 후속 디테일. Atlas 휴머노이드와 Spot 로봇 모두 GlobalFoundries 칩 제조 시설에서 테스트 예정. Atlas는 2027년 초 주요 팹 현장에 투입되며, Spot은 시설 점검 용도로 확대 배치. Boston Dynamics의 자동차(현대) 외 반도체 산업으로의 확장이 구체화. 투입 팹 위치, 로봇 대수, 작업 범위는 여전히 미공개.',
    sourceName: 'eWeek / UPI',
    sourceUrl: 'https://www.eweek.com/news/boston-dynamics-atlas-globalfoundries-chip-plants/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure AI, 웨어러블 휴머노이드 훈련 시스템 특허 출원 공개 — 백팩형 프레임에 관절팔 장착, 텔레오퍼레이션·데이터 수집 겸용 (11/19 공개)',
    summary:
      '2026년 11월 19일 USPTO 공개 특허 US 2026/0364774 A1. Figure AI가 작업자가 착용하는 백팩 형태의 프레임에 관절형 기계 팔 2개를 장착한 웨어러블 훈련 시스템을 출원. 작업자의 상체 동작을 실시간 캡처하여 휴머노이드 로봇 훈련 데이터로 변환하거나, 로봇 원격 제어에 활용. 센서 장갑, 리타게팅 모듈 포함. Menafn, Humanoid.guide, Patentlyze 등 복수 매체 보도. 상용 제품이 아닌 연구 단계 출원.',
    sourceName: 'Menafn / Humanoid.guide / Patentlyze / USPTO',
    sourceUrl: 'https://menafn.com/1112011613/Figure-AI-Patents-Wearable-System-For-Humanoid-Robot-Training',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI, T-Mobile과 Physical AI 엣지 컴퓨팅 협업 — 5G 네트워크 엣지에서 휴머노이드 AI 추론 테스트 (11월)',
    summary:
      '2026년 11월 Mobile World Live 보도. T-Mobile CTO John Saw가 Figure AI 휴머노이드 로봇의 AI 추론 일부를 5G 네트워크 엣지 인프라에서 실행하는 테스트를 진행 중이라고 밝힘. 로봇 온보드 컴퓨팅 한계를 네트워크 엣지로 보완하여 반응 속도를 개선하는 목적. T-Mobile은 Figure AI 투자자이기도 함($39B 밸류에이션 라운드 참여). 구체적 테스트 결과·지연시간·배치 시설은 미공개.',
    sourceName: 'Mobile World Live / Telco Titans',
    sourceUrl: 'https://www.mobileworldlive.com/t-mobile-us/t-mobile-us-pushes-physical-ai-to-the-edge/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, Nasdaq AGLT 상장 완료 — Churchill Capital Corp XI SPAC 합병 11/4 종결, 11/5 거래 개시, 최초 순수 이족보행 휴머노이드 상장사 (11/5)',
    summary:
      '2026년 11월 5일 GCN, CryptoBriefing 보도. Agility Robotics가 Churchill Capital Corp XI과의 SPAC 합병을 11월 4일 종결하고 11월 5일 Nasdaq AGLT로 거래를 개시. 총 조달 약 $4.65억 (SPAC 신탁 $1.64억 + Foxconn 주도 PIPE $2.01억 + 기존 투자 $1억). 사전 기업가치 $25억. 공모가 $10 대비 개장가 $11.26. 미국 최초 순수 이족보행 휴머노이드 로봇 상장사. Digit 5 양산 및 글로벌 확장(EU/UK)에 자금 투입 예정.',
    sourceName: 'GCN / CryptoBriefing / Material Handling & Logistics',
    sourceUrl: 'https://gcn.com/?p=23082',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO, 미국 얼리액세스 가정 배송 시작 보도 — 단 독립 고객 인도 완료 사례 미확인, 12월 개발자 출하가 공식 타임라인 (11/18-21)',
    summary:
      '2026년 11월 18일 Startup Fortune이 1X NEO가 미국 얼리액세스 가정에 배송을 시작했다고 보도. 그러나 11/21 Technology.org 등 후속 매체는 "독립적으로 확인된 고객 인도 완료 사례 없음"이라고 반박. CEO Børnich의 12월 개발자 출하 발표(Runtime 2026)가 공식 타임라인. $20,000 판매가, $499/월 구독 모델 병행. 10,000대 사전주문 5일 만에 매진 실적. 텔레오퍼레이터("Turing" 오퍼레이터) 의존 모델에 대한 프라이버시 우려 지속.',
    sourceName: 'Startup Fortune / Technology.org / Humanoids Daily',
    sourceUrl: 'https://www.technology.org/2026/11/21/1x-neo-home-robot-what-it-can-do-2026/',
    confidence: 'C',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree G1 보안 취약점 "UniBLEed" 공개 — Bluetooth 경유 무인증 루트 실행, 인접 로봇 전파 가능 (2026년 8월 공개, 11월 추가 보도)',
    summary:
      '보안 연구자 Olivier Laflamme가 Unitree G1 EDU의 보안 취약점 "UniBLEed"를 공개(2026년 8월). Bluetooth Low Energy를 통해 인증 없이 루트 권한 실행이 가능하며, 감염된 로봇이 무선 범위 내 인접 로봇에 전파할 수 있는 연쇄 공격(lateral movement) 가능성 확인. Humanoids Daily가 11월 추가 보도. G1의 소비자·교육 시장 확대에 대한 보안 리스크 경고. Unitree의 공식 패치 발표 여부는 미확인.',
    sourceName: 'Humanoids Daily / Olivier Laflamme (security researcher)',
    sourceUrl: 'https://www.humanoidsdaily.com/news/hack-one-robot-reach-the-next-how-unitree-s-g1-left-the-door-open-to-root-takeover',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot, 뉴질랜드-중국 제품 엑스포(오클랜드) 로봇 쇼케이스 — AWS Physical AI 로드쇼(시드니)에서도 클라우드 노드 시연 (11/20-22)',
    summary:
      '2026년 11월 20-22일 News Today World, PR Newswire 보도. AgiBot이 오클랜드 뉴질랜드-중국 제품 엑스포에서 휴머노이드 로봇을 전시하고, 11/10 시드니 AWS Physical AI 로드쇼에서 호주 클라우드 노드를 시연. 현지 애프터서비스 팀 운영 중이며 뉴질랜드를 고급(high-end) 우선 시장으로 지정. 첫 호주/뉴질랜드 고객 계약이나 배치 대수는 미공개. RaaS(Robot-as-a-Service) 모델로 아태 시장 확장 지속.',
    sourceName: 'News Today World / PR Newswire / Manila Times',
    sourceUrl: 'https://newstodayworld.org/breaking-news/2026/11/21/agibot-australian-cloud-node-new-zealand-robots/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    headline: 'Agibot, GO-3 차세대 파운데이션 모델 프리뷰 및 로봇 OS 완전 오픈소스화 연말 목표 발표 — Innovation Day (10/30)',
    summary:
      '2026년 10월 30일 Forbes 보도. AgiBot이 Innovation Day에서 차세대 파운데이션 모델 GO-3를 프리뷰하고, 로봇 운영체제를 연말까지 완전 오픈소스로 전환하겠다고 발표. 동시에 로봇 생산성 측정 단위 "Worken"을 도입하고 중공업용 G2 Max(바퀴 기반, 다리 없는 상반신 형태) 신모델 공개. 누적 범용 로봇 생산 20,000대 돌파. 11월 현재 GO-3 출시 일정 및 오픈소스 로봇 OS 저장소는 미공개.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/10/30/worlds-biggest-humanoid-robot-maker-wants-to-change-how-we-measure-robot-work/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik Apollo ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik, Apollo 2 양산 준비 가속 — Robot Park 확장 훈련 시설에서 DeepMind과 데이터 수집 병행, 바이페달·휠 듀얼 구성 (11월)',
    summary:
      '2026년 11월 Robotics & Automation News 종합 보도. Apptronik이 오스틴 Robot Park 확장 시설에서 Apollo 2의 바이페달(이족보행) 및 휠 베이스 듀얼 구성으로 훈련 데이터를 수집 중. Google DeepMind Gemini Robotics 2.5와 통합된 AI가 Apollo 2의 산업 환경 정밀 조작을 뒷받침. GXO LOI(최대 1,000대, 4년간 RaaS)에 이어 Mercedes-Benz 키팅 작업 96% 성공률 실증이 양산 근거. 2027년 말 북미 배치 시작 예정은 유지.',
    sourceName: 'Robotics & Automation News / Apptronik Official',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
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

export async function insertCiUpdate20261126() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-26) ===\n');

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
        collectedAt: '2026-11-26',
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

insertCiUpdate20261126()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
