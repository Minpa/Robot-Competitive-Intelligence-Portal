-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-20
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-20T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-18
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-20.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Figure AI Helix 2.5 — 30가구 제로샷 테스트, 56% 성공률
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Unite.AI / TechTimes / The AI Insider',
   'https://www.unite.ai/figure-introduces-helix-2-5-tested-zero-shot-in-30-unseen-homes/',
   '[Warning] Figure AI Helix 2.5 — 30가구 제로샷 테스트, 56% 성공률(기존 9%→56%), Index 프리트레이닝',
   '9/17 Figure AI Helix 2.5 공개. 30개 Bay Area 가정에서 사전 데이터 수집 없이(zero-shot) 테스트. 420회 시도 중 237회 성공(56%). 침대 정리·수건 접기·장난감 정리 수행. 동일 아키텍처 scratch 학습 대비 6배(9%→56%) 향상. Index 데이터셋 프리트레이닝으로 task-specific 데이터 50% 감소. 가정용 로봇 범용 AI의 핵심 이정표.',
   '2026-09-20'::timestamp, 'pending'),

-- 2. [Warning] Figure AI × Nscale — $3.5B 컴퓨트 파트너십, 100K Vera Rubin GPU
  (gen_random_uuid(), 'Unite.AI / eWeek / Securities.io / TechTimes',
   'https://www.unite.ai/nscale-figure-ink-3-5b-deal-for-up-to-100000-vera-rubin-gpus/',
   '[Warning] Figure AI × Nscale $3.5B 컴퓨트 딜 — 100K NVIDIA Vera Rubin GPU, $6B 확장 의향',
   '9/3 Figure AI와 AI 인프라 기업 Nscale이 $3.5B 규모 전략적 컴퓨트 파트너십 체결. 최대 100,000 NVIDIA Vera Rubin GPU 배치. 2027 H2 Texas Barstow 데이터센터 가동 예정. $6B 이상 확장 의향. Nscale이 Figure에 전략적 지분 투자. Nscale 공급망에 휴머노이드 로봇 활용 탐색.',
   '2026-09-20'::timestamp, 'pending'),

-- 3. [Info] Agility Robotics — Analyst & Investor Day 10/6 NYC, SPAC Q4 2026 마감
  (gen_random_uuid(), 'BusinessWire / SEC Filing',
   'https://www.businesswire.com/news/home/20260917748768/en/Agility-to-Host-Analyst-Investor-Day-on-October-6-2026',
   '[Info] Agility Analyst & Investor Day 10/6 NYC 개최 — Digit 5 로드맵·재무 발표, AGLT 티커 Q4 상장',
   '9/17 발표: Agility가 10/6 NYC에서 Analyst & Investor Day 개최 예정. Digit 5, 기술 로드맵, 상업적 모멘텀, 제조·운영 모델, 장기 재무 프로파일 논의. Churchill Capital XI SPAC 합병 Q4 2026 마감 예상, Nasdaq 티커 AGLT로 거래 예정.',
   '2026-09-20'::timestamp, 'pending'),

-- 4. [Info] Agibot 공동창업자 — 휴머노이드 "GPT-3.5 모먼트" 3~5년 내 도래 전망
  (gen_random_uuid(), 'Fortune / Counterpoint Research',
   'https://fortune.com/2026/09/14/humanoids-gpt-3-5-moment-agibot/',
   '[Info] Agibot 야오마오칭 공동창업자: 휴머노이드 "GPT-3.5 모먼트" 3~5년 내 — Counterpoint H1 9,700대',
   '9/14 Fortune Leaders Forum(마카오)에서 Agibot 공동창업자 야오마오칭이 체화지능이 3~5년 내 "GPT-3.5 모먼트" 도달 전망. 80~90% 성공률로 일상 태스크 수행 가능 시점. Counterpoint Research 8월 발표: Agibot H1 2026 9,700대 출하(Omdia 8,400대보다 높은 추정). 글로벌 휴머노이드 시장 선두 유지.',
   '2026-09-20'::timestamp, 'pending'),

-- 5. [Info] Tesla Optimus — Giga Texas 로봇 전용 공장 건설 가속, 9/9 드론 촬영
  (gen_random_uuid(), 'Basenor / Electrek / Drone footage',
   'https://www.basenor.com/blogs/news/tesla-optimus-v3-production-starts-this-summer-full-timeline',
   '[Info] Tesla Optimus Giga Texas 전용 공장 건설 가속 — 착공 6개월 만에 철골 조립 진행',
   '9/9 드론 촬영: Giga Texas Optimus 전용 공장 건설 가속. 착공 6개월 만에 중앙·남측 베이 철골 조립 진행. 연내 15,000대 부품 발주, 9월 1K대/주→연말 2.5K대/주 목표 유지. Gen 3 자체 공장 내부 배치 우선. 외부 판매 2027년 말 이후 전망.',
   '2026-09-20'::timestamp, 'pending'),

-- 6. [Warning] Unitree UnifoLM-X2-1.0 — 세계 최초 완전 자율 휴머노이드 로봇 전투 시연
  (gen_random_uuid(), 'Interesting Engineering / CryptoBriefing / AlphaSignal',
   'https://interestingengineering.com/ai-robotics/humanoid-robot-learns-to-fight-autonomously',
   '[Warning] Unitree UnifoLM-X2-1.0 — 세계 최초 완전 자율 휴머노이드 전투 시연, 월드모델 기반',
   '9/7 Unitree가 세계 최초 완전 자율 휴머노이드 로봇 전투 영상 공개. UnifoLM-X2-1.0 월드-액션 모델이 텔레오퍼레이션/스크립트 없이 실시간으로 상대 동작 예측·대응. UnifoLM-WMA-0(오픈소스 비디오 디퓨전 월드모델) 기반. 논문·벤치마크 미공개. 누적 18,000대+ 출하(7월 기준). 수익 흑자 전환.',
   '2026-09-20'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Figure AI] Helix 2.5 — 30 homes zero-shot
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Helix 2.5: Zero-Shot Generalization Across 30 Unseen Homes, 56% Success Rate',
  'Unite.AI / TechTimes / The AI Insider / Startup Fortune',
  'https://www.unite.ai/figure-introduces-helix-2-5-tested-zero-shot-in-30-unseen-homes/',
  '2026-09-17'::timestamp,
  'Figure AI introduced Helix 2.5, a humanoid neural network pretrained on the Index dataset, tested zero-shot across 30 Bay Area homes. 56% success rate (237/420 tasks) vs 9% baseline. Tasks: bed making, towel folding, toy tidying. 50% less task-specific data than Helix 02. Sixfold leap from Index pretraining.',
  'Figure AI introduced Helix 2.5 on September 17, 2026 — a humanoid neural network pretrained on the company''s proprietary Index dataset of human behavior. The model was evaluated across 30 Bay Area homes with zero data collected in any of them (zero-shot). Results: 56% success rate across 237 completed tasks out of 420 attempts, covering bed making, towel folding, and tidying toys in living rooms. An otherwise identical model trained from scratch managed just 9%. The key technical achievement: one fixed checkpoint, same weights, deployed in every single home, letting the robot work out unfamiliar furniture, toys, and towels on its own. Index pretraining raised zero-shot success from 9% to 56%. Helix 2.5 needed 50% less task-specific data than its predecessor Helix 02 to achieve stronger results across 3x as many homes. This demonstrates the scaling hypothesis for robot foundation models: pretrain on broad human behavior data, then fine-tune with minimal task-specific data. Implications for home robotics: a general-purpose robot brain that transfers across environments without per-home data collection is a critical step toward the $600/month home robot subscription Figure announced.',
  'en', 'technology', 'robot',
  md5('figure-helix-2.5-30-homes-zero-shot-56pct-2026-09-20'),
  '{"mentionedCompanies":["Figure AI"],"mentionedRobots":["Figure 03"],"technologies":["Helix 2.5","Index dataset","zero-shot generalization","foundation model"],"marketInsights":["56% zero-shot success","6x improvement over baseline","50% less data needed","30 unseen homes"],"keyPoints":["Sep 17 announcement","Bed making + towel folding + toy tidying","One checkpoint all homes","Scaling hypothesis validated"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-helix-2.5-30-homes-zero-shot-56pct-2026-09-20'));

-- [Figure AI] Nscale $3.5B compute partnership
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI and Nscale Sign $3.5B Compute Partnership for 100,000 NVIDIA Vera Rubin GPUs',
  'Unite.AI / eWeek / Securities.io / Compare the Cloud',
  'https://www.unite.ai/nscale-figure-ink-3-5b-deal-for-up-to-100000-vera-rubin-gpus/',
  '2026-09-03'::timestamp,
  'Figure AI signed $3.5B strategic compute partnership with Nscale for up to 100,000 NVIDIA Vera Rubin GPUs. Deployment begins H2 2027 in Barstow, Texas. Intent to scale to $6B+. Nscale takes equity stake in Figure. Partnership explores using humanoid robots in Nscale supply chain.',
  'Figure AI announced on September 3, 2026, a strategic partnership with AI infrastructure provider Nscale to deploy the NVIDIA Vera Rubin platform across up to 100,000 GPUs. Initial commitment: $3.5 billion of compute, with stated intent to scale to over $6 billion. Deployment timeline: second half of 2027 in Barstow, Texas data center. As part of the agreement, Nscale is making a strategic equity investment in Figure. The parties will explore potential to scale Nscale''s supply chain with humanoid robots — creating a mutual value loop. This deal represents the largest known compute commitment by a humanoid robotics company, underscoring Figure''s bet that scaling compute for embodied AI training is a key differentiator. Combined with the Series C ($1B+ at $39B valuation) and the Helix 2.5 results, Figure is building a vertically integrated AI-compute-manufacturing stack. The NVIDIA Vera Rubin platform is NVIDIA''s next-generation rack-scale AI system, successor to Blackwell.',
  'en', 'business', 'robot',
  md5('figure-nscale-3.5b-vera-rubin-100k-gpu-2026-09-20'),
  '{"mentionedCompanies":["Figure AI","Nscale","NVIDIA"],"mentionedRobots":["Figure 03"],"technologies":["NVIDIA Vera Rubin","rack-scale AI"],"marketInsights":["$3.5B compute deal","100K GPUs","$6B expansion intent","Nscale equity in Figure"],"keyPoints":["Sep 3 announcement","H2 2027 deployment","Barstow Texas data center","Largest robotics compute deal"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-nscale-3.5b-vera-rubin-100k-gpu-2026-09-20'));

-- [Agility] Investor Day Oct 6
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Robotics Announces Analyst & Investor Day October 6 Ahead of SPAC Listing',
  'BusinessWire / SEC Filing / RoboticsTomorrow',
  'https://www.businesswire.com/news/home/20260917748768/en/Agility-to-Host-Analyst-Investor-Day-on-October-6-2026',
  '2026-09-17'::timestamp,
  'Agility Robotics announced Analyst & Investor Day on October 6, 2026 in NYC. Leadership to present Digit 5 roadmap, commercial momentum, manufacturing model, and long-term financials. SPAC merger with Churchill Capital XI (CCXI) expected Q4 2026 close, trading as AGLT on Nasdaq.',
  'Agility Robotics announced on September 17, 2026, that it will host its Analyst & Investor Day on Tuesday, October 6, 2026, beginning at 12:30 p.m. ET in New York City. Agility leadership will present and discuss: Digit 5 capabilities and technology roadmap, commercial momentum and customer pipeline, market opportunity sizing, manufacturing and operating model, scaling strategy, and long-term financial profile. The event comes as Agility prepares to close its SPAC merger with Churchill Capital Corp XI (NASDAQ: CCXI) in Q4 2026. Post-merger, the combined company will trade on Nasdaq under ticker symbol AGLT. Deal details: $2.5B enterprise value, ~$420M trust + $200M Foxconn PIPE = $620M+ gross proceeds. Agility will become the first publicly traded US company dedicated solely to humanoid robots. Current status: $300M+ multi-year Digit 5 orders, customers including Schaeffler, GXO, Toyota Canada, Mercado Libre. RoboFab capacity: 10,000 units/year.',
  'en', 'business', 'robot',
  md5('agility-investor-day-oct6-spac-aglt-2026-09-20'),
  '{"mentionedCompanies":["Agility Robotics","Churchill Capital","Foxconn"],"mentionedRobots":["Digit 5"],"technologies":[],"marketInsights":["Investor Day Oct 6 NYC","AGLT ticker Nasdaq","$2.5B SPAC Q4 close","$300M+ orders"],"keyPoints":["Sep 17 announcement","First US pure humanoid IPO","Long-term financial profile reveal","10K units/yr capacity"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-investor-day-oct6-spac-aglt-2026-09-20'));

-- [Agibot] GPT-3.5 moment + Counterpoint data
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agibot Co-founder: Humanoids Will Have "GPT-3.5 Moment" in 3-5 Years; Counterpoint Counts 9,700 H1 Units',
  'Fortune / Counterpoint Research / SCMP',
  'https://fortune.com/2026/09/14/humanoids-gpt-3-5-moment-agibot/',
  '2026-09-14'::timestamp,
  'Agibot co-founder Yao Maoqing at Fortune Leaders Forum (Macau, Sep 8): embodied AI will reach "GPT-3.5 moment" in 3-5 years — 80-90% success rate on everyday tasks. Counterpoint Research (Aug): Agibot shipped 9,700 units in H1 2026 (vs Omdia 8,400), maintaining global #1 position. HK IPO process ongoing.',
  'At the Fortune Leaders Forum in Macau on September 8, 2026, Agibot co-founder Yao Maoqing predicted that embodied AI will reach a "GPT-3.5 moment" within a 3-to-5-year window. The reference is to OpenAI''s ChatGPT model which first achieved 80-90% success rate on common everyday tasks — Yao believes humanoid robots will reach a similar inflection point where general-purpose physical tasks become reliably executable. Counterpoint Research data released in late August 2026 counts Agibot at 9,700 units shipped during H1 2026, higher than the earlier Omdia estimate of 8,400 units. This confirms Agibot''s position as the global #1 humanoid robot vendor by volume. Hong Kong IPO process remains ongoing with CICC, CITIC Securities, and Morgan Stanley as joint bookrunners. Target valuation HK$40-50B ($5.1-6.4B). Strategic investors include LG Electronics, BYD, Mirae Asset, and Hillhouse. The "GPT-3.5 moment" framing is strategically timed ahead of the IPO — positioning Agibot at the inflection point of the industry.',
  'en', 'industry', 'robot',
  md5('agibot-gpt35-moment-counterpoint-9700-2026-09-20'),
  '{"mentionedCompanies":["Agibot","LG Electronics","BYD","Hillhouse","OpenAI"],"mentionedRobots":["Genie G2"],"technologies":["embodied AI","GPT-3.5 moment"],"marketInsights":["9,700 units H1 2026 (Counterpoint)","Global #1 humanoid vendor","HK IPO ongoing","$5.1-6.4B target"],"keyPoints":["Sep 8 Fortune Leaders Forum","3-5 year inflection","80-90% task success rate vision","Higher than Omdia 8,400 estimate"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-gpt35-moment-counterpoint-9700-2026-09-20'));

-- [Tesla] Giga Texas Optimus factory construction
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus Giga Texas Factory Construction Accelerating: Steel Assembly 6 Months Post-Groundbreaking',
  'Basenor / Electrek / Drone footage',
  'https://www.basenor.com/blogs/news/tesla-optimus-v3-production-starts-this-summer-full-timeline',
  '2026-09-09'::timestamp,
  'September 9 drone footage shows Tesla Giga Texas Optimus dedicated factory construction accelerating. Mid and south bays steel assembly progressing 6 months after groundbreaking. 15,000 unit parts ordered for 2026. Production ramp: 1K/week Sep → 2.5K/week year-end. Gen 3 internal deployment priority. External sales 2027+.',
  'September 9, 2026 drone footage reveals accelerated construction of Tesla''s dedicated Optimus robot factory at Giga Texas. Six months after groundbreaking, the mid and south bays are showing significant steel assembly progress. Production context: Tesla has ordered parts for approximately 15,000 Optimus Gen 3 units for 2026 delivery. Ramp schedule: ~1,000 units/week by September, targeting 2,500 units/week by year-end. Current strategy: Gen 3 robots are deployed exclusively within Tesla''s own factories for internal operations. The former Fremont Model S/X line (46 days to disassemble) has been converted. Gen 3 specs: 173cm height, 57kg weight, 22 DOF hands with 50 actuators, AI5 inference chip (taped out April 2026, ~5x memory bandwidth of predecessor), 2.3 kWh battery, Grok voice integration. External consumer sales target: end of 2027 at earliest, analyst consensus 2028-2029. Target price: sub-$30,000 at scale (Musk has referenced $20,000-$25,000 range).',
  'en', 'business', 'robot',
  md5('tesla-optimus-giga-texas-factory-construction-sep9-2026-09-20'),
  '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus Gen 3","Optimus V3"],"technologies":["AI5 chip","Grok voice","50 actuators hand"],"marketInsights":["15K units parts ordered 2026","1K/wk Sep→2.5K/wk year-end","Giga Texas factory 6mo progress","External sales 2027+"],"keyPoints":["Sep 9 drone footage","Steel assembly accelerating","Internal deployment priority","Sub-$30K target at scale"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-giga-texas-factory-construction-sep9-2026-09-20'));

-- [Unitree] UnifoLM-X2-1.0 autonomous combat
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree UnifoLM-X2-1.0: World First Fully Autonomous Humanoid Robot Combat Demo',
  'Interesting Engineering / CryptoBriefing / AlphaSignal / Robotic Gizmos',
  'https://interestingengineering.com/ai-robotics/humanoid-robot-learns-to-fight-autonomously',
  '2026-09-07'::timestamp,
  'Unitree demonstrated world''s first fully autonomous humanoid robot combat on Sep 7, 2026. UnifoLM-X2-1.0 world-action model enables real-time prediction and reaction without teleoperation or scripts. Built on open-source UnifoLM-WMA-0 video-diffusion world model. No paper/benchmarks released. 18,000+ units shipped as of July.',
  'On September 7, 2026, Unitree Robotics released video showing two humanoid robots sparring without any remote control — the world''s first fully autonomous humanoid robot combat demonstration. The system driving them is UnifoLM-X2-1.0, a real-time world-action model that predicts near-future physical interactions and plans actions on the fly. Unlike previous Unitree robot fights (which were remote-controlled), this demo uses the world model to read opponent movements, predict next moves, and execute responses instantly while maintaining balance. Technical foundation: builds on UnifoLM-WMA-0, an open-source video-diffusion world model with an action head. Important caveats: no paper, latency figures, or benchmarks released; open-sourcing of X2-1.0 unconfirmed. Company milestones: 18,000+ humanoid units shipped as of July 2026 (up from 15,000 reported in June). Company turned profitable. STAR Market IPO (688836.SH) August 19 saw +460% Day 1, 8,000x oversubscribed, ~$53B market cap. G1+ launched Sep 15 with 6 upgrades at ¥95,000. Annual production target: 20,000 units.',
  'en', 'technology', 'robot',
  md5('unitree-unifolm-x2-autonomous-combat-2026-09-20'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","G1+","H2"],"technologies":["UnifoLM-X2-1.0","world-action model","video-diffusion","autonomous combat"],"marketInsights":["18,000+ units shipped","Turned profitable","$53B market cap","20K annual target"],"keyPoints":["Sep 7 demo","First autonomous humanoid combat","No teleoperation or scripts","No benchmarks yet"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-unifolm-x2-autonomous-combat-2026-09-20'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Figure AI Helix 2.5
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'technology', 'warning',
   'Figure AI Helix 2.5 — 30가구 제로샷 56% 성공, Index 프리트레이닝 6배 향상',
   'Helix 2.5 30개 미방문 가정 제로샷 테스트. 56% 성공률(baseline 9% 대비 6배). 침대·수건·장난감. 가정용 로봇 AI 범용화 이정표.',
   '{"company":"Figure AI","robot":"Figure 03","event":"helix_2.5_launch","zero_shot_success":"56%","homes_tested":30,"baseline":"9%","improvement":"6x","confidence":"A"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Helix 2.5%');

-- Figure AI Nscale $3.5B
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'warning',
   'Figure AI × Nscale $3.5B 컴퓨트 딜 — 100K Vera Rubin GPU, $6B 확장 의향',
   '$3.5B 컴퓨트 파트너십. 100K NVIDIA Vera Rubin GPU. 2027 H2 Texas 가동. $6B 확장 의향. Nscale 지분투자. 로봇업계 최대 컴퓨트 딜.',
   '{"company":"Figure AI","event":"compute_partnership","partner":"Nscale","amount":"$3.5B","gpus":"100K Vera Rubin","scale_to":"$6B","confidence":"A"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Nscale%3.5B%');

-- Agility Investor Day
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   'Agility Investor Day 10/6 NYC — SPAC Q4 마감, AGLT 티커 Nasdaq 상장',
   '10/6 NYC Analyst & Investor Day. Digit 5 로드맵·재무 공개. SPAC Q4 마감, Nasdaq AGLT. 최초 순수 휴머노이드 미국 상장사.',
   '{"company":"Agility Robotics","event":"investor_day","date":"2026-10-06","ticker":"AGLT","exchange":"Nasdaq","confidence":"A"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Investor Day%10/6%');

-- Agibot GPT-3.5 moment
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'technology', 'info',
   'Agibot 공동창업자: 휴머노이드 "GPT-3.5 모먼트" 3~5년 — Counterpoint H1 9,700대',
   '야오마오칭: 체화지능 3~5년 내 GPT-3.5급 도달(80~90% 성공률). Counterpoint: H1 9,700대(Omdia 8,400 상회). 글로벌 1위 유지.',
   '{"company":"Agibot","event":"industry_forecast","forecast":"GPT-3.5 moment in 3-5yr","h1_units_counterpoint":"9,700","confidence":"A"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%GPT-3.5 모먼트%');

-- Tesla Optimus factory
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Tesla Optimus Giga Texas 전용 공장 건설 가속 — 착공 6개월 철골 진행',
   '9/9 드론 촬영: Giga Texas 전용 공장 철골 조립 가속. 15K대 부품 발주 유지. 1K→2.5K대/주 램프. Gen 3 내부 배치 우선.',
   '{"company":"Tesla","robot":"Optimus Gen 3","event":"factory_construction","milestone":"steel_assembly_6mo","production_target":"15K 2026","confidence":"B"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Tesla%Giga Texas%전용 공장%');

-- Unitree UnifoLM
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'technology', 'warning',
   'Unitree UnifoLM-X2-1.0 — 세계 최초 완전 자율 휴머노이드 전투, 18K대+ 출하',
   '9/7 세계 최초 완전 자율 휴머노이드 전투 시연. 월드모델 기반 실시간 예측·대응. 18K대+ 출하(7월). 논문 미공개.',
   '{"company":"Unitree","event":"autonomous_combat_demo","model":"UnifoLM-X2-1.0","units_shipped":"18,000+","no_paper":true,"confidence":"B"}'::jsonb,
   false, '2026-09-20'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%UnifoLM%');


-- ============================================================
-- 4. ci_staging: 스테이징 (검증 대기)
-- ============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "helix_2.5", "new_value": "Helix 2.5: 30가구 제로샷 56% 성공률, Index 프리트레이닝 6배 향상, task-specific 데이터 50% 감소", "source": "Unite.AI / TechTimes 2026-09-17", "reliability": "A"}, {"field": "compute_partnership", "new_value": "Nscale $3.5B 컴퓨트 딜: 100K Vera Rubin GPU, $6B 확장 의향, 2027 H2 Texas", "source": "Unite.AI / eWeek 2026-09-03", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Helix 2.5%Nscale%3.5B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "investor_day", "new_value": "Analyst & Investor Day 10/6 NYC, Digit 5 로드맵·재무 공개, SPAC Q4 마감 AGLT 티커", "source": "BusinessWire 2026-09-17", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Investor Day%10/6%AGLT%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "industry_forecast", "new_value": "공동창업자 야오마오칭: 체화지능 GPT-3.5 모먼트 3~5년, 80~90% 성공률 도달 전망", "source": "Fortune 2026-09-14", "reliability": "A"}, {"field": "h1_units_counterpoint", "new_value": "Counterpoint Research H1 2026 출하 9,700대 (Omdia 8,400 상회), 글로벌 1위", "source": "Counterpoint Research 2026-08", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%GPT-3.5 모먼트%Counterpoint%9,700%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "factory_construction", "new_value": "Giga Texas 전용 공장 착공 6개월 만에 철골 조립 가속(9/9 드론), 15K대 부품 발주 유지", "source": "Basenor / Electrek 2026-09-09", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Giga Texas%전용 공장%철골%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "world_model", "new_value": "UnifoLM-X2-1.0 세계 최초 완전 자율 휴머노이드 전투 시연(9/7), 논문 미공개", "source": "Interesting Engineering / CryptoBriefing 2026-09-07", "reliability": "B"}, {"field": "total_shipments", "new_value": "누적 18,000대+ 출하(7월 기준), 수익 흑자 전환", "source": "Multiple sources", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%UnifoLM-X2%18,000%' AND created_at::date = CURRENT_DATE);

COMMIT;
