/**
 * AI 사용량 추적 서비스
 * OpenAI / Claude API 호출 비용을 기록하고 조회한다.
 */

import { db, aiUsageLogs } from '../db/index.js';
import { sql, desc, gte, lte, and } from 'drizzle-orm';

// 모델별 가격 (USD per 1M tokens)
const PRICING: Record<string, { input: number; output: number; webSearchPerQuery?: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-search': { input: 0.15, output: 0.60 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, webSearchPerQuery: 0.01 },
  'claude-opus-4-7': { input: 15.0, output: 75.0, webSearchPerQuery: 0.01 },
};

export interface AIUsageLogEntry {
  provider: 'chatgpt' | 'claude';
  model: string;
  webSearch: boolean;
  inputTokens: number;
  outputTokens: number;
  query?: string;
}

export interface AIUsageSummary {
  provider: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  webSearchCalls: number;
}

export class AIUsageService {
  /**
   * 테이블 자동 생성 (존재하지 않으면)
   */
  async ensureTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider VARCHAR(20) NOT NULL,
          model VARCHAR(100) NOT NULL,
          web_search BOOLEAN NOT NULL DEFAULT false,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
          query TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_usage_logs_provider_idx ON ai_usage_logs (provider)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_usage_logs_created_at_idx ON ai_usage_logs (created_at)`);
    } catch (err) {
      console.warn('[AIUsage] 테이블 생성 스킵 (이미 존재할 수 있음):', (err as Error).message);
    }
  }

  /**
   * API 호출 기록
   */
  async logUsage(entry: AIUsageLogEntry): Promise<void> {
    try {
      const cost = this.estimateCost(entry);
      await db.insert(aiUsageLogs).values({
        provider: entry.provider,
        model: entry.model,
        webSearch: entry.webSearch,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        estimatedCostUsd: cost.toFixed(6),
        query: entry.query?.substring(0, 500),
      });
    } catch (err) {
      // 로깅 실패가 메인 기능을 방해하면 안 됨
      console.error('[AIUsage] 사용량 기록 실패:', (err as Error).message);
    }
  }

  /**
   * 비용 추정 (USD)
   */
  private estimateCost(entry: AIUsageLogEntry): number {
    const pricing = PRICING[entry.model] || { input: 3.0, output: 15.0 };
    const inputCost = (entry.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (entry.outputTokens / 1_000_000) * pricing.output;
    const webSearchCost = entry.webSearch && pricing.webSearchPerQuery ? pricing.webSearchPerQuery : 0;
    return inputCost + outputCost + webSearchCost;
  }

  /**
   * 사용량 요약 조회 (provider별)
   */
  async getSummary(startDate?: string, endDate?: string): Promise<AIUsageSummary[]> {
    await this.ensureTable();

    const conditions = [];
    if (startDate) conditions.push(gte(aiUsageLogs.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(aiUsageLogs.createdAt, new Date(endDate)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = where
      ? await db.select().from(aiUsageLogs).where(where).orderBy(desc(aiUsageLogs.createdAt))
      : await db.select().from(aiUsageLogs).orderBy(desc(aiUsageLogs.createdAt));

    // provider별 집계
    const map = new Map<string, AIUsageSummary>();
    for (const row of rows) {
      const key = row.provider;
      if (!map.has(key)) {
        map.set(key, { provider: key, totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, webSearchCalls: 0 });
      }
      const s = map.get(key)!;
      s.totalCalls++;
      s.totalInputTokens += row.inputTokens;
      s.totalOutputTokens += row.outputTokens;
      s.totalCostUsd += Number(row.estimatedCostUsd);
      if (row.webSearch) s.webSearchCalls++;
    }

    return Array.from(map.values());
  }

  /**
   * 최근 호출 로그 조회
   */
  async getRecentLogs(limit: number = 50): Promise<any[]> {
    await this.ensureTable();
    return db.select().from(aiUsageLogs).orderBy(desc(aiUsageLogs.createdAt)).limit(limit);
  }

  /**
   * 이번 달 총 비용 조회 (USD)
   */
  async getCurrentMonthCostUsd(): Promise<number> {
    await this.ensureTable();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await db
      .select()
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, firstDay));

    return rows.reduce((sum, row) => sum + Number(row.estimatedCostUsd), 0);
  }

  /**
   * Claude 전용 크레딧 정보 조회
   */
  async getClaudeCreditInfo(): Promise<{
    apiKeyValid: boolean;
    apiKeyPrefix: string | null;
    monthlyLimitUsd: number;
    currentMonthUsageUsd: number;
    remainingUsd: number;
    remainingPct: number;
    claudeStats: {
      totalCalls: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCostUsd: number;
      webSearchCalls: number;
      inputCostUsd: number;
      outputCostUsd: number;
      webSearchCostUsd: number;
    };
    dailyUsage: Array<{ date: string; calls: number; costUsd: number; inputTokens: number; outputTokens: number }>;
    modelBreakdown: Array<{ model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  }> {
    await this.ensureTable();

    const MONTHLY_LIMIT_USD = 7.0;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const apiKeyValid = !!apiKey && apiKey.length > 10;
    const apiKeyPrefix = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : null;

    // 이번 달 Claude 사용량만 조회
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await db
      .select()
      .from(aiUsageLogs)
      .where(
        and(
          gte(aiUsageLogs.createdAt, firstDay),
          sql`${aiUsageLogs.provider} = 'claude'`
        )
      )
      .orderBy(desc(aiUsageLogs.createdAt));

    // 기본 통계
    let totalCalls = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let webSearchCalls = 0;
    let inputCostUsd = 0;
    let outputCostUsd = 0;
    let webSearchCostUsd = 0;

    // 일별 집계
    const dailyMap = new Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>();
    // 모델별 집계
    const modelMap = new Map<string, { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }>();

    for (const row of rows) {
      const cost = Number(row.estimatedCostUsd);
      totalCalls++;
      totalInputTokens += row.inputTokens;
      totalOutputTokens += row.outputTokens;
      totalCostUsd += cost;
      if (row.webSearch) webSearchCalls++;

      // 비용 분리 계산
      const pricing = PRICING[row.model] || { input: 3.0, output: 15.0 };
      inputCostUsd += (row.inputTokens / 1_000_000) * pricing.input;
      outputCostUsd += (row.outputTokens / 1_000_000) * pricing.output;
      if (row.webSearch && pricing.webSearchPerQuery) {
        webSearchCostUsd += pricing.webSearchPerQuery;
      }

      // 일별
      const dateKey = row.createdAt.toISOString().split('T')[0] as string;
      const daily = dailyMap.get(dateKey) || { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
      daily.calls++;
      daily.costUsd += cost;
      daily.inputTokens += row.inputTokens;
      daily.outputTokens += row.outputTokens;
      dailyMap.set(dateKey, daily);

      // 모델별
      const model = modelMap.get(row.model) || { model: row.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      model.calls++;
      model.inputTokens += row.inputTokens;
      model.outputTokens += row.outputTokens;
      model.costUsd += cost;
      modelMap.set(row.model, model);
    }

    const remainingUsd = Math.max(0, MONTHLY_LIMIT_USD - totalCostUsd);
    const remainingPct = Math.max(0, ((MONTHLY_LIMIT_USD - totalCostUsd) / MONTHLY_LIMIT_USD) * 100);

    // 일별 데이터를 날짜 오름차순 정렬
    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const modelBreakdown = Array.from(modelMap.values())
      .sort((a, b) => b.costUsd - a.costUsd);

    return {
      apiKeyValid,
      apiKeyPrefix,
      monthlyLimitUsd: MONTHLY_LIMIT_USD,
      currentMonthUsageUsd: totalCostUsd,
      remainingUsd,
      remainingPct,
      claudeStats: {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd,
        webSearchCalls,
        inputCostUsd,
        outputCostUsd,
        webSearchCostUsd,
      },
      dailyUsage,
      modelBreakdown,
    };
  }
}

export const aiUsageService = new AIUsageService();
