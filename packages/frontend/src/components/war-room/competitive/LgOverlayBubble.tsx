'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { CompetitiveOverlayResult, OverlayRobotData } from '@/types/war-room';

interface LgOverlayBubbleProps {
  data: CompetitiveOverlayResult | null;
  isLoading: boolean;
}

const COMPETITOR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
const LG_COLOR = '#3b82f6';

function sumScores(scores: Record<string, number>): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}

function toBubblePoint(robot: OverlayRobotData) {
  return {
    x: sumScores(robot.pocScores),
    y: sumScores(robot.rfmScores),
    z: robot.combinedScore,
    name: robot.robotName,
    company: robot.companyName,
  };
}

interface BubblePoint {
  x: number;
  y: number;
  z: number;
  name: string;
  company: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as BubblePoint;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs shadow-lg">
      <p className="font-medium text-white">{d.name}</p>
      <p className="text-slate-400">{d.company}</p>
      <p className="mt-1 text-slate-300">PoC 합계: {d.x.toFixed(1)}</p>
      <p className="text-slate-300">RFM 합계: {d.y.toFixed(1)}</p>
      <p className="text-slate-300">종합: {d.z.toFixed(1)}</p>
    </div>
  );
}

export function LgOverlayBubble({ data, isLoading }: LgOverlayBubbleProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 h-5 w-48 animate-pulse rounded bg-slate-800" />
        <div className="h-64 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if (!data || !data.lgData) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-white">LG vs Top 5 오버레이 버블</h3>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">오버레이 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  const lgPoint = toBubblePoint(data.lgData);
  const compPoints = data.top5Data.map(toBubblePoint);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-white">LG vs Top 5 오버레이 버블</h3>
      <p className="mt-1 text-xs text-slate-400">X: PoC 합계 / Y: RFM 합계</p>

      <div className="mt-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="x"
              name="PoC 합계"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#475569"
            />
            <YAxis
              type="number"
              dataKey="y"
              name="RFM 합계"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#475569"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            {/* LG robot */}
            <Scatter name={lgPoint.name} data={[lgPoint]} fill={LG_COLOR}>
              <Cell key="lg" fill={LG_COLOR} />
            </Scatter>
            {/* Competitors */}
            {compPoints.map((pt, i) => (
              <Scatter
                key={pt.name}
                name={pt.name}
                data={[pt]}
                fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
              >
                <Cell fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]} />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
