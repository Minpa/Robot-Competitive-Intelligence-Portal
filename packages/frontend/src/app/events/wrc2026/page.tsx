'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag } from '@/components/ui';
import { ExternalLink, RefreshCw, Sparkles, X } from 'lucide-react';

const EVENT_KEY = 'wrc2026';

interface EventBrief {
  mainProducts: string[];
  demoContents: string[];
  insights: string[];
  briefedAt: string | null;
}

interface EventVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  channel: string | null;
  publishedAt: string | null;
  brief: EventBrief | null;
  thirdParty?: boolean;
}

interface EventTrendSummary {
  headline: string;
  points: string[];
  basedOn: number;
  generatedAt: string;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([\w-]{11})/);
  return m ? m[1] : null;
}

/** 스크린샷 스타일: 좌측 라벨 박스 + 우측 불릿 리스트 */
function BriefRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-24 self-start border border-ink-300 px-2 py-1.5 text-center text-[12px] font-semibold text-ink-900 leading-snug">
        {label}
      </div>
      <ul className="flex-1 space-y-1 pt-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[12.5px] text-ink-700 leading-relaxed">
            <span className="text-ink-400">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Wrc2026Page() {
  const qc = useQueryClient();
  const [playing, setPlaying] = useState<EventVideo | null>(null);

  const videosQuery = useQuery({
    queryKey: ['event-videos', EVENT_KEY],
    queryFn: () => api.getEventVideos(EVENT_KEY),
  });
  const videos: EventVideo[] = Array.isArray(videosQuery.data) ? (videosQuery.data as EventVideo[]) : [];
  const briefedCount = videos.filter((v) => v.brief).length;

  const trendQuery = useQuery({
    queryKey: ['event-trend', EVENT_KEY],
    queryFn: () => api.getEventTrendSummary(EVENT_KEY),
    staleTime: 30 * 60 * 1000,
  });
  const trend: EventTrendSummary | null = trendQuery.data?.summary ?? null;

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe(), staleTime: 10 * 60 * 1000 });
  const isAdmin = meQuery.data?.user?.role === 'admin' || meQuery.data?.role === 'admin';

  const runBatch = useMutation({
    mutationFn: () => api.runEventBriefBatch(EVENT_KEY),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-videos', EVENT_KEY] }),
  });

  const briefOne = useMutation({
    mutationFn: (id: string) => api.briefEventVideo(id, EVENT_KEY),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-videos', EVENT_KEY] }),
  });

  const playingVideoId = playing ? getVideoId(playing.url) : null;

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          module="Event Special"
          titleKo="WRC 2026 특집"
          titleEn="World Robot Conference 2026"
          description="WRC 2026(세계 로봇 대회) 관련 수집 영상을 모아, Gemini 영상 분석으로 주요 제품·시연 내용·기술 관점 시사점을 정리합니다."
          actions={
            isAdmin ? (
              <button
                onClick={() => runBatch.mutate()}
                disabled={runBatch.isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${runBatch.isPending ? 'animate-pulse' : ''}`} />
                브리프 일괄 생성
              </button>
            ) : undefined
          }
        />

        {trend && (
          <Panel kicker="AI Trend Summary" title={trend.headline}>
            <ul className="space-y-1.5">
              {trend.points.map((p, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] text-ink-700 leading-relaxed">
                  <span className="text-ink-400">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-[10.5px] text-ink-400">
              브리프 {trend.basedOn}건 기반 · {formatDate(trend.generatedAt)}
            </p>
          </Panel>
        )}

        {runBatch.data && (
          <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
            브리프 생성 완료 — 성공 {runBatch.data.briefed}건, 실패 {runBatch.data.failed}건, 건너뜀{' '}
            {runBatch.data.skipped}건.
            {runBatch.data.skipped > 0 && ' (건너뜀은 대부분 Gemini 일일 쿼터 소진 — 내일 자동 재시도)'}
          </div>
        )}

        {/* Player */}
        {playing && playingVideoId && (
          <Panel padding="none">
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
                  {playing.channel && <span>{playing.channel}</span>}
                  <span>{formatDate(playing.publishedAt)}</span>
                  <a
                    href={playing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-info hover:underline"
                  >
                    YouTube에서 보기 <ExternalLink className="w-3 h-3" />
                  </a>
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

        <Panel
          kicker="WRC 2026 Videos"
          title={`관련 영상 (${videos.length}건 · 브리프 ${briefedCount}건)`}
          subtitle="제목·설명에 WRC/World Robot Conference/世界机器人大会가 포함된 2026년 7월 이후 수집 영상입니다. 브리프는 Gemini가 영상 내용을 직접 분석해 생성합니다."
        >
          {videosQuery.isLoading ? (
            <div className="py-10 text-center text-ink-400 text-sm">불러오는 중...</div>
          ) : videosQuery.isError ? (
            <div className="py-10 text-center text-sm">
              <p className="text-neg font-medium">영상 목록을 불러오지 못했습니다.</p>
              <p className="mt-1 text-[11.5px] text-ink-500 font-mono">
                {(videosQuery.error as Error)?.message ?? 'Unknown error'}
              </p>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-10 text-center text-ink-400 text-sm">
              아직 WRC 2026 관련 영상이 수집되지 않았습니다. 공식 채널이 관련 영상을 올리면 매일 새벽 수집 후 여기에 표시됩니다.
            </div>
          ) : (
            <div className="space-y-6">
              {videos.map((v) => (
                <div key={v.id} className="border border-ink-200 rounded-lg overflow-hidden">
                  {/* 영상 헤더: 썸네일 + 제목 */}
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    <button onClick={() => setPlaying(v)} className="shrink-0 block w-full sm:w-56 text-left">
                      <div className="relative aspect-video overflow-hidden rounded-md bg-ink-100">
                        {v.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-ink-400">
                            썸네일 없음
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setPlaying(v)}
                        className="text-left text-[14px] font-semibold text-ink-900 leading-snug hover:text-info"
                      >
                        {v.title}
                      </button>
                      <p className="mt-1 text-[11.5px] text-ink-500">
                        {[v.channel, formatDate(v.publishedAt)].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {v.brief ? (
                          <Tag tone="pos" size="sm">브리프 완료</Tag>
                        ) : (
                          <Tag tone="neutral" size="sm">브리프 생성 전</Tag>
                        )}
                        {v.thirdParty ? (
                          <Tag tone="warn" size="sm">외부 채널</Tag>
                        ) : (
                          <Tag tone="neutral" size="sm">공식 채널</Tag>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => briefOne.mutate(v.id)}
                            disabled={briefOne.isPending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-ink-200 bg-white text-ink-600 hover:border-ink-400 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${briefOne.isPending ? 'animate-spin' : ''}`} />
                            {v.brief ? '브리프 재생성' : '브리프 생성'}
                          </button>
                        )}
                      </div>
                      {briefOne.isError && (
                        <p className="mt-1.5 text-[11.5px] text-neg">
                          {(briefOne.error as Error)?.message ?? '브리프 생성 실패'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 브리프: 주요 제품 / 시연 내용 / 기술 관점 시사점 */}
                  {v.brief && (
                    <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-4 space-y-3">
                      <BriefRow label="주요 제품" items={v.brief.mainProducts} />
                      <BriefRow label="시연 내용" items={v.brief.demoContents} />
                      <BriefRow label="기술 관점 시사점" items={v.brief.insights} />
                      {v.brief.briefedAt && (
                        <p className="text-right text-[10.5px] text-ink-400">
                          Gemini 영상 분석 · {formatDate(v.brief.briefedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <p className="text-[11.5px] text-ink-500">
          브리프는 매일 새벽 자동 생성됩니다. 영상에서 실제로 확인되는 내용만 요약하며, 원본 영상은 카드를 클릭해
          바로 재생할 수 있습니다.
        </p>
      </div>
    </AuthGuard>
  );
}
