-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-13
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-13T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-12
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-13.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Info] Tesla Optimus — Samsung 2nm AI5 칩 생산 개시, 학습 데이터 100만 시간 돌파 추정
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TechRepublic / Basenor / Electrek',
   'https://www.techrepublic.com/article/news-tesla-optimus-robot-production-2027-sales-timeline/',
   '[Info] Tesla Optimus — Samsung 2nm AI5 칩 9월 생산 개시, 학습 데이터 100만 시간 돌파 추정',
   'Samsung 2nm AI5 칩 9월 생산 개시(FSD+Optimus 공용). Basenor: 학습 데이터 9월 말 500K+ 시간 → 10월 초 100만 시간 돌파 추정. 중국 희토류 자석 수출 금지로 프로그램 수개월 지연. Musk: 로봇 핸드 제작이 매우 어렵다고 인정. 2027년 공개 판매 목표 유지. Gen 3 공식 미공개(10/13 현재).',
   '2026-10-13'::timestamp, 'pending'),

-- 2. [Warning] Boston Dynamics Atlas — 신규 4핑거 핸드(13 DOF) 공개, 촉각 센서 고밀도 탑재
  (gen_random_uuid(), 'Robotics & Automation News / Boston Dynamics',
   'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
   '[Warning] BD Atlas 신규 4핑거 핸드 공개(10/2) — 13 DOF, 직접 구동, 고밀도 촉각 압력 센서',
   'BD 10/2 공개: Atlas용 신규 핸드 — 4 DOF 대향 엄지 포함 13 DOF. 직접 구동(direct actuation) 방식. 손끝·손바닥 전체에 고밀도 촉각 압력 센서. 이전 핸드 대비 조작 정밀도 대폭 향상. 페이로드 50kg(110 lbs), 도달 범위 7.5 ft, -20~40°C 작동, 자율/텔레오퍼레이션/태블릿 제어 지원.',
   '2026-10-13'::timestamp, 'pending'),

-- 3. [Info] Figure AI — Helix 2.5 공개(9/17), 미지 가정환경 대응 AI 확장
  (gen_random_uuid(), 'TIME / Figure AI / AI Insider',
   'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
   '[Info] Figure AI Helix 2.5 공개(9/17) — 미지 가정환경 대응 AI, 350+ Figure 03 납품(4월 기준)',
   'Helix 2.5(9/17): Figure의 자체 AI — 처음 보는 가정환경에서도 작동하도록 확장. Figure 03 하드웨어 기반. 4월 기준 350+ Figure 03 납품. 1차 패스 수율 80%+. 밸류에이션 ~$39B(미확인). $1B 신규 투자금 중 상당 부분을 1인칭 영상 데이터 수집 인력 고용에 사용. BMW Spartanburg 물류 시퀀싱 파일럿 진행 중.',
   '2026-10-13'::timestamp, 'pending'),

-- 4. [Warning] Unitree — H2 플래그십 전환, G1+ 발표, 일본항공 하네다 G1 시범운영
  (gen_random_uuid(), 'The Standard HK / TechStoriess / RoboZaps',
   'https://thestandard.com.hk/innovation/article/345248/Unitrees-Wang-Xingxing-sees-tipping-point-for-embodied-robots-mass-commercial-adoption-within-12-years',
   '[Warning] Unitree — H2 플래그십 전환, G1+ 발표, JAL 하네다 G1 시범, 자체 인체형 AI 강화',
   'Wang Xingxing(2026 WRC): 구현 로봇 대량 상용화 1~2년 내 전환점. H1→H2 대체 진행(H1 EoL 미확인, 7월까지 목록 유지). G1+ 업그레이드 발표. JAL 하네다공항 G1 수하물 처리 시범(5월~). 2/2026 G1 Altay 장거리 자율 보행 완주. 수정 H1: 10m/s 최고 속도(4월, 계측 오차 가능). H2 가격 $29,900~$40,900(출처별 상이). 왕: 공장 배치 보류 — 처리량이 아직 인간 미달.',
   '2026-10-13'::timestamp, 'pending'),

-- 5. [Info] Agility — Digit 5 교체형 엔드이펙터, BOM $125K, EU/UK CE 인증 추진
  (gen_random_uuid(), 'Agility Robotics / SEC S-4/A / Robotics & Automation News',
   'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
   '[Info] Agility Digit 5 — 교체형 엔드이펙터, 페이로드 40%↑, BOM $125K, 2027 EU/UK CE 인증',
   'Digit 5(9/17): 교체형 엔드이펙터(interchangeable end effectors), 페이로드 40% 증가, 고속 자율 충전, 신규 안전 아키텍처 — 물리적 안전 장벽 없이 인간 근접 작업 설계. SEC S-4/A: 전략 파트너 H1 2027 → 일반 판매 2027 말, EU/UK CE 인증 추진 2027. Digit V4 BOM ~$125,000. Mercado Libre 신규 고객.',
   '2026-10-13'::timestamp, 'pending'),

-- 6. [Info] Apptronik — John Deere·QIA·AT&T 신규 투자자, $80K/년 타겟 가격
  (gen_random_uuid(), 'CNBC / Bloomberg / Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
   '[Info] Apptronik — John Deere·QIA·AT&T Ventures 합류, $80K/년 타겟, Robot Park 90K sqft',
   '$520M 시리즈A-X: John Deere, Qatar Investment Authority, AT&T Ventures 신규 합류. Bloomberg: 밸류에이션 $5.5B+(CNBC $5B과 상이). Howard Morgan(B Capital): 2027 $1B 주문 기대, 고용량 배송 시 로봇당 ~$80K/년 목표. Robot Park(6/30 개장): 90,000 sqft, Apollo 2 바이페드+휠 듀얼 구성 공개. Google DeepMind Gemini Robotics 학습 데이터 수집 전용 시설.',
   '2026-10-13'::timestamp, 'pending'),

-- 7. [Info] 1X NEO — World Model Lab 발족, VR 텔레오퍼레이션 "Expert Mode" 논란
  (gen_random_uuid(), 'eWeek / The Next Web / DEV Community',
   'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
   '[Info] 1X NEO — World Model Lab 발족(6월), Expert Mode VR 텔레오퍼레이션 자율성 논란',
   '6월 World Model Lab 발족: 영상 기반 구현 AI 모델 학습 전용 연구소. Expert Mode: VR 헤드셋으로 원격 조종 — 진정한 자율성 여부 및 프라이버시 우려 제기. CEO Børnich(6/24): 개발자 NEO 배송 가속 발표. $20K Early Access 또는 $499/월 — 10월 현재 실제 가정 배송 독립 검증 미완료. 2027 말 연 100K+ 생산 목표.',
   '2026-10-13'::timestamp, 'pending'),

-- 8. [Warning] Agibot — 유럽 첫 양산기지 세르비아 개소, TÜV 인증, GE-Act 2.0 오픈소스
  (gen_random_uuid(), 'Agibot 공식 / IntelligentCIO / Humanoids Daily',
   'https://www.agibot.com/article/231/detail/63.html',
   '[Warning] Agibot — Minth Group 합작 유럽 첫 양산기지(세르비아 Šabac), TÜV 인증, GE-Act 2.0 공개',
   '9월: Minth Group과 Šabac(세르비아) 유럽 최초 휴머노이드 양산기지 개소. IFA 2026에서 TÜV Rheinland 핵심 안전 인증 취득. GE-Act 2.0 네이티브 World-Action Model 오픈소스 공개(9월). 제품 라인업 확장: A2 시리즈(리셉션/가이드), X2 시리즈(엔터테인먼트/교육/연구). 7/28 FCC 규정 강화 — 중국 제조 장비 일부 미국 판매 제한. 누적 20,000대(9/24).',
   '2026-10-13'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- BD Atlas 핸드 기술 돌파
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[기술] BD Atlas 13-DOF 4핑거 핸드 공개 — 직접 구동+고밀도 촉각, 조작 정밀도 도약',
  'BD 10/2: Atlas 신규 핸드 — 4-DOF 대향 엄지 포함 13 DOF, 직접 구동, 손끝·손바닥 고밀도 촉각 압력 센서. 기존 핸드 대비 조작 정밀도 대폭 향상. 산업용 다관절 그리핑 경쟁력 강화. LG 핸드 전략에 대한 벤치마크 갱신 필요.',
  '{"source":"Robotics & Automation News / Boston Dynamics","sourceUrl":"https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-13'::timestamp
);

-- Figure AI Helix 2.5 가정환경 AI 확장
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'info',
  '[AI] Figure AI Helix 2.5 — 미지 가정환경 대응 AI 확장, 홈로봇 시장 진입 신호',
  'Figure AI Helix 2.5(9/17): 처음 보는 가정환경에서도 작동하는 AI 업데이트. 기존 산업용(BMW) → 가정용 시장 확대 전략. 350+ Figure 03 납품. 밸류에이션 ~$39B. $1B 투자금으로 1인칭 영상 데이터 수집 인력 대규모 고용. 1X NEO와 함께 가정용 로봇 시장 경쟁 가속.',
  '{"source":"TIME / Figure AI","sourceUrl":"https://time.com/7324233/figure-03-robot-humanoid-reveal/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-13'::timestamp
);

-- Agibot 유럽 양산기지 + 인증
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[글로벌] Agibot 유럽 첫 양산기지(세르비아) + TÜV 인증 — 유럽 시장 본격 공략',
  'Agibot: Minth Group과 세르비아 Šabac에 유럽 최초 휴머노이드 양산기지 개소. IFA 2026에서 TÜV Rheinland 핵심 안전 인증 취득. GE-Act 2.0 World-Action Model 오픈소스 공개. FCC 규정 강화로 미국 시장 일부 제한 예상 → 유럽 우회 전략 가능성. 누적 20K대, IDC H1 글로벌 35%.',
  '{"source":"Agibot 공식 / IntelligentCIO / IFA 2026","sourceUrl":"https://www.agibot.com/article/231/detail/63.html","reliability":"A","region":"europe"}'::jsonb,
  false, '2026-10-13'::timestamp
);

-- Unitree H2 플래그십 전환
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'score_spike', 'info',
  '[제품] Unitree H1→H2 플래그십 전환, G1+ 업그레이드, JAL 하네다 G1 시범',
  'Unitree: H1→H2 대체 진행. G1+ 업그레이드 발표. JAL 하네다공항 G1 수하물 처리 시범(5월~). Wang Xingxing: 구현 로봇 대량 상용화 전환점 1~2년 내. 그러나 공장 배치 보류 — 로봇 처리량이 인간 수준 미달. Nvidia GR00T H2 Plus 10월 출시 예정.',
  '{"source":"The Standard HK / TechStoriess / humanoid.guide","sourceUrl":"https://thestandard.com.hk/innovation/article/345248/","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-13'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-13'::timestamp,
    next_review = '2026-10-20'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- BD Atlas: 핸드 스펙 업데이트
UPDATE ci_values
SET value = '신규 4핑거 핸드(10/2): 13 DOF(4-DOF 대향 엄지), 직접 구동, 고밀도 촉각 압력 센서(손끝+손바닥). 페이로드 50kg, 도달 7.5ft, -20~40°C. 2026 전량 배치 확정(Hyundai RMAC + Google DeepMind). 연 30K대 전용 공장 2028.',
    confidence = 'A',
    source = 'Robotics & Automation News / Boston Dynamics',
    source_url = 'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
    source_date = '2026-10-13',
    last_verified = '2026-10-13'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR slug ILIKE '%boston%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%핸드%' OR ci.name ILIKE '%그리퍼%' OR ci.name ILIKE '%매니퓰%')
    LIMIT 1
  );

-- Agibot: 유럽 양산 + 인증 업데이트
UPDATE ci_values
SET value = '유럽 첫 양산기지(세르비아 Šabac, Minth Group 합작). TÜV Rheinland 핵심 안전 인증 취득(IFA 2026). GE-Act 2.0 World-Action Model 오픈소스. 누적 20K대(9/24). IDC H1 글로벌 35%. A2(리셉션), X2(교육), G2(산업), A3(스포츠).',
    confidence = 'A',
    source = 'Agibot 공식 / IntelligentCIO',
    source_url = 'https://www.agibot.com/article/231/detail/63.html',
    source_date = '2026-10-13',
    last_verified = '2026-10-13'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%인증%' OR ci.name ILIKE '%생산%')
    LIMIT 1
  );

-- Figure AI: AI 역량 업데이트
UPDATE ci_values
SET value = 'Helix 2.5(9/17): 미지 가정환경 대응 AI 확장. Figure 03 기반. 350+ 납품(4월). BotQ 시간당 1대. BMW 1,250+ 런타임, 90K+ 부품 적재. Nvidia $1B 추가 투자 협상 중. 밸류에이션 ~$39B(미확인).',
    confidence = 'B',
    source = 'TIME / Figure AI / AI Insider',
    source_url = 'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
    source_date = '2026-10-13',
    last_verified = '2026-10-13'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'sw' AND (ci.name ILIKE '%AI%' OR ci.name ILIKE '%모델%' OR ci.name ILIKE '%소프트웨어%')
    LIMIT 1
  );


COMMIT;
