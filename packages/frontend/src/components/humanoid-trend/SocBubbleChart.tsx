'use client';

import { useRef, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label, Legend, LabelList,
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

const LABEL_H = 14;
const MIN_GAP = 4;

export default function SocBubbleChart({ data }: Props) {
  const placedRef = useRef<Array<{ x: number; y: number; w: number }>>([]);
  placedRef.current = [];

  const renderLabel = useCallback((props: any) => {
    const { x, y, value } = props;
    if (x == null || y == null || !value) return null;

    const labelW = value.length * 5;
    const candidates = [
      { dy: -18, dx: 0, anchor: 'middle' },
      { dy: 24, dx: 0, anchor: 'middle' },
      { dy: -12, dx: 10, anchor: 'start' },
      { dy: -12, dx: -10, anchor: 'end' },
      { dy: 22, dx: 10, anchor: 'start' },
      { dy: 22, dx: -10, anchor: 'end' },
      { dy: 2, dx: 24, anchor: 'start' },
      { dy: 2, dx: -24, anchor: 'end' },
    ];

    let best = candidates[0];
    let bestOverlap = Infinity;
    for (const c of candidates) {
      const lx = x + c.dx;
      const ly = y + c.dy;
      let overlap = 0;
      for (const p of placedRef.current) {
        const xOv = Math.max(0, Math.min(lx + labelW / 2, p.x + p.w / 2) - Math.max(lx - labelW / 2, p.x - p.w / 2));
        const yOv = Math.max(0, (LABEL_H + MIN_GAP) - Math.abs(ly - p.y));
        overlap += xOv * yOv;
      }
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        best = c;
        if (overlap === 0) break;
      }
    }

    placedRef.current.push({ x: x + best.dx, y: y + best.dy, w: labelW });

    return (
      <text x={x + best.dx} y={y + best.dy} textAnchor={best.anchor} fontSize={9} fill="#E2E8F0" fontWeight={500}>
        {value}
      </text>
    );
  }, []);

export default function SocBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-sm">
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
    return {
      x: xIndex,
      y: d.yValue,
      z: d.bubbleSize,
      displayLabel: `${d.robotName || d.label} (${d.bubbleSize}건)`,
      robotName: d.robotName || d.label,
      colorGroup: d.colorGroup || 'Other',
      mainSoc: soc,
      metadata: d.metadata,
      color: getCountryColor(d.colorGroup || ''),
    };
  });

  return (
    <div className="h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 40, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0.5, socNames.length + 0.5]}
            ticks={socNames.map((_, i) => i + 1)}
            tickFormatter={(v: number) => socNames[v - 1] ?? ''}
            tick={{ fontSize: 10, fill: '#CBD5E1' }}
            interval={0}
          >
            <Label value="SoC 칩셋" position="bottom" offset={20} style={{ fontSize: 12, fill: '#94A3B8' }} />
          </XAxis>
          <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#CBD5E1' }}>
            <Label value="TOPS" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 12, fill: '#94A3B8' }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[100, 800]} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-gray-200 shadow-lg">
                  <p className="font-semibold text-white">{d.robotName}</p>
                  <p>SoC: {d.mainSoc}</p>
                  <p>TOPS: {d.y}</p>
                  <p>적용 사례: {d.z}건</p>
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
              <Cell key={i} fill={d.color} fillOpacity={0.8} />
            ))}
            <LabelList dataKey="displayLabel" content={renderLabel} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
