import { cn } from '@/lib/utils';
import { Kicker } from './Kicker';

type InsightTone = 'default' | 'gold' | 'pos' | 'warn' | 'neg' | 'info';

interface InsightBoxProps {
  title?: string;
  label?: string;
  children: React.ReactNode;
  tone?: InsightTone;
  className?: string;
}

const TONE_CLASSES: Record<InsightTone, { border: string; bg: string; bar: string; kicker: 'default' | 'gold' | 'pos' | 'warn' | 'neg' | 'info' }> = {
  default: { border: 'border-ink-200', bg: 'bg-white',      bar: 'bg-ink-900', kicker: 'default' },
  gold:    { border: 'border-gold-soft', bg: 'bg-gold-soft/50', bar: 'bg-gold', kicker: 'gold' },
  pos:     { border: 'border-pos-soft', bg: 'bg-pos-soft/60', bar: 'bg-pos',   kicker: 'pos' },
  warn:    { border: 'border-warn-soft', bg: 'bg-warn-soft/60', bar: 'bg-warn', kicker: 'warn' },
  neg:     { border: 'border-neg-soft', bg: 'bg-neg-soft/60', bar: 'bg-neg',   kicker: 'neg' },
  info:    { border: 'border-info-soft', bg: 'bg-info-soft/60', bar: 'bg-info', kicker: 'info' },
};

export function InsightBox({
  title,
  label = 'Insight',
  children,
  tone = 'default',
  className,
}: InsightBoxProps) {
  const t = TONE_CLASSES[tone];
  return (
    <aside
      className={cn(
        'relative border px-5 py-4',
        t.border,
        t.bg,
        className
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-[2px]', t.bar)} />
      <div className="pl-2">
        <Kicker tone={t.kicker}>{label}</Kicker>
        {title && (
          <h4 className="font-serif text-[15px] font-semibold text-ink-900 mt-1.5 leading-snug">
            {title}
          </h4>
        )}
        <div className="text-[12.5px] text-ink-700 leading-relaxed mt-2 space-y-2">
          {children}
        </div>
      </div>
    </aside>
  );
}
