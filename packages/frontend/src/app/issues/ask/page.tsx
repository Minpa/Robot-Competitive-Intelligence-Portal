'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Loader2, Sparkles, RefreshCw, History, Trash2, ChevronDown, ChevronUp, FilePlus2 } from 'lucide-react';
import { issuesApi, type AskResult, type AskHistoryItem } from '@/lib/issues-api';
import { AskFlow } from '@/components/issues/AskPanels';

const EXAMPLES = [
  'Figure 03 최근 동향',
  'Tesla Optimus 대응 방안 검토',
  '이번 주 안에 1X NEO 가격 분석해줘',
];

// sessionStorage: 페이지를 떠났다 돌아와도 마지막 ask 가 유지되도록.
// 30분 이내 결과만 복원 (오래된 컨텍스트는 무시).
const STORAGE_KEY = 'argos_issues_ask_last_v1';
const STORAGE_TTL_MS = 30 * 60 * 1000;

interface SavedAsk { query: string; result: AskResult; ts: number; }

function saveAsk(query: string, result: AskResult) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, result, ts: Date.now() } as SavedAsk));
  } catch {}
}
function loadAsk(): SavedAsk | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAsk;
    if (Date.now() - parsed.ts > STORAGE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}
function clearAsk() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export default function AskPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [history, setHistory] = useState<AskHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);

  // 마운트 시 마지막 ask 복원
  useEffect(() => {
    const saved = loadAsk();
    if (saved) {
      setQ(saved.query);
      setResult(saved.result);
      setRestoredAt(saved.ts);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try { setHistory((await issuesApi.askHistory()).items); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // run() — overrideQuery 가 주어지면 그것으로 실행, skipClarification 으로 명확화 우회 가능
  const run = async (overrideQuery?: string, opts?: { skipClarification?: boolean }) => {
    const query = (overrideQuery ?? q).trim();
    if (!query) return;
    setBusy(true); setErr(null); setResult(null); setRestoredAt(null);
    if (overrideQuery) setQ(overrideQuery);
    try {
      const r = await issuesApi.ask(query, { skipClarification: opts?.skipClarification });
      setResult(r);
      saveAsk(query, r);
      // clarification 응답은 미완료 턴 — 이력에 안 남으므로 새로고침 불필요
      if (!r.clarification) loadHistory();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  // 명확화 옵션 선택/자유 입력 — refined 질의로 재호출 (이번엔 클라리피케이션 우회)
  const refineFromClarify = (refinedQuery: string) => {
    run(refinedQuery, { skipClarification: true });
  };
  // 명확화 무시하고 원 질의 그대로 강제 검색
  const skipClarify = () => {
    if (q.trim()) run(q, { skipClarification: true });
  };

  const deleteOne = async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    try { await issuesApi.deleteAskHistoryItem(id); }
    catch { loadHistory(); /* 실패 시 다시 받아옴 */ }
  };

  const clearAll = async () => {
    if (!confirm('모든 질의 이력을 삭제할까요?')) return;
    const prev = history;
    setHistory([]);
    try { await issuesApi.clearAskHistory(); }
    catch { setHistory(prev); }
  };

  const reset = () => {
    setQ(''); setResult(null); setErr(null); setRestoredAt(null);
    clearAsk();
  };

  const createBlank = () => {
    const params = new URLSearchParams({ title: q.trim() });
    router.push(`/issues/new?${params.toString()}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Ask
        </h1>
        <p className="text-xs text-slate-500 mt-1">자연어로 질문하세요. 조회면 결과를, 행동이 필요하면 이슈 초안을 만들어 드립니다.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-3">
        <div className="flex items-start gap-2">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
            placeholder="예: Figure 03 정보 / Tesla Optimus 대응 방안 검토 / 이번 주 안에 ~ 해줘"
            rows={2}
            className="flex-1 px-2 py-1.5 text-sm border-none focus:outline-none resize-none text-slate-900 placeholder:text-slate-400"
            disabled={busy}
          />
          <button onClick={() => run()} disabled={busy || !q.trim()}
            className="px-3 py-2 bg-slate-900 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {busy ? '분류 중…' : '실행'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-slate-500">예시:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setQ(ex)}
              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
              {ex}
            </button>
          ))}
          <span className="ml-auto text-slate-400">Ctrl+Enter (또는 ⌘+Enter) 로 실행</span>
        </div>
      </div>

      {/* 내 최근 질의 이력 */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <button onClick={() => setHistoryOpen(v => !v)}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-left">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">내 최근 질의 ({history.length})</span>
            {historyOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-auto" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
          </button>
          {historyOpen && (
            <>
              <div className="max-h-80 overflow-y-auto border-t border-slate-100">
                {history.map((h) => (
                  <div key={h.id}
                    className="group px-3 py-2 flex items-center gap-2 border-b border-slate-50 hover:bg-slate-50 last:border-b-0">
                    <button onClick={() => run(h.query)}
                      className="flex-1 min-w-0 text-left">
                      <div className="text-xs text-slate-900 truncate">{h.query}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{new Date(h.at).toLocaleString('ko-KR')}</span>
                        {h.intent && <span className="px-1 bg-slate-100 rounded">{h.intent}</span>}
                        {h.hitCount > 0 && <span>· {h.hitCount}건 매칭</span>}
                        {h.autoCreatedTicketCode && (
                          <Link href={`/issues/${h.autoCreatedTicketCode}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline">
                            <FilePlus2 className="w-2.5 h-2.5" />
                            {h.autoCreatedTicketCode}
                          </Link>
                        )}
                      </div>
                    </button>
                    <button onClick={() => deleteOne(h.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
                      title="삭제">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">최대 30건 표시. 본인 질의만.</span>
                <button onClick={clearAll}
                  className="text-[11px] text-slate-500 hover:text-red-600 inline-flex items-center gap-1">
                  <Trash2 className="w-2.5 h-2.5" /> 전체 삭제
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">{err}</div>}

      {restoredAt && result && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 flex items-center gap-2 text-xs text-blue-800">
          <History className="w-3 h-3 shrink-0" />
          <span className="flex-1">
            이전 검색 결과를 표시 중입니다 ({new Date(restoredAt).toLocaleTimeString('ko-KR')}). API 재호출 없이 캐시됨.
          </span>
          <button onClick={() => run()}
            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 hover:underline">
            <RefreshCw className="w-3 h-3" /> 다시 실행
          </button>
          <button onClick={reset}
            className="text-blue-700 hover:text-blue-900 hover:underline">
            새 질문
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium">{result.intent}</span>
            <span>신뢰도 {(result.confidence * 100).toFixed(0)}%</span>
            {!restoredAt && (
              <button onClick={reset} className="ml-auto text-slate-400 hover:text-slate-700">
                지우기
              </button>
            )}
          </div>
          <AskFlow
            result={result}
            originalQuery={q}
            onCreateBlank={createBlank}
            onRefine={refineFromClarify}
            onSkipClarify={skipClarify}
            busy={busy}
          />
        </div>
      )}

      {!result && !busy && !err && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-md p-6 text-center">
          <p className="text-sm text-slate-500 mb-2">질문을 입력하고 Claude 가 의도를 분류합니다.</p>
          <button onClick={createBlank}
            className="text-xs text-blue-600 hover:underline">
            또는 빈 폼으로 직접 이슈 만들기 →
          </button>
        </div>
      )}
    </div>
  );
}
