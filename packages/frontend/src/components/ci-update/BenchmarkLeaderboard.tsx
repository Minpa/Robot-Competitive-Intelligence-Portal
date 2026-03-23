'use client';

import { useState } from 'react';
import type { BenchmarkAxis, BenchmarkCompetitorData } from '@/types/ci-update';

const COMPANY_COLORS: Record<string, string> = {
  digit: '#22d3ee', optimus: '#f43f5e', figure: '#a78bfa',
  neo: '#fbbf24', atlas: '#34d399', cloid: '#ff6b9d',
};

interface BenchmarkLeaderboardProps {
  axes: BenchmarkAxis[];
  competitors: BenchmarkCompetitorData[];
  onSelect: (slug: string) => void;
}

export function BenchmarkLeaderboard({ axes, competitors, onSelect }: BenchmarkLeaderboardProps) {
  const [expandedAxis, setExpandedAxis] = useState<string | null>(null);

  // Calculate totals
  const withTotals = competitors.map(c => ({
    ...c,
    total: axes.reduce((sum, axis) => sum + (c.scores[axis.key]?.currentScore || 0), 0),
  }));

  // Find leader per axis
  const getLeader = (axisKey: string) => {
    let max = 0;
    for (const c of competitors) {
      const score = c.scores[axisKey]?.currentScore || 0;
      if (score > max) max = score;
    }
    return max;
  };

  const toggleAxis = (axisKey: string) => {
    setExpandedAxis(prev => prev === axisKey ? null : axisKey);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <h3 className="text-base font-semibold text-white mb-1">📊 축별 리더보드</h3>
      <p className="text-xs text-slate-500 mb-3">각 행을 클릭하면 기준 설명과 점수 근거를 확인할 수 있습니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left text-slate-400 font-medium px-3 py-2 border-b border-slate-700 min-w-[160px]">축</th>
              {competitors.map(c => (
                <th
                  key={c.slug}
                  className="text-center font-medium px-3 py-2 border-b border-slate-700 cursor-pointer hover:bg-slate-700/30"
                  style={{ color: COMPANY_COLORS[c.slug] || '#94a3b8' }}
                  onClick={() => onSelect(c.slug)}
                >
                  {c.name}
                </th>
              ))}
              <th className="text-center text-green-400 font-medium px-3 py-2 border-b border-slate-700">완벽</th>
            </tr>
          </thead>
          <tbody>
            {axes.map(axis => {
              const leader = getLeader(axis.key);
              const isExpanded = expandedAxis === axis.key;
              return (
                <>
                  {/* Score row */}
                  <tr
                    key={axis.key}
                    className="hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => toggleAxis(axis.key)}
                  >
                    <td className="text-slate-300 px-3 py-2 border-b border-slate-700/30 whitespace-nowrap">
                      <span className="mr-1 text-xs text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                      {axis.icon} {axis.label}
                    </td>
                    {competitors.map(c => {
                      const scoreData = c.scores[axis.key];
                      const score = scoreData?.currentScore || 0;
                      const isLeader = score === leader && score > 0;
                      const color = COMPANY_COLORS[c.slug] || '#94a3b8';
                      return (
                        <td
                          key={c.slug}
                          className={`text-center px-3 py-2 border-b border-slate-700/30 relative group/cell ${
                            isLeader ? 'font-bold' : ''
                          }`}
                          style={{ color: isLeader ? color : '#94a3b8' }}
                        >
                          {score}
                          {isLeader && ' 👑'}
                          {/* Hover popover */}
                          {scoreData?.rationale && (
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 opacity-0 invisible group-hover/cell:opacity-100 group-hover/cell:visible transition-all duration-150 pointer-events-none">
                              <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm font-semibold" style={{ color }}>{c.name}</span>
                                  <span className="text-sm" style={{ color }}>
                                    {score}/10
                                    {scoreData.targetScore > score && (
                                      <span className="text-green-400 ml-1">→{scoreData.targetScore}</span>
                                    )}
                                  </span>
                                </div>
                                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                                  {scoreData.targetScore > score && (
                                    <div className="absolute h-full rounded-full opacity-30" style={{ width: `${scoreData.targetScore * 10}%`, backgroundColor: color }} />
                                  )}
                                  <div className="absolute h-full rounded-full" style={{ width: `${score * 10}%`, backgroundColor: color }} />
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{scoreData.rationale}</p>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600" />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center text-green-400/60 px-3 py-2 border-b border-slate-700/30">10</td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`${axis.key}-detail`}>
                      <td colSpan={competitors.length + 2} className="px-3 py-4 border-b border-slate-700/30 bg-slate-800/40">
                        {/* Axis definition */}
                        <div className="mb-4 bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-3xl">{axis.icon}</span>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-white mb-1">{axis.label}</h4>
                              <p className="text-sm text-slate-400 mb-2">{axis.description}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">10점 기준</span>
                                <span className="text-xs text-slate-300">{axis.perfectDef}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Per-competitor rationale */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {competitors.map(c => {
                            const score = c.scores[axis.key];
                            if (!score) return null;
                            const color = COMPANY_COLORS[c.slug] || '#94a3b8';
                            return (
                              <div
                                key={c.slug}
                                className="bg-slate-700/20 rounded-lg p-3 border border-slate-700/50"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-sm font-medium" style={{ color }}>{c.name}</span>
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <span style={{ color }}>{score.currentScore}</span>
                                    {score.targetScore > score.currentScore && (
                                      <span className="text-slate-500">→ <span className="text-green-400">{score.targetScore}</span></span>
                                    )}
                                  </div>
                                </div>
                                {/* Score bar */}
                                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                                  {score.targetScore > score.currentScore && (
                                    <div
                                      className="absolute h-full rounded-full opacity-30"
                                      style={{ width: `${score.targetScore * 10}%`, backgroundColor: color }}
                                    />
                                  )}
                                  <div
                                    className="absolute h-full rounded-full"
                                    style={{ width: `${score.currentScore * 10}%`, backgroundColor: color }}
                                  />
                                </div>
                                {/* Rationale */}
                                {score.rationale && (
                                  <p className="text-xs text-slate-400 leading-relaxed">{score.rationale}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {/* Total row */}
            <tr className="bg-slate-800/50 font-semibold">
              <td className="text-slate-200 px-3 py-2.5 border-t border-slate-600">총점</td>
              {withTotals.map(c => (
                <td
                  key={c.slug}
                  className="text-center px-3 py-2.5 border-t border-slate-600"
                  style={{ color: COMPANY_COLORS[c.slug] || '#94a3b8' }}
                >
                  {c.total}
                </td>
              ))}
              <td className="text-center text-green-400 px-3 py-2.5 border-t border-slate-600">100</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
