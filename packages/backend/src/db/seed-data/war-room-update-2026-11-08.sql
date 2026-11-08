-- War Room 경쟁사 데이터 자동 업데이트 - 2026-11-08
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-11-08T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Interesting Engineering / Technology.org',
   'https://www.technology.org/2026/10/22/tesla-optimus-production-fremont-20000-per-week-2027/',
   'Tesla Optimus Fremont 공장 양산 시작, 2027년 주 20,000대 목표',
   'Q3 2026 주주서한: Fremont 공장에서 Optimus 양산 개시 ("early ramp"). 2027년 주 20,000대 목표. Giga Texas에 대형 로봇 공장 건설 중. 외부 판매는 2027년 말 시작 예정. 연간 1,000만 대 장기 설계용량.'),

  ('Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
   'Boston Dynamics Atlas 신형 4손가락 핸드 공개 — 13 DOF, 촉각 센싱',
   '2026.10 신형 4손가락 핸드 공개. 13 DOF. 산업용 공구 사용·촉각 감지·정교한 조작 설계. 대량생산 대비 견고성·제조성·수리성 개선. 전신 2종 액추에이터, 현장 교체 가능 사지.'),

  ('Forbes / Figure AI',
   'https://www.forbes.com/sites/johnkoetsier/2026/11/06/figure-ceo-brett-adcock-every-major-announcement-from-company-meeting/',
   'Figure AI: Figure 04 설계 완료, 현금 $2B 이상, Catalyst Brands(JCPenney) 계약',
   '11/6 컴퍼니 미팅: Figure 04 차세대 로봇 설계 완료. 현금잔고 $2B 이상. Figure 03 1,000대 생산. BMW Spartanburg + Catalyst Brands(JCPenney) Reno DC 배치. Nscale 컴퓨팅 $3.5B 계약(9월).'),

  ('The Information / Forbes',
   'https://www.forbes.com/sites/johnkoetsier/2026/11/06/figure-ceo-brett-adcock-every-major-announcement-from-company-meeting/',
   'Figure AI: Nvidia $1B 투자 논의 중, 프리머니 $38B 밸류에이션',
   '10월 The Information 보도: Nvidia $1B 투자 논의. 프리머니 밸류에이션 ~$38B. 공시 누적 펀딩 ~$1.9B. Series C $1B+(2025.9, $39B 밸류).'),

  ('Interesting Engineering / Seoul Economic Daily',
   'https://interestingengineering.com/ai-robotics/unitree-humanoid-overheats-during-mountain-race',
   'Unitree G1 태산 등반 대회 중 과열 리타이어 — 안전 우려',
   '11월 CMG 세계 로봇 태산 등반 대회에서 G1 과열 리타이어. 들것으로 하산. 튜닝 미완료 개발 버전 출전. 6월 신장 행사 라운드킥 아동 사고 보도도 있음. FCC 인증 6개 모델(G1, H2, R1, Go2, B2, A2) 통과.'),

  ('Cryptopolitan',
   'https://www.cryptopolitan.com/unitree-petrochina-venture-washington-hawks/',
   'Unitree PetroChina 합작 — 미국 규제 리스크 증가',
   'Unitree-PetroChina 합작 보도. 미국 의회 규제 강화 명분 제공 가능성. B2-Ex 방폭 로봇 가스 수집소·화학 탱크 배치. STAR Market IPO 완료, 첫 실적 발표.'),

  ('TechCrunch / SEC Filing',
   'https://techcrunch.com/2026/11/05/agility-is-the-first-pure-humanoid-robot-company-on-the-stock-market-are-you-buying/',
   'Agility Robotics SPAC 상장 승인 — 티커 AGLT, 총 조달 ~$465M',
   '11/2 Churchill Capital XI 합병 승인. 티커 AGLT. 총 자본 조달 ~$465M. H1 2026 매출 $174K, 순손실 $362M. Digit 5 2026.9.15 공개. V5 수주 $300M+. 2027 H1 얼리액세스, 2027말 GA.'),

  ('Agility Robotics',
   'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
   'Agility: Toyota 캐나다 RaaS 계약, FORT Robotics 안전 MOU, GXO·NVIDIA 확대',
   '2월 Toyota Motor Manufacturing Canada RaaS 계약. 10월 FORT Robotics Digit 5 안전 인프라 MOU. GXO 파트너십 확대. NVIDIA 협업 확대. AGCO Hesston KS 파일럿. Nyobolt 배터리 파트너.'),

  ('CNBC / Forbes',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik $520M 투자 유치($5B 밸류), Robot Park 90,000sqft 개설, DeepMind 협업',
   '2월 $520M 투자($5B 밸류). 6/30 Robot Park 90,000sqft 오스틴 개설. Apollo 2 공개(바이페달+휠). Google DeepMind Gemini Robotics 협업. Mercedes-Benz, GXO, Jabil 고객. Apollo 3 상용화 2027.'),

  ('Forbes / TNW / Humanoids Daily',
   'https://humanoidsdaily.com/news/1x-neo-head-dexter-tv-home-integration',
   '1X NEO: Hayward 공장 가동, 소비자 출하 시작, 25 DOF 핸드 업그레이드',
   '5/1 Hayward 58,000sqft 공장 가동, 소비자 출하 개시. 2027 10만 대 생산 목표. 7/9 25 DOF 핸드 업그레이드. 소프트뱅크 손정의 지배 지분 협상 보도(미확인). EQT 10,000대 배치 딜.'),

  ('Agibot / IDC',
   'https://www.agibot.com/article/231/detail/125.html',
   'Agibot: H1 2026 글로벌 휴머노이드 출하 1위(IDC), 누적 20,000대 생산',
   'IDC 기준 H1 2026 글로벌 1위, 8,600대 이상 출하. 9월 누적 20,000번째 생산. IFA 2026 베를린 A3 전시. MWC 2026 온라인 스토어 글로벌 운영 시작. April Partner Conference 차세대 제품·모델 발표.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "production_status", "new_value": "Fremont 양산 시작(Q3 2026, early ramp). 2027년 주 20,000대 목표. Giga Texas 로봇 공장 건설 중. 외부 판매 2027년 말 예정.", "source": "Tesla Q3 2026 주주서한, Technology.org", "reliability": "A"}, {"field": "long_term_capacity", "new_value": "연간 1,000만 대 장기 설계용량(Giga Texas)", "source": "Tesla Filing", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Fremont 양산 시작%early ramp%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "new_hand", "new_value": "신형 4손가락 핸드(13 DOF), 촉각 센싱, 산업용 공구 사용 설계, 현장 교체 가능 사지", "source": "Robotics & Automation News 2026-10-02", "reliability": "A"}, {"field": "heavy_lifting", "new_value": "50lb 미니냉장고 운반 시연(5월), 100lb+ 테스트 성공. 전신 2종 액추에이터 통일", "source": "Boston Dynamics, Robotics & Automation News", "reliability": "A"}, {"field": "partnerships", "new_value": "Google DeepMind 파운데이션 모델 통합 협업. Hyundai Mobis 액추에이터 공급. 2026 배치분 전량 사전 확보 완료.", "source": "NBC News, Forbes", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%4손가락 핸드%13 DOF%촉각 센싱%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "next_gen", "new_value": "Figure 04 설계 완료. Figure 03 1,000대 생산 완료. 현금잔고 $2B 이상.", "source": "Forbes 2026-11-06 (CEO 컴퍼니 미팅)", "reliability": "A"}, {"field": "new_customer", "new_value": "Catalyst Brands(JCPenney 운영사) Reno DC 상용 계약(5월). BMW Spartanburg 배치 지속.", "source": "Forbes", "reliability": "A"}, {"field": "compute_deal", "new_value": "Nscale 컴퓨팅 $3.5B 계약(9월). Nvidia $1B 투자 논의(미확정, $38B 프리머니).", "source": "The Information, Forbes", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Figure 04 설계 완료%Catalyst Brands%Nscale%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "safety_incident", "new_value": "G1 태산 등반 대회 과열 리타이어(11월). 6월 신장 행사 라운드킥 아동 사고 보도.", "source": "Interesting Engineering, Seoul Economic Daily", "reliability": "A"}, {"field": "us_regulation", "new_value": "FCC 인증 6개 모델 통과(G1,H2,R1,Go2,B2,A2). PetroChina 합작 보도 — 미국 규제 리스크.", "source": "Cryptopolitan, 투자자 브리핑", "reliability": "B"}, {"field": "ipo_post", "new_value": "STAR Market IPO 완료. 첫 실적 발표.", "source": "CNBC, Wikipedia", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%태산 등반%과열%PetroChina%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "public_listing", "new_value": "11/2 Churchill Capital XI SPAC 합병 승인. 티커 AGLT. 총 조달 ~$465M. H1 2026 매출 $174K, 순손실 $362M.", "source": "TechCrunch 2026-11-05, SEC Filing", "reliability": "A"}, {"field": "digit_5", "new_value": "Digit 5 2026.9.15 공개. 협업 안전 설계. V5 수주 $300M+. 2027 H1 얼리액세스, 2027말 GA.", "source": "Agility Robotics 공식", "reliability": "A"}, {"field": "partnerships_new", "new_value": "Toyota Canada RaaS(2월). FORT Robotics 안전 MOU(10월). GXO·NVIDIA 확대. AGCO 파일럿. Nyobolt 배터리.", "source": "Agility Robotics Press Releases", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%AGLT%$465M%Digit 5%Toyota Canada%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "funding", "new_value": "$520M 투자 유치($5B 밸류, 2월). Robot Park 90,000sqft 오스틴 개설(6/30).", "source": "CNBC 2026-02-11, Forbes 2026-06-30", "reliability": "A"}, {"field": "product_roadmap", "new_value": "Apollo 2 훈련 플랫폼(바이페달+휠). Apollo 3 최초 상용 제품 2027. Google DeepMind Gemini Robotics 협업.", "source": "The Robot Report, Forbes", "reliability": "A"}, {"field": "customers", "new_value": "Mercedes-Benz, GXO Logistics, Jabil — 전략 파트너 사이트 Apollo 2 운영 중.", "source": "Apptronik 공식, Forbes", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%$520M%Robot Park 90,000%Apollo 3%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "production_shipping", "new_value": "Hayward 58,000sqft 공장 가동(5/1). 소비자 출하 개시. 2027 10만 대 목표.", "source": "TNW 2026-05-01, Humanoids Daily", "reliability": "A"}, {"field": "hand_upgrade", "new_value": "25 DOF 핸드 업그레이드(7/9).", "source": "Humanoids Daily (단일 출처)", "reliability": "C"}, {"field": "investment_rumor", "new_value": "소프트뱅크 손정의 지배 지분 협상 보도(미확인, 이전 목표 밸류 $10B 미만).", "source": "Humanoids Daily", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Hayward 58,000sqft%25 DOF%소프트뱅크%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "market_position", "new_value": "IDC 기준 H1 2026 글로벌 휴머노이드 출하 1위(8,600대+). 9월 누적 20,000번째 생산.", "source": "Agibot 공식, IDC", "reliability": "A"}, {"field": "global_expansion", "new_value": "IFA 2026 베를린 A3 전시. MWC 2026 온라인 스토어 글로벌 운영 시작.", "source": "Agibot 공식, IntelligentCIO", "reliability": "A"}, {"field": "product_lineup", "new_value": "X1(오픈소스), A3(산업용), X2 시리즈, G2. X1 스펙: 34 DOF, 2시간 운용.", "source": "Agibot 공식, OriginOfBots(3자 추정 포함)", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%H1 2026 글로벌%20,000번째%IFA 2026%' AND created_at::date = CURRENT_DATE);

COMMIT;
