-- ============================================================
-- [ARGOS] 경쟁사 데이터 업데이트 — 2026-07-04
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-07-04.sql
-- 주의: 기존 07-03 업데이트 이후 신규 데이터만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- ----- Boston Dynamics: Atlas 5세대 간소화 설계 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       '[CRITICAL] Boston Dynamics Atlas 5세대 공개 — "거의 자릿수 단위" 복잡도 감소, Hyundai 30K/년 공장 계획',
       'Boston Dynamics가 Atlas 5세대(5th-gen) 휴머노이드를 공개. CEO Robert Playter: 부품 수 "almost order of magnitude" 감소, 모든 컴포넌트를 자동차 공급망과 호환 설계. 제조 속도 향상, 신뢰성 강화, 비용 절감을 통한 대량생산 전환 핵심. Hyundai는 미국에 $26B 투자 발표, 연 30,000대 생산 가능한 전용 로봇 공장 건설 예정(2028). 56 DOF, 4시간 런타임, 3분 자체 배터리 교환, 50kg 페이로드, 2.3m 리치. 2026년 전체 생산분 Hyundai RMAC + Google DeepMind에 커밋, 신규 고객은 2027년 초부터.',
       '{"source": "Forbes, Boston Dynamics Official", "sourceUrl": "https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/", "confidence": "A", "date": "2026-07-02", "generation": "5th", "complexityReduction": "almost order of magnitude", "automotiveSupplyChain": true, "hyundaiUSInvestment": "$26B", "annualCapacity": 30000, "factoryTarget": 2028, "dof": 56, "runtime_hours": 4, "batterySwap_minutes": 3, "payload_kg": 50, "reach_m": 2.3, "2026Committed": ["Hyundai RMAC", "Google DeepMind"], "newCustomers": "early 2027"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Boston Dynamics' AND hr.name ILIKE '%Atlas%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%Atlas 5세대%자릿수 단위%'
)
LIMIT 1;

-- ----- Figure AI: BotQ 24x 생산속도 달성 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       '[CRITICAL] Figure AI BotQ 생산속도 24배 향상 — 시간당 1대, 350대+ 출하, BMW 물류 배치 확대',
       'Figure AI BotQ 공장이 120일 만에 생산속도 24배 향상 달성: 일 1대 → 시간당 1대. 350대+ Figure 03 출하 완료. BMW Spartanburg에 40대 배치(물류 전환: 차체→부품 시퀀싱). BMW 유럽(뮌헨, 레겐스부르크, 라이프치히) 파일럿 진행 중. Helix 02 자율운영 실증: 8일간 167연속시간 가동, 209,000개 패키지 자율 분류. 2026년 초 12,000대/년 생산용량, 연말 소비자 가정용 제한 출시 계획.',
       '{"source": "Figure AI Official, BMW, faq.com.tw", "sourceUrl": "https://www.figure.ai/news/ramping-figure-03-production", "confidence": "A", "date": "2026-06", "productionRate": "1 per hour", "rateImprovement": "24x in 120 days", "totalShipped": "350+", "bmwSpartanburgUnits": 40, "bmwEuropePilots": ["Munich", "Regensburg", "Leipzig"], "helix02": {"consecutiveHours": 167, "packagesSorted": 209000, "daysRunning": 8}, "annualCapacity": 12000, "consumerLaunch": "late 2026 limited"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%BotQ 생산속도 24배%'
)
LIMIT 1;

-- ----- Agility Robotics: SPAC 상장 $2.5B -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       '[CRITICAL] Agility Robotics SPAC 상장 $2.5B — Churchill Capital XI 합병, Nasdaq "AGLT", 2026년 말 마감',
       'Agility Robotics가 Churchill Capital Corp XI와 $2.5B 규모 SPAC 합병 발표. Nasdaq 티커 "AGLT"로 2026년 말 상장 예정. Digit는 현재 전 세계 최다 상용 배치 휴머노이드(~75대). 활성 고객: GXO(100,000+ 토트 이동), Schaeffler(15개월 연속 8시간 교대), Mercado Libre(2025.12), Toyota Canada(2026.02). 연말까지 cooperative-safety 업그레이드 예정 — 인간과 동일 공간 작업 가능.',
       '{"source": "GeekWire, SEC Filing (CCXI Form 425)", "sourceUrl": "https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/", "confidence": "A", "date": "2026-06-25", "dealType": "SPAC", "spacPartner": "Churchill Capital Corp XI", "valuation": "$2.5B", "ticker": "AGLT", "exchange": "Nasdaq", "expectedClose": "end of 2026", "globalInstalledBase": "~75 units", "activeCustomers": ["GXO", "Schaeffler", "Mercado Libre", "Toyota Canada"], "gxoTotes": "100,000+", "schaefflerMonths": 15, "coopSafetyUpgrade": "by year-end 2026"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agility Robotics' AND hr.name ILIKE '%Digit%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%SPAC 상장 $2.5B%Churchill%'
)
LIMIT 1;

-- ----- Apptronik: Robot Park 개소 + Apollo 2 + $935M -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '[WARNING] Apptronik Robot Park 개소(6/30) + Apollo 2 공개 — Google DeepMind Gemini 연계, $935M+ Series A, $5B 밸류',
       'Apptronik이 6월 30일 Austin에 Robot Park 플래그십 시설 개소. Apollo 2 (이족보행+휠 구성) 공개 — 대규모 데이터 수집 통해 차세대 Apollo 3 상용 모델 개발. Google DeepMind 연구 파트너십: Gemini Robotics AI 모델 훈련 데이터 제공. Series A-X 확장 라운드로 총 $935M+ 조달($5B 밸류). 신규 투자자: AT&T Ventures, John Deere, QIA(카타르투자청). 고객 Robot Park: Mercedes-Benz, GXO. Apollo 3 개발 중 — BotQ 데이터 + DeepMind AI로 즉시 사용 가능한 지능형 상용 모델 목표.',
       '{"source": "GlobeNewsWire, CNBC, Robot Report", "sourceUrl": "https://www.globenewswire.com/news-release/2026/06/30/3319598/0/en/Welcome-to-Robot-Park-Where-Apptronik-s-Apollo-Goes-to-Work-Training-the-Next-Generation-of-Humanoid-Robot-Intelligence.html", "confidence": "A", "date": "2026-06-30", "facility": "Robot Park Austin", "apollo2Configs": ["bipedal", "wheeled"], "deepmindPartnership": "Gemini Robotics", "seriesATotal": "$935M+", "valuation": "$5B", "newInvestors": ["AT&T Ventures", "John Deere", "QIA"], "customers": ["Mercedes-Benz", "GXO", "Jabil"], "nextProduct": "Apollo 3"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Apptronik%' AND hr.name ILIKE '%Apollo%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Robot Park 개소%Apollo 2%'
)
LIMIT 1;

-- ----- 1X Technologies: NEO Factory + EQT 10K 계약 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       '[WARNING] 1X NEO Factory 가동(4/30) — 미국 최초 수직통합 공장, 10K/년 초도 물량 5일 만에 완판, EQT 10K 계약',
       '1X Technologies가 4월 30일 캘리포니아 Hayward에 미국 최초 수직통합 휴머노이드 공장(58,000 sq ft) 개소. 연 10,000대 생산용량. 초도 물량 5일 만에 사전주문 완판. EQT(스웨덴)와 2026-2030 최대 10,000대 공급 계약(EQT 300+ 포트폴리오사 대상 제조/물류/창고). NEO 가격: $20,000(구매) 또는 $499/월(렌탈, 6개월 최소). 2026년 말 소비자 배송 시작 목표. 2027년 말까지 100,000대/년 확대 계획. 1X World Model: 영상 관찰을 통한 태스크 학습 AI. 자체 설계 모터/배터리/구조물/센서 내재화.',
       '{"source": "Forbes, GlobeNewsWire, BusinessWire", "sourceUrl": "https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html", "confidence": "A", "date": "2026-04-30", "factory": "Hayward CA", "factorySize": "58,000 sq ft", "employees": "200+", "annualCapacity": 10000, "soldOutDays": 5, "eqtDeal": {"units": 10000, "period": "2026-2030", "portfolioCompanies": "300+"}, "pricing": {"purchase": "$20,000", "rental": "$499/month", "rentalMinimum": "6 months"}, "consumerShipment": "late 2026", "2027Target": "100,000/year", "worldModel": true, "verticalIntegration": ["motors", "batteries", "structures", "sensors"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%1X%' AND hr.name ILIKE '%NEO%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%NEO Factory 가동%10K/년%'
)
LIMIT 1;

-- ----- Agibot: 15,000대 생산 마일스톤 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       '[CRITICAL] Agibot 15,000번째 로봇 생산 — 5K→10K 3개월(4배 가속), G2 산업형 로봇, 4개 신제품군',
       'Agibot가 2026년 6월 15,000번째 로봇 생산 마일스톤 달성. 마일스톤 유닛: G2 산업형 embodied task robot. 생산 가속: 1K→5K 약 1년, 5K→10K 단 3개월(4배 속도 향상). 2026년 4월 파트너 컨퍼런스에서 4개 신규 로봇 플랫폼과 다수 AI 모델 발표. Longcheer Technology 태블릿 제조 공장에서 라이브스트림 운영 검증. Omdia 기준 2025 글로벌 1위(5,168대, 39%) 유지.',
       '{"source": "PRNewswire, Robot Report, eWeek", "sourceUrl": "https://www.prnewswire.com/apac/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812695.html", "confidence": "A", "date": "2026-06-30", "milestone": 15000, "milestoneUnit": "G2", "productionAcceleration": "4x (5K→10K in 3 months vs 1K→5K in ~1 year)", "newPlatforms": 4, "partnerConference": "April 2026", "factoryValidation": "Longcheer Technology tablet plant", "omdiaRanking": "1st globally 2025", "omdiaShipments": 5168, "omdiaShare": "39%"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%15,000번째 로봇 생산%'
)
LIMIT 1;

-- ----- Unitree: Japan Airlines G1 파일럿 + GD01 공개 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '[WARNING] Unitree Japan Airlines G1 공항 파일럿 + GD01 메카 로봇 공개 + UnifoLM-VLA-0 오픈소스',
       'Japan Airlines가 Unitree G1 휴머노이드로 공항 지상 서비스 파일럿 프로그램 시작. GD01 메카 로봇 신규 공개(IPO 신청과 동시). 2026년 3월 UnifoLM-VLA-0(Vision-Language-Action 모델) 오픈소스 공개 — 자연어 명령으로 가정 내 자율 작업 수행. H1: 2026년 4월 베이징 E-Town 휴머노이드 하프 마라톤 참가(300대+ 로봇, 100+ 팀). G1 가격: $13,500 베이스, EDU $43,900+.',
       '{"source": "TNW, KraneShares, Wikipedia", "sourceUrl": "https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo", "confidence": "B", "date": "2026-06", "japanAirlines": "G1 airport ground service pilot", "gd01": "mecha robot unveiled with IPO filing", "unifolmVLA0": "open-source VLA model (March 2026)", "halfMarathon": "April 2026 Beijing E-Town, 300+ robots, 100+ teams", "g1Price": "$13,500 base", "h2Price": "$40,900 commercial / $68,900 EDU"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Unitree%' AND hr.name ILIKE '%G1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'partnership'
  AND ca.title LIKE '%Japan Airlines G1%GD01%'
)
LIMIT 1;

-- ----- Tesla Optimus: Fremont 전환 확정 — 7월말/8월 생산 개시 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       '[UPDATE] Tesla Optimus V3 Fremont 전환 확정 — Model S/X 5월 종료, 7월말~8월 생산 시작, 독일산 모듈 장비',
       'Tesla Fremont 공장 Model S/X 라인이 2026년 5월 초 공식 종료(Model S 14년, Model X 11년). 4개월 만에 Optimus V3 전용 라인으로 전환 완료. 독일에서 제작된 모듈형 조립 장비 설치. Musk: 7월 말~8월 Optimus 생산 시작 확인, 초기 속도 매우 느릴 것. Fremont에서 연 100만 대 생산속도 목표(장기). 현재 외부 판매 없음 — Tesla 내부 공장 전용.',
       '{"source": "Electrek, Teslarati, gagadget", "sourceUrl": "https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/", "confidence": "A", "date": "2026-07", "modelSXEnd": "early May 2026", "conversionTime": "4 months", "germanEquipment": true, "productionStart": "late July / August 2026", "initialSpeed": "quite slow", "longTermTarget": "1M/year at Fremont", "externalSales": false, "uniqueParts": 10000}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name ILIKE '%Optimus%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Fremont 전환 확정%Model S/X 5월 종료%'
)
LIMIT 1;


-- ============================================================
-- 2. ARTICLES (articles 테이블) — 신규 기사
-- ============================================================

-- BD: Atlas 5세대 간소화
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Boston Dynamics'' New Atlas Humanoid Robot: "Order Of Magnitude" Simpler — 5th Gen Design for Mass Production',
       'Forbes',
       'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
       '2026-07-02'::timestamp,
       'BD Atlas 5세대 공개. 부품 수 "거의 자릿수 단위" 감소. 모든 컴포넌트 자동차 공급망 호환 설계. 제조속도·신뢰성·비용 대폭 개선. 56 DOF, 4시간 런타임, 자체 배터리 교환, 50kg 페이로드.',
       'en', 'product', 'robot',
       md5('forbes-bd-atlas-5th-gen-order-magnitude-simpler-2026-07-04'),
       '{"mentionedCompanies":["Boston Dynamics","Hyundai"],"mentionedRobots":["Atlas 5th gen"],"technologies":["order of magnitude complexity reduction","automotive supply chain compatible","self-swappable batteries"],"marketInsights":["mass production ready","30K/year factory by 2028","all 2026 committed to Hyundai+DeepMind"],"keyPoints":["5th generation design simplification","automotive-grade supply chain","new customers from early 2027"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Boston Dynamics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('forbes-bd-atlas-5th-gen-order-magnitude-simpler-2026-07-04'));

-- BD: Hyundai $26B 투자
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Atlas Humanoid Robots Production "Fully Committed" For 2026, Factory Will Build 30,000 Per Year',
       'Forbes',
       'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
       '2026-01-06'::timestamp,
       'Atlas 2026년 전체 생산분 사전 커밋 완료. Hyundai $26B 미국 투자 중 로봇 전용 공장 포함. 연 30,000대 생산 목표(2028). Hyundai RMAC + Google DeepMind에 첫 배치.',
       'en', 'industry', 'robot',
       md5('forbes-atlas-production-committed-30k-per-year-2026-07-04'),
       '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":["automotive supply chain","autonomous battery swap"],"marketInsights":["30K/year factory","$26B US investment","all 2026 production committed"],"keyPoints":["full 2026 production committed","dedicated robotics factory planned","Hyundai Mobis actuator supply chain"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Boston Dynamics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('forbes-atlas-production-committed-30k-per-year-2026-07-04'));

-- Figure AI: BotQ 생산속도
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure AI BotQ Hits One Robot Per Hour — 24x Production Breakthrough in 120 Days, 350+ Shipped',
       'Figure AI Official / faq.com.tw',
       'https://www.figure.ai/news/ramping-figure-03-production',
       '2026-06-08'::timestamp,
       'Figure AI BotQ 공장 120일 만에 24배 생산속도 향상(일 1대→시간 1대). 350+대 Figure 03 출하. BMW Spartanburg 40대 배치. Helix 02: 8일 167시간 연속, 209K 패키지 자율 분류.',
       'en', 'product', 'robot',
       md5('figure-botq-1-per-hour-24x-breakthrough-2026-07-04'),
       '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03"],"technologies":["BotQ vertically integrated factory","Helix 02 autonomous operation","24x throughput improvement"],"marketInsights":["350+ units shipped","12K/year capacity early 2026","consumer home late 2026"],"keyPoints":["1 robot per hour production rate","120 days to 24x improvement","Helix 02 autonomous 209K packages"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('figure-botq-1-per-hour-24x-breakthrough-2026-07-04'));

-- Agility: SPAC $2.5B
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Agility Robotics to Go Public in $2.5B SPAC Deal — Churchill Capital XI, Nasdaq "AGLT"',
       'GeekWire',
       'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
       '2026-06-25'::timestamp,
       'Agility Robotics SPAC 합병 $2.5B. Churchill Capital Corp XI와 결합, Nasdaq "AGLT" 2026년 말 상장. Digit 전 세계 최다 상용 휴머노이드(~75대). GXO/Schaeffler/Mercado Libre/Toyota Canada 고객.',
       'en', 'industry', 'robot',
       md5('geekwire-agility-spac-2.5b-churchill-aglt-2026-07-04'),
       '{"mentionedCompanies":["Agility Robotics","Churchill Capital Corp XI","GXO","Schaeffler","Mercado Libre","Toyota"],"mentionedRobots":["Digit"],"technologies":["cooperative safety upgrade"],"marketInsights":["$2.5B SPAC valuation","~75 units globally deployed","Nasdaq AGLT ticker"],"keyPoints":["most commercially deployed humanoid","SPAC with Churchill Capital XI","cooperative safety by year-end"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agility Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('geekwire-agility-spac-2.5b-churchill-aglt-2026-07-04'));

-- Apptronik: Robot Park + $935M
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Apptronik Opens Robot Park Flagship + Apollo 2 Unveiled — Google DeepMind Gemini Partnership, $935M+ Series A',
       'GlobeNewsWire / CNBC',
       'https://www.globenewswire.com/news-release/2026/06/30/3319598/0/en/Welcome-to-Robot-Park-Where-Apptronik-s-Apollo-Goes-to-Work-Training-the-Next-Generation-of-Humanoid-Robot-Intelligence.html',
       '2026-06-30'::timestamp,
       'Apptronik Robot Park 플래그십 Austin 개소(6/30). Apollo 2 이족/휠 구성 공개. Google DeepMind Gemini Robotics 파트너십. Series A 총 $935M+ ($5B 밸류). AT&T/John Deere/QIA 투자.',
       'en', 'industry', 'robot',
       md5('gnw-apptronik-robot-park-apollo2-935m-2026-07-04'),
       '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO","Jabil","AT&T","John Deere","QIA"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","bipedal+wheeled configuration","large-scale data collection"],"marketInsights":["$935M+ Series A","$5B valuation","global Robot Park network"],"keyPoints":["Robot Park flagship opened June 30","Apollo 2 for data collection","Apollo 3 commercial product in development"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Apptronik%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('gnw-apptronik-robot-park-apollo2-935m-2026-07-04'));

-- 1X: NEO Factory + EQT
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       '1X Opens NEO Factory in Hayward CA — First US Vertically Integrated Humanoid Factory, 10K/Year, EQT 10K Deal',
       'Forbes / GlobeNewsWire',
       'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
       '2026-04-30'::timestamp,
       '1X NEO Factory 개소(Hayward CA, 58K sq ft). 미국 최초 수직통합 휴머노이드 공장. 연 10K 생산, 초도 물량 5일 완판. EQT와 10K대 계약(2026-2030). $20K 구매 또는 $499/월. 2027 100K/년 목표.',
       'en', 'product', 'robot',
       md5('gnw-1x-neo-factory-hayward-10k-eqt-2026-07-04'),
       '{"mentionedCompanies":["1X Technologies","EQT"],"mentionedRobots":["NEO"],"technologies":["vertically integrated manufacturing","1X World Model","in-house motors/batteries/sensors"],"marketInsights":["10K/year capacity","sold out in 5 days","$20K purchase price","$499/month rental"],"keyPoints":["first US vertically integrated humanoid factory","EQT deal 10K units 2026-2030","100K/year target by end 2027"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%1X%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('gnw-1x-neo-factory-hayward-10k-eqt-2026-07-04'));

-- Agibot: 15,000대 마일스톤
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'AGIBOT 15,000th Robot Rolls Off Production Line — G2 Industrial Milestone, 4x Production Acceleration',
       'PRNewswire / Robot Report',
       'https://www.prnewswire.com/apac/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812695.html',
       '2026-06-30'::timestamp,
       'Agibot 15,000번째 로봇 생산(G2 산업형). 5K→10K 3개월(4배 가속). 2026.04 파트너 컨퍼런스에서 4개 신규 플랫폼 발표. Longcheer Technology 태블릿 공장 라이브 검증.',
       'en', 'product', 'robot',
       md5('prnw-agibot-15000th-robot-g2-production-2026-07-04'),
       '{"mentionedCompanies":["Agibot","Longcheer Technology"],"mentionedRobots":["G2"],"technologies":["embodied AI","4x production acceleration","industrial task robot"],"marketInsights":["15,000 total units produced","4x manufacturing speed increase","4 new platforms announced"],"keyPoints":["15,000th robot milestone","G2 industrial-grade unit","production speed quadrupled"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('prnw-agibot-15000th-robot-g2-production-2026-07-04'));

-- Unitree: Japan Airlines + GD01
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Unitree GD01 Mecha Unveiled with IPO Filing; Japan Airlines Launches G1 Airport Pilot',
       'TheNextWeb / KraneShares',
       'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
       '2026-06-01'::timestamp,
       'Unitree GD01 메카 로봇 공개(IPO 동시). Japan Airlines G1 공항 지상서비스 파일럿 시작. UnifoLM-VLA-0 오픈소스 VLA 모델(3월). H1 베이징 E-Town 하프마라톤 참가(4월).',
       'en', 'product', 'robot',
       md5('tnw-unitree-gd01-mecha-jal-g1-pilot-2026-07-04'),
       '{"mentionedCompanies":["Unitree Robotics","Japan Airlines"],"mentionedRobots":["GD01","G1","H1"],"technologies":["mecha robot","UnifoLM-VLA-0 open-source VLA","airport ground service"],"marketInsights":["new product category (mecha)","airline industry entry","open-source AI strategy"],"keyPoints":["GD01 mecha robot new product","Japan Airlines G1 pilot program","UnifoLM-VLA-0 open-source release"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('tnw-unitree-gd01-mecha-jal-g1-pilot-2026-07-04'))
LIMIT 1;


-- ============================================================
-- 3. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- BD: Atlas 5세대
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Forbes (July 2, 2026)',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  'Boston Dynamics Atlas 5th gen: order-of-magnitude complexity reduction, all parts automotive-compatible, Hyundai $26B US factory investment',
  '5th-gen Atlas design has nearly order-of-magnitude fewer unique parts. Every component designed for automotive supply chain compatibility. Hyundai $26B US investment includes 30K/year robot factory (2028). 56 DOF, self-swap batteries, 50kg payload. All 2026 production committed to Hyundai RMAC + Google DeepMind. New customers from early 2027.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Atlas 5th gen%order-of-magnitude%');

-- Figure AI: BotQ 24x
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Figure AI Official',
  'https://www.figure.ai/news/ramping-figure-03-production',
  'Figure AI BotQ achieves 1 robot/hour (24x improvement); 350+ Figure 03 shipped; BMW logistics rollout; Helix 02 209K packages autonomous',
  'BotQ production: 1/day to 1/hour in 120 days (24x). 350+ Figure 03 delivered. BMW Spartanburg: 40 units for logistics (component sequencing). BMW Europe pilots: Munich, Regensburg, Leipzig. Helix 02: 167 consecutive hours, 209K packages sorted autonomously in 8 days. 12K/year capacity. Consumer home deployment late 2026.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%BotQ achieves 1 robot/hour%24x%');

-- Agility: SPAC $2.5B
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'GeekWire / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  'Agility Robotics SPAC $2.5B with Churchill Capital XI — Nasdaq AGLT, ~75 Digit units deployed, cooperative safety by year-end',
  'SPAC merger with Churchill Capital Corp XI at $2.5B. Nasdaq ticker AGLT, expected close end 2026. Digit: world most commercially deployed humanoid (~75 units). Active customers: GXO (100K+ totes), Schaeffler (15 months), Mercado Libre, Toyota Canada. CEO: cooperative-safety upgrade by year-end enables human co-working.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agility Robotics SPAC $2.5B%Churchill%');

-- Apptronik: Robot Park + Apollo 2
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'GlobeNewsWire / CNBC',
  'https://www.globenewswire.com/news-release/2026/06/30/3319598/0/en/Welcome-to-Robot-Park-Where-Apptronik-s-Apollo-Goes-to-Work-Training-the-Next-Generation-of-Humanoid-Robot-Intelligence.html',
  'Apptronik Robot Park flagship opens June 30; Apollo 2 unveiled; Google DeepMind Gemini partnership; $935M+ Series A at $5B valuation',
  'Robot Park Austin opened 6/30 — flagship data collection facility. Apollo 2 in bipedal+wheeled configs for large-scale data capture. Google DeepMind partnership: data feeds Gemini Robotics foundation models. Series A total $935M+ ($5B valuation). New investors: AT&T Ventures, John Deere, QIA. Customer Robot Parks at Mercedes-Benz, GXO. Apollo 3 commercial product in dev.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Apptronik Robot Park flagship%Apollo 2%');

-- 1X: NEO Factory
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Forbes / GlobeNewsWire',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X NEO Factory opens Hayward CA — first US vertically integrated humanoid factory, 10K/year, sold out in 5 days, EQT 10K deal',
  'NEO Factory: 58K sq ft, 200+ employees, 10K/year capacity. First-year production sold out in 5 days. EQT partnership: up to 10K NEOs 2026-2030 for 300+ portfolio companies. $20K purchase / $499/month rental. Consumer shipments late 2026. Target 100K/year by end 2027. 1X World Model: learns tasks by watching videos.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1X NEO Factory opens Hayward%');

-- Agibot: 15,000대
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'PRNewswire / Robot Report',
  'https://www.prnewswire.com/apac/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812695.html',
  'Agibot 15,000th robot produced (G2 industrial unit); production speed quadrupled (5K→10K in 3 months); 4 new platforms announced',
  '15,000th robot milestone (G2 industrial embodied task robot). Production acceleration: 1K→5K ~1 year, 5K→10K only 3 months (4x speed). April 2026 Partner Conference: 4 new robotic platforms + multiple AI models. Factory validation at Longcheer Technology tablet plant. Omdia 2025 global #1 (5,168 units, 39% share) sustained.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agibot 15,000th robot produced%');

-- Unitree: JAL + GD01
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'TheNextWeb / KraneShares',
  'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
  'Unitree GD01 mecha robot unveiled with IPO; Japan Airlines G1 airport pilot; UnifoLM-VLA-0 open-source VLA',
  'GD01 mecha robot new product category. Japan Airlines launched G1 humanoid pilot for airport ground service. Open-sourced UnifoLM-VLA-0 (Vision-Language-Action model) in March 2026 for autonomous household tasks. H1 competed in Beijing E-Town humanoid half marathon (April 2026, 300+ robots). G1 at $13,500 base price.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Unitree GD01 mecha%Japan Airlines%');

-- Tesla: Fremont conversion update
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Electrek / Teslarati',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  'Tesla Fremont fully converted for Optimus V3 — Model S/X ended May, production starts late July/August, German modular equipment installed',
  'Model S/X ended early May 2026 (14/11 year runs). 4-month conversion to Optimus V3 line complete. German-made modular assembly equipment installed. Production start: late July/August 2026. Initial output: quite slow, 10K unique parts. Long-term: 1M/year run rate at Fremont. Internal use only, no external sales.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Tesla Fremont fully converted%Optimus V3%Model S/X ended%');


-- ============================================================
-- 4. CI Values 업데이트
-- ============================================================

-- BD Atlas: 2026 배치 상태
UPDATE ci_values SET
  value = '2026 전량 커밋(Hyundai RMAC + Google DeepMind). 30K/년 전용 공장 2028 가동 예정.',
  confidence = 'A',
  source = 'Forbes (July 2, 2026) / BD Official',
  source_date = '2026-07-02',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);

-- Figure AI: 배치 대수 350+
UPDATE ci_values SET
  value = '350대+ (Figure 03), BotQ 시간당 1대(24x 향상), 12K/년 생산용량',
  confidence = 'A',
  source = 'Figure AI Official — BotQ 1/hour production rate',
  source_date = '2026-06-08',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);

-- Agility: 밸류에이션
UPDATE ci_values SET
  value = '$2.5B (SPAC — Churchill Capital XI, Nasdaq "AGLT", 2026 말 상장)',
  confidence = 'A',
  source = 'GeekWire / SEC Filing CCXI Form 425',
  source_date = '2026-06-25',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '최근 밸류에이션' LIMIT 1);

-- Agility: 배치 대수
UPDATE ci_values SET
  value = '~75대 글로벌 (GXO 100K+토트, Schaeffler 15개월, Mercado Libre, Toyota Canada)',
  confidence = 'A',
  source = 'GeekWire / SEC CCXI Filing / newmarketpitch deployment tracker',
  source_date = '2026-06-25',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);

-- Apptronik: 밸류에이션
UPDATE ci_values SET
  value = '$5B (Series A-X 확장, $935M+ 총 조달)',
  confidence = 'A',
  source = 'CNBC / GlobeNewsWire',
  source_date = '2026-06-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '최근 밸류에이션' LIMIT 1);

-- 1X: 밸류에이션/자금조달
UPDATE ci_values SET
  value = '$130M+ VC (OpenAI Fund, EQT, Tiger Global). 10K/년 생산, EQT 10K대 계약(2026-2030)',
  confidence = 'A',
  source = 'Forbes / BusinessWire',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '최근 밸류에이션' LIMIT 1);

-- Agibot: 배치 대수
UPDATE ci_values SET
  value = '15,000대 누적 생산(2026.06), Omdia 2025 글로벌 1위(5,168대, 39%)',
  confidence = 'A',
  source = 'PRNewswire / Robot Report — 15,000th unit milestone',
  source_date = '2026-06-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);


-- ============================================================
-- 5. 기업 밸류에이션 업데이트 (companies 테이블)
-- ============================================================

UPDATE companies SET valuation_usd = 5000000000.00, updated_at = NOW()
WHERE name ILIKE '%Apptronik%' AND (valuation_usd IS NULL OR valuation_usd < 5000000000);

UPDATE companies SET valuation_usd = 2500000000.00, updated_at = NOW()
WHERE name ILIKE '%Agility%' AND (valuation_usd IS NULL OR valuation_usd < 2500000000);


COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, severity, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, severity;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
-- SELECT count(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
