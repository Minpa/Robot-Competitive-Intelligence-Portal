'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getRobotColorV2, CHART_AXIS_V2 } from './color-utils';
import type { BarSpecData } from '@/types/humanoid-trend';

interface Props { data: BarSpecData[]; }

const CHARTS = [
  { key: 'payloadKg' as const, title: '페이로드', unit: 'kg' },
  { key: 'operationTimeHours' as const, title: '연속 운용시간', unit: 'h' },
  { key: 'handDof' as const, title: '핸드 핑거 DoF', unit: '' },
  { key: 'pocDeploymentScore' as const, title: '산업 PoC 배포 성숙도', unit: '/10' },
] as const;

function SingleBarChart({ data, chartKey, title, unit }: {
  data: BarSpecData[]; chartKey: keyof BarSpecData; title: string; unit: string;
}) {
  const filtered = data.filter((d) => d[chartKey] != null);
  if (filtered.length === 0) return null;

  const chartData = filtered.map((d) => ({
    name: d.robotName,
    value: Number(d[chartKey]),
    company: d.companyName,
    color: getRobotColorV2(d.robotId),
  }));

  return (
    <div className="border border-ink-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-ink-100">
        <h4 className="font-serif text-[14px] font-semibold text-ink-900">{title}</h4>
        {unit && (
          <span className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.18em]">
            {unit}
          </span>
        )}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={CHART_AXIS_V2.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_AXIS_V2.tick }} angle={-25} textAnchor="end" height={55} stroke={CHART_AXIS_V2.stroke} />
            <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_V2.tick }} stroke={CHART_AXIS_V2.stroke} />
            <Tooltip
              cursor={{ fill: CHART_AXIS_V2.grid, fillOpacity: 0.4 }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-ink-200 p-2.5 text-[11px] text-ink-700 shadow-sm">
                    <p className="font-serif font-semibold text-ink-900">{d.name}</p>
                    <p className="font-mono text-[10px] text-ink-500 uppercase tracking-wide">{d.company}</p>
                    <p className="font-mono mt-1">{d.value}{unit}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value">
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SpecBarCharts({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
        비교를 위해 최소 2개 이상의 로봇 데이터가 필요합니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CHARTS.map((c) => (
        <SingleBarChart key={c.key} data={data} chartKey={c.key} title={c.title} unit={c.unit} />
      ))}
    </div>
  );
}
