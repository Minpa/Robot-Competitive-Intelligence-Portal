'use client';

import { useRef, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label, LabelList,
} from 'recharts';
import { getRobotColor } from './color-utils';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

const LABEL_H = 14;
const MIN_GAP = 4;

export default function PocBubbleChart({ data }: Props) {
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
    displayLabel: `${d.robotName || d.label} (DoF:${d.bubbleSize})`,
    robotName: d.robotName || d.label,
    metadata: d.metadata,
    color: d.robotId ? getRobotColor(d.robotId) : '#8B5CF6',
  }));

  return (
    <div className="h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 40, bottom: 30, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: '#CBD5E1' }}>
            <Label value="폼팩터 / 인체 유사도 (Form Factor)" position="bottom" offset={10} style={{ fontSize: 12, fill: '#94A3B8' }} />
          </XAxis>
          <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: '#CBD5E1' }}>
            <Label value="산업 적합성 (Industry Fit)" angle={-90} position="insideLeft" offset={-10} style={{ fontSize: 12, fill: '#94A3B8' }} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[100, 800]} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs text-gray-200 shadow-lg">
                  <p className="font-semibold text-white">{d.robotName}</p>
                  <p>폼팩터: {d.x}</p>
                  <p>산업 적합성: {d.y.toFixed(1)}</p>
                  <p>핑거 DoF 점수: {d.z}</p>
                </div>
              );
            }}
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
