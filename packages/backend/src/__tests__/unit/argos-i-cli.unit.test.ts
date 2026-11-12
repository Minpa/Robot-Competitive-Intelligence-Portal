/**
 * scripts/argos-i-request.mjs — 가드 차단 시 네트워크 호출 없이 종료 코드 2, 로그에 params 값·note·토큰 없음, 재시도(같은 Idempotency-Key),
 * 종료 코드 규약, wait 폴링·백오프 (AC-10)
 */
import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error — 순수 JS(.mjs) CLI 를 직접 import 한다
import { run, EXIT } from '../../../../../scripts/argos-i-request.mjs';

const TOKEN = 'cli-token-0123456789abcdef0123456789abcdef';
const ROBOT = { type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, sourcePublic: true };
const CANARY_NOTE = 'canary-note-text-zzz';

function harness(responses: Array<{ status: number; json?: unknown; headers?: Record<string, string> } | 'network'> = [], extra: Record<string, unknown> = {}) {
  const calls: Array<{ url: string; init: any }> = [];
  const out: string[] = [];
  const err: string[] = [];
  const logs: string[] = [];
  const sleeps: number[] = [];
  let i = 0;
  let clock = Date.parse('2026-11-12T03:00:00Z');
  const io = {
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    appendLog: (l: string) => logs.push(l),
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => new Date(clock),
    uuid: () => 'uuid-fixed-0001',
    readFile: (p: string) => (p === 'req.json' ? JSON.stringify(extra.request ?? ROBOT) : (() => { throw new Error('nope'); })()),
    readStdin: async () => JSON.stringify(extra.request ?? ROBOT),
    fetch: vi.fn(async (url: string, init: unknown) => {
      calls.push({ url, init });
      const r = responses[Math.min(i, responses.length - 1)];
      i += 1;
      if (r === 'network') throw new Error(`connect ECONNREFUSED ${url} Bearer ${TOKEN}`);
      return { status: r!.status, json: async () => r!.json ?? null, headers: { get: (k: string) => r!.headers?.[k.toLowerCase()] ?? null } };
    }),
  };
  const env = { ARGOS_I_REQUEST_TOKEN: TOKEN, ARGOS_I_BASE_URL: 'https://argos.example.test', ...((extra.env as object) ?? {}) };
  const go = (argv: string[]) => run(argv, env, io);
  return { go, calls, out, err, logs, sleeps, io };
}

describe('send — outbound guard first', () => {
  it('blocks without any network call and exits 2; the log has no params, note or token', async () => {
    const h = harness([{ status: 201, json: { id: 'x', status: 'queued' } }], { request: { ...ROBOT, note: `${CANARY_NOTE} hong@lge.com` } });
    const code = await h.go(['send', 'req.json', '--approved-by', 'alice']);
    expect(code).toBe(EXIT.BLOCKED);
    expect(code).toBe(2);
    expect(h.io.fetch).not.toHaveBeenCalled();
    expect(h.calls).toHaveLength(0);
    const all = [...h.out, ...h.err, ...h.logs].join('\n');
    for (const secret of [CANARY_NOTE, 'hong@lge.com', 'figure-02', TOKEN]) expect(all).not.toContain(secret);
    expect(h.err.join('\n')).toContain('BLOCKED');
    expect(h.err.join('\n')).toContain('email_detected');
    const entry = JSON.parse(h.logs[0]!);
    expect(Object.keys(entry).sort()).toEqual(['hash8', 'id', 'result', 'ts', 'type']);
    expect(entry).toMatchObject({ type: 'analyze', id: null, result: 'blocked:internal_domain,email_detected' });
    expect(entry.hash8).toMatch(/^[0-9a-f]{8}$/);
  });

  it('blocks when sourcePublic is missing, a note has no human approval, and (strict) unknown keys', async () => {
    const a = harness([], { request: { type: 'analyze', params: ROBOT.params } });
    expect(await a.go(['send', 'req.json'])).toBe(2);
    expect(a.err.join('\n')).toContain('source_not_public');

    const b = harness([], { request: { ...ROBOT, note: '지난주 영상 후속 확인 요청' } });
    expect(await b.go(['send', 'req.json'])).toBe(2);
    expect(b.err.join('\n')).toContain('--approved-by');
    expect(b.io.fetch).not.toHaveBeenCalled();

    const c = harness([{ status: 201, json: { id: 'i', status: 'queued' } }], { request: { ...ROBOT, projectX: 1 } });
    expect(await c.go(['send', 'req.json', '--strict'])).toBe(2);
    expect(c.io.fetch).not.toHaveBeenCalled();
    expect(c.err.join('\n')).not.toContain('projectX');
  });

  it('sends a clean request: Bearer token, fixed Idempotency-Key, body with sourcePublic, 201 -> exit 0 and the JSON on stdout', async () => {
    const h = harness([{ status: 201, json: { id: 'abc', status: 'queued' } }]);
    expect(await h.go(['send', 'req.json'])).toBe(0);
    expect(h.calls).toHaveLength(1);
    const { url, init } = h.calls[0]!;
    expect(url).toBe('https://argos.example.test/api/argos-i/requests');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers['Idempotency-Key']).toBe('uuid-fixed-0001');
    expect(JSON.parse(init.body)).toEqual({ type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, sourcePublic: true });
    expect(JSON.parse(h.out[0]!)).toEqual({ id: 'abc', status: 'queued' });
    expect(JSON.parse(h.logs[0]!)).toMatchObject({ id: 'abc', type: 'analyze', result: 'http_201' });
    expect(h.logs.join('\n')).not.toContain('figure-02');
    expect([...h.out, ...h.err, ...h.logs].join('\n')).not.toContain(TOKEN);
  });

  it('removes unknown keys when not strict and says how many (never which)', async () => {
    const h = harness([{ status: 201, json: { id: 'abc', status: 'queued' } }], { request: { ...ROBOT, projectX: 1 } });
    expect(await h.go(['send', 'req.json'])).toBe(0);
    expect(JSON.parse(h.calls[0]!.init.body)).not.toHaveProperty('projectX');
    expect(h.err.join('\n')).toContain('removed 1 unknown key');
    expect(h.err.join('\n')).not.toContain('projectX');
  });

  it('a note with --approved-by is sent', async () => {
    const h = harness([{ status: 201, json: { id: 'n', status: 'queued' } }], { request: { ...ROBOT, note: '지난주 영상 후속 확인 요청' } });
    expect(await h.go(['send', 'req.json', '--approved-by', 'alice'])).toBe(0);
    expect(JSON.parse(h.calls[0]!.init.body).note).toBe('지난주 영상 후속 확인 요청');
    expect(h.logs.join('\n')).not.toContain('지난주');
  });

  it('reads the request from stdin when no file is given, and extra blocklists come from the environment', async () => {
    const h = harness([{ status: 201, json: { id: 'abc', status: 'queued' } }], { env: { ARGOS_I_OUTBOUND_PATTERNS: 'figure-\\d+' } });
    expect(await h.go(['send'])).toBe(2); // 사내 패턴 figure-\d+ 가 slug 에 걸린다
    const ok = harness([{ status: 201, json: { id: 'abc', status: 'queued' } }]);
    expect(await ok.go(['send', '-'])).toBe(0);
  });

  it('exits 1 without echoing input for unreadable files, invalid JSON, a missing token, or bad usage', async () => {
    const a = harness();
    expect(await a.go(['send', 'missing.json'])).toBe(1);
    const b = harness();
    b.io.readFile = () => '{broken ' + CANARY_NOTE;
    expect(await b.go(['send', 'req.json'])).toBe(1);
    expect(b.err.join('\n')).not.toContain(CANARY_NOTE);
    const c = harness([{ status: 200 }]);
    expect(await run(['get', 'x'], { ARGOS_I_BASE_URL: 'https://argos.example.test' }, c.io)).toBe(1);
    expect(c.io.fetch).not.toHaveBeenCalled();
    expect(await harness().go(['frobnicate'])).toBe(1);
    expect(await harness().go([])).toBe(1);
    expect(await harness().go(['get'])).toBe(1);
    expect(await harness().go(['send', 'req.json', '--approved-by'])).toBe(1);
  });
});

describe('retries and exit codes', () => {
  it('retries 5xx / network / 429 up to 3 times with 1s,2s,4s backoff, always with the same Idempotency-Key', async () => {
    const h = harness([{ status: 503 }, 'network', { status: 429, headers: {} }, { status: 201, json: { id: 'r', status: 'queued' } }]);
    expect(await h.go(['send', 'req.json'])).toBe(0);
    expect(h.calls).toHaveLength(4);
    expect(h.sleeps).toEqual([1000, 2000, 4000]);
    expect(new Set(h.calls.map((c) => c.init.headers['Idempotency-Key'])).size).toBe(1);
    expect(new Set(h.calls.map((c) => c.init.body)).size).toBe(1);
  });

  it('exits 4 after the retries are exhausted on 5xx or network errors (token never printed)', async () => {
    const a = harness([{ status: 502 }]);
    expect(await a.go(['send', 'req.json'])).toBe(4);
    expect(a.calls).toHaveLength(4);
    const b = harness(['network']);
    expect(await b.go(['send', 'req.json'])).toBe(4);
    expect([...b.out, ...b.err, ...b.logs].join('\n')).not.toContain(TOKEN);
    expect(JSON.parse(b.logs[0]!).result).toBe('network_error');
  });

  it('does not retry other 4xx: exits 3 once; a server-side rejection tells the operator not to retry', async () => {
    const h = harness([{ status: 400, json: { error: 'internal_data_rejected', reasons: ['email_detected'] } }]);
    expect(await h.go(['send', 'req.json'])).toBe(3);
    expect(h.calls).toHaveLength(1);
    expect(h.sleeps).toEqual([]);
    expect(h.err.join('\n')).toContain('재시도하지 말고');
    expect(JSON.parse(h.logs[0]!).result).toBe('http_400:internal_data_rejected');
    for (const status of [401, 404, 409, 413]) {
      const x = harness([{ status, json: { error: 'x' } }]);
      expect(await x.go(['send', 'req.json'])).toBe(3);
      expect(x.calls).toHaveLength(1);
    }
  });

  it('429 honors Retry-After (at least the backoff) and exits 3 when still limited after 3 retries', async () => {
    const h = harness([{ status: 429, json: { error: 'rate_limited' }, headers: { 'retry-after': '10' } }]);
    expect(await h.go(['send', 'req.json'])).toBe(3);
    expect(h.sleeps).toEqual([10_000, 10_000, 10_000]);
  });
});

describe('get / list / cancel', () => {
  it('uses GET/DELETE with the token and url-encodes ids; list passes filters', async () => {
    const g = harness([{ status: 200, json: { id: 'a', status: 'done', type: 'query' } }]);
    expect(await g.go(['get', 'a/b'])).toBe(0);
    expect(g.calls[0]!.url).toBe('https://argos.example.test/api/argos-i/requests/a%2Fb');
    const l = harness([{ status: 200, json: { items: [], count: 0 } }]);
    expect(await l.go(['list', '--status', 'queued,done', '--since', '2026-11-01T00:00:00Z'])).toBe(0);
    expect(l.calls[0]!.url).toBe('https://argos.example.test/api/argos-i/requests?status=queued%2Cdone&since=2026-11-01T00%3A00%3A00Z');
    const c = harness([{ status: 409, json: { error: 'not_cancellable' } }]);
    expect(await c.go(['cancel', 'a'])).toBe(3);
    expect(c.calls[0]!.init.method).toBe('DELETE');
  });
});

describe('wait', () => {
  const seq = (...statuses: string[]) => statuses.map((status) => ({ status: 200, json: { id: 'w', type: 'analyze', status } }));

  it('polls starting at 30s with growing backoff capped at 5 minutes, shows the approval wait, and stops on done (exit 0)', async () => {
    const h = harness([...seq('needs_approval', 'needs_approval', 'queued', 'running', 'running', 'running', 'running', 'done')]);
    expect(await h.go(['wait', 'w', '--max-wait-min', '600'])).toBe(0);
    expect(h.sleeps[0]).toBe(30_000);
    expect(h.sleeps.every((s, i, a) => i === 0 || s >= a[i - 1]!)).toBe(true);
    expect(Math.max(...h.sleeps)).toBeLessThanOrEqual(300_000);
    expect(h.err.join('\n')).toContain('관리자 승인 대기');
    expect(JSON.parse(h.out[0]!).status).toBe('done');
  });

  it('exits 6 when the request ends failed/rejected/cancelled, 5 on timeout (default total 30 minutes)', async () => {
    for (const s of ['failed', 'rejected', 'cancelled']) expect(await harness(seq('queued', s)).go(['wait', 'w'])).toBe(6);
    const t = harness(seq('queued'));
    expect(await t.go(['wait', 'w'])).toBe(5);
    expect(t.sleeps.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(30 * 60_000);
    expect(JSON.parse(t.logs[t.logs.length - 1]!).result).toBe('wait_timeout');
    expect(await harness(seq('queued')).go(['wait', 'w', '--max-wait-min', '0'])).toBe(1);
  });

  it('propagates server errors from polling (404 -> 3)', async () => {
    expect(await harness([{ status: 404, json: { error: 'not_found' } }]).go(['wait', 'w'])).toBe(3);
  });
});
