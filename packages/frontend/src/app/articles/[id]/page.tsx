'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, ExternalLink, Calendar, Globe, Building2, FileText, Bot, Brain, Cpu, Cog } from 'lucide-react';

const CATEGORY_INFO: Record<string, { label: string; color: string }> = {
  product: { label: '제품', color: 'bg-green-100 text-green-700' },
  technology: { label: '기술', color: 'bg-blue-100 text-blue-700' },
  industry: { label: '산업', color: 'bg-purple-100 text-purple-700' },
  other: { label: '기타', color: 'bg-gray-100 text-gray-700' },
};

const PRODUCT_TYPE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  robot: { label: '로봇 완제품', icon: Bot, color: 'bg-blue-100 text-blue-700' },
  rfm: { label: 'RFM/AI', icon: Brain, color: 'bg-purple-100 text-purple-700' },
  soc: { label: 'SoC/칩', icon: Cpu, color: 'bg-cyan-100 text-cyan-700' },
  actuator: { label: '액츄에이터', icon: Cog, color: 'bg-orange-100 text-orange-700' },
  none: { label: '-', icon: FileText, color: 'bg-gray-100 text-gray-500' },
};

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

  const categoryInfo = CATEGORY_INFO[article.category] || CATEGORY_INFO.other;
  const productTypeInfo = PRODUCT_TYPE_INFO[article.productType] || PRODUCT_TYPE_INFO.none;
  const ProductTypeIcon = productTypeInfo.icon;

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
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3">
          <div>
            <span className="text-xs text-gray-500 block mb-1">동향 카테고리</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo.color}`}>
              {categoryInfo.label}
            </span>
          </div>
          {article.productType && article.productType !== 'none' && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">제품 유형</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${productTypeInfo.color}`}>
                <ProductTypeIcon className="w-3 h-3" />
                {productTypeInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {article.summary && (
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              AI 요약
            </h2>
            <p className="text-gray-700 bg-purple-50 p-4 rounded-lg border border-purple-100">
              {article.summary}
            </p>
          </div>
        )}

        {/* Original Article Link - 본문 대신 원문 링크로 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">
            저작권 보호를 위해 기사 본문은 원문 사이트에서 확인해주세요.
          </p>
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              원문 기사 보기
            </a>
          ) : (
            <p className="text-gray-400">원문 링크가 없습니다.</p>
          )}
        </div>

        {/* Collected Info */}
        <div className="text-sm text-gray-400 border-t pt-4">
          수집일: {formatDate(article.collectedAt)}
        </div>
      </div>
    </div>
  );
}
