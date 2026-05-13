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
// 그리퍼 카테고리 상세 — Vac / Jaw / Multi / Soft / Mag

export interface GripperInfoEntry {
  code: GripperKind;
  nameKr: string;
  nameEn: string;
  tagline: string;
  description: string;
  examples: string[];
  useCases: string[];
}

export const GRIPPER_INFO: Record<string, GripperInfoEntry> = {
  Vac: {
    code: 'Vac',
    nameKr: '진공 흡착 그리퍼',
    nameEn: 'Vacuum Gripper',
    tagline: '흡착 컵으로 평면·곡면 물체를 비접촉 파지',
    description: '공압 또는 전기식 진공 발생기로 흡착력을 생성하여 물체를 파지. 평면·곡면 표면에서 빠르고 안정적. 다공성·불규칙 형상에는 부적합.',
    examples: ['Schmalz', 'Piab piGRIP', 'SMC ZP 시리즈', 'OnRobot VGC10'],
    useCases: ['박스 팔레타이징', '판유리·패널 이송', 'PCB 핸들링', '포장재 Bin Picking'],
  },
  Jaw: {
    code: 'Jaw',
    nameKr: '평행 조 그리퍼',
    nameEn: 'Parallel Jaw Gripper',
    tagline: '2-핑거 평행 조로 정형 부품을 정밀 파지',
    description: '두 개의 평행한 핑거가 직선 운동으로 물체를 양측에서 클램핑. 정형 부품 파지에 가장 보편적이며 반복 정밀도가 높음. 비정형·대형 물체에는 한계.',
    examples: ['Schunk PGN-plus', 'FESTO DHPS', 'Robotiq 2F-85/140', 'OnRobot RG2/RG6'],
    useCases: ['머신 텐딩 부품 로딩', '나사 체결 부품 파지', '커넥터 삽입', '소형 부품 조립'],
  },
  Multi: {
    code: 'Multi',
    nameKr: '다중 핑거 그리퍼',
    nameEn: 'Multi-Finger Gripper',
    tagline: '3+ 핑거로 비정형·다종 물체에 적응적 파지',
    description: '3개 이상의 핑거가 독립 구동되어 다양한 형상에 적응적으로 파지. 비정형 SKU 대응력이 뛰어나며 양손 협응 작업에 적합. 구조 복잡성과 제어 난이도가 높음.',
    examples: ['Robotiq 3-Finger', 'Barrett Hand', 'Shadow Dexterous Hand', 'Wonik QBrobotics'],
    useCases: ['Mixed-SKU Kitting', '비정형 Bin Picking', '양손 협응 체결', '케이블 라우팅'],
  },
  Soft: {
    code: 'Soft',
    nameKr: '소프트 그리퍼',
    nameEn: 'Soft Gripper',
    tagline: '유연 소재로 파손 위험 없이 연성 물체를 파지',
    description: '실리콘·공압 액추에이터 등 유연 소재로 구성. 과일·식품·전자 부품 등 파손에 민감한 물체를 안전하게 파지. 고정밀 위치 결정이나 고중량 파지에는 부적합.',
    examples: ['Soft Robotics mGrip', 'OnRobot Soft Gripper', 'Festo DHEF', 'RightHand RightPick'],
    useCases: ['식품 핸들링', '전자 부품 이송', '의약품 포장', '불규칙 형상 파지'],
  },
  Mag: {
    code: 'Mag',
    nameKr: '자기 그리퍼',
    nameEn: 'Magnetic Gripper',
    tagline: '전자석·영구자석으로 철제 부품을 비접촉 파지',
    description: '전자석 또는 영구자석(전환식)으로 강자성체 물체를 파지. 표면 상태에 무관하게 안정적이며 oil·분진 환경에 강점. 비자성체에는 사용 불가.',
    examples: ['Schunk EMH', 'SMC MHM', 'Goudsmit 전자석', 'Schmalz SGM'],
    useCases: ['철판·강재 이송', '조선 블록 용접 지그', '프레스 부품 로딩', '자동차 차체 핸들링'],
  },
};

// ─────────────────────────────────────────────────────────────────
// 사례(태그) 상세 정보 — 배포 사례 클릭 시 팝업용
export type CaseStatus = 'D' | 'A' | 'P' | 'X';

export interface CaseInfoEntry {
  tag: string;
  company: string;
  robot: string;
  status: CaseStatus;
  statusLabel: string;
  sector: string;
  task: string;
  description: string;
  detail: string;
  source?: string;
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  D: '양산 배치',
  A: '알파 / PoC',
  P: '파일럿',
  X: '중단 / 제한',
};

function c(
  tag: string, company: string, robot: string, status: CaseStatus,
  sector: string, task: string, description: string, detail: string, source?: string,
): CaseInfoEntry {
  return { tag, company, robot, status, statusLabel: STATUS_LABELS[status], sector, task, description, detail, source };
}

export const CASE_INFO: Record<string, CaseInfoEntry> = {
  'Amazon-D':           c('Amazon-D', 'Amazon', 'Sparrow / Robin / Proteus', 'D', '물류(DC)', 'Bin Picking · Tote 이송 · 팔레타이징', 'Amazon 물류 센터 양산 로봇 배치 — 75만 대 이상 가동', 'Amazon은 Sparrow(Bin Picking), Robin(분류), Proteus(자율주행 Tote 이송) 등 로봇을 DC 전역에 75만 대 이상 배치. 2024년 기준 연간 처리 Tote 10억+ 건. 인간 작업자와 협업 형태로 운영.', 'Amazon 2024 공식 발표'),
  'Amazon-AGV':         c('Amazon-AGV', 'Amazon', 'Kiva / Proteus AGV', 'D', '물류(DC)', 'AGV 기반 선반 이송', 'Amazon Kiva → Proteus AGV 양산 배치', 'Kiva Systems 인수(2012) 이후 AGV 기반 선반 이송 시스템 양산. 이후 Proteus 자율 이동 로봇으로 세대 교체.'),
  'GXO-D':              c('GXO-D', 'GXO Logistics', 'Agility Digit', 'D', '물류(DC)', 'Tote 이송 · Kitting', 'GXO + Agility Digit RaaS 양산 배치 — 누적 10만+ Tote', 'GXO는 Agility Digit을 RaaS(Robot-as-a-Service) 모델로 양산 배치. 단층 DC 환경에서 누적 10만+ Tote 처리 실적. Spanx DC에서 상용 운영 중.', 'GXO 2024 Q3 실적 발표'),
  'GXO-Digit-A':        c('GXO-Digit-A', 'GXO Logistics', 'Agility Digit', 'A', '물류(DC)', 'Kitting · 분류', 'GXO Digit Kitting 파일럿', 'GXO Kitting 라인에서 Digit PoC 운영. Mixed-SKU 대응 확인 중.'),
  'Spanx-D':            c('Spanx-D', 'Spanx (via GXO)', 'Agility Digit', 'D', '물류(DC)', 'Tote 이송', 'Spanx DC에서 Digit 양산 상용 운영', 'Spanx의 GXO 위탁 DC에서 Agility Digit이 Tote 이송 작업 양산 가동 중. RaaS 모델 적용.'),
  'Toyota-D':           c('Toyota-D', 'Toyota', 'T-HR3 / Arene / 자사 시스템', 'D', '자동차', 'Tote 이송 · 차체 핸들링', 'Toyota 자체 공장 로봇 양산 배치', 'Toyota는 자체 로봇 시스템(T-HR3, Arene 플랫폼 등)을 공장 라인에 양산 배치. 차체 핸들링 및 물류 이송에 활용.'),
  'Toyota-Digit-A':     c('Toyota-Digit-A', 'Toyota', 'Agility Digit', 'A', '자동차', 'Tote 이송', 'Toyota Research Institute Digit 연구 파트너십', 'TRI(Toyota Research Institute)에서 Digit 활용 Tote 이송 PoC 진행.'),
  'Tesla-Optimus-D':    c('Tesla-Optimus-D', 'Tesla', 'Optimus (Gen 2)', 'D', '배터리·전자', '4680 셀 핸들링', 'Tesla 공장에서 Optimus 자체 배치', 'Tesla Fremont/Austin 공장에서 Optimus를 4680 배터리 셀 핸들링 및 분류 작업에 자체 배치. 2025년 기준 수십 대 규모.', 'Tesla 2025 Q1 Earnings'),
  'Tesla-X':            c('Tesla-X', 'Tesla', 'Optimus', 'X', '다분야', 'Bin Picking 등', 'Tesla Optimus — 외부 판매 제한, 자사 전용', 'Optimus는 외부 판매 없이 Tesla 공장 내부 전용으로 운영. 외부 상용화 시점 미정.'),
  'CATL-D':             c('CATL-D', 'CATL', 'CATL Xiaomo', 'D', '배터리', '커넥터 체결 · Pack 조립', 'CATL Xiaomo 세계 최초 대규모 휴머노이드 배치 (2025-12)', 'CATL Luoyang Zhongzhou 공장에서 Xiaomo 휴머노이드를 대규모 배치. 99% 가동률 달성. 배터리 Pack 조립 및 커넥터 체결 작업 수행.', 'CATL 2025 공식 발표'),
  'CATL-X':             c('CATL-X', 'CATL', 'CATL Xiaomo', 'X', '배터리', '팩 조립', 'CATL Xiaomo 일부 라인 중단', 'CATL 일부 라인에서 Xiaomo 운영 중단. 품질 이슈 또는 라인 재편에 따른 것으로 추정.'),
  'BMW-Figure-A':       c('BMW-Figure-A', 'BMW', 'Figure 02', 'A', '자동차', '차체 부품 체결', 'BMW Spartanburg 공장 Figure 02 파일럿 (11개월)', 'BMW Spartanburg X3 라인에서 Figure 02가 11개월 파일럿 운영. 30K대 생산에 기여. 2025-11 retire 후 Figure 03 전환 논의 중.', 'Figure AI 공식 발표'),
  'BMW-Figure-D':       c('BMW-Figure-D', 'BMW', 'Figure 02/03', 'D', '자동차', '차체 부품 체결', 'BMW + Figure 양산 단계 전환', 'BMW가 Figure 로봇을 양산 라인에 투입하는 단계로 전환 중.'),
  'BMW-Fig':            c('BMW-Fig', 'BMW', 'Figure', 'A', '자동차', '차체 조립 보조', 'BMW + Figure 파일럿', 'BMW 공장에서 Figure 로봇 활용 차체 조립 파일럿.'),
  'Mercedes-Apollo-A':  c('Mercedes-Apollo-A', 'Mercedes-Benz', 'Apptronik Apollo', 'A', '자동차', '부품 핸들링', 'Mercedes-Benz + Apptronik Apollo PoC', 'Mercedes-Benz가 Apollo 휴머노이드를 부품 핸들링 작업에 PoC 적용. GXO와의 3자 파트너십.'),
  'Mercedes-Apollo-D':  c('Mercedes-Apollo-D', 'Mercedes-Benz', 'Apptronik Apollo', 'D', '자동차', '부품 핸들링', 'Mercedes-Benz Apollo 양산 적용', 'Mercedes-Benz가 Apollo를 생산 라인에 양산 배치.'),
  'Samsung-A':          c('Samsung-A', 'Samsung', '자체 솔루션 / 협동로봇', 'A', '전자', '검사 · SMT', 'Samsung 전자 라인 로봇 PoC', 'Samsung 전자 생산 라인에서 검사 및 SMT 공정 로봇 PoC.'),
  'Samsung-RBY1-D':     c('Samsung-RBY1-D', 'Samsung', 'Rainbow Robotics RB-Y1', 'D', '전자', '검사 · 조립', 'Samsung + Rainbow Robotics RB-Y1 양산 배치', 'Samsung이 Rainbow Robotics(지분 투자) RB-Y1 양산 배치.'),
  'Samsung-Spot-D':     c('Samsung-Spot-D', 'Samsung', 'Boston Dynamics Spot', 'D', '건설·시설', '시설 점검', 'Samsung 건설 현장 Spot 배치', 'Samsung 건설 현장에서 Boston Dynamics Spot 활용 시설 점검.'),
  'Samsung-D':          c('Samsung-D', 'Samsung', '자체 AOI · 로봇 솔루션', 'D', '전자', '검사', 'Samsung 반도체·디스플레이 검사 로봇 양산', 'Samsung 반도체 및 디스플레이 라인에서 AOI(자동 광학 검사) 로봇 양산 가동.'),
  'LGES-D':             c('LGES-D', 'LG에너지솔루션', '자체 / 협동로봇', 'D', '배터리', '머신텐딩 · 검사', 'LGES 배터리 라인 로봇 양산 배치', 'LG에너지솔루션 배터리 셀·팩 생산 라인에서 협동로봇 기반 머신텐딩 및 검사 자동화 양산 가동.'),
  'LGES-PoC':           c('LGES-PoC', 'LG에너지솔루션', '휴머노이드 / MoMa', 'A', '배터리', '다종 Pack 체결', 'LGES 휴머노이드 PoC', 'LG에너지솔루션에서 휴머노이드/MoMa 활용 다종 Pack 체결 PoC.'),
  'LGIT-PoC':           c('LGIT-PoC', 'LG이노텍', '협동로봇 / MoMa', 'A', '전자', '카메라 모듈 조립', 'LG이노텍 카메라 모듈 라인 PoC', 'LG이노텍 카메라 모듈 조립 라인에서 PoC 진행.'),
  'HD현대-D':           c('HD현대-D', 'HD현대', '자체 용접 로봇 + Spot', 'D', '조선', '블록 용접 · 도장', 'HD현대 조선 블록 용접/도장 로봇 양산', 'HD현대중공업 조선소에서 블록 용접 및 도장 로봇 양산 가동. Spot 점검 병행.'),
  'HD현대-A':           c('HD현대-A', 'HD현대', '휴머노이드 시제품', 'A', '조선', '특수 위치 용접', 'HD현대 휴머노이드 PoC', 'HD현대에서 협소 블록 용접용 휴머노이드 시제품 PoC.'),
  'HD현대-P':           c('HD현대-P', 'HD현대', 'Persona AI 시제품', 'P', '조선', '블록 용접·도장', 'HD현대 + Persona AI 파일럿 (2026말 → 2027 상용화 예정)', 'HD현대와 Persona AI의 공동 블록 용접·도장 시제품. 2026말 prototype, 2027 commercial 예정.'),
  'HD현대삼호-A':       c('HD현대삼호-A', 'HD현대삼호중공업', '로봇 시제품', 'A', '조선', '도장', 'HD현대삼호 도장 PoC', 'HD현대삼호중공업에서 도장 라인 로봇 PoC.'),
  'Persona-HD-P':       c('Persona-HD-P', 'Persona AI + HD현대', 'Persona AI 휴머노이드', 'P', '조선', '블록 용접·도장', 'Persona AI + HD현대 시제품 파일럿', 'Persona AI 휴머노이드와 HD현대의 공동 파일럿. 2026말 prototype 목표.'),
  'Apollo-A':           c('Apollo-A', 'Apptronik', 'Apollo', 'A', '다분야', '부품 핸들링', 'Apptronik Apollo PoC 다수 진행', 'Apptronik Apollo 휴머노이드가 다수 산업에서 PoC 진행 중.'),
  'Apollo-Jabil-P':     c('Apollo-Jabil-P', 'Jabil + Apptronik', 'Apollo', 'P', '전자', 'PCB 조립', 'Jabil + Apollo 파일럿', 'Jabil EMS 공장에서 Apollo 휴머노이드 PCB 조립 파일럿.'),
  'Jabil-Apollo-P':     c('Jabil-Apollo-P', 'Jabil + Apptronik', 'Apollo', 'P', '전자', 'PCB 조립', 'Jabil 공장 Apollo 파일럿', 'Jabil EMS 공장에서 Apollo PCB 조립 라인 파일럿.'),
  'Atlas-Hyundai-D':    c('Atlas-Hyundai-D', 'Boston Dynamics + Hyundai', 'Atlas (Electric)', 'D', '자동차', '부품 핸들링', 'Hyundai 공장 Atlas 배치', 'Boston Dynamics Atlas(전동)를 현대자동차 공장에 양산 배치.'),
  'Spot-A':             c('Spot-A', 'Boston Dynamics', 'Spot', 'A', '시설관리', '시설 점검', 'Spot 시설 점검 PoC', 'Boston Dynamics Spot을 시설 점검에 PoC 적용.'),
  'Figure03':           c('Figure03', 'Figure AI', 'Figure 03', 'A', '다분야', '범용 작업', 'Figure 03 차세대 휴머노이드', 'Figure AI의 차세대 휴머노이드 Figure 03. 멀티태스크 목표.'),
  'ANYmal-A':           c('ANYmal-A', 'ANYbotics', 'ANYmal', 'A', '에너지·시설', '시설 점검', 'ANYmal 4족 보행 점검 로봇 PoC', 'ANYbotics ANYmal — 석유·가스·발전소 시설 점검용 4족 보행 로봇 PoC.'),
  'Foxconn-Nvidia-A':   c('Foxconn-Nvidia-A', 'Foxconn + NVIDIA', '자체 + NVIDIA Isaac', 'A', '전자', 'SMT · 조립', 'Foxconn + NVIDIA 공장 자동화 PoC', 'Foxconn이 NVIDIA Isaac 플랫폼을 활용한 공장 자동화 PoC.'),
  'UBTech-Foxconn-A':   c('UBTech-Foxconn-A', 'UBTech + Foxconn', 'UBTech Walker S', 'A', '전자', '조립 보조', 'UBTech Walker S Foxconn 라인 PoC', 'UBTech Walker S 휴머노이드가 Foxconn 조립 라인에서 PoC 진행.'),
  'Fincantieri-D':      c('Fincantieri-D', 'Fincantieri', '용접 로봇 시스템', 'D', '조선', '블록 용접', 'Fincantieri 조선 용접 로봇 양산', 'Fincantieri(이탈리아 조선) 블록 용접 로봇 양산 가동.'),
  'KUKA-Flex':          c('KUKA-Flex', 'KUKA', 'KR Flex / iiwa', 'A', '자동차', '가변 라인 조립', 'KUKA Flex 가변 라인 솔루션', 'KUKA의 가변(Flex) 생산 라인 솔루션.'),
  'Stäubli-A':          c('Stäubli-A', 'Stäubli', 'TX2-90 등', 'A', '반도체·전자', '클린룸 핸들링', 'Stäubli 클린룸 로봇 PoC', 'Stäubli 클린룸 대응 로봇 PoC.'),
  'TSMC-A':             c('TSMC-A', 'TSMC', '자체 + 협동로봇', 'A', '반도체', '웨이퍼 핸들링', 'TSMC 팹 로봇 PoC', 'TSMC 팹 내 웨이퍼 핸들링 로봇 PoC.'),
  'Bayer-X':            c('Bayer-X', 'Bayer', 'Fetch / MiR', 'X', '제약', '라인 운반', 'Bayer 물류 로봇 중단', 'Bayer 제약 라인 물류 로봇 도입 후 축소.'),
  'Merc-Ap':            c('Merc-Ap', 'Mercedes-Benz', 'Apptronik Apollo', 'A', '자동차', '부품 핸들링', 'Mercedes + Apollo PoC', 'Mercedes-Benz Apollo PoC — GXO 파트너십.'),
  'Dextro-A':           c('Dextro-A', 'Dextrous Robotics', 'Dextrous 시스템', 'A', '물류', '택배 분류', 'Dextrous Robotics 택배 분류 PoC', 'Dextrous Robotics의 택배 박스 분류 PoC.'),
  'Ardent-A':           c('Ardent-A', 'Ardent', 'Ardent 용접 시스템', 'A', '조선·건설', '현장 용접', 'Ardent 현장 용접 PoC', 'Ardent의 이동식 현장 용접 PoC.'),
  'Chef-A':             c('Chef-A', 'Chef Robotics 등', '식품 조리 로봇', 'A', '식품', '식품 조리·배분', 'Chef Robotics 식품 조리 PoC', 'Chef Robotics의 식품 조리·배분 로봇 PoC.'),
  'EVST-A':             c('EVST-A', 'EVST', 'EVST 시스템', 'A', '에너지', '태양광 패널 설치', 'EVST 태양광 패널 설치 PoC', 'EVST의 태양광 패널 설치 로봇 PoC.'),
  'Faraday-Aegis-A':    c('Faraday-Aegis-A', 'Faraday Future + Aegis', 'Aegis 시스템', 'A', '자동차', '조립', 'Faraday + Aegis 조립 PoC', 'Faraday Future가 Aegis 로봇 시스템을 활용한 조립 PoC.'),
  'Xiaomi-Hum-A':       c('Xiaomi-Hum-A', 'Xiaomi', 'CyberOne / CyberDog', 'A', '전자', '조립 보조', 'Xiaomi 휴머노이드 PoC', 'Xiaomi CyberOne 휴머노이드 공장 조립 PoC.'),
  '한화오션-T':         c('한화오션-T', '한화오션', '용접 로봇 시스템', 'D', '조선', '블록 용접', '한화오션 용접 로봇 양산', '한화오션 조선소 블록 용접 로봇 양산 가동.'),
};

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
    headline: '글로벌 DC가 이미 상용 RaaS 검증한 영역. 즉시 진입 가능한 1순위 시장.',
    story: 'Amazon Robin/Sparrow 상용 가동, GXO Digit RaaS, Spanx Digit 단층 DC RaaS 등 휴머노이드+AMR 조합 상용 운영 중. LG는 보유 AMR과 CLOiD를 결합해 단기 PoC 진입이 가능하다.',
    deployed: [
      { name: 'Agility Digit',          tag: 'GXO/Spanx 상용 RaaS (누적 10만+ Tote, 단층 DC)' },
      { name: 'Apptronik Apollo',       tag: 'Mercedes·GXO 파일럿' },
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
    headline: 'CATL Xiaomo가 이미 대규모 배치. LGES 자사 PoC로 가장 빠르게 진입할 수 있다.',
    story: 'Pack 다종·고압 커넥터 체결을 휴머노이드로 대규모 배치 검증한 사례 존재 (CATL Xiaomo 2025-12 Luoyang). LGES와 자사 PoC 검증 → 외부 확산이 정석 루트.',
    deployed: [
      { name: 'CATL Xiaomo',     tag: '세계 최초 대규모 배치 (2025-12 Luoyang Zhongzhou, 99%)' },
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
    headline: 'HD현대 + Persona AI 시제품 단계 (2027 commercial 예정). 한국 조선 압도의 전략적 거점.',
    story: '블록 다양·협소 위치 용접에서 휴머노이드가 산업로봇 대체. HD현대 + Persona AI 시제품 → 2027 commercial 확보 시 글로벌 조선 시장 확장 가능.',
    deployed: [
      { name: 'HD현대 + Persona AI', tag: '블록 용접·도장 시제품 (2026말 prototype, 2027 commercial 예정)' },
      { name: '삼성중공업 PoC',       tag: '도장 라인' },
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
    headline: 'Mixed-SKU 주문 단위 Kitting을 MoMa+AMR 조합으로 상용 진입.',
    story: 'Amazon Robin/Sparrow 상용 가동, GXO × Digit 상용 RaaS 검증. LG는 MoMa(보유)+AMR로 즉시 PoC 가능, 다 SKU·동선 변동 영역은 휴머노이드 추가 필요.',
    deployed: [
      { name: 'Amazon Robin/Sparrow', tag: 'Mixed-SKU 상용 가동' },
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
      { name: 'Foxconn 자체 솔루션', tag: 'PCB 체결 자체 양산 라인' },
      { name: 'Figure 02',           tag: 'BMW Spartanburg X3 11개월 파일럿 (30K대 기여, 2025-11 retire)' },
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
    case 'lg':            return sectorIdx === 1 || sectorIdx === 4; // 자동차 부품(전장) / 전자가전
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
