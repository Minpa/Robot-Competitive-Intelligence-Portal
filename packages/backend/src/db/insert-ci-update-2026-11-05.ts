/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-11-05
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-11-05.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-11-05)
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
  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics, Churchill Capital XI SPAC 합병 완료 — 11/5 Nasdaq "AGLT" 거래 개시, $2.5B 밸류에이션, $465M 조달',
    summary:
      'Agility Robotics가 2026년 11월 4일 Churchill Capital Corp XI(CCXI)와의 기업 결합 완료를 공식 발표. 11월 2일 주주 투표에서 84% 이상 찬성으로 승인. 합병 전 기업가치 $2.5B, 총 조달 약 $465M(CCXI 신탁 ~$264M + Foxconn 주도 PIPE $201M). 11월 5일부터 Nasdaq에서 티커 "AGLT"로 보통주 및 워런트 거래 개시. 휴머노이드 로봇 기업 최초의 미국 상장 사례. Mark Vale가 합병 후 감사위원장으로 합류.',
    sourceName: 'Manila Times / GlobeNewsWire / Unite.AI / Startup Fortune',
    sourceUrl: 'https://www.manilatimes.net/2026/11/05/tmt-newswire/globenewswire/agility-robotics-and-churchill-capital-corp-xi-complete-business-combination/2462289',
    confidence: 'A',
    category: 'funding',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Q3 2026 실적발표: Fremont Optimus 고속 라인 "초기 생산" 공식 확인 — 첫 양산 품질 로봇, 46일 만에 S/X 라인 전환',
    summary:
      'Tesla Q3 2026 실적발표(10월)에서 Elon Musk가 Fremont 고속 라인에서 "early production"이 시작되었다고 공식 확인. 주주 덱에서 "이 라인에서 나온 봇이 최초의 양산 품질(production quality) 로봇"이라고 명시. Model S/X 조립 라인을 46일 만에 철거하고 Optimus 라인으로 전환. 연 100만대 용량 설계이며 "the vast majority"가 이미 설치 완료. 완전 가동까지 약 1년 소요 전망. 초기 생산 로봇은 외부 판매가 아닌 내부 "Optimus Academy" 프로그램으로 투입. Giga Texas에 연 1,000만대 규모 2차 라인 별도 건설 중.',
    sourceName: 'NotATeslaApp / Basenor / Gasgoo / Nasdaq',
    sourceUrl: 'https://www.notateslaapp.com/news/4866/tesla-officially-begins-optimus-robot-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla, Harmonic Drive Systems를 Optimus 핵심 감속기 공급사로 확정 — 주당 20,000대 목표 시 모든 로봇에 탑재',
    summary:
      'Motley Fool(11/4) 보도. Tesla가 Optimus 로봇 관절 감속기(harmonic drive)의 핵심 공급사로 일본 Harmonic Drive Systems(HDS)를 확정. 주당 20,000대 생산 목표 달성 시 전량 HDS 감속기 탑재 전망. HDS 주가는 2026년 들어 약 30% 상승. 감속기는 로봇 관절의 토크·정밀도를 결정하는 핵심 부품으로, Tesla의 공급망 전략에서 중요한 외부 의존성. HDS 외에 중국 리더스맥(LeadSmart) 등 대체 공급사 테스트도 병행 중인 것으로 추정.',
    sourceName: 'Motley Fool',
    sourceUrl: 'https://www.fool.com/investing/2026/11/04/tesla-wants-to-build-20000-optimus-robots-a-week-h/',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics, Atlas 조립 시간 1일 달성 — 2027년까지 1시간으로 단축 목표, 최종적으로 분 단위 목표',
    summary:
      'Boston Dynamics가 10월 공개 제조 영상에서 Waltham 프로토타입 공장에서 Atlas 1대 조립에 약 1일이 소요됨을 공개. 2027년까지 1시간으로 단축, 궁극적으로 분 단위 조립이 목표. 현재 미국 신규 공장(연 30,000대 용량) 건설을 계획 중이며, Hyundai Motor Group은 2028~2030년 글로벌 사업장에 25,000대 배치 계획. Goldman Sachs는 5만대 규모 시 단가 $30K 수준까지 하락 전망.',
    sourceName: 'TechTimes / Humanoids Daily / Boston Dynamics',
    sourceUrl: 'https://www.techtimes.com/articles/329041/20261014/inside-atlass-prototype-shop-boston-dynamics-discloses-one-day-build-targets-one-hour.htm',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure 03, 트레드밀 9일 연속 560km 주행 내구성 테스트 완료 — 저속 보행 연속 운용 성능 실증',
    summary:
      'Figure AI가 Figure 03 로봇을 트레드밀에서 9일간 연속 주행시켜 총 560km를 달성하는 내구성 테스트를 완료(10월). 저속 보행으로 연속 운용 시 기계적 신뢰성을 실증. 5월에는 3대의 Figure 03가 컨베이어 벨트 위에서 8일간 연속 패키지 분류를 수행한 바 있음. 누적 생산량은 7월 기준 1,000대 돌파 추정(비공식). BMW Spartanburg 배치 이후 대규모 고객 배치가 다음 마일스톤.',
    sourceName: 'Heise / eWeek / Figure AI',
    sourceUrl: 'https://www.heise.de/en/news/It-keeps-going-and-going-Figure-03-robot-covers-560-km-11493464.html',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 창업자 Wang Xingxing, Wuzhen 서밋(11/4)에서 "2027년이 로봇 산업 티핑포인트" 전망 — 주가 8%+ 급등',
    summary:
      'Unitree Robotics 창업자 겸 CEO Wang Xingxing이 2026년 11월 4일 Wuzhen Summit에서 "2027년이 로봇 산업 또는 로봇 모델의 발전에 있어 매우 중요한 분기점(critical juncture)이 될 가능성이 높다"고 발언. 다만 "마지막 수 밀리미터"의 기술적 병목이 여전히 존재한다고 인정. 해당 발언 이후 Unitree Robotics(688836.SH) 주가가 장중 8% 이상 급등. 생산 용량 제약과 AI 기술 한계를 해결해야 할 과제로 언급.',
    sourceName: 'Futunn / Investing.com / Digitimes',
    sourceUrl: 'https://news.futunn.com/en/post/1003449595/wang-xingxing-of-unitree-robotics-2027-is-highly-likely-to',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree "Rehearsal" 자기학습 소프트웨어 루프 공개 — sim-to-real 77점 격차 해소 목표, 데이터 중국 전송 논란',
    summary:
      'Unitree가 2026 World Physical AI Conference에서 "Rehearsal" 소프트웨어 루프를 공개. 실환경 배치 중 자동으로 학습 데이터를 수집·전송하여 시뮬레이션 대비 실제 환경(sim-to-real) 77점 성능 격차를 해소하는 것이 목표. TechTimes는 미국에서 운용되는 Unitree 로봇이 수집한 데이터가 중국으로 전송된다는 보안 우려를 보도. 미 국방부 Section 1260H 목록 등재(6/8)와 맞물려 미국 시장 접근에 추가 규제 리스크. 별도 미국 의회 법안 2건이 상업·소비자 영역까지 제한 확대를 추진 중.',
    sourceName: 'TechTimes / TechNode / The Robot Report',
    sourceUrl: 'https://www.techtimes.com/articles/329477/20261026/unitree-builds-self-improving-robots-rehearsal-sends-learning-data-china.htm',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'AGIBOT Innovation Day: G2 Max 중량급 세미-휴머노이드 공개 — 바퀴 기반, 산업 중물류 특화',
    summary:
      'AGIBOT가 2026년 10월 29일 Innovation Day에서 G2 Max를 공개. 바퀴 기반(wheeled base) 세미-휴머노이드로 산업 환경의 중량물 핸들링에 특화. 기존 이족 보행 휴머노이드 A2(전신형)와 차별화된 산업 특화 라인업 확장. 동시에 3세대 하드웨어 아키텍처 AHA3, GO-3 파운데이션 모델 프리뷰, 3핑거 OmniHand 3 Ultra도 공개. Forbes에 따르면 AGIBOT는 현재 세계 최대 휴머노이드 제조사(H1 2026 출하량 기준).',
    sourceName: 'Forbes / Counterpoint Research / PR Newswire',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/10/30/worlds-biggest-humanoid-robot-maker-wants-to-change-how-we-measure-robot-work/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik, Series A 누적 $935M+ 확보 — GXO·Mercedes·Jabil 파일럿 진행 중, Apollo 3 2027년 상용 출시 예고',
    summary:
      'Apptronik의 2026년 최신 현황 종합. 2월 $520M Series A-X 연장으로 총 Series A 누적 $935M+ 조달, $5B 밸류에이션. 6월 Austin Robot Park(90K sqft) 오픈, Apollo 2 이족/바퀴 듀얼 모델 및 Google DeepMind Gemini Robotics 연동 실데이터 수집 진행 중. Mercedes-Benz(최초 상용 배치, 제조 물류), GXO(창고 PoC), Jabil(글로벌 양산 파트너)과 파일럿 중이나, 대규모 상용 배치는 아직 미확인. CEO Jeff Cardenas가 Apollo 3를 "실제 작업을 수행할 출하 로봇"으로 지목, 2027년 공개 예정.',
    sourceName: 'CNBC / Forbes / The Robot Report / Startup Fortune',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 최종 핸드 버전 공개 — 25-DOF 텐던 구동, "인간 능력 대등 또는 초월" 목표',
    summary:
      '1X Technologies가 7월 NEO 휴머노이드의 최종 버전 손(hand)을 공개. 25 자유도(DOF), 텐던 구동(tendon-driven) 방식으로 정밀 조작 성능 확보. Dezeen 보도에 따르면 "인간의 손 능력에 대등하거나 초월하는 것"이 설계 목표. 이 손이 탑재된 첫 NEO 생산 모델이 2026년 내 가정 배송 예정. Hayward 캘리포니아 공장 연 10,000대 생산 용량, 2027년까지 100,000대 확대 목표. 58,000 sqft 제조시설에서 수직 통합 생산. 다만 실제 고객 인도 독립 검증은 미확인.',
    sourceName: 'Dezeen / The Robot Report / 1X.tech',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    confidence: 'A',
    category: 'tech_spec',
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

export async function insertCiUpdate20261105() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-11-05) ===\n');

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
        collectedAt: '2026-11-05',
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

insertCiUpdate20261105()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
