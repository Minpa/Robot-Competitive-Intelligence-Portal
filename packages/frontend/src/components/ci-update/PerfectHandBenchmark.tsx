'use client';

import { useMemo, useState } from 'react';
import { useHandBenchmarkData } from '@/hooks/useCiUpdate';
import { BenchmarkRadarChart } from './BenchmarkRadarChart';
import { BenchmarkDetailPanel } from './BenchmarkDetailPanel';
import { BenchmarkLeaderboard } from './BenchmarkLeaderboard';

const HAND_COLORS: Record<string, string> = {
  'shadow-e3m5': '#22d3ee',       // cyan — 영국 표준
  'allegro-v4': '#f43f5e',         // rose — 한국 (Wonik)
  'tesollo-dg5f': '#fb923c',       // orange — 한국 (Tesollo)
  'inspire-rh56dfx': '#a78bfa',    // violet — 중국 (Inspire)
  'paxini-dexh13': '#34d399',      // emerald — 중국 (PaXini, 촉각 강점)
  'linkerhand-l20': '#fbbf24',     // amber — 중국 (Linker)
  'sanctuary-phoenix': '#ff6b9d',  // pink — 캐나다
  'schunk-svh': '#94a3b8',         // slate — 독일 (산업용 베이스라인)
};

const HAND_STRATEGIES: Record<string, string> = {
  'shadow-e3m5': '연구용 표준. 촉각 + DoF 최강이나 무게 문제로 휴머노이드 적용 한계. 차세대는 경량화가 관건.',
  'allegro-v4': '한국 연구 시장 표준. 4지형 한계 (엄지 부재). 촉각 옵션화 + DoF 확장이 차세대 과제.',
  'tesollo-dg5f': '국산 다지형 표준. 5핑거 균형형. 촉각 채널 확대 + 응답속도 강화가 차별화 포인트.',
  'inspire-rh56dfx': '휴머노이드 표준 핸드 — 페이로드/무게 효율 최강. 촉각 채널 확장으로 VLA 학습 호환성 추격 필요.',
  'paxini-dexh13': '텍타일 + 응답속도 양강. 1,300 텍셀 DexSkin이 핵심 차별점. DoF 확장 시 종합 1위 가능.',
  'linkerhand-l20': 'DoF 20 + 800g 경량 — 가성비 강점. 촉각 채널 확대로 Shadow급 추격 목표.',
  'sanctuary-phoenix': '자체 휴머노이드 통합 핸드. 그립력 강점. 촉각 + 외부 SDK 부재가 한계.',
  'schunk-svh': '산업용 5지형 베이스라인. 응답속도/촉각이 다지형 핸드 대비 약점. 산업 도구 그립력은 강점.',
};

export function PerfectHandBenchmark() {
  const { data, isLoading, error } = useHandBenchmarkData();
  const [activeSlugs, setActiveSlugs] = useState<Set<string> | null>(null);
  const [showTargets, setShowTargets] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Initialize once data arrives
  const allSlugs = useMemo(() => data?.competitors.map((c) => c.slug) ?? [], [data]);
  const activeSet = activeSlugs ?? new Set(allSlugs);

  // Default selection: first dexterous hand
  const selectedCompetitor = useMemo(() => {
    if (!data) return null;
    const slug = selectedSlug ?? data.competitors[0]?.slug ?? null;
    if (!slug) return null;
    return data.competitors.find((c) => c.slug === slug) ?? null;
  }, [data, selectedSlug]);

  const toggleSlug = (slug: string) => {
    setActiveSlugs((prev) => {
      const base = prev ?? new Set(allSlugs);
      const next = new Set(base);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-ink-500 text-sm">핸드 벤치마크 데이터 로딩 중...</div>
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
      <div className="bg-ink-100 rounded-xl border border-ink-200 p-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-ink-900">THE ULTIMATE HAND BENCHMARK</h2>
          <p className="text-base text-ink-500">완벽한 다지형 핸드까지의 거리</p>
        </div>
        <p className="text-sm text-ink-500 mt-2">
          DoF · 페이로드 · 그립력 · 응답속도 · 촉각 채널 · 무게 효율 — 6축 총 60점 기준으로 다지형 핸드 8종의 현재 위치와 목표 방향을 시각화합니다.
        </p>
      </div>

      {/* Toggle chips + target button */}
      <div className="flex flex-wrap items-center gap-2">
        {data.competitors.map((comp) => {
          const color = HAND_COLORS[comp.slug] || 'rgb(var(--color-ink-500))';
          const isActive = activeSet.has(comp.slug);
          const isSelected = (selectedSlug ?? data.competitors[0]?.slug) === comp.slug;
          return (
            <button
              key={comp.slug}
              onClick={() => toggleSlug(comp.slug)}
              onDoubleClick={() => setSelectedSlug(comp.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isActive ? 'border-opacity-60' : 'opacity-40 border-ink-200'
              } ${isSelected ? 'ring-2 ring-offset-1 ring-offset-paper' : ''}`}
              style={{
                borderColor: isActive ? color : undefined,
                backgroundColor: isActive ? `${color}15` : undefined,
                color: isActive ? color : 'rgb(var(--color-ink-500))',
                outlineColor: isSelected ? color : undefined,
              }}
              title="클릭: 표시/숨기기, 더블클릭: 선택"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: isActive ? 1 : 0.3 }} />
              {comp.name}
              {comp.category === 'industrial-5f' && <span className="text-xs">(산업용)</span>}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => setShowTargets((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showTargets ? 'bg-blue-600 text-white' : 'bg-ink-100 text-ink-500 hover:text-ink-700'
          }`}
        >
          {showTargets ? '목표 방향 숨기기' : '목표 방향 표시'}
        </button>
      </div>

      {/* Main content: Radar + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-ink-200 p-4 flex items-center justify-center">
          <BenchmarkRadarChart
            axes={data.axes}
            competitors={data.competitors}
            activeCompetitors={activeSet}
            showTargets={showTargets}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
            colorMap={HAND_COLORS}
            emphasisSlug="__none__"
          />
        </div>

        <div className="lg:col-span-2">
          {selectedCompetitor ? (
            <BenchmarkDetailPanel
              axes={data.axes}
              competitor={selectedCompetitor}
              colorMap={HAND_COLORS}
              strategies={HAND_STRATEGIES}
            />
          ) : (
            <div className="bg-white rounded-xl border border-ink-200 p-4 flex items-center justify-center h-full">
              <p className="text-ink-500 text-base">핸드를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <BenchmarkLeaderboard
        axes={data.axes}
        competitors={data.competitors}
        onSelect={setSelectedSlug}
        colorMap={HAND_COLORS}
      />

      {/* Perfect Hand Spec definition */}
      <div className="bg-white rounded-xl border border-ink-200 p-5">
        <h3 className="text-base font-semibold text-ink-900 mb-1">Perfect Hand Spec — 10점 기준</h3>
        <p className="text-xs text-ink-500 mb-3">휴머노이드 작업 표준 + Shadow Hand 최고 사양 기반으로 정의한 6축 목표치입니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.axes.map((axis) => (
            <div key={axis.key} className="bg-ink-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ink-900">{axis.label}</span>
                {axis.unit && <span className="text-xs text-ink-500">{axis.unit}</span>}
              </div>
              {axis.perfectDef && <p className="text-xs text-green-600 font-medium mb-1">{axis.perfectDef}</p>}
              {axis.description && <p className="text-xs text-ink-500 leading-relaxed">{axis.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
