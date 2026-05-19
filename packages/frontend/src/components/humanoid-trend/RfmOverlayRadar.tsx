'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { getDistinctColorsV2, CHART_AXIS_V2 } from './color-utils';
import type { RfmCompanyRadar, RfmRadarFactorKey } from '@/types/humanoid-trend';

const AXES: { key: RfmRadarFactorKey; label: string }[] = [
  { key: 'generality', label: '범용성' },
  { key: 'realWorldData', label: '실세계 데이터·테스트' },
  { key: 'edgeInference', label: '엣지 추론 & HW' },
  { key: 'multiRobotCollab', label: '멀티로봇 협업' },
  { key: 'openSource', label: '오픈소스 · 생태계' },
  { key: 'commercialMaturity', label: '상용성' },
];

interface Props { data: RfmCompanyRadar[]; }

interface AxisRow {
  axis: string;
  [companyKey: string]: string | number;
}

function RfmTooltip({ active, payload, label }: {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; color: string; payload: AxisRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-ink-200 px-3 py-2 text-[12px] text-ink-900 shadow-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p) => {
        const row = p.payload;
        const raw = row[`${p.dataKey}__raw`];
        const name = row[`${p.dataKey}__name`];
        return (
          <div key={p.dataKey} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: p.color }} />
            <span>{name}</span>
            <span className="text-ink-500">
              · 백분위 {row[p.dataKey]} · 평균 {raw}/5
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function RfmOverlayRadar({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-ink-400 text-[12px]">
        경쟁사 비교를 위해 최소 2개 이상의 RFM 데이터가 필요합니다.
      </div>
    );
  }

  const limited = data.slice(0, 8);
  const colors = getDistinctColorsV2(limited.length);

  const chartData: AxisRow[] = AXES.map((axis) => {
    const row: AxisRow = { axis: axis.label };
    limited.forEach((c) => {
      row[c.companyId] = c.percentile[axis.key];
      row[`${c.companyId}__raw`] = c.raw[axis.key];
      row[`${c.companyId}__name`] = c.companyName;
    });
    return row;
  });

  return (
    <div>
      <p className="mb-3 text-[12px] text-ink-500">
        LG를 제외한 경쟁사만 비교합니다. 축 값은 코호트 내 <strong>백분위(0–100)</strong>로,
        절대 점수가 비슷해도 상대 우위가 드러나도록 정규화했습니다. 마우스를 올리면 원본 평균 점수가 표시됩니다.
      </p>
      <div className="h-[480px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
            <PolarGrid stroke={CHART_AXIS_V2.grid} />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHART_AXIS_V2.tick }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: CHART_AXIS_V2.tick }}
              tickCount={6}
            />
            {limited.map((c, i) => (
              <Radar
                key={c.companyId}
                name={c.companyName}
                dataKey={c.companyId}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.08}
                strokeWidth={1.75}
              />
            ))}
            <Tooltip content={<RfmTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#5A6475' }} iconSize={10} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
