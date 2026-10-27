// event-video-search.service.ts와 구조 동일 — WRC 종료 후 공용화 검토
import { createHash } from 'crypto';
import { sql } from 'drizzle-orm';
import { getDb, articles } from '../db/index.js';
import { isRelevantTopicVideo, type TopicDomain } from './topic-video-relevance.js';

/**
 * 단위기술 축(hand/rfm/actuator/expo/production) 유튜브 검색 수집기
 *
 * 공식 채널 RSS 수집(youtube-collector.service.ts)만으로는 잡히지 않는
 * 제3자(참관객·미디어) 업로드 데모 영상을 YouTube Data API 검색(공식 API)으로 보강한다.
 *
 * 법적으로 안전한 수집:
 * - 유튜브가 공식 제공하는 Data API v3 search.list만 사용
 * - 제목, 채널명, 게시일, 설명, 썸네일 URL 등 메타데이터만 저장 (영상 파일 미저장)
 *
 * 충돌 처리:
 * - 같은 영상이 이미 저장돼 있으면(공식 채널 RSS가 먼저 넣은 경우 등) row 정체성(domain/thirdParty/channel 등)은
 *   건드리지 않고 extracted_metadata.topic/topics 만 병합한다. 그래야 공식 채널 영상에도 핸드 토픽이 붙는다.
 */

export interface TopicSearchConfig {
  domain: TopicDomain;
  queries: string[];
}

export const TOPIC_SEARCHES: TopicSearchConfig[] = [
  {
    domain: 'hand',
    queries: [
      'dexterous robot hand',
      'robotic gripper manipulation',
      'robot hand tactile sensor',
      'in-hand manipulation robot',
      'humanoid robot hand dexterity',
      'robot hand teleoperation',
      'five-finger robot hand | anthropomorphic robot hand',
      '"Shadow Hand" | "Sharpa" | "Tesollo" | "Inspire Hand" | "Allegro Hand" | "LEAP Hand" | "Ability Hand"',
      '"Boston Dynamics" Atlas hand | "Tesla Optimus" hand | Figure humanoid hand',
      // Revo 2/3 는 1X NEO 모터명(Revo2)과 충돌하므로 항상 BrainCo 와 결합한다
      '"BrainCo" Revo hand | "BrainCo Revo 2" | "BrainCo Revo 3" | 强脑科技 灵巧手',
      '灵巧手 机器人',
      '로봇 핸드 그리퍼',
    ],
  },
  {
    domain: 'rfm',
    queries: ['robot foundation model demo', 'vision language action robot VLA', 'humanoid imitation learning robot'],
  },
  {
    domain: 'actuator',
    queries: [
      'humanoid robot actuator',
      'robot joint actuator torque',
      'quasi direct drive actuator',
      'harmonic drive robot joint',
      'planetary actuator humanoid',
      'linear actuator humanoid robot',
      'robot actuator teardown',
      'high torque density motor robot',
      'cycloidal actuator robot',
      'series elastic actuator',
      'robot joint module demo',
      'actuator humanoid factory',
    ],
  },
  {
    domain: 'expo',
    queries: ['robot exhibition demo', 'CES robot demo', 'robot trade show demo'],
  },
  {
    domain: 'production',
    queries: ['humanoid robot mass production', 'robot factory tour', '휴머노이드 로봇 양산', '人形机器人 量产'],
  },
];

/** search.list 는 maxResults와 무관하게 호출당 100 units 고정 — 50으로 올려도 쿼터 영향 없음 */
const MAX_RESULTS_PER_QUERY = 50;
/** search.list 호출 1회당 YouTube Data API 쿼터 비용 */
const SEARCH_LIST_COST_UNITS = 100;
/** nextPageToken 순회 상한 */
export const MAX_PAGES = 5;

export interface DomainStats {
  queries: number;
  seen: number;
  relevant: number;
  inserted: number;
  merged: number;
}

export interface CollectResult {
  queriesRun: number;
  videosSeen: number;
  videosInserted: number;
  videosMerged: number;
  perDomain: Record<TopicDomain, DomainStats>;
  errors: string[];
}

export interface CollectOptions {
  domains?: TopicDomain[];
  /** 쿼리당 순회할 페이지 수(기본 1, 상한 MAX_PAGES). 페이지당 search.list 1회 = 100 units */
  pages?: number;
}

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    description?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YoutubeSearchResponse {
  items?: YoutubeSearchItem[];
  nextPageToken?: string;
}

/** 쿼터 추정: (쿼리 수 × 100 units) × 페이지 수 */
export function estimateQuotaUnits(configs: TopicSearchConfig[], pages: number): number {
  const queries = configs.reduce((n, c) => n + c.queries.length, 0);
  return queries * SEARCH_LIST_COST_UNITS * Math.max(1, pages);
}

/**
 * 기존 row 의 topic/topics 와 현재 도메인을 병합 (DB UPDATE 문과 동일한 로직 — 테스트용 TS 구현)
 * - topic: 기존 값 유지, 없으면 현재 도메인
 * - topics: 기존 topics ∪ 기존 topic ∪ 현재 도메인 (중복 제거, 순서 보존)
 */
export function mergeTopics(
  existing: { topic?: string | null; topics?: string[] | null },
  domain: TopicDomain
): { topic: string; topics: string[] } {
  const topics = new Set<string>();
  for (const t of existing.topics ?? []) if (t) topics.add(t);
  if (existing.topic) topics.add(existing.topic);
  topics.add(domain);
  return { topic: existing.topic || domain, topics: [...topics] };
}

/** YouTube API 쿼터 소진(403 quotaExceeded / 429) — 남은 쿼리를 모두 건너뛰기 위한 전용 오류 */
export class QuotaExhaustedError extends Error {
  constructor(status: number, query: string) {
    super(`YouTube API quota exhausted (HTTP ${status}) at query "${query}"`);
    this.name = 'QuotaExhaustedError';
  }
}

/** 403 은 quotaExceeded/dailyLimitExceeded/rateLimitExceeded 사유일 때만, 429 는 무조건 쿼터 소진으로 본다 */
async function isQuotaExhausted(res: Response): Promise<boolean> {
  if (res.status === 429) return true;
  if (res.status !== 403) return false;
  try {
    const body = await res.text();
    return /quotaExceeded|dailyLimitExceeded|rateLimitExceeded/i.test(body);
  } catch {
    return false;
  }
}

function clampPages(pages: number | undefined): number {
  if (!pages || !Number.isFinite(pages)) return 1;
  return Math.min(MAX_PAGES, Math.max(1, Math.floor(pages)));
}

function emptyStats(): DomainStats {
  return { queries: 0, seen: 0, relevant: 0, inserted: 0, merged: 0 };
}

class TopicVideoSearchService {
  /** 단일 쿼리 검색 실행 (pages > 1 이면 nextPageToken 으로 순회) */
  private async runQuery(
    db: ReturnType<typeof getDb>,
    domain: TopicDomain,
    query: string,
    publishedAfter: string,
    apiKey: string,
    pages: number,
    seen: Map<string, Set<TopicDomain>>,
    result: CollectResult
  ): Promise<void> {
    const stats = result.perDomain[domain];
    let pageToken: string | undefined;

    for (let page = 0; page < pages; page++) {
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true` +
        `&order=date&maxResults=${MAX_RESULTS_PER_QUERY}&q=${encodeURIComponent(query)}` +
        `&publishedAfter=${encodeURIComponent(publishedAfter)}&key=${apiKey}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');

      const res = await fetch(url);
      if (!res.ok) {
        if (await isQuotaExhausted(res)) throw new QuotaExhaustedError(res.status, query);
        throw new Error(`YouTube search API error ${res.status} for query "${query}" (page ${page + 1})`);
      }
      const data = (await res.json()) as YoutubeSearchResponse;
      result.queriesRun++;
      stats.queries++;

      for (const item of data.items ?? []) {
        const videoId = item.id?.videoId;
        const sn = item.snippet;
        if (!videoId || !sn?.title) continue;
        result.videosSeen++;
        stats.seen++;

        // 실행 내 중복 제거 — 같은 도메인에서 재등장하면 스킵, 다른 도메인이면 병합 처리로 진행
        const seenDomains = seen.get(videoId);
        if (seenDomains?.has(domain)) continue;

        if (!isRelevantTopicVideo(domain, sn.title, sn.description)) continue;
        stats.relevant++;

        if (seenDomains) seenDomains.add(domain);
        else seen.set(videoId, new Set([domain]));

        const thumbnail =
          sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url ?? sn.thumbnails?.default?.url ?? null;
        const channelTitle = sn.channelTitle ?? 'Unknown';
        const contentHash = createHash('md5').update(`yt-video-${videoId}`).digest('hex');

        const inserted = await db
          .insert(articles)
          .values({
            title: sn.title,
            source: `YouTube — ${channelTitle}`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: sn.publishedAt ? new Date(sn.publishedAt) : undefined,
            summary: null,
            language: 'en',
            category: 'product',
            productType: 'video',
            contentHash,
            extractedMetadata: {
              videoId,
              channel: channelTitle,
              channelId: sn.channelId ?? null,
              domain: 'topic-search',
              topic: domain,
              topics: [domain],
              topicSearchAt: new Date().toISOString(),
              thirdParty: true,
              thumbnail,
              description: sn.description ? sn.description.slice(0, 1200) : null,
            },
          })
          .onConflictDoNothing()
          .returning({ id: articles.id });

        if (inserted.length > 0) {
          result.videosInserted++;
          stats.inserted++;
        } else {
          // 이미 저장된 영상(공식 채널 RSS 등) — topic/topics 만 병합. domain/thirdParty/channel/description/aiTags/views 는 보존
          await this.mergeTopicIntoExisting(db, contentHash, domain);
          result.videosMerged++;
          stats.merged++;
        }
      }

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }

  /** 기존 row 의 extracted_metadata 에 topic/topics/topicSearchAt 병합 (mergeTopics 와 동일 로직의 SQL 판) */
  private async mergeTopicIntoExisting(
    db: ReturnType<typeof getDb>,
    contentHash: string,
    domain: TopicDomain
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    await db.execute(sql`
      UPDATE articles
      SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb) || jsonb_build_object(
        'topic', COALESCE(extracted_metadata->>'topic', ${domain}::text),
        'topics', (
          SELECT COALESCE(jsonb_agg(DISTINCT t), '[]'::jsonb)
          FROM jsonb_array_elements_text(
            COALESCE(extracted_metadata->'topics', '[]'::jsonb)
            || CASE WHEN extracted_metadata ? 'topic'
                 THEN jsonb_build_array(extracted_metadata->>'topic')
                 ELSE '[]'::jsonb END
            || jsonb_build_array(${domain}::text)
          ) AS t
          WHERE t IS NOT NULL
        ),
        'topicSearchAt', ${nowIso}::text
      )
      WHERE content_hash = ${contentHash} AND product_type = 'video'
    `);
  }

  async collectAll(options: CollectOptions = {}): Promise<CollectResult> {
    const result: CollectResult = {
      queriesRun: 0,
      videosSeen: 0,
      videosInserted: 0,
      videosMerged: 0,
      perDomain: {
        hand: emptyStats(),
        rfm: emptyStats(),
        actuator: emptyStats(),
        expo: emptyStats(),
        production: emptyStats(),
      },
      errors: [],
    };

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return result;
    if (process.env.DISABLE_TOPIC_SEARCH === 'true') return result;

    const pages = clampPages(options.pages);
    const configs =
      options.domains && options.domains.length > 0
        ? TOPIC_SEARCHES.filter((c) => options.domains!.includes(c.domain))
        : TOPIC_SEARCHES;

    console.log(
      `[TopicSearch] estimated quota ${estimateQuotaUnits(configs, pages)} units ` +
        `(domains ${configs.map((c) => c.domain).join(',')}, pages ${pages})`
    );

    const db = getDb();
    const publishedAfter = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const seen = new Map<string, Set<TopicDomain>>();

    let quotaExhausted = false;

    for (const topic of configs) {
      for (const query of topic.queries) {
        if (quotaExhausted) break;
        try {
          await this.runQuery(db, topic.domain, query, publishedAfter, apiKey, pages, seen, result);
        } catch (err) {
          if (err instanceof QuotaExhaustedError) {
            // 쿼터 소진 — 남은 쿼리는 전부 실패하므로 조기 중단 (사유 1줄만 기록)
            quotaExhausted = true;
            result.errors.push(`${topic.domain} "${query}": ${err.message} — aborting remaining queries`);
            console.warn('[TopicSearch] quota exhausted — aborting remaining queries');
            break;
          }
          result.errors.push(`${topic.domain} "${query}": ${(err as Error).message}`);
        }
      }
      const s = result.perDomain[topic.domain];
      if (quotaExhausted && s.queries === 0) continue; // 조기 중단으로 실행되지 않은 도메인은 로그 생략
      console.log(
        `[TopicSearch] ${topic.domain}: queries ${s.queries}, seen ${s.seen}, relevant ${s.relevant}, inserted ${s.inserted}, merged ${s.merged}`
      );
    }

    console.log(
      `[TopicSearch] queries ${result.queriesRun}, videos seen ${result.videosSeen}, inserted ${result.videosInserted}, merged ${result.videosMerged}, errors ${result.errors.length}`
    );

    return result;
  }
}

export const topicVideoSearchService = new TopicVideoSearchService();
