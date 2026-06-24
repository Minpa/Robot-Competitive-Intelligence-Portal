-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-24
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-24T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] Unitree - 미 국방부 1260H 중국 군사 연계 기업 목록 공식 등재 (2026-06-08)
-- ※ 6/20 업데이트의 '의회 검토'(C등급)에서 실제 공식 지정으로 격상 (A등급)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'score_spike', 'critical',
  'Unitree: 미 국방부 1260H 중국 군사 연계 기업 목록 공식 등재 (2026.6.8)',
  '미 국방부(Pentagon)가 2026년 6월 8일 Unitree Robotics를 Section 1260H 중국 군사 연계 기업 목록에 공식 등재. Alibaba, Baidu, BYD와 함께 추가됨. 총 188개사 목록. DoD 직접 계약 즉시 금지, 2027년 6월부터 제3자 통한 조달도 금지. Unitree는 "혁신형 중소기업 지정에 따른 정부 지원을 수령"한 것이 지정 사유. STAR Market IPO 및 서방 시장 확장에 중대 리스크.',
  '{"source": "TechCrunch, CNBC, WilmerHale, GulfNews", "date": "2026-06-08", "reliability": "A", "details": {"list": "Section 1260H", "total_companies": 188, "co_listed": ["Alibaba", "Baidu", "BYD"], "immediate_impact": "DoD direct contracting prohibited", "2027_impact": "third-party procurement prohibited", "reason": "government assistance as innovative SME", "ipo_risk": "STAR Market IPO process"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'score_spike'
  AND title LIKE '%1260H%공식 등재%'
);

-- [B] Figure 03 - 98.5% 인간 대비 패키지 처리 10시간 라이브스트림 달성
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'score_spike', 'warning',
  'Figure 03: 10시간 패키지 처리 라이브스트림에서 인간 대비 98.5% 성능 달성',
  'Figure AI가 2026년 5월 Figure 03 그룹을 활용해 논스톱 거의 1주간 패키지 처리를 라이브 스트리밍. 10시간 인간 vs 로봇 경쟁에서 로봇이 인간 대비 98.5% 수행률 기록. 장시간 자율 작업에서의 인간 수준 접근을 실증. Figure 02는 BMW에서 30,000대 차량, 90,000개 이상 부품 처리 후 은퇴.',
  '{"source": "Wikipedia/Figure AI, CNBC", "date": "2026-05", "reliability": "B", "details": {"test_duration": "10 hours", "human_parity": "98.5%", "livestream_duration": "nearly 1 week nonstop", "figure02_retirement": {"vehicles": 30000, "parts": 90000, "duration": "11 months"}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'score_spike'
  AND title LIKE '%98.5%라이브스트림%'
);

-- [A] Tesla Optimus - AWE 2026 상해 전시 & Gen 3 24/7 공장 시프트 테스트
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'partnership', 'info',
  'Tesla Optimus: AWE 2026 상해 전시 + Gen 3 핸드 24/7 산업 시프트 테스트 시작',
  'Tesla가 AWE 2026 상해에서 Optimus를 전시. Gen 3 핸드(22 DOF, 50 액추에이터)가 Q2 2026 최초 24/7 산업용 시프트 테스트 돌입. V3 풀바디 생산은 2026년 여름 목표(Musk 3/12 Abundance Summit 확인). 최초 외부 상용 고객(제조/물류/반도체 팹)은 2026년 말 예정.',
  '{"source": "Teslarati, optimusk.blog, TechTimes", "date": "2026-06", "reliability": "A", "details": {"event": "AWE 2026 Shanghai", "gen3_hand_test": "first 24/7 industrial shift Q2 2026", "v3_full_body": "Summer 2026", "first_customers": "late 2026 enterprise (manufacturing, logistics, semiconductor)", "hand_specs": "22 DOF, 50 actuators, tendon-driven"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'partnership'
  AND title LIKE '%AWE 2026%24/7%'
);

-- [B] Agility Digit - AMR 통합(MiR, Zebra) + GXO 1년 연속 운영 + RBR50 수상
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'score_spike', 'info',
  'Agility Digit: MiR/Zebra AMR 통합 완료, GXO 1년 연속 운영, RBR50 올해의 로봇 수상',
  'Digit이 MiR 및 Zebra Robotics AMR과 통합 완료하여 기존 물류 자동화 시스템과 원활 연동. GXO 물류센터에서 1년간 연속 운영 달성. 신형 강화 사지(limbs)와 엔드이펙터로 그래핑 각도 확대. Robot Report RBR50 올해의 로봇 수상(상용 수익 창출 유일 이족보행 로봇). ISO 기능안전 인증 약 18개월 내(2026 중후반) 완료 전망.',
  '{"source": "AgilityRobotics.com, RobotReport, OriginOfBots", "date": "2026-06", "reliability": "B", "details": {"amr_partners": ["MiR", "Zebra Robotics"], "gxo_continuous_ops": "1 year", "award": "RBR50 Robot of the Year", "new_hardware": "robust limbs and end effectors", "iso_safety_timeline": "~18 months (mid-late 2026)", "revenue_status": "only bipedal robot generating commercial revenue"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'score_spike'
  AND title LIKE '%MiR%Zebra%RBR50%'
);

-- [B] Apptronik Apollo - 차세대 로봇 1년간 테스트 중, $5.5B 밸류에이션
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'score_spike', 'warning',
  'Apptronik: 차세대 Apollo 후속 로봇 1년간 비공개 테스트 중, 밸류에이션 $5.5B',
  'Automate.org 보도에 따르면 Apptronik이 차세대 휴머노이드 로봇을 약 1년간 비공개 테스트 중. 2026년 내 공식 데뷔 예정. 밸류에이션 $5.5B(이전 $5.3B에서 상향). 총 자본 약 $1B. Mercedes-Benz 공장 + GXO 창고에서 현재 Apollo 활발 테스트. 22시간/일, 7일/주 가동. 핫스왑 배터리.',
  '{"source": "Automate.org, Robozaps, TheRobotReport", "date": "2026-06", "reliability": "B", "details": {"next_gen_test_duration": "~1 year", "debut_timeline": "2026", "valuation": "$5.5B", "total_capital": "~$1B", "active_testing": ["Mercedes-Benz factory", "GXO warehouse"], "specs": {"height": "5ft8in", "weight": "160lbs", "payload": "55lbs", "daily_operation": "22 hours"}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'score_spike'
  AND title LIKE '%차세대%1년간%테스트%'
);

-- [A] Agibot - MWC 2026 바르셀로나 + ICRA 2026 비엔나 + RaaS 17개국
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'partnership', 'info',
  'AGIBOT: MWC 바르셀로나/ICRA 비엔나 전시, RaaS 17개국 확장, C5 신제품',
  'AGIBOT이 MWC 2026 바르셀로나에서 풀 포트폴리오(A2/X2/G2/D1/C5) 전시. RaaS(Robot-as-a-Service) 모델을 유럽(스페인/독일/프랑스/이탈리아/영국), 북미, 말레이시아 등 17개국으로 확장. ICRA 2026 비엔나(6월)에서 AGIBOT World Challenge 개최. 신규 C5 자율 청소 로봇 라인 추가.',
  '{"source": "AGIBOT.com, PRNewswire (CES Awards), ICRA 2026", "date": "2026-06", "reliability": "A", "details": {"mwc_location": "Barcelona, March 2026", "icra_location": "Vienna, June 2026", "raas_countries": 17, "raas_markets": ["Spain", "Germany", "France", "Italy", "UK", "North America", "Malaysia"], "new_product": "C5 autonomous cleaning robot", "portfolio": ["A2", "X2", "G2", "D1", "C5"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'partnership' AND title LIKE '%AGIBOT%MWC%ICRA%RaaS%'
)
LIMIT 1;

-- [A] Boston Dynamics Atlas - 상세 스펙 확인 + 2028/2030 로드맵
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'score_spike', 'info',
  'Boston Dynamics Atlas: 상세 스펙 공개 (7.5ft 리치/50kg 적재) + 2028-2030 로드맵',
  'Atlas 상용 버전 상세 스펙 확인: 리치 7.5ft(228cm), 적재 110lbs(50kg), 운영 온도 -20°C~40°C. Gemini Robotics VLA(Visual-Language-Action) 통합으로 지시 이해/복잡 환경 해석/적응형 작업 실행 가능. 2028년 대규모 고정밀 시퀀싱, 2030년 복잡 조립 작업 로드맵.',
  '{"source": "BostonDynamics.com, Automate.org, Engadget, TheRegister", "date": "2026-06", "reliability": "A", "details": {"reach_ft": 7.5, "payload_lbs": 110, "temp_range_f": "-4 to 104", "ai_integration": "Gemini Robotics VLA", "roadmap_2028": "high-precision sequencing at scale", "roadmap_2030": "complex assembly tasks", "hyundai_factory": "30000 units/year by 2028"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'score_spike'
  AND title LIKE '%7.5ft%2028-2030%'
);

-- [A] 1X NEO - San Carlos 제2공장 + Redwood AI 모델
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'mass_production', 'info',
  '1X NEO: San Carlos 제2공장 건설 중, 2027년 연 100K대 목표, Redwood AI 모델',
  '1X Technologies가 Hayward 공장(200+명, 10K/년) 외에 San Carlos 제2공장 건설 중. 자동화 업그레이드 진행 중이며, 2027년 말 연 100,000대 생산 목표. NEO용 Redwood AI 모델로 가정 자율 작업 수행. CES 2026에서 소비자용 가정 로봇으로 공식 발표. $200 보증금 + $20K 구매 또는 $499/월 구독.',
  '{"source": "1X.tech, eWeek, Notebookcheck, TheRobotReport", "date": "2026-06", "reliability": "A", "details": {"factory_1": "Hayward, CA (200+ staff, 10K/yr)", "factory_2": "San Carlos, CA (under construction)", "2027_target": "100K units/year", "ai_model": "Redwood", "pricing": {"purchase": "$20,000", "deposit": "$200", "subscription": "$499/month"}, "ces_2026": "official consumer home robot unveiling"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'mass_production'
  AND title LIKE '%San Carlos%Redwood%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Unitree Pentagon 1260H listing
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Pentagon이 Unitree를 Section 1260H 중국 군사 연계 기업 목록에 공식 등재',
  'TechCrunch / CNBC',
  'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/',
  '2026-06-08'::timestamp,
  '미 국방부가 Unitree Robotics를 Alibaba, Baidu, BYD와 함께 Section 1260H 중국 군사 연계 기업 목록(188사)에 공식 등재. DoD 직접 계약 즉시 금지, 2027.6부터 제3자 조달도 금지.',
  '미 국방부(Pentagon)가 2026년 6월 8일 Unitree Robotics를 Section 1260H 중국 군사 연계 기업 목록에 공식 등재했다. Alibaba, Baidu, BYD를 포함해 65개 신규 기업이 추가되어 총 188사가 된 이 목록은 2021 국방수권법에 근거한다. 즉시 DoD 직접 계약이 금지되며, 2027년 6월부터는 제3자를 통한 제품/서비스 조달도 금지된다. Unitree 측은 "혁신형 중소기업 지정에 따른 정부 보조금 수령"이 지정 사유라며 반박. STAR Market IPO 심사 중인 시점과 맞물려 서방 시장 확장 및 IPO 프로세스에 중대 리스크.',
  'ko', 'regulation', 'robot',
  encode(sha256(('unitree-pentagon-1260h-2026-06-08')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Alibaba", "Baidu", "BYD"], "mentionedRobots": ["G1", "H1", "H2"], "technologies": [], "marketInsights": ["1260H military list", "DoD contract ban", "third-party procurement ban 2027", "IPO risk"], "keyPoints": ["Pentagon 1260H 공식 등재", "DoD 직접계약 즉시 금지", "STAR IPO 프로세스 리스크"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-pentagon-1260h-2026-06-08')::bytea), 'hex'));

-- Figure 03 98.5% human parity
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure 03: 10시간 인간 vs 로봇 패키지 처리 경쟁에서 98.5% 인간 대비 성능 달성',
  'Wikipedia/Figure AI, KraneShares',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '2026-05-20'::timestamp,
  'Figure AI가 Figure 03 그룹의 논스톱 패키지 처리를 약 1주간 라이브 스트리밍. 10시간 인간 대비 경쟁에서 98.5% 수행률 기록. Figure 02는 BMW 30K 차량/90K 부품 처리 후 공식 은퇴.',
  'Figure AI는 2026년 5월 Figure 03 로봇 그룹을 활용한 패키지 처리 작업을 거의 1주간 논스톱으로 라이브 스트리밍했다. 하이라이트인 10시간 인간 대 로봇 경쟁에서 Figure 03이 인간 작업자 대비 98.5% 수행률을 기록하며 장시간 자율 작업에서의 인간 수준 접근을 실증했다. 한편 Figure 02는 BMW Spartanburg에서 약 11개월간 30,000대 X3 차량 생산을 지원하고 90,000개 이상의 판금 부품을 로딩한 후 공식 은퇴했다.',
  'ko', 'technology', 'robot',
  encode(sha256(('figure03-98pct-human-parity-2026-05')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03", "Figure 02"], "technologies": ["autonomous package processing", "human-robot performance benchmark"], "marketInsights": ["98.5% human parity in 10h test", "F.02 retired after 30K vehicles"], "keyPoints": ["10시간 경쟁 98.5% 인간 대비", "1주 논스톱 라이브스트림", "Figure 02 BMW 11개월 후 은퇴"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure03-98pct-human-parity-2026-05')::bytea), 'hex'));

-- Tesla Optimus AWE Shanghai
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus AWE 2026 상해 전시: Gen 3 핸드 24/7 시프트 테스트 진행 중',
  'Teslarati',
  'https://www.teslarati.com/tesla-optimus-awe-2026-shanghai/',
  '2026-06-15'::timestamp,
  'Tesla가 AWE 2026 상해에서 Optimus 전시. Gen 3 핸드(22 DOF/50 액추에이터) 최초 24/7 산업 시프트 테스트 Q2 시작. V3 풀바디 2026 여름, 외부 고객 2026 말.',
  'Tesla가 중국 상해에서 열린 AWE(Augmented World Expo) 2026에 Optimus 휴머노이드 로봇을 전시했다. Gen 3 핸드는 22 자유도, 팔당 25개(총 50개) 액추에이터를 건(tendon) 구동 방식으로 구현하여 기존 대비 약 2배의 손재주를 제공한다. Q2 2026부터 최초 24/7 산업 시프트 테스트에 돌입했으며, V3 풀바디 생산은 Elon Musk가 3월 12일 Abundance Summit에서 2026년 여름으로 확인했다. 최초 외부 상용 고객(자동차/물류/반도체)은 2026년 말 예정.',
  'ko', 'product', 'robot',
  encode(sha256(('tesla-optimus-awe-shanghai-2026-06')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus Gen 3"], "technologies": ["tendon-driven hands", "22 DOF", "50 actuators"], "marketInsights": ["AWE 2026 China showcase", "Q2 24/7 shift test", "V3 summer 2026"], "keyPoints": ["AWE 2026 상해 전시", "Gen 3 핸드 24/7 산업 테스트", "V3 2026 여름 생산"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-awe-shanghai-2026-06')::bytea), 'hex'));

-- Agility Digit AMR integration + RBR50
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Digit: MiR/Zebra AMR 통합, GXO 1년 연속 운영 달성, RBR50 올해의 로봇',
  'AgilityRobotics.com / RobotReport',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
  '2026-06-10'::timestamp,
  'Digit이 MiR, Zebra Robotics AMR과 통합. GXO에서 1년 연속 운영 달성. 신형 사지+엔드이펙터. RBR50 올해의 로봇 수상. ISO 기능안전 18개월 내.',
  'Agility Robotics가 Digit 최신 혁신을 발표했다. MiR 및 Zebra Robotics 등 업계 선도 AMR(자율 이동 로봇)과의 통합이 완료되어 기존 물류 자동화 인프라와 원활히 연동된다. GXO Logistics 창고에서 자율 터거(tugger)에서 토트를 언로딩하여 컨베이어에 적재하는 작업을 1년간 연속 수행했다. 신형 강화 사지(limbs)와 엔드이펙터로 그래핑 각도가 확대되어 새로운 유스케이스가 열렸다. Robot Report의 RBR50 올해의 로봇상을 수상하며 상용 수익을 창출하는 유일한 이족보행 로봇으로 인정받았다.',
  'ko', 'technology', 'robot',
  encode(sha256(('agility-digit-amr-rbr50-2026-06')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "MiR", "Zebra Robotics", "GXO"], "mentionedRobots": ["Digit"], "technologies": ["AMR integration", "new limbs/end effectors", "ISO functional safety"], "marketInsights": ["only revenue-generating bipedal", "RBR50 award"], "keyPoints": ["MiR/Zebra AMR 통합", "GXO 1년 연속 운영", "RBR50 올해의 로봇"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-amr-rbr50-2026-06')::bytea), 'hex'));

-- Apptronik next-gen testing
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik: 차세대 Apollo 후속 로봇 1년간 비공개 테스트, 2026년 데뷔 예정',
  'Automate.org',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-06-12'::timestamp,
  'Apptronik이 차세대 휴머노이드를 약 1년간 비공개 테스트 중. 2026년 내 공식 데뷔. 밸류에이션 $5.5B(상향). Mercedes-Benz/GXO 활발 테스트.',
  'Automate.org에 따르면 Apptronik이 Apollo 후속 차세대 휴머노이드 로봇을 약 1년간 비공개로 테스트해왔다. 2026년 내 공식 데뷔가 예정되어 있다. 밸류에이션은 $5.5B로 이전 $5.3B에서 상향되었으며 총 자본은 약 $1B에 달한다. 현재 Apollo는 Mercedes-Benz 공장과 GXO 창고에서 활발히 테스트 중이며, 5ft8in/160lbs, 55lbs 적재, 22시간/일 가동, 핫스왑 배터리를 특징으로 한다.',
  'ko', 'product', 'robot',
  encode(sha256(('apptronik-nextgen-testing-2026-06')::bytea), 'hex'),
  '2b53d7b2-ddfe-45bd-8e21-f545d3566f4d',
  '{"mentionedCompanies": ["Apptronik", "Mercedes-Benz", "GXO"], "mentionedRobots": ["Apollo", "next-gen Apollo"], "technologies": ["hot-swappable battery", "modular design"], "marketInsights": ["$5.5B valuation", "next-gen 2026 debut", "~$1B total capital"], "keyPoints": ["차세대 로봇 1년 비공개 테스트", "2026년 데뷔 예정", "$5.5B 밸류에이션 상향"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-nextgen-testing-2026-06')::bytea), 'hex'));

-- AGIBOT MWC + ICRA + RaaS
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT: MWC 바르셀로나 풀 포트폴리오 전시, RaaS 17개국, ICRA 2026 World Challenge',
  'AGIBOT.com / PRNewswire',
  'https://www.agibot.com/article/231/detail/44.html',
  '2026-06-01'::timestamp,
  'MWC 2026 바르셀로나에서 A2/X2/G2/D1/C5 풀 라인업 전시. RaaS 17개국(유럽 5개국 포함). ICRA 2026 비엔나에서 World Challenge 개최. CES Best Robot 다수 수상.',
  'AGIBOT이 MWC 2026 바르셀로나에서 전체 휴머노이드 포트폴리오를 전시했다. A2(대형 휴머노이드/접객·가이드), X2(소형/교육·연구), G2(휠드/산업 정밀 조립), D1(쿼드러패드/물류·순찰), C5(자율 청소) 라인업이다. RaaS(Robot-as-a-Service) 유연 리스 모델을 17개국(스페인/독일/프랑스/이탈리아/영국/북미/말레이시아 등)에 전개 중. ICRA 2026 비엔나(6월)에서 AGIBOT World Challenge를 개최하며 학술 커뮤니티와의 연계를 강화. CES 2026에서 Best of CES 다수 수상.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-mwc-icra-raas-2026-06')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT"], "mentionedRobots": ["A2", "X2", "G2", "D1", "C5"], "technologies": ["RaaS", "reinforcement learning"], "marketInsights": ["RaaS in 17 countries", "CES Best Robot awards", "ICRA academic outreach"], "keyPoints": ["MWC 바르셀로나 전시", "RaaS 17개국 확장", "ICRA 2026 World Challenge"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-mwc-icra-raas-2026-06')::bytea), 'hex'));

-- Boston Dynamics Atlas detailed specs + roadmap
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Boston Dynamics Atlas: 상세 스펙 확인 (7.5ft 리치/50kg) + Gemini Robotics VLA + 2028-2030 로드맵',
  'BostonDynamics.com / TheDecoder',
  'https://the-decoder.com/google-deepminds-gemini-robotics-models-will-power-boston-dynamics-atlas-for-industrial-tasks/',
  '2026-06-15'::timestamp,
  'Atlas 상용 버전: 리치 228cm, 적재 50kg, 운영 -20~40°C. Gemini Robotics VLA 통합. 2028 고정밀 시퀀싱, 2030 복잡 조립. Hyundai 30K/년 공장.',
  'Boston Dynamics Atlas 상용 버전의 상세 사양이 확인되었다. 리치 7.5ft(228cm), 적재 110lbs(50kg), 운영 온도 -4°F~104°F(-20°C~40°C). Google DeepMind의 Gemini Robotics VLA(Visual-Language-Action) 모델이 통합되어 자연어 지시 이해, 복잡 환경 해석, 사전 스크립트 없는 적응형 작업 실행이 가능해진다. 2026년 Hyundai RMAC + Google DeepMind에 초기 배치, 2028년 대규모 고정밀 시퀀싱, 2030년 복잡 조립 작업이 로드맵으로 제시.',
  'ko', 'technology', 'robot',
  encode(sha256(('bd-atlas-specs-roadmap-2026-06')::bytea), 'hex'),
  '7c7e540d-e4ec-4734-920b-875f20989c0a',
  '{"mentionedCompanies": ["Boston Dynamics", "Google DeepMind", "Hyundai"], "mentionedRobots": ["Atlas"], "technologies": ["Gemini Robotics VLA", "visual-language-action"], "marketInsights": ["7.5ft reach 50kg payload", "2028 precision sequencing", "2030 complex assembly"], "keyPoints": ["상세 스펙 228cm/50kg/-20~40C", "Gemini VLA 통합", "2028-2030 로드맵"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('bd-atlas-specs-roadmap-2026-06')::bytea), 'hex'));

-- 1X NEO San Carlos + Redwood
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X Technologies NEO: San Carlos 제2공장 건설, Redwood AI 모델, $20K/$499 구독',
  '1X.tech / eWeek',
  'https://www.1x.tech/discover/neo-factory',
  '2026-06-01'::timestamp,
  'Hayward 공장(200+명, 10K/년) 외 San Carlos 제2공장 건설 중. 2027년 100K/년 목표. Redwood AI로 가정 자율 작업. $20K 구매 + $200 보증금, $499/월 구독.',
  '1X Technologies의 NEO 생산이 Hayward 공장에서 본격 가동 중이다. 200명 이상의 직원이 초기 연 10,000대 생산을 담당한다. San Carlos에 제2공장을 건설 중이며 자동화 업그레이드를 병행하여 2027년 말까지 연 100,000대 목표에 도달할 계획이다. NEO는 Redwood AI 모델을 탑재해 가정 내 자율 작업을 수행한다. CES 2026에서 소비자용 가정 로봇으로 공식 발표되었으며, $20,000 구매(Early Access $200 보증금) 또는 $499/월 구독으로 제공된다.',
  'ko', 'product', 'robot',
  encode(sha256(('1x-neo-sancarlos-redwood-2026-06')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies", "OpenAI"], "mentionedRobots": ["NEO"], "technologies": ["Redwood AI model", "vertical integration"], "marketInsights": ["San Carlos 2nd factory", "100K/yr by 2027", "$20K/$499 pricing"], "keyPoints": ["San Carlos 제2공장 건설", "Redwood AI 탑재", "2027년 100K대 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-sancarlos-redwood-2026-06')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "regulatory_status", "new_value": "미 국방부 1260H 중국 군사 연계 기업 공식 등재 (2026.6.8)", "source": "TechCrunch, CNBC 2026-06-08", "reliability": "A", "note": "DoD 직접계약 즉시 금지, 2027.6 제3자 조달 금지"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%1260H%공식 등재%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "performance_benchmark", "new_value": "10시간 인간 대비 98.5% 패키지 처리 (2026.5 라이브스트림)", "source": "KraneShares, Wikipedia", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%98.5%패키지%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "testing_status", "new_value": "Gen 3 핸드 24/7 산업 시프트 테스트 Q2 2026 시작, AWE 상해 전시", "source": "Teslarati, optimusk.blog", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%AWE%24/7%시프트%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "integration", "new_value": "MiR/Zebra AMR 통합 완료, GXO 1년 연속 운영, RBR50 수상", "source": "AgilityRobotics.com, RobotReport", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%MiR%Zebra%RBR50%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "next_gen", "new_value": "차세대 로봇 1년간 비공개 테스트 중, 2026 데뷔. 밸류 $5.5B 상향", "source": "Automate.org", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%차세대%비공개 테스트%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "global_expansion", "new_value": "MWC 바르셀로나 전시, RaaS 17개국, ICRA 비엔나 World Challenge, C5 신제품", "source": "AGIBOT.com, PRNewswire", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%MWC%RaaS 17%ICRA%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "atlas-commercial", "updates": [{"field": "specs_confirmed", "new_value": "리치 7.5ft/적재 50kg/-20~40C, Gemini VLA, 2028 시퀀싱/2030 조립 로드맵", "source": "BostonDynamics.com, TheDecoder", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%7.5ft%Gemini VLA%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "production_expansion", "new_value": "San Carlos 제2공장 건설, Redwood AI, 2027년 100K 목표", "source": "1X.tech, eWeek", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%San Carlos%Redwood%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TechCrunch/CNBC', 'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/', 'Unitree 미 국방부 1260H 군사 연계 기업 공식 등재', 'Pentagon 공식 발표 2026.6.8. Alibaba/Baidu/BYD와 함께 188사 목록. DoD 계약 즉시 금지, 2027.6 제3자 조달 금지.'),
  ('KraneShares/FigureAI', 'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/', 'Figure 03: 10시간 인간 대비 98.5% 패키지 처리 달성', '약 1주 논스톱 라이브스트림. F.02 BMW 30K 차량 후 은퇴.'),
  ('Teslarati', 'https://www.teslarati.com/tesla-optimus-awe-2026-shanghai/', 'Tesla Optimus AWE 2026 상해 전시, Gen 3 핸드 24/7 시프트', 'Gen 3 핸드 22DOF/50액추에이터 건구동. V3 풀바디 2026 여름.'),
  ('AgilityRobotics', 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit', 'Digit MiR/Zebra AMR 통합, GXO 1년 연속, RBR50 수상', 'AMR 통합으로 물류 자동화 원활 연동. 유일 수익 창출 이족보행 로봇.'),
  ('Automate.org', 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup', 'Apptronik 차세대 로봇 1년 비공개 테스트, 2026 데뷔', '밸류 $5.5B. Mercedes/GXO 활발 테스트 중. 총 자본 ~$1B.'),
  ('AGIBOT.com/PRNewswire', 'https://www.agibot.com/article/231/detail/44.html', 'AGIBOT MWC 바르셀로나 + ICRA 비엔나 + RaaS 17개국', 'A2/X2/G2/D1/C5 풀 라인업. 유럽 5개국+북미+아시아 17개국 RaaS.'),
  ('TheDecoder/BD', 'https://the-decoder.com/google-deepminds-gemini-robotics-models-will-power-boston-dynamics-atlas-for-industrial-tasks/', 'Atlas 상세 스펙 7.5ft/50kg + Gemini VLA + 2028-2030 로드맵', 'VLA 통합으로 적응형 작업 실행. Hyundai 30K/년 공장 2028.'),
  ('1X.tech/eWeek', 'https://www.1x.tech/discover/neo-factory', '1X NEO San Carlos 제2공장, Redwood AI, 2027 100K 목표', 'Hayward 200명+/10K. San Carlos 건설 중. $20K 또는 $499/월.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
