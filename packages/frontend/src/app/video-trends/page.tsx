'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, InsightBox } from '@/components/ui';
import { ExternalLink, X } from 'lucide-react';

const TASK_TYPES = [
  '보행/이동',
  '파지/조작',
  '전신 작업',
  '공장/산업 작업',
  '가사/서비스',
  '상호작용/데모쇼',
  '제품 공개',
  '기타',
];

const TASK_TYPE_DESCRIPTIONS: Record<string, string> = {
  '보행/이동': '걷기, 달리기, 계단 오르기, 험지 주행, 파쿠르 등 이동 능력을 보여주는 시연',
  '파지/조작': '손이나 그리퍼로 물체를 집고, 옮기고, 다루는 능력을 보여주는 시연',
  '전신 작업': '이동과 팔 조작을 동시에 수행하는 전신 협응(loco-manipulation) 시연',
  '공장/산업 작업': '공장·물류센터 등 산업 현장 투입 또는 실제 작업 라인 수행 시연',
  '가사/서비스': '가정·매장 등 생활 공간에서 청소, 정리, 서빙 같은 작업 시연',
  '상호작용/데모쇼': '사람과의 대화, 춤·퍼포먼스, 전시 부스 등 볼거리 중심의 영상. 기술 검증보다 마케팅 성격이 강함',
  '제품 공개': '신제품·신형 모델을 처음 공개하는 발표 영상',
  '기타': '위 유형에 명확히 속하지 않는 영상',
};

const CHART_COLORS = [
  '#1f3a5f', '#b8860b', '#2e7d32', '#c62828', '#6a1b9a', '#00838f', '#ef6c00', '#546e7a',
];

interface VideoRow {
  id: string;
  title: string;
  url?: string | null;
  publishedAt?: string | null;
  extractedMetadata?: {
    channel?: string;
    views?: number | null;
    videoId?: string;
    thumbnail?: string;
    aiTags?: { taskTypes?: string[] };
  } | null;
}

function getThumbnail(v: VideoRow): string | null {
  if (v.extractedMetadata?.thumbnail) return v.extractedMetadata.thumbnail;
  if (v.extractedMetadata?.videoId) return `https://i.ytimg.com/vi/${v.extractedMetadata.videoId}/mqdefault.jpg`;
  const m = v.url?.match(/[?&]v=([\w-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function monthKey(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function VideoTrendsPage() {
  const videosQuery = useQuery({
    queryKey: ['video-trends-videos'],
    queryFn: () =>
      api.getArticles({
        productType: 'video',
        page: '1',
        pageSize: '500',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['video-trends-summary'],
    queryFn: () => api.getVideoTrendSummary(),
    staleTime: 30 * 60 * 1000,
  });

  const videos: VideoRow[] = useMemo(
    () =>
      ((videosQuery.data?.items ?? []) as VideoRow[]).filter((v) => {
        // 로봇(완제품) 채널만 — 단위기술 영상은 각 기술 축 페이지가 담당
        const domain = (v.extractedMetadata as { domain?: string } | null)?.domain;
        return !domain || domain === 'robot';
      }),
    [videosQuery.data]
  );

  // 회사(채널) × 작업유형 히트맵 (최근 6개월) — 셀별 영상 리스트도 함께 보관
  const heatmap = useMemo(() => {
    const sixMonthsAgo = Date.now() - 183 * 24 * 60 * 60 * 1000;
    const counts = new Map<string, Map<string, number>>();
    const cellVideos = new Map<string, VideoRow[]>();
    let maxCount = 0;

    for (const v of videos) {
      const t = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
      if (t < sixMonthsAgo) continue;
      const channel = v.extractedMetadata?.channel;
      const tasks = v.extractedMetadata?.aiTags?.taskTypes ?? [];
      if (!channel || tasks.length === 0) continue;
      if (!counts.has(channel)) counts.set(channel, new Map());
      const row = counts.get(channel)!;
      for (const task of tasks) {
        const next = (row.get(task) ?? 0) + 1;
        row.set(task, next);
        if (next > maxCount) maxCount = next;
        const key = `${channel}|${task}`;
        if (!cellVideos.has(key)) cellVideos.set(key, []);
        cellVideos.get(key)!.push(v);
      }
    }

    const channels = [...counts.keys()].sort((a, b) => {
      const totalA = [...counts.get(a)!.values()].reduce((s, n) => s + n, 0);
      const totalB = [...counts.get(b)!.values()].reduce((s, n) => s + n, 0);
      return totalB - totalA;
    });

    return { counts, channels, maxCount, cellVideos };
  }, [videos]);

  const [cellPopover, setCellPopover] = useState<{ channel: string; task: string } | null>(null);
  const popoverVideos = cellPopover
    ? heatmap.cellVideos.get(`${cellPopover.channel}|${cellPopover.task}`) ?? []
    : [];

  // 월별 × 채널 공개 빈도 (최근 6개월, 상위 8개 채널)
  const cadence = useMemo(() => {
    const byMonthChannel = new Map<string, Map<string, number>>();
    const channelTotals = new Map<string, number>();
    const sixMonthsAgo = Date.now() - 183 * 24 * 60 * 60 * 1000;

    for (const v of videos) {
      const t = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
      if (t < sixMonthsAgo) continue;
      const mk = monthKey(v.publishedAt);
      const channel = v.extractedMetadata?.channel;
      if (!mk || !channel) continue;
      if (!byMonthChannel.has(mk)) byMonthChannel.set(mk, new Map());
      const row = byMonthChannel.get(mk)!;
      row.set(channel, (row.get(channel) ?? 0) + 1);
      channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + 1);
    }

    const topChannels = [...channelTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c]) => c);

    const months = [...byMonthChannel.keys()].sort();
    const data = months.map((m) => {
      const row: Record<string, string | number> = { month: m };
      const channelRow = byMonthChannel.get(m)!;
      for (const c of topChannels) row[c] = channelRow.get(c) ?? 0;
      return row;
    });

    return { data, topChannels };
  }, [videos]);

  // 관심도 상위 (조회수, 최근 90일)
  const topViewed = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return videos
      .filter((v) => {
        const t = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
        return t >= ninetyDaysAgo && typeof v.extractedMetadata?.views === 'number';
      })
      .sort((a, b) => (b.extractedMetadata?.views ?? 0) - (a.extractedMetadata?.views ?? 0))
      .slice(0, 10);
  }, [videos]);

  const untaggedCount = useMemo(
    () => videos.filter((v) => !v.extractedMetadata?.aiTags).length,
    [videos]
  );

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          module="Video Intelligence"
          titleKo="영상기반 경쟁사 트렌드"
          titleEn="Demo Trend Analysis"
          description="경쟁사 공식 유튜브 데모 영상의 시연 주제·공개 빈도·시장 관심도를 분석합니다. 데이터는 공식 채널 피드 기반입니다."
          actions={
            <Link
              href="/videos"
              className="px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
            >
              영상 갤러리 →
            </Link>
          }
        />

        {/* AI Summary */}
        <InsightBox label="AI Trend Summary" tone="gold" title="최근 60일 시연 트렌드">
          <p className="text-[13px] leading-relaxed">
            {summaryQuery.isLoading
              ? '요약을 생성하는 중...'
              : summaryQuery.data?.summary ?? '요약을 불러오지 못했습니다.'}
          </p>
        </InsightBox>

        {untaggedCount > 0 && (
          <p className="text-[11.5px] text-ink-500">
            ℹ 아직 AI 태깅되지 않은 영상이 {untaggedCount}건 있습니다. 태깅은 매일 04:00에 자동 실행되며, 완료되면 아래 분석에 반영됩니다.
          </p>
        )}

        {/* Heatmap: company × task type */}
        <Panel
          kicker="Demo Focus Map"
          title="회사 × 시연 작업 유형 (최근 6개월)"
          subtitle="각 회사가 어떤 작업의 시연에 집중하는지 보여줍니다. 진할수록 해당 유형 영상이 많습니다."
        >
          {heatmap.channels.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              태깅된 영상이 아직 없습니다. AI 태깅 완료 후 표시됩니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-3 text-ink-500 font-medium whitespace-nowrap">채널</th>
                    {TASK_TYPES.map((t) => (
                      <th key={t} className="px-1.5 py-2 text-ink-500 font-medium whitespace-nowrap text-center">
                        <span className="relative group cursor-help border-b border-dotted border-ink-300">
                          {t}
                          <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-52 -translate-x-1/2 whitespace-normal bg-brand px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-white shadow-lg group-hover:block">
                            {TASK_TYPE_DESCRIPTIONS[t]}
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.channels.map((channel) => {
                    const row = heatmap.counts.get(channel)!;
                    return (
                      <tr key={channel} className="border-t border-ink-100">
                        <td className="py-1.5 pr-3 font-medium text-ink-900 whitespace-nowrap">{channel}</td>
                        {TASK_TYPES.map((task) => {
                          const count = row.get(task) ?? 0;
                          const intensity = heatmap.maxCount > 0 ? count / heatmap.maxCount : 0;
                          return (
                            <td key={task} className="px-1.5 py-1.5">
                              {count > 0 ? (
                                <button
                                  onClick={() => setCellPopover({ channel, task })}
                                  className="w-full h-7 flex items-center justify-center font-mono text-[10.5px] cursor-pointer hover:ring-1 hover:ring-gold transition-shadow"
                                  style={{
                                    backgroundColor: `rgba(31, 58, 95, ${0.12 + intensity * 0.78})`,
                                    color: intensity > 0.5 ? '#fff' : '#1f3a5f',
                                  }}
                                  title={`${channel} — ${task} 영상 ${count}건 보기`}
                                >
                                  {count}
                                </button>
                              ) : (
                                <div className="h-7 flex items-center justify-center font-mono text-[10.5px] text-ink-200">
                                  ·
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Cell popover: 채널 × 작업유형 영상 리스트 */}
        {cellPopover && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setCellPopover(null)}
          >
            <div
              className="w-full max-w-lg max-h-[70vh] overflow-y-auto bg-white border border-ink-200 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between gap-3 bg-brand px-5 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] text-gold uppercase tracking-[0.22em]">
                    {cellPopover.task}
                  </p>
                  <h3 className="text-[14px] font-semibold text-white truncate">
                    {cellPopover.channel} · {popoverVideos.length}건
                  </h3>
                </div>
                <button
                  onClick={() => setCellPopover(null)}
                  className="shrink-0 p-1 text-white/70 hover:text-white transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-ink-100">
                {popoverVideos.map((v) => {
                  const thumb = getThumbnail(v);
                  return (
                    <a
                      key={v.id}
                      href={v.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-paper transition-colors"
                    >
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="w-24 aspect-video object-cover shrink-0 bg-ink-100"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-ink-900 leading-snug">{v.title}</p>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('ko-KR') : ''}
                          {typeof v.extractedMetadata?.views === 'number' &&
                            ` · ${v.extractedMetadata.views.toLocaleString()}회`}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-400" />
                    </a>
                  );
                })}
              </div>
              <div className="px-5 py-2.5 border-t border-ink-200 bg-paper">
                <Link
                  href="/videos"
                  className="text-[11.5px] text-info hover:underline"
                  onClick={() => setCellPopover(null)}
                >
                  갤러리에서 필터로 보기 →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Cadence chart */}
        <Panel
          kicker="Release Cadence"
          title="월별 데모 공개 빈도 (최근 6개월)"
          subtitle="공개 주기가 급격히 빨라지는 회사는 대형 발표의 전조일 수 있습니다."
        >
          {cadence.data.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">데이터가 부족합니다.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cadence.data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {cadence.topChannels.map((channel, i) => (
                    <Bar
                      key={channel}
                      dataKey={channel}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Top viewed */}
        <Panel
          kicker="Market Attention"
          title="관심도 상위 데모 (최근 90일, 조회수 기준)"
          subtitle="조회수는 유튜브 공식 피드가 제공하는 수치이며 수집 시점 기준입니다."
        >
          {topViewed.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              조회수 데이터가 아직 없습니다. 다음 수집(매일 03:00)부터 채워집니다.
            </div>
          ) : (
            <div className="space-y-2">
              {topViewed.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 border-b border-ink-100 pb-2 last:border-b-0">
                  <span className="shrink-0 w-6 font-mono text-[11px] text-gold font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-ink-900 truncate">{v.title}</p>
                    <p className="text-[11px] text-ink-500">
                      {v.extractedMetadata?.channel} ·{' '}
                      {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11.5px] text-ink-700">
                    {(v.extractedMetadata?.views ?? 0).toLocaleString()}회
                  </span>
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-info hover:text-ink-900"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AuthGuard>
  );
}
