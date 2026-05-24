'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  issuesApi, type IssueTicketDetail,
  PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, TYPE_COLOR, TYPE_LABEL,
} from '@/lib/issues-api';
import { api } from '@/lib/api';
import { StatusControls } from '@/components/issues/StatusControls';
import { CommentList } from '@/components/issues/CommentList';
import { LinkList } from '@/components/issues/LinkList';
import { TicketRow } from '@/components/issues/TicketRow';
import { ChevronLeft, Loader2, Sparkles, Activity, MessageCircle, Link2, GitBranch, Edit3, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'comments' | 'activity' | 'links' | 'children';

export default function TicketDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code ?? '';

  const [ticket, setTicket] = useState<IssueTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('comments');
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await issuesApi.getTicket(code);
      setTicket(r.ticket); setErr(null);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { if (code) load(); }, [code, load]);

  useEffect(() => {
    api.getMe().then((r: any) => setMe(r?.user ?? r)).catch(() => {});
  }, []);

  const saveTitle = async () => {
    if (!ticket || !titleDraft.trim() || titleDraft === ticket.title) { setEditingTitle(false); return; }
    try {
      await issuesApi.patchTicket(ticket.id, { title: titleDraft.trim() });
      setEditingTitle(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const saveDesc = async () => {
    if (!ticket || descDraft === ticket.description) { setEditingDesc(false); return; }
    try {
      await issuesApi.patchTicket(ticket.id, { description: descDraft });
      setEditingDesc(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const enrich = async () => {
    if (!ticket) return;
    setEnriching(true);
    try { await issuesApi.enrichTicket(ticket.id); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setEnriching(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">로딩…</div>;
  if (err) return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push('/issues')} className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
        <ChevronLeft className="w-3 h-3" /> 대시보드
      </button>
      <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded">{err}</div>
    </div>
  );
  if (!ticket) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> 뒤로
        </button>
        <span className="text-slate-300">/</span>
        <Link href="/issues" className="text-slate-500 hover:text-slate-900">이슈</Link>
        {ticket.parent && (
          <>
            <span className="text-slate-300">/</span>
            <Link href={`/issues/${ticket.parent.code}`} className="text-slate-500 hover:text-slate-900 font-mono">
              {ticket.parent.code}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono text-xs text-slate-500">{ticket.code}</span>
          <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium', STATUS_COLOR[ticket.status])}>
            {STATUS_LABEL[ticket.status]}
          </span>
          <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium', PRIORITY_COLOR[ticket.priority])}>
            {PRIORITY_LABEL[ticket.priority]}
          </span>
          <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium', TYPE_COLOR[ticket.type])}>
            {TYPE_LABEL[ticket.type]}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>리포터: {ticket.reporter?.email ?? '?'}</span>
            {ticket.owner && <span>· 담당: {ticket.owner.email}</span>}
          </div>
        </div>

        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              className="flex-1 px-2 py-1 text-xl font-semibold border border-slate-300 rounded text-slate-900 placeholder:text-slate-400" />
            <button onClick={saveTitle} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save className="w-4 h-4" /></button>
            <button onClick={() => setEditingTitle(false)} className="p-1 text-slate-500 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-start gap-2 group">
            <h1 className="text-xl font-semibold text-slate-900 flex-1">{ticket.title}</h1>
            <button onClick={() => { setTitleDraft(ticket.title); setEditingTitle(true); }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-opacity">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {ticket.dueAt && (
          <div className="mt-1 text-[11px] text-slate-500">
            마감: {new Date(ticket.dueAt).toLocaleDateString('ko-KR')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs uppercase tracking-wider font-medium text-slate-500">설명</h2>
              {!editingDesc && (
                <button onClick={() => { setDescDraft(ticket.description); setEditingDesc(true); }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5">
                  <Edit3 className="w-3 h-3" /> 편집
                </button>
              )}
            </div>
            {editingDesc ? (
              <div>
                <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={6}
                  className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400" />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={saveDesc} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">저장</button>
                  <button onClick={() => setEditingDesc(false)} className="px-2 py-1 text-xs text-slate-600">취소</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-800 whitespace-pre-wrap min-h-[2.5em]">
                {ticket.description || <span className="text-slate-400 italic">설명 없음</span>}
              </div>
            )}
          </div>

          {/* AI summary / actions */}
          {(ticket.aiSummary || (ticket.aiSuggestedActions && ticket.aiSuggestedActions.length > 0)) && (
            <div className="bg-amber-50/40 border border-amber-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs uppercase tracking-wider font-medium text-amber-700 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> AI 요약
                </h2>
                <button onClick={enrich} disabled={enriching}
                  className="text-[11px] text-amber-700 hover:text-amber-900 inline-flex items-center gap-1">
                  {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  재 생성
                </button>
              </div>
              {ticket.aiSummary && <p className="text-sm text-slate-800 mb-3">{ticket.aiSummary}</p>}
              {ticket.aiSuggestedActions && ticket.aiSuggestedActions.length > 0 && (
                <ul className="space-y-1">
                  {ticket.aiSuggestedActions.map((a, i) => (
                    <li key={i} className="text-[11px] text-slate-700 pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-amber-600">
                      <span className="font-medium">{a.step}</span> — {a.rationale}
                      {a.estimatedEffortHours != null && (
                        <span className="text-slate-500 ml-1">(~{a.estimatedEffortHours}h)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {ticket.aiEnrichedAt && (
                <div className="text-[10px] text-slate-500 mt-2">
                  생성: {new Date(ticket.aiEnrichedAt).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          )}
          {!ticket.aiSummary && !ticket.aiSuggestedActions?.length && (
            <button onClick={enrich} disabled={enriching}
              className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded hover:bg-slate-50">
              {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Claude 로 요약·제안 생성
            </button>
          )}

          {/* Tabs */}
          <div>
            <div className="flex items-center gap-1 border-b border-slate-200">
              {([
                { id: 'comments', label: '코멘트', icon: MessageCircle, count: ticket.comments.length },
                { id: 'activity', label: '활동', icon: Activity, count: ticket.activity.length },
                { id: 'links', label: '링크', icon: Link2, count: ticket.links.length },
                ...(ticket.type === 'epic' ? [{ id: 'children' as Tab, label: '하위 이슈', icon: GitBranch, count: ticket.children.length }] : []),
              ] as Array<{ id: Tab; label: string; icon: any; count: number }>).map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px',
                    tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900',
                  )}>
                  <t.icon className="w-3 h-3" />
                  {t.label}
                  <span className="text-[10px] text-slate-400">({t.count})</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              {tab === 'comments' && (
                <CommentList ticketCode={ticket.code} comments={ticket.comments} onReload={load} currentUserId={me?.id} />
              )}
              {tab === 'activity' && (
                <div className="space-y-1">
                  {ticket.activity.length === 0 && <div className="text-xs text-slate-500 text-center py-4">활동 없음</div>}
                  {ticket.activity.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 text-xs bg-white border border-slate-100 rounded">
                      <span className="font-medium text-slate-700">{a.actionType}</span>
                      <span className="text-slate-500 truncate flex-1">
                        {Object.keys(a.payload ?? {}).length > 0 ? JSON.stringify(a.payload) : ''}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(a.at).toLocaleString('ko-KR')}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'links' && <LinkList ticketCode={ticket.code} links={ticket.links} onReload={load} />}
              {tab === 'children' && ticket.type === 'epic' && (
                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                  {ticket.children.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">하위 이슈 없음 — 자식 이슈 생성 시 부모 코드에 {ticket.code} 입력</div>
                  ) : (
                    ticket.children.map((c) => (
                      <TicketRow key={c.id} ticket={c as any} variant="row" />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <StatusControls ticket={ticket} onReload={load} />
          </div>
          {ticket.linkedCompetitorIds && ticket.linkedCompetitorIds.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2">연결된 경쟁사</h3>
              <div className="text-[11px] text-slate-600">{ticket.linkedCompetitorIds.length}개</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
