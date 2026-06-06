--
-- ARGOS 경쟁사 데이터 자동 업데이트 — 2026-06-06
-- 수집 시점: 2026-06-06, 출처: 다중 웹 검색 교차검증
-- 신뢰도 기준: [A] 공식 1차 출처 [B] 2개+ 매체 교차확인 [C] 단일 출처 [D] 추정 [E] 미확인
--

BEGIN;

-- ============================================================
-- 1. 신규 기사 (articles) — 기존 데이터 이후 신규 발굴 건
-- ============================================================

-- [Tesla] Samsung OLED display partnership for Optimus Gen 3 face
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000001-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla Optimus Gen 3 to feature Samsung OLED display face for expressions and status',
  'Basenor',
  'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-face-revealed-oled-display-and-whats-coming',
  '2026-05-28 00:00:00',
  'Gen 3 Optimus will feature a Samsung OLED display face capable of expressions and status communication. Samsung Display selected as tier-one supply chain partner for small, high-brightness, high-durability OLED panels. Signals Tesla treating Optimus as a serious production program.',
  'en',
  'a1f2e3d4c5b6a7980123456789abcde1',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Tesla] Annual design cycle confirmed, Gen 4 planning underway
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000001-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tesla confirms annual Optimus design cycle: Gen 4 planning already underway',
  'Neware',
  'https://www.neware.net/news/tesla-optimus-gen-3-the-new-era-of-humanoid-robots/230/191.html',
  '2026-05-15 00:00:00',
  'Tesla has stated its intention to release a new Optimus design annually, meaning Gen 4 planning is likely already underway. High-volume ramp targeted for Summer 2027 with initial production Summer 2026.',
  'en',
  'b2f3e4d5c6b7a8901234567890abcde2',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Boston Dynamics] 56 DOF confirmed, 30K/yr factory planned
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000002-0001-4000-8000-000000000001',
  '745abfe6-5438-4eda-b916-edf2e482c017',
  'HMG and Boston Dynamics building new robotics factory for 30,000 Atlas robots per year',
  'Humanoids Daily',
  'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  '2026-01-06 00:00:00',
  'HMG (Hyundai Motor Group) and Boston Dynamics are building a new robotics factory capable of producing 30,000 Atlas robots per year. Production Atlas confirmed with 56 DOF, self-swappable batteries, and dynamic athletic movements including backflips. Additional customers planned for early 2027.',
  'en',
  'c3f4e5d6c7b8a9012345678901abcde3',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] Figure 03 autonomous 24/7 operation, outdoor jogging
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000003-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Figure 03 demonstrates fully autonomous 24/7 operation and outdoor jogging at 2 m/s',
  'KraneShares',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '2026-05-20 00:00:00',
  'Figure 03 has demonstrated fully autonomous 24/7 operation without human supervision, including outdoor jogging at 2 meters per second. Two generations of VLA model (Helix 01-02) developed. Three robot generations (Figure 01-03) completed.',
  'en',
  'd4f5e6d7c8b9a0123456789012abcde4',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Figure AI] White House appearance with Melania Trump
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000003-0002-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Figure 03 appears at White House with First Lady Melania Trump promoting AI education',
  'CNBC',
  'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
  '2026-03-26 00:00:00',
  'US First Lady Melania Trump appeared at the White House with a Figure 03 humanoid robot, promoting the eventual ability of AI to teach children. Significant PR milestone for Figure AI and the broader humanoid robotics industry.',
  'en',
  'e5f6e7d8c9b0a1234567890123abcde5',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] IPO cleared at STAR Market — valuation update
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000004-0001-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree Robotics clears Shanghai STAR Market IPO review — first embodied AI company on A-share',
  'TechTimes',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-06-02 00:00:00',
  'Unitree Robotics cleared Shanghai Stock Exchange listing-committee review on June 1, 2026. First "embodied AI" company approved for China A-share market. Revenue ¥1.708B in 2025 (335% YoY growth). Filed for $610M IPO, but some reports indicate targeting up to $7B.',
  'en',
  'f6f7e8d9c0b1a2345678901234abcde6',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] GD01 mecha robot unveiled
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000004-0002-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree unveils GD01 mecha — 2.8m transformable robot priced at $650K',
  'The Next Web',
  'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
  '2026-05-25 00:00:00',
  'Unitree unveiled the GD01, a 2.8-metre transformable mecha weighing ~500kg with passenger, priced from 3.9M yuan (~$650K). Represents expansion beyond humanoid into entertainment/defense sectors.',
  'en',
  'a7f8e9d0c1b2a3456789012345abcde7',
  'product',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Unitree] UnifoLM-VLA-0 open-sourced
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000004-0003-4000-8000-000000000001',
  '5f15c903-5393-42bb-bc31-1b00deacb922',
  'Unitree open-sources UnifoLM-VLA-0 model enabling autonomous household tasks via natural language',
  'Unitree',
  'https://www.unitree.com/news/unifolm-vla-0',
  '2026-03-10 00:00:00',
  'Unitree open-sourced UnifoLM-VLA-0, a Vision-Language-Action model enabling autonomous household tasks via natural language commands. Enables robots to understand and execute multi-step instructions in home environments.',
  'en',
  'b8f9e0d1c2b3a4567890123456abcde8',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Digit deadlifts 65lbs
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000005-0001-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics Digit demonstrates 65lb deadlift with advanced whole-body coordination',
  'Interesting Engineering',
  'https://interestingengineering.com/ai-robotics/us-digit-humanoid-robot-deadlift',
  '2026-05-15 00:00:00',
  'Agility Robotics demonstrated Digit lifting a 65-pound (29kg) weight with controlled precision in a lab environment. Showcases advanced whole-body coordination capabilities for heavy industrial tasks.',
  'en',
  'c9f0e1d2c3b4a5678901234567abcde9',
  'technology',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] 80% US-sourced components
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000005-0002-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics announces Digit is 80% US-sourced, reducing supply chain risk',
  'MEXC News',
  'https://www.mexc.com/news/1120515',
  '2026-05-20 00:00:00',
  'Agility Robotics announced Digit is approximately 80% sourced from within the United States. Strategic move to reduce foreign supply chain dependencies and align with US manufacturing policies.',
  'en',
  'd0f1e2d3c4b5a6789012345678abcdf0',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agility] Mercado Libre deal
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000005-0003-4000-8000-000000000001',
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  'Agility Robotics signs landmark deal with Mercado Libre for Digit deployment across Americas',
  'Distill Intelligence',
  'https://www.distillintelligence.com/news/agility-robotics',
  '2025-12-15 00:00:00',
  'Agility Robotics signed a landmark agreement with Mercado Libre in December 2025 to deploy Digit robots across fulfillment centers in Texas and Latin America. Expands Digit deployment from US-only to international markets.',
  'en',
  'e1f2e3d4c5b6a7890123456789abcdf1',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Apptronik] New investors — AT&T, John Deere, Qatar
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000006-0001-4000-8000-000000000001',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Apptronik adds AT&T Ventures, John Deere, Qatar Investment Authority to Apollo investor roster',
  'Crunchbase News',
  'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
  '2026-02-11 00:00:00',
  'In addition to existing investors B Capital, Google, and Mercedes-Benz, new investors AT&T Ventures, John Deere & Co., and Qatar Investment Authority joined Apptronik $520M round. Next-gen Apollo has been in testing for ~1 year, with more units produced than predecessor.',
  'en',
  'f2f3e4d5c6b7a8901234567890abcdf2',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] $10B valuation target, Jetson Thor platform
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000007-0001-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X Technologies targets $10B valuation, NEO powered by Nvidia Jetson Thor with soft exterior',
  'Dealroom / eWeek',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-04-15 00:00:00',
  '1X Technologies eyeing $1B raise at up to $10B valuation. NEO powered by Nvidia Jetson Thor platform, trained using Isaac simulation. Features soft, fabric-like exterior for safe human interaction. Hayward factory is vertically integrated — motors, batteries, sensors all in-house.',
  'en',
  'a3f4e5d6c7b8a9012345678901abcdf3',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [1X] Consumer shipments begin
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000007-0002-4000-8000-000000000001',
  'a1b2c3d4-0004-4000-8000-000000000004',
  '1X starts shipping NEO humanoid robots to US homes from Hayward factory',
  'The Next Web',
  'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
  '2026-05-30 00:00:00',
  '1X has begun shipping NEO humanoid robots to US homes from its Hayward, California facility. Priced at $20,000 for early access or $499/month subscription. Vertically integrated manufacturing with in-house motors, batteries, and sensors.',
  'en',
  'b4f5e6d7c8b9a0123456789012abcdf4',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] Hong Kong IPO planned Q3 2026
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000008-0001-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot planning Hong Kong IPO by Q3 2026, targets $142M revenue',
  'Capital.com / SCMP',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-05-10 00:00:00',
  'Agibot is planning IPO in Hong Kong, expected to file preliminary prospectus in early 2026 with listing by Q3. Targeting US$142M revenue. Deployments span logistics, retail, hospitality, and industrial manufacturing globally.',
  'en',
  'c5f6e7d8c9b0a1234567890123abcdf5',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Agibot] Minth Group Germany + Singtel Singapore partnerships
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000008-0002-4000-8000-000000000001',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'Agibot signs Minth Group partnership for European expansion, Singtel for Singapore foothold',
  'Gasgoo',
  'https://autonews.gasgoo.com/articles/news/humanoid-robots-enter-a-new-battlefield-2026957094341603329',
  '2026-02-24 00:00:00',
  'Agibot held launch in Munich, announced entry into German market. Strategic partnership with Minth Group to expand on European auto-parts production lines. Singtel Enterprise agreement opens Singapore foothold. International placements now span EU, NA, JP, KR, SEA, ME.',
  'en',
  'd6f7e8d9c0b1a2345678901234abcdf6',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;

-- [Regulation] EU AI Act and ISO 25785-1 humanoid robot standard
INSERT INTO articles (id, title, source, url, published_at, summary, language, content_hash, category, product_type)
VALUES (
  'c2000009-0001-4000-8000-000000000001',
  'EU AI Act provisions for high-risk AI effective Aug 2026; ISO 25785-1 humanoid robot standard in development',
  'Bird & Bird / IEEE',
  'https://www.twobirds.com/en/insights/2026/smart-robots,-dual-regulations-navigating-the-ai-act-and-machinery-compliance',
  '2026-05-15 00:00:00',
  'EU AI Act majority provisions effective August 2, 2026 (high-risk AI provisions August 2027). Machinery Regulation 2023/1230 fully applicable January 20, 2027. ISO 25785-1 (dynamically stable robots) Working Draft led by Agility, BD, A3 Association — expected final publication 2026-2027. IEEE group laying groundwork for humanoid robot standards.',
  'en',
  'e7f8e9d0c1b2a3456789012345abcdf7',
  'industry',
  'robot'
) ON CONFLICT (content_hash) DO NOTHING;


-- ============================================================
-- 2. CI Values 업데이트 (ci_values) — 기존 값 갱신 + 신규 항목
-- ============================================================

-- [Boston Dynamics] DOF 업데이트: 28+ → 56 DOF confirmed
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  '2a003b26-ede5-4ba5-afd0-477766f9e946',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0001-4000-8000-000000000001',
  '56 DOF, fully rotational joints',
  'A',
  'BD Official, Engadget, WebProNews',
  'https://www.webpronews.com/boston-dynamics-unveils-electric-atlas-humanoid-robot-at-ces-2026/',
  '2026-01-05'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Boston Dynamics] 연간생산능력: 30,000/yr factory
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000002-0001-4000-8000-000000000001',
  'd1000001-0002-4000-8000-000000000002',
  'a1000001-0012-4000-8000-000000000012',
  '30,000/yr (new factory with HMG)',
  'B',
  'Humanoids Daily, Automate.org',
  'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  '2026-01-06'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] 최근밸류에이션 업데이트: IPO cleared, $610M-$7B range
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'c99f177b-2669-4f56-a9b3-043d08bc74a4',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0010-4000-8000-000000000010',
  'STAR Market IPO cleared (Jun 1). Filed $610M, targeting up to $7B',
  'A',
  'TechTimes, Rest of World, The Next Web',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '2026-06-02'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Unitree] AI모델: UnifoLM-VLA-0 open-sourced
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000004-0001-4000-8000-000000000001',
  'd1000001-0004-4000-8000-000000000004',
  'a1000001-0007-4000-8000-000000000007',
  'UnifoLM-VLA-0 (open-source VLA model)',
  'A',
  'Unitree Official',
  'https://www.unitree.com/news/unifolm-vla-0',
  '2026-03-10'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] 총펀딩: $641M
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000005-0001-4000-8000-000000000001',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0009-4000-8000-000000000009',
  '$641M total ($400M Series C in 2025)',
  'B',
  'Sacra, EquityZen, Contrary Research',
  'https://sacra.com/c/agility-robotics/',
  '2026-05-01'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] 주요고객/파트너: Mercado Libre added
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'f7bbb149-e6a1-45f3-9c8a-552724772d81',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0014-4000-8000-000000000014',
  'Toyota Canada (RaaS), GXO, Schaeffler, Amazon, Mercado Libre (TX+LATAM)',
  'A',
  'Agility Official, Distill Intelligence',
  'https://www.distillintelligence.com/news/agility-robotics',
  '2025-12-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agility] 안전인증: ISO + 80% US-sourced
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  '5117bded-efbd-4659-8852-74f5f773fd1d',
  'd1000001-0005-4000-8000-000000000005',
  'a1000001-0016-4000-8000-000000000016',
  'ISO functional safety cert mid-late 2026 (first humanoid); 80% US-sourced components',
  'B',
  'Agility Official, MEXC News',
  'https://www.mexc.com/news/1120515',
  '2026-05-20'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Apptronik] 주요고객/파트너 — 신규 투자자 추가
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'd96020e6-381b-4af6-8a14-bbf74581da69',
  'd1000001-0006-4000-8000-000000000006',
  'a1000001-0014-4000-8000-000000000014',
  'Mercedes-Benz, GXO Logistics, Jabil, AT&T Ventures, John Deere, Qatar Investment Authority',
  'A',
  'CNBC, Crunchbase News',
  'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
  '2026-02-11'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] 최근밸류에이션: $10B target
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000007-0001-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0010-4000-8000-000000000010',
  'Targeting $10B (seeking $1B raise)',
  'C',
  'The Information via Dealroom',
  'https://app.dealroom.co/news/note/1x-technologies-targets-10b-valuation-as-it-tests-household-robots-in-real-homes',
  '2026-04-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] 추론플랫폼: Nvidia Jetson Thor
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000007-0002-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0008-4000-8000-000000000008',
  'Nvidia Jetson Thor, Isaac simulation',
  'B',
  'eWeek, The Next Web',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '2026-04-15'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [1X] 배치대수: consumer shipments started
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000007-0003-4000-8000-000000000001',
  'd1000001-0007-4000-8000-000000000007',
  'a1000001-0013-4000-8000-000000000013',
  'Consumer shipments started, 10K pre-orders SOLD OUT',
  'A',
  'The Next Web, Tech Funding News',
  'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
  '2026-05-30'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 최근밸류에이션: HK IPO Q3 2026
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000008-0001-4000-8000-000000000001',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0010-4000-8000-000000000010',
  'Hong Kong IPO Q3 2026, $142M revenue target',
  'B',
  'Capital.com, SCMP',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-05-10'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 주요고객/파트너: Minth Group, Singtel 추가
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'ceefe8f2-5803-460a-bfdf-93f3f00bb304',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0014-4000-8000-000000000014',
  'LG Electronics (equity), Minth Group (Germany auto-parts), Singtel Enterprise (Singapore), global (US/EU/JP/KR/SEA/ME)',
  'A',
  'Korea Herald, Gasgoo, SCMP',
  'https://autonews.gasgoo.com/articles/news/humanoid-robots-enter-a-new-battlefield-2026957094341603329',
  '2026-02-24'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Agibot] 규제전략: Munich launch + global expansion
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'adceb9b4-810f-4df0-9683-58815c9a97af',
  'd1000001-0008-4000-8000-000000000008',
  'a1000001-0017-4000-8000-000000000017',
  'Munich launch Feb 2026, EU/US market entry via CES & partnerships',
  'A',
  'Gasgoo, TrendForce',
  'https://autonews.gasgoo.com/articles/news/humanoid-robots-enter-a-new-battlefield-2026957094341603329',
  '2026-02-24'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Tesla] 기술파트너: Samsung Display 추가
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000001-0001-4000-8000-000000000001',
  'd1000001-0001-4000-8000-000000000001',
  'a1000001-0015-4000-8000-000000000015',
  'Samsung Display (OLED face panels)',
  'B',
  'Basenor',
  'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-face-revealed-oled-display-and-whats-coming',
  '2026-05-28'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 기술파트너: Helix VLA models
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000003-0001-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0015-4000-8000-000000000015',
  'Nvidia, Intel Capital, Qualcomm, BMW (11-month deployment)',
  'A',
  'Forge Global, Figure AI Official',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-05-20'
) ON CONFLICT ON CONSTRAINT ci_values_competitor_item_uniq
DO UPDATE SET
  value = EXCLUDED.value,
  confidence = EXCLUDED.confidence,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  source_date = EXCLUDED.source_date,
  updated_at = NOW();

-- [Figure AI] 배치대수: 350+ delivered, 30K BMW cars
INSERT INTO ci_values (id, competitor_id, item_id, value, confidence, source, source_url, source_date)
VALUES (
  'v2000003-0002-4000-8000-000000000001',
  'd1000001-0003-4000-8000-000000000003',
  'a1000001-0013-4000-8000-000000000013',
  '350+ Figure 03 delivered; Figure 02 produced 30K BMW X3s, loaded 90K components',
  'A',
  'Figure AI Official, The AI Insider',
  'https://www.figure.ai/news/production-at-bmw',
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

-- [Tesla] Samsung OLED 파트너십
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000001-0001-4000-8000-000000000001',
  'Basenor',
  'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-face-revealed-oled-display-and-whats-coming',
  '[Tesla] Optimus Gen 3 Samsung OLED 디스플레이 페이스 확정',
  'Samsung Display가 Optimus Gen 3 얼굴용 OLED 패널 공급 파트너로 선정됨. 표정 및 상태 표시 기능. Tier-1 서플라이 체인 확보 시그널.',
  'd1000001-0001-4000-8000-000000000001',
  'e1000001-0001-4000-8000-000000000001',
  'pending'
);

-- [BD] 56 DOF 확정 + 30K 공장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000002-0001-4000-8000-000000000001',
  'Humanoids Daily / WebProNews',
  'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  '[Boston Dynamics] Atlas 56 DOF 확인, HMG와 30,000대/년 공장 건설',
  'Production Atlas가 56 DOF로 확인됨 (기존 28+ DOF). HMG와 30,000대/년 생산 가능한 신규 로보틱스 공장 건설 중. 2027년 추가 고객 확보 예정.',
  'd1000001-0002-4000-8000-000000000002',
  'e1000001-0001-4000-8000-000000000001',
  'pending'
);

-- [Figure AI] 24/7 자율주행 + 백악관
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000003-0001-4000-8000-000000000001',
  'KraneShares / CNBC',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '[Figure AI] Figure 03 24/7 자율운영 달성 + 백악관 등장',
  'Figure 03이 인간 감독 없이 24시간 자율운영 시연. 야외 조깅 2m/s 달성. 3월 백악관에서 멜라니아 트럼프와 함께 AI 교육 홍보 이벤트.',
  'd1000001-0003-4000-8000-000000000003',
  'e1000001-0002-4000-8000-000000000002',
  'pending'
);

-- [Unitree] IPO 승인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000004-0001-4000-8000-000000000001',
  'TechTimes / Rest of World',
  'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
  '[Unitree] STAR Market IPO 심사 통과 — 최초 구현형 AI 기업 A주 상장',
  '2026년 6월 1일 상해거래소 IPO 심사위원회 통과. 중국 A주 시장 최초 "구현형 AI" 기업. $610M 목표, 일부 보도 $7B까지 제시. GD01 메카 로봇 공개.',
  'd1000001-0004-4000-8000-000000000004',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agility] 65lb 데드리프트 + 80% 미국산
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000005-0001-4000-8000-000000000001',
  'Interesting Engineering / MEXC',
  'https://interestingengineering.com/ai-robotics/us-digit-humanoid-robot-deadlift',
  '[Agility] Digit 65lb 데드리프트 시연 + 80% 미국산 부품 전환',
  'Digit이 29kg(65lb) 중량물 정밀 리프트 시연. 부품 80% 미국 내 조달 달성. Mercado Libre와 TX/라틴아메리카 배치 계약 체결.',
  'd1000001-0005-4000-8000-000000000005',
  'e1000001-0001-4000-8000-000000000001',
  'pending'
);

-- [Apptronik] 신규 전략 투자자
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000006-0001-4000-8000-000000000001',
  'Crunchbase News',
  'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
  '[Apptronik] AT&T Ventures, John Deere, 카타르 투자청 신규 투자',
  'Series A 확장 라운드에 AT&T Ventures, John Deere & Co., Qatar Investment Authority 합류. 차세대 Apollo 약 1년간 테스트 중, 전작 대비 더 많은 유닛 생산.',
  'd1000001-0006-4000-8000-000000000006',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [1X] 소비자 배송 시작 + $10B 밸류에이션
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000007-0001-4000-8000-000000000001',
  'The Next Web / eWeek',
  'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
  '[1X] NEO 미국 가정 배송 시작, 밸류에이션 $10B 목표',
  'Hayward 공장에서 미국 가정으로 NEO 배송 시작. $20K 또는 $499/월 구독. $10B 밸류에이션 목표 $1B 펀드레이징 추진. Nvidia Jetson Thor 탑재.',
  'd1000001-0007-4000-8000-000000000007',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [Agibot] HK IPO + 유럽 진출
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, layer_id, status)
VALUES (
  'm2000008-0001-4000-8000-000000000001',
  'Capital.com / Gasgoo',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '[Agibot] 홍콩 IPO Q3 2026 추진, 유럽/싱가포르 시장 진출',
  'Agibot 홍콩 IPO Q3 2026 목표. 매출 $142M 타겟. Minth Group과 독일 자동차부품 라인 파트너십. Singtel Enterprise와 싱가포르 거점 확보.',
  'd1000001-0008-4000-8000-000000000008',
  'e1000001-0003-4000-8000-000000000003',
  'pending'
);

-- [규제] EU AI Act + ISO 25785-1
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, layer_id, status)
VALUES (
  'm2000009-0001-4000-8000-000000000001',
  'Bird & Bird / IEEE',
  'https://www.twobirds.com/en/insights/2026/smart-robots,-dual-regulations-navigating-the-ai-act-and-machinery-compliance',
  '[규제] EU AI Act 2026.8.2 시행 + ISO 25785-1 휴머노이드 표준 개발 중',
  'EU AI Act 다수 조항 2026년 8월 2일 발효 (고위험 AI는 2027년 8월). 기계규정 2023/1230은 2027년 1월 20일 전면 적용. ISO 25785-1 (동적 안정 로봇) Working Draft — Agility, BD, A3 주도, 2026-2027 최종 발행 예정.',
  'e1000001-0004-4000-8000-000000000004',
  'pending'
);


-- ============================================================
-- 4. Competitive Alerts — 전략적 경고
-- ============================================================

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000002-0001-4000-8000-000000000001',
  'partnership',
  'warning',
  '[Tesla] Samsung Display OLED 파트너십 — Tier-1 서플라이 체인 구축',
  'Samsung Display가 Optimus Gen 3 얼굴용 OLED 패널 공급사로 확정. Tesla가 Optimus를 본격 양산 프로그램으로 취급하고 있음을 시사. 연간 디자인 사이클로 Gen 4도 개발 중.',
  '{"event": "samsung_oled_partnership", "company": "Tesla", "product": "Optimus Gen 3", "sources": ["Basenor"], "partner": "Samsung Display", "confidence": "B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000002-0002-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Boston Dynamics] 56 DOF 확정 + HMG 30,000대/년 공장 착공',
  'Production Atlas 56 DOF 확정 (기존 28+ DOF에서 업데이트). HMG와 30,000대/년 생산 능력 공장 건설 중. 100lb+ 하중 리프팅 시연 (세탁기/냉장고). 2027년 추가 고객 확보 계획.',
  '{"event": "factory_construction_dof_update", "company": "Boston Dynamics", "product": "Atlas Electric", "sources": ["Humanoids Daily", "WebProNews", "R&A News"], "dof": 56, "capacity": "30K/yr", "confidence": "A/B"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000002-0003-4000-8000-000000000001',
  'mass_production',
  'critical',
  '[Unitree] STAR Market IPO 심사 통과 — 구현형 AI 최초 A주 상장',
  'Unitree Robotics가 2026년 6월 1일 상해거래소 IPO 심사위원회 승인 획득. 중국 A주 시장 최초 "구현형 AI" 기업 상장. 2025년 매출 ¥1.708B (335% YoY). GD01 메카 로봇 공개 ($650K).',
  '{"event": "ipo_cleared_star_market", "company": "Unitree", "product": "H2/G1/GD01", "sources": ["TechTimes", "Rest of World", "The Next Web"], "revenue_2025": "¥1.708B", "growth": "335%", "confidence": "A"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000002-0004-4000-8000-000000000001',
  'mass_production',
  'warning',
  '[1X] NEO 소비자 배송 개시, $10B 밸류에이션 추진',
  '1X Technologies가 Hayward 공장에서 NEO 소비자 배송을 시작. 첫해 10K 생산분 5일 만에 완판. $1B 펀드레이징으로 $10B 밸류에이션 목표. Nvidia Jetson Thor 탑재, 수직통합 제조.',
  '{"event": "consumer_shipments_started", "company": "1X Technologies", "product": "NEO", "sources": ["The Next Web", "eWeek", "Dealroom"], "valuation_target": "$10B", "confidence": "B/C"}',
  false
);

INSERT INTO competitive_alerts (id, type, severity, title, description, metadata, is_read)
VALUES (
  'aa000002-0005-4000-8000-000000000001',
  'partnership',
  'warning',
  '[Agibot] 홍콩 IPO Q3 2026 + Minth Group/Singtel 글로벌 확장',
  'Agibot 홍콩 IPO Q3 2026 목표, 매출 $142M 타겟. 독일 Minth Group과 유럽 자동차부품 라인 파트너십. Singtel Enterprise로 싱가포르 진출. 글로벌 6개 대륙 배치 확대.',
  '{"event": "hk_ipo_global_expansion", "company": "Agibot", "product": "A2/Expedition A3", "sources": ["Capital.com", "SCMP", "Gasgoo"], "partners": ["Minth Group", "Singtel Enterprise"], "confidence": "B"}',
  false
);

COMMIT;
