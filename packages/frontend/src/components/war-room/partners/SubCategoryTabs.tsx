'use client';

import { cn } from '@/lib/utils';

const SUB_CATEGORIES = [
  { key: '', label: '전체' },
  { key: 'vision_sensor', label: '비전 센서' },
  { key: 'battery', label: '배터리' },
  { key: 'ai_chip', label: 'AI 칩' },
  { key: 'actuator', label: '액추에이터' },
  { key: 'motor', label: '모터' },
  { key: 'reducer', label: '감속기' },
  { key: 'force_sensor', label: '힘/토크 센서' },
] as const;

interface Props {
  selected: string;
  onChange: (sub: string) => void;
  visible: boolean;
}

export function SubCategoryTabs({ selected, onChange, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {SUB_CATEGORIES.map((s) => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className={cn(
            'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            selected === s.key
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
