'use client';
// 저장된 뷰 (REQ-12) — 현재 뷰 타입 + 필터 상태를 이름 붙여 저장·로드.
// 백엔드 /boards/:id/views (GET/POST/PUT/DELETE) 재사용.
import { useEffect, useRef, useState } from 'react';
import { Bookmark, Star, Trash2, Save, X } from 'lucide-react';
import { pmApi, type PmView } from '@/lib/pm-api';
import type { BoardFilterState } from './BoardFilters';

export type ViewKind = 'table' | 'timeline' | 'kanban' | 'calendar';
export interface SavedViewConfig { filters: BoardFilterState; }

interface Props {
  boardId: number;
  currentView: ViewKind;
  currentFilters: BoardFilterState;
  canEdit: boolean;
  onApply: (kind: ViewKind, filters: BoardFilterState) => void;
}

export default function SavedViewsMenu({ boardId, currentView, currentFilters, canEdit, onApply }: Props) {
  const [views, setViews] = useState<PmView[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'shared' | 'personal'>('shared');
  const rootRef = useRef<HTMLDivElement>(null);

  const load = () => pmApi.listViews(boardId).then((r) => setViews(r.views)).catch(() => {});
  useEffect(() => { load(); }, [boardId]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, [open]);

  // 최초 마운트 시 기본 뷰가 있으면 자동 적용 (1회)
  const appliedDefaultRef = useRef(false);
  useEffect(() => {
    if (appliedDefaultRef.current || views.length === 0) return;
    const def = views.find((v) => v.isDefault);
    if (def) {
      apply(def);
      appliedDefaultRef.current = true;
    }
  }, [views]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (v: PmView) => {
    const cfg = (v.config ?? {}) as SavedViewConfig;
    onApply(v.type as ViewKind, cfg.filters ?? currentFilters);
    setOpen(false);
  };

  const saveCurrent = async () => {
    if (!name.trim()) return;
    try {
      await pmApi.createView(boardId, {
        name: name.trim(),
        type: currentView,
        config: { filters: currentFilters } as any,
        scope,
        isDefault: false,
      });
      setName(''); setSaving(false); load();
    } catch { /* noop */ }
  };

  const setDefault = async (v: PmView) => {
    // 동일 보드의 다른 default 는 해제
    for (const other of views.filter((x) => x.isDefault && x.id !== v.id)) {
      try { await pmApi.updateView(other.id, { isDefault: false }); } catch {}
    }
    try { await pmApi.updateView(v.id, { isDefault: true }); load(); } catch {}
  };

  const remove = async (v: PmView) => {
    if (!confirm(`'${v.name}' 뷰를 삭제할까요?`)) return;
    try { await pmApi.deleteView(v.id); load(); } catch {}
  };

  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-[#5F5E5A] border border-[#D3D1C7] rounded-md hover:border-[#A50034]">
        <Bookmark size={13} /> 저장된 뷰 {views.length > 0 && <span className="font-mono text-[10px] text-[#888780]">({views.length})</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[280px] bg-white border border-[#E2DED4] rounded-md shadow-lg z-30 text-[12.5px]">
          <div className="max-h-[280px] overflow-y-auto">
            {views.length === 0 && <p className="px-3 py-3 text-[#B8B6AE] text-[12px]">저장된 뷰가 없습니다.</p>}
            {views.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-[#FAFAF7] group">
                <button onClick={() => apply(v)} className="flex-1 text-left inline-flex items-center gap-2 min-w-0">
                  {v.isDefault ? <Star size={11} className="text-[#D4A22F] fill-[#D4A22F] shrink-0" /> : <span className="w-3 shrink-0" />}
                  <span className="truncate text-[#1A1A1A]">{v.name}</span>
                  <span className="font-mono text-[10px] text-[#888780] shrink-0">{v.type}{v.scope === 'personal' ? ' · 개인' : ''}</span>
                </button>
                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setDefault(v)} title="기본 뷰로 설정" className="text-[#888780] hover:text-[#D4A22F]"><Star size={12} /></button>
                    <button onClick={() => remove(v)} title="삭제" className="text-[#888780] hover:text-[#A50034]"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="border-t border-[#E2DED4] p-2">
              {saving ? (
                <div className="space-y-2">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveCurrent(); if (e.key === 'Escape') setSaving(false); }}
                    placeholder="뷰 이름"
                    className="w-full text-[12.5px] border border-[#E2DED4] rounded px-2 py-1 outline-none focus:border-[#A50034]" />
                  <div className="flex items-center justify-between">
                    <select value={scope} onChange={(e) => setScope(e.target.value as any)}
                      className="text-[11px] border border-[#E2DED4] rounded px-1.5 py-0.5">
                      <option value="shared">공유</option>
                      <option value="personal">개인</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSaving(false)} className="p-1 text-[#888780]"><X size={13} /></button>
                      <button onClick={saveCurrent}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#A50034] text-white text-[11px] rounded">
                        <Save size={11} /> 저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => setSaving(true)}
                  className="w-full inline-flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-[#5F5E5A] hover:text-[#A50034] hover:bg-[#FAEAE7]/40 rounded">
                  <Save size={12} /> 현재 상태를 새 뷰로 저장
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
