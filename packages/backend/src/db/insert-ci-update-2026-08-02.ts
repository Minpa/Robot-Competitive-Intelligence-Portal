/**
 * CI 경쟁사 데이터 자동 업데이트 — 2026-08-02
 *
 * 사용법: DATABASE_URL=... npx tsx packages/backend/src/db/insert-ci-update-2026-08-02.ts
 *
 * 대상 테이블:
 *   - ci_monitor_alerts: 수집된 뉴스/알림 (headline, summary, source, confidence)
 *   - ci_staging: 값 업데이트 대기 (payload에 구조화된 데이터)
 */

import { db } from './index.js';
import { ciMonitorAlerts, ciStaging, ciCompetitors, ciLayers } from './schema.js';
import { eq } from 'drizzle-orm';

// ============================================
// 수집 데이터 (2026-08-02)
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
    headline: 'Tesla Optimus Fremont 생산라인 설치 진행 중 — 정식 생산 "올해 후반" 으로 연기',
    summary: '2026.7.23 Q2 주주 업데이트에서 Fremont 공장 Optimus 1세대 생산라인 설치 중이나 정식 생산은 "올해 후반 예정"으로 당초 7-8월 목표에서 연기. Model S/X 라인 46일만에 철거 완료. 장기 연간 100만대 용량 설계.',
    sourceName: 'Yahoo Finance / Teslarati',
    sourceUrl: 'https://finance.yahoo.com/technology/articles/tesla-tears-down-model-x-221918335.html',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    headline: 'Optimus V3 핵심 사양: AI5 칩(메모리 대역폭 5배↑), xAI Grok 음성 통합',
    summary: 'Optimus V3(Gen 3) 핵심 사양 확인: Tesla AI5 칩(기존 대비 메모리 대역폭 5배 향상), xAI Grok 음성 인터페이스 통합. 173cm/57kg, 핸드 22 DOF, 50개 액추에이터. 약 10,000개 고유 부품.',
    sourceName: 'optimusk.blog / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/tesla-optimus-gen-3',
    confidence: 'B',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    headline: 'Optimus Giga Texas 내부 배포 확대 — 배터리 분류·키팅·재고관리 수십대 운영 중',
    summary: 'Giga Texas(오스틴)에 수십대 Optimus 배포, 배터리 셀 분류, 부품 키팅, 재고 관리 수행 중. 2026년 말까지 수백대 규모 확대 예정. 외부 판매 전 내부 디버깅 우선 전략.',
    sourceName: 'eWeek / Tesla',
    sourceUrl: 'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
    confidence: 'B',
    category: 'production',
  },

  // ── Boston Dynamics Atlas ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 5세대 설계 공개: 복잡도 "거의 한 자릿수" 감소 — 액추에이터 2종만 사용',
    summary: '2026.7.2 Forbes 인터뷰: Atlas 5세대 설계에서 복잡도를 "거의 한 자릿수(order of magnitude)" 감소. 전체 바디에 2종 액추에이터만 사용, 팔·다리 대칭 설계. 관절 횡단 케이블 제거로 연속 회전 가능, 마모/유지보수 절감.',
    sourceName: 'Forbes',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/07/02/boston-dynamics-new-atlas-humanoid-robot-order-of-magnitude-simpler/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    headline: 'Atlas 현장 사지 교체 5분 이내, 자동차 공급망 호환 설계 — 양산 전환 가속',
    summary: 'Atlas 5세대: 모든 사지 현장에서 5분 이내 교체 가능. 전 부품 자동차 공급망 호환 설계. Hyundai 연 30,000대 생산 공장 계획. 2026년 생산분 전량 판매 완료.',
    sourceName: 'Forbes / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    headline: 'Google DeepMind Atlas AI 파트너로 확정 — Hyundai 외 첫 상업 배포 대상',
    summary: 'Google DeepMind가 Atlas AI 파트너로 공식 확정. Hyundai(대주주)와 함께 첫 상업 배포 대상. Gemini Robotics 2 Early Access 파트너 그룹에도 포함. Atlas 범용 지능(general intelligence) 산업 작업 시연.',
    sourceName: 'The Robot Report / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-google-reunite-on-next-gen-atlas-humanoid/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Figure AI ──
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure BotQ 공장 생산속도 24배 급등: 1일 1대→시간당 1대, 연 12,000대 목표',
    summary: 'BotQ 캘리포니아 공장에서 Figure 03 생산 4개월만에 24배 증가(1일 1대→시간당 1대). 사출성형·다이캐스팅·MIM·스탬핑 전환으로 CNC 1주일 소요 부품을 20초 내 제조. 150+ 네트워크 워크스테이션 운영. 연 12,000대 목표.',
    sourceName: 'The Robot Report / Figure AI',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'sw',
    headline: 'Figure 03 자율 택배 분류 실적: 163시간 동안 204,000개 패키지 처리',
    summary: 'Figure 03이 Helix AI 기반 완전 자율 모드로 택배 분류 수행. 163시간 이상 가동, 204,000개 이상 패키지를 라벨 아래로 분류 후 컨베이어 벨트 전달. 무감독(unsupervised) 다일 작업 능력 입증.',
    sourceName: 'Figure AI / Forge Global',
    sourceUrl: 'https://forgeglobal.com/insights/figure-ai-robotics-growth-2026/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'figure',
    layerSlug: 'biz',
    headline: 'Figure 03 가정용 리스 가격 월 $400-600 공개 — 가정 내 무감독 다일 작업 목표',
    summary: 'CEO Brett Adcock 2026.5.1 Sourcery 팩토리 투어에서 가정용 리스 월 $400-600 범위 제시. Helix 02 기반 주방·거실·침실 완전 자율 데모. 처음 방문하는 가정에서도 무감독 다일 작업 가능 목표.',
    sourceName: 'RoboZaps / Figure AI',
    sourceUrl: 'https://blog.robozaps.com/b/figure-03-review',
    confidence: 'B',
    category: 'production',
  },

  // ── Unitree ──
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'hw',
    headline: 'Unitree H2 Plus 발표: NVIDIA Isaac GR00T 레퍼런스 휴머노이드 — 학술 연구용',
    summary: '2026.6.1 발표. NVIDIA Isaac GR00T 개발 플랫폼 기반 첫 레퍼런스 휴머노이드. 1.8m/68kg, 바디 31 DOF + 핸드당 22 DOF. NVIDIA Jetson Thor(Blackwell GPU) 탑재. 2026년 말 출시 예정.',
    sourceName: 'PR Newswire / CNBC',
    sourceUrl: 'https://www.prnewswire.com/news-releases/unitree-announces-h2-plus-an-nvidia-isaac-gr00t-reference-humanoid-robot-for-academic-research-302786748.html',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree STAR Market IPO 73일 기록적 속도 승인 — ¥42억($6.16억) 조달',
    summary: '2026.3.20 신청 후 73일만인 6.1 상장위원회 심사 통과, A주 최초 "구현 AI(embodied AI)" 상장. ¥42억($6.16억) 조달 예정. 지능형 로봇 R&D, 신제품 개발, 제조기지 건설에 투입.',
    sourceName: 'BigGo Finance / Humanoids Daily',
    sourceUrl: 'https://finance.biggo.com/news/8a4522d4-0d8e-411d-972a-8d16a81a04e0',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'unitree-g1',
    layerSlug: 'biz',
    headline: 'Unitree 2026년 생산 목표 10,000~20,000대 — 전년비 4배 생산능력 확대',
    summary: '2025년 6,500대+(G1 5,500대 포함) 출하 실적 기반, 2026년 10,000~20,000대 목표로 약 4배 생산능력 확대 추진. G1 EDU가 대학 연구용 풀바디 휴머노이드 시장 선도.',
    sourceName: 'eWeek / Interesting Engineering',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    confidence: 'B',
    category: 'production',
  },

  // ── Agility Robotics (Digit) ──
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Robotics $25억 SPAC 합병 확정: Churchill Capital XI, Nasdaq "AGLT" 상장 예정',
    summary: '2026.6.24 발표. Churchill Capital Corp XI와 $25억 기업가치 SPAC 합병, 미국 최초 순수 휴머노이드 상장사. 총 $6.2억+ 거래수익(PIPE $2억 포함). 2026년 내 Nasdaq AGLT 티커 상장 예정.',
    sourceName: 'BusinessWire / GeekWire',
    sourceUrl: 'https://www.businesswire.com/news/home/20260624555633/en/Agility-Robotics-to-Go-Public-Through-$2.5-Billion-Merger-with-Churchill-Capital-Corp-XI',
    confidence: 'A',
    category: 'funding',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'hw',
    headline: 'Digit v5 사양 공개: 50lb 리프트(40%↑), 22시간 런타임, 7.2ft 최대 리치',
    summary: 'Digit v5 주요 사양: 리프트 용량 50lb(기존 대비 40% 증가), 22시간 연속 가동, 최대 리치 7.2ft. AI 기반 협력안전(cooperatively safe) 휴머노이드 세계 최초 목표. 2026년 말 배포 시작.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'digit',
    layerSlug: 'biz',
    headline: 'Agility Digit v5 수주 $3억+ 확보, NVIDIA Halos 안전시스템 런치 파트너 선정',
    summary: '$3억 이상 다년 Digit v5 계약 수주 확보. NVIDIA가 Agility를 물리적 AI 안전시스템 NVIDIA Halos 런치 파트너로 선정. Google DeepMind AI 플랫폼 협업도 병행.',
    sourceName: 'BusinessWire / Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
    confidence: 'A',
    category: 'partnership',
  },

  // ── Apptronik (Apollo) ──
  {
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    headline: 'Apptronik Apollo 2 공개: 이족보행+휠 이중 구성, 대규모 데이터 수집 플랫폼',
    summary: '2026.6.30 Apollo 2 공개. 이족보행(bipedal) 및 휠 베이스 이중 구성. 대규모 실세계 데이터 수집용 학습 플랫폼으로 설계. Apollo 3(최초 상용 제품)는 2027년 목표.',
    sourceName: 'The Robot Report / eWeek',
    sourceUrl: 'https://www.therobotreport.com/apptronik-unveils-apollo-2-flagship-data-collection-training-facility/',
    confidence: 'A',
    category: 'tech_spec',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    headline: 'Apptronik Robot Park 90,000 sqft 오스틴 개소 — 글로벌 네트워크 확장 예정',
    summary: '2026.6.30 Austin에 90,000 sqft Robot Park(데이터 수집·훈련 시설) 개소. 전세계 고객·파트너 사이트에 추가 Robot Park 개소 예정. Apollo 2 플릿 실운영 중.',
    sourceName: 'Robotics Tomorrow / Apptronik',
    sourceUrl: 'https://apptronik.com/news-collection/welcome-to-robot-park-where-apptroniks-apollo-goes-to-work',
    confidence: 'A',
    category: 'production',
  },
  {
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    headline: 'Google DeepMind Gemini Robotics 2 × Apollo 2: 전신 AI 제어 데모 (2026.7.30)',
    summary: '2026.7.30 Google DeepMind Gemini Robotics 2 발표와 함께 Apollo 2 전신(whole-body) 자율 제어 시연. 보행·웅크리기·굽히기·물체 조작을 실시간 추론. 전구 분리 92% 성공률. Apptronik ~$10억 조달, ~$50억 기업가치.',
    sourceName: 'Robotics & Automation News / Google DeepMind',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/07/31/google-deepmind-unveils-gemini-robotics-2-as-apptronik-humanoid-demonstrates-whole-body-ai/103802/',
    confidence: 'A',
    category: 'partnership',
  },

  // ── 1X Technologies (NEO) ──
  {
    competitorSlug: 'neo',
    layerSlug: 'biz',
    headline: '1X NEO 풀스케일 생산 개시: Hayward 58,000 sqft 공장, 미국 최초 수직통합 휴머노이드 팩토리',
    summary: '2026.4.30 Hayward, CA에 58,000 sqft 미국 최초 수직통합 고볼륨 휴머노이드 로봇 공장 가동. 200+ 직원. 2026년 내 소비자 배송 시작 예정. San Carlos 2차 공장도 증설 예정.',
    sourceName: 'Forbes / GlobeNewsWire',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/',
    confidence: 'A',
    category: 'production',
  },

  // ── Agibot ──
  {
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    headline: 'Agibot 누적 생산 15,000대 돌파 — G2 로봇 자율 공장 검사 라이브스트림 공개',
    summary: 'Agibot 누적 생산 15,000대 돌파. G2 휴머노이드 로봇이 태블릿 자율 검사 및 자재 핸들링 수행하는 공장 장면을 라이브스트림 공개. 15,000번째 로봇 생산 기념.',
    sourceName: 'Humanoid Press / Agibot',
    sourceUrl: 'https://humanoid.press/',
    confidence: 'B',
    category: 'production',
  },
  {
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    headline: 'Agibot A3 Ultra 사양 확인: 174cm, 51 DOF, 팔당 11lb 적재 — 상업·서비스용',
    summary: 'WAIC 2026 발표 A3 Ultra 상세 사양: 174cm, 51 DOF, 팔당 11lb(약 5kg) 적재. 상업 및 서비스 작업용 풀사이즈 휴머노이드. "Deployment Year One" 선언과 함께 5개 로봇 플랫폼+8개 AI 모델 동시 공개.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot',
    confidence: 'A',
    category: 'tech_spec',
  },

  // ── 규제/인증 동향 ──
  {
    competitorSlug: 'atlas',
    layerSlug: 'safety',
    headline: 'ISO 25785-1 Working Draft 단계 — 완전 비준까지 18~36개월 예상 (2027 후반~2028)',
    summary: 'ISO 25785-1(동적 안정 산업용 모바일 로봇 안전표준) Working Draft 단계. 2025.5 초안 발표, 의견수렴 2025.6.21 마감. 완전 비준까지 18~36개월(2027 후반~2028 예상). 미국 대표단: Boston Dynamics Federico Vicentini, Agility Kevin Reese, A3 Carole Franklin.',
    sourceName: 'RoboticsBiz / Tech Briefs',
    sourceUrl: 'https://roboticsbiz.com/iso-safety-standards-for-humanoid-robots-what-manufacturers-need-to-know-in-2026/',
    confidence: 'A',
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

export async function insertCiUpdate20260802() {
  console.log('=== CI 경쟁사 데이터 업데이트 (2026-08-02) ===\n');

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

    // ci_staging에도 구조화 데이터 저장
    await db.insert(ciStaging).values({
      updateType: item.category,
      payload: {
        competitorSlug: item.competitorSlug,
        layerSlug: item.layerSlug,
        headline: item.headline,
        summary: item.summary,
        confidence: item.confidence,
        collectedAt: '2026-08-02',
      },
      sourceChannel: 'auto_crawl',
      status: 'pending',
    });

    console.log(`  ✅ 삽입: [${item.confidence}] ${item.headline.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== 완료: ${inserted}건 삽입, ${skipped}건 중복 스킵 ===`);
}

// 직접 실행 시
insertCiUpdate20260802()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
