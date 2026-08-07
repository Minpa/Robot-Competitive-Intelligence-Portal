'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag } from '@/components/ui';
import { Play, ExternalLink, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVideoIdFromItem, usePlayableFilter } from '@/lib/usePlayableVideos';

type TechnicalMaturity = 'staged-demo' | 'lab' | 'pilot-field' | 'production' | 'unclear';

interface GeminiTechnicalAnalysis {
  locomotion: string | null;
  manipulation: string | null;
  hardware: string | null;
  controlNotes: string | null;
  technicalHighlights: string[];
  limitations: string[];
  maturity: TechnicalMaturity;
  maturityEvidence: string | null;
}

interface GeminiVideoAnalysis {
  task: string;
  environment: string;
  autonomy: 'autonomous' | 'teleoperated' | 'assisted' | 'unclear';
  autonomyEvidence?: string;
  robotCount: number | null;
  durationSec: number | null;
  capabilities: string[];
  keyMoments: { timestampSec: number; description: string }[];
  summaryKo: string;
  model: string;
  analyzedAt: string;
  technicalAnalysis?: GeminiTechnicalAnalysis;
}

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
    geminiAnalysis?: GeminiVideoAnalysis;
  } | null;
}

const AUTONOMY_LABEL: Record<GeminiVideoAnalysis['autonomy'], string> = {
  autonomous: '자율',
  teleoperated: '원격조작',
  assisted: '보조',
  unclear: '불명확',
};

const AUTONOMY_TONE: Record<GeminiVideoAnalysis['autonomy'], 'pos' | 'warn' | 'neutral'> = {
  autonomous: 'pos',
  teleoperated: 'warn',
  assisted: 'neutral',
  unclear: 'neutral',
};

const MATURITY_LABEL: Record<TechnicalMaturity, string> = {
  'staged-demo': '연출 데모',
  lab: '실험실',
  'pilot-field': '현장 파일럿',
  production: '상용 운영',
  unclear: '불명확',
};

const MATURITY_TONE: Record<TechnicalMaturity, 'pos' | 'warn' | 'neutral' | 'info'> = {
  'staged-demo': 'warn',
  lab: 'neutral',
  'pilot-field': 'info',
  production: 'pos',
  unclear: 'neutral',
};

function formatDuration(sec?: number | null) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface TrendingVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  views: number;
  growthRate: number;
  publishedAt: string | null;
  channel?: string;
  rank: number;
}


function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function VideosPage() {
  const qc = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [playing, setPlaying] = useState<VideoItem | null>(null);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as any)?.role === 'admin';

  const videosQuery = useQuery({
    queryKey: ['demo-videos'],
    queryFn: () =>
      api.getArticles({
        productType: 'video',
        page: '1',
        pageSize: '500',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      }),
  });

  const analyzeVideo = useMutation({
    mutationFn: (articleId: string) => api.analyzeVideoContent(articleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demo-videos'] }),
  });

  const topVideosQuery = useQuery({
    queryKey: ['video-trends-top-videos'],
    queryFn: () => api.getVideoTrendTopVideos(),
    staleTime: 30 * 60 * 1000,
  });

  const topVideos: TrendingVideo[] = useMemo(
    () => (topVideosQuery.data ?? []).map((item, index) => ({
      ...item,
      rank: index + 1,
    })),
    [topVideosQuery.data]
  );

  const rawItems: VideoItem[] = useMemo(
    () => ((videosQuery.data?.items ?? []) as VideoItem[]).filter((v) => {
      // 로봇(완제품) 채널만 — 단위기술 채널 영상은 각 기술 축 페이지에서 표시
      const domain = (v.extractedMetadata as { domain?: string } | null)?.domain;
      return !domain || domain === 'robot';
    }),
    [videosQuery.data]
  );

  const { filtered: items } = usePlayableFilter<VideoItem>(rawItems, (v) => getVideoIdFromItem(v));

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

  // 재생 중인 영상의 최신 데이터(Gemini 분석 반영)를 목록에서 다시 조회
  const playingLive = playing ? (items.find((v) => v.id === playing.id) ?? playing) : null;
  const playingVideoId = playingLive ? getVideoIdFromItem(playingLive) : null;
  const geminiAnalysis = playingLive?.extractedMetadata?.geminiAnalysis ?? null;

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          module="Demo Videos"
          titleKo="데모 영상"
          titleEn="Demo Library"
          description="경쟁사 로봇(완제품) 공식 유튜브 채널의 기술 데모를 모아 보여줍니다. 카드를 클릭하면 페이지 안에서 바로 재생됩니다. 핸드·RFM 등 단위기술 영상은 각 기술 축 페이지에 있습니다."
        />

        <Panel
          kicker="Trending Videos"
          title="최근 7일 급상승 영상 Top 10"
          subtitle="최근 7일간 수집된 영상 중 조회수 기반으로 급상승 가능성이 높은 영상들을 보여줍니다."
          className="mb-6"
        >
          {topVideosQuery.isLoading ? (
            <div className="py-8 text-center text-ink-400 text-sm">로딩 중...</div>
          ) : topVideos.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              최근 7일 급상승 영상 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topVideos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative overflow-hidden bg-ink-100 aspect-video">
                    {video.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-ink-400">
                        썸네일 없음
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[11px] font-semibold text-black shadow-sm">
                      #{video.rank}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2">
                      {video.title}
                    </p>
                    <p className="mt-2 text-[11.5px] text-ink-500">
                      {video.channel ? `${video.channel} · ` : ''}
                      {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-mono text-[12px] text-ink-900">
                        {video.views.toLocaleString()}회
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                        조회수 성장 지수 {video.growthRate.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>

        {/* Player */}
        {playingLive && playingVideoId && (
          <Panel padding="none" className="mb-6">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                title={playingLive.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-ink-900 leading-snug">{playingLive.title}</h2>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-ink-500">
                  {playingLive.extractedMetadata?.channel && <span>{playingLive.extractedMetadata.channel}</span>}
                  <span>{formatDate(playingLive.publishedAt)}</span>
                  {playingLive.url && (
                    <a
                      href={playingLive.url}
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

            {/* Gemini 영상 내용 상세 분석 */}
            <div className="border-t border-ink-100 px-5 py-4">
              {geminiAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag tone={AUTONOMY_TONE[geminiAnalysis.autonomy]} size="sm">
                      {AUTONOMY_LABEL[geminiAnalysis.autonomy]}
                    </Tag>
                    {typeof geminiAnalysis.robotCount === 'number' && (
                      <span className="text-[11.5px] text-ink-500">로봇 {geminiAnalysis.robotCount}대</span>
                    )}
                    {formatDuration(geminiAnalysis.durationSec) && (
                      <span className="text-[11.5px] text-ink-500">
                        작업 구간 {formatDuration(geminiAnalysis.durationSec)}
                      </span>
                    )}
                  </div>

                  {geminiAnalysis.summaryKo && (
                    <p className="text-[13px] text-ink-700 leading-relaxed">{geminiAnalysis.summaryKo}</p>
                  )}

                  {geminiAnalysis.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {geminiAnalysis.capabilities.map((cap) => (
                        <Tag key={cap} tone="neutral" size="sm">{cap}</Tag>
                      ))}
                    </div>
                  )}

                  {geminiAnalysis.autonomyEvidence && (
                    <p className="text-[11.5px] text-ink-400">자율성 근거: {geminiAnalysis.autonomyEvidence}</p>
                  )}

                  {geminiAnalysis.keyMoments.length > 0 && (
                    <div className="pt-1">
                      <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.18em] mb-1.5">
                        핵심 순간
                      </p>
                      <ul className="space-y-1">
                        {geminiAnalysis.keyMoments.map((m, idx) => (
                          <li key={idx}>
                            <a
                              href={`${playingLive!.url}&t=${m.timestampSec}s`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-start gap-2 text-[12px] text-ink-600 hover:text-info"
                            >
                              <span className="font-mono text-[11px] text-info shrink-0">
                                {formatDuration(m.timestampSec)}
                              </span>
                              <span>{m.description}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {geminiAnalysis.technicalAnalysis && (
                    <div className="pt-2 border-t border-ink-100">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.18em]">
                          기술 분석
                        </p>
                        <Tag tone={MATURITY_TONE[geminiAnalysis.technicalAnalysis.maturity]} size="sm">
                          {MATURITY_LABEL[geminiAnalysis.technicalAnalysis.maturity]}
                        </Tag>
                      </div>
                      {[
                        geminiAnalysis.technicalAnalysis.locomotion,
                        geminiAnalysis.technicalAnalysis.manipulation,
                        geminiAnalysis.technicalAnalysis.hardware,
                        geminiAnalysis.technicalAnalysis.controlNotes,
                      ].filter(Boolean).length > 0 && (
                        <p className="text-[12px] text-ink-700 leading-relaxed">
                          {[
                            geminiAnalysis.technicalAnalysis.locomotion,
                            geminiAnalysis.technicalAnalysis.manipulation,
                            geminiAnalysis.technicalAnalysis.hardware,
                            geminiAnalysis.technicalAnalysis.controlNotes,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {geminiAnalysis.technicalAnalysis.technicalHighlights.length > 0 && (
                        <ul className="mt-1.5 list-disc list-inside text-[12px] text-ink-700 space-y-0.5">
                          {geminiAnalysis.technicalAnalysis.technicalHighlights.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      )}
                      {geminiAnalysis.technicalAnalysis.limitations.length > 0 && (
                        <ul className="mt-1.5 list-disc list-inside text-[12px] text-ink-500 space-y-0.5">
                          {geminiAnalysis.technicalAnalysis.limitations.map((l, idx) => (
                            <li key={idx}>{l}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-ink-400">아직 상세 분석되지 않은 영상입니다.</p>
                  {isAdmin && (
                    <button
                      onClick={() => analyzeVideo.mutate(playingLive!.id)}
                      disabled={analyzeVideo.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={cn('w-3.5 h-3.5', analyzeVideo.isPending && 'animate-pulse')} />
                      {analyzeVideo.isPending ? '분석 중...' : '지금 분석하기'}
                    </button>
                  )}
                </div>
              )}
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
            const vid = getVideoIdFromItem(video)!;
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
