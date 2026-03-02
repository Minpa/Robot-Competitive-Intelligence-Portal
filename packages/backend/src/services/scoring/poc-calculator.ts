/**
 * PoC 6-Factor Scoring Calculator — Pure Function Module
 *
 * Calculates PoC scores from robot spec data without any DB dependencies.
 * All functions are pure: same input always produces same output.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

// ============================================
// Interfaces
// ============================================

export interface RobotWithSpecs {
  robot: {
    id: string;
    name: string;
    locomotionType: string | null;
    commercializationStage: string | null;
    region: string | null;
  };
  company: { name: string };
  bodySpec: {
    heightCm: number | null;
    weightKg: number | null;
    payloadKg: number | null;
    dofCount: number | null;
    maxSpeedMps: number | null;
    operationTimeHours: number | null;
  } | null;
  handSpec: {
    handDof: number | null;
    fingerCount: number | null;
    gripForceN: number | null;
  } | null;
  computingSpec: {
    mainSoc: string | null;
    topsMin: number | null;
    topsMax: number | null;
    architectureType: string | null;
  } | null;
  applicationCases: {
    environmentType: string | null;
    taskType: string | null;
    deploymentStatus: string | null;
  }[];
  articleCount: number;
  articleKeywords: string[];
  estimatedPriceUsd: number | null;
}

export interface PocScoreValues {
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
  metadata: {
    source: 'auto' | 'manual';
    estimatedFields: string[];
    calculatedAt: string;
  };
}

export interface ScoreResult {
  score: number;
  estimated: boolean;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Maps a value from [0, maxValue] → [1, maxScore] using linear interpolation.
 * Result is rounded to nearest integer and clamped to [1, maxScore].
 *
 * - v = 0 → 1
 * - v >= maxValue → maxScore
 */
export function linearScale(value: number, maxValue: number, maxScore: number): number {
  if (maxValue <= 0 || maxScore <= 1) return 1;

  const clamped = Math.max(0, Math.min(value, maxValue));
  const normalized = clamped / maxValue; // 0..1
  const scaled = 1 + normalized * (maxScore - 1); // 1..maxScore
  return Math.round(Math.max(1, Math.min(maxScore, scaled)));
}

// ============================================
// Factor Calculators
// ============================================

/**
 * Calculate payload score: payloadKg 0→1, 20+→10 linear scale.
 * null → score=1, estimated=true
 *
 * Requirement 1.1
 */
export function calculatePayloadScore(payloadKg: number | null): ScoreResult {
  if (payloadKg === null || payloadKg === undefined) {
    return { score: 1, estimated: true };
  }
  return { score: linearScale(payloadKg, 20, 10), estimated: false };
}

/**
 * Calculate operation time score: hours 0→1, 8+→10 linear scale.
 * null → score=1, estimated=true
 *
 * Requirement 1.2
 */
export function calculateOperationTimeScore(hours: number | null): ScoreResult {
  if (hours === null || hours === undefined) {
    return { score: 1, estimated: true };
  }
  return { score: linearScale(hours, 8, 10), estimated: false };
}

/**
 * Calculate finger DoF score: handDof 0→1, 24+→10 linear scale.
 * null → score=1, estimated=true
 *
 * Requirement 1.3
 */
export function calculateFingerDofScore(handDof: number | null): ScoreResult {
  if (handDof === null || handDof === undefined) {
    return { score: 1, estimated: true };
  }
  return { score: linearScale(handDof, 24, 10), estimated: false };
}

/**
 * Calculate form factor score as a weighted composite:
 *   (heightCm similarity to 170cm × 0.3) +
 *   (dofCount normalized to 40 max × 0.3) +
 *   (fingerCount normalized to 5 max × 0.2) +
 *   (bipedal locomotion bonus × 0.2)
 * Scaled to 1–10.
 *
 * null components treated as 0, estimated=true if any null.
 *
 * Requirement 1.4, 1.7
 */
export function calculateFormFactorScore(
  heightCm: number | null,
  dofCount: number | null,
  fingerCount: number | null,
  locomotionType: string | null
): ScoreResult {
  const hasNull =
    heightCm === null || dofCount === null || fingerCount === null || locomotionType === null;

  // Height similarity to 170cm: 1.0 when exactly 170, decreasing with distance
  const h = heightCm ?? 0;
  const heightSimilarity = Math.max(0, 1 - Math.abs(h - 170) / 170);

  // DoF normalized to 40 max
  const d = dofCount ?? 0;
  const dofNormalized = Math.min(d / 40, 1);

  // Finger count normalized to 5 max
  const f = fingerCount ?? 0;
  const fingerNormalized = Math.min(f / 5, 1);

  // Bipedal locomotion bonus: 1.0 if bipedal, 0 otherwise
  const bipedalBonus = locomotionType?.toLowerCase() === 'bipedal' ? 1 : 0;

  // Weighted composite (0..1)
  const composite =
    heightSimilarity * 0.3 + dofNormalized * 0.3 + fingerNormalized * 0.2 + bipedalBonus * 0.2;

  // Scale to 1–10
  const score = Math.round(Math.max(1, Math.min(10, 1 + composite * 9)));

  return { score, estimated: hasNull };
}

/**
 * Calculate PoC deployment score from application cases.
 * concept=1pt, pilot=3pt, production=5pt per case.
 * Sum capped at 10, minimum 1.
 * Empty list → score=1, estimated=true.
 *
 * Requirement 1.5, 1.7
 */
export function calculatePocDeploymentScore(
  cases: { deploymentStatus: string | null }[]
): ScoreResult {
  if (!cases || cases.length === 0) {
    return { score: 1, estimated: true };
  }

  const statusPoints: Record<string, number> = {
    concept: 1,
    pilot: 3,
    production: 5,
  };

  let sum = 0;
  for (const c of cases) {
    const status = c.deploymentStatus?.toLowerCase() ?? '';
    sum += statusPoints[status] ?? 0;
  }

  const score = Math.max(1, Math.min(10, sum));
  return { score, estimated: false };
}

/**
 * Calculate cost efficiency score.
 * If price null → score=5, estimated=true.
 * Otherwise: (payloadKg × operationTimeHours) / estimatedPriceUsd normalized to 1–10.
 *
 * Requirement 1.6, 1.7
 */
export function calculateCostEfficiencyScore(
  payloadKg: number | null,
  operationTimeHours: number | null,
  estimatedPriceUsd: number | null
): ScoreResult {
  if (estimatedPriceUsd === null || estimatedPriceUsd === undefined || estimatedPriceUsd <= 0) {
    return { score: 5, estimated: true };
  }

  const payload = payloadKg ?? 0;
  const opTime = operationTimeHours ?? 0;

  // Raw efficiency ratio
  const rawEfficiency = (payload * opTime) / estimatedPriceUsd;

  // Normalize: we use a reference max of 0.02 (20kg × 8h / 8000 USD)
  // to map the ratio to [0, 1], then scale to [1, 10]
  const maxEfficiency = 0.02;
  const normalized = Math.min(rawEfficiency / maxEfficiency, 1);
  const score = Math.round(Math.max(1, Math.min(10, 1 + normalized * 9)));

  return { score, estimated: payload === 0 || opTime === 0 };
}

// ============================================
// Main Calculator
// ============================================

/**
 * Calculate all 6 PoC factor scores from robot specs.
 * Returns PocScoreValues with metadata (source='auto', estimatedFields, calculatedAt).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export function calculatePocScores(specs: RobotWithSpecs): PocScoreValues {
  const payload = calculatePayloadScore(specs.bodySpec?.payloadKg ?? null);
  const operationTime = calculateOperationTimeScore(specs.bodySpec?.operationTimeHours ?? null);
  const fingerDof = calculateFingerDofScore(specs.handSpec?.handDof ?? null);
  const formFactor = calculateFormFactorScore(
    specs.bodySpec?.heightCm ?? null,
    specs.bodySpec?.dofCount ?? null,
    specs.handSpec?.fingerCount ?? null,
    specs.robot.locomotionType
  );
  const pocDeployment = calculatePocDeploymentScore(specs.applicationCases);
  const costEfficiency = calculateCostEfficiencyScore(
    specs.bodySpec?.payloadKg ?? null,
    specs.bodySpec?.operationTimeHours ?? null,
    specs.estimatedPriceUsd
  );

  const estimatedFields: string[] = [];
  if (payload.estimated) estimatedFields.push('payloadScore');
  if (operationTime.estimated) estimatedFields.push('operationTimeScore');
  if (fingerDof.estimated) estimatedFields.push('fingerDofScore');
  if (formFactor.estimated) estimatedFields.push('formFactorScore');
  if (pocDeployment.estimated) estimatedFields.push('pocDeploymentScore');
  if (costEfficiency.estimated) estimatedFields.push('costEfficiencyScore');

  return {
    payloadScore: payload.score,
    operationTimeScore: operationTime.score,
    fingerDofScore: fingerDof.score,
    formFactorScore: formFactor.score,
    pocDeploymentScore: pocDeployment.score,
    costEfficiencyScore: costEfficiency.score,
    metadata: {
      source: 'auto',
      estimatedFields,
      calculatedAt: new Date().toISOString(),
    },
  };
}
