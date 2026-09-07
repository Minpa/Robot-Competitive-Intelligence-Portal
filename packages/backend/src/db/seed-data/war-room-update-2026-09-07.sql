-- War Room 경쟁사 데이터 자동 업데이트 - 2026-09-07
-- ARGOS Competitive Intelligence Auto-Collect
-- 수집 시간: 2026-09-07T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 환경: DATABASE_URL 직접 접속 불가 (raw TCP proxy 제한), SQL 파일로 생성

BEGIN;

-- =====================================================
-- 1. COMPETITIVE ALERTS (전략 알림) — 신규 항목만
-- =====================================================

-- [A] Figure AI - Nscale $3.5B 컴퓨팅 계약, NVIDIA Vera Rubin GPU 100K대 (2026-09-03)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '08c3aa0f-399a-4da8-bd29-a60130deeea9', 'partnership', 'critical',
  'Figure AI: Nscale과 $3.5B 컴퓨팅 계약 체결, NVIDIA Vera Rubin GPU 100K대 (2026.9.3)',
  'Figure AI가 2026년 9월 3일 AI 인프라 기업 Nscale과 $3.5B 전략 파트너십을 발표. NVIDIA Vera Rubin 플랫폼 기반 최대 100,000 GPU를 배포할 계획. 초기 $3.5B에서 $6B 이상으로 확대 의향. 배포 시작은 2027년 하반기 텍사스 Barstow. Helix AI 시스템(휴머노이드 제어용) 개발에 활용. Nscale은 Figure에 전략적 지분 투자도 진행. Figure의 총 조달액 $1.9B 대비 3.5B 컴퓨팅 투자로 AI 훈련 인프라에 대한 공격적 베팅.',
  '{"source": "Forbes, Unite.AI, eWeek, TechTimes, Securities.io", "date": "2026-09-03", "reliability": "A", "details": {"partner": "Nscale", "initial_commitment": "$3.5B", "scale_target": "$6B+", "gpu_platform": "NVIDIA Vera Rubin", "max_gpus": 100000, "deployment_start": "H2 2027", "deployment_location": "Barstow, Texas", "purpose": "Helix AI system for humanoid control", "equity_stake": true, "total_raised_by_figure": "$1.9B"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '08c3aa0f-399a-4da8-bd29-a60130deeea9'
  AND type = 'partnership'
  AND title LIKE '%Nscale%$3.5B%Vera Rubin%'
);

-- [A] Unitree - IPO 후 주가 50% 하락, 고점 1,100위안 → 546위안 (2026-09-02)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548', 'funding', 'warning',
  'Unitree: IPO 후 주가 50%+ 하락, 고점 1,100위안 → 546위안 (2026.9.2)',
  'Unitree Robotics(688836.SH) 주가가 상장 첫날(8/19) 장중 고점 1,100위안에서 9월 2일 546위안까지 50% 이상 하락. Bloomberg 보도. 시총 약 $32.9B. 첫날 460% 급등 후 급속 반전. 그러나 IPO 가격(150.8위안) 대비로는 여전히 260%+ 프리미엄 유지. 2025년 매출 17.1억위안(+335% YoY), 조정순이익 6억위안(+674% YoY)으로 펀더멘탈은 견조.',
  '{"source": "Bloomberg", "date": "2026-09-02", "reliability": "A", "details": {"ticker": "688836.SH", "ipo_date": "2026-08-19", "ipo_price_cny": 150.8, "day1_peak_cny": 1100, "sept2_price_cny": 546, "drop_from_peak_pct": "50%+", "market_cap_usd": "$32.9B", "premium_over_ipo_pct": "260%+", "2025_revenue_cny": "1.71B", "2025_revenue_growth_yoy": "335%", "2025_adj_net_income_cny": "600M", "2025_income_growth_yoy": "674%"}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = '0e2e7f53-0a22-4b6a-88fe-5d0fb1f54548'
  AND type = 'funding'
  AND title LIKE '%50%하락%1,100위안%546위안%'
);

-- [B] Agility Robotics - Digit V5 방 재배치 데모 + 12월 출하 + CTO 인터뷰 (2026-09 초)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'score_spike', 'warning',
  'Agility Robotics: Digit V5 "케이지 밖" 작업 데모 + 12월 첫 출하 + CTO 인터뷰 (2026.9)',
  'Agility Robotics가 2026년 9월 초 Digit V5의 방 재배치 데모 영상을 공개 — 소파 끌기, 의자/가방 이동 등 다양한 크기·무게·그립 물체 범용 조작 시연. Digit V5는 12월 첫 고객 출하 예정이며, 안전 펜싱 없이 인간과 공존 작업("케이지 밖") 가능. 20시간 연속 가동, 교체형 엔드이펙터, 50lb 적재, 7.2ft 리치. GXO에서 100,000+ totes 처리, 65,000+ 가동시간, 9개 시설 배치 중. DIGITIMES 9/5 CTO 인터뷰에서 협력형 휴머노이드 미래 논의.',
  '{"source": "TechEBlog, Forbes, DIGITIMES, Agility Robotics", "date": "2026-09-05", "reliability": "B", "details": {"digit_v5": {"shipping_date": "December 2026", "payload_lb": 50, "reach_ft": 7.2, "runtime_hours": 20, "key_feature": "no safety fencing required", "demo": "room rearranging - couch dragging, chair and bag shifting"}, "deployment_stats": {"gxo_totes": "100,000+", "operating_hours": "65,000+", "customer_sites": 9, "customers": ["GXO", "Schaeffler", "Toyota Canada", "Mercado Libre", "Amazon"]}, "cto_interview": {"outlet": "DIGITIMES", "date": "2026-09-05", "topic": "future of collaborative humanoid robotics"}, "spac_status": "pending SEC review, expected close by end 2026"}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name ILIKE '%Agility%'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'score_spike' AND title LIKE '%Digit V5%케이지 밖%12월%CTO%'
)
LIMIT 1;

-- [A] AGIBOT - WAIC 2026 A3 Ultra/G2 Max/X2 Edu/OmniHand 3 Ultra-M 4종 공개, H1 2026 8,400대 글로벌 44% (2026-07)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT hr.id, 'mass_production', 'critical',
  'AGIBOT: WAIC 2026 A3 Ultra 등 4종 동시 공개, H1 2026 8,400대 출하(글로벌 44%) (2026.7)',
  'AGIBOT이 WAIC 2026(상하이 7월)에서 4종 신제품을 동시 공개: (1) A3 Ultra — 174cm 풀사이즈 휴머노이드, 51 DOF, 팔당 5kg 적재, 8시간 런타임, 상용/서비스용. (2) G2 Max — 중량물 핸들링/팔레타이징용, 힘제어 팔, 가변 작업 높이, 전방향 이동, 배터리 핫스왑. (3) X2 Edu — 교육 플랫폼. (4) OmniHand 3 Ultra-M — 로봇 핸드. 2026 상반기 8,400대 출하로 글로벌 시장 44% 점유(1위). 독일 Minth Group 자동차부품 라인에 유럽 최초 배치.',
  '{"source": "Interesting Engineering, eWeek, PR Newswire, Robotics & Automation News", "date": "2026-07", "reliability": "A", "details": {"waic_2026": {"event": "World Artificial Intelligence Conference 2026", "location": "Shanghai"}, "new_products": [{"name": "A3 Ultra", "type": "full-size humanoid", "height_m": 1.74, "dof": 51, "payload_kg_per_arm": 5, "runtime_hours": 8, "use_case": "commercial and service"}, {"name": "G2 Max", "type": "heavy-payload industrial", "features": ["force-controlled arms", "adjustable height", "omnidirectional", "battery swap"]}, {"name": "X2 Edu", "type": "education platform"}, {"name": "OmniHand 3 Ultra-M", "type": "robotic hand"}], "h1_2026_shipments": 8400, "global_market_share_pct": 44, "europe_deployment": {"partner": "Minth Group", "location": "Germany", "industry": "auto parts"}}}'::jsonb,
  false, NOW()
FROM humanoid_robots hr JOIN companies c ON hr.company_id = c.id
WHERE c.name = 'Agibot'
AND NOT EXISTS (
  SELECT 1 FROM competitive_alerts WHERE type = 'mass_production' AND title LIKE '%WAIC 2026%A3 Ultra%8,400대%44%%'
)
LIMIT 1;

-- [B] Boston Dynamics - Hyundai 25,000대 Atlas 커밋, 노조 배치합의 필요 (2026-05-22)
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e', 'partnership', 'warning',
  'Boston Dynamics: Hyundai 자체 공장 25,000대 Atlas 배치 계획, 노조 합의 없이 블로킹 (2026.5)',
  'Hyundai Motor Group이 자체 제조 시설에 최대 25,000대의 Boston Dynamics Atlas 로봇 배치를 계획. TechTimes 5/22 보도. 2028년 목표. 그러나 노동조합이 노동 합의(labor deal) 없이는 배치를 블로킹하겠다고 선언. 현재 Hyundai RMAC(로보틱스 메타플랜트 응용 센터)에서 파일럿 진행 중. 2026년 전량 배치 물량은 Hyundai RMAC + Google DeepMind에 확정. 외부 고객 추가는 2027년부터.',
  '{"source": "TechTimes, New Atlas, Engadget", "date": "2026-05-22", "reliability": "B", "details": {"commitment": "25,000 Atlas robots", "target_year": 2028, "blocker": "union requires labor deal before deployment", "current_pilot": "Hyundai RMAC", "2026_allocation": "Hyundai RMAC + Google DeepMind (fully committed)", "external_customers_from": 2027, "atlas_specs": {"reach_ft": 7.5, "lift_lb": 110, "temp_range_f": "-4 to 104"}}}'::jsonb,
  false, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM competitive_alerts
  WHERE robot_id = 'cc1d7e1b-3ee4-4d8e-9207-7547967c592e'
  AND type = 'partnership'
  AND title LIKE '%25,000대%노조%블로킹%'
);

-- =====================================================
-- 2. ARTICLES (수집 기사/뉴스) — 신규 항목만
-- =====================================================

-- Figure AI Nscale $3.5B compute deal
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Figure AI: Nscale과 $3.5B 컴퓨팅 계약, NVIDIA Vera Rubin GPU 100K대 배포',
  'Forbes / Unite.AI / eWeek / TechTimes / Securities.io',
  'https://www.forbes.com/sites/johnkoetsier/2026/09/04/how-figure-committed-35-billion-for-ai-compute-after-raising-only-19-billion/',
  '2026-09-03'::timestamp,
  'Figure AI-Nscale 전략 파트너십. $3.5B 초기, $6B+ 확대. Vera Rubin GPU 100K대. 2027 H2 텍사스 Barstow 배포. Helix AI 제어. Nscale 지분 투자.',
  'Figure AI가 2026년 9월 3일 AI 인프라 기업 Nscale과 전략적 파트너십을 발표했다. NVIDIA Vera Rubin 플랫폼 기반 최대 100,000개 GPU를 배포하며, 초기 컴퓨팅 계약 규모는 $3.5B이다. 양사는 $6B 이상으로 확대할 의향을 밝혔다. 배포는 2027년 하반기 텍사스 Barstow에서 시작된다. 이 컴퓨팅 자원은 Figure의 휴머노이드 로봇 제어 AI 시스템인 Helix의 향후 개발을 지원한다. 파트너십의 일환으로 Nscale은 Figure에 전략적 지분 투자도 진행하며, 양사는 Nscale의 공급망에 휴머노이드 로봇을 적용하는 방안도 탐색할 계획이다. Figure의 총 조달액 $1.9B 대비 $3.5B 규모의 컴퓨팅 투자는 AI 훈련 인프라에 대한 공격적 베팅으로 주목된다.',
  'ko', 'industry', 'robot',
  encode(sha256(('figure-nscale-3.5b-vera-rubin-2026-09-03')::bytea), 'hex'),
  '094a329b-3b0e-4f73-84a3-3500add9c2ef',
  '{"mentionedCompanies": ["Figure AI", "Nscale", "NVIDIA"], "mentionedRobots": ["Figure 03"], "technologies": ["NVIDIA Vera Rubin", "Helix AI system", "100K GPU cluster"], "marketInsights": ["$3.5B compute deal", "scalable to $6B+", "Nscale equity stake in Figure"], "keyPoints": ["$3.5B 컴퓨팅 계약", "Vera Rubin 100K GPU", "2027 H2 배포 시작"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('figure-nscale-3.5b-vera-rubin-2026-09-03')::bytea), 'hex'));

-- Unitree stock plunge 50%
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Unitree Robotics: IPO 후 주가 50% 급락, 고점 1,100위안 → 546위안 (2026.9.2)',
  'Bloomberg',
  'https://www.bloomberg.com/news/articles/2026-09-02/unitree-plunges-50-from-peak-in-fast-reversal-after-huge-debut-pop',
  '2026-09-02'::timestamp,
  'Unitree(688836.SH) 주가 상장 첫날 고점 1,100위안에서 9/2 546위안으로 50%+ 하락. 시총 $32.9B. IPO가 대비 260%+ 프리미엄 유지.',
  'Unitree Robotics(688836.SH) 주가가 상장 첫날(8/19) 장중 고점 1,100위안에서 9월 2일 546위안까지 50% 이상 급락했다고 Bloomberg가 보도했다. 첫날 460% 급등 후 급속 반전이 일어난 것이다. 시가총액은 약 $32.9B 수준이며, IPO 가격(150.8위안) 대비로는 여전히 260% 이상의 프리미엄을 유지하고 있다. 2025년 매출은 17.1억 위안(+335% YoY), 조정 순이익은 6억 위안(+674% YoY)으로 펀더멘탈은 견조하다. 중국 휴머노이드 로봇 시장의 과열 우려와 밸류에이션 부담이 하락 원인으로 분석된다.',
  'ko', 'industry', 'robot',
  encode(sha256(('unitree-stock-plunge-50pct-sept-2026')::bytea), 'hex'),
  '1bace82e-9fc0-45df-a9b3-e5c2ddd54a8d',
  '{"mentionedCompanies": ["Unitree Robotics"], "mentionedRobots": ["G1", "H2"], "technologies": [], "marketInsights": ["50%+ drop from peak", "still 260%+ above IPO price", "$32.9B market cap", "valuation concerns"], "keyPoints": ["주가 50%+ 하락", "고점 1,100→546위안", "IPO가 대비 260% 프리미엄 유지"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('unitree-stock-plunge-50pct-sept-2026')::bytea), 'hex'));

-- Agility Digit V5 demo + CTO interview
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Agility Robotics Digit V5: 케이지 밖 작업 데모, 12월 첫 출하, 20시간 연속 가동',
  'Forbes / TechEBlog / DIGITIMES',
  'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/',
  '2026-09-05'::timestamp,
  'Digit V5 방 재배치 데모(소파, 의자, 가방). 12월 첫 출하. 안전 펜싱 불필요. 20시간/일 가동. GXO 100K+ totes, 9개 시설.',
  'Agility Robotics가 2026년 9월 초 Digit V5의 방 재배치 데모 영상을 공개했다. 소파를 끌고, 의자와 가방을 이동시키는 등 다양한 크기·무게·그립의 물체를 범용으로 조작하는 능력을 시연했다. Digit V5는 12월 첫 고객 출하 예정이며, 안전 펜싱 없이 인간과 공존 작업이 가능한 "케이지 밖" 로봇이다. 20시간 연속 가동, 50lb 적재, 7.2ft 리치, 교체형 엔드이펙터를 지원한다. 현재 GXO에서 100,000건 이상의 totes를 처리했으며, 65,000시간 이상의 가동시간을 기록하고, 9개 고객 시설에 배치 중이다. DIGITIMES는 9월 5일 Agility CTO와의 인터뷰에서 협력형 휴머노이드의 미래를 논의했다.',
  'ko', 'product', 'robot',
  encode(sha256(('agility-digit-v5-cage-free-demo-dec-2026')::bytea), 'hex'),
  'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89',
  '{"mentionedCompanies": ["Agility Robotics", "GXO", "Schaeffler", "Toyota", "Mercado Libre"], "mentionedRobots": ["Digit V5"], "technologies": ["cage-free operation", "cooperative safety", "interchangeable end-effectors"], "marketInsights": ["December 2026 first shipment", "$300M+ committed orders", "9 customer sites", "100K+ totes processed"], "keyPoints": ["Digit V5 케이지 밖 데모", "12월 출하", "GXO 100K+ totes"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agility-digit-v5-cage-free-demo-dec-2026')::bytea), 'hex'));

-- AGIBOT WAIC 2026 + 8,400 units
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'AGIBOT: WAIC 2026 A3 Ultra 등 4종 공개, H1 2026 8,400대(글로벌 44%)',
  'Interesting Engineering / eWeek / PR Newswire / Robotics & Automation News',
  'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
  '2026-07-20'::timestamp,
  'WAIC 2026: A3 Ultra(174cm/51DOF/5kg), G2 Max, X2 Edu, OmniHand 3 Ultra-M 4종. H1 2026 8,400대(글로벌 44%). 독일 Minth Group 배치.',
  'AGIBOT이 WAIC 2026(상하이, 7월)에서 4종의 신제품을 동시 공개했다. A3 Ultra는 174cm 풀사이즈 휴머노이드로 51 DOF, 팔당 5kg 적재, 8시간 런타임을 갖추고 상용/서비스 태스크를 수행한다. G2 Max는 중량물 핸들링/팔레타이징용으로 힘제어 팔, 가변 작업 높이, 전방향 이동, 배터리 핫스왑을 지원한다. X2 Edu는 교육 플랫폼, OmniHand 3 Ultra-M은 차세대 로봇 핸드다. 2026년 상반기 출하량은 8,400대로 글로벌 시장의 44%를 점유하며 1위를 기록했다. 독일 Minth Group 자동차부품 생산 라인에 유럽 최초 배치도 진행 중이다.',
  'ko', 'product', 'robot',
  encode(sha256(('agibot-waic2026-a3ultra-8400units-44pct-2026-07')::bytea), 'hex'),
  'ad5937e3-0a41-4026-9270-aab409d3427d',
  '{"mentionedCompanies": ["AGIBOT", "Minth Group"], "mentionedRobots": ["A3 Ultra", "G2 Max", "X2 Edu", "OmniHand 3 Ultra-M"], "technologies": ["51 DOF", "force-controlled arms", "battery hot-swap", "omnidirectional mobility"], "marketInsights": ["8,400 units H1 2026", "44% global market share", "Europe deployment at Minth Germany"], "keyPoints": ["WAIC 2026 4종 공개", "H1 8,400대 글로벌 44%", "유럽 Minth 배치"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('agibot-waic2026-a3ultra-8400units-44pct-2026-07')::bytea), 'hex'));

-- Boston Dynamics Hyundai 25K Atlas commitment + union
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, company_id, extracted_metadata)
SELECT
  'Boston Dynamics: Hyundai 25,000대 Atlas 배치 계획, 노조 합의 없이 블로킹',
  'TechTimes / New Atlas / Engadget',
  'https://www.techtimes.com/articles/317005/20260522/hyundai-commits-25000-atlas-robots-own-factories-union-blocks-deployment-without-labor-deal.htm',
  '2026-05-22'::timestamp,
  'Hyundai 자체 공장 25,000대 Atlas 계획(2028). 노조가 노동합의 없이 배치 블로킹 선언. RMAC 파일럿 중. 외부 고객 2027년부터.',
  'Hyundai Motor Group이 자체 제조 시설에 최대 25,000대의 Boston Dynamics Atlas 로봇을 배치할 계획이라고 TechTimes가 5월 22일 보도했다. 2028년 목표다. 그러나 노동조합은 노동 합의(labor deal) 없이는 배치를 블로킹하겠다고 선언했다. 현재 Hyundai RMAC(로보틱스 메타플랜트 응용 센터)에서 파일럿이 진행 중이며, 2026년 전량 배치 물량은 Hyundai RMAC과 Google DeepMind에 확정되어 있다. 외부 고객 추가는 2027년부터 시작된다. Atlas의 주요 스펙: 리치 7.5ft, 적재 110lb, 작동 온도 -4~104°F.',
  'ko', 'industry', 'robot',
  encode(sha256(('bd-hyundai-25k-atlas-union-blocks-2026-05')::bytea), 'hex'),
  '7c7e540d-e4ec-4734-920b-875f20989c0a',
  '{"mentionedCompanies": ["Boston Dynamics", "Hyundai Motor Group", "Google DeepMind"], "mentionedRobots": ["Atlas"], "technologies": ["all-electric humanoid", "industrial deployment"], "marketInsights": ["25,000 unit commitment", "union blocks deployment", "external customers from 2027"], "keyPoints": ["25,000대 Atlas 계획", "노조 블로킹", "2027년 외부 고객 확대"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = encode(sha256(('bd-hyundai-25k-atlas-union-blocks-2026-05')::bytea), 'hex'));

-- =====================================================
-- 3. CI STAGING (변경 대기열) — 신규 항목만
-- =====================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "figure-03", "updates": [{"field": "compute_partnership", "new_value": "Nscale $3.5B 컴퓨팅 계약(→$6B+), NVIDIA Vera Rubin 100K GPU, 2027 H2 배포", "source": "Forbes 2026-09-04", "reliability": "A"}, {"field": "ai_infrastructure", "new_value": "Helix AI 시스템 개발용, Nscale 전략적 지분 투자 포함", "source": "Unite.AI, Securities.io", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Nscale%$3.5B%Vera Rubin%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "unitree-g1", "updates": [{"field": "stock_performance", "new_value": "IPO 후 50%+ 하락 (고점 1,100위안 → 546위안, 9/2 기준), 시총 $32.9B", "source": "Bloomberg 2026-09-02", "reliability": "A"}, {"field": "financials", "new_value": "2025 매출 17.1억위안(+335% YoY), 조정순이익 6억위안(+674% YoY)", "source": "Bloomberg, PitchBook", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%50%하락%1,100위안%546위안%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "digit", "updates": [{"field": "digit_v5_status", "new_value": "Digit V5 12월 첫 고객 출하, 케이지 밖 작업(안전 펜싱 불필요), 20시간 연속 가동", "source": "Forbes 2026-08-10, TechEBlog", "reliability": "B"}, {"field": "deployment_stats", "new_value": "GXO 100,000+ totes 처리, 65,000+ 가동시간, 9개 고객 시설", "source": "Agility Robotics official", "reliability": "A"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%Digit V5%12월%케이지 밖%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "agibot", "updates": [{"field": "waic_2026_products", "new_value": "WAIC 2026: A3 Ultra(174cm/51DOF/5kg), G2 Max, X2 Edu, OmniHand 3 Ultra-M 4종 공개", "source": "Interesting Engineering, PR Newswire 2026-07", "reliability": "A"}, {"field": "h1_2026_shipments", "new_value": "H1 2026 8,400대 출하, 글로벌 44% 시장점유율 1위", "source": "eWeek, Interesting Engineering", "reliability": "A"}, {"field": "europe_expansion", "new_value": "독일 Minth Group 자동차부품 라인 유럽 최초 배치", "source": "Interesting Engineering", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%WAIC 2026%A3 Ultra%8,400대%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update', '{"competitor_slug": "atlas-commercial", "updates": [{"field": "hyundai_commitment", "new_value": "Hyundai 자체 공장 25,000대 배치 계획(2028), 노조 노동합의 요구로 블로킹", "source": "TechTimes 2026-05-22", "reliability": "B"}]}'::jsonb, 'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%25,000대%노조%블로킹%' AND created_at::date = CURRENT_DATE);

-- =====================================================
-- 4. CI MONITOR ALERTS (모니터링 알림) — 신규 항목만
-- =====================================================

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, status, detected_at)
SELECT v.source_name, v.source_url, v.headline, v.summary, 'pending', NOW()
FROM (VALUES
  ('Forbes', 'https://www.forbes.com/sites/johnkoetsier/2026/09/04/how-figure-committed-35-billion-for-ai-compute-after-raising-only-19-billion/', 'Figure AI-Nscale $3.5B 컴퓨팅 계약 — Vera Rubin GPU 100K대', 'Helix AI용. $6B+ 확대 의향. 2027 H2 Barstow 배포. Nscale 지분 투자.'),
  ('Bloomberg', 'https://www.bloomberg.com/news/articles/2026-09-02/unitree-plunges-50-from-peak-in-fast-reversal-after-huge-debut-pop', 'Unitree 주가 IPO 고점 대비 50%+ 하락', '1,100위안→546위안. 시총 $32.9B. IPO가 대비 260%+ 프리미엄 유지.'),
  ('Forbes/TechEBlog/DIGITIMES', 'https://www.forbes.com/sites/johnkoetsier/2026/08/10/digit-v5-first-humanoid-robot-out-of-the-cage/', 'Agility Digit V5 케이지 밖 데모 + 12월 출하', 'V5 방 재배치 시연. 20hr 가동. GXO 100K+ totes. CTO 인터뷰 9/5.'),
  ('Interesting Engineering/eWeek', 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot', 'AGIBOT WAIC 2026 A3 Ultra 등 4종 + H1 8,400대(44%)', 'A3 Ultra 51DOF. G2 Max 중량물. H1 2026 8,400대 글로벌 44%. Minth 독일.'),
  ('TechTimes', 'https://www.techtimes.com/articles/317005/20260522/hyundai-commits-25000-atlas-robots-own-factories-union-blocks-deployment-without-labor-deal.htm', 'Hyundai 25,000대 Atlas 커밋 — 노조 블로킹', '2028 목표. 노동합의 필요. RMAC 파일럿 중. 외부 고객 2027년부터.')
) AS v(source_name, source_url, headline, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM ci_monitor_alerts m WHERE m.source_url = v.source_url
);

COMMIT;
