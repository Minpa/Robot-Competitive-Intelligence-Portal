import type { WeeklyBriefHeader } from '@/types/weekly-brief';
import { EXEC_LABELS, formatExecReadingTime, type PublishBadgeTone } from '@/lib/weekly-brief-exec';
import { formatWeekTitle } from '@/lib/weekly-brief-format';
import { DashShort, PosterTopBar } from '../PosterSections';

const BADGE_CLASS: Record<PublishBadgeTone, string> = {
  draft: 'border-yellow-200 bg-poster-3 text-yellow-100',
  pending: 'border-yellow-200 bg-poster-3 text-yellow-100',
  published: 'border-white/60 bg-poster-3 text-poster-fg',
};

/** 표지 — 제목·기간·읽는 시간·한 줄 요약(첫 결론). 수치 카드 없음. 관리자에게만 발행 상태 배지 */
export function ExecCover({
  header,
  readingMinutes,
  oneLiner,
  badge,
}: {
  header: WeeklyBriefHeader;
  readingMinutes: number;
  oneLiner: string | null;
  badge?: { label: string; tone: PublishBadgeTone } | null;
}) {
  return (
    <>
      <PosterTopBar generatedAt={header.generatedAt} />
      <header className="report-card px-5 pb-[22px] pt-7 text-center sm:pt-[34px]" data-testid="exec-cover">
        <div className="text-[11px] uppercase tracking-[0.2em] text-poster-fg-3">Weekly Brief · Week {header.weekNumber}</div>
        <DashShort />
        <h1 className="m-0 mt-[10px] text-[30px] leading-[1.1] tracking-[-0.01em] sm:text-[40px]">
          <b className="font-black">{EXEC_LABELS.cover}</b>
          <br />
          <span className="block text-[22px] font-light sm:text-[40px]">{formatWeekTitle(header.weekStart, header.weekEnd, header.weekNumber)}</span>
        </h1>
        <DashShort />
        <p className="m-0 mt-1 text-[13px] text-poster-fg-2" data-testid="reading-time">
          {formatExecReadingTime(readingMinutes)}
        </p>
        {oneLiner && (
          <p className="m-0 mx-auto mt-3 max-w-[560px] break-words text-[16px] font-bold leading-snug sm:text-[18px]" data-testid="exec-oneliner">
            {oneLiner}
          </p>
        )}
        {badge && (
          <p className="no-print m-0 mt-3" data-testid="publish-badge">
            <span className={`inline-block border px-2.5 py-0.5 text-[12.5px] font-bold ${BADGE_CLASS[badge.tone]}`}>{badge.label}</span>
          </p>
        )}
      </header>
    </>
  );
}
