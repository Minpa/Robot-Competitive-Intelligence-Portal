'use client';

import type { GoalStatusSummary } from '@/types/war-room';
import { GoalStatusInfo } from './DashboardInfoModals';

interface GoalStatusCardProps {
  data: GoalStatusSummary;
  isLoading: boolean;
}

const statusConfig = [
  { key: 'achieved' as const, label: '달성', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { key: 'on_track' as const, label: '순조', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { key: 'at_risk' as const, label: '위험', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { key: 'behind' as const, label: '지연', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export function GoalStatusCard({ data, isLoading }: GoalStatusCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-slate-800" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const total = data.achieved + data.on_track + data.at_risk + data.behind;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">전략 목표</h3>
          <GoalStatusInfo />
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          총 {total}개
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {statusConfig.map((cfg) => (
          <div
            key={cfg.key}
            className={`flex flex-col items-center rounded-lg border p-3 ${cfg.color}`}
          >
            <span className="text-2xl font-bold">{data[cfg.key]}</span>
            <span className="mt-0.5 text-xs">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
