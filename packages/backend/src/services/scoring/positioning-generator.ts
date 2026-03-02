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

// SoC X축: mainSoc 칩명을 그대로 사용 (카테고리형)
// xValue는 고유 인덱스로 매핑, 프론트엔드에서 라벨 표시

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
 * - xValue = mainSoc 칩명 기반 카테고리 인덱스 (프론트엔드에서 라벨 매핑)
 * - yValue = topsMax (default 0)
 * - bubbleSize = applicationCaseCount (minimum 1)
 * - colorGroup mapped from region
 * - chartType = 'soc_ecosystem'
 *
 * Requirement 3.17, 3.18, 3.19
 */
export function generateSocPositioning(
  computingSpec: { mainSoc: string | null; topsMax: number | null; architectureType: string | null } | null,
  applicationCaseCount: number,
  robotName: string,
  companyName: string,
  region: string | null
): PositioningValues {
  // mainSoc 칩명을 그대로 label로 사용, xValue는 0 (프론트엔드에서 카테고리 인덱스 재매핑)
  const mainSoc = computingSpec?.mainSoc ?? 'Unknown';

  const yValue = computingSpec?.topsMax ?? 0;
  const bubbleSize = Math.max(1, applicationCaseCount);

  const regionKey = region?.toLowerCase() ?? 'other';
  const colorGroup = REGION_COLOR_MAP[regionKey] ?? 'gray';

  return {
    chartType: 'soc_ecosystem',
    label: `${robotName} (${companyName})`,
    xValue: 0, // 프론트엔드에서 mainSoc 기반으로 재매핑
    yValue,
    bubbleSize,
    colorGroup,
    metadata: {
      source: 'auto',
      mainSoc,
      xFormula: 'mainSoc chip name (categorical)',
      yFormula: 'topsMax',
      bubbleSizeFormula: 'applicationCaseCount (min 1)',
      colorGroupFormula: 'region mapping',
      sourceValues: {
        mainSoc,
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