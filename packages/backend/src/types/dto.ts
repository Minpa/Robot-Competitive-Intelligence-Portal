import { z } from 'zod';
import { PRODUCT_TYPES, PRODUCT_STATUSES } from './entities.js';

// Company DTOs
export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(255),
  country: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  homepageUrl: z.string().url().max(500).optional(),
  description: z.string().optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;

// Product DTOs
export const CreateProductSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  series: z.string().max(100).optional(),
  type: z.enum(PRODUCT_TYPES as [string, ...string[]]),
  releaseDate: z.string().date().optional(),
  targetMarket: z.string().max(255).optional(),
  status: z.enum(PRODUCT_STATUSES as [string, ...string[]]).default('announced'),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({ companyId: true });

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

// ProductSpec DTOs
export const SensorConfigSchema = z.object({
  type: z.string(),
  model: z.string().optional(),
  specs: z.record(z.unknown()).optional(),
});

export const CreateProductSpecSchema = z.object({
  productId: z.string().uuid(),
  dof: z.number().int().positive().optional(),
  payloadKg: z.number().positive().optional(),
  speedMps: z.number().positive().optional(),
  batteryMinutes: z.number().int().positive().optional(),
  sensors: z.array(SensorConfigSchema).optional(),
  controlArchitecture: z.string().max(255).optional(),
  os: z.string().max(100).optional(),
  sdk: z.string().max(100).optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  priceCurrency: z.string().max(10).default('USD'),
});

export const UpdateProductSpecSchema = CreateProductSpecSchema.partial().omit({ productId: true });

export type CreateProductSpecDto = z.infer<typeof CreateProductSpecSchema>;
export type UpdateProductSpecDto = z.infer<typeof UpdateProductSpecSchema>;

// Article DTOs
export const CreateArticleSchema = z.object({
  productId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  source: z.string().min(1).max(255),
  url: z.string().url().max(1000),
  publishedAt: z.string().datetime().optional(),
  summary: z.string().optional(),
  content: z.string(),
  language: z.enum(['ko', 'en']).default('en'),
});

export const UpdateArticleSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500).optional(),
  summary: z.string().optional(),
});

export type CreateArticleDto = z.infer<typeof CreateArticleSchema>;
export type UpdateArticleDto = z.infer<typeof UpdateArticleSchema>;

// Keyword DTOs
export const CreateKeywordSchema = z.object({
  term: z.string().min(1).max(255),
  language: z.enum(['ko', 'en']).default('en'),
  category: z.string().max(100).optional(),
});

export type CreateKeywordDto = z.infer<typeof CreateKeywordSchema>;

// KeywordStats DTOs
export const CreateKeywordStatsSchema = z.object({
  keywordId: z.string().uuid(),
  period: z.enum(['week', 'month']),
  periodStart: z.date(),
  periodEnd: z.date(),
  count: z.number().int().nonnegative(),
  delta: z.number().int().optional(),
  deltaPercent: z.number().optional(),
  relatedCompanyId: z.string().uuid().optional(),
  relatedProductId: z.string().uuid().optional(),
});

export type CreateKeywordStatsDto = z.infer<typeof CreateKeywordStatsSchema>;

// CrawlTarget DTOs
export const CrawlPatternSchema = z.object({
  type: z.enum(['product_page', 'spec_sheet', 'article', 'press_release', 'pricing']),
  selectors: z.record(z.string()),
});

export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  requestsPerHour: z.number().int().positive(),
  delayBetweenRequests: z.number().int().nonnegative(),
});

export const CreateCrawlTargetSchema = z.object({
  domain: z.string().min(1).max(255),
  urls: z.array(z.string().url()).default([]),
  patterns: z.array(CrawlPatternSchema).default([]),
  cronExpression: z.string().max(100).default('0 0 * * 0'),
  rateLimit: RateLimitConfigSchema.optional(),
  enabled: z.boolean().default(true),
});

export const UpdateCrawlTargetSchema = CreateCrawlTargetSchema.partial();

export type CreateCrawlTargetDto = z.infer<typeof CreateCrawlTargetSchema>;
export type UpdateCrawlTargetDto = z.infer<typeof UpdateCrawlTargetSchema>;

// Pagination and Filter DTOs
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

export const CompanyFiltersSchema = z.object({
  country: z.string().optional(),
  category: z.string().optional(),
  searchTerm: z.string().optional(),
});

export type CompanyFiltersDto = z.infer<typeof CompanyFiltersSchema>;

export const ProductFiltersSchema = z.object({
  companyId: z.string().uuid().optional(),
  category: z.enum(PRODUCT_TYPES as [string, ...string[]]).optional(),
  releaseYear: z.coerce.number().int().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  country: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  dofMin: z.coerce.number().int().optional(),
  dofMax: z.coerce.number().int().optional(),
  payloadMin: z.coerce.number().optional(),
  payloadMax: z.coerce.number().optional(),
});

export type ProductFiltersDto = z.infer<typeof ProductFiltersSchema>;

export const ArticleFiltersSchema = z.object({
  companyId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  source: z.string().optional(),
  language: z.enum(['ko', 'en']).optional(),
  publishedAfter: z.string().datetime().optional(),
  publishedBefore: z.string().datetime().optional(),
  keywords: z.array(z.string()).optional(),
});

export type ArticleFiltersDto = z.infer<typeof ArticleFiltersSchema>;
