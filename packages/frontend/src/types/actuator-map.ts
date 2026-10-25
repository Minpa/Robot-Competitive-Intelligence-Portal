/**
 * 액추에이터 관점 경쟁사 포지션·공급망 맵 타입 — backend/src/services/actuator-position-map.service.ts 응답과 1:1.
 * 제어 난이도 지수는 프런트에서 가중치를 바꿔 계산한다 (서버는 기본 가중치 difficultyDefault 만 내려준다).
 */

export type ActuatorMapRegion = 'na' | 'cn' | 'eu' | 'kr' | 'jp' | 'other';

export type ActuatorTypeLabel =
  | '유압→전기 전환'
  | '하모닉(스트레인웨이브)'
  | '사이클로이드·유성'
  | '직구동/QDD'
  | '리니어·스크류'
  | '소프트·텐던'
  | '커스텀 전기(상세 미공개)'
  | '미확인';

export interface DifficultyWeights {
  /** 보행 방식 (바퀴 0 · 하이브리드 0.5 · 이족 1) */
  L: number;
  /** 전신 자유도 (10→0, 50→1) */
  D: number;
  /** 손 자유도 (0→0, 24→1) */
  H: number;
  /** 최고 속도 (0→0, 5 m/s→1) */
  S: number;
}

export interface RobotActuator {
  name: string;
  vendor: string | null;
  inHouse: boolean;
  type: ActuatorTypeLabel;
  torqueNm: number | null;
  weightKg: number | null;
  quantity: number;
  usageLocation: string | null;
  source: 'components' | 'ci';
  confidence: string;
}

export interface RobotPrice {
  min: number;
  max: number;
  conf: string;
  src: string;
}

export interface ActuatorMapRobot {
  id: string;
  name: string;
  company: string;
  companyId: string;
  region: ActuatorMapRegion;
  locomotion: 'bipedal' | 'wheeled' | 'hybrid' | 'unknown';
  stage: string | null;
  year: number | null;
  forecast: boolean;
  isLG: boolean;
  height: number | null;
  weight: number | null;
  payload: number | null;
  dof: number | null;
  handDof: number | null;
  speed: number | null;
  /** body_specs 가 없어 X축을 계산할 수 없는 로봇 — 표에만 표시 */
  incomplete: boolean;
  actuators: RobotActuator[];
  actuatorTypeLabel: ActuatorTypeLabel;
  actuatorTypeNote: string;
  price: RobotPrice | null;
  sources: string[];
}

export interface ActuatorSupplierProduct {
  vendor: string;
  country: string | null;
  model: string;
  type: string;
  peakTorqueNm: number | null;
  continuousTorqueNm: number | null;
  weightKg: number | null;
  diameterMm: number | null;
  priceUsd: number | null;
  status: string | null;
  targetMarket: string | null;
  source: 'products' | 'components';
}

export interface ActuatorSupplyEdge {
  robotId: string;
  robotName: string;
  company: string;
  vendor: string;
  inHouse: boolean;
  type: ActuatorTypeLabel;
  quantity: number;
  confidence: string;
}

export interface ActuatorMapResponse {
  generatedAt: string;
  cached: boolean;
  difficultyDefault: DifficultyWeights;
  typeOrder: ActuatorTypeLabel[];
  robots: ActuatorMapRobot[];
  suppliers: ActuatorSupplierProduct[];
  edges: ActuatorSupplyEdge[];
  stats: { robots: number; complete: number; incomplete: number; suppliers: number; edges: number };
}
