/**
 * 처리기 단위 (가짜 서비스 주입) — add_source 4종, analyze 4종, query 5종, 결과 정제·크기 상한 (AC-19~AC-22)
 */
import { createHash } from 'crypto';
import { describe, it, expect, vi } from 'vitest';
import { createAddSourceHandler, type AddSourceDeps, type SaveArticleItem } from '../../services/argos-i-requests-handlers/add-source.js';
import { createAnalyzeHandler, type AnalyzeDeps } from '../../services/argos-i-requests-handlers/analyze.js';
import { createQueryHandler, QUERY_ITEM_CAP, type QueryDeps } from '../../services/argos-i-requests-handlers/query.js';
import { ProviderNotConfiguredError, QuotaExceededError, TargetNotAllowedError, UpstreamError } from '../../services/argos-i-requests-handlers/types.js';
import { cleanLink, cleanText, finalizeResult } from '../../services/argos-i-requests-result.js';
import { createGuardContext, guardIngestFields } from '../../services/argos-i-inbound-guard.js';
import { slugify } from '../../services/argos-i-requests-slug.js';
import { rawByArea } from '../fixtures/argos-i-export.fixture.js';

const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const HOSTS = ['youtube.com', 'youtu.be', 'arxiv.org', 'therobotreport.com'];
const guardCtx = createGuardContext({});

// ─────────────────────────────────────────────────────────────────────────────
// add_source
// ─────────────────────────────────────────────────────────────────────────────

function addSourceDeps(over: Partial<AddSourceDeps> = {}) {
  const saved: SaveArticleItem[] = [];
  const deps = {
    youtube: {
      getVideo: vi.fn(async (id: string) => ({ id, title: 'Humanoid hand demo', channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', channelTitle: 'Acme Robotics', publishedAt: '2026-10-01T00:00:00Z' })),
      getRecentUploads: vi.fn(async () => ({
        channelTitle: 'Acme Robotics',
        videos: Array.from({ length: 12 }, (_, i) => ({ id: `vid${String(i).padStart(8, '0')}`, title: `Video ${i}`, channelId: null, channelTitle: 'Acme Robotics', publishedAt: '2026-10-02T00:00:00Z' })),
      })),
    },
    arxiv: {
      getEntry: vi.fn(async (id: string) => ({ entryId: `http://arxiv.org/abs/${id}v2`, arxivId: id, title: 'Dexterous manipulation', summary: 'Abstract text', publishedAt: '2026-01-02T00:00:00Z' })),
    },
    fetchArticleMeta: vi.fn(async () => ({ title: 'Figure ships a new robot' })),
    saveArticle: vi.fn(async (item: SaveArticleItem) => {
      saved.push(item);
      return 'inserted' as const;
    }),
    guardFields: (fields: Array<{ value: unknown; kind: 'url' | 'free' }>) => guardIngestFields(fields, guardCtx),
    allowedHosts: async () => HOSTS,
    ...over,
  } satisfies AddSourceDeps;
  return { deps, saved, handler: createAddSourceHandler(deps) };
}

describe('add_source handler', () => {
  it('youtube_video: official-API meta only, video row with the crawler content hash, no body', async () => {
    const { handler, saved, deps } = addSourceDeps();
    const r = await handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' });
    expect(r).toMatchObject({ ok: true, result: { kind: 'youtube_video', inserted: 1, skipped: 0, items: [{ title: 'Humanoid hand demo', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }] } });
    expect(deps.youtube.getVideo).toHaveBeenCalledWith('dQw4w9WgXcQ');
    expect(saved[0]).toMatchObject({
      contentHash: md5('yt-video-dQw4w9WgXcQ'),
      productType: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      summary: null,
      companyHint: 'Acme Robotics',
      extractedMetadata: { videoId: 'dQw4w9WgXcQ', channel: 'Acme Robotics' },
    });
    expect(saved[0]).not.toHaveProperty('content');
  });

  it('youtube_video: duplicates are skipped, a missing video is not_found, a missing API key is provider_not_configured', async () => {
    const dup = addSourceDeps({ saveArticle: vi.fn(async () => 'skipped' as const) });
    expect(await dup.handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toMatchObject({ ok: true, result: { inserted: 0, skipped: 1 } });
    const none = addSourceDeps({ youtube: { getVideo: async () => null, getRecentUploads: async () => null } });
    expect(await none.handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toEqual({ ok: false, code: 'not_found', transient: false });
    const nokey = addSourceDeps({ youtube: { getVideo: async () => { throw new ProviderNotConfiguredError('youtube'); }, getRecentUploads: async () => null } });
    expect(await nokey.handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toEqual({ ok: false, code: 'provider_not_configured', transient: false });
  });

  it('youtube_video: quota and upstream errors are transient', async () => {
    const q = addSourceDeps({ youtube: { getVideo: async () => { throw new QuotaExceededError(); }, getRecentUploads: async () => null } });
    expect(await q.handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toEqual({ ok: false, code: 'quota_exceeded', transient: true });
    const u = addSourceDeps({ youtube: { getVideo: async () => { throw new UpstreamError(true); }, getRecentUploads: async () => null } });
    expect(await u.handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toEqual({ ok: false, code: 'upstream_error', transient: true });
  });

  it('youtube_channel: one-off, at most 10 recent videos, no subscription is created', async () => {
    const { handler, saved, deps } = addSourceDeps();
    const r = await handler.run({ kind: 'youtube_channel', id: '@robotics_lab' });
    expect(deps.youtube.getRecentUploads).toHaveBeenCalledWith('@robotics_lab', 10);
    expect(saved).toHaveLength(10);
    expect(r).toMatchObject({ ok: true, result: { kind: 'youtube_channel', inserted: 10 } });
    expect((r as any).result.items).toHaveLength(10);
  });

  it('arxiv: title/abstract/link only with the crawler content hash (md5 of the abs link)', async () => {
    const { handler, saved } = addSourceDeps();
    const r = await handler.run({ kind: 'arxiv', id: '2401.01234' });
    expect(r).toMatchObject({ ok: true, result: { kind: 'arxiv', inserted: 1, items: [{ url: 'https://arxiv.org/abs/2401.01234v2' }] } });
    expect(saved[0]).toMatchObject({ contentHash: md5('http://arxiv.org/abs/2401.01234v2'), source: 'arxiv', productType: 'none', summary: 'Abstract text', extractedMetadata: { arxivId: '2401.01234' } });
  });

  it('article_url: stores title + link only (summary null, no content); an SSRF/robots refusal is invalid_target', async () => {
    const { handler, saved, deps } = addSourceDeps();
    const r = await handler.run({ kind: 'article_url', url: 'https://www.therobotreport.com/figure-new/' });
    expect(deps.fetchArticleMeta).toHaveBeenCalledWith('https://www.therobotreport.com/figure-new/');
    expect(r).toMatchObject({ ok: true, result: { kind: 'article_url', inserted: 1, items: [{ title: 'Figure ships a new robot', url: 'https://www.therobotreport.com/figure-new/' }] } });
    expect(saved[0]).toMatchObject({ summary: null, productType: 'none', source: 'therobotreport.com', extractedMetadata: {} });
    expect(saved[0]).not.toHaveProperty('content');
    const blocked = addSourceDeps({ fetchArticleMeta: async () => { throw new TargetNotAllowedError(); } });
    expect(await blocked.handler.run({ kind: 'article_url', url: 'https://www.therobotreport.com/x' })).toEqual({ ok: false, code: 'invalid_target', transient: false });
    const empty = addSourceDeps({ fetchArticleMeta: async () => ({ title: null }) });
    expect(await empty.handler.run({ kind: 'article_url', url: 'https://www.therobotreport.com/x' })).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('applies the ingest guard to remote metadata: a title with an internal marker is not stored', async () => {
    const { handler, saved } = addSourceDeps({ youtube: { getVideo: async (id) => ({ id, title: '[대외비] roadmap', channelId: null, channelTitle: 'X', publishedAt: null }), getRecentUploads: async () => null } });
    expect(await handler.run({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toEqual({ ok: false, code: 'invalid_target', transient: false });
    expect(saved).toHaveLength(0);
  });

  it('an unknown kind is invalid_target', async () => {
    const { handler } = addSourceDeps();
    expect(await handler.run({ kind: 'github_repo' })).toMatchObject({ ok: false, code: 'invalid_target' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyze
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI = {
  task: 'Picks boxes',
  environment: 'Warehouse',
  autonomy: 'autonomous',
  robotCount: 2,
  durationSec: 30,
  capabilities: ['grasping', 'walking'],
  keyMoments: [{ timestampSec: 3, description: 'lifts a box' }],
  summaryKo: '상자를 집어 옮긴다.',
  model: 'model-id-that-must-not-leak',
  analyzedAt: '2026-11-01T00:00:00.000Z',
  technicalAnalysis: { locomotion: 'secret detail', hardware: 'x' },
};

function analyzeDeps(over: Partial<AnalyzeDeps> = {}) {
  const calls = { analyzeSingle: vi.fn(), getReport: vi.fn(), enrichRobot: vi.fn() };
  const deps: AnalyzeDeps = {
    estimates: { video: 0.1, topic: 0.3, spec: 0.01 },
    allowedHosts: async () => HOSTS,
    video: {
      isConfigured: () => true,
      analyzeSingle: async (id) => {
        calls.analyzeSingle(id);
        return { ok: true, analysis: GEMINI };
      },
      findArticleById: async (id) => ({ id, title: 'Demo', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', geminiAnalysis: null }),
      findArticleByVideoId: async (v) => ({ id: '00000000-0000-4000-8000-000000000042', title: 'Demo', url: `https://www.youtube.com/watch?v=${v}`, geminiAnalysis: null }),
    },
    specs: {
      isConfigured: () => true,
      enrichRobot: async (id) => {
        calls.enrichRobot(id);
        return { status: 'staged', fields: ['payloadKg', 'dofCount'] };
      },
    },
    catalog: {
      findCompanyBySlug: async (s) => (s === 'acme-robotics' ? { id: 'c1', name: 'Acme Robotics' } : null),
      findRobotBySlug: async (s) => (s === 'figure-02' ? { id: 'r1', name: 'Figure 02' } : null),
      robotsMissingSpecs: async (_c, limit) => Array.from({ length: Math.min(limit, 7) }, (_, i) => ({ id: `r${i}`, name: `Robot ${i}` })),
      slugOfRobot: slugify,
    },
    topic: {
      isCacheFresh: async () => false,
      getReport: async (domain, days) => {
        calls.getReport(domain, days);
        return {
          domain,
          days,
          stats: { videoCount: 3, paperCount: 2, channelCount: 2, topChannels: [{ name: 'Acme', count: 2 }], topKeywords: [{ keyword: 'gripper', count: 4 }] },
          insight: { points: Array.from({ length: 12 }, (_, i) => `point ${i} ${'x'.repeat(500)}`), cached: false },
          videos: Array.from({ length: 25 }, (_, i) => ({ title: `Video ${i}`, url: `https://www.youtube.com/watch?v=aaaaaaaaa${String(i).padStart(2, '0')}` })),
          papers: [{ title: 'Paper', url: 'https://arxiv.org/abs/2401.00001' }],
        };
      },
    },
    ...over,
  };
  return { deps, calls, handler: createAnalyzeHandler(deps) };
}

describe('analyze handler', () => {
  it('video: calls analyzeSingle only, returns a field-limited summary without the model identifier or technical detail', async () => {
    const { handler, calls } = analyzeDeps();
    const r = await handler.run({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: false });
    expect(calls.analyzeSingle).toHaveBeenCalledTimes(1);
    expect(calls.getReport).not.toHaveBeenCalled();
    expect(calls.enrichRobot).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, costUsd: 0.1, provider: 'gemini' });
    const res = (r as any).result;
    expect(res).toMatchObject({ articleId: '00000000-0000-4000-8000-000000000001', title: 'Demo', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', geminiAnalysis: { task: 'Picks boxes', autonomy: 'autonomous', summaryKo: '상자를 집어 옮긴다.' } });
    expect(JSON.stringify(res)).not.toContain('model-id-that-must-not-leak');
    expect(JSON.stringify(res)).not.toContain('secret detail');
    expect(res).not.toHaveProperty('model');
  });

  it('video: an existing analysis is returned from cache at zero cost unless force is set', async () => {
    const cachedArticle = async (id: string) => ({ id, title: 'Demo', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', geminiAnalysis: GEMINI });
    const { handler, calls } = analyzeDeps({ video: { isConfigured: () => true, analyzeSingle: async () => ({ ok: true, analysis: GEMINI }), findArticleById: cachedArticle, findArticleByVideoId: async () => null } });
    const cached = await handler.run({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: false });
    expect(cached).toMatchObject({ ok: true, costUsd: 0, provider: null });
    expect(await handler.estimate!({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: false })).toMatchObject({ costUsd: 0, provider: null });
    expect(await handler.estimate!({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: true })).toMatchObject({ costUsd: 0.1, provider: 'gemini' });
    void calls;
  });

  it('video: resolves an 11-char YouTube id via the article lookup; unknown article is not_found', async () => {
    const { handler, calls } = analyzeDeps();
    await handler.run({ target: 'video', id: 'dQw4w9WgXcQ', force: false });
    expect(calls.analyzeSingle).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000042');
    const none = analyzeDeps({ video: { isConfigured: () => true, analyzeSingle: async () => ({ ok: false, error: 'x' }), findArticleById: async () => null, findArticleByVideoId: async () => null } });
    expect(await none.handler.run({ target: 'video', id: 'dQw4w9WgXcQ', force: false })).toMatchObject({ ok: false, code: 'not_found' });
  });

  it.each([
    ['GEMINI_API_KEY not configured', 'provider_not_configured', false],
    ['Gemini 일일 쿼터 소진 — 잠시 후', 'quota_exceeded', true],
    ['Article not found', 'not_found', false],
    ['not a public YouTube video', 'invalid_target', false],
    ['Gemini analysis failed', 'upstream_error', true],
  ])('video: analyzeSingle error "%s" maps to %s (transient=%s)', async (error, code, transient) => {
    const { handler } = analyzeDeps({ video: { isConfigured: () => true, analyzeSingle: async () => ({ ok: false, error }), findArticleById: async (id) => ({ id, title: 't', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', geminiAnalysis: null }), findArticleByVideoId: async () => null } });
    expect(await handler.run({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: false })).toEqual({ ok: false, code, transient });
  });

  it('video: provider_not_configured when Gemini is not configured (no call made)', async () => {
    const { handler } = analyzeDeps({ video: { isConfigured: () => false, analyzeSingle: vi.fn() as never, findArticleById: async (id) => ({ id, title: 't', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', geminiAnalysis: null }), findArticleByVideoId: async () => null } });
    expect(await handler.run({ target: 'video', id: '00000000-0000-4000-8000-000000000001', force: false })).toMatchObject({ ok: false, code: 'provider_not_configured' });
  });

  it('topic: calls getReport only; ≤8 points of ≤400 chars; ≤20 refs with allowed https links; stats; cost from the cache flag', async () => {
    const { handler, calls } = analyzeDeps();
    const r = await handler.run({ target: 'topic', domain: 'hand', days: 30 });
    expect(calls.getReport).toHaveBeenCalledWith('hand', 30);
    expect(calls.analyzeSingle).not.toHaveBeenCalled();
    expect(calls.enrichRobot).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, costUsd: 0.3, provider: 'claude' });
    const res = (r as any).result;
    expect(res).toMatchObject({ domain: 'hand', days: 30, stats: { videoCount: 3, paperCount: 2, channelCount: 2 } });
    expect(res.insightPoints).toHaveLength(8);
    for (const p of res.insightPoints) expect(Array.from(p).length).toBeLessThanOrEqual(400);
    expect(res.refs).toHaveLength(20);
    for (const ref of res.refs) expect(ref.url).toMatch(/^https:\/\/(www\.youtube\.com|arxiv\.org)\//);
  });

  it('topic: a cached insight costs nothing; estimate reflects the cache', async () => {
    const fresh = analyzeDeps();
    fresh.deps.topic.isCacheFresh = async () => true;
    expect(await fresh.handler.estimate!({ target: 'topic', domain: 'hand', days: 30 })).toEqual({ costUsd: 0, provider: null, claude: false });
    const cached = analyzeDeps();
    const base = cached.deps.topic.getReport;
    cached.deps.topic.getReport = async (d, n) => ({ ...(await base(d, n)), insight: { points: ['p'], cached: true } });
    expect(await cached.handler.run({ target: 'topic', domain: 'hand', days: 30 })).toMatchObject({ ok: true, costUsd: 0, provider: null });
    const miss = analyzeDeps();
    expect(await miss.handler.estimate!({ target: 'topic', domain: 'hand', days: 30 })).toEqual({ costUsd: 0.3, provider: 'claude', claude: true });
  });

  it('topic: links outside the allowed hosts are dropped from refs', async () => {
    const { handler } = analyzeDeps();
    const base = analyzeDeps().deps.topic.getReport;
    const { deps } = analyzeDeps();
    deps.topic.getReport = async (d, n) => ({ ...(await base(d, n)), videos: [{ title: 'ok', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' }, { title: 'bad', url: 'https://evil.example.net/x' }, { title: 'http', url: 'http://www.youtube.com/watch?v=bbbbbbbbbbb' }], papers: [] });
    const r = await createAnalyzeHandler(deps).run({ target: 'topic', domain: 'hand', days: 30 });
    expect((r as any).result.refs.map((x: any) => x.title)).toEqual(['ok']);
    void handler;
  });

  it('robot: single-robot enrichment goes to staging only — the result has field names, never spec values', async () => {
    const { handler, calls } = analyzeDeps();
    const r = await handler.run({ target: 'robot', slug: 'figure-02' });
    expect(calls.enrichRobot).toHaveBeenCalledTimes(1);
    expect(calls.enrichRobot).toHaveBeenCalledWith('r1');
    expect(calls.analyzeSingle).not.toHaveBeenCalled();
    expect(calls.getReport).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, result: { stagedCount: 1, robots: [{ slug: 'figure-02', stagedFields: ['payloadKg', 'dofCount'] }] }, provider: 'claude' });
    // 스펙 값(숫자)은 없다 — 숫자는 건수(stagedCount)뿐이고 필드는 이름 문자열이다
    const numbers: unknown[] = [];
    JSON.stringify((r as any).result, (_k, v) => (typeof v === 'number' && numbers.push(v), v));
    expect(numbers).toEqual([1]);
  });

  it('company: at most 5 robots without specs are enriched; unknown slug is not_found; nothing to do is an empty result', async () => {
    const { handler, calls } = analyzeDeps();
    const r = await handler.run({ target: 'company', slug: 'acme-robotics' });
    expect(calls.enrichRobot).toHaveBeenCalledTimes(5);
    expect((r as any).result.stagedCount).toBe(5);
    expect((r as any).costUsd).toBeCloseTo(0.05);
    expect(await handler.run({ target: 'company', slug: 'nope' })).toMatchObject({ ok: false, code: 'not_found' });
    expect(await handler.run({ target: 'robot', slug: 'nope' })).toMatchObject({ ok: false, code: 'not_found' });
    const none = analyzeDeps();
    none.deps.catalog.robotsMissingSpecs = async () => [];
    expect(await createAnalyzeHandler(none.deps).run({ target: 'company', slug: 'acme-robotics' })).toMatchObject({ ok: true, result: { stagedCount: 0, robots: [] }, costUsd: 0 });
  });

  it('company/robot: provider_not_configured without the AI key', async () => {
    const { deps } = analyzeDeps();
    deps.specs.isConfigured = () => false;
    const h = createAnalyzeHandler(deps);
    expect(await h.run({ target: 'robot', slug: 'figure-02' })).toMatchObject({ ok: false, code: 'provider_not_configured' });
    expect(await h.run({ target: 'company', slug: 'acme-robotics' })).toMatchObject({ ok: false, code: 'provider_not_configured' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// query
// ─────────────────────────────────────────────────────────────────────────────

function queryDeps(over: Partial<QueryDeps> = {}) {
  const raw = rawByArea();
  const collect = vi.fn(async (id: 'hand-benchmark' | 'ci-changes') => (id === 'hand-benchmark' ? raw['hand-benchmark'] : raw['ci-changes']));
  const deps: QueryDeps = {
    now: () => new Date('2026-11-12T03:00:00Z'),
    collect,
    getActuatorMap: async () => ({ robots: raw['actuator-map'].robots, suppliers: raw['actuator-map'].suppliers }),
    catalog: { findCompanyBySlug: async (s) => (s === 'atlas' ? { id: 'c-atlas', name: 'Atlas' } : null) },
    recentArticles: vi.fn(async () => [
      { kind: 'news' as const, title: 'Atlas news', url: 'https://www.therobotreport.com/atlas', source: 'rss', publishedAt: '2026-11-05T00:00:00.000Z' },
      { kind: 'video' as const, title: 'Atlas video', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', source: 'YouTube', publishedAt: '2026-11-08T00:00:00.000Z' },
      { kind: 'news' as const, title: 'Atlas off-list link', url: 'https://other.example.net/a', source: 'rss', publishedAt: '2026-11-01T00:00:00.000Z' },
    ]),
    allowedHosts: async () => HOSTS,
    ...over,
  };
  return { deps, collect, handler: createQueryHandler(deps) };
}

const ENVELOPE_KEYS = ['area', 'areaSchemaVersion', 'asOf', 'bundleDate', 'data', 'generatedAt', 'recordCount', 'schemaVersion', 'source', 'timezone', 'units'];

describe('query handler (no AI, JSON envelope)', () => {
  it('hand_benchmark_top: ranked by average current score, capped by limit, envelope keys', async () => {
    const { handler } = queryDeps();
    const r = (await handler.run({ query: 'hand_benchmark_top', limit: 10 })) as any;
    expect(r.ok).toBe(true);
    expect(Object.keys(r.result).sort()).toEqual(ENVELOPE_KEYS);
    expect(r.result).toMatchObject({ area: 'hand_benchmark_top', bundleDate: '2026-11-12', timezone: 'Asia/Seoul', recordCount: 1 });
    expect(r.result.data.items[0]).toMatchObject({ rank: 1, slug: 'atlas', avgScore: 7, scores: { physical: 8, perception: 6 } });
    expect(r.costUsd ?? 0).toBe(0);
    const capped = (await queryDeps().handler.run({ query: 'hand_benchmark_top', limit: 1 })) as any;
    expect(capped.result.data.items).toHaveLength(1);
  });

  it('ci_changes_since: filters by date and company slug, newest first, capped by limit', async () => {
    const { handler } = queryDeps();
    const all = (await handler.run({ query: 'ci_changes_since', since: '2026-10-01', limit: 50 })) as any;
    expect(all.result.data.items.map((i: any) => i.item)).toEqual(['가격대', '관절 토크']);
    const since = (await handler.run({ query: 'ci_changes_since', since: '2026-10-21', limit: 50 })) as any;
    expect(since.result.data.items).toHaveLength(1);
    const company = (await handler.run({ query: 'ci_changes_since', since: '2026-10-01', company: 'atlas', limit: 50 })) as any;
    expect(company.result.data.items).toHaveLength(2);
    const other = (await handler.run({ query: 'ci_changes_since', since: '2026-10-01', company: 'someone-else', limit: 50 })) as any;
    expect(other.result.data.items).toHaveLength(0);
    const one = (await handler.run({ query: 'ci_changes_since', since: '2026-10-01', limit: 1 })) as any;
    expect(one.result.data.items).toHaveLength(1);
    expect(JSON.stringify(all)).not.toContain('alice.private@example.com'); // changed_by 등 개인 컬럼은 나오지 않는다
  });

  it('company_recent: news/videos/ci changes of the company within the window, ≤50, links limited to allowed hosts; unknown slug is not_found', async () => {
    const { handler, deps } = queryDeps();
    const r = (await handler.run({ query: 'company_recent', company: 'atlas', weeks: 4 })) as any;
    expect(r.ok).toBe(true);
    const items = r.result.data.items as any[];
    expect(items.map((i) => i.kind)).toEqual(expect.arrayContaining(['news', 'video', 'ci_change']));
    expect(items.length).toBeLessThanOrEqual(QUERY_ITEM_CAP);
    expect(items.find((i) => i.title === 'Atlas off-list link').url).toBeNull();
    expect(items.find((i) => i.title === 'Atlas news').url).toBe('https://www.therobotreport.com/atlas');
    const since = (deps.recentArticles as any).mock.calls[0][1] as Date;
    expect(since.toISOString()).toBe('2026-10-15T03:00:00.000Z'); // 4주 전
    expect(await handler.run({ query: 'company_recent', company: 'unknown', weeks: 4 })).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('robot_actuators: matches the robot slug (name or company-name form); ≤50 items; unknown slug is not_found', async () => {
    const { handler } = queryDeps();
    const r = (await handler.run({ query: 'robot_actuators', robot: 'atlas-x' })) as any;
    expect(r.ok).toBe(true);
    expect(r.result.data.robot).toMatchObject({ name: 'Atlas-X', company: 'Acme Robotics' });
    expect(r.result.data.items[0]).toMatchObject({ name: 'Joint-A', vendor: 'ActuCo', torqueNm: 80, quantity: 2 });
    expect(((await handler.run({ query: 'robot_actuators', robot: 'acme-robotics-atlas-x' })) as any).ok).toBe(true);
    expect(await handler.run({ query: 'robot_actuators', robot: 'nope' })).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('robot_actuators: an ambiguous slug is not_found rather than a guess', async () => {
    const raw = rawByArea();
    const dup = [raw['actuator-map'].robots[0], { ...raw['actuator-map'].robots[0], id: 'other', company: 'Other Inc' }];
    const { handler } = queryDeps({ getActuatorMap: async () => ({ robots: dup, suppliers: [] }) });
    expect(await handler.run({ query: 'robot_actuators', robot: 'atlas-x' })).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('actuator_suppliers_by_segment: filters by market segment and caps at 50', async () => {
    const { handler } = queryDeps();
    const r = (await handler.run({ query: 'actuator_suppliers_by_segment', segment: 'tier1_oem' })) as any;
    expect(r.result.data.items[0]).toMatchObject({ vendor: 'ActuCo', model: 'AC-100', segment: 'tier1_oem' });
    expect(((await handler.run({ query: 'actuator_suppliers_by_segment', segment: 'captive' })) as any).result.data.items).toHaveLength(0);
    const many = Array.from({ length: 80 }, (_, i) => ({ ...rawByArea()['actuator-map'].suppliers[0], model: `M-${String(i).padStart(3, '0')}` }));
    const big = queryDeps({ getActuatorMap: async () => ({ robots: [], suppliers: many }) });
    expect(((await big.handler.run({ query: 'actuator_suppliers_by_segment', segment: 'tier1_oem' })) as any).result.data.items).toHaveLength(50);
  });

  it('never touches AI or usage logging: the handler module has no AI/usage imports and results carry no cost', async () => {
    const { handler } = queryDeps();
    for (const params of [
      { query: 'hand_benchmark_top', limit: 3 },
      { query: 'ci_changes_since', since: '2026-10-01', limit: 5 },
      { query: 'actuator_suppliers_by_segment', segment: 'tier1_oem' },
    ]) {
      const r = (await handler.run(params)) as any;
      expect(r.ok).toBe(true);
      expect(r.costUsd ?? 0).toBe(0);
      expect(r.provider ?? null).toBeNull();
    }
  });

  it('an unknown query is invalid_target; a collector failure becomes a transient upstream_error', async () => {
    const { handler } = queryDeps();
    expect(await handler.run({ query: 'free_form' })).toMatchObject({ ok: false, code: 'invalid_target' });
    const broken = queryDeps({ collect: async () => { throw new Error('db down'); } });
    expect(await broken.handler.run({ query: 'hand_benchmark_top', limit: 3 })).toEqual({ ok: false, code: 'upstream_error', transient: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결과 정제
// ─────────────────────────────────────────────────────────────────────────────

describe('result sanitization (AC-22)', () => {
  it('strings are cut to 400 chars, HTML/URLs/foreign emails are neutralized or dropped', () => {
    const long = cleanText('가'.repeat(900))!;
    expect(Array.from(long).length).toBeLessThanOrEqual(400);
    expect(cleanText('<img src=x onerror=alert(1)>hello')).not.toMatch(/<img/);
    expect(cleanText('see https://evil.example.net/x now')).not.toContain('https://');
    expect(cleanText('mail me at someone@example.com')).toBeNull();
    expect(cleanText(42)).toBeNull();
  });

  it('links must be https on an allowed host', () => {
    const ctx = { allowedHosts: HOSTS };
    expect(cleanLink('https://www.youtube.com/watch?v=aaaaaaaaaaa', ctx)).toBe('https://www.youtube.com/watch?v=aaaaaaaaaaa');
    for (const bad of ['http://www.youtube.com/watch?v=a', 'https://evil.example.net/x', 'javascript:alert(1)', 'https://user@www.youtube.com/', 'https://10.0.0.1/x', 'file:///etc/passwd', 123]) {
      expect(cleanLink(bad, ctx), String(bad)).toBeNull();
    }
  });

  it('a result over 64KB is rejected as result_too_large; smaller passes', () => {
    expect(finalizeResult({ a: 'x'.repeat(70_000) })).toEqual({ ok: false, code: 'result_too_large' });
    expect(finalizeResult({ a: 'x'.repeat(1000) })).toMatchObject({ ok: true });
  });
});
