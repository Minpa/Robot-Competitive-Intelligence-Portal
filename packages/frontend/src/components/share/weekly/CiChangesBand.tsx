import type { WeeklyBriefPayload } from '@/types/weekly-brief';
import { safeArticleHref } from '@/lib/weekly-brief-format';
import { BandSection, ExtLink } from './PosterSections';

export function CiChangesBand({ changes, summary }: { changes: WeeklyBriefPayload['ciChanges']; summary: WeeklyBriefPayload['ciSummary'] }) {
  return (
    <BandSection title="CI 변화" subtitle={`이번 주 경쟁사 정보 ${summary.updates}건 갱신 · ${summary.companies}개사`}>
      <div className={`grid grid-cols-1 gap-[22px] ${changes.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {changes.map((c) => {
          const href = safeArticleHref(c.sourceUrl);
          const long = Array.from(c.after).length > 40;
          return (
            <div key={c.id} className="px-1 py-[6px] text-center" data-testid="ci-item">
              <p className="m-0 text-[14.5px] text-poster-fg-2 break-words">
                {c.company} {c.item}
              </p>
              <div className={`mb-1 mt-[10px] font-black tracking-[-0.02em] break-words ${long ? 'text-[20px] leading-[1.25]' : 'text-[28px] leading-[1.2]'}`}>
                {c.after}
              </div>
              {c.before && <div className="text-[12px] text-poster-fg-2 break-words">이전: {c.before}</div>}
              <div className="mt-2 text-[12px] text-poster-fg-2">
                신뢰도 {c.confidence}
                {href ? (
                  <>
                    {' · '}
                    <ExtLink href={href} className="underline decoration-dotted underline-offset-2">
                      출처 ↗
                    </ExtLink>
                  </>
                ) : (
                  c.sourceName && ` · ${c.sourceName}`
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BandSection>
  );
}
