'use client';

import { useState } from 'react';
import { Search, Sparkles, Brain, Globe, Database } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    totalTopics: number; completed: number; failed: number;
    results: Array<{ topic: string; companiesSaved: number; productsSaved: number; articlesSaved: number; keywordsSaved: number; errors: string[] }>;
  } | null>(null);

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
      <div className="flex items-center gap-2 text-argos-inkSoft">
        <Search className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-medium">AI 기반 데이터 수집</h2>
      </div>

      {/* Search input */}
      <div>
        <label htmlFor="ai-search-query" className="block text-sm text-argos-muted mb-1.5">
          검색 질문
        </label>
        <input
          id="ai-search-query"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="예: 2025년 휴머노이드 로봇 시장 동향은?"
          className="w-full px-4 py-2.5 bg-argos-bgAlt border border-argos-border rounded-lg text-argos-inkSoft placeholder-argos-faint focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>

      {/* Target type multi-select */}
      <div>
        <p className="text-sm text-argos-muted mb-2">대상 유형</p>
        <div className="flex flex-wrap gap-2">
          {TARGET_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => toggleType(t.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                selectedTypes.has(t.key)
                  ? 'bg-violet-500/10 text-violet-600 border-violet-500/30'
                  : 'bg-argos-bgAlt text-argos-faint border-argos-border hover:border-argos-border'
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
          <p className="text-sm text-argos-muted mb-1.5">시간 범위</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="시작"
              className="w-full px-3 py-2 bg-argos-bgAlt border border-argos-border rounded-lg text-argos-inkSoft text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            <span className="text-argos-faint text-sm">~</span>
            <input
              type="text"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="종료"
              className="w-full px-3 py-2 bg-argos-bgAlt border border-argos-border rounded-lg text-argos-inkSoft text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Region */}
        <div>
          <p className="text-sm text-argos-muted mb-1.5">지역</p>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 bg-argos-bgAlt border border-argos-border rounded-lg text-argos-inkSoft text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
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
          <p className="text-sm text-argos-muted">AI 모델</p>
        </div>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                provider === p.key
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                  : 'bg-argos-bgAlt text-argos-faint border-argos-border hover:border-argos-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Web search toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-argos-bgAlt border border-argos-borderSoft rounded-lg">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-sm text-argos-inkSoft">웹 검색 (실시간 최신 정보)</p>
            <p className="text-xs text-argos-faint">활성화 시 최신 뉴스·발표 기반으로 응답합니다</p>
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
        <p className="text-sm text-argos-danger bg-argos-dangerBg border border-red-500/20 rounded-lg px-4 py-2.5">
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
      <div className="border-t border-argos-borderSoft pt-5 mt-2 space-y-3">
        <div className="flex items-center gap-2 text-argos-inkSoft">
          <Database className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-medium">배치 데이터 생성</p>
        </div>
        <p className="text-xs text-argos-faint">
          10개 주제(기업, 중국시장, 일한, SoC, 액추에이터, 적용사례, 투자, AI모델, 유럽, 센서)를 한 번에 실행하여 DB에 저장합니다.
        </p>
        <button
          onClick={async () => {
            setIsBatchRunning(true);
            setBatchResult(null);
            setError(null);
            try {
              const result = await api.generateDataBatch(provider, webSearch);
              setBatchResult(result);
            } catch (err: any) {
              setError(err?.message ?? '배치 실행 중 오류가 발생했습니다.');
            } finally {
              setIsBatchRunning(false);
            }
          }}
          disabled={isBatchRunning}
          className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 !text-white"
        >
          <Database className="w-4 h-4" />
          {isBatchRunning ? '배치 실행 중... (약 1~2분 소요)' : '배치 데이터 생성 (10개 주제)'}
        </button>

        {batchResult && (
          <div className="bg-argos-bgAlt border border-argos-border rounded-lg p-4 space-y-2">
            <p className="text-sm text-emerald-600">
              완료: {batchResult.completed}/{batchResult.totalTopics} 주제 | 실패: {batchResult.failed}
            </p>
            <div className="text-xs text-argos-muted space-y-1 max-h-40 overflow-y-auto">
              {batchResult.results.map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate flex-1 mr-2">{r.topic}</span>
                  <span className="text-argos-faint whitespace-nowrap">
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
