-- ============================================================
-- War Room 경쟁사 데이터 자동 업데이트 - 2026-07-01
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-07-01.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. 신규 경쟁사 추가 (Unitree, Apptronik, AgiBot)
-- ============================================================
INSERT INTO ci_competitors (id, slug, name, manufacturer, country, stage, sort_order, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'unitree-g1', 'Unitree G1', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true, NOW(), NOW()),
  (gen_random_uuid(), 'apollo', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true, NOW(), NOW()),
  (gen_random_uuid(), 'agibot-a3', 'Expedition A3', 'AgiBot', '🇨🇳', 'commercial', 9, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. 기존 경쟁사 stage 업데이트
-- ============================================================
UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'digit';

UPDATE ci_competitors SET stage = 'pilot', updated_at = NOW()
WHERE slug = 'optimus';

UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'figure';

UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'neo';

UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW()
WHERE slug = 'atlas';

-- ============================================================
-- 3. CI Monitor Alerts - 최신 경쟁사 인텔리전스
-- ============================================================

-- === Tesla Optimus ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Tesla IR / Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  'Tesla Fremont 공장 Optimus 생산 전환 - Model S/X 라인 종료',
  'Tesla가 Fremont 공장의 Model S/X 생산라인을 Q2 2026에 종료하고 Optimus 휴머노이드 로봇 생산으로 전환. Gen 3 양산 시작은 2026년 말 이전 목표. $20B CapEx 투입 (전년 대비 2배). 초기 생산속도는 느리나 장기적으로 연 100만대 생산 목표.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Fremont%Optimus%전환%'
  AND competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Tesla IR',
  'https://www.sec.gov/Archives/edgar/data/0001318605/000162828026026551/exhibit991.htm',
  'Tesla 2026 CapEx $20B 확정 - Optimus 양산 투자 본격화',
  'Tesla가 2026년 자본지출을 $20B 이상으로 확대. Optimus Gen 3 양산라인 구축 및 공급망 확보에 집중. 첫 외부 상용 고객 2026년 말 예상. Digital Optimus(xAI 협업 AI 에이전트) 발표.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%$20B%Optimus%'
  AND competitor_id = c.id
);

-- === Boston Dynamics Atlas ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forbes / Boston Dynamics',
  'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
  'Boston Dynamics Atlas 양산 시작 - CES 2026 제품판 공개, 2026년 전량 예약 완료',
  'CES 2026에서 양산형 Atlas 공개. 2026년 생산분 전량 예약(Hyundai RMAC, Google DeepMind). 56 DOF, 50kg 가반하중, 4시간 배터리, 자율 배터리 교환. Hyundai $26B 투자 중 로봇공장 포함, 연 30,000대 생산 계획. 2027년 초 추가 고객 예정.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Atlas 양산%CES 2026%'
  AND competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Boston Dynamics Blog',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Boston Dynamics × Google DeepMind 파트너십 - Gemini Robotics AI 적용',
  'Google DeepMind와의 파트너십을 통해 Atlas에 Gemini Robotics 모델 적용. 공장 환경에서의 인지, 작업 수행, 자율성 향상 목표. 양산형 Atlas에 자율 배터리 교환 기능 탑재.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'sw'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%DeepMind%Gemini%Atlas%'
  AND competitor_id = c.id
);

-- === Figure AI ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Figure AI / TechInsider',
  'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
  'Figure AI 생산속도 24배 향상 - 시간당 1대, 350대+ 출하 (Figure 03)',
  'Figure AI가 120일 만에 생산속도를 일 1대에서 시간당 1대로 24배 향상. 2026년 4월 말 기준 350대 이상 Figure 03 출하. BMW Spartanburg 공장에 Figure 03 배치, Figure 02는 BMW X3 30,000대 이상 생산 지원 실적.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Figure AI 생산속도%24배%'
  AND competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Figure AI Official',
  'https://www.figure.ai/news/series-c',
  'Figure AI Series C $1B+ 달성 - 밸류에이션 $39B',
  'Series C 라운드에서 $1B 이상 조달, 포스트머니 밸류에이션 $39B. Parkway Venture Capital 리드, NVIDIA, Intel Capital, Microsoft, OpenAI, Bezos Expeditions 등 참여. 총 누적 펀딩 약 $1.9B.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Figure AI Series C%$39B%'
  AND competitor_id = c.id
);

-- === Unitree ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'eWeek / Forbes',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree G1 2만대 출하 목표 (2026) - 상하이 IPO 추진 ($580M)',
  '2025년 5,500대 이상 G1 출하, 2026년 2만대 목표. 상하이 거래소 IPO 3월 신청, $580M 규모 목표. 2025년 매출 335% YoY 성장. G1 가격 $16K(베이스)~$43.9K(EDU). UnifoLM-VLA-0 오픈소스 공개.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree-g1' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Unitree%2만대%IPO%'
  AND competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forbes / Japan Airlines',
  'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
  'Unitree G1 도쿄 하네다 공항 배치 - JAL/GMO 파트너십',
  'Japan Airlines와 GMO Internet Group 파트너십으로 도쿄 하네다 공항에 G1 배치. 휴머노이드 최초 상업 공항 배치 사례. 2028년까지 시범 운영 예정.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree-g1' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Unitree%하네다%'
  AND competitor_id = c.id
);

-- === Agility Robotics (Digit) ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'SEC Filing / The Robot Report',
  'https://www.therobotreport.com/humanoid-maker-agility-robotics-go-public-through-spac-merger/',
  'Agility Robotics SPAC 합병으로 상장 - $420M + Foxconn $200M',
  'Churchill Capital Corp XI와 SPAC 합병으로 상장 추진. 신탁 $420M + Foxconn 등 $200M 추가 파이낸싱. 미국 최초 순수 휴머노이드 상장사. 9개 고객시설, 65,000시간+ 가동 실적. 고객: Schaeffler, GXO, Toyota Canada, Amazon, Mercado Libre. Digit v5 개발 중.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Agility%SPAC%상장%'
  AND competitor_id = c.id
);

-- === Apptronik (Apollo) ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'CNBC / Apptronik',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik $520M 추가 조달 (Series A-X) - 총 $935M, 밸류 $5B',
  'Series A-X 라운드로 $520M 추가 조달, Series A 총합 $935M. 밸류에이션 $5B. 투자자: Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. Google DeepMind Gemini Robotics 파트너십. 신형 Apollo 2026년 공개 예정.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%Apptronik%$520M%$5B%'
  AND competitor_id = c.id
);

-- === 1X Technologies (NEO) ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'Forbes / 1X Technologies',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '1X Technologies NEO 본격 양산 개시 - 美 최초 수직통합 휴머노이드 공장',
  'Hayward, CA 공장(58,000sqft)에서 NEO 양산 개시. 200+ 직원. 1차년도 10,000대 생산능력, 사전예약 5일 만에 매진. 2026년 내 소비자 출하 시작. 2027년 말까지 100,000대 목표. EQT 파트너십(2026-2030 최대 10,000대). 가격 $20,000 또는 월 $499 렌탈.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%1X%NEO%양산%'
  AND competitor_id = c.id
);

-- === AgiBot ===
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(),
  'TechTimes / InterestingEngineering',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  'AgiBot 15,000대 생산 돌파 - 중국 휴머노이드 시장 80% 점유 (Unitree와 함께)',
  'AgiBot 15,000번째 로봇 생산(Longcheer 납품). 2026년 3월 10,000대 돌파, 3개월 만에 5,000대 추가. Unitree+AgiBot이 중국 휴머노이드 시장 약 80% 점유. CES 2026에서 미국 시장 진출. X1 오픈소스 이족보행 플랫폼.',
  c.id,
  l.id,
  NOW(),
  'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot-a3' AND l.slug = 'biz'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline LIKE '%AgiBot%15,000%'
  AND competitor_id = c.id
);

-- ============================================================
-- 4. CI Values 업데이트 (비즈니스 레이어 핵심 항목)
-- ============================================================

-- Digit (Agility) - 비즈니스 항목 업데이트
UPDATE ci_values SET
  value = '$620M+ (SPAC 합병 $420M 신탁 + $200M Foxconn)',
  confidence = 'A',
  source = 'SEC Filing - SPAC 합병 공시',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '총 펀딩' LIMIT 1);

UPDATE ci_values SET
  value = 'SPAC 상장 추진 (Churchill Capital Corp XI)',
  confidence = 'A',
  source = 'SEC Filing',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '최근 밸류에이션' LIMIT 1);

UPDATE ci_values SET
  value = 'DCVC, NVIDIA, Amazon, SoftBank, Foxconn, Schaeffler',
  confidence = 'A',
  source = 'SEC Filing - SPAC 합병 공시',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 투자자' LIMIT 1);

UPDATE ci_values SET
  value = 'Commercial (다중 고객 배치)',
  confidence = 'A',
  source = 'Agility Robotics 공식',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = '65,000시간+ 가동 (9개 시설)',
  confidence = 'A',
  source = 'SEC Filing',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '배치 대수' LIMIT 1);

UPDATE ci_values SET
  value = 'Schaeffler, GXO, Toyota Canada, Amazon, Mercado Libre',
  confidence = 'A',
  source = 'SEC Filing - SPAC 합병 공시',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객' LIMIT 1);

-- Optimus (Tesla) - 비즈니스 항목 업데이트
UPDATE ci_values SET
  value = 'Pilot → 상용 전환 중 (Fremont 공장 전환)',
  confidence = 'A',
  source = 'Tesla IR / SEC Filing',
  source_date = '2026-06-09',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'optimus')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = '~50대 → Gen 3 양산 2026년 말 시작 (연 100만대 목표)',
  confidence = 'B',
  source = 'Tesla IR / Electrek',
  source_date = '2026-06-09',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'optimus')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '배치 대수' LIMIT 1);

UPDATE ci_values SET
  value = '외부 상용 고객 2026년 말 시작 예정',
  confidence = 'B',
  source = 'Tesla IR',
  source_date = '2026-06-09',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'optimus')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '생태계 확장' LIMIT 1);

-- Figure - 비즈니스 항목 업데이트
UPDATE ci_values SET
  value = '$1.9B+ (Series C $1B+ 포함)',
  confidence = 'A',
  source = 'Figure AI 공식 / Crunchbase',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '총 펀딩' LIMIT 1);

UPDATE ci_values SET
  value = '$39B (2025 Series C)',
  confidence = 'A',
  source = 'Figure AI 공식',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '최근 밸류에이션' LIMIT 1);

UPDATE ci_values SET
  value = 'Commercial (시간당 1대 생산, 350대+ 출하)',
  confidence = 'A',
  source = 'Figure AI 공식',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = '350대+ (Figure 03), BMW X3 30,000대 생산 지원 (Figure 02)',
  confidence = 'A',
  source = 'Figure AI / BMW Press',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '배치 대수' LIMIT 1);

UPDATE ci_values SET
  value = 'BMW (Spartanburg), Hyundai, Google DeepMind',
  confidence = 'A',
  source = 'Figure AI / BMW Press',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객' LIMIT 1);

-- NEO (1X) - 비즈니스 항목 업데이트
UPDATE ci_values SET
  value = '$100M+ (Series A2 $23.5M OpenAI 리드 포함)',
  confidence = 'A',
  source = '1X Technologies / Crunchbase',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '총 펀딩' LIMIT 1);

UPDATE ci_values SET
  value = 'Commercial (양산 개시, 1차년도 매진)',
  confidence = 'A',
  source = 'Forbes / 1X Technologies',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = '10,000대/년 생산능력, 1차년도 매진, 100K대 목표(2027)',
  confidence = 'A',
  source = 'Forbes / TechFundingNews',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '배치 대수' LIMIT 1);

UPDATE ci_values SET
  value = '$20,000 (구매) / $499/월 (렌탈)',
  confidence = 'A',
  source = '1X Technologies 공식',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '가격대' LIMIT 1);

UPDATE ci_values SET
  value = 'EQT (10,000대 2026-2030), 소비자 직접 판매',
  confidence = 'A',
  source = 'BusinessWire / 1X Technologies',
  source_date = '2026-04-30',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객' LIMIT 1);

-- Atlas (Boston Dynamics) - 비즈니스 항목 업데이트
UPDATE ci_values SET
  value = 'Hyundai 자금 ($26B 미국 투자의 일부)',
  confidence = 'A',
  source = 'Forbes / Boston Dynamics',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '총 펀딩' LIMIT 1);

UPDATE ci_values SET
  value = 'Commercial (양산 시작, 2026 전량 예약)',
  confidence = 'A',
  source = 'Forbes',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계' LIMIT 1);

UPDATE ci_values SET
  value = '연 30,000대 생산 (신공장), 2026년 전량 예약',
  confidence = 'A',
  source = 'Forbes / Hyundai',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '배치 대수' LIMIT 1);

UPDATE ci_values SET
  value = 'Hyundai RMAC, Google DeepMind',
  confidence = 'A',
  source = 'Boston Dynamics / Forbes',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객' LIMIT 1);

-- Atlas HW 스펙 업데이트
UPDATE ci_values SET
  value = '56 DOF',
  confidence = 'A',
  source = 'Boston Dynamics 공식',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '자유도(DOF)' LIMIT 1);

UPDATE ci_values SET
  value = '50kg (110 lbs)',
  confidence = 'A',
  source = 'Boston Dynamics 공식',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '가반하중' LIMIT 1);

UPDATE ci_values SET
  value = '4시간 (자율 배터리 교환)',
  confidence = 'A',
  source = 'Boston Dynamics 공식',
  source_date = '2026-01-06',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas')
  AND item_id = (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '연속동작시간' LIMIT 1);

-- ============================================================
-- 5. Competitive Alerts (War Room 대시보드용)
-- ============================================================
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'mass_production',
  'critical',
  '[CRITICAL] Boston Dynamics Atlas 양산 시작 - 2026년 전량 예약, 연 30,000대',
  'CES 2026에서 양산형 Atlas 공개. Hyundai $26B 투자로 연 30,000대 생산공장 건설. 2026년 생산분 Hyundai RMAC, Google DeepMind에 전량 예약 완료. 56 DOF, 50kg 가반하중, 4시간 배터리, 자율 배터리 교환.',
  '{"source":"Forbes/Boston Dynamics","sourceUrl":"https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%Atlas%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%Atlas 양산%30,000%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'mass_production',
  'critical',
  '[CRITICAL] Figure AI Figure 03 시간당 1대 생산 - 350대+ 출하 완료',
  'Figure AI가 120일 만에 생산속도를 24배 향상(일 1대→시간당 1대). 350대 이상 Figure 03 출하. BMW Spartanburg에 Figure 03 배치. $39B 밸류에이션, 총 $1.9B 조달.',
  '{"source":"Figure AI/TechInsider","sourceUrl":"https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%Figure%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%Figure%시간당 1대%350%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'mass_production',
  'warning',
  '[WARNING] Tesla Optimus Fremont 공장 전환 - Gen 3 양산 2026년 말 시작',
  'Tesla Fremont Model S/X 라인 종료(Q2 2026), Optimus 생산 전환. Gen 3 양산 시작 2026년 말 목표. $20B CapEx 확정. 첫 외부 고객 2026년 말 예상. 장기 목표 연 100만대.',
  '{"source":"Tesla IR/Electrek","sourceUrl":"https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%Optimus%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%Optimus Fremont%Gen 3%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'funding',
  'warning',
  '[WARNING] Apptronik Series A 총 $935M - $5B 밸류, Google DeepMind 파트너십',
  'Series A-X $520M 추가 조달, Series A 총합 $935M. 밸류에이션 $5B. Google, Mercedes-Benz, AT&T, John Deere, QIA 투자. Google DeepMind Gemini Robotics 파트너십.',
  '{"source":"CNBC/Apptronik","sourceUrl":"https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%Apollo%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%Apptronik%$935M%$5B%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'partnership',
  'warning',
  '[WARNING] Agility Robotics SPAC 상장 - $620M 조달, Foxconn 전략적 투자',
  'Churchill Capital Corp XI SPAC 합병으로 미국 최초 순수 휴머노이드 상장사. 신탁 $420M + Foxconn 리드 $200M. 65,000시간+ 가동 실적. Digit v5 개발 중.',
  '{"source":"SEC/TheRobotReport","sourceUrl":"https://www.therobotreport.com/humanoid-maker-agility-robotics-go-public-through-spac-merger/","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%Digit%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%Agility%SPAC 상장%Foxconn%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'mass_production',
  'critical',
  '[CRITICAL] 1X NEO 본격 양산 - 美 최초 수직통합 공장, 1차년도 매진',
  '1X Technologies Hayward, CA 58,000sqft 공장에서 NEO 양산 개시. 10,000대/년 생산능력, 사전예약 5일 만에 매진. $20,000 가격. EQT 파트너십 10,000대. 2027년 100,000대 목표.',
  '{"source":"Forbes/1X","sourceUrl":"https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%NEO%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%1X NEO%양산%매진%'
  AND robot_id = hr.id
)
LIMIT 1;

INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
  hr.id,
  'mass_production',
  'critical',
  '[CRITICAL] AgiBot 15,000대 돌파 + Unitree 2만대 목표 - 중국 시장 80% 장악',
  'AgiBot 15,000번째 로봇 생산. 3개월 만에 5,000→15,000대 급증. Unitree는 2026년 2만대 목표, 상하이 IPO 추진($580M). 양사 합산 중국 휴머노이드 시장 약 80% 점유.',
  '{"source":"TrendForce/TechTimes","sourceUrl":"https://www.trendforce.com/presscenter/news/20260409-13007.html","confidence":"A","detectedAt":"2026-07-01"}'::jsonb,
  false,
  NOW()
FROM humanoid_robots hr
WHERE hr.name ILIKE '%G1%' OR hr.name ILIKE '%Unitree%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title LIKE '%AgiBot 15,000%Unitree%80%'
)
LIMIT 1;

COMMIT;

-- ============================================================
-- 실행 결과 확인
-- ============================================================
SELECT 'ci_monitor_alerts' as "table", COUNT(*) as count FROM ci_monitor_alerts WHERE detected_at >= CURRENT_DATE
UNION ALL
SELECT 'competitive_alerts', COUNT(*) FROM competitive_alerts WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT 'ci_competitors', COUNT(*) FROM ci_competitors;
