/**
 * StrategicAIAgentService - 전략 AI 브리핑 서비스
 *
 * 갭 분석, 벤치마크, 스코어 추이, 경쟁 알림을 종합하여
 * Claude Sonnet 4.6으로 LG 전략 제언을 생성한다.
 * 예산 초과 시 rule-based fallback 사용.
 */

import Anthropic from '@anthropic-ai/sdk';
import { desc, eq, gte } from 'drizzle-orm';
import {
  db,
  strategicBriefings,
  competitiveAlerts,
  scoreHistory,
} from '../db/index.js';
import { warRoomCompetitiveService } from './war-room-competitive.service.js';
import { benchmarkService } from './benchmark.service.js';
import { dataAuditService } from './data-audit.service.js';
import { aiUsageService } from './ai-usage.service.js';

// ── Types ──

export interface PriorityGap {
  rank: number;
  factorName: string;
  factorType: 'poc' | 'rfm';
  currentGap: number;
  recommendation: string;
  specificActions: string[];
  suggestedTimeline: string;
  potentialPartners: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface CompetitorWatch {
  competitorName: string;
  recentMove: string;
  threatLevel: 'high' | 'medium' | 'low';
  suggestedResponse: string;
}

export interface StrategicBriefingResult {
  generatedAt: string;
  lgRobotId: string;
  priorityGaps: PriorityGap[];
  competitorWatchlist: CompetitorWatch[];
  overallAssessment: string;
  dataConfidenceNote: string;
}

const MONTHLY_COST_LIMIT_USD = 7.0;
const AI_MODEL = 'claude-opus-4-7';

class StrategicAIAgentService {

  /**
   * Generate a strategic briefing for an LG robot
   */
  async generateBriefing(lgRobotId: string, triggerType: 'manual' | 'scheduled' = 'manual'): Promise<StrategicBriefingResult> {
    // 1. Gather context
    const context = await this.gatherContext(lgRobotId);

    // 2. Try AI generation, fallback to rule-based
    let result: StrategicBriefingResult;
    let aiModel: string | null = null;
    let aiCostUsd: number | null = null;

    try {
      const currentCost = await aiUsageService.getCurrentMonthCostUsd();
      if (currentCost >= MONTHLY_COST_LIMIT_USD) {
        throw new Error('Budget exceeded');
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not set');
      }

      const { briefing, cost } = await this.callAI(lgRobotId, context);
      result = briefing;
      aiModel = AI_MODEL;
      aiCostUsd = cost;
    } catch {
      // Fallback to rule-based
      result = this.generateFallback(lgRobotId, context);
    }

    // 3. Persist
    await db.insert(strategicBriefings).values({
      lgRobotId,
      briefingData: result,
      triggerType,
      aiModel,
      aiCostUsd: aiCostUsd != null ? String(aiCostUsd) : null,
    });

    return result;
  }

  /**
   * Get the latest briefing for a robot
   */
  async getLatestBriefing(lgRobotId: string): Promise<StrategicBriefingResult | null> {
    const [row] = await db
      .select()
      .from(strategicBriefings)
      .where(eq(strategicBriefings.lgRobotId, lgRobotId))
      .orderBy(desc(strategicBriefings.createdAt))
      .limit(1);
    return row ? (row.briefingData as StrategicBriefingResult) : null;
  }

  /**
   * Get briefing history (last 10)
   */
  async getBriefingHistory(lgRobotId: string) {
    return db
      .select({
        id: strategicBriefings.id,
        briefingData: strategicBriefings.briefingData,
        triggerType: strategicBriefings.triggerType,
        aiModel: strategicBriefings.aiModel,
        createdAt: strategicBriefings.createdAt,
      })
      .from(strategicBriefings)
      .where(eq(strategicBriefings.lgRobotId, lgRobotId))
      .orderBy(desc(strategicBriefings.createdAt))
      .limit(10);
  }

  // ── Private: Context Gathering ──

  private async gatherContext(lgRobotId: string) {
    const [gapAnalysis, benchmark, audit, recentAlerts, scoreTrend] = await Promise.all([
      warRoomCompetitiveService.getGapAnalysis(lgRobotId).catch(() => null),
      benchmarkService.getBenchmarkData().catch(() => null),
      dataAuditService.auditRobot(lgRobotId).catch(() => null),
      this.getRecentAlerts(),
      this.getScoreTrend(lgRobotId),
    ]);

    return { gapAnalysis, benchmark, audit, recentAlerts, scoreTrend };
  }

  private async getRecentAlerts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db
      .select({
        type: competitiveAlerts.type,
        title: competitiveAlerts.title,
        summary: competitiveAlerts.summary,
        severity: competitiveAlerts.severity,
        createdAt: competitiveAlerts.createdAt,
      })
      .from(competitiveAlerts)
      .where(gte(competitiveAlerts.createdAt, thirtyDaysAgo))
      .orderBy(desc(competitiveAlerts.createdAt))
      .limit(10);
  }

  private async getScoreTrend(robotId: string) {
    return db
      .select()
      .from(scoreHistory)
      .where(eq(scoreHistory.robotId, robotId))
      .orderBy(desc(scoreHistory.createdAt))
      .limit(6);
  }

  // ── Private: AI Call ──

  private async callAI(lgRobotId: string, context: any): Promise<{ briefing: StrategicBriefingResult; cost: number }> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build compact prompt — only include red (negative) gaps
    const redGaps = context.gapAnalysis?.factors?.filter((f: any) => f.gap < 0) || [];
    const topRedGaps = redGaps.slice(0, 6); // limit to 6 worst

    // Benchmark gaps — top 3 where current << target
    const benchmarkGaps: string[] = [];
    if (context.benchmark?.competitors && context.benchmark?.axes) {
      for (const comp of context.benchmark.competitors) {
        if (comp.name?.toLowerCase().includes('cloid') || comp.name?.toLowerCase().includes('lg')) {
          for (const axis of context.benchmark.axes) {
            const score = comp.scores?.[axis.key];
            if (score && score.targetScore - score.currentScore >= 3) {
              benchmarkGaps.push(`${axis.label}: 현재 ${score.currentScore}/10 → 목표 ${score.targetScore}/10`);
            }
          }
          break;
        }
      }
    }

    // Score trend summary
    const trendSummary = context.scoreTrend?.length > 1
      ? `최근 ${context.scoreTrend.length}개월 스코어 추이 존재`
      : '스코어 추이 데이터 부족';

    // Alerts summary
    const alertsSummary = context.recentAlerts?.map((a: any) => `[${a.type}] ${a.title}`).join('; ') || '최근 알림 없음';

    // Data confidence
    const dataConfidence = context.audit
      ? `데이터 완성도 ${context.audit.completeness.overall}% (${context.audit.priority})`
      : '데이터 감사 결과 없음';

    const systemPrompt = `당신은 LG의 휴머노이드 로봇 전략 분석 AI입니다. 경쟁 데이터를 기반으로 구체적이고 실행 가능한 전략 제언을 합니다. 반드시 유효한 JSON으로만 응답하세요.`;

    const userPrompt = `다음 경쟁 데이터를 분석하여 LG 전략 브리핑을 생성해주세요.

## 12-Factor 갭 분석 (LG vs Top 경쟁사)
${topRedGaps.length > 0
  ? topRedGaps.map((g: any) => `- ${g.factorName} (${g.factorType}): LG ${g.lgValue} vs ${g.topCompetitorName} ${g.topCompetitorValue} → 갭 ${g.gap}`).join('\n')
  : '현재 열위 팩터 없음'}

## 벤치마크 갭 (Perfect Robot 대비)
${benchmarkGaps.length > 0 ? benchmarkGaps.join('\n') : '벤치마크 데이터 없음'}

## 경쟁사 동향 (최근 30일)
${alertsSummary}

## 스코어 추이
${trendSummary}

## 데이터 신뢰도
${dataConfidence}

다음 JSON 구조로 응답하세요:
{
  "priorityGaps": [
    {
      "rank": 1,
      "factorName": "팩터명",
      "factorType": "poc 또는 rfm",
      "currentGap": -2.5,
      "recommendation": "전략 권고 (1-2문장)",
      "specificActions": ["구체적 실행 항목 1", "구체적 실행 항목 2"],
      "suggestedTimeline": "6개월 이내",
      "potentialPartners": ["파트너사명"],
      "confidenceLevel": "high/medium/low"
    }
  ],
  "competitorWatchlist": [
    {
      "competitorName": "경쟁사명",
      "recentMove": "최근 동향",
      "threatLevel": "high/medium/low",
      "suggestedResponse": "대응 전략"
    }
  ],
  "overallAssessment": "종합 평가 (3-5문장)",
  "dataConfidenceNote": "데이터 신뢰도 관련 참고사항"
}

Top 3 우선순위 갭과 주요 경쟁사 동향 2-3개를 포함해주세요.`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    // Extract text
    const textBlock = response.content.find(b => b.type === 'text');
    const raw = textBlock?.text || '';

    // Parse JSON (handle code blocks)
    let json: any;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const toParse = jsonMatch ? jsonMatch[1]! : raw;
    try {
      json = JSON.parse(toParse.trim());
    } catch {
      // Try to find JSON object in raw text
      const objMatch = raw.match(/\{[\s\S]*\}/);
      if (objMatch) {
        json = JSON.parse(objMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Estimate cost and log
    const inputTokens = response.usage?.input_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 3);
    const outputTokens = response.usage?.output_tokens || Math.ceil(raw.length / 3);
    const cost = (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;

    aiUsageService.logUsage({
      provider: 'claude',
      model: AI_MODEL,
      query: 'strategic_briefing',
      webSearch: false,
      inputTokens,
      outputTokens,
    }).catch(() => {}); // non-blocking

    const briefing: StrategicBriefingResult = {
      generatedAt: new Date().toISOString(),
      lgRobotId,
      priorityGaps: (json.priorityGaps || []).slice(0, 3),
      competitorWatchlist: (json.competitorWatchlist || []).slice(0, 5),
      overallAssessment: json.overallAssessment || '',
      dataConfidenceNote: json.dataConfidenceNote || '',
    };

    return { briefing, cost };
  }

  // ── Private: Rule-based Fallback ──

  private generateFallback(lgRobotId: string, context: any): StrategicBriefingResult {
    const redGaps = (context.gapAnalysis?.factors || [])
      .filter((f: any) => f.gap < 0)
      .sort((a: any, b: any) => a.gap - b.gap); // most negative first

    const priorityGaps: PriorityGap[] = redGaps.slice(0, 3).map((g: any, i: number) => ({
      rank: i + 1,
      factorName: g.factorName,
      factorType: g.factorType,
      currentGap: g.gap,
      recommendation: `${g.factorName} 영역에서 ${g.topCompetitorName} 대비 ${Math.abs(g.gap).toFixed(1)}점 열위. 해당 영역 역량 강화 필요.`,
      specificActions: [
        `${g.factorName} 관련 기술 로드맵 수립`,
        `${g.topCompetitorName}의 ${g.factorName} 전략 심층 분석`,
      ],
      suggestedTimeline: Math.abs(g.gap) > 3 ? '12개월 이상' : '6개월 이내',
      potentialPartners: [],
      confidenceLevel: (context.audit?.completeness?.overall ?? 0) >= 70 ? 'medium' as const : 'low' as const,
    }));

    const competitorWatchlist: CompetitorWatch[] = (context.recentAlerts || []).slice(0, 3).map((a: any) => ({
      competitorName: a.title?.split(':')[0] || 'Unknown',
      recentMove: a.summary || a.title || '',
      threatLevel: a.severity === 'high' ? 'high' as const : 'medium' as const,
      suggestedResponse: '해당 경쟁사의 움직임을 모니터링하고 대응 전략 수립 필요',
    }));

    const dataCompleteness = context.audit?.completeness?.overall ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      lgRobotId,
      priorityGaps,
      competitorWatchlist,
      overallAssessment: priorityGaps.length > 0
        ? `현재 ${priorityGaps.length}개 영역에서 경쟁사 대비 열위가 확인됩니다. 가장 시급한 영역은 ${priorityGaps[0]?.factorName ?? 'N/A'}이며, 해당 분야의 역량 강화가 우선적으로 필요합니다. (규칙 기반 분석 — AI 분석이 불가하여 자동 생성됨)`
        : '현재 경쟁사 대비 열위 요소가 발견되지 않았습니다. 현 수준을 유지하면서 시장 동향을 주시하세요. (규칙 기반 분석)',
      dataConfidenceNote: `데이터 완성도 ${dataCompleteness}%${dataCompleteness < 70 ? ' — 데이터 보완이 필요하여 분석 신뢰도가 제한적입니다.' : ''}`,
    };
  }
}

export const strategicAIAgentService = new StrategicAIAgentService();
