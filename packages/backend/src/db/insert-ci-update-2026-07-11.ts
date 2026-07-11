/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-07-11
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-07-11.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-07-11)
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
    headline: 'Tesla Optimus 생산 2026년 7월말~8월 Fremont 공장에서 공식 시작',
    summary: 'Musk 7월 1일 Fremont Optimus 조립라인 방문 팀 사진 공유. Gen 3 생산 시작 임박, 초기 생산 속도는 "극도로 느릴 것"이라고 경고. 10,000개 고유 부품으로 구성된 완전 신규 생산라인.',
    sourceName: 'TrendForce / Teslarati',
    sourceUrl: 'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus 생산라인 모듈형 설계 — VP Lars Moravy 확인',
    summary: 'Tesla VP Lars Moravy: Fremont Optimus 라인은 하드웨어 진화에 맞춰 적응 가능한 모듈형 시스템. 수십 개 라인 증설 가능하며 전통적 고정 설비보다 훨씬 빠른 설치 가능.',
    sourceName: 'Drive Tesla Canada',
    sourceUrl: 'https://driveteslacanada.ca/news/tesla-optimus-production-line-fremont-progress/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Texas Gigafactory 2세대 라인 — 연간 1,000만대 장기 목표',
    summary: 'Fremont 1세대 라인(연간 100만대 용량) 외에 Texas Gigafactory에 2세대 라인 설계 중. 장기 연간 1,000만대 생산 목표. 외부 상업 판매 2026년 $20K~$30K 목표가.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas CES 2026 상용 버전 공개 — 2026년 전 배치 물량 완판',
    summary: 'CES 2026에서 양산형 Atlas 공개. 2026년 전체 배치 물량 이미 완판 — Hyundai RMAC 및 Google DeepMind에 배송 예정.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Google DeepMind × Boston Dynamics 파트너십 — Atlas에 파운데이션 모델 통합',
    summary: 'Google DeepMind 파운데이션 모델을 Atlas에 통합하여 인지 능력 강화. Atlas가 공장 작업에서 범용 지능 징후를 보이고 있다는 보고.',
    sourceName: 'The Robot Report / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 성능 사양: 7.5ft 리치, 110lb 리프팅, -20~40°C 운용',
    summary: '상용 Atlas: 최대 7.5피트 리치, 110파운드(50kg) 리프팅 능력, -4°F~104°F(-20~40°C) 운용 온도 범위. 세탁기(100lb+) 리프팅 테스트 성공.',
    sourceName: 'TechRadar / Boston Dynamics',
    sourceUrl: 'https://www.techradar.com/ai-platforms-assistants/we-have-not-seen-the-limits-of-what-atlas-can-do-boston-dynamics-shows-off-atlas-robots-impressive-fridge-lifting-and-drink-delivery-capabilities-its-only-limited-by-our-imagination',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'BMW, Figure 02 → Figure 03 확대 배치 결정 (2026년 6월)',
    summary: 'BMW Spartanburg 공장 Figure 02 파일럿 성공(11개월, 30,000+대 지원, 90,000+부품, 1,250 운용시간) 후 Figure 03 확대 배치 결정.',
    sourceName: 'BMW Group / Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 사양: 5\'8", 61kg, 20kg 페이로드, 5시간 배터리',
    summary: 'Figure 03 (2025.10 출시): 높이 5\'8", 무게 61kg, 20kg 페이로드, 1.2m/s 보행, 5시간 교체형 2.3kWh 배터리. Helix 자체 LLM 기반 사고 시스템.',
    sourceName: 'Figure AI 공식 / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 로봇 vs 인간 10시간 대결 — 인간 대비 98.5% 성능',
    summary: '2026년 5월 Figure AI 로봇이 거의 1주일간 논스톱 패키지 처리 라이브스트림 후 인간과 10시간 경쟁, 인간 대비 98.5% 성능 달성.',
    sourceName: 'Multiple sources',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 밸류에이션 $39B, 총 펀딩 $1.9B+',
    summary: '2025년말 Series C $1B+ 조달, 밸류에이션 $39B (전년 대비 15배). 총 펀딩 $1.9B+ 달성. 순수 휴머노이드 기업 중 최대 자본력.',
    sourceName: 'Sacra / Tech Market Briefs',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'B',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'optimus', // Note: Unitree not in ci_competitors — using staging
    layerSlug: 'biz',
    headline: '[Unitree] G1 도쿄 하네다공항 Japan Airlines 실증 배치 (세계 최초 공항 휴머노이드)',
    summary: 'Unitree G1 Japan Airlines·GMO Internet Group 파트너십으로 도쿄 하네다 공항 수하물/화물 처리에 상업 배치. 세계 최초 공항 휴머노이드 로봇 상용화 사례. 2028년까지 시범 운영.',
    sourceName: 'Forbes / RobotShop',
    sourceUrl: 'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus', // Unitree — staging
    layerSlug: 'sw',
    headline: '[Unitree] UnifoLM-VLA-0 오픈소스 공개 — 자연어 명령 자율 작업',
    summary: '2026년 3월 Unitree UnifoLM-VLA-0 Vision-Language-Action 모델 오픈소스 공개. 자연어 명령으로 가정 자율 작업 수행 가능.',
    sourceName: 'Unitree 공식 / Community',
    sourceUrl: 'https://community.robotshop.com/blog/show/unitree-robotics-at-ces-2026-a-clear-signal-of-whats-coming-next',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus', // Unitree — staging
    layerSlug: 'biz',
    headline: '[Unitree] 2026년 G1 20,000대 출하 목표, A-share 상장 추진 $580M',
    summary: '2025년 5,500대 출하에서 2026년 20,000대 목표. A-share 상장 2026년 중반 추진, 목표 $580M. 2025년 YoY 매출 335% 성장, 약 60% 마진으로 유일한 흑자 휴머노이드 기업.',
    sourceName: 'Forbes / TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 합병 상장 — 기업가치 $2.5B, Nasdaq "AGLT"',
    summary: 'Churchill Capital Corp XI와 SPAC 합병, 기업가치 $2.5B. $620M+ 현금 확보. 미국 최초 순수 휴머노이드 상장기업. 2026년말 Nasdaq 티커 "AGLT" 거래 예정.',
    sourceName: 'GeekWire / Agility 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit v5 사전 주문 $300M+ — Toyota Canada, Mercado Libre 등',
    summary: 'Digit v5 다년 주문 $300M+ 확보. GXO, Schaeffler, Toyota Motor Manufacturing Canada, Mercado Libre 등 4개 상업 계약. 30+ 고객 파이프라인. 총 65,000+ 운용 시간.',
    sourceName: 'Agility 공식 / GeekWire',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Agility × NVIDIA Halos 안전 시스템 최초 채택 — 안전 울타리 없는 협업',
    summary: 'Agility Robotics, NVIDIA Halos 안전 플랫폼 최초 채택 파트너. Digit v5를 세계 최초 AI 기반 협업 안전 휴머노이드로 포지셔닝. 안전 울타리 없이 인간과 공유 환경 작업.',
    sourceName: 'Agility 공식 / NVIDIA',
    sourceUrl: 'https://www.agilityrobotics.com/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'optimus', // Apptronik not in ci_competitors — staging
    layerSlug: 'biz',
    headline: '[Apptronik] Robot Park 오스틴 개소 — Apollo 2 데이터 수집/학습 허브',
    summary: '2026년 6월 30일 오스틴 Robot Park 개소. Apollo 2 (이족보행 + 바퀴형) 대규모 데이터 수집·학습 거점. Apollo 3 차세대 상용 제품 개발에 직접 활용.',
    sourceName: 'GlobeNewsWire / Apptronik 공식',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/06/30/3319598/0/en/Welcome-to-Robot-Park-Where-Apptronik-s-Apollo-Goes-to-Work-Training-the-Next-Generation-of-Humanoid-Robot-Intelligence.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus', // Apptronik — staging
    layerSlug: 'sw',
    headline: '[Apptronik] Google DeepMind Gemini Robotics 파트너십',
    summary: 'Google DeepMind 연구 파트너십 — Apollo 2 수집 데이터로 Gemini Robotics 파운데이션 AI 모델 발전 지원. Apollo 3에 임베디드 인텔리전스 탑재 목표.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus', // Apptronik — staging
    layerSlug: 'biz',
    headline: '[Apptronik] Series A 총 $935M+ 마감, 기업가치 $5B',
    summary: '2026년 2월 $520M 추가 조달(CNBC), 기업가치 $5B. Series A 총액 $935M+, 총 자본 약 $1B. 파트너: Mercedes-Benz, GXO, Jabil.',
    sourceName: 'CNBC / Apptronik 공식',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 미국 Hayward 공장 개소, 첫해 생산 10,000대 5일 완판',
    summary: '캘리포니아 Hayward 58,000sqft 공장 — 미국 최초 수직통합 휴머노이드 제조시설. 첫해 10,000대 사전주문 5일 완판. 2027년 100,000대 목표.',
    sourceName: 'Forbes / TechFundingNews',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X × EQT 딜: 300+ 포트폴리오 기업에 최대 10,000대 공급 (2026~2030)',
    summary: 'EQT Ventures 300+ 포트폴리오 기업에 2026~2030년간 최대 10,000대 NEO 공급 계약. 제조, 물류, 창고 등 산업용 배치.',
    sourceName: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: 'NEO 소비자 가격 $20,000, 월 렌탈 $499 — 2026년말 출하 예정',
    summary: 'NEO Gamma: 5\'7", 30kg, 5지 핸드, 소프트 3D니트 외장. 가격 $20,000 또는 $499/월 렌탈(6개월 최소). 2026년말 소비자 배송 계획.',
    sourceName: '1X 공식 / eWeek',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    confidence: 'A',
    category: 'production',
  },

  // ── AgiBot ──
  {
    competitorSlug: 'optimus', // AgiBot not in ci_competitors — staging
    layerSlug: 'biz',
    headline: '[AgiBot] 누적 15,000대 생산 돌파 (2026년 6월말)',
    summary: '2026년 6월말 기준 15,000번째 유닛 출하. 2025년 5,100대 출하, Omdia 기준 글로벌 휴머노이드 출하량 1위(39% 시장점유율).',
    sourceName: 'WebProNews / TrendForce',
    sourceUrl: 'https://www.webpronews.com/chinas-agibot-hits-15000-robots-and-eyes-factory-floors-worldwide/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus', // AgiBot — staging
    layerSlug: 'biz',
    headline: '[AgiBot] 글로벌 확장: Minth Group(독일), Singtel(싱가포르)',
    summary: 'AgiBot 해외 진출 — Minth Group(독일), Singtel(싱가포르) 파트너십. 공장, 매장, 사무실 전방위 배치 목표.',
    sourceName: 'CNN Business / WebProNews',
    sourceUrl: 'https://www.cnn.com/2026/06/30/tech/china-humanoid-robot-ai-rental-intl-hnk-dst',
    confidence: 'B',
    category: 'partnership',
  },

  // ── 규제/안전 동향 ──
  {
    competitorSlug: 'digit', // industry-wide, linking to Digit as it's most active
    layerSlug: 'safety',
    headline: 'ISO 10218:2025 발효 — 휴머노이드 인증 요건 대폭 강화',
    summary: 'ISO 10218-2:2025 안전 요구사항 28→50페이지로 3배 확대. 인증 대상이 하드웨어에서 협업 애플리케이션으로 전환. 보행 로봇 낙하 구역 계산 의무화.',
    sourceName: 'IDEC USA / DC Velocity',
    sourceUrl: 'https://www.dcvelocity.com/material-handling/robotics/report-automation-sector-sets-safety-standards-for-humanoid-robots',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'EU 기계규정 2023/1230 — 안전 기능 사이버보안 의무화',
    summary: 'EU Machinery Regulation 2023/1230: 안전 기능 관련 사이버보안 의무화, 고위험 기계 제3자 평가 확대. ISO 25785-1 (동적 안정 로봇 전용) 개발 중.',
    sourceName: 'IEEE Spectrum / Kite Compliance',
    sourceUrl: 'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards',
    confidence: 'A',
    category: 'regulation',
  },
];

// ============================================
// 삽입 실행
// ============================================

async function main() {
  console.log(`\n=== CI 데이터 업데이트 시작: ${new Date().toISOString()} ===\n`);

  const competitors = await db.select().from(ciCompetitors);
  const layers = await db.select().from(ciLayers);

  const competitorMap = new Map(competitors.map((c) => [c.slug, c.id]));
  const layerMap = new Map(layers.map((l) => [l.slug, l.id]));

  let alertCount = 0;
  let stagingCount = 0;
  let skipCount = 0;

  for (const item of collectedData) {
    const competitorId = competitorMap.get(item.competitorSlug) ?? null;
    const layerId = layerMap.get(item.layerSlug) ?? null;

    // ci_monitor_alerts에 중복 확인 (같은 headline)
    const existing = await db
      .select()
      .from(ciMonitorAlerts)
      .where(eq(ciMonitorAlerts.headline, item.headline));

    if (existing.length > 0) {
      console.log(`  [SKIP] 이미 존재: ${item.headline.slice(0, 50)}...`);
      skipCount++;
      continue;
    }

    // ci_monitor_alerts 삽입
    await db.insert(ciMonitorAlerts).values({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      headline: item.headline,
      summary: item.summary,
      competitorId,
      layerId,
      detectedAt: new Date(),
      status: 'new',
    });
    alertCount++;

    // ci_staging에도 구조화 데이터 대기
    await db.insert(ciStaging).values({
      updateType: 'alert',
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        category: item.category,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        collectedAt: new Date().toISOString(),
      },
      sourceChannel: 'auto-crawl',
      status: 'pending',
      createdAt: new Date(),
    });
    stagingCount++;

    console.log(`  [OK] ${item.confidence} | ${item.competitorSlug} | ${item.headline.slice(0, 60)}...`);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  삽입: ${alertCount} alerts, ${stagingCount} staging`);
  console.log(`  스킵: ${skipCount} (중복)`);
  console.log(`  총 처리: ${collectedData.length}건\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
