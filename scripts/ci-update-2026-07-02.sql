-- ============================================================
-- [ARGOS] War Room 경쟁사 데이터 자동 업데이트 — 2026-07-02
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-07-02.sql
-- 주의: 기존 7/1 업데이트 이후 신규 데이터만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- ----- Tesla Optimus: Musk 생산라인 직접 확인 (7/1) -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       '[CRITICAL] Tesla Optimus Gen 3 생산라인 공식 가동 - Musk 7/1 현장 확인, 7월 말 양산 시작',
       'Elon Musk가 7월 1일 Fremont Optimus 생산라인을 직접 점검하고 X(Twitter)에 사진 공개. VP Lars Moravy가 "첫 Optimus 생산라인이 안착했다"고 공식 확인. Q1 실적발표에서 7월 말~8월 양산 시작 확인. Gen 3는 37개 관절, 1.2m/s 보행속도, 10,000개 고유 부품으로 구성. 연간 100만대 생산능력 목표.',
       '{"source": "Musk X post, Teslarati, Basenor, TradingKey", "sourceUrl": "https://www.teslarati.com/tesla-optimus-project-fires-up-musk-sees-production-line-progress/", "confidence": "A", "date": "2026-07-01", "event": "Musk walks production line at Fremont", "productionStart": "late July / August 2026", "gen3Specs": {"joints": 37, "walkSpeed": "1.2 m/s", "uniqueParts": 10000}, "annualCapacityTarget": "1M units", "vpConfirmation": "Lars Moravy - first production line has landed"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name LIKE '%Optimus%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%Musk%7/1%생산라인%'
)
LIMIT 1;

-- ----- Apptronik: Robot Park 개소 + Apollo 2 공개 (6/30) -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'critical',
       '[CRITICAL] Apptronik Robot Park 90,000sqft 개소 + Apollo 2 공개 - Google DeepMind 데이터 파트너십',
       'Apptronik이 6월 30일 Austin, TX에 90,000sqft 규모 Robot Park(데이터 수집/훈련 시설) 정식 오픈. Apollo 2 공개 — 이족보행+휠 2가지 구성, 4시간 배터리, 55lbs 양손 가반하중. Google DeepMind Gemini Robotics AI 모델 훈련용 실세계 데이터 수집. Mercedes-Benz, GXO에도 Robot Park 네트워크 확장. Apollo 3(첫 상용 제품)은 2027년 예정.',
       '{"source": "Forbes, Apptronik Official, RoboticsTomorrow, The Star", "sourceUrl": "https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/", "confidence": "A", "date": "2026-06-30", "facility": "Robot Park 90,000 sqft Austin TX", "apollo2Specs": {"configurations": ["bipedal", "wheeled"], "batteryLife": "4 hours", "payload": "55 lbs both hands", "height": "6 feet"}, "deepmindPartnership": "Gemini Robotics data collection", "robotParkNetwork": ["Austin HQ", "Google DeepMind", "Mercedes-Benz", "GXO"], "apollo3Timeline": "2027 first commercial product"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Apptronik' AND hr.name LIKE '%Apollo%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Robot Park%Apollo 2%'
)
LIMIT 1;

-- ----- AgiBot: 홍콩 IPO + LG Electronics 투자자 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       '[CRITICAL] AgiBot 홍콩 IPO Q3 2026 추진 - HK$40-50B 밸류, LG Electronics 투자자 포함',
       'AgiBot가 2026년 Q3 홍콩 증시 IPO를 추진 중. 목표 밸류에이션 HK$40-50B(약 $5.1-6.4B). 지분 15-25% 매각으로 $1B+ 조달 예상. CICC, CITIC Securities, Morgan Stanley 공동 주관. 주요 투자자: Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse Investment. ★ LG Electronics가 AgiBot 투자자로 확인 — 전략적 파트너십 가능성 주시 필요.',
       '{"source": "Reuters/Yahoo Finance, Capital.com, Medium, Feature Asia", "sourceUrl": "https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html", "confidence": "B", "date": "2026-Q3", "ipo": {"exchange": "HKEX", "valuationHKD": "HK$40-50B", "valuationUSD": "$5.1-6.4B", "sharesSold": "15-25%", "expectedRaise": "$1B+"}, "underwriters": ["CICC", "CITIC Securities", "Morgan Stanley"], "keyInvestors": ["Tencent", "HongShan Capital", "LG Electronics", "Mirae Asset", "BYD", "Hillhouse Investment"], "lgElectronicsInvestor": true, "strategicImplication": "LG Electronics confirmed as AgiBot investor — monitor for partnership implications"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%AgiBot%홍콩 IPO%LG%'
)
LIMIT 1;

-- ----- AgiBot: G2 Longcheer 태블릿 QC 배치 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '[WARNING] AgiBot G2 Longcheer 태블릿 양산라인 품질검사 배치 - 310대/시간 처리',
       'AgiBot 휠형 G2 휴머노이드가 6월 23-28일 Longcheer Technology(난창) 태블릿 양산라인 QC 구간에 배치. 시간당 310대 처리, 사이클타임 18-20초. 전자제품 양산라인의 전체 품질검사 공정을 휴머노이드가 단독 수행한 첫 사례.',
       '{"source": "1023jack, AGIBOT Official", "sourceUrl": "https://1023jack.com/news/the-humanoid-robotics-reality-check-q2-2026-pilot-to-production-status/", "confidence": "A", "date": "2026-06-23 to 2026-06-28", "deployment": {"customer": "Longcheer Technology", "location": "Nanchang, China", "product": "G2 wheeled humanoid", "task": "tablet mass-production QC", "throughput": "310 units/hour", "cycleTime": "18-20 seconds"}, "significance": "first humanoid-only full QC section in electronics manufacturing"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%AgiBot G2 Longcheer%310%'
)
LIMIT 1;

-- ----- Figure AI: BMW 독일 확장 + Helix-02 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '[WARNING] Figure 03 BMW Spartanburg 40대 배치 + 독일 3개 공장 파일럿 확장',
       'BMW가 Spartanburg에 Figure 03 40대를 배치하여 물류 시퀀싱 업무 수행. 무선충전, 촉각 핸드센서, 팜카메라, 음성 대화 기능 추가. BMW 독일 공장(뮌헨, 레겐스부르크, 라이프치히) 파일럿 진행 중. Helix-02 멀티로봇 협업 데모(5월) — 2대가 단일 VLA 정책으로 침실 정리 수행, 중앙 플래너/메시지 패싱 없이 협업.',
       '{"source": "BMW Press, Figure AI, iFactory, Automotive World", "sourceUrl": "https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg", "confidence": "A", "date": "2026-06", "bmwDeployment": {"location": "Spartanburg", "units": 40, "task": "logistics sequencing", "germanPilots": ["Munich", "Regensburg", "Leipzig"]}, "figure03Upgrades": ["wireless charging", "tactile hand sensors", "palm cameras", "speech-to-speech audio"], "helix02Demo": {"date": "May 2026", "description": "two robots coordinating bedroom cleanup via single shared VLA policy", "capabilities": "no central planner, no explicit message passing"}}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Figure 03 BMW%40대%독일%'
)
LIMIT 1;

-- ----- Unitree: 美 국방부 군사 연계 기업 지정 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'critical',
       '[CRITICAL] Unitree 美 국방부 중국 군사 연계 기업 지정 - GUARD Act와 연계, 규제 리스크 극대화',
       '2026년 6월 미국 국방부가 Unitree Robotics를 중국 군사 연계 기업 목록에 추가. PLA 도시전 훈련에서 Go2에 자동소총 장착 영상 공개. CEO 왕싱싱 2025년 2월 시진핑 면담. 30개 PLA 연계 대학에 제품 납품 확인(Kharon 조사). GUARD Act(6/3 발의)와 결합 시 미국 시장 전면 퇴출 가능성. LG 공급망 내 Unitree 부품 의존도 점검 필요.',
       '{"source": "US DoD, Kharon, Wikipedia, mikekalil.com", "sourceUrl": "https://www.kharon.com/brief/unitree-robotics-china-pla", "confidence": "A", "date": "June 2026", "dodDesignation": "Chinese military-linked company", "plaEvidence": ["Go2 with rifle in PLA urban warfare video", "CEO met Xi Jinping Feb 2025", "30 PLA-linked universities purchased products"], "regulatoryRisk": "GUARD Act + DoD designation = potential full US market ban", "lgImplication": "review Unitree component dependencies in LG supply chain"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Unitree%' AND hr.name LIKE '%G1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%Unitree%국방부%군사 연계%'
)
LIMIT 1;

-- ----- Boston Dynamics: Hyundai/Kia 25,000대 배치 계획 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       '[WARNING] Boston Dynamics Atlas Hyundai/Kia 25,000대+ 배치 계획 - Georgia Metaplant 2028년 시작',
       'Hyundai가 자사 및 Kia 공장에 Atlas 25,000대 이상 배치 계획 확정. Georgia Metaplant(Savannah)에서 2028년 보수적 배치 시작. 연간 30,000대 생산공장은 2028년까지 가동 목표. 현재 2026년 생산분 전량 Hyundai RMAC + Google DeepMind에 예약 완료. 첫 상업 출하 진행 중.',
       '{"source": "Forbes, Hyundai News, Axios, AI2Work", "sourceUrl": "https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind", "confidence": "A", "deployment": {"totalPlanned": "25,000+ units across Hyundai/Kia plants", "georgiaMetaplant": "deployment starts 2028", "factoryCapacity": "30,000/year by 2028", "2026Status": "full production run committed to Hyundai RMAC + Google DeepMind", "firstCommercialShipments": "in progress"}}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Boston Dynamics' AND hr.name LIKE '%Atlas%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Atlas%25,000대%Georgia%'
)
LIMIT 1;


-- ============================================================
-- 2. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- Tesla: Musk 생산라인 점검
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Teslarati / Basenor',
  'https://www.teslarati.com/tesla-optimus-project-fires-up-musk-sees-production-line-progress/',
  'Tesla Optimus 생산라인 공식 가동 확인 - Musk 7/1 직접 점검, 7월말 양산 시작',
  'Elon Musk가 7월 1일 Fremont Optimus 생산라인 직접 방문 및 X에 사진 공개. VP Lars Moravy "첫 생산라인 안착" 확인. Q1 실적발표에서 7월 말~8월 양산 시작 언급. Gen 3: 37개 관절, 1.2m/s, 10,000개 고유 부품.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Musk%7/1%생산라인%'
  AND competitor_id = c.id
);

-- Apptronik: Robot Park + Apollo 2
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forbes / Apptronik Official',
  'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
  'Apptronik Robot Park 90K sqft 개소, Apollo 2 공개 — Google DeepMind 데이터 파트너십',
  'Apptronik 6/30 Austin TX에 90,000sqft Robot Park(데이터 팩토리) 정식 오픈. Apollo 2 공개(이족보행+휠 2종, 6ft, 4시간 배터리, 55lbs 양손 가반). Google DeepMind Gemini Robotics 데이터 수집 파트너십. Mercedes-Benz/GXO에도 Robot Park 네트워크 확장. Apollo 3(첫 상용 제품) 2027년 예정.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Robot Park 90K%Apollo 2%'
  AND competitor_id = c.id
);

-- Apptronik: Apollo 2 기술 스펙 (HW 레이어)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Automate.org / Apptronik',
  'https://www.automate.org/robotics/industry-insights/apptronik-opens-90-000-sq-ft-testing-site-for-new-apollo-2-humanoid/aph',
  'Apollo 2 HW 스펙 공개 — 이족보행/휠 듀얼 구성, 1년간 비공개 테스트 후 공개',
  'Apollo 2는 1년간 비공개 테스트 후 공개. 이족보행+휠베이스 듀얼 구성. 6ft 키, 4시간 연속동작, 55lbs 양손 가반하중. 대규모 데이터 수집을 통한 실세계 학습 설계. Apollo 3(2027 첫 상용 제품)의 기반 플랫폼.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'hw'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Apollo 2 HW 스펙%듀얼%'
  AND competitor_id = c.id
);

-- AgiBot: 홍콩 IPO
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Reuters / Yahoo Finance / Capital.com',
  'https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html',
  'AgiBot 홍콩 IPO Q3 2026 추진 — HK$40-50B($5.1-6.4B) 밸류, LG Electronics 투자자',
  'AgiBot 홍콩 증시 IPO Q3 2026 목표. 밸류에이션 HK$40-50B($5.1-6.4B). 15-25% 지분 매각, $1B+ 조달 예상. CICC/CITIC/Morgan Stanley 주관. 투자자: Tencent, HongShan, LG Electronics, Mirae Asset, BYD, Hillhouse. ★ LG Electronics 투자자 확인.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE (c.slug = 'agibot-a3' OR c.slug ILIKE '%agibot%') AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%AgiBot%홍콩 IPO%LG Electronics%'
)
LIMIT 1;

-- AgiBot: G2 Longcheer QC 배치
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  '1023jack / AgiBot',
  'https://1023jack.com/news/the-humanoid-robotics-reality-check-q2-2026-pilot-to-production-status/',
  'AgiBot G2 Longcheer 태블릿 양산라인 QC 완전 자동화 - 310대/시간',
  'AgiBot G2(휠형) 6/23-28 Longcheer Technology(난창) 태블릿 양산라인 품질검사 구간 배치. 시간당 310대 처리, 18-20초 사이클타임. 전자제품 양산라인 QC 공정을 휴머노이드가 단독 수행한 최초 사례.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE (c.slug = 'agibot-a3' OR c.slug ILIKE '%agibot%') AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%AgiBot G2 Longcheer%310%'
)
LIMIT 1;

-- Figure AI: BMW 독일 확장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'BMW Press / Figure AI',
  'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
  'Figure 03 BMW Spartanburg 40대 배치 + 독일 3개 공장(뮌헨/레겐스부르크/라이프치히) 파일럿',
  'BMW Spartanburg에 Figure 03 40대 배치, 물류 시퀀싱 수행. 무선충전, 촉각핸드센서, 팜카메라, 음성대화 탑재. 독일 뮌헨/레겐스부르크/라이프치히 파일럿 진행 중. Helix-02 데모(5월): 2대가 단일 VLA로 침실 정리 협업.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Figure 03 BMW%40대%독일%'
  AND competitor_id = c.id
);

-- Unitree: DoD 군사 연계 기업 지정
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'US DoD / Kharon',
  'https://www.kharon.com/brief/unitree-robotics-china-pla',
  'Unitree 美 국방부 중국 군사 연계 기업 지정 — GUARD Act 결합 시 미국 시장 퇴출 위험',
  '2026년 6월 미국 국방부가 Unitree를 중국 군사 연계 기업으로 지정. PLA 도시전 Go2 자동소총 장착 영상, CEO 시진핑 면담(2025.2), 30개 PLA 연계 대학 납품(Kharon). GUARD Act(6/3)와 결합 시 미국 전면 금지. LG 공급망 Unitree 부품 점검 필요.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree-g1' AND l.slug = 'safety'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Unitree%국방부%군사 연계%'
  AND competitor_id = c.id
);

-- Boston Dynamics: 25,000대 배치 계획
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forbes / Hyundai / Axios / AI2Work',
  'https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind',
  'Boston Dynamics Atlas 첫 상업 출하 시작 — Hyundai/Kia 25,000대+ 배치 계획, Georgia 2028',
  'Atlas 첫 상업 출하 Hyundai RMAC 및 Google DeepMind로 진행 중. Hyundai/Kia 공장 25,000대+ 배치 계획. Georgia Metaplant(Savannah) 2028년 배치 시작. 연 30,000대 생산공장 2028년 가동 목표.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Atlas%25,000대%Georgia%'
  AND competitor_id = c.id
);


-- ============================================================
-- 3. ARTICLES (articles 테이블) — 신규 기사
-- ============================================================

-- Tesla: Musk 생산라인 확인 (7/1)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla''s First Optimus Production Line Has Landed — Musk Walks Factory Floor July 1',
       'Basenor / Teslarati',
       'https://www.basenor.com/blogs/news/teslas-first-optimus-production-line-has-landed',
       '2026-07-01'::timestamp,
       'Elon Musk 7/1 Fremont Optimus 생산라인 직접 점검, X에 사진 공개. VP Lars Moravy "첫 생산라인 안착" 확인. Q1 실적발표에서 7월 말~8월 양산 시작. Gen 3: 37관절, 1.2m/s, 10K 부품.',
       'en', 'product', 'robot',
       md5('basenor-tesla-optimus-production-line-landed-2026-07-02'),
       '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus Gen 3"],"technologies":["production line","37 joints","1.2m/s walk"],"marketInsights":["production start late July/August 2026","1M units annual capacity target","10000 unique parts"],"keyPoints":["Musk walks production line July 1","VP Moravy confirms line ready","Gen 3 production late July/August"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('basenor-tesla-optimus-production-line-landed-2026-07-02'));

-- Apptronik: Robot Park + Apollo 2
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Apptronik Announces Robot Park, A 90,000 Square Foot Humanoid Data Factory, Teases New Robot',
       'Forbes',
       'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
       '2026-06-30'::timestamp,
       'Apptronik Robot Park 90K sqft(Austin TX) 정식 오픈. Apollo 2 공개(이족보행+휠, 6ft, 4hr 배터리, 55lbs 가반). Google DeepMind Gemini Robotics 데이터 수집 파트너십. Apollo 3(2027 첫 상용제품) 티저.',
       'en', 'product', 'robot',
       md5('forbes-apptronik-robot-park-apollo2-2026-07-02'),
       '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["data factory","Gemini Robotics","bipedal + wheeled configurations"],"marketInsights":["90K sqft data collection facility","Apollo 3 first commercial product 2027","Robot Park network expanding"],"keyPoints":["Robot Park 90K sqft opened","Apollo 2 dual configuration unveiled","Google DeepMind Gemini Robotics partnership"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Apptronik'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('forbes-apptronik-robot-park-apollo2-2026-07-02'));

-- AgiBot: 홍콩 IPO
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Chinese Robot Maker AgiBot Plans Hong Kong IPO Q3 2026 — Targets HK$40-50B Valuation',
       'Reuters / Yahoo Finance',
       'https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html',
       '2026-06-20'::timestamp,
       'AgiBot 홍콩 IPO Q3 2026 추진. 밸류에이션 HK$40-50B($5.1-6.4B). 15-25% 지분 매각, $1B+ 조달. CICC/CITIC/Morgan Stanley 주관. 투자자: Tencent, HongShan, LG Electronics, Mirae, BYD.',
       'en', 'industry', 'robot',
       md5('reuters-agibot-hk-ipo-q3-2026-07-02'),
       '{"mentionedCompanies":["AgiBot","Tencent","LG Electronics","BYD","Mirae Asset","HongShan Capital","CICC","CITIC Securities","Morgan Stanley"],"mentionedRobots":["A2","G2","X2"],"technologies":[],"marketInsights":["HK$40-50B valuation","$1B+ raise","LG Electronics is investor","Q3 2026 HKEX listing"],"keyPoints":["Hong Kong IPO Q3 2026","HK$40-50B valuation target","LG Electronics confirmed investor"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('reuters-agibot-hk-ipo-q3-2026-07-02'));

-- Figure AI: BMW 독일 확장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'BMW Group Advances the Use of Physical AI in Production with Figure 03 Project in Spartanburg',
       'BMW Press',
       'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
       '2026-06-25'::timestamp,
       'BMW Spartanburg에 Figure 03 40대 배치. 물류 시퀀싱 수행. 무선충전, 촉각핸드센서, 팜카메라, 음성대화 탑재. 독일 3개 공장(뮌헨/레겐스부르크/라이프치히) 파일럿 확장.',
       'en', 'product', 'robot',
       md5('bmw-press-figure03-spartanburg-german-expansion-2026-07-02'),
       '{"mentionedCompanies":["BMW","Figure AI"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["wireless charging","tactile hand sensors","palm cameras","speech-to-speech","VLA policy"],"marketInsights":["40 units at Spartanburg","German plant pilots expanding","Figure 02 retired after successful BMW trial"],"keyPoints":["40 Figure 03 at BMW Spartanburg","German expansion Munich/Regensburg/Leipzig","Figure 03 new sensor suite"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('bmw-press-figure03-spartanburg-german-expansion-2026-07-02'));

-- Unitree: DoD 군사 연계 기업 지정
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'At Unitree Robotics, a Star Chinese Firm, the Military Connections Keep Mounting',
       'Kharon',
       'https://www.kharon.com/brief/unitree-robotics-china-pla',
       '2026-06-15'::timestamp,
       '미국 국방부 Unitree 중국 군사 연계 기업 지정. PLA 도시전 Go2 자동소총 영상. CEO 시진핑 면담(2025.2). 30개 PLA 대학 납품. GUARD Act 결합 시 미국 시장 전면 금지 가능.',
       'en', 'industry', 'robot',
       md5('kharon-unitree-pla-military-connections-2026-07-02'),
       '{"mentionedCompanies":["Unitree Robotics","US DoD","PLA"],"mentionedRobots":["Go2","G1","B2"],"technologies":[],"marketInsights":["DoD military-linked company designation","GUARD Act potential ban","30 PLA university sales"],"keyPoints":["DoD designates Unitree military-linked","PLA urban warfare robot rifle video","GUARD Act combined risk"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('kharon-unitree-pla-military-connections-2026-07-02'))
LIMIT 1;


-- ============================================================
-- 4. CI VALUES 업데이트
-- ============================================================

-- Apptronik - 상용화 단계 업데이트
UPDATE ci_values SET
  value = 'Pilot → Apollo 2 공개 (Robot Park 데이터 팩토리), Apollo 3 상용 2027',
  confidence = 'A',
  source = 'Forbes / Apptronik Official',
  source_date = '2026-06-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'apollo' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = 'Google DeepMind (Gemini Robotics), Mercedes-Benz, GXO, Jabil',
  confidence = 'A',
  source = 'Forbes / Apptronik',
  source_date = '2026-06-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'apollo' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객' LIMIT 1);

-- AgiBot - 밸류에이션 업데이트
UPDATE ci_values SET
  value = '$5.1-6.4B (HK$40-50B, 홍콩 IPO Q3 2026 목표)',
  confidence = 'B',
  source = 'Reuters / Yahoo Finance',
  source_date = '2026-06-20',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'agibot-a3' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '최근 밸류에이션' LIMIT 1);

UPDATE ci_values SET
  value = 'Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse',
  confidence = 'B',
  source = 'Reuters / Capital.com',
  source_date = '2026-06-20',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'agibot-a3' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 투자자' LIMIT 1);


-- ============================================================
-- 5. 기업 밸류에이션 업데이트 (companies 테이블)
-- ============================================================

UPDATE companies SET valuation_usd = 5500000000.00, updated_at = NOW()
WHERE name = 'Apptronik' AND (valuation_usd IS NULL OR valuation_usd < 5500000000);

UPDATE companies SET valuation_usd = 5700000000.00, updated_at = NOW()
WHERE name = 'Agibot' AND (valuation_usd IS NULL OR valuation_usd < 5700000000);


COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, severity, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, severity;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
-- SELECT count(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
