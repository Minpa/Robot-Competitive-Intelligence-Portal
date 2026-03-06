/**
 * RFM 6-Factor Scoring Calculator — Pure Function Module
 *
 * Calculates RFM scores from robot spec data without any DB dependencies.
 * All functions are pure: same input always produces same output.
 *
 * Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14
 */

import type { RobotWithSpecs, ScoreResult } from './poc-calculator.js';

// ============================================
// Interfaces
// ============================================

export interface RfmScoreValues {
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
  rfmModelName: string;
  metadata: {
    source: 'auto' | 'manual';
    estimatedFields: string[];
    calculatedAt: string;
  };
}

// ============================================
// Keyword Sets
// ============================================

const REAL_WORLD_KEYWORDS = [
  'real-world', 'real world', '실제 환경', 'field test', 'field-test',
  '현장', 'deployment', '배포', 'demo', '시연',
];

const MULTI_ROBOT_KEYWORDS = [
  'multi-robot', 'multi robot', '다중 로봇', 'fleet', 'swarm',
  '협업', 'collaboration', 'multi-agent', 'multi agent',
];

const OPEN_SOURCE_KEYWORDS = [
  'open-source', 'open source', '오픈소스', 'sdk', 'api',
  'github', 'community', '커뮤니티', 'ros', 'framework',
];


// ============================================
// Utility Functions
// ============================================

export function keywordTierMapping(count: number): number {
  if (count <= 0) return 1;
  if (count <= 2) return 2;
  if (count <= 5) return 3;
  if (count <= 10) return 4;
  return 5;
}

function countKeywordMatches(keywords: string[], referenceTerms: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    for (const term of referenceTerms) {
      if (lower.includes(term.toLowerCase())) {
        count++;
        break;
      }
    }
  }
  return count;
}

// ============================================
// Factor Calculators
// ============================================

export function calculateGeneralityScore(
  cases: { taskType: string | null }[]
): ScoreResult {
  if (!cases || cases.length === 0) {
    return { score: 1, estimated: true };
  }

  const distinctTypes = new Set(
    cases
      .map((c) => c.taskType)
      .filter((t): t is string => t !== null && t !== undefined && t.trim() !== '')
  );

  const count = distinctTypes.size;
  if (count === 0) {
    return { score: 1, estimated: true };
  }

  return { score: Math.min(count, 5), estimated: false };
}

export function calculateRealWorldDataScore(
  articleCount: number,
  keywords: string[]
): ScoreResult {
  if (articleCount === 0) {
    return { score: 1, estimated: true };
  }
  const matchCount = countKeywordMatches(keywords, REAL_WORLD_KEYWORDS);
  return { score: keywordTierMapping(matchCount), estimated: false };
}

export function calculateEdgeInferenceScore(topsMax: number | null): ScoreResult {
  if (topsMax === null || topsMax === undefined) {
    return { score: 1, estimated: true };
  }
  if (topsMax <= 10) return { score: 1, estimated: false };
  if (topsMax <= 50) return { score: 2, estimated: false };
  if (topsMax <= 200) return { score: 3, estimated: false };
  if (topsMax <= 500) return { score: 4, estimated: false };
  return { score: 5, estimated: false };
}

export function calculateMultiRobotCollabScore(keywords: string[]): ScoreResult {
  const matchCount = countKeywordMatches(keywords, MULTI_ROBOT_KEYWORDS);
  return { score: keywordTierMapping(matchCount), estimated: false };
}

export function calculateOpenSourceScore(keywords: string[]): ScoreResult {
  const matchCount = countKeywordMatches(keywords, OPEN_SOURCE_KEYWORDS);
  let score: number;
  if (matchCount === 0) score = 1;
  else if (matchCount === 1) score = 2;
  else if (matchCount === 2) score = 3;
  else if (matchCount === 3) score = 4;
  else score = 5;
  return { score, estimated: false };
}

export function calculateCommercialMaturityScore(stage: string | null): ScoreResult {
  if (stage === null || stage === undefined) {
    return { score: 1, estimated: true };
  }
  const stageMap: Record<string, number> = {
    concept: 1, prototype: 2, poc: 3, pilot: 4, commercial: 5,
  };
  const score = stageMap[stage.toLowerCase()];
  if (score === undefined) {
    return { score: 1, estimated: true };
  }
  return { score, estimated: false };
}

// ============================================
// Main Calculator
// ============================================

export function calculateRfmScores(specs: RobotWithSpecs): RfmScoreValues {
  const generality = calculateGeneralityScore(specs.applicationCases);
  const realWorldData = calculateRealWorldDataScore(specs.articleCount, specs.articleKeywords);
  const edgeInference = calculateEdgeInferenceScore(specs.computingSpec?.topsMax ?? null);
  const multiRobotCollab = calculateMultiRobotCollabScore(specs.articleKeywords);
  const openSource = calculateOpenSourceScore(specs.articleKeywords);
  const commercialMaturity = calculateCommercialMaturityScore(specs.robot.commercializationStage);

  const estimatedFields: string[] = [];
  if (generality.estimated) estimatedFields.push('generalityScore');
  if (realWorldData.estimated) estimatedFields.push('realWorldDataScore');
  if (edgeInference.estimated) estimatedFields.push('edgeInferenceScore');
  if (multiRobotCollab.estimated) estimatedFields.push('multiRobotCollabScore');
  if (openSource.estimated) estimatedFields.push('openSourceScore');
  if (commercialMaturity.estimated) estimatedFields.push('commercialMaturityScore');

  return {
    generalityScore: generality.score,
    realWorldDataScore: realWorldData.score,
    edgeInferenceScore: edgeInference.score,
    multiRobotCollabScore: multiRobotCollab.score,
    openSourceScore: openSource.score,
    commercialMaturityScore: commercialMaturity.score,
    rfmModelName: `${specs.robot.name} Auto-RFM`,
    metadata: {
      source: 'auto',
      estimatedFields,
      calculatedAt: new Date().toISOString(),
    },
  };
}
