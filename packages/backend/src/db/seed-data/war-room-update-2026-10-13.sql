-- War Room 경쟁사 데이터 자동 업데이트 - 2026-10-13
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-10-13T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. CI MONITOR ALERTS — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('TechRepublic / Basenor / Electrek',
   'https://www.techrepublic.com/article/news-tesla-optimus-robot-production-2027-sales-timeline/',
   'Tesla Optimus — Samsung 2nm AI5 칩 9월 생산 개시, 학습 데이터 100만 시간 돌파 추정',
   'Samsung 2nm AI5 칩 9월 생산 개시. 학습 데이터 9월 말 500K+ → 10월 초 100만 시간 추정. 중국 자석 수출 금지 수개월 지연. 2027 공개 판매 목표 유지.'),

  ('Robotics & Automation News / Boston Dynamics',
   'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
   'BD Atlas 신규 4핑거 핸드(10/2) — 13 DOF, 직접 구동, 고밀도 촉각 압력 센서',
   '13 DOF(4-DOF 대향 엄지). 직접 구동. 손끝·손바닥 고밀도 촉각 압력 센서. 조작 정밀도 대폭 향상. 산업용 다관절 그리핑 핵심 발전.'),

  ('TIME / Figure AI / AI Insider',
   'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
   'Figure AI Helix 2.5 공개(9/17) — 미지 가정환경 대응 AI, 350+ Figure 03 납품',
   'Helix 2.5: 미지 가정환경 대응 AI 확장. 350+ Figure 03 납품(4월). 밸류에이션 ~$39B(미확인). 1인칭 영상 데이터 수집 인력 대규모 고용.'),

  ('The Standard HK / TechStoriess / RoboZaps',
   'https://thestandard.com.hk/innovation/article/345248/',
   'Unitree — H2 플래그십 전환, G1+ 발표, JAL 하네다 G1 시범, Wang: 1~2년 내 상용화 전환점',
   'H1→H2 대체. G1+ 발표. JAL 하네다 G1 수하물 시범(5월~). Wang: 대량 상용화 1~2년 내 전환점, 그러나 공장 배치 보류(로봇 처리량 인간 미달).'),

  ('Agility Robotics / SEC S-4/A',
   'https://www.agilityrobotics.com/content/agility-unveils-digit-5-humanoid-robot-built-for-cooperatively-safe-work-at-scale',
   'Agility Digit 5 — 교체형 엔드이펙터, 페이로드 40%↑, BOM $125K, 2027 EU CE 추진',
   'Digit 5: 교체형 엔드이펙터, 페이로드 40%↑, 고속 자율 충전, 신규 안전 아키텍처. V4 BOM ~$125K. 전략 파트너 H1 2027 → 일반 2027 말. Mercado Libre 신규.'),

  ('CNBC / Bloomberg / Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
   'Apptronik — John Deere·QIA·AT&T Ventures 합류, Bloomberg $5.5B+, $80K/년 타겟',
   '$520M 시리즈A-X: John Deere, QIA, AT&T Ventures 신규. Bloomberg $5.5B+. B Capital Morgan: 2027 $1B 주문, $80K/년 타겟. Robot Park 90K sqft.'),

  ('eWeek / The Next Web / DEV Community',
   'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
   '1X NEO — World Model Lab 발족(6월), Expert Mode VR 텔레오퍼레이션 자율성 논란',
   'World Model Lab 발족(6월): 영상 기반 구현 AI 학습 전용. Expert Mode: VR 원격 조종 — 자율성/프라이버시 논란. 실제 가정 배송 독립 검증 미완료(10/13).'),

  ('Agibot 공식 / IntelligentCIO / Humanoids Daily',
   'https://www.agibot.com/article/231/detail/63.html',
   'Agibot — Minth Group 합작 유럽 첫 양산기지(세르비아 Šabac), TÜV 인증, GE-Act 2.0 오픈소스',
   '세르비아 Šabac 유럽 첫 양산기지. TÜV Rheinland 안전 인증(IFA 2026). GE-Act 2.0 World-Action Model 오픈소스. A2(리셉션), X2(교육/연구). FCC 규정 강화로 미국 일부 제한.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.headline = v.headline
);

-- =====================================================
-- 2. CI STAGING — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "optimus", "updates": [{"field": "custom_chip_production", "new_value": "Samsung 2nm AI5 칩 9월 생산 개시(FSD+Optimus 공용)", "source": "TechRepublic 2026-10", "reliability": "B"}, {"field": "training_data", "new_value": "학습 데이터 9월 말 500K+ 시간, 10월 초 100만 시간 돌파 추정", "source": "Basenor", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Samsung 2nm AI5%100만 시간%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "atlas", "updates": [{"field": "hand_spec", "new_value": "신규 4핑거 핸드(10/2): 13 DOF, 4-DOF 대향 엄지, 직접 구동, 고밀도 촉각 압력 센서", "source": "Robotics & Automation News / BD 공식", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%4핑거%13 DOF%직접 구동%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "figure", "updates": [{"field": "ai_model", "new_value": "Helix 2.5(9/17): 미지 가정환경 대응 AI 확장, Figure 03 기반", "source": "TIME / Figure AI", "reliability": "A"}, {"field": "valuation", "new_value": "밸류에이션 ~$39B(미확인), Nvidia $1B 추가 투자 협상 중", "source": "The Information / CNBC", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Helix 2.5%미지 가정환경%$39B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "product_transition", "new_value": "H1→H2 플래그십 전환, G1+ 업그레이드 발표, Nvidia GR00T H2 Plus 10월 출시", "source": "The Standard HK", "reliability": "B"}, {"field": "deployment_trial", "new_value": "JAL 하네다 G1 수하물 처리 시범(5월~), Wang: 공장 배치 보류(처리량 인간 미달)", "source": "TechStoriess", "reliability": "C"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%H2 플래그십%JAL 하네다%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "digit5_specs", "new_value": "Digit 5: 교체형 엔드이펙터, 페이로드 40%↑, 고속 자율 충전, V4 BOM ~$125K", "source": "Agility Robotics / SEC S-4/A", "reliability": "A"}, {"field": "timeline", "new_value": "전략 파트너 H1 2027 → EU/UK CE 2027 → 일반 판매 2027 말", "source": "SEC S-4/A", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%교체형 엔드이펙터%BOM%$125K%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "apollo", "updates": [{"field": "investors_extended", "new_value": "John Deere, QIA, AT&T Ventures 신규 합류, Bloomberg: $5.5B+ 밸류에이션", "source": "CNBC / Bloomberg", "reliability": "A"}, {"field": "pricing_target", "new_value": "B Capital Morgan: 2027 $1B 주문 기대, 고용량 배송 시 $80K/년 타겟", "source": "CNBC", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%John Deere%QIA%$5.5B%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "neo", "updates": [{"field": "ai_research", "new_value": "World Model Lab 발족(6월): 영상 기반 구현 AI 모델 학습 전용 연구소", "source": "eWeek / DEV Community", "reliability": "B"}, {"field": "autonomy_concern", "new_value": "Expert Mode VR 텔레오퍼레이션 — 진정한 자율성 및 프라이버시 우려 제기", "source": "eWeek", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%World Model Lab%Expert Mode%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "agibot", "updates": [{"field": "europe_production", "new_value": "Minth Group 합작 세르비아 Šabac 유럽 첫 양산기지 개소", "source": "Agibot 공식 / IntelligentCIO", "reliability": "A"}, {"field": "certification", "new_value": "TÜV Rheinland 핵심 안전 인증 취득(IFA 2026)", "source": "Agibot 공식", "reliability": "A"}, {"field": "open_source", "new_value": "GE-Act 2.0 네이티브 World-Action Model 오픈소스 공개(9월)", "source": "Agibot 공식", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Šabac%TÜV%GE-Act 2.0%' AND created_at::date = CURRENT_DATE);

COMMIT;
