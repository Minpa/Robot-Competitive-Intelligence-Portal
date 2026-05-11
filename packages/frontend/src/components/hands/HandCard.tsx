'use client';

import Link from 'next/link';
import { Trophy, Gauge, Weight, Activity, Fingerprint, ArrowRightLeft, Scale } from 'lucide-react';
import { HandImage } from './HandImage';
import type { HandBenchmarkAxis, HandBenchmarkCompetitor } from '@/types/ci-update';

const CATEGORY_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  dexterous: { label: '다지형', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600' },
  'industrial-5f': { label: '산업용 5지형', bgColor: 'bg-slate-500/10', textColor: 'text-slate-600' },
};

const AXIS_ICON: Record<string, typeof Fingerprint> = {
  dof: Fingerprint,
  payload: Weight,
  gripForce: Gauge,
  responseSpeed: Activity,
  tactileChannels: ArrowRightLeft,
  weightEfficiency: Scale,
};

interface HandCardProps {
  hand: HandBenchmarkCompetitor;
  axes: HandBenchmarkAxis[];
}

export function HandCard({ hand, axes }: HandCardProps) {
  const totalScore = axes.reduce((sum, ax) => sum + (hand.scores[ax.key]?.currentScore || 0), 0);
  const maxTotal = axes.length * 10;
  const category = CATEGORY_CONFIG[hand.category || 'dexterous'] || CATEGORY_CONFIG.dexterous;

  // Show top-3 strongest axes inline
  const topAxes = [...axes]
    .map((ax) => ({ ax, score: hand.scores[ax.key]?.currentScore || 0, rawValue: hand.scores[ax.key]?.rawValue }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <Link
      href={`/hand-registry/${hand.slug}`}
      className="block bg-white rounded-xl border border-ink-200 hover:border-info/30 transition-all hover:shadow-report-lg"
    >
      <HandImage
        imageUrl={hand.imageUrl}
        handName={hand.name}
        manufacturer={hand.manufacturer}
        size="md"
        className="border-b border-ink-100 rounded-t-xl"
      />

      {/* Header */}
      <div className="p-4 border-b border-ink-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ink-900">{hand.name}</h3>
            <p className="text-sm text-ink-500">{hand.manufacturer}</p>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${category.bgColor} ${category.textColor}`}>
              {category.label}
            </span>
            {hand.country && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-ink-100 text-ink-500">
                {hand.country}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score row */}
      <div className="px-4 py-2 border-b border-ink-100 flex items-center justify-between">
        <p className="text-xs text-ink-500">Perfect Hand Spec 대비</p>
        <span className="flex items-center gap-1 text-xs font-medium text-amber-500" title="6축 합산 점수">
          <Trophy className="w-3 h-3" />
          {totalScore}/{maxTotal}점
        </span>
      </div>

      {/* Top 3 axes */}
      <div className="px-4 py-3 space-y-1.5">
        {topAxes.map(({ ax, score, rawValue }) => {
          const Icon = AXIS_ICON[ax.key] || Fingerprint;
          return (
            <div key={ax.key} className="flex items-center gap-2 text-xs">
              <Icon className="w-3.5 h-3.5 text-info shrink-0" />
              <span className="text-ink-700 shrink-0">{ax.label}</span>
              <span className="text-ink-500 truncate flex-1 text-right">
                {rawValue ?? `${score}점`}
                <span className="text-ink-300 ml-1">({score}/10)</span>
              </span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
