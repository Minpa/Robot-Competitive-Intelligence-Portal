'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label, Legend,
} from 'recharts';
import { getCountryColor } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

const COUNTRY_LEGEND = [
  { value: 'US', color: '#3B82F6' },
  { value: 'CN', color: '#F97316' },
  { value: 'KR', color: '#EC4899' },
  { value: 'Other', color: '#94A3B8' },
];

export default function SocBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-400 dark:text-gray-500 text-sm">
        포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    x: d.xValue,
    y: d.yValue,
    z: d.bubbleSize,
    label: d.label,
    robotName: d.robotName || d.label,
    colorGroup: d.colorGroup || 'Other',
    metadata: d.metadata,
    color: getCountryColor(d.colorGroup || ''),
  }));

  return (
    <div className="h-[480px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#9CA3AF' }}>
            <Label value="SoC 에코시스템 수준 (SoC Level)" position="bottom" offset={10} style={{ fontSize: 12, fill: '#9CA3AF' }} />
          </XAxis>
          <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#9CA3AF' }}>
            <Label value="TOPS" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 12, fill: '#9CA3AF' }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[100, 800]} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              const meta = d.metadata as Record<string, unknown> | null;
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs text-gray-200">
                  <p className="font-semibold">{d.robotName}</p>
                  {meta?.socName != null && <p>SoC: {String(meta.socName)}</p>}
                  <p>TOPS: {d.y}</p>
                  <p>출하 규모: {d.z}</p>
                  <p>국가: {d.colorGroup}</p>
                </div>
              );
            }}
          />
          <Legend
            payload={COUNTRY_LEGEND.map((c) => ({ value: c.value, type: 'circle' as const, color: c.color }))}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Scatter data={chartData}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
