-- War Room 경쟁사 데이터 자동 업데이트 - 2026-09-11
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-09-11T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('NextBigFuture / TrendForce',
   'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html',
   'Tesla 서플라이어에 Optimus 15,000대 부품 발주 — 9월 1,000대/주, 연말 2,500대/주',
   '2026년 말까지 총 15,000대 Gen 3 부품 발주. 9월 주 1,000대, 연말 주 2,500대 목표. Giga Texas 내부 배치 운영 중.'),

  ('Yahoo Finance / optimusk.blog',
   'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
   'Tesla Optimus AI5 추론칩 2026.4 테이프아웃, Gen 3 핸드 50 액추에이터/22 DOF',
   'AI5 추론칩 4월 테이프아웃. Gen 3 핸드 50 액추에이터, 22 DOF. 2.3 kWh 배터리. Grok 음성. Fremont S/X 라인 46일 해체.'),

  ('Forbes / Boston Dynamics',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   'Atlas Gen 5 — 부품 수 "거의 한 자릿수 배" 감소, 양산 설계 최적화',
   '2026.7 5세대 공개. 부품 복잡도 거의 한 자릿수 감소. 제조 속도·신뢰성·비용 개선. 연 30,000대 체제 기반.'),

  ('Figure AI / iiot-world',
   'https://www.figure.ai/news/ramping-figure-03-production',
   'Figure 03 1,000번째 유닛 생산 (7/23) — BotQ 시간당 1대, BMW 30,000+ X3 기여',
   '7/23 1,000번째 생산. 시간당 1대. Figure 02 BMW 11개월 배치, 30,000+ X3. BotQ 연 12,000대 능력.'),

  ('CNBC / Yahoo Finance / Bloomberg',
   'https://www.cnbc.com/2026/08/19/china-backflipping-robot-maker-unitree-jumps-shanghai-ipo.html',
   'Unitree IPO 첫날 460% 급등, 8,000배 청약 — 밸류에이션 $9B, 시총 $53B',
   '8/19 STAR Market 상장. ¥150.80→¥845(+460%). 장중 1,100위안(+629%). 8,000배 청약. $9억 IPO. 시총 $53B.'),

  ('Interesting Engineering',
   'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
   'Unitree H2 20,000대 연간 생산 목표, 생산능력 4배 확대',
   '생산능력 4배 확대. 연 20,000대 목표. H1→H2 대체. H2 $29,900, G1 $13,500. 글로벌 32%.'),

  ('The Robot Report / SEC Filing',
   'https://www.therobotreport.com/agility-robotics-reports-18m-revenue-ahead-of-humanoid-spac/',
   'Agility S-4 공시: 2025 매출 $1.8M, 영업손실 $140M, $300M+ V5 수주',
   'S-4: 2025 순매출 $1.8M, 영업손실 $140M. $300M+ V5 수주. 9개 사이트. SPAC $620M+.'),

  ('NVIDIA Newsroom',
   'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
   'NVIDIA Halos 로봇 안전 플랫폼 — Agility Digit 최초 통합 파트너',
   '로봇 최초 풀스택 안전 시스템. Digit V5에 통합. 케이지 밖 작업 가능케 하는 핵심.'),

  ('New Market Pitch / Reuters',
   'https://newmarketpitch.com/blogs/news/humanoid-robotics-apptronik-upate',
   'Apptronik Apollo 3 최초 상용 제품 예고 (2027), Jabil 3번째 고객',
   'Apollo 2=훈련 플랫폼. Apollo 3=최초 상용(2027). Jabil 3번째 고객. Elevate Robotics 자회사.'),

  ('Forbes / eWeek / TNW',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '1X NEO 사전주문 5일 만에 10,000대 완판, EQT 10,000대 딜',
   '5일 완판. EQT 10,000대 딜. $20,000 또는 월$499. Tendo Drives. ~22 dB. San Carlos 추가 시설.'),

  ('Forbes / Interesting Engineering',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/15/world-first-humanoid-robot-on-live-industrial-scale-electronics-production-line/',
   'Agibot A3 우슈 금메달, G2 태블릿 양산라인 세계 최초 실전 배치',
   '8/24 World Humanoid Robot Games 우슈 금메달. G2 태블릿 양산라인 세계 최초 인간 공존 배치.'),

  ('Tracxn / PitchBook / SCMP',
   'https://pitchbook.com/profiles/company/528463-99',
   'Agibot 홍콩 IPO 준비 — HK$40B~50B 목표, LG전자·Mirae Asset 투자자',
   'HK IPO HK$40B~50B. LG전자, Mirae Asset, BYD, Hillhouse. H1 2026 8,400대(44%). 누적 15,000+.'),

  ('Humanoid Robots Summit',
   'https://humanoidrobotssummit.com/',
   'HRS Europe 2026 슈투트가르트 (9/9~11) — BD, DeepMind, Unitree, BMW 등 참가',
   '1,000+ 참석. 37 연사(Bosch, BD, DeepMind, Unitree, PAL, BMW). 40+ 전시. 유럽 최대 휴머노이드 행사.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "production_target_2026", "new_value": "15,000대 부품 발주, 9월 1K/주→연말 2.5K/주", "source": "NextBigFuture 2026-09", "reliability": "B"}, {"field": "custom_chip", "new_value": "AI5 추론칩 2026.4 테이프아웃, Gen 3 핸드 50 액추에이터/22 DOF, Grok 음성", "source": "Yahoo Finance", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%15,000대 부품 발주%AI5 추론칩%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "gen5_design", "new_value": "Gen 5: 부품 복잡도 ~10배 감소, 양산 최적화 설계, 연 30,000대 체제 기반", "source": "Forbes 2026-07-02", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Gen 5%부품 복잡도%10배 감소%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "production_milestone", "new_value": "1,000번째 Figure 03 생산(7/23), 시간당 1대, BotQ 연 12,000대", "source": "Figure AI official", "reliability": "A"}, {"field": "bmw_results", "new_value": "Figure 02 BMW Spartanburg 11개월 배치, 30,000+ X3 기여, 1,250+ 가동시간", "source": "iiot-world", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%1,000번째 Figure 03%BMW%30,000%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "ipo_trading", "new_value": "8/19 STAR Market: ¥150.80→¥845(+460%), 장중 +629%, 8,000배 청약, 시총 $53B", "source": "CNBC, Bloomberg", "reliability": "A"}, {"field": "production_target", "new_value": "연 20,000대 목표, 생산능력 4배 확대, H1→H2 대체", "source": "Interesting Engineering", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%460%8,000배%20,000대%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "spac_financials", "new_value": "2025 매출 $1.8M, 영업손실 $140M, $300M+ V5 수주, 30+ 잠재고객", "source": "SEC S-4 Filing", "reliability": "A"}, {"field": "nvidia_halos", "new_value": "NVIDIA Halos 풀스택 안전 시스템 최초 통합 파트너, 케이지 밖 작업", "source": "NVIDIA Newsroom", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%$1.8M%$140M%NVIDIA Halos%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "product_roadmap", "new_value": "Apollo 2=훈련/데이터 플랫폼, Apollo 3=최초 상용 제품(2027)", "source": "New Market Pitch", "reliability": "B"}, {"field": "customers", "new_value": "Jabil 3번째 고객 추가(Mercedes-Benz, GXO, Jabil)", "source": "RoboZaps", "reliability": "B"}, {"field": "subsidiary", "new_value": "Elevate Robotics Inc. 자회사(2025.6 설립) — 초인간적 산업 자동화", "source": "Reuters", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Apollo 3%Jabil%Elevate Robotics%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "demand", "new_value": "사전주문 5일 만에 10,000대 완판, EQT 10,000대 배치 딜", "source": "Forbes 2026-04-30", "reliability": "A"}, {"field": "hardware", "new_value": "자체 Tendo Drives 모터(고토크 텐던), 작동소음 ~22 dB", "source": "eWeek, RoboZaps", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%5일 만에 10,000대%Tendo Drives%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "competition_results", "new_value": "8/24 World Humanoid Robot Games 우슈(태극권) 금메달 (A3)", "source": "Forbes, IE", "reliability": "A"}, {"field": "industrial_deployment", "new_value": "G2 태블릿 양산라인 세계 최초 산업 규모 실전 배치", "source": "Forbes 2026-04-15", "reliability": "A"}, {"field": "ipo_plan", "new_value": "홍콩 IPO 준비, HK$40B~50B 목표, LG전자·Mirae Asset 전략 투자", "source": "PitchBook, SCMP", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%우슈%금메달%홍콩 IPO%' AND created_at::date = CURRENT_DATE);

COMMIT;
