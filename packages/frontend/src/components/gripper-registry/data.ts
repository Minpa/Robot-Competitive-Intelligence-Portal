// 그리퍼 카테고리 리스트 — gripper-data.generated.ts (셀×Lv 기반 적용 검토 결과)에서
// 등장한 15개 고유 카테고리를 별도 페이지용으로 정리.

import { GRIPPER_DATA } from '@/components/cloid-coverage/gripper-data.generated';
import { CELLS } from '@/components/cloid-coverage/data';

export type GripperKey =
  | 'parallel'
  | 'parallel-camera'
  | 'multi'
  | 'multi-camera'
  | 'soft'
  | 'vacuum'
  | 'bimanual'
  | 'bimanual-ft'
  | 'bimanual-camera'
  | 'bimanual-vacuum'
  | 'ft-precision'
  | 'torque-driver'
  | 'torque-driver-7dof'
  | 'welding-torch'
  | 'custom';

export interface GripperCategory {
  key: GripperKey;
  // gripper-data.generated.ts 에 저장된 원문 카테고리명 (정확히 일치해야 매칭됨)
  rawCategory: string;
  nameKr: string;
  nameEn: string;
  tagline: string;
  description: string;
  // 대표 제품 (참고용)
  examples: string[];
  // 정렬·강조용 색상
  accent: string;
}

export const GRIPPER_CATEGORIES: GripperCategory[] = [
  {
    key: 'parallel',
    rawCategory: '평행 그리퍼',
    nameKr: '평행 그리퍼',
    nameEn: 'Parallel Jaw Gripper',
    tagline: '2-핑거 평행 조 — 정형 부품 표준 픽',
    description:
      '두 개의 평행 핑거가 직선 운동으로 정형 부품을 클램핑. 반복 정밀도 1mm급, 시간당 200~300 pick의 표준 처리량을 확보하기 위한 가장 기본적인 그리퍼.',
    examples: ['Robotiq 2F-85', 'Schunk PGN-plus', 'OnRobot RG2', 'FESTO DHPS'],
    accent: '#3B6D11',
  },
  {
    key: 'parallel-camera',
    rawCategory: '평행 + 손바닥 카메라',
    nameKr: '평행 그리퍼 + 손바닥 카메라',
    nameEn: 'Parallel Gripper + In-Palm Camera',
    tagline: '평행 조 + 손바닥 RGB — Visual 정렬·6D pose',
    description:
      '평행 그리퍼에 손바닥 RGB 카메라를 결합. 다 SKU 분류, 0.5mm급 커넥터 정렬, 6D pose 보정 등 Visual feedback이 필수인 작업에 사용.',
    examples: ['Robotiq 2F-85 + Wrist Camera', 'OnRobot Eyes', 'Photoneo MotionCam'],
    accent: '#1f6f8b',
  },
  {
    key: 'multi',
    rawCategory: 'Multi-그리퍼 (교체식)',
    nameKr: 'Multi-그리퍼 (교체식)',
    nameEn: 'Multi-Gripper Tool Changer',
    tagline: '평행 + 흡착 듀얼 툴 체인저 — 다 SKU 대응',
    description:
      '툴 체인저로 평행·흡착·다지형 등 복수 그리퍼를 자동 교체. 박스·파우치·소형 부품이 혼재되는 다 SKU Kitting과 다종 커넥터 라인에 적합. 내구성·MTBF가 핵심 스펙.',
    examples: ['ATI Quick Changer', 'OnRobot Quick Changer', 'Schunk SWS', 'Stäubli MPS'],
    accent: '#a05a2c',
  },
  {
    key: 'multi-camera',
    rawCategory: 'Multi-그리퍼 (교체식) + 손바닥 카메라',
    nameKr: 'Multi-그리퍼 (교체식) + 손바닥 카메라',
    nameEn: 'Multi-Gripper Tool Changer + In-Palm Camera',
    tagline: '툴 체인저 + Visual feedback — 다종 하네스 체결',
    description:
      'Multi-그리퍼 구성에 손바닥 카메라를 더해 하네스·커넥터의 위치·자세 인식까지 처리. 다종 SKU + 정밀 정렬이 동시에 요구되는 가전 라인에서 사용.',
    examples: ['OnRobot Quick Changer + Eyes', 'Schunk SWS + Cognex'],
    accent: '#7a4a1f',
  },
  {
    key: 'soft',
    rawCategory: 'Soft 그리퍼',
    nameKr: 'Soft 그리퍼',
    nameEn: 'Soft Gripper',
    tagline: '실리콘·공압 액추에이터 — 비정형/연성 물체',
    description:
      '실리콘·공압 액추에이터 기반 유연 핑거로 부정형 박스, 비정형 SKU, 연성 물체를 파손 없이 파지. 고정밀 위치 결정이나 고중량은 불가.',
    examples: ['Soft Robotics mGrip', 'OnRobot Soft Gripper', 'Festo DHEF', 'RightHand RightPick'],
    accent: '#4a7c2a',
  },
  {
    key: 'vacuum',
    rawCategory: '흡착·진공 그리퍼',
    nameKr: '흡착·진공 그리퍼',
    nameEn: 'Vacuum Gripper',
    tagline: '진공 컵 — 평면·곡면 비접촉 파지',
    description:
      '공압/전기식 진공 발생기로 평면·곡면 표면을 비접촉 파지. 박스 팔레타이징, 판유리, 반사·랙 상단 SKU 등 평면 흡착이 가능한 시나리오에 가장 빠르고 안정적.',
    examples: ['Schmalz', 'Piab piGRIP', 'SMC ZP 시리즈', 'OnRobot VGC10'],
    accent: '#2c5f8d',
  },
  {
    key: 'bimanual',
    rawCategory: '양손 협조 그리퍼',
    nameKr: '양손 협조 그리퍼',
    nameEn: 'Bimanual Cooperative Gripper',
    tagline: '양손 균형 제어 — Tote 10~16kg, 양손 페이로드',
    description:
      '두 팔이 동시에 동일 물체를 파지하며 균형을 맞추는 양손 협조 구성. Tote(≤16kg) 이송, 박스 양면 파지, 대형 와이어 하네스 라우팅 등 단손 페이로드를 초과하는 작업에 필수.',
    examples: ['Agility Digit (양손)', 'Apptronik Apollo', 'Figure 02', 'Boston Dynamics Atlas'],
    accent: '#5b3f7e',
  },
  {
    key: 'bimanual-ft',
    rawCategory: '양손 협조 그리퍼 + F/T 정밀',
    nameKr: '양손 협조 그리퍼 + F/T 정밀',
    nameEn: 'Bimanual + F/T Precision',
    tagline: '양손 협조 + 손목 F/T 센서 — 결속·라우팅 force 제어',
    description:
      '양손 협조 위에 손목 F/T(Force/Torque) 센서를 결합. 케이블 결속, 도장 노즐 압력 등 양손 균형과 미세 force 제어가 동시에 필요한 작업.',
    examples: ['ATI F/T Sensor + Bimanual Arm', 'Robotiq FT 300'],
    accent: '#4a3268',
  },
  {
    key: 'bimanual-camera',
    rawCategory: '양손 협조 그리퍼 + 손바닥 카메라',
    nameKr: '양손 협조 그리퍼 + 손바닥 카메라',
    nameEn: 'Bimanual + In-Palm Camera',
    tagline: '양손 협조 + Visual — 다종 컨베이어 인터페이스',
    description:
      '양손 협조 그리퍼에 손바닥 카메라를 더해 Tote/박스의 위치·자세를 실시간 인식. 다종 컨베이어 인터페이스, 부정형 적재 등 동적 환경에 필요.',
    examples: ['Agility Digit + Wrist Cam', 'Apptronik Apollo + Hand Cam'],
    accent: '#3a5a8e',
  },
  {
    key: 'bimanual-vacuum',
    rawCategory: '양손 협조 그리퍼 + 흡착·진공 그리퍼',
    nameKr: '양손 협조 그리퍼 + 흡착·진공 그리퍼',
    nameEn: 'Bimanual + Vacuum',
    tagline: '한 손은 박스 잡고, 다른 손은 흡착 — 마감 작업',
    description:
      '한 팔은 박스 본체를 양손으로 안정 지지하고, 다른 팔은 흡착 그리퍼로 테이프·라벨·뚜껑을 처리. DC 다 SKU 박스 마감 등 비대칭 양손 작업에 적합.',
    examples: ['Bimanual Arm + Schmalz Cup', 'Custom Hybrid Tool'],
    accent: '#2f6680',
  },
  {
    key: 'ft-precision',
    rawCategory: 'F/T 정밀 그리퍼',
    nameKr: 'F/T 정밀 그리퍼',
    nameEn: 'F/T Precision Gripper',
    tagline: '손목 F/T 센서 — 케이블·결속·미세 마감 force',
    description:
      '손목 또는 핑거 단에 F/T 센서를 장착해 grip force·삽입 force를 실시간 제어. 케이블 결속, 부정형 박스 마감, 0.5mm급 미세 정밀 작업에 사용.',
    examples: ['ATI Axia80', 'Robotiq FT 300', 'OnRobot HEX-E'],
    accent: '#7d2e3a',
  },
  {
    key: 'torque-driver',
    rawCategory: '토크 드라이버·임팩트',
    nameKr: '토크 드라이버·임팩트',
    nameEn: 'Torque Driver / Impact',
    tagline: '나사 체결 전용 — 토크 제어 + bit 교체',
    description:
      'EOAT으로 토크 드라이버 또는 임팩트 렌치를 장착. 가전 정형 나사 체결, Self-tapping nut 다 위치 등 토크 제어가 필요한 체결 작업 표준 솔루션.',
    examples: ['Atlas Copco Tensor STR', 'Estic Handynut', 'Bosch Rexroth ErgoSpin'],
    accent: '#8a5a00',
  },
  {
    key: 'torque-driver-7dof',
    rawCategory: '토크 드라이버·임팩트 + 협소 손목 7+ DoF',
    nameKr: '토크 드라이버·임팩트 + 협소 손목 7+ DoF',
    nameEn: 'Torque Driver + 7+ DoF Slim Wrist',
    tagline: '토크 드라이버 + 7축 협소 손목 — LGE 자사 협소 체결',
    description:
      '토크 드라이버에 7+ DoF의 협소 손목을 결합. LGE 자사 가전 내부 등 좁은 공간에서 다양한 각도로 체결해야 하는 협소 PoC 작업 전용 구성.',
    examples: ['KUKA LBR iiwa + Tensor', 'Franka Panda + ErgoSpin'],
    accent: '#6b4500',
  },
  {
    key: 'welding-torch',
    rawCategory: '용접 토치·도장 노즐',
    nameKr: '용접 토치·도장 노즐',
    nameEn: 'Welding Torch / Painting Nozzle',
    tagline: '용접·도장 전용 EOAT — IP65+ / IECEx 환경',
    description:
      '핑거 그리퍼 대신 용접 토치 또는 도장 노즐을 장착. 조선 내업 평면 용접부터 협소 블록 내부 용접·선체 도장까지 — IP65+ 환경 인증과 IECEx 방폭이 진입 게이트.',
    examples: ['Fronius TPS', 'Lincoln Power Wave', 'Yaskawa Welding Package', 'ABB Painting Robot'],
    accent: '#a04020',
  },
  {
    key: 'custom',
    rawCategory: '커스텀 (산업 전용)',
    nameKr: '커스텀 (산업 전용)',
    nameEn: 'Custom (Industry-Specific)',
    tagline: '협소·비대칭 reach·NDE 도구 등 — 산업별 맞춤 설계',
    description:
      '표준 그리퍼로 커버 불가한 협소 랙 진입(슬림형 비대칭 reach), EOL DCR 미세 체결, NDE(비파괴 검사) 도구 운용 등 산업별 맞춤 설계가 필요한 영역. 시장 small이지만 진입 가치 있는 Lv4 시나리오 다수.',
    examples: ['커스텀 슬림 reach', '맞춤 nest 그리퍼', 'NDE 프로브 마운트'],
    accent: '#555049',
  },
];

// ─────────────────────────────────────────────────────────────────
// 적용 공정 매핑 — gripper-data.generated.ts × CELLS
// 각 카테고리별로 [{cellId, cellTaskName, sectorName, lv, detail, confidence}, ...] 반환

export interface AppliedProcess {
  cellId: string;
  cellTaskName: string;
  sectorName: string;
  lv: 1 | 2 | 3 | 4;
  detail: string;
  confidence: 'high' | 'medium' | 'low';
}

const CELL_LOOKUP: Record<string, { taskName: string; sectorName: string }> = (() => {
  const out: Record<string, { taskName: string; sectorName: string }> = {};
  for (const c of CELLS) out[c.id] = { taskName: c.taskName, sectorName: c.sectorName };
  return out;
})();

export function getAppliedProcesses(rawCategory: string): AppliedProcess[] {
  const out: AppliedProcess[] = [];
  for (const r of GRIPPER_DATA) {
    if (r.gripper.category !== rawCategory) continue;
    const meta = CELL_LOOKUP[r.cellId];
    if (!meta) continue;
    out.push({
      cellId: r.cellId,
      cellTaskName: meta.taskName,
      sectorName: meta.sectorName,
      lv: r.lv,
      detail: r.gripper.detail,
      confidence: r.gripper.confidence,
    });
  }
  // 산업 → Lv 순 정렬
  out.sort((a, b) => {
    const s = a.sectorName.localeCompare(b.sectorName);
    if (s !== 0) return s;
    const t = a.cellTaskName.localeCompare(b.cellTaskName);
    if (t !== 0) return t;
    return a.lv - b.lv;
  });
  return out;
}

export function getSectorOptions(): string[] {
  const set = new Set<string>();
  for (const c of CELLS) set.add(c.sectorName);
  return Array.from(set).sort();
}
