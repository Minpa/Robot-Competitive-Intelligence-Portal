'use client';

import { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  BookOpen,
  Github,
  Scale,
  ScrollText,
  RefreshCw,
  ExternalLink,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart3,
  Star,
  Code,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CollectedItem {
  id: string;
  source: string;
  type: string;
  title: string;
  url: string;
  metadata: Record<string, unknown>;
  collectedAt: string;
}

interface CollectionResult {
  source: string;
  success: boolean;
  count: number;
  items: CollectedItem[];
  error?: string;
}

const SOURCE_CONFIG = {
  arxiv: { name: 'arXiv', icon: BookOpen, color: 'red', description: '로봇공학/AI 논문', rateLimit: '3초' },
  github: { name: 'GitHub', icon: Github, color: 'gray', description: '로봇 관련 리포지토리', rateLimit: '2초' },
  sec_edgar: { name: 'SEC EDGAR', icon: Scale, color: 'blue', description: '미국 공시 (Public Domain)', rateLimit: '0.2초' },
  patent: { name: 'USPTO 특허', icon: ScrollText, color: 'amber', description: '로봇 관련 특허', rateLimit: '1초' },
};

const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// 키워드 추출 함수
function extractKeywords(items: CollectedItem[]): { keyword: string; count: number }[] {
  const keywords: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'using', 'based', 'via', 'through']);
  
  items.forEach(item => {
    const words = item.title.toLowerCase()
      .replace(/[^a-z0-9\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    words.forEach(word => {
      keywords[word] = (keywords[word] || 0) + 1;
    });
  });
  
  return Object.entries(keywords)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default function PublicDataPage() {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectingSource, setCollectingSource] = useState<string | null>(null);
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastCollected, setLastCollected] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'collect' | 'trends'>('collect');

  const collectAll = async () => {
    setIsCollecting(true);
    setCollectingSource('all');
    try {
      const result = await api.collectPublicData();
      setResults(result.results);
      setTotalCount(result.totalCount);
      setLastCollected(new Date());
    } catch (error) {
      console.error('Collection failed:', error);
    } finally {
      setIsCollecting(false);
      setCollectingSource(null);
    }
  };

  const collectSingle = async (source: string) => {
    setCollectingSource(source);
    try {
      let result;
      switch (source) {
        case 'arxiv': result = await api.collectArxiv(); break;
        case 'github': result = await api.collectGitHub(); break;
        case 'sec_edgar': result = await api.collectSecEdgar(); break;
        case 'patent': result = await api.collectPatents(); break;
        default: return;
      }
      setResults(prev => [...prev.filter(r => r.source !== source), result]);
      setLastCollected(new Date());
    } catch (error) {
      console.error(`Collection failed for ${source}:`, error);
    } finally {
      setCollectingSource(null);
    }
  };

  const getSourceResult = (source: string) => results.find(r => r.source === source);

  // 트렌드 분석 데이터
  const trendData = useMemo(() => {
    const arxivResult = getSourceResult('arxiv');
    const githubResult = getSourceResult('github');
    const patentResult = getSourceResult('patent');
    const secResult = getSourceResult('sec_edgar');

    // arXiv 키워드 트렌드
    const arxivKeywords = arxivResult?.items ? extractKeywords(arxivResult.items) : [];

    // GitHub 언어 분포
    const githubLanguages: Record<string, number> = {};
    githubResult?.items?.forEach(item => {
      const lang = (item.metadata?.language as string) || 'Unknown';
      githubLanguages[lang] = (githubLanguages[lang] || 0) + 1;
    });
    const languageData = Object.entries(githubLanguages)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // GitHub 스타 Top 5
    const topRepos = githubResult?.items
      ?.sort((a, b) => ((b.metadata?.stars as number) || 0) - ((a.metadata?.stars as number) || 0))
      .slice(0, 5) || [];

    // 특허 키워드 트렌드
    const patentKeywords = patentResult?.items ? extractKeywords(patentResult.items) : [];

    // SEC 공시 유형 분포
    const secFormTypes: Record<string, number> = {};
    secResult?.items?.forEach(item => {
      const form = (item.metadata?.formType as string) || 'Other';
      secFormTypes[form] = (secFormTypes[form] || 0) + 1;
    });
    const formTypeData = Object.entries(secFormTypes)
      .map(([name, value]) => ({ name, value }));

    // 소스별 수집 현황
    const sourceDistribution = results.map(r => ({
      name: SOURCE_CONFIG[r.source as keyof typeof SOURCE_CONFIG]?.name || r.source,
      count: r.count,
    }));

    return { arxivKeywords, languageData, topRepos, patentKeywords, formTypeData, sourceDistribution };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공개 데이터</h1>
          <p className="text-gray-500">합법적 API 기반 데이터 수집 및 트렌드 분석</p>
        </div>
        <button
          onClick={collectAll}
          disabled={isCollecting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${collectingSource === 'all' ? 'animate-spin' : ''}`} />
          {collectingSource === 'all' ? '수집 중...' : '전체 수집'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('collect')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'collect'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="w-4 h-4 inline mr-2" />
          데이터 수집
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'trends'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          트렌드 분석
        </button>
      </div>

      {/* Last Collected Info */}
      {lastCollected && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>마지막 수집: {lastCollected.toLocaleString('ko-KR')}</span>
          <span className="text-emerald-600 font-medium">총 {totalCount}건</span>
        </div>
      )}

      {/* Data Collection Tab */}
      {activeTab === 'collect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const result = getSourceResult(key);
            const isLoading = collectingSource === key || collectingSource === 'all';
            
            return (
              <div key={key} className="bg-white rounded-lg shadow p-6 border-l-4 border-l-gray-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-gray-100">
                      <Icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{config.name}</h3>
                      <p className="text-sm text-gray-500">{config.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => collectSingle(key)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '수집'}
                  </button>
                </div>
                <div className="text-xs text-gray-400 mb-4">Rate Limit: {config.rateLimit} | User-Agent: RCIPBot/1.0</div>
                {result && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      {result.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <span className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.success ? `${result.count}건 수집 완료` : '수집 실패'}
                      </span>
                    </div>
                    {result.items?.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.items.slice(0, 5).map((item) => (
                          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600">{item.title}</p>
                              <p className="text-xs text-gray-400">{item.type}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0" />
                          </a>
                        ))}
                        {result.items.length > 5 && <p className="text-xs text-gray-400 text-center pt-2">+{result.items.length - 5}건 더 있음</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {results.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">데이터를 먼저 수집해주세요</h3>
              <p className="text-gray-500 mb-4">트렌드 분석을 위해 공개 데이터를 수집해야 합니다.</p>
              <button onClick={collectAll} disabled={isCollecting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {isCollecting ? '수집 중...' : '전체 수집 시작'}
              </button>
            </div>
          ) : (
            <>
              {/* 소스별 수집 현황 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  소스별 수집 현황
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData.sourceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* arXiv 연구 키워드 트렌드 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-red-600" />
                    arXiv 연구 키워드 Top 10
                  </h3>
                  {trendData.arxivKeywords.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData.arxivKeywords} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="keyword" type="category" tick={{ fontSize: 11 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#EF4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">arXiv 데이터를 수집해주세요</p>
                  )}
                </div>

                {/* GitHub 언어 분포 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5 text-gray-700" />
                    GitHub 프로그래밍 언어 분포
                  </h3>
                  {trendData.languageData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={trendData.languageData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {trendData.languageData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">GitHub 데이터를 수집해주세요</p>
                  )}
                </div>
              </div>

              {/* GitHub Top Repos */}
              {trendData.topRepos.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    GitHub 인기 리포지토리 Top 5
                  </h3>
                  <div className="space-y-3">
                    {trendData.topRepos.map((repo, index) => (
                      <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
                        <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{repo.title}</p>
                          <p className="text-sm text-gray-500 truncate">{(repo.metadata?.description as string) || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="w-4 h-4" />
                          <span className="font-medium">{((repo.metadata?.stars as number) || 0).toLocaleString()}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 특허 키워드 트렌드 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-amber-600" />
                    USPTO 특허 키워드 Top 10
                  </h3>
                  {trendData.patentKeywords.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData.patentKeywords} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="keyword" type="category" tick={{ fontSize: 11 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#F59E0B" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">USPTO 데이터를 수집해주세요</p>
                  )}
                </div>

                {/* SEC 공시 유형 분포 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    SEC EDGAR 공시 유형
                  </h3>
                  {trendData.formTypeData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={trendData.formTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}>
                            {trendData.formTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">SEC EDGAR 데이터를 수집해주세요</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Sources & Attribution */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">📋 데이터 출처 (Data Sources)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <a href="https://arxiv.org/help/api" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded border hover:border-red-300 transition-colors">
            <p className="font-semibold text-red-700">arXiv API</p>
            <p className="text-gray-500">CC0 1.0 Public Domain</p>
          </a>
          <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded border hover:border-gray-400 transition-colors">
            <p className="font-semibold text-gray-700">GitHub REST API</p>
            <p className="text-gray-500">GitHub ToS 준수</p>
          </a>
          <a href="https://www.sec.gov/developer" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded border hover:border-blue-300 transition-colors">
            <p className="font-semibold text-blue-700">SEC EDGAR API</p>
            <p className="text-gray-500">Public Domain</p>
          </a>
          <a href="https://patentsview.org/apis" target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded border hover:border-amber-300 transition-colors">
            <p className="font-semibold text-amber-700">USPTO PatentsView</p>
            <p className="text-gray-500">Public Domain</p>
          </a>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">데이터 수집 정책</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>모든 데이터는 공식 API를 통해 수집됩니다</li>
              <li>각 소스의 Rate Limit을 준수합니다</li>
              <li>메타데이터만 수집하며, 원문(PDF, 코드 등)은 수집하지 않습니다</li>
              <li>수집된 데이터는 연구·트렌드 분석 목적으로만 사용됩니다</li>
              <li>원문은 각 사이트에서 직접 확인하시기 바랍니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
