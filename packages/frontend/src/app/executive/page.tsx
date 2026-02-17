'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { BarChart3, TrendingUp, Users, Cpu, Tag, Globe, Zap, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const VIEWS = [
  { id: 'segment', label: '세그먼트 히트맵', icon: BarChart3 },
  { id: 'commercialization', label: '상용화 전환', icon: TrendingUp },
  { id: 'players', label: '플레이어 확장', icon: Users },
  { id: 'price', label: '가격·성능', icon: TrendingUp },
  { id: 'components', label: '부품 채택', icon: Cpu },
  { id: 'keywords', label: '키워드 포지션', icon: Tag },
  { id: 'industry', label: '산업별 도입', icon: Globe },
  { id: 'regional', label: '지역별 경쟁', icon: Globe },
  { id: 'tech', label: '핵심 기술', icon: Zap },
  { id: 'events', label: 'Top 이벤트', icon: Calendar },
];

export default function ExecutivePage() {
  const [activeView, setActiveView] = useState('segment');

  const { data: insightCards } = useQuery({
    queryKey: ['insight-cards'],
    queryFn: () => api.getInsightCards(),
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">경영진 대시보드</h1>
            <p className="text-slate-400">휴머노이드 로봇 산업 전략 인사이트</p>
          </div>

          {/* 인사이트 카드 */}
          {insightCards && Array.isArray(insightCards) && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              {insightCards.slice(0, 5).map((card: any) => (
                <div key={card.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{card.title}</p>
                  <p className="text-xl font-bold text-white">{card.value}</p>
                  {card.trend && (
                    <div className={`flex items-center gap-1 text-xs mt-1 ${card.trend === 'up' ? 'text-emerald-400' : card.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                      {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : card.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                      {card.trendValue || card.description?.substring(0, 30)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 뷰 탭 */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
            {VIEWS.map(v => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                    activeView === v.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* 뷰 콘텐츠 */}
          <ViewContent viewId={activeView} />
        </div>
      </div>
    </AuthGuard>
  );
}

function ViewContent({ viewId }: { viewId: string }) {
  const queryMap: Record<string, { key: string; fn: () => Promise<any> }> = {
    segment: { key: 'exec-segment', fn: () => api.getSegmentHeatmap() },
    commercialization: { key: 'exec-comm', fn: () => api.getCommercializationAnalysis() },
    players: { key: 'exec-players', fn: () => api.getPlayerExpansion() },
    price: { key: 'exec-price', fn: () => api.getPricePerformanceTrend() },
    components: { key: 'exec-comp', fn: () => api.getComponentTrendData() },
    keywords: { key: 'exec-kw', fn: () => api.getKeywordPositionMapData() },
    industry: { key: 'exec-ind', fn: () => api.getIndustryAdoption() },
    regional: { key: 'exec-reg', fn: () => api.getRegionalCompetition() },
    tech: { key: 'exec-tech', fn: () => api.getTechAxisData() },
    events: { key: 'exec-events', fn: () => api.getTopEventsData() },
  };

  const config = queryMap[viewId];
  const { data, isLoading } = useQuery({
    queryKey: [config?.key || viewId],
    queryFn: config?.fn || (() => Promise.resolve(null)),
    enabled: !!config,
  });

  if (isLoading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!data) return <div className="text-center py-12 text-slate-500">데이터 없음</div>;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      {viewId === 'segment' && <SegmentView data={data} />}
      {viewId === 'commercialization' && <CommercializationView data={data} />}
      {viewId === 'players' && <PlayersView data={data} />}
      {viewId === 'price' && <PriceView data={data} />}
      {viewId === 'components' && <ComponentsView data={data} />}
      {viewId === 'keywords' && <KeywordsView data={data} />}
      {viewId === 'industry' && <IndustryView data={data} />}
      {viewId === 'regional' && <RegionalView data={data} />}
      {viewId === 'tech' && <TechView data={data} />}
      {viewId === 'events' && <EventsView data={data} />}
    </div>
  );
}

function SegmentView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">세그먼트 히트맵 (환경 × 작업 × 이동방식)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.matrix?.map((m: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-white">{m.env} / {m.task}</p>
                <p className="text-xs text-slate-400">{m.locomotion}</p>
              </div>
              <span className={`text-lg font-bold ${m.count > 5 ? 'text-emerald-400' : m.count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {m.count}
              </span>
            </div>
          </div>
        ))}
        {(!data.matrix || data.matrix.length === 0) && <p className="text-slate-500 col-span-3">데이터가 없습니다.</p>}
      </div>
    </div>
  );
}

function CommercializationView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">상용화 전환 퍼널</h2>
      <div className="space-y-3">
        {data.conversionRates?.map((cr: any, i: number) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-sm text-slate-300 w-24">{cr.from}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
              <div className="bg-violet-600 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(cr.rate * 100, 5)}%` }}>
                <span className="text-xs text-white">{Math.round(cr.rate * 100)}%</span>
              </div>
            </div>
            <span className="text-sm text-slate-300 w-24">{cr.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">주요 플레이어 확장 추이</h2>
      <div className="space-y-4">
        {data.companies?.slice(0, 10).map((c: any) => (
          <div key={c.companyId} className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-white font-medium mb-2">{c.companyName}</p>
            <div className="flex gap-2 flex-wrap">
              {c.timeline?.map((t: any, i: number) => (
                <span key={i} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">{t.event}</span>
              ))}
              {c.timeline?.length === 0 && <span className="text-xs text-slate-500">이벤트 없음</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">가격·성능 트렌드</h2>
      {data.performanceTrends?.map((pt: any) => (
        <div key={pt.metric} className="mb-4">
          <p className="text-sm text-slate-300 mb-2">{pt.metric}</p>
          <div className="flex gap-2 flex-wrap">
            {pt.data?.map((d: any) => (
              <div key={d.year} className="bg-slate-800/50 rounded px-3 py-2 text-center">
                <p className="text-xs text-slate-400">{d.year}</p>
                <p className="text-sm text-white font-medium">{d.avg}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {(!data.performanceTrends || data.performanceTrends.length === 0) && <p className="text-slate-500">데이터가 없습니다.</p>}
    </div>
  );
}

function ComponentsView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">부품 채택 트렌드</h2>
      {data.adoptionTrends?.map((at: any) => (
        <div key={at.componentType} className="mb-3 bg-slate-800/50 rounded-lg p-3">
          <p className="text-sm text-white mb-1">{at.componentType}</p>
          <div className="flex gap-2">
            {at.data?.map((d: any, i: number) => (
              <span key={i} className="text-xs text-slate-300">{d.year}: {d.count}건</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KeywordsView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">키워드 포지션 맵</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-emerald-400 mb-2">Rising Top 10</p>
          {data.risingTop10?.map((k: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-slate-300">{k.keyword}</span>
              <span className="text-emerald-400">+{k.growthRate}%</span>
            </div>
          ))}
          {(!data.risingTop10 || data.risingTop10.length === 0) && <p className="text-xs text-slate-500">데이터 없음</p>}
        </div>
        <div>
          <p className="text-sm text-red-400 mb-2">Declining Top 10</p>
          {data.decliningTop10?.map((k: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-slate-300">{k.keyword}</span>
              <span className="text-red-400">{k.growthRate}%</span>
            </div>
          ))}
          {(!data.decliningTop10 || data.decliningTop10.length === 0) && <p className="text-xs text-slate-500">데이터 없음</p>}
        </div>
      </div>
    </div>
  );
}

function IndustryView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">산업별 도입 현황</h2>
      <div className="space-y-3">
        {data.industries?.map((ind: any) => (
          <div key={ind.industry} className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">{ind.industry}</span>
              <span className="text-sm text-slate-300">{ind.totalCases}건</span>
            </div>
            <div className="flex gap-2">
              {Object.entries(ind.stageDistribution || {}).map(([stage, count]) => (
                <span key={stage} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">{stage}: {count as number}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionalView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">지역별 경쟁 구도</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.regions?.map((r: any) => (
          <div key={r.region} className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-white font-medium mb-2">{r.region}</p>
            <div className="space-y-1 text-sm">
              <p className="text-slate-300">회사 {r.companyCount}개</p>
              <p className="text-slate-300">제품 {r.productCount}개</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">핵심 기술 축</h2>
      <div className="flex flex-wrap gap-2">
        {data.bubbles?.map((b: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg px-3 py-2" style={{ fontSize: `${Math.max(12, Math.min(20, 12 + b.articleCount))}px` }}>
            <span className="text-cyan-300">{b.keyword}</span>
            <span className="text-xs text-slate-400 ml-1">({b.articleCount})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsView({ data }: { data: any }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Top 10 이벤트</h2>
      <div className="space-y-3">
        {data.events?.map((e: any, i: number) => (
          <div key={e.id} className="bg-slate-800/50 rounded-lg p-4 flex items-start gap-4">
            <span className="text-2xl font-bold text-violet-400 w-8">{i + 1}</span>
            <div className="flex-1">
              <p className="text-white font-medium">{e.title}</p>
              <p className="text-xs text-slate-400 mt-1">{e.date ? new Date(e.date).toLocaleDateString('ko-KR') : ''}</p>
              {e.summary && <p className="text-sm text-slate-300 mt-2">{e.summary}</p>}
            </div>
            <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
              {Math.round(e.importanceScore * 100)}점
            </span>
          </div>
        ))}
        {(!data.events || data.events.length === 0) && <p className="text-slate-500">이벤트가 없습니다.</p>}
      </div>
    </div>
  );
}
