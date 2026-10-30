/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-30
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-30.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-30)
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
  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'AGIBOT Innovation Day 2026 (10/29) — Worken 생산성 지표 프레임워크 발표, H1 2026 매출 20억 위안(~$300M) 근접 확인',
    summary: 'AGIBOT이 2026년 10월 29일 상하이에서 Innovation Day 2026을 개최. 핵심 발표: (1) "Worken" — 실환경에서 로봇의 생산적 작업량을 측정하는 새로운 프레임워크 도입. 로봇 ROI 입증을 위한 표준 지표 체계. (2) 공동창업자 펑즈후이(彭志辉)가 H1 2026 매출이 20억 위안(약 $300M)에 근접했다고 밝힘. (3) 누적 생산량 2026년 9월 기준 20,000대 돌파(3월 10,000대→6월 15,000대→9월 20,000대). PR Newswire를 통한 공식 보도자료 배포.',
    sourceName: 'PR Newswire / Robotics & Automation News / Global Times',
    sourceUrl: 'https://www.prnewswire.com/apac/news-releases/agibot-introduces-worken-to-measure-productive-robot-work-at-agibot-innovation-day-2026-302923481.html',
    confidence: 'A',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'AGCO, Agility Robotics와 Digit 파일럿 상업 계약 체결 (10/20) — 캔자스 Hesston 농기계 공장, 2027년 시작 예정',
    summary: 'AGCO Corporation이 2026년 10월 20일 Agility Robotics와 Digit 휴머노이드 로봇 파일럿 상업 계약을 체결. 캔자스주 Hesston 농기계 생산 시설에서 2027년 파일럿 시작 예정. 부품 분류(parts sorting), 적재(stacking), 토트(tote) 보관 배치 등 물류·핸들링 작업이 초기 범위. AGCO 제조기술 디렉터는 휴머노이드 로봇과 AI가 유연한 공장 구축의 핵심 "팀메이트"라고 언급. 농기계 제조 분야 최초의 휴머노이드 배치 사례.',
    sourceName: 'GlobeNewsWire / Robotics 24/7 / Automate.org',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/20/3384385/0/en/agco-and-agility-robotics-advance-smart-manufacturing-with-humanoid-robot-pilot-in-hesston-kansas-facility.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics 상업 모멘텀 업데이트 (10/26) — 30+사 고객 협의 중, Toyota Motor Manufacturing Canada 상업 계약 체결',
    summary: 'Agility Robotics가 2026년 10월 26일 GlobeNewsWire를 통해 상업 모멘텀 업데이트 발표. 30개 이상의 잠재 고객이 활발한 협의(active discussions) 또는 Customer Acceleration Program에 참여 중. Toyota Motor Manufacturing Canada가 파일럿 성공 후 상업 계약을 체결한 것으로 확인. 기존 GXO NC/TN 확대, AGCO 캔자스에 이어 고객 포트폴리오 급속 확장. Amazon·AGCO·GXO·Toyota Canada가 주요 상업 고객으로 확인됨.',
    sourceName: 'GlobeNewsWire / Agility Robotics',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/10/26/3388115/0/en/agility-robotics-highlights-commercial-momentum-and-growing-enterprise-demand-for-digit-humanoid-robot.html',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 상장 절차 진행 — Churchill Capital XI 합병, SEC 등록명세서 10/13 효력 발생, $2.5B 밸류에이션',
    summary: 'Agility Robotics의 Churchill Capital Corp XI(NASDAQ: CCXI) 합병을 통한 SPAC 상장이 본격 진행. SEC가 2026년 10월 13일 등록명세서(registration statement)의 효력 발생을 선언. 합병 전 기업가치(pre-money equity) $2.5B, 총 조달 예상 $620M+(CCXI 신탁 $420M + Foxconn 주도 PIPE $200M). 합병 후 티커 "AGLT"로 Nasdaq 상장 예정. 주주 투표·규제 승인이 남아 있으며, 2026년 12월 31일까지 미완료 시 양측 철회 가능. Mark Vale가 합병 후 감사위원장 합류 예정.',
    sourceName: 'Verdict / OODA Loop / Silicon Florist',
    sourceUrl: 'https://www.verdict.co.uk/agility-to-merge-churchill-capital/',
    confidence: 'A',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2-X 공개 시연 중 다리 이탈 사고 (10/22) — 항저우 World Physical AI Conference에서 측면 회전 중 관절 분리',
    summary: 'Unitree Robotics의 신형 보안·구조용 휴머노이드 H2-X가 2026년 10월 22일 항저우 World Physical AI Conference에서 공개 시연 중 사고 발생. 무술(쿵푸) 동작 시연 중 측면 회전(side flip) 착지 실패, 측면으로 쓰러지며 하체 다리 1개가 관절 연결부에서 완전 분리. H2-X는 10/21 공개 직후 첫 외부 시연에서 사고. 보안·구조 작업용으로 마케팅되며, 홍보 영상에서 자동차 발로 차기·4m 높이 점프 등을 선보였으나 신뢰성 의문 제기. Unitree는 10/30 현재까지 공식 코멘트 미발표. 자율/원격/사전프로그래밍 여부도 미공개.',
    sourceName: 'TechNode / The CSR Journal / Global Times',
    sourceUrl: 'https://technode.com/2026/10/26/unitrees-newly-launched-h2-x-robot-loses-a-leg-in-public-demonstration/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree G1 누적 생산량 10,000~20,000대 확인 (10/22) — 왕싱싱(王兴兴), 세계 최다 판매 휴머노이드 주장',
    summary: 'Unitree Robotics 창업자 왕싱싱(Wang Xingxing)이 2026년 10월 22일 항저우 "2026 World Physical AI Conference 및 Unitree 파트너 에코시스템 컨퍼런스"에서 G1 누적 생산량이 10,000~20,000대(2024년 5월 출시 이래)라고 밝히며 "세계 최다 판매 휴머노이드"라고 주장. 다만 생산 용량 및 AI 기술 측면에서 여전히 제약이 있다고 인정. Digitimes는 상한 20,000대에 더 가까운 것으로 추정. Agibot(20,000대 돌파)과의 누적 생산량 1위 경쟁이 치열.',
    sourceName: 'Digitimes / BigGo Finance',
    sourceUrl: 'https://www.digitimes.com/news/a20261022PD252/production-robot-2026-development-production-capacity.html',
    confidence: 'A',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 사전주문 10,000대 5일 만에 완판 — 텔레오퍼레이션 의존 공개에도 수요 유지',
    summary: '1X Technologies의 NEO 가정용 휴머노이드가 $20,000 가격에 약 10,000대 사전주문이 5일 만에 완판. 원격 "Turing" 오퍼레이터 의존 모델이 10월 22일 공개된 이후에도 주문 취소 없이 판매 유지된 것이 주목점. 다만 독립적으로 확인된 고객 인도 사례는 여전히 미확인. Hayward 공장 연간 10,000대 생산 용량. 별도로 SoftBank가 $6B 밸류에이션으로 1X 과반 지분 인수를 협상 중이라는 8월 The Information 보도가 있으나, 10월 현재 합의 여부 미확인.',
    sourceName: 'Startup Fortune / eWeek / The Information',
    sourceUrl: 'https://startupfortune.com/1x-neo-robot-sells-out-preorders-even-after-teleoperation-reveal/',
    confidence: 'B',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BotQ 생산라인, 시간당 1대 속도 달성 — 연 12,000대 용량, 80%+ 초기 검사 통과율',
    summary: 'Figure AI의 BotQ(로봇 공장)가 Figure 03 생산에서 시간당 1대(연간 약 12,000대) 생산 속도를 달성. 약 120일 전 하루 1대 수준 대비 대폭 개선. 완성 로봇의 80% 이상이 최종 검사(final inspection)를 첫 시도에 통과. 복수 2차 매체에서 누적 1,000대 이상 Figure 03 생산을 보도하나, Figure AI의 공식 확인은 없음. BMW Spartanburg 배치 이후 Figure 03의 대규모 고객 배치가 다음 마일스톤. Figure 04 디자인 락 진입과 Helix 3.0 AI 모델 개발이 병행 중.',
    sourceName: 'eWeek / Forge Global / Humanoids Daily',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
    confidence: 'B',
    category: 'production',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind Genie 4 월드 모델, Apollo 체커 게임 시뮬레이션 시연 (10/27-28) — 텍스트 캡션 기반 실시간 세계 모델',
    summary: 'Google DeepMind가 2026년 10월 27~28일에 공개한 Genie 4 실시간 월드 모델에서 Apptronik Apollo를 활용한 체커(checkers) 게임 시뮬레이션 시연. 각 스텝을 텍스트 캡션으로 수신하며 물리 환경을 예측·시뮬레이션하는 방식. 물리적 로봇이 아닌 가상 환경 시연이나, Gemini 4 Argon(10/22 시연)에 이어 DeepMind-Apptronik 파트너십의 AI 파이프라인이 Genie 4 → Argon → 실로봇 전이로 확장되는 흐름. Genie 4는 네이티브 오디오를 갖춘 범용 월드 모델로 발표.',
    sourceName: 'MarkTechPost / The Decoder',
    sourceUrl: 'https://marktechpost.com/2026/10/28/google-deepmind-genie-4-world-model',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'BD, 한국 부품사에 Atlas 10,000대분 구매 준비 요청 (10/27) — KED Global 보도, 최종 물량·가격 미확정',
    summary: 'KED Global 10/27 보도. Boston Dynamics가 한국 협력 부품사(Hyundai Mobis 등)에 Atlas 10,000대분의 구매 준비(purchase order preparation)를 요청한 것으로 확인. 다만 이는 최종 확정 주문이 아닌 준비 요청이며, 최종 물량·단가는 미확정. 기존 발표된 Hyundai Motor Group 25,000대 배치 계획(2028~2030)의 초기 물량에 해당하는 것으로 추정. Hyundai Mobis(관절 액추에이터)·화신정공(알루미늄 구조체) 등 핵심 공급망이 한국 자동차 부품 생태계를 기반으로 구축되고 있음. Goldman Sachs는 5만대 규모 시 단가 $30K 수준 하락을 전망.',
    sourceName: 'KED Global / Humanoids Daily',
    sourceUrl: 'https://www.kedglobal.com/robotics/newsView/ked202610270008',
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

export async function insertCiUpdate20261030() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-30) ===\n');

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
        collectedAt: '2026-10-30',
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

insertCiUpdate20261030()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
