/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-06-08
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-06-08.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 *   - articles: 뉴스 기사
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers, articles } from './schema.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// ============================================
// 수집 데이터 (2026-06-08)
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

interface CollectedArticle {
  companyId: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  language: string;
  articleCategory: string;
  productType: string;
}

const collectedAlerts: CollectedAlert[] = [
  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla Optimus V3 공개 연기 — 양산 개시 직전으로 일정 조정 (Q1 실적발표)',
    summary: '2026.4.22 Q1 실적발표에서 Musk: V3 공개를 양산 개시 직전으로 연기. 소비자 판매 2027년 말 목표. B2B 산업용 한정 제공 2026년 말 시작 가능.',
    sourceName: 'Electrek / Tesla Q1 Earnings',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Optimus Fremont 파일럿 라인 첫 영상 공개 — 1만개 부품 신규 조립 체계',
    summary: 'Fremont 공장 Optimus 파일럿 생산라인 영상 최초 공개. S/X 라인 전환 완료. 1만개 고유 부품 신규 조립라인. Q3 2026 본격 가동 목표.',
    sourceName: 'Basenor / Tesla',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-pilot-production-line-gets-first-look-on-video',
    confidence: 'A',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 자율 배터리 교체 기능 — 무인 연속 가동 가능',
    summary: 'Atlas 자체 배터리 교환: 충전 스테이션 자율 이동 → 배터리 스왑 → 작업 복귀. 3분 교체, 인간 개입 없이 24시간 연속 운영 가능.',
    sourceName: 'AI2Work / Boston Dynamics',
    sourceUrl: 'https://ai2.work/blog/boston-dynamics-electric-atlas-ships-its-first-commercial-units',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai 로보틱스 공장 연 30,000대 생산 — Atlas 대규모 내부 배치 2028년 시작',
    summary: 'Hyundai $260억 미국 투자 중 로보틱스 공장 신설, 연간 30,000대 생산 능력. Savannah Metaplant에 2028년부터 parts sequencing, 2030년 component assembly 확대.',
    sourceName: 'The Register / Boston Dynamics',
    sourceUrl: 'https://www.theregister.com/2026/01/06/boston_dynamics_atlas_production/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BMW Leipzig 독일 공장 배치 시작 — 유럽 첫 휴머노이드 생산라인 투입',
    summary: 'BMW Group Plant Leipzig에 Figure 03 배치 예정 (2026 여름). 유럽 최초 휴머노이드 로봇 자동차 생산 투입. 고전압 배터리 조립 및 부품 제조 공정.',
    sourceName: 'BMW Group Press / BMW Group',
    sourceUrl: 'https://www.press.bmwgroup.com/global/article/detail/T0455864EN/bmw-group-to-deploy-humanoid-robots-in-production-in-germany-for-the-first-time',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure 03 자율 패키지 분류 204,000+ 건 달성 (163시간 라이브 스트리밍)',
    summary: '2026.5.20 기준 Figure 03 자율 AI 패키지 분류 204,000+건 달성, 163시간+ 라이브 스트리밍. 라벨 아래로 배치 후 컨베이어 전달. 무중단 자율 운영 입증.',
    sourceName: 'Figure AI Live Stream',
    sourceUrl: 'https://www.figure.ai/news',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BMW Spartanburg 40대 배치 — Figure 02 11개월 1,250시간 운영 후 교체',
    summary: 'BMW Spartanburg에 Figure 03 40대 배치 완료. Figure 02는 11개월간 매일 10시간 근무, 90,000+ 부품 이동, 1,250+ 시간 운영. Figure 03로 업그레이드.',
    sourceName: 'Forge Global / Figure AI',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree GD01 세계 최초 양산형 탑승 메카 로봇 공개 — $650K, 2.8m',
    summary: '2026.5.12 Unitree GD01 공개. 2.8m 변형가능 메카 로봇(이족→사족 전환). 500kg(탑승자 포함). 가격 RMB 390만(~$650K). 수색·구조·험지 이동용.',
    sourceName: 'CnEVPost / TheNextWeb',
    sourceUrl: 'https://cnevpost.com/2026/05/12/unitree-unveils-manned-mecha-gd01/',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree IPO 밸류에이션 $70억 — Alibaba, Tencent, ByteDance, China Mobile 투자',
    summary: 'IPO 밸류에이션 $70억(기존 $580M 목표 모집→기업가치 $70억). 투자자: Alibaba, Tencent, China Mobile, Geely, Ant Group, ByteDance(Jinqiu Capital), HongShan Capital(전 Sequoia China).',
    sourceName: 'TheNextWeb / TheOutpost',
    sourceUrl: 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Digit Mercado Libre 산안토니오 TX 풀필먼트센터 상용 배치 — 라틴아메리카 확장 계획',
    summary: 'Mercado Libre 산안토니오 TX 풀필먼트센터에 Digit 상용 배치 계약. 반복적 중량작업 자동화. 향후 라틴아메리카 물류창고 확장 예정. GXO, Amazon, Schaeffler에 이은 신규 고객.',
    sourceName: 'BusinessWire / Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 2026년 신규 로봇 발표 예정 — Jabil 양산 파트너십으로 2027 상용 수량 공급',
    summary: '2026년 내 "highly anticipated" 신규 로봇 발표 예정. Jabil 제조 파트너십���로 양산 체계 확보. Mercedes 2025-2026 파일럿 후 2027년 상업 수량 공급 계획.',
    sourceName: 'SiliconAngle / Apptronik',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik 신규 투자자: AT&T Ventures, John Deere, 카타르투자청(QIA) 합류',
    summary: '기존 투자자(B Capital, Google, Mercedes-Benz, PEAK6) 외 신규: AT&T Ventures, John Deere & Co., Qatar Investment Authority(QIA) 합류. 비 기술/자동차 산업 투자자 진입 = 시장 확대 신호.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 공장 공식 개소 (2026.4.30, Hayward CA) — 미국 최초 수직통합 휴머노이드 공장',
    summary: '2026.4.30 GlobeNewswire 발표. Hayward CA 58,000 sqft 공장 개소. 미국 최초 수직통합 휴머노이드 제조시설. 연 10,000대 생산능력. 소비자 배송 2026년 내 시작.',
    sourceName: 'GlobeNewswire / 1X',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'TrendForce: 2026 중국 휴머노이드 생산량 94% 급증 전망, Unitree+Agibot 시장 80% 장악',
    summary: 'TrendForce 2026.4.9 발표: 중국 휴머노이드 생산량 2026년 94% 급증 전망. Unitree와 Agibot 합산 중국 시장 ~80% 점유. Agibot CES 2026에서 미국 시장 진출(A2/X2/G2/D1).',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    confidence: 'A',
    category: 'production',
  },
];

const collectedArticles: CollectedArticle[] = [
  {
    companyId: 'a1b2c3d4-0001-4000-8000-000000000001', // Tesla
    title: 'Tesla delays Optimus V3 reveal, targets consumer sales end of 2027 per Q1 2026 earnings call',
    source: 'Electrek',
    url: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    publishedAt: '2026-04-22',
    summary: 'At the Q1 2026 earnings call (April 22), Musk announced that Optimus V3 reveal is pushed to closer to production start. Consumer sales now targeted for end of 2027. B2B industrial arrangements may begin late 2026. Pilot production line video released.',
    language: 'en',
    articleCategory: 'industry',
    productType: 'robot',
  },
  {
    companyId: 'a1b2c3d4-0002-4000-8000-000000000002', // Figure AI
    title: 'BMW Group deploys humanoid robots in German production for first time at Plant Leipzig',
    source: 'BMW Group Press',
    url: 'https://www.press.bmwgroup.com/global/article/detail/T0455864EN/bmw-group-to-deploy-humanoid-robots-in-production-in-germany-for-the-first-time',
    publishedAt: '2026-05-15',
    summary: 'BMW Group announces humanoid robot deployment at Plant Leipzig, Germany starting summer 2026 - first European automotive deployment. Robots will work on high-voltage battery assembly and component manufacturing. Follows successful Spartanburg pilot with Figure 02.',
    language: 'en',
    articleCategory: 'industry',
    productType: 'robot',
  },
  {
    companyId: 'a1b2c3d4-0002-4000-8000-000000000002', // Figure AI
    title: 'Figure 03 autonomously sorts 204,000+ packages in 163 hours of continuous live-streamed operation',
    source: 'Figure AI',
    url: 'https://www.figure.ai/news',
    publishedAt: '2026-05-20',
    summary: 'Figure 03 achieved autonomous sorting of 204,000+ packages over 163+ hours, live-streamed continuously. Robot sorts packages label-side down and delivers to conveyor belt. Demonstrates sustained autonomous operation without human intervention.',
    language: 'en',
    articleCategory: 'technology',
    productType: 'robot',
  },
  {
    companyId: '5f15c903-5393-42bb-bc31-1b00deacb922', // Unitree
    title: 'Unitree unveils GD01 world-first mass-produced manned mecha robot at $650K as IPO targets $7B valuation',
    source: 'CnEVPost',
    url: 'https://cnevpost.com/2026/05/12/unitree-unveils-manned-mecha-gd01/',
    publishedAt: '2026-05-12',
    summary: 'Unitree unveiled 2.8-meter GD01 transformable mecha robot (biped/quadruped switchable, ~$650K). Filed for Shanghai STAR Market IPO at $7B valuation with backing from Alibaba, Tencent, ByteDance, China Mobile. Revenue grew 335% to $235M in 2025.',
    language: 'en',
    articleCategory: 'product',
    productType: 'robot',
  },
  {
    companyId: 'e00953cf-d9b2-4c6c-bc5e-c0700a7f3a89', // Agility
    title: 'Mercado Libre signs commercial agreement with Agility Robotics to deploy Digit in San Antonio fulfillment center',
    source: 'BusinessWire',
    url: 'https://www.businesswire.com/news/home/20251210209226/en/Mercado-Libre-and-Agility-Robotics-Announce-Commercial-Agreement-to-Deploy-Humanoid-Robots',
    publishedAt: '2025-12-10',
    summary: 'Mercado Libre and Agility Robotics announced commercial agreement to deploy Digit humanoid robots at San Antonio, TX fulfillment center. Focus on automating repetitive physical tasks. Plans to expand to Latin America logistics operations.',
    language: 'en',
    articleCategory: 'industry',
    productType: 'robot',
  },
  {
    companyId: 'a1b2c3d4-0004-4000-8000-000000000004', // 1X
    title: '1X officially opens NEO factory in Hayward, CA — Americas first vertically integrated humanoid robot factory',
    source: 'GlobeNewswire',
    url: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    publishedAt: '2026-04-30',
    summary: '1X Technologies officially opened 58,000 sq ft NEO factory in Hayward, California on April 30, 2026. Americas first vertically integrated humanoid robot manufacturing facility. 10,000 units/year capacity, entire first year sold out in 5 days. Consumer shipments planned for 2026.',
    language: 'en',
    articleCategory: 'industry',
    productType: 'robot',
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

function contentHash(title: string, url: string): string {
  return createHash('md5').update(`${title}|${url}`).digest('hex');
}

export async function insertCiUpdate20260608() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-06-08) ===\n');

  let alertsInserted = 0;
  let alertsSkipped = 0;

  // Insert ci_monitor_alerts
  for (const item of collectedAlerts) {
    const dup = await isDuplicateAlert(item.headline);
    if (dup) {
      console.log(`  ⏭️  중복 건너뜀: ${item.headline.substring(0, 50)}...`);
      alertsSkipped++;
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
        collectedAt: '2026-06-08',
      },
      sourceChannel: 'auto_scan',
      status: 'pending',
    });

    console.log(`  ✅ [${item.confidence}] ${item.competitorSlug}: ${item.headline.substring(0, 60)}...`);
    alertsInserted++;
  }

  // Insert articles
  let articlesInserted = 0;
  let articlesSkipped = 0;

  for (const art of collectedArticles) {
    const hash = contentHash(art.title, art.url);
    const existing = await db.select().from(articles).where(eq(articles.contentHash, hash)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭️  기사 중복: ${art.title.substring(0, 50)}...`);
      articlesSkipped++;
      continue;
    }

    await db.insert(articles).values({
      companyId: art.companyId,
      title: art.title,
      source: art.source,
      url: art.url,
      publishedAt: new Date(art.publishedAt),
      summary: art.summary,
      language: art.language,
      contentHash: hash,
      category: art.articleCategory,
      productType: art.productType,
    });

    console.log(`  ✅ 기사: ${art.title.substring(0, 60)}...`);
    articlesInserted++;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`ci_monitor_alerts: ${collectedAlerts.length}건 중 ${alertsInserted}건 삽입, ${alertsSkipped}건 중복`);
  console.log(`articles: ${collectedArticles.length}건 중 ${articlesInserted}건 삽입, ${articlesSkipped}건 중복`);
  console.log(`ci_staging: ${alertsInserted}건 삽입`);
}

// 직접 실행 시 (npx tsx ...)
const isDirectRun = process.argv[1]?.includes('insert-ci-update-2026-06-08');
if (isDirectRun) {
  insertCiUpdate20260608()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ CI 업데이트 실패:', err);
      process.exit(1);
    });
}
