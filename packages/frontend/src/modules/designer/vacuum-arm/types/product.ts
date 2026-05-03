/**
 * ARGOS-Designer · vacuum-arm frontend types (Phase 1 PoC v1.2)
 *
 * Mirrors the backend contract in
 * `packages/backend/src/services/designer/vacuum-arm/types.ts`.
 * Kept in sync manually for Phase 1.
 */

export type BaseShape = 'disc' | 'square' | 'tall_cylinder';

export type EndEffectorType =
  | 'simple_gripper'
  | 'suction'
  | '2finger'
  | '3finger';

export type ArmMountPosition = 'center' | 'front' | 'left' | 'right';

export interface EndEffectorSpec {
  sku: string;
  name: string;
  type: EndEffectorType;
  weightG: number;
  maxPayloadKg: number;
  gripWidthMmMin?: number;
  gripWidthMmMax?: number;
  isMock: true;
}

export interface VacuumBaseSpec {
  shape: BaseShape;
  heightCm: number;
  diameterOrWidthCm: number;
  weightKg: number;
  hasLiftColumn: boolean;
  liftColumnMaxExtensionCm: number;
}

export interface ManipulatorArmSpec {
  mountPosition: ArmMountPosition;
  shoulderHeightAboveBaseCm: number;
  shoulderActuatorSku: string;
  upperArmLengthCm: number;
  elbowActuatorSku: string;
  forearmLengthCm: number;
  wristDof: number;
  endEffectorSku: string;
}

export interface ProductConfig {
  name: string;
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
}

export interface EndEffectorListResponse {
  endEffectors: EndEffectorSpec[];
  isMock: true;
  generatedAt: string;
}

// REQ-1 imports actuator type from v1.0 catalog (same physical specs).
export type { ActuatorSpec, ActuatorType } from '../../types/robot';

/** Spec variable bounds — matches backend Pydantic Field(ge/le). */
export const BASE_BOUNDS = {
  heightCm: { min: 8, max: 30, step: 0.5 },
  diameterOrWidthCm: { min: 25, max: 40, step: 0.5 },
  weightKg: { min: 3, max: 8, step: 0.1 },
  liftColumnMaxExtensionCm: { min: 0, max: 30, step: 1 },
} as const;

/**
 * Non-center mount(front/left/right)의 페데스탈 위치 — base 반지름 대비 비율.
 * 시각 렌더링(robot-tree)과 분석 코드(client-statics)와 백엔드(stability.service)가
 * 모두 같은 값을 써야 시각과 ZMP 결과가 일치한다.
 *
 * 0.65 = 베이스 가장자리에 가까움 (실제 콤보 로봇이 팔을 mount하는 위치와 유사).
 * 백엔드 stability.service.ts와 동기화 필요. 변경 시 양쪽 동시에 수정할 것.
 */
export const MOUNT_OFFSET_RATIO = 0.65;

// ─── REQ-6 environment ─────────────────────────────────────────────────────

export type FurnitureType = 'sofa' | 'dining_table' | 'sink_counter' | 'desk' | 'chair';

export interface FurnitureSpec {
  id: number;
  type: FurnitureType;
  name: string;
  widthCm: number;
  depthCm: number;
  surfaceHeightCm: number;
  weightKg: number;
  isMock: true;
}

export type ObstacleType = 'rug' | 'threshold' | 'cable' | 'toy';

export interface ObstacleSpec {
  id: number;
  type: ObstacleType;
  name: string;
  heightCm: number;
  widthCm: number;
  isMock: true;
}

export interface TargetObjectSpec {
  id: number;
  name: string;
  weightKg: number;
  gripWidthMm?: number;
  isMock: true;
}

export type RoomPreset = 'living_room' | 'kitchen' | 'bedroom';

export interface FurniturePlacement {
  furnitureId: number;
  xCm: number;
  yCm: number;
  rotationDeg: number;
}

export interface ObstaclePlacement {
  obstacleId: number;
  xCm: number;
  yCm: number;
  rotationDeg: number;
}

export interface TargetMarker {
  targetObjectId: number;
  onFurnitureIndex: number | null;
  xCm: number;
  yCm: number;
  zCm: number;
}

export interface RoomConfig {
  preset: RoomPreset | null;
  widthCm: number;
  depthCm: number;
  furniture: FurniturePlacement[];
  obstacles: ObstaclePlacement[];
  targets: TargetMarker[];
}

export interface RoomPresetSpec {
  id: RoomPreset;
  name: string;
  widthCm: number;
  depthCm: number;
  furniture: FurniturePlacement[];
  obstacles: ObstaclePlacement[];
  targets: TargetMarker[];
  description: string;
  isMock: true;
}

export interface ScenarioSpec {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  name: string;
  description: string;
  presetRoomId: RoomPreset;
  furniture: FurniturePlacement[];
  obstacles: ObstaclePlacement[];
  targets: TargetMarker[];
  isMock: true;
}

// ─── REQ-4 analyze response ────────────────────────────────────────────────

export interface JointAnalysis {
  jointName: 'shoulder' | 'elbow';
  requiredPeakTorqueNm: number;
  actuatorPeakTorqueNm: number;
  marginPct: number;
  overLimit: boolean;
  actuatorSku: string;
}

export interface PayloadCurvePoint {
  reachCm: number;
  maxPayloadKg: number;
}

export interface WorkspaceEnvelope {
  shoulderOriginM: [number, number, number];
  innerRadiusM: number;
  outerRadiusM: number;
  totalReachCm: number;
  maxHeightCm: number;
  maxHorizontalReachCm: number;
}

export interface ArmAnalysisResult {
  armIndex: number;
  envelope: WorkspaceEnvelope;
  statics: {
    armIndex: number;
    joints: JointAnalysis[];
    estimatedLimbMassKg: number;
  };
  payloadCurve: PayloadCurvePoint[];
  endEffector: {
    sku: string;
    name: string;
    type: EndEffectorType;
    maxPayloadKg: number;
    weightG: number;
  } | null;
  endEffectorPayloadOverLimit: boolean;
  endEffectorMaxPayloadKg: number;
}

export interface StabilityResult {
  zmpXCm: number;
  zmpYCm: number;
  footprintPolygonCm: Array<[number, number]>;
  isStable: boolean;
  marginToEdgeCm: number;
}

export type ReachabilityReason =
  | 'OK'
  | 'BASE_BLOCKED'
  | 'HEIGHT_OUT_OF_REACH'
  | 'HORIZONTAL_OUT_OF_REACH'
  | 'ZMP_LIMIT'
  | 'TORQUE_LIMIT'
  | 'PAYLOAD_LIMIT'
  | 'NO_ARM';

export interface TargetReachabilityResult {
  targetMarkerIndex: number;
  canReach: boolean;
  reason: ReachabilityReason;
  reasonText: string;
  payloadMarginKg: number;
  armUsed: number | null;
}

export interface TraversabilityResult {
  reachableFloorAreaCm2: number;
  blockedObstacleIndices: number[];
  coveragePct: number;
  groundClearanceCm: number;
}

export interface EnvironmentResult {
  targets: TargetReachabilityResult[];
  traversability: TraversabilityResult;
}

export interface AnalyzeResponse {
  base: VacuumBaseSpec;
  armCount: number;
  payloadKg: number;
  arms: ArmAnalysisResult[];
  stability: StabilityResult;
  environment: EnvironmentResult | null;
  isMock: true;
  generatedAt: string;
}

// ─── REQ-10 review ─────────────────────────────────────────────────────────

export type Severity = 'high' | 'medium' | 'low';

export type ReviewApplyPatch =
  | { kind: 'base.weightKg'; value: number }
  | { kind: 'base.diameterOrWidthCm'; value: number }
  | { kind: 'base.hasLiftColumn'; value: boolean }
  | { kind: 'base.heightCm'; value: number }
  | { kind: 'arm.upperArmLengthCm'; armIndex: number; value: number }
  | { kind: 'arm.forearmLengthCm'; armIndex: number; value: number }
  | { kind: 'payloadKg'; value: number };

export interface ReviewRecommendation {
  action: string;
  expected_effect: string;
  apply?: ReviewApplyPatch;
}

export interface ReviewIssue {
  severity: Severity;
  title: string;
  explanation: string;
  recommendations: ReviewRecommendation[];
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  source: 'claude' | 'heuristic';
  generatedAt: string;
  isMock: boolean;
}

export interface SpecSheetRevisionEntry {
  parameterName: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
}

export interface SpecSheetMetadata {
  candidateName: string;
  authorName: string;
  generatedAt: string;
}

export interface SpecSheetPayload {
  meta: SpecSheetMetadata;
  product: ProductConfig;
  payloadKg: number;
  room: RoomConfig | null;
  analysis: {
    arms: ArmAnalysisResult[];
    stability: StabilityResult | null;
    environment: EnvironmentResult | null;
  };
  review: ReviewResult;
  revisions: SpecSheetRevisionEntry[];
  isMock: true;
}
