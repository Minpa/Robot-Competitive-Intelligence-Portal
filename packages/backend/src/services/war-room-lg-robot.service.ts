import {
  db,
  humanoidRobots,
  companies,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
  specChangeLogs,
} from '../db/index.js';
import { eq, and, ilike, desc } from 'drizzle-orm';

export interface LgRobotWithSpecs {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  status: string | null;
  region: string | null;
  locomotionType: string | null;
  handType: string | null;
  commercializationStage: string | null;
  purpose: string | null;
  updatedAt: Date;
  bodySpec: Record<string, unknown> | null;
  handSpec: Record<string, unknown> | null;
  computingSpec: Record<string, unknown> | null;
  sensorSpec: Record<string, unknown> | null;
  powerSpec: Record<string, unknown> | null;
}

export interface SpecChangeLogEntry {
  id: string;
  robotId: string;
  changedBy: string | null;
  fieldName: string;
  tableName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
}

interface CreateLgRobotInput {
  name: string;
  companyId: string;
  status?: string;
  purpose?: string;
  locomotionType?: string;
  handType?: string;
  commercializationStage?: string;
  region?: string;
  bodySpec?: Record<string, unknown>;
  handSpec?: Record<string, unknown>;
  computingSpec?: Record<string, unknown>;
  sensorSpec?: Record<string, unknown>;
  powerSpec?: Record<string, unknown>;
}

class LgRobotManagementService {
  /**
   * Get all LG robots (region='KR', company ILIKE '%LG%') with full spec data.
   * Requirements: 16.89
   */
  async getLgRobots(): Promise<LgRobotWithSpecs[]> {
    const robots = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        companyId: humanoidRobots.companyId,
        companyName: companies.name,
        status: humanoidRobots.status,
        region: humanoidRobots.region,
        locomotionType: humanoidRobots.locomotionType,
        handType: humanoidRobots.handType,
        commercializationStage: humanoidRobots.commercializationStage,
        purpose: humanoidRobots.purpose,
        updatedAt: humanoidRobots.updatedAt,
      })
      .from(humanoidRobots)
      .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(
        and(
          eq(humanoidRobots.region, 'KR'),
          ilike(companies.name, '%LG%')
        )
      );

    // Fetch specs for each robot
    const results: LgRobotWithSpecs[] = [];
    for (const robot of robots) {
      const [body, hand, computing, sensor, power] = await Promise.all([
        db.select().from(bodySpecs).where(eq(bodySpecs.robotId, robot.id)).limit(1),
        db.select().from(handSpecs).where(eq(handSpecs.robotId, robot.id)).limit(1),
        db.select().from(computingSpecs).where(eq(computingSpecs.robotId, robot.id)).limit(1),
        db.select().from(sensorSpecs).where(eq(sensorSpecs.robotId, robot.id)).limit(1),
        db.select().from(powerSpecs).where(eq(powerSpecs.robotId, robot.id)).limit(1),
      ]);

      results.push({
        ...robot,
        bodySpec: body[0] ? this.specToRecord(body[0]) : null,
        handSpec: hand[0] ? this.specToRecord(hand[0]) : null,
        computingSpec: computing[0] ? this.specToRecord(computing[0]) : null,
        sensorSpec: sensor[0] ? this.specToRecord(sensor[0]) : null,
        powerSpec: power[0] ? this.specToRecord(power[0]) : null,
      });
    }

    return results;
  }

  /**
   * Update robot specs across multiple tables (bodySpecs, handSpecs, computingSpecs, sensorSpecs, powerSpecs).
   * Log changes to spec_change_logs by comparing old vs new values.
   * Requirements: 16.90, 16.91, 16.97
   */
  async updateSpecs(
    robotId: string,
    specs: {
      bodySpec?: Record<string, unknown>;
      handSpec?: Record<string, unknown>;
      computingSpec?: Record<string, unknown>;
      sensorSpec?: Record<string, unknown>;
      powerSpec?: Record<string, unknown>;
    },
    userId: string
  ): Promise<void> {
    if (specs.bodySpec) {
      await this.updateSpecTable(robotId, 'body_specs', bodySpecs, specs.bodySpec, userId);
    }
    if (specs.handSpec) {
      await this.updateSpecTable(robotId, 'hand_specs', handSpecs, specs.handSpec, userId);
    }
    if (specs.computingSpec) {
      await this.updateSpecTable(robotId, 'computing_specs', computingSpecs, specs.computingSpec, userId);
    }
    if (specs.sensorSpec) {
      await this.updateSpecTable(robotId, 'sensor_specs', sensorSpecs, specs.sensorSpec, userId);
    }
    if (specs.powerSpec) {
      await this.updateSpecTable(robotId, 'power_specs', powerSpecs, specs.powerSpec, userId);
    }
  }

  /**
   * Create new LG robot with all spec tables. Log creation in spec_change_logs.
   * Requirements: 16.90, 16.98
   */
  async createLgRobot(data: CreateLgRobotInput, userId: string): Promise<{ id: string }> {
    // Insert the robot record
    const result = await db
      .insert(humanoidRobots)
      .values({
        name: data.name,
        companyId: data.companyId,
        status: data.status ?? 'development',
        purpose: data.purpose ?? 'home',
        locomotionType: data.locomotionType ?? 'wheeled',
        handType: data.handType ?? 'multi_finger',
        commercializationStage: data.commercializationStage ?? 'concept',
        region: data.region ?? 'KR',
      })
      .returning({ id: humanoidRobots.id });

    const robotId = result[0]!.id;

    // Insert spec tables if provided
    if (data.bodySpec) {
      await db.insert(bodySpecs).values({ robotId, ...this.filterSpecFields(data.bodySpec) });
      await this.logSpecChanges(robotId, 'body_specs', {}, data.bodySpec, userId);
    }
    if (data.handSpec) {
      await db.insert(handSpecs).values({ robotId, ...this.filterSpecFields(data.handSpec) });
      await this.logSpecChanges(robotId, 'hand_specs', {}, data.handSpec, userId);
    }
    if (data.computingSpec) {
      await db.insert(computingSpecs).values({ robotId, ...this.filterSpecFields(data.computingSpec) });
      await this.logSpecChanges(robotId, 'computing_specs', {}, data.computingSpec, userId);
    }
    if (data.sensorSpec) {
      await db.insert(sensorSpecs).values({ robotId, ...this.filterSpecFields(data.sensorSpec) });
      await this.logSpecChanges(robotId, 'sensor_specs', {}, data.sensorSpec, userId);
    }
    if (data.powerSpec) {
      await db.insert(powerSpecs).values({ robotId, ...this.filterSpecFields(data.powerSpec) });
      await this.logSpecChanges(robotId, 'power_specs', {}, data.powerSpec, userId);
    }

    return { id: robotId };
  }

  /**
   * Query spec_change_logs for a robot, ordered by changedAt DESC.
   * Requirements: 16.97, 16.98
   */
  async getChangeHistory(robotId: string): Promise<SpecChangeLogEntry[]> {
    const results = await db
      .select({
        id: specChangeLogs.id,
        robotId: specChangeLogs.robotId,
        changedBy: specChangeLogs.changedBy,
        fieldName: specChangeLogs.fieldName,
        tableName: specChangeLogs.tableName,
        oldValue: specChangeLogs.oldValue,
        newValue: specChangeLogs.newValue,
        changedAt: specChangeLogs.changedAt,
      })
      .from(specChangeLogs)
      .where(eq(specChangeLogs.robotId, robotId))
      .orderBy(desc(specChangeLogs.changedAt));

    return results;
  }

  /**
   * Compare old/new values field by field, insert a spec_change_log entry for each changed field.
   * Requirements: 16.97
   */
  async logSpecChanges(
    robotId: string,
    tableName: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    // Collect all unique field names from both old and new
    const allFields = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    // Skip metadata fields
    const skipFields = new Set(['id', 'robotId', 'robot_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);

    const logEntries: {
      robotId: string;
      changedBy: string;
      fieldName: string;
      tableName: string;
      oldValue: string | null;
      newValue: string | null;
    }[] = [];

    for (const field of allFields) {
      if (skipFields.has(field)) continue;

      const oldVal = oldValues[field];
      const newVal = newValues[field];

      // Stringify for comparison
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal) : null;
      const newStr = newVal !== undefined && newVal !== null ? String(newVal) : null;

      if (oldStr !== newStr) {
        logEntries.push({
          robotId,
          changedBy: userId,
          fieldName: field,
          tableName,
          oldValue: oldStr,
          newValue: newStr,
        });
      }
    }

    if (logEntries.length > 0) {
      await db.insert(specChangeLogs).values(logEntries);
    }
  }

  // --- Private helpers ---

  private async updateSpecTable(
    robotId: string,
    tableName: string,
    table: typeof bodySpecs | typeof handSpecs | typeof computingSpecs | typeof sensorSpecs | typeof powerSpecs,
    newValues: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    // Get current values
    const existing = await db
      .select()
      .from(table)
      .where(eq(table.robotId, robotId))
      .limit(1);

    const filteredNewValues = this.filterSpecFields(newValues);

    if (existing.length > 0 && existing[0]) {
      const oldRecord = this.specToRecord(existing[0] as Record<string, unknown>);
      // Log changes before updating
      await this.logSpecChanges(robotId, tableName, oldRecord, newValues, userId);
      // Update
      await db
        .update(table)
        .set({ ...filteredNewValues, updatedAt: new Date() })
        .where(eq(table.robotId, robotId));
    } else {
      // Insert new spec record
      await db.insert(table).values({ robotId, ...filteredNewValues });
      await this.logSpecChanges(robotId, tableName, {}, newValues, userId);
    }
  }

  /**
   * Convert a spec row to a plain record, excluding metadata fields.
   */
  private specToRecord(spec: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const skipFields = new Set(['id', 'robotId', 'robot_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
    for (const [key, value] of Object.entries(spec)) {
      if (!skipFields.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Filter out metadata fields from spec input to avoid overwriting them.
   */
  private filterSpecFields(spec: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const skipFields = new Set(['id', 'robotId', 'robot_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
    for (const [key, value] of Object.entries(spec)) {
      if (!skipFields.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }
}

export const warRoomLgRobotService = new LgRobotManagementService();
