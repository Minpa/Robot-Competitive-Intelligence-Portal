import type { WeeklyBriefHeader } from '@/types/weekly-brief';
import { REPORT_LABELS, buildCoverStats, formatReadingTime } from '@/lib/weekly-brief-report';
import { formatWeekTitle } from '@/lib/weekly-brief-format';
import { DashShort, PosterTopBar } from '../PosterSections';

/** 커버 — 중립 타이틀(AI 종합 문장 없음) + 읽는 시간 + 수치 카드(건수와 전주 대비, ▲▼ 기호와 문구 병기) */
export function ReportCover({ header, readingMinutes }: { header: WeeklyBriefHeader; readingMinutes: number }) {
  const stats = buildCoverStats(header.counts, header.deltas);
  const reading = formatReadingTime(readingMinutes);
  return (
    <>
      <PosterTopBar generatedAt={header.generatedAt} />
      <header className="report-card px-5 pb-[22px] pt-7 text-center sm:pt-[34px]" data-testid="report-cover">
        <div className="text-[11px] uppercase tracking-[0.2em] text-poster-fg-3">Weekly Brief · Week {header.weekNumber}</div>
        <DashShort />
        <h1 className="m-0 mt-[10px] text-[30px] leading-[1.1] tracking-[-0.01em] sm:text-[40px]">
          <b className="font-black">{REPORT_LABELS.cover}</b>
          <br />
          <span className="block text-[22px] font-light sm:text-[40px]">{formatWeekTitle(header.weekStart, header.weekEnd, header.weekNumber)}</span>
        </h1>
        <DashShort />
        <p className="m-0 mt-1 text-[13px] text-poster-fg-2" data-testid="reading-time">
          {reading}
        </p>
        <div className="mt-[18px] grid grid-cols-2 gap-2.5 text-center sm:grid-cols-3" data-testid="weekly-stats">
          {stats.map((s) => (
            <div key={s.label} className="bg-poster-card px-2 py-2.5 text-poster-fg">
              <div className="text-[12px] text-poster-fg-2">{s.label}</div>
              <div className="mt-0.5 text-[24px] font-black leading-tight">{s.value}</div>
              <div className="mt-0.5 text-[12px] text-poster-fg-2">{s.deltaPhrase}</div>
            </div>
          ))}
        </div>
      </header>
    </>
  );
}
