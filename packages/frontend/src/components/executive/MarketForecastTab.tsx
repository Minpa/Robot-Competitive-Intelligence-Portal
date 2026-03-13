'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { useState } from 'react';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';
import { ChartInfoModal } from '../shared/ChartInfoModal';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface MarketForecastTabProps {
  filters: GlobalFilterParams;
}

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444'];

export function MarketForecastTab({ filters }: MarketForecastTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-market-forecast', filters],
    queryFn: () => api.getExecutiveMarketForecast(filters),
    staleTime: 604_800_000,
    gcTime: 604_800_000,
  });

  const inner = data?.data ?? data;
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  // Support both forecast array and performanceTrends structure
  const trends = inner?.performanceTrends || [];
  const forecast = inner?.forecast || (Array.isArray(inner) ? inner : []);
  const hasData = forecast.length > 0 || trends.length > 0;

  // Transform performanceTrends into chart data if forecast is empty
  const chartData = forecast.length > 0
    ? forecast
    : (() => {
        if (trends.length === 0) return [];
        // Merge all metrics by year
        const yearMap = new Map<number, Record<string, number>>();
        for (const trend of trends) {
          for (const point of trend.data || []) {
            if (!yearMap.has(point.year)) yearMap.set(point.year, { year: point.year });
            const entry = yearMap.get(point.year)!;
            entry[`${trend.metric}_avg`] = point.avg;
            entry[`${trend.metric}_max`] = point.max;
          }
        }
        return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
      })();

  const metricNames: Record<string, string> = {
    payload_kg: '페이로드 (kg)',
    dof: 'DoF (자유도)',
  };

  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <ChartInfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="성능 트렌드 그래프 설명"
      >
        <p className="mb-3">
          이 그래프는 연도별로 수집된 로봇 성능 지표의 평균 변화를 보여줍니다. 주로 다음 지표를 시각화합니다:
        </p>
        <ul className="list-disc pl-5 space-y-1 mb-3">
          <li><strong>페이로드 (kg)</strong>: 해당 연도에 등록된 로봇의 평균 최대 적재 중량</li>
          <li><strong>DoF (자유도)</strong>: 해당 연도에 등록된 로봇의 평균 관절 자유도</li>
        </ul>
        <p className="mb-3">
          데이터는 DB에 등록된 로봇/제품 데이터를 기반으로 집계되며, 특정 연도의 로봇 수가 적으면 평균값이 크게 변동할 수 있습니다.
        </p>
        <p className="text-xs text-slate-400">
          ※ 시장 전체를 대표하는 값이 아닌, 현재 시스템에 수집된 데이터 기준입니다.
        </p>
      </ChartInfoModal>

      <ErrorFallbackWrapper
        isError={isError}
        isLoading={isLoading}
        error={error as Error}
        fallbackType="cache"
        cachedData={hasData ? chartData : undefined}
        isStale={isStale || (isError && hasData)}
        cachedAt={cachedAt}
        onRetry={() => refetch()}
      >
        {!hasData ? (
          <EmptyChartPlaceholder
            title="시장 전망 데이터 없음"
            message="시장 데이터 업데이트 예정"
            icon="📊"
            dataType="시장 데이터"
            minDataCount={1}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📊</span> 성능 트렌드 (연도별)
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
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  {forecast.length > 0 ? (
                    <Line type="monotone" dataKey="marketSize" name="시장 규모 ($B)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  ) : (
                    trends.map((t: any, i: number) => (
                      <Line key={t.metric} type="monotone" dataKey={`${t.metric}_avg`} name={`${metricNames[t.metric] || t.metric} 평균`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ErrorFallbackWrapper>
    </>
  );
}
