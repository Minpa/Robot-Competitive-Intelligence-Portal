'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface PlayerExpansionTabProps {
  filters: GlobalFilterParams;
}

export function PlayerExpansionTab({ filters }: PlayerExpansionTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-player-expansion', filters],
    queryFn: () => api.getPlayerExpansion(undefined, filters),
    staleTime: 86_400_000,
    gcTime: 86_400_000,
  });

  const inner = data?.data ?? data;
  const rawCompanies = inner?.companies || (Array.isArray(inner) ? inner : []);
  // Sort: companies with timeline events first
  const companies = [...rawCompanies].sort((a: any, b: any) => 
    (b.timeline?.length || 0) - (a.timeline?.length || 0)
  );
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={companies.length > 0 ? companies : undefined}
      isStale={isStale || (isError && companies.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {companies.length === 0 ? (
        <EmptyChartPlaceholder
          title="플레이어 데이터 없음"
          message="플레이어 확장 데이터가 없습니다"
          icon="👥"
          dataType="회사"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>👥</span> 주요 플레이어 확장 추이
          </h3>
          <div className="space-y-3">
            {companies.slice(0, 10).map((c: any) => (
              <div key={c.companyId} className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-white font-medium mb-2">{c.companyName}</p>
                <div className="flex gap-2 flex-wrap">
                  {c.timeline?.map((t: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">{t.event}</span>
                  ))}
                  {(!c.timeline || c.timeline.length === 0) && <span className="text-xs text-slate-500">이벤트 없음</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
