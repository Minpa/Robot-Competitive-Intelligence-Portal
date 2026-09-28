-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-28
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-28T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-25
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-28.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Agibot x Chimelong — 300+ 로봇 테마파크 대규모 배치, 누적 20,000대 생산 돌파
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'PR Newswire / RoboticsTomorrow / TechRepublic / Blooloop',
   'https://www.roboticstomorrow.com/news/2026/09/24/agibot-and-chimelong-launch-large-scale-embodied-ai-theme-park-with-more-than-300-robots/27148/',
   '[Warning] Agibot x Chimelong Spaceship Park — 300+ 로봇 대규모 배치, 누적 20,000대 생산 돌파',
   '9/24 Agibot과 Chimelong Group이 Chimelong Spaceship Park에서 300+ 로봇 대규모 배치 1단계 발표. 엔터테인먼트·교육·방문객 서비스·호텔 운영 전반에 로봇 투입. China Mobile 5G-A 전용 네트워크 구축. 중앙 조정 시스템으로 멀티로봇 관리. 이 행사에서 20,000번째 로봇 라인오프 마일스톤 달성. 관광·서비스 산업 대규모 실증 사례.',
   '2026-09-28'::timestamp, 'pending'),

-- 2. [Warning] Unitree UnifoLM-X2-1.0 — 세계 최초 완전 자율 휴머노이드 로봇 격투 시연
  (gen_random_uuid(), 'Interesting Engineering / AlphaSignal / Humanoids Daily / Robotic Gizmos',
   'https://interestingengineering.com/ai-robotics/humanoid-robot-learns-to-fight-autonomously',
   '[Warning] Unitree UnifoLM-X2-1.0 — 세계 최초 완전 자율 휴머노이드 전투 시연, 월드모델 기반',
   '9/7 Unitree가 UnifoLM-X2-1.0 월드-액션 모델 기반 완전 자율 휴머노이드 전투 영상 공개. 인간 조종 없이 G1 로봇 2대가 실시간 스파링 — 상대 동작 예측·즉각 대응·균형 유지. 이전 UnifoLM-WMA-0 아키텍처 후속. 월드모델 기반 대규모 배치 가능성 입증 주장. 다만 논문·지연시간·벤치마크 미공개, 오픈소스 여부 미확인.',
   '2026-09-28'::timestamp, 'pending'),

-- 3. [Info] 중국 규제당국 휴머노이드 IPO 속도 조절 — Unitree 주가 급등 후 급락 계기
  (gen_random_uuid(), 'Reuters / BusinessWorld / Technology.org / RTE News',
   'https://www.technology.org/2026/09/21/china-humanoid-robot-ipo-slowdown-unitree/',
   '[Info] 중국 규제당국 휴머노이드 로봇 IPO 러시 속도 조절 — Unitree 변동성 계기, 비공식 창구 지도',
   '9/20~21 보도: 중국 규제당국이 Unitree IPO 후 주가 변동성(피크 대비 55% 급락)을 계기로 휴머노이드 로봇 IPO를 비공식 "창구 지도(window guidance)"로 사실상 동결. 밸류에이션 과열 여부·지방정부 프로젝트 매출 지속가능성 심사 강화. 대기 IPO: Deep Robotics, X Square Robot, Agibot 등 6+사. 공식 금지는 아니나 업종 특화 속도 조절.',
   '2026-09-28'::timestamp, 'pending'),

-- 4. [Info] Tesla Optimus Fremont 공장 전환 + Gen 3 공개 임박 — Model S/X 라인 로봇 양산 전환
  (gen_random_uuid(), 'Electrek / Optimusk.blog / TheRoboticLife',
   'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
   '[Info] Tesla Optimus Fremont Model S/X 라인 전환 — 연 100만대 목표, Gen 3 공개 9월 말~10월 예상',
   'Tesla가 Fremont 공장 내 구 Model S/X 라인을 Optimus 조립 라인으로 전환 착수(2026 여름). 최종 연간 100만대 생산 목표. Gen 3 공식 디자인·가격·사전주문은 미공개 — 분석가들: 9월 말~10월 공장 작업 시연 예상. 앱 유출 Gen 3: 매트 블랙+샴페인골드 투톤, 관절 커버 일체형 산업 마감.',
   '2026-09-28'::timestamp, 'pending'),

-- 5. [Info] Agility Robotics SPAC 상장 진행 — Churchill Capital XI, $2.5B 밸류, Foxconn $200M PIPE
  (gen_random_uuid(), 'TechCrunch / SEC Filings / Robotics & Automation News / GeekWire',
   'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
   '[Info] Agility Robotics SPAC 상장 진행 — Churchill Capital XI $2.5B 합병, Foxconn 주도 $200M PIPE',
   '6/24 발표 Agility Robotics가 Churchill Capital Corp XI와 $2.5B SPAC 합병으로 상장 추진. ~$620M 자금 확보 예상. $414M 트러스트 + Foxconn 주도 $200M PIPE. SEC Form 425 지속 접수 중(9월). 티커 AGLT 예정. Digit 5 $300M+ 수주 기반. Amazon·DCVC·Playground Global 등 $390M+ 기존 투자.',
   '2026-09-28'::timestamp, 'pending'),

-- 6. [Info] Figure AI BotQ 생산 24배 증가 — 시간당 1대 달성, 연 12,000대 목표
  (gen_random_uuid(), 'Figure AI / The Robot Report / Inspenet / FAQ.com',
   'https://www.figure.ai/news/botq',
   '[Info] Figure AI BotQ 24배 생산성 향상 — 일 1대→시간 1대, 350+대 출하, 연 12,000대 용량',
   'Figure AI BotQ 시설이 120일 만에 일 1대→시간 1대(24배) 생산성 달성. 350+대 Figure 03 출하. 150+ 네트워크 워크스테이션으로 풀스택 제조(부품 소싱~최종 테스트). 연 12,000대 생산 용량. 초기 액추에이터 캘리브레이션·하네스 라우팅 불량 해결 후 안정화. White House 방문 시연 등 마일스톤.',
   '2026-09-28'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Agibot] Chimelong Spaceship Park 300+ 로봇 배치
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT and Chimelong Launch Large-Scale Embodied AI Theme Park with 300+ Robots, 20,000th Unit Milestone',
  'PR Newswire / RoboticsTomorrow / TechRepublic / Blooloop',
  'https://www.roboticstomorrow.com/news/2026/09/24/agibot-and-chimelong-launch-large-scale-embodied-ai-theme-park-with-more-than-300-robots/27148/',
  '2026-09-24'::timestamp,
  'AGIBOT and Chimelong Group launched the first phase of a large-scale embodied AI deployment at Chimelong Spaceship Park with 300+ robots across entertainment, education, visitor services, and hotel operations. The event marked AGIBOT''s 20,000th robot production milestone. China Mobile 5G-A dedicated network for multi-robot coordination. Centralized coordination system manages fleet across park and hotel environments.',
  'On September 24, 2026, AGIBOT and Chimelong Group launched the first phase of a large-scale embodied AI deployment at Chimelong Spaceship Park, integrating more than 300 robots into entertainment, education, visitor services, and hotel operations. The deployment goes beyond standalone demonstrations, embedding robots into a range of guest-facing and operational scenarios supported by dedicated connectivity, multi-robot coordination, and safety systems. Robots are being used for live entertainment, science education, guided tours, retail service stations, AI companion experiences, hotel services, and sports competitions. AGIBOT, Chimelong, and China Mobile established a dedicated 5G-A network to provide connectivity in high-traffic areas, and a centralized coordination system manages robots operating across the park and hotel environments. The launch also marked the delivery to Chimelong of the 20,000th robot to roll off AGIBOT''s production line — a major manufacturing milestone that connects production scale with one of the company''s largest real-world deployments in the tourism sector. This follows AGIBOT''s earlier milestone of 15,000 cumulative units in June 2026. The deployment demonstrates AGIBOT''s ability to operate beyond factory and warehouse environments, extending into consumer-facing service industries at scale.',
  'en', 'industry', 'robot',
  md5('agibot-chimelong-300-robots-20000th-milestone-2026-09-28'),
  '{"mentionedCompanies":["AGIBOT","Chimelong Group","China Mobile"],"mentionedRobots":["A3","G-series"],"technologies":["5G-A dedicated network","multi-robot coordination","centralized fleet management","embodied AI"],"marketInsights":["300+ robots in single deployment","20,000th unit production milestone","Tourism/service sector expansion","5G-A infrastructure partnership"],"keyPoints":["Chimelong Spaceship Park Phase 1","Entertainment+education+hotel+service","20K cumulative production","China Mobile 5G-A network"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-chimelong-300-robots-20000th-milestone-2026-09-28'));

-- [Unitree] UnifoLM-X2-1.0 자율 전투 시연
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Demonstrates World''s First Fully Autonomous Humanoid Robot Combat Using UnifoLM-X2-1.0 World Model',
  'Interesting Engineering / AlphaSignal / Humanoids Daily / Robotic Gizmos',
  'https://interestingengineering.com/ai-robotics/humanoid-robot-learns-to-fight-autonomously',
  '2026-09-07'::timestamp,
  'Unitree Robotics released a video on September 7, 2026 demonstrating the world''s first fully autonomous humanoid robot combat. Two G1 robots spar without any remote control, powered by UnifoLM-X2-1.0, a real-time world model that enables predictive perception-to-action planning. The system reads opponent movements, predicts next moves, and executes responses while maintaining balance — all autonomously.',
  'On September 7, 2026, Unitree Robotics released a video showing two of its G1 humanoid robots sparring without any human remote control, marking what the company claims is the world''s first fully autonomous humanoid robot combat demonstration. The system driving the robots is called UnifoLM-X2-1.0, a real-time world model that enables predictive perception-to-action planning. Unlike past Unitree robot fights, which were remote controlled by human operators, this demonstration uses the world model to read the opponent''s movements, predict the next move, and execute a response instantly — all while maintaining balance. UnifoLM-X2-1.0 uses a continuous loop that processes the environment, anticipates how the scene and opponent are likely to change, and uses those predictions to plan the robot''s next movements in real-time. Unitree says this proves world model-driven humanoid robots are feasible to deploy at scale, framing it as a milestone for its world-action foundation model work following the earlier open-sourced UnifoLM-WMA-0 architecture. However, no academic paper, latency benchmarks, or detailed performance metrics have been released. Open-sourcing of the X2-1.0 model remains unconfirmed. Unitree has shipped 18,000+ humanoid robots in 2026 and raised approximately $905 million in its August 2026 Shanghai STAR Market IPO.',
  'en', 'technology', 'robot',
  md5('unitree-unifolm-x2-autonomous-combat-demo-2026-09-28'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1"],"technologies":["UnifoLM-X2-1.0","world model","predictive perception-to-action","real-time autonomous combat","UnifoLM-WMA-0"],"marketInsights":["18,000+ humanoids shipped 2026","$905M STAR Market IPO","World model scalability claimed"],"keyPoints":["First fully autonomous humanoid combat","No human remote control","Real-time prediction and response","No paper/benchmarks released yet"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-unifolm-x2-autonomous-combat-demo-2026-09-28'));

-- [China] 휴머노이드 IPO 규제 속도 조절
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'China Regulators Slow Humanoid Robot IPO Rush After Unitree''s Volatile STAR Market Debut',
  'Reuters / BusinessWorld / Technology.org / RTE News',
  'https://www.technology.org/2026/09/21/china-humanoid-robot-ipo-slowdown-unitree/',
  '2026-09-20'::timestamp,
  'Chinese regulators are using informal "window guidance" to slow the rush of humanoid robot IPOs, effectively freezing new listings after Unitree''s volatile STAR Market debut (shares dropped 55% from peak). Scrutiny focuses on whether soaring valuations and revenue from state-backed projects reflect genuine commercial demand. At least 6 companies in pipeline: Deep Robotics, X Square Robot, AGIBOT, and others.',
  'Chinese regulators are putting the brakes on a rush of humanoid-robot companies seeking listings, scrutinizing whether soaring valuations and revenue tied to state-backed projects reflect actual commercial demand. The slowdown was triggered by the volatile performance of Unitree Robotics shares, which soared more than fivefold in their Shanghai STAR Market debut on August 19 before plunging approximately 55% from the peak. Regulators have used informal "window guidance" to hold back some humanoid-robot listings. Sources indicate humanoid IPOs have been effectively frozen for now, though there is no formal ban — the move is described as a sector-specific slowdown. At least half a dozen Chinese humanoid robotics firms are preparing to go public, including Deep Robotics, X Square Robot, and AGIBOT. Regulators are particularly focused on whether revenue generated through local-government-backed projects can be sustained, noting that robot data-collection centers and joint ventures where local governments could provide 80-90% of initial investment had generated significant revenue for some companies. The IPO slowdown could impact the pace of capital formation for Chinese humanoid robotics companies, though it does not affect their production or commercial deployment activities.',
  'en', 'industry', 'robot',
  md5('china-humanoid-ipo-slowdown-unitree-window-guidance-2026-09-28'),
  '{"mentionedCompanies":["Unitree","Deep Robotics","X Square Robot","AGIBOT"],"mentionedRobots":[],"technologies":[],"marketInsights":["IPO rush effectively frozen","Window guidance by regulators","6+ companies in IPO pipeline","Scrutiny on govt-backed revenue"],"keyPoints":["Unitree 55% drop from peak triggered review","No formal ban, sector-specific slowdown","80-90% govt investment scrutinized","AGIBOT IPO in pipeline affected"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('china-humanoid-ipo-slowdown-unitree-window-guidance-2026-09-28'));

-- [Tesla] Fremont 전환 + Gen 3 공개 임박
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Converting Fremont Model S/X Lines for Optimus Assembly, Gen 3 Public Reveal Expected Late Sept-Oct',
  'Electrek / Optimusk.blog / TheRoboticLife',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-09-26'::timestamp,
  'Tesla has begun converting former Model S and Model X production lines at its Fremont factory to assemble Optimus humanoid robots, targeting eventual capacity of 1 million units per year. The Gen 3 official design, pricing, and pre-orders remain undisclosed. Analysts expect a public factory-work reveal around late September or October 2026. App-leaked Gen 3 design shows matte black + champagne-gold two-tone industrial finish with integrated joint covers.',
  'Tesla has begun converting former Model S and Model X production lines at its Fremont, California factory to assemble Optimus humanoid robots, aiming for an eventual capacity of one million units per year as production ramps up. The conversion started in summer 2026, adding to the ongoing construction of the dedicated Optimus factory at Giga Texas. As of late September 2026, supply chain data confirms Tesla is producing approximately 1,000 Optimus units per week, with plans to reach 2,000-2,500 units per week by year-end, for a total of approximately 15,000 units in 2026. The finished Gen 3 design, consumer pricing, and pre-order availability remain undisclosed as of late September. Musk''s pattern is to reveal only once production is ready. Industry analysts expect a public factory-work demonstration around late September or October 2026, with a formal Gen 3 unveiling likely tied to a production or earnings milestone rather than a standalone event. Digital assets discovered in the Tesla mobile app reveal the production-ready Gen 3 aesthetic: a cleaner industrial finish with integrated flexible joint covers, matte black fairings replacing Gen 2.5''s gold accents, creating a cohesive two-tone black and champagne-gold look. External sales of Optimus are not expected until late 2027 at the earliest, with current Gen 3 units deployed exclusively within Tesla''s own factories.',
  'en', 'technology', 'robot',
  md5('tesla-fremont-conversion-gen3-reveal-imminent-2026-09-28'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus","Optimus Gen 3","Optimus Gen 2.5"],"technologies":["factory line conversion","industrial finish design"],"marketInsights":["Fremont 1M/yr capacity target","1K/week current, 2.5K/week EOY","15K units 2026 total","External sales late 2027"],"keyPoints":["Model S/X lines converting to Optimus","Gen 3 reveal expected Sept/Oct","App leak: matte black+gold design","No pre-orders yet announced"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-fremont-conversion-gen3-reveal-imminent-2026-09-28'));

-- [Agility] SPAC IPO 진행 상황
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics SPAC IPO Progressing: $2.5B Churchill Capital XI Merger, Foxconn-Led $200M PIPE',
  'TechCrunch / SEC Filings / GeekWire / Robotics & Automation News',
  'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
  '2026-09-25'::timestamp,
  'Agility Robotics is progressing toward public listing via a $2.5 billion SPAC merger with Churchill Capital Corp XI. The deal is expected to generate approximately $620 million in capital: $414M from SPAC trust + $200M PIPE led by Foxconn. SEC Form 425 filings continue through September 2026. Trading under ticker AGLT expected. Backed by $300M+ multi-year Digit 5 orders and $390M+ total prior investment from Amazon, DCVC, Playground Global.',
  'Agility Robotics is making progress toward its public listing through a $2.5 billion SPAC merger with Churchill Capital Corp XI, a special purpose acquisition company created by former Citi executive Michael Klein that went public in December 2025, raising $414 million. In addition to the SPAC trust capital, the deal includes a $200 million PIPE (Private Investment in Public Equity) round led by Taiwan-based tech giant Foxconn. The combined deal is expected to generate approximately $620 million in total capital for the company. SEC Form 425 filings have continued through September 2026, indicating the deal is progressing through regulatory review. Once completed, the combined company will trade on a major North American stock exchange under the ticker symbol AGLT. The IPO comes as Agility has secured more than $300 million in multi-year orders for its next-generation Digit 5 robot, which was unveiled on September 15, 2026 as the industry''s first cooperatively safe humanoid. Agility has previously raised more than $390 million from investors including Amazon, DCVC, and Playground Global. The company plans international expansion to the EU and UK in 2027. The SPAC route follows Unitree''s recent STAR Market IPO, though the market environment has shifted with Chinese regulators slowing humanoid IPO approvals.',
  'en', 'industry', 'robot',
  md5('agility-spac-ipo-churchill-xi-foxconn-pipe-2026-09-28'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital Corp XI","Foxconn","Amazon","DCVC"],"mentionedRobots":["Digit 5"],"technologies":[],"marketInsights":["$2.5B SPAC valuation","$620M total capital","$200M Foxconn PIPE","$300M+ Digit 5 orders"],"keyPoints":["Churchill Capital XI merger","SEC filings ongoing Sept 2026","Ticker AGLT planned","$390M+ prior investment"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-spac-ipo-churchill-xi-foxconn-pipe-2026-09-28'));

-- [Figure AI] BotQ 생산 24배 증가
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI BotQ Achieves 24x Production Throughput: 1 Robot Per Hour, 350+ Units Delivered, 12K/Year Capacity',
  'Figure AI / The Robot Report / Inspenet / FAQ.com',
  'https://www.figure.ai/news/botq',
  '2026-09-20'::timestamp,
  'Figure AI''s BotQ manufacturing facility achieved a 24-fold production throughput increase in under 120 days — from 1 robot per day to 1 per hour. Over 350 Figure 03 units delivered. Full-stack manufacturing with 150+ networked workstations. Annual capacity of 12,000 humanoid robots. Early actuator calibration and harness routing issues resolved. Figure 03 also appeared at a White House event.',
  'Figure AI''s BotQ high-volume manufacturing facility has achieved a significant production milestone, increasing throughput from one robot per day to one per hour — a 24-fold improvement accomplished in under 120 days. As of mid-2026, over 350 Figure 03 humanoid robots have been delivered from the facility. BotQ was purpose-built to own the full manufacturing stack: component sourcing, assembly, quality inspection, software flashing, and final testing all happen under one roof, with over 150 networked workstations tracking every unit through each production stage. The facility has an initial annual production capacity of 12,000 humanoid robots. Early in 2026, BotQ was producing roughly two to three units per week, with high reject rates at final inspection related to actuator calibration drift and harness routing failures. These issues have since been resolved as the facility scaled production. Figure 03 is designed as a production robot built for affordability and high-volume manufacturing, as opposed to the prototype-oriented Figure 02 which completed an 11-month deployment at BMW Spartanburg supporting 30,000+ X3 vehicle production. A Figure 03 also appeared at a White House event in 2026, demonstrating household work capabilities. The BotQ production ramp represents a critical achievement for the humanoid robotics industry, proving that manufacturing at scale is commercially viable.',
  'en', 'technology', 'robot',
  md5('figure-ai-botq-24x-throughput-350-units-12k-capacity-2026-09-28'),
  '{"mentionedCompanies":["Figure AI"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["full-stack manufacturing","networked workstation tracking","high-volume humanoid assembly"],"marketInsights":["24x throughput improvement in 120 days","350+ units delivered","12,000/year capacity","Early QC issues resolved"],"keyPoints":["1 per day to 1 per hour","150+ networked workstations","Full-stack mfg under one roof","White House demo appearance"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-botq-24x-throughput-350-units-12k-capacity-2026-09-28'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Agibot x Chimelong 300+ 로봇
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'Agibot x Chimelong 300+ 로봇 테마파크 배치 — 누적 20,000대 생산 돌파, 서비스 산업 확장',
   '9/24 Chimelong Spaceship Park 300+대 배치 1단계 발표. 엔터테인먼트·교육·호텔·서비스. 20,000번째 로봇 라인오프. China Mobile 5G-A 네트워크. 관광 산업 대규모 실증.',
   '{"company":"AGIBOT","event":"chimelong_300_robot_deployment","partner":"Chimelong Group","units":"300+","milestone":"20,000th robot","infrastructure":"China Mobile 5G-A","sectors":"entertainment, education, hotel, service","confidence":"A"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Chimelong%300%20,000%');

-- Unitree UnifoLM-X2 자율 전투
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'warning',
   'Unitree UnifoLM-X2-1.0 세계 최초 완전 자율 휴머노이드 전투 — 월드모델 기반 실시간 대응',
   '9/7 G1 2대 완전 자율 스파링 영상 공개. 인간 조종 없이 실시간 예측·대응·균형 유지. 월드-액션 모델 대규모 배치 가능성 주장. 논문·벤치마크 미공개.',
   '{"company":"Unitree","event":"autonomous_combat_demo","model":"UnifoLM-X2-1.0","robot":"G1","type":"world-action model","capability":"predictive perception-to-action","limitation":"no paper/benchmarks","confidence":"B"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%UnifoLM-X2%자율%전투%');

-- 중국 IPO 속도 조절
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   '중국 규제당국 휴머노이드 IPO 사실상 동결 — Unitree 변동성 계기, 6+사 대기',
   '9/20 비공식 창구 지도로 IPO 동결. Unitree 피크 대비 55% 급락. 밸류에이션·정부 매출 지속성 심사. Deep Robotics·Agibot 등 6+사 대기.',
   '{"event":"china_ipo_slowdown","trigger":"Unitree stock volatility","mechanism":"window guidance","status":"effectively frozen","pipeline":"6+ companies","affected":["Deep Robotics","X Square Robot","AGIBOT"],"concern":"govt-backed revenue sustainability","confidence":"B"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%중국%IPO%동결%Unitree%');

-- Tesla Fremont 전환
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Tesla Fremont Model S/X 라인 Optimus 전환 — 연 100만대 목표, Gen 3 공개 임박',
   'Fremont 구 S/X 라인 로봇 조립 전환 착수. 최종 100만대/년 목표. Gen 3 디자인·가격 미공개. 9월 말~10월 공개 예상.',
   '{"company":"Tesla","event":"fremont_line_conversion","facility":"Fremont (ex-Model S/X)","target":"1M units/year","gen3_status":"reveal expected late Sept/Oct","current_rate":"~1K/week","confidence":"B"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Fremont%Model S/X%Optimus 전환%');

-- Agility SPAC IPO
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   'Agility Robotics $2.5B SPAC 상장 진행 — Foxconn $200M PIPE, 티커 AGLT',
   'Churchill Capital XI와 $2.5B SPAC 합병. ~$620M 자금. Foxconn $200M PIPE. SEC 425 접수 진행. Digit 5 $300M+ 수주 기반.',
   '{"company":"Agility Robotics","event":"spac_ipo","spac":"Churchill Capital Corp XI","valuation":"$2.5B","capital":"~$620M","pipe":"$200M Foxconn-led","ticker":"AGLT","sec_filings":"ongoing Sept 2026","confidence":"A"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Agility%$2.5B%SPAC%Foxconn%');

-- Figure AI BotQ
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Figure AI BotQ 24배 생산 증가 — 시간당 1대, 350+대 출하, 연 12,000대 용량',
   'BotQ 120일 만에 24배 생산성 향상(일 1대→시간 1대). 350+대 Figure 03 출하. 연 12K대 용량. 풀스택 제조.',
   '{"company":"Figure AI","event":"botq_production_ramp","throughput":"1 per hour (24x improvement)","delivered":"350+","capacity":"12,000/year","timeline":"120 days","confidence":"A"}'::jsonb,
   false, '2026-09-28'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure AI%BotQ%24배%12,000%');


-- ============================================================
-- 4. ci_staging: 스테이징 (검증 대기)
-- ============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "chimelong_deployment", "new_value": "Chimelong Spaceship Park 300+ 로봇 대규모 배치(2026-09-24). 엔터테인먼트·교육·호텔·서비스. China Mobile 5G-A 전용 네트워크", "source": "PR Newswire / RoboticsTomorrow 2026-09-24", "reliability": "A"}, {"field": "cumulative_production", "new_value": "누적 20,000대 생산 돌파(2026-09-24). 6월 15,000대→9월 20,000대(3개월 5,000대 증산)", "source": "AGIBOT 공식 발표 2026-09-24", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Chimelong%300%20,000%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree", "updates": [{"field": "unifolm_x2", "new_value": "UnifoLM-X2-1.0 세계 최초 완전 자율 휴머노이드 전투 시연(2026-09-07). G1 2대 무인 스파링. 월드모델 기반 실시간 예측-행동", "source": "Interesting Engineering / Humanoids Daily 2026-09-07", "reliability": "B"}, {"field": "stock_correction", "new_value": "STAR Market 주가 피크(¥1,100) 대비 55% 급락. 중국 규제당국 휴머노이드 IPO 창구 지도 계기", "source": "Bloomberg / Reuters 2026-09-02/20", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%UnifoLM-X2%자율%전투%55%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "fremont_conversion", "new_value": "Fremont 공장 구 Model S/X 라인을 Optimus 조립 라인으로 전환 착수(2026 여름). 최종 연 100만대 생산 목표", "source": "Electrek 2026-04-22 / 분석가 9월 업데이트", "reliability": "B"}, {"field": "gen3_reveal", "new_value": "Gen 3 공식 디자인·가격·사전주문 미공개. 9월 말~10월 공장 시연 예상. 앱 유출 디자인: 매트블랙+샴페인골드", "source": "TheRoboticLife / NotATeslaApp 2026-09", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Fremont%Model S/X%100만대%Gen 3%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "spac_ipo", "new_value": "Churchill Capital Corp XI와 $2.5B SPAC 합병 추진(6/24 발표). ~$620M 자금(SPAC $414M + Foxconn $200M PIPE). SEC Form 425 9월 계속 접수. 티커 AGLT 예정", "source": "TechCrunch / SEC / GeekWire", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Churchill Capital%$2.5B%Foxconn%$200M%AGLT%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure-03", "updates": [{"field": "botq_throughput", "new_value": "BotQ 120일 만에 24배 생산성(일 1대→시간 1대). 350+대 Figure 03 출하. 연 12,000대 용량. 150+ 워크스테이션 풀스택", "source": "Figure AI / The Robot Report 2026", "reliability": "A"}, {"field": "white_house", "new_value": "Figure 03 White House 방문 시연 — 가정용 작업 역량 데모(2026)", "source": "Figure AI News 2026", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%BotQ%24배%350%12,000%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "industry", "updates": [{"field": "china_ipo_slowdown", "new_value": "중국 규제당국 휴머노이드 IPO 비공식 동결(2026-09-20). Unitree 주가 변동성 계기. 6+사 대기(Deep Robotics, X Square, AGIBOT 등). 정부 프로젝트 매출 지속성 심사", "source": "Reuters / BusinessWorld / Technology.org 2026-09-20", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%중국%IPO%비공식 동결%Deep Robotics%' AND created_at::date = CURRENT_DATE);

COMMIT;
