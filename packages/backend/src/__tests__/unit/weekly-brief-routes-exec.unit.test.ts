/**
 * v3 관리자 라우트 — 권한(403/401), 입력 검증, 오류 코드(400 invalid_edit / 404 / 409 / 422), 사용자 API 는 초안을 건드리지 않음
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const h = vi.hoisted(() => ({
  getLatestBrief: vi.fn(),
  getBriefByWeek: vi.fn(),
  listBriefs: vi.fn(),
  startWeeklyBriefGeneration: vi.fn(),
  getWeeklyBriefRunStatus: vi.fn(),
  listDrafts: vi.fn(),
  getAdminEdits: vi.fn(),
  saveEdits: vi.fn(),
  publishDraft: vi.fn(),
  unpublishDraft: vi.fn(),
}));

vi.mock('../../services/weekly-brief.service.js', () => ({ ...h }));
vi.mock('../../services/auth.service.js', () => ({
  authService: {
    verifyToken: (t: string) => (t === 'admin' ? { userId: 'u1', email: 'admin@example.com', role: 'admin', permissions: [] } : t === 'viewer' ? { userId: 'u2', email: 'v@example.com', role: 'viewer', permissions: [] } : null),
    hasRole: (role: string, roles: string[]) => roles.includes(role),
    hasPermission: () => true,
    logAction: async () => {},
  },
}));

import { weeklyBriefAdminRoutes, weeklyBriefRoutes } from '../../routes/weekly-brief.js';

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
  await app.register(weeklyBriefRoutes, { prefix: '/api/weekly-brief' });
  await app.register(weeklyBriefAdminRoutes, { prefix: '/api/admin/weekly-brief' });
  await app.ready();
});
afterAll(async () => app.close());

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.getLatestBrief.mockResolvedValue(null);
  h.getBriefByWeek.mockResolvedValue(null);
  h.listBriefs.mockResolvedValue([]);
});

const auth = (token?: string) => (token ? { authorization: `Bearer ${token}` } : {});
const call = (method: 'GET' | 'POST' | 'PATCH', url: string, token?: string, payload?: unknown) => app.inject({ method, url, headers: auth(token), ...(payload !== undefined ? { payload: payload as object } : {}) });

const W = '2026-10-19';
const adminUrls: [string, string][] = [
  ['GET', '/api/admin/weekly-brief/drafts'],
  ['GET', `/api/admin/weekly-brief/${W}/edits`],
  ['PATCH', `/api/admin/weekly-brief/${W}/edits`],
  ['POST', `/api/admin/weekly-brief/${W}/publish`],
  ['POST', `/api/admin/weekly-brief/${W}/unpublish`],
];

describe('authorization', () => {
  it.each(adminUrls)('%s %s: no token => 401, viewer => 403, and the service is never called', async (method, url) => {
    const body = method === 'GET' ? undefined : { rev: 0, edits: {} };
    expect((await call(method as any, url, undefined, body)).statusCode).toBe(401);
    expect((await call(method as any, url, 'viewer', body)).statusCode).toBe(403);
    for (const f of [h.listDrafts, h.getAdminEdits, h.saveEdits, h.publishDraft, h.unpublishDraft]) expect(f).not.toHaveBeenCalled();
  });
});

describe('GET drafts / edits', () => {
  it('lists drafts for admin', async () => {
    h.listDrafts.mockResolvedValue([{ weekStart: W, status: 'ok', publishState: 'draft', hasUnpublishedChanges: true, generatedAt: 'x', publishedAt: null, ageHours: 3 }]);
    const r = await call('GET', '/api/admin/weekly-brief/drafts', 'admin');
    expect(r.statusCode).toBe(200);
    expect(r.json().items[0]).toMatchObject({ weekStart: W, publishState: 'draft' });
  });

  it('edits: 400 for a bad week, 404 when no draft, 200 with the payload', async () => {
    expect((await call('GET', '/api/admin/weekly-brief/2026-10-20/edits', 'admin')).statusCode).toBe(400); // not a Monday
    h.getAdminEdits.mockResolvedValue({ ok: false, error: 'not_found' });
    expect((await call('GET', `/api/admin/weekly-brief/${W}/edits`, 'admin')).json()).toEqual({ error: 'not_found' });
    h.getAdminEdits.mockResolvedValue({ ok: true, value: { weekStart: W, rev: 0 } });
    expect((await call('GET', `/api/admin/weekly-brief/${W}/edits`, 'admin')).json()).toEqual({ weekStart: W, rev: 0 });
  });
});

describe('PATCH edits', () => {
  const url = `/api/admin/weekly-brief/${W}/edits`;

  it('200 with rev, editedAt and warnings; the editor identity comes from the token', async () => {
    h.saveEdits.mockResolvedValue({ ok: true, rev: 1, editedAt: '2026-10-26T00:00:00.000Z', warnings: [{ path: 'a', codes: ['ending'] }] });
    const r = await call('PATCH', url, 'admin', { rev: 0, edits: { 'conclusions.c1.lines.0': '문장입니다.', 'conclusions.c1.lines.1': null } });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ rev: 1, editedAt: '2026-10-26T00:00:00.000Z', warnings: [{ path: 'a', codes: ['ending'] }] });
    expect(h.saveEdits).toHaveBeenCalledWith(W, { rev: 0, edits: { 'conclusions.c1.lines.0': '문장입니다.', 'conclusions.c1.lines.1': null }, by: 'admin@example.com' });
  });

  it.each([
    [{ rev: 0 }],
    [{ edits: {} }],
    [{ rev: -1, edits: {} }],
    [{ rev: 0, edits: { a: 5 } }],
    [{ rev: 0, edits: {}, extra: true }],
  ])('400 invalid_body for %j', async (body) => {
    const r = await call('PATCH', url, 'admin', body);
    expect(r.statusCode).toBe(400);
    expect(r.json()).toEqual({ error: 'invalid_body' });
    expect(h.saveEdits).not.toHaveBeenCalled();
  });

  it('maps service errors: invalid_edit => 400 with code and path, rev_conflict => 409, not_found => 404', async () => {
    h.saveEdits.mockResolvedValueOnce({ ok: false, error: 'invalid_edit', code: 'too_long', path: 'x' });
    expect(await call('PATCH', url, 'admin', { rev: 0, edits: { x: 'y' } }).then((r) => [r.statusCode, r.json()])).toEqual([400, { error: 'invalid_edit', code: 'too_long', path: 'x' }]);
    h.saveEdits.mockResolvedValueOnce({ ok: false, error: 'rev_conflict' });
    expect(await call('PATCH', url, 'admin', { rev: 0, edits: {} }).then((r) => [r.statusCode, r.json()])).toEqual([409, { error: 'rev_conflict' }]);
    h.saveEdits.mockResolvedValueOnce({ ok: false, error: 'not_found' });
    expect((await call('PATCH', url, 'admin', { rev: 0, edits: {} })).statusCode).toBe(404);
  });
});

describe('POST publish / unpublish / generate', () => {
  it('publish: 200, 409 rev_conflict, 404, 422 guard_failed with violations, 400 for a bad body', async () => {
    const url = `/api/admin/weekly-brief/${W}/publish`;
    h.publishDraft.mockResolvedValueOnce({ ok: true, publishState: 'published', publishedAt: 't', changed: true });
    expect(await call('POST', url, 'admin', { rev: 2 }).then((r) => [r.statusCode, r.json()])).toEqual([200, { publishState: 'published', publishedAt: 't' }]);
    expect(h.publishDraft).toHaveBeenCalledWith(W, { rev: 2, by: 'admin@example.com' });
    h.publishDraft.mockResolvedValueOnce({ ok: false, error: 'rev_conflict' });
    expect((await call('POST', url, 'admin', { rev: 2 })).statusCode).toBe(409);
    h.publishDraft.mockResolvedValueOnce({ ok: false, error: 'not_found' });
    expect((await call('POST', url, 'admin', { rev: 2 })).statusCode).toBe(404);
    h.publishDraft.mockResolvedValueOnce({ ok: false, error: 'guard_failed', violations: [{ path: 'p', code: 'forbidden_char' }] });
    expect(await call('POST', url, 'admin', { rev: 2 }).then((r) => [r.statusCode, r.json()])).toEqual([422, { error: 'guard_failed', violations: [{ path: 'p', code: 'forbidden_char' }] }]);
    expect((await call('POST', url, 'admin', { nope: 1 })).statusCode).toBe(400);
  });

  it('unpublish: 200 / 404', async () => {
    const url = `/api/admin/weekly-brief/${W}/unpublish`;
    h.unpublishDraft.mockResolvedValueOnce({ ok: true, publishState: 'draft', changed: true });
    expect(await call('POST', url, 'admin').then((r) => [r.statusCode, r.json()])).toEqual([200, { publishState: 'draft' }]);
    h.unpublishDraft.mockResolvedValueOnce({ ok: false, error: 'not_found' });
    expect((await call('POST', url, 'admin')).statusCode).toBe(404);
  });

  it('generate: discardEdits is passed through; has_edits => 409', async () => {
    h.startWeeklyBriefGeneration.mockResolvedValueOnce({ started: true, weekStart: W, force: true, startedAt: 's' });
    const r = await call('POST', '/api/admin/weekly-brief/generate', 'admin', { weekStart: W, force: true, discardEdits: true });
    expect(r.statusCode).toBe(202);
    expect(h.startWeeklyBriefGeneration).toHaveBeenCalledWith({ weekStart: W, force: true, discardEdits: true, actor: 'admin@example.com' });
    h.startWeeklyBriefGeneration.mockResolvedValueOnce({ started: false, skipped: 'has_edits', weekStart: W });
    const c = await call('POST', '/api/admin/weekly-brief/generate', 'admin', { weekStart: W, force: true });
    expect([c.statusCode, c.json()]).toEqual([409, { error: 'has_edits' }]);
    expect((await call('POST', '/api/admin/weekly-brief/generate', 'admin', { discardEdits: 'yes' })).statusCode).toBe(400);
  });
});

describe('user APIs only read published briefs', () => {
  it('never call any draft function and expose no publish metadata; a missing published brief is a plain 404', async () => {
    const latest = await call('GET', '/api/weekly-brief/latest', 'viewer');
    expect([latest.statusCode, latest.json()]).toEqual([404, { error: 'not_found' }]);
    expect((await call('GET', `/api/weekly-brief/${W}`, 'viewer')).statusCode).toBe(404);
    expect((await call('GET', '/api/weekly-brief', 'viewer')).statusCode).toBe(200);
    for (const f of [h.listDrafts, h.getAdminEdits, h.saveEdits, h.publishDraft, h.unpublishDraft]) expect(f).not.toHaveBeenCalled();
    // 사용자 경로는 관리자 전용 경로를 가리지 않는다
    expect((await call('GET', `/api/weekly-brief/${W}/edits`, 'viewer')).statusCode).toBe(404);
  });
});
