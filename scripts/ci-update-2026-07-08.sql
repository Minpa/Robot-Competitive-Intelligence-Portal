-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-08
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트)
--    content_hash 기반 중복 방지
-- ============================================================

-- [Unitree] 미 국방부 1260H 중국 군사기업 지정
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Pentagon Adds Unitree Robotics to Section 1260H Chinese Military Companies List',
  'TechCrunch / US Department of Defense',
  'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/',
  '2026-06-08'::timestamp,
  'US DoD adds Unitree to 1260H Chinese Military Companies list (June 8, 2026). Pentagon banned from contracting with Unitree effective June 30, 2026. Extended ban on goods/services from Unitree effective June 30, 2027. Unitree designated as "Little Giant" military-civil fusion contributor.',
  'The US Department of Defense significantly expanded its Section 1260H list of Chinese Military Companies on June 8, 2026, bringing total designated entities to 188. Hangzhou Yushu Technology (Unitree Robotics) was added due to indirect affiliation with SASAC and its designation as a military-civil fusion "Little Giant" contributor to the Chinese defense industrial base. Effective June 30, 2026, the Pentagon is prohibited from contracting with Unitree. From June 30, 2027, the ban extends to procurement of goods or services produced by 1260H entities. This designation may impact Unitree international expansion, particularly in US-allied markets. Other notable additions include Alibaba, Baidu, and BYD.',
  'en', 'regulatory', 'robot',
  md5('unitree-pentagon-1260h-military-2026-06'),
  '{"mentionedCompanies":["Unitree","Alibaba","Baidu","BYD"],"mentionedRobots":["G1","H1"],"technologies":[],"marketInsights":["188 total designated entities","Pentagon procurement ban","Impact on US-allied market expansion"],"keyPoints":["Section 1260H designation June 8 2026","Pentagon contract ban effective June 30 2026","Military-civil fusion Little Giant designation"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-pentagon-1260h-military-2026-06'));

-- [Agibot] 15,000대 생산 돌파 + G2 산업용 로봇
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%智元%' LIMIT 1),
  'AGIBOT Reaches 15,000-Robot Production Milestone with Industrial G2 Embodied AI Robot',
  'The Robot Report / Robotics & Automation News',
  'https://www.therobotreport.com/agibot-produces-15000th-robot-marking-milestone-embodied-ai-deployment/',
  '2026-06-28'::timestamp,
  'Agibot 15,000th robot rolled off production line (June 28, 2026). Milestone unit is Agibot G2, industrial-grade embodied task robot. Production acceleration: 10K to 15K in under 3 months. Deployments span logistics, retail, hospitality, and industrial manufacturing globally.',
  'AGIBOT announced that its 15,000th robot has officially rolled off the production line in late June 2026, marking a major milestone in embodied AI deployment. The milestone unit is the Agibot G2, an industrial-grade embodied task robot designed for real-world operational scenarios. The journey from 1,000 to 5,000 units marked product validation to batch delivery. The move from 5,000 to 10,000 demonstrated scaled manufacturing. The latest milestone from 10,000 to 15,000 units in under 3 months shows embodied AI robots entering a larger phase of production and real-world application. Deployments now span logistics, retail, hospitality, and industrial manufacturing across China, Europe, North America, Japan, South Korea, Southeast Asia, and the Middle East.',
  'en', 'product', 'robot',
  md5('agibot-15000-milestone-g2-2026-06'),
  '{"mentionedCompanies":["Agibot"],"mentionedRobots":["G2","Expedition A3"],"technologies":["embodied AI","industrial automation"],"marketInsights":["15,000 total units produced","10K to 15K in under 3 months","Global deployment expansion"],"keyPoints":["15,000th robot milestone","G2 industrial-grade model","Accelerating production cadence"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-milestone-g2-2026-06'));

-- [Agibot] UK APC2026 + A3 유럽 데뷔 + RaaS 모델
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%智元%' LIMIT 1),
  'AGIBOT Hosts UK APC2026 in London: A3 European Debut and Robot-as-a-Service Model Launch',
  'PR Newswire / Robotics & Automation News',
  'https://roboticsandautomationnews.com/2026/07/02/agibot-debuts-a3-humanoid-robot-in-europe-and-launches-uk-robot-as-a-service-model/103018/',
  '2026-07-01'::timestamp,
  'Agibot hosted UK APC2026 in London (July 1, 2026). European debut of A3: 55kg body, magnesium/titanium alloy, dual-battery 10hr runtime, 10-sec battery swap. UK RaaS pricing: £1,999/day humanoid, £899/day quadruped. Collaboration with local UK partners for real-world applications.',
  'AGIBOT hosted the UK AGIBOT Partner Conference (APC) 2026 in London on July 1, 2026, marking a key step in European growth strategy. Highlights include the European debut of AGIBOT A3 featuring a lightweight 55kg body with magnesium alloy and titanium alloy reinforcement, a dual-battery system delivering up to 10 hours of nominal battery life, and 10-second battery swapping for extended operation. The company introduced a UK Robot-as-a-Service model with pricing from £1,999 per day for humanoid robots and £899 per day for quadruped robots, including localized deployment and operational support. Continued collaboration with local partners to explore real-world applications in the UK market.',
  'en', 'industry', 'robot',
  md5('agibot-uk-apc2026-a3-raas-2026-07'),
  '{"mentionedCompanies":["Agibot","Minth Group"],"mentionedRobots":["A3"],"technologies":["magnesium-titanium alloy body","dual-battery system","10-sec battery swap"],"marketInsights":["UK RaaS from £1,999/day","European market expansion","Local partner strategy"],"keyPoints":["UK APC2026 London conference","A3 European debut","RaaS commercial model launch"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-uk-apc2026-a3-raas-2026-07'));

-- [1X Technologies] NEO World Model AI + San Carlos 공장 확장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Technologies Launches World Model AI for NEO, San Carlos Factory to Enable 100,000 Units/Year by 2027',
  'The Robot Report / Interesting Engineering',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-07-01'::timestamp,
  '1X World Model AI enables NEO to learn tasks from internet-scale video, grounded in real-world physics. San Carlos factory under construction to reach 100,000 units/year by end 2027. Hayward factory currently at 10K/year. Vertical integration: motors, batteries, sensors, structures all in-house. NEO has 75 DOF total, 22 DOF per hand.',
  '1X Technologies launched its World Model AI update enabling NEO to turn any request into an AI capability on demand using a video model grounded in real-world physics. NEO can learn from internet-scale video and apply knowledge to physical world tasks. The Hayward California factory (58,000 sq ft) produces 10,000 NEOs annually with over 200 employees. A larger San Carlos factory is under construction targeting 100,000 units per year by end of 2027. 1X designs and manufactures core components in-house including motors, batteries, sensors, structures, and transmission systems. NEO features 75 degrees of freedom across its body with 22 DOF in each hand, powered by tendon-driven actuators for smooth, quiet movement.',
  'en', 'technology', 'robot',
  md5('1x-neo-worldmodel-sancarlos-2026-07'),
  '{"mentionedCompanies":["1X Technologies"],"mentionedRobots":["NEO"],"technologies":["World Model AI","video-to-physics learning","tendon-driven actuators","vertical integration"],"marketInsights":["100K units/year target by end 2027","Vertical integration strategy","Internet-scale video learning"],"keyPoints":["World Model AI launch","San Carlos factory for 100K/yr","75 DOF with 22 per hand"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-worldmodel-sancarlos-2026-07'));

-- [Tesla/UMA] Ex-Tesla Optimus 과학자 유럽 휴머노이드 스타트업 설립
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Ex-Tesla Optimus Scientist Rémi Cadène Launches UMA: European Humanoid Robot Startup Raises $40M',
  'Electrek / Bloomberg',
  'https://electrek.co/2026/07/07/tesla-optimus-scientist-uma-humanoid-robot/',
  '2026-07-07'::timestamp,
  'Rémi Cadène, ex-Tesla Autopilot/Optimus AI scientist, unveils Paris-based UMA with Northstar humanoid (40kg, designed for safe human interaction). $40M seed from Greycroft and Factorial. Real-Time Learning architecture. Yann LeCun as adviser. 30 employees in Paris/London/Switzerland. Targeting Europe labor shortage.',
  'Rémi Cadène, who spent three years at Tesla working on Autopilot AI and Optimus humanoid robot systems, co-founded Paris-based UMA and unveiled plans for the Northstar humanoid robot at the Machina Summit on July 7, 2026. Cadène previously led development of LeRobot at Hugging Face, an open-source robotics library with 12,000+ GitHub stars. UMA raised $40M in seed funding backed by Greycroft and Factorial. Northstar weighs 40kg for safe human interaction, uses Real-Time Learning architecture to learn skills by watching demos. UMA has ~30 employees across Paris, London, and Switzerland, with AI pioneer Yann LeCun as adviser. Targeting European market citing high labor costs and aging population demographics. Already in talks with 50 potential customers.',
  'en', 'industry', 'robot',
  md5('uma-northstar-ex-tesla-cadene-2026-07'),
  '{"mentionedCompanies":["UMA","Tesla","Hugging Face","Greycroft","Factorial"],"mentionedRobots":["Northstar","Optimus"],"technologies":["Real-Time Learning","LeRobot open-source"],"marketInsights":["Tesla talent drain to competitors","$40M seed for European humanoid","Europe labor shortage opportunity"],"keyPoints":["Ex-Tesla Optimus scientist founds UMA","Northstar 40kg humanoid","$40M seed funding","Yann LeCun adviser"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('uma-northstar-ex-tesla-cadene-2026-07'));

-- [Figure AI] System 0 AI 업데이트 + 350대 생산
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure AI System 0 AI Model Gains 3D Stereo Perception, BotQ Factory Delivers 350+ Figure 03 Units',
  'Figure AI / The Robot Report',
  'https://www.figure.ai/news',
  '2026-07-05'::timestamp,
  'Figure System 0 (S0) AI model updated with stereo 3D perception from onboard RGB head cameras. RGB images lifted into 3D world representation. BotQ manufacturing facility has delivered 350+ Figure 03 units. Production rate sustained at 1 unit/hour. BMW Spartanburg advancing to complex logistics sequencing.',
  'Figure AI updated its System 0 (S0) foundation model with a new stereo 3D perception capability. The AI is now conditioned on camera perception, with RGB images from onboard head cameras passed through a stereo model to lift them into a 3D representation of the surrounding world. This enables more robust spatial understanding for manipulation and navigation tasks. The BotQ high-volume manufacturing facility has delivered over 350 Figure 03 humanoid robots, with the hardware and manufacturing teams transforming BotQ from a blueprint into a high-output environment. Sustained production rate of 1 Figure 03 per hour. BMW Group Plant Spartanburg advancing from initial deployment with Figure 02 (supporting 30,000+ X3 production) to Figure 03 for complex sequencing applications in logistics.',
  'en', 'technology', 'robot',
  md5('figure-system0-3d-botq-350-2026-07'),
  '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["System 0 AI","stereo 3D perception","RGB-to-3D lifting"],"marketInsights":["350+ units delivered","Sustained 1/hour production","BMW advancing to complex tasks"],"keyPoints":["System 0 gains 3D stereo perception","BotQ delivers 350+ units","BMW Spartanburg complex logistics"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-system0-3d-botq-350-2026-07'));

-- [Unitree] H2 신모델 + G1-D 휠형 변형
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Launches H2 Humanoid and G1-D Wheeled Variant, Expanding Product Portfolio',
  'RobotShop Community / Multiple Sources',
  'https://community.robotshop.com/blog/show/unitree-h2-overview-new-features-key-differences-from-the-h1-h1-2',
  '2026-06-15'::timestamp,
  'Unitree expands lineup with H2 (successor to H1) and G1-D (wheeled variant of G1). G1-D swaps bipedal legs for differential drive base, retains upper body and manipulation. Designed for data collection and AI training. Morgan Stanley doubles 2026 China humanoid forecast to 28,000 units.',
  'Unitree Robotics expanded its humanoid product lineup in Q2 2026 with two new models. The H2 succeeds the H1/H1-2 as the company high-performance research humanoid. The G1-D variant replaces bipedal legs with a differential drive wheeled base while retaining the same upper body, arms, and manipulation capabilities, designed specifically for data collection and AI training in environments where walking is not required. Unitree IPO on Shanghai A-share exchange on track for mid-2026 with $580M target. Morgan Stanley has doubled its 2026 China humanoid sales forecast to 28,000 units, with Chinese firms Agibot and Unitree accounting for nearly 80% of 2025 global shipments of approximately 13,000 units.',
  'en', 'product', 'robot',
  md5('unitree-h2-g1d-lineup-expansion-2026'),
  '{"mentionedCompanies":["Unitree","Morgan Stanley"],"mentionedRobots":["H2","G1-D","G1","H1"],"technologies":["differential drive base","data collection platform"],"marketInsights":["Morgan Stanley doubles China forecast to 28K","80% global shipments from China","$580M IPO target"],"keyPoints":["H2 humanoid launch","G1-D wheeled variant for data collection","Morgan Stanley 28K forecast"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-h2-g1d-lineup-expansion-2026'));

-- [Agility Robotics] CEO 인터뷰 - 산업용 집중, 가정용 로봇 아님
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics CEO: Not Promising Home Robots, Focused on Industrial RaaS with ~1,000 Digit v5 Pipeline',
  'TechCrunch',
  'https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/',
  '2026-07-05'::timestamp,
  'Agility CEO clarifies focus on industrial/logistics deployments, not home robots. $300M+ in booked multi-year orders represents ~1,000 Digit v5 robots in RaaS model. Churchill Capital shares rising on $2.5B merger. Key customers: Schaeffler (15 months continuous), GXO/SPANX, Toyota Canada, Mercado Libre.',
  'Agility Robotics CEO stated the company is focused on industrial and logistics use cases and is not promising home robots anytime soon, differentiating from consumer-focused competitors like 1X and Figure. The $300 million-plus in booked multi-year revenue represents approximately 1,000 Digit v5 robots deployed through a robots-as-a-service model. Churchill Capital Corp XI shares have been rising on the $2.5B SPAC merger announcement. Current deployments span 9 customer sites with 65,000+ operational hours including Schaeffler (15 months continuous operation), GXO Logistics/SPANX (100,000+ totes moved), Toyota Motor Manufacturing Canada (7 robots), and Mercado Libre. Digit v5 designed for cooperative safety: can share floor space with human workers without physical barriers.',
  'en', 'industry', 'robot',
  md5('agility-ceo-industrial-focus-raas-2026-07'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","Schaeffler","GXO","Toyota","Mercado Libre"],"mentionedRobots":["Digit","Digit v5"],"technologies":["cooperative safety","robots-as-a-service"],"marketInsights":["~1,000 Digit v5 in RaaS pipeline","Industrial focus, not home","Churchill Capital shares rising"],"keyPoints":["CEO clarifies industrial-only focus","~1,000 robots in order pipeline","Cooperative safety for shared workspace"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-ceo-industrial-focus-raas-2026-07'));

-- [Boston Dynamics] Atlas 5세대 설계 단순화 + AI 학습 기반 행동
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Boston Dynamics 5th-Gen Atlas: Order of Magnitude Simpler Design, 56 DOF, AI-Learned Behavior',
  'Forbes',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  '5th-gen Atlas achieves "almost order of magnitude" reduction in complexity vs prior gen. 56 degrees of freedom, 2.3m reach, 110lb (50kg) lift capacity. No longer programmed but AI-learned behavior. Fewer parts enable faster manufacturing, enhanced reliability, and lower costs for mass production.',
  'Boston Dynamics unveiled its fifth-generation Atlas humanoid robot with an almost order of magnitude reduction in complexity compared to previous generations. The redesigned Atlas features 56 degrees of freedom (56 independent articulation points), a 2.3-meter reach, and can lift up to 110 pounds. The robot is no longer programmed in the traditional sense but uses AI-based training to learn behaviors, according to Boston Dynamics Director of Robot Behavior. Design simplification translates to fewer parts, faster manufacturing, enhanced reliability, and significantly lower costs, positioning Atlas for mass production. Combined with Hyundai planned 30,000 units/year factory by 2028, this represents a fundamental shift from research platform to production-ready industrial robot.',
  'en', 'technology', 'robot',
  md5('bd-atlas-5thgen-simplification-2026-07'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai"],"mentionedRobots":["Atlas"],"technologies":["AI-learned behavior","complexity reduction","56 DOF"],"marketInsights":["Order of magnitude simpler design","Mass production positioning","Fewer parts = lower costs"],"keyPoints":["5th-gen design simplification","56 DOF, 2.3m reach, 110lb lift","AI-learned not programmed"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-5thgen-simplification-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림)
-- ============================================================

-- [CRITICAL] Unitree 미 국방부 군사기업 지정 - 규제 리스크
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'regulatory', 'critical',
  '[Unitree] 미 국방부 1260H 중국 군사기업 지정 - 서방시장 리스크 급증',
  '2026.6.8 미 국방부가 Unitree를 Section 1260H 중국 군사기업 목록에 추가. 6/30부터 미 국방부 계약 금지, 2027.6/30부터 Unitree 제품/서비스 조달 전면 금지. 군민융합 "小巨人" 지정. 미국 동맹국 시장 확대에 중대한 리스크. JAL 하네다 등 기존 계약에도 영향 가능.',
  '{"source":"US DoD/TechCrunch","confidence":"A","date":"2026-06-08","regulation":"Section 1260H","effective_dates":{"contract_ban":"2026-06-30","procurement_ban":"2027-06-30"},"impact":"Western market expansion risk"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%1260H%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Agibot 15,000대 돌파 + UK RaaS 진출
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Agibot%' OR name ILIKE '%X1%' OR name ILIKE '%Expedition%' ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[Agibot] 누적 15,000대 생산 돌파 + UK RaaS 모델 론칭, A3 유럽 데뷔',
  '2026.6.28 15,000대 생산 돌파(G2 산업용 모델). 10K→15K 3개월 미만 소요. 7/1 런던 UK APC2026 개최. A3 유럽 데뷔: 55kg, 마그네슘/티타늄 합금, 듀얼배터리 10시간, 10초 배터리 교환. UK RaaS £1,999/일. 유럽 시장 본격 진출.',
  '{"source":"The Robot Report/PR Newswire","confidence":"A","date":"2026-07-01","milestone":"15,000 units","g2_model":"industrial-grade","a3_specs":{"weight_kg":55,"battery_hours":10,"battery_swap_sec":10},"uk_raas":"£1,999/day"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%15,000%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] 1X Technologies 10만대 생산 계획 + World Model AI
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' ORDER BY announcement_year DESC LIMIT 1),
  'technology', 'warning',
  '[1X Technologies] World Model AI 출시 + San Carlos 공장 건설, 2027년 말 10만대/년 목표',
  'World Model AI: 인터넷 규모 비디오에서 학습하여 물리적 작업 수행. San Carlos 신공장 건설 중(Hayward 10K/년 → 100K/년 확장). 75 DOF(핸드 22 DOF). 텐든 구동 액추에이터. 모터/배터리/센서 등 핵심부품 자체 제조(수직통합).',
  '{"source":"The Robot Report/Interesting Engineering","confidence":"B","date":"2026-07-01","world_model_ai":true,"san_carlos_target":"100,000 units/year","target_date":"end 2027","neo_specs":{"total_dof":75,"hand_dof":22},"vertical_integration":true}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%1X%World Model%'
  AND created_at > '2026-06-01'::timestamp
);

-- [INFO] UMA - Ex-Tesla Optimus 과학자 유럽 스타트업
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' ORDER BY announcement_year DESC LIMIT 1),
  'new_entrant', 'info',
  '[UMA] Ex-Tesla Optimus 과학자 Rémi Cadène, 유럽 휴머노이드 스타트업 UMA 설립',
  '7/7 Machina Summit에서 Northstar 휴머노이드 공개. 40kg 경량 설계. Real-Time Learning 아키텍처. $40M 시드 투자(Greycroft/Factorial). Yann LeCun 자문. 50개 잠재고객 협의 중. Tesla→HuggingFace(LeRobot)→UMA 경력. 유럽 노동력 부족 타겟.',
  '{"source":"Electrek/Bloomberg","confidence":"A","date":"2026-07-07","founder":"Rémi Cadène (ex-Tesla Optimus)","funding":"$40M seed","investors":["Greycroft","Factorial"],"adviser":"Yann LeCun","weight_kg":40,"employees":30}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%UMA%Ex-Tesla%'
  AND created_at > '2026-07-01'::timestamp
);

-- [INFO] Figure AI System 0 3D 인식 업데이트
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%03%' OR name ILIKE '%Figure 03%' ORDER BY announcement_year DESC LIMIT 1),
  'technology', 'info',
  '[Figure AI] System 0 AI 3D 스테레오 인식 업데이트, BotQ 350대+ 생산 달성',
  'System 0 파운데이션 모델에 스테레오 3D 인식 추가. RGB 카메라 → 3D 월드 모델 변환. BotQ에서 350대+ Figure 03 생산 완료. 시간당 1대 생산율 유지. BMW 스파르탄버그 Figure 03 복잡 물류 시퀀싱 작업 진행.',
  '{"source":"Figure AI Official","confidence":"A","date":"2026-07-05","system0_update":"stereo 3D perception","units_produced":"350+","production_rate":"1/hour","bmw_status":"complex logistics sequencing"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure%System 0%3D%'
  AND created_at > '2026-07-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림)
-- ============================================================

-- Unitree 1260H 규제
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'US DoD / TechCrunch',
  'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/',
  'Unitree 미 국방부 1260H 중국 군사기업 지정 - 서방시장 진출 리스크',
  '6/8 Section 1260H 목록 추가. 6/30 국방부 계약 금지 발효. 2027/6/30 제품 조달 전면 금지. 군민융합 Little Giant. 미국 동맹국 시장 확대 영향.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR slug ILIKE '%g1%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%1260H%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Agibot 15K + UK
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'The Robot Report / PR Newswire',
  'https://www.therobotreport.com/agibot-produces-15000th-robot-marking-milestone-embodied-ai-deployment/',
  'Agibot 15,000대 생산 돌파 + G2 산업용 모델 + UK RaaS £1,999/일',
  '6/28 15,000대 돌파(10K→15K 3개월 미만). G2 산업용 로봇. 7/1 런던 UK APC2026. A3 유럽 데뷔(55kg, 10시간, 10초 배터리 교환). UK RaaS 출시.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%X1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%15,000%'
  AND detected_at > '2026-06-01'::timestamp
);

-- 1X World Model + San Carlos
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'The Robot Report / Interesting Engineering',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '1X NEO World Model AI 출시, San Carlos 공장 건설로 2027년 10만대/년 목표',
  'World Model: 비디오 학습→물리적 작업. San Carlos 신공장 100K/년. 75 DOF(핸드 22). 수직통합 제조. Hayward 공장 가동 중(200명+).',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR name ILIKE '%NEO%' OR name ILIKE '%1X%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X%World Model%'
  AND detected_at > '2026-06-01'::timestamp
);

-- UMA Northstar
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Electrek / Bloomberg',
  'https://electrek.co/2026/07/07/tesla-optimus-scientist-uma-humanoid-robot/',
  'Ex-Tesla Optimus 과학자 UMA 설립, Northstar 유럽 휴머노이드 공개, $40M 시드',
  'Rémi Cadène(ex-Tesla/HuggingFace) UMA 설립. Northstar 40kg 경량 휴머노이드. $40M 시드(Greycroft/Factorial). Yann LeCun 자문. 50개 잠재고객.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%UMA%Northstar%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Figure AI System 0
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Figure AI',
  'https://www.figure.ai/news',
  'Figure AI System 0 스테레오 3D 인식 업데이트, BotQ 350대+ 생산',
  'S0 모델에 RGB→3D 스테레오 인식 추가. 350+ Figure 03 생산. 시간당 1대 유지. BMW 복잡 물류 시퀀싱 진행.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure%System 0%'
  AND detected_at > '2026-07-01'::timestamp
);

-- BD Atlas 5th Gen
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  'Boston Dynamics Atlas 5세대: 복잡도 1/10 감소, 56 DOF, AI 학습 기반',
  '5세대 Atlas 설계 복잡도 거의 1/10 감소. 56 DOF, 2.3m 리치, 50kg 리프트. 프로그래밍이 아닌 AI 학습 기반 행동. 대량생산 준비 완료.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Atlas%5세대%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 9 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 5 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 6 (deduplicated by headline + date)
-- Total: up to 20 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처: Unitree 1260H (US DoD), UMA Northstar (Bloomberg/Electrek),
--     Agibot UK APC (PR Newswire), Figure S0 (Official), BD 5th gen (Forbes/Official),
--     Agility CEO (TechCrunch)
-- [B] 2개 이상 매체 교차확인: 1X World Model/San Carlos (Robot Report + IE),
--     Agibot 15K (Robot Report + eWeek + multiple), Unitree H2/G1-D (RobotShop + multiple)
--
-- NOTE: This script uses dynamic lookups for company_id, robot_id,
-- competitor_id via subqueries. If a referenced entity doesn't exist
-- in the database, the FK field will be NULL (not a hard failure).
-- ============================================================
