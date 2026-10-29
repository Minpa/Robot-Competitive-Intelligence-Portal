/**
 * /api/argos-i/export/full-db.zip, /export/full-db/manifest — 인증 순서, 스위치, HEAD, tables 검증, 409/500, 헤더, 라우트 우선순위.
 * 서비스는 모킹한다 (DB 없음).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Readable } from 'stream';
import { createHash } from 'crypto';

const h = vi.hoisted(() => ({
  listBundles: vi.fn(),
  getBundleMeta: vi.fn(),
  getBundleFile: vi.fn(),
  getBundleFiles: vi.fn(),
  startArgosIExportGeneration: vi.fn(),
  getArgosIExportRunStatus: vi.fn(),
  openFullDbDump: vi.fn(),
  getFullDbPreview: vi.fn(),
  logFullDbRejected: vi.fn(),
}));

vi.mock('../../services/argos-i-export.service.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/argos-i-export.service.js')>('../../services/argos-i-export.service.js').catch(() => null);
  return {
    listBundles: h.listBundles,
    getBundleMeta: h.getBundleMeta,
    getBundleFile: h.getBundleFile,
    getBundleFiles: h.getBundleFiles,
    startArgosIExportGeneration: h.startArgosIExportGeneration,
    getArgosIExportRunStatus: h.getArgosIExportRunStatus,
    toBundleSummary: actual?.toBundleSummary,
  };
});
vi.mock('../../services/argos-i-full-db.service.js', () => ({
  openFullDbDump: h.openFullDbDump,
  getFullDbPreview: h.getFullDbPreview,
  logFullDbRejected: h.logFullDbRejected,
}));
vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/auth.service.js', () => ({
  authService: { verifyToken: () => null, hasRole: () => false, hasPermission: () => false, logAction: async () => {} },
}));

import { argosIAdminRoutes, argosIRoutes } from '../../routes/argos-i.js';
import { parseTablesParam } from '../../routes/argos-i-full-db.js';
import { __resetArgosIAuthStateForTests, AUTH_FAIL_LIMIT } from '../../routes/argos-i-export-auth.js';

const TOKEN = 'test-token-0123456789abcdef0123456789abcdef';
const ZIP_URL = '/api/argos-i/export/full-db.zip';
const MANIFEST_URL = '/api/argos-i/export/full-db/manifest';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  await app.register(argosIRoutes, { prefix: '/api/argos-i' });
  await app.register(argosIAdminRoutes, { prefix: '/api/admin/argos-i' });
  await app.ready();
});
afterAll(async () => app.close());

const saved = { ...process.env };
let logs: string[] = [];
const abort = vi.fn();

const okDump = (body = 'PK-fake-zip-bytes') => ({ ok: true as const, stream: Readable.from([Buffer.from(body)]), generatedAt: new Date('2026-10-29T03:12:45.000Z'), abort });

beforeEach(() => {
  __resetArgosIAuthStateForTests();
  process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
  delete process.env.ARGOS_I_EXPORT_TOKEN_NEXT;
  process.env.ARGOS_I_FULL_DB_ENABLED = 'true';
  logs = [];
  for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
  abort.mockReset();
  h.listBundles.mockReset().mockResolvedValue([]);
  h.getBundleMeta.mockReset().mockResolvedValue(null);
  h.getBundleFile.mockReset().mockResolvedValue(null);
  h.getBundleFiles.mockReset().mockResolvedValue([]);
  h.openFullDbDump.mockReset().mockImplementation(async () => okDump());
  h.getFullDbPreview.mockReset().mockImplementation(async (o: { exact?: boolean }) => ({ enabled: process.env.ARGOS_I_FULL_DB_ENABLED === 'true', exact: o?.exact === true, tables: [] }));
  h.logFullDbRejected.mockReset();
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const auth = { authorization: `Bearer ${TOKEN}` };
const get = (url: string, headers: Record<string, string> = auth) => app.inject({ method: 'GET', url, headers });

describe.each([ZIP_URL, MANIFEST_URL])('authentication for %s', (url) => {
  it('503 argos_i_export_disabled when the token is not configured', async () => {
    delete process.env.ARGOS_I_EXPORT_TOKEN;
    const res = await get(url);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'argos_i_export_disabled' });
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.getFullDbPreview).not.toHaveBeenCalled();
  });

  it('401 without a header or with a wrong token — even when the full-db switch is off', async () => {
    process.env.ARGOS_I_FULL_DB_ENABLED = 'false';
    for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: TOKEN }]) {
      const res = await get(url, headers);
      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
      expect(res.json()).toEqual({ error: 'Unauthorized' });
    }
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.getFullDbPreview).not.toHaveBeenCalled();
  });

  it('a token in the query string or X-Ingest-Key is rejected', async () => {
    expect((await get(`${url}${url.includes('?') ? '&' : '?'}token=${TOKEN}`, {})).statusCode).toBe(401);
    expect((await get(url, { 'x-ingest-key': TOKEN })).statusCode).toBe(401);
  });
});

describe('rate limit', () => {
  it('after 30 failed attempts failures get 429 + Retry-After, the valid token still works', async () => {
    for (let i = 0; i < AUTH_FAIL_LIMIT; i++) expect((await get(MANIFEST_URL, { authorization: 'Bearer nope' })).statusCode).toBe(401);
    const limited = await get(ZIP_URL, { authorization: 'Bearer nope' });
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect((await get(MANIFEST_URL)).statusCode).toBe(200);
    expect((await get(ZIP_URL)).statusCode).toBe(200);
  });
});

describe('GET full-db.zip', () => {
  it('503 full_db_disabled after authentication when the switch is not true', async () => {
    for (const v of [undefined, '', 'false', '1']) {
      if (v === undefined) delete process.env.ARGOS_I_FULL_DB_ENABLED;
      else process.env.ARGOS_I_FULL_DB_ENABLED = v;
      const res = await get(ZIP_URL);
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ error: 'full_db_disabled' });
    }
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.logFullDbRejected).toHaveBeenCalledWith('disabled');
  });

  it('200 streams the ZIP with the contract headers and no Content-Length', async () => {
    const res = await get(ZIP_URL);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toBe('attachment; filename="argos-i-full-db_20261029T031245Z.zip"');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-argos-i-dump-generated-at']).toBe('2026-10-29T03:12:45.000Z');
    expect(res.headers['content-length']).toBeUndefined();
    expect(res.headers['etag']).toBeUndefined();
    expect(res.headers['accept-ranges']).toBeUndefined();
    expect(res.rawPayload.toString()).toBe('PK-fake-zip-bytes');
    expect(h.openFullDbDump).toHaveBeenCalledWith({ tables: undefined });
    expect(abort).not.toHaveBeenCalled();
  });

  it('passes a validated tables list (deduplicated) to the service', async () => {
    const res = await get(`${ZIP_URL}?tables=articles,companies,articles`);
    expect(res.statusCode).toBe(200);
    expect(h.openFullDbDump).toHaveBeenCalledWith({ tables: ['articles', 'companies'] });
  });

  it.each(['users', 'articles,users', 'Bad-Name', '1abc', 'a;drop table x', '', ',,', 'audit_logs', 'argos_i_export_files', `x${'a'.repeat(70)}`])('400 invalid_tables for tables=%s without calling the service', async (value) => {
    const res = await get(`${ZIP_URL}?tables=${encodeURIComponent(value)}`);
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('invalid_tables');
    expect(Array.isArray(body.unknown)).toBe(true);
    for (const n of body.unknown) expect(n.length).toBeLessThanOrEqual(64);
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.logFullDbRejected).toHaveBeenCalledWith('invalid_tables');
  });

  it('400 invalid_tables when the service reports unknown tables', async () => {
    h.openFullDbDump.mockResolvedValue({ ok: false, reason: 'invalid_tables', unknown: ['nope'] });
    const res = await get(`${ZIP_URL}?tables=nope`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_tables', unknown: ['nope'] });
  });

  it('409 full_db_in_progress with Retry-After when a dump is running', async () => {
    h.openFullDbDump.mockResolvedValue({ ok: false, reason: 'in_progress' });
    const res = await get(ZIP_URL);
    expect(res.statusCode).toBe(409);
    expect(res.headers['retry-after']).toBe('60');
    expect(res.json()).toEqual({ error: 'full_db_in_progress' });
  });

  it('500 full_db_failed hides the internal message', async () => {
    h.openFullDbDump.mockRejectedValue(new Error('connect ECONNREFUSED 10.1.2.3:5432 password=hunter2'));
    const res = await get(ZIP_URL);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'full_db_failed' });
    expect(res.body).not.toContain('ECONNREFUSED');
    expect(res.body).not.toContain('hunter2');
  });

  it('HEAD answers 200 with headers only and never touches the service', async () => {
    const res = await app.inject({ method: 'HEAD', url: ZIP_URL, headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="argos-i-full-db_\d{8}T\d{6}Z\.zip"$/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toBe('');
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.getFullDbPreview).not.toHaveBeenCalled();
  });

  it('HEAD with the switch off is 503, unauthenticated HEAD is 401', async () => {
    expect((await app.inject({ method: 'HEAD', url: ZIP_URL, headers: {} })).statusCode).toBe(401);
    process.env.ARGOS_I_FULL_DB_ENABLED = 'false';
    expect((await app.inject({ method: 'HEAD', url: ZIP_URL, headers: auth })).statusCode).toBe(503);
  });
});

describe('GET full-db/manifest', () => {
  it('200 JSON with no-store, available even when the switch is off (enabled:false)', async () => {
    process.env.ARGOS_I_FULL_DB_ENABLED = 'false';
    const res = await get(MANIFEST_URL);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['etag']).toBeUndefined();
    expect(res.json().enabled).toBe(false);
    expect(h.getFullDbPreview).toHaveBeenCalledWith({ exact: false });
    expect(h.openFullDbDump).not.toHaveBeenCalled();
  });

  it('passes exact=true through', async () => {
    const res = await get(`${MANIFEST_URL}?exact=true`);
    expect(res.json().exact).toBe(true);
    expect(h.getFullDbPreview).toHaveBeenCalledWith({ exact: true });
  });

  it('500 full_db_preview_failed on a database failure, without the internal message', async () => {
    h.getFullDbPreview.mockRejectedValue(new Error('relation does not exist'));
    const res = await get(MANIFEST_URL);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'full_db_preview_failed' });
  });
});

describe('route precedence: the static full-db paths beat the existing parameter routes', () => {
  it('full-db.zip reaches its own handler, not the {date}.zip parser (no invalid_date)', async () => {
    const res = await get(ZIP_URL);
    expect(res.statusCode).toBe(200);
    expect(h.openFullDbDump).toHaveBeenCalledTimes(1);
    expect(h.getBundleMeta).not.toHaveBeenCalled();
  });

  it('full-db/manifest reaches its own handler, not {date}/{file} (no invalid_date / invalid_file)', async () => {
    const res = await get(MANIFEST_URL);
    expect(res.statusCode).toBe(200);
    expect(h.getFullDbPreview).toHaveBeenCalledTimes(1);
    expect(h.getBundleFile).not.toHaveBeenCalled();
  });

  it('even with the switch off, full-db.zip answers full_db_disabled rather than invalid_date', async () => {
    process.env.ARGOS_I_FULL_DB_ENABLED = 'false';
    const res = await get(ZIP_URL);
    expect(res.json()).toEqual({ error: 'full_db_disabled' });
  });

  it('existing routes are unchanged: latest.zip, {date}.zip, {date}/{file}, /manifest', async () => {
    expect(await get('/api/argos-i/export/latest.zip')).toMatchObject({ statusCode: 404 });
    expect((await get('/api/argos-i/export/latest.zip')).json()).toEqual({ error: 'no_bundle' });
    expect((await get('/api/argos-i/export/2026-13-40.zip')).json()).toEqual({ error: 'invalid_date' });
    expect((await get('/api/argos-i/export/nonsense.txt')).json()).toEqual({ error: 'not_found' });
    expect((await get('/api/argos-i/export/2026-10-29.zip')).json()).toEqual({ error: 'not_found' });
    expect((await get('/api/argos-i/export/2026-13-40/manifest.json')).json()).toEqual({ error: 'invalid_date' });
    expect((await get('/api/argos-i/export/2026-10-29/evil.exe')).json()).toEqual({ error: 'invalid_file' });
    expect((await get('/api/argos-i/export/2026-10-29/manifest.json')).json()).toEqual({ error: 'not_found' });
    expect((await get('/api/argos-i/manifest')).statusCode).toBe(200);
    expect(h.openFullDbDump).not.toHaveBeenCalled();
    expect(h.getFullDbPreview).not.toHaveBeenCalled();
  });
});

describe('secrets', () => {
  it('neither the token nor the Authorization header appear in any response body or log line', async () => {
    const responses = [
      await get(ZIP_URL),
      await get(ZIP_URL, { authorization: `Bearer ${TOKEN}x` }),
      await get(`${ZIP_URL}?tables=users`),
      await get(MANIFEST_URL),
      await get(`${MANIFEST_URL}?token=${TOKEN}`, {}),
    ];
    h.openFullDbDump.mockResolvedValue({ ok: false, reason: 'in_progress' });
    responses.push(await get(ZIP_URL));
    for (const r of responses) {
      expect(r.body).not.toContain(TOKEN);
      expect(sha(r.rawPayload)).toBeTruthy();
    }
    const all = logs.join('\n');
    expect(all).not.toContain(TOKEN);
    expect(all.toLowerCase()).not.toContain('authorization: bearer');
  });
});

describe('parseTablesParam', () => {
  it('accepts undefined, trims and dedupes, rejects arrays with bad members', () => {
    expect(parseTablesParam(undefined)).toEqual({ ok: true, tables: undefined });
    expect(parseTablesParam(' a , b,a')).toEqual({ ok: true, tables: ['a', 'b'] });
    expect(parseTablesParam(['a', 'b,c'])).toEqual({ ok: true, tables: ['a', 'b', 'c'] });
    expect(parseTablesParam('a,users')).toEqual({ ok: false, unknown: ['users'] });
    expect(parseTablesParam('')).toEqual({ ok: false, unknown: [] });
  });
});
