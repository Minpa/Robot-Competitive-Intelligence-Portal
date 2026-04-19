'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { CHART_AXIS_V2 } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

// Muted country palette aligned with v2 tokens
const COUNTRY_COLORS_V2: Record<string, string> = {
  US: '#1F4A7A', // info
  CN: '#B0452A', // neg
  KR: '#B8892B', // gold
  EU: '#2F7D5A', // pos
  JP: '#15325B', // brand soft
};
const COUNTRY_FALLBACK = '#5A6475';

function resolveCountryColor(code: string): string {
  return COUNTRY_COLORS_V2[code.toUpperCase()] ?? COUNTRY_FALLBACK;
}

const COUNTRY_LEGEND = [
  { value: 'US', color: COUNTRY_COLORS_V2.US },
  { value: 'CN', color: COUNTRY_COLORS_V2.CN },
  { value: 'KR', color: COUNTRY_COLORS_V2.KR },
  { value: 'EU', color: COUNTRY_COLORS_V2.EU },
  { value: 'JP', color: COUNTRY_COLORS_V2.JP },
  { value: 'Other', color: COUNTRY_FALLBACK },
];

const AngledTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={8}
        textAnchor="end"
        fill={CHART_AXIS_V2.tick}
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
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
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
    return {
      x: xIndex,
      y: rawTops > 0 ? Math.log10(rawTops) : 0,
      yRaw: rawTops,
      z: d.bubbleSize,
      robotName: d.robotName || d.label,
      colorGroup: d.colorGroup || 'Other',
      mainSoc: soc,
      color: resolveCountryColor(d.colorGroup || ''),
    };
  });

  const maxTops = Math.max(...chartData.map((d) => d.yRaw));
  const topsTicks = [1, 10, 50, 100, 200, 500, 1000, 2000, 5000].filter((t) => t <= maxTops * 1.5);
  const yTicks = topsTicks.map((t) => Math.log10(t));
  const yDomain = [0, Math.log10(Math.max(maxTops, 100) * 2)];

  const legendItems = [...chartData].sort((a, b) => a.robotName.localeCompare(b.robotName));

  return (
    <div className="space-y-4">
      <div className="h-[520px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 80, left: 60 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={CHART_AXIS_V2.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0.5, socNames.length + 0.5]}
              ticks={socNames.map((_, i) => i + 1)}
              tickFormatter={(v: number) => socNames[v - 1] ?? ''}
              tick={<AngledTick />}
              interval={0}
              height={70}
              stroke={CHART_AXIS_V2.stroke}
            >
              <Label value="SoC 칩셋" position="bottom" offset={55} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
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
              tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }}
              width={55}
              stroke={CHART_AXIS_V2.stroke}
            >
              <Label value="TOPS (로그 스케일)" angle={-90} position="insideLeft" offset={15} style={{ fontSize: 11, fill: CHART_AXIS_V2.label, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
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
                    <p className="font-mono">SoC: {d.mainSoc}</p>
                    <p className="font-mono">TOPS: {d.yRaw.toLocaleString()}</p>
                    <p className="font-mono">적용 사례: {d.z}건</p>
                    <p className="font-mono text-ink-400 text-[10px] uppercase tracking-wide mt-1">국가: {d.colorGroup}</p>
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

      {/* Country color legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {COUNTRY_LEGEND.map((c) => (
          <div key={c.value} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: c.color }} />
            <span className="font-mono text-[10px] text-ink-600 uppercase tracking-[0.16em]">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Robot legend */}
      <div className="border border-ink-200 bg-paper px-4 py-3">
        <p className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.18em] mb-2">
          범례 (버블 크기 = 적용 사례 수)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.robotName} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11.5px] text-ink-700 truncate">{item.robotName}</span>
              <span className="font-mono text-[10px] text-ink-400 flex-shrink-0">{item.yRaw.toLocaleString()}T</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
