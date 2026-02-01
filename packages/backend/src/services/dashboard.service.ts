import { sql, desc, gte, and, eq } from 'drizzle-orm';
import { db, companies, products, articles, keywords, keywordStats } from '../db/index.js';

export interface DashboardSummary {
  totalCompanies: number;
  totalProducts: number;
  totalArticles: number;
  totalKeywords: number;
  weeklyNewProducts: number;
  weeklyNewArticles: number;
  lastUpdated: string;
}

export interface WeeklyHighlight {
  type: 'new_product' | 'price_change' | 'article_peak' | 'trending_keyword';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  value?: number | string;
  date?: string;
}

export interface CategoryHighlight {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string | null;
}

export interface WeeklyHighlightsResponse {
  periodStart: string;
  periodEnd: string;
  categories: {
    product: CategoryHighlight[];      // 로봇 제품
    technology: CategoryHighlight[];   // 신기술
    industry: CategoryHighlight[];     // 산업 동향
    other: CategoryHighlight[];        // 기타 동향
  };
  productTypes: {
    robot: CategoryHighlight[];        // 로봇 완제품
    rfm: CategoryHighlight[];          // RFM/VLA
    soc: CategoryHighlight[];          // SoC/AI칩
    actuator: CategoryHighlight[];     // 액츄에이터
  };
}

export interface TimelineEvent {
  date: string;
  type: 'product_release' | 'article' | 'price_update';
  title: string;
  entityId: string;
  entityType: string;
  companyName?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export class DashboardService {
  /**
   * Get dashboard summary with total counts and weekly metrics
   */
  async getSummary(): Promise<DashboardSummary> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalCompaniesResult,
      totalProductsResult,
      totalArticlesResult,
      totalKeywordsResult,
      weeklyNewProductsResult,
      weeklyNewArticlesResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(companies),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(articles),
      db.select({ count: sql<number>`count(*)` }).from(keywords),
      db.select({ count: sql<number>`count(*)` }).from(products).where(gte(products.createdAt, oneWeekAgo)),
      db.select({ count: sql<number>`count(*)` }).from(articles).where(gte(articles.createdAt, oneWeekAgo)),
    ]);

    return {
      totalCompanies: Number(totalCompaniesResult[0]?.count ?? 0),
      totalProducts: Number(totalProductsResult[0]?.count ?? 0),
      totalArticles: Number(totalArticlesResult[0]?.count ?? 0),
      totalKeywords: Number(totalKeywordsResult[0]?.count ?? 0),
      weeklyNewProducts: Number(weeklyNewProductsResult[0]?.count ?? 0),
      weeklyNewArticles: Number(weeklyNewArticlesResult[0]?.count ?? 0),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get weekly highlights by category (actually monthly for better analysis)
   */
  async getWeeklyHighlights(limit: number = 5): Promise<WeeklyHighlightsResponse> {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    // Get articles from this month grouped by category
    const monthlyArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        summary: articles.summary,
        source: articles.source,
        url: articles.url,
        publishedAt: articles.publishedAt,
        category: articles.category,
        productType: articles.productType,
      })
      .from(articles)
      .where(gte(articles.createdAt, oneMonthAgo))
      .orderBy(desc(articles.publishedAt))
      .limit(100);

    const categories: WeeklyHighlightsResponse['categories'] = {
      product: [],
      technology: [],
      industry: [],
      other: [],
    };

    const productTypes: WeeklyHighlightsResponse['productTypes'] = {
      robot: [],
      rfm: [],
      soc: [],
      actuator: [],
    };

    for (const article of monthlyArticles) {
      const highlight: CategoryHighlight = {
        id: article.id,
        title: article.title,
        summary: article.summary || '',
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt?.toISOString() || null,
      };

      // 동향 카테고리 분류
      const cat = article.category as keyof typeof categories;
      if (cat && categories[cat] && categories[cat].length < limit) {
        categories[cat].push(highlight);
      } else if (categories.other.length < limit) {
        categories.other.push(highlight);
      }

      // 제품 유형 분류
      const pType = article.productType as keyof typeof productTypes;
      if (pType && productTypes[pType] && productTypes[pType].length < limit) {
        productTypes[pType].push(highlight);
      }
    }

    return {
      periodStart: oneMonthAgo.toISOString().split('T')[0] || '',
      periodEnd: now.toISOString().split('T')[0] || '',
      categories,
      productTypes,
    };
  }

  /**
   * Get legacy weekly highlights (for backward compatibility)
   */
  async getLegacyWeeklyHighlights(limit: number = 5): Promise<WeeklyHighlight[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const highlights: WeeklyHighlight[] = [];

    // New products this week
    const newProducts = await db
      .select({
        id: products.id,
        name: products.name,
        companyId: products.companyId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(gte(products.createdAt, oneWeekAgo))
      .orderBy(desc(products.createdAt))
      .limit(3);

    for (const product of newProducts) {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, product.companyId))
        .limit(1);

      highlights.push({
        type: 'new_product',
        title: `New Product: ${product.name}`,
        description: `${company?.name || 'Unknown'} released a new product`,
        entityId: product.id,
        entityType: 'product',
        date: product.createdAt.toISOString(),
      });
    }

    // Trending keywords
    const trendingKeywords = await db
      .select({
        term: keywords.term,
        delta: keywordStats.delta,
        deltaPercent: keywordStats.deltaPercent,
      })
      .from(keywordStats)
      .innerJoin(keywords, eq(keywordStats.keywordId, keywords.id))
      .where(eq(keywordStats.periodType, 'week'))
      .orderBy(desc(keywordStats.deltaPercent))
      .limit(2);

    for (const kw of trendingKeywords) {
      if (kw.delta && kw.delta > 0) {
        highlights.push({
          type: 'trending_keyword',
          title: `Trending: "${kw.term}"`,
          description: `Keyword frequency increased by ${kw.deltaPercent}%`,
          value: kw.term,
        });
      }
    }

    // Article peaks (companies with most articles this week)
    const articleCounts = await db
      .select({
        companyId: articles.companyId,
        count: sql<number>`count(*)`,
      })
      .from(articles)
      .where(and(
        gte(articles.createdAt, oneWeekAgo),
        sql`${articles.companyId} IS NOT NULL`
      ))
      .groupBy(articles.companyId)
      .orderBy(desc(sql`count(*)`))
      .limit(2);

    for (const ac of articleCounts) {
      if (ac.companyId && Number(ac.count) >= 3) {
        const [company] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, ac.companyId))
          .limit(1);

        highlights.push({
          type: 'article_peak',
          title: `PR Peak: ${company?.name || 'Unknown'}`,
          description: `${ac.count} articles published this week`,
          entityId: ac.companyId,
          entityType: 'company',
          value: Number(ac.count),
        });
      }
    }

    return highlights.slice(0, limit);
  }

  /**
   * Get timeline data for a date range
   */
  async getTimeline(options: {
    startDate?: string;
    endDate?: string;
    companyId?: string;
    limit?: number;
  } = {}): Promise<TimelineEvent[]> {
    const { startDate, endDate, companyId, limit = 50 } = options;
    const events: TimelineEvent[] = [];

    // Get product releases
    let productQuery = db
      .select({
        id: products.id,
        name: products.name,
        releaseDate: products.releaseDate,
        companyId: products.companyId,
      })
      .from(products)
      .orderBy(desc(products.releaseDate))
      .limit(limit);

    if (companyId) {
      productQuery = productQuery.where(eq(products.companyId, companyId)) as typeof productQuery;
    }

    const productReleases = await productQuery;

    for (const p of productReleases) {
      if (p.releaseDate) {
        const [company] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, p.companyId))
          .limit(1);

        events.push({
          date: p.releaseDate,
          type: 'product_release',
          title: p.name,
          entityId: p.id,
          entityType: 'product',
          companyName: company?.name,
        });
      }
    }

    // Get articles
    let articleQuery = db
      .select({
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
        companyId: articles.companyId,
      })
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    if (companyId) {
      articleQuery = articleQuery.where(eq(articles.companyId, companyId)) as typeof articleQuery;
    }

    const articleList = await articleQuery;

    for (const a of articleList) {
      if (a.publishedAt) {
        let companyName: string | undefined;
        if (a.companyId) {
          const [company] = await db
            .select({ name: companies.name })
            .from(companies)
            .where(eq(companies.id, a.companyId))
            .limit(1);
          companyName = company?.name;
        }

        events.push({
          date: a.publishedAt.toISOString().split('T')[0] ?? '',
          type: 'article',
          title: a.title,
          entityId: a.id,
          entityType: 'article',
          companyName,
        });
      }
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by date range if provided
    let filtered = events;
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get chart data for articles over time
   */
  async getArticleChartData(options: {
    weeks?: number;
  } = {}): Promise<ChartData> {
    const { weeks = 12 } = options;
    const labels: string[] = [];
    const data: number[] = [];

    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(and(
          gte(articles.createdAt, weekStart),
          sql`${articles.createdAt} < ${weekEnd}`
        ));

      const dateStr = weekStart.toISOString().split('T')[0];
      labels.push(dateStr ?? '');
      data.push(Number(result[0]?.count ?? 0));
    }

    return {
      labels,
      datasets: [{
        label: 'Articles',
        data,
      }],
    };
  }

  /**
   * Get chart data for products by type
   */
  async getProductTypeChartData(): Promise<ChartData> {
    const result = await db
      .select({
        type: products.type,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .groupBy(products.type);

    return {
      labels: result.map(r => r.type),
      datasets: [{
        label: 'Products by Type',
        data: result.map(r => Number(r.count)),
      }],
    };
  }

  /**
   * Get chart data for companies by country
   */
  async getCompanyCountryChartData(): Promise<ChartData> {
    const result = await db
      .select({
        country: companies.country,
        count: sql<number>`count(*)`,
      })
      .from(companies)
      .groupBy(companies.country);

    return {
      labels: result.map(r => r.country),
      datasets: [{
        label: 'Companies by Country',
        data: result.map(r => Number(r.count)),
      }],
    };
  }

  /**
   * Get product release timeline data (robots only, excluding RFM, actuator, soc)
   */
  async getProductReleaseTimeline(options: {
    months?: number;
    type?: string;
  } = {}): Promise<ProductReleaseTimelineItem[]> {
    const { months = 12, type } = options;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    let query = db
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        releaseDate: products.releaseDate,
        companyId: products.companyId,
        companyName: companies.name,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .orderBy(desc(products.createdAt));

    const result = await query;

    // 로봇 제품만 필터링 (foundation_model, actuator, soc 제외)
    const robotTypes = ['humanoid', 'service', 'logistics', 'home', 'industrial', 'quadruped'];
    let filtered = result.filter(r => robotTypes.includes(r.type));

    // 추가 타입 필터링
    if (type) {
      filtered = filtered.filter(r => r.type === type);
    }

    return filtered.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      releaseDate: r.releaseDate,
      companyName: r.companyName || 'Unknown',
    }));
  }

  /**
   * Get RFM (Robot Foundation Model) timeline data
   */
  async getRfmTimeline(): Promise<ProductReleaseTimelineItem[]> {
    // RFM 관련 제품 조회 (type이 foundation_model이거나 이름에 관련 키워드 포함)
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        releaseDate: products.releaseDate,
        companyId: products.companyId,
        companyName: companies.name,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .orderBy(desc(products.releaseDate));

    // RFM 관련 필터링
    const rfmKeywords = ['foundation', 'model', 'rfm', 'vla', 'rt-', 'pi0', 'octo', 'openvla', 'gr-'];
    const filtered = result.filter(r => {
      const nameLower = r.name.toLowerCase();
      return r.type === 'foundation_model' || 
             rfmKeywords.some(kw => nameLower.includes(kw));
    });

    return filtered.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      releaseDate: r.releaseDate,
      companyName: r.companyName || 'Unknown',
    }));
  }

  /**
   * Get Actuator timeline data
   */
  async getActuatorTimeline(): Promise<ProductReleaseTimelineItem[]> {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        releaseDate: products.releaseDate,
        companyId: products.companyId,
        companyName: companies.name,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .where(eq(products.type, 'actuator'))
      .orderBy(desc(products.releaseDate));

    return result.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      releaseDate: r.releaseDate,
      companyName: r.companyName || 'Unknown',
    }));
  }

  /**
   * Get SoC timeline data (10+ TOPS)
   */
  async getSocTimeline(): Promise<ProductReleaseTimelineItem[]> {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        releaseDate: products.releaseDate,
        companyId: products.companyId,
        companyName: companies.name,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .where(eq(products.type, 'soc'))
      .orderBy(desc(products.releaseDate));

    return result.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      releaseDate: r.releaseDate,
      companyName: r.companyName || 'Unknown',
    }));
  }
}

export interface ProductReleaseTimelineItem {
  id: string;
  name: string;
  type: string;
  releaseDate: string | null;
  companyName: string;
}

export const dashboardService = new DashboardService();
