-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-27
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요: psql $DATABASE_URL -f scripts/ci-update-2026-08-27.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] World Humanoid Robot Games 결과: 3대 로봇이 우사인 볼트 100m 기록 경신 + 화재 사고
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Gizmodo / Benzinga / Yahoo News / Wikipedia',
   'https://gizmodo.com/the-best-robot-fails-from-the-2026-world-humanoid-robot-games-2000802858',
   '[Critical] World Humanoid Robot Games 결과: 3대 로봇 우사인 볼트 100m 기록(9.58s) 경신 — Tiangong Ultra 9.39s',
   '8/25-26 결과: 100m 결선에서 Tiangong Ultra(9.39s), Honor Lightning(~9.3s) 등 3대 로봇이 볼트 세계기록(9.58s) 돌파. 그러나 100m 경기 중 휴머노이드 로봇 1대 장애물 충돌 후 화재 발생(8/25). 5일간 51개 종목 1,301경기 완료. 중국 로봇 체육·시나리오 종목 압도. 이동 속도가 인간 수준에 근접함을 실증한 역사적 이벤트.',
   '2026-08-27'::timestamp, 'pending'),

-- 2. [Warning] Hyundai, BD Atlas 25,000대 자체 공장 배치 계획 발표 → 노조 반발로 교착
  (gen_random_uuid(), 'Korea Herald / TechTimes / Automate.org',
   'https://www.koreaherald.com/article/10741955',
   '[Warning] Hyundai, Atlas 25,000대 현대·기아 공장 배치 계획 — 노조 "노동 협약 없이 불가" 반발',
   'Hyundai Motor Group, BD Atlas 25,000대를 현대·기아 글로벌 공장에 배치 계획 공식화. 그러나 한국 노조가 로봇 배치 전 노동 협약 체결 요구하며 도입 차단. CES 2026 발표 이후 Atlas 2026년 전량 사전 예약 완료. Hyundai $26B 미국 투자 중 로봇 공장(연 30K대 생산) 포함. Atlas 2028년 자동차 공장 본격 투입 목표.',
   '2026-08-27'::timestamp, 'pending'),

-- 3. [Warning] Agibot: 누적 15,000대 출하 발표 + A3 Ultra WAIC "전시의 보석" 선정
  (gen_random_uuid(), 'Gagadget / Interesting Engineering / eWeek / Robotics & Automation News',
   'https://gagadget.com/en/719322-agibot-unveils-15000-robots-and-revolutionary-a3-ultra-humanoid-with-nvidia-thor-at-waic-2026/',
   '[Warning] Agibot: 누적 15,000대 출하 — 서구 경쟁사 대비 압도적 규모, A3 Ultra WAIC 최고상',
   'WAIC 2026(7/18) 공식 발표: 누적 로봇 15,000대 출하. 서구 경쟁사 대비 압도적 규모(Figure 1,000대, Agility ~75대). A3 Ultra: 174cm/60kg, 51DOF, NVIDIA Thor, 8시간 운용, 배터리 스왑 지원. WAIC "전시의 보석(Gem of the Exhibition)" 10선 중 유일한 로봇 제품 선정. Q4 상용화 예정. HKEX IPO 진행 중. X2 Edu·G2 Max·OmniHand 3 Ultra-M 동시 공개.',
   '2026-08-27'::timestamp, 'pending'),

-- 4. [Info] Figure AI: BMW Leipzig 유럽 확장 — 첫 유럽 휴머노이드 공장 배치 진행
  (gen_random_uuid(), 'BMW Group Press / IIoT World / Figure AI',
   'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
   '[Info] Figure AI: BMW Leipzig 유럽 확장 — Figure 03, 고전압 배터리 조립 + 부품 제조 투입',
   'BMW Group Plant Leipzig 파일럿: 2026.4월 테스트 배치 → 여름 본격 파일럿 진입. Figure 03 고전압 배터리 조립·부품 제조에 투입. Physical AI in Production 유능센터(Center of Competence) 신설. Spartanburg Figure 02 → Figure 03 전환 완료(40대). 이전 Figure 02: 10개월간 30,000대 X3 생산 기여, 204K+ 패키지 분류. 서구 OEM 최초 유럽 휴머노이드 공장 배치.',
   '2026-08-27'::timestamp, 'pending'),

-- 5. [Info] Agility Robotics: NVIDIA Halos 최초 통합 — 산업용 휴머노이드 안전 인증 선도
  (gen_random_uuid(), 'NVIDIA / Technology Magazine / The Robot Report',
   'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
   '[Info] Agility, NVIDIA Halos 최초 적용 — Digit 산업용 안전 인증(IEC 61508/ISO 13849) 추진',
   '6/22 Automate 시카고 발표: Agility, NVIDIA Halos for Robotics 최초 통합 기업. IGX Thor + Halos Core로 Digit 안전 감지 시스템 구현. IEC 61508·ISO 13849·ISO/IEC TR 5469 인증 추진 중 — NVIDIA Halos AI Systems Inspection Lab 활용. Amazon·GXO·Schaeffler·Toyota Canada 고객군. Digit v5 12월 출시 계획 변경 없음. 산업용 휴머노이드 안전 표준 선점 의미.',
   '2026-08-27'::timestamp, 'pending'),

-- 6. [Info] Boston Dynamics: Atlas 2026년 전량 사전 예약 완료 — Hyundai RMAC + Google DeepMind 배치
  (gen_random_uuid(), 'Forbes / Engadget / Automate.org / Boston Dynamics',
   'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
   '[Info] BD Atlas: 2026년 전량 사전 예약 — Hyundai RMAC + Google DeepMind 배치 시작',
   'Atlas 2026년 생산분 전량 사전 예약 완료 확인. 배치 대상: Hyundai RMAC(Robotics Metaplant Application Center) + Google DeepMind. 보스턴 본사 생산 즉시 개시. 사양: 7.5ft 리치, 50kg(110lb) 리프트, -20~40°C 운용. CES 2026 "Best Robot" 수상. 2027년 초 추가 고객 확보 예정. Hyundai 2028년 자동차 공장 본격 투입.',
   '2026-08-27'::timestamp, 'pending'),

-- 7. [Info] Tesla Optimus: 8월 말 기준 여전히 생산 미개시 — "곧 시작" 발언만 반복
  (gen_random_uuid(), 'Electrek / Teslarati / Tesery / SEC 8-K',
   'https://blog.robozaps.com/b/tesla-model-s-optimus-robot-factory-conversion',
   '[Info] Tesla Optimus: 8/27 기준 프리몬트 생산 미개시 지속 — Q2 실적 "곧 시작" 구체 일정 없음',
   '8/27 기준: 프리몬트 Optimus 라인 설치 지속, 실제 생산 미개시. Q2 실적(8/5) Musk "production starting soon" 언급, 구체 일정 미제시. 7/22 주주서한: "anticipated later this year". 내부 1,000+ Gen 3 배터리 핸들링·케이블 작업. 초기 생산분 Optimus Academy(내부 교육용). 소비자 판매 $20-30K 2027 말 유지. V3 공개 "올해 중" 재차 연기.',
   '2026-08-27'::timestamp, 'pending'),

-- 8. [Info] 1X NEO: 프리오더 전량 매진, 미국 가정 출하 "올해 중" — 실제 배송 건수 미확인
  (gen_random_uuid(), 'TechCrunch / eWeek / Houston Chronicle / 1X.tech',
   'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
   '[Info] 1X NEO: 10K대 프리오더 5일 만에 매진 — 미국 가정 출하 시작 보도, 실배송 검증 미완',
   'Hayward 공장(58K sqft) 풀 프로덕션 가동, 연 10K 용량. $20K EA 구매·$499/월 렌탈. 프리오더 5일 만에 첫해 전량 매진. NEO Gamma: 5ft7/66lb, 바이페달, 5지 손, 소프트 니트 외장. 3색 옵션(Tan/Gray/Dark Brown). EQT 10K대 B2B 계약 유지. "미국 가정 출하 시작" 보도 있으나 실배송 건수·고객 사례 구체 확인 안 됨. 2027년 100K 목표.',
   '2026-08-27'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Industry] World Humanoid Robot Games 2026 결과 — 로봇, 볼트 100m 기록 경신
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'World Humanoid Robot Games 2026: Robots Break Usain Bolt 100m Record, Fire Incident on Day 4',
  'Gizmodo / Benzinga / Yahoo News / Wikipedia',
  'https://gizmodo.com/the-best-robot-fails-from-the-2026-world-humanoid-robot-games-2000802858',
  '2026-08-26'::timestamp,
  'Three humanoid robots broke Usain Bolt''s 100m world record (9.58s) at the 2026 World Humanoid Robot Games in Beijing (Aug 22-26). Tiangong Ultra clocked 9.39s, Honor Lightning recorded approximately 9.3s. However, one robot caught fire after colliding with an obstacle during the 100m race on August 25. The five-day event completed 1,301 competitions across 51 events. Chinese teams dominated with 96% participation (641 of 666 teams). Games concluded August 26.',
  'World Humanoid Robot Games 2026 Beijing — Final Results. The games ran August 22-26 at the National Speed Skating Oval. Headline result: at least three humanoid robots surpassed Usain Bolt''s 9.58-second 100m world record. Tiangong Ultra clocked 9.39 seconds. Honor''s Lightning recorded approximately 9.3 seconds. This represents a milestone in bipedal locomotion speed. Incidents: a humanoid robot caught fire after colliding with an obstacle at the end of the 100m race on August 25 — the fire was quickly contained. Multiple robots also tripped, fell, or broke apart during various events. The competition featured 666 teams with 2,056 robots from 16 countries across 6 continents. China fielded 641 teams (96%), representing 157 companies and 200 research institutions. Events spanned 9 athletic disciplines (athletics, football, gymnastics, weightlifting, martial arts, street dance, sport dance, tug of war, pitch-pot) and 6 scenario-based events (factory, hotel, home, emergency, hospital, retail). Scale increase: 138% more teams and 2x more robots compared to 2025 inaugural event. Industry significance: demonstrates humanoid bipedal locomotion approaching and surpassing human-level speed.',
  'en', 'industry', 'robot',
  md5('whrg-2026-results-bolt-record-fire-2026-08-27'),
  '{"mentionedCompanies":["Tiangong","Honor"],"mentionedRobots":["Tiangong Ultra","Lightning"],"technologies":["bipedal locomotion"],"marketInsights":["robots surpass Bolt 100m record","9.39s Tiangong Ultra","fire incident during competition","2,056 robots 16 countries"],"keyPoints":["3 robots beat 9.58s record","Tiangong Ultra 9.39s","robot fire Aug 25","games concluded Aug 26"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('whrg-2026-results-bolt-record-fire-2026-08-27'));

-- [Boston Dynamics] Hyundai 25,000대 Atlas 배치 + 노조 반발
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Hyundai to Deploy 25,000 Atlas Robots Across Factories — Union Blocks Without Labor Deal',
  'Korea Herald / TechTimes / Automate.org / Forbes',
  'https://www.koreaherald.com/article/10741955',
  '2026-08-27'::timestamp,
  'Hyundai Motor Group plans to deploy 25,000 Boston Dynamics Atlas humanoid robots across Hyundai and Kia manufacturing plants globally. All 2026 Atlas production is fully committed, shipping to Hyundai RMAC and Google DeepMind. However, Korean unions have blocked deployment, demanding a labor agreement before any robots enter factories. Hyundai plans a $26B US investment including a robot factory capable of producing 30,000 units per year. Atlas full deployment in car plants targeted for 2028.',
  'Hyundai Motor Group and Boston Dynamics Atlas deployment update: Plan to deploy 25,000 Atlas humanoid robots across Hyundai and Kia manufacturing plants globally. Production status: all 2026 Atlas production fully committed and sold out. Initial shipments to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. Labor relations: Korean labor unions have blocked robot deployment, demanding a labor agreement be signed before any humanoid robots enter factory floors. This represents a significant regulatory/labor barrier. Hyundai $26 billion US investment plan includes building a dedicated robot factory with capacity for 30,000 robots per year. Atlas specifications: 7.5-foot reach, 110-pound lift capacity, operating temperature range -4 to 104°F. CES 2026 "Best Robot" award from CNET. Next milestones: additional customers early 2027. Full deployment in Hyundai car assembly plants targeted for 2028, focusing initially on parts sequencing tasks. Boston Dynamics production at Boston headquarters.',
  'en', 'business', 'robot',
  md5('hyundai-25000-atlas-union-blocks-2026-08-27'),
  '{"mentionedCompanies":["Hyundai","Boston Dynamics","Kia","Google DeepMind"],"mentionedRobots":["Atlas"],"technologies":["NVIDIA Isaac"],"marketInsights":["25,000 Atlas deployment planned","2026 production fully committed","union blocks deployment","30,000/year factory planned"],"keyPoints":["25K Atlas across HMG plants","Korean union blocks deployment","$26B US investment","2028 car plant target"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('hyundai-25000-atlas-union-blocks-2026-08-27'));

-- [Agibot] 15,000대 누적 출하 + A3 Ultra WAIC 최고상
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT Ships 15,000 Robots, A3 Ultra Named "Gem of the Exhibition" at WAIC 2026',
  'Gagadget / Interesting Engineering / eWeek / Robotics & Automation News',
  'https://gagadget.com/en/719322-agibot-unveils-15000-robots-and-revolutionary-a3-ultra-humanoid-with-nvidia-thor-at-waic-2026/',
  '2026-07-18'::timestamp,
  'AGIBOT announced cumulative shipments of 15,000 robots at WAIC 2026, a scale unmatched by any Western competitor (Figure: 1,000, Agility: ~75). Unveiled four new products: A3 Ultra humanoid (174cm/60kg, 51 DOF, NVIDIA Thor, 8hr operation), X2 Edu, G2 Max, OmniHand 3 Ultra-M. A3 Ultra named sole robotics product in WAIC "Gem of the Exhibition" top 10. A3 Ultra commercial launch planned Q4 2026. HKEX IPO process ongoing (CICC/CITIC/Morgan Stanley).',
  'AGIBOT WAIC 2026 announcements (July 18, Shanghai): Cumulative robot shipments reached 15,000 units — by far the largest production volume of any humanoid robotics company globally. Western competitor comparison: Figure AI ~1,000 units, Agility Robotics ~75 deployed, Boston Dynamics just beginning production. Revenue trajectory: first year RMB 300K → year two RMB 60M → 2025 exceeded RMB 1B. New product lineup: (1) A3 Ultra — 174cm tall, 60kg, 51 degrees of freedom, powered by NVIDIA Thor SoC, up to 8 hours operation time, supports battery swapping, direct charging, and autonomous charging, 5kg payload per arm. Named sole robotics product in WAIC "Gem of the Exhibition" top 10 selection. Q4 2026 commercial launch. (2) X2 Edu — education platform. (3) G2 Max — industrial robot. (4) OmniHand 3 Ultra-M — advanced robotic hand. Industrial deployments: tablets manufacturing, semiconductor handling, factory logistics. 60+ AGIBOT robots operated across WAIC venues. HKEX IPO in progress: CICC, CITIC Securities, Morgan Stanley as underwriters. Omdia: 39% global humanoid market share claim (2025). Security concern: global export push meets Chinese spy law obligations.',
  'en', 'product', 'robot',
  md5('agibot-15000-ships-a3ultra-waic-2026-08-27'),
  '{"mentionedCompanies":["AGIBOT","NVIDIA","CICC","CITIC","Morgan Stanley"],"mentionedRobots":["A3 Ultra","X2 Edu","G2 Max","OmniHand 3 Ultra-M"],"technologies":["NVIDIA Thor","embodied AI"],"marketInsights":["15,000 cumulative shipments","39% global market share claim","HKEX IPO in progress","revenue >RMB 1B in 2025"],"keyPoints":["15K robots shipped","A3 Ultra Gem of Exhibition","Q4 commercial launch","HKEX IPO ongoing"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-15000-ships-a3ultra-waic-2026-08-27'));

-- [Figure AI] BMW Leipzig 유럽 확장
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Expands to Europe: BMW Leipzig Pilot Deploys Figure 03 in Battery Assembly',
  'BMW Group Press / IIoT World / Press.BMWGroup.com',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  '2026-08-27'::timestamp,
  'BMW Group Plant Leipzig begins pilot deployment of Figure 03 humanoid robots for high-voltage battery assembly and component manufacturing — the first European factory deployment of humanoid robots by a Western OEM. Test phase started April 2026, full pilot commencing summer 2026. BMW established Center of Competence for Physical AI in Production. At Spartanburg, Figure 02→03 transition complete with 40 Figure 03 units. Previous Figure 02 pilot contributed to 30,000+ BMW X3 production over 10 months.',
  'BMW Group and Figure AI European expansion: Plant Leipzig pilot deployment of Figure 03 for high-voltage battery assembly and component manufacturing. Timeline: test deployment from April 2026, full pilot phase starting summer 2026. Significance: first European factory deployment of humanoid robots by a Western automotive OEM. BMW established Center of Competence for Physical AI in Production to accelerate global robotics integration. Spartanburg (USA) status: Figure 02 to Figure 03 transition complete. 40 Figure 03 units now deployed for logistics sequencing. Figure 02 results at Spartanburg: 10-month pilot, contributed to 30,000+ BMW X3 production, 204,000+ packages sorted, 1,250+ runtime hours, >99% placement accuracy, 84-second cycle times. Figure 03 specifications: 5ft8, 61kg, 20kg payload, 1.2 m/s walking speed, 5-hour swappable 2.3kWh battery. Helix in-house AI model for reasoning. BotQ factory producing approximately 1 robot per hour. 1,000th Figure 03 produced July 23. Corporate: $39B valuation, $2.34B total raised.',
  'en', 'product', 'robot',
  md5('figure-bmw-leipzig-europe-expansion-2026-08-27'),
  '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix","Physical AI"],"marketInsights":["first European humanoid factory deployment","40 Figure 03 at Spartanburg","1 robot/hour production rate"],"keyPoints":["Leipzig pilot summer 2026","high-voltage battery assembly","Center of Competence established","30K+ X3 production contribution"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-bmw-leipzig-europe-expansion-2026-08-27'));

-- [Agility] NVIDIA Halos 안전 인증 추진
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics First to Integrate NVIDIA Halos Safety System Into Digit Humanoid',
  'NVIDIA / Technology Magazine / The Robot Report / Engineering.com',
  'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
  '2026-06-22'::timestamp,
  'Agility Robotics became the first company to integrate NVIDIA Halos for Robotics — the industry''s first full-stack safety system for physical AI — into its Digit humanoid robot. NVIDIA IGX Thor provides industrial-grade AI compute with built-in safety capabilities, while Halos Core supports safety-related software. Pursuing IEC 61508, ISO 13849, and ISO/IEC TR 5469 certifications via NVIDIA Halos AI Systems Inspection Lab. Key customers include Amazon, GXO, Schaeffler, Toyota Canada. Digit v5 launch on track for December 2026.',
  'Agility Robotics and NVIDIA Halos integration announced June 22 at Automate conference, Chicago. NVIDIA Halos for Robotics: first full-stack, comprehensive safety system for physical AI. Agility is the launch partner — first to integrate. Technical implementation: NVIDIA IGX Thor delivers industrial-grade AI compute with built-in safety capabilities. Halos Core supports safety-related operating functions software layer. Certification pursuit: IEC 61508 (functional safety), ISO 13849 (machinery safety), ISO/IEC TR 5469 (AI safety). Using NVIDIA Halos AI Systems Inspection Lab for verification before final third-party certification. Significance: first humanoid robot to pursue formal industrial safety certification through a standardized platform — sets precedent for industry. Digit deployment status: Amazon, GXO Logistics, Schaeffler, Toyota Motor Manufacturing Canada. 65,000+ hours real-world operation. ~75 units installed base globally. Digit v5 development: 50lb payload, 20-hour operational days, standardized self-swapping end effectors. December 2026 commercial launch on track. SPAC listing: AGLT on Nasdaq, S-4 filed July 14, closing expected by year end. Valuation: $2.5B.',
  'en', 'technology', 'robot',
  md5('agility-nvidia-halos-safety-digit-2026-08-27'),
  '{"mentionedCompanies":["Agility Robotics","NVIDIA","Amazon","GXO","Schaeffler","Toyota"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos","IGX Thor","Halos Core"],"marketInsights":["first humanoid safety certification pursuit","IEC 61508/ISO 13849 target","65,000+ hours operation"],"keyPoints":["first Halos integration","IGX Thor + Halos Core","IEC/ISO certification pursuit","Digit v5 Dec 2026 launch"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-nvidia-halos-safety-digit-2026-08-27'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: World Humanoid Robot Games — 로봇이 인간 속도 추월
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'warning',
  '[Industry] 휴머노이드 100m 우사인 볼트 기록 돌파 — Tiangong Ultra 9.39s (볼트 9.58s)',
  '8/25 WHRG 100m 결선: Tiangong Ultra 9.39s, Honor Lightning ~9.3s로 볼트 세계기록(9.58s) 경신. 바이페달 이동속도가 인간 수준 도달·초과 실증. 산업용 이동 속도 요구사항 충족 가능성 입증.',
  '{"source":"Gizmodo/Benzinga/Yahoo News","confidence":"A","date":"2026-08-27","event":"WHRG 2026 Beijing","result":"3 robots beat 9.58s","fastest":"Tiangong Ultra 9.39s","significance":"bipedal speed surpasses human"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%휴머노이드 100m 우사인 볼트 기록 돌파%');

-- Alert 2: Hyundai 25,000대 Atlas 배치 + 노조 교착
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Boston%') LIMIT 1),
  'partnership', 'warning',
  '[BD/Hyundai] Atlas 25,000대 글로벌 공장 배치 계획 — 노조 반발로 도입 교착',
  'Hyundai Motor Group, Atlas 25,000대 현대·기아 글로벌 공장 배치 계획. 2026년 생산분 전량 예약 완료. 한국 노조 반발로 도입 차단. $26B 미국 투자 중 30K/년 로봇 공장 포함. 노동 규제 리스크 시사.',
  '{"source":"Korea Herald/TechTimes","confidence":"A","date":"2026-08-27","plannedUnits":25000,"factoryCapacity":"30,000/year","usInvestment":"$26B","barrier":"union labor agreement required","target":"2028 car plants"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Atlas 25,000대 글로벌 공장 배치%');

-- Alert 3: Agibot 15,000대 출하 — 글로벌 최대 규모
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Agibot%') LIMIT 1),
  'mass_production', 'warning',
  '[Agibot] 누적 15,000대 출하 — 글로벌 최대 휴머노이드 생산 규모, A3 Ultra Q4 출시',
  'WAIC 2026 발표: 15,000대 누적 출하. Figure 1,000대·Agility ~75대 대비 압도적. A3 Ultra(51DOF, NVIDIA Thor) Q4 출시. 매출 RMB 1B+ 돌파. HKEX IPO 진행 중.',
  '{"source":"Gagadget/IE/eWeek","confidence":"B","date":"2026-08-27","cumulativeShipments":15000,"comparison":"Figure ~1,000, Agility ~75","a3UltraLaunch":"Q4 2026","revenue2025":">RMB 1B","ipoStatus":"HKEX in progress"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%누적 15,000대 출하%');

-- Alert 4: Figure AI BMW Leipzig 유럽 확장
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' LIMIT 1),
  'partnership', 'info',
  '[Figure AI] BMW Leipzig 유럽 최초 휴머노이드 공장 배치 — Physical AI CoC 신설',
  'BMW Plant Leipzig: Figure 03 고전압 배터리 조립·부품 제조 파일럿(여름 본격화). 서구 OEM 최초 유럽 공장 휴머노이드 배치. Spartanburg 40대 Figure 03 전환 완료.',
  '{"source":"BMW Group Press","confidence":"A","date":"2026-08-27","location":"BMW Leipzig","tasks":"HV battery assembly, component manufacturing","pilotStart":"summer 2026","spartanburgUnits":40,"significance":"first Western OEM European humanoid deployment"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%BMW Leipzig 유럽 최초%');

COMMIT;
