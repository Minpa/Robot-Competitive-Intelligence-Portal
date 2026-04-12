'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { getDistinctColors } from './color-utils';
import type { RfmScoreWithRobot } from '@/types/humanoid-trend';

// NOTE: 이 차트는 'RFM 비교 표'의 항목과 일치하도록 아래 5개 영역만 표시합니다.
// - 모델 아키텍처 & 학습 역량  => architectureScore
// - 데이터/실세계 테스트     => dataScore
// - 엣지 추론 & 하드웨어      => inferenceScore
// - 오픈소스·생태계          => openSourceScore
// - 상용성 & 설명 가능성     => maturityScore

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
      <div className="flex items-center justify-center min-h-[300px] text-argos-muted text-sm">
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
            <PolarGrid stroke="#E5E9F0" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#6B7A90' }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: '#6B7A90' }} tickCount={6} />
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
              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E9F0', borderRadius: '8px', fontSize: '12px', color: '#1E2838' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#6B7A90' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
