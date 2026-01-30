'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, ExternalLink, Calendar, Globe, Building2 } from 'lucide-react';

export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => api.getArticle(articleId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">기사를 찾을 수 없습니다.</p>
        <Link href="/articles" className="text-blue-600 hover:underline mt-2 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/articles" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-b pb-4">
          <div className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            <span>{article.source}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(article.publishedAt) || formatDate(article.collectedAt) || '날짜 없음'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            <span className="uppercase">{article.language}</span>
          </div>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline ml-auto"
            >
              <ExternalLink className="w-4 h-4" />
              원문 보기
            </a>
          )}
        </div>

        {/* Summary */}
        {article.summary && (
          <div>
            <h2 className="text-lg font-semibold mb-2">요약</h2>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{article.summary}</p>
          </div>
        )}

        {/* Content */}
        {article.content && (
          <div>
            <h2 className="text-lg font-semibold mb-2">본문</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {article.content}
            </div>
          </div>
        )}

        {/* Collected Info */}
        <div className="text-sm text-gray-400 border-t pt-4">
          수집일: {formatDate(article.collectedAt)}
        </div>
      </div>
    </div>
  );
}
