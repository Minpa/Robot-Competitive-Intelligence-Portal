-- War Room 경쟁사 데이터 자동 업데이트 - 2026-11-25
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-11-25T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TechRepublic / Interesting Engineering / technology.org / teslanorth.com',
   'https://www.technology.org/2026/10/22/tesla-optimus-production-fremont-20000-per-week-2027/',
   'Tesla Optimus Fremont 양산라인 가동 — Model S/X 라인 대체, 주 20,000대 목표 (Q3 2026)',
   'Tesla가 Q3 2026 실적 발표에서 Fremont 공장의 Model S/X 라인을 Optimus 양산라인으로 전환하고 초기 양산을 개시했다고 발표. Musk는 "고용량 라인에서의 초기 양산"이라 언급. 주 20,000대 도달까지 약 1년 소요 예상. Austin 대형 Optimus 공장은 아직 건설 중. AI5 칩 Samsung Texas 팹에서 시생산 착수, 내년 양산 예정. 외부 고객 인도는 2027년 말 목표.'),

  ('Engadget / imeche.org / TechTarget / Seoul Economic Daily',
   'https://en.sedaily.com/economy/2026/11/19/hyundais-atlas-humanoid-heads-to-a-us-chip-plant',
   'Boston Dynamics Atlas, GlobalFoundries 미국 반도체 공장 투입 발표 — 자동차 외 최초 산업 확장 (11/19)',
   'Hyundai 자회사 Boston Dynamics가 GlobalFoundries 반도체 공장에 Atlas 휴머노이드 투입을 발표. 자동차 산업 외 최초 Atlas 고객. CES 2026에서 양산형 Atlas 공개 후 Hyundai Georgia Metaplant에서 훈련 진행 중. Google DeepMind에도 Atlas 공급해 Gemini Robotics 모델 통합. 조립 시간 1일 → 2027년 1시간 목표. RL 기반 Wheeled Atlas 이동성 테스트도 진행 중.'),

  ('Forge Global / Manufacturing Digital / The Robot Report / SiliconANGLE',
   'https://www.therobotreport.com/figure-ai-raises-1b-in-series-c-funding-toward-humanoid-robot-development/',
   'Figure AI, Series C $1B+ 조달 완료($39B 밸류) — BMW 배치 확대, Nscale 100K GPU 확보, F.02 퇴역 (2025~2026)',
   '2025.9 Series C $1B+ 클로즈($39B 밸류). 총 펀딩 ~$1.85B~$2.5B(출처별 편차). OpenAI 협력 종료(2025.2), 자체 Helix AI로 전환. BMW Spartanburg에 Figure 03 물류 배치 확대(F.02 파일럿 후속). 2026.4 기준 F.03 350대+ 인도, 시간당 1대 생산 체제. Nscale과 최대 100K Nvidia Vera Rubin GPU 접근 계약(2026.9). F.02 함대 퇴역 진행 중.'),

  ('IEEE Spectrum / BigGo Finance / humanoidsdaily.com / World Today News',
   'https://finance.biggo.com/news/1ddaa1e1-ec43-40b3-80d4-213790a46358',
   'Unitree G1 누적 생산 10,000~20,000대 돌파 — 보안 취약점 공개, Mount Tai 과열 사건 (2025~2026)',
   'Wang Xingxing 창업자 2026.10 발표: G1 누적 생산 10,000~20,000대(2024.5 출시 이후). 가격 ~$16K(독일 BF €16,660). 2025.9 IEEE Spectrum: Go2/B2/G1/H1 대상 Bluetooth 웜 취약점 공개(Unitree 7월 이후 무응답). Mount Tai 등반대회서 G1 과열로 리타이어(들것 하산). 2025.8 World Humanoid Robot Games 금메달 4개(400m/1500m/4x100m). IDC 2025 출하량 1위(Omdia도, 단 Unitree 이의).'),

  ('TechCrunch / The Robot Report / GeekWire / Robotics & Automation News',
   'https://techcrunch.com/2026/11/05/agility-is-the-first-pure-humanoid-robot-company-on-the-stock-market-are-you-buying/',
   'Agility Robotics Nasdaq 상장(AGLT) + Digit 5 발표 — $300M 수주, GXO 2개 사이트 추가 (2026.9~11)',
   '2026.11.5 Nasdaq 상장(AGLT), SPAC 합병. 순수 휴머노이드 최초 상장. 1H 2026 순손실 $362M. 2026.9 Digit 5 발표: 50lbs 가반, 7.2ft 도달높이, 20시간+ 가동, 배터리 90분+9분 충전. GXO와 Statesville(NC)·Lebanon(TN) 2개 추가 사이트 계약(기존 Georgia 100K+ 토트 이동). 30+ 고객 파이프라인. EU/UK 최초 해외 배치 준비.'),

  ('CNBC / Forbes / Interesting Engineering / TechFundingNews',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik Series A-X $520M 추가 조달($5B 밸류, 총 $935M) — Google DeepMind·GXO·QIA 등 파트너 확대 (2026.2)',
   '2026.2 Series A-X $520M 클로즈($5B 밸류). 총 Series A ~$935M. 투자자: B Capital, Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA(Qatar Investment Authority), PEAK6. Google DeepMind Gemini Robotics 기반 Apollo 구동. GXO 4년 최대 1,000대 LOI(RaaS). Mercedes-Benz·Jabil 파트너십 지속. 300명 규모, Austin 확장+California 오피스 신설 계획. Apollo 2 신규 버전 2026 공개 예정.'),

  ('The Next Web / Interesting Engineering / humanoidsdaily.com / Forbes',
   'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
   '1X NEO Hayward 공장 개설, 12월 개발자 출하 개시 예고 — SoftBank 인수 협상 미확정, $10B+ 밸류 목표 (2025~2026)',
   '2025.10 사전주문 개시(구매 $20K / 구독 $499/월), 10,000대 5일 완판(회사 발표). Hayward(CA) 58,000sqft 공장 개설, 연 10,000대 용량. EQT 300+ 포트폴리오사 대상 최대 10,000대 공급 MOU(2025.12). CEO Børnich 2026.11 Runtime 2026서 12월 개발자+일부 소비자 출하 시작 발표. SoftBank $6B 밸류 지배지분 인수 협상(2026.8 The Information) 이후 미확정. 1X 원래 $10B+ 밸류 목표.'),

  ('KR-Asia / The Robot Report / Interesting Engineering / Robotics & Automation News',
   'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
   'Agibot 누적 10,000대 돌파 — IDC 2025 출하 1위, G2 상하이 편의점 시범, 홍콩 IPO 추진설 (2025~2026)',
   '2026.3 누적 10,000대 돌파(첫 1,000대 약 2년 소요). IDC 2025 출하량 1위. 2025.12 5,000대 달성(X-Series 1,846대 포함). X1: 130cm/33kg/34DOF 오픈소스 연구 플랫폼(키트 ~$20K). G2 상하이 편의점 24시간 무인 운영 시범(6대/1,730건/4대 통과). A3 Ultra 호텔 데모 영상. 홍콩 IPO Q3 2026 목표 보도(미확인).')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

-- Tesla Optimus: Fremont 양산 + AI5 칩 + 외부 인도 2027
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "production_status", "new_value": "Q3 2026 Fremont 공장 Model S/X 라인을 Optimus 양산라인으로 전환. 초기 양산 개시. 주 20,000대 목표(약 1년 소요). Austin 대형 Optimus 전용 공장 건설 중. 장기 목표 연 100만 대.", "source": "Tesla Q3 2026 Earnings Call / technology.org / Interesting Engineering 2026-10", "reliability": "A"}, {"field": "ai_chip_production", "new_value": "AI5 칩 Samsung Texas 팹 시생산 착수(2026.10), 내년 양산 예정. Optimus 탑재용 전용 칩.", "source": "TechRepublic / Interesting Engineering 2026-10~11", "reliability": "B"}, {"field": "external_delivery", "new_value": "외부 고객 인도 2027년 말 목표. Musk 렌탈 모델 시사(Baron Conference 2026.11.6). 제조비 ~$30K → $20K 하락 추세. 공개 주문·가격 미발표.", "source": "NotATeslaApp / teslanorth.com 2026-11", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Q3 2026 Fremont 공장 Model S/X 라인%Optimus 양산라인%주 20,000대 목표%' AND created_at::date = CURRENT_DATE);

-- Boston Dynamics Atlas: GlobalFoundries + CES 양산형 + Google DeepMind
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "globalfoundries_deployment", "new_value": "2026.11.19 GlobalFoundries 반도체 공장 Atlas 투입 발표. 자동차 외 최초 산업 확장. 2027년 초 테스트 개시 예정. Malta(NY)·Burlington(VT)·Dresden(독일)·Singapore 등 GF 글로벌 시설 대상.", "source": "Seoul Economic Daily / TechTarget / imeche.org 2026-11-19", "reliability": "A"}, {"field": "production_atlas", "new_value": "CES 2026서 양산형 Atlas 공개. Hyundai Georgia Metaplant에서 훈련 중. 조립 시간 1일 → 2027년 1시간 목표. Google DeepMind에 Atlas 공급, Gemini Robotics 모델 통합.", "source": "Engadget / Boston Dynamics 공식 블로그 / TechTimes 2026", "reliability": "A"}, {"field": "wheeled_atlas_research", "new_value": "RL 기반 Wheeled Atlas 이동성 테스트 진행. 연구 테스트베드, 제품 아님.", "source": "emergent.sh 2026-11", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%GlobalFoundries 반도체 공장 Atlas 투입%자동차 외 최초 산업 확장%CES 2026%' AND created_at::date = CURRENT_DATE);

-- Figure AI: BMW 배치 + Nscale GPU + Helix AI + F.02 퇴역
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "funding_valuation", "new_value": "Series C $1B+ 클로즈(2025.9), $39B 밸류. 총 펀딩 ~$1.85B~$2.5B(출처별 편차). Series B $675M(2024, $2.6B 밸류).", "source": "SiliconANGLE / The Robot Report / Sacra 2025-09", "reliability": "A"}, {"field": "production_deployment", "new_value": "2026.4 기준 F.03 350대+ 인도, 시간당 1대 생산. BMW Spartanburg 물류 배치 확대. F.02 함대 퇴역 진행. BotQ 캠퍼스 수십 대 자율 보행 영상(실외 계단·경사로). 24시간 운용 체제 전환 추정(야간 코디네이터 채용).", "source": "Forge Global / Interesting Engineering / humanoidsdaily.com 2026", "reliability": "B"}, {"field": "ai_compute", "new_value": "OpenAI 협력 종료(2025.2), 자체 Helix AI 전환. Nscale과 최대 100K Nvidia Vera Rubin GPU 접근 계약(2026.9).", "source": "Wikipedia / Manufacturing Digital 2026-09", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Series C $1B+%$39B 밸류%F.03 350대+%Nscale%100K Nvidia Vera Rubin%' AND created_at::date = CURRENT_DATE);

-- Unitree G1: 누적 생산 + 보안 취약점 + 대회 성과
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "cumulative_production", "new_value": "2026.10 기준 G1 누적 생산 10,000~20,000대(Wang Xingxing 발표). 2024.5 출시 이후 약 2.5년. 가격 기본형 ~$16K. 독일 BF 세일 €16,660.", "source": "BigGo Finance / World Today News / humanoidsdaily.com 2026-10~11", "reliability": "B"}, {"field": "security_vulnerability", "new_value": "2025.9 IEEE Spectrum: Go2/B2/G1/H1 대상 웜 가능 Bluetooth 취약점 공개. Unitree 2025.7 이후 연구자 무응답. 보안 패치 상태 미확인.", "source": "IEEE Spectrum 2025-09", "reliability": "A"}, {"field": "competition_results", "new_value": "2025.8 제1회 World Humanoid Robot Games(베이징) 금메달 4개(400m/1500m/4x100m 릴레이), 총 11개 메달.", "source": "Wikipedia / humanoidsdaily.com 2025-08", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%G1 누적 생산 10,000~20,000대%Bluetooth 취약점%World Humanoid Robot Games%' AND created_at::date = CURRENT_DATE);

-- Agility Robotics (Digit): Nasdaq 상장 + Digit 5 + GXO 확장
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "ipo_listing", "new_value": "2026.11.5 Nasdaq 상장(AGLT), SPAC 합병. 순수 휴머노이드 로봇 기업 최초 상장. 1H 2026 순손실 $362M.", "source": "TechCrunch 2026-11-05", "reliability": "A"}, {"field": "digit_5_specs", "new_value": "2026.9 Digit 5 발표: 50lbs(22.7kg) 가반, 7.2ft(2.2m) 도달높이, 20시간+ 일일 가동. 신규 배터리 90분 운용+9분 충전. 안전 장벽 없이 사람 옆 작업. EU/UK 최초 해외 배치 준비.", "source": "The Robot Report / GeekWire / Agility 공식 2026-09", "reliability": "A"}, {"field": "gxo_expansion", "new_value": "GXO Statesville(NC)·Lebanon(TN) 2개 추가 사이트 계약. 기존 Georgia에서 100K+ 토트 이동 실적(2024.6~). 2027초 Digit 4로 운영 시작 후 Digit 5 전환. $300M 수주 파이프라인. 30+ 고객.", "source": "Robotics & Automation News / Agility 공식 2026-10~11", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Nasdaq 상장(AGLT)%SPAC 합병%Digit 5 발표%50lbs%GXO Statesville%' AND created_at::date = CURRENT_DATE);

-- Apptronik (Apollo): $935M 펀딩 + Google DeepMind + GXO LOI
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "funding_total", "new_value": "2026.2 Series A-X $520M($5B 밸류). 총 Series A ~$935M. 투자자: B Capital, Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA, PEAK6. 직원 300명.", "source": "CNBC / Forbes / TechFundingNews 2026-02-11", "reliability": "A"}, {"field": "partnerships_detail", "new_value": "Google DeepMind Gemini Robotics AI 기반 Apollo 구동(환경별 재학습 불필요). Mercedes-Benz·GXO·Jabil 파트너십. GXO 4년 최대 1,000대 LOI(RaaS). 2027년 말 북미 초기 배치. 50+ 물류 태스크 자율 평가 완료.", "source": "Interesting Engineering / The Gadgeteer / Robotics & Automation News 2026", "reliability": "A"}, {"field": "expansion_plan", "new_value": "Austin 본사 확장 + California 신규 오피스. Apollo 2 신규 버전 2026 내 공개 예정. Robot Park 데이터 수집(Google DeepMind 협력).", "source": "Apptronik 공식 / Forbes 2026", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Series A-X $520M%$5B 밸류%총 Series A ~$935M%Google DeepMind Gemini Robotics%' AND created_at::date = CURRENT_DATE);

-- 1X Technologies (NEO): Hayward 공장 + 12월 출하 + SoftBank 미확정
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "manufacturing_shipping", "new_value": "Hayward(CA) 58,000sqft 공장 개설, 연 10,000대 용량. 사전주문 10,000대 5일 완판(2025.10, 회사 발표). 구매 $20K / 구독 $499/월. CEO Børnich Runtime 2026서 12월 개발자+일부 소비자 출하 시작 발표.", "source": "The Next Web / Interesting Engineering / humanoidsdaily.com 2025~2026", "reliability": "B"}, {"field": "enterprise_deal", "new_value": "EQT 300+ 포트폴리오사 대상 최대 10,000대 공급 MOU(2025.12). 2026~2030 미국 파일럿 시작.", "source": "Wikipedia / Interesting Engineering 2025-12", "reliability": "B"}, {"field": "softbank_deal", "new_value": "SoftBank $6B 밸류 지배지분 인수 협상(2026.8 The Information). 1X 원래 $10B+ 밸류 목표. 3개월+ 경과 미확정. 양측 공식 발표 없음.", "source": "The Information / Reuters / DealStreetAsia 2026-08", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Hayward(CA) 58,000sqft%10,000대 5일 완판%SoftBank $6B 밸류 지배지분%' AND created_at::date = CURRENT_DATE);

-- Agibot: 10,000대 돌파 + X1 오픈소스 + G2 편의점 + IPO 추진
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "production_milestone", "new_value": "2026.3 누적 10,000대 돌파(첫 1,000대 약 2년). IDC 2025 출하량 1위. 2025.12 5,000대(X-Series 1,846대 포함). 상하이 기반.", "source": "The Robot Report / Interesting Engineering / Robotics & Automation News 2025~2026", "reliability": "A"}, {"field": "x1_platform", "new_value": "X1: 130cm/33kg/34DOF, ~2시간 운용. 오픈소스 연구 플랫폼(설계도·SW 프레임워크·미들웨어·모션제어 소스 공개). 키트 ~$20K(학술용 견적).", "source": "KR-Asia / robozaps / chipsilicon 2024~2026", "reliability": "B"}, {"field": "commercial_trials", "new_value": "G2 상하이 편의점 24시간 무인 운영 시범(6대/1,730건/4대 통과/2대 탈락, 200만 시청). A3 Ultra 호텔 업무 데모. 5개 휴머노이드 모델 라인업 공개. 홍콩 IPO Q3 2026 목표(미확인).", "source": "GlobeNewsWire / KR-Asia / humanoidsdaily.com 2026", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%누적 10,000대 돌파%IDC 2025 출하량 1위%G2 상하이 편의점%A3 Ultra 호텔%' AND created_at::date = CURRENT_DATE);

COMMIT;
