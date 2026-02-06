'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Building2,
  Package,
  Tag,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
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
  keywordsSaved?: number;
  errors: string[];
}

const DEFAULT_PROMPT = `아래 JSON 형식으로 로봇 산업 데이터를 정리해줘:

{
  "companies": [
    { "name": "회사명 (영문)", "country": "USA/Japan/China/Germany/Korea/Denmark/Switzerland 중 하나", "category": "robotics/AI/semiconductor/actuator/automation 중 하나" }
  ],
  "products": [
    { "name": "제품/모델명", "companyName": "제조사명", "type": "humanoid/service/logistics/industrial/quadruped/cobot/amr/foundation_model/actuator/soc 중 하나", "releaseDate": "YYYY 형식 (예: 2022, 2023, 2024)", "description": "제품 설명" }
  ],
  "keywords": ["키워드1", "키워드2", "...최대 15개"],
  "summary": "한국어 요약 2-3문장"
}

JSON만 출력. 마크다운 코드블록 없이 순수 JSON으로.`;

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedData | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    ? analyzed.companies.length + analyzed.products.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">데이터 수집</h1>
        <p className="text-gray-500">AI를 활용하여 로봇 산업 데이터를 수집하고 분석합니다.</p>
      </div>

      {/* AI 질의문 템플릿 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium text-purple-700">AI 질의문 템플릿</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyPrompt();
              }}
              className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              <Copy className="w-4 h-4" />
              {copied ? '복사됨!' : '복사'}
            </button>
            {showPrompt ? (
              <ChevronUp className="w-5 h-5 text-purple-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-500" />
            )}
          </div>
        </div>
        
        {showPrompt && (
          <div className="mt-4">
            <p className="text-sm text-purple-600 mb-2">
              이 질의문을 ChatGPT, Claude 등에 복사하여 사용하세요. 수집한 정보를 붙여넣으면 JSON 형식으로 정리해줍니다.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-48 p-3 border border-purple-200 rounded-lg bg-white text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={() => setPrompt(DEFAULT_PROMPT)}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              기본값으로 초기화
            </button>
          </div>
        )}
      </div>

      {/* 사용 방법 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-3">📋 데이터 수집 방법</h4>
        <ol className="list-decimal list-inside text-blue-700 space-y-2 text-sm">
          <li>위의 <strong>"AI 질의문 템플릿"</strong>을 복사합니다.</li>
          <li>ChatGPT, Claude 등 AI 서비스에 질의문을 붙여넣고, 수집할 정보(뉴스, 보고서 등)를 함께 입력합니다.</li>
          <li>AI가 생성한 JSON 결과를 아래 입력창에 붙여넣습니다.</li>
          <li><strong>"분석 및 저장"</strong> 버튼을 클릭하면 데이터가 DB에 저장됩니다.</li>
        </ol>
      </div>

      {/* 입력 영역 */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          분석할 텍스트 또는 JSON 입력
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`AI가 생성한 JSON을 붙여넣거나, 분석할 텍스트를 입력하세요.

예시 (JSON):
{
  "companies": [
    { "name": "Tesla", "country": "USA", "category": "robotics" }
  ],
  "products": [
    { "name": "Optimus", "companyName": "Tesla", "type": "humanoid", "releaseDate": "2022", "description": "테슬라 휴머노이드 로봇" }
  ],
  "keywords": ["humanoid", "Tesla"],
  "summary": "테슬라의 휴머노이드 로봇 정보"
}`}
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono"
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
          <div className="grid grid-cols-4 gap-4 text-sm">
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
            <div className="text-center p-2 bg-white rounded">
              <p className="text-2xl font-bold text-green-600">{saveResult.keywordsSaved}</p>
              <p className="text-gray-500">키워드</p>
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
        </div>
      )}
    </div>
  );
}
