// Core Entity Types

export interface Company {
  id: string;
  name: string;
  country: string;
  category: string;
  homepageUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  series: string | null;
  type: ProductType;
  releaseDate: string | null;
  targetMarket: string | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductType = 'humanoid' | 'service' | 'logistics' | 'home';
export type ProductStatus = 'announced' | 'available' | 'discontinued';

export const PRODUCT_TYPES: ProductType[] = ['humanoid', 'service', 'logistics', 'home'];
export const PRODUCT_STATUSES: ProductStatus[] = ['announced', 'available', 'discontinued'];

export interface ProductSpec {
  id: string;
  productId: string;
  dof: number | null;
  payloadKg: string | null;
  speedMps: string | null;
  batteryMinutes: number | null;
  sensors: SensorConfig[] | null;
  controlArchitecture: string | null;
  os: string | null;
  sdk: string | null;
  priceMin: string | null;
  priceMax: string | null;
  priceCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorConfig {
  type: string;
  model?: string;
  specs?: Record<string, unknown>;
}

export interface Article {
  id: string;
  productId: string | null;
  companyId: string | null;
  title: string;
  source: string;
  url: string;
  publishedAt: Date | null;
  summary: string | null;
  content: string | null;
  language: Language;
  contentHash: string;
  collectedAt: Date;
  createdAt: Date;
}

export type Language = 'ko' | 'en';

export interface Keyword {
  id: string;
  term: string;
  language: Language;
  category: string | null;
  createdAt: Date;
}

export interface KeywordStats {
  id: string;
  keywordId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  count: number;
  delta: number | null;
  deltaPercent: string | null;
  relatedCompanyId: string | null;
  relatedProductId: string | null;
  calculatedAt: Date;
}

export type PeriodType = 'week' | 'month';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  lastLogin: Date | null;
  createdAt: Date;
}

export type UserRole = 'admin' | 'analyst' | 'viewer';
export type Permission = 'read' | 'write' | 'admin' | 'export' | 'crawl_manage';

export interface CrawlTarget {
  id: string;
  domain: string;
  urls: string[];
  patterns: CrawlPattern[];
  cronExpression: string;
  rateLimit: RateLimitConfig | null;
  enabled: boolean;
  lastCrawled: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlPattern {
  type: 'product_page' | 'spec_sheet' | 'article' | 'press_release' | 'pricing';
  selectors: Record<string, string>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  delayBetweenRequests: number;
}

export interface CrawlJob {
  id: string;
  targetId: string | null;
  status: CrawlJobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  metadata: Record<string, unknown> | null;
}

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CrawlError {
  id: string;
  jobId: string | null;
  url: string;
  errorType: CrawlErrorType;
  message: string;
  stackTrace: string | null;
  occurredAt: Date;
}

export type CrawlErrorType = 'network' | 'parsing' | 'timeout' | 'rate_limit';

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}
