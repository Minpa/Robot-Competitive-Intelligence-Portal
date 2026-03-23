'use client';

import { useState, useMemo } from 'react';
import type { BenchmarkAxis, BenchmarkCompetitorData } from '@/types/ci-update';

const COMPANY_COLORS: Record<string, string> = {
  digit: '#22d3ee',
  optimus: '#f43f5e',
  figure: '#a78bfa',
  neo: '#fbbf24',
  atlas: '#34d399',
  cloid: '#ff6b9d',
};

interface BenchmarkRadarChartProps {
  axes: BenchmarkAxis[];
  competitors: BenchmarkCompetitorData[];
  activeCompetitors: Set<string>; // slugs that are toggled on
  showTargets: boolean;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

export function BenchmarkRadarChart({
  axes,
  competitors,
  activeCompetitors,
  showTargets,
  selectedSlug,
  onSelect,
}: BenchmarkRadarChartProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 200;
  const levels = [2, 4, 6, 8, 10];
  const numAxes = axes.length;

  // Calculate point position on the radar for a given axis index and score
  const getPoint = (axisIndex: number, score: number): [number, number] => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const radius = (score / 10) * maxRadius;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  // Build polygon path for a set of scores
  const getPolygonPath = (scores: Record<string, { currentScore: number; targetScore: number }>, useTarget: boolean) => {
    const points = axes.map((axis, i) => {
      const score = scores[axis.key];
      const value = score ? (useTarget ? score.targetScore : score.currentScore) : 0;
      return getPoint(i, value);
    });
    return points.map(([x, y]) => `${x},${y}`).join(' ');
  };

  const visibleCompetitors = competitors.filter(c => activeCompetitors.has(c.slug));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[500px] max-h-[500px]">
      {/* Grid levels */}
      {levels.map(level => {
        const points = axes.map((_, i) => getPoint(i, level));
        return (
          <polygon
            key={`grid-${level}`}
            points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="rgb(51, 65, 85)"
            strokeWidth={level === 10 ? 1.5 : 0.5}
            strokeDasharray={level === 10 ? '4 2' : undefined}
            opacity={level === 10 ? 0.8 : 0.4}
          />
        );
      })}

      {/* Perfect baseline (10) - green dashed */}
      {(() => {
        const points = axes.map((_, i) => getPoint(i, 10));
        return (
          <polygon
            points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.5}
          />
        );
      })()}

      {/* Axis lines */}
      {axes.map((axis, i) => {
        const [x, y] = getPoint(i, 10);
        return (
          <line key={`axis-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(71, 85, 105)" strokeWidth={0.5} opacity={0.5} />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const [x, y] = getPoint(i, 11.8);
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400"
            fontSize={13}
          >
            {axis.label}
          </text>
        );
      })}

      {/* Level numbers */}
      {levels.map(level => {
        const [x, y] = getPoint(0, level);
        return (
          <text key={`level-${level}`} x={x + 8} y={y - 4} fontSize={11} className="fill-slate-500">
            {level}
          </text>
        );
      })}

      {/* Company polygons */}
      {visibleCompetitors.map(comp => {
        const color = COMPANY_COLORS[comp.slug] || '#a1a1aa';
        const isHighlighted = hoveredSlug === null || hoveredSlug === comp.slug;
        const isSelected = selectedSlug === comp.slug;
        const isCloid = comp.slug === 'cloid';
        const opacity = isHighlighted ? 0.8 : 0.15;
        const fillOpacity = isHighlighted ? 0.08 : 0.02;

        return (
          <g
            key={comp.slug}
            onMouseEnter={() => setHoveredSlug(comp.slug)}
            onMouseLeave={() => setHoveredSlug(null)}
            onClick={() => onSelect(comp.slug)}
            style={{ cursor: 'pointer' }}
          >
            {/* Current polygon */}
            <polygon
              points={getPolygonPath(comp.scores, false)}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={color}
              strokeWidth={isSelected ? 2.5 : isCloid ? 2 : 1.5}
              strokeDasharray={isCloid ? '8 4' : undefined}
              opacity={opacity}
            />

            {/* Target polygon (if enabled) */}
            {showTargets && (
              <polygon
                points={getPolygonPath(comp.scores, true)}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={opacity * 0.6}
              />
            )}

            {/* Target direction arrows (if enabled) */}
            {showTargets && axes.map((axis, i) => {
              const score = comp.scores[axis.key];
              if (!score || score.currentScore === score.targetScore) return null;
              const [x1, y1] = getPoint(i, score.currentScore);
              const [x2, y2] = getPoint(i, score.targetScore);
              return (
                <line
                  key={`arrow-${comp.slug}-${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  opacity={opacity * 0.7}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {/* Score dots on current */}
            {axes.map((axis, i) => {
              const score = comp.scores[axis.key];
              if (!score) return null;
              const [x, y] = getPoint(i, score.currentScore);
              return (
                <circle
                  key={`dot-${comp.slug}-${i}`}
                  cx={x} cy={y} r={isHighlighted ? 3 : 2}
                  fill={color}
                  opacity={opacity}
                />
              );
            })}
          </g>
        );
      })}

      {/* Arrow marker definition */}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#a1a1aa" opacity={0.7} />
        </marker>
      </defs>
    </svg>
  );
}
