/**
 * Competitive Alert Step — 경쟁 알림 감지
 *
 * 이전 월 score_history와 비교하여 score_spike, mass_production 감지.
 * 기사 키워드에서 funding, partnership 키워드 매칭.
 * Requirements: 17.105, 17.107
 */

import type { PocScoreValues } from './poc-calculator.js';
import type { RfmScoreValues } from './rfm-calculator.js';
import { warRoomScoreHistoryService } from '../war-room-score-history.service.js';
import { warRoomAlertService } from '../war-room-alert.service.js';

/**
 * Get the previous month string in YYYY-MM format.
 */
function getPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Merge PoC and RFM scores into a single Record<string, number>.
 */
function mergeScores(
  pocScores: PocScoreValues,
  rfmScores: RfmScoreValues
): Record<string, number> {
  return {
    payloadScore: pocScores.payloadScore,
    operationTimeScore: pocScores.operationTimeScore,
    fingerDofScore: pocScores.fingerDofScore,
    formFactorScore: pocScores.formFactorScore,
    pocDeploymentScore: pocScores.pocDeploymentScore,
    costEfficiencyScore: pocScores.costEfficiencyScore,
    generalityScore: rfmScores.generalityScore,
    realWorldDataScore: rfmScores.realWorldDataScore,
    edgeInferenceScore: rfmScores.edgeInferenceScore,
    multiRobotCollabScore: rfmScores.multiRobotCollabScore,
    openSourceScore: rfmScores.openSourceScore,
    commercialMaturityScore: rfmScores.commercialMaturityScore,
  };
}

/**
 * Execute the Competitive Alert pipeline step.
 * Compares current scores against previous month and generates alerts.
 */
export async function executeCompetitiveAlertStep(
  robotId: string,
  pocScores: PocScoreValues,
  rfmScores: RfmScoreValues,
  articleKeywords: string[]
): Promise<void> {
  const previousMonth = getPreviousMonth();

  // Get previous month's score_history for this robot
  const previousEntries = await warRoomScoreHistoryService.getTimeSeries([robotId], 2);
  const previousEntry = previousEntries.find((e) => e.snapshotMonth === previousMonth);

  if (previousEntry) {
    // Merge current scores into a flat record
    const currentScores = mergeScores(pocScores, rfmScores);

    // Merge previous scores into a flat record
    const previousScores: Record<string, number> = {
      ...previousEntry.pocScores,
      ...previousEntry.rfmScores,
    };

    // Detect score spikes (20%+ change)
    await warRoomAlertService.detectScoreSpike(robotId, currentScores, previousScores);

    // Detect mass production (pocDeploymentScore increase of 2+ points)
    const currentDeployment = pocScores.pocDeploymentScore;
    const previousDeployment = previousEntry.pocScores?.pocDeploymentScore ?? 0;
    await warRoomAlertService.detectMassProduction(robotId, currentDeployment, previousDeployment);
  }

  // Check article keywords for funding/partnership alerts
  if (articleKeywords.length > 0) {
    await warRoomAlertService.detectKeywordAlerts(robotId, articleKeywords);
  }
}
