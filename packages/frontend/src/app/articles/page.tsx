'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FileText, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ArticlesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['articles', filters],
    queryFn: () => api.getArticles(filters),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">기사</h1>
          <p className="text-gray-500">수집된 기사 및 보도자료</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
          >
            <option value="">모든 언어</option>
            <option value="ko">한국어</option>
            <option value="en">영어</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {data?.items.map((article: any) => (
          <div
            key={article.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{article.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{article.source}</span>
                  <span>·</span>
                  <span>{formatDate(article.publishedAt) || formatDate(article.collectedAt) || '날짜 없음'}</span>
                  <span>·</span>
                  <span className="uppercase">{article.language}</span>
                </div>
                {article.summary && (
                  <p className="mt-2 text-gray-600 line-clamp-2">{article.summary}</p>
                )}
                <div className="mt-3 flex items-center gap-4">
                  <Link
                    href={`/articles/${article.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    상세 보기
                  </Link>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      원문 보기
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data?.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          수집된 기사가 없습니다.
        </div>
      )}
    </div>
  );
}
