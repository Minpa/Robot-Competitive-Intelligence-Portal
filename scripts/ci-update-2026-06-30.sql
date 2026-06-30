-- ============================================================
-- [ARGOS] 경쟁사 데이터 업데이트 — 2026-06-30
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-06-30.sql
-- 주의: 기존 6/23 업데이트 이후 신규 데이터만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- ----- Tesla Optimus -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Tesla Optimus Gen 3 Fremont 1,000대+ 가동 - 기업 판매가 $100K-$150K 설정',
       'Tesla가 Fremont 공장에서 1,000대 이상의 Optimus Gen 3를 가동 중. 배터리 조립, EV 팩 적재, 케이블 라우팅 등 업무 수행. 2026년 말 기업 고객 대상 첫 판매 시작 예정, 초기 가격 $100,000-$150,000. 연말까지 50,000-100,000대 내부 목표. 소비자 판매는 2027년 말 $30,000 목표.',
       '{"source": "SEC Filing, Optimusk Blog, iFactory", "sourceUrl": "https://ifactoryapp.com/industries/automotive-manufacturing/tesla-optimus-fremont-gen-3-humanoid-2026", "confidence": "B", "fremontUnits": "1,000+", "enterprisePrice": "$100K-$150K", "enterpriseSalesStart": "late 2026", "yearEndTarget": "50,000-100,000", "consumerPrice": "$30,000", "consumerTarget": "end 2027", "tasks": ["battery assembly", "EV pack loading", "cable routing", "connector seating", "parts handling"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name LIKE '%Optimus Gen 3%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%1,000대+ 가동%'
);

-- ----- Figure AI -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Figure AI 로봇 수 > 직원 수 돌파 — 750대+ 생산, 24x 생산 속도 개선',
       'Figure AI CEO Brett Adcock가 2026년 6월 20일 로봇 수(750+)가 직원 수(180-250명)를 최초 초과했다고 발표. BotQ 공장에서 120일 만에 일 1대 → 시간당 1대로 24x 생산성 향상. Figure 02는 BMW Spartanburg에서 11개월 상업 시험 완료 후 퇴역 — 30,000대+ BMW X3 생산, 90,000개+ 금속 부품 적재, 5mm 정밀도/2초 사이클.',
       '{"source": "Figure AI CEO Twitter, explainx.ai, News Karnataka", "sourceUrl": "https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026", "confidence": "A", "date": "2026-06-20", "robotCount": "750+", "employeeCount": "180-250", "throughputImprovement": "24x in 120 days", "figure02Retirement": "11-month BMW trial completed", "bmwX3Production": "30,000+", "metalParts": "90,000+", "precision": "5mm within 2 seconds"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%로봇 수 > 직원 수%'
);

-- ----- Agility Robotics -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       'Agility Robotics $2.5B SPAC IPO — 미국 최초 상장 휴머노이드 전문 기업',
       'Agility Robotics가 2026년 6월 24일 Churchill Capital Corp XI과 합병을 통해 $2.5B 규모 SPAC 상장 발표. 미국 최초 순수 휴머노이드 로보틱스 상장 기업. Nasdaq 티커 "AGLT" 예정, $620M+ 조달. Digit v5 차세대 로봇 공개 — 협력 안전 기능 탑재. $300M+ 사전 주문 확보 (1,000대 3년 계약). NVIDIA Halos 안전 시스템 최초 채택 파트너.',
       '{"source": "TechCrunch, Forbes, GeekWire, TechTimes", "sourceUrl": "https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/", "confidence": "A", "date": "2026-06-24", "dealValue": "$2.5B", "ticker": "AGLT", "exchange": "Nasdaq", "grossProceeds": "$620M+", "preOrders": "$300M+ (1,000 robots, 3-year contract)", "digitV5": "cooperative safety, NVIDIA Halos", "nvidiaHalos": "first adoption partner", "spac": "Churchill Capital Corp XI", "backers": ["Amazon", "NVIDIA"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agility Robotics' AND hr.name = 'Digit'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%SPAC IPO%'
);

-- ----- 1X Technologies -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '1X Technologies NEO 개발자 릴리스 가속 — 미중 규제 대응 전략 전환',
       '1X Technologies CEO Bernt Børnich가 2026년 6월 24일 NEO 개발자 릴리스 가속을 발표. 미국 의회의 중국 휴머노이드 금지법(GUARD Act) 대응 — 서양 AI 연구소에 정치적으로 안전한 하드웨어 대안 제공 전략. World Model Lab 설립, Luma AI 창립 연구원 Sam Sinha를 Head of World Models로 영입. VP Engineering에 Tom Sanocki 임명(6/25).',
       '{"source": "Humanoids Daily, Forbes, The Robot Report", "sourceUrl": "https://www.humanoidsdaily.com/news/1x-accelerates-neo-developer-release-to-counter-u-s-bans-on-chinese-humanoids", "confidence": "A", "date": "2026-06-24", "strategy": "developer release acceleration", "reason": "counter US GUARD Act banning Chinese humanoids", "worldModelLab": "Sam Sinha (ex-Luma AI) as Head of World Models", "vpEngineering": "Tom Sanocki appointed 2026-06-25", "targetMarket": "Western AI research labs"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = '1X Technologies' AND hr.name = 'NEO'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'partnership'
  AND ca.title LIKE '%개발자 릴리스 가속%'
);

-- ----- Agibot -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Agibot 15,000대 돌파 — Singtel Enterprise 운영자 계약, Minth Group 독일 론칭',
       'Agibot가 2026년 6월 15,000번째 휴머노이드 출하 달성. 3월 10,000대에서 3개월 만에 50% 증산. Singtel Enterprise(싱가포르)과 최초 글로벌 운영자 계약 체결 — RaaS 모델. Minth Group과 독일 뮌헨에서 전체 로봇 포트폴리오 론칭(2/24). ICRA 2026(비엔나)에서 AGIBOT World Challenge 개최 — 27개국 526팀 참가.',
       '{"source": "PRNewswire, The Robot Report, Aparobot", "sourceUrl": "http://www.prnewswire.com/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812693.html", "confidence": "A", "date": "2026-06", "milestone": "15,000th robot", "growthRate": "50% in 3 months (10K→15K)", "singtelDeal": "first global operator agreement", "minthGermany": "Munich portfolio launch 2026-02-24", "icra2026": "27 countries, 526 teams", "globalExpansion": ["Germany", "Singapore", "Japan", "South Korea", "Southeast Asia", "Middle East"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%15,000대 돌파%'
);

-- ----- 규제/정책 알림 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       NULL,
       'partnership',
       'critical',
       '[규제] 미국 의회 중국 휴머노이드 로봇 금지 법안 — GUARD Act, American Security Robotics Act',
       '미국 의회가 중국산 휴머노이드 로봇 금지를 위한 다수 법안 추진. 1) GUARD Act: FCC Covered List에 적대국 로봇 등재하여 미국 내 금지. 2) American Security Robotics Act (Cotton-Schumer): 연방 정부의 중국산 로봇 구매/운용 금지. 3) Humanoid ROBOT Act (2025.11). Unitree 등 중국 제조사 직접 타겟. 1X Technologies가 대안 플랫폼으로 포지셔닝. IEEE Spectrum: 미국 로봇 기업들도 중국 부품 의존 구조로 공급망 재편 필요.',
       '{"source": "House Select Committee on CCP, Fox News, IEEE Spectrum, The Hill", "sourceUrl": "https://chinaselectcommittee.house.gov/media/press-releases/moolenaar-obernolte-mcclellan-introduce-legislation-to-ban-dangerous-chinese-robots", "confidence": "A", "legislation": ["GUARD Act", "American Security Robotics Act (Cotton-Schumer)", "Humanoid ROBOT Act (Cassidy-Coons, Nov 2025)", "National Commission on Robotics Act (Feb 2026)"], "targets": ["Unitree Robotics", "Chinese humanoid manufacturers"], "impact": "supply chain restructuring required for US robot makers", "implications": "LG supply chain review needed for Chinese component dependencies"}'::jsonb,
       false,
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%GUARD Act%American Security Robotics Act%'
);

-- ----- NVIDIA Halos 안전 시스템 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       NULL,
       'partnership',
       'warning',
       '[산업] NVIDIA Halos — 업계 최초 풀스택 휴머노이드 로봇 안전 시스템 발표',
       'NVIDIA가 2026년 6월 22일 Automate 2026(시카고)에서 Halos for Robotics 발표 — 업계 최초 풀스택 Physical AI/휴머노이드 로봇 안전 시스템. IGX Thor 컴퓨트 모듈 + 전용 안전 프로세서 + Halos OS 소프트웨어 + 외부 카메라 구성. Agility Robotics가 Digit v5에 최초 채택. 협력 안전(cooperative safety) 구현하여 안전 펜스 없이 인간과 협업 가능.',
       '{"source": "NVIDIA, Forbes, Interesting Engineering", "sourceUrl": "https://interestingengineering.com/ai-robotics/us-digit-robot-maker-agility", "confidence": "A", "date": "2026-06-22", "event": "Automate 2026, Chicago", "product": "NVIDIA Halos for Robotics", "components": ["IGX Thor compute module", "dedicated safety processor", "Halos OS software", "external warehouse cameras"], "firstAdopter": "Agility Robotics Digit v5", "capability": "cooperative safety without safety fences"}'::jsonb,
       false,
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%NVIDIA Halos%풀스택%'
);

-- ============================================================
-- 2. ARTICLES (articles 테이블) — 신규 기사
-- ============================================================

-- Tesla: 1,000+ Optimus 가동
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla Optimus at Fremont: Gen 3 Humanoid Deployment & Mass Production Update 2026',
       'iFactory',
       'https://ifactoryapp.com/industries/automotive-manufacturing/tesla-optimus-fremont-gen-3-humanoid-2026',
       '2026-06-25'::timestamp,
       'Tesla가 Fremont에서 1,000대 이상 Optimus Gen 3를 가동 중. 배터리 조립, EV 팩 적재 등 업무 수행. 기업 판매 $100K-$150K, 연말 50K-100K대 내부 목표.',
       'en', 'product', 'robot',
       md5('ifactory-tesla-optimus-1000-fremont-2026-06-30'),
       '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus Gen 3"],"technologies":["battery assembly automation","cable routing"],"marketInsights":["1000+ units operating","$100K-$150K enterprise price","50K-100K year-end target"],"keyPoints":["1000+ Gen 3 at Fremont","enterprise sales late 2026","consumer $30K end 2027"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('ifactory-tesla-optimus-1000-fremont-2026-06-30'));

-- Figure AI: 로봇 > 직원 마일스톤
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure AI: Robots Now Outnumber Humans at the Company — 750+ Robots, 24x Production Improvement',
       'explainx.ai',
       'https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026',
       '2026-06-20'::timestamp,
       'Figure AI CEO Brett Adcock 발표: 로봇 수(750+)가 직원 수(180-250명) 최초 초과. BotQ에서 120일 만에 24x 생산성 향상. Figure 02 BMW 11개월 시험 후 퇴역.',
       'en', 'product', 'robot',
       md5('explainx-figure-ai-robots-outnumber-humans-2026-06-30'),
       '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["BotQ manufacturing","24x throughput improvement"],"marketInsights":["750+ robots produced","robots outnumber employees","Figure 02 retired after BMW trial"],"keyPoints":["robots > humans milestone","24x production improvement in 120 days","Figure 02 BMW 11-month trial completed"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('explainx-figure-ai-robots-outnumber-humans-2026-06-30'));

-- Agility: SPAC IPO
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Agility Robotics plans to go public via SPAC in a $2.5B deal — First US Humanoid IPO',
       'TechCrunch',
       'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
       '2026-06-24'::timestamp,
       'Agility Robotics가 Churchill Capital Corp XI과 $2.5B SPAC 합병 발표. 미국 최초 휴머노이드 전문 상장 기업. Nasdaq "AGLT", $620M+ 조달. Digit v5 공개, $300M+ 사전주문. NVIDIA Halos 최초 채택.',
       'en', 'industry', 'robot',
       md5('techcrunch-agility-spac-2.5b-ipo-2026-06-30'),
       '{"mentionedCompanies":["Agility Robotics","Churchill Capital Corp XI","NVIDIA","Amazon"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos safety system","cooperative safety"],"marketInsights":["$2.5B SPAC IPO","$620M+ proceeds","$300M+ pre-orders","first US humanoid IPO"],"keyPoints":["$2.5B SPAC with Churchill Capital XI","Nasdaq AGLT","Digit v5 with NVIDIA Halos","$300M pre-orders"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agility Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('techcrunch-agility-spac-2.5b-ipo-2026-06-30'));

-- Agility: NVIDIA Halos
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'First Humanoid Robot Maker Goes Public In U.S.: $2.5 Billion Deal, New Robot, $300 Million In Pre-orders',
       'Forbes',
       'https://www.forbes.com/sites/johnkoetsier/2026/06/24/first-humanoid-robot-maker-goes-public-in-us-25-billion-deal-new-robot-300-million-in-pre-orders/',
       '2026-06-24'::timestamp,
       'Agility Robotics $2.5B SPAC IPO 상세. Digit v5: 세계 최초 협력 안전 AI 휴머노이드. NVIDIA Halos 안전 시스템 최초 채택. 9개 고객 사이트 운영: GXO, Schaeffler, Toyota Canada, Mercado Libre.',
       'en', 'industry', 'robot',
       md5('forbes-agility-first-humanoid-ipo-2026-06-30'),
       '{"mentionedCompanies":["Agility Robotics","NVIDIA","Amazon","GXO","Schaeffler","Toyota","Mercado Libre"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos","IGX Thor","cooperative safety"],"marketInsights":["9 customer sites","$300M multi-year orders","first US pure-play humanoid IPO"],"keyPoints":["Digit v5 cooperative safety","NVIDIA Halos first adopter","9 active customer sites"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agility Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('forbes-agility-first-humanoid-ipo-2026-06-30'));

-- 1X: 개발자 릴리스 가속
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       '1X Accelerates NEO Developer Release to Counter U.S. Bans on Chinese Humanoids',
       'Humanoids Daily',
       'https://www.humanoidsdaily.com/news/1x-accelerates-neo-developer-release-to-counter-u-s-bans-on-chinese-humanoids',
       '2026-06-24'::timestamp,
       '1X Technologies가 미국 GUARD Act 대응으로 NEO 개발자 릴리스 가속. 서양 AI 연구소에 중국 로봇(Unitree 등) 대안 제공. World Model Lab 설립, Sam Sinha(ex-Luma AI) 영입.',
       'en', 'product', 'robot',
       md5('humanoidsdaily-1x-neo-developer-release-guard-act-2026-06-30'),
       '{"mentionedCompanies":["1X Technologies","Unitree Robotics","Luma AI"],"mentionedRobots":["NEO"],"technologies":["World Model AI","developer platform"],"marketInsights":["US GUARD Act impact","Chinese humanoid ban response","Western AI lab alternative"],"keyPoints":["NEO developer release accelerated","counter US GUARD Act","World Model Lab with Sam Sinha"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = '1X Technologies'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('humanoidsdaily-1x-neo-developer-release-guard-act-2026-06-30'));

-- 1X: World Model Lab
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       '1X Launches Humanoid Robot World Model Lab: You Can''t Fine-Tune Your Way To AGI',
       'Forbes',
       'https://www.forbes.com/sites/johnkoetsier/2026/06/04/1x-launches-humanoid-robot-world-model-lab-you-cant-fine-tune-your-way-to-agi/',
       '2026-06-04'::timestamp,
       '1X Technologies World Model Lab 공식 출범. Sam Sinha(Luma AI 창립 연구원)를 Head of World Models로 영입. AGI 경로로 fine-tuning이 아닌 world model 접근법 채택.',
       'en', 'technology', 'robot',
       md5('forbes-1x-world-model-lab-agi-2026-06-30'),
       '{"mentionedCompanies":["1X Technologies","Luma AI"],"mentionedRobots":["NEO"],"technologies":["World Model AI","embodied intelligence","video learning"],"marketInsights":["AGI via world models not fine-tuning","dedicated lab for autonomous capabilities"],"keyPoints":["World Model Lab launch","Sam Sinha as Head of World Models","world model vs fine-tuning debate"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = '1X Technologies'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('forbes-1x-world-model-lab-agi-2026-06-30'));

-- Agibot: 15,000대 돌파
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'AGIBOT''s 15,000th Robot Rolls Off the Production Line, Marking a New Milestone in Embodied AI Deployment',
       'PRNewswire',
       'http://www.prnewswire.com/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812693.html',
       '2026-06-15'::timestamp,
       'Agibot 15,000번째 로봇 출하. 3월 10,000대 달성 후 3개월 만에 50% 증산. 글로벌 확장: 독일 Minth Group, 싱가포르 Singtel Enterprise, 일본, 한국, 동남아, 중동.',
       'en', 'industry', 'robot',
       md5('prnewswire-agibot-15000-milestone-2026-06-30'),
       '{"mentionedCompanies":["AgiBot","Minth Group","Singtel Enterprise"],"mentionedRobots":["A2","X2","G2"],"technologies":["embodied AI","mass production"],"marketInsights":["15K total robots","50% growth in 3 months","global expansion to 6+ regions"],"keyPoints":["15000th robot milestone","Minth Group Germany","Singtel Enterprise Singapore"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('prnewswire-agibot-15000-milestone-2026-06-30'));

-- Agibot: ICRA 2026 World Challenge
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'AGIBOT WORLD CHALLENGE 2026 Advances Embodied AI Competition from Simulation to Real-Robot Testing at ICRA 2026',
       'PRNewswire',
       'https://www.prnewswire.com/news-releases/agibot-world-challenge-2026-advances-embodied-ai-competition-from-simulation-to-real-robot-testing-at-icra-2026-302792634.html',
       '2026-06-15'::timestamp,
       'ICRA 2026(비엔나)에서 AGIBOT World Challenge 개최. 27개국 526팀 참가. 시뮬레이션→실제 로봇 테스트로 진화. EWMBench, Genie Sim Benchmark 활용.',
       'en', 'technology', 'robot',
       md5('prnewswire-agibot-world-challenge-icra-2026-06-30'),
       '{"mentionedCompanies":["AgiBot"],"mentionedRobots":[],"technologies":["EWMBench","Genie Sim Benchmark","embodied AI competition"],"marketInsights":["27 countries 526 teams","simulation to real-robot testing","ICRA 2026 Vienna"],"keyPoints":["AGIBOT World Challenge at ICRA 2026","526 teams from 27 countries","sim-to-real testing advancement"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('prnewswire-agibot-world-challenge-icra-2026-06-30'));

-- 규제: 중국 로봇 금지 법안
INSERT INTO articles (id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       'US Ban on Chinese Robots Could Reshape Supply Chains — GUARD Act, American Security Robotics Act',
       'IEEE Spectrum',
       'https://spectrum.ieee.org/chinese-robots-us-ban',
       '2026-04-07'::timestamp,
       '미국 의회 중국 휴머노이드 로봇 금지 법안 추진. GUARD Act(FCC Covered List), American Security Robotics Act(Cotton-Schumer, 연방 조달 금지). Unitree 등 직접 타겟. 미국 로봇 기업의 중국 부품 의존 구조로 공급망 재편 불가피.',
       'en', 'industry', 'robot',
       md5('ieee-spectrum-us-ban-chinese-robots-supply-chain-2026-06-30'),
       '{"mentionedCompanies":["Unitree Robotics","1X Technologies"],"mentionedRobots":[],"technologies":[],"marketInsights":["GUARD Act","American Security Robotics Act","Chinese component dependency","supply chain restructuring"],"keyPoints":["US congressional ban on Chinese humanoids","FCC Covered List mechanism","supply chain disruption for US makers"]}'::jsonb,
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('ieee-spectrum-us-ban-chinese-robots-supply-chain-2026-06-30'));

-- NVIDIA Halos 안전 시스템
INSERT INTO articles (id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       'NVIDIA Halos for Robotics: Industry First Full-Stack Safety System for Physical AI and Humanoid Robots',
       'Interesting Engineering',
       'https://interestingengineering.com/ai-robotics/us-digit-robot-maker-agility',
       '2026-06-22'::timestamp,
       'NVIDIA가 Automate 2026에서 Halos for Robotics 발표. 업계 최초 풀스택 Physical AI 안전 시스템. IGX Thor + 전용 안전 프로세서 + Halos OS. Agility Digit v5 최초 채택. 안전 펜스 없는 인간-로봇 협업 실현.',
       'en', 'technology', 'robot',
       md5('ie-nvidia-halos-robotics-safety-system-2026-06-30'),
       '{"mentionedCompanies":["NVIDIA","Agility Robotics"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos","IGX Thor","dedicated safety processor","Halos OS","cooperative safety"],"marketInsights":["first full-stack robot safety system","fence-free human-robot collaboration","Automate 2026 Chicago"],"keyPoints":["NVIDIA Halos launch","IGX Thor + safety processor","Agility first adopter"]}'::jsonb,
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('ie-nvidia-halos-robotics-safety-system-2026-06-30'));


-- ============================================================
-- 3. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- Tesla: 1,000+ units
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'iFactory / SEC Filing',
  'https://ifactoryapp.com/industries/automotive-manufacturing/tesla-optimus-fremont-gen-3-humanoid-2026',
  'Tesla confirms 1,000+ Optimus Gen 3 operating at Fremont; enterprise sales $100K-$150K late 2026',
  '1,000+ Optimus Gen 3 units operating at Fremont across battery assembly, EV pack loading, cable routing. Enterprise price $100K-$150K for late 2026. Internal year-end target 50K-100K units. Consumer sales end 2027 at $30K.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1,000+ Optimus Gen 3 operating%');

-- Figure AI: robots > humans
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Figure AI CEO / explainx.ai',
  'https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026',
  'Figure AI milestone: 750+ robots now outnumber employees; 24x production improvement in 120 days',
  'CEO Brett Adcock confirms robot count (750+) exceeds human headcount (180-250). BotQ factory achieved 24x throughput improvement: 1/day → 1/hour in 120 days. Figure 02 retired after 11-month BMW Spartanburg trial: 30K+ X3 vehicles, 90K+ metal parts loaded.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%750+ robots now outnumber%');

-- Agility: SPAC IPO
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'TechCrunch / Forbes',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  'Agility Robotics announces $2.5B SPAC IPO — first US pure-play humanoid robotics public company',
  'SPAC merger with Churchill Capital Corp XI at $2.5B valuation. Nasdaq ticker "AGLT". $620M+ gross proceeds. Digit v5 unveiled with cooperative safety. $300M+ multi-year pre-orders (1,000 robots). NVIDIA Halos first adoption partner. 9 customer sites active.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agility Robotics announces $2.5B SPAC%');

-- 1X: Developer release
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Humanoids Daily / Forbes',
  'https://www.humanoidsdaily.com/news/1x-accelerates-neo-developer-release-to-counter-u-s-bans-on-chinese-humanoids',
  '1X accelerates NEO developer release to counter US bans on Chinese humanoids; launches World Model Lab',
  'CEO Børnich accelerates NEO developer platform release in response to US GUARD Act targeting Chinese humanoids (Unitree). Positions NEO as "safe, affordable, capable" Western alternative. World Model Lab launched with Sam Sinha (ex-Luma AI). Tom Sanocki named VP Engineering.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' OR name ILIKE '%NEO%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1X accelerates NEO developer%');

-- Agibot: 15,000 units
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'PRNewswire',
  'http://www.prnewswire.com/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812693.html',
  'AgiBot hits 15,000 robot milestone; expands globally with Singtel Enterprise and Minth Group Germany',
  '15,000th robot shipped in June 2026 (50% growth in 3 months from 10K). Singtel Enterprise first global operator agreement (Singapore). Minth Group full portfolio launch in Munich. ICRA 2026 Vienna: AGIBOT World Challenge with 526 teams from 27 countries.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%X1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%AgiBot hits 15,000%');

-- NVIDIA Halos
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'NVIDIA / Interesting Engineering',
  'https://interestingengineering.com/ai-robotics/us-digit-robot-maker-agility',
  'NVIDIA launches Halos — industry first full-stack safety system for humanoid robots at Automate 2026',
  'NVIDIA Halos for Robotics announced at Automate 2026 Chicago (June 22). Full-stack safety: IGX Thor compute + dedicated safety processor + Halos OS + external cameras. Agility Robotics Digit v5 is launch partner. Enables cooperative safety without safety fences.',
  NULL,
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%NVIDIA launches Halos%');


-- ============================================================
-- 4. 기업 밸류에이션 업데이트 (companies 테이블)
-- ============================================================

UPDATE companies SET valuation_usd = 2500000000.00, updated_at = NOW()
WHERE name = 'Agility Robotics' AND (valuation_usd IS NULL OR valuation_usd < 2500000000);


COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, severity, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, severity;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
-- SELECT count(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
