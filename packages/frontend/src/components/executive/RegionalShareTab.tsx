'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface RegionalShareTabProps {
  filters: GlobalFilterParams;
}

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#6b7280'];

export function RegionalShareTab({ filters }: RegionalShareTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-regional-share', filters],
    queryFn: () => api.getExecutiveRegionalShare(filters),
    staleTime: 604_800_000, // 7d
    gcTime: 604_800_000,
  });

  const chartData = data?.regions || data?.data || [];
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
          title="지역 데이터 없음"
          message="지역 데이터 미등록"
          icon="🌍"
          dataType="지역 데이터"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🌍</span> 지역별 시장 점유율
          </h3>
          <div className="bg-slate-800/30 rounded-xl p-4" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  dataKey="value"
                  nameKey="region"
                  label={({ region, percent }: any) => `${region} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
