import type { WeeklyArticleItem } from '@/types/weekly-brief';
import { domainLabel, formatKstMonthDay, safeArticleHref } from '@/lib/weekly-brief-format';
import { BandSection, MaybeLink } from './PosterSections';

export function ArticleList({ articles }: { articles: WeeklyArticleItem[] }) {
  return (
    <BandSection title="주요 기사" subtitle="상위 12 · 출처 다양성 반영 · 제목 클릭 시 원문">
      <ul className="m-0 list-none p-0" data-testid="article-list">
        {articles.map((a) => {
          const badge = domainLabel(a.domain);
          const md = formatKstMonthDay(a.publishedAt);
          return (
            <li
              key={a.id}
              className="poster-row grid grid-cols-1 gap-x-3 gap-y-1 border-t border-dashed border-white/[0.28] py-2 text-[13px] first:border-t-0 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0 break-words">
                {badge && <span className="mr-1 inline-block bg-poster-3 px-[6px] text-[11px] font-bold">{badge}</span>}
                <MaybeLink href={safeArticleHref(a.url)} className="hover:underline">
                  {a.title}
                </MaybeLink>
                {a.summaryLine && <span className="mt-[2px] block text-[12px] text-poster-fg-2">{a.summaryLine}</span>}
              </div>
              <div className="text-[12px] text-poster-fg-2 sm:whitespace-nowrap">
                {a.source}
                {md && ` · ${md}`}
              </div>
            </li>
          );
        })}
      </ul>
    </BandSection>
  );
}
