'use client';

import { History } from 'lucide-react';
import type { SpecChangeLog } from '@/types/war-room';

interface ChangeHistoryPanelProps {
  history: SpecChangeLog[];
  isLoading: boolean;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChangeHistoryPanel({ history, isLoading }: ChangeHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-argos-bgAlt" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-argos-bgAlt" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-argos-muted" />
        <h3 className="text-sm font-semibold text-argos-ink">변경 이력</h3>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-argos-muted">변경 이력이 없습니다</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {sorted.map((log) => (
            <li
              key={log.id}
              className="rounded-lg border border-argos-border bg-argos-bgAlt p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-400">
                  {log.tableName}.{log.fieldName}
                </span>
                <span className="text-xs text-argos-muted">
                  {formatTimestamp(log.changedAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="text-red-400/80">{log.oldValue ?? '(없음)'}</span>
                <span className="text-argos-muted">→</span>
                <span className="text-emerald-400/80">{log.newValue ?? '(없음)'}</span>
              </div>
              {log.changedBy && (
                <p className="mt-1 text-xs text-argos-muted">편집자: {log.changedBy}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
