/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-24
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-24.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-24)
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
    layerSlug: 'sw',
    headline: 'Unitree "자기진화 개발 루프" AI 전략 공개 (10/22) — LLM 기반 자동 제어코드 생성·검증·피드백 시스템, 2028년 음성 지시 80% 자율 수행 전망',
    summary: 'Unitree 창업자 Wang Xingxing이 10/22 World Physical AI Conference에서 "자기진화(self-evolving) 개발 루프" AI 전략을 발표. AI 대형 모델이 핵심으로, 규칙·경험 프레임워크·제약 도구를 커스터마이징하여 모델이 자율적으로 논문·오픈소스 솔루션을 탐색하고 제어 코드를 생성, 시뮬레이션+실제 데이터+인간 행동 데이터를 결합한 평가·피드백 루프를 운영. Wang은 "일반화 능력 부족"이 최대 병목이라 지적하면서도 2028년까지 음성 지시 작업의 80% 자율 수행을 전망. "로보틱스의 ChatGPT 모멘트"까지 2~10년 소요 추정.',
    sourceName: 'Bloomberg / Business Chief / TrendForce',
    sourceUrl: 'https://businesschief.com/news/unitree-robotics-are-10-years-away-from-chatgpt-moment',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── 규제 동향 (산업 전체) — Unitree/Agibot 직접 영향 ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'IDC: FCC 외국산 로봇 금지로 미국 휴머노이드 매출 2030년까지 기준선 대비 58% 하락 전망 (10/23) — $60억+ 기회비용',
    summary: 'Fortune 10/23 보도. IDC 무역정책 모델에 따르면 FCC의 7월 외국산 로봇 장비 인가 금지로 인해 미국 휴머노이드 로봇 매출이 2027년까지 41%, 2030년까지 58% 기준선 대비 하락 전망. 총 $60억+ 매출 기회비용. 중국 벤더(Unitree, Agibot 등)가 글로벌 휴머노이드 출하량의 약 95% 차지(IDC 추정). 다만 일부 애널리스트는 중국 제조사의 유럽 시장 피벗으로 실제 영향이 제한적일 수 있다고 반론. IDC 원본 분석은 8월 발행, Fortune이 10/23 업데이트된 수치를 보도.',
    sourceName: 'Fortune / IDC',
    sourceUrl: 'https://fortune.com/2026/10/23/fcc-robot-ban-humanoid-revenue-idc',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 합병 주주 투표 11월 2일 확정 — SEC S-4 10/13 유효, $620M+ 조달 후 Nasdaq "AGLT" 상장 예정',
    summary: 'Churchill Capital Corp XI이 Agility Robotics와의 $2.5B SPAC 합병을 위한 주주 투표를 11월 2일로 확정. SEC가 10/13 공동 S-4 등록문서를 유효 선언, 9/14 기준일 주주에게 확정 대리권유서 배포 완료. 비상환 가정 시 $620M+ 조달(트러스트 $424M + Foxconn 주도 PIPE $200M). 승인 시 11월 내 거래 마감, Nasdaq "AGLT" 티커 상장 예정. 다만 상환률에 따라 실 조달 금액 감소 가능, 2026 상반기 순매출 $174K으로 현 밸류에이션 대비 얇은 매출 기반 지적 존재.',
    sourceName: 'SEC Filing / Pulse2 / FourWeekMBA',
    sourceUrl: 'https://pulse2.com/agility-robotics-and-churchill-capital-corp-xi-move-620-million-spac-deal-toward-november-vote/',
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

export async function insertCiUpdate20261024() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-24) ===\n');

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
        collectedAt: '2026-10-24',
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

insertCiUpdate20261024()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
