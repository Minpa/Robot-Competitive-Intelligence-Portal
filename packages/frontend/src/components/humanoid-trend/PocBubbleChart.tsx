'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label, LabelList,
} from 'recharts';
import { getRobotColor } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

export default function PocBubbleChart({ data }: Props) {
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
    label: d.robotName || d.label,
    displayLabel: `${d.robotName || d.label} (DoF:${d.bubbleSize})`,
    robotName: d.robotName || d.label,
    metadata: d.metadata,
    color: d.robotId ? getRobotColor(d.robotId) : '#8B5CF6',
  }));

  return (
    <div className="h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 40, bottom: 30, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#9CA3AF' }}>
            <Label value="폼팩터 / 인체 유사도 (Form Factor)" position="bottom" offset={10} style={{ fontSize: 12, fill: '#9CA3AF' }} />
          </XAxis>
          <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#9CA3AF' }}>
            <Label value="산업 적합성 (Industry Fit)" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 12, fill: '#9CA3AF' }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[100, 800]} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs text-gray-200">
                  <p className="font-semibold">{d.robotName}</p>
                  <p>폼팩터: {d.x}</p>
                  <p>산업 적합성: {d.y.toFixed(1)}</p>
                  <p>핑거 DoF 점수: {d.z}</p>
                </div>
              );
            }}
          />
          <Scatter data={chartData}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.7} />
            ))}
            <LabelList
              dataKey="displayLabel"
              position="top"
              offset={12}
              style={{ fontSize: 10, fill: '#D1D5DB', fontWeight: 500 }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
