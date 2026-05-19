'use client';
// Table 뷰 — 스프레드시트급 조작 (REQ-23): 방향키/Tab/Enter 내비,
// 직접 입력, 블록 복사/붙여넣기, fill-down. viewer 는 읽기전용.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn, type PmItem } from '@/lib/pm-api';
import { CellDisplay, cellToText, textToCellValue, DateCellEditor } from './cells';

interface Props {
  data: BoardData;
  canEdit: boolean;
  onChanged: () => void;
  onOpenItem: (itemId: number) => void;
}

interface Pos { r: number; c: number; }

export default function TableView({ data, canEdit, onChanged, onOpenItem }: Props) {
  const cols = useMemo(() => [...data.columns].sort((a, b) => a.orderIndex - b.orderIndex), [data.columns]);
  // 평탄화 행: 그룹 헤더 사이에 아이템. rowMeta[r] = { item, groupId }
  const rows = useMemo(() => {
    const out: { item: PmItem; groupId: number }[] = [];
    for (const g of [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex)) {
      for (const it of data.items.filter((i) => i.groupId === g.id && !i.parentItemId).sort((a, b) => a.orderIndex - b.orderIndex))
        out.push({ item: it, groupId: g.id });
    }
    return out;
  }, [data]);

  const cellVal = useCallback((itemId: number, columnId: number) =>
    data.cells.find((x) => x.itemId === itemId && x.columnId === columnId)?.value ?? null, [data.cells]);

  const [focus, setFocus] = useState<Pos | null>(null);
  const [anchor, setAnchor] = useState<Pos | null>(null);
  const [editing, setEditing] = useState<{ pos: Pos; draft: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const rect = useMemo(() => {
    if (!focus) return null;
    const a = anchor || focus;
    return { r0: Math.min(a.r, focus.r), r1: Math.max(a.r, focus.r), c0: Math.min(a.c, focus.c), c1: Math.max(a.c, focus.c) };
  }, [focus, anchor]);

  const saveCell = useCallback(async (itemId: number, col: PmColumn, raw: string) => {
    try { await pmApi.setCell(itemId, col.id, textToCellValue(col, raw)); onChanged(); } catch { /* noop */ }
  }, [onChanged]);

  const commitEdit = useCallback(async () => {
    if (!editing) return;
    const row = rows[editing.pos.r]; const col = cols[editing.pos.c];
    // date/timeline 은 DateCellEditor 가 즉시 저장하므로 텍스트 커밋 생략
    if (row && col && col.type !== 'date' && col.type !== 'timeline') {
      await saveCell(row.item.id, col, editing.draft);
    }
    setEditing(null);
  }, [editing, rows, cols, saveCell]);

  const addItemToGroup = useCallback(async (groupId: number) => {
    await pmApi.createItem(groupId, { name: '새 아이템' }); onChanged();
  }, [onChanged]);

  const addItemToLastGroup = useCallback(async () => {
    const cur = rows.length ? rows[rows.length - 1]?.groupId : undefined;
    const g = cur ?? [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex).slice(-1)[0]?.id;
    if (g == null) return;
    await pmApi.createItem(g, { name: '새 아이템' }); onChanged();
  }, [data.groups, rows, onChanged]);

  const onKey = useCallback(async (e: React.KeyboardEvent) => {
    if (!focus) return;
    const maxR = rows.length - 1, maxC = cols.length - 1;
    const move = (dr: number, dc: number, extend = false) => {
      const nr = Math.max(0, Math.min(maxR, focus.r + dr));
      const nc = Math.max(0, Math.min(maxC, focus.c + dc));
      setFocus({ r: nr, c: nc });
      if (!extend) setAnchor({ r: nr, c: nc });
    };
    if (editing) {
      if (e.key === 'Enter') { e.preventDefault(); await commitEdit(); move(1, 0); }
      else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
      else if (e.key === 'Tab') { e.preventDefault(); await commitEdit(); move(0, e.shiftKey ? -1 : 1); }
      return;
    }
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'c') { e.preventDefault(); copyBlock(); return; }
    if (meta && e.key.toLowerCase() === 'v') { e.preventDefault(); await pasteBlock(); return; }
    if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); await fillDown(); return; }
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0, e.shiftKey); break;
      case 'ArrowDown': e.preventDefault(); move(1, 0, e.shiftKey); break;
      case 'ArrowLeft': e.preventDefault(); move(0, -1, e.shiftKey); break;
      case 'ArrowRight': e.preventDefault(); move(0, 1, e.shiftKey); break;
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1); break;
      case 'Enter':
        e.preventDefault();
        if (!canEdit) break;
        if (focus.r === maxR) { await addItemToLastGroup(); }
        else move(1, 0);
        break;
      case 'F2':
        if (canEdit) { e.preventDefault(); startEdit(focus, ''); }
        break;
      case 'Backspace': case 'Delete':
        if (canEdit && rect) { e.preventDefault(); await clearRect(); }
        break;
      default:
        if (canEdit && e.key.length === 1 && !meta) { startEdit(focus, e.key); }
    }
  }, [focus, editing, rows, cols, rect, canEdit, commitEdit, addItemToLastGroup]);

  const startEdit = (pos: Pos, seed: string) => {
    const row = rows[pos.r]; const col = cols[pos.c];
    if (!row || !col) return;
    const cur = seed || cellToText(col, cellVal(row.item.id, col.id));
    setEditing({ pos, draft: cur });
  };

  const copyBlock = () => {
    if (!rect) return;
    const lines: string[] = [];
    for (let r = rect.r0; r <= rect.r1; r++) {
      const cells: string[] = [];
      for (let c = rect.c0; c <= rect.c1; c++) {
        const row = rows[r]; const col = cols[c];
        cells.push(row && col ? cellToText(col, cellVal(row.item.id, col.id)) : '');
      }
      lines.push(cells.join('\t'));
    }
    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
  };

  const pasteBlock = async () => {
    if (!focus || !canEdit) return;
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { return; }
    const grid = text.replace(/\r/g, '').split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')).map((l) => l.split('\t'));
    const tasks: Array<{ itemId: number; columnId: number; value: any }> = [];
    grid.forEach((line, dr) => line.forEach((val, dc) => {
      const row = rows[focus.r + dr]; const col = cols[focus.c + dc];
      if (row && col) tasks.push({ itemId: row.item.id, columnId: col.id, value: textToCellValue(col, val) });
    }));
    if (tasks.length && rows[focus.r]) { await pmApi.bulkCells(rows[focus.r].item.id, tasks); onChanged(); }
  };

  const fillDown = async () => {
    if (!rect || !canEdit) return;
    const tasks: Array<{ itemId: number; columnId: number; value: any }> = [];
    for (let c = rect.c0; c <= rect.c1; c++) {
      const col = cols[c]; const top = rows[rect.r0];
      if (!col || !top) continue;
      const v = cellVal(top.item.id, col.id) ?? {};
      for (let r = rect.r0 + 1; r <= rect.r1; r++) {
        const row = rows[r]; if (row) tasks.push({ itemId: row.item.id, columnId: col.id, value: v });
      }
    }
    if (tasks.length && rows[rect.r0]) { await pmApi.bulkCells(rows[rect.r0].item.id, tasks); onChanged(); }
  };

  const clearRect = async () => {
    if (!rect) return;
    const tasks: Array<{ itemId: number; columnId: number; value: any }> = [];
    for (let r = rect.r0; r <= rect.r1; r++) for (let c = rect.c0; c <= rect.c1; c++) {
      const row = rows[r]; const col = cols[c];
      if (row && col) tasks.push({ itemId: row.item.id, columnId: col.id, value: {} });
    }
    if (tasks.length && rows[rect.r0]) { await pmApi.bulkCells(rows[rect.r0].item.id, tasks); onChanged(); }
  };

  useEffect(() => { gridRef.current?.focus(); }, []);

  const inRect = (r: number, c: number) => rect && r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;
  const sortedGroups = useMemo(() => [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex), [data.groups]);
  const rowIndexByItem = useMemo(() => {
    const m = new Map<number, number>();
    rows.forEach((row, i) => m.set(row.item.id, i));
    return m;
  }, [rows]);
  const totalCols = cols.length + 1;

  return (
    <div ref={gridRef} tabIndex={0} onKeyDown={onKey} className="outline-none overflow-auto border border-[#E2DED4] rounded-lg bg-white">
      <table className="border-collapse text-[12.5px]" style={{ minWidth: 600 }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#FAFAF7]">
            <th className="border-b border-r border-[#E2DED4] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#5F5E5A]" style={{ minWidth: 240 }}>아이템</th>
            {cols.map((c) => (
              <th key={c.id} className="border-b border-r border-[#E2DED4] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#5F5E5A]" style={{ minWidth: c.width }}>
                {c.name} <span className="text-[#B8B6AE] normal-case">· {c.type}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((g) => {
            const gItems = data.items
              .filter((i) => i.groupId === g.id && !i.parentItemId)
              .sort((a, b) => a.orderIndex - b.orderIndex);
            return (
              <>
                <tr key={`g-${g.id}`}>
                  <td colSpan={totalCols} className="bg-[#F4F2EC] border-b border-[#E2DED4] px-3 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color || '#888780' }} />
                        <span className="font-medium text-[12px] text-[#1A1A1A]">{g.name}</span>
                        <span className="font-mono text-[10px] text-[#888780]">{gItems.length}</span>
                      </span>
                      {canEdit && (
                        <button onClick={() => addItemToGroup(g.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034]">
                          <Plus size={12} /> 아이템
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {gItems.length === 0 && (
                  <tr key={`e-${g.id}`}>
                    <td colSpan={totalCols} className="border-b border-[#EFEDE6] px-3 py-2 text-[12px] text-[#B8B6AE]">
                      {canEdit ? (
                        <button onClick={() => addItemToGroup(g.id)} className="inline-flex items-center gap-1.5 text-[#5F5E5A] hover:text-[#A50034]">
                          <Plus size={13} /> 이 그룹에 첫 아이템 추가
                        </button>
                      ) : '아이템 없음'}
                    </td>
                  </tr>
                )}
                {gItems.map((it) => {
                  const r = rowIndexByItem.get(it.id) ?? -1;
                  return (
                    <tr key={it.id}>
                      <td className="border-b border-r border-[#EFEDE6] px-3 py-1.5 group cursor-pointer hover:bg-[#FAFAF7]"
                        onClick={() => onOpenItem(it.id)}>
                        <span className="text-[#1A1A1A] hover:text-[#A50034]">{it.name}</span>
                      </td>
                      {cols.map((col, c) => {
                        const isFocus = focus?.r === r && focus?.c === c;
                        const isEditing = editing?.pos.r === r && editing?.pos.c === c;
                        return (
                          <td key={col.id}
                            onMouseDown={(e) => { setFocus({ r, c }); if (!e.shiftKey) setAnchor({ r, c }); gridRef.current?.focus(); }}
                            onDoubleClick={() => canEdit && startEdit({ r, c }, '')}
                            className={`border-b border-r border-[#EFEDE6] px-2.5 py-1.5 align-middle ${inRect(r, c) ? 'bg-[#FAEAE7]/50' : ''} ${isFocus ? 'outline outline-2 outline-[#A50034] -outline-offset-2' : ''}`}>
                            {isEditing ? (
                              col.type === 'date' || col.type === 'timeline' ? (
                                <DateCellEditor col={col} value={cellVal(it.id, col.id)} compact
                                  onSave={async (v) => { try { await pmApi.setCell(it.id, col.id, v); onChanged(); } catch { /* noop */ } }}
                                  onClose={() => setEditing(null)} />
                              ) : (
                                <input autoFocus value={editing!.draft}
                                  onChange={(e) => setEditing({ pos: { r, c }, draft: e.target.value })}
                                  onBlur={commitEdit}
                                  className="w-full text-[12.5px] outline-none bg-transparent" />
                              )
                            ) : (
                              <CellDisplay col={col} value={cellVal(it.id, col.id)} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            );
          })}
          {sortedGroups.length === 0 && (
            <tr><td colSpan={totalCols} className="px-3 py-6 text-center text-[12px] text-[#888780]">
              그룹이 없습니다. 상단 “그룹” 버튼으로 추가하세요.
            </td></tr>
          )}
        </tbody>
      </table>
      {canEdit && sortedGroups.length > 0 && (
        <button onClick={addItemToLastGroup} className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#5F5E5A] hover:text-[#A50034]">
          <Plus size={13} /> 아이템 추가 (또는 표 안에서 마지막 행 Enter)
        </button>
      )}
    </div>
  );
}
