'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { api } from '@/lib/api';
import { X, Bot, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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

interface DrillDownRobot {
  id: string;
  name: string;
  companyName?: string;
  purpose?: string;
  commercializationStage?: string;
  status?: string;
}

type CategoryKey = 'pocs' | 'productions' | 'newProducts';

const categoryLabels: Record<CategoryKey, string> = {
  pocs: 'PoC',
  productions: '양산',
  newProducts: '신규 제품',
};

const categoryColors: Record<CategoryKey, string> = {
  pocs: 'bg-yellow-500',
  productions: 'bg-purple-500',
  newProducts: 'bg-orange-500',
};

export function TimelineTrendPanel({
  data,
  isLoading = false,
  onBarClick,
}: TimelineTrendPanelProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('36m');
  const [groupBy, setGroupBy] = useState<GroupBy>('year');
  const [eventTypes, setEventTypes] = useState({
    pocs: true,
    productions: true,
  });

  // Category selection popup state
  const [categoryPopup, setCategoryPopup] = useState<{
    year: number;
    pocs: number;
    productions: number;
    newProducts: number;
  } | null>(null);

  // Drill-down state
  const [drillDownYear, setDrillDownYear] = useState<number | null>(null);
  const [drillDownCategory, setDrillDownCategory] = useState<CategoryKey | null>(null);
  const [drillDownRobots, setDrillDownRobots] = useState<DrillDownRobot[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  const handleChartClick = useCallback((state: any) => {
    if (!state?.activePayload?.length) return;
    const payload = state.activePayload[0].payload;
    const year = payload.year;
    if (!year) return;

    setCategoryPopup({
      year,
      pocs: payload.pocs || 0,
      productions: payload.productions || 0,
      newProducts: payload.newProducts || 0,
    });
  }, []);

  const handleCategorySelect = useCallback(async (year: number, category: CategoryKey) => {
    setCategoryPopup(null);
    setDrillDownYear(year);
    setDrillDownCategory(category);
    setDrillDownLoading(true);
    try {
      const robots = await api.getRobotsByYearAndCategory(year, category);
      setDrillDownRobots(robots);
    } catch (err) {
      console.error('Failed to fetch robots:', err);
      setDrillDownRobots([]);
    } finally {
      setDrillDownLoading(false);
    }
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDownYear(null);
    setDrillDownCategory(null);
    setDrillDownRobots([]);
  }, []);

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
          icon=""
          dataType="이벤트"
          minDataCount={1}
        />
      </div>
    );
  }

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
    <div className="bg-slate-900 rounded-xl p-6 h-full flex flex-col relative">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          월별 이벤트/신규 제품 트렌드
        </h3>
        <p className="text-xs text-slate-400 mt-1">이벤트 수(막대) vs 신규 제품(라인) · 차트 클릭 시 카테고리별 로봇 목록 표시</p>
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
          {([
            { key: 'pocs' as const, label: 'PoC', color: 'bg-yellow-500' },
            { key: 'productions' as const, label: '양산', color: 'bg-purple-500' },
          ]).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setEventTypes(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                eventTypes[key] ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
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
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: -10 }}
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={{ stroke: 'rgb(var(--color-slate-600))' }}
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
                border: '1px solid rgb(var(--color-slate-600))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#F8FAFC', fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  pocs: 'PoC',
                  productions: '양산',
                  newProducts: '신규 제품',
                };
                const units: Record<string, string> = {
                  pocs: '건',
                  productions: '건',
                  newProducts: '개',
                };
                return [`${value}${units[name] || ''}`, labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  pocs: 'PoC',
                  productions: '양산',
                  newProducts: '신규 제품',
                };
                return <span style={{ color: '#94A3B8' }}>{labels[value] || value}</span>;
              }}
            />
            {eventTypes.pocs && (
              <Bar yAxisId="left" dataKey="pocs" stackId="events" fill="#EAB308" maxBarSize={40} />
            )}
            {eventTypes.productions && (
              <Bar yAxisId="left" dataKey="productions" stackId="events" fill="#A855F7" radius={[4, 4, 0, 0]} maxBarSize={40} />
            )}
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

      {/* Category selection popup */}
      {categoryPopup && !drillDownYear && (
        <div className="absolute inset-0 z-10 bg-slate-900/80 rounded-xl flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 shadow-2xl min-w-[240px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">
                {categoryPopup.year}년 · 카테고리 선택
              </h4>
              <button
                onClick={() => setCategoryPopup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {(['pocs', 'productions', 'newProducts'] as CategoryKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(categoryPopup.year, key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/70 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${categoryColors[key]}`} />
                    <span className="text-sm text-white">{categoryLabels[key]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {categoryPopup[key]}{key === 'newProducts' ? '개' : '건'}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drill-down robot list */}
      {drillDownYear !== null && (
        <div className="absolute inset-0 z-10 bg-slate-900/95 rounded-xl p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-400" />
              {drillDownYear}년 {drillDownCategory ? categoryLabels[drillDownCategory] : ''} 로봇
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
              {drillDownYear}년 {drillDownCategory ? categoryLabels[drillDownCategory] : ''} 로봇이 없습니다.
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
  );
}
