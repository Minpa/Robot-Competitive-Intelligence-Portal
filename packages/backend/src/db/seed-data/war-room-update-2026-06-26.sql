-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-26
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-26T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] Agility Robotics Digit - $2.5B SPAC IPO 계약 체결 (2026-06-24)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'funding', 'critical',
  'Agility Robotics: $2.5B SPAC IPO 계약 체결, Nasdaq "AGLT" 상장 예정 (2026.6.24)',
  'Agility Robotics가 Churchill Capital XI과 $2.5B SPAC 합병 계약을 체결(2026.6.24). 순수 휴머노이드 로봇 전문 기업으로는 미국 최초 상장. $620M 이상 현금 확보 예정. Nasdaq 티커 "AGLT"로 2026년 말 거래 개시 목표. $300M+ 멀티이어 Digit v5 수주 잔고 확인. 현재 9개 고객 시설 가동 중(Amazon, Toyota, GXO, Schaeffler, Mercado Libre 등).',
  '{"source": "TechTimes, GeekWire, WashingtonTimes, TechFundingNews, AssemblyMag", "date": "2026-06-24", "reliability": "A", "details": {"deal_type": "SPAC merger", "spac_partner": "Churchill Capital XI", "valuation": "$2.5B", "cash_proceeds": "$620M+", "ticker": "AGLT", "exchange": "Nasdaq", "expected_close": "end of 2026", "committed_orders": "$300M+ multi-year Digit v5", "active_customers": 9, "key_customers": ["Amazon", "Toyota TMMC", "GXO", "Schaeffler", "Mercado Libre"], "us_component_share": "75%", "robofab_capacity": "10,000/yr"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'funding'
  AND title LIKE '%SPAC%$2.5B%'
);

-- [A] Tesla Optimus - Fremont Model S/X 라인 → Optimus 공장 전환 확정
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'mass_production', 'critical',
  'Tesla Optimus: Fremont Model S/X 라인 Optimus 공장 전환, 2026년 7-8월 생산 시작',
  'Tesla가 Fremont 공장의 Model S/X 생산 라인을 Optimus 로봇 전용으로 전환 확정. 2026년 5월 초 Model S/X 마지막 라인오프 후 약 4개월 만에 7-8월 Optimus V3 생산 시작 목표. 10,000개 고유 부품의 완전 신규 생산 라인. 초기 생산 속도는 "예측 불가" 수준이나 연 1M대 라인 구축이 최종 목표. Cortex 2.0 Phase 1(250MW) 2026년 4월 온라인 가동 확인. $20-30K 외부 판매가.',
  '{"source": "TechTimes, Electrek, SupplyChainToday, ifactoryapp.com", "date": "2026-06", "reliability": "A", "details": {"factory": "Fremont", "previous_line": "Model S/X", "model_sx_end": "early May 2026", "optimus_start": "July-August 2026", "unique_parts": 10000, "production_target": "1M units/yr line capacity", "initial_rate": "quite slow / impossible to predict", "cortex_2": {"phase1_mw": 250, "online": "April 2026", "phase2_mw": 500, "phase2_target": "mid-2026"}, "target_price": "$20-30K", "expansion_2027": ["Giga Texas", "Giga Berlin", "Giga Shanghai"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'mass_production'
  AND title LIKE '%Fremont%Model S/X%전환%'
);

-- [B] Agility Digit v5 - 차세대 스펙 공개 (50lbs/7.2ft/22hrs)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'score_spike', 'warning',
  'Agility Digit v5: 적재 50lbs/리치 7.2ft/가동 22hrs, 워크셀 불필요 "협력 안전"',
  'Digit v5 핵심 스펙 공개: 적재 50lbs(23kg), 리치 7.2ft(220cm), 일 22시간 가동. "협력 안전(cooperative safety)" 기술로 별도 안전 워크셀 없이 인간과 동일 공간 작업 가능. RoboFab에서 연 10,000대 생산 역량. $300M+ 멀티이어 선주문 확보.',
  '{"source": "GeekWire, WashingtonTimes, Robozaps", "date": "2026-06", "reliability": "B", "details": {"payload_lbs": 50, "reach_ft": 7.2, "daily_operation_hrs": 22, "safety_approach": "cooperative safety - no workcell required", "committed_orders": "$300M+", "robofab_capacity": "10,000/yr", "us_component_share": "75%"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'score_spike'
  AND title LIKE '%Digit v5%50lbs%7.2ft%'
);

-- [B] Unitree - 일본항공/하네다공항 G1 상용 배포 + H2/R1 신모델
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'partnership', 'warning',
  'Unitree G1: 일본항공/하네다공항 상용 배포(최초 공항), H2/R1 신모델 발표, UnifoLM-VLA 오픈소스',
  'Unitree G1이 일본항공(JAL)과 GMO Internet Group 파트너십을 통해 도쿄 하네다 공항에 배포됨 — 휴머노이드 로봇의 최초 상용 공항 배포 사례. 수하물/화물 핸들링 수행. 2026년 3월 UnifoLM-VLA-0 모델 오픈소스 공개로 자연어 명령 기반 가정 자율 작업 가능. G1-D(디퍼렌셜 드라이브 휠드 변형) 데이터 수집용 출시. H2/R1 신규 휴머노이드 모델 라인업 확장.',
  '{"source": "eWeek, Wikipedia/Unitree, Robozaps", "date": "2026-06", "reliability": "B", "details": {"airport": "Tokyo Haneda", "partners": ["Japan Airlines", "GMO Internet Group"], "use_case": "baggage and cargo handling", "first_airport_deployment": true, "new_models": ["H2", "R1"], "g1d_variant": "differential drive wheeled base", "open_source": "UnifoLM-VLA-0 (March 2026)", "2026_target": "20,000 units", "2025_shipped": "5,500+ G1"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'partnership'
  AND title LIKE '%하네다%H2/R1%'
);

-- [A] AGIBOT - 누적 10,000대 양산 달성 + 홍콩 IPO 추진
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'critical',
  'AGIBOT: 누적 10,000대 양산 달성 (2026.3.30) + 홍콩 IPO HK$40-50B 밸류 추진',
  'AGIBOT이 2026년 3월 30일 누적 10,000번째 휴머노이드 로봇 생산을 달성. 2023년 창업 후 약 2.5년 만의 성과. 홍콩 IPO를 HK$40-50B(US$5.1-6.4B) 밸류에이션으로 추진 중이며 Q3 2026 상장 목표. Minth Group(독일 자동차 부품사) 파트너십으로 유럽 자동차 생산라인 진출. Singtel Enterprise 계약으로 싱가포르 시장 진출.',
  '{"source": "PRNewswire, TechTimes, Capital.com, Tracxn", "date": "2026-06", "reliability": "A", "details": {"cumulative_production": 10000, "milestone_date": "2026-03-30", "founded": 2023, "ipo_market": "Hong Kong", "ipo_valuation_hkd": "HK$40-50B", "ipo_valuation_usd": "$5.1-6.4B", "ipo_target_quarter": "Q3 2026", "partnerships": {"minth_group": "European auto-parts production lines", "singtel": "Singapore foothold"}, "investors": ["Tencent", "HongShan Capital", "LG Electronics", "Mirae Asset", "BYD", "Hillhouse"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'mass_production' AND title LIKE '%AGIBOT%10,000대%홍콩 IPO%'
)
LIMIT 1;

-- [A] 1X NEO - 초도 생산분 10,000대 5일 만에 완판
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'mass_production', 'warning',
  '1X NEO: 초도 생산분 10,000대 5일 만에 완판, 미국 내 수직통합 공장 가동',
  '1X Technologies가 NEO 로봇 공식 판매 개시 후 초도 연간 생산량(10,000대)을 단 5일 만에 완판. OpenAI 투자 기반. Hayward 공장(58,000 sq ft, 200+명)은 미국 내 가장 수직통합된 휴머노이드 공장. 30kg 경량 프레임(Tesla 57kg, BD Atlas 89kg 대비). 첫 출하분은 텔레오퍼레이션(인간-인-더-루프) 방식으로 가정 환경 학습 데이터 수집 병행.',
  '{"source": "eWeek, Notebookcheck, GlobeNewsWire", "date": "2026-06", "reliability": "A", "details": {"sold_out_units": 10000, "sold_out_days": 5, "factory_sqft": 58000, "factory_staff": "200+", "weight_kg": 30, "competitor_weights": {"tesla_optimus_kg": 57, "bd_atlas_kg": 89}, "initial_mode": "teleoperation (human-in-the-loop)", "backer": "OpenAI", "pricing": {"purchase": "$20,000", "deposit": "$200", "subscription": "$499/month"}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'mass_production'
  AND title LIKE '%10,000대%5일%완판%'
);

-- [B] Figure AI - Brookfield Project Go-Big 100K 주거유닛 데이터 수집
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'partnership', 'warning',
  'Figure AI: Brookfield "Project Go-Big" 100K 주거유닛 가정 데이터 수집 파트너십',
  'Figure AI가 Brookfield Asset Management와 "Project Go-Big" 파트너십을 체결하여 100,000개 주거유닛에서 일인칭 인간 행동 비디오를 수집. 2027년까지 자금 지원. Helix 신경망의 가정 환경 학습 데이터 확보를 위한 대규모 데이터 파이프라인. BotQ 공장은 초기 연 12,000대 생산, 4년 내 100,000대 확대 목표.',
  '{"source": "Wikipedia/Figure AI, Sacra, FigureAI.com", "date": "2026-06", "reliability": "B", "details": {"project_name": "Project Go-Big", "partner": "Brookfield Asset Management", "residential_units": 100000, "data_type": "first-person human egocentric video", "funding_through": 2027, "botq_initial_capacity": 12000, "botq_target_capacity": 100000, "scaling_timeline": "4 years", "ai_model": "Helix 02", "series_c": "$1B+ at $39B valuation"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'partnership'
  AND title LIKE '%Brookfield%Project Go-Big%'
);

-- [B] Boston Dynamics Atlas - 자율 배터리 셀프스왑 + 2026 배치 완판
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'score_spike', 'info',
  'Boston Dynamics Atlas: 자율 배터리 셀프스왑 기능, 2026년 전량 배치 완판 확인',
  'Atlas 상용 버전이 자율 배터리 셀프스왑 기능을 탑재 — 충전 스테이션에 자체 이동, 배터리 교환, 작업 복귀까지 인간 개입 없이 수행. 연속 가동 가능. 2026년 생산분 전량이 Hyundai RMAC과 Google DeepMind에 배치 확정. 추가 고객은 2027년 초 수용 예정. 배터리 수명 4시간, 56 DOF, -20~40°C 운영.',
  '{"source": "AI2Work, BitgetNews, Engadget, TheRegister", "date": "2026-06", "reliability": "B", "details": {"battery_self_swap": true, "battery_life_hours": 4, "dof": 56, "2026_allocation": "fully committed", "2026_customers": ["Hyundai RMAC", "Google DeepMind"], "new_customers_timeline": "early 2027", "hyundai_factory_plan": "30,000 units/yr by 2028", "height_m": 1.9, "weight_kg": 90}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'score_spike'
  AND title LIKE '%셀프스왑%전량 배치 완판%'
);

-- [B] 규제/인증 - EU AI Act + Machinery Regulation 이중 컴플라이언스 타임라인
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'warning',
  '규제 동향: EU AI Act 2027.8 + Machinery Regulation 2027.1 이중 컴플라이언스 의무',
  'EU AI Act가 자율 로봇을 Annex I 고위험 AI 시스템으로 분류. 전면 컴플라이언스 의무 2027년 8월 2일 발효(Digital Omnibus 통과 시 2028년). Machinery Regulation 2023/1230은 2027년 1월 20일 전면 적용. AI 통합 기계에 대한 사이버보안 요건 강화. 유럽 시장 진출 기업은 AI Act + Machinery Regulation 이중 컴플라이언스 부담. ISO 25785-1(동적 안정 로봇 안전) Working Draft 단계.',
  '{"source": "IEEE Spectrum, KiteCompliance, arxiv, theresarobotforthat.com", "date": "2026-06", "reliability": "B", "details": {"eu_ai_act": {"effective": "2027-08-02", "classification": "Annex I high-risk AI", "possible_delay": "2028 if Digital Omnibus passes"}, "machinery_regulation": {"number": "2023/1230", "effective": "2027-01-20", "key_changes": ["AI-integrated machinery coverage", "cybersecurity requirements", "updated conformity assessment"]}, "iso_25785_1": {"status": "Working Draft", "scope": "dynamically stable robots"}, "impact": "dual compliance burden for EU market entrants"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%EU AI Act%Machinery Regulation%이중 컴플라이언스%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Agility Robotics SPAC IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Robotics $2.5B SPAC 합병으로 Nasdaq 상장 — 순수 휴머노이드 최초 IPO',
  'TechTimes / GeekWire / WashingtonTimes',
  'https://www.techtimes.com/articles/319099/20260625/humanoid-robot-ipo-agility-robotics-signs-spac-deal-us-nasdaq-debut.htm',
  '2026-06-25'::timestamp,
  'Agility Robotics가 Churchill Capital XI과 $2.5B SPAC 합병 체결. Nasdaq "AGLT" 상장. $620M+ 현금 확보. Digit v5 $300M+ 선주문. 9개 고객(Amazon/Toyota/GXO/Schaeffler/Mercado Libre).',
  'Agility Robotics가 2026년 6월 24일 Churchill Capital XI과 $2.5B SPAC 합병 계약을 체결했다. 미국에서 순수 휴머노이드 로봇 전문 기업으로는 최초 상장이다. 거래 종료 시 $620M 이상의 현금을 확보하며, Nasdaq 티커 "AGLT"로 2026년 말 거래를 개시할 예정이다. SEC 제출 서류에 따르면 차세대 Digit v5에 대해 $300M 이상의 멀티이어 수주 잔고가 확인되었다. Digit v5는 50lbs 적재, 7.2ft 리치, 22시간/일 가동이 가능하며 "협력 안전" 기술로 워크셀 없이 인간과 공존 작업이 가능하다. 현재 Amazon, Toyota Motor Manufacturing Canada, GXO, Schaeffler, Mercado Libre 등 9개 고객 시설에서 가동 중이며, RoboFab에서 연 10,000대 생산 역량을 보유한다. 미국 부품 비중 75%.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-spac-ipo-2.5b-2026-06-24')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "Churchill Capital XI", "Amazon", "Toyota", "GXO", "Schaeffler", "Mercado Libre"], "mentionedRobots": ["Digit", "Digit v5"], "technologies": ["cooperative safety", "workcell-free operation"], "marketInsights": ["$2.5B SPAC IPO", "$620M cash", "$300M+ committed orders", "first pure-play humanoid IPO"], "keyPoints": ["$2.5B SPAC 합병 체결", "Nasdaq AGLT 상장 예정", "Digit v5 $300M+ 선주문"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-spac-ipo-2.5b-2026-06-24')::bytea), 'hex'));

-- Tesla Fremont factory conversion
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Fremont: Model S/X 생산 종료 후 Optimus 로봇 전용 공장 전환, 7-8월 생산 시작',
  'TechTimes / Electrek',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09'::timestamp,
  'Tesla가 Fremont의 Model S/X 라인을 Optimus V3 전용으로 전환. 5월 초 마지막 라인오프, 7-8월 생산 시작 목표. 10,000개 부품 신규 라인. Cortex 2.0(250MW) 4월 온라인.',
  'Tesla가 Fremont 공장의 Model S 및 Model X 생산 라인을 Optimus 휴머노이드 로봇 전용 공장으로 전환한다. 2026년 5월 초 Model S/X 마지막 라인오프 후 약 4개월 만인 7-8월에 Optimus V3 생산을 시작할 목표다. 10,000개 고유 부품으로 구성된 완전 신규 생산 라인이며, 초기 생산 속도는 Musk도 "예측 불가"라 인정했다. 최종 목표는 연 1M대 생산 라인 구축이다. AI 훈련 기반인 Cortex 2.0 Phase 1(250MW)이 2026년 4월 가동을 시작했으며, Phase 2(500MW)는 2026년 중반 목표. 2027년에는 Giga Texas, Berlin, Shanghai로 확장 계획.',
  'ko', 'product', 'robot',
  encode(sha256(('tesla-fremont-optimus-conversion-2026-06')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus V3", "Optimus Gen 3"], "technologies": ["Cortex 2.0 supercomputer", "250MW AI training"], "marketInsights": ["Fremont factory conversion", "1M units/yr target", "July-August 2026 start"], "keyPoints": ["Model S/X→Optimus 전환", "7-8월 생산 시작", "Cortex 2.0 250MW 가동"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-fremont-optimus-conversion-2026-06')::bytea), 'hex'));

-- Unitree JAL Haneda + new models
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree G1: 일본항공/하네다 공항 상용 배포(최초 공항), UnifoLM-VLA 오픈소스, H2/R1 발표',
  'eWeek / Wikipedia',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-06-15'::timestamp,
  'Unitree G1이 JAL/GMO와 도쿄 하네다 공항에 배포(최초 공항 배포). UnifoLM-VLA-0 오픈소스(3월). G1-D 휠드 변형. H2/R1 신모델. 2026년 20,000대 목표.',
  'Unitree Robotics의 G1이 일본항공(JAL)과 GMO Internet Group 파트너십으로 도쿄 하네다 공항에 배포되었다. 휴머노이드 로봇의 최초 상용 공항 배포 사례로 수하물 및 화물 핸들링을 수행한다. 2026년 3월 UnifoLM-VLA-0 모델을 오픈소스로 공개하여 자연어 명령 기반 자율 작업을 지원한다. G1-D 변형은 이족보행 대신 디퍼렌셜 드라이브 휠 베이스를 채택하여 데이터 수집/AI 훈련용으로 출시되었다. H2(대형 휴머노이드)와 R1 신모델도 발표하며 라인업을 확장. 2025년 5,500대 이상 출하, 2026년 20,000대 목표. 335% YoY 매출 성장(¥1.708B).',
  'ko', 'product', 'robot',
  encode(sha256(('unitree-haneda-vla-h2r1-2026-06')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Japan Airlines", "GMO Internet Group"], "mentionedRobots": ["G1", "G1-D", "H1", "H2", "R1", "B2"], "technologies": ["UnifoLM-VLA-0", "open-source VLA model", "differential drive variant"], "marketInsights": ["first airport humanoid deployment", "20K units 2026 target", "335% revenue growth"], "keyPoints": ["하네다 공항 최초 배포", "UnifoLM-VLA 오픈소스", "H2/R1 신모델 발표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-haneda-vla-h2r1-2026-06')::bytea), 'hex'));

-- AGIBOT 10K milestone + HK IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT: 누적 10,000대 양산 달성, 홍콩 IPO HK$40-50B 추진, Minth/Singtel 파트너십',
  'PRNewswire / TechTimes / Capital.com',
  'https://www.prnewswire.com/news-releases/agibot-announces-the-rollout-of-its-5-000th-mass-produced-humanoid-robot-302635127.html',
  '2026-06-02'::timestamp,
  'AGIBOT 2026.3.30 누적 10,000번째 로봇 생산. HK IPO HK$40-50B(US$5.1-6.4B) Q3 추진. Minth Group 유럽 자동차 + Singtel 싱가포르 진출.',
  'AGIBOT이 2026년 3월 30일 누적 10,000번째 휴머노이드 로봇 생산을 달성했다. 2023년 창업 후 약 2.5년 만이다. 홍콩 IPO를 HK$40-50B(US$5.1-6.4B) 밸류에이션으로 추진 중이며 Q3 2026 상장이 목표다. 독일 자동차 부품사 Minth Group과의 파트너십으로 유럽 자동차 생산라인에 AGIBOT 휴머노이드를 투입한다. Singtel Enterprise 계약으로 싱가포르 시장에도 진출했다. 주요 투자사는 Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse 등이다.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-10k-milestone-hk-ipo-2026-06')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Minth Group", "Singtel Enterprise", "LG Electronics", "BYD", "Tencent"], "mentionedRobots": ["A2", "X2"], "technologies": ["mass production at scale"], "marketInsights": ["10K cumulative production", "HK IPO $5.1-6.4B", "European expansion via Minth"], "keyPoints": ["누적 10,000대 양산", "홍콩 IPO Q3 추진", "Minth/Singtel 글로벌 확장"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-10k-milestone-hk-ipo-2026-06')::bytea), 'hex'));

-- Figure AI Brookfield data partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI: Brookfield "Project Go-Big" 100K 주거유닛 가정 데이터 수집, BotQ 12K/yr 양산',
  'FigureAI.com / Sacra / Wikipedia',
  'https://www.figure.ai/news/scaling-helix-logistics',
  '2026-06-01'::timestamp,
  'Figure AI-Brookfield "Project Go-Big" 100K 주거유닛 일인칭 인간 비디오 수집. Helix 학습 데이터. BotQ 초기 12K/yr, 4년 내 100K. $39B 밸류 $1B+ Series C.',
  'Figure AI가 Brookfield Asset Management와 "Project Go-Big" 파트너십을 체결하여 100,000개 주거유닛에서 일인칭(egocentric) 인간 행동 비디오를 수집한다. Helix 신경망의 가정 환경 학습 데이터를 대규모로 확보하기 위한 데이터 파이프라인이며, 2027년까지 자금이 지원된다. BotQ 수직통합 공장은 초기 연 12,000대 생산 역량을 갖추고 있으며, 4년 내 100,000대로 확대를 목표한다. Series C에서 $1B 이상을 조달하며 $39B 포스트머니 밸류에이션을 기록했다. 투자사에는 Brookfield, Intel, NVIDIA, Qualcomm, Salesforce, T-Mobile 등이 포함된다.',
  'ko', 'product', 'robot',
  encode(sha256(('figure-brookfield-go-big-botq-2026-06')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "Brookfield Asset Management", "Intel", "NVIDIA", "Qualcomm"], "mentionedRobots": ["Figure 03", "Figure 02"], "technologies": ["Helix 02", "egocentric video data collection", "Project Go-Big"], "marketInsights": ["100K residential unit data pipeline", "BotQ 12K-100K/yr scaling", "$39B valuation"], "keyPoints": ["Brookfield 100K 주거 데이터", "BotQ 12K→100K 양산", "$39B 밸류에이션"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-brookfield-go-big-botq-2026-06')::bytea), 'hex'));

-- 1X NEO sold out
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X NEO: 초도 생산분 10,000대 5일 만에 완판, $20K 소비자 가정 로봇 시대 개막',
  'eWeek / Notebookcheck / GlobeNewsWire',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-06-01'::timestamp,
  '1X NEO 초도 10K대 5일 완판. $20K 또는 $499/월 구독. 30kg 경량. 텔레오퍼레이션으로 가정 학습. OpenAI 투자.',
  '1X Technologies가 NEO 로봇 공식 판매 개시 후 초도 연간 생산량(10,000대)을 단 5일 만에 완판했다. $20,000 일시불 구매(Early Access $200 보증금) 또는 $499/월 구독으로 제공된다. 30kg 경량 프레임은 Tesla Optimus(57kg)의 53%, BD Atlas(89kg)의 34% 수준이다. 첫 출하분은 텔레오퍼레이션(인간-인-더-루프) 방식으로 가정 환경 학습 데이터를 수집하며 AI 자율성을 점진 확대한다. OpenAI 투자 기반이며, Hayward 공장(58,000 sq ft)에서 수직통합 생산한다.',
  'ko', 'product', 'robot',
  encode(sha256(('1x-neo-10k-soldout-5days-2026-06')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies", "OpenAI"], "mentionedRobots": ["NEO"], "technologies": ["teleoperation", "human-in-the-loop", "Redwood AI"], "marketInsights": ["10K sold in 5 days", "$20K consumer price", "lightest at 30kg"], "keyPoints": ["10,000대 5일 완판", "$20K/$499 소비자 가정 로봇", "30kg 경량 프레임"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-10k-soldout-5days-2026-06')::bytea), 'hex'));

-- BD Atlas self-swap batteries
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Boston Dynamics Atlas: 자율 배터리 셀프스왑으로 연속 가동, 2026 전량 배치 완판',
  'AI2Work / Engadget / TheRegister',
  'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
  '2026-06-10'::timestamp,
  'Atlas 자율 배터리 셀프스왑 탑재(충전소 이동→교환→작업 복귀). 2026 전량 Hyundai RMAC+DeepMind 배치. 추가 고객 2027. 56 DOF.',
  'Boston Dynamics Atlas 상용 버전이 자율 배터리 셀프스왑 기능을 탑재했다. 로봇이 충전 스테이션으로 자체 이동하여 배터리를 교환하고 작업에 복귀하는 전 과정을 인간 개입 없이 수행한다. 이를 통해 연속 가동이 가능하다. 기본 배터리 수명은 4시간. 56 DOF로 인간 이상의 관절 가동 범위를 제공하며, -20°C~40°C 환경에서 운영 가능하다. 2026년 생산분 전량이 Hyundai RMAC과 Google DeepMind에 배치 확정되었으며, 추가 고객은 2027년 초부터 수용할 예정이다.',
  'ko', 'technology', 'robot',
  encode(sha256(('bd-atlas-selfswap-2026-sold-out-06')::bytea), 'hex'),
  '7c7e540d-e4ec-4734-920b-875f20989c0a',
  '{"mentionedCompanies": ["Boston Dynamics", "Hyundai", "Google DeepMind"], "mentionedRobots": ["Atlas"], "technologies": ["autonomous battery self-swap", "continuous operation", "56 DOF"], "marketInsights": ["2026 production fully committed", "new customers 2027", "30K/yr factory by 2028"], "keyPoints": ["자율 배터리 셀프스왑", "2026 전량 배치 완판", "Hyundai RMAC+DeepMind 초기 고객"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('bd-atlas-selfswap-2026-sold-out-06')::bytea), 'hex'));

-- EU regulatory update
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  '휴머노이드 로봇 규제: EU AI Act + Machinery Regulation 이중 컴플라이언스 2027년 발효',
  'IEEE Spectrum / KiteCompliance',
  'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards',
  '2026-06-15'::timestamp,
  'EU AI Act: 자율 로봇 Annex I 고위험, 2027.8 발효. Machinery Regulation 2023/1230: 2027.1 적용. ISO 25785-1(동적 로봇 안전) Working Draft.',
  'EU AI Act가 자율 로봇을 Annex I 고위험 AI 시스템으로 분류하며, 2027년 8월 2일 전면 컴플라이언스 의무가 발효된다(Digital Omnibus 통과 시 2028년). Machinery Regulation 2023/1230은 2027년 1월 20일 전면 적용되며, AI 통합 기계 확대 적용, 사이버보안 요건 강화, 고위험 기계 적합성 평가 갱신 등이 핵심이다. 유럽 시장 진출 휴머노이드 로봇 기업은 AI Act + Machinery Regulation 이중 컴플라이언스 부담을 안게 된다. ISO 25785-1(동적 안정 로봇 안전 표준)은 Working Draft 단계이며, ISO 13482:2025(서비스 로봇 안전)도 업데이트 중이다.',
  'ko', 'regulation', 'robot',
  encode(sha256(('eu-aiact-machinery-reg-humanoid-2026-06')::bytea), 'hex'),
  '{"mentionedCompanies": [], "mentionedRobots": [], "technologies": [], "marketInsights": ["EU AI Act high-risk classification", "Machinery Regulation 2027 deadline", "dual compliance burden"], "keyPoints": ["EU AI Act 2027.8 발효", "Machinery Reg 2027.1 적용", "ISO 25785-1 WD 단계"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('eu-aiact-machinery-reg-humanoid-2026-06')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "ipo_status", "new_value": "$2.5B SPAC IPO 체결 (Churchill Capital XI), Nasdaq AGLT, 2026말 거래 개시", "source": "TechTimes, GeekWire 2026-06-24", "reliability": "A"}, {"field": "digit_v5_specs", "new_value": "50lbs 적재/7.2ft 리치/22hrs 가동/협력안전(워크셀 불필요)", "source": "GeekWire SPAC filing", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%SPAC%AGLT%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "production_facility", "new_value": "Fremont Model S/X 라인→Optimus 전환, 7-8월 V3 생산 시작", "source": "TechTimes, Electrek 2026-06", "reliability": "A"}, {"field": "ai_infrastructure", "new_value": "Cortex 2.0 Phase 1 (250MW) 4월 온라인, Phase 2 (500MW) 중반 목표", "source": "Electrek", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Fremont%Model S/X%Optimus 전환%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "deployment", "new_value": "JAL/하네다공항 상용 배포 (최초 공항), G1-D 휠드 변형 출시", "source": "eWeek 2026-06", "reliability": "B"}, {"field": "new_models", "new_value": "H2/R1 휴머노이드 라인업 확장, UnifoLM-VLA-0 오픈소스 (3월)", "source": "Wikipedia/Unitree", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%JAL%하네다%G1-D%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "production_milestone", "new_value": "누적 10,000대 양산 달성 (2026.3.30)", "source": "PRNewswire", "reliability": "A"}, {"field": "ipo_status", "new_value": "홍콩 IPO HK$40-50B (US$5.1-6.4B) Q3 2026 목표", "source": "Capital.com, Tracxn", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%10,000대%홍콩 IPO%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "data_pipeline", "new_value": "Brookfield Project Go-Big: 100K 주거유닛 egocentric 비디오 수집", "source": "Wikipedia, Sacra", "reliability": "B"}, {"field": "manufacturing", "new_value": "BotQ 초기 12K/yr, 4년 내 100K 확대 목표", "source": "FigureAI.com", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Brookfield%Go-Big%100K 주거%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "sales_milestone", "new_value": "초도 10K대 5일 만에 완판, $20K/$499 구독", "source": "eWeek, Notebookcheck", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%10K%5일%완판%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "atlas-commercial", "updates": [{"field": "battery_tech", "new_value": "자율 배터리 셀프스왑 (충전소 이동→교환→복귀, 연속 가동)", "source": "AI2Work, Engadget", "reliability": "B"}, {"field": "allocation", "new_value": "2026 전량 배치 완판 (Hyundai RMAC + Google DeepMind)", "source": "TheRegister, Engadget", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%셀프스왑%전량 배치 완판%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TechTimes/GeekWire', 'https://www.techtimes.com/articles/319099/20260625/humanoid-robot-ipo-agility-robotics-signs-spac-deal-us-nasdaq-debut.htm', 'Agility Robotics $2.5B SPAC IPO — 순수 휴머노이드 최초 Nasdaq 상장', 'Churchill Capital XI과 $2.5B 합병. Nasdaq AGLT. $620M+ 현금. Digit v5 50lbs/7.2ft/22hrs. $300M+ 선주문. 9개 고객.'),
  ('TechTimes/Electrek', 'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm', 'Tesla Fremont Model S/X→Optimus 전환, 7-8월 V3 생산 시작', '5월 초 Model S/X 종료. 10K 부품 신규 라인. Cortex 2.0 250MW 4월 온라인. 연 1M대 목표.'),
  ('eWeek/Wikipedia', 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/', 'Unitree G1 하네다공항 배포(최초 공항) + UnifoLM-VLA 오픈소스 + H2/R1', 'JAL/GMO 파트너십. 최초 공항 상용 배포. 2026년 20K대 목표. G1-D 휠드 변형.'),
  ('PRNewswire/Capital.com', 'https://www.prnewswire.com/news-releases/agibot-announces-the-rollout-of-its-5-000th-mass-produced-humanoid-robot-302635127.html', 'AGIBOT 누적 10,000대 양산, 홍콩 IPO HK$40-50B 추진', '2026.3.30 10,000번째. HK IPO Q3 목표. Minth Group 유럽 + Singtel 싱가포르.'),
  ('FigureAI/Sacra', 'https://www.figure.ai/news/scaling-helix-logistics', 'Figure AI Brookfield "Project Go-Big" 100K 주거 데이터 + BotQ 12K/yr', '가정 egocentric 비디오 수집. Helix 학습용. BotQ 4년 내 100K 확대.'),
  ('eWeek/Notebookcheck', 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/', '1X NEO 초도 10K대 5일 완판, 소비자 가정 로봇 시대', '$20K/$499. 30kg 경량. 텔레오퍼레이션 시작. OpenAI 투자.'),
  ('AI2Work/Engadget', 'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units', 'BD Atlas 자율 배터리 셀프스왑, 2026 전량 Hyundai/DeepMind 배치', '연속 가동 가능. 56 DOF. 추가 고객 2027. 30K/yr 공장 2028.'),
  ('IEEE Spectrum', 'https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards', 'EU AI Act + Machinery Regulation 이중 컴플라이언스 2027 발효', 'Annex I 고위험. AI Act 2027.8 + Machinery Reg 2027.1. ISO 25785-1 WD.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
