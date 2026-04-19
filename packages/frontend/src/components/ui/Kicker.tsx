import { cn } from '@/lib/utils';

interface KickerProps {
  children: React.ReactNode;
  tone?: 'default' | 'gold' | 'pos' | 'warn' | 'neg' | 'info';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<KickerProps['tone']>, string> = {
  default: 'text-ink-500',
  gold:    'text-gold',
  pos:     'text-pos',
  warn:    'text-warn',
  neg:     'text-neg',
  info:    'text-info',
};

export function Kicker({ children, tone = 'default', className }: KickerProps) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] font-medium uppercase tracking-[0.22em]',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
