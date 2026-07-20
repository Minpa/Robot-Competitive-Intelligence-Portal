-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-20
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트)
--    content_hash 기반 중복 방지
-- ============================================================

-- [Boston Dynamics] Atlas Gen 5 공개 — 복잡도 "거의 1자릿수" 감소 (A, 2026-07-02)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Boston Dynamics Unveils 5th-Gen Atlas: "Almost Order of Magnitude" Simpler — Fewer Parts, Faster Manufacturing, Lower Costs',
  'Forbes / Boston Dynamics Official',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  'BD, 5세대 Atlas 공개. 부품 수 "거의 1자릿수" 감소. 제조 속도 향상, 신뢰성 개선, 비용 대폭 절감. 2026년 전량 배치 완료(Hyundai RMAC + Google DeepMind). 30,000대/년 공장 계획 진행 중. 110파운드 리프트, 7.5피트 리치 유지.',
  'Boston Dynamics unveiled its fifth-generation Atlas humanoid robot in July 2026, featuring an "almost order of magnitude" reduction in complexity compared to previous versions. The redesign translates to fewer parts, faster manufacturing, enhanced reliability, and significantly lower production costs. The company aims to make Atlas commercially viable at scale. All 2026 Atlas deployments are fully committed, with fleets shipping to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Hyundai announced a $26 billion U.S. investment including plans for a robotics factory capable of producing 30,000 robots per year. Atlas maintains its industrial capabilities: 110-pound lift capacity, approximately 7.5-foot reach, designed for material handling and order fulfillment.',
  'en', 'product', 'robot',
  md5('bd-atlas-gen5-magnitude-simpler-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas","Atlas Gen 5"],"technologies":["complexity reduction","modular manufacturing"],"marketInsights":["Almost order of magnitude fewer parts","2026 fleet fully committed","30,000/yr factory planned","$26B Hyundai US investment"],"keyPoints":["5th generation Atlas unveiled July 2026","Dramatically simpler design for mass production","All 2026 units committed to Hyundai RMAC + Google DeepMind"],"summaryKo":"BD, 5세대 Atlas 공개. 부품 수 거의 1자릿수 감소로 제조 비용·시간 대폭 절감. 2026년 전 물량 Hyundai RMAC 및 Google DeepMind에 배치 완료. 현대차 $26B 미국 투자에 30,000대/년 로봇 공장 포함."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-gen5-magnitude-simpler-2026-07'));

-- [Tesla] Optimus V3 생산 시작 — Musk "초기 생산 극히 느릴 것" (B, 2026-07-03)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Musk Shares Optimus Production Team Photo — Initial Robot Output Will Be "Extremely Slow"',
  'TrendForce / Musk X Post',
  'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
  '2026-07-03'::timestamp,
  'Musk, Optimus V3 생산팀 사진 공유. 초기 생산은 "극히 느릴 것"이라 경고 — 모든 것이 새롭기 때문. Fremont 공장 V3 생산 시작(7-8월). 173cm/57kg/22DOF 손/50개 액추에이터/37관절/1.2m/s 보행. 2026년 전량 내부 사용. $20K-$30K 소비자 가격 장기 목표.',
  'Tesla CEO Elon Musk shared a photo of the Optimus production team in early July 2026, warning that initial robot output will be "extremely slow" because everything involved in production is new. The Fremont factory production line for Optimus V3 is slated to begin slowly in late July or August 2026, converted from the former Model S/X production area with a designed capacity of 1 million units per year. V3 specifications: 173cm tall, 57kg weight, hands with 22 degrees of freedom, 50 actuators total, 37 joints, walking speed of 1.2 m/s. Currently dozens of Optimus robots are performing battery cell sorting, component kitting, and inventory management in Giga Texas. All 2026 units for internal factory use only; consumer target price of $20,000-$30,000 remains a long-term goal.',
  'en', 'product', 'robot',
  md5('tesla-optimus-v3-production-extremely-slow-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus V3"],"technologies":["22DOF hands","50 actuators"],"marketInsights":["Initial production extremely slow","Fremont 1M/yr capacity","Internal use only 2026","$20K-$30K long-term consumer price"],"keyPoints":["V3 production starting July-August at Fremont","173cm/57kg/37 joints/1.2m/s","Currently doing battery sorting at Giga Texas","All 2026 production internal only"],"summaryKo":"Musk, Optimus V3 생산팀 사진 공유. 초기 생산은 극히 느릴 것이라 경고. Fremont 공장 7-8월 V3 생산 개시. 현재 Giga Texas에서 수십 대가 배터리 분류·부품 키팅·재고 관리 수행. 2026년 전량 내부용."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-v3-production-extremely-slow-2026-07'));

-- [Figure AI] BMW Figure 03 배치 확대 + 로봇 vs 인간 경쟁 98.5% (A, 2026-06/07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'BMW Doubles Down on Figure AI: Figure 03 Deployment After Successful Figure 02 Pilot — Robots Now Outnumber Humans at Figure',
  'BMW Group / Figure AI / Forbes',
  'https://www.figure.ai/news',
  '2026-06-30'::timestamp,
  'BMW, Spartanburg SC 공장 Figure 02 성공적 파일럿 후 Figure 03 배치로 확대 발표(6월). Figure AI 직원 600명 대비 로봇 ~740대 운용(6월 말). 5월 라이브스트림: 로봇이 거의 1주간 패키지 논스톱 처리, 10시간 인간 경쟁에서 인간 대비 98.5% 성능 달성. $39B 기업가치(Series C 이후).',
  'BMW Group announced in June 2026 that following a successful deployment of Figure 02 at its Spartanburg, South Carolina plant, it will deploy Figure AI latest Figure 03 robot — marking a major expansion of the partnership. By end of June 2026, Figure AI had approximately 740 robots operating compared to only 600 human employees. In May 2026, Figure AI livestreamed robots processing packages nonstop for almost a week, inspiring a 10-hour competition between robot and human where the robot performed at 98.5% of human capability. The company is valued at approximately $39 billion following its Series C funding round of over $1 billion. The Figure 03, introduced in October 2025, features hardware and software redesign aimed at creating a general-purpose robot able to learn directly from humans.',
  'en', 'product', 'robot',
  md5('figure-ai-bmw-figure03-deployment-expansion-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["general-purpose learning from humans"],"marketInsights":["BMW expanding from Figure 02 to Figure 03","740 robots vs 600 employees at Figure","98.5% human parity in package processing","$39B valuation"],"keyPoints":["BMW Spartanburg deploying Figure 03 after Figure 02 success","740 robots > 600 employees","10-hour human vs robot: 98.5% parity","$39B Series C valuation"],"summaryKo":"BMW, Spartanburg 공장 Figure 02 성공 후 Figure 03 배치 확대. Figure AI 내 로봇(740대)이 직원(600명)을 초과. 10시간 인간 대비 경쟁에서 98.5% 성능 달성. Series C 후 $39B 기업가치."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-bmw-figure03-deployment-expansion-2026-07'));

-- [Unitree] IPO 최종 승인 + 20,000대 생산 목표 + UnifoLM 오픈소스 (A, 2026-Q2)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Targets 20,000 Humanoid Robot Shipments in 2026 — Fourfold Capacity Increase, Humanoid App Store Launched',
  'Interesting Engineering / Forbes / RobotShop',
  'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
  '2026-07-15'::timestamp,
  'Unitree, 2026년 20,000대 휴머노이드 출하 목표(전년 대비 4배 증가). G1 $16,000 가격. UnifoLM-VLA-0 오픈소스 공개(3월). 세계 최초 휴머노이드 로봇 앱스토어 출시. G1 자율 쿵푸 공연(2월), -47°C 야외 테스트 13만보 완주. Morgan Stanley, 중국 2026 판매 전망 28,000대로 2배 상향.',
  'Unitree Robotics is targeting 20,000 humanoid robot shipments in 2026, representing a fourfold increase from previous capacity levels. The G1 humanoid is priced at $16,000. In March 2026, Unitree open-sourced UnifoLM-VLA-0, a Vision-Language-Action model enabling autonomous household tasks via natural language commands. The company also introduced what it describes as the world first Humanoid Robot App Store, signaling a move toward modular, software-driven ecosystems. In February, G1 robots performed fully autonomous kung fu at a televised event and completed 130,000 steps in -47C conditions in Altay snowfields. The H2 education version and A2/R1 models are available for pre-order. Unitree filed for Shanghai STAR Market IPO in March 2026, received CSRC final approval in July in record 104 days. Morgan Stanley doubled its 2026 China humanoid sales forecast to 28,000 units.',
  'en', 'industry', 'robot',
  md5('unitree-20k-target-appstore-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Unitree","Morgan Stanley"],"mentionedRobots":["G1","H2","A2","R1"],"technologies":["UnifoLM-VLA-0","Humanoid App Store"],"marketInsights":["20,000 unit 2026 target","G1 at $16,000","Morgan Stanley doubles China forecast to 28,000","STAR Market IPO record 104-day approval"],"keyPoints":["4x capacity increase targeting 20K units","G1 price $16K","UnifoLM-VLA-0 open-source VLA model","First humanoid robot app store"],"summaryKo":"Unitree, 2026년 20,000대 출하 목표(4배 증가). G1 $16K. UnifoLM-VLA-0 VLA 모델 오픈소스. 세계 최초 휴머노이드 앱스토어 출시. Morgan Stanley 중국 예측 28,000대로 2배 상향."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-20k-target-appstore-2026-07'));

-- [Agility Robotics] $2.5B SPAC 상장 + Foxconn PIPE + 65,000시간 실운영 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics Goes Public at $2.5B Valuation — Foxconn-Led $200M PIPE, 65,000+ Hours Real-World Operation',
  'GeekWire / WWD / Yahoo Finance',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  '2026-07-15'::timestamp,
  'Agility Robotics, $2.5B SPAC 합병으로 미국 최초 휴머노이드 전문 상장사 예정(AGLT). $620M+ 조달: $420M 신탁 + $200M Foxconn PIPE. Digit 실운영 65,000+ 시간(Schaeffler, GXO, Toyota Canada, Mercado Libre). Digit v5 페이로드 50파운드(43% 향상). Q4 2026 거래 완료 예상.',
  'Agility Robotics is set to become the first publicly traded U.S. company dedicated solely to humanoid robots through a SPAC merger with Churchill Capital Corp XI, valued at $2.5 billion. The deal provides more than $620 million: approximately $420 million from Churchill trust and $200 million from a Foxconn-led PIPE investment. Digit robots have logged over 65,000 hours of real-world operation across customers including auto-parts giant Schaeffler, logistics provider GXO, Toyota Motor Manufacturing Canada, and Latin American e-commerce leader Mercado Libre. The next-generation Digit v5 increases payload capacity to 50 pounds, a 43% improvement. Expected to trade on Nasdaq under ticker AGLT with deal close in Q4 2026. Amazon remains an investor but has not announced scaled deployment beyond pilots.',
  'en', 'industry', 'robot',
  md5('agility-spac-25b-foxconn-65k-hours-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Agility Robotics","Churchill Capital","Foxconn","Amazon","Schaeffler","GXO","Toyota","Mercado Libre"],"mentionedRobots":["Digit","Digit v5"],"technologies":["cooperative safety"],"marketInsights":["$2.5B SPAC valuation","$620M+ total proceeds","65,000+ hours real operation","Digit v5 50lb payload (43% increase)"],"keyPoints":["First US humanoid-only public company","$420M trust + $200M Foxconn PIPE","65,000+ hours across 4+ customers","Nasdaq AGLT Q4 2026"],"summaryKo":"Agility, $2.5B SPAC 합병으로 미국 최초 휴머노이드 전문 상장 예정. $620M+ 조달(Foxconn 주도 $200M PIPE). Digit 실운영 65,000+ 시간. v5 페이로드 50lb(43% 향상). Nasdaq AGLT, Q4 2026 완료 예상."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-25b-foxconn-65k-hours-2026-07'));

-- [Apptronik] $935M 시리즈A 마감 + Mercedes-Benz 실배치 + Google DeepMind 협력 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  'Apptronik Closes $935M Series A — Apollo Deployed at Mercedes Berlin & Hungary, Google DeepMind AI Partnership',
  'CNBC / Apptronik Official / Startup Fortune',
  'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
  '2026-07-10'::timestamp,
  'Apptronik, Series A $935M 마감($520M A-X 라운드 포함). $5B 기업가치. 투자자: Google, Mercedes-Benz, B Capital, AT&T Ventures, John Deere, Qatar Investment Authority. Apollo, Mercedes Digital Factory Campus(베를린) 및 Kecskemét(헝가리) 공장 실배치. 인트라로지스틱스 중심. Google DeepMind RT-2/RT-X VLA 모델 협력. 173cm/73kg/55lb 리프트/4시간 핫스왑 배터리.',
  'Apptronik closed its Series A funding round at $935 million, including a $520 million Series A-X round announced in February 2026 that valued the company at $5 billion. Investors include Google, Mercedes-Benz, B Capital, PEAK6, AT&T Ventures, John Deere, and Qatar Investment Authority. Apollo robots are deployed at Mercedes Digital Factory Campus in Berlin-Marienfelde and the Kecskemét plant in Hungary, focused on intra-logistics operations. The Apollo-Mercedes partnership represents the second most significant humanoid deployment in automotive manufacturing. Apptronik partnered with Google DeepMind for RT-2 and RT-X vision-language-action models, enabling continuous fleet learning. Apollo specs: 173cm tall, 73kg, 55-pound lift capacity, hot-swappable 4-hour battery packs, collaborative force-control architecture rated for human co-work. Jabil is the commercial manufacturing partner for automotive-grade scale production, with fleet production available commercially by 2027.',
  'en', 'industry', 'robot',
  md5('apptronik-935m-series-a-mercedes-deepmind-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Apptronik","Mercedes-Benz","Google DeepMind","Jabil","John Deere","Qatar Investment Authority","AT&T Ventures"],"mentionedRobots":["Apollo"],"technologies":["RT-2","RT-X VLA","collaborative force-control","hot-swappable battery"],"marketInsights":["$935M Series A total","$5B valuation","Mercedes Berlin + Hungary deployment","Jabil manufacturing for 2027 commercial scale"],"keyPoints":["$935M Series A including $520M A-X round","$5B valuation with Google investment","Apollo live at Mercedes 2 plants","Google DeepMind RT-2/RT-X AI partnership"],"summaryKo":"Apptronik Series A $935M 마감, $5B 기업가치. Apollo, Mercedes 베를린·헝가리 공장 실배치. Google DeepMind RT-2/RT-X VLA 모델 협력. Jabil 양산 파트너십 2027년 상용 규모 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-935m-series-a-mercedes-deepmind-2026-07'));

-- [1X Technologies] NEO 풀스케일 생산 개시 + 10,000대 사전주문 + EQT 산업용 계약 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Kicks Off Full-Scale NEO Production — 10,000 Pre-Orders in 5 Days, $20K Price, EQT Industrial Deal',
  'Forbes / TechCrunch / Sifted',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-07-15'::timestamp,
  '1X Technologies, NEO 풀스케일 생산 개시(캘리포니아 Hayward 공장). 5일 만에 10,000대 사전주문. $20,000 구매 또는 $499/월 렌탈. 2026년 말 소비자 배송 시작 목표. 2027년 말 100,000대 생산 목표. NEO Gamma: 170cm/30kg, 25DOF 손, 3D-니트 외장. EQT와 2026-2030 최대 10,000대 산업용 계약(300+ 포트폴리오사).',
  '1X Technologies has commenced full-scale production of the NEO humanoid robot at its Hayward, California facility. The company booked 10,000 pre-orders in just five days starting October 2025, with consumer shipments planned before end of 2026 and a target of 100,000 units by end of 2027. NEO is available at $20,000 for purchase or $499/month rental (six-month minimum). NEO Gamma is fully bipedal, standing 170cm tall and weighing 30kg, with 25-DOF hands and a soft 3D-knit exterior. In July 2026, the company detailed NEO hands approaching human hand capabilities. A deal with EQT will ship up to 10,000 NEO robots between 2026-2030 to EQT 300+ portfolio companies for manufacturing, warehousing, and logistics. Total VC funding exceeds $130 million from EQT Ventures, Tiger Global, and OpenAI Startup Fund.',
  'en', 'product', 'robot',
  md5('1x-neo-fullscale-production-10k-preorders-2026-07'),
  '{"confidence":"A","mentionedCompanies":["1X Technologies","EQT","OpenAI","Tiger Global"],"mentionedRobots":["NEO","NEO Gamma"],"technologies":["25-DOF hands","3D-knit exterior","bipedal gait"],"marketInsights":["10,000 pre-orders in 5 days","$20K purchase / $499/mo rental","100K units by end 2027","EQT 10K unit deal 2026-2030"],"keyPoints":["Full-scale production commenced at Hayward CA","10K pre-orders in 5 days","170cm/30kg/25-DOF hands","EQT industrial deal for 300+ portfolio cos"],"summaryKo":"1X, NEO 풀스케일 생산 개시. 5일 만에 10,000대 사전주문. $20K 구매/$499월 렌탈. 2026년 말 소비자 배송, 2027년 말 10만대 목표. EQT와 2026-2030 최대 10K대 산업용 계약."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-fullscale-production-10k-preorders-2026-07'));

-- [Agibot] 10,000대 출하 달성 + 유럽 진출 + SHAREBOT 렌탈 사업 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AgiBot Rolls Out 10,000th Robot — European Expansion via Minth Group, SHAREBOT Rental Subsidiary Launch',
  'The Robot Report / TrendForce / TechTimes',
  'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
  '2026-07-10'::timestamp,
  'Agibot, 10,000번째 범용 구현 로봇(Expedition A3) 출하 달성(3월 말). 2025년 1,000대 → 5,000대 → 3개월 만에 10,000대로 급속 성장. CES 2026에서 A2, X2, G2 시리즈 + D1 쿼드러펫 공개. 2월 Minth Group 파트너십으로 뮌헨 발 유럽 진출. 밀라노 첫 유럽 런칭(1월). SHAREBOT 렌탈 자회사 설립 — 2026년 말 $1.5B 렌탈 시장 전망. Unitree와 함께 중국 시장 80% 점유 전망(TrendForce).',
  'AgiBot achieved a major milestone in late March 2026 with the rollout of its 10,000th general-purpose embodied robot (Expedition A3), scaling from 1,000 to 5,000 and then doubling to 10,000 units within just three months. At CES 2026, AgiBot launched the A2, X2, and G2 series of humanoids plus D1 quadruped robots. The latest portfolio includes A3 (full-size humanoid), X3 (smaller service humanoid), G2 Air+Max (wheeled humanoids), and D2 (quadruped). AgiBot entered the European market via a Minth Group strategic partnership announced in Munich on February 24, 2026, and held its first European launch in Milan on January 30. The company launched SHAREBOT, a rental subsidiary projecting the robot rental market to reach $1.5 billion by end of 2026. Together with Unitree, AgiBot is projected to capture nearly 80% of total humanoid shipments in 2026 according to TrendForce.',
  'en', 'industry', 'robot',
  md5('agibot-10000th-robot-europe-sharebot-2026-07'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","Minth Group","Unitree","TrendForce"],"mentionedRobots":["Expedition A3","X3","G2","D1","D2"],"technologies":[],"marketInsights":["10,000th robot milestone","80% China humanoid market share with Unitree","SHAREBOT rental subsidiary","$1.5B rental market projection"],"keyPoints":["10K unit milestone in March","1K→5K→10K in 3 months","European expansion via Minth Group","SHAREBOT rental model launched"],"summaryKo":"Agibot, 10,000번째 로봇 출하(3개월 만에 5K→10K). CES 2026에서 A2/X2/G2/D1 공개. Minth Group과 유럽 진출(뮌헨). SHAREBOT 렌탈 자회사 설립. Unitree와 중국 80% 시장 점유 전망."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-10000th-robot-europe-sharebot-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림)
-- ============================================================

-- [CRITICAL] BD Atlas Gen 5 — 부품 수 1자릿수 감소, 양산 가속
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Boston Dynamics] Atlas Gen 5 공개 — 부품 수 "거의 1자릿수" 감소, 양산 비용·속도 혁신',
  'BD, 5세대 Atlas 공개. 부품 수 거의 1자릿수 감소로 제조 속도·신뢰성·비용 대폭 개선. 2026년 전량 배치 완료(Hyundai RMAC + Google DeepMind). Hyundai $26B 미국 투자에 30,000대/년 공장 포함. LG 양산 전략에 직접적 벤치마크 대상.',
  '{"source":"Forbes / Boston Dynamics Official","confidence":"A","date":"2026-07-02","improvement":"almost order of magnitude fewer parts","deployments":"Hyundai RMAC + Google DeepMind","factory_plan":"30,000/yr","hyundai_investment":"$26B US"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Atlas Gen 5%부품%'
  AND created_at > '2026-07-01'::timestamp
);

-- [CRITICAL] Figure AI — BMW Figure 03 확대 배치, 로봇이 인원 초과
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'critical',
  '[Figure AI] BMW Figure 03 배치 확대 — 로봇(740대) > 직원(600명), 인간 대비 98.5% 성능',
  'BMW, Spartanburg 공장 Figure 02 성공 후 Figure 03 배치 확대. Figure AI 내 로봇(740대)이 직원(600명) 초과. 10시간 경쟁에서 인간 대비 98.5% 성능 달성. $39B 기업가치. OEM 파트너십 확대 + 인간 수준 성능 근접이 핵심 위협.',
  '{"source":"BMW Group / Figure AI / Forbes","confidence":"A","date":"2026-06-30","bmw_expansion":"Figure 02 → Figure 03","robot_count":740,"employee_count":600,"human_parity":"98.5%","valuation":"$39B"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure%BMW%Figure 03%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Apptronik $935M 시리즈A + Mercedes 실배치
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Apptronik] Series A $935M 마감($5B 기업가치) — Mercedes 베를린·헝가리 실배치, Google DeepMind AI 협력',
  'Series A $935M 마감, $5B 기업가치. Google, Mercedes-Benz, John Deere, QIA 등 투자. Apollo, Mercedes 베를린·헝가리 2개 공장 실배치(인트라로지스틱스). Google DeepMind RT-2/RT-X VLA 모델 연동. Jabil 양산 파트너 — 2027년 상용 규모.',
  '{"source":"CNBC / Apptronik Official","confidence":"A","date":"2026-07-10","funding":"$935M Series A","valuation":"$5B","investors":["Google","Mercedes-Benz","John Deere","QIA","AT&T Ventures"],"deployment":"Mercedes Berlin + Hungary","ai_partner":"Google DeepMind RT-2/RT-X"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Apptronik%Series A%935M%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] 1X NEO 풀스케일 생산 + 10K 사전주문
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[1X Technologies] NEO 풀스케일 생산 개시 — 5일 만에 10,000대 사전주문, $20K 가격, EQT 10K대 산업용 계약',
  'NEO 풀스케일 생산 개시(Hayward CA). 5일 만에 10K 사전주문. $20K 구매/$499월 렌탈. 2026년 말 소비자 배송, 2027년 말 100K대 목표. EQT와 2026-2030 최대 10K대 산업용 계약(300+ 포트폴리오사). 가정용 → 산업용 확장 주목.',
  '{"source":"Forbes / TechCrunch / Sifted","confidence":"A","date":"2026-07-15","production":"full-scale at Hayward CA","preorders":"10K in 5 days","price":"$20K purchase / $499/mo rental","target_2027":"100K units","eqt_deal":"up to 10K units 2026-2030"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%1X%NEO%풀스케일%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] Agibot 10,000대 달성 + 유럽 진출
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Agibot] 10,000대 출하 달성(3개월 만에 2배) — Minth Group 유럽 진출, SHAREBOT 렌탈 사업',
  'Agibot, 10,000번째 로봇 출하 달성. 5,000대→10,000대 3개월 만에 2배 성장. Minth Group 파트너십으로 뮌헨·밀라노 유럽 진출. SHAREBOT 렌탈 자회사 설립($1.5B 시장 전망). Unitree와 중국 80% 시장 점유 전망. 중국 양산 속도가 글로벌 경쟁 판도 변화 주도.',
  '{"source":"The Robot Report / TrendForce / TechTimes","confidence":"A","date":"2026-07-10","milestone":"10,000th robot","growth":"5K to 10K in 3 months","europe":"Minth Group partnership Munich/Milan","rental":"SHAREBOT subsidiary","market_share":"~80% China with Unitree"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%10,000대%'
  AND created_at > '2026-07-01'::timestamp
);

-- [INFO] Agility SPAC $2.5B 상장
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Agility Robotics] $2.5B SPAC 상장 추진 — Foxconn $200M PIPE, 65,000+ 시간 실운영, Nasdaq AGLT',
  'Agility, $2.5B SPAC 합병으로 미국 최초 휴머노이드 전문 상장 추진. $620M+ 조달. Digit 실운영 65,000+ 시간(Schaeffler, GXO, Toyota, Mercado Libre). Digit v5 50lb 페이로드(43% 향상). Nasdaq AGLT, Q4 2026 완료 예상.',
  '{"source":"GeekWire / WWD / Yahoo Finance","confidence":"A","date":"2026-07-15","valuation":"$2.5B","proceeds":"$620M+","foxconn_pipe":"$200M","operation_hours":"65,000+","customers":["Schaeffler","GXO","Toyota Canada","Mercado Libre"],"ticker":"AGLT","close":"Q4 2026"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agility%SPAC%2.5B%'
  AND created_at > '2026-07-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림)
-- ============================================================

-- BD Atlas Gen 5
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / Boston Dynamics Official',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  'BD Atlas Gen 5 공개 — 부품 수 거의 1자릿수 감소, 양산 비용·속도 혁신',
  '5세대 Atlas. 부품 수 거의 1자릿수 감소. 제조 속도·신뢰성·비용 대폭 개선. 2026년 전량 Hyundai RMAC + Google DeepMind 배치. $26B 투자 30K/년 공장.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Atlas Gen 5%부품%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Tesla Optimus V3 생산 개시
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TrendForce / Musk X Post',
  'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
  'Tesla Optimus V3 생산 시작 — Musk "초기 생산 극히 느릴 것", Fremont 7-8월 가동',
  'Optimus V3 Fremont 생산 시작(7-8월). 초기 생산 극히 느림 경고. 173cm/57kg/37관절. 현재 Giga Texas 수십 대 운용. 2026년 전량 내부용.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Optimus V3 생산 시작%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Figure AI BMW 확대
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'BMW Group / Figure AI / Forbes',
  'https://www.figure.ai/news',
  'Figure AI: BMW Figure 03 배치 확대, 로봇(740대) > 직원(600명), 98.5% 인간 성능',
  'BMW Spartanburg Figure 02 성공 → Figure 03 확대. 740 로봇 vs 600 직원. 10시간 경쟁 98.5% 인간 대비. $39B 기업가치.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure%BMW%Figure 03%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Unitree 20K 목표 + 앱스토어
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Interesting Engineering / Forbes',
  'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
  'Unitree 2026년 20,000대 출하 목표(4배 증가) + 세계 최초 휴머노이드 앱스토어',
  '20K대 2026 목표(4배 증가). G1 $16K. UnifoLM-VLA-0 오픈소스. 세계 최초 휴머노이드 앱스토어. Morgan Stanley 중국 예측 28K대 상향.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR slug ILIKE '%g1%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%20,000대%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Agility SPAC $2.5B
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'GeekWire / WWD / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  'Agility Robotics $2.5B SPAC 상장 — Foxconn $200M PIPE, 65K+ 시간 실운영',
  '$2.5B SPAC. $620M+ 조달($420M trust + $200M Foxconn PIPE). 65K+ 시간 실운영. Digit v5 50lb. Nasdaq AGLT Q4 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' OR name ILIKE '%Agility%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility%2.5B%SPAC%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Apptronik $935M + Mercedes
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'CNBC / Apptronik Official',
  'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
  'Apptronik $935M Series A ($5B 기업가치) — Mercedes 2개 공장 실배치, Google DeepMind 협력',
  '$935M Series A, $5B 기업가치. Apollo Mercedes 베를린·헝가리 배치. Google DeepMind RT-2/RT-X. Jabil 양산 2027.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR name ILIKE '%Apollo%' OR name ILIKE '%Apptronik%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Apptronik%935M%'
  AND detected_at > '2026-07-01'::timestamp
);

-- 1X NEO 생산
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / TechCrunch',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '1X NEO 풀스케일 생산 — 10K 사전주문(5일), $20K, EQT 산업용 10K대 계약',
  'NEO 풀스케일 생산(Hayward CA). 5일 10K 사전주문. $20K/$499월. 2027 100K 목표. EQT 10K대 2026-2030.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR name ILIKE '%NEO%' OR name ILIKE '%1X%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X NEO 풀스케일%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Agibot 10K 달성
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'The Robot Report / TrendForce',
  'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
  'Agibot 10,000대 출하 달성 — Minth Group 유럽 진출, SHAREBOT 렌탈 사업',
  '10K번째 로봇 출하. 5K→10K 3개월. Minth Group 유럽 진출. SHAREBOT 렌탈($1.5B 시장). Unitree와 중국 80% 점유.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%10,000대%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 8 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 7 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 8 (deduplicated by headline + date)
-- Total: up to 23 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처 / 복수 유력 매체 교차확인:
--     BD Atlas Gen 5 (Forbes / BD Official)
--     Figure AI BMW 확대 (BMW Group Official / Figure AI / Forbes)
--     Unitree 20K 목표 (Interesting Engineering / Forbes / RobotShop)
--     Agility SPAC $2.5B (GeekWire / WWD / Yahoo Finance / SEC Filing)
--     Apptronik $935M (CNBC / Apptronik Official / Startup Fortune)
--     1X NEO 풀스케일 (Forbes / TechCrunch / Sifted)
--     Agibot 10K 달성 (The Robot Report / TrendForce / TechTimes)
-- [B] 2개 이상 매체 교차확인:
--     Tesla Optimus V3 생산 (TrendForce / Musk X Post)
--
-- NOTE: 이 스크립트는 환경 네트워크 정책으로 PostgreSQL 직접 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-20.sql
-- ============================================================
