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
import { useWarRoomInvestmentPriority } from '@/hooks/useWarRoom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface PriorityItem {
  area: string;
  impact: number;
  feasibility: number;
  urgency: number;
}

export function InvestmentPriorityMatrix() {
  const { data, isLoading } = useWarRoomInvestmentPriority();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
        <div className="h-5 w-40 bg-slate-700 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-800/50 rounded animate-pulse" />
      </div>
    );
  }

  const items: PriorityItem[] = data?.priorities ?? [];
  const chartData = items.map((item) => ({
    name: item.area,
    x: item.impact,
    y: item.feasibility,
    z: item.urgency,
  }));

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">투자 우선순위 매트릭스</h3>
      {chartData.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
            <XAxis type="number" dataKey="x" domain={[0, 10]} tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}>
              <Label value="Impact" position="bottom" offset={5} fill="rgb(var(--color-slate-400))" fontSize={11} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 10]} tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}>
              <Label value="Feasibility" angle={-90} position="insideLeft" fill="rgb(var(--color-slate-400))" fontSize={11} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[40, 300]} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgb(var(--color-slate-800))', border: '1px solid rgb(var(--color-slate-700))', borderRadius: 8 }}
              formatter={(value: any, name: any) => {
                if (name === 'x') return [value, 'Impact'];
                if (name === 'y') return [value, 'Feasibility'];
                return [value, 'Urgency'];
              }}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name ?? ''}
            />
            <Scatter data={chartData}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
