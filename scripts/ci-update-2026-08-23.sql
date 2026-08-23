-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-23
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요: psql $DATABASE_URL -f scripts/ci-update-2026-08-23.sql

BEGIN;

-- ============================================================
-- 1. ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. [Critical] Unitree IPO 첫날 629% 폭등 → $50B+ 시가총액, 휴머노이드 역사적 모멘텀
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Nikkei Asia / Bloomberg / SCMP / CNBC / Fortune',
   'https://asia.nikkei.com/business/markets/ipo/unitree-shares-soar-629-after-robot-maker-raises-905m-in-shanghai-ipo',
   '[Critical] Unitree 688836.SH 첫 거래일 629% 급등 → RMB 845 마감(+460%), 시총 ¥342B($50B+)',
   '8/19 STAR Market 상장 첫날: IPO가 ¥150.80 → 장중 ¥1,100(+629%) → 마감 ¥845(+460%). 시가총액 약 ¥342B($50B+). 소매 청약 8,000배 초과. 조달 ¥6.1B($904M). 중국 A주 최초 휴머노이드 상장. Forbes: "Unitree IPO가 Agility Robotics($2.5B SPAC)를 저렴해 보이게 만들어" — 글로벌 휴머노이드 밸류에이션 재정립 모멘텀. 8/22 기준 RMB 672 수준으로 조정 중이나 IPO 대비 여전히 345%+.',
   '2026-08-23'::timestamp, 'pending'),

-- 2. [Warning] Figure AI: 1,000번째 Figure 03 생산 달성 (7/23) — 시간당 1대 양산 확인
  (gen_random_uuid(), 'Humanoids Daily / Figure AI Blog / Wikipedia',
   'https://www.humanoidsdaily.com/news/a-golden-milestone-figure-manufactures-its-1-000th-figure-03-humanoid',
   '[Warning] Figure AI: 1,000번째 Figure 03 생산(7/23) — 골든 유닛 공개, 시간당 1대 양산 속도 확인',
   '7/23 Figure CEO Brett Adcock: 1,000번째 Figure 03 생산 발표. 골든 컬러 특별 유닛 공개. 2026.4월 "시간당 1대" 벤치마크 → 3개월 만에 1,000대 도달. BMW 스파르탄버그 40대 배치, 204,000+ 패키지 분류(163시간+), 라이프치히 유럽 확장 진행 중. 서구 휴머노이드 업체 중 최초 배치 양산 역량 입증. $39B 밸류에이션.',
   '2026-08-23'::timestamp, 'pending'),

-- 3. [Info] 제2회 World Humanoid Robot Games 베이징 개막 — 2,056대 로봇, 666팀, 16개국
  (gen_random_uuid(), 'RobotsBeat / CGTN / GreekReporter / aNews',
   'https://robotsbeat.com/world-humanoid-robot-games-beijing-2056-robots-2026/',
   '[Info] World Humanoid Robot Games 2026 베이징 개막(8/22-26): 2,056대 로봇, 666팀, 16개국',
   '8/22 베이징 국립스피드스케이팅관 개막. 51개 종목, 1,301개 경기. 9개 체육종목(육상·축구·체조·역도·무술·댄스·줄다리기) + 6개 시나리오 종목(공장·호텔·가정·응급·병원·리테일). 중국 641팀 1,975대(157개 기업·200개 기관 참가). 전년 대비 팀 138%·로봇 2배 증가. 훈련 중 로봇 벽 충돌 사고(8/21) 화제. Vbot ATOM 신제품 사전주문 개시(8/21).',
   '2026-08-23'::timestamp, 'pending'),

-- 4. [Info] Tesla Optimus: 8월 중순 기준 생산 미개시 — 프리몬트 라인 설치 지속, V3 공개 연기 반복
  (gen_random_uuid(), 'Electrek / IIoT World / Teslarati / RoboZaps',
   'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
   '[Info] Tesla Optimus: 8월 중순 기준 프리몬트 생산 미개시 — V3 공개 "올해 중" 재차 연기',
   '8/23 기준 상태 변화 미미: 프리몬트 전용 라인 설치 지속, 실제 생산 미개시. Q2 실적(8/5) Musk "생산 곧 시작" 언급했으나 구체 일정 미제시. Optimus V3 공개 시점 반복 연기("later this year"). 내부 1,000+ Gen 3 가동, 초기 생산분 Optimus Academy(내부 교육) 배정 예정. 외부 판매 2027 말 목표 $20K-$30K 유지. Giga Texas 2공장 2027 여름 착공 중.',
   '2026-08-23'::timestamp, 'pending'),

-- 5. [Info] Agility Robotics: SPAC S-4 제출 완료(7/14), AGLT 나스닥 상장 연내 추진 중
  (gen_random_uuid(), 'SEC / GeekWire / The Robot Report',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   '[Info] Agility Robotics: SEC S-4 기밀 제출(7/14) — AGLT 나스닥 연내 상장, Digit v5 12월 출시 유지',
   'SPAC 합병 S-4 기밀 제출 7/14 완료, 주주 투표·규제 승인 대기 중. Digit 현장 성과: GXO 100K+ 토트, Schaeffler·Toyota Canada·Mercado Libre 배치. Digit v5 50lb 페이로드, 20시간 운용, NVIDIA Halos 안전시스템 최초 적용 → 12월 상용 출시 계획 변경 없음. $300M+ 수주 유지.',
   '2026-08-23'::timestamp, 'pending'),

-- 6. [Info] Apptronik: Apollo 2 Robot Park 데이터 수집 가속 — Jabil 글로벌 제조 파트너
  (gen_random_uuid(), 'IEN / Automate.org / CNBC',
   'https://www.ien.com/product-development/article/22933262/apptronik-raises-350-million-to-scale-humanoid-robot-production',
   '[Info] Apptronik Apollo 2: Jabil 글로벌 제조 파트너 확인 + Robot Park 네트워크 확장 중',
   'Jabil 확인: Apollo 고객이자 글로벌 제조 파트너(현장 테스트 + 양산 담당). Robot Park 다수 거점에서 Apollo 2 플릿 실환경 데이터 수집 → Google DeepMind Gemini Robotics 2 파운데이션 모델 학습. Apollo 3 "첫 성숙 상용 제품" 2027 출시 확정. 총 조달 ~$1B, $5B 밸류에이션. Mercedes-Benz·GXO·Jabil 배치 지속.',
   '2026-08-23'::timestamp, 'pending'),

-- 7. [Info] 1X NEO: 풀 프로덕션 지속, 고객 인도 "올해 중" — 실제 배송 증거 여전히 미확인
  (gen_random_uuid(), 'TNW / Forbes / Warmcore Tech',
   'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
   '[Info] 1X NEO: 생산 지속 + "미국 가정 출하 시작" 보도 — 실배송 검증은 미완료',
   'TNW "1X starts shipping NEO to US homes" 보도 존재하나, 구체적 인도 건수·고객 사례 미확인. Hayward 공장 풀 프로덕션 가동 중(58K sqft, 연 10K 용량). $20K EA 구매자 우선 배송 2026 약속. $499/월 렌탈 구독자는 후순위. 10K 프리오더 상태 변화 없음. EQT 10K대 B2B 계약 유지. 2027년 100K 용량 목표.',
   '2026-08-23'::timestamp, 'pending'),

-- 8. [Info] Agibot: HKEX IPO 프로세스 진행 중 — 39% 글로벌 시장점유율 주장 + A3 Ultra Q4
  (gen_random_uuid(), 'Gasgoo / gagadget / SCMP / Omdia',
   'https://gagadget.com/en/719322-agibot-unveils-15000-robots-and-revolutionary-a3-ultra-humanoid-with-nvidia-thor-at-waic-2026/',
   '[Info] Agibot: HKEX IPO 진행 + Omdia 기준 2025 글로벌 휴머노이드 시장 39% 점유 주장',
   'HKEX IPO 프로세스 진행 중(Q3 상장 목표, CICC·CITIC·Morgan Stanley). Omdia 기준 2025 글로벌 휴머노이드 시장 39% 점유 주장. 2025 출하 5,100+ 대. 매출: 첫해 30만위안 → 2년차 6,000만 → 2025년 10억위안 돌파. A3 Ultra(NVIDIA Thor, 51DOF) Q4 출시 예정. Unitree IPO 성공으로 중국 로보틱스 상장 모멘텀 가속.',
   '2026-08-23'::timestamp, 'pending');


-- ============================================================
-- 2. ARTICLES 삽입 (content_hash 기반 중복 방지)
-- ============================================================

-- [Unitree] IPO 첫날 629% 급등 — 시가총액 $50B+
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Unitree IPO Surges 629% on Day One: $50B+ Market Cap, First Humanoid A-Share Listing',
  'Nikkei Asia / Bloomberg / SCMP / CNBC / Fortune / Forbes',
  'https://asia.nikkei.com/business/markets/ipo/unitree-shares-soar-629-after-robot-maker-raises-905m-in-shanghai-ipo',
  '2026-08-19'::timestamp,
  'Unitree Robotics (688836.SH) debuted on Shanghai STAR Market August 19, surging 629% intraday to RMB 1,100 before closing at RMB 845 (+460% from IPO price of RMB 150.80). Market cap reached approximately RMB 342B (~$50B). Retail subscription oversubscribed 8,000x. Total raised RMB 6.1B ($904M). First humanoid robotics stock on mainland China A-shares. By August 22, stock adjusted to ~RMB 672 but remains 345%+ above IPO price. Forbes notes Unitree valuation makes Agility Robotics $2.5B SPAC look "super cheap" — signaling global humanoid valuation reset.',
  'Unitree Robotics Shanghai STAR Market IPO results August 19, 2026: Stock opened at RMB 1,100, a 629% surge from the IPO price of RMB 150.80, before closing at RMB 845, representing a 460% gain on day one. Market capitalization reached approximately RMB 342 billion (roughly $50 billion), making Unitree one of the most valuable robotics companies globally. Retail demand exceeded available allocation by more than 8,000 times. Total IPO proceeds: RMB 6.1 billion ($904 million). This makes Unitree the first humanoid robotics stock listed on China mainland A-share market. By August 22, stock adjusted to approximately RMB 672 level, still 345%+ above IPO price. Context and implications: Forbes analysis — Unitree IPO "makes Agility Robotics look super cheap" at $2.5B SPAC valuation. SCMP — surge to $66B intraday valuation far ahead of US competitors. Fortune — "famous for dancing robots" company lifted far ahead of Western peers. Sector impact: Chinese robotics sector momentum accelerates — Agibot HKEX IPO, X Square Robot confidential HK filing. Company fundamentals: 2025 revenue RMB 1.69B, 5,500+ humanoids shipped, profitable. Products: G1 ($13,500, backorder), H2 ($29,900), quadrupeds 33,000+ cumulative.',
  'en', 'business', 'robot',
  md5('unitree-ipo-629-surge-50b-2026-08-23'),
  '{"mentionedCompanies":["Unitree","Agility Robotics","Agibot","X Square Robot"],"mentionedRobots":["G1","H2","B2"],"technologies":[],"marketInsights":["629% IPO day one surge","$50B+ market cap","8,000x retail oversubscription","global humanoid valuation reset","first A-share humanoid listing"],"keyPoints":["RMB 845 close (+460%)","$904M raised","Agility $2.5B looks cheap by comparison"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('unitree-ipo-629-surge-50b-2026-08-23'));

-- [Figure AI] 1,000번째 Figure 03 생산 마일스톤
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Figure AI Manufactures 1,000th Figure 03 Humanoid Robot — Golden Unit Milestone',
  'Humanoids Daily / Figure AI / Time',
  'https://www.humanoidsdaily.com/news/a-golden-milestone-figure-manufactures-its-1-000th-figure-03-humanoid',
  '2026-07-23'::timestamp,
  'Figure AI CEO Brett Adcock announced production of the 1,000th Figure 03 on July 23, 2026. A golden-colored special unit was unveiled to mark the milestone. Production rate confirmed at approximately 1 robot per hour (benchmark set in April 2026), reaching 1,000 units in approximately 3 months. 40 units deployed at BMW Spartanburg for logistics (204,000+ packages sorted). First Western humanoid company to demonstrate legitimate batch manufacturing capability. Figure AI valued at $39B with $2.34B total raised.',
  'Figure AI 1,000th Figure 03 production milestone July 23, 2026: CEO Brett Adcock announced on X and LinkedIn with photo showing workforce gathered outside facilities, with a distinctive golden-colored Figure 03 unit at center — departing from standard charcoal-grey and white finish. Production rate: approximately 1 robot per hour, benchmark reported in late April 2026. Reached 1,000 units in approximately 3 months of production. BMW Spartanburg deployment: 40 Figure 03 units for logistics task (unsorted components to sequencing trolleys). Previous Figure 02 pilot: 204,000+ packages sorted in 163+ hours, >99% placement accuracy, 84-second cycle times, contributed to 30,000+ BMW X3 production. Leipzig European expansion: summer 2026. Corporate: $39B valuation, $2.34B total raised. Helix in-house AI model. Significance: cementing status as one of few Western companies capable of moving beyond prototyping into legitimate batch manufacturing.',
  'en', 'product', 'robot',
  md5('figure-1000th-figure03-golden-2026-08-23'),
  '{"mentionedCompanies":["Figure AI","BMW"],"mentionedRobots":["Figure 03","Figure 02"],"technologies":["Helix"],"marketInsights":["1,000 units manufactured","1 robot/hour production rate","batch manufacturing capability proven","$39B valuation"],"keyPoints":["1,000th Figure 03 milestone Jul 23","golden unit unveiled","3 months to reach 1,000"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('figure-1000th-figure03-golden-2026-08-23'));

-- [Industry] World Humanoid Robot Games 2026 베이징
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'World Humanoid Robot Games 2026: 2,056 Robots from 16 Countries Compete in Beijing',
  'RobotsBeat / CGTN / GreekReporter / aNews / Seeed Forum',
  'https://robotsbeat.com/world-humanoid-robot-games-beijing-2056-robots-2026/',
  '2026-08-22'::timestamp,
  'Second World Humanoid Robot Games opened August 22, 2026 at Beijing National Speed Skating Oval, running through August 26. 666 teams with 2,056 robots from 16 countries across 6 continents. 51 events in 1,301 competitions: 9 athletic disciplines (athletics, football, gymnastics, weightlifting, martial arts, dances, tug of war) + 6 scenario-based events (factory, hotel, home, emergency, hospital, retail). China dominant with 641 teams (1,975 robots, 157 companies, 200 research institutions). Scale quadrupled from inaugural 2025 event. Training incident (robot wall crash) went viral August 21.',
  'World Humanoid Robot Games 2026 Beijing overview: Second annual competition opened August 22 at National Speed Skating Oval (Ice Ribbon), running through August 26. Participation: 666 teams, 2,056 robots, 16 countries, 6 continents — teams grew 138% from 2025, robot count doubled. Competitive category: 26 events across 9 disciplines — athletics, football, gymnastics, weightlifting, martial arts, street dance, sport dance, tug of war, and pitch-pot. Scenario-based category: 6 events in real-world environments — factories, hotels, homes, emergency response, hospitals, retail. Chinese dominance: 641 domestic teams (96%), 1,975 domestic robots, representing 157 companies and 200 research institutions/universities. Notable incidents: bipedal humanoid crashed into padded wall during training (August 21), went viral globally. New product: Vbot ATOM humanoid for home use opened pre-orders August 21 at concurrent WRC 2026. Industry significance: largest humanoid robotics competition globally, showcasing rapid sector growth particularly in China.',
  'en', 'industry', 'robot',
  md5('world-humanoid-robot-games-beijing-2026-08-23'),
  '{"mentionedCompanies":["Vbot"],"mentionedRobots":["ATOM"],"technologies":[],"marketInsights":["2,056 robots competing","666 teams from 16 countries","China 96% of teams","quadrupled from 2025"],"keyPoints":["Beijing Aug 22-26","51 events 1,301 competitions","China 641 teams dominant"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('world-humanoid-robot-games-beijing-2026-08-23'));

-- [Tesla] Optimus 생산 미개시 지속
INSERT INTO articles (title, source, url, published_at, summary, content, language, category, product_type, content_hash, extracted_metadata, collected_at)
SELECT
  'Tesla Optimus: Mid-August Status — Fremont Line Installation Ongoing, Production Not Yet Started',
  'Electrek / IIoT World / Teslarati / Tesery',
  'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
  '2026-08-23'::timestamp,
  'As of mid-August 2026, Tesla Optimus production has NOT started at Fremont despite Q1 target of "late July or August." Q2 earnings call (August 5) — Musk said production starting "soon" without specific date. Optimus V3 reveal pushed to "later this year" again. Fremont line installation ongoing (ex-Model S/X, torn down in 46 days). Initial production units destined for Optimus Academy internal training. 1,000+ Gen 3 deployed internally. Consumer sale target remains end of 2027 at $20K-$30K. Giga Texas second factory under construction for summer 2027 start (10M/year design).',
  'Tesla Optimus production status mid-August 2026: No production has started at Fremont as of approximately August 15-20. Timeline: Q1 2026 earnings call targeted "late July or August" for production start. Q2 earnings call (August 5, 2026): Musk said production starting "soon" but provided no specific date. Optimus V3 public reveal has been repeatedly delayed — now "later this year." Fremont conversion: Model S/X assembly line torn down in 46 days, converted to dedicated humanoid robot production. Line installation continues but not yet production-ready. Initial production strategy: first units go to "Optimus Academy" — internal training program where robots learn simple factory skills before productive deployment. No external sales planned for initial batches. Internal deployment: 1,000+ Optimus Gen 3 units performing battery handling, component sorting, and cable work across Tesla facilities. Production complexity: 10,000 unique parts, no established humanoid supply chain. Musk warns ramp will be "quite flat and long" and initial output "extremely slow." Consumer pricing target: $20,000-$30,000, end of 2027. Giga Texas: second Optimus factory construction underway, summer 2027 production target, 10 million/year long-term design capacity. 2026 capex exceeds $20 billion.',
  'en', 'industry', 'robot',
  md5('tesla-optimus-no-production-mid-aug-2026-08-23'),
  '{"mentionedCompanies":["Tesla","TSMC","Samsung","Micron"],"mentionedRobots":["Optimus","Optimus Gen 3","Optimus V3"],"technologies":[],"marketInsights":["production not yet started mid-August","V3 reveal delayed again","Optimus Academy internal training","consumer sale 2027"],"keyPoints":["Fremont line installation ongoing","no production as of mid-Aug","Q2 call: starting soon no date"]}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE content_hash = md5('tesla-optimus-no-production-mid-aug-2026-08-23'));


-- ============================================================
-- 3. COMPETITIVE ALERTS 삽입 (War Room용)
-- ============================================================

-- Alert 1: Unitree IPO 역사적 첫날 거래 결과
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%G1%' AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%Unitree%') LIMIT 1),
  'funding', 'critical',
  '[Unitree] IPO 첫날 629% 폭등 → 시총 $50B+ — 글로벌 휴머노이드 밸류에이션 재정립',
  '8/19 STAR Market 상장: ¥150.80 → ¥1,100(+629%) → 마감 ¥845(+460%). 시총 ¥342B($50B+). 소매 8,000배 초과청약. $904M 조달. Forbes: Agility $2.5B이 저렴해 보여. 8/22 RMB 672로 조정 중. 중국 로보틱스 상장 러시 촉발.',
  '{"source":"Nikkei/Bloomberg/SCMP/CNBC/Fortune","confidence":"A","date":"2026-08-23","ticker":"688836.SH","ipoPrice":"¥150.80","intradayHigh":"¥1,100 (+629%)","closingPrice":"¥845 (+460%)","marketCap":"¥342B (~$50B)","retailOversubscription":"8,000x","raised":"$904M","aug22Price":"~¥672","sectorImpact":"global humanoid valuation reset"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%IPO 첫날 629% 폭등%');

-- Alert 2: Figure AI 1,000대 양산 마일스톤
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  (SELECT id FROM humanoid_robots WHERE name ILIKE '%Figure%' LIMIT 1),
  'mass_production', 'warning',
  '[Figure AI] Figure 03 1,000대 생산 달성(7/23) — 서구 최초 배치 양산 입증',
  '7/23 CEO 발표: 1,000번째 Figure 03 생산. 골든 유닛 공개. 시간당 1대 속도로 3개월 달성. BMW 40대 배치, 204K+ 패키지 분류. 서구 휴머노이드 업체 중 최초 대량생산 역량 입증. $39B 밸류에이션.',
  '{"source":"Humanoids Daily/Figure AI","confidence":"A","date":"2026-08-23","milestone":"1,000th Figure 03","productionRate":"1 robot/hour","monthsToReach":"~3","bmwDeployment":"40 units Spartanburg","packagesSorted":"204,000+","valuation":"$39B","significance":"first Western batch manufacturing"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%Figure 03 1,000대 생산 달성%');

-- Alert 3: World Humanoid Robot Games — 중국 로보틱스 생태계 규모 과시
INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
SELECT
  NULL,
  'partnership', 'info',
  '[Industry] World Humanoid Robot Games 2026 베이징: 2,056대·666팀·16개국 — 중국 96% 점유',
  '8/22 개막. 51개 종목(체육 9 + 시나리오 6). 중국 641팀(96%), 157개 기업·200개 기관 참가. 전년 대비 팀 138%·로봇 2배. 중국 로보틱스 생태계 규모·다양성 과시 행사.',
  '{"source":"RobotsBeat/CGTN/GreekReporter","confidence":"A","date":"2026-08-23","event":"World Humanoid Robot Games 2026","location":"Beijing","dates":"Aug 22-26","robots":2056,"teams":666,"countries":16,"chinaShare":"96%","chinaCompanies":157,"growthFromLastYear":"138% teams, 2x robots"}'::jsonb,
  false
WHERE NOT EXISTS (SELECT 1 FROM competitive_alerts WHERE title ILIKE '%World Humanoid Robot Games 2026 베이징%');

COMMIT;
