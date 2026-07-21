'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag, KpiTile, InsightBox } from '@/components/ui';
import { ExternalLink, FileText, Play, X } from 'lucide-react';

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
  /** 영상 보조 필터: 제목+설명 키워드 매칭 (주제 축용) */
  videoTextRegex?: RegExp;
  /** 보조 자료 종류: 논문(arXiv) 또는 뉴스 기사 */
  second: 'papers' | 'news';
  secondLabel: string;
  /** 논문 필터 (제목+초록) — second가 papers일 때 */
  paperRegex?: RegExp;
  /** 기사 필터 (제목+요약) — second가 news일 때 */
  newsRegex?: RegExp;
  /** 영상 채널 도메인 제한 (설정 시 이 도메인 채널의 영상만 포함) */
  videoChannelDomains?: string[];
  /** competitive_alerts 타입 — 설정 시 알림 섹션 표시 */
  alertsType?: string;
  /** 기사 섹션을 영상보다 먼저 배치 */
  newsFirst?: boolean;
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
    second: 'papers',
    secondLabel: '논문',
    paperRegex: /\bhand\b|gripper|finger|tactile|dexter|grasp|manipulat|in-hand/i,
    quickLinks: [
      { name: '핸드 리스트', href: '/hand-registry' },
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
    second: 'papers',
    secondLabel: '논문',
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
    second: 'papers',
    secondLabel: '논문',
    paperRegex:
      /actuator|\bmotor\b|gearbox|harmonic drive|transmission|joint torque|quasi.direct|proprioceptive|series elastic/i,
    quickLinks: [{ name: '컴포넌트 트렌드', href: '/components-trend' }],
  },
  expo: {
    titleKo: '전시회 트렌드',
    titleEn: 'Exhibition Watch',
    description:
      'CES·IROS·ICRA·하노버메세·WRC 등 전시회와 학회에서의 로봇 시연 영상과 관련 기사를 취합합니다.',
    videoDomain: 'expo',
    videoTextRegex:
      /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|trade show|robocup|automatica|automate 20|world artificial intelligence/i,
    videoChannelDomains: ['robot'],
    second: 'news',
    secondLabel: '기사',
    newsRegex:
      /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|\bGTC\b|trade show|robocup|전시회|박람회/i,
    quickLinks: [{ name: '이벤트 캘린더', href: '/event-calendar' }],
  },
  production: {
    titleKo: '양산 트렌드',
    titleEn: 'Production Watch',
    description:
      '경쟁사 로봇 제품의 양산 현황을 추적합니다 — 생산라인 구축, 생산능력, 램프업 목표, 출하·납품량, 판매 가격.',
    videoDomain: 'production',
    videoTextRegex:
      /mass.?produc|production (line|ramp|facility|capacity)|start of production|robofab|botq|factory tour|manufacturing (line|facility|plant)|assembly line for|robot factory|생산라인|양산/i,
    videoChannelDomains: ['robot'],
    second: 'news',
    secondLabel: '기사',
    newsRegex:
      /mass.?produc|production (line|ramp|capacity|target|start)|units? (per|a) (week|month|year)|\d[\d,]* units|annual capacity|manufacturing (facility|capacity|plant)|robofab|botq|start.{0,12}production|deliver(y|ies|ed)|shipment|price[sd]? at|양산|생산능력|생산라인|출하|납품/i,
    alertsType: 'mass_production',
    newsFirst: true,
    quickLinks: [{ name: '도입/적용 사례', href: '/application-cases' }],
  },
};

interface Row {
  id: string;
  title: string;
  url?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  collectedAt?: string | null;
  source?: string | null;
  productType?: string | null;
  extractedMetadata?: {
    channel?: string;
    domain?: string;
    views?: number | null;
    videoId?: string;
    thumbnail?: string;
    description?: string;
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

function getVideoId(v: Row): string | null {
  if (v.extractedMetadata?.videoId) return v.extractedMetadata.videoId;
  const m = v.url?.match(/[?&]v=([\w-]{11})/) ?? v.url?.match(/youtu\.be\/([\w-]{11})/);
  return m?.[1] ?? null;
}

function getThumbnail(v: Row): string | null {
  if (v.extractedMetadata?.thumbnail) return v.extractedMetadata.thumbnail;
  const vid = getVideoId(v);
  return vid ? `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` : null;
}

export default function TechDomainPage() {
  const params = useParams();
  const domain = params.domain as string;
  const config = DOMAIN_CONFIGS[domain];
  const [playing, setPlaying] = useState<Row | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['tech-summary', domain],
    queryFn: () => api.getTechTrendSummary(domain),
    enabled: !!config,
    staleTime: 30 * 60 * 1000,
  });

  const videosQuery = useQuery({
    queryKey: ['tech-videos'],
    queryFn: () =>
      api.getArticles({ productType: 'video', page: '1', pageSize: '200', sortBy: 'publishedAt', sortOrder: 'desc' }),
    enabled: !!config,
  });

  const alertsQuery = useQuery({
    queryKey: ['tech-alerts', config?.alertsType ?? 'none'],
    queryFn: () => api.getWarRoomAlerts({ type: config!.alertsType! }),
    enabled: !!config?.alertsType,
    retry: false,
  });

  const secondaryQuery = useQuery({
    queryKey: ['tech-secondary', config?.second ?? 'papers'],
    queryFn: () =>
      config?.second === 'news'
        ? api.getArticles({ page: '1', pageSize: '200', sortBy: 'publishedAt', sortOrder: 'desc' })
        : api.getArticles({ source: 'arxiv', page: '1', pageSize: '200', sortBy: 'publishedAt', sortOrder: 'desc' }),
    enabled: !!config,
  });

  const videos = useMemo(() => {
    if (!config) return [];
    const all = (videosQuery.data?.items ?? []) as Row[];
    return all
      .filter((v) => {
        const meta = v.extractedMetadata;
        // 채널 도메인 제한: 지정된 도메인 채널의 영상만 후보로 (예: 양산 축은 완제품사 채널만)
        if (config.videoChannelDomains && !config.videoChannelDomains.includes(meta?.domain ?? '')) {
          return false;
        }
        if (meta?.domain === config.videoDomain) return true;
        if (config.extraTaskTypes?.some((t) => meta?.aiTags?.taskTypes?.includes(t))) return true;
        if (config.extraTechTags?.some((t) => meta?.aiTags?.techTags?.includes(t))) return true;
        if (config.videoTextRegex?.test(`${v.title} ${meta?.description ?? ''}`)) return true;
        return false;
      })
      .sort((a, b) => rowDate(b) - rowDate(a));
  }, [videosQuery.data, config]);

  const NON_NEWS_SOURCES = ['arxiv', 'github', 'sec_edgar', 'patent'];

  const secondary = useMemo(() => {
    if (!config) return [];
    const all = (secondaryQuery.data?.items ?? []) as Row[];
    if (config.second === 'news') {
      return all
        .filter(
          (p) =>
            p.productType !== 'video' &&
            !NON_NEWS_SOURCES.includes(p.source ?? '') &&
            (config.newsRegex?.test(`${p.title} ${p.summary ?? ''}`) ?? false)
        )
        .sort((a, b) => rowDate(b) - rowDate(a));
    }
    return all
      .filter((p) => config.paperRegex?.test(`${p.title} ${p.summary ?? ''}`) ?? false)
      .sort((a, b) => rowDate(b) - rowDate(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondaryQuery.data, config]);

  const stats = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentVideos = videos.filter((v) => rowDate(v) >= ninetyDaysAgo);
    const recentSecondary = secondary.filter((p) => rowDate(p) >= ninetyDaysAgo);
    const channels = new Set(recentVideos.map((v) => v.extractedMetadata?.channel).filter(Boolean));
    return { videos: recentVideos.length, secondary: recentSecondary.length, channels: channels.size };
  }, [videos, secondary]);

  // 분기별 활동량 (최근 4분기): 영상 vs 보조자료(논문/기사)
  const secondLabel = config?.secondLabel ?? '자료';
  const quarterly = useMemo(() => {
    const counts = new Map<string, { videos: number; secondary: number }>();
    const yearAgo = Date.now() - 370 * 24 * 60 * 60 * 1000;
    const add = (ts: number, kind: 'videos' | 'secondary') => {
      if (ts < yearAgo || ts === 0) return;
      const key = quarterKey(ts);
      if (!counts.has(key)) counts.set(key, { videos: 0, secondary: 0 });
      counts.get(key)![kind]++;
    };
    videos.forEach((v) => add(rowDate(v), 'videos'));
    secondary.forEach((p) => add(rowDate(p), 'secondary'));
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, c]) => ({ quarter, 영상: c.videos, [secondLabel]: c.secondary }));
  }, [videos, secondary, secondLabel]);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ink-500">존재하지 않는 기술 축입니다.</p>
        <Link href="/trend-brief" className="text-info hover:underline mt-2">홈으로</Link>
      </div>
    );
  }

  const isLoading = videosQuery.isLoading || secondaryQuery.isLoading;

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
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

        {/* AI Trend Summary */}
        <InsightBox label="AI Trend Summary" tone="gold" title={`최근 60일 ${config.titleKo}`}>
          <p className="text-[13px] leading-relaxed">
            {summaryQuery.isLoading
              ? '요약을 생성하는 중...'
              : summaryQuery.data?.summary ?? '요약을 불러오지 못했습니다.'}
          </p>
        </InsightBox>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <KpiTile label="최근 90일 데모 영상" value={stats.videos} unit="건" />
          <KpiTile label={`최근 90일 관련 ${secondLabel}`} value={stats.secondary} unit={config.second === 'papers' ? '편' : '건'} />
          <KpiTile label="활동 채널" value={stats.channels} unit="곳" />
        </div>

        {/* Alerts (양산 등 — alertsType 설정 시) */}
        {config.alertsType && Array.isArray(alertsQuery.data) && alertsQuery.data.length > 0 && (
          <Panel
            kicker="Competitive Alerts"
            title={`양산 경쟁 알림 (${alertsQuery.data.length}건)`}
            subtitle="수집 파이프라인이 감지한 경쟁사 양산 관련 주요 이벤트입니다."
          >
            <div className="space-y-3">
              {alertsQuery.data.slice(0, 8).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 border-b border-ink-100 pb-3 last:border-b-0">
                  <Tag
                    size="sm"
                    tone={a.severity === 'critical' ? 'neg' : a.severity === 'warning' ? 'warn' : 'info'}
                  >
                    {a.severity ?? 'info'}
                  </Tag>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink-900 leading-snug">{a.title}</p>
                    {a.summary && (
                      <p className="mt-1 text-[11.5px] text-ink-600 leading-relaxed line-clamp-2">{a.summary}</p>
                    )}
                    {a.createdAt && (
                      <span className="mt-1 inline-block text-[11px] text-ink-400">{formatDate(a.createdAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Quarterly activity */}
        <Panel
          kicker="Activity Sensing"
          title={`분기별 활동량 — 영상 vs ${secondLabel}`}
          subtitle={`공개 빈도를 분기 단위로 집계합니다. 영상·${secondLabel}가 함께 늘면 해당 축이 가열되는 신호입니다.`}
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
                  <Bar dataKey={secondLabel} fill="#b8860b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Videos */}
        <Panel
          className={config.newsFirst ? 'order-2' : undefined}
          kicker="Demo Videos"
          title={`관련 영상 (${videos.length}건)`}
          subtitle={
            config.alertsType
              ? '로봇 생산라인·제조 공정 관련 영상만 엄격히 필터링합니다. 이 축은 영상이 드문 것이 정상입니다.'
              : '전문 채널 영상 + 완제품사 영상 중 이 축에 해당하는 시연입니다.'
          }
          headerRight={
            <Link href="/videos" className="text-[11.5px] text-info hover:underline">
              갤러리 →
            </Link>
          }
        >
          {/* Inline player */}
          {playing && getVideoId(playing) && (
            <div className="mb-4 border border-ink-200">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${getVideoId(playing)}?autoplay=1`}
                  title={playing.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-semibold text-ink-900 leading-snug">{playing.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-500">
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
                  className="shrink-0 p-1 text-ink-400 hover:text-ink-900 transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {videos.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              {isLoading
                ? '불러오는 중...'
                : '아직 수집된 영상이 없습니다. 전문 채널 수집은 다음 크론(매일 03:00)부터 시작됩니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.slice(0, 24).map((v) => {
                const thumb = getThumbnail(v);
                return (
                  <button
                    key={v.id}
                    onClick={() => setPlaying(v)}
                    className="text-left bg-white border border-ink-200 hover:border-ink-400 transition-colors group"
                  >
                    <div className="relative aspect-video bg-ink-100 overflow-hidden">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-ink-400" />
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white opacity-80 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[12.5px] font-semibold text-ink-900 leading-snug line-clamp-2">{v.title}</p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {v.extractedMetadata?.channel && (
                          <Tag tone="neutral" size="sm">{v.extractedMetadata.channel}</Tag>
                        )}
                        <span className="text-[11px] text-ink-400">{formatDate(v.publishedAt)}</span>
                        {typeof v.extractedMetadata?.views === 'number' && (
                          <span className="text-[11px] text-ink-400 ml-auto">
                            {v.extractedMetadata.views.toLocaleString()}회
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Secondary: 논문 또는 기사 */}
        <Panel
          className={config.newsFirst ? 'order-1' : undefined}
          kicker={config.second === 'papers' ? 'Research Papers' : 'Related News'}
          title={`관련 ${secondLabel} (${secondary.length}${config.second === 'papers' ? '편' : '건'})`}
          subtitle={
            config.second === 'papers'
              ? 'arXiv 공식 API로 수집된 로봇 분야 논문 중 이 기술 축 키워드에 해당하는 것입니다.'
              : '수집된 뉴스·인텔리전스 중 이 주제 키워드에 해당하는 기사입니다.'
          }
        >
          {secondary.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              {isLoading
                ? '불러오는 중...'
                : config.second === 'papers'
                  ? '아직 수집된 논문이 없습니다. arXiv 수집은 매일 03:00에 실행됩니다.'
                  : '아직 해당하는 기사가 없습니다.'}
            </div>
          ) : (
            <div className="space-y-3">
              {secondary.slice(0, 12).map((p) => (
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
                      {formatDate(p.publishedAt ?? p.collectedAt)} ·{' '}
                      {config.second === 'papers' ? 'arXiv' : p.source ?? '수집 기사'}
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
