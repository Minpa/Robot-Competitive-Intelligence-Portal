#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-06
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-06.ts
 *
 * This script inserts newly collected competitive intelligence data
 * into ci_monitor_alerts and ci_staging tables.
 * Deduplication is handled by checking existing headlines.
 *
 * Competitors covered:
 *   - Tesla Optimus, Boston Dynamics Atlas, Figure AI, Unitree,
 *     Agility Robotics Digit, Apptronik Apollo, 1X Technologies NEO, Agibot
 *
 * New competitors added: Unitree (G1/H1), Apptronik (Apollo), Agibot (A2)
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── New Competitors to Add ──────────────────────────────────────

interface NewCompetitor {
  slug: string;
  name: string;
  manufacturer: string;
  country: string;
  stage: string;
  sortOrder: number;
}

const newCompetitors: NewCompetitor[] = [
  { slug: 'unitree', name: 'G1/H1', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
  { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
  { slug: 'agibot', name: 'A2/A2 Max', manufacturer: 'Agibot (Shanghai)', country: '🇨🇳', stage: 'commercial', sortOrder: 9 },
];

// ── Collected Intelligence Data (2026-05-06) ────────────────────

interface CiAlert {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  competitorSlug: string;
  layerSlug: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  category: 'partnership' | 'funding' | 'mass_production' | 'spec_update' | 'demo' | 'regulation';
  severity: 'info' | 'warning' | 'critical';
}

const alerts: CiAlert[] = [
  // ═══════════════════════════════════════════════════════════════
  // Tesla Optimus
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Tesla Optimus Gen 3 Fremont 생산 개시 — Model S/X 라인 전환, 연 100만대 목표',
    summary: 'Tesla가 Fremont 공장의 Model S/X 생산라인을 Optimus Gen 3 생산으로 전환. 2026년 7-8월 생산 시작 목표. Giga Texas에 2세대 라인(연 1,000만대 목표) 착공 중. Gen 3는 72+ DOF(손당 22 DOF), Tesla AI5 칩 탑재, 8시간 런타임 목표.',
    sourceName: 'Electrek / TheRobotReport',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 손 기술 공개 — 팔/손당 25개 액추에이터, 건 구동 바이오미메틱 설계',
    summary: '2026.02.17 공개. Gen 3 손은 팔/손당 25개 액추에이터(로봇 전체 50개), 22 DOF/손. 건 당김(tendon-pull) 바이오미메틱 설계로 슬림한 손 형태 구현. Gen 2 대비 4.5배 향상. 촉각 핑거팁 센서, 도구 사용 가능.',
    sourceName: 'Tesla 공식 / Basenor',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-hands-22-dof-50-actuators-explained',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla Optimus — Grok(xAI) 음성 AI 통합, 자연어 작업 지시 가능',
    summary: 'Gen 3에 xAI의 Grok LLM 통합으로 자연어 음성 명령 기반 작업 지시 가능. FSD 기반 E2E 신경망 + Grok 언어 모델 결합으로 자율성 향상 기대.',
    sourceName: 'BotInfo / Optimusk Blog',
    sourceUrl: 'https://botinfo.ai/articles/tesla-optimus',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'Tesla Q4 2025 실적: Optimus "유용한 작업 수행 로봇 아직 없음" 인정',
    summary: 'Musk가 Q4 2025 실적 발표에서 현재 Optimus 로봇 중 "useful work" 수행하는 것은 없으며 학습/데이터 수집 용도라고 밝힘. 초기 생산은 "상당히 느릴 것"이라 언급. 소비자 판매는 2027년 말 목표.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/elon-musk-announces-disappointing-tesla-optimus-update/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ═══════════════════════════════════════════════════════════════
  // Boston Dynamics Atlas
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Boston Dynamics, CES 2026에서 양산형 전기 Atlas 공개 — 56 DOF, 50kg 가반하중',
    summary: 'CES 2026(1/5)에서 양산형 Atlas 공개. 56 DOF, 완전 회전 관절, 2.3m 리치, 50kg 가반하중. Hyundai Mobis 제작 커스텀 고출력 액추에이터. 자가 배터리 교체 기능. 파쿠르/백플립 동적 운동 유지.',
    sourceName: 'Boston Dynamics 공식 / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Atlas 2026 생산분 전량 Hyundai·Google DeepMind에 배정, 추가 고객 2027년부터',
    summary: '2026년 생산분 전체가 Hyundai와 Google DeepMind에 배정됨. Boston HQ에서 즉시 생산 시작. 2028년까지 연 30,000대 규모 전용 공장 계획. 추정 단가 $150,000/대.',
    sourceName: 'Automate.org / HumanoidsDail',
    sourceUrl: 'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Atlas, Hyundai HMGMA 조지아 공장 배치 계획 — 2028년 시퀀싱 작업 투입',
    summary: 'Atlas는 2028년까지 Hyundai Motor Group Metaplant America(조지아)에 배치되어 자동차 부품 시퀀싱 작업 수행 예정. Google DeepMind 협력으로 AI 자율성 강화 중.',
    sourceName: 'Boston Dynamics 공식',
    sourceUrl: 'https://bostondynamics.com/blog/atlas-evolution-from-research-robot-to-industrial-humanoid/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ═══════════════════════════════════════════════════════════════
  // Figure AI
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Figure AI Series C $1B+ 펀딩 완료 — $39B 밸류에이션',
    summary: '2025.09 Series C 라운드 $1B+ 클로즈, $39B 포스트 머니 밸류에이션. Parkway Venture Capital 리드, NVIDIA, Intel Capital, Qualcomm Ventures, Salesforce 참여. 총 펀딩 $1.9B+.',
    sourceName: 'Figure AI 공식 / TechCrunch',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 공개 — 가정용 재설계, 무선 충전, 5시간 배터리',
    summary: '2025.10 Figure 03 공개. 3세대 완전 재설계. 5\'8", 61kg, 20kg 페이로드, 1.2m/s 보행, 2.3kWh 스왑형 배터리 5시간 동작, 바닥 인덕티브 패드 무선 충전. 대량 제조 및 가정환경 최적화 설계.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Figure AI, OpenAI 파트너십 종료 → Helix VLA 자체 개발 완료',
    summary: 'Figure AI가 OpenAI와의 파트너십을 종료하고 자체 개발한 Helix AI(Vision-Language-Action) 신경망으로 전환. 완전 자체 개발. 협업 작업 및 자연어 인터랙션 지원.',
    sourceName: 'Figure AI 공식 / CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Figure 02, BMW Spartanburg 3만대+ 차량 생산 지원 — Leipzig 확장 예정',
    summary: 'Figure 02가 BMW Spartanburg 공장에서 30,000+ 차량 생산 지원 (1,250+ 시간, 90,000+ 부품 이동). 독일 Leipzig 공장으로 파일럿 확장 예정. UPS 배치도 보도됨.',
    sourceName: 'Figure AI 공식',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Figure 03, Melania Trump 백악관 행사 참석 — 다국어 인사',
    summary: 'Figure 03이 Melania Trump 주최 Fostering the Future Together Global Coalition Summit 2일차에 참석. 다국어 인사, "미국에서 만든 휴머노이드"로 자기소개. 높은 인지도 확보.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ═══════════════════════════════════════════════════════════════
  // Unitree (NEW COMPETITOR)
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Unitree H1 세계 최고 속도 기록 — 10.1 m/s 스프린트',
    summary: 'Unitree H1이 육상 트랙에서 10.1 m/s 스프린트 속도를 기록, 휴머노이드 로봇 세계 최고 속도 갱신. 측정 장비를 통해 검증됨.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-humanoid-robot-reaches-record-sprint',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Unitree, 2026년 2만대 휴머노이드 출하 목표 — Morgan Stanley 전망 2.8만대',
    summary: 'Unitree가 2026년 2만대 출하 목표 설정. Morgan Stanley는 중국 시장 전망을 2.8만대로 2배 상향. 2025년 5,500+ G1 출하 대비 큰 폭 성장. 90%+ 부품 자체 생산.',
    sourceName: 'eWeek / Morgan Stanley',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Unitree G1 $16,000부터 판매 — 업계 최저가 양산 휴머노이드',
    summary: 'Unitree G1이 $16,000(기본형)~$73,900(EDU형) 16개 구성으로 판매 중. 23-43 DOF, 35kg, 132cm, 3D LiDAR, 깊이 카메라. 배터리 약 2시간, 4.5 MPH 보행 속도. 유일하게 수익성 있는 휴머노이드 기업.',
    sourceName: 'BotInfo / Unitree 공식',
    sourceUrl: 'https://botinfo.ai/articles/unitree-g1',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree 상하이 STAR Market IPO 추진 — $7B 밸류에이션 목표',
    summary: '2026.03 상하이 거래소 STAR Market IPO 신청. $7B 밸류에이션, $580M 조달 목표. Series C ~$99M (Alibaba, Tencent, China Mobile, Geely, Ant Group). 2025년 매출 ¥1.708B (335% YoY 성장).',
    sourceName: 'KraneShares / Caixin',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree G1/H1, 춘절 갈라 무인 공연 — 트램폴린 공중제비·쿵푸·스케이팅',
    summary: 'G1 로봇이 춘절 갈라에서 완전 자율 쿵푸 공연 수행. 트램폴린 3m 공중제비, 4m/s 러닝. H1은 테이블 뛰어넘기 파쿠르, 3m 공중 플립, 한 다리 플립, 에어 플레어 7.5회전 시연.',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/chinese-unitree-g1-humanoid-robot-skates-spins-flips-apac/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ═══════════════════════════════════════════════════════════════
  // Agility Robotics (Digit)
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Digit, GXO 물류센터에서 10만 토트 이동 달성',
    summary: 'Agility Robotics의 Digit가 GXO Logistics Flowery Branch 시설에서 10만 토트 이동 마일스톤 달성. 업계 최초 상용 배치 휴머노이드로서 실적 입증.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Toyota Canada, Digit 상용 계약 체결 — RAV4 물류에 7대+ 배치',
    summary: 'Agility Robotics가 Toyota Motor Manufacturing Canada(Woodstock)와 상용 계약 체결. RAV4 물류에 7대+ Digit를 RaaS(Robots-as-a-Service) 모델로 배치 (2026.02).',
    sourceName: 'Robotics and Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Mercado Libre, Digit 상용 계약 — 라틴아메리카 물류 확장',
    summary: 'Mercado Libre가 Agility Robotics와 상용 계약 체결. San Antonio, TX 시설에 Digit 배치, 커머스 풀필먼트 지원. 라틴아메리카 웨어하우스 추가 유스케이스 탐색 계획.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Digit, ISO 기능안전 인증 추진 — 2026 중후반 목표, 업계 최초 인간 협업 허용',
    summary: 'Agility Robotics가 ISO 기능안전 인증을 추진 중. 취득 시 Digit은 물리적 장벽 없이 인간과 협업 가능한 최초의 휴머노이드가 됨. 2026년 중후반 목표. 차세대 50lb 페이로드 모델도 개발 중.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Digit, MiR·Zebra Technologies AMR 통합 — ProMat 2026 시연',
    summary: 'Digit가 MiR, Zebra Technologies와 AMR(자율 모바일 로봇) 통합을 ProMat 2026(3월)에서 시연. 물류 환경에서 휴머노이드-AMR 협업 워크플로우 제시.',
    sourceName: 'Agility Robotics 공식',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'info',
  },

  // ═══════════════════════════════════════════════════════════════
  // Apptronik (Apollo) — NEW COMPETITOR
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Apptronik $520M 추가 펀딩, $5B+ 밸류에이션 — 총 $935M 조달',
    summary: '2026.02 Series A 확장 $520M 펀딩, $5B 밸류에이션. 총 누적 $935M. B Capital, Google, Mercedes-Benz, PEAK6 기존 투자자 + AT&T Ventures, John Deere, Qatar Investment Authority 신규 참여. Austin 확장 + CA 신규 오피스.',
    sourceName: 'CNBC / TechCrunch',
    sourceUrl: 'https://techcrunch.com/2026/02/11/humanoid-robot-startup-apptronik-has-now-raised-935m-at-a-5b-valuation/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik-Google DeepMind Gemini Robotics AI 파트너십',
    summary: 'Apptronik이 Google DeepMind와 파트너십을 맺고 Gemini Robotics AI 모델을 Apollo에 통합. Apollo의 자율성과 작업 능력 대폭 향상 기대.',
    sourceName: 'Interesting Engineering / CNBC',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Apollo, Mercedes-Benz·GXO·Jabil·John Deere 파트너 확보',
    summary: 'Apollo가 Mercedes-Benz, GXO Logistics, Jabil, John Deere 등 대형 파트너를 확보. 173cm, 72.6kg, 25kg 가반하중, 4시간 핫스왑 배터리. 모듈형 설계(고정/바퀴/이족보행).',
    sourceName: 'Apptronik 공식',
    sourceUrl: 'https://apptronik.com/apollo',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Apptronik, 2026년 신규 로봇 데뷔 예고',
    summary: '펀딩 보도에서 2026년 새로운 로봇 데뷔가 예고됨. 기존 Apollo의 후속 또는 보완 모델로 추정. 세부 스펙 미공개.',
    sourceName: 'SiliconANGLE',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'C',
    category: 'spec_update',
    severity: 'info',
  },

  // ═══════════════════════════════════════════════════════════════
  // 1X Technologies (NEO)
  // ═══════════════════════════════════════════════════════════════
  {
    headline: '1X, 미국 최초 수직통합 휴머노이드 공장 개소 — Hayward, CA',
    summary: '2026.04.30 Hayward CA에 58,000 sqft NEO 공장 개소. 200+ 직원. 연 10,000대 생산 목표, 2027년 말까지 100,000+대 목표. 모터·배터리·구조체·센서 등 핵심 부품 자체 제조.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'NEO 사전예약 5일 만에 연간 생산량(10,000대) 완판 — $20,000 얼리액세스',
    summary: '2025.10.28 NEO 사전예약 개시, 5일 만에 첫해 생산량 10,000대 전량 완판. 얼리액세스 $20,000, 2026년 우선 배송. 미국 우선 출하 후 2027년 해외 확장.',
    sourceName: '1X Technologies 공식 / eWeek',
    sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'NEO 스펙 업데이트 — 22 DOF 손, 소프트 바디, 66lbs/150lbs 리프트',
    summary: 'NEO는 22 DOF 양손(Human Level Dexterity), 커스텀 3D 래티스 폴리머 소프트 바디. 66lbs(29.94kg) 중량, 150lbs(68kg) 리프트, 55lbs(24.95kg) 캐리. 가정용 최적화 설계.',
    sourceName: '1X Technologies 공식',
    sourceUrl: 'https://www.1x.tech/discover/neo-home-robot',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X Technologies, $1B 펀딩 $10B+ 밸류에이션 협상 중',
    summary: '2025.09 투자자/직원 대상 $1B 신규 펀딩을 $10B+ 밸류에이션으로 협상 중 보도. 2024.01 Series B $100M 대비 12배+ 상향. 2026.01 기준 진행 상황 미업데이트.',
    sourceName: 'Sifted / Sacra',
    sourceUrl: 'https://sacra.com/c/1x-technologies/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'funding',
    severity: 'warning',
  },

  // ═══════════════════════════════════════════════════════════════
  // Agibot — NEW COMPETITOR
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'Agibot, 10,000번째 휴머노이드 로봇 생산 달성 — 3개월마다 생산량 2배',
    summary: '2026.03 Agibot이 범용 구현형 로봇(Expedition A3) 10,000번째 생산 달성. 1,000대→5,000대→10,000대로 3개월마다 2배 성장. 물류·리테일·호스피탈리티·교육·산업에 배치 중.',
    sourceName: 'The AI Insider / SCMP',
    sourceUrl: 'https://theaiinsider.tech/2026/03/30/chinas-agibot-reaches-10000-units-citing-real-world-demand-for-humanoid-robots/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot 홍콩 IPO 추진 — $5.1-6.4B 밸류에이션, $1B+ 조달 목표',
    summary: 'Agibot이 2026년 홍콩 IPO 추진. 2026 초 예비 사업설명서 제출, Q3 상장 목표. HK$40-50B(US$5.1-6.4B) 밸류에이션, 15-25% 지분 매각으로 $1B+ 조달 목표. 투자자: Tencent, HongShan, LG전자, Mirae Asset, BYD, Hillhouse.',
    sourceName: 'SCMP / Capital.com',
    sourceUrl: 'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Agibot A2 — 40+ DOF, 169cm, 69kg, 15kg 가반하중 / A2 Max 67 DOF, 40kg 가반하중',
    summary: 'A2: 40+ DOF (손당 12능동+5수동 DOF), 169cm, 69kg, 15kg 가반하중, 3.3m/s 최대속도, 2시간 연속동작. A2 Max: 67 DOF, 175cm, 85kg, 40kg 가반하중, 450Nm 관절 토크.',
    sourceName: 'Agibot 공식 / Top3DShop',
    sourceUrl: 'https://www.agibot.com/products/A2',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'TrendForce: 중국 휴머노이드 생산 94% 성장, Unitree·Agibot 80% 점유',
    summary: 'TrendForce 전망: 2026년 중국 휴머노이드 로봇 생산 94% 성장. Unitree와 Agibot이 출하량의 약 80% 점유 전망. Agibot은 $142M 매출 목표.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ═══════════════════════════════════════════════════════════════
  // Regulation / Safety Standards (Industry-wide)
  // ═══════════════════════════════════════════════════════════════
  {
    headline: 'ISO 25785-1 발행 — 이족보행 로봇 최초 국제 안전 표준',
    summary: '2025.05 ISO 25785-1 발행. 동적 안정 로봇(이족보행) 최초 국제 안전 표준. 산업 현장 사용에 한정, 소비자용 미포함. 낙상 위험 관리를 위한 균형 메트릭스·구역 계산 포함. EU 기계규정 2023/1230이 2027.01.20 전면 적용 예정.',
    sourceName: 'ISO / ANSI Blog',
    sourceUrl: 'https://blog.ansi.org/ansi/iso-10218-1-2025-robots-and-robotic-devices-safety/',
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'warning',
  },
];

// ── Value Updates (structured data for ci_staging) ──────────────

interface ValueUpdate {
  competitorSlug: string;
  itemName: string;
  value: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  source: string;
  sourceUrl: string;
}

const valueUpdates: ValueUpdate[] = [
  // Tesla Optimus
  { competitorSlug: 'optimus', itemName: '자유도(DOF)', value: '72+ DOF (28+ 바디 + 22/손 × 2)', confidence: 'A', source: 'Tesla 공식 Gen 3 발표', sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-gen-3/' },
  { competitorSlug: 'optimus', itemName: '손 자유도', value: '22 DOF/손 (25 액추에이터/손, 건 구동)', confidence: 'A', source: 'Tesla 공식 Gen 3 발표', sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-hands-22-dof-50-actuators-explained' },
  { competitorSlug: 'optimus', itemName: '연속동작시간', value: '~8시간 (경작업, 2.3kWh 배터리)', confidence: 'B', source: 'Optimusk Blog', sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-gen-3/' },
  { competitorSlug: 'optimus', itemName: '핵심 AI 모델', value: 'FSD 기반 E2E NN + Grok(xAI) 음성 AI', confidence: 'B', source: 'BotInfo', sourceUrl: 'https://botinfo.ai/articles/tesla-optimus' },
  { competitorSlug: 'optimus', itemName: '상용화 단계', value: 'Pre-production (Fremont 7-8월 생산 개시)', confidence: 'A', source: 'Electrek', sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/' },
  { competitorSlug: 'optimus', itemName: '배치 대수', value: '학습/데이터 수집 전용 (유용한 작업 아직 없음)', confidence: 'A', source: 'Teslarati (Q4 2025 실적)', sourceUrl: 'https://www.teslarati.com/elon-musk-announces-disappointing-tesla-optimus-update/' },

  // Boston Dynamics Atlas
  { competitorSlug: 'atlas', itemName: '자유도(DOF)', value: '56 DOF (완전 회전 관절)', confidence: 'A', source: 'Boston Dynamics CES 2026', sourceUrl: 'https://bostondynamics.com/products/atlas/' },
  { competitorSlug: 'atlas', itemName: '가반하중', value: '50kg (110 lbs)', confidence: 'A', source: 'Boston Dynamics CES 2026', sourceUrl: 'https://bostondynamics.com/products/atlas/' },
  { competitorSlug: 'atlas', itemName: '키/몸무게', value: '완전 전기 모델, 2.3m 리치', confidence: 'A', source: 'Boston Dynamics CES 2026', sourceUrl: 'https://bostondynamics.com/products/atlas/' },
  { competitorSlug: 'atlas', itemName: '구동 방식', value: 'Hyundai Mobis 커스텀 고출력 전기 액추에이터', confidence: 'A', source: 'Boston Dynamics CES 2026', sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026' },
  { competitorSlug: 'atlas', itemName: '상용화 단계', value: 'Production (CES 2026 양산형 공개, 즉시 생산 개시)', confidence: 'A', source: 'Boston Dynamics 공식', sourceUrl: 'https://bostondynamics.com/blog/atlas-evolution-from-research-robot-to-industrial-humanoid/' },
  { competitorSlug: 'atlas', itemName: '주요 고객', value: 'Hyundai Motor Group, Google DeepMind (2026 전량 배정)', confidence: 'A', source: 'Automate.org', sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026' },
  { competitorSlug: 'atlas', itemName: '가격대', value: '~$150,000/대 (추정)', confidence: 'B', source: '업계 추정', sourceUrl: 'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026' },

  // Figure AI
  { competitorSlug: 'figure', itemName: '총 펀딩', value: '$1.9B+ (Series C $1B+)', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news/series-c' },
  { competitorSlug: 'figure', itemName: '최근 밸류에이션', value: '$39B (2025 Series C)', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news/series-c' },
  { competitorSlug: 'figure', itemName: '주요 투자자', value: 'Parkway VC, NVIDIA, Intel Capital, Qualcomm, Salesforce, Microsoft, Bezos', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news/series-c' },
  { competitorSlug: 'figure', itemName: '핵심 AI 모델', value: 'Helix VLA (자체개발, OpenAI 파트너십 종료)', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news' },
  { competitorSlug: 'figure', itemName: '주요 고객', value: 'BMW (Spartanburg 30K+ 차량, Leipzig 확장), UPS', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news' },
  { competitorSlug: 'figure', itemName: '키/몸무게', value: "5'8\" (173cm) / 61kg (Figure 03)", confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news' },
  { competitorSlug: 'figure', itemName: '연속동작시간', value: '5시간 (2.3kWh 스왑형, 무선 충전)', confidence: 'A', source: 'Figure AI 공식', sourceUrl: 'https://www.figure.ai/news' },

  // Agility Digit
  { competitorSlug: 'digit', itemName: '주요 고객', value: 'Amazon, GXO, Toyota Canada, Mercado Libre, Schaeffler', confidence: 'A', source: 'Agility Robotics 공식', sourceUrl: 'https://www.agilityrobotics.com/' },
  { competitorSlug: 'digit', itemName: '배치 대수', value: '100,000+ 토트 이동 달성 (GXO), 7대+ Toyota Canada', confidence: 'A', source: 'Agility Robotics 공식', sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes' },
  { competitorSlug: 'digit', itemName: '국제 인증', value: 'ISO 기능안전 인증 추진 중 (2026 중후반 목표)', confidence: 'A', source: 'Agility Robotics 공식', sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit' },

  // 1X NEO
  { competitorSlug: 'neo', itemName: '자유도(DOF)', value: '22 DOF 양손 (Human Level Dexterity)', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.1x.tech/discover/neo-home-robot' },
  { competitorSlug: 'neo', itemName: '키/몸무게', value: '66 lbs (29.94 kg), 소프트 바디', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.1x.tech/discover/neo-home-robot' },
  { competitorSlug: 'neo', itemName: '가반하중', value: '150 lbs (68kg) 리프트, 55 lbs (24.95kg) 캐리', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.1x.tech/discover/neo-home-robot' },
  { competitorSlug: 'neo', itemName: '상용화 단계', value: 'Commercial (CA 공장 개소, 소비자 출하 개시 2026)', confidence: 'A', source: 'Bloomberg / GlobeNewsWire', sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html' },
  { competitorSlug: 'neo', itemName: '배치 대수', value: '10,000대 사전예약 완판 (5일)', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/' },
  { competitorSlug: 'neo', itemName: '가격대', value: '$20,000 (얼리액세스)', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.1x.tech/discover/neo-home-robot' },
  { competitorSlug: 'neo', itemName: '제조 파트너', value: 'Hayward CA 자체 공장 (58K sqft, 200+ 직원)', confidence: 'A', source: '1X Technologies 공식', sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html' },
];

// ═══════════════════════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════════════════════

async function main() {
  const client = await pool.connect();
  console.log('Connected to PostgreSQL');

  try {
    await client.query('BEGIN');

    // ── 1. Add new competitors if not exist ──
    console.log('\n=== Adding new competitors ===');
    for (const comp of newCompetitors) {
      const existing = await client.query(
        'SELECT id FROM ci_competitors WHERE slug = $1',
        [comp.slug]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [comp.slug, comp.name, comp.manufacturer, comp.country, comp.stage, comp.sortOrder]
        );
        console.log(`  Added competitor: ${comp.slug} (${comp.manufacturer})`);

        // Create ci_freshness entries for the new competitor
        const layers = await client.query('SELECT id, slug FROM ci_layers');
        const compRow = await client.query('SELECT id FROM ci_competitors WHERE slug = $1', [comp.slug]);
        const compId = compRow.rows[0].id;
        for (const layer of layers.rows) {
          await client.query(
            `INSERT INTO ci_freshness (layer_id, competitor_id, last_verified, tier)
             VALUES ($1, $2, NOW(), 2)
             ON CONFLICT (layer_id, competitor_id) DO NOTHING`,
            [layer.id, compId]
          );
        }
        console.log(`  Created freshness entries for ${comp.slug}`);
      } else {
        console.log(`  Competitor ${comp.slug} already exists — skipping`);
      }
    }

    // ── 2. Build lookup maps ──
    const competitorRows = await client.query('SELECT id, slug FROM ci_competitors');
    const competitorMap = new Map<string, string>();
    for (const row of competitorRows.rows) competitorMap.set(row.slug, row.id);

    const layerRows = await client.query('SELECT id, slug FROM ci_layers');
    const layerMap = new Map<string, string>();
    for (const row of layerRows.rows) layerMap.set(row.slug, row.id);

    // ── 3. Insert monitor alerts (with dedup) ──
    console.log('\n=== Inserting monitor alerts ===');
    let alertInserted = 0;
    let alertSkipped = 0;
    for (const alert of alerts) {
      const competitorId = competitorMap.get(alert.competitorSlug) ?? null;
      const layerId = layerMap.get(alert.layerSlug) ?? null;

      // Dedup check by headline
      const dup = await client.query(
        'SELECT id FROM ci_monitor_alerts WHERE headline = $1',
        [alert.headline]
      );
      if (dup.rows.length > 0) {
        alertSkipped++;
        continue;
      }

      await client.query(
        `INSERT INTO ci_monitor_alerts
         (source_name, source_url, headline, summary, competitor_id, layer_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [alert.sourceName, alert.sourceUrl, alert.headline, alert.summary, competitorId, layerId]
      );
      alertInserted++;
    }
    console.log(`  Inserted: ${alertInserted}, Skipped (duplicate): ${alertSkipped}`);

    // ── 4. Insert staging value updates ──
    console.log('\n=== Inserting staging value updates ===');
    const itemRows = await client.query('SELECT id, name FROM ci_items');
    const itemMap = new Map<string, string>();
    for (const row of itemRows.rows) itemMap.set(row.name, row.id);

    const stagingPayload = valueUpdates.map(vu => ({
      competitorId: competitorMap.get(vu.competitorSlug),
      itemId: itemMap.get(vu.itemName),
      itemName: vu.itemName,
      value: vu.value,
      confidence: vu.confidence,
      source: vu.source,
      sourceUrl: vu.sourceUrl,
      sourceDate: '2026-05-06',
    })).filter(vu => vu.competitorId && vu.itemId);

    // Check for existing staging with same date
    const existingStaging = await client.query(
      `SELECT id FROM ci_staging
       WHERE source_channel = 'auto_collect'
         AND created_at::date = '2026-05-06'
         AND status = 'pending'`
    );

    if (existingStaging.rows.length > 0) {
      console.log('  Staging for 2026-05-06 already exists — skipping');
    } else {
      await client.query(
        `INSERT INTO ci_staging (update_type, payload, source_channel, status)
         VALUES ('value_update', $1, 'auto_collect', 'pending')`,
        [JSON.stringify({ updates: stagingPayload, date: '2026-05-06', collector: 'claude-argos' })]
      );
      console.log(`  Staged ${stagingPayload.length} value updates for review`);
    }

    // ── 5. Direct-apply high-confidence value updates (grade A) ──
    console.log('\n=== Direct-applying grade A value updates ===');
    let directApplied = 0;
    for (const vu of valueUpdates) {
      if (vu.confidence !== 'A') continue;
      const competitorId = competitorMap.get(vu.competitorSlug);
      const itemId = itemMap.get(vu.itemName);
      if (!competitorId || !itemId) continue;

      // Check current value
      const existing = await client.query(
        'SELECT id, value, confidence FROM ci_values WHERE competitor_id = $1 AND item_id = $2',
        [competitorId, itemId]
      );

      if (existing.rows.length > 0) {
        const oldRow = existing.rows[0];
        if (oldRow.value === vu.value) continue; // no change

        // Record history
        await client.query(
          `INSERT INTO ci_value_history
           (value_id, old_value, new_value, old_confidence, new_confidence, change_source, change_reason, changed_by)
           VALUES ($1, $2, $3, $4, $5, 'auto', 'ARGOS auto-update 2026-05-06', 'claude-argos')`,
          [oldRow.id, oldRow.value, vu.value, oldRow.confidence, vu.confidence]
        );

        // Update value
        await client.query(
          `UPDATE ci_values
           SET value = $1, confidence = $2, source = $3, source_url = $4, source_date = $5, last_verified = NOW(), updated_at = NOW()
           WHERE id = $6`,
          [vu.value, vu.confidence, vu.source, vu.sourceUrl, '2026-05-06', oldRow.id]
        );
        directApplied++;
      } else {
        // Insert new value
        await client.query(
          `INSERT INTO ci_values
           (competitor_id, item_id, value, confidence, source, source_url, source_date, last_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [competitorId, itemId, vu.value, vu.confidence, vu.source, vu.sourceUrl, '2026-05-06']
        );
        directApplied++;
      }
    }
    console.log(`  Direct-applied ${directApplied} grade A value updates`);

    await client.query('COMMIT');
    console.log('\n✅ CI War Room update 2026-05-06 completed successfully!');

    // ── Summary ──
    console.log('\n=== Summary ===');
    console.log(`New competitors added: ${newCompetitors.length}`);
    console.log(`Monitor alerts inserted: ${alertInserted}`);
    console.log(`Value updates staged: ${stagingPayload.length}`);
    console.log(`Grade A values direct-applied: ${directApplied}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
