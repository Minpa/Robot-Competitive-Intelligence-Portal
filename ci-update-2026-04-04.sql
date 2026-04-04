-- ============================================================
-- ARGOS 경쟁사 데이터 자동 업데이트 - 2026-04-04
-- 실행 전 DATABASE_URL 환경변수 확인 필요
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: 신규 경쟁사 추가 (Unitree, Apptronik, Agibot)
-- ============================================================

INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
VALUES
  ('unitree', 'Unitree H1/G1/H2', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apptronik', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot', 'Agibot X1', 'Agibot (Shanghai)', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  stage = EXCLUDED.stage,
  updated_at = now();

-- ============================================================
-- STEP 2: ci_monitor_alerts 신규 인텔리전스 INSERT
-- 중복 방지: headline + competitor_id 조합으로 체크
-- ============================================================

-- ---------- Tesla Optimus ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Tesla IR / Teslarati',
  'https://www.nextbigfuture.com/2026/04/tesla-optimus-v3-ready-for-mass-production.html',
  'Tesla Optimus Gen 3 양산 준비 발표 - Fremont 공장 전환',
  'Tesla가 Model S/X 생산을 Q2 2026 종료하고 Fremont 라인을 Optimus 생산으로 전환. 2026 CapEx $20B으로 2배 증가. Gen 3는 최초 "mass manufacturable" 모델로 발표. Gigafactory Texas에 Optimus 전용 제조시설 건설 중. 연간 10M대 목표.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Tesla Optimus Gen 3 양산 준비 발표 - Fremont 공장 전환'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Teslarati',
  'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
  'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표',
  'Tesla FSD 아키텍처 기반 AI 에이전트 "Digital Optimus" (코드명 Macrohard)를 xAI와 공동 개발. 2026년 9월 출시 목표. FSD 기반 end-to-end 자율 시스템의 로봇 확장 전략.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Tesla-xAI "Digital Optimus" AI 에이전트 파트너십 발표'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'TeslaNorth',
  'https://teslanorth.com/2026/04/01/elon-musk-confirms-optimus-3-delay-why-the-tesla-robot-isnt-ready/',
  'Optimus 3 출시 지연 확인 - Musk가 "마무리 작업 필요" 언급',
  'Elon Musk가 3/31 X에서 Optimus 3가 모바일이나 공개 준비에 추가 작업 필요하다고 확인. 다만 Tesla Diner LA에서 실제 서빙 데모가 목격됨. ETH Zurich에서 Optimus 2.5 키노트 발표 (4/2).',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'optimus'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Optimus 3 출시 지연 확인 - Musk가 "마무리 작업 필요" 언급'
  AND ma.competitor_id = c.id
);

-- ---------- Boston Dynamics Atlas ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Engadget / Boston Dynamics',
  'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  'Boston Dynamics CES 2026에서 양산형 Atlas 공개 - 2026 배치 완판',
  'CES 2026(1/5)에서 Hyundai 미디어데이에 양산형 전기 Atlas 공개. 56 DOF, 자가 교체 배터리, 50kg 리프트, -20~40°C 동작. 2026년 전체 배치물량 Hyundai RMAC + Google DeepMind에 확정. 30,000대/년 공장 2028년 계획.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'atlas'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Boston Dynamics CES 2026에서 양산형 Atlas 공개 - 2026 배치 완판'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Boston Dynamics',
  'https://bostondynamics.com/products/atlas/',
  'Atlas-Google DeepMind AI 파트너십 - Gemini 파운데이션 모델 통합',
  'Boston Dynamics가 Google DeepMind와 파트너십 체결. 최첨단 Gemini 파운데이션 모델을 Atlas에 통합하여 인지능력 강화. Hyundai Mobis 맞춤 고출력 액추에이터 공급.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'atlas'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Atlas-Google DeepMind AI 파트너십 - Gemini 파운데이션 모델 통합'
  AND ma.competitor_id = c.id
);

-- ---------- Figure AI ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'CNBC',
  'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
  'Figure 03 백악관 초청 - 최초 휴머노이드 로봇 White House 방문',
  '3/25 백악관 "Fostering the Future Together" 글로벌 서밋에서 Figure 3가 Melania Trump과 함께 등장. 교육/기술 포커스. 정치적 가시성 확보.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'figure'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Figure 03 백악관 초청 - 최초 휴머노이드 로봇 White House 방문'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'BMW Group',
  'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
  'Figure 02 BMW Leipzig 공장 실전 투입 - 30,000대 X3 생산 지원',
  'Figure 02가 BMW Leipzig 공장에서 10개월간 5일/주 10시간 교대 운영. 30,000대 BMW X3 생산에 참여. 90,000개 부품 이동, 1,250시간 가동, 120만 걸음 기록.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'figure'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Figure 02 BMW Leipzig 공장 실전 투입 - 30,000대 X3 생산 지원'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'TSG Invest / NVIDIA Blog',
  'https://tsginvest.com/figure-ai/',
  'Figure AI $39B 밸류에이션 달성 - 총 $1.9B+ 펀딩',
  'Figure AI 총 펀딩 $1.9B+, 밸류에이션 $39B 도달. 투자자: Jeff Bezos, Microsoft, NVIDIA, Intel, Amazon, OpenAI. Figure 03 NVIDIA 3배 AI 컴퓨팅 파워로 완전자율 작업 지원.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'figure'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Figure AI $39B 밸류에이션 달성 - 총 $1.9B+ 펀딩'
  AND ma.competitor_id = c.id
);

-- ---------- Unitree ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'CNBC / Bloomberg',
  'https://www.cnbc.com/2026/03/20/unitree-plans-shanghai-ipo-testing-interest-in-humanoid-robots.html',
  'Unitree 상하이 STAR Market IPO 신청 - $610M 규모',
  'Unitree가 상하이 STAR Market에 42억 위안($610M) IPO 신청 승인. 밸류에이션 $3-7B 목표. 투자자: Tencent, Alibaba, Ant Group, BYD, Xiaomi, ByteDance. AI 모델 R&D 및 생산시설 확장에 사용 계획.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'unitree'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Unitree 상하이 STAR Market IPO 신청 - $610M 규모'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'eWeek / Thomas',
  'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
  'Unitree 2026년 20,000대 출하 목표 - H2 휴머노이드 CES 2026 공개',
  'G1 2025년 5,500대 출하 완료. 2026년 10,000-20,000대 목표. H2 신형(180cm) CES 2026 공개: 31 DOF, 360Nm 토크, 백플립/비행킥 시연. G1 가격 $13,500-$16,000.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'unitree'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Unitree 2026년 20,000대 출하 목표 - H2 휴머노이드 CES 2026 공개'
  AND ma.competitor_id = c.id
);

-- ---------- Agility Robotics (Digit) ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'TechCrunch / Robotics & Automation',
  'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
  'Agility Digit - Toyota Canada 상업 계약 체결 (RaaS 모델)',
  'Toyota Motor Manufacturing Canada(TMMC) Woodstock 공장에 Digit 7대 RaaS 계약. RAV4 물류 지원. GXO Flowery Branch에서 100,000+ 토트 이동 달성. Fortune 500 고객: GXO, Schaeffler, Amazon.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'digit'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Agility Digit - Toyota Canada 상업 계약 체결 (RaaS 모델)'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Agility Robotics 공식',
  'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
  'Digit 차세대 업그레이드 - 50lb 가반하중, 4시간 배터리, ISO 안전인증',
  '차세대 Digit: 가반하중 50lb, 배터리 4시간, Category 1 Stop, Safety PLC 탑재. ISO 기능안전 인증 2026 중후반 목표. 인간 협업 18개월 내 승인 예상.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'digit'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Digit 차세대 업그레이드 - 50lb 가반하중, 4시간 배터리, ISO 안전인증'
  AND ma.competitor_id = c.id
);

-- ---------- Apptronik (Apollo) ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'CNBC / TechCrunch',
  'https://techcrunch.com/2026/02/11/humanoid-robot-startup-apptronik-has-now-raised-935m-at-a-5b-valuation/',
  'Apptronik $520M 추가 펀딩 - 총 $935M 조달, $5B 밸류에이션',
  'Series A 확장으로 $520M 추가 조달. 총 $935M, $5B 밸류에이션. Austin 확장 + California 신규 오피스. Google DeepMind Gemini Robotics 통합. Mercedes-Benz, GXO, Jabil 파트너십 유지.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'apptronik'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Apptronik $520M 추가 펀딩 - 총 $935M 조달, $5B 밸류에이션'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Automate.org',
  'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  'Apptronik 신형 Apollo 2026 공개 임박 - 1년간 비공개 테스트 완료',
  'CEO Jeff Cardenas: 신형 Apollo 1년간 테스트 완료, 2026년 곧 공개 예정. Google DeepMind Gemini 모델 기반 인지능력 탑재. Mercedes-Benz/GXO 공장/창고 실증 진행 중.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'apptronik'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Apptronik 신형 Apollo 2026 공개 임박 - 1년간 비공개 테스트 완료'
  AND ma.competitor_id = c.id
);

-- ---------- 1X Technologies (NEO) ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'BusinessWire / TechCrunch',
  'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
  '1X Technologies - EQT 10,000대 NEO 공급 전략 파트너십 체결',
  'EQT 포트폴리오 300+ 기업에 10,000대 NEO 공급 계약(2026-2030). 제조, 물류, 창고 집중. 2026년 미국 파일럿 시작 → 유럽/아시아 확대. 소비자 사전주문 $20,000, 목표 초과 달성.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'neo'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = '1X Technologies - EQT 10,000대 NEO 공급 전략 파트너십 체결'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  '1X Technologies / AI Base',
  'https://news.aibase.com/news/24272',
  'NEO CES 2026 공개 - 미국 가정용 시장 2026 진출, OpenAI 투자',
  '167cm/30kg, 22 DOF 양손(인간급 손재주), 3D 격자 폴리머 소프트 바디. 68kg 리프트/25kg 운반 가능. OpenAI Startup Fund 투자. 총 펀딩 $130M+, $1B 추가 모집 추진 중.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'neo'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'NEO CES 2026 공개 - 미국 가정용 시장 2026 진출, OpenAI 투자'
  AND ma.competitor_id = c.id
);

-- ---------- Agibot ----------

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'eWeek / Interesting Engineering',
  'https://www.eweek.com/news/chinas-agibot-10000-humanoid-robots-scale/',
  'Agibot 10,000대 생산 돌파 - 글로벌 시장점유율 1위',
  '3/30 10,000번째 로봇 출하. 5,000→10,000대 단 3개월. 물류/리테일/호텔/교육/산업 배치. 유럽/북미/일본/한국/동남아/중동 글로벌 진출. Omdia 기준 글로벌 시장점유율 1위.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'agibot'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'Agibot 10,000대 생산 돌파 - 글로벌 시장점유율 1위'
  AND ma.competitor_id = c.id
);

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, status, detected_at)
SELECT
  'Korea Herald',
  'https://www.koreaherald.com/article/10694574',
  'LG 전자 CEO Agibot 상하이 방문 - 양산/데이터학습/공급망 협력 논의',
  'LG전자 류재철 CEO 상하이 3일 방문. Agibot 시설 투어, 대량 생산 시스템/데이터 트레이닝 인프라/액추에이터 공급망 논의. LG는 2025년 8월 Agibot 지분 투자 완료. CLOiD 실전 필드 트라이얼 "내년 초" 목표.',
  c.id, 'pending', now()
FROM ci_competitors c WHERE c.slug = 'agibot'
AND NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts ma
  WHERE ma.headline = 'LG 전자 CEO Agibot 상하이 방문 - 양산/데이터학습/공급망 협력 논의'
  AND ma.competitor_id = c.id
);

-- ============================================================
-- STEP 3: 주요 CI Values 업데이트 (기존 경쟁사 비즈니스 레이어)
-- ============================================================

-- Digit - 주요 고객 업데이트
UPDATE ci_values SET
  value = 'Amazon, GXO, Schaeffler, Toyota Canada',
  confidence = 'A',
  source = 'Agility Robotics 공식 + TechCrunch 2026.02',
  source_url = 'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
  source_date = '2026-02-19',
  updated_at = now()
WHERE item_id IN (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '주요 고객')
  AND competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'digit');

-- Optimus - 상용화 단계 업데이트
UPDATE ci_values SET
  value = 'Pilot → 양산 전환 중 (Fremont 라인 전환, 2026 여름 소량 생산 시작)',
  confidence = 'B',
  source = 'Tesla IR Q4 2025 + Teslarati',
  source_url = 'https://www.nextbigfuture.com/2026/04/tesla-optimus-v3-ready-for-mass-production.html',
  source_date = '2026-04-01',
  updated_at = now()
WHERE item_id IN (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계')
  AND competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'optimus');

-- Figure - 밸류에이션 업데이트
UPDATE ci_values SET
  value = '$39B',
  confidence = 'B',
  source = 'TSG Invest / 다수 매체',
  source_url = 'https://tsginvest.com/figure-ai/',
  source_date = '2026-03-01',
  updated_at = now()
WHERE item_id IN (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '최근 밸류에이션')
  AND competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure');

-- Figure - 총 펀딩 업데이트
UPDATE ci_values SET
  value = '$1.9B+',
  confidence = 'B',
  source = 'TSG Invest / NVIDIA Blog 2026',
  source_url = 'https://tsginvest.com/figure-ai/',
  source_date = '2026-03-01',
  updated_at = now()
WHERE item_id IN (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '총 펀딩')
  AND competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'figure');

-- Atlas - 상용화 단계 업데이트
UPDATE ci_values SET
  value = 'Commercial (양산형 CES 2026 공개, 2026 배치 완판)',
  confidence = 'A',
  source = 'Boston Dynamics 공식 + Engadget',
  source_url = 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
  source_date = '2026-01-05',
  updated_at = now()
WHERE item_id IN (SELECT i.id FROM ci_items i JOIN ci_categories cat ON i.category_id = cat.id WHERE i.name = '상용화 단계')
  AND competitor_id = (SELECT id FROM ci_competitors WHERE slug = 'atlas');

COMMIT;
