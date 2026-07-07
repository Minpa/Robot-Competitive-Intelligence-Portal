-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-07
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트)
--    content_hash 기반 중복 방지
-- ============================================================

-- [Tesla] Optimus 프리몬트 양산라인 가동 개시
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Musk Shares Tesla Optimus Production Team Photo, Says Initial Robot Output Will Be Extremely Slow',
  'TrendForce',
  'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
  '2026-07-03'::timestamp,
  'Elon Musk visited the Optimus assembly line at Fremont factory. Production begins late July/August 2026 on the converted Model S/X line. Initial output will be extremely slow due to 10,000 unique parts across entirely new production line.',
  'Tesla CEO Elon Musk shared a group photo of the Optimus production team after visiting the humanoid robot assembly line at the companys Fremont factory. Optimus robot production will begin at Fremont in late July or August, four months after the last Model S and X rolled off the line in early May. Musk stated that initial output will be quite slow, calling it literally impossible to predict the production rate this year given Optimus has 10,000 unique parts. The production line is a modular system designed to adapt as Optimus hardware evolves. A second Optimus factory is under construction at Giga Texas, with production expected around summer 2027.',
  'en', 'product', 'robot',
  md5('tesla-optimus-fremont-production-2026-07-03'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus V3"],"technologies":["modular production line","AI5 chip"],"marketInsights":["First humanoid robot mass production line","Model S/X line conversion"],"keyPoints":["Production starts late July/Aug 2026","10,000 unique parts","Second factory at Giga Texas for 2027"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-fremont-production-2026-07-03'));

-- [Tesla] Optimus V3 기술 사양 업데이트
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla Optimus V3: 22-DoF Hands, AI5 Chip, Grok Voice AI - Technical Specifications Update',
  'Multiple Sources',
  'https://optimusk.blog/blog/tesla-optimus-gen-3/',
  '2026-07-01'::timestamp,
  'Optimus V3 features 22-DoF hands (50 actuators total), AI5 chip with ~5x compute of dual AI4 (matches H100 inference), Grok voice AI, 2.3 kWh battery for ~8hr runtime, height 173cm, weight 57kg.',
  'Tesla Optimus V3 technical specifications: 22 degrees of freedom per hand with 50 total hand actuators (25 per side). Powered by the AI5 chip offering approximately 5x bandwidth versus Gen 2, matching NVIDIA H100 inference capability. Integrated Grok voice AI from xAI. 2.3 kWh battery enables practical 8-hour runtime. Physical dimensions: 173cm height, 57kg weight. Estimated top speed approximately 5 mph. Gen 3 refers to upgraded 22-DoF hands fitted to a Gen 2 body, while V3 is the full new-body robot designed for mass production.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-v3-specs-2026-07'),
  '{"mentionedCompanies":["Tesla","xAI","NVIDIA"],"mentionedRobots":["Optimus V3","Optimus Gen 3"],"technologies":["AI5 chip","22-DoF hands","Grok voice AI","2.3kWh battery"],"marketInsights":["H100-class inference on-board"],"keyPoints":["22-DoF hands with 50 actuators","AI5 chip ~5x Gen2","8-hour battery life"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-v3-specs-2026-07'));

-- [Boston Dynamics] Atlas Google DeepMind 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Boston Dynamics & Google DeepMind Form New AI Partnership for Atlas Humanoid Robots',
  'Boston Dynamics',
  'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
  '2026-07-02'::timestamp,
  'Boston Dynamics and Google DeepMind partner to integrate cutting-edge foundation models into Atlas. Hyundai Mobis will supply actuators. All 2026 Atlas deployments fully committed; fleets shipping to Hyundai RMAC and Google DeepMind.',
  'Boston Dynamics announced a new partnership with Google DeepMind to integrate cutting-edge foundation models into Atlas for greater cognitive capabilities. Hyundai Mobis will supply actuators and build a reliable component supply chain. All Atlas deployments for 2026 are fully committed, with fleets shipping to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Additional customers planned for early 2027. The new Atlas represents an order of magnitude reduction in complexity compared to the previous generation. Hyundai plans a dedicated robotics factory capable of 30,000 units per year by 2028.',
  'en', 'product', 'robot',
  md5('bd-atlas-deepmind-partnership-2026-07'),
  '{"mentionedCompanies":["Boston Dynamics","Google DeepMind","Hyundai","Hyundai Mobis"],"mentionedRobots":["Atlas"],"technologies":["foundation models","cognitive AI"],"marketInsights":["30,000 units/yr factory by 2028","All 2026 production committed"],"keyPoints":["Google DeepMind AI partnership","Hyundai Mobis actuator supply","30K unit/yr factory planned 2028"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-deepmind-partnership-2026-07'));

-- [Boston Dynamics] Atlas FIFA World Cup 2026 데모
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Brings Boston Dynamics Atlas to FIFA World Cup 2026 - First-Ever Live Match Robotics Integration',
  'Hyundai Motor Group',
  'https://www.hyundaimotorgroup.com/en/news/hyundai-motor-brings-atlas-humanoid-robot-to-fifa-world-cup-2026-in-first-ever-live-match-environment-robotics-integration',
  '2026-07-05'::timestamp,
  'Atlas performed autonomous Ghost Rabona kick during FIFA World Cup 2026 halftime at NY/NJ Stadium. First-ever robotics-powered halftime activation on footballs biggest stage. No CGI - all movements performed by Atlas itself.',
  'Hyundai Motor integrated Atlas into FIFA World Cup 2026 during a Round of 16 match at New York/New Jersey Stadium, delivering the first-ever robotics-powered halftime activation on footballs biggest stage. Atlas performed a Ghost Rabona, an advanced cross-leg kick, with every movement performed by Atlas itself with no CGI. This demonstration showcased Hyundai commitment to robotics as a core business alongside automotive.',
  'en', 'industry', 'robot',
  md5('bd-atlas-fifa-worldcup-2026-07'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai"],"mentionedRobots":["Atlas"],"technologies":["autonomous motion","dynamic balance"],"marketInsights":["Global brand activation","Robotics as Hyundai core business"],"keyPoints":["FIFA World Cup halftime demo","Autonomous Ghost Rabona kick","No CGI"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-fifa-worldcup-2026-07'));

-- [Figure AI] Figure 03 양산 가속 + BMW 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure AI Ramps Figure 03 Production: 1 Robot/Hour, BMW Spartanburg Deploys 40 Units',
  'Figure AI / BMW Group',
  'https://www.figure.ai/news/ramping-figure-03-production',
  '2026-06-30'::timestamp,
  'Figure AI achieves 24x throughput improvement: from 1 Figure 03/day to 1/hour in 120 days. BMW Spartanburg deploys 40 Figure 03 units for complex logistics sequencing. Figure 02 supported 30,000+ BMW X3 production. Total funding $1.9B+ at $39B valuation.',
  'Figure has increased its production rate from 1 Figure 03 per day to 1 per hour, a 24x throughput improvement in under 120 days. Monthly output grew from roughly 60 robots in February 2026 to 240 in April 2026. BMW Group Plant Spartanburg has deployed 40 Figure 03 units for complex sequencing applications in logistics, following successful deployment of Figure 02 which supported production of more than 30,000 BMW X3 vehicles over ten months. Figure AI has raised over $1.9 billion from investors including NVIDIA, Jeff Bezos, OpenAI, and Microsoft, with a $39 billion valuation. Helix-02 VLA demonstration showed two robots coordinating autonomously to clean a bedroom using a single shared Vision-Language-Action policy.',
  'en', 'product', 'robot',
  md5('figure-03-production-ramp-bmw-2026-06'),
  '{"mentionedCompanies":["Figure AI","BMW","NVIDIA","OpenAI","Microsoft"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix-02 VLA","Vision-Language-Action policy","multi-robot coordination"],"marketInsights":["24x production throughput increase","$39B valuation","$1.9B+ total funding"],"keyPoints":["1 robot/hour production rate","40 units at BMW Spartanburg","Helix-02 dual-robot VLA demo"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-production-ramp-bmw-2026-06'));

-- [Unitree] G1 일본항공 하네다공항 배치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Japan Airlines Deploys Unitree G1 Robots at Haneda Airport - First Commercial Airline Humanoid Robot Trial',
  'CNBC',
  'https://www.cnbc.com/2026/05/01/japan-airlines-humanoid-robots-haneda-labor-shortage.html',
  '2026-05-01'::timestamp,
  'Japan Airlines launches 2-year trial of Unitree G1 robots at Tokyo Haneda Airport for baggage/cargo handling. First commercial airline to run multi-year operational trial of bipedal humanoid robots in active aviation service. Partnership with GMO AI & Robotics.',
  'Japan Airlines launched a two-year trial of humanoid robots at Tokyo Haneda Airport starting early May 2026 to support ground handling tasks amid labor shortages. The initiative partners with GMO AI & Robotics to deploy Unitree G1 models for baggage and cargo operations. The 130cm-tall bipedal robots with 2-3 hour battery life will progress to assisting in loading and unloading cargo containers. Trial runs through 2028 with evaluation of autonomous logistics workflows. Tasks include aircraft towing, baggage/cargo loading/unloading, and cabin cleaning. This marks the first commercial airline to run a multi-year operational trial of bipedal humanoid robots in active aviation service.',
  'en', 'industry', 'robot',
  md5('unitree-g1-jal-haneda-2026-05'),
  '{"mentionedCompanies":["Unitree","Japan Airlines","GMO AI & Robotics"],"mentionedRobots":["G1"],"technologies":["autonomous logistics","bipedal navigation"],"marketInsights":["First airline humanoid deployment","Japan labor shortage solution","2-year trial through 2028"],"keyPoints":["Haneda Airport deployment","Baggage/cargo handling","Partnership with JAL and GMO"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-g1-jal-haneda-2026-05'));

-- [Unitree] IPO 및 생산 확대
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Files Shanghai Stock Exchange IPO, Targets 20,000 G1 Units in 2026',
  'Forbes / Multiple Sources',
  'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
  '2026-04-27'::timestamp,
  'Unitree filed for IPO on Shanghai Stock Exchange in March 2026. 335% YoY revenue growth (¥1.708B in 2025). Scaling from 5,500 G1 units shipped in 2025 to 20,000 in 2026. Open-sourced UnifoLM-VLA-0 for autonomous household tasks.',
  'Unitree filed for an initial IPO to list on the Shanghai Stock Exchange in March 2026. The company reported 335% revenue growth year-over-year in 2025 reaching ¥1.708B. Production is scaling from 5,500 G1 units shipped in 2025 to 20,000 planned for 2026. In March 2026, Unitree open-sourced UnifoLM-VLA-0, a Vision-Language-Action model enabling autonomous household tasks via natural language commands. G1 base model priced at $16,000.',
  'en', 'industry', 'robot',
  md5('unitree-ipo-production-scale-2026-04'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","H1"],"technologies":["UnifoLM-VLA-0","Vision-Language-Action"],"marketInsights":["335% YoY revenue growth","Shanghai Stock Exchange IPO","$16K base price"],"keyPoints":["IPO filing March 2026","20,000 G1 target for 2026","Open-source VLA model"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-ipo-production-scale-2026-04'));

-- [Agility Robotics] SPAC IPO + Digit v5
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics Goes Public in $2.5B SPAC Deal - First US-Listed Pure-Play Humanoid Company',
  'Forbes / GeekWire / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  '2026-06-24'::timestamp,
  'Agility Robotics signs $2.5B SPAC deal with Churchill Capital XI for Nasdaq listing (ticker: AGLT). First US-listed pure-play humanoid robotics company. Digit v5 announced: 50lb payload, ~22hr operation, NVIDIA Halos safety (IEC 61508 SIL 3). $300M+ in multi-year orders.',
  'Agility Robotics signed a $2.5 billion SPAC deal with Churchill Capital XI on June 24, 2026, becoming the first publicly traded U.S. company dedicated solely to humanoid robots. Expected to trade on Nasdaq under ticker AGLT by end of 2026. Currently has 75 units globally deployed at 9 customer sites with 65,000+ operational hours. Key deployments include Schaeffler (15 months continuous), GXO/SPANX (100,000+ totes moved), Toyota Canada (7 robots), and Mercado Libre. Digit v5 announced with 50lb payload limit, ~22hr operation, and NVIDIA Halos safety platform (IEC 61508 SIL 3). Over $300M in multi-year orders for Digit v5.',
  'en', 'industry', 'robot',
  md5('agility-spac-ipo-digit-v5-2026-06'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","NVIDIA","Toyota","GXO","Schaeffler","Mercado Libre"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos","IEC 61508 SIL 3","IGX Thor"],"marketInsights":["$2.5B valuation","First US humanoid IPO","$300M+ orders","75 units deployed"],"keyPoints":["Nasdaq SPAC listing (AGLT)","Digit v5: 50lb payload, 22hr operation","NVIDIA Halos safety integration"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-ipo-digit-v5-2026-06'));

-- [Apptronik] Series A $935M + Google DeepMind 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  'Apptronik Closes $935M+ Series A at $5B Valuation, Unveils Apollo 2 and Robot Park Facility',
  'CNBC / Apptronik',
  'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
  '2026-06-30'::timestamp,
  'Apptronik raises total $935M+ Series A (including $520M round at $5B valuation with Google). Strategic partnership with Google DeepMind for Gemini Robotics. Partnerships with Mercedes-Benz, GXO, Jabil. Robot Park facility opened June 30, 2026 in Austin. Apollo 2 unveiled in bipedal + wheeled configs.',
  'In February 2026, Apptronik announced a $520 million Series A-X funding round, bringing total Series A to over $935 million at $5 billion valuation. Google participated in the round. Strategic partnership with Google DeepMind to build next-generation humanoid robots powered by Gemini Robotics. Partnerships include Mercedes-Benz, GXO Logistics, and Jabil. Robot Park flagship data collection and training facility opened June 30, 2026 in Austin, Texas. Apollo 2 unveiled in both bipedal and wheeled-base configurations. Apollo 3 in development leveraging massive data streams from Google DeepMind partnership.',
  'en', 'industry', 'robot',
  md5('apptronik-935m-apollo2-robotpark-2026-06'),
  '{"mentionedCompanies":["Apptronik","Google","Google DeepMind","Mercedes-Benz","GXO Logistics","Jabil"],"mentionedRobots":["Apollo","Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","data collection facility"],"marketInsights":["$5B valuation","$935M+ total Series A","Google strategic investment"],"keyPoints":["$935M+ Series A funding","Google DeepMind Gemini Robotics partnership","Robot Park facility opened"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-935m-apollo2-robotpark-2026-06'));

-- [1X Technologies] NEO EQT 파트너십 + 양산
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Technologies Signs EQT Deal for 10,000 NEO Robots, Hayward Factory Sold Out in 5 Days',
  'TechCrunch / BusinessWire',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '2026-06-15'::timestamp,
  '1X signs deal with EQT to deploy up to 10,000 NEO robots across 300+ portfolio companies (2026-2030). Hayward, CA factory (58,000 sq ft) first-year capacity of 10,000 units sold out in 5 days. NEO priced at $20,000 or $499/month rental. Consumer shipments planned late 2026.',
  '1X Technologies struck a deal to ship up to 10,000 NEO humanoid robots between 2026 and 2030 to EQT more than 300 portfolio companies with concentration on manufacturing, warehousing, logistics, and other industrial use cases. The Hayward, California facility has capacity to produce 10,000 NEO robots in its first year, with entire first-year production capacity sold out within five days of preorders opening in October 2025. NEO available at $20,000 purchase price or $499/month rental (six-month minimum). Consumer shipments planned before end of 2026. 1X has raised more than $130 million from EQT Ventures, Tiger Global, and OpenAI Startup Fund.',
  'en', 'product', 'robot',
  md5('1x-neo-eqt-deal-hayward-factory-2026'),
  '{"mentionedCompanies":["1X Technologies","EQT","Tiger Global","OpenAI"],"mentionedRobots":["NEO"],"technologies":["vertically integrated manufacturing"],"marketInsights":["$20K consumer price point","$499/mo rental model","First US humanoid factory","Sold out in 5 days"],"keyPoints":["10,000 robot EQT deal (2026-2030)","Hayward factory 10K/yr capacity","Consumer + enterprise dual market"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-eqt-deal-hayward-factory-2026'));

-- [Agibot] 10,000대 생산 + IPO + 유럽 진출
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%智元%' LIMIT 1),
  'Agibot Hits 10,000 Unit Milestone, Plans Hong Kong IPO at $5-6.4B Valuation, Expands to Europe',
  'TechTimes / Yahoo Finance',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-06-02'::timestamp,
  'Agibot produced 10,000th humanoid robot on March 30, 2026 (3-month acceleration from 5K to 10K). 39% global humanoid market share. Hong Kong IPO planned at HK$40-50B valuation ($5.1-6.4B). Munich launch with Minth Group partnership for European auto-parts production. LG Electronics strategic investment.',
  'AgiBot produced its 10,000th humanoid robot on March 30, 2026, with Expedition A3 platform leading deployment. Moved from 5,000 to 10,000 in three months, a fourfold acceleration in throughput. Shipped 5,100+ humanoids in 2025 capturing 39% global market share. Planning Hong Kong listing at HK$40-50B valuation (US$5.1-6.4B), potentially raising over US$1B. Munich launch in February 2026 with strategic partnership with Minth Group for European auto-parts production lines. Deployments span logistics, retail, hospitality, and industrial manufacturing across Europe, North America, Japan, South Korea, Southeast Asia, and Middle East. LG Electronics was among strategic investors. Targeting US$142M revenue.',
  'en', 'industry', 'robot',
  md5('agibot-10k-milestone-ipo-europe-2026'),
  '{"mentionedCompanies":["Agibot","LG Electronics","Minth Group"],"mentionedRobots":["Expedition A3","X1"],"technologies":["high-volume humanoid manufacturing"],"marketInsights":["39% global market share","HK$40-50B IPO valuation","US$142M revenue target","LG Electronics strategic investor"],"keyPoints":["10,000th unit milestone","Hong Kong IPO planned","European expansion with Minth Group"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-10k-milestone-ipo-europe-2026'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림)
--    robot_id는 humanoid_robots 테이블에서 동적 조회
-- ============================================================

-- [CRITICAL] Tesla Optimus 프리몬트 양산 개시
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Tesla] Optimus V3 프리몬트 양산라인 가동 - 2026년 7~8월 생산 개시',
  'Tesla가 Model S/X 생산라인을 Optimus 전용으로 전환 완료. 2026년 7월 말~8월 양산 시작. 10,000개 부품의 완전 신규 생산라인. Giga Texas 제2공장은 2027년 여름 가동 예정. AI5 칩(H100급 추론), 22-DoF 핸드, 8시간 배터리.',
  '{"source":"TrendForce/Teslarati","confidence":"A","date":"2026-07-03","specs":{"hands_dof":22,"chip":"AI5","battery_hours":8,"height_cm":173,"weight_kg":57}}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Optimus%프리몬트%양산%'
  AND created_at > '2026-07-01'::timestamp
);

-- [CRITICAL] Boston Dynamics + Google DeepMind 파트너십
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'critical',
  '[Boston Dynamics] Google DeepMind 파운데이션 모델 통합 파트너십 체결',
  'Atlas에 Google DeepMind 파운데이션 모델 통합. Hyundai Mobis 액추에이터 공급. 2026년 전량 배치 완료(Hyundai RMAC + Google DeepMind). 2028년까지 연 30,000대 규모 전용 공장 계획. FIFA World Cup 2026에서 자율 데모.',
  '{"source":"Boston Dynamics Official Blog","confidence":"A","date":"2026-07-02","partners":["Google DeepMind","Hyundai Mobis"],"production_target":"30,000 units/yr by 2028"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Boston Dynamics%DeepMind%'
  AND created_at > '2026-07-01'::timestamp
);

-- [CRITICAL] Figure AI 양산 가속
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%03%' OR name ILIKE '%Figure 03%' ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Figure AI] Figure 03 양산 24배 가속 - 시간당 1대 생산 달성',
  'Figure 03 생산율 120일 만에 24배 향상(일 1대→시간 1대). 월 240대 생산(4월 기준). BMW 스파르탄버그에 40대 배치. $39B 기업가치, $1.9B+ 누적 투자. Helix-02 VLA 듀얼 로봇 자율 협업 데모.',
  '{"source":"Figure AI Official","confidence":"A","date":"2026-06-30","production_rate":"1 unit/hour","monthly_output":240,"bmw_units":40,"valuation":"$39B"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure%양산%24배%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Agility Robotics SPAC IPO
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Agility Robotics] $2.5B SPAC IPO - 미국 최초 휴머노이드 전업 상장사',
  'Churchill Capital XI과 $2.5B SPAC 합병. Nasdaq AGLT 티커로 2026년 내 상장 예정. Digit v5: 50lb 페이로드, ~22시간 운용, NVIDIA Halos 안전 시스템(IEC 61508 SIL 3). $300M+ 다년 주문. 현재 9개 고객사 75대 배치, 65,000시간+ 운용.',
  '{"source":"SEC Filing/Forbes/GeekWire","confidence":"A","date":"2026-06-24","valuation":"$2.5B","ticker":"AGLT","digit_v5_specs":{"payload_lb":50,"operation_hours":22,"safety":"NVIDIA Halos SIL 3"},"orders":"$300M+"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agility%SPAC%IPO%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Apptronik $935M 투자 유치
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Apptronik] Series A 총 $935M+ 유치, $5B 기업가치, Google DeepMind 전략적 파트너십',
  '$520M 추가 투자로 총 $935M+ Series A 완료. $5B 기업가치. Google DeepMind Gemini Robotics 파트너십. Mercedes-Benz, GXO, Jabil 파트너십. Robot Park 플래그십 시설 오픈(6/30). Apollo 2 공개, Apollo 3 개발 중.',
  '{"source":"CNBC/Apptronik Official","confidence":"A","date":"2026-06-30","total_funding":"$935M+","valuation":"$5B","partners":["Google DeepMind","Mercedes-Benz","GXO","Jabil"]}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Apptronik%935M%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Agibot 10,000대 돌파 + IPO
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Agibot%' OR name ILIKE '%X1%' OR name ILIKE '%Expedition%' ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[Agibot] 누적 10,000대 생산 돌파, 글로벌 점유율 39%, 홍콩 IPO 추진',
  '2026.3.30 누적 10,000대 생산(5K→10K 3개월 소요, 4배 가속). 글로벌 시장 점유율 39%. 홍콩 IPO HK$40-50B 기업가치. Minth Group 유럽 파트너십. LG전자 전략적 투자 유치. 유럽/북미/일본/한국/동남아/중동 배치.',
  '{"source":"TechTimes/Yahoo Finance","confidence":"B","date":"2026-06-02","milestone":"10,000 units","market_share":"39%","ipo_valuation":"HK$40-50B","lg_investment":true}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%10,000%'
  AND created_at > '2026-06-01'::timestamp
);

-- [INFO] 1X Technologies NEO 양산 + EQT 딜
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'info',
  '[1X Technologies] EQT 10,000대 공급 계약, Hayward 공장 첫해 물량 5일 만에 완판',
  'EQT 300+ 포트폴리오사에 10,000대 NEO 공급 계약(2026-2030). Hayward, CA 공장 10,000대/년 생산능력. 사전예약 오픈 5일 만에 첫해 물량 완판. $20,000 구매 또는 $499/월 렌탈. 2026년 말 소비자 배송 시작.',
  '{"source":"TechCrunch/BusinessWire","confidence":"A","date":"2026-06-15","deal_size":"10,000 robots","partner":"EQT","price":"$20,000","rental":"$499/month","factory":"Hayward, CA"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%1X%EQT%'
  AND created_at > '2026-06-01'::timestamp
);

-- [INFO] Unitree G1 항공 산업 진출
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'info',
  '[Unitree] G1 일본항공 하네다공항 배치 - 세계 최초 항공사 휴머노이드 운용',
  'JAL + GMO AI & Robotics와 2년 운용 시험(~2028). 수하물/화물 처리. 세계 최초 상업 항공사 휴머노이드 배치. 상하이 증권거래소 IPO 신청. 2025년 ¥1.708B 매출(YoY 335%). 2026년 20,000대 생산 목표.',
  '{"source":"CNBC/Multiple","confidence":"A","date":"2026-05-01","deployment":"Tokyo Haneda Airport","partner":"Japan Airlines + GMO","trial_duration":"2 years","ipo":"Shanghai Stock Exchange"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%일본항공%'
  AND created_at > '2026-05-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림)
--    경쟁사별 주요 동향을 pending 상태로 삽입
-- ============================================================

-- Tesla Optimus
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TrendForce',
  'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
  'Tesla Optimus V3 프리몬트 양산 시작 (2026.07~08), AI5 칩 탑재',
  'Fremont 공장 Model S/X 라인 전환 완료. V3: 22-DoF 핸드, AI5 칩(H100급), 8시간 배터리. 초기 생산 매우 느릴 것. Giga Texas 2027년 제2공장.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla Optimus%양산%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Boston Dynamics Atlas
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Boston Dynamics Blog',
  'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
  'Boston Dynamics Atlas + Google DeepMind AI 파트너십, 2026 배치 전량 확정',
  'Google DeepMind 파운데이션 모델 통합. Hyundai Mobis 액추에이터 공급. 2026 전량 배치 완료. 연 30K 공장 2028년 계획. FIFA WC 2026 데모.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Atlas%DeepMind%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Figure AI
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Figure AI / BMW Group Press',
  'https://www.figure.ai/news/ramping-figure-03-production',
  'Figure 03 양산 24x 가속 (시간당 1대), BMW 40대 배치, $39B 기업가치',
  '120일 만에 24배 생산 가속. BMW 스파르탄버그 40대 배치, 30K+ X3 생산 지원. $1.9B+ 투자, $39B 가치. Helix-02 VLA 듀얼로봇 자율협업.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure 03%양산%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Unitree G1
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'CNBC',
  'https://www.cnbc.com/2026/05/01/japan-airlines-humanoid-robots-haneda-labor-shortage.html',
  'Unitree G1 JAL 하네다공항 배치, IPO 신청, 2026년 20K대 목표',
  'JAL+GMO 2년 운용시험. 세계최초 항공사 휴머노이드. 상하이 IPO. ¥1.708B 매출(335%↑). UnifoLM-VLA-0 오픈소스.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR slug ILIKE '%g1%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%JAL%'
  AND detected_at > '2026-05-01'::timestamp
);

-- Agility Robotics Digit
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  'Agility Robotics $2.5B SPAC IPO, Digit v5 공개, NVIDIA Halos 안전시스템',
  '미국 최초 휴머노이드 전업 상장. Digit v5: 50lb/22hr/NVIDIA Halos SIL3. $300M+ 주문. 75대 9개 고객사 배치중. Toyota/Schaeffler/GXO.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility%SPAC%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Apptronik Apollo
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'CNBC / Apptronik',
  'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
  'Apptronik $935M+ Series A ($5B 가치), Google DeepMind Gemini 파트너십',
  '$520M 추가 투자. Google DeepMind Gemini Robotics 전략파트너십. Mercedes-Benz/GXO/Jabil. Robot Park 오픈. Apollo 2 공개, Apollo 3 개발.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR name ILIKE '%Apollo%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Apptronik%935M%'
  AND detected_at > '2026-06-01'::timestamp
);

-- 1X Technologies NEO
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechCrunch / BusinessWire',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '1X NEO EQT 10K대 공급계약, Hayward 공장 5일 완판, $20K 소비자 가격',
  'EQT 300+ 포트폴리오사 10K대 계약(2026-2030). 58K sqft Hayward 공장. 5일 만에 첫해 완판. $20K/$499월 렌탈. 2026말 소비자 배송.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR name ILIKE '%NEO%' OR name ILIKE '%1X%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X%NEO%EQT%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Agibot
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechTimes / Yahoo Finance',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  'Agibot 10,000대 돌파, 글로벌 39% 점유율, HK IPO $5-6.4B, LG전자 투자',
  '3개월만 5K→10K(4배 가속). 39% 시장점유율. HK IPO HK$40-50B. Minth Group 유럽 파트너십. LG전자 전략투자. US$142M 매출 목표.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%X1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%10,000%'
  AND detected_at > '2026-06-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 10 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 8 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 8 (deduplicated by headline + date)
-- Total: up to 26 records across 3 tables
--
-- NOTE: This script uses dynamic lookups for company_id, robot_id,
-- competitor_id via subqueries. If a referenced entity doesn't exist
-- in the database, the FK field will be NULL (not a hard failure).
-- ============================================================
