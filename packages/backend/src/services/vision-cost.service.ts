import { eq, asc } from 'drizzle-orm';
import { db, visionSensorBomParts, visionSensorRobotCosts } from '../db/index.js';

// ============================================
// Vision Cost Service
// 비전 센서 시스템 원가 분석 데이터 서비스
// ============================================

export class VisionCostServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'VALIDATION_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'VisionCostServiceError';
  }
}

export const visionCostService = {
  // BOM 부품 단가 기준표 전체 조회
  async getBomParts() {
    const rows = await db
      .select()
      .from(visionSensorBomParts)
      .orderBy(asc(visionSensorBomParts.partType), asc(visionSensorBomParts.partName));
    return rows;
  },

  // 로봇별 비전 시스템 원가 타임라인 전체 조회
  async getRobotCosts() {
    const rows = await db
      .select()
      .from(visionSensorRobotCosts)
      .orderBy(asc(visionSensorRobotCosts.companyName), asc(visionSensorRobotCosts.releaseYear));
    return rows.map((r) => ({
      ...r,
      performanceLevel: parseFloat(String(r.performanceLevel)),
    }));
  },

  // 회사별 필터링
  async getRobotCostsByCompany(companyName: string) {
    const rows = await db
      .select()
      .from(visionSensorRobotCosts)
      .where(eq(visionSensorRobotCosts.companyName, companyName))
      .orderBy(asc(visionSensorRobotCosts.releaseYear));
    return rows.map((r) => ({
      ...r,
      performanceLevel: parseFloat(String(r.performanceLevel)),
    }));
  },

  // 버블 차트용 데이터 (연도 × 원가 × 성능레벨)
  async getBubbleChartData() {
    const rows = await db
      .select()
      .from(visionSensorRobotCosts)
      .orderBy(asc(visionSensorRobotCosts.releaseYear));
    return rows.map((r) => ({
      id: r.id,
      label: r.robotLabel,
      companyName: r.companyName,
      year: r.releaseYear,
      totalCostUsd: r.totalCostUsd,
      performanceLevel: parseFloat(String(r.performanceLevel)),
      performanceNote: r.performanceNote,
      isForecast: r.isForecast,
      reliabilityGrade: r.reliabilityGrade,
    }));
  },

  // BOM 부품 생성
  async createBomPart(data: {
    partName: string;
    partType: string;
    unitPriceMin: number;
    unitPriceMax: number;
    unitPriceMid: number;
    priceUnit?: string;
    sourceBasis?: string;
    sourceReliability?: string;
    exampleRobot?: string;
    notes?: string;
  }) {
    const [row] = await db
      .insert(visionSensorBomParts)
      .values(data)
      .returning();
    return row;
  },

  // 로봇 원가 기록 생성
  async createRobotCost(data: {
    robotId?: string;
    robotLabel: string;
    companyName: string;
    releaseYear: number;
    isForecast?: boolean;
    cameraDesc?: string;
    cameraCostUsd: number;
    lidarDepthDesc?: string;
    lidarDepthCostUsd: number;
    computeDesc?: string;
    computeCostUsd: number;
    totalCostUsd: number;
    performanceLevel: string;
    performanceNote?: string;
    reliabilityGrade?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [row] = await db
      .insert(visionSensorRobotCosts)
      .values(data)
      .returning();
    return row;
  },

  // 로봇 원가 기록 수정
  async updateRobotCost(id: string, data: Partial<{
    robotLabel: string;
    releaseYear: number;
    isForecast: boolean;
    cameraDesc: string;
    cameraCostUsd: number;
    lidarDepthDesc: string;
    lidarDepthCostUsd: number;
    computeDesc: string;
    computeCostUsd: number;
    totalCostUsd: number;
    performanceLevel: string;
    performanceNote: string;
    reliabilityGrade: string;
    metadata: Record<string, unknown>;
  }>) {
    const existing = await db
      .select()
      .from(visionSensorRobotCosts)
      .where(eq(visionSensorRobotCosts.id, id))
      .limit(1);
    if (!existing.length) throw new VisionCostServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다.');

    const [row] = await db
      .update(visionSensorRobotCosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(visionSensorRobotCosts.id, id))
      .returning();
    return row;
  },

  // 로봇 원가 기록 삭제
  async deleteRobotCost(id: string) {
    const existing = await db
      .select()
      .from(visionSensorRobotCosts)
      .where(eq(visionSensorRobotCosts.id, id))
      .limit(1);
    if (!existing.length) throw new VisionCostServiceError('NOT_FOUND', '해당 레코드를 찾을 수 없습니다.');
    await db.delete(visionSensorRobotCosts).where(eq(visionSensorRobotCosts.id, id));
  },
};
