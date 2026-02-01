'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { FileText, ExternalLink, Clock, Filter, Calendar, TrendingUp, Sparkles, X } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

// 카테고리 태그 추론 함수
function inferCategory(title: string, content?: string): string {
  const text = `${title} ${content || ''}`.toLowerCase();
  if (text.includes('launch') || text.includes('unveil') || text.includes('release') || text.includes('발표') || text.includes('출시')) {
    return '신제품';
  }
  if (text.includes('invest') || text.includes('funding') || text.includes('raise') || text.includes('투자')) {
    return '투자';
  }
  if (text.includes('ai') || text.includes('technology') || text.includes('research') || text.includes('기술')) {
    return '기술';
  }
  if (text.includes('partner') || text.includes('collaborat') || text.includes('협력')) {
    return '파트너십';
  }
  return '뉴스';
}

// 카테고리 색상
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    '신제품': 'bg-green-100 text-green-700',
    '투자': 'bg-purple-100 text-purple-700',
    '기술': 'bg-blue-100 text-blue-700',
    '파트너십': 'bg-orange-100 text-orange-700',
    '뉴스': 'bg-gray-100 text-gray-700',
  };
  return colors[category] || colors['뉴스'];
}

// 24시간 이내인지 확인
function isRecent(date: string | null): boolean {
  if (!date) return false;
  const articleDate = new Date(date);
  const now = new Date();
  const diffHours = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);
  return diffHours <= 24;
}

// 날짜별 그룹핑
function groupByDate(articles: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  articles.forEach(article => {
    const date = article.publishedAt || article.collectedAt;
    const dateKey = date ? new Date(date).toISOString().split('T')[0] : 'unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(article);
  });
  return groups;
}

type ViewMode = 'card' | 'timeline';

export default function ArticlesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <ArticlesContent />
    </Suspense>
  );
}

function ArticlesContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(dateParam || '');

  // URL 파라미터 변경 시 dateFilter 업데이트
  useEffect(() => {
    if (dateParam) {
      setDateFilter(dateParam);
    }
  }, [dateParam]);

  const { data, isLoading } = useQuery({
    queryKey: ['articles', filters],
    queryFn: () => api.getArticles(filters),
  });

  // 기사에 카테고리 추가
  const articlesWithCategory = useMemo(() => {
    return data?.items.map((article: any) => ({
      ...article,
      category: inferCategory(article.title, article.summary),
      isRecent: isRecent(article.publishedAt || article.collectedAt),
    })) || [];
  }, [data]);

  // 필터링된 기사
  const filteredArticles = useMemo(() => {
    return articlesWithCategory.filter((article: any) => {
      if (categoryFilter && article.category !== categoryFilter) return false;
      if (sourceFilter && article.source !== sourceFilter) return false;
      // 날짜 필터
      if (dateFilter) {
        const articleDate = article.publishedAt || article.collectedAt;
        if (articleDate) {
          const articleDateStr = new Date(articleDate).toISOString().split('T')[0];
          if (articleDateStr !== dateFilter) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [articlesWithCategory, categoryFilter, sourceFilter, dateFilter]);

  // 최근 24시간 기사
  const recentArticles = filteredArticles.filter((a: any) => a.isRecent);
  const olderArticles = filteredArticles.filter((a: any) => !a.isRecent);

  // 소스 목록
  const sources = useMemo(() => {
    const sourceSet = new Set(articlesWithCategory.map((a: any) => a.source));
    return Array.from(sourceSet);
  }, [articlesWithCategory]);

  // 타임라인용 그룹
  const groupedArticles = useMemo(() => groupByDate(filteredArticles), [filteredArticles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">기사</h1>
          <p className="text-gray-500">수집된 기사 및 보도자료</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-gray-400" />
          
          {/* 날짜 필터 표시 */}
          {dateFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
              <Calendar className="w-4 h-4" />
              <span>{dateFilter}</span>
              <button
                onClick={() => {
                  setDateFilter('');
                  window.history.replaceState(null, '', '/articles');
                }}
                className="ml-1 hover:bg-blue-200 rounded p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* 언어 필터 */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
          >
            <option value="">모든 언어</option>
            <option value="ko">한국어</option>
            <option value="en">영어</option>
          </select>

          {/* 카테고리 필터 */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">모든 카테고리</option>
            <option value="신제품">신제품</option>
            <option value="투자">투자</option>
            <option value="기술">기술</option>
            <option value="파트너십">파트너십</option>
            <option value="뉴스">뉴스</option>
          </select>

          {/* 소스 필터 */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">모든 소스</option>
            {sources.map((source: string) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          {/* 뷰 모드 토글 */}
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              카드
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'timeline' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              타임라인
            </button>
          </div>
        </div>
      </div>

      {/* Recent Highlight Section */}
      {recentArticles.length > 0 && viewMode === 'card' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-yellow-800">최근 24시간</h2>
            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full">
              {recentArticles.length}건
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentArticles.slice(0, 6).map((article: any) => (
              <ArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          {olderArticles.length > 0 && recentArticles.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-700">이전 기사</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recentArticles.length > 0 ? olderArticles : filteredArticles).map((article: any) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {Object.entries(groupedArticles)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, articles]) => (
              <div key={date} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {date === 'unknown' ? '날짜 미상' : formatDate(date)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{articles.length}건</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-4">
                  {articles.map((article: any) => (
                    <ArticleCard key={article.id} article={article} timeline />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {filteredArticles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          수집된 기사가 없습니다.
        </div>
      )}
    </div>
  );
}

// Article Card Component
function ArticleCard({ article, compact, timeline }: { article: any; compact?: boolean; timeline?: boolean }) {
  const categoryColor = getCategoryColor(article.category);

  return (
    <div className={cn(
      'bg-white rounded-lg shadow hover:shadow-lg transition-shadow',
      compact ? 'p-4' : 'p-5',
      timeline && 'border-l-4 border-blue-400'
    )}>
      <div className="flex items-start gap-3">
        {!compact && !timeline && (
          <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
            <FileText className="w-5 h-5 text-yellow-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Category & Recent Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', categoryColor)}>
              {article.category}
            </span>
            {article.isRecent && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3" />
                NEW
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={cn(
            'font-semibold text-gray-900 line-clamp-2',
            compact ? 'text-sm' : 'text-base'
          )}>
            {article.title}
          </h3>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{article.source}</span>
            <span>·</span>
            <span>{formatDate(article.publishedAt) || formatDate(article.collectedAt) || '날짜 없음'}</span>
            <span>·</span>
            <span className="uppercase">{article.language}</span>
          </div>

          {/* Summary */}
          {!compact && article.summary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{article.summary}</p>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={`/articles/${article.id}`}
              className="text-blue-600 hover:underline text-sm font-medium"
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
                <ExternalLink className="w-3.5 h-3.5" />
                원문
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
