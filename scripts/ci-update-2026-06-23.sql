-- ============================================================
-- [ARGOS] 경쟁사 데이터 업데이트 — 2026-06-23
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행 전 주의:
--   1) 이미 seed된 companies/humanoid_robots 데이터가 있어야 합니다.
--   2) 중복 방지를 위해 ON CONFLICT / WHERE NOT EXISTS 사용.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- ----- Tesla Optimus -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Tesla Optimus Gen 3 Fremont 양산 라인 전환 임박',
       'Tesla가 Fremont 공장의 Model S/X 라인(2026년 5월 종료)을 Optimus 양산 라인으로 전환 중. 2026년 7~8월 양산 시작 목표, 연 100만 대 생산 능력. Giga Texas에 2세대 공장(1,000만 대/년) 2027년 여름 가동 계획.',
       '{"source": "TechTimes, The Robot Report", "sourceUrl": "https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm", "confidence": "A", "pilotStart": "2026-01-21", "massProductionTarget": "2026-08", "fremontCapacity": "1M/year", "gigaTexasCapacity": "10M/year", "unitCost": ">$60,000"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name = 'Optimus Gen 3'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title = 'Tesla Optimus Gen 3 Fremont 양산 라인 전환 임박'
);

-- ----- Boston Dynamics Atlas -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'critical',
       'Boston Dynamics × Google DeepMind 파운데이션 모델 통합 파트너십',
       'Boston Dynamics가 Google DeepMind와 파트너십을 맺고 Atlas에 최첨단 파운데이션 모델을 통합. CES 2026에서 제품 버전 Atlas 공개. 2026년 전량 배치 완료 — Hyundai RMAC 및 Google DeepMind에 출하. Hyundai 연 30,000대 생산 공장 건설.',
       '{"source": "Boston Dynamics Official, Engadget, The Robot Report", "sourceUrl": "https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/", "confidence": "A", "cesUnveil": "2026-01-05", "partners": ["Google DeepMind", "Hyundai"], "hyundaiFactory": "30,000 units/year", "carPlantUse": "2028", "assemblyUse": "2030"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Boston Dynamics' AND hr.name LIKE 'Atlas%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'partnership'
  AND ca.title LIKE '%Google DeepMind%'
);

-- ----- Figure AI -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       'Figure AI Series C $1B+ 조달 (기업가치 $39B)',
       'Figure AI가 Series C에서 $1B 이상 조달, 기업가치 $39B. 주요 투자자: Parkway VC, Brookfield, NVIDIA, Macquarie, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm. BotQ 공장에서 시간당 1대 생산 체제 구축, 350대 이상 생산 완료.',
       '{"source": "Figure AI Official", "sourceUrl": "https://www.figure.ai/news/series-c", "confidence": "A", "valuation": "$39B", "raised": ">$1B", "investors": ["Parkway VC", "Brookfield", "NVIDIA", "Macquarie", "Intel Capital", "LG Technology Ventures", "Salesforce", "T-Mobile Ventures", "Qualcomm"], "productionRate": "1 unit/hour", "totalProduced": "350+"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%Series C%'
);

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'critical',
       'Figure AI × BMW 상업 배치 확대 (Spartanburg + Leipzig)',
       'Figure 03 40대가 BMW Spartanburg 공장에 상업 배치. BMW Leipzig에도 유럽 최초 Physical AI 배치(2026년 여름). Figure 02가 BMW X3 30,000대 이상 생산에 기여. 2026-2027 추가 확대 계약 체결.',
       '{"source": "BMW Group Official, Figure AI", "sourceUrl": "https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html", "confidence": "A", "spartanburgUnits": 40, "leipzigStart": "2026 summer", "x3Production": "30,000+", "expansion": ["Munich", "Regensburg", "Leipzig"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'partnership'
  AND ca.title LIKE '%BMW%'
);

-- ----- Unitree -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       'Unitree G1 도쿄 하네다 공항 상업 배치 — JAL/GMO 파트너십',
       'Unitree G1이 도쿄 하네다 공항에 수하물/화물 처리용으로 배치. Japan Airlines 및 GMO Internet Group과 파트너십. 휴머노이드 로봇의 세계 최초 공항 상업 배치. 2025년 5,500대 출하 → 2026년 20,000대 목표.',
       '{"source": "eWeek, industry reports", "sourceUrl": "https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/", "confidence": "B", "partners": ["Japan Airlines", "GMO Internet Group"], "location": "Tokyo Haneda Airport", "2025Shipments": 5500, "2026Target": 20000}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Unitree Robotics' AND hr.name = 'G1'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'partnership'
  AND ca.title LIKE '%하네다%'
);

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'warning',
       'Unitree Robotics 상하이증권거래소 IPO 신청 (2026년 3월)',
       'Unitree Robotics가 2026년 3월 상하이증권거래소 IPO를 신청. 2025년 매출 17.08억 위안(전년 대비 335% 성장). UnifoLM-VLA-0 오픈소스 공개. 신규 G1-D 휠 기반 변형 출시.',
       '{"source": "company filings, industry reports", "sourceUrl": "https://en.wikipedia.org/wiki/Unitree_Robotics", "confidence": "A", "exchange": "Shanghai Stock Exchange", "2025Revenue": "¥1.708B", "revenueGrowth": "335%", "opensourceModel": "UnifoLM-VLA-0", "newVariant": "G1-D wheeled"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Unitree Robotics' AND hr.name = 'G1'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%IPO%'
);

-- ----- Agility Robotics -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       'Agility Digit 상업 배치 확대 — GXO 100K+ 토트, Toyota Canada 7+ 대',
       'Digit가 GXO에서 100,000개 이상 토트 이동 완료. Toyota Canada에 RaaS 모델로 7대 이상 배치. Amazon, Schaeffler에도 배치 중. 차세대 페이로드 50lb로 증가 예정. ISO 기능안전 인증 추진 중(2026 중후반 예상).',
       '{"source": "Agility Robotics Official, Global News", "sourceUrl": "https://www.agilityrobotics.com/content/digit-moves-over-100k-totes", "confidence": "A", "gxoTotes": "100,000+", "toyotaCanadaUnits": "7+", "deploymentModel": "RaaS", "nextGenPayload": "50 lb", "safetyCertTarget": "mid-late 2026", "customers": ["Amazon", "Toyota", "GXO", "Schaeffler"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agility Robotics' AND hr.name = 'Digit'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%GXO%'
);

-- ----- Apptronik -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       'Apptronik $520M 추가 조달 (기업가치 $5B, 누적 ~$1B)',
       'Apptronik이 2026년 2월 $520M 조달, 기업가치 $5B. Series A 누적 $935M, 총 자본 ~$1B. 투자자: B Capital, Google, Mercedes-Benz, PEAK6, AT&T Ventures, John Deere, Qatar Investment Authority. Google DeepMind Gemini Robotics 통합. Mercedes-Benz, GXO, Jabil 파트너십.',
       '{"source": "CNBC, SiliconANGLE, The Robot Report", "sourceUrl": "https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html", "confidence": "A", "raised": "$520M", "valuation": "$5B", "totalCapital": "~$1B", "investors": ["B Capital", "Google", "Mercedes-Benz", "PEAK6", "AT&T Ventures", "John Deere", "Qatar Investment Authority"], "partners": ["Google DeepMind", "Mercedes-Benz", "GXO Logistics", "Jabil"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Apptronik' AND hr.name = 'Apollo'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%$520M%'
);

-- ----- 1X Technologies -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       '1X Technologies NEO Factory 가동 개시 — 첫 해 10,000대 완판',
       '1X Technologies가 2026년 4월 30일 Hayward, CA에 NEO Factory(58,000 sqft, 200+명) 가동 개시. 첫 해 생산분 10,000대 이상이 5일 만에 완판. 가격 $20,000 또는 $499/월. 2027년 말 100,000대/년 목표.',
       '{"source": "GlobeNewsWire, eWeek", "sourceUrl": "https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html", "confidence": "A", "factoryLocation": "Hayward, CA", "factorySize": "58,000 sqft", "employees": "200+", "unitsSold": "10,000+", "soldOutDays": 5, "price": "$20,000", "subscription": "$499/month", "2027Target": "100,000/year"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = '1X Technologies' AND hr.name = 'NEO'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%NEO Factory%'
);

-- ----- Agibot -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Agibot 글로벌 1위 — 누적 10,000대 출하, 홍콩 IPO 추진',
       'Agibot가 2026년 3월 30일 상하이 공장에서 10,000번째 휴머노이드 출하. Omdia 기준 2025년 글로벌 1위(5,168대). 2025년 매출 10.5억 위안(전년 20배 성장). LG Electronics, Mirae Asset, BYD, Hillhouse 투자. 홍콩 IPO 2026년 예상. "358 계획": 2027년 100억 위안, 2030년 1,000억 위안 목표.',
       '{"source": "TechTimes, PRNewswire, Gasgoo", "sourceUrl": "https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm", "confidence": "A", "totalShipped": 10000, "omdia2025Rank": 1, "omdia2025Units": 5168, "revenue2025": "¥1.05B", "revenueGrowth": "20x", "investors": ["LG Electronics", "Mirae Asset", "BYD", "Hillhouse"], "ipoTarget": "Hong Kong 2026", "plan358": {"2027": "¥10B", "2030": "¥100B"}}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%10,000%'
);

-- ============================================================
-- 2. ARTICLES (articles 테이블) — 주요 뉴스 기사
-- ============================================================

-- Tesla: Fremont 양산 전환
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla Is Turning Its Model S Line Into an Optimus Robot Factory: Gen 3 Targets a 2026 Production Start',
       'TechTimes',
       'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
       '2026-06-09'::timestamp,
       'Tesla가 Fremont 공장의 Model S/X 생산 라인을 Optimus Gen 3 로봇 양산 라인으로 전환. 연 100만 대 생산 능력 목표. 2026년 7~8월 대량 생산 시작 예정.',
       'en', 'product', 'robot',
       md5('techtimes-tesla-optimus-fremont-2026-06-09'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('techtimes-tesla-optimus-fremont-2026-06-09'));

-- Tesla: 10M 목표
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'From EVs to robotics: Tesla targets 10M Optimus units with new Texas plant',
       'The Robot Report',
       'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
       '2026-06-01'::timestamp,
       'Tesla가 Giga Texas에 2세대 Optimus 공장 착공. 장기 목표 연 1,000만 대 생산. 2027년 여름 가동 예정.',
       'en', 'industry', 'robot',
       md5('robotreport-tesla-10m-optimus-texas-2026'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('robotreport-tesla-10m-optimus-texas-2026'));

-- Boston Dynamics: CES 2026 Atlas
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Boston Dynamics unveils production-ready version of Atlas robot at CES 2026',
       'Engadget',
       'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
       '2026-01-05'::timestamp,
       'CES 2026에서 Atlas 제품 버전 공개. 2026년 전량 배치 확약. Hyundai RMAC 및 Google DeepMind에 출하 예정.',
       'en', 'product', 'robot',
       md5('engadget-atlas-ces-2026-01-05'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Boston Dynamics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('engadget-atlas-ces-2026-01-05'));

-- Boston Dynamics: Google DeepMind 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Boston Dynamics, Google reunite on next-gen Atlas humanoid',
       'The Robot Report',
       'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
       '2026-01-10'::timestamp,
       'Boston Dynamics와 Google DeepMind가 차세대 Atlas에 파운데이션 모델 통합을 위한 파트너십 체결.',
       'en', 'technology', 'robot',
       md5('robotreport-bd-google-deepmind-atlas-2026'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Boston Dynamics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('robotreport-bd-google-deepmind-atlas-2026'));

-- Figure AI: Series C
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure Exceeds $1B in Series C Funding at $39B Post-Money Valuation',
       'Figure AI Official',
       'https://www.figure.ai/news/series-c',
       '2026-03-15'::timestamp,
       'Figure AI Series C에서 $1B 이상 조달. 기업가치 $39B. LG Technology Ventures, NVIDIA, Qualcomm 등 참여.',
       'en', 'industry', 'robot',
       md5('figure-ai-series-c-39b-2026'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('figure-ai-series-c-39b-2026'));

-- Figure AI: BMW 배치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'BMW Group: First humanoid robot introduced in Plant Leipzig',
       'BMW Group Official',
       'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
       '2026-02-27'::timestamp,
       'BMW Leipzig 공장에 Figure 03 유럽 최초 배치. Physical AI의 유럽 자동차 생산 최초 도입. 여름 파일럿 시작.',
       'en', 'product', 'robot',
       md5('bmw-figure-03-leipzig-2026-02'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('bmw-figure-03-leipzig-2026-02'));

-- Figure AI: 생산 램프업
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure AI Ramps Up Production to One Humanoid Robot Per Hour',
       'The AI Insider',
       'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
       '2026-05-01'::timestamp,
       'Figure AI가 Figure 03 생산을 일 1대에서 시간당 1대로 확대. 350대 이상 생산 완료. 150+ 워크스테이션, 80%+ 초도 양품률.',
       'en', 'product', 'robot',
       md5('aiinsider-figure-production-ramp-2026-05'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('aiinsider-figure-production-ramp-2026-05'));

-- Unitree: 20,000대 목표
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'China''s Unitree Aims to Ship 20,000 Humanoid Robots in 2026',
       'eWeek',
       'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
       '2026-03-15'::timestamp,
       'Unitree Robotics 2026년 20,000대 출하 목표. 2025년 5,500대 출하. UnifoLM-VLA-0 오픈소스. 상하이증권거래소 IPO 신청.',
       'en', 'industry', 'robot',
       md5('eweek-unitree-20000-robots-2026'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Unitree Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('eweek-unitree-20000-robots-2026'));

-- Agility Robotics: 100K totes
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Digit Moves Over 100,000 Totes in Commercial Deployment',
       'Agility Robotics',
       'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
       '2026-04-15'::timestamp,
       'Agility Digit가 GXO 물류센터에서 100,000개 이상 토트 이동 완료. Toyota Canada 7+ 대 RaaS 배치. ISO 기능안전 인증 추진.',
       'en', 'product', 'robot',
       md5('agility-digit-100k-totes-2026'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agility Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('agility-digit-100k-totes-2026'));

-- Apptronik: $520M 조달
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Apptronik raises $520 million at $5 billion valuation for Apollo robot',
       'CNBC',
       'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
       '2026-02-11'::timestamp,
       'Apptronik $520M 추가 조달, 기업가치 $5B. Series A 누적 $935M. Google, Mercedes-Benz, John Deere, Qatar Investment Authority 참여.',
       'en', 'industry', 'robot',
       md5('cnbc-apptronik-520m-5b-2026-02'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Apptronik'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('cnbc-apptronik-520m-5b-2026-02'));

-- 1X Technologies: NEO Factory
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       '1X Opens NEO Factory in Hayward, CA – America''s First Vertically Integrated Humanoid Robot Factory',
       'GlobeNewsWire',
       'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
       '2026-04-30'::timestamp,
       '1X Technologies NEO Factory 가동 개시 (Hayward, CA). 미국 최초 수직통합 휴머노이드 공장. 첫 해 10,000대 완판. $20,000 또는 $499/월.',
       'en', 'product', 'robot',
       md5('globenewswire-1x-neo-factory-2026-04'),
       NOW(), NOW()
FROM companies c
WHERE c.name = '1X Technologies'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('globenewswire-1x-neo-factory-2026-04'));

-- Agibot: 10,000대 달성
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Unitree IPO Cleared, AGIBOT Hits 10,000 Units: China Humanoid Robot Duopoly Takes Shape',
       'TechTimes',
       'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
       '2026-06-02'::timestamp,
       'Agibot 상하이 공장에서 10,000번째 휴머노이드 출하. Omdia 기준 2025년 글로벌 1위. 2025년 매출 10.5억 위안. 홍콩 IPO 추진.',
       'en', 'industry', 'robot',
       md5('techtimes-agibot-10000-units-2026-06'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('techtimes-agibot-10000-units-2026-06'));

-- Agibot: CES 2026 US 데뷔
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'AGIBOT Makes Its U.S. Market Debut at CES 2026 with Its Full Humanoid Robot Portfolio',
       'PRNewswire',
       'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
       '2026-01-06'::timestamp,
       'Agibot CES 2026에서 미국 시장 데뷔. 전체 휴머노이드 포트폴리오 공개. Expedition A3 포함.',
       'en', 'product', 'robot',
       md5('prnewswire-agibot-ces-2026-us-debut'),
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('prnewswire-agibot-ces-2026-us-debut'));

-- ============================================================
-- 3. 규제/인증 관련 기사
-- ============================================================

INSERT INTO articles (id, title, source, url, published_at, summary, language, category, product_type, content_hash, collected_at, created_at)
SELECT gen_random_uuid(),
       'Humanoid Robot Safety Standards 2026: ISO 10218:2025 Update and New ISO 25785-1',
       'Industry Reports',
       'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
       '2026-05-01'::timestamp,
       'ISO 10218:2025 대폭 확장(안전 요구사항 28→50페이지). 새 ISO 25785-1 동적 안정 로봇 표준 개발 중. ISO 26058-1 모바일 로보틱스. 하드웨어→응용 기반 인증으로 패러다임 전환.',
       'en', 'industry', 'robot',
       md5('safety-standards-iso-humanoid-2026'),
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('safety-standards-iso-humanoid-2026'));

-- ============================================================
-- 4. 기업 밸류에이션 업데이트 (companies 테이블)
-- ============================================================

UPDATE companies SET valuation_usd = 39000000000.00, updated_at = NOW()
WHERE name = 'Figure AI' AND (valuation_usd IS NULL OR valuation_usd < 39000000000);

UPDATE companies SET valuation_usd = 5000000000.00, updated_at = NOW()
WHERE name = 'Apptronik' AND (valuation_usd IS NULL OR valuation_usd < 5000000000);

COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
