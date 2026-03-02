'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface InvestmentFlowTabProps {
  filters: GlobalFilterParams;
}

export function InvestmentFlowTab({ filters }: InvestmentFlowTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-investment-flow', filters],
    queryFn: () => api.getExecutiveInvestmentFlow(filters),
    staleTime: 86_400_000,
    gcTime: 86_400_000,
  });

  const inner = data?.data ?? data;
  const adoptionTrends = inner?.adoptionTrends || [];
  const flows = inner?.flows || (Array.isArray(inner) ? inner : []);
  const hasData = adoptionTrends.length > 0 || flows.length > 0;
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={hasData ? (adoptionTrends.length > 0 ? adoptionTrends : flows) : undefined}
      isStale={isStale || (isError && hasData)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {!hasData ? (
        <EmptyChartPlaceholder
          title="투자 흐름 데이터 없음"
          message="투자 데이터가 없습니다"
          icon="💸"
          dataType="투자 이벤트"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💸</span> 부품 채택 트렌드
          </h3>
          {adoptionTrends.length > 0 ? (
            <div className="space-y-3">
              {adoptionTrends.map((trend: any, i: number) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-white font-medium mb-2 capitalize">{trend.componentType}</p>
                  <div className="flex gap-2 flex-wrap">
                    {trend.data?.map((d: any, j: number) => (
                      <span key={j} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                        {d.year}: {d.count}건
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {flows.map((f: any, i: number) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{f.companyName || f.name}</span>
                    <span className="text-sm text-emerald-400 font-semibold">{f.amount || f.value}</span>
                  </div>
                  {f.date && <p className="text-xs text-slate-400">{f.date}</p>}
                  {f.description && <p className="text-sm text-slate-300 mt-1">{f.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
