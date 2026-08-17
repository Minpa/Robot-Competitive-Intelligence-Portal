-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-17
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요: psql $DATABASE_URL -f scripts/ci-update-2026-08-17.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Unitree 688836.SH 상장 거래 개시 (8/17-21 예상)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Value Add VC / VT Markets / Gasgoo',
   'https://valueaddvc.com/unitree-ipo-tracker',
   '[Critical] Unitree 688836.SH STAR Market 거래 개시: 8/17-21 예상 — 중국 최초 순수 휴머노이드 상장',
   '8/10 온·오프라인 청약, 8/12 납입 완료. SSE 최종 상장일 8/17-21 사이 예상. 공모가 150.80위안/주, 밸류에이션 ~$9B, 조달 $904M(61억위안). 발행 주식 4,045만주(상장 후 자본금의 10%). H1 2026 매출 10.5-11.3억위안(YoY +35-45%), 2025년 5,500 휴머노이드 출하, 매출총이익률 ~60%. A주 최초 휴머노이드 전문 상장사.',
   '2026-08-17'::timestamp, 'pending'),

-- 2. Tesla Optimus: 프리몬트 전용 생산라인 8월 중 가동 시작 — 생산 수량 0에서 출발
  (gen_random_uuid(), 'Teslarati / TechTimes / Optimusk.blog',
   'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
   'Tesla Optimus V3: 프리몬트 전용 생산라인 8월 가동 개시, 초기 생산 "극도로 느림" 예고',
   '프리몬트 Model S/X 라인 46일 만에 철거 → Optimus 전용 라인 전환 완료. 8월 중 저속 생산 시작 예정이나, Q2 실적 기준 공식 생산 수량 0대. 10,000종 고유 부품, 전면 신규 공급망. Musk: "생산 속도 예측 불가능". 공장 내 1,000대+ Gen 3 운영 중(배터리 조립, 부품 핸들링). 2026 공식 목표 50,000-100,000대(현 진도 기준 달성 불확실). Giga Texas 2번째 공장 건설 중(2027 여름 가동, 10M/년 설계).',
   '2026-08-17'::timestamp, 'pending'),

-- 3. Figure AI: BMW Leipzig(독일) 최초 유럽 배치 확정, Catalyst 물류 계약
  (gen_random_uuid(), 'BMW Group Press / iiot-world',
   'https://www.press.bmwgroup.com/global/article/detail/T0455864EN/bmw-group-to-deploy-humanoid-robots-in-production-in-germany-for-the-first-time',
   'Figure AI: BMW Leipzig(독일) 유럽 최초 휴머노이드 배치 확정 + Catalyst 물류 계약',
   'BMW Group이 독일 Leipzig 공장에 휴머노이드 로봇 최초 도입 발표 — "Physical AI 유럽 진출" 공식화. Spartanburg에서 Figure 02 실적: 90,000+ 부품 적재, 1,250시간 가동, 30,000+ X3 차량, 정확도 >99%, 84초 사이클타임 달성. Figure 03 전환: 40대 투입, pick-and-place → 시퀀싱 고도화. BMW "Center of Competence for Physical AI in Production" 신설. Catalyst 물류(Reno, NV) 배송센터 유상 배치 계약 추가. BotQ 1,000대+ 생산, 1대/시간, 연 12,000대 용량.',
   '2026-08-17'::timestamp, 'pending'),

-- 4. Boston Dynamics: Atlas 2026 생산물량 전량 커밋(Hyundai RMAC + Google DeepMind)
  (gen_random_uuid(), 'Engadget / Boston Dynamics / Automate.org',
   'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
   'BD Atlas: 2026 전량 Hyundai RMAC + Google DeepMind 배정 — 외부 판매 물량 없음',
   'CES 2026 공개 이후 Boston 본사에서 Atlas 즉시 양산 시작. 2026 생산물량 전량 Hyundai RMAC 및 Google DeepMind에 커밋 — 외부 판매 물량 없음. Hyundai Mobis 액추에이터 공급 + 공급망 공동 구축. Atlas 스펙: 리치 7.5ft, 적재 110lbs(50kg), 운용 온도 -20°C~40°C. Google DeepMind 파운데이션 모델 통합으로 인지 능력 강화. Gemini Robotics 2(8/8 출시)와 연계: 전신 VLA + On-Device 2 경량 모델.',
   '2026-08-17'::timestamp, 'pending'),

-- 5. Agility Robotics: SPAC S-4 심사 진행, 틱커 AGLT 예정 — 연내 NASDAQ 상장 목표
  (gen_random_uuid(), 'GeekWire / TechCrunch / Robot Report',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   'Agility Robotics SPAC: S-4 심사 중, 틱커 AGLT — 연내 NASDAQ 상장 추진',
   '7/14 S-4 등록서류 SEC 제출. Churchill Capital Corp XI(CCXI)와 $2.5B 합병, 틱커 AGLT로 NASDAQ 상장 예정(연내 마감 목표). $620M+ 조달(PIPE $200M 포함). GXO에서 전년 100,000+ 토트 이동 실적. Digit v5 NVIDIA Halos 안전 시스템 통합 — 물리 AI 최초 Halos 적용 사례. 고객: Schaeffler, GXO, Toyota Canada, Mercado Libre, Spanx, Amazon. RoboFab 연 10,000대 생산 용량.',
   '2026-08-17'::timestamp, 'pending'),

-- 6. Apptronik: Apollo 3 "진정한 상용 제품" 1년 내 출시 목표, Gemini Robotics 2 통합
  (gen_random_uuid(), 'eWeek / Robotics 24-7 / SiliconAngle',
   'https://www.eweek.com/news/apptronik-robot-park-apollo-2-humanoid-robot/',
   'Apptronik: Apollo 3 = "진정한 상용 제품" 12개월 내 출시 목표, Gemini Robotics 2 통합',
   'Apollo 2 Robot Park(90,000sqft)에서 산업 데이터 대규모 수집 가속. Google DeepMind Gemini Robotics 2(8/8 출시)와 통합 — 전신 VLA 모델로 자율성 강화. Apollo 3 = "첫 진정한 상용 제품"으로 12개월 내 출시 목표. Mercedes-Benz·GXO·Jabil 현장 파일럿. 총 조달 ~$1B(Series A $935M+, $5B 밸류에이션). 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority.',
   '2026-08-17'::timestamp, 'pending'),

-- 7. 1X NEO: 소비자 출하 2026년 말 유지, 2027년 100K/년 스케일업 계획
  (gen_random_uuid(), 'Forbes / 1X Technologies / eWeek',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '1X NEO: Hayward 풀 프로덕션 가동, 소비자 출하 2026말 — 2027 100K/년 스케일업',
   'Hayward 공장 4/30 풀 프로덕션 개시(58K sqft, 200+ 직원). 연 10,000대 생산 용량, 초년 물량 5일 만에 전량 프리오더 완판. San Carlos 2공장 건설 중 → 2027 100K/년 목표. 소비자 출하 2026년 말 유지. 가격 $20K 또는 $499/월. 25-DoF 텐던 핸드(IP68, 촉각 센서) 7/9 출하. World Model Lab(6/4): 자체 AGI 경로 추구. EQT 파트너십 10,000대 B2B(물류·제조·헬스케어, 2026-2030).',
   '2026-08-17'::timestamp, 'pending'),

-- 8. Agibot: HK IPO 8월 상장 추진, Fulin Precision 100대 규모 공장 배치 계약
  (gen_random_uuid(), 'TechNode / Gasgoo / SCMP',
   'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
   'Agibot: HKEX IPO 8월 상장 추진 중 — Fulin Precision ~100대 배치 계약 체결',
   '7/27 HKEX IPO 프로세스 개시. CICC·CITIC·Morgan Stanley 주관. 밸류에이션 HK$40-50B($5.1-6.4B), 15-25% 지분 매각, $1B+ 조달 목표. Fulin Precision Engineering과 수천만 위안 규모 계약 — ~100대 Yuanzheng 로봇 공장 배치. 누적 15,000대 출하. 2025 매출 10.5억위안(전년 대비 20배). Xi Jinping 주석 현장 시찰. 투자자: Tencent, HongShan, LG전자, Mirae Asset, BYD, Hillhouse. 01.AI MOU(4/17): 엔터프라이즈 에이전트 + 임바디드 인텔리전스 글로벌 확장.',
   '2026-08-17'::timestamp, 'pending'),

-- 9. [Industry] BYD 휴머노이드 로봇 8월 공개 예정 — 자동차 OEM 진입 가속
  (gen_random_uuid(), 'CnEVPost / Skycrumbs',
   'https://cnevpost.com/2026/07/28/byd-confirms-plan-humanoid-robot-aug/',
   '[Industry] BYD 8월 중 자체 휴머노이드 로봇 공개 예정 — 자동차 OEM 진입 가속',
   'BYD가 7/28 8월 중 자체 휴머노이드 로봇 공개 계획 확인. 기존 Agibot 투자자에서 자체 개발로 전환. Tesla·Hyundai에 이어 자동차 OEM의 휴머노이드 직접 개발 3번째 사례. EV 배터리·모터·전력 전자 기술 전용 가능성. 중국 SAMR: H1 2026 휴머노이드 관련 신규 기업 116,000개(YoY +9.5%), 10만대 양산 시대 진입.',
   '2026-08-17'::timestamp, 'pending'),

-- 10. [Regulatory] EU AI Act 고위험 AI 8월 전면 시행 + 미국 ASTM 휴머노이드 표준 진행
  (gen_random_uuid(), 'RoboticsBiz / European Commission / Skycrumbs',
   'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
   '[Regulatory] EU AI Act 고위험 전면 시행(8월) + ASTM WK73939 휴머노이드 표준 비준 추진',
   'EU AI Act 고위험 AI 시스템 조항 2026년 8월 전면 적용 — 산업용 휴머노이드 포함. 미준수 시 최대 €35M 또는 글로벌 매출 7% 과징금. ASTM WK73939(미국) 및 ISO 25785-1(국제) 휴머노이드 전용 안전 표준 2027 비준 예정. 12월 개정 제조물책임지침(PLD), 2027.1 기계규정 2023/1230 연속 시행. NVIDIA Halos(Agility Digit v5 론치 파트너)가 산업계 안전 표준 선점 움직임.',
   '2026-08-17'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] STAR Market 거래 개시 임박
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Unitree 688836.SH STAR Market Trading Debut Expected Aug 17-21; First Pure-Play Humanoid IPO on A-Shares',
  'Value Add VC / VT Markets / BigGo Finance',
  'https://valueaddvc.com/unitree-ipo-tracker',
  '2026-08-17'::timestamp,
  'Unitree (688836.SH) trading debut on STAR Market expected Aug 17-21, 2026. Online/offline subscriptions completed Aug 10, payment by Aug 12. IPO price ¥150.80/share, ~$9B valuation, $904M raised. 40.45M shares issued (10% post-IPO). First pure-play humanoid robot listed on A-shares. Fastest STAR Market registration in history (104 days). H1 2026 revenue ¥1.05-1.13B (YoY +35-45%). Current products: G1 $13,500, H2 $29,900, H1 $90,000.',
  'Unitree 688836.SH STAR Market IPO: trading debut expected between August 17-21, 2026. Subscriptions Aug 10, payment Aug 12. Price ¥150.80/share, $9.04B valuation, $904M raised via 40.45M new shares (10% post-IPO capital). 104-day record SSE registration. China first A-share pure-play humanoid robotics stock. 2025: 5,500 humanoids shipped, RMB 1.69B revenue, ~60% gross margins, adjusted profitable. H1 2026 projected: ¥1.05-1.13B revenue (35-45% YoY growth). BLE security vulnerability (UniPwn) disclosed Sept 2025, majority fixed. G1 autonomous kung fu demo, -47°C Altay cold-weather test Feb 2026.',
  'en', 'industry', 'robot',
  md5('unitree-star-market-trading-debut-aug17-21-2026-08-17'),
  '{"mentionedCompanies":["Unitree Robotics"],"mentionedRobots":["G1","H1","H2"],"technologies":[],"marketInsights":["STAR Market debut Aug 17-21","$9.04B valuation","$904M raised","first A-share humanoid IPO","104-day record registration"],"keyPoints":["Trading debut Aug 17-21","First pure-play humanoid on A-shares","H1 2026 revenue ¥1.05-1.13B"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Unitree%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-star-market-trading-debut-aug17-21-2026-08-17'));

-- [Figure AI] BMW Leipzig 유럽 최초 배치 + Catalyst 물류 계약
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'BMW Deploys Humanoid Robots at Leipzig Plant — First in Europe; Figure AI Signs Catalyst Logistics Deal',
  'BMW Group Press / iiot-world',
  'https://www.press.bmwgroup.com/global/article/detail/T0455864EN/bmw-group-to-deploy-humanoid-robots-in-production-in-germany-for-the-first-time',
  '2026-08-15'::timestamp,
  'BMW Group announces first humanoid robot deployment in Germany at Plant Leipzig, establishing "Center of Competence for Physical AI in Production". Builds on Spartanburg success: Figure 02 achieved >99% placement accuracy, 84-sec cycle time, 90,000+ parts loaded across 1,250 hours. Figure 03 (40 units at BMW) upgraded to sequencing tasks. Catalyst logistics (Reno, NV) signed as paid deployment customer. BotQ production: 1,000+ Figure 03 produced, 1 unit/hour rate.',
  'BMW Group expands humanoid robot deployments to Germany for the first time — Plant Leipzig selected for pilot under new Center of Competence for Physical AI in Production. Spartanburg track record: Figure 02 >99% accuracy, 84-sec cycle time, 90K+ parts, 1,250 hrs, 30K+ X3 vehicles. 40 Figure 03 at Spartanburg upgraded from pick-and-place to sequencing. Figure AI Catalyst logistics partnership: paid deployment at Reno, NV distribution center (announced May 2026). BotQ: 1,000th Figure 03 produced July 23, 1 robot/hour production cadence, 12,000/year designed capacity. UPS confirmed as customer. Total funding $1.9B at $39B valuation.',
  'en', 'product', 'robot',
  md5('bmw-leipzig-figure-ai-europe-first-catalyst-2026-08-17'),
  '{"mentionedCompanies":["Figure AI","BMW","Catalyst","UPS"],"mentionedRobots":["Figure 02","Figure 03"],"technologies":["Physical AI","sequencing automation","Helix AI VLA"],"marketInsights":["First humanoid deployment in Germany","BMW CoC for Physical AI","Catalyst logistics paid deal","1000+ Figure 03 produced"],"keyPoints":["BMW Leipzig first European humanoid deployment","Center of Competence for Physical AI","Catalyst Reno paid deployment"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Figure%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('bmw-leipzig-figure-ai-europe-first-catalyst-2026-08-17'));

-- [Tesla] Optimus 프리몬트 생산 현황 업데이트
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'Tesla Optimus V3 Fremont Production Line Fires Up August 2026 — Official Output Count Remains Zero',
  'Teslarati / TechTimes / Optimusk.blog',
  'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
  '2026-08-17'::timestamp,
  'Tesla Optimus V3 dedicated Fremont production line expected to begin low-rate output in August 2026. Model S/X line torn down in 46 days for conversion. 1,000+ Gen 3 operating internally (battery assembly, cable routing, parts handling). Official Q2 production count: 0 units. 10,000 unique parts with no established supply chain — Musk warns initial ramp "long and flat". 2026 official target: 50,000-100,000 units (achievement uncertain). First external B2B late 2026, consumer 2027+. Giga Texas second factory under construction for 10M/year (Summer 2027 start). Capex >$20B in 2026 — highest ever, predominantly for Optimus and AI.',
  'Tesla Optimus V3 Fremont dedicated production line: August 2026 low-rate start. Model S/X line decommissioned in 46 days (May 2026). 1,000+ Gen 3 operating at Fremont: battery assembly, EV pack loading, cable routing, connector seating, parts handling. Q2 2026 earnings: official production count 0 — no units delivered outside Tesla. 10,000 unique parts, entirely new supply chain. Samsung, TSMC, Panasonic, Micron as key suppliers. Musk: production speed "literally impossible to predict." 2026 target: 50K-100K units. Giga Texas 2nd factory: 10M/year capacity, Summer 2027 volume production. 2026 capex >$20B, highest in Tesla history. V3 specs: 173cm, 57kg, 72+ DOF, 22 DOF/hand, AI5 chip + xAI Grok voice. External B2B late 2026, consumer end-2027.',
  'en', 'product', 'robot',
  md5('tesla-optimus-v3-fremont-aug-production-2026-08-17'),
  '{"mentionedCompanies":["Tesla","Samsung","TSMC","Panasonic","Micron","xAI"],"mentionedRobots":["Optimus V3","Optimus Gen 3"],"technologies":["AI5 chip","xAI Grok","cable routing automation"],"marketInsights":["Q2 production count: 0","50K-100K 2026 target uncertain","Giga Texas 10M/year 2027","capex >$20B"],"keyPoints":["Fremont line fires up August","Official production 0 units","1000+ Gen 3 internal operation"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Tesla%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-v3-fremont-aug-production-2026-08-17'));

-- [BYD] 자체 휴머노이드 로봇 8월 공개 예정
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'BYD Confirms Plan to Unveil Own Humanoid Robot in August 2026 — Third Auto OEM After Tesla and Hyundai',
  'CnEVPost / Skycrumbs',
  'https://cnevpost.com/2026/07/28/byd-confirms-plan-humanoid-robot-aug/',
  '2026-07-28'::timestamp,
  'BYD confirmed on July 28 plans to unveil its own humanoid robot in August 2026. Third major auto OEM to enter humanoid development after Tesla (Optimus) and Hyundai (via Boston Dynamics). BYD is existing Agibot investor but pivoting to in-house development. Potential to leverage proprietary EV battery, motor, and power electronics technologies. China SAMR reports 116,000 new humanoid-related enterprises registered in H1 2026 (YoY +9.5%), signaling industry approaching 100,000-unit mass production era.',
  'BYD confirms August 2026 humanoid robot unveiling (July 28 announcement). Third auto OEM entering humanoid robotics after Tesla (Optimus) and Hyundai (Boston Dynamics Atlas). Previously invested in Agibot, now developing own platform. Competitive advantage: proprietary EV battery tech (Blade Battery), electric motor expertise, power electronics. China SAMR H1 2026 data: 116,000 new humanoid-related enterprises (YoY +9.5%). Industry approaching 100K-unit annual mass production milestone. Auto OEM convergence trend: Tesla, Hyundai/BD, BYD, Xiaomi (CyberOne) all pursuing humanoid platforms.',
  'en', 'industry', 'robot',
  md5('byd-humanoid-robot-august-unveiling-2026-08-17'),
  '{"mentionedCompanies":["BYD","Tesla","Hyundai","Boston Dynamics","Agibot","Xiaomi"],"mentionedRobots":["Optimus","Atlas","CyberOne"],"technologies":["Blade Battery","EV motor tech"],"marketInsights":["Third auto OEM in humanoids","116K new enterprises H1 2026","industry approaching 100K annual production"],"keyPoints":["BYD humanoid robot August unveiling","Auto OEM convergence trend","China 116K new humanoid enterprises"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%BYD%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('byd-humanoid-robot-august-unveiling-2026-08-17'));

-- [Agibot] HK IPO 프로세스 개시, Fulin 배치 계약
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, company_id, collected_at)
SELECT
  'AgiBot Launches Hong Kong IPO Process with CICC/CITIC/Morgan Stanley; Signs Fulin ~100-Robot Factory Deal',
  'TechNode / Gasgoo / SCMP',
  'https://technode.com/2026/07/27/agibot-starts-hong-kong-ipo-process/',
  '2026-07-27'::timestamp,
  'AgiBot initiated HKEX IPO process on July 27, with CICC, CITIC Securities, and Morgan Stanley as joint sponsors. Target valuation HK$40-50B ($5.1-6.4B), selling 15-25% stake to raise $1B+. Signed multi-million yuan deal with Fulin Precision Engineering for ~100 Yuanzheng robot factory deployment. Cumulative 15,000 robots shipped. 2025 revenue ¥1.05B (20x from 2024). 01.AI strategic MOU for enterprise agents + embodied intelligence global expansion. IPO could land as early as August. Investors include Tencent, HongShan, LG Electronics, Mirae Asset, BYD, Hillhouse.',
  'AgiBot HKEX IPO: filed July 27, 2026. CICC, CITIC Securities, Morgan Stanley as sponsors. Valuation target HK$40-50B ($5.1-6.4B). Selling 15-25% stake, raise $1B+. Fulin Precision Engineering partnership: tens of millions yuan deal for ~100 Yuanzheng robots at Fulin factories. Cumulative shipments: 15,000+ embodied intelligence robots (10,000 by March 2026). 2025 revenue ¥1.05B (20x YoY from ¥60M in 2024). Xi Jinping Shanghai inspection. A3 Ultra (NVIDIA Thor, 51 DOF) Q4 launch. 01.AI MOU (April 17): enterprise agents + embodied intelligence. Singtel MOU for Singapore deployment. UK APC 2026 European debut with RaaS model. "358" plan: ¥10B by 2027, ¥100B by 2030.',
  'en', 'industry', 'robot',
  md5('agibot-hk-ipo-fulin-deal-2026-08-17'),
  '{"mentionedCompanies":["AgiBot","CICC","CITIC","Morgan Stanley","Fulin Precision","01.AI","Singtel","LG Electronics","Tencent","BYD"],"mentionedRobots":["Yuanzheng","A3 Ultra"],"technologies":["NVIDIA Thor","embodied intelligence"],"marketInsights":["HK$40-50B valuation target","$1B+ raise","15K+ robots shipped","2025 revenue 20x YoY"],"keyPoints":["HKEX IPO process initiated","Fulin ~100 robot factory deal","2025 revenue ¥1.05B 20x growth"]}'::jsonb,
  (SELECT id FROM companies WHERE name ILIKE '%Agibot%' OR name ILIKE '%AgiBot%' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agibot-hk-ipo-fulin-deal-2026-08-17'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Unitree 상장 개시
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' LIMIT 1),
  'funding', 'critical',
  '[Unitree] 688836.SH STAR Market 거래 개시 임박 (8/17-21) — $9B A주 최초 휴머노이드',
  'Unitree 688836.SH STAR Market 거래 개시 8/17-21 예상. $9.04B 밸류에이션, $904M 조달 완료. 청약·납입 완료(8/10-12). A주 최초 순수 휴머노이드 상장. H1 2026 매출 ¥1.05-1.13B(YoY +35-45%). 중국 로봇 산업 상장 러시(Unitree STAR, Agibot HKEX 동시 진행).',
  '{"source":"ValueAddVC/VTMarkets/Gasgoo","confidence":"A","date":"2026-08-17","tradingWindow":"Aug 17-21","valuation":"$9.04B","raised":"$904M","shares":"40.45M (10% post-IPO)","h1Revenue":"¥1.05-1.13B","firstAshareHumanoid":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%688836.SH STAR Market 거래 개시 임박%');

-- Alert 2: Figure AI BMW Leipzig 유럽 진출
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure 03%' OR name ILIKE '%Figure%' LIMIT 1),
  'partnership', 'warning',
  '[Figure] BMW Leipzig 유럽 최초 배치 + Catalyst 물류 계약 — 글로벌 확장 가속',
  'BMW Group이 독일 Leipzig 공장에 휴머노이드 최초 도입(유럽 최초). Physical AI CoC 신설. Spartanburg Figure 02: >99% 정확도, 84초 사이클타임. Figure 03 시퀀싱 업그레이드. Catalyst 물류(Reno) 유상 배치. BotQ 1,000대+ 생산. $39B 밸류에이션 대비 매출 근접 0 — 시장 검증 국면.',
  '{"source":"BMW Group Press/iiot-world","confidence":"A","date":"2026-08-15","leipzigDeployment":"first humanoid in Germany","cocPhysicalAI":true,"spartanburgAccuracy":">99%","catalystDeal":"Reno NV paid deployment","botqProduction":"1000+ Figure 03","valuation":"$39B"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%BMW Leipzig 유럽 최초 배치%');

-- Alert 3: BYD 휴머노이드 진입
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'warning',
  '[Industry] BYD 자체 휴머노이드 로봇 8월 공개 — 자동차 OEM 3번째 직접 진입',
  'BYD가 8월 자체 휴머노이드 로봇 공개 예정. Tesla·Hyundai(BD)에 이어 자동차 OEM 3번째 직접 개발. 기존 Agibot 투자자에서 자체 개발 전환. EV 배터리·모터 기술 전용 가능. 자동차 OEM의 휴머노이드 직접 진출 트렌드 가속.',
  '{"source":"CnEVPost/Skycrumbs","confidence":"B","date":"2026-07-28","announcement":"August 2026 unveiling confirmed","oemRank":"3rd after Tesla and Hyundai/BD","previousInvestment":"Agibot investor","evTechLeverage":"battery, motor, power electronics"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%BYD 자체 휴머노이드%');

-- Alert 4: Agibot HK IPO + Fulin 계약
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%A2%' OR name ILIKE '%Agibot%' LIMIT 1),
  'funding', 'critical',
  '[Agibot] HKEX IPO 8월 상장 추진 + Fulin ~100대 공장 배치 계약',
  'Agibot HKEX IPO 프로세스 7/27 개시. CICC·CITIC·Morgan Stanley 주관. 밸류에이션 HK$40-50B($5.1-6.4B), $1B+ 조달. Fulin Precision ~100대 Yuanzheng 배치 계약. 누적 15,000대 출하. 2025 매출 ¥1.05B(전년 20배). LG전자가 투자자로 참여 — 밸류에이션 변동 모니터링 필요.',
  '{"source":"TechNode/Gasgoo/SCMP","confidence":"A","date":"2026-07-27","ipoSponsor":"CICC/CITIC/Morgan Stanley","valuationRange":"HK$40-50B ($5.1-6.4B)","raiseTarget":"$1B+","fulinDeal":"~100 Yuanzheng robots","totalShipped":15000,"revenue2025":"¥1.05B (20x YoY)","lgInvestor":true}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%HKEX IPO 8월 상장 추진%');

-- Alert 5: Tesla Optimus 공식 생산 0대 vs 목표 50-100K
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Optimus%' LIMIT 1),
  'mass_production', 'warning',
  '[Tesla] Optimus V3 프리몬트 8월 생산 개시 — Q2 공식 생산 0대, 목표 50-100K 달성 불확실',
  'Tesla Optimus 프리몬트 전용 라인 8월 저속 가동 시작. 그러나 Q2 실적 기준 공식 생산 수량 0대. 2026 목표 50,000-100,000대 달성 불확실. 10,000종 부품 신규 공급망. 내부 1,000대+ 가동 중이나 외부 배송 전무. 2026 capex >$20B 역대 최대.',
  '{"source":"Teslarati/TechTimes/Optimusk.blog","confidence":"B","date":"2026-08-17","q2ProductionCount":0,"target2026":"50K-100K","internalUnits":"1000+","uniqueParts":10000,"capex2026":">$20B","firstExternalB2B":"late 2026","gigaTexas":"10M/year Summer 2027"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Q2 공식 생산 0대%');

COMMIT;
