-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-10
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Unitree IPO 청약 개시 — 밸류에이션 $9B로 상향
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Gasgoo / Caixin Global / VT Markets',
   'https://autonews.gasgoo.com/articles/news/unitree-launches-star-market-ipo-issuance-process-subscriptions-open-august-10-2083181368883253248',
   '[Critical] Unitree IPO 오늘(8/10) 청약 개시: 공모가 150.80위안, 밸류에이션 ~$9B',
   '8/10 온·오프라인 동시 청약 개시. 공모가 150.80위안(~$22.30)/주 확정(8/6). 40.45만 신주 발행, 조달액 61억 위안(~$904M)으로 상향. 기업가치 ~610억 위안($9.04B) — 기존 $6.2B 대비 45% 상향. 8/12 납입, 8/17-21 상장 예정. CITIC Securities 주관.',
   '2026-08-10'::timestamp, 'pending'),

-- 2. BYD "Xiao Di" 휴머노이드 상세 사양 공개 — 딜러 매장 배치 계획
  (gen_random_uuid(), 'KrASIA / TNW / SCMP / Korea Times',
   'https://kr-asia.com/byds-humanoid-robot-to-begin-work-at-d-space-facility-in-august',
   'BYD 첫 휴머노이드 "Xiao Di": 161cm/58.5kg, 6개국어+6방언, 매장 배치 시작',
   'BYD 첫 휴머노이드 로봇 "샤오디(Xiao Di)" 상세 공개. 161cm/58.5kg. 6개 중국 방언+6개 외국어 통역. Di Space 체험관에서 8월 공개, 딜러 매장당 2-3대 배치 계획. EVP Lisa Li: 고객 맞이·차량 설명·기능 시연 담당. EV 배터리/모터/반도체 수직통합 역량 활용.',
   '2026-08-10'::timestamp, 'pending'),

-- 3. Figure 03 누적 생산 1,000대 돌파 확인 + RaaS 가격 체계 이원화
  (gen_random_uuid(), 'Technology.org / Forge Global / The AI Insider',
   'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
   'Figure 03: BotQ 1,000호기 달성(7/23), RaaS 월 $1,000 vs BMW 시간당 $25 이원 과금',
   '7/23 BotQ 공장에서 1,000번째 Figure 03 생산. RaaS 가격체계 이원화 확인: 물류/창고용 월정액 ~$1,000, BMW 제조라인용 시간당 $25. Figure 02는 BMW 30,000대 X3 생산 지원 후 은퇴 완료. 10,000+ 배치 달성.',
   '2026-08-10'::timestamp, 'pending'),

-- 4. Tesla Optimus Academy: 초기 생산분 내부 훈련용, 외부 B2B 2026말
  (gen_random_uuid(), 'Optimusk.blog / Teslarati / Beginners in AI',
   'https://optimusk.blog/blog/tesla-optimus-production-timeline/',
   'Tesla Optimus 생산 개시 임박, 초기 물량은 "Optimus Academy" 내부 배정',
   '프리몬트 생산라인 구축 완료, 8월 중 저속 생산 시작. 초기 유닛은 신설 "Optimus Academy"(내부 교육·개발) 배정, 외부 고객 무배정. 부품 10,000종 신규 공급망으로 초기 생산 "극도로 느림" 예고. 외부 B2B 프리미엄 판매 2026말, 소비자 2027말 이후.',
   '2026-08-10'::timestamp, 'pending'),

-- 5. Agibot 홍콩 IPO 절차 공식 착수 — Unitree와 동시 상장 경쟁
  (gen_random_uuid(), 'Caixin Global / TechNode / Gasgoo',
   'https://www.caixinglobal.com/2026-07-24/agibot-begins-hong-kong-ipo-process-as-chinas-embodied-ai-startups-race-to-list-102467856.html',
   'Agibot 홍콩 IPO 공식 착수(7/24): CICC·CITIC·MS 주관, 8월 상장 가능',
   '7/24 Agibot IPO 공식 개시. 공동주관: CICC, CITIC Securities, Morgan Stanley. 밸류에이션 HK$40-50B($5.1-6.4B). 중국 Embodied AI 스타트업 중 최초 상장 프로세스 공개. Unitree STAR Market와 동시 상장 레이스. 시진핑 주석 상하이 방문 시 로봇 시찰.',
   '2026-08-10'::timestamp, 'pending'),

-- 6. Boston Dynamics Atlas 실배치 일정: 2026년은 RMAC+DeepMind만, 양산라인 2028년
  (gen_random_uuid(), 'Automate.org / Forbes / TechTimes',
   'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
   'Atlas 2026년 배치: RMAC·DeepMind 2곳 한정, 실제 양산라인 투입 2028년',
   '2026년 Atlas 전량 RMAC(훈련센터)+Google DeepMind에 배정 확정. 실제 Hyundai 양산라인 투입은 2028년 예정. 연 30,000대 생산능력 공장 건설 중. SoftBank 지분 10% 인수 완료로 Hyundai 100% 자회사화 절차 진행.',
   '2026-08-10'::timestamp, 'pending'),

-- 7. 1X NEO 초기 배치 10,000대 5일 만에 매진 — 소비자 배송 2026말
  (gen_random_uuid(), 'Forbes / eWeek / GlobeNewsWire',
   'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '1X NEO 초기 10,000대 5일 만에 완판, NVIDIA Jetson Thor 탑재 확정',
   'Hayward 공장 첫 해 10,000대 배치분 5일 만에 매진. NVIDIA Jetson Thor 기반 NEO Cortex(2,070 FP4 TFLOPS) 확정. 소비자 배송 2026년 말. 가격 $20,000 또는 월 $499 렌탈. 운영 소음 22dB(냉장고 수준). 2027년 100,000대/년 확장.',
   '2026-08-10'::timestamp, 'pending'),

-- 8. 업계 종합: 중국 로봇 IPO 러시 — Unitree·Agibot 동시 상장, 규제 리스크 병존
  (gen_random_uuid(), 'Gasgoo / Value Add VC',
   'https://autonews.gasgoo.com/articles/news/xiaozhi-weekly-news-unitree-ipo-subscription-on-august-10-agibot-launches-hk-listing-process-2084289060670513153',
   '중국 휴머노이드 IPO 러시: Unitree(STAR) + Agibot(HKEX) 동시 상장 레이스',
   'Unitree 8/10 청약·8/17-21 상장, Agibot 8월 HKEX 상장 가능. 합산 기업가치 $14-15B. FCC 수입 금지·국방부 군수기업 지정 등 미국 규제 리스크와 병존. 중국 정부 "로봇+" 정책 지원 가속. 글로벌 투자자 관심 집중.',
   '2026-08-10'::timestamp, 'pending');

COMMIT;
