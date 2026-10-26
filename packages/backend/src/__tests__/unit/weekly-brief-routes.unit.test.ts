/**
 * /api/weekly-brief/* (로그인) 과 /api/admin/weekly-brief/* (admin) — 인증/권한/상태 코드/라우팅 우선순위
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({
  getLatestBrief: vi.fn(),
  getBriefByWeek: vi.fn(),
  listBriefs: vi.fn(),
  startWeeklyBriefGeneration: vi.fn(),
  getWeeklyBriefRunStatus: vi.fn(),
}));

vi.mock('../../services/weekly-brief.service.js', () => ({
  getLatestBrief: h.getLatestBrief,
  getBriefByWeek: h.getBriefByWeek,
  listBriefs: h.listBriefs,
  startWeeklyBriefGeneration: h.startWeeklyBriefGeneration,
  getWeeklyBriefRunStatus: h.getWeeklyBriefRunStatus,
}));
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u1', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { weeklyBriefAdminRoutes, weeklyBriefRoutes } from '../../routes/weekly-brief.js';
import { weeklyBriefSample } from '../fixtures/weekly-brief.fixture.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  // 실제 서버(index.ts)와 같은 파서: 빈 본문 허용
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });
  await app.register(weeklyBriefRoutes, { prefix: '/api/weekly-brief' });
  await app.register(weeklyBriefAdminRoutes, { prefix: '/api/admin/weekly-brief' });
  await app.ready();
});
afterAll(async () => app.close());

beforeEach(() => {
  h.getLatestBrief.mockReset().mockResolvedValue(weeklyBriefSample);
  h.getBriefByWeek.mockReset().mockResolvedValue(weeklyBriefSample);
  h.listBriefs.mockReset().mockResolvedValue([]);
  h.startWeeklyBriefGeneration.mockReset().mockResolvedValue({ started: true, weekStart: '2026-10-19', force: false, startedAt: '2026-10-26T00:00:00.000Z' });
  h.getWeeklyBriefRunStatus.mockReset().mockResolvedValue({ running: false });
});

const auth = (token?: string) => (token ? { authorization: `Bearer ${token}` } : {});
const get = (url: string, token?: string) => app.inject({ method: 'GET', url, headers: auth(token) });
const post = (body: unknown, token?: string) =>
  app.inject({ method: 'POST', url: '/api/admin/weekly-brief/generate', headers: { ...auth(token), 'content-type': 'application/json' }, payload: body === undefined ? undefined : JSON.stringify(body) });

describe('authentication', () => {
  it.each(['/api/weekly-brief/latest', '/api/weekly-brief/2026-10-19', '/api/weekly-brief', '/api/admin/weekly-brief/status'])('%s -> 401 without a token and with a bad token', async (url) => {
    expect((await get(url)).statusCode).toBe(401);
    expect((await get(url, 'garbage')).statusCode).toBe(401);
  });

  it('POST /generate -> 401 without a token', async () => {
    expect((await post({})).statusCode).toBe(401);
    expect(h.startWeeklyBriefGeneration).not.toHaveBeenCalled();
  });

  it('any logged-in role can read; only admin can use the admin endpoints (403 otherwise)', async () => {
    expect((await get('/api/weekly-brief/latest', 'viewer')).statusCode).toBe(200);
    expect((await get('/api/weekly-brief/2026-10-19', 'viewer')).statusCode).toBe(200);
    expect((await get('/api/weekly-brief?limit=26', 'viewer')).statusCode).toBe(200);
    expect((await get('/api/admin/weekly-brief/status', 'viewer')).statusCode).toBe(403);
    expect((await post({}, 'viewer')).statusCode).toBe(403);
    expect(h.startWeeklyBriefGeneration).not.toHaveBeenCalled();
    expect((await get('/api/admin/weekly-brief/status', 'admin')).statusCode).toBe(200);
  });
});

describe('GET /latest and /:weekStart', () => {
  it('/latest is routed to getLatestBrief, not to /:weekStart', async () => {
    const res = await get('/api/weekly-brief/latest', 'viewer');
    expect(res.statusCode).toBe(200);
    expect(res.json().weekStart).toBe('2026-10-19');
    expect(h.getLatestBrief).toHaveBeenCalledTimes(1);
    expect(h.getBriefByWeek).not.toHaveBeenCalled();
  });

  it('/latest -> 404 not_found when nothing is published', async () => {
    h.getLatestBrief.mockResolvedValue(null);
    const res = await get('/api/weekly-brief/latest', 'viewer');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it.each(['2026-10-20', '2026-10-18', '2026-02-30', '20261019', 'abc', '2026-1-19', '2026-10-19x'])('invalid or non-Monday weekStart %s -> 400 invalid_week_start', async (w) => {
    const res = await get(`/api/weekly-brief/${w}`, 'viewer');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_week_start' });
    expect(h.getBriefByWeek).not.toHaveBeenCalled();
  });

  it('a valid Monday returns the brief, or 404 (missing or failed rows are null from the service)', async () => {
    const ok = await get('/api/weekly-brief/2026-10-19', 'viewer');
    expect(ok.statusCode).toBe(200);
    expect(h.getBriefByWeek).toHaveBeenCalledWith('2026-10-19');
    h.getBriefByWeek.mockResolvedValue(null);
    const missing = await get('/api/weekly-brief/2026-10-12', 'viewer');
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'not_found' });
  });

  it('the response exposes only contract fields (no tokens, cost, error, stats)', async () => {
    const body = (await get('/api/weekly-brief/latest', 'viewer')).json();
    expect(Object.keys(body).sort()).toEqual(['generatedAt', 'model', 'nextWeekStart', 'payload', 'prevWeekStart', 'status', 'weekStart']);
    const text = JSON.stringify(body);
    for (const k of ['inputTokens', 'outputTokens', 'costUsd', 'cost_usd', 'stats']) expect(text).not.toContain(`"${k}"`);
  });
});

describe('GET /?limit', () => {
  it.each([
    [undefined, 26],
    ['26', 26],
    ['5', 5],
    ['0', 1],
    ['-3', 1],
    ['100', 52],
    ['52', 52],
    ['abc', 26],
    ['7.9', 7],
  ])('limit=%s -> %i', async (raw, expected) => {
    const res = await get(`/api/weekly-brief${raw === undefined ? '' : `?limit=${raw}`}`, 'viewer');
    expect(res.statusCode).toBe(200);
    expect(h.listBriefs).toHaveBeenCalledWith(expected);
    expect(res.json()).toEqual({ items: [] });
  });
});

describe('POST /generate', () => {
  it('202 with the started payload', async () => {
    const res = await post({ weekStart: '2026-10-19', force: true }, 'admin');
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ started: true, weekStart: '2026-10-19', force: false, startedAt: '2026-10-26T00:00:00.000Z' });
    expect(h.startWeeklyBriefGeneration).toHaveBeenCalledWith({ weekStart: '2026-10-19', force: true });
  });

  it('an empty body means the default week without force', async () => {
    const res = await post(undefined, 'admin');
    expect(res.statusCode).toBe(202);
    expect(h.startWeeklyBriefGeneration).toHaveBeenCalledWith({ weekStart: undefined, force: undefined });
  });

  it('200 skipped exists', async () => {
    h.startWeeklyBriefGeneration.mockResolvedValue({ started: false, skipped: 'exists', weekStart: '2026-10-19' });
    const res = await post({}, 'admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ started: false, skipped: 'exists', weekStart: '2026-10-19' });
  });

  it('409 already_running', async () => {
    h.startWeeklyBriefGeneration.mockResolvedValue({ started: false, skipped: 'already_running', weekStart: '2026-10-19' });
    const res = await post({}, 'admin');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'already_running' });
  });

  it('400 for a non-Monday / malformed weekStart without calling the service', async () => {
    for (const weekStart of ['2026-10-20', 'abc', '2026-02-30']) {
      const res = await post({ weekStart }, 'admin');
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'invalid_week_start' });
    }
    expect((await post({ weekStart: 123 }, 'admin')).json()).toEqual({ error: 'invalid_week_start' });
    expect(h.startWeeklyBriefGeneration).not.toHaveBeenCalled();
  });

  it('400 week_not_complete for the current / future week (decided by the service)', async () => {
    h.startWeeklyBriefGeneration.mockResolvedValue({ started: false, skipped: 'invalid', error: 'week_not_complete', weekStart: '2026-10-26' });
    const res = await post({ weekStart: '2026-10-26' }, 'admin');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'week_not_complete' });
  });

  it('400 invalid_body for a non-boolean force or unknown keys', async () => {
    expect((await post({ force: 'yes' }, 'admin')).json()).toEqual({ error: 'invalid_body' });
    expect((await post({ force: true, extra: 1 }, 'admin')).statusCode).toBe(400);
    expect(h.startWeeklyBriefGeneration).not.toHaveBeenCalled();
  });
});

describe('GET /status', () => {
  it('returns the service status for admins', async () => {
    h.getWeeklyBriefRunStatus.mockResolvedValue({ running: true, phase: 'collecting' });
    const res = await get('/api/admin/weekly-brief/status', 'admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ running: true, phase: 'collecting' });
  });
});
