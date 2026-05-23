'use client';
// Table 뷰 — 스프레드시트급 조작 (REQ-23): 방향키/Tab/Enter 내비,
// 직접 입력, 블록 복사/붙여넣기, fill-down. viewer 는 읽기전용.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Copy, Trash2, Pencil, ChevronRight, ChevronDown, CornerDownRight } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn, type PmItem } from '@/lib/pm-api';
import { CellDisplay, cellToText, textToCellValue, DateCellEditor, ChoiceCellEditor, STATUS_PALETTE } from './cells';

const CHOICE_TYPES = ['status', 'priority', 'dropdown'];

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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // 아이템 이름 인라인 편집 — 더블클릭으로 진입
  const [editingItemName, setEditingItemName] = useState<{ id: number; draft: string } | null>(null);

  const commitItemName = useCallback(async (it: PmItem) => {
    if (!editingItemName || editingItemName.id !== it.id) return;
    const v = editingItemName.draft.trim();
    setEditingItemName(null);
    if (v && v !== it.name) {
      try { await pmApi.updateItem(it.id, { name: v }); onChanged(); } catch { /* noop */ }
    }
  }, [editingItemName, onChanged]);
  const gridRef = useRef<HTMLDivElement>(null);

  // 부모ID → 서브아이템 배열 (orderIndex 순)
  const subitemsByParent = useMemo(() => {
    const m = new Map<number, PmItem[]>();
    for (const i of data.items) {
      if (i.parentItemId == null) continue;
      const arr = m.get(i.parentItemId) ?? [];
      arr.push(i);
      m.set(i.parentItemId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.orderIndex - b.orderIndex);
    return m;
  }, [data.items]);

  const toggleExpand = (itemId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const addSubitem = async (parent: PmItem) => {
    if (!canEdit) return;
    try {
      await pmApi.createItem(parent.groupId, { name: '새 서브아이템', parentItemId: parent.id });
      setExpanded((prev) => new Set(prev).add(parent.id));
      onChanged();
    } catch { /* noop */ }
  };

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
    if (row && col && col.type !== 'date' && col.type !== 'timeline' && !CHOICE_TYPES.includes(col.type)) {
      await saveCell(row.item.id, col, editing.draft);
    }
    setEditing(null);
  }, [editing, rows, cols, saveCell]);

  const addItemToGroup = useCallback(async (groupId: number) => {
    await pmApi.createItem(groupId, { name: '새 아이템' }); onChanged();
  }, [onChanged]);

  // 그룹 이름 인라인 편집
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string } | null>(null);
  const commitGroupName = useCallback(async () => {
    if (!editingGroup) return;
    const g = data.groups.find((x) => x.id === editingGroup.id);
    const name = editingGroup.name.trim();
    setEditingGroup(null);
    if (g && name && name !== g.name) { try { await pmApi.updateGroup(g.id, { name }); onChanged(); } catch { /* noop */ } }
  }, [editingGroup, data.groups, onChanged]);

  const removeGroup = useCallback(async (groupId: number, name: string, count: number) => {
    const msg = count > 0
      ? `'${name}' 그룹과 그 안의 아이템 ${count}개가 모두 삭제됩니다. 계속할까요?`
      : `'${name}' 그룹을 삭제할까요?`;
    if (!confirm(msg)) return;
    try { await pmApi.deleteGroup(groupId); onChanged(); } catch { /* noop */ }
  }, [onChanged]);

  const removeItem = useCallback(async (itemId: number, name: string) => {
    if (!confirm(`아이템 '${name}' 을(를) 삭제할까요?`)) return;
    try { await pmApi.deleteItem(itemId); onChanged(); } catch { /* noop */ }
  }, [onChanged]);

  const duplicateItem = useCallback(async (it: PmItem) => {
    try {
      const { item: ni } = await pmApi.createItem(it.groupId, { name: `${it.name} (복사)` });
      const srcCells = data.cells.filter((x) => x.itemId === it.id);
      if (srcCells.length) {
        await pmApi.bulkCells(ni.id, srcCells.map((x) => ({ itemId: ni.id, columnId: x.columnId, value: x.value })));
      }
      onChanged();
    } catch { /* noop */ }
  }, [data.cells, onChanged]);

  const addItemToLastGroup = useCallback(async () => {
    const cur = rows.length ? rows[rows.length - 1]?.groupId : undefined;
    const g = cur ?? [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex).slice(-1)[0]?.id;
    if (g == null) return;
    await pmApi.createItem(g, { name: '새 아이템' }); onChanged();
  }, [data.groups, rows, onChanged]);

  // 선택형 컬럼에 새 항목을 추가하고(리스트로 관리·재사용) 새 id 반환
  const addChoiceOption = useCallback(async (col: PmColumn, name: string): Promise<number | null> => {
    const isDropdown = col.type === 'dropdown';
    const cur: any[] = isDropdown ? (col.settings?.options || []) : (col.settings?.labels || []);
    if (cur.some((o) => o.name === name)) return cur.find((o) => o.name === name)?.id ?? null;
    const id = (cur.reduce((m, o) => Math.max(m, o.id || 0), 0)) + 1;
    const entry = isDropdown ? { id, name } : { id, name, color: STATUS_PALETTE[(id - 1) % STATUS_PALETTE.length] };
    const settings = { ...(col.settings || {}), [isDropdown ? 'options' : 'labels']: [...cur, entry] };
    try { await pmApi.updateColumn(col.id, { settings }); onChanged(); return id; } catch { return null; }
  }, [onChanged]);

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
              <Fragment key={`g-${g.id}`}>
                <tr>
                  <td colSpan={totalCols} className="bg-[#F4F2EC] border-b border-[#E2DED4] px-3 py-1.5 group/grp">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color || '#888780' }} />
                        {editingGroup?.id === g.id ? (
                          <input autoFocus value={editingGroup.name}
                            onChange={(e) => setEditingGroup({ id: g.id, name: e.target.value })}
                            onBlur={commitGroupName}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); void commitGroupName(); }
                              else if (e.key === 'Escape') { e.preventDefault(); setEditingGroup(null); }
                            }}
                            className="font-medium text-[12px] text-[#1A1A1A] bg-white border border-[#A50034] rounded px-1.5 py-0.5 outline-none" />
                        ) : (
                          <span className="font-medium text-[12px] text-[#1A1A1A] cursor-text"
                            onDoubleClick={() => canEdit && setEditingGroup({ id: g.id, name: g.name })}
                            title={canEdit ? '더블클릭하여 이름 변경' : undefined}>{g.name}</span>
                        )}
                        <span className="font-mono text-[10px] text-[#888780]">{gItems.length}</span>
                      </span>
                      {canEdit && (
                        <span className="inline-flex items-center gap-3">
                          <button onClick={() => setEditingGroup({ id: g.id, name: g.name })}
                            className="inline-flex items-center gap-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034] opacity-0 group-hover/grp:opacity-100 transition-opacity"
                            title="그룹 이름 변경">
                            <Pencil size={12} /> 이름
                          </button>
                          <button onClick={() => addItemToGroup(g.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034]">
                            <Plus size={12} /> 아이템
                          </button>
                          <button onClick={() => removeGroup(g.id, g.name, gItems.length)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#888780] hover:text-[#A50034] opacity-0 group-hover/grp:opacity-100 transition-opacity"
                            title="그룹 삭제">
                            <Trash2 size={12} /> 삭제
                          </button>
                        </span>
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
                  const subs = subitemsByParent.get(it.id) ?? [];
                  const isOpen = expanded.has(it.id);
                  return (
                    <Fragment key={it.id}>
                    <tr>
                      <td className="border-b border-r border-[#EFEDE6] px-3 py-1.5 group/it hover:bg-[#FAFAF7]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            {subs.length > 0 ? (
                              <button onClick={() => toggleExpand(it.id)} className="text-[#888780] hover:text-[#A50034] shrink-0" title={isOpen ? '서브아이템 접기' : '서브아이템 펼치기'}>
                                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            ) : <span className="w-[13px] shrink-0" />}
                            {editingItemName?.id === it.id ? (
                              <input autoFocus value={editingItemName.draft}
                                onChange={(e) => setEditingItemName({ id: it.id, draft: e.target.value })}
                                onBlur={() => commitItemName(it)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                                  else if (e.key === 'Escape') { e.preventDefault(); setEditingItemName(null); }
                                }}
                                className="flex-1 min-w-0 text-[#1A1A1A] outline-none border border-[#A50034] rounded px-1 py-0.5 bg-white" />
                            ) : (
                              <button onClick={() => onOpenItem(it.id)}
                                onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) setEditingItemName({ id: it.id, draft: it.name }); }}
                                title={canEdit ? '클릭 = 상세 열기 · 더블클릭 = 이름 편집' : undefined}
                                className="text-left text-[#1A1A1A] hover:text-[#A50034] truncate">{it.name}</button>
                            )}
                            {subs.length > 0 && (
                              <span className="font-mono text-[10px] text-[#888780] shrink-0">{subs.length}</span>
                            )}
                          </div>
                          {canEdit && (
                            <span className="inline-flex items-center gap-2 shrink-0 opacity-0 group-hover/it:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); void addSubitem(it); }}
                                className="text-[#888780] hover:text-[#A50034]" title="서브아이템 추가">
                                <CornerDownRight size={13} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); void duplicateItem(it); }}
                                className="text-[#888780] hover:text-[#A50034]" title="아이템 복사">
                                <Copy size={13} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); void removeItem(it.id, it.name); }}
                                className="text-[#888780] hover:text-[#A50034]" title="아이템 삭제">
                                <Trash2 size={13} />
                              </button>
                            </span>
                          )}
                        </div>
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
                              ) : CHOICE_TYPES.includes(col.type) ? (
                                <ChoiceCellEditor col={col} value={cellVal(it.id, col.id)}
                                  onSave={async (v) => { try { await pmApi.setCell(it.id, col.id, v); onChanged(); } catch { /* noop */ } }}
                                  onClose={() => setEditing(null)}
                                  onAddOption={canEdit ? (name) => addChoiceOption(col, name) : undefined} />
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
                    {/* 서브아이템 — 펼침 시에만 표시. 키보드 그리드에는 미포함, 클릭으로 상세 진입 */}
                    {isOpen && subs.map((sub) => (
                      <tr key={`sub-${sub.id}`} className="bg-[#FAFAF7]/60">
                        <td className="border-b border-r border-[#EFEDE6] pl-9 pr-3 py-1 group/sub">
                          <div className="flex items-center justify-between gap-2">
                            {editingItemName?.id === sub.id ? (
                              <div className="flex-1 min-w-0 inline-flex items-center gap-1.5">
                                <CornerDownRight size={11} className="text-[#B8B6AE]" />
                                <input autoFocus value={editingItemName.draft}
                                  onChange={(e) => setEditingItemName({ id: sub.id, draft: e.target.value })}
                                  onBlur={() => commitItemName(sub)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                                    else if (e.key === 'Escape') { e.preventDefault(); setEditingItemName(null); }
                                  }}
                                  className="flex-1 min-w-0 text-[12px] text-[#1A1A1A] outline-none border border-[#A50034] rounded px-1 py-0.5 bg-white" />
                              </div>
                            ) : (
                              <button onClick={() => onOpenItem(sub.id)}
                                onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) setEditingItemName({ id: sub.id, draft: sub.name }); }}
                                title={canEdit ? '클릭 = 상세 열기 · 더블클릭 = 이름 편집' : undefined}
                                className="inline-flex items-center gap-1.5 text-left text-[12px] text-[#5F5E5A] hover:text-[#A50034] truncate">
                                <CornerDownRight size={11} className="text-[#B8B6AE]" /> {sub.name}
                              </button>
                            )}
                            {canEdit && (
                              <button onClick={(e) => { e.stopPropagation(); void removeItem(sub.id, sub.name); }}
                                className="text-[#B8B6AE] hover:text-[#A50034] opacity-0 group-hover/sub:opacity-100 transition-opacity" title="서브아이템 삭제">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        {cols.map((col) => (
                          <td key={col.id} className="border-b border-r border-[#EFEDE6] px-2.5 py-1 align-middle text-[11.5px]">
                            <CellDisplay col={col} value={cellVal(sub.id, col.id)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                    </Fragment>
                  );
                })}
              </Fragment>
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
