/**
 * /api/argos-i/* (토큰) 과 /api/admin/argos-i/* (admin) — 인증 순서, manifest, ZIP, 단일 파일, ETag/304, HEAD, 라우팅 우선순위, 레이트 리밋, 관리자 가드
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { unzipSync } from 'fflate';
import { createHash } from 'crypto';

const h = vi.hoisted(() => ({
  listBundles: vi.fn(),
  getBundleMeta: vi.fn(),
  getBundleFile: vi.fn(),
  getBundleFiles: vi.fn(),
  startArgosIExportGeneration: vi.fn(),
  getArgosIExportRunStatus: vi.fn(),
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
vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u1', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', role: 'viewer', permissions: [] } : t === 'analyst' ? { userId: 'u3', role: 'analyst', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { argosIAdminRoutes, argosIRoutes } from '../../routes/argos-i.js';
import { __resetArgosIAuthStateForTests, AUTH_FAIL_LIMIT } from '../../routes/argos-i-export-auth.js';
import { toBundleSummary, type BundleMeta, type StoredFile } from '../../services/argos-i-export.service.js';

const TOKEN = 'test-token-0123456789abcdef0123456789abcdef';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

const mkMeta = (date: string, over: Partial<BundleMeta> = {}): BundleMeta => ({
  date, status: 'ok', schemaVersion: 1, generatedAt: `${date}T00:00:00.000Z`, asOf: `${date}T00:00:00.000Z`, reason: 'cron', fileCount: 3, totalBytes: 30,
  bundleSha256: sha(date), durationMs: 10, warnings: [], ...over,
});
const mkFile = (path: string, text: string, format: 'md' | 'json' = 'md'): StoredFile => {
  const content = Buffer.from(text);
  return { path, area: null, format, content, sha256: sha(content), byteSize: content.length, recordCount: null };
};

const FILES = [mkFile('README.md', '# readme\n'), mkFile('manifest.json', '{"a":1}\n', 'json'), mkFile('videos.json', '{"v":1}\n', 'json')];

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
  await app.register(argosIRoutes, { prefix: '/api/argos-i' });
  await app.register(argosIAdminRoutes, { prefix: '/api/admin/argos-i' });
  await app.ready();
});
afterAll(async () => app.close());

const saved = { ...process.env };
beforeEach(() => {
  __resetArgosIAuthStateForTests();
  process.env.ARGOS_I_EXPORT_TOKEN = TOKEN;
  delete process.env.ARGOS_I_EXPORT_TOKEN_NEXT;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  h.listBundles.mockReset().mockResolvedValue([]);
  h.getBundleMeta.mockReset().mockResolvedValue(null);
  h.getBundleFile.mockReset().mockResolvedValue(null);
  h.getBundleFiles.mockReset().mockResolvedValue([]);
  h.startArgosIExportGeneration.mockReset().mockResolvedValue({ started: true, date: '2026-10-29', startedAt: '2026-10-28T22:00:00.000Z' });
  h.getArgosIExportRunStatus.mockReset().mockResolvedValue({ running: false, phase: 'idle', current: null, lastRun: null, latest: null, bundles: [], config: { tokenConfigured: true } });
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const auth = { authorization: `Bearer ${TOKEN}` };
const get = (url: string, headers: Record<string, string> = auth) => app.inject({ method: 'GET', url, headers });

describe('authentication comes before existence checks', () => {
  const urls = ['/api/argos-i/manifest', '/api/argos-i/export/latest.zip', '/api/argos-i/export/2026-10-29.zip', '/api/argos-i/export/2026-10-29/manifest.json', '/api/argos-i/export/1999-01-01/videos.json', '/api/argos-i/export/2026-13-40.zip'];

  it.each(urls)('%s -> 503 when the token is not configured', async (url) => {
    delete process.env.ARGOS_I_EXPORT_TOKEN;
    const res = await get(url);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'argos_i_export_disabled' });
  });

  it.each(urls)('%s -> 401 without a header or with a wrong token (never 404/400, even for nonexistent dates)', async (url) => {
    for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: TOKEN }]) {
      const res = await get(url, headers);
      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
      expect(res.json()).toEqual({ error: 'Unauthorized' });
    }
    expect(h.listBundles).not.toHaveBeenCalled();
    expect(h.getBundleMeta).not.toHaveBeenCalled();
    expect(h.getBundleFile).not.toHaveBeenCalled();
  });

  it('a token in the query string or X-Ingest-Key is rejected', async () => {
    expect((await get(`/api/argos-i/manifest?token=${TOKEN}`, {})).statusCode).toBe(401);
    expect((await get('/api/argos-i/manifest', { 'x-ingest-key': TOKEN })).statusCode).toBe(401);
  });

  it('error bodies never contain the token', async () => {
    const res = await get('/api/argos-i/manifest', { authorization: `Bearer ${TOKEN}x` });
    expect(res.body).not.toContain(TOKEN);
  });

  it('after 30 failed attempts further failures get 429 + Retry-After, but the valid token is unaffected', async () => {
    for (let i = 0; i < AUTH_FAIL_LIMIT; i++) expect((await get('/api/argos-i/manifest', { authorization: 'Bearer nope' })).statusCode).toBe(401);
    const limited = await get('/api/argos-i/manifest', { authorization: 'Bearer nope' });
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect((await get('/api/argos-i/manifest')).statusCode).toBe(200);
  });
});

describe('GET /manifest', () => {
  it('200 with latest:null and bundles:[] when there is no bundle', async () => {
    const res = await get('/api/argos-i/manifest');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    const body = res.json();
    expect(body).toMatchObject({ schemaVersion: 1, timezone: 'Asia/Seoul', retentionDays: 30, latest: null, bundles: [], scheduleHint: { generateCronKst: '07:00', recommendedPullAfterKst: '08:00' } });
    expect(new Date(body.serverTime).toISOString()).toBe(body.serverTime);
  });

  it('lists the newest first with relative URLs, latest = first, at most 30', async () => {
    const metas = Array.from({ length: 30 }, (_v, i) => mkMeta(`2026-10-${String(29 - i).padStart(2, '0')}`));
    h.listBundles.mockResolvedValue(metas);
    const body = (await get('/api/argos-i/manifest')).json();
    expect(h.listBundles).toHaveBeenCalledWith(30);
    expect(body.bundles).toHaveLength(30);
    expect(body.latest).toEqual(body.bundles[0]);
    expect(body.latest).toEqual({
      date: '2026-10-29', generatedAt: '2026-10-29T00:00:00.000Z', asOf: '2026-10-29T00:00:00.000Z', status: 'ok', reason: 'cron', fileCount: 3, totalBytes: 30,
      bundleSha256: sha('2026-10-29'), manifestUrl: '/api/argos-i/export/2026-10-29/manifest.json', zipUrl: '/api/argos-i/export/2026-10-29.zip',
    });
    expect(body.bundles.map((b: any) => b.date)).toEqual([...body.bundles.map((b: any) => b.date)].sort().reverse());
  });

  it('ETag is stable across calls (serverTime excluded) and If-None-Match returns 304', async () => {
    h.listBundles.mockResolvedValue([mkMeta('2026-10-29')]);
    const a = await get('/api/argos-i/manifest');
    const b = await get('/api/argos-i/manifest');
    expect(a.headers.etag).toMatch(/^"[0-9a-f]{64}"$/);
    expect(b.headers.etag).toBe(a.headers.etag);
    const cached = await get('/api/argos-i/manifest', { ...auth, 'if-none-match': a.headers.etag as string });
    expect(cached.statusCode).toBe(304);
    expect(cached.body).toBe('');
    // 재생성으로 bundleSha256 이 바뀌면 ETag 도 바뀐다
    h.listBundles.mockResolvedValue([mkMeta('2026-10-29', { bundleSha256: sha('changed') })]);
    expect((await get('/api/argos-i/manifest')).headers.etag).not.toBe(a.headers.etag);
    expect(a.headers['cache-control']).toBe('private, no-cache');
    expect(a.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('ZIP downloads', () => {
  it('latest.zip -> 404 no_bundle when nothing exists', async () => {
    const res = await get('/api/argos-i/export/latest.zip');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'no_bundle' });
  });

  it('latest.zip is a valid ZIP with argos-i/<date>/ entries whose sha256 match, plus the headers', async () => {
    h.listBundles.mockResolvedValue([mkMeta('2026-10-29')]);
    h.getBundleFiles.mockResolvedValue(FILES);
    const res = await app.inject({ method: 'GET', url: '/api/argos-i/export/latest.zip', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toBe('attachment; filename="argos-i_2026-10-29.zip"');
    expect(res.headers['x-argos-i-export-date']).toBe('2026-10-29');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-length']).toBe(String(res.rawPayload.length));
    expect(res.headers.etag).toBe(`W/"${sha('2026-10-29')}"`);
    const entries = unzipSync(new Uint8Array(res.rawPayload));
    expect(Object.keys(entries)).toEqual(['argos-i/2026-10-29/README.md', 'argos-i/2026-10-29/manifest.json', 'argos-i/2026-10-29/videos.json']);
    for (const f of FILES) expect(sha(Buffer.from(entries[`argos-i/2026-10-29/${f.path}`]!))).toBe(f.sha256);
  });

  it('{date}.zip: 400 for malformed / nonexistent calendar dates, 404 for unknown or out-of-retention dates, 200 otherwise', async () => {
    for (const bad of ['2026-13-40', '2026-02-30', '20261029', 'abc', '2026-1-1']) {
      const res = await get(`/api/argos-i/export/${bad}.zip`);
      expect(res.statusCode, bad).toBe(400);
      expect(res.json()).toEqual({ error: 'invalid_date' });
    }
    expect((await get('/api/argos-i/export/2026-10-29.zip')).statusCode).toBe(404);
    expect((await get('/api/argos-i/export/2026-10-29.zip')).json()).toEqual({ error: 'not_found' });
    h.getBundleMeta.mockResolvedValue(mkMeta('2026-10-28'));
    h.getBundleFiles.mockResolvedValue(FILES);
    const ok = await get('/api/argos-i/export/2026-10-28.zip');
    expect(ok.statusCode).toBe(200);
    expect(h.getBundleMeta).toHaveBeenLastCalledWith('2026-10-28');
    expect(Object.keys(unzipSync(new Uint8Array(ok.rawPayload)))[0]).toBe('argos-i/2026-10-28/README.md');
    expect((await get('/api/argos-i/export/2026-10-28')).statusCode).toBe(404); // .zip 접미사 없음
  });

  it('the static latest.zip route wins over the :name parameter route', async () => {
    h.listBundles.mockResolvedValue([mkMeta('2026-10-29')]);
    h.getBundleFiles.mockResolvedValue(FILES);
    await get('/api/argos-i/export/latest.zip');
    expect(h.listBundles).toHaveBeenCalledWith(1);
    expect(h.getBundleMeta).not.toHaveBeenCalled();
  });

  it('If-None-Match with the weak ETag returns 304 without building the ZIP; HEAD returns headers only', async () => {
    h.getBundleMeta.mockResolvedValue(mkMeta('2026-10-28'));
    h.getBundleFiles.mockResolvedValue(FILES);
    const etag = `W/"${sha('2026-10-28')}"`;
    const cached = await get('/api/argos-i/export/2026-10-28.zip', { ...auth, 'if-none-match': etag });
    expect(cached.statusCode).toBe(304);
    expect(h.getBundleFiles).not.toHaveBeenCalled();
    const head = await app.inject({ method: 'HEAD', url: '/api/argos-i/export/2026-10-28.zip', headers: auth });
    expect(head.statusCode).toBe(200);
    expect(head.headers['content-type']).toBe('application/zip');
    expect(head.headers.etag).toBe(etag);
    expect(head.body).toBe('');
    expect(h.getBundleFiles).not.toHaveBeenCalled();
  });

  it('at most 2 ZIPs are assembled concurrently; the third gets 503 Retry-After: 5', async () => {
    h.getBundleMeta.mockResolvedValue(mkMeta('2026-10-28'));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    h.getBundleFiles.mockImplementation(async () => { await gate; return FILES; });
    const a = get('/api/argos-i/export/2026-10-28.zip');
    const b = get('/api/argos-i/export/2026-10-28.zip');
    await vi.waitFor(() => expect(h.getBundleFiles).toHaveBeenCalledTimes(2));
    const c = await get('/api/argos-i/export/2026-10-28.zip');
    expect(c.statusCode).toBe(503);
    expect(c.headers['retry-after']).toBe('5');
    release();
    expect((await a).statusCode).toBe(200);
    expect((await b).statusCode).toBe(200);
    expect((await get('/api/argos-i/export/2026-10-28.zip')).statusCode).toBe(200);
  });
});

describe('GET /export/{date}/{file}', () => {
  it('serves a file with Content-Type, Content-Length, strong ETag(sha256), nosniff and Cache-Control', async () => {
    const f = mkFile('videos.json', '{"v":1}\n', 'json');
    h.getBundleFile.mockResolvedValue(f);
    const res = await get('/api/argos-i/export/2026-10-28/videos.json');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(res.headers['content-length']).toBe(String(f.byteSize));
    expect(res.headers.etag).toBe(`"${f.sha256}"`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('private, no-cache');
    expect(res.headers['content-disposition']).toBe('attachment; filename="videos.json"');
    expect(res.rawPayload.equals(f.content)).toBe(true);
    expect(h.getBundleFile).toHaveBeenCalledWith('2026-10-28', 'videos.json');
    const md = mkFile('README.md', '# r\n');
    h.getBundleFile.mockResolvedValue(md);
    expect((await get('/api/argos-i/export/2026-10-28/README.md')).headers['content-type']).toBe('text/markdown; charset=utf-8');
  });

  it('If-None-Match matching the ETag -> 304 (after authentication)', async () => {
    const f = mkFile('manifest.json', '{"a":1}\n', 'json');
    h.getBundleFile.mockResolvedValue(f);
    const res = await get('/api/argos-i/export/2026-10-28/manifest.json', { ...auth, 'if-none-match': `"${f.sha256}"` });
    expect(res.statusCode).toBe(304);
    expect(res.body).toBe('');
    expect((await get('/api/argos-i/export/2026-10-28/manifest.json', { 'if-none-match': `"${f.sha256}"` })).statusCode).toBe(401);
    expect((await get('/api/argos-i/export/2026-10-28/manifest.json', { ...auth, 'if-none-match': '"other"' })).statusCode).toBe(200);
  });

  it('HEAD works and returns the headers without a body', async () => {
    const f = mkFile('videos.md', '# v\n');
    h.getBundleFile.mockResolvedValue(f);
    const res = await app.inject({ method: 'HEAD', url: '/api/argos-i/export/2026-10-28/videos.md', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.headers.etag).toBe(`"${f.sha256}"`);
    expect(res.body).toBe('');
  });

  it.each([
    ['..%2Fetc%2Fpasswd'], ['%2e%2e%2fmanifest.json'], ['a%00b.json'], ['VIDEOS.JSON'], ['Manifest.json'], ['README.MD'], ['a%2Fb.json'], ['videos.txt'],
    ['-videos.json'], ['videos.json.bak'], ['a b.json'], [`${'a'.repeat(60)}.json`],
  ])('rejects the file name %s with 400 invalid_file (nothing is read)', async (file) => {
    const res = await get(`/api/argos-i/export/2026-10-28/${file}`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_file' });
    expect(h.getBundleFile).not.toHaveBeenCalled();
  });

  it('404 for a file or date that does not exist, 400 invalid_date for malformed dates', async () => {
    expect((await get('/api/argos-i/export/2026-10-28/videos.json')).statusCode).toBe(404);
    expect((await get('/api/argos-i/export/2026-10-28/videos.json')).json()).toEqual({ error: 'not_found' });
    const bad = await get('/api/argos-i/export/2026-13-40/videos.json');
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ error: 'invalid_date' });
  });
});

describe('admin routes (adminOnly)', () => {
  const post = (body: unknown, token?: string) =>
    app.inject({ method: 'POST', url: '/api/admin/argos-i/export/generate', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, payload: body === undefined ? undefined : JSON.stringify(body) });
  const status = (token?: string) => app.inject({ method: 'GET', url: '/api/admin/argos-i/export/status', headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('401 without a JWT (the ARGOS_I export token does not work here), 403 for viewer/analyst', async () => {
    expect((await post({})).statusCode).toBe(401);
    expect((await post({}, TOKEN)).statusCode).toBe(401);
    expect((await status()).statusCode).toBe(401);
    expect((await status(TOKEN)).statusCode).toBe(401);
    for (const role of ['viewer', 'analyst']) {
      expect((await post({}, role)).statusCode).toBe(403);
      expect((await status(role)).statusCode).toBe(403);
    }
    expect(h.startArgosIExportGeneration).not.toHaveBeenCalled();
  });

  it('202 for admin (empty body or {}), 409 while running, 400 invalid_body for extra keys', async () => {
    const ok = await post({}, 'admin');
    expect(ok.statusCode).toBe(202);
    expect(ok.json()).toEqual({ started: true, date: '2026-10-29', startedAt: '2026-10-28T22:00:00.000Z' });
    expect(h.startArgosIExportGeneration).toHaveBeenCalledWith({ reason: 'manual' });
    expect((await post(undefined, 'admin')).statusCode).toBe(202);
    h.startArgosIExportGeneration.mockResolvedValue({ started: false, skipped: 'already_running', date: '2026-10-29' });
    const busy = await post({}, 'admin');
    expect(busy.statusCode).toBe(409);
    expect(busy.json()).toEqual({ error: 'already_running' });
    h.startArgosIExportGeneration.mockClear();
    const bad = await post({ date: '2026-01-01' }, 'admin');
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ error: 'invalid_body' });
    expect(h.startArgosIExportGeneration).not.toHaveBeenCalled();
  });

  it('status returns the service snapshot and its serialization never contains the token', async () => {
    process.env.ARGOS_I_EXPORT_TOKEN = 'tok-secret-xyz-0123456789abcdef0123456789abcdef';
    process.env.ARGOS_I_EXPORT_TOKEN_NEXT = 'tok-secret-next-0123456789abcdef0123456789abcdef';
    const res = await status('admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ running: false, phase: 'idle' });
    expect(res.body).not.toContain('tok-secret');
  });
});

describe('toBundleSummary', () => {
  it('builds the relative manifest/zip URLs', () => {
    expect(toBundleSummary(mkMeta('2026-10-29')).zipUrl).toBe('/api/argos-i/export/2026-10-29.zip');
  });
});
