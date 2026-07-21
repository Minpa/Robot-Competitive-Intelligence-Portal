-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-21
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- 이전 스크립트(2026-07-20)와 중복되지 않는 신규 항목만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트) — 신규 항목
--    content_hash 기반 중복 방지
-- ============================================================

-- [Agility Robotics] Fremont AI 허브 개설 — Tesla 인근 거점 (A, 2026-07-17)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics Opens Fremont AI Hub to Accelerate Digit Development — Plants Flag in Tesla Backyard',
  'TechCrunch / Robotics and Automation News',
  'https://techcrunch.com/2026/07/17/agility-robotics-plants-its-flag-in-teslas-backyard/',
  '2026-07-17'::timestamp,
  'Agility Robotics, 캘리포니아 Fremont에 신규 Physical AI 개발 시설 개설. 약 200명 하드웨어·AI/ML·현장운영 인력 배치. Digit 자율성 강화 및 기업 배포 확장 목적. Tesla Fremont 공장 인근에 전략적 거점 확보.',
  'Agility Robotics has opened a new facility in Fremont, California, to accelerate physical AI development for its Digit humanoid robot. The facility houses nearly 200 employees across hardware engineering, AI/ML software engineering, and field operations teams. The strategic location in Fremont, near Tesla''s factory, signals Agility''s intent to compete directly in the Bay Area robotics talent pool. The facility will support growing enterprise deployments and development of the next-generation Digit v5, for which the company has already secured over $300 million in multi-year orders.',
  'en', 'industry', 'robot',
  md5('agility-fremont-ai-hub-opens-2026-07-17'),
  '{"confidence":"A","mentionedCompanies":["Agility Robotics","Tesla"],"mentionedRobots":["Digit","Digit v5"],"technologies":["Physical AI","autonomous manipulation"],"marketInsights":["200 employees at new Fremont hub","$300M+ multi-year orders secured","Strategic Bay Area positioning"],"keyPoints":["New Fremont facility opened July 17","200 staff for HW/AI/ML/field ops","Near Tesla factory — talent competition","Supports Digit v5 development and enterprise deployment"],"summaryKo":"Agility Robotics, Fremont에 Physical AI 허브 개설. 약 200명 배치. Tesla 공장 인근 전략적 거점. Digit v5 개발 및 기업 배포 지원. $300M+ 다년 주문 확보."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-fremont-ai-hub-opens-2026-07-17'));

-- [Agibot] 15,000대 출하 달성 — 10K→15K 3개월 미만 (A, 2026-06 late)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AgiBot Hits 15,000 Robots — Eyes Factory Floors Worldwide with 5 Platforms and 8 AI Models',
  'WebProNews / PR Newswire / eWeek',
  'https://www.webpronews.com/chinas-agibot-hits-15000-robots-and-eyes-factory-floors-worldwide/',
  '2026-07-01'::timestamp,
  'Agibot, 15,000번째 로봇 출하 달성(6월 말). 3월 10,000대 → 3개월 미만 만에 50% 증가. 2026 파트너 컨퍼런스에서 5개 로봇 플랫폼 + 8개 AI 모델 공개. Longcheer Technology 소비자 전자 제조 라인 대규모 배치(업계 최초 embodied AI 양산 적용 사례). 독일 Minth Group + 싱가포르 Singtel 파트너십. 밀라노·뮌헨 유럽 전시.',
  'Shanghai-based AgiBot rolled its 15,000th robot off the production line in late June 2026, growing from 10,000 units (achieved in March) to 15,000 in under three months. At its 2026 Partner Conference, AgiBot introduced five robotic platforms and eight AI models designed for factories, stores, and homes. A notable deployment with Longcheer Technology marks the first large-scale industrial implementation of embodied AI in consumer electronics precision manufacturing. Strategic partnerships with Minth Group (Germany) and Singtel (Singapore) expand global reach. AgiBot hosted its first European launch in Milan and exhibited in Munich. The Hong Kong IPO filing targets a valuation between HK$40-50B ($5.1-6.4B), with CICC, CITIC Securities, and Morgan Stanley as joint sponsors.',
  'en', 'industry', 'robot',
  md5('agibot-15000-robots-worldwide-expansion-2026-07'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","Longcheer Technology","Minth Group","Singtel","CICC","Morgan Stanley"],"mentionedRobots":["A3","X3","G2"],"technologies":["8 AI models","embodied AI manufacturing"],"marketInsights":["15,000 robots milestone (late June)","10K→15K in <3 months","First embodied AI in consumer electronics manufacturing","HK IPO $5.1-6.4B valuation"],"keyPoints":["15K units — 50% growth in 3 months","5 platforms + 8 AI models at Partner Conference","Longcheer consumer electronics deployment","HK IPO with CICC/CITIC/Morgan Stanley"],"summaryKo":"Agibot, 15,000번째 로봇 출하(6월 말). 3개월 만에 10K→15K(50% 증가). 5개 플랫폼 + 8개 AI 모델 공개. Longcheer 소비자전자 제조라인 대규모 배치. HK IPO $5.1-6.4B 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-robots-worldwide-expansion-2026-07'));

-- [Unitree] STAR Market IPO 최종 승인 — 역대 최고속, $5.9B 기업가치 (A, 2026-07-03)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree IPO Approved: STAR Market Fastest-Ever Registration at $5.9B Valuation — G1 Robots Now Self-Assemble Joint Motors',
  'TechTimes / Forbes / eWeek',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-07-03'::timestamp,
  'Unitree, ~$618M STAR Market IPO 최종 승인(7월 3일). $5.9B 기업가치. 역대 최고속 STAR 등록(104일). G1 휴머노이드가 Unitree 공장 내에서 자체 관절 모터 조립 중 — 재귀 제조(recursive manufacturing) 마일스톤. G1 자율 쿵푸 공연(-47°C 테스트). 2025년 출하 5,500대+, 매출 RMB 1.69B, 조정 흑자 달성.',
  'Unitree Robotics received final CSRC approval for its ~$618M STAR Market IPO on July 3, 2026, at an implied valuation of approximately $5.9 billion — the fastest STAR Market registration on record (104 days from filing). G1 humanoids now assemble their own joint motors inside Unitree factories, a recursive manufacturing milestone toward long-term cost reduction. The company shipped 5,500+ humanoids in 2025 with revenue of RMB 1.69 billion and achieved an adjusted profit, rare in the humanoid sector. The H2 model is listed at $29,900. Unitree also open-sourced UnifoLM-VLA-0 in March 2026 and launched the world''s first humanoid robot app store.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-ipo-approved-fastest-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Unitree"],"mentionedRobots":["G1","H2"],"technologies":["recursive manufacturing","UnifoLM-VLA-0"],"marketInsights":["~$618M IPO at $5.9B valuation","104-day fastest STAR registration","5,500+ units shipped 2025","RMB 1.69B revenue, adjusted profit"],"keyPoints":["STAR Market IPO approved July 3","Fastest-ever STAR registration (104 days)","G1 robots self-assembling joint motors","Adjusted profitability achieved in 2025"],"summaryKo":"Unitree, STAR Market IPO 최종 승인(7/3). $5.9B 기업가치, 역대 최고속 등록(104일). G1이 공장 내 관절 모터 자체 조립(재귀 제조). 2025년 5,500대 출하, RMB 1.69B 매출, 조정 흑자."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-approved-fastest-2026-07'));

-- [Toyota Canada] Agility Digit 7대 배치 확인 — 2026 Woodstock 공장 (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Toyota Canada Confirms 2026 Rollout of Agility Digit Robots at Woodstock Factory — 7 Units Deployed',
  'Yahoo Finance / Toyota Canada',
  'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
  '2026-07-18'::timestamp,
  'Toyota Motor Manufacturing Canada, Woodstock(온타리오) 공장에 Agility Digit 7대 배치 확인. 파일럿에서 상용 수준으로 확대. 부품 순차 작업(parts sequencing) 중심. Digit 실운영 65,000+ 시간 달성에 기여. 자동차 OEM 채택 사례 확대.',
  'Toyota Motor Manufacturing Canada has confirmed the 2026 rollout of Agility Robotics'' Digit humanoid robots at its Woodstock, Ontario factory. The deployment involves seven Digit units, expanding from a pilot program to commercial-scale operations. The robots primarily handle parts sequencing tasks. This deployment contributes to Agility''s overall milestone of 65,000+ hours of real-world operation across all customer sites. Toyota''s adoption adds to the growing automotive OEM customer base alongside Schaeffler, demonstrating the automotive industry''s increasing acceptance of humanoid robots.',
  'en', 'industry', 'robot',
  md5('toyota-canada-digit-7-units-woodstock-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Toyota","Agility Robotics"],"mentionedRobots":["Digit"],"technologies":["parts sequencing"],"marketInsights":["7 Digit units at Toyota Woodstock","Pilot → commercial scale","Automotive OEM adoption expanding"],"keyPoints":["Toyota Canada confirmed 2026 rollout","7 Digit robots at Woodstock ON","Parts sequencing focus","Expanding from pilot to commercial"],"summaryKo":"Toyota Canada, Woodstock 공장 Digit 7대 배치 확인(2026). 파일럿→상용 확대. 부품 순차 작업 중심. 자동차 OEM 채택 확대 사례."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('toyota-canada-digit-7-units-woodstock-2026-07'));

-- [규제] EU AI Act 고위험 AI 시스템 전면 시행 D-12일 (A, 2026-08-02 시행)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  NULL,
  'EU AI Act Full Application for High-Risk Systems on August 2, 2026 — Humanoid Robots in Scope, Up to €35M Penalties',
  'RoboticsBiz / Kite Compliance / EVS International',
  'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
  '2026-07-20'::timestamp,
  'EU AI Act, 2026년 8월 2일 고위험 AI 시스템 전면 시행 — 산업용 휴머노이드 로봇 포함. 미준수 시 최대 €35M 또는 글로벌 매출 7% 벌금. 12월: EU 개정 제조물책임지침(소프트웨어 = 제품). 2027년 1월: EU 기계규정 2023/1230(최고위험 기계류 인증기관 승인 필수). ISO 25785-1(동적 안정 이동 로봇 안전) 개발 중. IEC 62443 사이버보안 연계 요구.',
  'The EU AI Act reaches full application for high-risk AI systems on August 2, 2026, with industrial humanoid robots explicitly in scope. Non-compliance penalties reach up to €35 million or 7% of global revenue. The EU Revised Product Liability Directive follows in December 2026, formally recognizing software as a product. The EU Machinery Regulation 2023/1230 takes effect January 2027, requiring notified body approval for highest-risk machinery including certain humanoids. ISO 25785-1, the dedicated safety standard for dynamically stable industrial mobile robots, remains under development. ISO 10218-2:2025 nearly tripled in length with expanded safety requirements. IEC 62443-style cybersecurity is now mandatory for functional safety.',
  'en', 'regulation', 'robot',
  md5('eu-ai-act-aug2-humanoid-high-risk-2026-07'),
  '{"confidence":"A","mentionedCompanies":[],"mentionedRobots":[],"technologies":["ISO 25785-1","ISO 10218-2:2025","IEC 62443","EU AI Act"],"marketInsights":["EU AI Act full application Aug 2, 2026","Up to €35M or 7% revenue penalties","EU Product Liability Directive Dec 2026","EU Machinery Regulation Jan 2027"],"keyPoints":["High-risk AI systems full application D-12","Industrial humanoid robots in scope","ISO 25785-1 for dynamic mobile robots in development","Cybersecurity now mandatory for safety functions"],"summaryKo":"EU AI Act, 8월 2일 고위험 AI 전면 시행(D-12일). 산업용 휴머노이드 포함. 최대 €35M/매출 7% 벌금. 12월 제조물책임지침, 2027년 1월 기계규정 시행 예정. ISO 25785-1 개발 중."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('eu-ai-act-aug2-humanoid-high-risk-2026-07'));

-- [Agibot] HK IPO $5.1-6.4B — CICC/CITIC/Morgan Stanley 주관 (B, 2026-Q3)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AgiBot Targets $5.1-6.4B Valuation in Hong Kong IPO — CICC, CITIC, Morgan Stanley as Joint Sponsors',
  'Capital.com / Arthalagani / PitchBook',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-07-15'::timestamp,
  'Agibot, 홍콩 증권거래소 IPO 추진. 기업가치 HK$40-50B($5.1-6.4B). 지분 15-25% 매각으로 $1B+ 조달 목표. CICC, CITIC Securities, Morgan Stanley 공동 주관. 투자자: Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse. 기존 누적 자금 $314M.',
  'AgiBot is pursuing a Hong Kong Stock Exchange listing targeting a valuation between HK$40-50 billion (approximately $5.1-6.4 billion). The company plans to sell 15-25% of shares, potentially raising more than $1 billion. Joint sponsors and underwriters include China International Capital Corp (CICC), CITIC Securities, and Morgan Stanley. Previous investors include Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, and Hillhouse Investment. Total capital raised to date is $314 million. The IPO is expected by Q3 2026, subject to market conditions and regulatory approval.',
  'en', 'industry', 'robot',
  md5('agibot-hk-ipo-5b-cicc-morgan-stanley-2026-07'),
  '{"confidence":"B","mentionedCompanies":["AgiBot","CICC","CITIC Securities","Morgan Stanley","Tencent","LG Electronics","BYD","Hillhouse"],"mentionedRobots":[],"technologies":[],"marketInsights":["HK IPO $5.1-6.4B target","15-25% share sale, $1B+ proceeds","Q3 2026 expected listing","$314M raised to date"],"keyPoints":["Hong Kong Stock Exchange listing","$5.1-6.4B valuation range","CICC/CITIC/Morgan Stanley joint sponsors","LG Electronics among existing investors"],"summaryKo":"Agibot, HK IPO 추진. $5.1-6.4B 기업가치. 15-25% 매각, $1B+ 조달 목표. CICC/CITIC/Morgan Stanley 주관. LG Electronics 기존 투자자."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-hk-ipo-5b-cicc-morgan-stanley-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림) — 신규 항목
-- ============================================================

-- [CRITICAL] Agibot 15,000대 돌파 — 양산 가속도 심화
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Agibot] 15,000대 출하 돌파(6월 말) — 10K→15K 3개월 미만, HK IPO $5.1-6.4B',
  'Agibot, 15,000번째 로봇 출하(6월 말). 3월 10K → 3개월 미만 15K(50% 증가). 5개 플랫폼 + 8개 AI 모델. Longcheer 소비자전자 양산라인 배치(업계 최초). HK IPO $5.1-6.4B 추진. 양산 가속도가 글로벌 경쟁 판도 변화 주도.',
  '{"source":"WebProNews / PR Newswire / Capital.com","confidence":"A","date":"2026-07-01","milestone":"15,000 robots","growth":"10K→15K in <3 months","platforms":5,"ai_models":8,"hk_ipo":"$5.1-6.4B","consumer_electronics":"Longcheer first deployment"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%15,000대%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] Unitree STAR Market IPO 승인 — 역대 최고속, 재귀 제조
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Unitree] STAR Market IPO 최종 승인($5.9B) — 역대 최고속 104일, G1 재귀 제조 달성',
  'Unitree STAR Market IPO 최종 승인(7/3). ~$618M 조달, $5.9B 기업가치. 역대 최고속 등록(104일). G1이 공장 내 관절 모터 자체 조립(재귀 제조 마일스톤). 2025년 5,500대 출하, RMB 1.69B 매출, 조정 흑자 달성.',
  '{"source":"TechTimes / Forbes / eWeek","confidence":"A","date":"2026-07-03","ipo_size":"~$618M","valuation":"$5.9B","registration_days":104,"recursive_manufacturing":"G1 self-assembling joint motors","2025_shipments":5500,"2025_revenue":"RMB 1.69B","profitability":"adjusted profit achieved"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%STAR Market%IPO%'
  AND created_at > '2026-07-01'::timestamp
);

-- [INFO] Agility Robotics Fremont AI 허브 + Toyota Canada 7대 배치
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'info',
  '[Agility] Fremont AI 허브 개설(200명) + Toyota Canada Digit 7대 상용 배치 확인',
  'Agility, Fremont에 신규 Physical AI 허브 개설(7/17). 약 200명 HW/AI/ML/현장운영 인력 배치. Tesla 인근 인재 경쟁. Toyota Canada Woodstock 공장 Digit 7대 상용 배치 확인. Digit v5 $300M+ 다년 주문 확보.',
  '{"source":"TechCrunch / Yahoo Finance / Robotics and Automation News","confidence":"A","date":"2026-07-17","new_facility":"Fremont CA","employees":200,"toyota_units":7,"toyota_location":"Woodstock Ontario","v5_orders":"$300M+"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agility%Fremont%AI%허브%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] EU AI Act 고위험 AI 전면 시행 D-12 — 규제 리스크
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  NULL,
  'mass_production', 'warning',
  '[규제] EU AI Act 고위험 AI 전면 시행 D-12일(8/2) — 산업용 휴머노이드 포함, €35M 벌금',
  'EU AI Act 8월 2일 고위험 AI 시스템 전면 시행. 산업용 휴머노이드 로봇 포함. 미준수 최대 €35M/매출 7% 벌금. 12월 EU 제조물책임지침(SW=제품). 2027년 1월 기계규정 2023/1230. ISO 25785-1 개발 중. LG 유럽 진출 전략에 직접적 영향.',
  '{"source":"RoboticsBiz / Kite Compliance / EVS International","confidence":"A","date":"2026-07-20","deadline":"2026-08-02","scope":"industrial humanoid robots","penalty":"€35M or 7% global revenue","product_liability":"Dec 2026","machinery_regulation":"Jan 2027","iso_25785_1":"under development"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%EU AI Act%고위험%D-12%'
  AND created_at > '2026-07-15'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림) — 신규 항목
-- ============================================================

-- Agibot 15,000대 돌파
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'WebProNews / PR Newswire',
  'https://www.webpronews.com/chinas-agibot-hits-15000-robots-and-eyes-factory-floors-worldwide/',
  'Agibot 15,000대 출하 돌파 — 10K→15K 3개월 미만, 5개 플랫폼 + 8개 AI 모델',
  '15K번째 로봇 출하(6월 말). 10K→15K 3개월 미만. 5개 플랫폼 + 8개 AI 모델 공개. Longcheer 소비자전자 제조 배치. HK IPO $5.1-6.4B.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%15,000대%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Unitree STAR Market IPO 승인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechTimes / Forbes',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  'Unitree STAR Market IPO 최종 승인 — $5.9B 기업가치, 104일 역대 최고속 등록',
  '~$618M STAR IPO 승인(7/3). $5.9B 기업가치. 104일 최고속. G1 재귀 제조. 2025 5,500대/RMB 1.69B/조정흑자.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR slug ILIKE '%g1%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree STAR Market IPO%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Agility Fremont 허브
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'TechCrunch / Robotics and Automation News',
  'https://techcrunch.com/2026/07/17/agility-robotics-plants-its-flag-in-teslas-backyard/',
  'Agility Robotics Fremont AI 허브 개설 — 200명 배치, Digit v5 개발 가속',
  'Fremont AI 허브 개설(7/17). 200명 HW/AI/ML/현장운영. Tesla 인근 거점. Digit v5 $300M+ 주문. Toyota Canada 7대 배치.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' OR name ILIKE '%Agility%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility%Fremont%AI 허브%'
  AND detected_at > '2026-07-01'::timestamp
);

-- EU AI Act D-12
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'RoboticsBiz / Kite Compliance',
  'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
  '[규제] EU AI Act 고위험 AI 전면 시행 D-12일(8/2) — 산업용 휴머노이드 포함',
  'EU AI Act 8/2 고위험 전면 시행. 산업용 휴머노이드 포함. €35M/매출7% 벌금. 12월 제조물책임지침. 2027/1 기계규정. ISO 25785-1 개발 중.',
  NULL,
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%EU AI Act%D-12%'
  AND detected_at > '2026-07-15'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 6 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 4 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 4 (deduplicated by headline + date)
-- Total: up to 14 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처 / 복수 유력 매체 교차확인:
--     Agility Fremont AI 허브 (TechCrunch / Robotics and Automation News)
--     Agibot 15,000대 돌파 (WebProNews / PR Newswire / eWeek)
--     Unitree STAR Market IPO (TechTimes / Forbes / eWeek)
--     EU AI Act 규제 시행 (RoboticsBiz / Kite Compliance / EVS Int.)
-- [B] 2개 이상 매체 교차확인:
--     Toyota Canada Digit 배치 (Yahoo Finance / Toyota Canada)
--     Agibot HK IPO (Capital.com / Arthalagani / PitchBook)
--
-- NOTE: Railway PostgreSQL은 이 실행 환경에서 TCP 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-21.sql
-- ============================================================
