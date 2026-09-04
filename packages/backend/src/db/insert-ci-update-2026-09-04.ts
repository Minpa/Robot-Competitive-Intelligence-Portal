/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-04
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-04.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-04)
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
  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market 상장 첫날 460% 폭등 — 시가총액 $530억, 소매 8,000배 초과청약',
    summary: '2026.8.19 Unitree(688836.SH) 상해 STAR Market 상장. IPO가 ¥150.80에서 첫날 종가 ¥845(+460%), 장중 최고 +629%. 소매 투자자 8,000배 초과청약. 시가총액 ¥3,420억(~$530억), MetaX·Moore Threads 등 최근 기술 IPO를 크게 상회. 중국 본토 최초 휴머노이드 로봇 상장사로서 글로벌 로보틱스 시장 투자 열기 점화.',
    sourceName: 'Bloomberg / Fortune',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-08-18/unitree-robotics-set-to-debut-after-904-million-shanghai-ipo',
    confidence: 'A',
    category: 'funding',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot·Unitree IFA 2026 베를린 "Robots on the Runway" 헤드라인 — IFA 역사상 최초 로봇 캣워크',
    summary: '2026.9.4~8 IFA 2026(베를린 Messe) 개막. Agibot과 Unitree가 IFA 역사상 최초 "Robots on the Runway" 캣워크 헤드라인. 932개 중국 기업 참가, 1,900+ 브랜드, 49개국, 220,000+ 방문객 예상. Creator Stage에서 9/5 12:45 로봇 런웨이 쇼. 휴머노이드 로봇의 소비자 가전 시장 진입을 상징하는 이벤트.',
    sourceName: 'IFA Berlin / Cryptopolitan',
    sourceUrl: 'https://www.cryptopolitan.com/unitree-agibot-ifa-2026-robot-runway/',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Fulin Precision Engineering 파트너십: 자동차 부품 공장에 ~100대 Yuanzheng 로봇 배치',
    summary: '2026년 8월 Agibot이 자동차 부품 제조사 Fulin Precision Engineering과 수천만 위안 규모 파트너십 체결. Fulin 공장에 약 100대 Yuanzheng(원정) 시리즈 로봇 배치 예정. 자동차 제조 분야에서의 실제 산업 배치 확대를 입증하는 사례.',
    sourceName: 'South China Morning Post',
    sourceUrl: 'https://www.scmp.com/tech/tech-trends/article/3363544/agibot-overtakes-unitree-top-global-humanoid-robot-vendor-first-half-amid-ipo-push',
    confidence: 'B',
    category: 'partnership',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai, SoftBank 잔여 ~10% 지분 $3.25억에 인수 — Boston Dynamics 완전 자회사화',
    summary: '2026.7.16 Hyundai Motor Group이 SoftBank의 Boston Dynamics 잔여 지분(~10%)을 약 $3.25억에 인수, BD를 완전 자회사로 편입. SoftBank가 2021년 계약상 풋옵션 행사. BD 기업가치 ~$33억(2021년 인수 시와 동일). Hyundai의 로봇 전략 강화: 2028년까지 Hyundai·Kia 공장에 25,000대+ Atlas 배치 계획.',
    sourceName: 'Bloomberg / Hyundai',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-07-16/hyundai-to-buy-softbank-s-boston-dynamics-stake-in-robot-push',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'Hyundai 울산 35,000명 파업 — 자동차 업계 최초 휴머노이드 로봇 배치 반대 쟁의',
    summary: '2026년 7월 Hyundai 울산 공장 35,000명 노조원 파업. 자동차 산업 역사상 최초로 휴머노이드 로봇 배치를 명시적 원인으로 한 공장 가동 중단. Hyundai의 Atlas 로봇 25,000대 배치 계획에 대한 고용 불안이 직접적 원인. 휴머노이드 로봇의 대규모 산업 도입에 따른 노동 갈등의 시작을 알리는 사건.',
    sourceName: 'TechTimes / Carscoops',
    sourceUrl: 'https://www.techtimes.com/articles/320993/20260720/hyundai-workers-walk-out-auto-industrys-first-humanoid-robot-strike.htm',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Tesla Optimus ──
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Tesla Q2 2026 주주서한: Optimus 생산 라인 "설치 중", 당초 7~8월 → "올해 말" 지연',
    summary: '2026.7.22 Tesla Q2 주주서한: Fremont Optimus 생산 라인이 아직 설치 중이며 생산 시작은 "올해 후반"으로 지연. 당초 2026년 7~8월 생산 개시 계획에서 후퇴. AI5 칩 탑재는 2027년 중반 양산까지 대기. 의미 있는 외부 매출은 2027년 말 이전 어려울 전망.',
    sourceName: 'Tesla IR / Teslarati',
    sourceUrl: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q1-2026-Update.pdf',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Optimus Gen 3 Fremont 내부 배치 1,000~1,200대 — 배터리 조립·케이블 라우팅 등 수행',
    summary: '2026년 현재 Tesla Fremont 공장에 1,000~1,200대 Optimus Gen 3 내부 배치. 수행 작업: 배터리 조립, EV 팩 로딩, 케이블 라우팅, 커넥터 시팅, 부품 핸들링. 외부 판매는 0건. 자체 공장 실전 데이터 축적 단계로, 외부 B2B는 2026년 말 소규모 프리미엄 가격으로 시작 예정.',
    sourceName: 'IIoT World / ifactoryapp.com',
    sourceUrl: 'https://www.iiot-world.com/smart-manufacturing/tesla-optimus-manufacturing-2026/',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: 'NEO 하드웨어 업그레이드(7/9): 25 DOF 텐던 구동 핸드, 촉각 핑거팁, IP68 방수 등급',
    summary: '2026.7.9 NEO 하드웨어 업그레이드: 25 DOF 텐던 구동(tendon-driven) 핸드, 촉각 핑거팁(tactile fingertips)과 슬립 감지(slip detection), IP68 방수/방진 등급. 첫 고객 배송 유닛에 적용. 가정용 로봇의 조작 정밀도와 내구성을 대폭 강화.',
    sourceName: 'RoboZaps / eWeek',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 고객 배송 미검증 — "올해 일부, 나머지 추후" 안내에 그쳐',
    summary: '2026.7.16 기준 NEO 실제 고객 인도 확인 사례 0건. 1X 공식 자료도 첫 배송을 미래형으로 기술. "some of you will get your NEO this year, some will get them later" 안내. 10,000대 사전판매 완판에도 불구하고 실제 인도 지연 가능성 상존. 가격: $20,000(Early Access) 또는 월 $499 구독.',
    sourceName: 'eWeek / heise online',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI $390억 밸류에이션 유지 — 2차 시장 Forge Global $174/주로 디스카운트 시사',
    summary: '2026.9 기준 Figure AI 최종 프라이머리 밸류에이션 $390억(2025.9 Series C, $10억+). 이후 신규 펀딩 라운드 없음. 2차 시장(Forge Global): 8/13 기준 $174/주, Nasdaq Private Market 6/16 기준 $162.71. 프라이머리 대비 약간의 밸류에이션 압축 관측. IPO 추진 시 밸류에이션 조정 가능성.',
    sourceName: 'Sacra / Seeking Alpha',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'B',
    category: 'funding',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility SPAC 합병 9월 중 완료 전망 — AGLT 티커로 나스닥 상장, ~100대 유료 배치 중',
    summary: '2026.6.24 발표된 Churchill Capital Corp XI(CCXI)와의 SPAC 합병이 9월 중 완료될 전망. 나스닥 티커 AGLT. 총 조달 $6.2억+(CCXI 트러스트 $4.2억 + Foxconn 주도 PIPE $2억). 현재 ~100대 Digit이 GXO, Schaeffler, Toyota Canada, Mercado Libre 등 9개 고객 시설에서 유료 가동 중. 미국 최초 순수 휴머노이드 로보틱스 상장사.',
    sourceName: 'GeekWire / Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
    confidence: 'B',
    category: 'funding',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $9.35억 완결 — $5.3B 밸류에이션, AT&T·John Deere·QIA 신규 합류',
    summary: 'Apptronik이 $5.2억 Series A 확장 라운드를 클로즈하여 Series A 총액 $9.35억+ 달성. 포스트머니 밸류에이션 $5.3B(초기 Series A 대비 3배). 신규 투자자: AT&T Ventures, John Deere, Qatar Investment Authority(QIA). 기존 투자자: B Capital, Google, Mercedes-Benz, PEAK6. 총 누적 조달 ~$10억. Apollo 양산 확대, 글로벌 배치, 훈련 시설 구축에 투입.',
    sourceName: 'CNBC / Globe Newswire',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
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

export async function insertCiUpdate20260904() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-04) ===\n');

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
        collectedAt: '2026-09-04',
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

insertCiUpdate20260904()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
