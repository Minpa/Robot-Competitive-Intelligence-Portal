import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db, keywords, keywordStats, articleKeywords, productKeywords } from '../db/index.js';
import type { Keyword, KeywordStats } from '../types/index.js';
import type { CreateKeywordDto, CreateKeywordStatsDto } from '../types/dto.js';

export class KeywordService {
  /**
   * Create a new keyword
   */
  async create(data: CreateKeywordDto): Promise<Keyword> {
    const [keyword] = await db
      .insert(keywords)
      .values(data)
      .returning();
    return keyword;
  }

  /**
   * Find keyword by term and language
   */
  async findByTerm(term: string, language: string): Promise<Keyword | null> {
    const [keyword] = await db
      .select()
      .from(keywords)
      .where(and(eq(keywords.term, term), eq(keywords.language, language)))
      .limit(1);
    return keyword || null;
  }

  /**
   * Find or create keyword
   */
  async findOrCreate(data: CreateKeywordDto): Promise<Keyword> {
    const existing = await this.findByTerm(data.term, data.language);
    if (existing) return existing;
    return this.create(data);
  }

  /**
   * Get all keywords with optional filtering
   */
  async list(options: {
    language?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: Keyword[]; total: number }> {
    const { language, category, limit = 50, offset = 0 } = options;

    let query = db.select().from(keywords);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(keywords);

    const conditions = [];
    if (language) conditions.push(eq(keywords.language, language));
    if (category) conditions.push(eq(keywords.category, category));

    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      query = query.where(whereClause) as typeof query;
      countQuery = countQuery.where(whereClause) as typeof countQuery;
    }

    const [items, [{ count }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
    ]);

    return { items, total: Number(count) };
  }

  /**
   * Associate keyword with article
   */
  async associateWithArticle(keywordId: string, articleId: string): Promise<void> {
    await db
      .insert(articleKeywords)
      .values({ keywordId, articleId })
      .onConflictDoNothing();
  }

  /**
   * Associate keyword with product
   */
  async associateWithProduct(keywordId: string, productId: string): Promise<void> {
    await db
      .insert(productKeywords)
      .values({ keywordId, productId })
      .onConflictDoNothing();
  }

  /**
   * Get keywords for an article
   */
  async getArticleKeywords(articleId: string): Promise<Keyword[]> {
    const result = await db
      .select({ keyword: keywords })
      .from(articleKeywords)
      .innerJoin(keywords, eq(articleKeywords.keywordId, keywords.id))
      .where(eq(articleKeywords.articleId, articleId));
    return result.map(r => r.keyword);
  }

  /**
   * Get keywords for a product
   */
  async getProductKeywords(productId: string): Promise<Keyword[]> {
    const result = await db
      .select({ keyword: keywords })
      .from(productKeywords)
      .innerJoin(keywords, eq(productKeywords.keywordId, keywords.id))
      .where(eq(productKeywords.productId, productId));
    return result.map(r => r.keyword);
  }

  /**
   * Create or update keyword stats
   */
  async upsertStats(data: {
    keywordId: string;
    periodType: string;
    periodStart: string;
    periodEnd: string;
    count: number;
    delta?: number;
    deltaPercent?: number;
    relatedCompanyId?: string;
    relatedProductId?: string;
  }): Promise<KeywordStats> {
    const [stats] = await db
      .insert(keywordStats)
      .values({
        keywordId: data.keywordId,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        count: data.count,
        delta: data.delta,
        deltaPercent: data.deltaPercent?.toString(),
        relatedCompanyId: data.relatedCompanyId,
        relatedProductId: data.relatedProductId,
      })
      .onConflictDoUpdate({
        target: [keywordStats.keywordId, keywordStats.periodType, keywordStats.periodStart],
        set: {
          count: data.count,
          delta: data.delta,
          deltaPercent: data.deltaPercent?.toString(),
          calculatedAt: new Date(),
        },
      })
      .returning();
    return stats as KeywordStats;
  }

  /**
   * Get keyword stats for a period
   */
  async getStats(options: {
    keywordId?: string;
    periodType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<KeywordStats[]> {
    const { keywordId, periodType, startDate, endDate, limit = 100 } = options;

    let query = db.select().from(keywordStats);
    const conditions = [];

    if (keywordId) conditions.push(eq(keywordStats.keywordId, keywordId));
    if (periodType) conditions.push(eq(keywordStats.periodType, periodType));
    if (startDate) conditions.push(gte(keywordStats.periodStart, startDate));
    if (endDate) conditions.push(lte(keywordStats.periodStart, endDate));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(keywordStats.periodStart)).limit(limit) as Promise<KeywordStats[]>;
  }

  /**
   * Get trending keywords for a period
   */
  async getTrending(options: {
    periodType?: string;
    limit?: number;
    minCount?: number;
  } = {}): Promise<(KeywordStats & { keyword: Keyword })[]> {
    const { periodType = 'week', limit = 10, minCount = 1 } = options;

    const result = await db
      .select({
        stats: keywordStats,
        keyword: keywords,
      })
      .from(keywordStats)
      .innerJoin(keywords, eq(keywordStats.keywordId, keywords.id))
      .where(and(
        eq(keywordStats.periodType, periodType),
        gte(keywordStats.count, minCount)
      ))
      .orderBy(desc(keywordStats.deltaPercent))
      .limit(limit);

    return result.map(r => ({ ...r.stats, keyword: r.keyword })) as (KeywordStats & { keyword: Keyword })[];
  }
}

export const keywordService = new KeywordService();
