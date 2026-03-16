import { read, utils } from 'xlsx';
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

  async findByUrl(url: string): Promise<Article | null> {
    const [article] = await db.select().from(articles).where(eq(articles.url, url)).limit(1);
    return (article as Article) || null;
  }

  /**
   * Import articles from an Excel buffer.
   *
   * The first sheet is used. Column headers are case-insensitive and may use spaces.
   * Supported columns: title, source, url, publishedAt/published_at, summary, content, language, category,
   * productType, productId, companyId
   */
  async importFromExcel(
    buffer: Buffer,
    options: { updateExisting?: boolean } = { updateExisting: true }
  ): Promise<{ created: number; updated: number; skipped: number; errors: Array<{ row: number; error: string }> }> {
    const workbook = read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel sheet not found');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error('Excel sheet not found');
    }

    const rows = utils.sheet_to_json<Record<string, unknown> | undefined>(sheet, { defval: null }) as Array<Record<string, unknown> | undefined>;
    const normalizedRows: Record<string, unknown>[] = rows.filter(Boolean) as Record<string, unknown>[];

    const normalizeKey = (key: string): string =>
      key
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

    type ImportRow = CreateArticleDto & {
      category?: string;
      productType?: string;
    };

    const mapRow = (row: Record<string, unknown>) => {
      const mapped: any = {};
      for (const [rawKey, value] of Object.entries(row)) {
        if (value === null || value === undefined) continue;
        const key = normalizeKey(rawKey);
        switch (key) {
          case 'title':
            mapped.title = String(value);
            break;
          case 'source':
            mapped.source = String(value);
            break;
          case 'url':
            mapped.url = String(value);
            break;
          case 'publishedat':
          case 'published_at':
            // Accept Date object or string
            mapped.publishedAt = value instanceof Date ? value.toISOString() : String(value);
            break;
          case 'summary':
            mapped.summary = String(value);
            break;
          case 'content':
            mapped.content = String(value);
            break;
          case 'language':
            mapped.language = String(value);
            break;
          case 'category':
            mapped.category = String(value);
            break;
          case 'producttype':
          case 'product_type':
            mapped.productType = String(value);
            break;
          case 'productid':
          case 'product_id':
            mapped.productId = String(value);
            break;
          case 'companyid':
          case 'company_id':
            mapped.companyId = String(value);
            break;
          default:
            break;
        }
      }
      return mapped as ImportRow;
    };

    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let index = 0; index < normalizedRows.length; index += 1) {
      const rowNum = index + 2; // assuming header row
      const row = normalizedRows[index];
      if (!row) { result.skipped += 1; continue; }
      try {
        const payload = mapRow(row) as ImportRow;
        if (!payload.title || !payload.source || !payload.url || !payload.content) {
          result.skipped += 1;
          continue;
        }

        // Ensure publishedAt is ISO string if present
        if (payload.publishedAt) {
          try {
            const d = new Date(payload.publishedAt);
            if (!Number.isNaN(d.getTime())) payload.publishedAt = d.toISOString();
          } catch {
            // ignore invalid date
          }
        }

        const existing = await this.findByUrl(payload.url);
        if (existing) {
          if (options.updateExisting) {
            // Update only fields we allow (avoid changing contentHash)
            const updateData: any = {};
            if (payload.title) updateData.title = payload.title;
            if (payload.summary) updateData.summary = payload.summary;
            if (payload.productId) updateData.productId = payload.productId;
            if (payload.companyId) updateData.companyId = payload.companyId;
            // optionally update publishedAt and language/category too
            if (payload.publishedAt) updateData.publishedAt = payload.publishedAt;
            if (payload.language) updateData.language = payload.language;
            if (payload.category) updateData.category = payload.category;
            if (payload.productType) updateData.productType = payload.productType;

            const updated = await this.update(existing.id, updateData);
            if (updated) {
              result.updated += 1;
            } else {
              result.skipped += 1;
            }
          } else {
            result.skipped += 1;
          }
          continue;
        }

        await this.create(payload);
        result.created += 1;
      } catch (err) {
        result.errors.push({ row: rowNum, error: (err as Error).message });
      }
    }

    return result;
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
