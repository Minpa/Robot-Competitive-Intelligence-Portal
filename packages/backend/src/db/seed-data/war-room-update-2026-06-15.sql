-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-15
-- ARGOS Competitive Intelligence Auto-Collect

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림)
-- =====================================================

-- [A] Tesla Optimus Gen 3 - Fremont 양산 라인 전환
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'mass_production', 'critical',
  'Tesla Optimus Gen 3: Fremont 공장 Model S/X 라인 → 로봇 전용 전환, 2026 하반기 양산 개시',
  'Tesla가 Fremont 공장의 Model S/X 생산라인을 Optimus Gen 3 양산 전용으로 전환 중. 2026년 1월 21일 파일럿 생산 시작, 7-8월 본격 양산 목표. 초기 연 100만대 생산능력 라인 설계 중이며, Texas Giga에 연 1,000만대 규모 2세대 라인도 계획.',
  '{"source": "TechTimes, Electrek, TheRobotReport", "date": "2026-06-09", "reliability": "A", "details": {"pilot_start": "2026-01-21", "full_production": "2026-07~08", "fremont_capacity": "1M/year", "texas_capacity": "10M/year", "consumer_target": "2027-Q4"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'mass_production'
  AND title LIKE '%Fremont%Model S%'
);

-- [A] Boston Dynamics Atlas - CES 2026 상용 버전 공개 & 배포 예약 완료
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'mass_production', 'critical',
  'Boston Dynamics Atlas: CES 2026 상용 버전 공개, 2026년 전량 예약 완료',
  'CES 2026에서 상용 Atlas 공개. Best Robot 수상. 2026년 배포분 전량 예약 완료. 초기 Hyundai 및 Google DeepMind에 배포. Hyundai Motor Group과 연 30,000대 규모 로봇 공장 건설 중.',
  '{"source": "BostonDynamics.com, Hyundai Newsroom, CNET", "date": "2026-01", "reliability": "A", "details": {"event": "CES 2026", "award": "Best Robot by CNET", "2026_reserved": true, "factory_capacity": "30000/year", "metaplant_deployment": "2028"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'mass_production'
  AND title LIKE '%CES 2026%'
);

-- [A] Boston Dynamics + Google DeepMind 파트너십
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'partnership', 'warning',
  'Boston Dynamics × Google DeepMind: AI Foundation Model 통합 파트너십',
  'Boston Dynamics가 Google DeepMind와 파트너십을 체결, 최첨단 foundation model을 Atlas에 통합하여 인지 능력을 대폭 강화. Atlas의 지능형 자율 작업 능력이 크게 향상될 전망.',
  '{"source": "BostonDynamics.com, Decrypt", "date": "2026-01", "reliability": "A", "partner": "Google DeepMind", "focus": "Foundation model integration for cognitive capabilities"}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'partnership'
  AND title LIKE '%Google DeepMind%'
);

-- [A] Figure AI - Series C $1B+ 완료, $39B 밸류에이션
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'funding', 'warning',
  'Figure AI: Series C $1B+ 달성, 밸류에이션 $39B (역대 최대 휴머노이드 기업)',
  'Figure AI가 Series C에서 $1B 이상 조달, 포스트머니 밸류에이션 $39B 달성. 18개월 만에 15배 밸류에이션 상승. Parkway Venture Capital 리드, NVIDIA/Intel Capital/Microsoft/OpenAI/Jeff Bezos 참여. 총 누적 $1.9B 조달.',
  '{"source": "PRNewswire, Figure.ai, Yahoo Finance", "date": "2025-09", "reliability": "A", "details": {"round": "Series C", "amount": "$1B+", "valuation": "$39B", "lead": "Parkway Venture Capital", "participants": ["NVIDIA", "Intel Capital", "Microsoft", "OpenAI", "Jeff Bezos", "Brookfield"], "total_raised": "$1.9B"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'funding'
  AND title LIKE '%Series C%$39B%'
);

-- [A] Figure 03 - BMW 배포 40대 & 백악관 방문
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'partnership', 'warning',
  'Figure 03: BMW Spartanburg 40대 배포, 백악관 방문으로 정책 영향력 확대',
  'Figure 03가 BMW Spartanburg에 40대 배포 중. Figure 02는 11개월간 30,000대 X3 생산 지원, 90,000개 이상 부품 로딩. 2026년 3월 백악관 Fostering the Future Together 서밋에 Figure 03 시연.',
  '{"source": "CNBC, ThomasNet", "date": "2026-03", "reliability": "A", "details": {"figure03_units": 40, "figure02_bmw_vehicles": 30000, "figure02_parts_loaded": 90000, "whitehouse_visit": "2026-03-25"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'partnership'
  AND title LIKE '%BMW%백악관%'
);

-- [A] Apptronik - $520M 추가 조달, 총 $935M, 밸류 $5.3B
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'funding', 'critical',
  'Apptronik Apollo: $520M 추가 조달, 총 $935M (Series A), 밸류에이션 $5.3B',
  '2026년 2월 Series A 연장으로 $520M 추가 조달. 총 Series A $935M, 누적 약 $1B. 포스트머니 $5.3B. Mercedes-Benz/GXO/Jabil 파일럿 확대, Google DeepMind Gemini Robotics 통합 파트너십 체결.',
  '{"source": "CNBC, TheRobotReport, SiliconAngle", "date": "2026-02-11", "reliability": "A", "details": {"round": "Series A extension", "new_amount": "$520M", "total_series_a": "$935M", "valuation": "$5.3B", "partners": ["Mercedes-Benz", "GXO Logistics", "Jabil", "Google DeepMind"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'funding'
  AND title LIKE '%$520M%$935M%'
);

-- [A] Unitree - STAR Market IPO 신청, $610M 목표
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'funding', 'warning',
  'Unitree Robotics: 상해 STAR Market IPO 심사 (2026.6.1), $610M 조달 목표',
  'Unitree Robotics가 상해 STAR Market에 42억위안($610M) IPO 신청. 2025년 매출 17.1억위안(YoY 335%), 순이익 6억위안(8배 증가). 5,500대 휴머노이드 출하(글로벌 1위). NVIDIA Jetson Thor 파트너십.',
  '{"source": "CNBC, KrAsia, KuCoin", "date": "2026-06-01", "reliability": "A", "details": {"ipo_target": "$610M (42B RMB)", "exchange": "Shanghai STAR Market", "2025_revenue": "1.71B RMB", "yoy_growth": "335%", "profit": "600M RMB", "humanoid_shipped": 5500}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'funding'
  AND title LIKE '%STAR Market IPO%'
);

-- [B] Unitree H2 + NVIDIA 파트너십
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '6de531f2-2078-4903-b537-1a6f5b16ac5b', 'partnership', 'info',
  'Unitree H2: NVIDIA Isaac GR00T 공식 레퍼런스 플랫폼 선정',
  'NVIDIA가 Unitree H2를 Isaac GR00T 레퍼런스 휴머노이드 로봇 플랫폼으로 공식 선정. Jetson Thor(Blackwell GPU) 탑재, 온디바이스 AI 추론 지원. 학술 연구용 오픈 레퍼런스 설계 공개.',
  '{"source": "NVIDIA Newsroom, CNBC", "date": "2026-06-01", "reliability": "A", "partner": "NVIDIA", "focus": "Isaac GR00T reference platform, Jetson Thor"}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '6de531f2-2078-4903-b537-1a6f5b16ac5b'
  AND type = 'partnership'
  AND title LIKE '%NVIDIA Isaac GR00T%'
);

-- [B] Agility Robotics Digit - Mercado Libre & Toyota 파트너십
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'partnership', 'warning',
  'Agility Digit: Mercado Libre & Toyota Canada 상용 계약 체결, GXO 실배치',
  'Digit이 Mercado Libre(라틴아메리카 최대 전자상거래) 텍사스 물류센터에 상용 계약 체결. Toyota Motor Manufacturing Canada에도 상용 생산 환경 배포 계약. GXO Logistics 창고에서 실제 토트 핸들링 작업 수행 중.',
  '{"source": "Robotics247, AgilityRobotics.com", "date": "2026", "reliability": "B", "details": {"partners": ["Mercado Libre", "Toyota Canada", "GXO Logistics"], "mercado_libre_location": "San Antonio, TX", "gxo_task": "tote movement"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'partnership'
  AND title LIKE '%Mercado Libre%Toyota%'
);

-- [B] 1X Technologies NEO - 미국 공장 개소, 생산 완판
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'mass_production', 'warning',
  '1X Technologies NEO: 미국 Hayward 공장 개소, 초년 생산분 5일 만에 완판',
  '캘리포니아 Hayward에 58,000sqft 미국 첫 수직통합 휴머노이드 공장 오픈. 초년 10,000대 생산 목표. 2025년 10월 사전주문 개시 후 5일 만에 완판. 가격 $20,000 또는 $499/월 렌탈. 2027년까지 100,000대 목표.',
  '{"source": "TechFundingNews, Sifted, TechCrunch", "date": "2026", "reliability": "A", "details": {"factory_location": "Hayward, CA", "factory_size": "58000 sqft", "year1_capacity": 10000, "sold_out_in_days": 5, "price": "$20,000", "rental": "$499/month", "2027_target": 100000}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'mass_production'
  AND title LIKE '%Hayward%완판%'
);

-- [B] 1X NEO - EQT 포트폴리오 10,000대 배포 계약
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'partnership', 'warning',
  '1X NEO: EQT 포트폴리오 300+ 기업에 10,000대 공급 계약 (2026-2030)',
  'EQT 벤처스와 전략 계약 체결. 2026-2030년간 EQT 포트폴리오 300+ 기업에 최대 10,000대 NEO 공급. 제조/물류/창고 중심. OpenAI 스타트업 펀드, Tiger Global 등에서 총 $130M+ 투자.',
  '{"source": "TechCrunch, InterestingEngineering", "date": "2025-12", "reliability": "B", "details": {"partner": "EQT Ventures", "units": 10000, "period": "2026-2030", "portfolio_companies": "300+", "sectors": ["manufacturing", "warehousing", "logistics"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'partnership'
  AND title LIKE '%EQT%10,000대%'
);

-- [A] AGIBOT - 10,000대 생산 달성, 글로벌 확장
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'critical',
  'AGIBOT: 누적 10,000대 생산 달성 (2026.3.30), 글로벌 6대륙 배포 중',
  '2026년 3월 30일 누적 10,000대 생산. 5,000→10,000대를 3개월 만에 달성(4배 가속). Expedition A3 주력. 독일 Minth Group, 싱가포르 Singtel과 해외 진출. 홍콩 IPO 2026 Q3 목표.',
  '{"source": "TechTimes, Gasgoo", "date": "2026-03-30", "reliability": "A", "details": {"total_units": 10000, "acceleration": "4x", "main_model": "Expedition A3", "global_partners": ["Minth Group (Germany)", "Singtel (Singapore)"], "ipo_target": "2026-Q3 Hong Kong", "investors": ["LG Electronics", "Mirae Asset", "BYD", "Hillhouse"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
LIMIT 1;

-- Fallback: if no X1 robot found, try to find any Agibot robot
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'critical',
  'AGIBOT: 누적 10,000대 생산 달성 (2026.3.30), 글로벌 6대륙 배포 중',
  '2026년 3월 30일 누적 10,000대 생산. 5,000→10,000대를 3개월 만에 달성(4배 가속). Expedition A3 주력. 독일 Minth Group, 싱가포르 Singtel과 해외 진출. 홍콩 IPO 2026 Q3 목표.',
  '{"source": "TechTimes, Gasgoo", "date": "2026-03-30", "reliability": "A", "details": {"total_units": 10000, "acceleration": "4x", "main_model": "Expedition A3", "global_partners": ["Minth Group (Germany)", "Singtel (Singapore)"], "ipo_target": "2026-Q3 Hong Kong", "investors": ["LG Electronics", "Mirae Asset", "BYD", "Hillhouse"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'mass_production' AND title LIKE '%AGIBOT%10,000대%'
)
LIMIT 1;

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스)
-- =====================================================

-- Tesla Optimus - Fremont 공장 전환
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Is Turning Its Model S Line Into an Optimus Robot Factory: Gen 3 Targets a 2026 Production Start',
  'TechTimes',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09'::timestamp,
  'Tesla가 Fremont Model S/X 라인을 Optimus Gen 3 생산용으로 전환. 2026년 1월 파일럿 생산 시작, 하반기 본격 양산. 초기 연 100만대 능력, Texas에 1000만대 규모 2세대 라인 계획.',
  'Tesla는 Fremont 공장의 Model S/X 생산을 중단하고 Optimus Gen 3 휴머노이드 로봇 전용 공장으로 전환 중이다. 2026년 1월 21일 파일럿 생산이 시작되었으며, 7-8월 본격 양산을 목표로 한다. Elon Musk는 Optimus의 10,000개 이상의 고유 부품과 완전히 새로운 생산 라인으로 인해 초기 산출량은 매우 느릴 것이라 경고했다. 소비자 판매는 2027년 말 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('tesla-optimus-fremont-2026-06-09')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus Gen 3"], "technologies": ["humanoid manufacturing", "pilot production"], "marketInsights": ["Fremont to robot factory conversion", "1M/year initial capacity"], "keyPoints": ["파일럿 생산 2026.1.21 시작", "본격 양산 2026 하반기", "Texas 1000만대 규모 계획"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-fremont-2026-06-09')::bytea), 'hex'));

-- Boston Dynamics Atlas CES 2026
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Boston Dynamics Unveils New Atlas Robot to Revolutionize Industry at CES 2026',
  'Boston Dynamics',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  '2026-01-07'::timestamp,
  'Boston Dynamics가 CES 2026에서 상용 Atlas를 공개. 완전 전기식, 56 DoF, 자동 배터리 교체, 110lbs 페이로드. Hyundai/Google DeepMind 초기 배포. 연 30,000대 공장 건설 중.',
  'Boston Dynamics는 CES 2026에서 산업용 상용 Atlas를 공개했다. 전기 구동 방식으로 전환된 Atlas는 56개 자유도, 자율 배터리 교체 기능, 110파운드 적재 능력을 갖추었다. 촉각 센싱이 가능한 인간 규모의 손과 360도 카메라를 탑재. 2026년 배포분은 전량 예약 완료. Hyundai Motor Group과 연 30,000대 규모 공장을 건설 중이며 Metaplant에 2028년 배치 예정.',
  'ko', 'product', 'robot',
  encode(sha256(('bd-atlas-ces-2026-01-07')::bytea), 'hex'),
  '7c7e540d-e4ec-4734-920b-875f20989c0a',
  '{"mentionedCompanies": ["Boston Dynamics", "Hyundai", "Google DeepMind"], "mentionedRobots": ["Atlas Electric"], "technologies": ["electric actuation", "self-swap battery", "tactile sensing"], "marketInsights": ["30K units/year factory", "2026 fully reserved"], "keyPoints": ["CES 2026 Best Robot 수상", "56 DoF 완전 전기식", "Hyundai Metaplant 2028 배치"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('bd-atlas-ces-2026-01-07')::bytea), 'hex'));

-- Figure AI Series C
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure Exceeds $1B in Series C Funding at $39B Post-Money Valuation',
  'Figure AI / PRNewswire',
  'https://www.figure.ai/news/series-c',
  '2025-09-15'::timestamp,
  'Figure AI가 Series C에서 $1B 이상 조달, $39B 밸류에이션 달성. Parkway VC 리드, NVIDIA/Microsoft/OpenAI/Bezos 참여. 18개월 만에 15배 밸류에이션 상승.',
  'Figure AI는 Parkway Venture Capital 리드, NVIDIA, Intel Capital, Microsoft, OpenAI Startup Fund, Jeff Bezos 등이 참여한 Series C 라운드에서 $1B 이상을 조달하고 $39B 포스트머니 밸류에이션을 달성했다. 2024년 2월 $2.6B 밸류에이션의 Series B 대비 18개월 만에 15배 상승. 누적 조달 $1.9B.',
  'ko', 'industry', 'robot',
  encode(sha256(('figure-ai-series-c-2025-09')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "NVIDIA", "Microsoft", "OpenAI", "Intel"], "mentionedRobots": ["Figure 03"], "technologies": [], "marketInsights": ["$39B valuation", "$1.9B total raised", "15x valuation in 18 months"], "keyPoints": ["Series C $1B+", "$39B 밸류에이션", "역대 최대 휴머노이드 기업 밸류"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-ai-series-c-2025-09')::bytea), 'hex'));

-- Apptronik $520M
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik raises $520M at $5B valuation to ramp up Apollo production',
  'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'::timestamp,
  'Apptronik이 Series A 연장으로 $520M 추가 조달. 총 Series A $935M, 밸류에이션 $5.3B. Mercedes-Benz/GXO/Jabil/Google DeepMind 파트너십.',
  'Apptronik이 2026년 2월 Series A 연장으로 $520M을 추가 조달하여 총 Series A $935M, 누적 약 $1B을 달성했다. 포스트머니 밸류에이션 $5.3B. 자금은 Apollo 양산, 글로벌 상용/파일럿 배포 확대, 로봇 트레이닝/데이터 수집 시설 건설, 2026년 신규 로봇 개발에 투입. Mercedes-Benz, GXO, Jabil과 파일럿, Google DeepMind Gemini Robotics와 전략 파트너십.',
  'ko', 'industry', 'robot',
  encode(sha256(('apptronik-520m-2026-02-11')::bytea), 'hex'),
  '2b53d7b2-ddfe-45bd-8e21-f545d3566f4d',
  '{"mentionedCompanies": ["Apptronik", "Mercedes-Benz", "GXO", "Jabil", "Google DeepMind"], "mentionedRobots": ["Apollo"], "technologies": ["Gemini Robotics"], "marketInsights": ["$5.3B valuation", "total ~$1B raised"], "keyPoints": ["$520M 추가 조달", "총 $935M Series A", "Google DeepMind Gemini 파트너십"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-520m-2026-02-11')::bytea), 'hex'));

-- Unitree IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree Robotics files for $610M IPO on Shanghai STAR Market',
  'CNBC / KrAsia',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  '2026-06-01'::timestamp,
  'Unitree가 상해 STAR Market에 42억위안($610M) IPO 신청. 2025년 매출 335% 성장, 글로벌 유일 흑자 휴머노이드 기업. NVIDIA Isaac GR00T 레퍼런스 선정.',
  'Unitree Robotics가 상해 STAR Market에 42억위안($610M) IPO를 신청했다. 2025년 매출 17.1억위안(YoY 335%), 순이익 6억위안(8배 증가). 5,500대 휴머노이드 출하(글로벌 1위). 2026년 6월 1일 IPO 심사. NVIDIA가 Unitree H2를 Isaac GR00T 레퍼런스 플랫폼으로 선정, Jetson Thor 탑재. H2 외에도 R1-D 듀얼암 로봇(26,900위안) 출시.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-ipo-star-2026-06')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "NVIDIA"], "mentionedRobots": ["H2", "G1", "R1-D"], "technologies": ["Isaac GR00T", "Jetson Thor"], "marketInsights": ["$610M IPO", "335% YoY growth", "only profitable humanoid company"], "keyPoints": ["STAR Market IPO 심사 2026.6.1", "글로벌 유일 흑자", "NVIDIA 레퍼런스 선정"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-ipo-star-2026-06')::bytea), 'hex'));

-- Agility Digit deployments
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Robotics Digit: Mercado Libre, Toyota Canada, GXO 상용 계약 확대',
  'Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  '2026-05-01'::timestamp,
  'Digit이 Mercado Libre 텍사스 물류센터, Toyota Canada 생산 공장, GXO 창고에 상용 계약 체결. OTA 소프트웨어 업데이트로 작업 라이브러리 확대 중.',
  'Agility Robotics의 Digit 휴머노이드 로봇이 Mercado Libre 텍사스 물류센터에 상용 계약을 체결했다. Toyota Motor Manufacturing Canada와도 상용 생산 환경 배포 계약을 맺었다. GXO Logistics 창고에서는 이미 인간 직원과 함께 토트 이동 작업을 수행 중. Agility Arc 플랫폼을 통한 OTA 업데이트로 지속적으로 조작 기술이 확대되고 있으며, 기능 안전 인증은 18개월 내 완료 예정.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-digit-mercado-toyota-2026')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "Mercado Libre", "Toyota Canada", "GXO Logistics", "Amazon"], "mentionedRobots": ["Digit"], "technologies": ["Agility Arc", "OTA updates"], "marketInsights": ["multi-customer commercial deals", "functional safety cert in 18mo"], "keyPoints": ["Mercado Libre 텍사스 계약", "Toyota Canada 상용 배포", "기능 안전 인증 18개월 내"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-mercado-toyota-2026')::bytea), 'hex'));

-- 1X NEO factory
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X Technologies: 미국 첫 수직통합 휴머노이드 공장 개소, NEO 초년 생산분 완판',
  'TechFundingNews / Sifted',
  'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
  '2026-03-01'::timestamp,
  '1X Technologies가 캘리포니아 Hayward에 미국 첫 수직통합 휴머노이드 공장 개소. 초년 10,000대, 2027년 100,000대 목표. 사전주문 5일 만에 완판.',
  '노르웨이 기반 1X Technologies가 캘리포니아 Hayward에 58,000sqft 규모 미국 첫 수직통합 휴머노이드 로봇 제조 시설을 개소했다. 초년 10,000대 생산, 2027년까지 100,000대 목표. 2025년 10월 사전주문 개시 5일 만에 전량 완판. 가격 $20,000 또는 $499/월 렌탈(6개월 최소). EQT 포트폴리오 300+ 기업에 2026-2030년 10,000대 공급 계약.',
  'ko', 'industry', 'robot',
  encode(sha256(('1x-neo-hayward-factory-2026')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies", "EQT Ventures", "OpenAI"], "mentionedRobots": ["NEO"], "technologies": ["vertical integration"], "marketInsights": ["$20K price point", "sold out in 5 days", "100K target by 2027"], "keyPoints": ["미국 첫 수직통합 공장", "초년 10K대 완판", "EQT 10K대 계약"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-hayward-factory-2026')::bytea), 'hex'));

-- AGIBOT 10K milestone
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT 누적 10,000대 생산 달성, 중국 휴머노이드 시장 Unitree와 양강 구도',
  'TechTimes',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-06-02'::timestamp,
  'AGIBOT이 2026년 3월 30일 누적 10,000대 생산 달성. 5K→10K를 3개월 만에 달성(4배 가속). 홍콩 IPO Q3 목표. LG전자/미래에셋/BYD/힐하우스 투자.',
  'AGIBOT(智元机器人)이 2026년 3월 30일 누적 10,000대 로봇 생산을 달성했다. 5,000대에서 10,000대까지 3개월 만에 달성하며 처리량이 4배 가속되었다. Expedition A3가 주력 배포 모델. 독일 Minth Group과 유럽 자동차 부품 생산 라인, 싱가포르 Singtel Enterprise와 동남아 거점 확보. LG Electronics, Mirae Asset, BYD, Hillhouse Investment로부터 전략 투자 유치. 홍콩 IPO 2026년 Q3 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-10k-milestone-2026-06')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Unitree", "LG Electronics", "BYD", "Minth Group", "Singtel"], "mentionedRobots": ["Expedition A3", "Yuanzheng A2", "Lingxi X2", "Kuto D1"], "technologies": ["embodied AI supply chain"], "marketInsights": ["10K units produced", "4x throughput acceleration", "HK IPO Q3 2026"], "keyPoints": ["누적 10,000대 생산", "LG전자 전략 투자 참여", "홍콩 IPO Q3 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-10k-milestone-2026-06')::bytea), 'hex'));

-- Humanoid robot safety standards 2026
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  '2026 휴머노이드 로봇 안전 규격 동향: ISO 10218:2025 개정, ISO 25785-1 개발 중',
  'TheresARobotForThat / ISO',
  'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
  '2026-05-15'::timestamp,
  'ISO 10218:2025 개정으로 하드웨어→응용 인증 전환. ISO 25785-1 보행 로봇 전용 규격 2026-2027 개발 중. 낙상 구역, 배터리 안전 등 휴머노이드 고유 리스크 반영.',
  'ISO 10218-1:2025가 대폭 개정되어 하드웨어 정의에서 협력 응용 인증으로 안전 초점이 전환되었다. 안전 요구사항 섹션이 28→50페이지로 확대. ISO 25785-1은 "보행 로봇" 고유 리스크(낙상 구역 계산, 에너지 밀도 배터리 등)를 다루는 신규 표준으로 2026-2027 Working Draft 단계. OSHA General Duty Clause도 적용. ISO 13482는 비산업용 개인 서비스 로봇에 적용.',
  'ko', 'technology', 'robot',
  encode(sha256(('humanoid-safety-iso-2026')::bytea), 'hex'),
  '{"mentionedCompanies": [], "mentionedRobots": [], "technologies": ["ISO 10218:2025", "ISO 25785-1", "ISO 13482", "OSHA"], "marketInsights": ["application certification shift", "walking robot specific standards"], "keyPoints": ["ISO 10218:2025 대폭 개정", "ISO 25785-1 보행로봇 규격 개발", "낙상/배터리 고유 리스크 반영"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('humanoid-safety-iso-2026')::bytea), 'hex'));

-- Unitree G1 - Haneda Airport deployment
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree G1: 일본 하네다 공항 수하물 처리 상용 배포 (JAL, GMO 파트너십)',
  'Yahoo Tech / Automate.org',
  'https://www.automate.org/robotics/industry-insights/unitrees-55-pound-humanoid-costs-6-000-can-cartwheel',
  '2026-04-01'::timestamp,
  'Unitree G1이 도쿄 하네다 공항에 수하물/화물 처리용으로 상용 배포. Japan Airlines, GMO Internet Group과 파트너십. 2028년까지 시범 운영. 휴머노이드 최초 공항 상용 배포.',
  'Unitree G1이 도쿄 하네다 공항에서 수하물 및 화물 처리 업무에 투입되었다. Japan Airlines(JAL)와 GMO Internet Group과의 파트너십을 통해 배포되었으며, 2028년까지 시범 운영 예정이다. 이는 휴머노이드 로봇의 최초 상용 공항 배포 사례로, UnifoLM-VLA-0(오픈소스 VLA 모델)로 자연어 명령 기반 자율 작업이 가능하다.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-g1-haneda-airport-2026')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Japan Airlines", "GMO Internet Group"], "mentionedRobots": ["G1"], "technologies": ["UnifoLM-VLA-0", "natural language commands"], "marketInsights": ["first humanoid airport deployment", "aviation logistics use case"], "keyPoints": ["하네다 공항 최초 휴머노이드 배포", "JAL/GMO 파트너십", "VLA 모델 기반 자율 작업"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-g1-haneda-airport-2026')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열에 추가)
-- =====================================================

-- Tesla Optimus stage update
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus-gen3", "updates": [{"field": "stage", "new_value": "pilot", "source": "TechTimes 2026-06-09", "reliability": "A", "note": "Fremont 파일럿 생산 중, 2026 H2 본격 양산 예정"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'optimus-gen3' AND created_at::date = CURRENT_DATE);

-- BD Atlas stage update
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "atlas-commercial", "updates": [{"field": "stage", "new_value": "commercial", "source": "BostonDynamics.com CES 2026", "reliability": "A", "note": "CES 2026 상용 공개, 2026년 전량 예약 완료"}, {"field": "partnership", "new_value": "Google DeepMind Foundation Model 통합", "source": "BostonDynamics.com", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'atlas-commercial' AND created_at::date = CURRENT_DATE);

-- Figure 03 updates
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "deployment", "new_value": "BMW Spartanburg 40대 배포", "source": "CNBC, ThomasNet", "reliability": "A"}, {"field": "valuation", "new_value": "$39B (Series C)", "source": "Figure.ai, PRNewswire", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'figure-03' AND created_at::date = CURRENT_DATE);

-- Apptronik Apollo updates
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "funding", "new_value": "총 $935M (Series A), $5.3B 밸류에이션", "source": "CNBC 2026-02-11", "reliability": "A"}, {"field": "partnership", "new_value": "Google DeepMind Gemini Robotics 통합", "source": "CNBC, TheRobotReport", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'apollo' AND created_at::date = CURRENT_DATE);

-- Unitree IPO
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-h1", "updates": [{"field": "ipo", "new_value": "상해 STAR Market IPO $610M 신청 (2026.6.1 심사)", "source": "CNBC, KrAsia", "reliability": "A"}, {"field": "revenue", "new_value": "2025년 17.1억위안 (YoY 335%)", "source": "KrAsia", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'unitree-h1' AND created_at::date = CURRENT_DATE);

-- 1X NEO
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "production", "new_value": "Hayward 공장 10K/년, 초년 완판, 2027년 100K 목표", "source": "TechFundingNews, Sifted", "reliability": "A"}, {"field": "partnership", "new_value": "EQT 300+ 기업 10,000대 공급계약 (2026-2030)", "source": "TechCrunch", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'neo' AND created_at::date = CURRENT_DATE);

-- AGIBOT
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot-x1", "updates": [{"field": "production", "new_value": "누적 10,000대 생산 (2026.3.30), 4배 가속", "source": "TechTimes", "reliability": "A"}, {"field": "ipo", "new_value": "홍콩 IPO 2026 Q3 목표", "source": "Capital.com, TechTimes", "reliability": "B"}, {"field": "partnership", "new_value": "독일 Minth Group, 싱가포르 Singtel Enterprise", "source": "Gasgoo", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'agibot-x1' AND created_at::date = CURRENT_DATE);

-- Agility Digit
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "partnership", "new_value": "Mercado Libre TX, Toyota Canada, GXO 상용계약", "source": "Robotics247, AgilityRobotics.com", "reliability": "B"}, {"field": "certification", "new_value": "기능 안전 인증 18개월 내 완료 목표", "source": "AgilityRobotics.com", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'digit' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림)
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TechTimes', 'https://www.techtimes.com/articles/318071/20260609/', 'Tesla Fremont 공장 Optimus Gen 3 전용 전환', 'Model S/X 라인 → 로봇 전용. 파일럿 2026.1, 본격 양산 2026 H2. Texas 1000만대 라인 계획.'),
  ('Boston Dynamics', 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/', 'Atlas 상용 버전 CES 2026 공개, 전량 예약 완료', '56 DoF 전기식, 자동 배터리 교체, Google DeepMind 파트너십, 30K/년 공장 건설.'),
  ('CNBC/Figure AI', 'https://www.figure.ai/news/series-c', 'Figure AI Series C $1B+, $39B 밸류에이션', 'Parkway VC 리드. Figure 03 BMW 40대 배포, 백악관 시연.'),
  ('CNBC', 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html', 'Apptronik $520M 추가 조달, 총 $935M Series A', 'Google DeepMind Gemini Robotics 통합. Mercedes/GXO/Jabil 파일럿 확대.'),
  ('CNBC/KrAsia', 'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html', 'Unitree STAR Market IPO $610M 신청', '2025년 매출 335% 성장, 5,500대 출하. NVIDIA Isaac GR00T 레퍼런스 선정.'),
  ('TechFundingNews', 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/', '1X NEO 미국 공장 개소, 초년 생산 완판', 'Hayward 58K sqft 공장. $20K/대, $499/월 렌탈. EQT 10K대 계약.'),
  ('TechTimes', 'https://www.techtimes.com/articles/317632/20260602/', 'AGIBOT 10,000대 생산 달성, HK IPO 준비', '3개월 만에 5K→10K. LG전자/BYD/미래에셋 투자. 유럽/동남아 확장.'),
  ('Robotics247', 'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre', 'Agility Digit: Mercado Libre, Toyota Canada 상용 계약', 'GXO 실배치 중. 기능 안전 인증 18개월 내. OTA 작업 확장.'),
  ('ISO/TheresARobotForThat', 'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/', 'ISO 10218:2025 개정, ISO 25785-1 보행로봇 규격 개발', '하드웨어→응용 인증 전환. 보행로봇 낙상/배터리 고유 리스크 규격 2026-2027.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
