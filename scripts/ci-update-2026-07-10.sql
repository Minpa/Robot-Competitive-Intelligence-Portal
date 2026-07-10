-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-10
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트)
--    content_hash 기반 중복 방지
-- ============================================================

-- [Boston Dynamics / Hyundai] SoftBank 잔여 지분 인수 — BD 완전 자회사화
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Motor Group Acquires SoftBank Remaining 9.65% Stake in Boston Dynamics for $325M — Full Ownership',
  'Hyundai Motor Group / Boston Dynamics Official / Seoul Economic Daily',
  'https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/',
  '2026-06-19'::timestamp,
  'Hyundai Motor Group acquires SoftBank remaining 9.65% stake in Boston Dynamics for $325M. BD becomes wholly owned Hyundai subsidiary. Transaction follows put option from 2021 initial acquisition. Original 80% stake purchased in 2021 for $880M (~$1.1B valuation). Full ownership consolidation ahead of Atlas mass production.',
  'Hyundai Motor Group announced plans to acquire SoftBank Group remaining 9.65% stake in Boston Dynamics for approximately $325 million, making the U.S. robotics company a wholly owned subsidiary. The Hyundai Motor board approved the transaction on June 22, 2026. The purchase follows a put option established during Hyundai initial acquisition of an 80% stake in 2021 for roughly $880 million, valuing Boston Dynamics at approximately $1.1 billion at that time. SoftBank exit marks the end of its involvement in the company originally acquired from Alphabet in 2017. Full ownership consolidation comes at a strategic moment — as Atlas transitions from research platform to production-ready industrial robot, with 30,000 units/year factory planned for 2028 and 2026 fleet fully committed to Hyundai RMAC and Google DeepMind deployments.',
  'en', 'industry', 'robot',
  md5('hyundai-softbank-bd-full-acquisition-2026-06'),
  '{"mentionedCompanies":["Hyundai Motor Group","SoftBank","Boston Dynamics","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":[],"marketInsights":["$325M for 9.65% stake","BD wholly owned by Hyundai","Full ownership ahead of mass production"],"keyPoints":["SoftBank exits Boston Dynamics","$325M for remaining 9.65%","Wholly owned subsidiary status","Put option from 2021 deal"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-softbank-bd-full-acquisition-2026-06'));

-- [Unitree] CSRC 최종 등록 승인 — IPO 최종 관문 통과
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Robotics Wins CSRC Registration Approval for $619M Shanghai STAR Market IPO — 104-Day Record',
  'Caixin Global / CryptoBriefing / The Next Web',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  '2026-07-03'::timestamp,
  'China Securities Regulatory Commission (CSRC) issues final registration approval for Unitree IPO on July 2-3, 2026. Record 104-day review (fastest since STAR Market pre-review mechanism). Target raise: 4.2B yuan (~$619M). Overall valuation ~42B yuan. Still needs to set final share price and issuance date before actual listing.',
  'The China Securities Regulatory Commission (CSRC) issued its final registration approval for Unitree Robotics initial public offering on the Shanghai STAR Market on July 2-3, 2026. Unitree secured its IPO approval in just 104 days from application acceptance (March 20) to registration approval — the fastest review record since the STAR Market pre-review mechanism was implemented. The listing committee review was completed on June 1 in 73 days. The company aims to raise approximately 4.2 billion yuan (~$619 million), with an overall valuation estimated at approximately 42 billion yuan based on a public offering ratio of no less than 10%. Unitree still needs to set a final share price and issuance date before actual trading begins. The company reported a 35.13% net profit margin. Unitree is set to become the first embodied intelligence stock on China A-share market.',
  'en', 'industry', 'robot',
  md5('unitree-csrc-registration-final-approval-2026-07'),
  '{"mentionedCompanies":["Unitree Robotics","CSRC"],"mentionedRobots":["G1","H2"],"technologies":[],"marketInsights":["CSRC final registration approval","104-day record fastest review","$619M target raise","42B yuan valuation"],"keyPoints":["CSRC final approval July 2-3","104-day record for STAR Market","First embodied AI A-share listing","35.13% net profit margin"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-csrc-registration-final-approval-2026-07'));

-- [Tesla] Optimus 주간 생산 목표 구체화 — 단계별 램프업 공개
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla Optimus Production Ramp Schedule: Dozens in June to 1,000/Week by September, Internal Use Only Through 2026',
  'Teslarati / TrendForce / AIBase',
  'https://www.teslarati.com/elon-musk-outlines-tesla-optimus-production-expectations/',
  '2026-07-08'::timestamp,
  'Musk outlines specific Optimus weekly production ramp: dozens/week in June, 100-150/week in July, ~300/week in August, scaling to 1,000/week by September. All 2026 units for internal factory testing only, no external sales. Fremont designed for 1M units/year capacity. Giga Texas mass production factory targeted for 2027.',
  'Tesla CEO Elon Musk outlined specific weekly production ramp targets for Optimus humanoid robots at the Fremont factory. The production schedule calls for dozens of units per week in June (already achieved), 100 to 150 per week in July, approximately 300 per week in August, and scaling to 1,000 units per week by September 2026. All robots produced in 2026 will be used exclusively for internal factory testing and data collection — no external commercial use planned this year. The Fremont line, converted from the former Model S/X production area, has a designed annual capacity of 1 million units. The modular production system is designed to adapt as Optimus hardware evolves without overhauling manufacturing. A dedicated Texas factory targeting mass production is expected to come online in 2027, with consumer purchase earliest end 2027 at $20,000-$30,000 price range.',
  'en', 'product', 'robot',
  md5('tesla-optimus-weekly-ramp-schedule-2026-07'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus V3"],"technologies":["modular production line"],"marketInsights":["1,000/week by September target","Internal use only through 2026","1M/year Fremont capacity","$20K-$30K consumer price target"],"keyPoints":["Dozens/week June → 150/week July → 300/week Aug → 1K/week Sep","All 2026 units internal only","Giga Texas for 2027 mass production"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-weekly-ramp-schedule-2026-07'));

-- [Agility Robotics] GeekWire 재무 분석 — SPAC 상장 재무 공시 상세
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  'Agility Robotics SPAC Financial Filings Reveal Revenue, Burn Rate, and Path to Nasdaq Under Ticker AGLT',
  'GeekWire / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  '2026-07-07'::timestamp,
  'GeekWire analysis of Agility SPAC filing reveals detailed financials. $2.5B pre-money equity value. $620M+ gross proceeds: $420M trust + $200M PIPE (Foxconn-led). Customer pipeline 30+ companies. Digit v5 first AI-enabled cooperatively safe humanoid. Expected to trade as AGLT on Nasdaq. Deal close expected Q4 2026.',
  'A detailed financial analysis by GeekWire of Agility Robotics SPAC merger filing with Churchill Capital Corp XI reveals key financial details. The transaction values Agility at a $2.5 billion pre-money equity value. Expected gross proceeds exceed $620 million, comprising approximately $420 million from Churchill XI trust account (assuming no redemptions) and $200 million from a common stock PIPE financing led by Foxconn alongside existing and new institutional investors. Agility has secured more than $300 million in multi-year orders for next-generation Digit v5 robot, subject to contractual milestones, with a customer pipeline of more than 30 companies. Key investors and partners include DCVC, NVIDIA, Amazon, SoftBank Vision Fund 2, Foxconn, Schaeffler, Abico, and Playground Global. The combined company will trade on Nasdaq under ticker AGLT. Deal close expected Q4 2026.',
  'en', 'industry', 'robot',
  md5('agility-spac-financial-geekwire-2026-07'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","Foxconn","NVIDIA","Amazon","SoftBank","DCVC"],"mentionedRobots":["Digit","Digit v5"],"technologies":["cooperative safety"],"marketInsights":["$420M trust + $200M PIPE = $620M+","30+ company pipeline","Q4 2026 deal close expected"],"keyPoints":["GeekWire financial analysis published","$420M trust + $200M Foxconn PIPE","30+ company customer pipeline","Nasdaq AGLT ticker"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-financial-geekwire-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림)
-- ============================================================

-- [CRITICAL] Hyundai-BD 완전 자회사화 — Atlas 양산 체제 강화
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'critical',
  '[Boston Dynamics] Hyundai SoftBank 잔여 9.65% 지분 $325M 인수 — BD 완전 자회사화, Atlas 양산 체제 완성',
  '현대차그룹이 SoftBank의 BD 잔여 지분(9.65%) $325M에 인수. BD 완전 자회사 전환. 2021년 80% 지분 $880M 인수 후 5년 만에 완전 소유. Atlas 양산 체제 강화: 2026년 전량 배치 완료(Hyundai RMAC + Google DeepMind), 2028년 연 30,000대 공장 계획. FIFA WC 2026 자율 데모 성공 직후 발표.',
  '{"source":"Hyundai/BD Official/Seoul Economic Daily","confidence":"A","date":"2026-06-19","transaction":"$325M for 9.65%","original_deal":"$880M for 80% (2021)","implication":"wholly owned subsidiary","atlas_production":"30,000/yr factory by 2028"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Hyundai%SoftBank%9.65%'
  AND created_at > '2026-06-01'::timestamp
);

-- [WARNING] Unitree CSRC 최종 IPO 등록 승인 — A주 상장 임박
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[Unitree] CSRC 최종 등록 승인 완료 — $619M IPO, STAR Market 104일 최단 심사 기록',
  '7/2-3 CSRC 최종 등록 승인. 신청 접수(3/20)→승인까지 104일 — STAR Market 사전심사제 최단 기록. 상장위 심의 6/1(73일). 4.2B위안($619M) 조달, 42B위안 기업가치. 순이익률 35.13%. 주가 및 상장일 확정 후 실제 거래 시작. 중국 A주 최초 구현지능(Embodied AI) 종목.',
  '{"source":"CSRC/Caixin Global/CryptoBriefing","confidence":"A","date":"2026-07-03","csrc_approval":"July 2-3 2026","review_days":104,"record":"fastest STAR Market pre-review","target_raise":"4.2B yuan ($619M)","valuation":"42B yuan","net_margin":"35.13%"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Unitree%CSRC%최종%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] Tesla Optimus 주간 생산 램프업 구체화
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[Tesla] Optimus 주간 생산 목표: 6월 수십대 → 7월 150대 → 8월 300대 → 9월 1,000대/주',
  'Musk, Optimus 주간 생산 램프업 목표 구체화. 6월 수십대/주 달성. 7월 100-150대/주, 8월 ~300대/주, 9월 1,000대/주 목표. 2026년 전량 내부 공장 테스트용, 외부 판매 없음. Fremont 라인 1M/년 설계 용량. Giga Texas 2027년 양산 공장. 소비자 판매 2027년 말 이후($20K-$30K 예상).',
  '{"source":"Teslarati/TrendForce/Musk X posts","confidence":"B","date":"2026-07-08","weekly_ramp":{"june":"dozens","july":"100-150","august":"~300","september":"1,000"},"internal_only_2026":true,"fremont_capacity":"1M/yr","giga_texas":"2027","consumer_price":"$20K-$30K"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Optimus%주간%생산 목표%'
  AND created_at > '2026-07-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림)
-- ============================================================

-- Hyundai-BD 완전 자회사화
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Hyundai Motor Group / Boston Dynamics Official',
  'https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/',
  'Hyundai SoftBank 잔여 9.65% 지분 인수 — BD 완전 자회사화, Atlas 양산 체제 강화',
  '$325M에 SoftBank 잔여 9.65% 인수. BD 완전 자회사 전환. 2021 80% 인수 후 5년 만. Atlas 30K/년 공장 2028년 계획 앞두고 소유구조 완성.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Hyundai%SoftBank%9.65%'
  AND detected_at > '2026-06-01'::timestamp
);

-- Unitree CSRC 최종 승인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Caixin Global / CSRC',
  'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
  'Unitree CSRC 최종 등록 승인 — $619M IPO, STAR Market 104일 최단 심사',
  'CSRC 7/2-3 최종 등록 승인. 104일 최단 기록. 4.2B위안($619M) 조달. 주가/상장일 확정 대기. A주 최초 Embodied AI 종목.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' OR slug ILIKE '%g1%' OR name ILIKE '%Unitree%' OR name ILIKE '%G1%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Unitree%CSRC%최종%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Tesla Optimus 주간 생산 램프
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Teslarati / TrendForce',
  'https://www.teslarati.com/elon-musk-outlines-tesla-optimus-production-expectations/',
  'Tesla Optimus 주간 생산 램프: 6월 수십대 → 9월 1,000대/주, 2026 내부 전용',
  'Musk 구체적 주간 목표 공개: 6월 수십대/주, 7월 100-150, 8월 ~300, 9월 1,000. 2026년 전량 내부용. Fremont 1M/년 용량. Texas 2027년.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla Optimus 주간 생산 램프%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Agility SPAC 재무 상세
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'GeekWire / SEC Filing',
  'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
  'Agility SPAC 재무 공시 상세: $420M 신탁 + $200M Foxconn PIPE, 30+사 고객 파이프라인',
  'GeekWire SEC 공시 분석. $420M trust + $200M Foxconn-led PIPE = $620M+. 30+사 고객 파이프라인. Q4 2026 거래 완료 예상. Nasdaq AGLT.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR name ILIKE '%Digit%' OR name ILIKE '%Agility%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agility SPAC 재무 공시%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 4 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 3 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 4 (deduplicated by headline + date)
-- Total: up to 11 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처:
--     Hyundai-SoftBank BD 인수 (Hyundai/BD Official Press Release)
--     Unitree CSRC 최종 승인 (CSRC Official / Caixin Global)
-- [B] 2개 이상 매체 교차확인:
--     Tesla Optimus 주간 램프업 (Teslarati + TrendForce + AIBase + Musk X posts)
--     Agility SPAC 재무 (GeekWire + SEC Filing + BusinessWire)
--
-- NOTE: DB CONNECTION TIMEOUT — 이 스크립트는 2026-07-10 자동 업데이트 중
-- PostgreSQL 연결 시간 초과로 인해 실행되지 않았습니다.
-- 수동 실행이 필요합니다:
-- PGPASSWORD=<password> psql -h turntable.proxy.rlwy.net -p 55415 -U postgres -d railway -f scripts/ci-update-2026-07-10.sql
-- ============================================================
