'use client';

import type { BenchmarkAxis, BenchmarkCompetitorData } from '@/types/ci-update';

interface BenchmarkGapAnalysisProps {
  axes: BenchmarkAxis[];
  cloid: BenchmarkCompetitorData | undefined;
}

export function BenchmarkGapAnalysis({ axes, cloid }: BenchmarkGapAnalysisProps) {
  if (!cloid) {
    return (
      <div className="bg-argos-surface rounded-xl border border-argos-border p-4">
        <h3 className="text-base font-semibold text-argos-ink">CLOiD 갭 분석</h3>
        <p className="text-argos-muted text-sm mt-2">CLOiD 데이터가 없습니다.</p>
      </div>
    );
  }

  // Categorize axes
  const strengths: Array<{ axis: BenchmarkAxis; current: number; target: number; gap: number }> = [];
  const gaps: Array<{ axis: BenchmarkAxis; current: number; target: number; gap: number }> = [];

  for (const axis of axes) {
    const score = cloid.scores[axis.key];
    if (!score) continue;
    const { currentScore: current, targetScore: target } = score;
    const gapToTarget = target - current;

    if (current >= 5) {
      strengths.push({ axis, current, target, gap: gapToTarget });
    }
    if (gapToTarget >= 3) {
      gaps.push({ axis, current, target, gap: gapToTarget });
    }
  }

  // Sort: strengths by current desc, gaps by gap desc
  strengths.sort((a, b) => b.current - a.current);
  gaps.sort((a, b) => b.gap - a.gap);

  // Remove duplicates from gaps that are in strengths
  const strengthKeys = new Set(strengths.map(s => s.axis.key));

  const totalCurrent = axes.reduce((sum, axis) => sum + (cloid.scores[axis.key]?.currentScore || 0), 0);
  const totalTarget = axes.reduce((sum, axis) => sum + (cloid.scores[axis.key]?.targetScore || 0), 0);

  return (
    <div className="bg-argos-surface rounded-xl border border-argos-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-argos-ink">CLOiD 갭 분석</h3>
        <div className="text-sm text-argos-muted">
          현재 <span className="text-pink-400 font-medium">{totalCurrent}</span> → 목표 <span className="text-pink-300 font-medium">{totalTarget}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-green-400 mb-2">강점 / 차별화 포인트</h4>
          <div className="space-y-2">
            {strengths.length === 0 && <p className="text-sm text-argos-muted">해당 없음</p>}
            {strengths.map(({ axis, current, target }) => (
              <div key={axis.key} className="flex items-center justify-between text-sm">
                <span className="text-argos-inkSoft">{axis.label}</span>
                <span className="text-green-400">
                  {current}{target > current ? ` → ${target}` : ''} <span className="text-argos-muted">/ 10</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-400 mb-2">갭 / 보강 필요</h4>
          <div className="space-y-2">
            {gaps.length === 0 && <p className="text-sm text-argos-muted">해당 없음</p>}
            {gaps.filter(g => !strengthKeys.has(g.axis.key) || g.gap >= 5).map(({ axis, current, target, gap }) => (
              <div key={axis.key} className="flex items-center justify-between text-sm">
                <span className="text-argos-inkSoft">{axis.label}</span>
                <span className="text-red-400">
                  {current} → {target} <span className="text-argos-muted">(갭 {gap})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
