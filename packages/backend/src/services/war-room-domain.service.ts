import {
  db,
  applicationDomains,
  domainRobotFit,
  humanoidRobots,
  partners,
  partnerRobotAdoptions,
  pocScores,
} from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

export interface DomainListItem {
  id: string;
  name: string;
  description: string | null;
  marketSizeBillionUsd: string | null;
  cagrPercent: string | null;
  somBillionUsd: string | null;
  keyTasks: string[] | null;
  entryBarriers: string[] | null;
  lgExistingBusiness: string | null;
  lgReadiness: string | null;
  updatedAt: Date;
}

export interface DomainDetail extends DomainListItem {
  robotFits: {
    id: string;
    robotId: string;
    robotName: string;
    fitScore: string | null;
    fitDetails: unknown;
    calculatedAt: Date;
  }[];
}

export interface FitMatrixEntry {
  id: string;
  domainId: string;
  domainName: string;
  robotId: string;
  robotName: string;
  fitScore: string | null;
  fitDetails: unknown;
  calculatedAt: Date;
}

class DomainService {
  /**
   * List all application domains with lg_readiness.
   * Requirements: 14.52, 14.61
   */
  async list(): Promise<DomainListItem[]> {
    const results = await db
      .select({
        id: applicationDomains.id,
        name: applicationDomains.name,
        description: applicationDomains.description,
        marketSizeBillionUsd: applicationDomains.marketSizeBillionUsd,
        cagrPercent: applicationDomains.cagrPercent,
        somBillionUsd: applicationDomains.somBillionUsd,
        keyTasks: applicationDomains.keyTasks,
        entryBarriers: applicationDomains.entryBarriers,
        lgExistingBusiness: applicationDomains.lgExistingBusiness,
        lgReadiness: applicationDomains.lgReadiness,
        updatedAt: applicationDomains.updatedAt,
      })
      .from(applicationDomains);

    return results;
  }

  /**
   * Get domain by ID with all domain_robot_fit entries.
   * Requirements: 14.53, 14.62
   */
  async getById(id: string): Promise<DomainDetail | null> {
    const domainResult = await db
      .select()
      .from(applicationDomains)
      .where(eq(applicationDomains.id, id))
      .limit(1);

    const domain = domainResult[0];
    if (!domain) return null;

    // Get all robot fit entries for this domain
    const robotFits = await db
      .select({
        id: domainRobotFit.id,
        robotId: domainRobotFit.robotId,
        robotName: humanoidRobots.name,
        fitScore: domainRobotFit.fitScore,
        fitDetails: domainRobotFit.fitDetails,
        calculatedAt: domainRobotFit.calculatedAt,
      })
      .from(domainRobotFit)
      .innerJoin(humanoidRobots, eq(domainRobotFit.robotId, humanoidRobots.id))
      .where(eq(domainRobotFit.domainId, id));

    return {
      id: domain.id,
      name: domain.name,
      description: domain.description,
      marketSizeBillionUsd: domain.marketSizeBillionUsd,
      cagrPercent: domain.cagrPercent,
      somBillionUsd: domain.somBillionUsd,
      keyTasks: domain.keyTasks,
      entryBarriers: domain.entryBarriers,
      lgExistingBusiness: domain.lgExistingBusiness,
      lgReadiness: domain.lgReadiness,
      updatedAt: domain.updatedAt,
      robotFits,
    };
  }

  /**
   * Update domain fields.
   * Requirements: 14.64
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      marketSizeBillionUsd: string | null;
      cagrPercent: string | null;
      somBillionUsd: string | null;
      keyTasks: string[] | null;
      entryBarriers: string[] | null;
      lgExistingBusiness: string | null;
      lgReadiness: string | null;
    }>
  ): Promise<DomainListItem | null> {
    const [result] = await db
      .update(applicationDomains)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applicationDomains.id, id))
      .returning();

    if (!result) return null;

    return result;
  }

  /**
   * Get the full robot-domain fit matrix with names.
   * Requirements: 14.63
   */
  async getFitMatrix(): Promise<FitMatrixEntry[]> {
    const results = await db
      .select({
        id: domainRobotFit.id,
        domainId: domainRobotFit.domainId,
        domainName: applicationDomains.name,
        robotId: domainRobotFit.robotId,
        robotName: humanoidRobots.name,
        fitScore: domainRobotFit.fitScore,
        fitDetails: domainRobotFit.fitDetails,
        calculatedAt: domainRobotFit.calculatedAt,
      })
      .from(domainRobotFit)
      .innerJoin(applicationDomains, eq(domainRobotFit.domainId, applicationDomains.id))
      .innerJoin(humanoidRobots, eq(domainRobotFit.robotId, humanoidRobots.id));

    return results;
  }

  /**
   * Create a domain-robot fit entry.
   */
  async createFitEntry(data: {
    domainId: string;
    robotId: string;
    fitScore?: string | null;
    fitDetails?: unknown;
  }): Promise<FitMatrixEntry> {
    const [result] = await db
      .insert(domainRobotFit)
      .values({
        domainId: data.domainId,
        robotId: data.robotId,
        fitScore: data.fitScore ?? null,
        fitDetails: data.fitDetails ?? null,
      })
      .returning();

    if (!result) throw new Error('Failed to create fit entry');

    const domainResult = await db.select({ name: applicationDomains.name }).from(applicationDomains).where(eq(applicationDomains.id, data.domainId)).limit(1);
    const robotResult = await db.select({ name: humanoidRobots.name }).from(humanoidRobots).where(eq(humanoidRobots.id, data.robotId)).limit(1);

    return {
      id: result.id,
      domainId: result.domainId,
      domainName: domainResult[0]?.name ?? '',
      robotId: result.robotId,
      robotName: robotResult[0]?.name ?? '',
      fitScore: result.fitScore,
      fitDetails: result.fitDetails,
      calculatedAt: result.calculatedAt,
    };
  }

  /**
   * Update (patch) a domain-robot fit entry.
   */
  async updateFitEntry(
    id: string,
    data: Partial<{ fitScore: string | null; fitDetails: unknown }>
  ): Promise<FitMatrixEntry | null> {
    const [result] = await db
      .update(domainRobotFit)
      .set({ ...data, calculatedAt: new Date() })
      .where(eq(domainRobotFit.id, id))
      .returning();

    if (!result) return null;

    const domainResult = await db.select({ name: applicationDomains.name }).from(applicationDomains).where(eq(applicationDomains.id, result.domainId)).limit(1);
    const robotResult = await db.select({ name: humanoidRobots.name }).from(humanoidRobots).where(eq(humanoidRobots.id, result.robotId)).limit(1);

    return {
      id: result.id,
      domainId: result.domainId,
      domainName: domainResult[0]?.name ?? '',
      robotId: result.robotId,
      robotName: robotResult[0]?.name ?? '',
      fitScore: result.fitScore,
      fitDetails: result.fitDetails,
      calculatedAt: result.calculatedAt,
    };
  }

  /**
   * Calculate lg_readiness for a domain.
   * Formula: (poc_factor_fulfillment × 0.4) + (lg_existing_business_bonus × 0.3) + (partner_availability × 0.3)
   * Requirements: 14.55
   */
  async calculateLgReadiness(domainId: string): Promise<number> {
    // Get the domain
    const domainResult = await db
      .select()
      .from(applicationDomains)
      .where(eq(applicationDomains.id, domainId))
      .limit(1);

    const domain = domainResult[0];
    if (!domain) return 0;

    // Calculate poc_factor_fulfillment: average of all PoC scores for LG robots / 10
    const pocAvgResult = await db
      .select({
        avgScore: sql<number>`AVG(
          (${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} +
           ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore}) / 6.0
        )`,
      })
      .from(pocScores);

    const pocAvg = Number(pocAvgResult[0]?.avgScore ?? 0);
    const pocFactorFulfillment = Math.min(pocAvg / 10, 1);

    // lg_existing_business bonus
    const lgExistingBusinessBonus = Number(domain.lgExistingBusiness ?? 0) >= 0.5 ? 1.0 : 0.0;

    // partner_availability: ratio of adopted/strategic partners to total partners
    const totalPartners = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(partners);

    const adoptedPartners = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(partnerRobotAdoptions)
      .where(
        sql`${partnerRobotAdoptions.adoptionStatus} IN ('adopted', 'strategic')`
      );

    const totalCount = Number(totalPartners[0]?.count ?? 0);
    const adoptedCount = Number(adoptedPartners[0]?.count ?? 0);
    const partnerAvailability = totalCount > 0 ? adoptedCount / totalCount : 0;

    // Calculate lg_readiness
    const lgReadiness = (pocFactorFulfillment * 0.4) + (lgExistingBusinessBonus * 0.3) + (partnerAvailability * 0.3);

    // Clamp to [0, 1]
    const clampedReadiness = Math.max(0, Math.min(1, lgReadiness));

    // Update the domain's lg_readiness
    await db
      .update(applicationDomains)
      .set({ lgReadiness: clampedReadiness.toFixed(2), updatedAt: new Date() })
      .where(eq(applicationDomains.id, domainId));

    return clampedReadiness;
  }

  /**
   * Calculate fit score for a robot-domain pair.
   * Requirements: 14.56
   */
  async calculateFitScore(robotId: string, domainId: string): Promise<number> {
    // Get the robot's PoC scores
    const pocResult = await db
      .select()
      .from(pocScores)
      .where(eq(pocScores.robotId, robotId))
      .limit(1);

    const poc = pocResult[0];
    if (!poc) return 0;

    // Get the domain's key_tasks
    const domainResult = await db
      .select({ keyTasks: applicationDomains.keyTasks })
      .from(applicationDomains)
      .where(eq(applicationDomains.id, domainId))
      .limit(1);

    if (domainResult.length === 0) return 0;

    // Calculate fit score based on PoC scores average normalized to 0-1
    const pocTotal = poc.payloadScore + poc.operationTimeScore + poc.fingerDofScore +
      poc.formFactorScore + poc.pocDeploymentScore + poc.costEfficiencyScore;
    const fitScore = Math.min(Number((pocTotal / 60).toFixed(2)), 1);

    return fitScore;
  }
}

export const warRoomDomainService = new DomainService();
