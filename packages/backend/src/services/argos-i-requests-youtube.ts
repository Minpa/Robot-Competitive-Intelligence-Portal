/**
 * YouTube 메타 조회 (공식 Data API v3, 읽기 전용). backend 에는 YouTube 메타 조회가 없어 최소 구현으로 추가했다
 * (crawler 의 수집기는 별도 패키지라 import 할 수 없다).
 *
 * - `YOUTUBE_API_KEY` 미설정이면 ProviderNotConfiguredError → 처리기가 provider_not_configured 로 처리한다.
 * - 제목·채널·게시일만 읽는다 (설명·자막·본문 없음). API 키는 URL 쿼리에 들어가므로 URL 을 로그·오류에 남기지 않는다.
 */

import { ProviderNotConfiguredError, QuotaExceededError, UpstreamError } from './argos-i-requests-handlers/types.js';

export interface YoutubeVideoMeta {
  id: string;
  title: string;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
}

export interface YoutubeClient {
  getVideo(id: string): Promise<YoutubeVideoMeta | null>;
  /** 채널 id(UC…) 또는 @handle 의 최근 업로드 최대 max 건. 채널이 없으면 null */
  getRecentUploads(idOrHandle: string, max: number): Promise<{ channelTitle: string | null; videos: YoutubeVideoMeta[] } | null>;
}

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface ApiError {
  error?: { errors?: Array<{ reason?: string }> };
}

export function createYoutubeClient(env: Record<string, string | undefined> = process.env, fetchImpl: Fetch = fetch as unknown as Fetch, timeoutMs = 8000): YoutubeClient {
  const call = async (path: string, params: Record<string, string>): Promise<Record<string, any>> => {
    const key = env.YOUTUBE_API_KEY?.trim();
    if (!key) throw new ProviderNotConfiguredError('youtube');
    const qs = new URLSearchParams({ ...params, key });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/${path}?${qs.toString()}`, { signal: ctrl.signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        const reason = body.error?.errors?.[0]?.reason;
        if (res.status === 403 && (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded')) throw new QuotaExceededError();
        throw new UpstreamError(res.status >= 500 || res.status === 429);
      }
      return (await res.json()) as Record<string, any>;
    } catch (err) {
      if (err instanceof QuotaExceededError || err instanceof UpstreamError || err instanceof ProviderNotConfiguredError) throw err;
      throw new UpstreamError(true); // 네트워크 오류·타임아웃 (메시지에 URL 이 들어 있을 수 있어 버린다)
    } finally {
      clearTimeout(timer);
    }
  };

  const toMeta = (id: string, sn: Record<string, any> | undefined): YoutubeVideoMeta | null => {
    if (!sn || typeof sn.title !== 'string' || !sn.title) return null;
    return {
      id,
      title: sn.title,
      channelId: typeof sn.channelId === 'string' ? sn.channelId : null,
      channelTitle: typeof sn.channelTitle === 'string' ? sn.channelTitle : typeof sn.videoOwnerChannelTitle === 'string' ? sn.videoOwnerChannelTitle : null,
      publishedAt: typeof sn.publishedAt === 'string' ? sn.publishedAt : null,
    };
  };

  return {
    async getVideo(id) {
      const data = await call('videos', { part: 'snippet', id });
      const item = Array.isArray(data.items) ? data.items[0] : undefined;
      return toMeta(id, item?.snippet);
    },
    async getRecentUploads(idOrHandle, max) {
      const chParams: Record<string, string> = idOrHandle.startsWith('@') ? { part: 'snippet,contentDetails', forHandle: idOrHandle } : { part: 'snippet,contentDetails', id: idOrHandle };
      const ch = await call('channels', chParams);
      const item = Array.isArray(ch.items) ? ch.items[0] : undefined;
      const uploads = item?.contentDetails?.relatedPlaylists?.uploads;
      if (typeof uploads !== 'string' || !uploads) return null;
      const pl = await call('playlistItems', { part: 'snippet', playlistId: uploads, maxResults: String(Math.min(50, Math.max(1, max))) });
      const videos: YoutubeVideoMeta[] = [];
      for (const it of Array.isArray(pl.items) ? pl.items : []) {
        const vid = it?.snippet?.resourceId?.videoId;
        const meta = typeof vid === 'string' ? toMeta(vid, it.snippet) : null;
        if (meta) videos.push(meta);
        if (videos.length >= max) break;
      }
      return { channelTitle: typeof item?.snippet?.title === 'string' ? item.snippet.title : null, videos };
    },
  };
}
