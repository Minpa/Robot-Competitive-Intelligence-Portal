'use client';

/**
 * CompanyBarChart (B-2) — 참여 기업 상위 8곳 가로 막대 (recharts BarChart layout="vertical")
 * 단일 hue(모든 막대 동일 fill, Cell은 선택 여부에 따른 fillOpacity 차등에만 사용).
 * 막대 클릭 시 기업 태그로 필터링(onSelect), topCompanies가 0건이면 미표시.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Panel } from '@/components/ui';
import { CHART_HUE } from './chartColors';
import type { TagSelection } from './TagCloud';

interface Props {
  companies: { name: string; count: number }[];
  onSelect: (tag: TagSelection) => void;
  selected: TagSelection | null;
}

export function CompanyBarChart({ companies, onSelect, selected }: Props) {
  const data = companies.slice(0, 8);
  if (data.length === 0) return null;

  return (
    <Panel kicker="Top Companies" title="참여 기업 (브리프 기준)">
      <div style={{ height: Math.max(180, data.length * 34 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 5, right: 28, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECECEF" horizontal={false} />
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11.5, fill: '#3A3F47' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(31, 74, 122, 0.06)' }}
              formatter={(value: number) => [`${value}건`, '건수']}
              labelStyle={{ color: '#1F2328', fontWeight: 600 }}
            />
            <Bar
              dataKey="count"
              barSize={18}
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry: any) => onSelect({ type: 'company', name: entry.name })}
            >
              {data.map((d) => {
                const isSelected = selected?.type === 'company' && selected.name === d.name;
                return (
                  <Cell key={d.name} fill={CHART_HUE} fillOpacity={selected ? (isSelected ? 1 : 0.85) : 1} />
                );
              })}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v: number) => `${v}건`}
                style={{ fill: '#3A3F47', fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
