-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-18
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요: psql $DATABASE_URL -f scripts/ci-update-2026-08-18.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical/Regulatory] FCC Covered List: 외국산 휴머노이드/4족보행 로봇 미국 시장 진입 차단
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'K&L Gates / Sidley Austin / FCC / Fox Business',
   'https://www.klgates.com/thought-leadership/FCC-Adds-Foreign-Produced-Advanced-Robotic-Devices-to-the-Covered-List-Five-Things-to-Know-8-3-2026',
   '[Critical/Regulatory] FCC Covered List에 외국산 휴머노이드·4족보행 로봇 추가 — 미국 시장 사실상 차단',
   '7/28 FCC Public Notice DA 26-786: 외국산 휴머노이드, 4족보행, AMR 등 신규 모델에 대해 FCC 장비인증(EA) 차단. 미국 내 수입·판매·마케팅 불가. DoW(국방부) Conditional Approval만 허용. 보안 근거: Unitree UniPwn 취약점(2025.9), 원격 카메라·마이크·지도 접근 사고(2026 초), 외국산 4족로봇 백도어(2025.4). Unitree G1/H2, Agibot 미국 시장 진입 직접 차단. 기존 승인 제품은 영향 없음.',
   '2026-08-18'::timestamp, 'pending'),

-- 2. [Info] Google DeepMind Gemini Robotics 2: 전신 VLA 3종 모델 Early Access 출시
  (gen_random_uuid(), 'Google DeepMind Blog / SiliconANGLE / Automate.org',
   'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
   'Google DeepMind Gemini Robotics 2 출시: 전신 VLA + ER 2 + On-Device 2 — Early Access',
   '7/30 발표, 8/8 공식 출시. 3종 모델: (1) Gemini Robotics 2 — 전신 VLA(Vision-Language-Action), 발끝~손끝 통합 제어, 멀티로봇 협업, (2) Gemini Robotics ER 2 — 실환경 비디오 이해·멀티스텝 플래닝, (3) On-Device 2 — 로컬 실행·적응형. ASIMOV-Agentic 벤치마크 도입(위험 명령 거부·안전 거리 판단). BD Atlas + Apptronik Apollo 통합 확인. 로보틱스 파운데이션 모델 경쟁 Google vs xAI(Grok) vs Figure(Helix) 구도 형성.',
   '2026-08-18'::timestamp, 'pending'),

-- 3. [Info] Agibot WAIC 2026: A3 Ultra·X2 Edu·G2 Max·OmniHand 3 Ultra-M 신제품 4종 공개
  (gen_random_uuid(), 'PR Newswire / Interesting Engineering / Gasgoo',
   'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
   'Agibot WAIC 2026: A3 Ultra(NVIDIA Thor, 51DOF)·G2 Max·X2 Edu·OmniHand 3 Ultra-M 공개',
   'WAIC 2026(상하이)에서 차세대 제품 4종 공개. A3 Ultra: NVIDIA Thor SoC, 51 DOF, 산업용 플래그십 — Q4 2026 출시 예정. G2 Max: 산업용 강화 모델. X2 Edu: 교육·연구용 플랫폼. OmniHand 3 Ultra-M: 로보틱 핸드. 누적 15,000대 출하(G2 기준 6/28 15,000번째). G2 Longcheer 태블릿 QC 라인 36시간 내 통합, 시프트당 3,000대 처리. Singtel MOU(싱가포르), UK APC(유럽 데뷔, RaaS 모델).',
   '2026-08-18'::timestamp, 'pending'),

-- 4. [Info] Agility Digit v5: 12월 상용 출시 확정, NVIDIA Halos 안전 인증 프로세스 진행
  (gen_random_uuid(), 'Forbes / TechCrunch / GeekWire',
   'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
   'Agility Digit v5: 2026년 12월 상용 출시 확정 — 20시간 운용, NVIDIA Halos 최초 적용',
   '8/10 Forbes: Digit v5 12월 상용 출시 확정. 20시간 연속 운용, 표준화 엔드이펙터(자가 교체 가능), 물리 AI 최초 NVIDIA Halos 안전 시스템 통합. $300M+ 멀티이어 오더 확보, 30+ 기업 파이프라인. Fremont Physical AI Hub(60K sqft) 개소, 200명 기술·현장운영직 채용. 9개 고객 현장 65,000+ 운용시간. Toyota Canada·Mercado Libre·Schaeffler·GXO·Amazon 배치. RoboFab 연 10,000대 생산 용량.',
   '2026-08-18'::timestamp, 'pending'),

-- 5. [Info] Apptronik Apollo 3: 2027 출시로 확정, 이족보행+바퀴 듀얼 구성
  (gen_random_uuid(), 'Forbes / Robotics 24-7 / RoboZaps',
   'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
   'Apptronik Apollo 3: 2027 출시 확정, 이족보행+바퀴 듀얼 구성 — Robot Park 90K sqft 데이터 수집 가속',
   'Apollo 3 = "첫 성숙 상용 제품", 2027 출시 확정. 이족보행(bipedal) + 바퀴(wheeled) 듀얼 구성 — 바퀴 모드로 초기 산업 배치 효율성·규제 적합성 확보. Robot Park(Austin, 90K sqft) Apollo 2 플릿 실환경 데이터 수집 → Apollo 3 AI 모델 학습. 글로벌 Robot Park 네트워크 확장 계획. Google DeepMind Gemini Robotics 2 통합으로 자율성 강화. 총 조달 ~$1B, $5B 밸류에이션.',
   '2026-08-18'::timestamp, 'pending'),

-- 6. [Info] 1X NEO: 25-DOF 텐던 핸드 공개, 양산 중이나 고객 출하 미확인
  (gen_random_uuid(), 'Dezeen / TBPN Digest / RoboZaps',
   'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
   '1X NEO: 25-DOF 텐던 핸드 7월 공개, 인간급 그립력 — 양산 중이나 고객 인도 미확인',
   '7/9 NEO 텐던 핸드 출하 시작(25 DOF, IP68, 촉각 슬립 감지, 자체 모터·텐던·센서·전자장치 설계·생산). 인간급 그립력, 경쟁 모델 대비 3배. 비선형 컴플라이언스 구현. 그러나 7/16 기준 검증된 고객 NEO 인도 사례 없음 — "올해 중 일부 고객 인도" 표현 유지. Hayward 풀 프로덕션(58K sqft, 200+ 직원) 가동 중, 연 10K 용량. EQT 10,000대 B2B 계약(2026-2030).',
   '2026-08-18'::timestamp, 'pending'),

-- 7. [Info] Tesla Optimus: 생산 일정 "later this year"로 후퇴, Optimus Academy 내부 프로그램 신설
  (gen_random_uuid(), 'Electrek / Teslarati / Yahoo Finance',
   'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
   'Tesla Optimus: Q2 주주서한 "later this year"로 생산 일정 후퇴 — Optimus Academy 신설',
   '7/22 Q2 주주서한: 생산라인 설치 중, 출력은 "올해 후반 예상"으로 기존 "7-8월" 대비 후퇴. 초기 생산분 Optimus Academy(내부 훈련·개발 프로그램)에 배정 — 외부 고객 아닌 내부 교육용. TSMC·Samsung·Micron 핵심 서플라이어로 공식 확인(Q2 실적 콜 7/22). 프리몬트 내부 1,000대+ Gen 3 가동(배터리·부품·케이블). Giga Texas 2공장 2027 여름 가동 목표. 2026 capex >$20B 역대 최대.',
   '2026-08-18'::timestamp, 'pending'),

-- 8. [Info] Unitree STAR Market 상장일 윈도우 진입 (8/17-21) — 거래 개시 모니터링
  (gen_random_uuid(), 'VT Markets / Odaily / BigGo Finance',
   'https://valueaddvc.com/unitree-ipo-tracker',
   'Unitree 688836.SH: STAR Market 상장일 윈도우(8/17-21) 진입 — 거래 개시 모니터링 중',
   '8/17-21 상장 윈도우 진입. 8/10 청약, 8/12 납입 완료. 공모가 ¥150.80/주, $9.04B 밸류에이션. 중국 금융미디어 "8/14경" vs 서구 트래커 "8/17-21" 상이 — SSE 최종 확인 대기. IPO 발행: 4,045만주(10%), ¥42B 조달. FCC Covered List 영향: 미국 시장 신규 모델(G1·H2 포함) 진입 차단 — 미국 매출 비중 분석 필요.',
   '2026-08-18'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Regulatory] FCC Covered List: 외국산 로봇 차단
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'FCC Adds Foreign-Produced Humanoid and Quadruped Robots to Covered List — Bars New US Market Entry',
  'K&L Gates / Sidley Austin / FCC / The Hill / Fox Business',
  'https://www.klgates.com/thought-leadership/FCC-Adds-Foreign-Produced-Advanced-Robotic-Devices-to-the-Covered-List-Five-Things-to-Know-8-3-2026',
  '2026-07-28'::timestamp,
  'FCC Public Notice DA 26-786 (July 28, 2026) adds foreign-produced advanced robotic devices to Covered List. New humanoid, quadruped, AMR, and wheeled/tracked ground platform models barred from FCC equipment authorization required for US import/sale/marketing. Only route: Department of War Conditional Approval. Security basis: Unitree UniPwn exploit (Sep 2025), remote camera/mic/map access incident (early 2026), pre-installed backdoor in foreign quadrupeds (Apr 2025). Directly impacts Unitree, Agibot US market entry. Existing approved devices unaffected.',
  'FCC Covered List expansion (DA 26-786, July 28 2026): foreign-produced humanoid robots, quadruped robots, autonomous mobile robots, and wheeled/tracked ground platforms added. New models cannot receive FCC equipment authorization for US import, marketing, or sale. Conditional Approval via DoW is sole pathway. Rationale: Unitree UniPwn vulnerability (Sep 2025) — hardcoded encryption key, unsanitized root shell input across Go2, G1, H1, B2. Early 2026 incident: remote access to thousands of consumer robot cameras, mics, home maps. Apr 2025: pre-installed backdoor report in foreign quadrupeds. Consumer household robots above weight threshold, warehouse AMRs, sidewalk delivery bots, inspection quadrupeds, humanoid platforms all in scope. Does not retroactively affect devices already authorized or owned. Dual impact: Chinese manufacturers (Unitree, Agibot, Xiaomi) face de facto US ban for new models. European/Norwegian (1X), US-based manufacturers (Tesla, Figure, Agility, Apptronik, BD) unaffected.',
  'en', 'industry', 'robot',
  md5('fcc-covered-list-foreign-humanoid-quadruped-ban-2026-08-18'),
  '{"mentionedCompanies":["Unitree","Agibot","Xiaomi","FCC"],"mentionedRobots":["G1","H1","H2","B2","Go2"],"technologies":[],"marketInsights":["foreign humanoid/quadruped US market entry barred","DoW Conditional Approval only pathway","Chinese manufacturers directly impacted","existing devices unaffected"],"keyPoints":["FCC DA 26-786 July 28","Foreign robot US import ban","Unitree/Agibot directly affected"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('fcc-covered-list-foreign-humanoid-quadruped-ban-2026-08-18'));

-- [Google DeepMind] Gemini Robotics 2 출시
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Google DeepMind Launches Gemini Robotics 2: Whole-Body VLA for Humanoid Robots',
  'Google DeepMind Blog / SiliconANGLE / Automate.org',
  'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
  '2026-08-08'::timestamp,
  'Google DeepMind launches Gemini Robotics 2 model suite (announced July 30, released August 8). Three models: Gemini Robotics 2 (whole-body VLA controlling humanoids feet-to-fingertips, multi-robot collaboration), Gemini Robotics ER 2 (real-world video understanding, multi-step planning), On-Device 2 (local execution, adaptive). ASIMOV-Agentic benchmark introduced for evaluating robot safety (dangerous command refusal, human proximity). Integrated with Boston Dynamics Atlas and Apptronik Apollo. Robotics foundation model competition: Google (Gemini) vs xAI (Grok) vs Figure (Helix) vs Physical Intelligence (Pi).',
  'Google DeepMind Gemini Robotics 2: full suite launched Aug 8, 2026. (1) Gemini Robotics 2 — vision-language-action model for whole-body humanoid control, walking/crouching/stretching/manipulation, multi-robot teamwork. (2) Gemini Robotics ER 2 — real-world video understanding, complex multi-step planning. (3) On-Device 2 — runs locally, adapts to environment. All three in early access. ASIMOV-Agentic benchmark: evaluates whether robots refuse dangerous commands, pause when humans approach. Key integrations: BD Atlas + Apptronik Apollo confirmed. Foundation model competition landscape: Google Gemini Robotics vs xAI Grok (Tesla Optimus) vs Figure Helix vs Physical Intelligence Pi vs NVIDIA GR00T. Industry impact: standardizing VLA as the dominant paradigm for humanoid intelligence.',
  'en', 'technology', 'rfm',
  md5('google-deepmind-gemini-robotics-2-launch-2026-08-18'),
  '{"mentionedCompanies":["Google DeepMind","Boston Dynamics","Apptronik","xAI","Figure AI","Physical Intelligence","NVIDIA"],"mentionedRobots":["Atlas","Apollo"],"technologies":["Gemini Robotics 2","VLA","ER 2","On-Device 2","ASIMOV-Agentic"],"marketInsights":["VLA paradigm dominance","BD Atlas + Apptronik Apollo integration","foundation model competition heating up"],"keyPoints":["3-model suite launched Aug 8","ASIMOV-Agentic safety benchmark","Atlas and Apollo integration confirmed"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('google-deepmind-gemini-robotics-2-launch-2026-08-18'));

-- [Agibot] WAIC 2026 신제품 4종 공개
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'AgiBot Unveils A3 Ultra, G2 Max, X2 Edu, OmniHand 3 Ultra-M at WAIC 2026; 15,000th Robot Milestone',
  'PR Newswire / Interesting Engineering / Gasgoo',
  'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
  '2026-07-30'::timestamp,
  'AgiBot unveiled 4 new products at WAIC 2026 in Shanghai: A3 Ultra (NVIDIA Thor SoC, 51 DOF, flagship humanoid for Q4 2026), G2 Max (enhanced industrial), X2 Edu (education/research platform), and OmniHand 3 Ultra-M (robotic hand). Cumulative 15,000 robots shipped as of June 28 (15,000th was G2). Production trajectory: 1,000 by Jan 2025, 5,000 by end-2025, 10,000 by Mar 2026, 15,000 by Jun 2026. G2 deployed at Longcheer Technology Nanchang tablet QC line — 36hr integration, 3,000 tablets/shift.',
  'AgiBot WAIC 2026 launches: (1) A3 Ultra — NVIDIA Thor SoC, 51 DOF, flagship industrial humanoid, Q4 2026 launch. (2) G2 Max — enhanced industrial-grade variant. (3) X2 Edu — education and research platform for universities. (4) OmniHand 3 Ultra-M — advanced robotic hand for manipulation tasks. Milestone: 15,000th robot (G2 unit) rolled off production line June 28, 2026. Exponential production growth: mass production Aug 2024, 1K by Jan 2025, 5K by end-2025, 10K by Mar 2026, 15K by Jun 2026. Real-world deployment: Longcheer Technology Nanchang — G2 on live tablet production QC line, integrated in 36 hours, supports ~3,000 tablets/shift. Singtel MOU for Singapore. UK APC for European debut with RaaS model. HKEX IPO in progress.',
  'en', 'product', 'robot',
  md5('agibot-waic-2026-a3-ultra-g2-max-15000-2026-08-18'),
  '{"mentionedCompanies":["AgiBot","NVIDIA","Longcheer Technology","Singtel"],"mentionedRobots":["A3 Ultra","G2 Max","G2","X2 Edu","OmniHand 3 Ultra-M"],"technologies":["NVIDIA Thor","embodied AI","RaaS"],"marketInsights":["15,000 cumulative robots shipped","exponential production scaling","real-world QC deployment","A3 Ultra Q4 2026 launch"],"keyPoints":["4 new products at WAIC 2026","15,000th robot milestone","Longcheer tablet QC deployment"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-waic-2026-a3-ultra-g2-max-15000-2026-08-18'));

-- [Agility] Digit v5 December 2026 상용 출시 확정
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Agility Robotics Digit v5: December 2026 Commercial Launch Confirmed with NVIDIA Halos Safety System',
  'Forbes / TechCrunch / GeekWire',
  'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
  '2026-08-10'::timestamp,
  'Agility Robotics confirms Digit v5 commercial launch for December 2026. Key specs: 20-hour operational days, standardized self-swapping end-effectors. First humanoid robot to integrate NVIDIA Halos safety system. $300M+ in multi-year orders secured, 30+ company pipeline. Fremont Physical AI Hub (60,000 sqft) opened with 200 new roles. SPAC merger with Churchill Capital Corp XI (CCXI) ongoing — ticker AGLT, $2.5B deal. Current fleet: 65,000+ operational hours across 9 customer sites.',
  'Agility Robotics Digit v5 December 2026 launch: 20-hour operational days, standardized end-effectors (eventually self-swapping), NVIDIA Halos safety system — first humanoid robot to use Halos, designed for ISO 13849 / IEC 62443 compliance. Orders: $300M+ multi-year committed, 30+ companies in pipeline. RoboFab annual capacity: 10,000 units. SPAC: Churchill Capital Corp XI (CCXI), $2.5B deal, ticker AGLT, NASDAQ listing expected by end-2026, SEC S-4 filed 7/14. $620M+ raise including $200M PIPE. Fremont Physical AI Hub: 60K sqft, AI training/testing/software, ~200 new technical and field-ops roles. Customer base: Schaeffler, GXO (100K+ totes moved), Toyota Canada, Mercado Libre, Spanx, Amazon. 65K+ operational hours across 9 facilities.',
  'en', 'product', 'robot',
  md5('agility-digit-v5-december-launch-halos-2026-08-18'),
  '{"mentionedCompanies":["Agility Robotics","NVIDIA","Churchill Capital","GXO","Toyota","Mercado Libre","Amazon"],"mentionedRobots":["Digit v5","Digit"],"technologies":["NVIDIA Halos","Physical AI","ISO 13849","IEC 62443"],"marketInsights":["December 2026 launch confirmed","$300M+ orders","first Halos humanoid","SPAC $2.5B deal"],"keyPoints":["Digit v5 December 2026 launch","NVIDIA Halos first humanoid integration","$300M+ multi-year orders"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agility%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit-v5-december-launch-halos-2026-08-18'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: FCC 외국산 로봇 차단 — Unitree/Agibot 미국 시장 진입 차단
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'critical',
  '[Regulatory] FCC Covered List: 외국산 휴머노이드·4족 로봇 미국 진입 차단 — Unitree·Agibot 직격',
  'FCC DA 26-786(7/28): 외국산 휴머노이드·4족보행 로봇 신규 모델 미국 FCC 장비인증 차단. DoW Conditional Approval만 가능. Unitree G1/H2, Agibot 신규 모델 미국 판매 불가. 보안 근거: UniPwn 취약점, 원격 접근 사고, 백도어 보고. 미국 시장 경쟁 구도 변화: US 기업(Tesla, Figure, Agility, Apptronik, BD) 유리, 중국 기업 불리.',
  '{"source":"FCC/K&L Gates/Sidley Austin","confidence":"A","date":"2026-07-28","notice":"DA 26-786","impactedCompanies":["Unitree","Agibot","Xiaomi"],"beneficiaries":["Tesla","Figure AI","Agility","Apptronik","Boston Dynamics"],"pathway":"DoW Conditional Approval only","existingDevicesExempt":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%FCC Covered List: 외국산 휴머노이드%');

-- Alert 2: Agibot WAIC 2026 차세대 4종 공개 + 15K 출하
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' OR name ILIKE '%Agibot%' LIMIT 1),
  'score_spike', 'info',
  '[Agibot] WAIC 2026 A3 Ultra(Thor, 51DOF) 외 4종 공개 — 15,000대 누적 출하, 양산 리더십 강화',
  'WAIC 2026에서 차세대 4종 공개: A3 Ultra(NVIDIA Thor, 51DOF, Q4 출시), G2 Max, X2 Edu, OmniHand 3 Ultra-M. 6/28 15,000번째 로봇 생산. 양산 궤적: 1K(2025.1) → 5K(2025.12) → 10K(2026.3) → 15K(2026.6). 중국 기업 중 양산 규모 1위 확고. 단, FCC Covered List로 미국 시장 진입 차단.',
  '{"source":"PR Newswire/Interesting Engineering","confidence":"A","date":"2026-07-30","products":["A3 Ultra","G2 Max","X2 Edu","OmniHand 3 Ultra-M"],"a3UltraSoC":"NVIDIA Thor","a3UltraDOF":51,"cumulativeShipments":15000,"fccBlocked":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%WAIC 2026 A3 Ultra%');

-- Alert 3: Agility Digit v5 12월 상용 출시 + NVIDIA Halos
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Digit%' LIMIT 1),
  'mass_production', 'warning',
  '[Agility] Digit v5 12월 상용 출시 확정 — NVIDIA Halos 최초 적용, $300M+ 오더',
  'Digit v5 2026년 12월 상용 출시 확정. 20시간 연속 운용, 자가 교체 엔드이펙터. NVIDIA Halos 안전 시스템 최초 적용(ISO 13849/IEC 62443). $300M+ 멀티이어 오더, 30+ 기업 파이프라인. SPAC $2.5B, 틱커 AGLT 연내 NASDAQ 상장. RoboFab 연 10K 용량.',
  '{"source":"Forbes/TechCrunch","confidence":"A","date":"2026-08-10","launchDate":"December 2026","operationalHours":"20hr/day","safetySystem":"NVIDIA Halos","orders":"$300M+","pipelineCompanies":"30+","spacDeal":"$2.5B","ticker":"AGLT"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Digit v5 12월 상용 출시%');

-- Alert 4: Google DeepMind Gemini Robotics 2 — 로보틱스 파운데이션 모델 경쟁 가속
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'info',
  '[Industry] Google DeepMind Gemini Robotics 2 출시 — BD Atlas·Apptronik Apollo 통합, VLA 패러다임 확립',
  'Google DeepMind Gemini Robotics 2 (8/8 출시): 전신 VLA + ER 2(멀티스텝 플래닝) + On-Device 2(로컬). BD Atlas·Apptronik Apollo 통합 확인. ASIMOV-Agentic 안전 벤치마크 도입. 로보틱스 FM 경쟁: Google vs xAI(Tesla) vs Figure(Helix) vs PI vs NVIDIA(GR00T). VLA가 휴머노이드 인텔리전스 지배 패러다임으로 확립.',
  '{"source":"Google DeepMind Blog/SiliconANGLE","confidence":"A","date":"2026-08-08","models":["Gemini Robotics 2","ER 2","On-Device 2"],"integrations":["BD Atlas","Apptronik Apollo"],"benchmark":"ASIMOV-Agentic","competitors":["xAI Grok","Figure Helix","PI","NVIDIA GR00T"]}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Gemini Robotics 2 출시%');

COMMIT;
