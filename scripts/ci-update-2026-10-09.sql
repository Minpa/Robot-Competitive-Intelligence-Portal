-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-09
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-09T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-07
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-09.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Agility Robotics Investor Day 재무 공개 — Digit 5 BOM $150K, RaaS 마진 ~50%, $300M 주문
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Agility Robotics IR / GeekWire / RuntimeWire',
   'https://www.agilityrobotics.com/content/agility-robotics-to-livestream-analyst-investor-day-today',
   '[Critical] Agility Investor Day(10/6) 재무 공개 — Digit 5 BOM $150K, RaaS 50% 마진, $300M 주문',
   'Agility Robotics Analyst & Investor Day(10/6 NYC): Digit 5 BOM ~$150K(Digit 4 대비 상승), RaaS 마진 ~50%(1,000대/년 생산 도달 시). $300M 확정 주문 — use case 검증 단계별 로봇 공급. GA(일반 가용) 시점: 2027년 말~2028년 초. 2025년 매출 $1.8M, 영업손실 $140M. SPAC(CCXI) 합병 Q4 2026 마감 예정, 티커 "AGLT". 65,000+ 실전 운영 시간 기록.',
   '2026-10-09'::timestamp, 'pending'),

-- 2. [Warning] Nvidia, Figure AI에 $1B 추가 투자 협상 중 — 밸류에이션 ~$38-39B
  (gen_random_uuid(), 'The Information / eWeek / First Futurist',
   'https://www.eweek.com/news/nvidia-figure-ai-1-billion-investment-humanoid-robots/',
   '[Warning] Nvidia, Figure AI에 $1B 추가 투자 검토 — 밸류에이션 ~$38-39B, GPU 인프라 확장',
   'The Information 보도: Nvidia가 Figure AI에 약 $1B 추가 투자를 검토 중. 프리머니 밸류에이션 ~$38B(Series C 확장). Figure AI는 차세대 GPU 인프라 구축으로 Helix 학습/시뮬레이션 가속 계획. 총 누적 투자 ~$2.9B 전망. BotQ 공장: Figure 03 1,000대+ 생산 완료(7월 기준), 시간당 1대 유지. BMW Spartanburg 40대 배치 확대 중. Helix: 30개 미지 가정에서 56% 풀태스크 성공(9/17).',
   '2026-10-09'::timestamp, 'pending'),

-- 3. [Info] Boston Dynamics Atlas — Hyundai HMGMA 조지아 공장 10월 파일럿 투입 보도
  (gen_random_uuid(), 'Korea JoongAng Daily / Korea Herald / Robotics & Automation News',
   'https://www.koreajoongangdaily.com/business/10/12213411',
   '[Info] BD Atlas — Hyundai HMGMA 조지아 EV 공장 10월 파일럿 투입 단독 보도',
   'Korea JoongAng Daily 단독: Hyundai Motor Group, Atlas를 조지아주 HMGMA(Metaplant America) EV 공장에 10월 파일럿 투입 계획. 양산 전 첫 현장 시험. 초기 부품 시퀀싱 작업 → 2030년까지 조립 공정 확대 전망. GR3 핸드(10/2 공개): 4핑거 13 DOF, 다이렉트 액추에이션, 손바닥/손가락 끝 촉각 센서, 손 안에서 물체 재배향/미끄럼 보정 가능. 30,000대/년 전용 공장 계획 유지(2028 가동 목표).',
   '2026-10-09'::timestamp, 'pending'),

-- 4. [Info] Tesla Optimus — 핸드 공급난이 양산 병목, 100개+ 나사/핸드·전완부
  (gen_random_uuid(), 'The Information / The Next Web / Futurism',
   'https://thenextweb.com/news/tesla-optimus-production-hands-suppliers',
   '[Info] Tesla Optimus — 핸드/전완부 수작업 조립이 양산 핵심 병목, 100+ 나사/유닛',
   'The Information 보도(9/28): Optimus V3 양산 핵심 병목 = 핸드/전완부. 각 핸드·전완부에 100개 이상 나사 등 소부품 → 현재 수작업 조립. 공장 장비 및 부품 공급업체 문제도 중첩. 장기 목표: 주 20,000대(연 1,000만대) — 현재 수백 대/주와 격차 큼. Q1 2026 실적: Fremont 1세대 라인 설치 중, Giga Texas 2세대 라인(연 100만대 설계). 로봇은 "Optimus Academy" 학습용으로 우선 공급, 외부 판매 미개시.',
   '2026-10-09'::timestamp, 'pending'),

-- 5. [Info] 휴머노이드 규제 동향 — San Mateo County 허가제, ISO 25785-1 초안, FCC 금수 지속
  (gen_random_uuid(), 'KQED / PA Daily Post / IEEE / HackerNoon',
   'https://www.kqed.org/news/12094873/san-mateo-county-could-be-first-to-regulate-humanoid-robots-for-commercial-use',
   '[Info] 규제 동향 — San Mateo County 휴머노이드 허가제 추진, ISO 25785-1 초안 진행',
   'San Mateo County(CA): 미국 최초 휴머노이드 로봇 상업 배치 허가제 추진. 기업은 허가 취득 후 배치, 비상 킬스위치 의무화, 대규모 리콜 이력 시 배제. 국제: ISO/WD 25785-1(동적 안정 산업 이동 로봇) 초안 진행, 정식 표준 ~2028년 예상. EU: 기계류 규정 2023/1230 적용, AI 기반 안전 시스템 요건 강화. FCC 2026.07.28 중국제 휴머노이드/사족보행 수입 금지 유지. 업계 자체: Agility "안전 시스템 미흡" 인정, BD 표준화된 E-stop 요구.',
   '2026-10-09'::timestamp, 'pending'),

-- 6. [Info] Unitree H2 Plus — Nvidia Isaac GR00T 레퍼런스 플랫폼 선정, 10월 출시 예정
  (gen_random_uuid(), 'CNBC / NVIDIA / Unitree',
   'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
   '[Info] Unitree H2 Plus — Nvidia Isaac GR00T 공식 레퍼런스 플랫폼, 10월 출시 예정',
   'Nvidia Isaac GR00T 레퍼런스 휴머노이드: Unitree H2 Plus 기반. Nvidia VP Rev Lebaredian: "10월 출시 예정, 누구나 구매 가능." H2 Plus는 H2 업그레이드 모델. Nvidia-Unitree 파트너십: 연구자용 오픈 플랫폼으로 휴머노이드 AI 개발 가속 목표. Unitree STAR Market 주가: 상장 후 거래 데이터 미확인(10월 현재). DeepSeek 전략 동맹 + Nvidia 플랫폼 선정 = 중국 로봇 AI 생태계 강화.',
   '2026-10-09'::timestamp, 'pending'),

-- 7. [Info] Figure AI Helix — 30개 미지 가정 56% 풀태스크 성공(9/17), 가정용 진출 가속
  (gen_random_uuid(), 'Figure AI / The Decoder / eWeek',
   'https://www.figure.ai/news/introducing-figure-03',
   '[Info] Figure Helix 가정 배치 성과 — 30개 미지 가정 56% 풀태스크 성공, 1,000대 생산 돌파',
   'Figure Helix 2.5: 30개 이전 방문 없는 가정에서 56% 풀태스크 성공률(9/17 발표). 온보드 실행(클라우드 비의존), NVIDIA GPU 2개/유닛. BotQ 1,000번째 F.03 7월 생산. 가정용 알파 테스트 프로그램 진행 중. Figure 02 퇴역 → Figure 04 설계 확정(5월), 부품 출하 중. 총 투자 ~$1.9B(Nvidia $1B 추가 시 ~$2.9B), 밸류에이션 $39B.',
   '2026-10-09'::timestamp, 'pending'),

-- 8. [Info] Agibot 누적 20,000대 출하 — 글로벌 시장점유율 35%(H1 2026 IDC)
  (gen_random_uuid(), 'Humanoid Press / The Robot Report / IDC',
   'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
   '[Info] Agibot 누적 20,000대 출하(9/24) — H1 2026 글로벌 35% 점유(IDC), 미국 진출 선언',
   'Agibot 9/24 테마파크 운영사에 20,000번째 로봇 인도. IDC 수정 데이터: 글로벌 H1 2026 휴머노이드 출하 ~25,000대, Agibot 8,600대(35% 점유). TrendForce: 2026년 글로벌 휴머노이드 출하 50,000대 돌파 전망(전년 대비 700% 증가). 미국 시장 진출 공식 선언. UK APC2026 런던 개최로 유럽 진출 가속. A3 Ultra: 51 DOF, 8시간 가동.',
   '2026-10-09'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Agility Investor Day 재무 공개
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[공시] Agility Investor Day — Digit 5 BOM $150K, RaaS 50% 마진, $300M 주문, SPAC Q4 마감',
  'Agility Robotics Analyst Day(10/6): Digit 5 BOM ~$150K. RaaS 마진 ~50%(1,000대/년). $300M 확정 주문(트랜치별 공급). GA 2027 말~2028 초. 2025 매출 $1.8M / 영업손실 $140M. SPAC CCXI 합병 Q4 마감, 티커 AGLT. Foxconn $200M PIPE 리드. CEO Peggy Johnson MITRE Project Meridian 합류.',
  '{"source":"Agility IR / GeekWire / RuntimeWire / SEC 425","sourceUrl":"https://www.agilityrobotics.com/content/agility-robotics-to-livestream-analyst-investor-day-today","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-09'::timestamp
);

-- Nvidia-Figure AI $1B 투자 협상
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[투자] Nvidia, Figure AI에 $1B 추가 투자 검토 — 밸류에이션 ~$38-39B, GPU 인프라 확장',
  'The Information 보도: Nvidia가 Figure AI에 ~$1B 추가 투자 검토. 프리머니 $38B. 목적: 차세대 GPU 인프라(Helix 학습/시뮬레이션). Figure 03 1,000대+ 생산(7월). Helix 30개 가정 56% 성공. 확정 시 누적 ~$2.9B. Nvidia의 휴머노이드 투자 전략: Unitree(GR00T 플랫폼) + Figure AI(직접 투자) 양면.',
  '{"source":"The Information / eWeek / First Futurist","sourceUrl":"https://www.eweek.com/news/nvidia-figure-ai-1-billion-investment-humanoid-robots/","reliability":"C","region":"north_america"}'::jsonb,
  false, '2026-10-09'::timestamp
);

-- BD Atlas HMGMA 파일럿
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'info',
  '[배치] BD Atlas — Hyundai HMGMA 조지아 EV 공장 10월 파일럿 투입 보도(단독)',
  'Korea JoongAng Daily 단독: Atlas 10월 HMGMA 파일럿 투입. 양산 전 첫 현장 시험. 초기 부품 시퀀싱 → 2030 조립 확대. GR3 핸드(10/2): 4핑거 13DOF, 촉각 센서, 물체 재배향. 다만 Hyundai/Kia 공식은 2028 본격 배치 언급 — 파일럿 규모 제한적일 수 있음.',
  '{"source":"Korea JoongAng Daily / Korea Herald","sourceUrl":"https://www.koreajoongangdaily.com/business/10/12213411","reliability":"C","region":"asia"}'::jsonb,
  false, '2026-10-09'::timestamp
);

-- 글로벌 휴머노이드 시장 50,000대 돌파 전망
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[시장] 2026 글로벌 휴머노이드 출하 50,000대 돌파 전망 — 전년비 700% 증가(TrendForce)',
  'TrendForce: 2026년 글로벌 휴머노이드 출하 50,000대 돌파(전년비 700% 증가). IDC H1 2026: ~25,000대(상반기). Agibot 35% 점유(8,600대). 중국 95%+ 시장 지배. 미국: FCC 금수로 중국제 신규 수입 차단, 자국 업체 부품 공급난. 규제: San Mateo County 허가제, ISO 25785-1 초안, EU 기계류 규정 강화.',
  '{"source":"TrendForce / IDC / theresarobotforthat.com","sourceUrl":"https://theresarobotforthat.com/blog/humanoid-robot-companies-2026-complete-guide/","reliability":"B","region":"global"}'::jsonb,
  false, '2026-10-09'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-09'::timestamp,
    next_review = '2026-10-16'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Agility Digit 5: 재무 데이터 업데이트
UPDATE ci_values
SET value = 'Digit 5 BOM ~$150K. RaaS 마진 ~50%(1,000대/년). $300M 확정 주문. GA 2027 말~2028 초. SPAC CCXI Q4 마감.',
    confidence = 'A',
    source = 'Agility IR Investor Day / GeekWire / SEC 425',
    source_url = 'https://www.agilityrobotics.com/content/agility-robotics-to-livestream-analyst-investor-day-today',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%' OR ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%')
    LIMIT 1
  );

-- Figure AI: Nvidia 투자 + 생산 업데이트
UPDATE ci_values
SET value = 'Nvidia $1B 추가 투자 검토(프리머니 $38B). F.03 1,000대+ 생산(7월). Helix 30가정 56% 성공. 총 ~$1.9B→$2.9B.',
    confidence = 'C',
    source = 'The Information / eWeek / First Futurist',
    source_url = 'https://www.eweek.com/news/nvidia-figure-ai-1-billion-investment-humanoid-robots/',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%')
    LIMIT 1
  );

-- Boston Dynamics Atlas: HMGMA 파일럿 + GR3 핸드 업데이트
UPDATE ci_values
SET value = 'HMGMA 조지아 10월 파일럿 보도(단독). GR3: 4핑거 13DOF, 촉각센서, 물체 재배향. 30K/년 공장 2028.',
    confidence = 'C',
    source = 'Korea JoongAng Daily / Robotics & Automation News',
    source_url = 'https://www.koreajoongangdaily.com/business/10/12213411',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%핸드%' OR ci.name ILIKE '%매니퓰%' OR ci.name ILIKE '%손%')
    LIMIT 1
  );

-- Tesla Optimus: 핸드 병목 상세
UPDATE ci_values
SET value = '핸드/전완부 병목: 100+ 나사/유닛 수작업. 수백 대/주 유지. Fremont 1세대, Giga Texas 2세대(연 100만대). 외부 판매 미개시.',
    confidence = 'B',
    source = 'The Information / The Next Web / Futurism',
    source_url = 'https://thenextweb.com/news/tesla-optimus-production-hands-suppliers',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%핸드%' OR ci.name ILIKE '%매니퓰%' OR ci.name ILIKE '%손%')
    LIMIT 1
  );

-- Unitree: H2 Plus + Nvidia GR00T 플랫폼
UPDATE ci_values
SET value = 'H2 Plus: Nvidia Isaac GR00T 공식 레퍼런스 플랫폼(10월 출시). IPO 후 주가 추적 중. DeepSeek + Nvidia 양면 동맹.',
    confidence = 'B',
    source = 'CNBC / NVIDIA / Unitree',
    source_url = 'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'sw' AND (ci.name ILIKE '%AI%' OR ci.name ILIKE '%소프트웨어%' OR ci.name ILIKE '%플랫폼%')
    LIMIT 1
  );

-- Agibot: 20,000대 누적 + 시장점유율
UPDATE ci_values
SET value = '누적 20,000대(9/24). IDC H1 2026: 8,600대(35% 글로벌 점유). 50,000대 전체 시장(TrendForce). 미국 진출 선언.',
    confidence = 'B',
    source = 'Humanoid Press / The Robot Report / IDC / TrendForce',
    source_url = 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    source_date = '2026-10-09',
    last_verified = '2026-10-09'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%배치%' OR ci.name ILIKE '%판매%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 16건 (ci_monitor_alerts 8건, competitive_alerts 4건, ci_values 6건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 2건 (Agility IR Investor Day 재무, BD GR3 핸드 공식 발표)
--   [B] 2개+ 매체 교차확인: 5건 (Tesla 핸드 병목, Agibot 누적 출하, Unitree GR00T, 시장 전망, 규제 동향)
--   [C] 단일 출처: 3건 (Nvidia-Figure $1B 투자, BD HMGMA 파일럿, Helix 가정 성과)
--   [D] 추정: 0건
--   [E] 미확인: 0건
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Agility Investor Day(10/6) — Digit 5 BOM $150K, RaaS 50% 마진, $300M 주문, GA 2027말~2028초
-- 2. [Warning] Nvidia, Figure AI에 $1B 추가 투자 검토 — 밸류에이션 ~$38-39B
-- 3. [Warning] 2026 글로벌 휴머노이드 출하 50,000대 돌파 전망(TrendForce) — 전년비 700% 증가
