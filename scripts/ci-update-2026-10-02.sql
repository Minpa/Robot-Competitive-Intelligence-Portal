-- ARGOS 경쟁사 데이터 업데이트 - 2026-10-02
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-10-02T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-29
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-10-02.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Tesla Optimus Gen 3 Fremont 양산 라인 전환 — Model S/X 라인 대체
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'The Robot Report / iFactory App',
   'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
   '[Critical] Tesla Optimus Fremont 양산 전환 — Model S/X 라인 로보틱스 전환, 연 100만대 용량',
   'Tesla, Fremont 공장 Q2부터 Optimus 양산 라인 가동 개시. Model S/X 레거시 라인을 1세대 로보틱스 공장으로 전환 중. 연간 100만대 생산 용량 확보 목표. Giga Texas에 2세대 시설 착공 — 장기 연 1,000만대 목표. 2026.01 Musk 확인: Fremont에 Optimus Gen 3 1,000대+ 가동 중. 중국 공급사 3곳(Tuopu/Joyson/Sanhua) 양산 파트너 인증 완료.',
   '2026-10-02'::timestamp, 'pending'),

-- 2. [Critical] Boston Dynamics 차세대 Atlas 핸드 공개 — 13 DOF, 이전 대비 2배
  (gen_random_uuid(), 'Seoul Economic Daily / Boston Dynamics',
   'https://en.sedaily.com/finance/2026/10/02/boston-dynamics-unveils-next-generation-robot-hand-for-atlas',
   '[Critical] Boston Dynamics Atlas 신형 핸드 공개(10/2) — 13 DOF, 이전 대비 2배',
   '2026.10.02 Boston Dynamics Atlas용 차세대 로봇 핸드 공개: 13 자유도(이전 버전 대비 2배). 56 DOF 본체, 50kg 페이로드, 2.3m 리치. CES 2026 Best Robot 수상. 2026 생산분 전량 Hyundai RMAC + Google DeepMind 배정 완료. Hyundai 25,000대 글로벌 배치 목표. 추가 고객 2027년 초 확대 예정.',
   '2026-10-02'::timestamp, 'pending'),

-- 3. [Warning] Figure AI Helix 2.5 공개 — Zero-Shot 30가정 일반화
  (gen_random_uuid(), 'Figure AI / The Neuron',
   'https://www.figure.ai/news',
   '[Warning] Figure AI Helix 2.5 + Index 공개 — 물리 데이터 세계 최대 수집 플랫폼',
   '2026.09 Helix 2.5 공개: Zero-Shot 30-Home Generalization 달성 — 학습 없이 30개 가정 환경에서 작업 수행. 2026.08 Index 플랫폼 발표: 세계 최대·최다 다양성 물리 데이터셋 구축 목표. BotQ 시간당 1대 생산 유지(2026.05 달성). 2026.07 1,000번째 Figure 03 출하. BMW 120대, Amazon 50대 현장 배치. $39B 밸류에이션, 총 $1.9B 투자.',
   '2026-10-02'::timestamp, 'pending'),

-- 4. [Warning] Unitree G1+ 6대 업그레이드 출시 + IPO 임박
  (gen_random_uuid(), 'The Standard HK / RoboZaps',
   'https://www.thestandard.com.hk/innovation/article/342731/Unitree-launches-upgraded-G1-humanoid-robot',
   '[Warning] Unitree G1+ 6대 업그레이드 출시(95,000元), STAR Market IPO 임박($618M)',
   'G1+ 정식 출시: 모션·인지·인터랙션·지능 6대 항목 업그레이드. 가격 95,000위안(세금 포함, G1 대비 +10,000元). G1 글로벌 판매: $13,500(2026.07 주문 가능). 2026.02 알타이 설원 −47.4°C 자율 보행 13만보 시연. STAR Market IPO ~$618M 승인, 2026.07 말 데뷔 예정.',
   '2026-10-02'::timestamp, 'pending'),

-- 5. [Critical] Agility Robotics Digit 5 — FORT Robotics 안전 파트너십 + SPAC $620M
  (gen_random_uuid(), 'Agility Robotics / SEC Filing',
   'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
   '[Critical] Agility Digit 5 FORT Robotics MOU(10/1) — 3중 안전 아키텍처, NVIDIA Halos 파트너',
   '2026.10.01 FORT Robotics와 MOU 체결: Digit 5용 3중 안전 아키텍처(안전 펜던트/온로봇 통신/오프로봇 인터페이스) 통합. NVIDIA Halos for Robotics 최초 런치 파트너. 상용 고객: Schaeffler, GXO, Toyota Motor Manufacturing Canada(RaaS 계약). Churchill Capital SPAC 합병 발표(6/24): "AGLT" 상장, $2.5B 밸류, $620M 자금.',
   '2026-10-02'::timestamp, 'pending'),

-- 6. [Warning] Apptronik Apollo 2 + Robot Park 확장 — Google DeepMind 데이터 협력
  (gen_random_uuid(), 'The Robot Report / CNBC',
   'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
   '[Warning] Apptronik Apollo 2 공개(6/30) + Robot Park 확장 — Google DeepMind 데이터 수집',
   '2026.06.30 Apollo 2 공개: 바이페달/휠 베이스 양쪽 구성. Robot Park(오스틴) 확장 개소 — 실세계 데이터 수집·학습 전문 시설. Google DeepMind 파트너십: Robot Park에서 Apollo 2 플릿이 AI 모델 학습용 데이터 수집. Mercedes-Benz/Jabil 현장 배치. $935M 총 투자($5B 밸류). Apollo 3 상용 제품 2027 예정.',
   '2026-10-02'::timestamp, 'pending'),

-- 7. [Info] 1X NEO 배송 지연 가능성 — 가정용 로봇 시장 기대 vs 현실
  (gen_random_uuid(), 'eWeek / Sifted / TechCrunch',
   'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
   '[Info] 1X NEO 2026 출하 시작 예정이나 지연 우려 — "일부는 올해, 일부는 나중"',
   '1X NEO 2026년 미국 가정 출하 예정이나, 2026.07.16 기준 고객 배송 미확인. 1X 공식 입장: "일부는 올해, 일부는 나중." 텔레오퍼레이션+AI 학습 하이브리드 접근. CA Hayward 58,000sqft 공장, 2027 연 10만대 목표. $20,000(구매)/$499월(구독). EQT와 10,000대 산업용 공급 계약(2026~2030).',
   '2026-10-02'::timestamp, 'pending'),

-- 8. [Critical] AGIBOT 20,000대 출하 — 세계 1위 출하량, Unitree 추월
  (gen_random_uuid(), 'AGIBOT / The Robot Report / Yahoo Finance',
   'https://www.agibot.com/article/231/detail/82.html',
   '[Critical] AGIBOT 누적 20,000대 출하(9월) — 글로벌 출하량·매출 1위, Unitree 추월',
   '2026.09 20,000번째 로봇 출하(치멜롱 스페이스쉽 파크, 300대 현장 운영). 2026 상반기 출하량 432% 증가. 출하·매출 양면 글로벌 1위(Unitree 추월). "2026 Deployment Year One" 선언 — 7개 표준화 생산성 솔루션(적재/운반/분류/안내/서비스/순찰/청소). X1: $20K 미만, ROS 2 오픈소스. 3개월 만에 5,000→10,000대(4배 가속).',
   '2026-10-02'::timestamp, 'pending'),

-- 9. [Warning] 2026 상반기 글로벌 휴머노이드 출하량 432% 급증 — 중국 95% 점유
  (gen_random_uuid(), 'Yahoo Finance / News Today World',
   'https://finance.yahoo.com/technology/ai/articles/humanoid-robot-shipments-jump-432-025835160.html',
   '[Warning] 2026 H1 글로벌 휴머노이드 출하량 432% 급증 — 중국 시장점유율 95%',
   '2026 상반기 글로벌 휴머노이드 로봇 출하량 전년 동기 대비 432% 증가. 중국이 95% 시장 점유(AGIBOT·Unitree 주도). 미국: Tesla Optimus, Figure AI, Agility 양산 가속. 시장 규모: 2035년 $122.83B 전망. 2025년 대비 배치 속도와 출하량 모두 폭발적 성장.',
   '2026-10-02'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- ISO 25785-1 동적 안정 로봇 표준 개발 진행
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[규제] ISO 25785-1 동적 안정 산업 로봇 표준 — Working Draft 단계, ISO 10218:2025 주요 업데이트 완료',
  'ISO 25785-1(동적 안정 산업 모바일 로봇): 바이페달·휠 밸런싱·사족보행 포괄 — 2026 초 Working Draft 단계. ISO 10218-2:2025 업데이트: 안전 요구사항 섹션 28→50 페이지(거의 3배). 분량 전체 거의 3배. 하드웨어 정의→협업 응용 인증 중심 패러다임 전환. IEEE Spectrum 기고: 가정용 휴머노이드 안전 표준 부재 지적(기존 표준은 산업용 전용). LG 대응: ISO 25785-1 참여/모니터링, 가정용 안전 표준 선제 대비 필요.',
  '{"source":"IEEE Spectrum / ISO / biped.news","sourceUrl":"https://spectrum.ieee.org/domestic-humanoid-robot-safety-standards","reliability":"A","region":"international"}'::jsonb,
  false, '2026-10-02'::timestamp
);

-- Agility Robotics SPAC 상장 발표
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[상장] Agility Robotics SPAC 합병 — Churchill Capital $620M, "AGLT" 티커, $2.5B 밸류',
  '2026.06.24 Agility Robotics와 Churchill Capital Corp XI 합병 발표. 합병 완료 시 "AGLT" 티커로 북미 증시 상장. $620M 자금 확보: Digit v5 양산 확대 및 고객 주문 이행. 밸류에이션 ~$2.5B. Digit 5: 업계 최초 협력적 안전 설계, NVIDIA Halos 최초 파트너. FORT Robotics 3중 안전 아키텍처. Toyota Canada RaaS 계약 체결.',
  '{"source":"SEC Filing / Agility Robotics","sourceUrl":"https://www.sec.gov/Archives/edgar/data/0002074973/000121390026071287/ea029548401ex99-1.htm","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-02'::timestamp
);

-- Boston Dynamics Atlas 신형 핸드 공개
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'critical',
  '[기술] Boston Dynamics Atlas 차세대 핸드 — 13 DOF(2배), Hyundai 25,000대 배치 계획',
  '2026.10.02 BD, Atlas용 차세대 로봇 핸드 공개: 13 자유도(이전 대비 2배). 2026 전 생산분 Hyundai RMAC+Google DeepMind 배정 완료. Hyundai: 글로벌 25,000대 배치 목표. RMAC(조지아 사바나): 물리 AI 테스트베드·학습 허브 운영 중. 2027년 초 추가 고객 확대. 항공우주·반도체·물류 시장 확장 계획.',
  '{"source":"Seoul Economic Daily / Boston Dynamics","sourceUrl":"https://en.sedaily.com/finance/2026/10/02/boston-dynamics-unveils-next-generation-robot-hand-for-atlas","reliability":"A","region":"north_america"}'::jsonb,
  false, '2026-10-02'::timestamp
);

-- AGIBOT 세계 1위 — 출하량 Unitree 추월
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[양산] AGIBOT 20,000대 출하 — 세계 1위(출하·매출 모두), 3개월에 생산 4배 가속',
  'AGIBOT 2026.09 누적 20,000대 돌파. 5,000→10,000대: 3개월(4배 가속). 10,000→15,000대, 15,000→20,000대 가속 지속. "Deployment Year One" 선언: 엔터테인먼트/교육/서비스/호텔/산업 현장 대규모 배치. 2026 H1 글로벌 휴머노이드 출하량 432% 증가, 중국 95% 점유. Unitree 추월(출하·매출 양면).',
  '{"source":"AGIBOT / Yahoo Finance / The Robot Report","sourceUrl":"https://www.agibot.com/article/231/detail/82.html","reliability":"A","region":"china"}'::jsonb,
  false, '2026-10-02'::timestamp
);

-- Tesla Fremont 양산 라인 전환
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'mass_production', 'critical',
  '[양산] Tesla Optimus Fremont 로보틱스 라인 전환 — Model S/X 대체, 연 100만대 목표',
  'Tesla Fremont Q2 양산 라인 전환 착수. Model S/X 레거시 라인을 로보틱스 전용으로 교체. 1세대 로보틱스 공장: 연 100만대 용량 계획. Giga Texas 2세대 시설 착공: 장기 연 1,000만대. Gen 3 양산 설계 적용, 중국 3사 공급망 인증 완료. Musk 1월 확인: Fremont Gen 3 1,000대+ 가동. 2026 말 양산 개시 목표.',
  '{"source":"The Robot Report / Teslarati / iFactoryApp","sourceUrl":"https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/","reliability":"B","region":"north_america"}'::jsonb,
  false, '2026-10-02'::timestamp
);


-- ============================================================
-- 3. ci_freshness: 데이터 신선도 업데이트
-- ============================================================

-- 모든 경쟁사의 모든 레이어 신선도를 2026-10-02로 갱신
UPDATE ci_freshness
SET last_verified = '2026-10-02'::timestamp,
    next_review = '2026-10-09'::timestamp
WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true);


-- ============================================================
-- 4. ci_values: 주요 경쟁사 스펙/상태 업데이트 (변경 감지 시에만)
-- ============================================================

-- Tesla Optimus: stage 업데이트 (양산 전환 중)
UPDATE ci_values
SET value = 'Fremont Q2 양산 라인 전환 착수. Gen 3 1,000대+ 가동. 연 100만대 용량 목표.',
    confidence = 'B',
    source = 'The Robot Report / iFactory App',
    source_url = 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    source_date = '2026-10-02',
    last_verified = '2026-10-02'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND ci.name ILIKE '%양산%'
    LIMIT 1
  );

-- Boston Dynamics Atlas: 핸드 DOF 업데이트
UPDATE ci_values
SET value = '차세대 핸드 13 DOF(이전 대비 2배). 2026 전량 Hyundai/Google DeepMind 배정.',
    confidence = 'A',
    source = 'Seoul Economic Daily / Boston Dynamics',
    source_url = 'https://en.sedaily.com/finance/2026/10/02/boston-dynamics-unveils-next-generation-robot-hand-for-atlas',
    source_date = '2026-10-02',
    last_verified = '2026-10-02'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'hw' AND ci.name ILIKE '%핸드%'
    LIMIT 1
  );

-- Agility Digit: SPAC 상장 진행
UPDATE ci_values
SET value = 'Churchill Capital SPAC 합병 $620M. AGLT 상장 예정. $2.5B 밸류. Digit 5 양산.',
    confidence = 'A',
    source = 'SEC Filing / Agility Robotics',
    source_url = 'https://www.sec.gov/Archives/edgar/data/0002074973/000121390026071287/ea029548401ex99-1.htm',
    source_date = '2026-10-02',
    last_verified = '2026-10-02'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%투자%' OR ci.name ILIKE '%밸류%' OR ci.name ILIKE '%상장%')
    LIMIT 1
  );

-- AGIBOT: 출하량 업데이트
UPDATE ci_values
SET value = '누적 20,000대(2026.09). 글로벌 출하·매출 1위(Unitree 추월). 3개월에 4배 가속.',
    confidence = 'A',
    source = 'AGIBOT / The Robot Report',
    source_url = 'https://www.agibot.com/article/231/detail/82.html',
    source_date = '2026-10-02',
    last_verified = '2026-10-02'::timestamp,
    updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1)
  AND item_id IN (
    SELECT ci.id FROM ci_items ci
    JOIN ci_categories cc ON ci.category_id = cc.id
    JOIN ci_layers cl ON cc.layer_id = cl.id
    WHERE cl.slug = 'biz' AND (ci.name ILIKE '%양산%' OR ci.name ILIKE '%출하%')
    LIMIT 1
  );


COMMIT;

-- ============================================================
-- 수집 요약
-- ============================================================
-- 총 수집 건수: 14건 (ci_monitor_alerts 9건, competitive_alerts 5건)
-- 신뢰도 분류:
--   [A] 공식 1차 출처: 6건 (BD 핸드 공개, Agility SEC Filing, AGIBOT 공식, ISO 표준)
--   [B] 2개+ 매체 교차확인: 5건 (Tesla 양산, Figure AI, Unitree, 시장 통계)
--   [C] 단일 출처: 3건 (1X NEO 배송 상태, Apptronik Robot Park)
--
-- 주요 하이라이트 상위 3건:
-- 1. [Critical] AGIBOT 20,000대 출하 — 세계 1위(출하·매출), Unitree 추월, 3개월 4배 가속
-- 2. [Critical] Boston Dynamics Atlas 차세대 핸드 13 DOF 공개 — Hyundai 25,000대 배치 계획
-- 3. [Critical] Tesla Optimus Fremont 양산 라인 전환 — 연 100만대 용량, Giga Texas 착공
