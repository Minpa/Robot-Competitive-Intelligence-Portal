'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  Legend,
  ReferenceLine,
  Label,
} from 'recharts';
import type { WhatIfResult } from '@/lib/war-room-calculator';
import type { CompetitiveOverlayResult } from '@/types/war-room';
import { ScoreInfoButton } from '../competitive/ScoreInfoModal';

interface Props {
  before: WhatIfResult | null;
  after: WhatIfResult;
  robotName: string;
  competitorData?: CompetitiveOverlayResult | null;
}

const COMPETITOR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

function sumScores(scores: Record<string, number>): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-2 text-xs shadow-lg">
      <p className="font-medium text-ink-900">{d.name}</p>
      <p className="mt-1 text-ink-700">PoC: {d.x.toFixed(1)}</p>
      <p className="text-ink-700">RFM: {d.y.toFixed(1)}</p>
      <p className="text-ink-700">종합: {(d.x + d.y).toFixed(1)}</p>
    </div>
  );
}

function BubbleChartInfo() {
  return (
    <ScoreInfoButton title="포지셔닝 시프트 차트 해석">
      <p className="text-ink-500">What-If 시뮬레이션 결과를 경쟁사 대비 포지션으로 시각화합니다.</p>

      <div className="rounded-lg bg-ink-100 p-3">
        <p className="font-medium text-ink-900 mb-1">축 설명</p>
        <div className="mt-1 space-y-1 text-xs">
          <p><span className="text-blue-400">X축 (PoC 합계)</span> — 하드웨어 역량 총점 (6팩터, 최대 60)</p>
          <p><span className="text-amber-400">Y축 (RFM 합계)</span> — 소프트웨어/시장 역량 총점 (6팩터, 최대 30)</p>
        </div>
      </div>

      <div className="rounded-lg bg-ink-100 p-3">
        <p className="font-medium text-ink-900 mb-2">사분면 해석</p>
        <div className="space-y-1.5 text-xs">
          <p><span className="text-emerald-400">우상단 (리더)</span> — HW + SW 모두 강한 종합 리더</p>
          <p><span className="text-blue-400">우하단 (HW 특화)</span> — 하드웨어는 강하나 SW/시장 역량 부족</p>
          <p><span className="text-amber-400">좌상단 (SW 특화)</span> — SW/시장은 강하나 하드웨어 역량 부족</p>
          <p><span className="text-ink-500">좌하단 (초기 단계)</span> — 양쪽 모두 개선 필요</p>
        </div>
      </div>

      <div className="rounded-lg bg-ink-100 p-3">
        <p className="font-medium text-ink-900 mb-1">점 설명</p>
        <div className="mt-1 space-y-1 text-xs">
          <p><span className="text-ink-500">● Before (회색)</span> — 현재 LG 로봇의 위치</p>
          <p><span className="text-blue-400">● After (파랑)</span> — What-If 적용 후 예상 위치</p>
          <p><span className="text-red-400">● 경쟁사 (색상)</span> — 주요 경쟁사의 현재 위치</p>
        </div>
      </div>

      <div className="rounded-lg bg-ink-100 p-3">
        <p className="font-medium text-ink-900 mb-1">비즈니스 활용</p>
        <p className="text-xs text-ink-500">스펙을 변경하며 LG 로봇이 경쟁사 대비 어느 위치로 이동하는지 시뮬레이션합니다. 목표는 우상단(리더 영역)으로 이동하는 것이며, 어떤 투자가 가장 효과적인지 판단하는 데 활용합니다.</p>
      </div>
    </ScoreInfoButton>
  );
}

export function BeforeAfterBubble({ before, after, robotName, competitorData }: Props) {
  // Build competitor data points
  const competitors = (competitorData?.top5Data ?? []).map((c) => ({
    name: c.robotName,
    x: sumScores(c.pocScores),
    y: sumScores(c.rfmScores),
    z: c.combinedScore,
  }));

  const beforeData = before
    ? [{ name: `${robotName} (현재)`, x: before.pocTotal, y: before.rfmTotal, z: before.combinedScore }]
    : [];
  const afterData = [
    { name: `${robotName} (시뮬레이션)`, x: after.pocTotal, y: after.rfmTotal, z: after.combinedScore },
  ];

  // Calculate axis domains based on all data
  const allX = [...competitors.map((c) => c.x), ...beforeData.map((d) => d.x), afterData[0].x];
  const allY = [...competitors.map((c) => c.y), ...beforeData.map((d) => d.y), afterData[0].y];
  const maxX = Math.max(Math.ceil(Math.max(...allX, 30) / 5) * 5 + 5, 45);
  const maxY = Math.max(Math.ceil(Math.max(...allY, 15) / 5) * 5 + 5, 30);
  const midX = maxX / 2;
  const midY = maxY / 2;

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-ink-900">포지셔닝 시프트</h3>
        <BubbleChartInfo />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 15, right: 15, bottom: 25, left: 15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-slate-700))" />
          <XAxis
            type="number"
            dataKey="x"
            name="PoC Total"
            domain={[0, maxX]}
            tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            label={{ value: 'PoC Total (하드웨어)', position: 'bottom', fill: 'rgb(var(--color-slate-400))', fontSize: 10, offset: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="RFM Total"
            domain={[0, maxY]}
            tick={{ fill: 'rgb(var(--color-slate-400))', fontSize: 11 }}
            label={{ value: 'RFM Total (SW/시장)', angle: -90, position: 'insideLeft', fill: 'rgb(var(--color-slate-400))', fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="z" range={[80, 350]} />

          {/* Quadrant reference lines */}
          <ReferenceLine x={midX} stroke="rgb(var(--color-slate-600))" strokeDasharray="6 4">
            <Label value="SW특화 ←" position="insideTopLeft" fill="rgb(var(--color-slate-500))" fontSize={9} />
            <Label value="→ 리더" position="insideTopRight" fill="rgb(var(--color-slate-500))" fontSize={9} />
          </ReferenceLine>
          <ReferenceLine y={midY} stroke="rgb(var(--color-slate-600))" strokeDasharray="6 4">
            <Label value="초기단계" position="insideBottomLeft" fill="rgb(var(--color-slate-500))" fontSize={9} />
            <Label value="HW특화" position="insideBottomRight" fill="rgb(var(--color-slate-500))" fontSize={9} />
          </ReferenceLine>

          <Tooltip content={<CustomTooltip />} />

          {/* Competitors */}
          {competitors.map((comp, i) => (
            <Scatter
              key={comp.name}
              name={comp.name}
              data={[comp]}
              fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
              fillOpacity={0.5}
            >
              <Cell fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]} fillOpacity={0.5} />
            </Scatter>
          ))}

          {/* Before */}
          {beforeData.length > 0 && (
            <Scatter name={`${robotName} (현재)`} data={beforeData}>
              <Cell fill="rgb(var(--color-slate-500))" fillOpacity={0.7} />
            </Scatter>
          )}

          {/* After */}
          <Scatter name={`${robotName} (시뮬레이션)`} data={afterData}>
            <Cell fill="#3b82f6" fillOpacity={0.9} />
          </Scatter>

          <Legend wrapperStyle={{ fontSize: 10, color: 'rgb(var(--color-slate-400))' }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
