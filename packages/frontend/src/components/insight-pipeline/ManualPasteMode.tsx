'use client';

import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

interface ManualPasteModeProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  articleTitle: string;
  setArticleTitle: (v: string) => void;
}

const ANALYSIS_OPTIONS = [
  { key: 'companies', label: '회사' },
  { key: 'products', label: '제품·로봇' },
  { key: 'components', label: '부품' },
  { key: 'applications', label: '적용 사례' },
  { key: 'keywords', label: '키워드' },
  { key: 'summary', label: '요약' },
] as const;

const MIN_TEXT_LENGTH = 20;

export function ManualPasteMode({
  onAnalysisComplete,
  isAnalyzing,
  setIsAnalyzing,
  articleTitle,
  setArticleTitle,
}: ManualPasteModeProps) {
  const [rawText, setRawText] = useState('');
  const [options, setOptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ANALYSIS_OPTIONS.map((o) => [o.key, true]))
  );
  const [error, setError] = useState<string | null>(null);

  const isTooShort = rawText.length < MIN_TEXT_LENGTH;
  const canAnalyze = !isTooShort && !isAnalyzing;

  const toggleOption = (key: string) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setError(null);
    setIsAnalyzing(true);

    try {
      // Step 1: Parse article text
      const parseResponse = await api.parseArticle(rawText, undefined, options);
      const parsed = parseResponse.result;

      // Step 2: Collect all entities for linking
      const allEntities = [
        ...parsed.companies,
        ...parsed.products,
        ...parsed.components,
        ...parsed.applications,
      ];

      // Step 3: Link entities (only if there are entities to link)
      let linkCandidates: Record<string, any[]> = {};
      if (allEntities.length > 0) {
        const linkResponse = await api.linkEntities(allEntities);
        linkCandidates = linkResponse.candidates ?? {};
      }

      // Step 4: Transform into AnalysisResult
      const result: AnalysisResult = {
        summary: parsed.summary,
        entities: {
          companies: parsed.companies,
          products: parsed.products,
          components: parsed.components,
          applications: parsed.applications,
          keywords: parsed.keywords,
        },
        linkCandidates,
      };

      onAnalysisComplete(result);
    } catch (err: any) {
      setError(err?.message ?? '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-slate-300">
        <FileText className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-medium">기사 붙여넣기</h2>
      </div>

      {/* Title input */}
      <div>
        <label htmlFor="article-title" className="block text-sm text-slate-400 mb-1.5">
          기사 제목
        </label>
        <input
          id="article-title"
          type="text"
          value={articleTitle}
          onChange={(e) => setArticleTitle(e.target.value)}
          placeholder="기사 제목을 입력하세요"
          className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
        />
      </div>

      {/* Text area */}
      <div>
        <label htmlFor="article-text" className="block text-sm text-slate-400 mb-1.5">
          기사 본문 <span className="text-slate-500">(한국어·영어·일본어 등 다국어 지원)</span>
        </label>
        <textarea
          id="article-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="기사 원문을 붙여넣으세요 (최소 20자)"
          rows={12}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y"
        />
        {rawText.length > 0 && isTooShort && (
          <p className="mt-1.5 text-xs text-amber-400">
            최소 20자 이상 입력해야 분석할 수 있습니다. (현재 {rawText.length}자)
          </p>
        )}
      </div>

      {/* Analysis options */}
      <div>
        <p className="text-sm text-slate-400 mb-2">분석 옵션</p>
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleOption(opt.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                options[opt.key]
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              {opt.label}
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

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
      >
        <Sparkles className="w-4 h-4" />
        {isAnalyzing ? 'AI 분석 중...' : 'AI 분석 시작'}
      </button>
    </div>
  );
}
