'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Sparkles, RefreshCw, History } from 'lucide-react';
import { issuesApi, type AskResult } from '@/lib/issues-api';
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

  // 마운트 시 마지막 ask 복원
  useEffect(() => {
    const saved = loadAsk();
    if (saved) {
      setQ(saved.query);
      setResult(saved.result);
      setRestoredAt(saved.ts);
    }
  }, []);

  const run = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? q).trim();
    if (!query) return;
    setBusy(true); setErr(null); setResult(null); setRestoredAt(null);
    try {
      const r = await issuesApi.ask(query);
      setResult(r);
      saveAsk(query, r);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
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
          <span className="ml-auto text-slate-400">⌘+Enter 로 실행</span>
        </div>
      </div>

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
          <AskFlow result={result} onCreateBlank={createBlank} />
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
