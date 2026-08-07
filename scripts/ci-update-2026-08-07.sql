-- ARGOS 경쟁사 데이터 업데이트 - 2026-08-07
-- 자동 수집 데이터 (웹 검색 기반)
-- DB 접속 불가로 수동 실행 필요

BEGIN;

-- ============================================================
-- ci_monitor_alerts: 수집된 경쟁 인텔리전스 알림
-- ============================================================

-- 1. Unitree IPO 진행 상황 업데이트
INSERT INTO ci_monitor_alerts (id, source_name, source_url, headline, summary, detected_at, status)
VALUES
  (gen_random_uuid(), 'RoboZaps / Caixin Global',
   'https://blog.robozaps.com/b/humanoid-robot-news-week-july-27-august-3-2026',
   'Unitree STAR Market IPO: 8/5 수요예측 개시, 8/6 가격확정, 8/10 청약',
   '8/5 기관 수요예측(book-building) 개시, 8/6 공모가 확정. 40.45만 신주 발행, 42억 위안(~$623M) 조달. 8/10 일반 청약, 8/19경 상장 예정. STAR Market 역대 최속 등록 완료.',
   '2026-08-07'::timestamp, 'pending'),

-- 2. BYD 휴머노이드 로봇 시장 진입 (신규 경쟁자)
  (gen_random_uuid(), 'CnEVPost / TechNode / Gasgoo',
   'https://cnevpost.com/2026/07/28/byd-confirms-plan-humanoid-robot-aug/',
   '[Critical] BYD 첫 휴머노이드 로봇 8월 초 공개 확인 — 신규 경쟁자 진입',
   'BYD 왕촨푸 회장이 8월 초 "Di Space" 체험관에서 첫 휴머노이드 로봇 공개 확인. EV 배터리/모터/반도체 수직통합 역량 활용. 중국 자동차 OEM의 휴머노이드 진출 가속화. BYD 2025 매출 $107B, R&D $13.4B.',
   '2026-08-07'::timestamp, 'pending'),

-- 3. Google DeepMind Gemini Robotics ER 2 업데이트 (크로스-컴퍼니 영향)
  (gen_random_uuid(), 'Robotics & Automation News / Google DeepMind',
   'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
   'Gemini Robotics ER 2: 업계 최초 전신 단일 정책 제어 (BD Atlas + Apptronik Apollo 적용)',
   '7/30 발표. 다리/몸통/팔/손을 단일 정책으로 제어하는 최초 모델. Boston Dynamics Atlas와 Apptronik Apollo 양쪽에 적용. Robot Park 데이터로 훈련. 멀티로봇 협업 지원.',
   '2026-08-07'::timestamp, 'pending'),

-- 4. Figure AI BMW 상용 운영 단가 공개
  (gen_random_uuid(), 'Technology.org / Optimusk.blog',
   'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
   'Figure 03 BMW 배치: 시간당 $25 과금 모델 확인 (RaaS)',
   'BMW Spartanburg Figure 03 40대 함대 운영에 시간당 로봇당 $25 과금. 업계 최초 RaaS(Robot-as-a-Service) 단가 공개. 인간 작업자 대비 비용 경쟁력 벤치마크 기준점 제시.',
   '2026-08-07'::timestamp, 'pending'),

-- 5. Agibot WAIC 2026 A3 Ultra 상세 스펙 추가
  (gen_random_uuid(), 'PR Newswire / AGIBOT',
   'https://www.prnewswire.com/apac/news-releases/agibot-unveils-four-new-products-at-waic-2026-showcasing-embodied-ai-in-real-world-operations-302829347.html',
   'Agibot A3 Ultra: NVIDIA Thor 탑재, 51 DOF, 8시간 운영 — 플래그십 사양 확정',
   'A3 Ultra 확정 사양: 174cm, 60kg, 51 DOF, 5kg 페이로드, 8시간 배터리, NVIDIA Jetson Thor SoC. OmniHand 3 Ultra-M 직접구동 손재주 시스템 통합. 가격 미공개, 2026 Q4 출시 예정.',
   '2026-08-07'::timestamp, 'pending'),

-- 6. Unitree 보안 취약점 공개 (CVE-2025-60250/60251)
  (gen_random_uuid(), 'NVD / RoboZaps',
   'https://blog.robozaps.com/b/unitree-robotics',
   'Unitree Go2/G1/H1/B2 보안 취약점 공개: 하드코딩 암호화키 (CVE-2025-60250/60251)',
   'CVE-2025-60250, CVE-2025-60251: Bluetooth Wi-Fi 설정 인터페이스에 하드코딩된 암호화키 취약점. 영향 제품: Go2, G1, H1, B2 전 모델. FCC 수입 금지 결정과 결합시 글로벌 신뢰도 추가 타격 우려.',
   '2026-08-07'::timestamp, 'pending'),

-- 7. 업계 전체: 2026년 중반 배치 현황 종합
  (gen_random_uuid(), 'Technology.org',
   'https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/',
   '2026 중반 실제 배치 현황: Figure>Agility>BD 순, Tesla 외부배치 0',
   'Figure AI: BMW 40대(F03)+이전 F02. Agility: 9개 시설 65,000시간+. BD Atlas: Hyundai+DeepMind 2곳만. Tesla: 자체 공장 1,000대+, 외부 고객 0. Unitree: 5,500대+ 출하(교육/연구). Agibot: 15,000대 누적 생산.',
   '2026-08-07'::timestamp, 'pending');

COMMIT;
