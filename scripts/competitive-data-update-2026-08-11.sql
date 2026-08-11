-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 - 2026-08-11
-- 실행: psql $DATABASE_URL -f scripts/competitive-data-update-2026-08-11.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla] Optimus Gen 3 1,000+ 대 Fremont 가동 및 대량생산 목표 확인
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Tesla Confirms 1,000+ Optimus Gen 3 Units Operating at Fremont; Targets 1M Annual Production',
  'RoboHorizon / Teslarati',
  'https://robohorizon.com/en-us/news/2026/07/tesla-confirms-optimus-mass-production-targets-1-million-units-annually/',
  '2026-07-25'::timestamp,
  'Tesla confirms 1,000+ Optimus Gen 3 units operating at Fremont factory across battery assembly, EV pack loading, cable routing, connector seating, and parts handling. Model S/X line torn down in 46 days. Mass production targets: 1M units/year at Fremont, Giga Texas second factory targeting 10M units/year with volume production Summer 2027. Musk warns of "long and flat" initial production ramp.',
  'Tesla confirms 1,000+ Optimus Gen 3 operating at Fremont. Tasks: battery assembly, EV pack loading, cable routing, connector seating, parts handling. Model S/X line decommissioned in 46 days. VP Grace Tao at Beijing Digital Economy Conference: large-scale mass production by end 2026. Fremont line designed for 1M units/year long-term. Giga Texas second Optimus factory under construction, volume production Summer 2027, 10M units/year capacity. Musk: initial ramp "long and flat", 10,000 unique parts, no established supply chain. AWE 2026 Shanghai showcase. Gen 3 specs: 173cm, 57kg, 72+ DOF, 22 DOF/hand.',
  'en', 'product', 'robot',
  md5('tesla-optimus-1000-units-fremont-mass-production-2026-08-11'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus Gen 3","Optimus V3"],"technologies":["battery assembly automation","cable routing","connector seating"],"marketInsights":["1000+ units operating","1M/year Fremont target","10M/year Giga Texas target","Summer 2027 Texas volume"],"keyPoints":["1000+ Gen 3 at Fremont","Model S/X line torn down in 46 days","mass production by end 2026"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-1000-units-fremont-mass-production-2026-08-11'));

-- [Boston Dynamics] Hyundai 완전 인수 완료 및 노조 파업
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Hyundai Finalizes Boston Dynamics Acquisition; 35,000 Ulsan Workers Strike Over Atlas Deployment',
  'TechTimes / Korea Herald',
  'https://www.techtimes.com/articles/321150/20260721/hyundai-finalizes-boston-dynamics-takeover-workers-strike-over-atlas-same-day.htm',
  '2026-07-20'::timestamp,
  'Hyundai Motor Group closed full acquisition of Boston Dynamics on July 20, 2026. Same day, 35,000 union workers at Hyundai Ulsan complex escalated strike demanding written guarantees that no Atlas robot deploys on Korean production floor without consent. Hyundai committed 25,000+ Atlas robots to own factories by 2028, absorbing 83% of 30K annual production capacity.',
  'Hyundai closed full Boston Dynamics acquisition July 20, 2026. Same day: 35,000 union workers at Ulsan struck, demanding Atlas deployment consent clause. Hyundai committed 25,000+ Atlas robots to Hyundai/Kia plants = 83% of 30K/year capacity target by 2028. Atlas performed at FIFA World Cup 2026 halftime (July 5, New York/New Jersey Stadium) as Official Robotics Partner - goal celebrations, ceremonial ball delivery. All 2026 Atlas production fully committed to Hyundai RMAC + Google DeepMind.',
  'en', 'industry', 'robot',
  md5('hyundai-boston-dynamics-acquisition-strike-atlas-2026-08-11'),
  '{"mentionedCompanies":["Hyundai","Boston Dynamics","Google DeepMind","Kia"],"mentionedRobots":["Atlas Electric"],"technologies":[],"marketInsights":["full acquisition closed","35K workers strike","25K Atlas committed","83% of 30K/year capacity"],"keyPoints":["Hyundai full acquisition July 20","Ulsan union strike over Atlas","25,000 robots committed to own factories"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-boston-dynamics-acquisition-strike-atlas-2026-08-11'));

-- [Figure AI] Figure 03 1,000대 생산 달성 및 BMW 물류 확대
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Figure 03 Hits 1,000-Unit Production Milestone; Expands BMW Spartanburg Logistics to Sequencing',
  'Figure AI / BMW Group',
  'https://www.figure.ai/news/f-03-at-bmw',
  '2026-07-23'::timestamp,
  'BotQ manufactured 1,000th Figure 03 on July 23, 2026. Production rate: 1 robot/hour. Figure 03 deployed at BMW Spartanburg Hall 52 for logistics sequencing - upgraded from pick-and-place to complex sequencing use cases. UPS confirmed as second major customer. Helix AI (in-house VLA neural network) powers collaborative tasks and natural language interaction after ending OpenAI partnership.',
  'BotQ 1,000th Figure 03 produced July 23, 2026. Production: 1 robot/hour, targeting 12,000 annual capacity. BMW Spartanburg Hall 52 deployment: transitioned from pick-and-place sheet metal loading to sequencing use case (higher complexity tier). Figure 02 legacy: 90,000 parts loaded, 1,250+ runtime hours, 30,000+ X3 vehicles at BMW. 40 Figure 03 units at BMW. UPS second major customer. Helix AI (proprietary VLA) replaces OpenAI partnership. Total funding $1.9B, $39B valuation. BotQ target: 100,000 robots over 4 years.',
  'en', 'product', 'robot',
  md5('figure-03-1000-units-bmw-sequencing-2026-08-11'),
  '{"mentionedCompanies":["Figure AI","BMW","UPS"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix AI","VLA neural network","sequencing automation"],"marketInsights":["1000th unit produced","1 robot/hour","12K annual capacity target","UPS second customer"],"keyPoints":["1000th Figure 03 on July 23","BMW sequencing use case upgrade","Helix AI replaces OpenAI"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-1000-units-bmw-sequencing-2026-08-11'));

-- [Unitree] $9B IPO 상하이 STAR Market 상장
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Unitree Robotics Prices $9B IPO on Shanghai STAR Market - China First Public Humanoid Robot Maker',
  'Bloomberg / CNBC / Caixin',
  'https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html',
  '2026-08-06'::timestamp,
  'Unitree Robotics priced IPO at 150.8 yuan/share on Shanghai STAR Market, securing $9.04B valuation. Raising ~$904M through 40.45M new shares. China first publicly traded humanoid robot maker. Record 104-day regulatory approval. Retail subscriptions open August 10. H1 2026 revenue: 1.05-1.13B yuan (35-45% YoY growth). 2025: 5,500 humanoids shipped, RMB 1.69B revenue, 60% gross margins.',
  'Unitree IPO: 150.8 yuan/share, $9.04B valuation, $904M raise, 40.45M new shares. Shanghai STAR Market - first public humanoid robot maker in China. 104-day record regulatory review - Beijing fast-tracking AI/robotics champions. Retail subscriptions August 10. Financial: H1 2026 revenue 1.05-1.13B yuan (35-45% YoY); 2025: 5,500 humanoids shipped, RMB 1.69B revenue, ~60% gross margins, adjusted profitable. Current pricing: G1 $13,500, H1 $90,000, H2 $29,900. Competitors reference: Figure AI $39B private valuation on near-zero disclosed revenue.',
  'en', 'industry', 'robot',
  md5('unitree-ipo-9b-star-market-listing-2026-08-11'),
  '{"mentionedCompanies":["Unitree Robotics","Figure AI"],"mentionedRobots":["G1","H1","H2"],"technologies":[],"marketInsights":["$9.04B IPO valuation","$904M raise","first public humanoid robot maker China","104-day regulatory approval","60% gross margins"],"keyPoints":["STAR Market IPO $9B valuation","China first listed humanoid maker","5500 humanoids shipped in 2025"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-ipo-9b-star-market-listing-2026-08-11'));

-- [Agility] SPAC 상장 및 NVIDIA Halos 론치 파트너
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Agility Robotics Files SPAC Merger with Churchill Capital at $2.5B Valuation; Named NVIDIA Halos Launch Partner',
  'Agility Robotics / SEC Filing',
  'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
  '2026-07-07'::timestamp,
  'Agility Robotics entered SPAC merger with Churchill Capital Corp XI at $2.5B pre-money valuation. $620M+ gross proceeds including $200M PIPE at $10/share. S-4 filed July 14. Named NVIDIA Halos launch partner (safety system for physical AI). $300M+ multi-year contracted Digit v5 orders. 65,000+ operational hours across 9 customer facilities. Humanoid Global opened Silicon Valley AI Hub July 28.',
  'Agility SPAC merger: Churchill Capital Corp XI, $2.5B pre-money, $620M+ gross proceeds, $200M PIPE at $10/share. S-4 registration filed July 14, 2026. Only US publicly listed pure-play humanoid company with commercial deployments. NVIDIA Halos launch partner (full-stack safety for physical AI). Google DeepMind AI platform collaboration. $300M+ contracted Digit v5 orders from 30+ customer pipeline. 65,000+ hours across 9 facilities: Schaeffler, GXO, Toyota Canada, Mercado Libre, Spanx, Amazon. Strategic investors: DCVC, NVIDIA, Amazon, SoftBank Vision Fund 2, Foxconn, Schaeffler. Humanoid Global Silicon Valley AI Hub opened July 28.',
  'en', 'industry', 'robot',
  md5('agility-spac-churchill-nvidia-halos-2026-08-11'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","NVIDIA","Google DeepMind","Amazon","SoftBank","Foxconn","Schaeffler","GXO","Toyota","Mercado Libre"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos","physical AI safety system"],"marketInsights":["$2.5B SPAC valuation","$620M+ proceeds","$300M+ contracted orders","65K+ operational hours"],"keyPoints":["Churchill Capital SPAC merger $2.5B","NVIDIA Halos launch partner","$300M+ Digit v5 orders"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-churchill-nvidia-halos-2026-08-11'));

-- [Apptronik] Apollo 2 공개 및 Robot Park 개설
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Apptronik Unveils Apollo 2 Humanoid Robot and Opens 90,000 sq ft Robot Park Training Facility',
  'Apptronik / Robotics 24/7',
  'https://www.robotics247.com/article/apptronik-unveils-apollo-2-humanoid-robot-opens-robot-park-data-collection-and-training-facility',
  '2026-06-30'::timestamp,
  'Apptronik unveiled Apollo 2 and opened 90,000 sq ft Robot Park data collection and training facility in Austin, TX on June 30. Apollo 2 available in bipedal and wheeled configurations. Google DeepMind research partnership for Gemini Robotics data collection. Total funding: $935M+ Series A ($520M Feb 2026 round with AT&T Ventures, John Deere, Qatar Investment Authority). Apollo 3 in development.',
  'Apptronik Apollo 2 unveiled June 30, 2026. Robot Park: 90,000 sq ft facility in Austin for large-scale real-world data collection. Apollo 2: bipedal and wheeled-base configurations. Bipedal for human spaces, wheeled for industrial stability/efficiency. Google DeepMind research partnership - Apollo 2 data trains Gemini Robotics foundational models. $520M Series A-X (Feb 2026): AT&T Ventures, John Deere, Qatar Investment Authority + existing B Capital, Google, Mercedes-Benz, PEAK6. Total Series A: $935M+, total raised ~$1B. Commercial pilots: Mercedes-Benz, GXO Logistics, Jabil. Apollo 3 next-gen in development.',
  'en', 'product', 'robot',
  md5('apptronik-apollo2-robot-park-2026-08-11'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","AT&T Ventures","John Deere","Qatar Investment Authority","Mercedes-Benz","GXO","Jabil"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","bipedal/wheeled dual configuration","large-scale data collection"],"marketInsights":["$935M+ Series A","~$1B total raised","90K sq ft Robot Park","Apollo 3 in development"],"keyPoints":["Apollo 2 bipedal+wheeled configs","Robot Park 90K sq ft Austin","Google DeepMind Gemini data partnership"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-apollo2-robot-park-2026-08-11'));

-- [1X] NEO 25-DoF 핸드 업그레이드 및 World Model Lab
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  '1X Ships 25-DoF Tendon-Driven Hands for NEO; Launches World Model Lab for AGI Path',
  'Forbes / 1X Official',
  'https://www.forbes.com/sites/johnkoetsier/2026/06/04/1x-launches-humanoid-robot-world-model-lab-you-cant-fine-tune-your-way-to-agi/',
  '2026-07-09'::timestamp,
  '1X shipped 25-DoF tendon-driven hands for NEO (July 9): IP68 rating, ±0.2mm accuracy, tactile fingertips with slip detection, force-transparent joints, 10,000 hands/year production capacity. World Model Lab launched June 4 with Sam Sinha as Head of World Models. Hayward factory at full production since April 30 (58K sq ft, 200+ employees). Consumer shipments planned end 2026. 10,000 pre-orders booked in 5 days. Scaling to 100K units/year by 2027.',
  '1X 25-DoF hands shipped July 9, 2026: tendon-driven, IP68, ±0.2mm accuracy, tactile skin with slip detection, force-transparent joints. Production: 10,000 hands/year. World Model Lab (June 4): hired Sam Sinha as Head of World Models. CEO: "You cant fine-tune your way to AGI." NEO will ship "something useful with full autonomy" by end 2026. Hayward factory: full production since April 30, 58K sq ft, 200+ employees. 10,000 pre-orders in 5 days (Oct 2025). San Carlos second plant under construction. Scaling to 100K/year by 2027. Price: $20K or $499/mo.',
  'en', 'technology', 'robot',
  md5('1x-neo-25dof-hands-world-model-lab-2026-08-11'),
  '{"mentionedCompanies":["1X Technologies","NVIDIA"],"mentionedRobots":["NEO"],"technologies":["25-DoF tendon-driven hands","IP68","slip detection","World Model AI","force-transparent joints"],"marketInsights":["10K pre-orders in 5 days","$20K or $499/mo","100K/year by 2027","10K hands/year capacity"],"keyPoints":["25-DoF hands shipped July 9","World Model Lab launched","Hayward factory full production"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-25dof-hands-world-model-lab-2026-08-11'));

-- [Agibot] 15,000대 생산 마일스톤 및 A3 Ultra WAIC 2026
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'AGIBOT Ships 15,000th Robot; Unveils A3 Ultra Humanoid with NVIDIA Thor at WAIC 2026',
  'Interesting Engineering / AGIBOT Official',
  'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
  '2026-07-20'::timestamp,
  'AGIBOT announced 15,000th robot shipped at WAIC 2026 Shanghai - scale no Western competitor has matched. Claims 39% global humanoid market share (2025). Launched A3 Ultra: 1.74m, 51 DOF, NVIDIA Thor chip, 5kg per arm payload, 8hr battery with quick-swap, lidar + camera array. Also launched X2 Edu, G2 Max industrial, OmniHand 3 Ultra-M. G2-series running on Longcheer Technology production line. UK APC 2026 in London for European expansion with RaaS model.',
  'AGIBOT WAIC 2026: 15,000th robot shipped. 10,000 cumulative by March 2026, first in industry at this mass production scale. Claims 39% global humanoid market 2025. A3 Ultra: 1.74m, 51 DOF, NVIDIA Thor SoC, 5kg/arm, 8hr battery, quick-swap batteries for 24/7 shifts, lidar + camera array. New products: X2 Edu (education), G2 Max (industrial), OmniHand 3 Ultra-M (robotic hand). G2 deployed at Longcheer Technology for tablet QC - autonomous component handling without human supervision. UK APC 2026 London: A3 European debut, UK RaaS model. MOU with Singtel Enterprise at MWC 2026 for Singapore deployment.',
  'en', 'product', 'robot',
  md5('agibot-15000-robots-a3-ultra-waic-2026-08-11'),
  '{"mentionedCompanies":["AGIBOT","NVIDIA","Longcheer Technology","Singtel"],"mentionedRobots":["A3 Ultra","X2 Edu","G2 Max","OmniHand 3 Ultra-M"],"technologies":["NVIDIA Thor","quick-swap batteries","lidar+camera array"],"marketInsights":["15000 robots shipped","39% global market share claim","first mass production at scale","UK RaaS model"],"keyPoints":["15,000th robot milestone","A3 Ultra with NVIDIA Thor","G2 on Longcheer production line"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-robots-a3-ultra-waic-2026-08-11'));


-- ============================================================
-- 2. COMPETITIVE ALERTS 삽입 (War Room용, 신규 데이터만)
-- ============================================================

-- Alert 1: Tesla Optimus 1,000+ 대 가동 확인
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus Gen 3%' OR name ILIKE '%Optimus%' LIMIT 1),
  'mass_production', 'critical',
  '[Tesla] Optimus Gen 3 1,000+ 대 Fremont 가동 - 1M/년 대량생산 목표',
  'Tesla가 Fremont 공장에서 Optimus Gen 3 1,000대 이상 가동 확인. Model S/X 라인 46일만에 철거 완료. 대량생산 목표: Fremont 1M대/년, Giga Texas 10M대/년(2027 여름 가동). 초기 생산 속도 "느리고 평탄할 것"이라 경고.',
  '{"source":"RoboHorizon/Teslarati","confidence":"B","date":"2026-07-25","unitsOperating":"1000+","fremontTarget":"1M/year","gigaTexasTarget":"10M/year Summer 2027","lineConversion":"46 days","tasks":"battery assembly, EV pack loading, cable routing"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus Gen 3 1,000%');

-- Alert 2: Hyundai-BD 인수 완료 및 노조 파업
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' LIMIT 1),
  'partnership', 'critical',
  '[BD] Hyundai 완전 인수 완료 - 35,000 노조 파업, 25,000 Atlas 배치 계획',
  'Hyundai가 7/20 Boston Dynamics 완전 인수 완료. 같은 날 울산 35,000명 노조 파업 - Atlas 배치 동의 없이 투입 불가 요구. Hyundai/Kia 공장 25,000+ Atlas 배치 계획(30K/년 생산 용량의 83%). FIFA World Cup 2026 하프타임 퍼포먼스.',
  '{"source":"TechTimes/Korea Herald","confidence":"A","date":"2026-07-20","acquisitionClosed":"July 20, 2026","strikeWorkers":35000,"atlasCommitted":25000,"capacityShare":"83% of 30K/year","fifaWorldCup":"July 5 halftime performance"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Hyundai 완전 인수 완료%');

-- Alert 3: Figure 03 1,000대 생산 달성
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure 03%' LIMIT 1),
  'mass_production', 'warning',
  '[Figure] Figure 03 1,000대 생산 달성 - BMW 물류 시퀀싱 확대, UPS 고객 확보',
  'BotQ에서 7/23 Figure 03 1,000번째 생산. 시간당 1대 생산율, 연 12,000대 목표. BMW Spartanburg에서 pick-and-place → 시퀀싱 유스케이스로 업그레이드. UPS 두 번째 주요 고객. Helix AI(자체 VLA)가 OpenAI 대체.',
  '{"source":"Figure AI/BMW Group","confidence":"A","date":"2026-07-23","unitsProduced":1000,"productionRate":"1/hour","annualTarget":12000,"bmwUseCase":"sequencing upgrade","upsCustomer":true,"helixAI":"proprietary VLA replaces OpenAI"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure 03 1,000대%');

-- Alert 4: Unitree $9B IPO
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' LIMIT 1),
  'funding', 'critical',
  '[Unitree] $9.04B IPO 상하이 STAR Market 상장 - 중국 최초 휴머노이드 상장사',
  'Unitree가 8/6 상하이 STAR Market IPO 가격 결정. $9.04B 밸류에이션, $904M 조달. 중국 최초 상장 휴머노이드 로봇 기업. 104일 기록적 규제 승인. 2025년 5,500대 출하, 매출 RMB 1.69B, 매출총이익률 60%. 소매 청약 8/10 개시.',
  '{"source":"Bloomberg/CNBC/Caixin","confidence":"A","date":"2026-08-06","valuation":"$9.04B","raise":"$904M","listing":"STAR Market","regulatoryDays":104,"shipments2025":5500,"revenue2025":"RMB 1.69B","grossMargin":"60%","retailSubscription":"Aug 10"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%$9.04B IPO%');

-- Alert 5: Agility SPAC 상장
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' LIMIT 1),
  'funding', 'warning',
  '[Agility] Churchill Capital SPAC 합병 $2.5B - NVIDIA Halos 론치 파트너',
  'Agility Robotics가 Churchill Capital Corp XI와 SPAC 합병 계약. $2.5B 프리머니 밸류에이션, $620M+ 총 수익. NVIDIA Halos(물리 AI 안전 시스템) 론치 파트너 선정. $300M+ Digit v5 계약 주문. 9개 시설 65,000+ 운영 시간.',
  '{"source":"Agility Robotics/SEC","confidence":"A","date":"2026-07-07","valuation":"$2.5B","proceeds":"$620M+","pipe":"$200M at $10/share","s4Filed":"July 14","nvidiaHalos":"launch partner","contractedOrders":"$300M+","operationalHours":"65K+"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Churchill Capital SPAC%');

-- Alert 6: Apptronik Apollo 2 공개
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' LIMIT 1),
  'mass_production', 'info',
  '[Apptronik] Apollo 2 공개 + 90K sq ft Robot Park - Google DeepMind 데이터 수집',
  'Apptronik이 6/30 Apollo 2 공개. 이족보행/바퀴 듀얼 구성. Austin 90,000 sq ft Robot Park 개설. Google DeepMind Gemini Robotics 데이터 수집 파트너십. 총 투자 ~$1B. Apollo 3 개발 중.',
  '{"source":"Apptronik/Robotics247","confidence":"A","date":"2026-06-30","apollo2":"bipedal+wheeled dual config","robotPark":"90K sq ft Austin","deepmindPartnership":"Gemini Robotics data collection","totalFunding":"~$1B","apollo3":"in development"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apollo 2 공개%');

-- Alert 7: 1X NEO 25-DoF 핸드
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' LIMIT 1),
  'score_spike', 'info',
  '[1X] NEO 25-DoF 텐던 구동 핸드 출하 - IP68, 촉각 센서, World Model Lab',
  '1X가 7/9 NEO용 25-DoF 텐던 구동 핸드 출하. IP68 등급, ±0.2mm 정밀도, 촉각 핑거팁(슬립 감지). 연 10,000 핸드 생산 용량. World Model Lab 런칭(6/4). Hayward 공장 풀 프로덕션. 2026년 말 소비자 출하 계획.',
  '{"source":"Forbes/1X Official","confidence":"B","date":"2026-07-09","handDOF":25,"ip68":true,"accuracy":"±0.2mm","slipDetection":true,"handCapacity":"10K/year","worldModelLab":"June 4 launch","consumerShipments":"end 2026 planned"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%NEO 25-DoF%');

-- Alert 8: Agibot 15,000대 마일스톤
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' OR name ILIKE '%Agibot%' LIMIT 1),
  'mass_production', 'critical',
  '[Agibot] 15,000대 출하 마일스톤 - A3 Ultra(NVIDIA Thor) WAIC 2026 공개',
  'AGIBOT이 WAIC 2026에서 15,000번째 로봇 출하 발표. 서양 경쟁사 대비 압도적 생산 규모. 2025년 글로벌 휴머노이드 시장 39% 점유 주장. A3 Ultra: 1.74m, 51 DOF, NVIDIA Thor, 5kg/팔, 8시간 배터리. UK RaaS 모델 런칭. G2 Longcheer Technology 생산라인 배치.',
  '{"source":"AGIBOT/Interesting Engineering","confidence":"A","date":"2026-07-20","totalShipped":15000,"marketShare":"39% claim 2025","a3Ultra":"1.74m 51DOF NVIDIA Thor 5kg/arm 8hr","ukRaaS":true,"longcheerDeployment":"G2 tablet QC line"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%15,000대 출하%');


COMMIT;
