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
import { getRobotColorV2, CHART_AXIS_V2 } from './color-utils';
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
    <div className="border border-ink-200 bg-paper p-6 flex flex-col items-center justify-center min-h-[320px]">
      {robotName && (
        <p className="font-serif text-[14px] font-semibold text-ink-900 mb-1">
          {robotName}
        </p>
      )}
      {companyName && (
        <p className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.18em] mb-3">
          {companyName}
        </p>
      )}
      <p className="text-ink-400 text-[12px]">PoC 평가 데이터 미등록</p>
    </div>
  );
}

function RobotRadarCard({ score }: { score: PocScoreWithRobot }) {
  const color = getRobotColorV2(score.robotId);
  const radarData = buildRadarData(score);
  const avg = score.averageScore.toFixed(1);

  const hasData = AXES.some((axis) => score[axis.key] > 0);
  if (!hasData) {
    return <PlaceholderCard robotName={score.robotName} companyName={score.companyName} />;
  }

  return (
    <div className="border border-ink-200 bg-white p-4">
      <div className="pb-3 mb-2 border-b border-ink-100">
        <p className="font-serif text-[14px] font-semibold text-ink-900 leading-tight">
          {score.robotName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.16em]">
            {score.companyName}
          </span>
          <span className="font-mono text-[11px] text-gold tracking-wide">
            AVG {avg}
          </span>
        </div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
            <PolarGrid stroke={CHART_AXIS_V2.grid} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 10, fill: CHART_AXIS_V2.tick }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{ fontSize: 9, fill: CHART_AXIS_V2.tick }}
              tickCount={6}
            />
            <Radar
              name={score.robotName}
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={1.75}
            />
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
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function PocRadarSection({ data }: PocRadarSectionProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-ink-400 text-[12px]">
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
