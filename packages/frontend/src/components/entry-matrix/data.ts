// 휴머노이드 진입성 매트릭스 v9.3 — 12 Top Task × 12 산업
//
// 데이터 모델: 등급 ★★★=3 / ★★=2 / ★=1 / ✗=0
// 4Lv 합산 → 10점 환산 (합산 ÷ 12 × 10)

export type RobotKind  = 'IR' | 'CR' | 'MoMa' | 'Hum';
export type GripperKind = 'Vac' | 'Jaw' | 'Multi' | 'Soft' | 'Mag';
export type LineupKind  = 'IR' | 'CR' | 'MoMa' | 'AMR' | 'CLOiD';

export interface LvDetail {
  grade: 0 | 1 | 2 | 3;        // ✗/★/★★/★★★
  task: string;
  robots: RobotKind[];
  grippers: GripperKind[];
  share: 0 | 1 | 2 | 3 | 4 | 5; // 산업로봇 점유율 (도트)
  lineup: LineupKind[];
  tags: string[];              // -D = 양산, -X = 중단/제한
  barriers: string;            // ✗ Lv일 때 강조
}

export interface CellData {
  taskIdx: number;             // 0~11
  sectorIdx: number;           // 0~11
  score: number;               // 0~10
  label: string;               // 단축 작업 라벨
  proc: string;                // proc 한 줄
  lineup: LineupKind[];        // 셀 카드용
  tags: string[];
  barriers: string[];
  lvDetails?: LvDetail[];      // 4Lv (Top 5 + 주요 셀만)
}

export const TASKS = [
  { idx: 0,  num: '①', name: 'Bin Picking',     short: 'Bin Picking' },
  { idx: 1,  num: '②', name: 'Kitting',         short: 'Kitting' },
  { idx: 2,  num: '③', name: 'Machine Tending', short: 'M.Tending' },
  { idx: 3,  num: '④', name: 'Visual QC',       short: 'Visual QC' },
  { idx: 4,  num: '⑤', name: '나사 체결',       short: '나사 체결' },
  { idx: 5,  num: '⑥', name: '커넥터 체결',     short: '커넥터' },
  { idx: 6,  num: '⑦', name: '케이블 라우팅',   short: '케이블' },
  { idx: 7,  num: '⑧', name: 'Tote 이송',       short: 'Tote 이송' },
  { idx: 8,  num: '⑨', name: 'Tote·박스 적재',  short: '박스 적재' },
  { idx: 9,  num: '⑩', name: '박스 마감',       short: '박스 마감' },
  { idx: 10, num: '⑪', name: '용접·도장',       short: '용접·도장' },
  { idx: 11, num: '⑫', name: '점검·계측',       short: '점검·계측' },
] as const;

export const SECTORS = [
  '자동차BCG', '자동차LG', '배터리', '물류', '전자가전', '반도체',
  '조선', '제약', '식품', '화학', '의류', 'Frontier',
] as const;

// ─────────────────────────────────────────────────────────────────
// 144셀 점수 행렬 (행=task, 열=sector)
// 점수 산출: 4Lv 등급 합산을 가설 → 10점 환산
const SCORES: number[][] = [
  // 자동차BCG, 자동차LG, 배터리, 물류, 전자가전, 반도체, 조선, 제약, 식품, 화학, 의류, Frontier
  [5.0, 5.0, 4.2, 5.8, 4.2, 3.3, 1.7, 3.3, 3.3, 2.5, 2.5, 3.3], // ① Bin Picking
  [4.2, 4.2, 4.2, 7.5, 4.2, 3.3, 1.7, 3.3, 4.2, 2.5, 2.5, 3.3], // ② Kitting
  [5.8, 5.8, 6.7, 1.7, 5.0, 5.8, 2.5, 4.2, 3.3, 4.2, 1.7, 4.2], // ③ Machine Tending
  [5.0, 5.8, 6.7, 2.5, 5.8, 7.5, 4.2, 5.8, 5.0, 4.2, 4.2, 4.2], // ④ Visual QC
  [6.7, 6.7, 4.2, 0.8, 5.8, 2.5, 4.2, 1.7, 0.8, 1.7, 0.0, 3.3], // ⑤ 나사 체결
  [7.5, 6.7, 8.3, 0.8, 7.5, 3.3, 3.3, 1.7, 0.8, 2.5, 0.0, 4.2], // ⑥ 커넥터 체결
  [5.8, 6.7, 5.0, 0.8, 5.0, 3.3, 4.2, 1.7, 0.8, 2.5, 0.0, 3.3], // ⑦ 케이블 라우팅
  [5.8, 5.8, 6.7, 9.2, 6.7, 5.0, 3.3, 5.8, 5.8, 4.2, 4.2, 5.0], // ⑧ Tote 이송
  [5.0, 5.0, 5.0, 7.5, 5.8, 5.0, 3.3, 5.0, 5.0, 4.2, 4.2, 4.2], // ⑨ Tote·박스 적재
  [4.2, 4.2, 4.2, 6.7, 5.0, 4.2, 2.5, 5.0, 5.8, 4.2, 4.2, 3.3], // ⑩ 박스 마감
  [6.7, 5.8, 1.7, 0.8, 4.2, 0.8, 8.3, 0.0, 0.0, 2.5, 0.0, 3.3], // ⑪ 용접·도장
  [4.2, 5.0, 5.8, 3.3, 5.0, 6.7, 5.0, 6.7, 4.2, 5.0, 1.7, 4.2], // ⑫ 점검·계측
];

// 보조 정보 (label / proc / lineup / tags / barriers) — 12 task 공통 디폴트
const TASK_DEFAULTS: Record<number, {
  proc: string; lineup: LineupKind[]; tags: string[]; barriers: string[];
}> = {
  0:  { proc: '정형 부품 → 비정형 SKU → 협소 공간',     lineup: ['IR', 'CR', 'MoMa'],    tags: ['Tesla-X'],         barriers: ['ENV', 'OBJ'] },
  1:  { proc: 'Mixed-SKU 분류 → 다 SKU → 동선 변동',     lineup: ['MoMa', 'AMR', 'CLOiD'], tags: ['Amazon-D', 'GXO-D'], barriers: ['OBJ', 'INT'] },
  2:  { proc: '단일 머신 → 다중 라인 → 라인 변경',       lineup: ['IR', 'CR', 'MoMa'],     tags: ['LGES-D'],          barriers: ['CYC', 'INT'] },
  3:  { proc: '평면 검사 → 3D 검사 → 미세 결함',          lineup: ['IR', 'MoMa'],            tags: ['Samsung-D'],       barriers: ['PRC', 'CYC'] },
  4:  { proc: '동일 위치 → 다종 위치 → 협소 공간',        lineup: ['CR', 'CLOiD'],           tags: [],                  barriers: ['PRC', 'OBJ'] },
  5:  { proc: '표준 커넥터 → 다 모델 → Pack 다종',         lineup: ['CR', 'CLOiD'],           tags: ['CATL-D'],          barriers: ['PRC', 'OBJ'] },
  6:  { proc: '직선 → 굴곡 → 협소 진입',                  lineup: ['CR', 'CLOiD'],           tags: [],                  barriers: ['ENV', 'PRC'] },
  7:  { proc: 'AMR Tote 정형 → 계단·다층 → 협소 랙',      lineup: ['AMR', 'MoMa', 'CLOiD'],  tags: ['Amazon-D', 'GXO-D'], barriers: ['ENV', 'PLD'] },
  8:  { proc: '단일 단 → 다단 → 적재 패턴 변경',          lineup: ['MoMa', 'CLOiD'],         tags: ['Amazon-D'],        barriers: ['PLD', 'CYC'] },
  9:  { proc: '테이프 → 다 SKU 박스 → 비표준 포장',       lineup: ['MoMa', 'CLOiD'],         tags: [],                  barriers: ['OBJ'] },
  10: { proc: '개방 위치 → 다 위치 → 협소 블록',          lineup: ['IR', 'CLOiD'],           tags: ['HD현대-D'],         barriers: ['ENV', 'CRT'] },
  11: { proc: '평면 측정 → 3D 점검 → 시설 진단',          lineup: ['MoMa', 'CLOiD'],         tags: [],                  barriers: ['PRC'] },
};

const LABELS = TASKS.map(t => t.short);

export function buildCells(): CellData[] {
  const cells: CellData[] = [];
  for (let t = 0; t < 12; t++) {
    for (let s = 0; s < 12; s++) {
      const def = TASK_DEFAULTS[t];
      cells.push({
        taskIdx: t,
        sectorIdx: s,
        score: SCORES[t][s],
        label: LABELS[t],
        proc: def.proc,
        lineup: def.lineup,
        tags: def.tags,
        barriers: def.barriers,
      });
    }
  }
  return cells;
}

// ─────────────────────────────────────────────────────────────────
// Top 5 Deep Dive 셀 (taskIdx, sectorIdx) — 점수 순
export interface Top5Entry {
  rank: 1 | 2 | 3 | 4 | 5;
  taskIdx: number;
  sectorIdx: number;
  score: number;
  verdict: string;
  shortLabel: string;
}

export const TOP_5: Top5Entry[] = [
  { rank: 1, taskIdx: 7,  sectorIdx: 3, score: 9.2, verdict: '진입 적합 · 즉시',          shortLabel: 'Tote 이송 × 물류' },
  { rank: 2, taskIdx: 5,  sectorIdx: 2, score: 8.3, verdict: '진입 적합 · LG 자사 우선',  shortLabel: '커넥터 × 배터리' },
  { rank: 3, taskIdx: 10, sectorIdx: 6, score: 8.3, verdict: '진입 적합 · 거점 확보',     shortLabel: '용접·도장 × 조선' },
  { rank: 4, taskIdx: 1,  sectorIdx: 3, score: 7.5, verdict: '진입 가능 · 복합 솔루션',   shortLabel: 'Kitting × 물류' },
  { rank: 5, taskIdx: 5,  sectorIdx: 4, score: 7.5, verdict: '진입 가능 · LG 자사',       shortLabel: '커넥터 × 전자가전' },
];

// ─────────────────────────────────────────────────────────────────
// Top 5 셀 4Lv 상세 (CellModal에서 사용)
export const LV_DETAILS_BY_KEY: Record<string, LvDetail[]> = {
  // Top 1 — Tote 이송 × 물류
  '7-3': [
    { grade: 3, task: 'AMR Tote 정형 이송',     robots: ['MoMa'],         grippers: ['Vac'],   share: 4, lineup: ['AMR'],          tags: ['Amazon-D'], barriers: '' },
    { grade: 3, task: 'DC 다중 라인 순회',       robots: ['MoMa'],         grippers: ['Vac'],   share: 3, lineup: ['AMR', 'MoMa'],  tags: ['GXO-D'],    barriers: '' },
    { grade: 3, task: '계단·다층 이송',          robots: ['Hum'],          grippers: ['Multi'], share: 2, lineup: ['CLOiD'],         tags: ['Spanx-D'],  barriers: '' },
    { grade: 2, task: '협소 랙 진입',            robots: ['Hum'],          grippers: ['Multi'], share: 1, lineup: ['CLOiD'],         tags: [],           barriers: '슬림 휴머노이드 부재 (CLOiD-2026 예상)' },
  ],
  // Top 2 — 커넥터 체결 × 배터리
  '5-2': [
    { grade: 3, task: 'BMS 커넥터 양손 체결',    robots: ['CR'],           grippers: ['Jaw'],   share: 3, lineup: ['CR'],            tags: ['CATL-D'],   barriers: '' },
    { grade: 3, task: 'Pack 다종 체결',          robots: ['CR', 'Hum'],    grippers: ['Multi'], share: 2, lineup: ['CR', 'CLOiD'],   tags: ['CATL-D'],   barriers: '' },
    { grade: 3, task: '고압 커넥터 체결',        robots: ['Hum'],          grippers: ['Multi'], share: 1, lineup: ['CLOiD'],         tags: ['CATL-D'],   barriers: '' },
    { grade: 1, task: '비표준 커넥터·예외 처리', robots: ['Hum'],          grippers: ['Multi'], share: 0, lineup: ['CLOiD'],         tags: [],           barriers: '예외 SKU 데이터셋 부재 + 안전 인증 비용' },
  ],
  // Top 3 — 용접·도장 × 조선
  '10-6': [
    { grade: 1, task: '개방 위치 용접',          robots: ['IR'],           grippers: ['Mag'],   share: 5, lineup: ['IR'],            tags: ['HD현대-D'], barriers: '' },
    { grade: 3, task: '블록 다종 용접',          robots: ['Hum'],          grippers: ['Mag'],   share: 2, lineup: ['CLOiD'],         tags: ['HD현대-D'], barriers: '' },
    { grade: 3, task: '협소 블록 용접',          robots: ['Hum'],          grippers: ['Mag'],   share: 1, lineup: ['CLOiD'],         tags: ['HD현대-D'], barriers: '' },
    { grade: 3, task: '도장 전 처리',            robots: ['Hum'],          grippers: ['Soft'],  share: 1, lineup: ['CLOiD'],         tags: ['삼성중공업-X'], barriers: '' },
  ],
  // Top 4 — Kitting × 물류
  '1-3': [
    { grade: 3, task: '단일 SKU 분류',           robots: ['MoMa'],         grippers: ['Vac'],   share: 4, lineup: ['AMR'],           tags: ['Amazon-D'], barriers: '' },
    { grade: 3, task: 'Mixed-SKU Kit',          robots: ['MoMa'],         grippers: ['Vac', 'Multi'], share: 3, lineup: ['MoMa'],   tags: ['Amazon-D'], barriers: '' },
    { grade: 3, task: '다 SKU·동선 변동',        robots: ['Hum'],          grippers: ['Multi'], share: 2, lineup: ['CLOiD'],         tags: ['GXO-D'],    barriers: '' },
    { grade: 2, task: '실시간 주문 변경 대응',   robots: ['Hum'],          grippers: ['Multi'], share: 1, lineup: ['CLOiD'],         tags: [],           barriers: '실시간 주문 변경 알고리즘 안정성 확보 필요' },
  ],
  // Top 5 — 커넥터 체결 × 전자가전
  '5-4': [
    { grade: 2, task: '표준 가전 커넥터',        robots: ['CR'],           grippers: ['Jaw'],   share: 4, lineup: ['CR'],            tags: ['LGE-D'],    barriers: '' },
    { grade: 3, task: '다 모델·FPC 체결',         robots: ['Hum'],          grippers: ['Multi'], share: 2, lineup: ['CLOiD'],         tags: ['LGE-X'],    barriers: '' },
    { grade: 2, task: '협소 내부 체결',          robots: ['Hum'],          grippers: ['Multi'], share: 1, lineup: ['CLOiD'],         tags: [],           barriers: '슬림 휴머노이드 가용성' },
    { grade: 1, task: '신모델 신속 적응',        robots: ['Hum'],          grippers: ['Multi'], share: 0, lineup: ['CLOiD'],         tags: [],           barriers: '6~12개월 모델 변경 주기 추종' },
  ],
};

// ─────────────────────────────────────────────────────────────────
// 자동 생성 — 점수 → 4Lv 등급 분포 (Top 5 외 셀의 fallback)
//
// 점수 = (Lv1+Lv2+Lv3+Lv4) / 12 × 10  →  sum = round(score × 1.2)
// 일반 패턴: 난이도 高(Lv4)일수록 등급 낮음.

const SUM_TO_GRADES: Record<number, [0|1|2|3, 0|1|2|3, 0|1|2|3, 0|1|2|3]> = {
  0:  [0, 0, 0, 0],
  1:  [1, 0, 0, 0],
  2:  [1, 1, 0, 0],
  3:  [1, 1, 1, 0],
  4:  [2, 1, 1, 0],
  5:  [2, 2, 1, 0],
  6:  [2, 2, 1, 1],
  7:  [3, 2, 1, 1],
  8:  [3, 2, 2, 1],
  9:  [3, 3, 2, 1],
  10: [3, 3, 2, 2],
  11: [3, 3, 3, 2],
  12: [3, 3, 3, 3],
};

// task별 Lv 작업 라벨 (Lv1 → Lv4)
const TASK_LV_LABELS: Record<number, [string, string, string, string]> = {
  0:  ['정형 부품 Picking',     '다종 SKU 혼재',       '비정형 SKU·동적',     '협소 공간 진입'],
  1:  ['단일 SKU 분류',         'Mixed-SKU Kit',       '다 SKU·동선 변동',    '실시간 주문 변경'],
  2:  ['단일 머신 Tending',     '다중 라인 순회',      '라인 변경·재구성',    '비표준 라인 대응'],
  3:  ['평면 외관 검사',        '3D 형상 검사',        '미세 결함 검출',      '종합 품질 검수'],
  4:  ['동일 위치 체결',        '다종 위치 체결',      '협소 위치 체결',      '비표준 체결'],
  5:  ['표준 커넥터 체결',      '다 모델 체결',        'Pack 다종·고압',      '예외·신규 모델'],
  6:  ['직선 라우팅',           '굴곡 라우팅',         '협소 진입 라우팅',    '복합 다발 라우팅'],
  7:  ['AMR Tote 정형 이송',    '다 라인 순회',        '계단·다층 이송',      '협소 랙 진입'],
  8:  ['단일 단 적재',          '다단 적재',           '적재 패턴 변경',      '비표준 적재'],
  9:  ['표준 테이프 마감',      '다 SKU 박스 마감',    '비표준 포장',         '예외 처리'],
  10: ['개방 위치 용접',        '다 위치 용접',        '협소 블록 용접',      '특수 환경 용접'],
  11: ['평면 측정',             '3D 점검',             '시설 진단',           '종합 점검'],
};

const TASK_LV_ROBOTS: [RobotKind[], RobotKind[], RobotKind[], RobotKind[]] = [
  ['IR', 'CR'],
  ['CR', 'MoMa'],
  ['MoMa', 'Hum'],
  ['Hum'],
];

const TASK_LV_GRIPPERS: Record<number, [GripperKind[], GripperKind[], GripperKind[], GripperKind[]]> = {
  0:  [['Vac'],         ['Vac', 'Jaw'],   ['Multi'],         ['Multi']],
  1:  [['Vac'],         ['Vac', 'Multi'], ['Multi'],         ['Multi']],
  2:  [['Jaw'],         ['Jaw', 'Multi'], ['Multi'],         ['Multi']],
  3:  [[],              [],               [],                []],
  4:  [['Jaw'],         ['Jaw'],          ['Multi'],         ['Multi']],
  5:  [['Jaw'],         ['Jaw', 'Multi'], ['Multi'],         ['Multi']],
  6:  [['Jaw'],         ['Multi'],        ['Multi'],         ['Multi']],
  7:  [['Vac'],         ['Vac'],          ['Multi'],         ['Multi']],
  8:  [['Vac'],         ['Vac', 'Multi'], ['Multi'],         ['Multi']],
  9:  [['Vac'],         ['Vac'],          ['Multi'],         ['Multi']],
  10: [['Mag'],         ['Mag'],          ['Mag', 'Multi'],  ['Multi']],
  11: [[],              [],               [],                []],
};

const TASK_LV_LINEUP: Record<number, [LineupKind[], LineupKind[], LineupKind[], LineupKind[]]> = {
  0:  [['IR'],            ['CR', 'MoMa'], ['MoMa', 'CLOiD'], ['CLOiD']],
  1:  [['AMR'],           ['MoMa'],       ['MoMa', 'CLOiD'], ['CLOiD']],
  2:  [['IR'],            ['CR', 'MoMa'], ['MoMa', 'CLOiD'], ['CLOiD']],
  3:  [['IR'],            ['MoMa'],       ['MoMa', 'CLOiD'], ['CLOiD']],
  4:  [['CR'],            ['CR'],         ['CLOiD'],         ['CLOiD']],
  5:  [['CR'],            ['CR', 'CLOiD'], ['CLOiD'],         ['CLOiD']],
  6:  [['CR'],            ['CR'],         ['CLOiD'],         ['CLOiD']],
  7:  [['AMR'],           ['AMR', 'MoMa'], ['CLOiD'],         ['CLOiD']],
  8:  [['MoMa'],          ['MoMa'],       ['CLOiD'],         ['CLOiD']],
  9:  [['MoMa'],          ['MoMa'],       ['CLOiD'],         ['CLOiD']],
  10: [['IR'],            ['IR'],         ['CLOiD'],         ['CLOiD']],
  11: [['MoMa'],          ['MoMa'],       ['CLOiD'],         ['CLOiD']],
};

const SHARE_BY_GRADE: Record<0 | 1 | 2 | 3, 0 | 1 | 2 | 3 | 4 | 5> = {
  3: 4,
  2: 3,
  1: 2,
  0: 0,
};

// 일반 진입 장벽 풀이 (✗ 등급에서 표시)
const GENERIC_BARRIER_BY_TASK: Record<number, string> = {
  0:  '비정형 SKU 다양도 高 + 협소 공간 진입 — 슬림 휴머노이드 부재',
  1:  '실시간 주문 변경 알고리즘 안정성 + 다 SKU 데이터셋 부재',
  2:  '비표준 라인 통합 + MES/ERP 인터페이스 비용',
  3:  '미세 결함 데이터셋 부재 + 검사 사이클 타임 압박',
  4:  '비표준 체결 위치 + 토크 정밀도 + 안전 인증',
  5:  '예외 모델 적응 비용 + 고압 커넥터 안전 인증',
  6:  '복합 다발 라우팅 — 휴머노이드 양손 협응 데이터셋 부재',
  7:  '협소 랙 — 슬림 휴머노이드 부재 (CLOiD-2026 예상)',
  8:  '비표준 적재 패턴 + 페이로드 한계',
  9:  '비표준 포장 다양도 + 사례 데이터 부재',
  10: '특수 환경 (고온·고압·유독) + 용접 자격 인증',
  11: '종합 점검 — 시설별 비표준 진단 항목',
};

export function deriveLvDetails(taskIdx: number, sectorIdx: number): LvDetail[] {
  const score = SCORES[taskIdx][sectorIdx];
  const sum = Math.max(0, Math.min(12, Math.round(score * 1.2)));
  const grades = SUM_TO_GRADES[sum];
  const labels = TASK_LV_LABELS[taskIdx];
  const grippers = TASK_LV_GRIPPERS[taskIdx];
  const lineups = TASK_LV_LINEUP[taskIdx];

  return grades.map((g, i) => ({
    grade: g,
    task: labels[i],
    robots: TASK_LV_ROBOTS[i],
    grippers: grippers[i],
    share: SHARE_BY_GRADE[g],
    lineup: lineups[i],
    tags: [],                       // 자동 생성에는 사례 태그 비움 (PPT 원본 필요)
    barriers: g === 0 ? GENERIC_BARRIER_BY_TASK[taskIdx] : '',
  }));
}

// 통합 조회 — Top 5 hand-curated가 있으면 우선, 없으면 자동 생성
export function getLvDetails(taskIdx: number, sectorIdx: number): LvDetail[] {
  const key = `${taskIdx}-${sectorIdx}`;
  return LV_DETAILS_BY_KEY[key] ?? deriveLvDetails(taskIdx, sectorIdx);
}

// 셀이 hand-curated인지 자동 생성인지 표시 (UI 신뢰도 표시용)
export function isLvDetailsHandCurated(taskIdx: number, sectorIdx: number): boolean {
  return Boolean(LV_DETAILS_BY_KEY[`${taskIdx}-${sectorIdx}`]);
}

// ─────────────────────────────────────────────────────────────────
// Top 5 Deep Dive 콘텐츠
export interface DeepDiveItem { name: string; tag?: string; }
export interface DeepDive {
  rank: 1 | 2 | 3 | 4 | 5;
  taskIdx: number;
  sectorIdx: number;
  score: number;
  verdict: string;
  headline: string;
  story: string;
  deployed: DeepDiveItem[];
  lineup: DeepDiveItem[];
  market: { global: string; globalNote: string; korea: string; koreaNote: string; growth: string; growthNote: string };
  risks: string[];
}

export const DEEP_DIVES: DeepDive[] = [
  {
    rank: 1, taskIdx: 7, sectorIdx: 3, score: 9.2, verdict: '진입 적합 · 즉시',
    headline: '글로벌 DC가 이미 양산 검증한 영역. 즉시 진입 가능한 1순위 시장.',
    story: 'Amazon, GXO, Spanx가 휴머노이드+AMR 조합으로 양산 가동 중. LG는 보유 AMR과 CLOiD를 결합해 단기 PoC 진입이 가능하다.',
    deployed: [
      { name: 'Agility Digit',          tag: 'Spanx, GXO 양산' },
      { name: 'Apptronik Apollo',       tag: 'Mercedes·GXO Pilot' },
      { name: 'Boston Dynamics Atlas',  tag: 'Hyundai Pilot' },
    ],
    lineup: [
      { name: 'AMR 베어로보틱스', tag: '정형 이송 — 즉시 가용' },
      { name: 'MoMa',             tag: '다 라인 순회 — 보유' },
      { name: 'CLOiD 휴머노이드',  tag: '계단·다층·협소' },
    ],
    market: {
      global: '$24B', globalNote: '글로벌 물류 자동화',
      korea:  '$1.2B', koreaNote: '한국 시장',
      growth: '19%',   growthNote: 'CAGR (2025~2030)',
    },
    risks: [
      '휴머노이드 단가 $150K~$300K — ROI 확보 어려움',
      'Amazon In-house 솔루션 확장 (Robin / Sparrow) 가속',
      '협업 안전 인증 (ISO/TS 15066) 비용 + 인증 기간',
    ],
  },
  {
    rank: 2, taskIdx: 5, sectorIdx: 2, score: 8.3, verdict: '진입 적합 · LG 자사 우선',
    headline: 'CATL Xiaomo가 이미 양산. LGES 자사 PoC로 가장 빠르게 진입할 수 있다.',
    story: 'Pack 다종·고압 커넥터 체결을 휴머노이드로 양산 검증한 사례 존재. LGES와 자사 PoC 검증 → 외부 확산이 정석 루트.',
    deployed: [
      { name: 'CATL Xiaomo',     tag: '고압 커넥터 양산 산둥' },
      { name: 'Tesla Optimus',   tag: '4680 셀 핸들링' },
    ],
    lineup: [
      { name: 'CLOiD 휴머노이드', tag: 'Pack 다종 양손 체결' },
      { name: '협동로봇 CR',     tag: '표준 BMS 커넥터' },
    ],
    market: {
      global: '$18B', globalNote: '글로벌 배터리 자동화',
      korea:  '$4.5B', koreaNote: '한국 (LGES·SK on·삼성SDI)',
      growth: '22%',   growthNote: 'CAGR — 전기차 시장 확장',
    },
    risks: [
      'LGES 자사 PoC 일정에 종속',
      '중국 휴머노이드 (CATL Xiaomo, Unitree) 가격 경쟁',
      '고압 커넥터 안전 인증 (KC, IEC) 추가 비용',
    ],
  },
  {
    rank: 3, taskIdx: 10, sectorIdx: 6, score: 8.3, verdict: '진입 적합 · 거점 확보',
    headline: 'HD현대가 양산 가동. 한국 조선 압도의 전략적 거점.',
    story: '블록 다양·협소 위치 용접에서 휴머노이드가 산업로봇 대체. HD현대 양산 사례 확보 시 글로벌 조선 시장 확장 가능.',
    deployed: [
      { name: 'HD현대 자체 휴머노이드', tag: '블록 용접·도장 양산' },
      { name: '삼성중공업 PoC',         tag: '도장 라인' },
    ],
    lineup: [
      { name: 'CLOiD 휴머노이드', tag: '협소 블록 용접' },
      { name: '산업로봇 IR',     tag: '개방 위치 — 보조' },
    ],
    market: {
      global: '$8B',  globalNote: '글로벌 조선 자동화',
      korea:  '$2.8B', koreaNote: '한국 (HD현대·삼성중공업·한화)',
      growth: '9%',    growthNote: 'CAGR — LNG선 발주 견인',
    },
    risks: [
      'HD현대 자체 솔루션과의 경쟁 — 외부 도입 동기 약함',
      '용접 자격증 (KS, AWS, ISO 9606) 인증 비용·기간',
      '글로벌 조선소 (中, 日) 채택 속도 — 한국 외 확장 한계',
    ],
  },
  {
    rank: 4, taskIdx: 1, sectorIdx: 3, score: 7.5, verdict: '진입 가능 · 복합 솔루션',
    headline: 'Mixed-SKU 주문 단위 Kitting을 MoMa+AMR 조합으로 양산 진입.',
    story: 'Amazon·GXO 양산 검증. LG는 MoMa(보유)+AMR로 즉시 PoC 가능, 다 SKU·동선 변동 영역은 휴머노이드 추가 필요.',
    deployed: [
      { name: 'Amazon Robin/Sparrow', tag: 'Mixed-SKU 양산' },
      { name: 'Agility Digit',         tag: 'GXO Kitting Pilot' },
    ],
    lineup: [
      { name: 'MoMa',  tag: 'Mixed-SKU Kit — 보유' },
      { name: 'AMR',   tag: '단일 SKU 분류' },
      { name: 'CLOiD', tag: '다 SKU·동선 변동' },
    ],
    market: {
      global: '$15B', globalNote: '글로벌 Kitting 자동화',
      korea:  '$1.4B', koreaNote: '한국 (3PL + 자사물류)',
      growth: '17%',   growthNote: 'CAGR — 이커머스 확장',
    },
    risks: [
      '다 SKU 데이터셋 확보 비용 — 학습용 라벨링 부담',
      'Amazon In-house 솔루션 확장으로 외부 도입 시장 축소',
      '실시간 주문 변경 알고리즘 안정성 확보 필요',
    ],
  },
  {
    rank: 5, taskIdx: 5, sectorIdx: 4, score: 7.5, verdict: '진입 가능 · LG 자사',
    headline: 'LGE 자사 PCB·FPC 체결로 자사 검증 → 외부 확산.',
    story: 'LGE 자사 PoC 가장 빠른 검증 루트. 다 모델 가전 커넥터 + FPC 체결에서 휴머노이드의 양손 협응이 산업로봇 대비 우위.',
    deployed: [
      { name: 'Foxconn 자체 솔루션', tag: 'PCB 체결 양산' },
      { name: 'Figure 02',           tag: 'BMW 전장 Pilot' },
    ],
    lineup: [
      { name: 'CLOiD 휴머노이드', tag: '다 모델·FPC 체결' },
      { name: '협동로봇 CR',     tag: '표준 가전 커넥터' },
    ],
    market: {
      global: '$12B', globalNote: '글로벌 가전 자동화',
      korea:  '$1.8B', koreaNote: '한국 (LGE·Samsung·코웨이)',
      growth: '12%',   growthNote: 'CAGR — IoT·스마트가전',
    },
    risks: [
      '협소 내부 진입 — 슬림 휴머노이드 가용성',
      '가전 모델 변경 주기 빠름 (6~12개월) — 학습 비용 반복',
      '대당 단가 압박 — 산업로봇 대비 ROI 입증 어려움',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// 강조 모드
export type EmphasisMode = 'all' | 'top5' | 'lg' | 'shipbuilding' | 'battery' | 'logistics';

export const EMPHASIS_MODES: { id: EmphasisMode; label: string }[] = [
  { id: 'all',           label: '전체' },
  { id: 'top5',          label: 'Top 5' },
  { id: 'lg',            label: 'LG 자사' },
  { id: 'shipbuilding',  label: '조선' },
  { id: 'battery',       label: '배터리' },
  { id: 'logistics',     label: '물류' },
];

// ─────────────────────────────────────────────────────────────────
// 유틸 — 점수 → 색상 / 등급

export function scoreToColor(score: number): string {
  if (score >= 7.5) return '#B8DB8F';
  if (score >= 5.0) return '#EAF3DE';
  if (score >= 3.0) return '#FAEEDA';
  if (score >= 1.0) return '#FBEAF0';
  return '#F0EEE8';
}

export function scoreToVerdict(score: number): string {
  if (score >= 7.5) return '진입 적합';
  if (score >= 5.0) return '진입 가능';
  if (score >= 3.0) return '부분 진입';
  if (score >= 1.0) return '제한적';
  return '진입 불가';
}

export function gradeToStars(grade: number): string {
  return ['✗', '★', '★★', '★★★'][grade] ?? '✗';
}

export function isTop5Cell(taskIdx: number, sectorIdx: number): boolean {
  return TOP_5.some((t) => t.taskIdx === taskIdx && t.sectorIdx === sectorIdx);
}

export function getTop5Rank(taskIdx: number, sectorIdx: number): number | null {
  const e = TOP_5.find((t) => t.taskIdx === taskIdx && t.sectorIdx === sectorIdx);
  return e?.rank ?? null;
}

export function getCellAvgByTask(taskIdx: number): number {
  const row = SCORES[taskIdx];
  return row.reduce((a, b) => a + b, 0) / row.length;
}

export function getCellAvgBySector(sectorIdx: number): number {
  let sum = 0;
  for (let t = 0; t < 12; t++) sum += SCORES[t][sectorIdx];
  return sum / 12;
}

export function isCellHighlighted(
  mode: EmphasisMode,
  taskIdx: number,
  sectorIdx: number,
): boolean {
  switch (mode) {
    case 'all':           return true;
    case 'top5':          return isTop5Cell(taskIdx, sectorIdx);
    case 'lg':            return sectorIdx === 1 || sectorIdx === 4; // 자동차LG / 전자가전
    case 'shipbuilding':  return sectorIdx === 6;
    case 'battery':       return sectorIdx === 2;
    case 'logistics':     return sectorIdx === 3;
  }
}

// ─────────────────────────────────────────────────────────────────
// 통계
export const STATS = {
  total: 144,
  fitCount: SCORES.flat().filter((s) => s >= 7.5).length,
  avg: SCORES.flat().reduce((a, b) => a + b, 0) / 144,
  // 산업별 평균 1위
  topSector: (() => {
    let bestIdx = 0; let bestAvg = -1;
    for (let s = 0; s < 12; s++) {
      const avg = getCellAvgBySector(s);
      if (avg > bestAvg) { bestAvg = avg; bestIdx = s; }
    }
    return { name: SECTORS[bestIdx], avg: bestAvg };
  })(),
};

export { SCORES };
