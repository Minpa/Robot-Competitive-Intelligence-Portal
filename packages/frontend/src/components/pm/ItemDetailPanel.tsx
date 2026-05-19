'use client';
// 아이템 상세 패널 — 전체 필드 편집 + Updates 코멘트 스레드 (REQ-13).
import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn } from '@/lib/pm-api';
import { cellToText, textToCellValue, CellDisplay } from './cells';

interface Props { boardData: BoardData; itemId: number; canEdit: boolean; onClose: () => void; onChanged: () => void; }

// 필드 타입 → 한글 placeholder (내부 타입명 노출 방지)
const TYPE_PLACEHOLDER: Record<string, string> = {
  text: '내용 입력', number: '숫자 입력', date: '날짜 선택',
  status: '상태 선택', person: '담당자', select: '선택',
};

function authorName(email?: string | null) {
  if (!email) return '알 수 없음';
  return email.split('@')[0];
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function ItemDetailPanel({ boardData, itemId, canEdit, onClose, onChanged }: Props) {
  const item = boardData.items.find((i) => i.id === itemId);
  const cols = [...boardData.columns].sort((a, b) => a.orderIndex - b.orderIndex);
  const [updates, setUpdates] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(item?.name ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadUpdates = () => pmApi.listUpdates(itemId).then((r) => setUpdates(r.updates)).catch(() => {});
  useEffect(() => { loadUpdates(); setName(item?.name ?? ''); }, [itemId]);

  // ESC 로 패널 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    const body = comment.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await pmApi.addUpdate(itemId, body);
      setComment('');
      await loadUpdates();
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); // 최신순 정렬 → 맨 위
    } catch {
      setError('코멘트 전송에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(26,26,26,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-[480px] h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DED4]">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em]">아이템 상세</span>
          <button onClick={onClose} aria-label="닫기" className="text-[#888780] hover:text-[#1A1A1A]"><X size={18} /></button>
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
                      placeholder={TYPE_PLACEHOLDER[col.type] ?? '입력'}
                      onBlur={(e) => saveCell(col, e.target.value)}
                      className="w-full text-[13px] border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
                  ) : <CellDisplay col={col} value={cv(col.id)} />}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E2DED4]">
            <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">Updates</p>
            <div ref={listRef} className="space-y-2 mb-3 max-h-[40vh] overflow-y-auto">
              {updates.length === 0 && <p className="text-[12px] text-[#B8B6AE]">코멘트가 없습니다.</p>}
              {updates.map((u) => {
                const who = authorName(u.authorEmail);
                return (
                  <div key={u.id} className="bg-[#FAFAF7] border border-[#EFEDE6] rounded p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#A50034] text-white text-[10px] font-medium uppercase">
                        {who.charAt(0)}
                      </span>
                      <span className="text-[12px] font-medium text-[#1A1A1A]">{who}</span>
                      <span
                        className="font-mono text-[10px] text-[#888780]"
                        title={new Date(u.createdAt).toLocaleString('ko-KR')}>
                        {relTime(u.createdAt)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap">{u.body}</p>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-[11.5px] text-[#A50034] mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); }
                }}
                rows={2}
                placeholder="코멘트 추가 (viewer 도 가능) · Enter 전송, Shift+Enter 줄바꿈"
                className="flex-1 text-[13px] border border-[#E2DED4] rounded px-3 py-2 outline-none resize-none focus:border-[#A50034]" />
              <button
                onClick={postComment}
                disabled={sending || !comment.trim()}
                aria-label="코멘트 전송"
                className="p-2 bg-[#A50034] text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
