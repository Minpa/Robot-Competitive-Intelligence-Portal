'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Sparkles,
  Target,
  Zap,
  ChevronRight,
  X,
  Download,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
  ReferenceLine,
} from 'recharts';

const QUADRANT_COLORS = {
  rising_star: '#10B981',
  big_stable: '#3B82F6',
  niche: '#F59E0B',
  declining: '#EF4444',
};

const QUADRANT_LABELS = {
  rising_star: 'Rising Star',
  big_stable: 'Big & Stable',
  niche: 'Niche',
  declining: 'Declining',
};

const CATEGORY_COLORS: Record<string, string> = {
  technology: '#3B82F6',
  market: '#10B981',
  application: '#F59E0B',
  concept: '#8B5CF6',
};

const LINE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function KeywordsPage() {
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [selectedTrendKeywords, setSelectedTrendKeywords] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // API Queries
  const { data: keywordAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['keyword-analytics'],
    queryFn: () => api.getKeywordAnalytics({ limit: 50, sortBy: 'count' }),
  });

  const { data: positionMap, isLoading: mapLoading } = useQuery({
    queryKey: ['keyword-position-map'],
    queryFn: () => api.getKeywordPositionMap(),
  });

  const { data: brief, isLoading: briefLoading } = useQuery({
    queryKey: ['keyword-brief'],
    queryFn: () => api.getKeywordBrief(),
  });

  const { data: trendLines, isLoading: trendLoading } = useQuery({
    queryKey: ['keyword-trend-lines', selectedTrendKeywords],
    queryFn: () => api.getKeywordTrendLines(selectedTrendKeywords),
    enabled: selectedTrendKeywords.length > 0,
  });

  const { data: keywordInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['keyword-insight', selectedKeywordId],
    queryFn: () => selectedKeywordId ? api.getKeywordInsight(selectedKeywordId) : null,
    enabled: !!selectedKeywordId && drawerOpen,
  });

  // Derived data
  const topKeywords = useMemo(() => {
    if (!keywordAnalytics) return [];
    return keywordAnalytics.slice(0, 10);
  }, [keywordAnalytics]);

  const risingKeywords = useMemo(() => {
    if (!keywordAnalytics) return [];
    return [...keywordAnalytics]
      .filter(k => k.growthRate3m > 0)
      .sort((a, b) => b.growthRate3m - a.growthRate3m)
      .slice(0, 5);
  }, [keywordAnalytics]);

  const broadestKeywords = useMemo(() => {
    if (!keywordAnalytics) return [];
    return [...keywordAnalytics]
      .sort((a, b) => (b.relatedCompanies + b.relatedProducts) - (a.relatedCompanies + a.relatedProducts))
      .slice(0, 5);
  }, [keywordAnalytics]);

  const decliningKeywords = useMemo(() => {
    if (!keywordAnalytics) return [];
    return [...keywordAnalytics]
      .filter(k => k.growthRate3m < 0)
      .sort((a, b) => a.growthRate3m - b.growthRate3m)
      .slice(0, 5);
  }, [keywordAnalytics]);

  // Handlers
  const handleKeywordClick = (keywordId: string) => {
    setSelectedKeywordId(keywordId);
    setDrawerOpen(true);
  };

  const toggleTrendKeyword = (keywordId: string) => {
    if (selectedTrendKeywords.includes(keywordId)) {
      setSelectedTrendKeywords(selectedTrendKeywords.filter(id => id !== keywordId));
    } else if (selectedTrendKeywords.length < 5) {
      setSelectedTrendKeywords([...selectedTrendKeywords, keywordId]);
    }
  };

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Hash className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">키워드 트렌드 분석</h1>
          </div>
          <p className="text-slate-400">휴머노이드 로봇 산업 키워드 동향 및 전략 인사이트</p>
        </div>

        {/* Row 1: Monthly Brief + Insight Cards */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          {/* Monthly Brief */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">이번 달 키워드 브리프</h3>
              <span className="ml-auto text-xs text-slate-500">{brief?.period}</span>
            </div>
            {briefLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-700 rounded w-full" />
                <div className="h-4 bg-slate-700 rounded w-3/4" />
              </div>
            ) : (
              <>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  {brief?.summary || '키워드 분석 데이터를 불러오는 중입니다...'}
                </p>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg text-sm transition-colors">
                  <Download className="w-4 h-4" />
                  PPT 슬라이드로 내보내기
                </button>
              </>
            )}
          </div>

          {/* Insight Cards */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-3 gap-4">
            {/* Rising Keywords Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">급상승 키워드</span>
              </div>
              <div className="space-y-2">
                {risingKeywords.slice(0, 3).map((kw, idx) => (
                  <div
                    key={kw.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-800/50 rounded px-2 py-1 -mx-2"
                    onClick={() => handleKeywordClick(kw.id)}
                  >
                    <span className="text-white text-sm truncate">{kw.term}</span>
                    <span className="text-emerald-400 text-xs flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      {kw.growthRate3m}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Broadest Keywords Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">넓은 커버리지</span>
              </div>
              <div className="space-y-2">
                {broadestKeywords.slice(0, 3).map((kw, idx) => (
                  <div
                    key={kw.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-800/50 rounded px-2 py-1 -mx-2"
                    onClick={() => handleKeywordClick(kw.id)}
                  >
                    <span className="text-white text-sm truncate">{kw.term}</span>
                    <span className="text-blue-400 text-xs">
                      {kw.relatedCompanies + kw.relatedProducts}개 연결
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Declining Keywords Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">관심 하락</span>
              </div>
              <div className="space-y-2">
                {decliningKeywords.slice(0, 3).map((kw, idx) => (
                  <div
                    key={kw.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-800/50 rounded px-2 py-1 -mx-2"
                    onClick={() => handleKeywordClick(kw.id)}
                  >
                    <span className="text-white text-sm truncate">{kw.term}</span>
                    <span className="text-red-400 text-xs flex items-center gap-0.5">
                      <ArrowDownRight className="w-3 h-3" />
                      {Math.abs(kw.growthRate3m)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Top Keywords Table + Trend Line Chart */}
        <div className="grid grid-cols-12 gap-4 mb-6">
          {/* Top Keywords Table */}
          <div className="col-span-12 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Top 키워드
              </h3>
              <span className="text-xs text-slate-500">클릭하여 트렌드 비교</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="text-left py-2 font-medium">키워드</th>
                    <th className="text-right py-2 font-medium">3개월</th>
                    <th className="text-right py-2 font-medium">증감</th>
                    <th className="text-right py-2 font-medium">연결</th>
                  </tr>
                </thead>
                <tbody>
                  {topKeywords.map((kw) => (
                    <tr
                      key={kw.id}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                        selectedTrendKeywords.includes(kw.id)
                          ? 'bg-blue-500/10'
                          : 'hover:bg-slate-800/50'
                      }`}
                      onClick={() => toggleTrendKeyword(kw.id)}
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTrendKeywords.includes(kw.id)}
                            onChange={() => {}}
                            className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-blue-500"
                          />
                          <span className="text-white">{kw.term}</span>
                        </div>
                      </td>
                      <td className="text-right text-slate-300">{kw.recentCount3m}</td>
                      <td className="text-right">
                        <span className={`flex items-center justify-end gap-0.5 ${
                          kw.growthRate3m > 0 ? 'text-emerald-400' :
                          kw.growthRate3m < 0 ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {kw.growthRate3m > 0 ? <ArrowUpRight className="w-3 h-3" /> :
                           kw.growthRate3m < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                          {kw.growthRate3m}%
                        </span>
                      </td>
                      <td className="text-right text-slate-400">
                        {kw.relatedCompanies + kw.relatedProducts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="col-span-12 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                키워드 트렌드 비교
              </h3>
              {selectedTrendKeywords.length > 0 && (
                <button
                  onClick={() => setSelectedTrendKeywords([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  초기화
                </button>
              )}
            </div>
            {selectedTrendKeywords.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <p>왼쪽 테이블에서 키워드를 선택하세요 (최대 5개)</p>
              </div>
            ) : trendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500/30 border-t-blue-500" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendLines?.months.map((month, idx) => {
                    const point: any = { month };
                    trendLines?.series.forEach((s, sIdx) => {
                      point[s.term] = s.data[idx];
                    });
                    return point;
                  }) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#F8FAFC' }}
                    />
                    <Legend />
                    {trendLines?.series.map((s, idx) => (
                      <Line
                        key={s.keywordId}
                        type="monotone"
                        dataKey={s.term}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: LINE_COLORS[idx % LINE_COLORS.length], r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Position Map */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                키워드 포지션 맵
              </h3>
              <p className="text-xs text-slate-400 mt-1">X축: 최근 3개월 성장률 | Y축: 전체 규모</p>
            </div>
            <div className="flex items-center gap-4">
              {Object.entries(QUADRANT_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: QUADRANT_COLORS[key as keyof typeof QUADRANT_COLORS] }}
                  />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-96">
            {mapLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500/30 border-t-blue-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[-100, 100]}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    label={{ value: '성장률 (%)', position: 'bottom', fill: '#64748B', fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0, 100]}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    label={{ value: '규모', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 12 }}
                  />
                  <ZAxis range={[100, 400]} />
                  <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                            <p className="font-semibold text-white">{data.term}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              성장률: <span className={data.x > 0 ? 'text-emerald-400' : 'text-red-400'}>{data.x}%</span>
                            </p>
                            <p className="text-xs text-slate-400">규모: {data.y}</p>
                            <p className="text-xs mt-1" style={{ color: QUADRANT_COLORS[data.quadrant as keyof typeof QUADRANT_COLORS] }}>
                              {QUADRANT_LABELS[data.quadrant as keyof typeof QUADRANT_LABELS]}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    data={positionMap?.keywords || []}
                    cursor="pointer"
                    onClick={(data: any) => handleKeywordClick(data.id)}
                  >
                    {(positionMap?.keywords || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={QUADRANT_COLORS[entry.quadrant as keyof typeof QUADRANT_COLORS]}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Quadrant Labels */}
          <div className="grid grid-cols-4 gap-4 mt-4 text-center text-xs">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <p className="text-emerald-400 font-medium">Rising Star</p>
              <p className="text-slate-500">높은 성장 + 큰 규모</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-blue-400 font-medium">Big & Stable</p>
              <p className="text-slate-500">안정적 + 큰 규모</p>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-400 font-medium">Niche</p>
              <p className="text-slate-500">특정 분야 집중</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-red-400 font-medium">Declining</p>
              <p className="text-slate-500">관심 감소 추세</p>
            </div>
          </div>
        </div>

        {/* Row 4: All Keywords Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">전체 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {keywordAnalytics?.map((kw) => (
              <button
                key={kw.id}
                onClick={() => handleKeywordClick(kw.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all hover:scale-105 ${
                  kw.trendStatus === 'rising_star'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : kw.trendStatus === 'big_stable'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : kw.trendStatus === 'declining'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {kw.term}
                {kw.growthRate3m !== 0 && (
                  <span className={`ml-1 text-xs ${
                    kw.growthRate3m > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {kw.growthRate3m > 0 ? '+' : ''}{kw.growthRate3m}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keyword Insight Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                키워드 인사이트
              </h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {insightLoading ? (
              <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500/30 border-t-blue-500" />
              </div>
            ) : keywordInsight ? (
              <div className="p-6 space-y-6">
                {/* Keyword Header */}
                <div>
                  <h4 className="text-2xl font-bold text-white">{keywordInsight.keyword.term}</h4>
                  <p className="text-slate-400 text-sm mt-1">{keywordInsight.description}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">총 등장</p>
                    <p className="text-xl font-semibold text-white">{keywordInsight.keyword.totalCount}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">3개월 성장률</p>
                    <p className={`text-xl font-semibold ${
                      keywordInsight.keyword.growthRate3m > 0 ? 'text-emerald-400' :
                      keywordInsight.keyword.growthRate3m < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {keywordInsight.keyword.growthRate3m > 0 ? '+' : ''}{keywordInsight.keyword.growthRate3m}%
                    </p>
                  </div>
                </div>

                {/* Mini Trend Chart */}
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">최근 1년 트렌드</h5>
                  <div className="h-32 bg-slate-800/30 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={keywordInsight.trendData}>
                        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 9 }} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Companies */}
                {keywordInsight.topCompanies.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">관련 주요 회사</h5>
                    <div className="space-y-2">
                      {keywordInsight.topCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2"
                        >
                          <span className="text-white text-sm">{company.name}</span>
                          <span className="text-slate-500 text-xs">{company.articleCount}건</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Products */}
                {keywordInsight.topProducts.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">관련 제품</h5>
                    <div className="space-y-2">
                      {keywordInsight.topProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2"
                        >
                          <span className="text-white text-sm">{product.name}</span>
                          <span className="text-slate-500 text-xs">{product.articleCount}건</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Comment */}
                <div className="bg-gradient-to-br from-purple-900/30 to-slate-800/30 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">AI 분석</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {keywordInsight.aiComment}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">
                키워드를 선택해주세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
