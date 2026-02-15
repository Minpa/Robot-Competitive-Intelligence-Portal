'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  Sparkles, Building2, Package, Tag, Loader2, CheckCircle,
  AlertCircle, Plus, Globe, Factory, Cog, Lightbulb,
  ChevronRight, ExternalLink, Database, FileText
} from 'lucide-react';

const LANGUAGES = [
  { id: 'auto', label: '자동 감지 (기본)' },
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'ja', label: '日本語' },
  { id: 'de', label: 'Deutsch' },
];

interface AnalysisResult {
  summary: string;
  companies: Array<{
    name: string;
    type: string;
    country?: string;
    isNew?: boolean;
  }>;
  products: Array<{
    name: string;
    category: string;
    companyName?: string;
    isNew?: boolean;
  }>;
  applications: Array<{
    environment: string;
    task: string;
    status: string;
  }>;
  keywords: string[];
  insights: string[];
}

export default function AnalyzePage() {
  const [articleContent, setArticleContent] = useState('');
  const [language, setLanguage] = useState('auto');
  const [autoDetect, setAutoDetect] = useState(true);
  
  // 분석 옵션
  const [options, setOptions] = useState({
    extractCompanies: true,
    extractProducts: true,
    extractApplications: true,
    extractKeywords: true,
    generateInsights: true,
  });

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI 분석 mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      // 실제 API 호출 대신 시뮬레이션 (API가 준비되면 교체)
      const response = await api.analyzeTextPreview(articleContent);
      return response;
    },
    onSuccess: (data) => {
      // API 응답을 result 형식으로 변환
      setResult({
        summary: data.summary || '분석 결과 요약이 생성되었습니다.',
        companies: (data.companies || []).map((c: any) => ({
          name: c.name,
          type: c.category || c.type || '기업',
          country: c.country,
          isNew: true,
        })),
        products: (data.products || []).map((p: any) => ({
          name: p.name,
          category: p.type || 'robot',
          companyName: p.companyName,
          isNew: true,
        })),
        applications: [],
        keywords: data.keywords || [],
        insights: [
          '이 기사는 로봇 산업의 최신 동향을 다루고 있습니다.',
          '주요 기업들의 기술 발전 현황이 포함되어 있습니다.',
          '시장 전망에 대한 정보가 포함되어 있습니다.',
        ],
      });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    },
  });

  const handleAnalyze = () => {
    if (!articleContent.trim()) {
      setError('기사 내용을 입력해주세요.');
      return;
    }
    if (articleContent.length < 100) {
      setError('최소 100자 이상의 내용을 입력해주세요.');
      return;
    }
    setError(null);
    analyzeMutation.mutate();
  };

  const charCount = articleContent.length;
  const isOptimalLength = charCount >= 1000 && charCount <= 6000;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📰</span>
              기사 분석 도구
            </h1>
            <p className="text-slate-400 mt-1">AI를 활용하여 기사에서 회사, 제품, 적용 사례 등 핵심 정보를 추출합니다</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 입력 영역 */}
            <div className="space-y-4">
              {/* 기사 원문 입력 */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  기사 원문 입력
                </h2>
                
                <textarea
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="기사에서 중요한 부분을 그대로 붙여넣으세요 (한국어/영어/중국어 등 대부분 언어 지원)"
                  className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                />
                
                {/* 글자 수 표시 */}
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${isOptimalLength ? 'text-green-400' : 'text-slate-500'}`}>
                    {charCount.toLocaleString()}자
                    {!isOptimalLength && charCount > 0 && (
                      <span className="text-slate-500 ml-1">
                        (권장: 1,000–6,000자)
                      </span>
                    )}
                  </span>
                  {isOptimalLength && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      적정 길이
                    </span>
                  )}
                </div>

                {/* 언어 설정 */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDetect}
                        onChange={(e) => setAutoDetect(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">기사 언어 자동 감지</span>
                    </label>
                    
                    {!autoDetect && (
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5"
                      >
                        {LANGUAGES.slice(1).map(lang => (
                          <option key={lang.id} value={lang.id}>{lang.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 분석 옵션 */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cog className="w-5 h-5 text-purple-400" />
                  분석 옵션
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.extractCompanies}
                      onChange={(e) => setOptions(prev => ({ ...prev, extractCompanies: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">회사·기관 추출</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.extractProducts}
                      onChange={(e) => setOptions(prev => ({ ...prev, extractProducts: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <Package className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">제품·로봇·부품 추출</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.extractApplications}
                      onChange={(e) => setOptions(prev => ({ ...prev, extractApplications: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <Factory className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">환경·작업·적용 사례 추출</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.extractKeywords}
                      onChange={(e) => setOptions(prev => ({ ...prev, extractKeywords: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <Tag className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">키워드·테마 추출</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.generateInsights}
                      onChange={(e) => setOptions(prev => ({ ...prev, generateInsights: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                    <Lightbulb className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">3줄 요약 인사이트</span>
                  </label>
                </div>

                {/* 분석 버튼 */}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending || !articleContent.trim()}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI 분석 시작
                    </>
                  )}
                </button>

                {/* 에러 메시지 */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 결과 패널 */}
            <div className="space-y-4">
              {!result && !analyzeMutation.isPending && (
                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8 text-center">
                  <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500">기사를 입력하고 AI 분석을 시작하세요</p>
                  <p className="text-slate-600 text-sm mt-2">분석 결과가 여기에 표시됩니다</p>
                </div>
              )}

              {analyzeMutation.isPending && (
                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-8 text-center">
                  <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-300">AI가 기사를 분석하고 있습니다...</p>
                  <p className="text-slate-500 text-sm mt-2">잠시만 기다려주세요</p>
                </div>
              )}

              {result && (
                <>
                  {/* 요약 카드 */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur rounded-xl border border-blue-500/30 p-5">
                    <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      요약
                    </h3>
                    <p className="text-slate-200 leading-relaxed">{result.summary}</p>
                  </div>

                  {/* 회사·기관 */}
                  {result.companies.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        회사·기관
                        <span className="text-slate-500 text-xs">({result.companies.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {result.companies.map((company, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{company.name}</p>
                                <p className="text-xs text-slate-500">
                                  {company.type}
                                  {company.country && ` · ${company.country}`}
                                </p>
                              </div>
                              {company.isNew && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">NEW</span>
                              )}
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-all">
                              <Database className="w-3 h-3" />
                              DB 추가
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 제품·로봇·부품 */}
                  {result.products.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-400" />
                        제품·로봇·부품
                        <span className="text-slate-500 text-xs">({result.products.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {result.products.map((product, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <Package className="w-4 h-4 text-green-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{product.name}</p>
                                <p className="text-xs text-slate-500">
                                  {product.category}
                                  {product.companyName && ` · ${product.companyName}`}
                                </p>
                              </div>
                              {product.isNew && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">NEW</span>
                              )}
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 transition-all">
                              <Database className="w-3 h-3" />
                              DB 추가
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 적용 정보 */}
                  {result.applications.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Factory className="w-4 h-4 text-yellow-400" />
                        적용 정보
                        <span className="text-slate-500 text-xs">({result.applications.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {result.applications.map((app, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                {app.environment}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-300">{app.task}</span>
                              <span className="text-slate-500">·</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                app.status === 'production' ? 'bg-green-500/20 text-green-400' :
                                app.status === 'pilot' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>
                                {app.status === 'production' ? '상용' : app.status === 'pilot' ? '파일럿' : 'PoC'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 키워드·테마 */}
                  {result.keywords.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-cyan-400" />
                        키워드·테마
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 인사이트 */}
                  {result.insights.length > 0 && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-orange-400" />
                        핵심 포인트
                      </h3>
                      <div className="space-y-2">
                        {result.insights.map((insight, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                            <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-medium">
                              {idx + 1}
                            </span>
                            <p className="text-sm text-slate-300">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 새로 등장한 엔티티 알림 */}
                  {(result.companies.some(c => c.isNew) || result.products.some(p => p.isNew)) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        새로 등장한 엔티티
                      </h3>
                      <p className="text-xs text-slate-400">
                        이 기사에서 DB에 없는 새로운 회사/제품이 발견되었습니다. 
                        "DB 추가" 버튼을 클릭하여 데이터베이스에 등록할 수 있습니다.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
