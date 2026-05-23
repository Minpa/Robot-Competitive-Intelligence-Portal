'use client';
// 아이템 상세 패널 — 전체 필드 편집 + Updates 코멘트 스레드 (REQ-13).
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, CornerDownRight, Plus, Trash2, Pencil, ArrowUpFromLine } from 'lucide-react';
import { pmApi, type BoardData, type PmColumn } from '@/lib/pm-api';
import { cellToText, textToCellValue, CellDisplay, DateCellEditor, ChoiceCellEditor, STATUS_PALETTE } from './cells';

const CHOICE_TYPES = ['status', 'priority', 'dropdown'];

interface Props {
  boardData: BoardData;
  itemId: number;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
  onOpenItem?: (id: number) => void; // 서브아이템 클릭 시 부모 페이지가 열고 있는 아이템 전환
}

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

export default function ItemDetailPanel({ boardData, itemId, canEdit, onClose, onChanged, onOpenItem }: Props) {
  const item = boardData.items.find((i) => i.id === itemId);
  const cols = [...boardData.columns].sort((a, b) => a.orderIndex - b.orderIndex);
  const subitems = useMemo(
    () => boardData.items.filter((i) => i.parentItemId === itemId).sort((a, b) => a.orderIndex - b.orderIndex),
    [boardData.items, itemId],
  );
  const [updates, setUpdates] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(item?.name ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSubitemName, setNewSubitemName] = useState('');
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
    if (canEdit && name.trim() && item && name !== item.name) { await pmApi.updateItem(itemId, { name: name.trim() }); onChanged(); }
  };
  const moveToGroup = async (newGroupId: number) => {
    if (!canEdit || !item || newGroupId === item.groupId) return;
    try { await pmApi.updateItem(itemId, { groupId: newGroupId }); onChanged(); }
    catch (e: any) { setError(`그룹 이동 실패: ${e?.message ?? ''}`); }
  };
  const promoteToTop = async () => {
    if (!canEdit || !item?.parentItemId) return;
    if (!confirm('이 서브아이템을 최상위 아이템으로 승격할까요?')) return;
    try { await pmApi.updateItem(itemId, { parentItemId: null as any }); onChanged(); }
    catch (e: any) { setError(`승격 실패: ${e?.message ?? ''}`); }
  };
  const saveCell = async (col: PmColumn, raw: string) => {
    if (!canEdit) return;
    await pmApi.setCell(itemId, col.id, textToCellValue(col, raw)); onChanged();
  };
  const saveCellValue = async (col: PmColumn, value: any) => {
    if (!canEdit) return;
    await pmApi.setCell(itemId, col.id, value); onChanged();
  };
  // 선택형 컬럼에 새 옵션 추가 후 그 id 반환 (재사용 가능)
  const addChoiceOption = async (col: PmColumn, name: string): Promise<number | null> => {
    if (!canEdit) return null;
    const isDropdown = col.type === 'dropdown';
    const cur: any[] = isDropdown ? (col.settings?.options || []) : (col.settings?.labels || []);
    if (cur.some((o) => o.name === name)) return cur.find((o) => o.name === name)?.id ?? null;
    const id = cur.reduce((m, o) => Math.max(m, o.id || 0), 0) + 1;
    const entry = isDropdown ? { id, name } : { id, name, color: STATUS_PALETTE[(id - 1) % STATUS_PALETTE.length] };
    const settings = { ...(col.settings || {}), [isDropdown ? 'options' : 'labels']: [...cur, entry] };
    try { await pmApi.updateColumn(col.id, { settings }); onChanged(); return id; } catch { return null; }
  };
  const addSubitem = async () => {
    if (!canEdit || !item) return;
    const name = newSubitemName.trim() || '새 서브아이템';
    try {
      await pmApi.createItem(item.groupId, { name, parentItemId: itemId });
      setNewSubitemName('');
      onChanged();
    } catch (e: any) { setError(`서브아이템 추가 실패: ${e?.message ?? ''}`); }
  };

  const removeItem = async () => {
    if (!canEdit || !item) return;
    const subCount = subitems.length;
    const msg = subCount > 0
      ? `'${item.name}' 을(를) 삭제할까요? 서브아이템 ${subCount}개도 함께 삭제됩니다.`
      : `'${item.name}' 을(를) 삭제할까요?`;
    if (!confirm(msg)) return;
    try {
      await pmApi.deleteItem(itemId);
      onChanged();
      onClose();
    } catch (e: any) { setError(`삭제 실패: ${e?.message ?? ''}`); }
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
          <div className="flex items-center gap-3">
            {canEdit && (
              <button onClick={removeItem} aria-label="아이템 삭제" title="아이템 삭제"
                className="inline-flex items-center gap-1 text-[11.5px] text-[#888780] hover:text-[#A50034]">
                <Trash2 size={14} /> 삭제
              </button>
            )}
            <button onClick={onClose} aria-label="닫기" className="text-[#888780] hover:text-[#1A1A1A]"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="group">
            <div className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') setName(item?.name ?? ''); }}
                disabled={!canEdit}
                placeholder="아이템 이름"
                className="flex-1 text-[18px] font-medium text-[#1A1A1A] placeholder:text-[#B8B6AE] outline-none border border-transparent hover:border-[#E2DED4] focus:border-[#A50034] rounded px-1.5 py-1 -mx-1.5 transition-colors disabled:hover:border-transparent" />
              {canEdit && (
                <Pencil size={13} className="text-[#B8B6AE] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </div>
            {canEdit && (
              <p className="font-mono text-[10px] text-[#888780] mt-1">클릭하여 편집 · Enter 저장 · Esc 취소</p>
            )}
          </div>

          {/* 그룹 이동 + 서브 → 최상위 승격 */}
          <div className="flex items-center gap-2 pb-1 border-b border-[#EFEDE6]">
            <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.1em] shrink-0">그룹</span>
            <select value={item?.groupId ?? ''}
              onChange={(e) => moveToGroup(Number(e.target.value))}
              disabled={!canEdit}
              className="flex-1 text-[12.5px] text-[#1A1A1A] border border-[#E2DED4] rounded px-2 py-1 outline-none focus:border-[#A50034] disabled:bg-[#FAFAF7]">
              {boardData.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {canEdit && item?.parentItemId != null && (
              <button onClick={promoteToTop} title="이 서브아이템을 최상위 아이템으로 승격"
                className="inline-flex items-center gap-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034] px-2 py-1 border border-[#D3D1C7] hover:border-[#A50034] rounded">
                <ArrowUpFromLine size={11} /> 최상위로
              </button>
            )}
          </div>
          <div className="space-y-3">
            {cols.map((col) => (
              <div key={col.id} className="grid grid-cols-3 gap-3 items-start">
                <label className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.1em] pt-1.5">{col.name}</label>
                <div className="col-span-2">
                  {!canEdit ? (
                    <CellDisplay col={col} value={cv(col.id)} />
                  ) : col.type === 'timeline' || col.type === 'date' ? (
                    <DateCellEditor col={col} value={cv(col.id)} autoFocus={false}
                      onSave={(val) => saveCellValue(col, val)} />
                  ) : CHOICE_TYPES.includes(col.type) ? (
                    <ChoiceCellEditor col={col} value={cv(col.id)}
                      onSave={(val) => saveCellValue(col, val)}
                      onAddOption={(name) => addChoiceOption(col, name)} />
                  ) : (
                    <input
                      key={`${itemId}-${col.id}-${JSON.stringify(cv(col.id))}`}
                      defaultValue={cellToText(col, cv(col.id))}
                      placeholder={TYPE_PLACEHOLDER[col.type] ?? '입력'}
                      onBlur={(e) => saveCell(col, e.target.value)}
                      className="w-full text-[13px] text-[#1A1A1A] placeholder:text-[#B8B6AE] border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E2DED4]">
            <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">
              서브아이템 <span className="text-[#5F5E5A] normal-case">{subitems.length > 0 && `· ${subitems.length}`}</span>
            </p>
            <div className="space-y-1.5 mb-2">
              {subitems.length === 0 && <p className="text-[12px] text-[#B8B6AE]">서브아이템이 없습니다.</p>}
              {subitems.map((s) => (
                <button key={s.id}
                  onClick={() => onOpenItem ? onOpenItem(s.id) : undefined}
                  disabled={!onOpenItem}
                  className="w-full text-left inline-flex items-center gap-2 px-2 py-1.5 bg-[#FAFAF7] border border-[#EFEDE6] rounded hover:border-[#A50034] disabled:hover:border-[#EFEDE6] text-[12.5px] text-[#1A1A1A]">
                  <CornerDownRight size={12} className="text-[#B8B6AE] shrink-0" />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <input
                  value={newSubitemName}
                  onChange={(e) => setNewSubitemName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubitem(); } }}
                  placeholder="서브아이템 이름 (Enter 추가)"
                  className="flex-1 text-[12.5px] border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
                <button onClick={addSubitem} aria-label="서브아이템 추가"
                  className="inline-flex items-center gap-1 px-2 py-1.5 bg-[#A50034] text-white text-[11.5px] rounded">
                  <Plus size={12} /> 추가
                </button>
              </div>
            )}
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
