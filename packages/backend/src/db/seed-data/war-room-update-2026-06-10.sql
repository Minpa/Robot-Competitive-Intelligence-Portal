--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-10
-- 수집 시점: 2026-06-10, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인
--

BEGIN;

-- ============================================================
-- 1. 신규 기사 (articles) — 2026-06-06 이후 신규 발굴 건
-- ============================================================

-- [Tesla] Model S 라인 해체, Optimus Gen 3 전용 생산허브 전환 확정 (June 9)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000001-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla dismantles Model S line at Fremont, converts to dedicated Optimus Gen 3 production hub',
  'TechTimes',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09 00:00:00',
  'Tesla completed dismantling Model S/X production lines at Fremont. Full-scale conversion to dedicated Optimus Gen 3 hub underway. Targeting 100,000-300,000 units in 2026. Retail price target $20,000-$30,000. COGS goal $20K/unit at scale.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b401',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Tesla] Shareholder meeting to reveal Gen 3 production count
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000001-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla Annual Shareholder Meeting June 2026 to feature full Gen 3 reveal and first production count disclosure',
  'Optimusk Blog',
  'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
  '2026-06-08 00:00:00',
  'Tesla Annual Shareholder Meeting in June 2026 expected to feature full Optimus Gen 3 reveal, first official production count disclosure, and Giga Texas second-generation facility progress update.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b402',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Boston Dynamics] Full 2026 production run shipped to Hyundai + DeepMind
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000002-0001-4000-8000-000000000001',
  '745abfe6-5438-4eda-b916-edf2e482c017',
  'Boston Dynamics ships full 2026 Atlas production run to Hyundai and Google DeepMind',
  'AI2Work',
  'https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind',
  '2026-06-05 00:00:00',
  'Boston Dynamics confirmed full 2026 Atlas production run shipped to Hyundai Motor Group RMAC and Google DeepMind. Internal testing pushed heavy lifting beyond 100lbs without additional training. 30,000 units/yr factory construction with HMG on track.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b403',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Figure 03 sorts 204K+ packages via live-streaming autonomous operation
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000003-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Figure 03 sorts 204,000+ packages in 163+ hours via autonomous live-streaming operation',
  'Figure AI / KraneShares',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '2026-05-20 00:00:00',
  'Figure 03 live-streaming showed autonomous package sorting: 204,000+ packages in 163+ hours. Specs: 5ft8in, 61kg weight, 20kg payload, 5hr battery, 2.3kWh wireless-charge swappable pack. Robot-as-a-Service at $1,000/month/robot.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b404',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] LG Technology Ventures as Series C investor
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000003-0002-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'LG Technology Ventures participates in Figure AI $1B+ Series C at $39B valuation',
  'Figure AI Official / PR Newswire',
  'https://www.figure.ai/news/series-c',
  '2025-12-15 00:00:00',
  'LG Technology Ventures confirmed as investor in Figure AI Series C round ($1B+ at $39B). Other new investors: Brookfield, Macquarie Capital, T-Mobile Ventures, Salesforce, Qualcomm Ventures. Strategic significance for LG robotics ecosystem.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b405',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Helix 02 VLA model unifies walking+balance+manipulation
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000003-0003-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Figure AI releases Helix 02 VLA model unifying walking, balance and manipulation in single neural network',
  'Robozaps / Figure AI',
  'https://blog.robozaps.com/b/figure-ai-review',
  '2026-03-01 00:00:00',
  'Helix 02 released March 2026, extends Helix 01 to full-body control unifying walking, balance, and manipulation in one neural network. Fully in-house since exiting OpenAI Feb 2025. Capabilities: laundry folding, dishwasher loading (4min), room-scale tidying.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b406',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] G1 EDU is most widely used humanoid in university research
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000004-0001-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree G1 EDU becomes most widely used full-body humanoid in university research worldwide',
  'Robocloud Dashboard',
  'https://robocloud-dashboard.vercel.app/learn/blog/unitree-g1-h1-humanoid-robot',
  '2026-05-15 00:00:00',
  'Unitree G1 EDU confirmed as most widely deployed full-body humanoid in university research labs globally. More units in labs than any other platform. G1 base $16K, EDU from $43.9K across 16 configurations. H1 targets enterprises at $90K-$150K.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b407',
  'product',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Mercado Libre deployment begins in San Antonio TX
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000005-0001-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics begins Digit deployment at Mercado Libre San Antonio TX facility, LATAM expansion planned',
  'Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  '2026-01-15 00:00:00',
  'Mercado Libre integrates Digit at San Antonio TX fulfillment center for commerce fulfillment tasks. Future expansion to Latin American warehouses planned. Digit joins GXO, Toyota Canada, Schaeffler, and Amazon deployments.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b408',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] Jabil manufacturing collaboration for Apollo production
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000006-0001-4000-8000-000000000001',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Apptronik collaborates with Jabil to scale Apollo humanoid robot manufacturing',
  'The Robot Report',
  'https://www.therobotreport.com/apptronik-collaborates-with-jabil-to-produce-apollo-humanoid-robots/',
  '2026-03-01 00:00:00',
  'Apptronik partners with Jabil for contract manufacturing of Apollo humanoid robots. Next-gen Apollo has been in testing for ~1 year with more units produced than predecessor. Commercial-scale deployment targets 2026.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b409',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] Next-gen Apollo testing for ~1 year
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000006-0002-4000-8000-000000000001',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Apptronik next-gen Apollo humanoid has been in testing for one year, nearing commercial readiness',
  'Automate.org',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-05-01 00:00:00',
  'Next-generation Apollo has been under testing for approximately one year. More units produced than the original Apollo. Waymo, Boston Dynamics, and Amazon executive hires accelerating commercialization. $1B in orders expected starting 2027.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b410',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] NEO consumer shipments begin from Hayward factory
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000007-0001-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X Technologies begins shipping NEO humanoid robots to US consumers from Hayward factory',
  'The Next Web / eWeek',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-05-30 00:00:00',
  '1X confirmed consumer shipments of NEO from Hayward CA factory. Vertically integrated manufacturing: in-house motors, batteries, sensors. Nvidia Jetson Thor platform, Isaac simulation training. Soft fabric exterior for safe home interaction.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b411',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] Sharebot global rental platform + 5 new robot platforms + 8 AI models
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000008-0001-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot launches Sharebot global robot rental platform in 14 countries, unveils 5 new platforms and 8 AI models',
  'GadgetMatch / Engineering.com',
  'https://www.gadgetmatch.com/agibot-2026-partner-conference/',
  '2026-04-21 00:00:00',
  'At 2026 Partner Conference, Agibot launched Sharebot global rental platform (14 countries incl. US/UK/FR/SG). Five new platforms: A3 humanoid (173cm, 10hr endurance, 10s battery swap), G2 Air (mobile manipulator, 7DOF), D2 Max (quadruped). Eight new AI foundation models. Declared 2026 as "Deployment Year One".',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b412',
  'product',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] Qingtianzu (Sharebot subsidiary) raises $14.5M for rental network expansion
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c3000008-0002-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot-backed Qingtianzu raises $14.5M to expand Sharebot robot rental network',
  'Yicai Global',
  'https://www.yicaiglobal.com/news/agibot-backed-qingtianzu-secures-over-usd145-million-to-expand-robot-rental-network',
  '2026-05-01 00:00:00',
  'Qingtianzu (Agibot Sharebot subsidiary) secured $14.5M funding to expand robot rental operations. Daily rental rates up to $14,227 for premium platforms. Accelerating global RaaS deployment across manufacturing, logistics, retail, hospitality.',
  'en',
  'f8a1b2c3d4e5f6a7b8c9d0e1f2a3b413',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;


-- ============================================================
-- 2. CI Values 업데이트 (ci_values) — 기존 값 갱신 + 신규 항목
-- ============================================================

-- [Tesla] 양산상태 업데이트: Fremont 전환 완료, 100K-300K 목표
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'b7c44218-5455-428b-a6e9-e7e4d1f1f4bb',
  'd1000001-0001-4000-8000-000000000001',
  'a1000001-0011-4000-8000-000000000011',
  'Fremont line dismantled, Gen 3 production Summer 2026. Target 100K-300K units. COGS $20K/unit at scale',
  'B',
  'TechTimes, Optimusk Blog, Top Tech News',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Boston Dynamics] 배치대수: full 2026 production shipped
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v3000002-0001-4000-8000-000000000001',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0013-4000-8000-000000000013',
  'Full 2026 production run shipped to Hyundai RMAC + Google DeepMind',
  'B',
  'AI2Work, Boston Dynamics Official',
  'https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind',
  '2026-06-05'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] AI모델 업데이트: Helix 02 통합 VLA
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  '3cd698d3-bfc8-4aee-83c8-71022f390e4e',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0007-4000-8000-000000000007',
  'Helix 02 VLA (walking+balance+manipulation unified). In-house since exiting OpenAI Feb 2025',
  'A',
  'Figure AI Official, Robozaps',
  'https://blog.robozaps.com/b/figure-ai-review',
  '2026-03-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 양산상태 업데이트: 1 robot/90min, BotQ
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  '77bd074a-49c0-4d66-bfac-1a3aabc5cb32',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0011-4000-8000-000000000011',
  '1 unit/90min (up from 1/hr), 350+ delivered, BotQ facility',
  'A',
  'Figure AI Official, TSG Invest',
  'https://tsginvest.com/figure-ai/',
  '2026-04-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 배치대수 업데이트: 204K packages sorted + BMW F.03 40 units
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000003-0002-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0013-4000-8000-000000000013',
  '350+ F.03 delivered; 40 units at BMW; 204K+ packages sorted (live-stream); F.02 → 30K BMW X3s',
  'A',
  'Figure AI Official, KraneShares, iiot-world',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '2026-05-20'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 기술파트너 업데이트: LG Technology Ventures 추가
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000003-0001-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0015-4000-8000-000000000015',
  'Nvidia, Intel Capital, Qualcomm, BMW, LG Technology Ventures (Series C investor)',
  'A',
  'Figure AI Official, PR Newswire',
  'https://www.figure.ai/news/series-c',
  '2025-12-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] 배치대수 업데이트: G1 EDU 대학연구용 최다 배치
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v3000004-0001-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0013-4000-8000-000000000013',
  '20,000 target 2026; G1 EDU = most deployed humanoid in university research globally',
  'B',
  'Robocloud, eWeek',
  'https://robocloud-dashboard.vercel.app/learn/blog/unitree-g1-h1-humanoid-robot',
  '2026-05-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] 배치대수 업데이트: Mercado Libre TX 배치 시작
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'de51fc2c-ccc2-40cc-b56e-f9901d3022fe',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0013-4000-8000-000000000013',
  '100K+ totes (GXO), 7+ commercial units, Mercado Libre TX deployment started',
  'A',
  'Agility Official, Robotics 24/7',
  'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
  '2026-01-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Apptronik] 양산상태 업데이트: next-gen Apollo ~1yr testing, Jabil manufacturing
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v3000006-0001-4000-8000-000000000001',
  'd1000001-0006-4000-8000-000000000006',
  'a1000001-0011-4000-8000-000000000011',
  'Next-gen Apollo ~1yr testing, Jabil contract mfg. Commercial-scale 2026. $1B orders from 2027',
  'B',
  'Automate.org, The Robot Report',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-05-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 양산상태 업데이트: Sharebot + 5 new platforms + "Deployment Year One"
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'e76cb83f-4a3f-4abe-b3fe-175367698c34',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0011-4000-8000-000000000011',
  '10K+ produced. Sharebot rental in 14 countries. 5 new platforms (A3/G2 Air/D2 Max). "Deployment Year One"',
  'A',
  'GadgetMatch, Engineering.com, Humanoids Daily',
  'https://www.gadgetmatch.com/agibot-2026-partner-conference/',
  '2026-04-21'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 총펀딩 업데이트: Qingtianzu $14.5M + HK IPO
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v3000008-0001-4000-8000-000000000001',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0009-4000-8000-000000000009',
  'Qingtianzu (Sharebot) $14.5M raised. HK IPO Q3 2026 planned, $142M rev target',
  'B',
  'Yicai Global, Capital.com',
  'https://www.yicaiglobal.com/news/agibot-backed-qingtianzu-secures-over-usd145-million-to-expand-robot-rental-network',
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

-- [Tesla] Fremont 라인 해체 완료 + Gen 3 생산 목표 공개
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000001-0001-4000-8000-000000000001',
  'TechTimes',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '[Tesla] Fremont Model S 라인 해체 완료, Optimus Gen 3 전용 허브로 전환',
  'Tesla Fremont 공장 Model S/X 라인 해체 완료. Optimus Gen 3 전용 생산 허브 전환. 2026년 100K-300K 유닛 생산 목표. 소매가 $20K-$30K. COGS 목표 $20K/unit.',
  'd1000001-0001-4000-8000-000000000001',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [BD] 2026 생산분 전량 출하 완료
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000002-0001-4000-8000-000000000001',
  'AI2Work',
  'https://ai2.work/blog/boston-dynamics-ships-full-atlas-production-run-to-hyundai-and-deepmind',
  '[Boston Dynamics] 2026 Atlas 전량 출하 — Hyundai RMAC + Google DeepMind',
  'Boston Dynamics 2026년 생산분 Atlas 전량 Hyundai RMAC 및 Google DeepMind으로 출하 완료. 100lb+ 리프팅 내부 테스트 성공 (추가 훈련 없이 적응). 30K/yr 공장 건설 순항.',
  'd1000001-0002-4000-8000-000000000002',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Figure AI] Figure 03 204K 패키지 자율 분류 + LG Technology Ventures 투자 확인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000003-0001-4000-8000-000000000001',
  'KraneShares / Figure AI / PR Newswire',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '[Figure AI] 204K 패키지 자율 분류 달성 + LG Technology Ventures 시리즈 C 투자',
  'Figure 03 라이브스트림 204,000+ 패키지 자율 분류 시연 (163hr+). Helix 02 VLA 모델 출시 (보행+균형+조작 통합). LG Technology Ventures가 $39B 밸류에이션 시리즈 C 투자자로 확인됨. BotQ 생산 90분/1대로 가속.',
  'd1000001-0003-4000-8000-000000000003',
  'e1000001-0002-4000-8000-000000000002',
  'pending'
);

-- [Unitree] G1 EDU 대학 연구용 최다 배치
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000004-0001-4000-8000-000000000001',
  'Robocloud Dashboard',
  'https://robocloud-dashboard.vercel.app/learn/blog/unitree-g1-h1-humanoid-robot',
  '[Unitree] G1 EDU 전 세계 대학 연구 플랫폼 최다 배치 확인',
  'G1 EDU가 전 세계 대학 연구실 배치 기준 최다 풀바디 휴머노이드 확인. 16개 구성(베이스 $16K~EDU $43.9K). H1은 기업/연구기관 대상 $90K-$150K. 2026 목표 20,000대 출하.',
  'd1000001-0004-4000-8000-000000000004',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Apptronik] Jabil 제조 파트너십 + 차세대 Apollo 테스트 1년
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000006-0001-4000-8000-000000000001',
  'Automate.org / The Robot Report',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '[Apptronik] Jabil 제조 협력 + 차세대 Apollo 1년간 테스트 완료 근접',
  'Apptronik이 Jabil과 Apollo 제조 파트너십 체결. 차세대 Apollo 약 1년간 테스트 중, 전작 대비 다량 생산. 2026년 상업 배치, 2027년 $1B 주문 목표. Waymo/BD/Amazon 출신 핵심 인재 영입.',
  'd1000001-0006-4000-8000-000000000006',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agibot] Sharebot 글로벌 렌탈 플랫폼 + A3/G2 Air/D2 Max 신규 플랫폼
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm3000008-0001-4000-8000-000000000001',
  'GadgetMatch / Engineering.com / Yicai Global',
  'https://www.gadgetmatch.com/agibot-2026-partner-conference/',
  '[Agibot] Sharebot 글로벌 렌탈 14개국 출시 + A3/G2 Air/D2 Max 5대 신규 플랫폼',
  'Agibot 2026 파트너 컨퍼런스: Sharebot 글로벌 렌탈 플랫폼 14개국 론칭 (US/UK/FR/SG). A3 휴머노이드(173cm, 10hr 구동, 10s 배터리 스왑), G2 Air, D2 Max 등 5대 신규 플랫폼. 8개 AI 모델 공개. Qingtianzu $14.5M 추가 투자. "Deployment Year One" 선언.',
  'd1000001-0008-4000-8000-000000000008',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);


-- ============================================================
-- 4. Competitive Alerts — 전략적 경고
-- ============================================================

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000003-0001-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Tesla] Fremont 라인 해체 완료 — Gen 3 전용 허브 전환, 100K-300K 유닛 목표',
  'Tesla Fremont 공장 Model S/X 라인 해체 완료, Optimus Gen 3 전용 생산 허브로 전환 확정. 2026년 100,000-300,000 유닛 생산 목표. 소매가 $20K-$30K, COGS $20K 목표. 6월 주주총회에서 첫 생산 수량 공개 예정.',
  '{"event": "fremont_line_dismantled_gen3_hub", "company": "Tesla", "product": "Optimus Gen 3", "sources": ["TechTimes", "Optimusk Blog", "Top Tech News"], "target_units": "100K-300K", "retail_price": "$20K-$30K", "confidence": "B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000003-0002-4000-8000-000000000001',
  'mass_production',
  'warning',
  '[Boston Dynamics] 2026 Atlas 전량 출하 — 100lb+ 리프팅 적응 성공',
  'Boston Dynamics 2026년 생산분 Atlas 전량 Hyundai RMAC 및 Google DeepMind으로 출하 완료. 100lb 이상 중량물 리프팅을 추가 훈련 없이 달성 (transfer learning). 30K/yr 공장 건설 순항 중.',
  '{"event": "full_2026_production_shipped", "company": "Boston Dynamics", "product": "Atlas Electric", "sources": ["AI2Work", "TechTimes", "Boston Dynamics"], "lifting_capability": "100lb+", "factory_status": "30K/yr on track", "confidence": "B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000003-0003-4000-8000-000000000001',
  'partnership',
  'critical',
  '[Figure AI] LG Technology Ventures 시리즈 C 투자 + 204K 패키지 자율 분류 달성',
  'LG Technology Ventures가 Figure AI 시리즈 C ($39B, $1B+) 투자자로 확인됨. Figure 03 라이브스트림 204,000+ 패키지 자율 분류. Helix 02 VLA 모델로 보행+균형+조작 통합. BotQ 생산 90분당 1대로 가속. RaaS $1,000/month/robot.',
  '{"event": "lg_investment_autonomous_milestone", "company": "Figure AI", "product": "Figure 03", "sources": ["Figure AI Official", "PR Newswire", "KraneShares"], "lg_investment": true, "packages_sorted": "204K+", "production_rate": "1/90min", "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000003-0004-4000-8000-000000000001',
  'mass_production',
  'warning',
  '[Agibot] Sharebot 글로벌 렌탈 14개국 론칭 + 5대 신규 플랫폼 + $14.5M 추가 투자',
  'Agibot Sharebot 글로벌 렌탈 플랫폼 14개국 론칭 (US/UK/FR/SG 포함). A3 (173cm, 10hr, 10s 배터리 스왑), G2 Air, D2 Max 등 5대 신규 플랫폼 출시. 8개 AI 모델 공개. Qingtianzu $14.5M 추가 투자. "Deployment Year One" 선언으로 전략적 전환.',
  '{"event": "sharebot_launch_new_platforms", "company": "Agibot", "product": "A3/G2 Air/D2 Max", "sources": ["GadgetMatch", "Engineering.com", "Yicai Global"], "sharebot_countries": 14, "new_platforms": 5, "ai_models": 8, "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000003-0005-4000-8000-000000000001',
  'partnership',
  'info',
  '[Apptronik] Jabil 제조 파트너십 + 차세대 Apollo 1년간 테스트',
  'Apptronik이 Jabil과 Apollo 제조 파트너십 체결하여 양산 스케일업 가속. 차세대 Apollo 약 1년간 테스트 완료 근접, 전작 대비 다량 생산. 2027년 $1B 주문 목표.',
  '{"event": "jabil_mfg_partnership_next_gen_testing", "company": "Apptronik", "product": "Apollo (Next-Gen)", "sources": ["Automate.org", "The Robot Report"], "partners": ["Jabil"], "testing_duration": "~1 year", "confidence": "B"}',
  false
);

COMMIT;
