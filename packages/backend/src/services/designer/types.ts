/**
 * ARGOS-Designer · internal types (microservice boundary)
 *
 * These types are the contract for the designer service. They MUST NOT leak
 * into other backend modules — cross-module consumers should call the public
 * exports in `./index.ts` (REST endpoints under /api/designer).
 *
 * Phase 1 PoC: see docs/designer/SPEC.md §4 (data model) + §7 (mock data).
 */

export type FormFactorId =
  | 'biped'
  | 'quadruped'
  | 'wheeled'
  | 'cobot_arm'
  | 'mobile_manipulator';

export type SkeletonShape = 'box' | 'cylinder' | 'sphere';

/**
 * Minimal 3D primitive used by the viewport to render the skeleton.
 * Phase 1 keeps this intentionally simple (no meshes, no URDF).
 */
export interface SkeletonNode {
  id: string;
  shape: SkeletonShape;
  /** Dimensions in meters. For cylinder: [radius, height, _]. For sphere: [radius, _, _]. */
  size: [number, number, number];
  /** Center position in meters relative to the robot root. */
  position: [number, number, number];
  /** Euler XYZ rotation in radians. */
  rotation?: [number, number, number];
  /** Optional accent color override (defaults to theme accent). */
  color?: string;
  /** Optional label shown on hover (REQ-3 onwards). */
  label?: string;
}

export interface FormFactorSummary {
  id: FormFactorId;
  /** Human label in English. */
  name: string;
  /** Korean label shown in UI. */
  nameKo: string;
  /** One-sentence description (Korean). */
  description: string;
  /** Reference total height in meters (no implied accuracy). */
  heightM: number;
  /** Total degrees of freedom — joints with type=revolute|prismatic. */
  totalDof: number;
  /** Suggested target payload (REQ-4 default). */
  defaultPayloadKg: number;
  /** Phase 1 safety guardrail (spec §10): every record MUST have this true. */
  isMock: true;
  /** Skeleton primitives for the 3D viewport. */
  skeleton: SkeletonNode[];
}

export interface FormFactorListResponse {
  formFactors: FormFactorSummary[];
  isMock: true;
  generatedAt: string;
}

// ─── REQ-2: sensors + cameras + FoV ───────────────────────────────────────

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

/** FoV cone derived from a camera mount. Used by the viewport overlay. */
export interface FovCone {
  position: CameraPosition;
  /** Mount point in world coordinates (m). */
  origin: [number, number, number];
  /** Forward direction (unit vector). */
  direction: [number, number, number];
  /** Half-angle of the horizontal/vertical cone in radians. */
  halfAngleHorizontalRad: number;
  halfAngleVerticalRad: number;
  rangeMinM: number;
  rangeMaxM: number;
  sensorSku: string;
}

export interface FovCoverage {
  cones: FovCone[];
  /** Estimated horizontal coverage at 1m radius (0-1). */
  horizontalCoverageRatio: number;
  /** Estimated blind-spot ground area in m² within 1m of robot base. */
  blindSpotAreaM2: number;
}

// ─── REQ-3 / REQ-4: evaluation ────────────────────────────────────────────

export interface EvaluationRequest {
  formFactorId: FormFactorId;
  /** Optional length scale per link id (multiplier). */
  linkLengthScale?: Record<string, number>;
  /** Target payload at end-effector (kg). */
  payloadKg?: number;
  /** Camera mounts (REQ-2). */
  cameras?: CameraMount[];
}

export interface JointTorqueResult {
  jointId: string;
  /** Required peak torque under worst-case static pose (Nm). */
  requiredPeakTorqueNm: number;
  /** Lever arm in m used for the calculation. */
  leverArmM: number;
  /** Distance category (hint for UI grouping). */
  segment: 'arm' | 'leg' | 'spine' | 'arm_base' | 'wheel' | 'other';
}

export interface PayloadLimitResult {
  /** Max payload (kg) before any joint exceeds its target headroom. */
  payloadLimitKg: number;
  /** Joint that hit limit first. */
  limitingJointId: string;
  /** The torque required at that limit (Nm). */
  limitingTorqueNm: number;
  /** Safety factor used for headroom check (default 1.3). */
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

// ─── REQ-5: actuator matching ─────────────────────────────────────────────

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
    /** peak / required ratio. */
    headroomRatio: number;
  }>;
}

// ─── REQ-6: coaching ──────────────────────────────────────────────────────

export type CoachingSeverity = 'high' | 'medium' | 'low';

export interface CoachingIssue {
  severity: CoachingSeverity;
  title: string;
  explanation: string;
  recommendations: string[];
  /** Joint or component this issue references (for click-to-focus in UI). */
  relatedId?: string;
}

export interface CoachingResponse {
  summary: string;
  issues: CoachingIssue[];
  modelUsed: string;
  /** True if the rule-based fallback produced this response. */
  isFallback: boolean;
  isMock: true;
}
