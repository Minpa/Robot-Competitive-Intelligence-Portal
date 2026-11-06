import Link from 'next/link';
import type { WeeklyBriefDraftSummary } from '@/types/weekly-brief';
import { draftBannerModel } from '@/lib/weekly-brief-exec';

/** 관리자 전용: 발행 대기 중인 브리프 안내. 7일 이상 경과하면 강조 색. 일반 사용자 화면에는 렌더하지 않는다(호출자가 isAdmin 일 때만 사용) */
export function DraftBanner({ summary }: { summary: Pick<WeeklyBriefDraftSummary, 'pending' | 'oldestWeekStart' | 'oldestAgeDays'> | null | undefined }) {
  const m = draftBannerModel(summary);
  if (!m) return null;
  return (
    <div
      role="status"
      data-testid="draft-banner"
      data-stale={m.stale ? 'true' : 'false'}
      className={`no-print mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-2 border px-4 py-2.5 text-[13px] ${m.stale ? 'border-neg bg-neg/10 font-semibold text-neg' : 'border-warn bg-warn-soft text-ink-800'}`}
    >
      <span>{m.text}</span>
      {summary?.oldestWeekStart && (
        <Link href={`/share/weekly/${summary.oldestWeekStart}`} className="underline underline-offset-2">
          가장 오래된 초안 열기
        </Link>
      )}
    </div>
  );
}
