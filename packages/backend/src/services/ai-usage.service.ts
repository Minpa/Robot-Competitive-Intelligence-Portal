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
}

export const aiUsageService = new AIUsageService();
