-- War Room 경쟁사 데이터 자동 업데이트 - 2026-08-31
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-08-31T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] Unitree - 상하이 STAR Market IPO, $9B 밸류, 460% 첫날 급등 (2026-08-19)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'funding', 'critical',
  'Unitree: 상하이 STAR Market IPO 상장 (688836), $9B 밸류, 첫날 460% 급등 (2026.8.19)',
  'Unitree Robotics가 2026년 8월 19일 상하이 STAR Market에 상장(티커 688836). IPO 가격 150.8위안/주, 기업가치 약 610억 위안($9.04B). 첫날 629%까지 상승 후 460%로 마감(845위안). 소매 투자자 8,000배 초과청약. 중국 본토 최초 휴머노이드 로봇 상장사. 신주 4,045만주(확대 자본 약 10%) 발행으로 61억 위안 조달. 창업자 왕싱싱 지분 가치 $12B 이상.',
  '{"source": "Bloomberg, CNBC, Yahoo Finance, Caixin Global", "date": "2026-08-19", "reliability": "A", "details": {"exchange": "Shanghai STAR Market", "ticker": "688836", "ipo_price_cny": 150.8, "ipo_price_usd": 22.34, "valuation_cny": "61B yuan", "valuation_usd": "$9.04B", "day1_high_pct": 629, "day1_close_pct": 460, "day1_close_cny": 845, "shares_sold": 40450000, "oversubscription": "8,000x retail", "capital_raised_cny": "6.1B yuan", "founder_stake_usd": "$12B+", "significance": "first mainland China listed humanoid robot maker"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'funding'
  AND title LIKE '%STAR Market IPO%$9B%'
);

-- [A] Boston Dynamics Atlas - 5세대 "order of magnitude simpler" 공개 (2026-07-02)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'score_spike', 'warning',
  'Boston Dynamics Atlas 5세대: 부품 수 "거의 10배 감소", 양산 비용 대폭 절감 (2026.7)',
  'Boston Dynamics가 5세대 Atlas를 공개. 이전 세대 대비 부품 수를 "거의 10배(order of magnitude)" 줄여 제조 시간 단축, 신뢰성 향상, 비용 대폭 절감. 기존 $200K 수준 가격의 대폭 인하 가능. Hyundai 2028년 연 30,000대 생산 공장 계획의 핵심 전제. BD 로봇 행동 디렉터 Alberto Rodriguez 인터뷰에서 "way fewer parts and way fewer unique parts" 확인.',
  '{"source": "Forbes, StartupFortune, Updater News", "date": "2026-07-02", "reliability": "A", "details": {"generation": "5th", "complexity_reduction": "almost order of magnitude", "key_improvements": ["fewer parts", "faster manufacturing", "higher reliability", "lower cost"], "previous_price": "$200K+", "hyundai_factory_target": "30,000 units/yr by 2028", "source_person": "Alberto Rodriguez, Director of Robot Behavior", "transition": "all-electric mass production"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'score_spike'
  AND title LIKE '%5세대%order of magnitude%'
);

-- [A] Figure AI - BotQ 1,000번째 Figure 03 생산 달성, 1대/시간 생산율 (2026-07-23)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'mass_production', 'warning',
  'Figure AI: BotQ 1,000번째 Figure 03 생산 (2026.7.23), 생산율 24배 증가 → 1대/시간',
  'Figure AI의 BotQ 공장이 2026년 7월 23일 1,000번째 Figure 03를 생산. 120일 만에 생산율을 1대/일에서 1대/시간으로 24배 향상. F.02는 BMW Spartanburg에서 11개월 파일럿 후 은퇴 — 30,000대 이상 X3 생산, 90,000개 판금 부품 적재, 1,250+시간 가동. BMW는 Leipzig 공장으로 확대(2026 여름). Spartanburg에서도 Figure 03 플릿 확대 및 유럽 공장(Munich, Dingolfing, Regensburg) 평가 중.',
  '{"source": "Figure AI official, iFactory, IIoT World, Forbes", "date": "2026-07-23", "reliability": "A", "details": {"milestone": "1,000th Figure 03", "milestone_date": "2026-07-23", "production_rate": "1 robot/hour", "rate_increase": "24x in 120 days", "f02_retirement": {"pilot_duration": "11 months", "vehicles_produced": 30000, "parts_loaded": 90000, "operating_hours": "1,250+"}, "bmw_expansion": {"new_plant": "Leipzig, Germany", "timeline": "summer 2026", "evaluation_plants": ["Munich", "Dingolfing", "Regensburg"]}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'mass_production'
  AND title LIKE '%1,000번째%Figure 03%1대/시간%'
);

-- [B] Apptronik - Apollo 2 공개 + $935M Series A 총액 + Robot Park (2026-06~08)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'warning',
  'Apptronik: Apollo 2 공개(이족/휠 겸용) + Series A $935M + Robot Park 90K sqft + DeepMind 파트너십',
  'Apptronik이 Apollo 2를 2026년 6월 공개 — 이족보행 및 휠 베이스 구성 겸용 훈련/데이터 수집 플랫폼. Series A 확장 라운드 $520M(총 $935M, 기업가치 $5B). Google DeepMind Gemini Robotics 온디바이스 탑재(50-100회 시연으로 신규 태스크 학습). Robot Park(90K sqft) 데이터 수집/훈련 시설 개설. Mercedes-Benz, GXO Logistics 테스트 배포. Waymo/BD/Amazon 출신 리더십 영입. Apollo 3(2027 상용 모델) 준비.',
  '{"source": "CNBC, TheRobotReport, Automate.org, Apptronik official", "date": "2026-08", "reliability": "B", "details": {"apollo_2": {"config": ["bipedal", "wheeled base"], "purpose": "training and data platform"}, "funding": {"series_a_extension": "$520M", "series_a_total": "$935M+", "total_raised": "~$1B", "valuation": "$5B", "lead_investors": ["B Capital", "Google", "Mercedes-Benz", "PEAK6"], "new_investors": ["AT&T Ventures", "John Deere", "Qatar Investment Authority"]}, "robot_park": {"size_sqft": 90000, "purpose": "data collection and training"}, "deepmind": {"model": "Gemini Robotics On-Device", "demo_requirement": "50-100 demonstrations"}, "deployments": ["Mercedes-Benz", "GXO Logistics"], "apollo_3_target": "2027 commercial"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Apptronik%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'partnership' AND title LIKE '%Apollo 2%$935M%Robot Park%'
)
LIMIT 1;

-- [A] Tesla Optimus - Q2 SEC 제출 + AI5 칩 + xAI Grok 통합 (2026-07-22)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'score_spike', 'info',
  'Tesla Optimus: Q2 SEC 제출 "Fremont 생산 올해 내 예정" + AI5 칩 + xAI Grok 음성 통합',
  'Tesla Q2 2026 주주 업데이트(SEC 7/22 제출)에서 "Fremont Factory for Optimus 건설 착수, 올해 내 생산 예정" 공식 확인. Optimus V3는 173cm/57kg, 22 DOF 손, 50개 액추에이터 탑재. 신규 AI5 칩과 xAI Grok 음성 인터페이스 통합. 소비자 판매는 2027년 말 이후 목표. 현재 Tesla 자체 공장 내부 가동 전용.',
  '{"source": "Tesla SEC Q2 filing, Electrek, Basenor, Optimusk", "date": "2026-07-22", "reliability": "A", "details": {"sec_filing": "Q2 2026 shareholder update, July 22", "quote": "Construction at our Fremont Factory for Optimus began after we decommissioned the Model S & X lines, with anticipated production later this year", "specs": {"height_cm": 173, "weight_kg": 57, "hand_dof": 22, "actuators": 50}, "ai": {"chip": "AI5", "voice": "xAI Grok"}, "consumer_availability": "end of 2027 earliest", "current_use": "internal Tesla factories only"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'score_spike'
  AND title LIKE '%Q2 SEC%AI5%xAI Grok%'
);

-- [B] 1X NEO - 25 DOF 신형 손 공개 + San Carlos 2호 공장 (2026-07-13)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'score_spike', 'info',
  '1X NEO: 25 DOF 신형 손 공개 (2026.7), San Carlos 2호 공장 올해 가동 예정',
  '1X Technologies가 NEO 로봇의 신형 손을 공개(2026.7.13). 25개 관절(25 DOF)로 인간 수준 조작 능력 목표. 첫 출하분에 탑재 예정. Hayward 공장(58K sqft, 200+명) 풀 생산 가동 중. San Carlos 2호 공장이 2026년 내 온라인 가동 예정으로 생산 역량 확대. 2026년 내 가정 배송 시작 약속 유지.',
  '{"source": "Dezeen, Forbes, TheRobotReport", "date": "2026-07-13", "reliability": "B", "details": {"hand_dof": 25, "hand_joints": 25, "first_delivery_target": "2026", "hayward_factory": {"sqft": 58000, "staff": "200+"}, "san_carlos_factory": {"status": "coming online later 2026"}, "capabilities": ["basic tidying", "fetch items", "open doors", "possibly fold clothes"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'score_spike'
  AND title LIKE '%25 DOF%San Carlos%'
);

-- [A] AGIBOT - 누적 15,000대 달성, G2 실제 생산라인 투입, 중국 듀오폴리 형성 (2026-06~08)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'warning',
  'AGIBOT: 누적 15,000대 양산 (2026.6), G2 태블릿 생산라인 실투입, Unitree와 중국 듀오폴리',
  'AGIBOT이 2026년 6월 초 누적 15,000대 생산 달성. 휠드 G2 휴머노이드가 태블릿 PC 실제 산업 생산라인에 인간과 함께 투입 — 휴머노이드 최초 라이브 전자제품 생산 배포. 8개 제품 라인(A2/A3/G2/X2/D2 Max/OmniHand 3 등) 운용. Unitree(11,000대)와 함께 중국 휴머노이드 시장 듀오폴리 형성. MIIT 기준 2026년 전체 중국 휴머노이드 생산 100,000대 초과 전망(전년 20,000대 대비 5배).',
  '{"source": "Forbes, Pandaily, PRNewswire, BotInfo", "date": "2026-08", "reliability": "A", "details": {"cumulative_production": 15000, "g2_deployment": {"type": "live industrial electronics production line", "product": "tablet computers", "significance": "world-first humanoid on live electronics line"}, "product_lines": 8, "products": ["A2 bipedal ($100K-$190K)", "A3 Expedition", "G2 wheeled industrial", "X2 education", "D2 Max quadruped", "OmniHand 3"], "china_market": {"agibot_units": 15000, "unitree_units": 11000, "duopoly": true, "2026_total_projection": "100,000+", "2025_total": "~20,000", "yoy_growth": "5x"}}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'mass_production' AND title LIKE '%15,000대%G2 태블릿%듀오폴리%'
)
LIMIT 1;

-- [B] 2026 World Robot Conference - 300+ 전시사, 3,000+ 제품, 휴머노이드 주목 (2026-08-19~23)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'info',
  '2026 World Robot Conference (베이징 8/19-23): 300+ 전시사, 3,000+ 제품, 휴머노이드 주력',
  '2026 World Robot Conference가 베이징에서 8월 19-23일 개최. 26개국 300+ 전시사, 3,000+ 제품, 300+ 세계 최초 공개. 휴머노이드 로봇이 해외 바이어 핵심 관심사. 동시 개최 제2회 World Humanoid Robot Games(8/22-): 16개국 666팀, 약 2,056대 로봇 참가. 중국 휴머노이드 산업 급성장을 반영하는 랜드마크 이벤트.',
  '{"source": "RoboZaps, State Media reports", "date": "2026-08-23", "reliability": "B", "details": {"event": "2026 World Robot Conference", "location": "Beijing", "dates": "Aug 19-23, 2026", "exhibitors": "300+", "countries": 26, "products": "3,000+", "debuts": "300+", "humanoid_games": {"name": "2nd World Humanoid Robot Games", "start": "Aug 22", "teams": 666, "robots": 2056, "countries": 16}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%World Robot Conference%베이징%8/19%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Unitree Shanghai IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree Robotics: 상하이 STAR Market IPO 상장, $9B 밸류, 첫날 460% 급등',
  'Bloomberg / CNBC / Yahoo Finance / Caixin Global',
  'https://www.bloomberg.com/news/articles/2026-08-18/unitree-robotics-set-to-debut-after-904-million-shanghai-ipo',
  '2026-08-19'::timestamp,
  'Unitree 상하이 STAR Market 상장(688836). 150.8위안/주, $9B 밸류. 첫날 460% 급등(845위안). 8,000배 초과청약. 중국 최초 휴머노이드 상장사. 61억위안 조달.',
  'Unitree Robotics가 2026년 8월 19일 상하이 STAR Market에 상장했다. 티커 688836, IPO 가격 150.8위안/주로 기업가치 약 610억 위안($9.04B)을 기록했다. 첫날 최고 629%까지 상승한 후 460%로 마감(845위안). 소매 투자자 8,000배 초과 청약으로 폭발적 관심을 확인했다. 중국 본토에서 최초로 상장한 휴머노이드 로봇 전문 기업이다. 신주 4,045만주(확대 자본 약 10%)를 발행하여 61억 위안을 조달했다. 창업자 왕싱싱의 지분 가치는 $12B 이상으로 추산된다. 2026 World Robot Conference(8/19-23 베이징)와 동시 진행으로 시장 주목도 극대화.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-shanghai-ipo-star-market-2026-08-19')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics"], "mentionedRobots": ["G1", "H2", "R1"], "technologies": [], "marketInsights": ["$9B IPO valuation", "460% day-1 surge", "8,000x oversubscribed", "first mainland China humanoid listing"], "keyPoints": ["상하이 STAR Market 상장", "$9B 밸류에이션", "첫날 460% 급등"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-shanghai-ipo-star-market-2026-08-19')::bytea), 'hex'));

-- BD Atlas 5th gen
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Boston Dynamics Atlas 5세대: 부품 수 10배 감소, 양산 비용 대폭 절감 — Hyundai 30K/yr 공장 추진',
  'Forbes / StartupFortune / Updater News',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  'BD 5세대 Atlas 공개. 부품 수 "거의 10배 감소". 제조 시간 단축, 신뢰성↑, 비용↓. $200K→대폭 인하 가능. Hyundai 2028 연 30K대 공장.',
  'Boston Dynamics가 5세대 Atlas 휴머노이드를 공개했다. 로봇 행동 디렉터 Alberto Rodriguez는 "이전 세대 대비 부품 수가 거의 10배(order of magnitude) 줄었다"고 밝혔다. 부품 수 감소로 제조 시간이 단축되고, 신뢰성이 향상되며, 비용이 대폭 절감된다. 기존 $200K 이상이던 가격의 대폭 인하가 가능해졌다. Hyundai Motor Group은 2028년까지 연 30,000대 생산 공장을 구축할 계획이며, 5세대의 단순화가 이 계획의 핵심 전제다. Atlas는 완전 전동식 양산 체제로 전환 중이다.',
  'ko', 'technology', 'robot',
  encode(sha256(('bd-atlas-5thgen-simpler-mass-production-2026-07')::bytea), 'hex'),
  '7c7e540d-e4ec-4734-920b-875f20989c0a',
  '{"mentionedCompanies": ["Boston Dynamics", "Hyundai Motor Group"], "mentionedRobots": ["Atlas 5th gen"], "technologies": ["order of magnitude complexity reduction", "all-electric mass production"], "marketInsights": ["price reduction from $200K+", "30K units/yr factory by 2028"], "keyPoints": ["부품 10배 감소", "양산 비용 대폭 절감", "Hyundai 30K/yr 공장"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('bd-atlas-5thgen-simpler-mass-production-2026-07')::bytea), 'hex'));

-- Figure AI BotQ 1000th
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI: BotQ 1,000번째 Figure 03 생산, 120일 만에 생산율 24배 향상 (1대/시간)',
  'Figure AI / iFactory / IIoT World',
  'https://axis-intelligence.com/figure-ai-statistics/',
  '2026-07-23'::timestamp,
  'BotQ 1,000번째 Figure 03(7/23). 120일 내 1대/일→1대/시간(24배). F.02 BMW Spartanburg 은퇴(30K X3, 90K 부품). Leipzig 확대.',
  'Figure AI의 BotQ 수직통합 공장이 2026년 7월 23일 1,000번째 Figure 03를 생산했다. 120일 만에 생산율을 1대/일에서 1대/시간으로 24배 향상시켰다. F.02는 BMW Spartanburg 공장에서 11개월 파일럿 후 은퇴했으며, 이 기간 30,000대 이상의 X3 차량 생산에 기여하고 90,000개 이상의 판금 부품을 적재했다(1,250+ 가동 시간). BMW는 Figure 03로 업그레이드하여 Spartanburg 플릿을 확대하고, 2026년 여름부터 독일 Leipzig 공장으로 확대 배포한다. Munich, Dingolfing, Regensburg 유럽 공장도 평가 중이다.',
  'ko', 'product', 'robot',
  encode(sha256(('figure-botq-1000th-figure03-2026-07-23')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03", "Figure 02"], "technologies": ["BotQ vertical integration", "24x production rate increase"], "marketInsights": ["1,000 units milestone", "1 robot/hour rate", "BMW Leipzig expansion"], "keyPoints": ["1,000번째 Figure 03", "생산율 24배 향상", "BMW Leipzig 확대"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-botq-1000th-figure03-2026-07-23')::bytea), 'hex'));

-- Apptronik Apollo 2 + funding
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  'Apptronik: Apollo 2 공개(이족/휠 겸용), Series A 총 $935M, Robot Park, DeepMind 파트너십',
  'CNBC / TheRobotReport / Automate.org / Apptronik',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-08-01'::timestamp,
  'Apollo 2 이족/휠 겸용 플랫폼 (6월). Series A $935M총액($5B 밸류). Robot Park 90K sqft. DeepMind Gemini Robotics 온디바이스. Apollo 3(2027) 준비.',
  'Apptronik이 Apollo 2를 2026년 6월 공개했다. 이족보행과 휠 베이스 구성을 겸용하는 훈련/데이터 수집 플랫폼이다. Series A 확장 라운드에서 $520M을 추가 조달하여 총 $935M(기업가치 $5B)에 달한다. Google, Mercedes-Benz, B Capital, PEAK6가 리드하고 AT&T Ventures, John Deere, Qatar Investment Authority가 신규 참여했다. Robot Park(90K sqft) 데이터 수집/훈련 시설을 개설했으며, Google DeepMind Gemini Robotics On-Device를 탑재하여 50-100회 시연만으로 신규 태스크 학습이 가능하다. Mercedes-Benz, GXO Logistics에서 테스트 배포 중. Waymo/BD/Amazon 출신 리더십 영입. Apollo 3(2027 상용)을 준비 중.',
  'ko', 'industry', 'robot',
  encode(sha256(('apptronik-apollo2-935m-robotpark-2026-08')::bytea), 'hex'),
  '{"mentionedCompanies": ["Apptronik", "Google", "Mercedes-Benz", "GXO Logistics", "John Deere", "Qatar Investment Authority", "AT&T Ventures"], "mentionedRobots": ["Apollo 2", "Apollo 3"], "technologies": ["Gemini Robotics On-Device", "bipedal and wheeled base"], "marketInsights": ["$935M Series A total", "$5B valuation", "90K sqft Robot Park"], "keyPoints": ["Apollo 2 공개", "Series A $935M", "DeepMind 온디바이스"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-apollo2-935m-robotpark-2026-08')::bytea), 'hex'));

-- Tesla Q2 SEC + AI5
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus: Q2 SEC 제출 "Fremont 생산 올해 내", AI5 칩 + xAI Grok 음성 통합',
  'Tesla SEC filing / Electrek / Basenor',
  'https://www.basenor.com/pages/tesla-optimus-tracker',
  '2026-07-22'::timestamp,
  'Tesla Q2 SEC 제출(7/22): Fremont Optimus 건설 착수, 올해 내 생산 예정. V3: 173cm/57kg/22DOF손/50 액추에이터. AI5칩+xAI Grok 음성. 소비자 2027말 이후.',
  'Tesla Q2 2026 주주 업데이트(SEC 7/22 제출)에서 "Fremont Factory for Optimus 건설 착수, 올해 내 생산 예정"을 공식 확인했다. Optimus V3 스펙: 173cm(5''8"), 57kg, 22 DOF 손, 50개 액추에이터. 신규 AI5 칩과 xAI Grok 음성 인터페이스를 통합했다. 소비자 판매는 2027년 말 이후 목표이며, 현재 Tesla 자체 공장 내부에서만 가동 중이다. Cortex 2.0(250MW)이 4월 온라인 가동, Phase 2(500MW) 중반 목표. 초기 생산 속도는 "예측 불가" 수준이나 연 1M대 라인 구축이 최종 목표.',
  'ko', 'product', 'robot',
  encode(sha256(('tesla-q2-sec-ai5-grok-optimus-2026-07')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla", "xAI"], "mentionedRobots": ["Optimus V3"], "technologies": ["AI5 chip", "xAI Grok voice", "Cortex 2.0"], "marketInsights": ["SEC confirmation of 2026 production", "consumer availability end 2027+"], "keyPoints": ["Q2 SEC 공식 확인", "AI5+xAI Grok 통합", "2027 소비자 판매 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-q2-sec-ai5-grok-optimus-2026-07')::bytea), 'hex'));

-- 1X NEO hand upgrade
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X NEO: 25 DOF 신형 손 공개, 인간 수준 조작 목표, 첫 출하분 탑재',
  'Dezeen / Forbes / TheRobotReport',
  'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
  '2026-07-13'::timestamp,
  '1X NEO 25 DOF 신형 손 공개(7/13). 인간 수준 조작. 첫 배송분 탑재. San Carlos 2호 공장 올해 가동. Hayward 58K sqft 풀 생산 중.',
  '1X Technologies가 2026년 7월 13일 NEO 로봇의 신형 손을 공개했다. 25개 관절(25 DOF)로 인간 수준의 조작 능력을 목표한다. 첫 출하분에 탑재 예정이며, 2026년 내 가정 배송 시작 약속을 유지하고 있다. Hayward 공장(58K sqft, 200+명)에서 풀 생산이 가동 중이며, San Carlos 2호 공장이 올해 내 온라인 가동 예정이다. NEO는 기본 정리정돈, 물건 가져오기, 문 열기, 빨래 접기 등 가정 태스크를 수행할 수 있다.',
  'ko', 'technology', 'robot',
  encode(sha256(('1x-neo-25dof-hand-san-carlos-2026-07')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies"], "mentionedRobots": ["NEO"], "technologies": ["25 DOF hand", "human-level manipulation"], "marketInsights": ["San Carlos 2nd factory 2026", "shipping to homes 2026"], "keyPoints": ["25 DOF 신형 손", "San Carlos 2호 공장", "2026 가정 배송"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-25dof-hand-san-carlos-2026-07')::bytea), 'hex'));

-- AGIBOT 15K + G2 deployment
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT: 누적 15,000대 양산, G2 태블릿 생산라인 실투입(세계 최초), 8개 제품 라인',
  'Forbes / Pandaily / PRNewswire',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/15/world-first-humanoid-robot-on-live-industrial-scale-electronics-production-line/',
  '2026-08-01'::timestamp,
  'AGIBOT 6월 초 15,000대 달성. G2 태블릿 생산라인 투입(세계 최초 전자제품). 8개 제품 라인. Unitree와 중국 듀오폴리. MIIT: 2026 중국 10만대 전망.',
  'AGIBOT이 2026년 6월 초 누적 15,000대 생산을 달성했다. 휠드 G2 휴머노이드가 태블릿 PC 실제 산업 생산라인에 인간과 함께 투입되었으며, 이는 휴머노이드 최초의 라이브 전자제품 생산 배포 사례다. 현재 8개 제품 라인을 운용 중: A2 이족형($100K-$190K), A3 Expedition, G2 산업용 휠드, X2 교육용, D2 Max 사족보행, OmniHand 3 등. Unitree(11,000대)와 함께 중국 휴머노이드 시장에서 듀오폴리를 형성하고 있다. MIIT 기준 2026년 중국 전체 휴머노이드 생산 10만대 초과 전망(2025년 약 2만대 대비 5배).',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-15k-g2-electronics-duopoly-2026-08')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Unitree"], "mentionedRobots": ["G2", "A2", "A3", "X2", "D2 Max"], "technologies": ["live electronics production deployment"], "marketInsights": ["15K cumulative production", "world-first electronics line deployment", "China duopoly", "100K+ Chinese production 2026"], "keyPoints": ["15,000대 양산", "G2 태블릿 라인 실투입", "중국 듀오폴리"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-15k-g2-electronics-duopoly-2026-08')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "ipo_status", "new_value": "상하이 STAR Market 상장 (688836), $9B 밸류, 첫날 460% 급등 (2026.8.19)", "source": "Bloomberg, CNBC, Yahoo Finance", "reliability": "A"}, {"field": "market_cap", "new_value": "첫날 종가 기준 약 $50B+ 시총 (845위안/주 × 전체 주식)", "source": "Bloomberg 2026-08-18", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%STAR Market%688836%$9B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "atlas-commercial", "updates": [{"field": "gen5_design", "new_value": "5세대: 부품 수 ~10배 감소(order of magnitude), 양산 비용/시간 대폭 절감", "source": "Forbes 2026-07-02", "reliability": "A"}, {"field": "mass_production", "new_value": "완전 전동식 양산 전환 진행 중, Hyundai 2028 30K/yr 공장", "source": "Forbes, StartupFortune", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%5세대%order of magnitude%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "production_milestone", "new_value": "BotQ 1,000번째 Figure 03 (2026.7.23), 1대/시간 생산율", "source": "Figure AI official, Axis Intelligence", "reliability": "A"}, {"field": "bmw_expansion", "new_value": "F.02 은퇴 → Figure 03 업그레이드, BMW Leipzig 확대(2026 여름), 유럽 추가 평가", "source": "BMW Group, iFactory", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%1,000번째%Figure 03%1대/시간%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "sec_confirmation", "new_value": "Q2 SEC 제출(7/22): Fremont 건설 착수, 올해 내 생산 예정", "source": "Tesla SEC Q2 filing", "reliability": "A"}, {"field": "ai_integration", "new_value": "AI5 칩 + xAI Grok 음성 인터페이스 통합", "source": "Basenor, Electrek", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Q2 SEC%AI5%xAI Grok%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "apollo_2", "new_value": "Apollo 2 공개(6월): 이족/휠 겸용 훈련 플랫폼, Robot Park 90K sqft", "source": "Automate.org, TheRobotReport", "reliability": "B"}, {"field": "funding_total", "new_value": "Series A 총 $935M ($520M 확장), 기업가치 $5B", "source": "CNBC, Apptronik official", "reliability": "A"}, {"field": "ai_platform", "new_value": "Google DeepMind Gemini Robotics On-Device 탑재, 50-100회 시연 학습", "source": "Apptronik official", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Apollo 2%$935M%Robot Park%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "hand_upgrade", "new_value": "25 DOF 신형 손 공개(7/13), 인간 수준 조작, 첫 출하분 탑재", "source": "Dezeen 2026-07-13", "reliability": "B"}, {"field": "production_expansion", "new_value": "San Carlos 2호 공장 2026년 내 가동 예정", "source": "Forbes, TheRobotReport", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%25 DOF%San Carlos%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "production_milestone", "new_value": "누적 15,000대 양산 달성 (2026년 6월 초)", "source": "Forbes, Pandaily", "reliability": "A"}, {"field": "deployment", "new_value": "G2 태블릿 PC 실제 생산라인 투입 (세계 최초 전자제품 라인)", "source": "Forbes 2026-04-15", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%15,000대%태블릿%세계 최초%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Bloomberg/CNBC/Yahoo Finance', 'https://www.bloomberg.com/news/articles/2026-08-18/unitree-robotics-set-to-debut-after-904-million-shanghai-ipo', 'Unitree 상하이 STAR Market IPO — $9B 밸류, 첫날 460% 급등', '688836 상장. 150.8위안/주. 8,000배 초과청약. 중국 최초 휴머노이드 상장. 61억위안 조달.'),
  ('Forbes', 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/', 'BD Atlas 5세대: 부품 수 10배 감소, 양산 비용 대폭 절감', '제조 시간↓, 신뢰성↑, 비용↓. Hyundai 30K/yr 공장 2028. $200K→인하.'),
  ('Figure AI/Axis Intelligence', 'https://axis-intelligence.com/figure-ai-statistics/', 'Figure AI BotQ 1,000번째 Figure 03, 생산율 24배 향상', '7/23 밀리스톤. 120일 1/일→1/시간. F.02 BMW 은퇴. Leipzig 확대.'),
  ('CNBC/Automate.org', 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html', 'Apptronik Apollo 2 공개 + $935M Series A + DeepMind 파트너십', 'Apollo 2 이족/휠 겸용. Robot Park 90K sqft. Gemini Robotics. $5B 밸류.'),
  ('Tesla SEC/Electrek', 'https://www.basenor.com/pages/tesla-optimus-tracker', 'Tesla Optimus Q2 SEC: Fremont 올해 내 생산 + AI5 + xAI Grok', 'SEC 7/22. V3: 173cm/57kg/22DOF/50 액추에이터. 소비자 2027말.'),
  ('Dezeen/Forbes', 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/', '1X NEO 25 DOF 신형 손 공개, San Carlos 2호 공장 예정', '25관절 인간 수준. 첫 배송분 탑재. 2호 공장 올해 가동.'),
  ('Forbes/Pandaily', 'https://www.forbes.com/sites/johnkoetsier/2026/04/15/world-first-humanoid-robot-on-live-industrial-scale-electronics-production-line/', 'AGIBOT 15,000대 + G2 태블릿 라인(세계 최초)', '6월 15K. 전자제품 실투입. Unitree와 듀오폴리. 중국 100K 전망.'),
  ('RoboZaps/State Media', 'https://blog.robozaps.com/b/humanoid-robot-news-week-august-17-24-2026', '2026 World Robot Conference 베이징 8/19-23', '300+전시사, 3000+제품, 300+데뷔. 휴머노이드 주력. 로봇게임 666팀 2056대.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
