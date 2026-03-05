/**
 * ScoringPipelineService — Orchestration Service
 *
 * Ties together pure function scoring modules and handles DB operations.
 * Manages the full pipeline lifecycle: fetch specs → calculate scores → upsert results.
 *
 * Requirements: 4.20, 4.21, 4.22, 4.23, 4.24, 4.25, 4.26, 8.43, 8.44, 8.45, 9.47, 9.48, 9.49
 */

import {
  db,
  humanoidRobots,
  companies,
  bodySpecs,
  handSpecs,
  computingSpecs,
  applicationCases,
  pocScores,
  rfmScores,
  positioningData,
  articles,
  articleRobotTags,
  pipelineRuns,
} from '../db/index.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { calculatePocScores, type RobotWithSpecs, type PocScoreValues } from './scoring/poc-calculator.js';
import { calculateRfmScores, type RfmScoreValues } from './scoring/rfm-calculator.js';
import { generateAllPositioning, type PositioningValues } from './scoring/positioning-generator.js';
import { pipelineLogger } from './pipeline-logger.service.js';
import { executeScoreHistoryStep } from './scoring/score-history-step.js';
import { executeCompetitiveAlertStep } from './scoring/competitive-alert-step.js';
import { executeDomainFitStep } from './scoring/domain-fit-step.js';
import { executeStrategicGoalStep } from './scoring/strategic-goal-step.js';
import { executePartnerMatchStep } from './scoring/partner-match-step.js';

// ============================================
// Interfaces
// ============================================

export interface ScoringResult {
  robotId: string;
  pocScore: PocScoreValues;
  rfmScore: RfmScoreValues;
  positioning: PositioningValues[];
  estimatedFields: string[];
}

export interface PipelineExecutionResult {
  runId: string;
  status: 'success' | 'partial_failure' | 'failure';
  totalRobots: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  errors: { robotId: string; step: string; message: string }[];
}

// ============================================
// Score Range Validation
// ============================================

function validatePocScoreRange(score: PocScoreValues): boolean {
  const fields = [
    score.payloadScore,
    score.operationTimeScore,
    score.fingerDofScore,
    score.formFactorScore,
    score.pocDeploymentScore,
    score.costEfficiencyScore,
  ];
  return fields.every((v) => Number.isInteger(v) && v >= 1 && v <= 10);
}

function validateRfmScoreRange(score: RfmScoreValues): boolean {
  const fields = [
    score.generalityScore,
    score.realWorldDataScore,
    score.edgeInferenceScore,
    score.multiRobotCollabScore,
    score.openSourceScore,
    score.commercialMaturityScore,
  ];
  return fields.every((v) => Number.isInteger(v) && v >= 1 && v <= 5);
}

// ============================================
// Concurrency Guard
// ============================================

let isRunning = false;

// ============================================
// ScoringPipelineService
// ============================================

class ScoringPipelineService {
  /**
   * Fetch robot with all related specs for scoring.
   */
  async fetchRobotWithSpecs(robotId: string): Promise<RobotWithSpecs> {
    // Query robot + company (inner join)
    const [robotRow] = await db
      .select({
        robot: humanoidRobots,
        company: companies,
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(humanoidRobots.id, robotId))
      .limit(1);

    if (!robotRow) {
      throw new Error(`Robot not found: ${robotId}`);
    }

    // Left join bodySpecs
    const [bodySpecRow] = await db
      .select()
      .from(bodySpecs)
      .where(eq(bodySpecs.robotId, robotId))
      .limit(1);

    // Left join handSpecs
    const [handSpecRow] = await db
      .select()
      .from(handSpecs)
      .where(eq(handSpecs.robotId, robotId))
      .limit(1);

    // Left join computingSpecs
    const [computingSpecRow] = await db
      .select()
      .from(computingSpecs)
      .where(eq(computingSpecs.robotId, robotId))
      .limit(1);

    // Query applicationCases
    const cases = await db
      .select()
      .from(applicationCases)
      .where(eq(applicationCases.robotId, robotId));

    // Count articles linked via articleRobotTags
    const [articleCountResult] = await db
      .select({ count: count() })
      .from(articleRobotTags)
      .where(eq(articleRobotTags.robotId, robotId));
    const articleCount = articleCountResult?.count ?? 0;

    // Get keywords from articles' extractedMetadata
    const linkedArticles = await db
      .select({ extractedMetadata: articles.extractedMetadata })
      .from(articles)
      .innerJoin(articleRobotTags, eq(articles.id, articleRobotTags.articleId))
      .where(eq(articleRobotTags.robotId, robotId));

    const articleKeywords: string[] = [];
    for (const art of linkedArticles) {
      const meta = art.extractedMetadata as Record<string, unknown> | null;
      if (meta) {
        // Collect keywords from technologies, keyPoints, marketInsights
        for (const key of ['technologies', 'keyPoints', 'marketInsights', 'mentionedCompanies', 'mentionedRobots']) {
          const arr = meta[key];
          if (Array.isArray(arr)) {
            articleKeywords.push(...arr.filter((v): v is string => typeof v === 'string'));
          }
        }
      }
    }

    return {
      robot: {
        id: robotRow.robot.id,
        name: robotRow.robot.name,
        locomotionType: robotRow.robot.locomotionType,
        commercializationStage: robotRow.robot.commercializationStage,
        region: robotRow.robot.region,
      },
      company: { name: robotRow.company.name },
      bodySpec: bodySpecRow
        ? {
            heightCm: bodySpecRow.heightCm ? Number(bodySpecRow.heightCm) : null,
            weightKg: bodySpecRow.weightKg ? Number(bodySpecRow.weightKg) : null,
            payloadKg: bodySpecRow.payloadKg ? Number(bodySpecRow.payloadKg) : null,
            dofCount: bodySpecRow.dofCount,
            maxSpeedMps: bodySpecRow.maxSpeedMps ? Number(bodySpecRow.maxSpeedMps) : null,
            operationTimeHours: bodySpecRow.operationTimeHours ? Number(bodySpecRow.operationTimeHours) : null,
          }
        : null,
      handSpec: handSpecRow
        ? {
            handDof: handSpecRow.handDof,
            fingerCount: handSpecRow.fingerCount,
            gripForceN: handSpecRow.gripForceN ? Number(handSpecRow.gripForceN) : null,
          }
        : null,
      computingSpec: computingSpecRow
        ? {
            mainSoc: computingSpecRow.mainSoc,
            topsMin: computingSpecRow.topsMin ? Number(computingSpecRow.topsMin) : null,
            topsMax: computingSpecRow.topsMax ? Number(computingSpecRow.topsMax) : null,
            architectureType: computingSpecRow.architectureType,
          }
        : null,
      applicationCases: cases.map((c) => ({
        environmentType: c.environmentType,
        taskType: c.taskType,
        deploymentStatus: c.deploymentStatus,
      })),
      articleCount,
      articleKeywords,
      estimatedPriceUsd: null, // No direct price source in humanoid_robots table
    };
  }

  /**
   * Process a single robot: calculate all scores and generate positioning data.
   */
  async processRobot(robotWithSpecs: RobotWithSpecs, runId: string): Promise<ScoringResult> {
    const robotId = robotWithSpecs.robot.id;

    // Step 1: PoC scoring
    await pipelineLogger.startStep(runId, `poc_scoring_${robotId}`, 1);
    const pocScore = calculatePocScores(robotWithSpecs);
    await pipelineLogger.completeStep(runId, `poc_scoring_${robotId}`, 1, 0);

    // Step 2: RFM scoring
    await pipelineLogger.startStep(runId, `rfm_scoring_${robotId}`, 1);
    const rfmScore = calculateRfmScores(robotWithSpecs);
    await pipelineLogger.completeStep(runId, `rfm_scoring_${robotId}`, 1, 0);

    // Step 3: Positioning generation
    await pipelineLogger.startStep(runId, `positioning_${robotId}`, 1);
    const positioning = generateAllPositioning(pocScore, rfmScore, robotWithSpecs);
    await pipelineLogger.completeStep(runId, `positioning_${robotId}`, 1, 0);

    // Combine estimated fields from both scores
    const estimatedFields = [
      ...pocScore.metadata.estimatedFields,
      ...rfmScore.metadata.estimatedFields,
    ];

    return {
      robotId,
      pocScore,
      rfmScore,
      positioning,
      estimatedFields,
    };
  }

  /**
   * Upsert scores into DB for a robot.
   * - poc_scores: check if record exists, update or insert
   * - rfm_scores: same upsert logic
   * - positioning_data: delete existing + insert new for each chartType
   * Validates score ranges before persisting (Requirement 9.49).
   */
  async upsertScores(robotId: string, result: ScoringResult): Promise<void> {
    const now = new Date();

    // Validate score ranges before persisting
    if (!validatePocScoreRange(result.pocScore)) {
      throw new Error(`PoC score out of range for robot ${robotId}`);
    }
    if (!validateRfmScoreRange(result.rfmScore)) {
      throw new Error(`RFM score out of range for robot ${robotId}`);
    }

    // Upsert poc_scores
    const [existingPoc] = await db
      .select({ id: pocScores.id, metadata: pocScores.metadata })
      .from(pocScores)
      .where(eq(pocScores.robotId, robotId))
      .limit(1);

    const pocMetadata: Record<string, unknown> = {
      ...result.pocScore.metadata,
      source: 'auto',
    };

    if (existingPoc) {
      // Record previous values for audit
      const prevMeta = (existingPoc.metadata as Record<string, unknown>) || {};
      pocMetadata.previousValues = prevMeta;

      await db
        .update(pocScores)
        .set({
          payloadScore: result.pocScore.payloadScore,
          operationTimeScore: result.pocScore.operationTimeScore,
          fingerDofScore: result.pocScore.fingerDofScore,
          formFactorScore: result.pocScore.formFactorScore,
          pocDeploymentScore: result.pocScore.pocDeploymentScore,
          costEfficiencyScore: result.pocScore.costEfficiencyScore,
          metadata: pocMetadata,
          evaluatedAt: now,
          updatedAt: now,
        })
        .where(eq(pocScores.id, existingPoc.id));
    } else {
      await db.insert(pocScores).values({
        robotId,
        payloadScore: result.pocScore.payloadScore,
        operationTimeScore: result.pocScore.operationTimeScore,
        fingerDofScore: result.pocScore.fingerDofScore,
        formFactorScore: result.pocScore.formFactorScore,
        pocDeploymentScore: result.pocScore.pocDeploymentScore,
        costEfficiencyScore: result.pocScore.costEfficiencyScore,
        metadata: pocMetadata,
        evaluatedAt: now,
      });
    }

    // Upsert rfm_scores
    const [existingRfm] = await db
      .select({ id: rfmScores.id, metadata: rfmScores.metadata })
      .from(rfmScores)
      .where(eq(rfmScores.robotId, robotId))
      .limit(1);

    const rfmMetadata: Record<string, unknown> = {
      ...result.rfmScore.metadata,
      source: 'auto',
    };

    if (existingRfm) {
      const prevMeta = (existingRfm.metadata as Record<string, unknown>) || {};
      rfmMetadata.previousValues = prevMeta;

      await db
        .update(rfmScores)
        .set({
          rfmModelName: result.rfmScore.rfmModelName,
          generalityScore: result.rfmScore.generalityScore,
          realWorldDataScore: result.rfmScore.realWorldDataScore,
          edgeInferenceScore: result.rfmScore.edgeInferenceScore,
          multiRobotCollabScore: result.rfmScore.multiRobotCollabScore,
          openSourceScore: result.rfmScore.openSourceScore,
          commercialMaturityScore: result.rfmScore.commercialMaturityScore,
          metadata: rfmMetadata,
          evaluatedAt: now,
          updatedAt: now,
        })
        .where(eq(rfmScores.id, existingRfm.id));
    } else {
      await db.insert(rfmScores).values({
        robotId,
        rfmModelName: result.rfmScore.rfmModelName,
        generalityScore: result.rfmScore.generalityScore,
        realWorldDataScore: result.rfmScore.realWorldDataScore,
        edgeInferenceScore: result.rfmScore.edgeInferenceScore,
        multiRobotCollabScore: result.rfmScore.multiRobotCollabScore,
        openSourceScore: result.rfmScore.openSourceScore,
        commercialMaturityScore: result.rfmScore.commercialMaturityScore,
        metadata: rfmMetadata,
        evaluatedAt: now,
      });
    }

    // Upsert positioning_data: delete existing + insert new for each chartType
    for (const pos of result.positioning) {
      await db
        .delete(positioningData)
        .where(
          and(
            eq(positioningData.robotId, robotId),
            eq(positioningData.chartType, pos.chartType)
          )
        );

      await db.insert(positioningData).values({
        chartType: pos.chartType,
        robotId,
        label: pos.label,
        xValue: String(pos.xValue),
        yValue: String(pos.yValue),
        bubbleSize: String(pos.bubbleSize),
        colorGroup: pos.colorGroup,
        metadata: pos.metadata,
        evaluatedAt: now,
      });
    }
  }

  /**
   * Run the full scoring pipeline for all robots.
   */
  async runFullPipeline(triggeredBy?: string): Promise<PipelineExecutionResult> {
    if (isRunning) {
      throw new Error('Scoring pipeline is already running');
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const allRobots = await db.select({ id: humanoidRobots.id }).from(humanoidRobots);
      const robotIds = allRobots.map((r) => r.id);
      return await this.executePipeline(robotIds, triggeredBy, startTime);
    } finally {
      isRunning = false;
    }
  }

  /**
   * Run the scoring pipeline for a single robot.
   */
  async runForRobot(robotId: string, triggeredBy?: string): Promise<PipelineExecutionResult> {
    if (isRunning) {
      throw new Error('Scoring pipeline is already running');
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      return await this.executePipeline([robotId], triggeredBy, startTime);
    } finally {
      isRunning = false;
    }
  }

  /**
   * Run the scoring pipeline for specific robots (e.g., triggered by analysis pipeline).
   */
  async runForRobots(robotIds: string[], triggeredBy?: string): Promise<PipelineExecutionResult> {
    if (isRunning) {
      throw new Error('Scoring pipeline is already running');
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      return await this.executePipeline(robotIds, triggeredBy, startTime);
    } finally {
      isRunning = false;
    }
  }

  /**
   * Core pipeline execution logic shared by all run methods.
   */
  private async executePipeline(
    robotIds: string[],
    triggeredBy: string | undefined,
    startTime: number
  ): Promise<PipelineExecutionResult> {
    const runId = await pipelineLogger.startRun(triggeredBy);
    let successCount = 0;
    let failureCount = 0;
    const errors: { robotId: string; step: string; message: string }[] = [];

    for (const robotId of robotIds) {
      let robotWithSpecs: RobotWithSpecs | null = null;
      let scoringResult: ScoringResult | null = null;

      try {
        // Fetch specs
        robotWithSpecs = await this.fetchRobotWithSpecs(robotId);

        // Process (calculate scores)
        scoringResult = await this.processRobot(robotWithSpecs, runId);

        // Upsert to DB
        await this.upsertScores(robotId, scoringResult);

        successCount++;
      } catch (err) {
        failureCount++;
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ robotId, step: 'processing', message });

        // Log failure but continue with next robot (Requirement 4.26)
        try {
          await pipelineLogger.failStep(runId, `processing_${robotId}`, err instanceof Error ? err : new Error(message));
        } catch {
          console.error(`Failed to log pipeline error for robot ${robotId}:`, message);
        }
        continue; // Skip new steps if core scoring failed
      }

      // === New 5 pipeline steps (each with independent try-catch for error isolation) ===
      // Requirements: 17.105, 17.111, 17.112

      const newSteps: { name: string; fn: () => Promise<void> }[] = [
        {
          name: `score_history_${robotId}`,
          fn: () => executeScoreHistoryStep(robotId, scoringResult!.pocScore, scoringResult!.rfmScore),
        },
        {
          name: `competitive_alert_${robotId}`,
          fn: () => executeCompetitiveAlertStep(
            robotId,
            scoringResult!.pocScore,
            scoringResult!.rfmScore,
            robotWithSpecs!.articleKeywords
          ),
        },
        {
          name: `domain_fit_${robotId}`,
          fn: () => executeDomainFitStep(robotId, scoringResult!.pocScore),
        },
        {
          name: `strategic_goal_${robotId}`,
          fn: () => executeStrategicGoalStep(),
        },
        {
          name: `partner_match_${robotId}`,
          fn: () => executePartnerMatchStep(robotId),
        },
      ];

      for (const step of newSteps) {
        try {
          await pipelineLogger.startStep(runId, step.name, 1);
          await step.fn();
          await pipelineLogger.completeStep(runId, step.name, 1, 0);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ robotId, step: step.name, message });
          try {
            await pipelineLogger.failStep(runId, step.name, err instanceof Error ? err : new Error(message));
          } catch {
            console.error(`Failed to log step error for ${step.name}:`, message);
          }
          // Continue to next step — error isolation (Requirement 17.112)
        }
      }
    }

    // Finalize pipeline run status in logger
    await pipelineLogger.getSummary(runId);

    const totalDurationMs = Date.now() - startTime;

    // Determine overall status
    let status: PipelineExecutionResult['status'] = 'success';
    if (failureCount > 0 && successCount > 0) {
      status = 'partial_failure';
    } else if (failureCount > 0 && successCount === 0) {
      status = 'failure';
    }

    return {
      runId,
      status,
      totalRobots: robotIds.length,
      successCount,
      failureCount,
      totalDurationMs,
      errors,
    };
  }

  /**
   * Get the last pipeline run status.
   */
  async getLastRunStatus(): Promise<PipelineExecutionResult | null> {
    const [lastRun] = await db
      .select()
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1);

    if (!lastRun) {
      return null;
    }

    const summary = await pipelineLogger.getSummary(lastRun.id);

    return {
      runId: lastRun.id,
      status: summary.status,
      totalRobots: summary.steps.length,
      successCount: summary.steps.filter((s) => !s.error).length,
      failureCount: summary.steps.filter((s) => !!s.error).length,
      totalDurationMs: summary.totalDurationMs,
      errors: summary.steps
        .filter((s) => s.error)
        .map((s) => ({
          robotId: s.stepName.replace(/^(poc_scoring_|rfm_scoring_|positioning_|processing_)/, ''),
          step: s.stepName,
          message: s.error?.message ?? 'Unknown error',
        })),
    };
  }
}

export const scoringPipelineService = new ScoringPipelineService();
