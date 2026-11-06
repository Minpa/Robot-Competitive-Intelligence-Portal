import type { ExecTech, ExecTechSignal } from '@/types/weekly-brief';
import { EXEC_ACCUMULATING_NOTE, EXEC_NO_SIGNALS, directionGlyph, directionLabel, editPath } from '@/lib/weekly-brief-exec';
import { domainLabel } from '@/lib/weekly-brief-format';
import { Badge, CARD_CLASS, EvidenceChips } from '../report/shared';
import { EditableLine } from './EditableLine';
import { Sparkline } from './Sparkline';

function shareLine(s: ExecTechSignal): string {
  const unit = s.kind === 'procurement' ? '건' : '%';
  if (s.recent === null || s.prior === null) return '';
  const rel = s.relChangePct !== null ? ` (상대 ${s.relChangePct >= 0 ? '+' : ''}${s.relChangePct}%)` : '';
  return `최근 4주 ${s.recent}${unit} · 이전 4주 ${s.prior}${unit}${rel}`;
}

export function TechSignalCard({ s, index }: { s: ExecTechSignal; index: number }) {
  const dom = domainLabel(s.domain);
  return (
    <li className={`${CARD_CLASS} exec-signal`} data-testid="tech-signal" data-direction={s.direction}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[22px] font-black leading-none" aria-label={`흐름 ${index + 1}`}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 break-words text-[17px] font-extrabold leading-snug">{s.label}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 border border-white/60 bg-poster-3 px-2 py-0.5 text-[12.5px] font-bold text-poster-fg" data-testid="signal-direction">
              <span aria-hidden="true">{directionGlyph(s.direction)}</span>
              {directionLabel(s.direction)}
            </span>
            {dom && <Badge>{dom}</Badge>}
          </div>
        </div>
        <Sparkline label={s.label} series={s.series} isCount={s.kind === 'procurement'} />
      </div>
      {shareLine(s) && <p className="m-0 mt-2 text-[12.5px] text-poster-fg-2">{shareLine(s)}</p>}
      <div className="mt-3 grid gap-1.5">
        {s.lines.map((l, i) => (
          <p key={i} className="report-para m-0 text-[15px] leading-[1.75] sm:text-[16px]">
            <EditableLine path={editPath.techLine(s.id, i)} text={l} />
          </p>
        ))}
      </div>
      <EvidenceChips list={s.evidence} />
    </li>
  );
}

export function TechSection({ tech }: { tech: ExecTech }) {
  return (
    <div data-testid="tech">
      {tech.signals.length === 0 ? (
        <p className="m-0 text-[15px] leading-[1.7] text-poster-fg-2" data-testid="tech-empty">
          {EXEC_NO_SIGNALS}
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {tech.signals.map((s, i) => (
            <TechSignalCard key={s.id} s={s} index={i} />
          ))}
        </ol>
      )}
      {tech.procurement.state === 'accumulating' && (
        <p className="m-0 mt-2 text-[12.5px] text-poster-fg-2" data-testid="procurement-accumulating">
          {EXEC_ACCUMULATING_NOTE} (조달 통계 스냅샷 {tech.procurement.snapshots}개 · 2개 이상 쌓이면 비교합니다)
        </p>
      )}
    </div>
  );
}
