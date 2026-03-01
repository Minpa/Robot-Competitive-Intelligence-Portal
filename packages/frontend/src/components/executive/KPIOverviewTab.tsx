'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface KPIOverviewTabProps {
  filters: GlobalFilterParams;
}

interface KPICard {
  label: string;
  value: string | number | null;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: string;
}

export function KPIOverviewTab({ filters }: KPIOverviewTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-overview', filters],
    queryFn: () => api.getExecutiveOverview(filters),
    staleTime: 3_600_000, // 1h — synced with ViewCacheConfig kpi-overview TTL
    gcTime: 3_600_000,
  });

  const inner = data?.data ?? data;
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  // API returns { kpiCards: {...}, insights: InsightCard[] }
  const kpi = inner?.kpiCards ?? inner;
  const insights = inner?.insights ?? [];

  const kpiCards: KPICard[] = [
    {
      label: '총 로봇 수',
      value: kpi?.totalRobots ?? null,
      trend: kpi?.robotsTrend,
      trendValue: kpi?.robotsTrendValue,
      icon: '🤖',
    },
    {
      label: '총 회사 수',
      value: kpi?.totalCompanies ?? null,
      trend: kpi?.companiesTrend,
      trendValue: kpi?.companiesTrendValue,
      icon: '🏢',
    },
    {
      label: '총 기사 수',
      value: kpi?.totalArticles ?? null,
      trend: kpi?.articlesTrend,
      trendValue: kpi?.articlesTrendValue,
      icon: '📰',
    },
    {
      label: '시장 규모',
      value: kpi?.marketSize ?? null,
      trend: kpi?.marketTrend,
      trendValue: kpi?.marketTrendValue,
      icon: '💰',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={data}
      isStale={isStale || (isError && !!data)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <p className="text-xs text-slate-400">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {card.value != null ? card.value.toLocaleString() : '—'}
            </p>
            {card.value == null ? (
              <p className="text-xs text-slate-500 mt-1">데이터 수집 중</p>
            ) : card.trend && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${
                card.trend === 'up' ? 'text-emerald-400' : card.trend === 'down' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : card.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                {card.trendValue}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Insight Summary */}
      {insights && insights.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">📊 인사이트 요약</h3>
          <ul className="space-y-2">
            {insights.map((insight: any, i: number) => (
              <li key={insight.id || i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">•</span>
                <span>{typeof insight === 'string' ? insight : (insight.title || insight.description || '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </ErrorFallbackWrapper>
  );
}
