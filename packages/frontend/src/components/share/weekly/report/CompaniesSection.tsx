import type { WeeklyCompany } from '@/types/weekly-brief';
import { companyCountLine } from '@/lib/weekly-brief-report';
import { formatKstMonthDay, safeArticleHref } from '@/lib/weekly-brief-format';
import { ExtLink } from '../PosterSections';
import { CARD_CLASS, EvidenceCardList, Para } from './shared';

export function CompaniesSection({ companies, otherCi }: { companies: readonly WeeklyCompany[]; otherCi: number }) {
  return (
    <div data-testid="companies">
      {companies.map((c) => (
        <article key={c.id} className={CARD_CLASS}>
          <h3 className="m-0 text-[18px] font-extrabold">{c.name}</h3>
          <p className="m-0 mt-1 text-[12.5px] text-poster-fg-2">{companyCountLine(c)}</p>
          <Para>{c.blurb}</Para>
          <EvidenceCardList cards={c.items} />
          {c.ciChanges.map((k) => {
            const src = safeArticleHref(k.sourceUrl);
            return (
              <div key={k.id} className="report-card mt-2.5 bg-poster-2 px-3 py-2.5" data-testid="company-ci">
                <div className="text-[14px] font-bold">
                  {k.item}
                  {k.layer && <span className="ml-1 text-[12.5px] font-normal text-poster-fg-2">({k.layer})</span>}
                </div>
                <div className="mt-1 break-words text-[15px]">
                  {k.before && (
                    <>
                      <span>{k.before}</span>
                      <span className="px-1.5" aria-hidden="true">
                        →
                      </span>
                    </>
                  )}
                  <b>{k.after}</b>
                </div>
                {k.meaning && <p className="m-0 mt-1 text-[14px] text-poster-fg-2">{k.meaning}</p>}
                <div className="mt-1 break-words text-[12.5px] text-poster-fg-2">
                  신뢰도 {k.confidence}
                  {(src || k.sourceName) && ' · '}
                  {src ? <ExtLink href={src} className="underline underline-offset-2">출처 ↗</ExtLink> : k.sourceName}
                  {formatKstMonthDay(k.changedAt) && ` · ${formatKstMonthDay(k.changedAt)}`}
                </div>
              </div>
            );
          })}
        </article>
      ))}
      {otherCi > 0 && <p className="m-0 mt-1.5 text-[13.5px] text-poster-fg-2">그 외 CI 갱신 {otherCi}건</p>}
    </div>
  );
}
