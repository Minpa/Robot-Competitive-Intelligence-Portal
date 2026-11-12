/**
 * article_url 메타 조회 — `<title>` 과 Open Graph 제목만 읽는다 (본문 수집 없음).
 *
 * 안전장치
 *  - https 전용, 허용 호스트(정확 일치 또는 하위 도메인)만. 리다이렉트는 수동으로 따라가며 매 단계 같은 검사를 한다 (최대 3회)
 *  - SSRF 방지: 연결 시점에 DNS 결과를 검사해 사설·루프백·링크로컬·ULA 주소면 연결하지 않는다 (DNS rebinding 방지)
 *  - robots.txt 준수 (User-agent: ARGOSBot 또는 *). 5xx·네트워크 오류는 안전 쪽으로 중단한다
 *  - 응답 256KB 상한, 5초 타임아웃, text/html 만
 */

import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import { hostMatches, isPrivateHostName } from './argos-i-inbound-guard.js';
import { TargetNotAllowedError, UpstreamError } from './argos-i-requests-handlers/types.js';

export const ARTICLE_META_MAX_BYTES = 256 * 1024;
export const ARTICLE_META_TIMEOUT_MS = 5000;
export const ARTICLE_META_MAX_REDIRECTS = 3;
export const ROBOTS_USER_AGENT = 'ARGOSBot';

// ─────────────────────────────────────────────────────────────────────────────
// 주소 검사
// ─────────────────────────────────────────────────────────────────────────────

/** 사설·루프백·링크로컬·CGNAT·멀티캐스트·예약 주소 (IPv4/IPv6). IP 형식이 아니면 true(안전 쪽) */
export function isPrivateAddress(addr: string): boolean {
  const ip = addr.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (net.isIPv6(ip)) {
    if (ip === '::' || ip === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mapped) return isPrivateAddress(mapped[1]!);
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip); // IPv4-mapped 16진 표기 (::ffff:7f00:1)
    if (hex) {
      const hi = parseInt(hex[1]!, 16);
      const lo = parseInt(hex[2]!, 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    const first = parseInt(ip.split(':')[0] || '0', 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
  }
  return true;
}

/** http.request 의 lookup 옵션 — 해석된 모든 주소가 공개 주소일 때만 연결한다 */
export function safeLookup(hostname: string, options: unknown, callback: (...args: any[]) => void): void {
  const opts = (typeof options === 'object' && options !== null ? options : {}) as { all?: boolean; family?: number };
  dns.lookup(hostname, { all: true, family: opts.family }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) return callback(new TargetNotAllowedError());
    if (opts.all) return callback(null, addresses);
    return callback(null, addresses[0]!.address, addresses[0]!.family);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt
// ─────────────────────────────────────────────────────────────────────────────

interface RobotsRule {
  allow: boolean;
  path: string;
}

/** 해당 UA 그룹(없으면 *)의 규칙 중 가장 긴 일치 규칙으로 판정한다. 규칙이 없으면 허용 */
export function robotsAllows(robotsTxt: string, path: string, userAgent: string = ROBOTS_USER_AGENT): boolean {
  const ua = userAgent.toLowerCase();
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let cur: { agents: string[]; rules: RobotsRule[] } | null = null;
  let lastWasAgent = false;
  for (const lineRaw of robotsTxt.split(/\r?\n/)) {
    const line = lineRaw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === 'allow' || field === 'disallow') {
      lastWasAgent = false;
      if (cur) cur.rules.push({ allow: field === 'allow', path: value });
    } else {
      lastWasAgent = false;
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const applicable = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes('*'));
  let best: { len: number; allow: boolean } | null = null;
  for (const g of applicable) {
    for (const r of g.rules) {
      if (r.path === '') continue; // "Disallow:" (빈 값)은 전체 허용
      if (!pathMatches(path, r.path)) continue;
      const len = r.path.length;
      if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
    }
  }
  return best ? best.allow : true;
}

function pathMatches(path: string, pattern: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(`^${body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anchored ? '$' : ''}`);
  return re.test(path);
}

// ─────────────────────────────────────────────────────────────────────────────
// 메타 추출
// ─────────────────────────────────────────────────────────────────────────────

const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16))))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

export interface ArticleMeta {
  title: string | null;
}

/** `<title>` 과 og:title 만 읽는다. og:title 을 우선한다 */
export function extractArticleMeta(html: string): ArticleMeta {
  const head = html.slice(0, ARTICLE_META_MAX_BYTES);
  let og: string | null = null;
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    const prop = /(?:property|name)\s*=\s*["']og:title["']/i.test(t);
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(t);
    if (prop && content) {
      og = decodeEntities((content[1] ?? content[2] ?? '').trim());
      break;
    }
  }
  const tm = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const plain = tm ? decodeEntities(tm[1]!.replace(/\s+/g, ' ').trim()) : null;
  const title = (og && og.length > 0 ? og : plain) || null;
  return { title: title ? title.slice(0, 500) : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP (실제 구현) + 조회 흐름
// ─────────────────────────────────────────────────────────────────────────────

export interface HttpGetResult {
  status: number;
  headers: Record<string, string | undefined>;
  body: string;
}

export interface ArticleMetaDeps {
  allowedHosts(): Promise<string[]>;
  httpGet(url: URL, opts: { maxBytes: number; timeoutMs: number }): Promise<HttpGetResult>;
}

/** 실제 https GET — 연결 시점 DNS 검사(safeLookup), 본문 상한, 타임아웃. 응답 본문은 호출자가 메타만 추출한다 */
export function httpGetLimited(url: URL, opts: { maxBytes: number; timeoutMs: number }): Promise<HttpGetResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { 'User-Agent': `${ROBOTS_USER_AGENT}/1.0 (metadata only)`, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8', 'Accept-Encoding': 'identity' },
        lookup: safeLookup as unknown as https.RequestOptions['lookup'],
        timeout: opts.timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () => {
          const headers: Record<string, string | undefined> = {};
          for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v[0] : v;
          resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString('utf8') });
        };
        res.on('data', (c: Buffer) => {
          size += c.length;
          chunks.push(c);
          if (size >= opts.maxBytes) {
            res.destroy();
            finish();
          }
        });
        res.on('end', finish);
        res.on('error', () => reject(new UpstreamError(true)));
      },
    );
    const timer = setTimeout(() => req.destroy(new UpstreamError(true)), opts.timeoutMs);
    req.on('timeout', () => req.destroy(new UpstreamError(true)));
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err instanceof TargetNotAllowedError || err instanceof UpstreamError ? err : (err as { cause?: unknown }).cause instanceof TargetNotAllowedError ? (err as { cause: Error }).cause : new UpstreamError(true));
    });
    req.on('close', () => clearTimeout(timer));
    req.end();
  });
}

function assertAllowedUrl(url: URL, allowed: readonly string[]): void {
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new TargetNotAllowedError();
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isPrivateHostName(host) || !hostMatches(host, allowed)) throw new TargetNotAllowedError();
}

export async function fetchArticleMeta(rawUrl: string, deps: ArticleMetaDeps): Promise<ArticleMeta> {
  const allowed = await deps.allowedHosts();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TargetNotAllowedError();
  }
  assertAllowedUrl(url, allowed);
  const opts = { maxBytes: ARTICLE_META_MAX_BYTES, timeoutMs: ARTICLE_META_TIMEOUT_MS };

  // robots.txt — 4xx 는 제한 없음, 5xx·실패는 중단
  const robotsUrl = new URL('/robots.txt', url);
  const robots = await deps.httpGet(robotsUrl, { maxBytes: 128 * 1024, timeoutMs: ARTICLE_META_TIMEOUT_MS });
  if (robots.status >= 500) throw new UpstreamError(true);
  if (robots.status >= 200 && robots.status < 300 && !robotsAllows(robots.body, `${url.pathname}${url.search}`)) throw new TargetNotAllowedError();

  let current = url;
  for (let hop = 0; hop <= ARTICLE_META_MAX_REDIRECTS; hop++) {
    const res = await deps.httpGet(current, opts);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      let next: URL;
      try {
        next = new URL(res.headers.location, current);
      } catch {
        throw new TargetNotAllowedError();
      }
      assertAllowedUrl(next, allowed); // 리다이렉트도 허용 호스트일 때만 추종한다
      if (next.host !== current.host) {
        // 다른 호스트로 가면 그 호스트의 robots.txt 도 따른다
        const r2 = await deps.httpGet(new URL('/robots.txt', next), { maxBytes: 128 * 1024, timeoutMs: ARTICLE_META_TIMEOUT_MS });
        if (r2.status >= 500) throw new UpstreamError(true);
        if (r2.status >= 200 && r2.status < 300 && !robotsAllows(r2.body, `${next.pathname}${next.search}`)) throw new TargetNotAllowedError();
      } else if (!robotsAllows(robots.status >= 200 && robots.status < 300 ? robots.body : '', `${next.pathname}${next.search}`)) {
        throw new TargetNotAllowedError();
      }
      current = next;
      continue;
    }
    if (res.status >= 500 || res.status === 429) throw new UpstreamError(true);
    if (res.status < 200 || res.status >= 300) return { title: null };
    const ct = (res.headers['content-type'] ?? '').toLowerCase();
    if (ct && !ct.includes('text/html') && !ct.includes('application/xhtml')) return { title: null };
    return extractArticleMeta(res.body);
  }
  throw new TargetNotAllowedError(); // 리다이렉트 한도 초과
}
