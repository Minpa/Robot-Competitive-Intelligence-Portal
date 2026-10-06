/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-10-06
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-10-06.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-10-06)
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
    headline: 'Tesla AI5 칩 메모리 144GB→96GB 삭감 결정 — Optimus 양산 원가·공급 최적화, Micron 대량 할당 확보',
    summary: 'Tesla가 차세대 AI5·AI6 칩의 LPDDR5 메모리를 144GB에서 절반인 72GB로 줄이겠다 발표 후, 수시간 만에 96GB로 상향 재조정. Musk는 "메모리 대역폭이 총량보다 Optimus 성능에 더 중요하므로 영향 미미"라고 설명. Micron CEO는 향후 휴머노이드 로봇당 200GB+ 메모리와 수 TB 스토리지가 필요할 것으로 전망. Micron이 Tesla에 "매우 상당한 규모의 합리적 조건" 메모리 칩 할당을 제공 중. 양산 원가 절감과 공급망 병목 해소를 동시 추구하는 전략적 결정.',
    sourceName: 'Benzinga / IBTimes / Drive Tesla Canada / CryptoBriefing',
    sourceUrl: 'https://www.benzinga.com/markets/tech/26/10/62125996/elon-musk-tesla-optimus-memory-micron-humanoid-robots',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Boston Dynamics GR3 핸드 공개 (10/2) — 13 DOF 4핑거, 직접구동+밀집 촉각센서, 공구 조작 가능',
    summary: 'Boston Dynamics가 10월 2일 Atlas용 차세대 핸드 GR3를 공개. 기존 7 DOF에서 13 DOF로 거의 2배 증가. 4개 손가락(새끼손가락 제거 — 추가 복잡성 대비 효용 부족 판단), 4 DOF 대향 엄지, 직접 구동 방식, 손가락·손바닥 전체에 밀집 촉각 압력 센서 배치. 드릴, 파워 토크 드라이버, 그라인더, 네일건, 용접 토치 등 공구 조작 가능. 인핸드 물체 재배향, 핀치·삼지 파지, 미끄러짐 복구 등 고급 매니퓰레이션 수행. 대형 인간 손 크기로 설계, 대량생산 고려 설계.',
    sourceName: 'The Robot Report / IEEE Spectrum / Robotics & Automation News / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-drops-pinkie-on-new-humanoid-hand/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 누적 1,000대 생산 달성 (7/23) — BotQ 연간 12,000대 용량, 수율 80%+, 배터리 수율 99.3%',
    summary: 'Figure AI가 7월 23일 Figure 03 1,000번째 유닛 생산 마일스톤 달성. BotQ 캘리포니아 공장은 연간 12,000대 생산 용량 보유. 생산 수율 80% 초과, 배터리 수율 99.3%에 도달. 9,000개+ 액추에이터 생산 완료. 150+ 네트워크 워크스테이션과 50+ 검사 체크포인트 운영. 확대된 생산은 로봇 자율 능력 향상의 핵심 데이터 생성도 가속화. 4월 약 350대에서 3개월 만에 1,000대 달성.',
    sourceName: 'ai2.work / Figure AI',
    sourceUrl: 'https://ai2.work/blog/figure-botq-hits-one-robot-per-hour-in-24x-production-breakthrough',
    confidence: 'A',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Agility–FORT Robotics 전략적 MOU 체결 (10/1) — Digit 5 3중 안전 아키텍처 구축, Offboard Safety Bridge 공동 개발',
    summary: 'Agility Robotics와 FORT Robotics가 10월 1일 Digit 5 안전 인프라에 대한 전략적 MOU를 체결. 수년간의 협력을 확대하여 3중 안전 아키텍처 구축: (1) 안전 펜던트, (2) 온로봇 통신, (3) 외부 안전 시스템 연결 오프보드 인터페이스. Offboard Safety Bridge를 공동 개발하여 Digit과 외부 안전 시스템 간 독립적 보호 레이어 제공. 공동 하드웨어 개발, 솔루션 엔지니어링, 규제 준수, 배치 지원을 포괄. Digit 5의 Safe Human Detection 시스템과 상호보완.',
    sourceName: 'Unite.AI / FinViz / The AI Insider / HumanoidDaily',
    sourceUrl: 'https://www.unite.ai/?p=477317',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility 애널리스트·투자자 데이 개최 (10/6) — Digit 5 상용 모멘텀·기술 로드맵·스케일링 전략 공개',
    summary: 'Agility가 10월 6일 12:30 PM ET 뉴욕에서 애널리스트·투자자 데이를 개최. 경영진이 Digit 5 상용 모멘텀, 기술 로드맵, 스케일링 전략, 장기 재무 기회를 발표. SPAC 합병($2.5B 기업가치) 후 첫 대규모 투자자 행사. Digit 5는 사이클로이드 액추에이터 레그, 교체 가능 그리퍼, NVIDIA Halos 기반 협력안전 아키텍처를 탑재하며, 2027년 상반기 얼리 액세스, 2027년 말 GA 예정.',
    sourceName: 'BusinessWire / RoboticsTomorrow / StockTitan',
    sourceUrl: 'https://www.businesswire.com/news/home/20260917748768/en/Agility-to-Host-Analyst-Investor-Day-on-October-6-2026',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'safety',
    headline: 'Forbes: Agility "500대 로봇의 안전을 보장하라" — 단일 로봇이 아닌 플릿 단위 안전 설계 전략 공개',
    summary: 'Forbes가 10월 1일 Agility의 안전 전략 심층 보도. 핵심 메시지: "1대가 아닌 500대 휴머노이드 로봇의 안전을 보장하는 것"이 과제. 플릿 단위 안전 설계, 협력안전(cooperative safety) 시스템, 케이지 없는 인간 근접 작업, 규제 선도(CE 마크 추진) 전략을 상세 공개. 산업용 휴머노이드 상용화에서 안전이 기술만큼 중요한 차별화 요소임을 강조. 500대 규모 배치에서의 안전 관리 프레임워크 제시.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/10/01/agility-robotics-wants-to-make-500-humanoid-robots-safe-not-just-one/',
    confidence: 'A',
    category: 'regulation',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik CEO: 美 휴머노이드 산업 액추에이터 공급난 경고 — BOM의 60%, FCC 외국산 로봇 금지가 부품난 악화',
    summary: 'Apptronik CEO Jeff Cardenas가 Fox Business에서 미국 휴머노이드 로봇 산업의 심각한 액추에이터 공급 부족을 경고. 액추에이터가 로봇 BOM의 최대 60%를 차지하나 미국에 필요한 기어 공급 기반이 부재. 모터용 희토류 소재 제약도 병행. FCC의 7월 28일 외국산 휴머노이드·쿼드러펫 로봇 장비 인가 금지(주로 중국 제조사 Unitree 등 타격)가 오히려 미국 기업들의 부품 공급망도 압박. Apptronik의 핵심 IP인 리니어 액추에이터 기술이 공급난 속 경쟁 우위로 부각.',
    sourceName: 'Fox Business / HumanoidDaily / StartupFortune',
    sourceUrl: 'https://www.humanoidsdaily.com/news/apptronik-cardenas-us-humanoid-parts-shortage',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree H2 Plus 북미 공급 개시 (9/24) — Toborlife AI 유통, 펜타곤 중국군사기업 지정·FCC 금지 속 기존 모델 판매',
    summary: 'Unitree H2 Plus가 9월 24일 Toborlife AI를 통해 북미 시장 공급 개시. 단, 6월 펜타곤이 Unitree를 "중국 국방산업 기반 기여자"로 지정하여 미 군사 기술 활용 제한. 7월 FCC 외국산 휴머노이드 장비 인가 금지로 신규 모델 미국 인가 차단, 기존 인가 모델은 판매 가능. IPO 첫날(8/19) 629% 급등 후 주가 40% 하락, 피크 대비 약 $35B 시가총액 소실. H2 가격 $29,900로 H1($90,000) 대비 대폭 인하. G1 $13,500 라인업으로 저가 시장 장악 지속.',
    sourceName: 'CNBC / ABC News / BusinessDay / NewsBytesApp',
    sourceUrl: 'https://www.local10.com/tech/2026/08/19/shares-in-chinese-humanoid-robot-maker-unitree-soar-in-shanghai-trading-debut/',
    confidence: 'B',
    category: 'production',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: '1X NEO 핸드 25 DOF 상세 공개 (7월) — 인간 손 수준 접근, 가정용 범용 매니퓰레이션 설계',
    summary: '1X Technologies가 7월 NEO의 핸드 상세 스펙을 공개. 25 DOF로 인간 손 수준의 조작 능력에 접근. 가정 환경 내 다양한 물체 파지·조작을 위해 설계. NEO 본체는 5피트 6인치, 의도적으로 젠더리스 디자인, 22dB 저소음(냉장고 수준) 작동. $20,000 얼리 액세스(2026년 말 첫 인도) 또는 $499/월 구독. 사전주문 10,000대 5일 만에 완판. 초기 배치는 텔레오퍼레이션 병행으로 OpenAI+1X 자체 AI가 실제 가정 데이터 학습.',
    sourceName: 'The Robot Report / eWeek / NotebookCheck / Fortune',
    sourceUrl: 'https://www.therobotreport.com/1x-announces-pre-order-launch-neo-humanoid-robot/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 분기당 5,000대 생산 템포 유지 — 일 55대, Chimelong 300대+ 배치 이후 관광·호텔 섹터 확장',
    summary: 'Agibot이 2025년 말 이후 3개 연속 분기 동안 분기당 약 5,000대(일 약 55대) 생산 템포를 유지. Chimelong Spaceship Park 300대+ 배치(9/24) 이후 Chimelong과 관광·호텔 체화 AI 공동연구소를 설립, 추가 배치 확대 계획. 엔터테인먼트·과학교육·가이드투어·리테일·AI 컴패니언·호텔서비스·스포츠 등 7개 시나리오에서 고정 서비스 스케줄로 운영. 관광 섹터 최대 규모 휴머노이드 배치 사례 구축.',
    sourceName: 'TechRepublic / Blooloop / OriginOfBots / Korea Herald',
    sourceUrl: 'https://www.originofbots.com/news/agibot-deploys-over-300-humanoid-robots-at-chimelong-spaceship-park-following-20000th-unit-milestone',
    confidence: 'A',
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

export async function insertCiUpdate20261006() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-10-06) ===\n');

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
        collectedAt: '2026-10-06',
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

insertCiUpdate20261006()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
