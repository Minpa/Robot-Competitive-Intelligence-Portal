'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Search, Building2, Package, FileText } from 'lucide-react';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">검색</h1>
        <p className="text-gray-500">회사, 제품, 기사 통합 검색</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            검색
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <p className="text-gray-500">
            총 {data.totalHits || 0}개의 결과
          </p>

          {/* Companies */}
          {data.companies?.hits?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                회사 ({data.companies.total})
              </h2>
              <div className="space-y-3">
                {data.companies.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/companies/${hit.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <p className="font-medium">{hit.source?.name}</p>
                    <p className="text-sm text-gray-500">{hit.source?.country}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {data.products?.hits?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                제품 ({data.products.total})
              </h2>
              <div className="space-y-3">
                {data.products.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/products/${hit.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <p className="font-medium">{hit.source?.name}</p>
                    <p className="text-sm text-gray-500">{hit.source?.type}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Articles */}
          {data.articles?.hits?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                기사 ({data.articles.total})
              </h2>
              <div className="space-y-3">
                {data.articles.hits.map((hit: any) => (
                  <Link
                    key={hit.id}
                    href={`/articles/${hit.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <p className="font-medium">{hit.source?.title}</p>
                    <p className="text-sm text-gray-500">{hit.source?.source}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.totalHits === 0 && searchTerm && (
            <div className="text-center py-12 text-gray-500">
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
