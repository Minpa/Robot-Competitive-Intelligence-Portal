'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface MarketForecastTabProps {
  filters: GlobalFilterParams;
}

export function MarketForecastTab({ filters }: MarketForecastTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-market-forecast', filters],
    queryFn: () => api.getExecutiveMarketForecast(filters),
    staleTime: 604_800_000, // 7d — synced with ViewCacheConfig market-forecast TTL
    gcTime: 604_800_000,
  });

  const inner = data?.data ?? data;
  const chartData = inner?.forecast || (Array.isArray(inner) ? inner : []);
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={chartData.length > 0 ? chartData : undefined}
      isStale={isStale || (isError && chartData.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {(!chartData || chartData.length === 0) ? (
        <EmptyChartPlaceholder
          title="시장 전망 데이터 없음"
          message="시장 데이터 업데이트 예정"
          icon="📊"
          dataType="시장 데이터"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📊</span> 글로벌 시장 전망 (2024~2030)
          </h3>
          <div className="bg-slate-800/30 rounded-xl p-4" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar dataKey="marketSize" name="시장 규모 ($B)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
