'use client';

import { useState } from 'react';
import Link from 'next/link';
import { issuesApi, type IssueLink, type LinkRelation, LINK_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/lib/issues-api';
import { Trash2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  ticketCode: string;
  links: IssueLink[];
  onReload: () => void;
}

export function LinkList({ ticketCode, links, onReload }: Props) {
  const [toCode, setToCode] = useState('');
  const [relation, setRelation] = useState<LinkRelation>('relates_to');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    if (!toCode.trim()) return;
    setBusy(true); setErr(null);
    try {
      await issuesApi.addLink(ticketCode, toCode.trim(), relation);
      setToCode(''); onReload();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (linkId: string) => {
    if (!confirm('링크를 삭제하시겠습니까?')) return;
    try { await issuesApi.deleteLink(linkId); onReload(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-md p-3">
        <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2">링크 추가</h3>
        <div className="flex items-center gap-2">
          <input value={toCode} onChange={(e) => setToCode(e.target.value)}
            placeholder="ARG-NNN"
            className="px-2 py-1 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 w-32 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <select value={relation} onChange={(e) => setRelation(e.target.value as LinkRelation)}
            className="px-2 py-1 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400">
            <option value="blocks">차단함 (blocks)</option>
            <option value="duplicates">중복 (duplicates)</option>
            <option value="relates_to">관련 (relates_to)</option>
          </select>
          <button onClick={add} disabled={busy || !toCode.trim()}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> 추가
          </button>
        </div>
        {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
      </div>

      {links.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">아직 링크된 이슈가 없습니다.</div>
      ) : (
        <div className="space-y-1">
          {links.map((l) => (
            <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded">
              {l.direction === 'outgoing'
                ? <ArrowRight className="w-3 h-3 text-slate-400" />
                : <ArrowLeft className="w-3 h-3 text-slate-400" />}
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{LINK_LABEL[l.relation]}</span>
              {l.otherTicket && (
                <>
                  <Link href={`/issues/${l.otherTicket.code}`}
                    className="font-mono text-[11px] text-blue-600 hover:underline">
                    {l.otherTicket.code}
                  </Link>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded', STATUS_COLOR[l.otherTicket.status])}>
                    {STATUS_LABEL[l.otherTicket.status]}
                  </span>
                  <span className="text-xs text-slate-700 truncate flex-1">{l.otherTicket.title}</span>
                </>
              )}
              <button onClick={() => remove(l.id)}
                className="text-slate-400 hover:text-red-600 p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
