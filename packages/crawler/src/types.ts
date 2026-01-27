export interface CrawlJobConfig {
  targetUrls: TargetUrl[];
  rateLimit: RateLimitConfig;
  timeout: number;
  retryCount: number;
}

export interface TargetUrl {
  url: string;
  domain: string;
  pattern: CrawlPattern;
  lastCrawled?: Date;
}

export interface CrawlPattern {
  type: 'product_page' | 'spec_sheet' | 'article' | 'press_release' | 'pricing';
  selectors: ContentSelectors;
}

export interface ContentSelectors {
  title?: string;
  content?: string;
  price?: string;
  specs?: Record<string, string>;
  publishDate?: string;
  author?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  delayBetweenRequests: number;
}

export interface CrawlResult {
  jobId: string;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: CrawlError[];
  collectedItems: CollectedItem[];
}

export interface CrawlError {
  url: string;
  errorType: 'network' | 'parsing' | 'timeout' | 'rate_limit';
  message: string;
  timestamp: Date;
}

export interface CollectedItem {
  url: string;
  type: CrawlPattern['type'];
  title?: string;
  content?: string;
  publishDate?: string;
  specs?: Record<string, string>;
  price?: string;
  contentHash: string;
  collectedAt: Date;
}

export interface CrawlSchedule {
  id: string;
  name: string;
  cronExpression: string;
  targetUrls: TargetUrl[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobStatusInfo {
  jobId: string;
  status: JobStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: CrawlResult;
}
