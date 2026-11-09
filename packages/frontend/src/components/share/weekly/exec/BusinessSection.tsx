import type { ExecBusiness, ExecFactChip } from '@/types/weekly-brief';
import { EXEC_BUSINESS_CATEGORY_LABELS, businessCategoryExplain, editPath } from '@/lib/weekly-brief-exec';
import { Badge, CARD_CLASS } from '../report/shared';
import { ExecEvidence } from './ExecEvidence';
import { EditableLine } from './EditableLine';

function Chip({ c }: { c: ExecFactChip }) {
  return (
    <li className="min-w-0 bg-poster-3 px-3 py-2 text-poster-fg" data-testid="fact-chip">
      <div className="text-[12px]">{c.label}</div>
      <div className="mt-0.5 break-words text-[17px] font-black leading-tight">{c.value}</div>
      {c.note && <div className="mt-0.5 break-words text-[12px]">{c.note}</div>}
    </li>
  );
}

export function BusinessSection({ business }: { business: ExecBusiness }) {
  return (
    <div data-testid="business">
      {business.picture.length > 0 && (
        <>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2" data-testid="business-picture">
            {business.picture.map((c) => (
              <Chip key={c.label} c={c} />
            ))}
          </ul>
          {business.asOf && <p className="m-0 mt-1.5 text-[12.5px] text-poster-fg-2">현재 등록 현황 기준 · 기준일 {business.asOf}</p>}
        </>
      )}
      {business.moves.length > 0 && (
        <ol className="m-0 mt-2 list-none p-0">
          {business.moves.map((m, i) => (
            <li key={m.id} className={`${CARD_CLASS} exec-move`} data-testid="business-move">
              <div className="flex items-start gap-3">
                <span className="text-[22px] font-black leading-none" aria-label={`동향 ${i + 1}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 break-words text-[17px] font-extrabold leading-snug">
                    {m.company}
                    {m.vendor ? ` · ${m.vendor}` : ''}
                  </h3>
                  <div className="mt-1">
                    <Badge>{EXEC_BUSINESS_CATEGORY_LABELS[m.category] ?? m.category}</Badge>
                  </div>
                  {businessCategoryExplain(m.category) && (
                    <p className="m-0 mt-1 text-[12.5px] leading-[1.6] text-poster-fg-2" data-testid="business-category-explain">
                      {businessCategoryExplain(m.category)}
                    </p>
                  )}
                </div>
              </div>
              {m.facts.length > 0 && (
                <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                  {m.facts.map((c) => (
                    <Chip key={c.label} c={c} />
                  ))}
                </ul>
              )}
              <div className="mt-3 grid gap-1.5">
                {m.lines.map((l, j) => (
                  <p key={j} className="report-para m-0 text-[15px] leading-[1.75] sm:text-[16px]">
                    <EditableLine path={editPath.businessLine(m.id, j)} text={l} />
                  </p>
                ))}
              </div>
              <ExecEvidence list={m.evidence} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
