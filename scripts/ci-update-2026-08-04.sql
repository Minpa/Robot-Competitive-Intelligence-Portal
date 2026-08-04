-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-04
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요
-- 실행: psql $DATABASE_URL < scripts/ci-update-2026-08-04.sql

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. Tesla Optimus
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'Digitimes',
   'https://www.digitimes.com/news/a20260723VL223/tesla-optimus-robot-samsung-micron.html',
   'Tesla, Optimus 공급망 핵심 파트너 공개: TSMC, Samsung, Micron',
   '2026.7.22 Q2 실적 발표에서 Musk가 TSMC, Samsung, Micron을 Optimus 핵심 공급 파트너로 공식 지목. 기존 자동차 공급망과 별도의 완전 신규 공급체계 구축 중. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Electric Vehicles',
   'https://eletric-vehicles.com/tesla/tesla-signs-first-optimus-purchase-pact-for-up-to-10000-robots/',
   'Tesla 최초 Optimus 구매 계약 체결: PharmAGRI 10,000대',
   'PharmAGRI가 Tesla와 최대 10,000대 Optimus 배치 LOI 체결. 농업, 원료의약품(API) 합성, 처방약 제조 시설에 배치 예정. Tesla 최초의 외부 고객 계약. [신뢰도: B]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'TrendForce',
   'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
   'Optimus Fremont 생산 개시 — 초기 속도 "극히 느릴 것" 경고',
   'Fremont 공장 Model S/X 라인을 Optimus 전용으로 전환 완료. 2026년 7-8월 생산 시작. Musk: 초기 S커브가 "상당히 평평하고 길 것". 대부분 주요 부품의 기존 공급망 부재. 2027년 Giga TX/Berlin/Shanghai 병행 확장 계획. [신뢰도: A]',
   NOW(), 'pending'),

-- 2. Boston Dynamics Atlas
  (gen_random_uuid(), 'Engadget / Forbes',
   'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
   'Atlas 생산형 모델 CES 2026 공개 — 2026년 전량 사전 판매 완료',
   'CES 2026에서 최종 상용 Atlas 공개. 2026년 생산분 전량 Hyundai RMAC 및 Google DeepMind에 배정 완료. 사양: 리치 7.5ft, 페이로드 110lbs(50kg), 작동온도 -20~40°C, 자율 배터리 교체. Hyundai 연간 30,000대 공장 건설 계획. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'The Robot Report',
   'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
   'Boston Dynamics-Google DeepMind AI 파트너십 강화 — Gemini Robotics 2 통합',
   'Google DeepMind가 Atlas 공식 AI 파트너로 확정. Gemini Robotics 2 Early Access 파트너 그룹 포함. Atlas에 foundational intelligence 적용하여 범용 산업 작업 시연. 2027년부터 추가 고객 배포 예정. [신뢰도: A]',
   NOW(), 'pending'),

-- 3. Figure AI (Figure 02/03)
  (gen_random_uuid(), 'iiot-world / The AI Insider',
   'https://www.iiot-world.com/artificial-intelligence-ml/robotics/physical-ai-deployment-roi-humanoid-robots/',
   'Figure 02, BMW Spartanburg 공장 1,250시간+ 운영 — 30,000대 X3 생산 기여',
   'BMW Spartanburg 공장에서 Figure 02가 10시간 교대(월~금) 운영. 90,000+ 부품 적재, 1,250시간+ 가동, 30,000대 이상 BMW X3 생산에 기여. 자동차 제조 최초 양산 규모 휴머노이드 배치. Figure 03으로 물류 업무 확장 진행 중. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Forge Global / TechCrunch',
   'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
   'Figure AI BotQ 공장: 90분당 1대 생산, 밸류에이션 $39B',
   'BotQ 캘리포니아 공장에서 90분당 1대 생산 달성. Figure 03: 172cm, 61kg, 페이로드 20kg, 보행속도 1.2m/s, 2.3kWh 교체형 배터리(무선 유도충전), 5시간 운영. BMW에 Figure 03 40대 배치. Series C $1B+(2025.09) 후 밸류에이션 $39B. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'TechCrunch',
   'https://techcrunch.com/2026/07/05/this-humanoid-robotics-company-is-going-public-but-its-ceo-isnt-promising-a-robot-in-your-home-anytime-soon/',
   'Figure AI IPO 검토 중 — 단기 상장 계획 없으나 시장 주시',
   'Figure AI는 현재 비상장 상태 유지. $39B 밸류에이션의 Series C($1B+)로 충분한 런웨이 확보. CEO는 가정용 로봇 단기 실현에 신중한 입장. 총 $2.34B 조달. 투자자: Parkway VC, Brookfield, NVIDIA, Intel Capital, Salesforce. [신뢰도: B]',
   NOW(), 'pending'),

-- 4. Unitree (H1/G1/B2)
  (gen_random_uuid(), 'Caixin Global / KraneShares',
   'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
   'Unitree IPO 승인 — STAR Market 상장, $618M 조달, 밸류에이션 ~$5.9B',
   '2026.7.3 CSRC IPO 승인. 상하이 STAR Market 상장, RMB 42억($618M) 조달 목표. 밸류에이션 ~$5.9B. 투자자: Meituan, Tencent, Alibaba, Ant Group, Xiaomi, ByteDance, BYD, Geely. 2025년 글로벌 휴머노이드 출하 1위. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Forbes / Time',
   'https://www.forbes.com/sites/jonmarkman/2026/04/27/unitree-g1-humanoid-robots-are-reshaping-the-robotics-investment-stack/',
   'Unitree 2026년 10,000~20,000대 생산 목표 — G1 $13,500 역주문',
   '2025년 5,500대 출하 후 2026년 4배 증산 목표(10,000~20,000대). G1 $13,500 주문 가능, H1 $90,000, H2 $29,900(미판매). 세계 최초 Humanoid Robot App Store 발표. -47°C 알타이 설원 130,000보 자율보행 테스트 성공. [신뢰도: A]',
   NOW(), 'pending'),

-- 5. Agility Robotics (Digit)
  (gen_random_uuid(), 'GeekWire / GlobeNewsWire',
   'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
   'Agility Robotics SPAC 합병 상장 — 기업가치 $2.5B, 수익금 $620M+',
   '2026.6.24 Churchill Capital Corp XI와 SPAC 합병 발표. 기업가치 $2.5B, 수익금 $620M+. 미국 최초 상장 휴머노이드 전문 기업. Digit v5 다년계약 $300M+ 확보, 파이프라인 30+개 고객. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'NVIDIA / Engineering.com',
   'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
   'Agility, NVIDIA Halos 최초 탑재 — Digit v5 산업용 안전 인증 추진',
   'Digit가 NVIDIA Halos OS 최초 탑재 양산 로봇으로 확정. NVIDIA IGX Thor + Halos Core 통합. IEC 61508, ISO 13849, ISO/IEC TR 5469 인증 추진. Halos AI Systems Inspection Lab에서 안전 검증 진행. 고객: Amazon, GXO, Schaeffler, Toyota Canada. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Robotics and Automation News',
   'https://roboticsandautomationnews.com/2026/07/17/agility-robotics-opens-new-fremont-facility-to-accelerate-physical-ai-development/103426/',
   'Agility, Fremont AI 허브 개설 — 60,000sqft, 200명 채용',
   'Fremont에 60,000sqft Physical AI 개발 허브 개설. AI 훈련/테스트/소프트웨어 개발 지원. 기술직 및 현장 운영 200명 채용. RoboFab(Salem, OR) 연간 10,000대 생산 능력과 별도 운영. 9개 고객시설 65,000+시간 운영. [신뢰도: A]',
   NOW(), 'pending'),

-- 6. Apptronik (Apollo)
  (gen_random_uuid(), 'CNBC',
   'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik $520M Series A-X — 밸류에이션 $5B, 총 조달 ~$1B',
   '2026.2 Series A-X $520M 조달. Series A 총액 $935M+, 총 조달금 ~$1B. 밸류에이션 $5B. 투자자: B Capital, Google, Mercedes-Benz, PEAK6, AT&T Ventures, John Deere, Qatar Investment Authority. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Robotics and Automation News',
   'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
   'Apollo 2 + Gemini Robotics 2: 전신 AI 제어 시연',
   'Google DeepMind가 Gemini Robotics 2 공개. Apollo 2에서 전신 휴머노이드 제어, 고급 손재주, 멀티로봇 협업 시연. Robot Park(Austin TX)에서 대규모 데이터 수집. Mercedes-Benz, GXO에도 Robot Park 배치 운영. Apollo 2: 이족보행+바퀴 2가지 구성. [신뢰도: A]',
   NOW(), 'pending'),

-- 7. 1X Technologies (NEO)
  (gen_random_uuid(), 'TechFundingNews / Forbes',
   'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
   '1X NEO 양산 개시 — Hayward CA 공장, 첫해 생산분 5일만에 완판',
   'Hayward 58,000sqft 공장 가동. 연간 10,000대 생산 능력, 2027년 100,000대 목표. 사전주문 개시 5일만에 첫해 생산분 전량 완판. NEO Gamma: 170cm, 30kg, 소프트 3D니트 외장, 5지 핸드, 이족보행. 가격 $20,000 또는 월$499 렌탈(6개월 최소). [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'BusinessWire / TechCrunch',
   'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
   '1X-EQT 전략 파트너십: 10,000대 NEO 배치 계약 (2026-2030)',
   'EQT 포트폴리오 300+개 기업에 최대 10,000대 NEO 배치. 제조, 물류, 산업용 집중. 2026년 말 소비자 배송 예정. OpenAI Startup Fund 주도 $23.5M Series A2 포함 총 $100M+ 조달. [신뢰도: A]',
   NOW(), 'pending'),

-- 8. Agibot (X1 / A3 Ultra)
  (gen_random_uuid(), 'Interesting Engineering / gagadget',
   'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
   'Agibot 누적 15,000대 출하 — WAIC 2026에서 A3 Ultra 등 4종 신제품 공개',
   '2023년 프로토타입 6대에서 2026.6 15,000대 돌파. WAIC 2026에서 A3 Ultra(174cm, 60kg, 51 DOF, 700 TOPS, 8시간 배터리, 팔당 5kg), X2 Edu, G2 Max, OmniHand 3 Ultra-M 공개. A3 Ultra "올해의 보석" 수상. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'The AI Insider / eWeek',
   'https://theaiinsider.tech/2026/04/14/chinas-agibot-deploys-robots-in-a-consumer-electronics-manufacturing-production-line/',
   'Agibot, 소비자전자 정밀제조 라인 최초 대규모 배치 — 교대당 3,000대 처리',
   '소비자 전자제품 정밀 제조 양산 라인에 embodied AI 최초 대규모 배치. 36시간 내 라인 통합. 교대당 태블릿 ~3,000대 처리. 64시간+ 연속 운영, 다운타임 4% 미만. 퀵스왑 배터리로 24/7 교대 지원. 2026년 "Deployment Year One" 선언. [신뢰도: A]',
   NOW(), 'pending'),

-- 9. 규제/인증 동향
  (gen_random_uuid(), 'RoboticsBiz / HI AI Design',
   'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
   '2026.8 EU AI Act 고위험 AI 시스템 전면 적용 — 휴머노이드 규제 강화',
   'EU AI Act 2026.8.2 고위험 AI 시스템 전면 적용. 위반 시 최대 €35M 또는 글로벌 매출 7% 벌금. 단, Digital Omnibus(2026.5)로 Annex III는 2027.12, 안전부품 AI는 2028.8로 연기. ISO 25785-1(동적 안정 로봇 표준) 개발 중이나 미발행. 현재 대부분 휴머노이드 CE 인증 미보유. [신뢰도: A]',
   NOW(), 'pending'),

  (gen_random_uuid(), 'NVIDIA',
   'https://nvidianews.nvidia.com/news/nvidia-announces-halos-for-robotics-the-industrys-first-full-stack-safety-system-for-physical-ai',
   'NVIDIA Halos for Robotics — 업계 최초 풀스택 로봇 안전 시스템 발표',
   '2026.6 NVIDIA Halos for Robotics 발표. AI 컴퓨트와 안전을 통합한 업계 최초 풀스택 안전 시스템. IEC 61508, ISO 13849, ISO/IEC TR 5469 인증 지원. Agility Digit가 최초 탑재 로봇. AI Systems Inspection Lab에서 사전 검증 후 제3자 인증. [신뢰도: A]',
   NOW(), 'pending');

COMMIT;
