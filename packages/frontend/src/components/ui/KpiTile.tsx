import { cn } from '@/lib/utils';
import { Kicker } from './Kicker';

type Trend = 'up' | 'down' | 'flat';

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  trend?: Trend;
  context?: string;
  className?: string;
}

const TREND_CLASSES: Record<Trend, string> = {
  up:   'text-pos',
  down: 'text-neg',
  flat: 'text-ink-500',
};

const TREND_GLYPH: Record<Trend, string> = {
  up:   '▲',
  down: '▼',
  flat: '▬',
};

export function KpiTile({
  label,
  value,
  unit,
  delta,
  trend,
  context,
  className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        'bg-white border border-ink-200 p-5 flex flex-col gap-3',
        className
      )}
    >
      <Kicker>{label}</Kicker>
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-[32px] font-semibold leading-none text-ink-900 tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[12px] text-ink-500 uppercase tracking-[0.14em]">
            {unit}
          </span>
        )}
      </div>
      {(delta || context) && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-ink-100">
          {delta && trend && (
            <span className={cn('font-mono text-[11px] font-medium tracking-wide', TREND_CLASSES[trend])}>
              {TREND_GLYPH[trend]} {delta}
            </span>
          )}
          {context && (
            <span className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.14em] ml-auto">
              {context}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
