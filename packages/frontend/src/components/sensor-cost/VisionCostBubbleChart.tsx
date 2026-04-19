'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
  ReferenceLine,
} from 'recharts';

// ── 색상 정의 ──
const COMPANY_COLORS: Record<string, string> = {
  'Tesla': '#ef4444',         // red
  'Boston Dynamics': '#3b82f6', // blue
  'Figure AI': '#a855f7',     // purple
};

function getColor(companyName: string) {
  return COMPANY_COLORS[companyName] ?? '#a1a1aa';
}

export interface BubblePoint {
  id: string;
  label: string;
  companyName: string;
  year: number;
  totalCostUsd: number;
  performanceLevel: number;
  performanceNote?: string;
  isForecast: boolean;
  reliabilityGrade: string;
}

interface Props {
  data: BubblePoint[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as BubblePoint;
  if (!d) return null;
  return (
    <div className="bg-paper border border-ink-200 rounded-lg p-3 text-xs shadow-xl max-w-[220px]">
      <div className="font-bold text-ink-900 mb-1">{d.label}</div>
      <div className="text-ink-500 mb-2">{d.companyName}</div>
      <div className="space-y-1 text-ink-700">
        <div className="flex justify-between gap-3">
          <span>연도</span><span className="font-semibold">{d.year}{d.isForecast ? ' (전망)' : ''}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>추정 원가</span><span className="font-semibold text-green-400">${d.totalCostUsd.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>성능 레벨</span><span className="font-semibold text-blue-400">P{d.performanceLevel}</span>
        </div>
        {d.performanceNote && (
          <div className="text-ink-500 pt-1 border-t border-ink-200">{d.performanceNote}</div>
        )}
        <div className="text-ink-500 text-[10px]">신뢰도: [{d.reliabilityGrade}]</div>
      </div>
    </div>
  );
}

// 성능 레벨 레이블 매핑
const PERF_LABELS: Record<string, string> = {
  '1': 'P1: 기본 인식',
  '2': 'P2: 환경 이해',
  '3': 'P3: 객체 조작',
  '3.5': 'P3.5: 실시간 준비',
  '4': 'P4: 실시간 VLA',
  '5': 'P5: FM 인지 통합',
};

export default function VisionCostBubbleChart({ data }: Props) {
  // 회사별로 분리
  const companies = ['Tesla', 'Boston Dynamics', 'Figure AI'];

  // 점 크기: 성능 레벨 × 비례
  const chartData = data.map((d) => ({
    ...d,
    x: d.year,
    y: d.totalCostUsd,
    z: d.performanceLevel * 60 + 60,  // 120~360
  }));

  const byCompany = (name: string) => chartData.filter((d) => d.companyName === name);

  return (
    <div className="w-full">
      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-4 mb-4 px-2">
        {companies.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(c) }} />
            <span className="text-sm text-ink-700">{c}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-ink-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full border-2 border-ink-200 border-dashed bg-transparent" />
            <span>전망</span>
          </div>
          <span>원 크기 = 성능 레벨 (P1~P5)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 60, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(51 65 85)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[2021.5, 2028.5]}
            tickCount={8}
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickFormatter={(v) => String(v)}
          >
            <Label value="연도" offset={-10} position="insideBottom" fill="#a1a1aa" fontSize={12} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 2100]}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            width={80}
          >
            <Label value="추정 원가 ($)" angle={-90} position="insideLeft" offset={10} fill="#a1a1aa" fontSize={12} />
          </YAxis>
          <ZAxis type="number" dataKey="z" range={[60, 360]} />
          <Tooltip content={<CustomTooltip />} />

          {/* 성능 레벨 기준선 (가로 점선) */}
          {[340, 650, 1000, 1450].map((y) => (
            <ReferenceLine key={y} y={y} stroke="rgb(71 85 105)" strokeDasharray="4 4" />
          ))}

          {companies.map((company) => {
            const pts = byCompany(company);
            const color = getColor(company);
            return (
              <Scatter key={company} data={pts} name={company}>
                {pts.map((pt, i) => (
                  <Cell
                    key={i}
                    fill={pt.isForecast ? 'transparent' : color}
                    fillOpacity={pt.isForecast ? 0 : 0.85}
                    stroke={color}
                    strokeWidth={pt.isForecast ? 2 : 1}
                    strokeDasharray={pt.isForecast ? '5 3' : undefined}
                  />
                ))}
              </Scatter>
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>

      {/* 성능 레벨 설명 */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {Object.entries(PERF_LABELS).map(([level, desc]) => (
          <div key={level} className="flex items-start gap-2 bg-ink-100 rounded px-2 py-1.5">
            <span className="text-blue-400 font-bold shrink-0">P{level}</span>
            <span className="text-ink-500">{desc.split(': ')[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
