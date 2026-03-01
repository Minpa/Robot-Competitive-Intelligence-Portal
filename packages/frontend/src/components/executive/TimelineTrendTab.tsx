'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface TimelineTrendTabProps {
  filters: GlobalFilterParams;
}

export function TimelineTrendTab({ filters }: TimelineTrendTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-timeline-trend', filters],
    queryFn: () => api.getExecutiveTimelineTrend(filters),
    staleTime: 21_600_000, // 6h — synced with ViewCacheConfig timeline_trend TTL
    gcTime: 21_600_000,
  });

  const chartData = data?.data || data || [];
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
          title="타임라인 데이터 없음"
          message="해당 기간 이벤트 없음"
          icon="📈"
          dataType="이벤트"
          minDataCount={1}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📈</span> 월별 이벤트 / 누적 제품 트렌드
            </h3>
            <p className="text-xs text-slate-400 mt-1">좌축: 이벤트 수 (막대) · 우축: 누적 제품 수 (라인)</p>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#475569' }}
                  label={{ value: '이벤트 수', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#f97316', fontSize: 12 }}
                  axisLine={{ stroke: '#f97316' }}
                  label={{ value: '누적 제품', angle: 90, position: 'insideRight', fill: '#f97316', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="eventCount"
                  name="이벤트 수"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeProducts"
                  name="누적 제품"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Brush
                  dataKey="month"
                  height={30}
                  stroke="#6366f1"
                  fill="#1e293b"
                  travellerWidth={10}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
