/**
 * Q3: 인증이 없던 AI/분석/관리자 라우트에 authMiddleware / adminOnly 가 적용됐는지 확인한다.
 *  - 토큰 없음 -> 401, 로그인했지만 viewer -> 읽기/미리보기만 허용, 쓰기·비용 유발은 403, 관리자 -> 통과
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { fakeAnthropic } from '../fixtures/llm-guard-test-kit.js';

const h = vi.hoisted(() => ({
  analyzeText: vi.fn(async () => ({ companies: [], products: [], articles: [], keywords: [], summary: '' })),
  saveAnalyzedData: vi.fn(async () => ({ saved: true })),
  autoQueryAI: vi.fn(async () => ({ companies: [] })),
  parse: vi.fn(async () => ({ companies: [] })),
  search: vi.fn(async () => ({ summary: '', facts: [], sources: [] })),
  save: vi.fn(async () => ({ isNew: true })),
  confirmLinks: vi.fn(async () => ({ linkedCount: 0 })),
  findCandidates: vi.fn(async () => ({ candidates: {}, unmatched: [] })),
  checkDuplicate: vi.fn(async () => ({ isDuplicate: false })),
  analyzeArticle: vi.fn(async () => ({})),
  submitArticle: vi.fn(async () => ({ success: true })),
  listArticles: vi.fn(async () => ({ items: [] })),
  updateArticle: vi.fn(async () => ({ id: '1' })),
  deleteArticle: vi.fn(async () => undefined),
  listTargets: vi.fn(async () => []),
  triggerAllCrawls: vi.fn(async () => ({ triggered: 0 })),
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u1', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));
vi.mock('../../services/text-analyzer.service.js', () => ({
  textAnalyzerService: { analyzeText: h.analyzeText, saveAnalyzedData: h.saveAnalyzedData },
  autoQueryAI: h.autoQueryAI,
}));
vi.mock('../../services/scoring-pipeline.service.js', () => ({ scoringPipelineService: { runForRobots: vi.fn(async () => {}) } }));
vi.mock('../../services/article-parser.service.js', () => ({ articleParserService: { parse: h.parse } }));
vi.mock('../../services/entity-linker.service.js', () => ({ entityLinkerService: { findCandidates: h.findCandidates, confirmLinks: h.confirmLinks } }));
vi.mock('../../services/article-db-writer.service.js', () => ({ articleDBWriterService: { save: h.save } }));
vi.mock('../../services/validation-rules.service.js', () => ({ validationRulesEngine: { validate: vi.fn(() => ({ isValid: true })) } }));
vi.mock('../../services/pipeline-logger.service.js', () => ({
  pipelineLogger: { startRun: vi.fn(async () => 'run'), startStep: vi.fn(async () => {}), completeStep: vi.fn(async () => {}), failStep: vi.fn(async () => {}) },
}));
vi.mock('../../services/external-ai-agent.service.js', () => ({ externalAIAgent: { search: h.search }, convertToParseResult: () => ({ companies: [], products: [], components: [], applications: [], keywords: [], summary: '', detectedLanguage: 'ko' }) }));
vi.mock('../../services/ocr.service.js', () => ({ extractTextFromBase64: vi.fn(async () => '') }));
vi.mock('../../services/index.js', () => ({
  articleAnalyzerService: {
    checkDuplicate: h.checkDuplicate,
    analyzeArticle: h.analyzeArticle,
    submitArticle: h.submitArticle,
    listArticles: h.listArticles,
    getArticlesByRobot: vi.fn(async () => []),
    getArticlesByCompany: vi.fn(async () => []),
    getArticle: vi.fn(async () => ({ id: '1' })),
    updateArticle: h.updateArticle,
    deleteArticle: h.deleteArticle,
  },
}));
vi.mock('../../services/admin-crawler.service.js', () => ({ adminCrawlerService: { listTargets: h.listTargets, triggerAllCrawls: h.triggerAllCrawls } }));
vi.mock('../../services/ai-usage.service.js', () => ({ aiUsageService: {} }));
vi.mock('../../services/data-generator.service.js', () => ({ dataGeneratorService: {} }));
vi.mock('../../services/scheduler.service.js', () => ({ schedulerService: { isTaskRunning: () => false } }));
vi.mock('../../services/data-migration.service.js', () => ({ dataMigrationService: { listRecent: vi.fn(), has: vi.fn(), get: vi.fn() } }));
vi.mock('../../db/apply-actuator-data-update.js', () => ({ computeActuatorDataKey: vi.fn(), resolveDefaultDataDir: () => '/d' }));
vi.mock('../../services/ci-update.service.js', () => ({ ciUpdateService: { approveStagedUpdate: vi.fn(async () => {}), dismissStagedUpdate: vi.fn(async () => {}), getPendingStagedUpdates: vi.fn(async () => []) } }));
vi.mock('../../services/benchmark.service.js', () => ({ benchmarkService: {} }));
vi.mock('../../services/hand-benchmark.service.js', () => ({ handBenchmarkService: {} }));
vi.mock('../../db/seed-ci.js', () => ({ forceReseedCiData: vi.fn() }));

import { analyzeRoutes } from '../../routes/analyze.js';
import { analysisRoutes } from '../../routes/analysis.js';
import { articleAnalyzerRoutes } from '../../routes/article-analyzer.js';
import { adminRoutes } from '../../routes/admin.js';
import { eventRoutes, resetEventCache } from '../../routes/events.js';
import { ciUpdateRoutes } from '../../routes/ci-update.js';

let app: FastifyInstance;
const events = fakeAnthropic('[]');

beforeAll(async () => {
  app = Fastify();
  await app.register(analyzeRoutes, { prefix: '/api/analyze' });
  await app.register(analysisRoutes, { prefix: '/api/analysis' });
  await app.register(articleAnalyzerRoutes, { prefix: '/api/article-analyzer' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(eventRoutes, { prefix: '/api/events', client: events.client });
  await app.register(ciUpdateRoutes, { prefix: '/api/ci-update' });
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

const call = (method: string, url: string, token?: string, payload?: unknown) =>
  app.inject({ method: method as any, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: payload as any });

type Row = { method: string; url: string; guard: 'login' | 'admin'; body?: unknown; /** 통과 시 실제 부작용(마이그레이션 실행 등)이 있는 라우트는 관리자 통과 검증을 건너뛴다 */ skipPass?: boolean };

const ROUTES: Row[] = [
  // /api/analyze/* — 모두 관리자 (LLM 비용 + DB 저장, UI 호출처 없음)
  { method: 'POST', url: '/api/analyze/preview', guard: 'admin', body: { text: 'long enough text here' } },
  { method: 'POST', url: '/api/analyze/save', guard: 'admin', body: { text: 'long enough text here' } },
  { method: 'POST', url: '/api/analyze/save-analyzed', guard: 'admin', body: { companies: [], products: [], articles: [], keywords: [], summary: '' } },
  { method: 'POST', url: '/api/analyze/auto-query', guard: 'admin', body: { topic: 'robots', customPrompt: 'x' } },
  // /api/analysis/*
  { method: 'POST', url: '/api/analysis/parse', guard: 'login', body: { text: 'long enough text for parsing here' } },
  { method: 'POST', url: '/api/analysis/link', guard: 'login', body: { entities: [{ name: 'a', type: 'company', confidence: 1, context: '' }] } },
  { method: 'POST', url: '/api/analysis/link/confirm', guard: 'admin', body: {} },
  { method: 'POST', url: '/api/analysis/validate', guard: 'login', body: { entityType: 'company', data: {} } },
  { method: 'POST', url: '/api/analysis/save', guard: 'admin', body: {} },
  { method: 'POST', url: '/api/analysis/ai-search', guard: 'admin', body: { query: 'humanoid' } },
  // /api/article-analyzer/*
  { method: 'POST', url: '/api/article-analyzer/analyze', guard: 'login', body: { content: 'article body' } },
  { method: 'POST', url: '/api/article-analyzer/submit', guard: 'admin', body: {} },
  { method: 'GET', url: '/api/article-analyzer/', guard: 'login' },
  { method: 'GET', url: '/api/article-analyzer/robot/r1', guard: 'login' },
  { method: 'GET', url: '/api/article-analyzer/company/c1', guard: 'login' },
  { method: 'GET', url: '/api/article-analyzer/a1', guard: 'login' },
  { method: 'PUT', url: '/api/article-analyzer/a1', guard: 'admin', body: {} },
  { method: 'DELETE', url: '/api/article-analyzer/a1', guard: 'admin' },
  // /api/events/refresh
  { method: 'POST', url: '/api/events/refresh', guard: 'admin' },
  // /api/admin/* (대표)
  { method: 'GET', url: '/api/admin/crawl-targets', guard: 'login' },
  { method: 'POST', url: '/api/admin/crawl-all', guard: 'admin' },
  { method: 'POST', url: '/api/admin/crawl-targets', guard: 'admin', body: {} },
  { method: 'DELETE', url: '/api/admin/crawl-targets/t1', guard: 'admin' },
  { method: 'POST', url: '/api/admin/migrate', guard: 'admin', skipPass: true },
  { method: 'POST', url: '/api/admin/data-generator/generate', guard: 'admin', body: { query: 'x' } },
  { method: 'POST', url: '/api/admin/data-generator/cleanup-fabricated-robots', guard: 'admin' },
  { method: 'POST', url: '/api/admin/ai-analysis/analyze-all', guard: 'admin' },
  { method: 'POST', url: '/api/admin/ai-analysis/analyze/a1', guard: 'admin' },
  { method: 'POST', url: '/api/admin/ai-analysis/articles/a1', guard: 'admin', body: { summary: 's', category: 'other' } },
  // AI 후보 승인 (spec_enrichment 적용 경로)
  { method: 'POST', url: '/api/ci-update/staging/s1/approve', guard: 'admin', body: {} },
  { method: 'POST', url: '/api/ci-update/staging/s1/dismiss', guard: 'admin', body: {} },
];

describe.each(ROUTES)('$method $url ($guard)', (row) => {
  it('401 without a token and 401 with an invalid token', async () => {
    expect((await call(row.method, row.url, undefined, row.body)).statusCode).toBe(401);
    expect((await call(row.method, row.url, 'garbage', row.body)).statusCode).toBe(401);
  });

  it(row.guard === 'admin' ? '403 for a logged-in non-admin' : 'allows any logged-in user', async () => {
    const res = await call(row.method, row.url, 'viewer', row.body);
    if (row.guard === 'admin') expect(res.statusCode).toBe(403);
    else expect([401, 403]).not.toContain(res.statusCode);
  });

  it.skipIf(row.skipPass === true)('admin passes the guard', async () => {
    resetEventCache();
    const res = await call(row.method, row.url, 'admin', row.body);
    expect([401, 403]).not.toContain(res.statusCode);
  });
});

describe('unprotected-by-design routes stay open', () => {
  it('GET /api/events/cached has no guard (cached read only, no LLM call)', async () => {
    const res = await call('GET', '/api/events/cached');
    expect(res.statusCode).toBe(200);
  });
});
