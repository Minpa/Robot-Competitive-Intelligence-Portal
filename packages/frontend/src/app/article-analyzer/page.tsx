'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';

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
      // 자동으로 높은 신뢰도 태그 선택
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
      // 폼 초기화
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">기사 분석 도구</h1>
            <p className="mt-2 text-gray-600">
              기사 원문을 붙여넣으면 AI가 요약하고 관련 정보를 추출합니다.
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">✓ 기사가 성공적으로 저장되었습니다.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 영역 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">기사 입력</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      제목 (선택)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="기사 제목을 입력하세요"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI 모델 선택
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="gpt-4o">GPT-4o (OpenAI)</option>
                      <option value="claude">Claude (Anthropic)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedModel === 'gpt-4o' 
                        ? 'GPT-4o: 빠르고 정확한 분석' 
                        : 'Claude: 깊이 있는 분석과 맥락 이해'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      기사 내용 *
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      분석용으로만 사용되며, 원문은 저장되지 않습니다.
                    </p>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="기사 원문을 여기에 붙여넣으세요..."
                      rows={15}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending || !content.trim()}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzeMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        분석 중...
                      </span>
                    ) : (
                      'AI 분석 시작'
                    )}
                  </button>

                  {analyzeMutation.isError && (
                    <p className="text-red-600 text-sm">
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
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 font-medium">⚠️ 중복 콘텐츠 감지</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        이 기사와 유사한 내용이 이미 데이터베이스에 존재합니다.
                      </p>
                    </div>
                  )}

                  {/* 요약 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">AI 요약</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.summary}</p>
                  </div>

                  {/* 추출된 메타데이터 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">추출된 정보</h2>
                    
                    <div className="space-y-4">
                      {analysisResult.metadata?.companies?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">회사</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.companies.map((company: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.products?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">제품</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.products.map((product: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                {product}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.technologies?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">기술</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.metadata.technologies.map((tech: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysisResult.metadata?.insights?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">인사이트</h3>
                          <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                            {analysisResult.metadata.insights.map((insight: string, idx: number) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 태그 선택 */}
                  {analysisResult.suggestedTags?.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">태그 선택</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        관련 로봇/회사를 선택하여 기사와 연결하세요.
                      </p>

                      <div className="space-y-4">
                        {/* 로봇 태그 */}
                        {analysisResult.suggestedTags.filter((t: any) => t.type === 'robot').length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">로봇</h3>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.suggestedTags
                                .filter((t: any) => t.type === 'robot')
                                .map((tag: any) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => toggleRobotTag(tag.id)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                      selectedRobotTags.includes(tag.id)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {tag.name}
                                    <span className="ml-1 text-xs opacity-70">
                                      ({Math.round(tag.confidence * 100)}%)
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 회사 태그 */}
                        {analysisResult.suggestedTags.filter((t: any) => t.type === 'company').length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">회사</h3>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.suggestedTags
                                .filter((t: any) => t.type === 'company')
                                .map((tag: any) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => toggleCompanyTag(tag.id)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                      selectedCompanyTags.includes(tag.id)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {tag.name}
                                    <span className="ml-1 text-xs opacity-70">
                                      ({Math.round(tag.confidence * 100)}%)
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
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        저장 중...
                      </span>
                    ) : (
                      '기사 저장'
                    )}
                  </button>

                  {saveMutation.isError && (
                    <p className="text-red-600 text-sm text-center">
                      저장 중 오류가 발생했습니다. 다시 시도해주세요.
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  <p>기사를 입력하고 분석 버튼을 클릭하세요.</p>
                  <p className="text-sm mt-2">AI가 자동으로 요약하고 관련 정보를 추출합니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
