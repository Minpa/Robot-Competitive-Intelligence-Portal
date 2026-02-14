import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import {
  db,
  keywords,
  keywordStats,
  articleKeywords,
  articles,
} from '../db/index.js';

export interface PeriodStats {
  keywordId: string;
  term: string;
  language: string;
  periodType: 'week' | 'month';
  periodStart: string;
  periodEnd: string;
  count: number;
  delta: number;
  deltaPercent: number;
}

export interface TrendingKeyword {
  keywordId: string;
  term: string;
  language: string;
  category: string | null;
  currentCount: number;
  previousCount: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'stable';
}

export class KeywordStatsService {
  /**
   * 주간 키워드 통계 계산
   */
  async calculateWeeklyStats(weekStart: Date): Promise<PeriodStats[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.calculatePeriodStats(weekStart, weekEnd, 'week');
  }

  /**
   * 월간 키워드 통계 계산
   */
  async calculateMonthlyStats(monthStart: Date): Promise<PeriodStats[]> {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    return this.calculatePeriodStats(monthStart, monthEnd, 'month');
  }

  /**
   * 기간별 키워드 통계 계산
   */
  private async calculatePeriodStats(
    periodStart: Date,
    periodEnd: Date,
    periodType: 'week' | 'month'
  ): Promise<PeriodStats[]> {
    const startStr = periodStart.toISOString().split('T')[0];
    const endStr = periodEnd.toISOString().split('T')[0];

    // 현재 기간의 키워드 빈도 계산
    const currentStats = await db
      .select({
        keywordId: keywords.id,
        term: keywords.term,
        language: keywords.language,
        count: sql<number>`sum(${articleKeywords.frequency})::int`,
      })
      .from(keywords)
      .innerJoin(articleKeywords, eq(keywords.id, articleKeywords.keywordId))
      .innerJoin(articles, eq(articleKeywords.articleId, articles.id))
      .where(
        and(
          gte(articles.createdAt, periodStart),
          lte(articles.createdAt, periodEnd)
        )
      )
      .groupBy(keywords.id, keywords.term, keywords.language);

    // 이전 기간 계산
    const prevPeriodStart = new Date(periodStart);
    const prevPeriodEnd = new Date(periodEnd);
    if (periodType === 'week') {
      prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);
      prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 7);
    } else {
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
      prevPeriodEnd.setMonth(prevPeriodEnd.getMonth() - 1);
    }

    // 이전 기간의 키워드 빈도 조회
    const previousStats = await db
      .select({
        keywordId: keywords.id,
        count: sql<number>`sum(${articleKeywords.frequency})::int`,
      })
      .from(keywords)
      .innerJoin(articleKeywords, eq(keywords.id, articleKeywords.keywordId))
      .innerJoin(articles, eq(articleKeywords.articleId, articles.id))
      .where(
        and(
          gte(articles.createdAt, prevPeriodStart),
          lte(articles.createdAt, prevPeriodEnd)
        )
      )
      .groupBy(keywords.id);

    // 이전 기간 데이터를 Map으로 변환
    const prevMap = new Map<string, number>();
    for (const stat of previousStats) {
      prevMap.set(stat.keywordId, stat.count ?? 0);
    }

    // Delta 및 변화율 계산
    const results: PeriodStats[] = [];
    for (const stat of currentStats) {
      const previousCount = prevMap.get(stat.keywordId) ?? 0;
      const currentCount = stat.count ?? 0;
      const delta = currentCount - previousCount;
      const deltaPercent = previousCount > 0 
        ? ((delta / previousCount) * 100) 
        : (currentCount > 0 ? 100 : 0);

      results.push({
        keywordId: stat.keywordId,
        term: stat.term,
        language: stat.language ?? 'ko',
        periodType,
        periodStart: startStr ?? '',
        periodEnd: endStr ?? '',
        count: currentCount,
        delta,
        deltaPercent: Math.round(deltaPercent * 100) / 100,
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * 통계를 DB에 저장
   */
  async saveStats(stats: PeriodStats[]): Promise<void> {
    for (const stat of stats) {
      await db
        .insert(keywordStats)
        .values({
          keywordId: stat.keywordId,
          periodType: stat.periodType,
          periodStart: stat.periodStart,
          periodEnd: stat.periodEnd,
          count: stat.count,
          delta: stat.delta,
          deltaPercent: String(stat.deltaPercent),
        })
        .onConflictDoUpdate({
          target: [keywordStats.keywordId, keywordStats.periodType, keywordStats.periodStart],
          set: {
            count: stat.count,
            delta: stat.delta,
            deltaPercent: String(stat.deltaPercent),
            calculatedAt: new Date(),
          },
        });
    }
  }

  /**
   * 트렌딩 키워드 조회 (상승률 기준)
   */
  async getTrendingKeywords(options: {
    periodType?: 'week' | 'month';
    limit?: number;
    minCount?: number;
  } = {}): Promise<TrendingKeyword[]> {
    const { periodType = 'week', limit = 20, minCount = 1 } = options;

    // 최신 기간의 통계 조회
    const latestStats = await db
      .select({
        keywordId: keywordStats.keywordId,
        term: keywords.term,
        language: keywords.language,
        category: keywords.category,
        count: keywordStats.count,
        delta: keywordStats.delta,
        deltaPercent: keywordStats.deltaPercent,
        periodStart: keywordStats.periodStart,
      })
      .from(keywordStats)
      .innerJoin(keywords, eq(keywordStats.keywordId, keywords.id))
      .where(
        and(
          eq(keywordStats.periodType, periodType),
          gte(keywordStats.count, minCount)
        )
      )
      .orderBy(desc(keywordStats.periodStart), desc(keywordStats.deltaPercent))
      .limit(limit * 2); // 중복 제거를 위해 더 많이 조회

    // 최신 기간만 필터링 (키워드당 하나)
    const seen = new Set<string>();
    const results: TrendingKeyword[] = [];

    for (const stat of latestStats) {
      if (seen.has(stat.keywordId)) continue;
      seen.add(stat.keywordId);

      const deltaPercent = Number(stat.deltaPercent) || 0;
      const delta = stat.delta ?? 0;
      const currentCount = stat.count ?? 0;
      const previousCount = currentCount - delta;

      results.push({
        keywordId: stat.keywordId,
        term: stat.term,
        language: stat.language ?? 'ko',
        category: stat.category,
        currentCount,
        previousCount: Math.max(0, previousCount),
        delta,
        deltaPercent,
        trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * 키워드 히스토리 조회
   */
  async getKeywordHistory(
    keywordId: string,
    options: {
      periodType?: 'week' | 'month';
      limit?: number;
    } = {}
  ): Promise<PeriodStats[]> {
    const { periodType = 'week', limit = 12 } = options;

    const result = await db
      .select({
        keywordId: keywordStats.keywordId,
        term: keywords.term,
        language: keywords.language,
        periodType: keywordStats.periodType,
        periodStart: keywordStats.periodStart,
        periodEnd: keywordStats.periodEnd,
        count: keywordStats.count,
        delta: keywordStats.delta,
        deltaPercent: keywordStats.deltaPercent,
      })
      .from(keywordStats)
      .innerJoin(keywords, eq(keywordStats.keywordId, keywords.id))
      .where(
        and(
          eq(keywordStats.keywordId, keywordId),
          eq(keywordStats.periodType, periodType)
        )
      )
      .orderBy(desc(keywordStats.periodStart))
      .limit(limit);

    return result.map(r => ({
      keywordId: r.keywordId,
      term: r.term,
      language: r.language ?? 'ko',
      periodType: r.periodType as 'week' | 'month',
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      count: r.count ?? 0,
      delta: r.delta ?? 0,
      deltaPercent: Number(r.deltaPercent) || 0,
    })).reverse(); // 시간순 정렬
  }

  /**
   * 전체 키워드 통계 재계산 (배치 작업용)
   */
  async recalculateAllStats(periodType: 'week' | 'month' = 'week'): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    // 최근 12주/12개월 통계 계산
    const periods = periodType === 'week' ? 12 : 12;
    
    for (let i = 0; i < periods; i++) {
      const periodStart = new Date(now);
      
      if (periodType === 'week') {
        // 주의 시작일 (월요일)
        const dayOfWeek = periodStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart.setDate(periodStart.getDate() - diff - (i * 7));
        periodStart.setHours(0, 0, 0, 0);
      } else {
        // 월의 시작일
        periodStart.setMonth(periodStart.getMonth() - i);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
      }

      const stats = periodType === 'week'
        ? await this.calculateWeeklyStats(periodStart)
        : await this.calculateMonthlyStats(periodStart);

      await this.saveStats(stats);
      processedCount += stats.length;
    }

    return processedCount;
  }

  /**
   * 카테고리별 트렌드 요약
   */
  async getCategoryTrends(periodType: 'week' | 'month' = 'week'): Promise<{
    category: string;
    totalCount: number;
    avgDelta: number;
    topKeywords: { term: string; count: number; delta: number }[];
  }[]> {
    const trending = await this.getTrendingKeywords({ periodType, limit: 100 });

    // 카테고리별 그룹화
    const categoryMap = new Map<string, TrendingKeyword[]>();
    
    for (const kw of trending) {
      const category = kw.category || 'other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(kw);
    }

    // 카테고리별 통계 계산
    const results = [];
    for (const [category, keywords] of categoryMap) {
      const totalCount = keywords.reduce((sum, kw) => sum + kw.currentCount, 0);
      const avgDelta = keywords.length > 0
        ? keywords.reduce((sum, kw) => sum + kw.delta, 0) / keywords.length
        : 0;
      const topKeywords = keywords
        .sort((a, b) => b.currentCount - a.currentCount)
        .slice(0, 5)
        .map(kw => ({
          term: kw.term,
          count: kw.currentCount,
          delta: kw.delta,
        }));

      results.push({
        category,
        totalCount,
        avgDelta: Math.round(avgDelta * 100) / 100,
        topKeywords,
      });
    }

    return results.sort((a, b) => b.totalCount - a.totalCount);
  }
}

export const keywordStatsService = new KeywordStatsService();
