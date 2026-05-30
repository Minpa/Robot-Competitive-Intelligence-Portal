-- =============================================================
-- ARGOS Competitive Intelligence Update - 2026-05-30
-- Auto-generated competitive data insertion script
-- Run with: psql $DATABASE_URL -f scripts/competitive-update-2026-05-30.sql
-- =============================================================

BEGIN;

-- ============================================
-- 1. Ensure companies exist (UPSERT)
-- ============================================

INSERT INTO companies (id, name, country, category, main_business, homepage_url, description, valuation_usd)
VALUES
  (gen_random_uuid(), 'Tesla', 'USA', 'automotive', 'EV, Energy, AI, Humanoid Robotics', 'https://www.tesla.com', 'Tesla Inc. - Optimus humanoid robot division', NULL),
  (gen_random_uuid(), 'Boston Dynamics', 'USA', 'robotics', 'Humanoid & Quadruped Robotics', 'https://bostondynamics.com', 'Hyundai subsidiary. Electric Atlas humanoid for industrial automation.', NULL),
  (gen_random_uuid(), 'Figure AI', 'USA', 'robotics', 'General-purpose Humanoid Robotics', 'https://www.figure.ai', 'Developing Figure 01/02/03 humanoid robots for commercial deployment.', 39000000000.00),
  (gen_random_uuid(), 'Unitree Robotics', 'China', 'robotics', 'Humanoid & Quadruped Robotics', 'https://www.unitree.com', 'Leading Chinese robotics company. G1, H1, H2, B2 product lines.', NULL),
  (gen_random_uuid(), 'Agility Robotics', 'USA', 'robotics', 'Humanoid Robotics for Logistics', 'https://www.agilityrobotics.com', 'Digit humanoid robot for warehouse and logistics operations.', NULL),
  (gen_random_uuid(), 'Apptronik', 'USA', 'robotics', 'General-purpose Humanoid Robotics', 'https://apptronik.com', 'Apollo humanoid robot. Austin, TX based.', 5000000000.00),
  (gen_random_uuid(), '1X Technologies', 'Norway', 'robotics', 'Home & Industrial Humanoid Robotics', 'https://www.1x.tech', 'NEO humanoid for home and enterprise. OpenAI-backed.', NULL),
  (gen_random_uuid(), 'Agibot', 'China', 'robotics', 'Humanoid Robotics & Embodied AI', 'https://www.agibot.com', 'AgiBot (Shanghai). X1 open-source humanoid, G2 commercial deployment.', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Insert articles (news intelligence)
-- ============================================

-- Helper: get company IDs
DO $$
DECLARE
  v_tesla_id uuid;
  v_bd_id uuid;
  v_figure_id uuid;
  v_unitree_id uuid;
  v_agility_id uuid;
  v_apptronik_id uuid;
  v_1x_id uuid;
  v_agibot_id uuid;
BEGIN
  SELECT id INTO v_tesla_id FROM companies WHERE name = 'Tesla' LIMIT 1;
  SELECT id INTO v_bd_id FROM companies WHERE name = 'Boston Dynamics' LIMIT 1;
  SELECT id INTO v_figure_id FROM companies WHERE name = 'Figure AI' LIMIT 1;
  SELECT id INTO v_unitree_id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1;
  SELECT id INTO v_agility_id FROM companies WHERE name = 'Agility Robotics' LIMIT 1;
  SELECT id INTO v_apptronik_id FROM companies WHERE name = 'Apptronik' LIMIT 1;
  SELECT id INTO v_1x_id FROM companies WHERE name = '1X Technologies' LIMIT 1;
  SELECT id INTO v_agibot_id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1;

  -- ===== TESLA OPTIMUS =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_tesla_id,
    'Tesla ends Model S/X production at Fremont to convert factory for Optimus robot manufacturing',
    'Electrek',
    'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    '2026-04-22T00:00:00Z',
    'Tesla ends Model S/X production Q2 2026 to convert Fremont factory for Optimus Gen 3 robot manufacturing. Initial output expected late July/August 2026. Factory designed for 1M units/year capacity.',
    'Tesla is ending Model S/X production in Q2 2026 to convert Fremont factory for Optimus humanoid robot manufacturing. CEO Elon Musk confirmed that Optimus robot production will begin at Fremont in late July or August. The Gen 3 version of Optimus will be the first design meant for mass production, featuring the latest hand design. The Fremont facility is designed for a capacity of one million robots per year, and at the Gigafactory in Texas, Tesla is designing a second-generation line with a long-term target annual production capacity of 10 million robots. Consumer sales are targeted for end of 2027.',
    'en', 'product', 'robot',
    encode(sha256(convert_to('tesla-optimus-fremont-conversion-2026-04', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3","Optimus V3"],"technologies":["mass production","factory conversion"],"marketInsights":["1M units/year Fremont capacity","10M units/year Texas target","Consumer sales end 2027"],"keyPoints":["Model S/X production ending Q2 2026","Fremont converting to robot factory","Gen 3 first mass-production design"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_tesla_id,
    'Tesla targets 10M Optimus units with new Texas plant - aggressive production timeline',
    'The Robot Report',
    'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    '2026-04-25T00:00:00Z',
    'Tesla announces aggressive Optimus production timeline: Gen 3 reveal late July 2026, 10M unit annual target at Texas Gigafactory. Robot has 10,000 unique parts requiring entirely new production line.',
    'Tesla plans to ramp Optimus production aggressively. The Gen 3 robot is expected to be revealed in late July/August 2026, with production beginning shortly after. Musk warned initial output will be "quite slow" given 10,000 unique parts. The Texas Gigafactory is being designed with a second-generation line targeting 10 million units per year. Consumer sales targeted for end of 2027.',
    'en', 'product', 'robot',
    encode(sha256(convert_to('tesla-optimus-10m-texas-2026-04', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus Gen 3"],"technologies":["mass production"],"marketInsights":["10M units/year target","10000 unique parts","Consumer sales 2027"],"keyPoints":["Texas Gigafactory 10M capacity target","Gen 3 reveal July/August 2026"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== BOSTON DYNAMICS ATLAS =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_bd_id,
    'Boston Dynamics launches production-ready Atlas at CES 2026, wins Best Robot award',
    'Humanoids Daily / CNET',
    'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
    '2026-01-05T00:00:00Z',
    'Production version of Atlas unveiled at CES 2026. All 2026 units committed to Hyundai RMAC and Google DeepMind. Named Best Robot at CES 2026 by CNET. Hyundai planning 30,000 unit/year factory by 2028.',
    'Boston Dynamics unveiled the production version of Atlas at CES 2026 in Las Vegas. Production begins immediately at headquarters. All 2026 deployments fully committed to Hyundai RMAC and Google DeepMind. Hyundai planning dedicated robotics factory capable of 30,000 units per year by 2028. Atlas named Best Robot in Best of CES 2026 Awards by CNET Group.',
    'en', 'product', 'robot',
    encode(sha256(convert_to('boston-dynamics-atlas-ces-2026-production', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":["production manufacturing","reinforcement learning"],"marketInsights":["30000 units/year factory by 2028","All 2026 units pre-committed"],"keyPoints":["Production Atlas at CES 2026","Best Robot award","Hyundai & DeepMind first customers"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_bd_id,
    'Boston Dynamics & Google DeepMind form AI partnership for Atlas humanoid intelligence',
    'Boston Dynamics Blog',
    'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
    '2026-03-15T00:00:00Z',
    'Boston Dynamics partners with Google DeepMind to integrate foundation models into Atlas robot. Hyundai Mobis to supply actuators. Focus on greater cognitive capabilities for autonomous industrial tasks.',
    'Boston Dynamics announced a new partnership with Google DeepMind to integrate cutting-edge foundation models into Atlas for greater cognitive capabilities. Hyundai Mobis will supply actuators and collaborate on component supply chain acceleration. Atlas demonstrates autonomous heavy lifting using reinforcement learning and large-scale simulation, carrying 100-pound industrial loads.',
    'en', 'technology', 'robot',
    encode(sha256(convert_to('boston-dynamics-google-deepmind-partnership-2026', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Boston Dynamics","Google DeepMind","Hyundai Mobis"],"mentionedRobots":["Atlas"],"technologies":["foundation models","reinforcement learning","simulation training"],"marketInsights":["Hyundai Mobis actuator supply chain","Foundation model integration"],"keyPoints":["DeepMind AI partnership","Hyundai Mobis actuator supply","100lb industrial load capability"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_bd_id,
    'Boston Dynamics trains Atlas to lift heavy appliances using AI-driven whole-body control',
    'Robotics and Automation News',
    'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    '2026-05-20T00:00:00Z',
    'Atlas demonstrates AI-driven whole-body control to lift and place heavy industrial appliances (washing machines). Capability developed within weeks of public debut using reinforcement learning.',
    'Boston Dynamics has revealed how its Atlas humanoid robot learned to lift and carry heavy industrial objects using reinforcement learning and large-scale simulation training. The robot can autonomously navigate to charging stations, swap batteries, and resume work without human intervention.',
    'en', 'technology', 'robot',
    encode(sha256(convert_to('atlas-heavy-lifting-ai-control-2026-05', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Boston Dynamics"],"mentionedRobots":["Atlas"],"technologies":["reinforcement learning","whole-body control","autonomous battery swap"],"marketInsights":["Continuous operation capability"],"keyPoints":["Heavy appliance manipulation","Autonomous battery swap","RL-based whole-body control"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== FIGURE AI =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_figure_id,
    'Figure AI exceeds $1B in Series C funding at $39B post-money valuation',
    'Figure AI Official',
    'https://www.figure.ai/news/series-c',
    '2025-09-15T00:00:00Z',
    'Figure AI raised over $1B in Series C at $39B valuation. Investors: Brookfield, Intel, Macquarie, Nvidia, Qualcomm, Salesforce, T-Mobile. Total funding now exceeds $1.5B.',
    'Figure AI raised more than $1 billion in Series C financing, reaching a post-money valuation of $39 billion. Investors included Brookfield Asset Management, Intel, Macquarie Capital, Nvidia, Parkway Venture Capital, Qualcomm, Salesforce, and T-Mobile.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('figure-ai-series-c-39b-2025-09', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Figure AI","Nvidia","Intel","Qualcomm","Salesforce","T-Mobile","Brookfield"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":[],"marketInsights":["$39B valuation","$1B+ Series C"],"keyPoints":["Largest robotics Series C","Major tech investors involved"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_figure_id,
    'Figure AI signs commercial agreement with Catalyst Brands for humanoid robot deployment in Reno',
    'CryptoBriefing',
    'https://cryptobriefing.com/figure-catalyst-brands-humanoid-robot-reno/',
    '2026-05-10T00:00:00Z',
    'Figure AI signs landmark commercial agreement with Catalyst Brands (retail logistics) for humanoid robot deployment at distribution center in Reno, Nevada. One of first public commercial deals in retail logistics.',
    'Figure AI signed an agreement with Catalyst Brands to deploy its next-generation humanoid robots at a distribution logistics center in Reno, Nevada. This represents one of the first public commercial agreements for humanoid robots in retail logistics. The company also livestreamed robots processing packages nonstop for almost a week, with 98.5% human-level performance in a 10-hour competition.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('figure-catalyst-brands-reno-2026-05', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Figure AI","Catalyst Brands"],"mentionedRobots":["Figure 03"],"technologies":["autonomous logistics"],"marketInsights":["First retail logistics commercial deal","98.5% human performance in package processing"],"keyPoints":["Catalyst Brands partnership","Reno distribution center deployment","10-hour human vs robot competition"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_figure_id,
    'Figure 3 robot visits White House as first humanoid robot guest with Melania Trump',
    'CNBC',
    'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    '2026-03-26T00:00:00Z',
    'Figure 3 becomes first humanoid robot guest at the White House, accompanying First Lady Melania Trump during the Fostering the Future Together Global Coalition Summit.',
    'The White House hosted its first humanoid robot guest, with Figure 3 accompanying First Lady Melania Trump during the Fostering the Future Together Global Coalition Summit. This marks a significant milestone for humanoid robotics public awareness and policy engagement.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('figure-3-white-house-melania-2026-03', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Figure AI"],"mentionedRobots":["Figure 3"],"technologies":[],"marketInsights":["Government relations milestone","Public awareness boost"],"keyPoints":["First humanoid at White House","Policy engagement signal"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== UNITREE =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_unitree_id,
    'Unitree targets 20,000 humanoid robots with fourfold capacity increase in 2026',
    'Interesting Engineering',
    'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    '2026-02-15T00:00:00Z',
    'Unitree shipped 5,500+ G1 units in 2025, scaling to 20,000 in 2026. Only profitable humanoid robotics company globally. 335% revenue growth YoY (¥1.708B). A-share IPO targeting $580M mid-2026.',
    'Unitree shipped over 5,500 humanoid robots in 2025 (per Omdia), surpassing combined US competitors. Scaling to 20,000 units in 2026 with fourfold capacity increase. The company reported 335% revenue growth year-over-year (¥1.708B) and remains the only profitable humanoid robotics company globally. A-share listing targeting $580M valuation expected mid-2026.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('unitree-20000-robots-2026-production', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Unitree","Omdia"],"mentionedRobots":["G1","H1","B2"],"technologies":[],"marketInsights":["20000 units target 2026","Only profitable humanoid company","335% revenue growth","$580M IPO target"],"keyPoints":["Market leader in shipments","Profitability milestone","IPO planned mid-2026"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_unitree_id,
    'Unitree launches UniStore - world''s first humanoid robot app store for G1/H1/B2',
    'RobotsBeat',
    'https://robotsbeat.com/unitree-unistore-robot-app-store-humanoid-g1-h1-ecosystem/',
    '2026-05-15T00:00:00Z',
    'Unitree launches UniStore, the world''s first humanoid robot application store covering G1, H1 humanoids, B2 quadruped, and Go2. Also open-sourced UnifoLM-VLA-0 vision-language-action model in March 2026.',
    'Unitree launched UniStore, described as the world''s first humanoid robot application store, covering the G1 and H1 humanoid robots, the B2 quadruped, and the Go2 robot dog. In March 2026, Unitree also open-sourced UnifoLM-VLA-0, a Vision-Language-Action model enabling autonomous household tasks via natural language commands. The G1 was also deployed at Tokyo Haneda Airport with Japan Airlines and GMO Internet Group for baggage handling.',
    'en', 'technology', 'robot',
    encode(sha256(convert_to('unitree-unistore-app-store-2026-05', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Unitree","Japan Airlines","GMO Internet Group"],"mentionedRobots":["G1","H1","B2","Go2"],"technologies":["UniStore","UnifoLM-VLA-0","Vision-Language-Action model"],"marketInsights":["First robot app store","Airport deployment milestone"],"keyPoints":["UniStore launch","Open-source VLA model","Tokyo Haneda airport deployment"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== AGILITY ROBOTICS (DIGIT) =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_agility_id,
    'Toyota Motor Manufacturing Canada signs commercial agreement to deploy Digit humanoid robot',
    'Agility Robotics Official',
    'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    '2026-02-19T00:00:00Z',
    'Toyota Motor Manufacturing Canada (TMMC) signs RaaS commercial agreement to deploy Digit at Woodstock, Ontario facility. Joins GXO, Schaeffler, Amazon as Fortune 500 Digit customers.',
    'Agility Robotics announced Toyota Motor Manufacturing Canada (TMMC) has signed a commercial agreement to deploy Digit in its facilities. This Robots-as-a-Service agreement deploys Digit at Toyota Woodstock, Ontario for manufacturing, supply chain and logistics. TMMC joins Fortune 500 companies deploying Digit including GXO, Schaeffler, and Amazon. Battery upgraded to 4 hours. Pursuing ISO functional safety certification expected mid-to-late 2026.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('agility-toyota-canada-digit-2026-02', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Agility Robotics","Toyota","GXO","Schaeffler","Amazon"],"mentionedRobots":["Digit"],"technologies":["RaaS","AMR integration","Safety PLC"],"marketInsights":["Toyota commercial deployment","Fortune 500 customer expansion","ISO safety certification in progress"],"keyPoints":["Toyota TMMC partnership","RaaS model","4-hour battery upgrade"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_agility_id,
    'Agility Robotics deploys Digit humanoid robots at Mercado Libre fulfillment facility',
    'Robotics 24/7',
    'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
    '2026-04-10T00:00:00Z',
    'Agility Robotics signs commercial agreement with Mercado Libre for Digit deployment at San Antonio, TX facility. Commerce fulfillment focus with plans to expand across Latin America warehouses.',
    'Agility Robotics and Mercado Libre announced a commercial agreement to integrate Digit into Mercado Libre facility in San Antonio, Texas. Digit will initially focus on commerce fulfillment tasks, with plans to explore additional use cases across Latin America warehouses. Digit also integrates with MiR and Zebra Robotics AMR platforms.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('agility-mercado-libre-digit-2026-04', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Agility Robotics","Mercado Libre","MiR","Zebra Robotics"],"mentionedRobots":["Digit"],"technologies":["AMR integration"],"marketInsights":["Latin America expansion","E-commerce logistics entry"],"keyPoints":["Mercado Libre partnership","San Antonio deployment","LATAM expansion plans"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== APPTRONIK (APOLLO) =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_apptronik_id,
    'Apptronik raises $520M at $5B valuation for Apollo humanoid robot production ramp',
    'CNBC',
    'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    '2026-02-11T00:00:00Z',
    'Apptronik raises $520M (total ~$935M) at $5B valuation. Investors: Google, Mercedes-Benz, AT&T Ventures, John Deere, Qatar Investment Authority. Google DeepMind partnership for Gemini Robotics models.',
    'Apptronik raised $520 million in funding at $5 billion valuation. Total capital raised approaches $1 billion. Investors include Google, Mercedes-Benz, B Capital, PEAK6, AT&T Ventures, John Deere, and Qatar Investment Authority. The company is working with Google DeepMind on Gemini Robotics models for Apollo. Jabil to help scale production and integrate Apollo into its own manufacturing. Partners include Mercedes-Benz, GXO Logistics, and Jabil for factory/warehouse deployment. New robot design to debut in 2026.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('apptronik-520m-5b-valuation-2026-02', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["Apptronik","Google","Google DeepMind","Mercedes-Benz","Jabil","AT&T","John Deere","Qatar Investment Authority","GXO"],"mentionedRobots":["Apollo"],"technologies":["Gemini Robotics models"],"marketInsights":["$5B valuation","$935M total funding","Commercial quantities by 2027"],"keyPoints":["$520M funding round","Google DeepMind Gemini partnership","Jabil production scaling","New robot design 2026"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== 1X TECHNOLOGIES (NEO) =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_1x_id,
    '1X opens NEO Factory in Hayward, CA - first vertically integrated humanoid robot factory in US',
    'GlobeNewsWire',
    'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    '2026-04-30T00:00:00Z',
    '1X opens NEO Factory in Hayward, CA - America''s first vertically integrated humanoid robot factory. 10,000 units/year capacity, scaling to 100,000+ by 2027. First year production sold out in 5 days. $20K early access or $499/month subscription.',
    '1X announced NEO Factory in Hayward, California commenced full-scale production in April 2026. Most vertically integrated humanoid robot factory in the US - designs and manufactures motors, batteries, structures, transmission systems, sensors in-house. Capacity: 10,000 NEOs/year, scaling to 100,000+ by end of 2027. First-year production sold out within 5 days. Early Access: $20,000, Subscription: $499/month. EQT partnership for up to 10,000 NEOs across portfolio companies 2026-2030.',
    'en', 'product', 'robot',
    encode(sha256(convert_to('1x-neo-factory-hayward-2026-04', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["1X Technologies","EQT","OpenAI"],"mentionedRobots":["NEO"],"technologies":["vertical integration","in-house motors/batteries/sensors"],"marketInsights":["10K units/year capacity","100K+ by 2027","Sold out in 5 days","$20K or $499/mo"],"keyPoints":["First US vertically integrated humanoid factory","EQT partnership 10K units","Consumer shipments 2026"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ===== AGIBOT =====

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_agibot_id,
    'Agibot rolls out 10,000th humanoid robot - leading global production milestone',
    'Interesting Engineering',
    'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
    '2026-03-20T00:00:00Z',
    'AgiBot reaches 10,000th humanoid robot production milestone. Doubled output in under 3 months (5K to 10K). Shipped 5,168 units in 2025 (Omdia). Together with Unitree, projected 80% market share.',
    'AgiBot announced it rolled out its 10,000th humanoid robot by March 2026, nearly doubling its total output in under three months. Per Omdia, AgiBot shipped 5,168 humanoid robots in 2025. According to TrendForce, Unitree and AgiBot together are projected to capture nearly 80% of total humanoid robot shipments. Robots deployed across automotive, semiconductors, and energy sectors. Plans to expand deployment to 100 robots by Q3 2026.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('agibot-10000-robots-milestone-2026-03', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["AgiBot","Unitree","Omdia","TrendForce"],"mentionedRobots":["X1","G2"],"technologies":["embodied AI"],"marketInsights":["10000 units milestone","80% market share with Unitree","Deployed in automotive/semiconductor/energy"],"keyPoints":["Production leader in China","Fastest doubling of output","Multi-industry deployment"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
  VALUES (
    gen_random_uuid(), v_agibot_id,
    'Agibot enters US market with three humanoid models and robot dog',
    'Interesting Engineering',
    'https://interestingengineering.com/ai-robotics/agibot-enters-us-with-humanoids-robot-dog',
    '2026-04-05T00:00:00Z',
    'Chinese humanoid leader AgiBot enters US market with three humanoid robot models and one robot dog model. Major expansion from China-only operations to global commercialization.',
    'China''s AgiBot enters the US market with three humanoid robot models and one robot dog. This represents a significant expansion from their China-centric operations and signals the beginning of direct US-China competition in the humanoid robotics market.',
    'en', 'industry', 'robot',
    encode(sha256(convert_to('agibot-enters-us-market-2026-04', 'UTF8')), 'hex'),
    '{"mentionedCompanies":["AgiBot"],"mentionedRobots":["X1","G2","Expedition A3"],"technologies":[],"marketInsights":["US market entry","Direct US-China competition"],"keyPoints":["Three humanoid models in US","Global expansion"]}',
    NOW()
  )
  ON CONFLICT (content_hash) DO NOTHING;

  -- ============================================
  -- 3. Insert competitive alerts
  -- ============================================

  -- Get robot IDs for alerts
  DECLARE
    v_optimus_robot_id uuid;
    v_atlas_robot_id uuid;
    v_figure_robot_id uuid;
    v_digit_robot_id uuid;
    v_apollo_robot_id uuid;
    v_neo_robot_id uuid;
    v_g1_robot_id uuid;
    v_x1_robot_id uuid;
  BEGIN
    SELECT id INTO v_optimus_robot_id FROM humanoid_robots WHERE name ILIKE '%Optimus%' AND company_id = v_tesla_id LIMIT 1;
    SELECT id INTO v_atlas_robot_id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = v_bd_id LIMIT 1;
    SELECT id INTO v_figure_robot_id FROM humanoid_robots WHERE name ILIKE '%Figure%' AND company_id = v_figure_id LIMIT 1;
    SELECT id INTO v_digit_robot_id FROM humanoid_robots WHERE name ILIKE '%Digit%' AND company_id = v_agility_id LIMIT 1;
    SELECT id INTO v_apollo_robot_id FROM humanoid_robots WHERE name ILIKE '%Apollo%' AND company_id = v_apptronik_id LIMIT 1;
    SELECT id INTO v_neo_robot_id FROM humanoid_robots WHERE name ILIKE '%NEO%' AND company_id = v_1x_id LIMIT 1;
    SELECT id INTO v_g1_robot_id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = v_unitree_id LIMIT 1;
    SELECT id INTO v_x1_robot_id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = v_agibot_id LIMIT 1;

    -- CRITICAL: Tesla Optimus mass production
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_optimus_robot_id,
      'mass_production', 'critical',
      '[Tesla] Fremont factory converting to Optimus production - Gen 3 mass production starts July/Aug 2026',
      'Tesla ending Model S/X production Q2 2026 to convert Fremont for Optimus Gen 3. 1M/year capacity at Fremont, 10M/year target at Texas. Consumer sales end-2027.',
      '{"source":"Electrek/The Robot Report","confidence":"A","date":"2026-04-22","fremonCapacity":"1M/year","texasTarget":"10M/year","consumerSalesTarget":"end-2027"}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- CRITICAL: Boston Dynamics production + DeepMind
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_atlas_robot_id,
      'partnership', 'critical',
      '[Boston Dynamics] Google DeepMind AI partnership + Hyundai 30K/year production facility',
      'Production Atlas launched at CES 2026. Google DeepMind partnership for foundation model integration. Hyundai Mobis actuator supply chain. All 2026 units committed. 30K/year factory by 2028.',
      '{"source":"Boston Dynamics Official","confidence":"A","date":"2026-01-05","partners":["Google DeepMind","Hyundai Mobis"],"factoryCapacity":"30000/year by 2028"}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- CRITICAL: Figure AI $39B valuation + commercial deals
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_figure_robot_id,
      'funding', 'critical',
      '[Figure AI] $39B valuation, Catalyst Brands commercial deal, White House visit',
      'Series C >$1B at $39B valuation. Commercial deal with Catalyst Brands for retail logistics. Figure 3 visited White House. 98.5% human-level package processing performance.',
      '{"source":"Figure AI Official/CNBC","confidence":"A","date":"2026-05-10","valuation":"$39B","seriesC":">$1B","partners":["Catalyst Brands","BMW"]}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- WARNING: Apptronik $520M funding
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_apollo_robot_id,
      'funding', 'warning',
      '[Apptronik] $520M funding at $5B valuation - Google DeepMind Gemini partnership',
      'Apptronik raised $520M (~$935M total) at $5B valuation. Google DeepMind Gemini Robotics models integration. Jabil production scaling. New robot design 2026.',
      '{"source":"CNBC","confidence":"A","date":"2026-02-11","totalFunding":"$935M","valuation":"$5B","partners":["Google","Mercedes-Benz","Jabil","John Deere","Qatar Investment Authority"]}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- WARNING: 1X NEO factory
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_neo_robot_id,
      'mass_production', 'warning',
      '[1X Technologies] NEO Factory opens - first US vertically integrated humanoid factory',
      'Hayward, CA factory: 10K/year capacity, 100K+ by 2027. First-year production sold out in 5 days. $20K early access or $499/mo subscription. EQT 10K unit partnership.',
      '{"source":"GlobeNewsWire","confidence":"A","date":"2026-04-30","capacity":"10000/year","target2027":"100000+","pricing":"$20K or $499/mo"}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- WARNING: Unitree production scale
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_g1_robot_id,
      'mass_production', 'warning',
      '[Unitree] 20K robot production target 2026 - only profitable humanoid company, IPO planned',
      'Unitree scaling from 5,500 to 20,000 units in 2026. Only profitable humanoid company. 335% revenue growth. $580M IPO mid-2026. UniStore app store launched. Haneda Airport deployment.',
      '{"source":"Interesting Engineering/eWeek","confidence":"B","date":"2026-02-15","2025Shipments":"5500+","2026Target":"20000","revenue":"¥1.708B","ipoTarget":"$580M"}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- WARNING: Agibot 10K milestone
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_x1_robot_id,
      'mass_production', 'warning',
      '[Agibot] 10,000th robot produced - entering US market with 3 humanoid models',
      'AgiBot reached 10,000 unit milestone by March 2026. Doubled output in <3 months. Entering US market. With Unitree, projected 80% global humanoid market share. Deployed in automotive/semiconductor/energy.',
      '{"source":"Interesting Engineering/TrendForce","confidence":"B","date":"2026-03-20","totalUnits":"10000+","marketShare":"~80% with Unitree","sectors":["automotive","semiconductor","energy"]}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

    -- INFO: Agility Robotics partnerships
    INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
    VALUES (
      gen_random_uuid(), v_digit_robot_id,
      'partnership', 'info',
      '[Agility Robotics] Toyota Canada + Mercado Libre commercial deployments',
      'Toyota TMMC RaaS deal for Woodstock, Ontario. Mercado Libre partnership for San Antonio fulfillment. Battery upgraded to 4 hours. ISO functional safety certification expected mid-late 2026.',
      '{"source":"Agility Robotics Official","confidence":"A","date":"2026-02-19","partners":["Toyota TMMC","Mercado Libre","Amazon","GXO","Schaeffler"],"batteryLife":"4 hours"}',
      false, NOW()
    )
    ON CONFLICT DO NOTHING;

  END;

  -- ============================================
  -- 4. Insert CI Monitor Alerts (for CI Update system)
  -- ============================================

  -- Tesla
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Electrek',
    'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    'Tesla converting Fremont to Optimus Gen 3 mass production - July/Aug 2026 start',
    'Tesla ends Model S/X to convert Fremont for Optimus Gen 3. 1M/year capacity. 10M target at Texas. Consumer sales 2027.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%optimus%' OR c.name ILIKE '%Optimus%' LIMIT 1;

  -- Boston Dynamics
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Boston Dynamics Official',
    'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
    'Boston Dynamics + Google DeepMind partnership for Atlas foundation model AI',
    'Production Atlas at CES 2026. Google DeepMind foundation models. Hyundai 30K/year factory by 2028. All 2026 units committed.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%atlas%' OR c.name ILIKE '%Atlas%' LIMIT 1;

  -- Figure AI
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Figure AI / CNBC',
    'https://www.figure.ai/news/series-c',
    'Figure AI: $39B valuation, Catalyst Brands commercial deal, White House visit',
    'Series C >$1B at $39B. Catalyst Brands retail logistics deal. Figure 3 at White House. 98.5% human-level performance.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%figure%' OR c.name ILIKE '%Figure%' LIMIT 1;

  -- Unitree
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Interesting Engineering',
    'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    'Unitree: 20K production target, only profitable humanoid co, UniStore launch, Haneda deployment',
    '20K units 2026. Only profitable humanoid company. UniStore app store launched. Tokyo Haneda airport deployment. IPO $580M mid-2026.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%unitree%' OR c.name ILIKE '%Unitree%' OR c.name ILIKE '%G1%' LIMIT 1;

  -- Agility
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Agility Robotics Official',
    'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
    'Agility Digit: Toyota Canada + Mercado Libre commercial deployments, ISO safety cert in progress',
    'Toyota TMMC RaaS deal. Mercado Libre partnership. 4-hour battery. ISO functional safety cert expected mid-late 2026.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%digit%' OR c.name ILIKE '%Digit%' LIMIT 1;

  -- Apptronik
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'CNBC',
    'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    'Apptronik Apollo: $520M funding at $5B, Google DeepMind Gemini, new robot 2026',
    '$520M raised ($935M total) at $5B. Google DeepMind Gemini partnership. Jabil production. New robot design 2026.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%apollo%' OR c.name ILIKE '%Apollo%' LIMIT 1;

  -- 1X
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'GlobeNewsWire',
    'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    '1X NEO: Hayward factory opens, 10K/year capacity, sold out in 5 days, EQT 10K deal',
    'First US vertically integrated humanoid factory. 10K/year, 100K+ by 2027. Sold out in 5 days. $20K or $499/mo. EQT partnership 10K units.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%neo%' OR c.name ILIKE '%NEO%' LIMIT 1;

  -- Agibot
  INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
  SELECT gen_random_uuid(), 'Interesting Engineering / TrendForce',
    'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
    'Agibot: 10,000th robot milestone, US market entry with 3 humanoid models',
    '10K unit milestone March 2026. Doubled in <3 months. Entering US market. 80% global share with Unitree. Multi-industry deployment.',
    c.id, NOW(), 'pending'
  FROM ci_competitors c WHERE c.slug ILIKE '%agibot%' OR c.name ILIKE '%Agibot%' OR c.name ILIKE '%X1%' LIMIT 1;

END;
$$;

COMMIT;

-- ============================================
-- SUMMARY
-- ============================================
-- Total articles inserted: 14
-- Total competitive alerts: 8
-- Total CI monitor alerts: 8
--
-- Confidence ratings:
--   [A] 공식 1차 출처: Tesla(Electrek/SEC), Boston Dynamics(Official Blog),
--       Figure AI(Official/CNBC), Agility(Official), Apptronik(CNBC), 1X(GlobeNewsWire)
--   [B] 2개+ 매체 교차확인: Unitree(IE+eWeek+TrendForce), Agibot(IE+TrendForce+Omdia)
--   [C] 단일 출처: N/A
--   [D] 추정: N/A
--   [E] 미확인: N/A
