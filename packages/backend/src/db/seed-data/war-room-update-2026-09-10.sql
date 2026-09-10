-- War Room 경쟁사 데이터 자동 업데이트 - 2026-09-10
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-09-10T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [B] Tesla Optimus - 2026년 15,000대 부품 발주, 9월 1,000대/주 → 연말 2,500대/주 램프 (2026-09-08)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'mass_production', 'critical',
  'Tesla Optimus: 2026년 15,000대 부품 발주, 9월 1,000대/주 → 연말 2,500대/주 생산 램프 (2026.9)',
  'Tesla가 2026년 말까지 15,000대의 Optimus를 생산하기 위한 부품을 협력사에 발주한 것으로 확인. 9월 말까지 주 1,000대 생산율을 달성하고 연말까지 주 2,500대로 램프업할 계획. 이는 연 환산 100,000-125,000대 수준으로, 2027년으로의 연결 생산율이 된다. Optimus V3 양산 비용은 연 1M대 도달 시 $20,000-$25,000/대 목표. Fremont 공장에서 V3 전신 생산이 7월 말~8월에 시작되었으나 초기 속도는 "상당히 느린" 상태. 첫 생산분은 훈련 데이터 수집용이며 외부 고객 판매 아님.',
  '{"source": "NextBigFuture, Tesla Supplier Data, Basenor, BeginnersinAI", "date": "2026-09-08", "reliability": "B", "details": {"2026_target_units": 15000, "sept_rate_per_week": 1000, "yearend_rate_per_week": 2500, "annualized_run_rate": "100K-125K", "cost_target_at_1m_yr": "$20K-$25K", "ai_chip_cost": "$5K-$6K", "production_start": "late July/August 2026", "factory": "Fremont", "initial_use": "training data collection", "consumer_availability": "end 2027+"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'mass_production'
  AND title LIKE '%15,000대 부품 발주%2,500대/주%'
);

-- [A] Unitree - 미국 국방부 Section 1260H 중국 군사기업 목록 등재 (2026-06-08)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'regulation', 'critical',
  'Unitree: 미 국방부 Section 1260H 중국 군사기업 목록 등재 (2026.6.8)',
  'Unitree Robotics가 2026년 6월 8일 미 국방부(DoD) Section 1260H 중국 군사기업 목록에 추가됨. Alibaba, Baidu, BYD 등과 함께 188개 기업 중 하나로 지정. FY2024 NDAA에 따라 2026년 6월 30일부터 DoD의 직접 계약이 금지되고 1년 후 간접 계약도 금지. 다만 수입/판매/민간 구매 자체를 금지하는 것은 아님. 이는 Unitree의 미국 시장 확대(특히 정부/군사 분야)에 제약이 될 수 있으나, 소비자 및 교육 시장에는 직접적 영향이 제한적.',
  '{"source": "TechCrunch, TheNextWeb, WilmerHale, Holland & Knight", "date": "2026-06-08", "reliability": "A", "details": {"list": "Section 1260H", "total_companies": 188, "co_listed": ["Alibaba", "Baidu", "BYD"], "direct_contract_ban_start": "2026-06-30", "indirect_contract_ban_start": "2027-06-30", "does_not_prohibit": ["imports", "sales", "private purchases", "university purchases"], "impact": "DoD contracting restriction, not import ban", "investors_listed": ["Alibaba", "Tencent"]}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'regulation'
  AND title LIKE '%Section 1260H%군사기업%'
);

-- [A] Agility Robotics - Churchill Capital SPAC 합병, $2.5B 밸류, $620M + $200M PIPE(Foxconn) (2026-06-24)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'funding', 'critical',
  'Agility Robotics: Churchill Capital SPAC $2.5B 합병, $620M 조달 + Foxconn $200M PIPE (2026.6.24)',
  'Agility Robotics가 Churchill Capital Corp XI과 $2.5B 규모의 SPAC 합병을 발표(2026.6.24). 총 $620M 이상의 자금 조달로 휴머노이드 로봇 업계 최대 규모 상장 건. Foxconn 주도 $200M PIPE 투자 포함. 합병 후 "AGLT" 티커로 북미 주요 거래소 상장 예정. SEC 등록 심사 중이며, 2026년 내 마감 목표. Digit V5 개발 가속 및 고객 주문 이행에 활용. 현재 Schaeffler, GXO, Toyota Motor Manufacturing Canada 등에서 상업 운영 중.',
  '{"source": "BusinessWire, Yahoo Finance, GeekWire, SEC Filing", "date": "2026-06-24", "reliability": "A", "details": {"merger_type": "SPAC", "spac_partner": "Churchill Capital Corp XI", "valuation": "$2.5B", "gross_proceeds": "$620M+", "pipe_amount": "$200M", "pipe_lead": "Foxconn", "ticker": "AGLT", "expected_close": "2026", "pending": "SEC review, shareholder vote", "use_of_proceeds": "Digit V5 development, customer order fulfillment", "current_customers": ["Schaeffler", "GXO", "Toyota Canada", "Mercado Libre", "Amazon"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Agility%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'funding' AND title LIKE '%Churchill Capital%SPAC%$2.5B%Foxconn%'
)
LIMIT 1;

-- [B] Figure AI - Figure 03 Helix 02 전신 협응 데모(BMW Spartanburg 중량 카트 견인) (2026-09)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'score_spike', 'warning',
  'Figure AI: Figure 03 Helix 02 전신 협응 데모 — BMW에서 중량 카트 견인 + 부품 정밀 배치 (2026.9)',
  'Figure AI가 BMW Group Plant Spartanburg에서 Figure 03의 Helix 02 기반 전신 협응(whole-body coordination) 데모를 공개. Helix 02는 Figure 독자 개발 픽셀-투-액션 VLA(Vision-Language-Action)로, 손/팔/상체/발을 통합 제어하여 얇은 부품 정밀 픽앤플레이스와 중량 금속 카트 견인을 전환 수행. 이전 F.02 파일럿(11개월, 30K 차량, 90K 부품)에서 F.03로 업그레이드 진행. 4년 내 100,000대 목표. 글로벌 H1 2026 출하량 19,000-22,000대(+272% YoY) 중 Figure는 1,000대+ 생산.',
  '{"source": "TechCrunch, Figure.ai, ForgeGlobal, InsideDeepTech", "date": "2026-09", "reliability": "B", "details": {"demo": "whole-body coordination at BMW Spartanburg", "ai_system": "Helix 02 (pixels-to-actions VLA)", "capabilities": ["precise thin-part pick-and-place", "heavy metal cart pulling", "stepping and repositioning"], "production_target": "100,000 units in 4 years", "current_production": "1,000+ F.03 units", "bmw_pilot_legacy": {"duration": "11 months", "vehicles": 30000, "parts": 90000}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'score_spike'
  AND title LIKE '%Helix 02%전신 협응%BMW%카트 견인%'
);

-- [B] 글로벌 시장 - H1 2026 휴머노이드 출하 19,000-22,000대(+272% YoY), 중국 93-97%, Barclays 60K+ 전망
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'market_trend', 'info',
  '글로벌 H1 2026 휴머노이드 출하 ~20,000대(+272% YoY), 중국 93-97% 점유, Barclays 연간 60K+ 전망',
  '2026년 상반기 글로벌 휴머노이드 로봇 출하량이 약 19,000-22,000대로 전년 동기 대비 272% 급증. 중국 제조사가 93-97%를 점유(AGIBOT 44%, Unitree 등). 산업/상업용 비중이 70% 이상으로 소비자용 초과. Barclays 보고서는 2026년 전체 60,000대 이상 신규 투입을 전망. Omdia 기준 AGIBOT 2025년 5,168대(39% 점유)로 글로벌 1위. Humanoid Robots Summit 2026 Stuttgart(9/9-11)에 1,000+ 참석, BD/Google/Unitree 등 37명 연사.',
  '{"source": "InsideDeepTech, Barclays, Omdia, KraneShares, HumanoidRobotsSummit", "date": "2026-09", "reliability": "B", "details": {"h1_2026_shipments": "19,000-22,000", "yoy_growth": "272%", "china_share_pct": "93-97%", "industrial_commercial_pct": ">70%", "barclays_2026_forecast": "60,000+", "omdia_2025_leader": {"name": "AGIBOT", "units": 5168, "share_pct": 39}, "summit": {"event": "Humanoid Robots Summit 2026", "location": "Stuttgart, Germany", "dates": "Sept 9-11", "attendees": "1,000+", "speakers": 37}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'market_trend'
  AND title LIKE '%H1 2026%272%%중국 93-97%%Barclays 60K%'
);

-- [A] 1X Technologies - NEO Hayward 공장 풀 생산, 연 10K대 용량, 첫해분 5일 내 완판, 가정 배송 시작 (2026)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'mass_production', 'warning',
  '1X NEO: Hayward 풀 생산 가동, 연 10K대 용량, 첫해분 5일 완판, 2026 가정 배송 개시 (2026)',
  '1X Technologies의 Hayward 공장(58K sqft, 200+명)이 풀 생산 가동에 돌입. 미국 최초 수직통합 고볼륨 휴머노이드 로봇 공장. 초기 연간 용량 10,000대이며, 2025년 10월 사전주문 개시 5일 만에 첫해 생산분이 완판. 2027년 말까지 연 100,000대 이상으로 확대 목표. San Carlos 2호 공장 건설 중. 가격 $20,000(Early Access) 또는 $499/월 구독. 2026년 내 미국 가정 배송 시작 예정이며, 2027년부터 해외 확대.',
  '{"source": "GlobeNewswire, TheRobotReport, TheNextWeb, Forbes", "date": "2026-09", "reliability": "A", "details": {"factory": "Hayward, CA", "factory_size_sqft": 58000, "employees": "200+", "year1_capacity": 10000, "2027_capacity_target": "100,000+", "sellout_days": 5, "price_early_access": "$20,000", "subscription": "$499/month", "us_home_delivery": "2026", "international": "2027+", "2nd_factory": "San Carlos, CA (under construction)", "significance": "America first vertically integrated humanoid factory"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'mass_production'
  AND title LIKE '%Hayward%10K대%5일 완판%가정 배송%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Tesla Optimus 15,000 units parts ordering
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus: 2026년 15,000대 부품 발주, 생산율 주 2,500대 램프업 목표',
  'NextBigFuture / Basenor / BeginnersinAI',
  'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html',
  '2026-09-08'::timestamp,
  'Tesla 2026년 15,000대 부품 발주. 9월 주 1,000대 → 연말 주 2,500대(연 100K-125K 환산). V3 양산비 $20K-$25K/대(연 1M 기준). Fremont 7/8월 착수.',
  'Tesla가 협력사에 2026년 말까지 15,000대의 Optimus V3를 생산하기 위한 부품을 발주한 것으로 확인되었다. 9월 말까지 주 1,000대 생산율을 달성하고, 연말까지 주 2,500대로 램프업할 계획이다. 이는 연 환산 100,000-125,000대의 생산 역량으로, 2027년을 향한 본격 양산 체제의 시작이다. Optimus V3의 양산 비용은 연간 1백만 대 생산 시 $20,000-$25,000/대(AI 칩 $5,000-$6,000 포함)를 목표한다. Fremont 공장에서 V3 전신 생산이 7월 말~8월에 시작되었으나, 머스크는 초기 출력이 "상당히 느릴 것"이라 경고. 첫 생산분은 내부 훈련 데이터 수집용이며 소비자 판매는 2027년 말 이후 계획.',
  'ko', 'product', 'robot',
  encode(sha256(('tesla-optimus-15000-parts-order-sept-2026')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus V3"], "technologies": ["AI5 chip", "supplier ramp"], "marketInsights": ["15,000 units parts ordered for 2026", "1,000/week by Sept → 2,500/week by year-end", "$20K-$25K unit cost at 1M/yr"], "keyPoints": ["15,000대 부품 발주", "주 2,500대 램프업", "양산비 $20K-$25K 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-15000-parts-order-sept-2026')::bytea), 'hex'));

-- Unitree Section 1260H listing
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree: 미 국방부 Section 1260H 중국 군사기업 목록 등재',
  'TechCrunch / TheNextWeb / WilmerHale',
  'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/',
  '2026-06-08'::timestamp,
  'Unitree가 미 국방부 Section 1260H 목록에 추가(6/8). Alibaba/Baidu/BYD와 함께 188개 기업. DoD 직접 계약 금지(6/30~). 민간 구매 자체는 금지 아님.',
  '미 국방부(DoD)가 2026년 6월 8일 Section 1260H 중국 군사기업 목록을 업데이트하여 Unitree Robotics를 추가했다. Alibaba, Baidu, BYD 등과 함께 총 188개 기업이 지정되었다. FY2024 NDAA에 따라 2026년 6월 30일부터 DoD의 직접 계약이 금지되고, 1년 후 간접 계약도 금지된다. 다만 이 목록은 수입, 판매, 민간 구매 자체를 금지하는 것은 아니다. Unitree의 투자자인 Alibaba와 Tencent도 기존 목록 기업이다. 이 조치는 Unitree의 미국 정부/군사 시장 확대에 장벽이 되나, 교육 및 소비자 시장에서의 사업은 직접 영향을 받지 않는다. Unitree는 상하이 STAR Market IPO(8/19) 이후 $32.9B 시총을 기록 중.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-1260h-dod-military-list-2026-06')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics", "Alibaba", "Baidu", "BYD", "Tencent"], "mentionedRobots": ["G1", "H1", "B2"], "technologies": [], "marketInsights": ["Section 1260H listing", "DoD contracting ban from June 30", "does not ban imports/private sales"], "keyPoints": ["Section 1260H 등재", "DoD 계약 금지", "민간 구매는 허용"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-1260h-dod-military-list-2026-06')::bytea), 'hex'));

-- Agility Robotics SPAC merger
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Robotics: Churchill Capital SPAC $2.5B 합병, $620M 조달 + Foxconn $200M PIPE',
  'BusinessWire / Yahoo Finance / GeekWire',
  'https://www.businesswire.com/news/home/20260624555633/en/Agility-Robotics-to-Go-Public-Through-2.5-Billion-Merger-with-Churchill-Capital-Corp-XI',
  '2026-06-24'::timestamp,
  'Agility-Churchill SPAC $2.5B 합병 발표(6/24). $620M+ 조달(휴머노이드 최대). Foxconn 주도 $200M PIPE. 티커 AGLT. SEC 심사 중. 2026 내 마감 목표.',
  'Agility Robotics가 2026년 6월 24일 Churchill Capital Corp XI과 $2.5B 규모의 SPAC 합병을 발표했다. 총 $620M 이상의 자금을 조달하며, 이는 휴머노이드 로봇 업계 역대 최대 규모의 상장 건이다. Foxconn이 주도하는 $200M PIPE 투자가 포함되어 있다. 합병 완료 시 "AGLT" 티커로 북미 주요 거래소에 상장될 예정이다. 현재 SEC의 등록 성명서(Form S-4) 심사가 진행 중이며, 2026년 내 마감을 목표로 한다. 조달 자금은 Digit V5 개발 가속 및 GXO, Schaeffler, Toyota Canada, Mercado Libre 등 기존 고객의 주문 이행에 활용된다. Agility는 2015년 Oregon State University 스핀오프로 설립되었으며, Salem에 본사를 두고 있다.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-churchill-spac-2.5b-foxconn-2026-06')::bytea), 'hex'),
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  '{"mentionedCompanies": ["Agility Robotics", "Churchill Capital Corp XI", "Foxconn", "GXO", "Schaeffler", "Toyota Canada", "Mercado Libre"], "mentionedRobots": ["Digit V5"], "technologies": [], "marketInsights": ["$2.5B SPAC merger", "$620M+ raise", "largest humanoid robotics listing", "Foxconn $200M PIPE"], "keyPoints": ["SPAC $2.5B 합병", "$620M 최대 조달", "Foxconn PIPE $200M"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-churchill-spac-2.5b-foxconn-2026-06')::bytea), 'hex'));

-- Figure AI Helix 02 whole-body coordination demo
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI: Figure 03 Helix 02 전신 협응 데모 — BMW에서 정밀 배치 + 카트 견인 전환',
  'TechCrunch / Figure.ai / ForgeGlobal',
  'https://techcrunch.com/?p=3016152',
  '2026-09-08'::timestamp,
  'F.03 Helix 02 VLA 기반 전신 협응 데모(BMW Spartanburg). 얇은 부품 정밀 배치 ↔ 중량 카트 견인 전환. 100K대/4년 목표. H1 2026 글로벌 19K-22K대.',
  'Figure AI가 BMW Group Plant Spartanburg에서 Figure 03의 Helix 02 기반 전신 협응(whole-body coordination) 데모를 공개했다. Helix 02는 Figure 독자 개발 픽셀-투-액션 VLA(Vision-Language-Action) 시스템으로, 손/팔/상체/발을 통합 제어한다. 시연에서 F.03는 얇은 벽면 개별 부품의 정밀 픽앤플레이스와 캐스터 휠 달린 대형 금속 카트의 견인 작업을 유연하게 전환했다. BMW Spartanburg에서의 이전 F.02 파일럿(11개월, 30K 차량, 90K 부품, 1,250시간)의 후속으로 F.03 활용 사례를 평가 중이다. Figure AI는 4년 내 100,000대 생산을 목표로 하며, 현재 F.03 누적 1,000대 이상을 생산했다.',
  'ko', 'product', 'robot',
  encode(sha256(('figure-helix02-wholebody-bmw-demo-2026-09')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03"], "technologies": ["Helix 02 VLA", "whole-body coordination", "pixels-to-actions"], "marketInsights": ["100K units in 4 years", "BMW Spartanburg evaluation", "1,000+ F.03 produced"], "keyPoints": ["Helix 02 전신 협응", "BMW 정밀+카트 견인 전환", "100K대/4년 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-helix02-wholebody-bmw-demo-2026-09')::bytea), 'hex'));

-- 1X NEO Hayward full production + sellout
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X NEO: Hayward 공장 풀 생산, 연 10K대 용량, 첫해분 5일 완판, 가정 배송 개시',
  'GlobeNewswire / TheRobotReport / TheNextWeb',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '2026-09-01'::timestamp,
  '1X Hayward 공장(58K sqft) 풀 생산. 미국 최초 수직통합 고볼륨 휴머노이드 공장. 연 10K대. 사전주문 5일 완판. $20K/$499월. 2026 미국 가정 배송.',
  '1X Technologies의 Hayward 공장(58,000 sqft, 200+명)이 풀 생산 가동에 돌입했다. 미국 최초의 수직통합 고볼륨 휴머노이드 로봇 공장으로, 초기 연간 생산 용량은 10,000대다. 2025년 10월 사전주문 개시 5일 만에 첫해 생산분이 완판되었다. 2027년 말까지 연 100,000대 이상으로 확대할 계획이며, San Carlos에 2호 공장을 건설 중이다. NEO는 $20,000(Early Access 우선배송) 또는 $499/월 구독 모델로 제공된다. 5피트 6인치의 이족보행 로봇으로 가정용으로 설계되었으며, 정리정돈, 물건 운반, 빨래 접기 등을 수행한다. 2026년 미국 가정 배송이 시작되며, 2027년부터 해외로 확대 예정.',
  'ko', 'product', 'robot',
  encode(sha256(('1x-neo-hayward-full-production-sellout-2026-09')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies"], "mentionedRobots": ["NEO"], "technologies": ["vertically integrated factory", "tendon drive", "tactile fingertips"], "marketInsights": ["10K/yr capacity", "sold out in 5 days", "$20K or $499/mo", "100K+/yr by end 2027"], "keyPoints": ["Hayward 풀 생산", "첫해분 5일 완판", "$20K 또는 $499/월"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-hayward-full-production-sellout-2026-09')::bytea), 'hex'));

-- H1 2026 global market overview
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  '글로벌 H1 2026 휴머노이드 출하 ~20,000대(+272% YoY), 중국 93-97%, 연간 60K+ 전망',
  'InsideDeepTech / Barclays / KraneShares / Omdia',
  'https://www.insidedeeptech.com/physical-ai-market-report-september-2026/',
  '2026-09-05'::timestamp,
  'H1 2026 글로벌 19K-22K대(+272% YoY). 중국 93-97%. 산업/상업 70%+. Barclays 연간 60K+. AGIBOT 2025 5,168대/39%(Omdia 1위). Stuttgart Summit 1,000+명.',
  '2026년 상반기 글로벌 휴머노이드 로봇 출하량이 약 19,000-22,000대를 기록하며 전년 동기 대비 272% 급증했다. 중국 제조사가 93-97%를 점유하고 있으며, AGIBOT(44%)과 Unitree가 양강 구도를 형성했다. 산업/상업용 비중이 70%를 초과하여 소비자용을 상회한다. Barclays 보고서는 2026년 전체 60,000대 이상의 신규 투입을 전망했다. Omdia 기준 AGIBOT은 2025년 5,168대 출하(글로벌 39%)로 1위를 기록했다. Humanoid Robots Summit 2026이 독일 Stuttgart에서 9/9-11 개최되었으며, 1,000명 이상 참석, Boston Dynamics/Google DeepMind/Unitree 등 37명이 연사로 참여했다.',
  'ko', 'industry', 'robot',
  encode(sha256(('global-h1-2026-humanoid-shipments-272pct-60k-forecast')::bytea), 'hex'),
  '{"mentionedCompanies": ["AGIBOT", "Unitree", "Boston Dynamics", "Google DeepMind", "Barclays", "Omdia"], "mentionedRobots": [], "technologies": [], "marketInsights": ["H1 2026: 19K-22K units (+272% YoY)", "China 93-97% share", "industrial/commercial >70%", "Barclays 60K+ FY2026 forecast", "AGIBOT 2025 #1 (5,168 units, 39%)"], "keyPoints": ["H1 2026 272% 성장", "중국 93-97% 점유", "연간 60K+ 전망"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('global-h1-2026-humanoid-shipments-272pct-60k-forecast')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "2026_production_plan", "new_value": "15,000대 부품 발주. 9월 주 1,000대 → 연말 주 2,500대(연 100K-125K 환산)", "source": "NextBigFuture 2026-09-08", "reliability": "B"}, {"field": "unit_cost_target", "new_value": "연 1M대 시 $20K-$25K/대 (AI칩 $5K-$6K 포함)", "source": "NextBigFuture", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%15,000대 부품 발주%주 2,500대%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "us_regulatory_risk", "new_value": "미 국방부 Section 1260H 중국 군사기업 목록 등재(2026.6.8). DoD 직접 계약 금지(6/30~), 간접 금지(2027.6.30~)", "source": "TechCrunch 2026-06-08", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Section 1260H%군사기업%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "spac_merger", "new_value": "Churchill Capital SPAC $2.5B 합병(6/24), $620M+ 조달 + Foxconn $200M PIPE, 티커 AGLT, SEC 심사 중", "source": "BusinessWire 2026-06-24", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Churchill Capital%SPAC%$2.5B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "helix_02_demo", "new_value": "Helix 02 VLA 기반 전신 협응 데모(BMW Spartanburg): 정밀 부품 배치 ↔ 중량 카트 견인 전환", "source": "TechCrunch 2026-09", "reliability": "B"}, {"field": "production_target", "new_value": "4년 내 100,000대 생산 목표, 현재 1,000대+ 생산 완료", "source": "ForgeGlobal, InsideDeepTech", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Helix 02%전신 협응%BMW%카트 견인%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "hayward_production", "new_value": "Hayward 공장 풀 생산(58K sqft, 200+명). 연 10K대 용량. 첫해분 5일 완판.", "source": "GlobeNewswire 2026-04-30", "reliability": "A"}, {"field": "consumer_delivery", "new_value": "2026년 미국 가정 배송 개시. $20K(Early Access) 또는 $499/월 구독.", "source": "TheRobotReport, TheNextWeb", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Hayward%풀 생산%10K대%5일 완판%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('NextBigFuture', 'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html', 'Tesla Optimus 2026년 15,000대 부품 발주, 주 2,500대 램프업', '9월 주 1,000대 → 연말 주 2,500대. 연 100K-125K 환산. 양산비 $20K-$25K/대(1M기준).'),
  ('TechCrunch', 'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/', 'Unitree 미 국방부 Section 1260H 등재', 'Alibaba/Baidu/BYD와 함께 188개 기업. DoD 직접계약 금지(6/30~). 민간 구매는 허용.'),
  ('BusinessWire', 'https://www.businesswire.com/news/home/20260624555633/en/Agility-Robotics-to-Go-Public-Through-2.5-Billion-Merger-with-Churchill-Capital-Corp-XI', 'Agility Robotics Churchill Capital SPAC $2.5B 합병', '$620M+ 조달. Foxconn $200M PIPE. 티커 AGLT. SEC 심사 중.'),
  ('TechCrunch/Figure.ai', 'https://techcrunch.com/?p=3016152', 'Figure 03 Helix 02 전신 협응 데모(BMW Spartanburg)', '정밀 부품 배치 ↔ 카트 견인 전환. 100K대/4년 목표. 1,000대+ 생산 완료.'),
  ('GlobeNewswire', 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html', '1X NEO Hayward 풀 생산, 연 10K대, 첫해분 5일 완판', '$20K/$499월. 미국 최초 수직통합 휴머노이드 공장. 2026 가정 배송.'),
  ('InsideDeepTech/Barclays', 'https://www.insidedeeptech.com/physical-ai-market-report-september-2026/', '글로벌 H1 2026 휴머노이드 ~20K대(+272% YoY)', '중국 93-97%. 산업/상업 70%+. Barclays 연간 60K+. Stuttgart Summit 1,000+명.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
