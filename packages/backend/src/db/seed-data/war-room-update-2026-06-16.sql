--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-16
-- 수집 시점: 2026-06-16, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인
--

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 인텔리전스
-- =====================================================

-- [A] Figure 03 - BotQ 생산 속도 1대/시간 달성, 350대+ 생산
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'mass_production', 'critical',
  'Figure 03: BotQ 공장 생산 속도 1대/시간 달성 (4개월 만에 일 1대→시간 1대), 누적 350대+',
  'Figure AI가 BotQ 제조시설에서 Figure 03 생산 속도를 4개월 만에 1대/일에서 1대/시간으로 향상. 누적 350대 이상 생산. 150+ 워크스테이션 전용 제조 소프트웨어, 초회 수율 80% 이상 달성. BMW Leipzig 확장 배포 진행.',
  '{"source": "Figure.ai, TheAIInsider", "date": "2026-05-01", "reliability": "A", "details": {"production_rate": "1 unit/hour", "ramp_period": "4 months", "total_produced": "350+", "first_pass_yield": ">80%", "workstations": "150+", "bmw_expansion": "Leipzig, Germany"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'mass_production'
  AND title LIKE '%BotQ%1대/시간%'
);

-- [A] Figure 03 - System 0 AI: 계단/비정형 지형 자율 보행
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'partnership', 'info',
  'Figure 03: System 0 AI 모델, 계단/경사로/비정형 지형 자율 보행 달성 (Perception-Conditioned Whole-Body Control)',
  'Figure AI의 System 0 AI 모델에 perception-conditioned whole-body control 기능 추가. 온보드 스테레오 카메라만으로 계단, 경사로, 비정형 지형을 task-specific 프로그래밍 없이 자율 보행. 범용 이동성 확보.',
  '{"source": "Figure.ai, ForgeGlobal", "date": "2026-05", "reliability": "A", "details": {"ai_model": "System 0", "capability": "perception-conditioned whole-body control", "terrain": ["stairs", "ramps", "uneven terrain"], "sensor": "onboard stereo camera", "programming": "no task-specific programming required"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND title LIKE '%System 0%계단%'
);

-- [A] Apptronik Apollo - 신규 투자자 AT&T/John Deere/카타르, 신규 로봇 2026 데뷔 예정
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'partnership', 'warning',
  'Apptronik: AT&T Ventures, John Deere, 카타르 투자청 신규 참여 + 2026년 신규 로봇 공개 예정',
  '$520M Series A 연장에 AT&T Ventures, John Deere, 카타르투자청(QIA) 신규 참여. 기존 B Capital, Google, Mercedes-Benz, PEAK6 외 산업 다각화. 2026년 신규 로봇 데뷔 예정. 2027년 $1B 주문 목표, 대당 약 $80,000/년 가격.',
  '{"source": "CNBC, SiliconAngle, InterestingEngineering", "date": "2026-02", "reliability": "A", "details": {"new_investors": ["AT&T Ventures", "John Deere", "Qatar Investment Authority"], "new_robot_debut": "2026", "2027_order_target": "$1B", "price_per_unit": "$80,000/year", "use_cases": ["agriculture", "telecom", "sovereign wealth"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'partnership'
  AND title LIKE '%AT&T%John Deere%카타르%'
);

-- [A] 1X NEO - NVIDIA Jetson Thor 탑재, 텔레오퍼레이션 선행 학습 전략
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'partnership', 'info',
  '1X NEO: NVIDIA Jetson Thor(NEO Cortex) 탑재 확정, 텔레오퍼레이션 우선 학습 전략',
  'NEO 생산 라인의 모든 로봇에 NVIDIA Jetson Thor를 NEO Cortex(두뇌)로 탑재. 첫 배치는 텔레오퍼레이션으로 부분 제어하며 다양한 가정환경 데이터를 수집, AI 학습에 활용. 2026년 4월 30일 본격 생산 개시.',
  '{"source": "GlobeNewsWire, Notebookcheck, eWeek", "date": "2026-04-30", "reliability": "A", "details": {"soc": "NVIDIA Jetson Thor", "brain_name": "NEO Cortex", "initial_control": "teleoperation-first", "production_start": "2026-04-30", "data_strategy": "real-world home environment data collection"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND title LIKE '%Jetson Thor%텔레오퍼레이션%'
);

-- [A] Tesla Optimus - 제조 원가 >$60K/대 (2026 H2 기준), Gen 3 양산 설계 최초 모델
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'mass_production', 'info',
  'Tesla Optimus Gen 3: 양산 설계 최초 모델, H2 2026 제조 원가 >$60K/대 (10K대 미만)',
  'Optimus Gen 3는 양산을 목표로 설계된 최초의 버전. 10,000개 고유 부품으로 인해 2026 하반기 생산량이 10,000대 미만 시 대당 제조원가 $60,000 이상. Musk는 생산 속도가 "문자 그대로 예측 불가"라고 경고.',
  '{"source": "Optimusk.blog, Robozaps, eWeek", "date": "2026-06", "reliability": "B", "details": {"gen3_purpose": "first design for mass production", "unique_parts": 10000, "h2_2026_cost": ">$60K/unit", "h2_2026_volume": "<10K units", "musk_quote": "literally impossible to predict production rate"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND title LIKE '%제조 원가%$60K%'
);

-- [B] AGIBOT - CES 2026 미국 진출 + "1체3지" 풀스택 아키텍처 + 4종 신규 플랫폼
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'warning',
  'AGIBOT: CES 2026 미국 시장 데뷔 + 2026 파트너 컨퍼런스에서 "1체3지" 아키텍처 및 4종 신규 플랫폼 공개',
  'AGIBOT이 CES 2026에서 미국 시장에 공식 진출, 전체 휴머노이드 포트폴리오 시연. 2026년 4월 파트너 컨퍼런스에서 "One Robotic Body, Three Intelligences(1체3지)" 풀스택 아키텍처와 4종 신규 로봇 플랫폼을 공개. TrendForce: Unitree와 함께 중국 시장 80% 점유 전망.',
  '{"source": "PRNewswire, IntelligentCIO, TrendForce", "date": "2026-04", "reliability": "B", "details": {"us_debut": "CES 2026", "architecture": "One Robotic Body Three Intelligences", "new_platforms": 4, "china_market_share": "~80% (with Unitree)", "china_output_growth_2026": "94% YoY", "partners": ["BYD", "SAIC Motor", "Hillhouse Capital"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%agibot%' AND hr.name ILIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE title LIKE '%AGIBOT%CES 2026%1체3지%'
)
LIMIT 1;

-- Fallback if no X1 found
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'warning',
  'AGIBOT: CES 2026 미국 시장 데뷔 + 2026 파트너 컨퍼런스에서 "1체3지" 아키텍처 및 4종 신규 플랫폼 공개',
  'AGIBOT이 CES 2026에서 미국 시장에 공식 진출, 전체 휴머노이드 포트폴리오 시연. 2026년 4월 파트너 컨퍼런스에서 "One Robotic Body, Three Intelligences(1체3지)" 풀스택 아키텍처와 4종 신규 로봇 플랫폼을 공개. TrendForce: Unitree와 함께 중국 시장 80% 점유 전망.',
  '{"source": "PRNewswire, IntelligentCIO, TrendForce", "date": "2026-04", "reliability": "B", "details": {"us_debut": "CES 2026", "architecture": "One Robotic Body Three Intelligences", "new_platforms": 4, "china_market_share": "~80% (with Unitree)", "china_output_growth_2026": "94% YoY"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%agibot%'
AND NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title LIKE '%AGIBOT%CES 2026%1체3지%')
LIMIT 1;

-- [B] Agility Digit - TMMC RaaS 계약 상세: 7대 배정, 3대 선행 배포
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'partnership', 'info',
  'Agility Digit × TMMC: RaaS 모델 상용 계약 상세 (7대 배정, 3대 선행 배포)',
  'Toyota Motor Manufacturing Canada와 Robots-as-a-Service 모델로 상용 계약 체결. 총 7대 배정, 3대부터 선행 배포 시작. 제조/공급망/물류 운영 지원. Agility 총 자금 $400M Series C 기반 10,000대 생산 마일스톤 추진.',
  '{"source": "AgilityRobotics.com, GlobalNews.ca, Digitimes", "date": "2026-02", "reliability": "A", "details": {"model": "Robots-as-a-Service", "total_allocated": 7, "initial_deployment": 3, "tasks": ["manufacturing", "supply chain", "logistics"], "series_c": "$400M", "production_target": "10,000 units"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND title LIKE '%TMMC%RaaS%7대%'
);

-- [B] 중국 휴머노이드 시장 2026 전망: 산출량 94% 증가 (TrendForce)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'warning',
  '[시장] 중국 휴머노이드 산출량 2026년 94% 증가 전망, Unitree+AGIBOT 80% 점유',
  'TrendForce 보고서: 중국 휴머노이드 로봇 산출량 2026년 94% YoY 증가 전망. Unitree Robotics와 AGIBOT이 전체 출하량의 약 80%를 점유할 전망. 중국 정부 로봇 산업 지원 정책과 저가 모델 확산이 성장 동력.',
  '{"source": "TrendForce", "date": "2026-04-09", "reliability": "A", "details": {"growth": "94% YoY", "leaders": ["Unitree", "AGIBOT"], "combined_share": "~80%", "drivers": ["government policy", "low-cost models"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%중국 휴머노이드 산출량%94%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 6/16 신규 수집
-- =====================================================

-- Figure AI BotQ 생산 램프
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI Ramps Up Production to One Humanoid Robot Per Hour at BotQ Facility',
  'TheAIInsider',
  'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
  '2026-05-01'::timestamp,
  'Figure AI가 BotQ 시설에서 Figure 03 생산 속도를 4개월 만에 1대/일→1대/시간으로 향상. 350대+ 생산, 초회 수율 80% 이상. 150+ 워크스테이션 전용 제조 소프트웨어 운용.',
  'Figure AI는 BotQ 제조시설에서 Figure 03 휴머노이드 로봇 생산 속도를 4개월 만에 하루 1대에서 시간당 1대로 향상시켰다. 현재까지 350대 이상을 생산했으며, 전용 조립 라인과 150개 이상의 워크스테이션에 자체 제조 소프트웨어를 배치하여 초회 수율 80% 이상을 달성했다. BMW Spartanburg 배포에 이어 Leipzig(독일)로 확장 중.',
  'ko', 'industry', 'robot',
  encode(sha256(('figure-botq-1hr-ramp-2026-05')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03"], "technologies": ["BotQ manufacturing", "custom MES software"], "marketInsights": ["1 robot/hour production rate", "350+ units produced", ">80% first-pass yield"], "keyPoints": ["생산 속도 1대/시간 달성", "BotQ 시설 350대+ 생산", "BMW Leipzig 확장"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-botq-1hr-ramp-2026-05')::bytea), 'hex'));

-- Apptronik 신규 투자자 & 신규 로봇
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik $520M 라운드에 AT&T Ventures, John Deere, 카타르투자청 신규 참여; 2026년 신규 로봇 데뷔 예정',
  'InterestingEngineering / SiliconAngle',
  'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
  '2026-02-11'::timestamp,
  '$520M Series A 연장에 AT&T Ventures, John Deere, 카타르투자청(QIA) 신규 참여. 농업/통신/국부펀드 영역으로 투자자 다각화. 2026년 신규 로봇 데뷔 예정, 2027년 $1B 주문 목표.',
  'Apptronik의 $520M Series A 연장에 기존 B Capital, Google, Mercedes-Benz, PEAK6 외에 AT&T Ventures, John Deere, Qatar Investment Authority가 신규 참여했다. 이는 통신(AT&T), 농업/건설장비(John Deere), 국부펀드(QIA) 등으로 투자자 기반이 다각화됨을 보여준다. 자금은 Apollo 양산 램프, 로봇 트레이닝 시설 구축, 2026년 신규 로봇 개발에 투입. 2027년 $1B 주문 예상, 대당 약 $80,000/년 가격 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('apptronik-att-deere-qatar-2026-02')::bytea), 'hex'),
  '2b53d7b2-ddfe-45bd-8e21-f545d3566f4d',
  '{"mentionedCompanies": ["Apptronik", "AT&T Ventures", "John Deere", "Qatar Investment Authority", "Google", "Mercedes-Benz"], "mentionedRobots": ["Apollo"], "technologies": ["Gemini Robotics"], "marketInsights": ["investor diversification to agriculture/telecom/sovereign", "$1B orders expected 2027", "$80K/year pricing"], "keyPoints": ["AT&T/John Deere/QIA 신규 참여", "2026 신규 로봇 데뷔 예정", "2027 $1B 주문 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-att-deere-qatar-2026-02')::bytea), 'hex'));

-- 1X NEO Jetson Thor & 생산 개시
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X Opens NEO Factory: NVIDIA Jetson Thor 탑재, 텔레오퍼레이션 선행 학습 전략으로 소비자 출하 준비',
  'GlobeNewsWire / Notebookcheck',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '2026-04-30'::timestamp,
  '1X Technologies NEO Factory 2026.4.30 본격 생산 개시. 모든 NEO에 NVIDIA Jetson Thor(NEO Cortex) 탑재. 첫 배치는 텔레오퍼레이션으로 부분 제어하며 가정환경 AI 학습 데이터 수집. 2026년 말 소비자 출하 예정.',
  '1X Technologies가 2026년 4월 30일 캘리포니아 Hayward NEO Factory에서 본격 생산을 개시했다. 생산 라인의 모든 NEO 로봇에 NVIDIA Jetson Thor를 NEO Cortex(두뇌)로 탑재. 키 165cm, 무게 30kg, 적재 70kg, 운반 25kg. 첫 배치 로봇은 텔레오퍼레이션을 통해 부분 제어되며, 이를 통해 다양한 실제 가정환경 데이터를 수집하여 AI 학습에 활용하는 전략을 채택. 2026년 말 미국 첫 소비자 출하 예정.',
  'ko', 'technology', 'robot',
  encode(sha256(('1x-neo-jetson-thor-production-2026-04')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies", "NVIDIA"], "mentionedRobots": ["NEO"], "technologies": ["NVIDIA Jetson Thor", "teleoperation-first learning", "NEO Cortex"], "marketInsights": ["consumer shipments end of 2026", "teleoperation data collection strategy"], "keyPoints": ["Jetson Thor 전 라인 탑재", "텔레오퍼레이션 선행 학습 전략", "2026.4.30 본격 생산 개시"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-jetson-thor-production-2026-04')::bytea), 'hex'));

-- AGIBOT 파트너 컨퍼런스 & 새 아키텍처
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT Unveils "One Robotic Body, Three Intelligences" Architecture and 4 New Platforms at 2026 Partner Conference',
  'PRNewswire',
  'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
  '2026-04-15'::timestamp,
  'AGIBOT이 2026 파트너 컨퍼런스에서 "1체3지(One Robotic Body, Three Intelligences)" 풀스택 아키텍처와 4종 신규 로봇 플랫폼을 공개. Physical AI 대규모 실배포 가속화 선언.',
  'AGIBOT(智元机器人)이 2026년 4월 파트너 컨퍼런스에서 차세대 Embodied AI 전략을 발표했다. "One Robotic Body, Three Intelligences(1체3지)" 풀스택 아키텍처를 중심으로 4종 신규 로봇 플랫폼과 다수의 AI 파운데이션 모델을 공개. BYD, SAIC Motor 등 자동차 공장 자동화와 리셉션/리테일 안내 등 B2C 활용 사례 확대. CES 2026에서 미국 시장 공식 데뷔.',
  'ko', 'product', 'robot',
  encode(sha256(('agibot-1b3i-partner-conf-2026-04')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "BYD", "SAIC Motor"], "mentionedRobots": ["Expedition A3"], "technologies": ["One Robotic Body Three Intelligences", "embodied AI foundation models"], "marketInsights": ["4 new platforms", "US market debut at CES 2026", "B2C expansion"], "keyPoints": ["1체3지 풀스택 아키텍처", "4종 신규 플랫폼 공개", "CES 2026 미국 진출"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-1b3i-partner-conf-2026-04')::bytea), 'hex'));

-- TrendForce 중국 시장 전망
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  'China Humanoid Robot Output to Surge 94% in 2026; Unitree+AGIBOT ~80% Market Share (TrendForce)',
  'TrendForce',
  'https://www.trendforce.com/presscenter/news/20260409-13007.html',
  '2026-04-09'::timestamp,
  'TrendForce: 중국 휴머노이드 로봇 산출량 2026년 94% YoY 증가 전망. Unitree Robotics와 AGIBOT이 출하량 약 80% 점유 예상. 정부 정책과 저가 모델이 성장 동력.',
  'TrendForce 보고서에 따르면 중국 휴머노이드 로봇 산출량이 2026년 94% YoY 증가할 전망이다. Unitree Robotics와 AGIBOT이 전체 출하량의 약 80%를 점유할 것으로 예상된다. 중국 정부의 로봇 산업 지원 정책, G1 등 저가($16K~) 모델 확산, 제조업/물류 자동화 수요 증가가 성장을 견인. Unitree는 IPO 준비, AGIBOT은 홍콩 IPO를 Q3에 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('trendforce-china-humanoid-94pct-2026')::bytea), 'hex'),
  '{"mentionedCompanies": ["Unitree Robotics", "AGIBOT", "TrendForce"], "mentionedRobots": ["G1", "Expedition A3"], "technologies": [], "marketInsights": ["94% YoY output growth", "Unitree+AGIBOT ~80% share", "government policy support"], "keyPoints": ["중국 산출량 94% 증가", "양강 구도 80% 점유", "IPO 경쟁"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('trendforce-china-humanoid-94pct-2026')::bytea), 'hex'));

-- Tesla Optimus Gen 3 원가 분석
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus Gen 3: 양산 설계 최초 모델, H2 2026 제조원가 $60K+ 분석',
  'Optimusk.blog / Robozaps',
  'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
  '2026-06-01'::timestamp,
  'Optimus Gen 3는 양산용 설계 최초 버전. 10,000개 고유 부품. 2026 H2 생산량 10K대 미만 시 대당 원가 $60K 이상. Musk: 생산속도 "문자 그대로 예측 불가".',
  'Tesla Optimus Gen 3는 양산을 목표로 설계된 최초의 버전이다. Gen 2.5 대비 대폭 업그레이드된 10,000개 이상의 고유 부품과 완전히 새로운 생산 라인을 요구한다. 2026년 하반기 생산량이 10,000대 미만으로 예상되는 상황에서 대당 제조원가는 $60,000 이상으로 추정된다. Elon Musk는 Q4 2025 실적 발표에서 "현재 공장에서 의미 있는 수준으로 사용되고 있지 않다"고 인정하며, 생산 속도는 "문자 그대로 예측 불가능"이라고 경고했다.',
  'ko', 'industry', 'robot',
  encode(sha256(('tesla-optimus-gen3-cost-60k-2026')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus Gen 3"], "technologies": ["mass production design"], "marketInsights": [">$60K manufacturing cost at <10K volume", "not in material use in factories", "production rate unpredictable"], "keyPoints": ["양산 설계 최초 버전", "원가 $60K+ (저볼륨)", "Musk: 예측 불가 경고"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-gen3-cost-60k-2026')::bytea), 'hex'));

-- Agility TMMC RaaS 상세
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Robotics × TMMC: Robots-as-a-Service 상용 계약 (7대 배정, 3대 선행 배포)',
  'AgilityRobotics.com / GlobalNews.ca',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  '2026-02-15'::timestamp,
  'Agility Robotics와 Toyota Motor Manufacturing Canada가 RaaS 모델로 상용 계약 체결. 총 7대 배정, 3대 선행 배포. 제조/공급망/물류 지원. TMMC는 Fortune 500 Digit 도입 기업 대열에 합류.',
  'Agility Robotics와 Toyota Motor Manufacturing Canada(TMMC)가 파일럿 성공 후 Robots-as-a-Service 모델로 상용 계약을 체결했다. 총 7대가 배정되었으며 초기 3대로 배포를 시작한다. 제조, 공급망, 물류 운영을 지원할 예정. TMMC는 GXO, Schaeffler, Amazon에 이어 Digit를 도입하는 Fortune 500 기업 대열에 합류.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-tmmc-raas-7units-2026-02')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "Toyota Motor Manufacturing Canada", "GXO", "Amazon", "Schaeffler"], "mentionedRobots": ["Digit"], "technologies": ["Robots-as-a-Service"], "marketInsights": ["pilot-to-commercial conversion", "7 units allocated"], "keyPoints": ["TMMC RaaS 상용 계약", "7대 배정 3대 선행", "Fortune 500 고객 확대"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-tmmc-raas-7units-2026-02')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열)
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', v.payload::jsonb, 'auto', 'pending', NOW()
FROM (VALUES
  ('{"competitor_slug": "figure-03", "updates": [{"field": "production_rate", "new_value": "1 unit/hour at BotQ, 350+ produced", "source": "TheAIInsider 2026-05-01", "reliability": "A"}, {"field": "ai_capability", "new_value": "System 0 perception-conditioned whole-body control (stair/ramp navigation)", "source": "Figure.ai", "reliability": "A"}]}'),
  ('{"competitor_slug": "apollo", "updates": [{"field": "new_investors", "new_value": "AT&T Ventures, John Deere, Qatar Investment Authority 신규 참여", "source": "InterestingEngineering 2026-02", "reliability": "A"}, {"field": "new_robot", "new_value": "2026년 신규 로봇 데뷔 예정", "source": "CNBC", "reliability": "B"}, {"field": "revenue_target", "new_value": "2027년 $1B 주문 목표, $80K/년 가격", "source": "SiliconAngle", "reliability": "B"}]}'),
  ('{"competitor_slug": "neo", "updates": [{"field": "soc", "new_value": "NVIDIA Jetson Thor (NEO Cortex)", "source": "GlobeNewsWire 2026-04-30", "reliability": "A"}, {"field": "learning_strategy", "new_value": "텔레오퍼레이션 선행 → 가정환경 데이터 수집 → AI 학습", "source": "Notebookcheck", "reliability": "B"}]}'),
  ('{"competitor_slug": "optimus-gen3", "updates": [{"field": "manufacturing_cost", "new_value": ">$60K/unit at <10K volume (H2 2026)", "source": "Optimusk.blog, Robozaps", "reliability": "B"}, {"field": "design_purpose", "new_value": "Gen 3 = first version designed for mass production", "source": "eWeek", "reliability": "A"}]}'),
  ('{"competitor_slug": "digit", "updates": [{"field": "tmmc_details", "new_value": "7대 배정, 3대 선행 배포, RaaS 모델", "source": "AgilityRobotics.com", "reliability": "A"}, {"field": "series_c", "new_value": "$400M Series C, 10K-unit production target", "source": "Robozaps", "reliability": "B"}]}')
) AS v(payload)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging
  WHERE payload->>'competitor_slug' = (v.payload::jsonb)->>'competitor_slug'
  AND created_at::date = '2026-06-16'
);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림)
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TheAIInsider/Figure.ai', 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/', 'Figure 03 BotQ 생산 1대/시간 달성, 350대+ 생산', '4개월 만에 생산속도 24배 향상. 초회 수율 80%+. BMW Leipzig 확장.'),
  ('InterestingEngineering', 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo', 'Apptronik $520M에 AT&T/John Deere/QIA 신규 참여', '투자자 다각화: 통신/농업/국부펀드. 2026 신규 로봇, 2027 $1B 주문 목표.'),
  ('GlobeNewsWire', 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html', '1X NEO Factory 본격 생산 개시 (2026.4.30), Jetson Thor 탑재', '전 라인 Jetson Thor 탑재. 텔레오퍼레이션 선행 학습. 2026말 소비자 출하.'),
  ('PRNewswire', 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html', 'AGIBOT "1체3지" 아키텍처 + 4종 신규 플랫폼 공개', '2026 파트너 컨퍼런스. CES 2026 미국 데뷔. Physical AI 대규모 실배포.'),
  ('TrendForce', 'https://www.trendforce.com/presscenter/news/20260409-13007.html', '중국 휴머노이드 산출량 2026년 94% 증가, Unitree+AGIBOT 80% 점유', 'TrendForce 보고서. 정부 정책+저가 모델 확산이 성장 동력.'),
  ('Optimusk.blog/Robozaps', 'https://optimusk.blog/blog/tesla-optimus-production-timeline/', 'Tesla Optimus Gen 3 원가 $60K+ (H2 2026), 양산 설계 최초', '10K 고유 부품. 생산속도 예측 불가. Q4 2025 공장 미사용 인정.'),
  ('AgilityRobotics.com', 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada', 'Agility Digit TMMC RaaS 계약: 7대 배정, 3대 선행', 'Robots-as-a-Service 모델. Fortune 500 고객 확대.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
