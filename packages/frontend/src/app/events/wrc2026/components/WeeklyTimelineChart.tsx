'use client';

/**
 * WeeklyTimelineChart (B-4) — 주간 업로드 추이 (recharts AreaChart, 단일 hue)
 * X축은 'M/D' 포맷, Y축은 정수만, 피크 주 1곳에만 직접 라벨을 표시한다.
 * 데이터 포인트가 1개 이하면 미표시. (개최 주 ReferenceLine은 이번 스코프에서 구현하지 않음)
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Panel } from '@/components/ui';
import { CHART_HUE } from './chartColors';

interface Props {
  weeklyUploads: { weekStart: string; count: number }[];
}

function formatMD(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function WeeklyTimelineChart({ weeklyUploads }: Props) {
  if (weeklyUploads.length <= 1) return null;

  const peak = weeklyUploads.reduce((max, w) => (w.count > max.count ? w : max), weeklyUploads[0]);

  const renderPeakLabel = (props: any) => {
    const { x, y, index } = props;
    const point = weeklyUploads[index];
    if (!point || point.weekStart !== peak.weekStart || point.count === 0) return <g key={`peak-${index}`} />;
    return (
      <text key={`peak-${index}`} x={x} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1F2328">
        {point.count}건
      </text>
    );
  };

  return (
    <Panel kicker="Weekly Timeline" title="주간 업로드 추이">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyUploads} margin={{ top: 20, right: 16, bottom: 5, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECECEF" vertical={false} />
            <XAxis
              dataKey="weekStart"
              tickFormatter={formatMD}
              tick={{ fontSize: 11, fill: '#5C636E' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5C636E' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              formatter={(value: number) => [`${value}건`, '업로드']}
              labelFormatter={(label: string) => `${formatMD(label)} 주`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={CHART_HUE}
              strokeWidth={2}
              fill={CHART_HUE}
              fillOpacity={0.15}
              label={renderPeakLabel}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
