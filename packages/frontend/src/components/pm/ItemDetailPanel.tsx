'use client';
// 아이템 상세 패널 — 전체 필드 편집 + Updates 코멘트 스레드 (REQ-13).
import { useEffect, useState } from 'react';
import { X, Send } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn } from '@/lib/pm-api';
import { cellToText, textToCellValue, CellDisplay } from './cells';

interface Props { boardData: BoardData; itemId: number; canEdit: boolean; onClose: () => void; onChanged: () => void; }

export default function ItemDetailPanel({ boardData, itemId, canEdit, onClose, onChanged }: Props) {
  const item = boardData.items.find((i) => i.id === itemId);
  const cols = [...boardData.columns].sort((a, b) => a.orderIndex - b.orderIndex);
  const [updates, setUpdates] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(item?.name ?? '');

  const loadUpdates = () => pmApi.listUpdates(itemId).then((r) => setUpdates(r.updates)).catch(() => {});
  useEffect(() => { loadUpdates(); setName(item?.name ?? ''); }, [itemId]);

  if (!item) return null;
  const cv = (colId: number) => boardData.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value ?? null;

  const saveName = async () => {
    if (canEdit && name.trim() && name !== item.name) { await pmApi.updateItem(itemId, { name: name.trim() }); onChanged(); }
  };
  const saveCell = async (col: PmColumn, raw: string) => {
    if (!canEdit) return;
    await pmApi.setCell(itemId, col.id, textToCellValue(col, raw)); onChanged();
  };
  const postComment = async () => {
    if (!comment.trim()) return;
    await pmApi.addUpdate(itemId, comment.trim()); setComment(''); loadUpdates();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(26,26,26,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-[480px] h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DED4]">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em]">아이템 상세</span>
          <button onClick={onClose} className="text-[#888780] hover:text-[#1A1A1A]"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} disabled={!canEdit}
            className="w-full text-[18px] font-medium text-[#1A1A1A] outline-none border-b border-transparent focus:border-[#A50034] pb-1" />
          <div className="space-y-3">
            {cols.map((col) => (
              <div key={col.id} className="grid grid-cols-3 gap-3 items-center">
                <label className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.1em]">{col.name}</label>
                <div className="col-span-2">
                  {canEdit ? (
                    <input
                      defaultValue={cellToText(col, cv(col.id))}
                      placeholder={col.type}
                      onBlur={(e) => saveCell(col, e.target.value)}
                      className="w-full text-[13px] border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
                  ) : <CellDisplay col={col} value={cv(col.id)} />}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E2DED4]">
            <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">Updates</p>
            <div className="space-y-2 mb-3">
              {updates.length === 0 && <p className="text-[12px] text-[#B8B6AE]">코멘트가 없습니다.</p>}
              {updates.map((u) => (
                <div key={u.id} className="bg-[#FAFAF7] border border-[#EFEDE6] rounded p-2.5">
                  <p className="text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap">{u.body}</p>
                  <p className="font-mono text-[10px] text-[#888780] mt-1">{new Date(u.createdAt).toLocaleString('ko-KR')}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()}
                placeholder="코멘트 추가 (viewer 도 가능)"
                className="flex-1 text-[13px] border border-[#E2DED4] rounded px-3 py-2 outline-none focus:border-[#A50034]" />
              <button onClick={postComment} className="p-2 bg-[#A50034] text-white rounded-md"><Send size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
