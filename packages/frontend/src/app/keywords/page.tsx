'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Hash } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Hash className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">키워드</h1>
          </div>
          <p className="text-slate-400">추출된 키워드 및 트렌드</p>
        </div>

        {/* Trending Keywords */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            트렌딩 키워드
          </h2>
          {trending && trending.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((item: any, index: number) => (
                <div
                  key={item.keyword?.id || index}
                  className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{item.keyword?.term || item.term}</span>
                    <div className="flex items-center gap-1">
                      {item.delta > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      ) : item.delta < 0 ? (
                        <ArrowDownRight className="w-4 h-4 text-red-400" />
                      ) : null}
                      <span className={`text-sm ${
                        item.delta > 0 ? 'text-emerald-400' : 
                        item.delta < 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {item.deltaPercent ? `${item.deltaPercent}%` : '-'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    빈도: {item.count || 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">트렌딩 키워드가 없습니다.</p>
          )}
        </div>

        {/* All Keywords */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">전체 키워드</h2>
          {keywords?.items && keywords.items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywords.items.map((keyword: any) => (
                <span
                  key={keyword.id}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    keyword.category === 'technology'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : keyword.category === 'market'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
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
            <p className="text-slate-400">등록된 키워드가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
