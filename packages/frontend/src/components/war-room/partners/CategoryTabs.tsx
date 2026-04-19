'use client';

import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'component', label: '부품' },
  { key: 'rfm', label: 'RFM' },
  { key: 'data', label: '데이터/AI' },
  { key: 'platform', label: '플랫폼' },
  { key: 'integration', label: '통합' },
] as const;

interface Props {
  selected: string;
  onChange: (cat: string) => void;
}

export function CategoryTabs({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          onClick={() => onChange(c.key === 'all' ? '' : c.key)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            (c.key === 'all' && !selected) || selected === c.key
              ? 'bg-blue-600 text-white'
              : 'bg-ink-100 text-ink-500 hover:bg-ink-100 hover:text-ink-700'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
