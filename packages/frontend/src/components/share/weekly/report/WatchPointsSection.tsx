import type { WeeklyWatchPoint } from '@/types/weekly-brief';
import { CARD_CLASS, EvidenceChips, Para } from './shared';

export function WatchPointsSection({ points }: { points: readonly WeeklyWatchPoint[] }) {
  return (
    <div data-testid="watch-points">
      {points.map((w) => (
        <article key={w.id} className={CARD_CLASS}>
          <h3 className="m-0 text-[18px] font-extrabold leading-snug">{w.title}</h3>
          <Para>{w.body}</Para>
          <EvidenceChips list={w.evidence} />
        </article>
      ))}
    </div>
  );
}
