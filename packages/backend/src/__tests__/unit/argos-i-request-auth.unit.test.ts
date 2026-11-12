/**
 * 요청 API 인증 — 503(미설정·32자 미만·비활성·pull 토큰과 동일), 401, 429(분리된 카운터), pull 토큰으로 요청 API 불가와 그 반대, _NEXT 토큰
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({ listBundles: vi.fn() }));

vi.mock('../../services/argos-i-export.service.js', () => ({
  listBundles: h.listBundles,
  getBundleMeta: vi.fn(),
  getBundleFile: vi.fn(),
  getBundleFiles: vi.fn(),
  startArgosIExportGeneration: vi.fn(),
  getArgosIExportRunStatus: vi.fn(),
  toBundleSummary: (x: unknown) => x,
}));
vi.mock('../../services/argos-i-requests-runtime.js', () => ({
  allowedHosts: async () => ['youtube.com', 'youtu.be', 'arxiv.org'],
  runInlineQuery: vi.fn(),
}));
vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/auth.service.js', () => ({
  authService: { verifyToken: () => null, hasRole: () => false, hasPermission: () => false, logAction: async () => {} },
}));

import { argosIRoutes } from '../../routes/argos-i.js';
import { argosIRequestsRoutes } from '../../routes/argos-i-requests.js';
import {
  REQUEST_AUTH_FAIL_LIMIT,
  __resetArgosIRequestAuthStateForTests,
  checkArgosIRequestToken,
} from '../../routes/argos-i-request-auth.js';
import { __resetArgosIAuthStateForTests } from '../../routes/argos-i-export-auth.js';
import { __setServiceDepsForTests } from '../../services/argos-i-requests.service.js';
import { createMemoryStore } from '../fixtures/argos-i-requests-memory-store.js';

const REQ = 'req-token-0123456789abcdef0123456789abcdef';
const REQ_NEXT = 'req-next-0123456789abcdef0123456789abcdef';
const PULL = 'pull-token-0123456789abcdef0123456789abcdef';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_r, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
  await app.register(argosIRoutes, { prefix: '/api/argos-i' });
  await app.register(argosIRequestsRoutes, { prefix: '/api/argos-i/requests' });
  await app.ready();
});
afterAll(async () => app.close());

const saved = { ...process.env };
beforeEach(() => {
  __resetArgosIRequestAuthStateForTests();
  __resetArgosIAuthStateForTests();
  __setServiceDepsForTests({ store: createMemoryStore() });
  process.env.ARGOS_I_REQUESTS_ENABLED = 'true';
  process.env.ARGOS_I_REQUEST_TOKEN = REQ;
  delete process.env.ARGOS_I_REQUEST_TOKEN_NEXT;
  process.env.ARGOS_I_EXPORT_TOKEN = PULL;
  delete process.env.ARGOS_I_EXPORT_TOKEN_NEXT;
  h.listBundles.mockReset().mockResolvedValue([]);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const get = (url: string, token?: string) => app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('checkArgosIRequestToken (pure)', () => {
  const env = { ARGOS_I_REQUESTS_ENABLED: 'true', ARGOS_I_REQUEST_TOKEN: REQ, ARGOS_I_REQUEST_TOKEN_NEXT: REQ_NEXT };
  it('ok for current and NEXT, unauthorized otherwise', () => {
    expect(checkArgosIRequestToken({ authorization: `Bearer ${REQ}` }, env)).toBe('ok');
    expect(checkArgosIRequestToken({ authorization: `Bearer ${REQ_NEXT}` }, env)).toBe('ok');
    expect(checkArgosIRequestToken({ authorization: 'Bearer nope' }, env)).toBe('unauthorized');
    expect(checkArgosIRequestToken({}, env)).toBe('unauthorized');
    expect(checkArgosIRequestToken({ authorization: REQ }, env)).toBe('unauthorized');
    expect(checkArgosIRequestToken({ 'x-ingest-key': REQ }, env)).toBe('unauthorized');
  });
  it('disabled when not enabled, token unset, shorter than 32 chars, or equal to the pull token', () => {
    expect(checkArgosIRequestToken({ authorization: `Bearer ${REQ}` }, { ...env, ARGOS_I_REQUESTS_ENABLED: 'false' })).toBe('disabled');
    expect(checkArgosIRequestToken({ authorization: `Bearer ${REQ}` }, { ...env, DISABLE_ARGOS_I_REQUESTS: 'true' })).toBe('disabled');
    expect(checkArgosIRequestToken({}, { ARGOS_I_REQUESTS_ENABLED: 'true' })).toBe('disabled');
    expect(checkArgosIRequestToken({ authorization: 'Bearer short' }, { ARGOS_I_REQUESTS_ENABLED: 'true', ARGOS_I_REQUEST_TOKEN: 'short' })).toBe('disabled');
    expect(checkArgosIRequestToken({ authorization: `Bearer ${REQ}` }, { ...env, ARGOS_I_EXPORT_TOKEN: REQ })).toBe('disabled');
  });
});

describe('request API authentication (AC-01, AC-02)', () => {
  it.each([
    ['unset token', () => delete process.env.ARGOS_I_REQUEST_TOKEN],
    ['token shorter than 32', () => (process.env.ARGOS_I_REQUEST_TOKEN = 'a'.repeat(31))],
    ['flag not true', () => (process.env.ARGOS_I_REQUESTS_ENABLED = 'false')],
  ])('503 argos_i_requests_disabled: %s', async (_n, mutate) => {
    mutate();
    for (const url of ['/api/argos-i/requests', '/api/argos-i/requests/00000000-0000-4000-8000-000000000001']) {
      const res = await get(url, REQ);
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ error: 'argos_i_requests_disabled' });
    }
    expect((await app.inject({ method: 'POST', url: '/api/argos-i/requests', headers: { authorization: `Bearer ${REQ}`, 'content-type': 'application/json' }, payload: '{}' })).statusCode).toBe(503);
  });

  it('401 + WWW-Authenticate for a missing/wrong token, before the body is parsed or any id is looked up', async () => {
    for (const token of [undefined, 'wrong']) {
      const res = await get('/api/argos-i/requests/00000000-0000-4000-8000-000000000001', token);
      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
      expect(res.json()).toEqual({ error: 'Unauthorized' });
    }
    // 잘못된 JSON 본문이어도 비인증이면 401 (파싱 오류 400 이 아니다)
    const bad = await app.inject({ method: 'POST', url: '/api/argos-i/requests', headers: { 'content-type': 'application/json' }, payload: '{not json' });
    expect(bad.statusCode).toBe(401);
  });

  it('pull token does not work on the request API, and the request token does not work on the pull API', async () => {
    expect((await get('/api/argos-i/requests', PULL)).statusCode).toBe(401);
    expect((await get('/api/argos-i/manifest', REQ)).statusCode).toBe(401);
    // 각자의 토큰은 통과
    expect((await get('/api/argos-i/requests', REQ)).statusCode).toBe(200);
    expect((await get('/api/argos-i/manifest', PULL)).statusCode).toBe(200);
  });

  it('_NEXT token is accepted for rotation', async () => {
    process.env.ARGOS_I_REQUEST_TOKEN_NEXT = REQ_NEXT;
    expect((await get('/api/argos-i/requests', REQ_NEXT)).statusCode).toBe(200);
    expect((await get('/api/argos-i/requests', REQ)).statusCode).toBe(200);
  });

  it('429 + Retry-After after more than 30 failures/min; a valid token still passes; counter is separate from the pull API', async () => {
    for (let i = 0; i < REQUEST_AUTH_FAIL_LIMIT; i++) expect((await get('/api/argos-i/requests', 'wrong')).statusCode).toBe(401);
    const limited = await get('/api/argos-i/requests', 'wrong');
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect((await get('/api/argos-i/requests', REQ)).statusCode).toBe(200);
    // pull API 의 실패 카운터는 영향받지 않는다
    expect((await get('/api/argos-i/manifest', 'wrong')).statusCode).toBe(401);
  });

  it('responses carry Cache-Control: no-store and nosniff, and never contain the token', async () => {
    const ok = await get('/api/argos-i/requests', REQ);
    const unauth = await get('/api/argos-i/requests', 'wrong');
    for (const r of [ok, unauth]) {
      expect(r.headers['cache-control']).toBe('no-store');
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect(r.body).not.toContain(REQ);
    }
  });
});
