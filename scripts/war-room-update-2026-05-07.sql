-- =============================================================
-- ARGOS War Room 경쟁사 데이터 자동 업데이트 - 2026-05-07
-- 수집 기업: Tesla, Boston Dynamics, Figure AI, Unitree,
--           Agility Robotics, Apptronik, 1X Technologies, Agibot
-- =============================================================

BEGIN;

-- =============================================================
-- 1. 신규 경쟁사 추가 (기존: digit, optimus, figure, neo, atlas, cloid)
--    추가: unitree, apptronik, agibot
-- =============================================================

INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  ('unitree', 'H1/G1/B2', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apptronik', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot', 'X1', 'Agibot (AGIBOT)', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO UPDATE SET
  stage = EXCLUDED.stage,
  updated_at = NOW();

-- =============================================================
-- 2. ci_monitor_alerts - 수집된 뉴스/업데이트 알림 등록
--    (competitor_id는 서브쿼리로 해결)
-- =============================================================

-- [TESLA OPTIMUS] - 4건
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
VALUES
(
  'Electrek',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  'Tesla, Fremont 공장 Model S/X 라인을 Optimus 로봇 생산 라인으로 전환 (2026년 7-8월 시작)',
  '연 100만대 목표 1세대 생산라인. 10,000개 고유 부품. 2026년 생산 목표 수량은 미공개로 기존 예측 대비 하향 신호.',
  (SELECT id FROM ci_competitors WHERE slug = 'optimus'),
  'pending', NOW()
),
(
  'The Robot Report',
  'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  'Tesla, 텍사스에 연 1,000만대 Optimus 공장 착공 — $5B-$10B 투자',
  'Giga Texas 북부 캠퍼스에 520만 sqft 이상 신규 공간 추가 계획. 2세대 생산라인으로 장기 연 1천만대 목표.',
  (SELECT id FROM ci_competitors WHERE slug = 'optimus'),
  'pending', NOW()
),
(
  'Tesla AI Day / eWeek',
  'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
  'Optimus Gen3 핸드: 팔+손당 25개 액추에이터 (Gen2 대비 4.5배), Q2-Q3 공장 배치 예정',
  'Gen3 손은 전팔/손당 25개 액추에이터(로봇 전체 50개). 양산 준비 완료.',
  (SELECT id FROM ci_competitors WHERE slug = 'optimus'),
  'pending', NOW()
),
(
  'Teslarati',
  'https://www.teslarati.com/tesla-optimus-factory-site-texas/',
  'Optimus 일반 판매 2027년 말 목표, 가격 $20,000-$30,000',
  'Elon Musk 발표. 초기 생산은 "상당히 느릴 것"이라고 언급.',
  (SELECT id FROM ci_competitors WHERE slug = 'optimus'),
  'pending', NOW()
),

-- [BOSTON DYNAMICS ATLAS] - 4건
(
  'Boston Dynamics / CES 2026',
  'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
  'Boston Dynamics, CES 2026에서 Atlas 양산형 공개 — 즉시 생산 시작',
  '2026년 1월 5일 CES 발표. 리치 7.5ft, 110lbs 리프트, -4~104°F 운용, 듀얼 교체형 배터리로 4시간 연속 작동.',
  (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
  'pending', NOW()
),
(
  'Engadget / The Register',
  'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  '2026년 Atlas 전량 사전 계약 완료 — Hyundai RMAC + Google DeepMind에 배치',
  '2026년 배치분은 완판. 추가 고객은 2027년 초부터. Hyundai 로봇틱스 메타플랜트와 Google DeepMind에 우선 배치.',
  (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
  'pending', NOW()
),
(
  'IMechE / Boston Dynamics',
  'https://www.imeche.org/news/news-article/boston-dynamics-reveals-commercial-version-of-its-atlas-humanoid-and-sends-it-to-work-in-hyundai-factories',
  'Google DeepMind 파운데이션 모델 Atlas 탑재 파트너십 체결',
  'Google DeepMind의 최첨단 파운데이션 모델을 Atlas에 통합하여 인지 능력 강화. Hyundai Mobis가 액추에이터 공급.',
  (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
  'pending', NOW()
),
(
  'Automate.org',
  'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
  'Hyundai, $26B 미국 투자 — 연 30,000대 로봇 공장 포함 (2028년 목표)',
  'Hyundai Motor Group 미국 $26B 투자 계획에 연 30,000대 로봇 전용 공장 포함.',
  (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
  'pending', NOW()
),

-- [FIGURE AI] - 4건
(
  'Figure AI Official',
  'https://www.figure.ai/news/series-c',
  'Figure AI, Series C에서 $1B+ 조달 — $39B 밸류에이션',
  '총 펀딩 $1.9B+. Parkway VC 리드, NVIDIA, LG Technology Ventures, Intel Capital, Qualcomm Ventures 등 참여.',
  (SELECT id FROM ci_competitors WHERE slug = 'figure'),
  'pending', NOW()
),
(
  'CNBC',
  'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
  'Figure 3 로봇, 백악관 방문 — 멜라니아 트럼프와 함께 등장',
  '2026년 3월 Global Coalition Summit에서 Figure 3 시연. 사회적 인지도 급상승.',
  (SELECT id FROM ci_competitors WHERE slug = 'figure'),
  'pending', NOW()
),
(
  'Figure AI / BMW',
  'https://www.figure.ai/news',
  'Figure 02, BMW 스파르탄버그 공장 11개월 배치 — 90,000+ 부품 적재, 1,250+ 런타임시간',
  '일 10시간 교대 운영. 30,000대 이상 X3 차량 생산에 기여. 상용 배치 실적 검증.',
  (SELECT id FROM ci_competitors WHERE slug = 'figure'),
  'pending', NOW()
),
(
  'Figure AI',
  'https://www.figure.ai/news',
  'Helix AI (자체 VLA) — OpenAI 파트너십 종료 후 독자 개발 완료',
  '비전-언어-행동 신경망을 100% 인하우스 개발. 자연어 지시로 협업 작업 및 상호작용 가능.',
  (SELECT id FROM ci_competitors WHERE slug = 'figure'),
  'pending', NOW()
),

-- [UNITREE] - 4건
(
  'eWeek / TrendForce',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree, 2026년 20,000대 출하 목표 — 생산능력 4배 확대',
  '2025년 335% 매출 성장(¥1.708B). Morgan Stanley, 2026년 중국 전체 휴머노이드 판매 예측 28,000대로 상향.',
  (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
  'pending', NOW()
),
(
  'RobotToday / Shanghai Stock Exchange',
  'https://robottoday.com/article/unitree-s-ipo-review-what-it-means-for-china-s-humanoid-robot-ipo-landscape',
  'Unitree, STAR Market IPO 신청 — ¥4.2B(~$610M) 조달 목표, 2026 중순 상장 예정',
  '2026년 3월 20일 상하이증권거래소 접수. 4월 1일 CSAC 현장 점검 선정.',
  (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
  'pending', NOW()
),
(
  'Interesting Engineering / Japan Airlines',
  'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
  'G1, 도쿄 하네다공항에 상용 배치 — JAL + GMO 파트너십 (2028년까지 시범)',
  '휴머노이드 로봇 최초 공항 상용 배치. 수화물/화물 처리 작업.',
  (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
  'pending', NOW()
),
(
  'Unitree Official / CES 2026',
  'https://www.dronesplusrobotics.com/post/unitree-robotics-sets-a-new-benchmark-at-ces-2025',
  'H2 출시 ($29,900, 2026년 4월) — 31 DOF 산업용 + G1-D 휠 변형 모델',
  '바이패드 레그 대신 디퍼렌셜 드라이브 휠 베이스의 G1-D 변형. 데이터 수집/AI 훈련용.',
  (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
  'pending', NOW()
),

-- [AGILITY ROBOTICS DIGIT] - 3건
(
  'Agility Robotics / Toyota',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
  'Digit, Toyota Motor Manufacturing Canada와 상용 계약 체결 — 3대 배치 시작, 7대 할당',
  '1년 파일럿 성공 후 상용 전환. TMMC 자동차 제조 및 물류 작업에 투입.',
  (SELECT id FROM ci_competitors WHERE slug = 'digit'),
  'pending', NOW()
),
(
  'Agility Robotics / Mercado Libre',
  'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
  'Digit, Mercado Libre 텍사스 물류센터 상용 배치 계약 — 라틴아메리카 확장 계획',
  '상거래 풀필먼트 작업. 라틴아메리카 창고로 확장 탐색 중.',
  (SELECT id FROM ci_competitors WHERE slug = 'digit'),
  'pending', NOW()
),
(
  'Agility Robotics Official',
  'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
  'Digit, GXO 시설에서 100,000+ 토트 이동 달성 — ISO 기능안전 인증 추진 (2026 중후반)',
  'Fortune 500 기업 배치 확대: GXO, Schaeffler, Amazon, Toyota. 차세대 Digit으로 협업 안전 로봇 최초 달성 목표.',
  (SELECT id FROM ci_competitors WHERE slug = 'digit'),
  'pending', NOW()
),

-- [APPTRONIK APOLLO] - 3건
(
  'CNBC / Apptronik',
  'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  'Apptronik, $520M 추가 조달 ($5B 밸류에이션) — 총 Series A $935M+',
  'Google, B Capital, Mercedes-Benz, PEAK6 참여. 총 자본 ~$1B. 양산 확대 및 신규 로봇 2026 공개 예정.',
  (SELECT id FROM ci_competitors WHERE slug = 'apptronik'),
  'pending', NOW()
),
(
  'The Robot Report / Jabil',
  'https://www.therobotreport.com/apptronik-collaborates-with-jabil-to-produce-apollo-humanoid-robots/',
  'Apptronik-Jabil 파트너십: Apollo가 Apollo를 조립하는 자기복제 제조 시작',
  'Jabil 공장에서 Apollo 로봇 제조 및 통합. "Apollo가 Apollo를 만든다" 컨셉 실현.',
  (SELECT id FROM ci_competitors WHERE slug = 'apptronik'),
  'pending', NOW()
),
(
  'Apptronik / Google DeepMind',
  'https://apptronik.com/news2',
  'Google DeepMind Gemini Robotics와 전략적 파트너십 — 차세대 휴머노이드 AI',
  '업계 선도적 DeepMind 파트너십. Mercedes-Benz, GXO에서 파일럿 배치 진행 중.',
  (SELECT id FROM ci_competitors WHERE slug = 'apptronik'),
  'pending', NOW()
),

-- [1X TECHNOLOGIES NEO] - 3건
(
  'GlobeNewsWire / 1X',
  'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X, 헤이워드 CA에 미국 최초 수직통합 휴머노이드 공장 개설 — 연 10,000대 생산',
  '58,000 sqft, 200+ 직원. 첫해 10,000대 생산(5일 만에 완판). 2027년 100,000대+ 목표.',
  (SELECT id FROM ci_competitors WHERE slug = 'neo'),
  'pending', NOW()
),
(
  '1X / EQT',
  'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
  '1X-EQT 전략적 파트너십: 2026-2030년 최대 10,000대 NEO를 EQT 포트폴리오 기업에 배치',
  'EQT 300+ 포트폴리오 기업 대상. 제조, 물류, 창고 등 산업용 활용. 가정용 NEO의 산업 확장.',
  (SELECT id FROM ci_competitors WHERE slug = 'neo'),
  'pending', NOW()
),
(
  '1X Technologies',
  'https://interestingengineering.com/ai-robotics/1x-humanoid-robot-neo-factory-california',
  'NEO Early Access $20,000 / 구독 $499/월 — 2026년 소비자 배송 시작',
  '가정용 휴머노이드 최초 소비자 직접 판매. Early Access 구매자 우선 배송.',
  (SELECT id FROM ci_competitors WHERE slug = 'neo'),
  'pending', NOW()
),

-- [AGIBOT] - 4건
(
  'The Robot Report',
  'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
  'AGIBOT, 10,000번째 휴머노이드 로봇 출하 — 3개월 만에 5,000→10,000대 달성',
  '2025년 1,000대 → 5,000대 → 10,000대. 초기 검증 단계에서 스케일러블 배치로 전환.',
  (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
  'pending', NOW()
),
(
  'Gasgoo / Agibot',
  'https://autonews.gasgoo.com/articles/news/from-60-million-to-105-billion-to-a-100-billion-target-is-agibots-358-plan-ambition-or-a-bubble-2046210816838205440',
  'AGIBOT "358" 계획: 2025 매출 ¥10.5B → 2027 ¥100B → 2030 ¥1000B 목표',
  '2025년 매출 ¥10.5억(전년 대비 20배 성장). 중국 휴머노이드 시장 80% 점유 (Unitree와 공동).',
  (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
  'pending', NOW()
),
(
  'PR Newswire / CES 2026',
  'https://www.prnewswire.com/news-releases/agibots-humanoid-robots-take-home-multiple-best-of-ces-2026-awards-following-us-debut-302663224.html',
  'AGIBOT, CES 2026 미국 데뷔 — 다수 Best of CES 2026 수상',
  '풀 라인업 전시. 4개 신규 로봇 플랫폼 + 다수 AI 모델 공개.',
  (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
  'pending', NOW()
),
(
  'Assembly Magazine / Minth Group',
  'https://www.assemblymag.com/articles/99886-agibot-launches-new-humanoid-robots-partners-with-minth-to-advance-robotics-training',
  'AGIBOT-Minth Group 파트너십: 유럽 공장에서 로봇 실환경 훈련 및 데이터 수집',
  'Minth 공장을 로봇 실환경 학습 데이터 수집 거점으로 활용. 유럽 시장 확장 교두보.',
  (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
  'pending', NOW()
);

-- =============================================================
-- 3. ci_staging - CI 값 업데이트 제안 (검증 대기)
--    (비즈니스 레이어 항목 업데이트)
-- =============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status)
VALUES
(
  'value_update',
  '[
    {"competitorSlug":"optimus","itemName":"상용화 단계","value":"Production (Fremont 전환 중, 2026 Q3 시작)","confidence":"A","source":"Electrek 2026-04-22","sourceUrl":"https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/"},
    {"competitorSlug":"optimus","itemName":"가격대","value":"$20,000-$30,000 (2027 일반 판매 목표)","confidence":"B","source":"Elon Musk 발표","sourceUrl":"https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/"},
    {"competitorSlug":"optimus","itemName":"손 자유도","value":"Gen3: 25 액추에이터/팔+손 (총 50, Gen2 대비 4.5x)","confidence":"A","source":"Tesla 공식","sourceUrl":"https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/"},
    {"competitorSlug":"optimus","itemName":"제조 파트너","value":"Fremont (Model S/X 라인 전환) + Giga Texas (연 10M 목표)","confidence":"A","source":"Tesla/The Robot Report","sourceUrl":"https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/"},

    {"competitorSlug":"atlas","itemName":"상용화 단계","value":"Commercial (CES 2026 양산형 공개, 2026 전량 사전계약)","confidence":"A","source":"Boston Dynamics 공식","sourceUrl":"https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/"},
    {"competitorSlug":"atlas","itemName":"주요 고객","value":"Hyundai RMAC, Google DeepMind (2026), 추가 고객 2027 초","confidence":"A","source":"Boston Dynamics / Engadget","sourceUrl":"https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html"},
    {"competitorSlug":"atlas","itemName":"기술 파트너","value":"Google DeepMind (파운데이션 모델), Hyundai Mobis (액추에이터), NVIDIA","confidence":"A","source":"Boston Dynamics 공식","sourceUrl":"https://www.imeche.org/news/news-article/boston-dynamics-reveals-commercial-version-of-its-atlas-humanoid-and-sends-it-to-work-in-hyundai-factories"},
    {"competitorSlug":"atlas","itemName":"연속동작시간","value":"~4시간 (듀얼 교체형 배터리, 자동 교체)","confidence":"A","source":"Boston Dynamics CES 2026","sourceUrl":"https://bostondynamics.com/products/atlas/"},

    {"competitorSlug":"figure","itemName":"총 펀딩","value":"$1.9B+ (Series C $1B+ 포함)","confidence":"A","source":"Figure AI 공식","sourceUrl":"https://www.figure.ai/news/series-c"},
    {"competitorSlug":"figure","itemName":"최근 밸류에이션","value":"$39B (Series C, 2026)","confidence":"A","source":"Figure AI 공식","sourceUrl":"https://www.figure.ai/news/series-c"},
    {"competitorSlug":"figure","itemName":"주요 투자자","value":"Parkway VC, NVIDIA, LG Tech Ventures, Intel Capital, Qualcomm, Brookfield, Salesforce","confidence":"A","source":"Figure AI 공식","sourceUrl":"https://www.figure.ai/news/series-c"},
    {"competitorSlug":"figure","itemName":"배치 대수","value":"BMW 스파르탄버그 11개월 배치, 90,000+ 부품, 1,250+ 런타임시간","confidence":"A","source":"Figure AI 공식","sourceUrl":"https://www.figure.ai/news"},
    {"competitorSlug":"figure","itemName":"핵심 AI 모델","value":"Helix VLA (OpenAI 독립 후 100% 인하우스 개발)","confidence":"A","source":"Figure AI 공식","sourceUrl":"https://www.figure.ai/news"},

    {"competitorSlug":"neo","itemName":"제조 파트너","value":"Hayward CA 자체 공장 (미국 최초 수직통합, 58K sqft, 200+ 직원)","confidence":"A","source":"1X 공식","sourceUrl":"https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html"},
    {"competitorSlug":"neo","itemName":"배치 대수","value":"첫해 10,000대 (5일 만에 완판), 2027 100,000대 목표","confidence":"A","source":"1X / TechFundingNews","sourceUrl":"https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/"},
    {"competitorSlug":"neo","itemName":"가격대","value":"$20,000 (Early Access) / $499/월 구독","confidence":"A","source":"1X 공식","sourceUrl":"https://interestingengineering.com/ai-robotics/1x-humanoid-robot-neo-factory-california"},
    {"competitorSlug":"neo","itemName":"전략 파트너","value":"EQT (2026-2030 최대 10,000대 산업 배치)","confidence":"A","source":"1X / BusinessWire","sourceUrl":"https://www.businesswire.com/news/home/20251211360340/en/"},

    {"competitorSlug":"digit","itemName":"주요 고객","value":"GXO, Schaeffler, Amazon, Toyota TMMC, Mercado Libre","confidence":"A","source":"Agility Robotics 공식","sourceUrl":"https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada"},
    {"competitorSlug":"digit","itemName":"배치 대수","value":"GXO 100,000+ 토트 이동, Toyota TMMC 7대 계약, Mercado Libre 배치","confidence":"A","source":"Agility Robotics 공식","sourceUrl":"https://www.agilityrobotics.com/content/digit-moves-over-100k-totes"},
    {"competitorSlug":"digit","itemName":"국제 인증","value":"ISO 기능안전 인증 추진 중 (2026 중후반 예상)","confidence":"B","source":"Agility Robotics 공식","sourceUrl":"https://www.agilityrobotics.com/"}
  ]'::jsonb,
  'auto_crawl',
  'pending'
);

-- =============================================================
-- 4. 신규 경쟁사(Unitree, Apptronik, Agibot)에 대한
--    ci_values 빈 레코드 생성 (모든 ci_items에 대해)
-- =============================================================

INSERT INTO ci_values (competitor_id, item_id, value, confidence)
SELECT c.id, i.id, NULL, 'F'
FROM ci_competitors c
CROSS JOIN ci_items i
WHERE c.slug IN ('unitree', 'apptronik', 'agibot')
ON CONFLICT (competitor_id, item_id) DO NOTHING;

-- =============================================================
-- 5. ci_freshness 레코드 생성 (신규 경쟁사)
-- =============================================================

INSERT INTO ci_freshness (layer_id, competitor_id, last_verified, tier)
SELECT l.id, c.id, NOW(), 2
FROM ci_layers l
CROSS JOIN ci_competitors c
WHERE c.slug IN ('unitree', 'apptronik', 'agibot')
ON CONFLICT (layer_id, competitor_id) DO NOTHING;

COMMIT;
