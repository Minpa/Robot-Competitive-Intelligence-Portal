import type { ExecGaps, ExecGapRow } from '@/types/weekly-brief';
import {
  EXEC_NO_GAPS,
  coverageLine,
  editPath,
  gapAxisExplain,
  gapCompareLine,
  gapHeadline,
  gapMovementBadge,
  gapPositionBadge,
  gapTone,
  type GapTone,
} from '@/lib/weekly-brief-exec';
import { CARD_CLASS } from '../report/shared';
import { EditableLine } from './EditableLine';
import { ExecEvidence } from './ExecEvidence';

const TONE_GLYPH: Record<GapTone, string> = { ahead: '▲', we: '▼', parity: '＝', missing: '?' };
const TONE_CLASS: Record<GapTone, string> = {
  ahead: 'border-white bg-poster-3 text-poster-fg',
  we: 'border-white/70 bg-poster-card text-poster-fg',
  parity: 'border-white/50 bg-poster-card text-poster-fg',
  missing: 'border-dashed border-white/60 bg-poster-card text-poster-fg',
};

/**
 * 차이 카드 — 한 편의 짧은 글처럼 읽힌다.
 * (1) 제목 줄 사실 문장 (2) 비교 한 줄(제품명·단위·차이·방향) (3) 축 설명 한 줄 (4) 서술 (5) 근거(영상 썸네일 포함).
 * 축 키·id·등급 코드는 화면에 쓰지 않는다.
 */
export function GapRowCard({ row, index }: { row: ExecGapRow; index: number }) {
  const tone = gapTone(row);
  const move = gapMovementBadge(row);
  const compare = gapCompareLine(row);
  const explain = gapAxisExplain(row);
  return (
    <li className={`${CARD_CLASS} exec-gap`} data-testid="gap-row" data-tone={tone}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="text-[22px] font-black leading-none" aria-label={`차이 ${index + 1}`}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 break-words text-[17px] font-extrabold leading-snug" data-testid="gap-headline">
            {gapHeadline(row)}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[12.5px] font-bold ${TONE_CLASS[tone]}`} data-testid="gap-position">
              <span aria-hidden="true">{TONE_GLYPH[tone]}</span>
              {gapPositionBadge(row)}
            </span>
            {move && (
              <span className="inline-flex items-center border border-white/40 bg-poster-card px-2 py-0.5 text-[12.5px] text-poster-fg" data-testid="gap-movement">
                {move}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="m-0 mt-3 break-words bg-poster-3 px-3 py-2 text-[14.5px] font-bold leading-[1.6] text-poster-fg" data-testid={compare.missing ? 'gap-ours-missing' : 'gap-compare'}>
        {compare.text}
      </p>
      {explain && (
        <p className="m-0 mt-1.5 break-words text-[12.5px] leading-[1.6] text-poster-fg-2" data-testid="gap-axis-explain">
          {explain}
        </p>
      )}
      <div className="mt-3 grid gap-1.5">
        {row.lines.map((l, i) => (
          <p key={i} className="report-para m-0 text-[15px] leading-[1.75] sm:text-[16px]">
            <EditableLine path={editPath.gapRowLine(row.id, i)} text={l} />
          </p>
        ))}
      </div>
      <ExecEvidence list={row.evidence} />
    </li>
  );
}

export function GapSection({ gaps }: { gaps: ExecGaps }) {
  return (
    <div data-testid="gaps">
      {gaps.summary.length > 0 && (
        <div className="grid gap-1.5" data-testid="gap-summary">
          {gaps.summary.map((s, i) => (
            <p key={i} className="report-para m-0 text-[15px] leading-[1.78] sm:text-[16px]">
              <EditableLine path={editPath.gapSummary(i)} text={s} />
            </p>
          ))}
        </div>
      )}
      {gaps.rows.length === 0 ? (
        <p className="m-0 mt-2 text-[15px] leading-[1.7] text-poster-fg-2" data-testid="gaps-empty">
          {EXEC_NO_GAPS}
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {gaps.rows.map((r, i) => (
            <GapRowCard key={r.id} row={r} index={i} />
          ))}
        </ol>
      )}
      <p className="m-0 mt-3 break-words text-[12.5px] leading-relaxed text-poster-fg-2" data-testid="gap-coverage">
        {coverageLine(gaps.coverage)}
      </p>
    </div>
  );
}
