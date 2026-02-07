import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { db, products, companies, productSpecs, articles, productKeywords, keywords } from '../db/index.js';
import type {
  Product,
  ProductType,
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  PaginationDto,
  PaginatedResult,
  ProductWithDetails,
} from '../types/index.js';
import { indexDocument, deleteDocument, INDICES } from '../search/elasticsearch.js';

export class ProductService {
  async create(data: CreateProductDto): Promise<Product> {
    // Validate company exists
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, data.companyId))
      .limit(1);

    if (!company) {
      throw new Error(`Company with id ${data.companyId} not found`);
    }

    // Validate product type
    const validTypes: ProductType[] = ['humanoid', 'service', 'logistics', 'home'];
    if (!validTypes.includes(data.type as ProductType)) {
      throw new Error(`Invalid product type: ${data.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    const [product] = await db
      .insert(products)
      .values({
        companyId: data.companyId,
        name: data.name,
        series: data.series,
        type: data.type,
        releaseDate: data.releaseDate,
        targetMarket: data.targetMarket,
        status: data.status || 'announced',
      })
      .returning();

    await this.indexProduct(product!);

    return product as Product;
  }

  async getById(id: string): Promise<Product | null> {
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return (product as Product) || null;
  }

  async getWithDetails(id: string): Promise<ProductWithDetails | null> {
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!product) return null;

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, product.companyId))
      .limit(1);

    const [spec] = await db
      .select()
      .from(productSpecs)
      .where(eq(productSpecs.productId, id))
      .limit(1);

    const productArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.productId, id))
      .orderBy(desc(articles.publishedAt))
      .limit(20);

    const keywordResults = await db
      .select({ keyword: keywords })
      .from(productKeywords)
      .innerJoin(keywords, eq(productKeywords.keywordId, keywords.id))
      .where(eq(productKeywords.productId, id));

    return {
      product: product as Product,
      company: company as ProductWithDetails['company'],
      spec: spec as ProductWithDetails['spec'] || null,
      articles: productArticles as ProductWithDetails['articles'],
      keywords: keywordResults.map((r) => r.keyword) as ProductWithDetails['keywords'],
    };
  }

  async update(id: string, data: UpdateProductDto): Promise<Product | null> {
    // Validate product type if provided
    if (data.type) {
      const validTypes: ProductType[] = ['humanoid', 'service', 'logistics', 'home'];
      if (!validTypes.includes(data.type as ProductType)) {
        throw new Error(`Invalid product type: ${data.type}`);
      }
    }

    const [product] = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (product) {
      await this.indexProduct(product);
    }

    return (product as Product) || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });

    if (result.length > 0) {
      try {
        await deleteDocument(INDICES.PRODUCTS, id);
      } catch {
        // Ignore ES errors
      }
      return true;
    }
    return false;
  }

  async list(
    filters: ProductFiltersDto,
    pagination: PaginationDto
  ): Promise<PaginatedResult<Product & { companyName?: string }>> {
    const { page, pageSize, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.companyId) {
      conditions.push(eq(products.companyId, filters.companyId));
    }
    if (filters.category) {
      conditions.push(eq(products.type, filters.category));
    }
    if (filters.releaseYear) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${products.releaseDate}) = ${filters.releaseYear}`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);

    const orderByColumn =
      sortBy === 'name'
        ? products.name
        : sortBy === 'releaseDate'
        ? products.releaseDate
        : products.updatedAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Join with companies to get company name
    const items = await db
      .select({
        id: products.id,
        companyId: products.companyId,
        name: products.name,
        series: products.series,
        type: products.type,
        releaseDate: products.releaseDate,
        targetMarket: products.targetMarket,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        companyName: companies.name,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .where(whereClause)
      .orderBy(orderDirection(orderByColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items: items as (Product & { companyName?: string })[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getByCompany(companyId: string): Promise<Product[]> {
    const results = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(desc(products.releaseDate));

    return results as Product[];
  }

  private async indexProduct(product: typeof products.$inferSelect) {
    try {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, product.companyId))
        .limit(1);

      const [spec] = await db
        .select()
        .from(productSpecs)
        .where(eq(productSpecs.productId, product.id))
        .limit(1);

      await indexDocument(INDICES.PRODUCTS, product.id, {
        id: product.id,
        companyId: product.companyId,
        companyName: company?.name,
        name: product.name,
        series: product.series,
        type: product.type,
        releaseDate: product.releaseDate,
        targetMarket: product.targetMarket,
        status: product.status,
        dof: spec?.dof,
        payloadKg: spec?.payloadKg ? parseFloat(spec.payloadKg) : null,
        speedMps: spec?.speedMps ? parseFloat(spec.speedMps) : null,
        batteryMinutes: spec?.batteryMinutes,
        priceMin: spec?.priceMin ? parseFloat(spec.priceMin) : null,
        priceMax: spec?.priceMax ? parseFloat(spec.priceMax) : null,
        priceCurrency: spec?.priceCurrency,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    } catch (error) {
      console.error('Failed to index product:', error);
    }
  }
}

export const productService = new ProductService();
