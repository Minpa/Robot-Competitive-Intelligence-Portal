-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-16
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-16T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-10-15
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-16.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Agibot — RMB 50B 밸류에이션 신규 라운드 임박, 홍콩 IPO 2027 연기
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TechNode / 36Kr / Caijing',
   'https://technode.com/2026/10/14/robot-maker-agibot-nears-new-funding-round-at-rmb-50-billion-valuation/',
   '[Critical] Agibot — RMB 50B(~$7B) 밸류에이션 신규 펀딩 라운드 임박, 홍콩 IPO 2027 연기',
   'Caijing 보도(10/14): Agibot(智元机器人) RMB 1-1.5B 신규 라운드, 밸류에이션 RMB 50B(~$7B). 투자자: 프리IPO 투자로 120일 쿨링 필요 → 연말 IPO 불가, 2027년 연기. 36Kr: 홍콩 증시 상장 계획 일시 중단. 누적 생산 20,000대(9/24 기준). 2025 매출 RMB 1.05B. Omdia FY2025: 시장점유율 39%(1위). IDC H1 2026: 35%, SAG H1: 44%.',
   '2026-10-16'::timestamp, 'pending'),

-- 2. [Warning] Agibot — 말레이시아 PM 면담 후 RM1B 투자 약정, 글로벌 확장 가속
  (gen_random_uuid(), 'The Star Malaysia',
   'https://www.thestar.com.my/news/nation/2026/10/05/agibot-pledges-potential-rm1bil-investment-after-pm-anwar-meeting',
   '[Warning] Agibot — 말레이시아 RM1B(~$230M) 투자 약정, PM Anwar 면담 후 전략적 협력 합의',
   'Agibot, 말레이시아 PM Anwar 면담(10/5) 후 RM1B(~$230M) 잠재 투자 약정. 휴머노이드 로봇 및 전략적 협력 논의. 동남아 시장 거점 확보 전략. Minth Group과 세르비아 Šabac에 유럽 최초 휴머노이드 대량생산 기지 개설(€20M 초기 라인). IFA 2026 베를린: TÜV Rheinland 안전인증 획득, Tekpoint 유통 파트너십. 01.AI(이카이푸)와 전략적 파트너십 체결.',
   '2026-10-16'::timestamp, 'pending'),

-- 3. [Warning] NVIDIA — Figure AI $1B 추가 투자 협상 보도, 밸류에이션 $39B+ 전망
  (gen_random_uuid(), 'TechTimes',
   'https://techtimes.com/articles/328801/20261013/nvidias-reported-1b-figure-ai-investment-prices-startup-above-goldman-sachs-2035-humanoid-market.htm',
   '[Warning] NVIDIA-Figure AI $1B 추가 투자 협상 보도 — 밸류에이션 Goldman Sachs 2035 시장 전망 상회',
   'TechTimes(10/13): NVIDIA가 Figure AI에 $1B 추가 투자 협상 중. 현재 밸류에이션 $39B(Series C, 2025/9). Goldman Sachs 2035년 휴머노이드 시장 전망을 단일 기업이 상회. NVIDIA는 이미 Figure+Nscale 양사 투자자. Nscale $3.5B 컴퓨트 계약(Vera Rubin GPU 10만개). NVIDIA·Figure 모두 공식 확인 않음.',
   '2026-10-16'::timestamp, 'pending'),

-- 4. [Info] Agility — Nyobolt 배터리 파트너십(10/15), Digit 5 연속 20시간+ 운영 목표
  (gen_random_uuid(), 'Unite.AI / The Robot Report / Agility Robotics',
   'https://www.unite.ai/nyobolt-batteries-to-power-agility-robotics-digit-5-humanoid-robot/',
   '[Info] Agility-Nyobolt — Digit 5 배터리 파트너십 발표(10/15), 일 20시간+ 연속 운영 목표',
   'Agility Robotics(10/15): Nyobolt(Cambridge, UK) 고출력 초고속 충전 배터리 기술 Digit 5 탑재 확정. 일 20시간+ 연속 운영 목표. Nyobolt: 니오비움 음극+유기 양극 기술, 6분 충전. Digit 5(9/15 공개): 안전 울타리 불필요 협업로봇, $300M+ 주문, 65K+ 운영시간. SPAC(CCXI) 주주투표 11/2 확정. RoboFab 연 10K대 용량.',
   '2026-10-16'::timestamp, 'pending'),

-- 5. [Info] Unitree — G1+ 업그레이드 출시(¥95K), AGT 결승 진출, JAL 하네다 시범
  (gen_random_uuid(), 'The Standard HK / humanoidmegahub / The Standard HK',
   'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
   '[Info] Unitree G1+ — 6대 업그레이드 출시(¥95K), AGT 결승, JAL 하네다 공항 시범 운영',
   'Unitree G1+ 출시: 모션·인지·상호작용 6대 업그레이드. 가격 ¥95,000(세금 포함, 기존 G1 ¥85,000). AGT(Americas Got Talent) 결승 진출(8대 G1+우유페이). JAL+GMO AI&Robotics: 하네다 공항 수하물·화물·객실 청소 시범(2028까지). CEO 왕싱싱: 범용 로봇 대규모 상용화 1-2년 내 도래 전망. STAR Market IPO 승인.',
   '2026-10-16'::timestamp, 'pending'),

-- 6. [Info] Tesla Optimus — Electrek: 양산 가속 vs AI 일반화 문제 병존(9/25 분석)
  (gen_random_uuid(), 'Electrek / The Information / Tesery',
   'https://electrek.co/2026/09/25/tesla-optimus-production-ramp-hands-ai-generalization-problems/',
   '[Info] Tesla Optimus — 주 수백 대 양산 도달, Model S/X 단종 후 Fremont 전환, AI 일반화 한계',
   'Electrek(9/25): Tesla Optimus 주 수백 대(Q2 수십 대→8월 수백 대, The Information). Model S/X 생산 종료, Fremont 라인 Optimus 전환. 내부 목표: 연말 주 1,000대+ 자동화 생산라인. 한계: "일반화 불가" — 사전 학습되지 않은 작업 수행 못함. 중국 공급업체 부품 인증 진행(Teslarati). 대외 판매 2027 후반 목표(Musk).',
   '2026-10-16'::timestamp, 'pending'),

-- 7. [Info] Boston Dynamics — 10/16 기준 신규 업데이트 없음, GR3 핸드(10/2) + RMAC(9/30) 상태 유지
  (gen_random_uuid(), 'Boston Dynamics / Robotics & Automation News',
   'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
   '[Info] BD Atlas — 10/16 신규 업데이트 없음, GR3 핸드(10/2) 적용 진행, RMAC(9/30) 산업 배치 시작',
   'BD Atlas: 10/16 기준 GR3 핸드(10/2) 이후 신규 발표 없음. 현 상태: GR3 13DOF 4핑거 핸드 + 촉각센서 → 도구 조작 역량 강화. RMAC(9/30 개장) 내 산업 배치 시작. 2026 전체 생산분 확정(Hyundai+Google DeepMind). 30K대/년 전용공장 2028 계획 유지. Google DeepMind Gemini 기반 AI 학습.',
   '2026-10-16'::timestamp, 'pending'),

-- 8. [Info] Apptronik / 1X — 10/16 기준 주요 신규 업데이트 없음
  (gen_random_uuid(), 'The Robot Report / Forbes / eWeek',
   'https://apptronik.com/company/in-the-news',
   '[Info] Apptronik/1X — 10/16 신규 업데이트 없음, 기존 상태 유지',
   'Apptronik: Jabil 제조 속도 논의(10/8) 이후 신규 발표 없음. Apollo 2 듀얼 구성 운용, Robot Park 학습 데이터 수집 계속. $935M 누적, $5B 밸류. 1X Technologies: 10월 신규 발표 없음. Hayward 공장 생산 중, 연말 미국 가정 배송 계획 유지. $20K/$499월. EQT 10K대 약정.',
   '2026-10-16'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- Agibot RMB 50B 밸류에이션 신규 라운드
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[자금] Agibot — RMB 50B(~$7B) 밸류에이션 신규 라운드 임박, 홍콩 IPO 2027 연기',
  'Caijing(10/14): Agibot RMB 1-1.5B 신규 라운드, 밸류에이션 RMB 50B(~$7B). 프리IPO 120일 쿨링 → 연말 IPO 불가, 2027 연기. 36Kr: 홍콩 상장 일시 중단. 누적 20K대(9/24). 2025 매출 RMB 1.05B. 시장점유율 1위(IDC 35%, SAG 44%). 말레이시아 RM1B 투자 약정(10/5). 세르비아 유럽 공장 가동.',
  '{"source":"TechNode / 36Kr / Caijing","sourceUrl":"https://technode.com/2026/10/14/robot-maker-agibot-nears-new-funding-round-at-rmb-50-billion-valuation/","reliability":"B","region":"china"}'::jsonb,
  false, '2026-10-16'::timestamp
);

-- NVIDIA-Figure AI $1B 추가 투자 협상
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'warning',
  '[자금] NVIDIA-Figure AI $1B 추가 투자 협상 — 밸류에이션 $39B, 휴머노이드 AI 투자 집중',
  'TechTimes(10/13): NVIDIA $1B Figure AI 추가 투자 협상. 현재 $39B(Series C 2025/9). Goldman Sachs 2035 시장 전망 상회. NVIDIA: Figure+Nscale 양사 투자자. Nscale $3.5B+ 컴퓨트 계약(Vera Rubin 10만 GPU). 양사 미확인. 원형 금융(circular deal) 우려.',
  '{"source":"TechTimes","sourceUrl":"https://techtimes.com/articles/328801/20261013/nvidias-reported-1b-figure-ai-investment-prices-startup-above-goldman-sachs-2035-humanoid-market.htm","reliability":"C","region":"north_america"}'::jsonb,
  false, '2026-10-16'::timestamp
);

-- Agility Nyobolt 배터리 파트너십
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'info',
  '[파트너십] Agility-Nyobolt — Digit 5 배터리 기술 파트너십, 일 20시간+ 운영 목표',
  'Agility(10/15): Nyobolt 고출력 초고속 충전 배터리 Digit 5 탑재. 니오비움 음극+유기 양극, 6분 충전. 일 20시간+ 연속 운영. Digit 5 $300M+ 주문, 안전 울타리 불필요. RoboFab 연 10K대. SPAC 주주투표 11/2.',
  '{"source":"Unite.AI / The Robot Report / Agility Robotics","sourceUrl":"https://www.unite.ai/nyobolt-batteries-to-power-agility-robotics-digit-5-humanoid-robot/","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-16'::timestamp
);

-- Agibot 글로벌 확장 (말레이시아 + 세르비아 + TÜV)
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[글로벌] Agibot — 말레이시아 RM1B, 세르비아 유럽 공장, TÜV 인증, 01.AI 파트너십',
  '10월 글로벌 확장: 말레이시아 PM Anwar 면담(10/5) → RM1B 투자 약정. Minth Group 세르비아 Šabac 유럽 최초 대량생산 기지(€20M). IFA 2026 TÜV Rheinland 안전인증. Tekpoint 유럽 유통. 01.AI 전략적 파트너십(AI 모델 협력). A3 Ultra 51DOF 8시간 운영.',
  '{"source":"TheStar / IFA / TechNode","sourceUrl":"https://www.thestar.com.my/news/nation/2026/10/05/agibot-pledges-potential-rm1bil-investment-after-pm-anwar-meeting","reliability":"B","region":"global"}'::jsonb,
  false, '2026-10-16'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

UPDATE ci_freshness
SET last_verified = '2026-10-16'::timestamp,
    next_review = '2026-10-23'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Agibot: RMB 50B 밸류에이션 + 글로벌 확장
UPDATE ci_values
SET value = 'RMB 50B(~$7B) 밸류에이션 신규 라운드 진행(Caijing 10/14). RMB 1-1.5B 조달. 홍콩 IPO 2027 연기. 누적 20K대. 2025 매출 RMB 1.05B. 말레이시아 RM1B 약정. 세르비아 유럽 공장. TÜV 인증.',
    confidence = 'B',
    source = 'TechNode / 36Kr / Caijing / TheStar',
    source_url = 'https://technode.com/2026/10/14/robot-maker-agibot-nears-new-funding-round-at-rmb-50-billion-valuation/',
    source_date = '2026-10-16',
    last_verified = '2026-10-16'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%상장%')
    LIMIT 1
  );

-- Figure AI: NVIDIA $1B 추가 투자 협상
UPDATE ci_values
SET value = 'NVIDIA $1B 추가 투자 협상(TechTimes 10/13, 미확인). 현재 $39B(Series C 2025/9). Nscale $3.5B→$6B+ 컴퓨트. F.03 350대+ 생산, 시간당 1대. Helix 2.5(9월). Catalyst Brands 리테일. F.02 퇴역.',
    confidence = 'C',
    source = 'TechTimes / Bloomberg / Interesting Engineering',
    source_url = 'https://techtimes.com/articles/328801/20261013/nvidias-reported-1b-figure-ai-investment-prices-startup-above-goldman-sachs-2035-humanoid-market.htm',
    source_date = '2026-10-16',
    last_verified = '2026-10-16'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%펀딩%' OR ci.name ILIKE '%자금%')
    LIMIT 1
  );

-- Agility: Nyobolt 배터리 파트너십 추가
UPDATE ci_values
SET value = 'Nyobolt 배터리(10/15): 니오비움 음극 초고속 충전(6분), 일 20시간+ 운영. Digit 5(9/15): 안전울타리 불필요. $300M+ 주문. SPAC S-4 유효(10/13), 투표 11/2. $620M+ 조달. 프리머니 $2.5B.',
    confidence = 'A',
    source = 'Unite.AI / The Robot Report / Agility Robotics / SEC EDGAR',
    source_url = 'https://www.unite.ai/nyobolt-batteries-to-power-agility-robotics-digit-5-humanoid-robot/',
    source_date = '2026-10-16',
    last_verified = '2026-10-16'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND (ci.name ILIKE '%배터리%' OR ci.name ILIKE '%전력%' OR ci.name ILIKE '%파워%' OR ci.name ILIKE '%에너지%')
    LIMIT 1
  );

-- Unitree: G1+ 출시 + AGT + JAL 업데이트
UPDATE ci_values
SET value = 'G1+ 출시: 6대 업그레이드(모션·인지·상호작용), ¥95K. AGT 결승. JAL 하네다 시범(2028까지). H1 $90K. H2 Plus GR00T 레퍼런스 $95-100K. STAR Market IPO 승인. 1260H+FCC 등재.',
    confidence = 'B',
    source = 'The Standard HK / humanoidmegahub / The Standard HK',
    source_url = 'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
    source_date = '2026-10-16',
    last_verified = '2026-10-16'::timestamp,
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
-- 총 수집 건수: 16건 (ci_monitor_alerts 8건, competitive_alerts 4건, ci_values 4건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 2건 (Agility-Nyobolt 공식 발표, BD Atlas 공식 블로그)
--   [B] 2개+ 매체 교차확인: 5건 (Agibot 펀딩 TechNode+36Kr+Caijing, Agibot 글로벌확장 TheStar+IFA, Unitree G1+ 복수매체, Tesla 양산 Electrek+The Information, Agibot 시장점유율 IDC+SAG)
--   [C] 단일 출처: 2건 (NVIDIA-Figure AI TechTimes, Apptronik/1X 상태유지)
--   [D] 추정: 0건
--   [E] 미확인: 0건
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] Agibot — RMB 50B(~$7B) 밸류에이션 신규 펀딩 라운드 임박, 홍콩 IPO 2027 연기 (TechNode/36Kr 10/14)
-- 2. [Warning] NVIDIA-Figure AI $1B 추가 투자 협상 보도, 밸류에이션 Goldman Sachs 2035 전망 상회 (TechTimes 10/13)
-- 3. [Warning] Agibot 글로벌 확장 — 말레이시아 RM1B, 세르비아 유럽 공장, TÜV 인증, 01.AI 파트너십
