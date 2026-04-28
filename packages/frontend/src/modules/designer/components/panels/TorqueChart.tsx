'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { JointTorqueResult } from '../../types/robot';

interface TorqueChartProps {
  torques: JointTorqueResult[];
  /** Joints exceeding this Nm value are colored red. */
  warningThresholdNm?: number;
}

const SEGMENT_COLOR: Record<string, string> = {
  arm: '#5BC0EB',
  leg: '#7CCBA2',
  spine: '#B8892B',
  arm_base: '#F2A93B',
  wheel: '#9CA3AF',
  other: '#6B7280',
};

export function TorqueChart({ torques, warningThresholdNm }: TorqueChartProps) {
  if (torques.length === 0) {
    return (
      <p className="text-[11px] text-white/40 leading-relaxed">
        평가 결과가 없습니다 — 폼팩터를 선택하면 표시됩니다.
      </p>
    );
  }

  const data = torques
    .map((t) => ({
      jointId: t.jointId,
      torque: t.requiredPeakTorqueNm,
      segment: t.segment,
      lever: t.leverArmM,
    }))
    .sort((a, b) => b.torque - a.torque)
    .slice(0, 10); // top 10 for readability

  const maxTorque = Math.max(...data.map((d) => d.torque), warningThresholdNm ?? 0);

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            domain={[0, Math.ceil(maxTorque * 1.1)]}
            stroke="#374151"
          />
          <YAxis
            dataKey="jointId"
            type="category"
            tick={{ fontSize: 9, fill: '#D1D5DB' }}
            width={92}
            stroke="#374151"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 11,
            }}
            labelStyle={{ color: '#E5E7EB' }}
            formatter={(v: number, _name, item) => [
              `${v.toFixed(1)} Nm (lever ${(item.payload as { lever: number }).lever.toFixed(2)}m)`,
              'required peak',
            ]}
          />
          <Bar dataKey="torque" radius={[0, 2, 2, 0]}>
            {data.map((d, i) => {
              const exceeded = warningThresholdNm !== undefined && d.torque > warningThresholdNm;
              const color = exceeded ? '#E63950' : SEGMENT_COLOR[d.segment] ?? '#B8892B';
              return <Cell key={i} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
