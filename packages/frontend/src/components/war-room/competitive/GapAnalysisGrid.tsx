'use client';

import type { GapFactorItem } from '@/types/war-room';

interface GapAnalysisGridProps {
  factors: GapFactorItem[];
  isLoading: boolean;
}

const colorMap = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', sign: '+' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', sign: '' },
  gray: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', sign: '' },
} as const;

const factorTypeLabel: Record<string, string> = { poc: 'PoC', rfm: 'RFM' };

export function GapAnalysisGrid({ factors, isLoading }: GapAnalysisGridProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-56 animate-pulse rounded bg-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!factors || factors.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-white">12팩터 GAP 분석</h3>
        <p className="mt-4 text-sm text-slate-500">GAP 분석 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-white">12팩터 GAP 분석</h3>
      <p className="mt-1 text-xs text-slate-400">LG vs 최상위 경쟁사 (6 PoC + 6 RFM)</p>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {factors.map((f) => {
          const c = colorMap[f.color] ?? colorMap.gray;
          return (
            <div
              key={`${f.factorType}-${f.factorName}`}
              className={`rounded-lg border ${c.border} ${c.bg} p-3`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{factorTypeLabel[f.factorType] ?? f.factorType}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-white truncate" title={f.factorName}>
                {f.factorName}
              </p>

              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="text-slate-400">LG: <span className="text-white">{f.lgValue.toFixed(1)}</span></span>
                <span className="text-slate-400">vs <span className="text-white">{f.topCompetitorValue.toFixed(1)}</span></span>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 truncate" title={f.topCompetitorName}>
                  {f.topCompetitorName}
                </span>
                <span className={`text-sm font-bold ${c.text}`}>
                  {f.gap > 0 ? '+' : ''}{f.gap.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
