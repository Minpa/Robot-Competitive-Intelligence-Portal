/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-14
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-14.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-14)
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
    headline: 'Tesla Optimus 생산 Q2→Q3 2026 수백 대/주 달성 — Fremont 양산 10배 증가, Giga Texas 전용 공장 건설 중',
    summary: 'The Information 보도에 따르면 Tesla Optimus 생산이 Q2 2026 수십 대/주에서 Q3 8월까지 수백 대/주로 약 10배 증가. Giga Texas에 전용 Optimus 공장을 건설 중이며, 장기 목표는 주당 20,000대. $30B 신규 크레딧 라인을 확보하여 AI 투자 및 Optimus/Cybercab 양산 가속화. 삼성, TSMC, 파나소닉, 마이크론이 칩·배터리·메모리 공급 파트너. 중국 내 부품 공급사 인증도 진행 중.',
    sourceName: 'The Information / TechRepublic / Tesery',
    sourceUrl: 'https://www.techrepublic.com/article/news-tesla-optimus-robot-production-2027-sales-timeline/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus 핸드 양산 병목 — 100+ 소형 부품 수작업 조립, 공급사·장비 부족으로 생산 제약',
    summary: 'The Next Web/Futurism 보도에 따르면 Optimus 핸드가 양산 최대 병목. 각 손·전완부에 100개 이상의 소형 부품이 필요하며 작업자가 수작업으로 조립. 공장 장비와 공급사 부족이 생산 확대를 제약. Musk는 "초기 S커브의 생산 램프가 처음에는 매우 느릴 것"이라 경고. Optimus Gen 3은 Q1 2026 실적 발표에서 양산 시작에 가까운 시기에 공개 예정이라 밝혔으나, 9월 기준 미공개 상태.',
    sourceName: 'The Next Web / Futurism / Teslarati',
    sourceUrl: 'https://thenextweb.com/news/tesla-optimus-production-hands-suppliers',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics Atlas CES 2026 양산 버전 공개 — 2026년 배치분 전량 예약 완료, Hyundai·DeepMind 우선 납품',
    summary: 'Boston Dynamics가 CES 2026에서 프로덕션 Atlas를 공개. 보스턴 본사에서 즉시 양산 개시. 2026년 배치분은 Hyundai RMAC(로봇 메타플랜트)과 Google DeepMind에 전량 예약 완료. 2027년 초 추가 고객 확대 계획. 자율 충전 스테이션 이동, 배터리 자가 교체, 자재 핸들링~주문 이행까지 엔터프라이즈급 작업 수행. Hyundai $26B 투자로 연 30,000대 생산 용량의 로봇 공장 건설.',
    sourceName: 'Robotics247 / Decrypt / New Atlas / Forbes',
    sourceUrl: 'https://www.robotics247.com/article/ces-2026-boston-dynamics-unveils-new-atlas-humanoid-robot',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Google DeepMind Gemini Robotics × Atlas 통합 — Atlas 플랫폼에 Gemini 로보틱스 모델 적용',
    summary: 'Google DeepMind가 Gemini Robotics 모델을 Boston Dynamics Atlas 플랫폼에 통합. Atlas의 물리적 능력과 DeepMind의 AI 역량을 결합하여 산업 환경에서의 자율 작업 범위를 확장. 기존 프로그래밍 기반 접근에서 AI 기반 적응형 행동으로 전환. CES 2026 이후 두 회사 간 전략적 AI 파트너십 심화.',
    sourceName: 'Robotics247 / New Atlas',
    sourceUrl: 'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure Helix 2.5 발표 (9/17) — 사전학습만으로 미지 가정환경 작업 56% 성공, 비사전학습 대비 6.2배',
    summary: 'Figure AI가 9월 17일 Helix 2.5를 발표. 인간 행동 데이터 대규모 사전학습 기반으로, 추가 학습 없이 처음 방문한 가정에서 거실 정리, 수건 접기, 침대 정리 등 56%의 작업을 완수. 사전학습 없는 경우(9%) 대비 6.2배 향상. 5월에는 200시간 자율 택배 분류 라이브스트림으로 약 250,000개 패키지를 처리.',
    sourceName: 'Telltale Signals (Substack) / AI Robotic Daily',
    sourceUrl: 'https://endoflabor.substack.com/p/telltale-signals-october-2026',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI $39B 시리즈 C 자금 조달 및 Nscale 전략적 파트너십 — $3.5B GPU 인프라 투자',
    summary: '10월 보도에 따르면 Figure AI가 $39B 시리즈 C를 완료(일부 출처는 시리즈 B $2.6B+ 밸류에이션으로 상충). Nscale과 전략적 파트너십을 체결하여 NVIDIA Vera Rubin 플랫폼 기반 최대 100,000 GPU 배포, 초기 $3.5B 투자 커밋. Catalyst Brands와 리테일 물류 상용 계약 체결(네바다주 리노 시작). BMW 라인에서 Figure 03이 실부품 분류 작업 수행 중.',
    sourceName: 'Startup Fortune / AI Herald / Humanoids Daily',
    sourceUrl: 'https://startupfortune.com/figure-ais-former-safety-engineer-says-its-home-robot-can-fracture-a-skull/',
    confidence: 'C',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'safety',
    headline: 'Figure AI 전직 안전 엔지니어 내부고발 소송 — F.02 ISO 통증 임계값 20배 초과 주장',
    summary: '전직 안전 엔지니어 Robert Gruendel이 내부고발 소송을 제기. F.02가 ISO 통증 임계값의 20배를 초과하는 힘을 발생시킬 수 있으며, 두개골 골절 가능한 충격력을 보유한다고 주장. 또한 신뢰할 수 있는 존재 감지(presence sensing)가 부재하다고 지적. Figure AI의 공식 응답은 현재 검색 결과에 포함되지 않아 미확인.',
    sourceName: 'Startup Fortune',
    sourceUrl: 'https://startupfortune.com/figure-ais-former-safety-engineer-says-its-home-robot-can-fracture-a-skull/',
    confidence: 'C',
    category: 'regulation',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 상하이 STAR Market IPO 신청 (3월) — 2025년 5,500+ 휴머노이드 출하, 매출 335% 성장, 밸류에이션 ~$7B',
    summary: 'Unitree가 3월 상하이 STAR Market IPO를 신청. 신고서 기반 2025년 5,500+ 휴머노이드 출하, 매출 약 335% 성장 기록. 글로벌 휴머노이드 단위 출하 점유율 32.4% 주장(Omdia는 AgiBot 39%로 이의). Unitree 공식 사이트에서는 2025년 출하량 데이터를 외부에 공개한 적 없다고 반박. IPO 목표 $580-610M, 밸류에이션 약 $7B 추정.',
    sourceName: 'Unitree IPO Filing / The Standard / RoboZaps',
    sourceUrl: 'https://thestandard.com.hk/innovation/article/345248/Unitrees-Wang-Xingxing-sees-tipping-point-for-embodied-robots-mass-commercial-adoption-within-12-years',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree 미 국방부 1260H 리스트 등재(6월) + FCC 외국산 로봇 금지(7월) — 미국 시장 접근 제한 강화',
    summary: '미 국방부가 6월 Unitree를 1260H 리스트(중국 군사기업 목록)에 등재, DoD 조달 제한. 7월 FCC가 외국산 휴머노이드·쿼드러펫 로봇 장비 인가를 금지하여 신규 모델 미국 시장 진입 차단(기존 인가 모델은 판매 가능). UniPwn 블루투스 취약점(2025년 9월 공개)이 G1, H1, B2, Go2에 영향, 2026년 7월 기준 H1 전용 패치 미발표. IFA 2026에서 미해결 보안 문제 속 G1 전시.',
    sourceName: 'Humanoid Guide / CNBC / ABC News',
    sourceUrl: 'https://humanoid.guide/unitree-exhibits-g1-at-ifa-amid-unresolved-security-questions/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility SPAC 합병으로 상장 추진 — 미국 최초 순수 휴머노이드 로봇 상장사, 세일럼 공장 연 10,000대 생산 용량',
    summary: 'Agility가 SPAC 합병을 통해 상장을 추진. SEC 등록이 유효화되었으며, 합병 완료 시 미국 최초의 순수 휴머노이드 로봇 상장 기업이 될 전망. 오레곤주 세일럼 공장은 연 최대 10,000대 생산 용량 보유. 현재 GXO(Spanx 시설), Toyota Motor Manufacturing Canada, Mercado Libre, Schaeffler 등 9개 고객 사이트에 배치. 추정 글로벌 설치대수 40~150대(비공식). 2026년 말 합병 완료 목표.',
    sourceName: 'BusinessWire / Unite.AI / WWD',
    sourceUrl: 'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility → "Agility"로 사명 변경 (3/5) — 휴머노이드 너머 다양한 유스케이스 확장 선언',
    summary: 'Agility Robotics가 3월 5일 "Agility"로 사명을 변경. 휴머노이드 로봇에서 확장된 다양한 이머징 유스케이스에 대한 비전을 반영. Digit 5가 차세대 제품으로, 표준화/자가교환 엔드이펙터, 안전 펜싱 불필요 설계, NVIDIA Halos 기반 협력안전 아키텍처를 탑재. 얼리 액세스 2027 상반기, GA 2027년 말 예정.',
    sourceName: 'BusinessWire',
    sourceUrl: 'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 시리즈 A 총 $935M 달성 (2/11) — 신규 $520M 익스텐션, 밸류에이션 $5-5.5B, QIA·John Deere 신규 투자',
    summary: 'Apptronik이 2월 $520M 시리즈 A-X 익스텐션을 마감하여 시리즈 A 총액 $935M 달성. 기존 투자자 B Capital, Google, Mercedes-Benz, PEAK6에 더해 AT&T Ventures, John Deere, 카타르 투자청(QIA)이 신규 참여. CNBC 보도 밸류에이션 $5B, Bloomberg $5.5B 이상으로 상충. 자금은 Austin 생산 확대, 캘리포니아 신규 오피스, Apollo 글로벌 상용/파일럿 배치 확장에 사용.',
    sourceName: 'CNBC / Forbes / Bloomberg / Interesting Engineering',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik–Google DeepMind Gemini Robotics 전략적 파트너십 — 차세대 Apollo에 Gemini 탑재',
    summary: 'Apptronik이 Google DeepMind와 업계 선도적 전략적 파트너십을 체결. Gemini Robotics 기반으로 차세대 휴머노이드 로봇을 공동 개발. Apollo 유닛이 현재 Mercedes-Benz, GXO Logistics, Jabil의 공장·창고에서 지정 영역 내 작업 중. 6월 30일 Austin에 90,000 sq ft 확장 Robot Park(데이터 수집·학습 시설) 개소, Apollo 2를 바이페달·휠 베이스 양 구성으로 공식 발표(미확인).',
    sourceName: 'Interesting Engineering / Apptronik / Inside Deep Tech',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO Hayward 공장 풀스케일 생산 개시 (4/30) — 1년차 10,000대 용량, 17,000+ 모터 자체 생산',
    summary: '1X Technologies가 4월 30일 캘리포니아 Hayward 58,000 sq ft 시설에서 NEO 풀스케일 생산을 개시. 모터·배터리 등 핵심 부품을 자체 생산하여 외부 공급 의존 최소화. 1년차 생산 용량 10,000대, 200+ 직원. 오픈 이래 17,000개 모터를 생산. San Carlos에 제2 시설이 올해 가동 예정이며, 2027년 말까지 연 100,000대 확장 목표.',
    sourceName: 'Forbes / Yahoo Finance / Ground News',
    sourceUrl: 'https://finance.yahoo.com/sectors/technology/articles/1x-opens-neo-factory-hayward-144700525.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 사전주문 10,000대 5일 만에 완판 — $20,000 얼리액세스 또는 $499/월 구독, 2026년 미국 첫 인도',
    summary: '1X NEO 사전주문이 2025년 10월 오픈 후 5일 만에 10,000대 완판. 얼리 액세스 $20,000(보증금 $200)으로 2026년 우선 인도 또는 $499/월 구독 모델. 미국 시장 우선 인도, 2027년부터 해외 확장. EQT와 2026~2030년 글로벌 포트폴리오에 최대 10,000대 배포 계약. 7월 기준 검증된 소비자 인도 실적은 미확인. 현재 Hayward 공장 산출물은 내부 사용 및 연구용.',
    sourceName: 'Heise / Robot Report / RoboZaps',
    sourceUrl: 'https://www.therobotreport.com/1x-announces-pre-order-launch-neo-humanoid-robot/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 9월 누적 20,000대 생산 돌파 — 홍콩 IPO 준비, LG전자 투자 참여',
    summary: '9월 2026년 Agibot이 누적 20,000번째 로봇 생산 달성(단일 출처, 확인 필요). 7월부터 홍콩 IPO 준비 진행 중. LG전자와 Mirae Asset이 전략적 투자에 참여(규모 비공개). 2025년 Fulin Precision Engineering에 약 100대 휴머노이드 제조 플랜트 납품 실적. Shanghai Swancor Advanced Materials 63.62% 지분 인수(2025). Omdia 기준 글로벌 휴머노이드 출하 점유율 39% 주장.',
    sourceName: 'Reuters / Seedtable / Tracxn / Origin of Bots',
    sourceUrl: 'https://www.originofbots.com/news/agibot-deploys-over-300-humanoid-robots-at-chimelong-spaceship-park-following-20000th-unit-milestone',
    confidence: 'C',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot 링시 X1 오픈소스 공개 예정 — 설계도면·SW 프레임워크·모션 컨트롤 소스코드 포함',
    summary: 'Agibot이 8월 Lingxi X1 포함 5개 휴머노이드 라인업을 공개. X-Lab을 통해 Lingxi X1의 설계도면, SW 프레임워크, 모션 컨트롤 소스코드를 곧 오픈소스로 공개 예정(약 9개월 전 발표, 실제 공개 여부 확인 필요). G1 가격 $13,500 대비 Agibot은 다양한 폼팩터(서비스/산업/가정용)로 시장 포지셔닝. 5개 모델 동시 공개로 제품 라인업 폭 업계 최대 수준.',
    sourceName: 'KR-Asia / Crunchbase',
    sourceUrl: 'https://kr-asia.com/agibot-unveils-five-humanoid-robots-commercialization-on-the-horizon',
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

export async function insertCiUpdate20261014() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-14) ===\n');

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
        collectedAt: '2026-10-14',
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

insertCiUpdate20261014()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
