import type { WeeklyReportPaper } from '@/types/weekly-brief';
import { REPORT_WHY_LABEL } from '@/lib/weekly-brief-report';
import { domainLabel, formatKstMonthDay, safePaperHref } from '@/lib/weekly-brief-format';
import { Badge, CARD_CLASS, TitleBlock } from './shared';

export function PapersSection({ papers }: { papers: readonly WeeklyReportPaper[] }) {
  return (
    <div data-testid="papers">
      {papers.map((x) => {
        const md = x.publishedAt ? formatKstMonthDay(x.publishedAt) : '';
        const dom = domainLabel(x.domain);
        return (
          <article key={x.id} className={CARD_CLASS}>
            {dom && <Badge>{dom}</Badge>}
            <h3 className="m-0 mt-1 text-[17px] font-extrabold leading-snug sm:text-[18px]">
              <TitleBlock title={x.title} titleKo={x.titleKo} href={safePaperHref(x.url)} />
            </h3>
            <p className="m-0 mt-1 break-words text-[12.5px] text-poster-fg-2">{[x.authors, 'arXiv', md].filter(Boolean).join(' · ')}</p>
            {x.summaryLines.length > 0 && (
              <ul className="m-0 mt-2 grid list-none gap-1 p-0">
                {x.summaryLines.map((s) => (
                  <li key={s} className="relative pl-3 text-[14.5px] leading-[1.6] before:absolute before:left-0.5 before:content-['·']">
                    {s}
                  </li>
                ))}
              </ul>
            )}
            {x.whyItMatters && (
              <p className="m-0 mt-2 bg-poster-2 px-2.5 py-2 text-[14px] text-poster-fg">
                <b className="mb-0.5 block text-[12px] tracking-[0.04em] text-poster-fg-2">{REPORT_WHY_LABEL}</b>
                {x.whyItMatters}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
