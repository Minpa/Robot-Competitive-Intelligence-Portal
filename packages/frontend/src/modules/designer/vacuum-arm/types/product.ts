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

export interface AnalyzeResponse {
  base: VacuumBaseSpec;
  armCount: number;
  payloadKg: number;
  arms: ArmAnalysisResult[];
  isMock: true;
  generatedAt: string;
}
