-- ============================================================
-- [ARGOS] 경쟁사 데이터 업데이트 — 2026-07-06
-- 자동 수집 by ARGOS War Room Intelligence Bot
-- ============================================================
-- 실행: psql $DATABASE_URL -f scripts/ci-update-2026-07-06.sql
-- 주의: 기존 07-04 업데이트 이후 신규/보완 데이터만 포함
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- ----- Tesla Optimus: Musk 생산팀 방문 + "초기 속도 극도로 느릴 것" 확인 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'info',
       '[UPDATE] Tesla Musk 7/1 Fremont 생산팀 방문 — "초기 생산 극도로 느림", "예측 불가" 언급, 10,000 고유부품',
       'Elon Musk가 7월 1일 Fremont Optimus 생산라인을 방문, 조립 팀과 단체사진 촬영 후 공개. TrendForce 보도: "모든 것이 새로운 만큼 초기 산출량이 극도로 느릴 것"이며 "올해 생산율을 예측하는 것은 말 그대로 불가능"하다고 발언. 10,000개 고유 부품으로 구성된 완전 신규 생산라인이 과제. 장기 목표 연 100만대 유지하나, 2026년 실제 산출은 "수천 대 수준"에 그칠 전망. V3 Optimus는 당분간 Tesla 내부 공장 전용, 외부 판매 시점은 빨라야 2027년 말.',
       '{"source": "TrendForce (July 3, 2026)", "sourceUrl": "https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/", "confidence": "A", "date": "2026-07-03", "event": "Musk visited Fremont assembly line July 1", "quote": "initial output will be extremely slow", "quote2": "literally impossible to predict production rate this year", "uniqueParts": 10000, "realistic2026Output": "low thousands", "longTermTarget": "1M/year", "externalSalesEarliest": "late 2027", "consumerPurchase": "2028-2029 realistic"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Tesla' AND hr.name ILIKE '%Optimus%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Musk 7/1 Fremont 생산팀 방문%'
)
LIMIT 1;

-- ----- Figure AI: Series C $1B+ 조달, $39B 밸류에이션, LG Technology Ventures 참여 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       '[CRITICAL] Figure AI Series C $1B+ 커밋, $39B 밸류에이션 — LG Technology Ventures 참여, BMW Figure 03 확대 배치',
       'Figure AI가 Series C에서 $1B 이상 커밋 확보, 포스트머니 밸류에이션 $39B 달성. Parkway Venture Capital 리드, LG Technology Ventures, NVIDIA, Intel Capital, Brookfield, Macquarie, Salesforce, T-Mobile Ventures, Qualcomm Ventures 등 참여. BMW Group이 6월 Figure 03 확대 배치 발표 — Spartanburg 성공 이후 최신 Figure 03 로봇 추가 도입 결정. Figure 03 스펙: 5ft8, 61kg, 20kg 페이로드, 5시간 배터리(2.3kWh 무선 충전), 스왑 가능. Helix 02: 204,000+ 패키지 163시간 자율 분류.',
       '{"source": "Figure AI Official, Forge Global, BMW", "sourceUrl": "https://www.figure.ai/news/series-c", "confidence": "A", "date": "2026-06", "seriesC": "$1B+ committed", "valuation": "$39B post-money", "leadInvestor": "Parkway Venture Capital", "lgParticipation": "LG Technology Ventures", "keyInvestors": ["Parkway VC", "Brookfield", "NVIDIA", "Macquarie", "Intel Capital", "LG Technology Ventures", "Salesforce", "T-Mobile Ventures", "Qualcomm Ventures"], "bmwExpansion": "Figure 03 expanded deployment after Spartanburg success", "figure03Specs": {"height": "5ft8", "weight_kg": 61, "payload_kg": 20, "battery_hours": 5, "battery_kwh": 2.3, "charging": "wireless swappable"}, "helix02": {"packages": 204000, "hours": 163}}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Figure AI' AND hr.name = 'Figure 03'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%Series C $1B+%$39B%'
)
LIMIT 1;

-- ----- Unitree: 상하이 증시 IPO 신청 + 20K 생산목표 + 4배 생산용량 확대 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'warning',
       '[WARNING] Unitree 상하이 증시 IPO 신청 (3월), $580M 목표 — 2026년 20,000대 생산, 4배 용량 확대, G1 $16K~',
       'Unitree Robotics가 2026년 3월 상하이 증권거래소 IPO 예비심사 신청. 상반기 내 상장 목표, $580M 조달 계획. 2025년 5,500+ G1 출하 (Omdia 추정, 미국 경쟁사 합산 초과). 2026년 목표: 10,000~20,000대 (생산설비 4배 확대). G1 가격대: $16,000(Basic) ~ $73,900(EDU Ultimate D), 16개 구성. Unitree는 현재 가격 대비 성능 최강 포지션. 설날 G1 쿵푸 공연: 완전 자율, 트램폴린 3m 점프, 4m/s 주행.',
       '{"source": "Forbes, Interesting Engineering, botinfo.ai", "sourceUrl": "https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots", "confidence": "B", "date": "2026-06", "ipoExchange": "Shanghai Stock Exchange", "ipoFilingDate": "March 2026", "ipoTarget": "$580M", "ipoListingTarget": "mid-2026", "2025Shipments": "5,500+ (Omdia)", "2026Target": "10,000-20,000", "capacityIncrease": "4x", "g1PriceRange": "$16,000-$73,900", "g1Configurations": 16, "kungfuDemo": {"type": "fully autonomous", "jumpHeight": "3m trampoline", "runSpeed": "4 m/s"}}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Unitree%' AND hr.name ILIKE '%G1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%Unitree 상하이 증시 IPO%$580M%'
)
LIMIT 1;

-- ----- Agility Robotics: NVIDIA Halos 안전 시스템 최초 채택 + 65K 시간 운영 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'info',
       '[INFO] Agility Robotics NVIDIA Halos 안전시스템 최초 채택 — 65K+ 운영시간, 9개 고객사 사이트, Digit v5 준비',
       'Agility Robotics가 NVIDIA 신규 Halos 로봇 안전 시스템 최초 채택 기업으로 확정. Halos: 안전 장벽 없이 인간과 동일 공간 작업 가능하게 하는 안전 플랫폼. 현재 Digit은 9개 고객사 사이트에서 65,000+ 시간 운영 실적 축적. Digit v5: 50 lb 페이로드, 향상된 배터리 수명, 강화된 매니퓰레이션 — "cooperatively safe" 표준 설계. Digit v5는 late 2025/early 2026 출시 예정이었으나 구체 일정 미확인.',
       '{"source": "originofbots.com, evsint.com", "sourceUrl": "https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo", "confidence": "B", "date": "2026-07", "nvidiaHalos": "first adopter", "operationalHours": "65,000+", "customerSites": 9, "digitV5": {"payload_lb": 50, "batteryLife": "improved", "manipulation": "enhanced", "safetyStandard": "cooperatively safe"}, "digitV5LaunchStatus": "expected late 2025/early 2026, specific date TBD"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agility Robotics' AND hr.name ILIKE '%Digit%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%NVIDIA Halos 안전시스템 최초 채택%'
)
LIMIT 1;

-- ----- Agibot: 홍콩 IPO HK$40-50B + Maniformer 데이터 자회사 시드 펀딩 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'warning',
       '[WARNING] Agibot 홍콩 IPO HK$40-50B (US$5.1-6.4B) 목표 — Maniformer 데이터 자회사 수억 시드, MiniMax AI 음성 파트너십',
       'Agibot가 2026년 상반기 홍콩 증시 상장 준비 중, 밸류에이션 HK$40-50B (US$5.1-6.4B) 목표. 데이터 자회사 Maniformer가 수억 위안 규모 시드/엔젤 펀딩 확보 — 로봇 학습 데이터 인프라 전문. MiniMax와 풀 모달리티 AI 음성 상호작용 파트너십 체결. 주요 투자자: Tencent, HongShan Capital, LG Electronics, Mirae Asset, BYD, Hillhouse. 총 누적 조달: $83.8M+ (IPO 전).',
       '{"source": "Capital.com, Tracxn, KrAsia", "sourceUrl": "https://capital.com/en-int/learn/ipo/agibot-ipo", "confidence": "B", "date": "2026-06", "ipoExchange": "HKEX", "ipoValuationHKD": "HK$40-50B", "ipoValuationUSD": "US$5.1-6.4B", "ipoTimeline": "Q3 2026", "maniformer": {"type": "data subsidiary", "funding": "hundreds of millions yuan seed+angel", "focus": "robot training data infrastructure"}, "minimaxPartnership": "full-modality AI voice interaction", "keyInvestors": ["Tencent", "HongShan Capital", "LG Electronics", "Mirae Asset", "BYD", "Hillhouse"], "totalRaised": "$83.8M+"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot' AND hr.name LIKE '%X1%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id AND ca.type = 'funding'
  AND ca.title LIKE '%홍콩 IPO HK$40-50B%Maniformer%'
)
LIMIT 1;

-- ----- 1X Technologies: World Model AI 공개 + 가정용 로봇 특화 전략 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'score_spike',
       'info',
       '[INFO] 1X Technologies World Model AI 공개(3월) — 비디오 관찰 학습, 가정용 특화, $20K/$499월, San Carlos 2공장',
       '1X Technologies가 2026년 3월 World Model AI 시스템 공개 — 비디오 관찰만으로 새로운 작업을 학습하는 AI. NEO는 가정용 특화: 정리, 물건 가져오기, 문 열기, 일정 관리, 생일 알림, 대화 기억. $20,000 구매 또는 $499/월 렌탈(6개월 최소). 5ft6, 66 lb. Hayward 외 San Carlos 2공장 2026년 내 가동 예정. 자동화 확대로 2027년 말 100,000대/년 목표.',
       '{"source": "eWeek, Notebookcheck", "sourceUrl": "https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/", "confidence": "B", "date": "2026-03", "worldModel": "learns tasks by watching videos (March 2026)", "homeFeatures": ["tidying", "fetch items", "open doors", "scheduling", "birthday reminders", "conversation memory"], "pricing": {"purchase": "$20,000", "rental": "$499/month", "rentalMin": "6 months"}, "specs": {"height": "5ft6", "weight_lb": 66}, "sanCarlosFactory": "coming online 2026", "2027Target": "100,000/year", "aiTech": "OpenAI models + 1X proprietary"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%1X%' AND hr.name ILIKE '%NEO%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%World Model AI 공개%가정용 특화%'
)
LIMIT 1;

-- ----- Apptronik: Apollo 3 개발 + John Deere/AT&T/QIA 신규 투자 -----
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'info',
       '[INFO] Apptronik Apollo 3 상용 제품 개발 중 — John Deere 농업 로봇 진출, Apollo 2 Robot Park 1년+ 운영',
       'Apptronik Apollo 2가 Robot Park에서 1년 이상 운영되며 Apollo 3 상용 제품 개발에 데이터 투입 중. Apollo 2의 모듈형 AI 기반 설계로 이족보행/휠 양쪽 구성 배치. Series A-X 확장에 농업 대기업 John Deere 참여 — 농업 분야 휴머노이드 적용 가능성 시사. 미 국방 분야에서도 관심: 전통적 제조/물류 넘어 농업/국방으로 확장 시도. California 신규 오피스 개설 계획.',
       '{"source": "Robot Report, CNBC", "sourceUrl": "https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/", "confidence": "B", "date": "2026-07", "apollo3": "commercial product in development", "apollo2Runtime": "1+ year at Robot Park", "johnDeere": "Series A-X investor — agricultural applications", "expansion": ["Austin (existing)", "California (new)"], "sectors": ["manufacturing", "logistics", "agriculture", "defense"]}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Apptronik%' AND hr.name ILIKE '%Apollo%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts ca
  WHERE ca.robot_id = hr.id
  AND ca.title LIKE '%Apollo 3 상용 제품 개발%John Deere%'
)
LIMIT 1;


-- ============================================================
-- 2. ARTICLES (articles 테이블) — 신규 기사
-- ============================================================

-- Tesla: Musk 생산팀 방문
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Musk Shares Tesla Optimus Production Team Photo, Says Initial Robot Output Will Be "Extremely Slow"',
       'TrendForce',
       'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
       '2026-07-03'::timestamp,
       'Musk가 7/1 Fremont Optimus 생산팀 방문 사진 공개. 초기 생산 극도로 느릴 것, 올해 생산율 예측 불가 언급. 10,000 고유 부품 기반 완전 신규 생산라인. 장기 100만대/년 목표 유지.',
       'en', 'product', 'robot',
       md5('trendforce-musk-optimus-team-photo-extremely-slow-2026-07-06'),
       '{"mentionedCompanies":["Tesla"],"mentionedRobots":["Optimus V3"],"technologies":["modular production line","10K unique parts"],"marketInsights":["initial output extremely slow","prediction impossible for 2026","1M/year long-term target"],"keyPoints":["Musk visited July 1","production team photo shared","consumer purchase 2028-2029 consensus"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Tesla'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('trendforce-musk-optimus-team-photo-extremely-slow-2026-07-06'));

-- Figure AI: Series C $1B
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure Exceeds $1B in Series C Funding at $39B Post-Money Valuation — LG Technology Ventures Among Investors',
       'Figure AI Official',
       'https://www.figure.ai/news/series-c',
       '2026-06-15'::timestamp,
       'Figure AI Series C $1B+ 조달, $39B 밸류에이션. Parkway VC 리드, LG Technology Ventures, NVIDIA, Intel Capital, Brookfield, Qualcomm 등 참여. BMW Figure 03 확대 배치 결정.',
       'en', 'industry', 'robot',
       md5('figure-series-c-1b-39b-valuation-lg-2026-07-06'),
       '{"mentionedCompanies":["Figure AI","LG Technology Ventures","NVIDIA","Intel Capital","BMW","Brookfield","Qualcomm"],"mentionedRobots":["Figure 03"],"technologies":["BotQ manufacturing","Helix OS"],"marketInsights":["$39B valuation","$1B+ Series C","LG Technology Ventures invested"],"keyPoints":["largest humanoid robotics funding round","LG strategic investment","BMW expanding Figure 03 deployment"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Figure AI'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('figure-series-c-1b-39b-valuation-lg-2026-07-06'));

-- Unitree: IPO + 20K target
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Unitree Targets 20,000 Humanoid Robots with Fourfold Capacity Increase; Shanghai IPO Filing',
       'Interesting Engineering / Forbes',
       'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
       '2026-06-01'::timestamp,
       'Unitree 2026년 20,000대 목표(2025년 5,500대 대비 4배). 생산 용량 4배 확대. 상하이 증시 IPO 3월 신청, $580M 목표, 상반기 상장 예정.',
       'en', 'industry', 'robot',
       md5('ie-unitree-20000-target-4x-capacity-ipo-2026-07-06'),
       '{"mentionedCompanies":["Unitree Robotics"],"mentionedRobots":["G1","H1"],"technologies":["4x capacity expansion"],"marketInsights":["20K unit target 2026","Shanghai IPO $580M","5,500+ shipped 2025 (Omdia)"],"keyPoints":["fourfold capacity increase","Shanghai Stock Exchange IPO filing March 2026","most affordable production humanoid"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('ie-unitree-20000-target-4x-capacity-ipo-2026-07-06'));

-- Agibot: Hong Kong IPO
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Agibot IPO: Hong Kong Listing Targets HK$40-50B Valuation; Maniformer Data Arm Raises Seed Funding',
       'Capital.com / Tracxn',
       'https://capital.com/en-int/learn/ipo/agibot-ipo',
       '2026-06-15'::timestamp,
       'Agibot 홍콩 IPO 준비, HK$40-50B (US$5.1-6.4B) 밸류에이션 목표. Q3 2026 상장 예상. 데이터 자회사 Maniformer 수억 위안 시드 펀딩. MiniMax AI 음성 파트너십.',
       'en', 'industry', 'robot',
       md5('capital-agibot-hk-ipo-40-50b-maniformer-2026-07-06'),
       '{"mentionedCompanies":["Agibot","Maniformer","MiniMax","Tencent","LG Electronics","BYD"],"mentionedRobots":["X1","G2"],"technologies":["full-modality AI voice interaction","robot training data"],"marketInsights":["HK$40-50B IPO valuation","Maniformer seed funding","LG Electronics investor"],"keyPoints":["Hong Kong IPO targeting Q3 2026","data subsidiary Maniformer funded","MiniMax AI voice partnership"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agibot'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('capital-agibot-hk-ipo-40-50b-maniformer-2026-07-06'));

-- Agility: NVIDIA Halos
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, language, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Agility Robotics First to Adopt NVIDIA Halos Safety System; Digit Surpasses 65,000 Operational Hours',
       'originofbots.com / evsint.com',
       'https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo',
       '2026-07-01'::timestamp,
       'Agility Robotics NVIDIA Halos 안전 플랫폼 최초 채택. Digit 65,000+ 운영시간, 9개 고객사 사이트. 안전 장벽 없이 인간 협업 가능. Digit v5 cooperatively safe 설계.',
       'en', 'technology', 'robot',
       md5('originofbots-agility-nvidia-halos-65k-hours-2026-07-06'),
       '{"mentionedCompanies":["Agility Robotics","NVIDIA","GXO","Toyota","Amazon"],"mentionedRobots":["Digit","Digit v5"],"technologies":["NVIDIA Halos safety system","cooperative safety"],"marketInsights":["65K+ operational hours","9 customer sites","first Halos adopter"],"keyPoints":["NVIDIA Halos safety first adopter","barrier-free human-robot collaboration","Digit v5 cooperative safety design"]}'::jsonb,
       NOW(), NOW()
FROM companies c
WHERE c.name = 'Agility Robotics'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('originofbots-agility-nvidia-halos-65k-hours-2026-07-06'));


-- ============================================================
-- 3. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- Tesla: Musk 생산팀 방문
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'TrendForce (July 3, 2026)',
  'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
  'Tesla: Musk visits Fremont Optimus production team July 1 — initial output "extremely slow", 2026 production rate "literally impossible to predict"',
  'Musk visited Fremont Optimus assembly line July 1, shared team photo. Initial output will be "extremely slow" due to 10K unique parts on an entirely new line. 2026 production rate "literally impossible to predict". Long-term target 1M/year maintained. Consumer purchase earliest end 2027, more likely 2028-2029.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%optimus%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Musk visits Fremont Optimus%July 1%extremely slow%');

-- Figure AI: Series C $1B+
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Figure AI Official',
  'https://www.figure.ai/news/series-c',
  'Figure AI Series C exceeds $1B at $39B valuation — LG Technology Ventures, NVIDIA, Intel Capital; BMW expands Figure 03 deployment',
  'Series C: $1B+ committed capital at $39B post-money. Led by Parkway VC. LG Technology Ventures among investors (strategic significance for LG ecosystem). BMW Group doubles down on Figure 03 after Spartanburg success. Figure 03: 5ft8, 61kg, 20kg payload, 5hr battery, wireless swappable. Helix 02: 204K+ packages sorted in 163 hours.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Figure AI Series C exceeds $1B%$39B%');

-- Unitree: IPO + 20K
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Interesting Engineering / Forbes',
  'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
  'Unitree files Shanghai IPO (March 2026) targeting $580M; 2026 production goal 20K units with 4x capacity increase',
  'IPO filed March 2026 on Shanghai Stock Exchange, targeting $580M, listing expected mid-2026. 2025 shipments: 5,500+ (Omdia estimate, exceeding combined US competitors). 2026 target: 10K-20K with fourfold capacity expansion. G1 starts at $16K (most affordable production humanoid). GD01 mecha robot unveiled alongside IPO filing.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Unitree files Shanghai IPO%$580M%20K%');

-- Agility: NVIDIA Halos
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'originofbots.com / evsint.com',
  'https://www.originofbots.com/news/agility-robotics-digit-moves-beyond-pilots-now-handling-real-warehouse-work-at-amazon-toyota-and-gxo',
  'Agility Robotics first to adopt NVIDIA Halos safety system; Digit exceeds 65K operational hours across 9 customer sites',
  'First company to adopt NVIDIA newly announced Halos safety system for barrier-free human-robot co-working. Digit deployed at 9 customer sites with 65K+ operational hours. Digit v5 in preparation: 50 lb payload, improved battery, enhanced manipulation, cooperative safety standard.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%digit%' OR slug ILIKE '%agility%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agility Robotics first%NVIDIA Halos%65K%');

-- Agibot: HK IPO
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Capital.com / Tracxn',
  'https://capital.com/en-int/learn/ipo/agibot-ipo',
  'Agibot Hong Kong IPO targets HK$40-50B (US$5.1-6.4B) Q3 2026; Maniformer data arm seed funded; MiniMax AI voice partnership',
  'HKEX listing expected Q3 2026, valuation HK$40-50B. Data subsidiary Maniformer raised hundreds of millions yuan in seed/angel funding for robot training data infrastructure. MiniMax partnership for full-modality AI voice interaction. Key investors include Tencent, LG Electronics, BYD, Mirae Asset.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%agibot%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Agibot Hong Kong IPO%HK$40-50B%');

-- 1X: World Model
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'eWeek / Notebookcheck',
  'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
  '1X World Model AI unveiled March 2026 — NEO learns tasks from video; $20K home robot; San Carlos 2nd factory planned',
  'World Model AI: NEO learns new tasks by watching videos (March 2026 unveil). Home-focused: tidying, fetch items, scheduling, conversation memory. $20K purchase or $499/month rental. 5ft6, 66 lb. San Carlos second factory coming online 2026 alongside Hayward. AI: OpenAI models + 1X proprietary tech. Target: 100K/year by end 2027.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%neo%' OR slug ILIKE '%1x%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%1X World Model AI%March 2026%');

-- Apptronik: Apollo 3 + John Deere
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status)
SELECT 'Robot Report / CNBC',
  'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
  'Apptronik Apollo 3 commercial product in development; John Deere invests for agricultural applications; Apollo 2 1yr+ at Robot Park',
  'Apollo 3 commercial product development powered by Apollo 2 data + DeepMind Gemini AI. John Deere Series A-X investor signals agricultural humanoid applications. Apollo 2 has run 1+ year at Robot Park in bipedal and wheeled configs. New California office planned. Sectors expanding: manufacturing, logistics, agriculture, defense.',
  (SELECT id FROM ci_competitors WHERE slug ILIKE '%apollo%' OR slug ILIKE '%apptronik%' LIMIT 1),
  'pending'
WHERE NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline ILIKE '%Apollo 3 commercial product%John Deere%');


-- ============================================================
-- 4. CI Values 업데이트
-- ============================================================

-- Figure AI: 밸류에이션 $39B
UPDATE ci_values SET
  value = '$39B (Series C, $1B+ 커밋, Parkway VC 리드, LG Technology Ventures 참여)',
  confidence = 'A',
  source = 'Figure AI Official — Series C announcement',
  source_date = '2026-06-15',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%figure%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '최근 밸류에이션' LIMIT 1);

-- Unitree: 생산 대수
UPDATE ci_values SET
  value = '5,500대 (2025, Omdia), 2026 목표 10K-20K (4배 용량 확대)',
  confidence = 'B',
  source = 'Interesting Engineering, Forbes — Omdia estimate',
  source_date = '2026-06-01',
  last_verified = NOW(),
  updated_at = NOW()
WHERE competitor_id = (SELECT id FROM ci_competitors WHERE slug ILIKE '%unitree%' LIMIT 1)
  AND item_id = (SELECT i.id FROM ci_items i WHERE i.name = '배치 대수' LIMIT 1);


-- ============================================================
-- 5. 기업 밸류에이션 업데이트
-- ============================================================

UPDATE companies SET valuation_usd = 39000000000.00, updated_at = NOW()
WHERE name = 'Figure AI' AND (valuation_usd IS NULL OR valuation_usd < 39000000000);


COMMIT;

-- ============================================================
-- 실행 결과 확인 쿼리
-- ============================================================
-- SELECT type, severity, count(*) FROM competitive_alerts WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type, severity;
-- SELECT count(*) FROM articles WHERE created_at > NOW() - INTERVAL '1 hour';
-- SELECT count(*) FROM ci_monitor_alerts WHERE detected_at > NOW() - INTERVAL '1 hour';
