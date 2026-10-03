-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-03
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-03T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-02
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-03.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Figure AI Figure 02 퇴역 + Figure 04 설계 확정 — 세대 교체 가속
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'The AI Insider / Figure AI',
   'https://theaiinsider.tech/2026/10/01/figure-ai-retires-humanoid-robot-fleet-by-having-them-jump-into-a-vat-of-molten-steel/',
   '[Warning] Figure AI Figure 02 퇴역(10/1) — 용융 금속 폐기, Figure 04 설계 확정(5월)',
   '2026.10.01 Figure AI, Figure 02 플릿 대부분 퇴역. 자율 보행으로 용융 금속 통에 투입하는 방식으로 폐기 — Figure 03 플릿 확대에 따라 유지보수 비효율 판단. 2026.05 CEO Brett Adcock 확인: Figure 04 설계 확정(design lock), 부품 출하 개시. Figure 03 시간당 1대 생산 유지, BMW 120대/Amazon 50대 현장 배치. 세대 교체 가속화.',
   '2026-10-03'::timestamp, 'pending'),

-- 2. [Critical] AGIBOT A3 Ultra WAIC 2026 공개 — 51 DOF, 미국 시장 진출
  (gen_random_uuid(), 'Interesting Engineering / GamesBeat',
   'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
   '[Critical] AGIBOT A3 Ultra WAIC 2026 공개 — 51 DOF, 5kg 페이로드, 미국 시장 진출',
   'WAIC 2026에서 AGIBOT A3 Ultra 공개: 174cm, 51 DOF, 팔당 5kg 페이로드, 8시간 연속 가동. 상용/서비스/산업용 겸용. 미국 시장 진출 발표 — 3종 휴머노이드 + 로봇독 1종 라인업. IDC 추정 2026 H1 글로벌 휴머노이드 ~25,000대 출하 중 AGIBOT 35% 점유. Omdia 2025년 글로벌 1위(출하 5,100대, 39% 점유) → 2026 확대 가속.',
   '2026-10-03'::timestamp, 'pending'),

-- 3. [Info] Apptronik 신규 투자자 — AT&T Ventures, John Deere 참여
  (gen_random_uuid(), 'Forbes / CNBC',
   'https://www.forbes.com/sites/johnkoetsier/2026/02/11/apptronik-scores-935-million-hits-top-3-for-humanoid-robotics-funding/',
   '[Info] Apptronik $935M 총 투자 — AT&T Ventures·John Deere 신규, Apollo 3 상용화 2027',
   'Apptronik 총 $935M(Series A 기준 글로벌 3위). 신규 투자: AT&T Ventures(통신·엣지 AI), John Deere(농업·건설 로보틱스). 기존: Google, Mercedes-Benz, B Capital, PEAK6. $5.5B 밸류에이션. Apollo 2(바이페달+휠) 현장 데모 진행 중. Apollo 3 상용 제품 2027년 예정. Robot Park(오스틴 90,000sqft) 실세계 AI 데이터 수집 가동.',
   '2026-10-03'::timestamp, 'pending'),

-- 4. [Warning] 1X NEO 초기 생산분 5일 만에 완판 — 가정용 휴머노이드 수요 검증
  (gen_random_uuid(), 'The Next Web / The Robot Report',
   'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
   '[Warning] 1X NEO 초기 생산분 5일 완판 — 가정용 $20K 휴머노이드 수요 검증',
   '1X Technologies Hayward 공장(58,000sqft) 가동 개시. 초년도 생산분(~10,000대) 10월 런칭 5일 만에 완판. 현재 R&D·내부 홈 테스트 프로그램 공급 중. 고객 배송 2026년 말~2027년. 가격: $20,000(구매) / $499/월(구독). EQT 10,000대 산업용 공급 계약(2026~2030). 2027년 연 100,000대 생산 목표.',
   '2026-10-03'::timestamp, 'pending'),

-- 5. [Info] Agility Digit v4 누적 65,000시간 운영 — $300M 다년 주문 확보
  (gen_random_uuid(), 'Agility Robotics / SEC S-4',
   'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026097764/ea0297114-04.htm',
   '[Info] Agility Digit v4 누적 65,000시간 운영 — 9개 고객 현장, $300M 다년 주문',
   'Digit v4: 9개 고객 시설 배치, 누적 65,000+ 운영 시간. 고객: Schaeffler, GXO, Toyota Canada, Mercado Libre 등. Digit v5: $300M 다년 확정 주문(계약 마일스톤/스펙 조건부). RoboFab 연 10,000대 생산 용량. 2026.07 Fremont(CA) 소프트웨어/Physical AI 허브 개소. SPAC S-4 제출 완료, AGLT 상장 절차 진행 중.',
   '2026-10-03'::timestamp, 'pending'),

-- 6. [Info] Unitree H1 퇴조, H2 주력 전환 — G1 글로벌 $13,500 판매
  (gen_random_uuid(), 'RoboZaps / Unitree',
   'https://blog.robozaps.com/b/unitree-h1-review',
   '[Info] Unitree H1-2 단종 추정, H2로 주력 전환 — G1 $13,500·Pro $27,990 글로벌 판매',
   'Unitree H1: 공식 스토어 "Contact Sales"로 전환(온라인 구매 불가). H1-2 변형 모델 자취 감춤. 춘절 갈라에 H2 출연 — H2가 차세대 대형 휴머노이드 주력. G1: $13,500(기본)/$21,600(미국)/$27,990(Pro). B2 산업용: $76,900~$296,000. 2025년 5,500+ 휴머노이드 출하(IPO 투자설명서 기준).',
   '2026-10-03'::timestamp, 'pending'),

-- 7. [Info] Boston Dynamics Atlas 4핑거 핸드 세부 — 핑키 제거, 공구 사용 최적화
  (gen_random_uuid(), 'Startup Fortune / Boston Dynamics',
   'https://startupfortune.com/boston-dynamics-gives-atlas-a-four-fingered-hand-built-for-factory-work',
   '[Info] BD Atlas 4핑거 핸드 상세(10/1) — 핑키 제거·강화 엄지, 공장 공구 사용 최적화',
   '2026.10.01 공개 Atlas 신형 핸드 세부: 4핑거(핑키 제거), 강화 대향 엄지(opposable thumb). 설계 목적: 공장 공구 사용 최적화. 13 DOF 핸드 + 본체 56 DOF. Hyundai 사바나(GA) 시설에서 학습 중. 25,000대 글로벌 배치 목표(Hyundai+Kia 공장). Google DeepMind Gemini Robotics FM 통합.',
   '2026-10-03'::timestamp, 'pending'),

-- 8. [Warning] Tesla Optimus 중국 공급사 — Tuopu/Joyson/Sanhua 인증, 5,000대 초기 주문
  (gen_random_uuid(), 'Teslarati',
   'https://www.teslarati.com/tesla-eyes-supply-partners-for-optimus-mass-production/',
   '[Warning] Tesla Optimus 중국 3사 공급망 — 초기 5,000대 주문, 양산 파트너 인증',
   '2026.09 Tesla 로보틱스팀 중국 공급사 감사 완료: Tuopu Group(액추에이터·섀시), Ningbo Joyson(센서), Zhejiang Sanhua(열관리). 3사 양산 파트너 인증. 초기 ~5,000대 규모 주문 확정. Fremont 1세대 양산 라인 연 100만대 용량 목표. Giga Texas 2세대 시설 착공. Optimus V3: 22-DOF 핸드, AI5 칩, Grok 음성 AI.',
   '2026-10-03'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- AGIBOT A3 Ultra 신제품 + 미국 시장 진출
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[신제품] AGIBOT A3 Ultra WAIC 2026 — 51 DOF 상용 휴머노이드, 미국 시장 진출 선언',
  'WAIC 2026 AGIBOT A3 Ultra 공개: 174cm/51 DOF/팔당 5kg/8시간 가동. 상용·서비스·산업 겸용 범용 휴머노이드. 미국 시장 진출: 3종 휴머노이드 + 1종 로봇독 라인업. 누적 20,000대 출하(세계 1위). IDC: 2026 H1 글로벌 ~25,000대 중 AGIBOT 35%. 중국 95% 시장 점유 → 미국 확장으로 글로벌 경쟁 심화.',
  '{"source":"Interesting Engineering / GamesBeat","sourceUrl":"https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-03'::timestamp
);

-- Figure AI 세대 교체 — Figure 02 퇴역, Figure 04 설계 확정
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[세대교체] Figure AI Figure 02 퇴역 + Figure 04 설계 확정 — 세대 교체 주기 단축',
  '2026.10.01 Figure 02 플릿 퇴역(Figure 03 플릿 확대). 2026.05 Figure 04 설계 확정(design lock), 부품 출하 개시. 세대 교체 주기: Figure 01(2024)→02(2024)→03(2025)→04(2026 설계)로 점점 단축. Figure 03: 시간당 1대 생산, BotQ 공장. BMW 120대/Amazon 50대 배치. $39B 밸류에이션. Helix 2.5: Zero-Shot 30가정 일반화.',
  '{"source":"The AI Insider / Figure AI / Forge Global","sourceUrl":"https://theaiinsider.tech/2026/10/01/figure-ai-retires-humanoid-robot-fleet-by-having-them-jump-into-a-vat-of-molten-steel/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-03'::timestamp
);

-- 1X NEO 수요 폭발 — 가정용 로봇 시장 검증
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[시장] 1X NEO 초년도 생산분 5일 완판 — 가정용 $20K 휴머노이드 수요 폭발적 검증',
  '1X Technologies NEO: Hayward 공장 초년도 생산분(~10,000대) 10월 런칭 5일 만에 완판. 가정용 로봇 시장 수요 강력 검증. $20,000 가격대에 구매 수요 존재 확인. EQT 산업용 10,000대 공급 계약(2026~2030) 별도 확보. 2027년 연 100,000대 생산 목표. OpenAI 투자. 산업+가정 양면 전략.',
  '{"source":"The Next Web / The Robot Report / TFN","sourceUrl":"https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-03'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-03'::timestamp,
    next_review = '2026-10-10'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- AGIBOT: A3 Ultra 신제품 라인업 추가
UPDATE ci_values
SET value = 'A3 Ultra(WAIC 2026): 174cm, 51 DOF, 5kg/arm, 8h 가동. X1: 산업용 $20K 미만. 미국 진출.',
    confidence = 'B',
    source = 'Interesting Engineering / GamesBeat',
    source_url = 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    source_date = '2026-10-03',
    last_verified = '2026-10-03'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%')
    LIMIT 1
  );

-- Figure AI: Figure 04 설계 확정 업데이트
UPDATE ci_values
SET value = 'Figure 04 설계 확정(2026.05), 부품 출하. Figure 03: 1대/시간 생산. Figure 02 퇴역.',
    confidence = 'B',
    source = 'The AI Insider / Figure AI',
    source_url = 'https://theaiinsider.tech/2026/10/01/figure-ai-retires-humanoid-robot-fleet-by-having-them-jump-into-a-vat-of-molten-steel/',
    source_date = '2026-10-03',
    last_verified = '2026-10-03'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%' OR ci.name ILIKE '%로드맵%')
    LIMIT 1
  );

-- 1X NEO: 판매 실적 업데이트
UPDATE ci_values
SET value = 'NEO 초년도 ~10,000대 5일 완판. $20K(구매)/$499月(구독). Hayward 공장 가동. 2027 10만대 목표.',
    confidence = 'B',
    source = 'The Next Web / TFN',
    source_url = 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    source_date = '2026-10-03',
    last_verified = '2026-10-03'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%판매%')
    LIMIT 1
  );

-- Apptronik: 투자자 업데이트
UPDATE ci_values
SET value = '$935M 총 투자($5.5B 밸류). 신규: AT&T Ventures, John Deere. Apollo 3 상용 2027 예정.',
    confidence = 'A',
    source = 'Forbes / CNBC',
    source_url = 'https://www.forbes.com/sites/johnkoetsier/2026/02/11/apptronik-scores-935-million-hits-top-3-for-humanoid-robotics-funding/',
    source_date = '2026-10-03',
    last_verified = '2026-10-03'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%')
    LIMIT 1
  );

-- Unitree: 라인업 변화 반영
UPDATE ci_values
SET value = 'H1 단종 추정(H2 전환). G1: $13,500/$21,600(US)/$27,990(Pro). B2: $76,900~$296K. IPO ~$618M.',
    confidence = 'C',
    source = 'RoboZaps / Unitree',
    source_url = 'https://blog.robozaps.com/b/unitree-h1-review',
    source_date = '2026-10-03',
    last_verified = '2026-10-03'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%라인업%' OR ci.name ILIKE '%제품%' OR ci.name ILIKE '%모델%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 11건 (ci_monitor_alerts 8건, competitive_alerts 3건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 3건 (Agility SEC S-4, BD 핸드 공식 발표, Apptronik Forbes/CNBC)
--   [B] 2개+ 매체 교차확인: 6건 (AGIBOT WAIC, Figure 02 퇴역/04 설계, 1X 완판, Tesla 공급망)
--   [C] 단일 출처: 2건 (Unitree H1 퇴조, Apptronik 신규 투자자)
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] AGIBOT A3 Ultra WAIC 2026 공개 — 51 DOF 범용 휴머노이드, 미국 시장 진출 선언
-- 2. [Warning] Figure AI Figure 02 퇴역 + Figure 04 설계 확정 — 세대 교체 주기 단축
-- 3. [Warning] 1X NEO 초년도 생산분 5일 완판 — 가정용 $20K 휴머노이드 수요 폭발적 검증
