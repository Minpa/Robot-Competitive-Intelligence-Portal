/**
 * Client-side scoring calculator for What-If simulation.
 * Mirrors the pure functions from @rcip/shared to ensure identical results
 * between client and server calculations.
 */

export interface WhatIfSpecs {
  payloadKg: number;
  operationTimeHours: number;
  handDof: number;
  heightCm: number;
  dofCount: number;
  fingerCount: number;
  locomotionType: string;
  topsMax: number;
  commercializationStage: string;
  estimatedPriceUsd: number;
}

export interface WhatIfResult {
  pocScores: Record<string, number>;
  rfmScores: Record<string, number>;
  pocTotal: number;
  rfmTotal: number;
  combinedScore: number;
}

function linearScale(value: number, maxValue: number, maxScore: number): number {
  if (maxValue <= 0 || maxScore <= 1) return 1;
  const clamped = Math.max(0, Math.min(value, maxValue));
  const normalized = clamped / maxValue;
  const scaled = 1 + normalized * (maxScore - 1);
  return Math.round(Math.max(1, Math.min(maxScore, scaled)));
}

function calcPayload(kg: number): number {
  return linearScale(kg, 20, 10);
}

function calcOperationTime(hours: number): number {
  return linearScale(hours, 8, 10);
}

function calcFingerDof(dof: number): number {
  return linearScale(dof, 24, 10);
}

function calcFormFactor(heightCm: number, dofCount: number, fingerCount: number, locomotion: string): number {
  const heightSim = Math.max(0, 1 - Math.abs(heightCm - 170) / 170);
  const dofNorm = Math.min(dofCount / 40, 1);
  const fingerNorm = Math.min(fingerCount / 5, 1);
  const bipedal = locomotion.toLowerCase() === 'bipedal' ? 1 : 0;
  const composite = heightSim * 0.3 + dofNorm * 0.3 + fingerNorm * 0.2 + bipedal * 0.2;
  return Math.round(Math.max(1, Math.min(10, 1 + composite * 9)));
}

function calcCostEfficiency(payloadKg: number, opHours: number, priceUsd: number): number {
  if (priceUsd <= 0) return 5;
  const raw = (payloadKg * opHours) / priceUsd;
  const normalized = Math.min(raw / 0.02, 1);
  return Math.round(Math.max(1, Math.min(10, 1 + normalized * 9)));
}

function calcEdgeInference(topsMax: number): number {
  if (topsMax <= 10) return 1;
  if (topsMax <= 50) return 2;
  if (topsMax <= 200) return 3;
  if (topsMax <= 500) return 4;
  return 5;
}

function calcCommercialMaturity(stage: string): number {
  const map: Record<string, number> = { concept: 1, prototype: 2, poc: 3, pilot: 4, commercial: 5 };
  return map[stage.toLowerCase()] ?? 1;
}

/**
 * Recalculate PoC + RFM scores from flat spec parameters.
 * Note: Some RFM factors (generality, realWorldData, multiRobotCollab, openSource)
 * depend on article/keyword data not available in What-If, so they default to 1.
 */
export function recalculateScores(specs: WhatIfSpecs): WhatIfResult {
  const pocScores: Record<string, number> = {
    payloadScore: calcPayload(specs.payloadKg),
    operationTimeScore: calcOperationTime(specs.operationTimeHours),
    fingerDofScore: calcFingerDof(specs.handDof),
    formFactorScore: calcFormFactor(specs.heightCm, specs.dofCount, specs.fingerCount, specs.locomotionType),
    pocDeploymentScore: 5, // deployment status not editable in what-if
    costEfficiencyScore: calcCostEfficiency(specs.payloadKg, specs.operationTimeHours, specs.estimatedPriceUsd),
  };

  const rfmScores: Record<string, number> = {
    generalityScore: 1, // requires article data
    realWorldDataScore: 1, // requires article data
    edgeInferenceScore: calcEdgeInference(specs.topsMax),
    multiRobotCollabScore: 1, // requires article data
    openSourceScore: 1, // requires article data
    commercialMaturityScore: calcCommercialMaturity(specs.commercializationStage),
  };

  const pocTotal = Object.values(pocScores).reduce((a, b) => a + b, 0);
  const rfmTotal = Object.values(rfmScores).reduce((a, b) => a + b, 0);

  return {
    pocScores,
    rfmScores,
    pocTotal,
    rfmTotal,
    combinedScore: pocTotal + rfmTotal,
  };
}
