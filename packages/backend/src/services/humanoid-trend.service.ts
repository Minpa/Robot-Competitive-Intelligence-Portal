import { eq, or, isNotNull } from 'drizzle-orm';
import {
  db,
  pocScores,
  rfmScores,
  positioningData,
  humanoidRobots,
  companies,
  bodySpecs,
  handSpecs,
} from '../db/index.js';

// ============================================
// Custom Error Class
// ============================================

export class ServiceError extends Error {
  constructor(
    public code: 'VALIDATION_ERROR' | 'INVALID_REFERENCE' | 'NOT_FOUND',
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

const VALID_CHART_TYPES = ['rfm_competitiveness', 'poc_positioning', 'soc_ecosystem'] as const;

// ============================================
// Input DTO Types
// ============================================

export interface PocScoreDto {
  robotId: string;
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
}

export interface RfmScoreDto {
  robotId: string;
  rfmModelName: string;
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
}

export interface PositioningDataDto {
  chartType: string;
  robotId?: string;
  label: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup?: string;
  metadata?: Record<string, unknown>;
}

// Inferred select types for return values
type PocScore = typeof pocScores.$inferSelect;
type RfmScore = typeof rfmScores.$inferSelect;
type PositioningDataRecord = typeof positioningData.$inferSelect;

// ============================================
// Response DTO Types
// ============================================

export interface PocScoreWithRobot {
  id: string;
  robotId: string;
  robotName: string;
  companyName: string;
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
  averageScore: number; // 6 factor arithmetic mean, 1 decimal
  evaluatedAt: Date;
}

export interface RfmScoreWithRobot {
  id: string;
  robotId: string;
  robotName: string;
  companyName: string;
  rfmModelName: string;
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
  evaluatedAt: Date;
}

export interface PositioningDataWithRobot {
  id: string;
  chartType: string;
  robotId: string | null;
  robotName: string | null;
  label: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup: string | null;
  metadata: Record<string, unknown> | null;
  evaluatedAt: Date;
}

export interface BarSpecData {
  robotId: string;
  robotName: string;
  companyName: string;
  payloadKg: number | null;
  operationTimeHours: number | null;
  handDof: number | null;
  pocDeploymentScore: number | null;
}

// ============================================
// Service
// ============================================

export class HumanoidTrendService {
  /**
   * Compute PoC average score (arithmetic mean of 6 factors, rounded to 1 decimal)
   */
  computePocAverage(
    payloadScore: number,
    operationTimeScore: number,
    fingerDofScore: number,
    formFactorScore: number,
    pocDeploymentScore: number,
    costEfficiencyScore: number
  ): number {
    const sum =
      payloadScore +
      operationTimeScore +
      fingerDofScore +
      formFactorScore +
      pocDeploymentScore +
      costEfficiencyScore;
    return Math.round((sum / 6) * 10) / 10;
  }

  // ============================================
  // Validation Methods (private)
  // ============================================

  private validatePocScores(data: Partial<PocScoreDto>): void {
    const scoreFields = [
      'payloadScore',
      'operationTimeScore',
      'fingerDofScore',
      'formFactorScore',
      'pocDeploymentScore',
      'costEfficiencyScore',
    ] as const;

    for (const field of scoreFields) {
      const value = data[field];
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 1 || value > 10) {
          throw new ServiceError(
            'VALIDATION_ERROR',
            `${field}은(는) 1에서 10 사이의 정수여야 합니다.`,
            { field, value, validRange: '1–10' }
          );
        }
      }
    }
  }

  private validateRfmScores(data: Partial<RfmScoreDto>): void {
    const scoreFields = [
      'generalityScore',
      'realWorldDataScore',
      'edgeInferenceScore',
      'multiRobotCollabScore',
      'openSourceScore',
      'commercialMaturityScore',
    ] as const;

    for (const field of scoreFields) {
      const value = data[field];
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          throw new ServiceError(
            'VALIDATION_ERROR',
            `${field}은(는) 1에서 5 사이의 정수여야 합니다.`,
            { field, value, validRange: '1–5' }
          );
        }
      }
    }
  }

  private validateChartType(chartType: string): void {
    if (!VALID_CHART_TYPES.includes(chartType as typeof VALID_CHART_TYPES[number])) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        `유효하지 않은 chart_type입니다. 허용 값: ${VALID_CHART_TYPES.join(', ')}`,
        { field: 'chartType', value: chartType, validValues: VALID_CHART_TYPES }
      );
    }
  }

  private async validateRobotExists(robotId: string): Promise<void> {
    const [robot] = await db
      .select({ id: humanoidRobots.id })
      .from(humanoidRobots)
      .where(eq(humanoidRobots.id, robotId))
      .limit(1);

    if (!robot) {
      throw new ServiceError(
        'INVALID_REFERENCE',
        '해당 로봇이 존재하지 않습니다',
        { field: 'robotId', value: robotId }
      );
    }
  }

  /**
   * Get all PoC scores with robot and company names
   */
  async getPocScores(): Promise<PocScoreWithRobot[]> {
    const rows = await db
      .select({
        id: pocScores.id,
        robotId: pocScores.robotId,
        robotName: humanoidRobots.name,
        companyName: companies.name,
        payloadScore: pocScores.payloadScore,
        operationTimeScore: pocScores.operationTimeScore,
        fingerDofScore: pocScores.fingerDofScore,
        formFactorScore: pocScores.formFactorScore,
        pocDeploymentScore: pocScores.pocDeploymentScore,
        costEfficiencyScore: pocScores.costEfficiencyScore,
        evaluatedAt: pocScores.evaluatedAt,
      })
      .from(pocScores)
      .innerJoin(humanoidRobots, eq(pocScores.robotId, humanoidRobots.id))
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id));

    return rows.map((row) => ({
      id: row.id,
      robotId: row.robotId,
      robotName: row.robotName,
      companyName: row.companyName,
      payloadScore: row.payloadScore,
      operationTimeScore: row.operationTimeScore,
      fingerDofScore: row.fingerDofScore,
      formFactorScore: row.formFactorScore,
      pocDeploymentScore: row.pocDeploymentScore,
      costEfficiencyScore: row.costEfficiencyScore,
      averageScore: this.computePocAverage(
        row.payloadScore,
        row.operationTimeScore,
        row.fingerDofScore,
        row.formFactorScore,
        row.pocDeploymentScore,
        row.costEfficiencyScore
      ),
      evaluatedAt: row.evaluatedAt,
    }));
  }

  /**
   * Get all RFM scores with robot and company names
   */
  async getRfmScores(): Promise<RfmScoreWithRobot[]> {
    const rows = await db
      .select({
        id: rfmScores.id,
        robotId: rfmScores.robotId,
        robotName: humanoidRobots.name,
        companyName: companies.name,
        rfmModelName: rfmScores.rfmModelName,
        generalityScore: rfmScores.generalityScore,
        realWorldDataScore: rfmScores.realWorldDataScore,
        edgeInferenceScore: rfmScores.edgeInferenceScore,
        multiRobotCollabScore: rfmScores.multiRobotCollabScore,
        openSourceScore: rfmScores.openSourceScore,
        commercialMaturityScore: rfmScores.commercialMaturityScore,
        evaluatedAt: rfmScores.evaluatedAt,
      })
      .from(rfmScores)
      .innerJoin(humanoidRobots, eq(rfmScores.robotId, humanoidRobots.id))
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id));

    return rows.map((row) => ({
      id: row.id,
      robotId: row.robotId,
      robotName: row.robotName,
      companyName: row.companyName,
      rfmModelName: row.rfmModelName,
      generalityScore: row.generalityScore,
      realWorldDataScore: row.realWorldDataScore,
      edgeInferenceScore: row.edgeInferenceScore,
      multiRobotCollabScore: row.multiRobotCollabScore,
      openSourceScore: row.openSourceScore,
      commercialMaturityScore: row.commercialMaturityScore,
      evaluatedAt: row.evaluatedAt,
    }));
  }

  /**
   * Get positioning data filtered by chart type, with optional robot info
   */
  async getPositioningData(chartType: string): Promise<PositioningDataWithRobot[]> {
    const rows = await db
      .select({
        id: positioningData.id,
        chartType: positioningData.chartType,
        robotId: positioningData.robotId,
        robotName: humanoidRobots.name,
        label: positioningData.label,
        xValue: positioningData.xValue,
        yValue: positioningData.yValue,
        bubbleSize: positioningData.bubbleSize,
        colorGroup: positioningData.colorGroup,
        metadata: positioningData.metadata,
        evaluatedAt: positioningData.evaluatedAt,
      })
      .from(positioningData)
      .leftJoin(humanoidRobots, eq(positioningData.robotId, humanoidRobots.id))
      .where(eq(positioningData.chartType, chartType));

    return rows.map((row) => ({
      id: row.id,
      chartType: row.chartType,
      robotId: row.robotId,
      robotName: row.robotName,
      label: row.label,
      xValue: Number(row.xValue),
      yValue: Number(row.yValue),
      bubbleSize: Number(row.bubbleSize),
      colorGroup: row.colorGroup,
      metadata: row.metadata,
      evaluatedAt: row.evaluatedAt,
    }));
  }

  /**
   * Get bar chart spec data: payload, operation time, hand DoF, PoC deployment score
   * JOINs humanoid_robots + companies, LEFT JOINs body_specs, hand_specs, poc_scores
   * Excludes robots where ALL spec values are NULL
   */
  async getBarSpecs(): Promise<BarSpecData[]> {
    const rows = await db
      .select({
        robotId: humanoidRobots.id,
        robotName: humanoidRobots.name,
        companyName: companies.name,
        payloadKg: bodySpecs.payloadKg,
        operationTimeHours: bodySpecs.operationTimeHours,
        handDof: handSpecs.handDof,
        pocDeploymentScore: pocScores.pocDeploymentScore,
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .leftJoin(bodySpecs, eq(humanoidRobots.id, bodySpecs.robotId))
      .leftJoin(handSpecs, eq(humanoidRobots.id, handSpecs.robotId))
      .leftJoin(pocScores, eq(humanoidRobots.id, pocScores.robotId))
      .where(
        or(
          isNotNull(bodySpecs.payloadKg),
          isNotNull(bodySpecs.operationTimeHours),
          isNotNull(handSpecs.handDof),
          isNotNull(pocScores.pocDeploymentScore)
        )
      );

    return rows.map((row) => ({
      robotId: row.robotId,
      robotName: row.robotName,
      companyName: row.companyName,
      payloadKg: row.payloadKg !== null ? Number(row.payloadKg) : null,
      operationTimeHours: row.operationTimeHours !== null ? Number(row.operationTimeHours) : null,
      handDof: row.handDof,
      pocDeploymentScore: row.pocDeploymentScore,
    }));
  }

  // ============================================
  // PoC Score CRUD (Admin)
  // ============================================

  async createPocScore(data: PocScoreDto): Promise<PocScore> {
    this.validatePocScores(data);
    await this.validateRobotExists(data.robotId);

    const [created] = await db
      .insert(pocScores)
      .values({
        robotId: data.robotId,
        payloadScore: data.payloadScore,
        operationTimeScore: data.operationTimeScore,
        fingerDofScore: data.fingerDofScore,
        formFactorScore: data.formFactorScore,
        pocDeploymentScore: data.pocDeploymentScore,
        costEfficiencyScore: data.costEfficiencyScore,
      })
      .returning();
    console.log('[AUDIT]', { action: 'create', entityType: 'poc_score', entityId: created!.id, timestamp: new Date() });
    return created!;
  }

  async updatePocScore(id: string, data: Partial<PocScoreDto>): Promise<PocScore> {
    // Check record exists
    const [existing] = await db
      .select({ id: pocScores.id })
      .from(pocScores)
      .where(eq(pocScores.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'poc_score', id });
    }

    // Validate only provided fields
    this.validatePocScores(data);

    const [updated] = await db
      .update(pocScores)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(pocScores.id, id))
      .returning();
    console.log('[AUDIT]', { action: 'update', entityType: 'poc_score', entityId: id, timestamp: new Date() });
    return updated!;
  }

  async deletePocScore(id: string): Promise<void> {
    const [existing] = await db
      .select({ id: pocScores.id })
      .from(pocScores)
      .where(eq(pocScores.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'poc_score', id });
    }

    await db.delete(pocScores).where(eq(pocScores.id, id));
    console.log('[AUDIT]', { action: 'delete', entityType: 'poc_score', entityId: id, timestamp: new Date() });
  }

  // ============================================
  // RFM Score CRUD (Admin)
  // ============================================

  async createRfmScore(data: RfmScoreDto): Promise<RfmScore> {
    this.validateRfmScores(data);
    await this.validateRobotExists(data.robotId);

    const [created] = await db
      .insert(rfmScores)
      .values({
        robotId: data.robotId,
        rfmModelName: data.rfmModelName,
        generalityScore: data.generalityScore,
        realWorldDataScore: data.realWorldDataScore,
        edgeInferenceScore: data.edgeInferenceScore,
        multiRobotCollabScore: data.multiRobotCollabScore,
        openSourceScore: data.openSourceScore,
        commercialMaturityScore: data.commercialMaturityScore,
      })
      .returning();
    console.log('[AUDIT]', { action: 'create', entityType: 'rfm_score', entityId: created!.id, timestamp: new Date() });
    return created!;
  }

  async updateRfmScore(id: string, data: Partial<RfmScoreDto>): Promise<RfmScore> {
    const [existing] = await db
      .select({ id: rfmScores.id })
      .from(rfmScores)
      .where(eq(rfmScores.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'rfm_score', id });
    }

    this.validateRfmScores(data);

    const [updated] = await db
      .update(rfmScores)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(rfmScores.id, id))
      .returning();
    console.log('[AUDIT]', { action: 'update', entityType: 'rfm_score', entityId: id, timestamp: new Date() });
    return updated!;
  }

  async deleteRfmScore(id: string): Promise<void> {
    const [existing] = await db
      .select({ id: rfmScores.id })
      .from(rfmScores)
      .where(eq(rfmScores.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'rfm_score', id });
    }

    await db.delete(rfmScores).where(eq(rfmScores.id, id));
    console.log('[AUDIT]', { action: 'delete', entityType: 'rfm_score', entityId: id, timestamp: new Date() });
  }

  // ============================================
  // Positioning Data CRUD (Admin)
  // ============================================

  async createPositioningData(data: PositioningDataDto): Promise<PositioningDataRecord> {
    this.validateChartType(data.chartType);
    if (data.robotId) {
      await this.validateRobotExists(data.robotId);
    }

    const [created] = await db
      .insert(positioningData)
      .values({
        chartType: data.chartType,
        robotId: data.robotId,
        label: data.label,
        xValue: String(data.xValue),
        yValue: String(data.yValue),
        bubbleSize: String(data.bubbleSize),
        colorGroup: data.colorGroup,
        metadata: data.metadata,
      })
      .returning();
    console.log('[AUDIT]', { action: 'create', entityType: 'positioning_data', entityId: created!.id, timestamp: new Date() });
    return created!;
  }

  async updatePositioningData(id: string, data: Partial<PositioningDataDto>): Promise<PositioningDataRecord> {
    const [existing] = await db
      .select({ id: positioningData.id })
      .from(positioningData)
      .where(eq(positioningData.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'positioning_data', id });
    }

    if (data.chartType !== undefined) {
      this.validateChartType(data.chartType);
    }
    if (data.robotId) {
      await this.validateRobotExists(data.robotId);
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (data.chartType !== undefined) updateValues.chartType = data.chartType;
    if (data.robotId !== undefined) updateValues.robotId = data.robotId;
    if (data.label !== undefined) updateValues.label = data.label;
    if (data.xValue !== undefined) updateValues.xValue = String(data.xValue);
    if (data.yValue !== undefined) updateValues.yValue = String(data.yValue);
    if (data.bubbleSize !== undefined) updateValues.bubbleSize = String(data.bubbleSize);
    if (data.colorGroup !== undefined) updateValues.colorGroup = data.colorGroup;
    if (data.metadata !== undefined) updateValues.metadata = data.metadata;

    const [updated] = await db
      .update(positioningData)
      .set(updateValues)
      .where(eq(positioningData.id, id))
      .returning();
    console.log('[AUDIT]', { action: 'update', entityType: 'positioning_data', entityId: id, timestamp: new Date() });
    return updated!;
  }

  async deletePositioningData(id: string): Promise<void> {
    const [existing] = await db
      .select({ id: positioningData.id })
      .from(positioningData)
      .where(eq(positioningData.id, id))
      .limit(1);
    if (!existing) {
      throw new ServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다', { entityType: 'positioning_data', id });
    }

    await db.delete(positioningData).where(eq(positioningData.id, id));
    console.log('[AUDIT]', { action: 'delete', entityType: 'positioning_data', entityId: id, timestamp: new Date() });
  }
}

export const humanoidTrendService = new HumanoidTrendService();
