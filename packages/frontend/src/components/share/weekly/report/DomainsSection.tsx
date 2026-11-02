import type { WeeklyDomainBlock } from '@/types/weekly-brief';
import { DOMAIN_BLOCK_IDS, REPORT_QUIET_LINE, domainFigureLine, quietCountLine } from '@/lib/weekly-brief-report';
import { EvidenceCardList, Para } from './shared';

function DomainBlock({ d }: { d: WeeklyDomainBlock }) {
  const id = DOMAIN_BLOCK_IDS[d.key];
  if (d.status !== 'active') {
    return (
      <article id={id} className="report-card scroll-mt-28 border-t border-dashed border-white/[0.28] pb-2.5 pt-1.5 first:border-t-0" data-testid="domain-quiet">
        <h3 className="m-0 text-[18px] font-extrabold">{d.label}</h3>
        <p className="m-0 mt-1.5 text-[15px] text-poster-fg">{REPORT_QUIET_LINE}</p>
        <p className="m-0 mt-1.5 text-[13.5px] text-poster-fg-2">{quietCountLine(d)}</p>
      </article>
    );
  }
  return (
    <article id={id} className="scroll-mt-28 border-t border-dashed border-white/[0.28] pb-2.5 pt-1.5 first:border-t-0" data-testid="domain-active">
      <h3 className="m-0 text-[18px] font-extrabold">{d.label}</h3>
      <p className="m-0 mt-1.5 text-[13.5px] text-poster-fg-2">{domainFigureLine(d)}</p>
      {d.narrative && <Para>{d.narrative}</Para>}
      {d.topTags.length > 0 && (
        <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0" aria-label="자주 나타난 태그">
          {d.topTags.map((t) => (
            <li key={t.tag} className="rounded-full border border-white/[0.28] px-2.5 py-0.5 text-[12.5px] text-poster-fg">
              {t.tag}
              <b className="ml-1">{t.count}</b>
            </li>
          ))}
        </ul>
      )}
      <EvidenceCardList cards={d.evidence} />
    </article>
  );
}

export function DomainsSection({ domains }: { domains: readonly WeeklyDomainBlock[] }) {
  return (
    <div data-testid="domains">
      <nav className="no-print mb-2.5 flex flex-wrap gap-2" aria-label="도메인 바로가기">
        {domains.map((d) => (
          <a key={d.key} href={`#${DOMAIN_BLOCK_IDS[d.key]}`} className="rounded-full bg-poster-3 px-[11px] py-[3px] text-[13px] text-poster-fg no-underline">
            {d.label}
          </a>
        ))}
      </nav>
      {domains.map((d) => (
        <DomainBlock key={d.key} d={d} />
      ))}
    </div>
  );
}
