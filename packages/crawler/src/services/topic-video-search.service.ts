// event-video-search.service.ts와 구조 동일 — WRC 종료 후 공용화 검토
import { createHash } from 'crypto';
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
 */

export interface TopicSearchConfig {
  domain: TopicDomain;
  queries: string[];
}

export const TOPIC_SEARCHES: TopicSearchConfig[] = [
  {
    domain: 'hand',
    queries: ['robot dexterous hand demo', 'robotic gripper manipulation demo', 'robot hand tactile grasping'],
  },
  {
    domain: 'rfm',
    queries: ['robot foundation model demo', 'vision language action robot VLA', 'humanoid imitation learning robot'],
  },
  {
    domain: 'actuator',
    queries: ['humanoid robot actuator', 'robot joint motor harmonic drive'],
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

const MAX_RESULTS_PER_QUERY = 25;

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

class TopicVideoSearchService {
  /** 단일 쿼리 검색 실행 */
  private async runQuery(
    db: ReturnType<typeof getDb>,
    domain: TopicDomain,
    query: string,
    publishedAfter: string,
    apiKey: string,
    result: CollectResult
  ): Promise<void> {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true` +
      `&order=date&maxResults=${MAX_RESULTS_PER_QUERY}&q=${encodeURIComponent(query)}` +
      `&publishedAfter=${encodeURIComponent(publishedAfter)}&key=${apiKey}`;

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

      if (!isRelevantTopicVideo(domain, sn.title, sn.description)) continue;

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
    if (process.env.DISABLE_TOPIC_SEARCH === 'true') return result;

    const db = getDb();
    const publishedAfter = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    for (const topic of TOPIC_SEARCHES) {
      for (const query of topic.queries) {
        try {
          await this.runQuery(db, topic.domain, query, publishedAfter, apiKey, result);
        } catch (err) {
          result.errors.push(`${topic.domain} "${query}": ${(err as Error).message}`);
        }
      }
    }

    console.log(
      `[TopicSearch] queries ${result.queriesRun}, videos seen ${result.videosSeen}, inserted ${result.videosInserted}, errors ${result.errors.length}`
    );

    return result;
  }
}

export const topicVideoSearchService = new TopicVideoSearchService();
