-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-04-07
-- 대상 테이블: ci_monitor_alerts, competitive_alerts
-- 실행 전: DATABASE_URL 환경변수로 PostgreSQL 접속 확인 필요
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. ci_monitor_alerts 테이블 INSERT (경쟁사 뉴스/업데이트)
--    중복 방지: headline + source_url 기준으로 기존 데이터 확인
-- ──────────────────────────────────────────────────────────────

-- [A] Tesla Optimus — Optimus 3 양산 일정 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Tesla Official / Elon Musk',
       'https://www.greendrive-accessories.com/blog/language/en/tesla-optimus-3-robot-humanoide-2026-2/',
       'Tesla Optimus 3 production to begin summer 2026',
       'Elon Musk confirmed Optimus 3 production starting summer 2026. Tesla allocated $20B CapEx for 2026. Fremont Model S/X lines converting to Optimus production in Q2 2026. First external commercial customers expected late 2026. Initial run: few hundred units in 2026, scaling to thousands in 2027-2028.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla Optimus 3 production to begin summer 2026');

-- [B] Tesla Optimus — xAI Digital Optimus 파트너십 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Teslarati / Multiple Sources',
       'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
       'Tesla announces Digital Optimus AI agent partnership with xAI',
       'Tesla invested $2B in xAI (Jan 2026). Digital Optimus is an AI agent built on Tesla FSD architecture in partnership with xAI, targeting rollout around September 2026.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla announces Digital Optimus AI agent partnership with xAI');

-- [A] Boston Dynamics Atlas — CES 2026 양산 버전 공개 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Boston Dynamics Official',
       'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
       'Boston Dynamics unveils production-ready Atlas at CES 2026',
       'Production Atlas unveiled at CES 2026 on Jan 5. Won CNET Best Robot award. All 2026 deployments fully committed to Hyundai RMAC and Google DeepMind. Hyundai plans 30,000 unit/yr factory by 2028. Additional customers planned early 2027.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'atlas'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics unveils production-ready Atlas at CES 2026');

-- [A] Boston Dynamics — Google DeepMind AI 파트너십 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Boston Dynamics Official',
       'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
       'Boston Dynamics & Google DeepMind form AI partnership for Atlas',
       'New partnership integrating Google DeepMind foundation models into Atlas for greater cognitive capabilities. Focus on enabling robots to learn new tasks quickly and adapt to dynamic environments.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'atlas'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics & Google DeepMind form AI partnership for Atlas');

-- [A] Figure AI — Series C $1B+ 투자 유치 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Figure AI Official',
       'https://www.figure.ai/news/series-c',
       'Figure AI exceeds $1B in Series C at $39B valuation',
       'Series C led by Parkway Venture Capital. Investors include NVIDIA, Brookfield, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm Ventures. Valuation: $39B post-money.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'figure-02'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure AI exceeds $1B in Series C at $39B valuation');

-- [B] Figure AI — BMW/UPS 상업 배포 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'TechCrunch / Robot Report',
       'https://www.therobotreport.com/figure-ai-raises-1b-in-series-c-funding-toward-humanoid-robot-development/',
       'Figure 02 commercial deployment to BMW and UPS',
       'Figure 02 delivered to paying customers including BMW Spartanburg facility and reportedly UPS. Figure 03 appeared at White House event. Demos: washing machine loading, package sorting, laundry folding.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'figure-02'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 02 commercial deployment to BMW and UPS');

-- [B] Unitree — IPO 신청 및 생산 목표 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'SCMP / CNBC',
       'https://www.scmp.com/tech/article/3347611/inside-unitrees-landmark-ipo-what-know-about-chinas-humanoid-giant',
       'Unitree Robotics files for Shanghai STAR Market IPO at RMB 42B valuation',
       'IPO application accepted March 20, 2026. Target proceeds: RMB 4.202B. 2025 revenue: RMB 1.708B (+335% YoY). Non-GAAP net profit: RMB 600M+ (+674% YoY). Morgan Stanley doubled 2026 China sales forecast to 28,000 units.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'unitree-h1'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree Robotics files for Shanghai STAR Market IPO at RMB 42B valuation');

-- [B] Unitree — H2 신모델 및 CES 2026 데모 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Thomas Net / Multiple Sources',
       'https://www.thomasnet.com/insights/unitree-h2-robot-kick-strike-backflip/',
       'Unitree H2 humanoid unveiled at CES 2026 with advanced dexterity',
       'New H2 model (nearly 6-foot-tall) demonstrated flying kicks, backflips, sandbag strikes at CES 2026. Features 7-DOF dexterous hands. B2-W quadruped with hybrid walk/wheel locomotion also showcased.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'unitree-h1'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree H2 humanoid unveiled at CES 2026 with advanced dexterity');

-- [A] Agility Robotics — Toyota 상업 계약 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Agility Robotics / TechCrunch',
       'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
       'Toyota Canada signs RaaS commercial agreement for Digit deployment',
       'Toyota TMMC Woodstock plant signed commercial RaaS agreement (Feb 19, 2026) after 1-year pilot. 7 Digit units active for RAV4 logistics. Digit surpassed 100K totes at GXO. Customers: GXO, Schaeffler, Amazon, Mercado Libre. ISO safety cert targeted mid-late 2026.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'digit'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Toyota Canada signs RaaS commercial agreement for Digit deployment');

-- [B] Agility Robotics — 차세대 Digit 개발 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Agility Robotics / Robozaps',
       'https://blog.robozaps.com/b/agility-robotics-digit-review',
       'Next-gen Digit with 50lb payload and ISO safety certification in development',
       'Agility developing next-gen Digit: 50lb payload capacity (22.6kg), improved battery life. ISO functional safety certification targeted mid-to-late 2026, potentially first humanoid cleared for cooperative human work without barriers.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'digit'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Next-gen Digit with 50lb payload and ISO safety certification in development');

-- [A] Apptronik — $520M 투자 유치 (공식 1차 출처 via CNBC)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'CNBC / TechCrunch',
       'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
       'Apptronik raises $520M at $5B valuation, total funding $935M',
       'New $520M round brings total to $935M. Valuation: $5B. Investors: Google, Mercedes-Benz, B Capital. Google DeepMind partnership for Gemini Robotics AI integration. New robot version debuting 2026. Austin expansion + new California office.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'apollo'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik raises $520M at $5B valuation, total funding $935M');

-- [B] 1X Technologies — 10,000대 배포 계약 (2개 이상 매체 교차확인)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'TechCrunch / Interesting Engineering',
       'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
       '1X signs deal to deliver 10,000 NEO robots to EQT portfolio companies',
       '10,000 NEO units between 2026-2030 for EQT portfolio (300+ companies). Focus: manufacturing, warehousing, logistics. US pilot 2026, expanding to EU/Asia. Pre-orders at $20K or $499/mo subscription. World Model AI update enables learning from video data.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'neo'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X signs deal to deliver 10,000 NEO robots to EQT portfolio companies');

-- [A] Agibot — 10,000대 생산 달성 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Agibot Official / PR Newswire',
       'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
       'Agibot reaches 10,000 humanoid robot production milestone',
       '10,000th unit rolled out March 30, 2026. Scaled from 5,000 to 10,000 in 3 months. US market debut at CES 2026. No.1 humanoid shipper by Omdia/IDC. Deploying in logistics, retail, hospitality, education, industrial across EU/NA/Asia.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'agibot-x1'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot reaches 10,000 humanoid robot production milestone');

-- [A] Agibot — LG CEO 방문 (공식 1차 출처)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT 'Korea Herald',
       'https://www.koreaherald.com/article/10694574',
       'LG Electronics CEO visits Agibot Shanghai for robotics collaboration',
       'LG CEO Lyu Jae-cheol visited Agibot Shanghai (3-day trip). Focus: mass production systems, data training infrastructure, actuator supply chain. LG took equity stake in Agibot Aug 2025. Exploring deeper collaboration for CLOiD development.',
       c.id, 'pending', '2026-04-07'
FROM ci_competitors c WHERE c.slug = 'agibot-x1'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'LG Electronics CEO visits Agibot Shanghai for robotics collaboration');


-- ──────────────────────────────────────────────────────────────
-- 2. competitive_alerts 테이블 INSERT (War Room 경쟁 알림)
--    중복 방지: title 기준으로 기존 데이터 확인
-- ──────────────────────────────────────────────────────────────

-- Tesla Optimus 3 양산 일정
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'mass_production', 'warning',
       '[Tesla] Optimus 3 양산 2026년 여름 시작 확정',
       'Elon Musk가 Optimus 3 양산을 2026년 여름부터 시작한다고 확인. $20B CapEx 투자, Fremont 공장 라인 전환. 2026년 수백 대 → 2027-28년 수천~수만 대 목표. 신뢰도: [A]',
       '{"confidence": "A", "source": "Tesla Official", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Tesla] Optimus 3 양산 2026년 여름 시작 확정');

-- Boston Dynamics Atlas 양산 출하
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'mass_production', 'critical',
       '[Boston Dynamics] Atlas 양산 버전 CES 2026 공개, 2026 출하 전량 예약 완료',
       'CES 2026에서 양산 Atlas 공개. 2026년 출하분 전량 Hyundai RMAC + Google DeepMind 배정. Hyundai 연 30,000대 생산 공장 2028년 가동 목표. Google DeepMind 파운데이션 모델 통합 파트너십 체결. 신뢰도: [A]',
       '{"confidence": "A", "source": "Boston Dynamics Official", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Boston Dynamics] Atlas 양산 버전 CES 2026 공개, 2026 출하 전량 예약 완료');

-- Figure AI 대규모 투자
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'funding', 'warning',
       '[Figure AI] Series C $1B+ 투자 유치, 기업가치 $39B',
       'Parkway Venture Capital 주도. NVIDIA, Brookfield, Intel Capital, LG Technology Ventures, Salesforce, Qualcomm Ventures 등 참여. BMW/UPS 상업 배포 진행 중. Figure 03 백악관 이벤트 등장. 신뢰도: [A]',
       '{"confidence": "A", "source": "Figure AI Official", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Figure AI] Series C $1B+ 투자 유치, 기업가치 $39B');

-- Unitree IPO
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'funding', 'warning',
       '[Unitree] 상해 STAR Market IPO 신청, 시가총액 RMB 420억 목표',
       '2025년 매출 RMB 17.08억 (+335% YoY), 비GAAP 순이익 RMB 6억+ (+674% YoY). Morgan Stanley 2026년 중국 판매 전망 28,000대로 상향. H2 신모델 CES 2026 공개. 신뢰도: [B]',
       '{"confidence": "B", "source": "SCMP/CNBC", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Unitree] 상해 STAR Market IPO 신청, 시가총액 RMB 420억 목표');

-- Agility Robotics Toyota 계약
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'partnership', 'warning',
       '[Agility] Toyota Canada 상업 RaaS 계약 체결, Digit 7대 배치',
       'Toyota TMMC Woodstock 공장 1년 파일럿 후 상업 계약 전환. RAV4 물류용 7대 배치. GXO에서 10만 토트 처리 달성. 고객: GXO, Schaeffler, Amazon, Mercado Libre. ISO 안전 인증 2026 중후반 목표. 신뢰도: [A]',
       '{"confidence": "A", "source": "Agility Robotics / TechCrunch", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Agility] Toyota Canada 상업 RaaS 계약 체결, Digit 7대 배치');

-- Apptronik 대규모 투자
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'funding', 'warning',
       '[Apptronik] $520M 추가 유치, 누적 $935M, 기업가치 $5B',
       'Google, Mercedes-Benz, B Capital 투자. Google DeepMind Gemini Robotics AI 모델 파트너십. Mercedes-Benz/GXO/Jabil 공장/창고 테스트 중. 2026년 신모델 공개 예정. 신뢰도: [A]',
       '{"confidence": "A", "source": "CNBC/TechCrunch", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Apptronik] $520M 추가 유치, 누적 $935M, 기업가치 $5B');

-- 1X Technologies EQT 계약
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'partnership', 'info',
       '[1X Technologies] EQT 포트폴리오 대상 10,000대 NEO 공급 계약',
       'EQT 포트폴리오 300+개사 대상 2026-2030년 최대 10,000대 공급. 미국 파일럿 2026년 시작. $20K 구매 또는 $499/월 구독 모델. World Model AI로 비디오 학습 기반 태스크 수행 가능. 신뢰도: [B]',
       '{"confidence": "B", "source": "TechCrunch/IE", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[1X Technologies] EQT 포트폴리오 대상 10,000대 NEO 공급 계약');

-- Agibot 10,000대 돌파
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'mass_production', 'critical',
       '[Agibot] 누적 10,000대 생산 달성, 글로벌 출하량 1위',
       '2026.03.30 10,000번째 유닛 출시. 5,000→10,000 단 3개월. Omdia/IDC 출하량 세계 1위. 미국 CES 2026 데뷔. 물류/소매/교육/산업 등 글로벌 배포. LG CEO 상해 방문, 협력 논의 (LG 지분 보유). 신뢰도: [A]',
       '{"confidence": "A", "source": "Agibot Official/Korea Herald", "date": "2026-04-07"}'::jsonb,
       false, '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '[Agibot] 누적 10,000대 생산 달성, 글로벌 출하량 1위');

COMMIT;

-- ============================================================
-- 실행 방법:
-- psql $DATABASE_URL -f scripts/ci-update-2026-04-07.sql
-- ============================================================
