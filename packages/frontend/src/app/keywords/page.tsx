'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function KeywordsPage() {
  const { data: keywords, isLoading } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => api.getKeywords(),
  });

  const { data: trending } = useQuery({
    queryKey: ['trending-keywords'],
    queryFn: () => api.getTrendingKeywords(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">키워드</h1>
        <p className="text-gray-500">추출된 키워드 및 트렌드</p>
      </div>

      {/* Trending Keywords */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          트렌딩 키워드
        </h2>
        {trending && trending.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((item: any, index: number) => (
              <div
                key={item.keyword?.id || index}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.keyword?.term || item.term}</span>
                  <div className="flex items-center gap-1">
                    {item.delta > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : item.delta < 0 ? (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    ) : null}
                    <span className={`text-sm ${
                      item.delta > 0 ? 'text-green-600' : 
                      item.delta < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {item.deltaPercent ? `${item.deltaPercent}%` : '-'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  빈도: {item.count || 0}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">트렌딩 키워드가 없습니다.</p>
        )}
      </div>

      {/* All Keywords */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">전체 키워드</h2>
        {keywords?.items && keywords.items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keywords.items.map((keyword: any) => (
              <span
                key={keyword.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  keyword.category === 'technology'
                    ? 'bg-blue-100 text-blue-700'
                    : keyword.category === 'market'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {keyword.term}
                <span className="ml-1 text-xs opacity-70">
                  ({keyword.language})
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">등록된 키워드가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
