'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ScoreHistoryEntry } from '@/types/war-room';

interface ScoreTrendChartProps {
  data: ScoreHistoryEntry[];
  selectedFactors: string[];
  robotNames: Map<string, string>;
  isLoading: boolean;
}

const ROBOT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#e879f9',
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-argos-border bg-argos-surface p-3 shadow-xl">
      <p className="mb-1.5 text-xs font-semibold text-argos-inkSoft">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-argos-muted">{entry.name}:</span>
          <span className="font-medium text-argos-ink">{Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Transform ScoreHistoryEntry[] into chart-ready data.
 * Each data point = { month, "robotName-factorKey": value, ... }
 */
function buildChartData(
  entries: ScoreHistoryEntry[],
  selectedFactors: string[],
  robotNames: Map<string, string>,
) {
  // Group by month
  const monthMap = new Map<string, Record<string, number>>();

  for (const entry of entries) {
    if (!monthMap.has(entry.snapshotMonth)) {
      monthMap.set(entry.snapshotMonth, {});
    }
    const row = monthMap.get(entry.snapshotMonth)!;
    const rName = robotNames.get(entry.robotId) ?? entry.robotId.slice(0, 8);

    for (const factor of selectedFactors) {
      let value: number | undefined;
      if (factor === 'combinedScore') {
        value = entry.combinedScore;
      } else if (entry.pocScores && factor in entry.pocScores) {
        value = entry.pocScores[factor];
      } else if (entry.rfmScores && factor in entry.rfmScores) {
        value = entry.rfmScores[factor];
      }
      if (value !== undefined) {
        row[`${rName}|${factor}`] = Number(value);
      }
    }
  }

  // Sort by month
  const months = Array.from(monthMap.keys()).sort();
  return months.map((month) => ({ month, ...monthMap.get(month) }));
}

function getLineKeys(
  entries: ScoreHistoryEntry[],
  selectedFactors: string[],
  robotNames: Map<string, string>,
): string[] {
  const keys = new Set<string>();
  const robotIds = [...new Set(entries.map((e) => e.robotId))];
  for (const robotId of robotIds) {
    const rName = robotNames.get(robotId) ?? robotId.slice(0, 8);
    for (const factor of selectedFactors) {
      keys.add(`${rName}|${factor}`);
    }
  }
  return Array.from(keys);
}

export function ScoreTrendChart({ data, selectedFactors, robotNames, isLoading }: ScoreTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-bg p-4">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-argos-bgAlt" />
        <div className="h-80 w-full animate-pulse rounded bg-argos-bgAlt" />
      </div>
    );
  }

  if (data.length === 0 || selectedFactors.length === 0) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-bg p-4">
        <h3 className="text-sm font-semibold text-argos-ink">역량 변화 추이</h3>
        <p className="mt-8 text-center text-sm text-argos-muted">
          로봇과 팩터를 선택하면 차트가 표시됩니다
        </p>
      </div>
    );
  }

  const chartData = buildChartData(data, selectedFactors, robotNames);
  const lineKeys = getLineKeys(data, selectedFactors, robotNames);

  // Assign colors: cycle through ROBOT_COLORS per unique robot
  const robotIdList = [...new Set(data.map((e) => e.robotId))];
  const robotColorMap = new Map<string, string>();
  robotIdList.forEach((id, i) => {
    robotColorMap.set(
      robotNames.get(id) ?? id.slice(0, 8),
      ROBOT_COLORS[i % ROBOT_COLORS.length],
    );
  });

  return (
    <div className="rounded-xl border border-argos-border bg-argos-bg p-4">
      <h3 className="mb-4 text-sm font-semibold text-argos-ink">역량 변화 추이</h3>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
          <XAxis
            dataKey="month"
            tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            axisLine={{ stroke: 'rgb(var(--color-slate-600))' }}
            tickLine={{ stroke: 'rgb(var(--color-slate-600))' }}
          />
          <YAxis
            tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            axisLine={{ stroke: 'rgb(var(--color-slate-600))' }}
            tickLine={{ stroke: 'rgb(var(--color-slate-600))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'rgb(var(--color-slate-400))' }}
            formatter={(value: string) => {
              const [robot, factor] = value.split('|');
              return selectedFactors.length === 1 ? robot : `${robot} (${factor})`;
            }}
          />
          {lineKeys.map((key) => {
            const robotName = key.split('|')[0];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={robotColorMap.get(robotName) ?? '#3b82f6'}
                strokeWidth={2}
                dot={{ r: 3, fill: robotColorMap.get(robotName) ?? '#3b82f6' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
