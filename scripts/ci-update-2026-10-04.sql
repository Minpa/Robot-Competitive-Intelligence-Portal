-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-04
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-04T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-03
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-04.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Agility Digit 5 공식 발표(10/1) — 안전 아키텍처, FORT Robotics MOU
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'ARC Advisory / Unite.AI / BusinessWire',
   'https://www.arcweb.com/blog/agility-robotics-advances-industrial-humanoids-digit-5',
   '[Critical] Agility Digit 5 공식 발표(10/1) — 협력안전 아키텍처, FORT Robotics MOU, Analyst Day 10/6',
   '2026.10.01 Agility Robotics Digit 5 공식 발표. 핵심: 세계 최초 AI 기반 협력안전(cooperatively safe) 휴머노이드 — 물리적 안전 장벽 없이 인간 근접 작업 가능. FORT Robotics과 MOU 체결: Offboard Safety Bridge 공동 개발. 기존 Digit 4 대비 레그·배터리·안전 아키텍처 전면 업그레이드. 100+ Digit 운용 중(9개 시설, 98% 정확도). 1.1년 투자회수 기간 달성. Analyst & Investor Day 10/6 NYC 예정. SPAC(CCXI) $2.5B 밸류에이션, $620M+ 조달 예정, 티커 AGLT.',
   '2026-10-04'::timestamp, 'pending'),

-- 2. [Warning] Tesla Optimus AI칩 메모리 삭감 — 양산 물량 확보 위해 AI5/AI6 RAM 축소
  (gen_random_uuid(), 'NotATeslaApp / IBTimes / Teslarati',
   'https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production',
   '[Warning] Tesla Optimus AI5·AI6 칩 RAM 삭감 — 양산 물량 확보 위해 메모리 반감',
   'Tesla Optimus용 AI 칩 메모리 사양 삭감 확정: AI5 RAM 144GB→72GB(반감), AI6 RAM 216GB→144GB(1/3 삭감). Elon Musk: "Optimus 생산 물량 확보를 위한 유일한 방법", "성능 영향 무시할 수준". Fremont Model S/X 라인 2026.05 종료 → Optimus 조립 라인 전환(4개월 공사). Q2 어닝콜(8/5): 생산 "곧" 시작 언급. 현재 ~1,000~1,200대 내부 배치(학습·데이터 수집용, 외부 판매 0).',
   '2026-10-04'::timestamp, 'pending'),

-- 3. [Warning] Unitree IPO 가격 확정 — $9B 밸류, STAR Market, DeepSeek 전략투자
  (gen_random_uuid(), 'CryptoBriefing / Liga.net / Caixin',
   'https://cryptobriefing.com/unitree-robotics-shanghai-stock-exchange-ipo/',
   '[Warning] Unitree IPO 가격 확정 — 150.8위안/주, $9B 밸류, STAR Market 상장',
   'Unitree Robotics IPO 가격 확정: 150.8위안($22.34)/주, 밸류에이션 61B위안(~$9B). STAR Market(상하이) 상장 — 중국 본토 최초 휴머노이드 로봇 상장사. 신주 4,045만 주(10%) 발행, 6.1B위안(~$900M) 조달. 전략투자자: DeepSeek(AI) 포함. 규제 심사 104일(역대 최단). 2026.03.20 신청 → 8/6-7 가격 산정. 2025년 5,500+ 휴머노이드 출하(글로벌 32%).',
   '2026-10-04'::timestamp, 'pending'),

-- 4. [Info] Apptronik Robot Park 가동 + Apollo 2 공개 — Google DeepMind 협력
  (gen_random_uuid(), 'Texas Standard / Verdict / YesPress',
   'https://texasstandard.org/stories/austin-company-launches-90000-square-foot-robot-park/',
   '[Info] Apptronik Robot Park(90K sqft) 가동 — Google DeepMind 협력, Apollo 2 바이페달+휠',
   '2026.07.01 Apptronik Robot Park 오픈: 오스틴 90,000sqft 데이터 수집·훈련 시설. Google DeepMind과 협력 — Gemini Robotics FM 훈련 데이터 생성. Apollo 2 공개: 바이페달+휠 모듈러 설계. 상용 파트너: Mercedes-Benz(조립), GXO Logistics(물류), Jabil(제조). Robot Park 글로벌 네트워크 확장 — 파트너·고객 시설 연결. 데이터 다양성·볼륨 강화.',
   '2026-10-04'::timestamp, 'pending'),

-- 5. [Info] AGIBOT 누적 20,000대 생산 돌파 — A3 Ultra 생산 마일스톤
  (gen_random_uuid(), 'AGIBOT / Interesting Engineering',
   'https://www.agibot.com/article/231/detail/63.html',
   '[Info] AGIBOT 누적 20,000대 범용 로봇 생산 — A3 Ultra 마일스톤, APAC 확장',
   '2026.09 AGIBOT 20,000번째 범용 구현지능 로봇(Expedition A3 Ultra) 생산 라인 오프. 헝친 창룽 스페이스쉽 파크에서 기념식. 베트남: GSMA Digital Nation Summit 하노이 참가, 현지 파트너 에코시스템 구축. 호주/뉴질랜드: APC 2026 통해 프로페셔널 파트너 프로그램 확대. "Three Intelligences in One" 아키텍처(이동·상호작용·조작 통합).',
   '2026-10-04'::timestamp, 'pending'),

-- 6. [Info] Tesla Optimus 풀사이즈 전략 도전 — 업계 소형 휴머노이드 선회 트렌드
  (gen_random_uuid(), 'GuruFocus / KraneShares',
   'https://www.gurufocus.com/news/9108784/shift-toward-smaller-humanoid-robots-challenges-teslas-tsla-fullsize-optimus-ambitions',
   '[Info] 업계 소형 휴머노이드 전환 — Tesla Optimus 풀사이즈 전략 도전',
   '2026.10.03 분석: 주요 제조사들이 풀사이즈 → 하프사이즈 휴머노이드로 선회 추세. Tesla Optimus 풀사이즈 전략에 도전. 소형 로봇 장점: 낮은 비용, 빠른 생산, 좁은 공간 적합, 안전성 향상. Giga Texas 10M대/년 목표와 대조. AWE 2026 상하이 Optimus 전시: 현장 스태프 "2026년 말 양산 가능" 언급.',
   '2026-10-04'::timestamp, 'pending'),

-- 7. [Info] 1X World Model 공개 — 물리 기반 AI, NEO 제로샷 태스크 학습
  (gen_random_uuid(), 'TechCrunch / Market Business News',
   'https://marketbusinessnews.com/physical-ai-takes-robots-into-factory-pilots-and-home-trials/451673',
   '[Info] 1X World Model 공개 — 물리 기반 AI, NEO 미훈련 태스크 제로샷 수행',
   '1X Technologies "1X World Model" 공개: 비디오+프롬프트 기반 물리 시뮬레이션 모델. NEO에 사전 훈련 없는 새 태스크 수행 능력 부여. 가정용 로봇 범용화 핵심 기술. EQT 파트너십: 300+ 포트폴리오사 대상 최대 10,000대 산업용 공급(2026~2030). NEO: $20K 구매 / $499/월 구독, 미국 배송 2026년 시작. 기본 자율성 + 원격 전문가 지원 모델.',
   '2026-10-04'::timestamp, 'pending'),

-- 8. [Info] 글로벌 휴머노이드 시장 2026 H1 — 19,100대 출하, 97% 중국산
  (gen_random_uuid(), 'Euronews / News Today World / IDC',
   'https://newstodayworld.org/breaking-news/2026/09/30/humanoid-robot-shipments-surge-432-in-six-months',
   '[Info] 글로벌 휴머노이드 2026 H1: 19,100대 출하(432%↑), 97% 중국 — 연 60,000대 전망',
   '2026 상반기 글로벌 휴머노이드 출하 19,100대(전년비 432% 증가). 97% 중국산. IDC: 2026 연간 60,000대 전망, 2030년 50만대. AGIBOT 35% 점유(1위, Unitree 추월). 독일 Bosch·Schunk 로봇핸드 통합 협력(6월~). 소형 로봇 트렌드 가속. 유럽: "중국이 만들고, 독일이 관절·핸드 공급" 구도.',
   '2026-10-04'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Agility Digit 5 — 차세대 휴머노이드 공식 발표
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[신제품] Agility Digit 5 공식 발표 — 세계 최초 협력안전 휴머노이드, SPAC $2.5B',
  'Digit 5 공식 발표(10/1): 세계 최초 AI 기반 협력안전 휴머노이드 — 물리적 장벽 없이 인간 근접 작업. FORT Robotics MOU(Offboard Safety Bridge). Digit 4 대비 레그·배터리·안전 전면 업그레이드. 100+ Digit 운용(9개 시설, 98% 정확도). $300M+ 다년 주문. SPAC(CCXI) $2.5B, $620M+ 조달, 티커 AGLT. Analyst Day 10/6 NYC.',
  '{"source":"ARC Advisory / Unite.AI / BusinessWire","sourceUrl":"https://www.arcweb.com/blog/agility-robotics-advances-industrial-humanoids-digit-5","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-04'::timestamp
);

-- Unitree IPO 가격 확정 — 중국 본토 최초 휴머노이드 상장
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[IPO] Unitree $9B 밸류 IPO 가격 확정 — STAR Market, DeepSeek 전략투자',
  'Unitree Robotics IPO 가격 확정: 150.8위안/주, 밸류 $9B. STAR Market 상장(중국 본토 최초 휴머노이드). $900M 조달. 전략투자자: DeepSeek(AI). 규제 심사 104일(역대 최단). 2025년 5,500+ 출하(글로벌 32%). G1 세계 베스트셀러 → AGIBOT에 1위 추월. IPO로 생산 확대·R&D 투자 가속 예상.',
  '{"source":"CryptoBriefing / Liga.net / Caixin","sourceUrl":"https://cryptobriefing.com/unitree-robotics-shanghai-stock-exchange-ipo/","reliability":"A","region":"china"}'::jsonb,
  false, '2026-10-04'::timestamp
);

-- Tesla Optimus AI칩 메모리 삭감 — 양산 트레이드오프
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[양산] Tesla Optimus AI5/AI6 RAM 삭감 — 양산 물량 vs 성능 트레이드오프',
  'Optimus AI칩 메모리 삭감: AI5 72GB(반감), AI6 144GB(1/3 삭감). Musk: "양산 물량 확보 유일한 방법, 성능 영향 무시할 수준". Fremont S/X 라인 → Optimus 전환(5월~). ~1,200대 내부 배치(학습용, 외부 판매 0). Giga Texas 전용 공장 2027년 양산 목표(연 10M대). 업계 소형 전환 트렌드와 풀사이즈 전략 충돌.',
  '{"source":"NotATeslaApp / IBTimes / GuruFocus","sourceUrl":"https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-04'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-04'::timestamp,
    next_review = '2026-10-11'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Agility: Digit 5 발표 반영
UPDATE ci_values
SET value = 'Digit 5(10/1): 협력안전 아키텍처, FORT Robotics MOU. Digit 4→5 레그·배터리·안전 업그레이드. 100+ 운용.',
    confidence = 'A',
    source = 'ARC Advisory / Unite.AI',
    source_url = 'https://www.arcweb.com/blog/agility-robotics-advances-industrial-humanoids-digit-5',
    source_date = '2026-10-04',
    last_verified = '2026-10-04'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%' OR ci.name ILIKE '%로드맵%')
    LIMIT 1
  );

-- Agility: SPAC/IPO 반영
UPDATE ci_values
SET value = 'SPAC(CCXI) $2.5B 밸류. $620M+ 조달. $300M+ Digit 5 다년 주문. AGLT 티커. Analyst Day 10/6.',
    confidence = 'A',
    source = 'BusinessWire / SEC S-4',
    source_url = 'https://www.businesswire.com/news/home/20260917748768/en/Agility-to-Host-Analyst-Investor-Day-on-October-6-2026',
    source_date = '2026-10-04',
    last_verified = '2026-10-04'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%IPO%')
    LIMIT 1
  );

-- Tesla: AI칩 메모리 삭감 반영
UPDATE ci_values
SET value = 'Optimus V3: 22-DOF 핸드, AI5(72GB, 반감), AI6(144GB, 1/3↓). Fremont 라인 전환 중. ~1,200대 내부 배치.',
    confidence = 'B',
    source = 'NotATeslaApp / IBTimes',
    source_url = 'https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production',
    source_date = '2026-10-04',
    last_verified = '2026-10-04'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%컴퓨팅%' OR ci.name ILIKE '%칩%' OR ci.name ILIKE '%SoC%' OR ci.name ILIKE '%AI%')
    LIMIT 1
  );

-- Unitree: IPO 가격 확정 반영
UPDATE ci_values
SET value = 'IPO: 150.8위안/주, $9B 밸류, STAR Market. $900M 조달. DeepSeek 전략투자. 104일 심사(역대 최단).',
    confidence = 'A',
    source = 'CryptoBriefing / Caixin',
    source_url = 'https://cryptobriefing.com/unitree-robotics-shanghai-stock-exchange-ipo/',
    source_date = '2026-10-04',
    last_verified = '2026-10-04'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%IPO%')
    LIMIT 1
  );

-- Apptronik: Robot Park + Apollo 2 반영
UPDATE ci_values
SET value = 'Robot Park(90K sqft, 7/1 가동) Google DeepMind 협력. Apollo 2: 바이페달+휠 모듈러. MB·GXO·Jabil 배치.',
    confidence = 'B',
    source = 'Texas Standard / Verdict',
    source_url = 'https://texasstandard.org/stories/austin-company-launches-90000-square-foot-robot-park/',
    source_date = '2026-10-04',
    last_verified = '2026-10-04'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%' OR ci.name ILIKE '%로드맵%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 14건 (ci_monitor_alerts 8건, competitive_alerts 3건, ci_values 5건 업데이트)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 4건 (Agility Digit 5 공식 발표, Agility SPAC/SEC, Unitree IPO 거래소 공시)
--   [B] 2개+ 매체 교차확인: 7건 (Tesla AI칩·Fremont 전환, Apptronik Robot Park, AGIBOT 20K, 시장 통계)
--   [C] 단일 출처: 0건
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Agility Digit 5 공식 발표 — 세계 최초 협력안전 휴머노이드, FORT Robotics MOU, SPAC $2.5B
-- 2. [Warning] Unitree IPO $9B 밸류 확정 — STAR Market, DeepSeek 전략투자, 중국 최초 휴머노이드 상장
-- 3. [Warning] Tesla Optimus AI5/AI6 칩 RAM 삭감 — 양산 물량 vs 성능 트레이드오프
