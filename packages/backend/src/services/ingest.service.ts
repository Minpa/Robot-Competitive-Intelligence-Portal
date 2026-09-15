import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, articles, companies, humanoidRobots, competitiveAlerts } from '../db/index.js';
import type { ExtractedMetadata } from '../db/schema.js';
import { computeIngestContentHash, pickRobotIdByName, truncateToLimit, type RobotNameRef } from './ingest-hash.util.js';

const MAX_TITLE_LENGTH = 500;
const MAX_SOURCE_LENGTH = 255;
const MAX_URL_LENGTH = 1000;

export const ALERT_TYPE_WHITELIST = ['score_spike', 'mass_production', 'funding', 'partnership'] as const;
export type AlertType = (typeof ALERT_TYPE_WHITELIST)[number];

export function isValidAlertType(type: string): type is AlertType {
  return (ALERT_TYPE_WHITELIST as readonly string[]).includes(type);
}

export const ALERT_SEVERITY_WHITELIST = ['info', 'warning', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITY_WHITELIST)[number];

export function resolveAlertSeverity(severity: string | undefined): AlertSeverity {
  if (severity && (ALERT_SEVERITY_WHITELIST as readonly string[]).includes(severity)) {
    return severity as AlertSeverity;
  }
  return 'info';
}

const CategorySchema = z.enum(['product', 'technology', 'industry', 'other']);
const ProductTypeSchema = z.enum(['robot', 'rfm', 'soc', 'actuator', 'none']);

const AlertItemSchema = z.object({
  type: z.string().min(1),
  severity: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().optional(),
  robotName: z.string().optional(),
  triggerData: z.record(z.unknown()).optional(),
});

/**
 * Per-article validation schema. Validated individually (safeParse) per article
 * so one malformed article never fails the whole batch.
 */
export const ArticleItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  source: z.string().min(1),
  // Accept any string Date() can parse (Routine output may or may not include a UTC offset).
  publishedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'publishedAt must be a valid ISO datetime string',
  }),
  summary: z.string().min(1),
  content: z.string().optional(),
  language: z.string().default('en'),
  category: CategorySchema.default('other'),
  productType: ProductTypeSchema.default('none'),
  companyName: z.string().min(1),
  companyCountry: z.string().optional(),
  companyCategory: z.string().optional(),
  extractedMetadata: z.record(z.unknown()).optional(),
  alerts: z.array(AlertItemSchema).optional(),
});

export type ArticleItem = z.infer<typeof ArticleItemSchema>;

export interface IngestArticleError {
  index: number;
  title?: string;
  url?: string;
  error: string;
}

export interface IngestWarning {
  index: number;
  field: string;
  truncatedFrom: number;
  truncatedTo: number;
}

export interface IngestResult {
  requestId: string;
  inserted: number;
  skipped: number;
  companiesCreated: number;
  alertsInserted: number;
  errors: IngestArticleError[];
  warnings: IngestWarning[];
}

export interface IngestPayload {
  source: string;
  articles: unknown[];
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
}

function extractRawTitleAndUrl(raw: unknown): { title?: string; url?: string } {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      title: typeof obj.title === 'string' ? obj.title : undefined,
      url: typeof obj.url === 'string' ? obj.url : undefined,
    };
  }
  return {};
}

/**
 * Finds an existing company by case-insensitive name match, or creates one.
 * Only `name`, `country`, `category` are NOT NULL on `companies` — country
 * defaults to 'Unknown' and category to 'robotics' when not supplied.
 */
async function resolveCompany(
  companyName: string,
  companyCountry: string | undefined,
  companyCategory: string | undefined
): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`lower(${companies.name}) = lower(${companyName})`)
    .limit(1);

  if (existing) {
    return { id: existing.id, created: false };
  }

  const [created] = await db
    .insert(companies)
    .values({
      name: companyName,
      country: companyCountry ?? 'Unknown',
      category: companyCategory ?? 'robotics',
    })
    .returning({ id: companies.id });

  return { id: created!.id, created: true };
}

/**
 * Ingests a batch of articles (and optional per-article alerts) from an authenticated
 * external source (e.g. Claude Routine). Each article is processed independently —
 * a failure on one article never rolls back or blocks the others.
 */
export async function ingestArticles(payload: IngestPayload): Promise<IngestResult> {
  const requestId = randomUUID();
  const errors: IngestArticleError[] = [];
  const warnings: IngestWarning[] = [];
  let inserted = 0;
  let skipped = 0;
  let companiesCreated = 0;
  let alertsInserted = 0;

  let robotsCache: RobotNameRef[] | null = null;
  const getRobots = async (): Promise<RobotNameRef[]> => {
    if (!robotsCache) {
      robotsCache = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name }).from(humanoidRobots);
    }
    return robotsCache;
  };

  for (let index = 0; index < payload.articles.length; index++) {
    const raw = payload.articles[index];

    try {
      const parsed = ArticleItemSchema.safeParse(raw);
      if (!parsed.success) {
        const { title, url } = extractRawTitleAndUrl(raw);
        errors.push({ index, title, url, error: summarizeZodError(parsed.error) });
        continue;
      }

      const item = parsed.data;

      if (item.url.length > MAX_URL_LENGTH) {
        errors.push({ index, title: item.title, url: item.url, error: `url exceeds ${MAX_URL_LENGTH} characters` });
        continue;
      }

      const company = await resolveCompany(item.companyName, item.companyCountry, item.companyCategory);
      if (company.created) {
        companiesCreated++;
      }

      const titleResult = truncateToLimit(item.title, MAX_TITLE_LENGTH);
      if (titleResult.truncated) {
        warnings.push({ index, field: 'title', truncatedFrom: titleResult.from, truncatedTo: MAX_TITLE_LENGTH });
      }

      const sourceResult = truncateToLimit(item.source, MAX_SOURCE_LENGTH);
      if (sourceResult.truncated) {
        warnings.push({ index, field: 'source', truncatedFrom: sourceResult.from, truncatedTo: MAX_SOURCE_LENGTH });
      }

      const contentHash = computeIngestContentHash(item.url, item.publishedAt);

      const [insertedRow] = await db
        .insert(articles)
        .values({
          companyId: company.id,
          title: titleResult.value,
          source: sourceResult.value,
          url: item.url,
          publishedAt: new Date(item.publishedAt),
          summary: item.summary,
          content: item.content,
          language: item.language,
          category: item.category,
          productType: item.productType,
          contentHash,
          extractedMetadata: item.extractedMetadata as ExtractedMetadata | undefined,
        })
        .onConflictDoNothing({ target: articles.contentHash })
        .returning({ id: articles.id });

      if (!insertedRow) {
        // Duplicate content_hash — do not (re)insert alerts on resend.
        skipped++;
        continue;
      }

      inserted++;
      const articleId = insertedRow.id;

      if (item.alerts && item.alerts.length > 0) {
        const robots = await getRobots();

        for (const alert of item.alerts) {
          try {
            if (!isValidAlertType(alert.type)) {
              errors.push({ index, title: item.title, url: item.url, error: `invalid alert type: ${alert.type}` });
              continue;
            }

            const robotId = pickRobotIdByName(alert.robotName, robots);
            const severity = resolveAlertSeverity(alert.severity);

            await db.insert(competitiveAlerts).values({
              robotId,
              type: alert.type,
              severity,
              title: alert.title,
              summary: alert.summary,
              triggerData: { ...(alert.triggerData ?? {}), articleId, source: payload.source },
            });

            alertsInserted++;
          } catch (alertError) {
            errors.push({
              index,
              title: item.title,
              url: item.url,
              error: `alert error: ${(alertError as Error).message}`,
            });
          }
        }
      }
    } catch (error) {
      const { title, url } = extractRawTitleAndUrl(raw);
      errors.push({ index, title, url, error: (error as Error).message });
    }
  }

  return { requestId, inserted, skipped, companiesCreated, alertsInserted, errors, warnings };
}
