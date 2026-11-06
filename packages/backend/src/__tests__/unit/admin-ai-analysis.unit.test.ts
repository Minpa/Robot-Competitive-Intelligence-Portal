/**
 * D1: POST /api/admin/ai-analysis/analyze-all, /analyze/:id
 *
 * 수정 전 동작은 먼저 테스트로 재현했다: analyze-all 이 스텁 분석 결과(summary='' category='other' productType='none')로
 * 미분석 기사 레코드마다 updateArticleAnalysis 를 호출해 기사의 category/productType 을 덮어썼다(200 응답).
 * 수정 후 동작(410 비활성 + 쓰기 없음 + 관리자 전용)을 검증한다.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({
  getUnanalyzedArticles: vi.fn(),
  updateArticleAnalysis: vi.fn(),
  analyzeArticle: vi.fn(),
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/admin-crawler.service.js', () => ({
  adminCrawlerService: { getUnanalyzedArticles: h.getUnanalyzedArticles, updateArticleAnalysis: h.updateArticleAnalysis },
}));
vi.mock('../../services/ai-analyzer.service.js', () => ({ analyzeArticle: h.analyzeArticle }));
vi.mock('../../services/ai-usage.service.js', () => ({ aiUsageService: {} }));
vi.mock('../../services/data-generator.service.js', () => ({ dataGeneratorService: {} }));
vi.mock('../../services/scheduler.service.js', () => ({ schedulerService: { isTaskRunning: () => false } }));
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { listRecent: vi.fn(), has: vi.fn(), get: vi.fn() } }));
vi.mock('../../db/apply-actuator-data-update.js', () => ({ computeActuatorDataKey: vi.fn(), resolveDefaultDataDir: () => '/d' }));
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
const admin = { authorization: 'Bearer admin' };

beforeAll(async () => {
  app = Fastify();
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.ready();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  h.getUnanalyzedArticles.mockResolvedValue([{ id: 'a1', title: 'Real article', content: 'body' }]);
  h.analyzeArticle.mockResolvedValue({ summary: '', category: 'other', productType: 'none' });
});

describe('D1 after the fix: analyze endpoints are disabled', () => {
  it('analyze-all returns 410 and never writes', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/ai-analysis/analyze-all', headers: admin });
    expect(res.statusCode).toBe(410);
    expect(h.updateArticleAnalysis).not.toHaveBeenCalled();
    expect(h.analyzeArticle).not.toHaveBeenCalled();
  });

  it('analyze/:id returns 410 and never writes', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/ai-analysis/analyze/a1', headers: admin });
    expect(res.statusCode).toBe(410);
    expect(h.updateArticleAnalysis).not.toHaveBeenCalled();
  });

  it('requires an admin token (401 without a token, 403 for a viewer)', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/admin/ai-analysis/analyze-all' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/admin/ai-analysis/analyze-all', headers: { authorization: 'Bearer viewer' } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/ai-analysis/analyze/a1', headers: { authorization: 'Bearer viewer' } })).statusCode).toBe(403);
  });
});
