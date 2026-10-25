-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-25
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-25T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-16
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-25.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Tesla Optimus — Q3 2026 공식 양산 시작, Fremont 고볼륨 라인 가동
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Tesla Q3 2026 Shareholder Update / TeslaFremontNorth / Technology.org',
   'https://teslanorth.com/2026/10/21/tesla-optimus-production-quality-fremont/',
   '[Critical] Tesla Optimus — Q3 2026 공식 양산 시작, Fremont 고볼륨 라인에서 첫 생산 품질 유닛 제조',
   'Tesla Q3 2026 주주 업데이트(10/21): Optimus 고볼륨 생산 라인에서 첫 생산 품질(production-quality) 유닛 제조 시작. Model S/X 라인 철거(46일, 5월) 후 Fremont 전환 완료. 공식 생산량·단가·외부 판매 일정 미공개. California "Early Ramp", Texas "Construction" 상태. 장기 목표: 주 20,000대(최소 1년 이상 소요, 2027 말 전망). Gen 3 디자인, AI5 칩 2027/4 업그레이드 예정. Optimus Academy 자가 학습 시스템 구축. 외부 판매 2027 후반.',
   '2026-10-25'::timestamp, 'pending'),

-- 2. [Warning] Agility-NVIDIA — Digit 5 IGX Thor 독점 온보드 컴퓨팅 파트너십, NVIDIA Halos 안전 시스템
  (gen_random_uuid(), 'Agility Robotics / Unite.AI / Investing.com',
   'https://www.agilityrobotics.com/content/agility-robotics-powering-the-future-of-robotics-with-nvidia-jetson-thor',
   '[Warning] Agility-NVIDIA — Digit 5 IGX Thor 독점 온보드 컴퓨팅 파트너십 발표(10/22)',
   'Agility Robotics(10/22): Digit 5 GA 버전 온보드 컴퓨팅을 NVIDIA IGX Thor 모듈로 표준화. NVIDIA가 Digit 5의 독점 온보드 컴퓨트 공급자. NVIDIA Halos 안전 플랫폼을 Digit 인간 감지 시스템에 최초 통합. Digit 5 GA: 2027 H1 조기 접근, 이후 6-9개월 확대. Digit 6에도 Jetson Thor 채택 계획.',
   '2026-10-25'::timestamp, 'pending'),

-- 3. [Warning] Agility-AGCO — Digit 제조업 파일럿 상업 계약 체결(10/20), Kansas 2027 시작
  (gen_random_uuid(), 'Unite.AI / Robotics 24/7 / Michigan Farm News',
   'https://www.robotics247.com/article/agility-robotics-agco-announce-humanoid-robot-pilot-for-smart-manufacturing-applications',
   '[Warning] Agility-AGCO — Digit 제조업 파일럿 상업 계약(10/20), 2027 Hesston Kansas 시작',
   'AGCO·Agility(10/20): Digit 파일럿 상업 계약 체결. 2027년 AGCO Hesston(Kansas) 생산시설에서 시범 운영 시작. 초기 작업: 부품 분류·적재, 토트 지능형 배치. 농기계 제조업에 휴머노이드 최초 투입 사례. AGCO: 글로벌 농기계 2위.',
   '2026-10-25'::timestamp, 'pending'),

-- 4. [Warning] Unitree — G1 누적 생산 10K-20K대, H2-X 보디가드 로봇 공개(10/21)
  (gen_random_uuid(), 'Digitimes / KuCoin News / Futurism / TechRadar',
   'https://www.digitimes.com/news/a20261022PD252/production-robot-2026-development-production-capacity.html',
   '[Warning] Unitree — G1 누적 10K-20K대 생산 확인, H2-X 보디가드 로봇 공개(10/21-22)',
   'Wang Xingxing(10/22 World Physical AI Conference): G1 누적 생산 10,000-20,000대(2024/5 이후), 세계 최다 판매 휴머노이드. H2-X "Kung Fu Legend: Guardian" 공개(10/21): 순찰·경호·구조용, 8시간 배터리(대기 기준). H2 기반 장시간 운영 변형. CEO: 물리 AI 돌파 1-3년 내 전망. China Daily(10/24): 실세계 작업 AI 돌파 임박 발언.',
   '2026-10-25'::timestamp, 'pending'),

-- 5. [Info] BD Atlas — 프로토타입 조립 1일→1시간 목표(2027), RMAC 팩토리 테스팅 지속
  (gen_random_uuid(), 'TechTimes / Interesting Engineering / Boston Dynamics',
   'https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm',
   '[Info] BD Atlas — 프로토타입 조립 현재 1일, 2027년 1시간 목표 공개(10/14 비디오)',
   'BD(10/14): Atlas 프로토타입 조립 과정 6분 영상 공개. 현재 1일 소요(Waltham 프로토타입 플로어), 2027년 1시간 목표, 장기적 수분 목표. 머시닝·조립·테스트·수리 한 지붕 아래. 로봇 암 보조 조립. GR3 4핑거 핸드(10/2) 적용 지속. RMAC(Georgia) 팩토리 테스팅 진행. Hyundai 25K대 글로벌 배치 계획(HMGMA 2028, Kia Georgia 2029).',
   '2026-10-25'::timestamp, 'pending'),

-- 6. [Info] Figure AI — 10/25 기준 신규 주요 업데이트 없음, BMW F.03 배치 지속 확인
  (gen_random_uuid(), 'The Robot Report / Repairer Driven News / eWeek',
   'https://www.therobotreport.com/bmw-group-deploys-figure-03-humanoid-after-tests-previous-version/',
   '[Info] Figure AI — 10/25 신규 업데이트 없음, BMW Spartanburg F.03 물류 시퀀싱 확인',
   'Figure AI: 10/25 기준 10/16 이후 신규 주요 발표 없음. BMW Spartanburg: F.03 물류 시퀀싱 작업 배치 확인(6-7월 발표). F.02는 10개월간 30,000+ BMW X3 바디샵 지원 후 퇴역. F.03: 촉각 센서 핸드, 팜 카메라, 무선 충전, 음성 대화 추가. NVIDIA $1B 투자 협상 보도 이후 추가 확인 없음. Nscale $3.5B→$6B+ 컴퓨트 계약.',
   '2026-10-25'::timestamp, 'pending'),

-- 7. [Info] Apptronik — 10/25 기준 신규 업데이트 없음, Apollo 2 배치·Robot Park 운영 지속
  (gen_random_uuid(), 'Apptronik / The Robot Report / Forbes',
   'https://apptronik.com/company/in-the-news',
   '[Info] Apptronik — 10/25 신규 업데이트 없음, Apollo 2 듀얼 구성 운용·Robot Park 데이터 수집 지속',
   'Apptronik: 10/25 기준 10월 신규 발표 없음. Apollo 2 바이페달+휠 듀얼 구성 Mercedes-Benz·GXO·Jabil에서 운용 중. 90,000sqft Robot Park(Austin)에서 Google DeepMind와 AI 학습 데이터 지속 수집. Apollo 3 2027년 출시 예고(CEO). 누적 $935M(Series A), $5B 밸류에이션.',
   '2026-10-25'::timestamp, 'pending'),

-- 8. [Info] 1X Technologies — 10/25 기준 신규 업데이트 없음, Neo 출하 대기 상태
  (gen_random_uuid(), '1X Technologies / eWeek / Forbes',
   'https://www.1x.tech/discover/neo-home-robot',
   '[Info] 1X Technologies — 10/25 신규 업데이트 없음, Neo 핸드 출시(7월) 이후 출하 준비',
   '1X: 10/25 기준 10월 신규 발표 없음. Neo 핸드(7월): 가정용 1세대에 장착 예정. 개발자 접근 가속 발표(6월). Hayward 공장 생산 중(10K/년 용량, 200+ 직원). 2027 말 100K/년 목표 2번째 Bay Area 시설 계획. $20K/$499월 구독. EQT 10K대 약정(2026-2030). 고객 배송 공식 확인 미완.',
   '2026-10-25'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Tesla Optimus Q3 양산 시작
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'production', 'critical',
  '[양산] Tesla Optimus — Q3 2026 공식 양산 시작, Fremont 고볼륨 라인 첫 생산 품질 유닛',
  'Tesla Q3 주주 업데이트(10/21): Optimus 첫 생산 품질 유닛 Fremont 고볼륨 라인 제조 시작. Model S/X 라인 철거 후 전환 완료. 생산량·단가·판매일정 미공개. 주 20K대 목표 최소 1년 소요. Texas 건설 중. Gen 3, AI5 칩 2027/4 예정. 외부 판매 2027 후반.',
  '{"source":"Tesla Q3 2026 Shareholder Update","sourceUrl":"https://teslanorth.com/2026/10/21/tesla-optimus-production-quality-fremont/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-25'::timestamp
);

-- Agility NVIDIA IGX Thor 파트너십
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[파트너십] Agility-NVIDIA — Digit 5 IGX Thor 독점 온보드 컴퓨팅, Halos 안전 시스템 통합',
  'Agility(10/22): Digit 5 GA 온보드 컴퓨팅 NVIDIA IGX Thor 독점 표준화. NVIDIA Halos 안전 플랫폼 최초 통합. Digit 5 GA 2027 H1 조기 접근. AGCO 파일럿(10/20): Kansas 2027 농기계 제조업 시범. Nyobolt 배터리(10/15) + FORT Robotics 안전(10/1) 파트너십 연속 발표.',
  '{"source":"Agility Robotics / Unite.AI","sourceUrl":"https://www.agilityrobotics.com/content/agility-robotics-powering-the-future-of-robotics-with-nvidia-jetson-thor","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-25'::timestamp
);

-- Unitree G1 생산량 + H2-X
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'production', 'warning',
  '[양산] Unitree — G1 누적 10K-20K대 세계 최다 판매, H2-X 보디가드 로봇 공개',
  'Wang Xingxing(10/22 World Physical AI Conference): G1 누적 생산 10K-20K대(2024/5 이후), 세계 최다 판매 휴머노이드. H2-X "Kung Fu Legend: Guardian" 공개(10/21): 순찰·경호·구조 특화, 8시간 배터리(대기). STAR Market IPO 완료(8/19). CEO: 물리 AI 돌파 1-3년.',
  '{"source":"Digitimes / Futurism / TechRadar","sourceUrl":"https://www.digitimes.com/news/a20261022PD252/production-robot-2026-development-production-capacity.html","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-25'::timestamp
);

-- BD Atlas 제조 시간 목표
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'technology', 'info',
  '[기술] BD Atlas — 프로토타입 조립 1일→1시간(2027) 목표, RMAC 팩토리 테스팅 지속',
  'BD(10/14): Atlas 프로토타입 조립 현재 1일, 2027년 1시간 목표, 장기 수분 목표. Waltham 자체 프로토타입 플로어. GR3 핸드 적용 지속. RMAC Georgia 팩토리 테스팅. Hyundai 25K대 계획(HMGMA 2028, Kia Georgia 2029).',
  '{"source":"TechTimes / Boston Dynamics","sourceUrl":"https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-25'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-25'::timestamp,
    next_review = '2026-11-01'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Tesla Optimus: Q3 양산 시작 업데이트
UPDATE ci_values
SET value = 'Q3 2026 공식 양산 시작(10/21 주주 업데이트). Fremont 고볼륨 라인 첫 생산 품질 유닛. Model S/X 라인 철거(5월, 46일) 후 전환. 생산량·단가 미공개. 주 20K대 목표 1년+ 소요. Texas 건설 중. Gen 3, AI5 칩 2027/4. 외부 판매 2027 후반.',
    confidence = 'A',
    source = 'Tesla Q3 2026 Shareholder Update / TeslaFremontNorth',
    source_url = 'https://teslanorth.com/2026/10/21/tesla-optimus-production-quality-fremont/',
    source_date = '2026-10-25',
    last_verified = '2026-10-25'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%' OR ci.name ILIKE '%배치%')
    LIMIT 1
  );

-- BD Atlas: 제조 시간 목표 업데이트
UPDATE ci_values
SET value = '프로토타입 조립: 현재 1일 → 2027년 1시간 → 장기 수분 목표(10/14 비디오). Waltham 자체 플로어. GR3 핸드 13DOF 4핑거+촉각센서(10/2). RMAC Georgia 팩토리 테스팅. Hyundai 25K대 글로벌 배치(HMGMA 2028, Kia 2029).',
    confidence = 'A',
    source = 'Boston Dynamics / TechTimes / Interesting Engineering',
    source_url = 'https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm',
    source_date = '2026-10-25',
    last_verified = '2026-10-25'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR slug ILIKE '%boston%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%' OR ci.name ILIKE '%배치%' OR ci.name ILIKE '%제조%')
    LIMIT 1
  );

-- Agility: NVIDIA IGX Thor + AGCO 파일럿
UPDATE ci_values
SET value = 'NVIDIA IGX Thor 독점 온보드 컴퓨트(10/22): Digit 5 GA 표준. NVIDIA Halos 안전 최초 통합. AGCO 파일럿(10/20): Kansas 2027 농기계 제조. Nyobolt 배터리(10/15): 6분 충전, 20시간+. FORT Robotics 안전(10/1). Digit 5 GA 2027 H1. SPAC 투표 11/2. $620M+.',
    confidence = 'A',
    source = 'Agility Robotics / Unite.AI / Robotics 24/7',
    source_url = 'https://www.agilityrobotics.com/content/agility-robotics-powering-the-future-of-robotics-with-nvidia-jetson-thor',
    source_date = '2026-10-25',
    last_verified = '2026-10-25'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%파트너%' OR ci.name ILIKE '%협력%' OR ci.name ILIKE '%고객%' OR ci.name ILIKE '%배치%')
    LIMIT 1
  );

-- Unitree: G1 생산량 + H2-X
UPDATE ci_values
SET value = 'G1 누적 10K-20K대(10/22 Wang Xingxing, World Physical AI Conference). 세계 최다 판매 휴머노이드. H2-X "Kung Fu Legend: Guardian" 공개(10/21): 경호·순찰·구조, 8시간 배터리. G1+ ¥95K. STAR Market IPO(8/19). CEO: 물리 AI 돌파 1-3년.',
    confidence = 'B',
    source = 'Digitimes / KuCoin / Futurism / China Daily',
    source_url = 'https://www.digitimes.com/news/a20261022PD252/production-robot-2026-development-production-capacity.html',
    source_date = '2026-10-25',
    last_verified = '2026-10-25'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%가격%' OR ci.name ILIKE '%판매%' OR ci.name ILIKE '%배치%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 20건 (ci_monitor_alerts 8건, competitive_alerts 4건, ci_values 4건, ci_freshness 업데이트)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 4건 (Tesla Q3 주주 업데이트, Agility-NVIDIA 공식 발표, Agility-AGCO 공식 발표, BD 공식 비디오)
--   [B] 2개+ 매체 교차확인: 2건 (Unitree G1 생산량 Digitimes+KuCoin+hi-tech.ua, Unitree H2-X Futurism+TechRadar+GadgetReview)
--   [C] 단일 출처: 0건
--   [D] 추정: 0건
--   [E] 미확인: 0건
--   신규 업데이트 없음: 3건 (Figure AI, Apptronik, 1X Technologies)
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Tesla Optimus — Q3 2026 공식 양산 시작, Fremont 고볼륨 라인 첫 생산 품질 유닛 (10/21 주주 업데이트)
-- 2. [Warning] Agility-NVIDIA — Digit 5 IGX Thor 독점 온보드 컴퓨팅 파트너십, NVIDIA Halos 안전 시스템 통합 (10/22)
-- 3. [Warning] Unitree — G1 누적 10K-20K대 세계 최다 판매 확인, H2-X 보디가드 로봇 공개 (10/21-22)
