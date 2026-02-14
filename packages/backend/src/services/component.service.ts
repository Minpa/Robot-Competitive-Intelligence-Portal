import { eq, ilike, sql, and, asc } from 'drizzle-orm';
import {
  db,
  components,
  robotComponents,
  humanoidRobots,
  companies,
  type ComponentSpecs,
} from '../db/index.js';

export interface ComponentFilters {
  type?: string;
  vendor?: string;
  search?: string;
}

export interface CreateComponentDto {
  type: string;
  name: string;
  vendor?: string;
  specifications?: ComponentSpecs;
}

export interface UpdateComponentDto extends Partial<CreateComponentDto> {}

export class ComponentService {
  /**
   * Create a new component
   */
  async createComponent(data: CreateComponentDto) {
    const [component] = await db
      .insert(components)
      .values({
        type: data.type,
        name: data.name,
        vendor: data.vendor,
        specifications: data.specifications,
      })
      .returning();

    return component;
  }

  /**
   * Get component by ID with related robots
   */
  async getComponent(id: string) {
    const [component] = await db
      .select()
      .from(components)
      .where(eq(components.id, id))
      .limit(1);

    if (!component) return null;

    // Get robots using this component
    const robotLinks = await db
      .select({
        robot: humanoidRobots,
        company: companies,
        usageLocation: robotComponents.usageLocation,
        quantity: robotComponents.quantity,
      })
      .from(robotComponents)
      .innerJoin(humanoidRobots, eq(robotComponents.robotId, humanoidRobots.id))
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(robotComponents.componentId, id));

    return {
      component,
      robots: robotLinks,
    };
  }

  /**
   * Update component
   */
  async updateComponent(id: string, data: UpdateComponentDto) {
    const [component] = await db
      .update(components)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(components.id, id))
      .returning();

    return component;
  }

  /**
   * Delete component
   */
  async deleteComponent(id: string) {
    await db.delete(components).where(eq(components.id, id));
  }

  /**
   * List components with filtering
   */
  async listComponents(
    filters: ComponentFilters = {},
    pagination = { page: 1, limit: 20 }
  ) {
    const conditions = [];

    if (filters.type) {
      conditions.push(eq(components.type, filters.type));
    }
    if (filters.vendor) {
      conditions.push(eq(components.vendor, filters.vendor));
    }
    if (filters.search) {
      conditions.push(ilike(components.name, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(components)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    const offset = (pagination.page - 1) * pagination.limit;
    const data = await db
      .select()
      .from(components)
      .where(whereClause)
      .orderBy(asc(components.name))
      .limit(pagination.limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        totalPages: Math.ceil(count / pagination.limit),
      },
    };
  }

  /**
   * Get components by robot
   */
  async getComponentsByRobot(robotId: string) {
    const result = await db
      .select({
        component: components,
        usageLocation: robotComponents.usageLocation,
        quantity: robotComponents.quantity,
      })
      .from(robotComponents)
      .innerJoin(components, eq(robotComponents.componentId, components.id))
      .where(eq(robotComponents.robotId, robotId));

    return result;
  }

  /**
   * Link component to robot
   */
  async linkComponentToRobot(
    robotId: string,
    componentId: string,
    usageLocation?: string,
    quantity = 1
  ) {
    const [link] = await db
      .insert(robotComponents)
      .values({
        robotId,
        componentId,
        usageLocation,
        quantity,
      })
      .onConflictDoUpdate({
        target: [robotComponents.robotId, robotComponents.componentId],
        set: { usageLocation, quantity },
      })
      .returning();

    return link;
  }

  /**
   * Unlink component from robot
   */
  async unlinkComponentFromRobot(robotId: string, componentId: string) {
    await db
      .delete(robotComponents)
      .where(
        and(
          eq(robotComponents.robotId, robotId),
          eq(robotComponents.componentId, componentId)
        )
      );
  }

  // ============================================
  // Chart Data
  // ============================================

  /**
   * Get torque density vs weight scatter data for actuators
   */
  async getTorqueDensityScatterData() {
    const actuators = await db
      .select()
      .from(components)
      .where(eq(components.type, 'actuator'));

    const points = actuators
      .filter(a => a.specifications?.maxTorqueNm && a.specifications?.weightKg)
      .map(a => {
        const weightKg = Number(a.specifications?.weightKg ?? 1);
        const maxTorqueNm = Number(a.specifications?.maxTorqueNm ?? 0);
        return {
          x: weightKg,
          y: maxTorqueNm / weightKg,
          label: a.name,
          vendor: a.vendor,
          componentId: a.id,
        };
      });

    return {
      points,
      xLabel: '무게 (kg)',
      yLabel: '토크 밀도 (Nm/kg)',
    };
  }

  /**
   * Get TOPS timeline data for SoCs
   */
  async getTopsTimelineData() {
    // Get SoCs with their usage in robots
    const socs = await db
      .select({
        component: components,
        robot: humanoidRobots,
      })
      .from(components)
      .leftJoin(robotComponents, eq(components.id, robotComponents.componentId))
      .leftJoin(humanoidRobots, eq(robotComponents.robotId, humanoidRobots.id))
      .where(eq(components.type, 'soc'));

    // Group by year
    const byYear: Record<number, { avgTops: number; maxTops: number; count: number }> = {};

    for (const row of socs) {
      const year = row.robot?.announcementYear;
      const specs = row.component?.specifications;
      const tops = specs?.topsMax || specs?.topsMin;

      if (year && tops) {
        if (!byYear[year]) {
          byYear[year] = { avgTops: 0, maxTops: 0, count: 0 };
        }
        byYear[year].count++;
        byYear[year].avgTops += Number(tops);
        byYear[year].maxTops = Math.max(byYear[year].maxTops, Number(tops));
      }
    }

    // Calculate averages
    const years = Object.keys(byYear).map(Number).sort();
    const avgData = years.map(y => {
      const yearData = byYear[y];
      return yearData ? yearData.avgTops / yearData.count : 0;
    });
    const maxData = years.map(y => {
      const yearData = byYear[y];
      return yearData ? yearData.maxTops : 0;
    });

    return {
      labels: years,
      datasets: [
        { label: '평균 TOPS', data: avgData },
        { label: '최대 TOPS', data: maxData },
      ],
    };
  }

  /**
   * Get onboard vs edge distribution
   */
  async getComputingLocationDistribution() {
    const socs = await db
      .select({ specifications: components.specifications })
      .from(components)
      .where(eq(components.type, 'soc'));

    const distribution = { onboard: 0, edge: 0, cloud: 0, hybrid: 0 };

    for (const soc of socs) {
      const location = soc.specifications?.location as string;
      if (location && distribution.hasOwnProperty(location)) {
        distribution[location as keyof typeof distribution]++;
      }
    }

    return distribution;
  }

  /**
   * Get unique vendors by component type
   */
  async getVendorsByType(type: string) {
    const vendors = await db
      .selectDistinct({ vendor: components.vendor })
      .from(components)
      .where(and(eq(components.type, type), sql`${components.vendor} IS NOT NULL`));

    return vendors.map(v => v.vendor).filter(Boolean) as string[];
  }
}

export const componentService = new ComponentService();
