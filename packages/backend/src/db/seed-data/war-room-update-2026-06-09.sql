--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-09
-- 수집 시점: 2026-06-09, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인
--              [C] 단일 출처 [D] 추정 [E] 미확인
--

BEGIN;

-- ============================================================
-- 0. 누락 CI 경쟁사 추가 (Unitree, Apptronik, Agibot)
-- ============================================================

INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  ('unitree', 'G1', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apptronik', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot', 'A2', 'Agibot', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 1. 신규 기사 (articles) — 2026-06-09 수집
-- ============================================================

-- [Tesla] Fremont 공장 Optimus 생산라인 전환 — Model S/X 종료
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '13cbc94a-9bf0-4b9f-a571-3285e0d10424',
  'Tesla ends Model S/X production at Fremont, Optimus robot production begins late July 2026',
  'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22 00:00:00',
  'Tesla confirms Fremont factory conversion from Model S/X to Optimus humanoid robot production. Initial output starts late July/August 2026. First-gen line designed for 1M robots/year. Giga Texas second factory targeting 10M/yr capacity by 2027.',
  'en',
  'f090601a0001000080000000000a0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Tesla] Optimus Gen 3 손 기술 — 25 액추에이터/손
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '13cbc94a-9bf0-4b9f-a571-3285e0d10424',
  'Tesla Optimus Gen 3 hands: 25 actuators per hand, 22-DOF upgrade confirmed',
  'Optimusk Blog / Robozaps',
  'https://optimusk.blog/blog/tesla-optimus-gen-3/',
  '2026-03-11 00:00:00',
  'Optimus Gen 3 features 25 actuators per forearm/hand (50 total), 4.5x increase from Gen 2. Robot weighs 57kg (22% lighter). Over 1,000 Gen 3 units operating at Fremont factory. Cortex 2.0 supercomputer (500MW) powering AI training at Giga Texas.',
  'en',
  'f090601a0002000080000000000a0002',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Boston Dynamics] CES 2026 Atlas 상용화 출시
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '11b08776-079b-47ac-b5fd-3189893ea9ad',
  'Boston Dynamics ships first commercial Atlas units to Hyundai RMAC and Google DeepMind',
  'AI2Work / Humanoids Daily',
  'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
  '2026-01-06 00:00:00',
  'Production-ready Atlas unveiled at CES 2026. 56 DOF, 4-hour runtime, 3-min self-swappable batteries, 50kg (110 lbs) lift capacity. First fleets shipping to Hyundai RMAC and Google DeepMind. Foundation model integration via DeepMind partnership.',
  'en',
  'f090601b0001000080000000000b0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Series C $1B+ 및 BMW 11개월 실적
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '19a7a26e-d38b-4814-94a6-4fa64be591e9',
  'Figure AI exceeds $1B Series C at $39B valuation; Figure 02 produces 30,000+ BMW X3 vehicles',
  'Figure AI Official / Forge Global',
  'https://www.figure.ai/news/series-c',
  '2025-09-15 00:00:00',
  'Series C led by Parkway Venture Capital with NVIDIA, Intel Capital, Qualcomm, Salesforce. Total funding $2.3B. Figure 02 at BMW Spartanburg: 30,000+ X3 vehicles, 90,000 sheet metal components, 1,250 operational hours in 11-month deployment.',
  'en',
  'f090601c0001000080000000000c0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Figure 03 가정용 로봇 + 백악관 등장
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '19a7a26e-d38b-4814-94a6-4fa64be591e9',
  'Figure 03 debuts at White House with Melania Trump; Amazon 20K-unit deployment underway',
  'CNBC',
  'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
  '2026-03-26 00:00:00',
  'Figure 03: 168cm, 61kg, 20kg payload, 1.2 m/s walk speed, 5hr runtime (2.3kWh swappable battery). White House appearance March 2026. Amazon 20,000-unit warehouse deployment underway. Mercedes 50,000-unit order. $14B+ revenue pipeline through 2029.',
  'en',
  'f090601c0002000080000000000c0002',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] IPO 승인 + 20,000대 생산 목표
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cac70446-574d-4033-8937-cade57540de7',
  'Unitree IPO cleared on Shanghai STAR Market; targeting 20,000 humanoid robot shipments in 2026',
  'eWeek / TechTimes',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-06-02 00:00:00',
  'Unitree IPO approved on Shanghai STAR Market (June 1, 2026). First embodied AI company on China A-shares. Revenue ¥1.708B in 2025 (335% YoY). Targeting 20,000 humanoid shipments in 2026, up from 5,500 in 2025.',
  'en',
  'f090601d0001000080000000000d0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] G1 도쿄 하네다 공항 배치 — JAL/GMO 파트너십
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cac70446-574d-4033-8937-cade57540de7',
  'Unitree G1 deployed at Tokyo Haneda Airport in partnership with Japan Airlines and GMO Internet',
  'RobotShop Community',
  'https://community.robotshop.com/blog/show/unitree-robotics-at-ces-2026-a-clear-signal-of-whats-coming-next',
  '2026-02-01 00:00:00',
  'First commercial airport deployment of a humanoid robot. G1 handles baggage and cargo at Tokyo Haneda. Partnership with Japan Airlines and GMO Internet Group. Trial runs through 2028.',
  'en',
  'f090601d0002000080000000000d0002',
  'partnership',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] UnifoLM-VLA-0 오픈소스 + 로봇 앱스토어
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cac70446-574d-4033-8937-cade57540de7',
  'Unitree open-sources UnifoLM-VLA-0 model; launches first Humanoid Robot App Store',
  'Unitree Official',
  'https://www.unitree.com/g1/',
  '2026-03-10 00:00:00',
  'UnifoLM-VLA-0 Vision-Language-Action model open-sourced. Enables autonomous household tasks via natural language. World first Humanoid Robot App Store launched — modular, software-driven ecosystem.',
  'en',
  'f090601d0003000080000000000d0003',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Toyota Canada 상업 계약
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cade5e23-f87f-4a2d-b5c9-f517957596bb',
  'Agility Robotics signs commercial agreement with Toyota Motor Manufacturing Canada for Digit',
  'Robotics & Automation News / The Robot Report',
  'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/',
  '2026-02-20 00:00:00',
  'Commercial agreement for Digit deployment at Toyota Canada. Pilot phase: 3 Digits, expanding to 10+. Tasks: loading/unloading totes from automated tugger. Robots-as-a-Service model. Digit has moved 100,000+ totes in commercial deployments.',
  'en',
  'f090601e0001000080000000000e0001',
  'partnership',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Mercado Libre 계약 — LATAM 진출
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cade5e23-f87f-4a2d-b5c9-f517957596bb',
  'Agility Robotics deploys Digit at Mercado Libre facility in Texas, eyes Latin America expansion',
  'Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  '2026-01-15 00:00:00',
  'Commercial agreement with Mercado Libre for Digit deployment in San Antonio, TX fulfillment center. Initial focus on commerce fulfillment tasks. Plans to expand across Mercado Libre warehouses in Latin America.',
  'en',
  'f090601e0002000080000000000e0002',
  'partnership',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] ISO 기능안전 인증 추진
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'cade5e23-f87f-4a2d-b5c9-f517957596bb',
  'Agility Robotics pursuing ISO functional safety certification for Digit; human collaboration by late 2026',
  'Beginners in AI',
  'https://beginnersinai.org/agility-robotics-digit-explained/',
  '2026-05-01 00:00:00',
  'Pursuing ISO functional safety certification. Expected clearance for human collaboration by mid-to-late 2026, making Digit potentially the first humanoid with ISO safety certification.',
  'en',
  'f090601e0003000080000000000e0003',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] $520M 시리즈 A 확장 — $5B 밸류에이션
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '129640a3-e088-4c08-9f43-9d4e39b60db8',
  'Apptronik raises $520M at $5B valuation; Google DeepMind partnership for Gemini-powered Apollo',
  'CNBC / SiliconANGLE',
  'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
  '2026-02-11 00:00:00',
  '$520M Series A extension brings total to ~$1B. $5B valuation. Co-led by Google/B Capital. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Google DeepMind partnership for Gemini Robotics models integration.',
  'en',
  'f090601f0001000080000000000f0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] Mercedes-Benz + Jabil 제조 파트너십
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  '129640a3-e088-4c08-9f43-9d4e39b60db8',
  'Apptronik scales Apollo production via Jabil partnership; Mercedes-Benz deploying at manufacturing plants',
  'The Robot Report / Crunchbase',
  'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
  '2026-02-11 00:00:00',
  'Jabil partnership for supply chain and manufacturing scale. Mercedes-Benz pilot: Apollo delivering assembly kits to production line workers. GXO Logistics deployment. Commercial-scale deployment targeted for 2026.',
  'en',
  'f090601f0002000080000000000f0002',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] NEO 소비자 출하 시작 — $20,000
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e35ec4fb-0c98-4072-89e5-0b2e04ef86ed',
  '1X Technologies opens Hayward factory, begins NEO shipments; 10,000-unit first year sold out in 5 days',
  'Tech Funding News / eWeek',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-05-30 00:00:00',
  '58,000 sqft Hayward, CA factory opened. 10,000 NEO robots capacity, first-year production sold out in 5 days. $20,000 per unit or $499/month subscription. Vertically integrated: in-house motors, batteries, sensors.',
  'en',
  'f090601g0001000080000000000g0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] EQT 산업 배치 계약 — 10,000대
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e35ec4fb-0c98-4072-89e5-0b2e04ef86ed',
  '1X strikes deal with EQT for up to 10,000 NEO robots across 300+ portfolio companies',
  'TechCrunch',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '2025-12-11 00:00:00',
  'EQT deal: up to 10,000 NEO robots between 2026-2030 across 300+ portfolio companies. Focus on manufacturing, warehousing, logistics, and industrial use cases. Major expansion from home to B2B market.',
  'en',
  'f090601g0002000080000000000g0002',
  'partnership',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] 1X World Model AI 업데이트
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e35ec4fb-0c98-4072-89e5-0b2e04ef86ed',
  '1X launches World Model enabling NEO robot to learn tasks by watching videos',
  'The Robot Report',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-04-15 00:00:00',
  '1X World Model: AI update enabling NEO to turn any request into capability on demand. Video-based learning grounded in real-world physics. Nvidia Jetson Thor platform, Isaac simulation training.',
  'en',
  'f090601g0003000080000000000g0003',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] 10,000대 생산 돌파 — 3개월 만에 2배
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e498bee9-3340-4f1e-aff6-4723095f214f',
  'Agibot rolls off 10,000th humanoid robot; production doubled from 5,000 in just 3 months',
  'Interesting Engineering / TechTimes',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  '2026-03-31 00:00:00',
  'Agibot 10,000th robot (Expedition A3) rolled off Shanghai line. Production scale: 1,000 → 5,000 → 10,000 in 3 months. With Unitree, captures ~80% of Chinese humanoid shipments. TrendForce forecasts 94% surge in Chinese humanoid output for 2026.',
  'en',
  'f090601h0001000080000000000h0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] CES 2026 미국 시장 진출 + LG CEO 방문
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e498bee9-3340-4f1e-aff6-4723095f214f',
  'Agibot enters US market at CES 2026; LG CEO Lyu Jae-cheol visits Shanghai headquarters',
  'Korea Herald / Interesting Engineering',
  'https://www.koreaherald.com/article/10694574',
  '2026-03-15 00:00:00',
  'CES 2026: launched A2, X2, G2 humanoids + D1 quadruped. LG CEO visited March 2026. LG took equity stake Aug 2025. Discussion topics: mass production, data training farms, actuator supply chain. Deployed in EU, NA, JP, KR, SEA, ME.',
  'en',
  'f090601h0002000080000000000h0002',
  'partnership',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] AGIBOT World Challenge 2026
INSERT INTO articles (company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'e498bee9-3340-4f1e-aff6-4723095f214f',
  'AGIBOT World Challenge 2026 tests humanoid robots in real-world industrial settings',
  'eWeek',
  'https://www.eweek.com/news/agibot-world-challenge-2026-apac-china/',
  '2026-05-20 00:00:00',
  'AGIBOT World Challenge 2026: international competition testing humanoid robots in realistic industrial environments. Demonstrates Agibot ecosystem maturity and developer community growth.',
  'en',
  'f090601h0003000080000000000h0003',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [규제] ISO 10218:2025 업데이트 + ISO 25785-1 개발
INSERT INTO articles (title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'ISO 10218:2025 nearly triples in scope; ISO 25785-1 for walking robots expected 2026-2027',
  'TheresARobotForThat / EVSINT',
  'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
  '2026-05-15 00:00:00',
  'ISO 10218:2025 safety section grew from 28 to 50 pages. ISO 25785-1 Working Draft for dynamically stable walking robots expected publication 2026-2027. ANSI/A3 R15.06-2025 adopted as primary US standard. Shift from static checklists to XAI trust architectures.',
  'en',
  'f090601r0001000080000000000r0001',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- ============================================================
-- 2. CI 경쟁사 단계 업데이트
-- ============================================================

UPDATE ci_competitors SET stage = 'commercial', name = 'Optimus Gen 3', updated_at = NOW()
WHERE slug = 'optimus';

UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'atlas';

UPDATE ci_competitors SET stage = 'commercial', name = 'Figure 03', updated_at = NOW()
WHERE slug = 'figure';

UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'neo';

-- ============================================================
-- 3. CI Values 업데이트 (ci_values) — 최신 수집 데이터
-- ============================================================

-- ---- TESLA (Optimus) ----

-- 자유도(DOF): Gen 3 손 50 DOF
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='자유도(DOF)'),
  'Gen 3: 50 DOF 손 (25/hand), body 28+ DOF',
  'B',
  'Optimusk Blog, Robozaps, AI Robots Media',
  'https://optimusk.blog/blog/tesla-optimus-gen-3/',
  '2026-03-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 키/몸무게: 57kg (22% lighter)
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='키/몸무게'),
  '173cm / 57kg (Gen 3, 22% lighter than Gen 2)',
  'B',
  'Optimusk Blog, AI Robots Media',
  'https://optimusk.blog/blog/tesla-optimus-gen-3/',
  '2026-03-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 가격대
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='가격대'),
  '$20,000-$30,000 (목표, Musk Abundance Summit 발언)',
  'C',
  'Elon Musk Abundance Summit 발언',
  'https://optimusk.blog/blog/tesla-optimus-gen-3/',
  '2026-03-12'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  '1,000+ Gen 3 at Fremont factory (Jan 2026). Fremont 1M/yr capacity, Giga TX 10M/yr planned',
  'B',
  'Electrek, Teslarati, The Robot Report',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- GPU 클러스터
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='GPU 클러스터'),
  'Cortex 2.0 supercomputer at Giga TX: 250MW phase Apr 2026, 500MW mid-2026',
  'B',
  'Optimusk Blog, AI Robots Media',
  'https://airobots.media/technology/tesla-optimus-gen-3-everything-we-know-about-teslas-most-ambitious-product/',
  '2026-03-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 제조 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='제조 파트너'),
  'Fremont (전환) + Giga Texas (신규). Samsung Display OLED face 부품 공급',
  'B',
  'Electrek, Basenor',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='optimus'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Production (Fremont 공장 자체 배치 → 외부 판매 준비)',
  'A',
  'Tesla SEC filing, Electrek',
  'https://www.sec.gov/Archives/edgar/data/0001318605/000162828026026551/exhibit991.htm',
  '2026-04-22'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- BOSTON DYNAMICS (Atlas) ----

-- 자유도(DOF)
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='자유도(DOF)'),
  '56 DOF, fully rotational joints',
  'A',
  'Boston Dynamics Official CES 2026',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  '2026-01-05'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 연속동작시간
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='연속동작시간'),
  '4시간 (3분 자동 배터리 교체, 연속 작업 가능)',
  'A',
  'Boston Dynamics Official CES 2026',
  'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 가반하중
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='가반하중'),
  '50kg (110 lbs)',
  'A',
  'Boston Dynamics Official',
  'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 기술 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='기술 파트너'),
  'Google DeepMind (Foundation Model), Hyundai Motor Group',
  'A',
  'Boston Dynamics Official, Automate.org',
  'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  'Hyundai RMAC, Google DeepMind (2026 전량 배정), 추가 고객 2027 예정',
  'A',
  'Boston Dynamics Official CES 2026',
  'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 제조 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='제조 파트너'),
  'Hyundai Motor Group 30,000/yr 전용 공장 2028년 가동 계획',
  'A',
  'Humanoids Daily, Automate.org',
  'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='atlas'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Commercial (첫 상용 유닛 출하, 2026 전량 배정 완료)',
  'A',
  'Boston Dynamics Official, The Register',
  'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
  '2026-01-06'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- FIGURE AI ----

-- 총 펀딩
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='figure'),
  (SELECT id FROM ci_items WHERE name='총 펀딩'),
  '$2.3B total (Series C $1B+ at $39B valuation, Sep 2025)',
  'A',
  'Figure AI Official Press Release',
  'https://www.figure.ai/news/series-c',
  '2025-09-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 최근 밸류에이션
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='figure'),
  (SELECT id FROM ci_items WHERE name='최근 밸류에이션'),
  '$39B (Series C post-money, 2025-09)',
  'A',
  'Figure AI Official, Sacra',
  'https://www.figure.ai/news/series-c',
  '2025-09-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='figure'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  'BMW (30K X3 생산), Amazon (20K 유닛), Mercedes (50K 유닛), $14B+ pipeline through 2029',
  'B',
  'Forge Global, CNBC, KraneShares',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-03-26'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='figure'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  'BMW: 30,000+ X3 생산 기여 (1,250 작업시간). Amazon 20K-unit 배치 진행중',
  'B',
  'Forge Global, KraneShares',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-20'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='figure'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Commercial (BMW/Amazon/Mercedes 다수 고객 상용 배치)',
  'A',
  'Figure AI Official, Forge Global',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-20'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- UNITREE ----

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  '5,500대 (2025) → 20,000대 목표 (2026)',
  'B',
  'eWeek, TechTimes, RobotShop',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-06-02'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 최근 밸류에이션
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='최근 밸류에이션'),
  'STAR Market IPO 승인 (2026-06-01). 매출 ¥1.708B (2025, 335% YoY)',
  'A',
  'TechTimes, The Next Web',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-06-02'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 핵심 AI 모델
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='핵심 AI 모델'),
  'UnifoLM-VLA-0 (오픈소스 VLA 모델), Humanoid Robot App Store',
  'A',
  'Unitree Official',
  'https://www.unitree.com/g1/',
  '2026-03-10'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 오픈소스
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='오픈소스'),
  'UnifoLM-VLA-0 공개 + Humanoid Robot App Store (세계 최초)',
  'A',
  'Unitree Official',
  'https://www.unitree.com/g1/',
  '2026-03-10'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  'Japan Airlines (하네다 공항), GMO Internet, 연구기관 다수',
  'B',
  'RobotShop, ZMProbots',
  'https://community.robotshop.com/blog/show/unitree-robotics-at-ces-2026-a-clear-signal-of-whats-coming-next',
  '2026-02-01'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 가격대
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='가격대'),
  'G1 $16,000 (Base) / $43,900 (EDU). H2 $40,900/$68,900 EDU',
  'A',
  'BotInfo, Robozaps',
  'https://botinfo.ai/articles/unitree-g1',
  '2026-01-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='unitree'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Commercial (대량 생산 + 글로벌 판매 + IPO)',
  'A',
  'TechTimes, eWeek',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-06-02'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- AGILITY ROBOTICS (Digit) ----

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='digit'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  'Toyota Canada, GXO, Schaeffler, Amazon, Mercado Libre (TX + LATAM)',
  'A',
  'Agility Official, The Robot Report, Robotics 24/7',
  'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/',
  '2026-02-20'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='digit'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  '100,000+ totes moved. Fortune 500 다수 배치. Toyota CA: 3→10+ 확장',
  'B',
  'Beginners in AI, Robotics & Automation News',
  'https://beginnersinai.org/agility-robotics-digit-explained/',
  '2026-05-01'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ISO 표준
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='digit'),
  (SELECT id FROM ci_items WHERE name='ISO 표준'),
  'ISO functional safety 인증 추진중. 인간 협업 clearance mid-late 2026 예상',
  'C',
  'Beginners in AI',
  'https://beginnersinai.org/agility-robotics-digit-explained/',
  '2026-05-01'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- APPTRONIK (Apollo) ----

-- 총 펀딩
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='총 펀딩'),
  '~$1B total ($520M Series A extension, Feb 2026)',
  'A',
  'CNBC, SiliconANGLE, Crunchbase News',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 최근 밸류에이션
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='최근 밸류에이션'),
  '$5B (Series A extension, Feb 2026)',
  'A',
  'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 투자자
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='주요 투자자'),
  'Google, B Capital, AT&T Ventures, John Deere, Qatar Investment Authority, Mercedes-Benz',
  'A',
  'CNBC, Crunchbase News',
  'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  'Mercedes-Benz (제조 파일럿), GXO Logistics, Jabil',
  'A',
  'CNBC, The Robot Report',
  'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 기술 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='기술 파트너'),
  'Google DeepMind (Gemini Robotics 모델), Jabil (제조)',
  'A',
  'SiliconANGLE, CNBC',
  'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='apptronik'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Pilot → Commercial (2026 상용 배치 목표)',
  'B',
  'The Robot Report, SiliconANGLE',
  'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
  '2026-02-11'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- 1X (NEO) ----

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  '소비자 출하 시작, 10K pre-order 5일 만에 매진. EQT 10K대 계약',
  'A',
  'Tech Funding News, TechCrunch',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-05-30'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 가격대
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='가격대'),
  '$20,000 (구매) / $499/월 (구독)',
  'B',
  'eWeek, Tech Funding News',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-04-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 최근 밸류에이션
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='최근 밸류에이션'),
  'Targeting $10B (seeking $1B raise)',
  'C',
  'The Information via Dealroom, EqualOcean',
  'https://equalocean.com/briefing/20250924230148618',
  '2025-09-24'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 추론 위치
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='추론 위치'),
  'Edge (Nvidia Jetson Thor), Isaac simulation 학습',
  'B',
  'eWeek, The Next Web',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-04-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 핵심 AI 모델
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='핵심 AI 모델'),
  '1X World Model (영상 학습 기반, 물리 세계 기반 VLA)',
  'B',
  'The Robot Report',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-04-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 제조 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='제조 파트너'),
  'Hayward, CA 58K sqft 자체 공장 (수직 통합: 모터/배터리/센서 in-house)',
  'B',
  'Tech Funding News',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-05-30'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='neo'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Commercial (소비자/B2B 출하 시작)',
  'A',
  'Tech Funding News, eWeek',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-05-30'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- ---- AGIBOT ----

-- 배치 대수
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='배치 대수'),
  '10,000대 돌파 (2026-03). 3개월 만에 5K→10K 2배 증가. 5,000 주문 출하',
  'A',
  'Interesting Engineering, TechTimes',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  '2026-03-31'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 최근 밸류에이션
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='최근 밸류에이션'),
  '홍콩 IPO Q3 2026 계획. US$142M 매출 목표',
  'B',
  'Capital.com, SCMP',
  'https://www.techtimes.com/articles/315988/20260419/agibots-new-robots-show-how-fast-chinas-humanoid-race-moving.htm',
  '2026-05-10'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 기술 파트너
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='기술 파트너'),
  'LG Electronics (지분 투자 + CEO 방문), Minth Group (유럽), Singtel (싱가포르)',
  'A',
  'Korea Herald, Seoul Economic Daily',
  'https://www.koreaherald.com/article/10694574',
  '2026-03-15'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 주요 고객
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='주요 고객'),
  '글로벌: EU, NA, JP, KR, SEA, ME. Minth Group (EU 자동차부품), Singtel (Singapore)',
  'B',
  'Interesting Engineering, Korea Herald',
  'https://interestingengineering.com/ai-robotics/agibot-enters-us-with-humanoids-robot-dog',
  '2026-01-10'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 상용화 단계
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='상용화 단계'),
  'Commercial (대량 생산 + 글로벌 배치 + IPO 준비)',
  'A',
  'TechTimes, TrendForce',
  'https://www.trendforce.com/presscenter/news/20260409-13007.html',
  '2026-04-09'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();

-- 생태계 확장
INSERT INTO ci_values (competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  (SELECT id FROM ci_competitors WHERE slug='agibot'),
  (SELECT id FROM ci_items WHERE name='생태계 확장'),
  'AGIBOT World Challenge 2026 (국제 대회), CES 2026 US 시장 진출, 개발자 생태계',
  'B',
  'eWeek, Interesting Engineering',
  'https://www.eweek.com/news/agibot-world-challenge-2026-apac-china/',
  '2026-05-20'
) ON CONFLICT (competitor_id, item_id)
DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = EXCLUDED.source, source_url = EXCLUDED.source_url, source_date = EXCLUDED.source_date, updated_at = NOW();


-- ============================================================
-- 4. 경쟁 알림 (competitive_alerts) — 주요 이벤트
-- ============================================================

-- Tesla: Fremont 공장 전환 — 양산 시작
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  '36706292-fb03-4d44-a6fa-78a495a7ac41',
  'mass_production',
  'critical',
  '[Tesla] Optimus Gen 3 Fremont 양산 시작 (2026년 7-8월), 1M/yr 라인',
  'Tesla가 Fremont에서 Model S/X 생산을 종료하고 Optimus Gen 3 양산라인으로 전환. 초기 생산 2026년 7-8월 시작. 1,000+ 대 이미 공장 투입. Giga Texas에 10M/yr 2차 공장 준비.',
  '{"source":"Electrek, The Robot Report","confidence":"B","date":"2026-06-09"}'
);

-- Boston Dynamics: Atlas 첫 상용 출하
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  '75b9944f-c9c2-4fde-b7a1-655b9477ec71',
  'mass_production',
  'critical',
  '[BD] Atlas 첫 상용 유닛 출하 — Hyundai RMAC + Google DeepMind',
  'CES 2026에서 프로덕션 Atlas 공개. 56 DOF, 4hr 런타임, 50kg 리프트. 2026 전량 배정 완료. Hyundai 30K/yr 전용 공장 2028 가동 계획.',
  '{"source":"Boston Dynamics Official, Automate.org","confidence":"A","date":"2026-06-09"}'
);

-- Figure AI: 대규모 고객 확보
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  'fa6d4dfb-4389-4189-938e-3e7286c57ed2',
  'partnership',
  'critical',
  '[Figure] Amazon 20K + Mercedes 50K 유닛 수주, $14B 파이프라인',
  'Figure 02 BMW에서 30K+ X3 생산 기여. Figure 03로 Amazon 20K대, Mercedes 50K대 수주. 2029년까지 $14B+ 매출 파이프라인 확보.',
  '{"source":"Forge Global, CNBC, KraneShares","confidence":"B","date":"2026-06-09"}'
);

-- Unitree: IPO + 대량 생산
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  '9740b657-7b31-42fb-b176-92467cfb0e09',
  'funding',
  'critical',
  '[Unitree] STAR Market IPO 승인 — 최초 중국 A주 임바디드 AI 기업',
  'STAR Market IPO 심사 통과 (2026-06-01). ¥1.708B 매출 (335% YoY). 20,000대 2026 목표. Agibot과 함께 중국 휴머노이드 80% 시장 점유.',
  '{"source":"TechTimes, eWeek","confidence":"A","date":"2026-06-09"}'
);

-- Agility: Toyota + Mercado Libre 파트너십
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  '416a1104-47fa-4b87-bd7a-7b6f17b04942',
  'partnership',
  'warning',
  '[Agility] Toyota Canada + Mercado Libre 상업 계약 체결, LATAM 진출',
  'Toyota Motor Manufacturing Canada RaaS 계약. Mercado Libre TX 및 LATAM 확장. 100K+ totes 처리. ISO 기능안전 인증 mid-late 2026 목표.',
  '{"source":"Agility Official, Robotics & Automation News","confidence":"A","date":"2026-06-09"}'
);

-- Apptronik: $520M 펀딩 + Google DeepMind
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  'f36e8e87-37b6-4994-8c34-a11ea063b03c',
  'funding',
  'critical',
  '[Apptronik] $520M 추가 투자, $5B 밸류에이션. Google DeepMind Gemini 통합',
  '$520M Series A 확장으로 총 ~$1B 조달. $5B 밸류에이션. Google/B Capital 공동 리드. Google DeepMind Gemini Robotics 모델 통합.',
  '{"source":"CNBC, SiliconANGLE, Crunchbase","confidence":"A","date":"2026-06-09"}'
);

-- 1X: NEO 소비자 출하 시작
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  '35158f90-6723-4b68-bc1e-da154f155548',
  'mass_production',
  'warning',
  '[1X] NEO 소비자 출하 시작, 10K대 5일 만에 매진, $20K/대',
  'Hayward 공장에서 NEO 소비자 출하 개시. $20K/대 또는 $499/월. 1차 년도 10K대 5일 만에 매진. EQT 계약: 300+ 기업에 10K대.',
  '{"source":"Tech Funding News, TechCrunch, eWeek","confidence":"B","date":"2026-06-09"}'
);

-- Agibot: 10,000대 돌파 + LG 협력
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data)
VALUES (
  'c784e1aa-350d-4937-9adb-2342a49d6086',
  'mass_production',
  'critical',
  '[Agibot] 10,000대 생산 돌파 + LG CEO 방문, 글로벌 확장',
  '10,000번째 로봇 출하 (2026-03). 3개월 만에 2배 증가. LG CEO 상하이 방문 (지분 투자). Unitree+Agibot 중국 80% 점유. Hong Kong IPO Q3 2026.',
  '{"source":"Interesting Engineering, Korea Herald, TrendForce","confidence":"A","date":"2026-06-09"}'
);

-- 규제: ISO 25785-1 + ISO 10218:2025
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
VALUES (
  'partnership',
  'info',
  '[규제] ISO 10218:2025 대폭 확대, ISO 25785-1 보행로봇 표준 2026-2027 예정',
  'ISO 10218:2025 안전 요구사항 28→50페이지 확대. ISO 25785-1 보행로봇 표준 Working Draft (2026-2027 발행 예정). ANSI/A3 R15.06-2025 미국 표준 채택.',
  '{"source":"TheresARobotForThat, EVSINT","confidence":"B","date":"2026-06-09"}'
);


-- ============================================================
-- 5. CI 모니터 알림 (ci_monitor_alerts) — 자동 탐지 이벤트
-- ============================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
VALUES
  ('Electrek', 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/', 'Tesla Fremont Optimus 양산 전환', 'Model S/X 종료 → Optimus Gen 3 양산. 1M/yr capacity.', (SELECT id FROM ci_competitors WHERE slug='optimus'), 'pending'),
  ('Boston Dynamics', 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/', 'Atlas 상용 출시 CES 2026', '56 DOF, 4hr runtime, self-swappable battery. Hyundai/DeepMind 출하.', (SELECT id FROM ci_competitors WHERE slug='atlas'), 'pending'),
  ('Figure AI', 'https://www.figure.ai/news/series-c', 'Figure AI Series C $1B+ at $39B', 'Series C led by Parkway VC. Total $2.3B raised.', (SELECT id FROM ci_competitors WHERE slug='figure'), 'pending'),
  ('eWeek', 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/', 'Unitree 20K 대 목표, IPO 승인', 'STAR Market IPO. ¥1.708B 매출 (335% YoY). 20K shipments 2026.', (SELECT id FROM ci_competitors WHERE slug='unitree'), 'pending'),
  ('Robotics & Automation News', 'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/', 'Digit-Toyota Canada 상업 계약', 'Toyota CA 제조/물류에 Digit 배치. RaaS 모델.', (SELECT id FROM ci_competitors WHERE slug='digit'), 'pending'),
  ('CNBC', 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html', 'Apptronik $520M/$5B 펀딩', '$520M Series A ext. Google/B Capital 공동 리드.', (SELECT id FROM ci_competitors WHERE slug='apptronik'), 'pending'),
  ('Tech Funding News', 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/', '1X NEO 출하 시작, 10K 매진', 'Hayward 공장 NEO 출하. $20K/대. 5일 매진.', (SELECT id FROM ci_competitors WHERE slug='neo'), 'pending'),
  ('Interesting Engineering', 'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots', 'Agibot 10,000대 돌파', '상하이 라인 10K번째 로봇. 3개월 만에 2배 증가.', (SELECT id FROM ci_competitors WHERE slug='agibot'), 'pending'),
  ('Korea Herald', 'https://www.koreaherald.com/article/10694574', 'LG CEO Agibot 상하이 방문', 'LG Electronics CEO 류재철 Agibot 방문. 양산/액추에이터 논의.', (SELECT id FROM ci_competitors WHERE slug='agibot'), 'pending'),
  ('TrendForce', 'https://www.trendforce.com/presscenter/news/20260409-13007.html', '중국 휴머노이드 94% 성장 전망', 'Unitree+Agibot 중국 시장 80% 점유. 2026 94% 생산 증가 전망.', NULL, 'pending');

COMMIT;
