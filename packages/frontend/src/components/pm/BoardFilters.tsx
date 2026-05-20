'use client';
// 보드 내 필터·정렬 (REQ-15) — Table/Timeline 공통.
// status·priority 라벨 칩, 검색 텍스트, 정렬 기준. 상태는 부모 페이지가 보관.
import { useMemo } from 'react';
import { Filter, ArrowDownAZ, X } from 'lucide-react';
import type { BoardData, PmColumn } from '@/lib/pm-api';

export type SortKey = 'order' | 'name_asc' | 'name_desc' | 'start_asc' | 'start_desc' | 'priority_high' | 'status';

export interface BoardFilterState {
  search: string;
  statusLabelIds: number[];      // 선택된 status 라벨 id
  priorityLabelIds: number[];    // 선택된 priority 라벨 id
  sort: SortKey;
}

export const emptyFilters: BoardFilterState = {
  search: '', statusLabelIds: [], priorityLabelIds: [], sort: 'order',
};

const SORT_LABELS: Record<SortKey, string> = {
  order: '기본 순서',
  name_asc: '이름 (가나다)',
  name_desc: '이름 (역순)',
  start_asc: '시작일 빠른 순',
  start_desc: '시작일 늦은 순',
  priority_high: '우선순위 높은 순',
  status: '상태순',
};

function labelsOf(col?: PmColumn): Array<{ id: number; name: string; color: string }> {
  return (col?.settings?.labels ?? []) as any[];
}

interface Props { data: BoardData; value: BoardFilterState; onChange: (v: BoardFilterState) => void; }

export default function BoardFilters({ data, value, onChange }: Props) {
  const statusCol = useMemo(() => data.columns.find((c) => c.type === 'status'), [data.columns]);
  const priorityCol = useMemo(() => data.columns.find((c) => c.type === 'priority'), [data.columns]);
  const active = value.search || value.statusLabelIds.length || value.priorityLabelIds.length || value.sort !== 'order';

  const toggleStatus = (lid: number) => onChange({
    ...value,
    statusLabelIds: value.statusLabelIds.includes(lid)
      ? value.statusLabelIds.filter((x) => x !== lid)
      : [...value.statusLabelIds, lid],
  });
  const togglePriority = (lid: number) => onChange({
    ...value,
    priorityLabelIds: value.priorityLabelIds.includes(lid)
      ? value.priorityLabelIds.filter((x) => x !== lid)
      : [...value.priorityLabelIds, lid],
  });

  return (
    <div className="bg-white border border-[#E2DED4] rounded-md p-2.5 mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
      <Filter size={14} className="text-[#888780]" />
      <input
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="아이템 이름 검색"
        className="border border-[#E2DED4] rounded px-2 py-1 outline-none focus:border-[#A50034] w-48"
      />
      {statusCol && labelsOf(statusCol).length > 0 && (
        <div className="inline-flex items-center gap-1">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em] mr-0.5">상태</span>
          {labelsOf(statusCol).map((l) => {
            const sel = value.statusLabelIds.includes(l.id);
            return (
              <button key={l.id} onClick={() => toggleStatus(l.id)}
                className="text-[11px] px-2 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: l.color || '#D3D1C7',
                  backgroundColor: sel ? l.color || '#888780' : 'transparent',
                  color: sel ? '#FFFFFF' : l.color || '#5F5E5A',
                }}>
                {l.name}
              </button>
            );
          })}
        </div>
      )}
      {priorityCol && labelsOf(priorityCol).length > 0 && (
        <div className="inline-flex items-center gap-1">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em] mr-0.5">우선순위</span>
          {labelsOf(priorityCol).map((l) => {
            const sel = value.priorityLabelIds.includes(l.id);
            return (
              <button key={l.id} onClick={() => togglePriority(l.id)}
                className="text-[11px] px-2 py-0.5 rounded border transition-colors"
                style={{
                  borderColor: l.color || '#D3D1C7',
                  backgroundColor: sel ? l.color || '#888780' : 'transparent',
                  color: sel ? '#FFFFFF' : l.color || '#5F5E5A',
                }}>
                {l.name}
              </button>
            );
          })}
        </div>
      )}
      <span className="inline-flex items-center gap-1 ml-auto">
        <ArrowDownAZ size={13} className="text-[#888780]" />
        <select value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value as SortKey })}
          className="text-[12px] border border-[#E2DED4] rounded px-2 py-1 outline-none">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
        </select>
      </span>
      {active && (
        <button onClick={() => onChange(emptyFilters)}
          className="inline-flex items-center gap-1 text-[11px] text-[#A50034] hover:underline">
          <X size={11} /> 초기화
        </button>
      )}
    </div>
  );
}

// ── 필터·정렬을 BoardData 에 적용 ──
export function applyFilters(data: BoardData, f: BoardFilterState): BoardData {
  const statusCol = data.columns.find((c) => c.type === 'status');
  const priorityCol = data.columns.find((c) => c.type === 'priority');
  const tCol = data.columns.find((c) => c.type === 'timeline');
  const cv = (itemId: number, colId?: number) => colId ? data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value : null;

  let items = data.items.slice();

  // search
  if (f.search) {
    const q = f.search.toLowerCase();
    items = items.filter((it) => it.name.toLowerCase().includes(q));
  }
  // status
  if (f.statusLabelIds.length && statusCol) {
    items = items.filter((it) => {
      const v = cv(it.id, statusCol.id);
      return v?.label_id != null && f.statusLabelIds.includes(v.label_id);
    });
  }
  // priority
  if (f.priorityLabelIds.length && priorityCol) {
    items = items.filter((it) => {
      const v = cv(it.id, priorityCol.id);
      return v?.label_id != null && f.priorityLabelIds.includes(v.label_id);
    });
  }
  // sort
  const cmp = (a: any, b: any) => (a == null ? 1 : b == null ? -1 : a < b ? -1 : a > b ? 1 : 0);
  if (f.sort === 'name_asc') items.sort((a, b) => cmp(a.name, b.name));
  else if (f.sort === 'name_desc') items.sort((a, b) => cmp(b.name, a.name));
  else if (f.sort === 'start_asc' && tCol) items.sort((a, b) => cmp(cv(a.id, tCol.id)?.start, cv(b.id, tCol.id)?.start));
  else if (f.sort === 'start_desc' && tCol) items.sort((a, b) => cmp(cv(b.id, tCol.id)?.start, cv(a.id, tCol.id)?.start));
  else if (f.sort === 'priority_high' && priorityCol) items.sort((a, b) => cmp(cv(a.id, priorityCol.id)?.label_id, cv(b.id, priorityCol.id)?.label_id));
  else if (f.sort === 'status' && statusCol) items.sort((a, b) => cmp(cv(a.id, statusCol.id)?.label_id, cv(b.id, statusCol.id)?.label_id));

  return { ...data, items };
}
