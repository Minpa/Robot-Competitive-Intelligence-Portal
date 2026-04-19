import { cn } from '@/lib/utils';
import { Kicker } from './Kicker';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  kicker?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'muted' | 'dark';
  padding?: 'default' | 'compact' | 'none';
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<PanelProps['variant']>, string> = {
  default: 'bg-white border-ink-200 text-ink-900',
  muted:   'bg-paper border-ink-200 text-ink-900',
  dark:    'bg-brand border-brand-soft text-white',
};

const PADDING_CLASSES: Record<NonNullable<PanelProps['padding']>, string> = {
  default: 'p-6',
  compact: 'p-4',
  none:    'p-0',
};

export function Panel({
  children,
  title,
  kicker,
  subtitle,
  headerRight,
  footer,
  variant = 'default',
  padding = 'default',
  className,
}: PanelProps) {
  const hasHeader = Boolean(title || kicker || headerRight);
  const isDark = variant === 'dark';

  return (
    <section
      className={cn(
        'border flex flex-col',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-4 border-b px-6 py-4',
            isDark ? 'border-white/10' : 'border-ink-200'
          )}
        >
          <div className="min-w-0 flex-1">
            {kicker && (
              <div className="mb-1.5">
                <Kicker tone={isDark ? 'gold' : 'default'}>{kicker}</Kicker>
              </div>
            )}
            {title && (
              <h3
                className={cn(
                  'font-serif text-[17px] font-semibold leading-tight tracking-tight',
                  isDark ? 'text-white' : 'text-ink-900'
                )}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className={cn(
                  'mt-1 text-[12px] leading-relaxed',
                  isDark ? 'text-white/60' : 'text-ink-500'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </header>
      )}
      <div className={cn('flex-1', PADDING_CLASSES[padding])}>{children}</div>
      {footer && (
        <footer
          className={cn(
            'border-t px-6 py-3 text-[11px]',
            isDark ? 'border-white/10 text-white/60' : 'border-ink-200 text-ink-500'
          )}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}
