'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ManualPasteMode } from '@/components/insight-pipeline/ManualPasteMode';
import { InsightPanel } from '@/components/insight-pipeline/InsightPanel';
import { api } from '@/lib/api';
import type { AnalysisResult, EntityItem } from '@/types/insight-pipeline';
import { PageHeader } from '@/components/layout/PageHeader';

const STORAGE_KEY_LOGS = 'insight-pipeline-last-logs';
const STORAGE_KEY_RESULT = 'insight-pipeline-last-result';
const STORAGE_KEY_HISTORY = 'insight-pipeline-history';
const STORAGE_KEY_TIME = 'insight-pipeline-last-time';
const STORAGE_KEY_JOB_ID = 'insight-pipeline-job-id';

const POLL_INTERVAL_MS = 3000;

const STEP_LABEL: Record<string, string> = {
  ai_call: 'AI 호출 중',
  rate_limit_wait: 'Rate limit 대기 중 (60초)',
};

interface HistoryEntry {
  timestamp: string;
  completed: number;
  failed: number;
  totalTopics: number;
  results: BatchResultItem[];
}

interface SkippedItem {
  category: 'company' | 'product' | 'article' | 'keyword';
  name: string;
  reason: string;
}

interface BatchResultItem {
  topic: string;
  companiesSaved: number;
  productsSaved: number;
  articlesSaved: number;
  keywordsSaved: number;
  companyNames?: string[];
  productNames?: string[];
  articleTitles?: string[];
  keywordTerms?: string[];
  errors: string[];
  skipped?: SkippedItem[];
}

const SKIP_REASON_LABEL: Record<string, string> = {
  missing_country: '국가 정보 없음',
  no_company_match: '회사 매칭 실패',
  company_not_in_db: '회사 미등록',
  missing_year: '발표 연도 없음',
  not_robot: '로봇 아님',
  duplicate: '중복',
  unverified: '출처 미확인',
};

function labelReason(reason: string): string {
  if (SKIP_REASON_LABEL[reason]) return SKIP_REASON_LABEL[reason]!;
  if (reason.startsWith('db_error')) return 'DB 오류';
  return reason;
}

function aggregateBatchResult(
  batch: { totalTopics: number; completed: number; failed: number; results: BatchResultItem[] },
): AnalysisResult {
  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter((s) => s && s.trim().length > 0)));
  const toEntity = (name: string, context: string): EntityItem => ({
    name,
    type: 'batch',
    confidence: 1,
    context,
  });

  const allCompanies = dedupe(batch.results.flatMap((r) => r.companyNames ?? []));
  const allProducts = dedupe(batch.results.flatMap((r) => r.productNames ?? []));
  const allKeywords = dedupe(batch.results.flatMap((r) => r.keywordTerms ?? []));
  const allArticles = dedupe(batch.results.flatMap((r) => r.articleTitles ?? []));

  const totalSaved = batch.results.reduce(
    (sum, r) => sum + r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved,
    0,
  );

  const summary =
    `배치 자동 수집 — ${batch.completed}/${batch.totalTopics} 주제 완료` +
    (batch.failed > 0 ? `, 실패 ${batch.failed}` : '') +
    `. 총 ${totalSaved}건이 DB에 저장되었습니다.\n` +
    `기업 ${allCompanies.length} · 제품 ${allProducts.length} · 기사 ${allArticles.length} · 키워드 ${allKeywords.length}`;

  return {
    summary,
    entities: {
      companies: allCompanies.map((n) => toEntity(n, '배치 수집')),
      products: allProducts.map((n) => toEntity(n, '배치 수집')),
      components: [],
      applications: [],
      workforce: [],
      market: [],
      technology: [],
      keywords: allKeywords.map((term) => ({ term, relevance: 1 })),
    },
    linkCandidates: {},
    sources: allArticles.map((title) => ({ domain: '배치 수집', title })),
  };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function InsightPipelinePage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [resultSource, setResultSource] = useState<'manual' | 'ai-agent' | 'batch'>('manual');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [isAICollecting, setIsAICollecting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [batchResult, setBatchResult] = useState<{ totalTopics: number; completed: number; failed: number; results: BatchResultItem[] } | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const loggedTopicsRef = useRef<Set<number>>(new Set());
  const lastStepRef = useRef<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      const savedResult = localStorage.getItem(STORAGE_KEY_RESULT);
      const savedTime = localStorage.getItem(STORAGE_KEY_TIME);
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedLogs) setProgressLogs(JSON.parse(savedLogs));
      if (savedResult) {
        const parsed = JSON.parse(savedResult);
        setBatchResult(parsed);
        setAnalysisResult(aggregateBatchResult(parsed));
        setResultSource('batch');
      }
      if (savedTime) setLastRunTime(savedTime);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLogs]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setResultSource('manual');
    setSaveSuccess(false);
    setIsDuplicate(false);
  };

  const addLog = useCallback((msg: string) => {
    setProgressLogs((prev) => [...prev, msg]);
  }, []);

  const pollJob = useCallback((jobId: string, startTime: number, runTimestamp: string) => {
    const tick = async () => {
      try {
        const state = await api.getDataBatchStatus(jobId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

        // Log new step transitions (current topic + step)
        const stepKey = `${state.currentTopicIndex ?? -1}:${state.currentStep ?? ''}`;
        if (stepKey !== lastStepRef.current && state.status === 'running') {
          lastStepRef.current = stepKey;
          if (state.currentTopicIndex != null && state.currentTopicLabel) {
            const stepLabel = state.currentStep ? (STEP_LABEL[state.currentStep] ?? state.currentStep) : '';
            addLog(`[${elapsed}s] 주제 ${state.currentTopicIndex + 1}/${state.totalTopics} · ${stepLabel} · ${state.currentTopicLabel.substring(0, 50)}...`);
          }
        }

        // Log newly completed topics (results appended as each topic finishes)
        for (let i = 0; i < state.results.length; i++) {
          if (loggedTopicsRef.current.has(i)) continue;
          loggedTopicsRef.current.add(i);
          const r = state.results[i]!;
          const total = r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved;
          const hasError = r.errors && r.errors.length > 0;
          if (hasError) {
            addLog(`  ✗ ${r.topic}`);
            for (const e of r.errors) addLog(`    → ${e}`);
          } else if (total === 0) {
            addLog(`  ↺ ${r.topic} (중복 — 이미 DB에 존재)`);
          } else {
            addLog(`  ✓ ${r.topic} → 기업 ${r.companiesSaved} · 제품 ${r.productsSaved} · 기사 ${r.articlesSaved} · 키워드 ${r.keywordsSaved}`);
          }
        }

        if (state.status === 'running' || state.status === 'pending') {
          pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);
          return;
        }

        // Finished — completed or failed
        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const result = {
          totalTopics: state.totalTopics,
          completed: state.completed,
          failed: state.failed,
          results: state.results as BatchResultItem[],
        };

        if (state.status === 'failed') {
          addLog(`[${totalElapsed}s] 실패: ${state.error ?? '알 수 없는 오류'}`);
          setAiError(state.error ?? '배치 실행 중 오류가 발생했습니다.');
        } else {
          const totalSaved = result.results.reduce((sum, r) => sum + r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved, 0);
          if (totalSaved === 0 && result.failed === 0) {
            addLog(`[${totalElapsed}s] 완료 — 새 데이터 없음 (모두 중복)`);
          } else if (result.failed > 0) {
            addLog(`[${totalElapsed}s] 완료 — 성공 ${result.completed}, 실패 ${result.failed}`);
          } else {
            addLog(`[${totalElapsed}s] 완료! ${result.completed}/${result.totalTopics} 주제 수집 성공`);
          }
        }

        setBatchResult(result);
        setLastRunTime(runTimestamp);

        // Fill the right-side InsightPanel with an aggregated view of batch data
        if (state.status !== 'failed') {
          const aggregated = aggregateBatchResult(result);
          setAnalysisResult(aggregated);
          setResultSource('batch');
          setSaveSuccess(false);
          setIsDuplicate(false);
        }

        const newEntry: HistoryEntry = { timestamp: runTimestamp, ...result };
        setHistory((prev) => {
          const updated = [newEntry, ...prev].slice(0, 20);
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
          return updated;
        });
        localStorage.removeItem(STORAGE_KEY_JOB_ID);
        setIsAICollecting(false);
      } catch (err: any) {
        addLog(`> 폴링 오류: ${err?.message ?? '알 수 없는 오류'} — 재시도`);
        // Transient errors (network/server restart) — retry in 5s, don't drop the job
        pollTimer.current = setTimeout(tick, 5000);
      }
    };

    tick();
  }, [addLog]);

  const handleAICollect = async () => {
    if (isAICollecting) return;
    setAiError(null);
    setIsAICollecting(true);
    setBatchResult(null);
    setProgressLogs([]);
    loggedTopicsRef.current = new Set();
    lastStepRef.current = null;
    localStorage.removeItem(STORAGE_KEY_RESULT);

    const startTime = Date.now();
    const runTimestamp = new Date().toISOString();
    addLog('> Claude Sonnet 4 연결 중...');
    addLog('> 웹 검색 활성화 (실시간 데이터)');

    try {
      const { jobId } = await api.startDataBatch('claude', true);
      localStorage.setItem(STORAGE_KEY_JOB_ID, jobId);
      addLog(`> 배치 시작 (job ${jobId.substring(0, 8)}...) · 예상 소요: 약 3~5분`);
      pollJob(jobId, startTime, runTimestamp);
    } catch (err: any) {
      addLog(`> 오류: ${err?.message ?? '알 수 없는 오류'}`);
      setAiError(err?.message ?? 'AI 데이터 수집 중 오류가 발생했습니다.');
      setIsAICollecting(false);
    }
  };

  // Resume polling if there's an unfinished job (e.g. user refreshed mid-run)
  useEffect(() => {
    try {
      const savedJobId = localStorage.getItem(STORAGE_KEY_JOB_ID);
      if (!savedJobId) return;
      // Check the job status — if still running, resume polling
      (async () => {
        try {
          const state = await api.getDataBatchStatus(savedJobId);
          if (state.status === 'running' || state.status === 'pending') {
            setIsAICollecting(true);
            setProgressLogs([`> 이전 실행 재개 중 (job ${savedJobId.substring(0, 8)}...)`]);
            loggedTopicsRef.current = new Set();
            lastStepRef.current = null;
            const startedAt = state.startedAt ? new Date(state.startedAt).getTime() : Date.now();
            pollJob(savedJobId, startedAt, state.createdAt);
          } else {
            localStorage.removeItem(STORAGE_KEY_JOB_ID);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY_JOB_ID);
        }
      })();
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist logs & result to localStorage
  useEffect(() => {
    if (progressLogs.length > 0) localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(progressLogs));
  }, [progressLogs]);
  useEffect(() => {
    if (batchResult) localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(batchResult));
  }, [batchResult]);
  useEffect(() => {
    if (lastRunTime) localStorage.setItem(STORAGE_KEY_TIME, lastRunTime);
  }, [lastRunTime]);

  const handleSave = async (result: AnalysisResult) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsDuplicate(false);

    try {
      const linkedCompanyIds = result.entities.companies.filter((e) => e.linkedEntityId).map((e) => e.linkedEntityId!);
      const linkedRobotIds = result.entities.products.filter((e) => e.linkedEntityId).map((e) => e.linkedEntityId!);
      const linkedComponentIds = result.entities.components.filter((e) => e.linkedEntityId).map((e) => e.linkedEntityId!);
      const linkedApplicationIds = result.entities.applications.filter((e) => e.linkedEntityId).map((e) => e.linkedEntityId!);

      const encoder = new TextEncoder();
      const data = encoder.encode(result.summary + articleTitle);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await api.saveAnalysis({
        title: articleTitle || '분석 결과',
        summary: result.summary,
        contentHash,
        linkedCompanyIds,
        linkedRobotIds,
        linkedComponentIds,
        linkedApplicationIds,
        keywords: result.entities.keywords.map((kw) => ({ term: kw.term, relevance: kw.relevance })),
      });

      setSaveSuccess(true);
    } catch (err: any) {
      if (err?.message?.includes('409') || err?.message?.includes('duplicate')) {
        setIsDuplicate(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkEntity = (entityName: string, linkedEntityId: string) => {
    if (!analysisResult) return;
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const updateEntities = (entities: typeof prev.entities.companies) =>
        entities.map((e) => (e.name === entityName ? { ...e, linkedEntityId } : e));
      return {
        ...prev,
        entities: {
          companies: updateEntities(prev.entities.companies),
          products: updateEntities(prev.entities.products),
          components: updateEntities(prev.entities.components),
          applications: updateEntities(prev.entities.applications),
          workforce: updateEntities(prev.entities.workforce),
          market: updateEntities(prev.entities.market),
          technology: updateEntities(prev.entities.technology),
          keywords: prev.entities.keywords,
        },
      };
    });
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    const batch = { totalTopics: entry.totalTopics, completed: entry.completed, failed: entry.failed, results: entry.results };
    setBatchResult(batch);
    setLastRunTime(entry.timestamp);
    setAnalysisResult(aggregateBatchResult(batch));
    setResultSource('batch');
    setSaveSuccess(false);
    setIsDuplicate(false);
    setProgressLogs([`> ${new Date(entry.timestamp).toLocaleString('ko-KR')} 실행 기록`]);
    for (const r of entry.results) {
      const total = r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved;
      const hasError = r.errors && r.errors.length > 0;
      if (hasError) {
        setProgressLogs((prev) => [...prev, `  ✗ ${r.topic}`, ...r.errors.map((e) => `    → ${e}`)]);
      } else if (total === 0) {
        setProgressLogs((prev) => [...prev, `  ↺ ${r.topic} (중복)`]);
      } else {
        setProgressLogs((prev) => [...prev, `  ✓ ${r.topic} → 기업 ${r.companiesSaved} · 제품 ${r.productsSaved} · 기사 ${r.articlesSaved} · 키워드 ${r.keywordsSaved}`]);
      }
    }
    setShowHistory(false);
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          module="INTELLIGENCE FEED V4.2"
          titleKo="기사 분석"
          titleEn="INSIGHT PIPELINE"
          description="AI 활용 기사 입력 및 데이터 수집"
          actions={
            <div className="flex items-center gap-3">
              <button onClick={handleAICollect} disabled={isAICollecting} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white">
                <Sparkles className="w-4 h-4" />
                {isAICollecting ? 'AI 데이터 모으는 중...' : 'AI 데이터 모으기'}
              </button>
              {lastRunTime && <span className="flex items-center gap-1.5 text-sm text-ink-400"><Clock className="w-4 h-4" />마지막 수집: {formatTime(lastRunTime)}</span>}
              {history.length > 0 && <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-900 transition-colors cursor-pointer">히스토리 ({history.length}){showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>}
            </div>
          }
        />

        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className="bg-white border border-ink-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-ink-500 font-medium mb-2">수집 히스토리</p>
            {history.map((entry, i) => {
              const totalSaved = entry.results.reduce((s, r) => s + r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved, 0);
              return (
                <button
                  key={i}
                  onClick={() => loadHistoryEntry(entry)}
                  className="w-full text-left flex items-center justify-between px-4 py-2.5 rounded-lg bg-white hover:bg-ink-100 border border-ink-100 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-ink-700">
                    {new Date(entry.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-sm">
                    {entry.failed > 0 ? (
                      <span className="text-red-400">실패 {entry.failed}/{entry.totalTopics}</span>
                    ) : totalSaved === 0 ? (
                      <span className="text-amber-400">중복 (변경 없음)</span>
                    ) : (
                      <span className="text-emerald-400">성공 {entry.completed}/{entry.totalTopics} ({totalSaved}건 저장)</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Console-style progress log — always visible if there's data */}
        {(progressLogs.length > 0 || aiError) && (
          <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-ink-100 border-b border-ink-200">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-sm text-ink-500 ml-2">AI 데이터 수집</span>
              {isAICollecting && (
                <span className="ml-auto flex items-center gap-1.5 text-sm text-violet-400">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  실행 중
                </span>
              )}
              {batchResult && !isAICollecting && (
                <span className="ml-auto text-sm text-emerald-400">
                  완료 {batchResult.completed}/{batchResult.totalTopics}
                </span>
              )}
            </div>
            <div className="px-5 py-4 max-h-64 overflow-y-auto text-sm leading-7 scrollbar-thin scrollbar-thumb-ink-200 scrollbar-track-transparent">
              {progressLogs.map((log, i) => (
                <div
                  key={i}
                  className={`${
                    log.startsWith('>')
                      ? 'text-violet-400'
                      : log.includes('완료')
                        ? 'text-emerald-400 font-medium'
                        : log.includes('오류')
                          ? 'text-red-400'
                          : log.includes('중복')
                            ? 'text-amber-400'
                            : 'text-ink-500'
                  }`}
                >
                  {log}
                </div>
              ))}
              {isAICollecting && (
                <span className="inline-block w-2 h-5 bg-violet-400 animate-pulse ml-0.5" />
              )}
              <div ref={logEndRef} />
            </div>

            {/* Detailed results with entity names shown inline */}
            {batchResult && (
              <div className="border-t border-ink-200 px-5 py-4 text-sm text-ink-500 space-y-3">
                {batchResult.results.map((r, i) => {
                  const hasError = r.errors && r.errors.length > 0;
                  const total = r.companiesSaved + r.productsSaved + r.articlesSaved + r.keywordsSaved;
                  const hasDetails = (r.companyNames?.length || 0) + (r.productNames?.length || 0) + (r.articleTitles?.length || 0) + (r.keywordTerms?.length || 0) > 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-start justify-between gap-3 py-1">
                        <span className={`flex items-start gap-2 flex-1 min-w-0 ${hasError ? 'text-red-400' : total === 0 ? 'text-amber-400' : 'text-ink-700'}`}>
                          <span className="shrink-0">{hasError ? '✗' : total > 0 ? '✓' : '↺'}</span>
                          <span className="truncate">{r.topic}</span>
                        </span>
                        <span className={`whitespace-nowrap shrink-0 ${hasError ? 'text-red-400' : total === 0 ? 'text-amber-400' : 'text-ink-400'}`}>
                          {hasError ? '오류' : total === 0 ? '중복' : `기업 ${r.companiesSaved} · 제품 ${r.productsSaved} · 기사 ${r.articlesSaved} · 키워드 ${r.keywordsSaved}`}
                        </span>
                      </div>

                      {hasError && r.errors.map((e, j) => (
                        <div key={j} className="text-red-400/70 ml-5 text-sm truncate">→ {e}</div>
                      ))}

                      {hasDetails && (
                        <div className="ml-5 space-y-1 text-sm">
                          {r.companyNames && r.companyNames.length > 0 && (
                            <div>
                              <span className="text-ink-400">기업 ({r.companyNames.length}):</span>{' '}
                              <span className="text-ink-700">{r.companyNames.join(', ')}</span>
                            </div>
                          )}
                          {r.productNames && r.productNames.length > 0 && (
                            <div>
                              <span className="text-ink-400">제품 ({r.productNames.length}):</span>{' '}
                              <span className="text-ink-700">{r.productNames.join(', ')}</span>
                            </div>
                          )}
                          {r.articleTitles && r.articleTitles.length > 0 && (
                            <div>
                              <span className="text-ink-400">기사 ({r.articleTitles.length}):</span>{' '}
                              <span className="text-ink-700">{r.articleTitles.join(', ')}</span>
                            </div>
                          )}
                          {r.keywordTerms && r.keywordTerms.length > 0 && (
                            <div>
                              <span className="text-ink-400">키워드 ({r.keywordTerms.length}):</span>{' '}
                              <span className="text-violet-400">{r.keywordTerms.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {r.skipped && r.skipped.length > 0 && (() => {
                        const groups = r.skipped.reduce<Record<string, string[]>>((acc, s) => {
                          const key = labelReason(s.reason);
                          (acc[key] ??= []).push(s.name);
                          return acc;
                        }, {});
                        const total = r.skipped.length;
                        return (
                          <div className="ml-5 mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-sm">
                            <div className="text-amber-700 font-medium mb-1">스킵됨 ({total}건) — 데이터 게이트에서 거부</div>
                            <div className="space-y-0.5 text-amber-800">
                              {Object.entries(groups).map(([reason, names]) => (
                                <div key={reason}>
                                  <span className="text-amber-600">{reason} ({names.length}):</span>{' '}
                                  <span>{names.slice(0, 8).join(', ')}{names.length > 8 ? ` 외 ${names.length - 8}건` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: article input */}
          <div className="bg-white border border-ink-200 rounded-xl p-6">
            <ManualPasteMode
              onAnalysisComplete={handleAnalysisComplete}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              articleTitle={articleTitle}
              setArticleTitle={setArticleTitle}
            />
          </div>

          {/* Right column: insight panel */}
          <div>
            <InsightPanel
              result={analysisResult}
              sourceType={resultSource}
              onSave={handleSave}
              onLinkEntity={handleLinkEntity}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              isDuplicate={isDuplicate}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
