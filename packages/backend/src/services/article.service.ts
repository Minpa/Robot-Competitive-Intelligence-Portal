import { eq, and, sql, desc, asc, gte, lte } from 'drizzle-orm';
import { db, articles, companies, products } from '../db/index.js';
import type {
  Article,
  CreateArticleDto,
  UpdateArticleDto,
  ArticleFiltersDto,
  PaginationDto,
  PaginatedResult,
  TimelineEntry,
} from '../types/index.js';
import { indexDocument, deleteDocument, INDICES } from '../search/elasticsearch.js';
import { deduplicationService } from './deduplication.service.js';

export interface ArticleCreateResult {
  article: Article;
  isDuplicate: boolean;
  existingId?: string;
}

export class ArticleService {
  async create(data: CreateArticleDto): Promise<Article> {
    // Use DeduplicationService for content hash and duplicate check
    const dedupResult = await deduplicationService.checkContent(data.content);

    // Check for duplicate - return existing article instead of throwing
    if (dedupResult.isDuplicate) {
      deduplicationService.logDuplicateDetection(dedupResult.contentHash, data.url);
      const existing = await this.getById(dedupResult.existingId!);
      if (existing) {
        return existing;
      }
    }

    const contentHash = dedupResult.contentHash;

    const [article] = await db
      .insert(articles)
      .values({
        productId: data.productId,
        companyId: data.companyId,
        title: data.title,
        source: data.source,
        url: data.url,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        summary: data.summary,
        content: data.content,
        language: data.language || 'en',
        contentHash,
      })
      .returning();

    await this.indexArticle(article!);

    return article as Article;
  }

  async getById(id: string): Promise<Article | null> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return (article as Article) || null;
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article | null> {
    const [article] = await db
      .update(articles)
      .set(data)
      .where(eq(articles.id, id))
      .returning();

    if (article) {
      await this.indexArticle(article);
    }

    return (article as Article) || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(articles).where(eq(articles.id, id)).returning({ id: articles.id });

    if (result.length > 0) {
      try {
        await deleteDocument(INDICES.ARTICLES, id);
      } catch {
        // Ignore ES errors
      }
      return true;
    }
    return false;
  }

  async list(
    filters: ArticleFiltersDto,
    pagination: PaginationDto
  ): Promise<PaginatedResult<Article>> {
    const { page, pageSize, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.companyId) {
      conditions.push(eq(articles.companyId, filters.companyId));
    }
    if (filters.productId) {
      conditions.push(eq(articles.productId, filters.productId));
    }
    if (filters.source) {
      conditions.push(eq(articles.source, filters.source));
    }
    if (filters.language) {
      conditions.push(eq(articles.language, filters.language));
    }
    if (filters.publishedAfter) {
      conditions.push(gte(articles.publishedAt, new Date(filters.publishedAfter)));
    }
    if (filters.publishedBefore) {
      conditions.push(lte(articles.publishedAt, new Date(filters.publishedBefore)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);

    const orderByColumn =
      sortBy === 'title' ? articles.title : sortBy === 'source' ? articles.source : articles.publishedAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(orderDirection(orderByColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items: items as Article[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getByProduct(productId: string): Promise<Article[]> {
    const results = await db
      .select()
      .from(articles)
      .where(eq(articles.productId, productId))
      .orderBy(desc(articles.publishedAt));

    return results as Article[];
  }

  async getByCompany(companyId: string): Promise<Article[]> {
    const results = await db
      .select()
      .from(articles)
      .where(eq(articles.companyId, companyId))
      .orderBy(desc(articles.publishedAt));

    return results as Article[];
  }

  async getTimeline(
    entityId: string,
    entityType: 'product' | 'company'
  ): Promise<TimelineEntry[]> {
    const condition =
      entityType === 'product'
        ? eq(articles.productId, entityId)
        : eq(articles.companyId, entityId);

    const results = await db
      .select()
      .from(articles)
      .where(condition)
      .orderBy(desc(articles.publishedAt));

    // Group by date
    const grouped = new Map<string, Article[]>();
    for (const article of results) {
      const date = article.publishedAt
        ? new Date(article.publishedAt).toISOString().split('T')[0]
        : 'unknown';
      if (!grouped.has(date!)) {
        grouped.set(date!, []);
      }
      grouped.get(date!)!.push(article as Article);
    }

    return Array.from(grouped.entries()).map(([date, articleList]) => ({
      date,
      articles: articleList,
      count: articleList.length,
    }));
  }

  /**
   * Create article with deduplication - returns result with duplicate info
   */
  async createWithDedup(data: CreateArticleDto): Promise<ArticleCreateResult> {
    const dedupResult = await deduplicationService.checkContent(data.content);

    if (dedupResult.isDuplicate) {
      deduplicationService.logDuplicateDetection(dedupResult.contentHash, data.url);
      const existing = await this.getById(dedupResult.existingId!);
      return {
        article: existing!,
        isDuplicate: true,
        existingId: dedupResult.existingId,
      };
    }

    const article = await this.create(data);
    return {
      article,
      isDuplicate: false,
    };
  }

  generateContentHash(content: string): string {
    return deduplicationService.generateContentHash(content);
  }

  async checkDuplicate(contentHash: string): Promise<boolean> {
    return deduplicationService.isDuplicate(contentHash);
  }

  private async indexArticle(article: typeof articles.$inferSelect) {
    try {
      let companyName: string | undefined;
      let productName: string | undefined;

      if (article.companyId) {
        const [company] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, article.companyId))
          .limit(1);
        companyName = company?.name;
      }

      if (article.productId) {
        const [product] = await db
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, article.productId))
          .limit(1);
        productName = product?.name;
      }

      await indexDocument(INDICES.ARTICLES, article.id, {
        id: article.id,
        productId: article.productId,
        companyId: article.companyId,
        companyName,
        productName,
        title: article.title,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
        summary: article.summary,
        content: article.content,
        language: article.language,
        collectedAt: article.collectedAt,
        createdAt: article.createdAt,
      });
    } catch (error) {
      console.error('Failed to index article:', error);
    }
  }
}

export const articleService = new ArticleService();
