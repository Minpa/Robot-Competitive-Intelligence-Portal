/**
 * ARGOS-Designer · frontend types
 *
 * Mirrors the backend contract in `packages/backend/src/services/designer/types.ts`.
 * Kept in sync manually for Phase 1; in Phase 2 we'll move this into the
 * shared package and codegen from a single source.
 */

export type FormFactorId =
  | 'biped'
  | 'quadruped'
  | 'wheeled'
  | 'cobot_arm'
  | 'mobile_manipulator';

export type SkeletonShape = 'box' | 'cylinder' | 'sphere';

export interface SkeletonNode {
  id: string;
  shape: SkeletonShape;
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  label?: string;
}

export interface FormFactorSummary {
  id: FormFactorId;
  name: string;
  nameKo: string;
  description: string;
  heightM: number;
  totalDof: number;
  defaultPayloadKg: number;
  isMock: true;
  skeleton: SkeletonNode[];
}

export interface FormFactorListResponse {
  formFactors: FormFactorSummary[];
  isMock: true;
  generatedAt: string;
}

// REQ-2: sensors + FoV
export type CameraPosition = 'head' | 'chest' | 'arm_left' | 'arm_right';
export type SensorType = 'RGB-D' | 'LiDAR' | 'ToF' | 'Stereo' | 'RGB';

export interface SensorSpec {
  sku: string;
  vendor: string;
  type: SensorType;
  fovHorizontalDeg: number;
  fovVerticalDeg: number;
  rangeMinM: number;
  rangeMaxM: number;
  resolutionPx: string;
  weightG: number;
  priceUsdEstimated: number;
  isMock: true;
}

export interface CameraMount {
  position: CameraPosition;
  sensorSku: string;
}

export interface FovCone {
  position: CameraPosition;
  origin: [number, number, number];
  direction: [number, number, number];
  halfAngleHorizontalRad: number;
  halfAngleVerticalRad: number;
  rangeMinM: number;
  rangeMaxM: number;
  sensorSku: string;
}

export interface FovCoverage {
  cones: FovCone[];
  horizontalCoverageRatio: number;
  blindSpotAreaM2: number;
}

// REQ-3 / REQ-4: evaluation
export interface EvaluationRequest {
  formFactorId: FormFactorId;
  linkLengthScale?: Record<string, number>;
  payloadKg?: number;
  cameras?: CameraMount[];
}

export interface JointTorqueResult {
  jointId: string;
  requiredPeakTorqueNm: number;
  leverArmM: number;
  segment: 'arm' | 'leg' | 'spine' | 'arm_base' | 'wheel' | 'other';
}

export interface PayloadLimitResult {
  payloadLimitKg: number;
  limitingJointId: string;
  limitingTorqueNm: number;
  safetyFactor: number;
}

export interface EvaluationResult {
  formFactorId: FormFactorId;
  totalDof: number;
  payloadKg: number;
  jointTorques: JointTorqueResult[];
  payloadLimit: PayloadLimitResult;
  fovCoverage: FovCoverage | null;
  warnings: string[];
  isMock: true;
}

// REQ-5: actuators
export type ActuatorType = 'QDD' | 'BLDC' | 'BLDC+Gearbox' | 'Harmonic' | 'Servo';

export interface ActuatorSpec {
  sku: string;
  vendor: string;
  modelName: string;
  type: ActuatorType;
  peakTorqueNm: number;
  continuousTorqueNm: number;
  maxSpeedRpm: number;
  weightG: number;
  diameterMm: number;
  priceUsdEstimated: number;
  backdrivable: boolean;
  isMock: true;
}

export interface ActuatorRecommendation {
  jointId: string;
  requiredPeakTorqueNm: number;
  candidates: Array<{
    actuator: ActuatorSpec;
    headroomRatio: number;
  }>;
}

// REQ-6: coaching
export type CoachingSeverity = 'high' | 'medium' | 'low';

export interface CoachingIssue {
  severity: CoachingSeverity;
  title: string;
  explanation: string;
  recommendations: string[];
  relatedId?: string;
}

export interface CoachingResponse {
  summary: string;
  issues: CoachingIssue[];
  modelUsed: string;
  isFallback: boolean;
  isMock: true;
}
