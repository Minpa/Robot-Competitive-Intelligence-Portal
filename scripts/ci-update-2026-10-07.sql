-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-07
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-07T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-03
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-07.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Tesla Optimus V3 생산 수백 대/주 달성 — AI5 칩 RAM 96GB 확정, 연말 1,000대/주 목표
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Not a Tesla App / TeslaRATI / CryptoBriefing',
   'https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production',
   '[Critical] Tesla Optimus V3 생산 수백 대/주 달성 — AI5 96GB RAM 확정, 연말 1,000대/주 목표',
   'Tesla Optimus V3 생산 10배 증가: 수십 대/주 → 수백 대/주. 관리자 목표: 연말까지 자동화 라인 1,000대/주 달성. AI5 칩 RAM 조정: 10/1 Musk 72GB 발표 → 이후 96GB로 상향(LPDDR5). AI6 칩은 144GB(1/3 삭감). Musk: "메모리 대역폭이 핵심이며 총 용량 변경은 성능에 미미." V3 핸드 티저 공개: 22 DOF/핸드(V2 대비 2배), 50개 액추에이터, 생체모방 건식 구동. Giga Texas 전용 Optimus 공장: 10/1 드론 촬영 — 철골 프레임 거의 완성(6개월 만에), 2027 양산 목표.',
   '2026-10-07'::timestamp, 'pending'),

-- 2. [Info] Boston Dynamics Hyundai 30,000대/년 Atlas 공장 계획 — 2028 본격 가동
  (gen_random_uuid(), 'Neoteo / SupplyChain247 / John Koetsier',
   'https://johnkoetsier.com/?p=46677',
   '[Info] Hyundai 30,000대/년 Atlas 생산 공장 미국 내 건설 계획 — 2028 본격 가동 목표',
   'Hyundai Motor Group, 미국 내 Atlas 전용 로보틱스 공장 건설 계획 발표: 연간 30,000대 생산 용량(기존 25,000대 배치 목표 상향). 2028년 본격 가동 목표. 사바나(GA) RMAC 시설 우선 배치. 2026년 전 생산분 Hyundai RMAC + Google DeepMind 배정 완료. GR3 핸드(13 DOF, 4핑거) 산업용 공구 사용 최적화 — 공장 현장 학습 진행 중. Atlas 스펙: 56 DOF 본체, 50kg 페이로드, 2.3m 리치, -20°C~40°C 작동.',
   '2026-10-07'::timestamp, 'pending'),

-- 3. [Info] Figure AI — 로봇 수가 직원 수 초과, BMW Spartanburg 40대 배치 확대 중
  (gen_random_uuid(), 'ExplainX AI / Robot Magazine / Forge Global',
   'https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026',
   '[Info] Figure AI 로봇 수 > 직원 수 마일스톤 — BMW 40대 배치, BotQ 시간당 1대 생산 유지',
   'Figure AI 마일스톤: 사내 Figure 03 로봇 수가 직원 수를 초과. BotQ 공장: 시간당 1대 생산 유지(2026.05 달성, 120일 만에 일 1대→시간 1대). BMW Spartanburg: 40대 Figure 03 배치, 2026-2027 추가 워크스테이션 확대 예정. Helix: 온보드 실행(클라우드 비의존), NVIDIA GPU 2개/유닛. 총 투자: $1.9B, 밸류에이션: $39B. Figure 02 퇴역 완료, Figure 04 설계 확정(2026.05) 부품 출하 중.',
   '2026-10-07'::timestamp, 'pending'),

-- 4. [Critical] Unitree IPO 상세 — DeepSeek RMB 141M 전략 배정, 첫날 +487%, 시총 $53B
  (gen_random_uuid(), 'TechNode / Caixin Global / SCMP / Bloomingbit',
   'https://technode.com/2026/08/07/deepseek-takes-rmb141-million-strategic-placement-in-unitree-ipo/',
   '[Critical] Unitree IPO 실적 — DeepSeek RMB 141M 전략 배정(2.31%), 첫날 +487%, 시총 ~$53B',
   '2026.08.19 Unitree STAR Market 상장: 공모가 RMB 150.8/주, 첫날 +487%(장중 +629%), 시총 ~$53B. DeepSeek: RMB 141M(~$19.6M) 전략 배정(933,900주, 2.31% 지분) — 휴머노이드용 AI 모델 공동 개발 협약 체결. 총 $849M 조달. 개인 투자자 8,000배 초과 청약. 제품 라인업: G1/G1+/H2/R1/B2. DeepSeek "로봇 두뇌" 동맹: 대규모 언어 모델을 로봇 제어에 통합하는 공동 연구 추진.',
   '2026-10-07'::timestamp, 'pending'),

-- 5. [Info] Agility Robotics SPAC — Foxconn $200M PIPE 리드, FORT 안전 시스템 확장
  (gen_random_uuid(), 'GeekWire / The Next Web / SEC Filing',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   '[Info] Agility SPAC 상세 — Foxconn $200M PIPE 리드, FORT 안전 시스템 로봇 외부 확장(10/1)',
   'SPAC 자금 구조 상세: Churchill Capital CCXI $414M(2025.12 상장) + Foxconn 리드 PIPE $200M = 총 $620M+. Foxconn: 대만 최대 제조기업, Digit 5 양산 파트너 역할 기대. 2026.10.01 FORT Robotics 안전 시스템 확장: Digit 5 안전 아키텍처를 로봇 외부 시스템까지 통합. 고객: Schaeffler, GXO, Toyota Canada, Mercado Libre. Digit v4: 9개 시설, 65,000+ 누적 시간. Digit v5: $300M 확정 주문.',
   '2026-10-07'::timestamp, 'pending'),

-- 6. [Warning] Apptronik 기어/액추에이터 공급난 — FCC 중국 로봇 금수 여파, 원가 60%
  (gen_random_uuid(), 'Startup Fortune / TechCrunch / Apptronik',
   'https://startupfortune.com/fccs-ban-on-chinese-humanoid-robots-may-starve-the-us-firms-it-aims-to-help/',
   '[Warning] Apptronik CEO "기어 심각한 공급 부족" — FCC 중국 로봇 금수로 미국 업체 타격',
   'Apptronik CEO Jeff Cardenas 발언(10월 초): "기어 등 핵심 부품에서 심각한 공급 부족 발생. 미국 내 공급 기반이 부족." 액추에이터가 로봇 원가의 60% 차지. FCC 2026.07.28 최종 규칙: 신규 외국제 휴머노이드/사족보행 로봇 수입·판매 금지(국가안보 근거). Unitree 기존 승인 제품은 유지. 미국 업체(Apptronik/Figure/1X)는 중국 부품 의존도 높아 역풍. Robot Park(90,000sqft) 가동 중. $935M Series A, $5.5B 밸류.',
   '2026-10-07'::timestamp, 'pending'),

-- 7. [Info] 1X NEO 미국 최초 수직통합 휴머노이드 공장 — 배송 일부 2026, 일부 지연
  (gen_random_uuid(), '1X Technologies / Heise / The Robot Report',
   'https://www.1x.tech/discover/neo-factory',
   '[Info] 1X NEO Factory — 미국 최초 수직통합 고용량 휴머노이드 공장, 배송 순차 진행',
   '1X Technologies NEO Factory(Hayward, CA): 미국 최초 수직통합 고용량 휴머노이드 로봇 공장으로 공식 명명. 58,000sqft 시설, 초년도 10,000대 용량, 2027년 연 100,000대 목표. 10/28 런칭 5일 만에 전량 예약 완료(10,000대). 배송: "일부는 올해, 일부는 나중" — 현재 R&D·내부 홈 테스트 프로그램 우선 공급. 고객 배송 2026년 말~2027년. $20,000(구매)/$499月(구독). EQT 산업용 10,000대 공급 계약(2026-2030) 별도.',
   '2026-10-07'::timestamp, 'pending'),

-- 8. [Warning] Agibot × ASD 100개 소매점 X2 100대 배치 — 리테일 대규모 상업 배치
  (gen_random_uuid(), 'GitHub embodied-industry-db / RobotToday / AGIBOT',
   'https://www.agibot.com/article/231/detail/81.html',
   '[Warning] AGIBOT × ASD 100개 소매점 X2 100대 배치(9/28) — 리테일 대규모 상업 배치 개시',
   '2026.09.28 AGIBOT과 ASD(쿡웨어 제조사) 협력: X2 휴머노이드 100대를 중국 100개 소매점에 배치. 역할: 고객 인사, 제품 설명, 직원 연결 등 판매 보조. 리테일 분야 최대 규모 휴머노이드 상업 배치 사례. UK APC2026 런던 개최: 유럽 시장 진출 가속. 누적 20,000대 출하(9월). H1 2026 글로벌 출하 8,600대(IDC 기준 35% 점유). A3 Ultra: 51 DOF, 8시간 가동. 미국 진출 발표.',
   '2026-10-07'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Tesla Optimus V3 양산 가속 + AI5 칩 확정
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[양산] Tesla Optimus V3 수백 대/주 생산 — AI5 96GB 확정, 연말 1,000대/주, Giga Texas 착공',
  'Tesla Optimus V3 생산 10배 증가(수백 대/주). 연말 자동화 라인 1,000대/주 목표 → 2026 연간 50,000-100,000대 전망. AI5 칩 96GB LPDDR5 확정. Giga Texas 전용 Optimus 공장 철골 거의 완성(10/1 드론 확인). V3 핸드: 22 DOF/핸드(50 액추에이터, 건식 구동). 중국 3사 양산 파트너 인증 + 5,000대 초기 주문. 장기 연 1,000만대 목표.',
  '{"source":"Not a Tesla App / CryptoBriefing / TeslaNorth","sourceUrl":"https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-07'::timestamp
);

-- Unitree IPO + DeepSeek 동맹
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[상장] Unitree IPO 첫날 +487% — DeepSeek RMB 141M 전략 투자, 시총 $53B, 로봇 AI 공동 개발',
  'Unitree 2026.08.19 STAR Market 상장: 공모가 RMB 150.8, 첫날 +487%, 시총 ~$53B. DeepSeek: RMB 141M 전략 배정(2.31%), 휴머노이드용 AI 모델 공동 개발 협약. "로봇 두뇌" 동맹 — 중국 AI 선두 기업과 로봇 선두 기업의 결합. 개인 투자자 8,000배 초과 청약. 2025년 5,500+ 휴머노이드 출하. G1+: 95,000元, 6대 업그레이드.',
  '{"source":"TechNode / Caixin Global / SCMP / Bloomingbit","sourceUrl":"https://technode.com/2026/08/07/deepseek-takes-rmb141-million-strategic-placement-in-unitree-ipo/","reliability":"A","region":"china"}'::jsonb,
  false, '2026-10-07'::timestamp
);

-- FCC 중국 로봇 금수 → 미국 업체 공급난
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[규제] FCC 중국 로봇 금수 여파 — 미국 업체 기어/액추에이터 공급난, 원가 60% 타격',
  'Apptronik CEO: "기어 심각한 부족, 미국 공급 기반 미흡." 액추에이터 = 로봇 원가 60%. FCC 2026.07.28 규칙: 외국제 휴머노이드/사족보행 수입 금지. Unitree 기존 승인 제품은 유지되나 신규 수입 불가. 미국 업체(Apptronik/Figure/1X) 중국 부품 의존도 높아 역풍. 중국 업체는 내수 95% 점유로 영향 제한적. 미국 로봇 산업 supply chain 재편 불가피.',
  '{"source":"Startup Fortune / NBC / Forbes / TechCrunch","sourceUrl":"https://startupfortune.com/fccs-ban-on-chinese-humanoid-robots-may-starve-the-us-firms-it-aims-to-help/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-07'::timestamp
);

-- Agibot 리테일 대규모 배치
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'warning',
  '[배치] AGIBOT × ASD 100개 소매점 X2 100대 — 리테일 분야 최대 규모 휴머노이드 상업 배치',
  'AGIBOT과 ASD(쿡웨어) 100개 소매점에 X2 100대 배치(9/28). 판매 보조(인사/제품 설명/직원 연결). 리테일 분야 단일 최대 규모 휴머노이드 상업 배치. "Deployment Year One" 실현 사례 — 엔터테인먼트·호텔 넘어 소매 분야 확장. UK APC2026 런던 개최로 유럽 진출 신호. 누적 20,000대 출하. 미국 시장 진출 선언.',
  '{"source":"GitHub embodied-industry-db / RobotToday / AGIBOT","sourceUrl":"https://www.agibot.com/article/231/detail/81.html","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-07'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-07'::timestamp,
    next_review = '2026-10-14'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Tesla Optimus: 양산 속도 + AI5 칩 업데이트
UPDATE ci_values
SET value = 'V3 수백 대/주 생산(10배 증가). AI5 96GB LPDDR5 확정. 연말 1,000대/주 목표. Giga Texas 공장 철골 완성.',
    confidence = 'B',
    source = 'Not a Tesla App / CryptoBriefing / TeslaNorth',
    source_url = 'https://notateslaapp.com/news/4763/tesla-cuts-ram-on-ai5-and-ai6-chips-to-boost-production',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%')
    LIMIT 1
  );

-- Tesla Optimus: V3 핸드 스펙 업데이트
UPDATE ci_values
SET value = 'V3 핸드: 22 DOF/핸드(V2 대비 2배), 50개 액추에이터, 생체모방 건식 구동. AI5 칩 96GB.',
    confidence = 'B',
    source = 'Not a Tesla App / BeginnersinAI',
    source_url = 'https://beginnersinai.org/tesla-optimus-explained/',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%핸드%' OR ci.name ILIKE '%매니퓰%' OR ci.name ILIKE '%손%')
    LIMIT 1
  );

-- Unitree: IPO 실적 + DeepSeek 협력 업데이트
UPDATE ci_values
SET value = 'STAR Market 상장(8/19): 첫날 +487%, 시총 ~$53B. DeepSeek RMB 141M 전략 투자(2.31%), AI 공동 개발.',
    confidence = 'A',
    source = 'TechNode / Caixin Global / SCMP',
    source_url = 'https://technode.com/2026/08/07/deepseek-takes-rmb141-million-strategic-placement-in-unitree-ipo/',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%상장%' OR ci.name ILIKE '%펀딩%')
    LIMIT 1
  );

-- Boston Dynamics Atlas: 생산 공장 계획 업데이트
UPDATE ci_values
SET value = 'Hyundai 30,000대/년 Atlas 공장 미국 건설(2028 목표). 2026 전량 Hyundai/Google DeepMind 배정. GR3 13 DOF 핸드.',
    confidence = 'A',
    source = 'Neoteo / John Koetsier / SupplyChain247',
    source_url = 'https://johnkoetsier.com/?p=46677',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%' OR ci.name ILIKE '%생산%')
    LIMIT 1
  );

-- Apptronik: 공급망 이슈 업데이트
UPDATE ci_values
SET value = 'CEO 경고: 기어/액추에이터 심각한 공급난(원가 60%). FCC 금수 여파. $935M 투자, $5.5B 밸류.',
    confidence = 'B',
    source = 'Startup Fortune / TechCrunch',
    source_url = 'https://startupfortune.com/fccs-ban-on-chinese-humanoid-robots-may-starve-the-us-firms-it-aims-to-help/',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%공급%' OR ci.name ILIKE '%생산%' OR ci.name ILIKE '%출하%')
    LIMIT 1
  );

-- Agibot: 리테일 배치 업데이트
UPDATE ci_values
SET value = 'ASD 100개 소매점 X2 100대 배치(9/28). UK APC2026 런던 → 유럽 진출. 누적 20,000대. H1 8,600대(35% 점유).',
    confidence = 'B',
    source = 'AGIBOT / RobotToday / GitHub',
    source_url = 'https://www.agibot.com/article/231/detail/81.html',
    source_date = '2026-10-07',
    last_verified = '2026-10-07'::timestamp,
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
-- 총 수집 건수: 12건 (ci_monitor_alerts 8건, competitive_alerts 4건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 3건 (Unitree IPO SEC/거래소 공시, BD Hyundai 공장 계획, Agility SEC S-4)
--   [B] 2개+ 매체 교차확인: 7건 (Tesla 양산 속도/AI5 칩, FCC 금수 여파, Agibot ASD 배치, Figure AI 마일스톤)
--   [C] 단일 출처: 2건 (Apptronik CEO 발언, 1X NEO Factory 명칭)
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Tesla Optimus V3 수백 대/주 생산 달성 — AI5 96GB 확정, 연말 1,000대/주 목표
-- 2. [Critical] Unitree IPO 첫날 +487% — DeepSeek RMB 141M 전략 투자, 시총 $53B, AI 공동 개발
-- 3. [Warning] FCC 중국 로봇 금수 여파 — 미국 업체 기어/액추에이터 공급난 심화 (원가 60%)
