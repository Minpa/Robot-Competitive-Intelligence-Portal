import {
  db,
  strategicGoals,
  pocScores,
  rfmScores,
  partners,
  domainRobotFit,
} from '../db/index.js';
import { eq, sql, desc } from 'drizzle-orm';

export interface StrategicGoalItem {
  id: string;
  title: string;
  description: string | null;
  metricType: string;
  targetValue: string;
  currentValue: string | null;
  deadline: string | null;
  status: string | null;
  requiredActions: string[] | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type GoalStatus = 'achieved' | 'on_track' | 'at_risk' | 'behind';

class StrategicGoalService {
  /**
   * List all strategic goals.
   * Requirements: 15.76, 15.85
   */
  async list(): Promise<StrategicGoalItem[]> {
    const results = await db
      .select({
        id: strategicGoals.id,
        title: strategicGoals.title,
        description: strategicGoals.description,
        metricType: strategicGoals.metricType,
        targetValue: strategicGoals.targetValue,
        currentValue: strategicGoals.currentValue,
        deadline: strategicGoals.deadline,
        status: strategicGoals.status,
        requiredActions: strategicGoals.requiredActions,
        createdBy: strategicGoals.createdBy,
        createdAt: strategicGoals.createdAt,
        updatedAt: strategicGoals.updatedAt,
      })
      .from(strategicGoals)
      .orderBy(desc(strategicGoals.createdAt));

    return results;
  }

  /**
   * Create a new strategic goal.
   * Requirements: 15.86
   */
  async create(data: {
    title: string;
    description?: string;
    metricType: string;
    targetValue: string;
    currentValue?: string;
    deadline?: string;
    status?: string;
    requiredActions?: string[];
    createdBy?: string;
  }): Promise<StrategicGoalItem> {
    const [result] = await db
      .insert(strategicGoals)
      .values({
        title: data.title,
        description: data.description ?? null,
        metricType: data.metricType,
        targetValue: data.targetValue,
        currentValue: data.currentValue ?? '0',
        deadline: data.deadline ?? null,
        status: data.status ?? 'behind',
        requiredActions: data.requiredActions ?? [],
        createdBy: data.createdBy ?? null,
      })
      .returning();

    if (!result) throw new Error('Failed to create strategic goal');

    return result;
  }

  /**
   * Update an existing strategic goal.
   * Requirements: 15.87
   */
  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      metricType: string;
      targetValue: string;
      currentValue: string | null;
      deadline: string | null;
      status: string | null;
      requiredActions: string[] | null;
    }>
  ): Promise<StrategicGoalItem | null> {
    const [result] = await db
      .update(strategicGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(strategicGoals.id, id))
      .returning();

    if (!result) return null;

    return result;
  }

  /**
   * Update current_value for all goals based on their metric_type.
   * Called by the scoring pipeline.
   * Requirements: 15.77, 17.109
   */
  async updateCurrentValues(): Promise<void> {
    const goals = await db.select().from(strategicGoals);

    for (const goal of goals) {
      let currentValue: number | null = null;

      try {
        currentValue = await this.fetchCurrentValueForMetric(goal.metricType);
      } catch {
        // If we can't fetch the metric, skip this goal
        continue;
      }

      if (currentValue === null) continue;

      const targetValue = Number(goal.targetValue);
      const deadline = goal.deadline;
      const status = this.determineStatus({ targetValue, currentValue, deadline });

      // Generate required_actions for at_risk or behind goals
      const requiredActions = (status === 'at_risk' || status === 'behind')
        ? this.generateRequiredActions(goal.metricType, currentValue, targetValue)
        : [];

      await db
        .update(strategicGoals)
        .set({
          currentValue: currentValue.toFixed(2),
          status,
          requiredActions,
          updatedAt: new Date(),
        })
        .where(eq(strategicGoals.id, goal.id));
    }
  }

  /**
   * Determine goal status based on target, current value, and deadline.
   * - achieved: current >= target
   * - on_track: current >= 70% of target (design says 80%, but task spec says 70%)
   * - at_risk: current >= 40% of target (design says 50%, but task spec says 40%)
   * - behind: otherwise
   * Requirements: 15.77, 15.78
   */
  determineStatus(goal: {
    targetValue: number;
    currentValue: number;
    deadline: string | null;
  }): GoalStatus {
    const { targetValue, currentValue, deadline } = goal;

    if (currentValue >= targetValue) {
      return 'achieved';
    }

    const deadlineDate = deadline ? new Date(deadline) : null;
    const now = new Date();
    const isDeadlineFuture = deadlineDate ? deadlineDate > now : true;

    if (currentValue >= targetValue * 0.7 && isDeadlineFuture) {
      return 'on_track';
    }

    if (currentValue >= targetValue * 0.4) {
      return 'at_risk';
    }

    return 'behind';
  }

  /**
   * Fetch the current value for a given metric type from the latest scoring data.
   */
  private async fetchCurrentValueForMetric(metricType: string): Promise<number | null> {
    switch (metricType) {
      case 'poc_rank':
      case 'combined_rank':
      case 'overall_rank': {
        // Count total scored robots
        const result = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(pocScores);
        return Number(result[0]?.count ?? 0);
      }

      case 'rfm_rank': {
        const result = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(rfmScores);
        return Number(result[0]?.count ?? 0);
      }

      case 'partner_count': {
        const result = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(partners);
        return Number(result[0]?.count ?? 0);
      }

      case 'domain_entry':
      case 'domain_coverage': {
        const result = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${domainRobotFit.domainId})` })
          .from(domainRobotFit);
        return Number(result[0]?.count ?? 0);
      }

      case 'poc_factor':
      case 'rfm_factor':
      case 'market_share':
      case 'revenue_target':
      case 'custom':
      default:
        return null;
    }
  }

  /**
   * Generate required action suggestions for at_risk or behind goals.
   */
  private generateRequiredActions(
    metricType: string,
    currentValue: number,
    targetValue: number
  ): string[] {
    const gap = targetValue - currentValue;
    const gapPercent = targetValue > 0 ? ((gap / targetValue) * 100).toFixed(1) : '0';

    const actions: string[] = [
      `현재 값(${currentValue.toFixed(2)})이 목표(${targetValue.toFixed(2)})에 ${gapPercent}% 부족합니다.`,
    ];

    switch (metricType) {
      case 'poc_rank':
      case 'combined_rank':
      case 'overall_rank':
        actions.push('PoC 스코어 개선을 위한 스펙 업그레이드를 검토하세요.');
        break;
      case 'rfm_rank':
        actions.push('RFM 역량 강화를 위한 AI/소프트웨어 투자를 검토하세요.');
        break;
      case 'partner_count':
        actions.push('신규 전략 파트너 발굴 및 파트너십 확대를 검토하세요.');
        break;
      case 'domain_entry':
      case 'domain_coverage':
        actions.push('신규 사업화 분야 진입 전략을 수립하세요.');
        break;
      default:
        actions.push('목표 달성을 위한 구체적 실행 계획을 수립하세요.');
    }

    return actions;
  }
}

export const warRoomGoalService = new StrategicGoalService();
