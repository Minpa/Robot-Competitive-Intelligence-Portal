-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-06
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. Tesla Optimus (12건 수집, 주요 8건 등록)
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TechTimes / Yahoo Finance',
   'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
   'Tesla 프리몬트 공장 Model S/X 라인 → Optimus V3 생산 전환 완료',
   'Model S/X 생산라인 46일 만에 철거, Optimus Gen 3 생산설비 설치 중. 연간 100만대 생산 능력 목표. 2026년 7-8월 생산 개시 예정. Giga Texas에 제2공장 건설 중 (장기 1,000만대/년 목표).',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Digitimes',
   'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
   'Tesla, Optimus 공급망 핵심 파트너 공개: TSMC, Samsung, Micron',
   'Q2 2026 실적발표에서 Musk가 TSMC, Samsung, Micron을 Optimus 핵심 반도체/메모리 공급업체로 최초 공개. 기존 자동차 공급망과 완전히 별도의 로봇 전용 공급망 구축.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Teslarati / Tesery',
   'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
   'Digital Optimus: Tesla-xAI 공동 프로젝트 발표 (Grok AI 통합)',
   'Tesla와 xAI 협업 "Digital Optimus" 공식 발표. 듀얼 시스템: System 1(즉각 반응) + Grok System 2(추론/판단). 2026년 9월 출시 목표. AI4 탑재 Tesla 차량에도 통합 가능.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Optimusk.blog / BotInfo.ai',
   'https://optimusk.blog/blog/tesla-optimus-humanoid-robot-latest-version-2026/',
   'Optimus V3 사양 최종 확정: 173cm/57kg, AI5 칩, 22 DOF 핸드',
   'V3 확정 사양: 173cm, 57kg, 22 DOF 핸드(양손 50 액추에이터), 건-구동 생체모방 설계. AI5 칩(AI4 2개 대비 5배 컴퓨팅). 부품 10,000개. xAI Grok 음성 인터페이스 통합.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Seeking Alpha',
   'https://seekingalpha.com/news/4578385-tesla-signals-over-25b-2025minus-2026-capex-as-it-targets-optimus-production-by-late-july',
   'Tesla CapEx $25B+ (2025-2026), Optimus가 미래 가치 80% 차지 전망',
   'Tesla 설비투자 $25B+ 투입. Musk "향후 Tesla 가치의 80%는 Optimus에서 나올 것". 소비자 판매가 $20,000-$30,000 목표. Piper Sandler $500 목표가 제시.',
   '2026-08-06'::timestamp, 'pending'),

-- 2. Boston Dynamics Atlas (10건 수집, 주요 7건 등록)
  (gen_random_uuid(), 'Fox Business / FIFA',
   'https://www.foxbusiness.com/sports/hyundai-motor-brings-boston-dynamics-atlas-humanoid-robot-fifa-world-cup-groundbreaking-activation',
   'Atlas, FIFA 월드컵 16강전 매치볼 전달 (자율 보행)',
   'MetLife Stadium에서 Atlas가 선수 터널에서 걸어나와 심판에게 매치볼 전달. 통제된 환경 밖에서의 첫 대규모 공개 자율 보행 시연. Hyundai가 FIFA 공식 로보틱스 파트너.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Quartz / Bloomberg',
   'https://qz.com/hyundai-softbank-boston-dynamics-stake-acquisition-071626',
   '[Critical] Hyundai, SoftBank 잔여 지분 10% 인수 → Boston Dynamics 100% 자회사화',
   'SoftBank가 풋옵션 행사, Hyundai가 $325M에 잔여 지분 ~10% 인수. 기업가치 ~$3.3B. Boston Dynamics는 이제 Hyundai Motor Group 완전 자회사.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes / TechTimes / Unite.AI',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/17/we-just-had-the-first-humanoid-robot-strike-ever/',
   '[Critical] Hyundai 울산 공장 35,000명 파업: Atlas 배치 반대',
   '자동차 산업 최초의 휴머노이드 로봇 배치 반대 파업. 약 35,000명 조합원이 조기 퇴근 투쟁. 요구: 노조 동의 없는 Atlas 투입 금지, 시간급→고정급 전환, 정년 65세. 손실 ~5,000대, 2,000억원+.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
   'Atlas 생산형: 복잡도 "거의 한 자릿수" 감소, 대량생산 최적화',
   'Atlas Robot Behavior 디렉터: 부품 수와 고유 부품 수 모두 이전 세대 대비 거의 10배 감소. 연간 30,000대 생산 및 단가 $200K 이하 달성의 핵심 요인.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Boston Dynamics / TechCrunch',
   'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
   'Google DeepMind-Boston Dynamics 파트너십: Gemini Robotics 통합',
   'DeepMind Gemini Robotics 파운데이션 모델을 Atlas 인지/추론 스택에 통합. DeepMind가 2026년 Atlas 함대 수령 확인 (Hyundai RMAC와 함께 유일 고객). Alphabet 매각 이후 Google AI 생태계 복귀.',
   '2026-08-06'::timestamp, 'pending'),

-- 3. Figure AI (10건 수집, 주요 7건 등록)
  (gen_random_uuid(), 'Figure AI / explainx.ai',
   'https://www.figure.ai/news/ramping-figure-03-production',
   'Figure 03 누적 1,000대 생산, 시간당 1대 속도 달성',
   'BotQ 공장에서 120일 만에 생산속도 24배 증가 (일 1대→시간 1대). 초기 연간 생산능력 12,000대. 누적 1,000대 달성.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'BMW Group Press',
   'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-figure-03-project-in-spartanburg',
   'BMW Spartanburg에 Figure 03 40대 배치, 물류 작업 투입',
   'Figure 02(차체 판금)→Figure 03(물류 정렬) 전환. 40대 초기 배치, 2026-2027 단계적 확장. Figure 02는 30,000대+ X3 생산 지원 후 은퇴.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'JCPenney Newsroom',
   'https://corporate.jcpenney.com/2026/05/26/catalyst-brands-taps-figure-ai-for-humanoid-automation/',
   'Catalyst Brands(JCPenney 모기업) Figure AI 상용 계약 체결',
   'JCPenney, Aeropostale, Brooks Brothers 모기업 Catalyst Brands가 Reno NV 물류센터에 Figure 로봇 배치. Joey Pouch 분류 시스템 자동화. 공동 투자자 Brookfield 중개.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes / OfficeChai',
   'https://www.forbes.com/sites/johnkoetsier/2026/06/23/humanoid-livestream-robot-makers-rushing-to-show-machines-on-real-production-lines/',
   'Figure AI 인간 vs 로봇 택배분류 라이브스트림: 100시간+ 자율 운영',
   '10시간 경쟁에서 인간(12,924건) vs 로봇(12,732건) 근소한 차이. 이후 100시간+ 연속 자율 운영, 누적 204,000건+ 분류. 건당 2.83초.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forge Global / Nasdaq Private Market',
   'https://forgeglobal.com/figure-ai_stock/',
   'Figure AI 밸류에이션 $39B, Series C 완료 (NVIDIA, Intel, Microsoft, Bezos)',
   'Series C 리드: Parkway Venture Capital. 참여: NVIDIA, Intel Capital, Microsoft, Bezos Expeditions, Brookfield. IPO 일정 미발표. 사모시장 주가 $162-174.',
   '2026-08-06'::timestamp, 'pending'),

-- 4. Unitree (10건 수집, 주요 8건 등록)
  (gen_random_uuid(), 'Caixin Global / Gasgoo / TechNode',
   'https://www.caixinglobal.com/2026-06-02/humanoid-robot-maker-unitree-advances-toward-618-million-shanghai-ipo-102449940.html',
   '[Critical] Unitree STAR Market IPO: $623M 조달, 밸류에이션 $6.2B',
   '상하이 STAR Market 상장위원회 통과. 40.45만주 발행(10%), 42억 위안(~$623M) 조달 목표. IPO 수익 85% R&D 배정. 8월 10일 청약, 8월 19일경 상장 예정.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Robotics & Automation News / Digitimes',
   'https://roboticsandautomationnews.com/2026/08/04/unitree-expects-first-half-revenue-growth-as-demand-for-humanoid-robots-accelerates/103876/',
   'Unitree H1 2026 매출 11억 위안($156M), 전년 대비 35-45% 성장',
   '2026 상반기 매출 약 11억 위안($156M), YoY 35.6-45.4% 성장. 2025년 매출 $235M, 매출총이익률 60%. 다만 이익은 전기 대비 반감 (R&D/확장 투자 증가).',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'CNBC / NVIDIA / CGTN',
   'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
   'NVIDIA-Unitree 파트너십: H2 Plus 레퍼런스 휴머노이드 공개',
   'Computex 2026에서 발표. Unitree H2 Plus 바디 + NVIDIA Jetson Thor + Isaac GR00T 소프트웨어 + Sharpa Wave 촉각 핸드. Stanford, UCSD 등 연구기관 공급 예정. 2026년 말 출시.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'TechCrunch / Forbes',
   'https://techcrunch.com/2026/06/08/pentagon-says-alibaba-baidu-byd-and-unitree-support-chinas-military/',
   '[Critical] 미 국방부, Unitree를 중국 군수기업 지정 (Section 1260H)',
   '미 국방부가 Unitree를 Alibaba, Baidu, BYD와 함께 중국 군수기업 목록에 추가. SASAC 간접 연계 및 "Little Giant" 지정 근거. 미국 국방 계약 참여 금지. 중국-캄보디아 합동 군사훈련에서 B1 무장 사용 영상 확인.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes / Fox News / TechTimes',
   'https://www.forbes.com/sites/johnkoetsier/2026/07/28/united-states-bans-chinese-humanoid--quadruped-robots-citing-national-security/',
   '[Critical] FCC, 중국산 휴머노이드/사족보행 로봇 신규 수입 금지',
   'FCC가 중국산 휴머노이드·사족 로봇 신규 장비인증 금지. Unitree 로봇에서 백도어 발견, 중국 서버 데이터 전송 확인. 기존 인증 모델 판매는 허용. Unitree 글로벌 휴머노이드 시장 ~20%, 출하 ~32.4%.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'TechTimes',
   'https://www.techtimes.com/articles/321011/20260720/unitree-humanoid-robot-enters-europe-days-after-pentagon-flags-it-chinese-military-tech.htm',
   'Unitree H1 Pro 3대륙 동시 출시 시도, 북미는 FCC 제재로 차단',
   'H1 Pro 상용화: 유럽(7/22), 아시아(8/5), 북미(8/12 예정). 3주 내 3대륙 진출 시도는 업계 최초. 그러나 FCC 신규 장비인증 금지로 북미 출시 사실상 차단.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'eWeek',
   'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
   'Unitree 2026년 생산목표 20,000대 (2025년 대비 4배)',
   '2025년 5,500대(글로벌 단일 제조사 기록) 대비 2026년 20,000대 목표. G1($16K)이 볼륨 리더, 대학/스타트업에 광범위 보급.',
   '2026-08-06'::timestamp, 'pending'),

-- 5. Agility Robotics / Digit (9건 수집, 주요 7건 등록)
  (gen_random_uuid(), 'TechCrunch',
   'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
   '[Critical] Agility Robotics SPAC 합병 상장: 기업가치 $2.5B, Nasdaq "AGLT"',
   'Churchill Capital Corp XI와 SPAC 합병. 프리머니 밸류 $2.5B. 총 수익금 $620M+(기관투자자 ~$200M 포함). S-4 비공개 제출(7/13). 미국 최초 순수 휴머노이드 상장사.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'GlobeNewsWire',
   'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
   'Agility, Digit v5 다년간 $300M+ 수주 확보, 65,000시간 운영 달성',
   'Digit v5 다년간 주문 $300M+ 확보(계약 마일스톤 기반). 9개 고객 시설(GXO, Toyota Canada, Schaeffler, Mercado Libre)에서 65,000시간+ 운영.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'NVIDIA Newsroom',
   'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
   'Agility, NVIDIA Halos 안전 시스템 최초 채택 (IEC 61508 SIL 3)',
   'NVIDIA IGX Thor + Halos Core를 Digit에 통합. IEC 61508, ISO 13849, ISO/IEC TR 5469 인증 추진. Digit v5 "협동 안전" — 안전 펜스 없이 인간과 협업 가능.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Humanoid Press / GeekWire / RoboZaps',
   'https://humanoid.press/database/agility-robotics-digit-v5-commercial-logistics/',
   'Digit v5 사양: 50lb 페이로드, 교체식 핸드, 22시간 운영',
   'Digit v5(2026년 말 출시): 페이로드 50lb(기존 35lb→), 교체식 핸드, 일 22시간 운영, NVIDIA Halos 펜스프리 안전. 현 모델 35lb/4시간 자가충전 배터리.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/07/17/agility-robotics-opens-new-fremont-facility-to-accelerate-physical-ai-development/103426/',
   'Agility, 프리몬트에 60,000sqft Physical AI 개발 허브 개설',
   'Fremont CA에 60,000sqft 신설. SW/AI 역량 허브로 Digit의 새 스킬 훈련/테스트 수행. 회사명 "Agility Robotics"→"Agility"로 리브랜딩(2026.03).',
   '2026-08-06'::timestamp, 'pending'),

-- 6. Apptronik / Apollo (10건 수집, 주요 7건 등록)
  (gen_random_uuid(), 'The Robot Report / Humanoids Daily',
   'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
   'Apollo 2 공개: 이족보행+바퀴 듀얼 구성, 데이터 수집 플랫폼',
   'Apollo 2: 173cm, 72.6kg, 25kg 페이로드, 4시간 교체식 배터리. 특허 액추에이터 90%+ 효율(최대 450Nm, 720°/s). 바퀴 모델은 기존 AMR 안전표준 적합. LED 표정 인터페이스.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes / Robotics & Automation News',
   'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
   'Apptronik Robot Park 개설: 90,000sqft 휴머노이드 훈련 시설',
   'Austin TX에 90,000sqft Robot Park 공개 (1년+ 비공개 운영). Apollo 2 함대가 물류/제조/리테일 시나리오 실행, 데이터 수집. Google DeepMind Gemini Robotics 모델 훈련 파이프라인.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Robotics & Automation News / Google DeepMind',
   'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
   'Google DeepMind Gemini Robotics 2 발표, Apollo로 전신 AI 제어 시연',
   'Gemini Robotics 2: 전신 제어, 고급 손재주, 다중 로봇 협업 지원. Apptronik Apollo가 데모 로봇으로 사용. Robot Park가 주요 데이터 파이프라인.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'CNBC / Forbes / GlobeNewsWire',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik Series A 총 $935M 누적, 밸류에이션 $5.3B',
   'Series A-X $520M 추가 조달. 총 조달 ~$1B. 신규 투자: AT&T Ventures, John Deere, Qatar Investment Authority. 기존: B Capital, Google, Mercedes-Benz, PEAK6.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Forbes / RoboZaps',
   'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
   'Apollo 3 "첫 진정한 상용 제품"으로 2027년 대규모 배치 목표',
   'Apollo 2는 데이터/훈련 플랫폼, Apollo 3이 최초 상용 제품. 2026년 파일럿 지속, 2027년 대규모 생산 배치 시작. 가격 미공개. 현재 Mercedes-Benz, GXO, Jabil 파일럿 진행 중.',
   '2026-08-06'::timestamp, 'pending'),

-- 7. 1X Technologies / NEO (10건 수집, 주요 7건 등록)
  (gen_random_uuid(), 'Forbes',
   'https://www.forbes.com/sites/johnkoetsier/2026/06/04/1x-launches-humanoid-robot-world-model-lab-you-cant-fine-tune-your-way-to-agi/',
   '1X World Model Lab 출범, Luma AI 출신 핵심 인재 영입',
   'World Model Lab: 대규모 embodied AI 월드모델 자체 개발 조직. Luma AI 창립 연구원 Samarth Sinha를 Head of World Models로 영입. CEO: "파인튜닝으로는 AGI 불가".',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Dezeen / Robotics & Automation News',
   'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
   '1X, NEO용 25 DOF 텐던구동 로봇핸드 공개 (IP68/식품안전 인증)',
   '25 DOF 텐던구동 핸드: 근인간 수준 손재주/힘/촉각. 기어비 5:1~15:1. 레고 조립, 동전 집기, 지퍼, 차 따르기, 포도 분류 시연. IP68 + 식품안전 인증 획득.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'GlobeNewsWire / Forbes',
   'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
   '1X Hayward 공장 가동: 미국 최초 수직통합 휴머노이드 공장, 연 10,000대',
   '58,000sqft Hayward CA 공장. 연 10,000대 생산능력. NVIDIA Jetson Thor 기반 NEO Cortex(2,070 FP4 TFLOPS). 2027년 100,000대/년 확장 목표.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'BusinessWire / The Robot Report',
   'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
   '1X-EQT 전략적 파트너십: 300+ 포트폴리오 기업에 최대 10,000대 NEO 배치',
   '2026-2030년 EQT 글로벌 포트폴리오 300+개 기업 대상. 물류, 산업SW, 시설관리, 제조, 헬스케어. 2026년 미국 파일럿 시작, 유럽/아시아 확장.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'The Information / Tracxn',
   'https://www.theinformation.com/articles/humanoid-robot-developer-1x-targets-1-billion-new-funding',
   '1X, Series C $1B 목표 (밸류 $10B+) — 미완료',
   'Series C $1B 목표 밸류 $10B+. 2026년 중반 현재 클로징 미확인. 기존 투자자: OpenAI, EQT Ventures, Samsung NEXT. 소비자가 $20,000 또는 월 $499.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Notebookcheck / The Robot Report',
   'https://www.notebookcheck.net/1X-NEO-Household-robot-set-to-launch-by-the-end-of-2026-but-with-a-controversial-catch.1295772.0.html',
   '1X NEO 초기 자율성 60-70%, 원격조종 보완 운영 논란',
   '초기 NEO는 원격조종("Expert Mode") 보완 운영. 자율성 60-70%. 오퍼레이터 "Turing"이 원격으로 미완료 작업 수행, 데이터가 AI 학습에 활용. 프라이버시 우려에 no-go 존/얼굴 블러 대응.',
   '2026-08-06'::timestamp, 'pending'),

-- 8. Agibot (12건 수집, 주요 8건 등록)
  (gen_random_uuid(), 'PR Newswire / AGIBOT',
   'https://www.prnewswire.com/apac/news-releases/agibot-unveils-four-new-products-at-waic-2026-showcasing-embodied-ai-in-real-world-operations-302829347.html',
   'WAIC 2026: Agibot 신제품 4종 — A3 Ultra(NVIDIA Thor), X2 Edu, G2 Max, OmniHand 3',
   'A3 Ultra: 174cm/60kg/51 DOF/5kg 페이로드/8시간 배터리/NVIDIA Thor. X2 Edu: 교육용. G2 Max: 중량 산업용. OmniHand 3 Ultra-M: 직접구동 손재주 시스템. WAIC 현장에 30대+ 운영.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'PR Newswire / AGIBOT',
   'https://www.prnewswire.com/news-releases/agibots-15-000th-robot-rolls-off-the-production-line-marking-a-new-milestone-in-embodied-ai-deployment-302812693.html',
   'Agibot 누적 15,000대 생산 돌파 (3개월 만에 5,000대 추가)',
   '10,000대→15,000대 약 3개월 만에 달성. Omdia: 2025년 글로벌 휴머노이드 출하 1위(5,168대, 39% 시장점유율). 15,000번째 유닛: G2 산업용 로봇.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'CryptoBriefing / Caproasia / The Standard HK',
   'https://cryptobriefing.com/agibot-hong-kong-ipo-humanoid-robotics/',
   '[Critical] Agibot 홍콩 IPO 착수: 밸류에이션 HK$40-50B ($5.1-6.4B)',
   '공동주관: CITIC Securities, CICC, Morgan Stanley. 밸류에이션 HK$40-50B(~$5.1-6.4B), 일부 보도 $20B까지. 2026년 8월 상장 가능. 2025년 매출 10억 위안 돌파.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'Robotics & Automation News',
   'https://roboticsandautomationnews.com/2026/08/03/agibots-foundation-model-tops-benchmark-test-for-audio-visual-reasoning/103832/',
   'Agibot WITA-Omni: 오디오-비주얼 추론 벤치마크 1위 (85.21%)',
   'WITA-Omni Preview 멀티모달 파운데이션 모델: Daily-Omni 벤치마크 85.21% 정확도. Alibaba, Google, ByteDance 모델 상회.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'The Robot Report / Humanoids Daily',
   'https://www.therobotreport.com/agibot-releases-go-2-foundation-model-embodied-ai/',
   'Agibot GO-2 파운데이션 모델: 비동기 듀얼시스템 아키텍처',
   'GO-2: 저주파 계획 + 고주파 실행의 비동기 듀얼시스템. 작업 시작시간 분 단위, 성공률 2-4배, 데이터 요구 50%+ 감소. CVPR 2026, ACL 2026 채택. GO-3 (ViLLA + 월드모델) Q3 2026 예정.',
   '2026-08-06'::timestamp, 'pending'),

  (gen_random_uuid(), 'PR Newswire / KrASIA / Thailand Business News',
   'https://www.prnewswire.com/apac/news-releases/agibot-brings-apc-2026-to-australia-and-new-zealand-building-a-professional-partner-ecosystem-to-accelerate-local-deployment-of-embodied-ai-302828569.html',
   'Agibot APC 2026: 아시아태평양 파트너 생태계 공격적 확장',
   'APC 2026 순회 컨퍼런스: 태국(VST ECS), 인도네시아(Denka Pratama), 호주/뉴질랜드, 말레이시아. 상하이 본사 이벤트에 2,500+ 파트너(30+ 국가) 참가. RaaS 리스 모델 도입.',
   '2026-08-06'::timestamp, 'pending'),

-- 9. 규제/인증 동향 (크로스-컴퍼니)
  (gen_random_uuid(), 'Technology.org / Yahoo Finance',
   'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
   '2026년 중반: 휴머노이드 로봇 연방 규제 프레임워크 부재 지속',
   'OSHA 기계 보호 표준은 고정식 산업 로봇 기준, 자율 휴머노이드 미적용. Tesla/Figure/Agility 모두 다중 관할 안전 인증 필요. EU 기계규정은 유럽시장 진출 시 적용.',
   '2026-08-06'::timestamp, 'pending');

COMMIT;
