'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label,
} from 'recharts';
import type { PositioningDataWithRobot } from '@/types/humanoid-trend';

interface Props { data: PositioningDataWithRobot[]; }

// Distinct color palette for companies
const COMPANY_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#84CC16', '#E11D48', '#0EA5E9', '#D946EF', '#22C55E',
  '#FBBF24', '#A855F7', '#FB7185', '#2DD4BF', '#818CF8',
];

export default function RfmBubbleChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-argos-muted text-sm">
        포지셔닝 비교를 위해 최소 2개 이상의 기업 데이터가 필요합니다.
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    x: d.xValue,
    y: d.yValue,
    z: d.bubbleSize,
    companyName: d.label,
    robotCount: (d.metadata as Record<string, unknown>)?.robotCount as number | undefined,
    color: COMPANY_COLORS[i % COMPANY_COLORS.length],
  }));

  // Sort legend alphabetically
  const legendItems = [...chartData].sort((a, b) => a.companyName.localeCompare(b.companyName));

  return (
    <div className="space-y-4">
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
            <XAxis type="number" dataKey="x" domain={[0, 5]} tick={{ fontSize: 11, fill: '#1E2838' }}>
              <Label value="엣지 추론 역량 (Edge Inference)" position="bottom" offset={20} style={{ fontSize: 12, fill: '#6B7A90' }} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 5]} tick={{ fontSize: 11, fill: '#1E2838' }} width={40}>
              <Label value="범용성 (Generality)" angle={-90} position="insideLeft" offset={10} style={{ fontSize: 12, fill: '#6B7A90' }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-argos-surface border border-argos-border rounded-lg p-3 text-xs text-argos-inkSoft shadow-lg">
                    <p className="font-semibold text-argos-ink mb-1">{d.companyName}</p>
                    <p>엣지 추론 역량: {d.x}</p>
                    <p>범용성: {d.y}</p>
                    <p>상용 성숙도: {d.z}</p>
                    {d.robotCount && <p className="text-argos-muted mt-1">로봇 {d.robotCount}개 평균</p>}
                  </div>
                );
              }}
            />
            <Scatter data={chartData}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} stroke={d.color} strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="border border-argos-border rounded-lg p-3 bg-argos-bgAlt">
        <p className="text-xs text-argos-muted mb-2 font-medium">범례 — 기업별 RFM 역량 비교 (버블 크기 = 상용 성숙도)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.companyName} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-argos-inkSoft truncate">{item.companyName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
