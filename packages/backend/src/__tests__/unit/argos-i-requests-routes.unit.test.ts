/**
 * 요청 라우트 — 생성·조회·목록·취소, 멱등(재생 200 / 충돌 409 / 24시간 만료), 레이트·대기열 상한, 413, unsupported_type,
 * note 미포함 응답, 관리자 라우트 adminOnly(비관리자 401·403), query 인라인 처리
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({ runInlineQuery: vi.fn() }));

vi.mock('../../services/argos-i-export.service.js', () => ({
  listBundles: vi.fn(),
  getBundleMeta: vi.fn(),
  getBundleFile: vi.fn(),
  getBundleFiles: vi.fn(),
  startArgosIExportGeneration: vi.fn(),
  getArgosIExportRunStatus: vi.fn(),
  toBundleSummary: (x: unknown) => x,
}));
vi.mock('../../services/argos-i-requests-runtime.js', () => ({
  allowedHosts: async () => ['youtube.com', 'youtu.be', 'arxiv.org', 'therobotreport.com'],
  runInlineQuery: h.runInlineQuery,
}));
vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u-admin', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] } : t === 'analyst' ? { userId: 'u3', role: 'analyst', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { argosIAdminRoutes } from '../../routes/argos-i.js';
import { argosIRequestsRoutes } from '../../routes/argos-i-requests.js';
import { __resetArgosIRequestAuthStateForTests } from '../../routes/argos-i-request-auth.js';
import { __setServiceDepsForTests } from '../../services/argos-i-requests.service.js';
import { createMemoryStore, type MemoryStore } from '../fixtures/argos-i-requests-memory-store.js';

const REQ = 'req-token-0123456789abcdef0123456789abcdef';
const auth = { authorization: `Bearer ${REQ}`, 'content-type': 'application/json' };
const ROBOT = { type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, sourcePublic: true };
const ARXIV = { type: 'add_source', params: { kind: 'arxiv', id: '2401.01234' }, sourcePublic: true };
const QUERY = { type: 'query', params: { query: 'hand_benchmark_top', limit: 5 }, sourcePublic: true };
const TOPIC = { type: 'analyze', params: { target: 'topic', domain: 'hand', days: 30 }, sourcePublic: true };
const CHANNEL = { type: 'add_source', params: { kind: 'youtube_channel', id: '@robotics_lab' }, sourcePublic: true };

let app: FastifyInstance;
let store: MemoryStore;

beforeAll(async () => {
  app = Fastify();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_r, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
  await app.register(argosIRequestsRoutes, { prefix: '/api/argos-i/requests' });
  await app.register(argosIAdminRoutes, { prefix: '/api/admin/argos-i' });
  await app.ready();
});
afterAll(async () => app.close());

const saved = { ...process.env };
beforeEach(() => {
  __resetArgosIRequestAuthStateForTests();
  store = createMemoryStore();
  __setServiceDepsForTests({ store, now: () => store.clock.now, env: process.env, log: () => undefined });
  process.env.ARGOS_I_REQUESTS_ENABLED = 'true';
  process.env.ARGOS_I_REQUEST_TOKEN = REQ;
  delete process.env.ARGOS_I_REQUEST_TOKEN_NEXT;
  delete process.env.ARGOS_I_REQUESTS_REQUIRE_APPROVAL;
  h.runInlineQuery.mockReset().mockImplementation(async (row: any) => ({ ...row, status: 'done', result: { area: 'hand_benchmark_top', recordCount: 1 } }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/api/argos-i/requests', headers: { ...auth, ...headers }, payload: typeof body === 'string' ? body : JSON.stringify(body) });
const get = (url: string) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${REQ}` } });

describe('POST /api/argos-i/requests', () => {
  it('201 {id,status:queued} for a normal analyze/add_source request (AC-03)', async () => {
    const a = await post(ROBOT);
    expect(a.statusCode).toBe(201);
    expect(a.json()).toEqual({ id: expect.any(String), status: 'queued' });
    const b = await post(ARXIV);
    expect(b.json().status).toBe('queued');
    expect(store.rows.size).toBe(2);
  });

  it('approval-required kinds (topic, youtube_channel) are stored as needs_approval with the type_rule reason', async () => {
    for (const body of [TOPIC, CHANNEL]) {
      const res = await post(body);
      expect(res.statusCode).toBe(201);
      expect(res.json().status).toBe('needs_approval');
    }
    const rows = [...store.rows.values()];
    expect(rows.every((r) => r.approvalRequired && r.approvalReason === 'type_rule')).toBe(true);
  });

  it('ARGOS_I_REQUESTS_REQUIRE_APPROVAL is configurable (type or type:subkey)', async () => {
    process.env.ARGOS_I_REQUESTS_REQUIRE_APPROVAL = 'add_source';
    __setServiceDepsForTests({ store, now: () => store.clock.now, env: process.env, log: () => undefined });
    expect((await post(ARXIV)).json().status).toBe('needs_approval');
    expect((await post(TOPIC)).json().status).toBe('queued');
  });

  it('query is processed inline: 201 with status done and the result; falls back to queued when it does not finish', async () => {
    const done = await post(QUERY);
    expect(done.statusCode).toBe(201);
    expect(done.json()).toEqual({ id: expect.any(String), status: 'done', result: { area: 'hand_benchmark_top', recordCount: 1 } });
    h.runInlineQuery.mockImplementationOnce(async (row: any) => ({ ...row, status: 'queued' }));
    const queued = await post({ ...QUERY, params: { query: 'hand_benchmark_top', limit: 6 } });
    expect(queued.json()).toEqual({ id: expect.any(String), status: 'queued' });
    h.runInlineQuery.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    expect((await post({ ...QUERY, params: { query: 'hand_benchmark_top', limit: 7 } })).json().status).toBe('queued');
  });

  it('400 unsupported_type for v2 reserved types and no row is created (AC-04)', async () => {
    for (const type of ['regenerate_brief', 'watch_register']) {
      const res = await post({ type, params: {}, sourcePublic: true });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'unsupported_type' });
    }
    expect(store.insertCalls).toBe(0);
  });

  it('400 invalid_request (codes only) for shape errors and a missing sourcePublic', async () => {
    const shape = await post({ type: 'analyze', params: { target: 'robot', slug: 'Bad Slug' }, sourcePublic: true });
    expect(shape.statusCode).toBe(400);
    expect(shape.json()).toEqual({ error: 'invalid_request', reasons: ['invalid_type_or_shape'] });
    const noProof = await post({ type: 'analyze', params: ROBOT.params });
    expect(noProof.json()).toEqual({ error: 'invalid_request', reasons: ['source_not_public'] });
    expect(store.insertCalls).toBe(0);
  });

  it('400 invalid_request for broken JSON and a bad Idempotency-Key, without echoing anything', async () => {
    const broken = await post('{"type": "analyze", "secret-ish": ');
    expect(broken.statusCode).toBe(400);
    expect(broken.json()).toEqual({ error: 'invalid_request', reasons: ['invalid_type_or_shape'] });
    expect(broken.body).not.toContain('secret-ish');
    const badKey = await post(ROBOT, { 'idempotency-key': 'short' });
    expect(badKey.statusCode).toBe(400);
  });

  it('413 payload_too_large above 8KB', async () => {
    const res = await post({ ...ROBOT, note: 'a'.repeat(9000) });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toEqual({ error: 'payload_too_large' });
    expect(store.insertCalls).toBe(0);
  });

  it('a note is stored for the admin list but never returned by any request-API response', async () => {
    const created = await post({ ...ROBOT, note: '지난주 영상 후속 확인 요청' });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    expect([...store.rows.values()][0]!.note).toBe('지난주 영상 후속 확인 요청');
    for (const res of [created, await get(`/api/argos-i/requests/${id}`), await get('/api/argos-i/requests')]) {
      expect(res.body).not.toContain('지난주');
      expect(res.body).not.toContain('note');
      expect(res.body).not.toContain('payload');
    }
  });
});

describe('idempotency (AC-11)', () => {
  const KEY = { 'idempotency-key': 'idem-key-0001' };

  it('same key + same body replays the original response with 200 and adds no row', async () => {
    const first = await post(ROBOT, KEY);
    const again = await post(ROBOT, KEY);
    expect(first.statusCode).toBe(201);
    expect(again.statusCode).toBe(200);
    expect(again.json().id).toBe(first.json().id);
    expect(store.rows.size).toBe(1);
  });

  it('same key + different body is 409 idempotency_conflict', async () => {
    await post(ROBOT, KEY);
    const res = await post(ARXIV, KEY);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'idempotency_conflict' });
    expect(store.rows.size).toBe(1);
  });

  it('semantically identical bodies (key order, default fields) count as the same body', async () => {
    const a = await post({ sourcePublic: true, params: { query: 'hand_benchmark_top' }, type: 'query' }, KEY);
    const b = await post({ type: 'query', params: { limit: 10, query: 'hand_benchmark_top' }, sourcePublic: true }, KEY);
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(200);
  });

  it('can be reused after 24 hours', async () => {
    await post(ROBOT, KEY);
    store.clock.now = new Date(store.clock.now.getTime() + 25 * 3_600_000);
    const res = await post(ARXIV, KEY);
    expect(res.statusCode).toBe(201);
    expect(store.rows.size).toBe(2);
  });

  it('replays do not consume the hourly rate limit', async () => {
    await post(ROBOT, KEY);
    for (let i = 0; i < 70; i++) expect((await post(ROBOT, KEY)).statusCode).toBe(200);
  });
});

describe('rate and queue limits (AC-12)', () => {
  it('429 rate_limited with Retry-After after 60 stored requests per hour', async () => {
    for (let i = 0; i < 60; i++) expect((await post({ type: 'analyze', params: { target: 'robot', slug: `robot-${i}` }, sourcePublic: true })).statusCode).toBe(201);
    const res = await post(ROBOT);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'rate_limited' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    // 한 시간이 지나면 다시 받는다
    store.clock.now = new Date(store.clock.now.getTime() + 3_700_000);
    expect((await post(ROBOT)).statusCode).toBe(201);
  });

  it('429 queue_full when 200 requests are open', async () => {
    store.clock.now = new Date(store.clock.now.getTime() - 3 * 3_600_000);
    for (let i = 0; i < 200; i++) {
      await store.insert({ type: 'analyze', params: { target: 'robot', slug: `r-${i}` }, note: null, status: i % 2 ? 'needs_approval' : 'queued', approvalRequired: false, approvalReason: null, payloadHash: `h${i}`, idempotencyHash: null });
    }
    store.clock.now = new Date(store.clock.now.getTime() + 3 * 3_600_000);
    const res = await post(ROBOT);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'queue_full' });
  });
});

describe('GET / DELETE', () => {
  it('GET /:id returns the public view; 400 invalid_id; 404 not_found', async () => {
    const id = (await post(TOPIC)).json().id as string;
    const res = await get(`/api/argos-i/requests/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id,
      type: 'analyze',
      status: 'needs_approval',
      params: { target: 'topic', domain: 'hand', days: 30 },
      result: null,
      errorCode: null,
      approval: { required: true, state: 'pending' },
      startedAt: null,
      finishedAt: null,
    });
    expect(Object.keys(res.json()).sort()).toEqual(['approval', 'createdAt', 'errorCode', 'finishedAt', 'id', 'params', 'result', 'startedAt', 'status', 'type']);
    expect((await get('/api/argos-i/requests/not-a-uuid')).statusCode).toBe(400);
    expect((await get('/api/argos-i/requests/00000000-0000-4000-8000-0000000000ff')).statusCode).toBe(404);
  });

  it('GET / lists newest first without result, filters by status and since, validates the query', async () => {
    const a = (await post(ROBOT)).json().id;
    store.clock.now = new Date(store.clock.now.getTime() + 60_000);
    const b = (await post(TOPIC)).json().id;
    const all = (await get('/api/argos-i/requests')).json();
    expect(all.count).toBe(2);
    expect(all.items.map((i: any) => i.id)).toEqual([b, a]);
    expect(all.items[0]).not.toHaveProperty('result');
    expect(all.items[0]).toHaveProperty('hasResult', false);
    expect((await get('/api/argos-i/requests?status=needs_approval')).json().items.map((i: any) => i.id)).toEqual([b]);
    expect((await get(`/api/argos-i/requests?since=${encodeURIComponent(store.clock.now.toISOString())}`)).json().items.map((i: any) => i.id)).toEqual([b]);
    expect((await get('/api/argos-i/requests?status=bogus')).statusCode).toBe(400);
    expect((await get('/api/argos-i/requests?since=yesterday')).statusCode).toBe(400);
  });

  it('DELETE cancels queued and needs_approval only; everything else is 409 not_cancellable (AC-13)', async () => {
    const q = (await post(ROBOT)).json().id as string;
    const n = (await post(TOPIC)).json().id as string;
    for (const id of [q, n]) {
      const res = await app.inject({ method: 'DELETE', url: `/api/argos-i/requests/${id}`, headers: auth });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id, status: 'cancelled' });
    }
    for (const status of ['running', 'done', 'failed', 'rejected', 'cancelled'] as const) {
      const row = await store.insert({ type: 'analyze', params: ROBOT.params, note: null, status, approvalRequired: false, approvalReason: null, payloadHash: `x${status}`, idempotencyHash: null });
      const res = await app.inject({ method: 'DELETE', url: `/api/argos-i/requests/${row!.id}`, headers: auth });
      expect(res.statusCode, status).toBe(409);
      expect(res.json()).toEqual({ error: 'not_cancellable' });
    }
    expect((await app.inject({ method: 'DELETE', url: '/api/argos-i/requests/00000000-0000-4000-8000-0000000000fe', headers: auth })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: '/api/argos-i/requests/zzz', headers: auth })).statusCode).toBe(400);
  });
});

describe('suspended state (circuit breaker)', () => {
  it('503 requests_suspended for POST while suspended', async () => {
    store.markers.set('argos-i-requests:suspended', { suspended: true, since: '2026-11-12T00:00:00.000Z' });
    __setServiceDepsForTests({ store, now: () => store.clock.now, env: process.env, log: () => undefined });
    const res = await post(ROBOT);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'requests_suspended' });
    // 조회는 계속 가능하다
    expect((await get('/api/argos-i/requests')).statusCode).toBe(200);
  });
});

describe('admin routes are adminOnly (AC-28)', () => {
  const call = (method: 'GET' | 'POST', url: string, token?: string) =>
    app.inject({ method, url, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, payload: method === 'POST' ? '{}' : undefined });
  const ID = '00000000-0000-4000-8000-000000000001';
  const routes: Array<['GET' | 'POST', string]> = [
    ['GET', '/api/admin/argos-i/requests'],
    ['GET', '/api/admin/argos-i/requests/stats'],
    ['POST', `/api/admin/argos-i/requests/${ID}/approve`],
    ['POST', `/api/admin/argos-i/requests/${ID}/reject`],
    ['POST', '/api/admin/argos-i/requests/resume'],
  ];

  it.each(routes)('%s %s: 401 without JWT (the request token does not work), 403 for viewer/analyst', async (method, url) => {
    expect((await call(method, url)).statusCode).toBe(401);
    expect((await call(method, url, REQ)).statusCode).toBe(401);
    for (const role of ['viewer', 'analyst']) expect((await call(method, url, role)).statusCode).toBe(403);
  });

  it('admin list includes note; approve moves needs_approval to queued with the approver recorded; reject; 409/404', async () => {
    const id = (await post({ ...TOPIC, note: '확인 요청' })).json().id as string;
    const list = (await call('GET', '/api/admin/argos-i/requests?status=needs_approval', 'admin')).json();
    expect(list.items[0]).toMatchObject({ id, note: '확인 요청', approvalReason: 'type_rule' });
    expect(JSON.stringify(list)).not.toContain('payloadHash');
    expect(JSON.stringify(list)).not.toContain('payload_hash');

    const approved = await call('POST', `/api/admin/argos-i/requests/${id}/approve`, 'admin');
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({ status: 'queued', approvedBy: 'admin:u-admin' });
    expect(approved.json().approvedAt).toBeTruthy();
    expect((await call('POST', `/api/admin/argos-i/requests/${id}/approve`, 'admin')).statusCode).toBe(409);

    const id2 = (await post(CHANNEL)).json().id as string;
    const rejected = await call('POST', `/api/admin/argos-i/requests/${id2}/reject`, 'admin');
    expect(rejected.json()).toMatchObject({ status: 'rejected', errorCode: 'admin_rejected' });
    expect((await call('POST', '/api/admin/argos-i/requests/00000000-0000-4000-8000-0000000000aa/approve', 'admin')).statusCode).toBe(404);
    expect((await call('POST', '/api/admin/argos-i/requests/nope/approve', 'admin')).statusCode).toBe(400);
  });

  it('stats and resume work for admin', async () => {
    await post(ROBOT);
    const stats = (await call('GET', '/api/admin/argos-i/requests/stats', 'admin')).json();
    expect(stats).toMatchObject({ enabled: true, queueLength: 1, suspended: false, today: { budgetUsd: 2, maxAnalyze: 30 } });
    store.markers.set('argos-i-requests:suspended', { suspended: true, since: 'x' });
    __setServiceDepsForTests({ store, now: () => store.clock.now, env: process.env, log: () => undefined });
    expect((await call('GET', '/api/admin/argos-i/requests/stats', 'admin')).json().suspended).toBe(true);
    expect((await call('POST', '/api/admin/argos-i/requests/resume', 'admin')).json()).toEqual({ suspended: false });
    expect((await post(ROBOT)).statusCode).toBe(201);
  });
});
