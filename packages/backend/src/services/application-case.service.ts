import { eq, and, sql, desc, asc } from 'drizzle-orm';
import {
  db,
  applicationCases,
  humanoidRobots,
  companies,
} from '../db/index.js';

export interface CreateApplicationCaseDto {
  robotId: string;
  environmentType?: string;
  taskType?: string;
  taskDescription?: string;
  deploymentStatus?: string;
  demoEvent?: string;
  demoDate?: string;
  videoUrl?: string;
  notes?: string;
}

export interface UpdateApplicationCaseDto extends Partial<Omit<CreateApplicationCaseDto, 'robotId'>> {}

export interface ApplicationCaseFilters {
  robotId?: string;
  environmentType?: string;
  taskType?: string;
  deploymentStatus?: string;
}

export class ApplicationCaseService {
  /**
   * Create a new application case
   */
  async createCase(data: CreateApplicationCaseDto) {
    const [appCase] = await db
      .insert(applicationCases)
      .values({
        robotId: data.robotId,
        environmentType: data.environmentType,
        taskType: data.taskType,
        taskDescription: data.taskDescription,
        deploymentStatus: data.deploymentStatus,
        demoEvent: data.demoEvent,
        demoDate: data.demoDate,
        videoUrl: data.videoUrl,
        notes: data.notes,
      })
      .returning();

    return appCase;
  }

  /**
   * Get application case by ID
   */
  async getCase(id: string) {
    const [appCase] = await db
      .select({
        case: applicationCases,
        robot: humanoidRobots,
        company: companies,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(applicationCases.id, id))
      .limit(1);

    return appCase || null;
  }

  /**
   * Update application case
   */
  async updateCase(id: string, data: UpdateApplicationCaseDto) {
    const [appCase] = await db
      .update(applicationCases)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(applicationCases.id, id))
      .returning();

    return appCase;
  }

  /**
   * Delete application case
   */
  async deleteCase(id: string) {
    await db.delete(applicationCases).where(eq(applicationCases.id, id));
  }

  /**
   * List cases by robot
   */
  async listCasesByRobot(robotId: string) {
    const cases = await db
      .select()
      .from(applicationCases)
      .where(eq(applicationCases.robotId, robotId))
      .orderBy(desc(applicationCases.demoDate));

    return cases;
  }

  /**
   * List cases by environment
   */
  async listCasesByEnvironment(environmentType: string) {
    const cases = await db
      .select({
        case: applicationCases,
        robot: humanoidRobots,
        company: companies,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(applicationCases.environmentType, environmentType))
      .orderBy(desc(applicationCases.demoDate));

    return cases;
  }

  /**
   * List cases by task
   */
  async listCasesByTask(taskType: string) {
    const cases = await db
      .select({
        case: applicationCases,
        robot: humanoidRobots,
        company: companies,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(applicationCases.taskType, taskType))
      .orderBy(desc(applicationCases.demoDate));

    return cases;
  }

  /**
   * List all cases with filters
   */
  async listCases(
    filters: ApplicationCaseFilters = {},
    pagination = { page: 1, limit: 20 }
  ) {
    const conditions = [];

    if (filters.robotId) {
      conditions.push(eq(applicationCases.robotId, filters.robotId));
    }
    if (filters.environmentType) {
      conditions.push(eq(applicationCases.environmentType, filters.environmentType));
    }
    if (filters.taskType) {
      conditions.push(eq(applicationCases.taskType, filters.taskType));
    }
    if (filters.deploymentStatus) {
      conditions.push(eq(applicationCases.deploymentStatus, filters.deploymentStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applicationCases)
      .where(whereClause);
    
    const total = countResult[0]?.count ?? 0;

    const offset = (pagination.page - 1) * pagination.limit;
    const cases = await db
      .select({
        case: applicationCases,
        robot: humanoidRobots,
        company: companies,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(whereClause)
      .orderBy(desc(applicationCases.demoDate))
      .limit(pagination.limit)
      .offset(offset);

    return {
      data: cases,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  // ============================================
  // Dashboard Data
  // ============================================

  /**
   * Get environment-task matrix
   */
  async getEnvironmentTaskMatrix() {
    const cases = await db
      .select({
        environmentType: applicationCases.environmentType,
        taskType: applicationCases.taskType,
        robotId: applicationCases.robotId,
        robotName: humanoidRobots.name,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id));

    const environments = ['factory', 'warehouse', 'retail', 'healthcare', 'hospitality', 'home', 'research_lab', 'other'];
    const tasks = ['assembly', 'picking', 'packing', 'inspection', 'delivery', 'cleaning', 'assistance', 'other'];

    const matrix: Record<string, Record<string, { count: number; robots: string[] }>> = {};

    // Initialize matrix
    for (const env of environments) {
      matrix[env] = {};
      for (const task of tasks) {
        matrix[env][task] = { count: 0, robots: [] };
      }
    }

    // Fill matrix
    for (const c of cases) {
      const envType = c.environmentType;
      const taskType = c.taskType;
      if (envType && taskType && matrix[envType] && matrix[envType][taskType]) {
        matrix[envType][taskType].count++;
        if (c.robotName && !matrix[envType][taskType].robots.includes(c.robotName)) {
          matrix[envType][taskType].robots.push(c.robotName);
        }
      }
    }

    return {
      rows: environments,
      columns: tasks,
      matrix,
    };
  }

  /**
   * Get deployment status distribution
   */
  async getDeploymentStatusDistribution() {
    const result = await db
      .select({
        status: applicationCases.deploymentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(applicationCases)
      .where(sql`${applicationCases.deploymentStatus} IS NOT NULL`)
      .groupBy(applicationCases.deploymentStatus);

    return result;
  }

  /**
   * Get demo timeline
   */
  async getDemoTimeline(startDate?: Date, endDate?: Date) {
    const conditions = [];

    if (startDate) {
      conditions.push(sql`${applicationCases.demoDate} >= ${startDate.toISOString().split('T')[0]}`);
    }
    if (endDate) {
      conditions.push(sql`${applicationCases.demoDate} <= ${endDate.toISOString().split('T')[0]}`);
    }

    const whereClause = conditions.length > 0 
      ? and(sql`${applicationCases.demoDate} IS NOT NULL`, ...conditions)
      : sql`${applicationCases.demoDate} IS NOT NULL`;

    const events = await db
      .select({
        id: applicationCases.id,
        demoDate: applicationCases.demoDate,
        demoEvent: applicationCases.demoEvent,
        environmentType: applicationCases.environmentType,
        taskType: applicationCases.taskType,
        robotName: humanoidRobots.name,
        companyName: companies.name,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(whereClause)
      .orderBy(asc(applicationCases.demoDate));

    return events;
  }

  /**
   * Get recent demos (for weekly highlights)
   */
  async getRecentDemos(limit = 5) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const demos = await db
      .select({
        case: applicationCases,
        robot: humanoidRobots,
        company: companies,
      })
      .from(applicationCases)
      .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(sql`${applicationCases.demoDate} IS NOT NULL`)
      .orderBy(desc(applicationCases.demoDate))
      .limit(limit);

    return demos;
  }
}

export const applicationCaseService = new ApplicationCaseService();
