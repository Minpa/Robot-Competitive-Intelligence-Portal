// 휴머노이드 진입성 매트릭스 v11 — 12 Top Task × 12 산업
//
// 데이터 모델: 등급 ★★★=3 / ★★=2 / ★=1 / ✗=0
// 4Lv 합산 → 10점 환산 (합산 ÷ 12 × 10)
//
// 데이터 소스: v11-matrix.json (B-2b 전체 완료, 8산업 Deep 검증 + Top 12 확장)
// 점수 ≥ 7.5 셀: 13개 (진입 적합)

import v11Raw from './v11-matrix.json';

export type RobotKind  = 'IR' | 'CR' | 'MoMa' | 'Hum';
export type GripperKind = 'Vac' | 'Jaw' | 'Multi' | 'Soft' | 'Mag';
export type LineupKind  = 'IR' | 'CR' | 'MoMa' | 'AMR' | 'CLOiD';
export type Grade = 0 | 1 | 2 | 3;
export type Share = 0 | 1 | 2 | 3 | 4 | 5;

export interface LvDetail {
  grade: Grade;                 // ✗/★/★★/★★★
  task: string;
  robots: RobotKind[];
  grippers: GripperKind[];
  share: Share;                 // 산업로봇 점유율 (도트)
  lineup: LineupKind[];
  tags: string[];               // -D = 양산, -X = 중단/제한, -A = 알파/PoC
  barriers: string;             // ✗ Lv일 때 강조 — 코드 → 한국어 description
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
  lvDetails?: LvDetail[];
}

// ─────────────────────────────────────────────────────────────────
// v11 JSON 타입 (raw)
interface V11Lv {
  lv: number;
  grade: '★★★' | '★★' | '★' | '✗';
  grade_score: number;
  robots: string[];
  grippers: string[];
  industry_share: number;
  lg_robots: string[];
  task: string;
  barriers: string[];
  barrier_desc: string;
  tags: string[];
}

interface V11Industry {
  idx: number;
  name: string;
  score10: number;
  levels: V11Lv[];
}

interface V11Task {
  idx: number;
  num: string;
  name: string;
  levels: { name: string; sub_name: string; desc: string }[];
  industries: V11Industry[];
}

interface V11Data {
  meta: { version: string; date: string; total_tasks: number; total_industries: number; total_cells: number; total_lv_cells: number };
  tasks: V11Task[];
  industries: string[];
  barrier_codes: Record<string, string>;
}

const V11 = v11Raw as unknown as V11Data;

export const MATRIX_VERSION = V11.meta.version;          // 'v11'
export const MATRIX_RELEASED = V11.meta.date;            // '2026-04-30'

// ─────────────────────────────────────────────────────────────────
// TASKS (12) — JSON과 일치, 단 short(축약 표기)는 코드 보존
const TASK_SHORT: Record<number, string> = {
  0: 'Bin Picking', 1: 'Kitting', 2: 'M.Tending', 3: 'Visual QC',
  4: '나사 체결',   5: '커넥터',   6: '케이블',     7: 'Tote 이송',
  8: '박스 적재',   9: '박스 마감', 10: '용접·도장', 11: '점검·계측',
};

export const TASKS = V11.tasks.map(t => ({
  idx: t.idx,
  num: t.num,
  name: t.name,
  short: TASK_SHORT[t.idx] ?? t.name,
})) as readonly { idx: number; num: string; name: string; short: string }[];

// SECTORS (12) — JSON 산업 순서 그대로
export const SECTORS = V11.industries as readonly string[];

// barrier 코드 → 한국어 description 변환표
export const BARRIER_CODES: Record<string, string> = V11.barrier_codes;

// ─────────────────────────────────────────────────────────────────
// 로봇 카테고리 상세 — IR / CR / MoMa / Hum / AMR / CLOiD
// PPT 원본 + 외부 시장 정보를 합산. 이미지 경로는 public/robots/{code}.jpg

export interface RobotInfoEntry {
  code: string;
  nameKr: string;
  nameEn: string;
  tagline: string;
  description: string;
  examples: string[];
  useCases: string[];
  payload: string;
  reach: string;
  pricing: string;
  isLgLineup: boolean;
  imagePath?: string;
}

export const ROBOT_INFO: Record<string, RobotInfoEntry> = {
  IR: {
    code: 'IR',
    nameKr: '산업용 로봇',
    nameEn: 'Industrial Robot',
    tagline: '6축 다관절 로봇암 — 펜스 안에서 정형 반복 작업',
    description: '대형 6축 다관절 머니퓰레이터. 안전 펜스 내부에서 운영되며 정형화된 위치·자세의 반복 작업에서 가장 빠르고 정확함. 자동차·조선·반도체 라인의 표준. 비정형 환경·인간 협업에는 부적합.',
    examples: ['Fanuc M-시리즈', 'ABB IRB', 'KUKA KR', 'Yaskawa Motoman', '두산 H 시리즈'],
    useCases: ['차체 용접·도장', '대형 부품 핸들링', '정형 Bin Picking', '머신 Tending (대형)'],
    payload: '5kg ~ 1,000kg+',
    reach: '0.5m ~ 3.5m',
    pricing: '$30K ~ $200K (단가)',
    isLgLineup: false,
    imagePath: '/robots/ir.jpg',
  },
  CR: {
    code: 'CR',
    nameKr: '협동로봇',
    nameEn: 'Collaborative Robot',
    tagline: '인간 옆에서 안전하게 작동하는 경량 로봇암',
    description: '안전 인증(ISO/TS 15066)을 받은 저속·저토크 로봇암. 펜스 없이 작업자 옆에서 운영 가능. 다종 SKU·다 모델 적응에 강하지만 cycle time과 페이로드는 IR 대비 열세.',
    examples: ['Universal Robots UR', 'Doosan Robotics M', 'Techman TM', 'Rethink Sawyer (단종)', 'Franka Emika'],
    useCases: ['커넥터 체결', '나사 체결', 'PCB 조립', '소형 Kitting', '검사·계측 보조'],
    payload: '3kg ~ 30kg',
    reach: '0.5m ~ 1.8m',
    pricing: '$25K ~ $80K (단가)',
    isLgLineup: false,
    imagePath: '/robots/cr.jpg',
  },
  MoMa: {
    code: 'MoMa',
    nameKr: '모바일 매니퓰레이터',
    nameEn: 'Mobile Manipulator',
    tagline: 'AMR 베이스 + 로봇암 — 라인 사이를 이동하며 작업',
    description: 'AMR 위에 로봇암을 결합한 형태. 고정형 IR/CR과 달리 다중 작업 위치를 순회. Mixed-SKU Kitting / Tote 이송 / 다 라인 Tending에 강점. LG 보유.',
    examples: ['Fetch Freight (Zebra)', 'MiR Hook + Arm', 'Boston Dynamics Stretch', 'Robotnik RB-1', 'LG MoMa (보유)'],
    useCases: ['Mixed-SKU Kit', 'Tote 이송', '다 라인 Tending 순회', '재고 점검'],
    payload: '5kg ~ 25kg (arm) / 100kg+ (base)',
    reach: '0.8m ~ 1.2m + 무한 이동',
    pricing: '$80K ~ $250K (단가)',
    isLgLineup: true,
    imagePath: '/robots/moma.webp',
  },
  Hum: {
    code: 'Hum',
    nameKr: '휴머노이드',
    nameEn: 'Humanoid',
    tagline: '인간 형태 양손 양다리 로봇 — 비정형·계단·협소 영역',
    description: '인간형 골격으로 인간 작업 환경(계단·협소·비표준)을 그대로 수용. 양손 협응이 강점. 양산 검증은 2025~2026에 본격 시작. 대당 단가 압박이 가장 큰 채택 장벽.',
    examples: ['Agility Digit', 'Apptronik Apollo', 'Boston Dynamics Atlas', 'Figure 02', 'Tesla Optimus', 'Unitree H1', 'CATL Xiaomo'],
    useCases: ['계단·다층 Tote 이송', '협소 랙 진입', '비정형 Kitting', '특수 위치 용접', 'Pack 다종 체결'],
    payload: '15kg ~ 25kg',
    reach: '인간 키 (약 1.7m)',
    pricing: '$150K ~ $300K (양산가, 2026 기준)',
    isLgLineup: false,
    imagePath: '/robots/digit.jpg',
  },
  AMR: {
    code: 'AMR',
    nameKr: '자율주행로봇',
    nameEn: 'Autonomous Mobile Robot',
    tagline: 'SLAM 기반 자율주행 운반 로봇 — Tote / 박스 이송',
    description: 'LiDAR + SLAM 기반 자율주행으로 동선을 스스로 계획. 정형 환경의 Tote / 카트 이송에 압도적 ROI. LG 베어로보틱스 인수 (2024) 후 자사 라인업.',
    examples: ['LG 베어로보틱스 Servi', 'MiR (Mobile Industrial Robots)', 'Geek+ EVE', 'Locus Origin', 'Otto Motors'],
    useCases: ['창고 Tote 이송', 'DC 단일 SKU 분류', '카트 견인', '재고 보충 운반'],
    payload: '50kg ~ 1,500kg',
    reach: '무제한 (이동)',
    pricing: '$30K ~ $80K (단가)',
    isLgLineup: true,
    imagePath: '/robots/amr.jpg',
  },
  CLOiD: {
    code: 'CLOiD',
    nameKr: 'LG CLOiD 휴머노이드',
    nameEn: 'LG CLOiD',
    tagline: 'LG 자체 휴머노이드 — 양산 2026 예정, 가정·산업 양면',
    description: 'LG의 자체 휴머노이드 라인업. 가정용 (HS 부문) + 산업용 (BS 부문) 양면 적용 목표. 슬림 폼팩터로 협소 진입 강점. 2026 양산 출시 예정 — 현재 PoC 단계.',
    examples: ['LG CLOiD (개발 중 — 2026 양산 예정)'],
    useCases: ['가정 청소·정리·돌봄', '산업 협소 작업·다 모델 체결', 'LG 가전 매장 응대', 'LGE 라인 Pack 다종 체결'],
    payload: '15kg ~ 20kg (목표)',
    reach: '인간 키 (1.65m ± )',
    pricing: 'TBD — 2026 출시 시 공개',
    isLgLineup: true,
    imagePath: '/robots/cloid.jpg',
  },
};

// 라인업 칩에서 LG 자사 표시할 코드들
export const LG_LINEUP_CODES = new Set(['MoMa', 'AMR', 'CLOiD']);

// ─────────────────────────────────────────────────────────────────
// v11 → 내부 타입 매핑

const GRADE_TO_NUM: Record<string, Grade> = {
  '★★★': 3, '★★': 2, '★': 1, '✗': 0,
};

function asRobots(arr: string[]): RobotKind[] {
  return arr.filter((r): r is RobotKind => r === 'IR' || r === 'CR' || r === 'MoMa' || r === 'Hum');
}
function asGrippers(arr: string[]): GripperKind[] {
  return arr.filter((g): g is GripperKind => g === 'Vac' || g === 'Jaw' || g === 'Multi' || g === 'Soft' || g === 'Mag');
}
function asLineup(arr: string[]): LineupKind[] {
  return arr.filter((l): l is LineupKind => l === 'IR' || l === 'CR' || l === 'MoMa' || l === 'AMR' || l === 'CLOiD');
}
function asShare(n: number): Share {
  return Math.max(0, Math.min(5, Math.round(n))) as Share;
}

function resolveBarrierText(codes: string[], desc: string): string {
  if (desc && desc.trim().length > 0) return desc.trim();
  if (!codes || codes.length === 0) return '';
  return codes.map(c => `${c}: ${BARRIER_CODES[c] ?? c}`).join(' · ');
}

// ─────────────────────────────────────────────────────────────────
// 144셀 점수 행렬 (행=task, 열=sector) — JSON에서 파생
const SCORES: number[][] = (() => {
  const m: number[][] = [];
  for (const task of V11.tasks) {
    const row = new Array<number>(SECTORS.length).fill(0);
    for (const ind of task.industries) row[ind.idx] = ind.score10;
    m.push(row);
  }
  return m;
})();

// 576개 Lv 셀 — JSON에서 파생 (모달용)
export const LV_DETAILS_BY_KEY: Record<string, LvDetail[]> = (() => {
  const out: Record<string, LvDetail[]> = {};
  for (const task of V11.tasks) {
    for (const ind of task.industries) {
      const key = `${task.idx}-${ind.idx}`;
      out[key] = ind.levels
        .slice()
        .sort((a, b) => a.lv - b.lv)
        .map(lv => ({
          grade: GRADE_TO_NUM[lv.grade] ?? 0,
          task: lv.task,
          robots: asRobots(lv.robots),
          grippers: asGrippers(lv.grippers),
          share: asShare(lv.industry_share),
          lineup: asLineup(lv.lg_robots),
          tags: lv.tags ?? [],
          barriers: resolveBarrierText(lv.barriers ?? [], lv.barrier_desc ?? ''),
        }));
    }
  }
  return out;
})();

// 보조 정보 (proc / lineup / tags / barriers) — 셀 카드 디폴트
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
// 진입 적합 셀 (score10 ≥ 7.5) — v11 기준 13개. 동점은 task index 우선.
export interface TopTierEntry {
  rank: number;            // 1~N
  taskIdx: number;
  sectorIdx: number;
  score: number;
  shortLabel: string;      // '② Kitting × 물류'
  verdict: string;         // '진입 적합' (≥7.5 일괄)
}

export const TOP_TIER: TopTierEntry[] = (() => {
  const list: { taskIdx: number; sectorIdx: number; score: number }[] = [];
  for (let t = 0; t < 12; t++) {
    for (let s = 0; s < 12; s++) {
      const sc = SCORES[t][s];
      if (sc >= 7.5) list.push({ taskIdx: t, sectorIdx: s, score: sc });
    }
  }
  list.sort((a, b) => b.score - a.score || a.taskIdx - b.taskIdx || a.sectorIdx - b.sectorIdx);
  return list.map((e, i) => ({
    rank: i + 1,
    taskIdx: e.taskIdx,
    sectorIdx: e.sectorIdx,
    score: e.score,
    shortLabel: `${TASKS[e.taskIdx].num} ${TASKS[e.taskIdx].name} × ${SECTORS[e.sectorIdx]}`,
    verdict: '진입 적합',
  }));
})();

// 기존 Top 5 Deep Dive 호환 — DeepDive 콘텐츠는 Rank 1~5에만 존재
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
// LvDetails 조회 — JSON에서 모든 144셀 hand-curated. fallback 불필요하지만 안전망 유지.
const FALLBACK_LV: LvDetail = {
  grade: 0,
  task: '데이터 미등록',
  robots: [],
  grippers: [],
  share: 0,
  lineup: [],
  tags: [],
  barriers: '',
};

export function getLvDetails(taskIdx: number, sectorIdx: number): LvDetail[] {
  const key = `${taskIdx}-${sectorIdx}`;
  return LV_DETAILS_BY_KEY[key] ?? [FALLBACK_LV, FALLBACK_LV, FALLBACK_LV, FALLBACK_LV];
}

// 셀이 hand-curated인지 (v11에서는 모두 hand-curated)
export function isLvDetailsHandCurated(taskIdx: number, sectorIdx: number): boolean {
  return Boolean(LV_DETAILS_BY_KEY[`${taskIdx}-${sectorIdx}`]);
}

// ─────────────────────────────────────────────────────────────────
// Top 5 Deep Dive 콘텐츠 (v11에서도 Rank 1~5 셀은 동일 — 자료 재사용)
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
export type EmphasisMode = 'all' | 'topTier' | 'lg' | 'shipbuilding' | 'battery' | 'logistics';

export const EMPHASIS_MODES: { id: EmphasisMode; label: string }[] = [
  { id: 'all',           label: '전체' },
  { id: 'topTier',       label: '진입 적합 13' },
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

export function isTopTierCell(taskIdx: number, sectorIdx: number): boolean {
  return SCORES[taskIdx][sectorIdx] >= 7.5;
}

export function getTopTierRank(taskIdx: number, sectorIdx: number): number | null {
  const e = TOP_TIER.find(t => t.taskIdx === taskIdx && t.sectorIdx === sectorIdx);
  return e?.rank ?? null;
}

export function isTop5Cell(taskIdx: number, sectorIdx: number): boolean {
  return TOP_5.some(t => t.taskIdx === taskIdx && t.sectorIdx === sectorIdx);
}

export function getTop5Rank(taskIdx: number, sectorIdx: number): number | null {
  const e = TOP_5.find(t => t.taskIdx === taskIdx && t.sectorIdx === sectorIdx);
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
    case 'topTier':       return isTopTierCell(taskIdx, sectorIdx);
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
