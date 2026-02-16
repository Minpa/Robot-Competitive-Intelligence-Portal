import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import { db, keywords, keywordStats, articleKeywords, productKeywords, articles, companies, humanoidRobots } from '../db/index.js';

export interface KeywordAnalytics {
  id: string;
  term: string;
  language: string;
  category: string | null;
  // 기간별 등장 횟수
  totalCount: number;
  recentCount3m: number;
  recentCount6m: number;
  recentCount12m: number;
  // 연관 객체 수
  relatedCompanies: number;
  relatedProducts: number;
  relatedArticles: number;
  relatedCases: number;
  // 온도 (성장률)
  growthRate3m: number;
  growthRate6m: number;
  growthRate12m: number;
  peakMonth: string | null;
  // 트렌드 상태
  trendStatus: 'rising_star' | 'big_stable' | 'niche' | 'declining';
}

export interface KeywordTrendPoint {
  month: string;
  year: number;
  count: number;
}

export interface KeywordInsight {
  keyword: KeywordAnalytics;
  trendData: KeywordTrendPoint[];
  topCompanies: { id: string; name: string; articleCount: number }[];
  topProducts: { id: string; name: string; articleCount: number }[];
  topCases: { id: string; robotName: string; environment: string; task: string }[];
  description: string;
  aiComment: string;
}

export interface KeywordBrief {
  period: string;
  risingKeywords: { term: string; growthRate: number }[];
  decliningKeywords: { term: string; growthRate: number }[];
  broadestKeywords: { term: string; coverage: number }[];
  summary: string;
  generatedAt: string;
}

export class KeywordAnalyticsService {
  /**
   * 키워드 분석 데이터 조회 (Top N)
   */
  async getTopKeywords(options: {
    limit?: number;
    category?: string;
    sortBy?: 'count' | 'growth' | 'coverage';
  } = {}): Promise<KeywordAnalytics[]> {
    const { limit = 20, category, sortBy = 'count' } = options;

    // 모든 키워드 조회
    let keywordQuery = db.select().from(keywords);
    if (category) {
      keywordQuery = keywordQuery.where(eq(keywords.category, category)) as typeof keywordQuery;
    }
    const allKeywords = await keywordQuery.limit(100);

    const result: KeywordAnalytics[] = [];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    for (const kw of allKeywords) {
      // 기사 연결 수
      const [articleCount] = await db
        .select({ count: count() })
        .from(articleKeywords)
        .where(eq(articleKeywords.keywordId, kw.id));

      // 제품 연결 수
      const [productCount] = await db
        .select({ count: count() })
        .from(productKeywords)
        .where(eq(productKeywords.keywordId, kw.id));

      // 최근 3/6/12개월 기사 수 (키워드 통계 기반)
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0] || '';
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0] || '';
      const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0] || '';
      
      const stats3m = await db
        .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
        .from(keywordStats)
        .where(and(
          eq(keywordStats.keywordId, kw.id),
          gte(keywordStats.periodStart, threeMonthsAgoStr as any)
        ));

      const stats6m = await db
        .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
        .from(keywordStats)
        .where(and(
          eq(keywordStats.keywordId, kw.id),
          gte(keywordStats.periodStart, sixMonthsAgoStr as any)
        ));

      const stats12m = await db
        .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
        .from(keywordStats)
        .where(and(
          eq(keywordStats.keywordId, kw.id),
          gte(keywordStats.periodStart, twelveMonthsAgoStr as any)
        ));

      // 이전 기간 대비 성장률 계산
      const sixMonthsAgoForPrevStr = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0] || '';
      const prev3m = await db
        .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
        .from(keywordStats)
        .where(and(
          eq(keywordStats.keywordId, kw.id),
          gte(keywordStats.periodStart, sixMonthsAgoForPrevStr as any),
          lte(keywordStats.periodStart, threeMonthsAgoStr as any)
        ));

      const recentCount3m = Number(stats3m[0]?.total || 0);
      const prevCount3m = Number(prev3m[0]?.total || 0);
      const growthRate3m = prevCount3m > 0 ? Math.round(((recentCount3m - prevCount3m) / prevCount3m) * 100) : 0;

      const totalCount = Number(articleCount?.count || 0);
      const relatedProducts = Number(productCount?.count || 0);

      // 트렌드 상태 결정
      let trendStatus: KeywordAnalytics['trendStatus'] = 'niche';
      if (growthRate3m > 20 && totalCount > 5) {
        trendStatus = 'rising_star';
      } else if (growthRate3m >= -10 && growthRate3m <= 20 && totalCount > 10) {
        trendStatus = 'big_stable';
      } else if (growthRate3m < -20) {
        trendStatus = 'declining';
      }

      result.push({
        id: kw.id,
        term: kw.term,
        language: kw.language || 'en',
        category: kw.category,
        totalCount,
        recentCount3m,
        recentCount6m: Number(stats6m[0]?.total || 0),
        recentCount12m: Number(stats12m[0]?.total || 0),
        relatedCompanies: 0, // TODO: 회사 연결 테이블 필요
        relatedProducts,
        relatedArticles: totalCount,
        relatedCases: 0, // TODO: 적용 사례 연결 테이블 필요
        growthRate3m,
        growthRate6m: 0,
        growthRate12m: 0,
        peakMonth: null,
        trendStatus,
      });
    }

    // 정렬
    if (sortBy === 'growth') {
      result.sort((a, b) => b.growthRate3m - a.growthRate3m);
    } else if (sortBy === 'coverage') {
      result.sort((a, b) => (b.relatedCompanies + b.relatedProducts) - (a.relatedCompanies + a.relatedProducts));
    } else {
      result.sort((a, b) => b.totalCount - a.totalCount);
    }

    return result.slice(0, limit);
  }

  /**
   * 키워드 상세 인사이트 조회
   */
  async getKeywordInsight(keywordId: string): Promise<KeywordInsight | null> {
    const [kw] = await db.select().from(keywords).where(eq(keywords.id, keywordId));
    if (!kw) return null;

    // 키워드 분석 데이터
    const analytics = (await this.getTopKeywords({ limit: 100 })).find(k => k.id === keywordId);
    if (!analytics) return null;

    // 월별 트렌드 데이터 (최근 12개월)
    const trendData: KeywordTrendPoint[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const [stats] = await db
        .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
        .from(keywordStats)
        .where(and(
          eq(keywordStats.keywordId, keywordId),
          gte(keywordStats.periodStart, monthStart.toISOString().split('T')[0] as any),
          lte(keywordStats.periodStart, monthEnd.toISOString().split('T')[0] as any)
        ));

      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      trendData.push({
        month: monthNames[monthStart.getMonth()] || '1월',
        year: monthStart.getFullYear(),
        count: Number(stats?.total || 0),
      });
    }

    // 관련 회사 Top 5 (기사 기반)
    const topCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        articleCount: count(),
      })
      .from(articleKeywords)
      .innerJoin(articles, eq(articleKeywords.articleId, articles.id))
      .innerJoin(companies, eq(articles.companyId, companies.id))
      .where(eq(articleKeywords.keywordId, keywordId))
      .groupBy(companies.id, companies.name)
      .orderBy(desc(count()))
      .limit(5);

    // 관련 제품 Top 5
    const topProducts = await db
      .select({
        id: humanoidRobots.id,
        name: humanoidRobots.name,
        articleCount: count(),
      })
      .from(productKeywords)
      .innerJoin(humanoidRobots, eq(productKeywords.productId, humanoidRobots.id))
      .where(eq(productKeywords.keywordId, keywordId))
      .groupBy(humanoidRobots.id, humanoidRobots.name)
      .orderBy(desc(count()))
      .limit(5);

    // 카테고리별 설명 생성
    const categoryDescriptions: Record<string, string> = {
      technology: '기술 관련 키워드로, 로봇 하드웨어/소프트웨어 기술 동향을 나타냅니다.',
      market: '시장 관련 키워드로, 산업 동향 및 비즈니스 트렌드를 나타냅니다.',
      application: '응용 분야 키워드로, 로봇의 실제 적용 사례와 관련됩니다.',
      concept: '개념 키워드로, 새로운 기술 패러다임이나 트렌드를 나타냅니다.',
    };

    const description = categoryDescriptions[kw.category || ''] || '휴머노이드 로봇 산업 관련 키워드입니다.';

    // AI 코멘트 생성 (간단한 규칙 기반)
    let aiComment = '';
    if (analytics.trendStatus === 'rising_star') {
      aiComment = `이 키워드는 최근 3개월간 ${analytics.growthRate3m}% 급상승하며 주목받고 있습니다. 관련 기업들의 마케팅과 기술 발표에서 자주 언급되고 있어 향후 성장이 기대됩니다.`;
    } else if (analytics.trendStatus === 'big_stable') {
      aiComment = `이 키워드는 안정적인 관심을 받고 있는 핵심 키워드입니다. ${analytics.totalCount}개의 기사에서 언급되며 산업 전반에 걸쳐 중요하게 다뤄지고 있습니다.`;
    } else if (analytics.trendStatus === 'declining') {
      aiComment = `이 키워드는 최근 관심이 감소하는 추세입니다. 새로운 기술이나 트렌드로 대체되고 있을 수 있으니 모니터링이 필요합니다.`;
    } else {
      aiComment = `이 키워드는 특정 분야에서 사용되는 니치 키워드입니다. 전문 영역에서의 활용도를 확인해보세요.`;
    }

    return {
      keyword: analytics,
      trendData,
      topCompanies: topCompanies.map(c => ({
        id: c.id,
        name: c.name,
        articleCount: Number(c.articleCount),
      })),
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        articleCount: Number(p.articleCount),
      })),
      topCases: [],
      description,
      aiComment,
    };
  }

  /**
   * 키워드 포지션 맵 데이터 (2D 산점도용)
   */
  async getKeywordPositionMap(): Promise<{
    keywords: {
      id: string;
      term: string;
      category: string | null;
      x: number; // 성장률
      y: number; // 규모
      quadrant: 'rising_star' | 'big_stable' | 'niche' | 'declining';
    }[];
  }> {
    const analytics = await this.getTopKeywords({ limit: 50 });
    
    // 규모 정규화 (0-100)
    const maxCount = Math.max(...analytics.map(k => k.totalCount), 1);
    
    return {
      keywords: analytics.map(k => ({
        id: k.id,
        term: k.term,
        category: k.category,
        x: Math.max(-100, Math.min(100, k.growthRate3m)), // 성장률 (-100 ~ 100)
        y: Math.round((k.totalCount / maxCount) * 100), // 규모 (0 ~ 100)
        quadrant: k.trendStatus,
      })),
    };
  }

  /**
   * 월간 키워드 브리프 생성
   */
  async generateMonthlyBrief(): Promise<KeywordBrief> {
    const analytics = await this.getTopKeywords({ limit: 50 });
    
    // 급상승 키워드 (성장률 기준 Top 5)
    const risingKeywords = analytics
      .filter(k => k.growthRate3m > 0)
      .sort((a, b) => b.growthRate3m - a.growthRate3m)
      .slice(0, 5)
      .map(k => ({ term: k.term, growthRate: k.growthRate3m }));

    // 급락 키워드 (성장률 기준 Bottom 5)
    const decliningKeywords = analytics
      .filter(k => k.growthRate3m < 0)
      .sort((a, b) => a.growthRate3m - b.growthRate3m)
      .slice(0, 5)
      .map(k => ({ term: k.term, growthRate: k.growthRate3m }));

    // 가장 넓게 쓰이는 키워드 (커버리지 기준)
    const broadestKeywords = analytics
      .sort((a, b) => (b.relatedCompanies + b.relatedProducts) - (a.relatedCompanies + a.relatedProducts))
      .slice(0, 5)
      .map(k => ({ term: k.term, coverage: k.relatedCompanies + k.relatedProducts }));

    // 요약 생성
    const now = new Date();
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const currentMonth = monthNames[now.getMonth()];

    let summary = `${now.getFullYear()}년 ${currentMonth} 키워드 동향 분석: `;
    
    if (risingKeywords.length > 0) {
      summary += `급상승 키워드로는 ${risingKeywords.slice(0, 3).map(k => k.term).join(', ')}이(가) 있습니다. `;
    }
    
    if (decliningKeywords.length > 0) {
      summary += `반면 ${decliningKeywords.slice(0, 2).map(k => k.term).join(', ')}은(는) 관심이 감소하는 추세입니다. `;
    }

    if (broadestKeywords.length > 0) {
      summary += `가장 넓게 활용되는 키워드는 ${broadestKeywords[0]?.term}입니다.`;
    }

    return {
      period: `${now.getFullYear()}년 ${currentMonth}`,
      risingKeywords,
      decliningKeywords,
      broadestKeywords,
      summary,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * 키워드 트렌드 라인 데이터 (선택한 키워드들의 월별 추이)
   */
  async getKeywordTrendLines(keywordIds: string[]): Promise<{
    months: string[];
    series: { keywordId: string; term: string; data: number[] }[];
  }> {
    const now = new Date();
    const months: string[] = [];
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    // 최근 12개월
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${monthStart.getFullYear()}.${monthNames[monthStart.getMonth()]}`);
    }

    const series: { keywordId: string; term: string; data: number[] }[] = [];

    for (const keywordId of keywordIds) {
      const [kw] = await db.select().from(keywords).where(eq(keywords.id, keywordId));
      if (!kw) continue;

      const data: number[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const [stats] = await db
          .select({ total: sql<number>`COALESCE(SUM(${keywordStats.count}), 0)` })
          .from(keywordStats)
          .where(and(
            eq(keywordStats.keywordId, keywordId),
            gte(keywordStats.periodStart, monthStart.toISOString().split('T')[0] as any),
            lte(keywordStats.periodStart, monthEnd.toISOString().split('T')[0] as any)
          ));

        data.push(Number(stats?.total || 0));
      }

      series.push({ keywordId, term: kw.term, data });
    }

    return { months, series };
  }
}

export const keywordAnalyticsService = new KeywordAnalyticsService();
