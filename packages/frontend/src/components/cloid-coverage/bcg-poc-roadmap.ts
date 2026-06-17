// BCG CEO Biweekly 보고 #3 — [Physical AI] 로보틱스 사업기회 (2026-05-22)
// "CLOiD 학습向 공정 Task PoC 로드맵" 권위 데이터.
//
// 본 모듈은 lge-washer-processes.ts 의 1차 추정(estimated) 동작군 매핑을
// 보정하기 위한 *원본 출처* 데이터를 담는다. 모든 수치/등급은 BCG 보고서
// 본문(공정 Task PoC 로드맵 챕터, p.5~25)에서 직접 추출한 값이다.
//
// Source: BCG Analysis / LG전자 내부자료 / 창원·평택 공장 Site Visit / Expert Interviews
// 수립 방법론: 검토 대상 566개 非자동화 공정 Task → 필터링 후 56개 Shortlist
//   (공장 실무 30 + BCG 26) → Impact-Feasibility 평가 → 30개 PoC 로드맵
//   (Wave I/II/III 각 10개), 최종 566개 Task 中 80%+ 대응 목표.

import type { MotionGroup } from './lge-washer-processes';

export const BCG_SOURCE = {
  title: 'CEO Biweekly 보고 #3 — [Physical AI] 로보틱스 사업기회',
  author: 'Boston Consulting Group',
  date: '2026-05-22',
  chapter: 'CLOiD 학습向 공정 Task PoC 로드맵',
} as const;

// ── 시장 규모 (제조용 Semi-휴머노이드 TAM) ────────────────────
export const SEMI_HUMANOID_TAM = {
  tamUsd: 50_000_000_000, // $50B
  label: '$50B',
  basis: 'OECD 회원국 제조인력 8,000만명 中 비정형 업무 인력 × Semi-휴머노이드 침투율 10% × 로봇가격 $30k × 교체연수 5년',
  assumptions: [
    { k: '제조인력', v: '8,000만명', note: "'23년 OECD 회원국 총 제조인력" },
    { k: 'Semi-휴머노이드 침투율', v: '10%', note: '자동차 비정형 Task 67% × 자동화율 15%(정형의 1/3)' },
    { k: '로봇가격', v: '$30k', note: '현재 $150k~190k → 개화 후 가격경쟁으로 $30k 수렴 가정' },
    { k: '교체연수', v: '5년', note: '휴머노이드 HW 수명 4~6년' },
  ],
} as const;

// ── 난이도 관점 7대 작업 유형 (低→高) ───────────────────────
// 글로벌社 PoC 집중 영역(검사~고정체 P&P) 대비 LG 테너시 PoC(非고정)는 개발 難
export type DifficultyLevel = '下' | '中下' | '中' | '中上' | '上';

export interface TaskTypeProfile {
  order: number;            // 난이도 순서 (1=최저)
  type: string;             // 작업 유형
  motionGroup: MotionGroup | 'vision';
  reason: string;           // 난이도 사유
  lgExample: string;        // LG 예시 Task
  globalFocus: boolean;     // 글로벌社 PoC 집중 영역 여부
}

export const TASK_TYPE_PROFILES: TaskTypeProfile[] = [
  {
    order: 1, type: 'Vision 검사', motionGroup: 'vision', globalFocus: true,
    reason: '물리 조작 없이 비전 센서만으로 수행 가능',
    lgExample: '도색 육안 검사',
  },
  {
    order: 2, type: 'Grip + Push/Pull/Tilt', motionGroup: 'grip_push', globalFocus: false,
    reason: '파지 이후 특정 방향·특정 크기의 힘 추가 제어 필요',
    lgExample: '오븐 Knob 삽입',
  },
  {
    order: 3, type: '고정체 Pick & Place', motionGroup: 'pick_place', globalFocus: true,
    reason: '파지 후 팔/몸체 방향 바꿔 내려놓아 파지 外 힘 제어 불필요',
    lgExample: '오븐 드로워 Pick & Place',
  },
  {
    order: 4, type: '나사 체결', motionGroup: 'screw', globalFocus: false,
    reason: '도구 사용으로 간접 제어, 정밀 위치 정렬 후 전진 제어 필요',
    lgExample: '에어컨 방진용 고무마운트 체결',
  },
  {
    order: 5, type: '非고정물체 Pick & Place', motionGroup: 'non_fixed', globalFocus: false,
    reason: '목표 대상/지점 위치 실시간 예측하며 경로 지속 갱신 필요',
    lgExample: '세탁기 Top-plate 행잉랙 로딩/언로딩 (現 LG 테너시 PoC)',
  },
  {
    order: 6, type: '용접', motionGroup: 'welding', globalFocus: false,
    reason: '토치 파지한 채 경로 위 모든 점에서 위치/힘/속도 연속 제어',
    lgExample: '세탁기 컴프 냉매배관 브레이징 용접',
  },
  {
    order: 7, type: '하네스 체결', motionGroup: 'harness', globalFocus: false,
    reason: '실시간 형상 변형 대응, 체결 위해 5지 정밀 제어 + 촉각 피드백 必',
    lgExample: '에어컨 이오나이져/센서/EEV 결선',
  },
];

// ── 10대 우선순위 공정 Task (Wave I) ─────────────────────────
// Impact-Feasibility 평가 기반 1차 PoC 대상. rationale 문구는 BCG 본문 verbatim.
export type ImpactRating = 'H' | 'M' | 'L';

export interface BcgPocTask {
  rank: number;             // 1~10 우선순위
  line: '부품' | '오븐' | '냉장고' | '에어컨' | '세탁기';
  name: string;
  work: string;             // 공정 설명
  motionGroup: MotionGroup;
  impact: ImpactRating;
  feasibility: ImpactRating;
  difficulty: DifficultyLevel;
  taktTimeSec: number | null; // null = 간접 공정 (Takt 제약 없음)
  taktNote?: string;
  weightKg?: number;
  internalExpansionPct: number; // 자사 全공정 內 동작군 비중
  hazard?: string;          // 유해환경 (없으면 undefined)
  techLinkage: string;      // 기술 연계성
  externalPotential: string;// 외부 판매 잠재성
  formFactor: string;       // 現 CLOiD 폼팩터 대응
  isCurrentLgPoc?: boolean; // 現 LG전자 테너시 PoC 여부
}

export const BCG_POC_TASKS: BcgPocTask[] = [
  {
    rank: 1, line: '부품', name: '버핑 OS 부품 로딩', motionGroup: 'pick_place',
    work: '대차에서 OS 부품을 취출해 표면처리 공정 컨베이어 위로 공급',
    impact: 'H', feasibility: 'H', difficulty: '下', taktTimeSec: 8, taktNote: '속도 조절 가능',
    weightKg: 2.5, internalExpansionPct: 13, hazard: '금속분진 발생',
    techLinkage: '파지는 全 동작 연계성 최상', externalPotential: 'ROI 높은 비자동화 영역 대규모 존재',
    formFactor: '휠/그리퍼 가능, 2.5kg로 여유',
  },
  {
    rank: 2, line: '오븐', name: '드로워 Pick & Place', motionGroup: 'pick_place',
    work: '1층 층간 리프트에 이송된 드로워를 들어 조립 라인 위로 공급',
    impact: 'H', feasibility: 'H', difficulty: '中下', taktTimeSec: 12, taktNote: 'cycle time 比 여유',
    weightKg: 7, internalExpansionPct: 13, hazard: '중량 작업(7kg)',
    techLinkage: '파지는 全 동작 연계성 최상', externalPotential: 'ROI 높은 비자동화 영역 대규모 존재',
    formFactor: '휠/그리퍼 가능, 7kg 가능',
  },
  {
    rank: 3, line: '부품', name: '모터 Ass\'y 포장 장입', motionGroup: 'pick_place',
    work: '컨베이어에 이송된 EC 모터 Ass\'y를 포장 박스 내 칸에 맞게 장입',
    impact: 'H', feasibility: 'H', difficulty: '中下', taktTimeSec: 5, taktNote: '속도 조절 가능',
    weightKg: 8, internalExpansionPct: 13, hazard: '중량 작업(8kg)',
    techLinkage: '파지는 全 동작 연계성 최상', externalPotential: 'ROI 높은 비자동화 영역 대규모 존재',
    formFactor: '휠/그리퍼 가능, 8kg 가능',
  },
  {
    rank: 4, line: '냉장고', name: 'F Drawer 삽입', motionGroup: 'grip_push',
    work: '대차에서 서랍을 취출해 냉동실 내부 서랍 레일에 맞춰 삽입',
    impact: 'H', feasibility: 'M', difficulty: '下', taktTimeSec: 12.5,
    weightKg: 10, internalExpansionPct: 47, hazard: '고중량 작업',
    techLinkage: '파지 + 다방향 힘 제어', externalPotential: '단순 삽입은 자동화 高',
    formFactor: '휠/그리퍼 가능, 10kg 가능',
  },
  {
    rank: 5, line: '오븐', name: 'Knob 삽입', motionGroup: 'grip_push',
    work: '조작 Knob을 대차에서 취출해 컨트롤러 D컷에 수평 삽입',
    impact: 'H', feasibility: 'M', difficulty: '中下', taktTimeSec: 12, taktNote: 'cycle time 比 여유',
    weightKg: 1.9, internalExpansionPct: 47,
    techLinkage: '파지 + 다방향 힘 제어', externalPotential: '단순 삽입은 자동화 高',
    formFactor: '휠/그리퍼 가능, 1.9kg 여유',
  },
  {
    rank: 6, line: '에어컨', name: '라벨지 부착 (간접)', motionGroup: 'grip_push',
    work: '간접 공정에서 라벨지를 부착',
    impact: 'H', feasibility: 'M', difficulty: '中', taktTimeSec: null, taktNote: '간접 공정으로 제약 없음',
    weightKg: 0.3, internalExpansionPct: 47,
    techLinkage: '파지 + 다방향 힘 제어', externalPotential: '라벨 부착은 규모 크지 않음',
    formFactor: '휠/그리퍼 가능, 0.3kg 여유',
  },
  {
    rank: 7, line: '에어컨', name: 'Comp Nut 체결', motionGroup: 'screw',
    work: '도구를 사용해 Comp Nut을 수직으로 나사 체결',
    impact: 'M', feasibility: 'H', difficulty: '中', taktTimeSec: 9, taktNote: '조절 가능',
    internalExpansionPct: 25,
    techLinkage: '타 유형의 기반 기술은 아님', externalPotential: '제조업 공정 內 대량, 비자동화로 수요 高',
    formFactor: '휠/그리퍼 가능, 소형 Nut 무게',
  },
  {
    rank: 8, line: '세탁기', name: 'Top-Plate 로딩/언로딩', motionGroup: 'non_fixed',
    work: '도장 후 행잉랙에 걸려 있는 Top Plate를 잡고 들어 언로딩한 후 뒤 선반에 삽입',
    impact: 'M', feasibility: 'H', difficulty: '中上', taktTimeSec: 5, taktNote: '로봇 복수 배치 공간 여유',
    weightKg: 4.3, internalExpansionPct: 2,
    techLinkage: '실시간 추적 및 반응 기술 기반, 확장 연계성 高', externalPotential: '도장·도금 공정 등 일부 존재',
    formFactor: '휠/그리퍼 가능, 4.3kg 여유', isCurrentLgPoc: true,
  },
  {
    rank: 9, line: '세탁기', name: '컴프 냉매배관 용접 (브레이징)', motionGroup: 'welding',
    work: '토치를 이용해 컴프 흡입/토출 구리 배관을 브레이징으로 접합',
    impact: 'M', feasibility: 'H', difficulty: '中上', taktTimeSec: 18, taktNote: '여유',
    internalExpansionPct: 1, hazard: '고열·금속흄·플럭스 증기 (화상/흡입 위험)',
    techLinkage: '타 유형의 기반 기술은 아님', externalPotential: '대규모 공정이나 숙련공 소수, 비자동화로 수요 最高',
    formFactor: '휠 가능, dexterous hand/Tool 모듈형 필요',
  },
  {
    rank: 10, line: '에어컨', name: '이오나이져/센서/EEV 결선', motionGroup: 'harness',
    work: '하네스 묶음을 구멍에 끼워 정리한 후 이오나이져/센서/EEV 하네스를 잡아 3점 체결',
    impact: 'L', feasibility: 'H', difficulty: '上', taktTimeSec: 9.5, taktNote: '9.5s 내 3점 체결 필요',
    internalExpansionPct: 13,
    techLinkage: '타 유형의 기반 기술은 아님', externalPotential: '전장/가전 등 대규모 공정, 비자동화로 수요 最高',
    formFactor: 'dexterous hand만 가능',
  },
];

// ── RFM 순차 고도화 / 상용화 로드맵 (동작군 6유형) ────────────
// '29년부터 전공정 13% 적용, '33년부터 86% 상용화 기대.
export interface CommercializationTrack {
  motionGroup: MotionGroup;
  label: string;
  coveragePct: number;  // 상용화 시 전공정 적용 비중
  taskCount: number;    // 적용 Task 수
  futureExample: string;// 후속 Wave 대표 Task
}

export const COMMERCIALIZATION_TRACKS: CommercializationTrack[] = [
  { motionGroup: 'pick_place', label: 'Pick & Place',        coveragePct: 13, taskCount: 76,  futureExample: '오븐 캐비닛 언로딩' },
  { motionGroup: 'grip_push',  label: 'Grip + Push/Pull/Tilt', coveragePct: 47, taskCount: 265, futureExample: '세탁기 캐비닛 커버 체결' },
  { motionGroup: 'screw',      label: '나사 체결',            coveragePct: 25, taskCount: 141, futureExample: '냉장고 Hot Line 올림' },
  { motionGroup: 'non_fixed',  label: '비고정 대상 작업',     coveragePct: 1,  taskCount: 12,  futureExample: '컴프 D 커버 삽입' },
  { motionGroup: 'welding',    label: '용접',                 coveragePct: 1,  taskCount: 8,   futureExample: '에어컨 응축기 용접' },
  { motionGroup: 'harness',    label: '하네스 체결',          coveragePct: 13, taskCount: 71,  futureExample: '세탁기 모터 하우징 결선' },
];

export const ROADMAP_METHODOLOGY = {
  reviewedTasks: 566,    // 검토 대상 非자동화 공정 Task
  shortlistTasks: 56,    // 1차 Shortlist (공장 실무 30 + BCG 26)
  roadmapTasks: 30,      // PoC 로드맵 (Wave I/II/III 각 10)
  targetCoveragePct: 80, // 최종 566개 Task 中 대응 목표
  commercialStartYear: 2029,
  commercialStartPct: 13,
  fullScaleYear: 2033,
  fullScalePct: 86,
} as const;

// ── 경쟁사 PoC 벤치마킹 (글로벌 세미휴머노이드 44개 PoC) ───────
// 과반(33개:75%)이 개발 용이한 Pick & Place形. 상용화-마케팅 PoC 구분 운영이 핵심.
export const COMPETITOR_BENCHMARK = {
  total: 44,
  byType: [
    { type: 'Pick & Place', count: 33, pct: 75 },
    { type: 'QC (비전 검사)', count: 5, pct: 11 },
    { type: '기타', count: 6, pct: 14 },
  ],
  pickPlaceSubtypes: [
    { type: '물체 이동 (작업공간 內)', count: 22, pct: 67 },
    { type: '정밀 배치', count: 5, pct: 15 },
    { type: '물체 분류', count: 4, pct: 12 },
    { type: '물체 운반', count: 2, pct: 6 },
  ],
  samples: [
    { vendor: 'Figure AI', customer: 'BMW', task: 'BMW 차체向 판금패널을 들어 올린 후 용접 지그에 정밀 배치' },
    { vendor: 'Tesla', customer: 'Tesla', task: '배터리 셀을 품질 등급별 분류하며 조립 작업자용 토트 내 배치' },
    { vendor: 'Boston Dynamics', customer: 'Hyundai Motor', task: '적재함/선반으로 부품을 운반 및 배치' },
    { vendor: 'Agility Robotics', customer: 'Amazon', task: '물류 창고 내 중형 토트 박스 이송' },
    { vendor: 'UBTech', customer: 'BYD', task: '자동차 부품을 대차에서 지정 위치로 운반 (라인 or AMR/AGV)' },
    { vendor: 'Apptronik', customer: 'Mercedes-Benz', task: '조립 부품/토트 박스를 집어 인간 작업자에게 전달' },
    { vendor: 'Agibot', customer: 'SAIC-GM', task: 'Buick 배터리 생산라인向 배터리 셀 집어 올리고 적재' },
    { vendor: 'Fourier Intelligence', customer: 'SAIC-GM', task: '고전압 부품 설치' },
  ],
  // 상용화 성숙도 — 인간 대비 작업 속도 (Figure AI BMW 11개월 파일럿)
  maturity: {
    vendor: 'Figure AI',
    pilot: 'BMW 스파턴버그 공장 11개월 (1,250시간+ 런타임)',
    placeAccuracyPct: 99,
    speedStartPct: 25,    // PoC 초기 인간 속도 대비
    speedAfterPct: 70,    // 11개월 후
    industryMaxPct: 50,   // 現 기술 수준 Pick & Place 인간 속도 대비 최대
  },
} as const;

export const BENCHMARK_INSIGHTS = [
  {
    tag: 'A',
    title: '단순 Pick & Place 중심의 現 PoC 로드맵',
    body: '글로벌 (세미)휴머노이드 PoC 44개 중 과반(33개·75%)이 개발 용이한 Pick & Place形',
  },
  {
    tag: 'B',
    title: '低난이도 Task도 인간 숙련도까지 최소 2~3년',
    body: '데이터 확보 이슈 외 Hardware 바틀넥(SoC 연산속도/발열)까지 해소해야 인간 ~80% 속도 지속화 가능',
  },
  {
    tag: 'C',
    title: '상용화-마케팅 PoC 間 철저한 자원 구분',
    body: '글로벌社는 PoC 목적 기반 폼팩터·학습방식·개발조직까지 이원화, 마케팅 PoC는 펀딩 위해 지속',
  },
];

export const IMPACT_LABEL: Record<ImpactRating, string> = { H: '高', M: '中', L: '低' };
