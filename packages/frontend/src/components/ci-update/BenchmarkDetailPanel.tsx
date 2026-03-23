'use client';

import { useState } from 'react';
import type { BenchmarkAxis, BenchmarkCompetitorData } from '@/types/ci-update';

const COMPANY_COLORS: Record<string, string> = {
  digit: '#22d3ee', optimus: '#f43f5e', figure: '#a78bfa',
  neo: '#fbbf24', atlas: '#34d399', cloid: '#ff6b9d',
};

const STRATEGY_DIRECTIONS: Record<string, string> = {
  digit: '물류 자동화 심화. 안전 인증 + 대량 생산 확대. 손재주는 후순위.',
  optimus: 'FSD 데이터로 비전 AI 극대화. 대량생산 스케일이 핵심 무기. 모든 축 동시 추진.',
  figure: 'Helix VLA로 AI 자율성 최선두 추구. 촉각+팜카메라로 손재주 혁신. IP 극히 취약.',
  neo: '가정 최초 진출. 텔레오퍼레이션→자율 전환이 관건. 인간 상호작용 최우선.',
  atlas: '하드웨어+IP 최강에서 AI(DeepMind)+양산(Hyundai)으로 확장. 인간 상호작용은 후순위.',
  cloid: 'LG 스마트홈 생태계가 핵심 무기. 가정 특화 + 안전 표준 선점 + 인간 상호작용 최우선.',
};

interface BenchmarkDetailPanelProps {
  axes: BenchmarkAxis[];
  competitor: BenchmarkCompetitorData;
}

export function BenchmarkDetailPanel({ axes, competitor }: BenchmarkDetailPanelProps) {
  const [expandedAxis, setExpandedAxis] = useState<string | null>(null);
  const color = COMPANY_COLORS[competitor.slug] || '#94a3b8';
  const totalCurrent = axes.reduce((sum, axis) => sum + (competitor.scores[axis.key]?.currentScore || 0), 0);
  const totalTarget = axes.reduce((sum, axis) => sum + (competitor.scores[axis.key]?.targetScore || 0), 0);
  const gap = 100 - totalCurrent;
  const strategy = STRATEGY_DIRECTIONS[competitor.slug] || '';

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">{competitor.name}</h3>
          <p className="text-sm text-slate-400">{competitor.manufacturer}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color }}>{totalCurrent}<span className="text-base text-slate-500">/100</span></div>
          <div className="text-sm text-slate-400">완벽까지 <span className="text-red-400 font-medium">{gap}점</span></div>
        </div>
      </div>

      {/* Strategy direction */}
      {strategy && (
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">🎯 전략 방향</div>
          <p className="text-sm text-slate-300">{strategy}</p>
        </div>
      )}

      {/* 10-axis bars */}
      <div className="space-y-2">
        {axes.map(axis => {
          const score = competitor.scores[axis.key];
          const current = score?.currentScore || 0;
          const target = score?.targetScore || 0;
          const improvement = target - current;

          const isExpanded = expandedAxis === axis.key;
          return (
            <div key={axis.key}>
              <div
                className="cursor-pointer hover:bg-slate-700/20 rounded-lg px-2 py-1 -mx-2 transition-colors"
                onClick={() => setExpandedAxis(prev => prev === axis.key ? null : axis.key)}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-slate-300">
                    <span className="mr-1 text-xs text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                    {axis.icon} {axis.label}
                  </span>
                  <span className="text-sm text-slate-400">
                    {current}
                    {improvement > 0 && <span className="text-green-400 ml-1">→{target}</span>}
                  </span>
                </div>
                <div className="relative h-3.5 bg-slate-700 rounded-full overflow-hidden">
                  {/* Target bar (background) */}
                  {target > current && (
                    <div
                      className="absolute h-full rounded-full opacity-30"
                      style={{ width: `${target * 10}%`, backgroundColor: color }}
                    />
                  )}
                  {/* Current bar */}
                  <div
                    className="absolute h-full rounded-full"
                    style={{ width: `${current * 10}%`, backgroundColor: color }}
                  />
                </div>
              </div>
              {/* Expanded rationale */}
              {isExpanded && score?.rationale && (
                <div className="mt-1.5 ml-5 bg-slate-700/30 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{score.rationale}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total bar */}
      <div className="pt-2 border-t border-slate-700">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">총점</span>
          <span style={{ color }}>{totalCurrent} → {totalTarget}</span>
        </div>
        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
          <div className="absolute h-full rounded-full opacity-30" style={{ width: `${totalTarget}%`, backgroundColor: color }} />
          <div className="absolute h-full rounded-full" style={{ width: `${totalCurrent}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}
