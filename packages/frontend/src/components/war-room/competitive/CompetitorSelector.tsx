'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface Competitor {
  robotId: string;
  robotName: string;
  companyName: string;
  combinedScore: number;
}

interface CompetitorSelectorProps {
  competitors: Competitor[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading: boolean;
}

export function CompetitorSelector({
  competitors,
  selectedIds,
  onSelectionChange,
  isLoading,
}: CompetitorSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (robotId: string) => {
    if (selectedIds.includes(robotId)) {
      onSelectionChange(selectedIds.filter((id) => id !== robotId));
    } else {
      onSelectionChange([...selectedIds, robotId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === competitors.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(competitors.map((c) => c.robotId));
    }
  };

  const handleSelectTop5 = () => {
    onSelectionChange(competitors.slice(0, 5).map((c) => c.robotId));
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <div className="h-5 w-48 animate-pulse rounded bg-argos-bgAlt" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-argos-muted" />
          <h3 className="text-sm font-semibold text-argos-ink">비교 대상 선택</h3>
          <span className="text-xs text-argos-muted">
            {selectedIds.length}/{competitors.length}개 선택
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectTop5}
            className="rounded-md border border-argos-border px-2 py-1 text-xs text-argos-inkSoft hover:bg-argos-bgAlt transition-colors"
          >
            Top 5
          </button>
          <button
            onClick={handleSelectAll}
            className="rounded-md border border-argos-border px-2 py-1 text-xs text-argos-inkSoft hover:bg-argos-bgAlt transition-colors"
          >
            {selectedIds.length === competitors.length ? '전체 해제' : '전체 선택'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-md p-1 text-argos-muted hover:bg-argos-bgAlt transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsed: show selected as tags */}
      {!isExpanded && selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {competitors
            .filter((c) => selectedIds.includes(c.robotId))
            .map((c) => (
              <span
                key={c.robotId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300"
              >
                {c.robotName}
                <button
                  onClick={() => handleToggle(c.robotId)}
                  className="ml-0.5 text-blue-400 hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Expanded: full checkbox list */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {competitors.map((c, i) => {
            const isSelected = selectedIds.includes(c.robotId);
            return (
              <button
                key={c.robotId}
                onClick={() => handleToggle(c.robotId)}
                className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-argos-border bg-argos-surface hover:border-argos-border'
                }`}
              >
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-argos-border'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-argos-ink">{c.robotName}</p>
                  <p className="truncate text-[10px] text-argos-muted">{c.companyName}</p>
                </div>
                <span className="ml-auto flex-shrink-0 text-[10px] text-argos-faint">#{i + 1}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
