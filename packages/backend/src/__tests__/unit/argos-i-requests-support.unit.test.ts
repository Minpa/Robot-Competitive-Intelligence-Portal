/**
 * 지원 모듈 — article_url 메타 조회(SSRF·robots·리다이렉트·크기), 허용 호스트(정적+crawl_targets+RSS+환경변수, 내부 도메인 제외, 캐시,
 * crawler RSS 상수와 동기화), YouTube/arXiv 클라이언트, 환경설정 해석, slug, 스키마 정규화 (AC-21, Q6, Q17)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ARTICLE_META_MAX_REDIRECTS,
  extractArticleMeta,
  fetchArticleMeta,
  isPrivateAddress,
  robotsAllows,
  safeLookup,
  type ArticleMetaDeps,
  type HttpGetResult,
} from '../../services/argos-i-requests-article-meta.js';
import {
  ALLOWED_HOSTS_TTL_MS,
  RSS_FEED_HOSTS,
  __resetAllowedHostsCacheForTests,
  computeAllowedHosts,
  getAllowedHosts,
  hostOfDomainField,
  internalDomainsInAllowList,
} from '../../services/argos-i-requests-allowed-hosts.js';
import { createYoutubeClient } from '../../services/argos-i-requests-youtube.js';
import { parseArxivEntry } from '../../services/argos-i-requests-arxiv.js';
import { ProviderNotConfiguredError, QuotaExceededError, TargetNotAllowedError, UpstreamError } from '../../services/argos-i-requests-handlers/types.js';
import {
  parseExtraAllowedHosts,
  parseInternalDomains,
  parseInternalPatterns,
  parseRequireApproval,
  parseTermHashes,
  requiresApproval,
  isRequestApiActive,
  kstDayStartUtc,
  resolveCostEstimates,
} from '../../services/argos-i-requests-config.js';
import { matchBySlug, slugify } from '../../services/argos-i-requests-slug.js';
import { canonicalize, hash8Of, parseRequestEnvelope, stableStringify, subKeyOf } from '../../services/argos-i-requests-schema.js';
import { checkUrl, createGuardContext, isPrivateHostName } from '../../services/argos-i-inbound-guard.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// article_url 메타 조회
// ─────────────────────────────────────────────────────────────────────────────

const HTML = (title: string, og?: string) => `<html><head><title>${title}</title>${og ? `<meta property="og:title" content="${og}">` : ''}</head><body>BODY-TEXT-MUST-NOT-BE-READ</body></html>`;
const res = (status: number, body = '', headers: Record<string, string> = { 'content-type': 'text/html; charset=utf-8' }): HttpGetResult => ({ status, body, headers });

function metaDeps(routes: Record<string, HttpGetResult | (() => HttpGetResult)>, hosts = ['therobotreport.com', 'example-news.test']) {
  const calls: string[] = [];
  const deps: ArticleMetaDeps = {
    allowedHosts: async () => hosts,
    httpGet: vi.fn(async (u: URL) => {
      calls.push(u.toString());
      const r = routes[u.toString()] ?? (u.pathname === '/robots.txt' ? res(404) : res(404));
      return typeof r === 'function' ? r() : r;
    }),
  };
  return { deps, calls };
}

describe('isPrivateAddress / isPrivateHostName (SSRF)', () => {
  it.each(['::ffff:7f00:1', '::ffff:a00:1', '::ffff:c0a8:101', '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.5.5', '172.31.255.255', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:10.0.0.1', '224.0.0.1', 'not-an-ip'])('%s is private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });
  it.each(['::ffff:808:808', '8.8.8.8', '151.101.1.69', '172.32.0.1', '2606:4700:4700::1111'])('%s is public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
  it.each(['localhost', 'a.localhost', '10.1.2.3', '[::1]', 'intranet', 'wiki.corp', 'x.internal', 'nas.local', 'a.lan', 'b.intra', ''])('host %s is private/internal', (h) => {
    expect(isPrivateHostName(h)).toBe(true);
  });
  it('public names pass', () => {
    expect(isPrivateHostName('www.therobotreport.com')).toBe(false);
  });
});

describe('safeLookup (DNS rebinding / private resolution)', () => {
  const lookupWith = (addresses: Array<{ address: string; family: number }> | Error) =>
    vi.spyOn(dns, 'lookup').mockImplementation(((_h: string, _o: unknown, cb: (...a: unknown[]) => void) => (addresses instanceof Error ? cb(addresses) : cb(null, addresses))) as never);

  it('refuses to connect when any resolved address is private, even if another one is public', () => {
    for (const set of [[{ address: '10.0.0.8', family: 4 }], [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }], [{ address: 'fd00::1', family: 6 }]]) {
      lookupWith(set);
      const cb = vi.fn();
      safeLookup('news.example.test', {}, cb);
      expect(cb.mock.calls[0]![0]).toBeInstanceOf(TargetNotAllowedError);
    }
  });

  it('connects to public addresses (both single and all:true callback shapes) and propagates DNS errors', () => {
    lookupWith([{ address: '151.101.1.69', family: 4 }]);
    const a = vi.fn();
    safeLookup('news.example.test', {}, a);
    expect(a).toHaveBeenCalledWith(null, '151.101.1.69', 4);
    const b = vi.fn();
    safeLookup('news.example.test', { all: true }, b);
    expect(b).toHaveBeenCalledWith(null, [{ address: '151.101.1.69', family: 4 }]);
    lookupWith(new Error('ENOTFOUND'));
    const c = vi.fn();
    safeLookup('missing.example.test', {}, c);
    expect(c.mock.calls[0]![0]).toBeInstanceOf(Error);
    vi.restoreAllMocks();
  });
});

describe('robots.txt', () => {
  it('honors Disallow/Allow with the longest match for ARGOSBot or *', () => {
    const txt = 'User-agent: *\nDisallow: /private/\nAllow: /private/open\n\nUser-agent: ARGOSBot\nDisallow: /news/secret\n';
    expect(robotsAllows(txt, '/news/secret/a')).toBe(false);
    expect(robotsAllows(txt, '/private/x')).toBe(true); // 전용 그룹이 있으면 * 그룹은 적용되지 않는다
    expect(robotsAllows('User-agent: *\nDisallow: /private/\nAllow: /private/open', '/private/open')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow: /private/\nAllow: /private/open', '/private/x')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow: /', '/anything')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow:', '/anything')).toBe(true);
    expect(robotsAllows('', '/x')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow: /*.pdf$', '/a/b.pdf')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow: /*.pdf$', '/a/b.pdf?x')).toBe(true);
  });
});

describe('extractArticleMeta', () => {
  it('prefers og:title, decodes entities, and reads nothing else', () => {
    expect(extractArticleMeta(HTML('Plain &amp; title'))).toEqual({ title: 'Plain & title' });
    expect(extractArticleMeta(HTML('Plain', 'OG &quot;Title&quot;'))).toEqual({ title: 'OG "Title"' });
    expect(extractArticleMeta('<html><body>no head</body></html>')).toEqual({ title: null });
    expect(JSON.stringify(extractArticleMeta(HTML('t')))).not.toContain('BODY-TEXT');
  });
});

describe('fetchArticleMeta', () => {
  const URL1 = 'https://www.therobotreport.com/a';

  it('reads robots.txt first, then the page, and returns only the title', async () => {
    const { deps, calls } = metaDeps({ [URL1]: res(200, HTML('Hello', 'OG Hello')) });
    expect(await fetchArticleMeta(URL1, deps)).toEqual({ title: 'OG Hello' });
    expect(calls).toEqual(['https://www.therobotreport.com/robots.txt', URL1]);
  });

  it.each([
    ['http scheme', 'http://www.therobotreport.com/a'],
    ['userinfo', 'https://u:p@www.therobotreport.com/a'],
    ['port', 'https://www.therobotreport.com:8443/a'],
    ['unlisted host', 'https://evil.example.net/a'],
    ['private ip', 'https://10.0.0.5/a'],
    ['localhost', 'https://localhost/a'],
    ['internal name', 'https://wiki.corp/a'],
    ['garbage', 'not a url'],
  ])('refuses %s before any network call', async (_n, url) => {
    const { deps } = metaDeps({});
    await expect(fetchArticleMeta(url, deps)).rejects.toBeInstanceOf(TargetNotAllowedError);
    expect(deps.httpGet).not.toHaveBeenCalled();
  });

  it('stops when robots.txt disallows the path; 5xx robots is a transient failure; 4xx robots means no restriction', async () => {
    const dis = metaDeps({ 'https://www.therobotreport.com/robots.txt': res(200, 'User-agent: *\nDisallow: /a', { 'content-type': 'text/plain' }), [URL1]: res(200, HTML('x')) });
    await expect(fetchArticleMeta(URL1, dis.deps)).rejects.toBeInstanceOf(TargetNotAllowedError);
    expect(dis.calls).toEqual(['https://www.therobotreport.com/robots.txt']);
    const fail = metaDeps({ 'https://www.therobotreport.com/robots.txt': res(503) });
    await expect(fetchArticleMeta(URL1, fail.deps)).rejects.toBeInstanceOf(UpstreamError);
    const ok = metaDeps({ 'https://www.therobotreport.com/robots.txt': res(404), [URL1]: res(200, HTML('Fine')) });
    expect(await fetchArticleMeta(URL1, ok.deps)).toEqual({ title: 'Fine' });
  });

  it('follows redirects only to allowed hosts (each hop is validated) and at most 3 times', async () => {
    const hop = metaDeps({ [URL1]: res(301, '', { location: 'https://example-news.test/b' }), 'https://example-news.test/b': res(200, HTML('Moved')) });
    expect(await fetchArticleMeta(URL1, hop.deps)).toEqual({ title: 'Moved' });
    expect(hop.calls).toContain('https://example-news.test/robots.txt');

    const evil = metaDeps({ [URL1]: res(302, '', { location: 'https://evil.example.net/x' }) });
    await expect(fetchArticleMeta(URL1, evil.deps)).rejects.toBeInstanceOf(TargetNotAllowedError);
    const toPrivate = metaDeps({ [URL1]: res(302, '', { location: 'https://10.0.0.1/x' }) });
    await expect(fetchArticleMeta(URL1, toPrivate.deps)).rejects.toBeInstanceOf(TargetNotAllowedError);
    const downgrade = metaDeps({ [URL1]: res(302, '', { location: 'http://www.therobotreport.com/x' }) });
    await expect(fetchArticleMeta(URL1, downgrade.deps)).rejects.toBeInstanceOf(TargetNotAllowedError);

    const loop = metaDeps({ [URL1]: res(302, '', { location: URL1 }) });
    await expect(fetchArticleMeta(URL1, loop.deps)).rejects.toBeInstanceOf(TargetNotAllowedError);
    expect((loop.deps.httpGet as any).mock.calls.length).toBeLessThanOrEqual(2 + ARTICLE_META_MAX_REDIRECTS);
  });

  it('non-HTML or error responses give no title; 5xx/429 are transient', async () => {
    expect(await fetchArticleMeta(URL1, metaDeps({ [URL1]: res(200, '%PDF', { 'content-type': 'application/pdf' }) }).deps)).toEqual({ title: null });
    expect(await fetchArticleMeta(URL1, metaDeps({ [URL1]: res(404) }).deps)).toEqual({ title: null });
    await expect(fetchArticleMeta(URL1, metaDeps({ [URL1]: res(500) }).deps)).rejects.toBeInstanceOf(UpstreamError);
    await expect(fetchArticleMeta(URL1, metaDeps({ [URL1]: res(429) }).deps)).rejects.toBeInstanceOf(UpstreamError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 허용 호스트
// ─────────────────────────────────────────────────────────────────────────────

describe('allowed hosts', () => {
  beforeEach(() => __resetAllowedHostsCacheForTests());

  it('static + crawl_targets + RSS + env extras; internal domains are always excluded', () => {
    const hosts = computeAllowedHosts(['https://www.tesla.com/optimus', 'bostondynamics.com', 'wiki.lge.com', 'not a domain'], {
      ARGOS_I_EXTRA_ALLOWED_HOSTS: 'extra-news.test, lge.com',
      ARGOS_I_INTERNAL_DOMAINS: 'corp-example.test',
    });
    expect(hosts).toEqual(expect.arrayContaining(['youtube.com', 'youtu.be', 'arxiv.org', 'tesla.com', 'bostondynamics.com', 'therobotreport.com', 'extra-news.test']));
    expect(hosts.some((h) => h.endsWith('lge.com'))).toBe(false);
    expect(computeAllowedHosts(['x.corp-example.test'], { ARGOS_I_INTERNAL_DOMAINS: 'corp-example.test' })).not.toContain('x.corp-example.test');
  });

  it('reports internal domains found in the allow list (startup warning) without exposing them as allowed', () => {
    expect(internalDomainsInAllowList(['wiki.lge.com', 'ok.example.com'], { ARGOS_I_EXTRA_ALLOWED_HOSTS: 'lgecorp.com' })).toEqual(['wiki.lge.com', 'lgecorp.com']);
    expect(internalDomainsInAllowList(['ok.example.com'], {})).toEqual([]);
  });

  it('hostOfDomainField handles hosts, URLs and www prefixes', () => {
    expect(hostOfDomainField('https://www.Tesla.com/optimus')).toBe('tesla.com');
    expect(hostOfDomainField('tesla.com')).toBe('tesla.com');
    expect(hostOfDomainField('')).toBeNull();
    expect(hostOfDomainField('localhost')).toBeNull();
  });

  it('caches for 5 minutes, falls back to the static list when the DB lookup fails', async () => {
    let t = 1_000_000;
    const loadCrawlDomains = vi.fn(async () => ['tesla.com']);
    const deps = { loadCrawlDomains, now: () => t };
    expect(await getAllowedHosts(deps, {})).toContain('tesla.com');
    t += ALLOWED_HOSTS_TTL_MS - 1;
    await getAllowedHosts(deps, {});
    expect(loadCrawlDomains).toHaveBeenCalledTimes(1);
    t += 2;
    await getAllowedHosts(deps, {});
    expect(loadCrawlDomains).toHaveBeenCalledTimes(2);
    __resetAllowedHostsCacheForTests();
    const broken = { loadCrawlDomains: async () => { throw new Error('db'); }, now: () => t };
    const hosts = await getAllowedHosts(broken, {});
    expect(hosts).toContain('youtube.com');
    expect(hosts).not.toContain('tesla.com');
  });

  it('RSS_FEED_HOSTS stays in sync with the crawler package (rss-crawler.service.ts RSS_FEEDS)', () => {
    const src = fs.readFileSync(path.resolve(here, '../../../../crawler/src/services/rss-crawler.service.ts'), 'utf-8');
    const block = src.slice(src.indexOf('export const RSS_FEEDS'), src.indexOf('export class RssCrawlerService'));
    const hosts = [...block.matchAll(/url:\s*'https?:\/\/([^/']+)/g)].map((m) => m[1]!.replace(/^www\./, ''));
    expect(hosts.length).toBeGreaterThan(3);
    expect([...new Set(hosts)].sort()).toEqual([...RSS_FEED_HOSTS].sort());
  });

  it('the guard accepts a subdomain of an allowed host but not a look-alike', () => {
    const ctx = createGuardContext({}, ['therobotreport.com']);
    expect(checkUrl('https://www.therobotreport.com/a', ctx).codes.size).toBe(0);
    expect(checkUrl('https://therobotreport.com.evil.test/a', ctx).codes.has('url_host_not_allowed')).toBe(true);
    expect(checkUrl('https://xtherobotreport.com/a', ctx).codes.has('url_host_not_allowed')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// YouTube / arXiv 클라이언트
// ─────────────────────────────────────────────────────────────────────────────

describe('YouTube client (official Data API)', () => {
  const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });

  it('without YOUTUBE_API_KEY every call is provider_not_configured (no network)', async () => {
    const fetchImpl = vi.fn();
    const c = createYoutubeClient({}, fetchImpl as never);
    await expect(c.getVideo('dQw4w9WgXcQ')).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    await expect(c.getRecentUploads('@x_y_z', 10)).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('getVideo reads videos.list snippet only; a missing item is null', async () => {
    const fetchImpl = vi.fn(async () => ok({ items: [{ snippet: { title: 'T', channelId: 'UC1', channelTitle: 'Ch', publishedAt: '2026-01-01T00:00:00Z', description: 'MUST-NOT-APPEAR' } }] }));
    const c = createYoutubeClient({ YOUTUBE_API_KEY: 'k' }, fetchImpl as never);
    const v = await c.getVideo('dQw4w9WgXcQ');
    expect(v).toEqual({ id: 'dQw4w9WgXcQ', title: 'T', channelId: 'UC1', channelTitle: 'Ch', publishedAt: '2026-01-01T00:00:00Z' });
    expect(JSON.stringify(v)).not.toContain('MUST-NOT-APPEAR');
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('https://www.googleapis.com/youtube/v3/videos?');
    expect(url).toContain('part=snippet');
    expect(await createYoutubeClient({ YOUTUBE_API_KEY: 'k' }, (async () => ok({ items: [] })) as never).getVideo('dQw4w9WgXcQ')).toBeNull();
  });

  it('getRecentUploads resolves the uploads playlist (id or @handle) and caps the result', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (u: string) => {
      calls.push(u);
      if (u.includes('/channels?')) return ok({ items: [{ snippet: { title: 'Ch' }, contentDetails: { relatedPlaylists: { uploads: 'UUxyz' } } }] });
      return ok({ items: Array.from({ length: 20 }, (_, i) => ({ snippet: { title: `V${i}`, publishedAt: '2026-01-01T00:00:00Z', resourceId: { videoId: `v${String(i).padStart(10, '0')}` }, videoOwnerChannelTitle: 'Ch' } })) });
    });
    const c = createYoutubeClient({ YOUTUBE_API_KEY: 'k' }, fetchImpl as never);
    const r = await c.getRecentUploads('@robotics_lab', 10);
    expect(r?.videos).toHaveLength(10);
    expect(calls[0]).toContain('forHandle=%40robotics_lab');
    expect(calls[1]).toContain('playlistItems');
    await c.getRecentUploads('UCaaaaaaaaaaaaaaaaaaaaaa', 10);
    expect(calls[2]).toContain('id=UCaaaaaaaaaaaaaaaaaaaaaa');
    expect(await createYoutubeClient({ YOUTUBE_API_KEY: 'k' }, (async () => ok({ items: [] })) as never).getRecentUploads('@nope_nope', 10)).toBeNull();
  });

  it('maps quota (403 quotaExceeded) to QuotaExceededError and 5xx/network errors to a transient UpstreamError without leaking the key', async () => {
    const quota = createYoutubeClient({ YOUTUBE_API_KEY: 'secret-key-1' }, (async () => ({ ok: false, status: 403, json: async () => ({ error: { errors: [{ reason: 'quotaExceeded' }] } }) })) as never);
    await expect(quota.getVideo('dQw4w9WgXcQ')).rejects.toBeInstanceOf(QuotaExceededError);
    const five = createYoutubeClient({ YOUTUBE_API_KEY: 'secret-key-1' }, (async () => ({ ok: false, status: 503, json: async () => ({}) })) as never);
    await expect(five.getVideo('dQw4w9WgXcQ')).rejects.toMatchObject({ name: 'UpstreamError', transient: true });
    const net = createYoutubeClient({ YOUTUBE_API_KEY: 'secret-key-1' }, (async () => { throw new Error('connect failed https://x?key=secret-key-1'); }) as never);
    const err = await net.getVideo('dQw4w9WgXcQ').catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(String(err.message)).not.toContain('secret-key-1');
  });
});

describe('arXiv client', () => {
  const XML = `<feed><entry><id>http://arxiv.org/abs/2401.01234v2</id><published>2024-01-02T00:00:00Z</published><title>Dexterous\n  &amp; Robust</title><summary>${'a'.repeat(900)}</summary></entry></feed>`;
  it('parses the first entry: id link, title, 500-char abstract, published', () => {
    const e = parseArxivEntry(XML)!;
    expect(e).toMatchObject({ entryId: 'http://arxiv.org/abs/2401.01234v2', arxivId: '2401.01234', title: 'Dexterous & Robust', publishedAt: '2024-01-02T00:00:00Z' });
    expect(e.summary).toHaveLength(500);
  });
  it('returns null for an empty feed or an error entry', () => {
    expect(parseArxivEntry('<feed></feed>')).toBeNull();
    expect(parseArxivEntry('<feed><entry><id>http://arxiv.org/api/errors#x</id><title>Error</title><summary>bad</summary></entry></feed>')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 설정 · slug · 스키마
// ─────────────────────────────────────────────────────────────────────────────

describe('config parsing', () => {
  it('approval rules: default, override, type or type:subkey', () => {
    expect(parseRequireApproval({})).toEqual(['analyze:topic', 'add_source:youtube_channel', 'watch_register']);
    expect(parseRequireApproval({ ARGOS_I_REQUESTS_REQUIRE_APPROVAL: ' Analyze:Topic , query ,bad rule!' })).toEqual(['analyze:topic', 'query']);
    expect(parseRequireApproval({ ARGOS_I_REQUESTS_REQUIRE_APPROVAL: '' })).toEqual(['analyze:topic', 'add_source:youtube_channel', 'watch_register']);
    expect(parseRequireApproval({ ARGOS_I_REQUESTS_REQUIRE_APPROVAL: '   ' })).toHaveLength(3);
    const rules = ['analyze:topic', 'query'];
    expect(requiresApproval('analyze', 'topic', rules)).toBe(true);
    expect(requiresApproval('analyze', 'robot', rules)).toBe(false);
    expect(requiresApproval('query', 'company_recent', rules)).toBe(true);
  });

  it('internal domains, patterns (newline or ;;), term hashes and extra hosts are parsed defensively', () => {
    expect(parseInternalDomains({ ARGOS_I_INTERNAL_DOMAINS: 'A.example.test,*.b.example.test\nbad domain' })).toEqual(['lge.com', 'lgecorp.com', 'a.example.test', 'b.example.test']);
    const p = parseInternalPatterns({ ARGOS_I_INTERNAL_PATTERNS: 'one-\\d+\n(broken;;two-[a-z]+;;' + 'x'.repeat(300) });
    expect(p.invalid).toBe(2);
    expect(p.patterns.length).toBe(3); // 기본 코드명 형태 1 + 유효 2
    expect([...parseTermHashes({ ARGOS_I_INTERNAL_TERM_HASHES: `${'A'.repeat(64)}, nothex, ${'b'.repeat(64)}` })]).toEqual(['a'.repeat(64), 'b'.repeat(64)]);
    expect(parseExtraAllowedHosts({ ARGOS_I_EXTRA_ALLOWED_HOSTS: 'x.example.test; y' })).toEqual(['x.example.test']);
  });

  it('the API is active only with the flag, a 32+ char token, and a token different from the pull token', () => {
    const t = 't'.repeat(32);
    expect(isRequestApiActive({ ARGOS_I_REQUESTS_ENABLED: 'true', ARGOS_I_REQUEST_TOKEN: t })).toBe(true);
    expect(isRequestApiActive({ ARGOS_I_REQUESTS_ENABLED: 'TRUE', ARGOS_I_REQUEST_TOKEN: t })).toBe(true);
    expect(isRequestApiActive({ ARGOS_I_REQUEST_TOKEN: t })).toBe(false);
    expect(isRequestApiActive({ ARGOS_I_REQUESTS_ENABLED: 'true', ARGOS_I_REQUEST_TOKEN: 't'.repeat(31) })).toBe(false);
    expect(isRequestApiActive({ ARGOS_I_REQUESTS_ENABLED: 'true', ARGOS_I_REQUEST_TOKEN: t, ARGOS_I_EXPORT_TOKEN_NEXT: t })).toBe(false);
  });

  it('cost estimates have conservative defaults and can be overridden', () => {
    expect(resolveCostEstimates({})).toEqual({ video: 0.1, topic: 0.5, spec: 0.01 });
    expect(resolveCostEstimates({ ARGOS_I_REQUESTS_COST_TOPIC_USD: '1.5', ARGOS_I_REQUESTS_COST_VIDEO_USD: 'x' })).toEqual({ video: 0.1, topic: 1.5, spec: 0.01 });
  });

  it('KST day start', () => {
    expect(kstDayStartUtc(new Date('2026-11-12T03:00:00Z')).toISOString()).toBe('2026-11-11T15:00:00.000Z');
    expect(kstDayStartUtc(new Date('2026-11-11T14:59:59Z')).toISOString()).toBe('2026-11-10T15:00:00.000Z');
  });
});

describe('slug', () => {
  it('derives kebab-case slugs from names; ambiguous matches resolve to null', () => {
    expect(slugify('LG Electronics')).toBe('lg-electronics');
    expect(slugify('Figure 02')).toBe('figure-02');
    expect(slugify('  Ünitree  Robotics! ')).toBe('unitree-robotics');
    expect(slugify('한글만')).toBe('');
    const rows = [{ n: 'Figure 02', c: 'Figure AI' }, { n: 'Figure 02', c: 'Clone Inc' }, { n: 'Atlas', c: 'BD' }];
    const slugs = (r: (typeof rows)[number]) => [slugify(r.n), slugify(`${r.c} ${r.n}`)];
    expect(matchBySlug(rows, 'atlas', slugs)).toEqual(rows[2]);
    expect(matchBySlug(rows, 'figure-02', slugs)).toBeNull();
    expect(matchBySlug(rows, 'figure-ai-figure-02', slugs)).toEqual(rows[0]);
    expect(matchBySlug(rows, 'nope', slugs)).toBeNull();
  });
});

describe('schema normalization', () => {
  const now = new Date('2026-11-12T03:00:00Z');
  it('stableStringify sorts keys; canonical form drops sourcePublic and the empty note; hash8 is body-order independent', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe('{"a":{"c":[3,{"y":2,"z":1}],"d":2},"b":1}');
    const a = canonicalize({ type: 'analyze', params: { target: 'robot', slug: 'x' }, note: '' });
    expect(a.canonicalJson).toBe('{"params":{"slug":"x","target":"robot"},"type":"analyze"}');
    expect(hash8Of({ a: 1, b: 2 })).toBe(hash8Of({ b: 2, a: 1 }));
  });

  it('query dates: since must be a real date within the last 90 days (KST) and not in the future', () => {
    const q = (since: string) => parseRequestEnvelope({ type: 'query', params: { query: 'ci_changes_since', since }, sourcePublic: true }, now).reasons.size === 0;
    expect(q('2026-11-12')).toBe(true);
    expect(q('2026-08-14')).toBe(true);
    expect(q('2026-08-13')).toBe(false);
    expect(q('2026-11-13')).toBe(false);
    expect(q('2026-02-30')).toBe(false);
    expect(q('11/12/2026')).toBe(false);
  });

  it('numeric ranges and enums', () => {
    const p = (params: object) => parseRequestEnvelope({ type: 'query', params, sourcePublic: true }, now).reasons.size === 0;
    expect(p({ query: 'company_recent', company: 'a-b', weeks: 8 })).toBe(true);
    expect(p({ query: 'company_recent', company: 'a-b', weeks: 9 })).toBe(false);
    expect(p({ query: 'company_recent', company: 'a-b', weeks: 0 })).toBe(false);
    expect(p({ query: 'company_recent', company: 'a-b', weeks: 1.5 })).toBe(false);
    expect(p({ query: 'hand_benchmark_top', limit: 20 })).toBe(true);
    expect(p({ query: 'hand_benchmark_top', limit: 21 })).toBe(false);
    expect(p({ query: 'actuator_suppliers_by_segment', segment: 'service' })).toBe(true);
    expect(p({ query: 'actuator_suppliers_by_segment', segment: 'humanoid' })).toBe(false);
    expect(p({ query: 'ci_changes_since', since: '2026-11-01', limit: 100 })).toBe(true);
    expect(p({ query: 'ci_changes_since', since: '2026-11-01', limit: 101 })).toBe(false);
  });

  it('add_source params: exactly one of id/url for youtube_video; id formats', () => {
    const p = (params: object) => parseRequestEnvelope({ type: 'add_source', params, sourcePublic: true }, now).reasons.size === 0;
    expect(p({ kind: 'youtube_video', id: 'dQw4w9WgXcQ' })).toBe(true);
    expect(p({ kind: 'youtube_video', url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true);
    expect(p({ kind: 'youtube_video', id: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(false);
    expect(p({ kind: 'youtube_video' })).toBe(false);
    expect(p({ kind: 'youtube_video', id: 'short' })).toBe(false);
    expect(p({ kind: 'youtube_channel', id: 'UCaaaaaaaaaaaaaaaaaaaaaa' })).toBe(true);
    expect(p({ kind: 'youtube_channel', id: '@robotics.lab' })).toBe(true);
    expect(p({ kind: 'youtube_channel', id: 'robotics' })).toBe(false);
    expect(p({ kind: 'arxiv', id: '2401.01234v2' })).toBe(true);
    expect(p({ kind: 'arxiv', id: 'cs-ro/0701001' })).toBe(true);
    expect(p({ kind: 'arxiv', id: '24.1234' })).toBe(false);
    expect(p({ kind: 'github_repo', url: 'https://github.com/x/y' })).toBe(false);
  });

  it('subKeyOf returns the type-specific sub key', () => {
    expect(subKeyOf('analyze', { target: 'topic' })).toBe('topic');
    expect(subKeyOf('add_source', { kind: 'arxiv' })).toBe('arxiv');
    expect(subKeyOf('query', { query: 'robot_actuators' })).toBe('robot_actuators');
    expect(subKeyOf('nope', {})).toBeNull();
  });
});
