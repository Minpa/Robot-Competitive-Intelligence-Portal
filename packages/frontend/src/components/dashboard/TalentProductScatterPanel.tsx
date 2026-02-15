'use client';

import { useState, useMemo } from 'react';

interface CompanyDataPoint {
  id: string;
  name: string;
  talentSize: number;
  productCount: number;
  eventCount: number;
  segment: 'industrial' | 'home' | 'service' | 'mixed';
  country?: string;
  recentEvent?: string;
}

interface TalentProductScatterPanelProps {
  data: CompanyDataPoint[];
  isLoading?: boolean;
  onPointClick?: (company: CompanyDataPoint) => void;
}

const segmentColors: Record<string, string> = {
  industrial: '#3b82f6', // blue
  home: '#22c55e', // green
  service: '#a855f7', // purple
  mixed: '#f59e0b', // amber
};

const segmentLabels: Record<string, string> = {
  industrial: '산업용',
  home: '가정용',
  service: '서비스용',
  mixed: '복합',
};

export function TalentProductScatterPanel({
  data,
  isLoading = false,
  onPointClick,
}: TalentProductScatterPanelProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [useLogScale, setUseLogScale] = useState(false);

  const { maxTalent, maxProduct, avgTalent, avgProduct, maxEvents } = useMemo(() => {
    if (data.length === 0) return { maxTalent: 100, maxProduct: 10, avgTalent: 50, avgProduct: 5, maxEvents: 10 };
    
    const talents = data.map(d => d.talentSize);
    const products = data.map(d => d.productCount);
    const events = data.map(d => d.eventCount);
    
    return {
      maxTalent: Math.max(...talents),
      maxProduct: Math.max(...products),
      avgTalent: talents.reduce((a, b) => a + b, 0) / talents.length,
      avgProduct: products.reduce((a, b) => a + b, 0) / products.length,
      maxEvents: Math.max(...events, 1),
    };
  }, [data]);

  const getPosition = (value: number, max: number, isLog: boolean) => {
    if (isLog && value > 0) {
      return (Math.log10(value + 1) / Math.log10(max + 1)) * 100;
    }
    return (value / max) * 100;
  };

  const getBubbleSize = (eventCount: number) => {
    const minSize = 12;
    const maxSize = 40;
    const ratio = eventCount / maxEvents;
    return minSize + ratio * (maxSize - minSize);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-2/3 mb-4" />
        <div className="h-64 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">👥</span>
            인력 규모 vs 제품 포트폴리오
          </h3>
          <p className="text-xs text-slate-400 mt-1">점 크기 = 최근 1년 이벤트 수</p>
        </div>
        <button
          onClick={() => setUseLogScale(!useLogScale)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            useLogScale ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Log 스케일
        </button>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex">
        {/* Y-axis */}
        <div className="w-12 flex flex-col justify-between text-xs text-slate-500 pr-2 py-4">
          <span>{maxProduct}</span>
          <span className="text-slate-600">제품 수</span>
          <span>0</span>
        </div>

        {/* Plot area */}
        <div className="flex-1 relative bg-slate-800/30 rounded-lg">
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal average line */}
            <div
              className="absolute w-full border-t border-dashed border-slate-600/50"
              style={{ bottom: `${getPosition(avgProduct, maxProduct, useLogScale)}%` }}
            />
            {/* Vertical average line */}
            <div
              className="absolute h-full border-l border-dashed border-slate-600/50"
              style={{ left: `${getPosition(avgTalent, maxTalent, useLogScale)}%` }}
            />
          </div>

          {/* Data points */}
          {data.map((point) => {
            const x = getPosition(point.talentSize, maxTalent, useLogScale);
            const y = getPosition(point.productCount, maxProduct, useLogScale);
            const size = getBubbleSize(point.eventCount);
            const isHovered = hoveredPoint === point.id;

            return (
              <div
                key={point.id}
                className="absolute transform -translate-x-1/2 translate-y-1/2 cursor-pointer transition-all"
                style={{
                  left: `${x}%`,
                  bottom: `${y}%`,
                  zIndex: isHovered ? 50 : 10,
                }}
                onMouseEnter={() => setHoveredPoint(point.id)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onPointClick?.(point)}
              >
                {/* Bubble */}
                <div
                  className={`rounded-full transition-all ${isHovered ? 'ring-2 ring-white' : ''}`}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: segmentColors[point.segment],
                    opacity: isHovered ? 1 : 0.7,
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
                    <div className="text-sm font-medium text-white mb-2">{point.name}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">인력 규모</span>
                        <span className="text-white">{point.talentSize.toLocaleString()}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">제품 수</span>
                        <span className="text-white">{point.productCount}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">최근 이벤트</span>
                        <span className="text-white">{point.eventCount}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">주력 세그먼트</span>
                        <span style={{ color: segmentColors[point.segment] }}>
                          {segmentLabels[point.segment]}
                        </span>
                      </div>
                      {point.recentEvent && (
                        <div className="pt-2 border-t border-slate-700 mt-2">
                          <span className="text-slate-400">최근: </span>
                          <span className="text-slate-300">{point.recentEvent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quadrant labels */}
          <div className="absolute top-2 right-2 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
            고인력/고제품
          </div>
          <div className="absolute bottom-2 left-2 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
            저인력/저제품
          </div>
        </div>
      </div>

      {/* X-axis label */}
      <div className="text-center text-xs text-slate-500 mt-2">
        인력 수 (휴머노이드 관련)
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        {Object.entries(segmentLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segmentColors[key] }}
            />
            <span className="text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
