'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface InsightHubTabProps {
  filters: GlobalFilterParams;
}

export function InsightHubTab({ filters }: InsightHubTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-insight-hub', filters],
    queryFn: () => api.getExecutiveInsightHub(filters),
    staleTime: 21_600_000,
    gcTime: 21_600_000,
  });

  const inner = data?.data ?? data;
  const insights = inner?.insights || [];
  const positions = inner?.positions || [];
  const risingTop10 = inner?.risingTop10 || [];
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  // Use insights if available, otherwise show keyword positions
  const hasInsights = insights.length > 0;
  const hasPositions = positions.length > 0;
  const hasData = hasInsights || hasPositions;

  // Top keywords with frequency > 0
  const topKeywords = positions
    .filter((p: any) => p.frequency > 0)
    .sort((a: any, b: any) => b.frequency - a.frequency)
    .slice(0, 20);

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={hasData ? data : undefined}
      isStale={isStale || (isError && hasData)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {!hasData ? (
        <EmptyChartPlaceholder
          title="인사이트 없음"
          message="인사이트 데이터가 없습니다"
          icon="💡"
          dataType="인사이트"
          minDataCount={1}
        />
      ) : hasInsights ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💡</span> 인사이트 허브
          </h3>
          <div className="space-y-3">
            {insights.map((insight: any, i: number) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-white font-medium mb-1">{insight.title || insight.headline}</p>
                <p className="text-sm text-slate-300">{insight.summary || insight.description}</p>
                {insight.date && <p className="text-xs text-slate-500 mt-2">{insight.date}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💡</span> 키워드 인사이트
          </h3>
          <p className="text-sm text-slate-400">기사에서 추출된 주요 키워드 빈도 분석</p>

          {/* Top Keywords */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topKeywords.map((kw: any, i: number) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-white font-medium text-sm truncate">{kw.keyword}</p>
                <p className="text-2xl font-bold text-violet-400 mt-1">{kw.frequency}</p>
                <p className="text-xs text-slate-500">{kw.category}</p>
              </div>
            ))}
          </div>

          {/* Rising keywords */}
          {risingTop10.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-emerald-400 mb-2">📈 상승 키워드</h4>
              <div className="flex flex-wrap gap-2">
                {risingTop10.map((kw: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                    {kw.keyword} (+{kw.growthRate}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
