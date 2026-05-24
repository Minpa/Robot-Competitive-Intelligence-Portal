'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  issuesApi, type IssueType, type Priority,
  PRIORITY_LABEL, TYPE_LABEL,
} from '@/lib/issues-api';
import { ParentTicketPicker } from '@/components/issues/ParentTicketPicker';

function NewIssueForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [title, setTitle] = useState(sp?.get('title') ?? '');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('M');
  const [dueAt, setDueAt] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = sp?.get('title'); if (t) setTitle(t);
  }, [sp]);

  const submit = async () => {
    if (!title.trim()) { setErr('제목 필수'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await issuesApi.createTicket({
        title: title.trim(),
        description,
        priority,
        type,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        parentTicketCode: parentCode.trim() || undefined,
      });
      router.push(`/issues/${res.ticket.code}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-md p-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">새 이슈</h1>
        <p className="text-xs text-slate-500 mt-1">수동 입력 폼. 자연어로 빠르게 만들고 싶다면 <a href="/issues/ask" className="text-blue-600 hover:underline">Ask</a>.</p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">제목 *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
          placeholder="Markdown 가능 (v1 은 plaintext 렌더)"
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">유형</label>
          <select value={type} onChange={(e) => setType(e.target.value as IssueType)}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded text-slate-900 placeholder:text-slate-400">
            <option value="task">실행 (task) — 일반 작업</option>
            <option value="research">조사 (research) — 정보 수집·분석</option>
            <option value="response">대응 (response) — 외부 사건 대응</option>
            <option value="epic">Epic — 여러 하위 작업을 묶는 컨테이너</option>
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

      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">부모 이슈 (선택)</label>
        <ParentTicketPicker value={parentCode} onChange={setParentCode}
          placeholder="없음 — 클릭해서 부모 이슈 선택…" />
        <p className="text-[10px] text-slate-500 mt-0.5">
          Epic 또는 일반 이슈를 부모로 지정 가능. depth-2 까지만 허용 (sub-sub-task 금지).
        </p>
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}

      <div className="flex items-center gap-2 pt-2">
        <button onClick={submit} disabled={busy || !title.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? '생성 중…' : '발행'}
        </button>
        <button onClick={() => router.back()}
          className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
          취소
        </button>
      </div>
    </div>
  );
}

export default function NewIssuePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">로딩…</div>}>
      <NewIssueForm />
    </Suspense>
  );
}
