'use client';

interface StaleBadgeProps {
  cachedAt: string | null;
}

function formatCacheTime(cachedAt: string | null): string {
  if (!cachedAt) return '';
  try {
    const date = new Date(cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}일 전`;
  } catch {
    return '';
  }
}

/**
 * StaleBadge — "stale" badge + cache time display.
 * Dark theme styling, positioned at top-right of parent container.
 *
 * Requirements: 11.101, 11.104, 11.107, 11.108
 */
export function StaleBadge({ cachedAt }: StaleBadgeProps) {
  const timeLabel = formatCacheTime(cachedAt);

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs font-medium text-amber-300">stale</span>
      {timeLabel && (
        <span className="text-xs text-amber-400/70">{timeLabel}</span>
      )}
    </div>
  );
}
