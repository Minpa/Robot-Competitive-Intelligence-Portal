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
} from 'recharts';
import type { Partner } from '@/types/war-room';

interface Props {
  partners: Partner[];
  isLoading: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function CompetitivenessMatrix({ partners, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <div className="h-5 w-32 bg-ink-100 rounded animate-pulse mb-4" />
        <div className="h-64 bg-ink-100 rounded animate-pulse" />
      </div>
    );
  }

  const data = partners
    .filter((p) => p.techCapability != null && p.lgCompatibility != null)
    .map((p) => ({
      name: p.name,
      x: p.techCapability!,
      y: p.lgCompatibility!,
      z: p.marketShare ?? 5,
    }));

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">경쟁력 매트릭스</h3>
      {data.length === 0 ? (
        <p className="text-xs text-ink-500 text-center py-8">데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
            <XAxis
              type="number"
              dataKey="x"
              name="기술력"
              domain={[0, 10]}
              tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
              label={{ value: '기술력', position: 'bottom', fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="LG 호환성"
              domain={[0, 10]}
              tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
              label={{ value: 'LG 호환성', angle: -90, position: 'insideLeft', fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgb(var(--color-slate-800))', border: '1px solid rgb(var(--color-slate-700))', borderRadius: 8 }}
              labelStyle={{ color: 'rgb(var(--color-slate-200))' }}
              formatter={(value: any, name: any) => [value, name === 'x' ? '기술력' : name === 'y' ? 'LG 호환성' : '점유율']}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name ?? ''}
            />
            <Scatter data={data}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
