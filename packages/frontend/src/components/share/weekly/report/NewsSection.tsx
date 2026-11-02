import type { WeeklyReportArticle } from '@/types/weekly-brief';
import { domainLabel, formatKstMonthDay, safeArticleHref } from '@/lib/weekly-brief-format';
import { Badge, TitleBlock } from './shared';

export function NewsSection({ articles }: { articles: readonly WeeklyReportArticle[] }) {
  return (
    <ul className="m-0 list-none p-0" data-testid="news">
      {articles.map((a) => {
        const md = a.publishedAt ? formatKstMonthDay(a.publishedAt) : '';
        const dom = domainLabel(a.domain);
        return (
          <li key={a.id} className="report-card grid grid-cols-1 gap-x-3.5 gap-y-1 border-t border-dashed border-white/[0.28] py-3 first:border-t-0 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              {dom && <Badge>{dom}</Badge>}
              <h3 className="m-0 text-[16px] font-extrabold leading-snug">
                <TitleBlock title={a.title} titleKo={a.titleKo} href={safeArticleHref(a.url)} />
              </h3>
              {a.summaryLines.length > 0 && (
                <ul className="m-0 mt-1.5 grid list-none gap-1 p-0">
                  {a.summaryLines.map((s) => (
                    <li key={s} className="relative pl-3 text-[14.5px] leading-[1.6] before:absolute before:left-0.5 before:content-['·']">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="break-words text-[12.5px] text-poster-fg-2 sm:whitespace-nowrap">{[a.source, md].filter(Boolean).join(' · ')}</div>
          </li>
        );
      })}
    </ul>
  );
}
