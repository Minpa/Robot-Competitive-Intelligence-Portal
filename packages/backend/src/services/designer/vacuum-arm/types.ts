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

// ─── REQ-6: environment catalogs ───────────────────────────────────────────

export type FurnitureType = 'sofa' | 'dining_table' | 'sink_counter' | 'desk' | 'chair';

export interface FurnitureSpec {
  id: number;
  type: FurnitureType;
  name: string;
  widthCm: number;
  depthCm: number;
  /** Top surface height (cm). For chairs/sofas this is the seat height. */
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
  /** Grip width hint (mm). Optional for shapes that aren't graspable by jaws. */
  gripWidthMm?: number;
  isMock: true;
}

// ─── REQ-6: room configuration (project's environment_config_json) ─────────

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
  /** Index into FurniturePlacement[] when placed on a furniture surface. */
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
  /** Furniture/obstacle/target additions/overrides applied on top of the preset. */
  furniture: FurniturePlacement[];
  obstacles: ObstaclePlacement[];
  targets: TargetMarker[];
  isMock: true;
}
