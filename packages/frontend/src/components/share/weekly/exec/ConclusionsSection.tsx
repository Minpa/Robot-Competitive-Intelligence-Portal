import type { ExecConclusion, ExecLine } from '@/types/weekly-brief';
import { EXEC_ACTION_LABELS, EXEC_NO_CONCLUSIONS, EXEC_ROLE_LABELS, editPath } from '@/lib/weekly-brief-exec';
import { domainLabel } from '@/lib/weekly-brief-format';
import { Badge, CARD_CLASS, EvidenceChips } from '../report/shared';
import { EditableLine } from './EditableLine';

/** 줄 목록 — change/why/action 의 첫 줄에만 역할 라벨(무엇이 바뀌었나, 왜 중요한가, 그래서 무엇을)을 붙인다 */
function ConclusionLines({ c }: { c: ExecConclusion }) {
  const seen = new Set<ExecLine['role']>();
  return (
    <div className="mt-3 grid gap-2.5" data-testid="conclusion-lines">
      {c.lines.map((l, i) => {
        const first = !seen.has(l.role);
        seen.add(l.role);
        const label = first ? EXEC_ROLE_LABELS[l.role] : '';
        return (
          <div key={i} className="exec-line grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-[120px_1fr]" data-role={l.role}>
            <span className="text-[12px] font-bold tracking-[0.02em] text-poster-fg-2">{label}</span>
            <p className="report-para m-0 text-[15px] leading-[1.78] text-poster-fg sm:text-[16px]">
              <EditableLine path={editPath.conclusionLine(c.id, i)} text={l.text} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ConclusionsSection({ conclusions }: { conclusions: readonly ExecConclusion[] }) {
  if (conclusions.length === 0) {
    return (
      <p className="m-0 text-[15px] leading-[1.7] text-poster-fg-2" data-testid="conclusions-empty">
        {EXEC_NO_CONCLUSIONS}
      </p>
    );
  }
  return (
    <ol className="m-0 list-none p-0" data-testid="conclusions">
      {conclusions.map((c, i) => {
        const dom = domainLabel(c.domain);
        const action = EXEC_ACTION_LABELS[c.actionKind];
        return (
          <li key={c.id} className={`${CARD_CLASS} exec-conclusion`} data-testid="conclusion">
            <div className="flex items-start gap-3">
              <span className="text-[26px] font-black leading-none text-poster-fg" aria-label={`결론 ${i + 1}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-[18px] font-extrabold leading-snug sm:text-[20px]">
                  <EditableLine path={editPath.conclusionHeadline(c.id)} text={c.headline} />
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {dom && <Badge>{dom}</Badge>}
                  {action && <Badge>{action}</Badge>}
                  {c.generatedBy === 'rule' && <Badge>규칙 기반</Badge>}
                </div>
              </div>
            </div>
            <ConclusionLines c={c} />
            <EvidenceChips list={c.evidence} />
          </li>
        );
      })}
    </ol>
  );
}
