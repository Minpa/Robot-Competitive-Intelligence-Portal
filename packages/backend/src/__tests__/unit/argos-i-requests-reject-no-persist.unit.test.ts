/**
 * 거부 시 비저장·비로그 — DB insert 0회, 로그(서비스·Fastify·console)에 본문·키 이름·값이 없고 hash8 와 코드만 있음,
 * 응답에 값 에코 없음, 거부 통계 +1, 서킷 브레이커(5건), 요청 본문이 어떤 로그에도 나타나지 않음 (AC-05, AC-07, AC-32)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Writable } from 'stream';

vi.mock('../../services/argos-i-requests-runtime.js', () => ({
  allowedHosts: async () => ['youtube.com', 'youtu.be', 'arxiv.org'],
  runInlineQuery: vi.fn(),
}));
vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});

import { argosIRequestsRoutes } from '../../routes/argos-i-requests.js';
import { __resetArgosIRequestAuthStateForTests } from '../../routes/argos-i-request-auth.js';
import { __setServiceDepsForTests } from '../../services/argos-i-requests.service.js';
import { createMemoryStore, type MemoryStore } from '../fixtures/argos-i-requests-memory-store.js';

const REQ = 'req-token-0123456789abcdef0123456789abcdef';
const CANARY_KEY = 'canaryProjectKey';
const CANARY_VALUE = 'canary-secret-value-777';
const CANARY_EMAIL = 'canary.person@lge.com';

let store: MemoryStore;
let lines: string[];
let app: FastifyInstance;
const saved = { ...process.env };

async function build() {
  const sink = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  const a = Fastify({ logger: { level: 'trace', stream: sink } });
  a.addContentTypeParser('application/json', { parseAs: 'string' }, (_r, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });
  await a.register(argosIRequestsRoutes, { prefix: '/api/argos-i/requests' });
  await a.ready();
  return a;
}

beforeEach(async () => {
  lines = [];
  __resetArgosIRequestAuthStateForTests();
  store = createMemoryStore();
  __setServiceDepsForTests({ store, now: () => store.clock.now, env: process.env, log: (l) => lines.push(l) });
  process.env.ARGOS_I_REQUESTS_ENABLED = 'true';
  process.env.ARGOS_I_REQUEST_TOKEN = REQ;
  for (const m of ['log', 'warn', 'error', 'info', 'debug'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(' ')));
  app = await build();
});
afterEach(async () => {
  await app.close();
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const post = (body: unknown) => app.inject({ method: 'POST', url: '/api/argos-i/requests', headers: { authorization: `Bearer ${REQ}`, 'content-type': 'application/json', 'x-trace': CANARY_VALUE }, payload: typeof body === 'string' ? body : JSON.stringify(body) });
const base = { type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, sourcePublic: true };

describe('rejected requests', () => {
  it('are not stored; response has codes only; logs have hash8 + codes only and never the body, key names or values', async () => {
    const res = await post({ ...base, [CANARY_KEY]: CANARY_VALUE, note: CANARY_EMAIL });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'internal_data_rejected', reasons: ['unknown_key', 'internal_domain', 'email_detected'] });
    expect(store.insertCalls).toBe(0);
    expect(store.rows.size).toBe(0);

    const text = lines.join('\n');
    for (const secret of [CANARY_KEY, CANARY_VALUE, CANARY_EMAIL, 'canary.person', 'lge.com', REQ]) {
      expect(text, secret).not.toContain(secret);
      expect(res.body, secret).not.toContain(secret);
    }
    const rejectLine = lines.find((l) => l.includes('outcome=rejected'));
    expect(rejectLine).toMatch(/^\[ArgosIRequest\] outcome=rejected reasons=\["unknown_key","internal_domain","email_detected"\] hash8=[0-9a-f]{8}$/);
  });

  it('count +1 per reason code in the day statistics (codes only)', async () => {
    await post({ ...base, note: CANARY_EMAIL });
    await post({ ...base, note: CANARY_EMAIL });
    await post({ ...base, [CANARY_KEY]: 1 });
    const day = '2026-11-12';
    expect(store.rejects.get(`${day}|email_detected`)).toBe(2);
    expect(store.rejects.get(`${day}|internal_domain`)).toBe(2);
    expect(store.rejects.get(`${day}|unknown_key`)).toBe(1);
    for (const key of store.rejects.keys()) expect(key).not.toContain(CANARY_KEY);
  });

  it('invalid_request (shape only) is not counted in the reject statistics', async () => {
    await post({ ...base, params: { target: 'robot', slug: 'Bad Slug' } });
    expect(store.rejects.size).toBe(0);
    expect(store.insertCalls).toBe(0);
  });

  it('a parse error does not echo the body into the response or logs', async () => {
    const res = await post(`{"leak": "${CANARY_VALUE}", `);
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain(CANARY_VALUE);
    expect(lines.join('\n')).not.toContain(CANARY_VALUE);
  });

  it('accepted requests do not log the body or note either (id, type, status, hash8 only)', async () => {
    const res = await post({ ...base, note: '지난주 영상 후속 확인 요청' });
    expect(res.statusCode).toBe(201);
    const text = lines.join('\n');
    expect(text).not.toContain('지난주');
    expect(text).not.toContain('figure-02');
    expect(lines.find((l) => l.includes('outcome=accepted'))).toMatch(/^\[ArgosIRequest\] outcome=accepted id=\S+ type=analyze status=queued hash8=[0-9a-f]{8}$/);
  });
});

describe('circuit breaker (Q11)', () => {
  it('suspends the API on the 5th rejection within an hour; subsequent requests get 503 requests_suspended', async () => {
    for (let i = 0; i < 4; i++) expect((await post({ ...base, note: CANARY_EMAIL })).statusCode).toBe(400);
    expect((await post(base)).statusCode).toBe(201); // 아직 열려 있다
    expect((await post({ ...base, note: CANARY_EMAIL })).statusCode).toBe(400); // 5번째 거부 → 차단 시작
    const blocked = await post(base);
    expect(blocked.statusCode).toBe(503);
    expect(blocked.json()).toEqual({ error: 'requests_suspended' });
    expect(store.markers.get('argos-i-requests:suspended')).toMatchObject({ suspended: true });
    expect(lines.some((l) => l.includes('circuit=suspended'))).toBe(true);
  });

  it('rejections older than an hour do not accumulate', async () => {
    for (let i = 0; i < 4; i++) await post({ ...base, note: CANARY_EMAIL });
    store.clock.now = new Date(store.clock.now.getTime() + 3_700_000);
    await post({ ...base, note: CANARY_EMAIL });
    expect((await post(base)).statusCode).toBe(201);
  });

  it('structural invalid_request does not trip the breaker', async () => {
    for (let i = 0; i < 8; i++) await post({ ...base, params: { target: 'robot', slug: 'Bad Slug' } });
    expect((await post(base)).statusCode).toBe(201);
  });

  it('after more than 60 rejections in an hour the response is 429 rate_limited (in-process window)', async () => {
    store.markers.set('argos-i-requests:suspended', { suspended: false });
    for (let i = 0; i < 60; i++) await post({ ...base, params: { target: 'robot', slug: 'Bad Slug' } });
    const res = await post({ ...base, params: { target: 'robot', slug: 'Bad Slug' } });
    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBeTruthy();
  });
});
