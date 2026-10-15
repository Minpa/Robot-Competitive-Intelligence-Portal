-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-15
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-15T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-12
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-15.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Tesla Optimus — $30B 신용한도 확보, Giga Texas Optimus 공장 4층 골조 완성
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'SEC Filing / DriveTeslaCanada / Basenor',
   'https://driveteslacanada.ca/news/tesla-30-billion-credit-lines/',
   '[Warning] Tesla — $30B 신용한도 확보(SEC 9/29), Giga Texas Optimus 공장 4층 골조 급속 진행',
   'Tesla SEC 공시(9/29): $30B 신용한도 확보 — $20B 3년 지연인출 기간대출(Citibank), $8B 5년 리볼빙(Wells Fargo), $2B 364일 리볼빙. 현재 인출 $0. 용도: AI 인프라/데이터센터, AI5 칩, Cybercab, Optimus. Giga Texas Optimus 전용 공장: 4층 골조 완성(10/1 기준), 2027년 여름 생산 목표, 연 1,000만 대 설계 용량(장기). Fremont 현재 주 수백 대 → 연말 주 1,000대 목표(The Information, 미확인). V3 여전히 미공개.',
   '2026-10-15'::timestamp, 'pending'),

-- 2. [Critical] Agility — SEC S-4 등록신고서 유효화(10/13), 주주투표 11/2 확정
  (gen_random_uuid(), 'SEC EDGAR / Churchill Capital Corp XI 425',
   'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026109080/ea030849601ex99-1.htm',
   '[Critical] Agility SPAC — S-4 등록신고서 SEC 유효화(10/13), 주주투표 11/2 확정, 연말 마감 기한',
   'Churchill Capital Corp XI(CCXI)와 Agility 합병: SEC가 S-4 등록신고서 유효 선언(10/13). CCXI 주주특별총회 11/2 개최 확정. 합병 승인 시 Nasdaq "AGLT" 상장. 총 조달 $620M+(트러스트 ~$420M + PIPE $200M, Foxconn 리드). 프리머니 밸류에이션 $2.5B. 외부 마감기한(Outside Date) 12/31 — 미완료 시 어느 쪽이든 철회 가능. 2025년 매출 $1.8M, 영업손실 $140M. Digit 5: $300M+ 주문, 65K+ 운영시간, BOM ~$150K.',
   '2026-10-15'::timestamp, 'pending'),

-- 3. [Info] Boston Dynamics — RMAC 개장(9/30), GR3 핸드 산업 현장 반응 분석
  (gen_random_uuid(), 'Boston Dynamics / Robotics & Automation News / Startup Fortune',
   'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
   '[Info] BD Atlas GR3 핸드 — 4핑거 13DOF 다이렉트 액추에이션, 드릴·너트 조작 시연, RMAC 9/30 개장',
   'BD GR3 핸드(10/2): 4핑거(엄지 4DOF 포함) 13 DOF, 다이렉트 액추에이션, 손바닥·손가락끝 촉각 압력센서. 시연: 드릴 비트 장착→나무 드릴링→소형 너트 손끝 체결. BD: "능숙한 도구 사용이 산업용 휴머노이드의 핵심 역량." Hyundai RMAC(Robotics Metaplant Application Center) 9/30 HMGMA 내 개장. 2026 전체 생산분 확정(Hyundai+Google DeepMind). 30K대/년 전용공장 2028 가동 계획 유지.',
   '2026-10-15'::timestamp, 'pending'),

-- 4. [Info] Figure AI — Nscale $3.5B 컴퓨트 계약 확정, Vera Rubin GPU 10만 개 배치 계획
  (gen_random_uuid(), 'PYMNTS / The Next Web / Silicon.co.uk / Light Reading',
   'https://www.pymnts.com/news/artificial-intelligence/2026/nscale-inks-3-5-billion-deal-with-robotics-firm-figure/',
   '[Info] Figure AI-Nscale $3.5B 컴퓨트 계약 — Vera Rubin 플랫폼 GPU 10만 개, 2027H2 가동 시작',
   'Nscale-Figure AI 전략 파트너십(9/3 발표): 최소 $3.5B AI 클라우드 용량, $6B+ 확장 의향. NVIDIA Vera Rubin 플랫폼 GPU 최대 100,000개 배치. 초기 GPU 2027H2 Barstow, TX 데이터센터 가동 예정. Nscale은 Figure 지분 취득(금액 미공개), Figure 우선 컴퓨트 공급자. Nvidia는 양사 모두 투자자. Catalyst Brands 대규모 배치 계약(시기·규모 미공개). F.03 1,000대+ 생산(7월). Helix 2.5: 30개 미지 가정 56% 풀태스크 성공(9/17). 밸류에이션 ~$39B.',
   '2026-10-15'::timestamp, 'pending'),

-- 5. [Info] Unitree H2 Plus — $95-100K 가격 확인, 10월 주문 개시 보도, Q4 2026 양산 예정
  (gen_random_uuid(), 'GrabARobot / RoboStore / humanoid.guide / PR Newswire',
   'https://grabarobot.com/news/unitree-h2-plus-humanoid-100k-price-2026/',
   '[Info] Unitree H2 Plus — $95-100K 가격대, 10월 주문 개시 보도(미확인), Q4 양산·출하 계획',
   'Unitree H2 Plus: Nvidia Isaac GR00T 공식 레퍼런스 휴머노이드(6/1 발표). 가격: $95,000~$100,000(소스별 상이, 공식 미확인). GrabARobot: 10월 주문 개시, Q4 2026 양산(유닛리 공식 미확인). RoboStore: 북미 상용화·유통 주도 선언. 출하: 2026년 말 글로벌 출하 예정(공식). 초기 북미 할당 제한 예상. IPO 상태: STAR Market 3월 신청, 주가 추적 중. Pentagon 1260H + FCC Covered List 등재 유지.',
   '2026-10-15'::timestamp, 'pending'),

-- 6. [Info] Apptronik — Jabil 파트너십 통한 제조 확장 논의(10/8), Apollo 3 상용화 준비
  (gen_random_uuid(), 'The Robot Report / Jabil',
   'https://www.therobotreport.com/tag/apptronik/',
   '[Info] Apptronik-Jabil — 휴머노이드 제조 속도 논의(10/8), Apollo 3 첫 상용 제품 준비',
   'Jabil(Apptronik 제조 파트너) 10/8 인터뷰: 휴머노이드 로봇 개발·생산 속도 논의, 제조 관점에서의 설계 최적화 강조. Apollo 2: 바이페드+휠 듀얼 구성(7월 출시). Robot Park(오스틴): Google DeepMind Gemini Robotics AI 학습 데이터 수집. $520M 시리즈A($5B 밸류, 2월), 누적 ~$935M. Apollo 3 = 첫 정식 상용 제품(출시 시기 미정). 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority.',
   '2026-10-15'::timestamp, 'pending'),

-- 7. [Info] 1X Technologies NEO — 10월 신규 업데이트 없음, 가정 배송 준비 상태 유지
  (gen_random_uuid(), 'eWeek / Dezeen / The Robot Report',
   'https://www.eweek.com/news/1x-neo-humanoid-robot-hands-2026/',
   '[Info] 1X NEO — 10월 신규 업데이트 없음, 25-DOF 핸드 통합 완료, 2026 내 미국 가정 배송 계획 유지',
   '1X Technologies: 10/15 기준 10월 신규 발표 없음. 최근 상태 유지 — Hayward 공장(4/30) 연 10K대, $20K/$499월. 25-DOF 텐던 구동 핸드(7/9): 포스 제어 조인트+촉각 센서, 가정용 첫 배송 모델에 탑재. EQT 10K대 약정(2026-2030). 텔레오퍼레이션 병행 운용(초기). 개발자 배송 가속(6/24). 규제: 중국 로봇 수입 제한으로 미국 자국 제조 경쟁력 부각.',
   '2026-10-15'::timestamp, 'pending'),

-- 8. [Info] Agibot — 복수 리서치사 시장 지배 확인(IDC 35%, SAG 44%), H1 글로벌 출하 19.1K-25K대
  (gen_random_uuid(), 'IDC / Smart Analytics Global / Counterpoint / SCMP',
   'https://smartanalyticsglobal.com/global-humanoid-robot-shipments-2026-agibot-unitree/',
   '[Info] Agibot 시장 지배 — IDC 35% vs SAG 44%(H1 2026), H1 글로벌 출하 19.1-25K대, 연간 50K+ 전망',
   'H1 2026 글로벌 휴머노이드 출하량 리서치사별 분석: IDC ~25,000대(Agibot 8,600대=35%), SAG 19,100대(Agibot 8,400대=44%, YoY +562%). Unitree 2위(SAG: 5,900대, 31%). Counterpoint: 2026 연간 50,000대+ 돌파 전망. Omdia FY2025: Agibot 39%, Unitree 32%, UBTech 7%. SCMP: Agibot, IPO 추진 중 Unitree를 매출에서도 역전. 중국 97%+ 시장 점유. Agibot 미국 진출 선언. UK APC2026: A3 유럽 출시, RaaS £1,999/일.',
   '2026-10-15'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Agility SPAC S-4 유효화 + 주주투표 확정
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[상장] Agility — SEC S-4 유효화(10/13), 주주투표 11/2 확정, Nasdaq "AGLT" 상장 임박',
  'Churchill Capital Corp XI(CCXI) S-4 등록신고서 SEC 유효 선언(10/13). 주주특별총회 11/2 확정. 합병 승인 시 Nasdaq "AGLT" 즉시 상장. 총 조달 $620M+(트러스트 ~$420M + Foxconn PIPE $200M). 프리머니 $2.5B. Outside Date 12/31. Digit 5 $300M+ 주문, BOM $150K, RaaS 마진 50%. 2025 매출 $1.8M, 영업손실 $140M.',
  '{"source":"SEC EDGAR / Churchill Capital Corp XI Form 425","sourceUrl":"https://www.sec.gov/Archives/edgar/data/0002074973/000121390026109080/ea030849601ex99-1.htm","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-15'::timestamp
);

-- Tesla $30B 신용한도 + Giga Texas 공장
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[자금] Tesla $30B 신용한도 확보(SEC 9/29) — Optimus·Cybercab·AI 인프라 동시 확장',
  'Tesla SEC 공시(9/29): $30B 신용한도 — $20B 지연인출(Citibank 3년), $8B 리볼빙(Wells Fargo 5년), $2B 단기. 인출 $0. Giga Texas Optimus 공장 4층 골조(10/1). 2027 여름 생산, 연 1,000만 대 장기 설계. Fremont 주 수백 대 → 연말 1,000대 목표. V3 미공개. 외부 판매 2027 후반 예상.',
  '{"source":"SEC Filing / DriveTeslaCanada / Basenor","sourceUrl":"https://driveteslacanada.ca/news/tesla-30-billion-credit-lines/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-15'::timestamp
);

-- Figure AI Nscale 대규모 컴퓨트 계약
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[파트너십] Figure AI-Nscale $3.5B+ 컴퓨트 계약 — Vera Rubin GPU 10만 개, AI 학습 인프라 확장',
  'Nscale-Figure AI: 최소 $3.5B→$6B+ AI 클라우드 용량. NVIDIA Vera Rubin GPU 최대 100K개. 2027H2 Barstow TX 가동. Nscale 지분 취득. Nvidia 양사 투자자. Catalyst Brands 대규모 배치 계약. F.03 1,000대+ 생산. Helix 56% 가정 성공. 밸류에이션 $39B. 원형 금융(circular deal) 우려 제기됨.',
  '{"source":"PYMNTS / The Next Web / Light Reading","sourceUrl":"https://www.pymnts.com/news/artificial-intelligence/2026/nscale-inks-3-5-billion-deal-with-robotics-firm-figure/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-15'::timestamp
);

-- Unitree H2 Plus 주문 개시 보도
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'info',
  '[양산] Unitree H2 Plus — $95-100K 가격, 10월 주문 개시 보도, Nvidia GR00T 레퍼런스',
  'H2 Plus: Nvidia Isaac GR00T 레퍼런스 플랫폼. $95-100K(공식 미확인). 10월 주문 개시 보도(GrabARobot, 공식 미확인). Q4 2026 양산 예정. RoboStore 북미 유통. STAR Market IPO 진행 중. Pentagon 1260H + FCC Covered List 등재.',
  '{"source":"GrabARobot / RoboStore / humanoid.guide","sourceUrl":"https://grabarobot.com/news/unitree-h2-plus-humanoid-100k-price-2026/","reliability":"C","region":"china"}'::jsonb,
  false, '2026-10-15'::timestamp
);

-- Agibot 시장 지배 복수 확인
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[시장] Agibot H1 2026 시장 지배 복수 리서치사 확인 — IDC 35% / SAG 44% / 연간 50K+ 전망',
  'H1 2026 복수 확인: IDC 25K대(Agibot 35%), SAG 19.1K대(Agibot 44%). Counterpoint 연간 50K+. 누적 20K대(9/24). 미국 진출 선언. UK RaaS 런칭. A3 Ultra 51DOF 8시간. IPO 추진 중. 중국 97%+ 점유.',
  '{"source":"IDC / SAG / Counterpoint / SCMP","sourceUrl":"https://smartanalyticsglobal.com/global-humanoid-robot-shipments-2026-agibot-unitree/","reliability":"B","region":"global"}'::jsonb,
  false, '2026-10-15'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-15'::timestamp,
    next_review = '2026-10-22'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Agility: SPAC 주주투표 일정 확정
UPDATE ci_values
SET value = 'SEC S-4 유효화(10/13). 주주투표 11/2 확정. Nasdaq "AGLT". 트러스트 ~$420M + PIPE $200M(Foxconn). 프리머니 $2.5B. Outside Date 12/31. Digit 5 BOM $150K, $300M+ 주문, RaaS 50% 마진.',
    confidence = 'A',
    source = 'SEC EDGAR / Churchill Capital Corp XI Form 425',
    source_url = 'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026109080/ea030849601ex99-1.htm',
    source_date = '2026-10-15',
    last_verified = '2026-10-15'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%상장%')
    LIMIT 1
  );

-- Tesla: $30B 신용한도 + Giga Texas 공장 진행
UPDATE ci_values
SET value = '$30B 신용한도(SEC 9/29): $20B 지연인출+$8B 리볼빙+$2B 단기. 인출 $0. Giga Texas 4층 골조(10/1), 2027여름 생산, 연 1,000만대 설계. Fremont 주 수백→1,000대 목표. V3 미공개.',
    confidence = 'A',
    source = 'SEC Filing / DriveTeslaCanada / Basenor',
    source_url = 'https://driveteslacanada.ca/news/tesla-30-billion-credit-lines/',
    source_date = '2026-10-15',
    last_verified = '2026-10-15'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%자금%')
    LIMIT 1
  );

-- Figure AI: Nscale 컴퓨트 계약 업데이트
UPDATE ci_values
SET value = 'Nscale $3.5B→$6B+ AI 클라우드. Vera Rubin GPU 10만개. 2027H2 Barstow TX. Nscale 지분 취득. Catalyst Brands 배치. F.03 1,000대+(7월). Helix 56% 가정 성공. 밸류에이션 $39B.',
    confidence = 'B',
    source = 'PYMNTS / The Next Web / Light Reading',
    source_url = 'https://www.pymnts.com/news/artificial-intelligence/2026/nscale-inks-3-5-billion-deal-with-robotics-firm-figure/',
    source_date = '2026-10-15',
    last_verified = '2026-10-15'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'sw' AND (ci.name ILIKE '%AI%' OR ci.name ILIKE '%인프라%' OR ci.name ILIKE '%플랫폼%' OR ci.name ILIKE '%컴퓨트%')
    LIMIT 1
  );

-- Unitree: H2 Plus 주문 개시 + 가격 업데이트
UPDATE ci_values
SET value = 'H2 Plus: GR00T 레퍼런스. $95-100K(미확인). 10월 주문 개시 보도(미확인). Q4 양산. RoboStore 북미 유통. STAR Market IPO. 1260H+FCC 등재.',
    confidence = 'C',
    source = 'GrabARobot / RoboStore / humanoid.guide',
    source_url = 'https://grabarobot.com/news/unitree-h2-plus-humanoid-100k-price-2026/',
    source_date = '2026-10-15',
    last_verified = '2026-10-15'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%가격%' OR ci.name ILIKE '%판매%')
    LIMIT 1
  );

-- Agibot: 시장 점유율 복수 확인 업데이트
UPDATE ci_values
SET value = 'H1 2026 복수 확인: IDC 25K대(35%), SAG 19.1K대(44%). Counterpoint 연간 50K+. 누적 20K(9/24). 미국+유럽 진출. UK RaaS £1,999/일. IPO 추진.',
    confidence = 'B',
    source = 'IDC / SAG / Counterpoint / SCMP',
    source_url = 'https://smartanalyticsglobal.com/global-humanoid-robot-shipments-2026-agibot-unitree/',
    source_date = '2026-10-15',
    last_verified = '2026-10-15'::timestamp,
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
-- 총 수집 건수: 18건 (ci_monitor_alerts 8건, competitive_alerts 5건, ci_values 5건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 3건 (Agility SEC S-4 유효화/주주투표, Tesla SEC $30B 신용한도, BD GR3 핸드)
--   [B] 2개+ 매체 교차확인: 4건 (Figure-Nscale 컴퓨트, Agibot 시장 점유율, Tesla 공장 진행, Apptronik-Jabil)
--   [C] 단일 출처: 2건 (Unitree H2 Plus 주문 개시 보도, 1X NEO 상태 유지)
--   [D] 추정: 0건
--   [E] 미확인: 0건
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Agility SPAC — SEC S-4 유효화(10/13), 주주투표 11/2 확정, 휴머노이드 최초 SPAC 상장 임박
-- 2. [Warning] Tesla — $30B 신용한도 확보, Giga Texas Optimus 공장 4층 골조, 양산 인프라 본격 구축
-- 3. [Warning] Agibot — H1 2026 복수 리서치사 시장 지배 확인(IDC 35% / SAG 44%), 연간 50K+ 전망
