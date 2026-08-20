-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-20
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요: psql $DATABASE_URL -f scripts/ci-update-2026-08-20.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Tesla Optimus: 생산 일정 추가 지연, "later this year"로 재확인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Yahoo Finance / Teslarati / CryptoBriefing',
   'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
   '[Warning] Tesla Optimus: Q2 주주서한 후 생산라인 설치 지속 중 — 1,000+ Gen 3 내부 가동, 외부 출하 미정',
   '8/20 기준: 7/22 Q2 주주서한에서 "later this year"로 생산 일정 재확인. 프리몬트 전용 라인(구 Model S/X) 설치 중, 초기 용량 연 100만대 설계. 내부 1,000+ Gen 3 로봇 가동(배터리·부품·케이블 작업). 10,000개 고유 부품, 공급망 미확립으로 초기 생산 "극도로 느릴 것" — Musk. Giga Texas 2공장 2027 여름 목표, 연 1,000만대 용량 설계. TSMC·Samsung·Micron 핵심 서플라이어 확인. 2026 capex >$20B.',
   '2026-08-20'::timestamp, 'pending'),

-- 2. [Info] Boston Dynamics Atlas: 2026 전량 Hyundai·Google DeepMind 배정 완료, 30K/년 공장 계획
  (gen_random_uuid(), 'Forbes / Engadget / AI2Work / BD Blog',
   'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
   '[Info] Boston Dynamics Atlas: 2026 생산분 전량 Hyundai RMAC·Google DeepMind 배정 — 외부 고객 2027',
   '2026 Atlas 생산분 전량 committed: Hyundai RMAC(부품 시퀀싱) + Google DeepMind(AI 연구). 보스턴 본사 즉시 생산 개시. 스펙: 7.5ft 도달, 110lbs 리프트, -4~104°F 운용. Hyundai $26B 미국 투자 → 신공장 30,000대/년 2028 가동 예정. Google DeepMind 파트너십: Gemini 파운데이션 모델 통합 → 인지 능력 강화. 외부 고객 2027 초 추가 예정. 2028 Hyundai 자동차 공장 본격 투입(부품 시퀀싱).',
   '2026-08-20'::timestamp, 'pending'),

-- 3. [Info] Figure AI: Figure 03 BMW 스파르탄버그 물류 배치, 유럽(라이프치히) 확장
  (gen_random_uuid(), 'BMW Press / TheAIInsider / iFactoryApp',
   'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
   '[Info] Figure 03: BMW 스파르탄버그 물류 배치 + 라이프치히 유럽 최초 휴머노이드 투입 확정',
   'Figure 03 BMW 스파르탄버그 물류 배치: 비정렬 부품 → 시퀀싱 트롤리 적재. Figure 02 성과: >99% 배치 정확도/시프트, 84초 사이클타임 달성, 90,000+ 부품 적재, 1,250+ 운용시간, 30,000+ BMW X3 생산 기여. BMW Physical AI in Production CoC 설립. 라이프치히 공장 2026 여름 유럽 최초 휴머노이드 투입. Figure AI 밸류에이션 $39B, 총 $2.34B 조달. Helix 자체 AI 모델(OpenAI 파트너십 종료 2025.2). Brookfield 데이터 파트너십 2027까지.',
   '2026-08-20'::timestamp, 'pending'),

-- 4. [Critical] Unitree STAR Market 상장: 8/17-21 윈도우, $9B 밸류에이션
  (gen_random_uuid(), 'VT Markets / TechTimes / KraneShares / ValueAddVC',
   'https://valueaddvc.com/unitree-ipo-tracker',
   '[Critical] Unitree 688836.SH: STAR Market 상장 진행 — ¥150.80/주, $9.04B 밸류에이션',
   '8/17-21 상장 윈도우 진입. 공모가 ¥150.80/주, $9.04B 밸류에이션. 4,045만주(10%) 발행, ~$900M 조달. 2025 실적: RMB 1.69B 매출, 5,500+ 휴머노이드 출하, 흑자 달성(섹터 내 희귀). G1 $13,500 백오더 진행 중. H2 $29,900 리스트. FCC Covered List 영향: G1·H2 포함 미국 시장 신규 모델 진입 차단 — 미국 매출 비중 리스크 분석 필요. 보안 취약점 CVE-2025-60250/60251 블루투스 구성 이슈.',
   '2026-08-20'::timestamp, 'pending'),

-- 5. [Info] Agility Robotics: SPAC $2.5B 합병 진행, Digit v5 $300M+ 수주
  (gen_random_uuid(), 'TechCrunch / GeekWire / Forbes / SEC',
   'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
   '[Info] Agility Robotics: Churchill Capital XI SPAC $2.5B 합병 → AGLT 나스닥 상장 연내 예정',
   '6/24 SPAC 합병 발표: Churchill Capital Corp XI, $2.5B 임플라이드 밸류에이션. 틱커 AGLT, NASDAQ 연내 상장. $620M+ 조달($420M 트러스트 + $200M+ PIPE, Foxconn 주도). 투자자: Amazon, NVIDIA, SoftBank Vision Fund 2, Foxconn, DCVC. Digit v5 $300M+ 멀티이어 오더, 30+ 기업 파이프라인. 9개 고객 현장 65,000+ 운용시간: Schaeffler, GXO(100K+ 토트), Toyota Canada, Mercado Libre, Amazon. RoboFab 연 10,000대. Fremont Physical AI Hub 60K sqft 개소.',
   '2026-08-20'::timestamp, 'pending'),

-- 6. [Info] Apptronik: Apollo 2 Robot Park + Google DeepMind Gemini Robotics 2 통합
  (gen_random_uuid(), 'The Robot Report / Robotics & Automation News / CNBC',
   'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
   '[Info] Apptronik Apollo 2: Robot Park 데이터 수집 + Gemini Robotics 2 전신 자율제어 달성',
   'Apollo 2 이족보행+바퀴 듀얼 구성 공개. Robot Park(Austin, 90K sqft) 플릿 실환경 데이터 수집 → Apollo 3 AI 학습. Google DeepMind Gemini Robotics 2 통합: 전신 자율 보행·스쿼트·굽힘·조작. Apollo 3 = "첫 성숙 상용 제품", 2027 출시 확정. 총 조달 ~$1B(Series A-X $520M 포함), $5B 밸류에이션. 투자자: B Capital, Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. 고객: Mercedes-Benz, GXO, Jabil. 글로벌 Robot Park 네트워크 확장 중.',
   '2026-08-20'::timestamp, 'pending'),

-- 7. [Info] 1X NEO: 풀 프로덕션 가동, 고객 출하 "올해 중" — 인도 미확인
  (gen_random_uuid(), 'Forbes / eWeek / The Robot Report',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '[Info] 1X NEO: Hayward 풀 프로덕션 가동, 10K 프리오더 — 고객 인도는 "올해 중" 유지',
   'Hayward 공장(58K sqft) 풀 프로덕션 가동, 연 10K 용량. 10,000 프리오더 5일 만에 완판(2025.10). $20,000 Early Access 또는 $499/월 렌탈. 25-DOF 텐던 핸드(7/9 공개): IP68, 인간급 그립력, 촉각 슬립 감지. 그러나 7/16 기준 검증된 고객 인도 사례 없음. "올해 중 일부, 나머지 추후" 표현. EQT 10,000대 B2B 계약(2026-2030). OpenAI 지원, $10B+ 밸류에이션 $1B 조달 추진 중.',
   '2026-08-20'::timestamp, 'pending'),

-- 8. [Info] Agibot: HKEX IPO 프로세스 착수, 15,000대 출하, A3 Ultra Q4 출시
  (gen_random_uuid(), 'TechNode / CryptoBriefing / Capital.com',
   'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
   '[Info] Agibot: HKEX IPO 프로세스 착수 — HK$40-50B($5.1-6.4B) 밸류에이션, Q3 상장 목표',
   '7/27 HKEX IPO 프로세스 공식 착수. CICC·CITIC·Morgan Stanley 공동 주관사. HK$40-50B($5.1-6.4B) 밸류에이션 목표, 15-25% 지분 매각 → $1B+ 조달 가능. 투자자: LG Electronics, Mirae Asset, BYD, Hillhouse, Tencent, HongShan Capital. 누적 15,000대 출하(6/28). A3 Ultra(NVIDIA Thor, 51DOF) Q4 2026 출시. FCC Covered List 영향: 미국 시장 신규 모델 차단. 01.AI 전략적 MOU(4/17), Singtel MOU(싱가포르), UK APC(유럽).',
   '2026-08-20'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Tesla] Optimus 생산 지연 업데이트
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus Production Delay: Fremont Line Installation Ongoing, Output "Later This Year"',
  'Yahoo Finance / Teslarati / CryptoBriefing / TrendForce',
  'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
  '2026-08-20'::timestamp,
  'Tesla Optimus production timeline slipped from late July/August to "later this year" per Q2 2026 shareholder letter (July 22). Fremont production line (ex-Model S/X) still being installed. Designed for 1M robots/year capacity. 1,000+ Gen 3 Optimus deployed internally. 10,000 unique parts, no established supply chain — Musk warns early output will be "extremely slow". Giga Texas second factory targets summer 2027 with 10M/year design capacity. TSMC, Samsung, Micron confirmed as key suppliers. 2026 capex exceeds $20B.',
  'Tesla Optimus production update August 2026: Q2 shareholder letter (July 22, 2026) confirms production lines still being installed at Fremont with output "anticipated later this year", a delay from the April earnings call target of late July/August. Fremont facility: former Model S/X line torn down in 46 days, converted to dedicated humanoid robot production with initial design capacity of 1 million robots/year. Over 1,000 Optimus Gen 3 units already deployed internally across Tesla facilities for battery, component, and cable handling. Musk warned initial output will be "extremely slow" and "literally impossible to predict" given 10,000 unique parts and an entirely new production process with no established humanoid supply chain. Giga Texas: second Optimus factory under construction, targeting summer 2027 production start with 10M/year long-term design capacity. Supply chain: TSMC, Samsung, Micron confirmed as core suppliers (Q2 earnings call July 22). Optimus Academy: internal training program, early production units allocated for internal education rather than external customers. 2026 capital expenditure exceeds $20 billion — Tesla record.',
  'en', 'industry', 'robot',
  md5('tesla-optimus-production-delay-fremont-2026-08-20'),
  '{"mentionedCompanies":["Tesla","TSMC","Samsung","Micron"],"mentionedRobots":["Optimus","Optimus Gen 3"],"technologies":[],"marketInsights":["production delayed to later 2026","1M/year design capacity","10M/year Giga Texas target","1000+ internal units deployed"],"keyPoints":["Q2 shareholder letter delay","Fremont line installation ongoing","Giga Texas 2027 target"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-production-delay-fremont-2026-08-20'));

-- [Boston Dynamics] Atlas 2026 Full Production Commitment
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Atlas: 2026 Production Fully Committed to Hyundai RMAC and Google DeepMind',
  'Forbes / Engadget / AI2Work / Boston Dynamics Blog',
  'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
  '2026-08-20'::timestamp,
  'Boston Dynamics entire 2026 Atlas production run committed to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Production began immediately at Boston HQ after CES 2026 reveal. Atlas specs: 7.5ft reach, 110lbs lift capacity, -4 to 104°F operating range. Hyundai plans $26B US investment including new factory for 30,000 Atlas units/year by 2028. Google DeepMind partnership integrates Gemini foundation models for enhanced cognition. External customers expected early 2027. Hyundai car plant deployment planned for 2028 (parts sequencing).',
  'Boston Dynamics Atlas commercial deployment update: CES 2026 (January 5) unveiled production-ready fully electric Atlas humanoid. All 2026 deployments fully committed — fleets shipping to Hyundai RMAC and Google DeepMind. Production started immediately at Boston HQ. Enterprise Atlas capabilities: wide array of industrial tasks, autonomous operation, teleoperator control, tablet steering interface. Specs: 7.5ft reach, 110lbs lifting capacity, operating temperature -4 to 104°F. Hyundai $26B US investment plan: new factory designed for 30,000 Atlas units/year by 2028, car plant deployment for parts sequencing. Google DeepMind partnership: cutting-edge foundation models integration for greater cognitive capabilities. No external customers until early 2027. Dance performance by Spot quadruped fleet at CES reveal.',
  'en', 'product', 'robot',
  md5('bd-atlas-2026-full-commitment-hyundai-deepmind-2026-08-20'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind"],"mentionedRobots":["Atlas","Spot"],"technologies":["Gemini","foundation models"],"marketInsights":["2026 production fully committed","30K/year factory planned 2028","external customers 2027","$26B Hyundai investment"],"keyPoints":["Full 2026 run to Hyundai + DeepMind","30K/year factory 2028","external customers 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-2026-full-commitment-hyundai-deepmind-2026-08-20'));

-- [Figure AI] Figure 03 BMW Deployment + European Expansion
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure 03 Deployed at BMW Spartanburg for Logistics; BMW Expands Humanoids to Leipzig Germany',
  'BMW Press / TheAIInsider / iFactoryApp',
  'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
  '2026-08-20'::timestamp,
  'Figure AI deploys Figure 03 humanoid at BMW Spartanburg for logistics (unsorted components to sequencing trolleys). Builds on Figure 02 success: >99% placement accuracy, 84-second cycle time, 90,000+ parts loaded, 1,250+ runtime hours, 30,000+ BMW X3 vehicles. BMW establishes Center of Competence for Physical AI in Production. European expansion: Plant Leipzig first humanoid deployment summer 2026. Figure AI valued at $39B with $2.34B total raised. In-house Helix AI model (ended OpenAI partnership Feb 2025). 40 Figure 03 units at Spartanburg.',
  'Figure AI BMW deployment details August 2026: Figure 03 deployed at BMW Spartanburg for logistics task — sorting unsorted components into sequencing trolleys for assembly line delivery. Previous Figure 02 pilot results: >99% placement accuracy per shift, met 84-second cycle time targets, loaded 90,000+ parts across 1,250 operational hours, contributed to production of more than 30,000 BMW X3 vehicles. 40 Figure 03 units deployed at Spartanburg. BMW Group established Center of Competence for Physical AI in Production. European expansion: Plant Leipzig in Germany becomes first European automotive plant with humanoid robots, summer 2026. Figure AI corporate: $39B valuation, $2.34B total raised (Series C $1B+ led by Parkway VC, with Brookfield, NVIDIA, Intel Capital, Salesforce). In-house Helix AI model replaced OpenAI partnership (ended February 2025). Brookfield data flywheel partnership funded through 2027. Figure 03 redesigned from Figure 02 reliability learnings for improved robustness and simpler thermal management.',
  'en', 'product', 'robot',
  md5('figure-03-bmw-spartanburg-leipzig-2026-08-20'),
  '{"mentionedCompanies":["Figure AI","BMW","Brookfield","NVIDIA","Intel Capital","Parkway VC"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix","Physical AI"],"marketInsights":["European automotive humanoid expansion","$39B valuation","30K+ vehicles produced with humanoid assist"],"keyPoints":["Figure 03 BMW logistics deployment","Leipzig European debut summer 2026","40 units at Spartanburg"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-bmw-spartanburg-leipzig-2026-08-20'));

-- [Unitree] STAR Market IPO
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Robotics STAR Market IPO: ¥150.80/Share, $9B Valuation — Listing Window August 17-21',
  'VT Markets / TechTimes / KraneShares / ValueAddVC',
  'https://valueaddvc.com/unitree-ipo-tracker',
  '2026-08-20'::timestamp,
  'Unitree Robotics (688836.SH) enters STAR Market listing window August 17-21, 2026. IPO priced at ¥150.80/share, $9.04B implied valuation. 40.45M shares issued (10% post-offering), raising approximately $900M. 2025 financials: RMB 1.69B revenue, 5,500+ humanoids shipped, adjusted profit achieved — rare in humanoid sector. G1 at $13,500 on backorder, H2 listed at $29,900. FCC Covered List (DA 26-786) bars new Unitree models from US market entry. Security vulnerabilities CVE-2025-60250/60251 disclosed.',
  'Unitree Robotics STAR Market IPO August 2026: STAR registration approved July 3 (fastest ever). Subscription opened August 10, payment due August 12. Listing window August 17-21. Pricing: ¥150.80/share, $9.04B implied valuation. Issuance: 40.45M shares (~10% of post-offering capital), raising approximately $900M. 2025 financials: RMB 1.69B revenue, 5,500+ humanoid robots shipped, adjusted profit — one of few profitable humanoid companies. Product lineup: G1 humanoid $13,500 (on backorder as of July 20, 2026), H1 humanoid $90,000 (checkout disabled), H2 humanoid $29,900 (checkout disabled), B2 quadruped $100,000 (contact sales). CES 2026: G1 fleet autonomous kung fu routine. Cold-weather test: G1 logged 130,000 steps at -47°C in Altay snowfields. FCC Covered List impact: DA 26-786 (July 28) bars new foreign-produced humanoid models from US FCC equipment authorization — G1, H1, H2, B2 affected for new certifications. Security: CVE-2025-60250 and CVE-2025-60251 Bluetooth configuration vulnerabilities across Go2, G1, H1, B2 (disclosed September 2025).',
  'en', 'business', 'robot',
  md5('unitree-star-market-ipo-9b-2026-08-20'),
  '{"mentionedCompanies":["Unitree","FCC"],"mentionedRobots":["G1","H1","H2","B2","Go2"],"technologies":[],"marketInsights":["$9B valuation","5,500+ humanoids shipped 2025","profitable humanoid company","FCC US market ban for new models"],"keyPoints":["STAR Market listing Aug 17-21","¥150.80/share $9B valuation","FCC Covered List impact"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-ipo-9b-2026-08-20'));

-- [Agility] SPAC IPO + Digit v5
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics SPAC Merger: $2.5B Deal with Churchill Capital XI, Digit v5 December Launch',
  'TechCrunch / GeekWire / Forbes / SEC Filing',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  '2026-08-20'::timestamp,
  'Agility Robotics announces SPAC merger with Churchill Capital Corp XI (June 24, 2026) at $2.5B implied valuation. Expected NASDAQ listing as AGLT by end of 2026. $620M+ total proceeds ($420M trust + $200M+ PIPE led by Foxconn). Backers: Amazon, NVIDIA, SoftBank Vision Fund 2, DCVC. Digit v5 December 2026 commercial launch confirmed with NVIDIA Halos safety system (first humanoid). $300M+ multi-year orders secured from 30+ pipeline companies. RoboFab: 10,000 units/year capacity. 65,000+ operational hours across 9 customer sites.',
  'Agility Robotics SPAC and Digit v5 update August 2026: SPAC merger with Churchill Capital Corp XI announced June 24, $2.5B implied valuation, ticker AGLT on NASDAQ. SEC S-4 filed July 14. Total proceeds $620M+ ($420M SPAC trust + $200M+ PIPE led by Foxconn). Key investors: Amazon, NVIDIA, SoftBank Vision Fund 2, Foxconn, DCVC. Digit v5 December 2026 commercial launch: 20-hour operational days, standardized self-swapping end-effectors, NVIDIA Halos safety system first humanoid integration (ISO 13849, IEC 62443). Orders: $300M+ multi-year committed, 30+ companies in pipeline. Current deployments: 9 customer sites, 65,000+ operational hours. Key customers: Schaeffler, GXO (100,000+ totes moved at SPANX facility), Toyota Motor Manufacturing Canada, Mercado Libre, Amazon. RoboFab Salem Oregon: 70,000 sqft, 10,000 units/year capacity. Fremont Physical AI Hub: 60,000 sqft, 200 new roles.',
  'en', 'business', 'robot',
  md5('agility-spac-digit-v5-2026-08-20'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","Amazon","NVIDIA","SoftBank","Foxconn","GXO","Toyota","Mercado Libre"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos","Physical AI"],"marketInsights":["$2.5B SPAC merger","$300M+ orders","NASDAQ listing AGLT","first Halos humanoid"],"keyPoints":["SPAC $2.5B deal","Digit v5 December launch","65K+ operational hours"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-digit-v5-2026-08-20'));

-- [Apptronik] Apollo 2 + Google DeepMind
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Apptronik Apollo 2 Unveiled with Robot Park Data Facility; Google DeepMind Gemini Robotics 2 Integration',
  'The Robot Report / Robotics & Automation News / CNBC',
  'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
  '2026-08-20'::timestamp,
  'Apptronik unveils Apollo 2 humanoid in bipedal and wheeled-base configurations at newly expanded Robot Park (Austin, 90,000 sqft). Google DeepMind Gemini Robotics 2 integration enables whole-body autonomous control (walking, crouching, bending, manipulation). Apollo 2 serves as data collection and training platform. Apollo 3 confirmed as first mature commercial product for 2027. $520M Series A-X in Feb 2026 at $5B valuation. Investors: B Capital, Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. Robot Park network expanding globally.',
  'Apptronik Apollo 2 and Robot Park update August 2026: Apollo 2 unveiled in June 2026 in dual configurations — bipedal and wheeled-base. Robot Park flagship facility in Austin, Texas expanded to 90,000 sqft for humanoid data collection and AI training. Google DeepMind partnership: Gemini Robotics 2 integration demonstrated whole-body autonomous movements including walking, crouching, bending, and object manipulation. Data collected by Apollo 2 fleets advances Gemini Robotics foundation models. Apollo 3 = first mature commercial product, 2027 launch confirmed. Bipedal + wheeled dual configuration for industrial efficiency and regulatory compliance. Series A-X: $520M in February 2026 at $5B valuation. New investors: AT&T Ventures, John Deere, Qatar Investment Authority. Existing: B Capital, Google, Mercedes-Benz, PEAK6. Total raised approximately $1B. Customer deployments: Mercedes-Benz, GXO Logistics, Jabil. Robot Park network: data collection workflows at Google DeepMind, Mercedes-Benz, GXO partner sites. Global Robot Park expansion planned. Elevate Robotics subsidiary for superhuman industrial automation.',
  'en', 'product', 'robot',
  md5('apptronik-apollo-2-robot-park-deepmind-2026-08-20'),
  '{"mentionedCompanies":["Apptronik","Google DeepMind","Mercedes-Benz","GXO","Jabil","AT&T","John Deere","QIA"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics 2","VLA","whole-body control"],"marketInsights":["$5B valuation","~$1B total raised","Apollo 3 for 2027","dual bipedal/wheeled config"],"keyPoints":["Apollo 2 dual configuration","Robot Park 90K sqft","Gemini Robotics 2 integration"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-apollo-2-robot-park-deepmind-2026-08-20'));

-- [1X] NEO Production + Delivery Status
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X Technologies NEO: Full-Scale Production Running, 10K Pre-Orders Sold Out — Consumer Delivery Pending',
  'Forbes / eWeek / The Robot Report / Houston Chronicle',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-08-20'::timestamp,
  '1X Technologies begins full-scale NEO production at Hayward, California factory (58,000 sqft, 200+ employees). 10,000 pre-orders sold out in 5 days (October 2025). Pricing: $20,000 Early Access or $499/month rental. 25-DOF tendon hand revealed July 9: IP68, human-level grip force, tactile slip detection. As of July 16, no verified consumer delivery. EQT partnership: up to 10,000 NEO robots across 300+ portfolio companies (2026-2030). OpenAI-backed, seeking $1B funding at $10B+ valuation.',
  '1X Technologies NEO humanoid robot status August 2026: Hayward California factory (58,000 sqft, 200+ employees) — America first vertically integrated high-volume humanoid robot factory — full-scale production commenced April 2026. Capacity: 10,000 units in first year, scaling to 100,000 by end 2027. Pre-orders: 10,000 sold out in 5 days starting October 2025. Pricing: $20,000 Early Access (priority 2026 delivery) or $499/month rental (6-month minimum, later delivery). 25-DOF tendon hand (revealed July 9): IP68 rated, human-level grip force (3x competitors), tactile slip detection, non-linear compliance, fully in-house designed motors/tendons/sensors/electronics. Delivery status: as of July 16, no verified consumer delivery found — company materials still reference future tense for first shipments. Staggered rollout planned ("some this year, some later"). EQT strategic partnership: up to 10,000 NEO robots across 300+ EQT portfolio companies between 2026 and 2030. OpenAI-backed. Seeking up to $1B in new funding at $10B+ valuation (12x increase from $820M in January).',
  'en', 'product', 'robot',
  md5('1x-neo-production-delivery-pending-2026-08-20'),
  '{"mentionedCompanies":["1X Technologies","OpenAI","EQT"],"mentionedRobots":["NEO"],"technologies":["tendon hand","25-DOF","tactile slip detection"],"marketInsights":["10K pre-orders sold out in 5 days","$10B+ valuation target","consumer delivery still pending","EQT 10K robot B2B deal"],"keyPoints":["Full production running Hayward","10K pre-orders sold out","consumer delivery not yet verified"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-production-delivery-pending-2026-08-20'));

-- [Agibot] HKEX IPO + 15K Milestone
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AgiBot Launches Hong Kong IPO Process: $5.1-6.4B Target, 15,000 Robots Shipped, A3 Ultra Q4 Launch',
  'TechNode / CryptoBriefing / Capital.com / PR Newswire',
  'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
  '2026-08-20'::timestamp,
  'AgiBot officially starts HKEX IPO process (July 27, 2026). Joint sponsors: CICC, CITIC Securities, Morgan Stanley. Target valuation HK$40-50B ($5.1-6.4B), selling 15-25% stake for $1B+ potential raise. Strategic investors: LG Electronics, Mirae Asset, BYD, Hillhouse, Tencent, HongShan Capital. Cumulative 15,000 robots shipped (15,000th unit June 28). A3 Ultra (NVIDIA Thor SoC, 51 DOF) Q4 2026 launch. WAIC 2026: 4 new products (A3 Ultra, G2 Max, X2 Edu, OmniHand 3 Ultra-M). FCC Covered List bars new Agibot models from US market.',
  'AgiBot HKEX IPO and product update August 2026: IPO process officially launched July 27. Joint sponsors and underwriters: China International Capital Corp (CICC), CITIC Securities, Morgan Stanley. Target valuation: HK$40-50 billion ($5.1-6.4B). Share sale: 15-25% of company, potentially raising over $1 billion. Strategic investors include LG Electronics, Mirae Asset, BYD, Hillhouse Investment, Tencent Holdings, HongShan Capital Group (formerly Sequoia China). Production milestone: 15,000th robot (G2 unit) produced June 28, 2026. Growth trajectory: mass production Aug 2024, 1K Jan 2025, 5K end-2025, 10K Mar 2026, 15K Jun 2026. WAIC 2026 launches: A3 Ultra (NVIDIA Thor SoC, 51 DOF, Q4 2026 flagship), G2 Max (industrial), X2 Edu (education), OmniHand 3 Ultra-M (hand). Partnerships: 01.AI strategic MOU (April 17), MiniMax AI voice interaction, Singtel MOU (Singapore), UK APC (European debut, RaaS model). Real-world deployment: Longcheer Technology Nanchang tablet QC line — 36-hour integration, 3,000 tablets/shift. FCC Covered List: new Agibot models barred from US market entry.',
  'en', 'business', 'robot',
  md5('agibot-hkex-ipo-15k-a3ultra-2026-08-20'),
  '{"mentionedCompanies":["AgiBot","LG Electronics","BYD","Mirae Asset","Hillhouse","Tencent","NVIDIA","CICC","Morgan Stanley","01.AI","Singtel"],"mentionedRobots":["A3 Ultra","G2 Max","G2","X2 Edu","OmniHand 3 Ultra-M"],"technologies":["NVIDIA Thor","embodied AI","RaaS"],"marketInsights":["HKEX IPO $5.1-6.4B","15,000 cumulative robots","LG Electronics investor","FCC US market ban"],"keyPoints":["HKEX IPO process started Jul 27","15K robots shipped","A3 Ultra Q4 2026 launch"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-hkex-ipo-15k-a3ultra-2026-08-20'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Tesla Optimus 생산 지연 지속
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' LIMIT 1),
  'mass_production', 'warning',
  '[Tesla] Optimus 생산라인 설치 지속 중 — "later this year" 재확인, 초기 출력 극도로 느릴 것',
  'Q2 주주서한(7/22) "later this year"로 재확인. 프리몬트 라인 설치 중. 내부 1,000+ Gen 3 가동. 10K 고유 부품·공급망 미확립으로 초기 극저속 예상. Giga Texas 2공장 2027 여름. capex >$20B.',
  '{"source":"Yahoo Finance/Teslarati","confidence":"A","date":"2026-08-20","status":"production line installation","internalDeployment":"1,000+ Gen 3","designCapacity":"1M/year","gigaTexas":"2027 summer","capex":">$20B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Optimus 생산라인 설치 지속%');

-- Alert 2: Unitree STAR Market 상장 (IPO)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND manufacturer ILIKE '%Unitree%' LIMIT 1),
  'funding', 'critical',
  '[Unitree] STAR Market 688836.SH 상장: $9B 밸류에이션, $900M 조달 — 휴머노이드 최초 흑자 IPO',
  'STAR Market 상장 윈도우(8/17-21) 진입. ¥150.80/주, $9.04B. 2025 RMB 1.69B 매출, 5,500+ 휴머노이드 출하, 흑자. G1 $13,500 백오더 중. FCC Covered List로 미국 신규 모델 차단 리스크.',
  '{"source":"VT Markets/KraneShares","confidence":"A","date":"2026-08-20","ticker":"688836.SH","pricePerShare":"¥150.80","valuation":"$9.04B","raised":"~$900M","revenue2025":"RMB 1.69B","humanoidShipped":5500,"profitable":true,"fccBlocked":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%STAR Market 688836.SH 상장%');

-- Alert 3: Figure 03 BMW 유럽 확장
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' LIMIT 1),
  'partnership', 'warning',
  '[Figure AI] Figure 03 BMW 물류 배치 성공 + 라이프치히 유럽 확장 — $39B 밸류에이션',
  'Figure 03 BMW 스파르탄버그 물류 배치(비정렬→시퀀싱). Figure 02 성과: 99%+ 정확도, 30K+ X3 생산 기여. 라이프치히 유럽 최초 휴머노이드. $39B 밸류에이션, $2.34B 총 조달. Helix 자체 AI. Brookfield 데이터 파트너십.',
  '{"source":"BMW Press/TheAIInsider","confidence":"A","date":"2026-08-20","figure03Units":40,"figure02Accuracy":">99%","vehiclesProduced":"30,000+","partsLoaded":"90,000+","europeanExpansion":"Plant Leipzig summer 2026","valuation":"$39B","totalRaised":"$2.34B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure 03 BMW 물류 배치 성공%');

-- Alert 4: Agility SPAC $2.5B
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' LIMIT 1),
  'funding', 'warning',
  '[Agility] SPAC $2.5B 합병 → AGLT 나스닥 + Digit v5 $300M+ 오더 — 12월 상용화',
  'Churchill Capital XI SPAC $2.5B. 틱커 AGLT 연내 NASDAQ. $620M+ 조달. Digit v5 12월 상용출시, NVIDIA Halos 최초 적용. $300M+ 수주, 30+ 파이프라인. 65K+ 운용시간.',
  '{"source":"TechCrunch/GeekWire","confidence":"A","date":"2026-08-20","spacDeal":"$2.5B","ticker":"AGLT","exchange":"NASDAQ","proceeds":"$620M+","digitV5Launch":"December 2026","orders":"$300M+","operationalHours":"65,000+"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%SPAC $2.5B 합병 → AGLT%');

-- Alert 5: Apptronik $5B + Gemini Robotics 2
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Apollo%' LIMIT 1),
  'partnership', 'info',
  '[Apptronik] Apollo 2 + Gemini Robotics 2 전신 자율제어 — Robot Park 데이터 수집 가속',
  'Apollo 2 이족보행+바퀴 듀얼. Robot Park 90K sqft 데이터 수집. Google DeepMind Gemini Robotics 2 전신 VLA 통합. Apollo 3 2027 상용. $5B 밸류에이션, ~$1B 총 조달. 고객: Mercedes, GXO, Jabil.',
  '{"source":"Robot Report/CNBC","confidence":"A","date":"2026-08-20","apollo2Config":"bipedal+wheeled dual","robotPark":"90K sqft Austin","deepMindIntegration":"Gemini Robotics 2","apollo3Launch":"2027","valuation":"$5B","totalRaised":"~$1B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Apollo 2 + Gemini Robotics 2 전신%');

-- Alert 6: 1X NEO 생산 vs 인도 갭
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%NEO%' LIMIT 1),
  'mass_production', 'info',
  '[1X] NEO 풀 프로덕션 가동, 10K 프리오더 완판 — 고객 인도 미확인 (8/20 기준)',
  'Hayward 풀 프로덕션(58K sqft, 연 10K). 10K 프리오더 5일 완판. $20K EA/$499 렌탈. 25-DOF 텐던 핸드. 7/16 기준 고객 인도 미확인. EQT 10K대 B2B. $10B+ 밸류 $1B 조달 추진.',
  '{"source":"Forbes/eWeek","confidence":"B","date":"2026-08-20","factoryCapacity":"10K/year","preOrders":10000,"price":"$20,000","rental":"$499/month","deliveryStatus":"unverified","eqtDeal":"10,000 units 2026-2030","valuationTarget":"$10B+"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%NEO 풀 프로덕션 가동, 10K 프리오더%');

-- Alert 7: Agibot HKEX IPO
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' OR (name ILIKE '%Agibot%') LIMIT 1),
  'funding', 'warning',
  '[Agibot] HKEX IPO $5.1-6.4B 목표 — 15K 출하, LG·BYD 투자, FCC 미국 차단',
  'HKEX IPO 프로세스 착수(7/27). CICC·CITIC·Morgan Stanley. $5.1-6.4B 밸류. 15K 출하. LG Electronics·BYD·Mirae Asset 투자. A3 Ultra Q4 출시. FCC 미국 신규 모델 차단.',
  '{"source":"TechNode/CryptoBriefing","confidence":"A","date":"2026-08-20","ipoTarget":"HK$40-50B ($5.1-6.4B)","sponsors":["CICC","CITIC","Morgan Stanley"],"cumulativeShipments":15000,"investors":["LG Electronics","BYD","Mirae Asset","Hillhouse","Tencent"],"a3UltraLaunch":"Q4 2026","fccBlocked":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%HKEX IPO $5.1-6.4B 목표%');

COMMIT;
