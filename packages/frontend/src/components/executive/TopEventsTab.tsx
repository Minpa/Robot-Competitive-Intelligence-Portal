'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface TopEventsTabProps {
  filters: GlobalFilterParams;
}

export function TopEventsTab({ filters }: TopEventsTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-top-events', filters],
    queryFn: () => api.getTopEventsData('month', filters),
    staleTime: 3_600_000, // 1h
    gcTime: 3_600_000,
  });

  const events = data?.events || [];
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={events.length > 0 ? events : undefined}
      isStale={isStale || (isError && events.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {events.length === 0 ? (
        <EmptyChartPlaceholder
          title="이벤트 없음"
          message="이번 주 등록된 뉴스가 없습니다"
          icon="📅"
          dataType="이벤트"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📅</span> Top 10 이벤트
          </h3>
          <div className="space-y-3">
            {events.map((e: any, i: number) => (
              <div key={e.id || i} className="bg-slate-800/50 rounded-lg p-4 flex items-start gap-4">
                <span className="text-2xl font-bold text-violet-400 w-8">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{e.title}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {e.date ? new Date(e.date).toLocaleDateString('ko-KR') : ''}
                  </p>
                  {e.summary && <p className="text-sm text-slate-300 mt-2">{e.summary}</p>}
                </div>
                {e.importanceScore != null && (
                  <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                    {Math.round(e.importanceScore * 100)}점
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
