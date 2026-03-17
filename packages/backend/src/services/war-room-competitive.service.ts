import {
  db,
  humanoidRobots,
  companies,
  pocScores,
  rfmScores,
  positioningData,
} from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

// 12 factor names
const POC_FACTORS = [
  'payloadScore',
  'operationTimeScore',
  'fingerDofScore',
  'formFactorScore',
  'pocDeploymentScore',
  'costEfficiencyScore',
] as const;

const RFM_FACTORS = [
  'generalityScore',
  'realWorldDataScore',
  'edgeInferenceScore',
  'multiRobotCollabScore',
  'openSourceScore',
  'commercialMaturityScore',
] as const;

type GapColor = 'green' | 'red' | 'gray';

interface GapFactorItem {
  factorName: string;
  factorType: 'poc' | 'rfm';
  lgValue: number;
  topCompetitorValue: number;
  topCompetitorName: string;
  gap: number;
  color: GapColor;
}

export interface GapAnalysisResult {
  factors: GapFactorItem[];
  lgRanking: {
    pocRank: number;
    rfmRank: number;
    combinedRank: number;
    totalRobots: number;
  };
}

interface RobotScoreRow {
  robotId: string;
  robotName: string;
  companyName: string;
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
}

interface OverlayRobotData {
  robotId: string;
  robotName: string;
  companyName: string;
  positioning: {
    chartType: string;
    xValue: number;
    yValue: number;
    bubbleSize: number;
    colorGroup: string | null;
  }[];
  pocScores: Record<string, number>;
  rfmScores: Record<string, number>;
  combinedScore: number;
}

export interface CompetitiveOverlayResult {
  lgData: OverlayRobotData | null;
  top5Data: OverlayRobotData[];
}

function classifyGapColor(gap: number): GapColor {
  if (gap > 0) return 'green';
  if (gap < 0) return 'red';
  return 'gray';
}

function sumPocScores(row: RobotScoreRow): number {
  return (
    row.payloadScore +
    row.operationTimeScore +
    row.fingerDofScore +
    row.formFactorScore +
    row.pocDeploymentScore +
    row.costEfficiencyScore
  );
}

function sumRfmScores(row: RobotScoreRow): number {
  return (
    row.generalityScore +
    row.realWorldDataScore +
    row.edgeInferenceScore +
    row.multiRobotCollabScore +
    row.openSourceScore +
    row.commercialMaturityScore
  );
}

interface UpdateScoreRequest {
  pocScores?: Partial<Record<typeof POC_FACTORS[number], number>>;
  rfmScores?: Partial<Record<typeof RFM_FACTORS[number], number>>;
}

class CompetitiveAnalysisService {
  /**
   * Updates competitive scores for a robot (PoC and/or RFM scores).
   */
  async updateCompetitiveScores(
    robotId: string,
    updates: UpdateScoreRequest
  ): Promise<{ pocScore?: typeof pocScores.$inferSelect; rfmScore?: typeof rfmScores.$inferSelect }> {
    const result: any = {};

    if (updates.pocScores && Object.keys(updates.pocScores).length > 0) {
      const pocRow = await db
        .select()
        .from(pocScores)
        .where(eq(pocScores.robotId, robotId))
        .limit(1)
        .then((rows) => rows[0]);

      if (pocRow) {
        const updateData: any = {
          ...updates.pocScores,
          updatedAt: new Date(),
        };

        const updated = await db
          .update(pocScores)
          .set(updateData)
          .where(eq(pocScores.robotId, robotId))
          .returning();

        result.pocScore = updated[0];
      }
    }

    if (updates.rfmScores && Object.keys(updates.rfmScores).length > 0) {
      const rfmRow = await db
        .select()
        .from(rfmScores)
        .where(eq(rfmScores.robotId, robotId))
        .limit(1)
        .then((rows) => rows[0]);

      if (rfmRow) {
        const updateData: any = {
          ...updates.rfmScores,
          updatedAt: new Date(),
        };

        const updated = await db
          .update(rfmScores)
          .set(updateData)
          .where(eq(rfmScores.robotId, robotId))
          .returning();

        result.rfmScore = updated[0];
      }
    }

    return result;
  }

  /**
   * Fetches all robots that have both PoC and RFM scores, joined with robot/company names.
   */
  private async getAllRobotScores(): Promise<RobotScoreRow[]> {
    const rows = await db
      .select({
        robotId: humanoidRobots.id,
        robotName: humanoidRobots.name,
        companyName: companies.name,
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
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .innerJoin(pocScores, eq(humanoidRobots.id, pocScores.robotId))
      .innerJoin(rfmScores, eq(humanoidRobots.id, rfmScores.robotId));

    return rows;
  }

  /**
   * Returns all robots that have scores, for use in competitor selection UI.
   */
  async getAvailableCompetitors(lgRobotId: string): Promise<{ robotId: string; robotName: string; companyName: string; combinedScore: number }[]> {
    const allScores = await this.getAllRobotScores();
    return allScores
      .filter((r) => r.robotId !== lgRobotId)
      .map((r) => ({
        robotId: r.robotId,
        robotName: r.robotName,
        companyName: r.companyName,
        combinedScore: sumPocScores(r) + sumRfmScores(r),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * 12-factor GAP analysis: LG robot vs Top 1 competitor.
   * GAP = LG score - Top1 score for each factor.
   * Color: positive → green, negative → red, zero → gray.
   * If competitorIds is provided, only those competitors are considered.
   */
  async getGapAnalysis(lgRobotId: string, competitorIds?: string[]): Promise<GapAnalysisResult> {
    const allScores = await this.getAllRobotScores();

    const lgRow = allScores.find((r) => r.robotId === lgRobotId);
    if (!lgRow) {
      return {
        factors: [],
        lgRanking: { pocRank: 0, rfmRank: 0, combinedRank: 0, totalRobots: 0 },
      };
    }

    // Find Top 1 competitor (highest combined score excluding LG robot)
    let competitors = allScores.filter((r) => r.robotId !== lgRobotId);
    if (competitorIds && competitorIds.length > 0) {
      competitors = competitors.filter((r) => competitorIds.includes(r.robotId));
    }
    const top1 = competitors.length > 0
      ? competitors.reduce((best, curr) => {
          const bestCombined = sumPocScores(best) + sumRfmScores(best);
          const currCombined = sumPocScores(curr) + sumRfmScores(curr);
          return currCombined > bestCombined ? curr : best;
        })
      : null;

    // Build 12-factor GAP items
    const factors: GapFactorItem[] = [];

    for (const factor of POC_FACTORS) {
      const lgValue = lgRow[factor];
      const topValue = top1 ? top1[factor] : 0;
      const gap = lgValue - topValue;
      factors.push({
        factorName: factor,
        factorType: 'poc',
        lgValue,
        topCompetitorValue: topValue,
        topCompetitorName: top1 ? top1.robotName : 'N/A',
        gap,
        color: classifyGapColor(gap),
      });
    }

    for (const factor of RFM_FACTORS) {
      const lgValue = lgRow[factor];
      const topValue = top1 ? top1[factor] : 0;
      const gap = lgValue - topValue;
      factors.push({
        factorName: factor,
        factorType: 'rfm',
        lgValue,
        topCompetitorValue: topValue,
        topCompetitorName: top1 ? top1.robotName : 'N/A',
        gap,
        color: classifyGapColor(gap),
      });
    }

    // Calculate rankings (always against all robots for accurate rank)
    const lgRanking = this.calculateRankings(allScores, lgRobotId);

    return { factors, lgRanking };
  }

  /**
   * LG vs Top 5 overlay data for radar/bubble chart.
   * Returns positioning data for LG robot and top 5 robots by combined score.
   */
  async getCompetitiveOverlay(lgRobotId: string, competitorIds?: string[]): Promise<CompetitiveOverlayResult> {
    const allScores = await this.getAllRobotScores();

    const lgRow = allScores.find((r) => r.robotId === lgRobotId);

    // Sort competitors by combined score descending
    let filteredCompetitors = allScores.filter((r) => r.robotId !== lgRobotId);
    if (competitorIds && competitorIds.length > 0) {
      filteredCompetitors = filteredCompetitors.filter((r) => competitorIds.includes(r.robotId));
    }
    const competitors = filteredCompetitors
      .map((r) => ({
        ...r,
        combinedScore: sumPocScores(r) + sumRfmScores(r),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, competitorIds ? competitorIds.length : 5);

    // Fetch positioning data for all relevant robot IDs
    const relevantIds = [
      ...(lgRow ? [lgRobotId] : []),
      ...competitors.map((c) => c.robotId),
    ];

    const positioningRows = relevantIds.length > 0
      ? await db
          .select({
            robotId: positioningData.robotId,
            chartType: positioningData.chartType,
            xValue: positioningData.xValue,
            yValue: positioningData.yValue,
            bubbleSize: positioningData.bubbleSize,
            colorGroup: positioningData.colorGroup,
          })
          .from(positioningData)
          .where(
            sql`${positioningData.robotId} IN (${sql.join(
              relevantIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : [];

    const positioningByRobot = new Map<string, typeof positioningRows>();
    for (const row of positioningRows) {
      const robotId = row.robotId!;
      if (!positioningByRobot.has(robotId)) {
        positioningByRobot.set(robotId, []);
      }
      positioningByRobot.get(robotId)!.push(row);
    }

    function buildOverlayData(row: RobotScoreRow): OverlayRobotData {
      const positioning = (positioningByRobot.get(row.robotId) ?? []).map((p) => ({
        chartType: p.chartType,
        xValue: Number(p.xValue),
        yValue: Number(p.yValue),
        bubbleSize: Number(p.bubbleSize),
        colorGroup: p.colorGroup,
      }));

      return {
        robotId: row.robotId,
        robotName: row.robotName,
        companyName: row.companyName,
        positioning,
        pocScores: {
          payloadScore: row.payloadScore,
          operationTimeScore: row.operationTimeScore,
          fingerDofScore: row.fingerDofScore,
          formFactorScore: row.formFactorScore,
          pocDeploymentScore: row.pocDeploymentScore,
          costEfficiencyScore: row.costEfficiencyScore,
        },
        rfmScores: {
          generalityScore: row.generalityScore,
          realWorldDataScore: row.realWorldDataScore,
          edgeInferenceScore: row.edgeInferenceScore,
          multiRobotCollabScore: row.multiRobotCollabScore,
          openSourceScore: row.openSourceScore,
          commercialMaturityScore: row.commercialMaturityScore,
        },
        combinedScore: sumPocScores(row) + sumRfmScores(row),
      };
    }

    return {
      lgData: lgRow ? buildOverlayData(lgRow) : null,
      top5Data: competitors.map((c) => buildOverlayData(c)),
    };
  }

  /**
   * LG ranking calculation: pocRank, rfmRank, combinedRank among all robots.
   * Rank = (number of robots with higher score) + 1.
   */
  async getLgRanking(lgRobotId: string): Promise<{
    pocRank: number;
    rfmRank: number;
    combinedRank: number;
    totalRobots: number;
  }> {
    const allScores = await this.getAllRobotScores();
    return this.calculateRankings(allScores, lgRobotId);
  }

  /**
   * Pure ranking calculation from a list of robot scores.
   */
  private calculateRankings(
    allScores: RobotScoreRow[],
    lgRobotId: string
  ): {
    pocRank: number;
    rfmRank: number;
    combinedRank: number;
    totalRobots: number;
  } {
    const totalRobots = allScores.length;
    const lgRow = allScores.find((r) => r.robotId === lgRobotId);

    if (!lgRow || totalRobots === 0) {
      return { pocRank: 0, rfmRank: 0, combinedRank: 0, totalRobots };
    }

    const lgPocTotal = sumPocScores(lgRow);
    const lgRfmTotal = sumRfmScores(lgRow);
    const lgCombined = lgPocTotal + lgRfmTotal;

    let pocRank = 1;
    let rfmRank = 1;
    let combinedRank = 1;

    for (const row of allScores) {
      if (row.robotId === lgRobotId) continue;
      if (sumPocScores(row) > lgPocTotal) pocRank++;
      if (sumRfmScores(row) > lgRfmTotal) rfmRank++;
      if (sumPocScores(row) + sumRfmScores(row) > lgCombined) combinedRank++;
    }

    return { pocRank, rfmRank, combinedRank, totalRobots };
  }
}

export const warRoomCompetitiveService = new CompetitiveAnalysisService();
