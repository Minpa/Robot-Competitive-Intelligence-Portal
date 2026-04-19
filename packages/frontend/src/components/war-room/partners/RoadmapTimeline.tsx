'use client';

import type { AdoptionMatrixEntry } from '@/types/war-room';

interface Props {
  data: AdoptionMatrixEntry[];
  isLoading: boolean;
}

const statusOrder: Record<string, number> = {
  evaluating: 0,
  adopted: 1,
  strategic: 2,
};

const statusStyle: Record<string, { bg: string; dot: string; label: string }> = {
  evaluating: { bg: 'border-blue-500/30', dot: 'bg-blue-500', label: '평가 중' },
  adopted: { bg: 'border-green-500/30', dot: 'bg-green-500', label: '채택' },
  strategic: { bg: 'border-purple-500/30', dot: 'bg-purple-500', label: '전략적' },
};

export function RoadmapTimeline({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <div className="h-5 w-40 bg-ink-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-ink-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Sort by adoption date, then by status
  const sorted = [...data].sort((a, b) => {
    const dateA = a.adoptedAt ? new Date(a.adoptedAt).getTime() : Infinity;
    const dateB = b.adoptedAt ? new Date(b.adoptedAt).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
    return (statusOrder[a.adoptionStatus] ?? 0) - (statusOrder[b.adoptionStatus] ?? 0);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <h3 className="text-sm font-semibold text-ink-900 mb-4">부품 로드맵 타임라인</h3>
        <p className="text-xs text-ink-500 text-center py-4">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">부품 로드맵 타임라인</h3>
      <div className="relative pl-4 space-y-3">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-ink-200" />

        {sorted.slice(0, 15).map((entry) => {
          const style = statusStyle[entry.adoptionStatus] ?? statusStyle.evaluating;
          return (
            <div key={entry.id} className="relative flex items-start gap-3">
              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
              <div className={`flex-1 rounded-md border p-2 ${style.bg} bg-ink-100`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-900">
                    {entry.partnerName} → {entry.robotName}
                  </span>
                  <span className="text-[10px] text-ink-500">
                    {entry.adoptedAt
                      ? new Date(entry.adoptedAt).toLocaleDateString('ko-KR')
                      : '진행 중'}
                  </span>
                </div>
                <span className="text-[10px] text-ink-500">{style.label}</span>
                {entry.notes && (
                  <p className="text-[10px] text-ink-500 mt-0.5">{entry.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
