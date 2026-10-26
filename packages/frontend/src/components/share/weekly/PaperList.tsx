import type { WeeklyPaperItem } from '@/types/weekly-brief';
import { PAPERS_BAND_TITLE, domainLabel, formatKstMonthDay, papersBandSubtitle, safePaperHref } from '@/lib/weekly-brief-format';
import { BandSection, MaybeLink } from './PosterSections';

/** 이번 주 논문 — arXiv 상위 N. 링크는 safePaperHref(https + arxiv.org)를 통과한 값만 */
export function PaperList({ papers }: { papers: WeeklyPaperItem[] }) {
  return (
    <BandSection title={PAPERS_BAND_TITLE} subtitle={papersBandSubtitle(papers.length)}>
      <ul className="m-0 list-none p-0" data-testid="paper-list">
        {papers.map((a) => {
          const badge = domainLabel(a.domain);
          const md = formatKstMonthDay(a.publishedAt);
          return (
            <li
              key={a.id}
              className="poster-row grid grid-cols-1 gap-x-3 gap-y-1 border-t border-dashed border-white/[0.28] py-2 text-[13px] first:border-t-0 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0 break-words">
                {badge && <span className="mr-1 inline-block bg-poster-3 px-[6px] text-[11px] font-bold">{badge}</span>}
                <MaybeLink href={safePaperHref(a.url)} className="hover:underline">
                  {a.title}
                </MaybeLink>
                {a.authors && <span className="mt-[2px] block text-[11.5px] text-poster-fg-3">{a.authors}</span>}
                {a.summaryLine && <span className="mt-[2px] block text-[12px] text-poster-fg-2">{a.summaryLine}</span>}
              </div>
              <div className="text-[12px] text-poster-fg-2 sm:whitespace-nowrap">
                arXiv
                {md && ` · ${md}`}
              </div>
            </li>
          );
        })}
      </ul>
    </BandSection>
  );
}
