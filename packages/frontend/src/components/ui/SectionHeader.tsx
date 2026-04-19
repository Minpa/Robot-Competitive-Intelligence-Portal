import { cn } from '@/lib/utils';
import { Kicker } from './Kicker';

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  number?: string;
  right?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  number,
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-6 mb-6', className)}>
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="flex items-center gap-3 mb-2">
            {number && (
              <span className="font-mono text-[11px] font-medium text-gold tracking-[0.2em]">
                {number}
              </span>
            )}
            <Kicker>{kicker}</Kicker>
          </div>
        )}
        <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[13px] text-ink-500 leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
