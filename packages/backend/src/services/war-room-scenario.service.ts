import {
  db,
  whatifScenarios,
} from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

export interface ScenarioListItem {
  id: string;
  name: string;
  description: string | null;
  baseRobotId: string | null;
  parameterOverrides: Record<string, unknown>;
  calculatedScores: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class ScenarioService {
  /**
   * List scenarios for a user. Returns all scenarios (admin can see all).
   * Requirements: 15.65, 15.82
   */
  async list(userId: string): Promise<ScenarioListItem[]> {
    const results = await db
      .select({
        id: whatifScenarios.id,
        name: whatifScenarios.name,
        description: whatifScenarios.description,
        baseRobotId: whatifScenarios.baseRobotId,
        parameterOverrides: whatifScenarios.parameterOverrides,
        calculatedScores: whatifScenarios.calculatedScores,
        createdBy: whatifScenarios.createdBy,
        createdAt: whatifScenarios.createdAt,
        updatedAt: whatifScenarios.updatedAt,
      })
      .from(whatifScenarios)
      .where(eq(whatifScenarios.createdBy, userId))
      .orderBy(desc(whatifScenarios.createdAt));

    return results.map((r) => ({
      ...r,
      parameterOverrides: (r.parameterOverrides ?? {}) as Record<string, unknown>,
      calculatedScores: (r.calculatedScores ?? null) as Record<string, unknown> | null,
    }));
  }

  /**
   * Create a new what-if scenario.
   * Requirements: 15.73, 15.83
   */
  async create(data: {
    name: string;
    description?: string;
    baseRobotId: string;
    parameterOverrides: Record<string, unknown>;
    calculatedScores: Record<string, unknown>;
    createdBy: string;
  }): Promise<ScenarioListItem> {
    const [result] = await db
      .insert(whatifScenarios)
      .values({
        name: data.name,
        description: data.description ?? null,
        baseRobotId: data.baseRobotId,
        parameterOverrides: data.parameterOverrides,
        calculatedScores: data.calculatedScores,
        createdBy: data.createdBy,
      })
      .returning();

    if (!result) throw new Error('Failed to create scenario');

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      baseRobotId: result.baseRobotId,
      parameterOverrides: (result.parameterOverrides ?? {}) as Record<string, unknown>,
      calculatedScores: (result.calculatedScores ?? null) as Record<string, unknown> | null,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Delete a scenario. Only the creator or an admin can delete.
   * Requirements: 15.74, 15.84
   */
  async delete(id: string, userId: string, userRole: string): Promise<void> {
    // Check if scenario exists and verify ownership
    const scenarioResult = await db
      .select({
        id: whatifScenarios.id,
        createdBy: whatifScenarios.createdBy,
      })
      .from(whatifScenarios)
      .where(eq(whatifScenarios.id, id))
      .limit(1);

    const scenario = scenarioResult[0];
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Only creator or admin can delete
    if (userRole !== 'admin' && scenario.createdBy !== userId) {
      throw new Error('Forbidden: only the creator or admin can delete this scenario');
    }

    await db
      .delete(whatifScenarios)
      .where(eq(whatifScenarios.id, id));
  }
}

export const warRoomScenarioService = new ScenarioService();
