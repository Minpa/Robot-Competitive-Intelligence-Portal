'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { WhatIfResult } from '@/lib/war-room-calculator';

interface Props {
  before: WhatIfResult | null;
  after: WhatIfResult;
}

const POC_LABELS: Record<string, string> = {
  payloadScore: '페이로드',
  operationTimeScore: '운용시간',
  fingerDofScore: '핸드DoF',
  formFactorScore: '폼팩터',
  pocDeploymentScore: 'PoC배포',
  costEfficiencyScore: '비용효율',
};

export function BeforeAfterRadar({ before, after }: Props) {
  const keys = Object.keys(POC_LABELS);
  const data = keys.map((k) => ({
    factor: POC_LABELS[k],
    before: before?.pocScores[k] ?? 0,
    after: after.pocScores[k],
  }));

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">PoC Before vs After</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="factor" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fill: '#71717a', fontSize: 9 }} />
          {before && (
            <Radar
              name="Before"
              dataKey="before"
              stroke="#71717a"
              fill="#71717a"
              fillOpacity={0.15}
              strokeDasharray="4 4"
            />
          )}
          <Radar
            name="After"
            dataKey="after"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
