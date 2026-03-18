'use client';

import { useState, useCallback } from 'react';
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
import { X, Bot, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TimelineTrendTabProps {
  filters: GlobalFilterParams;
}

interface DrillDownRobot {
  id: string;
  name: string;
  companyName?: string;
  purpose?: string;
  commercializationStage?: string;
  status?: string;
}

export function TimelineTrendTab({ filters }: TimelineTrendTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-timeline-trend', filters],
    queryFn: () => api.getExecutiveTimelineTrend(filters),
    staleTime: 21_600_000, // 6h — synced with ViewCacheConfig timeline_trend TTL
    gcTime: 21_600_000,
  });

  const inner = data?.data ?? data;
  const chartData = Array.isArray(inner) ? inner : (inner?.data || []);
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  // Drill-down state
  const [drillDownYear, setDrillDownYear] = useState<number | null>(null);
  const [drillDownRobots, setDrillDownRobots] = useState<DrillDownRobot[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  const handleLineClick = useCallback(async (payload: any) => {
    // Extract year from the month string (e.g., "2024-06" -> 2024)
    const month = payload?.payload?.month || payload?.month;
    if (!month) return;
    const year = parseInt(String(month).split('-')[0]);
    if (isNaN(year)) return;

    setDrillDownYear(year);
    setDrillDownLoading(true);
    try {
      const robots = await api.getRobotsByYear(year);
      setDrillDownRobots(robots);
    } catch (err) {
      console.error('Failed to fetch robots by year:', err);
      setDrillDownRobots([]);
    } finally {
      setDrillDownLoading(false);
    }
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDownYear(null);
    setDrillDownRobots([]);
  }, []);

  const stageBadge = (stage?: string) => {
    const styles: Record<string, string> = {
      commercial: 'bg-green-500/20 text-green-400',
      pilot: 'bg-blue-500/20 text-blue-400',
      poc: 'bg-yellow-500/20 text-yellow-400',
      prototype: 'bg-purple-500/20 text-purple-400',
      concept: 'bg-slate-500/20 text-slate-400',
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${styles[stage || ''] || styles.concept}`}>
        {stage || '-'}
      </span>
    );
  };

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
        <div className="space-y-4 relative">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📈</span> 월별 이벤트 / 누적 제품 트렌드
            </h3>
            <p className="text-xs text-slate-400 mt-1">좌축: 이벤트 수 (막대) · 우축: 누적 제품 수 (라인) · 라인 포인트 클릭 시 로봇 목록 표시</p>
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
                  dot={{ fill: '#f97316', r: 4, cursor: 'pointer' }}
                  activeDot={{
                    r: 6,
                    cursor: 'pointer',
                    onClick: (_e: any, payload: any) => handleLineClick(payload),
                  }}
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

          {/* Drill-down overlay */}
          {drillDownYear !== null && (
            <div className="absolute inset-0 z-10 bg-slate-900/95 rounded-xl p-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-orange-400" />
                  {drillDownYear}년 발표 로봇
                  <span className="text-sm text-slate-400 font-normal">({drillDownRobots.length}개)</span>
                </h4>
                <button
                  onClick={closeDrillDown}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {drillDownLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : drillDownRobots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  {drillDownYear}년에 발표된 로봇이 없습니다.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {drillDownRobots.map((robot) => (
                    <Link
                      key={robot.id}
                      href={`/humanoid-robots/${robot.id}`}
                      className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-700/60 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                            {robot.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {robot.companyName || '-'} · {robot.purpose || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stageBadge(robot.commercializationStage)}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ErrorFallbackWrapper>
  );
}
