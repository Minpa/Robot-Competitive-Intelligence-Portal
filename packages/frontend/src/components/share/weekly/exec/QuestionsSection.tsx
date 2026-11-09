import type { ExecQuestion } from '@/types/weekly-brief';
import { EXEC_QUESTION_KIND_LABELS, editPath } from '@/lib/weekly-brief-exec';
import { Badge, CARD_CLASS } from '../report/shared';
import { ExecEvidence } from './ExecEvidence';
import { EditableLine } from './EditableLine';

/** 확인이 필요해 보이는 사항 — 번호, 확인 제안 한 문장(~볼 필요가 있을 것 같습니다 등), 이유(알려진 것·아직 모르는 것), 근거 */
export function QuestionsSection({ questions }: { questions: readonly ExecQuestion[] }) {
  return (
    <ol className="m-0 list-none p-0" data-testid="questions">
      {questions.map((q, i) => (
        <li key={q.id} className={`${CARD_CLASS} exec-question`} data-testid="question">
          <div className="flex items-start gap-3">
            <span className="text-[26px] font-black leading-none" aria-label={`질문 ${i + 1}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 break-words text-[17px] font-extrabold leading-snug sm:text-[19px]">
                <EditableLine path={editPath.questionText(q.id)} text={q.text} />
              </h3>
              <div className="mt-1.5">
                <Badge>{EXEC_QUESTION_KIND_LABELS[q.kind] ?? q.kind}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5">
            {q.rationale.map((r, j) => (
              <p key={j} className="report-para m-0 text-[15px] leading-[1.75] text-poster-fg sm:text-[16px]">
                <EditableLine path={editPath.questionRationale(q.id, j)} text={r} />
              </p>
            ))}
          </div>
          <ExecEvidence list={q.evidence} />
        </li>
      ))}
    </ol>
  );
}
