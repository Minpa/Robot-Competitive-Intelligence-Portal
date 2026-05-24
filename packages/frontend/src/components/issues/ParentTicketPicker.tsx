'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import {
  issuesApi, type IssueTicket,
  STATUS_LABEL, STATUS_COLOR, TYPE_LABEL, TYPE_COLOR,
} from '@/lib/issues-api';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  /** depth-2 룰: 자기 자신 또는 이미 자식인 티켓은 부모로 선택 불가 (백엔드도 검증) */
  excludeCode?: string;
}

export function ParentTicketPicker({ value, onChange, placeholder, excludeCode }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<IssueTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (q.trim()) {
        const r = await issuesApi.search(q.trim());
        setItems(r.items);
      } else {
        // 비어 있을 때: 최신 티켓 30개 — Epic 우선 정렬
        const r = await issuesApi.listTickets({ limit: 30 });
        const sorted = [...r.items].sort((a, b) => {
          if (a.type === 'epic' && b.type !== 'epic') return -1;
          if (a.type !== 'epic' && b.type === 'epic') return 1;
          return 0;
        });
        setItems(sorted);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = items.filter((t) => {
    if (excludeCode && t.code === excludeCode) return false;
    // parentTicketId 가 있는 (이미 자식인) 티켓은 부모로 선택 불가 — depth-2
    if (t.parentTicketId) return false;
    return true;
  });

  const clear = () => { onChange(''); setQ(''); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-left flex items-center gap-2 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500">
        {value ? (
          <>
            <span className="font-mono text-slate-900">{value}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }}
              className="ml-auto p-0.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-400">{placeholder ?? '부모 이슈 선택…'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-80 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="코드 또는 제목 검색 (예: ARG-001, Figure)"
              className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="px-3 py-4 text-center text-xs text-slate-500">검색 중…</div>}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                {q.trim() ? '검색 결과 없음' : '선택 가능한 이슈 없음'}
              </div>
            )}
            {!loading && filtered.map((t) => (
              <button key={t.id} type="button"
                onClick={() => { onChange(t.code); setOpen(false); setQ(''); }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-left border-b border-slate-50">
                <span className="font-mono text-[11px] text-slate-500 w-16 shrink-0">{t.code}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', TYPE_COLOR[t.type])}>
                  {TYPE_LABEL[t.type]}
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', STATUS_COLOR[t.status])}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-xs text-slate-800 flex-1 truncate">{t.title}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-500 bg-slate-50">
            depth-2 룰 — Epic 우선 표시, 이미 자식인 티켓은 제외됨
          </div>
        </div>
      )}
    </div>
  );
}
