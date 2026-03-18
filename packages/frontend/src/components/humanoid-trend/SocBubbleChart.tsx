'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { getCountryColor } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

const COUNTRY_LEGEND = [
  { value: 'US', color: '#3B82F6' },
  { value: 'CN', color: '#F97316' },
  { value: 'KR', color: '#EC4899' },
  { value: 'EU', color: '#10B981' },
  { value: 'JP', color: '#8B5CF6' },
  { value: 'Other', color: '#94A3B8' },
];

// Custom angled tick for X axis (SoC names)
const AngledTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={8}
        textAnchor="end"
        fill="#CBD5E1"
        fontSize={10}
        transform="rotate(-35)"
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function SocBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-sm">
        포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다.
      </div>
    );
  }

  const socNames: string[] = [];
  for (const d of data) {
    const meta = d.metadata as Record<string, unknown> | null;
    const soc = (meta?.mainSoc as string) ?? 'Unknown';
    if (!socNames.includes(soc)) socNames.push(soc);
  }
  socNames.sort();

  const chartData = data.map((d) => {
    const meta = d.metadata as Record<string, unknown> | null;
    const soc = (meta?.mainSoc as string) ?? 'Unknown';
    const xIndex = socNames.indexOf(soc) + 1;
    const rawTops = d.yValue;
    // Log scale: use log10 for display, keep raw for tooltip
    return {
      x: xIndex,
      y: rawTops > 0 ? Math.log10(rawTops) : 0,
      yRaw: rawTops,
      z: d.bubbleSize,
      robotName: d.robotName || d.label,
      colorGroup: d.colorGroup || 'Other',
      mainSoc: soc,
      color: getCountryColor(d.colorGroup || ''),
    };
  });

  // Build Y-axis ticks at round TOPS values (log scale)
  const maxTops = Math.max(...chartData.map((d) => d.yRaw));
  const topsTicks = [1, 10, 50, 100, 200, 500, 1000, 2000, 5000].filter((t) => t <= maxTops * 1.5);
  const yTicks = topsTicks.map((t) => Math.log10(t));
  const yDomain = [0, Math.log10(Math.max(maxTops, 100) * 2)];

  // Sort legend alphabetically by robot name
  const legendItems = [...chartData].sort((a, b) => a.robotName.localeCompare(b.robotName));

  return (
    <div className="space-y-4">
      <div className="h-[520px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 80, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0.5, socNames.length + 0.5]}
              ticks={socNames.map((_, i) => i + 1)}
              tickFormatter={(v: number) => socNames[v - 1] ?? ''}
              tick={<AngledTick />}
              interval={0}
              height={70}
            >
              <Label value="SoC 칩셋" position="bottom" offset={55} style={{ fontSize: 12, fill: '#94A3B8' }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              ticks={yTicks}
              tickFormatter={(v: number) => {
                const t = Math.round(Math.pow(10, v));
                return t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}K` : String(t);
              }}
              tick={{ fontSize: 11, fill: '#CBD5E1' }}
              width={55}
            >
              <Label value="TOPS (로그 스케일)" angle={-90} position="insideLeft" offset={15} style={{ fontSize: 11, fill: '#94A3B8' }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-slate-300 shadow-lg">
                    <p className="font-semibold text-slate-200 mb-1">{d.robotName}</p>
                    <p>SoC: {d.mainSoc}</p>
                    <p>TOPS: {d.yRaw.toLocaleString()}</p>
                    <p>적용 사례: {d.z}건</p>
                    <p>국가: {d.colorGroup}</p>
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

      {/* Country color legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {COUNTRY_LEGEND.map((c) => (
          <div key={c.value} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-xs text-slate-300">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Robot legend */}
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
              <span className="text-xs text-slate-500 flex-shrink-0">({item.yRaw.toLocaleString()}T)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
