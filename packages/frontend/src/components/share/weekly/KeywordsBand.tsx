import type { WeeklyKeyword } from '@/types/weekly-brief';
import { keywordDeltaText, keywordHero } from '@/lib/weekly-brief-format';
import { BandSection } from './PosterSections';

export function KeywordsBand({ keywords }: { keywords: WeeklyKeyword[] }) {
  const rep = keywords[0];
  const hero = keywordHero(rep);
  const chips = keywords.slice(1, 8);
  return (
    <BandSection title="키워드 흐름" subtitle="주간 키워드 증감">
      <div className="text-center" data-testid="keywords">
        <div className="mb-1 mt-[10px] text-[38px] font-black leading-none tracking-[-0.02em] break-words sm:text-[46px]">
          {rep.term} <small className="ml-1 text-[18px] font-bold">{hero.value}{hero.unit}</small>
        </div>
        <div className="text-[12px] text-poster-fg-2">{hero.caption}</div>
        {chips.length > 0 && (
          <div className="mt-[10px] flex flex-wrap justify-center gap-2">
            {chips.map((k) => (
              <span key={k.keywordId} className="rounded-full border border-white/[0.28] px-3 py-1 text-[12px]">
                {k.term}
                <b className="ml-[6px]">{keywordDeltaText(k)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </BandSection>
  );
}
