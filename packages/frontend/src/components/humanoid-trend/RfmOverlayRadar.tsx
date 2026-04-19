'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { getDistinctColorsV2, CHART_AXIS_V2 } from './color-utils';
import type { RfmScoreWithRobot } from '@/types/humanoid-trend';

const AXES = [
  { key: 'architectureScore', label: '모델 아키텍처 & 학습 역량' },
  { key: 'dataScore', label: '데이터 / 실세계 테스트' },
  { key: 'inferenceScore', label: '엣지 추론 & 하드웨어' },
  { key: 'openSourceScore', label: '오픈소스 · 생태계' },
  { key: 'maturityScore', label: '상용성 & 설명 가능성' },
] as const;

interface Props { data: RfmScoreWithRobot[]; }

export default function RfmOverlayRadar({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
        비교를 위해 최소 2개 이상의 RFM 데이터가 필요합니다.
      </div>
    );
  }

  const limited = data.slice(0, 8);
  const colors = getDistinctColorsV2(limited.length);

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
            <PolarGrid stroke={CHART_AXIS_V2.grid} />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: CHART_AXIS_V2.tick }} tickCount={6} />
            {limited.map((s, i) => (
              <Radar
                key={s.id}
                name={`${s.robotName} (${s.rfmModelName})`}
                dataKey={s.id}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.08}
                strokeWidth={1.75}
              />
            ))}
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D9DDE4',
                borderRadius: 0,
                fontSize: '12px',
                color: '#0B1E3A',
                boxShadow: '0 2px 6px rgba(11, 30, 58, 0.08)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#5A6475' }}
              iconSize={10}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
