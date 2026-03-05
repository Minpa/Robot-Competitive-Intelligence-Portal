import {
  db,
  humanoidRobots,
  companies,
  positioningData,
  competitiveAlerts,
  partners,
  applicationDomains,
  strategicGoals,
  bodySpecs,
  pocScores,
  rfmScores,
} from '../db/index.js';
import { eq, desc, and, ilike, count, sql } from 'drizzle-orm';

interface LgPositioning {
  robotName: string;
  pocTotal: number;
  rfmTotal: number;
  combinedScore: number;
  overallRank: number;
  totalRobots: number;
  positioningData: {
    chartType: string;
    xValue: number;
    yValue: number;
    bubbleSize: number;
    colorGroup: string | null;
  }[];
}

interface CompetitiveAlertSummary {
  id: string;
  type: string;
  severity: string | null;
  title: string;
  summary: string | null;
  robotId: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface PartnerSummaryItem {
  category: string;
  count: number;
}

interface TopDomainItem {
  name: string;
  lgReadiness: number;
  somBillionUsd: number;
  opportunity: number;
}

interface GoalStatusSummary {
  achieved: number;
  on_track: number;
  at_risk: number;
  behind: number;
}

export interface DashboardSummary {
  lgPositioning: LgPositioning | null;
  recentAlerts: CompetitiveAlertSummary[];
  partnerSummary: PartnerSummaryItem[];
  topDomains: TopDomainItem[];
  goalStatus: GoalStatusSummary;
}

export interface LgRobotListItem {
  id: string;
  name: string;
  companyName: string;
  status: string | null;
  heightCm: string | null;
  weightKg: string | null;
  payloadKg: string | null;
  dofCount: number | null;
}

class WarRoomDashboardService {
  /**
   * Returns aggregated dashboard summary for a given LG robot.
   */
  async getDashboardSummary(lgRobotId: string): Promise<DashboardSummary> {
    const [lgPositioning, recentAlerts, partnerSummary, topDomains, goalStatus] =
      await Promise.all([
        this.getLgPositioning(lgRobotId),
        this.getRecentAlerts(),
        this.getPartnerSummary(),
        this.getTopDomains(),
        this.getGoalStatus(),
      ]);

    return {
      lgPositioning,
      recentAlerts,
      partnerSummary,
      topDomains,
      goalStatus,
    };
  }

  /**
   * Returns LG robots filtered by region='KR' AND company name ILIKE '%LG%'.
   * Joins with companies table and includes body specs.
   */
  async getLgRobots(): Promise<LgRobotListItem[]> {
    const results = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        companyName: companies.name,
        status: humanoidRobots.status,
        heightCm: bodySpecs.heightCm,
        weightKg: bodySpecs.weightKg,
        payloadKg: bodySpecs.payloadKg,
        dofCount: bodySpecs.dofCount,
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .leftJoin(bodySpecs, eq(humanoidRobots.id, bodySpecs.robotId))
      .where(
        and(
          eq(humanoidRobots.region, 'KR'),
          ilike(companies.name, '%LG%')
        )
      );

    return results;
  }

  // --- Private helpers ---

  private async getLgPositioning(lgRobotId: string): Promise<LgPositioning | null> {
    // Get robot name
    const robotResult = await db
      .select({ name: humanoidRobots.name })
      .from(humanoidRobots)
      .where(eq(humanoidRobots.id, lgRobotId))
      .limit(1);

    if (robotResult.length === 0) return null;

    // Get PoC and RFM scores for the LG robot
    const pocResult = await db
      .select()
      .from(pocScores)
      .where(eq(pocScores.robotId, lgRobotId))
      .limit(1);

    const rfmResult = await db
      .select()
      .from(rfmScores)
      .where(eq(rfmScores.robotId, lgRobotId))
      .limit(1);

    const poc = pocResult[0];
    const rfm = rfmResult[0];

    const pocTotal = poc
      ? poc.payloadScore + poc.operationTimeScore + poc.fingerDofScore +
        poc.formFactorScore + poc.pocDeploymentScore + poc.costEfficiencyScore
      : 0;

    const rfmTotal = rfm
      ? rfm.generalityScore + rfm.realWorldDataScore + rfm.edgeInferenceScore +
        rfm.multiRobotCollabScore + rfm.openSourceScore + rfm.commercialMaturityScore
      : 0;

    const combinedScore = pocTotal + rfmTotal;

    // Calculate overall rank among all scored robots
    const allScores = await db
      .select({
        robotId: pocScores.robotId,
        pocTotal: sql<number>`
          ${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} +
          ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore}
        `,
      })
      .from(pocScores);

    // Get RFM totals for all robots that have both scores
    const allRfmScores = await db
      .select({
        robotId: rfmScores.robotId,
        rfmTotal: sql<number>`
          ${rfmScores.generalityScore} + ${rfmScores.realWorldDataScore} + ${rfmScores.edgeInferenceScore} +
          ${rfmScores.multiRobotCollabScore} + ${rfmScores.openSourceScore} + ${rfmScores.commercialMaturityScore}
        `,
      })
      .from(rfmScores);

    const rfmMap = new Map(allRfmScores.map((r) => [r.robotId, Number(r.rfmTotal)]));
    const combinedScores = allScores.map((s) => ({
      robotId: s.robotId,
      combined: Number(s.pocTotal) + (rfmMap.get(s.robotId) ?? 0),
    }));

    const totalRobots = combinedScores.length;
    const overallRank =
      combinedScores.filter((s) => s.combined > combinedScore).length + 1;

    // Get positioning data for this robot
    const positioning = await db
      .select({
        chartType: positioningData.chartType,
        xValue: positioningData.xValue,
        yValue: positioningData.yValue,
        bubbleSize: positioningData.bubbleSize,
        colorGroup: positioningData.colorGroup,
      })
      .from(positioningData)
      .where(eq(positioningData.robotId, lgRobotId));

    return {
      robotName: robotResult[0].name,
      pocTotal,
      rfmTotal,
      combinedScore,
      overallRank,
      totalRobots,
      positioningData: positioning.map((p) => ({
        chartType: p.chartType,
        xValue: Number(p.xValue),
        yValue: Number(p.yValue),
        bubbleSize: Number(p.bubbleSize),
        colorGroup: p.colorGroup,
      })),
    };
  }

  private async getRecentAlerts(): Promise<CompetitiveAlertSummary[]> {
    const alerts = await db
      .select({
        id: competitiveAlerts.id,
        type: competitiveAlerts.type,
        severity: competitiveAlerts.severity,
        title: competitiveAlerts.title,
        summary: competitiveAlerts.summary,
        robotId: competitiveAlerts.robotId,
        isRead: competitiveAlerts.isRead,
        createdAt: competitiveAlerts.createdAt,
      })
      .from(competitiveAlerts)
      .orderBy(desc(competitiveAlerts.createdAt))
      .limit(5);

    return alerts;
  }

  private async getPartnerSummary(): Promise<PartnerSummaryItem[]> {
    const results = await db
      .select({
        category: partners.category,
        count: count(),
      })
      .from(partners)
      .groupBy(partners.category);

    return results.map((r) => ({
      category: r.category,
      count: Number(r.count),
    }));
  }

  private async getTopDomains(): Promise<TopDomainItem[]> {
    const domains = await db
      .select({
        name: applicationDomains.name,
        lgReadiness: applicationDomains.lgReadiness,
        somBillionUsd: applicationDomains.somBillionUsd,
      })
      .from(applicationDomains);

    // Calculate opportunity = lgReadiness × somBillionUsd, sort DESC, take top 3
    const withOpportunity = domains
      .map((d) => ({
        name: d.name,
        lgReadiness: Number(d.lgReadiness ?? 0),
        somBillionUsd: Number(d.somBillionUsd ?? 0),
        opportunity: Number(d.lgReadiness ?? 0) * Number(d.somBillionUsd ?? 0),
      }))
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 3);

    return withOpportunity;
  }

  private async getGoalStatus(): Promise<GoalStatusSummary> {
    const results = await db
      .select({
        status: strategicGoals.status,
        count: count(),
      })
      .from(strategicGoals)
      .groupBy(strategicGoals.status);

    const statusMap: GoalStatusSummary = {
      achieved: 0,
      on_track: 0,
      at_risk: 0,
      behind: 0,
    };

    for (const row of results) {
      const key = row.status as keyof GoalStatusSummary;
      if (key in statusMap) {
        statusMap[key] = Number(row.count);
      }
    }

    return statusMap;
  }
}

export const warRoomDashboardService = new WarRoomDashboardService();
