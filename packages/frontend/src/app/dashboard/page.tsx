'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  ExecutiveInsightCard,
  KpiCard,
  SegmentHeatmapPanel,
  TimelineTrendPanel,
  TalentProductScatterPanel,
  InsightHubPanel,
  SegmentDetailDrawer,
  GlobalFilterBar,
} from '@/components/dashboard';
import { ErrorFallbackWrapper } from '@/components/shared/ErrorFallbackWrapper';

// Helper to get date range
function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Helper to format date for display
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  // Filter state
  const [dateRange, setDateRange] = useState(getDateRange());
  const [region, setRegion] = useState('all');
  const [segment, setSegment] = useState('all');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<{ locomotion: string; purpose: string } | null>(null);

  // Task type filter state for segment heatmap
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('전체');

  // API queries — with error states for fallback handling
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary', dateRange, region, segment],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 3_600_000, // 1h — synced with ViewCacheConfig kpi_cards TTL
    gcTime: 3_600_000,
  });

  const { data: segmentMatrix, isLoading: matrixLoading, isError: matrixError, refetch: refetchMatrix } = useQuery({
    queryKey: ['segment-matrix', dateRange, region, segment],
    queryFn: () => api.getSegmentMatrix(),
    staleTime: 86_400_000, // 24h — synced with ViewCacheConfig segment_matrix TTL
    gcTime: 86_400_000,
  });

  const { data: weeklyHighlights, isLoading: highlightsLoading, isError: highlightsError } = useQuery({
    queryKey: ['weekly-highlights', dateRange, region, segment],
    queryFn: () => api.getWeeklyHighlights(),
    staleTime: 3_600_000,
    gcTime: 3_600_000,
  });

  // NEW: LLM-generated executive insight
  const { data: executiveInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['executive-insight', dateRange],
    queryFn: () => api.getExecutiveInsight(7, 'gpt-4o'),
    staleTime: 1000 * 60 * 30, // 30분 캐시
  });

  // NEW: Timeline trend data from API
  const { data: timelineData, isLoading: timelineLoading, isError: timelineError, refetch: refetchTimeline } = useQuery({
    queryKey: ['timeline-trend', dateRange, region, segment],
    queryFn: () => api.getTimelineTrendData(36, segment !== 'all' ? segment : undefined),
    staleTime: 86_400_000,
    gcTime: 86_400_000,
  });

  // NEW: Company scatter data from API
  const { data: scatterData, isLoading: scatterLoading, isError: scatterError, refetch: refetchScatter } = useQuery({
    queryKey: ['company-scatter', dateRange, region, segment],
    queryFn: () => api.getCompanyScatterData(),
    staleTime: 86_400_000,
    gcTime: 86_400_000,
  });

  // NEW: Segment detail for drawer
  const { data: segmentDetail, isLoading: segmentDetailLoading } = useQuery({
    queryKey: ['segment-detail', selectedSegment?.locomotion, selectedSegment?.purpose],
    queryFn: () => selectedSegment 
      ? api.getSegmentDetail(selectedSegment.locomotion, selectedSegment.purpose)
      : Promise.resolve(null),
    enabled: !!selectedSegment && drawerOpen,
  });

  // Transform segment matrix: swap axes from matrix[locomotion][purpose] to matrix[environment][locomotion]
  const transposedMatrix = useMemo(() => {
    if (!segmentMatrix?.matrix) return { rows: [], columns: [], matrix: {}, totalCount: 0 };

    const environments = segmentMatrix.columns; // purposes from backend = environments
    const locomotions = segmentMatrix.rows;     // locomotion types from backend
    const newMatrix: Record<string, Record<string, { count: number; robots: Array<{ id: string; name: string }> }>> = {};

    // Initialize all 9 cells (3 env × 3 locomotion)
    for (const env of environments) {
      newMatrix[env] = {};
      for (const loc of locomotions) {
        newMatrix[env][loc] = { count: 0, robots: [] };
      }
    }

    // Transpose: old matrix[locomotion][purpose] → new matrix[environment][locomotion]
    for (const loc of locomotions) {
      for (const env of environments) {
        const cell = segmentMatrix.matrix[loc]?.[env];
        if (cell) {
          newMatrix[env][loc] = cell;
        }
      }
    }

    return {
      rows: environments,     // Y axis = environment
      columns: locomotions,   // X axis = locomotion
      matrix: newMatrix,
      totalCount: segmentMatrix.totalCount,
    };
  }, [segmentMatrix]);

  // Generate news data from highlights
  const topNews = useMemo(() => {
    if (!weeklyHighlights?.categories) return [];
    const allNews: any[] = [];
    
    Object.entries(weeklyHighlights.categories).forEach(([category, items]) => {
      (items as any[]).forEach((item) => {
        allNews.push({
          id: item.id,
          date: item.publishedAt ? formatDate(item.publishedAt) : '날짜 없음',
          type: category === 'industry' ? 'investment' : category === 'technology' ? 'poc' : 'other',
          title: item.title,
          comment: item.summary?.slice(0, 50),
          url: item.url,
        });
      });
    });
    
    return allNews.slice(0, 5);
  }, [weeklyHighlights]);

  // Handle segment cell click (environment = row, locomotion = column)
  const handleSegmentClick = (environment: string, locomotion: string, _cell: any) => {
    setSelectedSegment({ locomotion, purpose: environment });
    setDrawerOpen(true);
  };

  // Handle company click in scatter
  const handleCompanyClick = (company: any) => {
    window.location.href = `/companies/${company.id}`;
  };

  // Insight data (from API or fallback)
  const insightData = useMemo(() => {
    if (executiveInsight) {
      return {
        title: executiveInsight.title,
        summary: executiveInsight.summary,
        details: executiveInsight.details,
        periodStart: executiveInsight.periodStart,
        periodEnd: executiveInsight.periodEnd,
      };
    }
    // Fallback
    const totalRobots = summary?.totalRobots || 0;
    const totalCompanies = summary?.totalCompanies || 0;
    return {
      title: '이번 주 핵심 인사이트',
      summary: `현재 ${totalCompanies}개 회사에서 ${totalRobots}개의 휴머노이드 로봇 제품이 등록되어 있습니다. 산업용 2족 보행 로봇이 가장 활발한 세그먼트이며, 최근 PoC 발표가 증가하는 추세입니다.`,
      details: `휴머노이드 로봇 시장은 산업용 분야를 중심으로 빠르게 성장하고 있습니다.`,
      periodStart: dateRange.start,
      periodEnd: dateRange.end,
    };
  }, [executiveInsight, summary, dateRange]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📊</span>
              HRIP 분석 대시보드
            </h1>
            <p className="text-slate-400 mt-1">휴머노이드 로봇 시장 인텔리전스 플랫폼</p>
          </div>

          {/* Global Filter Bar */}
          <GlobalFilterBar
            dateRange={dateRange}
            region={region}
            segment={segment}
            onDateRangeChange={setDateRange}
            onRegionChange={setRegion}
            onSegmentChange={setSegment}
          />

          {/* Row 1: Insight Header + KPI Cards */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* Executive Insight Card - 6 columns */}
            <div className="col-span-12 lg:col-span-6">
              <ExecutiveInsightCard
                title={insightData.title}
                summary={insightData.summary}
                details={insightData.details}
                periodStart={insightData.periodStart}
                periodEnd={insightData.periodEnd}
                isLoading={insightLoading || summaryLoading}
              />
            </div>

            {/* KPI Cards - 6 columns (2x2 grid) — fallback: cache + stale badge (TTL 1h) */}
            <div className="col-span-12 lg:col-span-6">
              <ErrorFallbackWrapper
                isError={summaryError}
                isLoading={false}
                fallbackType="cache"
                cachedData={summary}
                isStale={summaryError && !!summary}
                onRetry={() => refetchSummary()}
              >
                <div className="grid grid-cols-2 gap-4">
                  <KpiCard
                    title="총 휴머노이드"
                    value={summary?.totalRobots || 0}
                    previousValue={(summary?.totalRobots || 0) - (executiveInsight?.keyMetrics?.newRobots || 2)}
                    icon="🤖"
                    color="blue"
                    isLoading={summaryLoading}
                  />
                  <KpiCard
                    title="총 회사"
                    value={summary?.totalCompanies || 0}
                    previousValue={(summary?.totalCompanies || 0) - 1}
                    icon="🏢"
                    color="green"
                    isLoading={summaryLoading}
                  />
                  <KpiCard
                    title="30일 신규 제품"
                    value={executiveInsight?.keyMetrics?.newRobots || summary?.weeklyNewProducts || 3}
                    previousValue={2}
                    icon="🆕"
                    color="purple"
                    isLoading={summaryLoading}
                  />
                  <KpiCard
                    title="30일 주요 이벤트"
                    value={(executiveInsight?.keyMetrics?.newPocs || 0) + (executiveInsight?.keyMetrics?.newInvestments || 0) + (executiveInsight?.keyMetrics?.newProductions || 0) || 5}
                    previousValue={4}
                    icon="📅"
                    color="orange"
                    isLoading={summaryLoading}
                  />
                </div>
              </ErrorFallbackWrapper>
            </div>
          </div>

          {/* Row 2: Segment Matrix + Timeline Trend */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* Segment Heatmap - 7 columns — fallback: cache (TTL 24h) */}
            <div className="col-span-12 lg:col-span-7">
              <ErrorFallbackWrapper
                isError={matrixError}
                isLoading={false}
                fallbackType="cache"
                cachedData={segmentMatrix}
                isStale={matrixError && !!segmentMatrix}
                onRetry={() => refetchMatrix()}
              >
                <SegmentHeatmapPanel
                  matrix={transposedMatrix.matrix}
                  rows={transposedMatrix.rows}
                  columns={transposedMatrix.columns}
                  totalCount={transposedMatrix.totalCount}
                  isLoading={matrixLoading}
                  taskTypeFilter={taskTypeFilter}
                  onTaskTypeChange={setTaskTypeFilter}
                  onCellClick={handleSegmentClick}
                />
              </ErrorFallbackWrapper>
            </div>

            {/* Timeline Trend - 5 columns — fallback: empty_retry */}
            <div className="col-span-12 lg:col-span-5">
              <ErrorFallbackWrapper
                isError={timelineError}
                isLoading={false}
                fallbackType="empty_retry"
                onRetry={() => refetchTimeline()}
                emptyMessage="타임라인 데이터를 불러올 수 없습니다"
              >
                <TimelineTrendPanel
                  data={timelineData || []}
                  isLoading={timelineLoading}
                />
              </ErrorFallbackWrapper>
            </div>
          </div>

          {/* Row 3: Talent/Product Scatter + Insight Hub */}
          <div className="grid grid-cols-12 gap-4">
            {/* Talent vs Product Scatter - 7 columns — fallback: empty_retry */}
            <div className="col-span-12 lg:col-span-7">
              <ErrorFallbackWrapper
                isError={scatterError}
                isLoading={false}
                fallbackType="empty_retry"
                onRetry={() => refetchScatter()}
                emptyMessage="인력-제품 데이터를 불러올 수 없습니다"
              >
                <TalentProductScatterPanel
                  data={scatterData || []}
                  isLoading={scatterLoading}
                  onPointClick={handleCompanyClick}
                />
              </ErrorFallbackWrapper>
            </div>

            {/* Insight Hub - 5 columns — fallback: hide (highlights section) */}
            <div className="col-span-12 lg:col-span-5">
              <ErrorFallbackWrapper
                isError={highlightsError}
                isLoading={false}
                fallbackType="hide"
              >
                <InsightHubPanel
                  latestReport={{
                    id: '1',
                    title: '2026년 2월 2주차 휴머노이드 동향 브리프',
                    pageCount: 8,
                    updatedAt: formatDate(new Date().toISOString()),
                    isAutoGenerated: true,
                  }}
                  topNews={topNews}
                  isLoading={highlightsLoading}
                  onViewReport={() => alert('리포트 보기')}
                  onExportPPT={() => window.location.href = '/ppt-builder'}
                />
              </ErrorFallbackWrapper>
            </div>
          </div>
        </div>

        {/* Segment Detail Drawer */}
        <SegmentDetailDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          locomotion={selectedSegment?.locomotion || ''}
          purpose={selectedSegment?.purpose || ''}
          topCompanies={segmentDetail?.topCompanies || []}
          recentEvents={segmentDetail?.recentEvents || []}
          totalRobots={segmentDetail?.totalRobots || segmentMatrix?.matrix?.[selectedSegment?.locomotion || '']?.[selectedSegment?.purpose || '']?.count || 0}
          robots={segmentDetail?.robots}
          isLoading={segmentDetailLoading}
        />
      </div>
    </AuthGuard>
  );
}
