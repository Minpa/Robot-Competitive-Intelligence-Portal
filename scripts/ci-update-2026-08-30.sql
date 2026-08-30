-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-30
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-08-30.sql

BEGIN;

-- ============================================================
-- 0. 신규 경쟁사 추가 (ci_competitors에 미등록 기업)
-- ============================================================

INSERT INTO ci_competitors (id, slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  (gen_random_uuid(), 'unitree', 'G1/H1', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  (gen_random_uuid(), 'apptronik', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  (gen_random_uuid(), 'agibot', 'A3 Ultra', 'AGIBOT', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Agility Robotics SPAC 상장 — $2.5B 밸류, 미국 최초 순수 휴머노이드 상장사
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
VALUES
  (gen_random_uuid(), 'GeekWire / Agility Robotics / Automate.org',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   '[Critical] Agility Robotics SPAC 상장 발표: Churchill Capital XI 합병, $2.5B 밸류, $600M+ 조달',
   '6/24 발표. Churchill Capital Corp XI와 합병으로 미국 최초 순수 휴머노이드 상장사 탄생 예정. 암시적 기업가치 ~$2.5B, 예상 조달 $600M+. 기존 $300M+ 다년 Digit v5 수주 확보. 9개 고객 시설에서 65,000+ 운영시간 누적. GXO SPANX 시설 100,000+ 토트 처리. NVIDIA Halos 안전 플랫폼 최초 통합. Digit v5: AI 기반 협업안전 휴머노이드.',
   (SELECT id FROM ci_competitors WHERE slug = 'digit'),
   '2026-08-30'::timestamp, 'pending'),

-- 2. [Critical] Figure AI IPO 추진 — $39B 밸류에이션, 시리즈C $1B 완료 후 상장 준비
  (gen_random_uuid(), 'TechCrunch / Forge Global / TSG Invest / Axis Intelligence',
   'https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/',
   '[Critical] Figure AI IPO 추진: $39B 밸류, 총 $1.9B 조달 — 휴머노이드 최대 기업가치',
   '7/5 TechCrunch 보도. Figure AI 상장 준비 중, 최근 시리즈C $1B @$39B 밸류에이션. 총 누적 $1.9B 조달. Figure 02: BMW Spartanburg 10개월 실전(90,000+ 부품 적재, 30,000대 X3 기여, 1,250+ 러닝타임). Figure 03: 완전자율 24/7 운영 실증, 야외 2m/s 조깅, 패키지 분류·라벨·컨베이어 작업. BotQ 공장 연 12,000대 생산 능력. CEO "가정용은 시기상조" 발언.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   '2026-08-30'::timestamp, 'pending'),

-- 3. [Warning] 1X Technologies NEO 양산 개시 — Hayward 공장 10,000대 5일만에 완판
  (gen_random_uuid(), 'Forbes / GlobeNewswire / The Robot Report / eWeek',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '[Warning] 1X NEO 양산 돌입: Hayward CA 공장 가동, 10,000대 첫해 물량 5일만에 완판',
   '4/30 Hayward CA 58,000sqft 공장에서 NEO 풀스케일 생산 개시. 미국 최초 수직통합 휴머노이드 공장. 10,000대 첫해 생산분 5일 만에 완판. 2027년 100,000대 확장 계획. 가격 $20,000(구매) 또는 $500/월(렌트). 동작 소음 22dB(냉장고 수준). 핵심 부품 자체 제조(글로벌 공급망 비의존). 2026년 말 첫 고객 배송 예정, 아직 실제 인도 미확인.',
   (SELECT id FROM ci_competitors WHERE slug = 'neo'),
   '2026-08-30'::timestamp, 'pending'),

-- 4. [Info] Boston Dynamics: Hyundai $26B 미국 투자에 30K/년 로봇 공장 포함, DeepMind Gemini 통합
  (gen_random_uuid(), 'Forbes / Engadget / Automate.org / The Register',
   'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
   '[Info] BD Atlas: Hyundai $26B 미국 투자 내 연 30,000대 로봇 공장 건설 — DeepMind Gemini 통합',
   'Hyundai Motor Group $26B 미국 투자에 연간 30,000대 생산 로봇 공장 포함. CES 2026 생산형 Atlas 공개 — 리치 7.5ft, 페이로드 110lbs, -4~40°C 운영. Google DeepMind와 Gemini Robotics 모델 탑재: 환경 인식·태스크 추론·자율 작업 강화. 초기 배치: Hyundai RMAC + Google DeepMind. 2026년 전량 예약(fully committed). 2027년 추가 고객 확대.',
   (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
   '2026-08-30'::timestamp, 'pending'),

-- 5. [Info] Unitree IPO 최종 결과: 8/19 종가 487%↑, 시총 $53B, DeepSeek 전략 투자
  (gen_random_uuid(), 'CNBC / KraneShares / ValueAddVC / TechTimes',
   'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
   '[Info] Unitree IPO 상세: 8/19 종가 +487%, 장중 +629%, 시총 $53B, 개인 8,000x 초과청약',
   '8/19 STAR Market 데뷔. IPO가 ¥150.80, 장중 +629%, 종가 +487%. 시총 ~$53B(¥342B). 6.1B위안($905M) 조달. 개인 투자자 8,000x 초과청약. CSRC 역대 최단 104일 만에 승인. DeepSeek ¥140.8M 전략 투자 참여. 2025 매출 ¥1.708B(+335% YoY), 마진 ~60%, 5,500+ 휴머노이드 출하(글로벌 최다). H1 2026 성장률 ~40%로 둔화.',
   (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
   '2026-08-30'::timestamp, 'pending'),

-- 6. [Info] AGIBOT: HK IPO 추진 + Omdia 글로벌 출하량 1위 + 소비자전자 양산라인 투입
  (gen_random_uuid(), 'Capital.com / WebProNews / The AI Insider / eWeek',
   'https://capital.com/en-int/learn/ipo/agibot-ipo',
   '[Info] AGIBOT HK IPO 추진: Q3 2026 목표, Omdia 글로벌 출하 1위(39%), 소비자전자 양산 투입',
   'AGIBOT 홍콩 IPO 추진 중, Q3 2026 상장 목표. 상하이 기반. Omdia 2025 글로벌 휴머노이드 출하량 1위(39% 점유율). IDC: 엔터테인먼트·연구·교육·전시·접객·제조 전 부문 1위. 15,000대 누적 출하. 소비자전자 정밀제조 양산라인 최초 대규모 투입. 5대 로봇 플랫폼·8개 AI 모델 포트폴리오. 2026 Partner Conference: "Deployment Year One" 선언.',
   (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
   '2026-08-30'::timestamp, 'pending'),

-- 7. [Info] Tesla Optimus: Texas Giga 10M/년 2세대 라인 설계 중, xAI Digital Optimus 협업
  (gen_random_uuid(), 'The Robot Report / TrendForce / optimusk.blog',
   'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
   '[Info] Tesla: Texas 2세대 라인 10M/년 목표 설계 착수, xAI "Digital Optimus" 프로젝트 공개',
   'Giga Texas에 Optimus 2세대 생산라인 설계 중, 장기 목표 연간 10M대 생산. 부지 준비 진행 중. 3/11 xAI와 "Digital Optimus" / Macrohard 공동 프로젝트 발표. Fremont 1세대 라인 1M/년 설계 용량. 초기 생산은 "literally impossible to predict" — 10,000개 고유 부품, 완전 신규 라인. 첫 외부 상용 고객 2026년 말 예상.',
   (SELECT id FROM ci_competitors WHERE slug = 'optimus'),
   '2026-08-30'::timestamp, 'pending'),

-- 8. [Info] Apptronik: 2026년 내 신규 로봇 공개 예고, John Deere·QIA 전략 투자자 합류
  (gen_random_uuid(), 'CNBC / SiliconANGLE / Robotics & Automation News',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   '[Info] Apptronik: 밸류에이션 $5B 확인, 2026 신규 로봇 공개 예고, John Deere·QIA 합류',
   'CNBC 확인 밸류에이션 ~$5B(시리즈A 확장 $520M 기준). 신규 전략 투자자: AT&T Ventures·John Deere·QIA(카타르투자청). John Deere 합류 = 농업·건설 분야 확장 신호. 2026년 내 Apollo 후속 "highly anticipated new robot" 공개 예고. Robot Park(Austin) 데이터 수집·훈련 시설 구축. DeepMind Gemini Robotics On-Device: 50-100 시연으로 새 태스크 적응.',
   (SELECT id FROM ci_competitors WHERE slug = 'apptronik'),
   '2026-08-30'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Agility] SPAC 상장 발표
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics to Go Public via $2.5B SPAC: First Pure-Play U.S. Humanoid Public Company',
  'GeekWire / Agility Robotics / Automate.org',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  '2026-06-24'::timestamp,
  'Agility Robotics announced June 24, 2026 it will go public through a merger with Churchill Capital Corp XI at a ~$2.5B implied valuation, becoming the first publicly traded U.S. company dedicated solely to humanoid robots. The deal is expected to generate $600M+ in proceeds. Agility has $300M+ in multi-year Digit v5 orders across 9 customer facilities with 65,000+ operational hours. Key customers include GXO, Schaeffler, Toyota Canada, and Mercado Libre. Agility also became the first to integrate NVIDIA''s Halos safety platform.',
  'Agility Robotics SPAC IPO announcement analysis (August 30 consolidated). Transaction details: merger with Churchill Capital Corp XI (blank-check company). Implied enterprise value: ~$2.5 billion. Expected proceeds: $600M+ total. Announcement date: June 24, 2026. This makes Agility the first publicly traded U.S. company focused exclusively on humanoid robots. Commercial traction: $300M+ in multi-year contracted Digit v5 orders. 9 customer facilities currently operating Digit robots. 65,000+ cumulative operational hours across all deployments. Key customer deployments: (1) GXO Logistics SPANX facility in Flowery Branch, Georgia — moved 100,000+ totes since June 2024. (2) Schaeffler auto-parts plant in Cheraw, South Carolina — running 8-hour daily factory shifts since early 2025. (3) Toyota Motor Manufacturing Canada. (4) Mercado Libre (Latin American e-commerce). Technology advancement: Agility became the first firm to integrate NVIDIA''s new Halos safety platform into Digit, enhancing safe human-robot collaboration. Digit v5 is designed as the world''s first AI-enabled cooperatively safe humanoid robot. Financial details from GeekWire filings analysis: not yet profitable but rapidly scaling revenue. Proceeds to fund: fulfillment of existing orders, expansion of commercial deployments, scaling of Digit v5 production.',
  'en', 'business', 'robot',
  md5('agility-robotics-spac-2.5b-churchill-capital-2026-08-30'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","GXO","Schaeffler","Toyota","Mercado Libre","NVIDIA"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos"],"marketInsights":["$2.5B valuation","$600M+ proceeds","$300M+ orders","65,000+ operational hours"],"keyPoints":["First pure-play humanoid IPO","SPAC via Churchill Capital XI","9 customer facilities","NVIDIA Halos integration"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-robotics-spac-2.5b-churchill-capital-2026-08-30'));

-- [Figure AI] IPO 추진 + $39B 밸류
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Heads Toward IPO at $39B Valuation: $1.9B Total Funding, Figure 03 Achieves 24/7 Autonomy',
  'TechCrunch / Forge Global / TSG Invest',
  'https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/',
  '2026-07-05'::timestamp,
  'Figure AI is preparing to go public at a $39B valuation after closing a $1B Series C round. Total funding across all rounds has reached approximately $1.9B, making it one of the most well-capitalized robotics companies globally. Figure 02 completed 10 months of production shifts at BMW Spartanburg, loading 90,000+ parts across 1,250+ runtime hours and contributing to 30,000+ BMW X3 vehicles. Figure 03 demonstrates fully autonomous 24/7 operation including outdoor jogging at 2 m/s. BotQ factory targets 12,000 units/year initially.',
  'Figure AI IPO and business update analysis (August 30 consolidated). IPO plans: Figure AI preparing for public listing. Most recent valuation: $39 billion (Series C round). Total funding: approximately $1.9 billion across all rounds. Series C: $1 billion at $39B valuation. Major investors include Microsoft, NVIDIA, OpenAI, Jeff Bezos, Salesforce. CEO Brett Adcock statement: not promising a robot in every home anytime soon — focus remains on industrial and commercial applications. Figure 02 BMW deployment results (10 months at Spartanburg): ran daily 10-hour shifts Monday through Friday. Loaded over 90,000 sheet metal parts. Accumulated 1,250+ runtime hours. Contributed to production of more than 30,000 BMW X3 vehicles. Figure 03 capabilities: fully autonomous 24/7 operation demonstrated without human supervision. Outdoor jogging at 2 meters per second. Package sorting, label-side-down placement, conveyor delivery. Autonomous operation across day and night cycles. BotQ manufacturing facility: owned and operated by Figure AI. Initial design capacity: 12,000 units per year. Scaling target: 100,000 units within 4 years. 1,000th Figure 03 unit produced in July 2026. Production ramp: from 1 unit/day (January) to 1 unit/hour (April) — 24x throughput increase in 120 days. Battery line yield: 99.3% over 500+ packs. 350+ total robots shipped to date.',
  'en', 'business', 'robot',
  md5('figure-ai-ipo-39b-figure03-autonomous-2026-08-30'),
  '{"mentionedCompanies":["Figure AI","BMW","Microsoft","NVIDIA","OpenAI"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["autonomous 24/7 operation","outdoor locomotion"],"marketInsights":["$39B valuation","$1.9B total funding","12,000 units/yr BotQ","350+ shipped"],"keyPoints":["IPO in preparation","90,000+ parts at BMW","Figure 03 24/7 autonomy","1 unit/hour production rate"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-ipo-39b-figure03-autonomous-2026-08-30'));

-- [1X Technologies] NEO 양산 및 공장 가동
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Technologies Launches Full-Scale NEO Production: 10,000 Units Sold Out in 5 Days, $20K Consumer Price',
  'Forbes / GlobeNewswire / The Robot Report / eWeek',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-04-30'::timestamp,
  '1X Technologies commenced full-scale production of its NEO humanoid robot at a new 58,000 sqft factory in Hayward, California on April 30, 2026 — America''s first vertically integrated humanoid robot factory. The initial production batch of 10,000 units for the first year was sold out within 5 days. Pricing is set at $20,000 (purchase) or ~$500/month (rental). Plans to scale to 100,000 units by 2027. Operating noise of just 22 dB. Key components are manufactured on-site. First consumer deliveries planned for end of 2026 but no verified deliveries yet as of August 2026.',
  '1X Technologies NEO factory launch and production analysis (August 30 consolidated). Factory details: NEO Factory in Hayward, California. 58,000 square feet (5,388 m²). Opened April 30, 2026. Described as America''s first vertically integrated humanoid robot factory. Key manufacturing approach: own on-site manufacturing for many critical components rather than relying on global suppliers. This vertical integration strategy reduces supply chain risk. Sales performance: initial production batch of 10,000 units sold out within 5 days of announcement. Pricing: $20,000 purchase price or approximately $500/month rental. Scaling plans: 10,000 robots in year one. Target: 100,000+ units annually by 2027. Technical specifications: operating noise approximately 22 dB (roughly equivalent to a refrigerator). Designed as a household humanoid robot for consumer market. Delivery timeline: first deliveries to private customers planned by end of 2026. As of July 16, 2026, no verified customer delivery could be found. 1X materials still describe first customer shipments in future tense. Company background: founded in Norway (1X Technologies AS, formerly Halodi Robotics). OpenAI-backed. Total funding includes significant rounds from OpenAI and other tech investors. Consumer robotics positioning distinguishes 1X from most competitors focused on industrial/commercial applications.',
  'en', 'business', 'robot',
  md5('1x-neo-factory-10000-sold-out-hayward-2026-08-30'),
  '{"mentionedCompanies":["1X Technologies","OpenAI"],"mentionedRobots":["NEO"],"technologies":["vertical integration","low-noise design"],"marketInsights":["10,000 units sold out in 5 days","$20K purchase / $500/mo rent","100K/yr target 2027","22dB noise"],"keyPoints":["First US vertically integrated humanoid factory","Consumer market pricing","No verified deliveries yet","58,000 sqft Hayward CA"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-factory-10000-sold-out-hayward-2026-08-30'));

-- [Boston Dynamics] Hyundai $26B 투자 + DeepMind Gemini 통합
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Atlas: Hyundai $26B US Investment Includes 30K/Year Robot Factory, DeepMind Gemini Integration',
  'Forbes / Engadget / Automate.org / The Register',
  'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
  '2026-08-30'::timestamp,
  'Hyundai Motor Group''s $26 billion US investment includes plans to build a robotics factory capable of producing 30,000 Atlas robots per year. Boston Dynamics, a Hyundai subsidiary, has Atlas 2026 production fully committed with initial deployments to Hyundai''s Robotics Metaplant Application Center (RMAC) and Google DeepMind. The partnership with Google DeepMind integrates Gemini Robotics models into Atlas for enhanced perception, task reasoning, and autonomous operation. Production-ready Atlas debuted at CES 2026 with specs: 7.5ft reach, 110 lbs payload, -4 to 104°F operating range.',
  'Boston Dynamics Atlas production and partnership update (August 30 consolidated). Hyundai investment context: Hyundai Motor Group announced $26 billion total investment in U.S. operations. Investment includes plans to build a new robotics factory. Factory production capacity: 30,000 robots per year. This represents the largest known committed humanoid robot production facility. Production status: all Atlas deployments for 2026 are fully committed (sold out). Boston headquarters manufacturing the initial production units. Initial deployment destinations: (1) Hyundai Robotics Metaplant Application Center (RMAC) — testing and integration of Atlas in automotive manufacturing workflows. (2) Google DeepMind — research collaboration on autonomous capabilities. Google DeepMind partnership: integrating Gemini Robotics AI models directly into Atlas. Goals: enhanced environmental perception, task reasoning and planning, more autonomous operation on factory floors. This represents one of the most significant AI-robotics partnerships in the industry. Atlas specifications (CES 2026 production version): reach up to 7.5 feet. Payload capacity: 110 pounds (50 kg). Operating temperature range: -4°F to 104°F (-20°C to 40°C). Full rotational joints. Modular field-replaceable components. 56 degrees of freedom. Timeline: 2026 — initial fleet deliveries (RMAC, DeepMind). 2027 — expanded customer base. 2028 — Hyundai automotive factory integration (parts sequencing). 2030 — component assembly tasks.',
  'en', 'product', 'robot',
  md5('bd-atlas-hyundai-26b-deepmind-gemini-30k-2026-08-30'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":["Gemini Robotics","modular field-replaceable design"],"marketInsights":["$26B Hyundai investment","30,000 robots/year factory","2026 fully committed","7.5ft reach 110lbs payload"],"keyPoints":["Largest committed humanoid factory","DeepMind Gemini integration","CES 2026 production debut","2028 Hyundai auto factory target"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-hyundai-26b-deepmind-gemini-30k-2026-08-30'));

-- [Unitree] IPO 상세 결과 + DeepSeek 투자
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Robotics IPO Soars 487% on Day One: $53B Valuation, 8,000x Oversubscribed, DeepSeek Backing',
  'CNBC / KraneShares / ValueAddVC / TechTimes',
  'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
  '2026-08-19'::timestamp,
  'Unitree Robotics debuted on Shanghai''s STAR Market on August 19, 2026. The stock surged 629% intraday and closed up 487%, valuing the company at roughly $53 billion. The IPO raised 6.1 billion yuan ($905M), priced at ¥150.80/share, and received the fastest CSRC approval in STAR Market history (104 days). Retail investors oversubscribed 8,000x. Chinese AI company DeepSeek invested ¥140.8M. Unitree shipped 5,500+ humanoid robots in 2025 (global most), with revenue of ¥1.708B (+335% YoY) at ~60% gross margins. However, H1 2026 revenue growth decelerated to ~40% YoY.',
  'Unitree Robotics IPO comprehensive analysis (August 30 consolidated). IPO details: listing on Shanghai STAR Market, August 19, 2026. IPO price: ¥150.80 per share (~$22.30). Funds raised: 6.1 billion yuan (~$905 million). Day 1 trading: opened with immediate surge, hit +629% intraday peak (¥1,100). Closed at +487% (¥845 adjusted). Implied market cap at close: ~$53 billion (¥342 billion). Subsequent trading through August 28: stock declined to ¥585, down 45% from Day 1 peak. Regulatory process: CSRC approved in just 104 days — fastest approval in STAR Market history. Demand: retail investors oversubscribed 8,000 times. Strategic investors: Chinese AI company DeepSeek invested approximately ¥140.8 million (~$19.4M). DeepSeek investment signals AI-robotics convergence thesis. Financial performance (2025): revenue ¥1.708 billion (~$235M), +335% year-over-year. Gross margins approximately 60%. Shipped 5,500+ humanoid robots (more than any other company globally). Product portfolio: G1 (compact humanoid), H1 (full-size humanoid), R1 (newer model), H2 (latest), plus Go2, B2, A2 quadrupeds. Growth concern: H1 2026 revenue growth decelerated to approximately 40% year-over-year (from 335% in 2025). This deceleration, combined with Q1 2026 adjusted net profit drop of 53%, has fueled the stock''s decline from peak.',
  'en', 'business', 'robot',
  md5('unitree-ipo-487pct-53b-deepseek-star-market-2026-08-30'),
  '{"mentionedCompanies":["Unitree Robotics","DeepSeek"],"mentionedRobots":["G1","H1","H2","R1","B2"],"technologies":[],"marketInsights":["$53B market cap","$905M raised","8,000x oversubscribed","5,500+ humanoids shipped 2025"],"keyPoints":["487% Day 1 close","DeepSeek ¥140.8M investment","Fastest STAR Market approval","H1 2026 growth slowing to 40%"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-ipo-487pct-53b-deepseek-star-market-2026-08-30'));

-- [AGIBOT] HK IPO + 글로벌 출하 1위
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT Plans Hong Kong IPO in Q3 2026: Global #1 Humanoid Shipments, 15,000 Units, Consumer Electronics Deployment',
  'Capital.com / WebProNews / The AI Insider / eWeek',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-08-30'::timestamp,
  'AGIBOT (Shanghai) is preparing a Hong Kong IPO targeting Q3 2026. The company ranked #1 globally in humanoid robot shipments for 2025 with 39% market share (Omdia) and #1 across all segments (IDC). Cumulative 15,000 robots shipped. Revenue grew from RMB 300K to RMB 1B+ in three years. AGIBOT deployed robots on a consumer electronics precision manufacturing mass-production line — the first large-scale industrial embodied AI deployment in the sector. Five robot platforms and eight AI models launched at 2026 Partner Conference under "Deployment Year One" banner.',
  'AGIBOT business and IPO update analysis (August 30 consolidated). IPO plans: AGIBOT Innovation (Shanghai) Technology Co., Ltd. preparing Hong Kong IPO. Expected preliminary prospectus filing: early 2026. Target listing: Q3 2026. Shanghai-based company with global operations. Market position: Omdia ranked AGIBOT #1 globally in humanoid robot shipments for 2025, with 39% market share. IDC ranked AGIBOT #1 in total volume and across entertainment, research, education, exhibition, reception, and manufacturing segments. This establishes AGIBOT as the current volume leader in humanoid robotics worldwide. Production: 15,000 cumulative robots shipped (as of late June 2026, with 15,000th unit rolling off the line). Revenue trajectory: RMB 300K (year 1) → RMB 60M (year 2) → RMB 1B+ (2025). This represents one of the fastest revenue scaling stories in the robotics industry. Industrial deployment milestone: deployed robots on a consumer electronics precision manufacturing mass-production line. Described as the first large-scale industrial implementation of embodied AI in the consumer electronics sector. 2026 strategy: Partner Conference declared "Deployment Year One." Launched five robotic platforms and eight AI models. Products include: A3 Ultra (humanoid), G2 Max (heavy payload), OmniHand 3 Ultra-M (dexterous hand), X2 Edu (education), plus existing lineup. International presence: CES 2026 U.S. debut, MWC 2026 showcase, World Humanoid Robot Games medal leader (46 medals).',
  'en', 'business', 'robot',
  md5('agibot-hk-ipo-q3-global-1-shipments-15000-2026-08-30'),
  '{"mentionedCompanies":["AGIBOT","Omdia","IDC"],"mentionedRobots":["A3 Ultra","G2 Max","X2 Edu"],"technologies":["OmniHand 3 Ultra-M","embodied AI"],"marketInsights":["39% global market share","15,000 cumulative units","RMB 1B+ revenue","HK IPO Q3 2026"],"keyPoints":["Global #1 humanoid shipments (Omdia)","First consumer electronics mass production","Deployment Year One declared","HK IPO preparation"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-hk-ipo-q3-global-1-shipments-15000-2026-08-30'));

COMMIT;
