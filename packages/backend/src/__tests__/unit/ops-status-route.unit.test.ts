/**
 * GET /ops/status (admin routes) — 인증/권한/응답 구조/부분 실패/비밀값 미포함
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({
  listRecent: vi.fn(),
  has: vi.fn(),
  get: vi.fn(),
  computeKey: vi.fn(),
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/admin-crawler.service.js', () => ({ adminCrawlerService: {} }));
vi.mock('../../services/ai-analyzer.service.js', () => ({ analyzeArticle: vi.fn() }));
vi.mock('../../services/ai-usage.service.js', () => ({ aiUsageService: {} }));
vi.mock('../../services/data-generator.service.js', () => ({ dataGeneratorService: {} }));
vi.mock('../../services/scheduler.service.js', () => ({ schedulerService: { isTaskRunning: () => false } }));
vi.mock('../../services/data-migration.service.js', () => ({
  dataMigrationService: { listRecent: h.listRecent, has: h.has, get: h.get },
}));
vi.mock('../../db/apply-actuator-data-update.js', () => ({
  computeActuatorDataKey: h.computeKey,
  resolveDefaultDataDir: () => '/d',
}));
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u1', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { adminRoutes } from '../../routes/admin.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.ready();
});
afterAll(async () => app.close());
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-secret-anthropic';
  process.env.GEMINI_API_KEY = 'secret-gemini';
  process.env.DATABASE_URL = 'postgres://user:pw-secret@host/db';
  delete process.env.TECH_TREND_AUTO_DOMAINS;
  h.listRecent.mockReset().mockResolvedValue([{ key: 'actuator-update:aaaaaaaaaaaa', appliedAt: new Date('2026-10-25T00:00:00Z'), summary: { counters: {} } }]);
  h.has.mockReset().mockResolvedValue(true);
  h.computeKey.mockReset().mockReturnValue('actuator-update:aaaaaaaaaaaa');
  h.get.mockReset().mockImplementation(async (key: string) =>
    key === 'pipeline:last' ? { key, appliedAt: new Date(), summary: { status: 'ok' } }
      : key === 'arxiv-backfill:actuator:12m' ? { key, appliedAt: new Date('2026-10-25T01:00:00Z'), summary: { status: 'ok', inserted: 10 } }
      : null);
});

const get = (token?: string) =>
  app.inject({ method: 'GET', url: '/api/admin/ops/status', headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('GET /api/admin/ops/status', () => {
  it('401 without credentials, 401 with a bad token', async () => {
    expect((await get()).statusCode).toBe(401);
    expect((await get('garbage')).statusCode).toBe(401);
  });
  it('403 for a non-admin role', async () => {
    expect((await get('viewer')).statusCode).toBe(403);
  });
  it('200 for admin with all documented sections', async () => {
    const res = await get('admin');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Object.keys(body)).toEqual(['generatedAt', 'config', 'dataMigrations', 'currentDataKey', 'pipeline', 'crawler']);
    expect(body.config).toEqual({
      actuatorAutoApply: 'true', techTrendAutoDomains: ['actuator', 'hand'], pipelineOnStartup: true, pipelineCron: '30 5 * * *', schedulerEnabled: true,
    });
    expect(body.dataMigrations[0]).toMatchObject({ key: 'actuator-update:aaaaaaaaaaaa', appliedAt: '2026-10-25T00:00:00.000Z' });
    expect(h.listRecent).toHaveBeenCalledWith('actuator-update:', 20);
    expect(body.currentDataKey).toEqual({ key: 'actuator-update:aaaaaaaaaaaa', applied: true });
    expect(body.pipeline.last).toEqual({ status: 'ok' });
    expect(body.pipeline.running).toBe(false);
    expect(Object.keys(body.pipeline.live)).toEqual(['actuator', 'hand']);
    expect(body.pipeline.live.actuator).toHaveProperty('analysis');
    expect(body.pipeline.live.actuator).toHaveProperty('classify');
    expect(body.crawler.actuatorBackfill.summary).toMatchObject({ status: 'ok', inserted: 10 });
    expect(body.crawler.statusHint).toContain('/legal/arxiv-topic-backfill/status?domain=actuator');
  });
  it('a failing source only breaks its own section; the response stays 200', async () => {
    h.listRecent.mockRejectedValue(new Error('table missing'));
    h.computeKey.mockImplementation(() => { throw new Error('robots.json missing'); });
    const res = await get('admin');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.dataMigrations).toEqual({ error: 'table missing' });
    expect(body.currentDataKey).toEqual({ error: 'robots.json missing' });
    expect(body.config.actuatorAutoApply).toBe('true');
    expect(body.crawler.actuatorBackfill).not.toBeNull();
  });
  it('contains no secrets', async () => {
    const text = (await get('admin')).body;
    for (const secret of ['sk-secret-anthropic', 'secret-gemini', 'pw-secret', 'DATABASE_URL', 'API_KEY']) {
      expect(text).not.toContain(secret);
    }
  });
});
