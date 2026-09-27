/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-27
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-27.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-27)
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
    headline: 'Tesla Optimus 주당 수백 대 생산 달성, 그러나 핸드 설계·AI 범용성 병목 직면',
    summary: 'Tesla가 2026년 9월 25일 기준 Optimus 생산량을 Q2 대비 약 10배 증가시켜 주당 수백 대 생산 달성. 그러나 핸드·전완부에 100개 이상 소형 부품의 정밀 조립 요구와 불안정한 센서, 재작업 문제로 자동화 병목 발생. AI 범용성도 미확보 상태로, 특정 태스크 외 일반화 능력 부족. 연말까지 주당 1,000대, 장기 20,000대/주 목표.',
    sourceName: 'Electrek / Gizmodo / CryptoBriefing',
    sourceUrl: 'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 공급망 감사 후 주당 1,000대 → 연말 2,500대 목표 — Fremont 라인 전환, Giga Texas 신공장',
    summary: 'DigiTimes 9월 21일 보도에 따르면 Tesla 로보틱스팀이 9월 16~17일 닝보 방문 후 Tuopu·Joyson·Sanhua 3사 양산 인증 완료. Fremont Model S/X 라인을 Optimus Gen 3 전용으로 전환, 연간 100만대 용량. Giga Texas 2세대 공장 착공으로 장기 연 1,000만대 목표. 10,000개 고유 부품의 신규 라인으로 초기 생산 속도 "예측 불가".',
    sourceName: 'DigiTimes / NextBigFuture',
    sourceUrl: 'https://www.digitimes.com/news/a20260921PD235/tesla-production-optimus-robot-supply-chain.html',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics, Hyundai 조지아 메타플랜트에 RMAC 개소 — Atlas 자동차 생산 태스크 훈련 개시',
    summary: '2026년 9월 21일 Boston Dynamics가 Hyundai Motor Group Metaplant America(HMGMA) 내 Robotics Metaplant Application Center(RMAC) 정식 개소. Atlas 로봇이 부품 물류·시퀀싱 작업 학습 중이며, 2030년까지 컴포넌트 조립으로 확대 예정. 2027년 현재 시설 대비 10배 규모 신축 건물로 이전 계획. Hyundai·Kia 전 공장 25,000대 로봇 배치 및 연간 30,000대 생산 공장 건설 목표.',
    sourceName: 'Boston Dynamics / The Robot Report / AI Insider',
    sourceUrl: 'https://bostondynamics.com/news/boston-dynamics-opens-robotics-metaplant-application-center-to-train-humanoid-robots-for-manufacturing-tasks/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics, 제조·항공우주·반도체·물류·식음료·생명과학 분야로 Atlas 적용 확대 예고',
    summary: 'RMAC 개소와 함께 Boston Dynamics가 자동차 생산 외 제조, 항공우주, 반도체, 물류, 식음료, 생명과학 분야로 Atlas 적용 범위를 확장할 계획 발표. 현재 2026년 생산분 전량 배치 확정 상태이며, Google DeepMind와의 embodied AI 파트너십을 통해 범용 AI 자율 작업 역량 강화 추진 중.',
    sourceName: 'The Robot Report / Forbes',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-opens-metaplant-application-center-train-atlas-humanoid-robots/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure AI BotQ에서 Figure 03 1,000대 생산 달성 — 시간당 1대 생산율, BMW 40대 배치 확대',
    summary: '2026년 7월 23일 Figure AI가 BotQ 공장에서 1,000번째 Figure 03 생산 달성. 하루 1대에서 시간당 1대로 생산율 급증, 연간 12,000대 용량. BMW Spartanburg에 Figure 03 40대 배치하여 추가 워크스테이션으로 확대 중. Figure 02는 BMW에서 11개월간 30,000대 X3 생산에 기여, 1,250+ 가동시간 기록.',
    sourceName: 'Figure AI / iIoT World / Manufacturing Digital',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 백악관 행사 출연, Figure 03 가정용 알파 테스트 진행 — $39B 밸류에이션',
    summary: 'Figure 03가 백악관 행사에 출연하며 가정용 로봇으로의 확장 가능성 시연. BMW Spartanburg 물류 시퀀싱 파트너십 지속 및 사다리 등반 역량 데모. Series C $1B+ 조달로 $39B 밸류에이션 확정, Nvidia·Intel Capital·LG Technology Ventures 등 참여.',
    sourceName: 'Time / Yahoo Finance / Sacra',
    sourceUrl: 'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 첫날 460% 급등, 시총 ~$50B — IPO 가격 150.8위안, $905M 조달',
    summary: '2026년 8월 19일 Unitree Robotics(688836.SH) STAR Market 상장 첫날 주가 460% 급등, 종가 845위안으로 시총 약 $50B. IPO 가격 150.8위안, 총 6.1B위안($905M) 조달. 전략적 투자자에 DeepSeek 포함. 2025년 5,500대+ 휴머노이드 출하 글로벌 1위. H2 상용 $29,000, G1 $16,000 라인업.',
    sourceName: 'CNBC / Yahoo Finance / KraneShares',
    sourceUrl: 'https://finance.yahoo.com/markets/stocks/articles/unitree-robotics-stock-soars-460-111514463.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Morgan Stanley, Unitree 2026년 중국 판매 28,000대로 2배 상향 — H2 Plus $100K 풀 라인업',
    summary: 'Morgan Stanley가 Unitree의 2026년 중국 휴머노이드 판매 예측을 28,000대로 2배 상향 조정. R1 $4,900부터 H2 Plus $100K까지 풀 라인업 완비. 다만 IPO 이후 고점 대비 50%+ 주가 조정 발생. Unitree G1은 2025년 글로벌 판매 점유율 32%로 세계 최다 판매.',
    sourceName: 'eWeek / RoboZaps',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit 5 공개 — 페이로드 50lbs, 충전 10:1 비율, "최초 협력 안전 휴머노이드" 표방',
    summary: '2026년 9월 21일 Agility Robotics가 Digit 5 공개. 리프트 50lbs(Digit 4 대비 40%↑), 높이 5ft 11in(284lbs), 리치 7.2ft. 충전 9분 → 90분 가동(10:1 비율, Digit 4는 2:1). 20시간/일 가동. ISO 표준 마운팅 플랜지로 그리퍼 교체 가능. 사람 접근 시 자동 크라우치 안전 모드로 "최초 협력 안전 휴머노이드" 표방.',
    sourceName: 'GeekWire / Manufacturing Dive / Agility Robotics',
    sourceUrl: 'https://www.manufacturingdive.com/news/agility-debuts-safe-humanoid-digit-5-fanuc-universal-robot/830880/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $2.5B SPAC 합병 S-4 등록문서 제출 — AGLT 티커, Digit 5 양산 확대 자금',
    summary: 'Agility Robotics와 Churchill Capital Corp XI의 $2.5B SPAC 합병이 SEC S-4 등록문서 제출 단계 진입. Nasdaq "AGLT" 티커, 2026년 말 마감 예상. 조달 자금으로 Digit 5 양산 확대, 기존 고객 주문($300M+) 이행, 오레곤 RoboFab(연 10,000대 용량) 확장 및 캘리포니아 Fremont HW/AI 허브 구축 예정.',
    sourceName: 'SEC Filing / BusinessWire / Agility Robotics',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026097764/ea0297114-04.htm',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik Apollo 2 공개 — 바이페달/휠 듀얼 구성, Artemis 제어 스택 + Fleet Connect 플릿 SW',
    summary: '2026년 6월 Apptronik이 Apollo 2를 공개. 바이페달 또는 휠베이스 듀얼 구성 가능, Artemis 제어 스택과 Fleet Connect 플릿 관리 소프트웨어 탑재. Robot Park Austin(90,000sqft)에서 텔레오퍼레이션+자율 데이터 수집 플랫폼으로 활용. Apollo 3는 2026년 내 데뷔 예정.',
    sourceName: 'Automate.org / RoboZaps',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik IMTS 2026 출전, 누적 $935M+ Series A 마감 — John Deere·AT&T·QIA 참여',
    summary: 'Apptronik이 2026년 9월 14~19일 IMTS(시카고 국제제조기술쇼)에 출전, Apollo 휴머노이드 시연. 2026년 2월 $520M Series A-X 후 추가 조달로 Series A 총 $935M+ 마감. 신규 투자자 AT&T Ventures, John Deere, Qatar Investment Authority. Mercedes-Benz·GXO·Jabil 등과 파일럿 지속 확대 중.',
    sourceName: 'IMTS / Apptronik / CNBC',
    sourceUrl: 'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 핸드 업그레이드 — 25 DOF 텐던 구동, 촉각 슬립 감지 핑거팁, 초도 고객 유닛 탑재',
    summary: '2026년 7월 9일 1X Technologies가 NEO 핸드 업그레이드 발표. 25 자유도 텐던 구동 설계, 슬립 감지 촉각 핑거팁 적용, 초도 고객 출하 유닛부터 탑재. NEO Gamma 본체: 5ft 7in, 66lbs, 소프트 3D 니트 외장, 작동 소음 22dB(냉장고 수준). $20,000(구매) 또는 $499/월(6개월 최소).',
    sourceName: '1X Technologies / RoboZaps / eWeek',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 캘리포니아 공장 가동, 사전주문 5일 완판 — 2026년 말 고객 출하 시작 예정',
    summary: '1X Technologies가 캘리포니아 Hayward 공장에서 NEO 풀스케일 생산 개시. 초년도 10,000대 용량, 사전주문 5일 만에 완판. 2026년 말 미국 소비자 첫 출하 시작 예정이나, 7월 기준 "올해 받는 분도 있고, 나중에 받는 분도 있다"로 일부 지연 가능성 시사. EQT와 2026~2030년 산업용 10,000대 납품 계약.',
    sourceName: 'Forbes / Sifted / TechCrunch',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 공동창업자 야오마오칭, "휴머노이드 AI 3~5년 내 GPT-3.5 모멘트 도달" — Fortune Leaders Forum',
    summary: '2026년 9월 14일 Fortune Leaders Forum(마카오)에서 Agibot 공동창업자 Yao Maoqing이 "embodied AI가 3~5년 내 GPT-3.5 모멘트에 도달할 것"이라 전망. 일상 태스크 80~90% 성공률 달성 시점으로 정의. 6월 라이브스트림에서 64,000+ 제조 태스크 99.99% 성공률 시연.',
    sourceName: 'Fortune / Agibot',
    sourceUrl: 'https://fortune.com/2026/09/14/humanoids-gpt-3-5-moment-agibot/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 절차 착수, 밸류에이션 HK$40~50B($5.1~6.4B) — 2026 Q3 상장 목표',
    summary: 'Agibot이 2026년 7월 홍콩 IPO 절차를 공식 착수, 2026년 Q3 상장 목표. 밸류에이션 HK$40~50B(약 $5.1~6.4B). 2026 상반기 9,700대 출하로 글로벌 1위(43%), 누적 15,000대 생산. A3 Ultra(51 DOF), X2 Edu, G2 Max, OmniHand 3 풀 라인업 공개.',
    sourceName: 'TechNode / Cryptopolitan / Capital.com',
    sourceUrl: 'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
    confidence: 'A',
    category: 'funding',
  },

  // ── 글로벌 규제/안전 동향 ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: '가정용 휴머노이드 안전 표준 전환 — ISO 개인 돌봄 로봇 표준 12년 만에 개정 착수',
    summary: 'IEEE Spectrum 9월 보도: ISO가 12년 된 개인 돌봄 로봇 안전 표준(ISO 13482)을 개정 착수. 가정용 휴머노이드(NEO, Figure 03 등) 확산에 따라 위험 식별·위험 평가·사용 시나리오 업데이트 필요. 그러나 테스트 방법·한도 설정·집행 메커니즘은 미포함. 중국은 "휴머노이드 표준 체계(2026판)" 발표, EU Machinery Reg 2027.1 적용 예정.',
    sourceName: 'IEEE Spectrum / RoboticsBiz / RoboSelect360',
    sourceUrl: 'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards',
    confidence: 'B',
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

export async function insertCiUpdate20260927() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-27) ===\n');

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
        collectedAt: '2026-09-27',
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

insertCiUpdate20260927()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
