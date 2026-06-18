#!/usr/bin/env node
/**
 * ARGOS 경쟁사 데이터 자동 업데이트 - 2026-06-18
 * 실행: node scripts/ci-update-2026-06-18.mjs
 */
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TODAY = '2026-06-18';

const alerts = [
  // ── Tesla Optimus ──
  {
    source_name: 'Electrek / TechTimes',
    source_url: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    headline: 'Tesla, Fremont 공장 Model S/X 라인을 Optimus 로봇 생산라인으로 전환 – 2026년 7~8월 생산 개시',
    summary: 'Tesla가 Fremont 공장의 Model S/X 생산라인을 Optimus Gen 3 로봇 생산 시설로 전환. 2026년 7~8월 생산 시작 예정이며 연간 100만 대 생산 목표. 초기 생산량은 매우 제한적이며 단가 $60,000+ 예상.',
    competitor_slug: 'tesla-optimus',
    layer_slug: 'production',
    confidence: 'A',
  },
  {
    source_name: 'The Robot Report',
    source_url: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    headline: 'Tesla, Giga Texas에 제2 Optimus 공장 건설 – 연 1,000만 대 목표, 2027년 여름 가동',
    summary: 'Giga Texas에 차세대 Optimus 생산 공장 건설 중. 2027년 여름 가동 목표, 장기적으로 연간 1,000만 대 생산 규모. 12개 이상의 중국 기업이 Tier 1/2 공급업체로 인증.',
    competitor_slug: 'tesla-optimus',
    layer_slug: 'supply-chain',
    confidence: 'B',
  },
  {
    source_name: 'Yahoo Finance',
    source_url: 'https://finance.yahoo.com/sectors/technology/articles/teslas-optimus-could-drive-huge-120057147.html',
    headline: 'Tesla Optimus, 2026년 외부 기업 대상 초기 판매 시작 가능 – 애널리스트 전망',
    summary: '애널리스트들은 Tesla가 2026년 내 외부 기업 대상 Optimus 초기 판매를 시작할 가능성이 있다고 전망. 양산 규모 확대에 따라 막대한 수익 증대 기대.',
    competitor_slug: 'tesla-optimus',
    layer_slug: 'commercial',
    confidence: 'B',
  },

  // ── Boston Dynamics Atlas ──
  {
    source_name: 'Engadget / Robotics 24/7',
    source_url: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    headline: 'Boston Dynamics, CES 2026에서 양산형 Atlas 공개 – 2026년 전 물량 사전 계약 완료',
    summary: 'CES 2026에서 완전 전동식 양산형 Atlas 공개. 7.5ft 도달 범위, 110lbs 리프트, 자동 배터리 교체 기능. 2026년 전 배치 물량이 Hyundai RMAC과 Google DeepMind에 사전 계약 완료.',
    competitor_slug: 'boston-dynamics-atlas',
    layer_slug: 'product',
    confidence: 'A',
  },
  {
    source_name: 'The Robot Report',
    source_url: 'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
    headline: 'Boston Dynamics-Google DeepMind 파트너십 – Atlas에 파운데이션 모델 통합',
    summary: 'Boston Dynamics와 Google DeepMind가 차세대 Atlas에 Google의 파운데이션 모델을 통합하는 새로운 파트너십 발표. 로봇의 인지 능력 대폭 향상 목표.',
    competitor_slug: 'boston-dynamics-atlas',
    layer_slug: 'ai-software',
    confidence: 'A',
  },
  {
    source_name: 'Robotics & Automation News',
    source_url: 'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    headline: 'Atlas, AI 기반 전신 제어로 세탁기급 중량물(100lbs+) 리프트 시연',
    summary: '2026년 5월, Boston Dynamics가 Atlas의 AI 기반 whole-body control로 100파운드 이상 가전제품 리프팅 시연 영상 공개. 시뮬레이션에서 실기 전이(sim-to-real) 기술 활용.',
    competitor_slug: 'boston-dynamics-atlas',
    layer_slug: 'demo',
    confidence: 'A',
  },

  // ── Figure AI ──
  {
    source_name: 'Figure AI (공식)',
    source_url: 'https://www.figure.ai/news/series-c',
    headline: 'Figure AI, Series C $1B+ 조달 ($39B 밸류에이션) → Series D $48B (2026년 6월)',
    summary: 'Figure AI가 Series C에서 $1B 이상을 $39B 밸류에이션으로 조달. Parkway VC 리드, NVIDIA·LG Technology Ventures·Intel Capital·Qualcomm Ventures 등 참여. 2026년 6월 Series D는 $48B 밸류에이션으로 마감.',
    competitor_slug: 'figure-02',
    layer_slug: 'funding',
    confidence: 'A',
  },
  {
    source_name: 'Forge Global / KraneShares',
    source_url: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    headline: 'Figure AI, Amazon 20,000대 창고 배치 진행 중 – 월 1,200+ 대 생산, Q4 5,000대/월 목표',
    summary: 'Amazon 창고에 Figure 02 20,000대 배치 진행 중. 현재 월 1,200대 이상 생산, 2026년 Q4까지 월 5,000대 목표. Figure 03 프로토타입은 조작·내비게이션 벤치마크에서 50% 속도 향상 달성.',
    competitor_slug: 'figure-02',
    layer_slug: 'production',
    confidence: 'B',
  },
  {
    source_name: 'Figure AI (공식)',
    source_url: 'https://www.figure.ai/news',
    headline: 'Figure 로봇 vs 인간 10시간 경쟁 – 로봇이 인간 대비 98.5% 성능 달성',
    summary: '2026년 5월, Figure AI가 로봇과 인간 간 10시간 패키지 처리 경쟁을 라이브 스트리밍. 로봇이 인간 작업자 대비 98.5% 성능을 기록하며 상용 수준의 능력 입증.',
    competitor_slug: 'figure-02',
    layer_slug: 'demo',
    confidence: 'A',
  },

  // ── Unitree ──
  {
    source_name: 'Robozaps / BotInfo',
    source_url: 'https://blog.robozaps.com/b/unitree-g1-review',
    headline: 'Unitree G1, 2026년 20,000대 출하 목표 – 2025년 5,500대 출하 이후 대폭 증산',
    summary: 'Unitree G1이 2025년 5,500대 출하에 이어 2026년 20,000대 출하 목표로 대폭 증산. G1 EDU는 대학 연구용 풀바디 휴머노이드 중 가장 널리 사용되는 플랫폼.',
    competitor_slug: 'unitree-h1',
    layer_slug: 'production',
    confidence: 'B',
  },
  {
    source_name: 'Automate.org',
    source_url: 'https://www.automate.org/robotics/industry-insights/unitrees-55-pound-humanoid-costs-6-000-can-cartwheel',
    headline: 'Unitree H2 출시 및 R1($6,000 초경량 휴머노이드) 공개',
    summary: 'Unitree H2: 2025년 10월 출시, $40,900(상용)/$68,900(EDU), 2,070 TOPS 컴퓨팅. R1: 55lbs, $6,000 미만 초저가 모델. G1-D 변형: 바퀴 구동 기반 데이터 수집 전용 모델.',
    competitor_slug: 'unitree-h1',
    layer_slug: 'product',
    confidence: 'A',
  },
  {
    source_name: 'Multiple Sources',
    source_url: 'https://robocloud-dashboard.vercel.app/learn/blog/unitree-g1-h1-humanoid-robot',
    headline: 'Unitree G1, 일본항공·GMO – 하네다공항 화물 취급 상업 배치 (최초 공항 휴머노이드 배치)',
    summary: 'Unitree G1이 Japan Airlines 및 GMO Internet Group과 파트너십으로 도쿄 하네다 공항에서 화물·수하물 취급에 상업 배치. 2028년까지 시험 운영 예정. 휴머노이드 로봇의 첫 상업 공항 배치.',
    competitor_slug: 'unitree-h1',
    layer_slug: 'commercial',
    confidence: 'B',
  },
  {
    source_name: 'TechFundingNews',
    source_url: 'https://en.wikipedia.org/wiki/Unitree_Robotics',
    headline: 'Unitree, 2026년 중반 A주 IPO 추진 – 목표 $580M',
    summary: 'Unitree Robotics가 2026년 중반 중국 A주 상장을 추진 중. 목표 시가총액 $580M. 2025년 매출 ¥1.708B (전년 대비 335% 성장).',
    competitor_slug: 'unitree-h1',
    layer_slug: 'funding',
    confidence: 'C',
  },
  {
    source_name: 'NVIDIA Newsroom',
    source_url: 'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
    headline: 'NVIDIA Isaac GR00T 레퍼런스 휴머노이드 – Unitree에서 2026년 말 출시 예정',
    summary: 'NVIDIA가 Isaac GR00T 레퍼런스 휴머노이드 로봇 디자인을 발표. Unitree가 2026년 말 이 레퍼런스 설계 기반 제품을 출시 예정.',
    competitor_slug: 'unitree-h1',
    layer_slug: 'partnership',
    confidence: 'A',
  },

  // ── Agility Robotics Digit ──
  {
    source_name: 'Agility Robotics (공식)',
    source_url: 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    headline: 'Agility Robotics, Toyota Motor Manufacturing Canada와 상용 계약 체결',
    summary: 'Toyota Motor Manufacturing Canada(TMMC)가 파일럿 성공 후 Digit 로봇 상용 배치 계약 체결. 제조, 공급망, 물류 운영 지원 목적.',
    competitor_slug: 'agility-digit',
    layer_slug: 'partnership',
    confidence: 'A',
  },
  {
    source_name: 'Agility Robotics (공식)',
    source_url: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    headline: 'Mercado Libre, Digit 로봇 상용 배치 계약 – 중남미 물류 확장 계획',
    summary: 'Mercado Libre(중남미 최대 전자상거래)가 Agility Robotics와 상용 계약 체결. 텍사스 San Antonio 시설에서 시작, 중남미 창고로 확장 계획.',
    competitor_slug: 'agility-digit',
    layer_slug: 'partnership',
    confidence: 'A',
  },
  {
    source_name: 'OriginOfBots',
    source_url: 'https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo',
    headline: 'Digit, 실 운영에서 토트 100,000개+ 이동 달성 – 수익 창출 이족보행 로봇 유일',
    summary: 'Digit가 Amazon, Schaeffler, GXO 등 Fortune 500 파트너에서 100,000개+ 토트를 실제 상거래 운영으로 처리. 현재 수익을 창출하는 유일한 이족보행 로봇.',
    competitor_slug: 'agility-digit',
    layer_slug: 'commercial',
    confidence: 'A',
  },
  {
    source_name: 'Robozaps',
    source_url: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    headline: 'Agility Robotics, ISO 기능안전 인증 추진 – 2026년 중후반 예상',
    summary: 'Agility Robotics가 Digit의 ISO 기능안전 인증을 추진 중. 약 18개월 내(2026년 중후반) 인간 협업 환경 인증 완료 예상. 차세대 페이로드 50lbs로 증가 예정.',
    competitor_slug: 'agility-digit',
    layer_slug: 'regulation',
    confidence: 'B',
  },

  // ── Apptronik Apollo ──
  {
    source_name: 'CNBC / SiliconANGLE',
    source_url: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    headline: 'Apptronik, $520M 추가 조달 ($5B 밸류에이션) – Series A 총 $935M',
    summary: 'Apptronik이 $5B 밸류에이션으로 $520M 추가 조달. Series A 총 $935M 규모. 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority(QIA).',
    competitor_slug: 'apptronik-apollo',
    layer_slug: 'funding',
    confidence: 'A',
  },
  {
    source_name: 'The Robot Report / Robotics 24/7',
    source_url: 'https://www.therobotreport.com/apptronik-collaborates-with-jabil-to-produce-apollo-humanoid-robots/',
    headline: 'Apptronik-Jabil 생산 파트너십 및 Google DeepMind Gemini Robotics 통합',
    summary: 'Jabil이 공급망 전문성을 활용해 Apollo 로봇 양산 지원. Google DeepMind와 전략적 파트너십으로 Gemini Robotics 기반 차세대 휴머노이드 개발. Mercedes-Benz·GXO 파일럿 진행 중.',
    competitor_slug: 'apptronik-apollo',
    layer_slug: 'partnership',
    confidence: 'A',
  },
  {
    source_name: 'Automate.org',
    source_url: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    headline: 'Apptronik, 2026년 내 새로운 Apollo 모델 공개 예정',
    summary: '1년간 테스트를 거친 Apptronik의 차세대 Apollo 모델이 2026년 내 공개 예정. Austin 본사 확장 및 캘리포니아 신규 사무소 개설 계획.',
    competitor_slug: 'apptronik-apollo',
    layer_slug: 'product',
    confidence: 'B',
  },

  // ── 1X Technologies NEO ──
  {
    source_name: '1X Technologies (공식) / eWeek',
    source_url: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    headline: '1X NEO, $20,000 가격 또는 $499/월 렌탈 – 첫해 생산량 5일 만에 완판',
    summary: 'NEO 가정용 휴머노이드 로봇: $20,000(구매) 또는 $499/월(6개월 최소 렌탈). 2025년 10월 사전 주문 개시 후 5일 만에 첫해 생산량 완판. 2026년 말까지 미국 가정 배송 시작.',
    competitor_slug: '1x-neo',
    layer_slug: 'commercial',
    confidence: 'A',
  },
  {
    source_name: 'TechFundingNews',
    source_url: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    headline: '1X, 캘리포니아 Hayward에 미국 최초 수직통합 휴머노이드 공장 개설 – 연 10,000대 생산',
    summary: '58,000sqft 규모 Hayward 공장 개설. 미국 최초 수직통합 휴머노이드 제조 시설. 첫해 10,000대, 2027년 말까지 100,000대 생산 목표.',
    competitor_slug: '1x-neo',
    layer_slug: 'production',
    confidence: 'A',
  },
  {
    source_name: 'BusinessWire (공식)',
    source_url: 'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
    headline: '1X-EQT 전략적 파트너십 – 300개+ 포트폴리오 기업에 최대 10,000대 NEO 공급 (2026~2030)',
    summary: '1X Technologies와 EQT가 전략적 파트너십 체결. EQT 소속 300개 이상 포트폴리오 기업(제조·물류·창고)에 2026~2030년간 최대 10,000대 NEO 공급.',
    competitor_slug: '1x-neo',
    layer_slug: 'partnership',
    confidence: 'A',
  },
  {
    source_name: 'The Robot Report',
    source_url: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    headline: '1X, World Model AI 공개 – NEO가 영상 시청으로 작업 학습 가능',
    summary: '2026년 3월, 1X Technologies가 World Model AI 시스템 공개. NEO 로봇이 비디오를 시청하여 새로운 작업을 학습할 수 있는 혁신적 AI 모델.',
    competitor_slug: '1x-neo',
    layer_slug: 'ai-software',
    confidence: 'A',
  },

  // ── Agibot ──
  {
    source_name: 'PRNewswire (공식)',
    source_url: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    headline: 'Agibot, CES 2026에서 미국 시장 공식 진출 – 10,000대+ 출하 달성 (글로벌 1위)',
    summary: 'Agibot가 CES 2026에서 미국 시장 공식 진출. 2026년 4월 기준 10,000대 이상 출하. Omdia 기준 2025년 글로벌 휴머노이드 출하량 1위(5,168대).',
    competitor_slug: 'agibot-x1',
    layer_slug: 'commercial',
    confidence: 'A',
  },
  {
    source_name: 'Robotics & Automation News',
    source_url: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    headline: 'Agibot, 차세대 Embodied AI 로봇 및 "One Body, Three Intelligences" 아키텍처 공개',
    summary: '2026년 파트너 컨퍼런스에서 "하나의 로봇 몸체, 세 가지 지능" 아키텍처 기반 차세대 로봇 플랫폼 공개. 다수의 로봇 플랫폼 동시 소개.',
    competitor_slug: 'agibot-x1',
    layer_slug: 'product',
    confidence: 'A',
  },
  {
    source_name: 'The Robot Report',
    source_url: 'https://www.therobotreport.com/agibot-world-2026-dataset-open-source-accelerate-embodied-ai-development/',
    headline: 'Agibot, AGIBOT WORLD 2026 오픈소스 데이터셋 공개 – Embodied AI 개발 가속',
    summary: 'Agibot가 대규모 Embodied AI 학습 데이터셋 "AGIBOT WORLD 2026"을 오픈소스로 공개. 로봇 AI 연구 커뮤니티 전체의 개발 가속화 목표.',
    competitor_slug: 'agibot-x1',
    layer_slug: 'ai-software',
    confidence: 'A',
  },
];

async function run() {
  await client.connect();
  console.log('✓ DB 연결 성공');

  // Get competitor ID mapping
  const { rows: competitors } = await client.query('SELECT id, slug FROM ci_competitors');
  const competitorMap = Object.fromEntries(competitors.map(c => [c.slug, c.id]));

  // Get layer ID mapping
  const { rows: layers } = await client.query('SELECT id, slug FROM ci_layers');
  const layerMap = Object.fromEntries(layers.map(l => [l.slug, l.id]));

  let inserted = 0;
  let skipped = 0;

  for (const alert of alerts) {
    const competitorId = competitorMap[alert.competitor_slug];
    const layerId = layerMap[alert.layer_slug];

    if (!competitorId) {
      console.warn(`⚠ 경쟁사 슬러그 "${alert.competitor_slug}" 미발견 – 건너뜀`);
      skipped++;
      continue;
    }

    // Dedup check by headline similarity
    const { rows: existing } = await client.query(
      `SELECT id FROM ci_monitor_alerts
       WHERE competitor_id = $1 AND headline = $2`,
      [competitorId, alert.headline]
    );

    if (existing.length > 0) {
      console.log(`⏭ 중복: ${alert.headline.slice(0, 50)}…`);
      skipped++;
      continue;
    }

    await client.query(
      `INSERT INTO ci_monitor_alerts
       (source_name, source_url, headline, summary, competitor_id, layer_id,
        detected_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'pending')`,
      [
        alert.source_name,
        alert.source_url,
        alert.headline,
        `[${alert.confidence}] ${alert.summary}`,
        competitorId,
        layerId || null,
      ]
    );
    inserted++;
    console.log(`✓ 삽입: ${alert.headline.slice(0, 60)}…`);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`삽입: ${inserted}건 / 건너뜀(중복/미매칭): ${skipped}건 / 총: ${alerts.length}건`);

  await client.end();
}

run().catch(e => {
  console.error('실행 오류:', e.message);
  process.exit(1);
});
