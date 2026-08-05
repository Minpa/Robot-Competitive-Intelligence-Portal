-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-05
-- 자동 수집 데이터 (웹 검색 기반)
-- 이전 스크립트(2026-07-30)와 중복되지 않는 신규 항목만 포함
-- DB 직접 접속 불가로 수동 실행 필요: psql "$DATABASE_URL" -f scripts/ci-update-2026-08-05.sql

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림 (신규 항목)
-- ============================================================

-- 1. Tesla Optimus
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TechTimes', 'https://www.techtimes.com/articles/321012/20260720/tesla-optimus-production-count-remains-zero-q2-earnings-call-looms-wednesday.htm',
   '[신뢰도 B] Tesla Optimus 생산 대수 0대 유지, Q2 실적 발표에서도 로봇 생산 수량 미공개',
   'Q2 실적 발표에서 Optimus 생산 수량 보고 없음. "late July/August" 생산 시작 가이던스를 "soon"과 "later this year"로 후퇴. 10,000개 고유 부품으로 생산 속도 "예측 불가능"(Musk). 2026년 검증된 생산 유닛 0대.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Electrek', 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
   '[신뢰도 B] Tesla Optimus V3 공개 시점 다시 연기 — "올해 후반"으로 변경',
   'Optimus V3 공식 공개 시점이 반복적으로 연기. 최초 CES 2026 예상 → Q1 → Q2 → "올해 후반"으로 후퇴. Fremont 공장 전환은 완료되었으나 실제 생산라인 가동 일정 불투명.',
   NOW(), 'pending'),

-- 2. Boston Dynamics Atlas
  (gen_random_uuid(), 'Forbes', 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   '[신뢰도 A] Boston Dynamics 신형 Atlas: 기존 대비 "차수가 다른 단순함" 달성',
   'BD CEO Robert Playter 인터뷰: 신형 Atlas는 이전 유압식 대비 "order of magnitude simpler". 전기 구동 전환으로 부품 수 대폭 감소, 유지보수성 획기적 개선. 이미 2026년 전체 생산분 sold-out. Hyundai RMAC 및 DeepMind 배치 진행 중.',
   NOW(), 'pending'),

-- 3. Figure AI
  (gen_random_uuid(), 'BMW Press / Figure AI', 'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg?language=en',
   '[신뢰도 A] BMW Spartanburg Hall 52에 Figure 03 배치, 물류 시퀀싱 작업 투입',
   'Figure 03가 BMW Spartanburg 공장 Hall 52(조립·물류 홀)에 배치 완료. 비정렬 부품을 시퀀싱 트롤리에 분류하여 조립라인에 전달하는 복합 물류 작업 수행. F.02 이후 body shop에서 logistics sequencing으로 작업 범위 확대. 무선 충전, 음성 통신, 촉각센서 탑재 핸드 등 F.03 고유 기능 활용.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'ExplainX.ai', 'https://explainx.ai/blog/figure-ai-robots-outnumber-humans-milestone-2026',
   '[신뢰도 C] Figure AI BotQ 공장: 로봇이 인간 작업자 수 초과 달성',
   'Figure AI의 BotQ 공장에서 로봇 수가 인간 작업자 수를 초과하는 이정표 달성. 시간당 1대 생산율 유지(120일 전 일 1대에서 개선). 204,000건 이상 패키지 자율 분류 완료.',
   NOW(), 'pending'),

-- 4. Unitree
  (gen_random_uuid(), 'Caixin Global', 'https://www.caixinglobal.com/2026-07-31/robotics-startup-unitree-launches-620-million-star-market-ipo-102469723.html',
   '[신뢰도 A] Unitree IPO 발행 절차 개시: 8/5 가격 산정, 8/10 청약, $620M 규모',
   '7월 31일 IPO 발행 절차 공식 개시. 8월 5일 기관 수요예측(bookbuilding) 시작, 8월 10일 온·오프라인 청약, 8월 12일 납입, 8월 19일경 상장 예상. 발행규모 42억 위안($620M), 4,045만주(10%), 전량 신주 발행. A주 시장 최초 휴머노이드 로봇 종목.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Seoul Economic Daily', 'https://en.sedaily.com/international/2026/08/01/two-days-after-us-curbs-chinas-unitree-confirms-ipo-next',
   '[신뢰도 A] 미국 제재 2일 후 Unitree IPO 확정 — 지정학적 긴장 속 상장 강행',
   '미국의 대중 로봇 관련 제재 발표 2일 후, Unitree IPO 일정 공식 확정. IPO 신청서 접수(3/20)부터 CSRC 승인(7/2)까지 104일 — STAR Market 사전심사 제도 도입 이후 최단 기록. 2025년 매출 16.99억 위안, 핵심사업 매출총이익률 60.13%.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'BigGo Finance', 'https://finance.biggo.com/news/d2d0ffa7-a64d-4ff6-b745-4ca090d7609a',
   '[신뢰도 B] Unitree 상반기 매출 성장률 40%로 급락 — IPO 리스크 요인',
   'IPO 서류 공개로 확인된 2026년 상반기 매출 성장률 40% (2025년 대비 급감). 높은 밸류에이션 대비 성장 둔화 우려. 42억 위안 목표 밸류에이션의 적정성 논란.',
   NOW(), 'pending'),

-- 5. Agility Robotics (Digit)
  (gen_random_uuid(), 'Agility Robotics Official', 'https://roboticsandautomationnews.com/2026/07/17/agility-robotics-opens-new-fremont-facility-to-accelerate-physical-ai-development/103426/',
   '[신뢰도 A] Agility Robotics, Fremont에 60,000sqft Physical AI Hub 개설',
   '캘리포니아 Fremont에 60,000sqft Physical AI 개발 허브 개설. AI 훈련, 테스트, SW 개발 지원. 약 200명 기술직 및 현장운영직 채용 예정. Digit AI 학습 가속화 목적. Nasdaq 상장(AGLT 티커) 준비와 병행.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Agility Robotics / GXO', 'https://www.agilityrobotics.com/content/digit-deployed-at-gxo-in-historic-humanoid-raas-agreement',
   '[신뢰도 A] Agility-GXO, 업계 최초 휴머노이드 RaaS 상업 계약 체결',
   'GXO Logistics와 업계 최초 다년간 Robotics-as-a-Service(RaaS) 상업 계약 체결. Georgia주 GXO 운영 Spanx 물류센터에 Digit 배치. 10만 개 이상 토트 이동 실적. 휴머노이드 로봇의 구독형 비즈니스 모델 최초 사례로 업계 주목.',
   NOW(), 'pending'),

-- 6. Apptronik (Apollo)
  (gen_random_uuid(), 'Forbes / Robotics 24/7', 'https://www.robotics247.com/article/apptronik-unveils-apollo-2-humanoid-robot-opens-robot-park-data-collection-and-training-facility',
   '[신뢰도 A] Apptronik Apollo 2 공개: 이족보행+바퀴 2종 구성, Apollo 3는 2027년',
   'Apollo 2: 이족보행형과 바퀴 기반형 2가지 구성으로 공개. 대규모 데이터 수집 목적의 "프로토타입 단계" 로봇. Apollo 3가 2027년 첫 "진정한 제품"으로 출시 예정. Robot Park(90,000sqft)에서 DeepMind Gemini Robotics 데이터 수집 진행 중.',
   NOW(), 'pending'),

-- 7. 1X Technologies (NEO)
  (gen_random_uuid(), 'Let''s Data Science', 'https://letsdatascience.com/news/1x-ships-neo-humanoid-robots-to-us-homes-774b7a74',
   '[신뢰도 C] 1X NEO 소비자 배송 시작 보도 — 공식 검증 미완료',
   '일부 매체에서 NEO 가정용 배송 시작 보도. 그러나 7월 중순 기준 검증된 고객 배송 사례 없음. 1X 공식 자료에서도 "첫 고객 배송"을 미래 시제로 기술. 10,000대 초년도 생산분 완판 상태. 가격 $20,000 또는 월 $499 렌탈.',
   NOW(), 'pending'),

-- 8. Agibot
  (gen_random_uuid(), 'GaGadget / Interesting Engineering', 'https://gagadget.com/en/719322-agibot-unveils-15000-robots-and-revolutionary-a3-ultra-humanoid-with-nvidia-thor-at-waic-2026/',
   '[신뢰도 A] Agibot A3 Ultra: NVIDIA Thor 탑재, 51 DOF, 8시간 연속 작동',
   'WAIC 2026에서 A3 Ultra 공개: 174cm, 60kg, 51 DOF, 팔당 5kg 페이로드, 8시간 연속 작동. NVIDIA Jetson Thor 프로세서 탑재. 배터리 스왑/직접 충전/자율 충전 3종 지원. 누적 15,000대 생산 돌파.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Robotics & Automation News', 'https://roboticsandautomationnews.com/2026/07/20/agibot-unveils-four-new-robots-at-waic-2026-as-it-expands-industrial-embodied-ai-portfolio/103505/',
   '[신뢰도 B] Agibot G2, Longcheer Technology 태블릿 QA 라인 실배치 — 36시간 내 통합',
   'Longcheer Technology 난창 공장에 G2 로봇 실배치. 태블릿 생산 품질검사 라인에서 자재 수집→부품 배치→검사 장비 조작→완제품 반납 전 공정 수행. 36시간 내 라인 통합 완료. 시프트당 약 3,000대 처리.',
   NOW(), 'pending'),

-- 9. 산업 전반 동향
  (gen_random_uuid(), 'Humanoid Index', 'https://humanoidindex.org/funding',
   '[신뢰도 B] 2026년 상반기 휴머노이드 로봇 업계 총 $6.2B 투자 유치 (20개사)',
   '2026년 7월 기준 25건 공시된 자금조달, 20개 기업에 걸쳐 $6.2B 조달. Apptronik $935M, Figure AI $1B+, Agility Robotics $150M 등. 전년 대비 투자 규모 대폭 증가. 업계 상용화 경쟁 본격화.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'EU-Startups', 'https://www.eu-startups.com/2026/07/new-unicorn-humanoid-secures-e133-million-at-e1-1-billion-valuation-to-scale-industrial-robotics-and-physical-ai/',
   '[신뢰도 A] 독일 Humanoid €133M 투자 유치, €1.1B 밸류에이션 — 유럽 유니콘 등극',
   '독일 Humanoid사 Series B에서 €133M 조달, 밸류에이션 €1.1B로 유니콘 등극. Schaeffler, SAP, NVIDIA, Bosch, Siemens 등 Fortune 500 기업 파트너십. Schaeffler와 업계 최대 규모 상업 계약(수천 대 규모) 체결.',
   NOW(), 'pending');

COMMIT;
