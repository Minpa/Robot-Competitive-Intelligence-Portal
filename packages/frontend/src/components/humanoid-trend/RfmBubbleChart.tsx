'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { getRobotColor } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

export default function RfmBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-sm">
        포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    x: d.xValue,
    y: d.yValue,
    z: d.bubbleSize,
    robotName: d.robotName || d.label,
    color: d.robotId ? getRobotColor(d.robotId) : '#8B5CF6',
  }));

  // Sort legend alphabetically
  const legendItems = [...chartData].sort((a, b) => a.robotName.localeCompare(b.robotName));

  return (
    <div className="space-y-4">
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" dataKey="x" domain={[0, 5]} tick={{ fontSize: 11, fill: '#CBD5E1' }}>
              <Label value="엣지 추론 역량 (Edge Inference)" position="bottom" offset={20} style={{ fontSize: 12, fill: '#94A3B8' }} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 5]} tick={{ fontSize: 11, fill: '#CBD5E1' }} width={40}>
              <Label value="범용성 (Generality)" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 12, fill: '#94A3B8' }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-gray-200 shadow-lg">
                    <p className="font-semibold text-white mb-1">{d.robotName}</p>
                    <p>엣지 추론: {d.x}</p>
                    <p>범용성: {d.y}</p>
                    <p>상용 성숙도: {d.z}</p>
                  </div>
                );
              }}
            />
            <Scatter data={chartData}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} stroke={d.color} strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/40">
        <p className="text-xs text-slate-400 mb-2 font-medium">범례 (버블 위에 마우스를 올리면 상세 정보가 표시됩니다)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.robotName} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-300 truncate">{item.robotName}</span>
              <span className="text-xs text-slate-500 flex-shrink-0">({item.z})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
