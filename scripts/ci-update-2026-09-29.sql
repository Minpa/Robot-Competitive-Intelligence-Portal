-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-29
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-29T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-28
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-29.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Tesla Optimus 중국 3개 부품 공급업체 양산 파트너 인증
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Austin American-Statesman / Teslarati',
   'https://www.statesman.com/business/article/tesla-optimus-china-suppliers-texas-22445777.php',
   '[Warning] Tesla Optimus, 중국 3개 부품사 양산 파트너 인증 — Tuopu/Joyson/Sanhua',
   'Tesla 로보틱스팀이 닝보 소재 부품사 3곳을 현장 감사 후 양산 파트너로 인증: Tuopu Group(액츄에이터/섀시), Ningbo Joyson Electronic(센서), Zhejiang Sanhua Intelligent Controls(열관리). 현재 주간 수백대 생산. 2026년 9월 말 주 1,000대 → 연말 2,000~2,500대/주 목표. 텍사스 Gigafactory 확장 병행. 중국 공급망 의존도 심화 주시 필요.',
   '2026-09-29'::timestamp, 'pending'),

-- 2. [Info] Tesla Optimus Gen 3 양산 설계 공개 — 손 디자인 변경, 연 100만대 목표
  (gen_random_uuid(), 'Optimusk.blog / Gizmodo / Basenor',
   'https://optimusk.blog/blog/tesla-optimus-humanoid-robot-latest-version-2026/',
   '[Info] Tesla Optimus Gen 3 공개 — 양산 설계 최초 적용, 연 100만대 목표',
   'Q1 2026 Gen 3 공개. v2.5 대비 주요 변경: 양산 지향 신형 손 디자인, 전체 구조 양산 설계화. 2026년 말 양산 개시 목표, 최종 연 100만대 용량 계획. 다만 Musk 1/28 발언: Optimus는 아직 "useful work 불가, R&D 단계". 이전 모든 타임라인 12~24개월 지연 이력. 소비자 판매 2027년 말 목표.',
   '2026-09-29'::timestamp, 'pending'),

-- 3. [Critical] Boston Dynamics Atlas 5세대 공개 + Hyundai 조지아 본격 운영
  (gen_random_uuid(), 'Forbes / Engadget / Automate.org / Boston Dynamics',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   '[Critical] Boston Dynamics 5세대 Atlas — 복잡도 "한 자릿수" 감소, Hyundai 조지아 본격 운영',
   '2026년 7월 5세대 Atlas 공개: 이전 세대 대비 복잡도 거의 한 자릿수 감소. 56 DOF, 50kg 리프트, 7.5ft 리치, -4~104°F 작동. CES 2026 Best Robot 수상. 2026 생산분 전량 Hyundai RMAC+Google DeepMind에 배정 완료. Hyundai 조지아 EV공장 로보틱스 허브 개설, 파일럿→본격 운영 전환 완료. 2028년 연 30,000대 목표. 항공우주·반도체·물류 확장 계획.',
   '2026-09-29'::timestamp, 'pending'),

-- 4. [Warning] Figure AI $39B 밸류에이션 + BotQ 24배 생산성 향상
  (gen_random_uuid(), 'Forge Global / ValueAdd VC / Figure AI',
   'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
   '[Warning] Figure AI $39B 밸류에이션, BotQ 시간당 1대 생산 달성 — Figure 03 배포 중',
   '총 $2.34B 투자, $39B 밸류에이션(18개월 15배 상승). Series C $1B+ 클로즈(2025.09). BotQ 자체 공장: 120일 만에 일 1대→시간 1대(24배) 생산성 향상, 연 12,000대 용량. Figure 02(168cm, 20kg, Helix VLA), Figure 03(5ft8, 61kg, 1.2m/s, 5h/2.3kWh 교체식 배터리, 주행 시연). 2026.01 업데이트: 시각 기반 전신 자율 8시간 교대 완료. BMW Spartanburg 배치 중. 500명+ 직원.',
   '2026-09-29'::timestamp, 'pending'),

-- 5. [Warning] Unitree IPO 승인 + G1 글로벌 판매 1위 + 보안 취약점 공개
  (gen_random_uuid(), 'RoboZaps / Robot Price Index / Unitree',
   'https://blog.robozaps.com/b/unitree-robotics',
   '[Warning] Unitree IPO 승인(STAR Market ~$5.9B), G1 글로벌 판매 1위, 보안 CVE 2건 공개',
   '2026.07.03 IPO 등록 승인. 상하이 STAR Market 데뷔 — RMB 42억(~$618M) 조달, ~$5.9B 밸류에이션. G1: 글로벌 최다 판매 휴머노이드 로봇($13,500, 2025년 5,500대 출하, 시장 점유율 ~32%). 단, 베이스 모델은 프로그래밍 불가. 보안 취약점 공개(CVE-2025-60250/60251): Go2/G1/H1/B2 전 모델 Bluetooth Wi-Fi 설정에 하드코딩 암호화 키 사용.',
   '2026-09-29'::timestamp, 'pending'),

-- 6. [Critical] Agility Digit 5 공개 — 업계 최초 협력적 안전 휴머노이드
  (gen_random_uuid(), 'Agility Robotics / Manufacturing Dive / BusinessWire',
   'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
   '[Critical] Agility Digit 5 공개(9/15) — 업계 최초 "협력적 안전", $300M 수주, SPAC 상장',
   '2026.09.15 Digit 5 공개: 물리적 안전 장벽 없이 사람 근접 작업 가능한 최초 범용 휴머노이드. $300M 다년 주문 확보(Schaeffler, GXO, Toyota Motor Manufacturing Canada). 브랜드 리네이밍: "Agility Robotics"→"Agility"로 확장. Churchill Capital Corp XI 합병 통해 "AGLT" 상장 예정(~$2.5B 밸류, $620M 자금 확보). RoboFab(오레곤): 연 10,000대, 500명+. 전략 투자자: DCVC, NVIDIA, Amazon, SoftBank, Foxconn.',
   '2026-09-29'::timestamp, 'pending'),

-- 7. [Warning] Apptronik $520M 투자, $5B 밸류 — Google DeepMind 전략 파트너십
  (gen_random_uuid(), 'CNBC / SiliconANGLE / The Robot Report',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   '[Warning] Apptronik $520M 투자($5B), Google DeepMind Gemini 파트너십, Apollo 2/3 로드맵',
   '2026.02 Series A-X $520M 펀딩($5B 밸류). 참여: B Capital, Google, Mercedes-Benz, PEAK6, AT&T Ventures, John Deere, QIA(신규). Google DeepMind 전략 파트너십: Gemini Robotics 기반 차세대 휴머노이드 공동 개발. Mercedes-Benz/GXO와 파일럿 중. 2026.06 Robot Park(오스틴) 확장 개소 — Apollo 2 데이터 수집 플랫폼(바이페달/휠 선택). Apollo 3: 2027 첫 상용 제품 예정.',
   '2026-09-29'::timestamp, 'pending'),

-- 8. [Warning] 1X Technologies NEO 양산 개시 — 가정용 시장 본격 진출
  (gen_random_uuid(), 'Forbes / TNW / eWeek / TechCrunch',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '[Warning] 1X NEO 양산 개시 — CA 공장 10,000대/년, 사전주문 5일 매진, $20K/$499월',
   '2026.04 Hayward, CA 58,000sqft 공장 개소. 1차년도 10,000대 → 2027년 말 100,000대/년 목표. 2025.10 사전주문 5일 만에 1차분 매진. 가격: $20,000(Early Access) / $499월(구독). 3색상(Tan, Gray, Dark Brown). EQT 포트폴리오 300+사에 2026~2030년 10,000대 공급 계약. $1B 추가 투자 모색, $10B+ 밸류 목표.',
   '2026-09-29'::timestamp, 'pending'),

-- 9. [Info] AGIBOT CES 2026 미국 진출 + 누적 10,000대 → 3월 달성
  (gen_random_uuid(), 'PR Newswire / Intelligent CIO / Tom''s Guide',
   'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
   '[Info] AGIBOT CES 2026 미국 진출, 누적 10,000대 생산 달성 — 오픈소스 X1 $20K',
   'CES 2026서 미국 시장 공식 진출. 누적 5,000대 출하(CES 시점) → 2026.03 10,000대 돌파(3개월 만에 2배). "One Body, Three Intelligences" 아키텍처: 상호작용·조작·이동 통합. 제품군: A2(풀사이즈, 전시/안내), X2(하프사이즈, 엔터/교육), G2(산업용, 힘 제어). X1: 130cm, 33kg, 34 DOF, $20K 미만, 하드웨어 CAD·펌웨어·ROS 2 완전 오픈소스(GitHub).',
   '2026-09-29'::timestamp, 'pending');


-- ============================================================
-- 2. competitive_alerts: 전략 워룸 경쟁 알림
-- ============================================================

-- 중국 휴머노이드 로봇 표준 체계 발표
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'partnership', 'warning',
  '[규제] 중국, 세계 최초 휴머노이드 로봇+체화지능 표준 체계 공식 발표 (2026.02)',
  '2026.02 베이징: "휴머노이드 로봇 및 체화지능 표준 체계(2026 Edition)" 공식 발표. 120+ 연구기관/기업 참여. 전 밸류체인·전 수명주기 포괄 — 세계 최초. EU: 2027.01.20부터 Machinery Regulation(EU) 2023/1230 적용 (현재 상용 휴머노이드 15% 미만 완전 CE 인증). ISO 25785-1(동적 안정 로봇 전용) 개발 중. LG 대응: 중국 표준 선도권 확보 동향 주시, EU CE 인증 일정 대비 필요.',
  '{"source":"SESEC / Robotics & Automation News","sourceUrl":"https://sesec.eu/2026/04/01/chinas-first-standards-system-for-humanoid-robots-and-embodied-intelligence/","reliability":"A","region":"china+eu"}'::jsonb,
  false, '2026-09-29'::timestamp
);

-- 2026 상반기 휴머노이드 투자 $8.6B — 역대 최고
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'funding', 'critical',
  '[투자] 2026 상반기 휴머노이드 투자 $8.6B — 2025년 전체의 1.8배, 역대 최고',
  '2026 상반기 기준 휴머노이드 로봇 스타트업 투자 총액 $8.6B — 2025년 전체 투자의 1.8배 이상, 역대 최고. 주요 딜: Figure AI($39B 밸류, Series C $1B+), Apptronik($5B, $520M), 1X($10B+ 목표). 상장: Unitree(STAR Market ~$5.9B), Agility(SPAC ~$2.5B). 자본 집중·경쟁 심화 가속. LG: 투자 속도전 대비 전략 수립 필요.',
  '{"source":"Humanoid Index / TechFundingNews / AI Funding Tracker","sourceUrl":"https://humanoidindex.org/funding","reliability":"B","totalInvestment":"$8.6B H1 2026"}'::jsonb,
  false, '2026-09-29'::timestamp
);


-- ============================================================
-- 3. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla] Optimus 중국 부품 공급업체 인증
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus Production Expands with Chinese Suppliers, Texas Factory',
  'Austin American-Statesman / Teslarati',
  'https://www.statesman.com/business/article/tesla-optimus-china-suppliers-texas-22445777.php',
  '2026-09-20'::timestamp,
  'Tesla robotics team audited and certified three Ningbo-based component suppliers for Optimus mass production: Tuopu Group (actuators/chassis), Ningbo Joyson Electronic (sensors), Zhejiang Sanhua Intelligent Controls (thermal management). Current production: several hundred units/week, targeting 1,000/week by late September 2026, rising to 2,000-2,500/week by year end.',
  'Tesla''s robotics team audited component suppliers in Ningbo, China, moving three manufacturers to certified mass production partner status: Tuopu Group (actuators and chassis), Ningbo Joyson Electronic (sensors), and Zhejiang Sanhua Intelligent Controls (thermal management). Tesla is sourcing Optimus robot components from China while expanding production at Gigafactory Texas. Supply chain reports suggest Tesla''s near-term production goal is about 1,000 Optimus units a week by late September, rising to 2,000 to 2,500 units a week by the end of the year. As of September 2026, Tesla produced several hundred Optimus robots a week, up from just a few dozen a week a few months earlier.',
  'en', 'industry', 'robot',
  md5('tesla-optimus-china-suppliers-production-expand-2026-09-29'),
  '{"mentionedCompanies":["Tesla","Tuopu Group","Ningbo Joyson Electronic","Zhejiang Sanhua Intelligent Controls"],"mentionedRobots":["Optimus","Optimus Gen 3"],"technologies":["actuator manufacturing","sensor integration","thermal management"],"marketInsights":["Chinese supply chain expansion","Weekly production ramp 100s to 2500","Gigafactory Texas expansion"],"keyPoints":["3 Chinese suppliers certified","Production ramp to 2500/week by year end","Ningbo supply chain audit"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-china-suppliers-production-expand-2026-09-29'));

-- [Boston Dynamics] 5세대 Atlas + Hyundai 본격 운영
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics 5th-Gen Atlas: Order of Magnitude Simpler, Hyundai Georgia Full Operations',
  'Forbes / Engadget / Boston Dynamics',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  'Boston Dynamics unveiled its fifth-generation Atlas humanoid robot with nearly an order of magnitude reduction in complexity. 56 DOF, 50kg lift, 7.5ft reach. All 2026 deployments committed to Hyundai RMAC and Google DeepMind. Hyundai Georgia EV plant robotics hub opened, transitioned from pilot to full operations. 30,000 units/year target by 2028.',
  'Boston Dynamics unveiled its fifth-generation Atlas humanoid robot, featuring an almost order of magnitude reduction in complexity compared to earlier versions. Atlas features 56 degrees of freedom, lifts up to 50 kg, has a reach of up to 7.5 feet, and can operate at temperatures ranging from -4 to 104 degrees Fahrenheit. The company won Best Robot at CES 2026. All Atlas deployments for 2026 are fully committed, with fleets shipping to Hyundai''s Robotics Metaplant Application Center (RMAC) in Georgia and Google DeepMind. Boston Dynamics officially opened its robotics center at Hyundai''s electric vehicle production site outside of Savannah, Georgia, transitioning from pilot to full operations. Hyundai targets annual production capacity of 30,000 Atlas units by 2028 and plans to deploy more than 25,000 across Hyundai and Kia plants. Boston Dynamics is engaging aerospace, semiconductor and logistics customers.',
  'en', 'technology', 'robot',
  md5('boston-dynamics-5th-gen-atlas-hyundai-georgia-2026-09-29'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind","Kia"],"mentionedRobots":["Atlas","Atlas 5th Gen"],"technologies":["56 DOF","50kg payload","complexity reduction"],"marketInsights":["2026 fully committed","30K/year by 2028","Aerospace/semiconductor/logistics expansion"],"keyPoints":["5th gen order of magnitude simpler","Hyundai Georgia full operations","CES 2026 Best Robot"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('boston-dynamics-5th-gen-atlas-hyundai-georgia-2026-09-29'));

-- [Agility] Digit 5 협력적 안전 휴머노이드
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Unveils Digit 5: First Cooperatively Safe Humanoid Robot at Scale',
  'Agility Robotics / Manufacturing Dive / BusinessWire',
  'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
  '2026-09-15'::timestamp,
  'Agility Robotics unveiled Digit 5 on September 15, 2026 — the first humanoid robot engineered for cooperatively safe work at scale, allowing close-proximity human collaboration without physical safety barriers. $300M multi-year orders secured from Schaeffler, GXO, Toyota Motor Manufacturing Canada. SPAC merger with Churchill Capital Corp XI for "AGLT" listing.',
  'Agility Robotics unveiled Digit 5, the next generation of its general-purpose humanoid robot, on September 15, 2026. Digit 5 is the first humanoid robot engineered for cooperatively safe work at scale, allowing it to work in close proximity to people without physical safety barriers required by traditional automation. The company secured $300 million of multi-year orders for Digit v5. Operating in commercial environments with Schaeffler, GXO, and Toyota Motor Manufacturing Canada. Agility rebranded from "Agility Robotics" to "Agility." Announced SPAC merger with Churchill Capital Corp XI for ~$2.5B valuation listing as "AGLT." RoboFab facility in Salem, Oregon: 70,000 sq ft, up to 10,000 Digit robots/year capacity, 500+ employees. Strategic investors: DCVC, NVIDIA, Amazon, SoftBank Vision Fund 2, Foxconn, Schaeffler, Abico, Playground Global.',
  'en', 'product', 'robot',
  md5('agility-digit-5-cooperatively-safe-spac-2026-09-29'),
  '{"mentionedCompanies":["Agility Robotics","Schaeffler","GXO","Toyota","Churchill Capital","NVIDIA","Amazon","SoftBank","Foxconn"],"mentionedRobots":["Digit 5","Digit v5"],"technologies":["cooperative safety","barrier-free human collaboration"],"marketInsights":["$300M multi-year orders","SPAC $2.5B valuation","10K/year RoboFab capacity"],"keyPoints":["First cooperatively safe humanoid","Digit 5 unveiled Sep 15","AGLT ticker listing","$300M orders confirmed"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit-5-cooperatively-safe-spac-2026-09-29'));

-- [Apptronik] $520M 투자, Google DeepMind 파트너십
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Raises $520M at $5B Valuation for Apollo Robot, Google DeepMind Partnership',
  'CNBC / SiliconANGLE / The Robot Report',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  '2026-02-11'::timestamp,
  'Apptronik raised $520M Series A-X at $5B valuation. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Strategic partnership with Google DeepMind for Gemini Robotics-powered next-gen humanoids. Apollo 2 data collection platform unveiled June 2026. Apollo 3 targeted as first commercial product in 2027.',
  'In February 2026, Apptronik announced a $520 million Series A-X funding round, with participation from existing investors including B Capital, Google, Mercedes-Benz and PEAK6, and new investors including AT&T Ventures, John Deere and Qatar Investment Authority (QIA). The company was valued at $5 billion. Apptronik has a strategic partnership with Google DeepMind to build next-generation humanoid robots powered by Gemini Robotics. Apollo humanoids are being tested with partners Mercedes-Benz and GXO Logistics. In June 2026, Apptronik opened the expanded Robot Park in Austin, Texas, where fleets of Apollo 2 robots collect real-world data. Apollo 3 is the first true commercial product, targeted for 2027.',
  'en', 'industry', 'robot',
  md5('apptronik-520m-5b-google-deepmind-apollo-2026-09-29'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO Logistics","AT&T","John Deere","QIA","B Capital","PEAK6"],"mentionedRobots":["Apollo","Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","real-world data collection"],"marketInsights":["$520M at $5B valuation","Google DeepMind strategic partnership","Apollo 3 commercial 2027"],"keyPoints":["$520M Series A-X","QIA/John Deere new investors","Robot Park Austin expanded","Apollo 2 data platform"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-520m-5b-google-deepmind-apollo-2026-09-29'));

-- [1X] NEO 양산 개시
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Kicks Off Full-Scale Production of Humanoid Robot NEO in California',
  'Forbes / The Next Web / eWeek',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-04-30'::timestamp,
  '1X Technologies opened 58,000 sqft manufacturing facility in Hayward, California for NEO consumer humanoid production. Year-one capacity: 10,000 units, targeting 100,000+/year by end 2027. Pre-orders sold out within 5 days. Pricing: $20,000 Early Access or $499/month subscription. EQT deal for 10,000 units across 300+ portfolio companies 2026-2030.',
  '1X Technologies has opened a 58,000-square-foot manufacturing facility in Hayward, California, to produce its NEO humanoid robot at consumer scale, with capacity for 10,000 units in year one and a target of more than 100,000 units annually by the end of 2027. The first-year production sold out within five days of preorders opening in October 2025. NEO is available in three colours (Tan, Gray, Dark Brown) through two models: Early Access at $20,000 with priority delivery, or $499/month subscription. A deal with EQT involves shipping up to 10,000 NEO robots between 2026 and 2030 to EQT''s 300+ portfolio companies for manufacturing, warehousing, logistics, and industrial use cases. 1X was seeking $1 billion in new funding targeting $10 billion+ valuation.',
  'en', 'product', 'robot',
  md5('1x-neo-production-california-consumer-2026-09-29'),
  '{"mentionedCompanies":["1X Technologies","EQT","OpenAI"],"mentionedRobots":["NEO","NEO Home Robot"],"technologies":["consumer humanoid","subscription model"],"marketInsights":["$20K purchase or $499/mo subscription","10K units year 1","EQT 10K unit deal","$10B+ valuation target"],"keyPoints":["Hayward CA factory opened","Pre-orders sold out 5 days","Consumer home robot market","100K/year by 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-production-california-consumer-2026-09-29'));

-- [규제] 중국 휴머노이드 표준 체계
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'China Releases First Standards System for Humanoid Robots and Embodied Intelligence',
  'SESEC / Robotics & Automation News',
  'https://sesec.eu/2026/04/01/chinas-first-standards-system-for-humanoid-robots-and-embodied-intelligence/',
  '2026-02-15'::timestamp,
  'China officially released the Standards System for Humanoid Robots and Embodied Intelligence (2026 Edition) at a Beijing conference. Developed with 120+ research institutes and enterprises. Covers full value chain and full lifecycle. Meanwhile, EU Machinery Regulation (EU) 2023/1230 takes effect Jan 20, 2027. Fewer than 15% of commercial humanoids hold complete CE certification. ISO 25785-1 under development for dynamically stable robots.',
  'In February 2026, an Annual Conference on Standardization for Humanoid Robots and Embodied Intelligence was held in Beijing, where the Standards System for Humanoid Robots and Embodied Intelligence (2026 Edition) was officially released. This represents China''s first high-level standards framework covering the entire value chain and full lifecycle of humanoid robots and embodied intelligence, developed with participation from more than 120 research institutes, enterprises, and industry users. Internationally, ISO 10218:2025 and ANSI/A3 R15.06-2025 govern humanoid robot safety, with ISO 25785-1 under development specifically for dynamically stable robots. In the EU, fewer than 15% of commercial humanoids hold a complete industrial CE file. The Machinery Regulation (EU) 2023/1230 takes effect January 20, 2027.',
  'en', 'industry', 'robot',
  md5('china-humanoid-standards-2026-edition-eu-regulation-2026-09-29'),
  '{"mentionedCompanies":[],"mentionedRobots":[],"technologies":["ISO 10218:2025","ISO 25785-1","EU Machinery Regulation 2023/1230"],"marketInsights":["China first standards framework","Less than 15% CE certified","EU regulation tightening 2027"],"keyPoints":["China 2026 Edition standards","120+ participants","Full lifecycle coverage","EU 2027 deadline"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('china-humanoid-standards-2026-edition-eu-regulation-2026-09-29'));

COMMIT;

-- ============================================================
-- 실행 결과 요약
-- ============================================================
-- 총 수집: 12건
-- ci_monitor_alerts: 9건 (경쟁사 8개사 각 1건 + 업계 공통 0건 → alerts로 이동)
-- competitive_alerts: 2건 (규제 동향 1건, 투자 동향 1건)
-- articles: 6건 (주요 뉴스 기사)
-- 신뢰도 분포: A등급 8건, B등급 4건
