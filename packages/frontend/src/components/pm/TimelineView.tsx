'use client';
// Timeline/Gantt 뷰 — timeline 컬럼 기준 막대 + 주/월/분기 축 + 마일스톤·오늘선.
import { useMemo, useState } from 'react';
import type { BoardData } from '@/lib/pm-api';

type Unit = 'week' | 'month' | 'quarter';

function toDate(s?: string | null): Date | null {
  if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d;
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function periodKey(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'quarter') return `${y}Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${y}W${pad(w)}`; }
  return `${y}M${pad(d.getMonth() + 1)}`;
}
function label(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'quarter') return `${y} Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; }
  return `${y}.${pad(d.getMonth() + 1)}`;
}
function step(d: Date, u: Unit): Date {
  const n = new Date(d);
  if (u === 'quarter') n.setMonth(n.getMonth() + 3);
  else if (u === 'week') n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

export default function TimelineView({ data }: { data: BoardData }) {
  const board = data.board;
  const [unit, setUnit] = useState<Unit>(
    (board.reportCycle && board.reportCycle !== 'none' ? board.reportCycle : 'month') as Unit);
  const tCol = useMemo(() => data.columns.find((c) => c.type === 'timeline'), [data.columns]);
  const dCol = useMemo(() => data.columns.find((c) => c.type === 'date'), [data.columns]);
  const cv = (itemId: number, colId: number) => data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value;

  const model = useMemo(() => {
    let min: Date | null = null, max: Date | null = null;
    for (const it of data.items) {
      const tv = tCol ? cv(it.id, tCol.id) : null;
      const dv = dCol ? cv(it.id, dCol.id) : null;
      const s = toDate(tv?.start) || toDate(dv?.date);
      const e = toDate(tv?.end) || toDate(dv?.date);
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    }
    if (!min || !max) { min = new Date(); max = step(new Date(), unit); }
    const periods: { key: string; label: string; date: Date }[] = [];
    let cur = new Date(min);
    for (let g = 0; g < 240 && cur <= max!; g++) { periods.push({ key: periodKey(cur, unit), label: label(cur, unit), date: new Date(cur) }); cur = step(cur, unit); }
    if (!periods.length) periods.push({ key: periodKey(min, unit), label: label(min, unit), date: min });
    const idx = (d: Date) => Math.max(0, periods.findIndex((p) => p.key === periodKey(d, unit)));

    const groups = [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex).map((g) => {
      const gItems = data.items.filter((i) => i.groupId === g.id && !i.parentItemId);
      const laneEnd: number[] = [];
      const bars = gItems
        .map((it) => {
          const tv = tCol ? cv(it.id, tCol.id) : null;
          const dv = dCol ? cv(it.id, dCol.id) : null;
          const sd = toDate(tv?.start) || toDate(dv?.date);
          const ed = toDate(tv?.end) || toDate(dv?.date);
          if (!sd) return null;
          const s = idx(sd), e = ed ? idx(ed) : s;
          return { it, s, e, milestone: !tv?.end || s === e };
        })
        .filter(Boolean)
        .sort((a, b) => a!.s - b!.s)
        .map((b) => {
          let lane = 0;
          while (lane < laneEnd.length && (laneEnd[lane] ?? -1) >= b!.s) lane++;
          laneEnd[lane] = b!.e;
          return { ...b!, lane };
        });
      return { group: g, bars, laneCount: Math.max(1, laneEnd.length) };
    });
    return { periods, groups, idx };
  }, [data, unit, tCol, dCol]);

  if (!tCol && !dCol) {
    return <div className="bg-white border border-[#E2DED4] rounded-lg p-8 text-center text-[13px] text-[#888780]">
      Timeline 뷰는 <b>timeline</b> 또는 <b>date</b> 타입 컬럼이 필요합니다. Table 뷰에서 컬럼을 추가하세요.
    </div>;
  }

  const colW = 92, laneH = 30, labelW = 200;
  const todayKey = periodKey(new Date(), unit);
  const todayIdx = model.periods.findIndex((p) => p.key === todayKey);

  return (
    <div className="bg-white border border-[#E2DED4] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E2DED4]">
        <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">축 단위</span>
        {(['week', 'month', 'quarter'] as Unit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-2.5 py-1 text-[11.5px] rounded border ${unit === u ? 'bg-[#A50034] text-white border-[#A50034]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7]'}`}>
            {u === 'week' ? '주' : u === 'month' ? '월' : '분기'}
          </button>
        ))}
      </div>
      <div className="overflow-auto">
        <div style={{ minWidth: labelW + model.periods.length * colW }}>
          {/* axis */}
          <div className="flex sticky top-0 bg-[#FAFAF7] border-b border-[#E2DED4] z-10">
            <div style={{ width: labelW }} className="shrink-0 border-r border-[#E2DED4]" />
            {model.periods.map((p, i) => (
              <div key={p.key} style={{ width: colW }}
                className={`shrink-0 text-center py-2 text-[10.5px] text-[#5F5E5A] border-r border-[#EFEDE6] ${p.date.getMonth() % 3 === 0 ? 'font-semibold' : ''}`}>
                {p.label}
              </div>
            ))}
          </div>
          {/* groups */}
          {model.groups.map((gl) => (
            <div key={gl.group.id} className="flex border-b border-[#E2DED4]">
              <div style={{ width: labelW, minHeight: gl.laneCount * laneH }}
                className="shrink-0 border-r border-[#E2DED4] px-3 py-2 flex items-center gap-2"
                >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gl.group.color || '#888780' }} />
                <span className="font-medium text-[12px] text-[#1A1A1A]">{gl.group.name}</span>
              </div>
              <div className="relative" style={{ width: model.periods.length * colW, height: gl.laneCount * laneH }}>
                {model.periods.map((p, i) => (
                  <div key={p.key} className={`absolute top-0 bottom-0 border-r ${p.date.getMonth() % 3 === 0 ? 'border-[#D3D1C7]' : 'border-[#F2F0EA]'}`} style={{ left: i * colW, width: colW }} />
                ))}
                {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-px bg-[#A50034] z-10" style={{ left: todayIdx * colW + colW / 2 }} />}
                {gl.bars.map((b) => {
                  const left = b.s * colW + 4;
                  const w = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
                  const top = b.lane * laneH + 5;
                  if (b.milestone) {
                    return <div key={b.it.id} title={b.it.name} className="absolute" style={{ left: left + 4, top: top + 2 }}>
                      <div className="w-3 h-3 bg-[#A50034] rotate-45" />
                      <span className="absolute left-5 top-0 whitespace-nowrap text-[10.5px] text-[#1A1A1A]">{b.it.name}</span>
                    </div>;
                  }
                  return (
                    <div key={b.it.id} title={b.it.name}
                      className="absolute rounded text-[10.5px] text-white px-2 flex items-center overflow-hidden"
                      style={{ left, width: w, top, height: laneH - 10, backgroundColor: '#4A4A48' }}>
                      <span className="truncate">{b.it.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
