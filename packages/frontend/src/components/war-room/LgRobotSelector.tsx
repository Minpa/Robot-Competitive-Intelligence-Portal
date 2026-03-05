'use client';

import { ChevronDown } from 'lucide-react';
import { useWarRoomContext } from './WarRoomContext';
import { cn } from '@/lib/utils';

export function LgRobotSelector() {
  const { selectedRobotId, setSelectedRobotId, lgRobots, isLoading } = useWarRoomContext();

  if (isLoading) {
    return (
      <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-800" />
    );
  }

  if (lgRobots.length === 0) {
    return (
      <span className="text-sm text-slate-500">LG 로봇 없음</span>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedRobotId ?? ''}
        onChange={(e) => setSelectedRobotId(e.target.value)}
        className={cn(
          'appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 pr-8',
          'text-sm text-slate-200 outline-none',
          'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          'cursor-pointer'
        )}
        aria-label="LG 로봇 선택"
      >
        {lgRobots.map((robot) => (
          <option key={robot.id} value={robot.id}>
            {robot.name} {robot.companyName ? `(${robot.companyName})` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
