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
    announcementQuarter: integer('announcement_quarter'), // 1-4 (Q1-Q4)
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
  pocScores: many(pocScores),
  rfmScores: many(rfmScores),
  positioningData: many(positioningData),
  // v1.4 War Room relations
  partnerAdoptions: many(partnerRobotAdoptions),
  domainFits: many(domainRobotFit),
  scoreHistories: many(scoreHistory),
  competitiveAlerts: many(competitiveAlerts),
  whatifScenarios: many(whatifScenarios),
  specChangeLogs: many(specChangeLogs),
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

// AI 사용량 로그 — OpenAI/Claude API 호출 추적
export const aiUsageLogs = pgTable(
  'ai_usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 20 }).notNull(), // 'chatgpt' | 'claude'
    model: varchar('model', { length: 100 }).notNull(),
    webSearch: boolean('web_search').default(false).notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    estimatedCostUsd: decimal('estimated_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    query: text('query'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    providerIdx: index('ai_usage_logs_provider_idx').on(table.provider),
    createdAtIdx: index('ai_usage_logs_created_at_idx').on(table.createdAt),
  })
);

// ============================================
// 휴머노이드 동향 대시보드 테이블
// ============================================

// PoC Scores — 산업용 PoC 팩터별 역량 점수
export const pocScores = pgTable(
  'poc_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    payloadScore: integer('payload_score').notNull(),           // 1–10
    operationTimeScore: integer('operation_time_score').notNull(), // 1–10
    fingerDofScore: integer('finger_dof_score').notNull(),      // 1–10
    formFactorScore: integer('form_factor_score').notNull(),    // 1–10
    pocDeploymentScore: integer('poc_deployment_score').notNull(), // 1–10
    costEfficiencyScore: integer('cost_efficiency_score').notNull(), // 1–10
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('poc_scores_robot_idx').on(table.robotId),
  })
);

// RFM Scores — Robot Foundation Model 역량 점수
export const rfmScores = pgTable(
  'rfm_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    rfmModelName: varchar('rfm_model_name', { length: 255 }).notNull(),
    generalityScore: integer('generality_score').notNull(),          // 1–5
    realWorldDataScore: integer('real_world_data_score').notNull(),   // 1–5
    edgeInferenceScore: integer('edge_inference_score').notNull(),    // 1–5
    multiRobotCollabScore: integer('multi_robot_collab_score').notNull(), // 1–5
    openSourceScore: integer('open_source_score').notNull(),         // 1–5
    commercialMaturityScore: integer('commercial_maturity_score').notNull(), // 1–5
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('rfm_scores_robot_idx').on(table.robotId),
  })
);

// Positioning Data — 버블 차트용 포지셔닝 데이터
export const positioningData = pgTable(
  'positioning_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chartType: varchar('chart_type', { length: 50 }).notNull(), // 'rfm_competitiveness' | 'poc_positioning' | 'soc_ecosystem'
    robotId: uuid('robot_id')
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 255 }).notNull(),
    xValue: decimal('x_value', { precision: 10, scale: 4 }).notNull(),
    yValue: decimal('y_value', { precision: 10, scale: 4 }).notNull(),
    bubbleSize: decimal('bubble_size', { precision: 10, scale: 4 }).notNull(),
    colorGroup: varchar('color_group', { length: 50 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('positioning_data_robot_idx').on(table.robotId),
    chartTypeIdx: index('positioning_data_chart_type_idx').on(table.chartType),
  })
);

// ============================================
// v1.5 비전 센서 원가 분석 테이블
// ============================================

// Vision Sensor BOM Parts — 센서/컴퓨트 부품 단가 기준표
export const visionSensorBomParts = pgTable(
  'vision_sensor_bom_parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partName: varchar('part_name', { length: 255 }).notNull(),          // 부품명
    partType: varchar('part_type', { length: 50 }).notNull(),           // 'camera' | 'lidar' | 'depth' | 'compute'
    unitPriceMin: integer('unit_price_min').notNull(),                   // 최소 단가 ($)
    unitPriceMax: integer('unit_price_max').notNull(),                   // 최대 단가 ($)
    unitPriceMid: integer('unit_price_mid').notNull(),                   // 중간 단가 ($)
    priceUnit: varchar('price_unit', { length: 30 }).notNull().default('ea'), // 'ea' | 'pair' | 'set'
    sourceBasis: varchar('source_basis', { length: 500 }),              // 채택 근거
    sourceReliability: varchar('source_reliability', { length: 10 }).notNull().default('D'), // [A]~[E]
    exampleRobot: varchar('example_robot', { length: 255 }),            // 대표 사례 로봇
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

// Vision Sensor Robot Costs — 로봇별 비전 시스템 원가 타임라인
export const visionSensorRobotCosts = pgTable(
  'vision_sensor_robot_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .references(() => humanoidRobots.id, { onDelete: 'set null' }),
    robotLabel: varchar('robot_label', { length: 255 }).notNull(),      // 표시명 (e.g. "Optimus Gen1")
    companyName: varchar('company_name', { length: 100 }).notNull(),    // 'Tesla' | 'Boston Dynamics' | 'Figure AI'
    releaseYear: integer('release_year').notNull(),                     // 출시/추정 연도
    isForecast: boolean('is_forecast').notNull().default(false),        // true=전망, false=실적
    cameraDesc: varchar('camera_desc', { length: 300 }),               // 카메라 구성 설명
    cameraCostUsd: integer('camera_cost_usd').notNull().default(0),    // 카메라 원가 ($)
    lidarDepthDesc: varchar('lidar_depth_desc', { length: 300 }),      // LiDAR/Depth 설명
    lidarDepthCostUsd: integer('lidar_depth_cost_usd').notNull().default(0),
    computeDesc: varchar('compute_desc', { length: 300 }),             // 컴퓨트 설명
    computeCostUsd: integer('compute_cost_usd').notNull().default(0),
    totalCostUsd: integer('total_cost_usd').notNull(),                  // 합계 ($)
    performanceLevel: decimal('performance_level', { precision: 3, scale: 1 }).notNull(), // P1~P5 (소수 허용: 3.5)
    performanceNote: varchar('performance_note', { length: 300 }),     // 성능 레벨 설명
    reliabilityGrade: varchar('reliability_grade', { length: 10 }).notNull().default('D'), // [A]~[E]
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index('vision_robot_costs_company_idx').on(table.companyName),
    yearIdx: index('vision_robot_costs_year_idx').on(table.releaseYear),
  })
);

// ============================================
// 휴머노이드 동향 대시보드 Relations
// ============================================

export const pocScoresRelations = relations(pocScores, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [pocScores.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const rfmScoresRelations = relations(rfmScores, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [rfmScores.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const positioningDataRelations = relations(positioningData, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [positioningData.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const visionSensorRobotCostsRelations = relations(visionSensorRobotCosts, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [visionSensorRobotCosts.robotId],
    references: [humanoidRobots.id],
  }),
}));

// ============================================
// v1.4 전략 워룸 (War Room) 테이블
// ============================================

// Partners — 전략 파트너
export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // 'component' | 'rfm' | 'data' | 'platform' | 'integration'
    subCategory: varchar('sub_category', { length: 100 }), // 'vision_sensor' | 'battery' | 'ai_chip' | 'actuator' | 'motor' | 'reducer' | 'force_sensor' | null
    country: varchar('country', { length: 100 }),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    techCapability: integer('tech_capability'), // 1-10
    lgCompatibility: integer('lg_compatibility'), // 1-10
    marketShare: decimal('market_share', { precision: 5, scale: 4 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('partners_category_idx').on(table.category),
    subCategoryIdx: index('partners_sub_category_idx').on(table.subCategory),
    countryIdx: index('partners_country_idx').on(table.country),
  })
);

// Partner Robot Adoptions — 파트너-로봇 채택 관계
export const partnerRobotAdoptions = pgTable(
  'partner_robot_adoptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    adoptionStatus: varchar('adoption_status', { length: 50 }).notNull().default('evaluating'), // 'evaluating' | 'adopted' | 'strategic'
    adoptedAt: timestamp('adopted_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    partnerRobotUniq: uniqueIndex('partner_robot_adoptions_partner_robot_uniq').on(table.partnerId, table.robotId),
    partnerIdx: index('partner_robot_adoptions_partner_idx').on(table.partnerId),
    robotIdx: index('partner_robot_adoptions_robot_idx').on(table.robotId),
  })
);

// Partner Evaluations — 파트너 평가
export const partnerEvaluations = pgTable(
  'partner_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    evaluatedBy: uuid('evaluated_by')
      .references(() => users.id, { onDelete: 'set null' }),
    techScore: integer('tech_score').notNull(), // 1-10
    qualityScore: integer('quality_score').notNull(), // 1-10
    costScore: integer('cost_score').notNull(), // 1-10
    deliveryScore: integer('delivery_score').notNull(), // 1-10
    supportScore: integer('support_score').notNull(), // 1-10
    overallScore: decimal('overall_score', { precision: 4, scale: 2 }), // auto-calculated average
    comments: text('comments'),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    partnerIdx: index('partner_evaluations_partner_idx').on(table.partnerId),
    evaluatedByIdx: index('partner_evaluations_evaluated_by_idx').on(table.evaluatedBy),
  })
);

// Application Domains — 사업화 분야
export const applicationDomains = pgTable(
  'application_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    marketSizeBillionUsd: decimal('market_size_billion_usd', { precision: 10, scale: 2 }),
    cagrPercent: decimal('cagr_percent', { precision: 6, scale: 2 }),
    somBillionUsd: decimal('som_billion_usd', { precision: 10, scale: 2 }),
    keyTasks: jsonb('key_tasks').$type<string[]>(),
    entryBarriers: jsonb('entry_barriers').$type<string[]>(),
    lgExistingBusiness: decimal('lg_existing_business', { precision: 3, scale: 2 }), // 0-1 scale
    lgReadiness: decimal('lg_readiness', { precision: 3, scale: 2 }), // 0-1 scale, auto-calculated
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('application_domains_name_idx').on(table.name),
  })
);

// Domain Robot Fit — 로봇-분야 적합도
export const domainRobotFit = pgTable(
  'domain_robot_fit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .notNull()
      .references(() => applicationDomains.id, { onDelete: 'cascade' }),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    fitScore: decimal('fit_score', { precision: 3, scale: 2 }), // 0-1
    fitDetails: jsonb('fit_details'),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => ({
    domainRobotUniq: uniqueIndex('domain_robot_fit_domain_robot_uniq').on(table.domainId, table.robotId),
    domainIdx: index('domain_robot_fit_domain_idx').on(table.domainId),
    robotIdx: index('domain_robot_fit_robot_idx').on(table.robotId),
  })
);

// Score History — 월별 스코어 스냅샷
export const scoreHistory = pgTable(
  'score_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    snapshotMonth: varchar('snapshot_month', { length: 7 }).notNull(), // 'YYYY-MM'
    pocScores: jsonb('poc_scores'), // PocScoreValues
    rfmScores: jsonb('rfm_scores'), // RfmScoreValues
    combinedScore: decimal('combined_score', { precision: 6, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    robotMonthUniq: uniqueIndex('score_history_robot_month_uniq').on(table.robotId, table.snapshotMonth),
    robotIdx: index('score_history_robot_idx').on(table.robotId),
    snapshotMonthIdx: index('score_history_snapshot_month_idx').on(table.snapshotMonth),
  })
);

// Competitive Alerts — 경쟁 알림
export const competitiveAlerts = pgTable(
  'competitive_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .references(() => humanoidRobots.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 50 }).notNull(), // 'score_spike' | 'mass_production' | 'funding' | 'partnership'
    severity: varchar('severity', { length: 20 }).default('info'), // 'info' | 'warning' | 'critical'
    title: varchar('title', { length: 500 }).notNull(),
    summary: text('summary'),
    triggerData: jsonb('trigger_data'),
    isRead: boolean('is_read').default(false).notNull(),
    readBy: uuid('read_by')
      .references(() => users.id, { onDelete: 'set null' }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('competitive_alerts_robot_idx').on(table.robotId),
    typeIdx: index('competitive_alerts_type_idx').on(table.type),
    isReadIdx: index('competitive_alerts_is_read_idx').on(table.isRead),
    createdAtIdx: index('competitive_alerts_created_at_idx').on(table.createdAt),
  })
);

// What-If Scenarios — What-If 시나리오
export const whatifScenarios = pgTable(
  'whatif_scenarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' }),
    baseRobotId: uuid('base_robot_id')
      .references(() => humanoidRobots.id, { onDelete: 'set null' }),
    parameterOverrides: jsonb('parameter_overrides').notNull(),
    calculatedScores: jsonb('calculated_scores'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index('whatif_scenarios_created_by_idx').on(table.createdBy),
    baseRobotIdx: index('whatif_scenarios_base_robot_idx').on(table.baseRobotId),
  })
);

// Strategic Goals — 전략 목표
export const strategicGoals = pgTable(
  'strategic_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    metricType: varchar('metric_type', { length: 100 }).notNull(), // 'poc_rank' | 'rfm_rank' | 'combined_rank' | 'partner_count' | 'domain_coverage' | 'custom'
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    currentValue: decimal('current_value', { precision: 10, scale: 2 }),
    deadline: date('deadline'),
    status: varchar('status', { length: 50 }).default('on_track'), // 'achieved' | 'on_track' | 'at_risk' | 'behind'
    requiredActions: jsonb('required_actions').$type<string[]>(),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    metricTypeIdx: index('strategic_goals_metric_type_idx').on(table.metricType),
    statusIdx: index('strategic_goals_status_idx').on(table.status),
    createdByIdx: index('strategic_goals_created_by_idx').on(table.createdBy),
  })
);

// Spec Change Logs — 스펙 변경 이력
export const specChangeLogs = pgTable(
  'spec_change_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    robotId: uuid('robot_id')
      .notNull()
      .references(() => humanoidRobots.id, { onDelete: 'cascade' }),
    changedBy: uuid('changed_by')
      .references(() => users.id, { onDelete: 'set null' }),
    fieldName: varchar('field_name', { length: 255 }).notNull(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
  },
  (table) => ({
    robotIdx: index('spec_change_logs_robot_idx').on(table.robotId),
    changedByIdx: index('spec_change_logs_changed_by_idx').on(table.changedBy),
    changedAtIdx: index('spec_change_logs_changed_at_idx').on(table.changedAt),
  })
);

// ============================================
// v1.4 전략 워룸 Relations
// ============================================

export const partnersRelations = relations(partners, ({ many }) => ({
  adoptions: many(partnerRobotAdoptions),
  evaluations: many(partnerEvaluations),
}));

export const partnerRobotAdoptionsRelations = relations(partnerRobotAdoptions, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerRobotAdoptions.partnerId],
    references: [partners.id],
  }),
  robot: one(humanoidRobots, {
    fields: [partnerRobotAdoptions.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const partnerEvaluationsRelations = relations(partnerEvaluations, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerEvaluations.partnerId],
    references: [partners.id],
  }),
  evaluator: one(users, {
    fields: [partnerEvaluations.evaluatedBy],
    references: [users.id],
  }),
}));

export const applicationDomainsRelations = relations(applicationDomains, ({ many }) => ({
  robotFits: many(domainRobotFit),
}));

export const domainRobotFitRelations = relations(domainRobotFit, ({ one }) => ({
  domain: one(applicationDomains, {
    fields: [domainRobotFit.domainId],
    references: [applicationDomains.id],
  }),
  robot: one(humanoidRobots, {
    fields: [domainRobotFit.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const scoreHistoryRelations = relations(scoreHistory, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [scoreHistory.robotId],
    references: [humanoidRobots.id],
  }),
}));

export const competitiveAlertsRelations = relations(competitiveAlerts, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [competitiveAlerts.robotId],
    references: [humanoidRobots.id],
  }),
  reader: one(users, {
    fields: [competitiveAlerts.readBy],
    references: [users.id],
  }),
}));

export const whatifScenariosRelations = relations(whatifScenarios, ({ one }) => ({
  creator: one(users, {
    fields: [whatifScenarios.createdBy],
    references: [users.id],
  }),
  baseRobot: one(humanoidRobots, {
    fields: [whatifScenarios.baseRobotId],
    references: [humanoidRobots.id],
  }),
}));

export const strategicGoalsRelations = relations(strategicGoals, ({ one }) => ({
  creator: one(users, {
    fields: [strategicGoals.createdBy],
    references: [users.id],
  }),
}));

export const specChangeLogsRelations = relations(specChangeLogs, ({ one }) => ({
  robot: one(humanoidRobots, {
    fields: [specChangeLogs.robotId],
    references: [humanoidRobots.id],
  }),
  changedByUser: one(users, {
    fields: [specChangeLogs.changedBy],
    references: [users.id],
  }),
}));

// ============================================
// v1.6 CI 업데이트 시스템 테이블
// ============================================

// CI Competitors — 경쟁 로봇
export const ciCompetitors = pgTable('ci_competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 255 }).notNull(),
  country: varchar('country', { length: 100 }),
  stage: varchar('stage', { length: 50 }).default('development'), // concept | prototype | poc | pilot | commercial
  imageUrl: varchar('image_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CI Layers — 비교 레이어 (HW, SW/AI, Data, Biz, Safety, Patent)
export const ciLayers = pgTable('ci_layers', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 10 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// CI Categories — 레이어 내 카테고리
export const ciCategories = pgTable('ci_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  layerId: uuid('layer_id').notNull().references(() => ciLayers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  layerIdx: index('ci_categories_layer_idx').on(table.layerId),
}));

// CI Items — 카테고리 내 비교 항목
export const ciItems = pgTable('ci_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => ciCategories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('ci_items_category_idx').on(table.categoryId),
}));

// CI Values — 경쟁사 × 항목별 값
export const ciValues = pgTable('ci_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitorId: uuid('competitor_id').notNull().references(() => ciCompetitors.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => ciItems.id, { onDelete: 'cascade' }),
  value: text('value'),
  confidence: varchar('confidence', { length: 1 }).default('D'), // A B C D F
  source: text('source'),
  sourceUrl: varchar('source_url', { length: 1000 }),
  sourceDate: date('source_date'),
  lastVerified: timestamp('last_verified'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  competitorItemUniq: uniqueIndex('ci_values_competitor_item_uniq').on(table.competitorId, table.itemId),
  competitorIdx: index('ci_values_competitor_idx').on(table.competitorId),
  itemIdx: index('ci_values_item_idx').on(table.itemId),
}));

// CI Monitor Alerts — 자동 수집 알림
export const ciMonitorAlerts = pgTable('ci_monitor_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceName: varchar('source_name', { length: 200 }),
  sourceUrl: text('source_url'),
  headline: text('headline').notNull(),
  summary: text('summary'),
  competitorId: uuid('competitor_id').references(() => ciCompetitors.id, { onDelete: 'set null' }),
  layerId: uuid('layer_id').references(() => ciLayers.id, { onDelete: 'set null' }),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | reviewed | applied | dismissed
  appliedTo: uuid('applied_to').references(() => ciValues.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: varchar('reviewed_by', { length: 100 }),
}, (table) => ({
  statusIdx: index('ci_monitor_alerts_status_idx').on(table.status),
  competitorIdx: index('ci_monitor_alerts_competitor_idx').on(table.competitorId),
  detectedAtIdx: index('ci_monitor_alerts_detected_at_idx').on(table.detectedAt),
}));

// CI Value History — 값 변경 이력
export const ciValueHistory = pgTable('ci_value_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  valueId: uuid('value_id').notNull().references(() => ciValues.id, { onDelete: 'cascade' }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  oldConfidence: varchar('old_confidence', { length: 1 }),
  newConfidence: varchar('new_confidence', { length: 1 }),
  changeSource: varchar('change_source', { length: 20 }).notNull(), // auto | ai_assist | manual
  changeReason: text('change_reason'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  changedBy: varchar('changed_by', { length: 100 }),
}, (table) => ({
  valueIdx: index('ci_value_history_value_idx').on(table.valueId),
  changedAtIdx: index('ci_value_history_changed_at_idx').on(table.changedAt),
}));

// CI Freshness — 데이터 신선도 추적
export const ciFreshness = pgTable('ci_freshness', {
  id: uuid('id').primaryKey().defaultRandom(),
  layerId: uuid('layer_id').notNull().references(() => ciLayers.id, { onDelete: 'cascade' }),
  competitorId: uuid('competitor_id').notNull().references(() => ciCompetitors.id, { onDelete: 'cascade' }),
  lastVerified: timestamp('last_verified'),
  nextReview: timestamp('next_review'),
  tier: integer('tier').default(2).notNull(), // 1: weekly, 2: monthly, 3: quarterly
}, (table) => ({
  layerCompetitorUniq: uniqueIndex('ci_freshness_layer_competitor_uniq').on(table.layerId, table.competitorId),
}));

// CI Staging — 스테이징 (검증 대기)
export const ciStaging = pgTable('ci_staging', {
  id: uuid('id').primaryKey().defaultRandom(),
  updateType: varchar('update_type', { length: 20 }).notNull(), // value_update | new_competitor | score_adjust
  payload: jsonb('payload').notNull(),
  sourceChannel: varchar('source_channel', { length: 20 }).notNull(), // auto | ai_assist | manual
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: varchar('reviewed_by', { length: 100 }),
  appliedAt: timestamp('applied_at'),
}, (table) => ({
  statusIdx: index('ci_staging_status_idx').on(table.status),
  createdAtIdx: index('ci_staging_created_at_idx').on(table.createdAt),
}));

// ============================================
// v1.6 CI 업데이트 시스템 Relations
// ============================================

export const ciCompetitorsRelations = relations(ciCompetitors, ({ many }) => ({
  values: many(ciValues),
  monitorAlerts: many(ciMonitorAlerts),
  freshness: many(ciFreshness),
}));

export const ciLayersRelations = relations(ciLayers, ({ many }) => ({
  categories: many(ciCategories),
  monitorAlerts: many(ciMonitorAlerts),
  freshness: many(ciFreshness),
}));

export const ciCategoriesRelations = relations(ciCategories, ({ one, many }) => ({
  layer: one(ciLayers, { fields: [ciCategories.layerId], references: [ciLayers.id] }),
  items: many(ciItems),
}));

export const ciItemsRelations = relations(ciItems, ({ one, many }) => ({
  category: one(ciCategories, { fields: [ciItems.categoryId], references: [ciCategories.id] }),
  values: many(ciValues),
}));

export const ciValuesRelations = relations(ciValues, ({ one, many }) => ({
  competitor: one(ciCompetitors, { fields: [ciValues.competitorId], references: [ciCompetitors.id] }),
  item: one(ciItems, { fields: [ciValues.itemId], references: [ciItems.id] }),
  history: many(ciValueHistory),
}));

export const ciMonitorAlertsRelations = relations(ciMonitorAlerts, ({ one }) => ({
  competitor: one(ciCompetitors, { fields: [ciMonitorAlerts.competitorId], references: [ciCompetitors.id] }),
  layer: one(ciLayers, { fields: [ciMonitorAlerts.layerId], references: [ciLayers.id] }),
  appliedValue: one(ciValues, { fields: [ciMonitorAlerts.appliedTo], references: [ciValues.id] }),
}));

export const ciValueHistoryRelations = relations(ciValueHistory, ({ one }) => ({
  value: one(ciValues, { fields: [ciValueHistory.valueId], references: [ciValues.id] }),
}));

export const ciFreshnessRelations = relations(ciFreshness, ({ one }) => ({
  layer: one(ciLayers, { fields: [ciFreshness.layerId], references: [ciLayers.id] }),
  competitor: one(ciCompetitors, { fields: [ciFreshness.competitorId], references: [ciCompetitors.id] }),
}));

// ============================================
// v1.7 Perfect Robot Benchmark 테이블
// ============================================

// Benchmark Axes — 10축 정의
export const ciBenchmarkAxes = pgTable('ci_benchmark_axes', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  icon: varchar('icon', { length: 10 }),
  label: varchar('label', { length: 100 }).notNull(),
  description: text('description'),
  perfectDef: text('perfect_def'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Benchmark Scores — 경쟁사별 현재/목표 점수
export const ciBenchmarkScores = pgTable('ci_benchmark_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitorId: uuid('competitor_id').notNull().references(() => ciCompetitors.id, { onDelete: 'cascade' }),
  axisKey: varchar('axis_key', { length: 50 }).notNull(),
  currentScore: integer('current_score').notNull().default(0),
  targetScore: integer('target_score').notNull().default(0),
  rationale: text('rationale'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  competitorAxisUniq: uniqueIndex('ci_benchmark_scores_competitor_axis_uniq').on(table.competitorId, table.axisKey),
  competitorIdx: index('ci_benchmark_scores_competitor_idx').on(table.competitorId),
}));

// Relations
export const ciBenchmarkScoresRelations = relations(ciBenchmarkScores, ({ one }) => ({
  competitor: one(ciCompetitors, { fields: [ciBenchmarkScores.competitorId], references: [ciCompetitors.id] }),
}));
