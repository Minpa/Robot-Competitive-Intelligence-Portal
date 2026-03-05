'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  Legend,
} from 'recharts';
import type { WhatIfResult } from '@/lib/war-room-calculator';

interface Props {
  before: WhatIfResult | null;
  after: WhatIfResult;
  robotName: string;
}

export function BeforeAfterBubble({ before, after, robotName }: Props) {
  const beforeData = before
    ? [{ name: `${robotName} (Before)`, x: before.pocTotal, y: before.rfmTotal, z: before.combinedScore }]
    : [];
  const afterData = [
    { name: `${robotName} (After)`, x: after.pocTotal, y: after.rfmTotal, z: after.combinedScore },
  ];

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">포지셔닝 시프트</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="x"
            name="PoC Total"
            domain={[0, 60]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: 'PoC Total', position: 'bottom', fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="RFM Total"
            domain={[0, 30]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: 'RFM Total', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[100, 400]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: any, name: any) => [value, name]}
            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name ?? ''}
          />
          {beforeData.length > 0 && (
            <Scatter name="Before" data={beforeData}>
              <Cell fill="#64748b" fillOpacity={0.6} />
            </Scatter>
          )}
          <Scatter name="After" data={afterData}>
            <Cell fill="#3b82f6" fillOpacity={0.8} />
          </Scatter>
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
