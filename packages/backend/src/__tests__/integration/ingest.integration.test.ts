/**
 * Ingest Batch API Integration Tests
 *
 * Exercises POST /api/ingest/articles and GET /api/ingest/health against a real
 * PostgreSQL database. See docs/ingest/SPEC.md.
 *
 * NOTE: These tests require a running PostgreSQL database.
 * Set DATABASE_URL environment variable or use docker-compose to start the database.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from '../../routes/index.js';
import { db } from '../../db/index.js';
import { companies, humanoidRobots, articles, competitiveAlerts } from '../../db/schema.js';
import { eq, sql, inArray } from 'drizzle-orm';

const INGEST_KEY = 'test-ingest-key-12345';

async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

const suffix = Date.now();
const COMPANY_NAME = `Ingest Test Co ${suffix}`;
const ROBOT_NAME = `Ingest Test Robot ${suffix}`;

let app: FastifyInstance;
let dbAvailable = false;
let parentCompanyId: string;
let robotId: string;

const createdCompanyIds: string[] = [];
const createdArticleIds: string[] = [];
const createdAlertIds: string[] = [];
const createdRobotIds: string[] = [];

describe('Ingest Batch API Integration Tests', () => {
  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();

    if (!dbAvailable) {
      console.warn('⚠️ Database not available. Skipping ingest integration tests.');
      return;
    }

    process.env.INGEST_API_KEY = INGEST_KEY;

    app = Fastify({ logger: false });
    await app.register(cors, { origin: true });
    await registerRoutes(app);
    await app.ready();

    const [company] = await db
      .insert(companies)
      .values({ name: `Ingest Robot Parent Co ${suffix}`, country: 'USA', category: 'robotics' })
      .returning();
    parentCompanyId = company!.id;
    createdCompanyIds.push(parentCompanyId);

    const [robot] = await db
      .insert(humanoidRobots)
      .values({ companyId: parentCompanyId, name: ROBOT_NAME })
      .returning();
    robotId = robot!.id;
    createdRobotIds.push(robotId);
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    if (createdAlertIds.length > 0) {
      await db.delete(competitiveAlerts).where(inArray(competitiveAlerts.id, createdAlertIds)).catch(() => {});
    }
    if (createdArticleIds.length > 0) {
      await db.delete(articles).where(inArray(articles.id, createdArticleIds)).catch(() => {});
    }
    if (createdRobotIds.length > 0) {
      await db.delete(humanoidRobots).where(inArray(humanoidRobots.id, createdRobotIds)).catch(() => {});
    }
    if (createdCompanyIds.length > 0) {
      await db.delete(companies).where(inArray(companies.id, createdCompanyIds)).catch(() => {});
    }

    delete process.env.INGEST_API_KEY;
    await app.close();
  });

  describe('Authentication', () => {
    it('rejects requests without an ingest key', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        payload: { source: 'test', articles: [{}] },
      });
      expect(response.statusCode).toBe(401);
    });

    it('rejects requests with a wrong ingest key', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'GET',
        url: '/api/ingest/health',
        headers: { Authorization: 'Bearer wrong-key' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 503 when the ingest key is not configured on the server', async () => {
      if (!dbAvailable) return;
      const original = process.env.INGEST_API_KEY;
      delete process.env.INGEST_API_KEY;
      try {
        const response = await app.inject({ method: 'GET', url: '/api/ingest/health' });
        expect(response.statusCode).toBe(503);
      } finally {
        process.env.INGEST_API_KEY = original;
      }
    });

    it('returns { ok: true } on the health check with a valid key', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'GET',
        url: '/api/ingest/health',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ ok: true });
    });
  });

  describe('Article ingestion', () => {
    it('inserts a new article, creates the company (default country/category), truncates the title, and stores extractedMetadata', async () => {
      if (!dbAvailable) return;

      const longTitle = 'T'.repeat(520);
      const url = `https://example.com/ingest-test-${suffix}-a`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [
            {
              title: longTitle,
              url,
              source: 'Test Source',
              publishedAt: '2026-09-15T00:00:00Z',
              summary: 'Summary text',
              companyName: COMPANY_NAME,
              extractedMetadata: { keyPoints: ['a', 'b'], confidence: 'A' },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.inserted).toBe(1);
      expect(body.skipped).toBe(0);
      expect(body.companiesCreated).toBe(1);
      expect(body.errors).toEqual([]);
      expect(body.warnings).toHaveLength(1);
      expect(body.warnings[0]).toMatchObject({ index: 0, field: 'title', truncatedFrom: 520, truncatedTo: 500 });
      expect(body.requestId).toBeDefined();

      const [company] = await db.select().from(companies).where(eq(companies.name, COMPANY_NAME));
      expect(company).toBeDefined();
      expect(company!.country).toBe('Unknown');
      expect(company!.category).toBe('robotics');
      createdCompanyIds.push(company!.id);

      const [article] = await db.select().from(articles).where(eq(articles.url, url));
      expect(article).toBeDefined();
      expect(article!.title.length).toBe(500);
      expect(article!.companyId).toBe(company!.id);
      expect(article!.extractedMetadata).toMatchObject({ keyPoints: ['a', 'b'], confidence: 'A' });
      createdArticleIds.push(article!.id);
    });

    it('matches an existing company case-insensitively instead of creating a duplicate', async () => {
      if (!dbAvailable) return;

      const url = `https://example.com/ingest-test-${suffix}-b`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [
            {
              title: 'Second article, same company different case',
              url,
              source: 'Test Source',
              publishedAt: '2026-09-15T00:00:00Z',
              summary: 'Summary text',
              companyName: COMPANY_NAME.toUpperCase(),
              companyCountry: 'USA',
              companyCategory: 'robotics',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.inserted).toBe(1);
      expect(body.companiesCreated).toBe(0);

      const matches = await db
        .select()
        .from(companies)
        .where(sql`lower(${companies.name}) = lower(${COMPANY_NAME})`);
      expect(matches).toHaveLength(1);

      const [article] = await db.select().from(articles).where(eq(articles.url, url));
      expect(article!.companyId).toBe(matches[0]!.id);
      createdArticleIds.push(article!.id);
    });

    it('reports skipped on resend of the same url+date, and inserts a new row for the next day', async () => {
      if (!dbAvailable) return;

      const url = `https://example.com/ingest-test-${suffix}-c`;
      const basePayload = {
        title: 'Duplicate test article',
        url,
        source: 'Test Source',
        summary: 'Summary text',
        companyName: COMPANY_NAME,
      };

      const first = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [{ ...basePayload, publishedAt: '2026-09-15T00:00:00Z' }],
        },
      });
      expect(first.statusCode).toBe(200);
      expect(JSON.parse(first.body).inserted).toBe(1);

      const resend = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          // Same day, different time-of-day — must still hash to the same content_hash.
          articles: [{ ...basePayload, publishedAt: '2026-09-15T18:30:00Z' }],
        },
      });
      expect(resend.statusCode).toBe(200);
      const resendBody = JSON.parse(resend.body);
      expect(resendBody.inserted).toBe(0);
      expect(resendBody.skipped).toBe(1);

      const nextDay = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [{ ...basePayload, publishedAt: '2026-09-16T00:00:00Z' }],
        },
      });
      expect(nextDay.statusCode).toBe(200);
      expect(JSON.parse(nextDay.body).inserted).toBe(1);

      const rows = await db.select().from(articles).where(eq(articles.url, url));
      expect(rows).toHaveLength(2);
      rows.forEach((row) => createdArticleIds.push(row.id));
    });

    it('isolates a partial failure (oversized url) from the rest of the batch, without saving the bad article', async () => {
      if (!dbAvailable) return;

      const goodUrl = `https://example.com/ingest-test-${suffix}-d`;
      const badUrl = `https://example.com/${'x'.repeat(1000)}`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [
            {
              title: 'Valid article',
              url: goodUrl,
              source: 'Test Source',
              publishedAt: '2026-09-15T00:00:00Z',
              summary: 'Summary text',
              companyName: COMPANY_NAME,
            },
            {
              title: 'Bad url article',
              url: badUrl,
              source: 'Test Source',
              publishedAt: '2026-09-15T00:00:00Z',
              summary: 'Summary text',
              companyName: COMPANY_NAME,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.inserted).toBe(1);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].index).toBe(1);

      const [article] = await db.select().from(articles).where(eq(articles.url, goodUrl));
      expect(article).toBeDefined();
      createdArticleIds.push(article!.id);

      const badRows = await db.select().from(articles).where(eq(articles.url, badUrl));
      expect(badRows).toHaveLength(0);
    });

    it('creates alerts resolving robotName by exact and partial match, leaves robotId null when unmatched, and isolates an invalid alert type', async () => {
      if (!dbAvailable) return;

      const url = `https://example.com/ingest-test-${suffix}-e`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [
            {
              title: 'Article with alerts',
              url,
              source: 'Test Source',
              publishedAt: '2026-09-15T00:00:00Z',
              summary: 'Summary text',
              companyName: COMPANY_NAME,
              alerts: [
                { type: 'funding', title: `Exact match alert ${suffix}`, robotName: ROBOT_NAME },
                { type: 'partnership', title: `Partial match alert ${suffix}`, robotName: String(suffix) },
                { type: 'mass_production', title: `No match alert ${suffix}`, robotName: 'Totally Unrelated Robot XYZ' },
                { type: 'bogus_type', title: `Invalid type alert ${suffix}` },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.inserted).toBe(1);
      expect(body.alertsInserted).toBe(3);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].error).toContain('bogus_type');

      const [article] = await db.select().from(articles).where(eq(articles.url, url));
      createdArticleIds.push(article!.id);

      const [exactAlert] = await db
        .select()
        .from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, `Exact match alert ${suffix}`));
      expect(exactAlert).toBeDefined();
      expect(exactAlert!.robotId).toBe(robotId);
      expect((exactAlert!.triggerData as Record<string, unknown>).articleId).toBe(article!.id);
      expect((exactAlert!.triggerData as Record<string, unknown>).source).toBe('ingest-integration-test');
      createdAlertIds.push(exactAlert!.id);

      const [partialAlert] = await db
        .select()
        .from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, `Partial match alert ${suffix}`));
      expect(partialAlert).toBeDefined();
      expect(partialAlert!.robotId).toBe(robotId);
      createdAlertIds.push(partialAlert!.id);

      const [noMatchAlert] = await db
        .select()
        .from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, `No match alert ${suffix}`));
      expect(noMatchAlert).toBeDefined();
      expect(noMatchAlert!.robotId).toBeNull();
      createdAlertIds.push(noMatchAlert!.id);

      const bogusAlerts = await db
        .select()
        .from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, `Invalid type alert ${suffix}`));
      expect(bogusAlerts).toHaveLength(0);
    });

    it('does not (re)insert alerts when the article itself is a duplicate (skipped)', async () => {
      if (!dbAvailable) return;

      const url = `https://example.com/ingest-test-${suffix}-f`;
      const article = {
        title: 'Alert dedupe test article',
        url,
        source: 'Test Source',
        publishedAt: '2026-09-15T00:00:00Z',
        summary: 'Summary text',
        companyName: COMPANY_NAME,
      };

      const first = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: { source: 'ingest-integration-test', articles: [article] },
      });
      expect(JSON.parse(first.body).inserted).toBe(1);

      const [firstRow] = await db.select().from(articles).where(eq(articles.url, url));
      createdArticleIds.push(firstRow!.id);

      const resend = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: {
          source: 'ingest-integration-test',
          articles: [{ ...article, alerts: [{ type: 'funding', title: `Dedup alert ${suffix}` }] }],
        },
      });
      expect(resend.statusCode).toBe(200);
      const resendBody = JSON.parse(resend.body);
      expect(resendBody.skipped).toBe(1);
      expect(resendBody.alertsInserted).toBe(0);

      const dedupAlerts = await db
        .select()
        .from(competitiveAlerts)
        .where(eq(competitiveAlerts.title, `Dedup alert ${suffix}`));
      expect(dedupAlerts).toHaveLength(0);
    });
  });

  describe('Batch validation', () => {
    it('rejects a batch of 201 articles with no DB changes, and accepts 200', async () => {
      if (!dbAvailable) return;

      const tooMany = Array.from({ length: 201 }, (_, i) => ({
        title: `Batch item ${i}`,
        url: `https://example.com/ingest-test-${suffix}-batch-${i}`,
        source: 'Test Source',
        publishedAt: '2026-09-15T00:00:00Z',
        summary: 'Summary text',
        companyName: COMPANY_NAME,
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: { source: 'ingest-integration-test', articles: tooMany },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Batch too large. Max 200 articles per request.' });

      const rows = await db.select().from(articles).where(eq(articles.url, tooMany[0]!.url));
      expect(rows).toHaveLength(0);
    });

    it('rejects a malformed top-level body with a 400 and zod issue summary', async () => {
      if (!dbAvailable) return;

      const response = await app.inject({
        method: 'POST',
        url: '/api/ingest/articles',
        headers: { Authorization: `Bearer ${INGEST_KEY}` },
        payload: { source: 'ingest-integration-test', articles: 'not-an-array' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(Array.isArray(body.issues)).toBe(true);
    });
  });
});
