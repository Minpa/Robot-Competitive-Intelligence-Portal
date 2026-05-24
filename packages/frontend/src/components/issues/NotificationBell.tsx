'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { issuesApi, type IssueNotification } from '@/lib/issues-api';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  assigned: '담당 배정',
  mentioned: '멘션',
  status_changed: '상태 변경',
  overdue: '마감 임박/지남',
  comment: '코멘트',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<IssueNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try { setItems((await issuesApi.listNotifications()).notifications); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = items.filter(n => !n.readAt).length;

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    try { await issuesApi.markRead(id); } catch {}
  };

  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    try { await issuesApi.markAllRead(); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className="relative p-1.5 rounded-md text-slate-600 hover:bg-slate-100">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-40">
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-900">알림</span>
            <button onClick={markAll} disabled={unread === 0}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40">
              <CheckCheck className="w-3 h-3" />모두 읽음
            </button>
          </div>
          {loading && <div className="px-3 py-6 text-center text-xs text-slate-500">로딩…</div>}
          {!loading && items.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-slate-500">알림 없음</div>
          )}
          {items.map((n) => {
            const href = n.payload?.code ? `/issues/${n.payload.code}` : '#';
            return (
              <Link key={n.id} href={href} onClick={() => markRead(n.id)}
                className={cn(
                  'block px-3 py-2 border-b border-slate-100 hover:bg-slate-50',
                  !n.readAt && 'bg-blue-50/40',
                )}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-900">{TYPE_LABEL[n.type] ?? n.type}</span>
                  {n.payload?.code && (
                    <span className="font-mono text-[10px] text-slate-500">{n.payload.code}</span>
                  )}
                  {!n.readAt && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                  {n.payload?.from && n.payload?.to ? `${n.payload.from} → ${n.payload.to}` : ''}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(n.createdAt).toLocaleString('ko-KR')}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
