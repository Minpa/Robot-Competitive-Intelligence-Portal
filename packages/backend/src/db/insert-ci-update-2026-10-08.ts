/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-08
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-08.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-08)
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
    headline: 'Tesla Optimus V3 공개 재차 연기 — Musk "경쟁사 프레임 단위 분석·복제 우려", 핸드 엔지니어링 난항 지속',
    summary: 'Tesla가 Optimus V3(Gen 3) 공개를 재차 연기. Musk는 "경쟁사가 프레임 단위로 분석하여 모든 것을 복제할 것"이라며 완성도가 충분해질 때까지 공개를 보류한다고 밝힘. Musk는 핸드가 로봇 엔지니어링 난이도의 대부분을 차지한다고 언급하며, 텐던 구동+전완부 액추에이터 설계 특허를 보유. 당초 Q1 실적 발표 시 6~7월 공개, 이후 7월 말~8월로 연기했으나 현재까지 미공개. Halloween 시즌 티저에서 V3 핸드가 좀비 컨셉으로 등장하며 임박 시사.',
    sourceName: 'Drive Tesla Canada / NotATeslaApp / Basenor',
    sourceUrl: 'https://driveteslacanada.ca/news/tesla-delaying-optimus-v3-reveal-fears-copycats/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus 주간 수백대 생산 중, 연말까지 주간 1,000대 목표 — The Information 보도, 핸드·AI·서플라이체인 병목',
    summary: 'The Information 보도에 따르면 Tesla가 현재 Optimus를 주간 수백대 생산 중이며, 연말까지 주간 1,000대(연 ~52,000대) 달성을 목표로 함. 그러나 핸드 조립의 수작업 의존, AI 성숙도 부족, 공급업체 제약, 생산 장비 문제 등 복합적 병목 상존. V3 공개 지연과 제조 역량 간의 간극이 업계 관측 포인트. 초기 유닛은 Tesla 내부 Optimus Academy 훈련용으로 투입되며 외부 판매는 미정.',
    sourceName: 'The Information / Humanoid Guide',
    sourceUrl: 'https://humanoid.guide/optimus-v3-analysis-probes-teslas-unfinished-robot-ramp',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'hw',
    headline: 'Figure F.04 설계 확정·부품 납품 개시 (5월) — "세대 간 최대 도약", 다이캐스팅+사출성형 전환, 연 50,000대 목표',
    summary: 'Figure AI 창업자 Brett Adcock이 F.04 설계 확정 및 부품 납품 개시를 발표. "역대 세대 간 최대 도약"으로 평가. CNC 가공에서 다이캐스팅·사출성형으로 전환하여 제조 비용 대폭 절감 및 조립·유지보수 단순화. 가정용 적합성을 위한 아동 안전 테스트 포함. Helix-02 AI 시스템과 쌍으로 운용. 장기 목표 연간 약 50,000대 생산. F.02 퇴역 후 F.03→F.04 세대 전환 가속화 중.',
    sourceName: 'Gasgoo AutoNews / TrendForce',
    sourceUrl: 'https://autonews.gasgoo.com/articles/market-industry/figure-founder-f04-robot-initiates-component-delivery-process-2054560059634376705',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI F.02 퇴역 로봇 용강 폐기 후 금속 바(bar) 판매 — IP 보호 목적, $500~$1,900 기념품 최고가 매진',
    summary: 'Figure AI가 퇴역 F.02 로봇들을 핀란드 제련소에서 용강 투입 방식으로 폐기한 뒤, 잔해로 만든 금속 바를 $500~$1,900에 기념품으로 판매. 고가 라인업은 매진. 폐기 이유는 사내 분해 시 커스텀 액추에이터 등 독자 하드웨어 IP 노출 위험 방지. F.02 플릿의 BMW 공장 기여(~30,000대 X3 생산, 90,000+ 부품 적재) 이후 세대 전환(F.03) 완료를 상징하는 마케팅 이벤트로도 활용.',
    sourceName: 'Gizmodo / Mezha / eenewseurope',
    sourceUrl: 'https://gizmodo.com/figure-ai-trains-retired-robots-to-dive-into-molten-steel-2000820643',
    confidence: 'A',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'JPMorgan Unitree 커버리지 개시 — "비중축소(Underweight)" 등급, 목표가 ¥300 (현재가 대비 -33%)',
    summary: 'JPMorgan이 10월 초 Unitree 커버리지를 "비중축소(Underweight)" 등급, 목표가 ¥300으로 개시. 9/30 종가 ¥450.4 대비 33% 하락 여지. 현재 2027년 예상 P/S 약 46배로 "완벽한 실행을 전제한 밸류에이션"이라 지적. 치열한 국내외 경쟁 심화도 리스크 요인으로 강조. IPO(8/19) 공모가 ¥150.8에서 첫날 ¥1,100까지 629% 급등 후 피크 대비 ~59% 하락. Nomura는 목표가 ¥370(P/S 25배) 제시.',
    sourceName: 'iTiger / StockHub / South China Morning Post / Caixin Global',
    sourceUrl: 'https://scmp.com/tech/tech-trends/article/3365459/unitrees-stock-slump-ipo-stokes-fears-bubble-chinese-humanoid-robotics',
    confidence: 'B',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'Unitree G1 IFA 2026에서 보안 취약점 지적 — Alias Robotics: 음성·영상·위치·센서 데이터 중국 서버 전송 의혹',
    summary: 'IFA 2026에서 Unitree G1의 보안 문제가 부각. 보안 연구기관 Alias Robotics가 G1이 운영자 통지 없이 음성, 영상, 위치, 센서 정보를 중국 서버로 정기 전송한다고 주장. Unitree는 해당 주장에 대해 반박하며 취약점 보완 착수를 언급. 미국 FCC의 외국산 휴머노이드 장비 인가 금지(7/28)와 펜타곤의 "중국 국방산업 기반 기여자" 지정(6월)에 이어 보안 리스크가 Unitree의 글로벌 확장에 추가 장벽으로 작용.',
    sourceName: 'Humanoid Guide / Alias Robotics',
    sourceUrl: 'https://humanoid.guide/unitree-exhibits-g1-at-ifa-amid-unresolved-security-questions/',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility 애널리스트·투자자 데이 개최 완료 (10/6) — Digit 5·스케일링 전략·재무 전망 발표, SPAC 합병 Q4 완료 예정',
    summary: 'Agility Robotics가 10월 6일 뉴욕에서 애널리스트·투자자 데이를 성공적으로 개최. CEO Peggy Johnson, 공동창업자 Jonathan Hurst, CFO Michael Beer 등 경영진이 Digit 5 기술 플랫폼, 상용 모멘텀, 배치·제조 스케일링 전략, 소프트웨어·자율 로드맵, 운영 모델·장기 재무 프로필을 발표. Schaeffler, Foxconn, AUVSI 관점도 공유. Churchill Capital Corp XI(CCXI)과의 SPAC 합병($2.5B 기업가치)은 Q4 완료 예정, 총 $620M+ 조달. 65,000+ 로봇 운영시간 실적 공개.',
    sourceName: 'StockTitan / BusinessWire / GeekWire',
    sourceUrl: 'https://www.stocktitan.net/news/CCXI/agility-robotics-to-livestream-analyst-investor-day-gvpyt9ksaxry.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'IDC: Agibot H1 2026 글로벌 휴머노이드 출하량 1위 확정 — 8,600대+(35% 점유율), 글로벌 총 ~25,000대(YoY +432%)',
    summary: 'IDC 데이터 기준 2026년 상반기 글로벌 휴머노이드 로봇 출하량이 약 25,000대로 전년 대비 432.1% 급증. Agibot이 8,600대+ 출하로 글로벌 1위(약 35% 점유율)를 확정. SAG는 Agibot 약 8,400대(44% 점유율), Counterpoint Research는 약 9,700대(43%+)로 집계하여 조사기관 간 차이 존재하나 1위 지위는 일관. 중국 제조사가 전체 출하의 97%+ 차지, 국내 수요가 85%+. Unitree는 2위(약 5,900~7,000대, 31% 점유율).',
    sourceName: 'Robotics & Automation News / Humanoid Guide / Let\'s Data Science / The Standard HK',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/idc-data-shows-agibot-led-global-humanoid-robot-shipments-in-h1-2026/105463/',
    confidence: 'B',
    category: 'production',
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

export async function insertCiUpdate20261008() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-08) ===\n');

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
        collectedAt: '2026-10-08',
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

insertCiUpdate20261008()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
