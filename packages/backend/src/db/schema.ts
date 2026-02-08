import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  boolean,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Company entity
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    country: varchar('country', { length: 100 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    homepageUrl: varchar('homepage_url', { length: 500 }),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('companies_name_idx').on(table.name),
    countryIdx: index('companies_country_idx').on(table.country),
  })
);

// Product entity
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    series: varchar('series', { length: 100 }),
    type: varchar('type', { length: 50 }).notNull(), // humanoid, service, logistics, home
    releaseDate: date('release_date'),
    targetMarket: varchar('target_market', { length: 255 }),
    status: varchar('status', { length: 50 }).default('announced'), // announced, available, discontinued
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('products_company_idx').on(table.companyId),
    typeIdx: index('products_type_idx').on(table.type),
    releaseDateIdx: index('products_release_date_idx').on(table.releaseDate),
  })
);


// ProductSpec entity
export const productSpecs = pgTable('product_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  // 로봇 공통 스펙
  dof: integer('dof'),
  payloadKg: decimal('payload_kg', { precision: 10, scale: 2 }),
  speedMps: decimal('speed_mps', { precision: 10, scale: 2 }),
  batteryMinutes: integer('battery_minutes'),
  sensors: jsonb('sensors').$type<SensorConfig[]>(),
  controlArchitecture: varchar('control_architecture', { length: 255 }),
  os: varchar('os', { length: 100 }),
  sdk: varchar('sdk', { length: 100 }),
  priceMin: decimal('price_min', { precision: 15, scale: 2 }),
  priceMax: decimal('price_max', { precision: 15, scale: 2 }),
  priceCurrency: varchar('price_currency', { length: 10 }).default('USD'),
  // Form Factor 스펙 (로봇용)
  arms: integer('arms'), // 팔 개수: 0, 1, 2
  hands: varchar('hands', { length: 50 }), // none, gripper, 3finger, 4finger, 5finger
  mobility: varchar('mobility', { length: 50 }), // fixed, wheel, track, quadruped, biped
  heightCm: decimal('height_cm', { precision: 10, scale: 2 }),
  // 동적 스펙 (SoC, 액츄에이터 등 다양한 제품 타입용)
  dynamicSpecs: jsonb('dynamic_specs').$type<DynamicSpecs>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 동적 스펙 타입 정의
export interface DynamicSpecs {
  // SoC 스펙
  tops?: number; // AI 연산 성능 (TOPS)
  npuTops?: number; // NPU 전용 TOPS
  process?: string; // 공정 (예: "7nm", "TSMC N5")
  tdpWatts?: string; // 전력 소비 (예: "15-60W")
  memory?: string; // 메모리 타입 (예: "HBM2", "LPDDR5")
  memorySize?: string; // 메모리 용량 (예: "64GB")
  memoryBandwidth?: string; // 메모리 대역폭 (예: "1.2 TB/s")
  cpuCores?: string; // CPU 코어 구성 (예: "12-core Arm CPU")
  gpuCores?: string; // GPU 코어 (예: "2048-core Ampere GPU")
  gpuModel?: string; // GPU 모델명 (예: "Adreno 750")
  // 액츄에이터 스펙
  torqueNm?: number; // 토크 (Nm)
  rpmMax?: number; // 최대 RPM
  gearRatio?: string; // 기어비
  // 기타 동적 필드
  [key: string]: string | number | boolean | null | undefined;
}

export interface SensorConfig {
  type: string;
  model?: string;
  specs?: Record<string, unknown>;
}

// Article entity
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 500 }).notNull(),
    source: varchar('source', { length: 255 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    publishedAt: timestamp('published_at'),
    summary: text('summary'),
    content: text('content'),
    language: varchar('language', { length: 10 }).default('en'),
    category: varchar('category', { length: 50 }).default('other'), // product, technology, industry, other
    productType: varchar('product_type', { length: 50 }).default('none'), // robot, rfm, soc, actuator, none
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    collectedAt: timestamp('collected_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    contentHashIdx: uniqueIndex('articles_content_hash_idx').on(table.contentHash),
    companyIdx: index('articles_company_idx').on(table.companyId),
    productIdx: index('articles_product_idx').on(table.productId),
    publishedAtIdx: index('articles_published_at_idx').on(table.publishedAt),
    languageIdx: index('articles_language_idx').on(table.language),
  })
);

// Keyword entity
export const keywords = pgTable(
  'keywords',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    term: varchar('term', { length: 255 }).notNull(),
    language: varchar('language', { length: 10 }).default('en'),
    category: varchar('category', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    termLanguageIdx: uniqueIndex('keywords_term_language_idx').on(table.term, table.language),
  })
);

// KeywordStats entity
export const keywordStats = pgTable(
  'keyword_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    periodType: varchar('period_type', { length: 20 }).notNull(), // week, month
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    count: integer('count').default(0).notNull(),
    delta: integer('delta').default(0),
    deltaPercent: decimal('delta_percent', { precision: 10, scale: 2 }),
    relatedCompanyId: uuid('related_company_id').references(() => companies.id),
    relatedProductId: uuid('related_product_id').references(() => products.id),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => ({
    keywordPeriodIdx: index('keyword_stats_keyword_period_idx').on(
      table.keywordId,
      table.periodType,
      table.periodStart
    ),
  })
);


// ProductKeyword junction table
export const productKeywords = pgTable(
  'product_keywords',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    relevanceScore: decimal('relevance_score', { precision: 5, scale: 4 }),
  },
  (table) => ({
    pk: uniqueIndex('product_keywords_pk').on(table.productId, table.keywordId),
  })
);

// ArticleKeyword junction table
export const articleKeywords = pgTable(
  'article_keywords',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    frequency: integer('frequency').default(1),
    tfidfScore: decimal('tfidf_score', { precision: 10, scale: 6 }),
  },
  (table) => ({
    pk: uniqueIndex('article_keywords_pk').on(table.articleId, table.keywordId),
  })
);

// CrawlTarget entity
export const crawlTargets = pgTable('crawl_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull(),
  urls: jsonb('urls').$type<string[]>().default([]),
  patterns: jsonb('patterns').$type<CrawlPattern[]>().default([]),
  cronExpression: varchar('cron_expression', { length: 100 }).default('0 0 * * 0'), // weekly
  rateLimit: jsonb('rate_limit').$type<RateLimitConfig>(),
  enabled: boolean('enabled').default(true),
  lastCrawled: timestamp('last_crawled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

// CrawlJob entity
export const crawlJobs = pgTable(
  'crawl_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: uuid('target_id').references(() => crawlTargets.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).default('pending'), // pending, running, completed, failed
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    successCount: integer('success_count').default(0),
    failureCount: integer('failure_count').default(0),
    duplicateCount: integer('duplicate_count').default(0),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    targetIdx: index('crawl_jobs_target_idx').on(table.targetId),
    statusIdx: index('crawl_jobs_status_idx').on(table.status),
  })
);

// CrawlError entity
export const crawlErrors = pgTable(
  'crawl_errors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => crawlJobs.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 1000 }).notNull(),
    errorType: varchar('error_type', { length: 50 }).notNull(),
    message: text('message').notNull(),
    stackTrace: text('stack_trace'),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdx: index('crawl_errors_job_idx').on(table.jobId),
    occurredAtIdx: index('crawl_errors_occurred_at_idx').on(table.occurredAt),
  })
);


// User entity
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('viewer'), // admin, analyst, viewer
    permissions: jsonb('permissions').$type<string[]>().default([]),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
);

// AuditLog entity
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: uuid('entity_id'),
    changes: jsonb('changes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('audit_logs_user_idx').on(table.userId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  products: many(products),
  articles: many(articles),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  spec: one(productSpecs, {
    fields: [products.id],
    references: [productSpecs.productId],
  }),
  articles: many(articles),
  keywords: many(productKeywords),
}));

export const productSpecsRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, {
    fields: [productSpecs.productId],
    references: [products.id],
  }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  company: one(companies, {
    fields: [articles.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [articles.productId],
    references: [products.id],
  }),
  keywords: many(articleKeywords),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  stats: many(keywordStats),
  products: many(productKeywords),
  articles: many(articleKeywords),
}));

export const crawlTargetsRelations = relations(crawlTargets, ({ many }) => ({
  jobs: many(crawlJobs),
}));

export const crawlJobsRelations = relations(crawlJobs, ({ one, many }) => ({
  target: one(crawlTargets, {
    fields: [crawlJobs.targetId],
    references: [crawlTargets.id],
  }),
  errors: many(crawlErrors),
}));
