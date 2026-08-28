-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-28
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-08-28.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Unitree 688836.SH IPO 후 2주차 조정 — RMB 615 안착, 시총 재평가 진행
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Investing.com / Bloomberg / Yahoo Finance',
   'https://www.investing.com/equities/yushu-tech-co',
   '[Warning] Unitree 688836.SH IPO 2주차: RMB 615(8/27) — Day1 대비 -27%, IPO가 대비 +308%',
   '8/27 종가 RMB 615.03(전일 591.53 대비 +4%). IPO 첫날 종가 845 대비 -27% 조정. 52주 레인지 571-1,100. IPO가 150.80 대비 여전히 +308%. 시총 약 ¥250B($35B). 개인투자자 열기 냉각 중이나 기관 보유 안정적. DeepSeek 전략적 투자자. STAR Market 대표 휴머노이드 종목으로 글로벌 밸류에이션 벤치마크 역할.',
   '2026-08-28'::timestamp, 'pending'),

-- 2. [Warning] Agibot G2: Longcheer 공장 6일 라이브스트림 — 3,000태블릿/시프트, 64시간 연속
  (gen_random_uuid(), 'Interesting Engineering / Xinhua / Forbes / VnExpress',
   'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
   '[Warning] Agibot G2: Longcheer 태블릿 공장 라이브스트림 — 3,000대/시프트, 64시간 연속, 다운타임 <4%',
   'Longcheer Technology 난창 공장: G2 휴머노이드 로봇 태블릿 품질검사 라인 배치. 36시간 내 라인 통합 완료. 3,000태블릿/시프트 처리, 64시간+ 연속 운용, 다운타임 4% 미만. 첫 3시간 800대 무오류. 6일간 24시간 라이브스트림 공개. Q3까지 100대 스케일 목표. 자동차·반도체·에너지 섹터 확장 계획. 서구 경쟁사 대비 실공장 투입 속도·규모에서 압도적 격차.',
   '2026-08-28'::timestamp, 'pending'),

-- 3. [Info] Google DeepMind Gemini Robotics 2 출시 — Apptronik Apollo 2 전신 자율 제어 실증
  (gen_random_uuid(), 'Robotics & Automation News / Google DeepMind',
   'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
   '[Info] Google DeepMind Gemini Robotics 2: Apptronik Apollo 2 전신 자율 보행·조작·추론 실증',
   '7/31 발표: Gemini Robotics 2 — whole-body intelligence AI 모델 스위트. Apptronik Apollo 2에서 실증: 자율 보행·쪼그려앉기·구부리기·물체 조작 + 실시간 복합작업 추론. Robot Park(Austin) 다수 거점에서 데이터 수집 → 파운데이션 모델 학습. Apollo 2: 이족·바퀴형 듀얼 베이스. Apollo 3(첫 상용 제품) 2027 출시 확정. $520M 시리즈A, $5B 밸류에이션. Google·Mercedes·John Deere·QIA 투자.',
   '2026-08-28'::timestamp, 'pending'),

-- 4. [Info] Tesla Optimus: Fremont Model S/X 라인 퇴역 → 1M/년 Optimus 라인 전환 진행
  (gen_random_uuid(), 'Electrek / Teslarati / RoboZaps / Tesery',
   'https://blog.robozaps.com/b/tesla-optimus-gen-3',
   '[Info] Tesla Optimus: Fremont S/X 라인 5월 퇴역 → 1M/년 Gen3 전환 중, 내부 1,000-1,200대 추정',
   '8/28 기준: 프리몬트 Model S/X 라인 5월 초 공식 퇴역, Optimus Gen 3 전용 라인 전환 진행 중. 1세대 라인 연 100만대 생산 용량 목표. Axis Intelligence 추정: 내부 배치 1,000-1,200대(프리몬트+기가텍사스). 실제 Gen 3 생산 미개시 — Musk "quite slow at first, literally impossible to predict" 발언. 10,000개 고유 부품 포함 전혀 새로운 생산라인. V3 공개 재차 "later this year"로 연기. 소비자 판매 2027 말 $20-30K 유지.',
   '2026-08-28'::timestamp, 'pending'),

-- 5. [Info] Figure AI: BotQ 1,000번째 Figure 03 생산(7/23) — 시간당 1대 생산율 달성
  (gen_random_uuid(), 'Figure AI / Forge Global / TechDG',
   'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
   '[Info] Figure AI: BotQ 1,000번째 Figure 03 생산(7/23) — 시간당 1대, $39B 밸류에이션',
   'BotQ 공장 7/23 마일스톤: 1,000번째 Figure 03 생산. 현재 시간당 1대 생산율. Figure 03 스펙: 5ft8/61kg, 20kg 페이로드, 1.2m/s 보행, 5시간 2.3kWh 배터리(스왑형). Helix 자체 AI 모델. BMW Spartanburg 40대 배치(Figure 02→03 전환 완료). BMW Leipzig 유럽 파일럿 진행. $39B 밸류에이션 — 비상장 휴머노이드 기업 최고. $2.34B 총 조달. 서구 기업 중 생산 규모 1위(Agibot 15,000대 vs Figure 1,000대).',
   '2026-08-28'::timestamp, 'pending'),

-- 6. [Info] Agility Robotics: Digit v5 "케이지 밖 최초 로봇" — Forbes 조명, 20시간 가동
  (gen_random_uuid(), 'Forbes / Agility Robotics',
   'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
   '[Info] Agility Digit v5: "케이지 밖 최초 휴머노이드" — 20시간 가동, 12월 출시 확정',
   'Forbes 8/10 보도: Digit v5를 "최초의 케이지 밖 휴머노이드"로 조명. CBO Daniel Diez: 안전 펜싱 없이 인간과 협업 가능. 주요 스펙: 50lb 페이로드, 20시간/일 운영, 표준화된 자동교환 엔드이펙터. GXO 100,000+ 토트 처리, 9개 시설 65,000+ 운영시간. SPAC $2.5B 합병 진행 중(AGLT), $300M 수주. 12월 상용 출시 확정. "dull, dirty, dangerous" 벌크 핸들링 타깃.',
   '2026-08-28'::timestamp, 'pending'),

-- 7. [Info] 1X NEO: 생산 상태 업데이트 — Hayward 풀 프로덕션 가동, 실배송 미확인 지속
  (gen_random_uuid(), 'Forbes / TechCrunch / eWeek / TFN',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '[Info] 1X NEO: Hayward 풀 프로덕션 가동 중 — 10K 첫해분 매진, 실고객 배송 여전히 미확인',
   '8/28 기준 상태: Hayward 공장(58K sqft) 풀스케일 생산 가동 확인. 연 10K 용량. 첫해분 5일 만에 프리오더 매진. $20K 구매/$499·월 렌탈. NEO Gamma: 5ft7/66lb, 바이페달, 5지 손, 22dB 저소음. 자체 고토크 밀도 텐던 모터 개발·생산. 그러나 7월 중순 기준 실배송 건수·고객 사례 구체 확인 안 됨 — 여전히 "future tense" 표현. EQT 10K대 B2B 계약. San Carlos 2공장 건설(2027 100K 목표).',
   '2026-08-28'::timestamp, 'pending'),

-- 8. [Info] BD Atlas 5세대: "Order of Magnitude" 단순화 — 부품 감소·비용 절감·신뢰성 향상
  (gen_random_uuid(), 'Forbes / Boston Dynamics',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   '[Info] BD Atlas 5세대: 복잡도 "거의 한 자릿수" 감소 — 부품↓·비용↓·신뢰성↑, 30K/년 양산 준비',
   '7/2 Forbes 보도: Atlas 5세대, 이전 대비 복잡도 "almost order of magnitude" 감소. 부품 수 대폭 줄여 제조 속도·신뢰성·비용 모두 개선. Hyundai 양산 역량 활용 연 30,000대 생산 계획. 보스턴 본사 생산 즉시 개시. Hyundai SoftBank 잔여 지분 인수 완료 — BD 완전 자회사화. Atlas FIFA 월드컵 매치볼 전달(7월). 2028년 자동차 공장 본격 투입 목표.',
   '2026-08-28'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] IPO 2주차 주가 안정화
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree 688836.SH Week 2 Trading: RMB 615, Post-IPO Correction Stabilizing',
  'Investing.com / Bloomberg / Yahoo Finance',
  'https://www.investing.com/equities/yushu-tech-co',
  '2026-08-28'::timestamp,
  'Unitree Robotics (688836.SH) closed at RMB 615.03 on August 27, up 4% on the day but down 27% from Day 1 close of 845. Stock stabilizing in second week of trading with 52-week range of 571-1,100. Still +308% above IPO price of 150.80. Market cap approximately ¥250B (~$35B). DeepSeek among strategic investors. Post-IPO correction appears to be finding equilibrium as institutional holders maintain positions.',
  'Unitree Robotics 688836.SH post-IPO trading update (August 28 analysis). Week 2 trading data: August 27 close RMB 615.03 (previous close 591.53, +4.0% on day). Day range: 582.00 - 615.05. IPO Day 1 (Aug 19): opened from IPO price ¥150.80, intraday peak ¥1,100 (+629%), closed ¥845 (+460%). Market cap on close: ¥342B. Week 2 trajectory: ¥845 → ¥672 (Aug 22) → ¥591 (Aug 26) → ¥615 (Aug 27). Down 27% from Day 1 close but still +308% above IPO price. 52-week low ¥571 suggests strong support near current levels. IPO metrics: ¥6.1B ($904M) raised. Retail subscription 5,526x (some sources say 8,000x) oversubscribed. First humanoid robot A-share listing on STAR Market. Strategic investors include DeepSeek. Market positioning: STAR Market flagship humanoid stock, serving as global humanoid valuation benchmark. Unitree product lineup: G1 ($17,990-$73,900), H2 ($29,900), B2 quadruped. H1 legacy/delisted. R1 new entry.',
  'en', 'business', 'robot',
  md5('unitree-688836-week2-trading-stabilize-2026-08-28'),
  '{"mentionedCompanies":["Unitree","DeepSeek"],"mentionedRobots":["G1","H2","B2"],"technologies":[],"marketInsights":["RMB 615 Aug 27 close","+308% above IPO price","-27% from Day 1 close","¥250B market cap"],"keyPoints":["Week 2 post-IPO stabilization","52-week low 571 near support","DeepSeek strategic investor","STAR Market humanoid benchmark"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-688836-week2-trading-stabilize-2026-08-28'));

-- [Agibot] G2 Longcheer 공장 라이브스트림
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'AGIBOT G2 Longcheer Factory Livestream: 3,000 Tablets/Shift, 64hr Continuous Operation',
  'Interesting Engineering / Xinhua / Forbes / VnExpress',
  'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
  '2026-08-28'::timestamp,
  'AGIBOT deployed G2 wheeled humanoid robots at Longcheer Technology''s Nanchang tablet manufacturing facility for quality inspection. Production line integrated in 36 hours. Achieved 3,000 tablets/shift throughput, 64+ hours continuous operation, <4% downtime. First 3 hours: 800 tablets with zero errors. Six-day 24/7 livestream broadcast to public. Scaling target: 100 robots by Q3 2026. Expansion into automotive, semiconductor, and energy sectors planned.',
  'AGIBOT G2 factory deployment at Longcheer Technology, Nanchang, China — world''s first publicly livestreamed humanoid robot production line. Details: G2 wheeled humanoid robots performing tablet quality inspection and material handling. Integration speed: production line integrated within 36 hours of robot delivery — remarkably fast for factory automation. Performance metrics: 3,000 tablets processed per shift. 64+ hours of continuous operation logged. Downtime rate: below 4 percent. First 3 hours: 800 tablets processed with zero errors. Livestream format: 6-day, 24-hour continuous public broadcast — transparency play to demonstrate real-world capability versus lab demos. Fleet composition: multiple G2 robots working alongside human workers on the line. Scale plans: target 100 robots deployed by Q3 2026. Sector expansion: automotive, semiconductors, and energy industries targeted. Previous deployment data: AGIBOT has shipped 15,000 cumulative robots. Revenue trajectory: RMB 300K (year 1) → RMB 60M (year 2) → RMB 1B+ (2025). Significance: demonstrates Chinese humanoid companies'' lead in actual factory deployment speed and scale versus Western competitors focused on pilot programs.',
  'en', 'technology', 'robot',
  md5('agibot-g2-longcheer-livestream-3000-tablets-2026-08-28'),
  '{"mentionedCompanies":["AGIBOT","Longcheer Technology"],"mentionedRobots":["G2"],"technologies":["autonomous inspection","embodied AI"],"marketInsights":["3,000 tablets/shift","64hr continuous operation","<4% downtime","100 robots by Q3"],"keyPoints":["Longcheer Nanchang factory","36hr line integration","6-day public livestream","zero errors first 3 hours"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-g2-longcheer-livestream-3000-tablets-2026-08-28'));

-- [Apptronik] Google DeepMind Gemini Robotics 2 + Apollo 2
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Google DeepMind Launches Gemini Robotics 2: Whole-Body AI Demonstrated on Apptronik Apollo 2',
  'Robotics & Automation News / Google DeepMind',
  'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
  '2026-07-31'::timestamp,
  'Google DeepMind launched Gemini Robotics 2, a suite of AI models for whole-body intelligence in humanoid robots. Demonstrated on Apptronik Apollo 2: autonomous walking, crouching, bending, and object manipulation with real-time complex task reasoning. Apollo 2 available in bipedal and wheeled configurations. Robot Park (Austin, TX) serves as flagship data collection facility feeding Gemini foundation models. Apollo 3 confirmed as first commercial product for 2027. Apptronik valued at $5B after $520M Series A.',
  'Google DeepMind Gemini Robotics 2 launch (July 31, 2026): New suite of AI models designed for whole-body intelligence in humanoid and other robots. Key capabilities: greater autonomy through whole-body control, advanced dexterity, multi-robot collaboration. Demonstrated on Apptronik Apollo 2: full-body autonomous movements including walking, crouching, bending, and manipulating objects while reasoning through complex tasks in real time. Partnership structure: Apptronik''s Robot Park (Austin, TX) — flagship data collection and training facility opened June 30. Multiple Robot Park locations collecting real-world data from Apollo 2 fleets. High-quality deployment data feeds Google DeepMind''s Gemini Robotics foundation models. Apollo 2 specifications: available in both bipedal and wheeled-base configurations. Designed as training and data platform. Apollo 3: confirmed as first true commercial product, targeting 2027 launch. Funding: $520M Series A (Feb 2026), $5B valuation. Investors: Google, Mercedes-Benz, B Capital, AT&T Ventures, John Deere, Qatar Investment Authority. Deployments: Mercedes-Benz and GXO Logistics active testing. Significance: represents deepening integration between foundation AI models and physical robot hardware. Google DeepMind positioning as the "Android of robotics" through partnerships.',
  'en', 'technology', 'robot',
  md5('gemini-robotics-2-apptronik-apollo2-whole-body-2026-08-28'),
  '{"mentionedCompanies":["Google DeepMind","Apptronik","Mercedes-Benz","GXO","John Deere","QIA"],"mentionedRobots":["Apollo 2","Apollo 3"],"technologies":["Gemini Robotics 2","whole-body intelligence","multi-robot collaboration"],"marketInsights":["$5B valuation","$520M Series A","Robot Park data collection","Apollo 3 commercial 2027"],"keyPoints":["Gemini Robotics 2 whole-body AI","Apollo 2 real-time autonomous control","Robot Park flagship facility","Google Android-of-robotics positioning"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('gemini-robotics-2-apptronik-apollo2-whole-body-2026-08-28'));

-- [Tesla] Optimus Fremont 라인 전환
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus: Fremont Model S/X Line Retired, 1M/Year Gen 3 Line Conversion Underway',
  'Electrek / Teslarati / RoboZaps / Tesery',
  'https://blog.robozaps.com/b/tesla-optimus-gen-3',
  '2026-08-28'::timestamp,
  'Tesla retired Model S/X production at Fremont in early May 2026 and is converting the line to Optimus Gen 3 manufacturing. First-generation line targets 1 million units/year capacity. Axis Intelligence estimates 1,000-1,200 Optimus units internally deployed at Fremont and Giga Texas as of mid-2026. Actual Gen 3 production has not started — Musk states ramp will be "quite slow at first." V3 reveal delayed again to "later this year." Consumer sales targeted end of 2027 at $20-30K. Aspirational 4M units/year by end of 2027.',
  'Tesla Optimus production status update (August 28, 2026). Fremont facility: Model S and Model X production officially retired in early May 2026. The production line is being physically converted to Optimus Gen 3 manufacturing. Capacity target: first-generation Optimus production line designed for approximately 1 million units per year. Current deployment: Axis Intelligence Research estimates 1,000 to 1,200 Optimus units at Fremont and Giga Texas as of mid-2026. These are performing battery handling and cable work tasks internally. Production status: as of August 28, no actual Gen 3 production has started. Musk at Q2 earnings (August 5): production "starting soon," but no concrete date given. July 22 shareholder letter: "anticipated later this year." Manufacturing complexity: Optimus has 10,000 unique parts across an entirely new production line — Musk called output "literally impossible to predict." Early production: first Fremont builds will go to "Optimus Academy" — internal training program where robots learn simple factory skills. V3 (Gen 3) reveal: repeatedly delayed, now "later this year." Roadmap: 1M/year at Fremont (near-term), 4M/year aspirational by end 2027, 10M/year at Giga Texas (long-term). Consumer availability: end of 2027 at earliest, $20-30K price target. No public sales, deposits, or waitlists opened.',
  'en', 'product', 'robot',
  md5('tesla-optimus-fremont-conversion-1m-year-2026-08-28'),
  '{"mentionedCompanies":["Tesla","Axis Intelligence"],"mentionedRobots":["Optimus","Optimus Gen 3"],"technologies":["Optimus Academy"],"marketInsights":["1M/year capacity target","1,000-1,200 internal units","no production started","$20-30K consumer price 2027"],"keyPoints":["Model S/X line retired May","10,000 unique parts","V3 reveal delayed again","4M/year aspirational 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-fremont-conversion-1m-year-2026-08-28'));

-- [Figure AI] BotQ 1,000번째 Figure 03
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Produces 1,000th Figure 03 at BotQ Factory — 1 Robot/Hour Rate, $39B Valuation',
  'Forge Global / Figure AI / TechDG',
  'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
  '2026-07-23'::timestamp,
  'Figure AI manufactured its 1,000th Figure 03 humanoid robot at the BotQ factory on July 23, 2026, achieving a production rate of approximately 1 robot per hour. Figure 03 specs: 5ft8/61kg, 20kg payload, 1.2 m/s walking speed, 5-hour swappable 2.3kWh battery. Powered by Helix in-house AI model. BMW Spartanburg: 40 Figure 03 units deployed (02→03 transition complete). BMW Leipzig European pilot ongoing. Company valuation: $39B (highest of any humanoid robotics company, public or private). Total raised: $2.34B.',
  'Figure AI production milestone report. BotQ factory (Sunnyvale, CA): 1,000th Figure 03 produced on July 23, 2026. Current production rate: approximately 1 robot per hour. Figure 03 specifications: height 5 feet 8 inches, weight 61kg, payload 20kg, walking speed 1.2 m/s. Battery: 5-hour runtime, 2.3kWh capacity, hot-swappable. AI: Helix in-house reasoning model. Deployment status: BMW Group Plant Spartanburg (USA) — 40 Figure 03 units actively deployed for logistics sequencing. Previous Figure 02 results at Spartanburg: 10-month pilot, 30,000+ BMW X3 production contribution, 204,000+ packages sorted, 1,250+ runtime hours, >99% placement accuracy, 84-second cycle times. BMW Group Plant Leipzig (Germany) — European pilot deployment for high-voltage battery assembly and component manufacturing, summer 2026 full pilot phase. Company financials: $39 billion valuation — the highest of any humanoid robotics company globally (public or private). Total capital raised: $2.34 billion. Production comparison: Figure 1,000 units vs. AGIBOT 15,000 units vs. Agility ~75 units. Figure remains the Western leader in humanoid production volume. Key partners: BMW, Microsoft, NVIDIA, OpenAI (early investor, partnership ended).',
  'en', 'product', 'robot',
  md5('figure-ai-1000th-figure03-botq-production-2026-08-28'),
  '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix AI"],"marketInsights":["1,000 units produced","1 robot/hour rate","$39B valuation","$2.34B total raised"],"keyPoints":["1,000th Figure 03 on Jul 23","BotQ 1/hour production","highest humanoid valuation globally","Western production leader"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-ai-1000th-figure03-botq-production-2026-08-28'));

-- [Agility] Digit v5 "Out of the Cage"
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Digit v5: Forbes Calls It "First Humanoid Robot Out of the Cage" — December 2026 Launch',
  'Forbes / Agility Robotics',
  'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
  '2026-08-10'::timestamp,
  'Forbes profiles Digit v5 as the "first humanoid robot out of the cage" — able to work cooperatively alongside humans without traditional safety fencing. CBO Daniel Diez confirms December 2026 commercial launch. Key specs: 50lb payload, 20-hour operational days, standardized self-swapping end-effectors. Current deployment: 100,000+ totes handled at GXO, 65,000+ hours across 9 facilities. SPAC merger $2.5B (AGLT on Nasdaq) with $300M booked revenue. Targeting "dull, dirty, dangerous" bulk material handling jobs.',
  'Agility Robotics Digit v5 profile (Forbes, August 10, 2026). Headline positioning: "First Humanoid Robot Out of the Cage" — highlighting cooperative safety as key differentiator. CBO Daniel Diez interview: Digit v5 designed to work safely and cooperatively alongside humans without traditional safety fencing or caging. This addresses the single biggest barrier to humanoid robot adoption in existing facilities. Commercial launch: December 2026, confirmed on track. Key specifications: 50-pound payload capacity. 20-hour operational days. Standardized, eventually self-swapping, end-effectors for task flexibility. NVIDIA Halos safety system integration (IEC 61508, ISO 13849 certification pursuit). Current fleet performance: 100,000+ totes handled at GXO Logistics. 65,000+ cumulative operational hours. 9 committed customer facilities: GXO, Toyota Motor Manufacturing Canada, Schaeffler, Mercado Libre, Amazon (investor and customer). Market positioning: targeting "dull, dirty, dangerous" bulk material handling jobs in warehouses and factories — addressing acute labor gaps. Business model: RaaS (Robot-as-a-Service) contracts. Financial status: SPAC merger with Churchill Capital Corp XI. $2.5B enterprise value. Nasdaq ticker AGLT. $620M+ gross proceeds. Foxconn-led $200M PIPE. $300M+ in booked multi-year revenue.',
  'en', 'product', 'robot',
  md5('agility-digit-v5-out-of-cage-forbes-dec2026-2026-08-28'),
  '{"mentionedCompanies":["Agility Robotics","GXO","Toyota","Schaeffler","Mercado Libre","Amazon","NVIDIA"],"mentionedRobots":["Digit v5"],"technologies":["NVIDIA Halos","cooperative safety"],"marketInsights":["100K+ totes at GXO","9 customer facilities","$300M booked revenue","December 2026 launch"],"keyPoints":["first robot out of cage","cooperative safety no fencing","50lb payload 20hr operation","SPAC $2.5B AGLT"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit-v5-out-of-cage-forbes-dec2026-2026-08-28'));

-- [BD Atlas] 5세대 단순화 + Hyundai 완전 자회사화
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Boston Dynamics Atlas 5th Gen: "Order of Magnitude" Simpler Design, Hyundai Full Ownership',
  'Forbes / Boston Dynamics / Engadget',
  'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
  '2026-07-02'::timestamp,
  'Boston Dynamics unveiled 5th-generation Atlas with complexity reduced by "almost an order of magnitude" — fewer parts, faster manufacturing, better reliability, lower cost. Hyundai completed buyout of SoftBank''s remaining stake, making BD a full subsidiary. Atlas delivered FIFA World Cup match ball in July. 2026 production fully committed to Hyundai RMAC and Google DeepMind. Factory capacity: 30,000 units/year. 2028 target for full auto plant deployment.',
  'Boston Dynamics Atlas 5th Generation update (consolidated August 28 analysis). Design philosophy shift: new Atlas features "almost an order of magnitude" reduction in complexity versus previous generations. Implications: significantly fewer parts leading to faster manufacturing, enhanced reliability, and substantially lower costs. This addresses the key criticism that Atlas was too complex for mass production. Production infrastructure: Hyundai Motor Group leveraging its vast manufacturing expertise. Target: 30,000 Atlas units per year from Boston headquarters facility. 2026 production status: fully committed/sold out. Initial deployments: Hyundai Robotics Metaplant Application Center (RMAC) in Savannah, Georgia. Google DeepMind (research and development partnership). Corporate changes: Hyundai completed acquisition of SoftBank''s remaining Boston Dynamics stake — BD is now a wholly-owned Hyundai subsidiary. This removes any governance friction and aligns BD fully with HMG manufacturing strategy. Recent milestones: Atlas delivered FIFA World Cup match ball (July 2026). CES 2026 "Best Robot" award. Atlas specs: 7.5-foot reach, 50kg (110lb) lift capacity, -20°C to 40°C operating range. Deployment timeline: initial deployment at Hyundai RMAC for parts sequencing. 2028 full deployment in Hyundai/Kia car assembly plants. Key challenge: Korean union opposition blocking factory deployment — demanding labor agreements before robots enter plants.',
  'en', 'product', 'robot',
  md5('bd-atlas-5thgen-simpler-hyundai-full-owner-2026-08-28'),
  '{"mentionedCompanies":["Boston Dynamics","Hyundai","Google DeepMind","SoftBank"],"mentionedRobots":["Atlas"],"technologies":["simplified manufacturing"],"marketInsights":["order of magnitude simpler","30,000/year capacity","2026 fully committed","Hyundai full ownership"],"keyPoints":["5th gen complexity reduction","SoftBank stake buyout complete","FIFA World Cup ball delivery","union opposition barrier"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bd-atlas-5thgen-simpler-hyundai-full-owner-2026-08-28'));

-- [1X] NEO 생산 상태 업데이트
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  '1X NEO Production Status: Hayward Factory Running, 10K Units Sold Out, Deliveries Unverified',
  'Forbes / TechCrunch / eWeek / TechFundingNews',
  'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
  '2026-08-28'::timestamp,
  '1X Technologies'' Hayward factory (58K sqft) in full-scale production for NEO humanoid robots. Annual capacity: 10,000 units. First-year batch sold out within 5 days of preorder opening. Pricing: $20K purchase or $499/month rental. NEO Gamma: 5ft7/66lb, bipedal, 5-finger hands, 22dB quiet operation. Proprietary high-torque tendon motors manufactured in-house. EQT 10K B2B contract maintained. San Carlos second factory under construction for 2027 expansion to 100K/year. Critical gap: as of mid-July 2026, no verified customer deliveries reported — 1X materials still describe shipments in future tense.',
  '1X Technologies NEO production and delivery status (August 28 consolidated update). Manufacturing: Hayward, California factory (58,000 sq ft / 5,388 m²) in full-scale production. Annual capacity: 10,000 units. First-year batch: sold out within 5 days of preorder opening — strong demand signal. Pricing model: $20,000 early-adopter purchase price. $499/month rental option. Revenue model: direct-to-consumer and B2B. NEO Gamma specifications: height 5 feet 7 inches (170cm), weight 66 lbs (30kg). Bipedal locomotion. 5-finger dexterous hands. Soft-knit exterior. Operating noise ~22 dB (refrigerator-level). Three color options: Tan, Gray, Dark Brown. Manufacturing approach: proprietary in-house components — self-developed high-torque density tendon-controlled robot actuators. Less reliance on global supply chains. Key contracts: EQT 10,000-unit B2B agreement maintained. Expansion: San Carlos second factory under construction for 2027 goal of 100,000 units/year. Delivery verification gap: as of mid-July 2026, no independent verification of actual customer deliveries has been found. 1X marketing materials still describe first customer shipments in future tense. This represents a credibility question for the "2026 delivery" timeline. Company background: Norwegian-founded, OpenAI early backer. $125M Series B (Jan 2024).',
  'en', 'product', 'robot',
  md5('1x-neo-production-delivery-status-aug-2026-08-28'),
  '{"mentionedCompanies":["1X Technologies","EQT","OpenAI"],"mentionedRobots":["NEO","NEO Gamma"],"technologies":["tendon-controlled actuators"],"marketInsights":["10K first year sold out in 5 days","$20K price","no verified deliveries yet","100K/year 2027 target"],"keyPoints":["Hayward full production","EQT 10K B2B","delivery verification gap","San Carlos 2nd factory"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('1x-neo-production-delivery-status-aug-2026-08-28'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Agibot G2 공장 라이브스트림
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Agibot%') LIMIT 1),
  'mass_production', 'warning',
  '[Agibot] G2 Longcheer 공장 라이브스트림: 3,000태블릿/시프트, 64시간 연속, 다운타임 <4%',
  'Longcheer 난창 공장 G2 태블릿 검사 라인. 36시간 내 통합, 3,000대/시프트, 64시간+ 연속, 다운타임 <4%. 6일 24시간 공개 방송. Q3 100대 스케일. 서구 경쟁사 대비 실공장 배치 속도·규모 압도적.',
  '{"source":"Interesting Engineering/Xinhua/Forbes","confidence":"A","date":"2026-08-28","factory":"Longcheer Nanchang","throughput":"3,000 tablets/shift","continuousOperation":"64+ hours","downtime":"<4%","integration":"36 hours","scaleTarget":"100 robots Q3","livestreamDuration":"6 days 24/7"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%G2 Longcheer 공장 라이브스트림%');

-- Alert 2: Google DeepMind Gemini Robotics 2 + Apptronik
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'warning',
  '[Apptronik/DeepMind] Gemini Robotics 2: Apollo 2 전신 자율 AI — 파운데이션 모델 경쟁 신호탄',
  'Google DeepMind Gemini Robotics 2(7/31) — Apptronik Apollo 2에서 전신 자율 보행·조작·추론. Robot Park 실데이터 → 파운데이션 모델 학습. Google "로보틱스의 안드로이드" 포지셔닝. Apollo 3 상용화 2027. $5B 밸류에이션.',
  '{"source":"Robotics & Automation News/Google DeepMind","confidence":"A","date":"2026-08-28","model":"Gemini Robotics 2","capabilities":"whole-body walking/crouching/manipulation/reasoning","partner":"Apptronik Apollo 2","facility":"Robot Park Austin","apollo3":"commercial 2027","valuation":"$5B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Gemini Robotics 2%Apollo 2 전신 자율%');

-- Alert 3: Figure AI 1,000번째 Figure 03
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' LIMIT 1),
  'mass_production', 'info',
  '[Figure AI] BotQ 1,000번째 Figure 03(7/23) — 시간당 1대 생산, $39B 밸류에이션',
  'BotQ 공장 7/23 마일스톤: 1,000번째 Figure 03. 시간당 1대 생산율. BMW Spartanburg 40대·Leipzig 파일럿. $39B 밸류에이션(비상장 최고). 서구 생산 규모 1위이나 Agibot 15,000대 대비 1/15.',
  '{"source":"Forge Global/Figure AI","confidence":"B","date":"2026-08-28","milestone":"1,000th Figure 03","productionRate":"1/hour","date":"Jul 23","bmwSpartanburg":40,"valuation":"$39B","totalRaised":"$2.34B","comparisonAgibot":"15,000 units"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%1,000번째 Figure 03%');

-- Alert 4: Unitree IPO 2주차 주가 안정화
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Unitree%') LIMIT 1),
  'funding', 'info',
  '[Unitree] 688836.SH IPO 2주차: RMB 615 안착 — Day1 대비 -27%, IPO가 +308%',
  '8/27 종가 RMB 615. IPO 첫날 845 대비 -27% 조정이나 IPO가 150.80 대비 +308%. 52주 최저 571 부근 지지. 시총 ~¥250B($35B). 기관 안정적 보유. STAR Market 대표 휴머노이드 종목.',
  '{"source":"Investing.com/Bloomberg","confidence":"A","date":"2026-08-28","price":"RMB 615.03","change":"+4% daily","-27% from day1":"true","+308% from IPO":"true","52wkLow":571,"52wkHigh":1100,"marketCap":"~¥250B/$35B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%688836.SH IPO 2주차%');

-- Alert 5: BD Atlas 5세대 단순화
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Atlas%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Boston%') LIMIT 1),
  'mass_production', 'info',
  '[BD] Atlas 5세대: 복잡도 "한 자릿수" 감소 — Hyundai 완전 자회사화, 30K/년 양산 준비',
  'Atlas 5세대 복잡도 거의 10배 감소(부품↓·비용↓·신뢰성↑). Hyundai SoftBank 잔여지분 인수 완료 → BD 완전 자회사. 30,000대/년 생산 목표. 2026 전량 예약 완료. FIFA 월드컵 매치볼 전달.',
  '{"source":"Forbes/Boston Dynamics","confidence":"A","date":"2026-08-28","complexity":"~10x reduction","hyundaiOwnership":"100% after SoftBank buyout","annualCapacity":"30,000","2026status":"fully committed","milestone":"FIFA World Cup ball","2028target":"car plant deployment"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Atlas 5세대%복잡도%한 자릿수%');

COMMIT;
