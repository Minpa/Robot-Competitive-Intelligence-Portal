-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-05
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-05.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Figure AI - Nscale $3.5B 전략적 AI 컴퓨트 파트너십 체결
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Forbes / Unite.AI / PR Newswire / TelecomTV',
   'https://www.forbes.com/sites/johnkoetsier/2026/09/04/how-figure-committed-35-billion-for-ai-compute-after-raising-only-19-billion/',
   '[Critical] Figure AI × Nscale: $3.5B AI 컴퓨트 파트너십 — NVIDIA Vera Rubin 10만 GPU, 총 $6B 확장 가능',
   '9/3 공식 발표: Figure AI와 AI 인프라 기업 Nscale이 $3.5B 규모 전략적 컴퓨트 파트너십 체결. NVIDIA Vera Rubin 플랫폼 기반 최대 100,000 GPU 배치 예정. H2 2027 Barstow, Texas 데이터센터에서 배치 시작. 총 $6B 이상으로 확장 의향. Nscale은 Figure에 전략적 투자도 병행. Vera Rubin은 Blackwell 대비 추론 토큰 비용 10배, 학습 GPU 수 4배 절감. Figure 총 조달 $1.9B 대비 $3.5B 컴퓨트 투자는 Physical AI 인프라 선점 의지. 휴머노이드 로봇 기업의 AI 컴퓨트 대규모 계약 최초 사례.',
   '2026-09-05'::timestamp, 'pending'),

-- 2. [Warning] UBTECH UWORLD U1: 사전주문 13,361대 돌파, 9/16 첫 인도 개시
  (gen_random_uuid(), 'PR Newswire / Gasgoo / EmbodiedGlobal / MacroStream',
   'https://www.prnewswire.com/ae/news-releases/ubtech-launches-uworld-u1-the-worlds-first-full-size-mass-produced-ultra-bionic-humanoid-robot-302815285.html',
   '[Warning] UBTECH UWORLD U1: 사전주문 13,361대($13.7M), 9/16 첫 인도 — 2026 생산목표 50K대',
   '6/30 출시 이후 누적 주문 13,361대($13.7M 매출). 2025년 연간 판매 1,079대의 12.4배. 가격: U1 Lite ¥119,800, U1 Pro ¥169,800, U1 Ultra ¥880,000-990,000. 9/16 첫 고객 인도 시작. 2026년 생산 목표 50,000대. H1 2026 UBTECH 매출 RMB 1.27B, 풀사이즈 휴머노이드 부문 1,445% 성장. AGIBOT와 함께 중국 소비자용 휴머노이드 시장 경쟁 본격화.',
   '2026-09-05'::timestamp, 'pending'),

-- 3. [Info] Unitree 주가 ¥550 — IPO 피크 대비 -50% 지속, 애널리스트 목표가 ¥578
  (gen_random_uuid(), 'Investing.com / EBC Financial / Longbridge',
   'https://www.investing.com/equities/yushu-tech-co',
   '[Info] Unitree(688836) 주가 ¥550.45(9/3) — IPO 피크 ¥1,100 대비 -50%, 52주 저점 근접',
   '9/3 종가 ¥550.45(전일 ¥546.02). 일중 ¥545-¥565 거래. IPO 피크 ¥1,100(8/19) 대비 정확히 -50%. 52주 범위 ¥545-¥1,100으로 저점 근접. 애널리스트 12개월 목표가: 평균 ¥578, 상한 ¥756, 하한 ¥370. 매수 2명, 매도 0명. 9/1 보고 시 ¥585 대비 추가 6% 하락. 시총 ~¥220B(~$30B). IPO 열기 대비 지속적 밸류에이션 재평가 진행.',
   '2026-09-05'::timestamp, 'pending'),

-- 4. [Info] Tesla Optimus: 내부 배치 ~1,000-1,200대, 외부 판매 0대 — 데이터 수집 전용
  (gen_random_uuid(), 'Motley Fool / IIoT World / Axis Intelligence',
   'https://www.fool.com/investing/2026/08/29/optimus-just-entered-production-at-fremont-heres-w/',
   '[Info] Tesla Optimus: 내부 배치 ~1,000-1,200대 추정, 외부 판매 0건 — "학습·데이터 수집 전용"',
   'Fremont+Giga Texas에 ~1,000-1,200대 배치 추정(복수 애널리스트). 그러나 외부 판매 0건, 업타임 공시 없음. Musk 직접 발언: "주로 학습과 데이터 수집 용도". 배터리 셀 분류·부품 키팅·재고관리 등 내부 작업 수행. 경제적으로 생산적인 작업은 미수행. AI5 칩(4/15 테이프아웃)으로 H100급 추론 성능. Grok 음성 AI 통합 확인. Giga Texas 전용 공장 건설 진행 중, 2027 가동 목표.',
   '2026-09-05'::timestamp, 'pending'),

-- 5. [Info] Tiangong Ultra 100m 8.86초 — 기존 기록(9.39s) 재경신
  (gen_random_uuid(), 'France24 / NBC News / CBS News / Al Jazeera',
   'https://www.france24.com/en/asia-pacific/20260823-humanoid-robots-break-records-at-competition-in-beijing',
   '[Info] Tiangong Ultra: 100m 8.86초로 자체 기록(9.39s) 재경신 — 볼트 기록 0.72초 앞서',
   'World Humanoid Robot Games(8/22-26) 대형 로봇 부문 준결승에서 Tiangong Ultra(北京人形机器人创新中心)가 8.86초 기록. 기존 9.39초(결선 기록) 대비 0.53초 단축. 우사인 볼트 세계기록(9.58초) 대비 0.72초 빠름. 바이페달 로봇 이동속도가 인간 엘리트 수준을 확실히 초과함 재확인. 다만 로봇의 체형·무게·걸음 역학은 인간과 상이하여 직접 비교에 한계.',
   '2026-09-05'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Figure AI] Nscale $3.5B compute partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Signs $3.5B Compute Deal with Nscale for 100,000 NVIDIA Vera Rubin GPUs',
  'Forbes / Unite.AI / PR Newswire / TelecomTV',
  'https://www.forbes.com/sites/johnkoetsier/2026/09/04/how-figure-committed-35-billion-for-ai-compute-after-raising-only-19-billion/',
  '2026-09-04'::timestamp,
  'Figure AI and Nscale signed a $3.5B strategic compute partnership for up to 100,000 NVIDIA Vera Rubin GPUs, with intent to scale to $6B. Deployment begins H2 2027 in Barstow, Texas. Nscale also making strategic investment in Figure. First major AI compute deal by a humanoid robotics company.',
  'Figure AI and AI infrastructure provider Nscale announced a strategic partnership on September 3, 2026, to deploy the NVIDIA Vera Rubin platform across up to 100,000 GPUs. Initial compute commitment: $3.5 billion, with stated intent to scale to over $6 billion. Deployment target: second half of 2027 at Nscale''s facility in Barstow, Texas. As part of the agreement, Nscale is making a strategic investment in Figure, and both parties will explore using humanoid robots to scale Nscale''s supply chain operations. The NVIDIA Vera Rubin platform pairs the Vera CPU with Rubin GPU, delivering up to 10x reduction in inference token cost and 4x reduction in GPUs needed to train mixture-of-experts models compared with Blackwell. Context: Figure has raised $1.9B total (including $1B Series C at $39B valuation), making the $3.5B compute commitment nearly double its total fundraising — a bold bet on Physical AI infrastructure. BotQ factory currently producing Figure 03 at approximately 1 robot per 90 minutes (up from 1 per hour), with annual capacity of ~12,000 units. This deal positions Figure as the first humanoid robotics company to secure a multi-billion-dollar AI compute agreement, signaling the convergence of humanoid robotics and large-scale AI training infrastructure.',
  'en', 'business', 'robot',
  md5('figure-nscale-3-5b-vera-rubin-compute-2026-09-05'),
  '{"mentionedCompanies":["Figure AI","Nscale","NVIDIA"],"mentionedRobots":["Figure 03"],"technologies":["NVIDIA Vera Rubin","Physical AI","inference optimization"],"marketInsights":["$3.5B initial commitment","up to $6B total","100K GPUs","H2 2027 deployment"],"keyPoints":["First humanoid company multi-billion AI compute deal","Nscale strategic investment in Figure","10x inference cost reduction vs Blackwell","Barstow TX data center"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-nscale-3-5b-vera-rubin-compute-2026-09-05'));

-- [UBTECH] UWORLD U1 pre-orders 13,361 units, Sep 16 delivery
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'UBTECH UWORLD U1 Pre-Orders Exceed 13,361 Units, First Deliveries Set for September 16',
  'PR Newswire / Gasgoo / EmbodiedGlobal / MacroStream',
  'https://autonews.gasgoo.com/articles/news/starting-from-119800-yuan-ubtech-uworld-u1-full-channel-orders-exceed-10000-2072326807465279489',
  '2026-09-05'::timestamp,
  'UBTECH UWORLD U1 ultra-bionic humanoid pre-orders exceeded 13,361 units since June 30 launch, representing 12.4x the company''s 2025 annual humanoid sales. First customer deliveries confirmed for September 16, 2026. 2026 production target: 50,000 units. H1 2026 UBTECH revenue: RMB 1.27B with 1,445% growth in full-size humanoid segment.',
  'UBTECH Robotics UWORLD U1 consumer humanoid update September 2026. Pre-order milestone: cumulative orders exceeded 13,361 units since the June 30 global launch event in Shenzhen — 12.4x UBTECH''s full-year 2025 enterprise humanoid sales of 1,079 units. Revenue from pre-orders approximately $13.7 million. Product lineup and pricing: U1 Lite (semi-torso) at ¥119,800 (~$16,500), U1 Pro (full-body high-performance) at ¥169,800 (~$23,400), U1 Ultra male at ¥990,000 (~$136K), U1 Ultra female at ¥880,000 (~$121K). First customer deliveries confirmed for September 16, 2026. 2026 production capacity target: 50,000 units. Financial context: UBTECH H1 2026 revenue reached RMB 1.27 billion, with a 1,445% revenue surge in the full-size embodied humanoid segment. Walker S2 industrial humanoid deliveries ongoing across automotive, 3C electronics, logistics, semiconductor, and aerospace (Airbus). Competitive significance: UBTECH joining AGIBOT and Unitree in the Chinese consumer/commercial humanoid market, with pricing strategy spanning entry-level ($16.5K) to premium ($136K) segments.',
  'en', 'business', 'robot',
  md5('ubtech-uworld-u1-13361-orders-sep16-delivery-2026-09-05'),
  '{"mentionedCompanies":["UBTECH","Airbus"],"mentionedRobots":["UWORLD U1","U1 Lite","U1 Pro","U1 Ultra","Walker S2"],"technologies":["ultra-bionic design","consumer humanoid"],"marketInsights":["13,361 pre-orders","12.4x 2025 annual sales","$13.7M revenue","50K 2026 production target"],"keyPoints":["Sep 16 first deliveries","H1 2026 RMB 1.27B revenue","1,445% humanoid growth","¥119,800-¥990,000 pricing range"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('ubtech-uworld-u1-13361-orders-sep16-delivery-2026-09-05'));

-- [Tesla] Optimus internal deployment status
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus: ~1,000-1,200 Units Deployed Internally, Zero External Sales — Learning and Data Collection Only',
  'Motley Fool / IIoT World / Axis Intelligence / OptimUSK',
  'https://www.fool.com/investing/2026/08/29/optimus-just-entered-production-at-fremont-heres-w/',
  '2026-09-05'::timestamp,
  'Multiple analyst estimates place Tesla Optimus internal deployment at approximately 1,000-1,200 units across Fremont and Giga Texas. Musk describes their role as "primarily learning and data collection." Zero external sales, no published uptime figures. AI5 chip taped out April 2026 matches H100 inference performance. Grok voice AI integrated.',
  'Tesla Optimus deployment status analysis September 2026. Internal deployment: estimated 1,000-1,200 humanoid units across Fremont and Giga Texas facilities (multiple analyst estimates, not officially confirmed by Tesla). Tasks performed: battery cell sorting, component kitting, inventory management — classified as learning and data collection rather than economically productive work. CEO statement: Musk described units as "primarily for learning and data collection rather than performing productive tasks." External sales: zero. Published uptime figures: none. Production status: Fremont Model S/X line conversion completed, V3 production line active since late August 2026. Initial output "quite slow" and "literally impossible to predict" per Musk. AI hardware: AI5 chip taped out April 15, 2026 — single AI5 delivers ~5x compute of dual AI4 chips, matches NVIDIA H100 inference performance. Grok (xAI) voice AI integrated for natural language interaction. Giga Texas: dedicated Optimus factory under construction, first lines targeted 2027, long-term capacity 10 million units per year. Consumer availability: end 2027 earliest, analyst consensus 2028-2029. Current build cost: $50K-$100K+ per unit vs. $20-30K long-term target.',
  'en', 'technology', 'robot',
  md5('tesla-optimus-1200-internal-zero-sales-2026-09-05'),
  '{"mentionedCompanies":["Tesla","NVIDIA","xAI"],"mentionedRobots":["Optimus V3","Optimus Gen 4"],"technologies":["AI5 chip","Grok voice AI","H100-class inference"],"marketInsights":["~1,000-1,200 internal units","zero external sales","$50-100K current cost","2027 earliest consumer"],"keyPoints":["Data collection only purpose","AI5 taped out April 2026","Giga Texas 2027 factory","Build cost far above $20-30K target"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-1200-internal-zero-sales-2026-09-05'));

-- [Industry] Tiangong Ultra 8.86s record
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tiangong Ultra Smashes Own 100m Record: 8.86 Seconds at World Humanoid Robot Games',
  'France24 / NBC News / CBS News / Al Jazeera / Global Times',
  'https://www.france24.com/en/asia-pacific/20260823-humanoid-robots-break-records-at-competition-in-beijing',
  '2026-09-05'::timestamp,
  'Beijing Innovation Centre''s Tiangong Ultra lowered its own 100m record from 9.39s to 8.86s in a semifinal at the World Humanoid Robot Games, beating Usain Bolt''s 9.58s record by 0.72 seconds. Demonstrates bipedal robot locomotion has definitively surpassed elite human sprint speed.',
  'Tiangong Ultra 100m record update from World Humanoid Robot Games 2026 (August 22-26, Beijing National Speed Skating Oval). In the large-size robot division semifinal, Tiangong Ultra — developed by the Beijing Innovation Centre of Humanoid Robotics (Beijing Humanoid Robot Innovation Center) — recorded a time of 8.86 seconds, smashing its own previous record of 9.39 seconds set in the final. Improvement: 0.53 seconds faster than own previous best. Comparison to human records: Usain Bolt''s world record 9.58s (Berlin 2009) beaten by 0.72 seconds. Context: at least three robots surpassed Bolt''s record during the games, with Honor Lightning recording approximately 9.3 seconds. However, direct human-robot comparison has limitations — robot form factor, weight distribution, limb proportions, and stride dynamics differ fundamentally from human biomechanics. The games featured 2,056 robots from 666 teams across 16 countries, with Chinese teams comprising 96% of participants. Industry significance: bipedal locomotion speed is now conclusively beyond elite human level, relevant for industrial mobility requirements — but the gap between sprint capability and practical workplace mobility remains substantial.',
  'en', 'technology', 'robot',
  md5('tiangong-ultra-8-86s-record-whrg-2026-09-05'),
  '{"mentionedCompanies":["Beijing Innovation Centre of Humanoid Robotics","Honor"],"mentionedRobots":["Tiangong Ultra","Lightning"],"technologies":["bipedal locomotion","reinforcement learning sprint"],"marketInsights":["8.86s 100m record","0.72s faster than Bolt","2,056 robots in competition"],"keyPoints":["Broke own 9.39s record","8.86s in semifinal","Bipedal speed surpasses elite human","Practical mobility gap remains"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tiangong-ultra-8-86s-record-whrg-2026-09-05'));

-- [Unitree] Stock price update — continued decline
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Stock (688836) Hits ¥550: -50% From IPO Peak, Approaching 52-Week Low',
  'Investing.com / EBC Financial / Longbridge / Yahoo Finance',
  'https://www.investing.com/equities/yushu-tech-co',
  '2026-09-05'::timestamp,
  'Unitree Robotics stock (688836.SH) closed at ¥550.45 on September 3, exactly 50% below its IPO day peak of ¥1,100. 52-week low approaching at ¥545. Analyst 12-month target: ¥578 average (range ¥370-¥756). Continued valuation reset from the speculative IPO surge.',
  'Unitree Robotics (688836.SH) stock price tracking September 2026. September 3 close: ¥550.45, previous close ¥546.02. Day range: ¥545.02-¥565.50. 52-week range: ¥545.00-¥1,100.00. Key levels: IPO price ¥150.80 (still +265% above), Day 1 peak ¥1,100 (now -50%), Day 1 close ¥845 (now -35%). Weekly change from September 1 report (¥585): -5.9% further decline. Market capitalization approximately ¥220B (~$30B), down from ~¥342B peak (~$53B). Analyst consensus: 2 buy ratings, 0 sell. Average 12-month target ¥578, high ¥756, low ¥370. Fundamental backdrop: Q1 2026 adjusted net profit ¥40M (-53% YoY), 2025 revenue ¥1.708B (+335%), margins ~60%. Production target 20,000 units/year in 2026. G1 $13,500 on backorder. FCC ban blocks new model US market entry. CEO Wang Xingxing at WRC: "ChatGPT moment" for humanoid robots could take 2-10 years. The sustained decline suggests market is repricing from speculative IPO euphoria toward fundamental-based valuation.',
  'en', 'business', 'robot',
  md5('unitree-stock-550-50pct-decline-2026-09-05'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","H1","H2"],"technologies":[],"marketInsights":["¥550.45 close Sep 3","IPO peak -50%","~$30B market cap","analyst target ¥578"],"keyPoints":["52-week low approaching","continued valuation reset","-5.9% from Sep 1 report","2 buy / 0 sell ratings"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-stock-550-50pct-decline-2026-09-05'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Figure AI $3.5B compute deal
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'critical',
   'Figure AI × Nscale $3.5B AI 컴퓨트 파트너십 — NVIDIA Vera Rubin 10만 GPU',
   'Figure AI와 Nscale이 $3.5B AI 컴퓨트 전략 파트너십 체결. NVIDIA Vera Rubin 10만 GPU, H2 2027 배치. $6B 확장 가능. 휴머노이드 기업 최초 대규모 AI 인프라 계약.',
   '{"company":"Figure AI","event":"compute_partnership","partner":"Nscale","amount":"$3.5B","gpus":"100K Vera Rubin","deployment":"H2 2027","confidence":"A"}'::jsonb,
   false, '2026-09-05'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure AI%Nscale%3.5B%');

-- UBTECH U1 pre-orders
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'warning',
   'UBTECH UWORLD U1: 사전주문 13,361대, 9/16 첫 인도 개시',
   'UWORLD U1 사전주문 13,361대($13.7M). 2025년 연간의 12.4배. 9/16 첫 인도. 2026 생산목표 50K대. H1 매출 RMB 1.27B.',
   '{"company":"UBTECH","robot":"UWORLD U1","event":"preorder_milestone","units":"13,361","revenue":"$13.7M","delivery_date":"2026-09-16","confidence":"A"}'::jsonb,
   false, '2026-09-05'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%UBTECH%U1%13,361%');

-- Unitree stock continued decline
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'info',
   'Unitree 주가 ¥550 — IPO 피크 대비 -50%, 밸류에이션 재평가 지속',
   '9/3 종가 ¥550.45. IPO 피크 ¥1,100 대비 -50%. 52주 저점(¥545) 근접. 시총 ~$30B(피크 $53B).',
   '{"company":"Unitree","event":"stock_decline","price":"¥550.45","peak":"¥1,100","decline":"-50%","market_cap":"~$30B","confidence":"A"}'::jsonb,
   false, '2026-09-05'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Unitree%주가%550%');

-- Tesla Optimus internal deployment
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Tesla Optimus: 내부 ~1,200대 배치, 외부 판매 0건 — 데이터 수집 전용',
   '추정 1,000-1,200대 Fremont+Giga Texas 내부 배치. 외부 판매 0건. "학습·데이터 수집 전용". AI5 칩 H100급. 소비자 2027년 말 이후.',
   '{"company":"Tesla","robot":"Optimus V3","event":"internal_deployment","units":"~1,200","external_sales":"0","purpose":"data collection","confidence":"B"}'::jsonb,
   false, '2026-09-05'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Tesla Optimus%내부%1,200%');

-- Tiangong Ultra 8.86s
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   'Tiangong Ultra 100m 8.86초 — 자체 기록(9.39s) 재경신, 볼트 기록 0.72초 초과',
   'WHRG 준결승에서 8.86초 달성. 기존 9.39초 기록 0.53초 단축. 볼트 9.58초 대비 0.72초 빠름. 바이페달 스프린트 기술 급진전.',
   '{"entity":"Tiangong Ultra","event":"speed_record","time":"8.86s","previous":"9.39s","bolt_record":"9.58s","confidence":"A"}'::jsonb,
   false, '2026-09-05'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Tiangong Ultra%8.86%');

COMMIT;
