-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-20
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-20T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] Figure AI - BotQ 공장 시간당 1대 생산, BMW $25/hr 가격 모델
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'mass_production', 'critical',
  'Figure 03: BotQ 공장 시간당 1대 양산 달성, BMW 시간당 $25 과금 모델 확정',
  'Figure AI의 BotQ 전용 공장이 Figure 03을 시간당 1대씩 생산하는 마일스톤 달성. BMW Spartanburg 40대 배포에서 로봇 가동시간당 $25 과금 모델 적용. 이는 RaaS(Robot-as-a-Service) 가격 기준점을 제시. BMW 독일 뮌헨/레겐스부르크/라이프치히 확장 계약도 진행 중.',
  '{"source": "TheRobotReport, BMW Press, CNBC", "date": "2026-06", "reliability": "A", "details": {"production_rate": "1 unit/hour", "pricing_model": "per-robot-operating-hour", "price_per_hour": "$25", "bmw_fleet": 40, "expansion_sites": ["Munich", "Regensburg", "Leipzig"], "employees": 658}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'mass_production'
  AND title LIKE '%BotQ%시간당%'
);

-- [B] Tesla Optimus - "Digital Optimus" AI 에이전트 발표 (xAI 파트너십)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'partnership', 'warning',
  'Tesla: "Digital Optimus" AI 에이전트 발표, xAI Grok 통합',
  'Elon Musk가 "Digital Optimus" (코드명 Macrohard) AI 에이전트를 발표. Tesla FSD 아키텍처 기반, xAI Grok 음성 AI 통합. 물리 로봇 + 디지털 에이전트 양면 전략으로 확장. Gen 3 손 22 DOF/50 액추에이터, AI5 칩 탑재, IP68 방진방수.',
  '{"source": "optimusk.blog, TechTimes", "date": "2026", "reliability": "B", "details": {"digital_agent": "Digital Optimus (Macrohard)", "ai_partner": "xAI", "voice_ai": "Grok", "gen3_hand_dof": 22, "gen3_actuators": 50, "gen3_chip": "AI5", "ip_rating": "IP68", "weight_kg": 57, "speed_kmh": 12}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'partnership'
  AND title LIKE '%Digital Optimus%'
);

-- [B] Apptronik - 신규 투자자 AT&T Ventures, John Deere, QIA 참여
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'partnership', 'info',
  'Apptronik Apollo: AT&T Ventures, John Deere, 카타르투자청(QIA) 신규 투자 참여',
  'Apptronik $520M Series A 연장에 AT&T Ventures, John Deere, 카타르투자청(QIA) 신규 참여. 기존 B Capital, Google, Mercedes-Benz, PEAK6 외에 통신/농업/국부펀드 영역으로 투자자 다변화. Austin 확장 및 캘리포니아 신규 오피스 개설 예정. 2026년 신규 로봇 모델 데뷔 예고.',
  '{"source": "CNBC, SiliconAngle, TheRobotReport", "date": "2026-02", "reliability": "A", "details": {"new_investors": ["AT&T Ventures", "John Deere", "Qatar Investment Authority"], "existing_investors": ["B Capital", "Google", "Mercedes-Benz", "PEAK6"], "new_office": "California (2026)", "new_robot": "2026 debut planned"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'partnership'
  AND title LIKE '%AT&T%John Deere%QIA%'
);

-- [B] Agility Digit - 100,000 토트 핸들링 달성, OSHA 안전 현장검사 통과
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'mass_production', 'warning',
  'Agility Digit: 상용 환경 100,000 토트 핸들링 달성, OSHA 인증 안전검사 통과',
  'Digit이 상용 배포 환경에서 100,000개 이상의 토트를 핸들링하는 마일스톤 달성. 경쟁사 대비 실배치 ROI 선도. 또한 전자상거래 고객 물류센터에서 OSHA 인증 안전 현장 검사를 통과하여 산업 현장 안전성을 입증.',
  '{"source": "AgilityRobotics.com, OriginOfBots", "date": "2026", "reliability": "B", "details": {"totes_handled": "100,000+", "osha_inspection": "passed", "inspection_site": "ecommerce fulfillment center", "safety_standard": "OSHA-recognized field inspection"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'mass_production'
  AND title LIKE '%100,000 토트%OSHA%'
);

-- [B] 1X NEO - World Model AI 기술 공개 (영상 학습 기반 자율 행동)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'score_spike', 'info',
  '1X NEO: World Model 공개 — 영상 시청만으로 새 작업 자율 수행',
  '1X Technologies가 NEO용 World Model을 공개. 사용자 음성/텍스트 프롬프트에 따라 로봇이 미래 행동 시각화를 생성하고 역동역학 모델로 정밀 동작 변환. 이전에 본 적 없는 물체/작업도 자율 수행 가능. 홈 로봇 AI 자율성 기준을 크게 높임.',
  '{"source": "TheRobotReport", "date": "2026", "reliability": "B", "details": {"technology": "World Model", "capability": "learn tasks from watching videos", "input": "voice or text prompt", "method": "inverse dynamics model", "key_feature": "autonomous actions on unseen tasks/objects"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'score_spike'
  AND title LIKE '%World Model%'
);

-- [A] AGIBOT - 미국 시장 진출 (3종 휴머노이드 + 로봇독), "배포 원년" 선포
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'warning',
  'AGIBOT: 미국 시장 진출, 5개 로봇 플랫폼/8개 AI 모델로 "배포 원년" 선포',
  'AGIBOT이 미국 시장에 3종 휴머노이드(A2, X2, G2)와 D1 로봇독으로 진출. CES 2026에서 첫 공개. 8개 AI 모델을 동시 공개하며 "Deployment Year One(배포 원년)" 선포. Longcheer Technology와 소비자 전자제품 양산 라인에 로봇 배포 — 해당 분야 최초 대규모 산업 적용.',
  '{"source": "eWeek, InterestingEngineering, TechTimes", "date": "2026", "reliability": "A", "details": {"us_models": ["A2", "X2", "G2", "D1 (quadruped)"], "ai_models": 8, "declaration": "Deployment Year One", "longcheer_deployment": "consumer electronics precision manufacturing", "market_share": "Unitree + Agibot ~80% of China shipments"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'partnership' AND title LIKE '%AGIBOT%미국 시장 진출%'
)
LIMIT 1;

-- Fallback for AGIBOT if no X1 robot
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'warning',
  'AGIBOT: 미국 시장 진출, 5개 로봇 플랫폼/8개 AI 모델로 "배포 원년" 선포',
  'AGIBOT이 미국 시장에 3종 휴머노이드(A2, X2, G2)와 D1 로봇독으로 진출. CES 2026에서 첫 공개. 8개 AI 모델을 동시 공개하며 "Deployment Year One(배포 원년)" 선포. Longcheer Technology와 소비자 전자제품 양산 라인에 로봇 배포 — 해당 분야 최초 대규모 산업 적용.',
  '{"source": "eWeek, InterestingEngineering, TechTimes", "date": "2026", "reliability": "A", "details": {"us_models": ["A2", "X2", "G2", "D1 (quadruped)"], "ai_models": 8, "declaration": "Deployment Year One", "longcheer_deployment": "consumer electronics precision manufacturing", "market_share": "Unitree + Agibot ~80% of China shipments"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'partnership' AND title LIKE '%AGIBOT%미국 시장 진출%'
)
LIMIT 1;

-- [C] Unitree G1 - 미국 의회 국가안보 블랙리스트 위험
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'score_spike', 'critical',
  'Unitree G1: 미국 의회 국가안보 블랙리스트 검토 — 일본 하네다 배포와 병행',
  '미국 의회가 Unitree를 국가안보 위험으로 블랙리스트에 추가하는 방안을 검토 중. JAL이 하네다 공항에 G1을 배포하는 가운데 공급 리스크 부상. DJI 드론 규제 사례와 유사한 패턴. 서방 시장 수출 제한 가능성.',
  '{"source": "TechTimes", "date": "2026-05", "reliability": "C", "details": {"risk": "US Congress national security blacklist consideration", "context": "JAL Haneda deployment concurrent", "analogy": "DJI drone regulation pattern", "impact": "potential Western market export restrictions"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'score_spike'
  AND title LIKE '%블랙리스트%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Figure 03 BotQ factory production rate
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure 03: BotQ 공장 시간당 1대 생산 달성, BMW 상용 배포 $25/hr RaaS 모델',
  'TheRobotReport / BMW Press',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  '2026-06-15'::timestamp,
  'Figure AI BotQ 공장이 Figure 03을 시간당 1대씩 생산하는 마일스톤 달성. BMW Spartanburg 40대 배포에서 가동시간당 $25 과금 RaaS 모델 적용. 뮌헨/레겐스부르크/라이프치히 확장 계약 진행.',
  'Figure AI의 전용 제조시설 BotQ가 Figure 03 생산에서 시간당 1대 출하율을 달성했다. BMW Spartanburg 공장에서 40대가 차체 조립과 품질 검사에 투입되어 있으며, 로봇 가동시간 기준 시간당 약 $25의 RaaS(Robot-as-a-Service) 과금 모델이 적용되고 있다. BMW 독일 공장(뮌헨, 레겐스부르크, 라이프치히)으로 확장 파일럿이 2026년 여름 시작 예정. 직원 수 658명(2026년 5월 기준).',
  'ko', 'industry', 'robot',
  encode(sha256(('figure-botq-production-rate-2026-06')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03"], "technologies": ["BotQ factory", "RaaS pricing"], "marketInsights": ["1 unit/hour production", "$25/hr RaaS model", "European expansion"], "keyPoints": ["BotQ 시간당 1대 생산", "BMW $25/hr RaaS", "독일 3개 공장 확장 계약"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-botq-production-rate-2026-06')::bytea), 'hex'));

-- Tesla Digital Optimus / Macrohard
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla "Digital Optimus" AI 에이전트 발표: FSD 아키텍처 기반, xAI Grok 통합',
  'optimusk.blog / TechTimes',
  'https://optimusk.blog/blog/tesla-optimus-news/',
  '2026-03-01'::timestamp,
  'Musk가 "Digital Optimus" (코드명 Macrohard) AI 에이전트 발표. Tesla FSD 아키텍처에 xAI Grok 음성 AI 통합. 물리 로봇 + 디지털 에이전트 양면 전략. Gen 3 손 22 DOF/50 액추에이터.',
  'Elon Musk가 물리적 Optimus 로봇과 병행하여 "Digital Optimus" (Macrohard 코드명) AI 에이전트를 발표했다. Tesla의 FSD(Full Self-Driving) 신경망 아키텍처를 기반으로 구축되며 xAI의 Grok 음성 AI가 통합된다. Gen 3 핵심 사양: 22 DOF 손(50개 액추에이터, 팔당 25개), 무게 57kg(22% 경량화), 12km/h 보행속도, IP68 방진방수, AI5 칩, 6-8시간 가동.',
  'ko', 'technology', 'robot',
  encode(sha256(('tesla-digital-optimus-macrohard-2026')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla", "xAI"], "mentionedRobots": ["Optimus Gen 3", "Digital Optimus"], "technologies": ["FSD architecture", "Grok voice AI", "AI5 chip"], "marketInsights": ["physical + digital dual strategy", "22 DOF hands", "$20-30K target price"], "keyPoints": ["Digital Optimus AI 에이전트", "xAI Grok 통합", "Gen 3 손 22DOF 50 액추에이터"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-digital-optimus-macrohard-2026')::bytea), 'hex'));

-- AGIBOT US market entry
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT 미국 시장 진출: 3종 휴머노이드 + 로봇독, "배포 원년" 선포',
  'eWeek / InterestingEngineering',
  'https://www.eweek.com/news/agibot-deployment-year-one-robots-ai-models-apac/',
  '2026-04-01'::timestamp,
  'AGIBOT이 CES 2026에서 미국 시장 진출을 공식화. A2/X2/G2 휴머노이드와 D1 로봇독 4종, 8개 AI 모델 공개. 2026년을 "Deployment Year One"으로 선포. Longcheer Technology와 소비자 전자제품 양산 라인 최초 대규모 적용.',
  'AGIBOT이 CES 2026에서 미국 시장에 AGIBOT A2, X2, G2 시리즈 휴머노이드와 D1 시리즈 쿼드러패드를 출시하며 공식 진출했다. 동시에 8개 AI 모델을 공개하고 2026년을 "Deployment Year One(배포 원년)"으로 선포. Longcheer Technology와 소비자 전자제품 정밀 제조 양산 라인에 로봇을 배포하여 해당 분야 최초 대규모 산업 적용을 달성. TrendForce 분석에 따르면 Unitree + Agibot 양사가 중국 휴머노이드 출하량의 약 80%를 차지할 전망.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-us-market-entry-2026')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Longcheer Technology", "Unitree"], "mentionedRobots": ["A2", "X2", "G2", "D1"], "technologies": ["embodied AI", "8 AI models"], "marketInsights": ["US market entry", "Deployment Year One", "Unitree+Agibot ~80% China market"], "keyPoints": ["미국 시장 공식 진출", "4종 로봇 + 8 AI 모델", "Longcheer 양산 라인 최초 적용"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-us-market-entry-2026')::bytea), 'hex'));

-- Agility Digit 100K totes + OSHA
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Digit: 상용 100,000 토트 핸들링 마일스톤, OSHA 안전검사 통과',
  'OriginOfBots / AgilityRobotics',
  'https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo',
  '2026-05-15'::timestamp,
  'Digit이 Amazon, Toyota, GXO 등 상용 환경에서 100,000개 이상 토트를 핸들링. 전자상거래 물류센터에서 OSHA 인증 안전 현장검사 통과. 파일럿을 넘어 실제 창고 작업 수행 단계에 진입.',
  'Agility Robotics의 Digit이 Amazon, Toyota, GXO 등 복수 고객사에서 파일럿을 넘어 실제 창고 작업을 수행하고 있다. 상용 배포 환경에서 누적 100,000개 이상의 토트를 핸들링하는 6자리 마일스톤을 달성했다. 특히 전자상거래 고객 물류센터에서 OSHA 인증 안전 현장 검사(safety field inspection)를 통과하여 산업 현장의 안전성을 공식적으로 입증했다.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-digit-100k-osha-2026')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "Amazon", "Toyota", "GXO"], "mentionedRobots": ["Digit"], "technologies": ["OSHA safety inspection"], "marketInsights": ["100K+ totes milestone", "pilot-to-production transition"], "keyPoints": ["100,000 토트 핸들링 달성", "OSHA 안전검사 통과", "파일럿→상용 전환"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-100k-osha-2026')::bytea), 'hex'));

-- 1X NEO World Model
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X Technologies: NEO용 World Model 공개, 영상 시청만으로 새 작업 자율 수행',
  'TheRobotReport',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-05-01'::timestamp,
  '1X Technologies가 NEO용 World Model을 공개. 음성/텍스트 프롬프트로 미래 행동 시각화 → 역동역학 모델 → 정밀 동작 변환. 이전에 본 적 없는 물체/작업도 자율 수행.',
  '1X Technologies가 NEO 로봇을 위한 World Model을 공개했다. 사용자가 음성 또는 텍스트 프롬프트를 입력하면, 로봇이 현재 시야를 기반으로 미래 행동 시각화를 생성하고, 내장된 역동역학(inverse dynamics) 모델이 이를 정밀한 물리적 동작으로 변환한다. 핵심 돌파구는 NEO가 이전에 본 적 없는 물체나 작업에 대해서도 완전 자율 행동을 수행할 수 있다는 점이다. NEO Gamma 사양: 5피트 7인치, 66파운드, 소프트 3D 니트 외피, 5손가락 핸드.',
  'ko', 'technology', 'robot',
  encode(sha256(('1x-neo-world-model-2026')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies"], "mentionedRobots": ["NEO", "NEO Gamma"], "technologies": ["World Model", "inverse dynamics", "vision-language-action"], "marketInsights": ["autonomous task generalization", "home robot AI breakthrough"], "keyPoints": ["World Model 공개", "프롬프트→자율행동 파이프라인", "미경험 작업 수행 가능"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-world-model-2026')::bytea), 'hex'));

-- Unitree US Congress blacklist risk
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree G1: 미국 의회 국가안보 블랙리스트 검토, JAL 하네다 배포와 엇갈린 행보',
  'TechTimes',
  'https://www.techtimes.com/articles/316862/20260519/jal-deploys-unitree-g1-robots-haneda-us-congress-moves-blacklist-supplier-national-security.htm',
  '2026-05-19'::timestamp,
  '미 의회가 Unitree를 국가안보 위험으로 블랙리스트 검토 중. JAL 하네다 배포와 동시에 서방 시장 수출 규제 리스크 부상. DJI 드론 규제 사례 유사.',
  '미국 의회가 Unitree Robotics를 국가안보 위험 공급업체로 블랙리스트에 추가하는 방안을 검토하고 있다. JAL(Japan Airlines)이 도쿄 하네다 공항에 Unitree G1을 수하물 처리용으로 배포하는 가운데, DJI 드론 규제 사례와 유사한 패턴으로 서방 시장 수출 제한 가능성이 부상하고 있다. 이 규제가 현실화될 경우, Unitree의 일본/유럽/북미 시장 확장에 상당한 제약이 될 수 있다.',
  'ko', 'regulation', 'robot',
  encode(sha256(('unitree-us-congress-blacklist-2026-05')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Japan Airlines", "GMO Internet"], "mentionedRobots": ["G1"], "technologies": [], "marketInsights": ["US national security blacklist risk", "DJI regulation precedent", "Western market export restrictions"], "keyPoints": ["의회 블랙리스트 검토", "DJI 패턴 유사", "서방 수출 제한 가능성"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-us-congress-blacklist-2026-05')::bytea), 'hex'));

-- Apptronik new investors
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik Apollo: AT&T Ventures, John Deere, QIA 신규 투자 참여, 2026 신규 로봇 예고',
  'CNBC / SiliconAngle',
  'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
  '2026-02-11'::timestamp,
  '$520M 연장에 AT&T Ventures, John Deere, 카타르투자청 신규 참여. 통신/농업/국부펀드 영역 투자자 다변화. 캘리포니아 신규 오피스 및 2026년 신규 로봇 모델 데뷔 예고.',
  'Apptronik의 $520M Series A 연장에 AT&T Ventures, John Deere, 카타르투자청(QIA)이 신규 투자자로 참여했다. 기존 B Capital, Google, Mercedes-Benz, PEAK6 외에 통신/농업/국부펀드 등 다양한 산업 영역으로 투자자가 확대되었다. 자금은 Apollo 양산, 글로벌 배포, 트레이닝 시설 건설, 2026년 신규 로봇 개발에 투입. Austin 확장과 캘리포니아 신규 오피스 개설 계획.',
  'ko', 'industry', 'robot',
  encode(sha256(('apptronik-att-deere-qia-2026-02')::bytea), 'hex'),
  '2b53d7b2-ddfe-45bd-8e21-f545d3566f4d',
  '{"mentionedCompanies": ["Apptronik", "AT&T Ventures", "John Deere", "Qatar Investment Authority"], "mentionedRobots": ["Apollo"], "technologies": [], "marketInsights": ["cross-industry investor diversification", "new robot model 2026", "California expansion"], "keyPoints": ["AT&T/Deere/QIA 신규 투자", "투자자 산업 다변화", "2026 신규 로봇 예고"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-att-deere-qia-2026-02')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

-- Figure 03 production rate update
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure", "updates": [{"field": "production_rate", "new_value": "BotQ 공장 시간당 1대 생산", "source": "TheRobotReport, ForgeGlobal", "reliability": "A"}, {"field": "pricing", "new_value": "BMW RaaS $25/hr per robot", "source": "BMW Press, CNBC", "reliability": "A"}, {"field": "expansion", "new_value": "BMW 독일 3개 공장 확장 계약 (뮌헨/레겐스부르크/라이프치히)", "source": "BMW Press", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'figure' AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- Tesla Digital Optimus
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "ai_strategy", "new_value": "Digital Optimus (Macrohard) AI 에이전트 + xAI Grok", "source": "optimusk.blog, TechTimes", "reliability": "B"}, {"field": "gen3_specs", "new_value": "22 DOF 손, 50 액추에이터, 57kg, 12km/h, AI5칩, IP68", "source": "TechTimes, airobots.media", "reliability": "B"}, {"field": "target_price", "new_value": "$20,000-$30,000, 외부 판매 2026년 말", "source": "eWeek", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "optimus"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- Agility Digit milestone
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "milestone", "new_value": "상용 환경 100,000+ 토트 핸들링 달성", "source": "AgilityRobotics.com, OriginOfBots", "reliability": "B"}, {"field": "safety_cert", "new_value": "OSHA 인증 안전 현장검사 통과 (전자상거래 물류센터)", "source": "AgilityRobotics.com", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "digit"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- 1X NEO World Model
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "ai_capability", "new_value": "World Model 공개 — 프롬프트→미래 행동 시각화→역동역학 변환, 미경험 작업 자율 수행", "source": "TheRobotReport", "reliability": "B"}, {"field": "specs", "new_value": "NEO Gamma: 170cm, 30kg, 소프트 3D니트 외피, 5손가락 핸드", "source": "eWeek, botinfo.ai", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "neo"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- AGIBOT US entry
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "market_entry", "new_value": "미국 시장 진출 (CES 2026), A2/X2/G2/D1 출시", "source": "InterestingEngineering, eWeek", "reliability": "A"}, {"field": "deployment", "new_value": "Longcheer Technology 소비자 전자제품 양산라인 배포 (업계 최초)", "source": "TheAIInsider", "reliability": "A"}, {"field": "market_share", "new_value": "Unitree + Agibot 중국 출하량 ~80% 전망 (TrendForce)", "source": "TrendForce", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "agibot"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- Unitree regulatory risk
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "regulatory_risk", "new_value": "미 의회 국가안보 블랙리스트 검토 (DJI 패턴)", "source": "TechTimes 2026-05-19", "reliability": "C"}, {"field": "open_source", "new_value": "UnifoLM-VLA-0 오픈소스 공개 (2026.3)", "source": "TheRobotReport", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "unitree-g1"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- Apptronik new investors
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "new_investors", "new_value": "AT&T Ventures, John Deere, Qatar Investment Authority 신규 참여", "source": "CNBC, SiliconAngle", "reliability": "A"}, {"field": "expansion", "new_value": "2026년 캘리포니아 신규 오피스 + 신규 로봇 모델 데뷔 예정", "source": "TheRobotReport", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "apollo"}'::jsonb AND source_channel = 'auto' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TheRobotReport/BMW', 'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html', 'Figure 03 BotQ 시간당 1대 양산, BMW $25/hr RaaS', 'BotQ 공장 시간당 1대 출하. BMW Spartanburg 40대 $25/hr 과금. 독일 3개 공장 확장 계약.'),
  ('optimusk.blog', 'https://optimusk.blog/blog/tesla-optimus-news/', 'Tesla "Digital Optimus" AI 에이전트 + xAI Grok 통합 발표', 'FSD 기반 디지털 에이전트. Gen 3 손 22DOF/50액추에이터. $20-30K 목표가.'),
  ('OriginOfBots', 'https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo', 'Agility Digit 100,000 토트 달성, OSHA 안전검사 통과', '파일럿→상용 전환 확정. Amazon/Toyota/GXO 복수 고객사 실배치.'),
  ('TheRobotReport', 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/', '1X NEO World Model: 영상 학습 기반 자율 행동 수행', '프롬프트→시각화→역동역학 변환. 미경험 작업도 자율 수행 가능.'),
  ('eWeek/InterestingEngineering', 'https://www.eweek.com/news/agibot-deployment-year-one-robots-ai-models-apac/', 'AGIBOT 미국 시장 진출, "배포 원년" 선포', 'A2/X2/G2/D1 4종 로봇, 8개 AI 모델. Longcheer 양산라인 최초 적용.'),
  ('TechTimes', 'https://www.techtimes.com/articles/316862/20260519/', 'Unitree G1 미국 의회 블랙리스트 위험', '국가안보 이유 블랙리스트 검토. JAL 하네다 배포와 동시. DJI 패턴 유사.'),
  ('CNBC/SiliconAngle', 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/', 'Apptronik AT&T/Deere/QIA 신규 투자, 신규 로봇 예고', 'AT&T Ventures, John Deere, QIA 신규 참여. 2026년 신규 로봇 모델 데뷔.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
