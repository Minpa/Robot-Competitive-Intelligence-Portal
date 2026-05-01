export type DomainStatus = 'ACTIVE' | 'PLANNED';

export interface DomainDef {
  id: number;
  nameKr: string;
  nameEn: string;
  status: DomainStatus;
  taskCount: number;
  sectorCount: number;
  cellsTotal: number;
  cellsFilled: number;
  tagline: string;
  tasks: string[];
  sectors: string[];
  hint: string;
}

export const DOMAINS: DomainDef[] = [
  {
    id: 1,
    nameKr: '산업',
    nameEn: 'Industrial',
    status: 'ACTIVE',
    taskCount: 12,
    sectorCount: 12,
    cellsTotal: 576,
    cellsFilled: 576,
    tagline: '현재 v9 매트릭스 — 12 × 12 × 4Lv 완전 채움',
    tasks: [
      'Bin Picking',
      'Kitting',
      'Machine Tending',
      'Visual QC',
      '나사 체결',
      '커넥터 체결',
      '케이블 라우팅',
      'Tote 이송',
      'Tote·박스 적재 (≤15kg)',
      '박스 마감',
      '용접·도장',
      '점검·계측',
    ],
    sectors: [
      '자동차BCG', '자동차LG', '배터리', '물류', '전자가전', '반도체',
      '조선', '제약', '식품', '화학', '의류', 'Frontier',
    ],
    hint: 'B-3 / B-4 세션 Top 5 진입 적합 셀 Deep Dive 진행 중',
  },
  {
    id: 2,
    nameKr: '상업',
    nameEn: 'Commercial',
    status: 'PLANNED',
    taskCount: 0,
    sectorCount: 0,
    cellsTotal: 0,
    cellsFilled: 0,
    tagline: 'Phase 4 (2027 H2) — 마지막 확장, 도메인별 특수성 高',
    tasks: [
      '응대·안내',
      '결제·정산',
      '재고 점검',
      '매장 청소',
      '음식 서빙',
      '주방 보조',
      '배달',
      '보안 순찰',
    ],
    sectors: [
      '은행·금융',
      '백화점·대형매장',
      '외식업 (패스트푸드 / 일반음식점 / 고급식당)',
      '호텔·숙박',
      '병원·의료',
      '교육·학원',
    ],
    hint: '외식·은행·호텔 등 sector별 특수성 高 → 마지막 확장으로 배치',
  },
  {
    id: 3,
    nameKr: '가정',
    nameEn: 'Residential',
    status: 'PLANNED',
    taskCount: 0,
    sectorCount: 0,
    cellsTotal: 0,
    cellsFilled: 0,
    tagline: 'Phase 2 (2026 Q4) — LG 자사 강점 영역, CLOiD 우선',
    tasks: [
      '빨래 (수거·세탁기 적재·건조·접기·정리)',
      '청소 (진공·물걸레·정리)',
      '요리 보조 (재료 준비·간단 조리·설거지)',
      '돌봄 (노인·아동)',
      '반려동물 (먹이·산책)',
      '정리·수납',
      '보안',
    ],
    sectors: [
      '1인가구',
      '다인가구 (3~4인)',
      '노인가구',
      '반려동물 가구',
      '신생아 가구',
    ],
    hint: 'LGE 가전 → 가정 휴머노이드 자사 전략. 실배치 부재 → "잠재 시장" 중심',
  },
  {
    id: 4,
    nameKr: '물류',
    nameEn: 'Logistics',
    status: 'PLANNED',
    taskCount: 0,
    sectorCount: 0,
    cellsTotal: 0,
    cellsFilled: 0,
    tagline: 'Phase 3 (2027 H1) — 베어로보틱스 + Digit + Apollo 양산 실적',
    tasks: [
      '창고 픽업·정렬',
      'Tote 이송 (산업 ⑧과 일부 중복)',
      '라스트마일 배송',
      '하역 (트럭 → 창고)',
      '검수',
      '리턴 처리',
    ],
    sectors: [
      '이커머스 (B2C)',
      'B2B 물류',
      '콜드체인 (냉동·냉장)',
      '우체국·택배',
      '항공·선박 화물',
    ],
    hint: '산업 ⑧ Tote 이송과 연계 + 옥외·라스트마일 영역 신규 포함',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 공통 vs 도메인별 다름

export interface CommonVsDifferentRow {
  topic: string;
  common: boolean;
  diff: boolean;
  detail?: string;
}

export const COMMON_VS_DIFFERENT: CommonVsDifferentRow[] = [
  { topic: '4Lv 난이도 구조', common: true, diff: false, detail: 'Lv1 → Lv4 환경·정형도 기준 동일' },
  { topic: '등급 체계 (★★★ ~ ✗)', common: true, diff: false, detail: 'LG 라인업 적합도 5단계 동일' },
  { topic: '진입 장벽 8코드 (ENV / CRT / PLD ...)', common: true, diff: false, detail: '코드 8개 정의 + 도메인별 풀이 텍스트만 차이' },
  { topic: 'LG 라인업 (MoMa / CLOiD / AMR)', common: true, diff: false },
  { topic: '셀 8개 정보 구조', common: true, diff: false, detail: '점유율·등급·작업·장벽·풀이·로봇·그리퍼·태그' },
  { topic: '점수 산출 (4Lv 합산 → 10점)', common: true, diff: false, detail: '단일 가이드 로직 4도메인 동일' },
  { topic: 'Task 정의 (예: Bin Picking)', common: false, diff: true, detail: '산업: Bin Picking / 가정: 빨래 / 물류: 라스트마일' },
  { topic: 'Sector 정의 (예: 자동차)', common: false, diff: true, detail: '산업: 자동차 / 가정: 1인가구 / 상업: 외식업' },
  { topic: '적합 로봇 형태', common: false, diff: true, detail: '부분 다름 (산업=IR/CR 위주, 가정=Hum 위주)' },
  { topic: '그리퍼 종류', common: false, diff: true, detail: '부분 다름 (산업=Vac/Mag 多, 가정=Soft 多)' },
];

// ─────────────────────────────────────────────────────────────────────────
// 진입 장벽 8코드

export interface BarrierCode {
  code: string;
  nameKr: string;
  nameEn: string;
  desc: string;
}

export const BARRIERS: BarrierCode[] = [
  { code: 'ENV', nameKr: '환경 비정형', nameEn: 'Environment',  desc: '조명·먼지·습도·온도 등 작업 환경의 가변성' },
  { code: 'CRT', nameKr: '인증·규제',   nameEn: 'Certification', desc: '안전인증·산업별 표준·법규 요구사항' },
  { code: 'PLD', nameKr: '페이로드',    nameEn: 'Payload',      desc: '들어 올려야 하는 물체의 무게·크기' },
  { code: 'PRC', nameKr: '정밀도',      nameEn: 'Precision',    desc: '위치/자세 오차 허용치 (mm·도)' },
  { code: 'CYC', nameKr: 'Cycle Time',  nameEn: 'Cycle',        desc: '한 작업당 요구되는 처리 시간' },
  { code: 'OBJ', nameKr: '대상물 다양성', nameEn: 'Object',     desc: 'SKU·형상·재질의 다양도' },
  { code: 'INT', nameKr: '시스템 통합',  nameEn: 'Integration', desc: 'MES·ERP·기존 라인과의 연동 난이도' },
  { code: 'ROI', nameKr: 'ROI·도입비용', nameEn: 'ROI',         desc: '초기 CAPEX 대비 회수 기간' },
];

// ─────────────────────────────────────────────────────────────────────────
// 4Lv 난이도

export interface DifficultyLevel {
  level: number;
  name: string;
  desc: string;
  weight: string;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { level: 1, name: '평면·정형',     desc: '평탄면·고정 위치·동일 SKU',          weight: '+1' },
  { level: 2, name: '곡면·반정형',   desc: '곡면·일부 변형·SKU 수십 종',         weight: '+2' },
  { level: 3, name: '비정형·동적',   desc: '환경 변화·SKU 수백 종·간섭 발생',    weight: '+3' },
  { level: 4, name: '비정형·제약多', desc: '비표준 작업·인간 상호작용·예외 다수', weight: '+4' },
];

// ─────────────────────────────────────────────────────────────────────────
// Phase 로드맵

export type PhaseStatus = 'IN_PROGRESS' | 'PLANNED';

export interface PhaseDef {
  id: string;
  name: string;
  domain: string;
  domainColor: string;
  start: string;
  end: string;
  status: PhaseStatus;
  startMonth: number; // 0-based offset from 2026-01
  duration: number;   // months
  milestones: { label: string; done: boolean }[];
  rationale: string;
}

// 타임라인 기준: 2026-01 ~ 2028-06 (30개월)
export const PHASES: PhaseDef[] = [
  {
    id: 'p1',
    name: 'Phase 1',
    domain: '산업 도메인 완성',
    domainColor: 'gold',
    start: '2026-01',
    end: '2026-09',
    status: 'IN_PROGRESS',
    startMonth: 0,
    duration: 9,
    milestones: [
      { label: 'Task 12개 정의',                    done: true  },
      { label: 'Sector 12개 정의',                  done: true  },
      { label: '576셀 데이터 입력',                  done: true  },
      { label: 'Top 12 신규 Task (⑪⑫) 추가',         done: true  },
      { label: 'Top 5 진입 적합 셀 Deep Dive',       done: false },
      { label: 'ARGOS 포털 v1.0 배포',               done: false },
    ],
    rationale: '현재 보유 데이터 → 임원 보고 가능한 v1.0 포털 출시',
  },
  {
    id: 'p2',
    name: 'Phase 2',
    domain: '가정 (Residential)',
    domainColor: 'pos',
    start: '2026-10',
    end: '2027-03',
    status: 'PLANNED',
    startMonth: 9,
    duration: 6,
    milestones: [
      { label: 'Task·Sector 정의',                   done: false },
      { label: 'CLOiD 라인업 우선 셀 입력',           done: false },
      { label: '잠재 시장 규모 추정',                 done: false },
      { label: 'LGE 가전 연계 시나리오 작성',         done: false },
    ],
    rationale: 'LG 자사 강점 영역 → 빠른 자사 전략 수립이 가능',
  },
  {
    id: 'p3',
    name: 'Phase 3',
    domain: '물류 (Logistics)',
    domainColor: 'info',
    start: '2027-04',
    end: '2027-09',
    status: 'PLANNED',
    startMonth: 15,
    duration: 6,
    milestones: [
      { label: 'Task·Sector 정의 (옥외 포함)',         done: false },
      { label: '베어로보틱스 / Digit / Apollo 사례 매핑', done: false },
      { label: '산업 ⑧ Tote 이송과 연계 분석',        done: false },
      { label: '콜드체인·라스트마일 셀 입력',          done: false },
    ],
    rationale: '경쟁사 양산 실적 풍부 → 외부 데이터 풍부, 비교 분석 용이',
  },
  {
    id: 'p4',
    name: 'Phase 4',
    domain: '상업 (Commercial)',
    domainColor: 'neg',
    start: '2027-10',
    end: '2028-06',
    status: 'PLANNED',
    startMonth: 21,
    duration: 9,
    milestones: [
      { label: 'Task·Sector 정의 (외식·은행·호텔)',    done: false },
      { label: '도메인별 특수성 가이드라인',            done: false },
      { label: '병원·교육 sector 셀 입력',             done: false },
      { label: '4도메인 통합 비교 대시보드 완성',       done: false },
    ],
    rationale: '복잡도 高 → 마지막에 배치, 1·2·3 학습 결과 반영',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Cross-domain task 비교 (개념적 점수 — Spec 7.2 예시)

export interface CrossDomainCompareRow {
  taskConcept: string;
  rows: { domain: string; task: string; lgGradeMax: string; score10: number; color: string }[];
}

export const CROSS_DOMAIN_COMPARE: CrossDomainCompareRow[] = [
  {
    taskConcept: '물건 이송',
    rows: [
      { domain: '산업',  task: '⑧ Tote 이송',   lgGradeMax: '★★★', score10: 9.2, color: 'gold' },
      { domain: '물류',  task: '라스트마일',     lgGradeMax: '★',    score10: 3.5, color: 'info' },
      { domain: '가정',  task: '정리',          lgGradeMax: '★★',   score10: 5.5, color: 'pos' },
      { domain: '상업',  task: '재고 점검',      lgGradeMax: '✗',    score10: 2.0, color: 'neg' },
    ],
  },
  {
    taskConcept: '청소·정리',
    rows: [
      { domain: '산업',  task: '점검·계측',      lgGradeMax: '★',    score10: 4.0, color: 'gold' },
      { domain: '물류',  task: '검수',          lgGradeMax: '★',    score10: 4.5, color: 'info' },
      { domain: '가정',  task: '청소',          lgGradeMax: '★★★', score10: 8.5, color: 'pos' },
      { domain: '상업',  task: '매장 청소',      lgGradeMax: '★',    score10: 3.0, color: 'neg' },
    ],
  },
  {
    taskConcept: '대인 응대',
    rows: [
      { domain: '산업',  task: '— (해당 Task 없음)', lgGradeMax: '—',  score10: 0,   color: 'gold' },
      { domain: '물류',  task: '— (해당 Task 없음)', lgGradeMax: '—',  score10: 0,   color: 'info' },
      { domain: '가정',  task: '돌봄',              lgGradeMax: '★',    score10: 3.0, color: 'pos' },
      { domain: '상업',  task: '응대·안내',          lgGradeMax: '★',    score10: 3.5, color: 'neg' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// LG 진입 적합도 매트릭스 — 산업 도메인 12 sector × 12 task (0~10)
//
// 설계 근거:
// - 0~3   진입 어려움 (✗) — 비정형/대인/규제 高
// - 4~6   조건부 진입 (★)
// - 7~8   강력 후보 (★★)
// - 9~10  Top 5 진입 적합 (★★★) — Tote 이송, Bin Picking, Tending 등 핵심
// 점수는 v9 매트릭스의 등급 분포를 단순 합산해 0~10으로 환산한 가설치이며
// Phase 1.5 Top 5 Deep Dive 세션에서 실측 점수로 교체합니다.

export const INDUSTRIAL_TASKS = [
  'Bin Picking',
  'Kitting',
  'Tending',
  'Visual QC',
  '나사 체결',
  '커넥터 체결',
  '케이블 라우팅',
  'Tote 이송',
  'Tote·박스 적재',
  '박스 마감',
  '용접·도장',
  '점검·계측',
] as const;

export const INDUSTRIAL_SECTORS = [
  '자동차BCG', '자동차LG', '배터리', '물류', '전자가전', '반도체',
  '조선', '제약', '식품', '화학', '의류', 'Frontier',
] as const;

// 행 = sector, 열 = task. 가설치 (0~10).
export const LG_ENTRY_SCORES: Record<string, Record<string, number>> = {
  '자동차BCG': { 'Bin Picking': 8.5, 'Kitting': 8.0, 'Tending': 8.5, 'Visual QC': 7.5, '나사 체결': 7.0, '커넥터 체결': 6.5, '케이블 라우팅': 6.0, 'Tote 이송': 9.2, 'Tote·박스 적재': 8.0, '박스 마감': 6.5, '용접·도장': 7.5, '점검·계측': 6.0 },
  '자동차LG':  { 'Bin Picking': 8.8, 'Kitting': 8.2, 'Tending': 8.6, 'Visual QC': 7.8, '나사 체결': 7.2, '커넥터 체결': 7.0, '케이블 라우팅': 6.5, 'Tote 이송': 9.0, 'Tote·박스 적재': 7.8, '박스 마감': 6.2, '용접·도장': 7.0, '점검·계측': 6.5 },
  '배터리':    { 'Bin Picking': 7.5, 'Kitting': 8.5, 'Tending': 8.8, 'Visual QC': 8.5, '나사 체결': 6.5, '커넥터 체결': 7.5, '케이블 라우팅': 6.0, 'Tote 이송': 8.5, 'Tote·박스 적재': 7.5, '박스 마감': 7.0, '용접·도장': 4.5, '점검·계측': 7.0 },
  '물류':      { 'Bin Picking': 7.0, 'Kitting': 6.5, 'Tending': 4.5, 'Visual QC': 5.5, '나사 체결': 3.0, '커넥터 체결': 3.0, '케이블 라우팅': 2.5, 'Tote 이송': 9.5, 'Tote·박스 적재': 9.2, '박스 마감': 8.5, '용접·도장': 2.0, '점검·계측': 4.5 },
  '전자가전':  { 'Bin Picking': 8.2, 'Kitting': 8.8, 'Tending': 8.0, 'Visual QC': 7.5, '나사 체결': 7.5, '커넥터 체결': 7.8, '케이블 라우팅': 6.5, 'Tote 이송': 8.0, 'Tote·박스 적재': 7.5, '박스 마감': 7.0, '용접·도장': 5.0, '점검·계측': 6.5 },
  '반도체':    { 'Bin Picking': 6.5, 'Kitting': 7.0, 'Tending': 8.5, 'Visual QC': 9.0, '나사 체결': 5.0, '커넥터 체결': 5.5, '케이블 라우팅': 5.0, 'Tote 이송': 7.5, 'Tote·박스 적재': 7.0, '박스 마감': 6.5, '용접·도장': 3.0, '점검·계측': 8.5 },
  '조선':      { 'Bin Picking': 5.5, 'Kitting': 5.0, 'Tending': 6.5, 'Visual QC': 6.0, '나사 체결': 4.5, '커넥터 체결': 4.0, '케이블 라우팅': 5.5, 'Tote 이송': 6.5, 'Tote·박스 적재': 6.0, '박스 마감': 5.0, '용접·도장': 8.5, '점검·계측': 6.5 },
  '제약':      { 'Bin Picking': 7.0, 'Kitting': 8.0, 'Tending': 7.5, 'Visual QC': 8.5, '나사 체결': 4.0, '커넥터 체결': 4.0, '케이블 라우팅': 3.5, 'Tote 이송': 7.0, 'Tote·박스 적재': 7.0, '박스 마감': 7.5, '용접·도장': 2.0, '점검·계측': 8.0 },
  '식품':      { 'Bin Picking': 6.0, 'Kitting': 7.5, 'Tending': 6.0, 'Visual QC': 7.0, '나사 체결': 2.5, '커넥터 체결': 2.5, '케이블 라우팅': 2.0, 'Tote 이송': 7.5, 'Tote·박스 적재': 7.5, '박스 마감': 7.5, '용접·도장': 1.5, '점검·계측': 5.5 },
  '화학':      { 'Bin Picking': 5.0, 'Kitting': 5.5, 'Tending': 7.0, 'Visual QC': 6.0, '나사 체결': 4.0, '커넥터 체결': 4.0, '케이블 라우팅': 4.0, 'Tote 이송': 6.5, 'Tote·박스 적재': 6.5, '박스 마감': 6.5, '용접·도장': 4.5, '점검·계측': 7.0 },
  '의류':      { 'Bin Picking': 4.5, 'Kitting': 5.5, 'Tending': 4.0, 'Visual QC': 5.5, '나사 체결': 1.5, '커넥터 체결': 1.5, '케이블 라우팅': 1.5, 'Tote 이송': 6.5, 'Tote·박스 적재': 6.0, '박스 마감': 6.0, '용접·도장': 1.0, '점검·계측': 3.5 },
  'Frontier':  { 'Bin Picking': 6.0, 'Kitting': 6.0, 'Tending': 6.5, 'Visual QC': 6.5, '나사 체결': 5.5, '커넥터 체결': 5.5, '케이블 라우팅': 5.0, 'Tote 이송': 7.0, 'Tote·박스 적재': 6.5, '박스 마감': 6.0, '용접·도장': 5.0, '점검·계측': 6.5 },
};

// Sector tagline — 진입 시 LG 라인업 강점 한 줄
export const SECTOR_TAGLINES: Record<string, string> = {
  '자동차BCG':  'BCG 라인 — 정형 작업 + Tote 이송 강점',
  '자동차LG':   'LG 자사 라인 — 데이터 접근성 + CLOiD 우선 검증',
  '배터리':     '셀 조립·Tending·QC — 정밀도·반복성 핵심',
  '물류':       'Tote 이송·박스 적재 — Top 진입 후보 1순위',
  '전자가전':   'Kitting·Tending — LG 자사 강점 영역',
  '반도체':     'Visual QC·점검 — 정밀도 高, Cycle Time 엄격',
  '조선':       '용접·도장 특화 — 옥외 거대 작업물',
  '제약':       'QC·Kitting + 위생 — 인증·CRT 장벽 高',
  '식품':       '박스 적재·QC — 위생/HACCP 규제 多',
  '화학':       '위험 환경 — Tending 위주, 옥외/특수',
  '의류':       'SKU 다양도 高 — 비정형 多, 휴머노이드 우위 작음',
  'Frontier':   '신규 시장 — 사례 부족, 잠재 시장 평가',
};

// ─────────────────────────────────────────────────────────────────────────
// Section 정의 (앵커 네비)

export const SECTIONS = [
  { id: 'overview',     label: '개요' },
  { id: 'common-diff',  label: '공통 vs 차이' },
  { id: 'matrix',       label: '도메인 구조' },
  { id: 'scoring',      label: '점수 로직' },
  { id: 'lg-radar',     label: 'LG 진입 레이더' },
  { id: 'compare',      label: 'Cross-Domain 비교' },
  { id: 'roadmap',      label: '확장 로드맵' },
  { id: 'governance',   label: '거버넌스' },
];
