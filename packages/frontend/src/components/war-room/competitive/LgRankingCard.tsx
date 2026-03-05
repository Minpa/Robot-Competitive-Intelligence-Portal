'use client';

import type { LgRanking } from '@/types/war-room';

interface LgRankingCardProps {
  ranking: LgRanking | null;
  isLoading: boolean;
}

const metrics = [
  { key: 'pocRank' as const, label: 'PoC 순위', color: 'text-blue-400' },
  { key: 'rfmRank' as const, label: 'RFM 순위', color: 'text-amber-400' },
  { key: 'combinedRank' as const, label: '종합 순위', color: 'text-emerald-400' },
];

export function LgRankingCard({ ranking, isLoading }: LgRankingCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-36 animate-pulse rounded bg-slate-800" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-white">LG 종합 순위</h3>
        <p className="mt-4 text-sm text-slate-500">순위 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-white">LG 종합 순위</h3>
      <p className="mt-1 text-xs text-slate-400">전체 {ranking.totalRobots}개 로봇 중</p>

      <div className="mt-4 space-y-3">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
            <span className="text-sm text-slate-300">{m.label}</span>
            <span className={`text-lg font-bold ${m.color}`}>
              {ranking[m.key]}위 <span className="text-xs font-normal text-slate-500">/ {ranking.totalRobots}개 로봇</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
