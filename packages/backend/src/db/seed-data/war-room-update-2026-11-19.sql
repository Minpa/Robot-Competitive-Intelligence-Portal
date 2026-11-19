-- War Room 경쟁사 데이터 자동 업데이트 - 2026-11-19
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-11-19T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Digitimes / UPI / Robotics & Automation News / The AI Insider',
   'https://www.digitimes.com/news/a20261118VL219/boston-dynamics-globalfoundries-atlas-robot-testing-2027.html',
   'Boston Dynamics, GlobalFoundries 반도체 팹에 Atlas 테스트 2027년 초 개시 — 자동차 외 최초 고객, Spot 운영도 확대 (11/17~18)',
   '11/17~18 다수 매체 보도. Boston Dynamics가 GlobalFoundries 반도체 공장에서 Atlas 휴머노이드 테스트를 2027년 초 시작. GF는 자동차 산업 외 최초의 Atlas 고객이자 최초의 반도체 제조사 테스트 대상. Malta(NY), Burlington(VT), Dresden(독일), Singapore 등 GF 시설 대상. Spot 배치도 확대. Physical AI의 반도체 제조 적용이라는 새로운 산업 확장 시그널.'),

  ('NotATeslaApp / DriveTeslaCanada / tech-insider.org / Teslarati',
   'https://www.notateslaapp.com/news/4959/musk-tesla-will-rent-optimus-robots-instead-of-selling-them',
   'Musk, Baron Investment Conference서 Optimus 렌탈 모델 공식 시사 — 판매 아닌 임대, 제조비 $30K→$20K 하락 추세 (11/6)',
   '11/6 제33회 Baron Investment Conference에서 Musk가 Ron Baron과의 인터뷰 중 Optimus를 판매가 아닌 임대(rental)할 것이라고 시사. "I think probably rent them." 발언. 제조비 현재 ~$30K, $20K 방향 하락 추세. 렌탈 가격·계약 조건 미발표. 외부 고객 인도 2027년 말 목표. 12/3 Annual Shareholder Meeting에서 추가 세부 가능성.'),

  ('Agility Robotics 공식 / The Robot Report / Silicon.co.uk / Robotics 24/7',
   'https://www.therobotreport.com/agility-robotics-announces-executive-moves-to-strengthen-digit-commercialization/',
   'Agility Robotics 경영진 개편 — 상용화 가속 위한 리더십 강화, Daniel Diez 역할 확대 (11/18)',
   '11/18 Agility Robotics가 Digit 상용화 스케일링을 위한 경영진 개편 발표. Daniel Diez(CSO)의 역할이 비즈니스 개발·프로젝트 관리 오피스까지 확대. 상장(AGLT) 이후 상용 배치 가속을 위한 조직 재편 신호. 30개 이상 고객 파이프라인 관리 체계 강화.'),

  ('Interesting Engineering / GlobeNewsWire / Gadget Review',
   'https://www.globenewswire.com/news-release/2026/11/08/3398006/0/en/six-agibot-g2-robots-complete-1-730-tasks-in-24-hour-shanghai-convenience-store-trial.html',
   'Agibot G2 6대, 상하이 편의점 24시간 무인 운영 시범 — 1,730건 업무, 4대 통과/2대 탈락 (11/2~3)',
   '11/2~3 Agibot G2 6대가 상하이 편의점에서 24시간 라이브스트림 무인 운영 시범. GlobeNewsWire 공식 발표: 1,730건 업무 처리. Interesting Engineering 보도: 4대 최종 평가 통과, 2대 탈락. 200만 명 이상 온라인 시청. 소매·서비스 환경 실배치 역량 시연이나, 24시간 연속 무중단·충전 없음 여부는 독립 검증 미완.'),

  ('Forbes / Interesting Engineering / Humanoids Daily',
   'https://interestingengineering.com/ai-robotics/figure-03-humanoids-take-campus-walk',
   'Figure 03 수십 대 BotQ 본사 캠퍼스 자율 보행 영상 공개 — 주차장·잔디밭 이동, 24시간 운용 체제 전환 추정 (11월 중순)',
   'Figure AI CEO Brett Adcock가 Figure 03 수십 대가 BotQ 공장에서 나와 캠퍼스 전체를 자율 보행하는 영상 복수 공개. 주차장·잔디밭·로비 등 실외 환경 이동. 온보드 스테레오 카메라로 계단·경사로·비포장 지형 자율 내비게이션(task-specific 프로그래밍 불필요). Santa Clara 야간 교대 코디네이터 채용 공고 — 24시간 운용 체제 전환 추정.'),

  ('The Gadgeteer / Robotics & Automation News',
   'https://the-gadgeteer.com/2026/11/16/gxo-apptronik-apollo-1000-humanoids-2027-trials/',
   'GXO-Apptronik Apollo 1,000대 LOI 후속 보도 확산 — RaaS 프레임워크, 가격 미공개 (11/16)',
   '11/16 The Gadgeteer·Robotics & Automation News 등에서 GXO-Apptronik LOI 후속 보도. 4년간 최대 1,000대 단계적 배치. RaaS(Robot-as-a-Service) 프레임워크. 로봇당 가격 미공개. 2027년 말 북미 초기 배치 예정. 성능·안전·운영 KPI 충족 조건부.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

-- Boston Dynamics Atlas: GlobalFoundries 반도체 팹 진출
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "globalfoundries_partnership", "new_value": "11/17~18 GlobalFoundries 반도체 팹에 Atlas 테스트 2027년 초 개시 발표. 자동차 산업 외 최초 Atlas 고객. 반도체 제조사 최초 휴머노이드 테스트. Malta(NY)·Burlington(VT)·Dresden(독일)·Singapore 등 GF 글로벌 시설 대상. Spot 배치도 확대.", "source": "Digitimes / UPI / Robotics & Automation News / The AI Insider 2026-11-17~18", "reliability": "A"}, {"field": "industry_expansion", "new_value": "Physical AI의 반도체 제조 적용으로 산업 확장. Hyundai 자동차 → GlobalFoundries 반도체로 고객 다각화. 클린룸 환경 적합성 검증 예정.", "source": "Digitimes 2026-11-18", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%GlobalFoundries 반도체 팹%Atlas 테스트 2027년 초%자동차 산업 외 최초%' AND created_at::date = CURRENT_DATE);

-- Tesla Optimus: Baron Conference 렌탈 모델 + 비용 하락
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "rental_model", "new_value": "11/6 Baron Investment Conference: Musk Optimus 렌탈 모델 시사. 판매 아닌 임대 우선. 제조비 현재 ~$30K → $20K 하락 추세. 렌탈 가격·계약 조건 미발표. 추후 렌탈+판매 병행 시사(X 발언). 12/3 Annual Shareholder Meeting 추가 세부 가능성.", "source": "NotATeslaApp / DriveTeslaCanada / Teslarati / tech-insider.org 2026-11-06", "reliability": "A"}, {"field": "gen3_production", "new_value": "Gen 3가 양산 대상 디자인으로 확정. 디자인 공개 Q1→Q2→7~8월→9월말로 수차례 연기. 외부 인도 2027년 말 목표. 사전주문·보증금 프로그램 없음.", "source": "Basenor / RoboticsCenter.ai 2026-11", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Baron Investment Conference%Musk Optimus 렌탈 모델%$30K%$20K 하락%' AND created_at::date = CURRENT_DATE);

-- Agility Robotics (Digit): 경영진 개편 + 상용화 가속
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "leadership_reshuffle", "new_value": "11/18 경영진 개편: Digit 상용화 스케일링 위한 리더십 강화. Daniel Diez(CSO) 역할 확대 — BD·PMO 겸임. 30개 이상 고객 파이프라인 관리 체계 강화. 상장(AGLT) 이후 조직 재편.", "source": "Agility Robotics 공식 / The Robot Report / Silicon.co.uk / Robotics 24/7 2026-11-18", "reliability": "A"}, {"field": "customer_expansion_detail", "new_value": "GXO 100,000+ 토트 이동 실적(2024.6~). AGCO Kansas 2027 파일럿 계획. Toyota Motor Manufacturing Canada RaaS. EU·UK 최초 해외 배치 준비 중.", "source": "Robotics & Automation News / Forbes / Agility 공식 2026-11-02", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11/18 경영진 개편%Daniel Diez%BD·PMO 겸임%30개 이상 고객%' AND created_at::date = CURRENT_DATE);

-- Agibot: G2 편의점 시범 + A3 Ultra 호텔 데모
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "convenience_store_trial_detail", "new_value": "11/2~3 상하이 편의점 24시간 시범: G2 6대 투입, 1,730건 업무, 4대 통과/2대 탈락. GlobeNewsWire 공식 발표. 200만 명 라이브스트림 시청. 소매 환경 실배치 역량 시연.", "source": "GlobeNewsWire 2026-11-08 / Interesting Engineering / Gadget Review", "reliability": "A"}, {"field": "a3_ultra_hotel_demo", "new_value": "A3 Ultra 호텔 업무 데모 영상: 고객 맞이·신분증 확인·키 전달·자율 충전·보안 순찰·음성 보고. 원컷 촬영. 사내 제작 영상으로 독립 검증 아님.", "source": "Agibot 공식 영상 / humanoid.press 2026-11", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%편의점 24시간 시범%G2 6대%1,730건%A3 Ultra 호텔 업무 데모%' AND created_at::date = CURRENT_DATE);

-- Figure AI: 캠퍼스 자율 보행 + 자율 내비게이션 역량
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "campus_autonomous_walk", "new_value": "11월 중순 Figure 03 수십 대 BotQ 캠퍼스 자율 보행 영상 공개. 주차장·잔디밭·로비 등 실외 이동. CEO Adcock 직접 영상 게시. Santa Clara 야간 코디네이터 채용 — 24시간 운용 전환 추정.", "source": "Interesting Engineering / Humanoids Daily / Humanoid Guide 2026-11", "reliability": "B"}, {"field": "autonomous_navigation", "new_value": "온보드 스테레오 카메라로 계단·경사로·비포장 지형 자율 내비게이션. task-specific 프로그래밍·오퍼레이터 개입 불필요. Helix AI 시스템 기반.", "source": "Figure AI 공식 / Interesting Engineering", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Figure 03 수십 대 BotQ 캠퍼스 자율 보행%야간 코디네이터%스테레오 카메라%' AND created_at::date = CURRENT_DATE);

-- Apptronik (Apollo): GXO LOI 후속 보도 (추가 매체 확산)
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "gxo_loi_coverage_expansion", "new_value": "11/16 GXO-Apptronik LOI 후속 보도 확산. The Gadgeteer·Robotics & Automation News 등 추가 매체 보도. RaaS 프레임워크, 로봇당 가격 미공개 확인. 50개 이상 물류 태스크 자율 평가 완료. 2027년 말 북미 초기 배치.", "source": "The Gadgeteer / Robotics & Automation News 2026-11-16", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11/16 GXO-Apptronik LOI 후속 보도 확산%The Gadgeteer%Robotics & Automation News%' AND created_at::date = CURRENT_DATE);

-- Unitree: 주가 하락 지속, 기간 내 주요 뉴스 없음
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "stock_decline", "new_value": "상장 후 주가 첫 거래일 종가 대비 ~40% 하락 보도. 8/19 STAR Market 상장(688836), IPO가 150.8위안, 첫날 500%+ 급등 후 조정 지속.", "source": "Live in the Future 2026-11", "reliability": "C"}, {"field": "status_unchanged", "new_value": "11/15~19 기간 주요 신규 뉴스 없음. IPO 후 조정 국면. PetroChina 합작·Pentagon 1260H·FCC 인증 등 기존 이슈 지속. 18,000대 누적 바이펫 생산(7월 기준).", "source": "종합 (robozaps / Wikipedia / Interesting Engineering)", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11/15~19 기간 주요 신규 뉴스 없음%IPO 후 조정%18,000대 누적%' AND created_at::date = CURRENT_DATE);

-- 1X NEO: SoftBank 인수 협상 여전히 미확정
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "softbank_deal_status", "new_value": "SoftBank $6B 밸류 지배지분 인수 협상(8월 The Information 보도) 이후 3개월 경과, 체결 확인 없음. 1X 측 원래 $10B 밸류 목표. Reuters·DealStreetAsia·36Kr 등 다수 매체 보도했으나 양측 공식 발표 없음.", "source": "The Information / Reuters / DealStreetAsia / The Star 2026-08-27", "reliability": "C"}, {"field": "delivery_status_nov", "new_value": "11월 중순 기준 소비자 인도 독립 검증 여전히 없음. CEO Børnich 2026년 내 출하 시작 재확인(Forbes). 텔레오퍼레이션 의존 모델 지속. 10,000대 사전주문 이행이 핵심 지표.", "source": "Forbes / eWeek / NotebookCheck / Startup Fortune", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%SoftBank%$6B 밸류 지배지분%3개월 경과%체결 확인 없음%CEO Børnich%' AND created_at::date = CURRENT_DATE);

COMMIT;
