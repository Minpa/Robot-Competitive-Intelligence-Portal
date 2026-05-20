'use client';
// Kanban 뷰 (REQ-09) — status(또는 priority) 라벨 기준 칼럼 분할, 카드 드래그로 값 변경.
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn, type PmItem } from '@/lib/pm-api';
import { cellToText } from './cells';

interface Props { data: BoardData; canEdit: boolean; onChanged: () => void; onOpenItem: (id: number) => void; }

interface Label { id: number; name: string; color: string; }

export default function KanbanView({ data, canEdit, onChanged, onOpenItem }: Props) {
  // 그룹화 기준 컬럼 선택 — 기본 status, 없으면 priority, 둘 다 없으면 안내
  const labelCols = useMemo(
    () => data.columns.filter((c) => c.type === 'status' || c.type === 'priority').sort((a, b) => a.orderIndex - b.orderIndex),
    [data.columns],
  );
  const [groupColId, setGroupColId] = useState<number | null>(labelCols[0]?.id ?? null);
  const groupCol = labelCols.find((c) => c.id === groupColId) ?? labelCols[0] ?? null;

  const labels: Label[] = (groupCol?.settings?.labels ?? []) as Label[];
  const cv = (itemId: number, colId: number) => data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value;
  const tCol = data.columns.find((c) => c.type === 'timeline');

  // 카드 = 보드의 top-level items (서브아이템 제외)
  const items = useMemo(() => data.items.filter((i) => !i.parentItemId), [data.items]);
  const groupName = useMemo(() => new Map(data.groups.map((g) => [g.id, g.name])), [data.groups]);

  const moveCard = async (itemId: number, labelId: number | null) => {
    if (!canEdit || !groupCol) return;
    try {
      await pmApi.setCell(itemId, groupCol.id, labelId == null ? {} : { label_id: labelId });
      onChanged();
    } catch { /* noop */ }
  };

  if (!groupCol) {
    return (
      <div className="bg-white border border-[#E2DED4] rounded-lg p-8 text-center text-[13px] text-[#888780]">
        Kanban 뷰는 <b>status</b> 또는 <b>priority</b> 타입 컬럼이 필요합니다. Table 뷰에서 컬럼을 추가하세요.
      </div>
    );
  }

  const cardsFor = (labelId: number | null) =>
    items.filter((i) => {
      const v = cv(i.id, groupCol.id);
      const lid = v?.label_id ?? null;
      return lid === labelId;
    });

  return (
    <div className="bg-white border border-[#E2DED4] rounded-lg p-3">
      {labelCols.length > 1 && (
        <div className="flex items-center gap-2 mb-3 text-[12px]">
          <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">그룹화 기준</span>
          <select value={groupColId ?? ''} onChange={(e) => setGroupColId(Number(e.target.value))}
            className="border border-[#E2DED4] rounded px-2 py-1 outline-none">
            {labelCols.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex gap-3" style={{ minWidth: (labels.length + 1) * 280 }}>
          {[...labels, null].map((lab, idx) => {
            const labelId = lab?.id ?? null;
            const cards = cardsFor(labelId);
            const title = lab?.name ?? '라벨 없음';
            const bg = lab?.color ?? '#888780';
            return (
              <KanbanColumn key={lab?.id ?? `none-${idx}`}
                title={title} count={cards.length} color={bg}
                canEdit={canEdit}
                onDropCard={(itemId) => void moveCard(itemId, labelId)}>
                {cards.map((it) => (
                  <Card key={it.id} item={it}
                    timelineText={tCol ? cellToText(tCol, cv(it.id, tCol.id)) : ''}
                    groupName={groupName.get(it.groupId)}
                    onOpen={() => onOpenItem(it.id)} canEdit={canEdit} />
                ))}
                {cards.length === 0 && <p className="text-[11px] text-[#B8B6AE] py-2 text-center">비어 있음</p>}
              </KanbanColumn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  title, count, color, canEdit, onDropCard, children,
}: {
  title: string; count: number; color: string; canEdit: boolean;
  onDropCard: (itemId: number) => void; children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div className="shrink-0 w-[268px] bg-[#FAFAF7] border border-[#E2DED4] rounded-md flex flex-col"
      onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const id = Number(e.dataTransfer.getData('text/pm-item-id'));
        if (id) onDropCard(id);
      }}>
      <div className="px-3 py-2 border-b border-[#E2DED4] flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-medium text-[12.5px] text-[#1A1A1A]">{title}</span>
        <span className="font-mono text-[10.5px] text-[#888780] ml-auto">{count}</span>
      </div>
      <div className={`p-2 space-y-2 min-h-[120px] flex-1 transition-colors ${over ? 'bg-[#FAEAE7]/40' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function Card({
  item, timelineText, groupName, onOpen, canEdit,
}: {
  item: PmItem; timelineText: string; groupName?: string; onOpen: () => void; canEdit: boolean;
}) {
  return (
    <button
      draggable={canEdit}
      onDragStart={(e) => e.dataTransfer.setData('text/pm-item-id', String(item.id))}
      onClick={onOpen}
      className="w-full text-left bg-white border border-[#E2DED4] rounded p-2.5 hover:border-[#A50034] hover:shadow-sm transition-all cursor-grab active:cursor-grabbing">
      <p className="font-medium text-[12.5px] text-[#1A1A1A] line-clamp-2">{item.name}</p>
      <div className="flex items-center justify-between mt-1 text-[10.5px] text-[#888780] font-mono">
        {groupName && <span className="truncate">{groupName}</span>}
        {timelineText && <span className="shrink-0 ml-2">{timelineText.split(' ~ ')[0]}</span>}
      </div>
    </button>
  );
}
