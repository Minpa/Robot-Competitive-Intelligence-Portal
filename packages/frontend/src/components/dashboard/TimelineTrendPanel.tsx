'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';

interface TimelineEvent {
  month: string;
  year: number;
  eventCount: number;
  newProducts: number;
  investments: number;
  pocs: number;
  productions: number;
}

interface TimelineTrendPanelProps {
  data: TimelineEvent[];
  isLoading?: boolean;
  onBarClick?: (month: string, year: number) => void;
}

type PeriodFilter = '3m' | '6m' | '12m' | '24m' | '36m';
type GroupBy = 'month' | 'quarter' | 'year';

export function TimelineTrendPanel({
  data,
  isLoading = false,
  onBarClick,
}: TimelineTrendPanelProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('36m');
  const [groupBy, setGroupBy] = useState<GroupBy>('year');
  const [eventTypes, setEventTypes] = useState({
    investments: true,
    pocs: true,
    productions: true,
  });

  const chartData = useMemo(() => {
    const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : periodFilter === '12m' ? 12 : periodFilter === '24m' ? 24 : 36;
    const sliced = data.slice(-months);

    if (groupBy === 'month') {
      return sliced.map(item => ({
        ...item,
        label: `${item.month}월`,
      }));
    }

    if (groupBy === 'quarter') {
      const quarterMap = new Map<string, TimelineEvent & { label: string }>();
      for (const item of sliced) {
        const monthNum = parseInt(item.month);
        const q = Math.ceil(monthNum / 3);
        const key = `${item.year}-Q${q}`;
        const existing = quarterMap.get(key);
        if (existing) {
          existing.eventCount += item.eventCount;
          existing.newProducts += item.newProducts;
          existing.investments += item.investments;
          existing.pocs += item.pocs;
          existing.productions += item.productions;
        } else {
          quarterMap.set(key, { ...item, month: `Q${q}`, label: `${item.year} Q${q}` });
        }
      }
      return Array.from(quarterMap.values());
    }

    // year
    const yearMap = new Map<number, TimelineEvent & { label: string }>();
    for (const item of sliced) {
      const existing = yearMap.get(item.year);
      if (existing) {
        existing.eventCount += item.eventCount;
        existing.newProducts += item.newProducts;
        existing.investments += item.investments;
        existing.pocs += item.pocs;
        existing.productions += item.productions;
      } else {
        yearMap.set(item.year, { ...item, label: `${item.year}` });
      }
    }
    return Array.from(yearMap.values());
  }, [data, periodFilter, groupBy]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-2/3 mb-4" />
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800 rounded w-16" />
          ))}
        </div>
        <div className="h-48 bg-slate-800 rounded" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full">
        <EmptyChartPlaceholder
          title="타임라인 데이터 없음"
          message="타임라인 데이터가 없습니다"
          icon="📈"
          dataType="이벤트"
          minDataCount={1}
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">📈</span>
          월별 이벤트/신규 제품 트렌드
        </h3>
        <p className="text-xs text-slate-400 mt-1">이벤트 수(막대) vs 신규 제품(라인)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['3m', '6m', '12m', '24m', '36m'] as PeriodFilter[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                periodFilter === period ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {period === '3m' ? '3개월' : period === '6m' ? '6개월' : period === '12m' ? '1년' : period === '24m' ? '2년' : '3년'}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-800 rounded-lg p-1">
          {([
            { key: 'month' as GroupBy, label: '월별' },
            { key: 'quarter' as GroupBy, label: '분기별' },
            { key: 'year' as GroupBy, label: '연별' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setGroupBy(key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                groupBy === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {[
            { key: 'investments', label: '투자', color: 'bg-green-500' },
            { key: 'pocs', label: 'PoC', color: 'bg-yellow-500' },
            { key: 'productions', label: '양산', color: 'bg-purple-500' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setEventTypes(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                eventTypes[key as keyof typeof eventTypes] ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts ComposedChart */}
      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#F97316' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #475569',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#F8FAFC', fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  eventCount: '총 이벤트',
                  newProducts: '신규 제품',
                  investments: '투자',
                  pocs: 'PoC',
                  productions: '양산',
                };
                const units: Record<string, string> = {
                  eventCount: '건',
                  newProducts: '개',
                  investments: '건',
                  pocs: '건',
                  productions: '건',
                };
                return [`${value}${units[name] || ''}`, labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  eventCount: '이벤트 수',
                  newProducts: '신규 제품',
                };
                return <span style={{ color: '#94A3B8' }}>{labels[value] || value}</span>;
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="eventCount"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              onClick={(data) => onBarClick?.(data.month, data.year)}
              cursor="pointer"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="newProducts"
              stroke="#F97316"
              strokeWidth={2}
              dot={{ r: 5, fill: '#F97316', stroke: '#0F172A', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
