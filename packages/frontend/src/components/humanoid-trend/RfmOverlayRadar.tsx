'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { getDistinctColors } from './color-utils';
import type { RfmScoreWithRobot } from '@/types/humanoid-trend';

const AXES = [
  { key: 'generalityScore', label: '범용성' },
  { key: 'realWorldDataScore', label: '실세계 데이터' },
  { key: 'edgeInferenceScore', label: '엣지 추론' },
  { key: 'multiRobotCollabScore', label: '멀티로봇 협업' },
  { key: 'openSourceScore', label: '오픈소스 개방성' },
  { key: 'commercialMaturityScore', label: '상용 성숙도' },
] as const;

interface Props { data: RfmScoreWithRobot[]; }

export default function RfmOverlayRadar({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-400 dark:text-gray-500 text-sm">
        비교를 위해 최소 2개 이상의 RFM 데이터가 필요합니다.
      </div>
    );
  }

  const limited = data.slice(0, 10);
  const colors = getDistinctColors(limited.length);

  // Build unified data: each axis row has a value per robot
  const chartData = AXES.map((axis) => {
    const row: Record<string, string | number> = { axis: axis.label };
    limited.forEach((s) => { row[s.id] = s[axis.key]; });
    return row;
  });

  return (
    <div>
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: '#6B7280' }} tickCount={6} />
            {limited.map((s, i) => (
              <Radar
                key={s.id}
                name={`${s.robotName} (${s.rfmModelName})`}
                dataKey={s.id}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#E2E8F0' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
