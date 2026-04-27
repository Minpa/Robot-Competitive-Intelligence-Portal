'use client';

import { useState } from 'react';
import { Search, Sparkles, Brain, Globe, Database, CheckCircle2, Sparkle } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

interface AIAgentModeProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

const TARGET_TYPES = [
  { key: 'company', label: '기업' },
  { key: 'product', label: '제품·로봇' },
  { key: 'component', label: '부품' },
  { key: 'application', label: '적용 사례' },
  { key: 'workforce', label: '인력·채용' },
  { key: 'market', label: '시장·투자' },
  { key: 'technology', label: '기술 트렌드' },
  { key: 'keyword', label: '키워드' },
] as const;

const REGIONS = ['글로벌', '북미', '유럽', '아시아', '한국', '중국', '일본'] as const;

const PROVIDERS = [
  { key: 'chatgpt' as const, label: 'ChatGPT' },
  { key: 'claude' as const, label: 'Claude' },
];

export function AIAgentMode({
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing,
  searchQuery,
  setSearchQuery,
}: AIAgentModeProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    () => new Set(TARGET_TYPES.map((t) => t.key))
  );
  const [startYear, setStartYear] = useState('2025');
  const [endYear, setEndYear] = useState('2026');
  const [region, setRegion] = useState('글로벌');
  const [provider, setProvider] = useState<'chatgpt' | 'claude'>('chatgpt');
  const [webSearch, setWebSearch] = useState(true);
  const [batchMode, setBatchMode] = useState<'confirmed' | 'forecast'>('confirmed');
  const [error, setError] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    totalTopics: number; completed: number; failed: number;
    results: Array<{ topic: string; companiesSaved: number; productsSaved: number; articlesSaved: number; keywordsSaved: number; errors: string[] }>;
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; step: string | null } | null>(null);

  const canSearch = selectedTypes.size > 0 && !isAnalyzing;

  const toggleType = (key: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setError(null);
    setIsAnalyzing(true);

    const query = searchQuery.trim() || `${startYear}-${endYear}년 휴머노이드 로봇 시장 동향 및 경쟁 분석`;

    try {
      const response = await api.aiSearch({
        query,
        targetTypes: Array.from(selectedTypes),
        timeRange: { start: startYear, end: endYear },
        region,
        provider,
        webSearch,
      });

      // The API returns { result, linkResult, sources } — transform into AnalysisResult
      const raw = response as any;
      const analysisResult: AnalysisResult = {
        summary: raw.result?.summary ?? raw.summary ?? '',
        entities: {
          companies: raw.result?.companies ?? raw.entities?.companies ?? [],
          products: raw.result?.products ?? raw.entities?.products ?? [],
          components: raw.result?.components ?? raw.entities?.components ?? [],
          applications: raw.result?.applications ?? raw.entities?.applications ?? [],
          workforce: raw.result?.workforce ?? raw.entities?.workforce ?? [],
          market: raw.result?.market ?? raw.entities?.market ?? [],
          technology: raw.result?.technology ?? raw.entities?.technology ?? [],
          keywords: raw.result?.keywords ?? raw.entities?.keywords ?? [],
        },
        linkCandidates: raw.linkResult?.candidates ?? raw.linkCandidates ?? {},
        sources: raw.sources ?? [],
      };

      onAnalysisComplete(analysisResult);
    } catch (err: any) {
      setError(err?.message ?? 'AI 검색 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-ink-700">
        <Search className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-medium">AI 기반 데이터 수집</h2>
      </div>

      {/* Search input */}
      <div>
        <label htmlFor="ai-search-query" className="block text-sm text-ink-500 mb-1.5">
          검색 질문
        </label>
        <input
          id="ai-search-query"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="예: 2025년 휴머노이드 로봇 시장 동향은?"
          className="w-full px-4 py-2.5 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 placeholder-ink-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>

      {/* Target type multi-select */}
      <div>
        <p className="text-sm text-ink-500 mb-2">대상 유형</p>
        <div className="flex flex-wrap gap-2">
          {TARGET_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => toggleType(t.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                selectedTypes.has(t.key)
                  ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                  : 'bg-ink-100 text-ink-400 border-ink-200 hover:border-ink-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time range + Region row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time range */}
        <div>
          <p className="text-sm text-ink-500 mb-1.5">시간 범위</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="시작"
              className="w-full px-3 py-2 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            <span className="text-ink-400 text-sm">~</span>
            <input
              type="text"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="종료"
              className="w-full px-3 py-2 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Region */}
        <div>
          <p className="text-sm text-ink-500 mb-1.5">지역</p>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 bg-ink-100 border border-ink-200 rounded-lg text-ink-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI model selection */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-ink-500">AI 모델</p>
        </div>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                provider === p.key
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                  : 'bg-ink-100 text-ink-400 border-ink-200 hover:border-ink-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Web search toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink-100 border border-ink-100 rounded-lg">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-sm text-ink-700">웹 검색 (실시간 최신 정보)</p>
            <p className="text-xs text-ink-400">활성화 시 최신 뉴스·발표 기반으로 응답합니다</p>
          </div>
        </div>
        <button
          onClick={() => setWebSearch(!webSearch)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            webSearch ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          role="switch"
          aria-checked={webSearch}
          aria-label="웹 검색 활성화"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              webSearch ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-neg bg-neg-soft border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!canSearch}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 !text-white"
      >
        <Sparkles className="w-4 h-4" />
        {isAnalyzing ? 'AI 검색 중...' : 'AI 검색 시작'}
      </button>

      {/* Batch data generation */}
      <div className="border-t border-ink-100 pt-5 mt-2 space-y-3">
        <div className="flex items-center gap-2 text-ink-700">
          <Database className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-medium">배치 데이터 생성</p>
        </div>

        {/* Mode selector — confirmed (recent 30d) vs forecast (predictions, low confidence) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setBatchMode('confirmed')}
            disabled={isBatchRunning}
            className={`px-3 py-2.5 text-left rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              batchMode === 'confirmed'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
                : 'bg-ink-100 border-ink-200 text-ink-500 hover:border-ink-200'
            }`}
            aria-pressed={batchMode === 'confirmed'}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">공식 발표 (최근 30일)</span>
            </div>
            <p className="text-[11px] leading-snug opacity-80">
              실제 발표·런칭·계약된 사실만 수집. dataType=confirmed.
            </p>
          </button>
          <button
            onClick={() => setBatchMode('forecast')}
            disabled={isBatchRunning}
            className={`px-3 py-2.5 text-left rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              batchMode === 'forecast'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-700'
                : 'bg-ink-100 border-ink-200 text-ink-500 hover:border-ink-200'
            }`}
            aria-pressed={batchMode === 'forecast'}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkle className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">예측 Forecast (신뢰도 낮음)</span>
            </div>
            <p className="text-[11px] leading-snug opacity-80">
              누적 신호 기반 향후 1~2년 출시 예측. dataType=forecast + 근거.
            </p>
          </button>
        </div>

        <p className="text-xs text-ink-400">
          {batchMode === 'confirmed'
            ? '최근 30일 이내 발표된 휴머노이드 기업·제품·적용 사례를 2개 주제로 분석합니다. 주제 간 60초 rate-limit 대기.'
            : '과거 5년 누적 신호(부스 임대·MOU·임원 발언 등)를 분석해 향후 1~2년 출시 가능 모델을 예측합니다. 각 예측에 rationale+sources 필수.'}
        </p>
        <button
          onClick={async () => {
            setIsBatchRunning(true);
            setBatchResult(null);
            setBatchProgress({ current: 0, total: 0, step: null });
            setError(null);
            try {
              const { jobId } = await api.startDataBatch(provider, webSearch, batchMode);
              // Poll for progress/completion
              const poll = async () => {
                const state = await api.getDataBatchStatus(jobId);
                setBatchProgress({
                  current: state.currentTopicIndex != null ? state.currentTopicIndex + 1 : state.completed + state.failed,
                  total: state.totalTopics,
                  step: state.currentStep,
                });
                if (state.status === 'running' || state.status === 'pending') {
                  setTimeout(poll, 3000);
                  return;
                }
                if (state.status === 'failed') {
                  setError(state.error ?? '배치 실행 중 오류가 발생했습니다.');
                } else {
                  setBatchResult({
                    totalTopics: state.totalTopics,
                    completed: state.completed,
                    failed: state.failed,
                    results: state.results,
                  });
                }
                setBatchProgress(null);
                setIsBatchRunning(false);
              };
              poll();
            } catch (err: any) {
              setError(err?.message ?? '배치 실행 중 오류가 발생했습니다.');
              setBatchProgress(null);
              setIsBatchRunning(false);
            }
          }}
          disabled={isBatchRunning}
          className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed !text-white ${
            batchMode === 'forecast'
              ? 'bg-purple-600 hover:bg-purple-500'
              : 'bg-amber-600 hover:bg-amber-500'
          }`}
        >
          <Database className="w-4 h-4" />
          {isBatchRunning
            ? batchProgress && batchProgress.total > 0
              ? `배치 실행 중... (${batchProgress.current}/${batchProgress.total}${batchProgress.step === 'rate_limit_wait' ? ' · rate limit 대기' : ''})`
              : '배치 실행 중...'
            : batchMode === 'forecast'
              ? '예측 데이터 생성 (1개 주제, 약 1~2분)'
              : '공식 발표 수집 (2개 주제, 약 3~5분)'}
        </button>

        {batchResult && (
          <div className="bg-ink-100 border border-ink-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-emerald-600">
              완료: {batchResult.completed}/{batchResult.totalTopics} 주제 | 실패: {batchResult.failed}
            </p>
            <div className="text-xs text-ink-500 space-y-1 max-h-40 overflow-y-auto">
              {batchResult.results.map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate flex-1 mr-2">{r.topic}</span>
                  <span className="text-ink-400 whitespace-nowrap">
                    기업 {r.companiesSaved} · 제품 {r.productsSaved} · 기사 {r.articlesSaved} · 키워드 {r.keywordsSaved}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
