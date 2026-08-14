-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-14
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Unitree IPO 납입 완료, STAR Market 상장 임박 (8/14-21)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Gasgoo / Value Add VC / RobotTesters',
   'https://valueaddvc.com/unitree-ipo-tracker',
   '[Critical] Unitree 688836.SH 상장 임박: 8/12 납입 완료, 8/14-21 거래 개시 예정',
   '8/10 온·오프라인 청약 종료, 8/12 납입 완료. 중국 금융매체 8/14 상장 보도 vs 서방 추적기 8/17-21 가이드. SSE 최종 상장 공고 대기. 공모가 150.80위안/주, 밸류에이션 ~$9B, 조달 61억위안($904M). 중국 본토 최초 순수 휴머노이드 로봇 상장.',
   '2026-08-14'::timestamp, 'pending'),

-- 2. Agility Robotics Fremont AI Hub 개설 + Digit v5 NVIDIA Halos 통합
  (gen_random_uuid(), 'TechTimes / GlobeNewsWire / NVIDIA',
   'https://www.techtimes.com/articles/322086/20260729/agility-robotics-opens-fremont-hub-train-digit-ai-ahead-nasdaq-listing.htm',
   'Agility: Fremont AI Hub 개설(7/29), Digit v5 NVIDIA Halos 안전 시스템 탑재 확정',
   '7/29 Silicon Valley AI Hub 개설 — NASDAQ 상장(CCXI SPAC $2.5B) 앞두고 Digit AI 훈련 확대. Digit v5에 NVIDIA Halos(자율주행 18,600 엔지니어링 연간 안전 기술 이전) 탑재. IGX Thor 전용 안전 프로세서가 AI 독립적 비상정지 수행. Toyota·Amazon·GXO 등 9개 시설 65,000시간+ 운영.',
   '2026-08-14'::timestamp, 'pending'),

-- 3. Google DeepMind Gemini Robotics 2 공식 출시 (8/8) — 전신 제어 + On-Device 2
  (gen_random_uuid(), 'Google DeepMind / Robotics 24-7 / MarkTechPost',
   'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
   'Gemini Robotics 2 공식 출시(8/8): 전신 VLA + On-Device 2 경량 모델 추가',
   '8/8 공식 출시. (1) Gemini Robotics 2: 최초 전신(다리→손끝) 단일 VLA 모델, 멀티로봇 협업 지원. (2) Gemini Robotics On-Device 2: 로봇 기기 내 로컬 실행 경량 모델, 수 시간 데이터로 신규 로봇 적응. Apptronik Apollo 2·BD Atlas·Sharpa 등 다수 로봇에 적용. BD·Apptronik 양대 파트너 기술 격차 확대 가능.',
   '2026-08-14'::timestamp, 'pending'),

-- 4. 중국 SAMR: 휴머노이드 부문 H1 2026 신규 기업 116,000개 (YoY +9.5%)
  (gen_random_uuid(), 'Gasgoo / SAMR',
   'https://autonews.gasgoo.com/articles/news/116000-new-enterprises-added-in-first-half-humanoid-robots-move-towards-100000-unit-mass-production-2087062147661324289',
   '중국 SAMR: H1 2026 휴머노이드 관련 신규 기업 116,000개 (YoY +9.5%)',
   '8/8 국가시장감독관리총국(SAMR) 발표. 2026년 상반기 휴머노이드 로봇 관련 신규 사업체 116,000개 설립, 전년 동기 대비 9.5% 증가. 업계 10만대 양산 시대 진입 전망. 로봇+ 정책 가속으로 산업 생태계 급팽창.',
   '2026-08-14'::timestamp, 'pending'),

-- 5. EU AI Act 고위험 AI 전면 적용 — 2026년 8월 시행
  (gen_random_uuid(), 'RoboticsBiz / RoboSelect360 / European Commission',
   'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
   '[Regulatory] EU AI Act 고위험 AI 시스템 전면 적용: 2026년 8월 시행',
   '2026년 8월 EU AI Act 고위험 AI 시스템(산업용 휴머노이드 포함) 전면 적용. 미준수 시 최대 €35M 또는 글로벌 매출 7% 과징금. 12월 개정 제조물책임지침(PLD), 2027.1 기계규정 2023/1230 연속 시행. ASTM WK73939·ISO 25785-1 등 휴머노이드 전용 인증 2027 비준 예정.',
   '2026-08-14'::timestamp, 'pending'),

-- 6. Tesla Optimus: Giga Texas 1,000대+ 가동 중, 프리몬트 8월 생산 개시 진행
  (gen_random_uuid(), 'Teslarati / Robot News Today / Technology.org',
   'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
   'Tesla Optimus: Giga Texas 1,000대+ 현장 가동, 프리몬트 8월 중 저속 생산 시작',
   'Giga Texas에 1,000대 이상 Optimus 배치 확인: 부품 분류, 컴포넌트 키팅, 품질 검사 수행. 프리몬트 전환 생산라인 8월 중 저속 생산 시작 진행 중. 초기 물량 Optimus Academy(내부 교육) 전용, 외부 B2B 2026말. 부품 10,000종 전 신규 공급망으로 생산 "극도로 느림".',
   '2026-08-14'::timestamp, 'pending'),

-- 7. Figure AI: BotQ 1로봇/90분 케이던스, IPO 미확정 — Unitree/Agibot와 대비
  (gen_random_uuid(), 'TechTimes / Forge Global / TechMarketBriefs',
   'https://www.techtimes.com/articles/322574/20260731/unitree-ipo-subscription-opens-profitable-robot-maker-vs-39b-no-revenue-figure-ai.htm',
   'Figure AI $39B 밸류에이션, IPO 미제출 — Unitree($9B 흑자) · Agibot와 극명한 대비',
   'Figure AI S-1 미제출, IPO 시점 미정. 밸류에이션 $39B(Series C, 2025.9)이나 공시 매출 "0에 가까움". BotQ 공장 1로봇/90분 케이던스, Figure 03 누적 1,000대+. 반면 Unitree는 흑자 상태 $9B IPO, Agibot $5-6.4B HK상장. 시장 현실 검증 국면.',
   '2026-08-14'::timestamp, 'pending'),

-- 8. Agibot: 누적 15,000대 출하, HK IPO 8월 상장 가능 — 15-25% 지분 매각
  (gen_random_uuid(), 'SCMP / CryptoB / Gasgoo',
   'https://cryptobriefing.com/agibot-hong-kong-ipo-humanoid-robotics/',
   'Agibot HK IPO: 15-25% 지분 매각 $1B+ 조달 목표, 누적 15,000대 출하',
   '7/24 IPO 개시 이후 CICC·CITIC·MS 주관으로 8월 HKEX 상장 가능. 15-25% 지분 매각, $1B+ 조달 예상. 누적 15,000대 embodied intelligence 로봇 출하. 투자자: Tencent, HongShan, LG전자, Mirae Asset, BYD, Hillhouse. A3 Ultra(Jetson Thor, 51 DOF) Q4 출시 예정.',
   '2026-08-14'::timestamp, 'pending'),

-- 9. 1X NEO: Hayward 공장 200명+ 가동, 신형 핸드 "인간 역량" 설계 공개
  (gen_random_uuid(), 'Forbes / Dezeen / 1X Technologies',
   'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
   '1X NEO: 신형 로봇 핸드 "인간 역량(human capability)" 설계 공개(7/13)',
   '7/13 Dezeen 공개: NEO 전용 로봇 핸드, "인간 역량" 모방 설계 철학. Hayward 공장 200명+ 직원, 연 10,000대 생산 램프업 중. NVIDIA Jetson Thor 기반 NEO Cortex(2,070 FP4 TFLOPS). 2026년 말 소비자 배송 유지. EQT 포트폴리오 10,000대 B2B 계약.',
   '2026-08-14'::timestamp, 'pending'),

-- 10. Apptronik: Apollo 2 Robot Park 90,000sqft, Apollo 3 차세대 상용 제품 개발 중
  (gen_random_uuid(), 'eWeek / Robotics 24-7 / Robot Report',
   'https://www.eweek.com/news/apptronik-robot-park-apollo-2-humanoid-robot/',
   'Apptronik Robot Park 90,000sqft 확장, Apollo 3(차세대 상용) 개발 가속',
   'Austin Robot Park 90,000sqft 확장 완료(6/30). Apollo 2 바이페달+휠 듀얼 구성으로 산업 데이터 수집 가속. DeepMind Gemini Robotics 2와 통합. Mercedes-Benz·GXO·DeepMind 현장 배치. Apollo 3 = "진정한 상용 제품"으로 차기 1년 내 출시 목표. 총 조달 ~$1B(Series A $935M+).',
   '2026-08-14'::timestamp, 'pending');

COMMIT;
