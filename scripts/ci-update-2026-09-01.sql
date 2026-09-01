-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-01
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-01.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Tesla Optimus V3 Fremont 양산라인 가동 시작 — 10,000 고유부품, TSMC/Samsung/Micron 공급망 확정
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'The Robot Report / Electrek / Digitimes / TheAIInsider',
   'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
   '[Critical] Tesla Optimus V3: Fremont S/X 라인 전환 완료, 양산 개시 — TSMC·Samsung·Micron 핵심 파트너 공식 확정',
   'Q2 2026 실적콜(7/22)에서 TSMC·Samsung·Micron을 Optimus 핵심 파트너로 공식 지명. Fremont Model S/X 라인 4개월 만에 해체→V3 전용 생산라인 전환 완료, 8월 말 양산 개시. 단 Musk는 "초기 산출량 극히 저조할 것, 예측 불가" 경고. 10,000개 고유 부품 포함 완전 신규 라인. Giga Texas 제2공장 2027년 여름 착공 예정. V3 스펙: 173cm, 57kg, 22DoF 핸드, 50개 액추에이터. 장기 목표가 $20K-30K이나 현 단가 $50K-100K+. 소비자 판매 2027년 말 이후.',
   '2026-09-01'::timestamp, 'pending'),

-- 2. [Critical] Boston Dynamics Atlas 5세대 공개 — "복잡도 차수 급감", Hyundai 30K/년 공장 풀가동
  (gen_random_uuid(), 'Forbes / Engadget / Robotics247',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   '[Critical] BD Atlas Gen5 공개: 복잡도 "거의 10배 감소" — 2026년 전량 예약완료, 30K/년 생산체제',
   '7/2 Forbes 보도: 5세대 Atlas 공개. 기존 대비 "almost order of magnitude" 복잡도 감소. 리치 7.5ft, 페이로드 50kg(110lbs), 운영온도 -20~40°C. 배터리 4시간, 3분 핫스왑. 2026년 전량 fully committed(Hyundai RMAC + Google DeepMind). 연 30,000대 생산 공장 가동 중. CES 2026 Best Robot 수상. Hyundai $26B 미국 투자 프로그램의 핵심 요소.',
   '2026-09-01'::timestamp, 'pending'),

-- 3. [Critical] Figure AI Figure 03: BotQ 공장 시간당 1대 생산 달성, BMW 실전 30,000대 X3 기여
  (gen_random_uuid(), 'Figure AI / Time / Forbes / Axis Intelligence',
   'https://www.figure.ai/news/ramping-figure-03-production',
   '[Critical] Figure AI: BotQ 공장 일1대→시1대 120일만에 달성, Figure 02 BMW 30,000대 X3 기여 실적',
   'Figure 03 생산 BotQ 공장에서 120일 만에 일 1대→시간당 1대로 램프업. Figure 02 BMW Spartanburg 11개월 실전 배치: 1,250+ 운영시간, 30,000대 X3 생산 기여. Figure 03: 소프트 세탁가능 텍스타일, 무선충전, 음성인터랙션. 패키지 분류 자율 실증: 204,000개+ 처리(163시간). 시리즈C $1B @$39B 밸류. 총 조달 $1.9B. 연 12,000대 생산 능력. 가정용 시장 공개 타겟팅.',
   '2026-09-01'::timestamp, 'pending'),

-- 4. [Warning] Unitree IPO 후 주가 급락 지속 — 피크 대비 -47%, Q1 이익 53%↓, 범용화 과제 인정
  (gen_random_uuid(), 'CNBC / Caixin Global / Forbes',
   'https://www.cnbc.com/2026/08/21/chinese-humanoid-robots-face-challenge-of-their-own-capabilities.html',
   '[Warning] Unitree: IPO 피크 ¥1,100→¥585(-47%), Q1 순익 -53% — 창업자 "ChatGPT moment 2-10년"',
   'IPO(8/19) Day1 피크 ¥1,100에서 8/28 ¥585로 -47% 조정. Q1 2026 조정순이익 ¥40M(YoY -53%). 생산 4배 확대 계획(20,000대/년). 2025년 5,500+대 출하(글로벌 1위). G1 $13,500 백오더. 창업자 WRC 발언: "범용화 부족이 최대 난제, ChatGPT moment 2-10년". IPO 조달 $905M, 시총 피크 $53B→현재 ~$32B. STAR Market 상장. 보안 취약점(하드코딩 BT키) 발견 보도.',
   '2026-09-01'::timestamp, 'pending'),

-- 5. [Warning] Agility Robotics SPAC $2.5B 상장 + Mercado Libre·Toyota Canada 배치 확대
  (gen_random_uuid(), 'GeekWire / Agility Robotics / Robotics247',
   'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
   '[Warning] Agility: SPAC $2.5B 상장 + Mercado Libre TX 배치, Toyota Canada 상용계약 체결',
   'Churchill Capital Corp XI 합병으로 미국 최초 순수 휴머노이드 상장사 예정. 밸류 $2.5B. Mercado Libre TX 풀필먼트 Digit 배치 합의. Toyota Motor Manufacturing Canada: 1년 파일럿→상용계약(7-10대). 9개 고객시설 65,000+ 운영시간. RoboFab 연 10,000대 생산능력. Digit v5: AI 기반 협업안전 휴머노이드. GXO·Schaeffler·Amazon 배치 중.',
   '2026-09-01'::timestamp, 'pending'),

-- 6. [Warning] Apptronik: 시리즈A $935M 마감, $5.3B 밸류, Google DeepMind Gemini 전략 파트너
  (gen_random_uuid(), 'CNBC / Apptronik / RoboticsTomorrow',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   '[Warning] Apptronik 시리즈A $935M: $5.3B 밸류, Google DeepMind Gemini Robotics 파트너십 심화',
   '시리즈A 총 $935M(초기 $415M+확장 $520M). 밸류 $5.3B. 신규투자: AT&T Ventures·John Deere·QIA. 기존: B Capital·Google·Mercedes·PEAK6. Robot Park(Austin) 6월 확장개장 — Apollo 2 데이터수집·Gemini Robotics 실증. DeepMind Gemini On-Device: 50-100 시연으로 신규태스크 적응. Apollo 3 상용제품 2027 출시 예고. Elevate Robotics 자회사: 초인간 산업자동화 특화.',
   '2026-09-01'::timestamp, 'pending'),

-- 7. [Warning] 1X Technologies NEO: Hayward 공장 가동, 10,000대 5일 완판, $20K 가격
  (gen_random_uuid(), 'Forbes / eWeek / The Robot Report / BusinessWire',
   'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
   '[Warning] 1X NEO: 미국 첫 수직통합 공장 가동, 10K대 5일 완판, EQT 10K대 딜 — $20K/$499mo',
   'Hayward CA 58,000sqft 공장 가동 — 미국 최초 수직통합 휴머노이드 제조시설. 10,000대 첫해 물량 5일 완판. 2027년 100,000대 확장. $20K(구매)/$499mo(렌트). NEO Gamma: 5ft7, 30kg, 소프트 3D-knit 외장, 22dB 동작소음. EQT 전략제휴: 300+ 포트폴리오사에 2026-2030 최대 10,000대 공급. OpenAI 지원. $1B 추가 펀딩 추진 중(@$10B+ 밸류).',
   '2026-09-01'::timestamp, 'pending'),

-- 8. [Info] AGIBOT: 누적 15,000대 출하, H1 2026 글로벌 출하량 1위, A3 Ultra·G2 Max 신제품
  (gen_random_uuid(), 'PR Newswire / Interesting Engineering',
   'https://www.prnewswire.com/apac/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812695.html',
   '[Info] AGIBOT 15,000대 누적출하: H1 2026 글로벌 1위(~8,400-9,700대), A3 Ultra WAIC 수상',
   '6월 15,000번째 로봇 출하(G2 산업용). H1 2026 글로벌 출하 리더(~8,400-9,700대). WAIC 2026 신제품 4종: A3 Ultra(174cm, 51DoF, NVIDIA Thor, "보석상" 수상), G2 Max(중하역), OmniHand 3 Ultra-M(630g, 20DoF, 5kg 그립), X2 Edu. CES 2026 미국 시장 공식 데뷔. 매출 RMB 300K→60M→1B+ 성장 궤적.',
   '2026-09-01'::timestamp, 'pending'),

-- 9. [Info] 휴머노이드 안전규제: ISO 10218:2025 발효, EU Machinery Reg 2027.1 적용 임박
  (gen_random_uuid(), 'ISO / EU / theresarobotforthat / roboselect360',
   'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
   '[Info] 휴머노이드 규제동향: ISO 10218:2025 발효, ISO 25785-1 개발중, EU MR 2027.1 적용 임박',
   'ISO 10218:2025 발효(하드웨어→응용 인증 전환). ISO 25785-1: 동적 안정 로봇 전용 표준 개발 진행. IEEE P7009: 자율시스템 페일세이프 설계(2027 예정). EU Machinery Regulation 2023/1230: 2027.1.20 적용 — 현행 Machinery Directive 대체, 기술문서 업데이트 필요. 단일 표준만으로 휴머노이드 배포 불가, ISO 10218+ISO/TS 15066+ISO 13482+ASTM 조합 적용 필요.',
   '2026-09-01'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla] Optimus V3 Fremont 양산 개시 + TSMC/Samsung/Micron 파트너십
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus V3 Production Begins at Fremont: TSMC, Samsung, Micron Named Key Partners',
  'The Robot Report / Digitimes / Electrek / TheAIInsider',
  'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  '2026-09-01'::timestamp,
  'Tesla began Optimus V3 production at Fremont in late August 2026 after converting the Model S/X line in 4 months. TSMC, Samsung, and Micron officially named as key supply chain partners during Q2 2026 earnings call. Initial output expected to be very slow with 10,000 unique parts. Giga Texas second factory planned for summer 2027.',
  'Tesla Optimus production update as of September 2026. Fremont factory: Model S/X line retired in early May 2026, fully dismantled in 46 days (exceptionally fast by industry standards). Optimus V3 dedicated production line conversion completed, production began late August 2026. Q2 2026 earnings call (July 22): CEO Elon Musk named TSMC, Samsung, and Micron as critical Optimus supply chain partners. Also working with Panasonic for chips, batteries, and memory. Musk warned: initial output will be "quite slow" and is "literally impossible to predict" due to 10,000 unique parts across an entirely new production line. Optimus V3 specifications: 173cm height, 57kg weight, 22 DoF hands, 50 actuators. Long-term price target $20,000-$30,000 but current build cost $50K-$100K+ per unit. Consumer availability targeted end 2027 at earliest. Giga Texas second Optimus factory construction expected to begin summer 2027, designed for higher-volume Gen 4 variant. Ultimate target: 10 million units. Fremont designed for 1 million units annually at full capacity.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-v3-fremont-production-tsmc-samsung-2026-09-01'),
  '{"mentionedCompanies":["Tesla","TSMC","Samsung","Micron","Panasonic"],"mentionedRobots":["Optimus V3","Optimus Gen 4"],"technologies":["production line conversion","supply chain integration"],"marketInsights":["production began late Aug 2026","10K unique parts","$20-30K target price","1M/yr Fremont capacity"],"keyPoints":["TSMC/Samsung/Micron key partners","Giga Texas 2027","Initial output very slow","Consumer sales 2027+"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-v3-fremont-production-tsmc-samsung-2026-09-01'));

-- [BD] Atlas Gen5 order-of-magnitude simplification
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Atlas Gen5: Order of Magnitude Simpler, 30K/Year Factory at Full Capacity',
  'Forbes / Engadget / Robotics247 / The Register',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-09-01'::timestamp,
  'Boston Dynamics unveiled its 5th-generation Atlas with an "almost order of magnitude" reduction in complexity. 2026 production fully committed to Hyundai RMAC and Google DeepMind. Factory building 30,000 units per year. CES 2026 Best Robot award. Hyundai $26B US investment includes dedicated robot factory.',
  'Boston Dynamics Atlas Gen5 update September 2026. Fifth-generation Atlas unveiled with dramatically reduced complexity — described as "almost order of magnitude" simpler than previous versions. Production specs: reach 7.5 feet, payload 110 lbs (50kg), operating temperature -4°F to 104°F (-20°C to 40°C). Battery life 4 hours with 3-minute hot-swap capability. All 2026 Atlas deployments fully committed — fleets shipping to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Factory producing 30,000 units per year at Boston HQ. Part of Hyundai Motor Group $26B US investment program. CES 2026 Best Robot award winner. Google DeepMind integration with Gemini Robotics models for enhanced environment perception, task reasoning, and autonomous operation. 2027 expansion to additional customers planned.',
  'en', 'technology', 'robot',
  md5('bd-atlas-gen5-simpler-30k-production-2026-09-01'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas Gen5"],"technologies":["complexity reduction","Gemini Robotics","hot-swap battery"],"marketInsights":["30K/yr production","2026 fully committed","$26B Hyundai investment"],"keyPoints":["10x complexity reduction","CES 2026 Best Robot","Hyundai+DeepMind first customers","2027 expansion"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-gen5-simpler-30k-production-2026-09-01'));

-- [Figure] Figure 03 production ramp + BMW deployment results
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI: BotQ Factory Hits 1 Robot/Hour, Figure 02 BMW Deployment Contributed to 30K X3 Vehicles',
  'Figure AI / Time / Axis Intelligence / Forge Global',
  'https://www.figure.ai/news/ramping-figure-03-production',
  '2026-09-01'::timestamp,
  'Figure AI ramped BotQ factory from 1 robot/day to 1 robot/hour in 120 days. Figure 02 completed 11-month BMW deployment contributing to 30,000+ X3 vehicles with 1,250+ operating hours. Figure 03 autonomously sorted 204,000+ packages. Series C $1B at $39B valuation.',
  'Figure AI comprehensive update September 2026. BotQ factory production ramp: went from producing one robot per day to one per hour in under 120 days. Annual capacity approximately 12,000 units. Figure 02 deployment results: 11-month production deployment at BMW Spartanburg plant, contributing to over 30,000 X3 vehicles while logging 1,250+ operating hours and handling 90,000+ parts. Figure 03 specifications: third-generation humanoid announced October 9, 2025. First designed for homes as well as commercial work. Features soft washable textiles, wireless charging, audio built for voice interaction. Autonomous demonstration: sorted 204,000+ packages in 163+ hours. Outdoor jogging at 2m/s. Series C funding: $1B raised at $39B valuation (nearly 15x previous). Led by Parkway Venture Capital with Brookfield, NVIDIA, Macquarie, Intel Capital, Salesforce, T-Mobile Ventures, Qualcomm Ventures. Total raised $1.9B. IPO preparation reportedly underway.',
  'en', 'technology', 'robot',
  md5('figure-03-botq-ramp-bmw-deployment-2026-09-01'),
  '{"mentionedCompanies":["Figure AI","BMW","NVIDIA","Qualcomm","Intel Capital"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["autonomous sorting","wireless charging","soft textiles"],"marketInsights":["1 robot/hr production","$39B valuation","$1.9B total raised","12K/yr capacity"],"keyPoints":["BotQ 120-day ramp","BMW 30K X3 contribution","204K packages sorted","IPO preparation"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-botq-ramp-bmw-deployment-2026-09-01'));

-- [Unitree] IPO aftermath and valuation reset
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree IPO Peak-to-Trough -47%: Q1 Profit Down 53%, Founder Warns ChatGPT Moment 2-10 Years Away',
  'CNBC / Caixin Global / Forbes / Investing.com',
  'https://www.cnbc.com/2026/08/21/chinese-humanoid-robots-face-challenge-of-their-own-capabilities.html',
  '2026-09-01'::timestamp,
  'Unitree Robotics stock crashed 47% from IPO Day 1 peak of ¥1,100 to ¥585 by Aug 28. Q1 2026 adjusted net profit dropped 53% YoY to ¥40M. Founder warned "ChatGPT moment" could take 2-10 years. Plans to quadruple production to 20,000 units/year. IPO raised $905M. Security vulnerability discovered.',
  'Unitree Robotics (688836.SH) post-IPO analysis September 2026. IPO Aug 19 on STAR Market at ¥150.80, Day 1 peak ¥1,100 (+629% intraday), Day 1 close ¥845 (+487%). Subsequent decline: ¥672 (Aug 22) → ¥591 (Aug 26) → ¥585 (Aug 28). Peak-to-trough: -47%. Market cap from ~¥342B peak to ~¥230B (~$32B). IPO raised ¥6.1B ($905M). Retail oversubscription: 8,000x. DeepSeek invested ¥140.8M as strategic investor. Financials: 2025 revenue ¥1.708B (+335% YoY), margins ~60%, 5,500+ humanoid shipments. Q1 2026 adjusted net profit ¥40M (-53% YoY). H1 2026 growth rate slowing to ~40%. World Robot Congress (Aug 20-25): Founder Wang Xingxing: "insufficient generalization capabilities" is critical industry-wide challenge. ChatGPT moment could arrive in 2-3 years or take up to a decade. Production plans: quadruple to 20,000 units/year in 2026. G1 priced $13,500 on backorder. H1 legacy (~$90K, delisted). H2 successor at $29,900. Security: hardcoded Bluetooth encryption key vulnerability affecting Go2, G1, H1, B2 devices.',
  'en', 'business', 'robot',
  md5('unitree-ipo-crash-47pct-q1-profit-down-2026-09-01'),
  '{"mentionedCompanies":["Unitree","DeepSeek"],"mentionedRobots":["G1","H1","H2","B2"],"technologies":["STAR Market IPO"],"marketInsights":["peak-to-trough -47%","Q1 profit -53%","~$32B market cap","$905M raised"],"keyPoints":["Valuation reset ongoing","ChatGPT moment 2-10yr","20K/yr production plan","BT security vulnerability"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-ipo-crash-47pct-q1-profit-down-2026-09-01'));

-- [Agility] SPAC listing + new deployments
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics SPAC $2.5B: First Pure-Play Humanoid IPO, Mercado Libre and Toyota Canada Deals',
  'GeekWire / Agility Robotics / Robotics247',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  '2026-09-01'::timestamp,
  'Agility Robotics to become first US pure-play humanoid public company via $2.5B SPAC merger with Churchill Capital XI. New deployments at Mercado Libre (Texas) and Toyota Motor Manufacturing Canada (commercial agreement after 1-year pilot). 65,000+ operating hours across 9 facilities. RoboFab capacity 10,000/year.',
  'Agility Robotics update September 2026. SPAC IPO: Merger with Churchill Capital Corp XI announced, implying $2.5B enterprise value, expected $600M+ in proceeds. Will become first US publicly traded company dedicated solely to humanoid robots. Led by CEO Peggy Johnson (ex-Microsoft, ex-Magic Leap). Expected close 2026 pending shareholder approval and SEC review. New deployments: Mercado Libre agreement to deploy Digit at fulfillment operations in San Antonio, Texas. Toyota Motor Manufacturing Canada signed commercial agreement in February 2026 after year-long pilot, deploying 7-10 robots at one plant. Existing customers: GXO, Schaeffler, Amazon, and other Fortune 500 companies. Operational metrics: 65,000+ hours across 9 customer facilities. GXO SPANX facility: 100,000+ totes processed. Digit v5: AI-enabled cooperatively safe humanoid, NVIDIA Halos safety platform integration. Manufacturing: RoboFab facility designed for up to 10,000 robots annually. Existing $300M+ multi-year Digit v5 order backlog.',
  'en', 'business', 'robot',
  md5('agility-spac-2-5b-mercado-libre-toyota-2026-09-01'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","Mercado Libre","Toyota","GXO","Amazon","NVIDIA"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos safety","cooperative safety"],"marketInsights":["$2.5B SPAC valuation","$600M+ proceeds","$300M+ order backlog","10K/yr capacity"],"keyPoints":["First US humanoid IPO","Mercado Libre TX deployment","Toyota Canada commercial deal","65K+ operating hours"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-2-5b-mercado-libre-toyota-2026-09-01'));

-- [Apptronik] Series A + Google DeepMind partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Closes $935M Series A at $5.3B Valuation, Deepens Google DeepMind Gemini Partnership',
  'CNBC / Apptronik / RoboticsTomorrow / Forbes',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-09-01'::timestamp,
  'Apptronik closed $935M total Series A ($415M initial + $520M extension) at $5.3B valuation. New investors include AT&T Ventures, John Deere, and Qatar Investment Authority. Robot Park in Austin expanded for Google DeepMind Gemini Robotics collaboration. Apollo 3 commercial product expected 2027.',
  'Apptronik update September 2026. Funding: Series A total $935M+ ($415M initial + $520M extension round in February 2026). Total raised approximately $1B. Valuation ~$5.3B (per TechCrunch, 3x multiple on extension). Extension round investors: B Capital, Google, Mercedes-Benz, PEAK6 (existing) + AT&T Ventures, John Deere, Qatar Investment Authority (new). Strategic partnerships: Mercedes-Benz, GXO Logistics, Jabil. Google DeepMind partnership: building next-generation humanoid robots powered by Gemini Robotics. Gemini Robotics On-Device enables Apollo to learn new tasks from just 50-100 demonstrations. Robot Park: Expanded flagship facility in Austin, Texas opened June 2026. Serves as data collection and training facility for humanoid robots, with Apollo 2 collecting real-world data for Gemini Robotics advancement. Product roadmap: Apollo 3 anticipated as next commercial product within the next year (2027). Elevate Robotics subsidiary created for superhuman industrial automation.',
  'en', 'business', 'robot',
  md5('apptronik-935m-series-a-deepmind-gemini-2026-09-01'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","AT&T","John Deere","QIA","GXO","Jabil"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","On-Device learning","50-100 demo adaptation"],"marketInsights":["$935M Series A","$5.3B valuation","~$1B total raised"],"keyPoints":["DeepMind Gemini partnership","Robot Park expansion","Apollo 3 in 2027","AT&T/Deere/QIA new investors"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-935m-series-a-deepmind-gemini-2026-09-01'));

-- [1X] NEO production and EQT partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Technologies NEO: First US Vertically-Integrated Humanoid Factory, 10K Units Sold Out in 5 Days',
  'Forbes / eWeek / The Robot Report / BusinessWire',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-09-01'::timestamp,
  '1X Technologies opened 58,000 sqft Hayward CA factory — first vertically integrated humanoid manufacturing facility in the US. First-year 10,000 unit production sold out in 5 days. NEO priced at $20,000 (buy) or $499/month (rent). EQT strategic partnership for up to 10,000 units across 300+ portfolio companies.',
  '1X Technologies NEO update September 2026. Manufacturing: 58,000 sqft factory in Hayward, California — described as first vertically integrated humanoid robot manufacturing facility in the US. Full-scale production began April 30, 2026. First-year capacity of 10,000 units sold out within 5 days of preorders opening (October 2025). Target 100,000 units by end 2027. Key components manufactured in-house (not dependent on global supply chains). NEO Gamma specifications: 5ft 7in tall, 66 lbs (30kg), soft 3D-knit exterior, bipedal human-like gait, five-fingered hands, LED ear rings for non-verbal feedback, onboard speaker array for conversation, 22dB operating noise (refrigerator level). Pricing: $20,000 purchase or $499/month rental (6-month minimum). Strategic partnership: EQT deal for up to 10,000 robots between 2026-2030 across 300+ portfolio companies in manufacturing, warehousing, logistics, and industrial use cases. Funding: backed by OpenAI, seeking $1B additional funding at $10B+ valuation. First customer deliveries expected late 2026.',
  'en', 'technology', 'robot',
  md5('1x-neo-hayward-factory-10k-soldout-eqt-2026-09-01'),
  '{"mentionedCompanies":["1X Technologies","OpenAI","EQT"],"mentionedRobots":["NEO Gamma"],"technologies":["vertical integration","3D-knit exterior","22dB noise"],"marketInsights":["10K units sold in 5 days","$20K buy/$499mo rent","$10B+ target valuation","100K by 2027"],"keyPoints":["First US integrated humanoid factory","EQT 10K unit deal","OpenAI backed","Late 2026 first deliveries"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-hayward-factory-10k-soldout-eqt-2026-09-01'));

-- [AGIBOT] 15,000 units + WAIC 2026 products
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT Hits 15,000 Unit Milestone, Leads H1 2026 Global Shipments with A3 Ultra and G2 Max Launch',
  'PR Newswire / Interesting Engineering',
  'https://www.prnewswire.com/apac/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812695.html',
  '2026-09-01'::timestamp,
  'AGIBOT 15,000th robot rolled off production line in June 2026, becoming H1 2026 global shipment leader (~8,400-9,700 units). WAIC 2026 saw launch of 4 new products: A3 Ultra (won jewel award), G2 Max, OmniHand 3 Ultra-M, and X2 Edu. CES 2026 US market debut.',
  'AGIBOT comprehensive update September 2026. Production milestone: 15,000th robot (G2 industrial model) rolled off production line in June 2026. Became H1 2026 global shipment leader with approximately 8,400-9,700 units. WAIC 2026 (July 20) new product launches: (1) A3 Ultra — 174cm, 51 DoF, 5kg/arm payload, NVIDIA Thor SoC, won "WAIC 2026 Jewel Award" as only embodied AI recipient. (2) G2 Max — heavy-duty palletizing specialist with force-controlled arms, variable work height, omnidirectional mobility, battery swap. (3) OmniHand 3 Ultra-M — 630g, 20 active DoF, 5kg grip force, vision-based tactile sensors. (4) X2 Edu — educational platform. OmniPicker 3 gripper: 140N force, 1,000,000-cycle durability. CES 2026: Official US market debut with full humanoid portfolio. Revenue trajectory: RMB 300K → 60M → 1B+. Company positioned as world''s largest humanoid robot manufacturer by shipment volume.',
  'en', 'technology', 'robot',
  md5('agibot-15000-units-waic-a3-ultra-g2-max-2026-09-01'),
  '{"mentionedCompanies":["AGIBOT","NVIDIA"],"mentionedRobots":["A3 Ultra","G2","G2 Max","X2 Edu"],"technologies":["NVIDIA Thor","OmniHand 3","vision-based tactile","OmniPicker 3"],"marketInsights":["15K cumulative units","H1 2026 global leader","8.4-9.7K H1 shipments","RMB 1B+ revenue"],"keyPoints":["WAIC Jewel Award","4 new products","US market debut CES","Global shipment leader"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-units-waic-a3-ultra-g2-max-2026-09-01'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Tesla 양산 개시
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES
  (gen_random_uuid(), 'mass_production', 'critical',
   'Tesla Optimus V3 Fremont 양산 개시 — TSMC/Samsung/Micron 파트너 확정',
   'Fremont S/X 라인→V3 전용 전환 완료, 8월 말 양산 시작. TSMC·Samsung·Micron 공급망 공식화. 초기 산출 극저, 연 1M 목표. Giga Texas 제2공장 2027.',
   '{"company":"Tesla","robot":"Optimus V3","event":"production_start","partners":["TSMC","Samsung","Micron"],"capacity":"1M/yr target","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- BD Atlas Gen5
  (gen_random_uuid(), 'mass_production', 'critical',
   'BD Atlas Gen5 공개 — 복잡도 10배 감소, 30K/년 풀생산',
   '5세대 Atlas: 복잡도 거의 10배 감소. 연 30,000대 생산. 2026 전량 예약(Hyundai+DeepMind). Hyundai $26B 미국 투자.',
   '{"company":"Boston Dynamics","robot":"Atlas Gen5","event":"new_version","production":"30K/yr","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- Figure AI 생산 램프
  (gen_random_uuid(), 'mass_production', 'warning',
   'Figure AI BotQ 시간당 1대 달성, BMW 30K대 기여 실적',
   'BotQ 120일 만에 시간당 1대 생산. Figure 02 BMW 30,000대 X3 기여. $39B 밸류, IPO 준비 중.',
   '{"company":"Figure AI","robot":"Figure 03","event":"production_ramp","rate":"1/hour","valuation":"$39B","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- Unitree IPO 급락
  (gen_random_uuid(), 'funding', 'warning',
   'Unitree IPO 피크 대비 -47% 급락, Q1 순익 -53%',
   'IPO Day1 ¥1,100→¥585(-47%). Q1 순익 -53%. 창업자 "ChatGPT moment 2-10년". 밸류 재평가 진행.',
   '{"company":"Unitree","event":"ipo_crash","peak":"¥1100","current":"¥585","drop":"-47%","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- Agility SPAC
  (gen_random_uuid(), 'funding', 'warning',
   'Agility Robotics SPAC $2.5B 상장 — 미국 최초 순수 휴머노이드 상장사',
   'Churchill Capital XI 합병. $2.5B 밸류, $600M+ 조달. Mercado Libre·Toyota Canada 신규 배치.',
   '{"company":"Agility Robotics","robot":"Digit v5","event":"spac_ipo","valuation":"$2.5B","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- Apptronik 펀딩
  (gen_random_uuid(), 'funding', 'info',
   'Apptronik 시리즈A $935M 마감, Google DeepMind Gemini 파트너십',
   '$935M 시리즈A, $5.3B 밸류. DeepMind Gemini Robotics 통합. AT&T·John Deere·QIA 신규 투자.',
   '{"company":"Apptronik","robot":"Apollo","event":"series_a","amount":"$935M","valuation":"$5.3B","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- 1X NEO 완판
  (gen_random_uuid(), 'mass_production', 'warning',
   '1X NEO: 미국 공장 가동, 10K대 5일 완판, EQT 10K 딜',
   'Hayward 공장 가동. 10K대 5일 완판. EQT 300+사에 10K대 딜. $20K/$499mo.',
   '{"company":"1X Technologies","robot":"NEO","event":"production_soldout","units":"10K","price":"$20K","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp),

-- AGIBOT 15K 마일스톤
  (gen_random_uuid(), 'mass_production', 'info',
   'AGIBOT 누적 15,000대 출하, H1 2026 글로벌 1위',
   '15,000번째 로봇 출하. H1 2026 글로벌 출하 1위(~8.4-9.7K). A3 Ultra WAIC 수상.',
   '{"company":"AGIBOT","robot":"A3 Ultra/G2","event":"milestone","cumulative":"15K","h1_shipments":"8.4-9.7K","confidence":"A"}'::jsonb,
   false, '2026-09-01'::timestamp);

COMMIT;
