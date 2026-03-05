/**
 * Strategic Goal Step — 전략 목표 현황 업데이트
 *
 * 각 strategic_goal의 current_value를 metric_type에 따라 최신 데이터로 업데이트하고,
 * 상태를 자동 판정한다 (achieved/on_track/at_risk/behind).
 * at_risk/behind 시 required_actions 자동 생성.
 *
 * Requirements: 17.105, 17.109, 15.77, 15.78, 15.79
 */

import {
  db,
  strategicGoals,
  pocScores,
  rfmScores,
  humanoidRobots,
  partners,
  applicationDomains,
} from '../../db/index.js';
import { eq, sql, gt } from 'drizzle-orm';

/**
 * Determine goal status based on current_value, target_value, and deadline.
 *
 * - achieved: current >= target
 * - on_track: current >= target * 0.7 AND deadline is in the future
 * - at_risk: current >= target * 0.4
 * - behind: else
 */
function determineStatus(
  currentValue: number,
  targetValue: number,
  deadline: string | null
): 'achieved' | 'on_track' | 'at_risk' | 'behind' {
  if (currentValue >= targetValue) {
    return 'achieved';
  }

  const deadlineInFuture = deadline ? new Date(deadline) > new Date() : true;

  if (currentValue >= targetValue * 0.7 && deadlineInFuture) {
    return 'on_track';
  }

  if (currentValue >= targetValue * 0.4) {
    return 'at_risk';
  }

  return 'behind';
}

/**
 * Generate required_actions suggestions for at_risk/behind goals.
 */
function generateRequiredActions(
  metricType: string,
  currentValue: number,
  targetValue: number
): string[] {
  const gap = targetValue - currentValue;
  const actions: string[] = [];

  switch (metricType) {
    case 'poc_rank':
      actions.push(`PoC 순위를 ${Math.ceil(gap)}단계 개선 필요`);
      actions.push('핵심 PoC 팩터(payload, fingerDof, operationTime) 스펙 업그레이드 검토');
      break;
    case 'rfm_rank':
      actions.push(`RFM 순위를 ${Math.ceil(gap)}단계 개선 필요`);
      actions.push('AI 모델 역량 강화 및 실환경 데이터 확보 전략 수립');
      break;
    case 'combined_rank':
      actions.push(`종합 순위를 ${Math.ceil(gap)}단계 개선 필요`);
      actions.push('PoC 및 RFM 양 축 동시 개선 전략 수립');
      break;
    case 'partner_count':
      actions.push(`파트너 ${Math.ceil(gap)}개 추가 확보 필요`);
      actions.push('핵심 부품 공급사 및 AI 플랫폼 파트너십 확대');
      break;
    case 'domain_coverage':
      actions.push(`사업화 분야 ${Math.ceil(gap)}개 추가 진출 필요`);
      actions.push('lg_readiness 0.5 이상 달성을 위한 도메인별 역량 강화');
      break;
    default:
      actions.push(`목표 대비 ${gap.toFixed(1)} 부족 — 개선 계획 수립 필요`);
      break;
  }

  return actions;
}

/**
 * Get the LG robot's rank for a given score type.
 * Returns the rank (1-based) among all scored robots.
 */
async function getLgRobotRank(scoreType: 'poc' | 'rfm' | 'combined'): Promise<number> {
  // Find LG robots
  const lgRobots = await db
    .select({ id: humanoidRobots.id })
    .from(humanoidRobots)
    .where(
      sql`${humanoidRobots.region} = 'KR' AND ${humanoidRobots.companyId} IN (SELECT id FROM companies WHERE LOWER(name) LIKE '%lg%')`
    )
    .limit(1);

  if (lgRobots.length === 0) return 0;
  const lgRobotId = lgRobots[0]!.id;

  if (scoreType === 'poc') {
    const allPocScores = await db
      .select({
        robotId: pocScores.robotId,
        total: sql<number>`${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} + ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore}`,
      })
      .from(pocScores)
      .orderBy(sql`${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} + ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore} DESC`);

    const rank = allPocScores.findIndex((s) => s.robotId === lgRobotId) + 1;
    return rank > 0 ? rank : allPocScores.length;
  }

  if (scoreType === 'rfm') {
    const allRfmScores = await db
      .select({
        robotId: rfmScores.robotId,
        total: sql<number>`${rfmScores.generalityScore} + ${rfmScores.realWorldDataScore} + ${rfmScores.edgeInferenceScore} + ${rfmScores.multiRobotCollabScore} + ${rfmScores.openSourceScore} + ${rfmScores.commercialMaturityScore}`,
      })
      .from(rfmScores)
      .orderBy(sql`${rfmScores.generalityScore} + ${rfmScores.realWorldDataScore} + ${rfmScores.edgeInferenceScore} + ${rfmScores.multiRobotCollabScore} + ${rfmScores.openSourceScore} + ${rfmScores.commercialMaturityScore} DESC`);

    const rank = allRfmScores.findIndex((s) => s.robotId === lgRobotId) + 1;
    return rank > 0 ? rank : allRfmScores.length;
  }

  // combined
  const allCombined = await db
    .select({
      robotId: pocScores.robotId,
      total: sql<number>`(${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} + ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore}) + COALESCE((SELECT ${rfmScores.generalityScore} + ${rfmScores.realWorldDataScore} + ${rfmScores.edgeInferenceScore} + ${rfmScores.multiRobotCollabScore} + ${rfmScores.openSourceScore} + ${rfmScores.commercialMaturityScore} FROM rfm_scores WHERE rfm_scores.robot_id = poc_scores.robot_id LIMIT 1), 0)`,
    })
    .from(pocScores)
    .orderBy(sql`(${pocScores.payloadScore} + ${pocScores.operationTimeScore} + ${pocScores.fingerDofScore} + ${pocScores.formFactorScore} + ${pocScores.pocDeploymentScore} + ${pocScores.costEfficiencyScore}) + COALESCE((SELECT ${rfmScores.generalityScore} + ${rfmScores.realWorldDataScore} + ${rfmScores.edgeInferenceScore} + ${rfmScores.multiRobotCollabScore} + ${rfmScores.openSourceScore} + ${rfmScores.commercialMaturityScore} FROM rfm_scores WHERE rfm_scores.robot_id = poc_scores.robot_id LIMIT 1), 0) DESC`);

  const rank = allCombined.findIndex((s) => s.robotId === lgRobotId) + 1;
  return rank > 0 ? rank : allCombined.length;
}

/**
 * Execute the Strategic Goal pipeline step.
 * Updates current_value and status for each strategic_goal based on metric_type.
 */
export async function executeStrategicGoalStep(): Promise<void> {
  const goals = await db
    .select()
    .from(strategicGoals);

  for (const goal of goals) {
    let currentValue: number | null = null;

    switch (goal.metricType) {
      case 'poc_rank':
        currentValue = await getLgRobotRank('poc');
        break;
      case 'rfm_rank':
        currentValue = await getLgRobotRank('rfm');
        break;
      case 'combined_rank':
        currentValue = await getLgRobotRank('combined');
        break;
      case 'partner_count': {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(partners);
        currentValue = Number(result[0]?.count ?? 0);
        break;
      }
      case 'domain_coverage': {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(applicationDomains)
          .where(gt(applicationDomains.lgReadiness, '0.5'));
        currentValue = Number(result[0]?.count ?? 0);
        break;
      }
      case 'custom':
        // Skip custom metrics — manual update only
        continue;
      default:
        continue;
    }

    if (currentValue === null) continue;

    const targetValue = Number(goal.targetValue);
    const status = determineStatus(currentValue, targetValue, goal.deadline);

    const requiredActions = (status === 'at_risk' || status === 'behind')
      ? generateRequiredActions(goal.metricType, currentValue, targetValue)
      : [];

    await db
      .update(strategicGoals)
      .set({
        currentValue: String(currentValue),
        status,
        requiredActions,
        updatedAt: new Date(),
      })
      .where(eq(strategicGoals.id, goal.id));
  }
}
