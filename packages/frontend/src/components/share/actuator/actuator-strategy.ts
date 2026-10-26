/**
 * "세트 제조사의 액추에이터 사업화 전략" 카드 — 정적 원고(STRATEGY_CONTENT·STRATEGY_SOURCES) + 동적 수치 계산.
 * 순수 TypeScript (React·DOM 의존 없음). ActuatorStrategyCard.tsx(웹)와 actuator-map-html.ts(다운로드 HTML)가
 * 같은 문장·지표를 쓰도록 문장 생성은 buildDiagnosisLines / buildMetricRows 한 곳에서만 한다.
 * 입력은 ActuatorMapResponse 의 robots[]·suppliers[] 만 쓴다 (edges 는 쓰지 않음).
 */

import type { ActuatorMapResponse, ActuatorMapRobot, ActuatorSupplierProduct, MarketSegment } from '@/types/actuator-map';
import { fmtUSD } from './actuator-map-layout';
import {
  SEGMENT_LABEL,
  adoptionBySegment,
  adoptionByVendor,
  adoptionTotals,
  companyPosture,
  resolveSegmentOrder,
  roleKo,
  segmentLabelList,
  summarizeSourcing,
  type SegmentCount,
  type SourcingSummary,
  type VendorCount,
} from './actuator-sourcing';

// ── 출처 ─────────────────────────────────────────────────────────────────────

export interface StrategySource {
  id: string;
  label: string;
  url: string;
  /** 신뢰도 표기. 'A 공식 / B 대형 매체 / C 2차 자료' + 필요 시 보충 */
  grade: string;
}

export const STRATEGY_SOURCES: StrategySource[] = [
  { id: 'S1', label: 'Unitree 스토어 GO-M8010-6', url: 'https://shop.unitree.com/products/go1-motor', grade: 'A' },
  { id: 'S2', label: 'Unitree GO Motor 사양', url: 'https://www.unitree.com/mobile/go1/motor/', grade: 'A' },
  { id: 'S3', label: 'Unitree H1 (M107)', url: 'https://unitree.com/mobile/h1', grade: 'A' },
  { id: 'S4', label: 'Xiaomi CyberGear 499위안 출시', url: 'https://news.metal.com/newscontent/102352716', grade: 'B' },
  { id: 'S5', label: 'Fourier FSA 2.0', url: 'https://aiwiki.ai/wiki/fourier_intelligence_gr_2/raw', grade: 'C' },
  { id: 'S6', label: 'Fourier GR-3 공식 개요', url: 'https://support.fftai.com/en/getting-started/general-information', grade: 'A' },
  { id: 'S7', label: 'AgiBot X1', url: 'https://www.agibot.com/products/X1', grade: 'A' },
  { id: 'S8', label: 'Hyundai Mobis–Atlas 공급(Korea Herald)', url: 'https://www.koreaherald.com/article/10651569', grade: 'B' },
  {
    id: 'S9',
    label: 'Mobis–Boston Dynamics 협력 보도자료',
    url: 'https://www.barchart.com/story/news/36939666/hyundai-mobis-forms-strategic-collaboration-framework-with-boston-dynamics',
    grade: 'A',
  },
  {
    id: 'S10',
    label: 'LG AXIUM 기고문',
    url: 'https://www.nmpress.org/online_features/tech_talk_and_innovation/axium-the-power-that-actuates-the-future-of-robotics/article_4f72f79b-368f-53c3-a986-78a4c8f74bc3.html',
    grade: 'B (robots.json은 A로 기록, 보수적으로 B)',
  },
  { id: 'S11', label: 'LG 로보틱스사업센터·외판 추진(Korea Herald)', url: 'https://www.koreaherald.com/article/10808594', grade: 'B' },
  { id: 'S12', label: 'LG 창원 양산 라인(E-Daily)', url: 'https://en.edaily.co.kr/news/eda202609065029/', grade: 'B' },
  { id: 'S13', label: 'LG 로봇 부품 사업(머니투데이)', url: 'https://www.mt.co.kr/industry/2026/07/13/2026071315201963947', grade: 'B' },
  { id: 'S14', label: 'RobStride', url: 'https://robstride.com/', grade: 'A' },
  { id: 'S15', label: 'CubeMars AK80-64', url: 'https://www.cubemars.com/product/ak80-64-kv80-robotic-actuator.html', grade: 'A' },
  { id: 'S16', label: 'MyActuator X 시리즈', url: 'https://www.myactuator.com/downloads-xseries', grade: 'A' },
  {
    id: 'S17',
    label: 'Harmonic Drive SHA-CG',
    url: 'https://www.harmonicdrive.net/products/rotary-actuators/hollow-shaft-servo-actuators/sha-cg',
    grade: 'A',
  },
  { id: 'S18', label: 'Nabtesco RV-100C', url: 'https://www.nabtesco.de/en/product/rv-100c', grade: 'A' },
  { id: 'S19', label: 'maxon IDX 56 L', url: 'https://www.maxongroup.com/maxon/view/product/221030', grade: 'A' },
  { id: 'S20', label: 'Kepler Forerunner', url: 'https://www.gotokepler.com/productDetail', grade: 'A' },
  { id: 'S21', label: 'Tesla Optimus 액추에이터', url: 'https://humanoid.guide/?p=16316', grade: 'C' },
  {
    id: 'S22',
    label: 'Tesollo DG-5F-S',
    url: 'https://www.therobotreport.com/tesollo-initiates-ipo-process-developing-humanoid-hands/',
    grade: 'A (CI 기록 기준)',
  },
  { id: 'S23', label: 'Apptronik Apollo 2', url: 'https://apptronik.com/apollo/apollo-2', grade: 'A' },
  { id: 'S24', label: 'FAULHABER BXT H', url: 'https://www.faulhaber.com/en/products/series/4221bxth/', grade: 'A' },
  {
    id: 'S25',
    label: 'Tesla Optimus 3세대 공급사 실사 보도(TrendForce, Bloomberg 인용)',
    url: 'https://trendforce.com/news/2026/09/21/news-tesla-reportedly-audits-china-suppliers-for-optimus-gen-3-ramp-eyes-20000-price-target/',
    grade: 'B',
  },
  {
    id: 'S26',
    label: 'Schaeffler–NEURA Robotics 기술 파트너십(보도자료)',
    url: 'https://vn.tradingview.com/news/eqs:7725b32b0094b:0-schaeffler-and-neura-robotics-launch-future-oriented-technology-partnership',
    grade: 'A',
  },
  { id: 'S27', label: 'AGILOped 오픈소스 휴머노이드(arXiv 2509.09364)', url: 'https://arxiv.org/pdf/2509.09364', grade: 'A' },
  { id: 'S28', label: 'Hello Robot Stretch 3 하드웨어 가이드', url: 'https://docs.hello-robot.com/0.3/hardware/hardware_guide_stretch_3', grade: 'A' },
  { id: 'S29', label: '모듈형 고관절·무릎 외골격(arXiv 2110.01562)', url: 'https://arxiv.org/pdf/2110.01562', grade: 'A' },
  { id: 'S30', label: 'Stanford Pupper 공식 페이지', url: 'https://stanfordstudentrobotics.org/pupper', grade: 'A' },
];

const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * 정적 출처(STRATEGY_SOURCES, 신뢰된 상수) 전용 링크 검사 — https + 호스트명 형식만 확인한다.
 * 동적 데이터의 URL 에는 쓰지 말 것 (그쪽은 tech-trend-report-html 의 safeHref).
 * 통과하면 정규화된 URL, 아니면 ''.
 */
export function safeSourceHref(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return '';
    if (u.username || u.password) return '';
    if (!HOST_RE.test(u.hostname)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

// ── 정적 원고 ────────────────────────────────────────────────────────────────

export interface StrategyFactRow {
  category: string;
  subject: string;
  fact: string;
  evidence: string;
}

export interface StrategyOption {
  name: string;
  core: string;
  evidence: string;
  capability: string;
  risk: string;
  prerequisite: string;
}

export interface StrategyCollabModel {
  name: string;
  content: string;
  pros: string;
  cons: string;
  decisions: string;
  evidence: string;
}

export interface StrategyRole {
  kind: string;
  item: string;
  content: string;
  evidence: string;
  limits: string;
}

export interface StrategyMetricDef {
  id: string;
  name: string;
  definition: string;
  availability: string;
  source: string;
}

export const STRATEGY_CONTENT = {
  version: 2,
  asOf: '2026-10-26',
  title: '세트 제조사의 액추에이터 사업화 전략',
  kicker: 'Actuator · Set-maker Commercialization Strategy',
  notice:
    "이 카드는 ARGOS DB와 조사 자료에서 확인된 사실과 검토 중인 가설을 구분해 정리한 것입니다. '(데이터)'는 ARGOS 기록에서 확인된 내용, '(가설)'은 데이터로 입증되지 않은 검토안, '(일반 지식)'은 ARGOS DB에 없는 외부 지식입니다. 부품 사업부는 그룹 내 부품 조직을 뜻하며 특정 조직을 지칭하지 않습니다. 확정된 LG전자 방침이 아닙니다. '수요 사례'는 외부 액추에이터를 쓰는 공개 채택 사례이며 공급 계약 여부는 별도입니다. 세트 역할(직접·간접 기여)은 검토용 (가설)입니다.",
  question:
    '세트 제조사가 액추에이터까지 개발할 때, 액추에이터만 사업화해 부품 경쟁력을 확보하려면 어떤 방법이 있고, 부품 사업부와 어떻게 협업할 수 있는가.',
  sections: {
    diagnosis: '1. 현황 진단',
    roles: '2. 세트(LG CLOiD)의 역할: 직접 3 + 간접 3',
    options: '3. 사업화 경로 옵션',
    collab: '4. 부품 사업부(그룹 내 부품 조직)와의 협업 모델',
    metrics: '5. ARGOS로 추적할 지표',
    questions: '6. 의사결정 질문',
    sources: '출처',
  },
  factsHeading: '확인된 사실',
  factColumns: ['구분', '사례', '확인된 사실', '근거'],
  factRows: [
    {
      category: '자체 설계 기록 + 외부 조달·혼합',
      subject: 'Tesla Optimus',
      fact: '회전형 3종(20/110/180 Nm)과 선형 3종(500/3,900/8,000 N)을 자체 설계한 것으로 기록되어 있습니다. 공식 데이터시트가 없고, AI Day 2022 내용을 2차 자료가 재구성한 값입니다. 조달 태세 재판정에서는 Tuopu·Sanhua 등 중국 공급사에 위탁제조한다는 보도에 따라 외부 조달·혼합으로 분류하며, 공급사별 역할 분담은 매체 간 상충합니다. (데이터)',
      evidence: '[S21] C, [S25] B',
    },
    {
      category: '자체 개발(확인)',
      subject: 'Kepler Forerunner',
      fact: '회전형 액추에이터 피크 200 Nm, 유성 롤러 스크류 선형 액추에이터(보도 기준 8,000 N)를 자사 로봇용으로 씁니다. (데이터)',
      evidence: '[S20] A·B',
    },
    {
      category: '자체 개발 + 외판',
      subject: 'Unitree',
      fact: 'GO-M8010-6은 공식 스토어 $369, 피크 23.7 Nm, 0.53 kg, Φ96.5 mm, RS-485입니다. H1용 M107(피크 360 Nm)은 별도 판매 없이 자사용입니다. (데이터)',
      evidence: '[S1][S2][S3] A',
    },
    {
      category: '자체 개발 + 외판',
      subject: 'Xiaomi CyberGear',
      fact: '출시가 499위안(2023-08), 피크 12 Nm, 0.317 kg, CAN입니다. 타깃은 CyberDog 2 관절과 메이커·연구용입니다. (데이터)',
      evidence: '[S4] B (사양은 매뉴얼 미러 C)',
    },
    {
      category: '자체 개발 + 외판(근거 약함)',
      subject: 'Fourier FSA 2.0',
      fact: '7개 변형이 있고 최대 변형의 피크는 380 Nm 초과(2차 자료)입니다. 조사 JSON에 "자사 및 외부 대상"으로 적혀 있으나 외판 가격과 계약은 확인되지 않았습니다. GR-3 최대 관절 피크 440 Nm(공식, 액추에이터 세대는 미명시)입니다. (데이터)',
      evidence: '[S5] C, [S6] A',
    },
    {
      category: '자체 개발(외판 근거 미확인)',
      subject: 'AgiBot PowerFlow',
      fact: 'R86-3(피크 200 Nm, 1.28 kg, Φ86), R86-2(80 Nm, 0.81 kg), R52(19 Nm, 0.45 kg, Φ52)입니다. X1 오픈소스 플랫폼 부품으로 기록되어 있고 별도 판매와 가격은 확인되지 않았습니다. (데이터)',
      evidence: '[S7] A',
    },
    {
      category: '외부 조달(그룹 내 부품사, 혼합)',
      subject: 'Atlas와 Hyundai Mobis',
      fact: 'Atlas는 자체 설계 전동 액추에이터를 쓰면서, 2026-01 CES에서 양산 단계 액추에이터를 Hyundai Mobis가 공급하는 계약이 발표됐습니다. 사양은 미공개입니다. 설계는 세트 제조사(Boston Dynamics)가 하고 양산 단계 액추에이터의 공급은 부품사(Hyundai Mobis)가 맡는 역할 분담입니다. (데이터) ARGOS 기록상 Boston Dynamics는 현대차그룹 소속입니다. Mobis가 같은 그룹의 부품사라는 점은 (일반 지식)이며, 이 사례는 그룹 내 공급입니다. (데이터)',
      evidence: '[S8] B, [S9] A',
    },
    {
      category: '자체 개발 + 외판 계획',
      subject: 'LG전자 AXIUM',
      fact: '모터·감속기·드라이브 일체형 모듈로 Φ40~Φ120 9개 라인업입니다. 인버터 기반 재생제동으로 약 10% 에너지를 회수한다고 LG가 밝혔습니다. 2026-06-30 CEO 직속 로보틱스사업센터 신설(7월 1일 시행), 국내 자체 생산과 타 로봇사 외부 판매 추진이 보도됐습니다. 로드맵은 2027 외부 공급, 2030 산업용 고토크입니다. 토크·무게·가격은 미공개입니다. 2026-09 보도 기준 확정 수주는 없습니다. (데이터)',
      evidence: '[S10][S11][S12][S13] B',
    },
    {
      category: '부품 전문(일본·유럽·스위스)',
      subject: 'Harmonic Drive, Nabtesco, maxon, FAULHABER',
      fact: '하모닉 CSD-2A는 감속기 단품(피크 69~76 Nm, 0.13 kg, Φ70)입니다. SHA20A-CG는 모터+감속기+엔코더(피크 73~120 Nm, 2.6 kg, 200 VAC)입니다. Nabtesco RV-100C는 산업용 사이클로이드(2,450 Nm, 19.5 kg)입니다. maxon IDX 56 L은 서보 드라이브(연속 0.795 Nm, 1.445 kg, CANopen/EtherCAT)입니다. 조사 제품 전부에 가격이 등록되어 있지 않습니다. (데이터)',
      evidence: '[S17][S18][S19][S24] A',
    },
    {
      category: '부품 전문(중국)',
      subject: 'RobStride, CubeMars, MyActuator',
      fact: 'RobStride는 RS-05(5.5 Nm, $110)~RS-04(120 Nm, $255)입니다. CubeMars는 AK60-6(9 Nm, $229.9)~AK80-64(120 Nm, $989.9)입니다. MyActuator RMD-X는 피크 25~450 Nm이고 가격 미등록이며 휴머노이드·레그드 타깃입니다. 같은 피크 120 Nm급에서 RS-04($255, 1.42 kg, 9:1)와 AK80-64($989.9, 0.85 kg, 64:1)의 가격 차가 약 3.9배입니다. 가격 외 요인은 (가설)입니다. (데이터)',
      evidence: '[S14][S15][S16] A',
    },
    {
      category: '참고(핸드)',
      subject: 'Tesollo DG-5F-S',
      fact: '자체 액추에이터로 1 kg 미만, 이전 모델 대비 약 60% 원가라고 보도됐습니다. 핸드 사례이며 액추에이터 외판 사례는 아닙니다. (데이터)',
      evidence: '[S22]',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: 'Optimus V3',
      fact: 'Optimus V3(Tesla, US, 2026)는 Tuopu Group과 Sanhua Intelligent Controls의 선형·회전 액추에이터 모듈을 전 관절 위탁제조에 씁니다. 설계는 Tesla가 하는 패턴으로 보도됐으며 선형·회전 분담은 매체 간 상충합니다. (데이터)',
      evidence: '[S25] B',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: '4NE1',
      fact: '4NE1(NEURA Robotics, DE, 2025)은 Schaeffler의 유성기어 액추에이터(최대 250 N·m)를 어깨·팔꿈치·무릎·손목 관절에 씁니다. (데이터)',
      evidence: '[S26] A',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: 'AGILOped',
      fact: 'AGILOped(오픈소스 휴머노이드 연구 프로젝트, 2025)는 MyActuator RMD-X6-40의 액추에이터를 전 관절에 씁니다. (데이터)',
      evidence: '[S27] A',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: 'Stretch 3',
      fact: 'Stretch 3(Hello Robot, US, 2024)는 Robotis Dynamixel XL430 등 X 시리즈 서보를 손목·그리퍼에 씁니다. 팔 본체는 자체 스텝모터로 구동합니다. (데이터)',
      evidence: '[S28] A',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: '모듈형 고관절·무릎 외골격',
      fact: '모듈형 고관절·무릎 외골격(연구팀, 2021)은 CubeMars AK80-9의 액추에이터를 고관절·무릎 관절에 씁니다. (데이터)',
      evidence: '[S29] A',
    },
    {
      category: '수요 사례(외부 채택)',
      subject: 'Stanford Pupper',
      fact: 'Stanford Pupper(Stanford Student Robotics, US, 2020)는 JX Servo CLS6336HV 12개를 전 관절에 씁니다. (데이터)',
      evidence: '[S30] A',
    },
  ] as StrategyFactRow[],
  factsFootnote:
    'peak 토크는 제조사별 정의가 달라 직접 비교에 한계가 있습니다. 가격은 공식 스토어 정가 기준이며 판매가와 다를 수 있습니다. 자체 여부는 조달 태세 재판정(근거 등급 A/B 확인, C/D·근거 없음은 확인 불가)을 따릅니다.',
  rolesIntro:
    '세트 제조사가 부품 사업에 기여하는 경로를 직접 기여(세트가 고객이자 사양 오너로서 하는 일)와 간접 기여(세트가 외부 고객 확보를 돕는 일)로 나눴습니다. 기여 크기는 추정하지 않았고 아래 항목은 검토용 (가설)을 포함합니다.',
  roleColumns: ['구분', '기여 항목', '내용', '현재 근거', '전제·한계'],
  roles: [
    {
      kind: '직접 1',
      item: '1차 고객 물량',
      content: 'CLOiD가 AXIUM의 첫 내부 고객이 되어 초기 양산 물량과 수율 학습 기회를 제공합니다. (가설)',
      evidence: 'AXIUM은 Φ40~Φ120 9개 라인업이며 국내 자체 생산이 보도됐습니다. (데이터, [S10][S12]) CLOiD의 상용화 단계는 concept이고 비판매 기술 데모입니다. (데이터)',
      limits: '물량 규모와 출시 일정은 미공개입니다. 내부 물량만으로는 외판 가격 경쟁력이 입증되지 않습니다.',
    },
    {
      kind: '직접 2',
      item: '양산 사양·인터페이스 표준 정의',
      content: '세트가 요구 토크·무게·통신·커넥터를 정의해 외판 표준 사양의 기준선을 만듭니다. (가설)',
      evidence: '경쟁 제품은 대부분 CAN이고 일부는 EtherCAT·CANopen을 제공합니다. (데이터, [S16][S19]) AXIUM의 토크·무게·통신은 DB에 비어 있습니다. (데이터)',
      limits: '세트 전용 사양과 외판 사양의 차이를 어디까지 허용할지 결정이 필요합니다(6절 질문 6).',
    },
    {
      kind: '직접 3',
      item: '필드 내구 데이터',
      content: 'CLOiD의 가정 환경 운용에서 수명·고장·소음 데이터를 쌓아 외부 채택의 신뢰 근거로 씁니다. (가설)',
      evidence: '공급사 제품 레코드에는 수명·내구 항목이 없습니다. (데이터 공백)',
      limits: 'CLOiD가 concept 단계라 현재 쌓이는 필드 데이터는 없습니다. 공개 범위 승인이 필요합니다.',
    },
    {
      kind: '간접 1',
      item: '레퍼런스 로봇 데모',
      content: 'CLOiD 시연으로 AXIUM이 실제 로봇에서 동작함을 외부 로봇사에게 보여줍니다. (가설)',
      evidence: 'AXIUM은 CES 2026에서 공개됐고 CLOiD용으로 소개됐습니다. (데이터, [S10]) 외부 공개 채택의 규모는 동적 문장 8을 따릅니다.',
      limits: '시연은 성능 근거가 아닙니다. 비판매 데모라 구매 의사결정 근거로는 약합니다. (가설)',
    },
    {
      kind: '간접 2',
      item: '외부 로봇사 공동개발 플랫폼',
      content: '외부 로봇사와 공동 개발하는 로봇에 AXIUM을 기본 탑재해 채택 사례를 만듭니다. (가설)',
      evidence: 'Mobis–Atlas는 설계 주체와 양산 공급 주체가 다른 공개 사례입니다. (데이터, [S8][S9])',
      limits: '공동개발 상대와 계약 구조는 DB에 없습니다. 경쟁 세트 제조사가 상대일 때 정보 차단이 필요합니다(4절 협업 모델 5번).',
    },
    {
      kind: '간접 3',
      item: 'ARGOS 벤치마크 공유',
      content: 'ARGOS의 공급사 제품 맵(가격×토크)과 채택 사례 표를 외판 영업 자료로 공유합니다. (가설)',
      evidence: 'ARGOS는 공급사 제품과 공개 채택 사례를 함께 비교합니다. (데이터)',
      limits: '가격 등록 제품이 중국계 QDD에 치우쳐(동적 문장 4) 중가 구간 비교는 아직 불가합니다. 공유 범위 승인이 필요합니다.',
    },
    {
      kind: '비교 사례',
      item: 'Atlas–Hyundai Mobis: 설계는 세트, 양산·공급은 부품사',
      content: 'Atlas는 자체 설계 전동 액추에이터를 쓰면서 양산 단계 액추에이터는 Hyundai Mobis가 공급합니다. 설계는 세트 제조사가, 양산과 공급은 부품사가 맡는 역할 분담입니다.',
      evidence: '2026-01 CES 공급 계약 발표, 사양 미공개. 같은 그룹 내 사례입니다. (데이터, [S8][S9]) Mobis가 같은 그룹 부품사라는 점은 (일반 지식)입니다.',
      limits: 'LG는 세트(CLOiD)와 부품(AXIUM)이 한 회사 안에 있어 역할 분담이 조직 간 약정으로 바뀝니다(4절 협업 모델 1·3). Mobis의 Atlas 외 고객 공급 근거는 DB에 없습니다.',
    },
  ] as StrategyRole[],
  optionColumns: ['옵션', '핵심 내용', '근거', '필요 역량', '리스크', '선행 조건'],
  options: [
    {
      name: 'A. 레퍼런스 고객형 "검증된 부품"',
      core: '자사 세트(CLOiD)를 1차 고객으로 쌓은 장기 내구·필드 데이터를 근거로 외부 설계 채택의 신뢰 장벽을 낮춥니다.',
      evidence:
        '완성 로봇사가 양산형 공급 계약으로 외부 액추에이터를 채택한 DB 사례는 Mobis–Atlas뿐입니다(데이터, [S8][S9]). 외부 채택에서 실적 데이터가 결정 요인이라는 점은 (가설)입니다. 이 외 공개 채택 사례는 동적 문장 8을 따릅니다(공급 계약 형태는 확인되지 않음).',
      capability: '필드·내구 시험 인프라, 고장·수명 통계 체계, 공개 가능한 데이터 거버넌스',
      risk: 'CLOiD의 상용화 단계가 concept이고 비판매 기술 데모라 레퍼런스 물량이 작습니다(데이터). 데이터 공개가 자사 로봇의 약점을 노출할 수 있습니다.',
      prerequisite: '내구 시험 프로토콜 정의, 공개 범위 승인, CLOiD 출시 일정 확정',
    },
    {
      name: 'B. 라인업·인터페이스 표준화',
      core: 'Φ 사이즈 계열, 통신·커넥터·펌웨어 SDK, 기계 인터페이스를 표준화·공개해 타사 설계 편입을 쉽게 합니다.',
      evidence:
        'AXIUM은 Φ40~Φ120 9개 라인업입니다(데이터, [S10]). 경쟁 제품은 대부분 CAN이고 일부는 EtherCAT·CANopen을 제공합니다(데이터, [S16][S19]). 모듈 교체 용이 설계가 도입 장벽을 낮춘다는 점은 (일반 지식)입니다.',
      capability: '인터페이스 사양서·SDK 개발, 호환성 시험, 형상 관리',
      risk: '표준 선점 전 공개 시 모방 위험이 있고, 세대 간 호환 부담이 생깁니다.',
      prerequisite: '인터페이스 v1 사양 동결, 세트용과 외판용의 사양 차이 정책',
    },
    {
      name: 'C. 중가 "통합 모듈+신뢰성" 포지션과 원가 내재화',
      core: '저가 QDD와 단품 정밀 부품 사이에 모터·감속기·드라이버 일체형 모듈과 신뢰성 보증을 묶은 중가 포지션을 겨냥합니다(가설).',
      evidence:
        '가격 등록 제품은 중국계 QDD뿐이라 중가 위치를 입증할 수 없습니다(데이터 공백, 동적 문장 4·5). 자체 액추에이터로 약 60% 원가를 보고한 핸드 사례가 있습니다(데이터, [S22]).',
      capability: 'make-or-buy 판단, BOM 원가 모델, 양산 수율 관리',
      risk: '저가 QDD와의 가격 경쟁으로 마진이 압박되고, 보증 비용이 늘 수 있습니다. 자체 원가 우위는 미입증입니다.',
      prerequisite: 'AXIUM 토크·무게·가격 목표 확정(현재 DB 미공개), 구성품별 원가 분해',
    },
    {
      name: 'D. 개발자 생태계·레퍼런스 디자인',
      core: '교육·연구용 킷, 공개 가격, 오픈 SDK로 채택 저변을 넓힙니다.',
      evidence:
        'Unitree GO-M8010-6는 $369로 온라인 판매됩니다(데이터, [S1]). RobStride는 $110~$255 공식 가격표를 공개합니다(데이터, [S14]). Xiaomi CyberGear는 499위안으로 메이커·연구 대상입니다(데이터, [S4]). AgiBot X1은 오픈소스 플랫폼입니다(데이터, [S7]).',
      capability: '문서·SDK·커뮤니티 운영, 소량 유통 채널, 기술 지원',
      risk: '소량·저마진이고 지원 비용이 큽니다. 기술 유출 우려가 있고 가정용 본업과 거리가 있습니다(가설).',
      prerequisite: 'SDK 공개 범위 결정, 대외 판매 채널 확보',
    },
    {
      name: 'E. 안전·인증·내구 차별화(가정용)',
      core: '가정 환경에 맞춘 본질안전, 저소음, 역구동성, 인증 대응을 차별점으로 삼습니다.',
      evidence:
        'LG 외 등록 제품 중 가정용 명시 제품 수는 동적 문장 7을 따릅니다. 가정용 요구에 특화된 외판 제품은 확인되지 않습니다(데이터). 재생제동 약 10% 회수는 LG의 주장입니다(데이터, [S10]). 조사 JSON에서 QDD 다수는 역구동 가능으로 기록되고 AK80-64(64:1)는 불가로 기록됩니다(데이터, [S15]). 생활지원로봇 안전 규격 ISO 13482가 있다는 점은 (일반 지식)이며, 부품 단위 적용 범위는 불명확합니다(가설).',
      capability: '본질안전 설계, 소음·진동 평가, 인증 대응',
      risk: '인증 비용과 기간이 큽니다. 부품 단위 인증 체계가 불명확합니다.',
      prerequisite: '적용 규격 범위(부품 대 완제품) 결정',
    },
    {
      name: 'F. 데이터·서비스 결합',
      core: '액추에이터 텔레메트리 기반 예지보전, 펌웨어 업데이트 구독을 결합합니다.',
      evidence: 'ARGOS DB에서 액추에이터 텔레메트리·구독 사례는 확인되지 않습니다. 전부 (가설)입니다.',
      capability: '임베디드 OTA, 데이터 파이프라인, 보안·개인정보 대응',
      risk: '가정 내 데이터가 민감하고, 고객 데이터 귀속 분쟁이 생길 수 있습니다.',
      prerequisite: '수집 항목·주기 정의, 데이터 귀속 계약 템플릿',
    },
    {
      name: 'G. 전략 고객 공동개발(OEM 공급 계약)',
      core: '완성차·물류 등 휴머노이드 OEM과 고객 사양 기반 공동개발 후 장기 공급 계약을 맺습니다.',
      evidence:
        'Mobis–Atlas는 CES 2026 공급 계약이고, 후속으로 모터 드라이버·전력 반도체 공급 논의가 보도됐습니다(데이터, [S8][S9]). 다만 그룹 내 사례입니다. 고객 후보군은 (가설)이며 특정 고객사는 명시하지 않습니다. 이 외 공개 채택 사례는 동적 문장 8을 따릅니다(공급 계약 형태는 확인되지 않음).',
      capability: '고객 사양 맞춤 설계, 장기 공급·품질 보증, 양산 캐파',
      risk: '특정 고객 의존, 맞춤화로 표준화가 훼손되고, 고객이 경쟁사일 때 정보 차단이 필요합니다.',
      prerequisite: '후보 고객 목록, 계약 구조(독점·비독점), 정보 차단벽(4절 협업 모델 5번)',
    },
  ] as StrategyOption[],
  collabColumns: ['모델', '내용', '장점', '단점', '의사결정 필요 항목', '근거'],
  collabModels: [
    {
      name: '1. 내부 고객 우선·역할 분담',
      content: '세트 조직이 스펙 오너이자 1차 고객, 부품 사업부가 양산·품질·원가 오너를 맡습니다.',
      pros: '스펙 책임이 명확하고 내부 물량으로 초기 수율을 확보할 수 있습니다.',
      cons: '세트 요구가 부품 표준화를 방해하고 외판이 후순위로 밀릴 수 있습니다.',
      decisions: '스펙 변경 승인권자, 납기·불량률 SLA, 내부 물량 약정',
      evidence: 'LG가 로보틱스사업센터에 사업개발·공급망·제조를 통합했습니다(데이터, [S11]). 역할 분담안은 (가설)입니다.',
    },
    {
      name: '2. 공동 로드맵·게이트와 공용 테스트베드',
      content:
        '세대별 토크·무게·원가 목표를 세트 로드맵과 동기화하고 게이트 심의를 합니다. 내구 시험 설비와 데이터를 공유합니다.',
      pros: '목표 정합성이 높아지고 시험 중복이 줄며 내구 데이터가 축적됩니다.',
      cons: '게이트 운영 부담이 늘고, 데이터 공유 범위 분쟁이 생길 수 있습니다.',
      decisions: '게이트 기준(토크밀도·원가·수명), 심의 주기, 데이터 소유·열람 권한',
      evidence: 'AXIUM 9개 라인업 중 우선 적용 사이즈를 정해야 한다는 점은 (가설)입니다.',
    },
    {
      name: '3. 이전가격·수익 배분·외판 인센티브',
      content: '내부 거래가 산정 방식을 정하고, 외판 매출·이익의 귀속과 성과 지표를 설계합니다.',
      pros: '부품 사업부의 수익 책임이 명확해지고 외판 동기가 생깁니다.',
      cons: '세트 원가가 오르고 사업부 간 갈등이 생길 수 있으며 세무 이슈가 있습니다(일반 지식).',
      decisions: '원가가산 대 시장가 연동, 외판 매출 귀속(부품 사업부 대 세트), KPI',
      evidence: '전부 (가설)입니다.',
    },
    {
      name: '4. IP·특허 소유와 라이선스 범위',
      content: '세트 설계 IP와 부품 공정 IP를 구분하고, 공동 출원과 외판 시 사용 범위를 정합니다.',
      pros: '분쟁을 예방하고 외판 제품의 권리가 명확해집니다.',
      cons: '협상 비용이 크고, 공동 소유 시 단독 실시가 제약될 수 있습니다.',
      decisions: '소유 비율, 크로스 라이선스, 외판 제품 보증·침해 책임',
      evidence: 'Apptronik은 "자체 특허 액추에이터"를 공식 소개합니다(데이터, [S23]). 소유 구조 설계안은 (가설)입니다.',
    },
    {
      name: '5. 외판 채널 분리·정보 차단벽',
      content: '경쟁 세트 제조사에 판매할 때 자사 로드맵·스펙·고객 정보 접근을 통제합니다.',
      pros: '외부 고객의 신뢰를 얻고 이해충돌을 줄입니다.',
      cons: '운영 비용이 늘고 협업 속도가 느려집니다.',
      decisions: '차단 범위(조직·시스템·인력), 외판 영업 조직 위치, 위반 시 책임',
      evidence: 'LG는 완성 로봇과 부품 공급을 동시에 하는 "OEM+부품 공급" 이중 구조로 보도됐습니다(데이터, [S11]). 차단벽 필요성은 (가설)입니다.',
    },
  ] as StrategyCollabModel[],
  metricColumns: ['지표', '정의', '계산 가능 여부', '데이터 원천', '현재값'],
  metricDefs: [
    {
      id: 'M1',
      name: 'M1 자체 개발 확인 회사 비율',
      definition: '자체 개발 확인(자체·자체+외판) 회사 수 ÷ 조달 태세 판정 가능 회사 수. 확인 불가 회사는 분모에서 제외하고 건수를 따로 표기',
      availability: '가능(시점 값)',
      source: '포지션 맵 API robots[].sourcing',
    },
    {
      id: 'M2',
      name: 'M2 외판 확인 세트 제조사 수',
      definition: '외판 확인 회사(제품 기준 외판 확인 ∪ 조달 태세 자체 개발+외판)와 외판 계획 회사(제품 기준)의 수. 계획은 확인에 합치지 않음',
      availability: '가능(시점 값)',
      source: 'suppliers[], robots[].sourcing',
    },
    { id: 'M3', name: 'M3 외판 제품 수와 가격 중앙값', definition: 'priceUsd가 있는 제품 수와 중앙값', availability: '가능(시점 값)', source: 'suppliers[].priceUsd' },
    {
      id: 'M4',
      name: 'M4 외판 가격 추이',
      definition: '월별 최저·중앙·최고',
      availability: '추가 수집 필요: 월 1회 스냅샷 적재. 현재 API는 시점 값만 반환합니다.',
      source: '—',
    },
    {
      id: 'M5',
      name: 'M5 경쟁사 자체 개발 전환 사례',
      definition: '자체↔외부 조달, 자체→외판 전환 건수',
      availability: '부분 가능: CI의 "자체 생산 여부" 변경 이력(ci_value_history)이 있으나 이 API에는 없어 신규 집계가 필요합니다.',
      source: 'CI 값 이력',
    },
    {
      id: 'M6',
      name: 'M6 공급 계약 뉴스 알림',
      definition: '키워드·회사 규칙에 맞는 기사 알림',
      availability: '추가 구현 필요(알림 규칙). 기사 수집(articles)은 이미 있습니다.',
      source: '기사 DB',
    },
    {
      id: 'M7',
      name: 'M7 액추에이터 서브토픽 시계열',
      definition: "'양산·원가·내구', '통합 관절 모듈·배선' 토픽의 최근 대비 직전 증감",
      availability: '가능(관리자 분류 완료 시): /timeline의 topics[].trend.combined',
      source: '같은 페이지의 시계열 섹션',
    },
    { id: 'M8', name: 'M8 LG AXIUM 스펙 공개율', definition: '토크 공개 제품 수 / 전체', availability: '가능', source: 'suppliers[]' },
    { id: 'M9', name: 'M9 가정용 명시 외판 제품 수', definition: 'LG 제외', availability: '가능', source: 'suppliers[].targetMarket' },
    { id: 'M10', name: 'M10 부품 사업 수주 현황', definition: '고객사 수·계약 건수', availability: '추가 수집 필요(수동 입력)', source: '—' },
    {
      id: 'M11',
      name: 'M11 외부 조달 확인 사례 수',
      definition: '조달 태세가 외부 조달·혼합인 로봇 수 + 외부 액추에이터를 쓰는 공개 채택 사례 수',
      availability: '가능(시점 값, 수요 사례는 조사 시점 스냅샷)',
      source: 'robots[].sourcing, adoptions[]',
    },
  ] as StrategyMetricDef[],
  questionsIntro: '연구소와 사업부가 답할 질문입니다.',
  questions: [
    '외판의 1차 목적은 수익, 규모의 경제(원가 하락), 생태계 선점 중 무엇입니까.',
    'AXIUM 9개 라인업 중 외판 대상 사이즈와 대외 공개 스펙(토크·무게·통신·가격)은 무엇입니까. 현재 DB에는 토크·무게·가격이 모두 비어 있습니다.',
    '외판 목표 고객 세그먼트의 우선순위는 무엇입니까(휴머노이드 OEM, 산업 자동화, 연구·교육, 그룹 계열).',
    '경쟁 세트 제조사에도 판매합니까. 판매한다면 정보 차단벽의 범위는 어디까지입니까.',
    '내부 이전가격과 외판 수익 귀속 방식은 무엇입니까.',
    '세트 전용 스펙과 외판 표준 사양의 차이를 어디까지 허용합니까(맞춤 비율 상한).',
    '신뢰성 목표(수명, 고장률, 소음)와 이를 증명할 시험·필드 데이터는 언제 확보됩니까. CLOiD 양산 시점과 연동됩니까.',
    '안전·인증 규격의 적용 범위(부품 단위 대 완제품)와 담당 조직은 어디입니까.',
  ] as string[],
  /** {generatedAt} 자리에 집계 시각이 들어간다 (formatFooter) */
  footer:
    '정적 본문 기준일 {asOf} · 동적 수치 집계 {generatedAt}. 사업화 옵션과 협업 모델은 검토용 가설을 포함하며 사내 검토용입니다. 외부 배포 전 공유 범위를 확인하십시오.',
};

/** 본문의 [S#] 참조 ID 목록 (중복 제거, 등장 순서) */
export function collectSourceRefs(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\[(S\d+)\]/g)) if (!out.includes(m[1]!)) out.push(m[1]!);
  return out;
}

// ── 순수 헬퍼 ────────────────────────────────────────────────────────────────

/** actuator-position-map.service.ts 의 isSameCompany 와 동일 규칙 (첫 토큰 포함 비교) */
export function sameCompany(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const v = a.trim().toLowerCase();
  const c = b.trim().toLowerCase();
  if (!v || !c) return false;
  if (v === c || v.includes(c) || c.includes(v)) return true;
  const vt = v.split(/\s+/)[0] ?? '';
  const ct = c.split(/\s+/)[0] ?? '';
  return vt.length >= 3 && vt === ct;
}

/** 중앙값 — 비어 있으면 null, 짝수 개면 가운데 두 값의 평균. 입력은 변경하지 않는다. */
export function median(values: number[]): number | null {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

export type SaleStatus = 'confirmed' | 'planned' | 'unconfirmed' | 'inhouseOnly';

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  confirmed: '외판 확인',
  planned: '외판 계획',
  unconfirmed: '외판 근거 미확인',
  inhouseOnly: '자사 전용',
};

const SALE_PRIORITY: SaleStatus[] = ['confirmed', 'planned', 'unconfirmed', 'inhouseOnly'];

const validPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const finiteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 제품 단위 판매 상태 판정 — targetMarket·status 가 영어 원문이라는 가정에 의존하는 휴리스틱 */
export function classifySale(p: { status?: string | null; priceUsd?: unknown; targetMarket?: string | null }): SaleStatus {
  const tm = p.targetMarket ?? '';
  if (/\(in-house\)\s*$/i.test(tm)) return 'inhouseOnly';
  // 외판 확인: 판매 중이고 가격이 공개됐거나 메이커·연구·교육을 대상으로 명시한 경우. 타깃 시장의 'external' 문구만으로는 확인으로 보지 않는다.
  if (p.status === 'available' && (validPrice(p.priceUsd) || /makers|research|education/i.test(tm))) return 'confirmed';
  if (p.status === 'announced' && /\bexternal\b/i.test(tm)) return 'planned';
  return 'unconfirmed';
}

// ── 동적 수치 ────────────────────────────────────────────────────────────────

export interface ExternalSourcingEntry {
  robotName: string;
  company: string;
  vendors: string[];
  /** vendors 와 같은 순서의 역할(한글, 없으면 null) */
  roles: (string | null)[];
}

export interface SetMakerSellerProduct {
  model: string;
  priceUsd: number | null;
  peakTorqueNm: number | null;
  weightKg: number | null;
  targetMarket: string | null;
  status: SaleStatus;
}

export interface SetMakerSeller {
  company: string;
  status: SaleStatus;
  products: SetMakerSellerProduct[];
}

export interface PriceBand {
  count: number;
  min: number;
  max: number;
}

export interface StrategySourcingStats extends SourcingSummary {
  companies: {
    /** forecast 제외 로봇이 있는 회사 수 */
    total: number;
    /** 조달 태세 판정 가능(확인 불가 아님) 회사 수 */
    judged: number;
    /** 자체 개발 확인(자체·자체+외판) 회사 수 */
    confirmed: number;
    /** 확인 불가 회사 수 (모든 로봇이 확인 불가) */
    unknown: number;
  };
}

export interface StrategyAdoptionStats {
  /** 전체 (모듈 + 부품) */
  total: number;
  /** 모듈 층 — 1차 수치 */
  module: number;
  /** 부품 층 — "부품 단위 채택 n건" */
  component: number;
  /** 모듈 층 우선, 부품 층은 componentCount */
  bySegment: SegmentCount[];
  byVendor: VendorCount[];
  componentByVendor: VendorCount[];
  /** 모듈 층 채택이 확인된 세그먼트 (segmentOrder 순) */
  externalSegments: MarketSegment[];
}

export interface StrategyStats {
  /** 응답이 있었는지 (null/undefined 입력이면 false) */
  hasData: boolean;
  generatedAt: string | null;
  robotCount: number;
  supplierProductCount: number;
  /** 조달 태세 판정 가능 회사 수 (확인 불가 회사 제외) — 지표 M1 의 분모 */
  companyCount: number;
  /** 자체 개발 확인(자체·자체+외판) 회사 수 */
  inHouseCompanyCount: number;
  inHouseCompanyPct: number | null;
  inHouseCompanyNames: string[];
  /** 조달 태세가 확인 불가가 아닌 로봇 수 */
  robotsWithActuatorCount: number;
  /** 자체 개발 확인(자체·자체+외판) 로봇 수 */
  inHouseRobotCount: number;
  sourcing: StrategySourcingStats;
  externalSourcing: ExternalSourcingEntry[];
  setMakerSellers: SetMakerSeller[];
  sale: Record<SaleStatus, string[]>;
  /** 외판 확인: 제품 기준 외판 확인 ∪ 조달 태세 자체+외판인 회사 (제품 기준 '외판 계획'인 회사는 제외) */
  sellsCompanyNames: string[];
  sellsExternally: number;
  /** 외판 계획: 제품 기준 외판 계획 회사 (예: 2027 외부 공급 로드맵) — 확인에 합치지 않는다 */
  sellsPlannedNames: string[];
  sellsPlanned: number;
  adoptions: StrategyAdoptionStats;
  price: {
    pricedCount: number;
    min: number | null;
    max: number | null;
    median: number | null;
    china: number;
    setMaker: PriceBand | null;
    component: PriceBand | null;
  };
  precision: { nonQddCount: number; nonQddPriced: number };
  lg: { count: number; torque: number; price: number };
  home: { nonLgCount: number };
}

const CHINA_RE = /^(cn|china|prc|hong kong|🇨🇳)$/i;
const HOME_RE = /home|household|domestic|가정/i;
const UNKNOWN_VENDOR = '(공급사 미상)';
const QDD = '직구동/QDD';

const arr = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

function band(values: number[]): PriceBand | null {
  if (values.length === 0) return null;
  return { count: values.length, min: Math.min(...values), max: Math.max(...values) };
}

export function computeStrategyStats(data: ActuatorMapResponse | null | undefined): StrategyStats {
  const robots: ActuatorMapRobot[] = arr(data?.robots).filter((r) => r && !r.forecast);
  const suppliers: ActuatorSupplierProduct[] = arr(data?.suppliers).filter((s) => s && typeof s.vendor === 'string');
  const adoptionList = arr(data?.adoptions).filter(Boolean);

  // 조달 태세 (로봇·회사 단위). 회사 단위는 자체+외판 > 자체 > 외부 > 확인 불가 우선순위.
  const summary = summarizeSourcing(robots);
  const coMap = companyPosture(robots);
  const coList = [...coMap.values()];
  const judged = coList.filter((c) => c.posture !== 'unknown');
  const confirmed = judged.filter((c) => c.posture === 'in_house' || c.posture === 'in_house_sells');
  const sellsPostureCompanies = coList.filter((c) => c.posture === 'in_house_sells').map((c) => c.company);

  // 외부 조달 로봇: 조달 태세가 외부 조달·혼합. 공급사는 모듈 층만(부품 층은 제외), 비어 있으면 액추에이터의 외부 공급사로 폴백
  const external: ExternalSourcingEntry[] = [];
  for (const r of robots) {
    if (r.sourcing?.posture !== 'external') continue;
    const ev = arr(r.sourcing.externalVendors);
    const moduleVendors = ev.filter((v) => v.level !== 'component' && v.vendor.trim());
    const pool = moduleVendors.length ? moduleVendors : ev.filter((v) => v.vendor.trim());
    const vendors: string[] = [];
    const roles: (string | null)[] = [];
    for (const v of pool) {
      if (!vendors.includes(v.vendor.trim())) {
        vendors.push(v.vendor.trim());
        roles.push(roleKo(v.role));
      }
    }
    if (vendors.length === 0) {
      for (const a of arr(r.actuators)) {
        const v = (a.vendor ?? '').trim();
        if (a.inHouse === false && v && v !== UNKNOWN_VENDOR && !vendors.includes(v)) {
          vendors.push(v);
          roles.push(null);
        }
      }
    }
    if (vendors.length > 0) external.push({ robotName: r.name, company: r.company, vendors, roles });
  }

  // 공급사 제품 ↔ 세트 제조사 매칭
  const robotCompanies: string[] = [];
  for (const r of robots) if (r.company && !robotCompanies.some((c) => norm(c) === norm(r.company))) robotCompanies.push(r.company);
  const matchSetMaker = (vendor: string): string | null => robotCompanies.find((c) => sameCompany(vendor, c)) ?? null;
  const lgCompanies = [...new Set(robots.filter((r) => r.isLG).map((r) => r.company))];
  const isLgVendor = (vendor: string) => lgCompanies.some((c) => sameCompany(vendor, c));

  const sellerMap = new Map<string, SetMakerSeller>();
  for (const s of suppliers) {
    if (!s.vendor.trim()) continue;
    const co = matchSetMaker(s.vendor);
    if (!co) continue;
    const status = classifySale(s);
    const seller = sellerMap.get(co) ?? { company: co, status, products: [] };
    seller.products.push({
      model: s.model,
      priceUsd: s.priceUsd,
      peakTorqueNm: s.peakTorqueNm,
      weightKg: s.weightKg,
      targetMarket: s.targetMarket,
      status,
    });
    sellerMap.set(co, seller);
  }
  const setMakerSellers = [...sellerMap.values()];
  const sale: Record<SaleStatus, string[]> = { confirmed: [], planned: [], unconfirmed: [], inhouseOnly: [] };
  for (const seller of setMakerSellers) {
    seller.status = SALE_PRIORITY.find((st) => seller.products.some((p) => p.status === st)) ?? 'unconfirmed';
    sale[seller.status].push(seller.company);
  }
  // 외판 확인 = 제품 기준 확인 ∪ 조달 태세 자체+외판 (회사명 정규화로 중복 제거). 제품 기준 '외판 계획'인 회사는 확인에 넣지 않고 계획 쪽에만 둔다.
  const sellsCompanyNames: string[] = [];
  for (const c of [...sale.confirmed, ...sellsPostureCompanies]) {
    if (sale.planned.some((x) => norm(x) === norm(c)) && !sale.confirmed.some((x) => norm(x) === norm(c))) continue;
    if (!sellsCompanyNames.some((x) => norm(x) === norm(c))) sellsCompanyNames.push(c);
  }
  const sellsPlannedNames = [...sale.planned];

  // 수요 사례 — 모듈 층을 1차 수치로, 부품 층은 따로
  const order = resolveSegmentOrder(data?.segmentOrder);
  const totals = adoptionTotals(adoptionList);
  const bySegment = adoptionBySegment(adoptionList, order);

  // 가격
  const priced = suppliers.filter((s) => validPrice(s.priceUsd));
  const prices = priced.map((s) => s.priceUsd as number);
  const setMakerPrices = priced.filter((s) => matchSetMaker(s.vendor) != null).map((s) => s.priceUsd as number);
  const componentPrices = priced.filter((s) => matchSetMaker(s.vendor) == null).map((s) => s.priceUsd as number);

  // 정밀 진영 (QDD 외)
  const nonQdd = suppliers.filter((s) => s.type !== QDD);

  // LG
  const lgProducts = suppliers.filter((s) => isLgVendor(s.vendor));

  return {
    hasData: data != null,
    generatedAt: data?.generatedAt ?? null,
    robotCount: robots.length,
    supplierProductCount: suppliers.length,
    companyCount: judged.length,
    inHouseCompanyCount: confirmed.length,
    inHouseCompanyPct: judged.length > 0 ? Math.round((confirmed.length / judged.length) * 100) : null,
    inHouseCompanyNames: confirmed.map((c) => c.company),
    robotsWithActuatorCount: summary.robots - summary.unknown,
    inHouseRobotCount: summary.inHouse + summary.inHouseSells,
    sourcing: {
      ...summary,
      companies: { total: coList.length, judged: judged.length, confirmed: confirmed.length, unknown: coList.length - judged.length },
    },
    externalSourcing: external,
    setMakerSellers,
    sale,
    sellsCompanyNames,
    sellsExternally: sellsCompanyNames.length,
    sellsPlannedNames,
    sellsPlanned: sellsPlannedNames.length,
    adoptions: {
      total: totals.total,
      module: totals.module,
      component: totals.component,
      bySegment,
      byVendor: adoptionByVendor(adoptionList, 'module'),
      componentByVendor: adoptionByVendor(adoptionList, 'component'),
      externalSegments: bySegment.filter((c) => c.count > 0).map((c) => c.segment),
    },
    price: {
      pricedCount: prices.length,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      median: median(prices),
      china: priced.filter((s) => CHINA_RE.test((s.country ?? '').trim())).length,
      setMaker: band(setMakerPrices),
      component: band(componentPrices),
    },
    precision: { nonQddCount: nonQdd.length, nonQddPriced: nonQdd.filter((s) => validPrice(s.priceUsd)).length },
    lg: {
      count: lgProducts.length,
      torque: lgProducts.filter((s) => finiteNum(s.peakTorqueNm) || finiteNum(s.continuousTorqueNm)).length,
      price: lgProducts.filter((s) => finiteNum(s.priceUsd)).length,
    },
    home: { nonLgCount: suppliers.filter((s) => !isLgVendor(s.vendor) && HOME_RE.test(s.targetMarket ?? '')).length },
  };
}

// ── 문장·지표 생성 ───────────────────────────────────────────────────────────

const DASH = '—';

const usd = (v: number | null): string => (v == null || !Number.isFinite(v) ? DASH : fmtUSD(v));
const names = (list: string[]): string => (list.length ? list.join(', ') : '없음');

function bandText(label: string, b: PriceBand | null): string {
  return b ? `${label} ${b.count}개(최저 ${usd(b.min)}~최고 ${usd(b.max)})` : `${label} 0개`;
}

/** 집계 시각 표시 — 시간대에 따라 달라지지 않도록 KST(UTC+9) 고정. 해석 불가면 '—' */
export function formatGeneratedAt(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return DASH;
  const d = new Date(t + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} KST`;
}

export function formatFooter(stats: Pick<StrategyStats, 'hasData' | 'generatedAt'> | null | undefined): string {
  const g = stats && stats.hasData ? formatGeneratedAt(stats.generatedAt) : DASH;
  return STRATEGY_CONTENT.footer.replace('{asOf}', STRATEGY_CONTENT.asOf).replace('{generatedAt}', g);
}

/** 카드 부제 (동적). 데이터가 없으면 동적 자리를 '—'로 둔다. */
export function buildSubtitle(stats: StrategyStats | null | undefined): string {
  const has = !!stats && stats.hasData;
  return `데이터 집계 ${has ? formatGeneratedAt(stats!.generatedAt) : DASH} · 로봇 ${has ? stats!.robotCount : DASH}기 · 공급사 제품 ${has ? stats!.supplierProductCount : DASH}개 · 수요 사례 ${has ? stats!.adoptions.total : DASH}건 · 정적 본문 기준일 ${STRATEGY_CONTENT.asOf}`;
}

/** 채택 사례 세그먼트 요약 문구: "1군 세트사 양산 공급·위탁제조 3건, 2군 휴머노이드·레그드 4건" (모듈 층 기준, 사례 있는 세그먼트만) */
export function adoptionSegmentSummary(a: StrategyAdoptionStats): string {
  return segmentLabelList(a.bySegment, '건');
}

/**
 * 헤드라인 메시지 — 웹 섹션 최상단, 지도 카드 최상단, 전략 카드 최상단에서 같은 문장을 쓴다.
 * 데이터가 없으면 수치 자리는 '—'.
 */
export function buildHeadlineMessage(s: StrategyStats): string {
  const has = s.hasData;
  const v = (n: number) => (has ? String(n) : DASH);
  const sc = s.sourcing;
  const a = s.adoptions;
  let tail: string;
  if (!has) tail = `(가설) 외부 채택이 확인된 시장은 ${DASH}입니다.`;
  else if (a.total === 0) tail = '외부 채택 사례는 아직 수집되지 않았습니다.';
  else if (a.module === 0) tail = `(가설) 외부 채택이 확인된 시장은 부품 단위 사례 ${a.component}건뿐이며 모듈 단위 채택은 확인되지 않았습니다.`;
  else tail = `(가설) 외부 채택이 확인된 시장은 ${adoptionSegmentSummary(a)}입니다.${a.component > 0 ? ` (부품 단위 채택 ${a.component}건은 별도)` : ''}`;
  return `핵심 메시지: 로봇 제조사 현황을 보면 액추에이터는 자체 개발 확인 ${v(sc.inHouse)}기, 자체 개발+외판 ${v(sc.inHouseSells)}기, 외부 조달 ${v(sc.external)}기이고 ${v(sc.unknown)}기는 근거 부족으로 확인 불가입니다. 세트(LG CLOiD)는 직접 기여 3(1차 고객 물량, 양산 사양·인터페이스 표준 정의, 필드 내구 데이터)과 간접 기여 3(레퍼런스 로봇 데모, 외부 로봇사 공동개발 플랫폼, ARGOS 벤치마크 공유)으로 액추에이터 사업에 기여할 수 있다는 것이 검토안입니다. ${tail}`;
}

const MOBIS_SENTENCE =
  ' 그룹 내 부품사 공급 사례는 Hyundai Mobis–Atlas로, 설계는 세트 제조사가 하고 양산 단계 액추에이터 공급은 부품사가 맡는 구조입니다. Mobis가 같은 그룹 계열이라는 점은 (일반 지식)입니다.';

/** 1절 동적 문장 8개 — 웹·다운로드 HTML 공용. 4~7번은 이전 버전과 같은 위치·의미를 유지한다. */
export function buildDiagnosisLines(s: StrategyStats): string[] {
  const sc = s.sourcing;
  const pct = s.inHouseCompanyPct == null ? '—' : `${s.inHouseCompanyPct}%`;
  const line1 = `ARGOS에 등록된 로봇 ${sc.robots}기의 액추에이터 조달 태세는 자체 개발 확인 ${sc.inHouse}기, 자체 개발+외판 ${sc.inHouseSells}기, 외부 조달(혼합 포함) ${sc.external}기, 확인 불가 ${sc.unknown}기입니다. 자체 개발 확인은 A·B 등급 근거가 있는 경우만 세며, 근거를 찾지 못한 ${sc.unknown}기는 확인 불가로 분리했습니다(이 중 자체 개발로 추정되는 로봇 ${sc.unknownPresumed}기). 회사 기준으로 자체 개발이 확인된 회사는 판정 가능한 ${sc.companies.judged}개사 중 ${sc.companies.confirmed}개사(${pct})이고, 확인 불가 ${sc.companies.unknown}개사는 비율에서 제외했습니다.`;

  const ext =
    s.externalSourcing.length === 0
      ? '외부 조달이 기록된 로봇은 없습니다.'
      : `외부 조달이 기록된 로봇은 ${s.externalSourcing.length}기입니다. ${s.externalSourcing
          .map((e) => `${e.robotName}(${e.company}) – ${e.vendors.map((v, i) => (e.roles[i] ? `${v}(${e.roles[i]})` : v)).join(', ')}`)
          .join('; ')}`;
  const hasMobis = s.externalSourcing.some((e) => e.vendors.some((v) => /mobis/i.test(v)));
  // 목록 뒤에 마침표를 붙여 다음 문장과 이어지지 않게 한다 (없음 문장은 이미 마침표로 끝난다)
  const line2 = s.externalSourcing.length === 0 ? ext : `${ext}.${hasMobis ? MOBIS_SENTENCE : ''}`;

  const sellerCount = s.setMakerSellers.length;
  const price = s.price;
  const priceLine =
    price.pricedCount === 0
      ? '가격이 등록된 제품이 없습니다.'
      : `가격이 등록된 제품 ${price.pricedCount}개의 가격은 ${usd(price.min)}~${usd(price.max)}, 중앙값 ${usd(price.median)}입니다. 이 중 중국 회사 제품은 ${price.china}개이고, ${bandText('세트 제조사 제품', price.setMaker)}, ${bandText('부품 전문사 제품', price.component)}입니다.`;

  const nonQdd =
    `QDD 외 타입으로 분류된 제품 ${s.precision.nonQddCount}개 중 가격이 등록된 제품은 ${s.precision.nonQddPriced}개입니다.` +
    (s.precision.nonQddPriced === 0 ? ' 일본·유럽 정밀 감속기·모터 진영과의 가격 직접 비교는 현재 데이터로 할 수 없습니다.' : '');

  const line3 = `세트 제조사이면서 액추에이터 제품이 등록된 회사는 ${sellerCount}개사입니다. 외판 확인 ${s.sale.confirmed.length}개사(${names(s.sale.confirmed)}), 외판 계획 ${s.sale.planned.length}개사(${names(s.sale.planned)}), 외판 근거 미확인 ${s.sale.unconfirmed.length}개사(${names(s.sale.unconfirmed)}), 자사 전용 ${s.sale.inhouseOnly.length}개사(${names(s.sale.inhouseOnly)})입니다. 제품 등록과 조달 태세를 합쳐 보면 외판 확인 ${s.sellsExternally}개사(${names(s.sellsCompanyNames)}), 외판 계획 ${s.sellsPlanned}개사(${names(s.sellsPlannedNames)})입니다.`;

  const a = s.adoptions;
  let line8: string;
  if (a.total === 0) line8 = '공개 채택 사례는 아직 수집되지 않았습니다.';
  else {
    const vendors = a.byVendor.slice(0, 8).map((v) => `${v.vendor} ×${v.count}`);
    const more = a.byVendor.length > 8 ? ` 외 ${a.byVendor.length - 8}개 공급사` : '';
    line8 =
      `외부 액추에이터를 쓰는 공개 채택 사례는 모듈 단위 ${a.module}건입니다` +
      (a.component > 0 ? `(부품 단위 채택 ${a.component}건은 따로 셉니다). ` : '. ') +
      (a.module > 0
        ? `세그먼트별로 ${adoptionSegmentSummary(a)}이며, 공급사별로는 ${vendors.join(', ')}${more}입니다. LG가 판매할 수 있는 시장은 이 채택이 확인된 세그먼트 안에서 찾는 것이 합리적입니다. (가설)`
        : '모듈 단위 채택은 확인되지 않았습니다.');
  }

  return [
    line1,
    line2,
    line3,
    priceLine,
    nonQdd,
    `LG전자 액추에이터 제품 ${s.lg.count}개 중 토크 공개 ${s.lg.torque}개, 가격 공개 ${s.lg.price}개입니다.`,
    `LG전자를 제외한 등록 제품 중 타깃 시장에 가정용을 명시한 제품은 ${s.home.nonLgCount}개입니다.`,
    line8,
  ];
}

export interface StrategyMetricRow {
  id: string;
  name: string;
  definition: string;
  availability: string;
  source: string;
  currentValue: string;
}

/** 5절 지표 표 — 데이터가 없으면(hasData=false) 현재값은 모두 '—' */
export function buildMetricRows(s: StrategyStats): StrategyMetricRow[] {
  const has = s.hasData;
  const m1 =
    s.companyCount > 0 ? `${s.inHouseCompanyPct}% (${s.inHouseCompanyCount}/${s.companyCount}개사) · 확인 불가 ${s.sourcing.companies.unknown}개사` : DASH;
  const a = s.sourcing.external;
  const b = s.adoptions.module;
  const cur: Record<string, string> = {
    M1: m1,
    M2: `확인 ${s.sellsExternally} · 계획 ${s.sellsPlanned}`,
    M3: `${s.price.pricedCount}개 / ${usd(s.price.median)}`,
    M8: `${s.lg.torque}/${s.lg.count}`,
    M9: `${s.home.nonLgCount}개`,
    M11: `${a + b}건 (제조사 로봇 ${a} + 공개 채택 ${b})${s.adoptions.component > 0 ? ` · 부품 단위 ${s.adoptions.component}건 별도` : ''}`,
  };
  return STRATEGY_CONTENT.metricDefs.map((d) => ({
    id: d.id,
    name: d.name,
    definition: d.definition,
    availability: d.availability,
    source: d.source,
    currentValue: has && cur[d.id] != null ? cur[d.id]! : DASH,
  }));
}

/** 세그먼트 라벨 (정적 HTML·카드 공용 재노출) */
export { SEGMENT_LABEL };
