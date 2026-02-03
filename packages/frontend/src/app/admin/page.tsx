'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Settings,
  Database,
  BookOpen,
  Github,
  Scale,
  ScrollText,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
  Shield,
} from 'lucide-react';

interface CollectionResult {
  source: string;
  success: boolean;
  count: number;
  items: any[];
  error?: string;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectingSource, setCollectingSource] = useState<string | null>(null);
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [lastCollected, setLastCollected] = useState<Date | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const collectAll = async () => {
    setIsCollecting(true);
    setCollectingSource('all');
    try {
      const result = await api.collectPublicData();
      setResults(result.results);
      setLastCollected(new Date());
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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

  const sources = [
    { key: 'arxiv', name: 'arXiv', icon: BookOpen, color: 'red', desc: '로봇/AI 논문' },
    { key: 'github', name: 'GitHub', icon: Github, color: 'gray', desc: '오픈소스 리포' },
    { key: 'sec_edgar', name: 'SEC EDGAR', icon: Scale, color: 'blue', desc: '미국 공시' },
    { key: 'patent', name: 'USPTO', icon: ScrollText, color: 'amber', desc: '특허 데이터' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관리</h1>
        <p className="text-gray-500">공개 데이터 수집 및 시스템 관리</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">회사</p>
          <p className="text-2xl font-bold">{summary?.totalCompanies || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">제품</p>
          <p className="text-2xl font-bold">{summary?.totalProducts || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">키워드</p>
          <p className="text-2xl font-bold">{summary?.totalKeywords || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">수집 데이터</p>
          <p className="text-2xl font-bold">{results.reduce((sum, r) => sum + r.count, 0)}</p>
        </div>
      </div>

      {/* Public Data Collection */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">공개 데이터 수집</h2>
          </div>
          <div className="flex items-center gap-3">
            {lastCollected && (
              <span className="text-sm text-gray-500">
                마지막: {lastCollected.toLocaleTimeString('ko-KR')}
              </span>
            )}
            <button
              onClick={collectAll}
              disabled={isCollecting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${collectingSource === 'all' ? 'animate-spin' : ''}`} />
              {collectingSource === 'all' ? '수집 중...' : '전체 수집'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
          {sources.map(({ key, name, icon: Icon, desc }) => {
            const result = getSourceResult(key);
            const isLoading = collectingSource === key || collectingSource === 'all';

            return (
              <div key={key} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">{name}</span>
                  </div>
                  <button
                    onClick={() => collectSingle(key)}
                    disabled={isLoading}
                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : '수집'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">{desc}</p>
                {result && (
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.success ? `${result.count}건` : '실패'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/public-data" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-100">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold">공개 데이터</h3>
              <p className="text-sm text-gray-500">트렌드 분석 보기</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
          </div>
        </Link>

        <Link href="/companies" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">회사 관리</h3>
              <p className="text-sm text-gray-500">{summary?.totalCompanies || 0}개 등록</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
          </div>
        </Link>

        <Link href="/terms" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Shield className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold">이용약관</h3>
              <p className="text-sm text-gray-500">데이터 정책 확인</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
          </div>
        </Link>
      </div>

      {/* Data Policy Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">데이터 수집 정책</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>뉴스 기사 크롤링은 저작권 보호를 위해 비활성화되었습니다</li>
              <li>공개 API(arXiv, GitHub, SEC, USPTO)를 통한 메타데이터만 수집합니다</li>
              <li>모든 데이터는 연구·트렌드 분석 목적으로만 사용됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
