/**
 * Re-export from @rcip/shared for backward compatibility.
 * The actual implementation has been moved to packages/shared/src/scoring/rfm-calculator.ts
 */
export {
  type RfmScoreValues,
  keywordTierMapping,
  calculateGeneralityScore,
  calculateRealWorldDataScore,
  calculateEdgeInferenceScore,
  calculateMultiRobotCollabScore,
  calculateOpenSourceScore,
  calculateCommercialMaturityScore,
  calculateRfmScores,
} from '@rcip/shared';
