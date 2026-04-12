'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { LgPositioning } from '@/types/war-room';
import { RadarSummaryInfo } from './DashboardInfoModals';

interface RadarSummaryProps {
  data: LgPositioning | null;
  isLoading: boolean;
}

// Default PoC 6-Factor labels for radar display
const defaultFactors = [
  { key: 'hardware', label: '하드웨어' },
  { key: 'software', label: '소프트웨어' },
  { key: 'deployment', label: '배치' },
  { key: 'safety', label: '안전성' },
  { key: 'interaction', label: '상호작용' },
  { key: 'autonomy', label: '자율성' },
];

export function RadarSummary({ data, isLoading }: RadarSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <div className="mb-3 h-5 w-48 animate-pulse rounded bg-argos-bgAlt" />
        <div className="flex h-52 items-center justify-center">
          <div className="h-40 w-40 animate-pulse rounded-full bg-argos-bgAlt" />
        </div>
      </div>
    );
  }

  if (!data || !data.positioningData || data.positioningData.length === 0) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
        <h3 className="text-sm font-semibold text-argos-ink">LG vs Top 5 레이더</h3>
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-argos-muted">포지셔닝 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  // Build radar data from positioning points
  const radarData = defaultFactors.map((f, i) => ({
    factor: f.label,
    value: data.positioningData[i]?.xValue ?? 0,
  }));

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-argos-ink">LG vs Top 5 레이더</h3>
        <RadarSummaryInfo />
      </div>
      <p className="mt-1 text-xs text-argos-muted">{data.robotName} PoC 요약</p>

      <div className="mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgb(var(--color-slate-700))" />
            <PolarAngleAxis
              dataKey="factor"
              tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            />
            <Radar
              name={data.robotName}
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
