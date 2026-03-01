'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface TechnologyRadarTabProps {
  filters: GlobalFilterParams;
}

export function TechnologyRadarTab({ filters }: TechnologyRadarTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-tech-radar', filters],
    queryFn: () => api.getTechAxisData(filters),
    staleTime: 86_400_000,
    gcTime: 86_400_000,
  });

  const bubbles = data?.bubbles || [];
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={bubbles.length > 0 ? bubbles : undefined}
      isStale={isStale || (isError && bubbles.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {bubbles.length === 0 ? (
        <EmptyChartPlaceholder
          title="기술 레이더 데이터 없음"
          message="기술 데이터가 없습니다"
          icon="⚡"
          dataType="기술 키워드"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>⚡</span> 핵심 기술 축
          </h3>
          <div className="flex flex-wrap gap-2">
            {bubbles.map((b: any, i: number) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-lg px-3 py-2"
                style={{ fontSize: `${Math.max(12, Math.min(20, 12 + (b.articleCount || 0)))}px` }}
              >
                <span className="text-cyan-300">{b.keyword}</span>
                <span className="text-xs text-slate-400 ml-1">({b.articleCount})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
