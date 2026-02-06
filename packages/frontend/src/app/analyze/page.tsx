'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Save,
  Building2,
  Package,
  FileText,
  Tag,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface AnalyzedData {
  companies: Array<{ name: string; country: string; category: string; description?: string }>;
  products: Array<{ name: string; companyName: string; type: string; releaseDate?: string; description?: string }>;
  articles: Array<{ title: string; source: string; url?: string; summary: string; category: string; productType: string }>;
  keywords: string[];
  summary: string;
}

interface SaveResult {
  companiesSaved: number;
  productsSaved: number;
  articlesSaved: number;
  errors: string[];
}

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedData | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalyzed(null);
    setSaveResult(null);

    try {
      const result = await api.analyzeTextPreview(text);
      setAnalyzed(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await api.analyzeAndSave(text);
      setAnalyzed(result.analyzed);
      setSaveResult(result.saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalExtracted = analyzed
    ? analyzed.companies.length + analyzed.products.length + analyzed.articles.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">텍스트 분석</h1>
        <p className="text-gray-500">텍스트를 입력하면 AI가 분석하여 회사, 제품, 기사 정보를 추출합니다.</p>
      </div>

      {/* 입력 영역 */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          분석할 텍스트 입력
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="뉴스 기사, 보도자료, 제품 정보 등을 붙여넣기 하세요...

예시:
- 로봇 회사 소개 및 제품 정보
- 기술 뉴스 기사
- 제품 출시 보도자료
- 연구 논문 초록"
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
        />
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {text.length.toLocaleString()} 자
          </span>
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              미리보기
            </button>
            <button
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || isSaving || !text.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              분석 및 저장
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 저장 결과 */}
      {saveResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-700">저장 완료</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.companiesSaved}</p>
              <p className="text-gray-500">회사</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.productsSaved}</p>
              <p className="text-gray-500">제품</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.articlesSaved}</p>
              <p className="text-gray-500">기사</p>
            </div>
          </div>
          {saveResult.errors.length > 0 && (
            <div className="mt-3 text-sm text-orange-600">
              <p className="font-medium">일부 항목 저장 실패:</p>
              <ul className="list-disc list-inside">
                {saveResult.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 분석 결과 */}
      {analyzed && (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-700 mb-2">AI 요약</h3>
            <p className="text-gray-700">{analyzed.summary || '요약 없음'}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-blue-600">
              <span>총 {totalExtracted}개 항목 추출</span>
            </div>
          </div>

          {/* 키워드 */}
          {analyzed.keywords.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-purple-500" />
                <h3 className="font-medium">추출된 키워드</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {analyzed.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 회사 */}
          {analyzed.companies.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium">추출된 회사 ({analyzed.companies.length})</h3>
              </div>
              <div className="space-y-2">
                {analyzed.companies.map((company, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{company.name}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {company.country}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                          {company.category}
                        </span>
                      </div>
                    </div>
                    {company.description && (
                      <p className="text-sm text-gray-500 mt-1">{company.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 제품 */}
          {analyzed.products.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-green-500" />
                <h3 className="font-medium">추출된 제품 ({analyzed.products.length})</h3>
              </div>
              <div className="space-y-2">
                {analyzed.products.map((product, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{product.name}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {product.type}
                        </span>
                        {product.releaseDate && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                            {product.releaseDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{product.companyName}</p>
                    {product.description && (
                      <p className="text-sm text-gray-400 mt-1">{product.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 기사 */}
          {analyzed.articles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="font-medium">추출된 기사 ({analyzed.articles.length})</h3>
              </div>
              <div className="space-y-2">
                {analyzed.articles.map((article, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{article.title}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                          {article.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                          {article.source}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{article.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 사용 안내 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-yellow-800 mb-2">💡 사용 팁</h4>
        <ul className="list-disc list-inside text-yellow-700 space-y-1">
          <li>뉴스 기사, 보도자료, 제품 소개 등 다양한 텍스트를 분석할 수 있습니다.</li>
          <li>"미리보기"로 먼저 결과를 확인한 후 저장하세요.</li>
          <li>이미 저장된 회사/제품은 중복 저장되지 않습니다.</li>
          <li>긴 텍스트도 입력 가능하지만, 8000자까지만 분석됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
