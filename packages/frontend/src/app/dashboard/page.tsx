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

  // API queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: segmentMatrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['segment-matrix'],
    queryFn: () => api.getSegmentMatrix(),
  });

  const { data: weeklyHighlights, isLoading: highlightsLoading } = useQuery({
    queryKey: ['weekly-highlights'],
    queryFn: () => api.getWeeklyHighlights(),
  });

  // NEW: LLM-generated executive insight
  const { data: executiveInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['executive-insight', dateRange],
    queryFn: () => api.getExecutiveInsight(7, 'gpt-4o'),
    staleTime: 1000 * 60 * 30, // 30분 캐시
  });

  // NEW: Timeline trend data from API
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline-trend', segment],
    queryFn: () => api.getTimelineTrendData(12, segment !== 'all' ? segment : undefined),
  });

  // NEW: Company scatter data from API
  const { data: scatterData, isLoading: scatterLoading } = useQuery({
    queryKey: ['company-scatter'],
    queryFn: () => api.getCompanyScatterData(),
  });

  // NEW: Segment detail for drawer
  const { data: segmentDetail, isLoading: segmentDetailLoading } = useQuery({
    queryKey: ['segment-detail', selectedSegment?.locomotion, selectedSegment?.purpose],
    queryFn: () => selectedSegment 
      ? api.getSegmentDetail(selectedSegment.locomotion, selectedSegment.purpose)
      : Promise.resolve(null),
    enabled: !!selectedSegment && drawerOpen,
  });

  // Generate news data from highlights
  const topNews = useMemo(() => {
    if (!weeklyHighlights?.categories) return [];
    const allNews: any[] = [];
    
    Object.entries(weeklyHighlights.categories).forEach(([category, items]) => {
      (items as any[]).forEach((item) => {
        allNews.push({
          id: item.id,
          date: item.publishedAt ? formatDate(item.publishedAt) : formatDate(new Date().toISOString()),
          type: category === 'industry' ? 'investment' : category === 'technology' ? 'poc' : 'other',
          title: item.title,
          comment: item.summary?.slice(0, 50),
          url: item.url,
        });
      });
    });
    
    return allNews.slice(0, 5);
  }, [weeklyHighlights]);

  // Handle segment cell click
  const handleSegmentClick = (locomotion: string, purpose: string, cell: any) => {
    setSelectedSegment({ locomotion, purpose });
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

            {/* KPI Cards - 6 columns (2x2 grid) */}
            <div className="col-span-12 lg:col-span-6 grid grid-cols-2 gap-4">
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
          </div>

          {/* Row 2: Segment Matrix + Timeline Trend */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* Segment Heatmap - 7 columns */}
            <div className="col-span-12 lg:col-span-7">
              <SegmentHeatmapPanel
                matrix={segmentMatrix?.matrix || {}}
                rows={segmentMatrix?.rows || []}
                columns={segmentMatrix?.columns || []}
                totalCount={segmentMatrix?.totalCount || 0}
                isLoading={matrixLoading}
                onCellClick={handleSegmentClick}
              />
            </div>

            {/* Timeline Trend - 5 columns */}
            <div className="col-span-12 lg:col-span-5">
              <TimelineTrendPanel
                data={timelineData || []}
                isLoading={timelineLoading}
              />
            </div>
          </div>

          {/* Row 3: Talent/Product Scatter + Insight Hub */}
          <div className="grid grid-cols-12 gap-4">
            {/* Talent vs Product Scatter - 7 columns */}
            <div className="col-span-12 lg:col-span-7">
              <TalentProductScatterPanel
                data={scatterData || []}
                isLoading={scatterLoading}
                onPointClick={handleCompanyClick}
              />
            </div>

            {/* Insight Hub - 5 columns */}
            <div className="col-span-12 lg:col-span-5">
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
        />
      </div>
    </AuthGuard>
  );
}
