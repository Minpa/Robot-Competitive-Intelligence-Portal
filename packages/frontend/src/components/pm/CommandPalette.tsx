'use client';
// ⌘K 명령 팔레트 (REQ-23) — 전역 단축키로 프로젝트·보드·아이템 빠른 검색·이동.
// PM 페이지 어디서나 마운트만 하면 동작.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, Trello, FileText, X } from 'lucide-react';
import { pmApi } from '@/lib/pm-api';

type ResultItem =
  | { kind: 'project'; id: number; name: string }
  | { kind: 'board'; id: number; name: string; projectId: number }
  | { kind: 'item'; id: number; name: string; projectId: number; boardId: number };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<ResultItem[]>([]);
  const [boards, setBoards] = useState<ResultItem[]>([]);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (!open) return;
    if (!q.trim()) {
      // 빈 검색 시: 최근 프로젝트만
      pmApi.listProjects().then((r) => {
        setProjects(r.projects.slice(0, 10).map((p) => ({ kind: 'project', id: p.id, name: p.name })));
        setBoards([]); setItems([]);
      }).catch(() => {});
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await pmApi.search(q.trim());
        setProjects(r.projects.map((p) => ({ kind: 'project', id: p.id, name: p.name })));
        setBoards(r.boards.map((b) => ({ kind: 'board', id: b.id, name: b.name, projectId: b.projectId })));
        setItems(r.items.map((i: any) => ({ kind: 'item', id: i.id, name: i.name, projectId: i.projectId, boardId: i.boardId })));
        setFocusIdx(0);
      } catch { /* noop */ } finally { setBusy(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const flat = useMemo<ResultItem[]>(() => [...projects, ...boards, ...items], [projects, boards, items]);

  const navigate = useCallback((r: ResultItem) => {
    setOpen(false); setQ('');
    if (r.kind === 'project') router.push(`/projects/${r.id}`);
    else if (r.kind === 'board') router.push(`/boards/${r.id}`);
    else router.push(`/boards/${r.boardId}`);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = flat[focusIdx]; if (r) navigate(r); }
  };

  if (!open) return null;

  let cursor = 0;
  const renderSection = (title: string, list: ResultItem[], Icon: any) => {
    if (!list.length) return null;
    return (
      <div className="mb-2">
        <p className="px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#888780]">{title}</p>
        {list.map((r) => {
          const idx = cursor++;
          const focused = idx === focusIdx;
          return (
            <button key={`${r.kind}-${r.id}`}
              onMouseEnter={() => setFocusIdx(idx)}
              onClick={() => navigate(r)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] ${focused ? 'bg-[#FAEAE7] text-[#1A1A1A]' : 'text-[#5F5E5A] hover:bg-[#FAFAF7]'}`}>
              <Icon size={14} className={focused ? 'text-[#A50034]' : 'text-[#888780]'} />
              <span className="truncate flex-1">{r.name}</span>
              {focused && <span className="font-mono text-[10px] text-[#A50034]">Enter ↵</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: 'rgba(26,26,26,0.55)' }}
      onClick={() => setOpen(false)}>
      <div className="bg-white rounded-lg w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#E2DED4]">
          <Search size={16} className="text-[#888780]" />
          <input
            ref={inputRef}
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="프로젝트·보드·아이템 검색"
            className="flex-1 text-[14px] outline-none placeholder:text-[#B8B6AE]" />
          {busy && <span className="text-[10.5px] text-[#888780]">검색중…</span>}
          <button onClick={() => setOpen(false)} className="text-[#888780] hover:text-[#1A1A1A]"><X size={15} /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto py-2">
          {renderSection('프로젝트', projects, FolderKanban)}
          {renderSection('보드', boards, Trello)}
          {renderSection('아이템', items, FileText)}
          {flat.length === 0 && (
            <p className="px-3 py-8 text-center text-[12.5px] text-[#888780]">
              {q ? '결과가 없습니다.' : '⌘K 또는 Ctrl+K — 어디서나 빠르게 검색·이동'}
            </p>
          )}
        </div>
        <div className="px-3 py-1.5 bg-[#FAFAF7] border-t border-[#E2DED4] text-[10px] font-mono text-[#888780] flex justify-between">
          <span>↑↓ 이동 · Enter 열기 · Esc 닫기</span>
          <span>⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
