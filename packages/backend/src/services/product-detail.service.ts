import { eq, desc } from 'drizzle-orm';
import { db, products, productSpecs, companies, articles, productKeywords, keywords } from '../db/index.js';
import type { Product, ProductSpec, Company, Article, Keyword } from '../types/index.js';

export interface ProductDetail {
  product: Product;
  company: Company | null;
  spec: ProductSpec | null;
  articles: Article[];
  keywords: Keyword[];
  relatedProducts: Product[];
}

export class ProductDetailService {
  /**
   * Get complete product detail with all related data
   */
  async getProductDetail(productId: string): Promise<ProductDetail | null> {
    // Get product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return null;

    // Get all related data in parallel
    const [company, spec, productArticles, productKeywordsList, relatedProducts] = await Promise.all([
      this.getCompany(product.companyId),
      this.getSpec(productId),
      this.getArticles(productId),
      this.getKeywords(productId),
      this.getRelatedProducts(product.companyId, productId, product.type),
    ]);

    return {
      product: product as Product,
      company,
      spec,
      articles: productArticles,
      keywords: productKeywordsList,
      relatedProducts,
    };
  }

  private async getCompany(companyId: string): Promise<Company | null> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    return (company as Company) || null;
  }

  private async getSpec(productId: string): Promise<ProductSpec | null> {
    const [spec] = await db
      .select()
      .from(productSpecs)
      .where(eq(productSpecs.productId, productId))
      .limit(1);
    return (spec as ProductSpec) || null;
  }

  private async getArticles(productId: string): Promise<Article[]> {
    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.productId, productId))
      .orderBy(desc(articles.publishedAt))
      .limit(20);
    return result as Article[];
  }

  private async getKeywords(productId: string): Promise<Keyword[]> {
    const result = await db
      .select({ keyword: keywords })
      .from(productKeywords)
      .innerJoin(keywords, eq(productKeywords.keywordId, keywords.id))
      .where(eq(productKeywords.productId, productId));
    return result.map(r => r.keyword as Keyword);
  }

  private async getRelatedProducts(
    companyId: string,
    excludeProductId: string,
    _productType: string
  ): Promise<Product[]> {
    // Get other products from same company or same type
    const result = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .limit(5);
    
    return result.filter(p => p.id !== excludeProductId) as Product[];
  }

  /**
   * Get product comparison data for multiple products
   */
  async compareProducts(productIds: string[]): Promise<ProductDetail[]> {
    const details = await Promise.all(
      productIds.map(id => this.getProductDetail(id))
    );
    return details.filter((d): d is ProductDetail => d !== null);
  }

  /**
   * Get product timeline (articles and events over time)
   */
  async getProductTimeline(
    productId: string,
    options: { startDate?: string; endDate?: string; limit?: number } = {}
  ): Promise<{ date: string; type: string; title: string; id: string }[]> {
    const { limit = 50 } = options;

    const productArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(eq(articles.productId, productId))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return productArticles
      .filter(a => a.publishedAt)
      .map(a => ({
        date: a.publishedAt!.toISOString().split('T')[0] ?? '',
        type: 'article',
        title: a.title,
        id: a.id,
      }));
  }
}

export const productDetailService = new ProductDetailService();
