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
