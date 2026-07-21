'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag } from '@/components/ui';
import { Play, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoItem {
  id: string;
  companyId?: string | null;
  title: string;
  source?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  extractedMetadata?: {
    videoId?: string;
    channel?: string;
    thumbnail?: string;
    views?: number | null;
    aiTags?: { taskTypes?: string[]; techTags?: string[]; robots?: string[] };
  } | null;
}

function getVideoId(item: VideoItem): string | null {
  if (item.extractedMetadata?.videoId) return item.extractedMetadata.videoId;
  const m = item.url?.match(/[?&]v=([\w-]{11})/) ?? item.url?.match(/youtu\.be\/([\w-]{11})/);
  return m ? m[1] : null;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function VideosPage() {
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [playing, setPlaying] = useState<VideoItem | null>(null);

  const videosQuery = useQuery({
    queryKey: ['demo-videos'],
    queryFn: () =>
      api.getArticles({
        productType: 'video',
        page: '1',
        pageSize: '100',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      }),
  });

  const items: VideoItem[] = useMemo(
    () => ((videosQuery.data?.items ?? []) as VideoItem[]).filter((v) => getVideoId(v)),
    [videosQuery.data]
  );

  const channels = useMemo(() => {
    const set = new Set<string>();
    items.forEach((v) => {
      const ch = v.extractedMetadata?.channel;
      if (ch) set.add(ch);
    });
    return Array.from(set).sort();
  }, [items]);

  const taskTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((v) => v.extractedMetadata?.aiTags?.taskTypes?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((v) => {
        if (channelFilter !== 'all' && v.extractedMetadata?.channel !== channelFilter) return false;
        if (taskFilter !== 'all' && !v.extractedMetadata?.aiTags?.taskTypes?.includes(taskFilter)) return false;
        return true;
      }),
    [items, channelFilter, taskFilter]
  );

  const playingVideoId = playing ? getVideoId(playing) : null;

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          module="Demo Videos"
          titleKo="데모 영상"
          titleEn="Demo Library"
          description="경쟁사 공식 유튜브 채널의 기술 데모를 모아 보여줍니다. 카드를 클릭하면 페이지 안에서 바로 재생됩니다."
        />

        {/* Player */}
        {playing && playingVideoId && (
          <Panel padding="none" className="mb-6">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-ink-900 leading-snug">{playing.title}</h2>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-ink-500">
                  {playing.extractedMetadata?.channel && <span>{playing.extractedMetadata.channel}</span>}
                  <span>{formatDate(playing.publishedAt)}</span>
                  {playing.url && (
                    <a
                      href={playing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-info hover:underline"
                    >
                      YouTube에서 보기 <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPlaying(null)}
                className="shrink-0 p-1.5 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Panel>
        )}

        {/* Channel filter */}
        {channels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setChannelFilter('all')}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium border transition-colors',
                channelFilter === 'all'
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
              )}
            >
              전체
            </button>
            {channels.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={cn(
                  'px-3 py-1.5 text-[12px] font-medium border transition-colors',
                  channelFilter === ch
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
                )}
              >
                {ch}
              </button>
            ))}
          </div>
        )}

        {/* Task type filter (AI 태깅 결과) */}
        {taskTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-6 -mt-3">
            <span className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.18em] mr-1">작업 유형</span>
            <button
              onClick={() => setTaskFilter('all')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium border transition-colors',
                taskFilter === 'all'
                  ? 'bg-gold text-brand border-gold'
                  : 'bg-white text-ink-500 border-ink-200 hover:border-ink-400'
              )}
            >
              전체
            </button>
            {taskTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTaskFilter(t)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium border transition-colors',
                  taskFilter === t
                    ? 'bg-gold text-brand border-gold'
                    : 'bg-white text-ink-500 border-ink-200 hover:border-ink-400'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {videosQuery.isLoading && (
          <Panel><div className="py-12 text-center text-ink-400 text-sm">영상을 불러오는 중...</div></Panel>
        )}

        {!videosQuery.isLoading && filtered.length === 0 && (
          <Panel>
            <div className="py-12 text-center text-ink-400 text-sm">
              아직 수집된 영상이 없습니다. 크롤러의 유튜브 수집기가 첫 실행(매일 03:00 KST)을 마치면 여기에 표시됩니다.
            </div>
          </Panel>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => {
            const vid = getVideoId(video)!;
            const thumb = video.extractedMetadata?.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
            return (
              <button
                key={video.id}
                onClick={() => {
                  setPlaying(video);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left bg-white border border-ink-200 hover:border-ink-400 transition-colors group"
              >
                <div className="relative aspect-video bg-ink-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white opacity-80 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-ink-900 leading-snug line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {video.extractedMetadata?.channel && (
                      <Tag tone="neutral" size="sm">{video.extractedMetadata.channel}</Tag>
                    )}
                    {video.extractedMetadata?.aiTags?.taskTypes?.slice(0, 2).map((t) => (
                      <Tag key={t} tone="gold" size="sm">{t}</Tag>
                    ))}
                    <span className="text-[11px] text-ink-400">{formatDate(video.publishedAt)}</span>
                    {typeof video.extractedMetadata?.views === 'number' && (
                      <span className="text-[11px] text-ink-400 ml-auto">
                        {video.extractedMetadata.views.toLocaleString()}회
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
