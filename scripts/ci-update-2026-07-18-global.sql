-- ============================================================
-- ARGOS 경쟁사 데이터 업데이트 SQL Script (글로벌 확장판)
-- 생성일: 2026-07-18
-- 범위: 기존 07-18 업데이트(8개사)에서 미커버된 글로벌 동향 21건
--       - 중국: XPeng, Xiaomi, LimX, Booster, Galbot/CATL, UBTech,
--               AI2 Robotics, X Square Robot
--       - 일본: Mitsubishi Motors / Highlanders
--       - 유럽: Neura Robotics
--       - 한국: Rainbow Robotics/Samsung, LG, Tesollo
--       - 북미: Sanctuary AI, Proception, Physical Intelligence,
--               NVIDIA/Unitree GR00T
-- 신뢰도: A(공식 발표/복수 유력 매체) 또는 B(단일 유력 매체)만 수록
-- 중복 방지: content_hash(md5 슬러그) 기반 WHERE NOT EXISTS
-- ============================================================

BEGIN;

-- ============================================================
-- 0. COMPANIES (미등록 기업 추가 — 이름 중복 시 스킵)
-- ============================================================

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'XPeng', 'China', 'robot', 'EV / Humanoid Robots (IRON)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%XPeng%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'LimX Dynamics', 'China', 'robot', 'Humanoid / Legged Robots'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%LimX%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'Booster Robotics', 'China', 'robot', 'Humanoid Development Platforms'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%Booster Robotics%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'AI2 Robotics', 'China', 'robot', 'Wheeled Humanoids (AlphaBot) / Alpha Brain FM'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%AI2 Robotics%' OR name ILIKE '%AI Squared%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'X Square Robot', 'China', 'rfm', 'Physical AI Foundation Models (WALL-B)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%X Square%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'Neura Robotics', 'Germany', 'robot', 'Cognitive / Humanoid Robots (4NE1)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%Neura%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'Mitsubishi Motors', 'Japan', 'robot', 'Automotive / Humanoid Mass Production (Highlanders)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%Mitsubishi Motors%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'CATL', 'China', 'robotics', 'Battery / Humanoid Deployment Partner'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%CATL%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'Proception', 'USA', 'actuator', 'Dexterous Robotic Hands (ProHand)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%Proception%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'Tesollo', 'South Korea', 'actuator', 'Dexterous Robotic Hands (DG-5F)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%Tesollo%');

INSERT INTO companies (id, name, country, category, main_business)
SELECT gen_random_uuid(), 'LG Electronics', 'South Korea', 'robot', 'Home Humanoid (CLOiD) / Actuators (AXIUM)'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name ILIKE '%LG Electronics%');

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트 — 21건)
-- ============================================================

-- [XPeng] IRON 2.0 뮌헨 유럽 데뷔 — 연말 양산 재확인 (A, 2026-07-18)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%XPeng%' LIMIT 1),
  'XPeng Gives IRON 2.0 Humanoid Its European Debut at Munich Physical AI Event — Mass Production by End-2026',
  'Forbes / XPeng Official',
  'https://www.forbes.com/sites/bensin/2026/07/18/xpeng-expands-beyond-evs-with-munich-event-promising-flying-cars-and-humanoid-robots/',
  '2026-07-18'::timestamp,
  'XPeng staged a Future of Physical AI event in Munich on July 17, showing IRON 2.0 (173cm, ~65kg, 82 DOF, bionic spine, electronic skin) in Europe for the first time. Reiterated mass production by end-2026 and monthly capacity of 1,000+ units by year-end. First deployment as retail-store guides in China Q1 2027, international rollout after.',
  'On July 17, 2026, XPeng staged a Future of Physical AI event in Munich, showing its IRON 2.0 humanoid in Europe for the first time alongside the MONA L03 EV launch and an Aridge eVTOL flying-car module. IRON 2.0 stands 173cm, weighs about 65kg, and has 82 degrees of freedom, with a bionic spine and electronic-skin design carried over from the November unveiling. XPeng reiterated plans to reach mass production by end-2026 and to scale IRON monthly production capacity to over 1,000 units by year-end, with first deployments as retail-store guides in China in Q1 2027 before international rollout. CEO He Xiaopeng has indicated an eventual retail price similar to car prices but has committed to no figure.',
  'en', 'product', 'robot',
  md5('xpeng-iron-2-munich-europe-debut-2026-07'),
  '{"confidence":"A","mentionedCompanies":["XPeng"],"mentionedRobots":["IRON 2.0"],"technologies":["bionic spine","electronic skin"],"marketInsights":["Mass production by end-2026","1,000+ units/month capacity target","Q1 2027 retail-guide deployment"],"keyPoints":["European debut in Munich July 17","173cm / 65kg / 82 DOF","Retail price to be similar to car prices"],"summaryKo":"샤오펑이 7월 17일 뮌헨 행사에서 IRON 2.0(173cm, 65kg, 82자유도)을 유럽 최초 공개. 연말 양산 및 월 1,000대 이상 생산능력을 재확인했으며 2027년 1분기 중국 매장 안내용으로 첫 상용 투입 예정."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('xpeng-iron-2-munich-europe-debut-2026-07'));

-- [Xiaomi] 자동차 생산라인 휴머노이드 성공률 98% 달성 (B, 2026-07-15)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Xiaomi%' LIMIT 1),
  'Xiaomi Humanoid Hits 98% Success Rate on EV Production Line — 1%p Below Human Workers',
  'TechNode / Lei Jun Weibo',
  'https://technode.com/2026/07/15/xiaomi-updates-progress-on-humanoid-robots-in-auto-factory-achieves-98-success-rate-in-some-tasks/',
  '2026-07-15'::timestamp,
  'Xiaomi CEO Lei Jun posted video of its self-developed humanoid continuously sorting center-console side covers on an automotive production line — claimed first long-duration continuous humanoid operation on flexible workpieces in an auto factory. Success rate at a self-tapping nut loading station rose from 90.2% to 98% after four months, ~1%p below human workers. Plans large-scale deployment across own factories over next five years.',
  'On July 15, 2026, Xiaomi CEO Lei Jun posted video of the companys self-developed humanoid continuously sorting center-console side covers on an automotive production line — claimed as the first long-duration continuous humanoid operation on flexible workpieces in an auto factory. After four months of iteration, the robots success rate at a self-tapping nut loading station rose from 90.2% to 98%, about one percentage point below human workers qualification rate. Xiaomi has not announced commercial sales but plans to deploy a large number of humanoids across its own factories over the next five years.',
  'en', 'product', 'robot',
  md5('xiaomi-humanoid-ev-factory-98pct-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Xiaomi"],"mentionedRobots":["Xiaomi humanoid"],"technologies":["flexible workpiece handling"],"marketInsights":["98% task success vs 90.2% four months ago","1%p below human qualification rate","5-year in-house factory deployment plan"],"keyPoints":["First long-duration continuous humanoid op on flexible workpieces in auto factory","No commercial sales announced"],"summaryKo":"샤오미 휴머노이드가 자동차 생산라인 너트 장착 공정에서 성공률 98%를 달성(4개월 만에 90.2%→98%), 인간 작업자와 1%p 차이. 향후 5년간 자사 공장 대량 투입 계획."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('xiaomi-humanoid-ev-factory-98pct-2026-07'));

-- [LimX Dynamics] $200M 프리IPO — 기업가치 $2.2B, 상장 공식화 (A, 2026-07-14)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%LimX%' LIMIT 1),
  'LimX Dynamics Closes $200M Pre-IPO Round at $2.2B Valuation — Majority of Orders Now Overseas',
  'Nikkei Asia',
  'https://asia.nikkei.com/business/technology/chinese-robot-startup-limx-dynamics-raises-200m-to-improve-autonomy',
  '2026-07-14'::timestamp,
  'LimX Dynamics announced a $200M pre-IPO round valuing it at 15B yuan (~$2.21B); ~$400M raised in past six months. Founder Will Zhang: listing is a must. Investors include IDG Capital, Lens Technology, UAE Stone Venture, Italy GGG, Germany Redstone VC. Over half of orders now from outside China; multi-year plan to ship thousands of humanoids to the Middle East; delivering Luna humanoid to South Korea.',
  'LimX Dynamics announced on July 14, 2026 a $200M pre-IPO round valuing it at 15 billion yuan (~$2.21B), bringing total raised over the past six months to about $400M. Founder Will Zhang said listing is a must, signaling an IPO push. Investors include IDG Capital and Lens Technology plus overseas backers UAE-based Stone Venture, Italys GGG and Germanys Redstone VC; more than half of LimX orders now come from outside China. The company is starting a multi-year plan to ship thousands of humanoids to the Middle East and is delivering its entertainment-focused Luna humanoid to customers in South Korea.',
  'en', 'industry', 'robot',
  md5('limx-dynamics-200m-pre-ipo-2026-07'),
  '{"confidence":"A","mentionedCompanies":["LimX Dynamics","IDG Capital","Lens Technology"],"mentionedRobots":["Luna","Oli"],"technologies":[],"marketInsights":["$200M pre-IPO at $2.2B valuation","~$400M raised in 6 months","50%+ overseas orders","Thousands of units to Middle East"],"keyPoints":["IPO push official","Luna delivering to South Korea"],"summaryKo":"LimX가 기업가치 약 22억 달러에 2억 달러 프리IPO를 마감하고 상장 추진을 공식화. 주문의 절반 이상이 해외이며 중동 수천 대 공급 계획과 한국향 Luna 납품 진행 중."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('limx-dynamics-200m-pre-ipo-2026-07'));

-- [산업] 중국 휴머노이드 상장 러시 (B, 2026-07-13)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  NULL,
  'Listing Is a Must: Chinese Humanoid Startups Rush to IPO as Capital Race Intensifies',
  'CNBC',
  'https://www.cnbc.com/2026/07/13/chinese-humanoid-startups-ipo-limx-unitree.html',
  '2026-07-13'::timestamp,
  'Chinese humanoid startups are racing to public markets: Unitree STAR Market IPO approved, LimX raising pre-IPO ahead of listing, Galbot has picked banks for a 2026 Hong Kong IPO. Founders describe listing timing as existential given soaring capital intensity. Follows record 2026 funding for Chinese embodied-AI firms and government new productive forces policy support.',
  'CNBC reported July 13, 2026 that Chinese humanoid startups are racing to public markets, with Unitrees STAR Market IPO approved, LimX raising pre-IPO money ahead of a listing, and Galbot having picked banks for a 2026 Hong Kong IPO. Founders describe listing timing as existential in a sector where capital intensity is soaring. The rush follows record 2026 funding for Chinese embodied-AI firms and government support for new productive forces robotics policy.',
  'en', 'industry', 'robot',
  md5('china-humanoid-ipo-rush-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Unitree Robotics","LimX Dynamics","Galbot"],"mentionedRobots":[],"technologies":[],"marketInsights":["IPO rush across Chinese humanoid sector","Galbot picked banks for HK IPO","Record 2026 embodied-AI funding"],"keyPoints":["Listing timing seen as existential","Government new productive forces support"],"summaryKo":"유니트리 IPO 승인, LimX 프리IPO, 갤봇 홍콩 상장 주관사 선정 등 중국 휴머노이드 스타트업 상장 러시 본격화. 자본 소모가 큰 산업 특성상 상장은 필수라는 인식 확산."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('china-humanoid-ipo-rush-2026-07'));

-- [산업] 중국, 학습데이터 확보 위해 휴머노이드 실전 대량 투입 — 올해 $14.8B 투자 (B, 2026-07-15)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  NULL,
  'Bloomberg: China Floods Factories With Humanoids to Win Robot Training-Data War — $14.8B Invested 2026 YTD',
  'Bloomberg',
  'https://www.bloomberg.com/news/articles/2026-07-15/china-sends-robots-out-into-the-world-to-learn-how-to-be-human',
  '2026-07-15'::timestamp,
  'Chinese startups are deploying thousands of humanoids into logistics hubs, battery factories and industrial sites — faster than US rivals — primarily to harvest real-world training data for embodied-AI models. At least 100B yuan (~$14.8B) invested in the sector in 2026 YTD, more than the previous five years combined. Contrasts China deploy-to-collect-data approach with US reliance on purchased data, simulation, and offshore teleoperation.',
  'A Bloomberg feature published July 15, 2026 details how Chinese startups are deploying thousands of humanoids into logistics hubs, battery factories and other industrial sites — faster than US rivals — primarily to harvest real-world training data for embodied-AI models. Investors including VCs, carmakers and state-backed funds have poured at least 100 billion yuan (~$14.8B) into the sector so far this year, more than the previous five years combined. The piece contrasts Chinas deploy-to-collect-data approach with US firms reliance on purchased data, simulation, and offshore teleoperation labor.',
  'en', 'industry', 'robot',
  md5('bloomberg-china-humanoid-data-deployment-2026-07'),
  '{"confidence":"B","mentionedCompanies":[],"mentionedRobots":[],"technologies":["real-world training data","teleoperation"],"marketInsights":["100B yuan (~$14.8B) 2026 YTD investment","Exceeds prior 5 years combined","Deploy-to-collect-data strategy"],"keyPoints":["Thousands of humanoids in real industrial sites","US relies more on simulation/purchased data"],"summaryKo":"중국 기업들이 실환경 학습데이터 확보를 위해 물류·배터리 공장 등에 수천 대의 휴머노이드를 미국보다 빠르게 투입. 올해 중국 휴머노이드 투자액은 최소 1,000억 위안(148억 달러)으로 직전 5년 합계 초과."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bloomberg-china-humanoid-data-deployment-2026-07'));

-- [Mitsubishi/Highlanders] 교토 공장 휴머노이드 양산 MOU — 2027년 초 (A, 2026-07-09)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Mitsubishi Motors%' LIMIT 1),
  'Mitsubishi Motors to Mass-Produce Highlanders Humanoids at Kyoto Plant From Early 2027',
  'Mitsubishi Motors Official Press Release',
  'https://www.mitsubishi-motors.com/en/newsroom/newsrelease/2026/20260709_1.html',
  '2026-07-09'::timestamp,
  'Mitsubishi Motors and University of Tokyo spinoff Highlanders signed an MOU covering joint humanoid development for Mitsubishi plants and mass production of Highlanders robots at the Kyoto engine plant using idle buildings, targeted from early 2027. Reports indicate ~1,000 units/month target. Mitsubishi deploys humanoids in own facilities first to accumulate operational data, contributing mass-production engineering and QA expertise. First automaker-humanoid mass-production collaboration in Japan.',
  'On July 9, 2026, Mitsubishi Motors and University of Tokyo spinoff Highlanders signed an MOU covering joint development of humanoid robots for Mitsubishi plants and mass production of Highlanders robots at Mitsubishi Kyoto engine plant, using currently idle buildings, with production feasibility targeted from early 2027. Reports indicate a target of roughly 1,000 units per month at Kyoto. Mitsubishi will first deploy humanoids in its own facilities to accumulate operational data, contributing mass-production engineering, quality assurance and mechatronics expertise. It is described as the first automaker-humanoid developer collaboration of its kind involving mass production in Japan.',
  'en', 'industry', 'robot',
  md5('mitsubishi-highlanders-kyoto-mass-production-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Mitsubishi Motors","Highlanders","University of Tokyo"],"mentionedRobots":["Highlanders humanoid"],"technologies":[],"marketInsights":["Kyoto plant idle buildings for humanoid production","~1,000 units/month target","Early 2027 production feasibility"],"keyPoints":["First Japan automaker-humanoid mass production tie-up","Own-facility deployment first for operational data"],"summaryKo":"미쓰비시자동차가 도쿄대 스타트업 하이랜더스와 MOU 체결, 교토 엔진공장 유휴 건물에서 2027년 초 휴머노이드 양산(월 1,000대 목표 보도) 추진. 자사 공장 우선 투입으로 운영 데이터 축적."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('mitsubishi-highlanders-kyoto-mass-production-2026-07'));

-- [Booster] T2 플래그십 출시 — Jetson Thor 2,070 TFLOPS (A, 2026-07-13)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Booster Robotics%' LIMIT 1),
  'Booster Robotics Launches T2 Flagship Humanoid Dev Platform With Jetson Thor — Up to 2,070 TFLOPS Onboard',
  'Newsfile / Booster Robotics Official',
  'https://www.newsfilecorp.com/release/304940/Booster-Robotics-Unveils-Booster-T2-Its-Flagship-Humanoid-Platform-for-Embodied-AI-Development',
  '2026-07-13'::timestamp,
  'Booster T2 embodied-AI development platform launched July 13: 140cm, ~43kg, 31 DOF, 140Nm peak joint torque, 10kg dual-arm payload, ~2h battery. T2 Pro carries NVIDIA Jetson Thor T5000 (up to 2,070 TFLOPS) — claimed most powerful onboard compute on any bipedal humanoid to date. Pricing $29,900 (Pro) to $39,900 (Pro Gripper) and $44,900 (Pro Dex-Hand). Targets developers, labs, education.',
  'Booster Robotics officially launched the Booster T2 embodied-AI development platform on July 13, 2026. The T2 is 140cm tall, ~43kg, with 31 DOF, 140Nm peak joint torque, 10kg dual-arm payload and about 2 hours of battery life. The T2 Pro carries NVIDIA Jetson Thor T5000 delivering up to 2,070 TFLOPS, which Booster claims is the most powerful onboard compute on any bipedal humanoid to date. Pricing spans $29,900 (T2 Pro) to $39,900 (Pro Gripper) and $44,900 (Pro Dex-Hand), targeting developers, labs and education.',
  'en', 'product', 'robot',
  md5('booster-t2-jetson-thor-launch-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Booster Robotics","NVIDIA"],"mentionedRobots":["Booster T2"],"technologies":["Jetson Thor T5000","2070 TFLOPS onboard compute"],"marketInsights":["$29,900-$44,900 pricing","Developer/education market focus"],"keyPoints":["140cm / 43kg / 31 DOF / 140Nm","10kg dual-arm payload","Claimed most powerful bipedal onboard compute"],"summaryKo":"부스터 로보틱스가 플래그십 개발 플랫폼 T2 출시. 상위 T2 Pro는 젯슨 Thor T5000(최대 2,070 TFLOPS) 탑재로 이족보행 최고 수준 온보드 연산력 주장. 가격 2만9,900~4만4,900달러."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('booster-t2-jetson-thor-launch-2026-07'));

-- [Booster] RoboCup 2026 휴머노이드 전 종목 석권 (B, 2026-07-09)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Booster Robotics%' LIMIT 1),
  'Booster Robotics Humanoids Sweep All Championship Titles at RoboCup 2026',
  'GlobeNewswire / Booster Robotics Official',
  'https://www.globenewswire.com/news-release/2026/07/09/3324576/0/en/booster-robotics-humanoid-robots-claim-all-championship-titles-at-robocup-2026.html',
  '2026-07-09'::timestamp,
  'Teams running Booster humanoid platforms won every championship title in the humanoid soccer competitions at RoboCup 2026, underlining Booster position as dominant hardware supplier for humanoid soccer research — a niche cultivated with the T1 competition robot and sub-$10K K1 education robot. Days before flagship T2 launch.',
  'Booster Robotics announced on July 9, 2026 that teams running its humanoid platforms won every championship title in the humanoid soccer competitions at RoboCup 2026. The sweep underlines Booster position as the dominant hardware supplier for humanoid robot soccer research, a niche it has cultivated with the T1 competition robot and sub-$10K K1 education robot. The result is a marketing and ecosystem win days before the company launched its flagship T2 platform.',
  'en', 'technology', 'robot',
  md5('booster-robocup-2026-sweep-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Booster Robotics"],"mentionedRobots":["Booster T1","Booster K1"],"technologies":["humanoid soccer"],"marketInsights":["Dominant in research/education humanoid niche","Sub-$10K K1 education robot"],"keyPoints":["All RoboCup 2026 humanoid soccer titles won on Booster platforms"],"summaryKo":"부스터 플랫폼 기반 팀들이 로보컵 2026 휴머노이드 축구 전 종목 우승 석권. 연구·교육용 휴머노이드 시장 지배력 입증."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('booster-robocup-2026-sweep-2026-07'));

-- [CATL/Galbot] 글로벌 전략 협약 — 중량물 휴머노이드 S1 배터리 라인 상시 운영 (A, 2026-07-05)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Galbot%' LIMIT 1),
  'CATL and Galbot Sign Global Strategic Pact — Heavy-Duty S1 Humanoid in Regular Operation on Battery Lines',
  'Gasgoo / CATL Official',
  'https://autonews.gasgoo.com/articles/other/galbots-galbot-s1-begins-operations-at-catls-factory-2070399392245612544',
  '2026-07-05'::timestamp,
  'CATL and Galbot signed a global strategic cooperation agreement July 5 covering smart-manufacturing line upgrades, global humanoid deployment scale-up, and the first aftermarket service standard for AI humanoids (CATL NING service network extends to humanoids). Galbot S1 — first heavy-duty humanoid in regular operation powered by CATL batteries — features 50kg dual-arm payload, vision-only cm-level positioning, 360-degree obstacle avoidance. S1 units working CATL module/pack lines replacing high-intensity handling.',
  'On July 5, 2026, CATL and Galbot signed a global strategic cooperation agreement covering smart-manufacturing line upgrades, global scale-up of humanoid deployment, and creation of the worlds first aftermarket service standard for AI humanoid robots, with CATL NING service network extending to humanoids. The Galbot S1, billed as the first heavy-duty humanoid in regular operation powered by CATL batteries, features 50kg dual-arm payload, vision-only centimeter-level positioning and 360-degree obstacle avoidance. S1 units are working CATL module and pack production lines, replacing workers in high-intensity handling and picking processes; the deal follows a June scale-up agreement at the Ningde plant.',
  'en', 'industry', 'robot',
  md5('catl-galbot-s1-strategic-agreement-2026-07'),
  '{"confidence":"A","mentionedCompanies":["CATL","Galbot"],"mentionedRobots":["Galbot S1"],"technologies":["vision-only positioning","360-degree obstacle avoidance"],"marketInsights":["First humanoid aftermarket service standard","CATL NING service network for humanoids","50kg dual-arm payload heavy-duty class"],"keyPoints":["Regular operation on CATL module/pack lines","Follows June Ningde scale-up agreement"],"summaryKo":"CATL과 갤봇이 글로벌 전략 협약 체결 — 스마트 제조라인 업그레이드, 휴머노이드 대규모 확산, 세계 최초 휴머노이드 애프터마켓 서비스 표준 수립. 양팔 50kg 가반하중 S1이 CATL 모듈·팩 라인에서 상시 운영 중."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('catl-galbot-s1-strategic-agreement-2026-07'));

-- [UBTech] UWORLD U1 출시 + Walker S2 수백 대 양산 인도 개시 (A, 2026-06-30)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%UBTECH%' OR name ILIKE '%UBTech%' LIMIT 1),
  'UBTech Launches UWORLD U1 Ultra-Bionic Consumer Humanoid Line; Walker S2 Begins Several-Hundred-Unit Delivery',
  'PR Newswire / UBTech Official',
  'https://www.prnewswire.com/apac/news-releases/ubtech-launches-uworld-u1-the-worlds-first-full-size-mass-produced-ultra-bionic-humanoid-robot-302815280.html',
  '2026-06-30'::timestamp,
  'At its 2026 Global Launch Event in Shenzhen June 30, UBTech unveiled UWORLD U1 Series — claimed first full-size mass-produced ultra-bionic humanoid for consumer/commercial interaction. Simultaneously confirmed mass production and delivery start of first batch of several hundred Walker S2 industrial humanoids, following 1.4B+ yuan (~$200M) cumulative humanoid orders in 2025 (claimed global #1). Walker S2 deployments span automotive, 3C, logistics, semiconductor, aerospace (Airbus).',
  'At its 2026 Global Launch Event in Shenzhen on June 30, UBTech unveiled the UWORLD U1 Series, claimed as the worlds first full-size mass-produced ultra-bionic humanoid aimed at consumer and commercial interaction scenarios. Simultaneously, UBTech confirmed it has begun mass production and delivery of the first batch of several hundred Walker S2 full-size industrial humanoids, following cumulative humanoid orders exceeding 1.4 billion yuan (~$200M) in 2025 — which it says ranked first globally. Walker S2 industrial deployments span automotive, 3C electronics, logistics, semiconductor, and (since the January Airbus deal) aerospace manufacturing.',
  'en', 'product', 'robot',
  md5('ubtech-uworld-u1-launch-walker-s2-delivery-2026-06'),
  '{"confidence":"A","mentionedCompanies":["UBTech Robotics","Airbus"],"mentionedRobots":["UWORLD U1","Walker S2"],"technologies":["ultra-bionic design"],"marketInsights":["1.4B+ yuan 2025 humanoid orders (claimed #1)","Several-hundred-unit Walker S2 first batch","Consumer interaction humanoid segment entry"],"keyPoints":["UWORLD U1 claimed first mass-produced ultra-bionic full-size humanoid","Walker S2 in auto/3C/logistics/semiconductor/aerospace"],"summaryKo":"유비테크가 선전 행사에서 소비자·상업 인터랙션용 풀사이즈 양산형 휴머노이드 UWORLD U1 공개. 동시에 산업용 Walker S2 수백 대 첫 양산 인도 개시. 2025년 휴머노이드 수주 14억 위안 이상으로 세계 1위 주장."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('ubtech-uworld-u1-launch-walker-s2-delivery-2026-06'));

-- [AI2 Robotics] $735M 조달, 기업가치 $2.8B — 휠베이스 알파봇 (A, 2026-06-29)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%AI2 Robotics%' OR name ILIKE '%AI Squared%' LIMIT 1),
  'AI2 Robotics Raises $735M at ~$2.8B Valuation for Wheeled Humanoids and Alpha Brain Foundation Model',
  'The Robot Report',
  'https://www.therobotreport.com/ai%C2%B2-robotics-raises-735m-3b-valuation-wheeled-humanoid-robots/',
  '2026-06-29'::timestamp,
  'Chinese startup AI2 Robotics raised ~$735M across recent rounds, valuation past 50B RMB (~$2.8B) — one of the largest humanoid rounds in China this year. Builds AlphaBot wheeled humanoid powered by its Alpha Brain foundation model, trading bipedal locomotion for mechanical simplicity and uptime in manufacturing/logistics. Backers include National SME Development Fund, Sino Biopharmaceutical, Moutai Group, CICC Capital, GSR Ventures.',
  'Chinese startup AI2 Robotics raised approximately $735M across recent rounds, lifting its valuation past 50 billion RMB (~$2.8B) and making it one of the largest humanoid rounds in China this year. The company builds the AlphaBot wheeled humanoid powered by its Alpha Brain foundation model, trading bipedal locomotion for mechanical simplicity and uptime in manufacturing and logistics. Backers include Chinas National SME Development Fund, Sino Biopharmaceutical, Moutai Group, CICC Capital and GSR Ventures. The raise puts AI2 among the top-funded pure-play humanoid firms globally behind Figure AI.',
  'en', 'industry', 'robot',
  md5('ai2-robotics-735m-alphabot-2026-06'),
  '{"confidence":"A","mentionedCompanies":["AI2 Robotics","CICC Capital","GSR Ventures","Moutai Group"],"mentionedRobots":["AlphaBot"],"technologies":["Alpha Brain foundation model","wheeled humanoid"],"marketInsights":["$735M raised, ~$2.8B valuation","Top-funded pure-play humanoid behind Figure"],"keyPoints":["Wheeled design for uptime over bipedal","State-backed funds participating"],"summaryKo":"중국 AI2 로보틱스가 약 7억3,500만 달러 조달로 기업가치 500억 위안(28억 달러) 돌파. 자체 파운데이션 모델 알파 브레인 탑재 휠베이스 휴머노이드 알파봇으로 제조·물류 공략."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('ai2-robotics-735m-alphabot-2026-06'));

-- [X Square Robot] 4연속 라운드로 $2.8B 밸류 — WALL-OSS 오픈소스 (A, 2026-06-29)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%X Square%' LIMIT 1),
  'X Square Robot Tops $2.8B Valuation After Four Straight Rounds; Open-Sources WALL-OSS-0.5 and WALL-WM',
  'PR Newswire / X Square Robot Official',
  'https://www.prnewswire.com/apac/news-releases/x-square-robot-secures-four-consecutive-financing-rounds-surpasses-us2-8-billion-valuation-in-push-for-physical-ai-foundation-models-302813098.html',
  '2026-06-29'::timestamp,
  'Shenzhen-based X Square Robot announced four consecutive financing rounds through Series C, valuation above $2.8B (RMB 20B). Develops physical-AI foundation models on a World Unified Model architecture: WALL-B (April 2026) trains perception, language, action and physical prediction in one network. Open-sourced WALL-OSS-0.5 and world model WALL-WM; reports 80%+ autonomous completion on some real-robot tasks without post-training. Investors include IDG, HongShan, Xiaomi, Meituan, Alibaba, ByteDance.',
  'On June 29, 2026, Shenzhen-based X Square Robot announced four consecutive financing rounds through a Series C, pushing its valuation above $2.8B (RMB 20B). The company develops physical-AI foundation models on a World Unified Model architecture: WALL-B (introduced April 2026) trains perception, language, action and physical prediction in one network, and it has open-sourced WALL-OSS-0.5 and world model WALL-WM, reporting over 80% autonomous completion on some real-robot tasks without post-training. Investors across rounds include IDG, HongShan, Xiaomi, Meituan, Alibaba and ByteDance.',
  'en', 'technology', 'robot',
  md5('x-square-robot-2-8b-wall-oss-2026-06'),
  '{"confidence":"A","mentionedCompanies":["X Square Robot","IDG","HongShan","Xiaomi","Meituan","Alibaba","ByteDance"],"mentionedRobots":["WALL-B"],"technologies":["World Unified Model","WALL-OSS-0.5","WALL-WM world model"],"marketInsights":["$2.8B valuation after 4 straight rounds","Big-tech strategic investors"],"keyPoints":["80%+ autonomous completion without post-training claimed","Open-source foundation model strategy"],"summaryKo":"선전 X스퀘어 로봇이 시리즈C까지 4연속 조달로 기업가치 28억 달러 돌파. 통합 월드모델 기반 WALL-B 공개, WALL-OSS-0.5와 월드모델 WALL-WM 오픈소스화. 샤오미·알리바바·바이트댄스 등 투자."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('x-square-robot-2-8b-wall-oss-2026-06'));

-- [Neura Robotics] Tether 주도 최대 $1.4B 라운드 — 유럽 최대 (A, 2026-06-10)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Neura%' LIMIT 1),
  'Neura Robotics Raises Up to $1.4B Led by Tether at ~$7B Valuation — Europe Biggest Humanoid Bet',
  'CNBC',
  'https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html',
  '2026-06-10'::timestamp,
  'Germany Neura Robotics announced financing of up to $1.4B led by stablecoin issuer Tether, valuing the company ~$7B — the largest round yet for a European humanoid maker. Targets 4NE1 household/industrial humanoid deliveries from late 2026 and is building the Neuraverse robot app ecosystem. Positions Neura as flag-bearer for European sovereignty in humanoid robotics.',
  'Germanys Neura Robotics announced on June 10, 2026 a financing of up to $1.4B led by stablecoin issuer Tether, valuing the company around $7B — the largest round yet for a European humanoid maker. CNBC reported involvement and backing interest from Amazon and Nvidia ecosystems, and the round dwarfs prior European robotics financings. Neura targets deliveries of its 4NE1 household and industrial humanoid starting late 2026 and is building out its Neuraverse robot app ecosystem. The deal makes Neura the flag-bearer for European sovereignty in humanoid robotics.',
  'en', 'industry', 'robot',
  md5('neura-robotics-1-4b-tether-round-2026-06'),
  '{"confidence":"A","mentionedCompanies":["Neura Robotics","Tether","Amazon","NVIDIA"],"mentionedRobots":["4NE1"],"technologies":["Neuraverse app ecosystem"],"marketInsights":["Up to $1.4B at ~$7B valuation","Largest European humanoid round"],"keyPoints":["4NE1 deliveries from late 2026","European sovereignty narrative"],"summaryKo":"독일 뉴라 로보틱스가 테더 주도 최대 14억 달러 라운드 발표(기업가치 약 70억 달러) — 유럽 휴머노이드 사상 최대. 4NE1 휴머노이드를 2026년 말부터 인도 계획."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('neura-robotics-1-4b-tether-round-2026-06'));

-- [NVIDIA/Unitree] Isaac GR00T 레퍼런스 휴머노이드로 H2 Plus 선정 (A, 2026-06-01)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'NVIDIA Names Unitree H2 Plus as Isaac GR00T Open Reference Humanoid for Research',
  'NVIDIA Newsroom Official',
  'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
  '2026-06-01'::timestamp,
  'At Computex June 1, NVIDIA announced the Isaac GR00T Reference Humanoid Robot — an open reference design for academic research — with Unitree newly unveiled H2 Plus as first hardware, shipping late 2026. Pairs Unitree 182cm H2 line (base $29,900) with Jetson compute and GR00T foundation-model stack for a standardized full-stack research humanoid. Announced the same day CSRC cleared Unitree STAR Market IPO.',
  'At Computex on June 1, 2026, NVIDIA announced the Isaac GR00T Reference Humanoid Robot — an open reference design for academic research — with Unitrees newly unveiled H2 Plus as the first hardware, shipping late 2026. The platform pairs Unitrees 182cm H2 humanoid line (base model $29,900) with NVIDIAs Jetson compute and GR00T foundation-model stack, giving researchers a standardized full-stack humanoid. The endorsement landed the same day Chinas CSRC cleared Unitrees STAR Market IPO, reinforcing Unitrees position as the default research humanoid vendor.',
  'en', 'technology', 'robot',
  md5('nvidia-unitree-h2plus-gr00t-reference-2026-06'),
  '{"confidence":"A","mentionedCompanies":["NVIDIA","Unitree Robotics"],"mentionedRobots":["H2 Plus","H2"],"technologies":["Isaac GR00T","Jetson","reference design"],"marketInsights":["Standardized full-stack research humanoid","H2 base $29,900","Late 2026 shipping"],"keyPoints":["First hardware for GR00T open reference design","Reinforces Unitree as default research vendor"],"summaryKo":"엔비디아가 컴퓨텍스에서 유니트리 H2 Plus를 첫 하드웨어로 하는 아이작 GR00T 레퍼런스 휴머노이드(연구용 개방형 표준 플랫폼) 발표. 젯슨 컴퓨팅과 GR00T 파운데이션 모델 통합, 2026년 말 출시."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('nvidia-unitree-h2plus-gr00t-reference-2026-06'));

-- [Rainbow Robotics] RB-Y1 쿠팡 물류센터 실증 — 한국 최초 상업 물류 휴머노이드 (B, 2026-06-15)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Rainbow%' LIMIT 1),
  'Samsung-Controlled Rainbow Robotics Starts RB-Y1 Trial in Coupang Fulfillment Center — Korea First Commercial Humanoid Warehouse Pilot',
  'Interesting Engineering / Korea media',
  'https://interestingengineering.com/ai-robotics/samsung-backed-robot-enters-coupang-warehouse',
  '2026-06-15'::timestamp,
  'Rainbow Robotics dual-arm wheeled humanoid RB-Y1 began testing inside a Coupang fulfillment center in mid-June — South Korea first commercial warehouse trial of a humanoid-class robot. Coupang evaluating sorting, transport, goods handling at production pace. Samsung raised its Rainbow stake to ~35% (largest shareholder), co-developing physical-AI engines, targeting humanoid commercialization by 2028. Key proof point for K-Humanoid push.',
  'In mid-June 2026, Rainbow Robotics dual-arm wheeled humanoid RB-Y1 began testing inside a Coupang fulfillment center, South Koreas first commercial warehouse trial of a humanoid-class robot. Coupang is evaluating whether the RB-Y1 can reliably sort, transport and handle goods at production pace. Samsung Electronics, which raised its Rainbow stake to about 35% to become the largest shareholder, is co-developing physical-AI engines with Rainbow and targets humanoid commercialization by 2028. The pilot is a key proof point for Koreas K-Humanoid push.',
  'en', 'product', 'robot',
  md5('rainbow-rby1-coupang-warehouse-trial-2026-06'),
  '{"confidence":"B","mentionedCompanies":["Rainbow Robotics","Samsung","Coupang"],"mentionedRobots":["RB-Y1"],"technologies":["dual-arm wheeled humanoid"],"marketInsights":["Korea first commercial humanoid warehouse pilot","Samsung ~35% largest shareholder","2028 commercialization target"],"keyPoints":["Sorting/transport/handling evaluation at production pace","K-Humanoid initiative proof point"],"summaryKo":"삼성전자가 최대주주(약 35%)인 레인보우로보틱스의 양팔 휠베이스 RB-Y1이 쿠팡 물류센터에서 분류·운반 실증 개시 — 한국 최초 상업 물류 휴머노이드 실증. 삼성은 2028년 휴머노이드 상용화 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('rainbow-rby1-coupang-warehouse-trial-2026-06'));

-- [LG전자] CEO 직속 로보틱스사업센터 신설 — AXIUM 액추에이터 공급망 진입 (B, 2026-06-30)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%LG Electronics%' OR name = 'LG' LIMIT 1),
  'LG Creates CEO-Level Robotics Business Center, Pushes AXIUM Actuators Into Humanoid Supply Chain',
  'The Korea Herald / TechTimes',
  'https://www.koreaherald.com/article/10808594',
  '2026-06-30'::timestamp,
  'LG Electronics announced a Robotics Business Center reporting directly to CEO Ryu Jae-cheol, effective July 1, consolidating robotics business development, supply chain and manufacturing into one commercialization-focused organization. Preparing domestic in-house production of robot actuators under the AXIUM brand (introduced with CES 2026 home humanoid CLOiD) and plans external actuator sales to other robot makers — positioning LG as both humanoid OEM and components supplier.',
  'LG Electronics announced June 30, 2026 a Robotics Business Center reporting directly to CEO Ryu Jae-cheol, effective July 1, consolidating robotics business development, supply chain and manufacturing into one commercialization-focused organization. LG is preparing domestic in-house production of robot actuators under the AXIUM brand it introduced alongside its CES 2026 home humanoid CLOiD, and plans to sell actuators externally to other robot makers. The move positions LG as both a humanoid OEM and a components supplier in the emerging humanoid supply chain.',
  'en', 'industry', 'robot',
  md5('lg-robotics-business-center-axium-2026-06'),
  '{"confidence":"B","mentionedCompanies":["LG Electronics"],"mentionedRobots":["CLOiD"],"technologies":["AXIUM actuators"],"marketInsights":["CEO-direct robotics organization","External actuator sales planned","OEM + components dual strategy"],"keyPoints":["Robotics Business Center effective July 1","Domestic in-house actuator production preparation"],"summaryKo":"LG전자가 CEO 직속 로보틱스사업센터 신설(7월 1일부)로 로봇 사업 상용화 체제 전환. CLOiD와 함께 공개한 AXIUM 액추에이터의 국내 자체 생산 및 외부 판매 추진으로 휴머노이드 부품 공급망 진입."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('lg-robotics-business-center-axium-2026-06'));

-- [Sanctuary AI] 하드웨어 → 하드웨어 불문 Physical AI 소프트웨어 전환 (B, 2026-06-17)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Sanctuary%' LIMIT 1),
  'Sanctuary AI Pivots From Humanoid Hardware to Hardware-Agnostic Physical AI Software',
  'Techcouver',
  'https://techcouver.com/2026/06/17/sanctuary-ai-evolves-model-software-robotics-platforms/',
  '2026-06-17'::timestamp,
  'Sanctuary AI confirmed an evolution of its business model: rather than scaling its own Phoenix humanoid hardware, it will deploy its Physical AI control software — including tactile-sensing and teleoperation-derived manipulation stack — on existing commercial robot platforms from other vendors. Frames hardware-agnostic approach as faster route to industrial adoption. Positions Sanctuary against foundation-model players like Skild AI and Physical Intelligence rather than robot OEMs.',
  'Sanctuary AI confirmed in mid-June 2026 an evolution of its business model: rather than scaling its own Phoenix humanoid hardware, it will deploy its Physical AI control software — including its tactile-sensing and teleoperation-derived manipulation stack — on existing commercial robot platforms from other vendors. The company frames the hardware-agnostic approach as a faster route to industrial adoption while retaining the option to power future industrial humanoids. It follows leadership changes and positions Sanctuary against foundation-model players like Skild AI and Physical Intelligence rather than robot OEMs.',
  'en', 'technology', 'robot',
  md5('sanctuary-ai-software-pivot-2026-06'),
  '{"confidence":"B","mentionedCompanies":["Sanctuary AI","Skild AI","Physical Intelligence"],"mentionedRobots":["Phoenix"],"technologies":["tactile sensing","teleoperation-derived manipulation"],"marketInsights":["Hardware-agnostic software strategy","Competing with foundation-model labs now"],"keyPoints":["No longer scaling own Phoenix hardware","Software deployed on third-party platforms"],"summaryKo":"생추어리 AI가 자체 휴머노이드 피닉스 하드웨어 확장 대신 촉각 기반 조작 소프트웨어를 타사 상용 플랫폼에 탑재하는 하드웨어 불문 피지컬 AI 소프트웨어 기업으로 전환."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('sanctuary-ai-software-pivot-2026-06'));

-- [Proception] $11M 시드 + 텐던 구동 ProHand 1.0 공개 (B, 2026-06-29)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Proception%' LIMIT 1),
  'Proception Raises $11M Seed and Unveils Tendon-Driven ProHand 1.0 Dexterous Robotic Hand',
  'The AI Insider',
  'https://theaiinsider.tech/2026/06/29/proception-raises-11m-in-seed-funding-introduces-dexterous-robotic-hand/',
  '2026-06-29'::timestamp,
  'US startup Proception announced $11M seed round alongside ProHand 1.0, a dexterous robotic hand for humanoids. Tendon-driven design — motors pulling cables like human muscles — keeps fingers light and compact, with multiple joints per finger and skin-like tactile sensors detecting contact during gripping. Developed in consultation with hand surgeons. Adds to 2026 investment wave in hands/tactile sensing (Kirisense, ViTai, Contactile) — the bottleneck for practical humanoid manipulation.',
  'US startup Proception announced an $11M seed round on June 29, 2026 alongside ProHand 1.0, a dexterous robotic hand for humanoids and other robots. ProHand uses a tendon-driven design — motors pulling cables like human muscles and tendons — keeping fingers light and compact, with multiple joints per finger and skin-like tactile sensors that detect contact during gripping. The design was developed in consultation with hand surgeons. The raise adds to a wave of 2026 investment in hands and tactile sensing (Kirisense, ViTai Robotics, Contactile), widely seen as the bottleneck for practical humanoid manipulation.',
  'en', 'technology', 'component',
  md5('proception-prohand-11m-seed-2026-06'),
  '{"confidence":"B","mentionedCompanies":["Proception","Kirisense","ViTai Robotics","Contactile"],"mentionedRobots":["ProHand 1.0"],"technologies":["tendon-driven hand","skin-like tactile sensors"],"marketInsights":["$11M seed","Hands/tactile is 2026 investment hotspot"],"keyPoints":["Designed with hand surgeons","Hands seen as humanoid manipulation bottleneck"],"summaryKo":"미국 프로셉션이 1,100만 달러 시드 투자와 함께 힘줄 구동식 정밀 로봇 손 ProHand 1.0 공개. 손 외과의와 공동 설계, 피부형 촉각 센서 탑재. 손·촉각 분야 투자 열풍의 일환."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('proception-prohand-11m-seed-2026-06'));

-- [Tesollo] 시리즈B 후 IPO 착수 — 세계 첫 휴머노이드 핸드 상장사 도전 (A, 2026-07-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesollo%' LIMIT 1),
  'Korean Robot-Hand Maker Tesollo Starts IPO Process After Series B — Aiming to Be First Listed Humanoid-Hand Company',
  'The Robot Report',
  'https://www.therobotreport.com/tesollo-initiates-ipo-process-developing-humanoid-hands/',
  '2026-07-07'::timestamp,
  'Tesollo, the South Korean dexterous robotic hand specialist, initiated IPO proceedings in early July after closing Series B. DG-5F five-finger hand has 20 independently driven joints; newer DG-5F-S uses proprietary in-house actuators to weigh under 1kg at ~60% of predecessor cost. Founded 2019, exports to 19 countries; overseas sales recently surpassed domestic. Listing would make it the first humanoid hand-focused public company.',
  'Tesollo, the South Korean dexterous robotic hand specialist, initiated IPO proceedings in early July 2026 after closing its Series B. Its DG-5F five-finger hand has 20 independently driven joints, and the newer DG-5F-S uses proprietary in-house actuators to weigh under 1kg at roughly 60% of its predecessors cost. Founded in 2019, Tesollo has exported to 19 countries and its overseas sales recently surpassed domestic sales, with customers across the US, China and Japan. A listing would make it the first humanoid hand-focused company to go public.',
  'en', 'industry', 'component',
  md5('tesollo-robot-hand-ipo-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Tesollo"],"mentionedRobots":["DG-5F","DG-5F-S"],"technologies":["20 independently driven joints","in-house hand actuators"],"marketInsights":["First humanoid-hand IPO candidate","19-country exports, overseas > domestic sales","DG-5F-S under 1kg at 60% cost"],"keyPoints":["IPO process initiated after Series B","US/China/Japan customer base"],"summaryKo":"한국 로봇 손 전문기업 테솔로가 시리즈B 마감 후 IPO 절차 착수. 20개 독립 관절의 DG-5F와 1kg 미만·원가 60% 수준의 DG-5F-S 보유, 19개국 수출로 해외 매출이 국내 추월. 상장 시 세계 첫 휴머노이드 손 전문 상장사."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesollo-robot-hand-ipo-2026-07'));

-- [Physical Intelligence] pi 0.7 — 조합적 일반화 (B, 2026-04-16, 미커버 갭 보강)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Physical Intelligence%' LIMIT 1),
  'Physical Intelligence pi-0.7 Claims Compositional Generalization — a GPT-3 Moment for Robot Dexterity',
  'Physical Intelligence Official Blog / Humanoids Daily',
  'https://www.humanoidsdaily.com/news/physical-intelligence-unveils-0-7-the-rise-of-compositional-generalization-in-robotics',
  '2026-04-16'::timestamp,
  'Physical Intelligence released pi-0.7, a vision-language-action model positioned as a step-change toward compositional generalization: combining learned skills to complete novel multi-step manipulation tasks (screw installation, pinwheel assembly) rather than merely imitating demonstrations. Builds on pi-star-0.6 RECAP method (RL with Experience and Corrections via Advantage-conditioned Policies) that lets policies learn from own successes/failures. PI is a top-3 robot foundation-model lab (backers: Jeff Bezos, OpenAI, Thrive, CapitalG).',
  'Physical Intelligence released pi-0.7 on April 16, 2026, a vision-language-action model the company positions as a step-change toward compositional generalization: combining learned skills to complete novel multi-step manipulation tasks (e.g., screw installation, pinwheel assembly) rather than merely imitating demonstrations. It builds on pi-star-0.6 RECAP method (RL with Experience and Corrections via Advantage-conditioned Policies), which lets policies learn from their own successes and failures to raise real-world success rates and throughput. PI is a top-3 robot foundation-model lab whose backers include Jeff Bezos, OpenAI, Thrive and CapitalG.',
  'en', 'technology', 'robot',
  md5('physical-intelligence-pi07-compositional-2026-04'),
  '{"confidence":"B","mentionedCompanies":["Physical Intelligence","OpenAI"],"mentionedRobots":[],"technologies":["pi-0.7 VLA","RECAP reinforcement learning","compositional generalization"],"marketInsights":["Top-3 robot foundation model lab","Bezos/OpenAI/Thrive/CapitalG backing"],"keyPoints":["Novel multi-step task composition beyond imitation","Learns from own successes and failures"],"summaryKo":"피지컬 인텔리전스의 VLA 모델 pi-0.7은 학습된 스킬을 조합해 새로운 다단계 조작 과제를 수행하는 조합적 일반화를 구현했다고 주장. 실패 경험에서 학습하는 RECAP 강화학습 기반, 로봇 파운데이션 모델 경쟁의 핵심 이정표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('physical-intelligence-pi07-compositional-2026-04'));

-- [Samsung] Shallow-pi 로봇 제어 AI — 연산 1/3, 판단속도 2배 (B, 2026-04-12, 미커버 갭 보강)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Samsung%' LIMIT 1),
  'Samsung Unveils Shallow-pi Robot Control AI: 2x Faster Decisions at One-Third the Compute',
  'Seoul Economic Daily / Samsung Research',
  'https://en.sedaily.com/news/2026/04/12/samsung-secures-humanoid-robot-brain-tech-17-decisions-per',
  '2026-04-12'::timestamp,
  'Samsung Research announced Shallow-pi, a knowledge-distillation technique compressing large robot-control AI models: computation cut to ~1/3 while situational decision speed more than doubled from 8Hz to 17.2Hz. Achieved 95% success on sub-1mm precision water-hose insertion; runs a single end-to-end VLA validated on Jetson Orin and Jetson Thor. Underpins Samsung roadmap to AI-autonomous factories by 2030 and 2028 humanoid commercialization target with Rainbow Robotics.',
  'Samsung Research announced Shallow-pi in April 2026, a knowledge-distillation technique that compresses large robot-control AI models, cutting computation to about one-third while more than doubling situational decision speed from 8Hz to 17.2Hz. It achieved a 95% success rate on a sub-1mm precision water-hose insertion task and runs a single end-to-end VLA model validated on NVIDIA Jetson Orin and Jetson Thor. The tech underpins Samsungs roadmap to fully AI-autonomous factories by 2030 and its 2028 humanoid commercialization target with Rainbow Robotics.',
  'en', 'technology', 'robot',
  md5('samsung-shallow-pi-robot-brain-2026-04'),
  '{"confidence":"B","mentionedCompanies":["Samsung","Rainbow Robotics","NVIDIA"],"mentionedRobots":[],"technologies":["Shallow-pi knowledge distillation","end-to-end VLA","Jetson Orin/Thor"],"marketInsights":["2030 AI-autonomous factory roadmap","2028 humanoid commercialization target"],"keyPoints":["8Hz to 17.2Hz decision speed","95% success on sub-1mm insertion task"],"summaryKo":"삼성리서치의 Shallow-pi는 지식 증류로 로봇 제어 AI 연산량을 1/3로 줄이면서 판단 속도를 8Hz에서 17.2Hz로 2배 이상 향상. 1mm 이하 정밀 삽입 작업 95% 성공률. 2030년 AI 자율공장 로드맵의 핵심 기술."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('samsung-shallow-pi-robot-brain-2026-04'));

-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림 — 핵심 5건)
-- ============================================================

-- [CRITICAL] XPeng IRON 2.0 연말 양산 — 유럽 진출 신호
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%IRON%' LIMIT 1),
  'mass_production', 'critical',
  '[XPeng] IRON 2.0 뮌헨 유럽 데뷔 — 연말 양산·월 1,000대 생산능력 재확인, 2027 Q1 상용 투입',
  'XPeng이 7/17 뮌헨 행사에서 IRON 2.0(173cm, 65kg, 82 DOF)을 유럽 최초 공개. 2026년 말 양산, 월 1,000대+ 생산능력, 2027년 1분기 중국 리테일 안내 로봇 투입 후 글로벌 확대 계획. EV 업체의 휴머노이드 유럽 진출 첫 사례.',
  '{"source":"Forbes/XPeng Official","confidence":"A","date":"2026-07-18","production":"mass production by end-2026","capacity":"1,000+ units/month","first_deployment":"retail guides China Q1 2027"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%IRON 2.0%뮌헨%' AND created_at > '2026-07-01'::timestamp
);

-- [CRITICAL] Mitsubishi-Highlanders 교토 양산 — 일본 자동차 업계 첫 휴머노이드 양산
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  NULL,
  'mass_production', 'critical',
  '[Mitsubishi Motors] 교토 엔진공장에서 Highlanders 휴머노이드 양산 — 2027년 초, 월 1,000대 목표',
  '미쓰비시자동차가 도쿄대 스타트업 Highlanders와 MOU. 교토 엔진공장 유휴 건물에서 2027년 초부터 휴머노이드 양산 추진(월 1,000대 목표 보도). 일본 자동차 제조사 최초의 휴머노이드 양산 협력. 자사 공장 우선 투입으로 운영 데이터 축적 전략.',
  '{"source":"Mitsubishi Motors Official","confidence":"A","date":"2026-07-09","site":"Kyoto engine plant","target":"~1,000 units/month","timeline":"early 2027"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Mitsubishi%Highlanders%' AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] UBTech Walker S2 수백 대 인도 개시
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Walker%' LIMIT 1),
  'mass_production', 'warning',
  '[UBTech] Walker S2 수백 대 규모 첫 양산 인도 개시 + 소비자용 UWORLD U1 라인 공개',
  'UBTech가 6/30 선전 행사에서 산업용 Walker S2 수백 대 첫 양산 인도 개시 발표. 2025년 휴머노이드 수주 14억 위안+(세계 1위 주장). 동시에 소비자·상업 인터랙션용 풀사이즈 양산형 UWORLD U1 시리즈 공개로 B2C 시장 진입.',
  '{"source":"PR Newswire/UBTech Official","confidence":"A","date":"2026-06-30","delivery":"several hundred Walker S2","orders_2025":"1.4B+ yuan","new_line":"UWORLD U1 consumer"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Walker S2%수백 대%' AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Neura $1.4B — 유럽 최대 휴머노이드 투자
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  NULL,
  'funding', 'warning',
  '[Neura Robotics] Tether 주도 최대 $1.4B 조달 (기업가치 ~$7B) — 유럽 휴머노이드 사상 최대',
  '독일 Neura Robotics가 6/10 테더 주도 최대 14억 달러 라운드 발표. 기업가치 약 70억 달러로 유럽 휴머노이드 최대 규모. 4NE1 가정·산업용 휴머노이드 2026년 말 인도 목표. 유럽 로봇 주권 확보의 상징적 딜.',
  '{"source":"CNBC","confidence":"A","date":"2026-06-10","amount":"up to $1.4B","valuation":"~$7B","lead":"Tether","delivery":"4NE1 late 2026"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Neura%1.4B%' AND created_at > '2026-06-01'::timestamp
);

-- [INFO] LG 로보틱스사업센터 — 자사 조직 변화 (내부 참고)
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  NULL,
  'partnership', 'info',
  '[LG전자] CEO 직속 로보틱스사업센터 신설 (7/1부) — AXIUM 액추에이터 외부 판매 추진',
  'LG전자가 CEO 직속 로보틱스사업센터를 신설해 로봇 사업개발·공급망·제조를 상용화 중심 조직으로 통합. CLOiD와 함께 공개한 AXIUM 액추에이터의 국내 자체 생산과 외부 로봇 업체 판매를 추진, 휴머노이드 OEM + 부품 공급 이중 전략.',
  '{"source":"Korea Herald/TechTimes","confidence":"B","date":"2026-06-30","org":"Robotics Business Center under CEO","brand":"AXIUM actuators","strategy":"OEM + component supplier"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%로보틱스사업센터%' AND created_at > '2026-06-01'::timestamp
);

COMMIT;

-- ============================================================
-- 실행 방법 (Railway):
--   railway run psql $DATABASE_URL -f scripts/ci-update-2026-07-18-global.sql
--   또는 psql "$DATABASE_URL" -f scripts/ci-update-2026-07-18-global.sql
-- 재실행 안전: content_hash / NOT EXISTS 가드로 중복 삽입 방지
-- ============================================================
