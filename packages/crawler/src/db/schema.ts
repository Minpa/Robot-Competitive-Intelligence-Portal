import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// CrawlTarget entity
export const crawlTargets = pgTable('crawl_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull(),
  urls: jsonb('urls').$type<string[]>().default([]),
  patterns: jsonb('patterns').$type<CrawlPattern[]>().default([]),
  cronExpression: varchar('cron_expression', { length: 100 }).default('0 0 * * 0'),
  rateLimit: jsonb('rate_limit').$type<RateLimitConfig>(),
  enabled: boolean('enabled').default(true),
  lastCrawled: timestamp('last_crawled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Articles table for storing crawled content
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    source: varchar('source', { length: 255 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    publishedAt: timestamp('published_at'),
    summary: text('summary'),
    content: text('content'),
    language: varchar('language', { length: 10 }).default('en'),
    category: varchar('category', { length: 50 }).default('other'), // product, technology, industry, other
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    collectedAt: timestamp('collected_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    contentHashIdx: uniqueIndex('articles_content_hash_idx').on(table.contentHash),
  })
);

// CrawlJob entity
export const crawlJobs = pgTable('crawl_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: uuid('target_id'),
  status: varchar('status', { length: 50 }).default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  duplicateCount: integer('duplicate_count').default(0),
  metadata: jsonb('metadata'),
});

export interface CrawlPattern {
  type: 'product_page' | 'spec_sheet' | 'article' | 'press_release' | 'pricing';
  selectors: Record<string, string>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  delayBetweenRequests: number;
}
