--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-17
-- 수집 시점: 2026-06-17, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인
-- 이전 업데이트: 2026-06-11
--

BEGIN;

-- ============================================================
-- 1. 신규 기사 (articles) — 2026-06-11 이후 신규 발굴 건
-- ============================================================

-- [Tesla] Optimus Gen 3 핸드 50 액추에이터/22 DoF + 24/7 공장 자율 테스트
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla Optimus Gen 3 hands with 50 actuators and 22 DoF begin 24/7 autonomous factory shift tests in Q2 2026',
  'TechTimes / Optimusk Blog',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '2026-06-09 00:00:00',
  'Tesla Optimus Gen 3 hands feature 50 actuators and 22 degrees of freedom. First 24/7 autonomous factory shift tests began Q2 2026. V3 full body production targeted for Summer 2026. 12+ Chinese Tier 1/2 suppliers certified for V3 supply chain. Late 2026 first external B2B customers at premium pricing (above eventual $20-30K target).',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30701',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Tesla] Optimus 10M 단위 장기 생산 목표 — Giga Texas 신공장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla targets 10M Optimus units with new dedicated Texas plant, second factory summer 2027',
  'The Robot Report',
  'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  '2026-06-12 00:00:00',
  'Tesla constructing second Optimus factory at Giga Texas with production start summer 2027. Fremont conversion from Model S/X line (ended May 2026) to begin Optimus production late July-August 2026. Tesla stated ambition: 1M/yr Fremont, scaling to 10M/yr at Texas. Musk warns initial output "quite slow" given 10,000 unique parts.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30702',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Boston Dynamics] Hyundai $26B 미국 투자 — 로봇 공장 30,000대/년 생산 계획
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0003-4000-8000-000000000001',
  '745abfe6-5438-4eda-b916-edf2e482c017',
  'Hyundai announces $26B US investment including robotics factory capable of producing 30,000 robots per year',
  'Hyundai Motor Group Newsroom / New Atlas',
  'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
  '2026-06-15 00:00:00',
  'Hyundai Motor Group announced $26B US investment including new robotics factory for 30,000 robots/year production. All 2026 Atlas deployments fully committed — fleets shipping to RMAC and Google DeepMind. Atlas deployment at Hyundai Metaplant America (Savannah, GA) by 2028. Atlas specs: 7.5ft reach, 110lb lift, -4 to 104°F operating range.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30703',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] BMW Leipzig 유럽 파일럿 Hexagon AEON 선택 — Figure 03 추가 평가 중
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0004-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'BMW Leipzig European pilot selects Hexagon AEON over Figure 03; BMW evaluating Figure 03 for additional use cases',
  'BMW Group Official / Thomas Net',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  '2026-06-10 00:00:00',
  'BMW Plant Leipzig European pilot selected Hexagon Robotics AEON (wheeled humanoid from Zurich) instead of Figure 03. BMW and Figure publicly state they are evaluating Figure 03 for additional use cases. Figure 03 demo: 204,000+ packages sorted in 163+ hours (live stream). Figure split from OpenAI, developed own Helix VLA model.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30704',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] 상하이 증권거래소 상장위 통과 (6/1) — STAR Market 승인
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0005-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree clears Shanghai Stock Exchange listing committee for STAR Market IPO — first embodied AI A-share approval',
  'CNBC / China Minutes / TechTimes',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  '2026-06-01 00:00:00',
  'Unitree cleared Shanghai SSE listing-committee review on June 1, 2026 — first "embodied AI" company approved for A-share STAR Market. Plans to raise ¥4.2B ($616M) for robot R&D, new products, and manufacturing base construction. NVIDIA Isaac GR00T reference design announced with H2 Plus + Sharpa 5-finger hands + Jetson Thor. H2 Plus available late 2026.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30705',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] NVIDIA H2 Plus 레퍼런스 디자인 발표
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0006-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'NVIDIA announces Isaac GR00T reference humanoid design using Unitree H2 Plus with Jetson Thor and Sharpa hands',
  'NVIDIA Newsroom / Global Times',
  'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
  '2026-06-03 00:00:00',
  'NVIDIA Isaac GR00T open reference design combines Unitree H2 Plus humanoid body, Sharpa five-fingered hands, and NVIDIA Jetson Thor (Blackwell GPU) onboard compute. Targeted at universities (Stanford included) and research institutions. H2 Plus: ~6ft tall. Platform enables standardized humanoid research and development.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30706',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] "Agility"로 리브랜딩 — 산업 확장 전략
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0007-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics rebrands to Agility, expanding from robotics into broader humanoid automation industry',
  'BusinessWire / The Robot Report',
  'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
  '2026-03-06 00:00:00',
  'Agility Robotics rebrands as "Agility" to signal expansion beyond robotics into broader humanoid automation. New Digit features: 4-hour battery, Category 1 stop, Safety PLC, wireless teach pendant, robust limbs. On track for first cooperatively safe humanoid delivery in 2026. Current deployments: Toyota Canada (10 Digit RaaS), GXO, Amazon, Schaeffler.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30707',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] Apollo 유럽 다중 시설 배치 + 신규 버전 2026 데뷔
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0008-4000-8000-000000000001',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Apptronik Apollo deployed across multiple Mercedes-Benz European facilities; new robot version to debut in 2026',
  'Automate.org / Apptronik',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-06-12 00:00:00',
  'Apollo deployment expanded to multiple Mercedes-Benz European assembly facilities across three task categories. Next-gen Apollo version set to debut in 2026 — tested for a year in stealth. Specs: 5ft8in(173cm), 160lbs(73kg), 55lbs(25kg) payload, 4hr battery. John Deere investment signals agriculture/construction expansion.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30708',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] NEO Factory Hayward 풀스케일 생산 개시 (4/30)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0009-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X opens NEO Factory in Hayward CA — first vertically integrated humanoid factory in US, full-scale production commenced',
  'GlobeNewsWire / The Robot Report',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '2026-04-30 00:00:00',
  '1X NEO Factory Hayward CA commenced full-scale production April 30, 2026. 58,000 sqft, 200+ US jobs. Vertically integrated: motors, batteries, structures, transmission, sensors all in-house. 10K units/yr capacity → 100K by end 2027 (San Carlos expansion). $20K purchase or $499/mo subscription. First consumer shipments 2026. Human-in-the-loop teleoperation for initial phase.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30709',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] 홍콩 IPO Q3 2026 계획 — $5.1-6.4B 밸류에이션
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c5000001-0010-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot plans Hong Kong IPO in Q3 2026 targeting HK$40-50B valuation with CICC and Morgan Stanley as sponsors',
  'Reuters / Medium / Capital.com',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-06-15 00:00:00',
  'Agibot targeting HK IPO Q3 2026 at HK$40-50B ($5.1-6.4B) valuation, selling 15-25% shares (potentially raising $1B+). Joint sponsors: CICC, CITIC Securities, Morgan Stanley. Investors: Tencent, HongShan (ex-Sequoia China), LG Electronics, Mirae Asset, BYD, Hillhouse. AGIBOT World Dataset ecosystem. Consumer electronics manufacturing line deployment confirmed.',
  'en',
  'e5a1b2c3d4e5f6a7b8c9d0e1f2a30710',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;


-- ============================================================
-- 2. CI Values 업데이트 (ci_values) — 기존 값 갱신 + 신규 항목
-- ============================================================

-- [Tesla] 양산 일정 업데이트: Fremont Jul-Aug 2026 + Giga TX Summer 2027
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0001-4000-8000-000000000001',
  'd1000001-0001-4000-8000-000000000001',
  'a1000001-0013-4000-8000-000000000013',
  'Gen 3 Fremont production Jul-Aug 2026 start. Gen 3 hands: 50 actuators/22 DoF, 24/7 factory tests Q2. Giga TX 2nd factory Summer 2027. 12+ Chinese Tier 1/2 suppliers certified. Late 2026 first external B2B at premium pricing. 10M/yr long-term target',
  'B',
  'TechTimes, Robot Report, Electrek, Optimusk Blog',
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

-- [Boston Dynamics] 양산 업데이트: Hyundai $26B + 30K/yr 로봇 공장
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0002-4000-8000-000000000001',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0013-4000-8000-000000000013',
  '2026 deployments fully committed (RMAC + Google DeepMind). Hyundai $26B US investment includes robotics factory 30K/yr. Metaplant America (Savannah GA) deployment by 2028. CES 2026 Best Robot Award',
  'A',
  'Hyundai Motor Group Newsroom, New Atlas, CNET',
  'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
  '2026-06-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 배치/경쟁 업데이트: BMW Leipzig → Hexagon AEON, F.03 204K 패키지
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0003-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0013-4000-8000-000000000013',
  'F.02 BMW Spartanburg ongoing. BMW Leipzig EU pilot chose Hexagon AEON (competitor). F.03: 204K+ pkgs sorted/163+ hrs (live). Helix VLA model (split from OpenAI). $39B valuation. Consumer launch late 2026 earliest',
  'B',
  'BMW Group Official, Thomas Net, Figure AI, Forge Global',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  '2026-06-10'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] IPO 진행 업데이트: 상장위 통과 → STAR Market 승인
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0004-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0009-4000-8000-000000000009',
  'SSE listing committee CLEARED (June 1) — first embodied AI A-share approval. ¥4.2B ($616M) raise target. NVIDIA H2 Plus + Jetson Thor reference design. H2 Plus late 2026 availability',
  'A',
  'CNBC, China Minutes, TechTimes, NVIDIA Newsroom',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  '2026-06-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] 기술파트너 업데이트: NVIDIA Isaac GR00T 공식 레퍼런스
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0005-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0015-4000-8000-000000000015',
  'NVIDIA (Isaac GR00T reference design, Jetson Thor), Sharpa (5-finger hands), Stanford (research partner). Target: universities + research institutions',
  'A',
  'NVIDIA Newsroom, Global Times, CNBC',
  'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
  '2026-06-03'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] HW 업데이트: 4hr 배터리 + Safety PLC + Cat 1 Stop
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0006-4000-8000-000000000001',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0013-4000-8000-000000000013',
  'Rebrand: "Agility" (March 2026). 4hr battery, Cat 1 stop, Safety PLC, wireless teach pendant. Cooperatively safe humanoid 2026 delivery. Toyota Canada 10 units (RaaS). Next-gen 50lb payload',
  'A',
  'BusinessWire, The Robot Report, Technology Magazine',
  'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
  '2026-03-06'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Apptronik] 배치 업데이트: Mercedes EU 다중 시설 + 차세대 Apollo 2026
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0007-4000-8000-000000000001',
  'd1000001-0006-4000-8000-000000000006',
  'a1000001-0013-4000-8000-000000000013',
  'Apollo at multiple Mercedes-Benz EU facilities (3 task categories). Next-gen Apollo debuting 2026 (tested 1yr in stealth). Specs: 173cm/73kg/25kg payload/4hr. John Deere investor → agriculture/construction',
  'B',
  'Automate.org, Apptronik Official, CNBC',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '2026-06-12'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] 양산 업데이트: Hayward 풀스케일 + 수직통합
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0008-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0013-4000-8000-000000000013',
  'Hayward factory full-scale production (Apr 30). 58K sqft, 200+ jobs, fully vertical (motors/batteries/sensors in-house). $20K or $499/mo. 10K→100K by end 2027 (San Carlos). Human-in-loop teleoperation initial phase',
  'A',
  'GlobeNewsWire, The Robot Report, TNW',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '2026-04-30'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] IPO 업데이트: 홍콩 Q3 2026, $5.1-6.4B 밸류에이션
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v5000001-0009-4000-8000-000000000001',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0009-4000-8000-000000000009',
  'HK IPO Q3 2026, HK$40-50B ($5.1-6.4B) valuation, 15-25% shares (~$1B+ raise). CICC/CITIC/Morgan Stanley sponsors. Investors: Tencent, HongShan, LG, Mirae, BYD, Hillhouse. AGIBOT World Dataset ecosystem',
  'B',
  'Reuters, Capital.com, Medium',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-06-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();


-- ============================================================
-- 3. CI Monitor Alerts — 신규 감지 알림 (2026-06-11 이후)
-- ============================================================

-- [Tesla] Gen 3 생산 시작 임박 + 중국 공급망 확보
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0001-4000-8000-000000000001',
  'TechTimes / Robot Report / Electrek',
  'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
  '[Tesla] Optimus Gen 3 Fremont 양산 7-8월 시작 — 50 액추에이터 핸드, 24/7 공장 테스트 진행 중',
  'Optimus Gen 3 Fremont 양산 7~8월 시작 예정. Gen 3 핸드: 50 액추에이터/22 DoF, Q2부터 24/7 자율 공장 교대 테스트. 12+ 중국 Tier1/2 공급업체 인증. Giga Texas 2차 공장 Summer 2027. 2026 말 첫 외부 B2B 고객 (프리미엄 가격). 장기 10M/yr 목표.',
  'd1000001-0001-4000-8000-000000000001',
  'e1000001-0001-4000-8000-000000000001',
  'pending'
);

-- [Boston Dynamics] Hyundai $26B 투자 + 30K/yr 로봇 공장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0002-4000-8000-000000000001',
  'Hyundai Motor Group Newsroom / New Atlas',
  'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
  '[Boston Dynamics] Hyundai $26B 미국 투자 — 30,000대/년 로봇 공장 건설 계획',
  'Hyundai Motor Group $26B 미국 투자 계획 발표, 로봇 공장 30,000대/년 생산 능력 포함. 2026년 Atlas 배치 전량 확정 (RMAC + Google DeepMind). Metaplant America (Savannah GA) 2028년 배치 예정. Atlas: 7.5ft reach, 110lb lift, -4~104°F.',
  'd1000001-0002-4000-8000-000000000002',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Figure AI] BMW Leipzig 경쟁사 선택 + Helix VLA 독자 AI
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0003-4000-8000-000000000001',
  'BMW Group Official / Thomas Net',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  '[Figure AI] BMW Leipzig 유럽 파일럿에서 Hexagon AEON에 밀려 — F.03 204K 패키지 분류 데모',
  'BMW Leipzig 유럽 파일럿에서 Hexagon AEON(취리히, 휠형) 선택 → Figure 03 탈락. BMW-Figure는 추가 유즈케이스 평가 중. Figure 03: 204,000+ 패키지 163시간 자율 분류 (라이브스트림). OpenAI 분리 후 자체 Helix VLA 모델 개발. 시리즈 C $1B+ 조달, $39B 밸류에이션.',
  'd1000001-0003-4000-8000-000000000003',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Unitree] SSE 상장위 통과 + NVIDIA 레퍼런스 디자인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0004-4000-8000-000000000001',
  'CNBC / China Minutes / NVIDIA Newsroom',
  'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
  '[Unitree] SSE STAR Market 상장위 통과 (6/1) + NVIDIA H2 Plus 공식 레퍼런스 채택',
  'Unitree 6월 1일 상하이 증권거래소 STAR Market 상장위 통과 — 최초 "체화 AI" 기업 A주 승인. ¥4.2B ($616M) 모집 목표. NVIDIA Isaac GR00T 레퍼런스 디자인 공식 채택 (H2 Plus + Sharpa 5핑거 + Jetson Thor). Stanford 등 대학 연구 파트너십.',
  'd1000001-0004-4000-8000-000000000004',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agility] 리브랜딩 + 안전 기능 강화
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0005-4000-8000-000000000001',
  'BusinessWire / The Robot Report',
  'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
  '[Agility] "Agility"로 리브랜딩 — 4시간 배터리, Safety PLC, 협동안전 로봇 2026 출시',
  '"Agility Robotics"에서 "Agility"로 리브랜딩 (3월 2026). Digit 안전 기능 대폭 강화: 4시간 배터리, Category 1 stop, Safety PLC, 무선 티치펜던트. 2026년 최초 협동안전(cooperatively safe) 휴머노이드 출시 예정. 차세대 50lb 페이로드.',
  'd1000001-0005-4000-8000-000000000005',
  'e1000001-0005-4000-8000-000000000005',
  'pending'
);

-- [Apptronik] 차세대 Apollo + Mercedes EU 확장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0006-4000-8000-000000000001',
  'Automate.org / Apptronik Official',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  '[Apptronik] 차세대 Apollo 2026 데뷔 예정 — Mercedes 유럽 다중 시설 배치 확대',
  'Apptronik 차세대 Apollo 2026년 데뷔 예정 (1년간 스텔스 테스트 완료). Mercedes-Benz 유럽 다중 조립 시설로 배치 확대 (3개 태스크 카테고리). John Deere 투자 → 농업/건설 영역 진출 시그널. 현재 스펙: 173cm/73kg/25kg payload/4hr battery.',
  'd1000001-0006-4000-8000-000000000006',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [1X] NEO 공장 풀스케일 생산 + 수직통합 제조
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0007-4000-8000-000000000001',
  'GlobeNewsWire / The Robot Report / TNW',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '[1X Technologies] NEO Factory 풀스케일 생산 개시 — 미국 최초 수직통합 휴머노이드 공장',
  '1X NEO Factory Hayward CA 풀스케일 생산 개시 (4/30). 58,000 sqft, 200+ 일자리, 미국 최초 수직통합 휴머노이드 공장 (모터/배터리/센서 자체 생산). $20K 구매 또는 $499/월 구독. 초기 인간-in-the-loop 원격조종. San Carlos 확장 → 100K/yr 2027년 말.',
  'd1000001-0007-4000-8000-000000000007',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agibot] 홍콩 IPO Q3 2026 계획
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm5000001-0008-4000-8000-000000000001',
  'Reuters / Capital.com / Medium',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '[Agibot] 홍콩 IPO Q3 2026 계획 — HK$40-50B ($5.1-6.4B) 밸류에이션, CICC/Morgan Stanley',
  'Agibot 홍콩 IPO Q3 2026 계획 발표. HK$40-50B ($5.1-6.4B) 밸류에이션, 15-25% 지분 매각 ($1B+ 조달 예상). CICC, CITIC Securities, Morgan Stanley 공동 주관사. 소비자 전자 정밀 제조 라인 대규모 배치 확인. AGIBOT World Dataset 오픈 데이터 생태계 구축.',
  'd1000001-0008-4000-8000-000000000008',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);


-- ============================================================
-- 4. Competitive Alerts — 전략적 경고
-- ============================================================

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000005-0001-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Tesla] Optimus Gen 3 Fremont 양산 7-8월 시작 — 10M 장기 목표, 중국 공급망 확보',
  'Tesla Optimus Gen 3 Fremont 생산 7~8월 시작. Gen 3 핸드 50 액추에이터/22 DoF, 24/7 공장 자율 테스트 진행. Giga Texas 2차 공장 2027년 여름. 12+ 중국 Tier 1/2 공급업체 인증 완료. Model S/X 라인 5월 종료 → Optimus 전환. LG 로봇 사업에 양산 스케일에서 직접적 위협.',
  '{"event": "gen3_fremont_production_start", "company": "Tesla", "product": "Optimus Gen 3", "sources": ["TechTimes", "Robot Report", "Electrek"], "production_start": "Jul-Aug 2026", "hand_actuators": 50, "hand_dof": 22, "chinese_suppliers": "12+", "giga_tx_2nd": "Summer 2027", "confidence": "B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000005-0002-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Hyundai×BD] $26B 미국 투자 + 30K/yr 로봇 공장 — 양산 스케일 선도',
  'Hyundai Motor Group $26B 미국 투자 계획, 30,000대/년 로봇 전용 공장 포함. 2026년 Atlas 배치 전량 확정. BD Atlas: 7.5ft reach, 110lb lift, -4~104°F. 현대-BD 수직통합 양산 체계는 LG의 양산 파트너/자체 공장 전략 수립에 중요한 벤치마크.',
  '{"event": "hyundai_26b_robot_factory", "company": "Boston Dynamics", "product": "Atlas", "sources": ["Hyundai Newsroom", "New Atlas"], "investment": "$26B", "factory_capacity": "30K/yr", "deployment_committed": "all 2026", "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000005-0003-4000-8000-000000000001',
  'partnership',
  'warning',
  '[Unitree×NVIDIA] H2 Plus Isaac GR00T 공식 레퍼런스 + STAR Market IPO 승인',
  'NVIDIA가 Unitree H2 Plus를 Isaac GR00T 공식 레퍼런스 디자인으로 채택 (Jetson Thor + Sharpa 핸드). Stanford 등 대학 연구 파트너십. SSE STAR Market 상장위 통과 (6/1) — 최초 체화 AI A주 승인. ¥4.2B 모집 목표. NVIDIA 생태계 표준화 → Unitree 플랫폼 lock-in 위험.',
  '{"event": "nvidia_reference_design_ipo_cleared", "company": "Unitree", "product": "H2 Plus", "sources": ["NVIDIA Newsroom", "CNBC", "China Minutes"], "nvidia_platform": "Isaac GR00T + Jetson Thor", "ipo_status": "listing committee cleared", "ipo_raise": "$616M", "confidence": "A"}',
  false
);

COMMIT;
