-- ARGOS CI War Room Auto-Update: 2026-05-04
-- 30 new intelligence items across 8 competitors
-- Deduplication: checked against existing 24 headlines in ci_monitor_alerts

BEGIN;

-- ============================================================
-- Helper: get competitor IDs and layer IDs
-- ============================================================

-- Tesla Optimus — NEW items (6)
WITH comp AS (SELECT id FROM ci_competitors WHERE slug = 'optimus' LIMIT 1),
     layer_biz AS (SELECT id FROM ci_layers WHERE slug = 'biz' LIMIT 1),
     layer_hw AS (SELECT id FROM ci_layers WHERE slug = 'hw' LIMIT 1),
     layer_safety AS (SELECT id FROM ci_layers WHERE slug = 'safety' LIMIT 1)

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('CNBC / Electrek',
   'https://www.cnbc.com/2026/01/28/tesla-ending-model-s-x-production.html',
   'Tesla Fremont Model S/X 라인 종료 → Optimus Gen 3 전환, 100만대/년 목표',
   'Tesla Q4 2025 실적발표에서 Model S/X 2026.5 생산 종료 확인. Fremont 라인을 Optimus Gen 3 전환, 런레이트 100만대/년. 초기 생산 2026.7~8월 시작 예정. Optimus V3 공개도 같은 시기로 연기.',
   (SELECT id FROM comp), (SELECT id FROM layer_biz), 'pending', NOW()),

  ('TechCrunch / Yahoo Finance',
   'https://techcrunch.com/2026/04/22/tesla-just-increased-its-capex-to-25b-heres-where-the-money-is-going/',
   'Tesla 2026 CapEx $250억으로 3배 증액 — Optimus·AI·칩팹 투자',
   'Q1 2026 실적발표(4.22) CapEx $250억 가이던스. 6개 공장 램프업, Optimus 생산, Cybercab, Cortex AI, Austin 칩팹. FCF 마이너스 전환 예정이나 $447억 현금 보유.',
   (SELECT id FROM comp), (SELECT id FROM layer_biz), 'pending', NOW()),

  ('Teslarati / The Robot Report',
   'https://www.teslarati.com/tesla-optimus-factory-site-texas/',
   'Giga Texas 전용 Optimus 공장 착공 — 연간 1,000만대 생산 목표',
   '2026.4 드론 촬영으로 Giga Texas 북쪽 캠퍼스 Optimus 전용 공장 부지 정지 작업 확인. 520만 sqft 신축, $30~100억 투자, 2027년 여름 생산 시작. Fremont 100만대+Texas로 장기 1,000만대 목표.',
   (SELECT id FROM comp), (SELECT id FROM layer_biz), 'pending', NOW()),

  ('Teslarati / Benzinga',
   'https://www.teslarati.com/tesla-optimus-boston-marathon/',
   'Optimus 보스턴 마라톤 공개 출연 — 셀피·응원 등 일반인 접촉',
   '2026.4.19-20 보스턴 마라톤 결승선 Tesla 쇼룸에서 Optimus 공개. 셀피 촬영, 응원 제스처 등 미국 내 가장 접근성 높은 공개 행사. 무료 입장.',
   (SELECT id FROM comp), (SELECT id FROM layer_hw), 'pending', NOW()),

  ('eWeek / Electrek',
   'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
   'Tesla Optimus 외부 고객 zero — 소비자 판매 2027년 후반 목표, $2~3만',
   '2026.5 기준 외부 고객 계약 없음. 모든 배치 Tesla 내부(Fremont/Austin 배터리 셀 분류 등 학습용). Musk: "2027년 Tesla 외부에서 유용하게" 목표. 소비자 가격 $2~3만.',
   (SELECT id FROM comp), (SELECT id FROM layer_biz), 'pending', NOW()),

  ('MIT Technology Review / TheresaRobotForThat',
   'https://www.theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
   'ISO 25785-1 휴머노이드 안전표준 Working Draft 단계 — 글로벌 규제 공백 지속',
   '2026 초 기준 휴머노이드 전용 연방법/EU 규정 없음. ISO 25785-1(동적 안정 로봇 안전) Working Draft. OSHA 자율로봇 가이드 2027 H1, EU AI Act 체계적 안전사례 2027 Q3 예상. Tesla Optimus ISO 10218-1 미취득.',
   (SELECT id FROM comp), (SELECT id FROM layer_safety), 'pending', NOW());

-- Also insert ci_staging for Tesla items
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('production', '{"competitorSlug":"optimus","headline":"Tesla Fremont Model S/X 라인 종료 → Optimus Gen 3 전환","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('funding', '{"competitorSlug":"optimus","headline":"Tesla 2026 CapEx $250억으로 3배 증액","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"optimus","headline":"Giga Texas 전용 Optimus 공장 착공 — 1,000만대 목표","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"optimus","headline":"Optimus 보스턴 마라톤 공개 출연","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"optimus","headline":"Optimus 외부 고객 zero — 소비자 판매 2027 후반","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('regulation', '{"competitorSlug":"optimus","headline":"ISO 25785-1 휴머노이드 안전표준 Working Draft","confidence":"C","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Boston Dynamics Atlas — NEW items (2)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('TheresaRobotForThat / Automate.org',
   'https://www.theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
   'Boston Dynamics ISO 25785-1 안전표준 공동주도 — Agility·A3 Association과 협력',
   'BD, Agility, A3 Association이 ISO 25785-1(동적 안정 로봇 안전) 워킹그룹 공동 주도. 2026 초 Working Draft. Atlas 온보드 안전시스템: 자율주행 best practice 적용, 펜스리스 가딩(반경 내 인체 감지 시 정지).',
   (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
   (SELECT id FROM ci_layers WHERE slug = 'safety'),
   'pending', NOW()),

  ('KED Global / AI CERTs',
   'https://www.kedglobal.com/robotics/newsView/ked202601200007',
   'Atlas 가격 전략: 미국 제조업 근로자 2년 급여 이하(~$32만) — 2년 내 ROI 목표',
   '공식 가격 미공개. 업계 분석: 미국 제조업 근로자 2년 급여 이하(~$32만) 책정. $13~42만 범위 추정. 2년 내 ROI. 2026년 전량 Hyundai RMAC+DeepMind 배정. 일반 고객 2027 초 가능.',
   (SELECT id FROM ci_competitors WHERE slug = 'atlas'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('regulation', '{"competitorSlug":"atlas","headline":"BD ISO 25785-1 안전표준 공동주도","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"atlas","headline":"Atlas 가격 ~$32만 이하, 2년 ROI","confidence":"C","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Figure AI — NEW items (5)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('Figure AI 공식 / eWeek',
   'https://www.figure.ai/news/ramping-figure-03-production',
   'Figure BotQ 공장 24배 처리량 달성 — 시간당 1대 생산, 연 12,000대 목표',
   '2026.4.29 발표. BotQ 공장 4개월 만에 일 1대→시간 1대(24배↑). 350+대 출하 완료. 연간 12,000대 용량, 장기 50,000대 목표. 로봇당 80개 기능검증 테스트 + 수천 번 번인 사이클.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Figure AI 공식 / Analytics India',
   'https://www.figure.ai/news/helix-02',
   'Figure Helix 02 출시 — 단일 신경망으로 전신 자율 제어 (보행+균형+조작 통합)',
   '2026.1.27 출시. Helix 02: System 0(1kHz 전신), System 1(200Hz 인지→행동), System 2(목표 추론) 3계층 아키텍처. 2026.3까지 8가지 자율 청소 기술 마스터. 식기세척기 적재/하역, 거실 전체 정리 무인 시연.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   (SELECT id FROM ci_layers WHERE slug = 'sw'),
   'pending', NOW()),

  ('Figure AI 공식 / PR Newswire',
   'https://www.figure.ai/news/figure-announces-strategic-partnership-with-brookfield',
   'Figure-Brookfield 전략 파트너십 — $1T AUM 자산운용사, 세계 최대 휴머노이드 사전학습 데이터셋 구축',
   'Brookfield(AUM $1T+)와 전략적 파트너십. 10만 주거유닛, 5억 sqft 오피스, 1.6억 sqft 물류 공간에서 인간 비디오 캡처→Helix 학습. GPU 데이터센터 인프라, 로봇 훈련 환경, 글로벌 배치 공간 제공. Series C에도 투자 참여.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   (SELECT id FROM ci_layers WHERE slug = 'data'),
   'pending', NOW()),

  ('TechCrunch / Interesting Engineering',
   'https://techcrunch.com/2025/01/28/figure-ai-details-plan-to-improve-humanoid-robot-safety-in-the-workplace/',
   'Figure 휴머노이드 안전센터(CAHS) 설립 — 前 Amazon Robotics 안전 엔지니어 리드, OSHA 인증 추진',
   'Center for the Advancement of Humanoid Safety 설립. 前 Amazon Robotics Rob Gruendel 주도. OSHA 인정 독립 테스트 연구소와 배터리·기능안전·전기 시스템 인증 계획. 분기별 안전 업데이트 공개 약속. OSHA 자율로봇 가이드 2027 H1.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   (SELECT id FROM ci_layers WHERE slug = 'safety'),
   'pending', NOW()),

  ('Figure AI 공식',
   'https://www.figure.ai/news/ramping-figure-03-production',
   'Figure 플릿 관리 시스템 + OTA 인프라 구축 — 원격 건강/상태 추적, 현장 서비스 관리',
   'BotQ 발표에서 공개. 자체 Fleet Management System(실시간 건강/상태 추적), OTA 소프트웨어 업데이트 인프라, Field Service Management 시스템(현장 고장 추적→엔지니어링 피드백). Helix System 0에 카메라 기반 3D 인식 추가.',
   (SELECT id FROM ci_competitors WHERE slug = 'figure'),
   (SELECT id FROM ci_layers WHERE slug = 'sw'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('production', '{"competitorSlug":"figure","headline":"BotQ 시간당 1대, 연 12,000대 목표","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"figure","headline":"Helix 02 전신 자율 제어","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('partnership', '{"competitorSlug":"figure","headline":"Brookfield 전략 파트너십 — 세계 최대 데이터셋","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('regulation', '{"competitorSlug":"figure","headline":"안전센터 설립 + OSHA 인증 추진","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"figure","headline":"플릿 관리 + OTA 인프라 구축","confidence":"C","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Unitree — NEW items (4)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('Bloomberg / Gizmochina',
   'https://www.gizmochina.com/2026/04/10/unitree-r1-global-launch-online-humanoid-robot/',
   'Unitree R1 AliExpress 글로벌 출시 — 세계 최저가 휴머노이드 $4,290~, 미국·일본·UAE 등',
   '2026.4 Unitree R1 AliExpress 통해 글로벌 출시. 중국 내 $4,290, 해외 $6,800~$8,150. 상체형 듀얼암, 팔당 5-7 DOF(최대 31 DOF). Alibaba Brand+ 채널 무료배송/반품. D2C 휴머노이드 판매 패러다임 전환.',
   (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Interesting Engineering / Fox News',
   'https://interestingengineering.com/ai-robotics/china-unitree-g1-humanoid-robot',
   'Unitree G1 아이스스케이팅/롤러블레이드 시연 — 360° 회전, 프론트 플립, 동적 균형',
   '2026.4.23 공개. G1이 아이스스케이트+롤러스케이트 위에서 360° 회전, 한 발 스핀, 프론트 플립 시연. 풀스택 AI 파이프라인: 자체 데이터 수집→시뮬레이션 학습→실세계 적용. Sim-to-Real 전이 기술의 획기적 진전.',
   (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
   (SELECT id FROM ci_layers WHERE slug = 'hw'),
   'pending', NOW()),

  ('Unitree 공식 / BotInfo',
   'https://www.unitree.com/H2/',
   'Unitree H2 상용 배송 시작 Q2 2026 — $40,900, 180cm/70kg, 2070 TOPS, 바이오닉 페이스',
   'H2: 180cm, ~70kg, 31 DOF. 2070 TOPS 연산(Jetson Orin NX x3). 바이오닉 휴먼 페이스(Unitree 최초). 관절 피크 토크 360Nm, 보행속도 2m/s 미만, 3시간 런타임. 상용 $40,900, EDU $68,900. Q2 2026 미국/캐나다 배송.',
   (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
   (SELECT id FROM ci_layers WHERE slug = 'hw'),
   'pending', NOW()),

  ('RobotToday / Robotics and Automation News',
   'https://robottoday.com/article/china-s-humanoid-robot-and-embodied-intelligence-standard-system-heis-2026',
   'Unitree 창업자 MIIT 휴머노이드 표준화위원회 부위원장 — HEIS 2026 프레임워크 발표',
   '중국 MIIT 2026.2 말 HEIS 2026(휴머노이드·체화지능 국가표준) 발표. 140+사 참여. Unitree 창업자 왕싱싱 부위원장. 단, G1은 ISO 협동로봇 인증 미취득. ISO 25785-1은 아직 Working Draft.',
   (SELECT id FROM ci_competitors WHERE slug = 'unitree'),
   (SELECT id FROM ci_layers WHERE slug = 'safety'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('partnership', '{"competitorSlug":"unitree","headline":"R1 AliExpress 글로벌 출시 $4,290~","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"unitree","headline":"G1 아이스스케이팅/롤러블레이드 시연","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"unitree","headline":"H2 상용 배송 Q2 2026 $40,900","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('regulation', '{"competitorSlug":"unitree","headline":"MIIT HEIS 2026 표준화위원회 부위원장","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Agility (Digit) — NEW items (4)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('TechFundingNews',
   'https://techfundingnews.com/humanoid-robot-maker-agility-robotics-to-secure-400m-at-1-75b-valuation-can-it-outspace-tesla-and-figure-ai/',
   'Agility $400M 펀딩 라운드 진행 중 — WP Global Partners/SoftBank 주도, 밸류에이션 $17.5억',
   '2026.4 말 기준 $400M 라운드 마감 중. WP Global Partners, SoftBank 주도. 프리머니 밸류에이션 $17.5억. 상용 고객 확보 실적(Toyota, GXO, Mercado Libre 등) 반영.',
   (SELECT id FROM ci_competitors WHERE slug = 'digit'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('BusinessWire (공식)',
   'https://www.businesswire.com/news/home/20260305947515/en/Agility-Robotics-Becomes-Agility-Expanding-Its-Reach-Across-Emerging-Use-Cases',
   'Agility Robotics → "Agility" 리브랜딩 — 물류 넘어 제조·리테일·서비스 확장',
   '2026.3.5 공식 리브랜딩. "Robotics" 삭제, "Agility"로 변경. 물류 외 제조, 리테일 등 노동력 부족 산업 확장 전략. 산업용 내구성·현실감 강조 비주얼 아이덴티티.',
   (SELECT id FROM ci_competitors WHERE slug = 'digit'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Agility 공식 / Robotics 24/7',
   'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
   'Mercado Libre 텍사스 물류센터 Digit 상용 계약 — 중남미 확장 계획',
   'Mercado Libre(중남미 최대 이커머스) 텍사스 산안토니오 물류센터 Digit 상용 계약. 중남미 창고 네트워크 AI 휴머노이드 확대 계획. Amazon 외 이커머스 수직 첫 대형 고객.',
   (SELECT id FROM ci_competitors WHERE slug = 'digit'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Automation World / Humanoids Daily',
   'https://www.automationworld.com/factory/robotics/article/55303585/agility-robotics-agility-robotics-digit-shows-promise-in-line-side-operations-with-new-iso-safety-standard-on-the-horizon',
   'Agility ISO 25875 휴머노이드 안전표준 주도 + OSHA NRTL 현장검사 통과',
   'Agility가 ISO 25875(동적 안정 산업용 이동 매니퓰레이터) 개발 주도. 기존 ISO 10218/TS 15066은 고정형 로봇만 커버. Digit OSHA NRTL(국가공인시험연구소) 현장검사 통과. 2026 중~후반 ISO 기능안전 완전 인증 목표 → 최초 배리어프리 인간 협업 휴머노이드.',
   (SELECT id FROM ci_competitors WHERE slug = 'digit'),
   (SELECT id FROM ci_layers WHERE slug = 'safety'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('funding', '{"competitorSlug":"digit","headline":"$400M 펀딩, $17.5억 밸류에이션","confidence":"C","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('partnership', '{"competitorSlug":"digit","headline":"Agility 리브랜딩 — 산업 확장","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('partnership', '{"competitorSlug":"digit","headline":"Mercado Libre 상용 계약","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('regulation', '{"competitorSlug":"digit","headline":"ISO 25875 주도 + OSHA NRTL 통과","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Apptronik (Apollo) — NEW items (3)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('The Robot Report / Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/04/16/interview-jabil-on-scaling-humanoid-robots-from-prototype-to-production/100706/',
   'Jabil Apollo 양산 파트너십 진행 중 — 자체 공장서 Apollo가 Apollo 검증 후 출하',
   '2026.4 Jabil 인터뷰: Apollo 생산라인 스케일링 진행 중. 신규 Apollo가 Jabil 공장에서 검사·분류·키팅·라인사이드 배송·서브어셈블리 수행 후 고객 출하. BOM 단순화로 단가 하락 → 리테일·돌봄·가정 확장.',
   (SELECT id FROM ci_competitors WHERE slug = 'apollo'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('CNBC / Interesting Engineering',
   'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
   'Apollo Mercedes-Benz·GXO 상용 파일럿 확대 — 2026 H2 상용 스케일 목표',
   'Apollo 로봇 Mercedes-Benz 공장+GXO 물류센터 지정구역에서 운영 중. 제조/창고 업무 수행. 2024-2025 시작 파일럿 확대 진행. 2026 후반 상용 스케일 배치 목표.',
   (SELECT id FROM ci_competitors WHERE slug = 'apollo'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Automate.org',
   'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
   'Apptronik 차세대 Apollo ~1년 테스트 중 — 기존 모델 이상 생산, 곧 공개 예정',
   'CEO Jeff Cardenas: 차세대 Apollo 약 1년간 사내 테스트+상용 파일럿+Google Gemini Robotics 연구에 활용 중. 2023 모델 대비 더 많은 유닛 생산 완료. "정제" 버전 곧 공개, 이어서 "대폭 도약" 버전 연속 출시 예정.',
   (SELECT id FROM ci_competitors WHERE slug = 'apollo'),
   (SELECT id FROM ci_layers WHERE slug = 'hw'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('production', '{"competitorSlug":"apollo","headline":"Jabil 양산 파트너십 — Apollo가 Apollo 검증","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('partnership', '{"competitorSlug":"apollo","headline":"Mercedes-Benz·GXO 파일럿 확대","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"apollo","headline":"차세대 Apollo ~1년 테스트, 곧 공개","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- 1X Technologies (NEO) — NEW items (3)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('GlobeNewsWire (1X 공식)',
   'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
   '1X NEO Factory 캘리포니아 개장 — 미국 최초 수직통합 휴머노이드 공장, 10,000대/년',
   '2026.4.30 Hayward, CA NEO Factory 개장. 58,000 sqft, 200+명 직원. 연 10,000대 생산능력, 2027년 말 100,000대 목표. NEO 로봇이 공장 내에서 인간과 함께 추가 유닛 조립 지원.',
   (SELECT id FROM ci_competitors WHERE slug = 'neo'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('TechFundingNews / 1X 공식',
   'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
   '1X NEO 첫해 생산분 5일 만에 완판 — 10,000+대, 소비자 배송 2026년 내 시작',
   '2025.10.28 NEO 출시. Early Access $20,000(우선배송 2026) 또는 구독 $499/월. 첫해 전체 생산능력(10,000+대) 5일 만에 완판. 소비자 배송 2026년 내 시작 계획.',
   (SELECT id FROM ci_competitors WHERE slug = 'neo'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('NVIDIA Blog / 1X 공식',
   'https://www.1x.tech/discover/nvidia-gtc-2026',
   '1X-NVIDIA 기술 파트너십 — NEO Cortex에 Jetson Thor 탑재, Isaac Lab 시뮬레이션 통합',
   'NEO 온보드 두뇌 "NEO Cortex"에 NVIDIA Jetson Thor 탑재. 클라우드 의존 없이 실시간 AI 추론(안전·인지·추론·의사결정). NVIDIA Isaac Lab으로 포토리얼리스틱 시뮬레이션+GPU RL. GTC 2026에서 상세 발표.',
   (SELECT id FROM ci_competitors WHERE slug = 'neo'),
   (SELECT id FROM ci_layers WHERE slug = 'sw'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('production', '{"competitorSlug":"neo","headline":"NEO Factory 캘리포니아 개장, 10,000대/년","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"neo","headline":"NEO 첫해 생산분 5일 완판","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('tech_spec', '{"competitorSlug":"neo","headline":"NVIDIA Jetson Thor + Isaac Lab 통합","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


-- Agibot — NEW items (3)
INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
VALUES
  ('PR Newswire (Agibot 공식)',
   'https://www.prnewswire.com/news-releases/agibot-and-longcheer-technology-achieve-worlds-first-embodied-ai-deployment-in-consumer-electronics-precision-manufacturing-mass-production-line-302742853.html',
   'Agibot G2 Longcheer 태블릿 생산라인 배치 — 세계 최초 CE 정밀 제조, 99.9% 성공률',
   'Agibot-Longcheer 파트너십. G2가 태블릿 MMIT 테스트 스테이션 로딩/언로딩. 시간당 310대, 사이클 19-20초, 성공률 99.9% 초과. Q3 2026까지 100대 배치 계획. 자동차·반도체·에너지 확장.',
   (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('Reuters / Capital.com',
   'https://capital.com/en-int/learn/ipo/agibot-ipo',
   'Agibot 홍콩 IPO Q3 2026 계획 — 밸류에이션 $51~64억, CICC·CITIC·Morgan Stanley',
   'Q3 2026 홍콩 IPO 타겟. HK$400-500억(US$51-64억) 밸류에이션. 15-25% 지분 매각, $10억+ 조달 가능. CICC, CITIC Securities 주관, Morgan Stanley 합류. 예비 투자설명서 2026 초 제출 예정.',
   (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW()),

  ('RoboticsTomorrow / Aparobot',
   'https://www.roboticstomorrow.com/news/2026/03/01/agibot-showcases-full-humanoid-robot-portfolio-at-mwc-2026/26198/',
   'Agibot 온라인 스토어 17개국 글로벌 운영 + MWC 2026 바르셀로나 전시',
   'MWC 2026(2026.3, 바르셀로나)에서 발표. 온라인 스토어 17개국(유럽 주요국·북미·말레이시아 등) 운영+리스 서비스. 2026년을 "Deployment Year One"으로 선언. 데모→실측 가능 ROI 전환.',
   (SELECT id FROM ci_competitors WHERE slug = 'agibot'),
   (SELECT id FROM ci_layers WHERE slug = 'biz'),
   'pending', NOW());

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
VALUES
  ('partnership', '{"competitorSlug":"agibot","headline":"Longcheer 태블릿 라인 G2 배치, 99.9% 성공률","confidence":"A","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('funding', '{"competitorSlug":"agibot","headline":"홍콩 IPO Q3 2026, $51-64억 밸류에이션","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW()),
  ('production', '{"competitorSlug":"agibot","headline":"17개국 온라인 스토어 + MWC 2026","confidence":"B","collectedAt":"2026-05-04"}', 'auto_scan', 'pending', NOW());


COMMIT;
