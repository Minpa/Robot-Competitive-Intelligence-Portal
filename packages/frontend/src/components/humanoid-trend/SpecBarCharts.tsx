'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getRobotColor } from './color-utils';
import type { BarSpecData } from '@/types/humanoid-trend';

interface Props { data: BarSpecData[]; }

const CHARTS = [
  { key: 'payloadKg' as const, title: '페이로드 (kg)', unit: 'kg' },
  { key: 'operationTimeHours' as const, title: '연속 운용시간 (h)', unit: 'h' },
  { key: 'handDof' as const, title: '핸드 핑거 DoF', unit: '' },
  { key: 'pocDeploymentScore' as const, title: '산업 PoC 배포 성숙도 (x/10)', unit: '/10' },
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
    color: getRobotColor(d.robotId),
  }));

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <h4 className="text-sm font-semibold text-argos-inkSoft mb-3">{title}</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A90' }} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7A90' }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-argos-surface border border-argos-border rounded-lg p-2 text-xs text-argos-inkSoft">
                    <p className="font-semibold">{d.name}</p>
                    <p>{d.company}</p>
                    <p>{d.value}{unit}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <rect key={i} fill={d.color} />
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
      <div className="flex items-center justify-center min-h-[300px] text-argos-muted text-sm">
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
