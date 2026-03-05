/**
 * Score History Step — 월별 스코어 스냅샷 upsert
 *
 * 파이프라인 실행 시 현재 월(YYYY-MM) 기준으로 score_history 레코드를 upsert한다.
 * Requirements: 17.105, 17.106
 */

import type { PocScoreValues } from './poc-calculator.js';
import type { RfmScoreValues } from './rfm-calculator.js';
import { warRoomScoreHistoryService } from '../war-room-score-history.service.js';

/**
 * Convert PocScoreValues to a plain Record<string, number> for storage.
 */
function pocScoresToRecord(pocScores: PocScoreValues): Record<string, number> {
  return {
    payloadScore: pocScores.payloadScore,
    operationTimeScore: pocScores.operationTimeScore,
    fingerDofScore: pocScores.fingerDofScore,
    formFactorScore: pocScores.formFactorScore,
    pocDeploymentScore: pocScores.pocDeploymentScore,
    costEfficiencyScore: pocScores.costEfficiencyScore,
  };
}

/**
 * Convert RfmScoreValues to a plain Record<string, number> for storage.
 */
function rfmScoresToRecord(rfmScores: RfmScoreValues): Record<string, number> {
  return {
    generalityScore: rfmScores.generalityScore,
    realWorldDataScore: rfmScores.realWorldDataScore,
    edgeInferenceScore: rfmScores.edgeInferenceScore,
    multiRobotCollabScore: rfmScores.multiRobotCollabScore,
    openSourceScore: rfmScores.openSourceScore,
    commercialMaturityScore: rfmScores.commercialMaturityScore,
  };
}

/**
 * Execute the Score History pipeline step.
 * Upserts the current month's score_history snapshot for the given robot.
 */
export async function executeScoreHistoryStep(
  robotId: string,
  pocScores: PocScoreValues,
  rfmScores: RfmScoreValues
): Promise<void> {
  const pocRecord = pocScoresToRecord(pocScores);
  const rfmRecord = rfmScoresToRecord(rfmScores);
  await warRoomScoreHistoryService.createSnapshot(robotId, pocRecord, rfmRecord);
}
