'use client';
// Calendar 뷰 (REQ-11) — date/timeline 컬럼 기준 월/주 캘린더.
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BoardData, PmItem } from '@/lib/pm-api';

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDate(s?: string | null): Date | null {
  if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d;
}
function ymd(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isSameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

interface Props { data: BoardData; onOpenItem: (id: number) => void; }

export default function CalendarView({ data, onOpenItem }: Props) {
  const [cursor, setCursor] = useState(new Date());
  const tCol = useMemo(() => data.columns.find((c) => c.type === 'timeline'), [data.columns]);
  const dCol = useMemo(() => data.columns.find((c) => c.type === 'date'), [data.columns]);
  const statusCol = useMemo(() => data.columns.find((c) => c.type === 'status'), [data.columns]);
  const cv = (itemId: number, colId: number) => data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value;

  if (!tCol && !dCol) {
    return (
      <div className="bg-white border border-[#E2DED4] rounded-lg p-8 text-center text-[13px] text-[#888780]">
        Calendar 뷰는 <b>date</b> 또는 <b>timeline</b> 타입 컬럼이 필요합니다.
      </div>
    );
  }

  // 그리드 6주(42일) — 월 시작 요일 보정. 일요일 시작.
  const monthStart = startOfMonth(cursor);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d);
  }

  // 이 월(앞/뒤 주 포함)에 해당하는 아이템 인덱싱: 날짜 → 아이템 리스트
  const items = data.items.filter((i) => !i.parentItemId);
  const byDate = new Map<string, Array<{ item: PmItem; type: 'milestone' | 'range_start' | 'range_end' | 'range_mid' }>>();
  for (const it of items) {
    const tv = tCol ? cv(it.id, tCol.id) : null;
    const dv = dCol ? cv(it.id, dCol.id) : null;
    if (dv?.date) {
      const k = String(dv.date);
      const arr = byDate.get(k) ?? []; arr.push({ item: it, type: 'milestone' }); byDate.set(k, arr);
    }
    if (tv?.start && tv?.end) {
      const s = toDate(tv.start), e = toDate(tv.end);
      if (s && e) {
        const cur = new Date(s);
        while (cur <= e) {
          const k = ymd(cur);
          const type = isSameDay(cur, s) ? 'range_start' : isSameDay(cur, e) ? 'range_end' : 'range_mid';
          const arr = byDate.get(k) ?? []; arr.push({ item: it, type }); byDate.set(k, arr);
          cur.setDate(cur.getDate() + 1);
        }
      }
    } else if (tv?.start) {
      const k = String(tv.start);
      const arr = byDate.get(k) ?? []; arr.push({ item: it, type: 'milestone' }); byDate.set(k, arr);
    }
  }

  const statusColor = (it: PmItem): string => {
    if (!statusCol) return '#3C6FA5';
    const v = cv(it.id, statusCol.id);
    const l = (statusCol.settings?.labels ?? []).find((x: any) => x.id === v?.label_id);
    return l?.color ?? '#3C6FA5';
  };

  const today = new Date();
  const monthLabel = `${cursor.getFullYear()}.${pad(cursor.getMonth() + 1)}`;

  return (
    <div className="bg-white border border-[#E2DED4] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2DED4]">
        <span className="font-medium text-[14px] text-[#1A1A1A]">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-1.5 hover:bg-[#FAFAF7] rounded"><ChevronLeft size={15} /></button>
          <button onClick={() => setCursor(new Date())}
            className="px-2 py-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034]">오늘</button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1.5 hover:bg-[#FAFAF7] rounded"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#E2DED4] text-[11px] font-medium text-[#5F5E5A]">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`px-2 py-1.5 text-center ${i === 0 ? 'text-[#C8366E]' : i === 6 ? 'text-[#3C6FA5]' : ''}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: '92px' }}>
        {cells.map((d, i) => {
          const isCur = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const dow = d.getDay();
          const list = byDate.get(ymd(d)) ?? [];
          return (
            <div key={i}
              className={`border-r border-b border-[#EFEDE6] p-1 flex flex-col text-[10.5px] overflow-hidden ${isCur ? 'bg-white' : 'bg-[#FAFAF7]'} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}>
              <span className={`font-mono ${isToday ? 'text-white bg-[#A50034] inline-flex items-center justify-center w-5 h-5 rounded-full' : isCur ? (dow === 0 ? 'text-[#C8366E]' : dow === 6 ? 'text-[#3C6FA5]' : 'text-[#1A1A1A]') : 'text-[#B8B6AE]'}`}>
                {d.getDate()}
              </span>
              <div className="flex-1 mt-0.5 space-y-px overflow-hidden">
                {list.slice(0, 3).map((entry, idx) => {
                  const color = statusColor(entry.item);
                  return (
                    <button key={`${entry.item.id}-${idx}`} onClick={() => onOpenItem(entry.item.id)}
                      className="w-full text-left text-[10px] truncate px-1 py-px rounded hover:opacity-80"
                      style={{ backgroundColor: `${color}22`, color }}>
                      {entry.type === 'milestone' && '◆ '}{entry.item.name}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <p className="text-[9.5px] text-[#888780] px-1">+ {list.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
