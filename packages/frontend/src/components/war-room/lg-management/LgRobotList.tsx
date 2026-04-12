'use client';

import { Plus, ChevronRight } from 'lucide-react';
import type { LgRobotWithSpecs } from '@/types/war-room';

interface LgRobotListProps {
  robots: LgRobotWithSpecs[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  isLoading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function LgRobotList({ robots, selectedId, onSelect, onCreateClick, isLoading }: LgRobotListProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-argos-bgAlt" />
          <div className="h-8 w-8 animate-pulse rounded bg-argos-bgAlt" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-argos-bgAlt" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-argos-ink">LG 로봇 목록</h3>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          새 로봇 추가
        </button>
      </div>

      {robots.length === 0 ? (
        <p className="text-sm text-argos-muted">등록된 LG 로봇이 없습니다</p>
      ) : (
        <ul className="space-y-2">
          {robots.map((robot) => (
            <li key={robot.id}>
              <button
                onClick={() => onSelect(robot.id)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedId === robot.id
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-argos-border bg-argos-bgAlt hover:bg-argos-bgAlt'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-argos-ink">{robot.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {robot.status && (
                      <span className="rounded bg-argos-bgAlt px-1.5 py-0.5 text-xs text-argos-inkSoft">
                        {robot.status}
                      </span>
                    )}
                    {robot.locomotionType && (
                      <span className="text-xs text-argos-muted">{robot.locomotionType}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-argos-muted">
                    수정: {formatDate(robot.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-argos-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
