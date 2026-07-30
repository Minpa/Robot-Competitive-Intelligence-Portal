-- ARGOS 경쟁사 데이터 업데이트 - 2026-07-30
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. Tesla Optimus
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'TrendForce', 'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
   'Tesla Optimus 프리몬트 공장 생산 개시 (2026년 여름)',
   'Musk가 Optimus 생산팀 단체사진 공개. 프리몬트 공장에서 2026년 7-8월 생산 시작. 초기 생산은 극히 느릴 것이라 경고. Model S/X 라인을 Optimus 공장으로 전환 중. 연간 100만대 목표.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'The AI Insider', 'https://theaiinsider.tech/2026/07/25/musk-updates-progress-of-teslas-optimus-humanoid-robot-warns-of-long-and-flat-production-ramp/',
   'Optimus V3 사양 확정: AI5 칩, 22 DOF 핸드, 50 액추에이터',
   'Optimus V3: 173cm, 57kg, 22 DOF 핸드, 50 액추에이터. Tesla AI5 칩 (기존 대비 5배 메모리 대역폭) + xAI Grok 음성 탑재. Gigafactory Texas에서 배터리 셀 분류, 부품 키팅, 재고 관리 수행 중.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Seeking Alpha', 'https://seekingalpha.com/news/4578385-tesla-signals-over-25b-2025minus-2026-capex-as-it-targets-optimus-production-by-late-july',
   'Tesla 2025-2026 CapEx $25B+ 투입, Optimus 제조에 상당 부분 배정',
   'Tesla 2026년 설비투자 $200억으로 2배 이상 증가. Optimus 제조 구축에 상당 부분 배정. 공급업체: Samsung, TSMC, Panasonic, Micron.',
   NOW(), 'pending'),

-- 2. Boston Dynamics Atlas
  (gen_random_uuid(), 'Boston Dynamics Official', 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
   'Atlas 생산형 모델 CES 2026 공개, 2026년 생산분 전량 판매 완료',
   'CES 2026에서 생산형 Atlas 공개. 2026년 생산분 전량 sold-out. Hyundai RMAC 및 Google DeepMind에 배치 예정. 사양: 188cm, 90kg, 56 DOF, 최대 50kg 페이로드.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Forbes', 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
   'Hyundai, Atlas 연간 30,000대 생산 공장 구축 계획',
   'Hyundai Motor Group이 연간 30,000대 로봇 생산 가능한 공장 건설 계획 발표. Boston Dynamics 본사에서 즉시 생산 시작.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Boston Dynamics Official', 'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
   'Boston Dynamics-Google DeepMind AI 파트너십 체결',
   'Google DeepMind와 embodied AI 파트너십 발표. 휴머노이드 로봇에 foundational intelligence 적용. Atlas에 DeepMind AI 기술 통합 예정.',
   NOW(), 'pending'),

-- 3. Figure AI
  (gen_random_uuid(), 'Time', 'https://time.com/7324233/figure-03-robot-humanoid-reveal/',
   'Figure 03 공개: 가정용 범용 로봇 지향',
   'Figure 03: F02 대비 9% 경량화, 무선 유도 충전(2kW, 발바닥 충전 코일). 소프트 텍스타일 외장으로 안전성 강화. 택배 분류 204,000건 이상 자율 처리 완료.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Notebookcheck', 'https://www.notebookcheck.net/Figure-showcases-Helix-02-powered-humanoid-robot-cleaning-a-living-room-autonomously-at-human-speed.1246647.0.html',
   'Helix-02 VLA: 2대 로봇 자율 협업 청소 시연',
   'Helix-02 데모: 단일 VLA 정책으로 2대 Figure 로봇이 침실 청소(침대 정리, 옷 걸기) 자율 협업. 중앙 플래너 없이 상호 회피.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Forge Global', 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
   'BMW Spartanburg에 Figure 03 40대 배치, 확장 계획',
   'BMW Spartanburg 공장에 Figure 03 40대 배치. 2026-2027년 추가 워크스테이션으로 단계적 확장 계획. Figure AI 밸류에이션 $39B.',
   NOW(), 'pending'),

-- 4. Unitree
  (gen_random_uuid(), 'Caixin Global', 'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
   'Unitree IPO 승인: STAR Market, $618M 규모',
   'CSRC가 7월 2일 Unitree IPO 승인. 상하이 STAR Market 상장, 42억 위안($6.18억) 조달 목표. 최소 10% 지분 매각, 밸류에이션 $3-7B 타겟.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Time', 'https://time.com/article/2026/07/23/unitree-china-human-robotics/',
   'Unitree 2026년 10,000-20,000대 생산 목표, 세계 최초 로봇 앱스토어',
   '2025년 5,500대 출하 후 2026년 4배 증산 목표. 세계 최초 Humanoid Robot App Store 발표. G1 $13,500 역주문 상태.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'KraneShares', 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
   'Unitree 투자자: Meituan, Tencent, Alibaba, Xiaomi, ByteDance, BYD',
   'IPO 신청서에 따르면 Meituan, HongShan China, Tencent, Alibaba, Ant Group, Xiaomi, ByteDance, BYD, Geely 등 투자. 2025년 글로벌 휴머노이드 출하 1위.',
   NOW(), 'pending'),

-- 5. Agility Robotics (Digit)
  (gen_random_uuid(), 'GlobeNewsWire', 'https://www.globenewswire.com/news-release/2026/07/28/3333986/0/en/Humanoid-Global-Provides-Update-on-Agility-Robotics-Public-Listing-Opens-Silicon-Valley-AI-Hub-to-Scale-Digit-Deployments.html',
   'Agility Robotics SPAC 합병으로 상장 추진, 기업가치 $2.5B',
   'Churchill Capital Corp XI와 SPAC 합병. 기업가치 $2.5B, 총 수익금 $620M 이상. 실리콘밸리 AI Hub 개설. 9개 고객 시설에서 65,000시간 이상 운영.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Agility Robotics Official', 'https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada',
   'Agility-Toyota Canada 상업 계약, Digit 배치 확대',
   '고객: Schaeffler, GXO, Toyota Motor Manufacturing Canada, Mercado Libre. Digit v5는 세계 최초 AI 기반 협동 안전 휴머노이드. RoboFab 연간 10,000대 생산 능력.',
   NOW(), 'pending'),

-- 6. Apptronik (Apollo)
  (gen_random_uuid(), 'CNBC', 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
   'Apptronik $520M Series A-X, 밸류에이션 $5B',
   'Series A-X $520M 조달. 기존 투자자 B Capital, Google, Mercedes-Benz, PEAK6 + 신규 AT&T Ventures, John Deere, Qatar Investment Authority. Series A 총액 $935M 이상.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'GlobeNewsWire', 'https://www.globenewswire.com/news-release/2026/06/30/3319598/0/en/welcome-to-robot-park-where-apptronik-s-apollo-goes-to-work-training-the-next-generation-of-humanoid-robot-intelligence.html',
   'Apptronik Robot Park 개설, Apollo 2 공개 (이족보행+바퀴 모델)',
   'Austin TX에 Robot Park(데이터 수집/훈련 시설) 확장 개설. Apollo 2 공개: 이족보행 + 바퀴 기반 2가지 구성. Google DeepMind Gemini Robotics 전략적 파트너십.',
   NOW(), 'pending'),

-- 7. 1X Technologies (NEO)
  (gen_random_uuid(), 'Forbes', 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
   '1X NEO 양산 개시, Hayward CA 공장 연간 10,000대',
   '58,000sqft Hayward 공장 가동. 연간 10,000대 생산 능력. 미국 최초 수직 통합 휴머노이드 제조 시설. 5일 만에 첫해 생산분 완판.',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Humanoid.guide', 'https://humanoid.guide/1x-secures-deal-to-deploy-10000-neo-humanoid-robots/',
   '1X-EQT 10,000대 NEO 배치 계약 (2026-2030)',
   'EQT 포트폴리오 300+개 기업에 최대 10,000대 배치. 제조, 물류, 산업용. 소비자 가격 $20,000 또는 월 $499 렌탈. 2026년 말 소비자 배송 예정이나 미검증.',
   NOW(), 'pending'),

-- 8. Agibot
  (gen_random_uuid(), 'Interesting Engineering', 'https://interestingengineering.com/ai-robotics/china-agibot-10000th-humanoid-robots',
   'Agibot 누적 15,000대 생산 달성 (2026년 6월)',
   '2023년 프로토타입 6대에서 2026년 3월 10,000대, 6월 15,000대 돌파. 글로벌 휴머노이드 출하량 1위(Omdia 기준, 2025년 39% 시장점유율).',
   NOW(), 'pending'),

  (gen_random_uuid(), 'Interesting Engineering', 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
   'WAIC 2026: Agibot 신제품 4종 발표 (A3 Ultra, X2 Edu, G2 Max, OmniHand 3)',
   'A3 Ultra 휴머노이드, X2 Edu 교육용 플랫폼, G2 Max 산업용, OmniHand 3 Ultra-M 로봇 핸드 공개. 소비자 전자제품 정밀 제조 라인 최초 대규모 배치.',
   NOW(), 'pending'),

-- 9. 규제/인증 동향
  (gen_random_uuid(), 'IEEE Spectrum / RoboticsBiz', 'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
   '2026년 휴머노이드 로봇 규제 주요 일정 업데이트',
   'EU AI Act 전면 적용(2026.08, 고위험 AI 시스템), EU 개정 제조물책임지침(2026.12, SW를 제품으로 분류), EU 기계규정 2023/1230(2027.01, 최고위험 기계류 공인기관 인증). ISO 25785-1 동적 안정 로봇 표준 개발 중. 위반 시 최대 €35M 또는 글로벌 매출 7% 벌금.',
   NOW(), 'pending');

COMMIT;
