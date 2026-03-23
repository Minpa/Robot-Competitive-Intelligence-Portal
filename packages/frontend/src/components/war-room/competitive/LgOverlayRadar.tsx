'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { CompetitiveOverlayResult } from '@/types/war-room';
import { RadarChartInfo } from './ScoreInfoModal';

interface LgOverlayRadarProps {
  data: CompetitiveOverlayResult | null;
  isLoading: boolean;
}

const COMPETITOR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
const LG_COLOR = '#3b82f6';

export function LgOverlayRadar({ data, isLoading }: LgOverlayRadarProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-48 animate-pulse rounded bg-slate-800" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-48 w-48 animate-pulse rounded-full bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!data || !data.lgData) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-white">LG vs Top 5 오버레이 레이더</h3>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">오버레이 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  // Build radar axes from LG pocScores keys
  const factorKeys = Object.keys(data.lgData.pocScores);
  const radarData = factorKeys.map((key) => {
    const entry: Record<string, string | number> = { factor: key };
    entry[data.lgData!.robotName] = data.lgData!.pocScores[key] ?? 0;
    data.top5Data.forEach((comp) => {
      entry[comp.robotName] = comp.pocScores[key] ?? 0;
    });
    return entry;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">LG vs Top 5 오버레이 레이더</h3>
        <RadarChartInfo />
      </div>
      <p className="mt-1 text-xs text-slate-400">PoC 팩터 비교</p>

      <div className="mt-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="factor" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            {/* LG robot — prominent */}
            <Radar
              name={data.lgData.robotName}
              dataKey={data.lgData.robotName}
              stroke={LG_COLOR}
              fill={LG_COLOR}
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {/* Top 5 competitors — lower opacity */}
            {data.top5Data.map((comp, i) => (
              <Radar
                key={comp.robotId}
                name={comp.robotName}
                dataKey={comp.robotName}
                stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
                fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
                fillOpacity={0.08}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
