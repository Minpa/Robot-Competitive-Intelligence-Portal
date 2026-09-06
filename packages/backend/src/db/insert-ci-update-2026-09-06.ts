/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-09-06
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-09-06.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-09-06)
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
    headline: 'Tesla Optimus V3 양산 준비 — Fremont 라인 설치 중, 당초 7~8월에서 올해 말로 지연',
    summary: 'Tesla Q2 2026 주주서한에 따르면 Fremont Optimus 생산 라인이 아직 설치 중이며 생산 시작이 "올해 후반"으로 지연. 당초 2026년 7~8월 목표. V3 핸드는 Gen 2 대비 자유도 2배, 전완 액추에이터에서 힘줄로 구동. 외부 상업 판매는 $20K~30K 가격대로 2026년 내 소규모 시작 전망.',
    sourceName: 'Tesla IR / TrendForce',
    sourceUrl: 'https://www.trendforce.com/news/2026/07/03/news-musk-shares-tesla-optimus-production-team-photo-says-initial-robot-output-will-be-extremely-slow/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Tesla 텍사스 기가팩토리에 연간 1,000만대 Optimus 생산 2세대 라인 설계 중',
    summary: 'Fremont에 연 100만대 1세대 로봇 공장 구축 진행 중(Model S/X 라인 전환). 텍사스 기가팩토리에는 연 1,000만대 규모의 2세대 라인 설계 중. Optimus 부품 10,000개 이상으로 완전히 새로운 생산 라인 필요. 현재 Fremont에 1,000~1,200대 Gen 3 내부 배치, 배터리 조립·케이블 라우팅 등 수행.',
    sourceName: 'The Robot Report / iFactory',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Boston Dynamics, Tesla Optimus 전 SVP Milan Kovac 영입 — Tesla 로봇 인재 유출',
    summary: 'Hyundai 산하 Boston Dynamics가 Tesla Optimus 프로그램 전 SVP Milan Kovac를 그룹 어드바이저 겸 사외이사로 영입. Tesla의 휴머노이드 로봇 핵심 인재 유출로, 경쟁사 간 인재 쟁탈전 심화.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/guides/tesla-optimus/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 상용 버전 CES 2026 공개 — 리치 7.5ft, 적재 50kg, IP65, 듀얼 교체형 배터리 4시간',
    summary: 'CES 2026에서 양산형 Atlas 공개. 주요 스펙: 리치 7.5ft, 적재 110lb(50kg), 작동 온도 -20°C~40°C, 듀얼 스왑형 배터리로 4시간 연속 작동. 2026년 전체 생산분 이미 완판(Hyundai RMAC, Google DeepMind 우선 배치). 2027년 추가 고객 확대 예정.',
    sourceName: 'Engadget / Forbes',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    headline: 'Hyundai 연 30,000대 Atlas 공장 계획 — Google DeepMind Gemini Robotics AI 통합',
    summary: 'Hyundai Motor Group이 연 30,000대 규모 로봇 공장 계획 발표. Boston Dynamics는 Google DeepMind와 협력해 Gemini Robotics 모델을 Atlas에 통합, 자율 인지·작업 수행·자율 운영 강화. 2026년 배치분 완판, SoftBank 잔여 지분 $3.25억 인수로 완전 자회사화.',
    sourceName: 'Forbes / Bloomberg',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/01/06/atlas-humanoid-robots-production-fully-committed-for-2026-factory-will-build-30000-per-year/',
    confidence: 'A',
    category: 'production',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 BotQ 공장: 일 1대 → 시간 1대로 120일 만에 생산 속도 향상',
    summary: 'Figure AI의 자체 공장 BotQ가 120일 만에 로봇 생산 속도를 하루 1대에서 시간당 1대로 향상. Figure 03은 20만 4,000개 이상 패키지 분류 달성(163시간 이상 자율 운영). CEO Brett Adcock는 가정용 리스를 월 $400~600 범위로 제시. Figure AI는 가정 시장 진입을 공식 목표로 선언.',
    sourceName: 'Time / Figure AI',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure AI 밸류에이션 $390억 — 2차 시장 $162~174/주로 소폭 디스카운트',
    summary: '2025.9 Series C($10억+, 밸류에이션 $390억, 전년比 15배) 이후 신규 펀딩 라운드 없음. 2차 시장: Forge Global 8/13 $174/주, Nasdaq Private Market 6/16 $162.71/주. 프라이머리 대비 소폭 밸류에이션 압축. 투자자: Parkway VC, Brookfield, NVIDIA, Intel Capital, Salesforce, T-Mobile, Qualcomm.',
    sourceName: 'Sacra / Forge Global',
    sourceUrl: 'https://sacra.com/c/figure-ai/',
    confidence: 'B',
    category: 'funding',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 승인(7/3) — 중국 최초 휴머노이드 로봇 상장사, 글로벌 시장점유율 32%',
    summary: '2026.7.3 상해 STAR Market IPO 승인(역대 최빠른 등록). 2025년 5,500+ 대 출하, 매출 RMB 16.9억, 조정 수익 달성. 2026년 글로벌 휴머노이드 시장 ~32% 점유. G1 $13,500(미국 $21,600), H2 $29,900. H1은 H2로 대체 진행 중. 8/19 상장, IPO ~$6.18억.',
    sourceName: 'Bloomberg / Fortune',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-08-18/unitree-robotics-set-to-debut-after-904-million-shanghai-ipo',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'safety',
    headline: 'UniPwn 보안 취약점: Unitree Go2/G1/H1/B2 — Bluetooth WiFi 설정 취약',
    summary: '2025.9 공개된 UniPwn 보안 취약점이 Unitree Go2, G1, H1, B2 전 제품군에 영향. Bluetooth WiFi 설정 인터페이스의 취약점으로 원격 제어 탈취 가능성. 산업/가정용 로봇 배치 시 보안 리스크 요인.',
    sourceName: 'Security Research',
    sourceUrl: 'https://blog.robozaps.com/b/unitree-robotics',
    confidence: 'B',
    category: 'regulation',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics SPAC 합병 $2.5B — 미국 최초 순수 휴머노이드 상장사, ~100대 유료 배치',
    summary: 'Churchill Capital Corp XI와 SPAC 합병, 나스닥 AGLT 상장 예정(9월 중). 기업가치 ~$2.5B. 조달 $6.2억+(트러스트 $4.2억 + Foxconn PIPE $2억). 현재 75+ 대 글로벌 배치, 65,000+ 운영 시간. 고객: GXO, Schaeffler, Toyota Canada, Mercado Libre. NVIDIA Halos 안전 플랫폼 최초 통합.',
    sourceName: 'GeekWire / TechCrunch',
    sourceUrl: 'https://www.geekwire.com/2026/digit-maker-agility-robotics-to-go-public-in-2-5b-deal-heres-what-the-filings-say-about-its-finances/',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Toyota Motor Manufacturing Canada, Agility Digit 상업 계약 체결 — 7대 배치',
    summary: '2026.2 Toyota Motor Manufacturing Canada와 Agility Robotics가 상업 계약 체결. 7대 Digit을 캐나다 공장에 배치, 제조·공급망·물류 운영 지원. GXO SPANX 시설에서는 2024.6 이후 10만+ 토트 이동 완료. Schaeffler 공장에서 15개월 연속 8시간 교대 근무 수행.',
    sourceName: 'TechCrunch / Agility Robotics',
    sourceUrl: 'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Series A 총 $9.35억, 밸류에이션 $5.3B — AT&T·John Deere·QIA 합류',
    summary: '$5.2억 Series A 확장 라운드 클로즈, Series A 총액 $9.35억. 밸류에이션 $5.3B(초기 대비 3배). 신규: AT&T Ventures, John Deere, QIA. 기존: B Capital, Google, Mercedes-Benz, PEAK6. Robot Park 확장(Austin), Apollo 2 공개(이족보행/휠 2종). Google DeepMind와 데이터 수집 협력.',
    sourceName: 'CNBC / Globe Newswire',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apollo 2 공개 — 이족보행/휠 2종 구성, Robot Park에서 Google DeepMind 협력 훈련',
    summary: '2026.6 Apptronik이 Apollo 2 공개. 이족보행형과 휠 베이스형 2가지 구성. Austin Robot Park를 확장하여 플릿 로봇의 실세계 데이터 수집 센터로 운영. Google DeepMind와 파트너십으로 AI 훈련 데이터 수집. Mercedes-Benz, GXO Logistics와 파일럿 배치 진행 중.',
    sourceName: 'Robotics & Automation News / Apptronik',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/06/apptronik-launches-robot-park-to-train-apollo-humanoid-robots-with-google-deepmind/103069/',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 미국 Hayward 공장 가동 — 초년 10,000대, 2027년 연 100,000대 목표',
    summary: '1X Technologies가 CA Hayward에 58,000sqft 공장 개설, 200+ 명 고용. 초년 생산 능력 10,000대, 2027년까지 연 100,000대 목표. San Carlos 추가 시설 하반기 가동. 사전주문 5일 만에 초년 생산분 완판. 가격: $20,000(Early Access) 또는 월 $499 구독. EQT와 10,000대 배치 딜.',
    sourceName: 'Forbes / TNW',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'neo',
    layerSlug: 'hw',
    headline: 'NEO 하드웨어 업그레이드: 25 DOF 텐던 핸드, 촉각 핑거팁, IP68 등급',
    summary: '2026.7.9 NEO 하드웨어 업그레이드: 25 DOF 텐던 구동(tendon-driven) 핸드, 촉각 핑거팁·슬립 감지, IP68 방수/방진. 가정용 로봇의 조작 정밀도와 내구성 대폭 강화. 실제 고객 인도는 아직 미확인 — "올해 일부, 나머지 추후" 안내.',
    sourceName: 'RoboZaps / eWeek',
    sourceUrl: 'https://blog.robozaps.com/b/1x-neo-review',
    confidence: 'B',
    category: 'tech_spec',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 15,000대 생산 돌파(6월) — 2025년 5,168대→2026.3월 10,000대→6월 15,000대',
    summary: '2025년 5,168대 출하로 글로벌 1위. 2026.3월 누적 10,000대, 6월 15,000대 돌파. LG전자·Mirae Asset·BYD·Hillhouse Investment 전략 투자 유치. 밸류에이션 $6.4B. 홍콩 IPO 준비 중(HK$40B~50B 목표). 라인업: A2 시리즈(풀사이즈), X2(교육), G2(산업용).',
    sourceName: 'Tracxn / Crunchbase',
    sourceUrl: 'https://pitchbook.com/profiles/company/528463-99',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot IFA 2026 베를린 참가 — 역사상 최초 "Robots on the Runway" 로봇 캣워크',
    summary: 'IFA 2026(9/4~8, 베를린)에서 Agibot과 Unitree가 IFA 역사상 최초 로봇 런웨이 쇼 헤드라인. 932개 중국 기업 참가. CES 2026에서도 미국 시장 데뷔, 풀 포트폴리오 전시. 소비자 가전 시장으로의 휴머노이드 로봇 진입을 상징.',
    sourceName: 'IFA Berlin / PR Newswire',
    sourceUrl: 'https://tools.prnewswire.com/en-us/live/20823/release/20260105EN56041',
    confidence: 'A',
    category: 'partnership',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot-Fulin Precision Engineering 파트너십: 자동차 공장 ~100대 로봇 배치',
    summary: 'Agibot이 자동차 부품 제조사 Fulin Precision Engineering과 수천만 위안 규모 계약. ~100대 Yuanzheng 시리즈 로봇 배치. 자동차 제조 분야 실제 산업 배치 확대 사례.',
    sourceName: 'South China Morning Post',
    sourceUrl: 'https://www.scmp.com/tech/tech-trends/article/3363544/agibot-overtakes-unitree-top-global-humanoid-robot-vendor-first-half-amid-ipo-push',
    confidence: 'B',
    category: 'partnership',
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

export async function insertCiUpdate20260906() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-09-06) ===\n');

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
        collectedAt: '2026-09-06',
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

insertCiUpdate20260906()
  .then((result) => {
    console.log('\nResult:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
