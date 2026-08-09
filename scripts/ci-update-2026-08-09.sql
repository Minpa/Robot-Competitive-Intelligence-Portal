-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-09
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [A등급] Unitree IPO 공모가 확정 — $9B 밸류에이션, 중국 첫 휴머노이드 상장
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'CNBC / Bloomberg / Gasgoo',
   'https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html',
   '[Critical] Unitree IPO 공모가 확정: 150.8위안/주, 시총 $9.04B — 중국 첫 휴머노이드 상장사',
   '8/6 공모가 150.8위안($22.34) 확정, 시가총액 약 610억위안($9.04B). 초기 컨센서스 104위안 대비 45% 프리미엄. 전략적 투자자: DeepSeek, 국가사회보장기금, CNPC. 40.45만주 발행(지분 10%), 약 61억위안($904M) 조달. 8/10 일반 청약, 8/14 배정 결과, 8/19경 상장 예정. 2025 매출 17억위안(4배 성장), 매출총이익률 60%, 5,500대+ 출하(글로벌 점유율 32.4%). [신뢰도: A — CNBC/Bloomberg/Gasgoo 복수 확인]',
   '2026-08-09'::timestamp, 'pending'),

-- 2. [A등급] Boston Dynamics Atlas 5세대 공개 + Hyundai 완전 인수 완료
  (gen_random_uuid(), 'Forbes / TechTimes / Carscoops',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   'BD Atlas 5세대: 복잡도 "거의 한 자릿수" 감소 + Hyundai 완전 인수(SoftBank 잔여 지분)',
   '7/2 공개 5세대 Atlas: 부품 수 대폭 감소, 제조 속도·신뢰성·원가 개선. 56 DOF, 360도 회전 관절, 190cm/90kg, 50kg 페이로드, 2.3m 리치. 7/20 Hyundai가 SoftBank 잔여 지분 인수 완료, BD 100% 자회사화. 연 30,000대 생산 계획. 2026 생산분 전량 Hyundai 트레이닝센터 + Google DeepMind 배정, 외부 판매는 2027년 초 예정. [신뢰도: A — Forbes/공식 블로그 1차 출처]',
   '2026-08-09'::timestamp, 'pending'),

-- 3. [A등급] Hyundai 울산 35,000명 스트라이크 — 업계 최초 휴머노이드 배치 관련 파업
  (gen_random_uuid(), 'Forbes / TechTimes / Unite.AI',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/17/we-just-had-the-first-humanoid-robot-strike-ever/',
   '[Warning] Hyundai 울산 35,000명 파업: 업계 최초 휴머노이드 로봇 배치 반대 스트라이크',
   '7/13~15 주야간 교대 2시간 조기 종료, 7/20~22 4시간 단축 근무 예고. 노조 요구: Atlas 로봇의 한국 생산 현장 투입 전 서면 동의 보장. 임금 교섭 15차례 결렬과 동시 진행. BD 완전 인수(7/20)와 같은 날 파업 격화. 자동차·제조업계 휴머노이드 도입의 노사관계 리스크 시그널. [신뢰도: A — Forbes/TechTimes/Unite.AI 복수 확인]',
   '2026-08-09'::timestamp, 'pending'),

-- 4. [A등급] Figure AI BotQ 공장 1,000호기 생산 + BMW Leipzig 확대
  (gen_random_uuid(), 'FAQ.com.tw / AI2Work / iFactoryApp',
   'https://faq.com.tw/en/hardware/2026-06-08-figure-ai-botq-production-humanoid-race-en/',
   'Figure AI BotQ 1,000호기 달성(7/23): 시간당 1대 생산, BMW Leipzig 확대 착수',
   '7/23 BotQ 공장에서 Figure 03 1,000번째 생산. 생산속도: 하루 1대→시간당 1대(120일 만에 24배 향상). 연간 12,000대 용량, 100,000대 확장 계획. BMW Spartanburg 40대 운영 중(F03), 시간당 $25 RaaS 과금. BMW Leipzig(독일) 2026 여름부터 파일럿 확대. F02 11개월 시범운영으로 X3 30,000대+ 생산 기여. [신뢰도: A — 복수 매체 교차 확인]',
   '2026-08-09'::timestamp, 'pending'),

-- 5. [A등급] Agility Robotics SPAC IPO $2.5B — 미국 첫 휴머노이드 상장
  (gen_random_uuid(), 'TechCrunch / GeekWire / SEC Filing',
   'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
   'Agility Robotics SPAC $2.5B: Churchill Capital XI 합병, Nasdaq "AGLT" 상장 추진',
   '6/24 Churchill Capital XI와 $2.5B 기업결합 계약. PIPE $200M 포함 총 $620M+ 조달. Digit v5 수주잔고 $300M+(3년 계약, 1,000대), 파이프라인 수배. 현재 9개 시설 65,000시간+ 실운영. 고객: Schaeffler, GXO, Toyota Canada, Mercado Libre. GXO SPANX 시설에서 100,000+ 토트 이동 완료. 2026년 말 거래 완료 및 Digit v5 상용 출시 예정(NVIDIA Halos 인증 진행 중). [신뢰도: A — SEC 공시/TechCrunch 1차 출처]',
   '2026-08-09'::timestamp, 'pending'),

-- 6. [A등급] Google DeepMind Gemini Robotics 2: 전신 단일 정책 제어 (Apollo 2 + Atlas 적용)
  (gen_random_uuid(), 'Google DeepMind 공식 블로그 / Robotics & Automation News',
   'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
   'Gemini Robotics 2: 업계 최초 전신(다리+몸통+팔+손) 단일 정책 제어 — Apollo 2 실증',
   '7/30 발표. VLA(Vision-Language-Action) 모델로 전신 휴머노이드 제어. Apptronik Apollo 2에서 실증: 걷기+물건 집기+선반 배치 통합. SharpaWave 5지 핸드로 전구 풀기(92%), 쓰레기봉투 묶기 등 정밀 작업. BD Atlas에도 적용. 멀티로봇 협업(Apollo 2 + Franka F3 Duo). ER 2 모델 API 공개(gemini-robotics-er-2-preview). Robot Park 데이터 훈련. [신뢰도: A — Google DeepMind 공식 블로그 1차 출처]',
   '2026-08-09'::timestamp, 'pending'),

-- 7. [A등급] Apptronik 시리즈A 총 $935M+ 돌파, Apollo 2 공개
  (gen_random_uuid(), 'CNBC / Apptronik 공식',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik 시리즈A-X $520M 추가($935M+ 누적), $5B 밸류에이션 — Apollo 2 데이터 수집 중',
   'Google 참여 $520M 라운드, 시리즈A 누적 $935M+, 총 조달 약 $1B. 밸류에이션 $5B. Apollo 2(6월 공개): 이족/바퀴 베이스 선택형 훈련+데이터 플랫폼. Robot Park 다수 현장에서 DeepMind 협업 데이터 수집 중. Apollo 3(첫 상용 제품)는 2027 목표. Mercedes-Benz, GXO와 파일럿 진행 중. Waymo/BD/Amazon 출신 리더 영입(Dan Chu CPO 등). [신뢰도: A — CNBC/공식 보도자료]',
   '2026-08-09'::timestamp, 'pending'),

-- 8. [B등급] Tesla Optimus 프레몬트 라인 설치 중 — Q2 실적발표에서 생산 0대 확인
  (gen_random_uuid(), 'TechTimes / Electrek / Teslarati',
   'https://www.techtimes.com/articles/321012/20260720/tesla-optimus-production-count-remains-zero-q2-earnings-call-looms-wednesday.htm',
   'Tesla Optimus: Q2 어닝콜 기준 생산 0대, 프레몬트 라인 설치 중 — 2026 저수천 대 전망',
   '7/22 Q2 어닝콜: "Optimus 1세대 라인 설치 중", 공식 생산 카운트 0대. Musk: 부품 10,000개, 신규 공급망으로 생산속도 "예측 불가". AI5 칩 Samsung 2nm 테이프아웃 7월 초 완료, ES Q4 2026, 양산 2027. 현재 자체 공장 1,000대+ 배치(외부 고객 0). V3 공개 연기(연내). 첫 외부 상용고객 2026년 말, 소비자 판매 2027년 말 목표. [신뢰도: B — Electrek/TechTimes 교차확인, 일부 추정]',
   '2026-08-09'::timestamp, 'pending'),

-- 9. [B등급] 1X Technologies NEO 생산 개시, 출하는 미확인
  (gen_random_uuid(), 'Forbes / The Robot Report / eWeek',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '1X NEO: Hayward 공장 풀스케일 생산 개시, 10,000대 예약 — 실제 출하는 미확인',
   'Hayward 공장(58,000sqft, 200+명): 미국 최초 수직통합 휴머노이드 공장. 1년차 10,000대 용량, 2027년 100,000대 목표. 사전예약 5일 만에 10,000대(전량 매진). Early Access $20,000, 구독 $499/월. CEO "연내 일부 출하" 약속이나, 7/16 기준 확인된 고객 배송 0건. 언론 핸즈온에서 모든 가정 작업이 원격조종이었음 보도. [신뢰도: B — Forbes/Robot Report 확인, 출하 실적 미검증]',
   '2026-08-09'::timestamp, 'pending'),

-- 10. [A등급] Agibot WAIC 2026: A3 Ultra + 15,000대 누적 출하
  (gen_random_uuid(), 'PR Newswire / gagadget / eWeek',
   'https://www.prnewswire.com/apac/news-releases/agibot-unveils-four-new-products-at-waic-2026-showcasing-embodied-ai-in-real-world-operations-302829347.html',
   'Agibot WAIC 2026: A3 Ultra(Thor/51DOF) + X2 Edu + G2 Max + OmniHand 3 — 누적 15,000대',
   'A3 Ultra: 174cm/60kg, 51 DOF, 5kg 페이로드, 8시간 배터리, NVIDIA Jetson Thor SoC. OmniHand 3 Ultra-M: 직접구동 5지 손재주 시스템. X2 Edu: 교육용 플랫폼. G2 Max: 산업용. WAIC "전시 보석(Gem)" 선정(AI 분야 유일). 15,000대 누적 출하, 2025 글로벌 점유율 39% 주장. 전시장 30대+ 라이브 운영. Q4 출시 예정. [신뢰도: A — PR Newswire 공식 + 복수 매체]',
   '2026-08-09'::timestamp, 'pending'),

-- 11. [B등급] 업계 종합: 2026 중반 실배치 순위 업데이트
  (gen_random_uuid(), 'Technology.org / 종합',
   'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
   '2026 중반 실배치 순위: Agibot 15K > Unitree 5.5K > Tesla 1K(내부) > Figure(BotQ 1K생산) > Agility 65K시간',
   '누적 생산/출하 기준: Agibot 15,000대(최다), Unitree 5,500대+(교육/연구), Tesla 1,000대+(자체 공장만), Figure 1,000대+(BotQ 생산), Agility 65,000시간+ 실운영(대수 미공개). 외부 상용배치: Figure(BMW 40대 F03) > Agility(Schaeffler/GXO/Toyota/MercadoLibre) > BD(Hyundai+DeepMind 2곳). Tesla/1X 외부배치 0. [신뢰도: B — Technology.org 종합, 일부 자체 발표]',
   '2026-08-09'::timestamp, 'pending');

COMMIT;
