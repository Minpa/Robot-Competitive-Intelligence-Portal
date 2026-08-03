-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-26
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- 이전 스크립트(2026-07-24)와 중복되지 않는 신규 항목만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트) — 신규 항목
--    content_hash 기반 중복 방지
-- ============================================================

-- [Tesla] Musk: TSMC·Samsung·Micron을 Optimus 핵심 공급망 파트너로 명시 — $25B+ CapEx (A, 2026-07-22)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla Names TSMC, Samsung, Micron as Key Optimus Supply Chain Partners — $25B+ Annual CapEx Cycle Begins',
  'DigiTimes / BigGo Finance / Inc.',
  'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
  '2026-07-22'::timestamp,
  'Tesla Q2 실적 콜(7/22)에서 Musk가 TSMC·Samsung·Micron을 Optimus 핵심 공급망 파트너로 직접 명시. TSMC(애리조나)·Samsung(텍사스) 수백억 달러 규모 반도체 팹 투자로 Optimus/Robotaxi AI 컴퓨트 지원. Micron은 "매우 유의미한" 메모리 할당 제공. Tesla 연간 CapEx $25B+ 가이던스 제시, 향후 2-3년 더 증가. FCF 마이너스 전환 예고. 공급망을 전량 자체 구축/인소싱해야 하는 Optimus의 구조적 과제 재확인.',
  'During Tesla''s Q2 2026 earnings call on July 22, CEO Elon Musk explicitly named TSMC, Samsung, and Micron as critical supply chain partners for Optimus humanoid robot scale-up. TSMC is building fabs in Arizona and Samsung in Texas, each investing tens of billions of dollars to provide AI compute capacity for Optimus and Robotaxi programs. Micron has provided Tesla with a "very significant" memory allocation on reasonable terms. Tesla announced full-year CapEx guidance exceeding $25 billion, with further growth expected over the next 2-3 years, pushing free cash flow into negative territory. Musk emphasized that Optimus requires an entirely new supply chain built from scratch or insourced, as most components have no existing supplier base — making it "the hardest product to scale manufacturing that we''ve ever made at Tesla."',
  'en', 'industry', 'robot',
  md5('tesla-tsmc-samsung-micron-optimus-supply-chain-q2-2026-07-22'),
  '{"confidence":"A","mentionedCompanies":["Tesla","TSMC","Samsung","Micron"],"mentionedRobots":["Optimus","Robotaxi"],"technologies":["AI compute","semiconductor fab","memory allocation"],"marketInsights":["TSMC/Samsung tens of billions in fab investment","Micron significant memory allocation","$25B+ annual CapEx guidance","FCF negative territory ahead"],"keyPoints":["TSMC Arizona fab for Optimus/Robotaxi compute","Samsung Texas fab investment","Micron memory allocation confirmed","Supply chain fully new — hardest manufacturing scale ever"],"summaryKo":"Tesla Q2 콜에서 TSMC·Samsung·Micron을 Optimus 핵심 파트너로 명시. 수백억 달러 팹 투자. CapEx $25B+, FCF 마이너스 전환. 공급망 전량 신규 구축 과제 재확인."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-tsmc-samsung-micron-optimus-supply-chain-q2-2026-07-22'));

-- [Tesla] Musk: Optimus 생산 S-curve "초기 구간이 매우 길고 평탄할 것" 경고 (A, 2026-07-25)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Musk Updates Optimus Progress: Production S-Curve Will Be "Long and Flat" Initially — Fremont Lines Installing',
  'The AI Insider / Yahoo Finance',
  'https://theaiinsider.tech/2026/07/25/musk-updates-progress-of-teslas-optimus-humanoid-robot-warns-of-long-and-flat-production-ramp/',
  '2026-07-25'::timestamp,
  'Musk(7/25), Optimus 생산 진행상황 업데이트. S-curve 초기 구간이 "매우 길고 평탄할 것"이라 경고. Optimus V3 약 10,000개 고유 부품 — 차량 대비 기존 공급망 없음. Fremont 1세대 생산라인 설치 진행 중. 7월 말~8월 초 생산 시작 예정. "Optimus가 Tesla 최대 제품이 될 것"이라 재확인. Thumbs(엄지) 설계가 현재 핵심 엔지니어링 과제.',
  'Elon Musk provided a progress update on Tesla''s Optimus humanoid robot on July 25, 2026, warning that while Optimus will follow a typical S-curve in production ramp, "the initial portion of the S-curve will be quite flat and long." This is because Optimus Gen 3 involves roughly 10,000 unique parts and cannot rely on any established supply chain — unlike Tesla vehicles. First-generation production lines are currently being installed at Fremont, with production anticipated to begin in late July to early August 2026. Musk reiterated his belief that Optimus will become "Tesla''s biggest product ever." A notable engineering challenge highlighted was the design of the robot''s thumbs — achieving human-level dexterity in the hand mechanism remains a critical bottleneck.',
  'en', 'product', 'robot',
  md5('tesla-optimus-long-flat-scurve-production-warning-2026-07-25'),
  '{"confidence":"A","mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3","Optimus V3"],"technologies":["thumb dexterity engineering","S-curve production ramp"],"marketInsights":["Production start late July - early August","10,000 unique parts with no existing supply chain","Long and flat initial S-curve warning","Biggest product ever claim reiterated"],"keyPoints":["S-curve initial portion long and flat","Fremont lines currently installing","Thumb design = key engineering bottleneck","Production start late July to early August 2026"],"summaryKo":"Musk(7/25) Optimus 진행 업데이트. S-curve 초기 길고 평탄할 것 경고. 10K 고유 부품, 공급망 전무. Fremont 라인 설치 중. 7월말~8월초 생산 시작. 엄지 설계가 핵심 난제."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-long-flat-scurve-production-warning-2026-07-25'));

-- [Agility Robotics] $2.5B SPAC 합병 — 미국 최초 휴머노이드 전문 상장사 탄생 예정 (A, 2026-06-24~07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics to Go Public via $2.5B SPAC Merger — First Pure-Play US Humanoid IPO, Nasdaq Ticker AGLT',
  'TechCrunch / GeekWire / TechTimes',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  '2026-07-07'::timestamp,
  'Agility Robotics, Churchill Capital XI(CCXI)과 $2.5B SPAC 합병 계약 체결(6/24 발표). 미국 최초 휴머노이드 로봇 전문 상장사. Nasdaq 티커 "AGLT"로 거래 예정, 2026년 내 거래 시작 목표. $620M+ 신규 자금 조달. Digit v5 $300M+ 다년 주문 확보. GXO, Schaeffler, Toyota Canada, Mercado Libre 등 배치 중. 65,000+ 시간 실환경 운용. 약 75대 글로벌 설치. 기업가치 $2.5B.',
  'Agility Robotics announced on June 24, 2026, that it will go public through a $2.5 billion SPAC merger with Churchill Capital Corp XI (CCXI). The deal makes Agility the first pure-play humanoid robotics company to list on a US stock exchange. The combined entity will trade on Nasdaq under ticker "AGLT," with closing expected by end of 2026. The transaction raises over $620 million in new funding. Agility has secured more than $300 million of multi-year orders for Digit v5, with a pipeline multiple times that amount. Current customers include GXO Logistics, Schaeffler, Toyota Motor Manufacturing Canada (RaaS deal, Feb 2026, 7 units), and Mercado Libre. The Digit fleet has logged over 65,000 hours of real-world operation across approximately 75 installed units globally.',
  'en', 'industry', 'robot',
  md5('agility-robotics-spac-2.5b-nasdaq-aglt-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Agility Robotics","Churchill Capital XI","GXO","Schaeffler","Toyota","Mercado Libre"],"mentionedRobots":["Digit","Digit v5"],"technologies":[],"marketInsights":["$2.5B SPAC merger valuation","First US pure-play humanoid IPO","$620M+ new funding","$300M+ multi-year Digit v5 orders"],"keyPoints":["SPAC with Churchill Capital XI (CCXI)","Nasdaq ticker AGLT","$620M+ new capital raised","65,000+ hours real-world operation, ~75 units"],"summaryKo":"Agility Robotics, $2.5B SPAC 합병으로 미국 최초 휴머노이드 전문 상장. Nasdaq AGLT. $620M+ 신규 자금. Digit v5 $300M+ 다년 주문. 75대 글로벌 배치, 65K+ 시간 운용."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-robotics-spac-2.5b-nasdaq-aglt-2026-07'));

-- [Agility Robotics] Fremont AI 허브 개설 — Digit 개발 가속, Tesla 홈그라운드 진출 (B, 2026-07-17)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics Opens Fremont AI Hub — Plants Flag in Tesla Backyard to Accelerate Digit Physical AI',
  'TechCrunch / Robotics and Automation News',
  'https://techcrunch.com/2026/07/17/agility-robotics-plants-its-flag-in-teslas-backyard/',
  '2026-07-17'::timestamp,
  'Agility Robotics, Fremont(캘리포니아)에 신규 AI 허브 개설(7/17). Tesla 본거지에 전략적 진출. Digit 휴머노이드 로봇 physical AI 개발 가속 목적. 30+ 고객 파이프라인 확대 지원. NVIDIA Halos 안전 플랫폼 통합 — 업계 최초. Digit v5 2026년 상용 출시 예정(Halos 인증 진행 중).',
  'Agility Robotics opened a new AI hub in Fremont, California on July 17, 2026, strategically locating in Tesla''s backyard to accelerate physical AI development for its Digit humanoid robot. The facility supports growing enterprise deployments with a pipeline of over 30 customers. Notably, Agility became the first company to integrate NVIDIA''s new Halos safety platform into a humanoid robot (Digit). Digit v5''s commercial launch is scheduled for 2026, pending the NVIDIA Halos certification process that will determine how quickly cooperative safety operation can be formally approved at enterprise customer sites.',
  'en', 'industry', 'robot',
  md5('agility-fremont-ai-hub-nvidia-halos-digit-2026-07-17'),
  '{"confidence":"B","mentionedCompanies":["Agility Robotics","NVIDIA","Tesla"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos safety platform","physical AI"],"marketInsights":["Fremont AI hub opened (Tesla territory)","30+ customer pipeline","First NVIDIA Halos integration in humanoid","Digit v5 commercial launch 2026"],"keyPoints":["New Fremont facility for physical AI R&D","First-ever NVIDIA Halos integration","Digit v5 launch pending Halos certification","Strategic location in Tesla backyard"],"summaryKo":"Agility, Fremont AI 허브 개설(7/17). Tesla 본거지 진출. NVIDIA Halos 안전 플랫폼 업계 최초 통합. Digit v5 2026년 상용 출시(Halos 인증 중). 30+ 고객 파이프라인."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-fremont-ai-hub-nvidia-halos-digit-2026-07-17'));

-- [Unitree] STAR Market IPO 승인 — 역대 최단 기록, 4.2B 위안 조달 (A, 2026-07-03)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Robotics Wins STAR Market IPO Approval — $618M Raise, Fastest-Ever Registration in 73 Days',
  'Caixin Global / KraneShares / BigGo Finance',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  '2026-07-03'::timestamp,
  'Unitree Robotics, STAR Market IPO 등록 승인 획득(7/3). 4.2B 위안(약 $618M) 조달 예정. 접수~승인 73일로 STAR Market 사전심사 체계 도입 이후 최단 기록. 조달 자금: 체화지능 AI 모델 R&D, 로봇 하드웨어 개발, 신규 제조 기지 구축. 2025년 5,500+ 휴머노이드 출하, RMB 1.69B 매출. 2026년 20,000대 출하 목표. 순수 휴머노이드 최초 상장사(중국). 상장 시기 7월 말 예상.',
  'China''s Securities Regulatory Commission (CSRC) officially approved Unitree Technology''s STAR Market IPO registration on July 3, 2026. The company plans to raise 4.2 billion yuan (approximately $618 million USD). The IPO application was formally accepted on March 20 and passed the listing committee review on June 1, taking only 73 days — the shortest timeframe since the STAR Market''s "pre-review" mechanism was implemented. Proceeds will fund embodied intelligence AI model R&D, robot hardware development, and a new manufacturing base. In 2025, Unitree shipped 5,500+ humanoid robots on revenue of RMB 1.69 billion with adjusted profitability. The company targets 20,000 humanoid shipments in 2026. Unitree will become the first pure-play humanoid robotics company listed in China. Listing expected late July 2026.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-ipo-618m-approval-2026-07-03'),
  '{"confidence":"A","mentionedCompanies":["Unitree Robotics","CSRC","SSE"],"mentionedRobots":["G1","H1","H2"],"technologies":["embodied intelligence AI"],"marketInsights":["$618M IPO raise","73-day fastest STAR Market approval ever","2025: 5,500+ humanoids shipped, RMB 1.69B revenue","2026 target: 20,000 humanoid shipments"],"keyPoints":["STAR Market IPO approved July 3","$618M raise for AI R&D + manufacturing","Fastest-ever registration (73 days)","First pure-play humanoid listing in China"],"summaryKo":"Unitree, STAR Market IPO 승인(7/3). $618M 조달. 73일 역대 최단 승인. 2025년 5,500+ 출하/RMB 1.69B 매출. 2026년 20K대 목표. 중국 최초 순수 휴머노이드 상장."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-618m-approval-2026-07-03'));

-- [Unitree] 2026년 20,000대 출하 목표 — G1 $16K부터, H1 $90K, H2 $29.9K (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Targets 20,000 Humanoid Shipments in 2026 — G1 from $16K, H2 at $29.9K, Industry-Low Pricing Strategy',
  'eWeek / Forbes / BotInfo',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-07-10'::timestamp,
  'Unitree, 2026년 20,000대 휴머노이드 출하 목표(2025년 5,500대 대비 3.6배). G1 $16,000(기본)~$43,900(EDU), H1 $90,000, H2 $29,900. 업계 최저 수준 가격 전략. G1 극한 환경 테스트: -47°C 알타이 설원 130,000보 자율 보행. 무술 루틴(전자율), 트램폴린 공중 회전(3m 높이), 4m/s 주행. 세계 최초 휴머노이드 앱스토어 출시.',
  'Unitree Robotics is targeting 20,000 humanoid robot shipments in 2026, a 3.6x increase from the 5,500+ units shipped in 2025. Current pricing includes G1 from $16,000 (base) to $43,900 (EDU configurations), H1 at $90,000, and the newer H2 at $29,900 — maintaining an industry-leading low-price strategy. The G1 has been tested in extreme conditions including -47°C temperatures in China''s Altay snowfields, completing 130,000 autonomous steps. Performance demonstrations include fully autonomous kung fu routines, trampoline somersaults reaching 3 meters, and running at up to 4 m/s. Unitree also launched what it describes as the world''s first Humanoid Robot App Store, signaling a move toward modular, software-driven ecosystems.',
  'en', 'product', 'robot',
  md5('unitree-20000-shipments-2026-g1-pricing-app-store'),
  '{"confidence":"B","mentionedCompanies":["Unitree Robotics"],"mentionedRobots":["G1","H1","H2"],"technologies":["humanoid app store","-47C cold weather autonomy","4 m/s running"],"marketInsights":["20,000 unit target for 2026 (3.6x YoY)","G1 from $16K — industry-low pricing","H2 at $29.9K","World first humanoid app store"],"keyPoints":["20K unit 2026 target vs 5.5K in 2025","G1 $16K / H1 $90K / H2 $29.9K","Extreme cold test: -47C, 130K autonomous steps","First humanoid app store launched"],"summaryKo":"Unitree, 2026년 20K대 출하 목표(3.6배 성장). G1 $16K~/H1 $90K/H2 $29.9K 업계 최저가. -47°C 극한 테스트. 세계 최초 휴머노이드 앱스토어 출시."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-20000-shipments-2026-g1-pricing-app-store'));

-- [Agibot] 15,000번째 로봇 양산 달성 — 글로벌 출하 1위(2025년 39% 점유) (A, 2026-06-28)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AGIBOT Rolls Out 15,000th Robot — Global #1 in Humanoid Shipments (39% Market Share per Omdia)',
  'PR Newswire / eWeek / Robotics and Automation News',
  'https://en.prnasia.com/releases/apac/agibot-s-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-538948.shtml',
  '2026-06-28'::timestamp,
  'Agibot, 15,000번째 로봇 양산 달성(6/28). 마일스톤 유닛: G2 산업용 체화 작업 로봇. Omdia 기준 2025년 글로벌 휴머노이드 출하 1위(5,168대, 39% 점유). 1K→5K 제품 검증→배치 전환, 5K→10K 규모 제조 달성, 10K→15K 대규모 실배치 확대 단계. 36시간 만에 생산라인 통합, 시프트당 3,000 태블릿 처리, 64시간+ 연속 운용(다운타임 4% 미만).',
  'AGIBOT announced on June 28, 2026, that its 15,000th robot has rolled off the production line. The milestone unit is the AGIBOT G2, an industrial-grade embodied task robot. According to Omdia, AGIBOT ranked first globally in humanoid robot shipments and market share in 2025, with annual shipments of 5,168 units and a 39% share. The production journey: 1,000→5,000 marked transition from product validation to batch delivery; 5,000→10,000 demonstrated scaled manufacturing; 10,000→15,000 represents large-scale real-world deployment. In automotive assembly integration, the production line was integrated within 36 hours, supports ~3,000 tablets per shift, and the robots logged 64+ hours of continuous operation with downtime below 4%.',
  'en', 'industry', 'robot',
  md5('agibot-15000-robot-milestone-global-1-omdia-2026-06-28'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","Omdia"],"mentionedRobots":["G2"],"technologies":["embodied task automation","36-hour production line integration"],"marketInsights":["15,000th robot milestone (June 28)","Global #1 humanoid shipments 2025 — 39% market share (Omdia)","5,168 units shipped in 2025","3,000 tablets/shift, 64hr+ continuous operation"],"keyPoints":["15,000 cumulative production milestone","Global #1 by Omdia (39% share in 2025)","G2 milestone unit — industrial embodied robot","36hr production line integration, <4% downtime"],"summaryKo":"Agibot, 15,000번째 로봇 양산(6/28). Omdia 기준 2025년 글로벌 1위(5,168대, 39% 점유). G2 산업용 로봇. 36시간 라인 통합, 3K 태블릿/시프트, 64시간+ 연속 운용."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-robot-milestone-global-1-omdia-2026-06-28'));

-- [Figure AI] $39B 기업가치 — 시리즈 C $1B+ 클로즈, BotQ 연 12K대 생산 (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure AI Valued at $39B — Series C $1B+ Close, BotQ Factory Targets 12,000 Units/Year Production',
  'Forge Global / Sacra / Crunchbase News',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-07-20'::timestamp,
  'Figure AI 기업가치 $39B — 세계 최고 기업가치 순수 휴머노이드 기업. 시리즈 C(2025.9) $1B+ 클로즈, Parkway Venture Capital 리드, Brookfield·Nvidia·Intel Capital·Salesforce 참여. 총 누적 투자 $2.34B. BotQ 자체 공장 연 12,000대 생산 목표. Figure 02(168cm/20kg 페이로드/Helix VLA 모델) 8시간 자율 공장 시프트 달성(2026.1). Figure 03(175cm/61kg/20kg/1.2m/s, 달리기 가능) 350대+ 납품 완료.',
  'Figure AI is valued at $39 billion, making it the best-funded pure-play humanoid company globally. Its Series C closed in September 2025 at just over $1 billion, led by Parkway Venture Capital with participation from Brookfield, Nvidia, Intel Capital, and Salesforce. Total cumulative funding stands at approximately $2.34 billion. The company operates its own BotQ manufacturing facility targeting 12,000 units per year. Figure 02 (168cm, 20kg payload, Helix VLA model) achieved full 8-hour autonomous factory shifts in January 2026. Figure 03 (175cm, 61kg, 20kg payload, 1.2 m/s walk, running capability) has delivered 350+ units and operates at BMW''s Spartanburg plant.',
  'en', 'industry', 'robot',
  md5('figure-ai-39b-valuation-botq-12k-production-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Figure AI","Parkway Venture Capital","Brookfield","Nvidia","Intel Capital","Salesforce","BMW"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["Helix VLA model","BotQ manufacturing"],"marketInsights":["$39B valuation — highest pure-play humanoid","$2.34B total funding","BotQ 12,000 units/year target","Series C $1B+ (Sep 2025)"],"keyPoints":["$39B valuation, $2.34B total raised","BotQ factory 12K/yr target","Figure 02: 8hr autonomous shifts achieved","Figure 03: 350+ delivered, running capability"],"summaryKo":"Figure AI $39B 기업가치 — 순수 휴머노이드 세계 최고. 누적 $2.34B 투자. BotQ 연 12K대 생산. Figure 02 8시간 자율 시프트, Figure 03 350대+ 납품."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-39b-valuation-botq-12k-production-2026-07'));

-- [Apptronik] $520M 시리즈 A-X — $5B 기업가치, John Deere·QIA 신규 투자 (A, 2026-02)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  'Apptronik Raises $520M Series A-X at $5B Valuation — John Deere, QIA, AT&T Ventures Join Google, Mercedes',
  'CNBC / GlobeNewsWire',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'::timestamp,
  'Apptronik, $520M 시리즈 A-X 투자 유치 발표(2/11). 기업가치 $5B. 기존 투자자 B Capital·Google·Mercedes-Benz·PEAK6 + 신규 AT&T Ventures·John Deere·Qatar Investment Authority(QIA) 참여. Google DeepMind Gemini Robotics 전략적 파트너십 지속. GXO Logistics·Jabil 등 글로벌 파트너. 조달 자금: Apollo 로봇 혁신 + 2026년 신규 로봇 출시 준비.',
  'Apptronik announced a $520 million Series A-X funding round in February 2026, valuing the company at $5 billion. The round included existing investors B Capital, Google, Mercedes-Benz, and PEAK6, along with new investors AT&T Ventures, John Deere, and Qatar Investment Authority (QIA). Apptronik maintains an industry-leading strategic partnership with Google DeepMind to build humanoid robots powered by Gemini Robotics. Enterprise partners include GXO Logistics, Jabil, and Mercedes-Benz. The funding supports continued Apollo robot innovation and development of a highly anticipated new robot set to debut in 2026.',
  'en', 'industry', 'robot',
  md5('apptronik-520m-series-a-x-5b-valuation-2026-02'),
  '{"confidence":"A","mentionedCompanies":["Apptronik","Google","Mercedes-Benz","John Deere","QIA","AT&T Ventures","B Capital","PEAK6","GXO","Jabil"],"mentionedRobots":["Apollo","Apollo 2","Apollo 3"],"technologies":["Gemini Robotics"],"marketInsights":["$520M Series A-X","$5B valuation","New investors: John Deere, QIA, AT&T Ventures","New robot debut planned 2026"],"keyPoints":["$520M at $5B valuation (Feb 2026)","John Deere and QIA join as new investors","Google DeepMind Gemini Robotics partnership","New robot debut anticipated 2026"],"summaryKo":"Apptronik $520M 시리즈 A-X, $5B 기업가치(2/11). John Deere·QIA·AT&T Ventures 신규 참여. Google DeepMind Gemini Robotics 파트너십. 2026년 신규 로봇 출시 예정."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-520m-series-a-x-5b-valuation-2026-02'));

-- [1X Technologies] Hayward CA 공장 개설 — 미국 최초 수직통합 휴머노이드 공장, 첫해 10K대 (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Opens Hayward CA Factory — First Vertically Integrated US Humanoid Manufacturing, 10K Year-1 Capacity Sold Out',
  'TechFundingNews / TechCrunch / RoboZaps',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-07-15'::timestamp,
  '1X Technologies, Hayward(캘리포니아)에 58,000sqft 공장 개설. 미국 최초 수직통합 휴머노이드 로봇 제조시설 자처. 첫해 10,000대 NEO 생산 능력. 2025.10 사전주문 개시 5일 만에 초년 생산분 전량 매진. 2027년 말까지 100,000대 목표. $20K 가격. EQT 포트폴리오 300개+ 기업 대상 최대 10,000대 공급 계약(2026~2030). 총 누적 투자 $126M+. OpenAI Startup Fund 지원.',
  '1X Technologies has opened a 58,000-square-foot factory in Hayward, California, describing it as the first vertically integrated humanoid robot manufacturing facility in the United States. The facility has capacity to produce 10,000 NEO robots in its first year, with consumer shipments planned before end of 2026. The company''s entire first-year production capacity sold out within five days of preorders opening in October 2025, targeting 100,000 units by end of 2027. NEO is priced at $20,000. 1X has a deal to ship up to 10,000 NEO robots to EQT''s 300+ portfolio companies between 2026 and 2030, focused on manufacturing, warehousing, logistics, and industrial use cases. Total funding stands at $126M+ with backing from OpenAI Startup Fund.',
  'en', 'industry', 'robot',
  md5('1x-hayward-factory-10k-capacity-sold-out-2026-07'),
  '{"confidence":"A","mentionedCompanies":["1X Technologies","OpenAI","EQT"],"mentionedRobots":["NEO"],"technologies":["vertically integrated manufacturing"],"marketInsights":["58K sqft Hayward CA factory — first US vertical integration","10K year-1 capacity — sold out in 5 days","100K units by end 2027 target","$20K price point","EQT deal: up to 10K robots 2026-2030"],"keyPoints":["US first vertically integrated humanoid factory","10K year-1 sold out in 5 days","EQT 10K-unit deal across 300+ companies","$20K price, $126M+ total funding"],"summaryKo":"1X, Hayward에 58K sqft 공장 개설. 미국 최초 수직통합 휴머노이드 공장. 첫해 10K대 — 5일 만에 매진. 2027년 100K 목표. $20K. EQT 10K대 공급 계약."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-hayward-factory-10k-capacity-sold-out-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림) — 신규 항목
-- ============================================================

-- [CRITICAL] Tesla Optimus 공급망 파트너 공식 발표 — TSMC·Samsung·Micron
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'critical',
  '[Tesla] TSMC·Samsung·Micron을 Optimus 핵심 공급망 파트너로 명시(7/22) — $25B+ CapEx, 생산 S-curve 경고',
  'Q2 실적 콜에서 TSMC(AZ팹)·Samsung(TX팹)·Micron(메모리)을 Optimus 핵심 파트너로 명시. 연간 $25B+ CapEx 가이던스. 7/25 추가 업데이트: S-curve 초기 "길고 평탄", 엄지 설계가 핵심 난제. Fremont 라인 설치 중, 7월말~8월초 생산 시작. 반도체 3대 기업과 직접 파트너십은 Optimus 공급망 성숙도 상승 신호.',
  '{"source":"DigiTimes / BigGo Finance / AI Insider","confidence":"A","date":"2026-07-22","partners":["TSMC (Arizona fab)","Samsung (Texas fab)","Micron (memory)"],"capex":"$25B+ annual","production_start":"late July - early Aug 2026","s_curve":"long and flat initially","engineering_challenge":"thumb dexterity"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%TSMC%Samsung%Micron%Optimus%'
  AND created_at > '2026-07-20'::timestamp
);

-- [CRITICAL] Agility Robotics SPAC $2.5B — 미국 최초 휴머노이드 상장
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'critical',
  '[Agility] $2.5B SPAC 합병 — 미국 최초 휴머노이드 전문 상장사(AGLT), $620M+ 자금 조달',
  'Agility Robotics, Churchill Capital XI과 $2.5B SPAC 합병(6/24 발표). 미국 최초 순수 휴머노이드 상장사. Nasdaq "AGLT". $620M+ 신규 자금. Digit v5 $300M+ 다년 주문. NVIDIA Halos 업계 최초 통합. Fremont AI 허브 개설(7/17). 75대 글로벌 배치, 65K+ 시간 운용. 자금력·시장 접근성 급증.',
  '{"source":"TechCrunch / GeekWire / TechTimes","confidence":"A","date":"2026-06-24","deal":"$2.5B SPAC with Churchill Capital XI","ticker":"AGLT","new_funding":"$620M+","digit_v5_orders":"$300M+ multi-year","customers":["GXO","Schaeffler","Toyota Canada","Mercado Libre"],"installed_base":"~75 units","operation_hours":"65,000+","nvidia_halos":"first integration"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agility%SPAC%$2.5B%'
  AND created_at > '2026-06-20'::timestamp
);

-- [CRITICAL] Unitree STAR Market IPO — 중국 최초 순수 휴머노이드 상장
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'critical',
  '[Unitree] STAR Market IPO 승인(7/3) — $618M 조달, 역대 최단 73일, 2026년 20K대 출하 목표',
  'Unitree, STAR Market IPO 승인(7/3). $618M(4.2B위안) 조달. 73일 역대 최단 승인. 2025년 5,500+ 출하/RMB 1.69B 매출. 2026년 20,000대 목표(3.6배). G1 $16K~/H2 $29.9K 업계 최저가. 중국 최초 순수 휴머노이드 상장. 세계 최초 휴머노이드 앱스토어. -47°C 극한 테스트 완료.',
  '{"source":"Caixin Global / KraneShares / BigGo Finance","confidence":"A","date":"2026-07-03","ipo_raise":"$618M (4.2B CNY)","approval_days":73,"2025_shipments":"5,500+","2025_revenue":"RMB 1.69B","2026_target":"20,000 units","pricing":{"G1":"$16K+","H1":"$90K","H2":"$29.9K"},"innovations":["first humanoid app store","-47C cold test"]}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%STAR Market%IPO%'
  AND created_at > '2026-06-25'::timestamp
);

-- [WARNING] Agibot 15,000대 양산 달성 — 글로벌 1위 (Omdia 39%)
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[Agibot] 15,000번째 로봇 양산 달성(6/28) — 2025년 글로벌 출하 1위(Omdia 39% 점유)',
  'Agibot, 15,000번째 로봇 양산(6/28). Omdia 기준 2025년 글로벌 1위(5,168대, 39% 점유). G2 산업용 체화 로봇이 마일스톤 유닛. 36시간 생산라인 통합, 3K 태블릿/시프트, 64시간+ 연속 운용(다운타임 <4%). 양산 규모·실배치 실적에서 업계 선두.',
  '{"source":"PR Newswire / eWeek / Robotics and Automation News","confidence":"A","date":"2026-06-28","milestone":"15,000th robot","omdia_rank":"#1 globally (2025)","market_share":"39%","2025_shipments":"5,168","milestone_unit":"G2 industrial robot","integration":"36hr line integration","uptime":"64hr+ continuous, <4% downtime"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%15,000%양산%'
  AND created_at > '2026-06-20'::timestamp
);

-- [WARNING] Figure AI $39B 기업가치 — BotQ 12K대/년 생산 목표
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Figure AI] $39B 기업가치(세계 최고 순수 휴머노이드) — 누적 $2.34B 투자, BotQ 연 12K대',
  'Figure AI $39B 기업가치 — 순수 휴머노이드 세계 최고. 시리즈 C $1B+ 클로즈(2025.9). 누적 $2.34B 투자. BotQ 연 12K대 생산 목표. Figure 02 8시간 자율 시프트 달성. Figure 03 350대+ 납품, 1대/시간 생산. BMW Spartanburg 204K+ 패키지 자율 처리.',
  '{"source":"Forge Global / Sacra / Crunchbase News","confidence":"B","date":"2026-07-20","valuation":"$39B","total_funding":"$2.34B","series_c":"$1B+ (Sep 2025)","botq_capacity":"12,000/year","figure_02":"8hr autonomous shifts","figure_03":"350+ delivered, 1/hour production"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure AI%$39B%기업가치%'
  AND created_at > '2026-07-15'::timestamp
);

-- [WARNING] Apptronik $520M 시리즈 A-X — $5B 기업가치
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Apptronik] $520M 시리즈 A-X(2/11) — $5B 기업가치, John Deere·QIA·AT&T 신규 합류',
  'Apptronik $520M 시리즈 A-X, $5B 기업가치. John Deere·QIA·AT&T Ventures 신규 투자. Google DeepMind Gemini Robotics 파트너십 지속. Robot Park 90K sqft(오스틴). Apollo 2 듀얼 구성. Apollo 3 2026년 내 출시 예고. 농업·물류·자동차 다각적 투자자 구성.',
  '{"source":"CNBC / GlobeNewsWire","confidence":"A","date":"2026-02-11","raise":"$520M Series A-X","valuation":"$5B","new_investors":["John Deere","QIA","AT&T Ventures"],"existing":["Google","Mercedes-Benz","B Capital","PEAK6"],"partnerships":["Google DeepMind Gemini Robotics","GXO","Jabil"]}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Apptronik%$520M%$5B%'
  AND created_at > '2026-02-01'::timestamp
);

-- [INFO] 1X Technologies Hayward 공장 — 첫해 10K 매진
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'info',
  '[1X] Hayward CA 공장 개설 — 미국 최초 수직통합 휴머노이드 공장, 첫해 10K대 5일 매진',
  '1X, Hayward에 58K sqft 공장(미국 최초 수직통합). 첫해 10K대 — 사전주문 5일 만에 매진. 2027년 100K 목표. $20K 가격 유지. EQT 300개 기업 대상 최대 10K대 공급 계약(2026~2030). 소비자 배송 2026년 내 시작.',
  '{"source":"TechFundingNews / TechCrunch","confidence":"A","date":"2026-07-15","factory":"58K sqft Hayward CA","capacity":"10K year-1","sold_out":"5 days from preorder opening","2027_target":"100K units","price":"$20K","eqt_deal":"up to 10K robots, 300+ companies, 2026-2030"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%1X%Hayward%10K%매진%'
  AND created_at > '2026-07-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림) — 신규 항목
-- ============================================================

-- Tesla 공급망 파트너 공식 발표
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'DigiTimes / BigGo Finance',
  'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
  'Tesla, TSMC·Samsung·Micron을 Optimus 핵심 공급망 파트너로 공식 명시 — $25B+ CapEx(7/22)',
  'Q2 콜에서 TSMC(AZ)·Samsung(TX)·Micron 명시. CapEx $25B+. 7/25 S-curve 경고. Fremont 7월말 생산 시작.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla%TSMC%Samsung%Micron%Optimus%'
  AND detected_at > '2026-07-20'::timestamp
);

-- Agility SPAC IPO
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechCrunch / GeekWire',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  'Agility Robotics $2.5B SPAC 합병 — 미국 최초 휴머노이드 상장(Nasdaq AGLT), $620M+ 조달',
  '$2.5B SPAC(Churchill XI). Nasdaq AGLT. $620M+ 자금. Digit v5 $300M+ 주문. NVIDIA Halos 최초 통합. 75대 배치, 65K시간.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility%SPAC%$2.5B%'
  AND detected_at > '2026-06-20'::timestamp
);

-- Unitree IPO
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Caixin Global / KraneShares',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  'Unitree STAR Market IPO 승인(7/3) — $618M 조달, 73일 최단 승인, 2026년 20K대 출하 목표',
  'IPO 승인(7/3). $618M 조달. 73일 최단 기록. 2025년 5.5K 출하. 2026년 20K 목표. G1 $16K~/H2 $29.9K.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR name ILIKE '%Unitree%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%STAR Market%IPO%'
  AND detected_at > '2026-06-25'::timestamp
);

-- Agibot 15K 마일스톤
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'PR Newswire / eWeek',
  'https://en.prnasia.com/releases/apac/agibot-s-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-538948.shtml',
  'Agibot 15,000번째 로봇 양산 달성(6/28) — 2025년 글로벌 1위(Omdia 39% 점유)',
  '15K대 양산(6/28). Omdia 글로벌 1위(5,168대, 39%). G2 산업용. 36시간 라인통합, 64시간+ 연속 운용.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%15,000%양산%'
  AND detected_at > '2026-06-20'::timestamp
);

-- Figure AI $39B 기업가치
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forge Global / Sacra',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  'Figure AI $39B 기업가치 — 누적 $2.34B 투자, BotQ 연 12K대 생산, Figure 03 350대+ 납품',
  '$39B 기업가치(순수 휴머노이드 최고). $2.34B 누적. BotQ 12K/년. Figure 03 350+대. BMW 204K+ 패키지.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure AI%$39B%기업가치%'
  AND detected_at > '2026-07-15'::timestamp
);

-- Apptronik $520M
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik $520M 시리즈 A-X — $5B 기업가치, John Deere·QIA·AT&T Ventures 합류',
  '$520M at $5B. John Deere·QIA·AT&T 신규. Google DeepMind 파트너십. Apollo 2 듀얼 구성. 신규 로봇 2026 예고.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' OR name ILIKE '%Apollo%' OR name ILIKE '%Apptronik%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Apptronik%$520M%$5B%'
  AND detected_at > '2026-02-01'::timestamp
);

-- 1X Hayward 공장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechFundingNews / TechCrunch',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '1X Hayward CA 공장 개설 — 미국 최초 수직통합, 첫해 10K대 5일 매진, 2027년 100K 목표',
  '58K sqft 수직통합 공장. 10K 첫해(5일 매진). $20K. 2027년 100K. EQT 10K대 계약(2026~2030).',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' OR name ILIKE '%NEO%' OR name ILIKE '%1X%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X Hayward%10K%매진%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 10 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 7 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 7 (deduplicated by headline + date)
-- Total: up to 24 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처 / 복수 유력 매체 교차확인: 8건
--     Tesla TSMC/Samsung/Micron (DigiTimes / BigGo — Q2 실적 콜 기반)
--     Tesla Optimus S-curve 경고 (AI Insider / Yahoo — Musk 직접 발언)
--     Agility SPAC $2.5B (TechCrunch / GeekWire / TechTimes + SEC 서류)
--     Unitree IPO $618M (Caixin Global / KraneShares — CSRC 공식 승인)
--     Agibot 15K 양산 (PR Newswire / eWeek / R&A News — 공식 보도자료)
--     Apptronik $520M (CNBC — 공식 발표)
--     1X Hayward 공장 (TechFundingNews / TechCrunch — 공식 발표)
-- [B] 2개 이상 매체 교차확인: 3건
--     Agility Fremont AI 허브 (TechCrunch / R&A News)
--     Unitree 20K 출하 목표 (eWeek / Forbes / BotInfo)
--     Figure AI $39B (Forge Global / Sacra / Crunchbase)
--
-- NOTE: Railway PostgreSQL은 이 실행 환경에서 TCP 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-26.sql
-- ============================================================
