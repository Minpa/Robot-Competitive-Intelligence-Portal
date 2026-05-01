/**
 * ARGOS-Designer · vacuum-arm public surface (Phase 1 PoC v1.2)
 *
 * Single import boundary for the vacuum-arm sub-namespace. Cross-module
 * consumers should hit the REST endpoints under /api/designer/vacuum-arm
 * rather than importing services directly.
 */

export { endEffectorService } from './end-effector.service.js';
export { kinematicsService } from './kinematics.service.js';
export type { WorkspaceEnvelope } from './kinematics.service.js';
export { staticsService, payloadReachCurve, evaluateArmStatics } from './statics.service.js';
export type { JointAnalysis, ArmStaticsResult, PayloadCurvePoint } from './statics.service.js';
export { stabilityService, computeStaticZmp, footprintPolygon } from './stability.service.js';
export type { StabilityResult } from './stability.service.js';
export { environmentService } from './environment.service.js';
export type {
  FurnitureType,
  FurnitureSpec,
  ObstacleType,
  ObstacleSpec,
  TargetObjectSpec,
  RoomPreset,
  RoomConfig,
  RoomPresetSpec,
  FurniturePlacement,
  ObstaclePlacement,
  TargetMarker,
  ScenarioSpec,
} from './types.js';
export type {
  BaseShape,
  EndEffectorType,
  ArmMountPosition,
  EndEffectorSpec,
  VacuumBaseSpec,
  ManipulatorArmSpec,
  ProductConfig,
  EndEffectorListResponse,
} from './types.js';
