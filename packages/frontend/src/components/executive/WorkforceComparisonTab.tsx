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

interface WorkforceComparisonTabProps {
  filters: GlobalFilterParams;
}

export function WorkforceComparisonTab({ filters }: WorkforceComparisonTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-workforce-comparison', filters],
    queryFn: () => api.getExecutiveWorkforceComparison(filters),
    staleTime: 86_400_000, // 24h
    gcTime: 86_400_000,
  });

  const inner = data?.data ?? data;
  const companies = inner?.companies || (Array.isArray(inner) ? inner : []);
  const missingCount = inner?.missingCount ?? 0;
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
      {(!companies || companies.length === 0) ? (
        <EmptyChartPlaceholder
          title="인력 비교 데이터 없음"
          message="인력 데이터가 등록된 기업이 없습니다"
          icon="📊"
          dataType="인력 데이터"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📊</span> Top 인력 비교
            </h3>
            {missingCount > 0 && (
              <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                미등록 기업 {missingCount}개
              </span>
            )}
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companies} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
                <YAxis type="category" dataKey="companyName" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar dataKey="workforceSize" name="인력 규모" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
