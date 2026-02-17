/**
 * AggregationService - 집계 뷰 서비스
 * 
 * 세그먼트별, 연도별, 부품별, 키워드별 집계
 * 인메모리 캐시 (TTL 기반)
 */

import { db, humanoidRobots, applicationCases, robotComponents, components, articleKeywords, keywords, keywordStats, companies } from '../db/index.js';
import { eq, sql, and, gte, lte, count } from 'drizzle-orm';

export interface SegmentAggregation {
  environment: string;
  task: string;
  locomotion: string;
  robotCount: number;
  caseCount: number;
}

export interface YearlyAggregation {
  year: number;
  launches: number;
  applications: number;
  investmentEvents: number;
}

export interface ComponentAggregation {
  componentId: string;
  componentName: string;
  componentType: string;
  adoptionCount: number;
  avgPerformance: Record<string, number>;
}

export interface KeywordAggregation {
  keywordId: string;
  term: string;
  articleCount: number;
  deltaPercent: number;
}

// 캐시 엔트리
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5분

export class AggregationService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * 세그먼트별 집계 (환경×작업×이동 방식)
   */
  async getSegmentAggregation(): Promise<SegmentAggregation[]> {
    return this.getCachedOrCompute('segment', async () => {
      const cases = await db
        .select({
          environment: applicationCases.environmentType,
          task: applicationCases.taskType,
          locomotion: humanoidRobots.locomotionType,
          robotId: applicationCases.robotId,
        })
        .from(applicationCases)
        .innerJoin(humanoidRobots, eq(applicationCases.robotId, humanoidRobots.id));

      const segmentMap = new Map<string, { robotIds: Set<string>; caseCount: number }>();

      for (const row of cases) {
        const key = `${row.environment || 'unknown'}|${row.task || 'unknown'}|${row.locomotion || 'unknown'}`;
        if (!segmentMap.has(key)) {
          segmentMap.set(key, { robotIds: new Set(), caseCount: 0 });
        }
        const entry = segmentMap.get(key)!;
        entry.robotIds.add(row.robotId);
        entry.caseCount++;
      }

      return Array.from(segmentMap.entries()).map(([key, val]) => {
        const [environment, task, locomotion] = key.split('|');
        return {
          environment: environment || 'unknown',
          task: task || 'unknown',
          locomotion: locomotion || 'unknown',
          robotCount: val.robotIds.size,
          caseCount: val.caseCount,
        };
      });
    });
  }

  /**
   * 연도별 집계
   */
  async getYearlyAggregation(): Promise<YearlyAggregation[]> {
    return this.getCachedOrCompute('yearly', async () => {
      const robots = await db
        .select({
          year: humanoidRobots.announcementYear,
        })
        .from(humanoidRobots);

      const yearMap = new Map<number, { launches: number; applications: number }>();

      for (const r of robots) {
        const year = r.year || 0;
        if (year < 1990) continue;
        if (!yearMap.has(year)) yearMap.set(year, { launches: 0, applications: 0 });
        yearMap.get(year)!.launches++;
      }

      // 적용 사례 연도별 집계
      const cases = await db
        .select({ demoDate: applicationCases.demoDate })
        .from(applicationCases);

      for (const c of cases) {
        if (!c.demoDate) continue;
        const year = new Date(c.demoDate).getFullYear();
        if (!yearMap.has(year)) yearMap.set(year, { launches: 0, applications: 0 });
        yearMap.get(year)!.applications++;
      }

      return Array.from(yearMap.entries())
        .map(([year, val]) => ({
          year,
          launches: val.launches,
          applications: val.applications,
          investmentEvents: 0,
        }))
        .sort((a, b) => a.year - b.year);
    });
  }

  /**
   * 부품별 집계
   */
  async getComponentAggregation(): Promise<ComponentAggregation[]> {
    return this.getCachedOrCompute('component', async () => {
      const rows = await db
        .select({
          componentId: components.id,
          componentName: components.name,
          componentType: components.type,
          specifications: components.specifications,
        })
        .from(components);

      const adoptionCounts = await db
        .select({
          componentId: robotComponents.componentId,
          count: sql<number>`count(*)`,
        })
        .from(robotComponents)
        .groupBy(robotComponents.componentId);

      const countMap = new Map(adoptionCounts.map(a => [a.componentId, Number(a.count)]));

      return rows.map(r => ({
        componentId: r.componentId,
        componentName: r.componentName,
        componentType: r.componentType,
        adoptionCount: countMap.get(r.componentId) || 0,
        avgPerformance: this.extractPerformance(r.specifications as any),
      }));
    });
  }

  /**
   * 키워드별 집계
   */
  async getKeywordAggregation(period: 'week' | 'month' = 'month'): Promise<KeywordAggregation[]> {
    return this.getCachedOrCompute(`keyword_${period}`, async () => {
      const rows = await db
        .select({
          keywordId: keywords.id,
          term: keywords.term,
        })
        .from(keywords);

      const result: KeywordAggregation[] = [];

      for (const kw of rows) {
        const [stats] = await db
          .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
          .from(keywordStats)
          .where(eq(keywordStats.keywordId, kw.keywordId));

        const articleCount = Number(stats?.total || 0);

        // 기사 키워드 카운트
        const [akCount] = await db
          .select({ cnt: sql<number>`count(*)` })
          .from(articleKeywords)
          .where(eq(articleKeywords.keywordId, kw.keywordId));

        const totalArticles = articleCount + Number(akCount?.cnt || 0);

        result.push({
          keywordId: kw.keywordId,
          term: kw.term,
          articleCount: totalArticles,
          deltaPercent: 0,
        });
      }

      return result.sort((a, b) => b.articleCount - a.articleCount);
    });
  }

  /**
   * 캐시 또는 계산
   */
  private async getCachedOrCompute<T>(key: string, compute: () => Promise<T>, ttlMs: number = DEFAULT_TTL): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const data = await compute();
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  private extractPerformance(specs: Record<string, any> | null): Record<string, number> {
    if (!specs) return {};
    const perf: Record<string, number> = {};
    if (typeof specs.ratedTorqueNm === 'number') perf.torqueNm = specs.ratedTorqueNm;
    if (typeof specs.topsMin === 'number') perf.topsMin = specs.topsMin;
    if (typeof specs.topsMax === 'number') perf.topsMax = specs.topsMax;
    return perf;
  }
}

export const aggregationService = new AggregationService();
