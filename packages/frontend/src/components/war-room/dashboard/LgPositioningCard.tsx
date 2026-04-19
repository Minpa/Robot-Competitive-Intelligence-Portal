'use client';

import type { LgPositioning } from '@/types/war-room';
import { PositioningCardInfo } from './DashboardInfoModals';

interface LgPositioningCardProps {
  data: LgPositioning | null;
  isLoading: boolean;
}

export function LgPositioningCard({ data, isLoading }: LgPositioningCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-ink-100" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink-900">LG 종합 포지셔닝</h3>
        <p className="mt-4 text-sm text-ink-500">데이터가 없습니다</p>
      </div>
    );
  }

  const rankPercent = data.totalRobots > 0
    ? Math.round(((data.totalRobots - data.overallRank + 1) / data.totalRobots) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">LG 종합 포지셔닝</h3>
        <PositioningCardInfo />
      </div>
      <p className="mt-1 text-xs text-ink-500">{data.robotName}</p>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-3xl font-bold text-blue-400">{data.overallRank}위</span>
        <span className="mb-1 text-sm text-ink-500">/ {data.totalRobots}개 로봇</span>
      </div>

      {/* Rank progress bar */}
      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-ink-100">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${rankPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">상위 {Math.max(1, 100 - rankPercent)}%</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white p-2">
          <p className="text-xs text-ink-500">PoC 합계</p>
          <p className="text-sm font-semibold text-ink-900">{data.pocTotal.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-white p-2">
          <p className="text-xs text-ink-500">RFM 합계</p>
          <p className="text-sm font-semibold text-ink-900">{data.rfmTotal.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-white p-2">
          <p className="text-xs text-ink-500">종합 점수</p>
          <p className="text-sm font-semibold text-emerald-400">{data.combinedScore.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}
