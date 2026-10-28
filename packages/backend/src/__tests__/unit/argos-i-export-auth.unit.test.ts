/**
 * routes/argos-i-export-auth — 토큰 판정(disabled / unauthorized / ok), NEXT 이중 토큰, 쿼리·X-Ingest-Key 무시, 실패 레이트 리밋, 로그 무토큰
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTH_FAIL_LIMIT,
  __resetArgosIAuthStateForTests,
  checkArgosIExportToken,
  recordAuthFailure,
  requireArgosIToken,
} from '../../routes/argos-i-export-auth.js';
import { getConfiguredTokens, isArgosITokenConfigured, isArgosITokenTooShort, redactTokens } from '../../services/argos-i-export-config.js';

const TOKEN = 'test-token-0123456789abcdef0123456789abcdef'; // 43자
const NEXT = 'test-token-next-0123456789abcdef0123456789';
const env = { ARGOS_I_EXPORT_TOKEN: TOKEN };
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

describe('checkArgosIExportToken', () => {
  it('disabled when the token is missing, empty or shorter than 32 chars (even with a matching header)', () => {
    expect(checkArgosIExportToken(bearer(TOKEN), {})).toBe('disabled');
    expect(checkArgosIExportToken(bearer(TOKEN), { ARGOS_I_EXPORT_TOKEN: '' })).toBe('disabled');
    expect(checkArgosIExportToken(bearer('short-token'), { ARGOS_I_EXPORT_TOKEN: 'short-token' })).toBe('disabled');
    expect(checkArgosIExportToken(bearer('x'.repeat(31)), { ARGOS_I_EXPORT_TOKEN: 'x'.repeat(31) })).toBe('disabled');
    expect(checkArgosIExportToken(bearer('x'.repeat(32)), { ARGOS_I_EXPORT_TOKEN: 'x'.repeat(32) })).toBe('ok');
    // NEXT 만 있고 기본 토큰이 없으면 비활성
    expect(checkArgosIExportToken(bearer(NEXT), { ARGOS_I_EXPORT_TOKEN_NEXT: NEXT })).toBe('disabled');
  });

  it('ok for the exact Bearer token; unauthorized for missing, wrong, other-length, empty and non-Bearer headers', () => {
    expect(checkArgosIExportToken(bearer(TOKEN), env)).toBe('ok');
    expect(checkArgosIExportToken({}, env)).toBe('unauthorized');
    expect(checkArgosIExportToken(bearer(`${TOKEN}x`), env)).toBe('unauthorized');
    expect(checkArgosIExportToken(bearer(TOKEN.slice(0, -1)), env)).toBe('unauthorized');
    expect(checkArgosIExportToken(bearer('a'), env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ authorization: 'Bearer ' }, env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ authorization: 'Bearer' }, env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ authorization: TOKEN }, env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ authorization: `Basic ${TOKEN}` }, env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ authorization: `Token ${TOKEN}` }, env)).toBe('unauthorized');
  });

  it('tolerates the scheme case and surrounding whitespace but compares the token exactly', () => {
    expect(checkArgosIExportToken({ authorization: `bearer ${TOKEN}` }, env)).toBe('ok');
    expect(checkArgosIExportToken({ authorization: `Bearer   ${TOKEN}  ` }, env)).toBe('ok');
    expect(checkArgosIExportToken({ authorization: `Bearer ${TOKEN.toUpperCase()}` }, env)).toBe('unauthorized');
  });

  it('only the Authorization header counts: X-Ingest-Key, query tokens and INGEST_API_KEY do not pass', () => {
    expect(checkArgosIExportToken({ 'x-ingest-key': TOKEN }, env)).toBe('unauthorized');
    expect(checkArgosIExportToken({ 'x-argos-i-token': TOKEN, token: TOKEN } as any, env)).toBe('unauthorized');
    const ingestKey = 'test-token-ingest-0123456789abcdef0123456789';
    expect(checkArgosIExportToken(bearer(ingestKey), { ...env, INGEST_API_KEY: ingestKey })).toBe('unauthorized');
  });

  it('ARGOS_I_EXPORT_TOKEN_NEXT: either token passes (zero-downtime rotation); a short NEXT is ignored', () => {
    const both = { ARGOS_I_EXPORT_TOKEN: TOKEN, ARGOS_I_EXPORT_TOKEN_NEXT: NEXT };
    expect(checkArgosIExportToken(bearer(TOKEN), both)).toBe('ok');
    expect(checkArgosIExportToken(bearer(NEXT), both)).toBe('ok');
    expect(checkArgosIExportToken(bearer('other'), both)).toBe('unauthorized');
    expect(checkArgosIExportToken(bearer('short'), { ...env, ARGOS_I_EXPORT_TOKEN_NEXT: 'short' })).toBe('unauthorized');
    expect(getConfiguredTokens(both)).toEqual([TOKEN, NEXT]);
    expect(getConfiguredTokens({ ...env, ARGOS_I_EXPORT_TOKEN_NEXT: 'short' })).toEqual([TOKEN]);
  });

  it('uses an array header value (first element) the same way', () => {
    expect(checkArgosIExportToken({ authorization: [`Bearer ${TOKEN}`, 'Bearer other'] }, env)).toBe('ok');
  });
});

describe('config helpers', () => {
  it('isArgosITokenConfigured / isArgosITokenTooShort / redactTokens', () => {
    expect(isArgosITokenConfigured(env)).toBe(true);
    expect(isArgosITokenConfigured({})).toBe(false);
    expect(isArgosITokenTooShort({ ARGOS_I_EXPORT_TOKEN: 'abc' })).toBe(true);
    expect(isArgosITokenTooShort(env)).toBe(false);
    expect(isArgosITokenTooShort({})).toBe(false);
    expect(redactTokens(`boom ${TOKEN} / ${NEXT}`, { ...env, ARGOS_I_EXPORT_TOKEN_NEXT: NEXT })).toBe('boom [redacted] / [redacted]');
  });
});

describe('failed-auth rate limit (fixed 60s window, global)', () => {
  let t = 1_000_000;
  beforeEach(() => __resetArgosIAuthStateForTests(() => t));
  afterEach(() => __resetArgosIAuthStateForTests());

  it('limits after 30 failures within a window and resets in the next window', () => {
    t = 1_000_000;
    for (let i = 1; i <= AUTH_FAIL_LIMIT; i++) expect(recordAuthFailure().limited).toBe(false);
    const over = recordAuthFailure();
    expect(over).toMatchObject({ count: 31, limited: true });
    expect(over.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(over.retryAfterSec).toBeLessThanOrEqual(60);
    t += 61_000;
    expect(recordAuthFailure()).toMatchObject({ count: 1, limited: false });
  });
});

describe('requireArgosIToken (preHandler)', () => {
  const reply = () => {
    const r: any = { code: 0, headers: {} as Record<string, string>, body: undefined as unknown };
    r.status = (c: number) => { r.code = c; return r; };
    r.header = (k: string, v: string) => { r.headers[k] = v; return r; };
    r.send = (b?: unknown) => { r.body = b; return r; };
    return r;
  };
  const req = (headers: Record<string, string>) => ({ headers, query: {}, url: '/api/argos-i/manifest' }) as any;
  const saved = { ...process.env };
  beforeEach(() => { __resetArgosIAuthStateForTests(); process.env.ARGOS_I_EXPORT_TOKEN = TOKEN; delete process.env.ARGOS_I_EXPORT_TOKEN_NEXT; });
  afterEach(() => { process.env = { ...saved }; vi.restoreAllMocks(); });

  it('503 {argos_i_export_disabled} when unconfigured', async () => {
    delete process.env.ARGOS_I_EXPORT_TOKEN;
    const r = reply();
    await requireArgosIToken(req(bearer(TOKEN)), r);
    expect(r.code).toBe(503);
    expect(r.body).toEqual({ error: 'argos_i_export_disabled' });
  });

  it('401 with WWW-Authenticate: Bearer for a missing/wrong token; passes silently for the right one', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad = reply();
    await requireArgosIToken(req({}), bad);
    expect(bad.code).toBe(401);
    expect(bad.headers['WWW-Authenticate']).toBe('Bearer');
    expect(bad.body).toEqual({ error: 'Unauthorized' });
    const ok = reply();
    expect(await requireArgosIToken(req(bearer(TOKEN)), ok)).toBeUndefined();
    expect(ok.code).toBe(0);
  });

  it('429 + Retry-After after more than 30 failures, while a valid token still passes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < AUTH_FAIL_LIMIT; i++) {
      const r = reply();
      await requireArgosIToken(req(bearer('wrong')), r);
      expect(r.code).toBe(401);
    }
    const limited = reply();
    await requireArgosIToken(req(bearer('wrong')), limited);
    expect(limited.code).toBe(429);
    expect(Number(limited.headers['Retry-After'])).toBeGreaterThanOrEqual(1);
    const valid = reply();
    await requireArgosIToken(req(bearer(TOKEN)), valid);
    expect(valid.code).toBe(0);
  });

  it('aggregated auth-failure logs never contain the token or the offered credential', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 12; i++) await requireArgosIToken(req(bearer(`offered-secret-${i}-${TOKEN}`)), reply());
    const lines = warn.mock.calls.map((c) => String(c[0]));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toBe('[ArgosIExport] auth=failed count=1 windowSec=60');
    for (const l of lines) {
      expect(l).not.toContain(TOKEN);
      expect(l).not.toContain('offered-secret');
    }
  });
});
