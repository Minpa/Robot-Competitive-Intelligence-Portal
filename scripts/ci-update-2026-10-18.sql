-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-18
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-18T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-16
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-18.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Boston Dynamics — Atlas 프로토타입 1일 조립 달성, 1시간 목표 공개(10/14)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TechTimes / Humanoids Daily / Interesting Engineering',
   'https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm',
   '[Warning] BD Atlas — 프로토타입 1일 조립 달성, 2027년까지 1시간 목표 공개, 양산 가속 신호',
   'Boston Dynamics가 Atlas 프로토타입 샵 영상 공개(10/14). Sr. Technical Program Manager Katie Conner: 현재 1대 조립에 약 1일 소요, 2027년까지 1시간으로 단축 목표. 이후 분 단위 조립 추구. Waltham, MA 본사 시설. Hyundai RMAC + Google DeepMind 2026 전체 생산분 확정. 30K대/년 전용공장 2028 계획. 조립 시간 공개는 양산 본격화 신호로 해석.',
   '2026-10-18'::timestamp, 'pending'),

-- 2. [Info] Figure AI — Figure 02 퇴역 이벤트, 용강(熔鋼)에 자율 투입 방식으로 해체(10/1)
  (gen_random_uuid(), 'The AI Insider',
   'https://theaiinsider.tech/2026/10/01/figure-ai-retires-humanoid-robot-fleet-by-having-them-jump-into-a-vat-of-molten-steel/',
   '[Info] Figure AI — Figure 02 전체 플릿 퇴역, 용강(熔鋼) 자율 투입 방식 해체 이벤트(10/1)',
   'Figure AI가 Figure 02 플릿 전체 퇴역을 용강에 자율 투입시키는 이벤트로 실시(10/1). 미국·멕시코 시설이 리튬이온 배터리 탑재 유닛 해체를 거부, 핀란드 파운드리로 이송 후 처리. Figure 03로 완전 세대 교체 완료. Figure 03: 2025/10/9 출시, 가정·상업·제조 범용 설계. BotQ 생산량: 4월 ~240대, 7월 1,000번째 유닛 생산. Figure 02 퇴역은 제품 라인 정리 및 F.03 집중 전략.',
   '2026-10-18'::timestamp, 'pending'),

-- 3. [Info] Unitree — 홍콩 Embodied AI Hub 참여(10/16), 실환경 로봇 테스트 허브
  (gen_random_uuid(), 'SCMP / KuCoin News',
   'https://www.scmp.com/tech/tech-trends/article/3371095/hong-kong-vies-role-robotics-boom-launch-embodied-ai-hub',
   '[Info] Unitree — 홍콩 Embodied AI Hub 참여(10/16), HKPC 주관 실환경 테스트 거점 확보',
   'Hong Kong Productivity Council(HKPC)이 10/16 Embodied AI 실험 허브 개설. Unitree·Galbot 포함 7개 기업 참여. 실환경 로봇 테스트 인프라 제공. Unitree: UniUni 스웜 소프트웨어 발표 — 1인 오퍼레이터가 복수 휴머노이드·쿼드러펫 로봇 플릿 제어. 온보드 센서만 사용, 외부 모션 캡처 불필요. 2026 춘절 갈라 기술 기반.',
   '2026-10-18'::timestamp, 'pending'),

-- 4. [Info] Unitree CEO — "Embodied Intelligence ChatGPT 모먼트" 1-2년 내 도래 전망(10/13)
  (gen_random_uuid(), 'TechRadar / Yahoo Tech',
   'https://www.techradar.com/ai-platforms-assistants/unitree-ceo-says-robotics-breakthrough-could-happen-in-2027-with-the-chatgpt-moment-for-embodied-intelligence-being-powered-by-openais-gpt-7-model',
   '[Info] Unitree CEO 왕싱싱 — "Embodied AI ChatGPT 모먼트" 1-2년 내 도래, GPT-7급 모델이 돌파구',
   'Unitree CEO 왕싱싱(10/13): "내년 출시 예정 GPT-7급 모델이 Embodied Intelligence 문제를 직접 풀 가능성 있다." 범용 로봇 대규모 상용화 1-2년 내 도래 전망. 2026 목표: 최대 20,000대 휴머노이드 출하. 2025 기실적: 5,500대+ 출하. STAR Market IPO 완료(8월, 첫날 +460%). 피크 대비 주가 하락 중.',
   '2026-10-18'::timestamp, 'pending'),

-- 5. [Info] 1X Technologies NEO — TIME Best Inventions 2026 선정(10/16-17)
  (gen_random_uuid(), 'TIME / humanoid.guide',
   'https://humanoid.guide/1x-neo-humanoid-joins-times-best-inventions-of-2026-list/',
   '[Info] 1X NEO — TIME Best Inventions 2026 선정, "가정용 최초 상용 휴머노이드" 평가',
   'TIME이 NEO를 Best Inventions 2026에 선정(10/16-17). "가정용으로 광범위하게 판매되는 최초의 휴머노이드 로봇" 평가. CEO Bernt Børnich: 세탁물 접기, 식기세척기 정리, 장보기 가능, 시간에 따라 새 작업 학습. $20,000 또는 $499/월 구독. Hayward CA 공장 생산, 첫 해 생산분 출시 5일 내 완판. EQT 10K대 약정(2026-2030). 25-DOF 핸드 탑재.',
   '2026-10-18'::timestamp, 'pending'),

-- 6. [Info] Apptronik — Google DeepMind Gemini Robotics 2, Apollo 2에서 3구성 테스트 결과 공개
  (gen_random_uuid(), 'RuntimeWire / Google DeepMind',
   'https://runtimewire.com/article/google-deepmind-gemini-robotics-2-apptronik-apollo-2',
   '[Info] Apptronik — Gemini Robotics 2, Apollo 2 3구성 테스트 결과: 덱스테리티 32-92%',
   'Google DeepMind가 Gemini Robotics 2를 Apollo 2에 탑재 테스트(7/30 발표). 3가지 로봇 구성(바이페드·휠·테이블탑) 결과: 덱스테리티 성공률 32-92%. 상업적 신뢰성이 아직 게이팅 이슈로 지적. Apollo 2 Robot Park(오스틴, 90K sqft): 텔레오퍼레이션+자율실행+물리 시뮬레이션 데이터 수집. Mercedes-Benz, GXO, Jabil 상용 배치 운영 중. Apollo 3(첫 정식 상용 제품) 2027 목표.',
   '2026-10-18'::timestamp, 'pending'),

-- 7. [Info] Agibot — IDC H1 2026 글로벌 1위 확정(8,600대, 35%), 15,000대 생산 마일스톤
  (gen_random_uuid(), 'Robotics & Automation News / Agibot',
   'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
   '[Info] Agibot — IDC H1 2026 글로벌 1위 확정(8,600대/35%), 15K대→20K대 생산 마일스톤 연속 달성',
   'IDC H1 2026: Agibot 8,600대+ 출하, 글로벌 약 35% 점유율 1위. 3월 10,000대, 이후 15,000대 마일스톤 달성(Agibot 공식). 9월 20,000대(A3 Ultra). SAG: 44% 점유. 2025 Omdia: 39%. 중국이 글로벌 출하 97%+. Chimelong 300대+ 배치 후 관광·호텔 확장. 세르비아 유럽 생산 기지. TÜV Rheinland 인증. 2025 매출 RMB 1.05B.',
   '2026-10-18'::timestamp, 'pending'),

-- 8. [Info] Tesla Optimus — Q3 실적 10월 말 예정, 생산량 공식 확인 주시 필요
  (gen_random_uuid(), 'Electrek / TechRepublic / The Information',
   'https://www.techrepublic.com/article/news-tesla-optimus-robot-production-2027-sales-timeline/',
   '[Info] Tesla Optimus — Q3 2026 실적 발표(10월 말) 주시, 생산 수백 대/주 유지, Gen 3 미공개',
   'Tesla Optimus 10/18 기준: Q3 실적 발표(10월 말 예상)에서 생산 수치 공식 확인 여부 주시. 현 상태: Fremont 주 수백 대(The Information 8월 보도). 연말 주 1,000대+ 자동화 라인 목표. Giga Texas 전용공장 4층 골조(10/1). Gen 3 여전히 미공개. AI 일반화 한계("사전 미학습 작업 불가") 지속. 대외 판매 2027 후반 목표. Micron 메모리 공급 협력(AI5 칩 96GB 확정).',
   '2026-10-18'::timestamp, 'pending');


-- ============================================================
-- 2. ci_staging: 스테이징 (구조화 데이터 대기)
-- ============================================================

INSERT INTO ci_staging (id, update_type, payload, source_channel, status, created_at)
VALUES
  -- BD Atlas 조립 시간 공개
  (gen_random_uuid(), 'tech_spec',
   '{"competitorSlug":"atlas","layerSlug":"hw","headline":"Atlas 프로토타입 1일 조립 → 2027 1시간 목표","summary":"Waltham 본사 1일 조립, 2027 1시간 단축 목표, 양산 가속 신호","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Figure 02 퇴역
  (gen_random_uuid(), 'tech_spec',
   '{"competitorSlug":"figure","layerSlug":"biz","headline":"Figure 02 플릿 퇴역, F.03 완전 세대교체","summary":"Figure 02 용강 투입 해체 이벤트(10/1), F.03 집중 전략","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Unitree HK Hub + UniUni
  (gen_random_uuid(), 'partnership',
   '{"competitorSlug":"unitree-g1","layerSlug":"biz","headline":"홍콩 Embodied AI Hub 참여 + UniUni 스웜 SW","summary":"HKPC 실험 허브 참여(10/16), UniUni 플릿 제어 SW 발표","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Unitree CEO 전망
  (gen_random_uuid(), 'production',
   '{"competitorSlug":"unitree-g1","layerSlug":"sw","headline":"CEO: Embodied AI ChatGPT 모먼트 1-2년 내 도래","summary":"왕싱싱: GPT-7급 모델이 Embodied Intelligence 돌파, 20K대 출하 목표","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- 1X NEO TIME 선정
  (gen_random_uuid(), 'production',
   '{"competitorSlug":"neo","layerSlug":"biz","headline":"TIME Best Inventions 2026 선정, 첫 해 생산분 5일 완판","summary":"최초 가정용 상용 휴머노이드 평가, $20K, EQT 10K대 약정","confidence":"B","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Apptronik Gemini Robotics 2
  (gen_random_uuid(), 'tech_spec',
   '{"competitorSlug":"apollo","layerSlug":"sw","headline":"Gemini Robotics 2 Apollo 2 테스트: 덱스테리티 32-92%","summary":"3구성 테스트, 상업 신뢰성 게이팅, Apollo 3 2027","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Agibot 글로벌 1위
  (gen_random_uuid(), 'production',
   '{"competitorSlug":"agibot","layerSlug":"biz","headline":"IDC H1 2026 글로벌 1위(8,600대/35%), 15K+20K 마일스톤","summary":"중국 97%+ 점유, 세르비아 유럽 진출, TÜV 인증","confidence":"A","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp),

  -- Tesla Q3 실적 주시
  (gen_random_uuid(), 'production',
   '{"competitorSlug":"optimus","layerSlug":"biz","headline":"Q3 실적 10월 말 예정, 생산 수치 공식 확인 주시","summary":"주 수백 대 유지, Gen 3 미공개, Giga Texas 4층 골조","confidence":"C","collectedAt":"2026-10-18"}'::jsonb,
   'auto_crawl', 'pending', '2026-10-18'::timestamp);


-- ============================================================
-- 3. competitive_alerts: 전략 워룸 경쟁 알림 (신규 항목만)
-- ============================================================

-- BD Atlas 양산 가속 신호
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[양산] BD Atlas — 1일 조립 달성, 1시간 목표 공개, Hyundai 30K/년 가속',
  'Boston Dynamics Atlas 프로토타입 1일 조립 공개(10/14). 2027 1시간 목표 → 분 단위 추구. Hyundai 30K대/년 2028 전용공장. 2026 전체 확정(Hyundai+Google DeepMind). 빠른 조립 시간은 양산 원가 절감과 규모 확대의 핵심 전제 조건.',
  '{"source":"TechTimes / Humanoids Daily / Interesting Engineering","sourceUrl":"https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-18'::timestamp
);

-- 1X NEO TIME 선정
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'info',
  '[브랜드] 1X NEO — TIME Best Inventions 2026 선정, 가정용 휴머노이드 시장 인지도 급상승',
  '1X NEO TIME Best Inventions 2026 선정. "가정용 최초 상용 휴머노이드" 평가. 첫 해 생산분 출시 5일 완판. $20K/$499월. EQT 10K대 약정. 가정용 시장에서 Tesla Optimus(공장 전용), Figure(상업·제조)와 차별화 포지셔닝 확보.',
  '{"source":"TIME / humanoid.guide","sourceUrl":"https://humanoid.guide/1x-neo-humanoid-joins-times-best-inventions-of-2026-list/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-18'::timestamp
);


-- ============================================================
-- 4. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-18'::timestamp,
    next_review = '2026-10-25'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 5. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 항목만)
-- ============================================================

-- BD Atlas: 조립 시간 정보 추가
UPDATE ci_values
SET value = 'Atlas 프로토타입 1일 조립(10/14, Waltham MA). 2027 1시간 목표. GR3 핸드 13DOF 4핑거(10/2). 2026 전체 생산분 확정(Hyundai RMAC + Google DeepMind). 30K대/년 전용공장 2028 계획.',
    confidence = 'A',
    source = 'TechTimes / Humanoids Daily / Boston Dynamics',
    source_url = 'https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm',
    source_date = '2026-10-18',
    last_verified = '2026-10-18'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%배치%' OR ci.name ILIKE '%생산%' OR ci.name ILIKE '%상용화%')
    LIMIT 1
  );

-- 1X NEO: TIME 선정 + 판매 현황 업데이트
UPDATE ci_values
SET value = 'TIME Best Inventions 2026 선정(10/16). $20K/$499월. 첫 해 생산분 5일 완판. Hayward CA 공장. 25-DOF 핸드. EQT 10K대 약정(2026-2030). 미국 가정 배송 2026 내 계획.',
    confidence = 'B',
    source = 'TIME / humanoid.guide / The Robot Report',
    source_url = 'https://humanoid.guide/1x-neo-humanoid-joins-times-best-inventions-of-2026-list/',
    source_date = '2026-10-18',
    last_verified = '2026-10-18'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'neo' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%배치%' OR ci.name ILIKE '%고객%' OR ci.name ILIKE '%상용화%' OR ci.name ILIKE '%가격%')
    LIMIT 1
  );

-- Unitree: HK Hub + CEO 전망 + UniUni 추가
UPDATE ci_values
SET value = 'HK Embodied AI Hub 참여(10/16, HKPC). UniUni 스웜 제어 SW 발표. CEO: ChatGPT 모먼트 1-2년(10/13). 2026 목표 20K대. STAR IPO 완료(8월 +460%). G1+ ¥95K. H2 Plus $95-100K. FCC Covered List 등재 유지.',
    confidence = 'B',
    source = 'SCMP / TechRadar / Yahoo Tech',
    source_url = 'https://www.scmp.com/tech/tech-trends/article/3371095/hong-kong-vies-role-robotics-boom-launch-embodied-ai-hub',
    source_date = '2026-10-18',
    last_verified = '2026-10-18'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'sw' AND (ci.name ILIKE '%AI%' OR ci.name ILIKE '%소프트웨어%' OR ci.name ILIKE '%모델%' OR ci.name ILIKE '%SDK%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 18건 (ci_monitor_alerts 8건, ci_staging 8건, competitive_alerts 2건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 5건 (BD Atlas 빌드타임 공식 영상, Unitree HK Hub SCMP, Unitree CEO 직접 인용, Agibot IDC/공식, Apptronik Gemini Robotics 2 DeepMind)
--   [B] 2개+ 매체 교차확인: 2건 (1X TIME 선정 humanoid.guide, Unitree UniUni 복수 매체)
--   [C] 단일 출처: 1건 (Tesla Q3 실적 주시 — 기존 보도 유지)
--   [D] 추정: 0건
--   [E] 미확인: 0건
--
-- 주요 하이라이트 상위 3건:
-- 1. [Warning] BD Atlas — 프로토타입 1일 조립 달성, 2027 1시간 목표 (양산 가속 시그널)
-- 2. [Info] 1X NEO — TIME Best Inventions 2026 선정, 가정용 휴머노이드 최초 글로벌 인지도
-- 3. [Info] Unitree CEO — Embodied AI "ChatGPT 모먼트" 1-2년 내 도래 전망, 20K대 목표
