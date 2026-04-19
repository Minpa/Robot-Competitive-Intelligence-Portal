'use client';

import type { LgRanking } from '@/types/war-room';
import { RankingCardInfo } from './ScoreInfoModal';

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
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="mb-3 h-5 w-36 animate-pulse rounded bg-ink-100" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink-900">LG 종합 순위</h3>
        <p className="mt-4 text-sm text-ink-500">순위 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">LG 종합 순위</h3>
        <RankingCardInfo />
      </div>
      <p className="mt-1 text-xs text-ink-500">전체 {ranking.totalRobots}개 로봇 중</p>

      <div className="mt-4 space-y-3">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center justify-between rounded-lg bg-ink-100 px-3 py-2">
            <span className="text-sm text-ink-700">{m.label}</span>
            <span className={`text-lg font-bold ${m.color}`}>
              {ranking[m.key]}위 <span className="text-xs font-normal text-ink-500">/ {ranking.totalRobots}개 로봇</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
