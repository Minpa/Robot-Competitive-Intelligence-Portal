-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-24
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-24T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-21
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-24.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Boston Dynamics RMAC 정식 개소 — Hyundai Georgia Metaplant Atlas 훈련 센터
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Boston Dynamics / Axios / The Robot Report / CBT News',
   'https://bostondynamics.com/news/boston-dynamics-opens-robotics-metaplant-application-center-to-train-humanoid-robots-for-manufacturing-tasks/',
   '[Warning] Boston Dynamics RMAC 정식 개소 — Hyundai Georgia Metaplant에서 Atlas 제조 훈련, 2027년 10배 확장',
   '9/21 Boston Dynamics가 Hyundai Motor Group Metaplant America(조지아 서배나) 내 Robotics Metaplant Application Center(RMAC) 정식 운영 개시 발표. 6월부터 파일럿 운영 후 Full Operation 전환. Atlas가 실제 EV 제조 환경에서 물류·부품 시퀀싱 훈련 중. 2027년 현재 10배 규모 신규 건물 이전 계획. 자동차 외 제조·항공우주·반도체·물류·F&B·생명과학 분야 Spot/Stretch 고객과 Atlas 확장 논의. Hyundai 25,000대 글로벌 배치 계획 발표.',
   '2026-09-24'::timestamp, 'pending'),

-- 2. [Warning] Tesla Optimus Gen 3 — 중국 3사 양산 공급업체 인증, 5,000대 초도 발주
  (gen_random_uuid(), 'TrendForce / DriveTeslaCanada / Teslarati',
   'https://www.trendforce.com/news/2026/09/21/news-tesla-reportedly-audits-china-suppliers-for-optimus-gen-3-ramp-eyes-20000-price-target/',
   '[Warning] Tesla Optimus Gen 3 중국 공급사 인증 — Tuopu·Joyson·Sanhua 양산 파트너 확정, 5K대 초도 발주',
   '9/16~17 Tesla 로봇팀이 닝보 공급업체 현장 감사 수행. 3사를 Provisional→Certified Mass Production으로 승격: Tuopu Group(액추에이터·섀시), Ningbo Joyson Electronic(센서), Zhejiang Sanhua Intelligent Controls(열관리). 초도 5,000대 규모 부품 발주. TrendForce: 목표 소비자 가격 $20,000. 2026년 총 15,000대 부품 발주(9월 1K대/주→연말 2.5K대/주). Gen 3 앱 디지털 자산 유출로 양산형 디자인 확인: 산업용 마감, 관절 커버 일체형.',
   '2026-09-24'::timestamp, 'pending'),

-- 3. [Info] Figure 03 BMW Spartanburg 물류 시퀀싱 배치 — Figure 02로 X3 30,000대+ 생산 성공 후 후속
  (gen_random_uuid(), 'BMW Group Press / The Robot Report / Interesting Engineering',
   'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
   '[Info] Figure 03 BMW Spartanburg 물류 시퀀싱 투입 — F.02 X3 30K대 생산 기여 후 업그레이드 배치',
   '6/25 발표: Figure 02가 10개월간 BMW Spartanburg 공장에서 30,000대+ X3 생산 지원(바디샵 판금 삽입). 후속으로 Figure 03를 물류 시퀀싱에 신규 배치 — 미정렬 부품을 JIT 배송용 트롤리에 분류. 확장 3축: 작업 범위(패스너·품질 검사 추가), 대수 증가, 지리적 확장(유럽 공장 평가 중). Figure AI 생산 1,000대+ 돌파로 함대 확장 지원.',
   '2026-09-24'::timestamp, 'pending'),

-- 4. [Info] Hyundai — Atlas 25,000대 글로벌 공장 배치 계획, RMAC 성과 기반 확대
  (gen_random_uuid(), 'Hyundai / Seoul Economic Daily / Aju Press',
   'https://en.sedaily.com/finance/2026/09/22/hyundai-opens-robot-training-center-at-us-metaplant-for',
   '[Info] Hyundai Atlas 25,000대 글로벌 배치 계획 — 현대·기아 글로벌 공장 전개, RMAC 실증 기반',
   '9/22 Hyundai Motor Group이 RMAC 실증 결과를 기반으로 Atlas를 현대·기아 글로벌 공장에 25,000대 배치 계획 발표. Atlas 스펙: 최대 리치 7.5ft, 50kg(110lb) 리프트, -20~40°C 운영. 2026년 Atlas 배치분 전량 매진(RMAC + Google DeepMind). BD는 자동차 외 6개 산업(제조·항공우주·반도체·물류·F&B·생명과학) 확장 검토.',
   '2026-09-24'::timestamp, 'pending'),

-- 5. [Info] OpenAI Sam Altman — "확실히 휴머노이드를 만들 것" 공식 선언
  (gen_random_uuid(), 'Objectways / Multiple Tech Media',
   'https://objectways.com/blog/humanoid-robots-news-roundup-for-september-2026/',
   '[Info] OpenAI Sam Altman "will definitely do a humanoid" — 출시일·생산·제조 파트너 미발표',
   '9월 Sam Altman이 OpenAI가 "확실히(definitely)" 휴머노이드 로봇을 만들 것이라고 공식 발언. 단, 출시 일정·생산 목표·제조 파트너 미공개. 이미 1X Technologies 초기 투자자로서 로보틱스 접점 보유. Figure AI·Physical Intelligence 등 체화AI 스타트업과의 경쟁 구도 형성. 업계 밸류에이션 재평가 가능성.',
   '2026-09-24'::timestamp, 'pending'),

-- 6. [Info] Agibot IFA 2026 베를린 — 최초 휴머노이드 로봇 런웨이, 932개 중국 기업 참가
  (gen_random_uuid(), 'Cryptopolitan / IFA 2026',
   'https://www.cryptopolitan.com/unitree-agibot-ifa-2026-robot-runway/',
   '[Info] Agibot·Unitree IFA 2026 베를린 — 사상 최초 휴머노이드 로봇 런웨이 쇼, 중국 932사 참가',
   'IFA 2026(베를린)에서 사상 최초 휴머노이드 로봇 런웨이 행사 개최. Agibot·Unitree 등 중국 기업 중심 참가. 중국 전시업체 932개사로 사상 최대. 글로벌 소비자·파트너 대상 직접 시연 기회. 중국 휴머노이드 기업의 유럽 시장 공략 가속 신호.',
   '2026-09-24'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Boston Dynamics] RMAC 정식 개소
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Opens Robotics Metaplant Application Center at Hyundai Georgia for Atlas Humanoid Training',
  'Boston Dynamics / Axios / The Robot Report / CBT News',
  'https://bostondynamics.com/news/boston-dynamics-opens-robotics-metaplant-application-center-to-train-humanoid-robots-for-manufacturing-tasks/',
  '2026-09-21'::timestamp,
  'Boston Dynamics officially opened the Robotics Metaplant Application Center (RMAC) at Hyundai Motor Group Metaplant America in Savannah, Georgia. Atlas humanoids are training on real-world EV manufacturing tasks including logistics and parts sequencing. Plans for a 10x larger facility in 2027. All 2026 Atlas deployments fully committed (RMAC + Google DeepMind).',
  'Boston Dynamics announced on September 21, 2026 that it has officially opened the Robotics Metaplant Application Center (RMAC) at Hyundai Motor Group''s Metaplant America campus outside Savannah, Georgia. The facility, which began pilot operations in June 2026, has now transitioned to full operations. Atlas humanoid robots are being trained in real-world electric vehicle manufacturing conditions, starting with logistics work and sequencing automotive parts before they are placed in correct order for assembly. The RMAC serves as a testbed for integrating Atlas directly into Hyundai''s production operations. Atlas specifications include a reach of up to 7.5 feet, the ability to lift 110 pounds (50 kg), and operating temperature range of -4°F to 104°F (-20°C to 40°C). Boston Dynamics plans to move RMAC operations into a new building roughly 10 times its current size in 2027. The company is also in discussions with existing Spot and Stretch customers across six industries — manufacturing, aerospace, semiconductors, logistics, food and beverage, and life sciences — about scaling data collection to continue training Atlas through 2027. All Atlas deployments for 2026 are fully committed, with fleets scheduled to ship to RMAC and Google DeepMind. Hyundai Motor Group announced plans to deploy 25,000 Atlas units across Hyundai Motor and Kia global plants over the next few years, representing one of the largest single humanoid robot deployment commitments in the industry.',
  'en', 'technology', 'robot',
  md5('bd-rmac-hyundai-georgia-atlas-training-center-2026-09-24'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Kia","Google DeepMind"],"mentionedRobots":["Atlas","Spot","Stretch"],"technologies":["EV manufacturing automation","parts sequencing","logistics automation"],"marketInsights":["25,000 Atlas units for Hyundai/Kia global","2026 deployments fully committed","10x RMAC expansion 2027","6 industry verticals targeted"],"keyPoints":["RMAC full operations Sept 21","Atlas: 7.5ft reach, 110lb lift","Pilot since June 2026","Manufacturing + 5 other industries"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-rmac-hyundai-georgia-atlas-training-center-2026-09-24'));

-- [Tesla] Optimus Gen 3 중국 공급사 인증
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Certifies Three Chinese Suppliers for Optimus Gen 3 Mass Production, Eyes $20,000 Price Target',
  'TrendForce / DriveTeslaCanada / Teslarati / NextBigFuture',
  'https://www.trendforce.com/news/2026/09/21/news-tesla-reportedly-audits-china-suppliers-for-optimus-gen-3-ramp-eyes-20000-price-target/',
  '2026-09-17'::timestamp,
  'Tesla''s robotics team audited Chinese component suppliers in Ningbo on September 16-17, certifying three manufacturers for Optimus Gen 3 mass production: Tuopu Group (actuators/chassis), Ningbo Joyson Electronic (sensors), and Zhejiang Sanhua Intelligent Controls (thermal management). Initial batch order of ~5,000 units. Target consumer price of $20,000. Production ramp: 1,000/week by September, 2,500/week by year-end, 15,000 total units in 2026.',
  'Tesla''s robotics team arrived in Ningbo on September 16, 2026 and conducted a new round of supplier audits the following day to assess production readiness for the Optimus Gen 3 humanoid robot. The visit moved three manufacturers from provisional status to certified mass production partners: Tuopu Group, which handles actuators and chassis components; Ningbo Joyson Electronic, a sensor supplier; and Zhejiang Sanhua Intelligent Controls, which builds thermal management systems. All three already supply parts to Tesla''s electric vehicle business, and the audit reportedly came with fresh orders that supply chain reports put at an initial batch of roughly 5,000 units. According to TrendForce, Tesla is targeting a consumer price of $20,000 for Optimus Gen 3. Supply chain reports show parts ordered for approximately 15,000 units in 2026, with production ramping from ~1,000 units per week by late September to ~2,500 per week by year-end. Separately, digital assets uncovered in the Tesla mobile app appear to reveal the production-ready Optimus Gen 3 design, featuring a cleaner industrial finish with integrated flexible joint covers that seal away pinch points and bearings from external dust and debris. New drone footage also shows the dedicated Optimus factory steel frame at Giga Texas nearing completion, approximately six months after groundbreaking. External sales are not expected until late 2027, with Gen 3 units initially deployed within Tesla''s own factories.',
  'en', 'product', 'robot',
  md5('tesla-optimus-gen3-chinese-suppliers-certified-20000-2026-09-24'),
  '{"mentionedCompanies":["Tesla","Tuopu Group","Joyson Electronic","Sanhua Intelligent Controls"],"mentionedRobots":["Optimus Gen 3"],"technologies":["actuators","chassis components","sensors","thermal management"],"marketInsights":["$20,000 target price","15,000 units in 2026","1K/week Sept → 2.5K/week EOY","5,000 initial batch order"],"keyPoints":["3 Chinese suppliers certified","Ningbo audit Sept 16-17","All 3 existing Tesla EV suppliers","External sales late 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-gen3-chinese-suppliers-certified-20000-2026-09-24'));

-- [Figure AI] Figure 03 BMW Spartanburg 배치
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure 03 Deployed at BMW Spartanburg for Logistics Sequencing After Figure 02 Supported 30,000+ X3 Production',
  'BMW Group Press / The Robot Report / Interesting Engineering / Repairer Driven News',
  'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
  '2026-06-25'::timestamp,
  'BMW Group deployed Figure 03 at its Spartanburg plant for logistics sequencing after Figure 02 successfully supported production of 30,000+ BMW X3 vehicles over 10 months. Figure 03 now sorts unsorted components into sequencing trolleys for JIT delivery. Expansion planned across task scope (fastener assistance, quality inspection), fleet size, and geography (European plants under evaluation).',
  'Following the successful deployment of Figure 02 at BMW Group Plant Spartanburg in the USA, the further-developed successor Figure 03 has started operations at the same facility, handling a different task: sorting unsorted components into sequencing trolleys for just-in-time delivery to the assembly line. The Figure 02 robot supported the production of more than 30,000 BMW X3 vehicles over ten months, inserting sheet-metal parts for the welding process in the body shop — a task demanding high speed and accuracy that is physically demanding for workers. Figure 03, announced June 25, 2026, represents a significant upgrade and is now handling logistics sequencing, previously done entirely by hand. Both BMW and Figure AI have signaled expansion in three dimensions: task scope (adding fastener assistance and quality inspection beyond panel loading), unit count (increasing the active fleet at Spartanburg), and geography (evaluating Figure 03 deployment at BMW''s European plants). Figure AI has passed 1,000 units produced, supporting fleet expansion across commercial customers. The Figure 03 also features improved AI capabilities powered by the Helix model and the Index dataset, which generates approximately 35 minutes of new human experience every second for training.',
  'en', 'technology', 'robot',
  md5('figure-03-bmw-spartanburg-sequencing-30k-x3-2026-09-24'),
  '{"mentionedCompanies":["Figure AI","BMW Group"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["Physical AI","logistics sequencing","JIT delivery","Helix model","Index dataset"],"marketInsights":["30,000+ X3 production supported","1,000+ units produced","European expansion planned","3-axis expansion strategy"],"keyPoints":["F.02: 10 months, 30K vehicles","F.03: logistics sequencing new role","Fastener + QC next tasks","Production past 1,000 units"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-bmw-spartanburg-sequencing-30k-x3-2026-09-24'));

-- [Hyundai] Atlas 25,000대 글로벌 배치 계획
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Hyundai Plans 25,000 Atlas Humanoid Deployments Across Global Plants as RMAC Transitions to Full Operations',
  'Hyundai / Seoul Economic Daily / Aju Press / Thomas Net',
  'https://en.sedaily.com/finance/2026/09/22/hyundai-opens-robot-training-center-at-us-metaplant-for',
  '2026-09-22'::timestamp,
  'Hyundai Motor Group announced plans to deploy 25,000 Atlas humanoid robots across Hyundai Motor and Kia global plants. Decision follows successful RMAC pilot at Georgia Metaplant America. Atlas performing logistics and parts sequencing in EV manufacturing. Represents one of the largest single humanoid deployment commitments globally.',
  'Hyundai Motor Group announced on September 22, 2026 that it plans to deploy 25,000 Atlas humanoid robots across its global manufacturing network, encompassing both Hyundai Motor and Kia plants worldwide. The announcement came alongside the formal opening of Boston Dynamics'' Robotics Metaplant Application Center (RMAC) at Hyundai''s Metaplant America campus near Savannah, Georgia. The 25,000-unit deployment plan follows successful pilot operations that began in June 2026, where Atlas robots have been training on real-world EV manufacturing tasks including logistics work and parts sequencing. This represents one of the largest single humanoid robot deployment commitments announced to date, signaling Hyundai''s conviction in the commercial viability of humanoid automation at scale. Atlas robots currently deployed at the RMAC demonstrate specifications including a 7.5-foot reach, 110-pound lifting capacity, and wide operating temperature range (-20°C to 40°C). Boston Dynamics has indicated all 2026 Atlas units are fully committed, with the deployment timeline for the 25,000-unit plan expected to span the next few years. The company is simultaneously exploring Atlas applications beyond automotive in manufacturing, aerospace, semiconductors, logistics, food and beverage, and life sciences.',
  'en', 'industry', 'robot',
  md5('hyundai-25000-atlas-global-deployment-plan-2026-09-24'),
  '{"mentionedCompanies":["Hyundai","Kia","Boston Dynamics"],"mentionedRobots":["Atlas"],"technologies":["EV manufacturing","parts sequencing","humanoid automation"],"marketInsights":["25,000 units across global plants","Largest single humanoid deployment commitment","2026 units fully committed","Multi-year deployment timeline"],"keyPoints":["25K Atlas for Hyundai+Kia global","RMAC pilot successful since June","6 industry verticals planned","Deployment spans next few years"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-25000-atlas-global-deployment-plan-2026-09-24'));

-- [OpenAI] 휴머노이드 로봇 진출 선언
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'OpenAI CEO Sam Altman Confirms "Will Definitely Do a Humanoid" Robot — No Timeline or Partners Announced',
  'Objectways / Multiple Tech Media',
  'https://objectways.com/blog/humanoid-robots-news-roundup-for-september-2026/',
  '2026-09-20'::timestamp,
  'OpenAI CEO Sam Altman publicly confirmed that OpenAI will "definitely" build a humanoid robot, marking the AI giant''s formal entry into the physical AI race. No ship date, production target, or manufacturing partner disclosed. OpenAI already has robotics ties through early investment in 1X Technologies. Entry could reshape industry valuations and competitive dynamics.',
  'In September 2026, OpenAI CEO Sam Altman publicly stated that the company will "definitely do a humanoid" robot, confirming long-speculated plans for the AI giant to enter the physical robotics space. While no ship date, production target, or manufacturing partner has been announced, the declaration marks a significant milestone given OpenAI''s position as the world''s leading AI company. OpenAI already has indirect exposure to humanoid robotics through its early investment in 1X Technologies, whose NEO home robot is now in production. The entry of OpenAI into the humanoid race creates new competitive dynamics alongside existing players like Figure AI (which uses OpenAI models), Tesla, Boston Dynamics, and Chinese manufacturers. Industry analysts note that OpenAI''s massive AI training infrastructure and foundation model capabilities could accelerate embodied AI development if applied to robotics. However, the lack of manufacturing expertise and hardware supply chain presents significant challenges. The announcement comes at a time when the global humanoid robot market is experiencing explosive growth, with H1 2026 shipments up 272% YoY and cumulative industry funding exceeding $9.8 billion.',
  'en', 'industry', 'robot',
  md5('openai-altman-will-definitely-do-humanoid-2026-09-24'),
  '{"mentionedCompanies":["OpenAI","1X Technologies","Figure AI","Tesla","Boston Dynamics"],"mentionedRobots":["NEO"],"technologies":["foundation models","embodied AI","physical AI"],"marketInsights":["OpenAI entering humanoid race","1X Technologies early investor","No timeline disclosed","Industry valuation impact expected"],"keyPoints":["Sam Altman: definitely do a humanoid","No ship date or partner","Existing 1X investment","Competitive dynamics reshaped"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('openai-altman-will-definitely-do-humanoid-2026-09-24'));

-- [Agibot/Unitree] IFA 2026 베를린
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agibot and Unitree Headline IFA 2026 First-Ever Humanoid Robot Runway as Chinese Exhibitors Hit 932',
  'Cryptopolitan / IFA 2026',
  'https://www.cryptopolitan.com/unitree-agibot-ifa-2026-robot-runway/',
  '2026-09-22'::timestamp,
  'IFA 2026 in Berlin hosted the world''s first humanoid robot runway show, featuring Agibot and Unitree among headline exhibitors. Record 932 Chinese companies participated, the largest contingent ever. Event signals accelerated Chinese humanoid robotics push into European consumer and enterprise markets.',
  'IFA 2026 in Berlin made history with the world''s first humanoid robot runway show, featuring leading Chinese robotics companies Agibot and Unitree as headline exhibitors. The event drew a record 932 Chinese companies — the largest contingent of Chinese exhibitors in IFA''s history — reflecting the rapid internationalization of China''s robotics industry. Agibot, which leads global humanoid robot shipments with approximately 9,700 units in H1 2026 (43% market share per Counterpoint Research), showcased its full portfolio including A-series bipedal, X-series compact, and G-series wheeled humanoids. The company recently passed the 15,000th robot off its production line. Unitree, fresh from its record-breaking IPO on Shanghai''s STAR Market (¥150.80 issue price → ¥1,100 debut peak, though shares have since corrected ~53%), demonstrated its G1, G1+, and quadruped platforms. The runway event represents a significant marketing milestone, bringing humanoid robots directly to European consumers and enterprise partners through one of the world''s largest consumer electronics trade shows. The Chinese dominance at IFA mirrors the broader market data: Chinese manufacturers hold 93-97% of global humanoid robot shipments by volume in H1 2026.',
  'en', 'industry', 'robot',
  md5('agibot-unitree-ifa-2026-berlin-robot-runway-2026-09-24'),
  '{"mentionedCompanies":["Agibot","Unitree"],"mentionedRobots":["G1","G1+","X1"],"technologies":[],"marketInsights":["First humanoid robot runway ever","932 Chinese exhibitors (record)","China 93-97% global share","Agibot 9,700 H1 shipments"],"keyPoints":["IFA 2026 Berlin first robot runway","Agibot + Unitree headline","Chinese internationalization signal","Consumer + enterprise demo"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-unitree-ifa-2026-berlin-robot-runway-2026-09-24'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Boston Dynamics RMAC
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Boston Dynamics RMAC 정식 개소 — Hyundai Georgia Atlas 훈련, 25K대 글로벌 배치 계획',
   'RMAC 정식 운영 개시(6월 파일럿→9/21 Full Operation). Atlas 물류·시퀀싱 훈련. 2027년 10배 확장. Hyundai 25,000대 글로벌 배치. 2026 전량 매진.',
   '{"company":"Boston Dynamics","event":"rmac_opening","location":"Hyundai Georgia Metaplant","deployment_plan":"25,000 Atlas units","expansion":"10x facility 2027","industries":"automotive+5 verticals","confidence":"A"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%RMAC%정식 개소%25K%');

-- Tesla Optimus Gen 3 공급사 인증
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Tesla Optimus Gen 3 중국 3사 양산 인증 — Tuopu·Joyson·Sanhua, 5K대 초도 발주',
   '닝보 현장 감사 통과 3사 양산 파트너 확정. 초도 5K대 발주. 2026 총 15K대(9월 1K/주→연말 2.5K/주). 목표 가격 $20,000. 앱 Gen 3 디자인 유출.',
   '{"company":"Tesla","event":"supplier_certification","suppliers":["Tuopu Group","Joyson Electronic","Sanhua"],"initial_order":"5,000","annual_target":"15,000","target_price":"$20,000","confidence":"B"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus Gen 3%Tuopu%Joyson%Sanhua%');

-- Figure 03 BMW
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   'Figure 03 BMW Spartanburg 물류 시퀀싱 투입 — F.02 X3 30K대 생산 기여 후',
   'Figure 02: 10개월 30K+ X3 생산 지원. Figure 03: 물류 시퀀싱 신규 배치. 확장: 패스너·품질검사, 대수 증가, 유럽 공장. 1K+대 생산.',
   '{"company":"Figure AI","event":"bmw_deployment","robot":"Figure 03","predecessor_result":"30K+ BMW X3","new_task":"logistics sequencing","expansion":"European plants","units_produced":"1000+","confidence":"A"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure 03%BMW%물류 시퀀싱%');

-- Hyundai 25,000대
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'warning',
   'Hyundai 25,000대 Atlas 글로벌 배치 계획 — 업계 최대 단일 휴머노이드 주문',
   '현대·기아 글로벌 공장 25,000대 Atlas 배치 발표. 수년 간 단계 배치. RMAC 실증 기반. 업계 최대 단일 배치 약정.',
   '{"company":"Hyundai","partner":"Boston Dynamics","event":"25000_atlas_deployment","scope":"Hyundai+Kia global plants","timeline":"next few years","significance":"largest single humanoid commitment","confidence":"A"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Hyundai%25,000%Atlas%');

-- OpenAI 휴머노이드
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   'OpenAI "확실히 휴머노이드 만들 것" — Sam Altman 공식 선언, 일정·파트너 미공개',
   'Sam Altman "will definitely do a humanoid" 발언. 출시일·생산목표·파트너 미공개. 1X Technologies 기존 투자자. 업계 경쟁·밸류에이션 구도 변화 예고.',
   '{"company":"OpenAI","event":"humanoid_announcement","ceo":"Sam Altman","details":"no timeline/partner","existing_ties":"1X Technologies investor","impact":"competitive dynamics shift","confidence":"A"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%OpenAI%확실히%휴머노이드%');

-- Agibot/Unitree IFA 2026
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   'Agibot·Unitree IFA 2026 최초 로봇 런웨이 — 중국 932사 참가, 유럽 시장 공략',
   'IFA 2026 사상 최초 휴머노이드 런웨이. Agibot·Unitree 헤드라인. 중국 932사 사상 최대 참가. 유럽 소비자·기업 직접 시연.',
   '{"event":"IFA 2026 Berlin","companies":["Agibot","Unitree"],"milestone":"first humanoid runway","chinese_exhibitors":932,"market":"European consumer+enterprise","confidence":"A"}'::jsonb,
   false, '2026-09-24'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%IFA 2026%로봇 런웨이%');


-- ============================================================
-- 4. ci_staging: 스테이징 (검증 대기)
-- ============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "rmac_status", "new_value": "RMAC 정식 운영 개시(2026-09-21), 6월 파일럿→Full Operation. Atlas 물류·시퀀싱 훈련 중", "source": "Boston Dynamics 공식 발표 2026-09-21", "reliability": "A"}, {"field": "deployment_plan", "new_value": "Hyundai 25,000대 글로벌(현대+기아) 배치 계획, 수년간 단계 진행. 2026 전량 매진(RMAC+Google DeepMind)", "source": "Seoul Economic Daily / Boston Dynamics 2026-09-22", "reliability": "A"}, {"field": "expansion_industries", "new_value": "자동차 외 제조·항공우주·반도체·물류·F&B·생명과학 6개 산업 확장 검토", "source": "Boston Dynamics 2026-09-21", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%RMAC%정식 운영%25,000%Hyundai%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "gen3_supplier_certification", "new_value": "중국 3사 양산 인증(9/16-17 닝보 감사): Tuopu(액추에이터·섀시), Joyson(센서), Sanhua(열관리). 초도 5K대 발주", "source": "TrendForce / DriveTeslaCanada 2026-09-21", "reliability": "B"}, {"field": "gen3_price_target", "new_value": "소비자 목표 가격 $20,000 (TrendForce 보도)", "source": "TrendForce 2026-09-21", "reliability": "C"}, {"field": "gen3_design_leak", "new_value": "Tesla 앱 디지털 자산에서 Gen 3 양산 디자인 유출 — 산업용 마감, 관절 커버 일체형", "source": "NotATeslaApp 2026-09", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Tuopu%Joyson%Sanhua%양산 인증%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure-03", "updates": [{"field": "bmw_deployment", "new_value": "Figure 03 BMW Spartanburg 물류 시퀀싱 배치. Figure 02로 10개월간 X3 30,000대+ 생산 지원 후 업그레이드", "source": "BMW Group Press 2026-06-25", "reliability": "A"}, {"field": "expansion_plan", "new_value": "확장 3축: 패스너·품질검사 추가, 대수 증가, 유럽 공장 평가", "source": "The Robot Report / BMW Press", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Figure 03%BMW%물류 시퀀싱%30,000%' AND created_at::date = CURRENT_DATE);

COMMIT;
