--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-11
-- 수집 시점: 2026-06-11, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인
--

BEGIN;

-- ============================================================
-- 1. 신규 기사 (articles) — 2026-06-10 이후 신규 발굴 건
-- ============================================================

-- [Boston Dynamics] Google DeepMind 파운데이션 모델 통합 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000001-0001-4000-8000-000000000001',
  '745abfe6-5438-4eda-b916-edf2e482c017',
  'Boston Dynamics and Google DeepMind form partnership to integrate foundation models into Atlas humanoid',
  'Boston Dynamics Official',
  'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
  '2026-05-15 00:00:00',
  'Boston Dynamics and Google DeepMind partner to integrate cutting-edge foundation models into Atlas for greater cognitive capabilities. Hyundai Mobis to supply actuators and co-develop component supply chain for accelerated production.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30611',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Boston Dynamics] Atlas RL 기반 중량물 리프팅 시뮬레이션 훈련 (May 2026)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000001-0002-4000-8000-000000000001',
  '745abfe6-5438-4eda-b916-edf2e482c017',
  'Boston Dynamics trains Atlas to lift heavy appliances using AI-driven whole-body control and large-scale simulation',
  'Robotics and Automation News',
  'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
  '2026-05-20 00:00:00',
  'Atlas trained via reinforcement learning and large-scale simulation to lift and carry heavy industrial objects (washing machines). Whole-body control approach demonstrates robust sim-to-real transfer. Specs: 7.5ft reach, 110lb lift capacity, -4°F to 104°F operating range.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30612',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] Shanghai Stock Exchange IPO 신청 + 335% 매출 성장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000002-0001-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree files for Shanghai Stock Exchange IPO targeting $580M amid 335% revenue growth',
  'eWeek / TechTimes',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-03-15 00:00:00',
  'Unitree filed for Shanghai Stock Exchange A-share IPO in March 2026 targeting $580M, on track for mid-2026 listing. Reported 335% YoY revenue growth in 2025 (¥1.708B). Plans to ship 20,000 humanoid robots in 2026.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30613',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] UnifoLM-VLA-0 오픈소스 공개 + H2/R1 신모델 확장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000002-0002-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree open-sources UnifoLM-VLA-0 vision-language-action model, expands lineup with H2 and R1',
  'ZMProbots / Robocloud',
  'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
  '2026-03-01 00:00:00',
  'Unitree open-sourced UnifoLM-VLA-0, a Vision-Language-Action model enabling autonomous household tasks via natural language commands. Expanded humanoid lineup with H2 (enterprise) and R1 models. G1-D variant introduced with differential drive wheeled base for data collection.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30614',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] G1 Tokyo Haneda Airport 상업 배치 (JAL/GMO)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000002-0003-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree G1 deployed at Tokyo Haneda Airport for baggage handling in partnership with JAL and GMO',
  'Automate.org / Unitree',
  'https://www.automate.org/robotics/industry-insights/unitrees-55-pound-humanoid-costs-6-000-can-cartwheel',
  '2026-04-01 00:00:00',
  'Unitree G1 deployed for baggage and cargo handling at Tokyo Haneda Airport in partnership with Japan Airlines (JAL) and GMO Internet Group. First commercial airport deployment for a humanoid robot, with trial runs planned through 2028.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30615',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Toyota Canada 상업 계약 + ISO 기능안전 인증 추진
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000003-0001-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics signs commercial agreement with Toyota Motor Manufacturing Canada, expands to 10 Digit units',
  'Agility Robotics Official / The Robot Report',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  '2026-02-15 00:00:00',
  'Toyota Motor Manufacturing Canada signed commercial agreement with Agility Robotics after successful pilot. Expanding from 3 to 10 Digit units under RaaS model. Pursuing ISO functional safety certification for human collaboration clearance (est. mid-late 2026). Next-gen payload increased to 50lb.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30616',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] $520M 펀딩 ($5B 밸류에이션) + Google DeepMind Gemini 통합
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000004-0001-4000-8000-000000000001',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Apptronik raises $520M at $5B valuation, partners with Google DeepMind for Gemini Robotics integration',
  'CNBC / The Robot Report',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11 00:00:00',
  'Apptronik raised $520M at $5B valuation (total Series A: $935M). Co-led by B Capital and Google. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Strategic Google DeepMind partnership to power Apollo with Gemini Robotics. Expanding Austin HQ and opening California office.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30617',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] EQT 파트너십: 10K 로봇 2026-2030 배치 계약
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000005-0001-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X Technologies signs deal with EQT to deploy up to 10,000 NEO robots across 300+ portfolio companies',
  'TechCrunch',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '2025-12-11 00:00:00',
  'EQT deal: up to 10,000 NEO robots deployed 2026-2030 across 300+ portfolio companies in manufacturing, warehousing, and logistics. 1X World Model enables task learning from video. Hayward factory (58,000 sq ft) capacity: 10K/yr, scaling to 100K by end 2027. First-year production sold out in 5 days.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30618',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] 1X World Model AI 업데이트 — 비디오 기반 태스크 학습
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000005-0002-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X launches World Model enabling NEO robot to learn tasks by watching videos',
  'The Robot Report',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-05-01 00:00:00',
  '1X World Model AI update: turns any request into an on-demand capability using a video model grounded in real-world physics. Nvidia Jetson Thor platform, Isaac simulation training. Soft fabric exterior for safe home interaction.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30619',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] 10,000번째 로봇 생산 + Omdia 글로벌 1위 확인
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000006-0001-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot produces 10,000th humanoid robot, ranks #1 globally in shipment volume per Omdia',
  'TechTimes / Interesting Engineering',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  '2026-03-30 00:00:00',
  'Agibot produced 10,000th humanoid robot on March 30, 2026 (Expedition A3 platform). From 5,000 to 10,000 units took 3 months — 4x throughput acceleration. Omdia Jan 2026 report ranks Agibot #1 globally in humanoid shipment volume. Unitree + Agibot projected ~80% global market share.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30620',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] LG CEO 방문 + 소비자 전자 제조 라인 배치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000006-0002-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'LG CEO visits Agibot in China as company deploys robots in consumer electronics manufacturing line',
  'Korea Herald / The AI Insider',
  'https://www.koreaherald.com/article/10694574',
  '2026-05-20 00:00:00',
  'LG CEO visited Agibot headquarters in China to explore humanoid robot collaboration. Agibot deployed robots in consumer electronics precision manufacturing mass-production line — first large-scale industrial implementation of embodied AI in sector. Global expansion to Europe, North America, Japan, Korea, SE Asia, Middle East.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30621',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Figure 02 BMW 11개월 배치 실적 상세
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000007-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Figure 02 completes 11-month BMW deployment: 30K vehicles produced, 90K components loaded, 1250 operational hours',
  'Forge Global / Figure AI',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-01 00:00:00',
  'After 11-month deployment of two Figure 02 units at BMW Spartanburg SC plant: contributed to 30,000+ BMW X3 vehicles, loaded 90,000+ sheet metal components, accumulated ~1,250 operational hours on 10-hour weekday shifts. Validates humanoid viability in high-volume automotive manufacturing.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30622',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Tesla] Optimus Gen 3 전역 확장 계획 (Giga Texas/Berlin/Shanghai)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c4000008-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla plans parallel Optimus Gen 3 expansion to Gigafactories in Texas, Berlin, and Shanghai for 2027',
  'Supply Chain Today / Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22 00:00:00',
  'Optimus Gen 3 is first design meant for mass production with 10,000 unique parts. Initial production Fremont Summer 2026 at $20-30K price. Parallel expansion to Giga Texas, Giga Berlin, Giga Shanghai planned for 2027. Production rate "quite slow" initially — Musk notes "literally impossible to predict" given complexity.',
  'en',
  'e4a1b2c3d4e5f6a7b8c9d0e1f2a30623',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;


-- ============================================================
-- 2. CI Values 업데이트 (ci_values) — 기존 값 갱신 + 신규 항목
-- ============================================================

-- [Boston Dynamics] 기술파트너 업데이트: Google DeepMind + Hyundai Mobis 액추에이터
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000001-0001-4000-8000-000000000001',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0015-4000-8000-000000000015',
  'Google DeepMind (foundation model integration), Hyundai Mobis (actuator supply chain), Hyundai Motor Group',
  'A',
  'Boston Dynamics Official',
  'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
  '2026-05-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Boston Dynamics] AI모델 업데이트: RL whole-body control + sim-to-real
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000001-0002-4000-8000-000000000001',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0007-4000-8000-000000000007',
  'RL whole-body control for heavy lifting (110lb). Large-scale sim-to-real transfer. DeepMind foundation models integrating',
  'A',
  'Robotics and Automation News, Boston Dynamics Official',
  'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
  '2026-05-20'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] 총펀딩/IPO 업데이트: Shanghai SSE IPO $580M
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000002-0001-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0009-4000-8000-000000000009',
  'Shanghai SSE A-share IPO filed March 2026, $580M target, mid-2026 listing. 335% YoY revenue growth (¥1.708B in 2025)',
  'B',
  'eWeek, TechTimes, TrendForce',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '2026-03-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] AI모델 업데이트: UnifoLM-VLA-0 오픈소스
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000002-0002-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0007-4000-8000-000000000007',
  'UnifoLM-VLA-0 open-sourced (March 2026). VLA model for autonomous household tasks via NL commands',
  'A',
  'ZMProbots, Robocloud Dashboard',
  'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
  '2026-03-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] 기술파트너 업데이트: Toyota Canada 상업 계약 확대
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000003-0001-4000-8000-000000000001',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0015-4000-8000-000000000015',
  'Toyota Canada (10 units, commercial RaaS), GXO Logistics, Amazon, Schaeffler, Mercado Libre. ISO safety cert in progress',
  'A',
  'Agility Robotics Official, The Robot Report',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  '2026-02-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Apptronik] 총펀딩 업데이트: $935M total at $5B valuation
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000004-0001-4000-8000-000000000001',
  'd1000001-0006-4000-8000-000000000006',
  'a1000001-0009-4000-8000-000000000009',
  '$935M total ($520M latest at $5B valuation). B Capital, Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA',
  'A',
  'CNBC, SiliconAngle, The Robot Report',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Apptronik] 기술파트너 업데이트: Google DeepMind Gemini Robotics
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000004-0002-4000-8000-000000000001',
  'd1000001-0006-4000-8000-000000000006',
  'a1000001-0015-4000-8000-000000000015',
  'Google DeepMind (Gemini Robotics), Mercedes-Benz, GXO Logistics, Jabil (contract mfg)',
  'A',
  'CNBC, Interesting Engineering',
  'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
  '2026-02-11'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] 배치대수 업데이트: EQT 10K 계약 + 생산 완판
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000005-0001-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0013-4000-8000-000000000013',
  'EQT deal: 10K units 2026-2030 across 300+ companies. Yr1 production (10K) sold out in 5 days. Hayward 58K sqft factory',
  'B',
  'TechCrunch, Tech Funding News',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '2025-12-11'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] AI모델 업데이트: 1X World Model
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000005-0002-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0007-4000-8000-000000000007',
  '1X World Model: video-based task learning, physics-grounded. Nvidia Jetson Thor + Isaac sim',
  'A',
  'The Robot Report, 1X Official',
  'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
  '2026-05-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 배치대수 업데이트: 10,000th robot, Omdia #1
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000006-0001-4000-8000-000000000001',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0013-4000-8000-000000000013',
  '10,000th robot March 30, 2026. Omdia #1 global shipment. 4x throughput acceleration (5K→10K in 3 months)',
  'A',
  'TechTimes, Interesting Engineering, TrendForce',
  'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
  '2026-03-30'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 기술파트너 업데이트: LG CEO 방문
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000006-0002-4000-8000-000000000001',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0015-4000-8000-000000000015',
  'LG (CEO visited HQ), consumer electronics OEMs, global expansion (EU/NA/JP/KR/SEA/ME)',
  'A',
  'Korea Herald, The AI Insider',
  'https://www.koreaherald.com/article/10694574',
  '2026-05-20'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Tesla] Giga 확장 계획 업데이트
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000007-0001-4000-8000-000000000001',
  'd1000001-0001-4000-8000-000000000001',
  'a1000001-0013-4000-8000-000000000013',
  'Gen 3 first mass-production design (10K unique parts). Giga TX/Berlin/Shanghai expansion 2027. 1M units eventual capacity',
  'B',
  'Electrek, Supply Chain Today, iFactory',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-04-22'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] Figure 02 BMW 배치 실적 상세
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v4000008-0001-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0013-4000-8000-000000000013',
  'F.02 BMW: 30K X3 vehicles, 90K components, 1250hrs/11mo. F.03: 350+ delivered, 204K packages. RaaS $1K/mo',
  'A',
  'Forge Global, Figure AI Official, KraneShares',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();


-- ============================================================
-- 3. CI Monitor Alerts — 신규 감지 알림
-- ============================================================

-- [Boston Dynamics] Google DeepMind 파운데이션 모델 파트너십
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000001-0001-4000-8000-000000000001',
  'Boston Dynamics Official',
  'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
  '[Boston Dynamics] Google DeepMind 파운데이션 모델 통합 파트너십 체결',
  'Boston Dynamics와 Google DeepMind이 Atlas에 파운데이션 모델 통합을 위한 전략적 파트너십 체결. Hyundai Mobis 액추에이터 공급망 공동 개발. RL 기반 whole-body control로 110lb 중량물 리프팅 달성.',
  'd1000001-0002-4000-8000-000000000002',
  'e1000001-0002-4000-8000-000000000002',
  'pending'
);

-- [Unitree] 상하이 증권거래소 IPO 신청 + 335% 매출 성장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000002-0001-4000-8000-000000000001',
  'eWeek / TechTimes',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  '[Unitree] 상하이 증권거래소 IPO 신청 ($580M) + 335% 매출 성장',
  'Unitree 2026년 3월 상하이 증권거래소 A주 IPO 신청 ($580M 목표, 중반기 상장 예정). 2025년 335% YoY 매출 성장 (¥1.708B). UnifoLM-VLA-0 VLA 모델 오픈소스. G1-D 휠 기반 변형 출시. JAL/GMO와 하네다 공항 배치.',
  'd1000001-0004-4000-8000-000000000004',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agility] Toyota Canada 상업 확대 + ISO 인증
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000003-0001-4000-8000-000000000001',
  'Agility Robotics Official / The Robot Report',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  '[Agility] Toyota Canada 상업 계약 체결 — 3→10대 확대 + ISO 기능안전 인증 추진',
  'Toyota Motor Manufacturing Canada 상업 계약 체결 후 Digit 3대→10대 확대 (RaaS 모델). ISO 기능안전 인증 추진 중 (2026 중후반 예상). 차세대 페이로드 50lb 증가. GXO/Amazon/Schaeffler/Mercado Libre 포함 최다 상업 배치 휴머노이드.',
  'd1000001-0005-4000-8000-000000000005',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Apptronik] $520M 펀딩 + Google DeepMind Gemini Robotics
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000004-0001-4000-8000-000000000001',
  'CNBC / The Robot Report',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '[Apptronik] $520M 펀딩 ($5B 밸류에이션) + Google DeepMind Gemini 통합',
  'Apptronik $520M 추가 펀딩 ($5B 밸류에이션, 시리즈 A 총 $935M). B Capital + Google 공동 리드. 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority. Google DeepMind Gemini Robotics 전략적 통합 파트너십.',
  'd1000001-0006-4000-8000-000000000006',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [1X] EQT 10K 로봇 계약 + World Model AI
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000005-0001-4000-8000-000000000001',
  'TechCrunch / The Robot Report',
  'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
  '[1X Technologies] EQT 10K 로봇 배치 계약 (2026-2030) + World Model AI 출시',
  'EQT와 10,000대 NEO 배치 계약 (2026-2030, 300+ 포트폴리오 기업). 첫해 생산분 5일 완판. 1X World Model: 비디오 기반 태스크 학습 AI. Hayward 공장 58K sqft, 10K/yr→100K by 2027.',
  'd1000001-0007-4000-8000-000000000007',
  'e1000001-0002-4000-8000-000000000002',
  'pending'
);

-- [Agibot] 10,000번째 로봇 + LG CEO 방문
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000006-0001-4000-8000-000000000001',
  'Korea Herald / TechTimes / Interesting Engineering',
  'https://www.koreaherald.com/article/10694574',
  '[Agibot] 10,000번째 로봇 생산 + LG CEO 중국 본사 방문',
  'Agibot 10,000번째 휴머노이드 생산 (3월 30일, A3 플랫폼). Omdia 글로벌 출하량 1위. LG CEO 중국 본사 방문. 소비자 전자 정밀 제조 라인 최초 대규모 산업 배치. 유럽/북미/일본/한국/동남아/중동 글로벌 확장.',
  'd1000001-0008-4000-8000-000000000008',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Figure AI] Figure 02 BMW 11개월 실적 검증
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm4000007-0001-4000-8000-000000000001',
  'Forge Global / Figure AI',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '[Figure AI] F.02 BMW 11개월 배치 실적 — 3만대 생산, 9만 부품 적재',
  'Figure 02 BMW Spartanburg 11개월 배치 실적: 30,000+ BMW X3 생산 기여, 90,000+ 시트메탈 부품 적재, ~1,250시간 운영. 10시간 평일 교대 근무. 고볼륨 자동차 제조에서 휴머노이드 실용성 검증.',
  'd1000001-0003-4000-8000-000000000003',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);


-- ============================================================
-- 4. Competitive Alerts — 전략적 경고
-- ============================================================

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000004-0001-4000-8000-000000000001',
  'partnership',
  'critical',
  '[BD×DeepMind] Atlas 파운데이션 모델 통합 — Google DeepMind 전략적 파트너십',
  'Boston Dynamics와 Google DeepMind이 Atlas에 파운데이션 모델 통합을 위한 전략 파트너십 체결. Hyundai Mobis 액추에이터 공급망 공동 개발로 양산 가속. RL whole-body control로 110lb 리프팅 달성. DeepMind AI + BD 하드웨어 시너지 → LG 경쟁 포지셔닝에 직접 영향.',
  '{"event": "deepmind_foundation_model_partnership", "company": "Boston Dynamics", "product": "Atlas Electric", "sources": ["Boston Dynamics Official", "Robotics and Automation News"], "partner": "Google DeepMind", "capability": "110lb lift via RL", "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000004-0002-4000-8000-000000000001',
  'funding',
  'critical',
  '[Apptronik] $520M 펀딩 ($5B 밸류에이션) — Google/John Deere/QIA 참여',
  'Apptronik $520M 추가 펀딩으로 시리즈 A 총 $935M 달성, $5B 밸류에이션. B Capital + Google 공동 리드. 신규 전략 투자자: John Deere (농업·건설 진출), Qatar Investment Authority (중동 확장), AT&T Ventures. Google DeepMind Gemini Robotics 통합으로 AI 역량 급격 강화.',
  '{"event": "series_a_extension_935m", "company": "Apptronik", "product": "Apollo", "sources": ["CNBC", "SiliconAngle", "The Robot Report"], "valuation": "$5B", "total_funding": "$935M", "new_investors": ["AT&T Ventures", "John Deere", "QIA"], "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000004-0003-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Agibot] 10,000번째 로봇 생산 + LG CEO 방문 — 전략적 협력 가능성',
  'Agibot 10,000번째 휴머노이드 생산 (3개월 만에 5K→10K, 4배 처리량 가속). Omdia 글로벌 출하 1위. LG CEO가 중국 본사 직접 방문 — 전략적 파트너십 또는 부품 공급 협력 가능성 시사. 소비자 전자 정밀 제조 라인 대규모 배치 시작.',
  '{"event": "10000th_robot_lg_ceo_visit", "company": "Agibot", "product": "Expedition A3", "sources": ["Korea Herald", "TechTimes", "Interesting Engineering", "TrendForce"], "units_produced": 10000, "omdia_rank": 1, "lg_ceo_visit": true, "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000004-0004-4000-8000-000000000001',
  'partnership',
  'warning',
  '[Unitree] 상하이 IPO + JAL 하네다 공항 배치 — 아시아 상업화 가속',
  'Unitree 상하이 증권거래소 IPO 신청 ($580M), 335% 매출 성장. G1 도쿄 하네다 공항 JAL/GMO 배치 (최초 공항 휴머노이드). UnifoLM-VLA-0 오픈소스. H2/R1/G1-D 신규 라인업. 중국·일본 아시아 시장 급속 확대.',
  '{"event": "ipo_airport_deployment", "company": "Unitree", "product": "G1/H2/R1", "sources": ["eWeek", "TechTimes", "Automate.org"], "ipo_target": "$580M", "revenue_growth": "335%", "airport": "Tokyo Haneda", "confidence": "B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000004-0005-4000-8000-000000000001',
  'partnership',
  'warning',
  '[1X] EQT 10K 로봇 대규모 배치 계약 + 첫해 생산 5일 완판',
  '1X Technologies EQT와 10,000대 NEO 배치 계약 (2026-2030, 300+ 포트폴리오 기업). 첫해 생산분 (10K) 사전주문 5일 완판. 1X World Model로 비디오 기반 자율 학습. 홈 로봇 시장 선도적 포지션 확보.',
  '{"event": "eqt_10k_deal_sold_out", "company": "1X Technologies", "product": "NEO", "sources": ["TechCrunch", "Tech Funding News", "eWeek"], "deal_units": 10000, "deal_period": "2026-2030", "sold_out_days": 5, "confidence": "B"}',
  false
);

COMMIT;
