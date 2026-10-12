-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-12
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-12T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-09
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-12.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Tesla Optimus — Fremont 주 수백 대 생산 도달, V3 공개 계속 지연
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Electrek / SEC 10-Q / Yahoo Finance',
   'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
   '[Warning] Tesla Optimus — 주 수백 대 생산(Q2 대비 10배), V3 공개 미발표, AI 일반화 한계 지속',
   'Electrek 보도(9/25): Tesla Optimus, Fremont 공장에서 주 수백 대 생산 — Q2 대비 약 10배 증가. SEC 10-Q: 2026년 내 양산 개시 목표, 연 100만 대 생산능력 목표. 그러나 V3 공개가 Q1→여름으로 밀린 후 여전히 미발표(10/12 현재). Electrek: "로봇이 여전히 일반화된 작업 수행 불가" — AI 능력 한계가 실제 활용 제한. Fremont Model S/X 라인 46일 만에 해체하여 Optimus 전용 라인 전환. Giga Texas 2세대 라인(연 100만 대 설계) 설치 진행 중.',
   '2026-10-12'::timestamp, 'pending'),

-- 2. [Info] Boston Dynamics Atlas — CES 2026 이후 Hyundai RMAC & Google DeepMind 배치 진행
  (gen_random_uuid(), 'Boston Dynamics / NBC News / The Robot Report',
   'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
   '[Info] BD Atlas 제품판 — 2026년 전체 배치 확정, Hyundai RMAC+Google DeepMind 납품, 2027 추가 고객',
   'CES 2026(1/5) Atlas 제품판 공개 후: 2026년 전체 생산분 이미 확정 — Hyundai RMAC(조지아) + Google DeepMind 배치 예정. 2027년 초 추가 고객 확대 계획. Google DeepMind Gemini Robotics 파운데이션 모델 기반 AI 고도화 파트너십 진행. 2028년 Hyundai EV 제조시설(사바나, GA) 조립 공정 투입 목표. 전용 공장(연 30,000대) 2028 가동 계획 유지. 비공식 가격 추정 ~$320K(BD 미확인).',
   '2026-10-12'::timestamp, 'pending'),

-- 3. [Warning] Figure AI — Nvidia $1B 추가 투자 협상 지속, Nscale $3.5B 컴퓨트 인프라 계약
  (gen_random_uuid(), 'eWeek / The Information / CNBC',
   'https://eweek.com/news/nvidia-figure-ai-1-billion-investment-humanoid-robots/',
   '[Warning] Figure AI — Nvidia $1B 추가 투자 협상, Nscale $3.5B 컴퓨트 계약, BotQ 90분/대 생산',
   'Nvidia $1B 추가 투자 협상 지속(The Information). 프리머니 밸류에이션 ~$38B. 9월 Nscale과 $3.5B 컴퓨트 용량 계약(향후 $6B+ 확대 계획) — Figure AI의 AI 학습/시뮬레이션 인프라 대규모 확장. BotQ 공장: Figure 03 90분당 1대 생산(4월 기준). BMW 공장 1,250+ 런타임 시간, 90,000+ 부품 적재(30,000대 차량). Figure 03 백악관 방문(3/25 Melania Trump 서밋). 총 누적 투자 ~$1.9B(Nvidia 확정 시 ~$2.9B).',
   '2026-10-12'::timestamp, 'pending'),

-- 4. [Info] Unitree — STAR Market IPO 신청, Nvidia GR00T 레퍼런스 선정, 보안 이슈 미해결
  (gen_random_uuid(), 'Wikipedia / GeekWire / CNBC / humanoid.guide',
   'https://humanoid.guide/unitree-exhibits-g1-at-ifa-amid-unresolved-security-questions/',
   '[Info] Unitree — STAR Market IPO $580-610M 신청(3월), Nvidia GR00T 레퍼런스 H2 Plus, 보안 취약점 미패치',
   'Unitree 2026년 핵심 동향: (1) 3월 Shanghai STAR Market IPO 신청(~$580-610M). (2) Nvidia Isaac GR00T 공식 레퍼런스 플랫폼으로 H2 Plus 선정 — 10월 출시 예정, 연구자용 오픈 플랫폼. (3) IFA 2026 G1 전시 중 UniPwn BLE 취약점 미해결 지적 — 보안 연구자 비판. (4) Pentagon 1260H 리스트 등재(6월) + FCC Covered List 추가(7월). (5) 일본 GMO AI&Robotics와 공식 대리점 계약(6월). G1 $13,500, H1 ~$90K 유지.',
   '2026-10-12'::timestamp, 'pending'),

-- 5. [Critical] Agility — SPAC 합병 $2.5B, Digit 5 공개(9/17), $300M+ 주문
  (gen_random_uuid(), 'GeekWire / BusinessWire / Robotics & Automation News',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   '[Critical] Agility — Churchill Capital SPAC $2.5B 합병, Digit 5 공개, 65K+ 운영시간, 주문 $300M+',
   'Agility Robotics(현 "Agility"로 리브랜딩 3/5): (1) Churchill Capital Corp XI와 SPAC 합병 — $620M 조달, Nasdaq "AGLT" 티커, Q4 2026 마감 예정. (2) Digit 5 공개(9/17) — 65,000+ 운영시간 누적, $300M+ 멀티년 주문. (3) RoboFab(세일럼, OR) 연 10,000대 생산능력. (4) 고객: GXO(100K 토트 처리 달성, 98% 정확도), Schaeffler, Amazon, Toyota Canada(3→10대 확대), Mercado Libre 신규. (5) 추정 글로벌 배치 ~75대(40-150 범위).',
   '2026-10-12'::timestamp, 'pending'),

-- 6. [Warning] Apptronik — Apollo 2 출시, $520M 시리즈A, Google DeepMind Robot Park
  (gen_random_uuid(), 'CNBC / The Robot Report / Robotics & Automation News',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   '[Warning] Apptronik Apollo 2 출시(7월) — $520M 시리즈A($5B 밸류), Google DeepMind Robot Park',
   'Apptronik 2026: (1) Apollo 2 출시(~7/1) — 바이페드+휠 듀얼 구성. (2) Robot Park(오스틴 TX) 개장 — Google DeepMind Gemini Robotics AI 모델 기반 실환경 데이터 수집 시설. (3) $520M 시리즈A(2월, Google/Mercedes-Benz 참여) — $5B 밸류에이션, 누적 ~$935M. (4) 파트너: Mercedes-Benz(조립라인 파일럿), GXO Logistics, Jabil(제조). (5) Apollo 3가 첫 정식 상용 제품 — 출시 시기 미정. 가격 미공개.',
   '2026-10-12'::timestamp, 'pending'),

-- 7. [Info] 1X Technologies NEO — Hayward 공장 개장, $20K 판매 개시, EQT 10K대 계약
  (gen_random_uuid(), 'The Next Web / eWeek / humanoid.guide',
   'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
   '[Info] 1X NEO — Hayward 공장 개장(4/30), 연 10K대 용량, $20K 조기구매 / $499/월 구독',
   '1X Technologies: (1) Hayward, CA 공장 4/30 개장 — 초년도 10,000대, 2027 말 연 100,000대+ 목표. (2) 가격: Early Access $20,000(우선 배송) 또는 $499/월 구독. (3) EQT 계약: 2026-2030 포트폴리오사 10,000대 배치 약정(12/2025). (4) 7/9 25-DOF 텐던 구동 핸드 공개. (5) 6/24 개발자 NEO 배송 가속 발표. (6) 펀딩: Series B $100M(2024/1) 확정, $1B 추가 모집 보도(미확인), SoftBank $6B 밸류 협상 보도(8월, 미확인). 2026 미국 가정 배송 개시 계획.',
   '2026-10-12'::timestamp, 'pending'),

-- 8. [Critical] Agibot — 누적 20,000대, H1 2026 글로벌 35% 점유, WAIC 4신제품
  (gen_random_uuid(), 'Agibot 공식 / IDC / Robotics & Automation News',
   'https://www.agibot.com/article/231/detail/82.html',
   '[Critical] Agibot 누적 20,000대(9/24) — IDC H1 2026 글로벌 35% 점유(8,600대), 미국 진출 선언',
   'Agibot 2026: (1) 누적 생산 마일스톤 — 5,000대(1월) → 10,000대(3/30) → 15,000대(6월) → 20,000대(9/24). (2) IDC: H1 2026 글로벌 휴머노이드 출하 ~25,000대 중 Agibot 8,600대(35% 점유). (3) WAIC 2026: 4개 신제품 공개 + 3,000대/교대 배치 사례. (4) Chimelong Spaceship Park 300대+ 대규모 배치(9월). (5) 미국 시장 공식 진출 선언. (6) UK APC2026 런던 개최로 유럽 진출 가속. (7) A3 Ultra: 51 DOF, 8시간 가동. (8) 오픈소스 X1 플랫폼 유지.',
   '2026-10-12'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Tesla Optimus 양산 램프업 + V3 지연
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[양산] Tesla Optimus — 주 수백 대 생산 도달(Q2 10배↑), V3 공개 계속 미발표, AI 일반화 한계',
  'Optimus Fremont 주 수백 대 생산(Electrek 9/25). Q2 대비 10배 증가. SEC 10-Q: 2026년 내 양산 개시 목표. 그러나 V3 공개 Q1→여름 밀린 후 여전히 미발표. Electrek: AI 일반화 한계 → 실사용 제약. Model S/X 라인 해체 → Optimus 전용 전환. 핸드/전완부 수작업 조립(100+ 나사)이 핵심 병목.',
  '{"source":"Electrek / SEC 10-Q FY2026","sourceUrl":"https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-12'::timestamp
);

-- Agility SPAC 합병 + Digit 5
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[상장] Agility — Churchill Capital SPAC $2.5B 합병 Q4 마감 예정, Nasdaq "AGLT", $300M+ 주문',
  'Agility 리브랜딩(3/5). SPAC 합병: Churchill Capital Corp XI, $620M 조달, Nasdaq "AGLT", Q4 2026 마감. Digit 5 공개(9/17), 65K+ 운영시간 누적. $300M+ 멀티년 주문. RoboFab 연 10K대 용량. GXO 100K 토트 98% 정확도 달성. Toyota Canada 3→10대 확대.',
  '{"source":"GeekWire / BusinessWire / SEC","sourceUrl":"https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-12'::timestamp
);

-- Apptronik Apollo 2 + 대규모 펀딩
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[투자] Apptronik $520M 시리즈A($5B 밸류) + Apollo 2 출시 + Google DeepMind Robot Park',
  'Apptronik: $520M 시리즈A(2월, Google/Mercedes-Benz), $5B 밸류에이션, 누적 ~$935M. Apollo 2(7월): 바이페드+휠 듀얼 구성. Robot Park(오스틴): Google DeepMind Gemini Robotics AI 학습. 파트너: Mercedes-Benz, GXO, Jabil. Apollo 3 = 첫 상용 제품(출시 미정).',
  '{"source":"CNBC / The Robot Report / Robotics & Automation News","sourceUrl":"https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-12'::timestamp
);

-- 1X NEO 가정 배송 개시
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'info',
  '[양산] 1X NEO — Hayward 공장 개장, $20K 판매 개시, 가정용 시장 개척',
  '1X: Hayward 공장(4/30) 연 10K대 → 2027 100K+. $20K Early Access 또는 $499/월 구독. EQT 10K대 약정(2026-2030). 25-DOF 텐던 구동 핸드 공개(7/9). 개발자 배송 가속(6/24). 가정용 로봇 시장 선점 전략.',
  '{"source":"The Next Web / eWeek / humanoid.guide","sourceUrl":"https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-12'::timestamp
);

-- Agibot 시장 지배력 확대
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[시장] Agibot 누적 20K대, H1 2026 글로벌 35% 점유 — 미국·유럽 진출 선언',
  'Agibot: 5K(1월)→10K(3월)→15K(6월)→20K(9월). IDC H1 2026 글로벌 35% 점유(8,600대/25,000대). WAIC 4 신제품. Chimelong 300대+ 배치. 미국 시장 공식 진출 선언. UK APC2026 유럽 진출. A3 Ultra 51 DOF 8시간. 중국 휴머노이드 시장 95%+ 지배.',
  '{"source":"Agibot 공식 / IDC / Robotics & Automation News","sourceUrl":"https://www.agibot.com/article/231/detail/82.html","reliability":"A","region":"china"}'::jsonb,
  false, '2026-10-12'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-12'::timestamp,
    next_review = '2026-10-19'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Tesla Optimus: 양산 진행률 업데이트
UPDATE ci_values
SET value = 'Fremont 주 수백 대 생산(Q2 대비 10배↑). Model S/X 라인 → Optimus 전용 전환. Giga Texas 2세대 라인(연 100만 대) 설치 중. V3 미공개. 외부 판매 미개시.',
    confidence = 'B',
    source = 'Electrek / SEC 10-Q FY2026',
    source_url = 'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
    source_date = '2026-10-12',
    last_verified = '2026-10-12'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%')
    LIMIT 1
  );

-- Apptronik Apollo: 펀딩 + 제품 업데이트
UPDATE ci_values
SET value = 'Apollo 2 출시(7월). $520M 시리즈A($5B), 누적 ~$935M. Google DeepMind Gemini Robotics 파트너십. Robot Park 데이터 수집 시설. Mercedes-Benz/GXO/Jabil 파트너.',
    confidence = 'A',
    source = 'CNBC / The Robot Report',
    source_url = 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    source_date = '2026-10-12',
    last_verified = '2026-10-12'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%')
    LIMIT 1
  );

-- 1X NEO: 양산/가격 업데이트
UPDATE ci_values
SET value = 'Hayward 공장(4/30). 초년도 10K대, 2027 100K+ 목표. $20K EA / $499/월 구독. EQT 10K대 약정. 25-DOF 텐던 핸드(7/9).',
    confidence = 'B',
    source = 'The Next Web / eWeek',
    source_url = 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    source_date = '2026-10-12',
    last_verified = '2026-10-12'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%가격%')
    LIMIT 1
  );


COMMIT;
