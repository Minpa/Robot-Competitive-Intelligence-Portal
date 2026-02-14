import { sql, desc, gte, and, eq } from 'drizzle-orm';
import { db, companies, products, articles, keywords, keywordStats, humanoidRobots } from '../db/index.js';

export interface DashboardSummary {
  totalCompanies: number;
  totalProducts: number;
  totalArticles: number;
  totalKeywords: number;
  totalRobots: number;
  weeklyNewProducts: number;
  weeklyNewArticles: number;
  lastUpdated: string;
}

export interface WeeklyHighlight {
  type: 'new_product' | 'new_robot' | 'company_update' | 'trending_keyword' | 'recent_demo';
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
    product: CategoryHighlight[];
    technology: CategoryHighlight[];
    industry: CategoryHighlight[];
    other: CategoryHighlight[];
  };
  productTypes: {
    robot: CategoryHighlight[];
    rfm: CategoryHighlight[];
    soc: CategoryHighlight[];
    actuator: CategoryHighlight[];
  };
}

export interface EnhancedWeeklyHighlights {
  periodStart: string;
  periodEnd: string;
  newProducts: {
    id: string;
    name: string;
    companyName: string;
    type: string;
    date: string;
  }[];
  newRobots: {
    id: string;
    name: string;
    companyName: string;
    purpose?: string;
    date: string;
  }[];
  companyUpdates: {
    companyId: string;
    companyName: string;
    articleCount: number;
  }[];
  trendingTopics: {
    term: string;
    delta: number;
    deltaPercent: number;
  }[];
  recentDemos: {
    id: string;
    robotName: string;
    companyName: string;
    demoEvent?: string;
    demoDate?: string;
  }[];
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

export interface ProductReleaseTimelineItem {
  id: string;
  name: string;
  type: string;
  releaseDate: string | null;
  companyName: string;
}

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalCompaniesResult,
      totalProductsResult,
      totalArticlesResult,
      totalKeywordsResult,
      totalRobotsResult,
      weeklyNewProductsResult,
      weeklyNewArticlesResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(companies),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(articles),
      db.select({ count: sql<number>`count(*)` }).from(keywords),
      db.select({ count: sql<number>`count(*)` }).from(humanoidRobots),
      db.select({ count: sql<number>`count(*)` }).from(products).where(gte(products.createdAt, oneWeekAgo)),
      db.select({ count: sql<number>`count(*)` }).from(articles).where(gte(articles.createdAt, oneWeekAgo)),
    ]);

    return {
      totalCompanies: Number(totalCompaniesResult[0]?.count ?? 0),
      totalProducts: Number(totalProductsResult[0]?.count ?? 0),
      totalArticles: Number(totalArticlesResult[0]?.count ?? 0),
      totalKeywords: Number(totalKeywordsResult[0]?.count ?? 0),
      totalRobots: Number(totalRobotsResult[0]?.count ?? 0),
      weeklyNewProducts: Number(weeklyNewProductsResult[0]?.count ?? 0),
      weeklyNewArticles: Number(weeklyNewArticlesResult[0]?.count ?? 0),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getWeeklyHighlights(limit: number = 5): Promise<WeeklyHighlightsResponse> {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

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

      const cat = article.category as keyof typeof categories;
      if (cat && categories[cat] && categories[cat].length < limit) {
        categories[cat].push(highlight);
      } else if (categories.other.length < limit) {
        categories.other.push(highlight);
      }

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
   * Enhanced weekly highlights (Task 10.7)
   * 신규 제품, 회사 업데이트, 트렌딩 토픽, 최근 시연
   */
  async getEnhancedWeeklyHighlights(limit: number = 5): Promise<EnhancedWeeklyHighlights> {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 1. 신규 제품
    const newProducts = await db
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        companyId: products.companyId,
        companyName: companies.name,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(companies, eq(products.companyId, companies.id))
      .where(gte(products.createdAt, oneWeekAgo))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    // 2. 신규 로봇
    const newRobots = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        purpose: humanoidRobots.purpose,
        companyId: humanoidRobots.companyId,
        companyName: companies.name,
        createdAt: humanoidRobots.createdAt,
      })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(gte(humanoidRobots.createdAt, oneWeekAgo))
      .orderBy(desc(humanoidRobots.createdAt))
      .limit(limit);

    // 3. 회사 업데이트 (기사 수 기준)
    const companyUpdates = await db
      .select({
        companyId: articles.companyId,
        companyName: companies.name,
        count: sql<number>`count(*)`,
      })
      .from(articles)
      .leftJoin(companies, eq(articles.companyId, companies.id))
      .where(and(
        gte(articles.createdAt, oneWeekAgo),
        sql`${articles.companyId} IS NOT NULL`
      ))
      .groupBy(articles.companyId, companies.name)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    // 4. 트렌딩 토픽
    const trendingTopics = await db
      .select({
        term: keywords.term,
        delta: keywordStats.delta,
        deltaPercent: keywordStats.deltaPercent,
      })
      .from(keywordStats)
      .innerJoin(keywords, eq(keywordStats.keywordId, keywords.id))
      .where(eq(keywordStats.periodType, 'week'))
      .orderBy(desc(keywordStats.deltaPercent))
      .limit(limit);

    // 5. 최근 시연
    const { applicationCaseService } = await import('./application-case.service.js');
    const recentDemos = await applicationCaseService.getRecentDemos(limit);

    return {
      periodStart: oneWeekAgo.toISOString().split('T')[0] || '',
      periodEnd: now.toISOString().split('T')[0] || '',
      newProducts: newProducts.map(p => ({
        id: p.id,
        name: p.name,
        companyName: p.companyName || 'Unknown',
        type: p.type,
        date: p.createdAt.toISOString(),
      })),
      newRobots: newRobots.map(r => ({
        id: r.id,
        name: r.name,
        companyName: r.companyName || 'Unknown',
        purpose: r.purpose || undefined,
        date: r.createdAt.toISOString(),
      })),
      companyUpdates: companyUpdates
        .filter(c => c.companyId)
        .map(c => ({
          companyId: c.companyId!,
          companyName: c.companyName || 'Unknown',
          articleCount: Number(c.count),
        })),
      trendingTopics: trendingTopics
        .filter(t => t.delta && t.delta > 0)
        .map(t => ({
          term: t.term,
          delta: t.delta || 0,
          deltaPercent: t.deltaPercent || 0,
        })),
      recentDemos: recentDemos.map(d => ({
        id: d.case.id,
        robotName: d.robot.name,
        companyName: d.company?.name || 'Unknown',
        demoEvent: d.case.demoEvent || undefined,
        demoDate: d.case.demoDate || undefined,
      })),
    };
  }

  async getTimeline(options: {
    startDate?: string;
    endDate?: string;
    companyId?: string;
    limit?: number;
  } = {}): Promise<TimelineEvent[]> {
    const { startDate, endDate, companyId, limit = 50 } = options;
    const events: TimelineEvent[] = [];

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

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let filtered = events;
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }

    return filtered.slice(0, limit);
  }

  async getArticleChartData(options: { weeks?: number } = {}): Promise<ChartData> {
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
      datasets: [{ label: 'Articles', data }],
    };
  }

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
      datasets: [{ label: 'Products by Type', data: result.map(r => Number(r.count)) }],
    };
  }

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
      datasets: [{ label: 'Companies by Country', data: result.map(r => Number(r.count)) }],
    };
  }

  async getProductReleaseTimeline(options: { months?: number; type?: string } = {}): Promise<ProductReleaseTimelineItem[]> {
    const { type } = options;

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
      .orderBy(desc(products.createdAt));

    const robotTypes = ['humanoid', 'service', 'logistics', 'home', 'industrial', 'quadruped'];
    let filtered = result.filter(r => robotTypes.includes(r.type));

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

  async getRfmTimeline(): Promise<ProductReleaseTimelineItem[]> {
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

    const rfmKeywords = ['foundation', 'model', 'rfm', 'vla', 'rt-', 'pi0', 'octo', 'openvla', 'gr-'];
    const filtered = result.filter(r => {
      const nameLower = r.name.toLowerCase();
      return r.type === 'foundation_model' || rfmKeywords.some(kw => nameLower.includes(kw));
    });

    return filtered.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      releaseDate: r.releaseDate,
      companyName: r.companyName || 'Unknown',
    }));
  }

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

  // ============================================
  // Workforce Analysis (Task 10.3)
  // ============================================

  async getWorkforceBySegment() {
    const { workforceService } = await import('./workforce.service.js');
    return workforceService.getWorkforceBySegment();
  }

  async getTopNPlayersWorkforce(limit = 10) {
    const { workforceService } = await import('./workforce.service.js');
    return workforceService.getTopNByWorkforce(limit);
  }

  async getJobDistribution() {
    const { workforceService } = await import('./workforce.service.js');
    return workforceService.getAggregatedJobDistribution();
  }

  // ============================================
  // Application Case Analysis (Task 10.5)
  // ============================================

  async getEnvironmentTaskMatrix() {
    const { applicationCaseService } = await import('./application-case.service.js');
    return applicationCaseService.getEnvironmentTaskMatrix();
  }

  async getDeploymentStatusDistribution() {
    const { applicationCaseService } = await import('./application-case.service.js');
    return applicationCaseService.getDeploymentStatusDistribution();
  }

  async getDemoTimeline(startDate?: Date, endDate?: Date) {
    const { applicationCaseService } = await import('./application-case.service.js');
    return applicationCaseService.getDemoTimeline(startDate, endDate);
  }

  // ============================================
  // Segment Analysis (Task 10.1)
  // ============================================

  async getSegmentMatrix() {
    const { humanoidRobotService } = await import('./humanoid-robot.service.js');
    return humanoidRobotService.getSegmentMatrix();
  }

  async getHandTypeDistribution() {
    const { humanoidRobotService } = await import('./humanoid-robot.service.js');
    return humanoidRobotService.getHandTypeDistribution();
  }

  async getRobotSummary() {
    const { humanoidRobotService } = await import('./humanoid-robot.service.js');
    return humanoidRobotService.getSummary();
  }
}

export const dashboardService = new DashboardService();
