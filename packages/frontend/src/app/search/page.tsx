'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Search, Building2, Package, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const { data, isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: () => api.search(searchTerm),
    enabled: searchTerm.length > 0,
  });

  useEffect(() => {
    setQuery(initialQuery);
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <PageHeader module="SEARCH V4.2" titleKo="검색" titleEn="GLOBAL SEARCH" description="회사, 로봇, 기사 통합 검색" />

      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-24 py-3 bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent text-lg text-ink-900 placeholder-ink-400"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <p className="text-ink-500">
            총 {data.totalHits || 0}개의 결과
          </p>

          {/* Companies */}
          {data.companies?.hits?.length > 0 && (
            <div className="bg-white border border-ink-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
                <Building2 className="w-5 h-5 text-blue-400" />
                회사 ({data.companies.total})
              </h2>
              <div className="space-y-2">
                {data.companies.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/companies/${hit.id}`}
                    className="block p-3 hover:bg-ink-100 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-ink-900">{hit.source?.name}</p>
                    <p className="text-sm text-ink-500">{hit.source?.country}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Robots */}
          {data.robots?.hits?.length > 0 && (
            <div className="bg-white border border-ink-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
                <Package className="w-5 h-5 text-emerald-400" />
                로봇 ({data.robots.total})
              </h2>
              <div className="space-y-2">
                {data.robots.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/humanoid-robots/${hit.id}`}
                    className="block p-3 hover:bg-ink-100 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-ink-900">{hit.source?.name}</p>
                    <p className="text-sm text-ink-500">{hit.source?.purpose}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Articles */}
          {data.articles?.hits?.length > 0 && (
            <div className="bg-white border border-ink-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
                <FileText className="w-5 h-5 text-amber-400" />
                기사 ({data.articles.total})
              </h2>
              <div className="space-y-2">
                {data.articles.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/articles/${hit.id}`}
                    className="block p-3 hover:bg-ink-100 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-ink-900">{hit.source?.title}</p>
                    <p className="text-sm text-ink-500">{hit.source?.source}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.totalHits === 0 && searchTerm && (
            <div className="text-center py-12 text-ink-500">
              &quot;{searchTerm}&quot;에 대한 검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
