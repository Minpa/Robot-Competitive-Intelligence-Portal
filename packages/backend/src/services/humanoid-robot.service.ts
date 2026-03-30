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
  field: 'name' | 'company' | 'announcementYear' | 'commercializationStage' | 'competitiveness';
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
    // Prevent duplicate: same company + same name (case-insensitive)
    const [existing] = await db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name })
      .from(humanoidRobots)
      .where(
        and(
          eq(humanoidRobots.companyId, data.companyId),
          sql`lower(${humanoidRobots.name}) = lower(${data.name})`
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(`Robot '${data.name}' already exists for this company (id: ${existing.id})`);
    }

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

    const offset = (pagination.page - 1) * pagination.limit;

    // Competitiveness sort: join spec tables and compute composite score
    if (sort.field === 'competitiveness') {
      const scored = await db
        .select({
          robot: humanoidRobots,
          company: companies,
          maxSpeedMps: bodySpecs.maxSpeedMps,
          dofCount: bodySpecs.dofCount,
          payloadKg: bodySpecs.payloadKg,
          bodyOperationTimeHours: bodySpecs.operationTimeHours,
          fingerCount: handSpecs.fingerCount,
          handDof: handSpecs.handDof,
          gripForceN: handSpecs.gripForceN,
          cameras: sensorSpecs.cameras,
          depthSensor: sensorSpecs.depthSensor,
          touchSensors: sensorSpecs.touchSensors,
          forceTorque: sensorSpecs.forceTorque,
          lidar: sensorSpecs.lidar,
          imu: sensorSpecs.imu,
          powerOperationTimeHours: powerSpecs.operationTimeHours,
          capacityWh: powerSpecs.capacityWh,
          caseCount: sql<number>`(SELECT count(*)::int FROM application_cases WHERE robot_id = ${humanoidRobots.id})`,
          articleCount: sql<number>`(SELECT count(*)::int FROM article_robot_tags WHERE robot_id = ${humanoidRobots.id})`,
        })
        .from(humanoidRobots)
        .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
        .leftJoin(bodySpecs, eq(bodySpecs.robotId, humanoidRobots.id))
        .leftJoin(handSpecs, eq(handSpecs.robotId, humanoidRobots.id))
        .leftJoin(sensorSpecs, eq(sensorSpecs.robotId, humanoidRobots.id))
        .leftJoin(powerSpecs, eq(powerSpecs.robotId, humanoidRobots.id))
        .where(whereClause);

      // Collect non-null values per metric to compute medians for null-fill
      const vals = {
        speed: scored.map(r => r.maxSpeedMps ? Number(r.maxSpeedMps) : null).filter((v): v is number => v !== null),
        dof: scored.map(r => r.dofCount).filter((v): v is number => v !== null),
        payload: scored.map(r => r.payloadKg ? Number(r.payloadKg) : null).filter((v): v is number => v !== null),
        opTime: scored.map(r => {
          const v = r.powerOperationTimeHours ?? r.bodyOperationTimeHours;
          return v ? Number(v) : null;
        }).filter((v): v is number => v !== null),
        capWh: scored.map(r => r.capacityWh ? Number(r.capacityWh) : null).filter((v): v is number => v !== null),
        fingerCount: scored.map(r => r.fingerCount).filter((v): v is number => v !== null),
        handDof: scored.map(r => r.handDof).filter((v): v is number => v !== null),
        gripForce: scored.map(r => r.gripForceN ? Number(r.gripForceN) : null).filter((v): v is number => v !== null),
      };
      const median = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
      };
      const med = {
        speed: median(vals.speed),
        dof: median(vals.dof),
        payload: median(vals.payload),
        opTime: median(vals.opTime),
        capWh: median(vals.capWh),
        fingerCount: median(vals.fingerCount),
        handDof: median(vals.handDof),
        gripForce: median(vals.gripForce),
      };

      // Compute max values for normalization (percentile-like 0-100 mapping)
      const max = {
        speed: Math.max(...vals.speed, 1),
        dof: Math.max(...vals.dof, 1),
        payload: Math.max(...vals.payload, 1),
        opTime: Math.max(...vals.opTime, 1),
        capWh: Math.max(...vals.capWh, 1),
        fingerCount: Math.max(...vals.fingerCount, 1),
        handDof: Math.max(...vals.handDof, 1),
        gripForce: Math.max(...vals.gripForce, 1),
      };
      const norm = (val: number, maxVal: number) => Math.min(100, Math.round((val / maxVal) * 100));

      const withScores = scored.map(row => {
        const speed = row.maxSpeedMps ? Number(row.maxSpeedMps) : med.speed;
        const dof = row.dofCount ?? med.dof;
        const payload = row.payloadKg ? Number(row.payloadKg) : med.payload;
        const opTime = Number(row.powerOperationTimeHours ?? row.bodyOperationTimeHours ?? 0) || med.opTime;
        const capWh = row.capacityWh ? Number(row.capacityWh) : med.capWh;
        const fingerCnt = row.fingerCount ?? med.fingerCount;
        const hDof = row.handDof ?? med.handDof;
        const gripF = row.gripForceN ? Number(row.gripForceN) : med.gripForce;

        // 1. Mobility (0-100): speed 50% + locomotion bonus 20% + DoF 30%
        let mobility = norm(speed, max.speed) * 0.5
          + (row.robot.locomotionType === 'bipedal' ? 20 : row.robot.locomotionType === 'hybrid' ? 10 : 0)
          + norm(dof, max.dof) * 0.3;
        mobility = Math.min(100, Math.round(mobility));

        // 2. Manipulation (0-100): handDof 35% + gripForce 35% + fingerCount 15% + payload 15%
        let manipulation = norm(hDof, max.handDof) * 0.35
          + norm(gripF, max.gripForce) * 0.35
          + norm(fingerCnt, max.fingerCount) * 0.15
          + norm(payload, max.payload) * 0.15;
        manipulation = Math.min(100, Math.round(manipulation));

        // 3. Interaction (0-100): sensor presence with graduated scoring
        let interaction = 0;
        if (row.cameras) {
          // Count total cameras for graduated score
          const camArr = row.cameras as { count: number }[];
          const totalCams = camArr.reduce((sum, c) => sum + (c.count || 1), 0);
          interaction += Math.min(30, totalCams * 10); // up to 30
        }
        if (row.depthSensor) interaction += 20;
        if (row.lidar) interaction += 15;
        if (row.imu) interaction += 10;
        if (row.forceTorque) interaction += 15;
        if (row.touchSensors) {
          const touchArr = row.touchSensors as { location: string }[];
          interaction += Math.min(10, touchArr.length * 5);
        }
        interaction = Math.min(100, interaction);

        // 4. Safety (0-100): forceTorque 35% + DoF 30% + sensors breadth 35%
        let sensorBreadth = 0;
        if (row.cameras) sensorBreadth++;
        if (row.depthSensor) sensorBreadth++;
        if (row.lidar) sensorBreadth++;
        if (row.imu) sensorBreadth++;
        if (row.forceTorque) sensorBreadth++;
        if (row.touchSensors) sensorBreadth++;
        let safety = (row.forceTorque ? 35 : 0)
          + norm(dof, max.dof) * 0.3
          + Math.min(35, sensorBreadth * 7);
        safety = Math.min(100, Math.round(safety));

        // 5. Efficiency (0-100): opTime 50% + battery capacity 50%
        let efficiency = norm(opTime, max.opTime) * 0.5
          + norm(capWh, max.capWh) * 0.5;
        efficiency = Math.min(100, Math.round(efficiency));

        // 6. Market validation (0-100): cases + articles
        const caseCount = row.caseCount || 0;
        const articleCount = row.articleCount || 0;
        // Scale: 5 cases = 50pts, 10 articles = 50pts (max 100)
        let marketValidation = Math.min(50, caseCount * 10) + Math.min(50, articleCount * 5);
        marketValidation = Math.min(100, marketValidation);

        // Stage multiplier (concept=0.5, prototype=0.65, poc=0.8, pilot=0.9, commercial=1.0)
        let stageMul = 0.5;
        switch (row.robot.commercializationStage) {
          case 'commercial': stageMul = 1.0; break;
          case 'pilot': stageMul = 0.9; break;
          case 'poc': stageMul = 0.8; break;
          case 'prototype': stageMul = 0.65; break;
        }

        // Weighted composite: specs 70%, market 15%, stage 15%
        const specAvg = (mobility + manipulation + interaction + safety + efficiency) / 5;
        const compositeScore = Math.round(specAvg * 0.70 + marketValidation * 0.15 + stageMul * 100 * 0.15);

        return {
          robot: row.robot,
          company: row.company,
          competitivenessScore: compositeScore,
        };
      });

      // Sort by composite score
      withScores.sort((a, b) =>
        sort.direction === 'desc'
          ? b.competitivenessScore - a.competitivenessScore
          : a.competitivenessScore - b.competitivenessScore
      );

      const paged = withScores.slice(offset, offset + pagination.limit);

      return {
        data: paged.map(r => ({ robot: r.robot, company: r.company, competitivenessScore: r.competitivenessScore })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count,
          totalPages: Math.ceil(count / pagination.limit),
        },
      };
    }

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
    const locomotionTypes = ['biped', 'wheeled', 'hybrid'];
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

    // Fetch dataset-wide stats for relative normalization
    const allSpecs = await db
      .select({
        maxSpeedMps: bodySpecs.maxSpeedMps,
        dofCount: bodySpecs.dofCount,
        payloadKg: bodySpecs.payloadKg,
        bodyOpTime: bodySpecs.operationTimeHours,
        fingerCount: handSpecs.fingerCount,
        handDof: handSpecs.handDof,
        gripForceN: handSpecs.gripForceN,
        powerOpTime: powerSpecs.operationTimeHours,
        capacityWh: powerSpecs.capacityWh,
      })
      .from(humanoidRobots)
      .leftJoin(bodySpecs, eq(bodySpecs.robotId, humanoidRobots.id))
      .leftJoin(handSpecs, eq(handSpecs.robotId, humanoidRobots.id))
      .leftJoin(powerSpecs, eq(powerSpecs.robotId, humanoidRobots.id));

    const collect = (arr: (number | null)[]) => arr.filter((v): v is number => v !== null);
    const medianOf = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
    };
    const maxOf = (arr: number[]) => Math.max(...arr, 1);
    const norm = (val: number, maxVal: number) => Math.min(100, Math.round((val / maxVal) * 100));

    const speeds = collect(allSpecs.map(r => r.maxSpeedMps ? Number(r.maxSpeedMps) : null));
    const dofs = collect(allSpecs.map(r => r.dofCount));
    const payloads = collect(allSpecs.map(r => r.payloadKg ? Number(r.payloadKg) : null));
    const opTimes = collect(allSpecs.map(r => {
      const v = r.powerOpTime ?? r.bodyOpTime;
      return v ? Number(v) : null;
    }));
    const capWhs = collect(allSpecs.map(r => r.capacityWh ? Number(r.capacityWh) : null));
    const fingers = collect(allSpecs.map(r => r.fingerCount));
    const hDofs = collect(allSpecs.map(r => r.handDof));
    const grips = collect(allSpecs.map(r => r.gripForceN ? Number(r.gripForceN) : null));

    const speed = robot.bodySpec?.maxSpeedMps ? Number(robot.bodySpec.maxSpeedMps) : medianOf(speeds);
    const dof = robot.bodySpec?.dofCount ?? medianOf(dofs);
    const payload = robot.bodySpec?.payloadKg ? Number(robot.bodySpec.payloadKg) : medianOf(payloads);
    const opTime = Number(robot.powerSpec?.operationTimeHours ?? robot.bodySpec?.operationTimeHours ?? 0) || medianOf(opTimes);
    const capWh = robot.powerSpec?.capacityWh ? Number(robot.powerSpec.capacityWh) : medianOf(capWhs);
    const fingerCnt = robot.handSpec?.fingerCount ?? medianOf(fingers);
    const hDof = robot.handSpec?.handDof ?? medianOf(hDofs);
    const gripF = robot.handSpec?.gripForceN ? Number(robot.handSpec.gripForceN) : medianOf(grips);

    // 1. Mobility: speed 50% + locomotion bonus 20% + DoF 30%
    let mobility = norm(speed, maxOf(speeds)) * 0.5
      + (robot.robot.locomotionType === 'bipedal' ? 20 : robot.robot.locomotionType === 'hybrid' ? 10 : 0)
      + norm(dof, maxOf(dofs)) * 0.3;
    mobility = Math.min(100, Math.round(mobility));

    // 2. Manipulation: handDof 35% + gripForce 35% + fingerCount 15% + payload 15%
    let manipulation = norm(hDof, maxOf(hDofs)) * 0.35
      + norm(gripF, maxOf(grips)) * 0.35
      + norm(fingerCnt, maxOf(fingers)) * 0.15
      + norm(payload, maxOf(payloads)) * 0.15;
    manipulation = Math.min(100, Math.round(manipulation));

    // 3. Interaction: graduated sensor scoring
    let interaction = 0;
    if (robot.sensorSpec) {
      if (robot.sensorSpec.cameras) {
        const camArr = robot.sensorSpec.cameras as { count: number }[];
        const totalCams = camArr.reduce((sum, c) => sum + (c.count || 1), 0);
        interaction += Math.min(30, totalCams * 10);
      }
      if (robot.sensorSpec.depthSensor) interaction += 20;
      if (robot.sensorSpec.lidar) interaction += 15;
      if (robot.sensorSpec.imu) interaction += 10;
      if (robot.sensorSpec.forceTorque) interaction += 15;
      if (robot.sensorSpec.touchSensors) {
        const touchArr = robot.sensorSpec.touchSensors as { location: string }[];
        interaction += Math.min(10, touchArr.length * 5);
      }
    }
    interaction = Math.min(100, interaction);

    // 4. Safety: forceTorque 35% + DoF 30% + sensor breadth 35%
    let sensorBreadth = 0;
    if (robot.sensorSpec?.cameras) sensorBreadth++;
    if (robot.sensorSpec?.depthSensor) sensorBreadth++;
    if (robot.sensorSpec?.lidar) sensorBreadth++;
    if (robot.sensorSpec?.imu) sensorBreadth++;
    if (robot.sensorSpec?.forceTorque) sensorBreadth++;
    if (robot.sensorSpec?.touchSensors) sensorBreadth++;
    let safety = (robot.sensorSpec?.forceTorque ? 35 : 0)
      + norm(dof, maxOf(dofs)) * 0.3
      + Math.min(35, sensorBreadth * 7);
    safety = Math.min(100, Math.round(safety));

    // 5. Efficiency: opTime 50% + battery capacity 50%
    let efficiency = norm(opTime, maxOf(opTimes)) * 0.5
      + norm(capWh, maxOf(capWhs)) * 0.5;
    efficiency = Math.min(100, Math.round(efficiency));

    return {
      labels: ['이동성', '조작성', '상호작용', '안전성', '효율성'],
      values: [mobility, manipulation, interaction, safety, efficiency],
    };
  }

  /**
   * Get summary statistics
   */
  /**
   * Find duplicate robots: same companyId + same name (case-insensitive).
   * Also finds cross-company near-duplicates (same normalized name).
   */
  async findDuplicates() {
    const all = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        companyId: humanoidRobots.companyId,
        companyName: companies.name,
        createdAt: humanoidRobots.createdAt,
      })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .orderBy(humanoidRobots.companyId, humanoidRobots.name);

    // Group by companyId + lowercased name
    const groups = new Map<string, typeof all>();
    for (const robot of all) {
      const key = `${robot.companyId}::${robot.name.toLowerCase().trim()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(robot);
    }

    const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);

    return {
      totalRobots: all.length,
      duplicateGroups: duplicates.length,
      duplicates: duplicates.map((group) => ({
        companyName: group[0]?.companyName,
        name: group[0]?.name,
        count: group.length,
        robots: group.map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt })),
      })),
    };
  }

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
