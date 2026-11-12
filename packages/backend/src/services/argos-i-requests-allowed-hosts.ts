/**
 * ARGOS_I 요청의 허용 호스트 해석 (add_source/article_url 와 결과 링크 정제에 쓴다).
 *
 * 허용 = 정적 상수 + crawl_targets(enabled) 도메인 + RSS 피드 호스트 + 운영자 추가(ARGOS_I_EXTRA_ALLOWED_HOSTS).
 * 내부 도메인(기본 lge.com 계열)은 항상 제외한다. 5분 메모리 캐시. 가드에는 주입으로 전달한다.
 *
 * RSS_FEED_HOSTS 는 crawler 패키지 rss-crawler.service.ts 의 RSS_FEEDS 호스트와 같아야 한다
 * (패키지 경계상 import 할 수 없어 사본을 두고, 동기화는 단위 테스트가 확인한다).
 */

import { STATIC_ALLOWED_HOSTS } from './argos-i-guard-rules.js';
import { filterAllowedHosts } from './argos-i-inbound-guard.js';
import { parseExtraAllowedHosts, parseInternalDomains, type Env } from './argos-i-requests-config.js';

/** crawler/src/services/rss-crawler.service.ts 의 RSS_FEEDS 호스트 (www. 제외한 등록 도메인) */
export const RSS_FEED_HOSTS: readonly string[] = [
  'therobotreport.com',
  'spectrum.ieee.org',
  'roboticsbusinessreview.com',
  'technologyreview.com',
  'venturebeat.com',
  'bostondynamics.com',
  'rss.arxiv.org',
];

export const ALLOWED_HOSTS_TTL_MS = 5 * 60_000;

export interface AllowedHostsDeps {
  /** crawl_targets.enabled=true 의 domain 목록 */
  loadCrawlDomains(): Promise<string[]>;
  now?: () => number;
}

/** 도메인 문자열(또는 URL)에서 호스트만 뽑는다. 형식이 아니면 null */
export function hostOfDomainField(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  try {
    const h = new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, '');
    return /^(?:[a-z0-9-]+\.)+[a-z0-9-]{2,24}$/.test(h) ? h : null;
  } catch {
    return null;
  }
}

/** 순수 계산: 정적 + 크롤 대상 + RSS + 환경변수 추가분에서 내부 도메인을 뺀다 */
export function computeAllowedHosts(crawlDomains: readonly string[], env: Env = process.env): string[] {
  const dynamic = crawlDomains.map(hostOfDomainField).filter((h): h is string => h !== null);
  return filterAllowedHosts([...STATIC_ALLOWED_HOSTS, ...dynamic, ...RSS_FEED_HOSTS, ...parseExtraAllowedHosts(env)], parseInternalDomains(env));
}

/** 허용 목록에 내부 도메인이 직접 들어 있었는지 (기동 시 경고용) */
export function internalDomainsInAllowList(crawlDomains: readonly string[], env: Env = process.env): string[] {
  const internal = parseInternalDomains(env);
  const all = [...crawlDomains.map(hostOfDomainField).filter((h): h is string => h !== null), ...parseExtraAllowedHosts(env)];
  return all.filter((h) => internal.some((d) => h === d || h.endsWith(`.${d}`)));
}

let cache: { at: number; hosts: string[] } | null = null;

export function __resetAllowedHostsCacheForTests(): void {
  cache = null;
}

export async function getAllowedHosts(deps: AllowedHostsDeps, env: Env = process.env): Promise<string[]> {
  const now = (deps.now ?? Date.now)();
  if (cache && now - cache.at < ALLOWED_HOSTS_TTL_MS) return cache.hosts;
  let crawl: string[] = [];
  try {
    crawl = await deps.loadCrawlDomains();
  } catch {
    // DB 조회 실패 시 정적 + RSS + 환경변수만으로 동작한다 (더 좁은 목록이라 안전한 쪽)
  }
  const hosts = computeAllowedHosts(crawl, env);
  cache = { at: now, hosts };
  return hosts;
}
