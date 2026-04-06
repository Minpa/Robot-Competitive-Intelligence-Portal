-- ============================================================
-- ARGOS 경쟁사 데이터 업데이트 - 2026-04-06
-- 실행 전 반드시 DATABASE_URL 확인 후 psql로 실행
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-04-06.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. 신규 경쟁사 추가 (Unitree, Apptronik, Agibot)
-- ============================================================

INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  ('unitree-g1', 'G1/H2', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apollo', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot-x1', 'X1/A2', 'AGIBOT', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- 신규 경쟁사에 대해 모든 기존 ci_items에 빈 값 생성
INSERT INTO ci_values (competitor_id, item_id, value, confidence)
SELECT c.id, i.id, NULL, 'F'
FROM ci_competitors c
CROSS JOIN ci_items i
WHERE c.slug IN ('unitree-g1', 'apollo', 'agibot-x1')
  AND NOT EXISTS (
    SELECT 1 FROM ci_values v
    WHERE v.competitor_id = c.id AND v.item_id = i.id
  );

-- 신규 경쟁사에 대해 ci_freshness 생성
INSERT INTO ci_freshness (layer_id, competitor_id, tier)
SELECT l.id, c.id, 2
FROM ci_layers l
CROSS JOIN ci_competitors c
WHERE c.slug IN ('unitree-g1', 'apollo', 'agibot-x1')
  AND NOT EXISTS (
    SELECT 1 FROM ci_freshness f
    WHERE f.layer_id = l.id AND f.competitor_id = c.id
  );

-- ============================================================
-- 2. 기존 경쟁사 상태 업데이트
-- ============================================================

-- Tesla Optimus: pilot → commercial (외부 판매 시작)
UPDATE ci_competitors SET stage = 'commercial', name = 'Optimus Gen 3', updated_at = NOW()
WHERE slug = 'optimus';

-- Boston Dynamics Atlas: prototype → commercial
UPDATE ci_competitors SET stage = 'commercial', name = 'Atlas (Production)', updated_at = NOW()
WHERE slug = 'atlas';

-- Figure AI: pilot → commercial
UPDATE ci_competitors SET stage = 'commercial', name = 'Figure 02/03', updated_at = NOW()
WHERE slug = 'figure';

-- 1X NEO: poc → pilot
UPDATE ci_competitors SET stage = 'pilot', updated_at = NOW()
WHERE slug = 'neo';

-- ============================================================
-- 3. CI Monitor Alerts - 신규 인텔리전스 (중복 방지)
-- ============================================================

-- [A등급] Tesla Optimus - Fremont 공장 양산 시작
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Tesla IR / Teslarati',
  'https://www.teslarati.com/tesla-optimus-job-listings/',
  'Tesla Optimus Gen 3 양산 시작 - Fremont 공장 2026년 5만~10만대 목표',
  '2026년 1월 Fremont 공장에서 양산 시작. Model S/X 생산라인을 Optimus 전환. 2027년 Gigafactory Texas에서 연 1,000만대 목표. xAI와 Digital Optimus 프로젝트 발표($2B 투자). 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Tesla Optimus Gen 3 양산%'
);

-- [A등급] Boston Dynamics Atlas - CES 2026 생산 버전 공개
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Engadget / Boston Dynamics',
  'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  'Boston Dynamics Atlas 상용 버전 CES 2026 공개 - 2026년 전량 예약 완료',
  'CES 2026에서 생산 버전 Atlas 공개. 7.5ft 도달거리, 110lbs 리프트, 듀얼 스왑 배터리 4시간 운용. Hyundai RMAC 및 Google DeepMind에 배치. Hyundai $26B 미국 투자(연 3만대 생산 공장). 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'atlas'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Boston Dynamics Atlas 상용 버전%'
);

-- [A등급] Figure AI - Series C $1B+ / $39B 밸류에이션
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Figure AI 공식 / TechCrunch',
  'https://www.figure.ai/news/series-c',
  'Figure AI Series C $1B+ 달성 - 밸류에이션 $39B, Figure 03 가정용 출시',
  'Series C $1B+ 커밋 (밸류 $39B). 투자자: Parkway VC, Brookfield, NVIDIA, Intel Capital, LG Technology Ventures, Qualcomm. OpenAI 협력 종료→자체 Helix VLA. BMW/UPS 납품. Figure 03 백악관 시연. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'figure'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Figure AI Series C%'
);

-- [A등급] Unitree - $610M 상하이 IPO 신청
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Bloomberg / Rest of World',
  'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
  'Unitree Robotics 상하이 STAR Market IPO 신청 - $610M 조달, $7B+ 밸류에이션',
  'STAR Market IPO 신청(4.2B위안/$610M). 2025년 매출 1.71B위안(전년비 4.3배↑), 순이익 600M위안(최초 흑자). G1 $13,500에 40개국 판매. H2 신규 모델(7DOF 손). 2026년 1~2만대 출하 목표. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'unitree-g1'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Unitree Robotics 상하이%'
);

-- [A등급] Agility Robotics Digit - Toyota Canada 및 Mercado Libre 계약
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Agility Robotics 공식',
  'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
  'Agility Digit 10만+ 토트 처리 달성 - Toyota Canada, Mercado Libre 신규 계약',
  'GXO 물류센터에서 10만+ 토트 처리 마일스톤. Toyota Canada Woodstock 공장(RAV4 생산) RaaS 모델 배치. Mercado Libre 텍사스 물류센터 계약. Fortune 500 고객: GXO, Schaeffler, Amazon. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'digit'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Agility Digit 10만%'
);

-- [A등급] Apptronik Apollo - $520M 추가 펀딩, $5B 밸류에이션
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'CNBC / TechCrunch',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik $520M 추가 펀딩 - 총 $935M, $5B 밸류에이션, Google DeepMind 파트너십',
  '$520M Series A 확장(총 $935M). 밸류에이션 $5B+. Google 투자 참여, DeepMind Gemini Robotics 모델 적용. Mercedes-Benz, GXO, Jabil 파트너십. Apollo: 5ft8in/160lbs/55lbs 적재/4시간 운용. 2026년 신규 로봇 발표 예정. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'apollo'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%Apptronik $520M%'
);

-- [A등급] 1X Technologies NEO - EQT 10,000대 계약
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  '1X Technologies / TechCrunch',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '1X NEO 10,000대 산업배치 계약 - EQT 300개 포트폴리오사 대상, $20K 가격',
  'EQT와 2026~2030 최대 10,000대 배치 계약(제조/물류/창고). 사전주문 $20K, 구독 $499/월. 1X World Model 발표(비디오 학습→물리적 행동 전환). OpenAI Startup Fund 투자. CES 2026 가정용 시연. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'neo'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%1X NEO 10,000대%'
);

-- [A등급] AGIBOT - 10,000대 생산 마일스톤
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT
  'Interesting Engineering / Gizmochina',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  'AGIBOT 10,000대 생산 달성 - 3개월만에 5,000→10,000, 글로벌 배치 확대',
  '2026.3.30 상하이에서 10,000번째 로봇 생산. 1,000→5,000 약 1년, 5,000→10,000 단 3개월. 물류/리테일/호텔/교육/제조 다분야 배치. 유럽/북미/일본/한국/동남아/중동 글로벌 진출. CES 2026서 A2, X2, G2, D1 시리즈 출시. 신뢰도: [A] 공식 1차 출처',
  c.id,
  'pending'
FROM ci_competitors c WHERE c.slug = 'agibot-x1'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%AGIBOT 10,000대%'
);

-- [B등급] 규제/인증 동향 - ISO 25785-1 및 IEEE 프레임워크
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status)
SELECT
  'IEEE / Robotics & Automation News',
  'https://roboticsandautomationnews.com/2026/03/31/why-chinas-new-humanoid-robot-standards-could-change-the-industry/100263/',
  '휴머노이드 로봇 글로벌 안전 표준 진전 - ISO 25785-1, IEEE 프레임워크, 중국 표준',
  'ISO 25785-1 워킹 드래프트 진행(동적 안정성 로봇). IEEE 휴머노이드 표준 프레임워크 최종본 발간. 중국 독자 휴머노이드 표준 제정. EU Machinery Regulation 2023/1230 사이버보안 의무화. ANSI/A3 R15.06-2025 발효. 신뢰도: [B] 2개 이상 매체 교차확인',
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts a
  WHERE a.headline LIKE '%휴머노이드 로봇 글로벌 안전 표준%'
);

-- ============================================================
-- 4. CI Values 업데이트 (Staging을 통한 안전한 업데이트)
-- ============================================================

-- Tesla Optimus 비즈니스 데이터 스테이징
INSERT INTO ci_staging (update_type, payload, source_channel, status)
SELECT 'value_update', jsonb_build_object(
  'updates', jsonb_build_array(
    jsonb_build_object('competitorSlug', 'optimus', 'itemName', '상용화 단계', 'value', 'Commercial (Fremont 양산 시작, 2026 외부판매 예정)', 'confidence', 'A', 'source', 'Tesla IR', 'sourceDate', '2026-03-01'),
    jsonb_build_object('competitorSlug', 'optimus', 'itemName', '배치 대수', 'value', '5만~10만대 (2026 목표)', 'confidence', 'B', 'source', 'Teslarati', 'sourceDate', '2026-03-15'),
    jsonb_build_object('competitorSlug', 'optimus', 'itemName', '가격대', 'value', '$20K-$30K (대량생산 목표)', 'confidence', 'C', 'source', 'Elon Musk 발언'),
    jsonb_build_object('competitorSlug', 'optimus', 'itemName', '기술 파트너', 'value', 'xAI (Digital Optimus/$2B 투자)', 'confidence', 'A', 'source', 'Teslarati')
  )
), 'auto_crawl', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging s WHERE s.payload::text LIKE '%Fremont 양산 시작%' AND s.status = 'pending'
);

-- Boston Dynamics Atlas 비즈니스 데이터 스테이징
INSERT INTO ci_staging (update_type, payload, source_channel, status)
SELECT 'value_update', jsonb_build_object(
  'updates', jsonb_build_array(
    jsonb_build_object('competitorSlug', 'atlas', 'itemName', '상용화 단계', 'value', 'Commercial (CES 2026 생산버전 공개, 2026 전량 예약)', 'confidence', 'A', 'source', 'Boston Dynamics 공식'),
    jsonb_build_object('competitorSlug', 'atlas', 'itemName', '배치 대수', 'value', '2026 전량 예약 완료 (Hyundai RMAC + Google DeepMind)', 'confidence', 'A', 'source', 'Engadget/Boston Dynamics'),
    jsonb_build_object('competitorSlug', 'atlas', 'itemName', '주요 고객', 'value', 'Hyundai, Google DeepMind', 'confidence', 'A', 'source', 'Boston Dynamics 공식'),
    jsonb_build_object('competitorSlug', 'atlas', 'itemName', '가반하중', 'value', '50kg (110lbs)', 'confidence', 'A', 'source', 'Boston Dynamics 공식'),
    jsonb_build_object('competitorSlug', 'atlas', 'itemName', '연속동작시간', 'value', '4시간 (듀얼 스왑 배터리)', 'confidence', 'A', 'source', 'Boston Dynamics 공식')
  )
), 'auto_crawl', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging s WHERE s.payload::text LIKE '%CES 2026 생산버전%' AND s.status = 'pending'
);

-- Figure AI 비즈니스 데이터 스테이징
INSERT INTO ci_staging (update_type, payload, source_channel, status)
SELECT 'value_update', jsonb_build_object(
  'updates', jsonb_build_array(
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '총 펀딩', 'value', '$1B+ (Series C)', 'confidence', 'A', 'source', 'Figure AI 공식'),
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '최근 밸류에이션', 'value', '$39B (2026 Series C)', 'confidence', 'A', 'source', 'Figure AI 공식'),
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '주요 투자자', 'value', 'Parkway VC, Brookfield, NVIDIA, Intel Capital, LG Tech Ventures, Qualcomm, Salesforce', 'confidence', 'A', 'source', 'Figure AI 공식'),
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '주요 고객', 'value', 'BMW (Spartanburg), UPS', 'confidence', 'A', 'source', 'Figure AI / Wikipedia'),
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '핵심 AI 모델', 'value', 'Helix 01-02 VLA (자체, OpenAI 종료)', 'confidence', 'A', 'source', 'Figure AI 공식'),
    jsonb_build_object('competitorSlug', 'figure', 'itemName', '기술 파트너', 'value', 'Brookfield ($1T AUM), NVIDIA, Google DeepMind 종료→자체', 'confidence', 'A', 'source', 'Figure AI 공식')
  )
), 'auto_crawl', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging s WHERE s.payload::text LIKE '%$39B (2026 Series C)%' AND s.status = 'pending'
);

-- 1X NEO 비즈니스 데이터 스테이징
INSERT INTO ci_staging (update_type, payload, source_channel, status)
SELECT 'value_update', jsonb_build_object(
  'updates', jsonb_build_array(
    jsonb_build_object('competitorSlug', 'neo', 'itemName', '상용화 단계', 'value', 'Pilot (사전주문 $20K, 2026 배송 예정)', 'confidence', 'A', 'source', '1X 공식'),
    jsonb_build_object('competitorSlug', 'neo', 'itemName', '배치 대수', 'value', '~10,000대 계약 (EQT, 2026-2030)', 'confidence', 'A', 'source', 'TechCrunch'),
    jsonb_build_object('competitorSlug', 'neo', 'itemName', '가격대', 'value', '$20,000 (사전주문) / $499/월 구독', 'confidence', 'A', 'source', '1X 공식'),
    jsonb_build_object('competitorSlug', 'neo', 'itemName', '핵심 AI 모델', 'value', '1X World Model (비디오→물리 행동 전환)', 'confidence', 'A', 'source', '1X Technologies 공식')
  )
), 'auto_crawl', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging s WHERE s.payload::text LIKE '%EQT, 2026-2030%' AND s.status = 'pending'
);

-- Agility Digit 비즈니스 데이터 스테이징
INSERT INTO ci_staging (update_type, payload, source_channel, status)
SELECT 'value_update', jsonb_build_object(
  'updates', jsonb_build_array(
    jsonb_build_object('competitorSlug', 'digit', 'itemName', '주요 고객', 'value', 'Amazon, GXO, Schaeffler, Toyota Canada, Mercado Libre', 'confidence', 'A', 'source', 'Agility Robotics 공식'),
    jsonb_build_object('competitorSlug', 'digit', 'itemName', '배치 대수', 'value', '100대+ (GXO 10만 토트 달성)', 'confidence', 'B', 'source', 'Agility Robotics 공식'),
    jsonb_build_object('competitorSlug', 'digit', 'itemName', '제조 파트너', 'value', 'RoboFab (자체) + Toyota Canada RaaS', 'confidence', 'A', 'source', 'Agility Robotics 공식')
  )
), 'auto_crawl', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_staging s WHERE s.payload::text LIKE '%Toyota Canada RaaS%' AND s.status = 'pending'
);

COMMIT;

-- ============================================================
-- 실행 후 확인 쿼리
-- ============================================================
-- SELECT slug, name, manufacturer, stage FROM ci_competitors ORDER BY sort_order;
-- SELECT count(*) FROM ci_monitor_alerts WHERE status = 'pending';
-- SELECT count(*) FROM ci_staging WHERE status = 'pending';
