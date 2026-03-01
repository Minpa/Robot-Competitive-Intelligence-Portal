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
    logoUrl: varchar('logo_url', { length: 500 }),
    country: varchar('country', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),
    foundingYear: integer('founding_year'),
    category: varchar('category', { length: 100 }).notNull(),
    mainBusiness: varchar('main_business', { length: 255 }),
    homepageUrl: varchar('homepage_url', { length: 500 }),
    description: text('description'),
    valuationUsd: decimal('valuation_usd', { precision: 15, scale: 2 }),
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
    submittedBy: uuid('submitted_by').references(() => users.id, { onDelete: 'set null' }),
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
    extractedMetadata: jsonb('extracted_metadata').$type<ExtractedMetadata>(),
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

export interface ExtractedMetadata {
  mentionedCompanies?: string[];
  mentionedRobots?: string[];
  technologies?: string[];
  marketInsights?: string[];
  keyPoints?: string[];
}

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

// AllowedEmail entity - 회원가입 허용 이메일 관리
export const allowedEmails = pgTable(
  'allowed_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    addedBy: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
    note: varchar('note', { length: 500 }), // 메모 (예: "팀원 홍길동")
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('allowed_emails_email_idx').on(table.email),
  })
);

// ============================================
// 휴머노이드 로봇 전용 테이블
// ============================================

// HumanoidRobot entity - 휴머노이드 로봇 제품
export const humanoidRobots = pgTable(
  'humanoid_robots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    announcementYear: integer('announcement_year'),
    status: varchar('status', { length: 50 }).default('development'), // development, poc, commercial
    purpose: varchar('purpose', { length: 50 }), // industrial, home, service
    locomotionType: varchar('locomotion_type', { length: 50 }), // bipedal, wheeled, hybrid
    handType: varchar('hand_type', { length: 50 }), // gripper, multi_finger, interchangeable
    commercializationStage: varchar('commercialization_stage', { length: 50 }), // concept, prototype, poc, pilot, commercial
    region: varchar('region', { length: 50 }), // north_america, europe, china, japan, korea, other
    imageUrl: varchar('image_url', { length: 500 }),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('humanoid_robots_company_idx').on(table.companyId),
    purposeIdx: index('humanoid_robots_purpose_idx').on(table.purpose),
    locomotionIdx: index('humanoid_robots_locomotion_idx').on(table.locomotionType),
    handTypeIdx: index('humanoid_robots_hand_type_idx').on(table.handType),
    stageIdx: index('humanoid_robots_stage_idx').on(table.commercializationStage),
    regionIdx: index('humanoid_robots_region_idx').on(table.region),
  })
);

// BodySpec entity - 로봇 신체 스펙
export const bodySpecs = pgTable('body_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  robotId: uuid('robot_id')
    .notNull()
    .unique()
    .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
  heightCm: decimal('height_cm', { precision: 6, scale: 2 }),
  weightKg: decimal('weight_kg', { precision: 6, scale: 2 }),
  payloadKg: decimal('payload_kg', { precision: 6, scale: 2 }),
  dofCount: integer('dof_count'),
  maxSpeedMps: decimal('max_speed_mps', { precision: 4, scale: 2 }),
  operationTimeHours: decimal('operation_time_hours', { precision: 4, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// HandSpec entity - 로봇 손 스펙
export const handSpecs = pgTable('hand_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  robotId: uuid('robot_id')
    .notNull()
    .unique()
    .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
  handType: varchar('hand_type', { length: 50 }),
  fingerCount: integer('finger_count'),
  handDof: integer('hand_dof'),
  gripForceN: decimal('grip_force_n', { precision: 6, scale: 2 }),
  isInterchangeable: boolean('is_interchangeable').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ComputingSpec entity - 컴퓨팅 스펙
export const computingSpecs = pgTable('computing_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  robotId: uuid('robot_id')
    .notNull()
    .unique()
    .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
  mainSoc: varchar('main_soc', { length: 255 }),
  topsMin: decimal('tops_min', { precision: 8, scale: 2 }),
  topsMax: decimal('tops_max', { precision: 8, scale: 2 }),
  architectureType: varchar('architecture_type', { length: 50 }), // onboard, edge, cloud, hybrid
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SensorSpec entity - 센서 스펙
export const sensorSpecs = pgTable('sensor_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  robotId: uuid('robot_id')
    .notNull()
    .unique()
    .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
  cameras: jsonb('cameras').$type<{ type: string; count: number; resolution?: string }[]>(),
  depthSensor: varchar('depth_sensor', { length: 255 }),
  lidar: varchar('lidar', { length: 255 }),
  imu: varchar('imu', { length: 255 }),
  forceTorque: varchar('force_torque', { length: 255 }),
  touchSensors: jsonb('touch_sensors').$type<{ location: string; type: string }[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// PowerSpec entity - 전원 스펙
export const powerSpecs = pgTable('power_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  robotId: uuid('robot_id')
    .notNull()
    .unique()
    .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
  batteryType: varchar('battery_type', { length: 100 }),
  capacityWh: decimal('capacity_wh', { precision: 8, scale: 2 }),
  operationTimeHours: decimal('operation_time_hours', { precision: 4, scale: 2 }),
  chargingMethod: varchar('charging_method', { length: 100 }), // fixed, swappable, both
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// WorkforceData entity - 회사 인력 데이터
export const workforceData = pgTable('workforce_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: 'cascade' }),
  totalHeadcountMin: integer('total_headcount_min'),
  totalHeadcountMax: integer('total_headcount_max'),
  humanoidTeamSize: integer('humanoid_team_size'),
  jobDistribution: jsonb('job_distribution').$type<JobDistribution>(),
  recordedAt: timestamp('recorded_at'),
  source: varchar('source', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export interface JobDistribution {
  rd?: number;
  software?: number;
  controlAi?: number;
  mechatronics?: number;
  operations?: number;
  business?: number;
}

// TalentTrend entity - 연도별 인력 추이
export const talentTrends = pgTable(
  'talent_trends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    totalHeadcount: integer('total_headcount'),
    humanoidTeamSize: integer('humanoid_team_size'),
    jobPostingCount: integer('job_posting_count'),
    recordedAt: timestamp('recorded_at'),
    source: varchar('source', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    companyYearIdx: index('talent_trends_company_year_idx').on(table.companyId, table.year),
  })
);

// Component entity - 부품 (액추에이터, SoC, 센서, 전원)
export const components = pgTable(
  'components',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull(), // actuator, soc, sensor, power
    name: varchar('name', { length: 255 }).notNull(),
    vendor: varchar('vendor', { length: 255 }),
    specifications: jsonb('specifications').$type<ComponentSpecs>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('components_type_idx').on(table.type),
    vendorIdx: index('components_vendor_idx').on(table.vendor),
  })
);

export interface ComponentSpecs {
  // Actuator specs
  actuatorType?: string; // harmonic, cycloidal, direct_drive
  ratedTorqueNm?: number;
  maxTorqueNm?: number;
  speedRpm?: number;
  weightKg?: number;
  integrationLevel?: string; // motor_only, motor_gear, motor_gear_driver, fully_integrated
  builtInSensors?: string[];
  // SoC specs
  processNode?: string;
  topsMin?: number;
  topsMax?: number;
  location?: string; // onboard, edge
  // Sensor specs
  sensorType?: string;
  resolution?: string;
  range?: string;
  // Power specs
  batteryType?: string;
  capacityWh?: number;
  // Generic
  [key: string]: string | number | boolean | string[] | undefined;
}

// RobotComponent junction table - 로봇-부품 연결
export const robotComponents = pgTable(
  'robot_components',
  {
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    componentId: uuid('component_id')
      .notNull()
      .references(() => components.id, { onDelete: 'cascade' }),
    usageLocation: varchar('usage_location', { length: 100 }), // head, torso, arm, leg, hand
    quantity: integer('quantity').default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('robot_components_pk').on(table.robotId, table.componentId),
  })
);

// ApplicationCase entity - 적용 사례
export const applicationCases = pgTable(
  'application_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    environmentType: varchar('environment_type', { length: 50 }), // factory, warehouse, retail, healthcare, hospitality, home, research_lab, other
    taskType: varchar('task_type', { length: 50 }), // assembly, picking, packing, inspection, delivery, cleaning, assistance, other
    taskDescription: text('task_description'),
    deploymentStatus: varchar('deployment_status', { length: 50 }), // concept, pilot, production
    demoEvent: varchar('demo_event', { length: 255 }),
    demoDate: date('demo_date'),
    videoUrl: varchar('video_url', { length: 500 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('application_cases_robot_idx').on(table.robotId),
    environmentIdx: index('application_cases_environment_idx').on(table.environmentType),
    taskIdx: index('application_cases_task_idx').on(table.taskType),
  })
);

// ArticleRobotTag junction table - 기사-로봇 태그 연결
export const articleRobotTags = pgTable(
  'article_robot_tags',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('article_robot_tags_pk').on(table.articleId, table.robotId),
  })
);

// ============================================
// Relations
// ============================================

export const companiesRelations = relations(companies, ({ many, one }) => ({
  products: many(products),
  articles: many(articles),
  humanoidRobots: many(humanoidRobots),
  workforceData: one(workforceData),
  talentTrends: many(talentTrends),
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

// 휴머노이드 로봇 Relations
export const humanoidRobotsRelations = relations(humanoidRobots, ({ one, many }) => ({
  company: one(companies, {
    fields: [humanoidRobots.companyId],
    references: [companies.id],
  }),
  bodySpec: one(bodySpecs),
  handSpec: one(handSpecs),
  computingSpec: one(computingSpecs),
  sensorSpec: one(sensorSpecs),
  powerSpec: one(powerSpecs),
  components: many(robotComponents),
  applicationCases: many(applicationCases),
  articleTags: many(articleRobotTags),
}));

export const bodySpecsRelations = relations(bodySpecs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [bodySpecs.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const handSpecsRelations = relations(handSpecs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [handSpecs.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const computingSpecsRelations = relations(computingSpecs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [computingSpecs.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const sensorSpecsRelations = relations(sensorSpecs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [sensorSpecs.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const powerSpecsRelations = relations(powerSpecs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [powerSpecs.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const workforceDataRelations = relations(workforceData, ({ one }) => ({
  company: one(companies, {
    fields: [workforceData.companyId],
    references: [companies.id],
  }),
}));

export const talentTrendsRelations = relations(talentTrends, ({ one }) => ({
  company: one(companies, {
    fields: [talentTrends.companyId],
    references: [companies.id],
  }),
}));

export const componentsRelations = relations(components, ({ many }) => ({
  robots: many(robotComponents),
}));

export const robotComponentsRelations = relations(robotComponents, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [robotComponents.robotId],
    references: [humanoidRobots.id],
  }),
  component: one(components, {
    fields: [robotComponents.componentId],
    references: [components.id],
  }),
}));

export const applicationCasesRelations = relations(applicationCases, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [applicationCases.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const articleRobotTagsRelations = relations(articleRobotTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleRobotTags.articleId],
    references: [articles.id],
  }),
  robot: one(humanoidRobots, {
    fields: [articleRobotTags.robotId],
    references: [humanoidRobots.id],
  }),
}));

// ============================================
// 기사-엔티티 관계 테이블 (분석 파이프라인용)
// ============================================

// 기사-회사 관계 테이블
export const articleCompanies = pgTable(
  'article_companies',
  {
    articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('article_companies_pk').on(table.articleId, table.companyId),
  })
);

// 기사-부품 관계 테이블
export const articleComponents = pgTable(
  'article_components',
  {
    articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    componentId: uuid('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('article_components_pk').on(table.articleId, table.componentId),
  })
);

// 기사-적용사례 관계 테이블
export const articleApplications = pgTable(
  'article_applications',
  {
    articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').notNull().references(() => applicationCases.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('article_applications_pk').on(table.articleId, table.applicationId),
  })
);

// ============================================
// 파이프라인 로그 테이블
// ============================================

// 파이프라인 실행 로그
export const pipelineRuns = pgTable('pipeline_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: varchar('status', { length: 50 }).notNull().default('running'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  totalDurationMs: integer('total_duration_ms'),
  triggeredBy: uuid('triggered_by').references(() => users.id, { onDelete: 'set null' }),
});

// 파이프라인 단계 로그
export const pipelineStepLogs = pgTable(
  'pipeline_step_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id').notNull().references(() => pipelineRuns.id, { onDelete: 'cascade' }),
    stepName: varchar('step_name', { length: 100 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),
    inputCount: integer('input_count').default(0),
    successCount: integer('success_count').default(0),
    failureCount: integer('failure_count').default(0),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
  },
  (table) => ({
    runIdx: index('pipeline_step_logs_run_idx').on(table.runId),
  })
);

// ============================================
// 신규 Relations
// ============================================

export const articleCompaniesRelations = relations(articleCompanies, ({ one }) => ({
  article: one(articles, { fields: [articleCompanies.articleId], references: [articles.id] }),
  company: one(companies, { fields: [articleCompanies.companyId], references: [companies.id] }),
}));

export const articleComponentsRelations = relations(articleComponents, ({ one }) => ({
  article: one(articles, { fields: [articleComponents.articleId], references: [articles.id] }),
  component: one(components, { fields: [articleComponents.componentId], references: [components.id] }),
}));

export const articleApplicationsRelations = relations(articleApplications, ({ one }) => ({
  article: one(articles, { fields: [articleApplications.articleId], references: [articles.id] }),
  applicationCase: one(applicationCases, { fields: [articleApplications.applicationId], references: [applicationCases.id] }),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ many, one }) => ({
  steps: many(pipelineStepLogs),
  triggeredByUser: one(users, { fields: [pipelineRuns.triggeredBy], references: [users.id] }),
}));

export const pipelineStepLogsRelations = relations(pipelineStepLogs, ({ one }) => ({
  run: one(pipelineRuns, { fields: [pipelineStepLogs.runId], references: [pipelineRuns.id] }),
}));

// ============================================
// v1.2 신규 테이블
// ============================================

// Entity_Alias 테이블 — 다국어 별칭 관리 (pg_trgm GIN 인덱스 기반 fuzzy 매칭)
export const entityAliases = pgTable(
  'entity_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'company' | 'robot'
    entityId: uuid('entity_id').notNull(),
    aliasName: varchar('alias_name', { length: 300 }).notNull(),
    language: varchar('language', { length: 5 }), // 'ko' | 'en' | 'zh' | null
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('entity_aliases_entity_idx').on(table.entityType, table.entityId),
    // GIN 인덱스는 SQL 마이그레이션으로 생성:
    // CREATE INDEX entity_aliases_alias_gin ON entity_aliases USING gin (alias_name gin_trgm_ops);
  })
);

// Entity_Alias Relations
export const entityAliasesRelations = relations(entityAliases, ({ }) => ({
  // entityType에 따라 동적 참조 — 애플리케이션 레벨에서 처리
}));

// View_Cache 테이블 — 뷰별 캐시 영속화 (서버 재시작 시 warm-up용)
export const viewCache = pgTable(
  'view_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    viewName: varchar('view_name', { length: 100 }).notNull().unique(),
    data: jsonb('data').notNull(),
    cachedAt: timestamp('cached_at').defaultNow().notNull(),
    ttlMs: integer('ttl_ms').notNull(),
  },
  (table) => ({
    viewNameIdx: uniqueIndex('view_cache_view_name_idx').on(table.viewName),
  })
);
