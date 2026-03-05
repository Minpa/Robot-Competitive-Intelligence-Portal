/**
 * Re-export from @rcip/shared for backward compatibility.
 * The actual implementation has been moved to packages/shared/src/scoring/poc-calculator.ts
 */
export {
  type RobotWithSpecs,
  type PocScoreValues,
  type ScoreResult,
  linearScale,
  calculatePayloadScore,
  calculateOperationTimeScore,
  calculateFingerDofScore,
  calculateFormFactorScore,
  calculatePocDeploymentScore,
  calculateCostEfficiencyScore,
  calculatePocScores,
} from '@rcip/shared';
