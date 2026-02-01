'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  Building2,
  Package,
  FileText,
  TrendingUp,
  ArrowUpRight,
  Cpu,
  Bot,
  Cog,
  CircuitBoard,
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
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const TYPE_COLORS: Record<string, string> = {
  humanoid: '#10B981',
  service: '#3B82F6', 
  logistics: '#F59E0B',
  home: '#EF4444',
  industrial: '#8B5CF6',
  foundation_model: '#EC4899',
  default: '#6B7280',
};

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

// Custom tooltip component with clickable link
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = label;
    const articles = payload[0].value;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900">{date}</p>
        <Link 
          href={`/articles?date=${date}`}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          articles : {articles}
        </Link>
      </div>
    );
  }
  return null;
};

// Product timeline tooltip
const ProductTimelineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: TYPE_COLORS[data.type] || TYPE_COLORS.default }}
          />
          <span className="text-xs font-medium text-gray-500">{data.type}</span>
        </div>
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">{data.companyName}</p>
        <p className="text-xs text-gray-400 mt-1">{data.releaseDate || '날짜 미정'}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
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

  const { data: productTimeline } = useQuery({
    queryKey: ['product-timeline'],
    queryFn: () => api.getProductReleaseTimeline(),
  });

  const { data: rfmTimeline } = useQuery({
    queryKey: ['rfm-timeline'],
    queryFn: () => api.getRfmTimeline(),
  });

  const { data: actuatorTimeline } = useQuery({
    queryKey: ['actuator-timeline'],
    queryFn: () => api.getActuatorTimeline(),
  });

  const { data: socTimeline } = useQuery({
    queryKey: ['soc-timeline'],
    queryFn: () => api.getSocTimeline(),
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

  // 제품 타임라인 차트 데이터 변환
  const timelineChartData = productTimeline?.map((product, index) => {
    const date = product.releaseDate ? new Date(product.releaseDate).getTime() : Date.now();
    return {
      ...product,
      x: date,
      y: index % 5 + 1, // 5개 행으로 분산
      z: 100,
    };
  }) || [];

  // 타입별로 그룹화
  const timelineByType = timelineChartData.reduce((acc: Record<string, any[]>, item) => {
    const type = item.type || 'default';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  // 반기 단위 틱 생성 (최근 3년)
  const generateHalfYearTicks = () => {
    const ticks: number[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // 3년 전부터 현재까지
    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
      ticks.push(new Date(year, 0, 1).getTime()); // 1월 (상반기)
      ticks.push(new Date(year, 6, 1).getTime()); // 7월 (하반기)
    }
    return ticks;
  };

  const halfYearTicks = generateHalfYearTicks();
  const nowTimestamp = Date.now();

  // RFM 타임라인 차트 데이터 변환
  const rfmChartData = rfmTimeline?.map((product, index) => {
    const date = product.releaseDate ? new Date(product.releaseDate).getTime() : Date.now();
    return {
      ...product,
      x: date,
      y: index % 3 + 1,
      z: 120,
    };
  }) || [];

  // 액츄에이터 타임라인 차트 데이터 변환
  const actuatorChartData = actuatorTimeline?.map((product, index) => {
    const date = product.releaseDate ? new Date(product.releaseDate).getTime() : Date.now();
    return {
      ...product,
      x: date,
      y: index % 3 + 1,
      z: 120,
    };
  }) || [];

  // SoC 타임라인 차트 데이터 변환
  const socChartData = socTimeline?.map((product, index) => {
    const date = product.releaseDate ? new Date(product.releaseDate).getTime() : Date.now();
    return {
      ...product,
      x: date,
      y: index % 3 + 1,
      z: 120,
    };
  }) || [];

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
              <LineChart 
                data={chartData}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    router.push(`/articles?date=${data.activeLabel}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
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

      {/* Robot Product Timeline */}
      {productTimeline && productTimeline.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100">
                <Bot className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">로봇 제품 타임라인</h3>
                <p className="text-xs text-gray-500">휴머노이드, 서비스, 물류 로봇</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {Object.entries(TYPE_COLORS).filter(([k]) => !['default', 'foundation_model'].includes(k)).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-gray-600">{type}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Timeline Chart */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const product = data.activePayload[0].payload;
                    router.push(`/products/${product.id}`);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={[halfYearTicks[0], halfYearTicks[halfYearTicks.length - 1]]}
                  ticks={halfYearTicks}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const year = date.getFullYear().toString().slice(-2);
                    const half = date.getMonth() < 6 ? 'H1' : 'H2';
                    return `${year}' ${half}`;
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="number" dataKey="y" hide domain={[0, 6]} />
                <ZAxis type="number" dataKey="z" range={[100, 400]} />
                <Tooltip content={<ProductTimelineTooltip />} />
                {/* 현재 시점 표시 */}
                <ReferenceLine 
                  x={nowTimestamp} 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: '현재', position: 'top', fill: '#EF4444', fontSize: 11 }}
                />
                {Object.entries(timelineByType).map(([type, data]) => (
                  <Scatter
                    key={type}
                    name={type}
                    data={data}
                    fill={TYPE_COLORS[type] || TYPE_COLORS.default}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Product List */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">최근 제품 목록</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {productTimeline.slice(0, 12).map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: TYPE_COLORS[product.type] || TYPE_COLORS.default }}
                  >
                    {product.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.companyName}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {product.releaseDate?.substring(0, 7) || '-'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RFM (Robot Foundation Model) Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">RFM (Robot Foundation Model) 타임라인</h3>
              <p className="text-xs text-gray-500">로봇 파운데이션 모델 및 VLA 모델</p>
            </div>
          </div>
        </div>
        
        {rfmTimeline && rfmTimeline.length > 0 ? (
          <>
            {/* RFM Timeline Chart */}
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const product = data.activePayload[0].payload;
                      router.push(`/products/${product.id}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={[halfYearTicks[0], halfYearTicks[halfYearTicks.length - 1]]}
                    ticks={halfYearTicks}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      const year = date.getFullYear().toString().slice(-2);
                      const half = date.getMonth() < 6 ? 'H1' : 'H2';
                      return `${year}' ${half}`;
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="number" dataKey="y" hide domain={[0, 4]} />
                  <ZAxis type="number" dataKey="z" range={[150, 400]} />
                  <Tooltip content={<ProductTimelineTooltip />} />
                  <ReferenceLine 
                    x={nowTimestamp} 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: '현재', position: 'top', fill: '#EF4444', fontSize: 11 }}
                  />
                  <Scatter
                    name="RFM"
                    data={rfmChartData}
                    fill="#EC4899"
                    style={{ cursor: 'pointer' }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* RFM List */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">RFM 목록</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rfmTimeline.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors border border-purple-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {product.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.companyName}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {product.releaseDate?.substring(0, 7) || '-'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Cpu className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>등록된 RFM이 없습니다.</p>
            <p className="text-xs mt-1">제품 유형을 'foundation_model'로 설정하거나 이름에 관련 키워드를 포함하세요.</p>
          </div>
        )}
      </div>

      {/* Actuator Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100">
              <Cog className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">액츄에이터 타임라인</h3>
              <p className="text-xs text-gray-500">로봇 관절 모터 및 감속기</p>
            </div>
          </div>
        </div>
        
        {actuatorTimeline && actuatorTimeline.length > 0 ? (
          <>
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const product = data.activePayload[0].payload;
                      router.push(`/products/${product.id}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={[halfYearTicks[0], halfYearTicks[halfYearTicks.length - 1]]}
                    ticks={halfYearTicks}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      const year = date.getFullYear().toString().slice(-2);
                      const half = date.getMonth() < 6 ? 'H1' : 'H2';
                      return `${year}' ${half}`;
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="number" dataKey="y" hide domain={[0, 4]} />
                  <ZAxis type="number" dataKey="z" range={[150, 400]} />
                  <Tooltip content={<ProductTimelineTooltip />} />
                  <ReferenceLine 
                    x={nowTimestamp} 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: '현재', position: 'top', fill: '#EF4444', fontSize: 11 }}
                  />
                  <Scatter
                    name="Actuator"
                    data={actuatorChartData}
                    fill="#F97316"
                    style={{ cursor: 'pointer' }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">액츄에이터 목록</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {actuatorTimeline.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors border border-orange-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                      {product.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.companyName}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {product.releaseDate?.substring(0, 7) || '-'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Cog className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>등록된 액츄에이터가 없습니다.</p>
          </div>
        )}
      </div>

      {/* SoC Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-100">
              <CircuitBoard className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">SoC 타임라인</h3>
              <p className="text-xs text-gray-500">로봇용 AI 칩 (10+ TOPS)</p>
            </div>
          </div>
        </div>
        
        {socTimeline && socTimeline.length > 0 ? (
          <>
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const product = data.activePayload[0].payload;
                      router.push(`/products/${product.id}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={[halfYearTicks[0], halfYearTicks[halfYearTicks.length - 1]]}
                    ticks={halfYearTicks}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      const year = date.getFullYear().toString().slice(-2);
                      const half = date.getMonth() < 6 ? 'H1' : 'H2';
                      return `${year}' ${half}`;
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="number" dataKey="y" hide domain={[0, 4]} />
                  <ZAxis type="number" dataKey="z" range={[150, 400]} />
                  <Tooltip content={<ProductTimelineTooltip />} />
                  <ReferenceLine 
                    x={nowTimestamp} 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: '현재', position: 'top', fill: '#EF4444', fontSize: 11 }}
                  />
                  <Scatter
                    name="SoC"
                    data={socChartData}
                    fill="#06B6D4"
                    style={{ cursor: 'pointer' }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">SoC 목록</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {socTimeline.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-cyan-50 transition-colors border border-cyan-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                      {product.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.companyName}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {product.releaseDate?.substring(0, 7) || '-'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CircuitBoard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>등록된 SoC가 없습니다.</p>
          </div>
        )}
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
