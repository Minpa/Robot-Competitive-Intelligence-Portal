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
    staleTime: 21_600_000, // 6h
    gcTime: 21_600_000,
  });

  const insights = data?.insights || data?.data || [];
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={insights.length > 0 ? insights : undefined}
      isStale={isStale || (isError && insights.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {(!insights || insights.length === 0) ? (
        <EmptyChartPlaceholder
          title="인사이트 없음"
          message="인사이트 데이터가 없습니다"
          icon="💡"
          dataType="인사이트"
          minDataCount={1}
        />
      ) : (
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
      )}
    </ErrorFallbackWrapper>
  );
}
