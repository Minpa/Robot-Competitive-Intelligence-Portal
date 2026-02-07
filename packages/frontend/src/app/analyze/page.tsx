'use client';

import { useState, useEffect } from 'react';
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
  Plus,
  X,
  Settings,
  Zap,
  RefreshCw,
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

// 기본 카테고리 설정
const DEFAULT_PRODUCT_TYPES = [
  'humanoid', 'service', 'logistics', 'industrial', 'quadruped', 
  'cobot', 'amr', 'foundation_model', 'actuator', 'soc'
];

const DEFAULT_COMPANY_CATEGORIES = [
  'robotics', 'AI', 'semiconductor', 'actuator', 'automation'
];

const DEFAULT_COUNTRIES = [
  'USA', 'Japan', 'China', 'Germany', 'Korea', 'Denmark', 'Switzerland', 'France', 'UK', 'Taiwan'
];

// 자동 질의 주제 옵션
const AUTO_QUERY_TOPICS = [
  { id: 'humanoid', label: '휴머노이드 로봇', query: '휴머노이드 로봇 시장의 주요 기업들과 제품들을 분석해줘. Tesla Optimus, Figure, Agility Robotics, Boston Dynamics, 1X Technologies, Apptronik, Unitree, UBTECH 등 주요 기업의 제품, 출시일, 매출규모, 시장점유율, 기술 특징을 포함해줘.' },
  { id: 'cobot', label: '협동로봇 (Cobot)', query: '협동로봇(Cobot) 시장의 주요 기업들과 제품들을 분석해줘. Universal Robots, FANUC, ABB, KUKA, Doosan Robotics, Techman Robot 등 주요 기업의 제품 라인업, 출시일, 매출규모, 시장점유율을 포함해줘.' },
  { id: 'amr', label: 'AMR/물류로봇', query: 'AMR(자율이동로봇)과 물류로봇 시장의 주요 기업들과 제품들을 분석해줘. Amazon Robotics, Locus Robotics, 6 River Systems, Fetch Robotics, MiR, Geek+ 등 주요 기업의 제품, 출시일, 매출규모, 시장점유율을 포함해줘.' },
  { id: 'foundation_model', label: 'RFM (로봇 파운데이션 모델)', query: '로봇 파운데이션 모델(Robot Foundation Model) 분야의 주요 기업들과 모델들을 분석해줘. Google RT-1/RT-2/RT-X, Physical Intelligence π₀, NVIDIA Isaac, OpenAI 등 주요 기업의 모델, 발표일, 기술 특징, 시장 영향력을 포함해줘.' },
  { id: 'actuator', label: '액츄에이터/부품', query: '로봇 액츄에이터와 핵심 부품 시장의 주요 기업들과 제품들을 분석해줘. Harmonic Drive, Nabtesco, Maxon, Faulhaber, 삼성전자, LG전자 등 주요 기업의 제품, 매출규모, 시장점유율, 기술 특징을 포함해줘.' },
  { id: 'quadruped', label: '사족보행 로봇', query: '사족보행 로봇 시장의 주요 기업들과 제품들을 분석해줘. Boston Dynamics Spot, Unitree Go1/Go2/B2, ANYbotics ANYmal, Ghost Robotics 등 주요 기업의 제품, 출시일, 가격, 매출규모, 시장점유율을 포함해줘.' },
  { id: 'service', label: '서비스 로봇', query: '서비스 로봇 시장의 주요 기업들과 제품들을 분석해줘. 배달로봇, 안내로봇, 청소로봇 등 분야별 주요 기업의 제품, 출시일, 매출규모, 시장점유율을 포함해줘.' },
];

const STORAGE_KEY = 'rcip_categories';

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoQuery, setShowAutoQuery] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoQuerying, setIsAutoQuerying] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedData | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [categoryUpdated, setCategoryUpdated] = useState(false);

  // 카테고리 상태
  const [productTypes, setProductTypes] = useState<string[]>(DEFAULT_PRODUCT_TYPES);
  const [companyCategories, setCompanyCategories] = useState<string[]>(DEFAULT_COMPANY_CATEGORIES);
  const [countries, setCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [newProductType, setNewProductType] = useState('');
  const [newCompanyCategory, setNewCompanyCategory] = useState('');
  const [newCountry, setNewCountry] = useState('');

  // 로컬 스토리지에서 카테고리 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.productTypes) setProductTypes(parsed.productTypes);
        if (parsed.companyCategories) setCompanyCategories(parsed.companyCategories);
        if (parsed.countries) setCountries(parsed.countries);
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    }
  }, []);

  // 카테고리 저장 및 알림
  const saveCategories = (types: string[], categories: string[], ctrs: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      productTypes: types,
      companyCategories: categories,
      countries: ctrs,
    }));
    setCategoryUpdated(true);
    setTimeout(() => setCategoryUpdated(false), 2000);
  };

  // 동적 프롬프트 생성 (더 세세한 분석 요청)
  const generatePrompt = () => {
    return `아래 JSON 형식으로 로봇 산업 데이터를 상세히 정리해줘:

{
  "companies": [
    { 
      "name": "회사명 (영문)", 
      "country": "${countries.join('/')} 중 하나", 
      "category": "${companyCategories.join('/')} 중 하나",
      "description": "회사 설명 (설립연도, 주요 사업, 매출규모, 직원수, 시장 위치 등 포함)"
    }
  ],
  "products": [
    { 
      "name": "제품/모델명", 
      "companyName": "제조사명", 
      "type": "${productTypes.join('/')} 중 하나", 
      "releaseDate": "YYYY-MM 형식 (예: 2023-06, 2024-01)", 
      "description": "제품 설명 (주요 스펙, 가격대, 판매량, 시장 반응, 경쟁 제품 대비 특징 등 포함)"
    }
  ],
  "keywords": ["키워드1", "키워드2", "...최대 15개"],
  "summary": "한국어 요약 3-5문장 (시장 트렌드, 주요 기업 동향, 기술 발전 방향 포함)"
}

중요 요청사항:
1. 각 회사의 매출규모, 시장점유율, 직원수 등 정량적 데이터를 최대한 포함
2. 각 제품의 출시일은 YYYY-MM 형식으로 정확히 기재 (알고 있는 경우)
3. 제품 가격, 판매량, 시장 반응 등 상세 정보 포함
4. 경쟁사 대비 기술적 우위/열위 분석 포함
5. 시장 트렌드와 향후 전망 포함

JSON만 출력. 마크다운 코드블록 없이 순수 JSON으로.`;
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addProductType = () => {
    if (newProductType && !productTypes.includes(newProductType.toLowerCase())) {
      const updated = [...productTypes, newProductType.toLowerCase()];
      setProductTypes(updated);
      saveCategories(updated, companyCategories, countries);
      setNewProductType('');
    }
  };

  const removeProductType = (type: string) => {
    const updated = productTypes.filter(t => t !== type);
    setProductTypes(updated);
    saveCategories(updated, companyCategories, countries);
  };

  const addCompanyCategory = () => {
    if (newCompanyCategory && !companyCategories.includes(newCompanyCategory.toLowerCase())) {
      const updated = [...companyCategories, newCompanyCategory.toLowerCase()];
      setCompanyCategories(updated);
      saveCategories(productTypes, updated, countries);
      setNewCompanyCategory('');
    }
  };

  const removeCompanyCategory = (cat: string) => {
    const updated = companyCategories.filter(c => c !== cat);
    setCompanyCategories(updated);
    saveCategories(productTypes, updated, countries);
  };

  const addCountry = () => {
    if (newCountry && !countries.includes(newCountry)) {
      const updated = [...countries, newCountry];
      setCountries(updated);
      saveCategories(productTypes, companyCategories, updated);
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    const updated = countries.filter(c => c !== country);
    setCountries(updated);
    saveCategories(productTypes, companyCategories, updated);
  };

  const resetToDefaults = () => {
    setProductTypes(DEFAULT_PRODUCT_TYPES);
    setCompanyCategories(DEFAULT_COMPANY_CATEGORIES);
    setCountries(DEFAULT_COUNTRIES);
    saveCategories(DEFAULT_PRODUCT_TYPES, DEFAULT_COMPANY_CATEGORIES, DEFAULT_COUNTRIES);
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

      {/* 자동 AI 질의 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowAutoQuery(!showAutoQuery)}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-green-700">자동 AI 질의</h3>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
              GPT-4o 직접 질의
            </span>
          </div>
          {showAutoQuery ? (
            <ChevronUp className="w-5 h-5 text-green-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-500" />
          )}
        </div>
        
        {showAutoQuery && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-green-600">
              버튼 클릭 한 번으로 GPT-4o에 직접 질의하여 로봇 산업 데이터를 자동으로 수집합니다.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {AUTO_QUERY_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={async () => {
                    setSelectedTopic(topic.id);
                    setIsAutoQuerying(true);
                    setError(null);
                    try {
                      const result = await api.autoQuery(topic.id, topic.query);
                      setText(JSON.stringify(result, null, 2));
                      setAnalyzed(result);
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setIsAutoQuerying(false);
                      setSelectedTopic(null);
                    }
                  }}
                  disabled={isAutoQuerying}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTopic === topic.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-green-700 border border-green-200 hover:bg-green-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isAutoQuerying && selectedTopic === topic.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {topic.label}
                </button>
              ))}
            </div>
            
            <div className="text-xs text-green-500 mt-2">
              💡 버튼을 클릭하면 해당 분야의 최신 데이터를 GPT-4o가 분석하여 JSON으로 생성합니다.
            </div>
          </div>
        )}
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
            {categoryUpdated && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs animate-pulse">
                ✓ 업데이트됨
              </span>
            )}
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
            <pre className="w-full p-3 border border-purple-200 rounded-lg bg-white text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {generatePrompt()}
            </pre>
          </div>
        )}
      </div>

      {/* 카테고리 설정 */}
      <div className="bg-white rounded-lg shadow">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer border-b"
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">카테고리 설정</h3>
            <span className="text-xs text-gray-400">
              (제품 타입 {productTypes.length}개, 회사 카테고리 {companyCategories.length}개, 국가 {countries.length}개)
            </span>
          </div>
          {showSettings ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {showSettings && (
          <div className="p-4 space-y-6">
            {/* 제품 타입 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 타입 (type)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {productTypes.map((type) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {type}
                    <button
                      onClick={() => removeProductType(type)}
                      className="hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProductType}
                  onChange={(e) => setNewProductType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProductType()}
                  placeholder="새 제품 타입 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={addProductType}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            {/* 회사 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사 카테고리 (category)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {companyCategories.map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {cat}
                    <button
                      onClick={() => removeCompanyCategory(cat)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompanyCategory}
                  onChange={(e) => setNewCompanyCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCompanyCategory()}
                  placeholder="새 회사 카테고리 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addCompanyCategory}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            {/* 국가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                국가 (country)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {countries.map((country) => (
                  <span
                    key={country}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {country}
                    <button
                      onClick={() => removeCountry(country)}
                      className="hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCountry()}
                  placeholder="새 국가 추가..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <button
                  onClick={addCountry}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={resetToDefaults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                기본값으로 초기화
              </button>
            </div>
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
              <p className="text-2xl font-bold text-green-600">{saveResult.keywordsSaved || 0}</p>
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
