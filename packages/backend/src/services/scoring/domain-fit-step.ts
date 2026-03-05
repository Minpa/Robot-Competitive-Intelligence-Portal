/**
 * Domain Fit Step — 로봇-분야 적합도 계산
 *
 * 각 application_domain에 대해 로봇의 PoC 스코어와 도메인 key_tasks 간의 정렬도를 기반으로
 * fit_score를 계산하고, domain_robot_fit 레코드를 upsert한다.
 * 또한 각 도메인의 lg_readiness를 재계산한다.
 *
 * lg_readiness = (poc_fulfillment × 0.4) + (lg_biz × 0.3) + (partner_avail × 0.3)
 *
 * Requirements: 17.105, 17.108, 14.55
 */

import type { PocScoreValues } from './poc-calculator.js';
import {
  db,
  applicationDomains,
  domainRobotFit,
  humanoidRobots,
  partners,
  partnerRobotAdoptions,
} from '../../db/index.js';
import { eq, and, inArray, sql } from 'drizzle-orm';

/**
 * Mapping from domain key_tasks to relevant PoC score fields.
 * Each task maps to one or more PoC factors that indicate capability for that task.
 */
const TASK_SCORE_MAPPING: Record<string, (keyof Omit<PocScoreValues, 'metadata'>)[]> = {
  // Heavy lifting, material handling
  'heavy_lifting': ['payloadScore'],
  'material_handling': ['payloadScore', 'fingerDofScore'],
  'assembly': ['fingerDofScore', 'formFactorScore'],
  'inspection': ['formFactorScore', 'operationTimeScore'],
  'welding': ['fingerDofScore', 'operationTimeScore'],
  'packaging': ['fingerDofScore', 'payloadScore'],
  // Logistics tasks
  'picking': ['fingerDofScore', 'payloadScore'],
  'sorting': ['fingerDofScore', 'operationTimeScore'],
  'delivery': ['operationTimeScore', 'formFactorScore'],
  'warehouse': ['payloadScore', 'operationTimeScore'],
  // Service tasks
  'customer_service': ['formFactorScore', 'costEfficiencyScore'],
  'cleaning': ['operationTimeScore', 'formFactorScore'],
  'cooking': ['fingerDofScore', 'operationTimeScore'],
  'caregiving': ['fingerDofScore', 'formFactorScore'],
  'surgery_assist': ['fingerDofScore', 'costEfficiencyScore'],
  'rehabilitation': ['fingerDofScore', 'operationTimeScore'],
  // General
  'navigation': ['formFactorScore', 'operationTimeScore'],
  'manipulation': ['fingerDofScore', 'payloadScore'],
  'surveillance': ['operationTimeScore', 'formFactorScore'],
  'harvesting': ['fingerDofScore', 'payloadScore'],
  'construction': ['payloadScore', 'formFactorScore'],
  'deployment': ['pocDeploymentScore', 'costEfficiencyScore'],
};

/**
 * Calculate fit_score for a robot-domain pair based on PoC scores alignment with domain key_tasks.
 * Returns a value between 0 and 1.
 */
function calculateFitScore(pocScores: PocScoreValues, keyTasks: string[]): number {
  if (!keyTasks || keyTasks.length === 0) {
    // No key_tasks defined — use average of all PoC scores normalized to 0-1
    const allScores = [
      pocScores.payloadScore,
      pocScores.operationTimeScore,
      pocScores.fingerDofScore,
      pocScores.formFactorScore,
      pocScores.pocDeploymentScore,
      pocScores.costEfficiencyScore,
    ];
    const avg = allScores.reduce((sum, v) => sum + v, 0) / allScores.length;
    return Math.min(1, Math.max(0, avg / 10));
  }

  let totalScore = 0;
  let matchedTasks = 0;

  for (const task of keyTasks) {
    const normalizedTask = task.toLowerCase().replace(/\s+/g, '_');
    const relevantFields = TASK_SCORE_MAPPING[normalizedTask];

    if (relevantFields && relevantFields.length > 0) {
      // Average the relevant PoC scores for this task, normalized to 0-1
      const taskScore = relevantFields.reduce((sum, field) => sum + pocScores[field], 0) / relevantFields.length;
      totalScore += taskScore / 10; // Normalize from 1-10 to 0-1
      matchedTasks++;
    } else {
      // Unknown task — use overall average
      const allScores = [
        pocScores.payloadScore,
        pocScores.operationTimeScore,
        pocScores.fingerDofScore,
        pocScores.formFactorScore,
        pocScores.pocDeploymentScore,
        pocScores.costEfficiencyScore,
      ];
      const avg = allScores.reduce((sum, v) => sum + v, 0) / allScores.length;
      totalScore += avg / 10;
      matchedTasks++;
    }
  }

  return matchedTasks > 0 ? Math.min(1, Math.max(0, totalScore / matchedTasks)) : 0;
}

/**
 * Calculate lg_readiness for a domain.
 *
 * lg_readiness = (poc_fulfillment × 0.4) + (lg_biz × 0.3) + (partner_avail × 0.3)
 *
 * - poc_fulfillment = average fit_score of LG robots for this domain
 * - lg_biz = domain's lg_existing_business value (0 or 1)
 * - partner_avail = count of partners with matching sub_category in adopted/strategic status / total needed (simplified to 0 or 1)
 */
async function calculateLgReadiness(
  domainId: string,
  lgExistingBusiness: number,
): Promise<number> {
  // Get average fit_score of LG robots for this domain
  const lgFits = await db
    .select({ fitScore: domainRobotFit.fitScore })
    .from(domainRobotFit)
    .innerJoin(humanoidRobots, eq(domainRobotFit.robotId, humanoidRobots.id))
    .where(
      and(
        eq(domainRobotFit.domainId, domainId),
        eq(humanoidRobots.region, 'KR'),
        sql`${humanoidRobots.companyId} IN (SELECT id FROM companies WHERE LOWER(name) LIKE '%lg%')`
      )
    );

  const pocFulfillment = lgFits.length > 0
    ? lgFits.reduce((sum, f) => sum + Number(f.fitScore ?? 0), 0) / lgFits.length
    : 0;

  // Partner availability: check if there are adopted/strategic partners
  const adoptedPartners = await db
    .select({ count: sql<number>`count(*)` })
    .from(partnerRobotAdoptions)
    .where(
      inArray(partnerRobotAdoptions.adoptionStatus, ['adopted', 'strategic'])
    );

  const totalPartners = await db
    .select({ count: sql<number>`count(*)` })
    .from(partners);

  const partnerAvail = totalPartners[0] && Number(totalPartners[0].count) > 0
    ? Math.min(1, Number(adoptedPartners[0]?.count ?? 0) / Number(totalPartners[0].count))
    : 0;

  const lgBiz = lgExistingBusiness > 0 ? 1.0 : 0.0;

  return (pocFulfillment * 0.4) + (lgBiz * 0.3) + (partnerAvail * 0.3);
}

/**
 * Execute the Domain Fit pipeline step.
 * For each application_domain, calculate fit_score and upsert domain_robot_fit records.
 * Then recalculate lg_readiness for each domain.
 */
export async function executeDomainFitStep(
  robotId: string,
  pocScores: PocScoreValues
): Promise<void> {
  // Get all application domains
  const domains = await db
    .select({
      id: applicationDomains.id,
      keyTasks: applicationDomains.keyTasks,
      lgExistingBusiness: applicationDomains.lgExistingBusiness,
    })
    .from(applicationDomains);

  for (const domain of domains) {
    const keyTasks = (domain.keyTasks as string[]) ?? [];
    const fitScore = calculateFitScore(pocScores, keyTasks);

    // Upsert domain_robot_fit record
    const existing = await db
      .select({ id: domainRobotFit.id })
      .from(domainRobotFit)
      .where(
        and(
          eq(domainRobotFit.domainId, domain.id),
          eq(domainRobotFit.robotId, robotId)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await db
        .update(domainRobotFit)
        .set({
          fitScore: String(fitScore),
          calculatedAt: new Date(),
        })
        .where(eq(domainRobotFit.id, existing[0].id));
    } else {
      await db.insert(domainRobotFit).values({
        domainId: domain.id,
        robotId,
        fitScore: String(fitScore),
        calculatedAt: new Date(),
      });
    }

    // Recalculate lg_readiness for this domain
    const lgBiz = Number(domain.lgExistingBusiness ?? 0);
    const lgReadiness = await calculateLgReadiness(domain.id, lgBiz);

    await db
      .update(applicationDomains)
      .set({
        lgReadiness: String(Math.min(1, Math.max(0, lgReadiness))),
        updatedAt: new Date(),
      })
      .where(eq(applicationDomains.id, domain.id));
  }
}
