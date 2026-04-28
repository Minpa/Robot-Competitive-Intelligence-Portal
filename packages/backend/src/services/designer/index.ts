/**
 * ARGOS-Designer service · public surface
 *
 * Microservice boundary — the rest of the backend imports ONLY from this file.
 * Internal modules (mock-data, sub-services) stay private to this directory.
 *
 * Spec: docs/designer/SPEC.md (Phase 1 PoC)
 */

export { formFactorService } from './form-factor.service.js';
export { sensorService } from './sensor.service.js';
export { fovService } from './fov.service.js';
export { kinematicsService } from './kinematics.service.js';
export { staticsService } from './statics.service.js';
export { evaluationService } from './evaluation.service.js';
export { actuatorService } from './actuator.service.js';
export { coachingService } from './coaching.service.js';

export type {
  FormFactorId,
  FormFactorListResponse,
  FormFactorSummary,
  SkeletonNode,
  SkeletonShape,
  SensorSpec,
  SensorType,
  CameraPosition,
  CameraMount,
  FovCone,
  FovCoverage,
  EvaluationRequest,
  EvaluationResult,
  JointTorqueResult,
  PayloadLimitResult,
  ActuatorSpec,
  ActuatorType,
  ActuatorRecommendation,
  CoachingSeverity,
  CoachingIssue,
  CoachingResponse,
} from './types.js';
