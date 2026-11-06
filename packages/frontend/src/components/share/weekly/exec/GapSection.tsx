import type { ExecGaps, ExecGapRow } from '@/types/weekly-brief';
import {
  EXEC_NO_GAPS,
  EXEC_OURS_MISSING_BADGE,
  coverageLine,
  editPath,
  formatGapDiff,
  gapMovementBadge,
  gapPositionBadge,
  gapTone,
  gapWho,
  type GapTone,
} from '@/lib/weekly-brief-exec';
import { CARD_CLASS, EvidenceChips } from '../report/shared';
import { EditableLine } from './EditableLine';

const TONE_GLYPH: Record<GapTone, string> = { ahead: '▲', we: '▼', parity: '＝', missing: '?' };
const TONE_CLASS: Record<GapTone, string> = {
  ahead: 'border-white bg-poster-3 text-poster-fg',
  we: 'border-white/70 bg-poster-card text-poster-fg',
  parity: 'border-white/50 bg-poster-card text-poster-fg',
  missing: 'border-dashed border-white/60 bg-poster-card text-poster-fg',
};

function ValueCell({ label, value, sub, missing }: { label: string; value: string; sub?: string | null; missing?: boolean }) {
  return (
    <div className="min-w-0 bg-poster-3 px-3 py-2" data-testid={missing ? 'gap-ours-missing' : undefined}>
      <div className="text-[12px] text-poster-fg">{label}</div>
      <div className={`mt-0.5 break-words text-[18px] font-black leading-tight ${missing ? 'text-[15px] font-bold' : ''}`}>{value}</div>
      {sub && <div className="mt-0.5 break-words text-[12px] text-poster-fg">{sub}</div>}
    </div>
  );
}

/** 격차 행 카드 — 경쟁사값 · 우리값(미등록이면 안내) · 차이 · 방향·변화 배지 · 서술 · 근거. 좁은 화면에서는 세로 배치 */
export function GapRowCard({ row, index }: { row: ExecGapRow; index: number }) {
  const tone = gapTone(row);
  const move = gapMovementBadge(row);
  const cv = row.competitorValue;
  const missing = row.status !== 'compared' || !row.ourValue;
  return (
    <li className={`${CARD_CLASS} exec-gap`} data-testid="gap-row" data-tone={tone}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="text-[22px] font-black leading-none" aria-label={`격차 ${index + 1}`}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 break-words text-[17px] font-extrabold leading-snug">
            {gapWho(row)} · {row.axisLabel}
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
      <div className="exec-gap-values mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ValueCell label="경쟁사" value={cv.display} sub={[cv.grade ? `신뢰도 ${cv.grade}` : '', cv.asOf ?? ''].filter(Boolean).join(' · ') || null} />
        {missing ? (
          <ValueCell label="우리" value={EXEC_OURS_MISSING_BADGE} sub="비교 수치를 만들지 않았습니다" missing />
        ) : (
          <ValueCell label={`우리${row.ourRef ? ` (${row.ourRef})` : ''}`} value={row.ourValue!.display} sub={row.ourValue!.asOf} />
        )}
        <ValueCell label="차이" value={missing ? '–' : formatGapDiff(row) || '–'} sub={row.prevCompetitorValue !== null ? `직전 경쟁사값 ${row.prevCompetitorValue}` : null} />
      </div>
      <div className="mt-3 grid gap-1.5">
        {row.lines.map((l, i) => (
          <p key={i} className="report-para m-0 text-[15px] leading-[1.75] sm:text-[16px]">
            <EditableLine path={editPath.gapRowLine(row.id, i)} text={l} />
          </p>
        ))}
      </div>
      <EvidenceChips list={row.evidence} />
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
