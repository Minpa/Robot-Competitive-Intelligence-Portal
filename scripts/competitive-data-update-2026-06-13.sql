-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 - 2026-06-13
-- 실행 전 DATABASE_URL 환경변수 확인 필요
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla Optimus] Gen 3 Fremont 생산 전환
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Tesla Converts Model S Line to Optimus Gen 3 Robot Factory at Fremont',
  'TechTimes',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09'::timestamp,
  'Tesla officially started Optimus Gen 3 pilot production at Fremont on Jan 21, 2026. Model S/X line converted to 1M unit/year pilot line. Giga Texas 5.2M sqft expansion targeting 10M robots/year by summer 2027. 1,000+ Gen 3 units now operating at Fremont on battery assembly, EV pack loading, and parts handling. Public sale targeted end of 2027 at $20,000-$30,000.',
  'Tesla Q1 2026 confirms Optimus Gen 3 production lines underway at Fremont with pilot line targeting 1M robots/year. Giga Texas 5.2M sqft factory targeting 10M robots/year. At 2026 Abundance Summit, Musk confirmed Optimus 3 production begins summer 2026, public sale end of 2027 at $20K-$30K. Joint Tesla-xAI project "Digital Optimus/Macrohard" announced March 11, 2026.',
  'en', 'product', 'robot',
  md5('tesla-optimus-gen3-fremont-production-2026-06'),
  '{"mentionedCompanies":["Tesla","xAI"],"mentionedRobots":["Optimus Gen 3"],"technologies":["battery assembly automation","cable routing"],"marketInsights":["$20K-$30K target price","10M units/year target","1M pilot line"],"keyPoints":["Gen 3 pilot started Jan 21 2026","1000+ units operating at Fremont","Giga Texas 5.2M sqft expansion"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-gen3-fremont-production-2026-06'));

-- [Boston Dynamics Atlas] CES 2026 상용화 출시
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Boston Dynamics Launches Production-Ready Atlas at CES 2026, Ships to Hyundai and Google DeepMind',
  'Boston Dynamics Official',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  '2026-01-06'::timestamp,
  'Boston Dynamics unveiled production Atlas at CES 2026. Enterprise-grade humanoid for industrial tasks. 7.5ft reach, tactile sensing hands, 110 lb lift capacity. 2026 allocation fully committed to Hyundai RMAC and Google DeepMind. Hyundai planning 30,000 unit/year factory by 2028. NVIDIA Jetson Thor platform (800 TOPS).',
  'Boston Dynamics introduced production Atlas at CES 2026. Enterprise-grade humanoid with 7.5ft reach, tactile finger/palm sensing, 110 lb lift. Powered by NVIDIA Jetson Thor (800 TOPS). 2026 fully committed to Hyundai RMAC and Google DeepMind. Hyundai $26B US investment includes dedicated robotics factory 30,000 units/year by 2028. Estimated price $150K-$420K per unit.',
  'en', 'product', 'robot',
  md5('boston-dynamics-atlas-ces2026-production-launch'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind","NVIDIA"],"mentionedRobots":["Atlas Electric"],"technologies":["Jetson Thor 800 TOPS","tactile sensing","LiDAR"],"marketInsights":["$150K-$420K per unit","30K units/year by 2028","$26B Hyundai investment"],"keyPoints":["Production Atlas unveiled at CES 2026","2026 allocation fully committed","Hyundai RMAC + Google DeepMind deployments"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('boston-dynamics-atlas-ces2026-production-launch'));

-- [Figure AI] Production ramp and BMW deployment
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Figure AI Ramps Production to One Humanoid Robot Per Hour, BMW Logs 1,250+ Runtime Hours',
  'The AI Insider',
  'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
  '2026-05-01'::timestamp,
  'Figure AI increased Figure 03 production from 1/day to 1/hour in 4 months, producing 350+ robots at BotQ facility. Figure 02 at BMW Spartanburg ran daily 10-hour shifts for 11 months, loading 90,000+ parts across 1,250+ runtime hours for 30,000+ X3 vehicles. $39B valuation with $1.9B total funding. Helix 02 VLA model released March 2026 with full-body control.',
  'Figure AI ramped Figure 03 production to 1 robot/hour at BotQ. BMW Spartanburg: Figure 02 completed 11-month deployment with 90,000+ parts loaded, 1,250+ runtime hours, 30,000+ X3 vehicles. UPS reportedly deploying. Series C $1B+ at $39B valuation. Helix VLA in-house model, Helix 02 released March 2026 for full-body control including walking. Figure 03 consumer availability late 2026 earliest.',
  'en', 'product', 'robot',
  md5('figure-ai-production-ramp-bmw-2026-05'),
  '{"mentionedCompanies":["Figure AI","BMW","UPS","OpenAI"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["Helix VLA","Helix 02","BotQ manufacturing"],"marketInsights":["$39B valuation","$1.9B total funding","1 robot/hour production rate"],"keyPoints":["Production 1/day to 1/hour in 4 months","BMW 90K+ parts 1250+ hours","Helix 02 full-body control March 2026"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-production-ramp-bmw-2026-05'));

-- [Unitree] NVIDIA partnership and IPO approval
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Unitree Clears STAR Market IPO, Partners with NVIDIA for Isaac GR00T Reference Humanoid',
  'CNBC',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  '2026-06-01'::timestamp,
  'Unitree cleared Shanghai STAR Market IPO listing (June 1, 2026), targeting 4.2B yuan ($620M) raise at ~$6B valuation. NVIDIA selected H2 Plus as first Isaac GR00T Reference Humanoid Robot with Jetson Thor + Blackwell GPU. 5,500+ G1 units shipped in 2025, targeting 10K-20K in 2026. Open-sourced UnifoLM-VLA-0 in March 2026. Product lineup: R1 Air $4.9K to H1 $90K.',
  'Unitree cleared STAR Market IPO June 1, 2026 - first "embodied AI" on China A-share. Targeting 4.2B yuan raise, ~$6B valuation. NVIDIA partnership: H2 Plus = first Isaac GR00T humanoid with Jetson Thor + Blackwell GPU, available late 2026. Shipped 5,500+ G1 in 2025. UnifoLM-VLA-0 open-sourced March 2026. Security: UniPwn BLE vulnerability disclosed Sept 2025. Total funding $252M over 6 rounds.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-ipo-nvidia-partnership-2026-06'),
  '{"mentionedCompanies":["Unitree","NVIDIA","Shanghai Stock Exchange"],"mentionedRobots":["H2 Plus","G1","H1","R1"],"technologies":["Isaac GR00T","Jetson Thor","Blackwell GPU","UnifoLM-VLA-0"],"marketInsights":["$6B IPO valuation","$252M total funding","5500+ G1 shipped 2025"],"keyPoints":["STAR Market IPO approved June 1","NVIDIA Isaac GR00T partnership","UnifoLM-VLA-0 open-sourced"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-nvidia-partnership-2026-06'));

-- [Agility Robotics] Toyota partnership and commercial expansion
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Agility Robotics Signs Toyota Canada Commercial Agreement, Digit Surpasses 100K Totes',
  'The Robot Report',
  'https://www.therobotreport.com/toyota-motor-manufacturing-canada-deploys-agility-robotics-digit-humanoids/',
  '2026-02-15'::timestamp,
  'Toyota Motor Manufacturing Canada signed commercial agreement for Digit, expanding from 3 to 10 units. Mercado Libre agreement for fulfillment operations starting in Texas. Digit surpassed 100,000 totes milestone and passed OSHA safety inspection. Active customers: GXO, Amazon, Schaeffler, Toyota, Spanx, Mercado Libre. $400M Series C at $2.1B valuation, $640M total funding.',
  'Agility Robotics expanded commercial footprint: Toyota Canada expanding 3 to 10 Digits. Mercado Libre partnership for Latin American fulfillment. 100K+ totes moved milestone. OSHA safety inspection passed. Deployed across US (Oregon, Pennsylvania, California). Operating cost $10-12/hr, path to $2-3/hr. Digit specs: 5''9", 35 lb lift, $100K+ price. Total $640M funding at $2.1B valuation.',
  'en', 'industry', 'robot',
  md5('agility-robotics-toyota-canada-mercado-libre-2026'),
  '{"mentionedCompanies":["Agility Robotics","Toyota","Mercado Libre","GXO","Amazon","Schaeffler"],"mentionedRobots":["Digit"],"technologies":["bipedal locomotion","autonomous docking"],"marketInsights":["$2.1B valuation","$640M total funding","$10-12/hr operating cost"],"keyPoints":["Toyota Canada commercial agreement","100K+ totes milestone","OSHA safety inspection passed"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-robotics-toyota-canada-mercado-libre-2026'));

-- [Apptronik] $520M funding and Google DeepMind partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Apptronik Raises $520M at $5B Valuation, Google DeepMind Gemini Robotics Partnership',
  'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'::timestamp,
  'Apptronik raised $520M extension round at $5B valuation, total funding ~$1B. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Strategic partnership with Google DeepMind for Gemini Robotics-powered next-gen humanoids. Apollo deployed with Mercedes-Benz and GXO Logistics. New robot debut planned for 2026.',
  'Apptronik $520M extension pushes total funding near $1B at $5B valuation. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Returning: B Capital, Google, Mercedes-Benz, PEAK6. Google DeepMind strategic partnership for Gemini Robotics integration. Apollo tested at Mercedes-Benz factories and GXO warehouses. Jabil partnership for manufacturing. New robot debut planned 2026.',
  'en', 'industry', 'robot',
  md5('apptronik-520m-funding-google-deepmind-2026-02'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO","AT&T","John Deere","Qatar Investment Authority","Jabil"],"mentionedRobots":["Apollo"],"technologies":["Gemini Robotics"],"marketInsights":["$5B valuation","~$1B total funding","$520M extension round"],"keyPoints":["$520M at $5B valuation","Google DeepMind Gemini partnership","New robot debut 2026"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-520m-funding-google-deepmind-2026-02'));

-- [1X Technologies] NEO factory and consumer launch
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  '1X Opens NEO Factory in Hayward CA, Sells Out 10,000+ First-Year Units in 5 Days',
  'GlobeNewsWire',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '2026-04-30'::timestamp,
  '1X opened NEO Factory in Hayward, CA (April 2026) - America''s first vertically integrated humanoid robot factory. Sold out entire first-year production (10,000+ units) in 5 days. Price: $20,000 or $499/month subscription. NEO: 5''6", 66 lbs, soft exterior, human-in-the-loop teleoperation. Target: 100,000+ robots/year by end of 2027. OpenAI-backed, NVIDIA GR00T N1 integration.',
  '1X NEO Factory opened Hayward, CA April 2026 - first vertically integrated humanoid factory in US. 200+ jobs created. Sold 10,000+ first-year units in 5 days. $20K purchase or $499/mo subscription. NEO specs: 5''6", 66 lbs, soft exterior. Human-in-the-loop teleoperation system. OpenAI investor, NVIDIA GR00T N1 model integrated. Target 100K+ units/year by 2027. Total funding ~$137M, seeking $1B at $10B+ valuation.',
  'en', 'product', 'robot',
  md5('1x-neo-factory-hayward-consumer-launch-2026-04'),
  '{"mentionedCompanies":["1X Technologies","OpenAI","NVIDIA"],"mentionedRobots":["NEO"],"technologies":["GR00T N1","teleoperation","vertically integrated manufacturing"],"marketInsights":["$20K price or $499/mo","10K+ units sold in 5 days","$10B+ target valuation"],"keyPoints":["First US vertically integrated humanoid factory","10K units sold out in 5 days","Consumer shipments 2026"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-factory-hayward-consumer-launch-2026-04'));

-- [Agibot] CES 2026 US debut and IPO plans
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'AgiBot Makes US Market Debut at CES 2026, Plans $6.4B Hong Kong IPO, Ships 10,000+ Robots',
  'PR Newswire',
  'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
  '2026-01-07'::timestamp,
  'AgiBot debuted at CES 2026 with full humanoid portfolio. Planning HK IPO Q3 2026 targeting HK$40-50B ($5.1-6.4B) valuation. Shipped 10,000+ robots by March 2026. Omdia ranked #1 globally in 2025 humanoid shipments (5,168 units). Investors include LG Electronics, Mirae Asset, BYD, Hillhouse, Tencent. Products: X1 (34 DOF, $20K), A2 (40+ DOF, 200 TOPS), 8+ product lines.',
  'AgiBot CES 2026 US debut showcasing full portfolio. HK IPO planned Q3 2026, targeting HK$40-50B ($5.1-6.4B), selling 15-25% of shares potentially raising $1B+. Shipped 10,000+ robots by March 2026, Omdia #1 globally 2025 (5,168 units). Investors: LG Electronics, Mirae Asset, BYD, Hillhouse, Tencent, HongShan Capital. X1: 130cm, 33kg, 34 DOF, $20K. A2: 49 DOF, 200 TOPS, 10kg dual-arm payload. Total funding $83.8M.',
  'en', 'industry', 'robot',
  md5('agibot-ces2026-us-debut-hk-ipo-10000-units'),
  '{"mentionedCompanies":["AgiBot","LG Electronics","Mirae Asset","BYD","Tencent","Hillhouse"],"mentionedRobots":["X1","A2","A2-Max","A2-W","Lingxi X1"],"technologies":["PowerFlow servo","WorkGPT"],"marketInsights":["$5.1-6.4B IPO target","10K+ units shipped","Omdia #1 globally 2025"],"keyPoints":["CES 2026 US market debut","HK IPO Q3 2026","LG Electronics investor"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-ces2026-us-debut-hk-ipo-10000-units'));

-- [Industry] Humanoid robot safety regulations update
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'China MIIT Publishes First National Humanoid Robot Standards, ISO 10218:2025 Expands Safety Framework',
  'Robotics & Automation News',
  'https://roboticsandautomationnews.com/2026/03/31/why-chinas-new-humanoid-robot-standards-could-change-the-industry/100263/',
  '2026-03-31'::timestamp,
  'China MIIT published first national standard system for humanoid robots (Feb 2026) with Autonomy Level (L0-L5) and Harm Potential (H1-H3) certification framework. ISO 10218:2025 updated with expanded collaborative application certification (28 to 50 pages). ISO 25785-1 under development for dynamically stable robots. ISO 13482 covers personal care/service robots.',
  'China MIIT published first national standards for humanoid robots Feb 2026. Two-axis model: Autonomy Level L0-L5, Harm Potential H1-H3 for certification. ISO 10218:2025 expanded safety requirements from 28 to 50 pages, shifting focus from hardware to collaborative application certification. ISO 25785-1 under development for dynamically stable mobile robots. ISO 13482 applicable for home/service robots.',
  'en', 'industry', 'robot',
  md5('humanoid-robot-regulations-iso-china-miit-2026'),
  '{"mentionedCompanies":["MIIT","ISO"],"mentionedRobots":[],"technologies":["L0-L5 autonomy classification","H1-H3 harm potential"],"marketInsights":["New certification framework for humanoids","Expanded safety requirements"],"keyPoints":["China first national humanoid standards","ISO 10218:2025 updated","ISO 25785-1 in development"]}'::jsonb,
  NULL,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('humanoid-robot-regulations-iso-china-miit-2026'));


-- ============================================================
-- 2. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Tesla Optimus 양산 개시
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' LIMIT 1),
  'mass_production', 'critical',
  '[Tesla] Optimus Gen 3 파일럿 생산 개시 - Fremont 공장 전환',
  'Tesla가 Fremont 공장 Model S/X 라인을 Optimus 로봇 생산 라인으로 전환. 1,000+ Gen 3 유닛 가동 중. 연간 1M 유닛 목표. Giga Texas 5.2M sqft 확장 (10M/년 목표). 공개 판매 2027년 말 $20K-$30K 예정.',
  '{"source":"Tesla Q1 2026 Update / SEC Filing","confidence":"A","date":"2026-06-09","productionTarget":"1M units/year pilot","pricing":"$20K-$30K","timeline":"summer 2026 production start"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus Gen 3 파일럿%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 2: Boston Dynamics Atlas 상용 출하
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' LIMIT 1),
  'mass_production', 'critical',
  '[Boston Dynamics] Atlas 상용 버전 CES 2026 출시 - Hyundai/Google DeepMind 배치',
  'Boston Dynamics가 CES 2026에서 상용 Atlas를 공개. 2026년 전체 생산량 Hyundai RMAC 및 Google DeepMind에 배정 완료. NVIDIA Jetson Thor 800 TOPS 탑재. Hyundai $26B 미국 투자, 2028년 30K 유닛/년 공장 계획.',
  '{"source":"Boston Dynamics Official / CES 2026","confidence":"A","date":"2026-01-06","customers":["Hyundai RMAC","Google DeepMind"],"specs":"152cm, 89kg, 110 lb lift, 800 TOPS","price":"$150K-$420K"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Atlas 상용 버전 CES%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 3: Figure AI $39B valuation
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' LIMIT 1),
  'funding', 'warning',
  '[Figure AI] $39B 기업가치 - Series C $1B+, BMW 실전 배치 1,250시간',
  'Figure AI가 Series C에서 $1B+ 투자 유치, $39B 기업가치 달성. 총 $1.9B 누적 투자. Figure 03 생산 1일 1대→시간당 1대로 급속 증가. BMW Spartanburg에서 Figure 02 11개월 실전 배치 완료 (90K+ 부품 로딩).',
  '{"source":"CNBC / Figure AI Official","confidence":"A","date":"2026-05-01","valuation":"$39B","totalFunding":"$1.9B","productionRate":"1 robot/hour","bmwDeployment":"11 months, 90K+ parts"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure AI%$39B%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 4: Apptronik $520M funding
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' LIMIT 1),
  'funding', 'warning',
  '[Apptronik] $520M 투자 유치 ($5B 밸류) - Google DeepMind Gemini 파트너십',
  'Apptronik이 $520M 추가 투자 유치, 총 ~$1B 누적, $5B 기업가치. 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority. Google DeepMind Gemini Robotics 전략 파트너십 체결. 2026년 신규 로봇 공개 예정.',
  '{"source":"CNBC Official","confidence":"A","date":"2026-02-11","funding":"$520M extension","totalFunding":"~$1B","valuation":"$5B","newInvestors":["AT&T Ventures","John Deere","Qatar Investment Authority"]}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apptronik%$520M%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 5: Unitree STAR Market IPO
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' OR name ILIKE '%H1%' LIMIT 1),
  'funding', 'warning',
  '[Unitree] STAR Market IPO 승인 - $6B 밸류, NVIDIA Isaac GR00T 파트너십',
  'Unitree가 상해증권거래소 STAR Market IPO 승인 (2026.6.1). 4.2B위안 ($620M) 조달 목표, ~$6B 밸류에이션. NVIDIA와 Isaac GR00T Reference Humanoid 파트너십 (H2 Plus). G1 5,500+ 출하(2025), 2026년 10K-20K 목표.',
  '{"source":"Shanghai Stock Exchange / CNBC","confidence":"A","date":"2026-06-01","ipoTarget":"4.2B yuan ($620M)","valuation":"~$6B","nvidiaPartnership":"Isaac GR00T H2 Plus","shipments":"5500+ G1 in 2025"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Unitree%STAR Market%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 6: 1X NEO consumer launch
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' LIMIT 1),
  'mass_production', 'warning',
  '[1X] NEO Factory 개장 - 10,000+ 유닛 5일만에 완판, 소비자 출하 개시',
  '1X Technologies가 Hayward, CA에 미국 최초 수직통합 휴머노이드 공장 개장(2026.4). 첫해 생산분 10,000+ 유닛 5일만에 완판. $20,000 또는 $499/월 구독. 2027년 100,000+ 유닛/년 목표.',
  '{"source":"GlobeNewsWire Official","confidence":"A","date":"2026-04-30","unitsSold":"10000+ in 5 days","price":"$20K or $499/mo","factory":"Hayward CA","target":"100K+/year by 2027"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%1X%NEO Factory%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 7: Agility Robotics Toyota partnership
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' LIMIT 1),
  'partnership', 'info',
  '[Agility] Toyota Canada 상업 계약 체결 - Digit 100K 토트 이정표 달성',
  'Toyota Motor Manufacturing Canada와 Digit 상업 계약 체결, 3대→10대 확대. Mercado Libre 풀필먼트 파트너십(텍사스). 100,000+ 토트 처리 달성. OSHA 안전 검사 통과. 운영비 $10-12/hr (향후 $2-3/hr 목표).',
  '{"source":"Agility Robotics Official / The Robot Report","confidence":"A","date":"2026-02-15","partners":["Toyota Canada","Mercado Libre"],"milestone":"100K+ totes","operatingCost":"$10-12/hr"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Agility%Toyota Canada%' AND created_at > NOW() - INTERVAL '7 days');

-- Alert 8: Agibot IPO and shipments
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' OR name ILIKE '%Agibot%' LIMIT 1),
  'funding', 'info',
  '[AgiBot] 홍콩 IPO 추진 $6.4B - 10,000+ 로봇 출하, LG전자 투자자',
  'AgiBot이 HK IPO Q3 2026 추진, HK$40-50B ($5.1-6.4B) 밸류에이션 목표. 2026년 3월 기준 10,000+ 로봇 출하. Omdia 2025 글로벌 휴머노이드 출하 1위 (5,168대). LG전자, BYD, Tencent 등 투자자.',
  '{"source":"Reuters / PR Newswire","confidence":"B","date":"2026-01-07","ipoTarget":"HK$40-50B","totalShipments":"10000+","investors":["LG Electronics","BYD","Tencent","Mirae Asset"],"omnidaRank":"#1 globally 2025"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%AgiBot%홍콩 IPO%' AND created_at > NOW() - INTERVAL '7 days');


-- ============================================================
-- 3. CI MONITOR ALERTS 삽입 (CI 업데이트 시스템용)
-- ============================================================

-- Tesla
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Tesla Q1 2026 / SEC Filing',
  'https://www.sec.gov/Archives/edgar/data/0001318605/000162828026026551/exhibit991.htm',
  'Tesla Optimus Gen 3 pilot production started at Fremont; Giga Texas 10M/year expansion',
  'Optimus Gen 3 pilot production began Jan 21, 2026 at Fremont. 1,000+ units operating. Model S/X line converted to 1M unit/year pilot. Giga Texas 5.2M sqft expansion targeting 10M robots/year (summer 2027). Public sale end of 2027 at $20K-$30K. Joint Tesla-xAI "Macrohard" project announced.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Optimus Gen 3 pilot%' AND detected_at > NOW() - INTERVAL '7 days');

-- Boston Dynamics
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Boston Dynamics Official / CES 2026',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Boston Dynamics production Atlas launched at CES 2026; 2026 fully committed to Hyundai & Google DeepMind',
  'Production Atlas unveiled at CES 2026. Enterprise-grade with 7.5ft reach, tactile sensing, 110 lb lift, NVIDIA Jetson Thor 800 TOPS. 2026 allocation fully committed. Hyundai planning 30K unit/year factory by 2028. Price est. $150K-$420K.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%production Atlas launched at CES%' AND detected_at > NOW() - INTERVAL '7 days');

-- Figure AI
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'The AI Insider / CNBC',
  'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
  'Figure AI ramps Figure 03 to 1 robot/hour; $39B valuation; Helix 02 full-body VLA',
  'Figure 03 production ramped from 1/day to 1/hour in 4 months. 350+ robots at BotQ. BMW deployed 11 months (90K+ parts). $39B valuation, $1.9B total funding. Helix 02 released March 2026 with full-body control. Consumer availability late 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Figure 03 to 1 robot/hour%' AND detected_at > NOW() - INTERVAL '7 days');

-- Unitree
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'CNBC / Shanghai Stock Exchange',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  'Unitree STAR Market IPO approved; NVIDIA Isaac GR00T H2 Plus partnership; $6B valuation',
  'STAR Market IPO approved June 1, 2026. Targeting 4.2B yuan ($620M) raise, ~$6B valuation. NVIDIA selected H2 Plus for Isaac GR00T Reference Humanoid with Jetson Thor + Blackwell. 5,500+ G1 shipped 2025. UnifoLM-VLA-0 open-sourced March 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Unitree STAR Market IPO%' AND detected_at > NOW() - INTERVAL '7 days');

-- Agility Robotics
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Agility Robotics Official',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  'Agility Robotics: Toyota Canada commercial agreement; Mercado Libre partnership; 100K totes milestone',
  'Toyota Canada expanding Digit deployment 3→10 units. Mercado Libre agreement for fulfillment (Texas + Latin America). 100K+ totes moved. OSHA safety inspection passed. $640M total funding at $2.1B valuation. Operating cost $10-12/hr.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Toyota Canada commercial agreement%' AND detected_at > NOW() - INTERVAL '7 days');

-- Apptronik
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik raises $520M at $5B valuation; Google DeepMind Gemini Robotics strategic partnership',
  '$520M extension round, total ~$1B. $5B valuation. New investors: AT&T Ventures, John Deere, QIA. Google DeepMind Gemini Robotics partnership. Apollo deployed at Mercedes-Benz and GXO. New robot debut planned 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR name ILIKE '%Apollo%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Apptronik raises $520M%' AND detected_at > NOW() - INTERVAL '7 days');

-- 1X Technologies
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'GlobeNewsWire',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X NEO Factory opens in Hayward CA; 10,000+ units sold out in 5 days; consumer shipments 2026',
  'America''s first vertically integrated humanoid factory opened April 2026. 10,000+ first-year units sold in 5 days. $20K or $499/mo. NEO: 5''6", 66 lbs, human-in-the-loop. NVIDIA GR00T N1 integration. Target 100K+/year by 2027. Seeking $1B at $10B+ valuation.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' OR name ILIKE '%NEO%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1X NEO Factory opens%' AND detected_at > NOW() - INTERVAL '7 days');

-- AgiBot
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Reuters / PR Newswire',
  'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
  'AgiBot CES 2026 US debut; HK IPO $6.4B target; 10,000+ robots shipped; LG Electronics investor',
  'CES 2026 US market debut with full portfolio. HK IPO Q3 2026 at HK$40-50B ($5.1-6.4B). 10,000+ robots shipped by March 2026. Omdia #1 globally 2025 (5,168 units). Investors: LG Electronics, BYD, Tencent. X1 $20K, A2 49 DOF 200 TOPS.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%X1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%AgiBot CES 2026 US debut%' AND detected_at > NOW() - INTERVAL '7 days');

-- Regulatory update
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Robotics & Automation News / ISO',
  'https://roboticsandautomationnews.com/2026/03/31/why-chinas-new-humanoid-robot-standards-could-change-the-industry/100263/',
  'China MIIT publishes first national humanoid robot standards; ISO 10218:2025 expanded',
  'China MIIT published first national standard system for humanoid robots (Feb 2026). Autonomy Level L0-L5 + Harm Potential H1-H3 framework. ISO 10218:2025 expanded (28→50 pages). ISO 25785-1 under development for dynamically stable robots. Impacts all global humanoid manufacturers.',
  NULL,
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%China MIIT publishes first national%' AND detected_at > NOW() - INTERVAL '7 days');

COMMIT;

-- ============================================================
-- 실행 결과 확인
-- ============================================================
SELECT 'Articles inserted' AS result, COUNT(*) AS count FROM articles WHERE collected_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'Competitive alerts inserted', COUNT(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'CI monitor alerts inserted', COUNT(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
