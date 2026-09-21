-- ARGOS 경쟁사 데이터 업데이트 - 2026-09-21
-- 자동 수집 데이터 (웹 검색 기반)
-- 수집 시간: 2026-09-21T00:00:00Z (Scheduled Routine)
-- 수집 범위: Tesla, Boston Dynamics, Figure AI, Unitree, Agility, Apptronik, 1X, Agibot
-- 이전 업데이트: 2026-09-20
-- DB 접속 불가 시 수동 실행: psql $DATABASE_URL -f scripts/ci-update-2026-09-21.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Warning] Unitree 주가 IPO 피크 대비 -53% 급락 — 중국 휴머노이드 버블 우려 확산
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Bloomberg / SCMP / Nikkei Asia / The Robot Report',
   'https://www.therobotreport.com/unitree-shares-down-53-from-ipo-debut/',
   '[Warning] Unitree 주가 IPO 피크 대비 -53% 급락 — 시총 $30B+ 증발, 중국 휴머노이드 버블 우려',
   '8/19 STAR Market 상장 후 장중 최고가 ¥1,100(시총 ¥445B≈$66B)에서 9월 중순 ¥516~615 수준으로 -53% 하락. 시총 약 ¥248B($37B). IPO 발행가 ¥150.80 대비는 여전히 3배 이상이나, 피크 대비 $30B+ 증발. Bloomberg·SCMP·Nikkei가 "중국 휴머노이드 로봇 버블" 우려 보도. 소매 투자자 손실 확대, 밸류에이션 정당성 논란. 단, 기술 펀더멘탈(UnifoLM, 18K대+ 출하, 흑자전환)은 유효.',
   '2026-09-21'::timestamp, 'pending'),

-- 2. [Info] 글로벌 휴머노이드 시장 리포트 — $5.41B(2026) → $50.27B(2035), CAGR 28.1%
  (gen_random_uuid(), 'MarketsandMarkets / GlobeNewsWire / Research and Markets',
   'https://www.globenewswire.com/news-release/2026/09/15/3361805/28124/en/global-humanoid-robots-market-poised-for-expansion-through-2036-as-ai-advances-unlock-opportunities-across-manufacturing-healthcare-and-services.html',
   '[Info] 글로벌 휴머노이드 로봇 시장 $5.41B(2026) → $50.27B(2035) — CAGR 28.1%, Wave 1: 산업용 $80K-$250K',
   '9/15~17 연속 발간된 시장 리포트 종합. MarketsandMarkets: $5.41B(2026)→$50.27B(2035), CAGR 28.1%. 3단계 발전: Wave 1(2025-2030) 산업용($80K-$250K), Wave 2(2027-2033) 소비자·교육($5K-$25K), Wave 3(2030+) 범용. H1 2026 글로벌 출하 ~19,000-22,000대(YoY +272%), 중국 93-97% 점유. General Purpose Humanoid Robotics 리포트(9/17)에서 27개 주요 업체 프로파일링.',
   '2026-09-21'::timestamp, 'pending'),

-- 3. [Info] Agility Digit 5 — 협력안전(Cooperatively Safe) 상세 아키텍처, $8,500/월 RaaS
  (gen_random_uuid(), 'Unite.AI / Bloomberg / The AI Insider',
   'https://www.unite.ai/agility-robotics-debuts-digit-5-humanoid-with-new-safety-architecture/',
   '[Info] Agility Digit 5 협력안전 아키텍처 상세 — 독립 안전컨트롤러, $8,500/월 RaaS 또는 $200K 구매',
   '9/15 공개 Digit 5의 추가 상세 사양 확인. 독립 안전 컨트롤러가 자율적으로 충돌 회피·정지·착석 수행. AI 알고리즘+다중 센서 연속 인체 감지. 시각·청각 안전 큐 제공. NVIDIA IGX Thor + Halos Core 최초 통합. 가격: RaaS $8,500/월 또는 구매 ~$200,000. ISO 표준 마운트 교환식 엔드이펙터. 2027년 EU·UK 최초 해외 배치. 미국 최초 순수 휴머노이드 상장사(AGLT) 임박.',
   '2026-09-21'::timestamp, 'pending'),

-- 4. [Info] UBTech UWORLD U1 — 가정용 동반자 로봇 소비자 배송 개시, 13,000대+ 사전주문
  (gen_random_uuid(), 'UBTech / Humanoid.press',
   'https://www.humanoid.press/',
   '[Info] UBTech UWORLD U1 가정용 동반자 로봇 — 9월 중순 소비자 배송 개시, 13,000대+ 사전주문',
   '9월 중순 UBTech UWORLD U1 시리즈 첫 소비자 배송 개시. 13,000대+ 사전주문. 가정용 동반(companion) 로봇으로 중노동이 아닌 일상 보조 타겟. 산업용 중심 시장에서 소비자 시장 전환 신호. 휴머노이드 로봇의 B2C 채널 최초 대규모 배송 사례 중 하나.',
   '2026-09-21'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] 주가 IPO 피크 대비 -53% 급락
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree Stock Plunges 53% From IPO Peak: China Humanoid Robot Bubble Fears Mount',
  'Bloomberg / SCMP / Nikkei Asia / The Robot Report',
  'https://www.therobotreport.com/unitree-shares-down-53-from-ipo-debut/',
  '2026-09-19'::timestamp,
  'Unitree Robotics shares plunged 53% from their IPO debut peak of ¥1,100 to ~¥516, erasing over $30B in market cap. Bloomberg, SCMP, Nikkei report growing fears of a China humanoid robot bubble. Stock remains 3x above IPO price of ¥150.80.',
  'Unitree Robotics (688836.SH), the first publicly traded humanoid robot company on China''s STAR Market, has seen its shares plunge 53% from their debut day peak. The stock hit ¥1,100 intraday on its August 19, 2026 IPO debut day (a 629% surge from the ¥150.80 issue price, 8,000x oversubscribed). By mid-September, shares had fallen to a low of ¥516, before recovering slightly to ~¥615 (market cap ¥248.8B or ~$37B). The peak-to-trough decline erased over $30 billion in market capitalization. Multiple major financial outlets — Bloomberg, South China Morning Post, Nikkei Asia — have published pieces questioning whether China''s humanoid robot sector is experiencing a valuation bubble. Key concerns: (1) Unitree''s pre-IPO target valuation was ¥42B (~$6.2B) vs the ¥445B ($66B) peak, suggesting extreme retail speculation; (2) Sector-wide P/S ratios remain highly stretched; (3) Commercial revenue generation is still early (Unitree turned profitable but revenue scale is limited). Counterarguments: Unitree remains profitable, has shipped 18,000+ units, UnifoLM foundation model is technically advanced, and production target of 20,000 units/year is on track. The stock correction is the most significant market event in the humanoid robotics sector since the IPO wave began.',
  'en', 'industry', 'robot',
  md5('unitree-stock-53pct-drop-ipo-peak-bubble-fears-2026-09-21'),
  '{"mentionedCompanies":["Unitree"],"mentionedRobots":["G1","G1+","H2"],"technologies":[],"marketInsights":["-53% from IPO peak","$30B+ market cap erased","Bubble fears mounting","Still 3x above IPO price"],"keyPoints":["Peak ¥1,100 to low ¥516","¥248.8B market cap at ¥615","Pre-IPO target was ¥42B","Profitable but revenue early"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-stock-53pct-drop-ipo-peak-bubble-fears-2026-09-21'));

-- [Market] Global humanoid robot market report $5.41B → $50.27B
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Global Humanoid Robots Market: $5.41B (2026) to $50.27B (2035), CAGR 28.1% — Three Waves of Deployment',
  'MarketsandMarkets / GlobeNewsWire / Research and Markets',
  'https://www.globenewswire.com/news-release/2026/09/15/3361805/28124/en/global-humanoid-robots-market-poised-for-expansion-through-2036-as-ai-advances-unlock-opportunities-across-manufacturing-healthcare-and-services.html',
  '2026-09-15'::timestamp,
  'MarketsandMarkets projects the global humanoid robots market at $5.41B in 2026, reaching $50.27B by 2035 (CAGR 28.1%). Three deployment waves: Wave 1 (2025-2030) industrial at $80K-$250K, Wave 2 (2027-2033) consumer/education at $5K-$25K, Wave 3 (2030+) general purpose. H1 2026 global shipments surged 272% YoY to 19,000-22,000 units, Chinese makers hold 93-97% share.',
  'A series of market research reports published September 15-17, 2026 paint a comprehensive picture of the global humanoid robot market trajectory. MarketsandMarkets estimates the 2026 market at USD 5.41 billion, projecting growth to USD 50.27 billion by 2035 at a CAGR of 28.1%. The market is developing through three waves: Wave 1 (2025-2030) covers industrial applications in automotive manufacturing, logistics, and warehousing at price points of $80,000-$250,000; Wave 2 (2027-2033) targets consumer, developer, and education markets at $5,000-$25,000; Wave 3 (2030+) envisions general-purpose deployment. A separate GlobeNewsWire report (Sep 17) on the General Purpose Humanoid Robotics Market profiles 27 key players including Tesla, Unitree, Figure AI, Boston Dynamics, and Apptronik. Global H1 2026 humanoid shipments surged approximately 272% year-over-year to 19,000-22,000 units. Chinese manufacturers hold 93-97% market share by volume. Industrial/commercial applications now account for over 70% of volume. Cumulative industry funding surpassed $9.8 billion in 2025. The shift from early-stage prototyping toward structured commercial deployment is accelerating, driven by embodied AI advances and persistent labor shortages.',
  'en', 'industry', 'robot',
  md5('humanoid-market-5.41b-50.27b-cagr-28.1-three-waves-2026-09-21'),
  '{"mentionedCompanies":["Tesla","Unitree","Figure AI","Boston Dynamics","Apptronik"],"mentionedRobots":[],"technologies":["embodied AI"],"marketInsights":["$5.41B 2026 → $50.27B 2035","CAGR 28.1%","H1 2026: 19K-22K units +272% YoY","Chinese 93-97% share","$9.8B+ cumulative funding"],"keyPoints":["Three deployment waves","27 key players profiled","Industrial 70%+ of volume","Wave 2 consumer $5K-$25K from 2027"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('humanoid-market-5.41b-50.27b-cagr-28.1-three-waves-2026-09-21'));

-- [Agility] Digit 5 cooperatively safe architecture details
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Agility Digit 5 Cooperatively Safe Architecture: Independent Safety Controller, $8,500/mo RaaS Pricing',
  'Unite.AI / Bloomberg / The AI Insider / Claims Journal',
  'https://www.unite.ai/agility-robotics-debuts-digit-5-humanoid-with-new-safety-architecture/',
  '2026-09-15'::timestamp,
  'Detailed architecture of Digit 5 cooperatively safe design: independent safety controller for autonomous collision avoidance, AI + multi-sensor continuous human detection, visual/audible safety cues, seated safety position. Pricing: $8,500/mo RaaS or ~$200,000 purchase. NVIDIA IGX Thor + Halos Core. EU/UK expansion 2027. First humanoid designed for cage-free coexistence at scale.',
  'Following the September 15, 2026 unveiling, additional technical details have emerged about Agility Robotics'' Digit 5 safety architecture. The robot features a proprietary independent safety controller that operates autonomously from the main compute stack, continuously monitoring the workspace and executing collision avoidance, emergency stops, or transitioning to a seated position when humans are detected too close. The system combines AI algorithms with multiple sensor modalities for continuous human detection, supplemented by visual LED indicators and audible signals that warn nearby workers before the robot moves. This represents the first humanoid robot designed from the ground up for cooperatively safe operation — working alongside humans without physical safety barriers (cages, fences). Technical partnerships: NVIDIA IGX Thor for main compute, NVIDIA Halos Core for safety-certified processing, and swappable end-effectors with ISO-standard mounts. Commercial terms: Robots-as-a-Service at $8,500/month or upfront purchase at approximately $200,000. Geographic expansion: EU and UK markets targeted for 2027, marking Agility''s first deployments outside North America. This cooperatively safe design is critical for the humanoid industry''s transition from caged pilot deployments to open-floor production environments. The $300M+ multi-year order book and upcoming SPAC listing (AGLT on Nasdaq, Q4 2026) position Agility as the first publicly traded US company dedicated solely to humanoid robots.',
  'en', 'technology', 'robot',
  md5('agility-digit-5-safety-architecture-raas-8500-2026-09-21'),
  '{"mentionedCompanies":["Agility Robotics","NVIDIA"],"mentionedRobots":["Digit 5"],"technologies":["cooperatively safe","independent safety controller","IGX Thor","Halos Core","ISO mount end-effectors"],"marketInsights":["$8,500/mo RaaS","$200K purchase","$300M+ orders","EU/UK 2027 expansion"],"keyPoints":["First cage-free humanoid at scale","Autonomous collision avoidance","Seated safety position","AGLT Nasdaq Q4 2026"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('agility-digit-5-safety-architecture-raas-8500-2026-09-21'));


-- ============================================================
-- 3. competitive_alerts: 경쟁 인텔리전스 요약 알림
-- ============================================================

-- Unitree 주가 급락
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'funding', 'warning',
   'Unitree 주가 IPO 피크 대비 -53% — 시총 $30B+ 증발, 중국 휴머노이드 버블 우려',
   '8/19 상장 후 ¥1,100 피크에서 9월 ¥516~615으로 -53% 하락. 시총 ¥248B($37B). Bloomberg·SCMP·Nikkei 버블 보도. IPO 대비 3배+ 유지. 펀더멘탈(18K출하, 흑자) 유효.',
   '{"company":"Unitree","event":"stock_correction","peak":"¥1,100","low":"¥516","decline":"-53%","market_cap":"$37B","ipo_price":"¥150.80","bubble_concerns":true,"confidence":"A"}'::jsonb,
   false, '2026-09-21'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Unitree%IPO 피크%53%');

-- 글로벌 시장 리포트
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'partnership', 'info',
   '글로벌 휴머노이드 시장 $5.41B(2026) → $50.27B(2035) — H1 출하 272% 성장',
   'MarketsandMarkets: $5.41B→$50.27B(CAGR 28.1%). H1 19K-22K대(+272% YoY). 중국 93-97% 점유. 산업용 70%+. Wave 2(소비자) 2027~.',
   '{"event":"market_report","market_size_2026":"$5.41B","market_size_2035":"$50.27B","cagr":"28.1%","h1_shipments":"19K-22K","yoy_growth":"272%","china_share":"93-97%","confidence":"A"}'::jsonb,
   false, '2026-09-21'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%$5.41B%$50.27B%');

-- Agility Digit 5 가격 상세
INSERT INTO competitive_alerts (id, type, severity, title, summary, trigger_data, is_read, created_at)
SELECT gen_random_uuid(), 'mass_production', 'info',
   'Agility Digit 5 RaaS $8,500/월 또는 $200K 구매 — 협력안전 아키텍처 업계 최초',
   '독립 안전컨트롤러, AI 인체 감지, 착석 안전포즈. RaaS $8,500/월 or $200K. NVIDIA Halos 최초 통합. EU·UK 2027.',
   '{"company":"Agility Robotics","robot":"Digit 5","raas_price":"$8,500/mo","purchase_price":"$200K","safety":"cooperatively safe","nvidia_halos":true,"eu_uk_2027":true,"confidence":"A"}'::jsonb,
   false, '2026-09-21'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%RaaS%$8,500%$200K%');


-- ============================================================
-- 4. ci_staging: 스테이징 (검증 대기)
-- ============================================================

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "unitree-g1", "updates": [{"field": "stock_performance", "new_value": "IPO 피크 ¥1,100 대비 -53% 하락(¥516~615), 시총 ¥248B($37B). Bloomberg·SCMP·Nikkei 버블 우려 보도", "source": "Bloomberg / SCMP / Nikkei / The Robot Report", "reliability": "A"}, {"field": "market_cap_context", "new_value": "IPO 발행가 ¥150.80 대비 3배+ 유지. 피크 시총 ¥445B($66B)→현재 ¥248B($37B), $30B+ 증발", "source": "Bloomberg 2026-09-02, SCMP", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%53%하락%¥516%Bloomberg%버블%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"competitor_slug": "digit", "updates": [{"field": "digit_5_pricing", "new_value": "RaaS $8,500/월 또는 구매 ~$200,000. 독립 안전컨트롤러, AI 인체 감지, 착석 안전포즈", "source": "Unite.AI / Bloomberg 2026-09-15", "reliability": "A"}, {"field": "eu_uk_expansion", "new_value": "2027년 EU·UK 최초 해외 배치 — 미국 외 첫 상용화", "source": "Bloomberg 2026-09-15", "reliability": "A"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%RaaS%$8,500%$200,000%EU%UK%' AND created_at::date = CURRENT_DATE);

INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
SELECT 'value_update',
  '{"market_update": true, "updates": [{"field": "global_market_2026", "new_value": "글로벌 휴머노이드 시장 $5.41B(2026)→$50.27B(2035), CAGR 28.1%", "source": "MarketsandMarkets / GlobeNewsWire 2026-09-15", "reliability": "A"}, {"field": "h1_2026_shipments", "new_value": "H1 2026 글로벌 출하 19,000-22,000대(YoY +272%), 중국 93-97% 점유, 산업용 70%+", "source": "Multiple market reports", "reliability": "B"}]}'::jsonb,
  'auto', 'pending', NOW()
WHERE NOT EXISTS (SELECT 1 FROM ci_staging WHERE payload::text LIKE '%$5.41B%$50.27B%28.1%' AND created_at::date = CURRENT_DATE);

COMMIT;
