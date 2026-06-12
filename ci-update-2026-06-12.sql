-- ============================================================
-- [ARGOS] 경쟁사 데이터 자동 업데이트 — 2026-06-12
-- War Room competitive_alerts + ci_monitor_alerts INSERT
-- 중복 방지: content_hash 또는 title 기준 ON CONFLICT 처리
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COMPETITIVE ALERTS (competitive_alerts 테이블)
-- ============================================================

-- [A등급] Tesla Optimus — Fremont 공장 Model S/X 생산 종료, Optimus 양산 라인 전환
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'critical',
       'Tesla: Fremont 공장 Model S/X 생산 종료 → Optimus Gen 3 양산 라인 전환 (연간 100만대 목표)',
       'Tesla가 Fremont 공장의 Model S/X 생산을 Q2 2026에 종료하고 Optimus Gen 3 양산 라인으로 전환. 연간 100만대 생산 목표, 2026년 말 SOP 예정. Gigafactory Texas에는 연간 1,000만대 규모의 2세대 라인도 준비 중. 현재 1,000대 이상의 Gen 3가 Fremont에서 배터리 조립, EV 팩 로딩 등 작업 수행 중.',
       '{"source": "Tesla 8-K SEC Filing + The Robot Report", "reliability": "A", "gen3_units_deployed": 1000, "fremont_capacity_target": 1000000, "texas_capacity_target": 10000000, "sop_date": "2026-H2", "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Tesla%' AND hr.name ILIKE '%Optimus Gen 3%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Fremont%Optimus Gen 3%양산%'
);

-- [A등급] Boston Dynamics Atlas — Hyundai 25,000대 배치 계획 및 Google DeepMind 파트너십
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'critical',
       'Boston Dynamics: Hyundai 25,000대 Atlas 배치 확정 + Google DeepMind AI 파트너십 체결',
       'Hyundai가 자사 및 Kia 제조 공장에 25,000대 이상의 Atlas 배치를 확정 (2028년 연간 30,000대 생산 목표의 83% 차지). Google DeepMind와 파운데이션 모델 통합 파트너십도 체결. 2026년 배치분은 전량 선약 완료, 추가 고객은 2027년 초부터 온보딩.',
       '{"source": "Boston Dynamics Official Blog + Hyundai News", "reliability": "A", "hyundai_units": 25000, "annual_capacity_2028": 30000, "google_deepmind_partnership": true, "all_2026_committed": true, "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Boston Dynamics%' AND hr.name ILIKE '%Atlas%Electric%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Hyundai%25,000%Atlas%'
);

-- [A등급] Figure AI — Figure 03 BotQ 공장 양산 마일스톤 (시간당 1대)
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       'Figure AI: BotQ 공장 Figure 03 생산 속도 시간당 1대 달성 (연 12,000대)',
       'Figure AI의 BotQ 공장이 120일 만에 하루 1대에서 시간당 1대로 24배 생산성 향상. 현재 연간 12,000대 생산, 4년 내 100,000대 목표. BMW Spartanburg 공장에 40대 Figure 03 배치, Leipzig 공장으로 확대 예정 (2026년 여름).',
       '{"source": "Figure AI Official + Humanoids Daily", "reliability": "A", "production_rate": "1_per_hour", "annual_capacity": 12000, "target_4yr": 100000, "bmw_units": 40, "bmw_expansion": "Leipzig Summer 2026", "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Figure%' AND hr.name ILIKE '%Figure 03%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%BotQ%Figure 03%'
);

-- [A등급] Agility Robotics Digit — Toyota TMMC 상용 배치 확정
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       'Agility Robotics: Toyota Motor Manufacturing Canada(TMMC) 상용 계약 체결 + Mercado Libre 배치',
       'Toyota TMMC가 Digit 상용 배치 계약 체결 (파일럿 성공 후 정식 전환). Mercado Libre도 Texas 물류센터에 Digit 배치 계약 체결. GXO, Schaeffler, Amazon에 이은 Fortune 500 기업 확대. 10만 개 이상 토트 처리 실적.',
       '{"source": "Agility Robotics Official Press", "reliability": "A", "toyota_tmmc": true, "mercado_libre": true, "totes_moved": 100000, "cooperative_safety_eta": "mid-late 2026", "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Agility%' AND hr.name ILIKE '%Digit%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Toyota%TMMC%Digit%'
);

-- [B등급] Apptronik Apollo — $520M 시리즈 A-X 자금 조달 ($5B 밸류에이션)
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'funding',
       'critical',
       'Apptronik: $520M 시리즈 A-X 투자 유치 (총 ~$1B, $5B 밸류에이션)',
       'Apptronik이 $520M 시리즈 A-X 라운드 완료. 총 누적 투자 약 $1B, 밸류에이션 $5B. Google, Mercedes-Benz 주도. Google DeepMind의 Gemini Robotics AI 통합 파트너십 체결. Mercedes-Benz 공장 및 GXO 물류센터에서 Apollo 테스트 진행 중.',
       '{"source": "CNBC + The Robot Report", "reliability": "B", "series": "A-X", "amount_usd": 520000000, "total_raised_usd": 935000000, "valuation_usd": 5000000000, "lead_investors": ["Google", "Mercedes-Benz"], "google_deepmind": true, "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Apptronik%' AND hr.name ILIKE '%Apollo%' AND hr.name NOT ILIKE '%Apollo 2%' AND hr.name NOT ILIKE '%Apollo 3%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Apptronik%$520M%'
);

-- [B등급] 1X Technologies NEO — 사전예약 5일 만에 1년치 매진 + EQT 10,000대 계약
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'partnership',
       'warning',
       '1X Technologies: NEO 사전예약 5일 만에 연간 생산량 매진 + EQT 10,000대 배치 계약',
       'NEO 사전예약이 5일 만에 1년치(10,000대) 매진. California 공장 완공, 2027년 100,000대 목표. EQT와 포트폴리오 기업 300곳에 10,000대 배치 계약(2026~2030). 가격 $20,000 또는 $499/월 렌탈. VLA 기반 비디오 학습 AI 업데이트 발표.',
       '{"source": "TechCrunch + Interesting Engineering", "reliability": "B", "preorder_sellout_days": 5, "first_year_capacity": 10000, "2027_target": 100000, "eqt_deal_units": 10000, "price_usd": 20000, "rental_monthly_usd": 499, "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%1X%' AND hr.name ILIKE '%NEO%' AND hr.name NOT ILIKE '%NEO Beta%' AND hr.name NOT ILIKE '%NEO 1.0%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%1X%NEO%매진%'
);

-- [B등급] Unitree — G1 하네다 공항 배치 + IPO 신청 + 20,000대 출하 목표
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       'Unitree: G1 도쿄 하네다 공항 상용 배치 + 상하이 IPO 신청 + 2026년 20,000대 출하 목표',
       '세계 최초 공항 휴머노이드 배치: JAL·GMO와 하네다 공항 수하물/화물 처리 시범 운영 (2028년까지). 상하이 STAR Market IPO 신청(3월). 2025년 5,500대 → 2026년 20,000대 출하 목표. 335% 매출 성장. UnifoLM-VLA-0 오픈소스 공개.',
       '{"source": "Multiple media (eWeek, Interesting Engineering, TechEBlog)", "reliability": "B", "haneda_deployment": true, "partner_jal": true, "partner_gmo": true, "ipo_filed": "2026-03", "units_2025": 5500, "target_2026": 20000, "revenue_growth": "335%", "open_source_vla": "UnifoLM-VLA-0", "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Unitree%' AND hr.name = 'G1'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Unitree%하네다%IPO%'
);

-- [B등급] Agibot — 10,000대 누적 생산 + 글로벌 확장 + IPO 준비
INSERT INTO competitive_alerts (id, robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(),
       hr.id,
       'mass_production',
       'warning',
       'Agibot: 누적 10,000대 생산 돌파 + 독일 진출 + 14개국 Sharebot 렌탈 플랫폼 런칭',
       '2026년 3월 누적 10,000대 생산 달성 (Expedition A3 플랫폼 주력). "배치 원년" 선포: 5개 로봇 플랫폼 + 8개 AI 모델 발표. 뮌헨에서 유럽 진출 선포, Minth Group과 전략적 파트너십. Sharebot 렌탈 플랫폼 14개국 론칭. IPO 2026년 Q3 예정. 위안성 생태계 5년간 20억위안 투자 계획.',
       '{"source": "eWeek + PR Newswire + Gasgoo", "reliability": "B", "cumulative_units": 10000, "robot_platforms": 5, "ai_models": 8, "sharebot_countries": 14, "ipo_target": "2026-Q3", "ecosystem_investment_cny": 2000000000, "minth_partnership": true, "date": "2026-06-12"}'::jsonb,
       false,
       NOW()
FROM humanoid_robots hr
JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Agibot%' AND hr.name ILIKE '%Genie G1%'
AND NOT EXISTS (
    SELECT 1 FROM competitive_alerts ca
    WHERE ca.title ILIKE '%Agibot%10,000%'
);


-- ============================================================
-- 2. CI MONITOR ALERTS (ci_monitor_alerts 테이블)
-- ============================================================

-- Tesla — Gen 3 양산 전환
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
SELECT gen_random_uuid(),
       'Tesla SEC Filing / The Robot Report',
       'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
       'Tesla Fremont 공장 Optimus Gen 3 양산 라인 전환 확정',
       'Model S/X 생산 종료 후 Optimus Gen 3 양산 라인으로 전환. Gen 3 사양: 50 액추에이터 (25/손), 37 관절, 1.2m/s 보행, 173cm/57kg. 2026년 말 SOP, 연간 100만대 목표. 가격 $20,000-$30,000 목표.',
       cc.id,
       NOW(),
       'pending'
FROM ci_competitors cc WHERE cc.slug = 'optimus'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts m WHERE m.headline ILIKE '%Fremont%Optimus Gen 3%양산%');

-- Boston Dynamics — Hyundai 대규모 배치
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
SELECT gen_random_uuid(),
       'Boston Dynamics Official / Hyundai News',
       'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
       'Boston Dynamics Atlas: Hyundai 25,000대 + Google DeepMind AI 파트너십',
       'Atlas 사양: 56 DoF, 50kg 리프팅, 2.3m 리치, 자동 배터리 스왑. Hyundai Mobis 액추에이터 공급. Hyundai 25,000대 (83% 생산분), Google DeepMind 파운데이션 모델 통합. ISO 25785-1 안전 표준 주도 (2026-27 발행 예정).',
       cc.id,
       NOW(),
       'pending'
FROM ci_competitors cc WHERE cc.slug = 'atlas'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts m WHERE m.headline ILIKE '%Atlas%Hyundai 25,000%');

-- Figure AI — BotQ 생산 마일스톤
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
SELECT gen_random_uuid(),
       'Figure AI Official',
       'https://www.figure.ai/news/ramping-figure-03-production',
       'Figure AI: BotQ 공장 Figure 03 시간당 1대 생산 달성',
       'Figure 03: 5''8", 61kg, 20kg 페이로드, 무선 충전, 팜 카메라. BMW 40대 배치, Leipzig 확대 예정. BotQ: 연 12,000대, 4년 내 100,000대 목표. Series C $1B+ ($39B 밸류에이션).',
       cc.id,
       NOW(),
       'pending'
FROM ci_competitors cc WHERE cc.slug = 'figure'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts m WHERE m.headline ILIKE '%BotQ%Figure 03%시간당%');

-- Agility — Toyota TMMC
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
SELECT gen_random_uuid(),
       'Agility Robotics Official',
       'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
       'Agility Digit: Toyota TMMC + Mercado Libre 상용 계약 체결',
       'Toyota TMMC 상용 배치 (파일럿 후 정식 전환). Mercado Libre Texas 물류센터 배치. 10만 토트 처리. 협력 안전 인증 2026년 중후반 예정. GXO, Schaeffler, Amazon 등 Fortune 500 고객 확보.',
       cc.id,
       NOW(),
       'pending'
FROM ci_competitors cc WHERE cc.slug = 'digit'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts m WHERE m.headline ILIKE '%Digit%Toyota TMMC%Mercado%');

-- 1X NEO — 사전예약 매진
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, competitor_id, detected_at, status)
SELECT gen_random_uuid(),
       'TechCrunch / Interesting Engineering',
       'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
       '1X NEO: 사전예약 5일 매진 + EQT 10,000대 계약 + 가정용 시장 진출',
       'NEO 사전예약 5일 만에 연간 10,000대 매진. $20,000 또는 $499/월 렌탈. EQT 포트폴리오 300사에 10,000대(2026-2030). California 공장 완공. VLA 세계모델 AI 업데이트. 2027년 100,000대 목표.',
       cc.id,
       NOW(),
       'pending'
FROM ci_competitors cc WHERE cc.slug = 'neo'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts m WHERE m.headline ILIKE '%NEO%사전예약%매진%');


-- ============================================================
-- 3. ARTICLES (수집된 핵심 기사)
-- ============================================================

-- Tesla Optimus Gen 3 양산 기사
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Tesla Fremont 공장 Optimus Gen 3 양산 전환 — 연간 100만대 목표',
       'The Robot Report',
       'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
       '2026-06-01'::timestamp,
       'Tesla가 Fremont 공장의 Model S/X 생산을 종료하고 Optimus Gen 3 양산 라인으로 전환. 연간 100만대 목표. Gigafactory Texas는 1,000만대 규모 2세대 라인 준비.',
       'industry',
       'robot',
       md5('tesla-optimus-gen3-fremont-mass-production-2026'),
       '{"mentionedCompanies": ["Tesla"], "mentionedRobots": ["Optimus Gen 3"], "technologies": ["mass production", "humanoid manufacturing"], "keyPoints": ["Fremont 전환", "연간 100만대", "Gen 3 SOP 2026 H2"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Tesla%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('tesla-optimus-gen3-fremont-mass-production-2026'));

-- Boston Dynamics + Google DeepMind 파트너십
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Boston Dynamics & Google DeepMind: Atlas 휴머노이드 AI 파트너십 체결',
       'Boston Dynamics Blog',
       'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
       '2026-05-15'::timestamp,
       'Boston Dynamics가 Google DeepMind와 파운데이션 AI 모델 통합 파트너십 체결. Atlas에 고급 인지 능력 부여 목표. Hyundai RMAC 및 DeepMind에 2026년 배치 확정.',
       'technology',
       'robot',
       md5('boston-dynamics-google-deepmind-atlas-partnership-2026'),
       '{"mentionedCompanies": ["Boston Dynamics", "Google DeepMind", "Hyundai"], "mentionedRobots": ["Atlas"], "technologies": ["foundation models", "AI partnership", "cognitive AI"], "keyPoints": ["Google DeepMind 파트너십", "Atlas 인지 능력 강화", "2026 배치 확정"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Boston Dynamics%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('boston-dynamics-google-deepmind-atlas-partnership-2026'));

-- Apptronik $520M 투자 유치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Apptronik: $520M 시리즈 A-X 투자 유치, $5B 밸류에이션 달성',
       'CNBC',
       'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
       '2026-02-11'::timestamp,
       'Apptronik이 $520M 시리즈 A-X 라운드 완료. Google, Mercedes-Benz 주도. 누적 약 $1B. Google DeepMind Gemini Robotics 통합.',
       'industry',
       'robot',
       md5('apptronik-520m-series-ax-5b-valuation-2026'),
       '{"mentionedCompanies": ["Apptronik", "Google", "Mercedes-Benz", "Google DeepMind"], "mentionedRobots": ["Apollo"], "technologies": ["Gemini Robotics", "humanoid AI"], "marketInsights": ["$5B 밸류에이션", "누적 $1B 투자"], "keyPoints": ["$520M 투자", "Google DeepMind 파트너십", "Apollo 상용화 가속"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Apptronik%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('apptronik-520m-series-ax-5b-valuation-2026'));

-- Figure AI Series C
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Figure AI: Series C $1B+ 투자 유치, $39B 밸류에이션 달성',
       'Figure AI Official',
       'https://www.figure.ai/news/series-c',
       '2025-09-15'::timestamp,
       'Figure AI가 $1B 이상의 Series C 투자 유치. $39B 밸류에이션. Nvidia, Intel Capital, Qualcomm Ventures, Salesforce 참여.',
       'industry',
       'robot',
       md5('figure-ai-series-c-1b-39b-valuation-2026'),
       '{"mentionedCompanies": ["Figure AI", "Nvidia", "Intel Capital", "Qualcomm", "Salesforce"], "mentionedRobots": ["Figure 03"], "marketInsights": ["$39B 밸류에이션", "$1B+ Series C"], "keyPoints": ["대규모 투자 유치", "최고 밸류에이션"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Figure%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('figure-ai-series-c-1b-39b-valuation-2026'));

-- Unitree IPO + 하네다 배치
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Unitree: 상하이 IPO 신청 + 하네다 공항 G1 세계 최초 공항 휴머노이드 배치',
       'eWeek / TechEBlog',
       'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
       '2026-05-07'::timestamp,
       'Unitree가 2026년 3월 상하이 STAR Market IPO 신청. G1이 도쿄 하네다 공항에 세계 최초 공항 휴머노이드로 배치. 2025년 5,500대 → 2026년 20,000대 출하 목표.',
       'industry',
       'robot',
       md5('unitree-ipo-haneda-g1-deployment-2026'),
       '{"mentionedCompanies": ["Unitree", "JAL", "GMO"], "mentionedRobots": ["G1"], "technologies": ["airport logistics", "UnifoLM-VLA-0"], "marketInsights": ["IPO 신청", "335% 매출 성장", "20,000대 목표"], "keyPoints": ["세계 최초 공항 휴머노이드", "IPO 준비"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Unitree%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('unitree-ipo-haneda-g1-deployment-2026'));

-- Agibot 10,000대 + 글로벌 확장
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       'Agibot: 누적 10,000대 생산 + "배치 원년" 선포 + 글로벌 14개국 Sharebot 론칭',
       'eWeek / PR Newswire',
       'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
       '2026-06-02'::timestamp,
       'Agibot 누적 10,000대 생산 (Expedition A3 주력). 5개 플랫폼 + 8개 AI 모델. 뮌헨 유럽 진출. Minth Group 파트너십. Sharebot 14개국 론칭. IPO 2026 Q3 예정.',
       'industry',
       'robot',
       md5('agibot-10000-units-deployment-year-one-2026'),
       '{"mentionedCompanies": ["Agibot", "Minth Group"], "mentionedRobots": ["Expedition A3", "Genie G1"], "technologies": ["AIMA full-stack ecosystem", "embodied AI"], "marketInsights": ["10,000대 누적", "14개국 진출", "IPO 준비"], "keyPoints": ["배치 원년", "중국 휴머노이드 양강 구도"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%Agibot%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('agibot-10000-units-deployment-year-one-2026'));

-- 1X Technologies NEO
INSERT INTO articles (id, company_id, title, source, url, published_at, summary, category, product_type, content_hash, extracted_metadata, collected_at, created_at)
SELECT gen_random_uuid(),
       c.id,
       '1X Technologies: NEO 사전예약 5일 매진 + EQT 10,000대 계약',
       'TechCrunch / Sifted',
       'https://sifted.eu/articles/1x-humanoid-robot-launch',
       '2026-01-15'::timestamp,
       'NEO 사전예약 5일 만에 연간 10,000대 매진. $20,000 또는 $499/월 렌탈. EQT 300개사에 10,000대 배치 계약. California 공장 완공.',
       'industry',
       'robot',
       md5('1x-neo-preorder-sellout-eqt-deal-2026'),
       '{"mentionedCompanies": ["1X Technologies", "EQT"], "mentionedRobots": ["NEO"], "technologies": ["world model VLA", "home robotics"], "marketInsights": ["$20,000 가격", "5일 매진", "100,000대 목표"], "keyPoints": ["가정용 시장 진출", "대규모 사전예약 성공"]}'::jsonb,
       NOW(),
       NOW()
FROM companies c WHERE c.name ILIKE '%1X%'
AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.content_hash = md5('1x-neo-preorder-sellout-eqt-deal-2026'));

COMMIT;

-- ============================================================
-- 검증 쿼리
-- ============================================================
SELECT 'competitive_alerts' as table_name, COUNT(*) as total_count,
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as today_inserted
FROM competitive_alerts
UNION ALL
SELECT 'ci_monitor_alerts', COUNT(*),
       COUNT(*) FILTER (WHERE detected_at::date = CURRENT_DATE)
FROM ci_monitor_alerts
UNION ALL
SELECT 'articles', COUNT(*),
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)
FROM articles;
