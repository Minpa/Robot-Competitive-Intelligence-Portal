'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getRobotColor } from './color-utils';
import type { PocScoreWithRobot } from '@/types/humanoid-trend';

const AXES = [
  { key: 'payloadScore', label: '페이로드' },
  { key: 'operationTimeScore', label: '운용시간' },
  { key: 'fingerDofScore', label: '핑거 DoF' },
  { key: 'formFactorScore', label: '폼팩터' },
  { key: 'pocDeploymentScore', label: 'PoC 배포' },
  { key: 'costEfficiencyScore', label: '가성비' },
] as const;

interface PocRadarSectionProps {
  data: PocScoreWithRobot[];
}

function buildRadarData(score: PocScoreWithRobot) {
  return AXES.map((axis) => ({
    axis: axis.label,
    value: score[axis.key],
  }));
}

function PlaceholderCard({ robotName, companyName }: { robotName?: string; companyName?: string }) {
  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-6 flex flex-col items-center justify-center min-h-[320px]">
      {robotName && (
        <p className="text-sm font-medium text-argos-inkSoft mb-2">
          {robotName} {companyName && <span className="text-argos-muted">({companyName})</span>}
        </p>
      )}
      <p className="text-argos-muted text-sm">PoC 평가 데이터 미등록</p>
    </div>
  );
}

function RobotRadarCard({ score }: { score: PocScoreWithRobot }) {
  const color = getRobotColor(score.robotId);
  const radarData = buildRadarData(score);
  const avg = score.averageScore.toFixed(1);

  const hasData = AXES.some((axis) => score[axis.key] > 0);
  if (!hasData) {
    return <PlaceholderCard robotName={score.robotName} companyName={score.companyName} />;
  }

  return (
    <div className="rounded-xl border border-argos-border bg-argos-surface p-4">
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-argos-ink">
          {score.robotName}
        </p>
        <p className="text-xs text-argos-muted">
          {score.companyName} · 평균 {avg}
        </p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#E5E9F0" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: '#6B7A90' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{ fontSize: 9, fill: '#6B7A90' }}
              tickCount={6}
            />
            <Radar
              name={score.robotName}
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E9F0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1E2838',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function PocRadarSection({ data }: PocRadarSectionProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-argos-muted text-sm">
        PoC 평가 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.map((score) => (
        <RobotRadarCard key={score.id} score={score} />
      ))}
    </div>
  );
}
