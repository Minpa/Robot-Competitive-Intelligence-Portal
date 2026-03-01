'use client';

import { useState, useMemo } from 'react';
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

type PeriodFilter = '3m' | '6m' | '12m';
type SegmentFilter = 'all' | 'industrial' | 'home' | 'service';

export function TimelineTrendPanel({
  data,
  isLoading = false,
  onBarClick,
}: TimelineTrendPanelProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('6m');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [eventTypes, setEventTypes] = useState({
    investments: true,
    pocs: true,
    productions: true,
  });
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const filteredData = useMemo(() => {
    const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : 12;
    return data.slice(-months);
  }, [data, periodFilter]);

  const maxValue = useMemo(() => {
    return Math.max(...filteredData.map(d => d.eventCount), 1);
  }, [filteredData]);

  const maxProducts = useMemo(() => {
    return Math.max(...filteredData.map(d => d.newProducts), 1);
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-2/3 mb-4" />
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800 rounded w-16" />
          ))}
        </div>
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 bg-slate-800 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
          ))}
        </div>
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">📈</span>
            월별 이벤트/신규 제품 트렌드
          </h3>
          <p className="text-xs text-slate-400 mt-1">이벤트 수(막대) vs 신규 제품(라인)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Period filter */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['3m', '6m', '12m'] as PeriodFilter[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                periodFilter === period
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {period === '3m' ? '3개월' : period === '6m' ? '6개월' : '12개월'}
            </button>
          ))}
        </div>

        {/* Event type toggles */}
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
                eventTypes[key as keyof typeof eventTypes]
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 flex flex-col">
        {/* Y-axis labels and chart area */}
        <div className="flex-1 flex">
          {/* Y-axis (events) */}
          <div className="w-8 flex flex-col justify-between text-xs text-slate-500 pr-2">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue / 2)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="flex-1 flex items-end gap-1 relative">
            {filteredData.map((item, idx) => {
              const barHeight = (item.eventCount / maxValue) * 100;
              const lineY = 100 - (item.newProducts / maxProducts) * 100;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center relative"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t cursor-pointer transition-all ${
                      hoveredBar === idx ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: item.eventCount > 0 ? '4px' : '0' }}
                    onClick={() => onBarClick?.(item.month, item.year)}
                  />

                  {/* Line point */}
                  <div
                    className="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-slate-900 z-10"
                    style={{ bottom: `${100 - lineY}%`, transform: 'translateY(50%)' }}
                  />

                  {/* Tooltip */}
                  {hoveredBar === idx && (
                    <div className="absolute z-50 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[160px] left-1/2 -translate-x-1/2">
                      <div className="text-sm font-medium text-white mb-2">
                        {item.year}년 {item.month}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">총 이벤트</span>
                          <span className="text-white">{item.eventCount}건</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">신규 제품</span>
                          <span className="text-orange-400">{item.newProducts}개</span>
                        </div>
                        {eventTypes.investments && (
                          <div className="flex justify-between">
                            <span className="text-green-400">투자</span>
                            <span className="text-white">{item.investments}건</span>
                          </div>
                        )}
                        {eventTypes.pocs && (
                          <div className="flex justify-between">
                            <span className="text-yellow-400">PoC</span>
                            <span className="text-white">{item.pocs}건</span>
                          </div>
                        )}
                        {eventTypes.productions && (
                          <div className="flex justify-between">
                            <span className="text-purple-400">양산</span>
                            <span className="text-white">{item.productions}건</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Connect line points */}
            <svg className="absolute inset-0 pointer-events-none overflow-visible">
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                points={filteredData.map((item, idx) => {
                  const x = (idx + 0.5) * (100 / filteredData.length);
                  const y = 100 - (item.newProducts / maxProducts) * 100;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
            </svg>
          </div>

          {/* Y-axis (products) */}
          <div className="w-8 flex flex-col justify-between text-xs text-orange-400 pl-2">
            <span>{maxProducts}</span>
            <span>{Math.round(maxProducts / 2)}</span>
            <span>0</span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex mt-2 ml-8 mr-8">
          {filteredData.map((item, idx) => (
            <div key={idx} className="flex-1 text-center text-xs text-slate-500">
              {item.month}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded" />
          <span className="text-slate-400">이벤트 수</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full" />
          <span className="text-slate-400">신규 제품</span>
        </div>
      </div>
    </div>
  );
}
