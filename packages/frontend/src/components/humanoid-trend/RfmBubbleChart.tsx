'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { CHART_AXIS_V2, CHART_COLORS_V2 } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

export default function RfmBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
        포지셔닝 비교를 위해 최소 2개 이상의 기업 데이터가 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    x: d.xValue,
    y: d.yValue,
    z: d.bubbleSize,
    companyName: d.label,
    robotCount: (d.metadata as Record<string, unknown>)?.robotCount as number | undefined,
    color: CHART_COLORS_V2[i % CHART_COLORS_V2.length],
  }));

  const legendItems = [...chartData].sort((a, b) => a.companyName.localeCompare(b.companyName));

  return (
    <div className="space-y-4">
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={CHART_AXIS_V2.grid} />
            <XAxis type="number" dataKey="x" domain={[0, 5]} tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} stroke={CHART_AXIS_V2.stroke}>
              <Label value="엣지 추론 역량 (Edge Inference)" position="bottom" offset={20} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 5]} tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} width={40} stroke={CHART_AXIS_V2.stroke}>
              <Label value="범용성 (Generality)" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: CHART_AXIS_V2.stroke }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-ink-200 p-3 text-[11px] text-ink-700 shadow-sm">
                    <p className="font-serif font-semibold text-ink-900 mb-1.5 text-[13px]">{d.companyName}</p>
                    <p className="font-mono">엣지 추론: {d.x}</p>
                    <p className="font-mono">범용성: {d.y}</p>
                    <p className="font-mono">상용 성숙도: {d.z}</p>
                    {d.robotCount && <p className="text-ink-400 mt-1 font-mono text-[10px] uppercase tracking-wide">로봇 {d.robotCount}개 평균</p>}
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
          범례 · 기업별 RFM 역량 (버블 크기 = 상용 성숙도)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.companyName} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11.5px] text-ink-700 truncate">{item.companyName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
