'use client';

import type { PartnerSummaryItem } from '@/types/war-room';
import { PartnerSummaryInfo } from './DashboardInfoModals';

interface PartnerSummaryCardProps {
  data: PartnerSummaryItem[];
  isLoading: boolean;
}

const categoryLabels: Record<string, string> = {
  component: '부품',
  rfm: 'RFM',
  data: '데이터',
  platform: '플랫폼',
  integration: '통합',
};

export function PartnerSummaryCard({ data, isLoading }: PartnerSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-argos-bgAlt" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-argos-bgAlt" />
          ))}
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-argos-ink">전략 파트너 요약</h3>
          <PartnerSummaryInfo />
        </div>
        <span className="rounded-full bg-argos-bgAlt px-2 py-0.5 text-xs text-argos-inkSoft">
          총 {total}개
        </span>
      </div>

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-argos-muted">파트너 데이터가 없습니다</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((item) => {
            const maxCount = Math.max(...data.map((d) => d.count), 1);
            const barWidth = Math.round((item.count / maxCount) * 100);
            return (
              <li key={item.category} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-argos-muted">
                  {categoryLabels[item.category] ?? item.category}
                </span>
                <div className="flex-1">
                  <div className="h-4 w-full rounded bg-argos-bgAlt">
                    <div
                      className="flex h-4 items-center rounded bg-blue-500/30 px-1.5 text-xs text-blue-300"
                      style={{ width: `${Math.max(barWidth, 15)}%` }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
