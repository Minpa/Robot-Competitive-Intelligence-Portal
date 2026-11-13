-- War Room 경쟁사 데이터 자동 업데이트 - 2026-11-13
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-11-13T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('The Robot Report / Interesting Engineering / Unite.AI',
   'https://www.therobotreport.com/boston-dynamics-adds-wheels-to-atlas-humanoid-to-test-whole-body-control/',
   'Boston Dynamics Atlas 스쿠터 휠 장착 실험 — 360도 회전 점프 첫 시도 성공, 전신 제어 역량 과시 (11/9)',
   '11/9 Boston Dynamics가 Atlas 발에 스쿠터 휠을 장착한 실험 영상 공개. 가상 강화학습으로 훈련 후 실제 로봇이 첫 시도에서 360도 회전 점프 성공. 롤링, 사이드 대시, 피루엣 시연. 상용화 계획은 아니나 표준 Atlas 구성에 이미 적용 중. 전신 제어(whole-body control) 역량 발전 시연.'),

  ('StockAnalysis / Investing.com / BriefGlance',
   'https://stockanalysis.com/stocks/aglt/history/',
   'Agility AGLT 상장 첫 주 주가 35% 급락 — $11.51→$7.50, 11/12 당일 -17.9% (매출 $174K vs 손실 $362M)',
   'Agility Robotics AGLT 주식이 11/5 상장 후 급격히 하락. 첫날 시가 $11.26(장중 최고 $12.15)에서 11/12 종가 $7.50까지 약 35% 하락. 11/12 당일 -17.9% 대폭 하락, 거래량 460만 주. H1 2026 매출 $174K, 순손실 $362M이 시장에 부담. JPMorgan 중립 의견으로 커버리지 개시.'),

  ('Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/11/11/agility-robotics-completes-merger-with-churchill-capital/',
   'Agility Robotics 합병 완료 공식 확인 — 총 $465M 조달, Foxconn 주도 PIPE $201M, 30개 이상 기업 Digit 검토 (11/11)',
   '11/11 공식 확인: Churchill Capital XI 합병 완료, Nasdaq AGLT 거래 개시. PIPE $201M(Foxconn 주도, 주당 $10), 트러스트 $164M 포함 총 ~$465M 조달. Digit 5 다년 수주 $300M+ 확보. 30개 이상 기업이 Digit 도입 검토 중.'),

  ('IntelligentCIO / DC Velocity / Supply Chain Digital',
   'https://www.intelligentcio.com/north-america/2026/10/26/gxo-expands-digit-deployment/',
   'GXO Digit 배치 확대 — NC·TN 2개 사이트 추가, 10만 토트 돌파, 2027 초 운영 시작',
   'GXO Logistics가 Statesville(NC), Lebanon(TN) 2개 사이트에 Digit 추가 배치 결정. 2027년 초 운영 시작. Digit 4로 시작 후 Digit 5 전환 예정. Georgia 사이트에서 2024.6 이후 10만 토트 이상 이동 실적. Digit 5: 50lb(23kg) 적재, 90분 운용, 9분 충전.'),

  ('Forbes (John Koetsier) / Humanoids Daily',
   'https://www.forbes.com/sites/johnkoetsier/2026/11/12/gxo-doubles-down-on-humanoids-with-plan-for-up-to-1000-apptronik-robots/',
   'GXO, Apptronik Apollo 최대 1,000대 LOI 체결 — 4년 단계적 배치, 시간당 $15 목표 (11/12)',
   'Forbes(11/12) 보도: GXO Logistics가 Apptronik과 Apollo 휴머노이드 최대 1,000대 배치 LOI 체결. 4년간 단계적 배치, 시간당 $15 목표 비용. 확정 주문이 아닌 조건부 LOI — 성능·안전·운영 KPI 충족 시 확대. goods-to-person, case/tote 이동, packing, sortation 작업 대상.'),

  ('Euronews / China Daily / Forbes',
   'https://euronews.com/2026/11/09/web-summit-lisbon-2026-chinas-robotos-take-to-the-stage-as-tech-conference-launches',
   'Agibot A3, Web Summit 2026 리스본 오프닝 메인 스테이지 장식 — 중국 AI 로봇 글로벌 주목 (11/9)',
   '11/9 Web Summit 2026(리스본) 오프닝 메인 스테이지에서 Agibot A3 로봇들이 댄싱 퍼포먼스 선보임. Euronews "중국 AI 로봇이 기술 컨퍼런스를 열었다" 보도. Web Summit 설립자 Paddy Cosgrave "미래의 가장 큰 이름은 캘리포니아가 아닌 중국에서 나올 것" 발언. China Daily(11/13) "포르투갈 글로벌 웹서밋에서 중국 휴머노이드가 쇼를 훔쳤다" 보도.'),

  ('Forbes (John Koetsier)',
   'https://www.forbes.com/sites/johnkoetsier/2026/11/10/robot-trash-talk-at-web-summit-as-agibot-disses-tesla-figure-unitree/',
   'Agibot, Web Summit에서 Tesla·Figure AI·Unitree 공개 비판 — Forbes "Robot Trash Talk" 보도 (11/10)',
   'Forbes(11/10) 보도: Agibot 대표가 Web Summit 무대에서 Tesla, Figure AI, Unitree를 직접 거론하며 비판. "Robot Trash Talk At Web Summit As Agibot Disses Tesla, Figure, Unitree" 제목. IDC H1 2026 글로벌 출하 1위, 누적 20,000대 생산 실적을 근거로 경쟁사 포지셔닝 공격.'),

  ('AppleInsider',
   'https://appleinsider.com/articles/26/11/09/how-a-mac-mini-powers-a-staggeringly-capable-robot-without-human-training',
   'Apple 연구진, Mac mini M4 Pro로 Unitree G1 자율 훈련 성공 — 텔레오퍼레이션 없이 학습 (11/9)',
   '11/9 AppleInsider 보도. Apple 연구진이 M4 Pro Mac mini(64GB RAM)를 백팩으로 장착해 Unitree G1을 인간 시연 없이 자율 훈련시키는 데 성공. 로봇이 자체 탐색으로 물체 조작 학습. Apple의 로보틱스 연구 역량 과시이자 G1 플랫폼의 연구용 채택 사례.'),

  ('PR Newswire (APAC)',
   'https://www.prnewswire.com/apac/news-releases/joyson-electronics-delivered-first-high-performance-robotic-brain-backpack-to-unitree-robotics-302937091.html',
   'Joyson Electronics, Unitree에 고성능 로봇 브레인 백팩 최초 납품 — 제품 배치 단계 진입 (11/10)',
   '11/10 Joyson Electronics가 Unitree Robotics에 고성능 로봇 브레인 백팩 최초 납품. 양사 파트너십이 제품 배치 단계 진입. 후속 보도나 상세 스펙은 미확인.'),

  ('Times Live / KTVU (JPMorgan 보고서 인용)',
   'https://timeslive.co.za/news/sci-tech/2026-11-12-us-humanoid-robot-production-could-hit-400000-by-2030-jp-morgan',
   'JPMorgan: 미국 2030년 휴머노이드 30~40만대 생산 전망 — Tesla, BD Atlas, Figure AI 주요 플랫폼 지목 (11/12)',
   'JPMorgan 11/12 보고서: 2030년까지 미국 내 30~40만대 휴머노이드 생산 전망. Tesla Optimus, Boston Dynamics Atlas, Figure AI를 주요 플랫폼으로 지목. 핸드, 액추에이터, 브레인, 생산 용량이 주요 병목으로 지적. 산업 전반의 스케일업 도전과제 분석.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

-- Atlas: 휠 실험 + CEO 교체
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "wheel_experiment", "new_value": "11/9 Atlas 스쿠터 휠 장착 실험: 가상 RL 훈련 후 첫 시도 360도 회전 점프 성공. 전신 제어 역량 시연. 상용화 계획은 아니나 표준 구성에 적용 중.", "source": "The Robot Report / Interesting Engineering / Unite.AI 2026-11-09", "reliability": "A"}, {"field": "ceo_change", "new_value": "10/7 Rohit Prasad(전 Amazon AI·Alexa SVP) 3대 CEO 취임. Robert Playter 2월 퇴임 후 CFO Amanda McMaster 임시 CEO. Physical AI 상용화 가속 신호.", "source": "Robotics247 / AI Magazine / Engineering.com", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%스쿠터 휠 장착 실험%360도 회전 점프%' AND created_at::date = CURRENT_DATE);

-- Agility: 주가 급락 + 합병 완료 + GXO 확대
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "stock_performance", "new_value": "AGLT 상장 첫 주 35% 급락: $11.51→$7.50. 11/12 당일 -17.9%, 거래량 460만 주. JPMorgan 중립 커버리지 개시.", "source": "StockAnalysis / Investing.com / BriefGlance", "reliability": "A"}, {"field": "merger_confirmed", "new_value": "11/11 합병 완료 공식 확인. 총 ~$465M 조달(PIPE $201M Foxconn 주도 + 트러스트 $164M). 30개 이상 기업 Digit 도입 검토.", "source": "Robotics & Automation News 2026-11-11", "reliability": "A"}, {"field": "gxo_expansion", "new_value": "GXO Digit 배치 확대: Statesville(NC)·Lebanon(TN) 2개 사이트 추가, 2027 초 운영 시작. GA 사이트 10만 토트 돌파.", "source": "IntelligentCIO / DC Velocity / Supply Chain Digital", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%AGLT 상장 첫 주 35%25 급락%GXO Digit 배치 확대%' AND created_at::date = CURRENT_DATE);

-- Apptronik: GXO 1,000대 LOI
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "gxo_loi", "new_value": "11/12 GXO Logistics와 Apollo 최대 1,000대 LOI 체결. 4년 단계적 배치, 시간당 $15 목표. 조건부 LOI(KPI 충족 시 확대). goods-to-person, packing, sortation 대상.", "source": "Forbes (John Koetsier) 2026-11-12 / Humanoids Daily", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%GXO Logistics%Apollo 최대 1,000대 LOI%' AND created_at::date = CURRENT_DATE);

-- Agibot: Web Summit
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "web_summit", "new_value": "11/9 Web Summit 2026 리스본 오프닝 메인 스테이지 A3 댄싱 퍼포먼스. 글로벌 브랜딩 대형 이벤트. 11/10 Forbes: Tesla·Figure·Unitree 공개 비판(Robot Trash Talk).", "source": "Euronews / China Daily / Forbes (John Koetsier)", "reliability": "A"}, {"field": "convenience_store_trial", "new_value": "11/2~3 상하이 편의점 G2 6대 24시간 시범운영. 1,730건 업무 처리. 4대 통과, 2대 탈락. 라이브스트림 200만 시청자.", "source": "Interesting Engineering / TechEdge AI / Gadget Review", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Web Summit 2026 리스본%Robot Trash Talk%' AND created_at::date = CURRENT_DATE);

-- Unitree: Apple 연구 + Joyson 납품
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "apple_research", "new_value": "11/9 Apple 연구진이 M4 Pro Mac mini(64GB)를 백팩 장착해 G1을 텔레오퍼레이션 없이 자율 훈련 성공. 연구용 플랫폼으로서 G1 채택 사례.", "source": "AppleInsider 2026-11-09", "reliability": "B"}, {"field": "joyson_partnership", "new_value": "11/10 Joyson Electronics 고성능 로봇 브레인 백팩 최초 납품. 제품 배치 단계 진입.", "source": "PR Newswire (APAC) 2026-11-10", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Apple 연구진%M4 Pro Mac mini%Joyson Electronics%' AND created_at::date = CURRENT_DATE);

-- Figure AI: JPMorgan 보고서
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "jpmorgan_report", "new_value": "11/12 JPMorgan 보고서: 미국 2030년 30~40만대 휴머노이드 생산 전망. Figure AI를 Tesla, BD Atlas와 함께 주요 플랫폼으로 지목.", "source": "Times Live / KTVU (JPMorgan 보고서 인용) 2026-11-12", "reliability": "B"}, {"field": "figure03_autonomous", "new_value": "Figure 03 수십 대 본사 자율 운행 영상 공개. Santa Clara 야간 교대 코디네이터 채용 중 — 24시간 운용 체제 전환 추정.", "source": "Humanoids Daily", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%JPMorgan 보고서%30~40만대%Figure 03 수십 대%' AND created_at::date = CURRENT_DATE);

-- Tesla Optimus: Optimus Academy (Q3 기반, 11월 계속 보도)
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "optimus_academy", "new_value": "Optimus Academy: 10,000~20,000대 로봇 배치 실세계 데이터 훈련 시설. 시뮬레이션-현실 격차 해소 목적. AI5 칩 통합 2027년 4월 목표. Musk: 유아를 양육하는 것과 같다.", "source": "The Next Web / Crypto Briefing / Basenor (Q3 2026 실적발표 기반)", "reliability": "B"}, {"field": "jpmorgan_coverage", "new_value": "11/12 JPMorgan: Tesla Optimus를 미국 주요 휴머노이드 플랫폼으로 지목. 2030년 30~40만대 미국 생산 전망.", "source": "JPMorgan Report / Times Live 2026-11-12", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Optimus Academy%10,000~20,000대%AI5 칩%' AND created_at::date = CURRENT_DATE);

-- 1X NEO: 상태 변동 없음 (기록용)
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "status_unchanged", "new_value": "11/8~13 기간 신규 뉴스 없음. 소비자 배송 상태 여전히 불투명(독립 검증 인도 없음). SoftBank $6B 지배지분 인수 협상(8월 보도) 후속 없음.", "source": "종합 (ai2.work / robozaps / The Information)", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11/8~13 기간 신규 뉴스 없음%SoftBank%$6B%' AND created_at::date = CURRENT_DATE);

COMMIT;
