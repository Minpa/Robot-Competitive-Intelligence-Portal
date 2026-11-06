'use client';

import type { CoverageTable } from '@/types/data-coverage';
import { DELTA_TONE_CLASS, describeDelta, formatCell, isNumericKind, rowLabel, tableNote } from '@/lib/data-coverage-view';

/**
 * 구역 표 — 가로 스크롤 래퍼 안에 두고 첫 열은 고정(sticky). 페이지 가로 스크롤은 만들지 않는다.
 * 변화(delta)는 diffable 표의 숫자 열에만 있다.
 */
export default function DataCoverageTable({ table }: { table: CoverageTable }) {
  const note = tableNote(table);
  const failed = table.status === 'failed';
  const na = table.status === 'na';
  return (
    <div className="min-w-0" data-testid={`dc-table-${table.id}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h4 className="text-[12px] font-bold text-ink-800">{table.label}</h4>
        {note && (
          <span className={`text-[11px] ${failed ? 'text-neg font-semibold' : 'text-ink-500'}`} data-testid={`dc-table-note-${table.id}`}>
            {note}
          </span>
        )}
      </div>
      {!failed && !na && (
        <div className="overflow-x-auto border border-ink-200 rounded-md max-w-full">
          <table className="min-w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-ink-50 text-ink-500">
                <th scope="col" className="sticky left-0 z-10 bg-ink-50 text-left font-semibold px-3 py-2 whitespace-nowrap border-r border-ink-200">
                  항목
                </th>
                {table.columns.map((c) => (
                  <th key={c.key} scope="col" className="text-right font-semibold px-3 py-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.length === 0 && (
                <tr>
                  <td colSpan={table.columns.length + 1} className="px-3 py-3 text-ink-500">
                    표시할 행이 없습니다
                  </td>
                </tr>
              )}
              {table.rows.map((r) => (
                <tr key={r.key} className="border-t border-ink-100">
                  <th scope="row" className="sticky left-0 z-10 bg-white text-left font-medium text-ink-800 px-3 py-2 whitespace-nowrap border-r border-ink-200 max-w-[220px] truncate" title={r.key}>
                    {rowLabel(r.key)}
                  </th>
                  {table.columns.map((c) => {
                    const v = r.cells[c.key];
                    const d = isNumericKind(c.kind) && table.diffable ? describeDelta(c.kind, r.delta?.[c.key] ?? null, 'neutral') : null;
                    const text = formatCell(v, c.kind);
                    return (
                      <td key={c.key} className="px-3 py-2 text-right whitespace-nowrap tabular-nums text-ink-900">
                        <span className={c.kind === 'text' ? 'inline-block max-w-[260px] truncate align-bottom' : ''} title={c.kind === 'text' ? text : undefined}>
                          {text}
                        </span>
                        {d && d.tone !== 'none' && (
                          <span className={`ml-2 text-[11px] ${DELTA_TONE_CLASS[d.tone]}`} title={d.label}>
                            {d.text}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
