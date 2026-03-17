'use client';

import type { TopDomainItem } from '@/types/war-room';
import { TopDomainsInfo } from './DashboardInfoModals';

interface TopDomainsCardProps {
  data: TopDomainItem[];
  isLoading: boolean;
}

export function TopDomainsCard({ data, isLoading }: TopDomainsCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-44 animate-pulse rounded bg-slate-800" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const top3 = data.slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">사업화 기회 상위 3개</h3>
        <TopDomainsInfo />
      </div>
      <p className="mt-1 text-xs text-slate-400">LG 준비도 × SOM 기준</p>

      {top3.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">도메인 데이터가 없습니다</p>
      ) : (
        <div className="mt-3 space-y-2">
          {top3.map((domain, idx) => (
            <div
              key={domain.name}
              className="rounded-lg border border-slate-800 bg-slate-800/30 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{domain.name}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">
                  {domain.opportunity.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-400">
                <span>준비도 {(domain.lgReadiness * 100).toFixed(0)}%</span>
                <span>SOM ${domain.somBillionUsd.toFixed(1)}B</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
