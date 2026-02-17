'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ArticleInputPanel } from '@/components/analysis/ArticleInputPanel';
import { AnalysisResultPanel } from '@/components/analysis/AnalysisResultPanel';
import { EntityLinkingPanel } from '@/components/analysis/EntityLinkingPanel';
import { FlaskConical, CheckCircle, Save } from 'lucide-react';
import crypto from 'crypto';

export default function AnalysisPage() {
  const [parseResult, setParseResult] = useState<any>(null);
  const [linkResult, setLinkResult] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'result' | 'link' | 'saved'>('input');
  const [articleTitle, setArticleTitle] = useState('');

  const parseMutation = useMutation({
    mutationFn: (params: { text: string; options: Record<string, boolean> }) =>
      api.parseArticle(params.text, undefined, params.options),
    onSuccess: (data) => {
      setParseResult(data.result);
      setStep('result');
    },
  });

  const linkMutation = useMutation({
    mutationFn: (entities: any[]) => api.linkEntities(entities),
    onSuccess: (data) => {
      setLinkResult(data);
      setStep('link');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.saveAnalysis(data),
    onSuccess: () => {
      setStep('saved');
    },
  });

  const handleAnalyze = (text: string, options: Record<string, boolean>) => {
    parseMutation.mutate({ text, options });
  };

  const handleLink = () => {
    if (!parseResult) return;
    const allEntities = [
      ...parseResult.companies,
      ...parseResult.products,
      ...parseResult.components,
      ...parseResult.applications,
    ];
    linkMutation.mutate(allEntities);
  };

  const handleConfirmLinks = (
    links: { parsedName: string; linkedEntityId: string }[],
    newEntities: { name: string; type: string }[]
  ) => {
    // 링킹 확정 후 저장
    const companyIds = links.filter(l => {
      const cands = linkResult?.candidates?.[l.parsedName];
      return cands?.some((c: any) => c.entityId === l.linkedEntityId && c.entityType === 'company');
    }).map(l => l.linkedEntityId);

    const robotIds = links.filter(l => {
      const cands = linkResult?.candidates?.[l.parsedName];
      return cands?.some((c: any) => c.entityId === l.linkedEntityId && c.entityType === 'product');
    }).map(l => l.linkedEntityId);

    const componentIds = links.filter(l => {
      const cands = linkResult?.candidates?.[l.parsedName];
      return cands?.some((c: any) => c.entityId === l.linkedEntityId && c.entityType === 'component');
    }).map(l => l.linkedEntityId);

    const contentHash = Array.from(
      new Uint8Array(new TextEncoder().encode(parseResult.summary || '').buffer)
    ).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);

    saveMutation.mutate({
      title: articleTitle || '제목 없음',
      summary: parseResult.summary || '',
      contentHash,
      language: parseResult.detectedLanguage || 'ko',
      linkedCompanyIds: companyIds,
      linkedRobotIds: robotIds,
      linkedComponentIds: componentIds,
      linkedApplicationIds: [],
      keywords: parseResult.keywords || [],
    });
  };

  const handleReset = () => {
    setParseResult(null);
    setLinkResult(null);
    setStep('input');
    setArticleTitle('');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <FlaskConical className="w-6 h-6 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">기사 분석 파이프라인</h1>
            </div>
            <p className="text-slate-400">기사 원문 → 엔티티 추출 → DB 링킹 → 저장</p>
          </div>

          {step === 'saved' && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-300">기사가 성공적으로 저장되었습니다.</p>
              </div>
              <button onClick={handleReset} className="text-sm text-emerald-400 hover:text-emerald-300">
                새 기사 분석
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 입력 */}
            <div className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">기사 제목 (선택)</label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="기사 제목"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 outline-none"
                />
              </div>
              <ArticleInputPanel onAnalyze={handleAnalyze} isLoading={parseMutation.isPending} />
            </div>

            {/* 우측: 결과 */}
            <div className="space-y-4">
              <AnalysisResultPanel result={parseResult} />

              {parseResult && step === 'result' && (
                <button
                  onClick={handleLink}
                  disabled={linkMutation.isPending}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                >
                  {linkMutation.isPending ? '링킹 중...' : '엔티티 링킹 시작'}
                </button>
              )}

              {linkResult && step === 'link' && (
                <EntityLinkingPanel
                  candidates={linkResult.candidates}
                  unmatched={linkResult.unmatched}
                  onConfirm={handleConfirmLinks}
                  isLoading={saveMutation.isPending}
                />
              )}

              {(parseMutation.isError || linkMutation.isError || saveMutation.isError) && (
                <p className="text-red-400 text-sm text-center">오류가 발생했습니다. 다시 시도해주세요.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
