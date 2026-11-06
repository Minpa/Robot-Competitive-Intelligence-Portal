/**
 * /api/admin/data-coverage — 인증/권한(401/403), compareTo 검증(400), 새로고침 스로틀(429), 본문 검증, no-store, 비밀 패턴 부재
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({ getCoverage: vi.fn(), refresh: vi.fn() }));

vi.mock('../../services/data-coverage.service.js', () => ({
  getDataCoverageService: () => ({ getCoverage: h.getCoverage, refresh: h.refresh }),
}));
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) =>
      t === 'admin' ? { userId: 'u1', role: 'admin', permissions: [] }
        : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] }
        : t === 'analyst' ? { userId: 'u3', role: 'analyst', permissions: [] }
        : null,
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { dataCoverageAdminRoutes } from '../../routes/data-coverage.js';
import { coverageOkSample } from '../fixtures/data-coverage.fixture.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });
  await app.register(dataCoverageAdminRoutes, { prefix: '/api/admin/data-coverage' });
  await app.ready();
});
afterAll(async () => app.close());

beforeEach(() => {
  h.getCoverage.mockReset().mockResolvedValue(coverageOkSample);
  h.refresh.mockReset().mockResolvedValue({ ok: true, response: coverageOkSample });
});

const auth = (t?: string) => (t ? { authorization: `Bearer ${t}` } : {});
const get = (url: string, t?: string) => app.inject({ method: 'GET', url, headers: auth(t) });
const post = (body: unknown, t?: string, contentType = true) =>
  app.inject({
    method: 'POST',
    url: '/api/admin/data-coverage/refresh',
    headers: { ...auth(t), ...(contentType ? { 'content-type': 'application/json' } : {}) },
    payload: body === undefined ? undefined : JSON.stringify(body),
  });

describe('authentication (AC-01)', () => {
  it('GET: 401 without a token / with a bad token, 403 for viewer and analyst, 200 for admin', async () => {
    const u = '/api/admin/data-coverage';
    expect((await get(u)).statusCode).toBe(401);
    expect((await get(u, 'garbage')).statusCode).toBe(401);
    expect((await get(u, 'viewer')).statusCode).toBe(403);
    expect((await get(u, 'analyst')).statusCode).toBe(403);
    expect(h.getCoverage).not.toHaveBeenCalled();
    expect((await get(u, 'admin')).statusCode).toBe(200);
  });

  it('POST /refresh: 401 / 403 / 200', async () => {
    expect((await post({})).statusCode).toBe(401);
    expect((await post({}, 'garbage')).statusCode).toBe(401);
    expect((await post({}, 'viewer')).statusCode).toBe(403);
    expect((await post({}, 'analyst')).statusCode).toBe(403);
    expect(h.refresh).not.toHaveBeenCalled();
    expect((await post({}, 'admin')).statusCode).toBe(200);
  });
});

describe('GET /', () => {
  it('returns the service response with Cache-Control: no-store', async () => {
    const res = await get('/api/admin/data-coverage', 'admin');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json().sections).toHaveLength(7);
    expect(h.getCoverage).toHaveBeenCalledWith(null);
  });

  it('passes a valid compareTo through', async () => {
    await get('/api/admin/data-coverage?compareTo=2026-11-05', 'admin');
    expect(h.getCoverage).toHaveBeenCalledWith('2026-11-05');
  });

  it.each(['2026-13-01', '2026-02-30', '20261105', 'yesterday', '', '2026-11-5', '2999-01-01'])('compareTo=%s -> 400 invalid_compare_to', async (v) => {
    const res = await get(`/api/admin/data-coverage?compareTo=${encodeURIComponent(v)}`, 'admin');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_compare_to' });
    expect(h.getCoverage).not.toHaveBeenCalled();
  });

  it('an unexpected service error is a generic 500 without details', async () => {
    h.getCoverage.mockRejectedValue(new Error('postgres://u:pw@h/db exploded'));
    const res = await get('/api/admin/data-coverage', 'admin');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });
});

describe('POST /refresh', () => {
  it('429 refresh_throttled with retryAfterSec when throttled', async () => {
    h.refresh.mockResolvedValue({ ok: false, retryAfterSec: 17 });
    const res = await post({}, 'admin');
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'refresh_throttled', retryAfterSec: 17 });
    expect(res.headers['retry-after']).toBe('17');
  });

  it('accepts an empty body or {}; any other body is 400 invalid_body', async () => {
    expect((await post(undefined, 'admin', false)).statusCode).toBe(200);
    expect((await post(undefined, 'admin')).statusCode).toBe(200);
    expect((await post({}, 'admin')).statusCode).toBe(200);
    for (const body of [{ force: true }, [], 'x', 5]) {
      const res = await post(body, 'admin');
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.json()).toEqual({ error: 'invalid_body' });
    }
    expect(h.refresh).toHaveBeenCalledTimes(3);
  });

  it('responds with no-store', async () => {
    expect((await post({}, 'admin')).headers['cache-control']).toBe('no-store');
  });
});

describe('secret hygiene (AC-18)', () => {
  it('the response carries no secret-looking patterns', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-secret-value-123456';
    process.env.DATABASE_URL = 'postgres://user:pw@host/db';
    const res = await get('/api/admin/data-coverage', 'admin');
    const body = res.body;
    for (const p of ['sk-', 'AIza', 'apiKeyPrefix', 'postgres://', 'DATABASE_URL', 'Bearer ', 'stack', 'secret-value']) expect(body, p).not.toContain(p);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DATABASE_URL;
  });
});

describe('only one POST endpoint exists (AC-28)', () => {
  it('lists /refresh as the only POST route', () => {
    const printed = app.printRoutes({ commonPrefix: false });
    expect(printed).toContain('refresh');
    expect(app.hasRoute({ method: 'POST', url: '/api/admin/data-coverage/refresh' })).toBe(true);
    expect(app.hasRoute({ method: 'POST', url: '/api/admin/data-coverage' })).toBe(false);
    expect(app.hasRoute({ method: 'POST', url: '/api/admin/data-coverage/backfill' })).toBe(false);
  });
});
