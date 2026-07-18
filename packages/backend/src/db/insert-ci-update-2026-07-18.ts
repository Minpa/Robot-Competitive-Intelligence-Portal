/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-07-18
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-07-18.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-07-18)
// ============================================

interface CollectedAlert {
  competitorSlug: string;
  layerSlug: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  confidence: string; // A-E
  category: 'partnership' | 'tech_spec' | 'funding' | 'production' | 'regulation';
}

const collectedData: CollectedAlert[] = [
  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Optimus V3 공개 임박 — 173cm/57kg, 22 DOF 핸드, AI5 칩 + Grok 음성',
    summary: 'Optimus V3: 173cm, 57kg, 22 DOF 손 (50개 액추에이터), Tesla AI5 칩 + xAI Grok 음성 통합. 2026년 여름 Fremont에서 생산 시작 예정. Q1 2026 실적 발표에서 확인.',
    sourceName: 'Optimusk Blog / TrendForce',
    sourceUrl: 'https://optimusk.blog/blog/tesla-optimus-humanoid-robot-latest-version-2026/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Musk: Optimus 생산 초기 극도로 느릴 것 — 생산팀 사진 공개 (2026.7.1)',
    summary: '2026.7.1 Musk가 Optimus 생산팀 단체 사진 공개. Fremont 공장 전용 생산라인 전환 확인. "모든 것이 새로워서 초기 생산은 극도로 느릴 것"이라 언급. 본격 생산 7월말~8월 목표.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 가격 목표 $20K-$30K — 현재 제조원가 $50K-$100K+',
    summary: '장기 소비자 가격 $20,000-$30,000 목표. 현재 제조원가 $50K-$100K+ 수준. 2027년 Gigafactory Texas/Berlin/Shanghai 병행 확장 계획.',
    sourceName: 'Basenor / Optimusk Blog',
    sourceUrl: 'https://www.basenor.com/pages/tesla-optimus-tracker',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 5세대 공개 — 복잡도 "거의 한 차수" 감소, 대량생산 최적화',
    summary: '2026.7 5세대 Atlas 공개. 부품 수 대폭 감소로 복잡도 "almost order of magnitude" 감소. 제조 속도 향상, 신뢰성 증가, 비용 절감. 대량생산 최적화 설계.',
    sourceName: 'Forbes / Boston Dynamics',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: '2026년 Atlas 배치 전량 계약 완료 — Hyundai RMAC + Google DeepMind 우선 납품',
    summary: '2026년 생산분 전량 고객 배정 완료. Hyundai Robotics Metaplant Application Center(RMAC) 및 Google DeepMind 우선 납품. 2027년부터 추가 고객 확대.',
    sourceName: 'Forbes / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai $260억 미국 투자 — 로봇 공장 연 30,000대 생산 능력 구축',
    summary: 'Hyundai Motor Group $260억 미국 투자 발표. 신규 로봇 공장 건설, 연간 30,000대 로봇 생산 능력 목표. Boston Dynamics 로봇 자체 공장 대량 배치 계획.',
    sourceName: 'Forbes / Hyundai Newsroom',
    sourceUrl: 'https://www.hyundainews.com/releases/4664',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BMW Spartanburg 배치 (2026.6.30) — 시퀀싱 유스케이스 전환',
    summary: '2026.6.30 Figure 03 BMW Plant Spartanburg Hall 52 배치. 기존 픽앤플레이스에서 시퀀싱 유스케이스로 복잡도 상향. 비정렬 컨테이너 → 시퀀싱 트롤리 정렬 작업.',
    sourceName: 'BMW Group Press / Figure AI',
    sourceUrl: 'https://www.press.bmwgroup.com/global/article/detail/T0458778EN/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 사양: 173cm/61kg, 20kg 페이로드, 5시간 운전, 2kW 무선충전, 3g 지감',
    summary: 'Figure 03 확정 사양: 173cm, 61kg, 20kg 페이로드, 1.2m/s 보행, 5시간 운전, 2.3kWh 교체형 배터리. 2kW 무선 충전, 3g 지감 촉각 센서, 팜 카메라.',
    sourceName: 'Figure AI / Robot Report',
    sourceUrl: 'https://www.therobotreport.com/bmw-group-deploys-figure-03-humanoid-after-tests-previous-version/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 740대 운영, 로봇 수가 직원 수(600명) 초과 달성 (2026.6말)',
    summary: '2026.6말 기준 약 740대 로봇 운영 중. 직원 수 약 600명 대비 로봇이 더 많은 상태. 시리즈 C $10억+ 조달 완료, 기업가치 $390억.',
    sourceName: 'Forge Global / Crunchbase',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI Series C $10억+ — LG Technology Ventures 참여, 밸류에이션 $390억',
    summary: 'Series C $10억+ 조달. Parkway Venture Capital 리드. 참여: Brookfield, NVIDIA, Macquarie, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm Ventures.',
    sourceName: 'Figure AI 공식 / PitchBook',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 최종 승인 — 목표 조달 42억위안, 7월말 상장 예정',
    summary: '2026.7.3 STAR Market IPO 최종 승인. 42억위안($6.18억) 조달 목표. 기업가치 400억위안($59억). 73일만에 심사 통과. 7월말 상장 예정.',
    sourceName: 'Caixin Global / SSE',
    sourceUrl: 'https://www.caixinglobal.com/2026-07-03/unitree-robotics-wins-approval-for-618-million-star-market-ipo-102460136.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2026년 생산목표 10,000~20,000대 — 2025년 대비 4배 증산',
    summary: '2025년 5,000대 출하 → 2026년 10,000-20,000대 목표. 생산능력 4배 확대. 글로벌 휴머노이드 시장 점유율 32%+ 확보.',
    sourceName: 'Interesting Engineering / Forbes',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 투자자 진영: Tencent, Alibaba, Ant, Xiaomi, ByteDance, BYD, Geely 등',
    summary: '주요 주주: Meituan 9.6%, HongShan(Sequoia) 7.1%, Matrix Partners 5.5%. 추가 투자자: Tencent, Alibaba, Ant Group, Xiaomi, ByteDance, BYD, Geely, 정부 펀드.',
    sourceName: 'SCMP / CNBC',
    sourceUrl: 'https://www.scmp.com/tech/article/3347611/inside-unitrees-landmark-ipo-what-know-about-chinas-humanoid-giant',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics Fremont 신규 시설 개소 — Physical AI 개발 허브 (2026.7.17)',
    summary: '2026.7.17 Fremont, CA 신규 시설 개소. SW/AI 역량 개발 허브. Digit AI 학습/테스트 전용. Tesla 인근 입지로 인재 확보 경쟁.',
    sourceName: 'Agility Robotics / TechCrunch',
    sourceUrl: 'https://techcrunch.com/2026/07/17/agility-robotics-plants-its-flag-in-teslas-backyard/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility $25억 SPAC 합병 진행 — 연말 NASDAQ 상장, 티커 AGLT',
    summary: 'Churchill Capital Corp XI과 합병, 기업가치 $25억. $6.2억+ 현금 확보 예상. NASDAQ 티커 AGLT. 연말 거래 완료 목표. 순수 휴머노이드 최초 상장기업.',
    sourceName: 'GeekWire / Robotics & Automation News',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit v5 $3억+ 다년 계약 + 30개+ 파이프라인 고객 확보',
    summary: 'Digit v5 세계 최초 "cooperatively safe" 휴머노이드. $3억+ 다년 주문. 30개+ 잠재 고객 평가 중. 현재 고객: GXO, Schaeffler, Toyota Canada, Mercado Libre. 65,000시간+ 실운영.',
    sourceName: 'Agility Robotics / GeekWire',
    sourceUrl: 'https://www.agilityrobotics.com/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $9.35억 마감 — 기업가치 $50억, 역대 최대 로봇 Series A',
    summary: 'Series A 총 $9.35억 마감 (초기 $4.15억 + 확장 $5.2억). 기업가치 $50억. 역대 로봇 스타트업 최대 Series A. 총 누적 투자 약 $10억.',
    sourceName: 'CNBC / Apptronik 공식',
    sourceUrl: 'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Google DeepMind + Gemini Robotics 전략 파트너십 — 차세대 Apollo 2026 공개',
    summary: 'Google DeepMind와 전략 파트너십: Gemini Robotics 기반 차세대 Apollo 개발. 기존 파트너: Mercedes-Benz, GXO Logistics, Jabil. 차세대 모델 2026년 공개 예정.',
    sourceName: 'Automate.org / Apptronik',
    sourceUrl: 'https://apptronik.com/company/press-releases',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority',
    summary: 'Series A-X 신규 투자자: AT&T Ventures(통신), John Deere(농업), QIA(국부펀드). 기존: B Capital, Google, Mercedes-Benz, PEAK6. 산업 다각화 파트너십 확대.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 풀스케일 생산 시작 — Hayward 공장 200명+, 2026 소비자 출하 예정',
    summary: '2026.4.30 Hayward, CA 공장에서 NEO 풀스케일 생산 시작. 58,000 sqft, 200명+ 직원. 미국 최초 수직통합 휴머노이드 공장. 2026년 내 소비자 출하 예정.',
    sourceName: 'Forbes / GlobeNewsWire',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 신규 핸드 공개 (2026.7.13) — 25 DOF, 인간 능력 수준 매니퓰레이션 목표',
    summary: '2026.7.13 NEO 업그레이드 핸드 공개. 25 관절/25 DOF, 자체 개발 텐돈 시스템. "인간 손 능력과 동등 또는 초과" 목표. 첫 출하분에 장착 예정.',
    sourceName: 'Dezeen / 1X Technologies',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X World Model Lab 설립 (2026.6) — "파인튜닝으로는 AGI 불가" 선언',
    summary: '2026.6.4 World Model Lab 설립. "파인튜닝만으로 AGI 달성 불가" 철학. 세계 모델 기반 로봇 AI 독자 개발. San Carlos 2차 시설 연내 가동.',
    sourceName: 'Forbes / 1X Technologies',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/06/04/1x-launches-humanoid-robot-world-model-lab-you-cant-fine-tune-your-way-to-agi/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 15,000대 출하 (2026.7) — 3개월만에 10,000→15,000 증산',
    summary: '2026.7 누적 15,000번째 범용 로봇 생산 달성. 2026.3 10,000대 → 3개월만에 15,000대. 2023년 프로토타입 6대에서 시작.',
    sourceName: 'Xinhua / SCMP',
    sourceUrl: 'https://english.news.cn/20260709/fb1dc89da2c440d0baba7ddc3d6d6a95/c.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 홍콩 IPO 추진 — 목표 밸류에이션 HK$400-500억 ($51-64억)',
    summary: 'HKEX IPO 추진 중. 목표 밸류에이션 HK$400-500억 ($51-64억). 총 $7.25억+ 누적 조달. 투자자: CICC, CITIC, Morgan Stanley, Sequoia, Hillhouse, Tencent, BYD.',
    sourceName: 'Capital.com / SCMP',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot BotShare 렌탈 플랫폼 — 2026년 200개+ 중국 도시 확장 목표',
    summary: 'BotShare 로봇 렌탈 플랫폼 출시. 2026년 200개+ 중국 도시 확장 목표. 로봇 접근성 대중화 전략. 2026년 매출 $1.42억 목표.',
    sourceName: 'SCMP / Yahoo Finance',
    sourceUrl: 'https://www.scmp.com/tech/big-tech/article/3337477/chinas-agibot-targets-us142-million-revenue-march-humanoid-robots-gathers-pace',
    confidence: 'B',
    category: 'production',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'EU AI Act 2026.8.2 시행 — 산업용 휴머노이드 고위험 AI 분류, 미준수 시 €35M 과징금',
    summary: 'EU AI Act 고위험 AI 시스템 규정 2026.8.2 전면 시행. 산업용 휴머노이드 포함. 미준수 시 €35M 또는 글로벌 매출 7% 과징금. EU Machinery Regulation 2023/1230은 2027.1 적용.',
    sourceName: 'RoboticsBiz / GrabaRobot',
    sourceUrl: 'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'ISO 10218-1/2:2025 적용 확대 — 협업 안전 요구사항 대폭 강화 (28→50페이지)',
    summary: 'ISO 10218-2:2025 안전요구 섹션 28→50페이지로 확대. ISO/TS 15066 핵심요건 흡수. 협업 로봇 안전 기준 강화. ISO 25785-1 동적 안정 로봇 전용 표준 개발 중.',
    sourceName: 'GrabaRobot / EVSINT',
    sourceUrl: 'https://www.grabarobot.com/blog/robot-safety-iso-standards-guide-2026/',
    confidence: 'B',
    category: 'regulation',
  },
];

// ============================================
// INSERT 로직
// ============================================

async function lookupCompetitor(slug: string): Promise<string | null> {
  const rows = await db.select().from(ciCompetitors).where(eq(ciCompetitors.slug, slug)).limit(1);
  return rows[0]?.id ?? null;
}

async function lookupLayer(slug: string): Promise<string | null> {
  const rows = await db.select().from(ciLayers).where(eq(ciLayers.slug, slug)).limit(1);
  return rows[0]?.id ?? null;
}

async function isDuplicateAlert(headline: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(ciMonitorAlerts)
    .where(eq(ciMonitorAlerts.headline, headline))
    .limit(1);
  return rows.length > 0;
}

export async function insertCiUpdate20260718() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-07-18) ===\n');

  let inserted = 0;
  let skipped = 0;

  for (const item of collectedData) {
    const dup = await isDuplicateAlert(item.headline);
    if (dup) {
      console.log(`  ⏭️  중복 건너뜀: ${item.headline.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    const competitorId = await lookupCompetitor(item.competitorSlug);
    const layerId = await lookupLayer(item.layerSlug);

    await db.insert(ciMonitorAlerts).values({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      headline: item.headline,
      summary: item.summary,
      competitorId,
      layerId,
      status: 'pending',
    });

    // ci_staging에도 구조화 데이터 저장
    await db.insert(ciStaging).values({
      updateType: item.category,
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        collectedAt: '2026-07-18',
      },
      sourceChannel: 'auto_crawl',
      status: 'pending',
    });

    console.log(`  ✅ 삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료: ${inserted}건 삽입, ${skipped}건 중복 스킵 ===`);
}

// 직접 실행 시
insertCiUpdate20260718()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
