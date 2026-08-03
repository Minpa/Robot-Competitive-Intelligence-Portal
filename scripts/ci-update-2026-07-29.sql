-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-29
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- 이전 스크립트(2026-07-28)와 중복되지 않는 신규 항목만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트) — 신규 항목
--    content_hash 기반 중복 방지
-- ============================================================

-- [Tesla] Optimus 생산라인 Fremont 가동 임박 — Model S/X 라인 46일 만에 철거 완료, V3 생산 시작 (A, 2026-07-25)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla Tears Down Model S/X Assembly Line in 46 Days — Fremont Optimus Production Line Ready for Late July/August Start',
  'Yahoo Finance / Teslarati / CryptoBriefing',
  'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
  '2026-07-25'::timestamp,
  'Tesla, Fremont 공장 Model S/X 조립라인을 46일 만에 완전 철거 완료(5월 초 마지막 생산). 14년간 Model S, 11년간 Model X 생산했던 라인을 Optimus 휴머노이드 로봇 전용 생산라인으로 전환. 7월 말~8월 생산 시작 목표. Optimus V3에 10,000개 고유 부품 포함, 초기 생산 "극도로 느릴 것"(Musk). Fremont 라인 최종 목표 연 100만 대, Texas Gigafactory에서 연 1,000만 대 목표(2027).',
  'Tesla completed dismantling its Model S and Model X assembly line at the Fremont factory in just 46 days, ending 14 years of Model S and 11 years of Model X production. The line is being converted to a dedicated Optimus humanoid robot production facility, with production targeted to begin in late July or August 2026. Optimus V3 contains 10,000 unique parts across an entirely new production line. Musk warned initial output will be "extremely slow" and "literally impossible to predict." The Fremont line targets eventual capacity of 1 million Optimus units per year, with a parallel larger assembly line under construction at Texas Gigafactory targeting 10 million units annually by 2027.',
  'en', 'industry', 'robot',
  md5('tesla-fremont-model-sx-teardown-46days-optimus-production-2026-07-25'),
  '{"confidence":"A","mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus V3"],"technologies":["dedicated humanoid production line","10000 unique parts"],"marketInsights":["Model S/X line torn down in 46 days for Optimus","Late July/August 2026 production start","Fremont target: 1M units/year","Texas Gigafactory target: 10M units/year by 2027"],"keyPoints":["Fremont factory conversion complete","10,000 unique parts in Optimus V3","Initial production extremely slow","Dual factory strategy: Fremont + Texas"],"summaryKo":"Tesla Fremont Model S/X 라인 46일 철거, Optimus 전용 생산라인 전환. 7월 말~8월 생산 시작. 10K 부품, 초기 극저속. Fremont 100만대/년, Texas 1000만대/년 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-fremont-model-sx-teardown-46days-optimus-production-2026-07-25'));

-- [Tesla] Optimus 생산 "장기적이고 평탄한" 램프업 경고 — Q2 실적 후 업데이트 (A, 2026-07-25)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Musk Warns of "Long and Flat" Optimus Production Ramp — AI5 Chip + xAI Grok Integration Confirmed',
  'The AI Insider / TrendForce',
  'https://theaiinsider.tech/2026/07/25/musk-updates-progress-of-teslas-optimus-humanoid-robot-warns-of-long-and-flat-production-ramp/',
  '2026-07-25'::timestamp,
  'Musk, Optimus 생산 램프업이 "길고 평탄할 것(long and flat)"이라 경고(7/25). Optimus V3에 Tesla AI5 칩(기존 대비 메모리 대역폭 5배) + xAI Grok 음성 AI 통합 확인. 공급망: Samsung, TSMC, Panasonic, Micron. 최종 연간 목표 Optimus 3 100만대, Optimus 4 1,000만대. 2027년 Gigafactory Texas/Berlin/Shanghai 병행 확장 계획.',
  'On July 25, 2026, Elon Musk warned that Optimus production ramp will be "long and flat," tempering expectations for rapid scaling. The latest Optimus V3 features Tesla''s new AI5 chip with approximately 5x the memory bandwidth of the prior generation, plus xAI''s Grok AI for voice interaction. Supply chain partners include Samsung, TSMC, Panasonic, and Micron for chips, batteries, and memory. Ultimate annual capacity targets are 1 million Optimus 3 units and 10 million Optimus 4 units. Parallel expansion into Gigafactory Texas, Berlin, and Shanghai planned for 2027.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-long-flat-ramp-ai5-grok-supply-chain-2026-07-25'),
  '{"confidence":"A","mentionedCompanies":["Tesla","Samsung","TSMC","Panasonic","Micron","xAI"],"mentionedRobots":["Optimus V3","Optimus 4"],"technologies":["AI5 chip","5x memory bandwidth","xAI Grok voice AI"],"marketInsights":["Long and flat production ramp warning","Supply chain: Samsung, TSMC, Panasonic, Micron","Optimus 3: 1M/yr target, Optimus 4: 10M/yr target","2027 expansion: Texas, Berlin, Shanghai"],"keyPoints":["Production ramp will be long and flat","AI5 chip with 5x memory bandwidth","xAI Grok for voice interaction","Multi-gigafactory expansion 2027"],"summaryKo":"Musk: Optimus 생산 '길고 평탄한' 램프업 경고. AI5 칩(5x 대역폭)+xAI Grok 음성. 공급: Samsung/TSMC/Panasonic/Micron. Optimus3 100만/Optimus4 1000만 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-long-flat-ramp-ai5-grok-supply-chain-2026-07-25'));

-- [Figure AI] Figure 03 BMW Spartanburg 배치 — Helix 02 AI, 시퀀싱 유즈케이스 (A, 2026-07-01)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure 03 Deployed at BMW Spartanburg — Helix 02 AI Replaces 109K Lines of C++, Sequencing Use Case Live',
  'Figure AI Blog / Manufacturing Digital / Fox News',
  'https://www.figure.ai/news/f-03-at-bmw',
  '2026-07-01'::timestamp,
  'Figure AI, Figure 03를 BMW Spartanburg 공장 Hall 52에 배치(7/1). Helix 02 AI 탑재 — 109,504줄 C++ 수작업 코드를 단일 신경망으로 대체. 픽셀→액션 전신 제어. Figure 02는 작년 BMW에서 30,000대 자동차 조립 기여. Figure 03는 시퀀싱(sequencing) 유즈케이스로 진화 — 부품 위치 변경/오배치에 실시간 적응. BMW, 유럽(라이프치히) 최초 휴머노이드 파일럿 발표.',
  'Figure AI deployed its Figure 03 humanoid robot at BMW Group Plant Spartanburg, South Carolina, in Hall 52 (July 1, 2026). The robot runs on Helix 02 AI, which replaced 109,504 lines of hand-engineered C++ with a single learned whole-body controller — one neural network from pixels to actions. Figure 02 previously contributed to the assembly of 30,000 cars at BMW. Figure 03 advances to sequencing use cases, adapting in real-time when parts are misplaced or arrive in different positions. BMW also announced its first European humanoid pilot at Plant Leipzig, establishing a "Center of Competence for Physical AI in Production."',
  'en', 'technology', 'robot',
  md5('figure-03-bmw-spartanburg-helix02-sequencing-109k-cpp-2026-07-01'),
  '{"confidence":"A","mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix 02 AI","learned whole-body controller","pixel-to-action neural network","replaced 109504 lines C++"],"marketInsights":["Figure 03 deployed at BMW Spartanburg Hall 52","Figure 02 contributed to 30K car assembly","Sequencing use case: real-time adaptation","BMW first European humanoid pilot at Leipzig"],"keyPoints":["Helix 02 replaces 109K lines of C++","Pixel-to-action full-body neural control","30K cars assembled with Figure 02","BMW European expansion to Leipzig"],"summaryKo":"Figure 03 BMW Spartanburg 배치(7/1). Helix 02: 109K줄 C++ → 단일 신경망 전신 제어. Figure 02는 30K대 자동차 조립. 시퀀싱 유즈케이스. BMW 유럽(라이프치히) 파일럿 발표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-bmw-spartanburg-helix02-sequencing-109k-cpp-2026-07-01'));

-- [Agility] SPAC 상장 확정 — $2.5B 기업가치, Nasdaq AGLT, Digit v5 $300M+ 수주 (A, 2026-07-28)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics Goes Public via $2.5B SPAC — Digit v5 Orders Exceed $300M, Fremont AI Hub Opens',
  'GlobeNewsWire / GeekWire / TechCrunch',
  'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
  '2026-07-28'::timestamp,
  'Agility Robotics, Churchill Capital Corp XI와 SPAC 합병으로 Nasdaq 상장 확정(티커: AGLT, 2026년 말 예상). 기업가치 $2.5B, 총 수익금 $620M+(휴머노이드 역대 최대 자금조달). Digit v5 다년 수주 $300M+. Digit v5 사양: 50lb 리프트(40%↑), 22시간 가동, 7.2ft 도달거리. 65,000+시간 실운용(GXO, Toyota, Schaeffler, Mercado Libre). Fremont 60,000sf AI Hub 개설, 200+ 인력 채용 계획. NVIDIA Halos 안전 인증 진행 중.',
  'Agility Robotics confirmed its public listing via SPAC merger with Churchill Capital Corp XI, expected to trade on Nasdaq as AGLT by end of 2026. Pre-money equity value of $2.5 billion with over $620 million in gross proceeds — the largest capital raise in humanoid robotics history. Multi-year Digit v5 orders exceed $300 million. Digit v5 specs: 50-pound lift capacity (40% increase), 22-hour runtime, 7.2-foot maximum reach. Over 65,000 hours of real-world commercial operation across GXO, Toyota Motor Manufacturing Canada, Schaeffler, and Mercado Libre. New 60,000 sq ft Physical AI development hub opened in Fremont, California, adding nearly 200 technical and field-operations roles. NVIDIA Halos safety certification process underway for cooperative safety operation.',
  'en', 'industry', 'robot',
  md5('agility-spac-2.5b-nasdaq-aglt-digit-v5-300m-orders-fremont-hub-2026-07-28'),
  '{"confidence":"A","mentionedCompanies":["Agility Robotics","Churchill Capital","Humanoid Global","NVIDIA","GXO","Toyota","Schaeffler","Mercado Libre"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos safety certification","cooperative safety operation"],"marketInsights":["$2.5B SPAC valuation — largest humanoid capital raise","$300M+ Digit v5 multi-year orders","First pure-play humanoid public company in US","65,000+ hours real commercial operation"],"keyPoints":["Nasdaq listing as AGLT expected end 2026","$620M+ gross proceeds","Digit v5: 50lb lift, 22hr runtime, 7.2ft reach","Fremont AI Hub: 60,000 sq ft, 200+ hires"],"summaryKo":"Agility SPAC 상장 확정: $2.5B, Nasdaq AGLT. $620M+ 조달(휴머노이드 최대). Digit v5 수주 $300M+. 50lb/22hr/7.2ft. 65K시간 실운용. Fremont AI Hub 개설."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-2.5b-nasdaq-aglt-digit-v5-300m-orders-fremont-hub-2026-07-28'));

-- [Apptronik] Robot Park 개설 + Google DeepMind Gemini Robotics 통합 (A, 2026-07-06)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  'Apptronik Launches Robot Park for Apollo Training with Google DeepMind Gemini Robotics — Apollo 2 Unveiled',
  'Robotics & Automation News / Apptronik Press',
  'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
  '2026-07-06'::timestamp,
  'Apptronik, Robot Park 개설(7/6) — Apollo 휴머노이드 로봇 훈련 전용 시설. Google DeepMind Gemini Robotics 파워 차세대 AI 통합. Apollo 2 공개: 이족보행/바퀴 이중 구성 가능 훈련·데이터 플랫폼. Apollo 3(2027 상업화 목표)가 첫 진정한 상업 제품. Mercedes-Benz(Berlin-Marienfelde, Kecskemet), GXO, Jabil에서 파일럿 배치 진행. 총 자금조달 $935M+(Series A), $5B 기업가치.',
  'Apptronik opened Robot Park on July 6, 2026 — a dedicated training facility for Apollo humanoid robots powered by Google DeepMind''s Gemini Robotics AI. Apollo 2 was unveiled as a training and data platform available in bipedal or wheeled configurations. Apollo 3, targeted for 2027, will be the company''s first true commercial product. Pilot deployments ongoing at Mercedes-Benz (Berlin-Marienfelde, Kecskemet), GXO Logistics, and Jabil. Total funding exceeds $935 million (Series A), at a $5 billion valuation. Investors include Google, Mercedes-Benz, AT&T Ventures, John Deere, and Qatar Investment Authority.',
  'en', 'technology', 'robot',
  md5('apptronik-robot-park-google-deepmind-gemini-apollo2-2026-07-06'),
  '{"confidence":"A","mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO","Jabil","AT&T Ventures","John Deere","Qatar Investment Authority"],"mentionedRobots":["Apollo","Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","Robot Park training facility","bipedal/wheeled dual configuration"],"marketInsights":["Robot Park for humanoid training opened","Google DeepMind partnership for AI","Apollo 2: training platform, bipedal/wheel","Apollo 3: first commercial product (2027)"],"keyPoints":["Robot Park opened July 6","Gemini Robotics AI integration","Apollo 2 dual-config (bipedal/wheel)","$935M+ funding, $5B valuation"],"summaryKo":"Apptronik Robot Park 개설(7/6), Google DeepMind Gemini Robotics 통합. Apollo 2 공개(이족/바퀴 이중). Apollo 3(2027 상업화). $935M+ 자금, $5B 가치."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-robot-park-google-deepmind-gemini-apollo2-2026-07-06'));

-- [Unitree] STAR Market IPO 승인 — 104일 최단 심사, $618M 규모, $5.9B 기업가치 (A, 2026-07-03)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Robotics Wins STAR Market IPO Approval — $618M Raise at $5.9B Valuation, Fastest-Ever Review (104 Days)',
  'Caixin Global / BigGo Finance / KraneShares',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  '2026-07-03'::timestamp,
  'Unitree Robotics, STAR Market IPO 등록 승인(7/3). 접수~승인 104일 — STAR Market 사전심사제 도입 이후 최단 기록. $618M(약 ¥4.5B) 규모, 기업가치 $5.9B 추정. 2026년 7월 말 상장 예상. 2025년 5,000대 출하 → 2026년 20,000대 목표(4배). G1 JAL 하네다공항 배치(일본 최초 휴머노이드 공항 배치). H2 $29,900 출시, NVIDIA Jetson Thor + Isaac GR00T 통합.',
  'Unitree Robotics received STAR Market IPO registration approval on July 3, 2026, completing the review in just 104 days — the fastest ever since the STAR Market pre-review mechanism was implemented. The IPO targets approximately $618 million at an implied valuation of $5.9 billion, with debut expected in late July 2026. Unitree shipped 5,000 robots in 2025 and targets 20,000 units in 2026 (4x growth). The G1 was deployed at Tokyo Haneda Airport with Japan Airlines for baggage handling — the first commercial humanoid airport deployment. The H2 launched at $29,900 with NVIDIA Jetson Thor and Isaac GR00T integration.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-ipo-618m-5.9b-104days-fastest-2026-07-03'),
  '{"confidence":"A","mentionedCompanies":["Unitree","NVIDIA","Japan Airlines"],"mentionedRobots":["G1","H2"],"technologies":["NVIDIA Jetson Thor","Isaac GR00T"],"marketInsights":["STAR Market IPO approved: $618M, $5.9B valuation","Fastest-ever STAR Market review: 104 days","20,000 robot target for 2026 (4x from 5K)","First humanoid airport deployment (Haneda)"],"keyPoints":["IPO registration approved July 3","104-day record review","$618M raise, $5.9B valuation","G1 at Haneda Airport with JAL"],"summaryKo":"Unitree STAR Market IPO 승인(7/3): $618M, $5.9B 가치. 104일 최단 심사. 2026년 20K대 목표. G1 하네다공항 배치. H2 $29,900/NVIDIA Thor."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-618m-5.9b-104days-fastest-2026-07-03'));

-- [1X] NEO 로봇 핸드 공개 — 인간 수준 그립 강도, 2026년 내 출하 (A, 2026-07-13)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Technologies Reveals NEO Robot Hand — Human-Level Grip Strength, Shipping in 2026',
  'Dezeen / TBPN Digest',
  'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
  '2026-07-13'::timestamp,
  '1X Technologies, NEO 로봇 핸드 공개(7/13). 인간 수준 그립 강도 달성. 2026년 내 NEO 로봇과 함께 출하 예정. Hayward 공장(58,000sf, 미국 최초 수직 통합 휴머노이드 공장) 가동 중. 연 10,000대 생산능력, 첫해 전량 예약 완료(5일 만). $20,000 구매 또는 $499/월 렌탈. EQT와 10,000대 배치 계약(2026~2030). 그러나 7월 16일 기준 실제 고객 배송 미확인.',
  '1X Technologies revealed the NEO robot hand on July 13, 2026, achieving human-level grip strength. The hand will ship with NEO robots later in 2026. The Hayward, California factory (58,000 sq ft, first vertically integrated humanoid factory in the US) is operational with annual capacity of 10,000 units — first-year production sold out in five days. NEO is priced at $20,000 for purchase or $499/month rental (six-month minimum). 1X signed a deal with EQT to deploy up to 10,000 NEO robots across 300+ portfolio companies from 2026 to 2030. However, as of July 16, no verified customer delivery has been confirmed.',
  'en', 'product', 'robot',
  md5('1x-neo-robot-hand-human-grip-strength-shipping-2026-07-13'),
  '{"confidence":"A","mentionedCompanies":["1X Technologies","EQT"],"mentionedRobots":["NEO"],"technologies":["human-level grip strength hand","vertically integrated manufacturing"],"marketInsights":["NEO hand with human-level grip","10,000 unit capacity, sold out in 5 days","$20,000 purchase or $499/mo rental","EQT deal: 10,000 robots across 300+ companies"],"keyPoints":["Robot hand revealed July 13","Human-level grip strength","Hayward factory 58K sq ft operational","No verified deliveries as of July 16"],"summaryKo":"1X NEO 로봇 핸드 공개(7/13): 인간 수준 그립 강도. 10K대 생산능력(5일 매진). $20K/$499월. EQT 10K대 계약. 고객 배송 미확인."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-robot-hand-human-grip-strength-shipping-2026-07-13'));

-- [Agibot] 15,000대 생산 달성 + 글로벌 수출 확대 (A, 2026-06-29)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AGIBOT Hits 15,000 Robot Production Milestone — From 10K to 15K in Under 3 Months, Eyes Global Factory Floors',
  'WebProNews / The AI Insider',
  'https://www.webpronews.com/chinas-agibot-hits-15000-robots-and-eyes-factory-floors-worldwide/',
  '2026-06-29'::timestamp,
  'Agibot, 15,000번째 로봇 생산 달성(6/29). 2023년 프로토타입 6대 → 2026년 3월 10,000대 → 6월 15,000대(3개월 미만). 1,000→5,000대 1년, 5,000→10,000대 3개월(4배 가속). Omdia 2025년 글로벌 휴머노이드 출하량 1위(시장점유율 39%). 소비자 전자제품 정밀 제조 대량생산 라인에 체화 AI 최초 대규모 산업 구현. 2026년 100대 배치 스케일업 계획. 글로벌 공장 진출 추진.',
  'AGIBOT announced its 15,000th robot rolled off the production line on June 29, 2026. Growth trajectory: 6 prototypes (2023) → 10,000 units (March 2026) → 15,000 units (June 2026, under 3 months). Production acceleration: 1,000 to 5,000 took one year; 5,000 to 10,000 took three months (4x faster). Omdia ranked AGIBOT first in global humanoid shipments for 2025 with 39% market share. The company achieved the first large-scale industrial implementation of embodied AI in consumer electronics precision manufacturing. Plans to scale deployments to 100 robots in 2026 and expand to global factory floors.',
  'en', 'industry', 'robot',
  md5('agibot-15000-robot-production-milestone-global-expansion-2026-06-29'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","Omdia"],"mentionedRobots":[],"technologies":["embodied AI","consumer electronics precision manufacturing"],"marketInsights":["15,000 robots produced (6 in 2023 → 15K in 2026)","10K to 15K in under 3 months","Omdia #1 global humanoid shipments (39% share)","First large-scale embodied AI in consumer electronics mfg"],"keyPoints":["15K production milestone June 29","4x production acceleration","Global #1 humanoid shipments (Omdia)","Targeting global factory expansion"],"summaryKo":"Agibot 15,000대 생산 달성(6/29). 10K→15K 3개월 미만. Omdia 글로벌 출하 1위(39%). 소비자전자 정밀제조 체화 AI 최초 대규모 구현. 글로벌 확장 추진."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-robot-production-milestone-global-expansion-2026-06-29'));

-- [Figure AI] $39B 기업가치, 총 $2.34B 자금조달 — 최대 순수 휴머노이드 기업 (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure AI Valuation Reaches $39B — Best-Funded Pure-Play Humanoid Company, $2.34B Total Raised, BotQ 12K/yr Capacity',
  'Teahose / Sacra / TechMarketBriefs',
  'https://www.teahose.com/guides/figure-ai-valuation',
  '2026-07-20'::timestamp,
  'Figure AI 기업가치 $39B — 세계 최대 순수 휴머노이드 기업. 총 $2.34B 자금조달(Series C $1B+, Parkway VC 리드, NVIDIA/Intel Capital/Salesforce 참여). BotQ 자체 제조시설 연 12,000대 생산능력. Figure 03: 5''8"/61kg/20kg 페이로드/1.2m/s/러닝 가능. Figure 02는 풀바디 자율 운용(8시간 교대) 달성(2026년 1월). BMW에서 204K+ 패키지 처리.',
  'Figure AI has reached a $39 billion valuation, making it the best-funded pure-play humanoid company globally. Total funding stands at approximately $2.34 billion, with the Series C (September 2025) bringing in over $1 billion led by Parkway Venture Capital with NVIDIA, Intel Capital, and Salesforce participating. BotQ, Figure''s own manufacturing facility, targets annual production of 12,000 units. Figure 03 specs: 5''8" tall, 61 kg, 20 kg payload, 1.2 m/s walking speed with running capability demonstrated. Figure 02 achieved full-body autonomy for 8-hour factory shifts (January 2026 update). Over 204,000 packages handled at BMW.',
  'en', 'industry', 'robot',
  md5('figure-ai-39b-valuation-2.34b-raised-botq-12k-capacity-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Figure AI","NVIDIA","Intel Capital","Salesforce","Parkway VC","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["BotQ manufacturing facility","full-body autonomy"],"marketInsights":["$39B valuation — largest pure-play humanoid","$2.34B total funding","BotQ: 12K units/year capacity","204K+ packages at BMW"],"keyPoints":["$39B valuation","Series C: $1B+ (Parkway VC lead)","Figure 03: 5ft8, 61kg, 20kg payload, running capable","Figure 02: 8-hour autonomous shifts"],"summaryKo":"Figure AI $39B 기업가치, $2.34B 자금조달. BotQ 12K대/년. Figure 03: 61kg/20kg/러닝. Figure 02: 8시간 자율 교대. BMW 204K+ 패키지."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-39b-valuation-2.34b-raised-botq-12k-capacity-2026-07'));

-- [Boston Dynamics] Hyundai $26B 미국 투자 — Atlas 30K/년 조지아 공장 포함 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Announces $26B US Investment Including Atlas Robotics Factory — 30,000 Robots/Year Capacity by 2028',
  'Forbes / Automate.org / The Register',
  'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
  '2026-07-15'::timestamp,
  'Hyundai Motor Group, $26B 미국 투자 계획 발표 — Atlas 로보틱스 공장(조지아주 사바나) 포함. 2028년까지 30,000대/년 Atlas 생산능력 목표. 2026년 생산분 전량 판매 완료: Hyundai RMAC + Google DeepMind. 2027년 초 추가 고객 확보 예정. 생산형 Atlas 사양: 6''2"/198lb/56 DoF/50kg 페이로드/-20~40°C. Gen 5 복잡도 거의 1자릿수(OoM) 감소로 제조 비용 대폭 절감.',
  'Hyundai Motor Group announced a $26 billion investment in US operations, including plans to build a robotics factory near Savannah, Georgia, capable of producing 30,000 Atlas humanoid robots per year by 2028. The entire 2026 Atlas production is sold out, committed to Hyundai''s Robotics Metaplant Application Center (RMAC) and Google DeepMind. Additional customers expected in early 2027. Production Atlas specs: 6''2" tall, 198 lbs, 56 degrees of freedom, 50 kg payload, operating range -20 to 40°C. Fifth-generation design features "almost order of magnitude" complexity reduction, significantly lowering manufacturing costs.',
  'en', 'industry', 'robot',
  md5('hyundai-26b-us-investment-atlas-30k-georgia-factory-2028-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Hyundai","Boston Dynamics","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":["order of magnitude complexity reduction","56 DoF"],"marketInsights":["$26B Hyundai US investment","30K robots/year factory by 2028 (Savannah GA)","2026 production fully sold out","Gen 5: near 10x complexity reduction"],"keyPoints":["$26B US investment includes robotics factory","30K Atlas/year target by 2028","Sold out: Hyundai RMAC + Google DeepMind","6ft2, 198lb, 56 DoF, 50kg payload, -20~40°C"],"summaryKo":"Hyundai $26B 미국 투자 — Atlas 공장(조지아, 30K/년, 2028). 2026년 전량 판매(RMAC+DeepMind). Gen5 복잡도 ~10x 감소. 56 DoF/50kg."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-26b-us-investment-atlas-30k-georgia-factory-2028-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (전략 알림) — 신규 항목
-- ============================================================

-- [CRITICAL] Tesla Optimus Fremont 생산라인 가동 임박
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Tesla] Optimus Fremont 생산라인 가동 임박 — Model S/X 46일 철거 완료, V3 10K 부품, AI5+Grok',
  'Tesla Fremont Model S/X 라인 46일 만에 철거 완료. 7월 말~8월 Optimus V3 생산 시작. 10K 고유 부품, 초기 "극도로 느린" 램프업. AI5 칩(5x 대역폭)+xAI Grok. 연 100만대(Fremont), 1,000만대(Texas 2027) 목표.',
  '{"source":"Yahoo Finance / Teslarati / AI Insider","confidence":"A","date":"2026-07-25","teardown_days":46,"unique_parts":10000,"fremont_target":"1M/yr","texas_target":"10M/yr by 2027","ai_chip":"AI5 (5x bandwidth)","voice_ai":"xAI Grok"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Tesla%Optimus%Fremont%생산라인%가동%'
  AND created_at > '2026-07-25'::timestamp
);

-- [CRITICAL] Agility SPAC 상장 + Digit v5 $300M 수주
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'critical',
  '[Agility] SPAC $2.5B 상장 확정(AGLT) — Digit v5 수주 $300M+, 미국 최초 순수 휴머노이드 상장사',
  'Agility Robotics SPAC 합병 Nasdaq 상장(AGLT). $2.5B 기업가치, $620M+ 조달(휴머노이드 역대 최대). Digit v5 다년 수주 $300M+. 50lb 리프트(40%↑)/22시간/7.2ft 도달. 65K시간 실운용. Fremont AI Hub 200+ 채용.',
  '{"source":"GlobeNewsWire / GeekWire / TechCrunch","confidence":"A","date":"2026-07-28","valuation":"$2.5B","proceeds":"$620M+","orders":"$300M+","ticker":"AGLT","digit_v5":{"lift":"50lb","runtime":"22hr","reach":"7.2ft"},"hours":"65,000+","hub":"60,000 sq ft Fremont"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agility%SPAC%2.5B%AGLT%'
  AND created_at > '2026-07-25'::timestamp
);

-- [WARNING] Figure 03 BMW 배치 + Helix 02 — 109K C++ 대체
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'warning',
  '[Figure AI] Figure 03 BMW 배치 — Helix 02로 109K줄 C++ 대체, 시퀀싱 유즈케이스, 유럽 확장',
  'Figure 03 BMW Spartanburg Hall 52 배치(7/1). Helix 02: 109,504줄 C++ → 단일 신경망 전신 제어. Figure 02 30K대 자동차 조립 기여. 시퀀싱 유즈케이스(실시간 적응). BMW 유럽(라이프치히) 파일럿. $39B 가치.',
  '{"source":"Figure AI Blog / Manufacturing Digital","confidence":"A","date":"2026-07-01","deployment":"BMW Spartanburg Hall 52","ai":"Helix 02","replaced_cpp_lines":109504,"cars_assembled":30000,"european_pilot":"BMW Leipzig","valuation":"$39B"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure%03%BMW%Helix%109K%'
  AND created_at > '2026-06-28'::timestamp
);

-- [INFO] Unitree STAR Market IPO 최단 승인
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'info',
  '[Unitree] STAR Market IPO 승인($618M/$5.9B) — 104일 최단, 20K대 목표, G1 하네다공항 배치',
  'Unitree STAR Market IPO 승인(7/3): $618M, $5.9B 가치. 104일 최단 심사 기록. 2026년 20K대 목표(4x). G1 하네다공항 JAL 배치(최초 공항). H2 $29,900 NVIDIA Thor. 15K대 누적 생산.',
  '{"source":"Caixin Global / BigGo Finance","confidence":"A","date":"2026-07-03","ipo_amount":"$618M","valuation":"$5.9B","review_days":104,"2026_target":20000,"cumulative":15000,"airport":"Haneda JAL","h2_price":"$29,900"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%STAR%IPO%618M%'
  AND created_at > '2026-07-01'::timestamp
);

-- [INFO] 1X NEO 로봇 핸드 + 생산 상황
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'score_spike', 'info',
  '[1X] NEO 로봇 핸드 공개(인간 수준 그립) — 10K대 5일 매진, 고객 배송 미확인',
  '1X NEO 로봇 핸드 공개(7/13): 인간 수준 그립 강도. Hayward 공장 58Ksf 가동. 10K대 용량 5일 매진. $20K 구매/$499월 렌탈. EQT 10K대 계약(2026~2030). 7/16 기준 고객 배송 미확인.',
  '{"source":"Dezeen / TBPN Digest / Forbes","confidence":"A","date":"2026-07-13","hand":"human-level grip","factory":"58K sq ft Hayward","capacity":"10K/yr","sold_out_days":5,"price":"$20K or $499/mo","eqt_deal":"10K robots","delivery_status":"unverified as of July 16"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%1X%NEO%로봇 핸드%그립%'
  AND created_at > '2026-07-10'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림) — 신규 항목
-- ============================================================

-- Tesla Fremont 생산라인 전환
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Yahoo Finance / Teslarati',
  'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
  'Tesla Optimus Fremont 생산라인 가동 임박(7월 말~8월) — Model S/X 46일 철거, 10K 부품, AI5+Grok',
  'Model S/X 라인 46일 철거. Optimus V3 10K 부품. AI5(5x 대역폭)+Grok. Fremont 100만/Texas 1000만 목표.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla%Optimus%Fremont%생산라인%가동%'
  AND detected_at > '2026-07-25'::timestamp
);

-- Figure 03 BMW 배치
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Figure AI Blog / Manufacturing Digital',
  'https://www.figure.ai/news/f-03-at-bmw',
  'Figure 03 BMW Spartanburg 배치(7/1) — Helix 02 AI, 109K줄 C++ 대체, 시퀀싱 유즈케이스',
  'Hall 52 배치. Helix 02: 109K C++→신경망. Figure 02 30K대 조립. 시퀀싱. BMW 유럽 파일럿.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure 03%BMW%Spartanburg%Helix%'
  AND detected_at > '2026-06-28'::timestamp
);

-- Agility SPAC 상장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'GlobeNewsWire / GeekWire',
  'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
  'Agility SPAC $2.5B 상장 확정(AGLT) — Digit v5 수주 $300M+, Fremont AI Hub 개설(7/28)',
  '$2.5B, $620M+ 조달. Digit v5: 50lb/22hr/7.2ft. $300M+ 수주. 65K시간 실운용. Fremont 60Ksf 허브.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility%SPAC%2.5B%AGLT%Digit%'
  AND detected_at > '2026-07-25'::timestamp
);

-- Apptronik Robot Park + Google DeepMind
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Robotics & Automation News',
  'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
  'Apptronik Robot Park 개설(7/6) — Google DeepMind Gemini Robotics 통합, Apollo 2 공개',
  'Robot Park 훈련 시설. DeepMind Gemini Robotics. Apollo 2(이족/바퀴). Apollo 3(2027 상업). $935M+/$5B.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR name ILIKE '%Apollo%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Apptronik%Robot Park%DeepMind%Apollo%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Unitree IPO 승인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Caixin Global',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  'Unitree STAR Market IPO 승인(7/3) — $618M/$5.9B, 104일 최단, 20K대 목표',
  'IPO $618M, $5.9B. 104일 최단 심사. 20K대/2026. G1 하네다. H2 $29,900. 15K 누적.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%STAR%IPO%618M%'
  AND detected_at > '2026-07-01'::timestamp
);

-- 1X NEO 핸드
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Dezeen / TBPN Digest',
  'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
  '1X NEO 로봇 핸드 공개(7/13) — 인간 수준 그립, 10K 용량 5일 매진, 배송 미확인',
  '인간 수준 그립 핸드. 58Ksf Hayward 공장. 10K 5일 매진. $20K/$499월. EQT 10K 계약. 미배송.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR name ILIKE '%NEO%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X%NEO%로봇 핸드%인간%그립%'
  AND detected_at > '2026-07-10'::timestamp
);

-- Agibot 15K 생산
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'WebProNews / AI Insider',
  'https://www.webpronews.com/chinas-agibot-hits-15000-robots-and-eyes-factory-floors-worldwide/',
  'Agibot 15,000대 생산 달성(6/29) — 10K→15K 3개월, 글로벌 출하 1위(39%), 수출 확대',
  '15K 로봇. 10K→15K <3개월. Omdia 글로벌 1위(39%). 소비자전자 제조 체화 AI. 글로벌 확장.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%15,000%생산%달성%'
  AND detected_at > '2026-06-25'::timestamp
);

-- Hyundai $26B 투자 + Atlas 공장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / Automate.org',
  'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
  'Hyundai $26B 미국 투자 — Atlas 30K/년 조지아 공장(2028), 2026 전량 판매, Gen5 OoM 감소',
  '$26B 투자. 30K/년 조지아 2028. 2026 전량 판매(RMAC+DeepMind). Gen5 ~10x 간소화. 56DoF/50kg.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Hyundai%26B%Atlas%30K%조지아%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 10 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 5 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 8 (deduplicated by headline + date)
-- Total: up to 23 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처: 9건
--     Tesla Fremont 생산라인 전환 (Yahoo Finance/Teslarati — 공식 보도)
--     Tesla Optimus 램프업 경고 (AI Insider/TrendForce — 실적 콜 기반)
--     Figure 03 BMW 배치 (Figure AI Blog — 공식 블로그)
--     Agility SPAC 상장 (GlobeNewsWire — 공식 보도자료)
--     Apptronik Robot Park (Robotics & Automation News — 공식 발표)
--     Unitree IPO 승인 (Caixin Global — 공식 규제 기관)
--     1X NEO 핸드 (Dezeen — 공식 인터뷰/공개)
--     Agibot 15K 생산 (WebProNews / AI Insider — 공식 발표)
--     Hyundai $26B 투자 (Forbes — 공식 발표)
-- [B] 2개 이상 매체 교차확인: 1건
--     Figure AI $39B 기업가치 (Teahose/Sacra/TechMarketBriefs — 복수 매체)
--
-- NOTE: Railway PostgreSQL은 이 실행 환경에서 TCP 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-29.sql
-- ============================================================
