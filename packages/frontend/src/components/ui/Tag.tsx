import { cn } from '@/lib/utils';

type TagTone = 'neutral' | 'brand' | 'gold' | 'pos' | 'warn' | 'neg' | 'info';
type TagSize = 'sm' | 'md';

interface TagProps {
  children: React.ReactNode;
  tone?: TagTone;
  size?: TagSize;
  dot?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<TagTone, { bg: string; text: string; dot: string }> = {
  neutral: { bg: 'bg-ink-100',  text: 'text-ink-700',  dot: 'bg-ink-500' },
  brand:   { bg: 'bg-brand',    text: 'text-white',    dot: 'bg-gold'    },
  gold:    { bg: 'bg-gold-soft', text: 'text-gold',    dot: 'bg-gold'    },
  pos:     { bg: 'bg-pos-soft', text: 'text-pos',      dot: 'bg-pos'     },
  warn:    { bg: 'bg-warn-soft', text: 'text-warn',    dot: 'bg-warn'    },
  neg:     { bg: 'bg-neg-soft', text: 'text-neg',      dot: 'bg-neg'     },
  info:    { bg: 'bg-info-soft', text: 'text-info',    dot: 'bg-info'    },
};

const SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'px-1.5 py-0.5 text-[9px] tracking-[0.18em]',
  md: 'px-2 py-1 text-[10px] tracking-[0.2em]',
};

export function Tag({ children, tone = 'neutral', size = 'md', dot, className }: TagProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium uppercase',
        SIZE_CLASSES[size],
        t.bg,
        t.text,
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
