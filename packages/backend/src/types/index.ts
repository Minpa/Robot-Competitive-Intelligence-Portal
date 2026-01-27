export * from './entities.js';
export * from './dto.js';

// Pagination result type
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Search result types
export interface SearchHit<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResult<T> {
  hits: SearchHit<T>[];
  total: number;
  maxScore: number;
}

// Product with details
export interface ProductWithDetails {
  product: import('./entities.js').Product;
  company: import('./entities.js').Company;
  spec: import('./entities.js').ProductSpec | null;
  articles: import('./entities.js').Article[];
  keywords: import('./entities.js').Keyword[];
}

// Timeline entry
export interface TimelineEntry {
  date: string;
  articles: import('./entities.js').Article[];
  count: number;
}

// Dashboard types
export interface WeeklyHighlights {
  newProducts: import('./entities.js').Product[];
  priceChanges: PriceChange[];
  prPeaks: ArticlePeak[];
  trendingKeywords: TrendingKeyword[];
  weekStart: string;
  weekEnd: string;
}

export interface PriceChange {
  product: import('./entities.js').Product;
  previousPrice: { min: number; max: number };
  currentPrice: { min: number; max: number };
  changePercent: number;
}

export interface ArticlePeak {
  entity: import('./entities.js').Company | import('./entities.js').Product;
  entityType: 'company' | 'product';
  articleCount: number;
  previousCount: number;
  changePercent: number;
}

export interface TrendingKeyword {
  keyword: import('./entities.js').Keyword;
  stats: import('./entities.js').KeywordStats;
  trend: 'rising' | 'falling' | 'stable';
}

export interface DashboardSummary {
  totalCompanies: number;
  totalProducts: number;
  totalArticles: number;
  articlesThisWeek: number;
  newProductsThisWeek: number;
  topKeywords: TrendingKeyword[];
}
