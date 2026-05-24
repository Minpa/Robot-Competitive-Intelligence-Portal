'use client';

import { useState } from 'react';
import { issuesApi, type IssueStatus, type Priority, type IssueType, type IssueTicketDetail, STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, TYPE_LABEL } from '@/lib/issues-api';
import { cn } from '@/lib/utils';

const STATUS_GRAPH: Record<IssueStatus, IssueStatus[]> = {
  draft: ['triaged', 'cancelled'],
  triaged: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'done', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: ['in_progress'],
  cancelled: [],
};

interface Props {
  ticket: IssueTicketDetail;
  onReload: () => void;
}

export function StatusControls({ ticket, onReload }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const allowed = STATUS_GRAPH[ticket.status];

  const patch = async (body: any) => {
    setBusy(true); setErr(null);
    try { await issuesApi.patchTicket(ticket.id, body); onReload(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-1.5">상태</h3>
        <div className="flex flex-wrap gap-1">
          <span className={cn('text-[11px] px-2 py-1 rounded font-medium', STATUS_COLOR[ticket.status])}>
            현재: {STATUS_LABEL[ticket.status]}
          </span>
          {allowed.map((s) => (
            <button key={s} onClick={() => patch({ status: s })} disabled={busy}
              className="text-[11px] px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40">
              → {STATUS_LABEL[s]}
            </button>
          ))}
          {allowed.length === 0 && (
            <span className="text-[11px] text-slate-400">전이 불가 (종결 상태)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-1">우선순위</label>
          <select value={ticket.priority} onChange={(e) => patch({ priority: e.target.value as Priority })} disabled={busy}
            className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-slate-900">
            {(['H','M','L'] as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-1">유형</label>
          <select value={ticket.type} onChange={(e) => patch({ type: e.target.value as IssueType })} disabled={busy}
            className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-slate-900">
            {(['task','research','response','epic'] as IssueType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-1">마감일</label>
        <input type="date"
          value={ticket.dueAt ? ticket.dueAt.slice(0, 10) : ''}
          onChange={(e) => patch({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          disabled={busy}
          className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-slate-900" />
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
