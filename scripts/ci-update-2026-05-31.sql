-- ================================================================
-- ARGOS 경쟁사 CI 데이터 업데이트 — 2026-05-31
-- 실행: psql $DATABASE_URL < scripts/ci-update-2026-05-31.sql
-- ================================================================

BEGIN;

-- ──────────────────────────────────────────
-- 1. 누락 경쟁사 추가 (Unitree, Apptronik, Agibot)
-- ──────────────────────────────────────────
INSERT INTO ci_competitors (id, slug, name, manufacturer, country, stage, sort_order, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'unitree', 'G1/H2', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true, NOW(), NOW()),
  (gen_random_uuid(), 'apollo', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true, NOW(), NOW()),
  (gen_random_uuid(), 'agibot', 'Genie G1', 'Agibot (智元机器人)', '🇨🇳', 'commercial', 9, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────
-- 2. ci_monitor_alerts 삽입 (중복 체크: headline 기반)
-- ──────────────────────────────────────────

-- Tesla Optimus
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  'Tesla, Fremont 공장에서 Optimus 생산 시작 — Model S/X 라인 전환',
  'Tesla는 2026년 7-8월 Fremont에서 Optimus 로봇 양산을 시작할 예정. Model S/X 라인을 로봇 공장으로 전환하며 연간 100만 대 생산 목표. Giga Texas에 1,000만 대 규모 2세대 공장도 착공 중.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla, Fremont 공장에서 Optimus 생산 시작 — Model S/X 라인 전환');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Powedris / GreenDrive',
  'https://www.greendrive-accessories.com/blog/language/en/tesla-optimus-3-robot-humanoide-2026-2/',
  'Tesla Optimus Gen 3 공개 예정 — 양산용 첫 설계',
  'Optimus Gen 3는 2026년 Q1 공개 예정이며, 10,000개의 고유 부품으로 구성된 양산 최적화 설계. Musk는 초기 생산 속도가 "예측 불가"할 것이라 언급.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla Optimus Gen 3 공개 예정 — 양산용 첫 설계');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'The Robot Report',
  'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  'Tesla, Giga Texas에 Optimus 10M 대 규모 공장 착공',
  'Fremont 1세대 공장 이후, Giga Texas에 연간 1,000만 대 생산 목표의 2세대 로봇 공장을 별도 착공. EV에서 로보틱스로 사업 전환 가속화.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla, Giga Texas에 Optimus 10M 대 규모 공장 착공');

-- Boston Dynamics Atlas
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Boston Dynamics / Automate.org',
  'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
  'Boston Dynamics, CES 2026에서 Atlas 상용 모델 공개 및 양산 시작',
  'CES 2026에서 Atlas 양산 모델 공개. Hyundai RMAC 및 Google DeepMind에 플릿 배치 확정. 2026년 전체 배치 물량 완판. Hyundai는 2028년까지 연 30,000대 생산 목표 전용 공장 계획.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics, CES 2026에서 Atlas 상용 모델 공개 및 양산 시작');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'The Register / Decrypt',
  'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
  'Atlas 양산 스펙: 56 DOF, 4시간 구동, 110파운드 가반하중',
  '상용 Atlas는 56 자유도, 4시간 연속 구동, 3분 교환형 배터리, 최대 약 50kg(110lb) 가반하중, 약 2.3m(7.5ft) 도달 범위.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Atlas 양산 스펙: 56 DOF, 4시간 구동, 110파운드 가반하중');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Boston Dynamics Blog',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Google DeepMind 파트너십으로 Atlas에 Foundation Model 탑재',
  'Google DeepMind와 협력하여 Foundation Model 기반 인지 능력을 Atlas에 통합. 빠른 작업 학습과 범용성 향상이 목표.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Google DeepMind 파트너십으로 Atlas에 Foundation Model 탑재');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Humanoids Daily',
  'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  'Hyundai RMAC 및 Google DeepMind에 Atlas 플릿 배치 확정',
  'Hyundai RMAC(자동차 제조)과 Google DeepMind(AI 연구)에 첫 상용 배치. 2026년 배치 물량 전량 확정.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Hyundai RMAC 및 Google DeepMind에 Atlas 플릿 배치 확정');

-- Figure AI
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Figure AI',
  'https://www.figure.ai/news/series-c',
  'Figure AI, Series C에서 $1B 이상 조달 — $39B 밸류에이션',
  'Parkway Venture Capital 주도 Series C에서 $39B 밸류에이션으로 $1B+ 조달. NVIDIA, Brookfield, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile, Qualcomm 등 참여.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure AI, Series C에서 $1B 이상 조달 — $39B 밸류에이션');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Figure AI / Thomas Net',
  'https://www.thomasnet.com/insights/figure-ai-overview/',
  'Figure 02, BMW Spartanburg에서 30,000대 X3 생산 지원',
  'BMW Spartanburg 공장에 Figure 02 배치, 주 5일 10시간 교대로 90,000개 이상의 판금 부품 적재 작업 수행. 30,000대 BMW X3 생산에 기여.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 02, BMW Spartanburg에서 30,000대 X3 생산 지원');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Figure AI',
  'https://www.figure.ai/news',
  'Figure 03 공개 — 가정용 범용 로봇, Helix 02 VLA 모델 탑재',
  'Figure 03(2025년 10월 공개)는 가정용 범용 로봇으로 설계. 좁은 공간에서의 네비게이션과 일상 작업 처리에 최적화. Helix 02 VLA 모델로 인간 학습 기반 자율 수행.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 03 공개 — 가정용 범용 로봇, Helix 02 VLA 모델 탑재');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Forge Global Insights',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  'Figure AI, 로봇 vs 인간 택배 분류 경쟁 — 98.5% 성능 달성',
  '2026년 5월, Figure AI는 로봇들이 약 1주일간 논스톱으로 택배 분류 작업을 수행하는 실시간 스트리밍 후 10시간 인간 대 로봇 경쟁을 진행. 로봇이 인간 성능의 98.5%를 달성.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'figure' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure AI, 로봇 vs 인간 택배 분류 경쟁 — 98.5% 성능 달성');

-- Unitree
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'eWeek / Interesting Engineering',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree, 2026년 20,000대 휴머노이드 로봇 출하 목표',
  '2025년 G1 5,500대 이상 출하 후 2026년 20,000대로 4배 확대 목표. Morgan Stanley는 중국 2026 판매 전망을 28,000대로 두 배 상향.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree, 2026년 20,000대 휴머노이드 로봇 출하 목표');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Wikipedia / Unitree',
  'https://en.wikipedia.org/wiki/Unitree_Robotics',
  'Unitree, UnifoLM-VLA-0 오픈소스 공개 — 자연어 기반 가사 자율 수행',
  '2026년 3월 UnifoLM-VLA-0(Vision-Language-Action 모델) 오픈소스 공개. 자연어 명령으로 가사 자율 수행 가능.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree, UnifoLM-VLA-0 오픈소스 공개 — 자연어 기반 가사 자율 수행');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Bot Info / Robozaps',
  'https://blog.robozaps.com/b/unitree-g1-review',
  'Unitree G1, 하네다 공항 수하물/화물 처리에 상용 배치 (JAL 파트너십)',
  'Japan Airlines 및 GMO Internet Group과 협력하여 도쿄 하네다 공항에 G1 배치. 휴머노이드 로봇의 첫 상용 공항 배치 사례.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree G1, 하네다 공항 수하물/화물 처리에 상용 배치 (JAL 파트너십)');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Wikipedia / Unitree',
  'https://en.wikipedia.org/wiki/Unitree_Robotics',
  'Unitree, 상하이증권거래소 IPO 신청 (2026년 3월)',
  '2026년 3월 상하이증권거래소에 IPO 신청. H2, R1, G1-D(바퀴형) 등 라인업 확장 중.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree, 상하이증권거래소 IPO 신청 (2026년 3월)');

-- Agility Robotics (Digit)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Agility Robotics',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  'Agility Robotics, Toyota Motor Manufacturing Canada와 상용 계약 체결',
  '2026년 2월 TMMC와 Digit 배치 상용 계약. 제조/물류 지원. GXO, Schaeffler, Amazon에 이은 Fortune 500 고객 확장.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agility Robotics, Toyota Motor Manufacturing Canada와 상용 계약 체결');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Agility Robotics',
  'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
  'Mercado Libre, Digit 상용 배치 계약 — 라틴아메리카 물류 확장',
  'Mercado Libre가 텍사스 San Antonio 시설에 Digit 배치 계약. 이커머스 풀필먼트 작업 수행 후 라틴아메리카 물류센터 확장 계획.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Mercado Libre, Digit 상용 배치 계약 — 라틴아메리카 물류 확장');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Agility Robotics',
  'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
  'Digit, 상용 운영에서 100,000 토트 이상 처리 달성',
  'Digit가 실제 상거래 운영에서 100,000개 이상의 토트를 처리하며 신뢰성, 안전성, 가치를 입증. GXO와 업계 최초 다년 RaaS 계약 체결.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Digit, 상용 운영에서 100,000 토트 이상 처리 달성');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Agility Robotics',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
  'Digit 신규 업그레이드: 배터리 확장, Safety PLC, 신형 사지 및 엔드이펙터',
  '배터리 용량 확장, Category 1 정지 및 Safety PLC 안전 기능 추가, 새로운 로버스트 사지 및 엔드이펙터로 조작 역량 강화. MiR/Zebra AMR 연동 통합.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'digit' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Digit 신규 업그레이드: 배터리 확장, Safety PLC, 신형 사지 및 엔드이펙터');

-- Apptronik (Apollo)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'CNBC',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik, $520M 추가 조달 — 시리즈 A 총 $935M, $5B 밸류에이션',
  '2026년 2월 $520M 추가 조달로 시리즈 A 총 $935M. $5B 밸류에이션. 총 조달 자금 약 $1B에 근접.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik, $520M 추가 조달 — 시리즈 A 총 $935M, $5B 밸류에이션');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'CNBC / SiliconANGLE',
  'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
  'Apollo, Mercedes-Benz/GXO/Jabil과 상용 파트너십 확대',
  'Mercedes-Benz(제조), GXO(물류), Jabil(공급망/양산 지원) 파트너십. Jabil이 Apollo 양산 스케일업 지원. 2026년 상용 배치 목표.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apollo, Mercedes-Benz/GXO/Jabil과 상용 파트너십 확대');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Robozaps',
  'https://blog.robozaps.com/b/apptronik-apollo-review',
  'Apptronik, Google DeepMind Gemini Robotics 모델로 차세대 로봇 개발',
  'Google DeepMind와 협력하여 Gemini Robotics 모델 기반 차세대 휴머노이드 로봇 개발. 2026년 공개 예정.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'apollo' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik, Google DeepMind Gemini Robotics 모델로 차세대 로봇 개발');

-- 1X Technologies (NEO)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'GlobeNewsWire / eWeek',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '1X NEO, $20,000 가정용 로봇 — 2026년 내 미국 가정 배송 시작',
  '1X NEO는 $20,000(또는 $499/월 구독)으로 2026년 내 미국 가정에 배송 시작. 초도 생산분 10,000대 이상이 5일 만에 완판.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X NEO, $20,000 가정용 로봇 — 2026년 내 미국 가정 배송 시작');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'GlobeNewsWire / The Robot Report',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X, Hayward CA에 미국 최초 수직통합 휴머노이드 공장 개설',
  '2026년 4월 캘리포니아 Hayward에 미국 최초 수직통합 휴머노이드 로봇 공장 오픈. 2027년까지 연 100,000대 이상 생산 목표. San Carlos 추가 공장 계획.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X, Hayward CA에 미국 최초 수직통합 휴머노이드 공장 개설');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'Notebookcheck / Robozaps',
  'https://www.notebookcheck.net/1X-NEO-Household-robot-set-to-launch-by-the-end-of-2026-but-with-a-controversial-catch.1295772.0.html',
  'NEO Cortex에 NVIDIA Jetson Thor 탑재 — 실시간 온보드 AI 추론',
  'NVIDIA Jetson Thor를 NEO Cortex의 핵심으로 사용하여 안전 크리티컬 기능의 실시간 AI 추론을 로봇 온보드에서 수행.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'neo' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'NEO Cortex에 NVIDIA Jetson Thor 탑재 — 실시간 온보드 AI 추론');

-- Agibot
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'SCMP / Capital.com',
  'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
  'Agibot, 10,000대 생산 돌파 — 홍콩 IPO 준비 중 ($5-6.4B 밸류)',
  '2026년 3월 누적 10,000대 생산 돌파. 홍콩 IPO를 HK$40-50B(약 $5.1-6.4B) 밸류에이션으로 추진 중. 지분 15-25% 매각으로 $1B 이상 조달 계획.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot, 10,000대 생산 돌파 — 홍콩 IPO 준비 중 ($5-6.4B 밸류)');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'The AI Insider',
  'https://theaiinsider.tech/2026/04/14/chinas-agibot-deploys-robots-in-a-consumer-electronics-manufacturing-production-line/',
  'Agibot G2, Longcheer Technology 소비자 전자제품 양산 라인에 배치',
  'Agibot G2가 Longcheer Technology의 소비자 전자제품 정밀 제조 양산 라인에 인간 작업자와 함께 실제 배치. "배치 원년" 선언.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot G2, Longcheer Technology 소비자 전자제품 양산 라인에 배치');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'SCMP',
  'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
  'Agibot, $142M 매출 목표 — Tencent/BYD/LG 등 투자',
  'US$142M 매출 목표 설정. 주요 투자자: Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse. VSTECS를 유통 파트너로 선정.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot, $142M 매출 목표 — Tencent/BYD/LG 등 투자');

INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, detected_at, status)
SELECT gen_random_uuid(), 'eWeek',
  'https://www.eweek.com/news/agibot-deployment-year-one-robots-ai-models-apac/',
  'Agibot, MiniMax와 풀모달리티 AI 음성 인터랙션 협력',
  'MiniMax와 파트너십으로 풀모달리티 AI 음성 인터랙션 기능 통합. 5개 로봇과 8개 AI 모델로 "배치 원년" 런칭.',
  c.id, l.id, NOW(), 'pending'
FROM ci_competitors c, ci_layers l
WHERE c.slug = 'agibot' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot, MiniMax와 풀모달리티 AI 음성 인터랙션 협력');

-- ──────────────────────────────────────────
-- 3. 주요 전략 알림 (competitive_alerts)
-- ──────────────────────────────────────────
INSERT INTO competitive_alerts (id, type, severity, title, summary, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'critical',
  'Tesla Optimus, Fremont에서 2026 여름 양산 시작 — 연 100만대 목표',
  'Tesla가 Model S/X 라인을 Optimus 로봇 공장으로 전환하고 7-8월 양산 돌입. Giga Texas에 10M 규모 2세대 공장도 착공.',
  false, NOW()
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Tesla Optimus, Fremont에서 2026 여름 양산 시작 — 연 100만대 목표');

INSERT INTO competitive_alerts (id, type, severity, title, summary, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'warning',
  'Boston Dynamics Atlas 상용화 — Hyundai RMAC/Google DeepMind에 2026 전량 배치 확정',
  'CES 2026에서 양산 모델 공개. 56 DOF, 4시간 구동. 2028년까지 연 30,000대 전용 공장 계획.',
  false, NOW()
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Boston Dynamics Atlas 상용화 — Hyundai RMAC/Google DeepMind에 2026 전량 배치 확정');

INSERT INTO competitive_alerts (id, type, severity, title, summary, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'warning',
  'Figure AI Series C: $39B 밸류에이션에 $1B+ 조달 — LG Tech Ventures 참여',
  'NVIDIA, Brookfield, Intel Capital, LG Technology Ventures, Qualcomm 등 참여. BMW 공장에서 30,000대 X3 생산 지원 실적.',
  false, NOW()
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title = 'Figure AI Series C: $39B 밸류에이션에 $1B+ 조달 — LG Tech Ventures 참여');

COMMIT;

-- ================================================================
-- 실행 결과 확인
-- ================================================================
SELECT 'ci_monitor_alerts' as table_name, COUNT(*) as total_count FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'competitive_alerts', COUNT(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 'ci_competitors', COUNT(*) FROM ci_competitors;
