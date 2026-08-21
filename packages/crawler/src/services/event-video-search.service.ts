import { createHash } from 'crypto';
import { getDb, articles } from '../db/index.js';

/**
 * 이벤트 특집(WRC 2026 등) 유튜브 검색 수집기
 *
 * 공식 채널 RSS 수집(youtube-collector.service.ts)만으로는 잡히지 않는
 * 제3자(참관객·미디어) 업로드 영상을 YouTube Data API 검색(공식 API)으로 보강한다.
 *
 * 법적으로 안전한 수집:
 * - 유튜브가 공식 제공하는 Data API v3 search.list만 사용
 * - 제목, 채널명, 게시일, 설명, 썸네일 URL 등 메타데이터만 저장 (영상 파일 미저장)
 */

export interface EventSearchConfig {
  key: string;
  queries: string[];
  publishedAfter: string; // ISO 8601
  activeUntil: string; // YYYY-MM-DD — 이후에는 자동 중단
  maxResultsPerQuery: number;
}

export const EVENT_SEARCHES: EventSearchConfig[] = [
  {
    key: 'wrc2026',
    queries: ['WRC 2026 robot', '"world robot conference" 2026', '世界机器人大会 2026'],
    publishedAfter: '2026-07-15T00:00:00Z',
    activeUntil: '2026-10-01',
    maxResultsPerQuery: 25,
  },
];

interface CollectResult {
  queriesRun: number;
  videosSeen: number;
  videosInserted: number;
  errors: string[];
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

class EventVideoSearchService {
  /** 단일 쿼리 검색 실행 */
  private async runQuery(
    db: ReturnType<typeof getDb>,
    event: EventSearchConfig,
    query: string,
    apiKey: string,
    result: CollectResult
  ): Promise<void> {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true` +
      `&order=date&maxResults=${event.maxResultsPerQuery}&q=${encodeURIComponent(query)}` +
      `&publishedAfter=${encodeURIComponent(event.publishedAfter)}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube search API error ${res.status} for query "${query}"`);
    }
    const data = (await res.json()) as { items?: YoutubeSearchItem[] };
    result.queriesRun++;

    for (const item of data.items ?? []) {
      const videoId = item.id?.videoId;
      const sn = item.snippet;
      if (!videoId || !sn?.title) continue;
      result.videosSeen++;

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
            domain: 'event',
            event: event.key,
            thirdParty: true,
            thumbnail,
            description: sn.description ? sn.description.slice(0, 1200) : null,
          },
        })
        .onConflictDoNothing()
        .returning({ id: articles.id });

      if (inserted.length > 0) result.videosInserted++;
    }
  }

  async collectAll(): Promise<CollectResult> {
    const result: CollectResult = { queriesRun: 0, videosSeen: 0, videosInserted: 0, errors: [] };

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return result;
    if (process.env.DISABLE_EVENT_SEARCH === 'true') return result;

    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    for (const event of EVENT_SEARCHES) {
      if (today > event.activeUntil) {
        console.log(`[EventSearch] ${event.key}: skipped (past activeUntil ${event.activeUntil})`);
        continue;
      }

      for (const query of event.queries) {
        try {
          await this.runQuery(db, event, query, apiKey, result);
        } catch (err) {
          result.errors.push(`${event.key} "${query}": ${(err as Error).message}`);
        }
      }

      console.log(
        `[EventSearch] ${event.key}: queries ${result.queriesRun}, videos seen ${result.videosSeen}, inserted ${result.videosInserted}, errors ${result.errors.length}`
      );
    }

    return result;
  }
}

export const eventVideoSearchService = new EventVideoSearchService();
