-- ============================================
-- ARGOS 경쟁사 데이터 자동 업데이트
-- 날짜: 2026-06-19
-- 수집 에이전트: Claude Scheduled Routine
-- ============================================

-- ci_monitor_alerts 테이블에 INSERT
-- competitor_id는 ci_competitors 테이블에서 slug 기반으로 조회
-- 중복 방지: headline + detected_at 기준

BEGIN;

-- ============================================
-- 1. Tesla Optimus
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'TechTimes / TheRobotReport',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  'Tesla, Fremont Model S/X 라인을 Optimus 로봇 공장으로 전환 — Gen 3 2026 생산 시작',
  'Tesla가 Fremont 공장의 Model S/X 생산라인을 Optimus 로봇 생산시설로 전환. 2026년 7-8월 생산 시작 예정, 연간 100만대 생산 가능 시설. Giga Texas에 2세대 시설 착공, 장기 목표 연 1000만대. 초기 제조원가 $60,000+/대, 상용판매 가격 $20-30K 목표. [신뢰도: B — 복수 매체 교차확인]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%optimus%' OR c.name ILIKE '%optimus%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'TheRobotReport',
  'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  'Tesla, Giga Texas에 Optimus 2세대 공장 착공 — 연 1000만대 목표',
  'Tesla가 Giga Texas에 Optimus 로봇 2세대 생산시설 착공. 장기 생산 목표 연간 1,000만대. Fremont에서의 초기 생산과 병행하여 대규모 양산 체제 구축 중. [신뢰도: B — 복수 매체 교차확인]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%optimus%' OR c.name ILIKE '%optimus%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Boston Dynamics Atlas
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Engadget / Robotics247',
  'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  'Boston Dynamics, CES 2026에서 양산형 Atlas 공개 — 2026 배치분 전량 예약 완료',
  'CES 2026에서 양산형 전기 Atlas 로봇 공개. Hyundai RMAC 및 Google DeepMind에 함대 배치 예정. 2026년 배치분 전량 예약 완료, 2027년 추가 고객 예정. 사양: 리치 7.5ft, 110lbs 리프트, -4~104°F 작동, 자동 배터리 교체 기능. [신뢰도: A — 공식 1차 출처 (Boston Dynamics 공식 블로그)]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'hw' OR slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%atlas%' OR c.name ILIKE '%atlas%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Boston Dynamics 공식',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Atlas, Hyundai RMAC & Google DeepMind에 배치 확정 — 파트너십 확대',
  'Boston Dynamics Atlas 로봇이 Hyundai Robotics Metaplant Application Center(RMAC)와 Google DeepMind에 배치 확정. 산업용 다양한 작업 수행 가능, 일관성과 신뢰성 중심 설계. 보스턴 본사에서 즉시 생산 시작. [신뢰도: A — 공식 1차 출처]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%atlas%' OR c.name ILIKE '%atlas%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Figure AI (Figure 02/03)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Yahoo Finance / Forge Global',
  'https://finance.yahoo.com/news/figure-valued-39-billion-latest-131115237.html',
  'Figure AI, Series C $10억+ 조달 — 기업가치 $390억, NVIDIA·LG·Intel 참여',
  'Figure AI가 Series C 라운드에서 $10억+ 조달, 기업가치 약 $390억 달성. Parkway Venture Capital 리드, NVIDIA, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm Ventures 참여. BMW 사우스캐롤라이나 공장에서 30,000대 차량 생산에 기여. [신뢰도: A — 공식 발표 + 복수 매체]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%figure%' OR c.name ILIKE '%figure%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forge Global',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  'Figure AI, 자체 AI 모델 Helix 개발 — OpenAI 협업 종료 후 독자 노선',
  'Figure AI가 OpenAI와의 협업을 종료하고 자체 AI 모델 Helix 및 Project Go-Big 대규모 학습 이니셔티브 추진. Figure 03 플랫폼 2026년 개발 중 (페이로드/로코모션 향상). Brookfield 파트너십으로 100,000 주거유닛에서 일상 작업 데이터 수집. [신뢰도: B — 복수 매체 교차확인]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'sw' OR slug = 'data' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%figure%' OR c.name ILIKE '%figure%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. Unitree (H1/G1/B2)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'eWeek / Morgan Stanley',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree, 2026년 20,000대 출하 목표 — 글로벌 유일 흑자, 상해 IPO 심사 통과',
  '2025년 매출 ¥17.08억(335% YoY), 글로벌 유일 흑자 휴머노이드 기업. 2026년 20,000대 출하 목표. Morgan Stanley 중국 시장 전망 28,000대. 상해거래소 상장심사 통과(2026/6/1). H2, R1 모델 출시. [신뢰도: A — 공식 재무 데이터 + IPO 공시]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%unitree%' OR c.name ILIKE '%unitree%' OR c.name ILIKE '%g1%' OR c.name ILIKE '%h1%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Yahoo Tech / Unitree 공식',
  'https://tech.yahoo.com/science/articles/unitrees-h2-robot-poses-pirouettes-170147250.html',
  'Unitree H1, 36km/h 주행 달성 — UnifoLM-VLA-0 오픈소스 공개',
  'H1 로봇 2026년 4월 야외 트랙에서 36km/h(22.4mph) 달성(무선, 안전장치 없음). G1 자율 무술 시연 성공. 2026년 3월 UnifoLM-VLA-0 Vision-Language-Action 모델 오픈소스 공개 — 자연어 명령으로 가정용 작업 자율 수행. [신뢰도: A — 공식 시연 + 기술 공개]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'hw' OR slug = 'sw' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%unitree%' OR c.name ILIKE '%unitree%' OR c.name ILIKE '%g1%' OR c.name ILIKE '%h1%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Agility Robotics (Digit)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Agility Robotics 공식',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  'Agility Robotics, Toyota Canada와 RaaS 상용 계약 — 파일럿 → 정식 배치 전환',
  'Toyota Motor Manufacturing Canada(TMMC)와 Robots-as-a-Service 상용 계약 체결(2026/2/19). 파일럿 성공 후 제조/물류 운영에 Digit 정식 배치. Amazon, GXO, Schaeffler에 이어 Fortune 500 고객 확대. 2025 Series C $4억 조달, 10,000대 생산 목표. [신뢰도: A — 공식 1차 출처]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%digit%' OR c.name ILIKE '%digit%' OR c.slug ILIKE '%agility%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Apptronik (Apollo)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'CNBC / Crunchbase',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik, $5.2억 추가 조달 — 총 $9.35억, 기업가치 $50억',
  'Series A 확장으로 $5.2억 추가 조달(총 $9.35억). 기업가치 $50억. B Capital, Google, Mercedes-Benz, Peak6, AT&T Ventures, John Deere 참여. Mercedes-Benz, GXO Logistics, Jabil에서 Apollo 운용 중. Google DeepMind Gemini Robotics AI 모델 통합. 2026년 신형 로봇 데뷔 예정. [신뢰도: A — 공식 발표 + 복수 매체]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%apollo%' OR c.name ILIKE '%apollo%' OR c.slug ILIKE '%apptronik%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. 1X Technologies (NEO)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'GlobeNewsWire / TheRobotReport',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X Technologies, 미국 최초 수직통합 휴머노이드 공장 개소 — 2026 소비자 배송 시작',
  'Hayward CA에 미국 최초 수직통합 휴머노이드 로봇 공장 개소(2026/4/30). 초년도 10,000대, 2027년 100,000대 생산 목표. 가격 $20,000(얼리액세스) 또는 월 $499 구독. NVIDIA Jetson Thor 탑재. 모터/배터리/센서 자체 생산. 소비자 가정용 범용 로봇 포지셔닝. [신뢰도: A — 공식 보도자료]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' OR slug = 'hw' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%neo%' OR c.name ILIKE '%neo%' OR c.slug ILIKE '%1x%' OR c.name ILIKE '%1x%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Agibot (X1)
-- ============================================

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Capital.com / RoboZaps',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  'Agibot, 10,000대+ 출하로 세계 1위 — 홍콩 IPO 2026 Q3 예정',
  '2026년 3월 기준 10,000대+ 생산/출하로 출하량 기준 세계 1위. "Deployment Year One" 선언. 홍콩 IPO 2026 Q3 예정. 제품군: A2 Ultra, A2-W, X1/X2(오픈소스), D1(쿼드러핏), OmniHand. CATL, LG Electronics, BYD, Mirae Asset, Hillhouse 전략적 투자. NVIDIA, Pepsi 등과 파트너십. [신뢰도: B — 복수 매체 교차확인]',
  c.id,
  (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
  '2026-06-19 00:00:00',
  'pending'
FROM ci_competitors c
WHERE c.slug ILIKE '%agibot%' OR c.name ILIKE '%agibot%' OR c.slug ILIKE '%x1%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- competitive_alerts 테이블 — 주요 경쟁 알림
-- ============================================

-- Tesla: 양산 라인 전환 — critical
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  r.id,
  'mass_production',
  'critical',
  'Tesla Optimus Gen 3 — Fremont 양산라인 전환, 2026 H2 생산 시작',
  'Tesla가 Fremont Model S/X 라인을 Optimus 공장으로 전환. 7-8월 생산 시작, 연간 100만대 생산 가능. Giga Texas에 2세대 시설 착공(목표 연 1000만대). 상용판매 가격 $20-30K.',
  '{"source": "TechTimes/TheRobotReport", "confidence": "B", "production_start": "2026-Q3", "annual_capacity": 1000000, "price_target_usd": "20000-30000"}'::jsonb,
  false,
  '2026-06-19 00:00:00'
FROM humanoid_robots r
WHERE r.name ILIKE '%optimus%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Boston Dynamics: Hyundai+Google DeepMind 배치 — critical
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  r.id,
  'partnership',
  'critical',
  'Atlas 양산형 CES 2026 공개 — Hyundai RMAC + Google DeepMind 배치 확정',
  'CES 2026에서 양산형 Atlas 공개. 2026년 배치분 전량 예약 완료(Hyundai RMAC, Google DeepMind). 리치 7.5ft, 110lbs 리프트, 자동 배터리 교체.',
  '{"source": "Engadget/Boston Dynamics 공식", "confidence": "A", "customers": ["Hyundai RMAC", "Google DeepMind"], "specs": {"reach_ft": 7.5, "lift_lbs": 110}}'::jsonb,
  false,
  '2026-06-19 00:00:00'
FROM humanoid_robots r
WHERE r.name ILIKE '%atlas%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Unitree: IPO + 흑자 — warning
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  r.id,
  'funding',
  'warning',
  'Unitree, 상해거래소 IPO 심사 통과 — 글로벌 유일 흑자 기업',
  'Unitree 상해거래소 상장심사 통과(2026/6/1). 2025 매출 ¥17.08억(335% YoY), 글로벌 유일 흑자. H1 36km/h 주행 달성.',
  '{"source": "eWeek/Morgan Stanley", "confidence": "A", "revenue_cny": 1708000000, "yoy_growth": "335%", "profitable": true, "ipo_exchange": "SSE"}'::jsonb,
  false,
  '2026-06-19 00:00:00'
FROM humanoid_robots r
WHERE r.name ILIKE '%g1%' OR r.name ILIKE '%h1%' OR r.name ILIKE '%unitree%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Apptronik: 대규모 펀딩 — warning
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  r.id,
  'funding',
  'warning',
  'Apptronik Apollo, $5.2억 추가 조달 — 총 $9.35억, 기업가치 $50억',
  'Series A 확장 $5.2억 추가 조달, 총 $9.35억. 기업가치 $50억. Google, Mercedes-Benz, AT&T Ventures, John Deere 참여. Google DeepMind Gemini Robotics AI 통합.',
  '{"source": "CNBC/Crunchbase", "confidence": "A", "funding_usd": 520000000, "total_raised_usd": 935000000, "valuation_usd": 5000000000}'::jsonb,
  false,
  '2026-06-19 00:00:00'
FROM humanoid_robots r
WHERE r.name ILIKE '%apollo%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 1X NEO: 공장 개소 — warning
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  r.id,
  'mass_production',
  'warning',
  '1X Technologies NEO — 미국 최초 수직통합 휴머노이드 공장 개소, $20K 가격',
  'Hayward CA 공장 개소(4/30). 초년도 10,000대, 2027년 100,000대 목표. $20,000 가격 또는 월 $499 구독. NVIDIA Jetson Thor 탑재. 소비자 가정용 범용 로봇.',
  '{"source": "GlobeNewsWire/TheRobotReport", "confidence": "A", "factory_location": "Hayward, CA", "year1_target": 10000, "price_usd": 20000}'::jsonb,
  false,
  '2026-06-19 00:00:00'
FROM humanoid_robots r
WHERE r.name ILIKE '%neo%'
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;
