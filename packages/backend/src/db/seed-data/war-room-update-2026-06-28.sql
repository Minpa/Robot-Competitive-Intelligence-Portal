-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-28
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-28T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] OpenAI - 내부 로보틱스 디비전 공식 출범 (2026.5.31)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'partnership', 'critical',
  'OpenAI: 내부 Robotics Division 공식 출범 — Tesla Optimus 직접 경쟁자 부상',
  'Sam Altman이 2026년 5월 31일 OpenAI 내부 로보틱스 디비전 공식 출범을 발표. Aditya Ramesh(DALL-E 창시자)가 이끌며, 커스텀 액추에이터 설계·시뮬레이션·대규모 데이터 수집 등 11개 전문직 채용 중. 단기 목표: 인프라 건설 보조 로봇, 장기 비전: 범용 개인 로봇. Figure AI와의 결별 후 자체 하드웨어 전환. 2021년 로보틱스 팀 해산 이후 최대 규모 로보틱스 투자. Tesla Optimus 상업화 이전에 직접 경쟁자로 등장.',
  '{"source": "HumanoidsDailycom, RobotsBeat, Yahoo Finance, TechFundingNews", "date": "2026-05-31", "reliability": "A", "details": {"division_lead": "Aditya Ramesh (DALL-E creator)", "hiring_roles": 11, "location": "San Francisco", "short_term_focus": "infrastructure and construction robots", "long_term_vision": "ubiquitous personal robots", "figure_ai_split": "Figure CEO claimed they fired OpenAI", "previous_robotics_team": "disbanded 2021", "competitive_impact": "direct Tesla Optimus competitor"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'partnership'
  AND title LIKE '%OpenAI%Robotics Division%'
);

-- [A] 중국 정부 - 휴머노이드 로봇 10,000대 상업 배치 국가 이니셔티브 (2026.6.10)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'critical',
  '중국 정부: 2026년 말까지 휴머노이드 로봇 10,000대 이상 상업 배치 국가 목표 발표',
  '중국 정부가 2026년 말까지 10,000대 이상의 휴머노이드 로봇을 상업 운영에 투입하는 국가 이니셔티브를 발표. Robotera가 China Post/SF Express와 10개 이상 물류센터에 배치하여 인간 대비 85% 효율 달성. AGIBOT·Unitree 양사가 중국 휴머노이드 시장 80% 점유 전망(TrendForce). 한국·일본·유럽 기업의 중국 시장 진입 장벽 강화 우려.',
  '{"source": "Caixin Global, eWeek, TrendForce", "date": "2026-06-10", "reliability": "A", "details": {"target": "10,000+ humanoid robots in commercial use", "deadline": "end of 2026", "robotera_deployment": {"partners": ["China Post", "SF Express"], "logistics_centers": "10+", "efficiency_vs_human": "85%"}, "market_share": {"agibot": "39%", "unitree": "40%", "combined": "~80%"}, "impact": "entry barrier for foreign companies in China market"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%중국%10,000대%국가 목표%'
);

-- [B] Figure AI - Helix-02 듀얼 로봇 협업 데모 (세계 최초 VLA 멀티로봇)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'score_spike', 'warning',
  'Figure AI Helix-02: 세계 최초 단일 VLA 정책으로 두 로봇 협업 — 침실 정리 데모',
  'Figure AI가 2026년 5월 8일 Helix-02 기반 두 대의 Figure 03 로봇이 단일 공유 VLA 정책만으로 침실을 정리하는 데모를 공개. 문 열기, 옷 걸기, 의자 밀어넣기, 쓰레기 치우기, 침대 정리를 중앙 플래너나 로봇 간 메시지 전달 없이 동작만으로 상대 의도를 추론하며 수행. 세계 최초 단일 학습 신경망 기반 멀티로봇 협력 locomanipulation 시연. 자연어 프롬프트("오른쪽 로봇에게 과자 봉지를 전달")로 협업 지시 가능.',
  '{"source": "FigureAI.com, TheRobotReport, TechTimes", "date": "2026-05-08", "reliability": "B", "details": {"demo_date": "2026-05-08", "capability": "dual-robot collaboration with single shared VLA policy", "tasks": ["opening doors", "hanging clothes", "pushing chair", "taking out trash", "making bed"], "key_innovation": "no central planner, no message-passing between robots", "coordination_method": "inferred partner intent from motion alone", "natural_language_control": true, "world_first": "single learned neural network performing multi-robot collaborative locomanipulation from pixels to actions"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'score_spike'
  AND title LIKE '%듀얼 로봇 협업%VLA%'
);

-- [B] Figure AI - Helix-02 8시간 자율 공장 시프트 완수
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'mass_production', 'warning',
  'Figure AI Helix-02: 8시간 완전 자율 공장 시프트 완수 — 산업 자동화 임계점',
  'Figure 03 로봇이 Helix-02 VLA 모델로 구동되어 풀 8시간 자율 공장 시프트를 완수(2026년 5월 14일 발표). 인간 개입 없이 연속 8시간 산업 작업 수행. Figure AI 본사에서는 로봇 수가 인간 직원 수를 초과하는 마일스톤도 달성. BotQ 공장에서 90분당 1대(이전)→60분당 1대로 생산 가속화.',
  '{"source": "TechTimes, InterestingEngineering, explainx.ai", "date": "2026-05-14", "reliability": "B", "details": {"shift_duration": "8 hours", "fully_autonomous": true, "milestone": "robots outnumber humans at Figure AI", "production_rate_update": "1 robot per hour (up from 90 min)", "vla_model": "Helix-02"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'mass_production'
  AND title LIKE '%8시간%자율%시프트%'
);

-- [B] Tesla Optimus - Musk "아직 R&D 단계" 공식 인정, 유용한 작업 미달성
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'score_spike', 'info',
  'Tesla Optimus: Musk "아직 R&D 단계" 공식 인정 — 실질적 유용 작업 미달성',
  '2026년 6월 말 기준 Elon Musk가 Optimus 로봇이 "아직 R&D 단계(still very much in the R&D phase)"이며 "실질적으로 유용한 작업(useful work in a material sense)을 수행하고 있지 않다"고 공식 인정. Gen 3 핸드가 24/7 자율 시프트 테스트 중이나 풀바디 V3 상용 생산은 지연 중. 소비자 판매는 사전주문·예약·보증금 프로그램 없이 2027년 말 이후 목표.',
  '{"source": "optimusk.blog, NewMarketPitch, eWeek", "date": "2026-06", "reliability": "A", "details": {"musk_statement": "still very much in the R&D phase", "useful_work": "no robots doing useful work in a material sense", "gen3_hand_test": "24/7 autonomous shift tests ongoing", "consumer_sale": "no pre-order/waitlist/deposit; target end 2027", "enterprise_sale": "late 2026 target", "estimated_price": "$20-30K"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'score_spike'
  AND title LIKE '%R&D 단계%유용 작업 미달성%'
);

-- [B] Apptronik Apollo - 71 DOF / 25kg 페이로드 스펙 확인, 2026 신모델 데뷔 예정
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'score_spike', 'info',
  'Apptronik Apollo: 71 DOF/25kg 페이로드 스펙 확인 — 경쟁사 중 최다 자유도',
  'Apptronik Apollo의 상세 스펙이 확인됨: 71 DOF(팔, 손, 토르소, 다리), 25kg 페이로드. 경쟁사 대비 최다 자유도(BD Atlas 56 DOF, Figure 03 41 DOF). CEO Jeff Cardenas가 2025년 공개 예정이었으나 개선 작업으로 2026년으로 연기된 차세대 모델의 "곧 공개(public will see the fruits soon)" 재확인. Mercedes-Benz 공장 + GXO 물류 활발 테스트 지속.',
  '{"source": "OriginOfBots, Robozaps, Automate.org", "date": "2026-06", "reliability": "B", "details": {"dof": 71, "payload_kg": 25, "dof_comparison": {"bd_atlas": 56, "figure_03": 41, "digit_v5": 44}, "next_gen_status": "delayed from 2025, debut expected 2026", "active_testing": ["Mercedes-Benz factory", "GXO Logistics warehouse"], "daily_operation_hours": 22, "battery": "hot-swappable"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'score_spike'
  AND title LIKE '%71 DOF%25kg%'
);

-- [B] 산업 전체 - 2026 H1 로보틱스 투자 $55.8B, 전년 기록 2배 근접
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'warning',
  '로보틱스 산업: 2026 H1 투자 $55.8B — 전년 연간 기록의 거의 2배',
  'Crunchbase 데이터에 따르면 로보틱스 기업들이 2026년 상반기에만 $55.8B를 조달, 전년도 연간 기록의 거의 2배에 달함. 주요 조달 건: Figure AI $1B+ ($39B), Apptronik $935M ($5.5B), Neura Robotics $1.4B ($7B, Amazon/Nvidia/Qualcomm). 휴머노이드 로봇 영역에 자본이 집중되며 2027년 대규모 양산 경쟁의 자금 기반 확보. LG 등 대기업에 파트너십·인수 기회와 경쟁 압력 동시 증가.',
  '{"source": "Crunchbase, TechFundingNews, CNBC", "date": "2026-06", "reliability": "B", "details": {"h1_2026_total": "$55.8B", "vs_previous_record": "nearly 2x", "major_rounds": [{"company": "Figure AI", "amount": "$1B+", "valuation": "$39B"}, {"company": "Apptronik", "amount": "$935M", "valuation": "$5.5B"}, {"company": "Neura Robotics", "amount": "$1.4B", "valuation": "$7B"}], "neura_investors": ["Amazon", "Nvidia", "Qualcomm", "Tether"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%$55.8B%2배%'
);

-- [B] Unitree - 1260H 등재 속 JAL 하네다 공항 배치 리스크 부각
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'score_spike', 'warning',
  'Unitree: 미국 1260H 등재 속 JAL 하네다 공항 배치 — 지정학 리스크 부각',
  'TechTimes 보도에 따르면 "JAL Deploys Unitree G1 Robots at Haneda as U.S. Congress Moves to Blacklist Supplier for National Security" — Unitree G1이 하네다공항에 배치되는 동시에 미 의회가 국가안보 이유로 블랙리스트 추진. Pentagon 1260H 등재(6/8) 후 서방 동맹국(일본)의 Unitree 활용이 지정학적 긴장을 야기. JAL의 2년 운영 계약(~2028)에도 불구하고 제재 확대 시 일본 공항 배치에 리스크. LG에도 Unitree 부품 공급망 의존도 점검 필요.',
  '{"source": "TechTimes, CNBC", "date": "2026-05-19", "reliability": "B", "details": {"article_title": "JAL Deploys Unitree G1 Robots at Haneda as U.S. Congress Moves to Blacklist Supplier for National Security", "jal_contract": "2-year trial through 2028", "pentagon_listing_date": "2026-06-08", "geopolitical_risk": "US ally (Japan) using 1260H-listed Chinese robotics", "lg_consideration": "supply chain dependency review needed"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'score_spike'
  AND title LIKE '%1260H%JAL%지정학%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- OpenAI Robotics Division
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  'OpenAI 내부 Robotics Division 공식 출범 — Sam Altman, 범용 로봇 시대 선언',
  'HumanoidsDailycom / RobotsBeat / Yahoo Finance',
  'https://robotsbeat.com/openai-robotics-division-humanoid-robots-altman-tesla-optimus-competitor/',
  '2026-05-31'::timestamp,
  'Sam Altman이 OpenAI 내부 로보틱스 디비전 출범 발표. Aditya Ramesh(DALL-E) 리드. 액추에이터·시뮬레이션·데이터 11개직 채용. Figure AI 결별 후 자체 하드웨어 전환. Tesla Optimus 직접 경쟁.',
  'Sam Altman CEO가 2026년 5월 31일 OpenAI의 내부 Robotics Division 공식 출범을 발표했다. DALL-E 창시자 Aditya Ramesh가 리드하며, 샌프란시스코 기반으로 커스텀 액추에이터 설계, 시뮬레이션 엔지니어링, 대규모 데이터 수집 운영 등 11개 전문직을 채용 중이다. 단기 목표는 인프라·건설 보조 로봇이며, 장기 비전은 범용 개인 로봇이다. Figure AI CEO가 "OpenAI를 해고했다"고 주장한 고프로파일 결별 이후, OpenAI가 자체 하드웨어 진입을 결정한 것이다. 2021년 로보틱스 팀 해산 이후 최대 규모의 로보틱스 투자이며, Tesla Optimus 상업화 이전에 직접 경쟁자로 등장했다.',
  'ko', 'industry', 'robot',
  encode(sha256(('openai-robotics-division-launch-2026-05-31')::bytea), 'hex'),
  '{"mentionedCompanies": ["OpenAI", "Tesla", "Figure AI"], "mentionedRobots": ["Optimus"], "technologies": ["custom actuator design", "simulation engineering", "large-scale data acquisition"], "marketInsights": ["OpenAI enters robotics hardware", "direct Tesla Optimus competitor", "Figure AI split"], "keyPoints": ["OpenAI Robotics Division 공식 출범", "Aditya Ramesh 리드", "Tesla Optimus 직접 경쟁"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('openai-robotics-division-launch-2026-05-31')::bytea), 'hex'));

-- China 10K humanoid initiative
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  '중국 정부, 2026년 말 휴머노이드 로봇 10,000대 상업 배치 국가 목표 발표',
  'Caixin Global / eWeek',
  'https://www.caixinglobal.com/2026-06-10/china-targets-10000-humanoid-robots-in-commercial-use-by-end-2026-102452656.html',
  '2026-06-10'::timestamp,
  '중국 정부 10,000+ 휴머노이드 상업 배치 목표. Robotera/China Post/SF Express 물류 배포. AGIBOT+Unitree 시장 80% 점유. TrendForce 중국 양산 94% 증가 전망.',
  '중국 정부가 휴머노이드 로봇과 구현형 AI 배치를 가속화하는 국가 이니셔티브를 발표하며, 2026년 말까지 10,000대 이상의 휴머노이드 로봇을 상업 운영에 투입하는 목표를 설정했다. Robotera가 China Post 및 SF Express와 파트너십으로 10개 이상 물류센터에 배포하여 인간 대비 85% 작업 효율을 달성했다. TrendForce에 따르면 중국 휴머노이드 로봇 생산량은 2026년 94% 증가할 전망이며, AGIBOT과 Unitree 양사가 전체 출하량의 약 80%를 차지할 것으로 예측된다.',
  'ko', 'industry', 'robot',
  encode(sha256(('china-10k-humanoid-initiative-2026-06')::bytea), 'hex'),
  '{"mentionedCompanies": ["AGIBOT", "Unitree", "Robotera", "China Post", "SF Express", "TrendForce"], "mentionedRobots": [], "technologies": ["embodied AI"], "marketInsights": ["10K robot deployment target", "94% production surge", "80% market share duopoly"], "keyPoints": ["10,000대 상업 배치 국가 목표", "AGIBOT+Unitree 80% 점유", "94% 양산 증가 전망"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('china-10k-humanoid-initiative-2026-06')::bytea), 'hex'));

-- Figure AI dual-robot collaboration
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI Helix-02: 세계 최초 단일 VLA 듀얼 로봇 협업 + 8시간 자율 시프트 달성',
  'FigureAI.com / TechTimes / TheRobotReport',
  'https://www.figure.ai/news/helix-02',
  '2026-05-14'::timestamp,
  'Helix-02 두 로봇 단일 VLA 정책 침실 정리 협업(5/8). 8시간 완전 자율 공장 시프트(5/14). 로봇>인간 마일스톤. BotQ 60분/1대.',
  'Figure AI가 2026년 5월 두 가지 중요한 Helix-02 마일스톤을 달성했다. 첫째, 5월 8일 두 대의 Figure 03 로봇이 단일 공유 VLA 정책만으로 침실을 정리하는 데모를 공개했다. 문 열기, 옷 걸기, 의자 밀어넣기, 침대 정리 등을 중앙 플래너나 메시지 전달 없이 동작만으로 상대 의도를 추론하며 수행했다. 세계 최초 단일 학습 신경망 기반 멀티로봇 locomanipulation 시연이다. 둘째, 5월 14일 Helix-02 기반 로봇이 풀 8시간 자율 공장 시프트를 완수하여 산업 자동화 임계점에 도달했다. Figure AI 본사에서는 로봇 수가 인간 직원 수를 초과하는 마일스톤도 달성했다.',
  'ko', 'technology', 'robot',
  encode(sha256(('figure-helix02-dualrobot-8hr-shift-2026-05')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI"], "mentionedRobots": ["Figure 03"], "technologies": ["Helix-02 VLA", "multi-robot collaboration", "single shared neural network policy"], "marketInsights": ["world-first dual-robot VLA collaboration", "8-hour autonomous factory shift", "robots outnumber humans at Figure AI"], "keyPoints": ["듀얼 로봇 VLA 협업 세계 최초", "8시간 자율 시프트 완수", "로봇>인간 달성"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-helix02-dualrobot-8hr-shift-2026-05')::bytea), 'hex'));

-- Tesla Optimus R&D admission
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus: Musk "아직 R&D 단계" 공식 인정 — 실질적 유용 작업 미달성',
  'optimusk.blog / NewMarketPitch / eWeek',
  'https://optimusk.blog/blog/tesla-optimus-buy-preorder-2026/',
  '2026-06-27'::timestamp,
  'Musk "아직 R&D", "실질 유용 작업 없음" 인정. 소비자 판매 시점 미정(2027년 말 타겟). 기업 판매 2026년 말 목표. 사전주문/보증금 없음.',
  'Elon Musk가 2026년 6월 말 Tesla Optimus 로봇이 "아직 R&D 단계(still very much in the R&D phase)"이며 "실질적으로 유용한 작업(useful work in a material sense)을 수행하지 않고 있다"고 공식 인정했다. Gen 3 핸드(22 DOF, 50 액추에이터)가 24/7 자율 시프트 테스트 중이나, 풀바디 V3 상용 생산은 7-8월 시작 목표에도 불구하고 실질적 외부 고객 배치까지는 2026년 말 이후가 될 전망이다. 소비자 대상 판매는 사전주문, 예약, 보증금 프로그램이 일절 없으며, 2027년 말 이후가 목표다. 기업 고객(제조/물류/반도체) 대상 판매가 먼저 시작될 예정이다.',
  'ko', 'product', 'robot',
  encode(sha256(('tesla-optimus-rnd-admission-2026-06-28')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus V3", "Optimus Gen 3"], "technologies": ["Gen 3 hand 22 DOF"], "marketInsights": ["still R&D phase", "no useful work yet", "no consumer pre-orders", "enterprise sale late 2026"], "keyPoints": ["Musk R&D 단계 인정", "유용 작업 미달성", "소비자 판매 사전주문 없음"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-rnd-admission-2026-06-28')::bytea), 'hex'));

-- Industry funding $55.8B
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  '로보틱스 산업 2026 H1 투자 $55.8B — 전년 연간 기록 2배 근접, 자본 대유입 시대',
  'Crunchbase / TechFundingNews',
  'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/',
  '2026-06-20'::timestamp,
  '2026년 상반기 로보틱스 $55.8B 조달(전년 2x). Figure AI $1B+, Apptronik $935M, Neura $1.4B. 휴머노이드 집중.',
  '2026년 상반기 기준 로보틱스 기업들이 총 $55.8B를 조달하여 전년도 연간 기록의 거의 2배에 달했다. 주요 대형 라운드: Figure AI $1B+ (시리즈 C, $39B), Apptronik $935M (시리즈 A, $5.5B), Neura Robotics $1.4B (시리즈 C, $7B, Amazon/Nvidia/Qualcomm/Tether 참여). 휴머노이드 로봇 영역에 자본이 집중되며 2027년 대규모 양산 경쟁의 자금 기반이 확보되고 있다.',
  'ko', 'industry', 'robot',
  encode(sha256(('robotics-funding-55b-h1-2026')::bytea), 'hex'),
  '{"mentionedCompanies": ["Figure AI", "Apptronik", "Neura Robotics", "Amazon", "Nvidia", "Qualcomm", "Tether"], "mentionedRobots": [], "technologies": [], "marketInsights": ["$55.8B H1 2026", "nearly 2x previous annual record", "humanoid robot capital concentration"], "keyPoints": ["$55.8B 상반기 조달", "전년 2배 근접", "휴머노이드 자본 집중"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('robotics-funding-55b-h1-2026')::bytea), 'hex'));

-- Unitree 1260H + JAL geopolitical risk
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree G1: 미국 1260H 블랙리스트 속 JAL 하네다 배치 — 지정학 리스크 교차점',
  'TechTimes / CNBC',
  'https://www.techtimes.com/articles/316862/20260519/jal-deploys-unitree-g1-robots-haneda-us-congress-moves-blacklist-supplier-national-security.htm',
  '2026-05-19'::timestamp,
  'Unitree G1 하네다 배치 vs 미 의회 블랙리스트 추진 교차. Pentagon 1260H 등재(6/8). 미-일 동맹국 간 중국 로보틱스 활용 지정학 긴장.',
  'TechTimes가 "JAL Deploys Unitree G1 Robots at Haneda as U.S. Congress Moves to Blacklist Supplier for National Security"라는 제목으로 Unitree G1의 하네다 공항 배치와 미국의 블랙리스트 추진 간 지정학적 긴장을 보도했다. JAL이 2년 계약(~2028)으로 Unitree G1을 배치한 시점과 미 국방부의 1260H 군사 연계 기업 목록 등재(6/8) 시점이 겹치며 미-일 동맹국 간 중국 로보틱스 활용에 대한 긴장이 부각되고 있다. 제재 확대 시 일본 공항 배치에도 영향이 미칠 수 있다.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-1260h-jal-geopolitical-2026-06')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Japan Airlines", "Pentagon"], "mentionedRobots": ["G1"], "technologies": [], "marketInsights": ["1260H blacklist vs JAL deployment", "US-Japan geopolitical tension", "Chinese robotics in allied nations"], "keyPoints": ["1260H 등재 vs 하네다 배치", "미일 동맹 지정학 긴장", "제재 확대 리스크"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-1260h-jal-geopolitical-2026-06')::bytea), 'hex'));

-- Apptronik Apollo 71 DOF
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik Apollo: 71 DOF/25kg 페이로드 — 경쟁사 최다 자유도, 차세대 2026 데뷔 예정',
  'OriginOfBots / Automate.org / Robozaps',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-06-25'::timestamp,
  'Apollo 71 DOF(경쟁 최다), 25kg 페이로드. 차세대 1년 테스트 후 2026 데뷔. Mercedes-Benz/GXO 활발 테스트. 22hrs/day.',
  'Apptronik Apollo의 상세 기술 스펙이 확인되었다. 71 DOF(팔, 손, 토르소, 다리)로 경쟁사 중 최다 자유도를 보유하며(BD Atlas 56 DOF, Figure 03 41 DOF), 25kg 페이로드를 지원한다. CEO Jeff Cardenas가 2025년 예정이었으나 개선 작업으로 연기된 차세대 모델의 곧 공개를 재확인했다. Automate.org 보도에 따르면 약 1년간 비공개 테스트를 완료했으며, Mercedes-Benz 공장과 GXO 물류 창고에서 22시간/일, 7일/주 가동 테스트가 진행 중이다.',
  'ko', 'product', 'robot',
  encode(sha256(('apptronik-apollo-71dof-25kg-2026-06')::bytea), 'hex'),
  'a1b2c3d4-0003-4000-8000-000000000003',
  '{"mentionedCompanies": ["Apptronik", "Mercedes-Benz", "GXO Logistics", "Google DeepMind"], "mentionedRobots": ["Apollo"], "technologies": ["71 DOF", "25kg payload", "hot-swappable battery"], "marketInsights": ["highest DOF among competitors", "next-gen 2026 debut", "1-year secret testing"], "keyPoints": ["71 DOF 경쟁 최다", "25kg 페이로드", "차세대 2026 데뷔"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-apollo-71dof-25kg-2026-06')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "multi_robot_collab", "new_value": "Helix-02 단일 VLA 정책 듀얼 로봇 침실 정리 협업 (5/8), 세계 최초 멀티로봇 locomanipulation", "source": "FigureAI.com 2026-05-08", "reliability": "B"}, {"field": "autonomous_shift", "new_value": "Helix-02 기반 8시간 완전 자율 공장 시프트 완수 (5/14)", "source": "TechTimes 2026-05-14", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%듀얼 로봇 침실%8시간%자율%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "development_status", "new_value": "Musk 공식 인정: 아직 R&D 단계, 실질 유용 작업 미달성 (2026.6 말)", "source": "optimusk.blog, eWeek", "reliability": "A"}, {"field": "consumer_sale", "new_value": "사전주문/예약/보증금 없음. 소비자 판매 2027년 말 이후 타겟", "source": "optimusk.blog", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%R&D 단계%유용 작업 미달성%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "dof", "new_value": "71 DOF (팔+손+토르소+다리) — 경쟁사 최다", "source": "OriginOfBots, Automate.org", "reliability": "B"}, {"field": "payload_kg", "new_value": "25 kg", "source": "OriginOfBots", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%71 DOF%경쟁사 최다%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "geopolitical_risk", "new_value": "1260H 등재 속 JAL 하네다 배치 — 미일 동맹 지정학 긴장 부각", "source": "TechTimes 2026-05-19", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%1260H%JAL%지정학%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('HumanoidsDailycom/RobotsBeat', 'https://robotsbeat.com/openai-robotics-division-humanoid-robots-altman-tesla-optimus-competitor/', 'OpenAI 내부 Robotics Division 출범 — Tesla Optimus 직접 경쟁자', 'Aditya Ramesh 리드, 11개직 채용. 인프라→범용 로봇. Figure AI 결별 후 자체 하드웨어.'),
  ('Caixin Global/eWeek', 'https://www.caixinglobal.com/2026-06-10/china-targets-10000-humanoid-robots-in-commercial-use-by-end-2026-102452656.html', '중국 정부 2026년 말 10,000대 휴머노이드 상업 배치 국가 목표', 'Robotera/China Post/SF Express. AGIBOT+Unitree 80%. TrendForce 94% 증가 전망.'),
  ('FigureAI/TechTimes', 'https://www.figure.ai/news/helix-02', 'Figure AI Helix-02 듀얼 로봇 VLA 협업 + 8시간 자율 시프트', '단일 VLA 정책 두 로봇 침실 정리. 8시간 완전 자율. 로봇>인간 마일스톤.'),
  ('optimusk.blog/eWeek', 'https://optimusk.blog/blog/tesla-optimus-buy-preorder-2026/', 'Tesla Optimus: Musk "R&D 단계" 인정, 소비자 판매 2027년 말 이후', '유용 작업 미달성. 사전주문/보증금 없음. 기업 판매 2026년 말 목표.'),
  ('Crunchbase', 'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/', '로보틱스 2026 H1 투자 $55.8B — 전년 2배', 'Figure $1B+, Apptronik $935M, Neura $1.4B. 휴머노이드 자본 집중.'),
  ('TechTimes', 'https://www.techtimes.com/articles/316862/20260519/jal-deploys-unitree-g1-robots-haneda-us-congress-moves-blacklist-supplier-national-security.htm', 'Unitree: 1260H 등재 vs JAL 하네다 배치 지정학 리스크', '미 의회 블랙리스트 vs 일본 공항 배치. 미일 동맹 긴장.'),
  ('Automate.org/OriginOfBots', 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup', 'Apptronik Apollo 71 DOF/25kg — 경쟁 최다 자유도, 차세대 데뷔 임박', '1년 비공개 테스트 완료. Mercedes/GXO 22hrs/day 테스트. $5.5B 밸류.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
