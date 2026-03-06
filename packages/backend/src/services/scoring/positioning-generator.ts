/**
 * Positioning Data Generator — Pure Function Module
 *
 * Generates 3 types of positioning data for bubble charts.
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

const REGION_TO_COUNTRY: Record<string, string> = {
  north_america: 'US',
  china: 'CN',
  korea: 'KR',
  europe: 'EU',
  japan: 'JP',
  other: 'Other',
};

// ============================================
// Positioning Generators
// ============================================

export function generateRfmPositioning(
  rfmScore: RfmScoreValues,
  robotName: string,
  companyName: string,
  region: string | null
): PositioningValues {
  const regionKey = region?.toLowerCase() ?? 'other';
  const colorGroup = REGION_TO_COUNTRY[regionKey] ?? 'Other';
  return {
    chartType: 'rfm_competitiveness',
    label: `${robotName} (${companyName})`,
    xValue: rfmScore.edgeInferenceScore,
    yValue: rfmScore.generalityScore,
    bubbleSize: rfmScore.commercialMaturityScore,
    colorGroup,
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


export function generatePocPositioning(
  pocScore: PocScoreValues,
  robotName: string,
  companyName: string,
  region: string | null
): PositioningValues {
  const regionKey = region?.toLowerCase() ?? 'other';
  const colorGroup = REGION_TO_COUNTRY[regionKey] ?? 'Other';
  return {
    chartType: 'poc_positioning',
    label: `${robotName} (${companyName})`,
    xValue: pocScore.formFactorScore,
    yValue: (pocScore.payloadScore * pocScore.operationTimeScore) / 10,
    bubbleSize: pocScore.fingerDofScore,
    colorGroup,
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

export function generateSocPositioning(
  computingSpec: { mainSoc: string | null; topsMax: number | null; architectureType: string | null } | null,
  applicationCaseCount: number,
  robotName: string,
  companyName: string,
  region: string | null
): PositioningValues {
  const mainSoc = computingSpec?.mainSoc ?? 'Unknown';
  const yValue = computingSpec?.topsMax ?? 0;
  const bubbleSize = Math.max(1, applicationCaseCount);
  const regionKey = region?.toLowerCase() ?? 'other';
  const colorGroup = REGION_TO_COUNTRY[regionKey] ?? 'Other';

  return {
    chartType: 'soc_ecosystem',
    label: `${robotName} (${companyName})`,
    xValue: 0,
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

export function generateAllPositioning(
  pocScore: PocScoreValues,
  rfmScore: RfmScoreValues,
  specs: RobotWithSpecs
): PositioningValues[] {
  const robotName = specs.robot.name;
  const companyName = specs.company.name;

  return [
    generateRfmPositioning(rfmScore, robotName, companyName, specs.robot.region),
    generatePocPositioning(pocScore, robotName, companyName, specs.robot.region),
    generateSocPositioning(
      specs.computingSpec,
      specs.applicationCases.length,
      robotName,
      companyName,
      specs.robot.region
    ),
  ];
}
