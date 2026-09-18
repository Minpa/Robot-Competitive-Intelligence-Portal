-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-18
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-18.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Unitree G1+ 공식 출시 — 6대 업그레이드, ¥95,000
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'The Standard HK / PANews / Pandaily',
   'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
   '[Warning] Unitree G1+ 공식 출시 — 6대 업그레이드, 숄더·허리 토크 110%↑, 열 72%↓, ¥95,000',
   '9/15 Unitree가 G1 풀 업그레이드 버전 G1+ 공식 출시. 6대 업그레이드: (1) 목 2DOF 추가로 유연성 향상, (2) 숄더·허리 관절 피크 토크 110% 증가·발열 72% 감소, (3) 비전·촉각 인지 강화, (4) 외부 전원 연속 충전 지원 배터리 연장, (5) 원거리 음성 인식 향상, (6) 지능 경험 업그레이드. 가격 ¥95,000(기존 G1 ¥85,000 대비 12% 인상). 무게 ~35kg. G1 비용 효율 포지셔닝 유지.',
   '2026-09-18'::timestamp, 'pending'),

-- 2. [Critical] Agility Digit 5 — $300M+ 수주, SPAC 상장 절차 진행, EU·UK 확장
  (gen_random_uuid(), 'Robotics & Automation News / GeekWire / SEC Filing',
   'https://roboticsandautomationnews.com/2026/09/17/agility-unveils-digit-5-humanoid-as-orders-exceed-300-million-ahead-of-public-listing/104857/',
   '[Critical] Agility Digit 5 수주 $300M+ 돌파, SPAC($2.5B) 상장 임박 — EU·UK 최초 해외 배치 예정',
   '9/17 보도: Agility Robotics Digit 5 멀티이어 수주가 $300M+ 돌파. Churchill Capital XI SPAC 합병($2.5B 밸류) 진행 중, SEC 심사 대기. 트러스트 $420M + Foxconn PIPE $200M = 총 $620M+ 자금 확보. Digit 5 사양: 180cm/129kg, 50lbs 반복 리프팅(전작 대비 40%↑), 90분 배터리·9분 충전(10:1 비율). NVIDIA IGX Thor + Halos Core 안전 아키텍처 최초 통합. 고객: Schaeffler, GXO, Toyota Canada, Mercado Libre. 2027 H1 얼리액세스, H2 GA. 미국 최초 순수 휴머노이드 상장사 탄생 임박.',
   '2026-09-18'::timestamp, 'pending'),

-- 3. [Warning] Figure AI — Figure 04 설계 확정, $600/월 가정용 구독 발표
  (gen_random_uuid(), 'Time / Forge Global / Figure AI Blog',
   'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
   '[Warning] Figure AI — Figure 04 설계 확정, Figure 03 가정용 월 $600 구독 발표',
   'Figure AI CEO Brett Adcock이 Figure 04 설계 확정(locked)을 발표(5월 2026). Figure 03는 350대+ 납품, 시간당 1대 생산, 204,000개+ 패키지 자율 분류 실적. 가정용 시장 진출로 월 $600 구독 모델 예고. 4년 내 ~100,000대 제조·배치 목표. BotQ 연간 생산능력 ~12,000대. Series C $1B+($39B 밸류에이션). 산업용→가정용 확장은 시장 변곡점 시그널.',
   '2026-09-18'::timestamp, 'pending'),

-- 4. [Warning] Boston Dynamics Atlas 5세대 — 복잡도 "한 자릿수" 축소, 연 30,000대 생산체제
  (gen_random_uuid(), 'Forbes / Boston Dynamics Blog',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   '[Warning] Atlas 5세대 공개(7월) — 부품 복잡도 "한 자릿수" 축소, 30,000대/년 생산 체제',
   'Boston Dynamics가 7월 Atlas 5세대 공개. 부품 복잡도를 "almost an order of magnitude" 줄여 제조 속도·신뢰성 향상, 비용 절감. Hyundai 제조역량 활용 연 30,000대 생산 기반 마련. 2026 배치분 전량 완판(Hyundai RMAC + Google DeepMind). 추가 고객 배치 2027년부터. 가격 ~$420,000/대. 56 DOF, 리프팅 50kg(110lbs), 리치 7.5ft, 운용온도 -20~40°C.',
   '2026-09-18'::timestamp, 'pending'),

-- 5. [Info] Agibot 15,000대 생산 마일스톤 — 글로벌 출하 1위, 홍콩 IPO 추진
  (gen_random_uuid(), 'Agibot / Gasgoo / PR Newswire',
   'https://www.agibot.com/article/231/detail/82.html',
   '[Info] Agibot 누적 15,000대 생산 — 2025 글로벌 출하 1위(39%), 홍콩 IPO($5.1-6.4B) 추진',
   '6/28 Agibot 15,000번째 유닛(Genie G2) 생산 완료. 양산 개시(2024.8) → 1,000대(2025.1) → 5,000대(2025 말) → 10,000대(2026.3) → 15,000대(2026.6). Omdia 기준 2025 글로벌 출하 1위(5,168대, 39% 점유율). 7/24 홍콩 IPO 프로세스 개시, 목표 밸류 HK$40-50B($5.1-6.4B), CICC·Morgan Stanley 주관. 전략투자자에 LG전자·BYD·Hillhouse.',
   '2026-09-18'::timestamp, 'pending'),

-- 6. [Info] 1X NEO — 미국 공장 양산 개시, EQT 10,000대 딜, 가정용 $20,000/$499월
  (gen_random_uuid(), 'Forbes / eWeek / TechCrunch',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '[Info] 1X NEO — Hayward 공장 양산 개시, 초년 10,000대 5일 완판, EQT 10,000대 딜',
   '1X Technologies Hayward NEO Factory(58,000sqft)에서 풀스케일 양산 개시. 사전주문 개시 5일 만에 초년 생산분 10,000대 완판. 가격 $20,000(Early Access) 또는 월 $499 구독. EQT와 2026-2030 최대 10,000대 배치 딜(EQT 300+ 포트폴리오사 대상). 2027년 100,000대 목표. 소음 ~22dB. 핸드: 25 DOF 텐던 구동, IP68, ±0.2mm 정밀도, 촉각 핑거팁.',
   '2026-09-18'::timestamp, 'pending'),

-- 7. [Info] Apptronik — Series A 총 $935M, $5B 밸류, Apollo 3 상용화 2027
  (gen_random_uuid(), 'CNBC / The Robot Report',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   '[Info] Apptronik Series A 총 $935M($5B 밸류) — Apollo 3 최초 상용 제품 2027 예고',
   '2월 Apptronik $520M 추가 유치(시리즈 A 총 $935M, $5B 밸류에이션). 참여: Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. Google DeepMind Gemini Robotics 파트너십 체결. Apollo 2는 훈련/데이터 수집 플랫폼, Apollo 3이 최초 진정한 상용 제품으로 2027 출시 예정. 현재 Mercedes-Benz, GXO, Jabil 3개 고객 배치. Jabil과 "Apollo가 Apollo를 만드는" 자기생산 라인 구축 중.',
   '2026-09-18'::timestamp, 'pending'),

-- 8. [Info] 중국 — 휴머노이드 로봇 표준체계 첫 공식 발표 (2026 Edition)
  (gen_random_uuid(), 'SESEC / Robotics & Automation News',
   'https://sesec.eu/2026/04/01/chinas-first-standards-system-for-humanoid-robots-and-embodied-intelligence/',
   '[Info] 중국 휴머노이드 로봇·체화지능 표준체계 첫 공식 발표 (2026 Edition)',
   '2026년 2월 중국이 "휴머노이드 로봇 및 체화지능 표준체계(2026 Edition)" 첫 공식 발표. 전체 밸류체인·전 생애주기 커버. EU Machinery Regulation(2023/1230) 2027.1.20 의무화 대비 글로벌 표준 경쟁 구도 형성. ISO 25785-1(동적안정 로봇) 개발 진행 중. 2026 기준 상용 휴머노이드 중 완전한 산업 CE 파일 보유 비율 15% 미만.',
   '2026-09-18'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] G1+ 공식 출시
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Launches G1+ Humanoid with 6 Major Upgrades: 110% Torque Boost, 72% Heat Reduction',
  'The Standard HK / PANews / Pandaily',
  'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
  '2026-09-15'::timestamp,
  'Unitree Robotics launched G1+, a full upgrade of G1 with 6 major improvements: neck 2DOF added, shoulder/waist peak torque +110% with 72% heat reduction, enhanced vision/tactile perception, continuous external power charging, far-field voice recognition, and intelligence upgrades. Priced at ¥95,000 (vs G1 ¥85,000). Weight ~35kg.',
  'Unitree Robotics officially launched the G1+ humanoid robot on September 15, 2026. Six major upgrades: (1) Two additional degrees of freedom in the neck for enhanced flexibility. (2) Overhauled motors lifting peak torque for shoulder and waist joints by 110%, while reducing heat output by 72% under identical torque conditions. (3) Enhanced visual and tactile perception capabilities. (4) Continuous external power charging support for extended battery life. (5) Improved far-field voice interaction. (6) Upgraded intelligent experience features. Pricing: ¥95,000 including tax (12% premium over original G1 at ¥85,000). Weight approximately 35kg with battery. Maintains the G1 cost-effective positioning in the humanoid market. Context: Unitree STAR Market IPO (688836.SH) approved July 3, Day 1 peak ¥1,100 (+629%), subsequent correction to ¥550 (-50%). G1+ launch may signal product maturation strategy alongside IPO monetization.',
  'en', 'product', 'robot',
  md5('unitree-g1-plus-launch-6-upgrades-2026-09-18'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1+","G1"],"technologies":["tendon drive motors","tactile perception","far-field voice"],"marketInsights":["¥95,000 pricing","110% torque increase","72% heat reduction","6 major upgrades"],"keyPoints":["Sep 15 official launch","Neck 2DOF added","External power charging","Post-IPO product refresh"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-g1-plus-launch-6-upgrades-2026-09-18'));

-- [Agility] Digit 5 orders exceed $300M
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics Digit 5 Orders Exceed $300M as SPAC Listing Approaches',
  'Robotics & Automation News / GeekWire / SEC',
  'https://roboticsandautomationnews.com/2026/09/17/agility-unveils-digit-5-humanoid-as-orders-exceed-300-million-ahead-of-public-listing/104857/',
  '2026-09-17'::timestamp,
  'Agility Robotics'' Digit 5 multi-year orders exceeded $300M ahead of its $2.5B SPAC merger with Churchill Capital XI. Digit 5 unveiled Sep 15: 180cm/129kg, 50lbs lifting (+40%), 90min battery with 9min charge, NVIDIA IGX Thor + Halos Core safety. First humanoid company planning EU/UK commercial deployment. Customers: Schaeffler, GXO, Toyota Canada, Mercado Libre.',
  'Agility Robotics revealed that multi-year customer orders for Digit 5 have surpassed $300 million as of September 2026. The disclosure comes as Agility prepares to become the first publicly traded US company dedicated solely to humanoid robots through a SPAC merger with Churchill Capital Corp XI at a $2.5B enterprise value. Transaction funding: $420M trust + $200M Foxconn PIPE = $620M+ total proceeds. Digit 5 specifications: height 5ft 11in (180cm), weight 284lbs (129kg), 50lbs repeated lifting capacity (40% increase over Digit 3), 90-minute battery with 9-minute charge (10:1 ratio), ISO-standard interchangeable end effectors, reach 7.2ft. First integration of NVIDIA IGX Thor + Halos Core safety platform — human detection, motion cues, independent safety controller. Customer deployments: Schaeffler (auto parts), GXO (logistics), Toyota Motor Manufacturing Canada, Mercado Libre (Latin America e-commerce). First planned commercial deployment outside North America: EU and UK markets. RoboFab capacity: 10,000 units/year. Timeline: 2027 H1 early access, H2 general availability. 2025 net sales: $1.8M. 65,000+ hours of operation logged.',
  'en', 'business', 'robot',
  md5('agility-digit5-300m-orders-spac-2026-09-18'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","NVIDIA","Foxconn","Schaeffler","GXO","Toyota","Mercado Libre"],"mentionedRobots":["Digit 5","Digit 3"],"technologies":["NVIDIA IGX Thor","Halos Core","cooperatively safe work"],"marketInsights":["$300M+ orders","$2.5B SPAC valuation","$620M+ proceeds","10K units/yr capacity"],"keyPoints":["First US pure humanoid public listing","EU/UK expansion planned","40% lifting improvement","9min charge / 90min runtime"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit5-300m-orders-spac-2026-09-18'));

-- [Figure AI] Figure 04 design locked, home subscription
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Locks Figure 04 Design, Plans $600/Month Home Robot Subscription',
  'Time / Forge Global / Figure AI',
  'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
  '2026-09-18'::timestamp,
  'Figure AI CEO Brett Adcock confirmed Figure 04 design is locked (May 2026). Figure 03 has delivered 350+ units at 1/hour production rate, sorted 204,000+ packages autonomously. Home use planned at $600/month subscription. Series C $1B+ at $39B valuation. BotQ annual capacity ~12,000 units. 100,000 units target in 4 years.',
  'Figure AI product and strategy update September 2026. Figure 04: design confirmed locked as of May 2026 per CEO Brett Adcock. Figure 03 production milestones: 350+ units delivered, production rate 1 robot per hour at BotQ facility, annual capacity approximately 12,000 units. Autonomous operations: sorted 204,000+ packages over 163+ hours in livestreamed demonstration. Home market entry: Adcock announced plans to lease Figure 03 for domestic use at approximately $600/month. Vision: 100,000 units manufactured and deployed within 4 years. In-house AI: Figure ended OpenAI partnership February 2025 in favor of proprietary Helix AI model for unstructured home environments. Funding: Series C raised $1B+ at approximately $39B valuation (late 2025), led by Parkway Venture Capital with NVIDIA, Intel Capital, Salesforce, Qualcomm Ventures, T-Mobile Ventures participating. BMW partnership: Figure 02 contributed to 30,000+ X3 vehicles over 11 months with 1,250+ hours of operation at Spartanburg plant. The move from industrial to home use signals a significant market expansion strategy.',
  'en', 'business', 'robot',
  md5('figure-04-locked-600-home-subscription-2026-09-18'),
  '{"mentionedCompanies":["Figure AI","BMW","NVIDIA","OpenAI"],"mentionedRobots":["Figure 03","Figure 04","Figure 02"],"technologies":["Helix AI","autonomous package sorting"],"marketInsights":["$600/month home subscription","350+ units delivered","$39B valuation","12K annual capacity"],"keyPoints":["Figure 04 design locked","Home market expansion","204K packages sorted","100K units in 4 years"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-04-locked-600-home-subscription-2026-09-18'));

-- [Boston Dynamics] Atlas Gen 5 simplification
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Atlas Gen 5: Order of Magnitude Simpler, 30,000 Units/Year Production Ready',
  'Forbes / Boston Dynamics Blog / Engadget',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-09-18'::timestamp,
  'Boston Dynamics unveiled 5th-gen Atlas (July 2026) with nearly order-of-magnitude reduction in complexity. 30,000 units/year production capacity via Hyundai manufacturing. 2026 deployments fully committed to Hyundai RMAC and Google DeepMind. Won Best Robot at CES 2026. Specs: 190cm/90kg, 56 DOF, 50kg lift, 7.5ft reach, -20°C to 40°C.',
  'Boston Dynamics Atlas fifth-generation update and production status September 2026. Design achievement: CEO Robert Playter described the new Atlas as achieving "almost an order of magnitude" reduction in complexity compared to previous versions, dramatically improving manufacturing speed, reliability, and cost. Production capacity: 30,000 units per year leveraging Hyundai Motor Group manufacturing capabilities. 2026 allocation: all deployment slots fully committed, with units shipping to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Additional customer deployments planned from 2027. Pricing: approximately $420,000 per unit. CES 2026: Won Best Robot award for naturalistic walking gait and sleek design. Technical specifications: height 1,900mm (6.2ft), weight 90kg (198lbs), 56 degrees of freedom, lifting capacity 50kg (110lbs), reach up to 7.5ft, operating temperature -20°C to 40°C (-4°F to 104°F). Three operation modes: autonomous, teleoperated, and tablet interface. Google DeepMind partnership: joint development of embodied AI capabilities for industrial autonomous tasks. The simplification strategy directly addresses the manufacturing scalability challenge that has limited humanoid commercial deployment.',
  'en', 'technology', 'robot',
  md5('atlas-gen5-simplification-30k-production-2026-09-18'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas Gen 5"],"technologies":["embodied AI","complexity reduction","industrial autonomy"],"marketInsights":["30K units/yr capacity","$420K per unit","2026 fully committed","2027 additional customers"],"keyPoints":["Order of magnitude simpler","CES 2026 Best Robot","Hyundai manufacturing leverage","56 DOF / 50kg lift"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('atlas-gen5-simplification-30k-production-2026-09-18'));

-- [Agibot] 15,000 units milestone + HK IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agibot Hits 15,000 Robot Milestone, Pursues Hong Kong IPO at $5-6B Valuation',
  'Agibot / Gasgoo / Caixin Global / PR Newswire',
  'https://www.agibot.com/article/231/detail/82.html',
  '2026-09-18'::timestamp,
  'Agibot produced its 15,000th embodied AI robot on June 28, 2026. Ranked #1 globally in 2025 humanoid shipments (5,168 units, 39% market share per Omdia). Hong Kong IPO process launched July 24, targeting HK$40-50B ($5.1-6.4B) valuation. CICC and Morgan Stanley as joint bookrunners. Strategic investors include LG Electronics, BYD, Hillhouse.',
  'Agibot (智元机器人) production and financial update September 2026. Production milestone: 15,000th unit (Genie G2 model) rolled off production line June 28, 2026, delivered to Hprose factory. Production timeline: mass production started August 2024, 1,000 units by January 2025, 5,000 by end 2025, 10,000 threshold crossed March 2026. Market position: Omdia ranked Agibot #1 globally in 2025 humanoid robot shipments with 5,168 units and 39% market share. IPO: Hong Kong listing process officially launched July 24, 2026. Target valuation HK$40-50B ($5.1-6.4B). Joint bookrunners: CICC, CITIC Securities, Morgan Stanley. Strategic investors: LG Electronics, Mirae Asset, BYD, Hillhouse Investment. H1 2026: approximately 8,400 units shipped (44% of global total). CES 2026: US market debut showcasing full humanoid portfolio. April 2026 Partner Conference: unveiled 4 new robotic platforms and multiple AI models centered on "One Robotic Body, Three Intelligences" full-stack architecture. Key competitor in Chinese humanoid ecosystem alongside Unitree and UBTECH.',
  'en', 'business', 'robot',
  md5('agibot-15000-milestone-hk-ipo-2026-09-18'),
  '{"mentionedCompanies":["Agibot","LG Electronics","BYD","Hillhouse","CICC","Morgan Stanley"],"mentionedRobots":["Genie G2","A3 Ultra"],"technologies":["One Body Three Intelligences","embodied AI"],"marketInsights":["15,000 units produced","39% global market share","$5.1-6.4B IPO target","H1 2026 8,400 shipped"],"keyPoints":["Global #1 in 2025 shipments","HK IPO July 24 launched","LG Electronics strategic investor","CES 2026 US debut"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-milestone-hk-ipo-2026-09-18'));

-- [1X Technologies] NEO production + EQT deal
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Technologies NEO: Full-Scale Production Begins, 10,000 Units Sold Out in 5 Days',
  'Forbes / eWeek / TechCrunch / BusinessWire',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-09-18'::timestamp,
  '1X Technologies began full-scale NEO production at Hayward, California factory (58,000sqft). First-year capacity of 10,000 units sold out in 5 days. EQT partnership for up to 10,000 units across 300+ portfolio companies (2026-2030). Priced at $20,000 or $499/month. NEO hand: 25 DOF, IP68, ±0.2mm precision.',
  '1X Technologies NEO production and commercial update September 2026. Production: full-scale manufacturing launched at NEO Factory in Hayward, California (58,000sqft, 200+ employees). First US vertically integrated humanoid robot factory. Capacity: 10,000 units Year 1, target 100,000 by end 2027. Sales: pre-orders opened October 2025, first-year production capacity sold out within 5 days. Pricing: $20,000 (Early Access purchase) or $499/month subscription. Enterprise partnership: deal with EQT to deploy up to 10,000 NEO units across EQT''s 300+ portfolio companies from 2026 to 2030, focusing on manufacturing, warehousing, logistics. Target $1B fundraise at $10B+ valuation (September 2025 report). OpenAI-backed. NEO hand specifications (July 2026 upgrade): 25 DOF (22 finger + 3 wrist), proprietary tendon drive (5:1 to 15:1 gear ratio), high-resolution tactile skin on all fingertips and contact surfaces, ±0.2mm positional precision, IP68 waterproof/dustproof, food-contact safe materials. Noise level: ~22dB (refrigerator level). First customer deliveries expected late 2026. 10,000 hands self-production target for 2026.',
  'en', 'business', 'robot',
  md5('1x-neo-production-10k-sold-eqt-deal-2026-09-18'),
  '{"mentionedCompanies":["1X Technologies","EQT","OpenAI"],"mentionedRobots":["NEO"],"technologies":["tendon drive hand","tactile skin","IP68"],"marketInsights":["10K units sold in 5 days","$20K purchase / $499/mo","EQT 10K unit deal","$10B+ target valuation"],"keyPoints":["First US humanoid factory","25 DOF hand with IP68","100K units target 2027","~22dB noise level"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-production-10k-sold-eqt-deal-2026-09-18'));

-- [Apptronik] $935M funding + Apollo roadmap
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Raises Total $935M Series A at $5B Valuation, Apollo 3 Commercial Launch in 2027',
  'CNBC / The Robot Report / Apptronik',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-09-18'::timestamp,
  'Apptronik completed $520M extension (total Series A $935M) at $5B valuation. Investors: Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. Google DeepMind Gemini Robotics partnership. Apollo 2 is training platform; Apollo 3 will be first true commercial product (2027). Deployed at Mercedes-Benz, GXO, Jabil. Jabil self-manufacturing line.',
  'Apptronik funding and product roadmap September 2026. Series A total: $935M ($415M initial + $520M extension, February 2026). Valuation: $5 billion. Extension investors: B Capital, Google, Mercedes-Benz, PEAK6, AT&T Ventures, John Deere, Qatar Investment Authority (QIA). Google DeepMind partnership: integrating Gemini Robotics AI model into Apollo platform, Robot Park collaborative data collection project. Product roadmap: Apollo 2 defined as training and data collection platform ("prototype for scaled pilots"), Apollo 3 designated as first true commercial product with expected 2027 launch. Current deployments: Mercedes-Benz (factory testing), GXO Logistics (warehouse operations), Jabil (manufacturing). Jabil partnership includes building Apollo robots and integrating them into Jabil manufacturing operations — "Apollo building Apollo" self-production concept. Apollo specs: approximately 6ft height, 55lbs lifting capacity, designed for 22 hours/day, 7 days/week operation. Elevate Robotics subsidiary (founded June 2025) focusing on "superhuman" industrial automation applications. Team expanded to 300+ employees, Austin headquarters with planned California office.',
  'en', 'business', 'robot',
  md5('apptronik-935m-apollo3-commercial-2027-2026-09-18'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","Jabil","GXO","QIA","John Deere"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","Robot Park"],"marketInsights":["$935M total Series A","$5B valuation","Apollo 3 commercial 2027","3 enterprise customers"],"keyPoints":["$520M extension round","Gemini Robotics integration","Apollo builds Apollo","22hr/day 7day operation"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-935m-apollo3-commercial-2027-2026-09-18'));

-- [Regulation] China humanoid standards + EU Machinery Regulation
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Global Humanoid Robot Standards Race: China Publishes First Framework, EU Regulation Mandatory Jan 2027',
  'SESEC / Robotics & Automation News / RoboticsBiz',
  'https://sesec.eu/2026/04/01/chinas-first-standards-system-for-humanoid-robots-and-embodied-intelligence/',
  '2026-09-18'::timestamp,
  'China released first-ever Standards System for Humanoid Robots and Embodied Intelligence (2026 Edition) in Feb 2026. EU Machinery Regulation (2023/1230) becomes mandatory Jan 20, 2027 covering AI-enabled robots. ISO 25785-1 for dynamically stable robots under development. Less than 15% of commercial humanoids hold complete industrial CE file.',
  'Global humanoid robot regulation update September 2026. China: Published "Standards System for Humanoid Robots and Embodied Intelligence (2026 Edition)" in February 2026 — first high-level standards framework covering entire value chain and full lifecycle of humanoid robots and embodied intelligence. EU: Machinery Regulation (EU) 2023/1230 becomes mandatory January 20, 2027, replacing Machinery Directive 2006/42/EC. Explicitly covers robots with digital and AI components, combining with EU AI Act for comprehensive AI-enabled humanoid regulation. International: ISO 10218:2025 and ANSI/A3 R15.06-2025 govern current safety standards. ISO 25785-1 under development specifically for dynamically stable robots (bipedal humanoids). ISO 12100 and ISO 13849-1 form the foundation with ISO 10218-1/2:2025 as core robot standard. Market reality: fewer than 15% of commercial humanoids hold complete industrial CE file in 2026. Key implication for LG: any humanoid product targeting EU market must comply with both Machinery Regulation and AI Act from January 2027. China''s standards leadership may create parallel compliance requirements for manufacturers targeting both markets.',
  'en', 'industry', 'robot',
  md5('global-humanoid-standards-china-eu-2026-09-18'),
  '{"mentionedCompanies":[],"mentionedRobots":[],"technologies":["ISO 25785-1","ISO 10218:2025","EU AI Act","Machinery Regulation 2023/1230"],"marketInsights":["<15% CE compliant","EU mandatory Jan 2027","China first standards system","Dual compliance needed"],"keyPoints":["China 2026 Edition standards","EU Machinery Reg + AI Act","ISO 25785-1 in development","15% CE compliance rate"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('global-humanoid-standards-china-eu-2026-09-18'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Unitree G1+
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Unitree G1+ 공식 출시 — 6대 업그레이드, 숄더 토크 110%↑, ¥95,000',
   'G1 풀 업그레이드 G1+ 출시. 목 2DOF 추가, 숄더·허리 토크 110% 증가·발열 72% 감소, 비전·촉각 강화. ¥95,000.',
   '{"company":"Unitree","robot":"G1+","event":"product_launch","price":"¥95,000","torque_increase":"110%","heat_reduction":"72%","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%G1+%출시%');

-- Agility Digit 5 orders $300M+
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'critical',
   'Agility Digit 5 수주 $300M+ 돌파 — SPAC $2.5B 상장, EU·UK 진출 예정',
   'Digit 5 멀티이어 수주 $300M+. Churchill Capital SPAC $2.5B 합병 진행. Foxconn PIPE $200M. EU·UK 최초 해외 배치. NVIDIA Halos 최초 통합.',
   '{"company":"Agility Robotics","robot":"Digit 5","event":"orders_milestone","orders":"$300M+","spac_value":"$2.5B","expansion":"EU/UK","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Digit 5%300M%');

-- Figure AI Figure 04 + home
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'warning',
   'Figure AI — Figure 04 설계 확정, 가정용 월 $600 구독 모델 발표',
   'Figure 04 설계 locked(5월). Figure 03 350대+ 납품, 204K 패키지 자율 분류. 가정용 $600/월 구독 예고. 4년 내 100K대 목표.',
   '{"company":"Figure AI","robot":"Figure 04","event":"design_locked","home_subscription":"$600/mo","units_delivered":"350+","packages_sorted":"204K","confidence":"B"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure%04%설계%');

-- Atlas Gen 5
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Atlas 5세대 — 부품 복잡도 "한 자릿수" 축소, 30,000대/년 생산 체제',
   '7월 Atlas 5세대 공개. 복잡도 order of magnitude 축소. Hyundai 활용 연 30K 생산. 2026 전량 완판. $420K/대.',
   '{"company":"Boston Dynamics","robot":"Atlas Gen 5","event":"gen5_launch","production":"30K/yr","price":"$420K","complexity":"order of magnitude simpler","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Atlas 5세대%');

-- Agibot 15K + IPO
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Agibot 누적 15,000대 생산, 2025 글로벌 1위(39%) — 홍콩 IPO $5-6B 추진',
   '6/28 15,000번째 유닛. Omdia 2025 글로벌 1위(39%). H1 2026 8,400대 출하. 홍콩 IPO $5.1-6.4B, 전략투자자 LG전자·BYD.',
   '{"company":"Agibot","event":"production_milestone","units":"15,000","market_share":"39%","ipo_target":"$5.1-6.4B","lg_investor":true,"confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Agibot%15,000%');

-- 1X NEO production
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   '1X NEO 양산 개시 — 10,000대 5일 완판, EQT 10K 딜, $20K/$499월',
   'Hayward 공장 양산 개시. 초년 10K대 5일 완판. EQT 10K딜(300+ 포트폴리오사). $20K 또는 $499/월. 25 DOF IP68 핸드.',
   '{"company":"1X Technologies","robot":"NEO","event":"mass_production_start","sold_units":"10,000 in 5 days","eqt_deal":"10K units","price":"$20K","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%1X NEO%양산%');

-- Apptronik $935M
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   'Apptronik Series A 총 $935M, $5B 밸류 — Apollo 3 상용화 2027',
   '$520M 확장(총 $935M, $5B). Google DeepMind Gemini Robotics 통합. Apollo 3 최초 상용제품 2027. Mercedes·GXO·Jabil 배치 중.',
   '{"company":"Apptronik","event":"funding_extension","total":"$935M","valuation":"$5B","apollo3":"2027","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apptronik%935M%');

-- Regulation update
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   '글로벌 휴머노이드 표준 경쟁: 중국 2026 Edition 발표, EU 2027.1 의무화',
   '중국 휴머노이드·체화지능 첫 표준체계 발표(2/2026). EU Machinery Reg 2027.1.20 의무화. 상용 휴머노이드 CE 파일 보유 15% 미만.',
   '{"event":"regulation_update","china":"2026 Edition standards","eu":"2023/1230 mandatory Jan 2027","ce_compliance":"<15%","confidence":"A"}'::jsonb,
   false, '2026-09-18'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%글로벌 휴머노이드 표준%');

COMMIT;
