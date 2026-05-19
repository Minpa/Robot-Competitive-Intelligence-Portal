'use client';
// Timeline/Gantt 뷰 — timeline 막대 + 주/월/분기 축 + 마일스톤·오늘선 + 의존선(FS/SS/FF/SF).
import { useMemo, useState } from 'react';
import { pmApi, type BoardData, type DependencyType } from '@/lib/pm-api';

type Unit = 'day' | 'week' | 'month' | 'quarter';

function toDate(s?: string | null): Date | null {
  if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d;
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function periodKey(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'day') return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (u === 'quarter') return `${y}Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${y}W${pad(w)}`; }
  return `${y}M${pad(d.getMonth() + 1)}`;
}
function label(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'day') return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  if (u === 'quarter') return `${y} Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; }
  return `${y}.${pad(d.getMonth() + 1)}`;
}
function step(d: Date, u: Unit): Date {
  const n = new Date(d);
  if (u === 'quarter') n.setMonth(n.getMonth() + 3);
  else if (u === 'week') n.setDate(n.getDate() + 7);
  else if (u === 'day') n.setDate(n.getDate() + 1);
  else n.setMonth(n.getMonth() + 1);
  return n;
}
// 축에서 굵게 강조할 주요 눈금 (일=월초/월요일, 그 외=분기 시작)
function isMajor(d: Date, u: Unit): boolean {
  if (u === 'day') return d.getDate() === 1 || d.getDay() === 1;
  return d.getMonth() % 3 === 0;
}

const DEP_TYPES: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];

interface Props { data: BoardData; canEdit?: boolean; onChanged?: () => void; }

export default function TimelineView({ data, canEdit = false, onChanged }: Props) {
  const board = data.board;
  const [unit, setUnit] = useState<Unit>(
    (board.reportCycle && board.reportCycle !== 'none' ? board.reportCycle : 'month') as Unit);
  const [showDeps, setShowDeps] = useState(true);
  const [draft, setDraft] = useState<{ pred: string; succ: string; type: DependencyType }>({ pred: '', succ: '', type: 'FS' });
  const [busy, setBusy] = useState(false);
  const tCol = useMemo(() => data.columns.find((c) => c.type === 'timeline'), [data.columns]);
  const dCol = useMemo(() => data.columns.find((c) => c.type === 'date'), [data.columns]);
  const cv = (itemId: number, colId: number) => data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value;

  const colW = unit === 'day' ? 38 : 92;
  const laneH = 30, labelW = 200;

  // 작업 번호(Predecessors 표기용) — 보드 순서 1-based
  const numOf = useMemo(() => {
    const m = new Map<number, number>();
    data.items.forEach((it, i) => m.set(it.id, i + 1));
    return m;
  }, [data.items]);

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
    const cap = unit === 'day' ? 400 : 240;
    for (let g = 0; g < cap && cur <= max!; g++) { periods.push({ key: periodKey(cur, unit), label: label(cur, unit), date: new Date(cur) }); cur = step(cur, unit); }
    if (!periods.length) periods.push({ key: periodKey(min, unit), label: label(min, unit), date: min });
    const idx = (d: Date) => Math.max(0, periods.findIndex((p) => p.key === periodKey(d, unit)));

    // 전역 좌표 맵 (의존선 SVG 오버레이용) — 타임라인 영역 기준 (x: 0 = labelW 우측, y: 0 = groups 영역 상단)
    const pos = new Map<number, { x0: number; x1: number; yc: number; milestone: boolean }>();
    let yCursor = 0;
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
      const laneCount = Math.max(1, laneEnd.length);
      // 전역 위치 등록
      for (const b of bars) {
        const left = b.s * colW + 4;
        const w = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
        const yc = yCursor + b.lane * laneH + laneH / 2;
        if (b.milestone) {
          const mx = b.s * colW + 4 + 4 + 6;
          pos.set(b.it.id, { x0: mx, x1: mx, yc, milestone: true });
        } else {
          pos.set(b.it.id, { x0: left, x1: left + w, yc, milestone: false });
        }
      }
      const groupTop = yCursor;
      yCursor += laneCount * laneH + 1; // +1 = border-b
      return { group: g, bars, laneCount, groupTop };
    });

    // 의존선 경로 — 직교 엘보, auto-orient 화살표
    const STUB = 14;
    const links = (data.dependencies || []).map((dep) => {
      const P = pos.get(dep.predecessorItemId);
      const S = pos.get(dep.successorItemId);
      if (!P || !S) return null;
      // 앵커: type 별 시작/끝 지점 + 진출/진입 방향
      const fromEnd = dep.type === 'FS' || dep.type === 'FF';   // 선행 끝에서 출발
      const toStart = dep.type === 'FS' || dep.type === 'SS';   // 후행 시작으로 도착
      const sx = fromEnd ? P.x1 : P.x0;
      const ex = toStart ? S.x0 : S.x1;
      const sDir = fromEnd ? 1 : -1;   // 끝→오른쪽, 시작→왼쪽
      const eDir = toStart ? 1 : -1;   // 시작에 진입 → 오른쪽 이동, 끝에 진입 → 왼쪽 이동
      const sy = P.yc, ey = S.yc;
      const p1x = sx + sDir * STUB;
      const p3x = ex - eDir * STUB;
      const mx = (p1x + p3x) / 2;
      const pts = [
        [sx, sy], [p1x, sy], [mx, sy], [mx, ey], [p3x, ey], [ex, ey],
      ];
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const code = `${numOf.get(dep.predecessorItemId) ?? '?'}${dep.type}`;
      return { id: dep.id, d, code, mx, my: (sy + ey) / 2 };
    }).filter(Boolean) as { id: number; d: string; code: string; mx: number; my: number }[];

    return { periods, groups, idx, totalH: yCursor, links };
  }, [data, unit, tCol, dCol, numOf]);

  // 작업별 predecessor 코드 (막대 tooltip)
  const predsOf = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const dep of data.dependencies || []) {
      const arr = m.get(dep.successorItemId) ?? [];
      arr.push(`${numOf.get(dep.predecessorItemId) ?? '?'}${dep.type}`);
      m.set(dep.successorItemId, arr);
    }
    return m;
  }, [data.dependencies, numOf]);

  if (!tCol && !dCol) {
    return <div className="bg-white border border-[#E2DED4] rounded-lg p-8 text-center text-[13px] text-[#888780]">
      Timeline 뷰는 <b>timeline</b> 또는 <b>date</b> 타입 컬럼이 필요합니다. Table 뷰에서 컬럼을 추가하세요.
    </div>;
  }

  const todayKey = periodKey(new Date(), unit);
  const todayIdx = model.periods.findIndex((p) => p.key === todayKey);

  const addDep = async () => {
    const pred = Number(draft.pred), succ = Number(draft.succ);
    if (!pred || !succ || pred === succ || busy) return;
    setBusy(true);
    try {
      await pmApi.createDependency(board.id, { predecessorItemId: pred, successorItemId: succ, type: draft.type });
      setDraft({ pred: '', succ: '', type: 'FS' });
      onChanged?.();
    } catch { /* noop */ } finally { setBusy(false); }
  };
  const delDep = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try { await pmApi.deleteDependency(id); onChanged?.(); } catch { /* noop */ } finally { setBusy(false); }
  };

  const itemOpts = data.items.filter((i) => !i.parentItemId);

  return (
    <div className="bg-white border border-[#E2DED4] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#E2DED4]">
        <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">축 단위</span>
        {(['day', 'week', 'month', 'quarter'] as Unit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-2.5 py-1 text-[11.5px] rounded border ${unit === u ? 'bg-[#A50034] text-white border-[#A50034]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7]'}`}>
            {u === 'day' ? '일' : u === 'week' ? '주' : u === 'month' ? '월' : '분기'}
          </button>
        ))}
        <label className="ml-3 flex items-center gap-1.5 text-[11.5px] text-[#5F5E5A] cursor-pointer">
          <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} />
          의존선 ({(data.dependencies || []).length})
        </label>
        {canEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            <select value={draft.pred} onChange={(e) => setDraft((d) => ({ ...d, pred: e.target.value }))}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1 max-w-[150px]">
              <option value="">선행 작업…</option>
              {itemOpts.map((i) => <option key={i.id} value={i.id}>{numOf.get(i.id)}. {i.name}</option>)}
            </select>
            <span className="text-[#888780] text-[11px]">→</span>
            <select value={draft.succ} onChange={(e) => setDraft((d) => ({ ...d, succ: e.target.value }))}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1 max-w-[150px]">
              <option value="">후행 작업…</option>
              {itemOpts.map((i) => <option key={i.id} value={i.id}>{numOf.get(i.id)}. {i.name}</option>)}
            </select>
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as DependencyType }))}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1">
              {DEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addDep} disabled={busy || !draft.pred || !draft.succ}
              className="px-2.5 py-1 text-[11.5px] rounded bg-[#A50034] text-white disabled:opacity-40">의존 추가</button>
          </div>
        )}
      </div>
      <div className="overflow-auto">
        <div style={{ minWidth: labelW + model.periods.length * colW }}>
          {/* axis */}
          <div className="flex sticky top-0 bg-[#FAFAF7] border-b border-[#E2DED4] z-10">
            <div style={{ width: labelW }} className="shrink-0 border-r border-[#E2DED4]" />
            {model.periods.map((p) => (
              <div key={p.key} style={{ width: colW }}
                className={`shrink-0 text-center py-2 text-[10.5px] text-[#5F5E5A] border-r border-[#EFEDE6] ${isMajor(p.date, unit) ? 'font-semibold' : ''}`}>
                {p.label}
              </div>
            ))}
          </div>
          {/* groups + 의존선 오버레이 */}
          <div className="relative">
            {model.groups.map((gl) => (
              <div key={gl.group.id} className="flex border-b border-[#E2DED4]">
                <div style={{ width: labelW, minHeight: gl.laneCount * laneH }}
                  className="shrink-0 border-r border-[#E2DED4] px-3 py-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gl.group.color || '#888780' }} />
                  <span className="font-medium text-[12px] text-[#1A1A1A]">{gl.group.name}</span>
                </div>
                <div className="relative" style={{ width: model.periods.length * colW, height: gl.laneCount * laneH }}>
                  {model.periods.map((p, i) => (
                    <div key={p.key} className={`absolute top-0 bottom-0 border-r ${isMajor(p.date, unit) ? 'border-[#D3D1C7]' : 'border-[#F2F0EA]'}`} style={{ left: i * colW, width: colW }} />
                  ))}
                  {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-px bg-[#A50034] z-10" style={{ left: todayIdx * colW + colW / 2 }} />}
                  {gl.bars.map((b) => {
                    const left = b.s * colW + 4;
                    const w = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
                    const top = b.lane * laneH + 5;
                    const preds = predsOf.get(b.it.id);
                    const tip = `${b.it.name}${preds ? ` · 선행 ${preds.join(', ')}` : ''}`;
                    if (b.milestone) {
                      return <div key={b.it.id} title={tip} className="absolute" style={{ left: left + 4, top: top + 2 }}>
                        <div className="w-3 h-3 bg-[#A50034] rotate-45" />
                        <span className="absolute left-5 top-0 whitespace-nowrap text-[10.5px] text-[#1A1A1A]">{b.it.name}</span>
                      </div>;
                    }
                    return (
                      <div key={b.it.id} title={tip}
                        className="absolute rounded text-[10.5px] text-white px-2 flex items-center overflow-hidden"
                        style={{ left, width: w, top, height: laneH - 10, backgroundColor: '#4A4A48' }}>
                        <span className="truncate">{b.it.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {showDeps && model.links.length > 0 && (
              <svg
                className="absolute top-0 pointer-events-none"
                style={{ left: labelW, width: model.periods.length * colW, height: model.totalH }}
                width={model.periods.length * colW} height={model.totalH}>
                <defs>
                  <marker id="pm-dep-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" fill="#9A6FB0" />
                  </marker>
                </defs>
                {model.links.map((ln) => (
                  <g key={ln.id} className={canEdit ? 'pointer-events-auto cursor-pointer group' : ''}
                    onClick={canEdit ? () => { if (confirm(`의존관계 ${ln.code} 를 삭제할까요?`)) delDep(ln.id); } : undefined}>
                    {canEdit && <path d={ln.d} fill="none" stroke="transparent" strokeWidth={10} />}
                    <path d={ln.d} fill="none" stroke="#9A6FB0" strokeWidth={1.5}
                      markerEnd="url(#pm-dep-arrow)" className={canEdit ? 'group-hover:stroke-[#A50034]' : ''} />
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
