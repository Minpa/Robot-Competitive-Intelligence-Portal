'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { getRobotColorV2, CHART_AXIS_V2 } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

export default function PocBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
        포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    x: d.xValue,
    y: d.yValue,
    z: d.bubbleSize,
    robotName: d.robotName || d.label,
    metadata: d.metadata,
    color: d.robotId ? getRobotColorV2(d.robotId) : '#1F4A7A',
  }));

  const legendItems = [...chartData].sort((a, b) => a.robotName.localeCompare(b.robotName));

  return (
    <div className="space-y-4">
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={CHART_AXIS_V2.grid} />
            <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} stroke={CHART_AXIS_V2.stroke}>
              <Label value="폼팩터 / 인체 유사도 (Form Factor)" position="bottom" offset={20} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
            </XAxis>
            <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} width={40} stroke={CHART_AXIS_V2.stroke}>
              <Label value="산업 적합성 (Industry Fit)" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: CHART_AXIS_V2.stroke }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-ink-200 p-3 text-[11px] text-ink-700 shadow-sm">
                    <p className="font-serif font-semibold text-ink-900 mb-1.5 text-[13px]">{d.robotName}</p>
                    <p className="font-mono">폼팩터: {d.x}</p>
                    <p className="font-mono">산업 적합성: {d.y.toFixed(1)}</p>
                    <p className="font-mono">핑거 DoF: {d.z}</p>
                  </div>
                );
              }}
            />
            <Scatter data={chartData}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.75} stroke={d.color} strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="border border-ink-200 bg-paper px-4 py-3">
        <p className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.18em] mb-2">
          범례 (버블 크기 = 핑거 DoF)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.robotName} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11.5px] text-ink-700 truncate">{item.robotName}</span>
              <span className="font-mono text-[10px] text-ink-400 flex-shrink-0">{item.z}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
