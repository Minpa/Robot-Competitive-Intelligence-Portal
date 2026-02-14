import { eq, and, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import {
  db,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
  companies,
  applicationCases,
  articleRobotTags,
  articles,
} from '../db/index.js';

export interface RobotFilters {
  purpose?: string;
  locomotionType?: string;
  handType?: string;
  commercializationStage?: string;
  region?: string;
  companyId?: string;
  announcementYearMin?: number;
  announcementYearMax?: number;
  search?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: 'name' | 'company' | 'announcementYear' | 'commercializationStage';
  direction: 'asc' | 'desc';
}

export interface CreateHumanoidRobotDto {
  companyId: string;
  name: string;
  announcementYear?: number;
  status?: string;
  purpose?: string;
  locomotionType?: string;
  handType?: string;
  commercializationStage?: string;
  region?: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateHumanoidRobotDto extends Partial<CreateHumanoidRobotDto> {}

export interface BodySpecDto {
  heightCm?: number;
  weightKg?: number;
  payloadKg?: number;
  dofCount?: number;
  maxSpeedMps?: number;
  operationTimeHours?: number;
}

export interface HandSpecDto {
  handType?: string;
  fingerCount?: number;
  handDof?: number;
  gripForceN?: number;
  isInterchangeable?: boolean;
}

export interface ComputingSpecDto {
  mainSoc?: string;
  topsMin?: number;
  topsMax?: number;
  architectureType?: string;
}

export interface SensorSpecDto {
  cameras?: { type: string; count: number; resolution?: string }[];
  depthSensor?: string;
  lidar?: string;
  imu?: string;
  forceTorque?: string;
  touchSensors?: { location: string; type: string }[];
}

export interface PowerSpecDto {
  batteryType?: string;
  capacityWh?: number;
  operationTimeHours?: number;
  chargingMethod?: string;
}

export class HumanoidRobotService {
  /**
   * Create a new humanoid robot
   */
  async createRobot(data: CreateHumanoidRobotDto) {
    const [robot] = await db
      .insert(humanoidRobots)
      .values({
        companyId: data.companyId,
        name: data.name,
        announcementYear: data.announcementYear,
        status: data.status || 'development',
        purpose: data.purpose,
        locomotionType: data.locomotionType,
        handType: data.handType,
        commercializationStage: data.commercializationStage,
        region: data.region,
        imageUrl: data.imageUrl,
        description: data.description,
      })
      .returning();

    return robot;
  }

  /**
   * Get robot by ID with all specs
   */
  async getRobot(id: string) {
    const [robot] = await db
      .select()
      .from(humanoidRobots)
      .where(eq(humanoidRobots.id, id))
      .limit(1);

    if (!robot) return null;

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, robot.companyId))
      .limit(1);

    const [bodySpec] = await db
      .select()
      .from(bodySpecs)
      .where(eq(bodySpecs.robotId, id))
      .limit(1);

    const [handSpec] = await db
      .select()
      .from(handSpecs)
      .where(eq(handSpecs.robotId, id))
      .limit(1);

    const [computingSpec] = await db
      .select()
      .from(computingSpecs)
      .where(eq(computingSpecs.robotId, id))
      .limit(1);

    const [sensorSpec] = await db
      .select()
      .from(sensorSpecs)
      .where(eq(sensorSpecs.robotId, id))
      .limit(1);

    const [powerSpec] = await db
      .select()
      .from(powerSpecs)
      .where(eq(powerSpecs.robotId, id))
      .limit(1);

    const cases = await db
      .select()
      .from(applicationCases)
      .where(eq(applicationCases.robotId, id));

    // Get related articles
    const robotTags = await db
      .select({ articleId: articleRobotTags.articleId })
      .from(articleRobotTags)
      .where(eq(articleRobotTags.robotId, id));

    let relatedArticles: typeof articles.$inferSelect[] = [];
    if (robotTags.length > 0) {
      relatedArticles = await db
        .select()
        .from(articles)
        .where(inArray(articles.id, robotTags.map(t => t.articleId)))
        .orderBy(desc(articles.publishedAt))
        .limit(10);
    }

    return {
      robot,
      company,
      bodySpec,
      handSpec,
      computingSpec,
      sensorSpec,
      powerSpec,
      applicationCases: cases,
      relatedArticles,
    };
  }

  /**
   * Update robot
   */
  async updateRobot(id: string, data: UpdateHumanoidRobotDto) {
    const [robot] = await db
      .update(humanoidRobots)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(humanoidRobots.id, id))
      .returning();

    return robot;
  }

  /**
   * Delete robot
   */
  async deleteRobot(id: string) {
    await db.delete(humanoidRobots).where(eq(humanoidRobots.id, id));
  }

  /**
   * List robots with filtering, sorting, and pagination
   */
  async listRobots(
    filters: RobotFilters = {},
    pagination: Pagination = { page: 1, limit: 20 },
    sort: SortOptions = { field: 'name', direction: 'asc' }
  ) {
    const conditions = [];

    if (filters.purpose) {
      conditions.push(eq(humanoidRobots.purpose, filters.purpose));
    }
    if (filters.locomotionType) {
      conditions.push(eq(humanoidRobots.locomotionType, filters.locomotionType));
    }
    if (filters.handType) {
      conditions.push(eq(humanoidRobots.handType, filters.handType));
    }
    if (filters.commercializationStage) {
      conditions.push(eq(humanoidRobots.commercializationStage, filters.commercializationStage));
    }
    if (filters.region) {
      conditions.push(eq(humanoidRobots.region, filters.region));
    }
    if (filters.companyId) {
      conditions.push(eq(humanoidRobots.companyId, filters.companyId));
    }
    if (filters.announcementYearMin) {
      conditions.push(sql`${humanoidRobots.announcementYear} >= ${filters.announcementYearMin}`);
    }
    if (filters.announcementYearMax) {
      conditions.push(sql`${humanoidRobots.announcementYear} <= ${filters.announcementYearMax}`);
    }
    if (filters.search) {
      conditions.push(ilike(humanoidRobots.name, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(humanoidRobots)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    // Determine sort order
    let orderBy;
    const sortDir = sort.direction === 'desc' ? desc : asc;
    switch (sort.field) {
      case 'announcementYear':
        orderBy = sortDir(humanoidRobots.announcementYear);
        break;
      case 'commercializationStage':
        orderBy = sortDir(humanoidRobots.commercializationStage);
        break;
      default:
        orderBy = sortDir(humanoidRobots.name);
    }

    // Get paginated results with company info
    const offset = (pagination.page - 1) * pagination.limit;
    const robots = await db
      .select({
        robot: humanoidRobots,
        company: companies,
      })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(offset);

    return {
      data: robots,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        totalPages: Math.ceil(count / pagination.limit),
      },
    };
  }

  /**
   * Search robots by name
   */
  async searchRobots(query: string, limit = 10) {
    const robots = await db
      .select({
        robot: humanoidRobots,
        company: companies,
      })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(ilike(humanoidRobots.name, `%${query}%`))
      .limit(limit);

    return robots;
  }

  // ============================================
  // Spec Management
  // ============================================

  async upsertBodySpec(robotId: string, data: BodySpecDto) {
    const existing = await db
      .select()
      .from(bodySpecs)
      .where(eq(bodySpecs.robotId, robotId))
      .limit(1);

    // Convert number fields to string for decimal columns
    const dbData: Record<string, unknown> = {};
    if (data.heightCm !== undefined) dbData.heightCm = String(data.heightCm);
    if (data.weightKg !== undefined) dbData.weightKg = String(data.weightKg);
    if (data.payloadKg !== undefined) dbData.payloadKg = String(data.payloadKg);
    if (data.dofCount !== undefined) dbData.dofCount = data.dofCount;
    if (data.maxSpeedMps !== undefined) dbData.maxSpeedMps = String(data.maxSpeedMps);
    if (data.operationTimeHours !== undefined) dbData.operationTimeHours = String(data.operationTimeHours);

    if (existing.length > 0) {
      const [spec] = await db
        .update(bodySpecs)
        .set({ ...dbData, updatedAt: new Date() })
        .where(eq(bodySpecs.robotId, robotId))
        .returning();
      return spec;
    } else {
      const [spec] = await db
        .insert(bodySpecs)
        .values({ robotId, ...dbData })
        .returning();
      return spec;
    }
  }

  async upsertHandSpec(robotId: string, data: HandSpecDto) {
    const existing = await db
      .select()
      .from(handSpecs)
      .where(eq(handSpecs.robotId, robotId))
      .limit(1);

    // Convert number fields to string for decimal columns
    const dbData: Record<string, unknown> = {};
    if (data.handType !== undefined) dbData.handType = data.handType;
    if (data.fingerCount !== undefined) dbData.fingerCount = data.fingerCount;
    if (data.handDof !== undefined) dbData.handDof = data.handDof;
    if (data.gripForceN !== undefined) dbData.gripForceN = String(data.gripForceN);
    if (data.isInterchangeable !== undefined) dbData.isInterchangeable = data.isInterchangeable;

    if (existing.length > 0) {
      const [spec] = await db
        .update(handSpecs)
        .set({ ...dbData, updatedAt: new Date() })
        .where(eq(handSpecs.robotId, robotId))
        .returning();
      return spec;
    } else {
      const [spec] = await db
        .insert(handSpecs)
        .values({ robotId, ...dbData })
        .returning();
      return spec;
    }
  }

  async upsertComputingSpec(robotId: string, data: ComputingSpecDto) {
    const existing = await db
      .select()
      .from(computingSpecs)
      .where(eq(computingSpecs.robotId, robotId))
      .limit(1);

    // Convert number fields to string for decimal columns
    const dbData: Record<string, unknown> = {};
    if (data.mainSoc !== undefined) dbData.mainSoc = data.mainSoc;
    if (data.topsMin !== undefined) dbData.topsMin = String(data.topsMin);
    if (data.topsMax !== undefined) dbData.topsMax = String(data.topsMax);
    if (data.architectureType !== undefined) dbData.architectureType = data.architectureType;

    if (existing.length > 0) {
      const [spec] = await db
        .update(computingSpecs)
        .set({ ...dbData, updatedAt: new Date() })
        .where(eq(computingSpecs.robotId, robotId))
        .returning();
      return spec;
    } else {
      const [spec] = await db
        .insert(computingSpecs)
        .values({ robotId, ...dbData })
        .returning();
      return spec;
    }
  }

  async upsertSensorSpec(robotId: string, data: SensorSpecDto) {
    const existing = await db
      .select()
      .from(sensorSpecs)
      .where(eq(sensorSpecs.robotId, robotId))
      .limit(1);

    if (existing.length > 0) {
      const [spec] = await db
        .update(sensorSpecs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sensorSpecs.robotId, robotId))
        .returning();
      return spec;
    } else {
      const [spec] = await db
        .insert(sensorSpecs)
        .values({ robotId, ...data })
        .returning();
      return spec;
    }
  }

  async upsertPowerSpec(robotId: string, data: PowerSpecDto) {
    const existing = await db
      .select()
      .from(powerSpecs)
      .where(eq(powerSpecs.robotId, robotId))
      .limit(1);

    // Convert number fields to string for decimal columns
    const dbData: Record<string, unknown> = {};
    if (data.batteryType !== undefined) dbData.batteryType = data.batteryType;
    if (data.capacityWh !== undefined) dbData.capacityWh = String(data.capacityWh);
    if (data.operationTimeHours !== undefined) dbData.operationTimeHours = String(data.operationTimeHours);
    if (data.chargingMethod !== undefined) dbData.chargingMethod = data.chargingMethod;

    if (existing.length > 0) {
      const [spec] = await db
        .update(powerSpecs)
        .set({ ...dbData, updatedAt: new Date() })
        .where(eq(powerSpecs.robotId, robotId))
        .returning();
      return spec;
    } else {
      const [spec] = await db
        .insert(powerSpecs)
        .values({ robotId, ...dbData })
        .returning();
      return spec;
    }
  }

  // ============================================
  // Dashboard Data
  // ============================================

  /**
   * Get segment matrix data (locomotion x purpose)
   */
  async getSegmentMatrix() {
    const robots = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        purpose: humanoidRobots.purpose,
        locomotionType: humanoidRobots.locomotionType,
      })
      .from(humanoidRobots);

    const matrix: Record<string, Record<string, { count: number; robots: { id: string; name: string }[] }>> = {};
    const locomotionTypes = ['bipedal', 'wheeled', 'hybrid'];
    const purposes = ['industrial', 'home', 'service'];

    // Initialize matrix
    for (const locomotion of locomotionTypes) {
      matrix[locomotion] = {};
      for (const purpose of purposes) {
        matrix[locomotion][purpose] = { count: 0, robots: [] };
      }
    }

    // Fill matrix
    for (const robot of robots) {
      if (robot.locomotionType && robot.purpose) {
        const locomotionData = matrix[robot.locomotionType];
        if (locomotionData) {
          const purposeData = locomotionData[robot.purpose];
          if (purposeData) {
            purposeData.count++;
            purposeData.robots.push({
              id: robot.id,
              name: robot.name,
            });
          }
        }
      }
    }

    return {
      rows: locomotionTypes,
      columns: purposes,
      matrix,
      totalCount: robots.length,
    };
  }

  /**
   * Get hand type distribution
   */
  async getHandTypeDistribution() {
    const result = await db
      .select({
        handType: humanoidRobots.handType,
        count: sql<number>`count(*)::int`,
      })
      .from(humanoidRobots)
      .where(sql`${humanoidRobots.handType} IS NOT NULL`)
      .groupBy(humanoidRobots.handType);

    return result;
  }

  /**
   * Get radar chart data for a robot
   */
  async getRadarChartData(robotId: string) {
    const robot = await this.getRobot(robotId);
    if (!robot) return null;

    // Calculate scores based on specs (0-100 scale)
    const scores = {
      mobility: 0,
      manipulation: 0,
      interaction: 0,
      safety: 0,
      efficiency: 0,
    };

    // Mobility score based on speed and locomotion
    if (robot.bodySpec?.maxSpeedMps) {
      scores.mobility = Math.min(100, Number(robot.bodySpec.maxSpeedMps) * 50);
    }
    if (robot.robot.locomotionType === 'bipedal') {
      scores.mobility = Math.min(100, scores.mobility + 20);
    }

    // Manipulation score based on hand specs
    if (robot.handSpec) {
      if (robot.handSpec.fingerCount) {
        scores.manipulation += robot.handSpec.fingerCount * 10;
      }
      if (robot.handSpec.handDof) {
        scores.manipulation += robot.handSpec.handDof * 3;
      }
      if (robot.handSpec.gripForceN) {
        scores.manipulation += Math.min(30, Number(robot.handSpec.gripForceN) / 10);
      }
      scores.manipulation = Math.min(100, scores.manipulation);
    }

    // Interaction score based on sensors
    if (robot.sensorSpec) {
      if (robot.sensorSpec.cameras) {
        scores.interaction += 20;
      }
      if (robot.sensorSpec.depthSensor) {
        scores.interaction += 20;
      }
      if (robot.sensorSpec.touchSensors) {
        scores.interaction += 30;
      }
      if (robot.sensorSpec.forceTorque) {
        scores.interaction += 30;
      }
      scores.interaction = Math.min(100, scores.interaction);
    }

    // Safety score based on sensors and DoF
    if (robot.sensorSpec?.forceTorque) {
      scores.safety += 40;
    }
    if (robot.bodySpec?.dofCount && robot.bodySpec.dofCount > 20) {
      scores.safety += 30;
    }
    scores.safety = Math.min(100, scores.safety + 30); // Base safety

    // Efficiency score based on operation time and weight
    if (robot.powerSpec?.operationTimeHours) {
      scores.efficiency = Math.min(100, Number(robot.powerSpec.operationTimeHours) * 20);
    }

    return {
      labels: ['이동성', '조작성', '상호작용', '안전성', '효율성'],
      values: [scores.mobility, scores.manipulation, scores.interaction, scores.safety, scores.efficiency],
    };
  }

  /**
   * Get summary statistics
   */
  async getSummary() {
    const totalResult = await db
      .select({ totalRobots: sql<number>`count(*)::int` })
      .from(humanoidRobots);
    const totalRobots = totalResult[0]?.totalRobots ?? 0;

    const byStage = await db
      .select({
        stage: humanoidRobots.commercializationStage,
        count: sql<number>`count(*)::int`,
      })
      .from(humanoidRobots)
      .where(sql`${humanoidRobots.commercializationStage} IS NOT NULL`)
      .groupBy(humanoidRobots.commercializationStage);

    const byRegion = await db
      .select({
        region: humanoidRobots.region,
        count: sql<number>`count(*)::int`,
      })
      .from(humanoidRobots)
      .where(sql`${humanoidRobots.region} IS NOT NULL`)
      .groupBy(humanoidRobots.region);

    const byPurpose = await db
      .select({
        purpose: humanoidRobots.purpose,
        count: sql<number>`count(*)::int`,
      })
      .from(humanoidRobots)
      .where(sql`${humanoidRobots.purpose} IS NOT NULL`)
      .groupBy(humanoidRobots.purpose);

    return {
      totalRobots,
      byStage: Object.fromEntries(byStage.map(s => [s.stage ?? 'unknown', s.count])),
      byRegion: Object.fromEntries(byRegion.map(r => [r.region ?? 'unknown', r.count])),
      byPurpose: Object.fromEntries(byPurpose.map(p => [p.purpose ?? 'unknown', p.count])),
    };
  }
}

export const humanoidRobotService = new HumanoidRobotService();
