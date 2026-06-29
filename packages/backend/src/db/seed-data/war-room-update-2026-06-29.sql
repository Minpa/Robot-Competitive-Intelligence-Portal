-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-29
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-29T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] 시장 전망 - Morgan Stanley 중국 휴머노이드 출하 전망 2배 상향 (50,000대)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'score_spike', 'critical',
  '시장 전망: Morgan Stanley 중국 휴머노이드 2026 출하 전망 50,000대로 2배 상향 (기존 28,000대)',
  'Morgan Stanley가 2026년 6월 24일 중국 휴머노이드 로봇 출하 전망을 50,000대로 상향. 올해 초 14,000대→28,000대→50,000대로 두 번째 2배 상향. 중국 시장 규모 2026년 $2B, 2030년 $15B(446,000대) 전망. 핵심 동인: 국가전력망(State Grid) ¥6.8B 주문, 정부 정책 지원, 공급망 역량 확대. 상업화 가속이 예측치를 초과.',
  '{"source": "CNBC, SCMP, BigGo Finance, ChinaPulse", "date": "2026-06-24", "reliability": "A", "details": {"analyst": "Morgan Stanley", "forecast_2026": 50000, "previous_forecast": 28000, "initial_forecast": 14000, "market_size_2026_usd": "$2B", "market_size_2030_usd": "$15B", "shipments_2030": 446000, "drivers": ["State Grid ¥6.8B order", "policy support", "supply chain expansion"], "revision_count": 2}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'score_spike'
  AND title LIKE '%Morgan Stanley%50,000대%'
);

-- [B] AGIBOT - 2025 매출 ¥1.05B (20배 성장), "358" 성장 계획 공개
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'score_spike', 'warning',
  'AGIBOT: 2025 매출 ¥1.05B(20배 성장) 확인, "358" 계획 — 2027년 ¥10B/2030년 ¥100B 목표',
  'AGIBOT의 2025년 매출이 10.5억위안(약 $142M)으로 확인됨. 2024년 6,000만위안에서 약 20배 성장. "358" 성장 계획 공개: 3년 내(2027) ¥10B(약 $1.4B), 5년 내(2029) ¥50B, 8년 내(2030+) ¥100B 매출 목표. Expedition A3 플랫폼이 양산을 주도하며, 물류/소매/제조/호텔리어 등 다양한 산업에 배치 중. Omdia 2025년 글로벌 휴머노이드 출하량 1위.',
  '{"source": "Gasgoo, TechTimes, Capital.com", "date": "2026-06", "reliability": "B", "details": {"revenue_2025_cny": "¥1.05B", "revenue_2024_cny": "¥60M", "yoy_growth": "~20x", "plan_name": "358", "target_2027_cny": "¥10B", "target_2029_cny": "¥50B", "target_2030_cny": "¥100B", "omdia_rank_2025": 1, "lead_platform": "Expedition A3"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'score_spike' AND title LIKE '%AGIBOT%358%¥10B%'
)
LIMIT 1;

-- [B] Apptronik Apollo 3 - Bloomberg 보도 차세대 모델 확인 (2026.6.25)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'score_spike', 'warning',
  'Apptronik Apollo 3: Bloomberg 취재 차세대 모델 HQ 확인, $5.5B 밸류에이션 상향',
  'Bloomberg(2026.6.25) 취재에서 Apptronik HQ에 Apollo 3 로봇 2대가 확인됨. 차세대 모델의 공식 명칭이 "Apollo 3"으로 확정. ~1년간 비공개 테스트 후 2026년 공개 데뷔 예정. 밸류에이션 $5B→$5.5B로 상향. Mercedes-Benz 공장 및 GXO 물류센터에서 현세대 Apollo 테스트 진행 중. Google DeepMind Gemini Robotics 통합 파트너십 진행 중.',
  '{"source": "Bloomberg, CNBC", "date": "2026-06-25", "reliability": "B", "details": {"model_name": "Apollo 3", "units_spotted": 2, "location": "Apptronik HQ", "testing_duration": "~1 year", "public_debut": "2026", "valuation": "$5.5B", "valuation_prev": "$5B", "active_pilots": ["Mercedes-Benz factories", "GXO warehouses"], "ai_partner": "Google DeepMind Gemini Robotics"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Apptronik'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'score_spike' AND title LIKE '%Apollo 3%Bloomberg%'
)
LIMIT 1;

-- [B] Agility Robotics - 누적 65,000시간 이상 실제 운영 시간 달성
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'score_spike', 'info',
  'Agility Digit: 누적 65,000+ 시간 실제 운영 — 업계 최다 상업 운영 기록',
  'Agility Robotics Digit가 전체 고객 사이트에서 누적 65,000시간 이상의 실제 상업 운영을 달성. 업계에서 가장 많은 문서화된 휴머노이드 상업 운영 시간. GXO Flowery Branch에서만 100,000개 이상 토트 처리. Toyota TMMC(Woodstock, Ontario) RaaS 계약으로 7대 운영 중. SPAC IPO 후 Nasdaq 상장(AGLT) 대기 중.',
  '{"source": "TechCrunch, GeekWire, The Robot Report", "date": "2026-06", "reliability": "B", "details": {"cumulative_hours": 65000, "claim": "most documented commercial humanoid deployment hours", "gxo_totes": "100,000+", "toyota_tmmc_units": 7, "toyota_tmmc_model": "RaaS", "total_customer_sites": 9, "spac_status": "awaiting close by end 2026"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'score_spike'
  AND title LIKE '%65,000%시간%'
);

-- [B] 시장 동향 - State Grid(국가전력망) ¥6.8B 휴머노이드 주문
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT NULL, 'partnership', 'critical',
  '시장 동향: 중국 State Grid(국가전력망) ¥6.8B 휴머노이드 로봇 주문 — 최대 규모 단일 주문',
  '중국 국가전력망(State Grid)이 ¥6.8B(약 $940M) 규모의 휴머노이드 로봇 주문을 발주. 단일 주문으로는 역대 최대 규모. Morgan Stanley는 이를 중국 휴머노이드 상업화 가속의 핵심 동인으로 평가. 전력 인프라 점검, 위험 환경 작업 등에 투입 예정. 중국 정부의 휴머노이드 산업 정책 지원 강화와 맞물려 시장 전체의 성장 가속.',
  '{"source": "Morgan Stanley via CNBC, SCMP", "date": "2026-06", "reliability": "B", "details": {"buyer": "State Grid Corporation of China", "order_value_cny": "¥6.8B", "order_value_usd": "~$940M", "use_case": "power infrastructure inspection, hazardous environment operations", "significance": "largest single humanoid robot order to date", "market_impact": "key driver of Morgan Stanley forecast upgrade"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE type = 'partnership'
  AND title LIKE '%State Grid%¥6.8B%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Morgan Stanley forecast upgrade
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  'Morgan Stanley 중국 휴머노이드 출하 전망 50,000대로 2배 상향 — State Grid ¥6.8B 주문 등 상업화 가속',
  'CNBC / SCMP / BigGo Finance',
  'https://www.cnbc.com/2026/06/24/morgan-stanley-china-humanoid-robot-market-forecast.html',
  '2026-06-24'::timestamp,
  'Morgan Stanley 중국 2026 출하 전망 50,000대(기존 28,000대 2배). 올해 두 번째 상향. 시장 규모 $2B→2030 $15B(446K대). State Grid ¥6.8B 주문이 핵심 동인.',
  'Morgan Stanley가 2026년 중국 휴머노이드 로봇 출하 전망을 50,000대로 상향했다. 올해 초 14,000대에서 28,000대로 올린 뒤 다시 두 배로 올린 것이다. 상업화 전환이 예상보다 빠르게 진행됨을 반영한다. 중국 시장 규모는 2026년 $2B, 2030년 $15B(446,000대)로 전망한다. 핵심 동인으로 ①국가전력망(State Grid) ¥6.8B 주문, ②정부 정책 지원 강화, ③공급망 역량 확대를 꼽았다. TrendForce도 중국 휴머노이드 생산량 94% 증가를 전망. Unitree+AGIBOT이 중국 출하의 약 80%를 차지할 것으로 예측.',
  'ko', 'industry', 'robot',
  encode(sha256(('morgan-stanley-china-humanoid-50k-2026-06-24')::bytea), 'hex'),
  '{"mentionedCompanies": ["Morgan Stanley", "State Grid", "Unitree", "AGIBOT", "TrendForce"], "mentionedRobots": [], "technologies": [], "marketInsights": ["50K units forecast (2x upgrade)", "$2B 2026 market", "$15B 2030 market", "446K units by 2030"], "keyPoints": ["출하 전망 50,000대 상향", "State Grid ¥6.8B 주문", "올해 두 번째 2배 상향"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('morgan-stanley-china-humanoid-50k-2026-06-24')::bytea), 'hex'));

-- AGIBOT revenue and 358 plan
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT 2025 매출 ¥1.05B(20배 성장) 확인, "358" 계획으로 2030년 ¥100B 목표',
  'Gasgoo / TechTimes / Capital.com',
  'https://autonews.gasgoo.com/articles/news/from-60-million-to-105-billion-to-a-100-billion-target-is-agibots-358-plan-ambition-or-a-bubble-2046210816838205440',
  '2026-06-20'::timestamp,
  'AGIBOT 2025 매출 ¥1.05B(전년비 20배). "358" 계획: 2027년 ¥10B, 2029년 ¥50B, 2030+ ¥100B. Expedition A3 양산 주도. 홍콩 IPO Q3 진행 중.',
  'AGIBOT의 2025년 매출이 10.5억위안(약 $142M)으로 확인되었다. 2024년 6,000만위안에서 약 20배 성장한 수치다. "358" 성장 계획을 공개하며 3년(2027) ¥10B, 5년(2029) ¥50B, 8년(2030+) ¥100B 매출을 목표로 제시했다. Expedition A3 플랫폼이 양산을 주도하고 있으며, 물류·소매·호텔리어·제조 등 다양한 산업에 글로벌 배치 중이다. Minth Group(유럽 자동차)과 Singtel Enterprise(싱가포르)를 통한 해외 확장도 가속하고 있다. 홍콩 IPO HK$40-50B 밸류에이션, Q3 2026 상장 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-revenue-1.05b-358-plan-2026-06')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Minth Group", "Singtel Enterprise"], "mentionedRobots": ["Expedition A3"], "technologies": ["embodied AI supply chain"], "marketInsights": ["¥1.05B 2025 revenue (20x YoY)", "358 plan: ¥10B/50B/100B targets", "HK IPO Q3 2026"], "keyPoints": ["2025 매출 20배 성장 ¥1.05B", "358 계획 공개", "홍콩 IPO Q3 진행 중"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-revenue-1.05b-358-plan-2026-06')::bytea), 'hex'));

-- Apptronik Apollo 3 Bloomberg
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik Apollo 3: Bloomberg 취재로 차세대 모델 확인, $5.5B 밸류에이션',
  'Bloomberg',
  'https://www.bloomberg.com/news/features/2026-06-25/apptronik-s-humanoid-robots-walk-but-ceo-jeff-cardenas-isn-t-bragging-yet',
  '2026-06-25'::timestamp,
  'Bloomberg 6.25 취재: Apollo 3 로봇 2대 HQ에서 확인. ~1년 비공개 테스트. 2026년 공개 데뷔 예정. $5.5B 밸류. Gemini Robotics 통합.',
  'Bloomberg이 2026년 6월 25일 Apptronik 본사를 취재하여 Apollo 3 로봇 2대를 확인했다. 차세대 모델의 공식 명칭이 "Apollo 3"으로 확정되었으며, 약 1년간 비공개 테스트를 거쳐 2026년 내 공개 데뷔를 준비 중이다. 밸류에이션은 $5.5B로 상향되었다. 현세대 Apollo는 Mercedes-Benz 공장과 GXO 물류센터에서 파일럿 중이며, Google DeepMind Gemini Robotics AI 통합 파트너십이 진행 중이다. CEO Jeff Cardenas는 "아직 자랑할 때가 아니다"라며 신중한 입장을 보였다.',
  'ko', 'product', 'robot',
  encode(sha256(('apptronik-apollo-3-bloomberg-2026-06-25')::bytea), 'hex'),
  'a1b2c3d4-0003-4000-8000-000000000003',
  '{"mentionedCompanies": ["Apptronik", "Google DeepMind", "Mercedes-Benz", "GXO"], "mentionedRobots": ["Apollo 3", "Apollo"], "technologies": ["Gemini Robotics"], "marketInsights": ["$5.5B valuation", "Apollo 3 model confirmed", "2026 public debut planned"], "keyPoints": ["Apollo 3 차세대 모델 확인", "$5.5B 밸류에이션", "~1년 비공개 테스트 후 공개 예정"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-apollo-3-bloomberg-2026-06-25')::bytea), 'hex'));

-- Agility 65K hours milestone
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Digit: 누적 65,000+ 시간 상업 운영 — 업계 최다, SPAC 마감 대기',
  'TechCrunch / GeekWire / The Robot Report',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  '2026-06-26'::timestamp,
  'Digit 전체 고객사에서 65,000+ 시간 상업 운영(업계 최다 기록). $300M 선주문 = 3년 1,000대 단일 계약. 9개 사이트 가동. SPAC 마감 2026 연말.',
  'Agility Robotics의 Digit가 전체 고객 사이트에서 누적 65,000시간 이상의 상업 운영을 달성하며 업계 최다 기록을 세웠다. SPAC 상장 제출 서류에 따르면 $300M+ 멀티이어 선주문은 비공개 고객 1곳과의 3년 1,000대 계약이다. GXO Flowery Branch에서 100,000개 이상 토트 처리, Toyota TMMC Woodstock에서 7대 RaaS 운영, Schaeffler, Mercado Libre 등 9개 고객 시설 가동 중.',
  'ko', 'industry', 'robot',
  encode(sha256(('agility-digit-65k-hours-spac-detail-2026-06')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics", "GXO", "Toyota TMMC", "Schaeffler", "Mercado Libre"], "mentionedRobots": ["Digit", "Digit v5"], "technologies": ["cooperative safety"], "marketInsights": ["65K+ commercial hours (industry record)", "$300M = single 3yr 1000-unit contract", "9 active sites"], "keyPoints": ["65,000+ 시간 운영 최다 기록", "$300M 단일 3년 계약 확인", "SPAC 2026 연말 마감 대기"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-65k-hours-spac-detail-2026-06')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "revenue_2025", "new_value": "¥1.05B (20x YoY from ¥60M in 2024)", "source": "Gasgoo 2026-06", "reliability": "B"}, {"field": "growth_plan", "new_value": "358 계획: 2027 ¥10B / 2029 ¥50B / 2030+ ¥100B", "source": "Gasgoo, Capital.com", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%358 계획%¥10B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "next_gen_model", "new_value": "Apollo 3 confirmed (Bloomberg 2026.6.25), ~1yr testing, 2026 debut", "source": "Bloomberg 2026-06-25", "reliability": "B"}, {"field": "valuation", "new_value": "$5.5B (up from $5B)", "source": "Bloomberg", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Apollo 3 confirmed%Bloomberg%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "operational_hours", "new_value": "65,000+ hours cumulative commercial operation (industry record)", "source": "TechCrunch SPAC filing 2026-06-24", "reliability": "B"}, {"field": "order_detail", "new_value": "$300M = single 3-year 1,000 unit contract (undisclosed customer)", "source": "GeekWire SPAC filing analysis", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%65,000%hours%industry record%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('CNBC/SCMP', 'https://www.cnbc.com/2026/06/24/morgan-stanley-china-humanoid-robot-market-forecast.html', 'Morgan Stanley 중국 휴머노이드 2026 전망 50,000대 (2배 상향)', '14K→28K→50K 세 번째 전망. State Grid ¥6.8B 주문 등 상업화 가속. $2B 시장→2030 $15B.'),
  ('Gasgoo/TechTimes', 'https://autonews.gasgoo.com/articles/news/from-60-million-to-105-billion-to-a-100-billion-target-is-agibots-358-plan-ambition-or-a-bubble-2046210816838205440', 'AGIBOT 2025 매출 ¥1.05B(20배), "358" 계획 ¥100B 목표', '2024 ¥60M→2025 ¥1.05B. 358 계획: 2027 ¥10B, 2030+ ¥100B. Expedition A3 양산 주도.'),
  ('Bloomberg', 'https://www.bloomberg.com/news/features/2026-06-25/apptronik-s-humanoid-robots-walk-but-ceo-jeff-cardenas-isn-t-bragging-yet', 'Apptronik Apollo 3 차세대 모델 Bloomberg 취재 확인', 'Apollo 3 HQ 확인. ~1년 비공개 테스트. $5.5B 밸류. Gemini Robotics 통합 중.'),
  ('TechCrunch/GeekWire', 'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/', 'Agility Digit 65,000+ 시간 상업 운영 달성 (업계 최다)', '$300M 선주문 = 3년 1,000대 단일 계약. 9개 사이트 65K+ 시간 운영 최다.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
