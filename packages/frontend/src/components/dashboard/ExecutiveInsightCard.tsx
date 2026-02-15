'use client';

import { useState } from 'react';

interface ExecutiveInsightCardProps {
  title: string;
  summary: string;
  details?: string;
  periodStart: string;
  periodEnd: string;
  isLoading?: boolean;
}

export function ExecutiveInsightCard({
  title,
  summary,
  details,
  periodStart,
  periodEnd,
  isLoading = false,
}: ExecutiveInsightCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 h-full animate-pulse">
        <div className="h-5 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-5/6" />
          <div className="h-4 bg-slate-700 rounded w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 h-full text-white shadow-lg hover:shadow-xl transition-shadow"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
          <span className="text-xl">💡</span>
          {title}
        </h3>
        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
          AI 생성
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-200 leading-relaxed line-clamp-3 mb-4">
        {summary}
      </p>

      {/* Period */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>분석 기간: {periodStart} ~ {periodEnd}</span>
      </div>

      {/* Tooltip with full details */}
      {showTooltip && details && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
          <p className="text-sm text-slate-200 leading-relaxed">{details}</p>
        </div>
      )}
    </div>
  );
}
