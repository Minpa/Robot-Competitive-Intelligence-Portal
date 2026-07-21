'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag, KpiTile } from '@/components/ui';
import { ExternalLink, FileText, Play } from 'lucide-react';

/**
 * 단위기술 트렌드 페이지 — 로봇(완제품)과 분리해 기술 축별로
 * 데모 영상 + arXiv 논문을 취합하고 분기 단위로 활동량을 센싱한다.
 */

interface DomainConfig {
  titleKo: string;
  titleEn: string;
  description: string;
  /** 영상 필터: 수집 시 부여된 채널 도메인 */
  videoDomain: string;
  /** 영상 보조 필터: 로봇 완제품 채널 영상 중 이 태그가 있으면 포함 */
  extraTaskTypes?: string[];
  extraTechTags?: string[];
  /** 논문 필터 (제목+초록) */
  paperRegex: RegExp;
  quickLinks: { name: string; href: string }[];
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  hand: {
    titleKo: '핸드 트렌드',
    titleEn: 'Hand Technology',
    description:
      '로봇 핸드·그리퍼 전문사의 데모 영상과 관련 논문을 취합합니다. 완제품사 영상 중 파지/조작 시연도 포함됩니다.',
    videoDomain: 'hand',
    extraTaskTypes: ['파지/조작'],
    paperRegex: /\bhand\b|gripper|finger|tactile|dexter|grasp|manipulat|in-hand/i,
    quickLinks: [
      { name: '핸드 리스트', href: '/hand-registry' },
      { name: '그리퍼 리스트', href: '/gripper-registry' },
      { name: '핸드 Perfect 분석', href: '/compare/hand-benchmark' },
    ],
  },
  rfm: {
    titleKo: 'RFM 트렌드',
    titleEn: 'Robot Foundation Models',
    description:
      '로봇 파운데이션 모델 랩의 데모 영상과 관련 논문을 취합합니다. RFM은 논문·코드 발표 비중이 커서 논문 신호가 특히 중요합니다.',
    videoDomain: 'rfm',
    extraTechTags: ['VLA', '파운데이션모델', '강화학습', 'End-to-End'],
    paperRegex:
      /foundation model|vision.language.action|\bVLA\b|imitation learning|reinforcement learning|diffusion policy|world model|embodied|manipulation policy|sim.to.real/i,
    quickLinks: [{ name: '컴포넌트 트렌드', href: '/components-trend' }],
  },
  actuator: {
    titleKo: '액추에이터 트렌드',
    titleEn: 'Actuator Technology',
    description:
      '액추에이터·구동계 업체의 데모 영상과 관련 논문을 취합합니다. 부품 축은 공개 빈도가 낮아 분기 단위로 보는 것이 적절합니다.',
    videoDomain: 'actuator',
    paperRegex:
      /actuator|\bmotor\b|gearbox|harmonic drive|transmission|joint torque|quasi.direct|proprioceptive|series elastic/i,
    quickLinks: [{ name: '컴포넌트 트렌드', href: '/components-trend' }],
  },
};

interface Row {
  id: string;
  title: string;
  url?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  collectedAt?: string | null;
  extractedMetadata?: {
    channel?: string;
    domain?: string;
    views?: number | null;
    videoId?: string;
    thumbnail?: string;
    aiTags?: { taskTypes?: string[]; techTags?: string[] };
  } | null;
}

function rowDate(r: Row): number {
  const v = r.publishedAt ?? r.collectedAt;
  const t = v ? new Date(v).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function quarterKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getThumbnail(v: Row): string | null {
  if (v.extractedMetadata?.thumbnail) return v.extractedMetadata.thumbnail;
  if (v.extractedMetadata?.videoId) return `https://i.ytimg.com/vi/${v.extractedMetadata.videoId}/mqdefault.jpg`;
  return null;
}

export default function TechDomainPage() {
  const params = useParams();
  const domain = params.domain as string;
  const config = DOMAIN_CONFIGS[domain];

  const videosQuery = useQuery({
    queryKey: ['tech-videos'],
    queryFn: () =>
      api.getArticles({ productType: 'video', page: '1', pageSize: '200', sortBy: 'publishedAt', sortOrder: 'desc' }),
    enabled: !!config,
  });

  const papersQuery = useQuery({
    queryKey: ['tech-papers'],
    queryFn: () =>
      api.getArticles({ source: 'arxiv', page: '1', pageSize: '200', sortBy: 'publishedAt', sortOrder: 'desc' }),
    enabled: !!config,
  });

  const videos = useMemo(() => {
    if (!config) return [];
    const all = (videosQuery.data?.items ?? []) as Row[];
    return all
      .filter((v) => {
        const meta = v.extractedMetadata;
        if (meta?.domain === config.videoDomain) return true;
        if (config.extraTaskTypes?.some((t) => meta?.aiTags?.taskTypes?.includes(t))) return true;
        if (config.extraTechTags?.some((t) => meta?.aiTags?.techTags?.includes(t))) return true;
        return false;
      })
      .sort((a, b) => rowDate(b) - rowDate(a));
  }, [videosQuery.data, config]);

  const papers = useMemo(() => {
    if (!config) return [];
    const all = (papersQuery.data?.items ?? []) as Row[];
    return all
      .filter((p) => config.paperRegex.test(`${p.title} ${p.summary ?? ''}`))
      .sort((a, b) => rowDate(b) - rowDate(a));
  }, [papersQuery.data, config]);

  const stats = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentVideos = videos.filter((v) => rowDate(v) >= ninetyDaysAgo);
    const recentPapers = papers.filter((p) => rowDate(p) >= ninetyDaysAgo);
    const channels = new Set(recentVideos.map((v) => v.extractedMetadata?.channel).filter(Boolean));
    return { videos: recentVideos.length, papers: recentPapers.length, channels: channels.size };
  }, [videos, papers]);

  // 분기별 활동량 (최근 4분기): 영상 vs 논문
  const quarterly = useMemo(() => {
    const counts = new Map<string, { videos: number; papers: number }>();
    const yearAgo = Date.now() - 370 * 24 * 60 * 60 * 1000;
    const add = (ts: number, kind: 'videos' | 'papers') => {
      if (ts < yearAgo || ts === 0) return;
      const key = quarterKey(ts);
      if (!counts.has(key)) counts.set(key, { videos: 0, papers: 0 });
      counts.get(key)![kind]++;
    };
    videos.forEach((v) => add(rowDate(v), 'videos'));
    papers.forEach((p) => add(rowDate(p), 'papers'));
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, c]) => ({ quarter, 영상: c.videos, 논문: c.papers }));
  }, [videos, papers]);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ink-500">존재하지 않는 기술 축입니다.</p>
        <Link href="/trend-brief" className="text-info hover:underline mt-2">홈으로</Link>
      </div>
    );
  }

  const isLoading = videosQuery.isLoading || papersQuery.isLoading;

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          module="Unit Technology"
          titleKo={config.titleKo}
          titleEn={config.titleEn}
          description={config.description}
          actions={
            <div className="flex items-center gap-2">
              {config.quickLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
                >
                  {l.name}
                </Link>
              ))}
            </div>
          }
        />

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <KpiTile label="최근 90일 데모 영상" value={stats.videos} unit="건" />
          <KpiTile label="최근 90일 관련 논문" value={stats.papers} unit="편" />
          <KpiTile label="활동 채널" value={stats.channels} unit="곳" />
        </div>

        {/* Quarterly activity */}
        <Panel
          kicker="Activity Sensing"
          title="분기별 활동량 — 영상 vs 논문"
          subtitle="단위기술 축은 공개 빈도가 낮아 분기 단위로 집계합니다. 영상·논문이 함께 늘면 해당 기술이 가열되는 신호입니다."
        >
          {quarterly.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              {isLoading ? '데이터를 불러오는 중...' : '아직 데이터가 부족합니다. 수집이 쌓이면 자동으로 채워집니다.'}
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterly} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="영상" fill="#1f3a5f" />
                  <Bar dataKey="논문" fill="#b8860b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Videos */}
        <Panel
          kicker="Demo Videos"
          title={`데모 영상 (${videos.length}건)`}
          subtitle="전문 채널 영상 + 완제품사 영상 중 이 기술 축에 해당하는 시연입니다."
          headerRight={
            <Link href="/videos" className="text-[11.5px] text-info hover:underline">
              갤러리 →
            </Link>
          }
        >
          {videos.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              {isLoading
                ? '불러오는 중...'
                : '아직 수집된 영상이 없습니다. 전문 채널 수집은 다음 크론(매일 03:00)부터 시작됩니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {videos.slice(0, 12).map((v) => {
                const thumb = getThumbnail(v);
                return (
                  <a
                    key={v.id}
                    href={v.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border-b border-ink-100 pb-2 last:border-b-0 hover:bg-paper transition-colors px-1"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" className="w-20 aspect-video object-cover shrink-0 bg-ink-100" />
                    ) : (
                      <span className="w-20 aspect-video flex items-center justify-center bg-ink-100 shrink-0">
                        <Play className="w-4 h-4 text-ink-400" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink-900 leading-snug line-clamp-2">{v.title}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {v.extractedMetadata?.channel && (
                          <Tag tone="neutral" size="sm">{v.extractedMetadata.channel}</Tag>
                        )}
                        <span className="text-[11px] text-ink-400">{formatDate(v.publishedAt)}</span>
                        {typeof v.extractedMetadata?.views === 'number' && (
                          <span className="text-[11px] text-ink-400">
                            {v.extractedMetadata.views.toLocaleString()}회
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-400" />
                  </a>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Papers */}
        <Panel
          kicker="Research Papers"
          title={`관련 논문 (${papers.length}편)`}
          subtitle="arXiv 공식 API로 수집된 로봇 분야 논문 중 이 기술 축 키워드에 해당하는 것입니다."
        >
          {papers.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              {isLoading ? '불러오는 중...' : '아직 수집된 논문이 없습니다. arXiv 수집은 매일 03:00에 실행됩니다.'}
            </div>
          ) : (
            <div className="space-y-3">
              {papers.slice(0, 12).map((p) => (
                <a
                  key={p.id}
                  href={p.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 border-b border-ink-100 pb-3 last:border-b-0 hover:bg-paper transition-colors px-1"
                >
                  <FileText className="w-4 h-4 shrink-0 text-gold mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-ink-900 leading-snug">{p.title}</p>
                    {p.summary && (
                      <p className="mt-1 text-[11.5px] text-ink-500 leading-relaxed line-clamp-2">{p.summary}</p>
                    )}
                    <span className="mt-1 inline-block text-[11px] text-ink-400">
                      {formatDate(p.publishedAt ?? p.collectedAt)} · arXiv
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-400 mt-0.5" />
                </a>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AuthGuard>
  );
}
