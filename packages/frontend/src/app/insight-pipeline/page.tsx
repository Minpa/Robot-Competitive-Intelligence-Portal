'use client';

import { useState } from 'react';
import { FlaskConical, FileText, Search } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ManualPasteMode } from '@/components/insight-pipeline/ManualPasteMode';
import { AIAgentMode } from '@/components/insight-pipeline/AIAgentMode';
import { InsightPanel } from '@/components/insight-pipeline/InsightPanel';
import { ExecutiveQuestions } from '@/components/insight-pipeline/ExecutiveQuestions';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/insight-pipeline';

const TABS = [
  { key: 'manual' as const, label: '기사 붙여넣기', icon: FileText },
  { key: 'ai-agent' as const, label: 'AI 기반 데이터 수집', icon: Search },
] as const;

export default function InsightPipelinePage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai-agent'>('manual');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setSaveSuccess(false);
    setIsDuplicate(false);
  };

  const handleSave = async (result: AnalysisResult) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsDuplicate(false);

    try {
      // Build linked entity IDs from entities that have been linked
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

      // Generate a simple content hash from the summary
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
          keywords: prev.entities.keywords,
        },
      };
    });
  };

  const handleQuestionClick = (question: string) => {
    setSearchQuery(question);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 p-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-violet-400" />
            기사 인사이트 파이프라인
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-10">
            기사 분석 · 엔티티 추출 · DB 저장
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: input mode + executive questions */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              {activeTab === 'manual' ? (
                <ManualPasteMode
                  onAnalysisComplete={handleAnalysisComplete}
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                  articleTitle={articleTitle}
                  setArticleTitle={setArticleTitle}
                />
              ) : (
                <AIAgentMode
                  onAnalysisComplete={handleAnalysisComplete}
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}
            </div>

            <ExecutiveQuestions
              activeTab={activeTab}
              onQuestionClick={handleQuestionClick}
            />
          </div>

          {/* Right column: insight panel */}
          <div>
            <InsightPanel
              result={analysisResult}
              sourceType={activeTab}
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
