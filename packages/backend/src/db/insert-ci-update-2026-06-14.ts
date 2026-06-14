/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-06-14
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-06-14.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-06-14)
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
    headline: 'Tesla Fremont Model S/X 라인 Optimus 공장 전환 — Gen 3 양산 2026년 7~8월 목표',
    summary: 'Model S/X 생산라인(5월 종료) Optimus Gen 3 전환. 2026 하반기 저속 양산 시작, 최종 연 100만대 목표. Optimus Gen 3은 최초 양산 설계 모델. Musk: "생산 속도 예측 불가" 발언.',
    sourceName: 'TechTimes / Electrek',
    sourceUrl: 'https://www.techtimes.com/articles/318071/20260609/tesla-turning-its-model-s-line-optimus-robot-factorygen-3-targets-2026-production-start.htm',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Texas Gigafactory 2세대 Optimus 라인 설계 — 장기 연 1,000만대 목표',
    summary: 'Texas에 2세대 생산라인 설계 중, 장기 연 1,000만대 생산 목표. Fremont 1세대 라인과 병행. Musk: Optimus를 Tesla 최대 물량 제품으로 포지셔닝.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 외부 고객 2026년 첫 판매 가능 — 현재 자사 공장 활용 미미',
    summary: 'Q4 2025 실적콜에서 Musk: "자사 공장에서 실질적으로 활용되지 않는 상태" 인정. 2026년 외부 첫 판매 가능성 언급. 10,000개 고유 부품으로 완전 새로운 생산라인 필요.',
    sourceName: 'SEC 8-K / Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'BD Atlas CES 2026 "Best Robot" 수상 — 상용 버전 라이브 데모 공개',
    summary: 'CES 2026에서 상용 Atlas 공개, CNET "Best Robot" 수상. Hyundai 미디어데이에서 라이브 시연. 즉시 보스턴 본사 양산 시작.',
    sourceName: 'Hyundai / CNET',
    sourceUrl: 'https://www.hyundai.com/worldwide/en/newsroom/detail/0000001105',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Atlas 2026년 배치분 전량 예약 완료 — Hyundai RMAC + Google DeepMind',
    summary: '2026년 Atlas 전량 Hyundai RMAC(로보틱스 메타플랜트 애플리케이션 센터)와 Google DeepMind에 배치 확정. 2028년 Hyundai Metaplant America(사바나, 조지아) 부품 시퀀싱부터 투입.',
    sourceName: 'Automate.org / Boston Dynamics',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai $260억 미국 투자 — 로봇 전용 공장 연 30,000대 생산 계획',
    summary: 'Hyundai Motor Group $260억 미국 투자 발표. 로봇 전용 공장 신설(연 3만대 생산 능력). 자사 제조 시설에 수만대 BD 로봇 배치 계획. Embodied AI 연구 위해 Google DeepMind와 파트너십.',
    sourceName: 'NBC News / Hyundai',
    sourceUrl: 'https://www.nbcnews.com/tech/tech-news/hyundai-boston-dynamics-unveil-humanoid-robot-atlas-ces-rcna252483',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI Series C $10억+ 유치, 밸류에이션 $390억 — NVIDIA/Microsoft/Bezos 참여',
    summary: 'Series C $10억+ 유치(2025.9). 포스트머니 $390억. Parkway Venture Capital 리드, NVIDIA, Intel Capital, Microsoft, OpenAI Startup Fund, Bezos Expeditions 참여. 누적 $19억+.',
    sourceName: 'Figure AI 공식 / PR Newswire',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 02 BMW 스파르탄버그 실전 배치 — 30,000대+ 차량 생산 지원, 90,000+ 부품 이동',
    summary: 'BMW 스파르탄버그에서 1,250+ 시간 가동, 90,000+ 부품 이동, 30,000대+ 차량 생산 지원. 파일럿 Leipzig(독일)로 확대. F.02 은퇴 후 Figure 03으로 전환.',
    sourceName: 'Forge Global / Figure AI',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03 소비자 출시 2026년 말 최소 — 초기 가정 배치는 선택된 파트너로 제한',
    summary: 'Figure 03 소비자 구매 불가, 2026년 말 이전 출시 불가. 초기 가정 배치는 선택된 파트너사에 한정. BotQ 공장에서 양산 준비 중. Helix AI 엔진으로 자율 가사 시연.',
    sourceName: 'Robozaps / Figure AI',
    sourceUrl: 'https://blog.robozaps.com/b/figure-03-review',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Helix 02 기반 자율 가사 시연 — 거실 청소를 인간 속도로 수행',
    summary: 'Figure 03에 Helix 02 AI 엔진 탑재. 거실 자율 청소를 사람 속도로 시연. 비디오 기반 학습, 프롬프트만으로 새로운 작업 수행 가능.',
    sourceName: 'Notebookcheck',
    sourceUrl: 'https://www.notebookcheck.net/Figure-showcases-Helix-02-powered-humanoid-robot-cleaning-a-living-room-autonomously-at-human-speed.1246647.0.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2026년 생산 4배 증가 목표 — 10,000~20,000대 (2025년 5,000대 출하)',
    summary: '2025년 5,000대 출하 후, 2026년 4배 증산 목표(10,000~20,000대). Morgan Stanley: 중국 2026년 28,000대 전망(전년 대비 2배 상향). Unitree+Agibot이 글로벌 출하량 80% 점유.',
    sourceName: 'eWeek / Interesting Engineering',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 신청 (2026.3) — 목표 $5.8억, 2025 매출 YoY +335%',
    summary: 'A주(STAR Market) IPO 신청(2026.3). 목표 모집 RMB 42억($5.8억). 2025 매출 RMB 17억(YoY 335%). 시총 RMB 420억+($5.8억+). 대학 연구용 G1 EDU가 가장 널리 사용되는 풀바디 휴머노이드.',
    sourceName: 'TechTimes / TrendForce',
    sourceUrl: 'https://www.techtimes.com/articles/317632/20260602/unitree-ipo-cleared-agibot-hits-10000-units-china-humanoid-robot-duopoly-takes-shape.htm',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree G1/H1 춘절 갈라 공연 — 쿵푸 루틴, 3m 공중 점프, 4m/s 주행 시연',
    summary: '2026 춘절 갈라 공연: G1 쿵푸 루틴(무인 자율), H1 테이블 볼트 파쿠르/3m 공중 플립/에어 플레어 그랜드 스핀(7.5회전). G1 트램폴린 서머솔트 3m, 주행속도 4m/s.',
    sourceName: 'ZMProbots / RoboCloud',
    sourceUrl: 'https://www.zmprobots.com/blog/unitree-g1-complete-guide-2026/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 가격: $16,000(Basic) ~ $73,900(EDU Ultimate D), 16개 설정',
    summary: 'G1 Basic $16,000부터 EDU Ultimate D $73,900까지 16개 설정. 2024년 대비 90% 저렴. 대학 연구용 시장에서 가장 널리 채택된 풀바디 휴머노이드.',
    sourceName: 'BotInfo / Yahoo Tech',
    sourceUrl: 'https://botinfo.ai/articles/unitree-g1',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit Toyota Canada RAV4 공장 7대 상용 배치 — RaaS(로봇-as-a-Service) 모델',
    summary: 'Toyota Canada Woodstock RAV4 공장에 Digit 7대+ RaaS 모델로 상용 배치(2026.6 기준). 1년 파일럿 성공 후 계약. 토트 로딩/언로딩, 부품 공급.',
    sourceName: 'Technology Magazine / Agility Robotics',
    sourceUrl: 'https://technologymagazine.com/news/toyota-deploys-digit-the-rise-of-robots-as-a-service',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics Series C $4억 유치(2025) — RoboFab 10,000대/년 생산 목표',
    summary: 'Series C $4억(2025). RoboFab(Salem, Oregon) 70,000sqft 공장 오픈, 1차 수백대 → 최종 10,000대/년. Amazon, GXO, Toyota, Schaeffler, Mercado Libre 고객.',
    sourceName: 'Contrary Research / Agility Robotics',
    sourceUrl: 'https://research.contrary.com/company/agility-robotics',
    confidence: 'B',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik $5.2억 조달, 밸류에이션 $50억 — Google/Mercedes-Benz/John Deere 참여',
    summary: 'Series A 확장 $5.2억, 밸류에이션 $50억(2026.2). 투자자: Google, Mercedes-Benz, AT&T Ventures, John Deere, QIA. 누적 $9.35억. Austin 본사 확장 + CA 오피스.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apollo Mercedes-Benz/GXO 공장 파일럿 진행 중 — Jabil 양산 파트너십, 2027 상용 배치 목표',
    summary: 'Mercedes-Benz, GXO 공장/물류에서 Apollo 파일럿 진행. Jabil과 자동차 등급 양산 파트너십. 2025-2026 파일럿 완료 후 2027 상용 양산 목표. Google DeepMind Gemini Robotics AI 통합.',
    sourceName: 'Advanced Manufacturing / AI Magazine',
    sourceUrl: 'https://www.advancedmanufacturing.org/manufacturing-engineering/mercedes-invests-in-humanoid-manufacturing-robots/article_c58ca588-0d48-43aa-a0f9-80e9a896755c.html',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO Hayward 공장 가동 — 연 10,000대 생산능력, 1차년 전량 매진(5일만에)',
    summary: 'Hayward, CA 58,000sqft 공장 가동. 연 10,000대 생산능력. 2025.10 사전주문 오픈 후 5일만에 1차년 전량 매진. 2026년 말 소비자 배송 시작 예정.',
    sourceName: 'The Robot Report / TechFundingNews',
    sourceUrl: 'https://www.therobotreport.com/1x-begins-production-neo-humanoid-robots-at-hayward-california-facility/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X-EQT 최대 10,000대 공급 계약(2026-2030) — 포트폴리오사 300+곳 배치',
    summary: 'EQT 포트폴리오사 300+곳에 2026-2030 최대 10,000대 공급 계약. 제조/물류/창고 중심. NEO 가격 $20,000 또는 구독 $499/월(6개월 최소).',
    sourceName: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    confidence: 'B',
    category: 'partnership',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'sw',
    headline: '1X World Model 발표 — 비디오 기반 학습, 미경험 작업 자율 수행',
    summary: '2026.1 발표. 비디오 시청만으로 작업 학습 가능한 물리 기반 AI "World Model". 프롬프트만으로 미경험 객체/작업 자율 수행. NEO에 적용.',
    sourceName: 'The Robot Report / 1X Technologies',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 10,000대 생산 돌파(2026.3) — 5,000→10,000 단 3개월 달성',
    summary: '2026.3.30 누적 10,000대 생산 돌파. 1,000→5,000 약 1년, 5,000→10,000 단 3개월. Expedition A3 플랫폼 중심. 유럽/북미/일본/한국/동남아/중동 글로벌 배치.',
    sourceName: 'PR Newswire / Interesting Engineering',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-announces-the-rollout-of-its-5-000th-mass-produced-humanoid-robot-302635127.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Unitree+Agibot 글로벌 출하량 80% 점유 — TrendForce: 2026 중국 94% 증가 전망',
    summary: 'TrendForce: 2026년 중국 휴머노이드 출하량 94% 증가 전망. Unitree+Agibot이 글로벌 출하량 ~80% 점유. 2025년 글로벌 13,000대 중 중국 기업이 대부분.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Minth Group 파트너십 — 유럽 자동차 부품 생산라인 휴머노이드 배치',
    summary: '독일 Minth Group과 파트너십으로 유럽 자동차 부품 생산라인에 AGIBOT 휴머노이드 배치. 물류, 소매, 호스피탈리티, 산업 제조 등 다분야 확장.',
    sourceName: 'TechXplore / Xinhua',
    sourceUrl: 'https://techxplore.com/news/2026-06-china-humanoids-scale-hard-buyers.html',
    confidence: 'B',
    category: 'partnership',
  },

  // ── 규제/인증 동향 (전체 산업) ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'EU Machinery Regulation 2023/1230 — 2027.1.20 전면 적용, AI 기계 안전 강화',
    summary: 'EU Machinery Regulation 2023/1230: 2027.1.20 전면 적용. AI 통합 기계 확대 적용, 사이버보안 요건 강화, 고위험 기계 적합성 평가 변경. 모든 EU 회원국 직접 적용(국내법 전환 불필요).',
    sourceName: 'Bird & Bird / EU 공식',
    sourceUrl: 'https://www.twobirds.com/en/insights/2026/smart-robots,-dual-regulations-navigating-the-ai-act-and-machinery-compliance',
    confidence: 'A',
    category: 'regulation',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 동적안정로봇 안전표준 — Working Draft 단계, 2026~2027 발행 예정',
    summary: 'ISO 25785-1: 동적 안정 로봇(능동 밸런스 제어 필요 기계) 전용 안전 요건. 2026.1 기준 Working Draft. 2026~2027 최종 발행 예정. ISO 10218:2025 및 ANSI R15.06-2025 현재 적용.',
    sourceName: 'TheresaRobotForThat / EVS International',
    sourceUrl: 'https://theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
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

export async function insertCiUpdate20260614() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-06-14) ===\n');

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
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        collectedAt: '2026-06-14',
      },
      sourceChannel: 'auto_scan',
      status: 'pending',
    });

    console.log(`  ✅ [${item.confidence}] ${item.competitorSlug}: ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`총 ${collectedData.length}건 중 ${inserted}건 삽입, ${skipped}건 중복 건너뜀`);
  console.log(`ci_monitor_alerts: ${inserted}건, ci_staging: ${inserted}건`);
}

const isDirectRun = process.argv[1]?.includes('insert-ci-update-2026-06-14');
if (isDirectRun) {
  insertCiUpdate20260614()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ CI 업데이트 실패:', err);
      process.exit(1);
    });
}
