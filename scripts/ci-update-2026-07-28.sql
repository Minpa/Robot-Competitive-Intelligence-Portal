-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-28
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- 이전 스크립트(2026-07-26)와 중복되지 않는 신규 항목만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트) — 신규 항목
--    content_hash 기반 중복 방지
-- ============================================================

-- [Tesla] Virtuix, Optimus 부서에 Omni One Enterprise 텔레오퍼레이션 시스템 첫 판매 (A, 2026-07-27)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Virtuix Sells First Omni One Enterprise System to Tesla Optimus Division for Humanoid Teleoperation',
  'GlobeNewsWire / Manila Times',
  'https://www.globenewswire.com/news-release/2026/07/27/3333607/0/en/Virtuix-Sells-First-Enterprise-System-to-Tesla-for-Optimus-Humanoid-Robot-Division.html',
  '2026-07-27'::timestamp,
  'Virtuix Holdings, Tesla Optimus 휴머노이드 로봇 부서에 Omni One Enterprise 시스템 첫 판매(7/27). 몰입형 가상환경에서 전신 자유도 이동이 가능한 텔레오퍼레이션 플랫폼. 인간이 원격으로 로봇을 실시간 제어 가능. Optimus 훈련 데이터 수집 및 원격 작업 시나리오 지원 목적. Tesla의 "관찰로 학습하는 로봇" 전략과 텔레오퍼레이션 인프라 구축이 병행되고 있음을 시사.',
  'Virtuix Holdings Inc. announced on July 27, 2026, that Tesla purchased its first Omni One Enterprise system for the Optimus humanoid robot division. The Omni One Enterprise enables users to move naturally through immersive virtual environments while maintaining full freedom of movement, making it suitable for teleoperation of humanoid robots. This allows humans to remotely control robots in real time, supporting training data collection and remote task scenarios for Optimus. The deal signals Tesla is building teleoperation infrastructure alongside its "robot that learns by watching" strategy, creating complementary pathways for Optimus capability development.',
  'en', 'technology', 'robot',
  md5('tesla-virtuix-omni-one-enterprise-teleoperation-optimus-2026-07-27'),
  '{"confidence":"A","mentionedCompanies":["Tesla","Virtuix Holdings"],"mentionedRobots":["Optimus"],"technologies":["teleoperation","Omni One Enterprise","immersive VR","full-body motion capture"],"marketInsights":["First enterprise teleoperation system sold to Tesla Optimus division","Teleoperation infrastructure investment parallel to autonomous learning"],"keyPoints":["Virtuix Omni One Enterprise sold to Tesla Optimus division","Full-body teleoperation for humanoid robot remote control","Training data collection and remote task support","Complements learn-by-watching strategy"],"summaryKo":"Virtuix, Tesla Optimus 부서에 Omni One Enterprise 텔레오퍼레이션 시스템 첫 판매(7/27). 전신 이동 가능한 원격 로봇 제어 플랫폼. 훈련 데이터 수집 및 원격 작업 시나리오 지원."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-virtuix-omni-one-enterprise-teleoperation-optimus-2026-07-27'));

-- [Tesla] Optimus: "관찰로 학습하는 최초의 로봇" — Q2 실적 콜 발언 (A, 2026-07-22)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla: Optimus Is the First Robot That Learns by Watching — Generalized Task Capability Claim at Q2 Call',
  'PYMNTS / Tesla Q2 Earnings Call',
  'https://www.pymnts.com/earnings/2026/tesla-says-optimus-is-the-first-robot-that-learns-by-watching/',
  '2026-07-22'::timestamp,
  'Tesla Q2 실적 콜(7/22)에서 Musk, Optimus를 "관찰로 학습하는 최초의 로봇"으로 정의. 코드 작성이 아닌 시각적 관찰을 통해 일반화된 태스크 수행 가능. "세상에 일반화된 작업을 실제로 수행할 수 있는 휴머노이드 로봇은 없으며, Optimus가 최초가 될 것"이라 주장. Fremont 공장에서 이번 분기 생산 시작 확인.',
  'During Tesla''s Q2 2026 earnings call on July 22, CEO Elon Musk positioned Optimus as "the first robot that learns by watching" — distinguishing it from competitors by claiming the robot learns from visual observation rather than manually written code. Musk stated that "there is no humanoid robot that is actually able to do generalized tasks, and Optimus will be the first one that is capable of doing that." Production has moved into this quarter at Tesla''s Fremont factory. The learning-by-watching approach represents Tesla''s core AI strategy for Optimus, leveraging video data at scale to train foundation models for robotic manipulation.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-learns-by-watching-first-generalized-q2-2026-07-22'),
  '{"confidence":"A","mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus"],"technologies":["visual imitation learning","foundation models for robotics","learn-by-watching AI"],"marketInsights":["First robot to learn by watching claim","No existing humanoid can do generalized tasks (Musk claim)","Fremont production started this quarter"],"keyPoints":["Optimus learns from visual observation, not code","First generalized-task humanoid robot claim","Production started at Fremont this quarter","Foundation model approach for robotic manipulation"],"summaryKo":"Tesla Q2 콜: Optimus를 관찰로 학습하는 최초의 로봇으로 정의. 일반화된 작업 가능한 최초의 휴머노이드 주장. Fremont 생산 시작 확인."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-learns-by-watching-first-generalized-q2-2026-07-22'));

-- [Boston Dynamics] Atlas, FIFA 월드컵 2026 하프타임 활성화 — 최초 로봇 하프타임 (A, 2026-07-05)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Atlas Makes FIFA World Cup History — First-Ever Robotic Halftime Activation at Norway-Brazil Match',
  'Fox Business / Boston Dynamics Blog',
  'https://www.foxbusiness.com/sports/hyundai-motor-brings-boston-dynamics-atlas-humanoid-robot-fifa-world-cup-groundbreaking-activation',
  '2026-07-05'::timestamp,
  'Boston Dynamics Atlas, FIFA 월드컵 2026 노르웨이-브라질 16강전(7/5, 뉴저지) 하프타임에 세레모니 볼 전달 및 골 세리머니 수행. 역사상 최초 로봇 하프타임 활성화. Hyundai Motor "Next Starts Now" 캠페인 일환. 생산형 Atlas의 첫 대규모 공개 등장. 전 세계 수억 시청자 대상 Atlas 브랜드 인지도 확보. 산업용 로봇에서 대중 인지 플랫폼으로의 전략적 전환.',
  'On July 5, 2026, Boston Dynamics'' Atlas humanoid robot stepped onto the field during halftime of the FIFA World Cup Norway-Brazil round of 16 match at New York/New Jersey Stadium. Atlas presented the ceremonial match ball to the referee and performed a series of goal celebrations, marking the first-ever robotic halftime activation in FIFA World Cup history. This was part of Hyundai Motor Company''s "Next Starts Now" campaign. The event represented the first major public appearance of the production-ready Atlas and exposed the robot to hundreds of millions of global viewers, significantly boosting brand awareness beyond the industrial market.',
  'en', 'industry', 'robot',
  md5('boston-dynamics-atlas-fifa-world-cup-2026-halftime-07-05'),
  '{"confidence":"A","mentionedCompanies":["Boston Dynamics","Hyundai Motor"],"mentionedRobots":["Atlas"],"technologies":[],"marketInsights":["First-ever robotic halftime activation in FIFA World Cup","Hundreds of millions of global viewers exposed to Atlas","Strategic shift from industrial to mass public awareness","Hyundai Next Starts Now campaign"],"keyPoints":["Atlas at FIFA World Cup Norway-Brazil match (July 5)","Ceremonial ball delivery and goal celebrations","First public appearance of production Atlas","Global brand exposure at unprecedented scale"],"summaryKo":"Atlas, FIFA 월드컵 2026 노르웨이-브라질전 하프타임(7/5) 세레모니 볼 전달. 역사상 최초 로봇 하프타임 활성화. 생산형 Atlas 첫 대규모 공개. 수억 글로벌 시청자 노출."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('boston-dynamics-atlas-fifa-world-cup-2026-halftime-07-05'));

-- [Boston Dynamics] Atlas 5세대 — 복잡도 "거의 1자릿수" 감소, 부품 수/비용 대폭 절감 (A, 2026-07-02)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Boston Dynamics New Atlas: "Almost Order of Magnitude" Simpler — Fewer Parts, Faster Mfg, Lower Cost',
  'Forbes / Boston Dynamics',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  'Boston Dynamics, Atlas 5세대 설계 공개(7/2). 기존 대비 복잡도 "거의 한 자릿수(order of magnitude)" 감소. 부품 수 대폭 축소 → 제조 속도 향상, 신뢰성 강화, 비용 대폭 절감. Hyundai 30K대/년 양산 목표(2028년 조지아 공장)와 직결되는 제조 최적화. 2026년 생산분 전량 판매 완료(Hyundai RMAC + Google DeepMind). 산업 현장 6''2", 198lb, 56 DoF, 50kg 페이로드, -20~40°C 운용.',
  'Boston Dynamics revealed on July 2, 2026, that its latest fifth-generation Atlas humanoid robot features an "almost order of magnitude" reduction in complexity compared to previous versions. The design simplification translates directly to fewer parts, faster manufacturing, enhanced reliability, and significantly lower production costs. This manufacturing optimization is critical for Hyundai''s plan to build a factory near Savannah, Georgia capable of producing 30,000 Atlas robots per year by 2028. The entire 2026 production run is sold out, committed to Hyundai''s Robotics Metaplant Application Center (RMAC) and Google DeepMind. Production Atlas specifications: 6''2" tall, 198 lbs, 56 degrees of freedom, 50 kg payload capacity, operating range of -20 to 40 degrees Celsius.',
  'en', 'technology', 'robot',
  md5('boston-dynamics-atlas-gen5-order-magnitude-simpler-2026-07-02'),
  '{"confidence":"A","mentionedCompanies":["Boston Dynamics","Hyundai"],"mentionedRobots":["Atlas"],"technologies":["design simplification","order of magnitude complexity reduction"],"marketInsights":["Almost order of magnitude fewer parts","2026 production fully sold out","Hyundai 30K/yr factory planned (Savannah GA, 2028)","Manufacturing cost significantly reduced"],"keyPoints":["Gen 5 Atlas: near 10x complexity reduction","Fewer parts → faster mfg, better reliability, lower cost","2026 production sold out (Hyundai RMAC + Google DeepMind)","6ft2, 198lb, 56 DoF, 50kg payload, -20 to 40°C"],"summaryKo":"Atlas 5세대: 복잡도 거의 1자릿수 감소. 부품 축소/비용 절감. 2026년 생산 전량 판매. Hyundai 30K/년 공장(2028 조지아). 56 DoF, 50kg 페이로드."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('boston-dynamics-atlas-gen5-order-magnitude-simpler-2026-07-02'));

-- [Hyundai] Atlas 배치 관련 35,000명 노조 파업 — 최초 휴머노이드 배치 반대 파업 (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Workers Stage First Strike Over Humanoid Robot Deployment — 35,000 Workers Involved',
  'Fox Business / Multiple Sources',
  'https://www.foxbusiness.com/sports/hyundai-motor-brings-boston-dynamics-atlas-humanoid-robot-fifa-world-cup-groundbreaking-activation',
  '2026-07-15'::timestamp,
  'Hyundai 35,000명 노동자, Atlas 휴머노이드 로봇 배치에 반대하는 최초 파업 실시(7월). 산업계 최초로 휴머노이드 로봇 도입이 직접적 노사 분쟁 원인. Hyundai의 Atlas 30K대/년 공장 계획 및 대규모 자동화 전략에 대한 노동조합의 조직적 저항. 규제·노동 리스크가 휴머노이드 상업화의 주요 장벽으로 부상.',
  'Approximately 35,000 Hyundai workers staged what is described as the first strike specifically targeting humanoid robot deployment in July 2026. The strike represents the first instance of organized labor directly opposing humanoid robot introduction in an industrial setting. This action is linked to Hyundai''s plans to deploy Atlas robots at manufacturing facilities and its broader goal to build a factory capable of producing 30,000 Atlas units per year. The development highlights regulatory and labor risks as significant barriers to humanoid robot commercialization, a factor that all manufacturers must now account for in deployment planning.',
  'en', 'industry', 'robot',
  md5('hyundai-35000-workers-strike-humanoid-atlas-deployment-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Hyundai","Boston Dynamics"],"mentionedRobots":["Atlas"],"technologies":[],"marketInsights":["First-ever strike targeting humanoid robot deployment","35,000 workers involved","Labor risk now a major commercialization barrier","All manufacturers must account for labor relations"],"keyPoints":["35,000 Hyundai workers strike over Atlas deployment","First organized labor action against humanoid robots","Linked to 30K/yr factory and automation plans","Regulatory/labor risk elevated for entire industry"],"summaryKo":"Hyundai 35K명 노동자, Atlas 배치 반대 최초 파업(7월). 산업 최초 휴머노이드 도입 노사분쟁. 규제/노동 리스크가 상업화 주요 장벽으로 부상."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-35000-workers-strike-humanoid-atlas-deployment-2026-07'));

-- [Agibot] WAIC 2026에서 A3 Ultra 등 4종 신제품 — "보석 전시물" 선정, NVIDIA Thor 탑재 (A, 2026-07-18)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AGIBOT Debuts A3 Ultra at WAIC 2026 — 51 DoF, 8hr Endurance, NVIDIA Thor, Named Gem of Exhibition',
  'PR Newswire / Interesting Engineering / eWeek',
  'https://www.prnewswire.com/apac/news-releases/agibot-unveils-four-new-products-at-waic-2026-showcasing-embodied-ai-in-real-world-operations-302829347.html',
  '2026-07-18'::timestamp,
  'Agibot, WAIC 2026(7/18)에서 4종 신제품 발표: A3 Ultra(휴머노이드), X2 Edu(교육), G2 Max(산업), OmniHand 3 Ultra-M(로봇 핸드). A3 Ultra: 174cm/60kg, 51 DoF, 5kg/팔 페이로드, 8시간 운용. 3D LiDAR·RGB-D·어안·양안 카메라, GPS/RTK/UWB 측위. NVIDIA Thor 탑재. 직접 충전/배터리 교환/자율 충전 지원. WAIC 2026 "Gem of the Exhibition"(10개 중 유일한 체화 AI 제품) 선정. 서비스/상업/공공 환경 타겟.',
  'At the World Artificial Intelligence Conference (WAIC) 2026 on July 18, AGIBOT unveiled four new products: A3 Ultra humanoid, X2 Edu education platform, G2 Max industrial robot, and OmniHand 3 Ultra-M robotic hand. The A3 Ultra stands 1.74m tall, weighs 60kg, offers 51 degrees of freedom, carries 5kg per arm, and operates for up to 8 hours. It features 3D LiDAR, RGB-D, fisheye and binocular cameras with GPS, RTK and UWB positioning. Powered by NVIDIA Thor SoC with support for direct charging, battery swapping, and autonomous recharging. The A3 Ultra was designated a "Gem of the Exhibition" by WAIC organizers — the only embodied AI product among ten items selected for that honor. The robot targets commercial, service, and public environments.',
  'en', 'product', 'robot',
  md5('agibot-waic-2026-a3-ultra-4-products-gem-exhibition-07-18'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","NVIDIA"],"mentionedRobots":["A3 Ultra","X2 Edu","G2 Max","OmniHand 3 Ultra-M"],"technologies":["NVIDIA Thor SoC","3D LiDAR","RGB-D camera","GPS/RTK/UWB positioning","autonomous recharging"],"marketInsights":["4 new products launched at WAIC 2026","A3 Ultra: only embodied AI in Gem of Exhibition top 10","Service/commercial/public environment targeting","Full sensor suite with multi-modal positioning"],"keyPoints":["A3 Ultra: 174cm, 60kg, 51 DoF, 5kg/arm, 8hr endurance","NVIDIA Thor powered","WAIC Gem of Exhibition (only embodied AI)","4 products: A3 Ultra, X2 Edu, G2 Max, OmniHand 3 Ultra-M"],"summaryKo":"Agibot, WAIC 2026에서 A3 Ultra 등 4종 발표. A3 Ultra: 174cm/60kg/51 DoF/8시간/NVIDIA Thor. WAIC 보석 전시물 선정(체화 AI 유일). 서비스/상업/공공 타겟."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-waic-2026-a3-ultra-4-products-gem-exhibition-07-18'));

-- [Agibot] 홍콩 IPO 추진 — $5.1~6.4B 기업가치, HK$40~50B 목표 (C, 2026)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AGIBOT Targets Hong Kong IPO at HK$40-50B ($5.1-6.4B) Valuation — 2026 Listing Planned',
  'Capital.com / Medium / PitchBook',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  '2026-07-20'::timestamp,
  'Agibot, 홍콩증권거래소(HKEX) IPO 추진. 목표 기업가치 HK$40~50B(US$5.1~6.4B). 2026년 상장 계획. 누적 투자 $314M(Tencent·HongShan·LG Electronics·BYD·Mirae Asset 등). 시리즈 B 완료(2025.8). Omdia 기준 2025년 글로벌 1위(39% 점유). 15,000대 누적 양산. 중국 체화 AI 로봇 1위 기업의 자본시장 진입.',
  'AGIBOT is reportedly targeting a Hong Kong Stock Exchange (HKEX) IPO with a valuation between HK$40 billion and HK$50 billion (US$5.1-6.4 billion), planned for 2026. The company has raised approximately $314 million across seed, Series A, and Series B rounds from investors including Tencent, HongShan Capital, LG Electronics, BYD, and Mirae Asset. AGIBOT ranked first globally in humanoid robot shipments in 2025 with 39% market share according to Omdia. With 15,000 cumulative robots produced, the company is China''s leading embodied AI robot company entering the capital markets.',
  'en', 'industry', 'robot',
  md5('agibot-hong-kong-ipo-5b-6b-valuation-2026'),
  '{"confidence":"C","mentionedCompanies":["AgiBot","Tencent","HongShan Capital","LG Electronics","BYD","Mirae Asset"],"mentionedRobots":[],"technologies":[],"marketInsights":["HK IPO target: HK$40-50B ($5.1-6.4B)","$314M total funding","Key investors: Tencent, LG Electronics, BYD","2026 listing planned"],"keyPoints":["Hong Kong IPO planned for 2026","Valuation target $5.1-6.4B","$314M raised from major investors including LG Electronics","Global #1 humanoid shipments (Omdia)"],"summaryKo":"Agibot 홍콩 IPO 추진. 목표 기업가치 $5.1~6.4B. 누적 $314M 투자(Tencent·LG·BYD 등). 2025년 글로벌 1위. 15K대 양산. 2026년 상장 계획."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-hong-kong-ipo-5b-6b-valuation-2026'));

-- [Figure AI] Figure 03 생산 속도 1대/시간, BotQ 주 55대+ 출하 — Helix AI 자율성 향상 (B, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure AI: Figure 03 Production at 1 Robot/Hour, BotQ Factory 55+ Units/Week — Helix AI Autonomy Advancing',
  'KraneShares / CTCO Blog / Humanoid Press',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  '2026-07-25'::timestamp,
  'Figure AI, BotQ 공장에서 Figure 03 생산 속도 1대/시간 달성. 주 55대+ 출하(24배 처리량 증가). 350대+ 누적 생산. Helix AI VLA 모델 자율성 지속 향상. BMW Spartanburg 204K+ 패키지 자율 처리 실적. Figure 02 8시간 자율 시프트 달성(2026.1). 서비스/가정용 Figure 03(175cm, 61kg, 20kg 페이로드, 달리기 가능) 알파 테스트 진행 중.',
  'Figure AI''s BotQ factory has achieved a production rate of 1 Figure 03 robot per hour, with 55+ units shipping per week — representing a 24x throughput increase. Over 350 units have been produced cumulatively. The Helix AI vision-language-action model continues to advance in autonomy capabilities. BMW''s Spartanburg plant has autonomously processed 204,000+ packages using Figure robots. Figure 02 achieved full 8-hour autonomous shifts in January 2026. Figure 03 (175cm, 61kg, 20kg payload, running capability) alpha testing is underway for service and household applications.',
  'en', 'product', 'robot',
  md5('figure-ai-figure03-1-per-hour-botq-55-weekly-helix-2026-07'),
  '{"confidence":"B","mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["Helix AI VLA","BotQ manufacturing"],"marketInsights":["1 robot/hour production rate achieved","55+ units/week (24x throughput increase)","350+ cumulative production","BMW 204K+ autonomous packages"],"keyPoints":["Figure 03: 1/hour production rate","55+ units/week at BotQ","350+ units produced","Helix AI autonomy advancing, household alpha testing"],"summaryKo":"Figure AI BotQ에서 Figure 03 1대/시간 생산. 주 55대+ 출하(24배 증가). 350대+ 누적. BMW 204K+ 패키지 자율 처리. 가정용 알파 테스트 중."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-figure03-1-per-hour-botq-55-weekly-helix-2026-07'));

-- [Unitree] 세계 최초 휴머노이드 앱스토어 + UnifoLM-VLA-0 오픈소스 공개 (B, 2026-03)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  'Unitree Launches World''s First Humanoid Robot App Store + Open-Sources UnifoLM-VLA-0 Vision-Language-Action Model',
  'RobotShop / Forbes / BotInfo',
  'https://community.robotshop.com/blog/show/unitree-robotics-at-ces-2026-a-clear-signal-of-whats-coming-next',
  '2026-03-15'::timestamp,
  'Unitree, 세계 최초 휴머노이드 로봇 앱스토어 출시. 모듈형 소프트웨어 생태계로의 전략적 전환. 2026년 3월 UnifoLM-VLA-0(Vision-Language-Action 모델) 오픈소스 공개: 12개 태스크 카테고리에 배포 가능한 조작 베이스라인 제공. H2($29.9K) 신규 출시로 $20K~$90K 전 가격대 라인업 완성. 에코시스템 + 오픈소스로 개발자 커뮤니티 구축 전략.',
  'Unitree introduced what it describes as the world''s first Humanoid Robot App Store, signaling a strategic shift toward modular, software-driven ecosystems. In March 2026, Unitree open-sourced UnifoLM-VLA-0, a vision-language-action model providing a deployable manipulation baseline across 12 task categories. The H2 at $29,900 completes a full product lineup spanning $16,000 to $90,000. The combination of an app store platform and open-source AI model represents a deliberate strategy to build a developer community ecosystem around Unitree hardware.',
  'en', 'technology', 'robot',
  md5('unitree-humanoid-app-store-unifolm-vla-0-open-source-2026-03'),
  '{"confidence":"B","mentionedCompanies":["Unitree Robotics"],"mentionedRobots":["G1","H1","H2"],"technologies":["Humanoid Robot App Store","UnifoLM-VLA-0","vision-language-action model","open-source robotics AI"],"marketInsights":["First humanoid robot app store globally","Open-source VLA model for 12 task categories","Full lineup: G1 $16K / H2 $29.9K / H1 $90K","Developer ecosystem strategy"],"keyPoints":["World first humanoid app store launched","UnifoLM-VLA-0 open-sourced (March 2026)","12 task category manipulation baseline","Software ecosystem + open-source developer strategy"],"summaryKo":"Unitree, 세계 최초 휴머노이드 앱스토어 출시. UnifoLM-VLA-0 VLA 모델 오픈소스(3월). 12개 태스크 카테고리. H2 $29.9K로 풀 라인업 완성. 에코시스템 전략."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-humanoid-app-store-unifolm-vla-0-open-source-2026-03'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림) — 신규 항목
-- ============================================================

-- [INFO] Tesla Virtuix 텔레오퍼레이션 시스템 구매
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'info',
  '[Tesla] Virtuix Omni One Enterprise 텔레오퍼레이션 시스템 구매(7/27) — Optimus 원격 제어 인프라 구축',
  'Tesla Optimus 부서, Virtuix Omni One Enterprise 텔레오퍼레이션 시스템 첫 구매(7/27). 전신 이동 VR 기반 원격 로봇 제어. 훈련 데이터 수집 + 원격 작업 시나리오. 관찰 학습 전략과 병행하는 텔레오퍼레이션 인프라 투자.',
  '{"source":"GlobeNewsWire / Manila Times","confidence":"A","date":"2026-07-27","partner":"Virtuix Holdings","product":"Omni One Enterprise","purpose":"humanoid teleoperation + training data","strategy":"parallel to learn-by-watching approach"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Tesla%Virtuix%텔레오퍼레이션%'
  AND created_at > '2026-07-25'::timestamp
);

-- [WARNING] Atlas FIFA 월드컵 — 대중 브랜드 인지도 급등
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'warning',
  '[Boston Dynamics] Atlas FIFA 월드컵 2026 하프타임 활성화(7/5) — 역사상 최초 로봇 하프타임, 글로벌 인지도 급등',
  'Atlas, FIFA 월드컵 노르웨이-브라질전(7/5) 하프타임에 세레모니 볼 전달 + 골 세리머니. 역사 최초 로봇 하프타임. Hyundai "Next Starts Now" 캠페인. 수억 시청자 노출. 생산형 Atlas 첫 대규모 공개. 산업 → 대중 인지 전략적 전환.',
  '{"source":"Fox Business / Boston Dynamics Blog","confidence":"A","date":"2026-07-05","event":"FIFA World Cup 2026","match":"Norway vs Brazil Round of 16","location":"New York/New Jersey Stadium","campaign":"Hyundai Next Starts Now","impact":"hundreds of millions of global viewers"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Atlas%FIFA%월드컵%'
  AND created_at > '2026-07-01'::timestamp
);

-- [WARNING] Hyundai 35K 노동자 파업 — 휴머노이드 배치 반대 최초
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'warning',
  '[Hyundai/BD] 35,000명 파업 — 휴머노이드 로봇 배치 반대 역사상 최초 노조 행동(7월)',
  'Hyundai 35K명 노동자, Atlas 배치 반대 파업(7월). 산업 최초 휴머노이드 도입 노사분쟁. 30K대/년 양산 계획 및 대규모 자동화에 대한 조직적 저항. 규제/노동 리스크가 전 제조사의 상업화 핵심 장벽으로 부상.',
  '{"source":"Fox Business / Multiple Sources","confidence":"B","date":"2026-07","workers":"35,000","trigger":"Atlas humanoid deployment plans","implication":"labor risk elevated for entire humanoid industry","first":"first-ever strike targeting humanoid robot deployment"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Hyundai%35,000%파업%'
  AND created_at > '2026-07-01'::timestamp
);

-- [INFO] Agibot A3 Ultra WAIC 2026 발표 — NVIDIA Thor, 51 DoF
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'score_spike', 'info',
  '[Agibot] WAIC 2026에서 A3 Ultra 발표 — 51 DoF, 8시간, NVIDIA Thor, 보석 전시물 선정',
  'Agibot WAIC 2026(7/18)에서 A3 Ultra 등 4종 신제품 발표. A3 Ultra: 174cm/60kg/51 DoF/5kg 팔/8시간. NVIDIA Thor. 3D LiDAR·RGB-D·어안·양안 카메라. GPS/RTK/UWB. WAIC "보석 전시물"(체화 AI 유일). HK IPO 추진($5.1~6.4B).',
  '{"source":"PR Newswire / IE / eWeek","confidence":"A","date":"2026-07-18","products":["A3 Ultra","X2 Edu","G2 Max","OmniHand 3 Ultra-M"],"a3_specs":{"height":"174cm","weight":"60kg","dof":51,"payload":"5kg/arm","endurance":"8hr","soc":"NVIDIA Thor"},"award":"WAIC Gem of Exhibition","hk_ipo":"$5.1-6.4B target"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%WAIC%A3 Ultra%'
  AND created_at > '2026-07-15'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림) — 신규 항목
-- ============================================================

-- Tesla Virtuix 텔레오퍼레이션
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'GlobeNewsWire',
  'https://www.globenewswire.com/news-release/2026/07/27/3333607/0/en/Virtuix-Sells-First-Enterprise-System-to-Tesla-for-Optimus-Humanoid-Robot-Division.html',
  'Tesla Optimus, Virtuix Omni One Enterprise 텔레오퍼레이션 시스템 구매(7/27) — 원격 제어 인프라 구축',
  'Virtuix 전신 이동 VR 텔레오퍼레이션 시스템. 훈련 데이터 + 원격 작업. 관찰 학습 전략 병행.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla%Virtuix%텔레오퍼레이션%'
  AND detected_at > '2026-07-25'::timestamp
);

-- Atlas FIFA 월드컵
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Fox Business / Boston Dynamics',
  'https://www.foxbusiness.com/sports/hyundai-motor-brings-boston-dynamics-atlas-humanoid-robot-fifa-world-cup-groundbreaking-activation',
  'Atlas, FIFA 월드컵 2026 하프타임(7/5) — 역사 최초 로봇 하프타임, 수억 시청자 노출',
  '노르웨이-브라질 16강 하프타임. 세레모니 볼 전달 + 골 세리머니. Hyundai Next Starts Now.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Atlas%FIFA%월드컵%하프타임%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Hyundai 파업
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Fox Business / Multiple Sources',
  'https://www.foxbusiness.com/sports/hyundai-motor-brings-boston-dynamics-atlas-humanoid-robot-fifa-world-cup-groundbreaking-activation',
  'Hyundai 35K명 파업 — Atlas 휴머노이드 배치 반대 역사상 최초 노조 행동(7월)',
  '35,000명 파업. 휴머노이드 도입 최초 노사분쟁. 규제/노동 리스크 전 업계 장벽.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Hyundai%35K%파업%Atlas%'
  AND detected_at > '2026-07-01'::timestamp
);

-- Agibot WAIC A3 Ultra
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'PR Newswire / eWeek',
  'https://www.prnewswire.com/apac/news-releases/agibot-unveils-four-new-products-at-waic-2026-showcasing-embodied-ai-in-real-world-operations-302829347.html',
  'Agibot WAIC 2026에서 A3 Ultra 등 4종 발표 — 51 DoF/8hr/NVIDIA Thor, 보석 전시물 선정',
  'A3 Ultra: 174cm/60kg/51 DoF/8hr/NVIDIA Thor. 4종 신제품. WAIC 보석 전시물(체화 AI 유일). HK IPO 추진.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot%WAIC%A3 Ultra%'
  AND detected_at > '2026-07-15'::timestamp
);

-- Figure AI 생산 속도
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'KraneShares / CTCO Blog',
  'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
  'Figure AI: Figure 03 1대/시간 생산, BotQ 주 55대+ — Helix AI 자율성 향상(7월)',
  '1대/시간 생산 속도. 주 55+ 출하(24배 증가). 350대+ 누적. BMW 204K+ 패키지. 가정용 알파 테스트.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure AI%Figure 03%1대/시간%'
  AND detected_at > '2026-07-20'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 9 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 4 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 5 (deduplicated by headline + date)
-- Total: up to 18 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처: 6건
--     Tesla/Virtuix 텔레오퍼레이션 (GlobeNewsWire — 공식 보도자료)
--     Tesla Optimus 관찰 학습 (PYMNTS — Q2 실적 콜 기반)
--     Atlas FIFA 월드컵 하프타임 (Fox Business / BD 블로그)
--     Atlas Gen 5 복잡도 감소 (Forbes / BD 공식)
--     Agibot A3 Ultra WAIC 발표 (PR Newswire — 공식 보도자료)
-- [B] 2개 이상 매체 교차확인: 4건
--     Hyundai 35K 파업 (Fox Business + 복수 매체)
--     Figure 03 생산 속도 (KraneShares / CTCO Blog)
--     Unitree 앱스토어 + UnifoLM-VLA-0 (RobotShop / Forbes)
-- [C] 단일 출처: 1건
--     Agibot 홍콩 IPO 기업가치 (Capital.com / Medium)
--
-- NOTE: Railway PostgreSQL은 이 실행 환경에서 TCP 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-28.sql
-- ============================================================
