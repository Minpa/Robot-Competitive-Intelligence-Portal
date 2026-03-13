'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { ChartInfoModal } from '../shared/ChartInfoModal';
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

  const inner = data?.data ?? data;
  const rawRegions = inner?.regions || (Array.isArray(inner) ? inner : []);
  // Transform API data to have 'value' key for PieChart
  const chartData = rawRegions.map((r: any) => ({
    ...r,
    value: r.productCount || r.companyCount || 0,
  }));
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <ChartInfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="지역 점유율 차트 설명"
      >
        <p className="mb-3">
          이 차트는 등록된 로봇/기업 데이터를 기반으로 지역별 점유율을 비교합니다. 각 지역은 해당 지역에서 활동하는 로봇 수 혹은 회사 수를 기반으로 계산됩니다.
        </p>
        <p className="mb-3">
          원형 차트의 각 섹션은 관련 비율을 나타내며, 특정 지역의 데이터가 적으면 전체 분포에 영향을 크게 미치지 않을 수 있습니다.
        </p>
        <p className="text-xs text-slate-400">
          ※ 표본 수가 적을 경우 비율 값은 보정되지 않고 그대로 표현됩니다.
        </p>
      </ChartInfoModal>

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
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🌍</span> 지역별 시장 점유율
              </h3>
              <button
                onClick={() => setShowInfo(true)}
                className="rounded-md bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                상세 설명
              </button>
            </div>
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
    </>
  );
}
