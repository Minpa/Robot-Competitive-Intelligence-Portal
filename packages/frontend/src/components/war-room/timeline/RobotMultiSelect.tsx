'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { LgRobotListItem } from '@/types/war-room';

interface RobotMultiSelectProps {
  robots: LgRobotListItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

const MAX_SELECTION = 10;

export function RobotMultiSelect({ robots, selected, onChange }: RobotMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < MAX_SELECTION) {
      onChange([...selected, id]);
    }
  };

  const selectedNames = robots
    .filter((r) => selected.includes(r.id))
    .map((r) => r.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-argos-border bg-argos-surface px-3 py-2 text-sm text-argos-ink hover:border-argos-border"
      >
        <span className="truncate">
          {selected.length === 0
            ? '로봇 선택 (최대 10개)'
            : `${selectedNames.slice(0, 2).join(', ')}${selected.length > 2 ? ` 외 ${selected.length - 2}개` : ''}`}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-argos-muted" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-argos-border bg-argos-surface shadow-xl">
          {robots.length === 0 ? (
            <p className="p-3 text-sm text-argos-muted">로봇이 없습니다</p>
          ) : (
            robots.map((robot) => {
              const checked = selected.includes(robot.id);
              const disabled = !checked && selected.length >= MAX_SELECTION;
              return (
                <label
                  key={robot.id}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-argos-bgAlt ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(robot.id)}
                    className="h-3.5 w-3.5 rounded border-argos-border bg-argos-bgAlt text-blue-500 focus:ring-blue-500/30"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-argos-ink">{robot.name}</p>
                    <p className="truncate text-xs text-argos-muted">{robot.companyName}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {robots
            .filter((r) => selected.includes(r.id))
            .map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300"
              >
                {r.name}
                <button type="button" onClick={() => toggle(r.id)} className="hover:text-blue-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
