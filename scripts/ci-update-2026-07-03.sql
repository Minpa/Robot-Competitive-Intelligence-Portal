-- ============================================================
-- [ARGOS] 경쟁사 데이터 업데이트 — 2026-07-03
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-07-03.sql
-- 주의: 기존 07-01, 06-30 업데이트 이후 신규 데이터만 포함
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
       '[CRITICAL] Tesla Optimus 생산라인 Fremont 설치 완료 — V3 37관절, 모듈형 라인, Giga Texas 2공장 착공',
       'Tesla Optimus 생산라인이 2026년 7월 1일 Fremont 공장에 설치 완료됨. VP Lars Moravy 공개: 모듈형 설계로 하드웨어 진화 시 전체 라인 재구축 불필요. V3 사양 — 37관절(V2 대비 +9), 22-DOF 정밀 손(서브밀리미터 정밀도). 10,000개 고유 부품으로 초기 생산 속도 느릴 것. 현실적 2026년 생산량: 수천 대 수준. Giga Texas 2공장 2027년 여름 생산 시작 예정. 현재 Optimus는 Tesla 내부 공장 전용, 외부 판매 없음.',
       '{"source": "Basenor, Teslarati, CryptoBriefing", "sourceUrl": "https://www.basenor.com/blogs/news/teslas-first-optimus-production-line-has-landed", "confidence": "A", "date": "2026-07-01", "productionLineStatus": "installed at Fremont", "v3Joints": 37, "v3HandDof": 22, "handPrecision": "sub-millimeter", "uniqueParts": 10000, "modularDesign": true, "gigaTexas2ndFactory": "summer 2027", "realistic2026Output": "low thousands", "externalSales": false}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name ILIKE '%Optimus%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'mass_production'
  AND ca.title LIKE '%생산라인 Fremont 설치 완료%'
)
LIMIT 1;

-- ----- Figure AI -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '[WARNING] BMW Leipzig, Figure 03 대신 Hexagon AEON 선택 — 유럽 시장 진입 차질',
       'BMW가 독일 Leipzig 공장 휴머노이드 배치에 Figure 03 대신 Hexagon Robotics의 AEON(휠형 휴머노이드)을 선택. AEON은 2025년 12월 운영 시작, 2026년 여름 본격 파일럿. 22개 센서, 자체 배터리 교환, 4계층 Physical AI(모방학습 20회 시연으로 자율 운영). BMW 뮌헨에 Physical AI Center of Competence 설립. Figure AI는 추가 사용처 평가 중으로 전환.',
       '{"source": "BMW Group Official, BMWBlog, TheNextWeb", "sourceUrl": "https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html", "confidence": "A", "date": "2026-02-27", "chosenRobot": "Hexagon AEON", "rejectedRobot": "Figure 03", "aeonSpecs": {"height": "1.65m", "weight": "60kg", "mobility": "wheeled", "sensors": 22}, "leipzigPilot": "summer 2026 full-scale", "physicalAICenter": "Munich", "figureStatus": "evaluating additional use cases"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%BMW Leipzig%Hexagon AEON%'
);

-- ----- Unitree -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       '[CRITICAL] Unitree STAR Market IPO 승인 — $6.2B 밸류, 연 75K 휴머노이드 + 115K 쿼드러펫 생산 목표',
       'Unitree Robotics가 2026년 6월 1일 상하이 STAR Market IPO 상장위 심사 통과. 중국 최초 "embodied AI" A주 상장 기업. 4.2B 위안($610M→수정: $6.2B 밸류에이션) 조달 목표. R&D 및 대규모 생산 확대 계획: 연간 75,000대 휴머노이드 + 115,000대 쿼드러펫 로봇. NVIDIA Blackwell 칩 기반 H2 Plus 연구용 시스템 출시 — Stanford, ETH Zurich, UC San Diego, Ai2 채택. H2 $40,900 (상용) / $68,900 (EDU) 출시, 2,070 TOPS 컴퓨트.',
       '{"source": "TechTimes, CNBC, AI Business", "sourceUrl": "https://aibusiness.vc/startups/china-humanoid-robots-unitree-ipo-price-war-2026", "confidence": "A", "date": "2026-06-01", "ipoExchange": "Shanghai STAR Market", "ipoStatus": "listing committee approved", "targetRaise": "$610M (4.2B CNY)", "valuation": "$6.2B", "annualTarget": {"humanoid": 75000, "quadruped": 115000}, "nvidiaPartnership": "Blackwell chip + H2 Plus", "h2Price": "$40,900 commercial / $68,900 EDU", "h2Tops": 2070, "researchAdopters": ["Stanford", "ETH Zurich", "UC San Diego", "Ai2"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Unitree%' AND hr.name ILIKE '%G1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%STAR Market IPO 승인%$6.2B%'
)
LIMIT 1;

-- ----- Agibot -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       '[CRITICAL] Agibot 공장 실증 99.99% 성공률 — Omdia 글로벌 1위 (39% 점유), Q3 공장당 100대 배치',
       'Agibot가 6일간 실제 공장 데모에서 99.99% 작업 성공률 기록. 64,828건 생산 라인 작업 완료, 17,625대 태블릿 생산 기여. 4개 이상 제조 워크플로우 투입. Omdia 기준 2025년 글로벌 휴머노이드 출하 1위(5,168대, 39% 점유). 2026 Q3까지 공장당 100대 규모 배치 목표. 자동차, 반도체, 에너지 부문 확장 예정.',
       '{"source": "InterestingEngineering, Omdia, eWeek", "sourceUrl": "https://interestingengineering.com/ai-robotics/china-agibot-robots-hit-99-percent-success-during-six-day-live-factory-demo", "confidence": "A", "date": "2026-06", "taskSuccessRate": "99.99%", "totalTasks": 64828, "tabletsProduced": 17625, "demoHours": 64, "workflows": 4, "omdiaRanking": "1st globally 2025", "omdiaShipments": 5168, "omdiaMarketShare": "39%", "q3Target": "100 robots per factory", "expansionSectors": ["automotive", "semiconductors", "energy"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%99.99% 성공률%Omdia%'
)
LIMIT 1;

-- ----- 규제: ISO 25785-1 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       NULL,
       'partnership',
       'warning',
       '[규제] ISO 25785-1 동적 안정 로봇 안전 표준 개발 중 — Agility, BD 주도, 2026-2027 발행 예정',
       'ISO 25785-1: 동적 안정 로봇(dynamically stable robots) 전용 안전 표준이 Working Draft 단계. ISO 작업 그룹은 Agility Robotics, Boston Dynamics, A3 Association 전문가가 주도. 2026-2027 최종 발행 예상. 현행 기준: ISO 10218:2025, ANSI/A3 R15.06-2025. 미국은 UL 3300 인증으로 안전 신뢰성 확보. 사전 시장 승인 없이 자발적 합의 표준 + 제조물 책임 체계.',
       '{"source": "TheresaRobotForThat, KiteCompliance", "sourceUrl": "https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/", "confidence": "A", "date": "2026", "standard": "ISO 25785-1", "status": "Working Draft", "ledBy": ["Agility Robotics", "Boston Dynamics", "A3 Association"], "expectedPublication": "2026-2027", "currentStandards": ["ISO 10218:2025", "ANSI/A3 R15.06-2025"], "usCertification": "UL 3300", "implications": "LG needs to participate in ISO WG or align product safety architecture early"}'::jsonb,
       false,
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%ISO 25785-1%동적 안정 로봇%'
);

-- ----- 시장 동향: 중국 90% 출하 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       NULL,
       'mass_production',
       'critical',
       '[시장] 중국 글로벌 휴머노이드 출하 90% 장악 — TrendForce: 2026년 94% 생산 증가 전망',
       'TechTimes/TrendForce 보도: 중국이 글로벌 휴머노이드 로봇 출하의 90%를 장악. TrendForce 전망 2026년 중국 휴머노이드 생산 94% 증가. Unitree+AgiBot 양사가 중국 시장 약 80% 점유. Omdia 2025년 데이터: AgiBot 5,168대(39%), Unitree 5,500+대. 미국 GUARD Act + American Security Robotics Act로 중국 로봇 수입 규제 강화. 공급망 재편 불가피.',
       '{"source": "TechTimes, TrendForce, Omdia", "sourceUrl": "https://www.techtimes.com/articles/318641/20260618/humanoid-robots-china-ships-90-global-units-now-leads-ai-benchmarks.htm", "confidence": "B", "date": "2026-06", "chinaGlobalShare": "90%", "trendforce2026Growth": "94%", "unitreeAgibotChinaShare": "~80%", "omdia2025": {"agibot": 5168, "unitree": "5500+"}, "usRegulation": ["GUARD Act", "American Security Robotics Act H.R.8189"], "supplyChainRisk": "high"}'::jsonb,
       false,
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.title LIKE '%중국 글로벌 휴머노이드 출하 90%25%'
);


-- ============================================================
-- 2. ARTICLES (articles 테이블) — 신규 기사
-- ============================================================

-- Tesla: Optimus 생산라인 설치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla''s First Optimus Production Line Has Landed at Fremont — Modular Design, V3 with 37 Joints',
       'Basenor',
       'https://www.basenor.com/blogs/news/teslas-first-optimus-production-line-has-landed',
       '2026-07-01'::timestamp,
       'Tesla Optimus 생산라인 Fremont 설치 완료. VP Lars Moravy: 모듈형 설계로 하드웨어 진화 시 라인 재구축 불필요. V3 37관절(+9), 22-DOF 정밀 손. 10,000 고유 부품. Giga Texas 2공장 2027 여름.',
       'en', 'product', 'robot',
       md5('basenor-tesla-optimus-production-line-landed-fremont-2026-07-03'),
       '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus V3","Optimus Gen 3"],"technologies":["modular production line","22-DOF dexterous hands","sub-millimeter precision"],"marketInsights":["production line installed July 1","37 joints","10,000 unique parts","Giga Texas 2nd factory summer 2027"],"keyPoints":["first Optimus production line installed","modular design for hardware evolution","realistic 2026 output: low thousands"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('basenor-tesla-optimus-production-line-landed-fremont-2026-07-03'));

-- Tesla: V3 사양 상세
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla Optimus Explained: V3 Reveal, Fremont Production — 37 Joints, Modular Lines, Giga Texas Expansion',
       'Teslarati',
       'https://www.teslarati.com/tesla-optimus-project-fires-up-musk-sees-production-line-progress/',
       '2026-07-01'::timestamp,
       'Musk 현장 방문으로 Optimus 라인 가동 확인. 모듈형 라인 수십 개 계획. V3: 37관절, 22-DOF 손, 서브밀리미터 정밀도. 2026년 말 외부 판매 없음 — 내부 공장 전용.',
       'en', 'product', 'robot',
       md5('teslarati-optimus-production-line-progress-2026-07-03'),
       '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus V3"],"technologies":["modular production","37 joints","22-DOF hands"],"marketInsights":["dozens of lines planned","no external sales in 2026","internal factory use only"],"keyPoints":["Musk on-site visit confirms progress","modular production system","dozens of additional lines planned"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('teslarati-optimus-production-line-progress-2026-07-03'));

-- BMW-Hexagon: Leipzig AEON 배치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'BMW Group to Deploy Humanoid Robots in Production in Germany for First Time — Hexagon AEON at Leipzig',
       'BMW Group Official',
       'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
       '2026-02-27'::timestamp,
       'BMW Leipzig 공장에 Hexagon AEON 휠형 휴머노이드 배치. 유럽 최초 자동차 공장 Physical AI 투입. AEON: 1.65m, 60kg, 22센서, 자체 배터리 교환, 모방학습 20회로 자율 운영. 2026 여름 본격 파일럿. 뮌헨 Physical AI CoC 설립.',
       'en', 'industry', 'robot',
       md5('bmw-hexagon-aeon-leipzig-humanoid-2026-07-03'),
       '{"mentionedCompanies":["BMW","Hexagon Robotics","Figure AI"],"mentionedRobots":["AEON","Figure 02","Figure 03"],"technologies":["wheeled humanoid","imitation learning","self-swapping batteries","4-layer Physical AI"],"marketInsights":["Europe first automotive humanoid","Figure 03 passed over for Leipzig","Physical AI Center of Competence Munich"],"keyPoints":["Hexagon AEON chosen over Figure 03","BMW Munich Physical AI CoC","summer 2026 full-scale pilot"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('bmw-hexagon-aeon-leipzig-humanoid-2026-07-03'));

-- Unitree: STAR Market IPO 승인
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Unitree IPO Cleared for Shanghai STAR Market — $6.2B Valuation, 75K Humanoid + 115K Quadruped Annual Target',
       'TechTimes / AI Business',
       'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
       '2026-06-01'::timestamp,
       'Unitree Robotics 상하이 STAR Market 상장위 심사 통과(6/1). 중국 최초 embodied AI A주 상장. $6.2B 밸류에이션, $610M(4.2B 위안) 조달 목표. 연간 75K 휴머노이드 + 115K 쿼드러펫 생산 확대 계획.',
       'en', 'industry', 'robot',
       md5('techtimes-unitree-ipo-star-market-6.2b-2026-07-03'),
       '{"mentionedCompanies":["Unitree Robotics","Agibot"],"mentionedRobots":["G1","H2"],"technologies":["embodied AI"],"marketInsights":["$6.2B valuation","first embodied AI A-share listing","75K humanoid + 115K quadruped annual target"],"keyPoints":["STAR Market IPO approved June 1","China first embodied AI public company","massive production scale-up planned"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('techtimes-unitree-ipo-star-market-6.2b-2026-07-03'))
LIMIT 1;

-- Unitree: NVIDIA H2 Plus
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Nvidia Dives Into Humanoid Robots with China''s Unitree — Blackwell-Powered H2 Plus for Research',
       'CNBC',
       'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
       '2026-06-01'::timestamp,
       'NVIDIA가 Unitree와 공동으로 Blackwell 칩 기반 H2 Plus 연구용 휴머노이드 시스템 출시. Stanford, ETH Zurich, UC San Diego, Ai2 등 4개 연구기관 채택 예정. H2 Plus는 연구 특화 모델.',
       'en', 'technology', 'robot',
       md5('cnbc-nvidia-unitree-h2-plus-blackwell-2026-07-03'),
       '{"mentionedCompanies":["NVIDIA","Unitree Robotics"],"mentionedRobots":["H2 Plus"],"technologies":["NVIDIA Blackwell chip","research humanoid platform"],"marketInsights":["4 top research institutions adopting","NVIDIA expanding into humanoid hardware partnerships"],"keyPoints":["NVIDIA Blackwell + Unitree H2 Plus","Stanford ETH Zurich UC San Diego Ai2","research-focused humanoid system"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('cnbc-nvidia-unitree-h2-plus-blackwell-2026-07-03'))
LIMIT 1;

-- Agibot: 공장 실증 99.99% 성공률
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'AgiBot Humanoid Robots Prove Factory Readiness During Six-Day Demo — 99.99% Task Success Rate',
       'Interesting Engineering',
       'https://interestingengineering.com/ai-robotics/china-agibot-robots-hit-99-percent-success-during-six-day-live-factory-demo',
       '2026-06-15'::timestamp,
       'Agibot 6일간 실제 공장 데모에서 99.99% 작업 성공률. 64시간 가동, 64,828건 작업, 17,625대 태블릿 생산. 4개+ 제조 워크플로우 투입. Q3까지 공장당 100대 배치 목표. 자동차/반도체/에너지 확장.',
       'en', 'technology', 'robot',
       md5('ie-agibot-factory-demo-99.99-success-2026-07-03'),
       '{"mentionedCompanies":["AgiBot"],"mentionedRobots":["G2"],"technologies":["factory automation","embodied AI","99.99% task success"],"marketInsights":["64828 tasks in 6 days","17625 tablets produced","100 robots per factory by Q3"],"keyPoints":["99.99% task success rate","real factory production validated","Q3 2026 scale-up to 100 per factory"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('ie-agibot-factory-demo-99.99-success-2026-07-03'));

-- 중국 시장 90% 점유
INSERT INTO articles (id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       'Humanoid Robots: China Ships 90% of Global Units and Now Leads AI Benchmarks',
       'TechTimes',
       'https://www.techtimes.com/articles/318641/20260618/humanoid-robots-china-ships-90-global-units-now-leads-ai-benchmarks.htm',
       '2026-06-18'::timestamp,
       '중국이 글로벌 휴머노이드 출하 90% 장악. TrendForce: 2026년 94% 생산 증가 전망. AgiBot Omdia 기준 2025 글로벌 1위(39%). GUARD Act 등 미국 규제로 공급망 재편 불가피.',
       'en', 'industry', 'robot',
       md5('techtimes-china-90-global-humanoid-ai-benchmarks-2026-07-03'),
       '{"mentionedCompanies":["Unitree Robotics","Agibot"],"mentionedRobots":["G1","X1"],"technologies":["embodied AI benchmarks"],"marketInsights":["China 90% global humanoid shipments","94% production growth 2026","GUARD Act supply chain impact"],"keyPoints":["China dominates global humanoid market","US regulation creating supply chain risk","AgiBot #1 globally by Omdia"]}'::jsonb,
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('techtimes-china-90-global-humanoid-ai-benchmarks-2026-07-03'));

-- ISO 25785-1 안전 표준
INSERT INTO articles (id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       'Humanoid Robot Safety Standards 2026: ISO 25785-1, UL 3300, and What Factory Managers Must Know',
       'TheresaRobotForThat',
       'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
       '2026-06-15'::timestamp,
       'ISO 25785-1: 동적 안정 로봇 전용 안전 표준 Working Draft 단계. Agility, BD, A3 주도. 2026-2027 발행 예상. UL 3300 인증으로 안전 신뢰성 확보. ISO 10218:2025 + ANSI R15.06-2025 현행 기준.',
       'en', 'industry', 'robot',
       md5('trft-humanoid-safety-standards-iso-25785-2026-07-03'),
       '{"mentionedCompanies":["Agility Robotics","Boston Dynamics","A3 Association"],"mentionedRobots":["Digit"],"technologies":["ISO 25785-1","UL 3300","cooperative safety"],"marketInsights":["new standard specifically for humanoids","2026-2027 publication expected","voluntary consensus-based US market entry"],"keyPoints":["ISO 25785-1 in Working Draft","led by Agility BD A3","UL 3300 for safety credibility"]}'::jsonb,
       NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('trft-humanoid-safety-standards-iso-25785-2026-07-03'));


-- ============================================================
-- 3. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- Tesla: 생산라인 설치
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Basenor / Teslarati',
  'https://www.basenor.com/blogs/news/teslas-first-optimus-production-line-has-landed',
  'Tesla Optimus production line installed at Fremont July 1; V3 with 37 joints, modular design, Giga Texas 2nd factory summer 2027',
  'First Optimus production line installed at Fremont (July 1). VP Moravy: modular system adapts to hardware evolution. V3 specs: 37 joints (+9 vs V2), 22-DOF hands with sub-mm precision. 10,000 unique parts. Initial output: low thousands in 2026. Giga Texas 2nd factory targeting summer 2027. Currently internal-use only, no external sales.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Optimus production line installed%Fremont July%');

-- Figure AI / BMW: AEON 선택
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'BMW Group Official / BMWBlog',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  'BMW Leipzig chooses Hexagon AEON over Figure 03 for European humanoid deployment; Munich Physical AI CoC established',
  'BMW selects Hexagon AEON (wheeled humanoid, 1.65m, 60kg, 22 sensors) for Leipzig plant. First Physical AI in European automotive production. AEON operational since Dec 2025, summer 2026 full-scale pilot. BMW Munich Center of Competence for Physical AI. Figure 03 status: evaluating additional use cases.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%BMW Leipzig chooses Hexagon AEON%');

-- Unitree: STAR Market IPO
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'TechTimes / AI Business / CNBC',
  'https://aibusiness.vc/startups/china-humanoid-robots-unitree-ipo-price-war-2026',
  'Unitree STAR Market IPO approved June 1 — $6.2B valuation, 75K humanoid + 115K quadruped annual target; NVIDIA Blackwell H2 Plus partnership',
  'Unitree IPO listing committee approved June 1 — first embodied AI A-share listing. $6.2B valuation, raising $610M. Annual production target: 75K humanoid + 115K quadruped. NVIDIA Blackwell partnership: H2 Plus for research (Stanford, ETH Zurich, UC San Diego, Ai2). H2 at $40.9K commercial, 2,070 TOPS.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Unitree STAR Market IPO approved%');

-- Agibot: 99.99% success
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Interesting Engineering / Omdia',
  'https://interestingengineering.com/ai-robotics/china-agibot-robots-hit-99-percent-success-during-six-day-live-factory-demo',
  'AgiBot achieves 99.99% task success in live factory demo; Omdia ranks #1 globally (39% market share, 5,168 units 2025)',
  '6-day factory demo: 64 hours, 64,828 tasks, 17,625 tablets produced, 99.99% success rate, 4+ workflows. Omdia 2025 ranking: #1 globally with 5,168 units (39% share). Plans to scale to 100 robots per factory by Q3 2026. Expanding to automotive, semiconductors, energy sectors.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%AgiBot achieves 99.99%25%');

-- China market: 90% share
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'TechTimes / TrendForce',
  'https://www.techtimes.com/articles/318641/20260618/humanoid-robots-china-ships-90-global-units-now-leads-ai-benchmarks.htm',
  'China ships 90% of global humanoid units; TrendForce projects 94% production growth in 2026',
  'China dominates with 90% of global humanoid shipments. TrendForce: 94% production growth in 2026. Unitree + AgiBot capture ~80% of China market. AgiBot #1 globally by Omdia (5,168 units, 39%). US GUARD Act and American Security Robotics Act H.R.8189 creating supply chain restructuring pressure.',
  NULL,
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%China ships 90%25 of global humanoid%');


-- ============================================================
-- 4. CI Values 업데이트
-- ============================================================

-- Unitree: 밸류에이션 업데이트
UPDATE ci_values SET
  value = '$6.2B (STAR Market IPO 승인 2026.06)',
  confidence = 'A',
  source = 'TechTimes / AI Business — STAR Market IPO listing committee approved',
  source_date = '2026-06-01',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '최근 밸류에이션' LIMIT 1);

-- Unitree: 배치 대수
UPDATE ci_values SET
  value = '5,500대(2025), 2026년 목표 75K 휴머노이드 + 115K 쿼드러펫/년',
  confidence = 'A',
  source = 'TechTimes / AI Business IPO Filing',
  source_date = '2026-06-01',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);

-- Figure: 배치 대수 업데이트 (750+)
UPDATE ci_values SET
  value = '750대+ (Figure 03), Figure 02 퇴역(BMW 11개월 시험 완료)',
  confidence = 'A',
  source = 'Figure AI CEO / explainx.ai',
  source_date = '2026-06-20',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);

-- Figure: 주요 고객 (BMW Leipzig → Hexagon AEON으로 전환)
UPDATE ci_values SET
  value = 'BMW Spartanburg (Figure 03 40대), BMW Leipzig는 Hexagon AEON 선택',
  confidence = 'A',
  source = 'BMW Group Official / BMWBlog',
  source_date = '2026-02-27',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '주요 고객' LIMIT 1);


-- ============================================================
-- 5. 기업 밸류에이션 업데이트 (companies 테이블)
-- ============================================================

UPDATE companies SET valuation_usd = 6200000000.00, updated_at = NOW()
WHERE name ILIKE '%Unitree%' AND (valuation_usd IS NULL OR valuation_usd < 6200000000);


COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, severity, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, severity;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
-- SELECT count(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
