'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface CategoryHighlight {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string | null;
}

interface WeeklyHighlightsResponse {
  periodStart: string;
  periodEnd: string;
  categories: {
    product: CategoryHighlight[];
    technology: CategoryHighlight[];
    industry: CategoryHighlight[];
    other: CategoryHighlight[];
  };
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: highlights } = useQuery({
    queryKey: ['weekly-highlights'],
    queryFn: () => api.getWeeklyHighlights(),
  });

  const { data: articleChart } = useQuery({
    queryKey: ['article-chart'],
    queryFn: () => api.getArticleChartData(),
  });

  const { data: productTypeChart } = useQuery({
    queryKey: ['product-type-chart'],
    queryFn: () => api.getProductTypeChartData(),
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const stats = [
    { name: '회사', value: summary?.totalCompanies || 0, icon: Building2, color: 'bg-blue-500', href: '/companies' },
    { name: '제품', value: summary?.totalProducts || 0, icon: Package, color: 'bg-green-500', href: '/products' },
    { name: '기사', value: summary?.totalArticles || 0, icon: FileText, color: 'bg-yellow-500', href: '/articles' },
    { name: '키워드', value: summary?.totalKeywords || 0, icon: TrendingUp, color: 'bg-purple-500', href: '/keywords' },
  ];

  const chartData = articleChart?.labels?.map((label: string, i: number) => ({
    date: label,
    articles: articleChart.datasets[0]?.data[i] || 0,
  })) || [];

  const pieData = productTypeChart?.labels?.map((label: string, i: number) => ({
    name: label,
    value: productTypeChart.datasets[0]?.data[i] || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">로봇 경쟁사 인텔리전스 현황</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">이번 주 신규 제품</span>
          </div>
          <p className="text-3xl font-bold">{summary?.weeklyNewProducts || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">이번 주 신규 기사</span>
          </div>
          <p className="text-3xl font-bold">{summary?.weeklyNewArticles || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Article Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">기사 수집 추이</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="articles"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Type Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">제품 유형별 분포</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly Highlights */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">최근 한 달 하이라이트</h3>
          {highlights?.periodStart && highlights?.periodEnd && (
            <span className="text-sm text-gray-500">
              {highlights.periodStart} ~ {highlights.periodEnd}
            </span>
          )}
        </div>
        {highlights?.categories ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 로봇 제품 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-green-700">로봇 제품</h4>
              </div>
              {highlights.categories.product?.length > 0 ? (
                <div className="space-y-2">
                  {highlights.categories.product.map((item: CategoryHighlight) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{item.source}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">최근 소식이 없습니다.</p>
              )}
            </div>

            {/* 신기술 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-blue-700">신기술</h4>
              </div>
              {highlights.categories.technology?.length > 0 ? (
                <div className="space-y-2">
                  {highlights.categories.technology.map((item: CategoryHighlight) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{item.source}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">최근 소식이 없습니다.</p>
              )}
            </div>

            {/* 산업 동향 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-medium text-purple-700">산업 동향</h4>
              </div>
              {highlights.categories.industry?.length > 0 ? (
                <div className="space-y-2">
                  {highlights.categories.industry.map((item: CategoryHighlight) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{item.source}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">최근 소식이 없습니다.</p>
              )}
            </div>

            {/* 기타 동향 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <FileText className="w-4 h-4 text-yellow-600" />
                </div>
                <h4 className="font-medium text-yellow-700">기타 동향</h4>
              </div>
              {highlights.categories.other?.length > 0 ? (
                <div className="space-y-2">
                  {highlights.categories.other.map((item: CategoryHighlight) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      {item.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{item.source}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">최근 소식이 없습니다.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">최근 한 달 하이라이트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
