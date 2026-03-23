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
  Label,
} from 'recharts';
import type { ApplicationDomain } from '@/types/war-room';

interface Props {
  domains: ApplicationDomain[];
  isLoading: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function OpportunityMatrix({ domains, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
        <div className="h-5 w-40 bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-72 bg-slate-800/50 rounded animate-pulse" />
      </div>
    );
  }

  const data = domains
    .filter((d) => d.lgReadiness != null && d.somBillionUsd != null)
    .map((d) => ({
      name: d.name,
      x: Number(d.lgReadiness!),
      y: Number(d.somBillionUsd!),
      z: Number(d.cagrPercent ?? 10),
    }));

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">사업화 기회 매트릭스</h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            >
              <Label value="LG 준비도" position="bottom" offset={5} fill="#a1a1aa" fontSize={11} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            >
              <Label value="SOM ($B)" angle={-90} position="insideLeft" fill="#a1a1aa" fontSize={11} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }}
              formatter={(value: any, name: any) => {
                if (name === 'x') return [Number(value).toFixed(2), 'LG 준비도'];
                if (name === 'y') return [`$${value}B`, 'SOM'];
                return [`${value}%`, 'CAGR'];
              }}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name ?? ''}
            />
            <Scatter data={data}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
