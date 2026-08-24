'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag } from '@/components/ui';
import { Check, Copy, Cpu, Download, ExternalLink, Loader2, Play, RefreshCw, Sparkles, X } from 'lucide-react';
import { TrendHeadlinePanel } from './components/TrendHeadlinePanel';
import { TrendPointCards } from './components/TrendPointCards';
import { TechAxisChart } from './components/TechAxisChart';
import { TagCloud, type TagSelection } from './components/TagCloud';
import { BriefPanel } from './components/BriefPanel';
import { formatDate, getVideoId, thumbFallback } from './utils';
import type { EventVideo } from './types';

const EVENT_KEY = 'wrc2026';

const TASK_TYPE_ORDER = [
  '보행/이동',
  '파지/조작',
  '전신 작업',
  '공장/산업 작업',
  '가사/서비스',
  '상호작용/데모쇼',
  '제품 공개',
  '기타',
  '미분류',
];

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 p-1 text-ink-400 hover:text-ink-900 transition-colors"
      aria-label="URL 복사"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-pos" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Wrc2026Page() {
  const qc = useQueryClient();
  const [playing, setPlaying] = useState<EventVideo | null>(null);
  const [pptLoading, setPptLoading] = useState(false);
  const [pptError, setPptError] = useState<string | null>(null);
  const [reportPptLoading, setReportPptLoading] = useState(false);
  const [reportPptError, setReportPptError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<TagSelection | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handlePptDownload = async () => {
    setPptLoading(true);
    setPptError(null);
    try {
      await api.downloadEventPpt(EVENT_KEY);
    } catch (e) {
      setPptError((e as Error)?.message ?? 'PPT 생성에 실패했습니다.');
    } finally {
      setPptLoading(false);
    }
  };

  const handleReportPptDownload = async () => {
    setReportPptLoading(true);
    setReportPptError(null);
    try {
      await api.downloadEventReportPpt(EVENT_KEY);
    } catch (e) {
      setReportPptError((e as Error)?.message ?? '임원 보고서 PPT 생성에 실패했습니다.');
    } finally {
      setReportPptLoading(false);
    }
  };

  const videosQuery = useQuery({
    queryKey: ['event-videos', EVENT_KEY],
    queryFn: () => api.getEventVideos(EVENT_KEY),
    // 목록 조회가 서버측 백그라운드 제목 번역을 트리거하므로, 미번역 제목이 남아 있는 동안 주기적으로 갱신
    refetchInterval: (query) => {
      const data = query.state.data as EventVideo[] | undefined;
      return Array.isArray(data) && data.some((v) => !v.titleKo) ? 15_000 : false;
    },
  });
  const videos: EventVideo[] = Array.isArray(videosQuery.data) ? (videosQuery.data as EventVideo[]) : [];
  const briefedCount = videos.filter((v) => v.brief).length;
  const videoMap = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);

  const trendQuery = useQuery({
    queryKey: ['event-trend', EVENT_KEY],
    queryFn: () => api.getEventTrendSummary(EVENT_KEY),
    staleTime: 30 * 60 * 1000,
    // 요약이 아직 없으면(브리프 축적 전) 30초마다 재시도 — 생성되는 즉시 상단에 표시
    refetchInterval: (query) => ((query.state.data as any)?.summary ? false : 30_000),
  });
  const trend = trendQuery.data?.summary ?? null;

  const statsQuery = useQuery({
    queryKey: ['event-stats', EVENT_KEY],
    queryFn: () => api.getEventStats(EVENT_KEY),
  });
  const stats = statsQuery.data ?? null;

  const techInsightQuery = useQuery({
    queryKey: ['event-tech-insight', EVENT_KEY],
    queryFn: () => api.getEventTechInsight(EVENT_KEY),
    staleTime: 30 * 60 * 1000,
  });
  const techInsight = techInsightQuery.data?.insight ?? null;

  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe(), staleTime: 10 * 60 * 1000 });
  const isAdmin = meQuery.data?.user?.role === 'admin' || meQuery.data?.role === 'admin';

  const runBatch = useMutation({
    mutationFn: () => api.runEventBriefBatch(EVENT_KEY),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-videos', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-trend', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-stats', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-tech-insight', EVENT_KEY] });
    },
  });

  const briefOne = useMutation({
    mutationFn: (id: string) => api.briefEventVideo(id, EVENT_KEY),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-videos', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-trend', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-stats', EVENT_KEY] });
      qc.invalidateQueries({ queryKey: ['event-tech-insight', EVENT_KEY] });
    },
  });

  const playingVideoId = playing ? getVideoId(playing.url) : null;
  const playingCurrent = playing ? (videos.find((v) => v.id === playing.id) ?? playing) : null;

  // 태그 클라우드 필터: 선택된 기업/키워드가 브리프에 태그된 영상만 그리드에 표시
  const filteredVideos = useMemo(() => {
    if (!tagFilter) return videos;
    const target = tagFilter.name.trim().toLowerCase();
    return videos.filter((v) => {
      const tags = tagFilter.type === 'company' ? v.brief?.companies : v.brief?.techKeywords;
      return (tags ?? []).some((t) => t.trim().toLowerCase() === target);
    });
  }, [videos, tagFilter]);

  const handleTagSelect = (tag: TagSelection) => {
    setTagFilter((prev) => (prev && prev.type === tag.type && prev.name === tag.name ? null : tag));
    // 필터 적용 직후 영상 리스트로 스크롤
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const groups = TASK_TYPE_ORDER.map((cat) => ({
    cat,
    items: videos.filter((v) => (v.taskTypes && v.taskTypes[0] ? v.taskTypes[0] : '미분류') === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          module="Event Special"
          titleKo="WRC 2026 특집"
          titleEn="World Robot Conference 2026"
          description="WRC 2026(세계 로봇 대회) 관련 수집 영상을 모아, Gemini 영상 분석으로 주요 제품·시연 내용·기술 관점 시사점을 정리합니다."
          actions={
            <>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handlePptDownload}
                  disabled={pptLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
                >
                  {pptLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  영상 리스트 PPT
                </button>
                {pptError && <p className="text-[10.5px] text-neg">{pptError}</p>}
              </div>
              {isAdmin && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleReportPptDownload}
                    disabled={reportPptLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
                  >
                    {reportPptLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    임원 보고서 PPT
                  </button>
                  {reportPptLoading && (
                    <p className="text-[10.5px] text-ink-400">최초 생성은 수 분 정도 걸릴 수 있습니다.</p>
                  )}
                  {reportPptError && <p className="text-[10.5px] text-neg">{reportPptError}</p>}
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => runBatch.mutate()}
                  disabled={runBatch.isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${runBatch.isPending ? 'animate-pulse' : ''}`} />
                  브리프 일괄 생성
                </button>
              )}
            </>
          }
        />

        {/* 히어로 숫자 밴드 + 기업/카테고리/주간 업로드 차트 (트렌드가 없어도 stats만으로 표시 가능) */}
        <TrendHeadlinePanel trend={trend} stats={stats} onSelectTag={handleTagSelect} selectedTag={tagFilter} />

        {/* 트렌드 포인트 카드 — 종합(제품·시장·서비스) 관점, 근거 썸네일 클릭 시 해당 영상 재생 */}
        {trend && (
          <TrendPointCards
            points={trend.points}
            videoMap={videoMap}
            onSelectVideo={(v) => setPlaying(v)}
            kicker="Trend Points — Overview"
            title="종합 트렌드"
          />
        )}

        {/* 기술 요소 분포 — 브리프 키워드를 고정 기술 축으로 분류 */}
        <TechAxisChart
          techAxes={stats?.techAxes ?? []}
          onSelectKeyword={handleTagSelect}
          selected={tagFilter}
          insight={techInsight}
        />

        {/* 트렌드 포인트 카드 — 기술 관점, 근거 썸네일 클릭 시 해당 영상 재생 */}
        {trend?.techPoints && trend.techPoints.length > 0 && (
          <TrendPointCards
            points={trend.techPoints}
            videoMap={videoMap}
            onSelectVideo={(v) => setPlaying(v)}
            kicker="Trend Points — Technical"
            title="기술 트렌드"
            icon={Cpu}
          />
        )}

        {/* 기업/기술 키워드 태그 클라우드 — 칩 클릭 시 영상 리스트 필터 */}
        <TagCloud stats={stats} selected={tagFilter} onSelect={handleTagSelect} />

        {runBatch.data &&
          (runBatch.data.alreadyRunning ? (
            <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
              브리프 생성이 이미 진행 중입니다 — 잠시 후 목록이 자동 갱신됩니다. (중복 분석은 실행되지 않았습니다)
            </div>
          ) : (
            <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
              브리프 생성 완료 — 성공 {runBatch.data.briefed}건, 실패 {runBatch.data.failed}건, 건너뜀{' '}
              {runBatch.data.skipped}건.
              {runBatch.data.skipped > 0 && ' (건너뜀은 대부분 Gemini 일일 쿼터 소진 — 내일 자동 재시도)'}
            </div>
          ))}

        {/* Player + 선택 영상 브리프 */}
        {playing && playingVideoId && playingCurrent && (
          <Panel padding="none">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                title={playingCurrent.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-ink-900 leading-snug">
                  {playingCurrent.titleKo ?? playingCurrent.title}
                </h2>
                {playingCurrent.titleKo && (
                  <p className="mt-0.5 text-[11px] text-ink-400">{playingCurrent.title}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-ink-500">
                  {playingCurrent.channel && <span>{playingCurrent.channel}</span>}
                  <span>{formatDate(playingCurrent.publishedAt)}</span>
                  <a
                    href={playingCurrent.url}
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

            <div className="px-5 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                {playingCurrent.thirdParty ? (
                  <Tag tone="warn" size="sm">외부 채널</Tag>
                ) : (
                  <Tag tone="neutral" size="sm">공식 채널</Tag>
                )}
                {playingCurrent.brief ? (
                  <Tag tone="pos" size="sm">브리프 완료</Tag>
                ) : (
                  <Tag tone="neutral" size="sm">브리프 생성 전</Tag>
                )}
                {isAdmin && (
                  <button
                    onClick={() => briefOne.mutate(playingCurrent.id)}
                    disabled={briefOne.isPending}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-ink-200 bg-white text-ink-600 hover:border-ink-400 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${briefOne.isPending ? 'animate-spin' : ''}`} />
                    {playingCurrent.brief ? '브리프 재생성' : '브리프 생성'}
                  </button>
                )}
              </div>
              {briefOne.isError && (
                <p className="text-[11.5px] text-neg">
                  {(briefOne.error as Error)?.message ?? '브리프 생성 실패'}
                </p>
              )}
              {playingCurrent.brief && <BriefPanel brief={playingCurrent.brief} />}
            </div>
          </Panel>
        )}

        {/* 영상 그리드 */}
        <div ref={gridRef} className="scroll-mt-4">
        <Panel
          kicker="WRC 2026 Videos"
          title={
            tagFilter
              ? `관련 영상 (${filteredVideos.length}건 / 전체 ${videos.length}건)`
              : `관련 영상 (${videos.length}건 · 브리프 ${briefedCount}건)`
          }
          subtitle="제목·설명에 WRC/World Robot Conference/世界机器人大会가 포함된 2026년 7월 이후 수집 영상입니다. 브리프는 Gemini가 영상 내용을 직접 분석해 생성합니다."
        >
          {tagFilter && (
            <div className="mb-3 flex items-center gap-2 text-[12px] text-ink-700">
              <span className="text-ink-500">{tagFilter.type === 'company' ? '기업 필터' : '키워드 필터'}:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-ink-50 px-2.5 py-1 font-medium">
                {tagFilter.name}
                <button
                  onClick={() => setTagFilter(null)}
                  className="text-ink-400 hover:text-ink-900 transition-colors"
                  aria-label="필터 해제"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
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
          ) : filteredVideos.length === 0 ? (
            <div className="py-10 text-center text-ink-400 text-sm">
              선택한 태그가 붙은 영상이 없습니다. 필터를 해제하거나 다른 태그를 선택해 주세요.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setPlaying(v);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left bg-white border border-ink-200 hover:border-ink-400 transition-colors group"
                >
                  <div className="relative aspect-video bg-ink-100 overflow-hidden">
                    {v.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" loading="lazy" onError={thumbFallback} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-ink-400">
                        썸네일 없음
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <h3 className="text-[12px] font-semibold text-ink-900 leading-snug line-clamp-2">
                      {v.titleKo ?? v.title}
                    </h3>
                    <p className="mt-1 text-[10.5px] text-ink-500">
                      {[v.channel, formatDate(v.publishedAt)].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      {v.thirdParty ? (
                        <Tag tone="warn" size="sm">외부 채널</Tag>
                      ) : (
                        <Tag tone="neutral" size="sm">공식 채널</Tag>
                      )}
                      {v.brief && <Tag tone="pos" size="sm">브리프</Tag>}
                    </div>
                    {v.brief?.highlight && (
                      <p className="mt-1 text-[10.5px] italic text-ink-500 line-clamp-1">{v.brief.highlight}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
        </div>

        {/* 카테고리별 보고표 */}
        {groups.length > 0 && (
          <Panel
            kicker="Report Table"
            title="카테고리별 영상 정리"
            subtitle="보고 자료용 — 시연 유형별 썸네일·제목·출처·URL. 행을 복사해 장표에 활용하세요."
          >
            <div className="space-y-6">
              {groups.map(({ cat, items }) => (
                <div key={cat}>
                  <h4 className="font-semibold text-[13px] text-ink-900 mb-2">
                    {cat} ({items.length}건)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11.5px] border-collapse">
                      <thead>
                        <tr className="text-ink-500 text-left">
                          <th className="py-2 pr-3 font-medium">썸네일</th>
                          <th className="py-2 pr-3 font-medium">제목</th>
                          <th className="py-2 pr-3 font-medium">구분</th>
                          <th className="py-2 pr-3 font-medium">게시일</th>
                          <th className="py-2 pr-3 font-medium">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((v) => {
                          const vid = getVideoId(v.url);
                          const shortUrl = vid ? `youtu.be/${vid}` : v.url;
                          return (
                            <tr key={v.id} className="border-t border-ink-100">
                              <td className="py-2 pr-3">
                                {v.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    onError={thumbFallback}
                                    src={v.thumbnail}
                                    alt={v.title}
                                    className="w-28 aspect-video object-cover rounded"
                                  />
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-2 pr-3">
                                <p className="text-[12px] text-ink-900">{v.titleKo ?? v.title}</p>
                                {v.titleKo && (
                                  <p className="text-[10px] text-ink-400 line-clamp-1">{v.title}</p>
                                )}
                                {v.channel && <p className="text-[10.5px] text-ink-500">{v.channel}</p>}
                              </td>
                              <td className="py-2 pr-3">
                                {v.thirdParty ? (
                                  <Tag tone="warn" size="sm">외부 채널</Tag>
                                ) : (
                                  <Tag tone="neutral" size="sm">공식 채널</Tag>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-[11px]">{formatDate(v.publishedAt)}</td>
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info hover:underline"
                                  >
                                    {shortUrl}
                                  </a>
                                  <CopyUrlButton url={v.url} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <p className="text-[11.5px] text-ink-500">
          브리프는 매일 새벽 자동 생성됩니다. 영상에서 실제로 확인되는 내용만 요약하며, 원본 영상은 카드를 클릭해
          바로 재생할 수 있습니다.
        </p>
      </div>
    </AuthGuard>
  );
}
