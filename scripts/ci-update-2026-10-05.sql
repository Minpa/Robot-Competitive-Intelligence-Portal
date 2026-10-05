-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-05
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-05T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-03
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-05.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Tesla Optimus AI5/AI6 칩 메모리 삭감 — 양산 확대 위한 공급망 최적화
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Benzinga / Not a Tesla App',
   'https://benzinga.com/markets/tech/26/10/62125996/elon-musk-tesla-optimus-memory-micron-humanoid-robots',
   '[Critical] Tesla AI5 RAM 72GB→반감, AI6 144GB→1/3 삭감 — Optimus 양산 확보 위한 칩 최적화',
   '2026.10.02 Elon Musk 확인: AI5 칩 RAM 72GB(절반), AI6 RAM 144GB(1/3 삭감). 이유: Micron 공급량 확보 + Optimus 양산 원가 절감. AI5 대비 성능/와트 2~3배, 달러당 AI 성능 10배 향상 유지. Fremont V3 생산 수백대/주→연말 1,000대/주 목표. Giga Texas 전용 공장 철골 완성(10/1 드론 촬영). $30B 신규 신용시설 확보.',
   '2026-10-05'::timestamp, 'pending'),

-- 2. [Warning] Unitree H2 Plus 일반 판매 개시 + IPO 임박 — 세계 최초 순수 휴머노이드 상장사
  (gen_random_uuid(), 'Humanoids Daily / eWeek',
   'https://www.humanoidsdaily.com/news/unitree-unveils-h2-humanoid-successor-to-h1',
   '[Warning] Unitree H2 Plus 10월 일반 판매 + IPO 수일 내 — 2026 목표 20,000대 출하',
   '2026.10 Unitree H2 Plus 일반 판매 개시("anyone can buy it"). H2: 1.8m/70kg, Nvidia Jetson Thor(Blackwell GPU) 탑재. G1 App Store 런칭(다운로드 가능 액션, 데이터셋 공유). 2026 목표 20,000대 출하(2025년 5,500대 대비 3.6배). IPO 수일 내 완료 예정 — 세계 최초 순수 휴머노이드 상장사. G1: $13,500~$73,900(14개 구성).',
   '2026-10-05'::timestamp, 'pending'),

-- 3. [Warning] Agility Digit 5 공개 + SPAC 10월 클로징 예정 — 첫 상장 휴머노이드 기업 경쟁
  (gen_random_uuid(), 'GeekWire / The Robot Report / SEC S-4',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   '[Warning] Agility Digit 5 공개 — SPAC $2.5B 밸류, 10/6 Investor Day, Q4 상장 예정',
   'Digit 5: 신규 다리·배터리·안전 아키텍처. 안전 장벽 없이 인간 근접 작업 가능. $300M+ 다년 확정 주문. 2027 H1 Digit 5 조기 접근 예정. SPAC: Churchill Capital XI 합병, $2.5B 밸류에이션, ~$620M 자본 조달. 10/6 NYC Analyst & Investor Day. RoboFab 연 10,000대 생산. 휠형 로봇도 탐색 중(제품 다각화). 2025 매출 $1.8M.',
   '2026-10-05'::timestamp, 'pending'),

-- 4. [Info] Apptronik 액추에이터 부족 심화 — FCC 중국 로봇 금지 영향, 원가 60% 차지
  (gen_random_uuid(), 'Startup Fortune / Plastics Today',
   'https://startupfortune.com/fccs-ban-on-chinese-humanoid-robots-may-starve-the-us-firms-it-aims-to-help',
   '[Info] Apptronik: 액추에이터 부족 심화, 로봇 원가 60% — FCC 중국 금지가 美 기업도 타격',
   'Apptronik CEO Jeff Cardenas: 액추에이터가 로봇 원가 60% 차지, 기초 부품 공급 부족 심화. 2026.07.28 FCC 중국산 휴머노이드 수입 금지(국가안보 사유) — 미국 기업도 중국 부품 의존으로 역풍. Apollo 2: 바이페달+휠 구성 배치, Google DeepMind 협업. Robot Park(오스틴) 확장, 실세계 데이터 수집. Apollo 3(첫 상용 제품) 2027 예정.',
   '2026-10-05'::timestamp, 'pending'),

-- 5. [Info] FCC 중국 휴머노이드 로봇 수입 금지 — 미·중 로봇 공급망 디커플링 본격화
  (gen_random_uuid(), 'FCC / Reuters / Forkast',
   'https://forkast.news/the-fcc-just-banned-chinese-humanoid-robots-and-extended-supply-chain-protection-into-the-physical-world/',
   '[Info] FCC 중국 휴머노이드 금지(7/28) — 데이터 감시·원격 조종 우려, 공급망 디커플링',
   '2026.07.28 FCC: 휴머노이드/사족 로봇·네트워크 인버터를 Covered List 등재. 신규 장비 인증 차단. 사유: "로봇 수집 데이터가 외국 정보기관에 활용될 우려, 원격 조종 위험". 단기 영향 제한적(중국 기업 대부분 미국 미진출). 장기: Agibot 미국 진출 전략에 타격. 통신장비 수준 고수준 규제 적용. 미국 기업도 중국 부품 의존으로 역풍.',
   '2026-10-05'::timestamp, 'pending'),

-- 6. [Info] Tesla $30B 신규 신용시설 — AI·Optimus·Cybercab 투자 가속
  (gen_random_uuid(), 'TechCrunch / Tesla IR',
   'https://techcrunch.com/2026/10/02/tesla-sustains-its-ev-sales-momentum-despite-us-troubles',
   '[Info] Tesla $30B 신규 신용시설 확보 — 올해 $25B+ 설비투자, Optimus 양산 가속',
   'Tesla $30B 신규 신용시설: AI 투자·Optimus 양산·Cybercab 생산 가속 목적. 올해 $25B 이상 설비투자 계획(역대 최대). Giga Texas 전용 Optimus 공장 6개월 만에 철골 완성. 연 100만대 용량 목표. V3 Fremont 생산 10배 증가(수백대/주). 2027 고볼륨 생산 트랙.',
   '2026-10-05'::timestamp, 'pending'),

-- 7. [Info] Figure AI BotQ 90분/1대 생산 — Helix 2.5 Zero-Shot 30가정 일반화
  (gen_random_uuid(), 'KraneShares / Figure AI Wikipedia',
   'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
   '[Info] Figure 03 BotQ 90분/대 생산 + Helix 2.5 Zero-Shot 30가정 일반화 달성',
   'Figure 03: BotQ 공장에서 90분당 1대 생산(2026.04~). 5''8"/61kg/20kg 페이로드/1.2m/s/5시간(2.3kWh 교체식). Helix 2.5 VLA 모델: Zero-Shot 30개 가정환경 일반화 달성. BMW 120대/Amazon 50대 현장. $39B 밸류에이션(Forge Global). Figure 04 설계 확정(2026.05), 부품 출하 중.',
   '2026-10-05'::timestamp, 'pending'),

-- 8. [Info] BD Atlas 13-DOF 핸드 세부 — 드릴 비트 장착·너트 체결 데모
  (gen_random_uuid(), 'Robotics 24/7 / Interesting Engineering',
   'https://interestingengineering.com/ai-robotics/boston-dynamics-13-dof-robot-hand',
   '[Info] BD Atlas 13-DOF 핸드 상세 데모 — 드릴 비트 삽입·너트 체결, 촉각 센서 내장',
   '10/1 공개 Atlas 신형 핸드 추가 정보: 13 DOF(이전 세대 7 DOF의 2배). 4-DOF 대향 엄지 + 직접 구동 + 손끝·손바닥 촉각 압력 센서. 데모: 드릴 비트 삽입, 파워 드릴 조작, 너트 체결. 물체 파지 후 조작(manipulation) 가능(기존은 들기·고정만). Hyundai 사바나(GA) 시설 학습 중.',
   '2026-10-05'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Tesla AI5/AI6 칩 양산 최적화 — 칩 공급 확보 + $30B 투자
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[양산] Tesla AI5/AI6 칩 RAM 삭감 + $30B 투자 — Optimus 연 100만대 양산 인프라 구축 가속',
  'Tesla Musk(10/2): AI5 RAM 72GB(반감), AI6 RAM 144GB(1/3 삭감)으로 Micron 공급 확보. Fremont V3 수백대/주 생산, 연말 1,000대/주 목표. Giga Texas 전용 공장 철골 완성(6개월). $30B 신규 신용시설 + $25B+ 연간 설비투자. 중국 3사(Tuopu/Joyson/Sanhua) 5,000대 부품 주문 확정. 2027 고볼륨, 최종 연 100만대 목표.',
  '{"source":"Benzinga / Not a Tesla App / TechCrunch","sourceUrl":"https://benzinga.com/markets/tech/26/10/62125996/elon-musk-tesla-optimus-memory-micron-humanoid-robots","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-05'::timestamp
);

-- Unitree H2 Plus 일반 판매 + IPO 임박
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[상장] Unitree H2 Plus 일반 판매 + 세계 최초 순수 휴머노이드 IPO 임박',
  'Unitree H2 Plus 10월 일반 판매 개시. H2: 1.8m/70kg, Nvidia Jetson Thor(Blackwell GPU). 2026 목표 20,000대 출하(2025 5,500대 대비 3.6배). G1 App Store 런칭(개발자 생태계). IPO 수일 내 완료 — 세계 최초 순수 휴머노이드 상장사. Agility(SPAC Q4)와 상장 경쟁. G1 14개 구성($13.5K~$73.9K).',
  '{"source":"Humanoids Daily / eWeek / CNBC","sourceUrl":"https://www.humanoidsdaily.com/news/unitree-unveils-h2-humanoid-successor-to-h1","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-05'::timestamp
);

-- Agility Digit 5 + SPAC Q4 상장
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[상장] Agility Digit 5 공개 + SPAC $2.5B 밸류 Q4 클로징 — 10/6 Investor Day',
  'Digit 5: 신규 다리·배터리·안전 아키텍처, 안전 장벽 없이 인간 근접 작업. $300M+ 다년 주문. SPAC Churchill Capital XI: $2.5B 밸류, ~$620M 자본. 10/6 NYC Investor Day. RoboFab 연 10,000대. Unitree IPO와 "최초 상장 휴머노이드 기업" 경쟁. 휠형 로봇 탐색(제품 다각화). H1 2027 Digit 5 조기 접근.',
  '{"source":"GeekWire / The Robot Report / SEC","sourceUrl":"https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-05'::timestamp
);

-- FCC 중국 휴머노이드 금지 — 공급망 디커플링
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[규제] FCC 중국 휴머노이드 금지 — 미·중 로봇 공급망 디커플링, 美 기업도 부품 역풍',
  '2026.07.28 FCC: 중국산 휴머노이드·사족 로봇 수입 금지(Covered List). 국가안보 사유(데이터 감시·원격 조종). Agibot 미국 진출 전략 타격. Apptronik CEO: 액추에이터 부족 심화(원가 60%), 미국 기업도 중국 부품 의존으로 역풍. 단기 영향 제한적이나, 장기적으로 미·중 로봇 공급망 완전 분리 가속.',
  '{"source":"FCC / Reuters / Startup Fortune","sourceUrl":"https://forkast.news/the-fcc-just-banned-chinese-humanoid-robots-and-extended-supply-chain-protection-into-the-physical-world/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-05'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-05'::timestamp,
    next_review = '2026-10-12'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Tesla: AI5/AI6 칩 양산 최적화 + 생산 현황
UPDATE ci_values
SET value = 'V3: AI5(72GB RAM, 반감)·Grok 음성·22-DOF 핸드·173cm·57kg. Fremont 수백대/주, 연말 1,000대/주 목표. Giga TX 공장 철골 완성.',
    confidence = 'A',
    source = 'Benzinga / Not a Tesla App',
    source_url = 'https://benzinga.com/markets/tech/26/10/62125996/elon-musk-tesla-optimus-memory-micron-humanoid-robots',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%')
    LIMIT 1
  );

-- Tesla: 투자/자금 업데이트
UPDATE ci_values
SET value = '$30B 신규 신용시설. $25B+ 연간 설비투자(역대 최대). 중국 3사 5,000대 부품 주문 확정. 연 100만대 목표.',
    confidence = 'A',
    source = 'TechCrunch / Tesla IR',
    source_url = 'https://techcrunch.com/2026/10/02/tesla-sustains-its-ev-sales-momentum-despite-us-troubles',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%자금%')
    LIMIT 1
  );

-- Unitree: H2 Plus 판매 + IPO
UPDATE ci_values
SET value = 'H2 Plus 10월 일반 판매. H2: 1.8m/70kg, Jetson Thor. IPO 수일 내. 2026 목표 20,000대. G1 App Store 런칭.',
    confidence = 'B',
    source = 'Humanoids Daily / eWeek',
    source_url = 'https://www.humanoidsdaily.com/news/unitree-unveils-h2-humanoid-successor-to-h1',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%')
    LIMIT 1
  );

-- Unitree: 양산/출하
UPDATE ci_values
SET value = '2026 목표 20,000대(2025 5,500대 대비 3.6배). IPO 수일 내. G1: $13.5K~$73.9K(14개 구성). B2: $76.9K~$296K.',
    confidence = 'B',
    source = 'eWeek / CNBC',
    source_url = 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%판매%')
    LIMIT 1
  );

-- Agility: Digit 5 + SPAC
UPDATE ci_values
SET value = 'Digit 5: 신규 다리·배터리·안전. 안전장벽 불요. SPAC $2.5B, ~$620M. 10/6 Investor Day. $300M+ 다년 주문. RoboFab 연 10K대.',
    confidence = 'A',
    source = 'GeekWire / SEC S-4',
    source_url = 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%양산%')
    LIMIT 1
  );

-- Apptronik: 공급망 이슈
UPDATE ci_values
SET value = 'Apollo 2 배치 중(바이페달+휠). Google DeepMind 협업. 액추에이터 부족(원가 60%). FCC 금지 역풍. Apollo 3 상용 2027.',
    confidence = 'B',
    source = 'Startup Fortune / The Robot Report',
    source_url = 'https://startupfortune.com/fccs-ban-on-chinese-humanoid-robots-may-starve-the-us-firms-it-aims-to-help',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%공급%' OR ci.name ILIKE '%파트너%')
    LIMIT 1
  );

-- BD Atlas: 13-DOF 핸드 스펙 업데이트
UPDATE ci_values
SET value = '신형 핸드: 13 DOF(이전 7 DOF). 4-DOF 대향 엄지, 직접 구동, 촉각 압력 센서. 드릴 비트 삽입·너트 체결 가능. 본체 56 DOF.',
    confidence = 'A',
    source = 'Interesting Engineering / Robotics 24/7',
    source_url = 'https://interestingengineering.com/ai-robotics/boston-dynamics-13-dof-robot-hand',
    source_date = '2026-10-05',
    last_verified = '2026-10-05'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR slug ILIKE '%boston%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%핸드%' OR ci.name ILIKE '%매니퓰%' OR ci.name ILIKE '%손%' OR ci.name ILIKE '%그리퍼%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 12건 (ci_monitor_alerts 8건, competitive_alerts 4건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 5건 (Tesla IR/Musk 발언, FCC 공식 결정, SEC S-4, BD 공식 발표)
--   [B] 2개+ 매체 교차확인: 5건 (Unitree IPO/H2 Plus, Apptronik 부품 부족, Figure BotQ 생산)
--   [C] 단일 출처: 2건 (Agility 휠형 탐색, FCC 단기 영향 분석)
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Tesla AI5/AI6 칩 RAM 삭감 + $30B 투자 — 양산 인프라 구축 본격화
-- 2. [Warning] Unitree H2 Plus 일반 판매 + IPO 임박 — 2026 목표 20,000대, 최초 상장 경쟁
-- 3. [Warning] FCC 중국 휴머노이드 금지 — 미·중 공급망 디커플링, 美 기업도 부품 역풍
