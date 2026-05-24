'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  issuesApi, type AskResult, type AskLookupAnswer, type AskDraft,
  type IssueType, type Priority, PRIORITY_LABEL, TYPE_LABEL, STATUS_LABEL, STATUS_COLOR,
} from '@/lib/issues-api';
import { cn } from '@/lib/utils';
import { CheckCircle2, ExternalLink, Sparkles, Building2, ArrowRight } from 'lucide-react';

export function LookupAnswerPanel({ answer, fallbackLabel, onCreateTicket }: {
  answer: AskLookupAnswer;
  fallbackLabel?: string;
  onCreateTicket: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">조회 결과</h2>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{answer.summary}</p>

      {answer.competitors.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2">관련 경쟁사</h3>
          <div className="flex flex-wrap gap-2">
            {answer.competitors.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                <Building2 className="w-3 h-3 text-slate-500" />
                {c.name} <span className="text-slate-400 text-[10px]">({c.country})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {answer.relatedTickets.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2">관련 이슈</h3>
          <div className="space-y-1">
            {answer.relatedTickets.map((t) => (
              <Link key={t.id} href={`/issues/${t.code}`}
                className="flex items-center gap-2 px-2 py-1.5 border border-slate-200 rounded hover:bg-slate-50">
                <span className="font-mono text-[10px] text-slate-500">{t.code}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded', STATUS_COLOR[t.status])}>{STATUS_LABEL[t.status]}</span>
                <span className="text-xs text-slate-900 flex-1 truncate">{t.title}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {fallbackLabel && (
        <div className="pt-3 border-t border-slate-100">
          <button onClick={onCreateTicket}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1">
            {fallbackLabel} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ConfirmDraftPanel({ draft, onConfirm }: {
  draft: AskDraft;
  onConfirm: (created: { code: string }) => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [priority, setPriority] = useState<Priority>(draft.priority);
  const [type, setType] = useState<IssueType>(draft.type_recommended);
  const [dueAt, setDueAt] = useState(draft.suggestedDueAt.slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await issuesApi.createTicket({
        title: title.trim(),
        description,
        priority,
        type,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        linkedCompetitorIds: draft.linkedCompetitorIds,
      });
      onConfirm({ code: res.ticket.code });
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-900">이슈 초안 확인</h2>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">유형</label>
          <select value={type} onChange={(e) => setType(e.target.value as IssueType)}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400">
            <option value="task">실행 (task)</option>
            <option value="research">조사 (research)</option>
            <option value="response">대응 (response)</option>
            <option value="epic">Epic (컨테이너)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">우선순위</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400">
            {(['H','M','L'] as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">마감일</label>
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400" />
        </div>
      </div>

      {draft.linkedCompetitorIds.length > 0 && (
        <div className="text-[11px] text-slate-500">
          연결된 경쟁사: {draft.linkedCompetitorIds.length}개 (자동 연결됨)
        </div>
      )}

      {draft.suggestedActions.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-1">제안 액션</h3>
          <ul className="space-y-1">
            {draft.suggestedActions.map((a, i) => (
              <li key={i} className="text-[11px] text-slate-700 pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-slate-400">
                <span className="font-medium">{a.step}</span> — {a.rationale}
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && <div className="text-xs text-red-600">{err}</div>}

      <div className="flex items-center gap-2 pt-2">
        <button onClick={submit} disabled={busy || !title.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? '생성 중…' : '발행'}
        </button>
        <span className="text-[11px] text-slate-500">필드를 수정한 뒤 발행하세요.</span>
      </div>
    </div>
  );
}

export function AskFlow({ result, onCreateBlank }: { result: AskResult; onCreateBlank: () => void }) {
  const router = useRouter();
  const onConfirm = ({ code }: { code: string }) => router.push(`/issues/${code}`);

  if (result.intent === 'lookup' && result.answer) {
    return (
      <LookupAnswerPanel answer={result.answer}
        fallbackLabel={result.fallback?.label}
        onCreateTicket={onCreateBlank} />
    );
  }
  if (result.intent === 'task' && result.draft) {
    return <ConfirmDraftPanel draft={result.draft} onConfirm={onConfirm} />;
  }
  if (result.intent === 'ambiguous') {
    return (
      <div className="space-y-3">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-amber-500" />
          질의가 모호합니다 — 조회 결과와 이슈 초안 모두 보여드립니다.
        </div>
        {result.answer && (
          <LookupAnswerPanel answer={result.answer}
            fallbackLabel={result.fallback?.label}
            onCreateTicket={onCreateBlank} />
        )}
        {result.draft && <ConfirmDraftPanel draft={result.draft} onConfirm={onConfirm} />}
      </div>
    );
  }
  return null;
}
