-- ============================================================
-- 경쟁사 데이터 자동 업데이트 SQL — 2026-04-08
-- 실행 전 DATABASE_URL 환경변수로 psql 접속 필요:
--   psql "$DATABASE_URL" -f scripts/insert-competitor-data-2026-04-08.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. 누락 경쟁사 추가 (ci_competitors)
-- ============================================================
INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  ('unitree', 'Unitree H2/G1', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apollo', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot', 'Agibot A2/G2', 'AGIBOT', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- 기존 경쟁사 stage 업데이트
UPDATE ci_competitors SET stage = 'pilot', updated_at = NOW() WHERE slug = 'optimus' AND stage != 'pilot';
UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW() WHERE slug = 'atlas' AND stage != 'commercial';
UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW() WHERE slug = 'figure' AND stage != 'commercial';
UPDATE ci_competitors SET stage = 'commercial', updated_at = NOW() WHERE slug = 'digit' AND stage != 'commercial';
UPDATE ci_competitors SET stage = 'pilot', updated_at = NOW() WHERE slug = 'neo' AND stage != 'pilot';

-- ============================================================
-- 2. ci_monitor_alerts 삽입 (중복 방지: headline 기반)
-- ============================================================

-- [A] Tesla Optimus — 생산
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Teslarati / Hoodline / TeslaNorth',
  'https://www.greendrive-accessories.com/blog/language/en/tesla-optimus-3-robot-humanoide-2026-2/',
  'Tesla Optimus 3 생산 2026년 여름 시작 — Fremont 공장 Model S/X 라인 전환',
  'Tesla가 Fremont 공장의 Model S/X 생산 라인을 Optimus 휴머노이드 로봇 생산으로 전환. 2026년 여름 소량 생산(수백 대) 시작, 2027년부터 본격 양산 목표.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla Optimus 3 생산 2026년 여름 시작 — Fremont 공장 Model S/X 라인 전환');

-- [B] Tesla Optimus — 파트너십
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Teslarati',
  'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
  'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표',
  'Musk가 FSD 아키텍처 기반 AI 에이전트 "Digital Optimus"(코드네임 Macrohard)를 xAI와 공동 개발 중 발표. 2026년 9월경 출시 목표.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표');

-- [A] Boston Dynamics Atlas — 상용 출시
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Engadget / The Register / Boston Dynamics 공식',
  'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 전량 사전 판매 완료',
  'CES 2026에서 상용 버전 Atlas 공개. 2026년 배치분 전량 사전 판매 완료. Hyundai RMAC 및 Google DeepMind에 배치 예정. 리치 7.5ft, 110lb 가반하중.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 전량 사전 판매 완료');

-- [A] Boston Dynamics — Hyundai 투자
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'IMechE / Automate.org',
  'https://www.imeche.org/news/news-article/boston-dynamics-reveals-commercial-version-of-its-atlas-humanoid-and-sends-it-to-work-in-hyundai-factories',
  'Hyundai $26B 미국 투자 — 연 30,000대 로봇 생산 공장 신설 계획',
  'Hyundai Motor Group이 미국 사업에 $26B 투자 발표. 연간 30,000대 로봇 생산 가능한 신규 로보틱스 공장 건설 계획 포함.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Hyundai $26B 미국 투자 — 연 30,000대 로봇 생산 공장 신설 계획');

-- [A] Boston Dynamics — DeepMind 파트너십
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Boston Dynamics 공식 / Multiple outlets',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Boston Dynamics-Google DeepMind Gemini Robotics 통합 파트너십',
  'Google DeepMind의 Gemini Robotics 모델을 Atlas에 통합. 환경 인식, 자율 작업 수행, 작업 계획 능력 대폭 향상 목표.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics-Google DeepMind Gemini Robotics 통합 파트너십');

-- [A] Figure AI — 펀딩
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Figure AI 공식 / TechCrunch / CNBC',
  'https://www.figure.ai/news/series-c',
  'Figure AI Series C $1B+ 완료 — 기업가치 $39B, 총 누적 $1.9B',
  'Figure AI가 Series C에서 $1B 이상 모금, 기업가치 $39B. Nvidia, Intel Capital, Qualcomm 등 참여. 총 누적 펀딩 $1.9B 이상.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure AI Series C $1B+ 완료 — 기업가치 $39B, 총 누적 $1.9B');

-- [A] Figure AI — 생산
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'CNBC / Figure AI 공식',
  'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
  'Figure 03 공개 — BMW/UPS 상용 배치, BotQ 공장 10만대 생산 목표',
  'Figure 03(5ft8, 61kg, 20kg 페이로드, 5시간 가동) 공개. Figure 02는 BMW와 UPS에 상용 배치 진행 중. BotQ에서 4년간 100,000대 생산 목표.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 03 공개 — BMW/UPS 상용 배치, BotQ 공장 10만대 생산 목표');

-- [B] Unitree — 기술 스펙
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Thomas Net / Drones Plus Robotics',
  'https://www.thomasnet.com/insights/unitree-h2-robot-kick-strike-backflip/',
  'Unitree H2 공개 — 7-DOF 핸드, 4m/s 주행, 공중 백플립 시연',
  '2026년 1월 CES에서 H2 모델 공개. 약 6피트 키, 7자유도 새 핸드, 플라잉 킥/백플립/샌드백 타격 시연. H2 $29,900, G1 $13,500.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree H2 공개 — 7-DOF 핸드, 4m/s 주행, 공중 백플립 시연');

-- [B] Unitree — 생산
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'eWeek / Morgan Stanley',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree 2026년 G1 20,000대 출하 목표 — Morgan Stanley 중국 전망 2배 상향',
  'Unitree 경영진이 2026년 G1 20,000대 글로벌 출하 목표 공개. Morgan Stanley는 2026년 중국 판매 전망을 28,000대로 2배 상향 조정.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree 2026년 G1 20,000대 출하 목표 — Morgan Stanley 중국 전망 2배 상향');

-- [A] Agility Digit — Toyota 파트너십
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Yahoo Finance / Robot Report',
  'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
  'Toyota Canada, Digit 상용 RaaS 계약 체결 — 시범에서 정식 배치로 전환',
  'Toyota Motor Manufacturing Canada가 Agility Robotics와 상용 RaaS 계약 체결. Digit 3대→10대로 확대. GXO에서 100,000 토트 이상 처리 달성.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Toyota Canada, Digit 상용 RaaS 계약 체결 — 시범에서 정식 배치로 전환');

-- [B] Agility Digit — 차세대 개발
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'Robozaps / Agility Robotics',
  'https://blog.robozaps.com/b/agility-robotics-digit-review',
  'Agility Robotics 차세대 Digit 개발 — 50lb 페이로드, ISO 안전 인증 목표',
  'Agility Robotics가 차세대 Digit 개발 중. 페이로드 50lb로 향상, 배터리 수명 개선, ISO 기능 안전 인증 2026년 중후반 목표.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agility Robotics 차세대 Digit 개발 — 50lb 페이로드, ISO 안전 인증 목표');

-- [A] Apptronik — 펀딩
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'CNBC / TechCrunch / Crunchbase News',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik $520M 추가 투자유치 — 기업가치 $5B, 총 $935M Series A',
  'Apptronik이 $520M 추가 투자 유치(기업가치 $5B). B Capital-Google 공동 리드. 신규 투자자: AT&T Ventures, John Deere, 카타르 투자청.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik $520M 추가 투자유치 — 기업가치 $5B, 총 $935M Series A');

-- [A] Apptronik — 파트너십
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'SiliconANGLE / Interesting Engineering',
  'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
  'Apptronik-Google DeepMind Gemini Robotics 파트너십 및 신규 로봇 2026 발표 예정',
  'Apptronik이 Google DeepMind와 Gemini Robotics AI 모델 통합 파트너십 체결. Mercedes-Benz, GXO, Jabil과 테스트 진행 중.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik-Google DeepMind Gemini Robotics 파트너십 및 신규 로봇 2026 발표 예정');

-- [A] 1X NEO — 출시
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'AI Base / 1X 공식',
  'https://news.aibase.com/news/24272',
  '1X Technologies, CES 2026에서 NEO 가정용 로봇 공개 — $20K 얼리액세스',
  'OpenAI 투자를 받은 1X Technologies가 CES 2026에서 NEO 가정용 휴머노이드 로봇 공개. 얼리 액세스 $20,000, 구독 $499/월.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X Technologies, CES 2026에서 NEO 가정용 로봇 공개 — $20K 얼리액세스');

-- [A] 1X NEO — EQT 파트너십
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'TechCrunch / eWeek',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '1X-EQT 파트너십: 2026~2030년 최대 10,000대 NEO 산업 배치 계약',
  'EQT 포트폴리오 기업 300+개사에 2026~2030년간 최대 10,000대 NEO 로봇 배치 계약. 제조, 창고, 물류 등 산업 용도.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X-EQT 파트너십: 2026~2030년 최대 10,000대 NEO 산업 배치 계약');

-- [A] Agibot — 생산 마일스톤
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'The AI Insider / Robotics & Automation News',
  'https://theaiinsider.tech/2026/03/30/chinas-agibot-reaches-10000-units-citing-real-world-demand-for-humanoid-robots/',
  'Agibot 10,000대 생산 돌파 — 글로벌 시장점유율 39%, 연 5,100대 출하 1위',
  '2026년 3월 30일 Agibot이 10,000번째 휴머노이드 로봇 생산. 5,000→10,000대 3개월만에 2배 증가. 2025년 5,100대 출하로 글로벌 1위(39%).',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot 10,000대 생산 돌파 — 글로벌 시장점유율 39%, 연 5,100대 출하 1위');

-- [B] Agibot — IPO
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status)
SELECT
  'SCMP / PR Newswire / BigGo Finance',
  'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
  'Agibot 홍콩 IPO 추진 — 밸류에이션 HK$40~50B($5.1~6.4B), $142M 매출 목표',
  'Agibot이 2026년 홍콩 IPO를 추진 중. Tencent, BYD, LG Electronics, Baidu 등 투자. CES 2026에서 미국 시장 정식 진출.',
  c.id, l.id, 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot 홍콩 IPO 추진 — 밸류에이션 HK$40~50B($5.1~6.4B), $142M 매출 목표');

-- ============================================================
-- 3. competitive_alerts (War Room) — 주요 알림
-- ============================================================

-- Tesla 생산
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Tesla Optimus 3 생산 2026년 여름 시작 — Fremont 공장 Model S/X 라인 전환',
  'Tesla가 Fremont 공장의 Model S/X 생산 라인을 Optimus 휴머노이드 로봇 생산으로 전환. 2026년 여름 소량 생산 시작.',
  '{"competitorSlug":"optimus","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Tesla Optimus 3 생산 2026년 여름 시작 — Fremont 공장 Model S/X 라인 전환');

-- Tesla 파트너십
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'partnership', 'warning',
  'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표',
  'FSD 아키텍처 기반 AI 에이전트를 xAI와 공동 개발. 2026년 9월 출시 목표.',
  '{"competitorSlug":"optimus","category":"partnership","confidence":"B","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표');

-- BD Atlas 상용
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 전량 사전 판매 완료',
  'CES 2026에서 상용 Atlas 공개. 2026년 배치분 전량 사전 판매 완료. Hyundai RMAC 및 Google DeepMind 배치.',
  '{"competitorSlug":"atlas","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Boston Dynamics, CES 2026에서 상용 Atlas 공개 — 2026년 전량 사전 판매 완료');

-- BD Hyundai 투자
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Hyundai $26B 미국 투자 — 연 30,000대 로봇 생산 공장 신설 계획',
  'Hyundai Motor Group이 미국에 $26B 투자. 연 30,000대 로봇 생산 가능 공장 건설 계획.',
  '{"competitorSlug":"atlas","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Hyundai $26B 미국 투자 — 연 30,000대 로봇 생산 공장 신설 계획');

-- BD DeepMind 파트너십
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'partnership', 'warning',
  'Boston Dynamics-Google DeepMind Gemini Robotics 통합 파트너십',
  'Google DeepMind의 Gemini Robotics 모델을 Atlas에 통합. AI 자율성 수준 향상.',
  '{"competitorSlug":"atlas","category":"partnership","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Boston Dynamics-Google DeepMind Gemini Robotics 통합 파트너십');

-- Figure AI 펀딩
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'funding', 'critical',
  'Figure AI Series C $1B+ 완료 — 기업가치 $39B, 총 누적 $1.9B',
  'Figure AI Series C $1B+, 기업가치 $39B. Nvidia, Intel Capital, Qualcomm 참여.',
  '{"competitorSlug":"figure","category":"funding","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Figure AI Series C $1B+ 완료 — 기업가치 $39B, 총 누적 $1.9B');

-- Figure AI 생산
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Figure 03 공개 — BMW/UPS 상용 배치, BotQ 공장 10만대 생산 목표',
  'Figure 03 공개. BMW/UPS 상용 배치 진행 중. BotQ 공장 4년 10만대 목표.',
  '{"competitorSlug":"figure","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Figure 03 공개 — BMW/UPS 상용 배치, BotQ 공장 10만대 생산 목표');

-- Unitree 스펙
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'score_spike', 'warning',
  'Unitree H2 공개 — 7-DOF 핸드, 4m/s 주행, 공중 백플립 시연',
  'CES에서 H2 모델 공개. 7자유도 핸드, 4m/s 주행. H2 $29,900, G1 $13,500.',
  '{"competitorSlug":"unitree","category":"tech_spec","confidence":"B","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Unitree H2 공개 — 7-DOF 핸드, 4m/s 주행, 공중 백플립 시연');

-- Unitree 생산
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Unitree 2026년 G1 20,000대 출하 목표 — Morgan Stanley 중국 전망 2배 상향',
  'G1 20,000대 글로벌 출하 목표. Morgan Stanley 중국 전망 28,000대로 2배 상향.',
  '{"competitorSlug":"unitree","category":"production","confidence":"B","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Unitree 2026년 G1 20,000대 출하 목표 — Morgan Stanley 중국 전망 2배 상향');

-- Agility Digit 파트너십
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'partnership', 'warning',
  'Toyota Canada, Digit 상용 RaaS 계약 체결 — 시범에서 정식 배치로 전환',
  'Toyota Canada가 Agility와 상용 RaaS 계약 체결. Digit 3대→10대 확대.',
  '{"competitorSlug":"digit","category":"partnership","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Toyota Canada, Digit 상용 RaaS 계약 체결 — 시범에서 정식 배치로 전환');

-- Apptronik 펀딩
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'funding', 'critical',
  'Apptronik $520M 추가 투자유치 — 기업가치 $5B, 총 $935M Series A',
  'Apptronik $520M 추가 투자(기업가치 $5B). B Capital-Google 리드.',
  '{"competitorSlug":"apollo","category":"funding","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Apptronik $520M 추가 투자유치 — 기업가치 $5B, 총 $935M Series A');

-- Apptronik 파트너십
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'partnership', 'warning',
  'Apptronik-Google DeepMind Gemini Robotics 파트너십 및 신규 로봇 2026 발표 예정',
  'Google DeepMind Gemini Robotics AI 통합. Mercedes-Benz, GXO, Jabil 테스트 중.',
  '{"competitorSlug":"apollo","category":"partnership","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Apptronik-Google DeepMind Gemini Robotics 파트너십 및 신규 로봇 2026 발표 예정');

-- 1X NEO 출시
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'warning',
  '1X Technologies, CES 2026에서 NEO 가정용 로봇 공개 — $20K 얼리액세스',
  'CES 2026에서 NEO 가정용 로봇 공개. 얼리 액세스 $20,000, 구독 $499/월.',
  '{"competitorSlug":"neo","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '1X Technologies, CES 2026에서 NEO 가정용 로봇 공개 — $20K 얼리액세스');

-- 1X NEO EQT 파트너십
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'partnership', 'warning',
  '1X-EQT 파트너십: 2026~2030년 최대 10,000대 NEO 산업 배치 계약',
  'EQT 포트폴리오 300+사에 2026~2030년 최대 10,000대 배치 계약.',
  '{"competitorSlug":"neo","category":"partnership","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = '1X-EQT 파트너십: 2026~2030년 최대 10,000대 NEO 산업 배치 계약');

-- Agibot 생산
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'mass_production', 'critical',
  'Agibot 10,000대 생산 돌파 — 글로벌 시장점유율 39%, 연 5,100대 출하 1위',
  'Agibot 10,000번째 로봇 생산. 3개월만에 2배 증가. 글로벌 출하 1위(39% 점유율).',
  '{"competitorSlug":"agibot","category":"production","confidence":"A","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Agibot 10,000대 생산 돌파 — 글로벌 시장점유율 39%, 연 5,100대 출하 1위');

-- Agibot IPO
INSERT INTO competitive_alerts (type, severity, title, summary, trigger_data)
SELECT 'funding', 'warning',
  'Agibot 홍콩 IPO 추진 — 밸류에이션 HK$40~50B($5.1~6.4B), $142M 매출 목표',
  'Agibot 홍콩 IPO 추진. 밸류 $5.1~6.4B. LG Electronics 등 투자 참여.',
  '{"competitorSlug":"agibot","category":"funding","confidence":"B","collectedAt":"2026-04-08"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Agibot 홍콩 IPO 추진 — 밸류에이션 HK$40~50B($5.1~6.4B), $142M 매출 목표');

COMMIT;

-- ============================================================
-- 확인 쿼리
-- ============================================================
SELECT 'ci_competitors' AS tbl, count(*) FROM ci_competitors
UNION ALL
SELECT 'ci_monitor_alerts', count(*) FROM ci_monitor_alerts
UNION ALL
SELECT 'competitive_alerts', count(*) FROM competitive_alerts;
