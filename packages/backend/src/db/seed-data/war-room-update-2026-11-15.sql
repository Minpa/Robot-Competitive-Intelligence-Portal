-- War Room 경쟁사 데이터 자동 업데이트 - 2026-11-15
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-11-15T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Xinhua News Agency',
   'https://english.news.cn/20261114/36709a4db6bf4bf8906566e8d47abbcd/c.html',
   'Agibot A3 Ultra 복잡 지형 자율 보행 시연 — 계단·좁은 틈·3D 환경 실시간 적응 (11/14)',
   '11/14 신화통신 보도. Agibot A3 Ultra(코드명 Luka)가 계단, 좁은 틈, 비정형 3D 환경을 실시간 적응하며 자율 보행하는 영상 공개. Web Summit 2026(리스본)에서 최초 공개된 풀사이즈 휴머노이드로, 기존 A3 대비 지형 적응력·전신 제어 역량 대폭 향상 시연. X2, D1 Edu 모델과 함께 전시.'),

  ('UPI / Korea Herald / Barchart',
   'https://www.upi.com/Top_News/World-News/2026/11/11/hyundai-mobis-boston-dynamics-atlas/3371794437204',
   'Hyundai Mobis, Atlas 프로토타입 액추에이터 11월 생산 개시 — 31개 전체 납품, 2028년 양산 목표 (11/11)',
   '11/11 UPI 보도. Hyundai Mobis가 Boston Dynamics Atlas용 프로토타입 액추에이터를 금월(11월) 생산 개시. 로봇 1대당 31개 액추에이터 전량 공급. 2028년 풀스케일 양산 전환 목표. CES 2026에서 협업 프레임워크 발표 후 첫 생산 마일스톤. 미국 액추에이터 생산 시설 연간 350,000유닛 용량 2028년 가동 예정.'),

  ('TechRepublic / eWeek / Figure AI (CEO)',
   'https://www.techrepublic.com/article/news-figure-03-humanoid-robot-348-mile-endurance-test/',
   'Figure 03 내구성 테스트: 9일간 348마일(560km) 보행, 120만 보 기록 (11월)',
   'TechRepublic·eWeek 보도. Figure CEO Brett Adcock가 Figure 03의 트레드밀 내구성 테스트 결과 공개. 9일간 약 348마일(~560km), 약 120만 보 기록. 24시간/1시간 생산 가능 라인 가동 중, 1,000대 이상 생산. Helix AI 시스템 기반 자율 운용. 다만 연속 무중단 운행 여부는 독립 검증 미완.'),

  ('Fortune',
   'https://fortune.com/2026/11/14/capek-rur-humanoid-robots-tesla-optimus-amazon-agility/',
   'Fortune: 인간 노동 대체 로봇 시대 본격 도래 — Tesla Optimus·Amazon·Agility 주요 사례 분석 (11/14)',
   '11/14 Fortune 특집 기사. 1921년 Čapek의 R.U.R. 연극에서 시작된 로봇 개념이 현실화되고 있다고 분석. Tesla Optimus(Fremont 양산), Amazon(100만 대 로봇 마일스톤), Agility Robotics(Digit AGLT 상장)를 주요 사례로 다룸. 임금 요구 없는 노동력 구축이 산업 전반으로 확산 중이라는 논조.'),

  ('The Information / Electrek / tech-insider.org',
   'https://tech-insider.org/tesla-optimus-1000-robots-weekly-2026/',
   'Tesla Optimus 주당 1,000대 생산 목표 보도 — 8월 수백 대에서 연말 1,000대/주 가속 (미확인)',
   'tech-insider.org 보도(The Information 원출처 인용). Tesla 관리자들이 2026년 연말까지 주당 1,000대 이상 생산 가능한 자동화 라인 목표 설정. Q2 주당 수십 대 → 8월 수백 대 → 연말 1,000대/주 램프업 경로. 단, Tesla 공식 확인 없으며 Musk는 Q3 실적발표에서 "early production" 단계 인정만. Zacks는 "promise보다 progress 부족" 분석.'),

  ('Africanews / Euronews / Público (포르투갈)',
   'https://www.africanews.com/2026/11/13/portugal-humanoid-robots-take-centre-stage-at-web-summit-2026/',
   'Web Summit 2026 폐막 후속 보도: Agibot·Galbot 등 중국 로봇이 무대 장악 — 폭풍 취소일 포함 3일 행사 (11/13)',
   '11/13 Africanews·Público 보도. Web Summit 2026(리스본) 폐막. 11/11 폭풍 Charles로 인한 하루 취소 포함 3일 진행. Agibot A3가 9대 동기 댄싱 오프닝 퍼포먼스. Galbot(중국) 등도 참여. Web Summit 설립자 Paddy Cosgrave "미래의 가장 큰 이름은 캘리포니아가 아닌 중국에서 나올 것" 발언 재확인.'),

  ('StockAnalysis / iTechPost',
   'https://stockanalysis.com/stocks/aglt/history/',
   'AGLT 상장 2주차 변동성 지속 — 11/9 $8.36~$8.78 거래, 상장가 대비 27~30% 하락 (11/9 기준)',
   '11/9 기준 AGLT 주가 $8.36~$8.78 범위(출처 간 차이). 11/5 상장 시가 $11.26 대비 ~27~30% 하락. 시가총액 ~$2.25B. iTechPost(11/10) "IPO stock performance" 분석 보도. 매출 $174K vs 순손실 $362M의 펀더멘털 부담 지속. 12월 첫 분기 실적 발표 대기.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

-- Agibot: A3 Ultra 지형 자율 보행 + Web Summit 후속
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "a3_ultra_terrain", "new_value": "11/14 A3 Ultra(코드명 Luka) 복잡 지형 자율 보행 시연. 계단·좁은 틈·비정형 3D 환경 실시간 적응. Web Summit 2026 최초 공개 모델.", "source": "Xinhua News Agency 2026-11-14", "reliability": "A"}, {"field": "web_summit_aftermath", "new_value": "11/13 Web Summit 폐막 후속 보도 확산. 9대 A3 동기 댄싱, X2·D1 Edu 전시. Galbot(중국)과 함께 메인 스테이지 장악. Paddy Cosgrave 친중 발언 재확인.", "source": "Africanews / Euronews / Público 2026-11-13", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%A3 Ultra%코드명 Luka%복잡 지형 자율 보행%' AND created_at::date = CURRENT_DATE);

-- Boston Dynamics Atlas: Hyundai Mobis 프로토타입 액추에이터 생산 개시
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "actuator_production_start", "new_value": "11월 Hyundai Mobis 프로토타입 액추에이터 생산 개시. 로봇 1대당 31개 전량 납품. 2028년 양산 전환 목표. 미국 시설 연간 350,000유닛 용량 2028년 가동 예정.", "source": "UPI / Korea Herald 2026-11-11", "reliability": "B"}, {"field": "production_capacity", "new_value": "현재 Waltham 프로토타입 1대/일 수준. 연 30,000대 목표 신공장 건설 계획 단계. 2026 생산분 전량 2개 파일럿 파트너에 사전 확보.", "source": "Maintenance World / Jared Watkins Research (2차 출처)", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11월 Hyundai Mobis 프로토타입 액추에이터 생산 개시%31개 전량%' AND created_at::date = CURRENT_DATE);

-- Figure AI: 348마일 내구성 테스트 + 생산 마일스톤
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "endurance_test", "new_value": "Figure 03 트레드밀 내구성 테스트: 9일간 348마일(~560km), 120만 보. CEO Brett Adcock 직접 발표. 독립 검증 미완.", "source": "TechRepublic / eWeek (CEO 발표 인용)", "reliability": "B"}, {"field": "production_pace", "new_value": "BotQ 공장 24시간 가동, 1시간/1대 생산 라인. 1,000대 이상 생산 완료. 120일 내 24배 처리량 개선.", "source": "eWeek / Figure AI 공식", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%348마일%120만 보%BotQ 공장 24시간%' AND created_at::date = CURRENT_DATE);

-- Tesla Optimus: 생산 램프업 상세
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "production_ramp_detail", "new_value": "생산 램프업 경로: Q2 주당 수십 대 → 8월 수백 대 → 연말 1,000대/주 목표(The Information). 1,000대/주는 관리자 내부 목표이며 Tesla 공식 확인 없음. Musk는 Q3 실적에서 early production 인정.", "source": "The Information (via tech-insider.org) / Zacks", "reliability": "C"}, {"field": "industry_recognition", "new_value": "Fortune(11/14) 특집: Tesla Optimus를 Amazon, Agility와 함께 인간 노동 대체 로봇 시대 핵심 플레이어로 분석.", "source": "Fortune 2026-11-14", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Q2 주당 수십 대%8월 수백 대%연말 1,000대/주%Fortune%11/14%' AND created_at::date = CURRENT_DATE);

-- Agility Robotics (Digit): AGLT 주가 추이 업데이트
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "stock_update_wk2", "new_value": "AGLT 상장 2주차: 11/9 $8.36~$8.78 거래(출처 간 차이). 상장가($11.26) 대비 ~27~30% 하락. 시총 ~$2.25B. 12월 첫 분기 실적 발표 대기.", "source": "StockAnalysis / iTechPost 2026-11-09~10", "reliability": "A"}, {"field": "fortune_coverage", "new_value": "Fortune(11/14): Agility를 Tesla, Amazon과 함께 인간 노동 대체 로봇 시대 핵심 사례로 보도. 미국 최초 순수 휴머노이드 상장사 포지셔닝 언론 인지도 확산.", "source": "Fortune 2026-11-14", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%AGLT 상장 2주차%$8.36~$8.78%Fortune%11/14%' AND created_at::date = CURRENT_DATE);

-- Apptronik (Apollo): GXO LOI 후속 보도 확산
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "gxo_loi_detail", "new_value": "GXO-Apptronik LOI(11/12) 후속 보도 확산. GXO 공식 프레스릴리즈 + Apptronik 공식 확인. Supply Chain Digital, Robotics 24/7, Automated Warehouse 등 다수 매체 보도. 50개 이상 물류 태스크 자율 평가 완료. 2027년 말 북미 초기 배치 예정.", "source": "GXO Press Release / Apptronik Official / Supply Chain Digital / Robotics 24/7", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%GXO-Apptronik LOI%11/12%후속 보도 확산%50개 이상 물류 태스크%' AND created_at::date = CURRENT_DATE);

-- Unitree: 신규 뉴스 없음 (기록용)
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "status_unchanged", "new_value": "11/13~15 기간 신규 주요 뉴스 없음. IPO 후 첫 실적·PetroChina 합작·FCC 인증 6모델·Pentagon 1260H 리스트 등재 등 기존 이슈 지속. 11/2 태산 과열 사건 후 내구성 관련 추가 발표 없음.", "source": "종합 (Interesting Engineering / Cryptopolitan / Time)", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11/13~15 기간 신규 주요 뉴스 없음%Pentagon 1260H%태산 과열%' AND created_at::date = CURRENT_DATE);

-- 1X NEO: 배송 상태 여전히 미검증
INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "delivery_status", "new_value": "11월 중순 기준 소비자 인도 독립 검증 여전히 없음. grabarobot 베타 배송 시작 보도 vs robozaps·Offbrand Human 미확인 상태 상충 지속. 텔레오퍼레이터 상시 개입 방식 프라이버시 우려(Startup Fortune). 10,000대 사전주문 이행 상황이 핵심 관전 포인트.", "source": "grabarobot / robozaps / Offbrand Human / Startup Fortune", "reliability": "D"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%11월 중순 기준 소비자 인도 독립 검증 여전히 없음%텔레오퍼레이터%10,000대 사전주문%' AND created_at::date = CURRENT_DATE);

COMMIT;
