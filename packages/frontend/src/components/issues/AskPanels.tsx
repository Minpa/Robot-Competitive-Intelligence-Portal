'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  issuesApi, type AskResult, type AskLookupAnswer, type AskDraft,
  type IssueType, type Priority, PRIORITY_LABEL, TYPE_LABEL, STATUS_LABEL, STATUS_COLOR,
} from '@/lib/issues-api';
import { cn } from '@/lib/utils';
import { CheckCircle2, ExternalLink, Sparkles, Building2, ArrowRight, Bot, Package, Newspaper, FilePlus2 } from 'lucide-react';

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
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer.summary}</p>

      {answer.robots && answer.robots.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2 inline-flex items-center gap-1">
            <Bot className="w-3 h-3" /> 휴머노이드 로봇 ({answer.robots.length})
          </h3>
          <div className="space-y-1.5">
            {answer.robots.map((r) => (
              <Link key={r.id} href={`/humanoid-robots/${r.id}`}
                className="block px-2 py-1.5 bg-blue-50/30 border border-blue-100 rounded hover:bg-blue-100/40 hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900 group-hover:text-blue-900">{r.name}</span>
                  {r.companyName && <span className="text-[11px] text-slate-500">· {r.companyName}</span>}
                  {r.announcementYear && (
                    <span className="text-[10px] text-slate-500">
                      {r.announcementYear}{r.announcementQuarter ? ` Q${r.announcementQuarter}` : ''}
                    </span>
                  )}
                  {r.stage && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">{r.stage}</span>}
                  {r.purpose && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">{r.purpose}</span>}
                  {r.dataType === 'forecast' && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">예측</span>}
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto opacity-0 group-hover:opacity-100" />
                </div>
                {r.description && (
                  <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{r.description}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {answer.products && answer.products.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2 inline-flex items-center gap-1">
            <Package className="w-3 h-3" /> 제품 ({answer.products.length})
          </h3>
          <div className="space-y-1">
            {answer.products.map((p) => {
              const inner = (
                <>
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.companyName && <span className="text-slate-500">· {p.companyName}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded">{p.type}</span>
                  {p.releaseDate && <span className="text-[10px] text-slate-500">{p.releaseDate}</span>}
                </>
              );
              const cls = 'px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs flex items-center gap-2 flex-wrap';
              return p.companyId ? (
                <Link key={p.id} href={`/companies/${p.companyId}`}
                  className={cn(cls, 'hover:bg-slate-100 hover:border-slate-400 transition-colors')}
                  title="회사 상세로 이동">
                  {inner}
                </Link>
              ) : (
                <div key={p.id} className={cls}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}

      {answer.competitors.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2 inline-flex items-center gap-1">
            <Building2 className="w-3 h-3" /> 관련 회사 ({answer.competitors.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {answer.competitors.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-colors">
                {c.name} <span className="text-slate-400 text-[10px]">({c.country})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {answer.recentArticles && answer.recentArticles.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-slate-500 mb-2 inline-flex items-center gap-1">
            <Newspaper className="w-3 h-3" /> 최근 기사 ({answer.recentArticles.length})
          </h3>
          <div className="space-y-1">
            {answer.recentArticles.map((a) => {
              const hasUrl = a.url && /^https?:\/\//i.test(a.url);
              const inner = (
                <>
                  <div className="text-xs text-slate-900 truncate flex items-center gap-1.5">
                    {a.title}
                    {hasUrl && <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {a.source}{a.publishedAt ? ` · ${a.publishedAt.slice(0, 10)}` : ''}
                  </div>
                </>
              );
              return hasUrl ? (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="block px-2 py-1.5 border border-slate-200 rounded hover:bg-slate-50">
                  {inner}
                </a>
              ) : (
                <div key={a.id} className="block px-2 py-1.5 border border-slate-200 rounded bg-slate-50/50"
                  title="외부 URL 없음 (수동/AI 생성 항목)">
                  {inner}
                </div>
              );
            })}
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

function AutoCreatedBanner({ t }: { t: { code: string; title: string; reason: string } }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-start gap-3">
      <FilePlus2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-emerald-900 flex items-center gap-2 flex-wrap">
          조사 이슈 자동 생성됨
          <Link href={`/issues/${t.code}`}
            className="font-mono text-xs px-1.5 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded hover:bg-emerald-100">
            {t.code}
          </Link>
          <span className="text-xs text-emerald-700">— {t.title}</span>
        </div>
        <div className="text-[11px] text-emerald-700 mt-0.5">{t.reason}</div>
      </div>
      <Link href={`/issues/${t.code}`}
        className="text-xs text-emerald-800 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 shrink-0">
        이슈 열기 <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

export function AskFlow({ result, onCreateBlank }: { result: AskResult; onCreateBlank: () => void }) {
  const router = useRouter();
  const onConfirm = ({ code }: { code: string }) => router.push(`/issues/${code}`);

  return (
    <div className="space-y-3">
      {result.autoCreatedTicket && <AutoCreatedBanner t={result.autoCreatedTicket} />}

      {result.intent === 'lookup' && result.answer && (
        <LookupAnswerPanel answer={result.answer}
          fallbackLabel={result.fallback?.label}
          onCreateTicket={onCreateBlank} />
      )}
      {result.intent === 'task' && result.draft && (
        <ConfirmDraftPanel draft={result.draft} onConfirm={onConfirm} />
      )}
      {result.intent === 'ambiguous' && (
        <>
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
        </>
      )}
    </div>
  );
}
