'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Users } from 'lucide-react';

export interface RobotOption {
  robotId: string;
  robotName: string;
  companyName: string;
  averageScore: number;
}

interface RobotSelectorProps {
  robots: RobotOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function RobotSelector({
  robots,
  selectedIds,
  onSelectionChange,
}: RobotSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (robotId: string) => {
    if (selectedIds.includes(robotId)) {
      onSelectionChange(selectedIds.filter((id) => id !== robotId));
    } else {
      onSelectionChange([...selectedIds, robotId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === robots.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(robots.map((r) => r.robotId));
    }
  };

  const handleSelectTop5 = () => {
    const top5 = [...robots]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)
      .map((r) => r.robotId);
    onSelectionChange(top5);
  };

  const handleSelectTop10 = () => {
    const top10 = [...robots]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10)
      .map((r) => r.robotId);
    onSelectionChange(top10);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">비교 대상 선택</h3>
          <span className="text-xs text-slate-500">
            {selectedIds.length}/{robots.length}개 선택
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectTop5}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Top 5
          </button>
          <button
            onClick={handleSelectTop10}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Top 10
          </button>
          <button
            onClick={handleSelectAll}
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {selectedIds.length === robots.length ? '전체 해제' : '전체 선택'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsed: show selected as tags */}
      {!isExpanded && selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {robots
            .filter((r) => selectedIds.includes(r.robotId))
            .map((r) => (
              <span
                key={r.robotId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300"
              >
                {r.robotName}
                <button
                  onClick={() => handleToggle(r.robotId)}
                  className="ml-0.5 text-blue-400 hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Expanded: full checkbox grid */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {[...robots]
            .sort((a, b) => b.averageScore - a.averageScore)
            .map((r, i) => {
              const isSelected = selectedIds.includes(r.robotId);
              return (
                <button
                  key={r.robotId}
                  onClick={() => handleToggle(r.robotId)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{r.robotName}</p>
                    <p className="truncate text-[10px] text-slate-400">{r.companyName} · {r.averageScore.toFixed(1)}</p>
                  </div>
                  <span className="ml-auto flex-shrink-0 text-[10px] text-slate-500">#{i + 1}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
