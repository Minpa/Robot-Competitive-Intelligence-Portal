'use client';

import { useState } from 'react';

interface GlobalFilterBarProps {
  dateRange: { start: string; end: string };
  region: string;
  segment: string;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onRegionChange: (region: string) => void;
  onSegmentChange: (segment: string) => void;
}

const regions = [
  { value: 'all', label: '글로벌' },
  { value: 'north_america', label: '미국' },
  { value: 'europe', label: '유럽' },
  { value: 'china', label: '중국' },
  { value: 'japan', label: '일본' },
  { value: 'korea', label: '한국' },
];

const segments = [
  { value: 'all', label: '전체' },
  { value: 'industrial', label: '산업용' },
  { value: 'home', label: '가정용' },
  { value: 'service', label: '서비스용' },
];

export function GlobalFilterBar({
  dateRange,
  region,
  segment,
  onDateRangeChange,
  onRegionChange,
  onSegmentChange,
}: GlobalFilterBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{dateRange.start} ~ {dateRange.end}</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDatePicker && (
            <div className="absolute z-50 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">시작일</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">종료일</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                  />
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                >
                  적용
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Region Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">지역:</span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-sm text-white transition-colors cursor-pointer"
          >
            {regions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Segment Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">세그먼트:</span>
          <div className="flex bg-slate-700/30 rounded-lg p-1">
            {segments.map((s) => (
              <button
                key={s.value}
                onClick={() => onSegmentChange(s.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  segment === s.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="검색..."
            className="w-48 px-4 py-2 pl-10 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
