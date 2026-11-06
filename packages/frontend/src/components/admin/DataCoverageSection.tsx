'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CoverageMetric, CoverageSection } from '@/types/data-coverage';
import {
  DELTA_TONE_CLASS,
  SECTION_STATUS_LABELS,
  SEVERITY_BADGE_CLASS,
  SEVERITY_LABELS,
  countFailed,
  describeDelta,
  formatDenominator,
  formatMetricValue,
  formatRatio,
  formatRatioDetail,
  reasonLabel,
  sectionStatusTone,
} from '@/lib/data-coverage-view';
import DataCoverageTable from './DataCoverageTable';

/** 백필 등 후속 작업용 확장 자리 — 지금은 어떤 구현도 넘기지 않으므로 아무것도 렌더링되지 않는다 */
export type RenderMetricAction = (metricId: string) => ReactNode;

const STATUS_BADGE: Record<ReturnType<typeof sectionStatusTone>, string> = {
  ok: 'bg-pos-soft text-pos',
  warn: 'bg-warn-soft text-warn',
  error: 'bg-neg-soft text-neg',
  none: 'bg-ink-100 text-ink-600',
};

const GRID = 'md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:items-center md:gap-x-4';

export function MetricRow({ m, renderAction }: { m: CoverageMetric; renderAction?: RenderMetricAction }) {
  const failed = m.status === 'failed';
  const na = m.status === 'na';
  const delta = describeDelta(m.kind, m.delta, m.goodDirection);
  const action = renderAction ? renderAction(m.id) : null;
  const detail = formatRatioDetail(m) || formatDenominator(m);
  const reason = reasonLabel(m.reason);
  const valueText = formatMetricValue(m);
  return (
    <li className="py-3 border-t border-ink-100 first:border-t-0" data-testid={`dc-metric-${m.id}`} data-status={m.status}>
      <div className={GRID}>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-ink-800 break-words">{m.label}</div>
          {m.note && <div className="text-[11px] text-ink-500 mt-0.5 break-words">{m.note}</div>}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 md:mt-0 md:contents">
          <div className="min-w-0">
            <div className="md:hidden text-[10px] font-bold uppercase tracking-wider text-ink-400">값</div>
            {failed ? (
              <span className="inline-flex flex-wrap items-center gap-1" title={m.errorMessage ?? undefined}>
                <span className="inline-block px-2 py-0.5 rounded bg-neg-soft text-neg text-[12px] font-semibold">측정 실패</span>
                {reason && <span className="text-[11px] text-neg">({reason})</span>}
              </span>
            ) : na ? (
              <span className="text-[13px] text-ink-500">
                {valueText}
                {reason && m.reason !== 'not_logged' && <span className="text-[11px] ml-1">({reason})</span>}
              </span>
            ) : (
              <span className="text-[14px] font-semibold text-ink-900 tabular-nums break-words">{valueText}</span>
            )}
            {m.severity !== 'ok' && !failed && (
              <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_BADGE_CLASS[m.severity]}`}>{SEVERITY_LABELS[m.severity]}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="md:hidden text-[10px] font-bold uppercase tracking-wider text-ink-400">비율</div>
            <span className="text-[12px] text-ink-600 tabular-nums">
              {m.kind === 'ratio' && m.status === 'ok' ? (
                <>
                  {formatRatio(m.value as number)} <span className="text-ink-400">{detail && `(${detail})`}</span>
                </>
              ) : (
                detail || '-'
              )}
            </span>
          </div>

          <div className="min-w-0 col-span-2 md:col-span-1">
            <div className="md:hidden text-[10px] font-bold uppercase tracking-wider text-ink-400">변화</div>
            <span className={`text-[12px] tabular-nums ${DELTA_TONE_CLASS[delta.tone]}`} title={delta.label} data-testid={`dc-delta-${m.id}`}>
              {delta.text}
              {delta.tone !== 'none' && delta.tone !== 'neutral' && <span className="ml-1 text-[10px]">{delta.label}</span>}
            </span>
          </div>
        </div>

        <div className="mt-1 md:mt-0 text-[11px] flex flex-wrap items-center gap-2">
          <span className={`inline-block px-1.5 py-0.5 rounded font-semibold ${failed ? 'bg-neg-soft text-neg' : na ? 'bg-ink-100 text-ink-600' : 'bg-pos-soft text-pos'}`}>
            {failed ? '실패' : na ? '해당 없음' : '정상'}
          </span>
          {action && <span data-testid="dc-metric-action">{action}</span>}
        </div>
      </div>
      {failed && m.errorMessage && <div className="text-[11px] text-ink-500 mt-1 break-words">{m.errorMessage}</div>}
    </li>
  );
}

export default function DataCoverageSection({
  section,
  open,
  onToggle,
  renderAction,
}: {
  section: CoverageSection;
  open: boolean;
  onToggle: () => void;
  renderAction?: RenderMetricAction;
}) {
  const tone = sectionStatusTone(section.status);
  const failedCount = countFailed(section);
  const bodyId = `dc-body-${section.id}`;
  return (
    <section className="border border-ink-200 rounded-md bg-white min-w-0" data-testid={`dc-section-${section.id}`} data-status={section.status}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full min-h-[44px] px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-left hover:bg-ink-50"
      >
        {open ? <ChevronDown className="w-4 h-4 text-ink-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-ink-500 shrink-0" />}
        <span className="text-[14px] font-bold text-ink-900">{section.titleKo}</span>
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_BADGE[tone]}`}>{SECTION_STATUS_LABELS[section.status]}</span>
        {failedCount > 0 && <span className="text-[11px] text-neg font-semibold">실패 {failedCount}건</span>}
      </button>

      {open && (
        <div id={bodyId} className="px-4 pb-4 space-y-4 min-w-0">
          {section.notes.length > 0 && (
            <ul className="text-[11px] text-ink-500 leading-relaxed list-disc pl-4 space-y-0.5">
              {section.notes.map((n) => (
                <li key={n} className="break-words">
                  {n}
                </li>
              ))}
            </ul>
          )}

          {section.metrics.length > 0 && (
            <div>
              <div className={`hidden ${GRID} pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400`}>
                <div>지표</div>
                <div>값</div>
                <div>비율</div>
                <div>변화</div>
                <div>상태</div>
              </div>
              <ul>
                {section.metrics.map((m) => (
                  <MetricRow key={m.id} m={m} renderAction={renderAction} />
                ))}
              </ul>
            </div>
          )}

          {section.tables.length > 0 && (
            <div className="grid grid-cols-1 gap-4 min-w-0">
              {section.tables.map((t) => (
                <DataCoverageTable key={t.id} table={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
