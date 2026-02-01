import { eq, desc, sql, and, gte, isNull, or } from 'drizzle-orm';
import { db, crawlTargets, crawlJobs, crawlErrors, articles } from '../db/index.js';
import type { CrawlTarget, CrawlJob, CrawlError, RateLimitConfig, CrawlPattern } from '../types/index.js';

export interface CreateCrawlTargetDto {
  domain: string;
  urls?: string[];
  patterns?: CrawlPattern[];
  cronExpression?: string;
  rateLimit?: RateLimitConfig;
  enabled?: boolean;
}

export interface UpdateCrawlTargetDto {
  domain?: string;
  urls?: string[];
  patterns?: CrawlPattern[];
  cronExpression?: string;
  rateLimit?: RateLimitConfig;
  enabled?: boolean;
}

export interface CrawlErrorStats {
  total: number;
  byType: Record<string, number>;
  recentErrors: number;
}

export class AdminCrawlerService {
  /**
   * Create a new crawl target
   */
  async createTarget(data: CreateCrawlTargetDto): Promise<CrawlTarget> {
    const [target] = await db
      .insert(crawlTargets)
      .values({
        domain: data.domain,
        urls: data.urls || [],
        patterns: data.patterns || [],
        cronExpression: data.cronExpression || '0 0 * * 0',
        rateLimit: data.rateLimit,
        enabled: data.enabled ?? true,
      })
      .returning();
    return target as CrawlTarget;
  }

  /**
   * Get all crawl targets
   */
  async listTargets(): Promise<CrawlTarget[]> {
    const targets = await db
      .select()
      .from(crawlTargets)
      .orderBy(desc(crawlTargets.createdAt));
    return targets as CrawlTarget[];
  }

  /**
   * Get a crawl target by ID
   */
  async getTarget(id: string): Promise<CrawlTarget | null> {
    const [target] = await db
      .select()
      .from(crawlTargets)
      .where(eq(crawlTargets.id, id))
      .limit(1);
    return (target as CrawlTarget) || null;
  }

  /**
   * Update a crawl target
   */
  async updateTarget(id: string, data: UpdateCrawlTargetDto): Promise<CrawlTarget | null> {
    const [target] = await db
      .update(crawlTargets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(crawlTargets.id, id))
      .returning();
    return (target as CrawlTarget) || null;
  }

  /**
   * Delete a crawl target
   */
  async deleteTarget(id: string): Promise<boolean> {
    const result = await db
      .delete(crawlTargets)
      .where(eq(crawlTargets.id, id))
      .returning({ id: crawlTargets.id });
    return result.length > 0;
  }

  /**
   * Update rate limit for a target
   */
  async updateRateLimit(id: string, rateLimit: RateLimitConfig): Promise<CrawlTarget | null> {
    return this.updateTarget(id, { rateLimit });
  }

  /**
   * Enable/disable a target
   */
  async setTargetEnabled(id: string, enabled: boolean): Promise<CrawlTarget | null> {
    return this.updateTarget(id, { enabled });
  }

  /**
   * Create a manual crawl job
   */
  async triggerManualCrawl(targetId: string): Promise<CrawlJob> {
    const [job] = await db
      .insert(crawlJobs)
      .values({
        targetId,
        status: 'pending',
        metadata: { manual: true, triggeredAt: new Date().toISOString() },
      })
      .returning();
    return job as CrawlJob;
  }

  /**
   * Get crawl jobs for a target
   */
  async getJobsForTarget(targetId: string, limit: number = 20): Promise<CrawlJob[]> {
    const jobs = await db
      .select()
      .from(crawlJobs)
      .where(eq(crawlJobs.targetId, targetId))
      .orderBy(desc(crawlJobs.startedAt))
      .limit(limit);
    return jobs as CrawlJob[];
  }

  /**
   * Get all crawl jobs
   */
  async listJobs(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: CrawlJob[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    let query = db.select().from(crawlJobs);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(crawlJobs);

    if (status) {
      query = query.where(eq(crawlJobs.status, status)) as typeof query;
      countQuery = countQuery.where(eq(crawlJobs.status, status)) as typeof countQuery;
    }

    const [items, countResult] = await Promise.all([
      query.orderBy(desc(crawlJobs.startedAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    return { items: items as CrawlJob[], total: Number(countResult[0]?.count ?? 0) };
  }

  /**
   * Get crawl errors
   */
  async getErrors(options: {
    jobId?: string;
    errorType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: CrawlError[]; total: number }> {
    const { jobId, errorType, limit = 100, offset = 0 } = options;

    let query = db.select().from(crawlErrors);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(crawlErrors);

    const conditions = [];
    if (jobId) conditions.push(eq(crawlErrors.jobId, jobId));
    if (errorType) conditions.push(eq(crawlErrors.errorType, errorType));

    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      query = query.where(whereClause) as typeof query;
      countQuery = countQuery.where(whereClause) as typeof countQuery;
    }

    const [items, countResult] = await Promise.all([
      query.orderBy(desc(crawlErrors.occurredAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    return { items: items as CrawlError[], total: Number(countResult[0]?.count ?? 0) };
  }

  /**
   * Get error statistics
   */
  async getErrorStats(): Promise<CrawlErrorStats> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalResult,
      byTypeResult,
      recentErrorsResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(crawlErrors),
      db
        .select({
          errorType: crawlErrors.errorType,
          count: sql<number>`count(*)`,
        })
        .from(crawlErrors)
        .groupBy(crawlErrors.errorType),
      db
        .select({ count: sql<number>`count(*)` })
        .from(crawlErrors)
        .where(gte(crawlErrors.occurredAt, oneWeekAgo)),
    ]);

    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row.errorType] = Number(row.count);
    }

    return {
      total: Number(totalResult[0]?.count ?? 0),
      byType,
      recentErrors: Number(recentErrorsResult[0]?.count ?? 0),
    };
  }

  /**
   * Update last crawled timestamp for a target
   */
  async updateLastCrawled(id: string): Promise<void> {
    await db
      .update(crawlTargets)
      .set({ lastCrawled: new Date(), updatedAt: new Date() })
      .where(eq(crawlTargets.id, id));
  }

  /**
   * Trigger crawl for all enabled targets
   */
  async triggerAllCrawls(): Promise<{ triggered: number; targets: string[] }> {
    const enabledTargets = await db
      .select()
      .from(crawlTargets)
      .where(eq(crawlTargets.enabled, true));

    const triggeredTargets: string[] = [];

    for (const target of enabledTargets) {
      await db
        .insert(crawlJobs)
        .values({
          targetId: target.id,
          status: 'pending',
          metadata: { manual: true, triggeredAt: new Date().toISOString(), bulkTrigger: true },
        });
      triggeredTargets.push(target.domain);
    }

    return {
      triggered: triggeredTargets.length,
      targets: triggeredTargets,
    };
  }

  /**
   * Get count of articles that need AI analysis
   */
  async getUnanalyzedArticleCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(
        or(
          isNull(articles.summary),
          eq(articles.summary, '')
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Get articles that need AI analysis (no summary)
   */
  async getUnanalyzedArticles(limit: number = 50): Promise<Array<{ id: string; title: string; content: string | null }>> {
    const result = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
      })
      .from(articles)
      .where(
        or(
          isNull(articles.summary),
          eq(articles.summary, '')
        )
      )
      .orderBy(desc(articles.createdAt))
      .limit(limit);
    return result;
  }

  /**
   * Update article with AI analysis result
   */
  async updateArticleAnalysis(id: string, summary: string, category: string, productType: string = 'none'): Promise<void> {
    await db
      .update(articles)
      .set({
        summary,
        category,
        productType,
      })
      .where(eq(articles.id, id));
  }
}

export const adminCrawlerService = new AdminCrawlerService();
