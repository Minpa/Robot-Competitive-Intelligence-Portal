'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Panel, Tag, KpiTile } from '@/components/ui';
import {
  Building2, ExternalLink, ArrowLeft, Bot, Brain, Cpu, Cog,
  Users, TrendingUp, Briefcase, MapPin, Globe,
} from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  robot: { label: 'Robot OEM', icon: Bot },
  rfm: { label: 'Foundation Model', icon: Brain },
  soc: { label: 'SoC / Compute', icon: Cpu },
  actuator: { label: 'Component', icon: Cog },
};

const STAGE_LABEL: Record<string, string> = {
  concept: '컨셉',
  prototype: '프로토타입',
  pilot: '파일럿',
  production: '양산',
  commercial: '상용',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.getCompany(companyId),
    enabled: !!companyId,
  });

  const { data: products } = useQuery({
    queryKey: ['company-products', companyId],
    queryFn: () => api.getProducts({ companyId, pageSize: '20' }),
    enabled: !!companyId,
  });

  const { data: workforce } = useQuery({
    queryKey: ['company-workforce', companyId],
    queryFn: () => api.getWorkforceData(companyId),
    enabled: !!companyId,
  });

  const { data: talentTrend } = useQuery({
    queryKey: ['company-talent-trend', companyId],
    queryFn: () => api.getTalentTrend(companyId),
    enabled: !!companyId,
  });

  const { data: allRobots } = useQuery({
    queryKey: ['company-hub-robots'],
    queryFn: () => api.getHumanoidRobots({ limit: 200 }),
  });

  const { data: articles } = useQuery({
    queryKey: ['company-articles', companyId],
    queryFn: () =>
      api.getArticles({
        companyId,
        page: '1',
        pageSize: '20',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      }),
    enabled: !!companyId,
  });

  const companyRobots = useMemo(() => {
    const items: any[] = allRobots?.items ?? [];
    return items.filter((r) => r.company?.id === companyId);
  }, [allRobots, companyId]);

  const newsItems: any[] = articles?.items ?? [];

  const latestNewsDate = newsItems[0]?.publishedAt
    ? formatDate(newsItems[0].publishedAt)
    : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ink-200 border-t-gold" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ink-500">회사를 찾을 수 없습니다.</p>
        <Link href="/companies" className="text-info hover:underline mt-2 inline-block">
          기업 리스트로 돌아가기
        </Link>
      </div>
    );
  }

  const catMeta = CATEGORY_META[company.category] ?? { label: company.category, icon: Building2 };
  const Icon = catMeta.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/companies"
        className="inline-flex items-center gap-2 text-[12.5px] text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        기업 리스트
      </Link>

      {/* Company Header */}
      <Panel padding="default">
        <div className="flex items-start gap-5">
          <div className="p-4 bg-brand text-gold shrink-0">
            <Icon className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-[26px] font-semibold text-ink-900 tracking-tight">
                {company.name}
              </h1>
              <Tag tone="gold" size="sm">{catMeta.label}</Tag>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[12.5px] text-ink-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {company.country}
                {company.city ? ` · ${company.city}` : ''}
              </span>
              {company.foundingYear && <span>설립 {company.foundingYear}</span>}
              {company.mainBusiness && <span className="truncate">{company.mainBusiness}</span>}
            </div>
            {company.description && (
              <p className="mt-3 text-[13px] text-ink-700 leading-relaxed">{company.description}</p>
            )}
            {company.homepageUrl && (
              <a
                href={company.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-info hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {company.homepageUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </Panel>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="보유 로봇" value={companyRobots.length} unit="종" />
        <KpiTile label="수집된 동향" value={articles?.total ?? 0} unit="건" />
        <KpiTile label="최신 동향" value={latestNewsDate} />
        <KpiTile
          label="휴머노이드 팀"
          value={workforce?.humanoidTeamSize?.toLocaleString() || '—'}
          unit={workforce?.humanoidTeamSize ? '명' : undefined}
        />
      </div>

      {/* Robot Lineup */}
      {companyRobots.length > 0 && (
        <Panel kicker="Robot Lineup" title={`로봇 라인업 (${companyRobots.length}종)`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companyRobots.map((robot: any) => (
              <Link
                key={robot.id}
                href={`/humanoid-robots/${robot.id}`}
                className="border border-ink-200 p-4 hover:border-ink-400 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-ink-900 truncate">{robot.name}</h3>
                  {robot.stage && (
                    <Tag
                      tone={['production', 'commercial'].includes(robot.stage) ? 'pos' : 'neutral'}
                      size="sm"
                    >
                      {STAGE_LABEL[robot.stage] ?? robot.stage}
                    </Tag>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11.5px] text-ink-500">
                  {robot.announcedYear && <span>{robot.announcedYear}년</span>}
                  {robot.purpose && <span>{robot.purpose}</span>}
                  {robot.locomotionType && <span>{robot.locomotionType}</span>}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {/* Recent News Timeline */}
      <Panel kicker="Recent Intelligence" title="최근 동향" subtitle="이 기업 관련 최신 수집 데이터입니다.">
        {newsItems.length === 0 ? (
          <div className="py-8 text-center text-ink-400 text-sm">수집된 동향이 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {newsItems.map((item: any) => (
              <article key={item.id} className="flex gap-4 border-b border-ink-100 pb-4 last:border-b-0 last:pb-0">
                <div className="shrink-0 w-24 font-mono text-[10.5px] text-ink-400 pt-0.5">
                  {formatDate(item.publishedAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13.5px] font-semibold text-ink-900 leading-snug">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-1 text-[12px] text-ink-600 leading-relaxed line-clamp-2">{item.summary}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-400">
                    {item.source && <span className="truncate max-w-[50%]">{item.source}</span>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-info hover:underline shrink-0"
                      >
                        원문 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {/* Workforce Info */}
      {workforce && (
        <Panel kicker="Workforce" title="인력 현황">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-ink-200 p-4">
              <p className="text-[11px] text-ink-500 uppercase font-mono tracking-wider">총 인원</p>
              <p className="text-xl font-semibold text-ink-900 mt-1">
                {workforce.totalHeadcountMin && workforce.totalHeadcountMax
                  ? `${workforce.totalHeadcountMin.toLocaleString()} – ${workforce.totalHeadcountMax.toLocaleString()}`
                  : '—'}
              </p>
            </div>
            <div className="border border-ink-200 p-4">
              <p className="text-[11px] text-ink-500 uppercase font-mono tracking-wider">휴머노이드 팀</p>
              <p className="text-xl font-semibold text-ink-900 mt-1">
                {workforce.humanoidTeamSize?.toLocaleString() || '—'}
              </p>
            </div>
          </div>

          {workforce.jobDistribution && (
            <div className="mt-6">
              <h3 className="text-[12px] font-medium text-ink-700 mb-3">직무 분포</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(workforce.jobDistribution as Record<string, number>).map(([key, value]) => (
                  <div key={key} className="border border-ink-200 p-3 text-center">
                    <p className="text-[10px] text-ink-400 uppercase font-mono">{key}</p>
                    <p className="text-[15px] font-semibold text-ink-900 mt-1">{value || 0}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Talent Trend */}
      {talentTrend && talentTrend.length > 0 && (
        <Panel kicker="Talent Trend" title="인력 추이">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="text-left py-3 px-3 text-ink-500 font-medium">연도</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">총 인원</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">휴머노이드 팀</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">채용 공고</th>
                </tr>
              </thead>
              <tbody>
                {talentTrend.map((trend: any) => (
                  <tr key={trend.year} className="border-b border-ink-100 hover:bg-paper transition-colors">
                    <td className="py-3 px-3 font-medium text-ink-900">{trend.year}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.totalHeadcount?.toLocaleString() || '—'}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.humanoidTeamSize?.toLocaleString() || '—'}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.jobPostingCount?.toLocaleString() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Products */}
      {products && products.items.length > 0 && (
        <Panel kicker="Products" title={`제품 목록 (${products.total}개)`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.items.map((product: any) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="border border-ink-200 p-4 hover:border-ink-400 transition-colors"
              >
                <h3 className="text-[13.5px] font-semibold text-ink-900">{product.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-[11.5px] text-ink-500">
                  <span>{product.type}</span>
                  {product.releaseDate && <span>{product.releaseDate}</span>}
                </div>
                <Tag
                  className="mt-2"
                  size="sm"
                  tone={
                    product.status === 'active' ? 'pos'
                      : product.status === 'development' ? 'warn'
                      : 'neutral'
                  }
                >
                  {product.status}
                </Tag>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
