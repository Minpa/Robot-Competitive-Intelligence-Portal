'use client';

import { useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { GlobalFilterBar } from '@/components/dashboard/GlobalFilterBar';
import { GlobalFilterParams } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  Globe,
  Zap,
  Calendar,
  PieChart,
  DollarSign,
  Lightbulb,
  LayoutGrid,
} from 'lucide-react';

// Tab components
import { KPIOverviewTab } from '@/components/executive/KPIOverviewTab';
import { SegmentHeatmapTab } from '@/components/executive/SegmentHeatmapTab';
import { MarketForecastTab } from '@/components/executive/MarketForecastTab';
import { RegionalShareTab } from '@/components/executive/RegionalShareTab';
import { PlayerExpansionTab } from '@/components/executive/PlayerExpansionTab';
import { WorkforceComparisonTab } from '@/components/executive/WorkforceComparisonTab';
import { TechnologyRadarTab } from '@/components/executive/TechnologyRadarTab';
import { InvestmentFlowTab } from '@/components/executive/InvestmentFlowTab';
import { InsightHubTab } from '@/components/executive/InsightHubTab';
import { TopEventsTab } from '@/components/executive/TopEventsTab';
import { TimelineTrendTab } from '@/components/executive/TimelineTrendTab';
import { TalentProductScatterTab } from '@/components/executive/TalentProductScatterTab';

type ExecutiveTab =
  | 'kpi-overview'
  | 'segment-heatmap'
  | 'market-forecast'
  | 'regional-share'
  | 'player-expansion'
  | 'workforce-comparison'
  | 'technology-radar'
  | 'investment-flow'
  | 'insight-hub'
  | 'top-events';

const TABS: { id: ExecutiveTab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'kpi-overview', label: 'KPI Overview', icon: LayoutGrid },
  { id: 'segment-heatmap', label: 'Segment Heatmap', icon: BarChart3 },
  { id: 'market-forecast', label: 'Market Forecast', icon: TrendingUp },
  { id: 'regional-share', label: 'Regional Share', icon: PieChart },
  { id: 'player-expansion', label: 'Player Expansion', icon: Users },
  { id: 'workforce-comparison', label: 'Workforce Comparison', icon: Users },
  { id: 'technology-radar', label: 'Technology Radar', icon: Zap },
  { id: 'investment-flow', label: 'Investment Flow', icon: DollarSign },
  { id: 'insight-hub', label: 'Insight Hub', icon: Lightbulb },
  { id: 'top-events', label: 'Top Events', icon: Calendar },
];

export default function ExecutivePage() {
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('kpi-overview');

  // GlobalFilterBar state — persists across tab switches
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2025-12-31' });
  const [region, setRegion] = useState('all');
  const [segment, setSegment] = useState('all');

  // Build filter params for React Query keys
  const filters: GlobalFilterParams = {
    startDate: dateRange.start,
    endDate: dateRange.end,
    regions: region !== 'all' ? [region] : undefined,
    segments: segment !== 'all' ? [segment] : undefined,
  };

  const handleDateRangeChange = useCallback((range: { start: string; end: string }) => {
    setDateRange(range);
  }, []);

  const handleRegionChange = useCallback((r: string) => {
    setRegion(r);
  }, []);

  const handleSegmentChange = useCallback((s: string) => {
    setSegment(s);
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">경영진 대시보드</h1>
            <p className="text-slate-400">휴머노이드 로봇 산업 전략 인사이트</p>
          </div>

          {/* GlobalFilterBar — shared across all tabs */}
          <GlobalFilterBar
            dateRange={dateRange}
            region={region}
            segment={segment}
            onDateRangeChange={handleDateRangeChange}
            onRegionChange={handleRegionChange}
            onSegmentChange={handleSegmentChange}
          />

          {/* ExecutiveTabNav — 10 horizontal tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-thin">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            {activeTab === 'kpi-overview' && <KPIOverviewTab filters={filters} />}
            {activeTab === 'segment-heatmap' && <SegmentHeatmapTab filters={filters} />}
            {activeTab === 'market-forecast' && <MarketForecastTab filters={filters} />}
            {activeTab === 'regional-share' && <RegionalShareTab filters={filters} />}
            {activeTab === 'player-expansion' && <PlayerExpansionTab filters={filters} />}
            {activeTab === 'workforce-comparison' && <WorkforceComparisonTab filters={filters} />}
            {activeTab === 'technology-radar' && <TechnologyRadarTab filters={filters} />}
            {activeTab === 'investment-flow' && <InvestmentFlowTab filters={filters} />}
            {activeTab === 'insight-hub' && <InsightHubTab filters={filters} />}
            {activeTab === 'top-events' && <TopEventsTab filters={filters} />}
          </div>

          {/* Additional panels below main tab content */}
          {(activeTab === 'kpi-overview' || activeTab === 'segment-heatmap') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <TimelineTrendTab filters={filters} />
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <TalentProductScatterTab filters={filters} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
