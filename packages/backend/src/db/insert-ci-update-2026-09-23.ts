/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-23
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-23.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-23)
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
    layerSlug: 'biz',
    headline: 'Tesla, 중국 공급사 3사 양산 인증 완료 — Tuopu·Joyson·Sanhua 대량생산 파트너로 승격',
    summary: 'Tesla 로보틱스팀이 9월 16~17일 닝보 방문, Tuopu Group(액추에이터·섀시), Ningbo Joyson Electronic(센서), Zhejiang Sanhua(열관리) 3사를 잠정→인증 양산 파트너로 승격. 초도 5,000대 발주, 9월 말 주당 1,000대 → 연말 2,000~2,500대/주 생산 목표. 3사 모두 기존 Tesla EV 공급사.',
    sourceName: 'CnEVPost / Teslarati',
    sourceUrl: 'https://cnevpost.com/2026/09/21/tesla-audits-china-suppliers-optimus-mass-production/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 2026년 15,000대 생산 목표 확정 — Fremont 라인 가동, Giga Texas 1,000만대 장기 계획',
    summary: 'Tesla가 2026년 총 15,000대 Optimus 생산 목표를 확정. Fremont Model S/X 라인을 Gen 3 전용으로 전환 완료, 연간 100만대 용량. Giga Texas에 2세대 공장 착공, 장기 연 1,000만대 목표. Musk는 초기 생산 속도가 "예측 불가"하며 10,000개 고유 부품의 신규 라인이라 밝힘.',
    sourceName: 'NextBigFuture / Seoul Economic Daily',
    sourceUrl: 'https://www.nextbigfuture.com/2026/09/optimus-confirmed-15000-bots-this-year-tesla-to-3000.html',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Boston Dynamics Atlas 2026년 전량 배치 완료 확정 — Hyundai RMAC·Google DeepMind 납품 예정',
    summary: 'CES 2026에서 상용 Atlas 공개 후 2026년 생산분 전량 배치 확정. Hyundai Robotics Metaplant Application Center(RMAC)과 Google DeepMind에 플릿 납품 예정. Hyundai $26B 미국 투자 계획에 연 30,000대 로봇 공장 포함. 리치 7.5ft, 리프트 110lbs, -4~104°F 작동 범위.',
    sourceName: 'Forbes / Engadget / Boston Dynamics',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Boston Dynamics, Google DeepMind와 embodied AI 파트너십 — Atlas용 범용 AI 공동 개발',
    summary: 'Hyundai 소유 Boston Dynamics가 Google DeepMind와 파트너십을 통해 Atlas 휴머노이드에 탑재할 embodied AI를 공동 개발. 산업 현장에서의 범용 태스크 수행 능력 강화 목표. Atlas의 다양한 산업 작업 수행 능력("wide array of industrial tasks")과 AI 자율성 결합 추진.',
    sourceName: 'Decrypt / Boston Dynamics',
    sourceUrl: 'https://decrypt.co/354048/boston-dynamics-unveils-first-commercial-atlas-humanoid-robot',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI Series C $1B+ 조달, 밸류에이션 $39B — Nvidia·Intel Capital·LG Tech Ventures 참여',
    summary: 'Figure AI가 Series C에서 $1B 이상 조달, 포스트머니 밸류에이션 $39B로 전년 대비 약 15배 상승. Parkway Venture Capital 리드, Nvidia, Intel Capital, LG Technology Ventures, Salesforce, T-Mobile Ventures, Qualcomm Ventures 참여. BMW Spartanburg 파트너십 지속, Figure 03은 가정용으로 알파 테스트 진행 중.',
    sourceName: 'Yahoo Finance / Figure AI / Sacra',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'data',
    headline: 'Figure AI, Brookfield 파트너십으로 2027년까지 가정 데이터 수집 — 100,000 주거 단위 영상 확보',
    summary: 'Figure AI가 Brookfield와 파트너십을 맺어 2027년까지 Brookfield 보유 100,000 주거 단위에서 1인칭 시점 일상 작업 영상 수집. 이 데이터가 Figure의 Helix 파운데이션 모델 학습에 직접 활용. OpenAI 파트너십과 병행하여 로봇 두뇌의 ML 역량 강화 추진.',
    sourceName: 'Forge Global / Sacra',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 최고속 승인 — 시총 $5.9B, Morgan Stanley 2026년 28,000대 예측',
    summary: 'Unitree Robotics 688836.SH IPO가 7월 3일 STAR Market 역대 최고속으로 승인(밸류에이션 ~$5.9B). Morgan Stanley가 2026년 중국 판매 예측을 28,000대로 2배 상향. G1 세계 최다 판매 휴머노이드(2025년 글로벌 점유율 32%), R1 $4,900부터 H2 Plus $100K까지 풀 라인업. 다만 IPO 이후 고점 대비 50%+ 주가 조정.',
    sourceName: 'eWeek / CNBC / RoboZaps',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree UniPwn 보안 취약점 — 전 모델 하드코딩 AES 키, 웜 공격 가능',
    summary: '2025년 9월 보안 연구진이 UniPwn 취약점 공개. Unitree Go2·B2·G1·H1 전 플랫폼에 하드코딩된 AES 키가 동일하게 사용되어, Bluetooth 기반 웜 공격으로 다수 로봇 동시 장악 가능. 산업용 배치 시 보안 리스크 심각.',
    sourceName: 'RoboZaps / Security Research',
    sourceUrl: 'https://blog.robozaps.com/b/unitree-robotics',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit 5 공개 — 페이로드 50lbs(+40%), 9분 충전, 20시간+/일 가동, ISO 표준 마운트',
    summary: 'Agility Robotics가 Digit 5 공개. 리프트 50lbs(Digit 4 대비 40% 증가), 높이 5ft 11in, 무게 284lbs, 리치 7.2ft. 1회 충전 90분, 9분 충전으로 10:1 가동/충전 비율(Digit 4는 2:1). ISO 표준 마운팅 플랜지로 그리퍼 교체 가능. AI·다중 센서로 사람 근처 안전 작업(울타리 불필요).',
    sourceName: 'GeekWire / The Robot Report / Agility Robotics',
    sourceUrl: 'https://www.geekwire.com/2026/agilitys-new-digit-5-robot-lifts-50-pounds-works-20-hours-a-day-and-operates-alongside-people/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $2.5B SPAC 합병으로 상장 예정 — 주문 $300M+, Nasdaq "AGLT" 티커',
    summary: 'Agility Robotics가 Churchill Capital Corp XI와 $2.5B SPAC 합병으로 상장 예정. Nasdaq "AGLT" 티커, 2026년 말 마감 예상. $300M+ 다년 고객 주문 확보(Schaeffler, GXO, Toyota, Mercado Libre). RoboFab 오레곤 70,000sqft(연 10,000대 용량) + Fremont 캘리포니아 신규 HW/AI 허브. GXO에서 10만 토트 달성(정확도 98%).',
    sourceName: 'GeekWire / Robotics & Automation News / Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
    confidence: 'A',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik $520M Series A-X 조달, 밸류에이션 $5B — 총 누적 ~$1B, 신규 로봇 2026 데뷔 예정',
    summary: 'Apptronik이 2026년 2월 $520M Series A-X 조달(밸류에이션 $5B, 이전 라운드 대비 3배). 기존 투자자 B Capital·Google·Mercedes-Benz·PEAK6 외 AT&T Ventures·John Deere·Qatar Investment Authority 신규 참여. 총 누적 ~$1B. Robot Park Austin(90,000sqft)에서 텔레오퍼레이션+자율 데이터 수집 중. 2026년 신규 로봇 데뷔 예정.',
    sourceName: 'CNBC / The Robot Report / SiliconANGLE',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Apptronik-Google DeepMind Gemini Robotics 파트너십 — Apollo 전신 AI 데모, 차세대 로봇 Gemini 탑재',
    summary: 'Apptronik과 Google DeepMind의 전략적 파트너십으로 Apollo 로봇에 Gemini Robotics 탑재. Robot Park에서 대규모 텔레오퍼레이션+자율 실행 데이터 수집, Gemini Robotics 파운데이션 모델 학습에 활용. Mercedes-Benz·GXO·Jabil 등 대형 고객과 파일럿 진행 중.',
    sourceName: 'Robotics & Automation News / Google DeepMind',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO $20K 가정용 로봇, 캘리포니아 공장 초년도 10,000대 — 5일 만에 완판, 2027년 10만대 목표',
    summary: '1X NEO Gamma — 5ft 7in, 66lbs, 소프트 3D 니트 외장, 5핑거 핸드. 가격 $20,000(구매) 또는 $499/월(6개월 최소). 캘리포니아 공장 초년도 10,000대 용량, 사전주문 5일 만에 완판. 2026년 말 소비자 출하, 2027년 말 100,000대 목표. EQT 포트폴리오(300개사)에 2026~2030년간 최대 10,000대 산업용 납품 계약.',
    sourceName: 'eWeek / Sifted / TechCrunch / TechFundingNews',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X Technologies $1B 펀딩 라운드 추진 — 밸류에이션 $10B+ 목표, OpenAI 지원',
    summary: '1X Technologies가 2025년 9월 기준 $1B 신규 펀딩을 추진 중, 밸류에이션 $10B+ 목표(기존 $820M 대비 12배 상승). OpenAI 지원을 받으며 가정용·산업용 양면 전략 전개. NEO를 홈 로봇 시장과 EQT 산업 포트폴리오에 동시 투입.',
    sourceName: 'EqualOcean / Sacra',
    sourceUrl: 'https://equalocean.com/briefing/20250924230148618',
    confidence: 'C',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 2026 H1 글로벌 휴머노이드 출하 1위 — 8,400~9,700대(44%), "Deployment Year One" 선언',
    summary: 'Agibot이 2026 상반기 글로벌 휴머노이드 출하 1위 달성. Smart Analytics Global 기준 8,400대(44%), Counterpoint 기준 9,700대(43%)로 Unitree 추월. "Deployment Year One" 선언하며 5개 로봇 플랫폼+8개 AI 모델 공개. CES 2026에서 미국 시장 공식 진출.',
    sourceName: 'eWeek / Interesting Engineering / TrendForce',
    sourceUrl: 'https://www.eweek.com/news/agibot-deployment-year-one-robots-ai-models-apac/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 Ultra 공개 — 51 DOF, 1.74m, 3D LiDAR+RGB-D+GPS/RTK/UWB, WAIC 2026',
    summary: 'WAIC 2026(상하이)에서 Agibot A3 Ultra 공개. 51 자유도, 높이 174cm, 팔당 11lbs 리프트. 3D LiDAR, RGB-D, 어안·쌍안 카메라, GPS/RTK/UWB 측위 탑재. X2 Edu(교육), G2 Max(산업), OmniHand 3 Ultra-M(로봇핸드) 함께 공개. IPO 상반기 서류 예정, Q3 상장 목표.',
    sourceName: 'Interesting Engineering / Agibot',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 글로벌 규제/안전 동향 ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'safety',
    headline: '휴머노이드 로봇 안전 규제 프레임워크 갭 — ISO 10218:2025 갱신, EU Machinery Reg 2027 적용',
    summary: 'ISO 10218:2025 갱신으로 협동 로봇 인증 초점 전환. ISO 25785-1(동적 안정 로봇) 개발 중. EU Machinery Regulation 2023/1230이 2027년 1월 적용 예정, EU AI Act 고위험 요건은 2028년 8월로 연기. 현행 ISO 10218·TS 15066은 AI 기반 실시간 의사결정 로봇을 전제하지 않아 규제 공백 존재. 복수 표준(ISO 10218+TS 15066+ISO 13482+ASTM) 조합 필요.',
    sourceName: 'RoboticsBiz / QUE.com / RoboSelect360',
    sourceUrl: 'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
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

export async function insertCiUpdate20260923() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-23) ===\n');

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

    await db.insert(ciStaging).values({
      updateType: item.category,
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        collectedAt: '2026-09-23',
      },
      sourceChannel: 'auto_crawl',
      status: 'pending',
    });

    console.log(`  ✅ 삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료: ${inserted}건 삽입, ${skipped}건 중복 스킵 ===`);
  return { inserted, skipped, total: collectedData.length };
}

insertCiUpdate20260923()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
