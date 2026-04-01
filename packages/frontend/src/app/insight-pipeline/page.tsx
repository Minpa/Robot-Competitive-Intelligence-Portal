'use client';

import { useState } from 'react';
import { FlaskConical, Sparkles, Database } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ManualPasteMode } from '@/components/insight-pipeline/ManualPasteMode';
import { InsightPanel } from '@/components/insight-pipeline/InsightPanel';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

export default function InsightPipelinePage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [isAISearching, setIsAISearching] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{
    totalTopics: number; completed: number; failed: number;
    results: Array<{ topic: string; companiesSaved: number; productsSaved: number; articlesSaved: number; keywordsSaved: number; errors: string[] }>;
  } | null>(null);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setSaveSuccess(false);
    setIsDuplicate(false);
  };

  const handleAISearch = async () => {
    if (isAISearching) return;
    setAiError(null);
    setIsAISearching(true);

    try {
      const response = await api.aiSearch({
        query: '2025-2026년 휴머노이드 로봇 시장 동향 및 경쟁 분석',
        targetTypes: ['company', 'product', 'component', 'application', 'workforce', 'market', 'technology', 'keyword'],
        timeRange: { start: '2025', end: '2026' },
        region: '글로벌',
        provider: 'claude',
        webSearch: true,
      });

      const raw = response as any;
      const result: AnalysisResult = {
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

      handleAnalysisComplete(result);
    } catch (err: any) {
      setAiError(err?.message ?? 'AI 검색 중 오류가 발생했습니다.');
    } finally {
      setIsAISearching(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (isBatchRunning) return;
    setAiError(null);
    setIsBatchRunning(true);
    setBatchResult(null);

    try {
      const result = await api.generateDataBatch('claude', true);
      setBatchResult(result);
    } catch (err: any) {
      setAiError(err?.message ?? '배치 실행 중 오류가 발생했습니다.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  const handleSave = async (result: AnalysisResult) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsDuplicate(false);

    try {
      const linkedCompanyIds = result.entities.companies
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedRobotIds = result.entities.products
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedComponentIds = result.entities.components
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);
      const linkedApplicationIds = result.entities.applications
        .filter((e) => e.linkedEntityId)
        .map((e) => e.linkedEntityId!);

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
        keywords: result.entities.keywords.map((kw) => ({
          term: kw.term,
          relevance: kw.relevance,
        })),
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
        entities.map((e) =>
          e.name === entityName ? { ...e, linkedEntityId } : e
        );

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-violet-400" />
            기사 분석
          </h1>
          <div className="flex gap-3">
            <button
              onClick={handleAISearch}
              disabled={isAISearching}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
            >
              <Sparkles className="w-4 h-4" />
              {isAISearching ? 'AI 수집 중...' : 'AI 수집'}
            </button>
            <button
              onClick={handleBatchGenerate}
              disabled={isBatchRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Database className="w-4 h-4" />
              {isBatchRunning ? 'AI 수집 중...' : 'AI 일괄 수집'}
            </button>
          </div>
        </div>

        {/* AI action feedback */}
        {aiError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
            {aiError}
          </p>
        )}
        {batchResult && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
            <p className="text-sm text-emerald-400">
              완료: {batchResult.completed}/{batchResult.totalTopics} 주제 | 실패: {batchResult.failed}
            </p>
            <div className="text-xs text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              {batchResult.results.map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate flex-1 mr-2">{r.topic}</span>
                  <span className="text-slate-500 whitespace-nowrap">
                    기업 {r.companiesSaved} · 제품 {r.productsSaved} · 기사 {r.articlesSaved} · 키워드 {r.keywordsSaved}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: article input */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
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
              sourceType="manual"
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
