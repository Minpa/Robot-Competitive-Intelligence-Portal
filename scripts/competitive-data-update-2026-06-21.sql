-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 - 2026-06-21
-- 실행: psql $DATABASE_URL -f scripts/competitive-data-update-2026-06-21.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla] Optimus V3 공개 연기 및 Fremont 전환 타임라인 상세
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Tesla Pushes Optimus V3 Reveal Later This Year, Fremont Production Starts Late July',
  'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22'::timestamp,
  'Tesla delays Optimus V3 reveal to later in 2026. Fremont production starts late July/August after Model S/X line ends in early May. Production rate "literally impossible to predict" per Musk due to 10,000 unique parts across new production line. Tesla is the only major humanoid maker not partnering with an external manufacturer.',
  'Tesla pushes Optimus V3 public reveal to later 2026. Fremont robot production line starts late July/August, 4 months after Model S/X ends May 2026. Musk: production rate "quite slow" initially, "literally impossible to predict" with 10,000 unique parts. Unlike Figure-BMW, Apollo-Mercedes, Digit-Ford partnerships, Tesla goes alone. Gen 3 hands: 22 DOF per hand, 50 total hand actuators. Full body 72+ DOF. Height 173cm, weight 57kg.',
  'en', 'product', 'robot',
  md5('tesla-optimus-v3-delay-fremont-timeline-2026-06-21'),
  '{"mentionedCompanies":["Tesla","Figure AI","BMW","Apptronik","Mercedes","Agility Robotics","Ford"],"mentionedRobots":["Optimus Gen 3","Optimus V3"],"technologies":["22 DOF hands","50 hand actuators"],"marketInsights":["10000 unique parts","no external manufacturing partner","production rate unpredictable"],"keyPoints":["V3 reveal delayed","Fremont starts late July/August","72+ DOF total body"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-v3-delay-fremont-timeline-2026-06-21'));

-- [Boston Dynamics] Google DeepMind Gemini Robotics 통합 상세
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Boston Dynamics Partners with Google DeepMind: Gemini Robotics Models Power Atlas Autonomy',
  'The Register',
  'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
  '2026-01-06'::timestamp,
  'Boston Dynamics and Google DeepMind partnering to integrate Gemini Robotics AI models into Atlas for improved perception, task execution, and autonomous operation. Production Atlas specs: 56 DOF, 4-hour runtime, 3-minute swappable batteries, 110 lb lift capacity, 7.5 ft reach. All 2026 production fully committed; additional customers planned for early 2027.',
  'Hyundai-owned Boston Dynamics partnering with Google DeepMind for Gemini Robotics embodied AI on Atlas humanoids. Improved perception, task planning, and autonomous operation capabilities. Production Atlas: fully electric (no hydraulics), 56 DOF, 4-hour runtime, 3-minute swappable batteries. 110 lb lift, 7.5 ft reach. All 2026 units committed to Hyundai RMAC and Google DeepMind. Additional customers early 2027. Hyundai dedicated robotics factory: 30K units/year by 2028.',
  'en', 'technology', 'robot',
  md5('boston-dynamics-deepmind-gemini-atlas-autonomy-2026-06-21'),
  '{"mentionedCompanies":["Boston Dynamics","Google DeepMind","Hyundai"],"mentionedRobots":["Atlas Electric"],"technologies":["Gemini Robotics","swappable batteries","56 DOF","fully electric"],"marketInsights":["2026 fully committed","30K units/year by 2028","additional customers 2027"],"keyPoints":["DeepMind Gemini Robotics integration","56 DOF 4hr runtime","3-min battery swap"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('boston-dynamics-deepmind-gemini-atlas-autonomy-2026-06-21'));

-- [Figure AI] Figure 03 204K 패키지 분류 및 LG Technology Ventures 투자
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Figure 03 Sorts 204,000+ Packages Autonomously; LG Technology Ventures Among Series C Investors',
  'Figure AI Official',
  'https://www.figure.ai/news/series-c',
  '2026-05-20'::timestamp,
  'Figure 03 autonomous package sorting livestream shows 204,000+ packages sorted in 163+ hours. Series C investors include LG Technology Ventures, NVIDIA, Intel Capital, Salesforce, T-Mobile Ventures, Qualcomm Ventures. $39B post-money valuation with $1B+ committed. 350+ Figure 03 robots produced via BotQ facility at 1 robot/hour rate.',
  'Figure 03 livestream (May 20, 2026): 204K+ packages sorted in 163+ hours - sorts packages label-side-down onto conveyor belt. Series C ($1B+, $39B valuation) investors: Parkway Venture Capital (lead), Brookfield Asset Management, NVIDIA, Macquarie Capital, Intel Capital, Align Ventures, Tamarack Global, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm Ventures. Total funding $1.9B. BotQ: 350+ Figure 03 produced at 1/hour.',
  'en', 'product', 'robot',
  md5('figure-03-204k-packages-lg-ventures-2026-06-21'),
  '{"mentionedCompanies":["Figure AI","LG Technology Ventures","NVIDIA","Intel Capital","Salesforce","Qualcomm","T-Mobile"],"mentionedRobots":["Figure 03"],"technologies":["autonomous package sorting","BotQ manufacturing"],"marketInsights":["LG Technology Ventures investor","$39B valuation","204K+ packages sorted"],"keyPoints":["Figure 03 204K packages in 163 hours","LG Technology Ventures Series C investor","350+ robots produced at 1/hour"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-204k-packages-lg-ventures-2026-06-21'));

-- [Unitree] 도쿄 하네다공항 배치 및 IPO 업데이트
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Unitree G1 Deployed at Tokyo Haneda Airport - First Commercial Airport Humanoid Deployment',
  'eWeek',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-03-15'::timestamp,
  'Unitree G1 deployed for baggage and cargo handling at Tokyo Haneda Airport in partnership with Japan Airlines and GMO Internet Group, marking the first commercial airport deployment for a humanoid robot. Unitree targeting 20,000 humanoid shipments in 2026. IPO A-share listing on track for mid-2026 with $580M target. Revenue growth 335% YoY in 2025.',
  'Unitree G1 deployed at Tokyo Haneda Airport for baggage/cargo handling - partnership with Japan Airlines and GMO Internet Group. First commercial airport humanoid deployment globally. Targeting 20K humanoid shipments in 2026 (up from 5,500 in 2025). A-share listing mid-2026, $580M target raise. Revenue growth 335% YoY 2025. Open-sourced UnifoLM-VLA-0 (March 2026) for autonomous household tasks. H2 launched Oct 2025: $40.9K, bionic face, 2,070 TOPS.',
  'en', 'industry', 'robot',
  md5('unitree-g1-haneda-airport-deployment-2026-06-21'),
  '{"mentionedCompanies":["Unitree Robotics","Japan Airlines","GMO Internet Group"],"mentionedRobots":["G1","H2"],"technologies":["UnifoLM-VLA-0","baggage handling automation"],"marketInsights":["first airport humanoid deployment","20K shipments target 2026","335% revenue growth"],"keyPoints":["Haneda Airport G1 deployment","Japan Airlines partnership","$580M IPO target"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-g1-haneda-airport-deployment-2026-06-21'));

-- [Agility] ISO 기능 안전 인증 추진 및 RBR50 수상
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Agility Robotics Pursues ISO Functional Safety Certification for Digit; Wins RBR50 Robot of the Year',
  'Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  '2026-06-10'::timestamp,
  'Agility Robotics pursuing ISO functional safety certification, expects Digit to be cleared for human collaboration by mid-to-late 2026. Won The Robot Report inaugural RBR50 Robot of the Year Award. Digit is the only bipedal robot generating revenue from paying commercial customers. Fortune 500 customers include GXO, Schaeffler, Amazon, Toyota, Mercado Libre.',
  'Agility Robotics pursuing ISO functional safety certification, targeting mid-to-late 2026 clearance for human collaboration. RBR50 Robot of the Year Award from The Robot Report. Digit: only bipedal robot with paying commercial customers. 100K+ totes moved in live commerce operations. Fortune 500 deployments: GXO, Schaeffler, Amazon, Toyota Canada, Mercado Libre, Spanx. Operating cost: $10-12/hr path to $2-3/hr.',
  'en', 'industry', 'robot',
  md5('agility-iso-safety-rbr50-award-2026-06-21'),
  '{"mentionedCompanies":["Agility Robotics","GXO","Schaeffler","Amazon","Toyota","Mercado Libre"],"mentionedRobots":["Digit"],"technologies":["ISO functional safety","bipedal locomotion"],"marketInsights":["only bipedal robot with revenue","RBR50 Robot of the Year","ISO clearance mid-late 2026"],"keyPoints":["ISO functional safety certification pursuit","RBR50 Robot of the Year Award","human collaboration clearance by mid-late 2026"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-iso-safety-rbr50-award-2026-06-21'));

-- [Apptronik] Mercedes Berlin/Hungary 배치 및 Gemini 3 통합
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Apptronik Apollo Deployed at Mercedes Digital Factory Campus Berlin; Powered by Gemini 3 AI',
  'Mercedes-Benz Group',
  'https://group.mercedes-benz.com/company/production/procuction-network/mbdfc-humanoid-robots.html',
  '2026-05-15'::timestamp,
  'Apollo deployed at Mercedes Digital Factory Campus Berlin-Marienfelde and Kecskemét plant in Hungary for intra-logistics tasks. Powered by Google DeepMind Gemini 3 and Gemini Robotics AI - can watch demonstrations, follow natural-language instructions, plan multi-step actions. Jabil manufacturing partnership enables commercial quantities by 2027.',
  'Apptronik Apollo deployed at Mercedes Digital Factory Campus Berlin-Marienfelde and Kecskemét plant Hungary. Intra-logistics: delivering assembly kits, inspecting components. Powered by Gemini 3 + Gemini Robotics AI: watch demonstrations, follow NL instructions, multi-step planning, handle unfamiliar objects without retraining. Jabil partnership for at-scale manufacturing. Fleet piloting 2025-2026, commercial quantities by 2027. $935M total funding, $5B valuation.',
  'en', 'product', 'robot',
  md5('apptronik-apollo-mercedes-berlin-gemini3-2026-06-21'),
  '{"mentionedCompanies":["Apptronik","Mercedes-Benz","Google DeepMind","Jabil"],"mentionedRobots":["Apollo"],"technologies":["Gemini 3","Gemini Robotics AI","natural-language instructions","multi-step planning"],"marketInsights":["Berlin + Hungary deployment","Jabil manufacturing at scale","commercial quantities 2027"],"keyPoints":["Mercedes Berlin-Marienfelde deployment","Gemini 3 AI integration","Jabil manufacturing partnership"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-apollo-mercedes-berlin-gemini3-2026-06-21'));

-- [1X] EQT 전략적 파트너십 및 World Model AI
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  '1X Technologies Signs EQT Partnership for 10,000 NEO Robots; Launches World Model AI',
  'TechCrunch / BusinessWire',
  'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
  '2026-03-10'::timestamp,
  '1X announced strategic partnership with EQT to ship up to 10,000 NEO robots to 300+ portfolio companies (2026-2030) for manufacturing, warehousing, logistics. World Model AI enables NEO to learn tasks by watching videos. NEO specs: 167cm, 30kg, 75 DOF total (22 DOF per hand), NVIDIA Jetson Thor, 842 Wh battery, 4hr runtime, 24min fast charge, 6.2 m/s speed, 70kg lift capacity.',
  '1X-EQT partnership: up to 10,000 NEO robots for 300+ portfolio companies 2026-2030. Focus: manufacturing, warehousing, logistics, industrial. World Model AI (March 2026): learn tasks from watching videos, grounded in real-world physics. NEO specs: 167cm tall, 30kg, 75 DOF (22 DOF/hand), NVIDIA Jetson Thor + Redwood AI, 842 Wh battery, 4hr runtime, 24min fast charge, 6.2 m/s, 70kg lift. Soft body 3D lattice polymer, pinch-proof. Tendon Drive proprietary actuators. $20K or $499/mo.',
  'en', 'product', 'robot',
  md5('1x-eqt-partnership-world-model-neo-specs-2026-06-21'),
  '{"mentionedCompanies":["1X Technologies","EQT","NVIDIA"],"mentionedRobots":["NEO"],"technologies":["World Model AI","Redwood AI","Tendon Drive","Jetson Thor","3D lattice polymer"],"marketInsights":["10K robots for EQT 300+ companies","$20K or $499/mo","75 DOF 70kg lift"],"keyPoints":["EQT 10K robot partnership","World Model video learning","842Wh 4hr 24min charge"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-eqt-partnership-world-model-neo-specs-2026-06-21'));

-- [Agibot] Sharebot 글로벌 렌탈 플랫폼 및 Met Gala
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'AgiBot Launches Sharebot Global Rental Platform Across 17 Countries; Powers Alexander Wang Met Gala Robot',
  'BGR / TechTimes',
  'https://www.bgr.com/2115577/agibot-robot-rental-program-price-release-date/',
  '2026-05-11'::timestamp,
  'AgiBot introduced Sharebot global rental platform across 17 countries including US and Europe. Pricing from €899/day ($1,000+), long-term leasing available. US platform launched March 2026. RaaS model covers North America. Qingtianzu subsidiary raised $14.5M for rental network expansion. AgiBot humanoid powered Alexander Wang Met Gala robot appearance. TrendForce projects Unitree + AgiBot capture ~80% of humanoid shipments in 2026.',
  'AgiBot Sharebot rental platform: 17 countries, US + Europe. Pricing €899/day, long-term leasing options. US online store (store.agibot.com) March 2026. RaaS covers North America. Qingtianzu subsidiary (AgiBot-backed) raised $14.5M for robot rental network. Alexander Wang Met Gala 2026: Agibot advanced humanoid platform. TrendForce: Unitree + AgiBot = ~80% of 2026 humanoid shipments. China humanoid output surging 94% in 2026. Products: A2, X2, G2 series + D1 quadruped (CES 2026).',
  'en', 'industry', 'robot',
  md5('agibot-sharebot-rental-met-gala-2026-06-21'),
  '{"mentionedCompanies":["AgiBot","Qingtianzu","Alexander Wang","TrendForce","Unitree"],"mentionedRobots":["A2","X2","G2","D1"],"technologies":["Sharebot RaaS platform","global rental"],"marketInsights":["€899/day rental","17 countries","80% market share with Unitree","94% output surge 2026"],"keyPoints":["Sharebot global rental platform launch","Met Gala humanoid appearance","Qingtianzu $14.5M for rental expansion"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-sharebot-rental-met-gala-2026-06-21'));

-- [Industry] TrendForce: 2026 휴머노이드 시장 전망
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'TrendForce: China Humanoid Robot Output to Surge 94% in 2026; Unitree and AgiBot Lead with 80% Share',
  'TrendForce',
  'https://www.trendforce.com/presscenter/news/20260409-13007.html',
  '2026-04-09'::timestamp,
  'TrendForce projects China humanoid robot output to surge 94% in 2026. Unitree Robotics and AgiBot projected to capture nearly 80% of total humanoid shipments globally. Both companies demonstrate strong monetization and mass production capabilities. China positioned as dominant force in humanoid robotics manufacturing.',
  'TrendForce 2026 humanoid market report: China output +94% YoY. Unitree + AgiBot = ~80% global shipments. Strong monetization + mass production capabilities. Key drivers: government policy support, supply chain advantages, aggressive pricing strategy. Competition intensifying between Chinese and US makers (Tesla, Figure AI, Apptronik).',
  'en', 'industry', 'robot',
  md5('trendforce-china-humanoid-94pct-surge-2026-06-21'),
  '{"mentionedCompanies":["TrendForce","Unitree","AgiBot","Tesla","Figure AI","Apptronik"],"mentionedRobots":[],"technologies":[],"marketInsights":["94% output surge China","80% share Unitree+AgiBot","China dominant in manufacturing"],"keyPoints":["TrendForce 94% surge forecast","Unitree+AgiBot 80% share","China vs US competition"]}'::jsonb,
  NULL,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('trendforce-china-humanoid-94pct-surge-2026-06-21'));


-- ============================================================
-- 2. COMPETITIVE ALERTS 삽입 (War Room용, 신규 데이터만)
-- ============================================================

-- Alert 1: Tesla Optimus V3 공개 연기
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus Gen 3%' LIMIT 1),
  'mass_production', 'warning',
  '[Tesla] Optimus V3 공개 연기, Fremont 7월말 생산 개시 - 10,000개 고유 부품',
  'Tesla가 Optimus V3 공개를 2026년 하반기로 연기. Fremont 라인 7월말/8월 생산 시작 예정. 10,000개 고유 부품으로 생산 속도 예측 불가. 유일하게 외부 제조 파트너 없이 독자 생산 추진. Gen 3 사양: 173cm/57kg, 72+ DOF, 22 DOF/hand.',
  '{"source":"Electrek","confidence":"B","date":"2026-04-22","delay":"V3 reveal pushed to H2 2026","productionStart":"late July/August 2026","uniqueParts":10000,"specs":"173cm 57kg 72+ DOF","noPartner":"only maker without external manufacturing partner"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus V3 공개 연기%');

-- Alert 2: BD Atlas + DeepMind Gemini Robotics
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%Electric%' OR name ILIKE '%Atlas%' LIMIT 1),
  'partnership', 'critical',
  '[Boston Dynamics] Google DeepMind Gemini Robotics 통합 - Atlas 56 DOF, 3분 배터리 교체',
  'Boston Dynamics가 Google DeepMind와 Gemini Robotics AI 모델을 Atlas에 통합. 생산 Atlas 사양: 완전 전기식, 56 DOF, 4시간 구동, 3분 교체 배터리, 110파운드 리프트, 7.5ft 리치. 2026 전량 Hyundai RMAC/Google DeepMind 배정.',
  '{"source":"Boston Dynamics Official / The Register","confidence":"A","date":"2026-01-06","partnership":"Google DeepMind Gemini Robotics","specs":"56 DOF, 4hr runtime, 3-min swap battery, 110lb lift, 7.5ft reach","allocationStatus":"2026 fully committed"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%DeepMind Gemini Robotics 통합%');

-- Alert 3: Figure 03 패키지 분류 및 LG 투자
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure 03%' LIMIT 1),
  'partnership', 'critical',
  '[Figure AI] Figure 03 204K 패키지 자율 분류 달성 - LG Technology Ventures 투자 참여',
  'Figure 03이 163시간+ 자율 운영으로 204,000개+ 패키지 분류 완료(5/20 라이브스트림). Series C 투자자에 LG Technology Ventures 포함 - LG의 휴머노이드 로봇 산업 투자 전략 확인. $39B 밸류에이션, $1.9B 누적 투자.',
  '{"source":"Figure AI Official","confidence":"A","date":"2026-05-20","packages_sorted":204000,"autonomous_hours":163,"lgInvestment":"LG Technology Ventures in Series C","valuation":"$39B","totalFunding":"$1.9B","lgImplication":"LG investing in humanoid robotics ecosystem"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure 03 204K 패키지%');

-- Alert 4: Unitree 하네다 공항 배치
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' LIMIT 1),
  'partnership', 'warning',
  '[Unitree] G1 도쿄 하네다공항 배치 - 세계 최초 공항 휴머노이드 상업 배치',
  'Unitree G1이 Japan Airlines, GMO Internet Group과 파트너십으로 도쿄 하네다공항에 배치. 수하물/화물 처리 업무. 세계 최초 휴머노이드 로봇 공항 상업 배치. 2025년 매출 335% YoY 성장. A주 IPO $580M 목표.',
  '{"source":"eWeek / industry reports","confidence":"B","date":"2026-03-15","deployment":"Tokyo Haneda Airport","partners":["Japan Airlines","GMO Internet Group"],"milestone":"first commercial airport humanoid deployment globally","revenueGrowth":"335% YoY 2025","ipoTarget":"$580M"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%하네다공항 배치%');

-- Alert 5: Apptronik Mercedes Berlin 배치 + Gemini 3
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' LIMIT 1),
  'partnership', 'warning',
  '[Apptronik] Apollo Mercedes Berlin/Hungary 배치 - Gemini 3 AI + Jabil 양산 파트너십',
  'Apollo가 Mercedes Digital Factory Campus Berlin-Marienfelde 및 헝가리 Kecskemét 공장에 배치. Gemini 3 + Gemini Robotics AI로 자연어 지시, 다단계 계획 수행. Jabil과 양산 파트너십으로 2027년 상업 수량 생산 가능.',
  '{"source":"Mercedes-Benz Group Official / Interesting Engineering","confidence":"A","date":"2026-05-15","deployments":["Berlin-Marienfelde","Kecskemét Hungary"],"aiPlatform":"Gemini 3 + Gemini Robotics","manufacturingPartner":"Jabil","commercialQuantities":"2027","totalFunding":"$935M"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apollo Mercedes Berlin%');

-- Alert 6: 1X EQT 10,000대 파트너십
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' LIMIT 1),
  'partnership', 'warning',
  '[1X] EQT 전략 파트너십 10,000대 - World Model AI, 75 DOF, 842Wh 배터리',
  '1X Technologies가 EQT와 전략 파트너십 체결: 2026-2030년 최대 10,000대 NEO를 300+ 포트폴리오 기업에 공급. World Model AI로 비디오 시청 학습. NEO 사양: 167cm/30kg, 75 DOF, 842Wh, 4시간 구동, 24분 급속충전, 70kg 리프트.',
  '{"source":"BusinessWire / TechCrunch","confidence":"A","date":"2026-03-10","partnership":"EQT 10K robots for 300+ companies","timeline":"2026-2030","specs":"167cm 30kg 75DOF 842Wh 4hr 24min charge 70kg lift","ai":"World Model + Redwood AI","pricing":"$20K or $499/mo"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%EQT 전략 파트너십%');

-- Alert 7: Agility ISO 안전 인증
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' LIMIT 1),
  'mass_production', 'info',
  '[Agility] Digit ISO 기능 안전 인증 추진 - 인간 협업 2026년 중-후반 허가 예상',
  'Agility Robotics가 Digit의 ISO 기능 안전 인증을 추진 중. 2026년 중-후반 인간 협업 허가 예상. RBR50 Robot of the Year 수상. 유일한 수익 창출 이족보행 로봇. Fortune 500 고객: GXO, Amazon, Toyota, Schaeffler, Mercado Libre.',
  '{"source":"Robotics 24/7 / The Robot Report","confidence":"B","date":"2026-06-10","certification":"ISO functional safety","timeline":"mid-to-late 2026 human collaboration","award":"RBR50 Robot of the Year","distinction":"only bipedal robot with commercial revenue"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Digit ISO 기능 안전%');

-- Alert 8: Agibot Sharebot 글로벌 렌탈
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' OR name ILIKE '%Genie%' LIMIT 1),
  'mass_production', 'warning',
  '[AgiBot] Sharebot 글로벌 렌탈 플랫폼 17개국 출시 - €899/일, US RaaS 개시',
  'AgiBot이 Sharebot 글로벌 렌탈 플랫폼을 17개국에 출시. 일일 렌탈 €899부터. US 온라인 스토어 2026.3 론칭. Qingtianzu 자회사 $14.5M 투자 유치로 렌탈 네트워크 확대. TrendForce: Unitree+AgiBot이 2026년 휴머노이드 출하의 ~80% 점유 전망.',
  '{"source":"BGR / TrendForce","confidence":"B","date":"2026-05-11","platform":"Sharebot","countries":17,"pricing":"€899/day","usLaunch":"March 2026","subsidiary":"Qingtianzu $14.5M raised","marketShare":"~80% with Unitree per TrendForce"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Sharebot 글로벌 렌탈%');

-- Alert 9: TrendForce 시장 전망 - 중국 94% 성장
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'mass_production', 'warning',
  '[Industry] TrendForce: 중국 휴머노이드 생산 2026년 94% 급증 - Unitree/AgiBot 80% 점유',
  'TrendForce 보고서: 중국 휴머노이드 로봇 생산이 2026년 94% 급증 전망. Unitree와 AgiBot이 글로벌 출하량의 약 80%를 점유할 것으로 예측. 정부 정책 지원, 공급망 우위, 공격적 가격 전략이 주요 동력.',
  '{"source":"TrendForce","confidence":"A","date":"2026-04-09","chinaGrowth":"94% YoY","marketLeaders":"Unitree + AgiBot ~80%","drivers":["government policy","supply chain","aggressive pricing"]}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%TrendForce%중국 휴머노이드%94%');


-- ============================================================
-- 3. CI MONITOR ALERTS 삽입 (CI 업데이트 시스템용)
-- ============================================================

-- Tesla V3 delay
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  'Tesla pushes Optimus V3 reveal to H2 2026; Fremont production starts late July with 10K unique parts',
  'V3 reveal delayed to H2 2026. Fremont production line starts late July/August. 10,000 unique parts makes production rate unpredictable. Only humanoid maker without external manufacturing partner. Gen 3 specs: 173cm, 57kg, 72+ DOF, 22 DOF per hand.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Optimus V3 reveal to H2%');

-- BD Gemini Robotics
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'The Register / Boston Dynamics',
  'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
  'Atlas integrates Google DeepMind Gemini Robotics; production specs: 56 DOF, 3-min battery swap, 4hr runtime',
  'Google DeepMind Gemini Robotics AI integrated into Atlas for perception, task planning, autonomous operation. Production specs: fully electric, 56 DOF, 4-hour runtime, 3-minute swappable batteries, 110 lb lift, 7.5 ft reach.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Atlas integrates Google DeepMind Gemini%');

-- Figure 03 packages + LG
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Figure AI Official',
  'https://www.figure.ai/news/series-c',
  'Figure 03 sorts 204K packages in 163 hours; LG Technology Ventures joins Series C investors',
  'Figure 03 autonomous sorting: 204K+ packages in 163+ hours. LG Technology Ventures among Series C investors ($1B+, $39B valuation). Other investors: NVIDIA, Intel Capital, Salesforce, Qualcomm Ventures. 350+ Figure 03 produced at 1/hour rate.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%204K packages%LG Technology Ventures%');

-- Unitree Haneda
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'eWeek',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree G1 deployed at Tokyo Haneda Airport with Japan Airlines; first commercial airport humanoid deployment',
  'G1 deployed at Haneda Airport for baggage/cargo handling. Partnership with Japan Airlines and GMO Internet Group. First commercial airport humanoid deployment globally. Targeting 20K shipments 2026. 335% revenue growth YoY 2025. A-share IPO $580M target.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Unitree G1 deployed at Tokyo Haneda%');

-- Agility ISO
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  'Agility Robotics pursues ISO functional safety certification for Digit; RBR50 Robot of the Year',
  'ISO functional safety certification in progress. Human collaboration clearance expected mid-to-late 2026. Won RBR50 Robot of the Year Award. Only bipedal robot generating commercial revenue. Fortune 500 customers: GXO, Amazon, Toyota, Schaeffler, Mercado Libre.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agility Robotics pursues ISO%');

-- Apptronik Berlin
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Mercedes-Benz Group',
  'https://group.mercedes-benz.com/company/production/procuction-network/mbdfc-humanoid-robots.html',
  'Apollo deployed at Mercedes Berlin & Hungary factories; powered by Gemini 3 AI; Jabil for scale manufacturing',
  'Apollo deployed at Mercedes Digital Factory Campus Berlin-Marienfelde and Kecskemét plant Hungary. Powered by Gemini 3 + Gemini Robotics AI. Jabil manufacturing partnership for commercial quantities by 2027. $935M total funding, $5B valuation.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR name ILIKE '%Apollo%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Apollo deployed at Mercedes Berlin%');

-- 1X EQT
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'BusinessWire / TechCrunch',
  'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
  '1X-EQT partnership: 10K NEO robots for 300+ portfolio companies 2026-2030; World Model AI launched',
  'Strategic partnership with EQT: up to 10K NEO robots for 300+ portfolio companies 2026-2030. World Model AI enables learning from videos. NEO specs: 167cm, 30kg, 75 DOF, 842 Wh, 4hr runtime, 24min fast charge, 70kg lift. $20K or $499/mo.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' OR name ILIKE '%NEO%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1X-EQT partnership%10K NEO%');

-- AgiBot Sharebot
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'BGR / TrendForce',
  'https://www.bgr.com/2115577/agibot-robot-rental-program-price-release-date/',
  'AgiBot launches Sharebot global rental across 17 countries; €899/day; 80% market share forecast with Unitree',
  'Sharebot global rental platform: 17 countries, €899/day. US store launched March 2026. Qingtianzu subsidiary raised $14.5M for expansion. TrendForce: Unitree + AgiBot = ~80% global humanoid shipments. China output +94% YoY 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%X1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%AgiBot launches Sharebot%');

COMMIT;

-- ============================================================
-- 실행 결과 확인
-- ============================================================
SELECT 'Articles inserted' AS result, COUNT(*) AS count FROM articles WHERE collected_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'Competitive alerts inserted', COUNT(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'CI monitor alerts inserted', COUNT(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
