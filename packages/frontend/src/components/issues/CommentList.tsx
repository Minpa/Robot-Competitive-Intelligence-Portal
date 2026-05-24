'use client';

import { useState } from 'react';
import { issuesApi, type IssueComment } from '@/lib/issues-api';
import { MessageCircle, Edit2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  ticketCode: string;
  comments: IssueComment[];
  onReload: () => void;
  currentUserId?: string;
}

export function CommentList({ ticketCode, comments, onReload, currentUserId }: Props) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    try {
      await issuesApi.addComment(ticketCode, body.trim());
      setBody('');
      onReload();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const startEdit = (c: IssueComment) => { setEditingId(c.id); setEditBody(c.body); };
  const saveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    try {
      await issuesApi.patchComment(editingId, editBody.trim());
      setEditingId(null); setEditBody('');
      onReload();
    } catch (e: any) { setErr(e.message); }
  };

  const canEdit = (c: IssueComment) => {
    if (c.authorId !== currentUserId) return false;
    const age = (Date.now() - new Date(c.createdAt).getTime()) / 60000;
    return age <= 15;
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-md p-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="코멘트… (작성 후 15분 이내 수정 가능)"
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <div className="flex items-center justify-between mt-2">
          {err && <span className="text-xs text-red-600">{err}</span>}
          <button onClick={submit} disabled={busy || !body.trim()}
            className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
            {busy ? '게시 중…' : '코멘트 게시'}
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">첫 코멘트를 작성하세요.</div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className={cn(
              'border border-slate-200 rounded-md p-3',
              c.isAiGenerated ? 'bg-amber-50/40 border-amber-200' : 'bg-white',
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                {c.isAiGenerated && <Bot className="w-3 h-3 text-amber-600" />}
                <span className="text-xs font-medium text-slate-700">{c.authorEmail ?? '?'}</span>
                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                {c.editedAt && <span className="text-[10px] text-slate-400">(수정됨)</span>}
                {canEdit(c) && editingId !== c.id && (
                  <button onClick={() => startEdit(c)}
                    className="ml-auto text-[10px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5">
                    <Edit2 className="w-2.5 h-2.5" /> 편집
                  </button>
                )}
              </div>
              {editingId === c.id ? (
                <div>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3}
                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400" />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button onClick={saveEdit}
                      className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">저장</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 text-xs text-slate-600">취소</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-800 whitespace-pre-wrap">{c.body}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentListIcon({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <MessageCircle className="w-3 h-3" /> {count}
    </span>
  );
}
