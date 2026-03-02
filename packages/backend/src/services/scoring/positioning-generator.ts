/**
 * Positioning Data Generator — Pure Function Module
 *
 * Generates 3 types of positioning data for bubble charts:
 * - rfm_competitiveness: RFM 경쟁력 포지셔닝
 * - poc_positioning: PoC 포지셔닝
 * - soc_ecosystem: SoC 에코시스템 포지셔닝
 *
 * All functions are pure: same input always produces same output.
 *
 * Requirements: 3.15, 3.16, 3.17, 3.18, 3.19
 */

import type { RobotWithSpecs, PocScoreValues } from './poc-calculator.js';
import type { RfmScoreValues } from './rfm-calculator.js';

// ============================================
// Interfaces
// ============================================

export interface PositioningValues {
  chartType: 'rfm_competitiveness' | 'poc_positioning' | 'soc_ecosystem';
  label: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup: string | null;
  metadata: Record<string, unknown>;
}

// ============================================
// Constants
// ============================================

const ARCHITECTURE_TYPE_MAP: Record<string, number> = {
  onboard: 1,
  edge: 2,
  cloud: 3,
  hybrid: 4,
};

const REGION_COLOR_MAP: Record<string, string> = {
  north_america: 'blue',
  china: 'orange',
  korea: 'pink',
  europe: 'green',
  japan: 'purple',
  other: 'gray',
};

// ============================================
// Positioning Generators
// ============================================


/**
 * Generate RFM competitiveness positioning data.
 * - xValue = edgeInferenceScore
 * - yValue = generalityScore
 * - bubbleSize = commercialMaturityScore
 * - chartType = 'rfm_competitiveness'
 *
 * Requirement 3.15, 3.18, 3.19
 */
export function generateRfmPositioning(
  rfmScore: RfmScoreValues,
  robotName: string,
  companyName: string
): PositioningValues {
  return {
    chartType: 'rfm_competitiveness',
    label: `${robotName} (${companyName})`,
    xValue: rfmScore.edgeInferenceScore,
    yValue: rfmScore.generalityScore,
    bubbleSize: rfmScore.commercialMaturityScore,
    colorGroup: null,
    metadata: {
      source: 'auto',
      xFormula: 'edgeInferenceScore',
      yFormula: 'generalityScore',
      bubbleSizeFormula: 'commercialMaturityScore',
      sourceScores: {
        edgeInferenceScore: rfmScore.edgeInferenceScore,
        generalityScore: rfmScore.generalityScore,
        commercialMaturityScore: rfmScore.commercialMaturityScore,
      },
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate PoC positioning data.
 * - xValue = formFactorScore
 * - yValue = (payloadScore × operationTimeScore / 10)
 * - bubbleSize = fingerDofScore
 * - chartType = 'poc_positioning'
 *
 * Requirement 3.16, 3.18, 3.19
 */
export function generatePocPositioning(
  pocScore: PocScoreValues,
  robotName: string,
  companyName: string
): PositioningValues {
  return {
    chartType: 'poc_positioning',
    label: `${robotName} (${companyName})`,
    xValue: pocScore.formFactorScore,
    yValue: (pocScore.payloadScore * pocScore.operationTimeScore) / 10,
    bubbleSize: pocScore.fingerDofScore,
    colorGroup: null,
    metadata: {
      source: 'auto',
      xFormula: 'formFactorScore',
      yFormula: 'payloadScore × operationTimeScore / 10',
      bubbleSizeFormula: 'fingerDofScore',
      sourceScores: {
        formFactorScore: pocScore.formFactorScore,
        payloadScore: pocScore.payloadScore,
        operationTimeScore: pocScore.operationTimeScore,
        fingerDofScore: pocScore.fingerDofScore,
      },
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate SoC ecosystem positioning data.
 * - xValue mapped from architectureType: onboard→1, edge→2, cloud→3, hybrid→4 (default 1)
 * - yValue = topsMax (default 0)
 * - bubbleSize = applicationCaseCount (minimum 1)
 * - colorGroup mapped from region: north_america→blue, china→orange, korea→pink,
 *   europe→green, japan→purple, other→gray (default gray)
 * - chartType = 'soc_ecosystem'
 *
 * Requirement 3.17, 3.18, 3.19
 */
export function generateSocPositioning(
  computingSpec: { topsMax: number | null; architectureType: string | null } | null,
  applicationCaseCount: number,
  robotName: string,
  companyName: string,
  region: string | null
): PositioningValues {
  const archType = computingSpec?.architectureType?.toLowerCase() ?? '';
  const xValue = ARCHITECTURE_TYPE_MAP[archType] ?? 1;

  const yValue = computingSpec?.topsMax ?? 0;

  const bubbleSize = Math.max(1, applicationCaseCount);

  const regionKey = region?.toLowerCase() ?? 'other';
  const colorGroup = REGION_COLOR_MAP[regionKey] ?? 'gray';

  return {
    chartType: 'soc_ecosystem',
    label: `${robotName} (${companyName})`,
    xValue,
    yValue,
    bubbleSize,
    colorGroup,
    metadata: {
      source: 'auto',
      xFormula: 'architectureType categorical (onboard=1, edge=2, cloud=3, hybrid=4)',
      yFormula: 'topsMax',
      bubbleSizeFormula: 'applicationCaseCount (min 1)',
      colorGroupFormula: 'region mapping',
      sourceValues: {
        architectureType: computingSpec?.architectureType ?? null,
        topsMax: computingSpec?.topsMax ?? null,
        applicationCaseCount,
        region,
      },
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate all 3 positioning types for a robot.
 * Returns an array of 3 PositioningValues.
 *
 * Requirements: 3.15, 3.16, 3.17, 3.18, 3.19
 */
export function generateAllPositioning(
  pocScore: PocScoreValues,
  rfmScore: RfmScoreValues,
  specs: RobotWithSpecs
): PositioningValues[] {
  const robotName = specs.robot.name;
  const companyName = specs.company.name;

  return [
    generateRfmPositioning(rfmScore, robotName, companyName),
    generatePocPositioning(pocScore, robotName, companyName),
    generateSocPositioning(
      specs.computingSpec,
      specs.applicationCases.length,
      robotName,
      companyName,
      specs.robot.region
    ),
  ];
}