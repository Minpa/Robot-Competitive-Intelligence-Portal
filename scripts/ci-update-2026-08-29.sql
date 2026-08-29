-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-29
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-08-29.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Unitree 688836.SH IPO 후 주가 급락 — RMB 585(8/28), 피크 대비 -45%, Q1 순이익 53% 감소
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Investing.com / Caixin Global / Invezz / CNBC',
   'https://www.caixinglobal.com/2026-08-28/analysis-unitree-shares-slide-as-investors-reassess-humanoid-robot-valuations-102478761.html',
   '[Warning] Unitree 688836.SH 급락: RMB 585(8/28), 피크 대비 -45% — Q1 순이익 53%↓, 밸류에이션 재평가',
   '8/28 종가 RMB 585.00(전일 615.03 대비 -4.9%). IPO Day1 피크 1,100 대비 -47% 조정. Caixin 분석: 투자자 휴머노이드 밸류에이션 재평가 진행 중. Q1 2026 조정 순이익 ¥40M(YoY -53%). 매출 성장 둔화 우려. 시총 ¥230B+ 추정. 창업자 Wang Xingxing WRC 발언: "ChatGPT moment 2~10년 소요". 로보틱스 버블 우려 부각. 기관 비중 유지되나 개인 매도세 강화.',
   '2026-08-29'::timestamp, 'pending'),

-- 2. [Warning] World Humanoid Robot Games 폐막(8/26): Tiangong Ultra 100m 8.64초, AGIBOT 종합 1위
  (gen_random_uuid(), 'CGTN / Global Times / TechTimes / Adafruit',
   'https://www.globaltimes.cn/page/202608/1369085.shtml',
   '[Warning] World Humanoid Robot Games: Tiangong Ultra 100m 8.64초(Bolt 돌파), AGIBOT 종합 1위 46메달',
   'Beijing Ice Ribbon, 8/22-26: 2,056 로봇·666팀·51종목. Tiangong Ultra(BHRIC 개발) 100m 대형 로봇 결승 8.64초 — 예선 9.39→준결 8.86→결승 8.64. Usain Bolt 9.58초 인간 기록 돌파. AGIBOT 대회 데뷔전 종합 1위: 46메달(손재주·시나리오 기반 금메달). 중국 로보틱스 생태계 깊이·다양성 과시. 국제 경쟁 프레임워크 주도.',
   '2026-08-29'::timestamp, 'pending'),

-- 3. [Info] Tesla Optimus: Fremont S/X 라인 46일 해체 완료 — V3 생산라인 전환 중, 생산 개시 미확인
  (gen_random_uuid(), 'Yahoo Finance / Teslarati / Basenor',
   'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
   '[Info] Tesla Optimus: Fremont S/X 라인 46일 만에 해체 — V3 생산라인 전환 진행, 실생산 여전히 미개시',
   'Model S/X 라인 5월 초 퇴역 → 46일 만에 해체 완료(업계 평균 대비 극도로 빠른 속도). Optimus Gen 3 전용 라인 전환 공사 진행 중. 10,000개 고유 부품 포함 완전 새 라인. Q4 2025 실적콜(1/26): 1,000+ Optimus 내부 배치 확인하나 "주로 학습·데이터 수집용, 생산적 작업 미수행" 발언. V3 공개 재차 "later this year" 연기. 실제 Gen 3 양산 개시 시점 미확인 지속. 1M/년 목표 현실성 의문 제기 지속.',
   '2026-08-29'::timestamp, 'pending'),

-- 4. [Info] Apptronik: 시리즈A 총 $935M 마감, ~$1B 총 조달 — AT&T·John Deere·QIA 합류
  (gen_random_uuid(), 'Apptronik / GlobeNewswire / Forbes / CNBC',
   'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
   '[Info] Apptronik 시리즈A 총 $935M 마감: $520M 확장 + $415M 초기 — 총 조달 ~$1B, 밸류에이션 $5.3B',
   'Series A 총 $935M+ 마감(초기 $415M + 확장 $520M). 총 조달 ~$1B. TechCrunch 보도 밸류에이션 ~$5.3B(확장 라운드 3x 멀티플). 확장 라운드 투자자: B Capital·Google·Mercedes·PEAK6(기존) + AT&T Ventures·John Deere·QIA(신규). Apollo 2 Robot Park(Austin) 데이터 수집·Gemini Robotics 2 실증. DeepMind Gemini Robotics On-Device: 50-100 시연으로 새 태스크 적응. Apollo 3 상용제품 2027 출시.',
   '2026-08-29'::timestamp, 'pending'),

-- 5. [Info] AGIBOT WAIC 2026: A3 Ultra·G2 Max·OmniHand 3 Ultra-M·X2 Edu 4종 신제품 발표
  (gen_random_uuid(), 'Interesting Engineering / Yahoo Finance / PR Newswire / TechTimes',
   'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
   '[Info] AGIBOT WAIC 2026: A3 Ultra(상용 휴머노이드)·G2 Max(중하역)·OmniHand 3·X2 Edu 4종 출시',
   'WAIC 2026(7/20) 4종 신제품: (1) A3 Ultra — 174cm, 51DoF, 5kg/팔 페이로드, NVIDIA Thor 탑재, "WAIC 2026 보석상" 유일 임바디드AI 수상. (2) G2 Max — 중하역·팔레타이징 특화, 힘제어 팔·가변 작업높이·전방향 이동·배터리 스왑. (3) OmniHand 3 Ultra-M — 630g, 20 능동DoF, 5kg 그립, 비전 기반 촉각센서. (4) X2 Edu — 교육용 플랫폼. 누적 15,000대 출하. RMB 300K→60M→1B+ 매출 성장 궤적.',
   '2026-08-29'::timestamp, 'pending'),

-- 6. [Info] Unitree 창업자 WRC 발언: 범용화 부족이 최대 난제, ChatGPT 모멘트 2-10년
  (gen_random_uuid(), 'CNBC / Caixin Global / Gasgoo',
   'https://www.cnbc.com/2026/08/21/chinese-humanoid-robots-face-challenge-of-their-own-capabilities.html',
   '[Info] WRC 2026: 중국 휴머노이드 리더들 "범용화 부족이 최대 난제" — 인간 대비 효율성 미달',
   'World Robot Congress(Beijing, 8/20-25) 주요 발언: Unitree Wang Xingxing "임바디드 인텔리전스 범용화 능력 부족이 업계 전체 과제, ChatGPT moment 2-10년". 업계 리더 다수 "로봇이 아직 인간만큼 효율적이지 않고, 새 기술 학습에 시간 소요". CNBC 분석: 중국 휴머노이드 최대 장애물은 로봇 자체 능력의 한계. IPO 열풍 대비 기술 현실 간 괴리 부각.',
   '2026-08-29'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] 688836.SH 주가 급락 + 밸류에이션 재평가
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree 688836.SH Slides to RMB 585: -45% From Peak, Q1 Profit Down 53% as Valuation Reset Begins',
  'Caixin Global / Investing.com / Invezz / CNBC',
  'https://www.caixinglobal.com/2026-08-28/analysis-unitree-shares-slide-as-investors-reassess-humanoid-robot-valuations-102478761.html',
  '2026-08-29'::timestamp,
  'Unitree Robotics (688836.SH) closed at RMB 585.00 on August 28, down 4.9% from previous close of 615.03. Stock has now fallen 45% from Day 1 intraday peak of 1,100. Q1 2026 adjusted net profit dropped 53% YoY to ¥40M, sharpening doubts about stretched valuations. Founder Wang Xingxing at World Robot Congress warned the sector''s "ChatGPT moment" could take 2-10 years. Robotics bubble fears intensifying.',
  'Unitree Robotics 688836.SH stock analysis (August 29 consolidated). August 28 close: RMB 585.00 (previous close 615.03, -4.9%). Ten-day trajectory since IPO Aug 19: Day 1 peak ¥1,100 (+629% intraday) → close ¥845 → ¥672 (Aug 22) → ¥591 (Aug 26) → ¥615 (Aug 27) → ¥585 (Aug 28). Total decline from peak: -47%. From Day 1 close: -31%. Still +288% above IPO price ¥150.80. Market cap: ~¥230B (~$32B), down from Day 1 peak ~¥342B. Financial performance: Q1 2026 adjusted net profit ¥40 million, down 53% year-over-year. Revenue growth slowing. Caixin analysis (Aug 28): investors reassessing humanoid robot valuations broadly. IPO fever cooling. Founder comments at World Robot Congress (Aug 20-25): Wang Xingxing acknowledged embodied intelligence still faces ''critical industry-wide challenge: insufficient generalization capabilities.'' He stated the sector''s "ChatGPT moment" could arrive in 2-3 years or take as long as a decade. Market dynamics: institutional holders maintaining positions but retail selling pressure intensifying. STAR Market''s first humanoid pure-play stock now testing support. Broader context: 45% crash raises robotics bubble concerns. Some analysts compare to 2021 EV SPAC correction.',
  'en', 'business', 'robot',
  md5('unitree-688836-crash-585-q1-profit-drop-2026-08-29'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","H2","B2"],"technologies":[],"marketInsights":["RMB 585 Aug 28 close","-45% from peak","-53% Q1 profit YoY","~¥230B market cap"],"keyPoints":["Valuation reset underway","Q1 adj profit ¥40M -53%","Founder: ChatGPT moment 2-10yr","Robotics bubble fears"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-688836-crash-585-q1-profit-drop-2026-08-29'));

-- [Industry] World Humanoid Robot Games 결과
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'World Humanoid Robot Games 2026: Tiangong Ultra Smashes 100m in 8.64s, AGIBOT Tops Medal Table',
  'CGTN / Global Times / TechTimes / ZeroGantry',
  'https://www.globaltimes.cn/page/202608/1369085.shtml',
  '2026-08-27'::timestamp,
  'The 2nd World Humanoid Robot Games concluded August 26 at Beijing''s Ice Ribbon. 2,056 robots from 666 teams competed across 51 events. Tiangong Ultra (Beijing Humanoid Robot Innovation Centre) won the 100m large-robot final in 8.64 seconds — beating Usain Bolt''s 9.58s human record. AGIBOT debuted and topped the medal table with 46 medals, winning golds in dexterous manipulation and scenario-based events. The Games demonstrate China''s dominance in the competitive robotics ecosystem.',
  'World Humanoid Robot Games 2026 full results report (August 22-26, Beijing). Venue: National Speed Skating Oval (Ice Ribbon). Scale: 2,056 humanoid robots, 666 teams from around the world, 51 competition events, 1,301 individual contests over 5 days. Headline event — 100m large-robot race: Tiangong Ultra (developed by Beijing Humanoid Robot Innovation Centre / BHRIC) won the final in 8.64 seconds. Tiangong Ultra progression through the Games: heat 9.39s → semifinal 8.86s → final 8.64s. This smashes Usain Bolt''s human world record of 9.58 seconds, set in Berlin 2009. Tiangong Ultra is a full-size humanoid developed by BHRIC with backing from the Beijing municipal government. Overall standings: AGIBOT topped the medal table in its Games debut with 46 medals total. AGIBOT won gold medals in dexterous manipulation and scenario-based competition categories. Other notable competitors: Honor Lightning recorded approximately 9.32-9.47s in earlier 100m rounds. Multiple Chinese robotics companies dominated the medal count. International participation confirmed but Chinese teams led overall. Significance: demonstrates the depth and diversity of China''s robotics ecosystem. The Games are establishing an international competitive framework for humanoid robots. Growing sponsorship and media coverage signal the maturation of humanoid robot competition as a category.',
  'en', 'industry', 'robot',
  md5('world-humanoid-robot-games-2026-tiangong-agibot-medals-2026-08-29'),
  '{"mentionedCompanies":["BHRIC","AGIBOT","Honor"],"mentionedRobots":["Tiangong Ultra","Honor Lightning"],"technologies":["bipedal locomotion","dexterous manipulation"],"marketInsights":["2,056 robots","666 teams","51 events","AGIBOT 46 medals"],"keyPoints":["Tiangong Ultra 8.64s 100m","Bolt 9.58s record beaten","AGIBOT medal table leader","China ecosystem dominance"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('world-humanoid-robot-games-2026-tiangong-agibot-medals-2026-08-29'));

-- [Tesla] Optimus Fremont 라인 46일 해체 상세
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Tears Down Fremont Model S/X Line in 46 Days for Optimus Gen 3 Production',
  'Yahoo Finance / Teslarati / Basenor',
  'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
  '2026-08-29'::timestamp,
  'Tesla completed dismantling the Fremont Model S/X production line in just 46 days — exceptionally fast by industry standards. The freed space is being converted to Optimus Gen 3 manufacturing. However, Q4 2025 earnings call revealed the 1,000+ internally deployed units are "primarily for learning and data collection rather than performing productive tasks." Actual Gen 3 production start remains unconfirmed. V3 reveal delayed to "later this year." Analysts question feasibility of 1M/year production target.',
  'Tesla Optimus Fremont facility conversion update (August 29 analysis). Teardown speed: Model S and Model X final vehicles rolled off in early May 2026. The entire production line was dismantled in 46 days — considered exceptionally fast by automotive industry standards. The speed demonstrates Tesla''s urgency in pivoting to humanoid robot manufacturing. Facility conversion: the freed Fremont space is being converted into Tesla''s first dedicated Optimus Gen 3 production line. The line will accommodate 10,000 unique parts for an entirely new product category. Internal deployment reality check: Elon Musk confirmed 1,000+ Optimus units at Fremont and Giga Texas on Q4 2025 earnings call (January 2026). However, he also stated these units are "primarily for learning and data collection rather than performing productive tasks" — contradicting the impression of productive factory deployment. Tasks observed: battery handling, cable routing, connector seating, parts handling. But performing tasks ≠ productive contribution. Production status as of August 29: no confirmed Gen 3 production start. Musk at Q2 2026 earnings (August 5): "starting soon" but no concrete date. V3 reveal: repeatedly delayed, now "later this year." Production targets: 1M/year at Fremont (near-term), 4M/year aspirational by end 2027. Analysts increasingly skeptical given zero confirmed production units. Consumer sales: end of 2027 at earliest, $20-30K price target. No public deposits or waitlists.',
  'en', 'product', 'robot',
  md5('tesla-optimus-fremont-46day-teardown-reality-check-2026-08-29'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3"],"technologies":[],"marketInsights":["46-day line teardown","1,000+ internal units learning only","no production started","V3 reveal delayed again"],"keyPoints":["Model S/X line dismantled in 46 days","Internal units for data collection not production","1M/year target questioned","$20-30K consumer price 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-fremont-46day-teardown-reality-check-2026-08-29'));

-- [AGIBOT] WAIC 2026 4종 신제품 발표
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT Debuts 4 New Products at WAIC 2026: A3 Ultra Humanoid, G2 Max Heavy-Payload, OmniHand 3, X2 Edu',
  'Interesting Engineering / Yahoo Finance / PR Newswire / eWeek',
  'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
  '2026-07-20'::timestamp,
  'AGIBOT launched four new products at WAIC 2026 in Shanghai: (1) A3 Ultra — 174cm, 51 DoF full-size humanoid with NVIDIA Thor SoC, named sole embodied AI "Gem of the Exhibition"; (2) G2 Max — heavy-payload robot for material handling/palletizing with force-controlled arms, adjustable height, omnidirectional mobility, and battery swap; (3) OmniHand 3 Ultra-M — 630g dexterous hand with 20 active DoF, 5kg grip, vision-based tactile sensors; (4) X2 Edu — education platform. Cumulative 15,000 robots shipped.',
  'AGIBOT WAIC 2026 product launch report (July 20, Shanghai). Four new products: (1) Yuanzheng A3 Ultra — full-size humanoid for commercial and service tasks. 174cm tall, 51 degrees of freedom, 5kg per arm payload. Powered by NVIDIA Thor SoC. Named "WAIC 2026 Gem of the Exhibition" — the only embodied AI product among 10 items selected for this honor. Designed for real-world commercial deployment in service and manufacturing environments. (2) G2 Max — heavy-payload embodied robot specialized for material handling and palletizing. Features: force-controlled arms, adjustable working height, omnidirectional mobility, battery-swapping for continuous operations. Targeting warehouse/logistics high-throughput scenarios. (3) OmniHand 3 Ultra-M — dexterous robotic hand. Weight: 630 grams. 20 active degrees of freedom. 5kg gripping capacity. Vision-based tactile sensors for precise manipulation. Designed for integration with both AGIBOT platforms and third-party robots. (4) X2 Edu — education robotics platform for STEM/AI training. Company milestones: 15,000 cumulative robots shipped worldwide. Revenue trajectory: RMB 300K (year 1) → RMB 60M (year 2) → RMB 1B+ (2025). Active factory deployments: Longcheer (tablets), automotive, semiconductor sectors. AGIBOT also topped the World Humanoid Robot Games medal table (46 medals, Aug 22-26) in its debut. Global expansion: CES 2026 U.S. debut, MWC 2026 portfolio showcase.',
  'en', 'product', 'robot',
  md5('agibot-waic-2026-a3ultra-g2max-omnihand3-x2edu-2026-08-29'),
  '{"mentionedCompanies":["AGIBOT","NVIDIA"],"mentionedRobots":["A3 Ultra","G2 Max","X2 Edu"],"technologies":["NVIDIA Thor","OmniHand 3 Ultra-M","force-controlled arms","vision-based tactile sensors"],"marketInsights":["15,000 cumulative robots","RMB 1B+ revenue","WAIC Gem award","46 medals at Robot Games"],"keyPoints":["A3 Ultra 174cm 51DoF humanoid","G2 Max heavy-payload","OmniHand 630g 20DoF","sole embodied AI WAIC award"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-waic-2026-a3ultra-g2max-omnihand3-x2edu-2026-08-29'));

-- [Apptronik] 시리즈A $935M 마감 + Gemini Robotics On-Device
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Closes $935M+ Series A: $5.3B Valuation, Google DeepMind Gemini Robotics On-Device for Apollo',
  'Apptronik / GlobeNewswire / Forbes / CNBC / Sacra',
  'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
  '2026-08-29'::timestamp,
  'Apptronik''s total Series A reached $935M+ ($415M initial + $520M extension), bringing total capital raised to nearly $1B. Post-money valuation ~$5.3B at 3x multiple on extension. New investors: AT&T Ventures, John Deere, QIA. Google DeepMind adapted Gemini Robotics On-Device for Apollo — on-robot inference without cloud round-trips, requiring only 50-100 demonstrations for new task adaptation. Robot Park (Austin) serves as flagship data collection facility. Apollo 3 first commercial product targeting 2027.',
  'Apptronik funding and partnership consolidation (August 29 update). Series A total: $935M+ closed. Breakdown: initial $415M Series A (2025) + $520M extension (Feb 11, 2026). Total capital raised: approximately $1 billion. Valuation: TechCrunch reported post-money ~$5.3B on the extension. The extension was opened at 3x multiple of initial Series A valuation. Extension round investors: existing — B Capital, Google, Mercedes-Benz, PEAK6. New — AT&T Ventures, John Deere, Qatar Investment Authority (QIA). Use of funds: Apollo production ramp, expanded commercial and pilot deployments, construction of robot training and data-collection facilities, development of new robot for 2026 debut. Google DeepMind integration: Gemini Robotics On-Device — lower-latency, locally-executed variant adapted specifically for Apollo. Enables on-robot inference without cloud round-trips. Requires as few as 50-100 demonstrations to adapt to new tasks. Gemini Robotics 2 (Jul 31): whole-body intelligence suite demonstrated on Apollo 2 — autonomous walking, crouching, bending, manipulation with real-time reasoning. Robot Park: flagship facility in Austin, TX (opened Jun 30). Multiple locations collecting real-world deployment data from Apollo 2 fleets. Data feeds Gemini Robotics foundation models. Product roadmap: Apollo 2 — training/data platform (bipedal and wheeled). Apollo 3 — first commercial product, targeting 2027. Current deployments: Mercedes-Benz, GXO Logistics active testing.',
  'en', 'business', 'robot',
  md5('apptronik-935m-series-a-gemini-on-device-apollo-2026-08-29'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO","John Deere","QIA","AT&T Ventures"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics On-Device","Gemini Robotics 2","whole-body intelligence"],"marketInsights":["$935M+ Series A total","~$5.3B valuation","~$1B total raised","3x multiple on extension"],"keyPoints":["50-100 demos for task adaptation","Robot Park Austin flagship","Apollo 3 commercial 2027","AT&T/JohnDeere/QIA new investors"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-935m-series-a-gemini-on-device-apollo-2026-08-29'));

-- [Industry] WRC 2026 업계 현실 진단
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'World Robot Congress 2026: Industry Leaders Warn Humanoid Robots Still Far From Human-Level Efficiency',
  'CNBC / Caixin Global / The AI Insider',
  'https://www.cnbc.com/2026/08/21/chinese-humanoid-robots-face-challenge-of-their-own-capabilities.html',
  '2026-08-21'::timestamp,
  'At the World Robot Congress in Beijing (Aug 20-25), China''s humanoid industry leaders acknowledged the sector''s biggest challenge: robots are still not as efficient as humans. Unitree founder Wang Xingxing warned that insufficient generalization capability is the critical industry-wide problem, with the sector''s "ChatGPT moment" potentially 2-10 years away. Despite 15,000+ Agibot units shipped and 1,000+ Figure 03s produced, the gap between IPO hype and technological reality is widening.',
  'World Robot Congress 2026 industry analysis (Beijing, August 20-25). Key theme: technology reality vs. market hype. CNBC headline: "Chinese humanoid robots'' biggest obstacle: Humans are still (mostly) better." Industry leader remarks: Unitree founder Wang Xingxing — acknowledged that embodied intelligence still faces a "critical industry-wide challenge: insufficient generalization capabilities." Stated the sector''s ChatGPT moment could arrive in 2-3 years or take as long as a decade. Multiple speakers — robots not yet as efficient as humans; learning new skills takes significant time and data. The AI Insider analysis (Aug 21): the state of humanoid robotics in 2026 shows trends, challenges and opportunities coexisting. Challenges include: task generalization remains narrow, deployment environments still heavily constrained, unit economics unproven at scale, regulatory frameworks lagging. Bright spots: real factory deployments underway (AGIBOT Longcheer, Figure BMW, Digit GXO), production volumes growing (AGIBOT 15,000, Figure 1,000+), investment capital available ($935M Apptronik, $39B Figure AI, $53B Unitree peak). Context: WRC coincides with Unitree IPO week — stock''s 45% crash from peak underscores market''s reassessment of the gap between ambition and execution. KraneShares analysis: the race is shifting "from pilot to platform" — the next phase requires proving unit economics, not just demos.',
  'en', 'industry', 'robot',
  md5('wrc-2026-humanoid-reality-check-generalization-gap-2026-08-29'),
  '{"mentionedCompanies":["Unitree","AGIBOT","Figure AI","Apptronik","KraneShares"],"mentionedRobots":[],"technologies":["embodied intelligence","generalization"],"marketInsights":["ChatGPT moment 2-10 years","IPO hype vs reality gap","pilot to platform shift","unit economics unproven"],"keyPoints":["Robots still less efficient than humans","Generalization is key barrier","WRC industry reality check","Unitree 45% crash context"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('wrc-2026-humanoid-reality-check-generalization-gap-2026-08-29'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Unitree 주가 급락 + Q1 실적 악화
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Unitree%') LIMIT 1),
  'funding', 'warning',
  '[Unitree] 688836.SH 급락 RMB 585: 피크 -45%, Q1 순이익 -53% — 밸류에이션 재평가',
  '8/28 종가 RMB 585(전일 대비 -4.9%). 피크 1,100 대비 -45%. Q1 2026 조정순이익 ¥40M(-53% YoY). 창업자 WRC: ChatGPT moment 2-10년. 로보틱스 버블 우려. 기관 유지되나 개인 매도세.',
  '{"source":"Caixin/Investing.com/Invezz","confidence":"A","date":"2026-08-29","price":"RMB 585","peakDrop":"-45%","q1Profit":"¥40M -53% YoY","founderWarning":"ChatGPT moment 2-10yr","marketCap":"~¥230B/$32B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%688836.SH 급락 RMB 585%');

-- Alert 2: World Humanoid Robot Games — AGIBOT 종합 1위
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'warning',
  '[Industry] World Humanoid Robot Games: Tiangong Ultra 8.64초(Bolt 돌파), AGIBOT 종합 1위 46메달',
  'Beijing 8/22-26: 2,056로봇·666팀·51종목. Tiangong Ultra 100m 8.64초(Bolt 9.58 돌파). AGIBOT 데뷔전 종합 1위 46메달. 중국 로보틱스 생태계 깊이·경쟁력 과시.',
  '{"source":"CGTN/GlobalTimes/TechTimes","confidence":"A","date":"2026-08-29","event":"World Humanoid Robot Games 2026","venue":"Beijing Ice Ribbon","tiangong100m":"8.64s","boltRecord":"9.58s","agibotMedals":46,"robots":2056,"teams":666,"events":51}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%World Humanoid Robot Games%Tiangong Ultra 8.64%');

-- Alert 3: AGIBOT WAIC 4종 신제품
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Agibot%') LIMIT 1),
  'score_spike', 'info',
  '[AGIBOT] WAIC 2026: A3 Ultra 휴머노이드 + G2 Max + OmniHand 3 — 4종 출시, 15K대 누적',
  'WAIC 2026(7/20) 4종: A3 Ultra(174cm·51DoF·NVIDIA Thor·유일 AI보석상), G2 Max(중하역), OmniHand 3 Ultra-M(630g·20DoF·5kg그립), X2 Edu. 누적 15,000대. 매출 ¥1B+.',
  '{"source":"IE/Yahoo/PRNewswire","confidence":"A","date":"2026-08-29","products":["A3 Ultra","G2 Max","OmniHand 3 Ultra-M","X2 Edu"],"a3UltraSpecs":"174cm 51DoF NVIDIA Thor","omnihandSpecs":"630g 20DoF 5kg grip","cumulativeShipments":15000,"award":"WAIC Gem of Exhibition"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%WAIC 2026%A3 Ultra%G2 Max%');

COMMIT;
