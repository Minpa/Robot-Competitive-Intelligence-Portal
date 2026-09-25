-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-25
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-25T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-24
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-25.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Agility Robotics Digit 5 공개 — 업계 최초 "협력 안전" 휴머노이드, $300M+ 수주
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Agility Robotics / Bloomberg / Manufacturing Dive / The Robot Report',
   'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
   '[Warning] Agility Robotics Digit 5 공개 — 업계 최초 협력 안전 휴머노이드, 50lb 페이로드, 9분 충전, $300M+ 수주',
   '9/15 Agility Robotics가 Digit 5 공개. 업계 최초 "협력 안전(cooperatively safe)" 설계 — 안전 울타리 없이 사람 옆에서 작업 가능. 스펙: 5ft11, 129kg, 7ft 리치, 50lb 리프트, 90분 배터리+9분 충전(10:1 런-충전 비율), 20h/24h 가동. AI 기반 사람 감지+독립 안전 컨트롤러. $200K 구매 또는 $8,500/월 RaaS. $300M+ 다년 수주 확보. 2027년 EU/UK 최초 해외 진출 계획.',
   '2026-09-25'::timestamp, 'pending'),

-- 2. [Warning] Tesla Optimus 전용 공장 Giga Texas — 강철 프레임 완성 단계, 2027 여름 양산 목표
  (gen_random_uuid(), 'Teslarati / DriveTeslaCanada / HelpForce AI',
   'https://driveteslacanada.ca/news/tesla-optimus-factory-construction-giga-texas/',
   '[Warning] Tesla Optimus 전용 공장 Giga Texas 강철 프레임 완성 임박 — 4,000ft+ 길이, 2027 여름 양산 목표',
   '9/17 기준 Giga Texas Optimus 전용 공장 건설 진행. 상층 콘크리트 타설+철근 배치 진행 중. 4,000ft+ 길이 건물, 기존 차량 공장 북측 520만sqft 확장 부지. 2027 여름 대량 생산 목표. Musk: 최종 연간 1,000만대 생산 목표. 현재 주 ~1,000대→연말 2,000~2,500대/주 램프.',
   '2026-09-25'::timestamp, 'pending'),

-- 3. [Info] Apptronik Apollo 2 + Robot Park 개소 — Google DeepMind 데이터 파트너십, Apollo 3 2027 상용화
  (gen_random_uuid(), 'Apptronik / The Robot Report / RoboZaps',
   'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
   '[Info] Apptronik Apollo 2 공개 + Robot Park 개소 — Google DeepMind 데이터 협력, Apollo 3 2027 상용 목표',
   '6/30 Apptronik이 Austin Robot Park(데이터 수집·훈련 시설) 확장 개소 + Apollo 2 공개. 이족보행/휠 베이스 양 구성. 90%+ 에너지 효율 특허 액추에이터, 교체형 배터리, LED 표정·흉부 디스플레이. Google DeepMind와 실세계 데이터 수집 파트너십. Apollo 3가 최초 상용 제품(2027 목표). $520M 펀딩/$5B 밸류에이션(2026년 2월, Google·Mercedes-Benz·John Deere 참여).',
   '2026-09-25'::timestamp, 'pending'),

-- 4. [Info] 1X Technologies NEO — 10K대 초회분 5일 매진, EQT 10K대 글로벌 배치 협약
  (gen_random_uuid(), '1X Technologies / TNW / eWeek / BusinessWire',
   'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
   '[Info] 1X NEO 10,000대 초회 생산분 5일 매진 — $20K 가격, EQT 10K대 글로벌 배치, 2026년 내 美 가정 배송 시작',
   '1X Technologies NEO: Hayward 캘리포니아 공장 가동, 첫해 10,000대 5일 만에 매진. 가격 $20,000(구독: $499/월). 25DoF 텐던 구동 손+촉각 핑거팁(7/9 업그레이드). EQT와 2026-2030 포트폴리오사 10K대 배치 전략 파트너십. 2026년 내 미국 가정 첫 배송 예정(정확한 일정 미확정).',
   '2026-09-25'::timestamp, 'pending'),

-- 5. [Info] Agibot H1 2026 글로벌 1위 — 9,700대 출하(43% 점유), 15,000대 누적 생산
  (gen_random_uuid(), 'Counterpoint Research / Robotics & Automation News / Forbes',
   'https://counterpointresearch.com/en/insights/global-humanoid-robot-shipments-soar-nearly-300-percent-yoy-in-h1-2026',
   '[Info] Agibot H1 2026 글로벌 출하 1위 — 9,700대/43% 점유율, 누적 15K대, 글로벌 시장 전년비 300% 성장',
   'Counterpoint Research 발표: H1 2026 글로벌 휴머노이드 출하 22,000대+(전년비 ~300% 성장). Agibot 1위 9,700대(43%+), Unitree 2위. Top5가 86% 점유. 6월 누적 15,000대 생산 돌파. A3 Ultra: 174cm/60kg/51DoF. 2027 매출 100억위안(CNY) 목표.',
   '2026-09-25'::timestamp, 'pending'),

-- 6. [Info] Unitree IPO 후 주가 조정 — STAR Market $9B 밸류 IPO 후 460% 급등→53% 조정
  (gen_random_uuid(), 'CNBC / Fortune / Yahoo Finance / KraneShares',
   'https://fortune.com/2026/08/19/unitree-china-dancing-robots-ipo-trading-surge-valuation/',
   '[Info] Unitree STAR Market IPO 후 주가 동향 — $9B 밸류/¥150.8 공모가→460% 급등→피크 대비 ~53% 조정',
   '8/19 Unitree STAR Market 상장. 공모가 ¥150.80, 첫날 460% 급등(¥845), 피크 ¥1,100(시총 $66B). 이후 ~53% 조정. IPO 규모 ~$905M(61억위안). 2026 출하 20,000대 목표. G1·G1+·H2 포트폴리오. 글로벌 대학 연구용 최다 채택 풀사이즈 휴머노이드.',
   '2026-09-25'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Agility Robotics] Digit 5 공개
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics Unveils Digit 5: First Cooperatively Safe Humanoid Robot for Work at Scale',
  'Agility Robotics / Bloomberg / Manufacturing Dive / The Robot Report / PR Newswire',
  'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
  '2026-09-15'::timestamp,
  'Agility Robotics unveiled Digit 5, the industry''s first cooperatively safe humanoid robot that can work alongside humans without physical safety barriers. Specs: 5''11", 284 lbs, 7-foot reach, 50 lb payload, 90-min battery with 9-min charge (10:1 run-to-charge ratio), 20h/24h operation. AI-based human detection with independent safety controller. Pricing: $200K purchase or $8,500/month RaaS. Over $300M in multi-year orders secured. EU/UK expansion planned for 2027.',
  'On September 15, 2026, Agility Robotics unveiled Digit 5, the next generation of its general-purpose humanoid robot and what the company calls the industry''s first cooperatively safe humanoid built for work at scale. Unlike previous Digit models that required physical safety barriers, Digit 5 is engineered to work in close proximity to people using proprietary AI algorithms and upgraded sensors for continuous human detection. The robot features an independent safety controller that oversees responses to detected people within unsafe distances, triggering appropriate actions including autonomous avoidance, stopping, or assuming a seated position. Before moving, it emits visual and audible safety cues to convey motion intent. Key specifications include: 5 feet 11 inches height, 284 lbs (129 kg) weight, 7-foot reach, 50 lb lifting capacity, a new 90-minute runtime battery that charges in just 9 minutes (10:1 run-to-charge ratio), enabling 20 hours of operation in a 24-hour shift. The previous Digit 4 was primarily known for stacking plastic bins behind safety barriers. Digit 5 can conduct complex work such as loading materials onto equipment, sorting parts, sequencing, and inspecting items. Agility outlines pricing of approximately $200,000 for outright purchase or $8,500 per month under a robots-as-a-service model. The market has responded with more than $300 million in multi-year orders and a growing pipeline across manufacturing, warehousing, and logistics. Agility plans to make the humanoid commercially available outside North America for the first time, targeting the EU and UK in 2027. The company is also reportedly pursuing a $2.5 billion pre-money SPAC valuation.',
  'en', 'product', 'robot',
  md5('agility-digit-5-cooperatively-safe-humanoid-2026-09-25'),
  '{"mentionedCompanies":["Agility Robotics"],"mentionedRobots":["Digit 5","Digit 4"],"technologies":["cooperatively safe design","AI human detection","independent safety controller","fast-charge battery"],"marketInsights":["$300M+ multi-year orders","$200K purchase or $8,500/mo RaaS","EU/UK expansion 2027","$2.5B pre-money SPAC valuation"],"keyPoints":["First cooperatively safe humanoid","50lb payload, 9-min charge","20h/24h operation","No safety barriers required"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit-5-cooperatively-safe-humanoid-2026-09-25'));

-- [Tesla] Optimus 전용 공장 건설 진행
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus Factory at Giga Texas Nears Major Construction Milestone, Steel Frame Nearly Complete',
  'Teslarati / DriveTeslaCanada / HelpForce AI',
  'https://driveteslacanada.ca/news/tesla-optimus-factory-construction-giga-texas/',
  '2026-09-17'::timestamp,
  'As of September 17, 2026, Tesla''s dedicated Optimus factory at Giga Texas has its steel frame nearly complete with concrete being poured on upper floors. The building stretches 4,000+ feet alongside the vehicle factory as part of a 5.2M sqft expansion. High-volume production targeted for summer 2027. Current production ramp: ~1,000/week by late September, rising to 2,000-2,500/week by year-end. Elon Musk''s ultimate target: 10 million units annually at full scale.',
  'As of September 17, 2026, construction progress at Tesla''s dedicated Optimus humanoid robot factory at Giga Texas shows steel assembly advancing with concrete going in on upper floors and rebar being laid for additional pours. New drone footage reveals the building''s steel frame is nearly complete, approximately six months after groundbreaking. The future Optimus facility stretches more than 4,000 feet alongside the existing vehicle factory, although it is narrower in design. The building is part of a larger expansion of more than 5.2 million square feet on the north side of the Texas factory campus. Tesla''s previously stated timeline targets high-volume Optimus production at the Giga Texas facility in summer 2027, once construction and additional manufacturing infrastructure are complete. Meanwhile, current production using existing facilities continues to ramp. Supply chain reports indicate Tesla is producing approximately 1,000 Optimus units per week as of late September 2026, with plans to increase to 2,000-2,500 units per week by year-end. Parts have been ordered for approximately 15,000 total units in 2026. CEO Elon Musk has outlined an ultimate target of 10 million units annually at full scale, though that figure represents long-term ambition rather than near-term planning. External sales of Optimus are not expected until late 2027 at the earliest, with Gen 3 units currently being deployed within Tesla''s own factories.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-factory-giga-texas-steel-frame-2026-09-25'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3"],"technologies":["humanoid manufacturing","large-scale factory construction"],"marketInsights":["4,000ft+ factory building","5.2M sqft expansion","Summer 2027 high-volume production","10M/year ultimate target"],"keyPoints":["Steel frame nearly complete","1K/week current, 2.5K/week EOY","15K units parts ordered 2026","External sales late 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-factory-giga-texas-steel-frame-2026-09-25'));

-- [Apptronik] Apollo 2 + Robot Park
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Unveils Apollo 2 and Expanded Robot Park Training Facility, Partners with Google DeepMind',
  'Apptronik / The Robot Report / RoboZaps',
  'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
  '2026-06-30'::timestamp,
  'Apptronik opened its expanded Robot Park data collection and training facility in Austin, Texas and unveiled Apollo 2 in both bipedal and wheeled configurations. Apollo 2 features 90%+ energy-efficient patented actuators and swappable batteries. Google DeepMind partnership for real-world data collection across Robot Park locations and customer sites. Apollo 3 positioned as first commercial product targeting 2027. Company backed by $520M at $5B valuation (Feb 2026) from Google, Mercedes-Benz, John Deere, AT&T Ventures.',
  'On June 30, 2026, Apptronik announced the opening of its newly expanded Robot Park, a flagship data collection and training facility for humanoid robots in Austin, Texas. Alongside the facility expansion, the company unveiled Apollo 2, its updated humanoid robot available in both bipedal and wheeled-base configurations. Apollo 2 features patented actuators with over 90% energy efficiency, swappable batteries for continuous operation, and a human-centered interface with an expressive LED mouth and chest display. The robot stands nearly 6 feet tall and can lift up to 55 pounds, operating 22 hours a day, seven days a week. Fleets of Apollo 2 robots continuously collect real-world data across multiple Robot Park locations and customer sites to develop AI models for future humanoid systems, in partnership with Google DeepMind. Mercedes-Benz and electronics manufacturer Jabil have already deployed Apollo alongside their human employees. Apptronik positions Apollo 2 as a training and data platform, with Apollo 3 designated as its first true commercial product targeting 2027 availability. The company raised $520 million in funding at a $5 billion valuation in February 2026, backed by B Capital, Google, Mercedes-Benz, PEAK6, AT&T Ventures, John Deere, and QIA. Former leaders from Waymo, Boston Dynamics, and Amazon have joined the team, with Dan Chu appointed as Chief Product Officer.',
  'en', 'product', 'robot',
  md5('apptronik-apollo-2-robot-park-deepmind-2026-09-25'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","Jabil","John Deere"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["90%+ efficient actuators","swappable batteries","LED expression interface","real-world data collection"],"marketInsights":["$520M funding at $5B valuation","Google+Mercedes+Deere investors","Apollo 3 commercial 2027","Mercedes+Jabil deployed"],"keyPoints":["Robot Park expanded Austin TX","Bipedal + wheeled configs","DeepMind data partnership","55lb lift, 22h/day operation"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-apollo-2-robot-park-deepmind-2026-09-25'));

-- [1X Technologies] NEO 생산·배송·EQT 파트너십
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Technologies NEO: 10,000 First-Year Units Sold Out in 5 Days, EQT Partnership for 10K Global Deployment',
  '1X Technologies / TNW / eWeek / BusinessWire / The Robot Report',
  'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
  '2026-09-20'::timestamp,
  '1X Technologies has commenced NEO production at its Hayward, California factory. First-year batch of 10,000 units sold out within 5 days at $20,000 per unit ($499/month subscription also available). July 9 hand upgrade: 25 DoF tendon-driven hands with tactile fingertips and slip detection (IP68). Strategic partnership with EQT for up to 10,000 humanoid deployments across EQT''s global portfolio (2026-2030). US home deliveries planned for 2026 but exact timing unconfirmed.',
  '1X Technologies has fully commenced production of its NEO humanoid robot at a new factory in Hayward, California. The first-year production batch of 10,000 units sold out within five days, priced at $20,000 per unit for early adopters, with a subscription option at $499 per month. NEO is available in tan, gray, and dark brown colorways. A significant hardware upgrade shipped on July 9, 2026: new 25 degree-of-freedom tendon-driven hands with tactile fingertips featuring slip detection, rated IP68 for dust and water resistance. These upgraded hands ship on the first customer units. In December 2025, 1X announced a strategic partnership with private equity firm EQT to deploy up to 10,000 NEO humanoids across EQT''s global portfolio companies between 2026 and 2030, covering facility operations, manufacturing, logistics, and healthcare. OpenAI remains an early investor in 1X Technologies, giving the AI giant indirect exposure to the humanoid robotics market. While US home deliveries are planned for 2026, no customer delivery had been publicly verified as of mid-July 2026. 1X states that "some of you will get your NEO this year, some will get them later." The company also launched a world model enabling NEO to learn tasks by watching videos, advancing embodied AI capabilities.',
  'en', 'product', 'robot',
  md5('1x-neo-10k-sold-out-eqt-partnership-2026-09-25'),
  '{"mentionedCompanies":["1X Technologies","EQT","OpenAI"],"mentionedRobots":["NEO"],"technologies":["25 DoF tendon-driven hands","tactile fingertips","slip detection","IP68","world model video learning"],"marketInsights":["10K units sold out in 5 days","$20K price / $499/mo subscription","EQT 10K deployment 2026-2030","OpenAI early investor"],"keyPoints":["Hayward CA factory operational","July 9 hand upgrade shipping","Home delivery 2026 planned","World model for task learning"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-10k-sold-out-eqt-partnership-2026-09-25'));

-- [Agibot] H1 2026 글로벌 출하 1위
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agibot Leads Global Humanoid Robot Shipments in H1 2026 with 9,700 Units and 43% Market Share',
  'Counterpoint Research / Robotics & Automation News / Forbes / MENAFN',
  'https://counterpointresearch.com/en/insights/global-humanoid-robot-shipments-soar-nearly-300-percent-yoy-in-h1-2026',
  '2026-09-18'::timestamp,
  'According to Counterpoint Research, global humanoid robot shipments topped 22,000 units in H1 2026, rising nearly 300% YoY. Agibot ranked first globally with approximately 9,700 units shipped (43%+ market share), followed by Unitree. Top 5 players accounted for 86% of total shipments. Chinese manufacturers hold 93-97% of global shipments by volume. Agibot passed 15,000 cumulative units in June 2026. A3 Ultra specs: 174cm, 60kg, 51 DoF. Revenue target: CNY 10 billion by 2027.',
  'Counterpoint Research published data in September 2026 showing that global humanoid robot shipments surpassed 22,000 units in the first half of 2026, representing a nearly 300% year-over-year increase driven by commercial deployments. Shanghai-based Agibot claimed the top position with approximately 9,700 units shipped, securing over 43% market share. Unitree ranked second, followed by Galbot, UBTECH, and Leju Robotics, with the top five players together accounting for 86% of total shipments. Chinese manufacturers dominate with 93-97% of global humanoid robot shipments by volume. Agibot announced in June 2026 that its 15,000th robot had rolled off its production line, marking a significant manufacturing milestone. The company''s portfolio includes the A3 full-size bipedal humanoid (A3 Ultra: 174cm tall, 132 lbs/60kg, 51 degrees of freedom, 11 lb lift per arm, 8-hour operation), X-series compact humanoids, and G-series wheeled humanoids. Agibot showcased its full portfolio at IFA 2026 in Berlin, where the world''s first humanoid robot runway show was held, with 932 Chinese companies participating — the largest Chinese contingent in IFA history. The company targets revenue of over CNY 10 billion by 2027, reflecting aggressive growth ambitions.',
  'en', 'industry', 'robot',
  md5('agibot-h1-2026-global-leader-9700-units-43pct-2026-09-25'),
  '{"mentionedCompanies":["Agibot","Unitree","Galbot","UBTECH","Leju Robotics","Counterpoint Research"],"mentionedRobots":["A3","A3 Ultra","X2","G2"],"technologies":[],"marketInsights":["22K+ global H1 shipments","300% YoY growth","43% Agibot market share","93-97% Chinese dominance"],"keyPoints":["Agibot #1 global 9,700 units","15K cumulative production","Top 5 = 86% share","CNY 10B revenue target 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-h1-2026-global-leader-9700-units-43pct-2026-09-25'));

-- [Unitree] IPO 후 주가 동향
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Robotics STAR Market IPO: 460% First-Day Surge to $53B Market Cap, Shares Correct ~53% from Peak',
  'CNBC / Fortune / Yahoo Finance / KraneShares / Value Add VC',
  'https://fortune.com/2026/08/19/unitree-china-dancing-robots-ipo-trading-surge-valuation/',
  '2026-08-19'::timestamp,
  'Unitree Robotics went public on Shanghai''s STAR Market on August 19, 2026, priced at ¥150.80 per share ($9B valuation). Stock surged 460% on day one to close at ¥845, briefly hitting ¥1,100 (629% peak, ~$66B market cap). Shares have since corrected approximately 53% from peak. IPO raised ~$905M (6.1B yuan). Company targets 20,000 humanoid shipments in 2026. G1 is the most widely used full-body humanoid in university research globally.',
  'Unitree Robotics made its debut on Shanghai''s STAR Market on August 19, 2026, in what became one of the most dramatic technology IPOs of the year. The company priced shares at ¥150.80 each, raising approximately 6.1 billion yuan ($905 million) at a $9 billion valuation. On its first trading day, the stock surged 460% to close at ¥845 per share, with the stock briefly spiking as high as ¥1,100 — a 629% gain that temporarily valued the company at roughly $66 billion. However, shares have since corrected approximately 53% from their peak price, reflecting broader market dynamics and profit-taking. The IPO represents a significant milestone for the Chinese robotics industry, as Unitree became the first pure-play humanoid robot company to achieve such a large public listing. The company targets 20,000 humanoid robot shipments in 2026 and offers a portfolio including the G1 and G1+ humanoid platforms and quadruped robots. The G1 has become the most widely used full-body humanoid in university research globally, with more units deployed in academic labs than any other platform. Unitree made headlines earlier in 2026 with its G1 robots performing autonomous kung fu at China''s Spring Festival Gala and with G1 cold-weather testing at -47°C in Altay, logging 130,000 steps. The H1 is now effectively legacy, with the $29,900 H2 replacing it for new buyers.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-ipo-460pct-surge-correction-2026-09-25'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","G1+","H1","H2"],"technologies":["autonomous kung fu","cold-weather autonomy"],"marketInsights":["$9B IPO valuation","460% first-day surge","~53% correction from peak","$905M raised","20K 2026 target"],"keyPoints":["STAR Market Aug 19 2026","Peak $66B market cap","Most-used research humanoid","H2 replaces H1 at $29,900"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-460pct-surge-correction-2026-09-25'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Agility Digit 5
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Agility Digit 5 공개 — 업계 최초 협력 안전 휴머노이드, $300M+ 수주, EU/UK 2027 진출',
   '9/15 Digit 5 공개. 안전 울타리 불필요(협력 안전). 50lb/9분충전/20h가동. $200K 또는 $8,500/월. $300M+ 수주. 2027 EU/UK 해외 진출.',
   '{"company":"Agility Robotics","event":"digit_5_launch","safety":"cooperatively safe, no barriers","payload":"50lb","charge":"9 min","orders":"$300M+","pricing":"$200K or $8,500/mo","expansion":"EU/UK 2027","confidence":"A"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Digit 5%협력 안전%$300M%');

-- Tesla Optimus Factory
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Tesla Optimus 전용 공장 Giga Texas 강철 프레임 완성 임박 — 2027 여름 양산, 현재 1K대/주',
   '9/17 기준 강철 프레임 거의 완성. 4,000ft+/520만sqft 확장. 현재 ~1K/주→연말 2.5K/주. 2027 여름 양산 시작 목표. 최종 1,000만대/년.',
   '{"company":"Tesla","event":"optimus_factory_construction","location":"Giga Texas","building":"4,000ft+ steel frame near complete","current_rate":"~1K/week","eoy_rate":"2.5K/week","mass_production":"summer 2027","ultimate_target":"10M/year","confidence":"B"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus 전용 공장%Giga Texas%강철%');

-- Apptronik Apollo 2
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   'Apptronik Apollo 2 공개 + Robot Park — Google DeepMind 데이터 파트너십, $520M/$5B 밸류',
   'Apollo 2 이족/휠 양 구성. Robot Park 확장. DeepMind 데이터 협력. Apollo 3(2027 상용). $520M/$5B 밸류(Google·Mercedes·Deere).',
   '{"company":"Apptronik","event":"apollo_2_launch_robot_park","robot":"Apollo 2","partner":"Google DeepMind","funding":"$520M","valuation":"$5B","commercial_product":"Apollo 3 (2027)","deployments":"Mercedes-Benz, Jabil","confidence":"A"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apollo 2%Robot Park%DeepMind%');

-- 1X NEO
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   '1X NEO 10K대 5일 매진 — $20K 가격, EQT 10K대 배치 파트너십, 2026 美 배송 계획',
   '초회 10K대 5일 매진. $20K(구독 $499/월). 25DoF 손 업그레이드. EQT 10K 배치(2026-2030). 2026 미국 가정 배송.',
   '{"company":"1X Technologies","event":"neo_production_sellout","units":"10,000 in 5 days","price":"$20,000","subscription":"$499/mo","partner":"EQT (10K units 2026-2030)","hand_upgrade":"25 DoF tendon-driven","delivery":"US homes 2026","confidence":"A"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%1X NEO%10K%5일 매진%');

-- Agibot 글로벌 1위
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Agibot H1 2026 글로벌 출하 1위 — 9,700대/43% 점유, 글로벌 시장 300% 성장',
   'Counterpoint: H1 글로벌 22K+대(300% YoY). Agibot 1위 9,700대(43%). 누적 15K대. Top5=86%. 중국 93-97% 점유.',
   '{"company":"Agibot","event":"h1_2026_market_leader","shipments":"9,700","share":"43%","global_total":"22,000+","yoy_growth":"~300%","cumulative":"15,000+","chinese_share":"93-97%","source":"Counterpoint Research","confidence":"A"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Agibot%H1 2026%9,700%43%');

-- Unitree IPO
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   'Unitree STAR Market IPO — $9B 밸류, 460% 급등→53% 조정, ~$905M 조달',
   '8/19 STAR Market 상장. $9B 밸류/¥150.80. 첫날 460%→¥845(피크 ¥1,100/$66B). 이후 ~53% 조정. 20K대 2026 목표.',
   '{"company":"Unitree","event":"star_market_ipo","ipo_date":"2026-08-19","valuation":"$9B","price":"¥150.80","day1_surge":"460%","peak":"¥1,100 (~$66B)","correction":"~53%","raised":"~$905M","2026_target":"20K units","confidence":"A"}'::jsonb,
   false, '2026-09-25'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Unitree%STAR Market%$9B%460%');


-- ============================================================
-- 4. ci_staging: 스테이징 (검증 대기)
-- ============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "digit_5_launch", "new_value": "Digit 5 공개(2026-09-15). 업계 최초 협력 안전 휴머노이드. 5ft11/129kg/7ft리치/50lb리프트. 90분 배터리+9분 충전. 20h/24h 가동", "source": "Agility Robotics 공식 발표 2026-09-15", "reliability": "A"}, {"field": "digit_5_commercial", "new_value": "$200K 구매 또는 $8,500/월 RaaS. $300M+ 다년 수주 확보. 2027 EU/UK 최초 해외 진출 계획", "source": "Bloomberg / PR Newswire 2026-09-15", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Digit 5%협력 안전%$300M%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "giga_texas_factory", "new_value": "Optimus 전용 공장 Giga Texas 강철 프레임 거의 완성(2026-09-17). 4,000ft+ 건물, 520만sqft 확장. 2027 여름 양산 시작 목표", "source": "Teslarati / DriveTeslaCanada 2026-09-17", "reliability": "B"}, {"field": "production_ramp", "new_value": "현재 ~1,000대/주(9월 말), 연말 2,000~2,500대/주 목표. 2026 총 15,000대 부품 발주", "source": "Supply chain reports / TrendForce", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Giga Texas%강철 프레임%2027 여름%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "apollo_2_launch", "new_value": "Apollo 2 공개(2026-06-30). 이족보행/휠 베이스 양 구성. 90%+ 효율 액추에이터, 교체형 배터리. Google DeepMind 데이터 파트너십", "source": "Apptronik / The Robot Report 2026-06-30", "reliability": "A"}, {"field": "funding_valuation", "new_value": "$520M 펀딩/$5B 밸류에이션(2026-02). Google·Mercedes-Benz·John Deere·AT&T Ventures 참여. Apollo 3 2027 상용 목표", "source": "Multiple sources 2026-02", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Apollo 2%DeepMind%$520M%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "neo_production", "new_value": "NEO Hayward 공장 가동. 초회 10,000대 5일 매진($20K). 25DoF 텐던 구동 손+촉각 핑거팁(7/9 업그레이드)", "source": "1X Technologies / TNW / eWeek", "reliability": "A"}, {"field": "neo_eqt_partnership", "new_value": "EQT 전략 파트너십: 2026-2030 포트폴리오사 10K대 배치(제조·물류·헬스케어)", "source": "BusinessWire 2025-12", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%NEO%10,000%5일 매진%EQT%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "h1_2026_shipments", "new_value": "H1 2026 글로벌 출하 1위: 9,700대/43% 점유율(Counterpoint). 글로벌 총 22K+(300% YoY). 누적 15K대 생산(6월)", "source": "Counterpoint Research 2026-09", "reliability": "A"}, {"field": "ifa_2026", "new_value": "IFA 2026 베를린 사상 최초 휴머노이드 런웨이 헤드라인. 중국 932사 사상 최대 참가", "source": "Cryptopolitan / IFA 2026", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%9,700%43%Counterpoint%15K%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree", "updates": [{"field": "ipo_status", "new_value": "STAR Market 상장(2026-08-19). $9B 밸류/¥150.80 공모가. 첫날 460%(¥845), 피크 ¥1,100($66B). 이후 ~53% 조정. ~$905M 조달", "source": "CNBC / Fortune / Yahoo Finance", "reliability": "A"}, {"field": "2026_target", "new_value": "2026 출하 목표 20,000대. G1 글로벌 대학 연구용 최다 채택. H2($29,900)가 H1 대체", "source": "eWeek / Multiple sources", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%STAR Market%$9B%460%$905M%' AND created_at::date = CURRENT_DATE);

COMMIT;
