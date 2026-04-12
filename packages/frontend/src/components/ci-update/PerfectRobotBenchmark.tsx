'use client';

import { useState, useMemo } from 'react';
import { useBenchmarkData } from '@/hooks/useCiUpdate';
import { BenchmarkRadarChart } from './BenchmarkRadarChart';
import { BenchmarkDetailPanel } from './BenchmarkDetailPanel';
import { BenchmarkLeaderboard } from './BenchmarkLeaderboard';
import { BenchmarkGapAnalysis } from './BenchmarkGapAnalysis';
import { BenchmarkScoringGuide } from './BenchmarkScoringGuide';

const ALL_SLUGS = ['digit', 'optimus', 'figure', 'neo', 'atlas', 'cloid'];

const COMPANY_COLORS: Record<string, string> = {
  digit: '#22d3ee',
  optimus: '#f43f5e',
  figure: '#a78bfa',
  neo: '#fbbf24',
  atlas: '#34d399',
  cloid: '#ff6b9d',
};

export function PerfectRobotBenchmark() {
  const { data, isLoading, error } = useBenchmarkData();
  const [activeCompetitors, setActiveCompetitors] = useState<Set<string>>(new Set(ALL_SLUGS));
  const [showTargets, setShowTargets] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>('cloid');

  const selectedCompetitor = useMemo(() => {
    if (!data || !selectedSlug) return null;
    return data.competitors.find(c => c.slug === selectedSlug) || null;
  }, [data, selectedSlug]);

  const cloidCompetitor = useMemo(() => {
    if (!data) return undefined;
    return data.competitors.find(c => c.slug === 'cloid');
  }, [data]);

  const toggleCompetitor = (slug: string) => {
    setActiveCompetitors(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-argos-muted text-sm">벤치마크 데이터 로딩 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-400 text-sm">데이터 로드 실패. 서버 연결을 확인하세요.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-argos-bgAlt rounded-xl border border-argos-border p-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-argos-ink">THE ULTIMATE BENCHMARK</h2>
          <p className="text-base text-argos-muted">완벽한 로봇까지의 거리</p>
        </div>
        <p className="text-sm text-argos-muted mt-2">
          인간 수준의 신체 + 인지 + 자율 + 손재주 + 대화 + 연결 + 안전 + 상용 + IP + 확장성 — 10축 총 100점 기준으로 각 경쟁사의 현재 위치와 목표 방향을 시각화합니다.
        </p>
      </div>

      {/* Toggle chips + target button */}
      <div className="flex flex-wrap items-center gap-2">
        {data.competitors.map(comp => {
          const color = COMPANY_COLORS[comp.slug] || 'rgb(var(--color-argos-muted))';
          const isActive = activeCompetitors.has(comp.slug);
          const isSelected = selectedSlug === comp.slug;
          return (
            <button
              key={comp.slug}
              onClick={() => toggleCompetitor(comp.slug)}
              onDoubleClick={() => setSelectedSlug(comp.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isActive
                  ? 'border-opacity-60'
                  : 'opacity-40 border-argos-border'
              } ${isSelected ? 'ring-2 ring-offset-1 ring-offset-argos-bg' : ''}`}
              style={{
                borderColor: isActive ? color : undefined,
                backgroundColor: isActive ? `${color}15` : undefined,
                color: isActive ? color : 'rgb(var(--color-argos-muted))',
                outlineColor: isSelected ? color : undefined,
              }}
              title="클릭: 표시/숨기기, 더블클릭: 선택"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, opacity: isActive ? 1 : 0.3 }}
              />
              {comp.name}
              {comp.slug === 'cloid' && <span className="text-xs">(우리)</span>}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => setShowTargets(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showTargets
              ? 'bg-blue-600 text-white'
              : 'bg-argos-bgAlt text-argos-muted hover:text-argos-inkSoft'
          }`}
        >
          {showTargets ? '목표 방향 숨기기' : '목표 방향 표시'}
        </button>
      </div>

      {/* Main content: Radar + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Radar Chart (3 cols) */}
        <div className="lg:col-span-3 bg-argos-surface rounded-xl border border-argos-border p-4 flex items-center justify-center">
          <BenchmarkRadarChart
            axes={data.axes}
            competitors={data.competitors}
            activeCompetitors={activeCompetitors}
            showTargets={showTargets}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
          />
        </div>

        {/* Detail Panel (2 cols) */}
        <div className="lg:col-span-2">
          {selectedCompetitor ? (
            <BenchmarkDetailPanel axes={data.axes} competitor={selectedCompetitor} />
          ) : (
            <div className="bg-argos-surface rounded-xl border border-argos-border p-4 flex items-center justify-center h-full">
              <p className="text-argos-muted text-base">회사를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <BenchmarkLeaderboard
        axes={data.axes}
        competitors={data.competitors}
        onSelect={setSelectedSlug}
      />

      {/* Scoring Guide */}
      <BenchmarkScoringGuide axes={data.axes} />

      {/* CLOiD Gap Analysis */}
      <BenchmarkGapAnalysis axes={data.axes} cloid={cloidCompetitor} />
    </div>
  );
}
