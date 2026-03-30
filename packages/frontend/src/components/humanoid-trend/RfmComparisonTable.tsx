'use client';

import { useRfmScores } from '@/hooks/useHumanoidTrend';
import type { RfmScoreWithRobot } from '@/types/humanoid-trend';

const AXES = [
  { key: 'architectureScore' as const, label: '모델 아키텍처 & 학습 역량' },
  { key: 'dataScore' as const, label: '데이터 / 실세계 테스트' },
  { key: 'inferenceScore' as const, label: '엣지 추론 & 하드웨어' },
  { key: 'openSourceScore' as const, label: '오픈소스 · 생태계' },
  { key: 'maturityScore' as const, label: '상용성 & 설명 가능성' },
] as const;

function ScoreCell({ value, max }: { value: number; max: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? 'bg-emerald-500' : value >= 3 ? 'bg-blue-500' : value >= 2 ? 'bg-amber-500' : 'bg-red-500';
  const isMax = Math.abs(value - max) < 0.05;
  return (
    <td className="border border-slate-700 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-mono w-8 text-right ${isMax ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
          {value.toFixed(1)}
        </span>
      </div>
    </td>
  );
}

export default function RfmComparisonTable() {
  const { data: rfmData, isLoading } = useRfmScores();

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-slate-700 rounded" />;
  }

  if (!rfmData || rfmData.length === 0) {
    return <p className="text-sm text-slate-500">RFM 데이터가 없습니다.</p>;
  }

  // Pick top robots by average score, max 8
  const withAvg = rfmData.map((r: RfmScoreWithRobot) => ({
    ...r,
    avg: (r.architectureScore + r.dataScore + r.inferenceScore + r.openSourceScore + r.maturityScore) / 5,
  }));
  withAvg.sort((a: { avg: number }, b: { avg: number }) => b.avg - a.avg);
  const top = withAvg.slice(0, 8);

  // Per-axis max for highlighting
  const axisMax = Object.fromEntries(
    AXES.map(a => [a.key, Math.max(...top.map((r: any) => r[a.key]))])
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-300">
            <th className="border border-slate-700 px-3 py-2 w-[160px]">비교 항목</th>
            {top.map((r: any) => (
              <th key={r.id} className="border border-slate-700 px-3 py-2 text-center">
                <div className="text-slate-200">{r.robotName}</div>
                <div className="text-[10px] text-slate-500 font-normal normal-case">{r.companyName}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {AXES.map((axis) => (
            <tr key={axis.key} className="border-b border-slate-700">
              <td className="border border-slate-700 px-3 py-2 font-medium text-slate-200 text-xs">
                {axis.label}
              </td>
              {top.map((r: any) => (
                <ScoreCell key={r.id} value={r[axis.key]} max={axisMax[axis.key]} />
              ))}
            </tr>
          ))}
          {/* Average row */}
          <tr className="border-t-2 border-slate-600 bg-slate-800/50">
            <td className="border border-slate-700 px-3 py-2 font-bold text-slate-200 text-xs">
              종합 평균
            </td>
            {top.map((r: any) => (
              <td key={r.id} className="border border-slate-700 px-3 py-2 text-center">
                <span className="text-sm font-bold text-blue-400">{r.avg.toFixed(1)}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
