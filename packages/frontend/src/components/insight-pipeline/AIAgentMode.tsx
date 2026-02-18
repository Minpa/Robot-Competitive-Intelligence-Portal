'use client';

import { useState } from 'react';
import { Search, Sparkles, Brain } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  const canSearch = searchQuery.trim().length > 0 && selectedTypes.size > 0 && !isAnalyzing;

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

    try {
      const response = await api.aiSearch({
        query: searchQuery,
        targetTypes: Array.from(selectedTypes),
        timeRange: { start: startYear, end: endYear },
        region,
        provider,
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
      <div className="flex items-center gap-2 text-slate-300">
        <Search className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-medium">AI 기반 데이터 수집</h2>
      </div>

      {/* Search input */}
      <div>
        <label htmlFor="ai-search-query" className="block text-sm text-slate-400 mb-1.5">
          검색 질문
        </label>
        <input
          id="ai-search-query"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="예: 2025년 휴머노이드 로봇 시장 동향은?"
          className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>

      {/* Target type multi-select */}
      <div>
        <p className="text-sm text-slate-400 mb-2">대상 유형</p>
        <div className="flex flex-wrap gap-2">
          {TARGET_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => toggleType(t.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                selectedTypes.has(t.key)
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
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
          <p className="text-sm text-slate-400 mb-1.5">시간 범위</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="시작"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
            <span className="text-slate-500 text-sm">~</span>
            <input
              type="text"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="종료"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Region */}
        <div>
          <p className="text-sm text-slate-400 mb-1.5">지역</p>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
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
          <Brain className="w-4 h-4 text-blue-400" />
          <p className="text-sm text-slate-400">AI 모델</p>
        </div>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                provider === p.key
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!canSearch}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
      >
        <Sparkles className="w-4 h-4" />
        {isAnalyzing ? 'AI 검색 중...' : 'AI 검색 시작'}
      </button>
    </div>
  );
}
