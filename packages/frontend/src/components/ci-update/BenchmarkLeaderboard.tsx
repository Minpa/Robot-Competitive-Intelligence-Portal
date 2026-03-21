'use client';

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

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">📊 축별 리더보드</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left text-slate-400 font-medium px-2 py-1.5 border-b border-slate-700">축</th>
              {competitors.map(c => (
                <th
                  key={c.slug}
                  className="text-center font-medium px-2 py-1.5 border-b border-slate-700 cursor-pointer hover:bg-slate-700/30"
                  style={{ color: COMPANY_COLORS[c.slug] || '#94a3b8' }}
                  onClick={() => onSelect(c.slug)}
                >
                  {c.name}
                </th>
              ))}
              <th className="text-center text-green-400 font-medium px-2 py-1.5 border-b border-slate-700">완벽</th>
            </tr>
          </thead>
          <tbody>
            {axes.map(axis => {
              const leader = getLeader(axis.key);
              return (
                <tr key={axis.key} className="hover:bg-slate-800/30">
                  <td className="text-slate-300 px-2 py-1.5 border-b border-slate-700/30 whitespace-nowrap">
                    {axis.icon} {axis.label}
                  </td>
                  {competitors.map(c => {
                    const score = c.scores[axis.key]?.currentScore || 0;
                    const isLeader = score === leader && score > 0;
                    return (
                      <td
                        key={c.slug}
                        className={`text-center px-2 py-1.5 border-b border-slate-700/30 ${
                          isLeader ? 'font-bold' : ''
                        }`}
                        style={{ color: isLeader ? COMPANY_COLORS[c.slug] : '#94a3b8' }}
                      >
                        {score}
                        {isLeader && ' 👑'}
                      </td>
                    );
                  })}
                  <td className="text-center text-green-400/60 px-2 py-1.5 border-b border-slate-700/30">10</td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr className="bg-slate-800/50 font-semibold">
              <td className="text-slate-200 px-2 py-2 border-t border-slate-600">총점</td>
              {withTotals.map(c => (
                <td
                  key={c.slug}
                  className="text-center px-2 py-2 border-t border-slate-600"
                  style={{ color: COMPANY_COLORS[c.slug] || '#94a3b8' }}
                >
                  {c.total}
                </td>
              ))}
              <td className="text-center text-green-400 px-2 py-2 border-t border-slate-600">100</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
