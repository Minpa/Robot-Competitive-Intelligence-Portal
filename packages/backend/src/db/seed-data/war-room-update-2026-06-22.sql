-- War Room 경쟁사 데이터 자동 업데이트 - 2026-06-22
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-06-22T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [C] Tesla Optimus - Gen 3 공개 재차 연기 (Electrek 2026-04-22)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '68ca0620-da5f-470c-ad3a-7428c52b0d45', 'mass_production', 'warning',
  'Tesla Optimus V3: Gen 3 공개 재차 연기, Fremont 7-8월 양산 시작 목표',
  'Electrek 보도에 따르면 Tesla가 Optimus V3 공개를 2026년 후반으로 재차 연기. Fremont Model S/X 라인(5월 종료) 전환 후 7-8월 양산 시작 목표이나, 10,000개 고유 부품으로 초기 생산 속도는 "예측 불가" 수준. Giga Texas 2세대 시설 착공, 장기 목표 연 1,000만대.',
  '{"source": "Electrek, TechTimes, TheRobotReport", "date": "2026-04-22", "reliability": "C", "details": {"v3_reveal": "pushed to later 2026 (again)", "fremont_start": "July-August 2026", "model_sx_end": "May 2026", "unique_parts": 10000, "initial_rate": "quite slow / literally impossible to predict", "giga_texas_target": "10M units/year long-term"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '68ca0620-da5f-470c-ad3a-7428c52b0d45'
  AND type = 'mass_production'
  AND title LIKE '%V3%재차 연기%'
);

-- [A] Figure AI - 로봇 vs 인간 라이브 경쟁, 98.5% 인간 수준 달성
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'score_spike', 'critical',
  'Figure 03: 로봇 vs 인간 10시간 라이브 경쟁, 98.5% 인간 수준 달성',
  'Figure AI가 2026년 5월 로봇의 ~1주간 연속 패키지 처리 라이브스트림 후, 로봇 vs 인간 10시간 직접 비교 경쟁을 실시. 로봇이 인간 대비 98.5% 성능 달성. Helix 02 AI 모델 출시로 전신 자율 동작 가능. BMW 외 추가 고객사 확대 근거.',
  '{"source": "Figure.ai, ForgeGlobal", "date": "2026-05", "reliability": "A", "details": {"competition_duration": "10 hours", "robot_vs_human_performance": "98.5%", "livestream_duration": "~1 week", "task": "package processing", "ai_model": "Helix 02", "capability": "full-body functional autonomy"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'score_spike'
  AND title LIKE '%98.5%인간 수준%'
);

-- [A] Unitree G1 - 춘절 갈라 자율 공연, 3m 트램폴린 공중제비
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'score_spike', 'info',
  'Unitree G1: 2026 춘절 갈라 자율 쿵푸/트램폴린 공연, 4m/s 주행 시연',
  'Unitree G1 로봇이 2026 춘절 갈라에서 완전 자율 쿵푸 공연 수행. 트램폴린 공중제비(3m 높이)와 4m/s 주행 시연. 별도 원격 조종 없이 순수 자율 동작. H2/R1 신규 모델라인도 확장 중. UnifoLM-VLA-0 오픈소스 VLA 모델 공개(2026.3).',
  '{"source": "Wikipedia-Unitree, ZMProbots", "date": "2026-02", "reliability": "A", "details": {"event": "2026 Spring Festival Gala", "autonomous": true, "kung_fu": "fully autonomous", "trampoline_height_m": 3, "running_speed_ms": 4, "new_models": ["H2", "R1"], "open_source": "UnifoLM-VLA-0 (March 2026)"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'score_spike'
  AND title LIKE '%춘절 갈라%'
);

-- [A] Apptronik Apollo - 전략적 C-level 채용 (Waymo/BD/Amazon 출신)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb', 'partnership', 'info',
  'Apptronik Apollo: CPO Daniel Chu 영입, Waymo/BD/Amazon 출신 C-level 대거 채용',
  'Apptronik이 2026년 4월 전략적 경영진 채용을 발표. Daniel Chu를 CPO로 영입하고 Waymo, Boston Dynamics, Amazon 등 Top Tech 출신 시니어 리더십 합류. 직원 수 약 300명(시리즈 A 초기 대비 2배). 2026년 신규 로봇 모델 데뷔 예정.',
  '{"source": "Yahoo Finance, Apptronik.com", "date": "2026-04", "reliability": "A", "details": {"cpo": "Daniel Chu", "exec_origins": ["Waymo", "Boston Dynamics", "Amazon"], "headcount": 300, "growth": "2x since Series A", "new_robot_2026": true}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'fbeae91e-3f86-45a0-899f-bc7365f9e5bb'
  AND type = 'partnership'
  AND title LIKE '%Daniel Chu%Waymo%'
);

-- [B] Agibot - BotShare 로봇 렌탈 플랫폼, $142M 매출 목표
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'warning',
  'AGIBOT: BotShare 로봇 렌탈 플랫폼 출시, 200+ 도시 확장, $142M 매출 목표',
  'Agibot이 BotShare 로봇 렌탈 플랫폼을 출시. 2026년 내 중국 200개+ 도시로 확장 계획. SCMP 보도에 따르면 US$142M(약 ¥1B) 매출 목표 제시. 상장은 직접 IPO 대신 상장사 지배지분 인수 방식 추진. LG Electronics, BYD, Mirae Asset 등 전략적 투자 유치.',
  '{"source": "SCMP, Capital.com, TechTimes", "date": "2026", "reliability": "B", "details": {"platform": "BotShare", "cities_target": "200+", "revenue_target_usd": 142000000, "listing_method": "controlling stake acquisition in listed company", "strategic_investors": ["LG Electronics", "BYD", "Mirae Asset", "Hillhouse"]}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'mass_production' AND title LIKE '%BotShare%$142M%'
)
LIMIT 1;

-- [A] 1X NEO - $499/월 구독 모델 + $20K 구매 양립 전략
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '771e5c4e-c662-42ab-9eff-f542ca05e5be', 'mass_production', 'warning',
  '1X NEO: $499/월 구독 모델 도입, 소비자 시장 진입 장벽 대폭 하락',
  '1X Technologies가 NEO에 $20,000 일시불 구매 외에 월 $499 구독 모델을 도입. 가정용 로봇 시장 진입 장벽을 극적으로 낮춤. 30kg 초경량 프레임(Tesla 57kg, BD 89kg 대비). 2027년까지 연 100,000대 생산 목표. San Carlos 추가 공장 계획.',
  '{"source": "eWeek, GlobeNewsWire, Notebookcheck", "date": "2026", "reliability": "A", "details": {"purchase_price": "$20,000", "subscription_price": "$499/month", "weight_kg": 30, "height": "5ft 6in", "production_target_2027": "100,000/year", "additional_factory": "San Carlos", "remote_support": "scheduled 1X expert sessions"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '771e5c4e-c662-42ab-9eff-f542ca05e5be'
  AND type = 'mass_production'
  AND title LIKE '%$499%구독%'
);

-- [B] Agility Digit - V5 차세대 사양 확정, 50lb 페이로드 & ISO 안전 인증 추진
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'eef19658-2629-4471-8823-07ad74045c77', 'score_spike', 'info',
  'Agility Digit V5: 페이로드 50lb 확대, ISO 기능안전 인증 2026 하반기 취득 목표',
  'Agility Robotics가 차세대 Digit V5에서 페이로드를 50lb(~23kg)로 확대하고 배터리 수명 개선. ISO 기능안전 인증을 추진하여 2026년 중후반 인간 협업 환경 승인 취득 목표. RBR50 올해의 로봇상 수상. 유일한 상업 수익 창출 양족 보행 로봇.',
  '{"source": "Robozaps, HumanoidPress, AgilityRobotics", "date": "2026", "reliability": "B", "details": {"next_gen": "Digit V5", "payload_lb": 50, "iso_cert_target": "mid-late 2026", "award": "RBR50 Robot of the Year", "revenue_generating": true, "barrier_free_work": "human collaboration clearance"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'eef19658-2629-4471-8823-07ad74045c77'
  AND type = 'score_spike'
  AND title LIKE '%V5%50lb%ISO%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Tesla Optimus V3 reveal delay
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Tesla Optimus V3: Gen 3 공개 재차 연기, Fremont 7-8월 양산 시작',
  'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22'::timestamp,
  'Tesla가 Optimus V3 공개를 2026년 후반으로 재차 연기. Model S/X 라인 5월 종료 후 Fremont에서 7-8월 양산 시작이나 초기 생산 속도는 예측 불가.',
  'Electrek 보도에 따르면 Tesla가 Optimus V3(Gen 3) 공개를 2026년 후반으로 재차 연기했다. 14년간 이어진 Model S 생산을 2026년 2분기에 종료하고 Fremont 공장을 Optimus 양산 라인으로 전환한다. 7-8월 양산 시작 목표이나 10,000개 고유 부품으로 초기 생산 속도는 "literally impossible to predict" 수준. Giga Texas에 2세대 시설을 착공하여 장기 연 1,000만대 목표.',
  'ko', 'industry', 'robot',
  encode(sha256(('tesla-optimus-v3-delay-fremont-2026-04')::bytea), 'hex'),
  'e2d215a2-3ac2-47db-8698-edcee9e9525d',
  '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus Gen 3", "Optimus V3"], "technologies": ["Fremont line conversion"], "marketInsights": ["V3 reveal delayed again", "7-8月 production start", "10M/year Giga Texas target"], "keyPoints": ["Gen 3 공개 재차 연기", "Fremont 7-8월 양산", "10K 고유 부품으로 초기 저속"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('tesla-optimus-v3-delay-fremont-2026-04')::bytea), 'hex'));

-- Figure robot vs human competition
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure 03: 로봇 vs 인간 10시간 직접 경쟁, 98.5% 인간 성능 달성',
  'Figure.ai / ForgeGlobal',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-15'::timestamp,
  'Figure AI가 ~1주간 연속 패키지 처리 후 로봇 vs 인간 10시간 경쟁 실시. 98.5% 인간 성능 달성. Helix 02로 전신 자율 동작 구현.',
  'Figure AI가 2026년 5월 Figure 03 로봇을 ~1주간 연속으로 패키지 처리하는 라이브스트림을 진행한 후, 로봇과 인간의 10시간 직접 비교 경쟁을 실시했다. 로봇이 인간 대비 98.5% 성능을 달성하여 물류 환경에서의 실용성을 입증. 한편 Helix 02 AI 모델이 출시되어 전신에 걸친 기능적 자율 동작(functional autonomy)이 가능해졌다. BMW 파트너십 외 추가 산업 고객 확보의 근거가 됨.',
  'ko', 'technology', 'robot',
  encode(sha256(('figure-robot-vs-human-98pct-2026-05')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "BMW"], "mentionedRobots": ["Figure 03"], "technologies": ["Helix 02", "functional autonomy"], "marketInsights": ["98.5% human performance", "1-week continuous operation"], "keyPoints": ["로봇 vs 인간 98.5%", "Helix 02 전신 자율", "~1주 연속 가동"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-robot-vs-human-98pct-2026-05')::bytea), 'hex'));

-- Unitree Spring Festival Gala
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree G1: 2026 춘절 갈라 자율 쿵푸 공연, 트램폴린 3m 공중제비',
  'Wikipedia / ZMProbots',
  'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
  '2026-02-01'::timestamp,
  'Unitree G1이 2026 춘절 갈라에서 완전 자율 쿵푸 공연. 트램폴린 공중제비 3m, 주행속도 4m/s 시연. H2/R1 신규 모델 발표.',
  'Unitree G1 로봇들이 2026 춘절 갈라에서 완전 자율 쿵푸 세그먼트를 수행했다. 인간 개입 없이 순수 자율 동작으로 수행. 또한 트램폴린에서 3m 높이 공중제비와 4m/s 주행 시연을 선보여 양족 보행 능력의 수준을 과시. G1 외에 H2, R1 등 신규 모델라인도 확장 중. 가격은 Base 모델 $16K부터 EDU 모델 $43.9K까지 16개 구성 제공.',
  'ko', 'technology', 'robot',
  encode(sha256(('unitree-g1-spring-festival-gala-2026')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics"], "mentionedRobots": ["G1", "H2", "R1"], "technologies": ["autonomous locomotion", "trampoline acrobatics"], "marketInsights": ["$16K base price", "16 configurations"], "keyPoints": ["춘절 갈라 자율 쿵푸", "3m 공중제비", "4m/s 주행"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-g1-spring-festival-gala-2026')::bytea), 'hex'));

-- Apptronik executive hires
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Apptronik: CPO Daniel Chu 영입, Waymo/BD/Amazon 출신 대거 채용',
  'Yahoo Finance / Apptronik',
  'https://finance.yahoo.com/sectors/technology/articles/apptronik-accelerates-commercialization-humanoid-robots-130000528.html',
  '2026-04-15'::timestamp,
  'Apptronik이 CPO Daniel Chu 영입과 함께 Waymo, Boston Dynamics, Amazon 출신 시니어 리더십 대거 합류. 직원 300명(2배 성장).',
  'Apptronik이 2026년 4월 전략적 경영진 채용을 발표했다. Daniel Chu를 Chief Product Officer로 영입하고, Waymo, Boston Dynamics, Amazon 등 Top Tech 기업 출신 시니어 리더십이 대거 합류했다. 직원 수는 약 300명으로 시리즈 A 초기 대비 약 2배 성장. 2026년 신규 로봇 모델 데뷔 예정이며 Austin 확장 및 캘리포니아 오피스 개설도 병행 중.',
  'ko', 'industry', 'robot',
  encode(sha256(('apptronik-cpo-daniel-chu-exec-hires-2026-04')::bytea), 'hex'),
  '2b53d7b2-ddfe-45bd-8e21-f545d3566f4d',
  '{"mentionedCompanies": ["Apptronik", "Waymo", "Boston Dynamics", "Amazon"], "mentionedRobots": ["Apollo"], "technologies": [], "marketInsights": ["300 employees (2x growth)", "new robot 2026"], "keyPoints": ["CPO Daniel Chu 영입", "Top Tech 출신 대거 채용", "직원 2배 성장"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('apptronik-cpo-daniel-chu-exec-hires-2026-04')::bytea), 'hex'));

-- Agibot BotShare platform
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT: BotShare 로봇 렌탈 플랫폼 출시, $142M 매출 목표',
  'SCMP / Capital.com',
  'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us-142-million-revenue-march-humanoid-robots-gathers-pace',
  '2026-05-01'::timestamp,
  'Agibot이 BotShare 로봇 렌탈 플랫폼 출시. 2026년 200+ 도시 확장, $142M 매출 목표. 직접 IPO 대신 상장사 인수로 상장 추진.',
  'Agibot이 BotShare 로봇 렌탈 플랫폼을 출시하여 기업 및 개인 고객에게 로봇 대여 서비스를 제공한다. 2026년 내 중국 200개 이상 도시로 확장 계획. South China Morning Post에 따르면 US$142M(약 ¥1B) 매출을 목표로 제시. 상장은 직접 IPO 대신 상장사 지배지분 인수 방식을 추진하고 있다. 전략적 투자자로 LG Electronics, BYD, Mirae Asset, Hillhouse Investment 등이 참여.',
  'ko', 'industry', 'robot',
  encode(sha256(('agibot-botshare-142m-revenue-2026')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["Agibot", "LG Electronics", "BYD", "Mirae Asset"], "mentionedRobots": ["Expedition A3"], "technologies": ["BotShare rental platform"], "marketInsights": ["$142M revenue target", "200+ cities", "listing via acquisition"], "keyPoints": ["BotShare 플랫폼 출시", "$142M 매출 목표", "상장사 인수 방식 상장"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-botshare-142m-revenue-2026')::bytea), 'hex'));

-- 1X NEO subscription model
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  '1X NEO: $499/월 구독 모델 도입, $20K 구매 외 소비자 접근성 확대',
  'eWeek / Notebookcheck / GlobeNewsWire',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-04-30'::timestamp,
  '1X Technologies가 NEO에 $499/월 구독 모델 도입. $20K 일시불 외 대안. 30kg 초경량. Hayward 공장 본격 가동. 2027년 100K/년 목표.',
  '1X Technologies가 NEO 가정용 로봇에 $20,000 일시불 구매 외에 월 $499 구독 모델을 도입했다. 소비자 시장 진입 장벽을 극적으로 낮추는 전략. NEO는 30kg 초경량 프레임(Tesla Optimus 57kg, BD Atlas 89kg 대비)으로 가정 환경에 최적화. 2026년 4월 30일 Hayward, CA 공장(58,000 sq ft)이 본격 가동을 시작했으며, 2027년 말까지 100,000대/년 생산 목표. San Carlos에 추가 공장도 계획. 원격 전문가 지원 서비스도 포함.',
  'ko', 'industry', 'robot',
  encode(sha256(('1x-neo-499-subscription-model-2026')::bytea), 'hex'),
  'b3657755-ed31-4e0d-88c1-07d91811bd87',
  '{"mentionedCompanies": ["1X Technologies"], "mentionedRobots": ["NEO"], "technologies": ["subscription model", "remote expert support"], "marketInsights": ["$499/mo subscription", "$20K purchase", "30kg lightest humanoid"], "keyPoints": ["$499/월 구독 모델", "30kg 초경량", "2027 100K/년 목표"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('1x-neo-499-subscription-model-2026')::bytea), 'hex'));

-- Agility Digit V5 specs
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Digit V5: 페이로드 50lb, ISO 기능안전 인증 2026H2 취득 추진',
  'Robozaps / HumanoidPress',
  'https://humanoid.press/database/agility-robotics-digit-v5-commercial-logistics/',
  '2026-06-01'::timestamp,
  '차세대 Digit V5에서 페이로드 50lb 확대, 배터리 개선. ISO 기능안전 인증 2026 하반기 취득 목표. RBR50 올해의 로봇상.',
  'Agility Robotics가 차세대 Digit V5에서 페이로드를 50lb(~23kg)로 확대하고 배터리 수명도 개선할 예정이다. ISO 기능안전 인증을 추진하여 2026년 중후반 인간 협업 환경 승인을 취득할 계획. 현재 양족 보행 로봇 중 유일하게 상업 수익을 창출하고 있으며 The Robot Report의 RBR50 올해의 로봇상을 수상. Barrier-free work 환경을 목표로 인간과 동일 공간에서 안전하게 작업 가능한 인증 확보에 주력.',
  'ko', 'technology', 'robot',
  encode(sha256(('agility-digit-v5-50lb-iso-2026')::bytea), 'hex'),
  'cd6e1dc1-567d-4451-bfc5-c15b2729212e',
  '{"mentionedCompanies": ["Agility Robotics"], "mentionedRobots": ["Digit V5"], "technologies": ["ISO functional safety", "barrier-free collaboration"], "marketInsights": ["50lb payload upgrade", "only revenue-generating bipedal robot"], "keyPoints": ["V5 페이로드 50lb", "ISO 인증 2026H2", "RBR50 수상"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-v5-50lb-iso-2026')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

-- Tesla Optimus V3 delay
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "optimus", "updates": [{"field": "production_timeline", "new_value": "Gen 3 공개 재차 연기 → 2026년 후반. Fremont 양산 7-8월 시작 (초기 저속)", "source": "Electrek 2026-04-22", "reliability": "C"}, {"field": "factory_expansion", "new_value": "Model S/X 종료(5월) → Optimus 전환. Giga Texas 10M/년 목표 착공", "source": "TechTimes, TheRobotReport", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload->>'competitor_slug' = 'optimus' AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- Figure robot vs human
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure", "updates": [{"field": "performance_benchmark", "new_value": "로봇 vs 인간 10시간 경쟁 → 98.5% 인간 성능 달성", "source": "Figure.ai official, ForgeGlobal", "reliability": "A"}, {"field": "ai_model", "new_value": "Helix 02 출시 — 전신 기능적 자율 동작(functional autonomy)", "source": "Figure.ai", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "figure"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- Unitree Spring Festival
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "demo_capability", "new_value": "2026 춘절 갈라 자율 쿵푸, 트램폴린 3m 공중제비, 4m/s 주행", "source": "Wikipedia, ZMProbots", "reliability": "A"}, {"field": "product_expansion", "new_value": "H2, R1 신규 모델라인 확장. Base $16K~EDU $43.9K (16개 구성)", "source": "botinfo.ai, Robozaps", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "unitree-g1"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- Apptronik exec hires
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "apollo", "updates": [{"field": "leadership", "new_value": "CPO Daniel Chu 영입 + Waymo/BD/Amazon 출신 C-level. 직원 300명(2x 성장)", "source": "Yahoo Finance, Apptronik.com", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "apollo"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- Agibot BotShare
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "platform", "new_value": "BotShare 로봇 렌탈 플랫폼 출시, 200+ 도시 확장 예정", "source": "SCMP, Capital.com", "reliability": "B"}, {"field": "financials", "new_value": "$142M 매출 목표. 상장사 인수 방식 상장 추진. LG/BYD/Mirae Asset 투자", "source": "SCMP, Capital.com", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "agibot"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- 1X subscription
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "neo", "updates": [{"field": "pricing_model", "new_value": "$20K 구매 + $499/월 구독 양립. 30kg 초경량 (Optimus 57kg, Atlas 89kg 대비)", "source": "eWeek, GlobeNewsWire", "reliability": "A"}, {"field": "production", "new_value": "Hayward 공장 본격 가동(2026.4.30). 2027 100K/년 목표. San Carlos 추가 공장 계획", "source": "GlobeNewsWire", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "neo"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- Agility Digit V5
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "next_gen_specs", "new_value": "Digit V5: 페이로드 50lb(~23kg) 확대, 배터리 개선", "source": "Robozaps, HumanoidPress", "reliability": "B"}, {"field": "certification", "new_value": "ISO 기능안전 인증 2026H2 취득 목표 → 인간 협업 환경 승인", "source": "HumanoidPress, AgilityRobotics", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload @> '{"competitor_slug": "digit"}'::jsonb AND source_channel = 'auto' AND created_at::date = '2026-06-22');

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Electrek', 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/', 'Tesla Optimus V3 공개 재차 연기, Fremont 7-8월 양산', 'Gen 3 공개 후반으로 연기. Model S/X 종료 후 Fremont 전환. 10K 고유 부품 초기 저속.'),
  ('Figure.ai/ForgeGlobal', 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/', 'Figure 03 로봇 vs 인간 98.5% 성능 달성', '~1주 연속 패키지 처리 후 10시간 경쟁. Helix 02 전신 자율 동작.'),
  ('Wikipedia/ZMProbots', 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/', 'Unitree G1 춘절 갈라 자율 쿵푸, 트램폴린 3m', '완전 자율 쿵푸 공연. 트램폴린 3m 공중제비. 4m/s 주행. H2/R1 확장.'),
  ('Yahoo Finance', 'https://finance.yahoo.com/sectors/technology/articles/apptronik-accelerates-commercialization-humanoid-robots-130000528.html', 'Apptronik CPO Daniel Chu 영입, Top Tech 출신 대거 채용', 'Waymo/BD/Amazon 출신 C-level. 직원 300명. 2026 신규 로봇 예정.'),
  ('SCMP', 'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us-142-million-revenue-march-humanoid-robots-gathers-pace', 'AGIBOT BotShare 플랫폼, $142M 매출 목표', 'BotShare 렌탈 플랫폼. 200+ 도시. 상장사 인수 방식 상장.'),
  ('eWeek/GlobeNewsWire', 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/', '1X NEO $499/월 구독 모델, 30kg 초경량', '$20K 구매 + $499/월 구독. 30kg 프레임. Hayward 본격 가동.'),
  ('Robozaps/HumanoidPress', 'https://humanoid.press/database/agility-robotics-digit-v5-commercial-logistics/', 'Agility Digit V5 페이로드 50lb, ISO 인증 추진', 'V5 페이로드 50lb. ISO 기능안전 2026H2. RBR50 올해의 로봇상.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
