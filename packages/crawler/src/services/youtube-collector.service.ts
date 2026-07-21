import Parser from 'rss-parser';
import { createHash } from 'crypto';
import { sql } from 'drizzle-orm';
import { getDb, articles } from '../db/index.js';

/**
 * 유튜브 공식 채널 데모 영상 수집기
 *
 * 법적으로 안전한 수집:
 * - 유튜브가 공식 제공하는 채널 RSS 피드만 사용 (youtube.com/feeds/videos.xml)
 * - 제목, 링크, 게시일, 채널명, 썸네일 URL 등 메타데이터만 저장
 * - 영상 파일은 저장하지 않음 (사이트에서는 공식 iframe 임베드로 재생)
 * - channelId가 없는 채널은 YouTube Data API(YOUTUBE_API_KEY, 공식 API)로 핸들을 해석
 */

export interface YoutubeChannel {
  company: string;      // companies.name 매칭용 (ILIKE)
  channelName: string;  // 표시용 채널명
  handle: string;       // @handle (channelId 해석용)
  channelId: string | null; // UC... (알고 있으면 직접 지정 — API 없이 동작)
}

// 경쟁사 공식 유튜브 채널 목록
// channelId가 null인 항목은 YOUTUBE_API_KEY가 설정된 경우에만 수집된다.
export const YOUTUBE_CHANNELS: YoutubeChannel[] = [
  { company: 'Boston Dynamics', channelName: 'Boston Dynamics', handle: 'BostonDynamics', channelId: 'UC7vVhkEfw4nOGp8TyDk7RcQ' },
  { company: 'Tesla', channelName: 'Tesla', handle: 'Tesla', channelId: null },
  { company: 'Figure AI', channelName: 'Figure', handle: 'figureai', channelId: null },
  { company: 'Unitree', channelName: 'Unitree Robotics', handle: 'UnitreeRobotics', channelId: null },
  { company: '1X Technologies', channelName: '1X', handle: '1x-tech', channelId: null },
  { company: 'Agility Robotics', channelName: 'Agility Robotics', handle: 'agilityrobotics', channelId: null },
  { company: 'Apptronik', channelName: 'Apptronik', handle: 'apptronik', channelId: null },
  { company: 'Agibot', channelName: 'AgiBot', handle: 'AgiBot', channelId: null },
  { company: 'XPeng', channelName: 'XPeng', handle: 'XPengMotorsGlobal', channelId: null },
  { company: 'UBTECH', channelName: 'UBTECH Robotics', handle: 'UBTECHRobotics', channelId: null },
  { company: 'Galbot', channelName: 'Galbot', handle: 'Galbot', channelId: null },
  { company: 'Booster Robotics', channelName: 'Booster Robotics', handle: 'BoosterRobotics', channelId: null },
  { company: 'LimX Dynamics', channelName: 'LimX Dynamics', handle: 'LimXDynamics', channelId: null },
  { company: 'Neura Robotics', channelName: 'NEURA Robotics', handle: 'NEURArobotics', channelId: null },
  { company: 'Rainbow Robotics', channelName: 'Rainbow Robotics', handle: 'rainbowrobotics', channelId: null },
];

interface CollectResult {
  channelsProcessed: number;
  channelsSkipped: number;
  skippedChannels: string[];
  videosFound: number;
  videosInserted: number;
  videosUpdated: number;
  errors: string[];
}

type YtFeedItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  id?: string; // "yt:video:VIDEOID"
  mediaGroup?: Record<string, unknown>;
};

/** RSS media:group에서 영상 설명·조회수 추출 (유튜브가 피드에 공식 포함하는 데이터) */
function extractMediaInfo(mediaGroup: Record<string, unknown> | undefined): {
  description: string | null;
  views: number | null;
} {
  if (!mediaGroup) return { description: null, views: null };
  const unwrap = (node: unknown): any => (Array.isArray(node) ? node[0] : node);
  const mg = mediaGroup as Record<string, any>;

  const descNode = unwrap(mg['media:description']);
  const description =
    typeof descNode === 'string'
      ? descNode.slice(0, 1200)
      : typeof descNode?._ === 'string'
        ? descNode._.slice(0, 1200)
        : null;

  const statsNode = unwrap(unwrap(mg['media:community'])?.['media:statistics']);
  const rawViews = statsNode?.['$']?.views ?? statsNode?.views;
  const views = rawViews != null && !Number.isNaN(Number(rawViews)) ? Number(rawViews) : null;
  return { description, views };
}

class YoutubeCollectorService {
  private parser = new Parser<Record<string, unknown>, YtFeedItem>({
    customFields: {
      item: [['media:group', 'mediaGroup'], ['yt:videoId', 'ytVideoId']],
    },
  });

  private resolvedIds = new Map<string, string>(); // handle → channelId 캐시

  /**
   * @handle → channelId 해석 (YouTube Data API v3, 공식 API)
   */
  private async resolveChannelId(handle: string): Promise<string | null> {
    const cached = this.resolvedIds.get(handle);
    if (cached) return cached;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: { id?: string }[] };
      const id: string | null = data.items?.[0]?.id ?? null;
      if (id) this.resolvedIds.set(handle, id);
      return id;
    } catch {
      return null;
    }
  }

  private extractVideoId(item: YtFeedItem & { ytVideoId?: string }): string | null {
    if (item.ytVideoId) return item.ytVideoId;
    if (item.id?.startsWith('yt:video:')) return item.id.slice('yt:video:'.length);
    const m = item.link?.match(/[?&]v=([\w-]{11})/);
    return m?.[1] ?? null;
  }

  private async findCompanyId(db: ReturnType<typeof getDb>, companyName: string): Promise<string | null> {
    try {
      const result = await db.execute(
        sql`SELECT id FROM companies WHERE name ILIKE ${'%' + companyName + '%'} LIMIT 1`
      );
      const rows = (result as unknown as { rows?: { id: string }[] }).rows ?? [];
      return rows[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 전체 채널 수집 실행
   */
  async collect(): Promise<CollectResult> {
    const db = getDb();
    const result: CollectResult = {
      channelsProcessed: 0,
      channelsSkipped: 0,
      skippedChannels: [],
      videosFound: 0,
      videosInserted: 0,
      videosUpdated: 0,
      errors: [],
    };

    for (const channel of YOUTUBE_CHANNELS) {
      const channelId = channel.channelId ?? (await this.resolveChannelId(channel.handle));
      if (!channelId) {
        result.channelsSkipped++;
        result.skippedChannels.push(`${channel.channelName} (@${channel.handle})`);
        continue; // channelId 해석 실패 (핸들 오류 또는 API 키 없음) → 스킵
      }

      try {
        const feed = await this.parser.parseURL(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        );
        const companyId = await this.findCompanyId(db, channel.company);
        result.channelsProcessed++;

        for (const item of feed.items ?? []) {
          const videoId = this.extractVideoId(item as YtFeedItem & { ytVideoId?: string });
          if (!videoId || !item.title) continue;
          result.videosFound++;

          const contentHash = createHash('md5').update(`yt-video-${videoId}`).digest('hex');
          const media = extractMediaInfo((item as YtFeedItem).mediaGroup);
          const inserted = await db
            .insert(articles)
            .values({
              companyId: companyId ?? undefined,
              title: item.title,
              source: `YouTube — ${channel.channelName}`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
              summary: null,
              language: 'en',
              category: 'product',
              productType: 'video',
              contentHash,
              extractedMetadata: {
                videoId,
                channel: channel.channelName,
                channelId,
                thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                mentionedCompanies: [channel.company],
                description: media.description,
                views: media.views,
                viewsUpdatedAt: new Date().toISOString(),
              },
            })
            .onConflictDoNothing()
            .returning({ id: articles.id });

          if (inserted.length > 0) {
            result.videosInserted++;
          } else {
            // 이미 수집된 영상 — 설명·조회수만 최신값으로 병합 (aiTags 등 기존 키 보존)
            const patch: Record<string, unknown> = { viewsUpdatedAt: new Date().toISOString() };
            if (media.description) patch.description = media.description;
            if (media.views != null) patch.views = media.views;
            await db.execute(sql`
              UPDATE articles
              SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
              WHERE content_hash = ${contentHash} AND product_type = 'video'
            `);
            result.videosUpdated++;
          }
        }
      } catch (err) {
        result.errors.push(`${channel.channelName}: ${(err as Error).message}`);
      }
    }

    console.log(
      `[YouTube] channels ${result.channelsProcessed} ok / ${result.channelsSkipped} skipped, ` +
        `videos ${result.videosInserted} new / ${result.videosUpdated} updated / ${result.videosFound} seen, errors ${result.errors.length}` +
        (result.skippedChannels.length > 0 ? ` — skipped: ${result.skippedChannels.join(', ')}` : '')
    );
    return result;
  }
}

export const youtubeCollectorService = new YoutubeCollectorService();
