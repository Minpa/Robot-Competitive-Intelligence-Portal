import type { WeeklyHighlight } from '@/types/weekly-brief';
import { CARD_CLASS, EvidenceChips, Para } from './shared';

/** 증감 표기: 부호를 ▲▼ 기호로 바꿔 색에 의존하지 않고 읽히게 한다 */
export function deltaDisplay(d: { value: string; unit: string; label: string }): string {
  const raw = d.value.trim();
  const sign = raw.startsWith('-') ? '▼' : raw.startsWith('+') ? '▲' : raw === '0' || raw === '0.0' ? '±' : '';
  return `${d.label} ${sign}${raw.replace(/^[+-]/, '')}${d.unit}`;
}

export function HighlightsSection({ highlights }: { highlights: readonly WeeklyHighlight[] }) {
  return (
    <div data-testid="highlights">
      {highlights.map((h, i) => (
        <article key={h.id} className={CARD_CLASS}>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-poster-3 text-[14px] font-extrabold text-poster-fg" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="m-0 text-[18px] font-extrabold leading-snug">{h.headline}</h3>
          </div>
          {h.figure && (
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1" data-testid="highlight-figure">
              <span className="inline-flex items-baseline gap-0.5">
                <span className="text-[34px] font-black leading-[1.1] tracking-[-0.02em]">{h.figure.value}</span>
                {h.figure.unit && <span className="text-[16px] font-bold">{h.figure.unit}</span>}
              </span>
              <span className="text-[13px] text-poster-fg-2">{h.figure.caption}</span>
              {h.figure.delta && <span className="bg-poster-3 px-2 py-px text-[13px] font-bold text-poster-fg">{deltaDisplay(h.figure.delta)}</span>}
            </div>
          )}
          <Para>{h.body}</Para>
          <p className="m-0 text-[12.5px] text-poster-fg-2">{h.basis}</p>
          <EvidenceChips list={h.evidence} />
        </article>
      ))}
    </div>
  );
}
