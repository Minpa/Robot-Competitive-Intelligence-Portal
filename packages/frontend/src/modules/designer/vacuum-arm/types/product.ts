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
