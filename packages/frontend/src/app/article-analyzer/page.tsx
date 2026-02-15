'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { FileText, Sparkles, Building2, Package, Cpu, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';

type AIModel = 'gpt-4o' | 'claude';

export default function ArticleAnalyzerPage() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4o');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedRobotTags, setSelectedRobotTags] = useState<string[]>([]);
  const [selectedCompanyTags, setSelectedCompanyTags] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: () => api.analyzeArticle(content, selectedModel),
    onSuccess: (data) => {
      setAnalysisResult(data);
      const autoSelectedRobots = data.suggestedTags
        .filter((t: any) => t.type === 'robot' && t.confidence > 0.7)
        .map((t: any) => t.id);
      const autoSelectedCompanies = data.suggestedTags
        .filter((t: any) => t.type === 'company' && t.confidence > 0.7)
        .map((t: any) => t.id);
      setSelectedRobotTags(autoSelectedRobots);
      setSelectedCompanyTags(autoSelectedCompanies);
      setSaveSuccess(false);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.saveAnalyzedArticle({
      title: title || '제목 없음',
      summary: analysisResult?.summary || '',
      metadata: analysisResult?.metadata || {},
      robotTags: selectedRobotTags,
      companyTags: selectedCompanyTags,
    }),
    onSuccess: () => {
      setSaveSuccess(true);
      setContent('');
      setTitle('');
      setAnalysisResult(null);
      setSelectedRobotTags([]);
      setSelectedCompanyTags([]);
    },
  });

  const handleAnalyze = () => {
    if (!content.trim()) {
      alert('기사 내용을 입력해주세요.');
      return;
    }
    analyzeMutation.mutate();
  };

  const handleSave = () => {
    if (!analysisResult) {
      alert('먼저 기사를 분석해주세요.');
      return;
    }
    saveMutation.mutate();
  };

  const toggleRobotTag = (id: string) => {
    setSelectedRobotTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleCompanyTag = (id: string) => {
    setSelectedCompanyTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">기사 분석 도구</h1>
            </div>
            <p className="text-slate-400">
              기사 원문을 붙여넣으면 AI가 요약하고 관련 정보를 추출합니다.
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-300">기사가 성공적으로 저장되었습니다.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 영역 */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  기사 입력
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      제목 (선택)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="기사 제목을 입력하세요"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      AI 모델 선택
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors"
                    >
                      <option value="gpt-4o">GPT-4o (OpenAI)</option>
                      <option value="claude">Claude (Anthropic)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {selectedModel === 'gpt-4o' 
                        ? 'GPT-4o: 빠르고 정확한 분석' 
                        : 'Claude: 깊이 있는 분석과 맥락 이해'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      기사 내용 *
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      분석용으로만 사용되며, 원문은 저장되지 않습니다.
                    </p>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="기사 원문을 여기에 붙여넣으세요..."
                      rows={15}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1.5 text-right">
                      {content.length.toLocaleString()} 자
                    </p>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending || !content.trim()}
                    className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {analyzeMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                        분석 중...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI 분석 시작
                      </span>
                    )}
                  </button>

                  {analyzeMutation.isError && (
                    <p className="text-red-400 text-sm text-center">
                      분석 중 오류가 발생했습니다. 다시 시도해주세요.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 결과 영역 */}
            <div className="space-y-6">
              {analysisResult ? (
                <>
                  {/* 중복 경고 */}
                  {analysisResult.isDuplicate && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-amber-300 font-medium">중복 콘텐츠 감지</p>
                        <p className="text-amber-400/70 text-sm mt-1">
                          이 기사와 유사한 내용이 이미 데이터베이스에 존재합니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 요약 */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      AI 요약
                    </h2>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{analysisResult.summary}</p>
                  </div>

                  {/* 추출된 메타데이터 */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">추출된 정보</h2>
                    
                    <div className="space-y-5">
                      {analysisResult.metadata?.companies?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            회사
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.companies.map((company: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm border border-blue-500/30">
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.products?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            제품
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.products.map((product: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm border border-emerald-500/30">
                                {product}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.technologies?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            기술
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.technologies.map((tech: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm border border-purple-500/30">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.insights?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            인사이트
                          </h3>
                          <ul className="space-y-2">
                            {analysisResult.metadata.insights.map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                                <span className="text-amber-400 mt-1">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 태그 선택 */}
                  {analysisResult.suggestedTags?.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                      <h2 className="text-lg font-semibold text-white mb-2">태그 선택</h2>
                      <p className="text-sm text-slate-400 mb-4">
                        관련 로봇/회사를 선택하여 기사와 연결하세요.
                      </p>

                      <div className="space-y-4">
                        {analysisResult.suggestedTags.filter((t: any) => t.type === 'robot').length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">로봇</h3>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.suggestedTags
                                .filter((t: any) => t.type === 'robot')
                                .map((tag: any) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => toggleRobotTag(tag.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      selectedRobotTags.includes(tag.id)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                                  >
                                    {tag.name}
                                    <span className="ml-1.5 text-xs opacity-70">
                                      {Math.round(tag.confidence * 100)}%
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {analysisResult.suggestedTags.filter((t: any) => t.type === 'company').length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-300 mb-2">회사</h3>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.suggestedTags
                                .filter((t: any) => t.type === 'company')
                                .map((tag: any) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => toggleCompanyTag(tag.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      selectedCompanyTags.includes(tag.id)
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                                  >
                                    {tag.name}
                                    <span className="ml-1.5 text-xs opacity-70">
                                      {Math.round(tag.confidence * 100)}%
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 저장 버튼 */}
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || analysisResult.isDuplicate}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saveMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                        저장 중...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        기사 저장
                      </span>
                    )}
                  </button>

                  {saveMutation.isError && (
                    <p className="text-red-400 text-sm text-center">
                      저장 중 오류가 발생했습니다. 다시 시도해주세요.
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400">기사를 입력하고 분석 버튼을 클릭하세요.</p>
                  <p className="text-sm text-slate-500 mt-2">AI가 자동으로 요약하고 관련 정보를 추출합니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
