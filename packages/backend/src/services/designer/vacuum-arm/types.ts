/**
 * ARGOS-Designer · vacuum-arm internal types (Phase 1 PoC v1.2)
 *
 * Microservice boundary — these types live within the vacuum-arm sub-namespace
 * and MUST NOT leak into other backend modules. Cross-module consumers should
 * call the public REST endpoints under /api/designer/vacuum-arm.
 *
 * Spec: docs/designer/SPEC.md §4.2 (Pydantic schema, mapped to TS).
 */

// ─── Shared enums ──────────────────────────────────────────────────────────

/** Vacuum cleaner base form factor. */
export type BaseShape = 'disc' | 'square' | 'tall_cylinder';

export type EndEffectorType =
  | 'simple_gripper'
  | 'suction'
  | '2finger'
  | '3finger';

export type ArmMountPosition = 'center' | 'front' | 'left' | 'right';

// ─── Catalog: end effectors ────────────────────────────────────────────────

export interface EndEffectorSpec {
  sku: string;
  name: string;
  type: EndEffectorType;
  weightG: number;
  maxPayloadKg: number;
  /** Min jaw opening / suction footprint (mm). Optional for suction-only. */
  gripWidthMmMin?: number;
  /** Max jaw opening (mm). */
  gripWidthMmMax?: number;
  isMock: true;
}

// ─── Product configuration (designer_spec_candidates.product_config_json) ─

/**
 * Vacuum cleaner base — the rolling platform. 5 spec variables (REQ-1):
 *   shape, heightCm, diameterOrWidthCm, weightKg, has lift column.
 */
export interface VacuumBaseSpec {
  shape: BaseShape;
  /** Range: 8 ~ 30 cm (typical robovac height envelope). */
  heightCm: number;
  /** For disc: diameter; for square/tall_cylinder: width or face length. 25 ~ 40 cm. */
  diameterOrWidthCm: number;
  /** Range: 3 ~ 8 kg (typical robovac mass). */
  weightKg: number;
  hasLiftColumn: boolean;
  /** Lift column max stroke (cm). 0 if hasLiftColumn=false. Range: 0 ~ 30. */
  liftColumnMaxExtensionCm: number;
}

/**
 * Manipulator arm mounted on the vacuum base. 9 spec variables (REQ-2 territory):
 *   mount, shoulder height, L1, L2, wrist DOF, two actuator SKUs, end-effector SKU.
 *
 * REQ-1 leaves arms = []; full schema lands here so the type is final from day 1.
 */
export interface ManipulatorArmSpec {
  mountPosition: ArmMountPosition;
  /** Vertical offset from base top to shoulder joint (cm). 0 ~ 20. */
  shoulderHeightAboveBaseCm: number;
  shoulderActuatorSku: string;
  /** Upper arm length (cm). 15 ~ 40. */
  upperArmLengthCm: number;
  elbowActuatorSku: string;
  /** Forearm length (cm). 15 ~ 40. */
  forearmLengthCm: number;
  /** Wrist degrees of freedom. 0 ~ 3. */
  wristDof: number;
  endEffectorSku: string;
}

/** Top-level product config — what gets persisted as a candidate. */
export interface ProductConfig {
  name: string;
  base: VacuumBaseSpec;
  /** 0, 1, or 2 manipulator arms. Phase 1 caps at 2. */
  arms: ManipulatorArmSpec[];
}

// ─── List response shapes (REQ-1 catalog endpoints) ────────────────────────

export interface EndEffectorListResponse {
  endEffectors: EndEffectorSpec[];
  isMock: true;
  generatedAt: string;
}
