'use client';

import type { ApplicationDomain } from '@/types/war-room';
import { ArrowRight } from 'lucide-react';

interface Props {
  domains: ApplicationDomain[];
  isLoading: boolean;
}

export function EntryOrderList({ domains, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <div className="h-5 w-44 bg-ink-100 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-ink-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Sort by lg_readiness × SOM descending
  const sorted = [...domains]
    .filter((d) => d.lgReadiness != null && d.somBillionUsd != null)
    .map((d) => ({
      ...d,
      lgReadiness: Number(d.lgReadiness ?? 0),
      somBillionUsd: Number(d.somBillionUsd ?? 0),
      cagrPercent: d.cagrPercent != null ? Number(d.cagrPercent) : null,
      opportunity: Number(d.lgReadiness ?? 0) * Number(d.somBillionUsd ?? 0),
    }))
    .sort((a, b) => b.opportunity - a.opportunity);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <h3 className="text-sm font-semibold text-ink-900 mb-4">CLOiD 최적 진입 순서</h3>
        <p className="text-xs text-ink-500 text-center py-4">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">CLOiD 최적 진입 순서</h3>
      <div className="space-y-2">
        {sorted.map((d, i) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-md bg-ink-100 border border-ink-100 p-3"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{d.name}</p>
              <div className="flex gap-3 text-[10px] text-ink-500 mt-0.5">
                <span>준비도: {(Number(d.lgReadiness ?? 0) * 100).toFixed(0)}%</span>
                <span>SOM: ${Number(d.somBillionUsd ?? 0).toFixed(1)}B</span>
                {d.cagrPercent != null && <span>CAGR: {d.cagrPercent}%</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono text-green-400">{d.opportunity.toFixed(2)}</p>
              <p className="text-[10px] text-ink-500">기회 점수</p>
            </div>
            {i < sorted.length - 1 && (
              <ArrowRight className="h-3 w-3 text-ink-400 shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
