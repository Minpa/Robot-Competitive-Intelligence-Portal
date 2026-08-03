-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 SQL Script
-- 생성일: 2026-07-24
-- 수집 대상: Tesla Optimus, Boston Dynamics Atlas, Figure AI,
--            Unitree, Agility Robotics, Apptronik, 1X Technologies, Agibot
-- 이전 스크립트(2026-07-21)와 중복되지 않는 신규 항목만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ARTICLES (뉴스/기술 업데이트) — 신규 항목
--    content_hash 기반 중복 방지
-- ============================================================

-- [Tesla] Q2 2026 실적 발표 — Fremont S/X 라인 해체, Optimus 생산라인 설치 중 (A, 2026-07-22)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  'Tesla Q2 Earnings: Fremont S/X Lines Decommissioned for Optimus Production — Revenue $28.2B, Stock Falls 11%',
  'CNBC / TechTimes / CryptoBriefing',
  'https://www.cnbc.com/2026/07/22/tesla-tsla-q2-2026-earnings-report.html',
  '2026-07-22'::timestamp,
  'Tesla Q2 실적(7/22 발표): 매출 $28.24B(YoY +26%, 예상 상회), 조정 EPS $0.33(예상 $0.50 하회). 주가 시간외 -11%. Fremont Model S/X 생산라인 해체 완료, Optimus Gen 3 1세대 생산라인 설치 중. 생산 "곧 시작(soon)" 예정. Optimus V3 약 10,000개 고유 부품으로 초기 생산 "극도로 느릴 것". 2026년 생산분 전량 내부 공장 사용.',
  'Tesla reported Q2 2026 earnings on July 22, posting revenue of $28.24 billion (up 26% YoY, beating consensus of ~$26.3B) but adjusted EPS of $0.33 fell well short of the $0.50 expected by Wall Street. Shares dropped approximately 11% in after-hours trading. The shareholder update confirmed that Model S and X production lines at Fremont have been decommissioned and Tesla is "installing the first-generation lines for Optimus, where we expect to start production soon." CEO Musk reiterated that initial manufacturing will be "extremely slow" given Optimus Gen 3 involves roughly 10,000 unique parts across an entirely new production line. All 2026 Optimus units remain designated for internal factory use only. Musk stated Optimus will be "the first robot capable of doing generalized tasks." Production anticipated in late July to August 2026.',
  'en', 'industry', 'robot',
  md5('tesla-q2-2026-earnings-optimus-fremont-conversion-07-22'),
  '{"confidence":"A","mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3","Optimus V3"],"technologies":["generalized task learning"],"marketInsights":["Q2 revenue $28.24B (+26% YoY)","Adjusted EPS $0.33 vs $0.50 expected","Stock -11% after-hours","Fremont S/X lines decommissioned for Optimus"],"keyPoints":["Fremont production line conversion confirmed","Optimus production starting soon (late July-August)","10,000 unique parts — extremely slow initial output","All 2026 units internal use only"],"summaryKo":"Tesla Q2 실적: 매출 $28.24B(+26% YoY), EPS $0.33(예상 하회), 주가 -11%. Fremont S/X 해체→Optimus 생산라인 설치 중. 곧 생산 시작 예정. 초기 극도로 느린 생산 경고. 2026년 전량 내부용."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-q2-2026-earnings-optimus-fremont-conversion-07-22'));

-- [Boston Dynamics] Hyundai, SoftBank 잔여 지분 매입 — BD 완전 자회사화 (A, 2026-07-16~21)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Acquires SoftBank Remaining ~10% Boston Dynamics Stake for $325M — Full Ownership at $3.3B Valuation',
  'Bloomberg / Quartz / UPI',
  'https://www.bloomberg.com/news/articles/2026-07-16/hyundai-to-buy-softbank-s-boston-dynamics-stake-in-robot-push',
  '2026-07-16'::timestamp,
  'Hyundai Motor Group, SoftBank 보유 Boston Dynamics 잔여 지분(~10%) 인수 발표(7/16). 인수가 약 $325M, BD 기업가치 약 $3.3B. SoftBank가 2021년 계약상 풋옵션 행사. BD 완전 자회사화로 Hyundai 로봇 전략 일원화. Atlas 2028년 첫 공장 배치(조지아) 목표, 연 30,000대 생산 규모.',
  'Hyundai Motor Group announced on July 16, 2026, that it will acquire SoftBank Group''s remaining approximately 10% stake in Boston Dynamics for roughly $325 million, making the robotics company a wholly owned subsidiary. The predetermined purchase price values Boston Dynamics at approximately $3.3 billion, consistent with the 2021 controlling-interest acquisition valuation. SoftBank triggered a put option embedded in the original agreement, which gave it the right to sell if Boston Dynamics remained privately held. The full acquisition consolidates Hyundai''s robotics strategy under one roof, with Atlas targeted for its first factory deployment in 2028 at a Georgia facility and manufacturing capacity planned at 30,000 units per year.',
  'en', 'industry', 'robot',
  md5('hyundai-softbank-boston-dynamics-full-acquisition-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Hyundai","SoftBank","Boston Dynamics"],"mentionedRobots":["Atlas"],"technologies":[],"marketInsights":["$325M for remaining ~10% stake","BD valued at $3.3B","Full ownership achieved","Atlas 2028 factory deployment target"],"keyPoints":["SoftBank put option triggered","BD becomes wholly owned Hyundai subsidiary","$3.3B valuation consistent with 2021 deal","30,000 units/yr factory planned in Georgia"],"summaryKo":"Hyundai, SoftBank 잔여 ~10% BD 지분 $325M에 인수. BD 기업가치 $3.3B. 완전 자회사화. Atlas 2028년 조지아 첫 공장 배치, 연 30K대 생산 목표."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-softbank-boston-dynamics-full-acquisition-2026-07'));

-- [Boston Dynamics] Hyundai 35,000명 파업 — 사상 최초 휴머노이드 로봇 관련 노사 분쟁 (A, 2026-07-13~22)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Hyundai Workers Stage First-Ever Auto Strike Over Humanoid Robots — 35,000 Workers Demand Atlas Deployment Consent',
  'Forbes / Unite.AI / Futurism / Carscoops',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/17/we-just-had-the-first-humanoid-robot-strike-ever/',
  '2026-07-17'::timestamp,
  'Hyundai 울산 공장 35,000명 노조 파업 — 자동차 산업 사상 최초 휴머노이드 로봇 관련 파업. 7/13~15 2시간 단축근무, 7/20~22 4시간 거부. 핵심 요구: Atlas 한국 공장 배치 전 노조 사전 동의. Hyundai, 2028년까지 자체 공장에 25,000대 이상 Atlas 배치 계획(연 30K대 중 83%). 시급→고정급 전환, 정년 60→65세 연장 요구. Hyundai 글로벌 생산의 절반에 영향.',
  'Approximately 35,000 unionized Hyundai Motor workers at the Ulsan, South Korea complex staged the first-ever automotive industry strike over humanoid robot deployment. Workers ended shifts 2 hours early from July 13-15, escalating to 4-hour stoppages from July 20-22 after 15 rounds of failed wage negotiations. The union''s core demand is that no Atlas robot enters a Hyundai Korean workplace without prior labor-management agreement. Hyundai Motor Group plans to deploy more than 25,000 Atlas robots across Hyundai and Kia plants — approximately 83% of the 30,000 units per year it aims to build by 2028. Workers also demand conversion from hourly to fixed salaries, raising retirement age from 60 to 65, and profit-sharing. The strike impacts approximately half of Hyundai''s global output and sets a major precedent for industries grappling with humanoid automation.',
  'en', 'industry', 'robot',
  md5('hyundai-35000-workers-strike-atlas-humanoid-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Hyundai","Boston Dynamics","Kia"],"mentionedRobots":["Atlas"],"technologies":[],"marketInsights":["35,000 workers on strike","First-ever auto strike over humanoid robots","Hyundai plans 25,000+ Atlas in own plants (83% of 30K/yr)","Impacts ~50% of Hyundai global output"],"keyPoints":["First humanoid robot labor strike in automotive history","July 13-22 escalating stoppages","Union demands consent before robot deployment","25,000 Atlas units planned for Hyundai/Kia plants"],"summaryKo":"Hyundai 울산 35,000명 사상 최초 휴머노이드 파업(7/13~22). Atlas 배치 전 노조 동의 요구. 25,000대 이상 자체 공장 배치 계획. 글로벌 생산 50% 영향. 산업계 선례 수립."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-35000-workers-strike-atlas-humanoid-2026-07'));

-- [Boston Dynamics] Atlas FIFA 월드컵 최초 등장 — 경기장 내 휴머노이드 로봇 통합 (A, 2026-07-05)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1),
  'Atlas Humanoid Robot Walks onto FIFA World Cup Pitch — First-Ever Live Match Robotics Integration',
  'Hyundai Official / Fox Business / Interesting Engineering',
  'https://www.hyundai.com/worldwide/en/newsroom/detail/0000001215',
  '2026-07-05'::timestamp,
  'Boston Dynamics Atlas, FIFA 월드컵 16강전(노르웨이 vs 브라질, 뉴욕/뉴저지, 7/5) 하프타임에 경기장 등장. 사상 최초 월드컵 라이브 경기 환경 내 휴머노이드 로봇 통합. Haaland, Kane, Son 등 선수 세리머니 재현 후 매치볼 전달. Hyundai, 대회 공식 로보틱스 파트너. 프로덕션 버전 Atlas의 혼잡·고속 환경 안정성 입증.',
  'Boston Dynamics'' Atlas humanoid robot made its debut at the 2026 FIFA World Cup during the Round of 16 match between Norway and Brazil at New York/New Jersey Stadium on July 5, 2026. This marked the first-ever integration of a humanoid robot into a live FIFA World Cup match environment. Atlas performed iconic goal celebrations of Erling Haaland, Harry Kane, Matheus Cunha, and Son Heung-min in sequence before collecting the ceremonial match ball and delivering it to the referee to signal the start of the second half. Hyundai Motor served as the Official Robotics Partner of the tournament. The activation demonstrated the production Atlas''s ability to operate reliably in a crowded, fast-paced live setting with coordinated movements, fully rotational joints (360° head, torso, and limb rotation), and accurate spatial awareness.',
  'en', 'product', 'robot',
  md5('atlas-fifa-world-cup-2026-first-match-integration-07'),
  '{"confidence":"A","mentionedCompanies":["Boston Dynamics","Hyundai","FIFA"],"mentionedRobots":["Atlas"],"technologies":["360-degree rotational joints","spatial awareness"],"marketInsights":["First-ever humanoid robot at World Cup","Massive global brand exposure for Atlas/Hyundai","Production Atlas reliability proven in live environment"],"keyPoints":["Atlas at World Cup Round of 16 (July 5)","Performed player celebrations","Delivered match ball to referee","Demonstrated production-ready reliability"],"summaryKo":"Atlas, FIFA 월드컵 16강(노르웨이-브라질, 7/5) 하프타임 등장. 사상 최초 월드컵 라이브 매치 내 휴머노이드 통합. 선수 세리머니 재현 + 매치볼 전달. 프로덕션 Atlas 안정성 입증."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('atlas-fifa-world-cup-2026-first-match-integration-07'));

-- [Agibot] WAIC 2026 신제품 4종 공개 — A3 Ultra(Nvidia Thor), X2 Edu, G2 Max, OmniHand 3 Ultra-M (A, 2026-07-20)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'AGIBOT Unveils Four New Products at WAIC 2026: A3 Ultra (Nvidia Thor), X2 Edu, G2 Max, OmniHand 3 Ultra-M',
  'Manila Times / Interesting Engineering / Robotics and Automation News',
  'https://roboticsandautomationnews.com/2026/07/20/agibot-unveils-four-new-robots-at-waic-2026-as-it-expands-industrial-embodied-ai-portfolio/103505/',
  '2026-07-20'::timestamp,
  'Agibot, WAIC 2026(상하이, 7/20)에서 신제품 4종 공개. A3 Ultra: 1.74m/60kg, 51DOF, 양팔 각 5kg 페이로드, 8시간 운용, Nvidia Thor 칩 탑재. X2 Edu: 1.3m/29DOF, 대학·연구기관용 모듈형 개발 플랫폼. G2 Max: 고중량 팔레타이징·자재이동용 산업 로봇, 전방향 이동·배터리 스왑. OmniHand 3 Ultra-M: 독립형 로봇 핸드, 20DOF, 컴퓨터비전 기반 촉각 센서, 5kg 파지. WAIC 현장 30대 이상 운용.',
  'AGIBOT unveiled four new robotics products at the World Artificial Intelligence Conference (WAIC) 2026 in Shanghai on July 20. The A3 Ultra is a full-size humanoid standing 1.74m tall and weighing 60kg, featuring 51 degrees of freedom, up to 5kg payload per arm, up to 8 hours of operating time, and an Nvidia Thor chip for real-time sensor data processing from lidar and camera arrays. The X2 Edu is a 1.3m modular humanoid platform for universities and research institutes with 29 DOF and 3kg payload per arm. The G2 Max is a heavy-payload industrial robot for material handling and palletizing with omnidirectional mobility and battery-swapping. The OmniHand 3 Ultra-M is a standalone robotic hand with 20 active DOF, computer-vision-based tactile sensors, handling objects up to 5kg. Over 30 AGIBOT robots operated across WAIC venues during the conference.',
  'en', 'product', 'robot',
  md5('agibot-waic-2026-a3-ultra-x2-edu-g2-max-omnihand-07-20'),
  '{"confidence":"A","mentionedCompanies":["AgiBot","Nvidia"],"mentionedRobots":["A3 Ultra","X2 Edu","G2 Max","OmniHand 3 Ultra-M"],"technologies":["Nvidia Thor SoC","computer-vision tactile sensors","omnidirectional mobility","battery swapping"],"marketInsights":["4 new products at WAIC 2026","A3 Ultra specs: 51 DOF, 8hr runtime, Thor chip","Education platform for R&D market","30+ robots operating at WAIC venues"],"keyPoints":["A3 Ultra: 1.74m/60kg/51DOF/Nvidia Thor","X2 Edu: modular R&D platform","G2 Max: heavy-payload industrial","OmniHand 3 Ultra-M: 20DOF standalone hand"],"summaryKo":"Agibot, WAIC 2026에서 4종 신제품 공개. A3 Ultra(1.74m/51DOF/Nvidia Thor/8시간), X2 Edu(연구용 모듈형), G2 Max(고중량 산업용), OmniHand 3 Ultra-M(20DOF 독립 핸드). 현장 30대+ 운용."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-waic-2026-a3-ultra-x2-edu-g2-max-omnihand-07-20'));

-- [Figure AI] Figure 03 생산 램프업 — 350대+ 납품, 1대/시간 생산률 (24배 향상) (A, 2026-07)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  'Figure 03 Production Ramp: 350+ Units Delivered, 1 Robot Per Hour — 24x Throughput Improvement in Under 120 Days',
  'Figure AI Official / Forbes / Manufacturing Digital',
  'https://www.figure.ai/news/ramping-figure-03-production',
  '2026-07-15'::timestamp,
  'Figure AI, Figure 03 생산 램프업 공개. 350대 이상 3세대 로봇 납품 완료. BotQ 공장 생산율 1대/일 → 1대/시간으로 24배 향상(120일 미만). 프로토타입 → 양산 단계 전환 완료. BMW Spartanburg에서 부품 분류·시퀀싱 자동화 수행. 204,000+ 패키지 처리(163시간). 소프트 외장, 무선 충전, 음성-음성 통신, 촉각 센서 핸드 장착.',
  'Figure AI disclosed its Figure 03 production ramp, having delivered over 350 third-generation humanoid robots. BotQ factory throughput improved from 1 Figure 03 per day to 1 per hour — a 24x throughput improvement achieved in under 120 days, marking a successful transition from prototype to production phase with dedicated lines for all critical modules. At BMW''s Spartanburg plant, Figure 03 robots sort unsorted components into sequencing trolleys for vehicle production. The robots have processed more than 204,000 packages in over 163 hours of autonomous operation. Figure 03 features softer exterior components for workplace safety, wireless charging to reduce downtime, speech-to-speech communication, and redesigned hands with tactile sensors and palm cameras for precise parts handling.',
  'en', 'product', 'robot',
  md5('figure-03-production-ramp-350-units-1-per-hour-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03"],"technologies":["wireless charging","speech-to-speech","palm cameras","tactile sensors"],"marketInsights":["350+ Figure 03 units delivered","1/day → 1/hour (24x throughput)","120 days prototype → production","204,000+ packages processed autonomously"],"keyPoints":["350+ units delivered","24x production rate improvement in <120 days","BMW Spartanburg parts sorting deployment","Wireless charging + tactile sensor hands"],"summaryKo":"Figure AI, Figure 03 350대+ 납품. 생산율 1대/일→1대/시간(24배 향상, 120일 미만). BMW Spartanburg 부품 분류 자동화. 204K+ 패키지 처리. 무선충전·촉각센서 핸드 장착."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-03-production-ramp-350-units-1-per-hour-2026-07'));

-- [Apptronik] Robot Park 90K sqft 개설 — Apollo 2 양방향 구성, Apollo 3 예고, DeepMind 데이터 공급 (A, 2026-07-01~06)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%Apptronik%' LIMIT 1),
  'Apptronik Opens 90,000-sqft Robot Park in Austin — Apollo 2 Bipedal/Wheeled, Feeds Data to Google DeepMind Gemini Robotics',
  'Forbes / Robotics and Automation News / Semafor',
  'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
  '2026-07-01'::timestamp,
  'Apptronik, 오스틴 텍사스에 90,000sqft "Robot Park" 개설(7/1). Apollo 2 모듈형 휴머노이드 — 바이페달 및 휠 베이스 듀얼 구성 공개. 대규모 실세계 데이터 수집 전용 시설. 수집 데이터를 Google DeepMind Gemini Robotics 기반 AI 모델에 직접 공급. Apollo 3(내년 출시 예정)를 첫 진정한 제품으로 예고. Apollo 3: 바이페달(광범위 적용) + 휠(산업 초기 배치·규제 준수) 듀얼 구성 계획.',
  'Apptronik opened its expanded 90,000-square-foot Robot Park facility in Austin, Texas on July 1, 2026. The facility serves as a flagship data collection and training center for humanoid robots, scaling real-world data collection using modular Apollo 2 humanoid robots ahead of the upcoming Apollo 3 production model. Apollo 2 was unveiled in both bipedal and wheeled-base configurations, designed for large-scale real-world data collection. The facility feeds high-quality data directly into Google DeepMind''s Gemini Robotics foundational AI models as part of their ongoing research partnership. Apollo 3, expected next year, will be Apptronik''s first true product — moving beyond prototype stage with both bipedal (broader applications) and wheeled configurations (initial industrial deployments and regulatory compliance).',
  'en', 'industry', 'robot',
  md5('apptronik-robot-park-90k-sqft-apollo2-deepmind-2026-07'),
  '{"confidence":"A","mentionedCompanies":["Apptronik","Google DeepMind"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics","bipedal/wheeled dual config","modular design"],"marketInsights":["90,000 sqft Robot Park opened July 1","Apollo 2 bipedal + wheeled configs","Data feeds directly to DeepMind Gemini Robotics","Apollo 3 first true product next year"],"keyPoints":["Robot Park: 90K sqft data factory in Austin TX","Apollo 2 dual configuration (bipedal/wheeled)","Google DeepMind Gemini Robotics data pipeline","Apollo 3 production model teased for 2027"],"summaryKo":"Apptronik, 오스틴에 90K sqft Robot Park 개설(7/1). Apollo 2 바이페달/휠 듀얼 구성. Google DeepMind Gemini Robotics에 실데이터 공급. Apollo 3(내년 첫 제품) 예고."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('apptronik-robot-park-90k-sqft-apollo2-deepmind-2026-07'));

-- [1X Technologies] NEO 핸드 업그레이드 — 25DOF 힘줄 구동, IP68 세척 가능, 인간 수준 근접 (A, 2026-07-09~13)
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata)
SELECT
  gen_random_uuid(),
  (SELECT id FROM companies WHERE name ILIKE '%1X%' LIMIT 1),
  '1X Reveals Human-Level NEO Hands: 25 DOF Tendon-Driven, IP68 Washable, Tactile Fingertips — Ships with First Consumer Units',
  'Forbes / eWeek / Dezeen',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/09/human-level-hands-1x-just-gave-humanoid-robot-neo-something-close/',
  '2026-07-09'::timestamp,
  '1X Technologies, NEO 핸드 대폭 업그레이드 발표(7/9~13). 25DOF 힘줄 구동 — 인간 손 수준 민첩성·힘. 저기어비 "힘 투명성(force transparency)"으로 접촉 감지 및 피드백. 손끝 고해상도 촉각 센서(압력·미끄러짐 감지, 실시간 조정). IP68 방수·세척 가능 — 요리·자기 세척 가능. 2026년 내 배송 시작되는 첫 소비자용 NEO에 탑재. $20K 가격, 초기 인간-인-더-루프 원격 제어 병행.',
  '1X Technologies announced a major upgrade to the NEO humanoid robot''s hands in July 2026. The new hands feature 25 actuated degrees of freedom with tendon-driven motion, achieving near human-level dexterity and strength. Unlike most robot hands, NEO''s utilize low gear ratios for "force transparency," allowing joints to sense contact and provide crucial haptic feedback. High-resolution tactile sensors on fingertips detect pressure and slippage, enabling real-time adjustments. Uniquely, the IP68-sealed hands are washable, allowing NEO to perform tasks like cooking, cleaning, and self-maintenance. The hands can pour tea, zip jackets, sort grapes, and handle delicate objects. These will ship with the first consumer NEO units planned for delivery in 2026, priced at $20,000. The first wave will use a human-in-the-loop teleoperation system combining OpenAI models and 1X''s proprietary tech.',
  'en', 'product', 'robot',
  md5('1x-neo-hands-25dof-tendon-ip68-human-level-2026-07'),
  '{"confidence":"A","mentionedCompanies":["1X Technologies","OpenAI"],"mentionedRobots":["NEO"],"technologies":["25-DOF tendon-driven hands","force transparency","IP68 waterproof","tactile fingertip sensors","human-in-the-loop teleoperation"],"marketInsights":["Human-level hand dexterity achieved","IP68 washable hands — industry first","Ships with first consumer units 2026","$20K price point maintained"],"keyPoints":["25 DOF tendon-driven hands","Force transparency via low gear ratios","IP68 washable — cooking and self-cleaning","Ships with first consumer NEO in 2026"],"summaryKo":"1X, NEO 핸드 업그레이드 발표. 25DOF 힘줄 구동으로 인간 수준 민첩성. IP68 방수·세척 가능(업계 최초). 촉각 센서 손끝. 2026년 첫 소비자 배송분에 탑재. $20K 가격 유지."}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-hands-25dof-tendon-ip68-human-level-2026-07'));


-- ============================================================
-- 2. COMPETITIVE ALERTS (경쟁 알림) — 신규 항목
-- ============================================================

-- [CRITICAL] Tesla Q2 실적 — Fremont Optimus 전환 공식 확인
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[Tesla] Q2 실적 발표(7/22) — Fremont S/X 해체→Optimus 생산라인 설치 중, 곧 생산 시작',
  'Tesla Q2 실적: 매출 $28.24B(+26% YoY), EPS $0.33(예상 하회), 주가 -11%. Fremont Model S/X 생산라인 해체 완료→Optimus Gen 3 1세대 라인 설치 중. "곧 생산 시작" 공식 확인. Optimus V3 10,000개 고유 부품, 초기 극도로 느린 생산 예고. 2026년 전량 내부용. LG 양산 타임라인과 직접 비교 대상.',
  '{"source":"CNBC / TechTimes / CryptoBriefing","confidence":"A","date":"2026-07-22","revenue":"$28.24B (+26% YoY)","eps":"$0.33 vs $0.50 expected","stock":"-11% after-hours","fremont":"S/X decommissioned, Optimus lines installing","production":"anticipated soon (late July-Aug)","unique_parts":10000,"2026_use":"internal only"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Tesla%Q2%Fremont%Optimus%'
  AND created_at > '2026-07-20'::timestamp
);

-- [CRITICAL] Hyundai 35,000명 파업 — 사상 최초 휴머노이드 노사 분쟁
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'critical',
  '[BD/Hyundai] 35,000명 사상 최초 휴머노이드 파업(7/13~22) — Atlas 배치 노조 동의 요구',
  'Hyundai 울산 35,000명 사상 최초 휴머노이드 관련 파업. 7/13~15 2시간, 7/20~22 4시간 단축근무. Atlas 한국 공장 배치 전 노조 사전 동의 요구. Hyundai 자체 공장 25,000대+ Atlas 배치 계획(30K/년 중 83%). 글로벌 생산 50% 영향. 노사관계 리스크가 휴머노이드 양산 전략의 핵심 변수로 부상.',
  '{"source":"Forbes / Unite.AI / Futurism / Carscoops","confidence":"A","date":"2026-07-17","strike_workers":35000,"location":"Ulsan South Korea","dates":"July 13-22 escalating","demand":"consent before Atlas deployment","hyundai_atlas_plan":"25,000+ units in own plants","impact":"50% of global Hyundai output","precedent":"first automotive humanoid strike"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Hyundai%35,000명%파업%'
  AND created_at > '2026-07-10'::timestamp
);

-- [WARNING] Hyundai SoftBank BD 지분 매입 — BD 완전 자회사화
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'funding', 'warning',
  '[BD/Hyundai] SoftBank 잔여 ~10% 지분 $325M 인수 — BD 완전 자회사화, $3.3B 기업가치',
  'Hyundai, SoftBank 보유 BD 잔여 ~10% 지분 $325M에 인수(7/16). BD 기업가치 $3.3B. SoftBank 풋옵션 행사. BD 완전 자회사화로 로봇 전략 일원화. Atlas 2028년 조지아 첫 공장 배치, 30K대/년 생산 규모 계획.',
  '{"source":"Bloomberg / Quartz / UPI","confidence":"A","date":"2026-07-16","price":"$325M for ~10%","valuation":"$3.3B","mechanism":"SoftBank put option","result":"BD fully owned subsidiary","factory_target":"2028 Georgia, 30K/yr"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%SoftBank%지분%BD%완전%'
  AND created_at > '2026-07-10'::timestamp
);

-- [WARNING] Agibot WAIC 2026 — A3 Ultra(Nvidia Thor) 등 4종 신제품
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%X1%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'score_spike', 'warning',
  '[Agibot] WAIC 2026 신제품 4종 — A3 Ultra(Nvidia Thor/51DOF/8시간), X2 Edu, G2 Max, OmniHand 3',
  'Agibot, WAIC 2026에서 4종 신제품 공개. A3 Ultra: 1.74m/60kg/51DOF/Nvidia Thor/8시간 운용. X2 Edu: 연구·교육용 모듈형 플랫폼. G2 Max: 고중량 팔레타이징 산업 로봇. OmniHand 3 Ultra-M: 20DOF 독립 핸드. 포트폴리오 다각화로 풀스택 로보틱스 기업 전략 가속.',
  '{"source":"Manila Times / Interesting Engineering / Robotics and Automation News","confidence":"A","date":"2026-07-20","products":4,"a3_ultra":"1.74m/60kg/51DOF/Nvidia Thor/8hr","x2_edu":"modular R&D platform","g2_max":"heavy-payload industrial","omnihand":"20DOF standalone hand"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Agibot%WAIC%2026%A3 Ultra%'
  AND created_at > '2026-07-15'::timestamp
);

-- [WARNING] Figure 03 생산 램프업 — 350대 납품, 24배 생산률 향상
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'mass_production', 'warning',
  '[Figure AI] Figure 03 350대+ 납품, 생산율 24배 향상(1대/일→1대/시간) — BMW 실배치 확대',
  'Figure AI, Figure 03 350대+ 납품 완료. BotQ 생산율 1대/일→1대/시간(24배 향상, 120일 미만). BMW Spartanburg 부품 분류·시퀀싱 자동화. 204K+ 패키지 자율 처리. 무선충전·촉각센서 핸드 탑재. 양산 전환 속도가 경쟁사 대비 주목할 만한 수준.',
  '{"source":"Figure AI Official / Forbes / Manufacturing Digital","confidence":"A","date":"2026-07-15","units_delivered":"350+","production_rate":"1/hour (24x improvement)","ramp_time":"<120 days","bmw":"Spartanburg parts sorting","packages_processed":"204,000+","features":["wireless charging","tactile sensor hands","speech-to-speech"]}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Figure%350대%24배%'
  AND created_at > '2026-07-10'::timestamp
);

-- [INFO] Atlas FIFA 월드컵 등장 — 글로벌 브랜드 노출
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  gen_random_uuid(),
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id = (SELECT id FROM companies WHERE name ILIKE '%Boston Dynamics%' LIMIT 1) ORDER BY announcement_year DESC LIMIT 1),
  'partnership', 'info',
  '[BD] Atlas FIFA 월드컵 최초 등장(7/5) — 라이브 매치 환경 휴머노이드 통합, 글로벌 브랜드 노출',
  'Atlas, FIFA 월드컵 16강(노르웨이-브라질, 7/5) 하프타임 등장. 사상 최초 월드컵 라이브 경기 내 휴머노이드 통합. 선수 세리머니 재현 + 매치볼 전달. 프로덕션 Atlas 혼잡 환경 안정성 입증. Hyundai 공식 로보틱스 파트너 — 전 세계 노출 효과 극대.',
  '{"source":"Hyundai Official / Fox Business / Interesting Engineering","confidence":"A","date":"2026-07-05","event":"FIFA World Cup Round of 16","match":"Norway vs Brazil","venue":"New York/New Jersey Stadium","achievement":"first-ever humanoid in World Cup live match","demo":"goal celebrations + match ball delivery"}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE title ILIKE '%Atlas FIFA 월드컵%'
  AND created_at > '2026-07-01'::timestamp
);


-- ============================================================
-- 3. CI MONITOR ALERTS (CI 모니터링 알림) — 신규 항목
-- ============================================================

-- Tesla Q2 실적 — Optimus 전환 확인
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'CNBC / TechTimes',
  'https://www.cnbc.com/2026/07/22/tesla-tsla-q2-2026-earnings-report.html',
  'Tesla Q2: Fremont S/X 해체→Optimus 생산라인 설치 중, 곧 생산 시작 공식 확인',
  'Q2 매출 $28.24B(+26%), EPS $0.33(하회), 주가 -11%. Fremont S/X→Optimus 전환. 생산 곧 시작. 10K 고유부품 초기 극느린 생산.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' OR slug ILIKE '%tesla%' OR name ILIKE '%Tesla%' OR name ILIKE '%Optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Tesla Q2%Fremont%Optimus%'
  AND detected_at > '2026-07-20'::timestamp
);

-- Hyundai SoftBank BD 완전 인수
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Bloomberg / Quartz',
  'https://www.bloomberg.com/news/articles/2026-07-16/hyundai-to-buy-softbank-s-boston-dynamics-stake-in-robot-push',
  'Hyundai, SoftBank BD 잔여 ~10% 지분 $325M 인수 — BD 완전 자회사화($3.3B)',
  'SoftBank 풋옵션 행사. $325M에 잔여 ~10%. BD $3.3B 기업가치. 완전 자회사화. Atlas 2028 조지아 30K/년.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' OR name ILIKE '%Boston%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Hyundai%SoftBank%BD%완전%'
  AND detected_at > '2026-07-10'::timestamp
);

-- Hyundai 35K 파업
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / Unite.AI',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/17/we-just-had-the-first-humanoid-robot-strike-ever/',
  'Hyundai 35,000명 사상 최초 휴머노이드 파업 — Atlas 배치 노조 동의 요구(7/13~22)',
  '울산 35K명 파업. 사상 최초 자동차 휴머노이드 파업. Atlas 배치 전 노조 동의 요구. 25K+ Atlas 자체 공장 계획. 글로벌 생산 50% 영향.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%atlas%' OR name ILIKE '%Atlas%' OR name ILIKE '%Boston%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Hyundai%35,000명%파업%'
  AND detected_at > '2026-07-10'::timestamp
);

-- Agibot WAIC 2026 신제품
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Interesting Engineering / Robotics and Automation News',
  'https://roboticsandautomationnews.com/2026/07/20/agibot-unveils-four-new-robots-at-waic-2026-as-it-expands-industrial-embodied-ai-portfolio/103505/',
  'Agibot WAIC 2026 신제품 4종 공개 — A3 Ultra(Nvidia Thor/51DOF), X2 Edu, G2 Max, OmniHand 3',
  'A3 Ultra: 1.74m/51DOF/Nvidia Thor/8시간. X2 Edu: 연구용. G2 Max: 산업 고중량. OmniHand 3: 20DOF 핸드. 30대+ 현장 운용.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' OR name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Agibot WAIC 2026%A3 Ultra%'
  AND detected_at > '2026-07-15'::timestamp
);

-- Figure 03 생산 램프업
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Figure AI Official / Forbes',
  'https://www.figure.ai/news/ramping-figure-03-production',
  'Figure 03 350대+ 납품, 생산율 24배 향상(1대/시간) — BMW 실배치 확대',
  '350+ 납품. 1대/일→1대/시간(24x, 120일 미만). BMW Spartanburg 부품 분류. 204K+ 패키지 처리. 무선충전·촉각 핸드.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' OR name ILIKE '%Figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Figure 03%350대%24배%'
  AND detected_at > '2026-07-10'::timestamp
);

-- Apptronik Robot Park
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / Semafor',
  'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
  'Apptronik Robot Park 90K sqft 개설 — Apollo 2 듀얼 구성, DeepMind Gemini 데이터 파이프라인',
  '오스틴 90K sqft 시설(7/1). Apollo 2 바이페달/휠. DeepMind Gemini Robotics 데이터 공급. Apollo 3 내년 첫 제품 예고.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' OR name ILIKE '%Apollo%' OR name ILIKE '%Apptronik%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%Apptronik Robot Park%90K%'
  AND detected_at > '2026-06-25'::timestamp
);

-- 1X NEO 핸드 업그레이드
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, status)
SELECT
  gen_random_uuid(),
  'Forbes / eWeek / Dezeen',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/09/human-level-hands-1x-just-gave-humanoid-robot-neo-something-close/',
  '1X NEO 핸드 25DOF 업그레이드 — 힘줄 구동, IP68 세척, 인간 수준 민첩성, 첫 소비자분 탑재',
  '25DOF 힘줄 구동 핸드. IP68 세척 가능(업계 최초). 촉각 센서 손끝. 2026년 첫 소비자 배송분 탑재. $20K 가격 유지.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' OR name ILIKE '%NEO%' OR name ILIKE '%1X%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts
  WHERE headline ILIKE '%1X NEO 핸드%25DOF%'
  AND detected_at > '2026-07-01'::timestamp
);

COMMIT;

-- ============================================================
-- EXECUTION SUMMARY
-- ============================================================
-- Articles inserted: up to 8 (deduplicated by content_hash)
-- Competitive alerts inserted: up to 7 (deduplicated by title + date)
-- CI monitor alerts inserted: up to 7 (deduplicated by headline + date)
-- Total: up to 22 records across 3 tables
--
-- 신뢰도 분류:
-- [A] 공식 1차 출처 / 복수 유력 매체 교차확인:
--     Tesla Q2 실적 (CNBC / TechTimes / CryptoBriefing — 공식 실적 발표)
--     Hyundai SoftBank BD 인수 (Bloomberg / Quartz / UPI)
--     Hyundai 35K 파업 (Forbes / Unite.AI / Futurism / Carscoops)
--     Atlas FIFA 월드컵 (Hyundai 공식 / Fox Business / Interesting Engineering)
--     Agibot WAIC 2026 신제품 (Manila Times / Interesting Engineering / R&A News)
--     Figure 03 350대+ (Figure AI 공식 / Forbes / Manufacturing Digital)
--     Apptronik Robot Park (Forbes / Semafor / R&A News)
--     1X NEO 핸드 업그레이드 (Forbes / eWeek / Dezeen)
--
-- 전체 8건 모두 [A] 등급 (공식 출처 또는 3개 이상 매체 교차확인)
--
-- NOTE: Railway PostgreSQL은 이 실행 환경에서 TCP 연결 불가.
-- 수동 실행 필요:
-- psql "$DATABASE_URL" -f scripts/ci-update-2026-07-24.sql
-- ============================================================
